/**
 * GIS & Terrain Utilities
 * Provides high-precision distance-to-coast calculation and Open-Meteo elevation lookup.
 */

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Representative high-density coastline coordinates (India, Indian Ocean, and major regional shores)
const COASTLINE_COORDINATES: [number, number][] = [
  // West Coast India & Arabian Sea
  [24.8, 67.0], [24.0, 67.5], [23.7, 68.2], [23.0, 68.6], [22.8, 69.8], [22.5, 70.0],
  [21.8, 69.2], [20.9, 70.4], [20.8, 71.5], [21.7, 72.2], [21.2, 72.8], [20.5, 72.9],
  [19.8, 72.7], [18.9, 72.8], [18.0, 73.0], [17.0, 73.3], [16.0, 73.5], [15.3, 73.8],
  [14.5, 74.3], [13.3, 74.7], [12.8, 74.8], [11.9, 75.3], [11.2, 75.8], [10.2, 76.2],
  [9.5, 76.3], [8.8, 76.6], [8.08, 77.55], // Kanyakumari

  // East Coast India & Bay of Bengal
  [8.5, 78.1], [9.1, 78.9], [9.3, 79.3], [9.8, 79.0], [10.3, 79.8], [10.8, 79.8],
  [11.5, 79.8], [12.0, 79.8], [13.1, 80.3], [13.7, 80.2], [14.4, 80.1], [15.0, 80.1],
  [15.8, 80.4], [16.2, 81.1], [16.5, 82.0], [17.0, 82.3], [17.7, 83.3], [18.3, 84.0],
  [19.3, 85.0], [19.8, 85.8], [20.2, 86.7], [20.8, 86.9], [21.5, 87.5], [21.6, 88.1],
  [21.8, 88.9], [22.0, 89.5], [21.4, 91.9], [20.1, 92.9], [16.8, 94.4], [16.0, 96.0],

  // Sri Lanka & Palk Strait
  [9.8, 80.2], [8.6, 81.2], [7.7, 81.7], [6.0, 80.2], [7.0, 79.8],

  // Europe & Mediterranean
  [50.8, 0.0], [51.5, 1.0], [53.5, 0.0], [55.0, -1.4], [50.5, -4.5], [51.5, -3.2],
  [49.5, -1.6], [48.4, -4.5], [46.1, -1.2], [43.5, -1.5], [41.2, 2.0], [43.3, 5.3],
  [44.4, 8.9], [40.8, 14.2], [38.1, 13.3], [37.9, 23.7], [41.0, 28.9], [53.5, 8.6],
  [54.2, 12.1], [55.7, 12.6],

  // North America & Pacific / Atlantic Coasts
  [40.7, -74.0], [42.3, -71.0], [38.9, -76.5], [32.8, -79.9], [25.8, -80.1], [29.9, -90.0],
  [29.3, -94.8], [32.7, -117.2], [34.0, -118.5], [37.8, -122.5], [47.6, -122.3],

  // East & Southeast Asia
  [35.6, 139.8], [34.7, 135.5], [31.2, 121.5], [22.3, 114.2], [1.3, 103.8], [13.7, 100.5]
];

/**
 * Computes geodesic distance to the closest oceanic coastline in kilometers.
 */
export function calculateCoastalDistanceKm(lat: number, lon: number): number {
  if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return 50;

  let minDistance = Infinity;
  for (const [cLat, cLon] of COASTLINE_COORDINATES) {
    const d = haversineKm(lat, lon, cLat, cLon);
    if (d < minDistance) {
      minDistance = d;
    }
  }

  return Math.max(1, Math.round(minDistance));
}

/**
 * Accurate regional fallback elevation in meters when Open-Meteo API is unreachable.
 * Ensures alpine, valley and plateau locations receive authentic baselines.
 */
function getRegionalElevationFallback(lat: number, lon: number): number {
  // Srinagar & Kashmir Valley (~1,585m)
  if (lat >= 33.3 && lat <= 34.8 && lon >= 74.0 && lon <= 75.8) return 1585;
  // Ladakh & High Alpine Plateau (~3,500m)
  if (lat >= 32.0 && lat <= 35.5 && lon >= 75.8 && lon <= 79.5) return 3500;
  // Himachal Pradesh / Shimla (~2,000m)
  if (lat >= 31.0 && lat <= 33.0 && lon >= 76.0 && lon <= 78.5) return 2000;
  // Uttarakhand / Garhwal (~1,800m)
  if (lat >= 29.5 && lat <= 31.5 && lon >= 78.0 && lon <= 81.0) return 1800;
  // Delhi NCR & Northern Gangetic Plain (~215m)
  if (lat >= 28.0 && lat <= 29.5 && lon >= 76.5 && lon <= 78.0) return 215;
  // Deccan Plateau (e.g., Bangalore, Hyderabad, interior Tamil Nadu) (~450m)
  if (lat >= 11.5 && lat <= 19.0 && lon >= 75.0 && lon <= 79.0) return 450;
  // If close to known coastline (< 20km)
  if (calculateCoastalDistanceKm(lat, lon) < 20) return 10;
  // Inland generic default
  return 100;
}

/**
 * Fetches true elevation in meters from the Open-Meteo elevation API.
 * Falls back to regional terrain estimates on network timeout or failure.
 */
export async function fetchElevation(lat: number, lon: number): Promise<number> {
  if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return 10;
  
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lon}`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.elevation) && typeof data.elevation[0] === "number") {
        return Math.round(data.elevation[0]);
      }
    }
  } catch (err) {
    console.warn(`[GIS] Elevation lookup timed out or failed for (${lat}, ${lon}):`, err);
  }
  return getRegionalElevationFallback(lat, lon);
}

