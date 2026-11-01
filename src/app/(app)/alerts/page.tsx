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

function ShieldCheckIcon({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [filter, setFilter] = useState<"all" | "official" | "platform">("all");
  const [showExpired, setShowExpired] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    return fetch("/api/alerts", { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error ${r.status}`);
        return r.json();
      })
      .then((d) => setAlerts(Array.isArray(d?.alerts) ? d.alerts : []))
      .catch((err) => {
        if (err?.name === "AbortError") {
          console.warn("[alerts] Request timed out after 8s");
        } else {
          console.error("Failed to load alerts:", err);
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const vote = async (id: number, verdict: "confirm" | "deny") => {
    setBusy(id);
    try {
      await fetch(`/api/alerts/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verdict }),
      });
      await load();
    } catch (err) {
      console.error("Voting failed:", err);
    } finally {
      setBusy(null);
    }
  };

  const sorted = alerts
    .filter((a) => filter === "all" || a.source === filter)
    .filter((a) => showExpired ? true : new Date(a.expires) >= new Date())
    .slice()
    .sort((a, b) => {
      const aExp = new Date(a.expires) < new Date();
      const bExp = new Date(b.expires) < new Date();
      if (aExp !== bExp) return aExp ? 1 : -1;
      return SEVERITY_META[b.severity].rank - SEVERITY_META[a.severity].rank;
    });

  return (
    <div className="mx-auto max-w-4xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Multi-hazard · your saved places</div>
        <h1 className="display text-3xl">Active alerts</h1>
        <p className="mt-1 text-sm text-muted">
          Official warnings and platform-derived guidance, clearly separated. Confirm or deny from the ground — consistent denials auto-downgrade derived alerts.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["all", "official", "platform"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-sm border px-3 py-1.5 text-sm capitalize transition-colors ${filter === f ? "border-line-strong bg-surface font-semibold text-ink" : "border-line bg-surface-2 text-ink-2 hover:text-ink"}`}>
              {f === "platform" ? "Platform-derived" : f}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowExpired(!showExpired)}
          className={`rounded-sm border px-3 py-1.5 text-xs transition-colors cursor-pointer ${showExpired ? "border-line-strong bg-surface font-semibold text-ink shadow-sm" : "border-line bg-surface-2 text-muted hover:text-ink"}`}
        >
          {showExpired ? "✓ Showing Expired (Past 24h)" : "+ Show Expired Alerts"}
        </button>
      </div>

      <div className="space-y-4">
        {loading && alerts.length === 0 ? (
          <div className="rounded-lg border border-line bg-surface p-8 text-center text-sm text-muted">
            <div className="animate-pulse">Loading live active weather alerts...</div>
          </div>
        ) : sorted.map((a) => {
          const isEmergency = a.severity === "emergency" || a.severity === "warning";
          const tint = a.severity === "emergency" ? "var(--emergency)" : a.severity === "warning" ? "var(--warning)" : `var(--${a.severity})`;
          const total = (a.confirm || 0) + (a.deny || 0);
          
          const now = new Date();
          const isExpired = new Date(a.expires) < now;

          return (
            <Panel key={a.id} className={`overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-lg ${isExpired ? "opacity-75" : "border-opacity-50"}`} as="article" style={{ borderColor: isExpired ? "var(--line)" : tint, boxShadow: !isExpired ? `0 4px 24px -10px ${tint}` : 'none' }}>
              <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ backgroundColor: isEmergency && !isExpired ? tint : `${tint}15`, borderColor: isEmergency && !isExpired ? "transparent" : `${tint}30`, color: isEmergency && !isExpired ? "#fff" : tint }}>
                <SeverityMark severity={a.severity} size={18} />
                <HazardIcon hazard={a.hazard} size={22} />
                <span className="text-sm font-bold uppercase tracking-widest shrink-0">{SEVERITY_META[a.severity].label} · {HAZARD_META[a.hazard].label}</span>
                {isExpired && <span className="ml-1 rounded-full border border-line bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-muted uppercase tracking-wider shadow-sm shrink-0">Expired</span>}
                <span className="mono ml-auto text-xs opacity-90 tracking-wide max-w-[200px] truncate text-right" title={a.area}>{a.area}</span>
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

                <div className="mono mt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-xs text-muted border border-line-weak rounded-lg px-4 py-3 bg-surface-2 shadow-inner relative z-10">
                  <div className="flex flex-col">
                    <span className="uppercase text-[9px] font-bold tracking-widest opacity-60 mb-0.5">Alert Issued At</span>
                    <span>{new Date(a.onset).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="uppercase text-[9px] font-bold tracking-widest opacity-60 mb-0.5">Valid Until</span>
                    <span>{new Date(a.expires).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="flex flex-col ml-auto text-right">
                    <span className="uppercase text-[9px] font-bold tracking-widest opacity-60 mb-0.5">Date</span>
                    <span>{new Date(a.onset).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Ground-truth verification buttons */}
                <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-ink-2">Ground check:</span>
                    <button
                      onClick={() => vote(a.id, "confirm")}
                      disabled={busy === a.id || isExpired}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-emerald-600/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Confirm alert conditions observed on the ground"
                    >
                      <IconCheck size={14} />
                      Confirm ({a.confirm || 0})
                    </button>
                    <button
                      onClick={() => vote(a.id, "deny")}
                      disabled={busy === a.id || isExpired}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-rose-600/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      title="Deny alert conditions (weather is clear / not observed)"
                    >
                      <IconClose size={14} />
                      Deny ({a.deny || 0})
                    </button>
                  </div>
                  {total > 0 && (
                    <span className="text-[11px] text-muted mono">
                      {total} ground {total === 1 ? "report" : "reports"} ({Math.round(((a.confirm || 0) / total) * 100)}% confirmed)
                    </span>
                  )}
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

        {!loading && sorted.length === 0 && (
          <Panel className="relative overflow-hidden border-emerald-500/30 bg-surface p-8 text-center sm:p-12 shadow-sm">
            {/* Ambient emerald status glow */}
            <div
              className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-64 w-96 rounded-full bg-emerald-500/10 blur-3xl"
              aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col items-center">
              {/* Dedicated status container with emerald shield checkmark */}
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ring-8 ring-emerald-500/5 shadow-inner">
                <ShieldCheckIcon size={32} />
              </div>

              <div className="mono mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational · All Clear
              </div>

              <h2 className="display text-2xl font-bold tracking-tight text-ink sm:text-3xl mb-2">
                All Monitored Zones Normal
              </h2>

              <p className="max-w-xl text-sm text-muted leading-relaxed mb-6">
                All Monitored Zones Normal — No active emergency warnings or watches detected for your saved locations.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => setShowExpired(!showExpired)}
                  className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                    showExpired
                      ? "border-line-strong bg-surface font-semibold text-ink shadow-sm"
                      : "border-line bg-surface-2 text-ink hover:bg-surface-3 hover:text-ink"
                  }`}
                >
                  {showExpired ? "✓ Showing Expired (Past 24h)" : "+ Show Expired Alerts"}
                </button>
                {filter !== "all" && (
                  <button
                    onClick={() => setFilter("all")}
                    className="inline-flex items-center gap-2 rounded-sm border border-line-weak px-3 py-2 text-xs font-medium text-muted hover:text-ink transition-colors cursor-pointer"
                  >
                    Reset Filter ({filter})
                  </button>
                )}
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
