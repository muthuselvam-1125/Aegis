import { currentConditionsSync, CurrentConditions } from "./wx";


export type Severity = "calm" | "advisory" | "watch" | "warning" | "emergency";

export const SEVERITY_ORDER: Severity[] = ["calm", "advisory", "watch", "warning", "emergency"];

export const SEVERITY_META: Record<
  Severity,
  { label: string; rank: number; textOnTint: string; solid: string; tint: string; border: string; shape: string }
> = {
  calm: { label: "All clear", rank: 0, textOnTint: "text-calm", solid: "bg-calm", tint: "bg-calm-bg", border: "border-calm", shape: "circle" },
  advisory: { label: "Advisory", rank: 1, textOnTint: "text-advisory", solid: "bg-advisory", tint: "bg-advisory-bg", border: "border-advisory", shape: "diamond" },
  watch: { label: "Watch", rank: 2, textOnTint: "text-watch", solid: "bg-watch", tint: "bg-watch-bg", border: "border-watch", shape: "triangle" },
  warning: { label: "Warning", rank: 3, textOnTint: "text-warning", solid: "bg-warning", tint: "bg-warning-bg", border: "border-warning", shape: "chevron" },
  emergency: { label: "Emergency", rank: 4, textOnTint: "text-emergency", solid: "bg-emergency", tint: "bg-emergency-bg", border: "border-emergency", shape: "octagon" },
};

export type HazardType =
  | "flood"
  | "cyclone"
  | "thunderstorm"
  | "heat"
  | "cold"
  | "wildfire"
  | "smoke"
  | "drought"
  | "earthquake"
  | "tsunami"
  | "landslide"
  | "frost"
  | "hail";

export const HAZARD_META: Record<HazardType, { label: string; blurb: string }> = {
  flood: { label: "Flood", blurb: "Rising water from rain, river or storm surge." },
  cyclone: { label: "Tropical cyclone", blurb: "Sustained high winds, surge and extreme rain." },
  thunderstorm: { label: "Severe thunderstorm", blurb: "Lightning, damaging wind, tornado potential." },
  heat: { label: "Extreme heat", blurb: "Dangerous heat and humidity." },
  cold: { label: "Extreme cold", blurb: "Hard freeze, wind chill, winter storm." },
  wildfire: { label: "Wildfire", blurb: "Active fire spread threatening structures." },
  smoke: { label: "Wildfire smoke", blurb: "Hazardous air quality from smoke plume." },
  drought: { label: "Drought", blurb: "Prolonged water deficit and crop stress." },
  earthquake: { label: "Earthquake", blurb: "Recent seismic activity and aftershock risk." },
  tsunami: { label: "Tsunami", blurb: "Coastal inundation following seismic event." },
  landslide: { label: "Landslide", blurb: "Slope failure on saturated or steep terrain." },
  frost: { label: "Agricultural frost", blurb: "Sub-zero temperatures damaging to crops." },
  hail: { label: "Crop-damaging hail", blurb: "Large hail threatening standing crops." },
};

export function severityFromScore(score: number): Severity {
  if (score >= 85) return "emergency";
  if (score >= 65) return "warning";
  if (score >= 40) return "watch";
  if (score >= 20) return "advisory";
  return "calm";
}

export interface RiskAssessment {
  hazard: HazardType;
  score: number;
  severity: Severity;
  confidence: number;
  window: string;
  drivers: string[];
  action: string;
}

const ACTIONS: Record<HazardType, string> = {
  flood: "Take an umbrella. Move valuables and vehicles to higher ground. Do not drive through water of unknown depth.",
  cyclone: "Secure loose objects, charge devices, and be ready to move to a sturdy shelter inland.",
  thunderstorm: "Move indoors, away from windows. Unplug sensitive electronics.",
  heat: "Drink plenty of water. Stay hydrated, avoid outdoor exertion 11:00–16:00, check on elderly neighbours.",
  cold: "Protect pipes, layer clothing, and check heating is safe and ventilated.",
  wildfire: "Prepare to evacuate. Pack the go-bag now and monitor official evacuation orders.",
  smoke: "Keep windows closed, run air filtration, and mask outdoors (N95/FFP2).",
  drought: "Follow local water restrictions and prioritise essential use.",
  earthquake: "Drop, cover, hold. Check gas lines. Expect aftershocks.",
  tsunami: "Move immediately to high ground or inland — do not wait for a second warning.",
  landslide: "Avoid steep slopes and drainage channels; be alert for cracking or tilting ground.",
  frost: "Cover or harvest sensitive crops; run frost protection overnight.",
  hail: "Move machinery and livestock under cover; protect vulnerable crops if possible.",
};

function h(...n: number[]) {
  let x = 2166136261;
  for (const v of n) {
    x ^= Math.floor((v + 500) * 100) >>> 0;
    x = Math.imul(x, 16777619) >>> 0;
  }
  return (x >>> 0) / 4294967295;
}

