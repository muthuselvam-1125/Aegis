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

export function HazardIcon({ hazard, ...p }: P & { hazard: HazardType | string }) {
  const glyph =
    HAZARD_GLYPH[hazard as HazardType] ||
    HAZARD_GLYPH[(hazard || "").toLowerCase() as HazardType] || (
      <>
        <path d="M12 3 22 20H2Z" />
        <path d="M12 10v5M12 18h.01" />
      </>
    );
  return <Svg {...p}>{glyph}</Svg>;
}

type WxProps = SVGProps<SVGSVGElement> & { size?: number };

/* ---- Modern Realistic Vector Weather Graphics (Multi-layered SVG) ---- */

function WxClear({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Clear Sky"
      {...rest}
    >
      <defs>
        <radialGradient id="wx-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDB813" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wx-sun-core" cx="35%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FDB813" />
          <stop offset="85%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id="wx-sun-ray" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDB813" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="wx-sun-filter" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="2.5" floodColor="#F59E0B" floodOpacity="0.45" />
        </filter>
      </defs>
      {/* Ambient corona glow */}
      <circle cx="32" cy="32" r="28" fill="url(#wx-sun-glow)" />
      {/* 8 Solar Corona Rays */}
      <g>
        <rect x="30" y="4" width="4" height="8" rx="2" fill="url(#wx-sun-ray)" />
        <rect x="30" y="52" width="4" height="8" rx="2" fill="url(#wx-sun-ray)" />
        <rect x="4" y="30" width="8" height="4" rx="2" fill="url(#wx-sun-ray)" />
        <rect x="52" y="30" width="8" height="4" rx="2" fill="url(#wx-sun-ray)" />
        <rect x="30" y="5" width="4" height="7" rx="2" fill="url(#wx-sun-ray)" transform="rotate(45 32 32)" />
        <rect x="30" y="5" width="4" height="7" rx="2" fill="url(#wx-sun-ray)" transform="rotate(135 32 32)" />
        <rect x="30" y="5" width="4" height="7" rx="2" fill="url(#wx-sun-ray)" transform="rotate(225 32 32)" />
        <rect x="30" y="5" width="4" height="7" rx="2" fill="url(#wx-sun-ray)" transform="rotate(315 32 32)" />
      </g>
      {/* Sun Core Disc */}
      <circle cx="32" cy="32" r="14.5" fill="url(#wx-sun-core)" filter="url(#wx-sun-filter)" />
      {/* Specular sheen */}
      <path
        d="M 23 25 C 25 20.5 29 18.5 35 18.5 C 31 19.5 27 22.5 25 26.5 C 24.2 28.2 23.4 27.2 23 25 Z"
        fill="#FFFFFF"
        fillOpacity="0.55"
      />
    </svg>
  );
}

function WxPartly({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Partly Cloudy"
      {...rest}
    >
      <defs>
        <radialGradient id="wx-partly-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDB813" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wx-partly-sun-core" cx="35%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FDB813" />
          <stop offset="85%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <linearGradient id="wx-partly-sun-ray" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FDB813" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="wx-cloud-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <filter id="wx-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Sun peeking from top-right */}
      <circle cx="42" cy="22" r="20" fill="url(#wx-partly-sun-glow)" />
      {/* Exposed sun rays on top-right */}
      <rect x="40" y="2" width="3.5" height="6.5" rx="1.75" fill="url(#wx-partly-sun-ray)" />
      <rect x="55" y="20" width="6.5" height="3.5" rx="1.75" fill="url(#wx-partly-sun-ray)" />
      <rect x="40.5" y="3" width="3.5" height="6" rx="1.75" fill="url(#wx-partly-sun-ray)" transform="rotate(45 42 22)" />
      <rect x="40.5" y="3" width="3.5" height="6" rx="1.75" fill="url(#wx-partly-sun-ray)" transform="rotate(-45 42 22)" />
      <circle cx="42" cy="22" r="12" fill="url(#wx-partly-sun-core)" />
      <path
        d="M 35 18 C 36.5 14.5 39.5 13 44 13 C 41 14 38 16 36.5 19 C 36 20.2 35.2 19.5 35 18 Z"
        fill="#FFFFFF"
        fillOpacity="0.55"
      />
      {/* Volumetric Front Cloud */}
      <g filter="url(#wx-cloud-shadow)">
        {/* Soft back shadow */}
        <path
          d="M 16 48 C 11 48 7 44 7 39 C 7 34.5 10.2 30.8 14.5 30.1 C 15.8 22.5 22.2 17 30 17 C 37 17 42.8 21.4 44.8 27.8 C 45.8 27.4 47 27.2 48.2 27.2 C 54.2 27.2 59 32 59 38 C 59 43.5 54.8 48 49.3 48 Z"
          fill="#475569"
          fillOpacity="0.3"
          transform="translate(0, 1.5)"
        />
        {/* Cloud body */}
        <path
          d="M 16 48 C 11 48 7 44 7 39 C 7 34.5 10.2 30.8 14.5 30.1 C 15.8 22.5 22.2 17 30 17 C 37 17 42.8 21.4 44.8 27.8 C 45.8 27.4 47 27.2 48.2 27.2 C 54.2 27.2 59 32 59 38 C 59 43.5 54.8 48 49.3 48 Z"
          fill="url(#wx-cloud-front)"
        />
        {/* Top crest highlight */}
        <path
          d="M 21.5 22.5 C 24 18.5 27.5 18 30.5 18 C 34.5 18 38 19.5 40.5 23 C 37.5 20.8 33.5 20 30.5 20 C 26.5 20 23.5 21 21.5 22.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
        {/* Left lobe highlight */}
        <path
          d="M 10 37 C 9.5 34 11 31.5 13.5 31 C 12 32.5 11.5 34.5 11.8 37 Z"
          fill="#FFFFFF"
          fillOpacity="0.8"
        />
      </g>
    </svg>
  );
}

