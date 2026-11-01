"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui";
import { HazardIcon, IconArrow, IconChevron } from "@/components/icons";
import { HAZARD_META, type HazardType } from "@/lib/hazards";

type Item = {
  id: number;
  hazard: string;
  item: string;
  detail: string;
  done: boolean;
  sortOrder: number;
};

type AlertItem = {
  hazard: string;
  severity: string;
  title?: string;
  active?: boolean;
  expires?: string;
};

type PlaceInfo = {
  id: number;
  name: string;
  lat: number;
  lon: number;
  elevationM?: number;
  coastalKm?: number;
  floodHistory?: number;
};

type GuideDef = {
  hazard: HazardType;
  title?: string;
  when: string;
  steps: string[];
};

const GUIDES: GuideDef[] = [
  {
    hazard: "flood",
    when: "When heavy rainfall or a flood warning is active",
    steps: [
      "Move to the highest floor or higher ground immediately before water rises.",
      "Switch off mains electricity and gas valves if water begins entering the building.",
      "Never walk, swim, or drive through moving water — 15cm of current can knock you down.",
      "Keep your waterproof go-bag, essential medicines, and phone charged within reach.",
    ],
  },
  {
    hazard: "cyclone",
    when: "24–48 hours prior to anticipated coastal landfall",
    steps: [
      "Stock at least 3 days of potable water (3L/person/day) and ready-to-eat food rations.",
      "Secure or bring inside all outdoor furniture, loose zinc sheets, and unanchored items.",
      "Identify the strongest interior room away from exterior glass windows.",
      "Follow official IMD meteorological landfall advisories exclusively — tracks shift rapidly.",
    ],
  },
  {
    hazard: "landslide",
    when: "During prolonged monsoon downpours on slopes",
    steps: [
      "Listen for unusual sounds: cracking tree trunks, rolling boulders, or muddy runoff bursts.",
      "Evacuate early along pre-planned ridges; hillside roads fail first.",
      "Move perpendicular to the slope failure path if debris begins sliding.",
      "Do not return to structures until geological safety teams clear the slope.",
    ],
  },
  {
    hazard: "heat",
    when: "During severe heatwave or heat advisories",
    steps: [
      "Drink water and ORS proactively before feeling thirst; avoid dehydrating caffeine.",
      "Suspend outdoor manual exertion between 11:00 and 16:00 during peak thermal radiation.",
      "Check continuously on vulnerable elders, infants, and outdoor household workers.",
      "Recognize heat stroke emergencies: mental confusion, hot dry skin, cessation of sweating.",
    ],
  },
  {
    hazard: "cold",
    when: "During hard freeze warnings or sub-zero temperature drops",
    steps: [
      "Insulate exposed exterior plumbing and let indoor taps maintain a slow continuous drip.",
      "Dress in multiple synthetic or wool thermal layers; avoid wet cotton fabrics.",
      "Maintain at least 1 metre clearance between space heaters and combustible bedding or curtains.",
      "Ensure alternate room heating is well ventilated to prevent lethal carbon monoxide poisoning.",
    ],
  },
  {
    hazard: "thunderstorm",
    when: "When severe squall, lightning or thunderstorm warnings trigger",
    steps: [
      "When thunder roars, seek enclosed indoor shelter immediately; avoid solitary trees and fields.",
      "Disconnect expensive electronics and avoid using corded landline telephones or metal plumbing.",
      "Stay clear of windows, glass doors, and skylights vulnerable to microburst wind gusts.",
      "Wait a full 30 minutes following the last audible thunderclap before resuming outdoor work.",
    ],
  },
  {
    hazard: "smoke",
    title: "Air Quality & Smog",
    when: "During hazardous AQI spikes, crop burning or wildfire smog",
    steps: [
      "Seal exterior windows, exterior vents, and doors; operate HEPA air purifiers continuously.",
      "Wear a tightly fitted N95 or FFP2 respirator mask when transit outdoors is unavoidable.",
      "Strictly avoid strenuous cardiovascular workouts and outdoor athletic activities.",
      "Keep prescribed pulmonary inhalers, nebulizers, and bronchodilators within immediate reach.",
    ],
  },
];

