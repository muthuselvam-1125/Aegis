"use client";

import { useEffect, useState } from "react";
import { HazardIcon, IconCheck, IconClose } from "@/components/icons";
import { Panel, SeverityBadge, SourceTag, SeverityMark } from "@/components/ui";
import { HAZARD_META, SEVERITY_META, type Severity, type HazardType } from "@/lib/hazards";

type AlertT = {
  id: number; hazard: HazardType; severity: Severity; title: string; headline: string;
  instruction: string; area: string; source: "official" | "platform"; sourceName: string;
  sourceUrl: string; confidence: number; onset: string; expires: string; confirm: number; deny: number;
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [filter, setFilter] = useState<"all" | "official" | "platform">("all");
  const [busy, setBusy] = useState<number | null>(null);

  const load = () => fetch("/api/alerts").then((r) => r.json()).then((d) => setAlerts(d.alerts || []));
  useEffect(() => { load(); }, []);

  const vote = async (id: number, verdict: "confirm" | "deny") => {
    setBusy(id);
    await fetch(`/api/alerts/${id}/confirm`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ verdict }) });
    await load();
    setBusy(null);
  };

  const sorted = alerts
    .filter((a) => filter === "all" || a.source === filter)
    .filter((a) => new Date(a.expires) >= new Date())
    .slice()
    .sort((a, b) => SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank);

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Multi-hazard · your saved places</div>
        <h1 className="display text-3xl">Active alerts</h1>
        <p className="mt-1 text-sm text-muted">
          Official warnings and platform-derived guidance, clearly separated. Confirm or deny from the ground — consistent denials auto-downgrade derived alerts.
        </p>
      </header>

      <div className="mb-4 flex gap-2">
        {(["all", "official", "platform"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-sm border px-3 py-1.5 text-sm capitalize ${filter === f ? "border-line-strong bg-surface font-semibold" : "border-line bg-surface-2 text-ink-2"}`}>
            {f === "platform" ? "Platform-derived" : f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {sorted.map((a) => {
          const isEmergency = a.severity === "emergency" || a.severity === "warning";
          const tint = a.severity === "emergency" ? "var(--emergency)" : a.severity === "warning" ? "var(--warning)" : `var(--${a.severity})`;
          const total = a.confirm + a.deny;
          
          const now = new Date();
          const isExpired = new Date(a.expires) < now;

          return (
            <Panel key={a.id} className={`overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${isExpired ? "opacity-75" : "border-opacity-50"}`} as="article" style={{ borderColor: isExpired ? "var(--line)" : tint, boxShadow: !isExpired ? `0 4px 24px -10px ${tint}` : 'none' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ backgroundColor: isEmergency && !isExpired ? tint : `${tint}15`, borderColor: isEmergency && !isExpired ? "transparent" : `${tint}30`, color: isEmergency && !isExpired ? "#fff" : tint }}>
                <SeverityMark severity={a.severity} size={18} />
                <HazardIcon hazard={a.hazard} size={22} />
                <span className="text-sm font-bold uppercase tracking-widest">{SEVERITY_META[a.severity].label} · {HAZARD_META[a.hazard].label}</span>
                {isExpired && <span className="ml-2 rounded-full border border-line bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-muted uppercase tracking-wider shadow-sm">Expired</span>}
                <span className="mono ml-auto text-xs opacity-90 tracking-wide">{a.area}</span>
              </div>
              <div className="p-5 relative overflow-hidden">
                {/* Subtle background glow */}
                {!isExpired && <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-5 pointer-events-none" style={{ backgroundColor: tint }}></div>}
                
                <div className="mb-3 flex flex-wrap items-center gap-2 relative z-10">
                  {!isEmergency && <SeverityBadge severity={a.severity} size="sm" />}
                  <SourceTag source={a.source} name={a.sourceName} url={a.sourceUrl} />
                  <span className="mono text-[10px] uppercase font-semibold text-muted px-2 py-1 bg-surface-2 rounded-sm border border-line">Confidence {a.confidence}%</span>
                </div>
                
                <h2 className="display text-2xl font-bold tracking-tight mb-2 relative z-10">{a.title}</h2>
                <p className="text-base text-ink-2 leading-relaxed relative z-10">{a.headline}</p>

                <div className="mt-5 rounded-md p-4 relative z-10 overflow-hidden" style={{ backgroundColor: `${tint}08`, borderLeft: `4px solid ${isExpired ? "var(--line-strong)" : tint}` }}>
                  <div className="mono text-[10px] uppercase tracking-[0.2em] font-bold mb-1" style={{ color: isExpired ? "var(--muted)" : tint }}>Required Action</div>
                  <p className="text-sm font-medium leading-relaxed">{a.instruction}</p>
                </div>

                <div className="mono mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted border border-line-weak rounded-lg px-4 py-3 bg-surface-2 shadow-inner relative z-10">
                  <div className="flex flex-col">
                    <span className="uppercase text-[9px] font-bold tracking-widest opacity-60 mb-0.5">Alert Issued At</span>
                    <span>{new Date(a.onset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex flex-col ml-auto text-right">
                    <span className="uppercase text-[9px] font-bold tracking-widest opacity-60 mb-0.5">Date</span>
                    <span>{new Date(a.onset).toLocaleDateString()}</span>
                  </div>
                </div>

                {a.source === "official" && (
                  <a href={a.sourceUrl || "#"} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold hover:underline transition-all hover:gap-2 relative z-10" style={{ color: "var(--info)" }}>
                    Read the official bulletin — {a.sourceName} <span>→</span>
                  </a>
                )}
              </div>
            </Panel>
          );
        })}
        {sorted.length === 0 && <p className="text-sm text-muted">No active alerts for this filter.</p>}
      </div>
    </div>
  );
}
