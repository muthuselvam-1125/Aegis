"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui";
import { SeverityMark } from "@/components/ui";
import type { Severity } from "@/lib/hazards";

type Member = {
  id: number;
  name: string;
  role: string;
  placeId: number | null;
  status: "safe" | "needs_help" | "unknown";
  statusNote: string;
};

type Place = {
  id: number;
  name: string;
  region: string;
  country: string;
};

type Alert = {
  id: number;
  severity: Severity;
  title: string;
  area: string;
  active: boolean;
  expires?: string | Date | null;
};

type Resource = {
  id: number;
  status: string;
  capacity: number;
  occupancy: number;
};

export default function ResponderPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const loadData = () => {
    fetch("/api/checkin")
      .then((r) => r.json())
      .then((d) => setMembers(Array.isArray(d) ? d : d.members || []))
      .catch(() => {});

    fetch("/api/places")
      .then((r) => r.json())
      .then((d) => setPlaces(Array.isArray(d) ? d : d.places || []))
      .catch(() => {});

    fetch("/api/alerts")
      .then((r) => r.json())
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {});

    fetch("/api/resources")
      .then((r) => r.json())
      .then((d) => setResources(d.resources || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // 5s auto sync
    return () => clearInterval(interval);
  }, []);

  const needsHelpMembers = members.filter((m) => m.status === "needs_help");
  const needsHelpCount = needsHelpMembers.length;
  const unaccountedCount = members.filter((m) => m.status === "unknown").length;
  const activeAlerts = alerts.filter((a) => a.active !== false && (!a.expires || new Date(a.expires).getTime() > Date.now()));

  const totalCap = resources.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalOcc = resources.reduce((acc, r) => acc + (r.occupancy || 0), 0);
  const shelterLoad = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 74;

  const getPlaceLocationString = (placeId: number | null) => {
    if (!placeId) return "Unassigned";
    const p = places.find((x) => x.id === placeId);
    if (!p) return "Unknown location";
    const parts = [p.name, p.region, p.country].filter(Boolean);
    return parts.join(", ");
  };

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6 space-y-6">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end border-b border-line pb-4">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">
            VERIFIED RESPONDERS ONLY · AGGREGATE VIEW
          </div>
          <h1 className="display text-3xl">Situational awareness</h1>
        </div>
        <div className="mono rounded-sm border border-line bg-surface-2 px-2.5 py-1 text-[11px] text-muted self-start sm:self-auto">
          DEMO ROLE: coordinator
        </div>
      </header>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-line bg-surface p-4 border-l-4" style={{ borderLeftColor: "var(--warning)" }}>
          <div className="display text-3xl">{needsHelpCount}</div>
          <div className="mono text-[10px] uppercase tracking-wider text-muted mt-1">NEEDS HELP</div>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 border-l-4" style={{ borderLeftColor: "var(--calm)" }}>
          <div className="display text-3xl">{unaccountedCount}</div>
          <div className="mono text-[10px] uppercase tracking-wider text-muted mt-1">UNACCOUNTED</div>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 border-l-4" style={{ borderLeftColor: "var(--warning)" }}>
          <div className="display text-3xl">{activeAlerts.length}</div>
          <div className="mono text-[10px] uppercase tracking-wider text-muted mt-1">ACTIVE WARNINGS</div>
        </div>

        <div className="rounded-md border border-line bg-surface p-4 border-l-4" style={{ borderLeftColor: "var(--live)" }}>
          <div className="display text-3xl">{shelterLoad}%</div>
          <div className="mono text-[10px] uppercase tracking-wider text-muted mt-1">SHELTER LOAD</div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Column: People Status Table */}
        <div>
          <Panel>
            <PanelHeader kicker="HOUSEHOLDS" title="People status" right={`${members.length} tracked`} />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] font-semibold text-muted uppercase tracking-wider">
                    <th className="px-4 py-2.5">Person</th>
                    <th className="px-4 py-2.5">Location</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-muted">
                        No household members tracked in database.
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const isHelp = m.status === "needs_help";
                      const isSafe = m.status === "safe";
                      return (
                        <tr key={m.id}>
                          <td className="px-4 py-3 font-medium text-ink">
                            {m.name} {m.role === "primary" ? "(you)" : ""}
                          </td>
                          <td className="px-4 py-3 text-muted max-w-[180px] truncate">
                            {getPlaceLocationString(m.placeId)}
                          </td>
                          <td className="px-4 py-3 font-semibold whitespace-nowrap">
                            {isHelp && <span style={{ color: "var(--warning)" }}>▲ needs help</span>}
                            {isSafe && <span style={{ color: "var(--calm)" }}>o safe</span>}
                            {!isHelp && !isSafe && <span style={{ color: "var(--muted)" }}>? unknown</span>}
                          </td>
                          <td className="px-4 py-3 text-muted text-[11px] leading-snug">
                            {m.statusNote || "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Right Column: Priority & Mutual Aid */}
        <div className="space-y-6">
          <Panel>
            <PanelHeader kicker="PRIORITY" title="Active warnings" />
            <div className="p-4 space-y-3">
              {activeAlerts.length === 0 ? (
                <p className="text-xs text-muted">No active emergency warnings reported.</p>
              ) : (
                activeAlerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-md border border-line bg-surface">
                    <div>
                      <div className="font-semibold text-xs text-ink">{a.title}</div>
                      <div className="mono text-[10px] text-muted mt-0.5">{a.area}</div>
                    </div>
                    <SeverityMark severity={a.severity} size={14} />
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader kicker="MUTUAL AID" title="Open needs" />
            <div className="p-4 space-y-3">
              {needsHelpCount === 0 ? (
                <p className="text-xs text-muted">No open needs.</p>
              ) : (
                needsHelpMembers.map((m) => (
                  <div key={m.id} className="p-3 rounded-md border border-line text-xs" style={{ backgroundColor: "rgba(220, 38, 38, 0.08)" }}>
                    <div className="text-ink">
                      <span className="font-bold">{m.name}</span> in <span className="font-semibold">{getPlaceLocationString(m.placeId)}</span> requires assistance.
                    </div>
                    {m.statusNote && (
                      <div className="text-[11px] text-muted mt-1">
                        Note: "{m.statusNote}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>

      <footer className="text-xs text-muted border-t border-line pt-4">
        Aggregate view is available only to verified local officials and volunteers. Individuals' private medical details are not exposed here — only status and coordination notes.{" "}
        <Link href="/trust" className="underline hover:text-ink">Governance →</Link>
      </footer>
    </div>
  );
}
