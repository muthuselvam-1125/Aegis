"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthWidget } from "@/components/AuthWidget";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconPin, IconMenu, IconClose, IconSun, IconMoon, IconAlertTri, HazardIcon,
} from "@/components/icons";
import { SeverityMark } from "@/components/ui";
import type { Severity, HazardType } from "@/lib/hazards";

type Prefs = { theme?: "auto" | "light" | "dark"; textScale?: number; reducedMotion?: boolean; lowBandwidth?: boolean; dir?: "ltr" | "rtl"; units?: "metric" | "imperial"; voiceAlerts?: boolean };

const NAV: { href: string; label: string; primary?: boolean }[] = [
  { href: "/", label: "Today", primary: true },
  { href: "/map", label: "Map", primary: true },
  { href: "/alerts", label: "Alerts", primary: true },
  { href: "/places", label: "Household", primary: true },
  { href: "/prepare", label: "Prepare" },
  { href: "/community", label: "Community" },
  { href: "/responder", label: "Responder" },
  { href: "/assistant", label: "Assistant" },
  { href: "/settings", label: "Settings" },
  { href: "/trust", label: "How it works" },
];

function readPrefs(): Prefs {
  try { return JSON.parse(localStorage.getItem("aegis:prefs") || "{}"); } catch { return {}; }
}
function writePrefs(p: Prefs) {
  localStorage.setItem("aegis:prefs", JSON.stringify(p));
}

