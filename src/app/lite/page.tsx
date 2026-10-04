import { getAlerts, getPlaces, getResources } from "@/lib/data";
import { currentConditions, codeLabel, dirName } from "@/lib/wx";

export const dynamic = "force-dynamic";
export const metadata = { title: "AEGIS Lite — text-only emergency mode" };

const SEV_LABEL: Record<string, string> = { calm: "ALL CLEAR", advisory: "ADVISORY", watch: "WATCH", warning: "WARNING", emergency: "EMERGENCY" };

// Deliberately inline, no client JS, no images, no web fonts required.
export default async function Lite() {
  const [alerts, places, resources] = await Promise.all([getAlerts(), getPlaces(), getResources()]);
  const home = places[0];
  const c = home ? await currentConditions(home.lat, home.lon) : null;
  const box: React.CSSProperties = { border: "2px solid #000", padding: "10px 12px", margin: "10px 0" };

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif", lineHeight: 1.5, color: "#111", background: "#fff" }}>
      <div style={{ borderBottom: "3px solid #000", paddingBottom: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 22 }}>AEGIS · TEXT MODE</strong>
        <div style={{ fontSize: 13, color: "#444" }}>Near-zero-KB. No scripts, no images. Works on the weakest connection.</div>
      </div>

      <h2 style={{ fontSize: 16, margin: "12px 0 4px" }}>ACTIVE ALERTS ({alerts.length})</h2>
      {alerts.length === 0 && <p>No active alerts.</p>}
      {alerts.map((a) => (
        <div key={a.id} style={box}>
          <div style={{ fontWeight: 700 }}>[{SEV_LABEL[a.severity]}] {a.title}</div>
          <div style={{ fontSize: 13, color: "#333" }}>{a.area} — {a.source === "official" ? `OFFICIAL: ${a.sourceName}` : `PLATFORM-DERIVED: ${a.sourceName}`}</div>
          <p style={{ margin: "6px 0" }}>{a.headline}</p>
          <p style={{ margin: "6px 0", fontWeight: 700 }}>DO NOW: {a.instruction}</p>
          {a.sourceUrl && <a href={a.sourceUrl} style={{ fontSize: 13 }}>Official bulletin »</a>}
        </div>
      ))}

      {c && home && (
        <>
          <h2 style={{ fontSize: 16, margin: "16px 0 4px" }}>CONDITIONS · {home.name}</h2>
          <p>
            {Math.round(c.tempC.mean)}°C ({c.tempC.min}–{c.tempC.max}°C, {c.tempC.agreement}% agree), {codeLabel(c.code)}.
            Feels {Math.round(c.feelsLikeC)}°C. Wind {c.windKph} km/h {dirName(c.windDir)}. Humidity {c.humidity}%. AQI {c.aqi}.
          </p>
        </>
      )}

      <h2 style={{ fontSize: 16, margin: "16px 0 4px" }}>SHELTERS & RESOURCES</h2>
      <ul>
        {resources.map((r) => (
          <li key={r.id}>{r.name} ({r.kind}) — {r.status.toUpperCase()}{r.capacity ? ` ${r.occupancy}/${r.capacity}` : ""}{r.contact ? ` — ${r.contact}` : ""}</li>
        ))}
      </ul>

      <p style={{ marginTop: 16, fontSize: 13, color: "#444", borderTop: "1px solid #ccc", paddingTop: 8 }}>
        AEGIS interprets official data and never replaces an official warning. Emergency: dial your local number (India: 112 / disaster 1077).
        <br /><a href="/">Return to full app »</a>
      </p>
    </main>
  );
}
