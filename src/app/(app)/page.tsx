"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";
import { WxIcon, HazardIcon, IconArrow } from "@/components/icons";
import { Panel, PanelHeader, SeverityBadge, AgreementMeter, SourceTag, SeverityMark } from "@/components/ui";
import { SEVERITY_META, HAZARD_META, type Severity, type HazardType } from "@/lib/hazards";
import { dirName, aqiCategory, codeLabel, type WxCode, type ClimateProjection } from "@/lib/wx";
import { LiveGauge } from "@/components/LiveGauge";
import { type ClimateCheck } from "@/lib/nasaPower";
import { LocationSetupModal } from "@/components/LocationSetupModal";
import { NewsTicker } from "@/components/NewsTicker";

export function useUnits() {
  const [isImp, setIsImp] = useState(false);
  useEffect(() => {
    const update = () => { try { setIsImp(JSON.parse(localStorage.getItem("aegis:prefs")||"{}").units==="imperial") } catch {} };
    update();
    window.addEventListener("aegis:prefs_changed", update);
    return () => window.removeEventListener("aegis:prefs_changed", update);
  }, []);
  return {
    isImp,
    tc: (c: number) => isImp ? c * 9/5 + 32 : c,
    tu: isImp ? "°F" : "°C",
    wc: (k: number) => isImp ? k * 0.621371 : k,
    wu: isImp ? "mph" : "km/h",
    vc: (k: number) => isImp ? k * 0.621371 : k,
    vu: isImp ? "mi" : "km"
  };
}

type Ensemble = { mean: number; min: number; max: number; agreement: number };
type Cur = {
  tempC: Ensemble; feelsLikeC: number; humidity: number; dewPointC: number; pressureHpa: number;
  pressureTrend: string; visibilityKm: number; windKph: number; windDir: number; gustKph: number;
  uvIndex: number; code: WxCode; precipitationMm?: number; rainMm?: number; precipProb?: number;
  aqi: number; pm25: number; pm10: number; pollen: string; observedAt: string; timezone: string;
};
type Hour = { time: string; tempC: number; precipMm: number; precipProb: number; windKph: number; code: WxCode };
type Day = { date: string; hiC: number; loC: number; precipProb: number; precipMm: number; code: WxCode; agreement: number };
type Risk = { hazard: HazardType; score: number; severity: Severity; confidence: number; window: string; drivers: string[]; action: string };
type Place = { id: number; name: string; label: string; region: string; authority: string; authorityUrl: string; lat: number; lon: number };
type Sun = { sunriseHour: number; sunsetHour: number; dayLengthHours: number; moonName: string; moonPhase: number };
type Forecast = { place: Place; current: Cur; hourly: Hour[]; daily: Day[]; nowcast: { minute: number; mmPerHr: number }[]; sun: Sun; risks: Risk[]; climate: ClimateProjection[]; climateCheck?: ClimateCheck };
type AlertT = { id: number; hazard: HazardType; severity: Severity; title: string; headline: string; instruction: string; area: string; placeId: number; source: "official" | "platform"; sourceName: string; sourceUrl: string; confidence: number; expires: string; active?: boolean };

const fmtHour = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;