export default function AppShell({ children, session }: { children: React.ReactNode; session?: any }) {
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [prefs, setPrefs] = useState<Prefs>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [banner, setBanner] = useState<{ severity: Severity; hazard: HazardType; title: string; area: string } | null>(null);
  const [tz, setTz] = useState<string | undefined>(undefined);

  useEffect(() => {
    setPrefs(readPrefs());
    setMounted(true);
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    
    const updateTz = () => {
      const stored = localStorage.getItem("aegis:tz");
      if (stored) setTz(stored);
    };
    updateTz();
    window.addEventListener("tz_change", updateTz);

    const updatePrefs = () => setPrefs(readPrefs());
    window.addEventListener("aegis:prefs_changed", updatePrefs);

    return () => { 
      clearInterval(t); 
      window.removeEventListener("online", on); 
      window.removeEventListener("offline", on); 
      window.removeEventListener("tz_change", updateTz);
      window.removeEventListener("aegis:prefs_changed", updatePrefs);
    };
  }, []);

  useEffect(() => {
    let live = true;
    fetch("/api/alerts").then((r) => r.json()).then((d) => {
      if (!live) return;
      const rank: Record<string, number> = { calm: 0, advisory: 1, watch: 2, warning: 3, emergency: 4 };
      const activeAlerts = (d.alerts || []).filter((a: any) => a.active === true && new Date(a.expires) > new Date());
      const top = activeAlerts.sort((a: { severity: Severity }, b: { severity: Severity }) => rank[b.severity] - rank[a.severity])[0];
      if (top && (top.severity === "warning" || top.severity === "emergency")) {
        setBanner({ severity: top.severity, hazard: top.hazard, title: top.title, area: top.area });
        
        const currentPrefs = readPrefs();
        if (currentPrefs.voiceAlerts && "speechSynthesis" in window) {
          const msg = new SpeechSynthesisUtterance(`${top.severity} alert: ${top.title} for ${top.area}`);
          window.speechSynthesis.speak(msg);
        }
      }
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  const apply = useCallback((next: Prefs) => {
    const merged = { ...readPrefs(), ...next };
    writePrefs(merged);
    setPrefs(merged);
    const d = document.documentElement;
    const dark = merged.theme === "dark" || (merged.theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    d.classList.toggle("dark", !!dark);
    if (merged.textScale) d.style.setProperty("--text-scale", String(merged.textScale));
    d.setAttribute("data-reduced-motion", merged.reducedMotion ? "true" : "false");
    if (merged.dir) d.setAttribute("dir", merged.dir);
  }, []);

  const isDark = mounted && (prefs.theme === "dark" || (prefs.theme !== "light" && window.matchMedia?.("(prefers-color-scheme: dark)").matches));
  const clock = now ? now.toLocaleTimeString(undefined, { timeZone: tz, hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }) : "--:--:--";

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[200px_1fr]">
      {/* Desktop rail */}
      <aside className="sticky top-0 z-40 hidden h-dvh flex-col border-r border-line bg-surface md:flex">
        <Link href="/" prefetch={false} className="flex items-center gap-2 border-b border-line px-4 py-4">
          <Beacon />
          <span className="display text-xl tracking-tight">AEGIS</span>
        </Link>
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                prefetch={false}
                className={`flex items-center gap-2 px-4 py-2 text-sm ${active ? "border-l-2 border-live bg-surface-2 font-semibold text-ink" : "border-l-2 border-transparent text-ink-2 hover:bg-surface-2"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* User Auth Info Widget */}
        <div className="border-t border-line p-2">
          <AuthWidget session={session} />
        </div>

        <a href="/lite" className="border-t border-line px-4 py-3 text-xs text-muted hover:text-ink">
          Low-bandwidth text mode →
        </a>
      </aside>

      <div className="flex min-h-dvh flex-col">
        {/* Status strip */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-3 py-1.5 backdrop-blur-[2px] md:px-4">
          <Link href="/" prefetch={false} className="flex items-center gap-2 md:hidden">
            <Beacon />
            <span className="display text-lg">AEGIS</span>
          </Link>
          <div className="mono flex items-center gap-3 text-[11px] text-muted">
            <span className="hidden sm:inline">{clock}</span>
            <span className="flex items-center gap-1">
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${online ? "bg-calm beacon" : "bg-warning"}`} />
              {online ? "LIVE" : "OFFLINE"}
            </span>
            <span className="hidden md:inline">data age 2m</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            {prefs.lowBandwidth && (
              <span className="mono rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-muted">DATA-SAVER</span>
            )}
            <button
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={() => apply({ theme: isDark ? "light" : "dark" })}
              className="rounded-sm p-1.5 text-ink-2 hover:bg-surface-2"
            >
              {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>
          </div>
        </header>

        {banner && (
          <Link
            href="/alerts"
            prefetch={false}
            className="flex items-center gap-3 px-3 py-2 md:px-4"
            style={{ backgroundColor: banner.severity === "emergency" ? "var(--emergency)" : banner.severity === "warning" ? "var(--warning)" : banner.severity === "watch" ? "var(--watch)" : "var(--advisory)", color: "#fff" }}
          >
            <SeverityMark severity={banner.severity} size={16} />
            <HazardIcon hazard={banner.hazard} size={18} />
            <span className="text-sm font-semibold uppercase tracking-wide">
              {banner.severity}
            </span>
            <span className="truncate text-sm">{banner.title} — {banner.area}</span>
            <span className="ml-auto hidden text-xs underline sm:inline">View →</span>
          </Link>
        )}

        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface md:hidden">
        {NAV.filter((n) => n.primary).map((n) => {
          const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
          return (
            <Link key={n.href} href={n.href} prefetch={false} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-ink" : "text-muted"}`}>
              {active && <span className="absolute top-0 h-0.5 w-8 bg-live" />}
              {n.label === "Household" ? "House" : n.label}
            </Link>
          );
        })}
        <button onClick={() => setMoreOpen(true)} className="flex flex-col items-center gap-0.5 py-2 text-[11px] text-muted">
          <IconMenu size={18} /> More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-lg border-t border-line bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <span className="display text-lg">Menu</span>
              <button aria-label="Close menu" onClick={() => setMoreOpen(false)}><IconClose size={22} /></button>
            </div>
            
            {/* User Account Info Widget in Mobile Drawer */}
            <div className="mb-3">
              <AuthWidget session={session} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {NAV.filter((n) => !n.primary).map((n) => (
                <Link key={n.href} href={n.href} prefetch={false} onClick={() => setMoreOpen(false)} className="rounded-sm border border-line bg-surface-2 px-3 py-3 text-sm">
                  {n.label}
                </Link>
              ))}
              <a href="/lite" className="col-span-2 rounded-sm border border-line px-3 py-3 text-sm text-muted">Low-bandwidth text mode →</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Beacon() {
  return (
    <span className="relative inline-flex h-6 w-6 items-center justify-center">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--line-strong)" strokeWidth="1" />
        <circle cx="12" cy="12" r="3" fill="var(--live)" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export { IconAlertTri };
