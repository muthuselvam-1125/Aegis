"use client";

import { useEffect, useRef, useState } from "react";
import { Panel, PanelHeader, SeverityBadge, Button } from "@/components/ui";
import { IconAlertTri } from "@/components/icons";
import { type Severity, type HazardType } from "@/lib/hazards";

type Member = { id: number; name: string; role: string; placeId: number | null; status: string; statusNote: string; bloodType: string; allergies: string; medical: string; emergencyContact: string; lastCheckIn: string | null };
type Place = { id: number; name: string; label: string; region: string; authority: string; authorityUrl: string; elevationM: number; coastalKm: number; floodHistory: number; lat: number; lon: number };
type AlertT = { id: number; severity: Severity; placeId: number; hazard: HazardType; title: string; active?: boolean; expires?: string | Date | null };

type GeocodingResult = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  admin1?: string;
  country?: string;
};

const STATUS_META: Record<string, { label: string; sev: Severity }> = {
  safe: { label: "Safe", sev: "calm" },
  needs_help: { label: "Needs help", sev: "warning" },
  unknown: { label: "Not checked in", sev: "advisory" },
};

// Cross-tab / cross-page signal so the Map page knows to refetch immediately.
function pingDataChanged() {
  try {
    localStorage.setItem("aegis:dataUpdatedAt", Date.now().toString());
  } catch {
    // Storage unavailable — map's own polling will still catch it.
  }
}

