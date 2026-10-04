"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui";
import { HazardIcon, IconArrow } from "@/components/icons";
import { HAZARD_META, type HazardType } from "@/lib/hazards";

type Item = { id: number; hazard: string; item: string; detail: string; done: boolean; sortOrder: number };

const GUIDES: { hazard: HazardType; when: string; steps: string[] }[] = [
  { hazard: "flood", when: "When heavy rain or a flood warning is issued", steps: ["Move to the highest floor or higher ground before water rises.", "Switch off mains electricity if water is entering.", "Never walk or drive through moving water — 15cm can knock you down.", "Keep your go-bag and phone charged and within reach."] },
  { hazard: "cyclone", when: "24–48h before landfall", steps: ["Stock 3 days of water and ready-to-eat food.", "Secure or bring inside anything the wind can lift.", "Identify the strongest small room, away from windows.", "Follow only official landfall timing — it changes."] },
  { hazard: "landslide", when: "During prolonged heavy rain on slopes", steps: ["Listen for unusual sounds — cracking trees, boulders.", "Move away from the base and path of slopes.", "Evacuate early; roads fail first.", "Do not return until authorities declare it safe."] },
  { hazard: "heat", when: "During a heat advisory", steps: ["Drink water before you feel thirsty.", "Avoid outdoor work 11:00–16:00.", "Check on elderly and outdoor workers.", "Know the signs of heat stroke: confusion, no sweat, hot skin."] },
];

export default function PreparePage() {
  const [items, setItems] = useState<Item[]>([]);
  const [alerts, setAlerts] = useState<{ hazard: string; severity: string; active?: boolean; expires?: string }[]>([]);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const load = async () => {
    // Try to load from offline cache first for instant display
    const cachedItems = localStorage.getItem("aegis:offline_checklist");
    if (cachedItems) setItems(JSON.parse(cachedItems));
    const cachedAlerts = localStorage.getItem("aegis:offline_alerts");
    if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));

    try {
      const [r1, r2] = await Promise.all([
        fetch("/api/checklist").then(r => r.json()),
        fetch("/api/alerts").then(r => r.json())
      ]);
      setItems(r1.checklist || []);
      setAlerts(r2.alerts || []);
      // Save for offline
      localStorage.setItem("aegis:offline_checklist", JSON.stringify(r1.checklist || []));
      localStorage.setItem("aegis:offline_alerts", JSON.stringify(r2.alerts || []));
    } catch (e) {
      console.warn("Offline mode active, using cached data.");
    }
  };
  useEffect(() => { load(); }, []);

  const toggle = async (it: Item) => {
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)));
    await fetch("/api/checklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: it.id, done: !it.done }) });
  };

  const byHazard = useMemo(() => {
    const g: Record<string, Item[]> = {};
    for (const it of items) (g[it.hazard] ??= []).push(it);
    return g;
  }, [items]);

  const activeHazards = new Set(alerts.filter(a => 
    (a.severity === "warning" || a.severity === "emergency") && 
    a.active !== false && 
    (!a.expires || new Date(a.expires).getTime() > Date.now())
  ).map((a) => a.hazard));

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Preparedness</div>
        <h1 className="display text-3xl">Prepare</h1>
        <p className="mt-1 text-sm text-muted">Pack the bag on a calm Sunday, not in the dark with water rising. Progress saves to your household.</p>
      </header>

      {/* Go-bags */}
      {Object.keys(byHazard).length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {Object.entries(byHazard).map(([hz, list]) => {
            const done = list.filter((x) => x.done).length;
            const pct = Math.round((done / list.length) * 100);
            return (
              <Panel key={hz}>
                <PanelHeader
                  kicker={`Go-bag · ${done}/${list.length}`}
                  title={HAZARD_META[hz as HazardType]?.label ?? hz}
                  right={<HazardIcon hazard={hz as HazardType} size={22} style={{ color: "var(--ink-2)" }} />}
                />
                <div className="h-1 bg-surface-3"><div className="h-1" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? "var(--calm)" : "var(--live)" }} /></div>
                <ul className="p-2">
                  {list.map((it) => (
                    <li key={it.id}>
                      <label className="flex cursor-pointer items-start gap-2.5 rounded-sm px-2 py-2 hover:bg-surface-2">
                        <input type="checkbox" checked={it.done} onChange={() => toggle(it)} className="mt-1 accent-[var(--calm)]" />
                        <span>
                          <span className={`block text-sm ${it.done ? "text-muted line-through" : "font-medium"}`}>{it.item}</span>
                          {it.detail && <span className="block text-xs text-muted">{it.detail}</span>}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </Panel>
            );
          })}
        </div>
      )}

      {/* Guides */}
      <h2 className="display mt-8 mb-3 text-2xl">Hazard guides</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {GUIDES.map((g) => {
          const isActive = activeHazards.has(g.hazard);
          return (
            <Panel key={g.hazard} className={`p-4 ${isActive ? "border-2" : ""}`} style={{ borderColor: isActive ? `var(--${g.hazard === "flood" || g.hazard === "cyclone" ? "info" : "warning"})` : undefined }}>
              <div className="flex items-center gap-2">
                <HazardIcon hazard={g.hazard} size={22} style={{ color: isActive ? "var(--live)" : "var(--ink-2)" }} />
                <h3 className="display text-lg">{HAZARD_META[g.hazard].label}</h3>
                {isActive && <span className="ml-auto rounded bg-live/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-live">Active Alert</span>}
              </div>
              <div className="mono mt-1 text-[11px] uppercase tracking-wide text-muted">{g.when}</div>
              {isActive ? (
                <ul className="mt-3 space-y-2">
                  {g.steps.map((s, i) => {
                    const key = `${g.hazard}-${i}`;
                    const isChecked = !!checkedSteps[key];
                    return (
                      <li key={i}>
                        <label className="flex cursor-pointer items-start gap-2.5 hover:opacity-80">
                          <input 
                            type="checkbox" 
                            className="mt-1 accent-live" 
                            checked={isChecked} 
                            onChange={() => setCheckedSteps(prev => ({ ...prev, [key]: !isChecked }))} 
                          />
                          <span className={`text-sm ${isChecked ? "text-muted line-through" : "font-medium"}`}>{s}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ol className="mt-2 space-y-1.5">
                  {g.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span className="mono text-muted">{i + 1}</span><span>{s}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          );
        })}
      </div>

      <Panel className="mt-6 flex items-center justify-between p-4">
        <div>
          <h3 className="display text-lg">Evacuation & shelters</h3>
          <p className="text-sm text-muted">Find the nearest open shelter and a route that avoids warned areas.</p>
        </div>
        <Link href="/map" className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--info)" }}>Open map <IconArrow size={16} /></Link>
      </Panel>
    </div>
  );
}
