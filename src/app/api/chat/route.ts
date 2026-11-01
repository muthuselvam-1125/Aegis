import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { getPlaces, getAlerts, getReports } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { geocodeLocation, currentConditions, aqiCategory, daily, fetchHistoricalWeather, fetchRecentRainfall, hourly, resolveRelativeDate, codeLabel } from "@/lib/wx";
import { getCombinedEarthquakes, getLiveSeismicTelemetryContext } from "@/lib/disaster";

const functionDeclarations = [
  {
    name: "getWeather",
    description: "Get the CURRENT (live) weather and air quality for a location. Do NOT use this for past or historical queries like 'last rainfall'.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getForecast",
    description: "Get the upcoming daily weather forecast for a location (next 7 days). Use when asked about future weather, tomorrow, coming days of the week (e.g. coming Monday), or rainfall changes.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Rajapalayam', 'Chennai', 'Madurai'"
        },
        targetDate: {
          type: "string",
          description: "Optional. Target date in YYYY-MM-DD format (e.g. '2026-10-26' for coming Monday). Must strictly match the calendar date of the requested weekday."
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getHourlyForecast",
    description: "Get the hourly weather forecast for a location (next 24 hours). Use this to check for rain tonight, tomorrow morning, or specific times of day.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getHistoricalWeather",
    description: "Get historical and recent rainfall/weather telemetry for a location. MUST be used when the user asks about past weather, previous rainfall, last rain, last recorded rainfall, recent rain, or weather on specific past dates.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        },
        startDate: {
          type: "string",
          description: "Optional. Start date in YYYY-MM-DD format. If asking for a specific year/month, set this. If omitted, recent 7-day rainfall history and the most recent rain event will be returned."
        },
        endDate: {
          type: "string",
          description: "Optional. End date in YYYY-MM-DD format."
        }
      },
      required: ["location"]
    }
  },
  {
    name: "getAlerts",
    description: "Use ONLY when the user explicitly asks for 'current active alerts', 'live warnings', or 'is there an alert right now for [city]'. NEVER call this function for general knowledge, disaster definitions, or historical queries (e.g., 'last storm', 'recent flood in India', 'past cyclone history').",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getLocation",
    description: "Get the user's saved household location from the database",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "getEarthquakes",
    description: "Get recent live earthquake telemetry from official monitoring agencies (National Center for Seismology / NCS for India, and USGS globally). Use this when the user asks about recent earthquakes, seismic activity, tremors, or which state had the last earthquake.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Optional. The country, state, or region to filter earthquakes by, e.g., 'India', 'Sikkim', 'Assam', 'California', 'Japan'."
        }
      }
    }
  }
];

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    // =========================================================================
    // TOKEN-OPTIMIZATION ENGINE: PRE-RESOLVE AEGIS JSON DATA IN A SINGLE PASS
    // Eliminates expensive 2-turn function-calling loops and token-heavy web searching.
    // =========================================================================
    const recentMessages = messages.slice(-4);
    const lastMessage = recentMessages[recentMessages.length - 1];
    const userQuery = (lastMessage?.content || "").trim();
    const queryLower = userQuery.toLowerCase();

    // 1. Resolve User Saved Location
    const session = await getSession();
    let userPlaces: any[] = [];
    const resolvedUserId = session?.userId || (session as any)?.user?.id;
    if (resolvedUserId) {
      try {
        userPlaces = await getPlaces(resolvedUserId);
      } catch (e) {}
    }

    // 2. Identify Target Location
    // Check if user specified a location, or fallback to saved primary place, or default
    let targetLocation = "";
    const commonCities = [
      "rajapalayam", "rajpalyam", "rajapalyam", "chennai", "madurai", "coimbatore", "delhi", "mumbai", "bengaluru", "bangalore",
      "kolkata", "hyderabad", "kerala", "assam", "sikkim", "tokyo", "dubai", "london"
    ];
    for (const city of commonCities) {
      if (queryLower.includes(city)) {
        targetLocation = (city === "rajpalyam" || city === "rajapalyam") ? "rajapalayam" : city;
        break;
      }
    }
    // Check if query explicitly asks about user's own location/home
    if (userQuery.match(/\b(?:my\s+(?:location|place|home|area|city)|home|here)\b/i) && userPlaces.length > 0) {
      targetLocation = userPlaces[0].name;
    }

    if (!targetLocation) {
      const cityMatch = userQuery.match(/\b([A-Za-z]+)\s+city\b/i);
      if (cityMatch && cityMatch[1]) {
        const c = cityMatch[1].toLowerCase();
        if (c === "rajpalyam" || c === "rajapalyam") {
          targetLocation = "rajapalayam";
        } else {
          targetLocation = cityMatch[1].trim();
        }
      }
    }
    if (!targetLocation) {
      const preMatch = userQuery.match(/\b([A-Za-z]+)\s+(?:weather|forecast|rainfall|temperature|rain|temp|climate)\b/i);
      if (preMatch && preMatch[1]) {
        const candidate = preMatch[1].trim();
        const nonLocations = ["today", "tomorrow", "yesterday", "current", "live", "recent", "past", "next", "coming", "any", "the", "city", "my", "our", "local"];
        if (!nonLocations.includes(candidate.toLowerCase())) {
          targetLocation = candidate;
        }
      }
    }
    if (!targetLocation) {
      const locMatch = userQuery.match(/(?:in|for|at|around|of)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
      if (locMatch && locMatch[1]) {
        const candidate = locMatch[1].trim();
        const nonLocations = [
          "weather", "rainfall", "rain", "september", "august", "yesterday", "today", "tomorrow",
          "recent", "past", "last", "india", "my place", "home", "my location", "location", "my area",
          "here", "my home", "my city", "current", "live"
        ];
        if (!nonLocations.includes(candidate.toLowerCase())) {
          targetLocation = candidate;
        }
      }
    }
    if (!targetLocation && userPlaces.length > 0) {
      targetLocation = userPlaces[0].name;
    }

    // Helper to extract date ranges (e.g., September 3–7, 2026 or Sept 3 to 7, 2026 or ISO dates)
    function extractQueryDateRange(q: string): { start: string; end: string } | null {
      const months: Record<string, string> = {
        jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
        jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
      };
      // Format: September 3–7, 2026 or Sept 3-7, 2026 or September 3 to 7, 2026
      const rangeMatch = q.match(/([a-zA-Z]+)\s+(\d{1,2})\s*(?:–|-|to)\s*(\d{1,2}),?\s*(\d{4})/i);
      if (rangeMatch) {
        const moStr = rangeMatch[1].slice(0, 3).toLowerCase();
        const mo = months[moStr];
        if (mo) {
          const y = rangeMatch[4];
          const d1 = rangeMatch[2].padStart(2, "0");
          const d2 = rangeMatch[3].padStart(2, "0");
          return { start: `${y}-${mo}-${d1}`, end: `${y}-${mo}-${d2}` };
        }
      }
      // Single date e.g. September 3, 2026
      const singleMatch = q.match(/([a-zA-Z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
      if (singleMatch) {
        const moStr = singleMatch[1].slice(0, 3).toLowerCase();
        const mo = months[moStr];
        if (mo) {
          const y = singleMatch[3];
          const d = singleMatch[2].padStart(2, "0");
          return { start: `${y}-${mo}-${d}`, end: `${y}-${mo}-${d}` };
        }
      }
      // Standard ISO dates e.g. 2026-09-03 to 2026-09-07
      const isoMatch = q.match(/(\d{4}-\d{2}-\d{2})(?:\s*(?:to|–|-)\s*(\d{4}-\d{2}-\d{2}))?/);
      if (isoMatch) {
        return { start: isoMatch[1], end: isoMatch[2] || isoMatch[1] };
      }
      return null;
    }

    // 3. Compact Context Gatherer (Direct Aegis JSON Data)
    let liveContextParts: string[] = [];

    // User Saved Household Location Context
    if (userPlaces && userPlaces.length > 0) {
      const placesSummary = userPlaces
        .map((p: any) => `${p.name}${p.region ? `, ${p.region}` : ""}${p.country ? `, ${p.country}` : ""}`)
        .join("; ");
      liveContextParts.push(
        `[USER SAVED HOUSEHOLD LOCATIONS]: Primary Home: "${userPlaces[0].name}". All saved household locations: ${placesSummary}. If the user asks about their home, location, or doesn't mention a specific city, answer for "${userPlaces[0].name}".`
      );
    }

    // Weather / Forecast / Historical Rainfall data
    const relativeDateInfo = resolveRelativeDate(userQuery);
    const isExplicitFuture = /coming|next|tomorrow|future|forecast|upcoming|will\s+it\s+rain|rainfall\s+changes|rain\s+changes/i.test(queryLower) || (relativeDateInfo !== null && relativeDateInfo.daysAhead > 0);
    const isLastOrRecentRainQuery = /last\s+(?:rain|rainfall|shower|precipitation|downpour|wet\s+day|storm|event)|recent(?:ly)?\s+(?:rain|rainfall|shower|precipitation)|latest\s+(?:rain|rainfall|shower|precipitation)|when\s+(?:did\s+it|was\s+the\s+last)\s+rain|last\s+time\s+it\s+rained|how\s+much\s+(?:did\s+it\s+rain|rain(?:fall)?\s+(?:did|fell|was|is|recorded))|rainfall\s+(?:yesterday|today|last|recently|past|recorded|in\s+the\s+last)|last\s+recorded\s+rainfall/i.test(queryLower);
    const isHistoricalWeather = !isExplicitFuture && (isLastOrRecentRainQuery || /past|historical|history|previous|last\s+(?:week|month|year|few\s+days|\d+\s+days)|yesterday|recorded|observed|was\s+there\s+(?:rain|rainfall)|did\s+it\s+rain|between|september|august|july|june|may|april|march|february|january|october|november|december|\b\d{4}-\d{2}-\d{2}\b/i.test(queryLower));
    const isForecastQuery = isExplicitFuture || /forecast|upcoming|future|next\s+week|tomorrow|rainfall\s+changes|rain\s+changes|will\s+it\s+rain|expect|any\s+rain/i.test(queryLower) || relativeDateInfo !== null;
    const isWeatherQuery = isForecastQuery || /weather|rain|temp|hot|cold|forecast|climate|wind|humidity|aqi|air quality|flood|storm|cyclone/.test(queryLower);

    if (isHistoricalWeather && targetLocation) {
      try {
        const geo = await geocodeLocation(targetLocation);
        if (geo) {
          const dateRange = extractQueryDateRange(userQuery);
          if (dateRange) {
            // User specified a custom historical date range
            const histDays = await fetchHistoricalWeather(geo.lat, geo.lon, dateRange.start, dateRange.end);
            if (histDays.length > 0) {
              const histSummary = histDays.map(d => `${d.date}: ${d.precipMm.toFixed(1)} mm (${d.precipMm === 0 ? "0.0 mm dry / no rain recorded" : d.precipMm + " mm"}, Max ${d.tempMaxC}°C)`).join(" | ");
              const totalRain = histDays.reduce((acc, d) => acc + d.precipMm, 0).toFixed(1);
              liveContextParts.push(
                `[VERIFIED HISTORICAL WEATHER/RAINFALL - ${geo.name} (${dateRange.start} to ${dateRange.end})]: ${histSummary}. Total Observed Rainfall: ${totalRain} mm. Ground Station Verification: ${histDays[0]?.source || "Official Ground Observations"}. NOTE: If ground stations observed 0.0 mm or dry weather, strictly state 0.0 mm. Never approximate, invent, or report simulated grid precipitation.`
              );
            }
          } else {
            // User asked for "last rainfall", "recent rainfall", "rainfall today/yesterday", or past 7 days
            const recent = await fetchRecentRainfall(geo.lat, geo.lon, 7);
            const dailyList = recent.daily.slice(-7).map(d => `${d.date}: ${d.precipMm.toFixed(1)} mm`).join(" | ");
            const lastEventDesc = recent.lastRainEvent
              ? recent.lastRainEvent.description
              : (recent.lastRainyDay && recent.lastRainyDay.precipMm > 0
                ? `${recent.lastRainyDay.date} (${recent.lastRainyDay.precipMm.toFixed(1)} mm recorded)`
                : "No rainfall observed in the past 7 days (0.0 mm / dry)");

            liveContextParts.push(
              `[VERIFIED RECENT RAINFALL TELEMETRY - ${geo.name}]:
- Most Recent Rainfall Event: ${lastEventDesc}.
- Today's Accumulated Rainfall (${recent.todayDate}): ${recent.todayMm.toFixed(1)} mm.
- Yesterday's Rainfall (${recent.yesterdayDate}): ${recent.yesterdayMm.toFixed(1)} mm.
- Past 7 Days Daily Breakdown: ${dailyList}.
- 7-Day Cumulative Total Rainfall: ${recent.totalPastDaysMm.toFixed(1)} mm.
- Data Source: ${recent.source}.
CRITICAL ANSWERING RULES:
1. Always state the exact measured rainfall in millimeters (mm) and date/time clearly.
2. NEVER output forecast probabilities (e.g. NEVER output "Probability: 100% (confirmed event)" or similar). Probabilities are only for future forecasts, not past recorded rainfall.
3. Distinguish between the most recent rain shower (time & rate) and total daily accumulation.`
            );
          }
        }
      } catch (e) {}
    } else if (isWeatherQuery && targetLocation) {
      try {
        const geo = await geocodeLocation(targetLocation);
        if (geo) {
          const wx = await currentConditions(geo.lat, geo.lon);
          const isTargetingFutureDay = (relativeDateInfo !== null && relativeDateInfo.daysAhead > 0) || (isExplicitFuture && !queryLower.includes("today") && !queryLower.includes("current") && !queryLower.includes("now"));

          if (isTargetingFutureDay) {
            // Retrieve upcoming daily weather forecast array from Open-Meteo
            const forecastDays = await daily(geo.lat, geo.lon, 10);
            const targetIso = relativeDateInfo?.isoDate;
            // Ensure date matching extracts the forecast item whose `time` matches the calculated ISO date string (YYYY-MM-DD)
            const matchedDay = targetIso
              ? forecastDays.find((d: any) => (d.time === targetIso || d.date === targetIso))
              : forecastDays[1];
            const targetDayInfo = relativeDateInfo || {
              weekday: matchedDay?.weekday || new Date((matchedDay?.time || matchedDay?.date) + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }),
              isoDate: matchedDay?.time || matchedDay?.date,
              label: "upcoming forecast"
            };

            if (matchedDay) {
              const condText = codeLabel(matchedDay.code);
              liveContextParts.push(
                `[VERIFIED DAILY WEATHER FORECAST - ${geo.name}]:
- Target Date: ${targetDayInfo.weekday}, ${matchedDay.time || matchedDay.date} (${targetDayInfo.label}):
  * Expected Rainfall: ${matchedDay.precipMm.toFixed(1)} mm
  * Rain Probability: ${matchedDay.precipProb}%
  * Condition: ${condText}
  * Temperature: High ${matchedDay.hiC}°C / Low ${matchedDay.loC}°C
- Comparison with Current Conditions:
  * Current Real-Time Snapshot: Temp ${wx.tempC.mean}°C, Condition: ${wx.conditionLabel || codeLabel(wx.code)}, Current Rain: ${wx.precipitationMm} mm (${wx.precipitationMm <= 0.5 ? "Dry / No active rain" : wx.precipitationMm + " mm active rain"})
  * Anticipated Rainfall Changes: On ${targetDayInfo.weekday}, ${matchedDay.time || matchedDay.date}, forecast rainfall changes to ${matchedDay.precipMm.toFixed(1)} mm with ${matchedDay.precipProb}% probability (${matchedDay.precipMm > 25 ? "heavy rain expected" : matchedDay.precipMm > 5 ? "moderate to heavy rain showers" : matchedDay.precipMm > 0 ? "light rain showers" : "dry conditions"}).
- Upcoming 7-Day Daily Breakdown:
${forecastDays.slice(0, 7).map(d => `  * ${d.weekday || new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}, ${d.time || d.date}: ${d.precipMm.toFixed(1)} mm rain (${d.precipProb}%), High ${d.hiC}°C / Low ${d.loC}°C, ${codeLabel(d.code)}`).join("\n")}
CRITICAL FORECAST RULES:
1. The user explicitly asked about '${targetDayInfo.label}'. You MUST explicitly target ${targetDayInfo.weekday}, ${matchedDay.time || matchedDay.date}.
2. Strictly report that ${targetDayInfo.label} is ${targetDayInfo.weekday}, ${matchedDay.time || matchedDay.date}. NEVER guess or misalign weekday names with calendar dates.
3. State the exact forecast rainfall (${matchedDay.precipMm.toFixed(1)} mm) and probability (${matchedDay.precipProb}%) for ${targetDayInfo.weekday}, ${matchedDay.time || matchedDay.date}.`
              );
            } else {
              liveContextParts.push(
                `[VERIFIED DAILY WEATHER FORECAST - ${geo.name}]:
- Current Snapshot: Temp ${wx.tempC.mean}°C (feels ${wx.feelsLikeC}°C), Wind ${wx.windKph} km/h, Rain Rate: ${wx.rainMm} mm/h, Condition: ${wx.conditionLabel || codeLabel(wx.code)}.
- Upcoming 7-Day Forecast:
${forecastDays.slice(0, 7).map(d => `  * ${d.weekday || new Date(d.date + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}, ${d.time || d.date}: ${d.precipMm.toFixed(1)} mm rain (${d.precipProb}%), High ${d.hiC}°C / Low ${d.loC}°C, ${codeLabel(d.code)}`).join("\n")}`
              );
            }
          } else {
            // Live Current Weather & Today's Snapshot
            const forecastDays = await daily(geo.lat, geo.lon, 3);
            const todayForecast = forecastDays[0];
            const condText = wx.conditionLabel || codeLabel(wx.code);
            const isDry = (wx.precipitationMm ?? 0) <= 0.5;
            liveContextParts.push(
              `[LIVE CURRENT WEATHER - ${geo.name}]:
- Current Temperature: ${wx.tempC.mean}°C (feels like ${wx.feelsLikeC}°C)
- Current Condition: ${condText}
- Real-Time Precipitation: ${wx.precipitationMm ?? 0} mm (rain rate: ${wx.rainMm ?? 0} mm/h). Ground Status: ${isDry ? "Dry / No active rain falling right now" : "Active rain falling at " + wx.precipitationMm + " mm"}
- Today's Forecast: High ${todayForecast?.hiC ?? Math.round(wx.tempC.max)}°C / Low ${todayForecast?.loC ?? Math.round(wx.tempC.min)}°C, Rain Probability: ${wx.precipProb}%
- Humidity: ${wx.humidity}%
- Wind: ${wx.windKph} km/h (direction ${wx.windDir}°)
- Air Quality: AQI ${wx.aqi} (${aqiCategory(wx.aqi).label})
CRITICAL CURRENT WEATHER RULES:
1. Current ground precipitation is ${isDry ? "0.0 mm / dry" : wx.precipitationMm + " mm"}. You MUST describe current conditions as ${isDry ? "dry or cloudy/overcast without active rain" : "actively raining"}. NEVER claim it is actively raining if precipitation is 0.0 mm or <= 0.5 mm.
2. Accurately report the exact observed temperature (${wx.tempC.mean}°C) and condition (${condText}).`
            );
          }
        } else {
          liveContextParts.push(
            `[WEATHER TELEMETRY NOTICE]: Could not geocode or locate "${targetLocation}". Ground station telemetry is unavailable. Please state that weather data could not be retrieved for this location. Do NOT invent or estimate numbers.`
          );
        }
      } catch (e: any) {
        liveContextParts.push(
          `[WEATHER TELEMETRY NOTICE]: Weather station telemetry for "${targetLocation}" is temporarily unreachable. Please inform the user that live weather data is currently unavailable. Do NOT generate synthetic weather data.`
        );
      }
    }

    // Active Alerts in Aegis DB
    const isAlertQuery = /alert|warning|danger|hazard|emergency|safe|advisory/.test(queryLower);
    if (isAlertQuery || queryLower.includes("chennai") || queryLower.includes("assam")) {
      try {
        const alertsList = await getAlerts();
        const activeAlerts = alertsList.filter((a: any) => a.active !== false).slice(0, 4);
        if (activeAlerts.length > 0) {
          const alertSummary = activeAlerts.map((a: any) => `${a.hazard.toUpperCase()} (${a.severity}) in ${a.area}: ${a.title}`).join("; ");
          liveContextParts.push(`[ACTIVE ALERTS IN AEGIS]: ${alertSummary}`);
        } else {
          liveContextParts.push(`[ACTIVE ALERTS IN AEGIS]: No active warnings reported.`);
        }
      } catch (e) {}
    }

    // Recent Earthquakes Telemetry
    const isEarthquakeQuery = /earthquake|quake|seismic|tremor/.test(queryLower);
    if (isEarthquakeQuery) {
      try {
        const eqData = await getCombinedEarthquakes({ limit: 4, indiaOnly: queryLower.includes("india") });
        if (eqData.mostRecentIndia) {
          const m = eqData.mostRecentIndia;
          liveContextParts.push(
            `[RECENT SEISMIC JSON]: Latest India: M${m.magnitude} in ${m.place} (${m.stateOrRegion}) at ${m.timeIST}, Depth ${m.depthKm}km. Agency: ${m.agency}.`
          );
        }
      } catch (e) {}
    }

    // Community Reports & Help Needs in Aegis DB
    const isCommunityQuery = /community|need|help|ground report|people|shelter|rescue|report/.test(queryLower);
    if (isCommunityQuery) {
      try {
        const reportsList = await getReports();
        const recentReports = reportsList.slice(0, 4);
        if (recentReports.length > 0) {
          const repSummary = recentReports.map((r: any) => `[${r.hazard || "General"}] ${r.kind?.toUpperCase()}: "${r.body}" in ${r.area || "Unknown"} (by ${r.reporter})`).join(" | ");
          liveContextParts.push(`[AEGIS COMMUNITY GROUND REPORTS]: ${repSummary}`);
        }
      } catch (e) {}
    }

    // 4. Ultra-Efficient Lean System Prompt (Saves >70% Tokens)
    const contextBlock = liveContextParts.length > 0 ? `\nLIVE AEGIS TELEMETRY DATA:\n${liveContextParts.join("\n")}` : "";
    const finalSystemInstructions = `You are AEGIS, the Disaster & Hazard Intelligence Assistant.
Current Reference Time: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Kolkata' })} (Asia/Kolkata).
TEMPORAL DATE RESOLUTION DIRECTIVE:
Strictly resolve relative dates (e.g., 'tomorrow', 'coming Monday', 'next week') against the Current Reference Time. Ensure the day of the week strictly matches the calendar date (e.g., if today is Thursday, Oct 22, 2026, then tomorrow is Friday, Oct 23, 2026, and coming Monday is strictly Oct 26, 2026). Never guess, hallucinate, or misalign weekday names with calendar dates.

CORE DIRECTIVES:
1. Always base your answers strictly on the provided LIVE AEGIS TELEMETRY DATA below or tool outputs. Never invent or guess numbers.
2. When reporting current weather, strictly check real-time precipitation. If precipitation is 0.0 mm or trace (<= 0.5 mm), you MUST describe conditions as dry or cloudy/overcast, and NEVER claim active rain or heavy rain is falling right now.
3. Be direct, crisp, and concise (2-4 bullet points or a brief summary). Avoid filler.
4. Use bold text for headings (e.g. **Weather Forecast for Monday, October 26, 2026** or **Current Conditions in Rajapalayam**). Do NOT use markdown # or ## headers.
5. If asked about live weather, alerts, earthquakes, or community needs, accurately summarize the telemetry data without doing external searches or guessing.
6. When reporting weather forecasts for a specific day or date, always state the exact weekday and calendar date (e.g., Monday, October 26, 2026) and report expected rainfall in mm and rain probability percentage (%).
7. When reporting historical, past, or last rainfall, ALWAYS report verified numerical rainfall in millimeters (mm) with the exact date and time. Distinguish between the latest rain shower/event and daily accumulated totals. NEVER output forecast probabilities for past recorded events. If ground stations observed 0.0 mm or dry weather, explicitly state 0.0 mm dry conditions.
8. If weather telemetry for a location cannot be found or an error occurs, explicitly state that live data is temporarily unavailable rather than making up figures.${contextBlock}`;

    const availableFunctions = liveContextParts.length > 0 ? [] : functionDeclarations;
    const tools = availableFunctions.map(fn => ({
      type: "function",
      function: {
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      }
    }));
    let rawHistory = recentMessages.slice(0, -1).map((m: any) => {
      let mappedRole = "user";
      if (m.role === "assistant" || m.role === "model") {
        mappedRole = "model";
      }
      return {
        role: mappedRole,
        parts: [{ text: m.content || " " }],
      };
    });

    let geminiHistory: any[] = [];
    for (const msg of rawHistory) {
      if (geminiHistory.length === 0) {
        if (msg.role === "user") geminiHistory.push(msg);
      } else {
        const lastMsg = geminiHistory[geminiHistory.length - 1];
        if (lastMsg.role === msg.role) {
          lastMsg.parts[0].text += "\n" + msg.parts[0].text;
        } else {
          geminiHistory.push(msg);
        }
      }
    }

    // Google Gemini requires strictly alternating user -> model turns ending with 'model' before sendMessage(userQuery)
    if (geminiHistory.length > 0 && geminiHistory[geminiHistory.length - 1].role === "user") {
      geminiHistory.pop();
    }

    let text = "";
    let lastError = null;
    let lastGroqError = null;

    // ==========================================
    // LAYER 1: GOOGLE GEMINI (Primary AI)
    // ==========================================
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && !apiKey.startsWith("AQ.")) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const fallbackModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
      ];

      for (const modelName of fallbackModels) {
        try {
          const modelConfig: any = {
            model: modelName,
            systemInstruction: finalSystemInstructions,
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
            },
          };
          if (availableFunctions.length > 0) {
            modelConfig.tools = [{ functionDeclarations: availableFunctions as any }];
          }
          const model = genAI.getGenerativeModel(modelConfig);

          const chat = model.startChat({ history: geminiHistory });
          let result = await chat.sendMessage(userQuery);

          // Handle function calls only if tools were needed
          if (availableFunctions.length > 0 && result.response.functionCalls()) {
            const functionCalls = result.response.functionCalls();
            
            const functionResponses = await Promise.all(
              functionCalls!.map(async (call) => {
                let apiResponse: any = {};
                try {
                  if (call.name === "getWeather") {
                    const locationArg = (call.args as any).location as string;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const wx = await currentConditions(geo.lat, geo.lon);
                      const isDry = (wx.precipitationMm ?? 0) <= 0.5;
                      const condText = wx.conditionLabel || codeLabel(wx.code);
                      apiResponse = {
                        location: geo.name,
                        temperature: wx.tempC.mean,
                        feelsLike: wx.feelsLikeC,
                        condition: condText,
                        weatherCode: wx.code,
                        precipitationMm: wx.precipitationMm ?? 0,
                        rainRateMmPerHour: wx.rainMm ?? 0,
                        precipitationStatus: isDry ? "Dry / No active rain" : `${wx.precipitationMm} mm active rain`,
                        groundStatus: isDry ? "Ground is dry with no active rain" : "Actively raining",
                        windKph: wx.windKph,
                        humidity: wx.humidity,
                        aqi: wx.aqi,
                        airQualityCategory: aqiCategory(wx.aqi).label,
                        directive: isDry ? "Current ground precipitation is 0.0 mm. You MUST describe conditions as dry/cloudy and NEVER claim it is actively raining." : "Active rain falling."
                      };
                    } else {
                      apiResponse = { error: `Could not find location "${locationArg}". Ground station weather data is unavailable. Please state that live weather data cannot be retrieved for this location. Do NOT invent figures.` };
                    }
                  } else if (call.name === "getForecast") {
                    const locationArg = (call.args as any).location as string;
                    const targetDateArg = (call.args as any).targetDate as string | undefined;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const forecast = await daily(geo.lat, geo.lon, 7);
                      const targetIso = targetDateArg || resolveRelativeDate(userQuery)?.isoDate;
                      // Ensure date matching extracts the forecast item whose `time` matches the calculated ISO date string (YYYY-MM-DD)
                      const matchedItem = targetIso
                        ? forecast.find((d: any) => (d.time === targetIso || d.date === targetIso))
                        : null;
                      apiResponse = {
                        location: geo.name,
                        targetDate: targetIso || null,
                        matchedForecastForTargetDate: matchedItem ? { ...matchedItem, condition: codeLabel(matchedItem.code) } : null,
                        forecast: forecast.map((d: any) => ({ ...d, condition: codeLabel(d.code) }))
                      };
                    } else {
                      apiResponse = { error: `Could not find location "${locationArg}". Forecast data is unavailable. Please state that forecast data cannot be retrieved for this location. Do NOT invent figures.` };
                    }
                  } else if (call.name === "getHourlyForecast") {
                    const locationArg = (call.args as any).location as string;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const forecast = await hourly(geo.lat, geo.lon, 24);
                      apiResponse = { location: geo.name, hourlyForecast: forecast };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getHistoricalWeather") {
                    const locationArg = (call.args as any).location as string;
                    const startDateArg = (call.args as any).startDate as string | undefined;
                    const endDateArg = (call.args as any).endDate as string | undefined;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      if (!startDateArg) {
                        const recent = await fetchRecentRainfall(geo.lat, geo.lon, 7);
                        apiResponse = {
                          location: geo.name,
                          mostRecentRainEvent: recent.lastRainEvent ? recent.lastRainEvent.description : "No recent rain observed",
                          todayRainfallMm: recent.todayMm,
                          yesterdayRainfallMm: recent.yesterdayMm,
                          total7DayRainfallMm: recent.totalPastDaysMm,
                          dailyRainfall: recent.daily.slice(-7).map(d => ({
                            date: d.date,
                            rainfallMm: d.precipMm,
                            status: d.precipMm === 0 ? "0.0 mm (Dry / No Rain)" : `${d.precipMm} mm`
                          })),
                          dataSource: recent.source,
                          note: "Report exact observed numerical rainfall with dates and times. Distinguish between the most recent rain shower and total daily accumulation. Do NOT include forecast probability."
                        };
                      } else {
                        const historical = await fetchHistoricalWeather(geo.lat, geo.lon, startDateArg, endDateArg);
                        apiResponse = {
                          location: geo.name,
                          historicalData: historical.slice(0, 10).map(d => ({
                            date: d.date,
                            rainfallMm: d.precipMm,
                            status: d.precipMm === 0 ? "0.0 mm (Dry / No Rain Recorded)" : `${d.precipMm} mm`,
                            tempMaxC: d.tempMaxC,
                            tempMinC: d.tempMinC,
                            windKph: d.windKph,
                            dataSource: d.source || "Observed Ground Station Record"
                          })),
                          note: "Report exact observed numerical rainfall. If 0 mm was recorded, strictly report 0.0 mm dry conditions. Do not include forecast probability."
                        };
                      }
                    } else {
                      apiResponse = { error: `Could not find location "${locationArg}". Historical rainfall telemetry is unavailable. Please state that records could not be retrieved, and do not invent figures.` };
                    }
                  } else if (call.name === "getEarthquakes") {
                    const locationArg = (call.args as any).location as string | undefined;
                    try {
                      const result = await getCombinedEarthquakes({
                        location: locationArg,
                        limit: 6,
                      });
                      apiResponse = {
                        locationFiltered: locationArg || "All / India",
                        count: result.all.length,
                        mostRecentIndianEarthquake: result.mostRecentIndia ? {
                          place: result.mostRecentIndia.place,
                          stateOrRegion: result.mostRecentIndia.stateOrRegion,
                          magnitude: `M${result.mostRecentIndia.magnitude}`,
                          depth: `${result.mostRecentIndia.depthKm} km`,
                          timeIST: result.mostRecentIndia.timeIST,
                          agency: result.mostRecentIndia.agency,
                        } : null,
                        recentEarthquakes: result.all.slice(0, 5).map((q) => ({
                          place: q.place,
                          stateOrRegion: q.stateOrRegion,
                          magnitude: `M${q.magnitude}`,
                          depth: `${q.depthKm} km`,
                          timeIST: q.timeIST,
                        })),
                      };
                    } catch (err: any) {
                      apiResponse = { error: "Failed to fetch live seismic telemetry: " + err.message };
                    }
                  } else if (call.name === "getAlerts") {
                    const alerts = await getAlerts();
                    const prunedAlerts = alerts.map((a: any) => ({
                      hazard: a.hazard,
                      severity: a.severity,
                      title: a.title,
                      headline: a.headline,
                      area: a.area,
                      onset: a.onset,
                      expires: a.expires
                    }));
                    apiResponse = { alerts: prunedAlerts };
                  } else if (call.name === "getLocation") {
                    const session = await getSession();
                    const userId = session?.userId || (session as any)?.user?.id;
                    if (userId) {
                      const places = await getPlaces(userId);
                      const prunedPlaces = places.map((p: any) => ({ name: p.name, region: p.region, country: p.country }));
                      apiResponse = { savedPlaces: prunedPlaces };
                    } else {
                      apiResponse = { error: "User is not logged in" };
                    }
                  }
                } catch (e: any) {
                  console.error("TOOL ERROR:", call.name, e);
                  apiResponse = { error: e.message };
                }

                return {
                  functionResponse: {
                    name: call.name,
                    response: apiResponse,
                  }
                };
              })
            );

            result = await chat.sendMessage(functionResponses);
          }

          text = result.response.text();
          break; // Break the Gemini fallback loop if successful
        } catch (err: any) {
          console.warn(`[Gemini Fallback] ${modelName} failed: ${err.message.split('\n')[0]}`);
          lastError = err;
        }
      }
    }

    // ==========================================
    // LAYER 2: GROQ API (Secondary AI Fallback)
    // ==========================================
    if (!text && process.env.GROQ_API_KEY) {
      try {
        const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
        
        let groqHistory: any[] = recentMessages.map((m: any) => ({
          role: m.role,
          content: m.content,
        }));
        
        groqHistory.unshift({
          role: "system",
          content: finalSystemInstructions
        });

        const groqCandidateModels = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b", "qwen/qwen3.8-27b"];
        for (const groqModel of groqCandidateModels) {
          try {
            const groqPayload: any = {
              messages: groqHistory,
              model: groqModel,
              temperature: 0.2,
              max_tokens: 1024,
            };
            if (tools.length > 0) {
              groqPayload.tools = tools as any;
              groqPayload.tool_choice = "auto";
            }

            const completion = await groq.chat.completions.create(groqPayload);
            const responseMessage = completion.choices[0]?.message;

            if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
              const currentHistory = [...groqHistory, responseMessage];
              for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);
                let apiResponse: any = {};
                try {
                  if (functionName === "getWeather") {
                    const geo = await geocodeLocation(args.location);
                    if (geo) {
                      const wx = await currentConditions(geo.lat, geo.lon);
                      const isDry = (wx.precipitationMm ?? 0) <= 0.5;
                      const condText = wx.conditionLabel || codeLabel(wx.code);
                      apiResponse = {
                        location: geo.name,
                        temperature: wx.tempC.mean,
                        feelsLike: wx.feelsLikeC,
                        condition: condText,
                        weatherCode: wx.code,
                        precipitationMm: wx.precipitationMm ?? 0,
                        rainRateMmPerHour: wx.rainMm ?? 0,
                        precipitationStatus: isDry ? "Dry / No active rain" : `${wx.precipitationMm} mm active rain`,
                        groundStatus: isDry ? "Ground is dry with no active rain" : "Actively raining",
                        windKph: wx.windKph,
                        humidity: wx.humidity,
                        aqi: wx.aqi,
                        airQualityCategory: aqiCategory(wx.aqi).label,
                        directive: isDry ? "Current ground precipitation is 0.0 mm. You MUST describe conditions as dry/cloudy and NEVER claim it is actively raining." : "Active rain falling."
                      };
                    } else {
                      apiResponse = { error: `Could not find location "${args.location}". Ground station weather data is unavailable. Please state that live weather data cannot be retrieved for this location. Do NOT invent figures.` };
                    }
                  } else if (functionName === "getForecast") {
                    const geo = await geocodeLocation(args.location);
                    if (geo) {
                      const forecast = await daily(geo.lat, geo.lon, 7);
                      const targetIso = args.targetDate || resolveRelativeDate(userQuery)?.isoDate;
                      // Ensure date matching extracts the forecast item whose `time` matches the calculated ISO date string (YYYY-MM-DD)
                      const matchedItem = targetIso
                        ? forecast.find((d: any) => (d.time === targetIso || d.date === targetIso))
                        : null;
                      apiResponse = {
                        location: geo.name,
                        targetDate: targetIso || null,
                        matchedForecastForTargetDate: matchedItem ? { ...matchedItem, condition: codeLabel(matchedItem.code) } : null,
                        forecast: forecast.map((d: any) => ({ ...d, condition: codeLabel(d.code) }))
                      };
                    } else {
                      apiResponse = { error: `Could not find location "${args.location}". Forecast data is unavailable. Please state that forecast data cannot be retrieved for this location. Do NOT invent figures.` };
                    }
                  } else if (functionName === "getHourlyForecast") {
                    const geo = await geocodeLocation(args.location);
                    if (geo) {
                      const forecast = await hourly(geo.lat, geo.lon, 24);
                      apiResponse = { location: geo.name, hourlyForecast: forecast };
                    } else {
                      apiResponse = { error: `Could not find location: ${args.location}` };
                    }
                  } else if (functionName === "getHistoricalWeather") {
                    const geo = await geocodeLocation(args.location);
                    if (geo) {
                      if (!args.startDate) {
                        const recent = await fetchRecentRainfall(geo.lat, geo.lon, 7);
                        apiResponse = {
                          location: geo.name,
                          mostRecentRainEvent: recent.lastRainEvent ? recent.lastRainEvent.description : "No recent rain observed",
                          todayRainfallMm: recent.todayMm,
                          yesterdayRainfallMm: recent.yesterdayMm,
                          total7DayRainfallMm: recent.totalPastDaysMm,
                          dailyRainfall: recent.daily.slice(-7).map(d => ({
                            date: d.date,
                            rainfallMm: d.precipMm,
                            status: d.precipMm === 0 ? "0.0 mm (Dry / No Rain)" : `${d.precipMm} mm`
                          })),
                          dataSource: recent.source,
                          note: "Report exact observed numerical rainfall with dates and times. Distinguish between the most recent rain shower and total daily accumulation. Do NOT include forecast probability."
                        };
                      } else {
                        const historical = await fetchHistoricalWeather(geo.lat, geo.lon, args.startDate, args.endDate);
                        apiResponse = {
                          location: geo.name,
                          historicalData: historical.slice(0, 10).map(d => ({
                            date: d.date,
                            rainfallMm: d.precipMm,
                            status: d.precipMm === 0 ? "0.0 mm (Dry / No Rain Recorded)" : `${d.precipMm} mm`,
                            tempMaxC: d.tempMaxC,
                            tempMinC: d.tempMinC,
                            windKph: d.windKph,
                            dataSource: d.source || "Observed Ground Station Record"
                          })),
                          note: "Report exact observed numerical rainfall. If 0 mm was recorded, strictly report 0.0 mm dry conditions. Do not include forecast probability."
                        };
                      }
                    } else {
                      apiResponse = { error: `Could not find location "${args.location}". Historical rainfall telemetry is unavailable. Please state that records could not be retrieved, and do not invent figures.` };
                    }
                  } else if (functionName === "getEarthquakes") {
                    try {
                      const result = await getCombinedEarthquakes({
                        location: args.location,
                        limit: 6,
                      });
                      apiResponse = {
                        locationFiltered: args.location || "All / India",
                        count: result.all.length,
                        mostRecentIndianEarthquake: result.mostRecentIndia ? {
                          place: result.mostRecentIndia.place,
                          stateOrRegion: result.mostRecentIndia.stateOrRegion,
                          magnitude: `M${result.mostRecentIndia.magnitude}`,
                          depth: `${result.mostRecentIndia.depthKm} km`,
                          timeIST: result.mostRecentIndia.timeIST,
                          agency: result.mostRecentIndia.agency,
                        } : null,
                        recentEarthquakes: result.all.slice(0, 5).map((q) => ({
                          place: q.place,
                          stateOrRegion: q.stateOrRegion,
                          magnitude: `M${q.magnitude}`,
                          depth: `${q.depthKm} km`,
                          timeIST: q.timeIST,
                        })),
                      };
                    } catch (err: any) {
                      apiResponse = { error: "Failed to fetch live seismic telemetry: " + err.message };
                    }
                  } else if (functionName === "getAlerts") {
                    const alerts = await getAlerts();
                    const prunedAlerts = alerts.map((a: any) => ({
                      hazard: a.hazard,
                      severity: a.severity,
                      title: a.title,
                      headline: a.headline,
                      area: a.area,
                      onset: a.onset,
                      expires: a.expires
                    }));
                    apiResponse = { alerts: prunedAlerts };
                  } else if (functionName === "getLocation") {
                    const session = await getSession();
                    const userId = session?.userId || (session as any)?.user?.id;
                    if (userId) {
                      const places = await getPlaces(userId);
                      const prunedPlaces = places.map((p: any) => ({ name: p.name, region: p.region, country: p.country }));
                      apiResponse = { savedPlaces: prunedPlaces };
                    } else {
                      apiResponse = { error: "User is not logged in" };
                    }
                  }
                } catch (e: any) {
                  apiResponse = { error: e.message };
                }
                currentHistory.push({
                  tool_call_id: toolCall.id,
                  role: "tool",
                  name: functionName,
                  content: JSON.stringify(apiResponse),
                });
              }
              const secondResponse = await groq.chat.completions.create({
                messages: currentHistory,
                model: groqModel,
                temperature: 0.2,
                max_tokens: 1024,
              });
              text = secondResponse.choices[0]?.message?.content || "";
            } else {
              text = responseMessage?.content || "";
            }

            if (text) break;
          } catch (modelErr: any) {
            console.warn(`[Groq Fallback] Model ${groqModel} failed: ${modelErr.message}`);
            lastGroqError = modelErr;
          }
        }
      } catch (err: any) {
        lastGroqError = err;
        console.error("[Groq Fallback] Error:", err.message);
      }
    }

    // ==========================================
    // LAYER 3: OFFLINE MODE (Ultimate Fallback)
    // ==========================================
    if (!text) {
      console.error("[Disaster Copilot] CRITICAL: Both Gemini and Groq AI models failed. Entering Offline Mode.");
      const userQ = queryLower;
      
      const errStr = String(lastError).toLowerCase() + String(lastGroqError).toLowerCase();
      const isRateLimit = errStr.includes("429") || errStr.includes("too many requests") || errStr.includes("rate limit") || errStr.includes("quota");

      let offlineResponse = "";
      if (isRateLimit) {
        offlineResponse = "⚠️ **Slow Down! API Rate Limit Reached.**\n\nYou are asking questions too quickly. The free-tier AI models only allow a limited number of requests per minute. **Please wait 60 seconds and try again.**\n\n";
      } else {
        offlineResponse = "⚠️ **AEGIS AI Cloud is currently offline due to an API Outage.**\n\n";
        if (userQ.includes("weather") || userQ.includes("rain") || userQ.includes("temperature")) {
          offlineResponse += "Our natural-language weather processor is temporarily down. However, **critical Offline Disaster Systems are still active**. Please use the **Map** or **Alerts** tabs on the left to view real-time satellite data and active warnings.\n\n*We will resume AI processing as soon as connection is restored.*\n\n";
        } else {
          offlineResponse += "The AI language processor is temporarily unreachable. Critical disaster routing and SMS alert systems remain fully operational. Please navigate via the sidebar menus to access core features.\n\n";
        }
      }
      text = offlineResponse;
    }

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          const chunkSize = 15;
          for (let i = 0; i < text.length; i += chunkSize) {
            const chunk = text.slice(i, i + chunkSize);
            controller.enqueue(encoder.encode(chunk));
            await new Promise(r => setTimeout(r, 10)); 
          }
          controller.close();
        } catch (error: any) {
          controller.enqueue(encoder.encode(`\n\n**Error:** ${error.message}`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