function getGuidePriority(g: GuideDef, alerts: AlertItem[], places: PlaceInfo[]): { score: number; reason?: string } {
  let score = 0;
  let reason: string | undefined = undefined;

  // 1. Active alerts (highest urgency)
  const matchingAlert = alerts.find(
    (a) =>
      a.hazard === g.hazard &&
      a.active !== false &&
      (!a.expires || new Date(a.expires).getTime() > Date.now())
  );

  if (matchingAlert) {
    if (matchingAlert.severity === "emergency") {
      score += 1000;
      reason = "Emergency Alert Active";
    } else if (matchingAlert.severity === "warning") {
      score += 800;
      reason = "Warning Active";
    } else if (matchingAlert.severity === "watch") {
      score += 400;
      reason = "Watch Issued";
    } else {
      score += 200;
      reason = "Advisory Active";
    }
  }

  // 2. Household geography & terrain vulnerability
  for (const p of places) {
    const elev = p.elevationM ?? 0;
    const coast = p.coastalKm ?? 50;
    const floodHistory = p.floodHistory ?? 0;

    if (g.hazard === "landslide") {
      if (elev >= 1000) {
        score += 260;
        if (!reason) reason = `Alpine elevation (${elev}m)`;
      } else if (elev >= 500) {
        score += 140;
        if (!reason) reason = `Hilly terrain (${elev}m)`;
      }
    }

    if (g.hazard === "cold") {
      if (elev >= 1000) {
        score += 240;
        if (!reason) reason = `High altitude freeze risk (${elev}m)`;
      } else if (p.lat >= 28) {
        score += 110;
        if (!reason) reason = `North latitude winter zone`;
      }
    }

    if (g.hazard === "cyclone") {
      if (coast <= 40) {
        score += 280;
        if (!reason) reason = `Coastal zone (${Math.round(coast)}km to sea)`;
      } else if (coast <= 80) {
        score += 130;
        if (!reason) reason = `Near-coastal zone (${Math.round(coast)}km to sea)`;
      }
    }

    if (g.hazard === "flood") {
      if (floodHistory > 0) {
        score += 220;
        if (!reason) reason = `Prior flood history recorded`;
      } else if (elev <= 20) {
        score += 170;
        if (!reason) reason = `Low-elevation basin (${elev}m)`;
      }
    }

    if (g.hazard === "smoke") {
      if (p.lat >= 26 && p.lat <= 32 && coast > 200) {
        score += 90;
        if (!reason) reason = `Northern plains smog & AQI basin`;
      }
    }

    if (g.hazard === "heat") {
      if (elev < 400 && p.lat < 30) {
        score += 80;
        if (!reason) reason = `High seasonal heat index terrain`;
      }
    }

    if (g.hazard === "thunderstorm") {
      score += 60;
    }
  }

  return { score, reason };
}