function WxCloudy({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Overcast"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="wx-cloud-front-overcast" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <filter id="wx-cloud-front-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1E293B" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Back Layer Cloud (Silver-Slate Depth) */}
      <path
        d="M 27 38 C 23.5 38 20.5 35.3 20.5 32 C 20.5 29 22.6 26.5 25.5 26.1 C 26.8 20.5 31.8 16.5 37.5 16.5 C 43 16.5 47.6 20 49.2 25 C 50.1 24.7 51 24.5 52 24.5 C 56.4 24.5 60 28.1 60 32.5 C 60 36.6 56.8 38 53 38 Z"
        fill="url(#wx-cloud-back)"
      />
      {/* Front Layer Cloud (Volumetric Cumulus) */}
      <g filter="url(#wx-cloud-front-shadow)">
        <path
          d="M 14 49 C 9.5 49 6 45.4 6 41 C 6 36.9 9 33.5 13 32.8 C 14.2 25.5 20.5 20 28 20 C 35 20 40.8 24.6 42.8 31 C 43.8 30.7 44.9 30.5 46 30.5 C 51.5 30.5 56 35 56 40.5 C 56 45.2 52.2 49 47.5 49 Z"
          fill="url(#wx-cloud-front-overcast)"
        />
        {/* Top highlight */}
        <path
          d="M 20 25 C 22.5 21 25.5 20.5 28.5 20.5 C 32.5 20.5 36 22 38.5 25.5 C 35.5 23.2 32 22.5 28.5 22.5 C 25 22.5 22 23.5 20 25 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
        {/* Left lobe highlight */}
        <path
          d="M 9 38 C 8.5 35 10 32.8 12.5 32.2 C 11 33.8 10.5 35.8 10.8 38 Z"
          fill="#FFFFFF"
          fillOpacity="0.8"
        />
      </g>
    </svg>
  );
}

function WxDrizzle({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Drizzle"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-drizzle" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#F1F5F9" />
          <stop offset="75%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="wx-raindrop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id="wx-cloud-drizzle-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Cloud */}
      <g filter="url(#wx-cloud-drizzle-shadow)">
        <path
          d="M 16 43 C 11.5 43 8 39.5 8 35 C 8 31 10.8 27.6 14.8 27.1 C 15.9 20.2 22.3 15 30 15 C 37.2 15 43.3 19.8 45 26.5 C 46 26.2 47 26 48 26 C 53.5 26 58 30.5 58 36 C 58 41.5 53.8 43 49 43 Z"
          fill="url(#wx-cloud-drizzle)"
        />
        {/* Top highlight */}
        <path
          d="M 21.5 20.5 C 24 16.5 27.5 16 30.5 16 C 34.5 16 38 17.5 40.5 21 C 37.5 18.8 33.5 18 30.5 18 C 26.5 18 23.5 19 21.5 20.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
      </g>
      {/* 3 Translucent Directional Teardrop Raindrops */}
      <g>
        <g transform="translate(20, 50) rotate(15)">
          <path
            d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
            fill="url(#wx-raindrop-grad)"
          />
          <ellipse cx="-0.7" cy="1.8" rx="0.5" ry="1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
        <g transform="translate(32, 53) rotate(15)">
          <path
            d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
            fill="url(#wx-raindrop-grad)"
          />
          <ellipse cx="-0.7" cy="1.8" rx="0.5" ry="1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
        <g transform="translate(44, 49) rotate(15)">
          <path
            d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
            fill="url(#wx-raindrop-grad)"
          />
          <ellipse cx="-0.7" cy="1.8" rx="0.5" ry="1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
      </g>
    </svg>
  );
}