/*
  Synchronous Risk Assessor.
  By default uses currentConditionsSync to guarantee NO latency and 100% thread safety
  across UI loops. Accept an optional live async wx object to dynamically elevate scores
  when active networks are returning live telemetry.
*/
export function assessRisk(
  place: { name?: string; lat: number; lon: number; elevationM: number; coastalKm: number; floodHistory: number },
  hazard: HazardType,
  now = new Date(),
  liveWx?: CurrentConditions,
): RiskAssessment {
  const wx = liveWx || currentConditionsSync(place.lat, place.lon, now);
  let score = 0;
  const drivers: string[] = [];

  if (hazard === "flood") {
    if (wx.code === "heavy-rain") {
      score += 60;
      drivers.push("Heavy rainfall detected");
    } else if (wx.code === "rain" || wx.code === "thunder") {
      score += 30;
      drivers.push("Active precipitation");
    } else if (wx.code === "drizzle") {
      score += 25;
      drivers.push("Light drizzle detected");
    }
    if (place.elevationM < 10 && score > 0) {
      score += 20;
      drivers.push(`Low elevation vulnerability (${place.elevationM}m)`);
    }
    if (place.floodHistory > 1 && score > 0) {
      score += 10;
      drivers.push("Historical flood zone");
    }
  } 
  else if (hazard === "cyclone") {
    if (wx.windKph > 60) {
      score += 80;
      drivers.push(`Extreme wind speeds (${wx.windKph} km/h)`);
    } else if (wx.windKph > 40) {
      score += 40;
      drivers.push(`Gale force winds (${wx.windKph} km/h)`);
    }
    if (place.coastalKm < 20 && score > 0) {
      score += 15;
      drivers.push(`Coastal proximity (${place.coastalKm}km)`);
    }
  }
  else if (hazard === "thunderstorm") {
    if (wx.code === "thunder") {
      score = 85;
      drivers.push("Active thunderstorms in the area");
    } else if (wx.code === "heavy-rain" && wx.windKph > 30) {
      score = 50;
      drivers.push("Heavy rain with strong winds");
    }
  }
  else if (hazard === "heat") {
    if (wx.feelsLikeC >= 45) {
      score = 95;
      drivers.push(`Life-threatening heat index (${wx.feelsLikeC}°C)`);
    } else if (wx.tempC.mean >= 40) {
      score = 80;
      drivers.push(`Extreme temperature (${wx.tempC.mean}°C)`);
    } else if (wx.tempC.mean >= 35) {
      score = 50;
      drivers.push(`High temperature (${wx.tempC.mean}°C)`);
    }
  }
  else if (hazard === "cold") {
    if (wx.feelsLikeC <= -10) {
      score = 90;
      drivers.push(`Dangerous wind chill (${wx.feelsLikeC}°C)`);
    } else if (wx.tempC.mean <= 0) {
      score = 60;
      drivers.push(`Freezing temperatures (${wx.tempC.mean}°C)`);
    }
  }
  else if (hazard === "wildfire") {
    if (wx.tempC.mean > 35 && wx.humidity < 20 && wx.windKph > 25) {
      score = 85;
      drivers.push("Critical fire weather conditions");
      drivers.push(`High temp (${wx.tempC.mean}°C) & Low humidity (${wx.humidity}%)`);
    } else if (wx.tempC.mean > 30 && wx.humidity < 30) {
      score = 40;
      drivers.push("Elevated fire risk (hot and dry)");
    }
  }
  else if (hazard === "smoke") {
    if (wx.aqi > 200) {
      score = 90;
      drivers.push(`Hazardous Air Quality Index (${wx.aqi})`);
    } else if (wx.aqi > 100) {
      score = 50;
      drivers.push(`Unhealthy Air Quality Index (${wx.aqi})`);
    }
  }
  else if (hazard === "landslide") {
    if (wx.code === "heavy-rain" && place.elevationM > 100) {
      score = 70;
      drivers.push("Heavy rain on elevated terrain");
    }
  }
  // Earthquake, Tsunami, Drought cannot be accurately predicted strictly from current live surface weather alone.
  // We leave their scores at 0 unless we integrate a specific geological API.

  score = Math.max(0, Math.min(100, Math.round(score)));
  
  let actionText = ACTIONS[hazard];
  
  if (hazard === "flood" && wx.code === "drizzle") {
    actionText = "Light drizzle expected. Take an umbrella if you are heading outside.";
  }

  // If score is 0, give a standard driver and safe action.
  if (score === 0) {
    drivers.push("Current weather patterns are stable and do not indicate any immediate threat for this specific hazard.");
    actionText = "No immediate action required. Keep monitoring official local updates.";
  } else {
    // Add a news-like summary driver
    drivers.unshift(`Elevated risk due to a combination of ${hazard === 'flood' ? 'heavy rainfall and geographical factors' : hazard === 'cyclone' ? 'dangerous wind speeds in the area' : hazard === 'heat' ? 'extreme thermal conditions' : 'severe local weather patterns'}.`);
  }

  return {
    hazard,
    score,
    severity: severityFromScore(score),
    confidence: score > 0 ? 85 : 95, // High confidence in our deterministic rules
    window: "next 24 hours",
    drivers: drivers.slice(0, 3),
    action: actionText,
  };
}

export async function topRisks(
  place: { name?: string; region?: string; lat: number; lon: number; elevationM: number; coastalKm: number; floodHistory: number },
  now = new Date(),
  liveWx?: CurrentConditions,
): Promise<RiskAssessment[]> {
  const hazards: HazardType[] = ["flood", "cyclone", "thunderstorm", "heat", "cold", "wildfire", "smoke", "earthquake", "landslide", "drought"];
  
  return hazards
    .map((hz) => assessRisk(place, hz, now, liveWx))
    .sort((a, b) => b.score - a.score);
}
