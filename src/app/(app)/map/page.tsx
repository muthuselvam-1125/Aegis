"use client";

import { useEffect, useRef, useState } from "react";
import { currentConditions, codeLabel, dirName, type CurrentConditions } from "@/lib/wx";
import { HAZARD_META, SEVERITY_META, type Severity, type HazardType } from "@/lib/hazards";

type Member = {
  id: number;
  name: string;
  role: string;
  placeId: number | null;
  status: string;
  statusNote: string;
  bloodType: string;
  allergies: string;
  medical: string;
  emergencyContact: string;
  lastCheckIn: string | null;
  lastLat?: number;
  lastLon?: number;
};

type Place = {
  id: number;
  name: string;
  label: string;
  region: string;
  country: string;
  authority: string;
  authorityUrl: string;
  elevationM: number;
  coastalKm: number;
  floodHistory: number;
  lat: number;
  lon: number;
};

type AlertT = {
  id: number;
  hazard: HazardType;
  severity: Severity;
  title: string;
  headline: string;
  area: string;
  polygon: number[][] | null;
  placeId: number;
};

type Resource = {
  id: number;
  name: string;
  kind: string;
  lat: number;
  lon: number;
  status: string;
  capacity: number;
  occupancy: number;
  contact: string;
};

type LayerKey = "family" | "places" | "radar" | "hazards" | "resources" | "quakes";

type SearchResult = {
  name: string;
  admin1?: string;
  country?: string;
  lat: number;
  lon: number;
};

