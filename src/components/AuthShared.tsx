"use client";

export function Beacon() {
  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="none" stroke="var(--line-strong, #333)" strokeWidth="1" opacity="0.35" />
        <circle cx="12" cy="12" r="3" fill="var(--live, #22c55e)" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="var(--ink, #fff)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </svg>
    </span>
  );
}

export function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function WeatherBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-canvas" />
      
      {/* Radar gradient wash */}
      <div
        className="absolute left-1/2 top-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        style={{
          background: "radial-gradient(circle at center, var(--live, #22c55e) 0%, transparent 40%), radial-gradient(circle at 30% 70%, #3b82f6 0%, transparent 30%)",
        }}
      />
      
      {/* Radar grid and rings */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.10]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" className="text-ink" />
        <g className="text-ink" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="50%" cy="50%" r="12%" />
          <circle cx="50%" cy="50%" r="22%" />
          <circle cx="50%" cy="50%" r="32%" />
          <circle cx="50%" cy="50%" r="42%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" strokeOpacity="0.3" />
          <line x1="0" y1="50%" x2="100%" y2="50%" strokeOpacity="0.3" />
        </g>
      </svg>

      {/* Ground-truth blips */}
      <div className="absolute left-[18%] top-[22%] h-1 w-1 rounded-full bg-live/40" />
      <div className="absolute left-[72%] top-[30%] h-1 w-1 rounded-full bg-live/30" />
      <div className="absolute left-[28%] top-[68%] h-1 w-1 rounded-full bg-blue-500/30" />
      <div className="absolute left-[80%] top-[62%] h-1.5 w-1.5 rounded-full bg-live/25" />

      {/* Brutalist Footer Strip */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center">
        <span className="mono text-[10px] tracking-[0.2em] text-muted/50 uppercase">
          RADAR · OPEN-METEO · IMD GROUNDING
        </span>
      </div>
    </div>
  );
}