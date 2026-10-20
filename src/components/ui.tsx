import type { ReactNode } from "react";
import { SEVERITY_META, type Severity } from "@/lib/hazards";

const SEV_VAR: Record<Severity, string> = {
  calm: "var(--calm)",
  advisory: "var(--advisory)",
  watch: "var(--watch)",
  warning: "var(--warning)",
  emergency: "var(--emergency)",
};

const SEV_TINT: Record<Severity, string> = {
  calm: "var(--calm-bg)",
  advisory: "var(--advisory-bg)",
  watch: "var(--watch-bg)",
  warning: "var(--warning-bg)",
  emergency: "var(--emergency-bg)",
};

/* Shape-coded severity mark — carries meaning WITHOUT relying on color. */
export function SeverityMark({ severity, size = 16 }: { severity: Severity; size?: number }) {
  const c = SEV_VAR[severity];
  const s = size;
  const common = { fill: c, stroke: c } as const;
  return (
    <svg width={s} height={s} viewBox="0 0 16 16" aria-hidden="true">
      {severity === "calm" && <circle cx="8" cy="8" r="5" fill="none" stroke={c} strokeWidth="2" />}
      {severity === "advisory" && <rect x="8" y="1.5" width="9" height="9" transform="rotate(45 8 8)" {...common} />}
      {severity === "watch" && <path d="M8 2 14.5 13.5H1.5Z" fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round" />}
      {severity === "warning" && <path d="M8 2 14.5 13.5H1.5Z" {...common} strokeLinejoin="round" />}
      {severity === "emergency" && (
        <path d="M5.2 1.5h5.6L14.5 5.2v5.6L10.8 14.5H5.2L1.5 10.8V5.2Z" {...common} strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function SeverityBadge({
  severity,
  label,
  size = "md",
}: {
  severity: Severity;
  label?: string;
  size?: "sm" | "md";
}) {
  const meta = SEVERITY_META[severity];
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm font-medium uppercase tracking-wide ${pad}`}
      style={{ backgroundColor: SEV_TINT[severity], color: SEV_VAR[severity] }}
    >
      <SeverityMark severity={severity} size={size === "sm" ? 11 : 13} />
      {label ?? meta.label}
    </span>
  );
}

/* Confidence / model-agreement meter — never a bare number. */
export function AgreementMeter({ value, label = "model agreement", color }: { value: number; label?: string; color?: string }) {
  const cells = 10;
  const filled = Math.round((value / 100) * cells);
  const tone = color ? color : (value >= 70 ? "var(--calm)" : value >= 45 ? "var(--watch)" : "var(--warning)");
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        {Array.from({ length: cells }).map((_, i) => (
          <span
            key={i}
            className="h-3 w-1 rounded-[1px]"
            style={{ backgroundColor: i < filled ? tone : "var(--line-strong)" }}
          />
        ))}
      </div>
      <span className="mono text-xs" style={{ color: color ? color : "var(--muted)" }}>{value}%</span>
    </div>
  );
}

export function Panel({
  children,
  className = "",
  as: Tag = "section",
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  style?: React.CSSProperties;
}) {
  return (
    <Tag className={`rounded-md border border-line bg-surface ${className}`} style={style}>{children}</Tag>
  );
}

export function PanelHeader({ title, kicker, right }: { title: string; kicker?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between border-b border-line px-4 py-2.5">
      <div>
        {kicker && <div className="mono text-[10px] uppercase tracking-[0.16em] text-muted">{kicker}</div>}
        <h2 className="display text-lg leading-tight">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* Buttons are deliberately differentiated by importance, not all gradient pills. */
export function Button({
  children,
  variant = "default",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "default" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-sm px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-50";
  const styles: Record<string, string> = {
    primary: "bg-ink text-paper hover:opacity-90",
    danger: "text-white hover:opacity-90",
    default: "border border-line-strong bg-surface-2 text-ink hover:bg-surface-3",
    ghost: "text-ink-2 hover:bg-surface-2",
  };
  return (
    <button
      className={`${base} ${styles[variant]} ${className}`}
      style={variant === "danger" ? { backgroundColor: "var(--warning)" } : undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

export function DataRow({ label, value, unit }: { label: string; value: ReactNode; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-2 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="mono text-sm text-ink">
        {value}
        {unit && <span className="ml-0.5 text-muted">{unit}</span>}
      </span>
    </div>
  );
}

export function SourceTag({ source, name, url }: { source: "official" | "platform"; name: string; url?: string }) {
  const isOfficial = source === "official";
  const color = isOfficial ? "var(--official)" : "var(--community)";
  const body = (
    <span
      className="inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium"
      style={{ borderColor: color, color }}
    >
      <span
        aria-hidden
        className="inline-block h-2 w-2"
        style={{
          backgroundColor: isOfficial ? color : "transparent",
          border: isOfficial ? "none" : `1.5px solid ${color}`,
          borderRadius: isOfficial ? 2 : "50%",
        }}
      />
      {isOfficial ? "OFFICIAL" : "PLATFORM-DERIVED"} · {name}
    </span>
  );
  return url ? (
    <a href={url} target="_blank" rel="noreferrer" className="hover:underline">
      {body}
    </a>
  ) : (
    body
  );
}