function WxRain({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Rain"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-rain-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
        <linearGradient id="wx-cloud-rain-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="35%" stopColor="#CBD5E1" />
          <stop offset="75%" stopColor="#64748B" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="wx-rain-drop-rich" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id="wx-rain-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.3" />
        </filter>
      </defs>
      {/* Back Layer Cloud (Depth) */}
      <path
        d="M 26 34 C 22.5 34 20 31.8 20 29 C 20 26.5 22 24.2 24.8 23.8 C 26 19 30.5 15.5 36 15.5 C 41.5 15.5 45.8 19 47.2 23.5 C 48 23.2 49 23 50 23 C 54.4 23 58 26.6 58 31 C 58 34.5 54.8 34 51 34 Z"
        fill="url(#wx-cloud-rain-back)"
      />
      {/* Front Layer Cloud */}
      <g filter="url(#wx-rain-cloud-shadow)">
        <path
          d="M 14 42 C 9.5 42 6 38.5 6 34 C 6 30 8.8 26.6 12.8 26.1 C 13.9 19.2 20.3 14 28 14 C 35.2 14 41.3 18.8 43 25.5 C 44 25.2 45 25 46 25 C 51.5 25 56 29.5 56 35 C 56 40.5 51.8 42 47 42 Z"
          fill="url(#wx-cloud-rain-front)"
        />
        {/* Silver crest highlight */}
        <path
          d="M 20 19 C 22.5 15 25.5 14.5 28.5 14.5 C 32.5 14.5 36 16 38.5 19.5 C 35.5 17.5 32 16.5 28.5 16.5 C 25 16.5 22 17.5 20 19 Z"
          fill="#FFFFFF"
          fillOpacity="0.8"
        />
      </g>
      {/* 5 Staggered Directional Teardrop Raindrops */}
      <g>
        <g transform="translate(18, 48) rotate(16)">
          <path
            d="M 0,-4.8 C 1.5,-2.2 2.6,0.5 2.6,2.6 C 2.6,4.4 1.4,5.8 0,5.8 C -1.4,5.8 -2.6,4.4 -2.6,2.6 C -2.6,0.5 -1.5,-2.2 0,-4.8 Z"
            fill="url(#wx-rain-drop-rich)"
          />
          <ellipse cx="-0.8" cy="1.9" rx="0.55" ry="1.1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
        <g transform="translate(32, 47) rotate(16)">
          <path
            d="M 0,-4.8 C 1.5,-2.2 2.6,0.5 2.6,2.6 C 2.6,4.4 1.4,5.8 0,5.8 C -1.4,5.8 -2.6,4.4 -2.6,2.6 C -2.6,0.5 -1.5,-2.2 0,-4.8 Z"
            fill="url(#wx-rain-drop-rich)"
          />
          <ellipse cx="-0.8" cy="1.9" rx="0.55" ry="1.1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
        <g transform="translate(46, 48) rotate(16)">
          <path
            d="M 0,-4.8 C 1.5,-2.2 2.6,0.5 2.6,2.6 C 2.6,4.4 1.4,5.8 0,5.8 C -1.4,5.8 -2.6,4.4 -2.6,2.6 C -2.6,0.5 -1.5,-2.2 0,-4.8 Z"
            fill="url(#wx-rain-drop-rich)"
          />
          <ellipse cx="-0.8" cy="1.9" rx="0.55" ry="1.1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
        <g transform="translate(25, 55) rotate(16)">
          <path
            d="M 0,-4.8 C 1.5,-2.2 2.6,0.5 2.6,2.6 C 2.6,4.4 1.4,5.8 0,5.8 C -1.4,5.8 -2.6,4.4 -2.6,2.6 C -2.6,0.5 -1.5,-2.2 0,-4.8 Z"
            fill="url(#wx-rain-drop-rich)"
          />
          <ellipse cx="-0.8" cy="1.9" rx="0.55" ry="1.1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
        <g transform="translate(39, 55) rotate(16)">
          <path
            d="M 0,-4.8 C 1.5,-2.2 2.6,0.5 2.6,2.6 C 2.6,4.4 1.4,5.8 0,5.8 C -1.4,5.8 -2.6,4.4 -2.6,2.6 C -2.6,0.5 -1.5,-2.2 0,-4.8 Z"
            fill="url(#wx-rain-drop-rich)"
          />
          <ellipse cx="-0.8" cy="1.9" rx="0.55" ry="1.1" fill="#FFFFFF" fillOpacity="0.75" />
        </g>
      </g>
    </svg>
  );
}

