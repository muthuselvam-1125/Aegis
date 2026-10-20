export interface NewsItem {
  title: string;
  link: string;
  locationName?: string;
  countryCode?: string;
}

export function buildLocationWeatherNewsUrl(locationName: string, countryCode?: string): string {
  const loc = (locationName || "").trim();
  const locLower = loc.toLowerCase();
  const cCode = (countryCode || "").toLowerCase().trim();

  // 1. For Dubai
  if (locLower === "dubai" || locLower.includes("dubai") || cCode === "ae") {
    return `https://news.google.com/search?q=${encodeURIComponent("Dubai weather NCM")}&hl=en-AE&gl=AE&ceid=AE:en`;
  }

  // 2. For Tokyo
  if (locLower === "tokyo" || locLower.includes("tokyo") || cCode === "jp") {
    return `https://news.google.com/search?q=${encodeURIComponent("Tokyo weather forecast JMA")}&hl=en-JP&gl=JP&ceid=JP:en`;
  }

  // 3. For UK
  if (cCode === "gb" || cCode === "uk" || locLower.includes("london") || locLower.includes("uk")) {
    return `https://news.google.com/search?q=${encodeURIComponent(loc + " weather forecast Met Office")}&hl=en-GB&gl=GB&ceid=GB:en`;
  }

  // 4. For US
  if (cCode === "us") {
    return `https://news.google.com/search?q=${encodeURIComponent(loc + " weather forecast NWS")}&hl=en-US&gl=US&ceid=US:en`;
  }

  // 5. For all Indian locations (and default)
  return `https://news.google.com/search?q=${encodeURIComponent(loc + " weather OR rain IMD")}&hl=en-IN&gl=IN&ceid=IN:en`;
}

// Terms that indicate sports, tournaments, entertainment, finance, or crimes
const NON_WEATHER_TERMS = [
  // Sports & Games
  "cricket", "match", "series", "score", "scores", "stadium", "t20", "ipl", "odi", "test match",
  "tournament", "championship", "championships", "cup", "trophy", "league", "wicket", "wickets",
  "batsman", "bowler", "batting", "bowling", "innings", "race to dubai", "golf", "tennis",
  "football", "soccer", "premier league", "fifa", "badminton", "mcilroy", "super bowl", "nba",
  "nfl", "formula 1", "grand prix", "f1", "athletics", "olympic", "olympics", "semifinal",
  "playoff", "playoffs", "highlights", "derby", "racing", "decider", "vs", "versus",
  // Financial & Corporate
  "stock", "stocks", "shares", "profit", "guidance", "inflation", "interest rate", "revenue", "gdp", "crypto",
  // Crime & Entertainment
  "homicide", "arrested", "stabbing", "murder", "smuggled", "smuggling", "robbery", "theft",
  "movie", "box office", "trailer", "teaser", "actor", "actress", "cinema"
];

// Terms that indicate genuine meteorological relevance
const WEATHER_TERMS = [
  "weather", "forecast", "forecasts", "temperature", "temperatures", "rain", "rains", "rainfall",
  "drizzle", "shower", "showers", "storm", "storms", "thunderstorm", "thunderstorms",
  "cyclone", "cyclones", "flood", "floods", "flooding", "waterlogging", "cloud", "clouds", "cloudy", "overcast",
  "heatwave", "cold wave", "frost", "humid", "humidity", "monsoon",
  "imd", "ncm", "rmc", "jma", "meteorological", "meteorology", "advisory", "warning", "alerts", "alert"
];

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function isLegitimateWeatherNews(title: string): boolean {
  const lower = title.toLowerCase();

  // 1. Exclude if title mentions sports, tournaments, financial, or unrelated events
  for (const term of NON_WEATHER_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(lower)) {
      return false;
    }
  }

  // 2. Must contain at least one genuine meteorological / weather keyword
  return WEATHER_TERMS.some(term => {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    return regex.test(lower);
  });
}

