"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Panel, PanelHeader } from "@/components/ui";
import { SeverityMark } from "@/components/ui";
import { HazardIcon, IconCheck } from "@/components/icons";
import { HAZARD_META, type HazardType, type Severity } from "@/lib/hazards";

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
  name: string;
  kind: string;
  status: string;
  capacity: number;
  occupancy: number;
  area: string;
};

type Report = {
  id: number;
  hazard: string;
  body: string;
  area: string;
  reporter: string;
  kind: string;
  verified: boolean;
  createdAt: string;
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function formatHazard(hazard: string): string {
  if (!hazard || !hazard.trim()) return "General Hazard";
  const clean = hazard.toLowerCase().trim();
  const map: Record<string, string> = {
    flood: "Flood",
    cyclone: "Cyclone / Storm",
    landslide: "Landslide",
    heat: "Extreme Heat",
    cold: "Extreme Cold",
    tsunami: "Tsunami",
    wildfire: "Wildfire",
    earthquake: "Earthquake",
    thunderstorm: "Severe Thunderstorm",
    heavy_rain: "Heavy Rainfall",
    smoke: "Wildfire Smoke",
    drought: "Drought",
    frost: "Frost",
    hail: "Hailstorm",
  };
  if (map[clean]) return map[clean];
  if (HAZARD_META[clean as HazardType]?.label) return HAZARD_META[clean as HazardType].label;
  return hazard.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ResponderPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<"needs" | "all">("needs");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let inFlightController: AbortController | null = null;

    const fetchData = async () => {
      if (inFlightController) {
        inFlightController.abort();
      }
      const controller = new AbortController();
      inFlightController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      try {
        const [rCheckin, rPlaces, rAlerts, rResources, rReports] = await Promise.all([
          fetch("/api/checkin", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : { members: [] }))
            .catch(() => ({ members: [] })),
          fetch("/api/places", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : { places: [] }))
            .catch(() => ({ places: [] })),
          fetch("/api/alerts", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : { alerts: [] }))
            .catch(() => ({ alerts: [] })),
          fetch("/api/resources", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : { resources: [] }))
            .catch(() => ({ resources: [] })),
          fetch("/api/reports", { signal: controller.signal })
            .then((r) => (r.ok ? r.json() : { reports: [] }))
            .catch(() => ({ reports: [] })),
        ]);

        clearTimeout(timeoutId);

        if (!isMounted) return;

        setMembers(Array.isArray(rCheckin) ? rCheckin : rCheckin.members || []);
        setPlaces(Array.isArray(rPlaces) ? rPlaces : rPlaces.places || []);
        setAlerts(rAlerts.alerts || []);
        setResources(rResources.resources || []);
        setReports(rReports.reports || []);
      } catch (err) {
        // Ignored: aborted or network timeout
      } finally {
        clearTimeout(timeoutId);
      }
    };

    fetchData();
    // Throttle polling to 10 seconds to save CPU & network overhead
    const interval = setInterval(fetchData, 10000);

    return () => {
      isMounted = false;
      if (inFlightController) inFlightController.abort();
      clearInterval(interval);
    };
  }, []);

  const toggleVerify = async (reportId: number, currentStatus: boolean) => {
    setActionLoading(reportId);
    setActionError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reportId, verified: !currentStatus }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          setActionError("Authentication required: Please log in to verify community reports.");
        } else {
          setActionError("Unable to update verification status. Please try again.");
        }
        return;
      }
      // Optimistic update
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, verified: !currentStatus } : r))
      );
    } catch (e) {
      console.error("Failed to update report verification:", e);
      setActionError("Network error while updating verification.");
    } finally {
      setActionLoading(null);
    }
  };

  const isHelpRequest = (r: Report) => {
    const k = (r.kind || "").toLowerCase();
    const b = (r.body || "").toLowerCase();
    return (
      k.includes("need") ||
      k.includes("help") ||
      k.includes("rescue") ||
      k.includes("emergency") ||
      b.includes("need") ||
      b.includes("help") ||
      b.includes("trapped") ||
      b.includes("rescue")
    );
  };

  const communityNeeds = reports.filter(isHelpRequest);
  const needsHelpMembers = members.filter((m) => m.status === "needs_help");
  const totalNeedsHelpCount = needsHelpMembers.length + communityNeeds.length;
  const unaccountedCount = members.filter((m) => m.status === "unknown").length;
  const activeAlerts = alerts.filter(
    (a) => a.active !== false && (!a.expires || new Date(a.expires).getTime() > Date.now())
  );

  const totalCap = resources.reduce((acc, r) => acc + (r.capacity || 0), 0);
  const totalOcc = resources.reduce((acc, r) => acc + (r.occupancy || 0), 0);
  const shelterLoad = totalCap > 0 ? Math.round((totalOcc / totalCap) * 100) : 0;

  const getPlaceDetails = (placeId: number | null) => {
    if (!placeId) return { display: "Unassigned", full: "Unassigned location" };
    const p = places.find((x) => x.id === placeId);
    if (!p) return { display: "Unknown location", full: "Unknown location" };
    
    const city = (p.name || "").split(" — ")[0].trim();
    const region = (p.region || "").trim();
    const display = region && region.toLowerCase() !== city.toLowerCase()
      ? `${city} (${region})`
      : city || "Saved Place";
    const full = [city, region, p.country].filter(Boolean).join(", ");
    return { display, full };
  };

  return (
    <div className="mx-auto max-w-5xl px-3 pt-4 pb-24 md:px-6 md:pt-6 md:pb-28 space-y-6">
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end border-b border-line pb-4">
        <div>
          <div className="mono text-[10px] uppercase font-bold tracking-[0.18em] text-muted">
            INCIDENT COMMAND & COORDINATION
          </div>
          <h1 className="display text-3xl font-extrabold text-ink">Situational awareness</h1>
          <p className="mt-1 text-sm text-muted">
            Real-time telemetry, household check-in status, and verified mutual aid triage.
          </p>
        </div>
        <div className="mono rounded-sm border border-line bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-muted self-start sm:self-auto">
          ROLE: Community Responder
        </div>
      </header>

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* KPI 1: Open Assistance Needs */}
        <div
          className="rounded-md border border-line bg-surface p-4 border-l-4 transition-all"
          style={{ borderLeftColor: totalNeedsHelpCount > 0 ? "var(--warning)" : "var(--calm)" }}
        >
          <div
            className="display text-3xl font-extrabold"
            style={{ color: totalNeedsHelpCount > 0 ? "var(--warning)" : "inherit" }}
          >
            {totalNeedsHelpCount}
          </div>
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted mt-1">
            OPEN ASSISTANCE NEEDS
          </div>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] mono font-bold border ${
                needsHelpMembers.length > 0
                  ? "bg-warning/15 border-warning/30 text-warning"
                  : "bg-surface-2 border-line text-muted"
              }`}
            >
              Household: {needsHelpMembers.length}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] mono font-bold border ${
                communityNeeds.length > 0
                  ? "bg-warning/15 border-warning/30 text-warning"
                  : "bg-surface-2 border-line text-muted"
              }`}
            >
              Community: {communityNeeds.length}
            </span>
          </div>
        </div>

        {/* KPI 2: Unaccounted */}
        <div className="rounded-md border border-line bg-surface p-4 border-l-4" style={{ borderLeftColor: unaccountedCount > 0 ? "var(--watch)" : "var(--calm)" }}>
          <div className="display text-3xl font-extrabold">{unaccountedCount}</div>
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted mt-1">
            UNACCOUNTED
          </div>
          <div className="text-[11px] text-muted mt-2 mono">
            {unaccountedCount === 0 ? "All members accounted for" : "Awaiting check-in response"}
          </div>
        </div>

        {/* KPI 3: Active Warnings */}
        <div className="rounded-md border border-line bg-surface p-4 border-l-4" style={{ borderLeftColor: activeAlerts.length > 0 ? "var(--warning)" : "var(--calm)" }}>
          <div className="display text-3xl font-extrabold">{activeAlerts.length}</div>
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted mt-1">
            ACTIVE WARNINGS
          </div>
          <div className="text-[11px] text-muted mt-2 mono">
            {activeAlerts.length > 0 ? `${activeAlerts.length} high-severity alerts` : "No emergency advisories"}
          </div>
        </div>

        {/* KPI 4: Shelter Capacity */}
        <div
          className="rounded-md border border-line bg-surface p-4 border-l-4"
          style={{
            borderLeftColor: shelterLoad > 85 ? "var(--emergency)" : shelterLoad > 60 ? "var(--warning)" : "var(--calm)",
          }}
        >
          <div className="display text-3xl font-extrabold">{totalCap > 0 ? `${shelterLoad}%` : "0%"}</div>
          <div className="mono text-[10px] font-bold uppercase tracking-wider text-muted mt-1">
            SHELTER CAPACITY
          </div>
          <div className="text-[11px] text-muted mt-2 mono">
            {totalCap > 0
              ? `${totalOcc.toLocaleString()} / ${totalCap.toLocaleString()} beds (${resources.length} sites)`
              : "No active shelters reporting"}
          </div>
        </div>
      </div>

      {/* Main Grid Section */}
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Left Column: People Status Table */}
        <div>
          <Panel>
            <PanelHeader
              kicker="HOUSEHOLD ROSTER"
              title="People status"
              right={<span className="mono text-xs text-muted">{members.length} Tracked</span>}
            />
            <div className="px-4 py-2 border-b border-line bg-surface-2 text-[11px] text-muted flex items-center justify-between">
              <span>Showing check-in statuses for your tracked household roster.</span>
              <Link href="/places" className="text-info hover:underline font-medium">
                Manage Roster →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] font-bold text-muted uppercase tracking-wider">
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
                        No household members tracked yet. Add household members in{" "}
                        <Link href="/places" className="underline text-info">
                          Places
                        </Link>
                        .
                      </td>
                    </tr>
                  ) : (
                    members.map((m) => {
                      const isHelp = m.status === "needs_help";
                      const isSafe = m.status === "safe";
                      const loc = getPlaceDetails(m.placeId);

                      return (
                        <tr key={m.id} className="hover:bg-surface-2/40 transition-colors">
                          <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                            {m.name} {m.role === "primary" ? "(you)" : ""}
                          </td>
                          <td className="px-4 py-3 text-ink text-xs" title={loc.full}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted shrink-0 text-[11px]">📍</span>
                              <span className="font-medium text-ink leading-snug">
                                {loc.display}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-bold whitespace-nowrap">
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
            <PanelHeader kicker="INCIDENT COMMAND" title="Active warnings" />
            <div className="p-4 space-y-3">
              {activeAlerts.length === 0 ? (
                <p className="text-xs text-muted">No active emergency warnings reported.</p>
              ) : (
                activeAlerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-md border border-line bg-surface">
                    <div>
                      <div className="font-bold text-xs text-ink">{a.title}</div>
                      <div className="mono text-[10px] text-muted mt-0.5">{a.area}</div>
                    </div>
                    <SeverityMark severity={a.severity} size={14} />
                  </div>
                ))
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              kicker="MUTUAL AID & COMMUNITY REPORTS"
              title="Open needs"
              right={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab("needs")}
                    className={`mono text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors ${
                      activeTab === "needs"
                        ? "bg-warning/20 text-warning border border-warning/40"
                        : "text-muted hover:text-ink hover:bg-surface-2"
                    }`}
                  >
                    Urgent Needs ({communityNeeds.length})
                  </button>
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`mono text-[10px] uppercase font-bold px-2 py-0.5 rounded transition-colors ${
                      activeTab === "all"
                        ? "bg-live/20 text-live border border-live/40"
                        : "text-muted hover:text-ink hover:bg-surface-2"
                    }`}
                  >
                    All Reports ({reports.length})
                  </button>
                </div>
              }
            />

            {actionError && (
              <div className="mx-4 mt-3 p-2.5 rounded bg-warning/10 border border-warning/40 text-xs text-warning flex items-center justify-between">
                <span>⚠️ {actionError}</span>
                <button onClick={() => setActionError(null)} className="text-xs font-bold hover:underline">
                  Dismiss
                </button>
              </div>
            )}

            <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
              {activeTab === "needs" ? (
                communityNeeds.length === 0 && needsHelpMembers.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">No open help needs at this time.</p>
                ) : (
                  <>
                    {/* Household member needs */}
                    {needsHelpMembers.map((m) => {
                      const loc = getPlaceDetails(m.placeId);
                      return (
                        <div
                          key={`m-${m.id}`}
                          className="p-3 rounded-md border border-warning/40 bg-warning/10 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="mono text-[10px] font-bold uppercase tracking-wider text-warning">
                              Household Member
                            </span>
                            <span className="mono text-[10px] font-semibold text-warning">Direct Check-in</span>
                          </div>
                          <div className="text-ink">
                            <span className="font-bold text-sm">{m.name}</span> in{" "}
                            <span className="font-semibold">{loc.display}</span> requires assistance.
                          </div>
                          {m.statusNote && (
                            <div className="text-[11px] text-muted mt-1 italic">
                              Note: "{m.statusNote}"
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Community User Help Requests */}
                    {communityNeeds.map((r) => (
                      <div
                        key={`r-${r.id}`}
                        className="p-3.5 rounded-md border border-line bg-surface hover:bg-surface-2/60 transition-all text-xs border-l-4 shadow-sm"
                        style={{ borderLeftColor: "var(--warning)" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded-sm bg-surface-2 border border-line px-2 py-0.5 text-xs font-bold text-ink">
                              <HazardIcon hazard={r.hazard as HazardType} size={13} style={{ color: "var(--warning)" }} />
                              <span>{formatHazard(r.hazard)}</span>
                            </span>
                            <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-warning/15 text-warning border border-warning/30">
                              Urgent Need
                            </span>
                            {r.verified ? (
                              <span className="inline-flex items-center gap-0.5 rounded-sm bg-official/10 px-1.5 py-0.5 text-[10px] font-bold text-official border border-official/30">
                                <IconCheck size={11} /> Verified
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleVerify(r.id, r.verified)}
                                disabled={actionLoading === r.id}
                                className="rounded-sm border border-line bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted hover:text-ink hover:border-official transition-colors disabled:opacity-50"
                                title="Click to verify this report"
                              >
                                {actionLoading === r.id ? "Saving..." : "Mark Verified"}
                              </button>
                            )}
                          </div>
                          <span className="mono text-[10px] text-muted">{ago(r.createdAt)}</span>
                        </div>

                        <p className="text-sm font-semibold text-ink leading-relaxed mb-2">{r.body}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-2 text-[11px] text-muted">
                          <span className="mono">
                            📍 <span className="font-semibold text-ink">{r.area || "Location not specified"}</span>
                          </span>
                          <span className="mono">
                            Posted by: <span className="font-bold text-ink">{r.reporter || "Anonymous User"}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
                )
              ) : (
                /* All Community Reports Tab */
                reports.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">No community reports submitted yet.</p>
                ) : (
                  reports.map((r) => {
                    const isNeed = isHelpRequest(r);
                    return (
                      <div
                        key={`all-r-${r.id}`}
                        className="p-3 rounded-md border border-line bg-surface text-xs border-l-4 transition-all"
                        style={{ borderLeftColor: isNeed ? "var(--warning)" : "var(--community)" }}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 rounded bg-surface-2 border border-line px-1.5 py-0.5 text-[11px] font-bold text-ink">
                              <HazardIcon hazard={r.hazard as HazardType} size={12} style={{ color: "var(--warning)" }} />
                              <span>{formatHazard(r.hazard)}</span>
                            </span>
                            <span
                              className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                                isNeed
                                  ? "bg-warning/15 text-warning border-warning/30"
                                  : "bg-surface-2 text-muted border-line"
                              }`}
                            >
                              {r.kind || "Report"}
                            </span>
                            {r.verified ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-official">
                                <IconCheck size={11} /> Verified
                              </span>
                            ) : (
                              <button
                                onClick={() => toggleVerify(r.id, r.verified)}
                                disabled={actionLoading === r.id}
                                className="rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-muted hover:text-ink hover:border-official transition-colors disabled:opacity-50"
                              >
                                {actionLoading === r.id ? "Saving..." : "Mark Verified"}
                              </button>
                            )}
                          </div>
                          <span className="mono text-[10px] text-muted">{ago(r.createdAt)}</span>
                        </div>

                        <p className="text-xs text-ink leading-snug mb-1.5">{r.body}</p>

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-1 text-[11px] text-muted">
                          <span>📍 {r.area || "General Area"}</span>
                          <span>By: {r.reporter}</span>
                        </div>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </Panel>
        </div>
      </div>

      <footer className="text-xs text-muted border-t border-line pt-4">
        Aggregate incident view is available only to verified local officials and responders. Individuals' private medical details are not exposed here — only status and coordination notes.{" "}
        <Link href="/trust" className="underline hover:text-ink">Governance & Protocols →</Link>
      </footer>
    </div>
  );
}