export default function PlacesPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [showAddPlace, setShowAddPlace] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingId(null);
  };

  useEffect(() => {
    return () => stopTracking();
  }, []);

  const loadMembers = async () => {
    const cached = localStorage.getItem("aegis:offline_members");
    if (cached) setMembers(JSON.parse(cached));
    try {
      const d = await fetch("/api/checkin", { cache: 'no-store' }).then((r) => r.json());
      setMembers(d.members || []);
      localStorage.setItem("aegis:offline_members", JSON.stringify(d.members || []));
    } catch (e) {
      console.warn("Offline mode active for members.");
    }
  };

  const loadPlaces = async () => {
    const cached = localStorage.getItem("aegis:offline_places");
    if (cached) setPlaces(JSON.parse(cached));
    try {
      const d = await fetch("/api/places", { cache: 'no-store' }).then((r) => r.json());
      setPlaces(d.places || []);
      localStorage.setItem("aegis:offline_places", JSON.stringify(d.places || []));
    } catch (e) {
      console.warn("Offline mode active for places.");
    }
  };

  useEffect(() => {
    loadMembers();
    loadPlaces();
    fetch("/api/alerts", { cache: 'no-store' }).then((r) => r.json()).then((d) => setAlerts(d.alerts || []));
  }, []);

  const checkIn = async (id: number, status: string, note = "") => {
    await fetch("/api/checkin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status, statusNote: note }) });
    if (status !== "needs_help" && trackingId === id) stopTracking();
    loadMembers();
    pingDataChanged();
  };

  const activateLiveSOS = (id: number) => {
    if (!("geolocation" in navigator)) {
      alert("GPS is not supported in this browser.");
      return;
    }
    
    // First mark as needs_help
    checkIn(id, "needs_help", "LIVE GPS TRACKING ACTIVE");
    setTrackingId(id);

    // Then start tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        try {
          await fetch("/api/checkin", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id,
              lastLat: pos.coords.latitude,
              lastLon: pos.coords.longitude,
            }),
          });
          pingDataChanged(); // Tell map to update
        } catch (e) {
          console.error("Failed to send live location", e);
        }
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
  };

  const removePlace = async (id: number, name: string) => {
    if (!window.confirm(`Remove "${name}" from saved places? Any household members assigned there will become unassigned. This can't be undone.`)) return;
    await fetch(`/api/places?id=${id}`, { method: "DELETE" });
    loadPlaces();
    loadMembers();
    pingDataChanged();
  };

  const needHelp = members.filter((m) => m.status === "needs_help");

  return (
    <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6">
      <header className="mb-4">
        <div className="mono text-[10px] uppercase tracking-[0.18em] text-muted">Personal & household safety</div>
        <h1 className="display text-3xl">Household</h1>
        <p className="mt-1 text-sm text-muted">Everyone and every place you need to track. Check-ins are private to your household.</p>
      </header>

      {needHelp.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-md border-2 px-4 py-3 bg-surface" style={{ borderColor: "var(--warning)" }}>
          <IconAlertTri size={22} style={{ color: "var(--warning)" }} />
          <div className="text-sm">
            <span className="font-semibold">{needHelp.map((m) => m.name).join(", ")}</span> marked needing help.
            {needHelp[0].statusNote && <span className="text-muted"> — “{needHelp[0].statusNote}”</span>}
          </div>
        </div>
      )}

      {/* Household Roster Section */}
      <Panel className="mb-6">
        <PanelHeader
          kicker="Household Roster"
          title="Family & Response Contacts"
          right={
            <div className="flex items-center gap-2">
              <span className="mono text-[10px] text-muted mr-2">
                {members.filter((m) => m.status === "safe").length}/{members.length} safe
              </span>
              {!showAddMember && (
                <Button variant="primary" onClick={() => setShowAddMember(true)}>
                  + Add member
                </Button>
              )}
            </div>
          }
        />

        {showAddMember && (
          <AddMemberForm
            places={places}
            onDone={() => {
              setShowAddMember(false);
              loadMembers();
              loadPlaces();
            }}
          />
        )}

        <ul className="divide-y divide-line">
          {members.map((m) => {
            const place = places.find((p) => p.id === m.placeId);
            const meta = STATUS_META[m.status] ?? STATUS_META.unknown;
            const isEditing = editingId === m.id;
            return (
              <li key={m.id}>
                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-3 font-semibold text-lg">
                      {m.name[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{m.name}</span>
                        <span className="mono text-[10px] uppercase text-muted bg-surface-2 px-1.5 py-0.5 rounded">{m.role}</span>
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        Location: <span className="text-ink font-medium">{place?.name.split(" — ")[0] ?? "Unassigned"}</span>
                        {m.emergencyContact && ` · Contact: ${m.emergencyContact}`}
                        {m.statusNote && ` · Note: “${m.statusNote}”`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={meta.sev} label={meta.label} size="sm" />
                    {m.status !== "safe" && (
                      <button onClick={() => checkIn(m.id, "safe")} className="rounded-sm border border-line bg-surface-2 px-2.5 py-1 text-xs hover:bg-surface-3">
                        Mark Safe
                      </button>
                    )}
                    {trackingId === m.id ? (
                      <button onClick={stopTracking} className="rounded-sm border border-emergency bg-emergency/20 px-2.5 py-1 text-xs text-emergency font-bold animate-pulse">
                        Stop Tracking
                      </button>
                    ) : (
                      <button onClick={() => activateLiveSOS(m.id)} className="rounded-sm border border-warning bg-warning-bg px-2.5 py-1 text-xs text-warning hover:bg-warning/20">
                        Live SOS
                      </button>
                    )}
                    <button
                      onClick={() => setEditingId(isEditing ? null : m.id)}
                      className="rounded-sm border border-line bg-surface-2 px-2.5 py-1 text-xs hover:bg-surface-3"
                    >
                      {isEditing ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <EditMemberForm
                    member={m}
                    places={places}
                    onDone={() => {
                      setEditingId(null);
                      loadMembers();
                      loadPlaces();
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Panel>

      {/* Saved Places Section */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="display text-2xl">Saved places</h2>
          <p className="text-xs text-muted">Each location is scored independently against elevation and flood exposure.</p>
        </div>
        {!showAddPlace && (
          <Button variant="primary" onClick={() => setShowAddPlace(true)}>
            + Add place
          </Button>
        )}
      </div>

      {showAddPlace && (
        <AddPlaceForm
          onDone={() => {
            setShowAddPlace(false);
            loadPlaces();
          }}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {places.map((p) => {
          const pa = alerts.filter((a) => a.placeId === p.id && a.active !== false && (!a.expires || new Date(a.expires).getTime() > Date.now())).sort((x, y) => (x.severity === "emergency" ? -1 : 1))[0];
          return (
            <Panel key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="mono text-[10px] uppercase text-muted">{p.label}</span>
                  <h3 className="display text-lg font-semibold">{p.name}</h3>
                  <div className="mono text-xs text-muted">{p.lat.toFixed(3)}°N, {p.lon.toFixed(3)}°E · {p.region}</div>
                  {members.filter(m => m.placeId === p.id).length > 0 && (
                    <div className="mt-2 text-xs text-ink-2 font-medium bg-surface-2 inline-block px-2 py-1 rounded-sm border border-line">
                      👥 {members.filter(m => m.placeId === p.id).map(m => m.name).join(", ")}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  {pa && <SeverityBadge severity={pa.severity} label={pa.severity.toUpperCase()} size="sm" />}
                  <button
                    onClick={() => removePlace(p.id, p.name)}
                    className="rounded-sm border border-line bg-surface-2 px-2 py-1 text-[11px] text-muted hover:bg-surface-3 hover:text-ink"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-sm bg-surface-2 p-2">
                  <div className="display text-base">{p.elevationM}m</div>
                  <div className="text-[10px] text-muted">Elevation</div>
                </div>
                <div className="rounded-sm bg-surface-2 p-2">
                  <div className="display text-base">{p.coastalKm}km</div>
                  <div className="text-[10px] text-muted">Coast</div>
                </div>
                <div className="rounded-sm bg-surface-2 p-2">
                  <div className="display text-base">{p.floodHistory}</div>
                  <div className="text-[10px] text-muted">Floods/10y</div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function AddMemberForm({ places, onDone }: { places: Place[]; onDone: () => void }) {
  const [placeMode, setPlaceMode] = useState<"existing" | "new">(places.length > 0 ? "existing" : "new");

  const [form, setForm] = useState({
    name: "",
    role: "adult",
    placeId: places[0]?.id?.toString() || "",
    bloodType: "O+",
    allergies: "",
    emergencyContact: "",
  });

  const [newPlace, setNewPlace] = useState({
    name: "",
    label: "",
    region: "",
    country: "",
    lat: "",
    lon: "",
    elevationM: "10",
    coastalKm: "20",
    floodHistory: "0",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (placeMode !== "new" || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=6&language=en&format=json`
        );
        const data = await res.json();
        setSuggestions(data?.results || []);
      } catch (err) {
        console.warn("Geocoding lookup error", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, placeMode]);

  const selectSuggestion = (item: GeocodingResult) => {
    const fullName = `${item.name}${item.admin1 ? " — " + item.admin1 : ""}`;
    setNewPlace((prev) => ({
      ...prev,
      name: fullName,
      region: item.admin1 || prev.region,
      country: item.country || prev.country,
      lat: item.latitude.toFixed(4),
      lon: item.longitude.toFixed(4),
      elevationM: item.elevation != null ? Math.round(item.elevation).toString() : prev.elevationM,
    }));
    setSearchQuery("");
    setSuggestions([]);
  };

  const submit = async () => {
    // Ref updates instantly (unlike state), so this blocks a same-instant
    // double-click before any request fires, closing the race that caused duplicates.
    if (submittingRef.current) return;
    if (!form.name) return;

    if (placeMode === "new") {
      if (!newPlace.name || !newPlace.lat || !newPlace.lon) return;
      if (!newPlace.label || newPlace.label.trim() === "") {
        alert("Type is missing! Please fill the Type field.");
        return;
      }
    }

    submittingRef.current = true;
    setBusy(true);

    let placeId: number | null = placeMode === "existing" ? (form.placeId ? Number(form.placeId) : null) : null;

    if (placeMode === "new") {
      try {
        const placeRes = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newPlace.name,
            label: newPlace.label,
            region: newPlace.region,
            country: newPlace.country,
            lat: Number(newPlace.lat),
            lon: Number(newPlace.lon),
            elevationM: Number(newPlace.elevationM),
            coastalKm: Number(newPlace.coastalKm),
            floodHistory: Number(newPlace.floodHistory),
          }),
        }).then((r) => r.json());
        placeId = placeRes?.place?.id ?? null;
      } catch (err) {
        console.warn("Inline place creation failed", err);
      }
    }

    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: form.name,
        role: form.role,
        placeId,
        bloodType: form.bloodType,
        allergies: form.allergies,
        emergencyContact: form.emergencyContact,
        status: "safe",
      }),
    });

    pingDataChanged();
    submittingRef.current = false;
    setBusy(false);
    onDone();
  };

  const fieldStyle = "w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none";

  return (
    <div className="p-4 bg-surface-2 border-b border-line">
      <h4 className="display text-base font-semibold mb-3">Add Person to Household</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Full Name</label>
          <input className={fieldStyle} placeholder="Name (e.g. Muthuselvam)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Role</label>
          <input className={fieldStyle} placeholder="Role (e.g. Adult, Child, Elder, Responder)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Emergency Phone Contact</label>
          <input className={fieldStyle} placeholder="+91 98xxx xxxxx" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
        </div>
      </div>

      {/* Location — pick a saved place, or add a brand-new one right here in the same step */}
      <div className="mt-4 border-t border-line pt-3">
        <label className="mono text-[10px] uppercase text-muted mb-2 block">Location</label>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPlaceMode("existing")}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${placeMode === "existing" ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2"}`}
          >
            Use existing place
          </button>
          <button
            type="button"
            onClick={() => setPlaceMode("new")}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${placeMode === "new" ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2"}`}
          >
            + Add new place
          </button>
        </div>

        {placeMode === "existing" ? (
          places.length > 0 ? (
            <select className={fieldStyle} value={form.placeId} onChange={(e) => setForm({ ...form, placeId: e.target.value })}>
              {places.map((p) => (
                <option key={p.id} value={p.id}>{p.name.split(" — ")[0]}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted">No saved places yet — use "+ Add new place" instead.</p>
          )
        ) : (
          <div className="rounded-md border border-line-strong bg-surface p-3">
            <div className="relative mb-3">
              <label className="mono text-[10px] uppercase text-muted mb-1 block">Search City / Village / Address</label>
              <input
                type="text"
                className={fieldStyle}
                placeholder="Type location name (e.g. Rajapalayam, Kochi, London)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && <div className="absolute right-3 top-8 mono text-xs text-muted">Searching...</div>}
              {suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-line-strong bg-surface p-1 shadow-lg">
                  {suggestions.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => selectSuggestion(item)}
                      className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-surface-2 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-xs text-muted ml-2">{[item.admin1, item.country].filter(Boolean).join(", ")}</span>
                      </div>
                      <span className="mono text-[11px] text-muted">{item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Location Name</label>
                <input className={fieldStyle} placeholder="Name (e.g. Home, Grandma's)" value={newPlace.name} onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Type</label>
                <input className={fieldStyle} placeholder="Type (e.g. Home, Work, School, Farm)" value={newPlace.label} onChange={(e) => setNewPlace({ ...newPlace, label: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Region / State</label>
                <input className={fieldStyle} placeholder="Region" value={newPlace.region} onChange={(e) => setNewPlace({ ...newPlace, region: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Latitude (Auto-filled)</label>
                <input className={fieldStyle} placeholder="Latitude" value={newPlace.lat} onChange={(e) => setNewPlace({ ...newPlace, lat: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Longitude (Auto-filled)</label>
                <input className={fieldStyle} placeholder="Longitude" value={newPlace.lon} onChange={(e) => setNewPlace({ ...newPlace, lon: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Elevation (Meters)</label>
                <input className={fieldStyle} placeholder="Elevation m" value={newPlace.elevationM} onChange={(e) => setNewPlace({ ...newPlace, elevationM: e.target.value })} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <Button
          variant="primary"
          disabled={busy || !form.name || (placeMode === "new" && (!newPlace.name || !newPlace.lat))}
          onClick={submit}
        >
          Add Member
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function EditMemberForm({
  member,
  places,
  onDone,
}: {
  member: Member;
  places: Place[];
  onDone: () => void;
}) {
  const [placeMode, setPlaceMode] = useState<"existing" | "new">("existing");

  const [form, setForm] = useState({
    name: member.name,
    role: member.role,
    placeId: member.placeId?.toString() || places[0]?.id?.toString() || "",
    bloodType: member.bloodType,
    allergies: member.allergies,
    emergencyContact: member.emergencyContact,
  });

  const [newPlace, setNewPlace] = useState({
    name: "",
    label: "",
    region: "",
    country: "",
    lat: "",
    lon: "",
    elevationM: "10",
    coastalKm: "20",
    floodHistory: "0",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(false);
  const savingRef = useRef(false);
  const removingRef = useRef(false);

  useEffect(() => {
    if (placeMode !== "new" || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=6&language=en&format=json`
        );
        const data = await res.json();
        setSuggestions(data?.results || []);
      } catch (err) {
        console.warn("Geocoding lookup error", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, placeMode]);

  const selectSuggestion = (item: GeocodingResult) => {
    const fullName = `${item.name}${item.admin1 ? " — " + item.admin1 : ""}`;
    setNewPlace((prev) => ({
      ...prev,
      name: fullName,
      region: item.admin1 || prev.region,
      country: item.country || prev.country,
      lat: item.latitude.toFixed(4),
      lon: item.longitude.toFixed(4),
      elevationM: item.elevation != null ? Math.round(item.elevation).toString() : prev.elevationM,
    }));
    setSearchQuery("");
    setSuggestions([]);
  };

  const save = async () => {
    if (savingRef.current) return;
    if (!form.name) return;

    if (placeMode === "new") {
      if (!newPlace.name || !newPlace.lat || !newPlace.lon) return;
      if (!newPlace.label || newPlace.label.trim() === "") {
        alert("Type is missing! Please fill the Type field.");
        return;
      }
    }

    savingRef.current = true;
    setBusy(true);

    let placeId: number | null = placeMode === "existing" ? (form.placeId ? Number(form.placeId) : null) : null;

    if (placeMode === "new") {
      try {
        const placeRes = await fetch("/api/places", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: newPlace.name,
            label: newPlace.label,
            region: newPlace.region,
            country: newPlace.country,
            lat: Number(newPlace.lat),
            lon: Number(newPlace.lon),
            elevationM: Number(newPlace.elevationM),
            coastalKm: Number(newPlace.coastalKm),
            floodHistory: Number(newPlace.floodHistory),
          }),
        }).then((r) => r.json());
        placeId = placeRes?.place?.id ?? null;
      } catch (err) {
        console.warn("Inline place creation failed", err);
      }
    }

    await fetch("/api/checkin", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: member.id,
        name: form.name,
        role: form.role,
        placeId,
        bloodType: form.bloodType,
        allergies: form.allergies,
        emergencyContact: form.emergencyContact,
      }),
    });

    pingDataChanged();
    savingRef.current = false;
    setBusy(false);
    onDone();
  };

  const removePerson = async () => {
    if (removingRef.current) return;
    if (!window.confirm(`Remove ${member.name} from the household? This can't be undone.`)) return;
    removingRef.current = true;
    setRemoving(true);
    await fetch(`/api/checkin?id=${member.id}`, { method: "DELETE" });
    pingDataChanged();
    removingRef.current = false;
    setRemoving(false);
    onDone();
  };

  const fieldStyle = "w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none";

  return (
    <div className="p-4 bg-surface-2 border-t border-line">
      <h4 className="display text-base font-semibold mb-3">Edit {member.name}</h4>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Full Name</label>
          <input className={fieldStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Role</label>
          <input className={fieldStyle} placeholder="Role (e.g. Adult, Child, Elder, Responder)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Emergency Phone Contact</label>
          <input className={fieldStyle} value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
        </div>
      </div>

      {/* Location — reassign to a saved place, or add a brand-new one right here */}
      <div className="mt-4 border-t border-line pt-3">
        <label className="mono text-[10px] uppercase text-muted mb-2 block">Location</label>
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setPlaceMode("existing")}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${placeMode === "existing" ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2"}`}
          >
            Use existing place
          </button>
          <button
            type="button"
            onClick={() => setPlaceMode("new")}
            className={`rounded-sm border px-3 py-1.5 text-xs font-medium ${placeMode === "new" ? "border-ink bg-ink text-paper" : "border-line bg-surface text-ink-2"}`}
          >
            + Add new place
          </button>
        </div>

        {placeMode === "existing" ? (
          places.length > 0 ? (
            <select className={fieldStyle} value={form.placeId} onChange={(e) => setForm({ ...form, placeId: e.target.value })}>
              {places.map((p) => (
                <option key={p.id} value={p.id}>{p.name.split(" — ")[0]}</option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted">No saved places yet — use "+ Add new place" instead.</p>
          )
        ) : (
          <div className="rounded-md border border-line-strong bg-surface p-3">
            <div className="relative mb-3">
              <label className="mono text-[10px] uppercase text-muted mb-1 block">Search City / Village / Address</label>
              <input
                type="text"
                className={fieldStyle}
                placeholder="Type location name (e.g. Rajapalayam, Kochi, London)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && <div className="absolute right-3 top-8 mono text-xs text-muted">Searching...</div>}
              {suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-line-strong bg-surface p-1 shadow-lg">
                  {suggestions.map((item) => (
                    <li
                      key={item.id}
                      onClick={() => selectSuggestion(item)}
                      className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-surface-2 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-semibold">{item.name}</span>
                        <span className="text-xs text-muted ml-2">{[item.admin1, item.country].filter(Boolean).join(", ")}</span>
                      </div>
                      <span className="mono text-[11px] text-muted">{item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Location Name</label>
                <input className={fieldStyle} placeholder="Name (e.g. Home, Grandma's)" value={newPlace.name} onChange={(e) => setNewPlace({ ...newPlace, name: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Type</label>
                <input className={fieldStyle} placeholder="Type (e.g. Home, Work, School, Farm)" value={newPlace.label} onChange={(e) => setNewPlace({ ...newPlace, label: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Region / State</label>
                <input className={fieldStyle} placeholder="Region" value={newPlace.region} onChange={(e) => setNewPlace({ ...newPlace, region: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Latitude (Auto-filled)</label>
                <input className={fieldStyle} placeholder="Latitude" value={newPlace.lat} onChange={(e) => setNewPlace({ ...newPlace, lat: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Longitude (Auto-filled)</label>
                <input className={fieldStyle} placeholder="Longitude" value={newPlace.lon} onChange={(e) => setNewPlace({ ...newPlace, lon: e.target.value })} />
              </div>
              <div>
                <label className="mono text-[10px] uppercase text-muted mb-1 block">Elevation (Meters)</label>
                <input className={fieldStyle} placeholder="Elevation m" value={newPlace.elevationM} onChange={(e) => setNewPlace({ ...newPlace, elevationM: e.target.value })} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          disabled={busy || !form.name || (placeMode === "new" && (!newPlace.name || !newPlace.lat))}
          onClick={save}
        >
          Save Changes
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <button
          onClick={removePerson}
          disabled={removing}
          className="ml-auto rounded-sm border border-warning bg-warning-bg px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/20"
        >
          {removing ? "Removing..." : "Remove person"}
        </button>
      </div>
    </div>
  );
}

function AddPlaceForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    label: "",
    region: "",
    country: "",
    lat: "",
    lon: "",
    elevationM: "10",
    coastalKm: "20",
    floodHistory: "0",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery.trim())}&count=6&language=en&format=json`
        );
        const data = await res.json();
        if (data && data.results) {
          setSuggestions(data.results);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.warn("Geocoding lookup error", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectSuggestion = (item: GeocodingResult) => {
    const fullName = `${item.name}${item.admin1 ? " — " + item.admin1 : ""}`;
    setForm((prev) => ({
      ...prev,
      name: fullName,
      region: item.admin1 || prev.region,
      country: item.country || prev.country,
      lat: item.latitude.toFixed(4),
      lon: item.longitude.toFixed(4),
      elevationM: item.elevation != null ? Math.round(item.elevation).toString() : prev.elevationM,
    }));
    setSearchQuery("");
    setSuggestions([]);
  };

  const submit = async () => {
    if (submittingRef.current) return;
    if (!form.name || !form.lat || !form.lon) return;
    
    if (!form.label || form.label.trim() === "") {
      alert("Type is missing! Please fill the Type field.");
      return;
    }
    
    submittingRef.current = true;
    setBusy(true);
    await fetch("/api/places", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        label: form.label,
        region: form.region,
        country: form.country,
        lat: Number(form.lat),
        lon: Number(form.lon),
        elevationM: Number(form.elevationM),
        coastalKm: Number(form.coastalKm),
        floodHistory: Number(form.floodHistory),
      }),
    });
    pingDataChanged();
    submittingRef.current = false;
    setBusy(false);
    onDone();
  };

  const fieldStyle = "w-full rounded-sm border border-line bg-surface px-3 py-2 text-sm focus:border-ink focus:outline-none";

  return (
    <Panel className="mb-6 p-4 border-2 border-line-strong">
      <h3 className="display text-lg mb-3 font-semibold">Add a new location</h3>

      <div className="relative mb-4">
        <label className="mono text-[10px] uppercase text-muted mb-1 block">Search City / Village / Address (Autocomplete)</label>
        <input
          type="text"
          className={fieldStyle}
          placeholder="Type location name (e.g. Rajapalayam, Kochi, London, Tokyo)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {searching && <div className="absolute right-3 top-8 mono text-xs text-muted">Searching...</div>}

        {suggestions.length > 0 && (
          <ul className="absolute z-20 left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-md border border-line-strong bg-surface p-1 shadow-lg">
            {suggestions.map((item) => (
              <li
                key={item.id}
                onClick={() => selectSuggestion(item)}
                className="cursor-pointer rounded-sm px-3 py-2 text-sm hover:bg-surface-2 flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-xs text-muted ml-2">{[item.admin1, item.country].filter(Boolean).join(", ")}</span>
                </div>
                <span className="mono text-[11px] text-muted">{item.latitude.toFixed(2)}°, {item.longitude.toFixed(2)}°</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Location Label Name</label>
          <input className={fieldStyle} placeholder="Name (e.g. Home, Work, Grandma's)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Type</label>
          <input className={fieldStyle} placeholder="Type (e.g. Home, Work, School, Farm)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Region / State</label>
          <input className={fieldStyle} placeholder="Region (e.g. Kerala, Tamil Nadu)" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Latitude (Auto-filled)</label>
          <input className={fieldStyle} placeholder="Latitude" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Longitude (Auto-filled)</label>
          <input className={fieldStyle} placeholder="Longitude" value={form.lon} onChange={(e) => setForm({ ...form, lon: e.target.value })} />
        </div>
        <div>
          <label className="mono text-[10px] uppercase text-muted mb-1 block">Elevation (Meters)</label>
          <input className={fieldStyle} placeholder="Elevation m" value={form.elevationM} onChange={(e) => setForm({ ...form, elevationM: e.target.value })} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="primary" disabled={busy || !form.name || !form.lat} onClick={submit}>
          Save Location
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Panel>
  );
}
