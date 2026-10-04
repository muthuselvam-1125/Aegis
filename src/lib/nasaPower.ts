/*
  NASA POWER (Prediction Of Worldwide Energy Resources) climatology cross-check.
  Free, keyless, global REST endpoint — https://power.larc.nasa.gov/

  IMPORTANT: this is NOT a live forecast source. POWER's climatology endpoint
  returns multi-year MONTHLY AVERAGES for a coordinate, not today's weather.
  We use it only to sanity-check the live Open-Meteo reading against what's
  climatologically normal for this place and month — catching the kind of
  wild, implausible number a coordinate typo or bad geocode would produce.
  It never overrides or replaces the live forecast shown to the user.
*/

export type ClimateCheck = {
  available: boolean;
  monthAvgC?: number;
  diffC?: number;
  status: "consistent" | "unusual" | "unavailable";
};

async function fetchWithTimeout(url: string, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

const MONTH_KEYS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export async function crossCheckWithNasaPower(
  lat: number,
  lon: number,
  liveTempC: number,
  now = new Date()
): Promise<ClimateCheck> {
  try {
    const url = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M&community=AG&longitude=${lon}&latitude=${lat}&format=JSON`;
    const res = await fetchWithTimeout(url, 3000);
    if (!res.ok) throw new Error("NASA POWER request failed");

    const data = await res.json();
    const monthKey = MONTH_KEYS[now.getMonth()];
    const monthAvgC = data?.properties?.parameter?.T2M?.[monthKey];

    if (typeof monthAvgC !== "number") throw new Error("No climatology value returned");

    const diffC = Math.round((liveTempC - monthAvgC) * 10) / 10;
    // A live daily reading naturally swings well past a monthly average —
    // only flag a genuinely implausible gap, the kind a coordinate typo makes.
    const status: ClimateCheck["status"] = Math.abs(diffC) > 15 ? "unusual" : "consistent";

    return {
      available: true,
      monthAvgC: Math.round(monthAvgC * 10) / 10,
      diffC,
      status,
    };
  } catch {
    return { available: false, status: "unavailable" };
  }
}
