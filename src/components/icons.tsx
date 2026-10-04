import type { SVGProps } from "react";
import type { HazardType } from "@/lib/hazards";
import type { WxCode } from "@/lib/wx";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---- Hazard glyphs (purpose-built, no emoji) ---- */
const HAZARD_GLYPH: Record<HazardType, React.ReactNode> = {
  flood: (
    <>
      <path d="M3 15c1.5 0 1.5 1.2 3 1.2S9.5 15 11 15s1.5 1.2 3 1.2S17.5 15 19 15s1.5 1.2 3 1.2" />
      <path d="M3 19c1.5 0 1.5 1.2 3 1.2S9.5 19 11 19s1.5 1.2 3 1.2S17.5 19 19 19s1.5 1.2 3 1.2" />
      <path d="M6 12V6a2 2 0 0 1 2-2h4l3 3v5" />
      <path d="M12 4v3h3" />
    </>
  ),
  cyclone: (
    <>
      <path d="M4 6c6-2 12-2 16 1-3-1-6 0-6 3 0 2 2 3 4 2" />
      <path d="M20 18c-6 2-12 2-16-1 3 1 6 0 6-3 0-2-2-3-4-2" />
      <circle cx="12" cy="12" r="1.4" />
    </>
  ),
  thunderstorm: (
    <>
      <path d="M7 15a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 18 15" />
      <path d="M12 12l-2 4h3l-2 4" />
    </>
  ),
  heat: (
    <>
      <circle cx="12" cy="14" r="4" />
      <path d="M12 3v3M12 4c-1.2 1.4-1.2 2.6 0 4M17 8l-1.5 1.5M7 8l1.5 1.5" />
      <path d="M5 14H3M21 14h-2M12 22v-2" />
    </>
  ),
  cold: (
    <>
      <path d="M12 2v20M4 7l16 10M20 7L4 17" />
      <path d="M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2M6 9l-2.6.3M6 9 4.5 6.7M18 15l2.6-.3M18 15l1.5 2.3" />
    </>
  ),
  wildfire: (
    <>
      <path d="M12 3c1 3 4 4 4 8a4 4 0 0 1-8 0c0-2 1-3 1.5-4C10.5 8 12 6 12 3Z" />
      <path d="M11 15a1.6 1.6 0 0 0 2 0" />
    </>
  ),
  smoke: (
    <>
      <path d="M4 20c2 0 2-1.5 4-1.5S10 20 12 20s2-1.5 4-1.5S18 20 20 20" />
      <path d="M6 15c-1.5 0-2.5-1-2.5-2.5S5 10 6.5 10.2A3.5 3.5 0 0 1 13 8a3 3 0 0 1 5 1.5c1.7 0 3 1 3 2.6S19.5 15 18 15Z" />
    </>
  ),
  drought: (
    <>
      <path d="M4 17c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1" strokeDasharray="2 2" />
      <path d="M12 3v6M8 6l4-3 4 3" />
      <path d="M7 12h10M9 14.5h6" strokeDasharray="1.5 2" />
    </>
  ),
  earthquake: (
    <>
      <path d="M2 12h3l2-6 3 12 3-15 3 12 2-3h4" />
    </>
  ),
  tsunami: (
    <>
      <path d="M3 18c8 0 8-11 16-8-4-.5-6 2-6 4a3 3 0 0 0 5 2" />
      <path d="M3 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1" />
    </>
  ),
  landslide: (
    <>
      <path d="M3 20 13 5l8 15Z" />
      <path d="M9 20l2-4 3 2 2-3" />
      <circle cx="8" cy="17" r=".6" fill="currentColor" />
      <circle cx="15" cy="18" r=".6" fill="currentColor" />
    </>
  ),
  frost: (
    <>
      <path d="M12 2v20M6 6l12 12M18 6 6 18" />
      <circle cx="12" cy="12" r="1.2" />
    </>
  ),
  hail: (
    <>
      <path d="M6 13a4 4 0 0 1-.5-8 5 5 0 0 1 9.6-1A3.5 3.5 0 0 1 17 13" />
      <circle cx="8" cy="18" r="1" fill="currentColor" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
      <circle cx="16" cy="18" r="1" fill="currentColor" />
    </>
  ),
};

export function HazardIcon({ hazard, ...p }: P & { hazard: HazardType }) {
  return <Svg {...p}>{HAZARD_GLYPH[hazard]}</Svg>;
}

/* ---- Weather-code glyphs ---- */
const WX_EMOJI: Record<WxCode, string> = {
  clear: "☀️",
  partly: "⛅",
  cloudy: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  "heavy-rain": "⛈️",
  thunder: "🌩️",
  snow: "🌨️",
  sleet: "🌨️",
};

export function WxIcon({ code, size = 24, style, className, ...rest }: any) {
  return (
    <span 
      className={className}
      style={{ 
        fontSize: size * 0.95, 
        lineHeight: 1, 
        display: "inline-flex", 
        alignItems: "center", 
        justifyContent: "center", 
        width: size, 
        height: size,
        filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.25))",
        ...style,
        color: "initial"
      }}
      title={code}
      {...rest}
    >
      {WX_EMOJI[code as WxCode]}
    </span>
  );
}

/* ---- Minimal UI chrome icons (used sparingly) ---- */
export function IconChevron(p: P) {
  return <Svg {...p}><path d="M9 6l6 6-6 6" /></Svg>;
}
export function IconArrow(p: P) {
  return <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>;
}
export function IconPin(p: P) {
  return <Svg {...p}><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.4" /></Svg>;
}
export function IconWind({ deg = 0, ...p }: P & { deg?: number }) {
  return (
    <Svg {...p}>
      <g style={{ transform: `rotate(${deg}deg)`, transformOrigin: "center" }}>
        <path d="M12 3v18M12 3l-4 5M12 3l4 5" />
      </g>
    </Svg>
  );
}
export function IconMenu(p: P) {
  return <Svg {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
}
export function IconClose(p: P) {
  return <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>;
}
export function IconSun(p: P) {
  return <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.5 4.5 6 6M18 18l1.5 1.5M19.5 4.5 18 6M6 18l-1.5 1.5" /></Svg>;
}
export function IconMoon(p: P) {
  return <Svg {...p}><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" /></Svg>;
}
export function IconCheck(p: P) {
  return <Svg {...p}><path d="M4 12l5 5L20 6" /></Svg>;
}
export function IconAlertTri(p: P) {
  return <Svg {...p}><path d="M12 3 22 20H2Z" /><path d="M12 10v5M12 18h.01" /></Svg>;
}
