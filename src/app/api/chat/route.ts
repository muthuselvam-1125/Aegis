import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { getPlaces } from "@/lib/data";
import { getSession } from "@/lib/auth";
import { geocodeLocation, currentConditions, aqiCategory, daily, fetchHistoricalWeather, hourly } from "@/lib/wx";
import { getAlerts } from "@/lib/data";
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
    description: "Get the upcoming daily weather forecast for a location (next 7 days)",
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
    description: "Get historical weather data for a location. MUST be used when the user asks about past weather, previous rainfall, last rain, or conditions on a specific past date.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "The city or location name, e.g. 'Chennai', 'Madurai'"
        },
        startDate: {
          type: "string",
          description: "Optional. Start date in YYYY-MM-DD format. If asking for a specific year/month, set this."
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

    const systemInstructions = `You are AEGIS, a comprehensive Disaster & Hazard Intelligence Assistant.
Current System Date: ${new Date().toISOString()}.
CRITICAL RULES & GUARDRAILS:
1. FULL DISASTER INTELLIGENCE: You are NOT just a weather bot. You natively handle all major natural disasters: Cyclones/Storms (IMD named systems), Floods, Earthquakes, Tsunamis, Landslides, and Emergency Relief Protocols.
2. HISTORICAL FACTS VS LIVE ALERTS: For disaster queries (e.g., "last storm in India", "earthquake history", "major floods"), use your general geological/meteorological knowledge to state ACTUAL events, affected regions, severity, and official safety measures. NEVER classify a normal local 'Rainfall Forecast Alert' as a 'storm' or 'natural disaster'.
3. GROUNDED FACTS: Strictly prevent unverified claims or speculative disaster news. Rely exclusively on official tools like IMD, NDMA, and USGS.
3.5. PREMISE VERIFICATION: If a user query contains a false historical or scientific premise (e.g., August or December being a Southwest monsoon retraction/active phase in Tamil Nadu), you MUST explicitly reject and correct the user's premise first using official historical records. Do not invent theories to justify false assumptions.
4. GRACEFUL FALLBACK: If live verified data is completely unavailable for a queried event, explicitly state that you cannot confirm real-time reports. Do not guess or extrapolate.
5. TIME & DATE FORMATTING: ALWAYS use unambiguous text formats for dates (e.g., 'Oct 6, 2026'). Times returned by the weather tools are ALREADY in the local timezone of the requested location. USGS earthquake times are in UTC; you MUST convert them to the local timezone. Output times in a readable 12-hour AM/PM format.
6. GEOGRAPHICAL ACCURACY & MODERN BOUNDARIES: When parsing raw USGS or weather place names (e.g., "Bāgeshwar, India"), you MUST accurately resolve districts/towns to their modern political boundaries. For India, explicitly verify against the modern 28 states and 8 Union Territories (e.g., Bageshwar, Chamoli, and Uttarkashi are in Uttarakhand, NOT Uttar Pradesh; Telangana is separate from Andhra Pradesh). Do not rely on pre-2000 historical geography. Use the provided coordinates to cross-check if uncertain.
7. UI FORMATTING RULES: DO NOT use markdown headers (like #, ##, or ###). The frontend UI cannot parse them correctly. Instead, use bold text (e.g., **Section Title**) for all headings and section breaks. Keep formatting clean with bullet points.
8. HISTORICAL FACT-CHECKING & RIGOR: Distinguish strictly between active warnings and historical disasters. For past events (e.g., 'last flood', 'major cyclone in 2023'), rely on verified records (IMD, NDMA, USGS). Be highly resistant to prompt twists: do not accept misleading premises, false dates, wrong locations, or exaggerated rumors in user queries. Politely correct false assumptions. Provide exact historical facts (official disaster name, month/year, impacted region, severity) without guessing or confusing similar events.
9. CONCISE COMMUNICATION & BREVITY RULE:
   - Default to Short & Crisp Answers: Keep answers direct, concise, and to-the-point without unnecessary filler or overly long essays. Summarize the key facts in 2–4 short bullet points or a brief summary paragraph.
   - Conditional Elaboration (Only When Requested): Provide deep, detailed, and extended breakdowns ONLY IF the user explicitly asks for details (e.g., "explain in detail", "give a complete breakdown", "elaborate", "in-depth analysis").
   - Retain High Value: Even when keeping it brief, maintain 100% factual accuracy, clear safety advisories, and clean formatting (**Bold Headers**, no ###).
10. CHRONOLOGICAL RECENCY & HISTORICAL ACCURACY:
    - When asked for the "last" or "most recent" disaster (cyclones, floods, etc.), prioritize the most recent major verified event in chronological history (e.g., for Tamil Nadu: Cyclone Michaung in Dec 2023, Cyclone Mandous in Dec 2022). Do not jump back to older events while skipping major recent ones.
    - Strictly verify landfall dates, locations, and IMD storm names. Do not invent or conflate landfall dates.
    - Maintain the brief 3-4 bullet point format stating: Name & Category, Landfall Date & Location, Impact Summary.`;

    // AGGRESSIVE HISTORY TRIMMING: Keep only the last 4 messages (approx 2 chat turns)
    // to strictly prevent 15 RPM / 1M TPM Rate Limiting on Free Tier.
    const recentMessages = messages.slice(-4);
    const lastMessageText = (recentMessages[recentMessages.length - 1].content || "").toLowerCase();

    // CONDITIONAL CONTEXT FETCHING & TELEMETRY OPTIMIZATION
    // Only inject tools if the user's prompt suggests they need live/historical telemetry, to save tokens.
    const alertKeywords = ["my active alerts", "current warning", "live alert", "right now", "here", "my location", "ongoing alert", "alert"];
    const liveWeatherKeywords = ["weather", "temperature", "forecast", "rain", "rainy", "hot", "cold", "wind", "humidity", "today", "tomorrow", "tonight", "current conditions"];
    const earthquakeKeywords = ["earthquake", "quake", "seismic", "tremor", "tremors"];
    
    const shouldAllowAlerts = alertKeywords.some(kw => lastMessageText.includes(kw));
    const shouldAllowLiveWeather = liveWeatherKeywords.some(kw => lastMessageText.includes(kw));
    const shouldAllowEarthquakes = earthquakeKeywords.some(kw => lastMessageText.includes(kw));

    let availableFunctions = functionDeclarations;
    
    if (!shouldAllowAlerts) {
      availableFunctions = availableFunctions.filter(fn => fn.name !== "getAlerts");
    }
    if (!shouldAllowLiveWeather) {
      availableFunctions = availableFunctions.filter(fn => !["getWeather", "getForecast", "getHourlyForecast"].includes(fn.name));
    }
    if (!shouldAllowEarthquakes) {
      availableFunctions = availableFunctions.filter(fn => fn.name !== "getEarthquakes");
    }

    let dynamicDisasterContext = "";
    if (shouldAllowEarthquakes) {
      try {
        dynamicDisasterContext = await getLiveSeismicTelemetryContext();
      } catch (e) {
        console.warn("[chat/route.ts] Failed to fetch live earthquake context:", e);
      }
    }
    const finalSystemInstructions = systemInstructions + (dynamicDisasterContext ? `\n\n${dynamicDisasterContext}` : "");

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

    let text = "";
    let lastError = null;
    let lastGroqError = null;

    // ==========================================
    // LAYER 1: GOOGLE GEMINI (Primary AI)
    // ==========================================
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      const fallbackModels = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
      ];

      for (const modelName of fallbackModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: finalSystemInstructions,
            tools: [{ functionDeclarations: availableFunctions as any }],
          });

          const chat = model.startChat({ history: geminiHistory });
          let result = await chat.sendMessage(lastMessageText);

          // Handle function calls
          if (result.response.functionCalls()) {
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
                      apiResponse = {
                        location: geo.name,
                        temperature: wx.tempC.mean,
                        feelsLike: wx.feelsLikeC,
                        condition: wx.code,
                        windKph: wx.windKph,
                        humidity: wx.humidity,
                        aqi: wx.aqi,
                        airQualityCategory: aqiCategory(wx.aqi).label
                      };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getForecast") {
                    const locationArg = (call.args as any).location as string;
                    const geo = await geocodeLocation(locationArg);
                    if (geo) {
                      const forecast = await daily(geo.lat, geo.lon, 7);
                      apiResponse = { location: geo.name, forecast: forecast };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
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
                      const historical = await fetchHistoricalWeather(geo.lat, geo.lon, startDateArg, endDateArg);
                      apiResponse = { location: geo.name, historicalData: historical.length > 7 ? historical.slice(0, 7) : historical };
                    } else {
                      apiResponse = { error: `Could not find location: ${locationArg}` };
                    }
                  } else if (call.name === "getEarthquakes") {
                    const locationArg = (call.args as any).location as string | undefined;
                    try {
                      const result = await getCombinedEarthquakes({
                        location: locationArg,
                        limit: 15,
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
                          timeUTC: result.mostRecentIndia.timeUTC,
                          agency: result.mostRecentIndia.agency,
                          coordinates: `[Lat: ${result.mostRecentIndia.latitude}, Lon: ${result.mostRecentIndia.longitude}]`,
                        } : null,
                        recentEarthquakes: result.all.map((q) => ({
                          place: q.place,
                          stateOrRegion: q.stateOrRegion,
                          magnitude: `M${q.magnitude}`,
                          depth: `${q.depthKm} km`,
                          timeIST: q.timeIST,
                          timeUTC: q.timeUTC,
                          agency: q.agency,
                          coordinates: `[Lat: ${q.latitude}, Lon: ${q.longitude}]`,
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
                    if (session && session.user && session.user.id) {
                      const places = await getPlaces(session.user.id);
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
      console.warn("[Disaster Copilot] Gemini failed entirely. Failing over to Groq...");
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

        const completion = await groq.chat.completions.create({
          messages: groqHistory,
          model: "openai/gpt-oss-120b",
          tools: tools as any,
          tool_choice: "auto",
        });

        const responseMessage = completion.choices[0]?.message;

        if (responseMessage?.tool_calls) {
          groqHistory.push(responseMessage);
          for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            let apiResponse: any = {};
            try {
              if (functionName === "getWeather") {
                const geo = await geocodeLocation(args.location);
                if (geo) {
                  const wx = await currentConditions(geo.lat, geo.lon);
                  apiResponse = {
                    location: geo.name,
                    temperature: wx.tempC.mean,
                    feelsLike: wx.feelsLikeC,
                    condition: wx.code,
                    windKph: wx.windKph,
                    humidity: wx.humidity,
                    aqi: wx.aqi,
                    airQualityCategory: aqiCategory(wx.aqi).label
                  };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
                }
              } else if (functionName === "getForecast") {
                const geo = await geocodeLocation(args.location);
                if (geo) {
                  const forecast = await daily(geo.lat, geo.lon, 7);
                  apiResponse = { location: geo.name, forecast: forecast };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
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
                  const historical = await fetchHistoricalWeather(geo.lat, geo.lon, args.startDate, args.endDate);
                  apiResponse = { location: geo.name, historicalData: historical.length > 7 ? historical.slice(0, 7) : historical };
                } else {
                  apiResponse = { error: `Could not find location: ${args.location}` };
                }
              } else if (functionName === "getEarthquakes") {
                try {
                  const result = await getCombinedEarthquakes({
                    location: args.location,
                    limit: 15,
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
                      timeUTC: result.mostRecentIndia.timeUTC,
                      agency: result.mostRecentIndia.agency,
                      coordinates: `[Lat: ${result.mostRecentIndia.latitude}, Lon: ${result.mostRecentIndia.longitude}]`,
                    } : null,
                    recentEarthquakes: result.all.map((q) => ({
                      place: q.place,
                      stateOrRegion: q.stateOrRegion,
                      magnitude: `M${q.magnitude}`,
                      depth: `${q.depthKm} km`,
                      timeIST: q.timeIST,
                      timeUTC: q.timeUTC,
                      agency: q.agency,
                      coordinates: `[Lat: ${q.latitude}, Lon: ${q.longitude}]`,
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
                if (session && session.user && session.user.id) {
                  const places = await getPlaces(session.user.id);
                  const prunedPlaces = places.map((p: any) => ({ name: p.name, region: p.region, country: p.country }));
                  apiResponse = { savedPlaces: prunedPlaces };
                } else {
                  apiResponse = { error: "User is not logged in" };
                }
              }
            } catch (e: any) {
              apiResponse = { error: e.message };
            }
            groqHistory.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: JSON.stringify(apiResponse),
            });
          }
          const secondResponse = await groq.chat.completions.create({
            messages: groqHistory,
            model: "openai/gpt-oss-120b"
          });
          text = secondResponse.choices[0]?.message?.content || "";
        } else {
          text = responseMessage?.content || "";
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
      const userQ = lastMessageText.toLowerCase();
      
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