export default function Today() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [placeId, setPlaceId] = useState<number | null>(null);
  const [fc, setFc] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const u = useUnits();

  const loadPlaces = () => {
    fetch("/api/places", { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        const userPlaces = d.places || [];
        setPlaces(userPlaces);
        const needsSetup = typeof window !== "undefined" && localStorage.getItem("aegis:location_setup_needed") === "true";
        if (userPlaces.length === 0 || needsSetup) {
          setShowLocationModal(true);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/checkin", { cache: 'no-store' }).then((r) => r.json()).then((d) => setMembers(d.members || []));
    fetch("/api/alerts", { cache: 'no-store' }).then((r) => r.json()).then((d) => setAlerts(d.alerts || []));
    loadPlaces();
  }, []);
  useEffect(() => {
    const url = placeId ? `/api/forecast?place=${placeId}` : "/api/forecast";
    fetch(url)
      .then((r) => r.json())
      .then((d: any) => {
        if (d.error) {
          console.error("API Error:", d.error);
          setError(d.error);
          return;
        }
        setError(null);
        setFc(d);
        if (!placeId && d.place) setPlaceId(d.place.id);
      })
      .catch((err) => console.error("Fetch failed:", err));
  }, [placeId]);

  useEffect(() => {
    if (fc?.current?.timezone) {
      localStorage.setItem("aegis:tz", fc.current.timezone);
      window.dispatchEvent(new Event("tz_change"));
    }
  }, [fc?.current?.timezone]);

  const localAlerts = useMemo(() => alerts.filter((a) => a.placeId === placeId && a.active && new Date(a.expires) > new Date()), [alerts, placeId]);
  const topAlert = useMemo(() => {
    const rank = SEVERITY_META;
    return localAlerts.slice().sort((a, b) => rank[b.severity].rank - rank[a.severity].rank)[0];
  }, [localAlerts]);

  if (error === "No configured locations available") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="mb-4 text-4xl">🌍</div>
        <h2 className="display text-3xl mb-3">Set Your Home Location</h2>
        <p className="text-muted mb-8 max-w-sm mx-auto">Please select your home city so we can load live weather telemetry, AI forecasts, and emergency warnings for your region.</p>
        <button
          onClick={() => setShowLocationModal(true)}
          className="rounded-xl bg-live px-6 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110 transition-all flex items-center gap-2"
        >
          📍 Set Home Location
        </button>
        <LocationSetupModal
          isOpen={showLocationModal}
          onSuccess={(newPlace) => {
            setShowLocationModal(false);
            loadPlaces();
            if (newPlace?.id) setPlaceId(newPlace.id);
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center mt-20">
        <div className="text-emergency mb-2">⚠ Error loading dashboard</div>
        <div className="mono text-sm text-muted">{error}</div>
      </div>
    );
  }

  if (!fc) {
    return (
      <div className="p-6">
        <div className="mono text-sm text-muted animate-pulse">Acquiring live meteorological instruments...</div>
      </div>
    );
  }

  const c = fc.current;
  const now = new Date();
  const isNight = now.getHours() < fc.sun.sunriseHour || now.getHours() > fc.sun.sunsetHour;
  const heroHazardMode = topAlert && (topAlert.severity === "warning" || topAlert.severity === "emergency");

  return (
    <div className="mx-auto max-w-6xl px-3 py-4 md:px-6 md:py-6">
      {/* News Ticker Bar */}
      <NewsTicker places={places.length > 0 ? places : [fc.place]} activePlaceId={placeId} />

      {/* Place selector */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto scroll-thin pb-1">
        {places.map((p) => {
          const active = p.id === placeId;
          const pa = alerts.filter((a) => a.placeId === p.id && a.active && new Date(a.expires) > new Date()).sort((x, y) => SEVERITY_META[y.severity].rank - SEVERITY_META[x.severity].rank)[0];
          const placeMembers = members.filter(m => m.placeId === p.id);
          return (
            <button
              key={p.id}
              onClick={() => setPlaceId(p.id)}
              className={`flex shrink-0 items-center gap-2 rounded-sm border px-3 py-1.5 text-sm ${active ? "border-line-strong bg-surface font-semibold" : "border-line bg-surface-2 text-ink-2"}`}
            >
              {pa && <SeverityMark severity={pa.severity} size={12} />}
              <span>{p.name.split(" — ")[0]}</span>
              <span className="mono text-[10px] uppercase text-muted">{p.label}</span>
              {placeMembers.length > 0 && (
                <span className="mono text-[10px] text-muted pl-1 border-l border-line ml-1">
                  👥 {placeMembers.map(m => m.name.split(' ')[0]).join(", ")}
                </span>
              )}
            </button>
          );
        })}
        <Link href="/places" className="shrink-0 rounded-sm border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">+ Add</Link>
      </div>

      {/* HERO — either the dominant hazard, or the current condition */}
      {heroHazardMode ? (
        <HeroHazard alert={topAlert!} place={fc.place} />
      ) : (
        <HeroCondition c={c} place={fc.place} isNight={isNight} sun={fc.sun} />
      )}

      {/* Secondary alerts (if hazard hero shown, still surface current temp compactly) */}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {heroHazardMode && (
          <Panel className="md:col-span-1">
            <div className="p-4">
              <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted">Current</div>
              <div className="flex items-end gap-3">
                <span className="display text-5xl">{Math.round(u.tc(c.tempC.mean))}°</span>
                <div className="pb-1 text-sm text-muted">
                  <div>{codeLabel(c.code)}</div>
                  <div className="mono text-xs">feels {Math.round(u.tc(c.feelsLikeC))}°</div>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Live gauge fed by SSE */}
        <LiveGauge className={heroHazardMode ? "md:col-span-2" : "md:col-span-1"} />

        {/* Solar Tracking */}
        <SunMoonTracker sun={fc.sun} timezone={c.timezone} className={heroHazardMode ? "md:col-span-3" : "md:col-span-2"} />
      </div>

      {/* Hourly strip */}
      <Panel className="mt-4">
        <PanelHeader kicker="Next 24 hours" title="Hourly" right={<AgreementMeter value={c.tempC.agreement} />} />
        <HourlyStrip hours={fc.hourly} timezone={c.timezone} />
      </Panel>

      {/* Real-time Climate Change Future Projections */}
      <Panel className="mt-4 overflow-hidden border-2 border-dashed border-line">
        <PanelHeader kicker="Long-term prediction" title="Future Climate Risk (Next 30-60 Years)" right={<span className="mono text-[10px] text-muted">Scientific Data</span>} />
        <div className="grid gap-4 p-4 md:grid-cols-2">
          {/* Best Case Scenario */}
          <div className="rounded border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <div className="mono text-xs uppercase tracking-wider text-calm font-bold">Best Case Scenario</div>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">If the world actively reduces pollution, plants more trees, and switches to clean energy.</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="mono text-[10px] text-muted uppercase">Extra Heat by 2050</div>
                <div className="display text-2xl text-calm">+{fc.climate.find(x => x.scenario === "ssp126" && x.year === 2050)?.tempAnomalyC.toFixed(1)}°C</div>
              </div>
              <div>
                <div className="mono text-[10px] text-muted uppercase">Extreme Heat (Over 35°C)</div>
                <div className="display text-2xl text-calm">{fc.climate.find(x => x.scenario === "ssp126" && x.year === 2050)?.extremeHeatDays} days/yr</div>
              </div>
            </div>
          </div>
          
          {/* Worst Case Scenario */}
          <div className="rounded border border-line bg-surface-2 p-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏭</span>
              <div className="mono text-xs uppercase tracking-wider text-emergency font-bold">Worst Case Scenario</div>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">If we continue cutting trees and producing heavy pollution without any limits.</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <div className="mono text-[10px] text-muted uppercase">Extra Heat by 2085</div>
                <div className="display text-2xl text-emergency">+{fc.climate.find(x => x.scenario === "ssp585" && x.year === 2085)?.tempAnomalyC.toFixed(1)}°C</div>
              </div>
              <div>
                <div className="mono text-[10px] text-muted uppercase">Extreme Heat (Over 35°C)</div>
                <div className="display text-2xl text-emergency">{fc.climate.find(x => x.scenario === "ssp585" && x.year === 2085)?.extremeHeatDays} days/yr</div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-line bg-surface-2 px-4 py-3 text-xs text-muted">
          These predictions show how this location will be affected by global warming in the future.
        </div>
      </Panel>

      {/* Risk board + details */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <Panel>
          <PanelHeader kicker="Multi-hazard" title="Risk board" right={<span className="mono text-[10px] text-muted">per {fc.place.name.split(" — ")[0]}</span>} />
          <ul className="divide-y divide-line">
            {fc.risks.slice(0, 5).map((r) => (
              <RiskRow key={r.hazard} r={r} authority={fc.place.authority} authorityUrl={fc.place.authorityUrl} />
            ))}
          </ul>
          <div className="border-t border-line px-4 py-2 text-xs text-muted">
            Scores are platform-derived guidance. Always defer to{" "}
            <a href={fc.place.authorityUrl} target="_blank" rel="noreferrer" className="underline" style={{ color: "var(--info)" }}>{fc.place.authority}</a>.
          </div>
        </Panel>

        <Panel>
          <PanelHeader kicker="Instruments" title="Conditions" />
          <div className="grid grid-cols-2 gap-x-6 px-4 py-1">
            <Detail label="Feels like" value={`${Math.round(u.tc(c.feelsLikeC))}°`} />
            <Detail label="Humidity" value={`${c.humidity}%`} />
            <Detail label="Dew point" value={`${Math.round(u.tc(c.dewPointC))}°`} />
            <Detail label="Pressure" value={`${c.pressureHpa}`} unit={`hPa ${c.pressureTrend === "rising" ? "↑" : c.pressureTrend === "falling" ? "↓" : "→"}`} />
            <Detail label="Visibility" value={`${Math.round(u.vc(c.visibilityKm))}`} unit={u.vu} />
            <Detail label="UV index" value={`${c.uvIndex}`} />
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-4 border-t border-line px-4 py-3">
            <WindCompass deg={c.windDir} />
            <div>
              <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted">Wind</div>
              <div className="display text-2xl">{Math.round(u.wc(c.windKph))} <span className="text-base text-muted">{u.wu} {dirName(c.windDir)}</span></div>
              <div className="mono text-xs text-muted">gusting {Math.round(u.wc(c.gustKph))} {u.wu}</div>
            </div>
          </div>
          <AqiRow aqi={c.aqi} pm25={c.pm25} pm10={c.pm10} pollen={c.pollen} />
          <SunRow sun={fc.sun} />
          <NasaCrossCheckRow check={fc.climateCheck} />
        </Panel>
      </div>

      {/* Daily */}
      <Panel className="mt-4">
        <PanelHeader kicker="Next 7 days" title="Daily Forecast" />
        <DailyList days={fc.daily.slice(0, 7)} />
      </Panel>

      <p className="mt-6 text-center text-xs text-muted">
        AEGIS interprets official and model data. It never replaces an official warning.{" "}
        <Link href="/trust" className="underline" style={{ color: "var(--info)" }}>How this works →</Link>
      </p>

      <LocationSetupModal
        isOpen={showLocationModal}
        onSuccess={(newPlace) => {
          setShowLocationModal(false);
          loadPlaces();
          if (newPlace?.id) setPlaceId(newPlace.id);
        }}
        onClose={places.length > 0 ? () => setShowLocationModal(false) : undefined}
      />
    </div>
  );
}

function HeroCondition({ c, place, isNight, sun }: { c: Cur; place: Place; isNight: boolean; sun: Sun }) {
  const u = useUnits();
  
  let bgGradient = "";
  let glowColor = "";
  let borderColor = "";
  let isRain = false;

  if (c.code === "rain" || c.code === "heavy-rain" || c.code === "drizzle" || c.code === "sleet") {
    bgGradient = "linear-gradient(135deg, #111a2e 0%, #1c2738 60%, #0b0f19 100%)";
    borderColor = "rgba(56, 189, 248, 0.2)";
    glowColor = "rgba(56, 189, 248, 0.15)";
    isRain = true;
  } else if (c.code === "thunder") {
    bgGradient = "linear-gradient(135deg, #19142b 0%, #1f1b36 60%, #0d0f17 100%)";
    borderColor = "rgba(139, 92, 246, 0.2)";
    glowColor = "rgba(139, 92, 246, 0.15)";
  } else if (c.code === "clear" || c.code === "partly") {
    bgGradient = "linear-gradient(135deg, #2a1f1a 0%, #221c1f 60%, #151214 100%)";
    borderColor = "rgba(251, 146, 60, 0.1)";
    glowColor = "rgba(251, 146, 60, 0.1)";
  } else {
    // Default / Cloudy
    bgGradient = "linear-gradient(135deg, #16181d 0%, #1e2028 60%, #0f1115 100%)";
    borderColor = "rgba(255, 255, 255, 0.05)";
    glowColor = "rgba(255, 255, 255, 0.05)";
  }

  return (
    <Panel className="relative overflow-hidden" style={{ background: bgGradient, borderColor: borderColor, borderWidth: borderColor ? '1px' : undefined }}>
      <div className="relative z-10 grid gap-0 md:grid-cols-[1.3fr_1fr]">
        <div className="p-5 md:p-7">
          <div className="mono text-[11px] uppercase tracking-[0.18em] text-muted">
            {place.name} · {place.region}
          </div>
          <div className="mt-2 flex items-start gap-4">
            <div>
              <div className="display leading-[0.9]" style={{ fontSize: "clamp(4.5rem, 16vw, 8rem)" }}>
                {Math.round(u.tc(c.tempC.mean))}°
              </div>
              <div className="mono mt-1 text-sm text-muted">
                {Math.round(u.tc(c.tempC.min))}° / {Math.round(u.tc(c.tempC.max))}° ensemble · feels {Math.round(u.tc(c.feelsLikeC))}°
              </div>
            </div>
            <div className="relative mt-3 shrink-0">
              <div className="absolute inset-0 blur-[28px] rounded-full" style={{ background: glowColor, transform: 'scale(1.5)' }} />
              <WxIcon code={c.code} size={64} style={{ color: "var(--ink)" }} className="relative z-10 drop-shadow-md" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="display text-2xl">{codeLabel(c.code)}</span>
            <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2.5 py-1 border border-white/[0.08]">
              <span className="mono text-[11px] text-muted uppercase tracking-wider">Rain Chance</span>
              <AgreementMeter value={c.precipProb ?? 0} color="#38bdf8" label="Rain Chance" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 border-t border-line md:border-l md:border-t-0 backdrop-blur-sm bg-black/10">
          <MiniStat label="Wind" value={`${Math.round(u.wc(c.windKph))}`} unit={`${u.wu} ${dirName(c.windDir)}`} />
          <MiniStat label="Humidity" value={`${c.humidity}`} unit="%" />
          <MiniStat label="UV" value={`${c.uvIndex}`} unit={c.uvIndex >= 8 ? "very high" : c.uvIndex >= 3 ? "moderate" : "low"} />
          <MiniStat label="Air" value={`${c.aqi}`} unit={aqiCategory(c.aqi).label} sev={aqiCategory(c.aqi).severity as Severity} />
        </div>
      </div>
    </Panel>
  );
}

function HeroHazard({ alert, place }: { alert: AlertT; place: Place }) {
  const sev = SEVERITY_META[alert.severity];
  const tint = alert.severity === "emergency" ? "var(--emergency)" : "var(--warning)";
  return (
    <div className="overflow-hidden rounded-md border-2" style={{ borderColor: tint }}>
      <div className="flex items-center gap-3 px-4 py-2" style={{ backgroundColor: tint, color: "#fff" }}>
        <SeverityMark severity={alert.severity} size={18} />
        <HazardIcon hazard={alert.hazard} size={22} />
        <span className="text-sm font-bold uppercase tracking-widest">{sev.label} · {HAZARD_META[alert.hazard].label}</span>
        <span className="ml-auto mono text-xs">{place.name.split(" — ")[0]}</span>
      </div>
      <div className="bg-surface p-5 md:p-7">
        <h1 className="display text-3xl leading-tight md:text-4xl">{alert.title}</h1>
        <p className="mt-2 max-w-2xl text-base text-ink-2">{alert.headline}</p>
        <div className="mt-4 rounded-sm border-l-4 bg-surface-2 p-3" style={{ borderColor: tint }}>
          <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted">Do this now</div>
          <p className="text-sm font-medium">{alert.instruction}</p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <SourceTag source={alert.source} name={alert.sourceName} url={alert.sourceUrl} />
          <span className="mono text-xs text-muted">expires {new Date(alert.expires).toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
          <Link href="/alerts" className="ml-auto inline-flex items-center gap-1 text-sm font-medium" style={{ color: "var(--info)" }}>
            All alerts <IconArrow size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, sev }: { label: string; value: string; unit?: string; sev?: Severity }) {
  return (
    <div className="border-b border-line px-4 py-3 [&:nth-child(even)]:border-l">
      <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="display text-3xl">{value}</div>
      <div className="text-xs" style={{ color: sev ? `var(--${sev})` : "var(--muted)" }}>{unit}</div>
    </div>
  );
}

function Detail({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2">
      <span className="text-sm text-muted">{label}</span>
      <span className="mono text-sm">{value}{unit && <span className="ml-1 text-muted">{unit}</span>}</span>
    </div>
  );
}

function RiskRow({ r, authority, authorityUrl }: { r: Risk; authority: string; authorityUrl: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-2">
        <HazardIcon hazard={r.hazard} size={22} style={{ color: `var(--${r.severity})` }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{HAZARD_META[r.hazard].label}</span>
            <SeverityBadge severity={r.severity} size="sm" />
          </div>
          <div className="mono text-xs text-muted">{r.window} · confidence {r.confidence}%</div>
        </div>
        <div className="text-right">
          <div className="display text-2xl leading-none">{r.score}</div>
          <div className="mono text-[10px] text-muted">/100</div>
        </div>
      </button>
      {open && (
        <div className="border-t border-line bg-surface-2 px-4 py-3 text-sm">
          <div className="mono mb-1 text-[10px] uppercase tracking-[0.16em] text-muted">Why</div>
          <ul className="mb-2 list-inside list-disc text-ink-2">
            {r.drivers.map((d, i) => <li key={i}>{d}</li>)}
          </ul>
          <div className="mono mb-1 text-[10px] uppercase tracking-[0.16em] text-muted">Do this</div>
          <p className="mb-2">{r.action}</p>
          <a href={authorityUrl} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: "var(--info)" }}>Official guidance — {authority} →</a>
        </div>
      )}
    </li>
  );
}

function HourlyStrip({ hours, timezone }: { hours: Hour[]; timezone: string }) {
  const u = useUnits();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
  };
  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
  };

  const nowTime = Date.now();
  const startIndex = Math.max(0, hours.findIndex(h => new Date(h.time).getTime() > nowTime - 3600000));
  const futureHours = hours.slice(startIndex, startIndex + 24);
  const temps = futureHours.map((h) => u.tc(h.tempC));
  const min = Math.min(...temps), max = Math.max(...temps);
  const H = 50; // Chart height
  const range = max - min || 1;

  const colWidth = 56;

  let pathD = "";
  futureHours.forEach((h, i) => {
    const t = u.tc(h.tempC);
    const y = H - ((t - min) / range) * H;
    const x = i * colWidth + (colWidth / 2);
    if (i === 0) {
      pathD += `M ${x},${y}`;
    } else {
      const prevX = (i - 1) * colWidth + (colWidth / 2);
      const prevT = u.tc(futureHours[i - 1].tempC);
      const prevY = H - ((prevT - min) / range) * H;
      const cp1X = prevX + (x - prevX) / 2;
      pathD += ` C ${cp1X},${prevY} ${cp1X},${y} ${x},${y}`;
    }
  });

  return (
    <div className="relative group">
      {/* Navigation Buttons */}
      <button 
        onClick={scrollLeft} 
        className="absolute left-2 top-1/2 z-20 -translate-y-1/2 w-8 h-8 rounded-full bg-surface/80 border border-line backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-ink"
        aria-label="Scroll left"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button 
        onClick={scrollRight} 
        className="absolute right-2 top-1/2 z-20 -translate-y-1/2 w-8 h-8 rounded-full bg-surface/80 border border-line backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md text-ink"
        aria-label="Scroll right"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>

      <div 
        ref={scrollRef} 
        className="overflow-x-auto scroll-smooth pb-2 pt-2 px-10 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
      >
        <div className="relative flex items-end" style={{ width: futureHours.length * colWidth, minWidth: 'max-content' }}>
          
          {/* Background Highlight for "Now" */}
          <div 
            className="absolute top-0 bottom-0 z-0 rounded-xl backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.2)]" 
            style={{ width: colWidth, left: 0, backgroundColor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)' }} 
          />

          {/* SVG Line Chart (Absolute) */}
          <div className="absolute left-0 w-full z-10" style={{ top: 24, height: H + 10, pointerEvents: 'none' }}>
            <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
              <path d={pathD} fill="none" stroke="url(#tempGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              {futureHours.map((h, i) => {
                const t = u.tc(h.tempC);
                const y = H - ((t - min) / range) * H;
                const x = i * colWidth + (colWidth / 2);
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" fill="var(--surface)" stroke="#f97316" strokeWidth="2" />
                    <text x={x} y={y - 12} textAnchor="middle" className="mono text-[13px] font-bold" fill={i === 0 ? "var(--ink)" : "var(--muted)"}>
                      {Math.round(t)}°
                    </text>
                  </g>
                );
              })}
              <defs>
                <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#f59e0b" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Hourly Columns */}
          <div className="flex relative z-10 w-full">
            {futureHours.map((h, i) => {
              const d = new Date(h.time);
              const timeLabel = i === 0 ? "Now" : d.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', hour12: true }).replace(" ", "");
              const isNow = i === 0;

              return (
                <div key={i} className="flex flex-col items-center justify-end" style={{ width: colWidth, height: 160 }}>
                  <div className="flex flex-col items-center justify-end flex-1 pb-2 gap-1">
                    <WxIcon code={h.code} size={24} style={{ color: "var(--ink)" }} />
                    <div className="h-[14px] flex items-center justify-center">
                      <span className="text-[11px] font-bold" style={{ color: h.precipProb > 10 ? "#38bdf8" : "var(--muted)" }}>
                        {h.precipProb}%
                      </span>
                    </div>
                    <span className={`mono text-[11px] ${isNow ? 'font-bold text-ink' : 'text-muted'}`}>{timeLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

function DailyList({ days }: { days: Day[] }) {
  const u = useUnits();
  return (
    <div className="flex overflow-x-auto scroll-thin px-3 py-4 gap-2 md:gap-4 snap-x w-full">
      {days.map((d, i) => {
        const isToday = i === 0;
        return (
          <div 
            key={i} 
            className={`flex flex-1 shrink-0 snap-center flex-col items-center justify-between rounded-2xl py-3 px-1 min-w-[72px] md:min-w-[80px] transition-colors cursor-pointer ${isToday ? "bg-surface-3 shadow-md border border-line shadow-black/10" : "hover:bg-surface-2"}`}
          >
            <span className="text-sm font-semibold mb-1" style={{ color: isToday ? "var(--ink)" : "var(--ink-2)" }}>
              {isToday ? "Today" : new Date(d.date).toLocaleDateString([], { weekday: "short" })}
            </span>
            
            <div className="flex flex-col items-center justify-center min-h-[60px]">
              <WxIcon code={d.code} size={36} style={{ color: "var(--ink)" }} />
              {d.precipProb > 20 && (
                <span className="text-[11px] font-bold tracking-tight mt-1 flex items-center" style={{ color: "#38bdf8" }}>
                  <span className="text-[9px] mr-0.5">💧</span>{d.precipProb}%
                </span>
              )}
            </div>
            
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-base font-bold text-ink">{Math.round(u.tc(d.hiC))}°</span>
              <span className="text-sm font-semibold text-muted">{Math.round(u.tc(d.loC))}°</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SunMoonTracker({ sun, timezone, className = "" }: { sun: Sun; timezone: string; className?: string }) {
  const d = new Date();
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(d);
  const hPart = parts.find(p => p.type === 'hour')?.value;
  const mPart = parts.find(p => p.type === 'minute')?.value;
  
  let currentHour = Number(hPart);
  if (currentHour === 24) currentHour = 0;
  const currentFloat = currentHour + Number(mPart) / 60;

  const { sunriseHour, sunsetHour } = sun;
  const isDay = currentFloat >= sunriseHour && currentFloat < sunsetHour;

  let progress = 0;
  let labelLeft = "";
  let labelRight = "";
  let emoji = "";

  if (isDay) {
    const totalDay = sunsetHour - sunriseHour;
    progress = (currentFloat - sunriseHour) / totalDay;
    progress = Math.max(0, Math.min(1, progress));
    labelLeft = `Sunrise ${fmtHour(sunriseHour)}`;
    labelRight = `Sunset ${fmtHour(sunsetHour)}`;
    emoji = "☀️";
  } else {
    const nightDuration = (24 - sunsetHour) + sunriseHour;
    if (currentFloat >= sunsetHour) {
      progress = (currentFloat - sunsetHour) / nightDuration;
    } else {
      progress = ((24 - sunsetHour) + currentFloat) / nightDuration;
    }
    progress = Math.max(0, Math.min(1, progress));
    labelLeft = `Sunset ${fmtHour(sunsetHour)}`;
    labelRight = `Sunrise ${fmtHour(sunriseHour)}`;
    emoji = "🌙";
  }

  const angle = Math.PI - (progress * Math.PI);
  const r = 40;
  const cx = 50;
  const cy = 50;
  const x = cx + r * Math.cos(angle);
  const y = cy - r * Math.sin(angle);

  return (
    <Panel className={className}>
      <PanelHeader kicker="Live tracker" title={isDay ? "Sun Position" : "Moon Position"} />
      <div className="px-4 py-5 flex flex-col items-center relative overflow-hidden">
        <svg viewBox="0 0 100 55" className="w-full max-w-[280px] overflow-visible">
          <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="var(--line-strong)" strokeWidth="1.5" strokeDasharray="2 3" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="var(--line)" strokeWidth="1" />
          <text x={x} y={y} fontSize="14" textAnchor="middle" dominantBaseline="central" style={{ filter: "drop-shadow(0px 1px 3px rgba(0,0,0,0.3))" }}>
            {emoji}
          </text>
        </svg>
        <div className="w-full max-w-[280px] flex justify-between mt-3 mono text-[10px] uppercase text-muted tracking-wider">
          <span>{labelLeft}</span>
          <span>{labelRight}</span>
        </div>
      </div>
    </Panel>
  );
}

function WindCompass({ deg }: { deg: number }) {
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`Wind from ${dirName(deg)}`}>
      <circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" strokeWidth="1" />
      {["N", "E", "S", "W"].map((d, i) => (
        <text key={d} x={36 + 26 * Math.sin((i * 90 * Math.PI) / 180)} y={36 - 26 * Math.cos((i * 90 * Math.PI) / 180) + 3} textAnchor="middle" fontSize="8" fill="var(--muted)" className="mono">{d}</text>
      ))}
      <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: "36px 36px" }}>
        <path d="M36 16 L41 40 L36 35 L31 40 Z" fill="var(--live)" />
      </g>
    </svg>
  );
}

function AqiRow({ aqi, pm25, pm10, pollen }: { aqi: number; pm25: number; pm10: number; pollen: string }) {
  const cat = aqiCategory(aqi);
  return (
    <div className="border-t border-line px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted">Air quality</div>
        <SeverityBadge severity={cat.severity as Severity} label={cat.label} size="sm" />
      </div>
      <div className="mt-1 flex items-baseline gap-4">
        <span className="display text-3xl">{aqi}</span>
        <span className="mono text-xs text-muted">PM2.5 {pm25} · PM10 {pm10} µg/m³</span>
        <span className="mono ml-auto text-xs text-muted">pollen {pollen}</span>
      </div>
    </div>
  );
}

function SunRow({ sun }: { sun: Sun }) {
  return (
    <div className="grid grid-cols-3 border-t border-line px-4 py-3 text-center">
      <div><div className="mono text-[10px] uppercase text-muted">Sunrise</div><div className="mono text-sm">{fmtHour(sun.sunriseHour)}</div></div>
      <div><div className="mono text-[10px] uppercase text-muted">Sunset</div><div className="mono text-sm">{fmtHour(sun.sunsetHour)}</div></div>
      <div><div className="mono text-[10px] uppercase text-muted">Moon</div><div className="text-sm">{sun.moonName}</div></div>
    </div>
  );
}

function NasaCrossCheckRow({ check }: { check?: ClimateCheck }) {
  const u = useUnits();
  // Silent if the check never ran or NASA POWER was unreachable — this is a
  // supplementary sanity signal, not something that should ever look broken.
  if (!check || !check.available) return null;
  const isUnusual = check.status === "unusual";
  const diffStr = check.diffC !== undefined ? (u.isImp ? (check.diffC * 9/5).toFixed(1) : check.diffC.toString()) : "";
  const sign = check.diffC! > 0 ? "+" : "";
  return (
    <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5">
      <span className="mono text-[10px] uppercase tracking-[0.16em] text-muted">NASA POWER cross-check</span>
      <span
        className="mono text-xs"
        style={{ color: isUnusual ? "var(--warning)" : "var(--calm)" }}
        title={`This month's long-run average here is ${Math.round(u.tc(check.monthAvgC || 0))}${u.tu}`}
      >
        {isUnusual
          ? `⚠ ${sign}${diffStr} vs monthly baseline`
          : `✓ consistent (baseline ${Math.round(u.tc(check.monthAvgC || 0))}°)`}
      </span>
    </div>
  );
}
