/**
 * AEGIS Seismic & Disaster Intelligence Telemetry Service
 * Integrates:
 * 1. National Center for Seismology (NCS / MoES, Government of India) Live Telemetry
 * 2. USGS Global and Regional High-Resolution Seismic Feeds (India bbox minmagnitude 2.5)
 */

export interface EarthquakeRecord {
  id: string;
  place: string;
  magnitude: number;
  depthKm: number;
  latitude: number;
  longitude: number;
  timeUTC: string;
  timeIST: string;
  timestamp: number;
  source: "NCS" | "USGS" | string;
  agency: string;
  eventStatus?: string;
  stateOrRegion?: string;
  isIndia: boolean;
}

export const INDIAN_STATES_AND_UTS = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

/**
 * Resolves an earthquake place string or coordinates to an Indian state/UT.
 */
export function identifyIndianState(place: string, lat?: number, lon?: number): string | null {
  const p = (place || "").toLowerCase();

  // 1. Direct match with Indian States & UTs
  for (const state of INDIAN_STATES_AND_UTS) {
    if (p.includes(state.toLowerCase())) {
      return state;
    }
  }

  // 2. Specific key seismic towns/districts
  if (p.includes("gangtok") || p.includes("mangan") || p.includes("gyalshing") || p.includes("namchi") || p.includes("sikkim")) {
    return "Sikkim";
  }
  if (p.includes("nagaon") || p.includes("morigaon") || p.includes("tezpur") || p.includes("guwahati") || p.includes("sonitpur") || p.includes("dhekiajuli") || p.includes("assam")) {
    return "Assam";
  }
  if (p.includes("khasi hills") || p.includes("tura") || p.includes("shillong") || p.includes("nongstoin") || p.includes("garo hills") || p.includes("jaintia") || p.includes("meghalaya")) {
    return "Meghalaya";
  }
  if (p.includes("rohru") || p.includes("shimla") || p.includes("rampur") || p.includes("chamba") || p.includes("kinnaur") || p.includes("kullu") || p.includes("lahaul") || p.includes("himachal")) {
    return "Himachal Pradesh";
  }
  if (p.includes("chamoli") || p.includes("uttarkashi") || p.includes("bageshwar") || p.includes("pithoragarh") || p.includes("joshimath") || p.includes("rudraprayag") || p.includes("uttarakhand")) {
    return "Uttarakhand";
  }
  if (p.includes("doda") || p.includes("kishtwar") || p.includes("baramulla") || p.includes("gulmarg") || p.includes("jammu") || p.includes("kashmir")) {
    return "Jammu and Kashmir";
  }
  if (p.includes("leh") || p.includes("kargil") || p.includes("ladakh")) {
    return "Ladakh";
  }
  if (p.includes("churachandpur") || p.includes("imphal") || p.includes("ukhrul") || p.includes("manipur")) {
    return "Manipur";
  }
  if (p.includes("champhai") || p.includes("aizawl") || p.includes("mizoram")) {
    return "Mizoram";
  }
  if (p.includes("kohima") || p.includes("mokokchung") || p.includes("nagaland")) {
    return "Nagaland";
  }
  if (p.includes("port blair") || p.includes("diglipur") || p.includes("campbell bay") || p.includes("nicobar") || p.includes("andaman")) {
    return "Andaman & Nicobar Islands";
  }
  if (p.includes("kutch") || p.includes("bhuj") || p.includes("gujarat")) {
    return "Gujarat";
  }
  if (p.includes("koyna") || p.includes("palghar") || p.includes("satara") || p.includes("maharashtra")) {
    return "Maharashtra";
  }
  if (p.includes("delhi") || p.includes("rohtak") || p.includes("jhajjar") || p.includes("faridabad")) {
    return "Delhi-NCR";
  }

  // Foreign cross-border exclusion check
  const isForeignNeighbor = [
    "afghanistan",
    "pakistan",
    "nepal",
    "myanmar",
    "bangladesh",
    "bhutan",
    "china",
    "tajikistan",
    "tibet",
    "xinjiang",
    "fayzabad",
    "hindu kush",
    "islamabad",
  ].some((c) => p.includes(c) && !p.includes("india"));

  if (isForeignNeighbor) return null;

  if (p.includes("india")) {
    return "India";
  }

  // 3. Indian terrestrial coordinate bounding box (Lat 6.0 to 37.0, Lon 68.0 to 97.5)
  if (lat !== undefined && lon !== undefined) {
    if (lat >= 6.0 && lat <= 37.0 && lon >= 68.0 && lon <= 97.5) {
      return "India";
    }
  }

  return null;
}

