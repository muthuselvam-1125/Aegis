"use client";

import { useState } from "react";
import { MapPin, Search, Loader2, CheckCircle, Navigation, Globe } from "lucide-react";

interface LocationSetupModalProps {
  isOpen: boolean;
  onSuccess: (place: any) => void;
  onClose?: () => void;
}

export function LocationSetupModal({ isOpen, onSuccess, onClose }: LocationSetupModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=5&language=en&format=json`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const handleSave = async () => {
    if (!selectedLocation) {
      setError("Please search and select a city from the list.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: selectedLocation.name,
        label: "home",
        lat: selectedLocation.latitude,
        lon: selectedLocation.longitude,
        region: selectedLocation.admin1 || selectedLocation.country || "",
        country: selectedLocation.country || "",
        isPrimary: true,
      };

      const res = await fetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set location");

      if (typeof window !== "undefined") {
        localStorage.removeItem("aegis:location_setup_needed");
      }

      onSuccess(data.place);
    } catch (err: any) {
      setError(err.message || "Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-xl transition-all duration-500">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-slate-900/95 to-black/95 p-8 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3)] text-slate-100">
        
        {/* Decorative Glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center mb-8">
          <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-20" />
            <Globe className="h-10 w-10 text-white" />
          </div>
          <h3 className="text-3xl font-extrabold tracking-tight text-white mb-3">Where are you located?</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Set your primary location to receive tailored AI hazard warnings, accurate weather forecasts, and emergency telemetry.
          </p>
        </div>

        {error && (
          <div className="relative z-10 mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200 font-medium flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            {error}
          </div>
        )}

        <div className="relative z-10 space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur group-hover:opacity-40 transition duration-500" />
            <div className="relative flex items-center bg-slate-900 rounded-2xl border border-white/10 overflow-hidden shadow-inner">
              <Search className="absolute left-4 h-5 w-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="text"
                placeholder="Search city (e.g. Chennai, Tokyo, London)..."
                value={selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : query}
                onChange={(e) => {
                  setSelectedLocation(null);
                  handleSearch(e.target.value);
                }}
                className="w-full bg-transparent pl-12 pr-12 py-4 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 border-none"
              />
              {searching && <Loader2 className="absolute right-4 h-5 w-5 animate-spin text-blue-400" />}
            </div>

            {/* Results Dropdown */}
            {!selectedLocation && results.length > 0 && (
              <div className="absolute left-0 right-0 z-30 mt-2 rounded-2xl border border-white/10 bg-slate-800/95 backdrop-blur-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-white/5 animate-in slide-in-from-top-2">
                {results.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setResults([]);
                    }}
                    className="w-full text-left px-5 py-4 hover:bg-white/5 transition-all flex items-center justify-between group/item"
                  >
                    <div>
                      <div className="font-semibold text-base text-slate-100 group-hover/item:text-blue-400 transition-colors">{loc.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">
                        {loc.admin1 ? `${loc.admin1}, ` : ""}{loc.country}
                      </div>
                    </div>
                    <Navigation className="h-4 w-4 text-slate-500 group-hover/item:text-blue-400 transform group-hover/item:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedLocation && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                 <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white mb-0.5">Location Confirmed</div>
                <div className="text-xs text-emerald-200/70 font-mono">
                  {selectedLocation.name} • {selectedLocation.latitude.toFixed(4)}°N, {selectedLocation.longitude.toFixed(4)}°E
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 pt-4 mt-2">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-4 rounded-2xl font-semibold text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Skip for now
              </button>
            )}
            <button
              disabled={saving || !selectedLocation}
              type="button"
              onClick={handleSave}
              className={`flex-1 py-4 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-3
                ${selectedLocation && !saving 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/25 hover:-translate-y-0.5' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
                }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Saving Location...</span>
                </>
              ) : (
                <>
                  <MapPin className="h-5 w-5" />
                  <span>Complete Setup</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