function WxHeavyRain({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Heavy Rain"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-heavy-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="wx-cloud-heavy-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="30%" stopColor="#94A3B8" />
          <stop offset="70%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="wx-heavy-drop-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id="wx-heavy-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Back Layer Cloud (Dark Storm Slate) */}
      <path
        d="M 26 34 C 22.5 34 20 31.8 20 29 C 20 26.5 22 24.2 24.8 23.8 C 26 19 30.5 15.5 36 15.5 C 41.5 15.5 45.8 19 47.2 23.5 C 48 23.2 49 23 50 23 C 54.4 23 58 26.6 58 31 C 58 34.5 54.8 34 51 34 Z"
        fill="url(#wx-cloud-heavy-back)"
      />
      {/* Front Layer Storm Cloud */}
      <g filter="url(#wx-heavy-cloud-shadow)">
        <path
          d="M 14 41 C 9.5 41 6 37.5 6 33 C 6 29 8.8 25.6 12.8 25.1 C 13.9 18.2 20.3 13 28 13 C 35.2 13 41.3 17.8 43 24.5 C 44 24.2 45 24 46 24 C 51.5 24 56 28.5 56 34 C 56 39.5 51.8 41 47 41 Z"
          fill="url(#wx-cloud-heavy-front)"
        />
        {/* Silver lightning-lit crest highlight */}
        <path
          d="M 20 18 C 22.5 14 25.5 13.5 28.5 13.5 C 32.5 13.5 36 15 38.5 18.5 C 35.5 16.5 32 15.5 28.5 15.5 C 25 15.5 22 16.5 20 18 Z"
          fill="#FFFFFF"
          fillOpacity="0.85"
        />
      </g>
      {/* 7 Heavy Downpour Angled Raindrops / Shafts (22° angle) */}
      <g>
        <g transform="translate(16, 46) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
        <g transform="translate(28, 45) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
        <g transform="translate(40, 45) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
        <g transform="translate(51, 47) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
        <g transform="translate(22, 54) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
        <g transform="translate(34, 55) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
        <g transform="translate(45, 54) rotate(22)">
          <path d="M 0,-5 C 1.6,-2 2.6,0.6 2.6,2.8 C 2.6,4.6 1.4,6 0,6 C -1.4,6 -2.6,4.6 -2.6,2.8 C -2.6,0.6 -1.6,-2 0,-5 Z" fill="url(#wx-heavy-drop-grad)" />
          <ellipse cx="-0.8" cy="2" rx="0.55" ry="1.2" fill="#FFFFFF" fillOpacity="0.8" />
        </g>
      </g>
    </svg>
  );
}