/** Inline chevron to avoid import conflicts */
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export default function PreparePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [places, setPlaces] = useState<PlaceInfo[]>([]);
  const [userId, setUserId] = useState<number | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});
  const [hazardKitsOpen, setHazardKitsOpen] = useState(false);

  const load = async () => {
    // 1. Safe offline cache hydration
    try {
      const cachedItems = localStorage.getItem("aegis:offline_checklist");
      if (cachedItems) setItems(JSON.parse(cachedItems));
    } catch (e) {
      console.warn("Failed to parse cached checklist:", e);
    }

    try {
      const cachedAlerts = localStorage.getItem("aegis:offline_alerts");
      if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
    } catch (e) {
      console.warn("Failed to parse cached alerts:", e);
    }

    try {
      const cachedPlaces = localStorage.getItem("aegis:places");
      if (cachedPlaces) setPlaces(JSON.parse(cachedPlaces));
    } catch (e) {
      console.warn("Failed to parse cached places:", e);
    }

    // Try initial cached steps
    try {
      const savedSteps = localStorage.getItem("aegis:prepare_steps:guest");
      if (savedSteps) setCheckedSteps(JSON.parse(savedSteps));
    } catch {}

    // 2. Fetch fresh data with 6-second AbortController timeout & fallbacks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const [rChecklist, rAlerts, rPlaces] = await Promise.all([
        fetch("/api/checklist", { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : { checklist: [] }))
          .catch(() => ({ checklist: [] })),
        fetch("/api/alerts", { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : { alerts: [] }))
          .catch(() => ({ alerts: [] })),
        fetch("/api/places", { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : { places: [] }))
          .catch(() => ({ places: [] })),
      ]);

      clearTimeout(timeoutId);

      if (rChecklist.checklist) {
        setItems(rChecklist.checklist);
        try {
          localStorage.setItem("aegis:offline_checklist", JSON.stringify(rChecklist.checklist));
        } catch {}
      }

      if (rChecklist.userId) {
        const uid = Number(rChecklist.userId);
        setUserId(uid);
        try {
          const userSavedSteps = localStorage.getItem(`aegis:prepare_steps:${uid}`);
          if (userSavedSteps) {
            setCheckedSteps(JSON.parse(userSavedSteps));
          }
        } catch {}
      }

      if (rAlerts.alerts) {
        setAlerts(rAlerts.alerts);
        try {
          localStorage.setItem("aegis:offline_alerts", JSON.stringify(rAlerts.alerts));
        } catch {}
      }

      if (rPlaces.places) {
        setPlaces(rPlaces.places);
        try {
          localStorage.setItem("aegis:places", JSON.stringify(rPlaces.places));
        } catch {}
      }
    } catch (e) {
      console.warn("Network request failed or timed out; maintaining offline state:", e);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Toggle Go-bag checklist item
  const toggle = async (it: Item) => {
    const nextDone = !it.done;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, done: nextDone } : x)));

    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: it.id, done: nextDone }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checklist) {
          setItems(data.checklist);
          try {
            localStorage.setItem("aegis:offline_checklist", JSON.stringify(data.checklist));
          } catch {}
        }
      }
    } catch (err) {
      console.warn("Failed to sync checklist update with server:", err);
    }
  };

  // Toggle Hazard Guide step tick
  const toggleStep = (key: string) => {
    setCheckedSteps((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      const storageKey = userId ? `aegis:prepare_steps:${userId}` : "aegis:prepare_steps:guest";
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist guide step progress:", e);
      }
      return next;
    });
  };

  // Group Go-bag items by hazard
  const byHazard = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const it of items) (g[it.hazard] ??= []).push(it);
    return g;
  }, [items]);

  // Active warning/emergency hazards set (non-expired only)
  const activeHazards = useMemo(() => {
    return new Set(
      alerts
        .filter(
          (a) =>
            (a.severity === "warning" || a.severity === "emergency") &&
            a.active !== false &&
            (!a.expires || new Date(a.expires).getTime() > Date.now())
        )
        .map((a) => a.hazard)
    );
  }, [alerts]);

  // Whether we are in "calm mode" — no active warning/emergency alerts
  const isCalmMode = activeHazards.size === 0;

  // Hazard kits that have a matching active alert (for emergency promotion)
  const alertPromotedHazards = useMemo(() => {
    return Object.keys(byHazard).filter((hz) => hz !== "general" && activeHazards.has(hz));
  }, [byHazard, activeHazards]);

  // Remaining hazard kits not promoted
  const demotedHazards = useMemo(() => {
    const keys = Object.keys(byHazard).filter((hz) => hz !== "general" && !activeHazards.has(hz));
    return keys.sort((a, b) => {
      const scoreA = getGuidePriority({ hazard: a as HazardType, when: "", steps: [] }, alerts, places).score;
      const scoreB = getGuidePriority({ hazard: b as HazardType, when: "", steps: [] }, alerts, places).score;
      return scoreB - scoreA;
    });
  }, [byHazard, activeHazards, alerts, places]);

  // Dynamically prioritize hazard guides based on active alerts and household terrain
  const prioritizedGuides = useMemo(() => {
    return [...GUIDES]
      .map((g) => {
        const priority = getGuidePriority(g, alerts, places);
        const isActive = activeHazards.has(g.hazard);
        return { ...g, priority, isActive };
      })
      .sort((a, b) => b.priority.score - a.priority.score);
  }, [alerts, places, activeHazards]);

  // ── Readiness metric: calm mode → general essentials only; alert mode → general + active hazard items
  const generalItems = useMemo(() => byHazard["general"] ?? [], [byHazard]);

  const readinessItems = useMemo(() => {
    if (isCalmMode) return generalItems;
    const hazardItems = alertPromotedHazards.flatMap((hz) => byHazard[hz] ?? []);
    return [...generalItems, ...hazardItems];
  }, [isCalmMode, generalItems, alertPromotedHazards, byHazard]);

  const readinessDone = readinessItems.filter((x) => x.done).length;
  const readinessTotal = readinessItems.length;
  const readinessPct = readinessTotal > 0 ? Math.round((readinessDone / readinessTotal) * 100) : 0;

  // Kit card renderer (shared between calm & alert view)
  const renderKit = (hz: string, highlighted = false) => {
    const list = byHazard[hz] || [];
    const done = list.filter((x) => x.done).length;
    const pct = list.length > 0 ? Math.round((done / list.length) * 100) : 0;
    const title = hz === "general" ? "General Essentials" : (HAZARD_META[hz as HazardType]?.label ?? hz);
    const isAlertActive = activeHazards.has(hz);

    return (
      <Panel
        key={hz}
        className={[
          isAlertActive ? "border-live/60 shadow-md" : "",
          highlighted ? "ring-2 ring-live/30" : "",
        ].join(" ")}
      >
        <PanelHeader
          kicker={`Go-bag · ${done}/${list.length}`}
          title={title}
          right={
            <HazardIcon
              hazard={hz === "general" ? "smoke" : (hz as HazardType)}
              size={22}
              className={isAlertActive ? "text-live" : "text-ink-2"}
            />
          }
        />
        <div className="h-1 bg-surface-3">
          <div
            className="h-1 transition-all duration-300"
            style={{
              width: `${pct}%`,
              backgroundColor: pct === 100 ? "var(--calm)" : isAlertActive ? "var(--live)" : "var(--info)",
            }}
          />
        </div>
        <ul className="p-2 divide-y divide-line/40">
          {list.map((it) => (
            <li key={it.id}>
              <label className="flex cursor-pointer items-start gap-2.5 rounded-sm px-2 py-2 hover:bg-surface-2 transition-colors">
                <input
                  type="checkbox"
                  checked={it.done}
                  onChange={() => toggle(it)}
                  className="mt-1 h-4 w-4 rounded accent-[var(--calm)] cursor-pointer"
                />
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm leading-snug ${it.done ? "text-muted line-through" : "text-ink font-medium"}`}>
                    {it.item}
                  </span>
                  {it.detail && (
                    <span className="block mt-0.5 text-xs text-muted leading-tight">
                      {it.detail}
                    </span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>
    );
  };

  return (
    <div className="mx-auto max-w-5xl px-3 pt-4 pb-24 md:px-6 md:pt-6 md:pb-28">
      {/* Header */}
      <header className="mb-6">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Preparedness & Safety</div>
        <h1 className="display text-3xl">Prepare</h1>
        <p className="mt-1 text-sm text-muted">
          Pack the bag on a calm Sunday, not in the dark with water rising. Progress saves to your household.
        </p>
      </header>

      {/* ── CALM MODE BANNER ── */}
      {isCalmMode && items.length > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              No active hazard warnings — Standard readiness mode
            </div>
            <div className="text-xs text-muted mt-0.5">
              Focused on General Essentials (72-hour baseline). Disaster-specific kits will auto-promote when an active alert is detected.
            </div>
          </div>
        </div>
      )}

      {/* ── READINESS METRIC ── */}
      {readinessTotal > 0 && (
        <div className="mb-6 rounded-md border border-line bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider mono text-muted">Household Go-Bag Readiness</div>
            <div className="text-xl font-bold display mt-0.5">
              {readinessDone} of {readinessTotal}{" "}
              {isCalmMode
                ? "General Essentials packed"
                : `items packed (General + ${alertPromotedHazards.length} active hazard${alertPromotedHazards.length !== 1 ? "s" : ""})`}
            </div>
            <div className="text-xs text-muted mt-0.5">
              {isCalmMode
                ? `Standard household baseline · ${readinessTotal - readinessDone} remaining`
                : `Expanded scope: active hazard alert(s) detected`}
            </div>
          </div>
          <div className="w-full sm:w-64">
            <div className="h-2 w-full rounded-full bg-surface-3 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{
                  width: `${readinessPct}%`,
                  backgroundColor: readinessPct === 100 ? "var(--calm)" : readinessPct > 40 ? "var(--info)" : "var(--live)",
                }}
              />
            </div>
            <div className="mt-1 flex justify-between mono text-[11px] text-muted">
              <span>{readinessPct === 100 ? "✓ Fully Ready" : `${readinessTotal - readinessDone} remaining`}</span>
              <span>{readinessPct}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── GO-BAGS SECTION ── */}
      {Object.keys(byHazard).length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="display text-2xl">Emergency Go-Bags</h2>
            <span className="mono text-xs text-muted">
              {Object.keys(byHazard).length} Curated Kits
            </span>
          </div>

          {/* ── ALERT MODE: Promoted hazard kits appear first ── */}
          {!isCalmMode && alertPromotedHazards.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded bg-live px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Active Hazard Alert
                </span>
                <span className="text-xs text-muted">— prioritized kit{alertPromotedHazards.length !== 1 ? "s" : ""} promoted to top</span>
              </div>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {alertPromotedHazards.map((hz) => renderKit(hz, true))}
              </div>
            </div>
          )}

          {/* ── General Essentials (always prominently featured) ── */}
          {byHazard["general"] && (
            <div className={isCalmMode ? "mb-4" : "mb-4"}>
              {isCalmMode && (
                <div className="mb-2 mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  72-Hour Household Baseline
                </div>
              )}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {renderKit("general")}
              </div>
            </div>
          )}

          {/* ── Specific Hazard Kits: collapsible in calm mode, shown in alert mode ── */}
          {demotedHazards.length > 0 && (
            <div className="mt-2">
              {isCalmMode ? (
                <>
                  <button
                    onClick={() => setHazardKitsOpen((v) => !v)}
                    className="w-full flex items-center justify-between rounded-md border border-line bg-surface-2 px-4 py-3 text-sm font-medium text-ink hover:bg-surface-3 transition-colors cursor-pointer"
                    aria-expanded={hazardKitsOpen}
                  >
                    <span className="flex items-center gap-2">
                      <span className="mono text-[10px] uppercase tracking-widest text-muted">Specific Hazard Kits</span>
                      <span className="text-xs text-muted">({demotedHazards.length} kits — auto-activate on alert)</span>
                    </span>
                    <ChevronIcon open={hazardKitsOpen} />
                  </button>

                  {hazardKitsOpen && (
                    <div className="mt-3 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                      {demotedHazards.map((hz) => renderKit(hz))}
                    </div>
                  )}
                </>
              ) : (
                <div className="mt-4">
                  <div className="mb-2 mono text-[10px] uppercase tracking-[0.16em] text-muted">Other Preparedness Kits</div>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {demotedHazards.map((hz) => renderKit(hz))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Guides Section ── */}
      <div className="mt-10 mb-3 flex items-center justify-between">
        <div>
          <h2 className="display text-2xl">Hazard Guides</h2>
          <p className="text-xs text-muted">Dynamically prioritized by active alerts and your household terrain.</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
        {prioritizedGuides.map((g) => {
          const isActive = g.isActive;
          const label = g.title ?? HAZARD_META[g.hazard]?.label ?? g.hazard;

          return (
            <Panel
              key={g.hazard}
              className={`p-4 transition-shadow ${isActive ? "border-2 border-live shadow-md" : ""}`}
            >
              <div className="flex items-center gap-2">
                <HazardIcon
                  hazard={g.hazard}
                  size={22}
                  className={isActive ? "text-live" : "text-ink-2"}
                />
                <h3 className="display text-lg font-bold">{label}</h3>

                {isActive ? (
                  <span className="ml-auto inline-flex items-center gap-1 rounded bg-live text-white font-bold text-[10px] tracking-wider uppercase px-2 py-0.5 shadow-sm">
                    Active Alert
                  </span>
                ) : g.priority.reason ? (
                  <span className="ml-auto inline-flex items-center rounded bg-surface-3 text-ink text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 border border-line">
                    {g.priority.reason}
                  </span>
                ) : null}
              </div>

              <div className="mono mt-1 text-[11px] uppercase tracking-wide text-muted">
                {g.when}
              </div>

              {isActive ? (
                <ul className="mt-3 space-y-2">
                  {g.steps.map((s, i) => {
                    const key = `${g.hazard}-${i}`;
                    const isChecked = !!checkedSteps[key];
                    return (
                      <li key={i}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded p-1.5 hover:bg-surface-2 transition-colors">
                          <input
                            type="checkbox"
                            className="mt-0.5 h-4 w-4 rounded accent-live cursor-pointer"
                            checked={isChecked}
                            onChange={() => toggleStep(key)}
                          />
                          <span className={`text-sm leading-snug ${isChecked ? "text-muted line-through" : "text-ink font-medium"}`}>
                            {s}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ol className="mt-3 space-y-2">
                  {g.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink text-[11px] font-semibold mono">
                        {i + 1}
                      </span>
                      <span className="leading-snug pt-0.5 text-ink">{s}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          );
        })}
      </div>

      {/* Evacuation & Shelters Banner */}
      <Panel className="mt-8 flex items-center justify-between p-4">
        <div>
          <h3 className="display text-lg">Evacuation & Shelters</h3>
          <p className="text-sm text-muted">Find the nearest open shelter and a route that avoids warned areas.</p>
        </div>
        <Link
          href="/map"
          className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          style={{ color: "var(--info)" }}
        >
          Open map <IconArrow size={16} />
        </Link>
      </Panel>
    </div>
  );
}