export default function PerfectCleanMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const radarLayerRef = useRef<any>(null);
  const layerGroupsRef = useRef<Record<string, any>>({});
  const searchMarkerRef = useRef<any>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    family: true,
    places: true,
    radar: true,
    hazards: true,
    resources: true,
    quakes: true,
  });

  const [baseStyle, setBaseStyle] = useState<"clean" | "dark" | "satellite">("clean");
  const [members, setMembers] = useState<Member[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [alerts, setAlerts] = useState<AlertT[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);

  const [radarTimestamps, setRadarTimestamps] = useState<number[]>([]);
  const [radarFrameIndex, setRadarFrameIndex] = useState<number>(0);
  const [playingRadar, setPlayingRadar] = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  // Location search (Google-Maps-style "jump to place")
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [isLowBandwidth, setIsLowBandwidth] = useState<boolean>(false);

  useEffect(() => {
    const checkPrefs = () => {
      try {
        const raw = localStorage.getItem("aegis:prefs");
        if (raw) {
          const p = JSON.parse(raw);
          setIsLowBandwidth(!!p.lowBandwidth);
          if (p.lowBandwidth) {
            setBaseStyle((s) => (s === "satellite" ? "clean" : s));
            setLayers((l) => ({ ...l, radar: false, quakes: false }));
          }
        }
      } catch {}
    };
    checkPrefs();
    window.addEventListener("aegis:prefs_changed", checkPrefs);
    return () => window.removeEventListener("aegis:prefs_changed", checkPrefs);
  }, []);

  // Load telemetry
  const loadData = async () => {
    try {
      const [memRes, placeRes, alertRes, resRes] = await Promise.all([
        fetch("/api/checkin", { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/places", { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/alerts", { cache: 'no-store' }).then((r) => r.json()),
        fetch("/api/resources", { cache: 'no-store' }).then((r) => r.json()),
      ]);

      setMembers(memRes.members || []);
      setPlaces(placeRes.places || []);
      setAlerts(alertRes.alerts || []);
      setResources(resRes.resources || []);
    } catch (err) {
      console.warn("Telemetry fetch error", err);
    }
  };

  useEffect(() => {
    loadData();

    // Fetch RainViewer radar timestamps
    fetch("https://api.rainviewer.com/public/weather-maps.json")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.radar && data.radar.past) {
          const pastFrames = data.radar.past.map((f: any) => f.time);
          const nowcastFrames = (data.radar.nowcast || []).map((f: any) => f.time);
          const allFrames = [...pastFrames, ...nowcastFrames];
          setRadarTimestamps(allFrames);
          setRadarFrameIndex(pastFrames.length - 1);
        }
      })
      .catch(() => {});

    // Keep family/place/alert data live: react instantly when another tab/page
    // (e.g. the Household page) adds a member/place or changes a status, and
    // fall back to a quiet poll so it self-heals even without that signal.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "aegis:dataUpdatedAt") loadData();
    };
    window.addEventListener("storage", onStorage);
    const pollId = setInterval(loadData, 20000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(pollId);
    };
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Inject Leaflet CSS & Custom DivIcon overrides
    if (!document.getElementById("leaflet-custom-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-custom-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);

      const style = document.createElement("style");
      style.innerHTML = `
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
        @keyframes pulse-red {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
      `;
      document.head.appendChild(style);
    }

    const loadLeaflet = async () => {
      if (!(window as any).L) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const L = (window as any).L;
      if (!L || mapInstanceRef.current) return;

      const tileUrls = {
        clean: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      };

      const labelUrls: Record<string, string | null> = {
        clean: null,
        dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      };

      const map = L.map(mapContainerRef.current, {
        center: [10.25, 76.4],
        zoom: 8,
        zoomControl: false,
      });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const baseTileLayer = L.tileLayer(tileUrls[baseStyle], {
        maxNativeZoom: 18,
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; Esri',
      }).addTo(map);

      (map as any)._baseTileLayer = baseTileLayer;

      if (labelUrls[baseStyle]) {
        (map as any)._labelTileLayer = L.tileLayer(labelUrls[baseStyle] as string, {
          maxNativeZoom: 18,
          maxZoom: 20,
        }).addTo(map);
      }

      // Create Layer Groups
      layerGroupsRef.current = {
        family: L.layerGroup().addTo(map),
        places: L.layerGroup().addTo(map),
        hazards: L.layerGroup().addTo(map),
        resources: L.layerGroup().addTo(map),
        quakes: L.layerGroup().addTo(map),
      };

      // Click location for Open-Meteo telemetry
      map.on("click", async (e: any) => {
        const { lat, lng } = e.latlng;
        const popup = L.popup()
          .setLatLng([lat, lng])
          .setContent(`<div style="font-family: monospace; font-size: 11px; color: #666;">Querying live sensors...</div>`)
          .openOn(map);

        try {
          const wx = await currentConditions(lat, lng);
          const html = `
            <div style="font-family: system-ui, sans-serif; padding: 2px; min-width: 170px;">
              <div style="font-family: monospace; font-size: 10px; color: #888; text-transform: uppercase;">${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E</div>
              <div style="font-size: 26px; font-weight: 700; margin-top: 2px; color: #111;">${Math.round(wx.tempC.mean)}°C</div>
              <div style="font-size: 13px; font-weight: 600; color: #333;">${codeLabel(wx.code)}</div>
              <div style="font-family: monospace; font-size: 11px; margin-top: 8px; color: #444; border-top: 1px solid #eee; padding-top: 6px;">
                <div>Wind: ${wx.windKph} km/h ${dirName(wx.windDir)}</div>
                <div>Humidity: ${wx.humidity}% · AQI: ${wx.aqi}</div>
                <div>Ensemble Match: ${wx.tempC.agreement}%</div>
              </div>
            </div>
          `;
          popup.setContent(html);
        } catch {
          popup.setContent(`<div style="font-family: monospace; font-size: 11px; color: #c00;">Telemetry request failed</div>`);
        }
      });

      mapInstanceRef.current = map;

      // Fetch Earthquakes
      const rawPrefs = localStorage.getItem("aegis:prefs");
      const skipQuakes = rawPrefs ? !!JSON.parse(rawPrefs).lowBandwidth : false;
      if (!skipQuakes) {
        fetch("/api/earthquakes?format=geojson")
          .then((r) => r.json())
          .then((data) => {
            if (!data || !data.features) return;
            data.features.forEach((feat: any) => {
              const [lon, lat, depth] = feat.geometry.coordinates;
              const mag = feat.properties.mag;
              
              // Show Indian seismic tremors (mag >= 2.5) and global earthquakes (mag >= 4.5)
              if (mag < 2.5 || (!feat.properties.isIndia && mag < 4.5)) return;
   
              const marker = L.circleMarker([lat, lon], {
                radius: Math.max(4, mag * 2), // Slightly smaller radius to not cover nearby places visually
                fillColor: feat.properties.isIndia ? "#f97316" : "#a855f7",
                color: "#ffffff",
                weight: 1.5,
                fillOpacity: 0.7,
              });
              marker.bindPopup(`<b>${feat.properties.agency || "Seismic Alert"}</b><br>Magnitude: M${mag}<br>Depth: ${depth}km<br>${feat.properties.place}<br><small style="color:#64748b">${feat.properties.timeIST || ""}</small>`);
              layerGroupsRef.current.quakes?.addLayer(marker);
            });
          })
          .catch(() => {});
      }
    };

    loadLeaflet();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Base Tiles (Clean / Dark / Satellite)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    const tileUrls = {
      clean: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
      dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    };

    const labelUrls: Record<string, string | null> = {
      clean: null,
      dark: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
      satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    };

    if (map._baseTileLayer) {
      map.removeLayer(map._baseTileLayer);
    }
    if (map._labelTileLayer) {
      map.removeLayer(map._labelTileLayer);
    }

    map._baseTileLayer = L.tileLayer(tileUrls[baseStyle], {
      maxNativeZoom: 18,
      maxZoom: 20,
      attribution: "&copy; OpenStreetMap &copy; Esri",
    }).addTo(map);

    if (labelUrls[baseStyle]) {
      map._labelTileLayer = L.tileLayer(labelUrls[baseStyle] as string, {
        maxNativeZoom: 18,
        maxZoom: 20,
      }).addTo(map);
    }
  }, [baseStyle]);

  // Render Saved Places & Family Member Pin Badges
  useEffect(() => {
    const L = (window as any).L;
    const map = mapInstanceRef.current;
    const familyGroup = layerGroupsRef.current.family;
    const placesGroup = layerGroupsRef.current.places;
    if (!L || !map || !familyGroup || !placesGroup) return;

    familyGroup.clearLayers();
    placesGroup.clearLayers();

    const boundsPoints: [number, number][] = [];

    // 1. Render Saved Household Places
    if (places.length > 0) {
      places.forEach((p) => {
        boundsPoints.push([p.lat, p.lon]);

        const placeHtml = `
          <div style="background: #0f172a; color: #ffffff; padding: 4px 8px; border-radius: 6px; font-weight: 700; font-size: 11px; white-space: nowrap; border: 2px solid #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 4px;">
            <span>📍</span> <span>${p.name.split(" — ")[0]}</span>
          </div>
        `;
        const customIcon = L.divIcon({
          html: placeHtml,
          className: "custom-place-badge",
          iconSize: [120, 28],
          iconAnchor: [60, 14],
        });
        const marker = L.marker([p.lat, p.lon], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: system-ui; padding: 2px;">
            <b style="font-size: 14px; color: #0f172a;">${p.name}</b><br>
            <span style="font-size: 11px; color: #64748b;">${p.region}, ${p.country}</span><br>
            <div style="margin-top: 6px; font-size: 12px; font-family: monospace; background: #f1f5f9; padding: 4px; border-radius: 4px;">
              Elevation: ${p.elevationM}m · Coast: ${p.coastalKm}km · Floods: ${p.floodHistory}/10y
            </div>
          </div>
        `);
        placesGroup.addLayer(marker);
      });
    }

    // 2. Render Family Members Pins
    if (members.length > 0) {
      members.forEach((m, idx) => {
        const place = places.find((p) => p.id === m.placeId) || places[0];
        if (!place) return;

        let lat = place.lat;
        let lon = place.lon;

        if (m.lastLat && m.lastLon && m.status === "needs_help") {
          lat = m.lastLat;
          lon = m.lastLon;
        } else {
          // Micro-offset for members at the same location
          const offsetAngle = (idx * (2 * Math.PI)) / Math.max(1, members.length);
          const offsetDist = 0.012;
          lat += Math.sin(offsetAngle) * offsetDist;
          lon += Math.cos(offsetAngle) * offsetDist;
        }

        boundsPoints.push([lat, lon]);

        const isHelp = m.status === "needs_help";
        const isSafe = m.status === "safe";
        const badgeBg = isHelp ? "#ef4444" : isSafe ? "#16a34a" : "#d97706";
        const statusText = isHelp ? "⚠️ SOS" : isSafe ? "✓ Safe" : "Unchecked";
        const pulseAnim = isHelp ? "animation: pulse-red 1.2s infinite;" : "";

        const memberHtml = `
          <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="background: ${badgeBg}; color: white; width: 34px; height: 34px; border-radius: 50%; border: 3px solid white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); ${pulseAnim}">
              ${m.name[0]}
            </div>
            <div style="background: #0f172a; color: white; padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; margin-top: 2px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
              ${m.name} · <span style="color: ${isHelp ? '#fca5a5' : isSafe ? '#4ade80' : '#fcd34d'}">${statusText}</span>
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          html: memberHtml,
          className: "custom-member-badge",
          iconSize: [100, 50],
          iconAnchor: [50, 25],
        });

        const marker = L.marker([lat, lon], { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: system-ui; padding: 4px; min-width: 190px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <b style="font-size: 15px; color: #0f172a;">${m.name}</b>
              <span style="background: ${badgeBg}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;">
                ${m.status.toUpperCase().replace("_", " ")}
              </span>
            </div>
            <div style="font-size: 12px; color: #475569; margin-top: 4px;">Role: ${m.role.toUpperCase()} · Location: ${place.name.split(" — ")[0]}</div>
            ${m.statusNote ? `<div style="background: #fef3c7; color: #92400e; padding: 6px; border-radius: 4px; font-size: 11px; margin-top: 6px; font-weight: 500;">"${m.statusNote}"</div>` : ""}
            ${m.bloodType ? `<div style="font-size: 11px; color: #dc2626; margin-top: 6px; font-weight: 600;">Blood Type: ${m.bloodType}</div>` : ""}
            ${m.emergencyContact ? `<div style="font-size: 11px; color: #0f172a; margin-top: 2px; font-family: monospace;">Phone: ${m.emergencyContact}</div>` : ""}
          </div>
        `);
        familyGroup.addLayer(marker);
      });
    }

    // Auto-fit bounds so all members & places are nicely centered on load
    if (boundsPoints.length > 0 && !(map as any)._hasFitted) {
      (map as any)._hasFitted = true;
      map.fitBounds(boundsPoints, { padding: [60, 60], maxZoom: 11 });
    }
  }, [members, places]);

  // Handle Hazard Polygons
  useEffect(() => {
    const L = (window as any).L;
    const group = layerGroupsRef.current.hazards;
    if (!L || !group) return;
    group.clearLayers();

    alerts.forEach((a) => {
      if (!a.polygon) return;
      const color = a.severity === "emergency" ? "#9a1583" : a.severity === "warning" ? "#bf2a19" : "#b85c00";
      const poly = L.polygon(a.polygon, {
        color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2,
        dashArray: "6, 4",
      });
      poly.bindPopup(`<b>${a.severity.toUpperCase()} ALERT</b><br>${a.title}<br>${a.headline}`);
      group.addLayer(poly);
    });
  }, [alerts]);

  // Master Layer Toggle Effect (Handles visibility of vector groups)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !layerGroupsRef.current) return;

    const toggleGroup = (key: keyof typeof layers) => {
      const group = layerGroupsRef.current[key];
      if (!group) return;
      if (layers[key]) {
        if (!map.hasLayer(group)) map.addLayer(group);
      } else {
        if (map.hasLayer(group)) map.removeLayer(group);
      }
    };

    toggleGroup("family");
    toggleGroup("places");
    toggleGroup("hazards");
    toggleGroup("quakes");
  }, [layers]);

  // Handle RainViewer Radar Overlay with Strict Clamped Native Zoom (Max 6)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L || radarTimestamps.length === 0) return;

    const time = radarTimestamps[radarFrameIndex];
    if (!time) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
    }

    if (layers.radar && !isLowBandwidth) {
      const radarUrl = `https://tilecache.rainviewer.com/v2/radar/${time}/256/{z}/{x}/{y}/2/1_1.png`;
      radarLayerRef.current = L.tileLayer(radarUrl, {
        opacity: 0.55,
        zIndex: 50,
        maxNativeZoom: 6, // STOPS RainViewer from ever returning "Zoom Level Not Supported" tiles!
        maxZoom: 18,
      });
      radarLayerRef.current.addTo(map);
    }
  }, [radarTimestamps, radarFrameIndex, layers.radar, isLowBandwidth]);

  // Handle Radar Playback Timer
  useEffect(() => {
    if (!playingRadar || radarTimestamps.length === 0) return;
    const timer = setInterval(() => {
      setRadarFrameIndex((prev) => (prev + 1) % radarTimestamps.length);
    }, 600);
    return () => clearInterval(timer);
  }, [playingRadar, radarTimestamps]);

  // Debounced place search (Open-Meteo geocoding — same source used elsewhere in the app)
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handle = setTimeout(() => {
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`)
        .then((r) => r.json())
        .then((data) => {
          const results: SearchResult[] = (data.results || []).map((d: any) => ({
            name: d.name,
            admin1: d.admin1,
            country: d.country,
            lat: d.latitude,
            lon: d.longitude,
          }));
          setSearchResults(results);
        })
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  // Close the results dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSearchResults([]);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const flyToResult = (r: SearchResult) => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    map.flyTo([r.lat, r.lon], 12, { duration: 1.2 });

    if (searchMarkerRef.current) {
      map.removeLayer(searchMarkerRef.current);
    }
    const icon = L.divIcon({
      html: `<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
      className: "search-result-marker",
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
    searchMarkerRef.current = L.marker([r.lat, r.lon], { icon }).addTo(map);

    setSearchQuery(r.name);
    setSearchResults([]);
  };

  return (
    <div className="relative h-[calc(100dvh-3rem)] w-full overflow-hidden md:h-[calc(100dvh-2.6rem)] bg-surface">
      {/* GIS Leaflet Map Mount Point */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full z-0" />

      {/* Header Overlay — chip-backed so it reads cleanly in both light and dark theme */}
      <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[70vw] rounded-sm border border-line bg-surface/90 px-2.5 py-1.5 backdrop-blur shadow-sm">
        <div className="mono text-[10px] uppercase tracking-[0.2em] text-muted">
          AEGIS · CLEAN GIS MAP
        </div>
        <div className="display text-xl font-bold text-ink mt-0.5 truncate">
          Household & Hazard Radar
        </div>
      </div>

      {/* Location Search — Google-Maps-style jump-to-place */}
      <div ref={searchWrapRef} className="absolute left-1/2 top-3 z-20 w-[min(90vw,320px)] -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-sm border border-line bg-surface/95 px-3 py-1.5 shadow-sm backdrop-blur">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted">
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchResults[0]) flyToResult(searchResults[0]);
              if (e.key === "Escape") {
                setSearchQuery("");
                setSearchResults([]);
              }
            }}
            placeholder="Search a place…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          {searchLoading && <span className="mono text-[10px] text-muted">···</span>}
          {searchQuery && !searchLoading && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              aria-label="Clear search"
              className="text-muted hover:text-ink"
            >
              ×
            </button>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-sm border border-line bg-surface/97 shadow-lg backdrop-blur">
            {searchResults.map((r, i) => (
              <button
                key={`${r.lat}-${r.lon}-${i}`}
                onClick={() => flyToResult(r)}
                className="flex w-full flex-col items-start gap-0.5 border-b border-line/60 px-3 py-2 text-left last:border-b-0 hover:bg-surface-2"
              >
                <span className="text-sm font-medium text-ink">{r.name}</span>
                <span className="mono text-[10px] text-muted">
                  {[r.admin1, r.country].filter(Boolean).join(", ")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Style & Layer Selectors */}
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        {/* Style Switcher */}
        <div className="flex overflow-hidden rounded-sm border border-line bg-surface/95 backdrop-blur shadow-sm text-xs font-medium">
          <button onClick={() => setBaseStyle("clean")} className={`px-2.5 py-1.5 ${baseStyle === "clean" ? "bg-ink text-paper font-semibold" : "text-ink-2"}`}>
            Clean
          </button>
          <button onClick={() => setBaseStyle("dark")} className={`px-2.5 py-1.5 ${baseStyle === "dark" ? "bg-ink text-paper font-semibold" : "text-ink-2"}`}>
            Dark
          </button>
          <button onClick={() => !isLowBandwidth && setBaseStyle("satellite")} disabled={isLowBandwidth} className={`px-2.5 py-1.5 ${baseStyle === "satellite" ? "bg-ink text-paper font-semibold" : "text-ink-2"} ${isLowBandwidth ? "opacity-30 cursor-not-allowed" : ""}`} title={isLowBandwidth ? "Disabled in Low-Bandwidth mode" : ""}>
            Satellite
          </button>
        </div>

        {/* Layer Drawer */}
        <button onClick={() => setPanelOpen((o) => !o)} className="rounded-sm border border-line bg-surface/95 px-3 py-1.5 text-sm font-medium backdrop-blur shadow-sm text-ink">
          Layers ({Object.values(layers).filter(Boolean).length})
        </button>

        {panelOpen && (
          <div className="absolute right-0 top-10 w-56 rounded-md border border-line bg-surface/97 p-2 backdrop-blur shadow-lg text-ink z-30">
            <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={layers.family} onChange={(e) => setLayers((s) => ({ ...s, family: e.target.checked }))} />
              👨‍👩‍👧 Family ({members.length})
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={layers.places} onChange={(e) => setLayers((s) => ({ ...s, places: e.target.checked }))} />
              📍 Saved Places ({places.length})
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2 ${isLowBandwidth ? "opacity-50" : ""}`} title={isLowBandwidth ? "Disabled in Low-Bandwidth mode" : ""}>
              <input type="checkbox" disabled={isLowBandwidth} checked={layers.radar && !isLowBandwidth} onChange={(e) => setLayers((s) => ({ ...s, radar: e.target.checked }))} />
              🌧️ RainViewer Radar
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2">
              <input type="checkbox" checked={layers.hazards} onChange={(e) => setLayers((s) => ({ ...s, hazards: e.target.checked }))} />
              ⚠️ Active Hazards
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-surface-2 ${isLowBandwidth ? "opacity-50" : ""}`} title={isLowBandwidth ? "Disabled in Low-Bandwidth mode" : ""}>
              <input type="checkbox" disabled={isLowBandwidth} checked={layers.quakes && !isLowBandwidth} onChange={(e) => setLayers((s) => ({ ...s, quakes: e.target.checked }))} />
              🌋 Seismic Telemetry (NCS & USGS)
            </label>
          </div>
        )}
      </div>

      {/* Radar Control Bar */}
      {radarTimestamps.length > 0 && layers.radar && !isLowBandwidth && (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-md border border-line bg-surface/95 px-3 py-2 backdrop-blur shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setPlayingRadar((p) => !p)} className="rounded-sm bg-ink px-3 py-1 text-xs font-medium text-paper">
              {playingRadar ? "❚❚ Pause" : "▶ Play Radar"}
            </button>
            <input
              type="range"
              min={0}
              max={radarTimestamps.length - 1}
              value={radarFrameIndex}
              onChange={(e) => {
                setPlayingRadar(false);
                setRadarFrameIndex(Number(e.target.value));
              }}
              className="flex-1 accent-[var(--live)]"
            />
            <span className="mono text-xs text-muted w-28 text-right">
              {new Date(radarTimestamps[radarFrameIndex] * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