function WxThunder({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Thunderstorm"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-thunder-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="wx-cloud-thunder-front" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="30%" stopColor="#64748B" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="wx-bolt-grad" x1="0%" y1="0%" x2="0.3" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="25%" stopColor="#FEF08A" />
          <stop offset="65%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <filter id="wx-bolt-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.85" />
        </filter>
        <filter id="wx-thunder-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Back Layer Cloud */}
      <path
        d="M 26 34 C 22.5 34 20 31.8 20 29 C 20 26.5 22 24.2 24.8 23.8 C 26 19 30.5 15.5 36 15.5 C 41.5 15.5 45.8 19 47.2 23.5 C 48 23.2 49 23 50 23 C 54.4 23 58 26.6 58 31 C 58 34.5 54.8 34 51 34 Z"
        fill="url(#wx-cloud-thunder-back)"
      />
      {/* Front Layer Storm Cloud */}
      <g filter="url(#wx-thunder-cloud-shadow)">
        <path
          d="M 14 41 C 9.5 41 6 37.5 6 33 C 6 29 8.8 25.6 12.8 25.1 C 13.9 18.2 20.3 13 28 13 C 35.2 13 41.3 17.8 43 24.5 C 44 24.2 45 24 46 24 C 51.5 24 56 28.5 56 34 C 56 39.5 51.8 41 47 41 Z"
          fill="url(#wx-cloud-thunder-front)"
        />
        {/* Luminous rim highlight */}
        <path
          d="M 20 18 C 22.5 14 25.5 13.5 28.5 13.5 C 32.5 13.5 36 15 38.5 18.5 C 35.5 16.5 32 15.5 28.5 15.5 C 25 15.5 22 16.5 20 18 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
      </g>
      {/* Dynamic Electric Amber Lightning Bolt */}
      <polygon
        points="33,26 23,41 30.5,41 24.5,59 43,38 34.5,38 38.5,26"
        fill="url(#wx-bolt-grad)"
        filter="url(#wx-bolt-glow)"
      />
      {/* Flanking raindrops */}
      <g transform="translate(15, 48) rotate(16)">
        <path
          d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
          fill="#38BDF8"
        />
      </g>
      <g transform="translate(48, 48) rotate(16)">
        <path
          d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
          fill="#38BDF8"
        />
      </g>
    </svg>
  );
}

function WxSnow({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Snow"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-snow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="40%" stopColor="#F0F9FF" />
          <stop offset="75%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <filter id="wx-snow-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0284C7" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Frosty Cloud */}
      <g filter="url(#wx-snow-cloud-shadow)">
        <path
          d="M 16 42 C 11.5 42 8 38.5 8 34 C 8 30 10.8 26.6 14.8 26.1 C 15.9 19.2 22.3 14 30 14 C 37.2 14 43.3 18.8 45 25.5 C 46 25.2 47 25 48 25 C 53.5 25 58 29.5 58 35 C 58 40.5 53.8 42 49 42 Z"
          fill="url(#wx-cloud-snow)"
        />
        <path
          d="M 21.5 19.5 C 24 15.5 27.5 15 30.5 15 C 34.5 15 38 16.5 40.5 20 C 37.5 17.8 33.5 17 30.5 17 C 26.5 17 23.5 18 21.5 19.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.95"
        />
      </g>
      {/* 3 Crystalline Snowflakes */}
      <g transform="translate(19, 50)">
        <path d="M 0 -4.5 L 0 4.5 M -3.9 -2.25 L 3.9 2.25 M -3.9 2.25 L 3.9 -2.25" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1.2" fill="#38BDF8" />
      </g>
      <g transform="translate(32, 53)">
        <path d="M 0 -5.5 L 0 5.5 M -4.75 -2.75 L 4.75 2.75 M -4.75 2.75 L 4.75 -2.75" stroke="#BAE6FD" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1.4" fill="#38BDF8" />
        <circle cx="0" cy="-5" r="0.75" fill="#BAE6FD" />
        <circle cx="0" cy="5" r="0.75" fill="#BAE6FD" />
      </g>
      <g transform="translate(45, 50)">
        <path d="M 0 -4.5 L 0 4.5 M -3.9 -2.25 L 3.9 2.25 M -3.9 2.25 L 3.9 -2.25" stroke="#BAE6FD" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="0" cy="0" r="1.2" fill="#38BDF8" />
      </g>
    </svg>
  );
}

function WxFog({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Fog"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-fog" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#F1F5F9" />
          <stop offset="80%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#94A3B8" />
        </linearGradient>
        <linearGradient id="wx-fog-band-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.3" />
          <stop offset="25%" stopColor="#E2E8F0" stopOpacity="0.9" />
          <stop offset="75%" stopColor="#CBD5E1" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.3" />
        </linearGradient>
        <filter id="wx-fog-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.2" />
        </filter>
      </defs>
      {/* Upper Cloud */}
      <g filter="url(#wx-fog-cloud-shadow)">
        <path
          d="M 18 36 C 14 36 11 33 11 29 C 11 25.5 13.5 22.5 17 22.1 C 18 16 23.5 11.5 30 11.5 C 36.5 11.5 42 16 43.5 21.5 C 44.5 21.2 45.5 21 46.5 21 C 51.2 21 55 24.8 55 29.5 C 55 34.2 51.5 36 47 36 Z"
          fill="url(#wx-cloud-fog)"
        />
        <path
          d="M 23 16.5 C 25.5 13 28 12.5 30.5 12.5 C 34 12.5 37 14 39.5 17 C 37 15 34 14.2 30.5 14.2 C 27 14.2 24.5 15 23 16.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
      </g>
      {/* 3 Sleek Horizontal Vapor Bands */}
      <rect x="12" y="41" width="38" height="3.5" rx="1.75" fill="url(#wx-fog-band-grad)" />
      <rect x="16" y="47" width="36" height="3.5" rx="1.75" fill="url(#wx-fog-band-grad)" />
      <rect x="10" y="53" width="42" height="3.5" rx="1.75" fill="url(#wx-fog-band-grad)" />
    </svg>
  );
}