/**
 * Formats epoch ms or ISO string to friendly IST format (e.g., 'Oct 19, 2026, 04:01 AM IST').
 */
export function formatToIST(isoOrMs: string | number): string {
  try {
    const d = new Date(isoOrMs);
    if (isNaN(d.getTime())) return String(isoOrMs);
    const dateStr = d.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = d.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}, ${timeStr} IST`;
  } catch {
    return String(isoOrMs);
  }
}

/**
 * 1. Fetch live earthquake telemetry from National Center for Seismology (NCS / MoES, Government of India).
 * Endpoint: https://riseq.seismo.gov.in/riseq/earthquake
 */
export async function fetchNCSEarthquakes(): Promise<EarthquakeRecord[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch("https://riseq.seismo.gov.in/riseq/earthquake", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`NCS portal returned status ${res.status}`);
    }

    const html = await res.text();
    const matches = [...html.matchAll(/data-json=['"](\{.*?\})['"]/g)];
    const records: EarthquakeRecord[] = [];

    for (const m of matches) {
      try {
        const d = JSON.parse(m[1].replace(/&quot;/g, '"'));
        const [latStr, lonStr] = (d.lat_long || "").split(",").map((s: string) => s.trim());
        const magMatch = (d.magnitude_depth || d.event_name || "").match(/M:\s*([0-9.]+)/i);
        const depthMatch = (d.magnitude_depth || "").match(/D:\s*([0-9.]+)\s*km/i);

        const istMatch = (d.origin_time || "").match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})/);
        let timeMs = 0;
        let timeUTC = "";
        let timeIST = d.origin_time || "";

        if (istMatch) {
          const isoWithOffset = `${istMatch[1]}T${istMatch[2]}+05:30`;
          const dateObj = new Date(isoWithOffset);
          timeMs = dateObj.getTime();
          timeUTC = dateObj.toISOString();
          timeIST = formatToIST(timeMs);
        }

        const lat = parseFloat(latStr);
        const lon = parseFloat(lonStr);
        const rawPlace = d.event_name?.replace(/^M:\s*[0-9.]+\s*-\s*/, "").trim() || "";
        const state = identifyIndianState(rawPlace, lat, lon);
        const isIndia = !!state;

        records.push({
          id: "ncs_" + (d.event_id || Math.random().toString(36).slice(2)),
          place: rawPlace,
          magnitude: magMatch ? parseFloat(magMatch[1]) : 0,
          depthKm: depthMatch ? parseFloat(depthMatch[1]) : 10,
          latitude: lat,
          longitude: lon,
          timeUTC: timeUTC || new Date().toISOString(),
          timeIST,
          timestamp: timeMs,
          source: "NCS",
          agency: "NCS (National Center for Seismology)",
          eventStatus: d.event_type || "Reviewed",
          stateOrRegion: state || undefined,
          isIndia,
        });
      } catch {
        // Continue parsing next record
      }
    }

    return records;
  } catch (err) {
    console.warn("[disaster.ts] NCS telemetry fetch failed:", err);
    return [];
  }
}

/**
 * 2. Fetch USGS seismic telemetry.
 * If querying for India, uses bounding box (lat: 6.0 to 37.0, lon: 68.0 to 97.5) with minmagnitude 2.5.
 */
export async function fetchUSGSEarthquakes(includeGlobal = true): Promise<EarthquakeRecord[]> {
  const records: EarthquakeRecord[] = [];
  const seenIds = new Set<string>();

  // A. USGS India bounding box query (lat: 6.0 to 37.0, lon: 68.0 to 97.5, minmagnitude 2.5)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const url =
      "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=2.5&minlatitude=6.0&maxlatitude=37.0&minlongitude=68.0&maxlongitude=97.5";
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      for (const f of data.features || []) {
        seenIds.add(f.id);
        const [lon, lat, depth] = f.geometry.coordinates;
        const timeMs = f.properties.time;
        const dateObj = new Date(timeMs);
        const place = (f.properties.place || "").trim();
        const state = identifyIndianState(place, lat, lon);

        records.push({
          id: "usgs_" + f.id,
          place,
          magnitude: f.properties.mag,
          depthKm: depth || 10,
          latitude: lat,
          longitude: lon,
          timeUTC: dateObj.toISOString(),
          timeIST: formatToIST(timeMs),
          timestamp: timeMs,
          source: "USGS",
          agency: "USGS (US Geological Survey)",
          eventStatus: f.properties.status || "reviewed",
          stateOrRegion: state || undefined,
          isIndia: !!state,
        });
      }
    }
  } catch (err) {
    console.warn("[disaster.ts] USGS India query failed:", err);
  }

  // B. USGS Global M4.5+ 7-day feed for worldwide context
  if (includeGlobal) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const res = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson", {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        for (const f of data.features || []) {
          if (seenIds.has(f.id)) continue;
          seenIds.add(f.id);
          const [lon, lat, depth] = f.geometry.coordinates;
          const timeMs = f.properties.time;
          const dateObj = new Date(timeMs);
          const place = (f.properties.place || "").trim();
          const state = identifyIndianState(place, lat, lon);

          records.push({
            id: "usgs_" + f.id,
            place,
            magnitude: f.properties.mag,
            depthKm: depth || 10,
            latitude: lat,
            longitude: lon,
            timeUTC: dateObj.toISOString(),
            timeIST: formatToIST(timeMs),
            timestamp: timeMs,
            source: "USGS",
            agency: "USGS (US Geological Survey)",
            eventStatus: f.properties.status || "reviewed",
            stateOrRegion: state || undefined,
            isIndia: !!state,
          });
        }
      }
    } catch (err) {
      console.warn("[disaster.ts] USGS Global feed failed:", err);
    }
  }

  return records;
}

/**
 * 3. Combine NCS and USGS feeds, deduplicate dual-agency matches,
 * and sort strictly by descending timestamp (timestamp: -1).
 */
export async function getCombinedEarthquakes(options?: {
  location?: string;
  minMagnitude?: number;
  indiaOnly?: boolean;
  limit?: number;
}): Promise<{
  all: EarthquakeRecord[];
  indianQuakes: EarthquakeRecord[];
  mostRecentIndia: EarthquakeRecord | null;
}> {
  const [ncsQuakes, usgsQuakes] = await Promise.all([
    fetchNCSEarthquakes(),
    fetchUSGSEarthquakes(!options?.indiaOnly),
  ]);

  const combined: EarthquakeRecord[] = [];
  const processedUSGS = new Set<string>();

  // Deduplicate: If an event appears in both NCS and USGS (within 15 mins and 0.6 deg coordinates),
  // retain the NCS record with dual-agency verification note
  for (const ncs of ncsQuakes) {
    const match = usgsQuakes.find(
      (u) =>
        !processedUSGS.has(u.id) &&
        Math.abs(u.timestamp - ncs.timestamp) < 15 * 60 * 1000 &&
        Math.abs(u.latitude - ncs.latitude) < 0.6 &&
        Math.abs(u.longitude - ncs.longitude) < 0.6
    );

    if (match) {
      processedUSGS.add(match.id);
      combined.push({
        ...ncs,
        agency: "NCS & USGS (Dual Verified)",
        stateOrRegion: ncs.stateOrRegion || match.stateOrRegion,
        isIndia: ncs.isIndia || match.isIndia,
      });
    } else {
      combined.push(ncs);
    }
  }

  for (const usgs of usgsQuakes) {
    if (!processedUSGS.has(usgs.id)) {
      combined.push(usgs);
    }
  }

  // Strictly sort descending by timestamp
  combined.sort((a, b) => b.timestamp - a.timestamp);

  // Filter Indian territory quakes
  const indianQuakes = combined.filter((q) => q.isIndia);
  const mostRecentIndia = indianQuakes.length > 0 ? indianQuakes[0] : null;

  let filtered = combined;
  if (options?.indiaOnly) {
    filtered = indianQuakes;
  } else if (options?.location) {
    const locLower = options.location.toLowerCase().trim();
    if (locLower === "india" || locLower.includes("india")) {
      filtered = indianQuakes;
    } else {
      filtered = combined.filter(
        (q) =>
          q.place.toLowerCase().includes(locLower) ||
          (q.stateOrRegion && q.stateOrRegion.toLowerCase().includes(locLower))
      );
    }
  }

  if (options?.minMagnitude) {
    filtered = filtered.filter((q) => q.magnitude >= (options.minMagnitude || 0));
  }

  if (options?.limit && options.limit > 0) {
    filtered = filtered.slice(0, options.limit);
  }

  return {
    all: filtered,
    indianQuakes,
    mostRecentIndia,
  };
}

/**
 * Returns formatted context string of recent Indian earthquakes for Gemini system prompt.
 */
export async function getLiveSeismicTelemetryContext(): Promise<string> {
  try {
    const { mostRecentIndia, indianQuakes } = await getCombinedEarthquakes({
      indiaOnly: true,
      limit: 6,
    });

    if (!mostRecentIndia) {
      return "";
    }

    const stateDisplay = mostRecentIndia.stateOrRegion
      ? `${mostRecentIndia.stateOrRegion} state`
      : mostRecentIndia.place;

    const recentList = indianQuakes
      .slice(0, 5)
      .map(
        (q) =>
          `- ${q.timeIST}: M${q.magnitude} near ${q.place} (${q.stateOrRegion || "India"}, Depth: ${q.depthKm} km) - Authority: ${q.agency}`
      )
      .join("\n");

    return `
CRITICAL OFFICIAL SEISMIC TELEMETRY (NCS / MoES & USGS COMBINED):
- MOST RECENT INDIAN EARTHQUAKE RECORDED:
  * Location: ${mostRecentIndia.place}
  * State / UT: ${stateDisplay}
  * Magnitude: M${mostRecentIndia.magnitude}
  * Depth: ${mostRecentIndia.depthKm} km (Shallow tremor)
  * Local Time: ${mostRecentIndia.timeIST} (${mostRecentIndia.timeUTC})
  * Primary Monitoring Agency: ${mostRecentIndia.agency}
  * Event Status: ${mostRecentIndia.eventStatus || "Reviewed official seismic event"}

- RECENT REGISTERED TREMORS IN INDIAN STATES (DESCENDING CHRONOLOGICAL ORDER):
${recentList}

CRITICAL BOT DIRECTIVE ON "LAST / MOST RECENT EARTHQUAKE IN INDIA":
When the user asks which state had the last earthquake in India or asks for the most recent Indian earthquake:
1. You MUST explicitly state the latest event from the live telemetry above: ${mostRecentIndia.place} (${stateDisplay}) on ${mostRecentIndia.timeIST}.
2. Mention the magnitude (M${mostRecentIndia.magnitude}) and depth (${mostRecentIndia.depthKm} km).
3. Do NOT cite older offshore events (such as the Oct 12 Andaman M4.6 event) as the most recent earthquake when recent local tremors have occurred in mainland Indian states (e.g., Assam, Sikkim, Himachal Pradesh, Meghalaya).
4. Emphasize that NCS (National Center for Seismology) monitors all localized shallow seismic activity across Indian states.`;
  } catch (err) {
    console.warn("[disaster.ts] Error generating seismic context:", err);
    return "";
  }
}