function getCountryCode(place: any, nominatimAddr: any = {}): string {
  const directCode = (nominatimAddr?.country_code || place?.country_code || "").toLowerCase().trim();
  if (directCode) {
    if (directCode === "ae" || directCode === "are") return "ae";
    if (directCode === "in" || directCode === "ind") return "in";
    if (directCode === "jp" || directCode === "jpn") return "jp";
    if (directCode === "us" || directCode === "usa") return "us";
    if (directCode === "gb" || directCode === "uk" || directCode === "gbr") return "gb";
    return directCode;
  }

  const fullText = `${place.country || ""} ${place.region || ""} ${place.name || ""} ${nominatimAddr.country || ""} ${nominatimAddr.state || ""}`.toLowerCase();
  if (fullText.includes("dubai") || fullText.includes("emirates") || fullText.includes("uae") || fullText.includes("abu dhabi") || fullText.includes("sharjah")) {
    return "ae";
  }
  if (
    fullText.includes("india") ||
    fullText.includes("tamil nadu") ||
    fullText.includes("kerala") ||
    fullText.includes("delhi") ||
    fullText.includes("mumbai") ||
    fullText.includes("sivakasi") ||
    fullText.includes("malli") ||
    fullText.includes("rajapalayam") ||
    fullText.includes("madurai") ||
    fullText.includes("chennai") ||
    fullText.includes("sivalingapuram")
  ) {
    return "in";
  }
  if (fullText.includes("japan") || fullText.includes("tokyo") || fullText.includes("osaka") || fullText.includes("kyoto")) {
    return "jp";
  }
  if (fullText.includes("united kingdom") || fullText.includes("england") || fullText.includes("london") || fullText.includes("scotland") || fullText.includes("britain") || fullText.includes("uk")) {
    return "gb";
  }
  if (fullText.includes("kenya") || fullText.includes("nairobi")) {
    return "ke";
  }
  if (fullText.includes("new zealand") || fullText.includes("wellington") || fullText.includes("auckland")) {
    return "nz";
  }
  if (fullText.includes("canada") || fullText.includes("toronto") || fullText.includes("vancouver")) {
    return "ca";
  }
  if (fullText.includes("australia") || fullText.includes("sydney") || fullText.includes("melbourne")) {
    return "au";
  }
  return "us";
}

function getGoogleNewsParams(countryCode: string): string {
  switch (countryCode.toLowerCase()) {
    case "ae":
      return "hl=en-AE&gl=AE&ceid=AE:en";
    case "in":
      return "hl=en-IN&gl=IN&ceid=IN:en";
    case "jp":
      return "hl=en-JP&gl=JP&ceid=JP:en";
    case "gb":
    case "uk":
      return "hl=en-GB&gl=GB&ceid=GB:en";
    case "ke":
      return "hl=en-KE&gl=KE&ceid=KE:en";
    case "nz":
      return "hl=en-NZ&gl=NZ&ceid=NZ:en";
    case "ca":
      return "hl=en-CA&gl=CA&ceid=CA:en";
    case "au":
      return "hl=en-AU&gl=AU&ceid=AU:en";
    case "us":
    default:
      return "hl=en-US&gl=US&ceid=US:en";
  }
}

