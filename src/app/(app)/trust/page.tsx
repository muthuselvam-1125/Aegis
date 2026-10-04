import { Panel, PanelHeader } from "@/components/ui";

export const metadata = { title: "How AEGIS works — Trust & data" };

export default function TrustPage() {
  const Section = ({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) => (
    <Panel className="mb-4">
      <PanelHeader kicker={kicker} title={title} />
      <div className="space-y-2 px-4 py-4 text-sm text-ink-2 [&_a]:underline [&_strong]:text-ink">{children}</div>
    </Panel>
  );
  return (
    <div className="mx-auto max-w-2xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Trust, data & governance</div>
        <h1 className="display text-3xl">How this works</h1>
        <p className="mt-1 text-sm text-muted">Written for a worried person, not an engineer. If you only read one line: <strong className="text-ink">we interpret official data and help you act on it — we never replace an official warning.</strong></p>
      </header>

      <Section kicker="Position" title="What AEGIS is (and isn't)">
        <p>AEGIS is an <strong>interpretation and action layer</strong> on top of official meteorological and disaster-management data. It turns bulletins and model output into plain language, a risk score, and a concrete next step.</p>
        <p>It is <strong>not</strong> an official authority. When an official agency issues a warning, that warning always outranks anything AEGIS derives. Every alert is labelled <strong>OFFICIAL</strong> or <strong>PLATFORM-DERIVED</strong> so you always know which you're looking at.</p>
      </Section>

      <Section kicker="Sources" title="Where the data comes from">
        <p>This platform is currently powered by the following live, global meteorological APIs:</p>
        <ul className="list-inside list-disc">
          <li><a href="https://open-meteo.com/" target="_blank" rel="noreferrer" style={{ color: "var(--info)" }}>Open-Meteo API</a> — Powers all live surface weather, ensemble forecasts, hourly predictions, and air quality (AQI) telemetry.</li>
          <li><a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer" style={{ color: "var(--info)" }}>NASA POWER</a> — Provides 30-year historical climate baselines to cross-check live data for anomalies.</li>
        </ul>
        <p>Whenever an official government agency (like the NDMA or local meteorology departments) issues a direct warning, those alerts are manually injected into the system as <strong>OFFICIAL</strong>, but our baseline risk generation relies on the APIs above.</p>
      </Section>

      <Section kicker="Method" title="Ensemble fusion & uncertainty">
        <p>Forecasts combine multiple models into a 12-member <strong>ensemble</strong>. We never show a single number as if it were certain — every reading carries a range and an <strong>agreement</strong> figure. Low agreement means the models disagree and you should treat the forecast with more caution.</p>
        <p>Risk scores combine model output with each place's own geography — elevation, distance to coast, and flood history — so your home and your grandmother's village are scored independently.</p>
      </Section>

      <Section kicker="Limits" title="What we can't tell you">
        <p>Nowcasting is only as good as the nearest radar. During infrastructure failure, data ages — the status bar always shows how old the reading is, and a <a href="/lite" style={{ color: "var(--info)" }}>near-zero-KB text mode</a> keeps working when everything else fails.</p>
      </Section>

      <Section kicker="Community" title="Ground-truth & misinformation">
        <p>People on the ground can confirm or deny any alert. Consistent denials automatically downgrade <em>platform-derived</em> alerts (never official ones). Community reports are always styled distinctly from official data and are never blended together as equally authoritative.</p>
      </Section>

      <Section kicker="Privacy" title="Your data">
        <p>Saved places and household check-ins are <strong>private to your household</strong>. Community reports are <strong>public</strong> under the name you choose. Responders see status and coordination notes — not private medical details. We don't sell your location.</p>
      </Section>
    </div>
  );
}