function WxSleet({ size = 24, className = "", style, ...rest }: WxProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      className={`shrink-0 ${className}`}
      style={style}
      role="img"
      aria-label="Sleet"
      {...rest}
    >
      <defs>
        <linearGradient id="wx-cloud-sleet" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="35%" stopColor="#F1F5F9" />
          <stop offset="75%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <radialGradient id="wx-hail-pellet" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#E0F2FE" />
          <stop offset="85%" stopColor="#BAE6FD" />
          <stop offset="100%" stopColor="#38BDF8" />
        </radialGradient>
        <linearGradient id="wx-sleet-drop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <filter id="wx-sleet-cloud-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.25" />
        </filter>
      </defs>
      {/* Cloud */}
      <g filter="url(#wx-sleet-cloud-shadow)">
        <path
          d="M 16 42 C 11.5 42 8 38.5 8 34 C 8 30 10.8 26.6 14.8 26.1 C 15.9 19.2 22.3 14 30 14 C 37.2 14 43.3 18.8 45 25.5 C 46 25.2 47 25 48 25 C 53.5 25 58 29.5 58 35 C 58 40.5 53.8 42 49 42 Z"
          fill="url(#wx-cloud-sleet)"
        />
        <path
          d="M 21.5 19.5 C 24 15.5 27.5 15 30.5 15 C 34.5 15 38 16.5 40.5 20 C 37.5 17.8 33.5 17 30.5 17 C 26.5 17 23.5 18 21.5 19.5 Z"
          fill="#FFFFFF"
          fillOpacity="0.9"
        />
      </g>
      {/* Mixed Rain & Hail Pellets */}
      <g transform="translate(18, 49) rotate(16)">
        <path
          d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
          fill="url(#wx-sleet-drop)"
        />
      </g>
      <g transform="translate(45, 48) rotate(16)">
        <path
          d="M 0,-4.5 C 1.4,-2 2.4,0.5 2.4,2.5 C 2.4,4.2 1.3,5.5 0,5.5 C -1.3,5.5 -2.4,4.2 -2.4,2.5 C -2.4,0.5 -1.4,-2 0,-4.5 Z"
          fill="url(#wx-sleet-drop)"
        />
      </g>
      <circle cx="28" cy="48" r="3" fill="url(#wx-hail-pellet)" stroke="#7DD3FC" strokeWidth="0.5" />
      <circle cx="36" cy="55" r="3.2" fill="url(#wx-hail-pellet)" stroke="#7DD3FC" strokeWidth="0.5" />
      <circle cx="41" cy="49" r="2.8" fill="url(#wx-hail-pellet)" stroke="#7DD3FC" strokeWidth="0.5" />
    </svg>
  );
}

export function WxIcon({
  code,
  size = 24,
  style,
  className = "",
  ...rest
}: {
  code: WxCode | string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
  [key: string]: any;
}) {
  switch (code) {
    case "clear":
      return <WxClear size={size} className={className} style={style} {...rest} />;
    case "partly":
      return <WxPartly size={size} className={className} style={style} {...rest} />;
    case "cloudy":
      return <WxCloudy size={size} className={className} style={style} {...rest} />;
    case "fog":
      return <WxFog size={size} className={className} style={style} {...rest} />;
    case "drizzle":
      return <WxDrizzle size={size} className={className} style={style} {...rest} />;
    case "rain":
      return <WxRain size={size} className={className} style={style} {...rest} />;
    case "heavy-rain":
      return <WxHeavyRain size={size} className={className} style={style} {...rest} />;
    case "thunder":
      return <WxThunder size={size} className={className} style={style} {...rest} />;
    case "snow":
      return <WxSnow size={size} className={className} style={style} {...rest} />;
    case "sleet":
      return <WxSleet size={size} className={className} style={style} {...rest} />;
    default:
      return <WxCloudy size={size} className={className} style={style} {...rest} />;
  }
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