function getPriorityScore(title: string, countryCode: string): number {
  const lower = title.toLowerCase();
  let score = 0;

  // 1. Official National Meteorological Authorities (Top Priority: +50)
  if (countryCode === "ae") {
    if (
      lower.includes("ncm") ||
      lower.includes("national center of meteorology") ||
      lower.includes("national centre of meteorology")
    ) {
      score += 50;
    }
  } else if (countryCode === "in") {
    if (
      lower.includes("imd") ||
      lower.includes("meteorological department") ||
      lower.includes("rmc") ||
      lower.includes("regional meteorological centre") ||
      lower.includes("regional meteorological center")
    ) {
      score += 50;
    }
  } else if (countryCode === "jp") {
    if (
      lower.includes("jma") ||
      lower.includes("japan meteorological agency")
    ) {
      score += 50;
    }
  } else if (countryCode === "gb") {
    if (lower.includes("met office")) {
      score += 50;
    }
  } else if (countryCode === "us") {
    if (
      lower.includes("nws") ||
      lower.includes("national weather service") ||
      lower.includes("noaa")
    ) {
      score += 50;
    }
  }

  // 2. Verified Regional News Dailies / Established Weather Desks (+35)
  if (countryCode === "ae") {
    if (
      lower.includes("khaleej times") ||
      lower.includes("gulf news") ||
      lower.includes("the national")
    ) {
      score += 35;
    }
  } else if (countryCode === "in") {
    if (
      lower.includes("the hindu") ||
      lower.includes("times of india") ||
      lower.includes("indian express") ||
      lower.includes("hindustan times") ||
      lower.includes("dt next") ||
      lower.includes("deccan herald") ||
      lower.includes("ndtv") ||
      lower.includes("news on air")
    ) {
      score += 35;
    }
  } else if (countryCode === "jp") {
    if (lower.includes("nhk") || lower.includes("japan times")) {
      score += 35;
    }
  } else if (countryCode === "gb") {
    if (lower.includes("bbc") || lower.includes("guardian")) {
      score += 35;
    }
  }

  // 3. Urgent Meteorological Advisories & Color Codes (+30)
  if (
    lower.includes("red alert") ||
    lower.includes("orange alert") ||
    lower.includes("yellow alert") ||
    lower.includes("warning") ||
    lower.includes("advisory") ||
    lower.includes("alert")
  ) {
    score += 30;
  }

  // 4. Critical Meteorological Events (+15)
  if (
    lower.includes("cyclone") ||
    lower.includes("flood") ||
    lower.includes("heavy rain") ||
    lower.includes("forecast")
  ) {
    score += 15;
  }

  return score;
}

const KNOWN_PARENT_DISTRICTS: Record<string, string> = {
  rajapalayam: "Virudhunagar",
  sivakasi: "Virudhunagar",
  malli: "Virudhunagar",
  sivalingapuram: "Virudhunagar",
  srivilliputhur: "Virudhunagar",
  aruppukkottai: "Virudhunagar",
  sattur: "Virudhunagar",
  tambaram: "Chengalpattu",
  avadi: "Tiruvallur",
};

