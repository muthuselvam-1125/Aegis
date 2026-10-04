"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHeader } from "@/components/ui";
import Link from "next/link";

type Prefs = { theme?: "auto" | "light" | "dark"; textScale?: number; reducedMotion?: boolean; lowBandwidth?: boolean; dir?: "ltr" | "rtl"; units?: "metric" | "imperial"; voiceAlerts?: boolean };

function read(): Prefs { try { return JSON.parse(localStorage.getItem("aegis:prefs") || "{}"); } catch { return {}; } }

export default function SettingsPage() {
  const [p, setP] = useState<Prefs>({});
  useEffect(() => { setP({ theme: "auto", textScale: 1, units: "metric", dir: "ltr", ...read() }); }, []);

  const update = (next: Prefs) => {
    const merged = { ...read(), ...next };
    localStorage.setItem("aegis:prefs", JSON.stringify(merged));
    setP(merged);
    const d = document.documentElement;
    const dark = merged.theme === "dark" || (merged.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    d.classList.toggle("dark", !!dark);
    if (merged.textScale) d.style.setProperty("--text-scale", String(merged.textScale));
    d.setAttribute("data-reduced-motion", merged.reducedMotion ? "true" : "false");
    if (merged.dir) d.setAttribute("dir", merged.dir);
    window.dispatchEvent(new Event("aegis:prefs_changed"));
  };

  const Row = ({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 last:border-0">
      <div><div className="font-medium">{title}</div>{desc && <div className="text-xs text-muted">{desc}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
  const seg = (val: string, opts: { v: string; l: string }[], on: (v: string) => void) => (
    <div className="flex overflow-hidden rounded-sm border border-line">
      {opts.map((o) => (
        <button key={o.v} onClick={() => on(o.v)} className={`px-3 py-1.5 text-sm ${val === o.v ? "bg-ink text-paper" : "bg-surface text-ink-2"}`}>{o.l}</button>
      ))}
    </div>
  );
  const toggle = (on: boolean, fn: (v: boolean) => void) => (
    <button role="switch" aria-checked={on} onClick={() => fn(!on)} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-calm" : "bg-surface-3"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );

  return (
    <div className="mx-auto max-w-2xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Preferences</div>
        <h1 className="display text-3xl">Settings</h1>
      </header>

      <Panel className="mb-4">
        <PanelHeader kicker="Display" title="Appearance & motion" />
        <Row title="Theme" desc="Light mode is built for bright outdoor sunlight.">{seg(p.theme ?? "auto", [{ v: "auto", l: "Auto" }, { v: "light", l: "Light" }, { v: "dark", l: "Dark" }], (v) => update({ theme: v as Prefs["theme"] }))}</Row>
        <Row title="Text size" desc="Independent of browser zoom.">{seg(String(p.textScale ?? 1), [{ v: "0.9", l: "S" }, { v: "1", l: "M" }, { v: "1.15", l: "L" }, { v: "1.3", l: "XL" }], (v) => update({ textScale: Number(v) }))}</Row>
        <Row title="Reduced motion" desc="Removes radar sweep, wind flow and all non-essential animation.">{toggle(!!p.reducedMotion, (v) => update({ reducedMotion: v }))}</Row>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader kicker="Accessibility" title="Access & alerts" />
        <Row title="Voice alert narration" desc="Reads critical alerts aloud — for low-vision use during emergencies.">{toggle(!!p.voiceAlerts, (v) => { update({ voiceAlerts: v }); if (v && "speechSynthesis" in window) speechSynthesis.speak(new SpeechSynthesisUtterance("Voice alerts are on.")); })}</Row>
        <Row title="Reading direction" desc="Right-to-left layout for RTL languages.">{seg(p.dir ?? "ltr", [{ v: "ltr", l: "LTR" }, { v: "rtl", l: "RTL" }], (v) => update({ dir: v as Prefs["dir"] }))}</Row>

      </Panel>

      <Panel className="mb-4">
        <PanelHeader kicker="Data & network" title="Units & bandwidth" />
        <Row title="Units">{seg(p.units ?? "metric", [{ v: "metric", l: "°C / km" }, { v: "imperial", l: "°F / mi" }], (v) => update({ units: v as Prefs["units"] }))}</Row>
        <Row title="Low-bandwidth mode" desc="Cuts heavy map layers and imagery. A no-JS text mirror is always at /lite.">{toggle(!!p.lowBandwidth, (v) => update({ lowBandwidth: v }))}</Row>
        <Row title="Notification channels" desc="Web Push (PWA) with SMS fallback where configured.">
          <Link href="/trust" className="text-sm underline" style={{ color: "var(--info)" }}>Manage →</Link>
        </Row>
      </Panel>

      <Panel>
        <PanelHeader kicker="Privacy" title="What's stored & shared" />
        <div className="px-4 py-3 text-sm text-ink-2">
          <p>Your saved places and household check-ins are private to your household and never shown publicly. Community reports you post are public and attributed to the name you choose. Location is used to score risk and is not sold. See the <a href="/trust" className="underline" style={{ color: "var(--info)" }}>trust page</a> for the full policy.</p>
        </div>
      </Panel>
    </div>
  );
}
