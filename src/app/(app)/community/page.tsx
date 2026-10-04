"use client";

import { useEffect, useState } from "react";
import { Panel, PanelHeader, Button } from "@/components/ui";
import { HazardIcon, IconCheck, IconClose } from "@/components/icons";
import { HAZARD_META, type HazardType } from "@/lib/hazards";

type Report = { id: number; hazard: string; body: string; area: string; reporter: string; kind: string; verified: boolean; createdAt: string };
type Resource = { id: number; name: string; kind: string; area: string; status: string; capacity: number; occupancy: number; contact: string };

const KIND_META: Record<string, { label: string; color: string }> = {
  observation: { label: "On the ground", color: "var(--community)" },
  need: { label: "Need", color: "var(--warning)" },
  offer: { label: "Offer / help", color: "var(--calm)" },
  resource: { label: "Resource", color: "var(--info)" },
};

function ago(iso: string) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

export default function CommunityPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);
  const [form, setForm] = useState({ hazard: "flood", kind: "observation", area: "", body: "", reporter: "" });
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const load = () => {
    fetch("/api/reports").then((r) => r.json()).then((d) => setReports(d.reports || []));
    fetch("/api/resources").then((r) => r.json()).then((d) => setResources(d.resources || []));
  };

  useEffect(() => {
    load();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setCurrentUser({ name: d.user.name, email: d.user.email });
          setForm((prev) => ({
            ...prev,
            reporter: `${d.user.name} (${d.user.email})`,
          }));
        }
      })
      .catch(() => {});
  }, []);

  const handleOpenModal = () => {
    if (currentUser && (!form.reporter || form.reporter.trim() === "")) {
      setForm((prev) => ({ ...prev, reporter: `${currentUser.name} (${currentUser.email})` }));
    }
    setShowModal(true);
  };

  const submit = async () => {
    if (!form.body) return;
    setBusy(true);
    await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setForm({
      hazard: "flood",
      kind: "observation",
      area: "",
      body: "",
      reporter: currentUser ? `${currentUser.name} (${currentUser.email})` : "",
    });
    setBusy(false);
    setShowModal(false);
    load();
  };

  return (
    <div className="relative mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Community & mutual aid</div>
          <h1 className="display text-3xl">Community</h1>
          <p className="mt-1 text-sm text-muted">
            Ground-truth from people who are actually there. These are community reports — they are <span className="font-semibold">never</span> shown as official data.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenModal} className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-lg leading-none">+</span> Post Report
        </Button>
      </header>

      {/* Trust banner distinguishing sources */}
      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-md border border-line bg-surface-2 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: "var(--official)" }} /> Official / verified
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-2" style={{ borderColor: "var(--community)" }} /> Community report (unverified unless marked)
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Reports Feed */}
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="mono text-xs font-semibold uppercase tracking-wider text-muted">
              Live Ground Reports ({reports.length})
            </span>
          </div>

          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="rounded-md border border-line bg-surface p-8 text-center text-sm text-muted">
                No ground reports submitted yet. Click <span className="font-semibold text-ink">+ Post Report</span> to share what you see.
              </div>
            ) : (
              reports.map((r) => {
                const km = KIND_META[r.kind?.toLowerCase()] ?? { label: r.kind || "Report", color: "var(--community)" };
                return (
                  <article key={r.id} className="rounded-md border-l-4 bg-surface p-3 transition-all hover:bg-surface-2/40" style={{ borderLeftColor: km.color, borderTop: "1px solid var(--line)", borderRight: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
                    <div className="mb-1 flex items-center gap-2">
                      <HazardIcon hazard={r.hazard as HazardType} size={16} style={{ color: "var(--muted)" }} />
                      <span className="rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: km.color }}>{km.label}</span>
                      {r.verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: "var(--official)" }}><IconCheck size={12} /> Verified</span>
                      ) : (
                        <span className="text-[10px] text-muted">unverified</span>
                      )}
                      <span className="mono ml-auto text-[10px] text-muted">{ago(r.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-relaxed">{r.body}</p>
                    
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line/40 pt-2 text-xs">
                      <span className="mono text-[11px] text-muted">
                        {r.area ? `📍 ${r.area}` : ""}
                      </span>
                      <div className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11px]">
                        <span className="text-muted">Posted by:</span>
                        <span className="font-semibold text-ink">{r.reporter || "Anonymous User"}</span>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>

        {/* Resource board */}
        <div>
          <Panel>
            <PanelHeader kicker="Live capacity where available" title="Local resources" />
            <ul className="divide-y divide-line">
              {resources.map((r) => {
                const pct = r.capacity ? Math.round((r.occupancy / r.capacity) * 100) : 0;
                const full = r.status === "full";
                return (
                  <li key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.name}</span>
                      <span className="mono text-[10px] uppercase" style={{ color: full ? "var(--warning)" : "var(--calm)" }}>{r.status}</span>
                    </div>
                    <div className="mono text-xs text-muted">{r.kind} · {r.area}{r.contact && ` · ${r.contact}`}</div>
                    {r.capacity > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div className="h-2" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "var(--warning)" : pct > 80 ? "var(--watch)" : "var(--calm)" }} />
                        </div>
                        <span className="mono text-[10px] text-muted">{r.occupancy}/{r.capacity}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <button
        onClick={handleOpenModal}
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-line bg-live text-white shadow-xl hover:scale-105 active:scale-95 transition-all md:hidden"
        title="Post Report"
        aria-label="Post Report"
      >
        <span className="text-2xl font-bold leading-none">+</span>
      </button>

      {/* Report Modal / Form Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-lg border border-line bg-surface shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <span className="mono text-[10px] uppercase tracking-wider text-muted">Post to the board</span>
                <h3 className="display text-lg font-bold">Report from the ground</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="rounded-sm p-1 text-muted hover:bg-surface-2 hover:text-ink">
                <IconClose size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4">
              <div>
                <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Kind (Select or Type)
                </label>
                <input
                  list="kind-options"
                  className="w-full rounded-sm border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink placeholder:text-muted"
                  placeholder="e.g. Need, Observation..."
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                />
                <datalist id="kind-options">
                  <option value="observation">On the ground (observation)</option>
                  <option value="need">Need</option>
                  <option value="offer">Offer / help</option>
                  <option value="resource">Resource</option>
                  <option value="Urgent Help Needed">Urgent Help Needed</option>
                  <option value="Medical Supply Request">Medical Supply Request</option>
                  <option value="Food & Water Distribution">Food & Water Distribution</option>
                  <option value="Shelter Information">Shelter Information</option>
                </datalist>
              </div>

              <div>
                <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Hazard (Select or Type)
                </label>
                <input
                  list="hazard-options"
                  className="w-full rounded-sm border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink placeholder:text-muted"
                  placeholder="e.g. Flood, Storm, Landslide..."
                  value={form.hazard}
                  onChange={(e) => setForm({ ...form, hazard: e.target.value })}
                />
                <datalist id="hazard-options">
                  <option value="flood">Flood</option>
                  <option value="cyclone">Cyclone / Storm</option>
                  <option value="landslide">Landslide</option>
                  <option value="heat">Extreme Heat</option>
                  <option value="tsunami">Tsunami</option>
                  <option value="wildfire">Wildfire</option>
                  <option value="earthquake">Earthquake</option>
                  <option value="heavy_rain">Heavy Rain</option>
                </datalist>
              </div>

              <div className="col-span-2">
                <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-muted">Area / Landmark</label>
                <input className="w-full rounded-sm border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink placeholder:text-muted" placeholder="e.g. Fort Kochi, near St. Anthony's Church" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-muted">Observations / Details</label>
                <textarea className="w-full rounded-sm border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink placeholder:text-muted" rows={3} placeholder="What are you seeing? Be specific and factual." value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
              </div>

              <div className="col-span-2">
                <label className="mono mb-1 block text-[10px] uppercase tracking-wider text-muted">
                  Your Name & Gmail Account
                </label>
                <input
                  className="w-full rounded-sm border border-line bg-surface-2 px-2.5 py-2 text-sm text-ink placeholder:text-muted"
                  placeholder="e.g. Alex M. (alex@gmail.com)"
                  value={form.reporter}
                  onChange={(e) => setForm({ ...form, reporter: e.target.value })}
                />
                {currentUser && (
                  <span className="mono mt-1 block text-[10px] text-muted">
                    Auto-detected account: <span className="font-semibold text-ink">{currentUser.name} ({currentUser.email})</span>
                  </span>
                )}
              </div>

              <div className="col-span-2 mt-2 flex items-center justify-end gap-2 border-t border-line pt-3">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button variant="primary" disabled={busy || !form.body} onClick={submit}>
                  {busy ? "Posting..." : "Post Report"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