function matchesLocationWord(text: string, word: string): boolean {
  if (!word || !text) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function cleanHeadline(title: string): string {
  const cleaned = cleanText(title);
  return cleaned.replace(/^\[.*?\]\s*/, "").trim();
}

export async function fetchNewsForPlaces(places: any[], activePlaceId?: number | null): Promise<NewsItem[]> {
  const allNewsItems: NewsItem[] = [];

  // Sort places to put the active one first
  const sortedPlaces = [...places].sort((a, b) => {
    if (a.id === activePlaceId) return -1;
    if (b.id === activePlaceId) return 1;
    return 0;
  });

  const results = await Promise.all(
    sortedPlaces.map(async (place) => {
      let city = "";
      let district = "";
      let state = "";
      let country = "";
      let countryCode = "";

      const rawName = place.name || "";
      const nameClean = rawName.split(/[—–-]/)[0].trim();

      // 1. Fetch dynamic metadata from reverse geocoding
      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${place.lat}&lon=${place.lon}`);
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const addr = geoData.address || {};
          city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || nameClean;
          district = addr.state_district || addr.district || addr.county || "";
          state = addr.state || "";
          country = addr.country || "";
          countryCode = getCountryCode(place, addr);
        }
      } catch (e) {
        city = nameClean;
      }

      if (!city) {
        city = nameClean;
      }

      if (!state && place.region) {
        state = place.region;
      }

      if (!country && place.country) {
        country = place.country;
      }

      if (!countryCode) {
        countryCode = getCountryCode(place);
      }

      const parentDistrict = district || KNOWN_PARENT_DISTRICTS[city.toLowerCase()] || KNOWN_PARENT_DISTRICTS[nameClean.toLowerCase()] || "";
      const googleNewsParams = getGoogleNewsParams(countryCode);
      const authority =
        countryCode === "ae"
          ? "NCM"
          : countryCode === "jp"
          ? "JMA"
          : countryCode === "gb"
          ? "Met Office"
          : countryCode === "us"
          ? "NWS"
          : "IMD";

      const fetchFeed = async (locationQuery: string) => {
        if (!locationQuery) return null;
        // Strictly query for the target location with meteorological keywords and sports exclusion
        const queryStr = `"${locationQuery}" (weather OR rain OR forecast OR ${authority}) -cricket -match when:2d`;
        const q = encodeURIComponent(queryStr);
        const rssUrl = `https://news.google.com/rss/search?q=${q}&${googleNewsParams}`;
        const res = await fetch(`/api/news?url=${encodeURIComponent(rssUrl)}`);
        if (!res.ok) throw new Error("fetch failed");
        return await res.json();
      };

      try {
        const now = new Date().getTime();
        const twoDaysMs = 48 * 60 * 60 * 1000;
        
        const filterRecentAndLegit = (items: any[]) => items
          .filter((item: any) => {
            if (!item.title) return false;
            if (!isLegitimateWeatherNews(item.title)) return false;
            if (!item.pubDate) return true;
            const pubTime = new Date(item.pubDate).getTime();
            return (now - pubTime) <= twoDaysMs;
          })
          .sort((a: any, b: any) => getPriorityScore(b.title, countryCode) - getPriorityScore(a.title, countryCode));

        // Step 1: Search specifically by City
        let data = await fetchFeed(city);
        let legitItems = filterRecentAndLegit(data?.items || []);

        // Step 2: Fallback to direct parent district ONLY if no city-level news and district is distinct
        if (legitItems.length === 0 && parentDistrict && parentDistrict.toLowerCase() !== city.toLowerCase()) {
          data = await fetchFeed(parentDistrict);
          legitItems = filterRecentAndLegit(data?.items || []);
        }

        const placeItems: NewsItem[] = [];
        let hasDirectLocalMatch = false;

        // Process legit items: STRICTLY matching city or its direct parent district
        for (const item of legitItems) {
          const rawTitle = cleanText(item.title);
          const mentionsCity = matchesLocationWord(rawTitle, city) || matchesLocationWord(rawTitle, nameClean);
          const mentionsDist = parentDistrict ? matchesLocationWord(rawTitle, parentDistrict) : false;

          // Strict location verification: Only accept if the headline directly names the location
          if (mentionsCity || mentionsDist) {
            hasDirectLocalMatch = true;
            placeItems.push({
              title: `[${city}] ${cleanHeadline(item.title)}`,
              link: buildLocationWeatherNewsUrl(city, countryCode),
              locationName: city,
              countryCode: countryCode,
            });
          }
        }

        // If no direct news matching this location was returned,
        // do NOT show unselected cities. Show clean, verified meteorological summaries for this location
        if (!hasDirectLocalMatch || placeItems.length === 0) {
          placeItems.push(
            {
              title: `[${city}] Live ${authority} Meteorological Feed & Local Weather Radar`,
              link: buildLocationWeatherNewsUrl(city, countryCode),
              locationName: city,
              countryCode: countryCode,
            },
            {
              title: `[${city}] Verified ${authority} Observational Bulletin & Active Regional Forecast`,
              link: buildLocationWeatherNewsUrl(city, countryCode),
              locationName: city,
              countryCode: countryCode,
            }
          );
        }

        return placeItems.slice(0, 2);
      } catch (e) {
        console.error("Failed to fetch news for", city, e);
      }
      
      return [{
        title: `[${city}] Live ${authority} Meteorological Feed & Local Weather Radar`,
        link: buildLocationWeatherNewsUrl(city, countryCode),
        locationName: city,
        countryCode: countryCode,
      }];
    })
  );

  results.forEach(items => {
    allNewsItems.push(...items);
  });

  // Deduplicate items:
  // 1. Never duplicate the exact same headline
  // 2. Third-party news articles (which share a base title) should only appear once even if retrieved under multiple fallbacks
  const seenFullTitles = new Set<string>();
  const seenBaseArticles = new Set<string>();
  const uniqueItems: NewsItem[] = [];

  for (const item of allNewsItems) {
    const fullKey = item.title.toLowerCase().trim();
    if (seenFullTitles.has(fullKey)) continue;

    const baseTitle = item.title.replace(/^\[.*?\]\s*/, "").toLowerCase().trim();
    if (baseTitle.includes(" - ")) {
      if (seenBaseArticles.has(baseTitle)) continue;
      seenBaseArticles.add(baseTitle);
    }

    seenFullTitles.add(fullKey);
    uniqueItems.push(item);
  }

  return uniqueItems;
}
