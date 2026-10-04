"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, PanelHeader } from "@/components/ui";

type Gauge = { at: string; rainRateMmHr: number; riverLevelM: number; trend: string };

/*
  Fed by the SSE stream (/api/stream). Demonstrates push-based live data:
  a river gauge that updates in place with a genuinely live beacon.
*/
export function LiveGauge({ className = "" }: { className?: string }) {
  const [g, setG] = useState<Gauge | null>(null);
  const [connected, setConnected] = useState(false);
  const history = useRef<number[]>([]);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.addEventListener("hello", () => setConnected(true));
    es.addEventListener("gauge", (e) => {
      const data = JSON.parse((e as MessageEvent).data) as Gauge;
      history.current = [...history.current, data.riverLevelM].slice(-40);
      setG(data);
    });
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  const level = g?.riverLevelM ?? 2.4;
  const danger = level > 3;
  const spark = history.current;
  const max = Math.max(3.5, ...spark);
  const min = Math.min(2, ...spark);
  const pts = spark.map((v, i) => `${(i / Math.max(1, spark.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`).join(" ");

  return (
    <Panel className={className}>
      <PanelHeader
        kicker="Live · SSE push"
        title="River gauge"
        right={
          <span className="mono flex items-center gap-1 text-[10px] text-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-calm beacon" : "bg-warning"}`} />
            {connected ? "STREAMING" : "RECONNECT…"}
          </span>
        }
      />
      <div className="p-4">
        <div className="flex items-end gap-3">
          <span className="display text-4xl" style={{ color: danger ? "var(--warning)" : "var(--ink)" }}>{level.toFixed(2)}</span>
          <span className="pb-1 text-sm text-muted">m · {g?.trend ?? "steady"}</span>
        </div>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-2 h-10 w-full">
          <line x1="0" y1={100 - ((3 - min) / (max - min || 1)) * 100} x2="100" y2={100 - ((3 - min) / (max - min || 1)) * 100} stroke="var(--warning)" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" opacity="0.6" />
          {spark.length > 1 && <polyline points={pts} fill="none" stroke={danger ? "var(--warning)" : "var(--info)"} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
        </svg>
        <div className="mono mt-1 text-[10px] text-muted">danger stage 3.00m · rain {g?.rainRateMmHr ?? 0} mm/h</div>
      </div>
    </Panel>
  );
}
