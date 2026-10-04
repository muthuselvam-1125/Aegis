"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { RainBackground } from "@/components/RainBackground";
import Link from "next/link";
import { CloudRain, MapPin, Loader2, ArrowRight } from "lucide-react";
import { GoogleIcon } from "@/components/AuthShared";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [locationResults, setLocationResults] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Debounce ref
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const searchLocation = (text: string) => {
    setQuery(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    if (text.length < 3) {
      setLocationResults([]);
      return;
    }
    
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${text}&count=5&language=en&format=json`);
        const data = await res.json();
        setLocationResults(data.results || []);
      } catch (e) {
        console.error(e);
      }
    }, 400);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&localityLanguage=en`);
          const data = await res.json();
          setSelectedLocation({
            name: data.city || data.locality || "Current Location",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            country: data.countryName || "",
            admin1: data.principalSubdivision || "",
          });
          setError("");
        } catch (e) {
          setSelectedLocation({
            name: "Current Location",
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            country: "Unknown",
            admin1: "",
          });
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Failed to retrieve location automatically. Please type manually.");
        setLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    let finalLocation = selectedLocation;
    
    // Auto-select the first result if they just typed and didn't click the dropdown
    if (!finalLocation && locationResults.length > 0) {
      finalLocation = locationResults[0];
      setSelectedLocation(finalLocation);
      setLocationResults([]);
    } else if (!finalLocation && query && query.length > 2) {
      // Fallback if API is blocked or slow on mobile network
      finalLocation = {
        name: query,
        latitude: 0,
        longitude: 0,
        country: "Unknown",
        admin1: ""
      };
    }
    
    if (!finalLocation) {
      setError("Please type a home city name.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, location: finalLocation }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");
      
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 overflow-y-auto text-slate-100 font-sans">
      <RainBackground />
      
      <div className="relative z-10 w-full max-w-md my-8 p-8 sm:p-10 rounded-2xl bg-[#0B0F19]/80 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/5">
        
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-b from-blue-500/20 to-indigo-500/10 border border-blue-500/30 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(59,130,246,0.4)]">
            <CloudRain className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <h2 className="text-3xl font-semibold text-center mb-2 tracking-tight text-white">
          Join AEGIS
        </h2>
        <p className="text-center text-slate-400 mb-8 text-sm font-medium">
          Advanced climate defense & early warnings.
        </p>

        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Full Name</label>
            <input
              required
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-slate-100 focus:bg-black/40 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 placeholder-slate-500/70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Email Address</label>
            <input
              required
              type="email"
              autoComplete="off"
              placeholder=""
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-slate-100 focus:bg-black/40 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 placeholder-slate-500/70"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Password</label>
            <input
              required
              type="password"
              autoComplete="new-password"
              placeholder=""
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-slate-100 focus:bg-black/40 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 placeholder-slate-500/70"
            />
          </div>

          {/* Location Autocomplete */}
          <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest ml-1 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-blue-400" /> Home Location</span>
              <button type="button" onClick={handleGeolocation} className="text-[10px] uppercase font-bold tracking-wider text-blue-400 hover:text-blue-300 transition-colors">
                Auto-detect
              </button>
            </label>
            <input
              required
              type="text"
              placeholder="Search city (e.g. Sivakasi)..."
              value={selectedLocation ? `${selectedLocation.name}, ${selectedLocation.country}` : query}
              onChange={(e) => {
                setSelectedLocation(null);
                searchLocation(e.target.value);
              }}
              className="w-full px-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-slate-100 focus:bg-black/40 focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all duration-300 placeholder-slate-500/70"
            />
            {/* Dropdown */}
            {!selectedLocation && locationResults.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-[#121827] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] ring-1 ring-white/5 overflow-hidden max-h-48 overflow-y-auto">
                {locationResults.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setLocationResults([]);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex flex-col"
                  >
                    <span className="font-medium text-slate-200">{loc.name}</span>
                    <span className="text-xs text-slate-400">
                      {loc.admin1 ? `${loc.admin1}, ` : ""}{loc.country}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-2 px-4 py-3 border border-red-500/30 bg-red-500/10 text-red-400 text-sm rounded-xl font-medium text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mt-2 px-4 py-3 border border-green-500/30 bg-green-500/10 text-green-400 text-sm rounded-xl font-medium text-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
              Account created successfully! Redirecting...
            </div>
          )}

          <button
            disabled={loading}
            type="button"
            onClick={handleRegister}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium shadow-[0_0_20px_-5px_rgba(59,130,246,0.5)] hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.7)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Account"}
            {!loading && <ArrowRight className="h-5 w-5" />}
          </button>
        </div>

        <div className="flex items-center gap-3 mt-8 mb-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-xs text-slate-500 font-semibold tracking-wider">OR</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent via-white/10 to-transparent" />
        </div>

        <GoogleSignInButton label="Continue with Google" />

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}