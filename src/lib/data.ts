import { db } from "@/db";
import { places, members, alerts, reports, resources, checklist, userChecklistProgress, confirmations, users } from "@/db/schema";
import { eq, desc, sql, and, inArray } from "drizzle-orm";
import { sendAlertEmail, sendAlertEmailMulti } from "./email";
import { sendAlertSMS } from "./sms";
import { topRisks, SEVERITY_META, type Severity, type HazardType } from "./hazards";
import { currentConditions, hourly } from "./wx";
import { calculateCoastalDistanceKm, fetchElevation } from "./gis";

function parsePlaceId(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "new") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

const DEFAULT_PLACES: any[] = [];

export const DEFAULT_CHECKLIST_ITEMS = [
  // General Essentials (Core Go-Bag)
  { hazard: "general", item: "3-day supply of drinking water (3L per person per day)", detail: "Sealed potable water containers; rotate every 6 months", done: false, sortOrder: 1 },
  { hazard: "general", item: "Ready-to-eat non-perishable food rations", detail: "High-calorie energy bars, canned protein, dry fruits, manual opener", done: false, sortOrder: 2 },
  { hazard: "general", item: "Comprehensive trauma & first aid kit", detail: "Tourniquet, sterile gauze, bandages, antiseptic wipes, burn dressing", done: false, sortOrder: 3 },
  { hazard: "general", item: "7-day supply of critical prescription medications", detail: "Include written doctor prescriptions and medical alert info", done: false, sortOrder: 4 },
  { hazard: "general", item: "Emergency multi-band radio & waterproof LED torch", detail: "Solar or hand-crank powered with spare batteries and USB output", done: false, sortOrder: 5 },
  { hazard: "general", item: "Laminated copies of government IDs & emergency cash", detail: "Aadhaar/Passports, insurance policies, small cash bills in waterproof pouch", done: false, sortOrder: 6 },

  // Flood Response
  { hazard: "flood", item: "Submersible heavy-duty waterproof dry bags", detail: "Seal all electronics, documents, and warm clothing inside airtight dry sacks", done: false, sortOrder: 10 },
  { hazard: "flood", item: "High-traction rubber boots & neoprene wading shoes", detail: "Prevents puncture wounds from submerged debris and contaminated runoff", done: false, sortOrder: 11 },
  { hazard: "flood", item: "Water purification tablets & 0.1-micron filter straw", detail: "Chlorine dioxide tablets or portable gravity filter for non-potable water", done: false, sortOrder: 12 },
  { hazard: "flood", item: "Coast guard-approved personal flotation device (life vest)", detail: "With rescue whistle attached; fitted for each household member", done: false, sortOrder: 13 },
  { hazard: "flood", item: "Heavy-duty waterproof poncho & thermal foil survival blanket", detail: "Guards against rapid hypothermia during prolonged wet exposure", done: false, sortOrder: 14 },

  // Cyclone / High Wind
  { hazard: "cyclone", item: "Rugged high-capacity power bank & braided cables", detail: "Minimum 20,000mAh battery pack to sustain phone comms across grid blackouts", done: false, sortOrder: 20 },
  { hazard: "cyclone", item: "Heavy-duty reinforced tarpaulin & 550 military paracord", detail: "Quick roof patching, window breach covers, and emergency rain shelter", done: false, sortOrder: 21 },
  { hazard: "cyclone", item: "Impact-resistant safety goggles & leather work gloves", detail: "Shields eyes and hands from high-velocity airborne debris and shattered glass", done: false, sortOrder: 22 },
  { hazard: "cyclone", item: "Pea-less emergency rescue whistle (120dB)", detail: "Audible over gale-force cyclone winds to signal first responders", done: false, sortOrder: 23 },
  { hazard: "cyclone", item: "Heavy duct tape, zip-ties & multi-tool", detail: "Fast mechanical reinforcement for doors, shutters, and broken structural seals", done: false, sortOrder: 24 },

  // Landslide / Slope Failure
  { hazard: "landslide", item: "Rigid steel-toe / vibram-soled hiking boots", detail: "Essential traction for scrambling across loose shale, muddy scree, and debris fields", done: false, sortOrder: 30 },
  { hazard: "landslide", item: "High-lumen hands-free LED headlamp with red strobe", detail: "Maintains two-handed mobility during night evacuations on unstable slopes", done: false, sortOrder: 31 },
  { hazard: "landslide", item: "Compact folding carbon-steel trench shovel (e-tool)", detail: "Clear blocked drainage culverts or dig out pinned doorways and paths", done: false, sortOrder: 32 },
  { hazard: "landslide", item: "N95 / FFP2 particulate respirators", detail: "Filters fine mineral dust, pulverized stone, and soil aerosols during slope failures", done: false, sortOrder: 33 },
  { hazard: "landslide", item: "High-visibility reflective emergency vest", detail: "Enables fast visual acquisition by search-and-rescue teams and heavy machinery", done: false, sortOrder: 34 },

  // Extreme Heat
  { hazard: "heat", item: "Oral Rehydration Salts (ORS) & electrolyte hydration packs", detail: "WHO-standard formula to prevent rapid hypovolemic electrolyte collapse", done: false, sortOrder: 40 },
  { hazard: "heat", item: "Wide-brim UV-protective sun hat & polarized sunglasses", detail: "UPF 50+ brim shields head, neck, and eyes from direct solar radiation", done: false, sortOrder: 41 },
  { hazard: "heat", item: "Instant-activation chemical cold packs", detail: "Rapid evaporative cooling for armpits, neck, and groin in suspected heat stroke", done: false, sortOrder: 42 },
  { hazard: "heat", item: "Battery-powered handheld misting fan & spare AA cells", detail: "Provides forced convective cooling during heatwaves and shelter power outages", done: false, sortOrder: 43 },
  { hazard: "heat", item: "Broad-spectrum SPF 50+ mineral sunscreen & aloe vera gel", detail: "Guards against incapacitating second-degree burns during emergency exposure", done: false, sortOrder: 44 },

  // Extreme Cold / Freeze
  { hazard: "cold", item: "Sub-zero emergency thermal space bivvy & foil blanket", detail: "Reflects 90% of radiated body heat; prevents lethal hypothermia in unheated spaces", done: false, sortOrder: 50 },
  { hazard: "cold", item: "Air-activated chemical hand, foot, and body warmers", detail: "10-18 hour continuous warmth for extremities during winter grid or heating failure", done: false, sortOrder: 51 },
  { hazard: "cold", item: "Merino wool thermal base layers & windproof balaclava", detail: "Retains insulative loft even when damp; avoids cotton's deadly chill factor", done: false, sortOrder: 52 },
  { hazard: "cold", item: "Stormproof wind-resistant matches & magnesium striker", detail: "Reliable fire ignition for emergency warming or melting snow into drinking water", done: false, sortOrder: 53 },
  { hazard: "cold", item: "Double-wall insulated vacuum flask (thermos)", detail: "Keeps boiled water hot for up to 24 hours to prevent internal core chill", done: false, sortOrder: 54 },
];

export const DEFAULT_RESOURCES = [
  {
    name: "Delhi Central Municipal Disaster Relief Complex",
    kind: "shelter",
    lat: 28.6139,
    lon: 77.2090,
    area: "Central Delhi, NCT",
    status: "open",
    capacity: 450,
    occupancy: 290,
    contact: "+91 11 2343 8000 (Delhi Disaster Management Authority)",
  },
  {
    name: "Srinagar Rajbagh Flood & Alpine Emergency Shelter",
    kind: "shelter",
    lat: 34.0837,
    lon: 74.7973,
    area: "Rajbagh, Srinagar, J&K",
    status: "open",
    capacity: 300,
    occupancy: 185,
    contact: "+91 194 245 2138 (J&K Disaster Management Cell)",
  },
  {
    name: "Puri Coastal Multi-Purpose Evacuation Center",
    kind: "shelter",
    lat: 19.8135,
    lon: 85.8312,
    area: "Puri Coastal Belt, Odisha",
    status: "open",
    capacity: 600,
    occupancy: 410,
    contact: "+91 6752 222 001 (ODRAF Coastal Command)",
  },
  {
    name: "Velachery High-Ground Relief & Medical Station",
    kind: "shelter",
    lat: 12.9815,
    lon: 80.2180,
    area: "Velachery, Chennai, Tamil Nadu",
    status: "open",
    capacity: 350,
    occupancy: 210,
    contact: "+91 44 2561 9206 (Greater Chennai Corp Control Room)",
  },
  {
    name: "Bandra Kurla Civic Disaster Transit Center",
    kind: "shelter",
    lat: 19.0607,
    lon: 72.8687,
    area: "Bandra East, Mumbai, Maharashtra",
    status: "open",
    capacity: 500,
    occupancy: 320,
    contact: "+91 22 2269 4725 (BMC Emergency Operations Center)",
  },
  {
    name: "Doon Valley Foothills Hazard Shelter",
    kind: "shelter",
    lat: 30.3165,
    lon: 78.0322,
    area: "Dehradun Foothills, Uttarakhand",
    status: "open",
    capacity: 250,
    occupancy: 140,
    contact: "+91 135 271 0334 (Uttarakhand SDRF HQ)",
  },
];

let initDone = false;

async function ensureSeeded() {
  if (initDone) return;
  try {
    // 1. Auto-create all tables if missing
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "places" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "label" TEXT NOT NULL DEFAULT 'home',
        "lat" DOUBLE PRECISION NOT NULL,
        "lon" DOUBLE PRECISION NOT NULL,
        "region" TEXT NOT NULL DEFAULT '',
        "country" TEXT NOT NULL DEFAULT '',
        "authority" TEXT NOT NULL DEFAULT '',
        "authority_url" TEXT NOT NULL DEFAULT '',
        "elevation_m" INTEGER NOT NULL DEFAULT 0,
        "coastal_km" DOUBLE PRECISION NOT NULL DEFAULT 50,
        "flood_history" INTEGER NOT NULL DEFAULT 0,
        "is_primary" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "user_id" INTEGER
      );

      CREATE TABLE IF NOT EXISTS "members" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL DEFAULT 'adult',
        "place_id" INTEGER,
        "status" TEXT NOT NULL DEFAULT 'unknown',
        "status_note" TEXT NOT NULL DEFAULT '',
        "blood_type" TEXT NOT NULL DEFAULT '',
        "allergies" TEXT NOT NULL DEFAULT '',
        "medical" TEXT NOT NULL DEFAULT '',
        "emergency_contact" TEXT NOT NULL DEFAULT '',
        "last_check_in" TIMESTAMP,
        "user_id" INTEGER
      );
      
      ALTER TABLE "places" ADD COLUMN IF NOT EXISTS "user_id" INTEGER;
      ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "user_id" INTEGER;
      ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "last_lat" DOUBLE PRECISION;
      ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "last_lon" DOUBLE PRECISION;

      CREATE TABLE IF NOT EXISTS "alerts" (
        "id" SERIAL PRIMARY KEY,
        "hazard" TEXT NOT NULL,
        "severity" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "headline" TEXT NOT NULL,
        "instruction" TEXT NOT NULL,
        "area" TEXT NOT NULL,
        "place_id" INTEGER,
        "source" TEXT NOT NULL DEFAULT 'platform',
        "source_name" TEXT NOT NULL DEFAULT '',
        "source_url" TEXT NOT NULL DEFAULT '',
        "confidence" INTEGER NOT NULL DEFAULT 70,
        "onset" TIMESTAMP NOT NULL DEFAULT NOW(),
        "expires" TIMESTAMP NOT NULL,
        "polygon" JSONB,
        "active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "reports" (
        "id" SERIAL PRIMARY KEY,
        "hazard" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "area" TEXT NOT NULL DEFAULT '',
        "lat" DOUBLE PRECISION,
        "lon" DOUBLE PRECISION,
        "reporter" TEXT NOT NULL DEFAULT 'Anonymous',
        "kind" TEXT NOT NULL DEFAULT 'observation',
        "verified" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "resources" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "kind" TEXT NOT NULL,
        "lat" DOUBLE PRECISION NOT NULL,
        "lon" DOUBLE PRECISION NOT NULL,
        "area" TEXT NOT NULL DEFAULT '',
        "status" TEXT NOT NULL DEFAULT 'open',
        "capacity" INTEGER NOT NULL DEFAULT 0,
        "occupancy" INTEGER NOT NULL DEFAULT 0,
        "contact" TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "email" TEXT UNIQUE NOT NULL,
        "password_hash" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "avatar_url" TEXT DEFAULT '',
        "is_verified" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "password_resets" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "token" TEXT NOT NULL,
        "expires_at" TIMESTAMP NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS "checklist" (
        "id" SERIAL PRIMARY KEY,
        "hazard" TEXT NOT NULL,
        "item" TEXT NOT NULL,
        "detail" TEXT NOT NULL DEFAULT '',
        "done" BOOLEAN NOT NULL DEFAULT false,
        "sort_order" INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS "user_checklist_progress" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL,
        "checklist_id" INTEGER NOT NULL,
        "done" BOOLEAN NOT NULL DEFAULT false,
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_checklist_progress_uid_cid" ON "user_checklist_progress" ("user_id", "checklist_id");
    `);

    // 2. Seed default places if empty
    let existingPlaces = await db.select().from(places);
    if (existingPlaces.length === 0) {
      console.log("🌱 Auto-seeding default places...");
      existingPlaces = await db.insert(places).values(DEFAULT_PLACES).returning();
    }

    // 3. Seed default curated checklist items if empty
    try {
      const existingChecklist = await db.select().from(checklist);
      if (existingChecklist.length === 0) {
        console.log("🌱 Auto-seeding curated emergency go-bag checklist items...");
        await db.insert(checklist).values(DEFAULT_CHECKLIST_ITEMS);
      }
    } catch (checklistSeedErr) {
      console.warn("Checklist seeding non-fatal error:", checklistSeedErr);
    }

    // 4. Seed default emergency resources if empty
    try {
      const existingResources = await db.select().from(resources);
      if (existingResources.length === 0) {
        console.log("🌱 Auto-seeding initial emergency shelter resources...");
        await db.insert(resources).values(DEFAULT_RESOURCES);
      }
    } catch (resourceSeedErr) {
      console.warn("Resource seeding non-fatal error:", resourceSeedErr);
    }

    // 3. (Removed auto-seeding of default members to prevent unwanted data)

    // 4. Calibrate any existing places that have missing elevation or uncalculated coastal distances
    try {
      const existingDbPlaces = await db.select().from(places);
      for (const p of existingDbPlaces) {
        let needsUpdate = false;
        let elev = p.elevationM;
        let coast = p.coastalKm;
        if (elev <= 0 && (p.lat !== 0 || p.lon !== 0)) {
          elev = await fetchElevation(p.lat, p.lon);
          needsUpdate = true;
        }
        if ((coast === 20 || coast === 50 || coast <= 0) && (p.lat !== 0 || p.lon !== 0)) {
          coast = calculateCoastalDistanceKm(p.lat, p.lon);
          needsUpdate = true;
        }
        if (needsUpdate) {
          await db.update(places).set({ elevationM: elev, coastalKm: coast }).where(eq(places.id, p.id));
        }
      }
    } catch (calibErr) {
      console.warn("GIS calibration non-fatal error:", calibErr);
    }

    initDone = true;
  } catch (e) {
    console.warn("Auto init & seeding error:", e);
  }
}

// PLACES
interface PlacesCacheEntry {
  places: any[];
  timestamp: number;
}
const placesCache = new Map<string, PlacesCacheEntry>();

export function invalidatePlacesCache(userId?: number) {
  if (userId) placesCache.delete(`user_${userId}`);
  placesCache.delete("all");
}

export async function getPlaces(userId?: number) {
  const cacheKey = userId ? `user_${userId}` : "all";
  const cached = placesCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 30000) {
    return cached.places;
  }
  try {
    await ensureSeeded();
    let query = db.select().from(places);
    if (userId) {
      query = query.where(eq(places.userId, userId)) as any;
    }
    const result = await query.orderBy(desc(places.id));
    placesCache.set(cacheKey, { places: result, timestamp: Date.now() });
    return result;
  } catch (e) {
    console.error("getPlaces DB error:", e);
    return cached?.places || [];
  }
}

export async function getPlace(id: number) {
  try {
    await ensureSeeded();
    const rows = await db.select().from(places).where(eq(places.id, id)).limit(1);
    if (rows.length > 0) return rows[0];
    const all = await getPlaces();
    return all.find((p) => p.id === id) || all[0] || null;
  } catch (e) {
    console.error("getPlace DB error:", e);
    return null;
  }
}

export async function addPlace(data: any, userId?: number) {
  try {
    await ensureSeeded();
    if (data.isPrimary && userId) {
      await db.update(places).set({ isPrimary: false }).where(eq(places.userId, userId));
    }
    const lat = Number(data.lat || 0);
    const lon = Number(data.lon || 0);
    let elevationM = Number(data.elevationM || 0);
    if ((elevationM <= 0 || elevationM === 10) && (lat !== 0 || lon !== 0)) {
      elevationM = await fetchElevation(lat, lon);
    }
    const coastalKm = data.coastalKm != null && Number(data.coastalKm) > 0 && Number(data.coastalKm) !== 20 && Number(data.coastalKm) !== 50
      ? Number(data.coastalKm)
      : calculateCoastalDistanceKm(lat, lon);

    const cleanName = (data.name || "").split(" — ")[0].trim() || data.name;
    const region = (data.region || (data.name?.includes(" — ") ? data.name.split(" — ")[1].trim() : "")).trim();

    const [newPlace] = await db.insert(places).values({
      name: cleanName,
      label: data.label || "home",
      lat,
      lon,
      region,
      country: data.country || "",
      authority: data.authority || "",
      authorityUrl: data.authorityUrl || "",
      elevationM,
      coastalKm,
      floodHistory: Number(data.floodHistory || 0),
      isPrimary: Boolean(data.isPrimary || false),
      userId: userId || null,
    }).returning();
    invalidatePlacesCache(userId);
    return newPlace;
  } catch (e) {
    console.error("addPlace DB error:", e);
    throw e;
  }
}

export async function deletePlace(id: number, userId?: number) {
  try {
    await ensureSeeded();
    const condition = userId
      ? and(eq(places.id, id), eq(places.userId, userId))
      : eq(places.id, id);
    await db.delete(alerts).where(eq(alerts.placeId, id));
    await db.delete(members).where(eq(members.placeId, id));
    await db.delete(places).where(condition);
    invalidatePlacesCache(userId);
    return true;
  } catch (e) {
    console.error("deletePlace DB error:", e);
    throw e;
  }
}

// MEMBERS
export async function getMembers(userId?: number) {
  try {
    await ensureSeeded();
    let query = db.select().from(members);
    if (userId) {
      query = query.where(eq(members.userId, userId)) as any;
    }
    return await query;
  } catch (e) {
    console.error("getMembers DB error:", e);
    return [];
  }
}

export async function addMember(data: any, userId?: number) {
  try {
    await ensureSeeded();
    const [newMember] = await db.insert(members).values({
      name: data.name,
      role: data.role || "adult",
      placeId: parsePlaceId(data.placeId),
      status: data.status || "unknown",
      statusNote: data.statusNote || "",
      bloodType: data.bloodType || "",
      allergies: data.allergies || "",
      medical: data.medical || "",
      emergencyContact: data.emergencyContact || "",
      lastCheckIn: new Date(),
      userId: userId || null,
    }).returning();
    return newMember;
  } catch (e) {
    console.error("addMember DB error:", e);
    throw e;
  }
}

export async function updateMember(id: number, data: any, userId?: number) {
  try {
    await ensureSeeded();
    const updatePayload: any = { ...data, lastCheckIn: new Date() };
    if ("placeId" in data) {
      updatePayload.placeId = parsePlaceId(data.placeId);
    }
    if ("lastLat" in data) updatePayload.lastLat = data.lastLat;
    if ("lastLon" in data) updatePayload.lastLon = data.lastLon;

    const condition = userId
      ? and(eq(members.id, id), eq(members.userId, userId))
      : eq(members.id, id);

    const [updated] = await db.update(members)
      .set(updatePayload)
      .where(condition)
      .returning();
    return updated || null;
  } catch (e) {
    console.error("updateMember DB error:", e);
    throw e;
  }
}

export async function deleteMember(id: number, userId?: number) {
  try {
    await ensureSeeded();
    const condition = userId
      ? and(eq(members.id, id), eq(members.userId, userId))
      : eq(members.id, id);

    const result = await db.delete(members).where(condition).returning();
    return result.length > 0;
  } catch (e) {
    console.error("deleteMember DB error:", e);
    throw e;
  }
}

// ALERTS
export async function getAlerts(userId?: number) {
  try {
    await ensureSeeded();
    const allAlertsDb = await db.select().from(alerts);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const allAlerts = allAlertsDb.filter(a => new Date(a.expires) > twentyFourHoursAgo || new Date(a.onset) > twentyFourHoursAgo);

    // Aggregate community ground-truth confirmations for each alert
    const allConfirmations = await db.select().from(confirmations);
    const confirmMap = new Map<number, { confirm: number; deny: number }>();
    for (const c of allConfirmations) {
      const tally = confirmMap.get(c.alertId) || { confirm: 0, deny: 0 };
      if (c.verdict === "confirm") tally.confirm++;
      else if (c.verdict === "deny") tally.deny++;
      confirmMap.set(c.alertId, tally);
    }

    const alertsWithCounts = allAlerts.map((a) => {
      const tally = confirmMap.get(a.id) || { confirm: 0, deny: 0 };
      return {
        ...a,
        confirm: tally.confirm,
        deny: tally.deny,
      };
    });

    if (userId) {
      const userPlaces = await getPlaces(userId);
      if (userPlaces.length > 0) {
        const userPlaceIds = new Set(userPlaces.map((p) => p.id));
        const userPlaceNames = userPlaces.map((p) => p.name.toLowerCase().trim());
        return alertsWithCounts.filter((a) => {
          if (a.placeId && userPlaceIds.has(a.placeId)) return true;
          if (a.area && userPlaceNames.some((name) => a.area.toLowerCase().includes(name))) return true;
          return false;
        });
      }
      return []; // Return empty array if user has no places, instead of all alerts
    }
    return alertsWithCounts; // For public view / no user
  } catch (e) {
    return [];
  }
}

// REPORTS
export async function getReports() {
  try {
    await ensureSeeded();
    const data = await db.select().from(reports).orderBy(desc(reports.createdAt));
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    return data.filter((r: any) => new Date(r.createdAt).getTime() > sevenDaysAgo);
  } catch (e) {
    return [];
  }
}

export async function addReport(data: { hazard: string; body: string; area: string; reporter: string; kind: string }) {
  try {
    await ensureSeeded();
    const [newReport] = await db.insert(reports).values({
      hazard: data.hazard || "flood",
      body: data.body,
      area: data.area || "",
      reporter: data.reporter || "Anonymous",
      kind: data.kind || "observation",
      verified: false,
    }).returning();
    return newReport;
  } catch (e) {
    throw e;
  }
}

export async function updateReportVerified(id: number, verified: boolean) {
  try {
    await ensureSeeded();
    const [updated] = await db.update(reports)
      .set({ verified })
      .where(eq(reports.id, id))
      .returning();
    return updated;
  } catch (e) {
    throw e;
  }
}

// RESOURCES
export async function getResources() {
  try {
    await ensureSeeded();
    return await db.select().from(resources);
  } catch (e) {
    return [];
  }
}

// CHECKLIST
export async function getChecklist(userId?: number) {
  try {
    await ensureSeeded();
    const allItems = await db.select().from(checklist).orderBy(checklist.sortOrder, checklist.id);
    if (!userId) {
      return allItems;
    }
    const progress = await db
      .select()
      .from(userChecklistProgress)
      .where(eq(userChecklistProgress.userId, userId));
    const progressMap = new Map<number, boolean>();
    for (const p of progress) {
      progressMap.set(p.checklistId, p.done);
    }
    return allItems.map((it) => ({
      ...it,
      done: progressMap.has(it.id) ? !!progressMap.get(it.id) : false,
    }));
  } catch (e) {
    console.error("Error in getChecklist:", e);
    return [];
  }
}

export async function updateChecklistProgress(userId: number, checklistId: number, done: boolean) {
  try {
    await ensureSeeded();
    const existing = await db
      .select()
      .from(userChecklistProgress)
      .where(and(eq(userChecklistProgress.userId, userId), eq(userChecklistProgress.checklistId, checklistId)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userChecklistProgress)
        .set({ done, updatedAt: new Date() })
        .where(eq(userChecklistProgress.id, existing[0].id));
    } else {
      await db.insert(userChecklistProgress).values({
        userId,
        checklistId,
        done,
        updatedAt: new Date(),
      });
    }
    return true;
  } catch (e) {
    console.error("Error in updateChecklistProgress:", e);
    throw e;
  }
}

/**
 * Resolves all authenticated user email addresses that should be alerted for a given place & hazard severity.
 * 1. Checks GLOBAL_ALERT_BROADCAST: if enabled, alerts all active registered users.
 * 2. Checks geographic coverage: fetches the place owner (place.userId) plus any users with saved places
 *    in the same city, region, or within ~60km proximity.
 * 3. For critical warning/emergency alerts, if no place owner was resolved, falls back to broadcasting to
 *    all registered accounts so life-safety guidance is never dropped.
 */
export async function getUsersToNotifyForPlace(place: any, severity: string): Promise<string[]> {
  try {
    const isGlobal = process.env.GLOBAL_ALERT_BROADCAST === "true";
    if (isGlobal) {
      const allUsers = await db.select({ email: users.email }).from(users);
      return [...new Set(allUsers.map((u) => u.email.trim().toLowerCase()).filter((e) => e.includes("@")))];
    }

    const userIds = new Set<number>();
    if (place.userId) {
      userIds.add(place.userId);
    }

    // Query all places to match users who have locations in this city, region, or proximity
    const allPlaces = await db.select({
      id: places.id,
      name: places.name,
      lat: places.lat,
      lon: places.lon,
      region: places.region,
      userId: places.userId,
    }).from(places);

    const targetCity = (place.name || "").trim().toLowerCase();
    const targetRegion = (place.region || "").trim().toLowerCase();

    for (const p of allPlaces) {
      if (!p.userId) continue;
      const cityName = (p.name || "").trim().toLowerCase();
      const regionName = (p.region || "").trim().toLowerCase();

      const nameMatch = cityName === targetCity || cityName.includes(targetCity) || targetCity.includes(cityName);
      const regionMatch = Boolean(targetRegion && regionName && targetRegion === regionName);

      // Distance in km
      const dLat = (p.lat - place.lat) * 111;
      const dLon = (p.lon - place.lon) * 111 * Math.cos((place.lat * Math.PI) / 180);
      const distKm = Math.hypot(dLat, dLon);

      if (nameMatch || distKm <= 60 || (regionMatch && distKm <= 90)) {
        userIds.add(p.userId);
      }
    }

    const isCritical = severity === "emergency" || severity === "warning";

    // If critical alert and no place-matched user was found, broadcast to all registered users
    if (userIds.size === 0 && isCritical) {
      const allUsers = await db.select({ email: users.email }).from(users);
      return [...new Set(allUsers.map((u) => u.email.trim().toLowerCase()).filter((e) => e.includes("@")))];
    }

    if (userIds.size > 0) {
      const matchedUsers = await db.select({ email: users.email }).from(users).where(inArray(users.id, Array.from(userIds)));
      const emails = [...new Set(matchedUsers.map((u) => u.email.trim().toLowerCase()).filter((e) => e.includes("@")))];
      if (emails.length > 0) return emails;
    }

    // Default fallback to all users for safety if no specific matches
    const allUsers = await db.select({ email: users.email }).from(users);
    return [...new Set(allUsers.map((u) => u.email.trim().toLowerCase()).filter((e) => e.includes("@")))];
  } catch (err) {
    console.error("[getUsersToNotifyForPlace] Error resolving users:", err);
    return [];
  }
}

// SAFE AUTO-SYNC SYSTEM FOR PLATFORM ALERTS

let lastSync = 0;

export async function syncPlatformAlerts(forceDigest = false) {
  try {
    const now = Date.now();
    // Only run this once every 10 seconds maximum to avoid spamming the weather API (bypass if forceDigest)
    if (!forceDigest && now - lastSync < 10000) return { skipped: true, reason: "cooldown" };
    lastSync = now;
    
    await ensureSeeded();
    const allPlaces = await db.select().from(places);
    
    await Promise.all(allPlaces.map(async (p) => {
      try {
        const wx = await currentConditions(p.lat, p.lon);
        if (wx.isOffline) {
          console.warn(`[syncPlatformAlerts] Weather API offline for ${p.name}. Skipping alert sync to prevent fake alerts.`);
          return;
        }
        const risks = await topRisks(p, new Date(), wx);
        
        // Multi-hazard detection: evaluate flood, heat, cyclone, thunderstorm, and cold
        const trackedHazards = ["flood", "heat", "cyclone", "thunderstorm", "cold"] as const;

        for (const h of trackedHazards) {
          const hazardRisk = risks.find((r) => r.hazard === h);
          const isElevated = hazardRisk && hazardRisk.severity !== "calm" && (hazardRisk.severity === "watch" || hazardRisk.severity === "warning" || hazardRisk.severity === "emergency");

          if (isElevated && hazardRisk) {
            const existing = await db.select().from(alerts).where(
              and(
                eq(alerts.placeId, p.id),
                eq(alerts.hazard, h),
                eq(alerts.source, "platform")
              )
            ).orderBy(desc(alerts.createdAt));

            const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
            const recentAlert = existing.find(a => {
              // Ignore daily morning digests so they don't block actual weather alerts
              if (a.sourceName === "AEGIS AI Daily Digest") return false;
              const t = a.onset ? new Date(a.onset) : new Date(a.createdAt);
              return t.getTime() > twelveHoursAgo.getTime();
            });

            const alertTitle = h === "flood"
              ? "Rainfall Forecast Alert"
              : h === "heat"
                ? (hazardRisk.severity === "watch" ? "Heavy Heat Alert" : "Extreme Heat Alert")
                : h === "cyclone"
                  ? (hazardRisk.severity === "emergency" ? "Cyclone Emergency Warning" : "Tropical Cyclone Warning")
                  : h === "thunderstorm"
                    ? (hazardRisk.severity === "emergency" || hazardRisk.severity === "warning" ? "Severe Thunderstorm Warning" : "Thunderstorm Alert")
                    : `${hazardRisk.severity.toUpperCase()} Alert - ${h}`;

            const alertHeadline = hazardRisk.drivers?.[0] || (
              h === "flood"
                ? "Live weather models indicate heavy clouds and a high chance of rainfall in your region."
                : h === "heat"
                  ? `Live weather models indicate dangerous heat levels in your region. Current temperature is ${Math.round(wx.tempC.mean)}°C (Feels like ${Math.round(wx.feelsLikeC)}°C).`
                  : h === "cyclone"
                    ? `Severe cyclonic winds (${Math.round(wx.windKph)} km/h) forecasted for your area.`
                    : h === "thunderstorm"
                      ? `Active convective storm cells with lightning and wind gusts (${Math.round(wx.windKph)} km/h).`
                      : `Hazardous weather conditions detected in your region.`
            );

            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);

            if (!recentAlert) {
              await db.insert(alerts).values({
                hazard: h,
                severity: hazardRisk.severity,
                title: alertTitle,
                headline: alertHeadline,
                instruction: hazardRisk.action,
                area: p.name,
                placeId: p.id,
                source: "platform",
                sourceName: "AEGIS AI",
                sourceUrl: "",
                confidence: hazardRisk.confidence,
                onset: new Date(),
                expires: futureDate,
                active: true,
              });

              // Multi-user alert dispatch across all affected accounts
              const recipientEmails = await getUsersToNotifyForPlace(p, hazardRisk.severity);
              if (recipientEmails.length > 0) {
                await sendAlertEmailMulti(recipientEmails, {
                  hazard: h,
                  severity: hazardRisk.severity,
                  title: alertTitle,
                  headline: alertHeadline,
                  instruction: hazardRisk.action,
                  area: p.name,
                });
              }

              // Send SMS to all emergency contacts for this place
              const placeMembers = await db.select().from(members).where(eq(members.placeId, p.id));
              for (const m of placeMembers) {
                if (m.emergencyContact && m.emergencyContact.trim().length > 5) {
                  await sendAlertSMS(m.emergencyContact, {
                    hazard: h,
                    severity: hazardRisk.severity,
                    title: alertTitle,
                    instruction: hazardRisk.action,
                    area: p.name,
                  });
                }
              }
            } else {
              // Existing alert within 12h: check if severity escalated (e.g. from WATCH to WARNING/EMERGENCY)
              const oldRank = SEVERITY_META[recentAlert.severity as Severity]?.rank ?? 0;
              const newRank = SEVERITY_META[hazardRisk.severity as Severity]?.rank ?? 0;
              const isEscalation = newRank > oldRank;

              await db.update(alerts).set({
                severity: hazardRisk.severity,
                title: alertTitle,
                headline: alertHeadline,
                instruction: hazardRisk.action,
                confidence: hazardRisk.confidence,
                active: true,
                expires: futureDate,
              }).where(eq(alerts.id, recentAlert.id));

              // Trigger escalation email dispatch so critical upgrades are broadcast to all affected accounts
              if (isEscalation) {
                const recipientEmails = await getUsersToNotifyForPlace(p, hazardRisk.severity);
                if (recipientEmails.length > 0) {
                  await sendAlertEmailMulti(recipientEmails, {
                    hazard: h,
                    severity: hazardRisk.severity,
                    title: alertTitle,
                    headline: `[ESCALATION UPDATE] ${alertHeadline}`,
                    instruction: hazardRisk.action,
                    area: p.name,
                    isEscalation: true,
                  });
                }
              }
            }
          } else {
            // Calm conditions: deactivate active platform alerts for this hazard
            await db.update(alerts).set({ expires: new Date(Date.now() - 1000), active: false }).where(
              and(
                eq(alerts.placeId, p.id),
                eq(alerts.hazard, h),
                eq(alerts.source, "platform")
              )
            );
          }
        }

        // Morning Digest Generation (runs between 5 AM and 9 AM IST local, or forced via cron)
        const istTimeStr = new Date(now).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
        const currentHourIST = parseInt(istTimeStr.split(":")[0], 10);

        if (forceDigest || (currentHourIST >= 5 && currentHourIST <= 9)) {
          const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(now));
          const digestTitle = `Daily Morning Digest - ${todayStr}`;
          
          const existingDigest = await db.select().from(alerts).where(
            and(
              eq(alerts.placeId, p.id),
              eq(alerts.title, digestTitle)
            )
          );

          if (existingDigest.length === 0) {
            const hourData = await hourly(p.lat, p.lon, 24);
            
            interface ActiveRainHour {
              h: number;
              precipProb: number;
              precipMm: number;
            }
            const rainHours: ActiveRainHour[] = [];
            let heatStart = -1, heatEnd = -1;
            let maxHeat = 0;

            for (const hp of hourData) {
              const hpDateStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(hp.time));
              if (hpDateStr !== todayStr) continue;

              const hpTimeStr = new Date(hp.time).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour12: false });
              const h = parseInt(hpTimeStr.split(":")[0], 10);

              // Strict Rain Criteria: Require BOTH precipProb >= 50% AND precipMm >= 0.5 mm/h (or downpour >= 2.0 mm/h)
              if ((hp.precipProb >= 50 && hp.precipMm >= 0.5) || hp.precipMm >= 2.0) {
                rainHours.push({ h, precipProb: hp.precipProb, precipMm: hp.precipMm });
              }

              // Heat detection (>35C)
              if (hp.tempC >= 35) {
                if (heatStart === -1) heatStart = h;
                heatEnd = h;
                if (hp.tempC > maxHeat) maxHeat = hp.tempC;
              }
            }

            const formatHour = (h: number) => {
              const ampm = h >= 12 ? "PM" : "AM";
              const hr = h % 12 || 12;
              return `${hr.toString().padStart(2, "0")}:00 ${ampm}`;
            };

            // Contiguous hour window clustering algorithm
            interface RainWindow {
              startHour: number;
              endHour: number;
              maxRate: number;
              totalPrecip: number;
            }

            rainHours.sort((a, b) => a.h - b.h);
            const windows: RainWindow[] = [];

            for (const rh of rainHours) {
              const lastWin = windows[windows.length - 1];
              if (lastWin && rh.h === lastWin.endHour + 1) {
                lastWin.endHour = rh.h;
                lastWin.maxRate = Math.max(lastWin.maxRate, rh.precipMm);
                lastWin.totalPrecip += rh.precipMm;
              } else {
                windows.push({
                  startHour: rh.h,
                  endHour: rh.h,
                  maxRate: rh.precipMm,
                  totalPrecip: rh.precipMm,
                });
              }
            }

            const formatWindow = (w: RainWindow) => {
              if (w.startHour === w.endHour) {
                return `around ${formatHour(w.startHour)}${w.maxRate >= 1.0 ? ` (up to ${w.maxRate.toFixed(1)} mm/h)` : ""}`;
              }
              return `${formatHour(w.startHour)} – ${formatHour(w.endHour)}${w.maxRate >= 0.5 ? ` (up to ${w.maxRate.toFixed(1)} mm/h)` : ""}`;
            };

            let digestHeadline = "";
            let hasDigestData = false;

            if (windows.length === 1) {
              const w = windows[0];
              if (w.startHour === w.endHour) {
                digestHeadline += `🌧️ Rain expected ${formatWindow(w)}. `;
              } else {
                digestHeadline += `🌧️ Rain expected from ${formatWindow(w)}. `;
              }
              hasDigestData = true;
            } else if (windows.length === 2) {
              digestHeadline += `🌧️ Rain expected in two distinct windows: ${formatWindow(windows[0])} and ${formatWindow(windows[1])}. `;
              hasDigestData = true;
            } else if (windows.length > 2) {
              const peak = windows.reduce((prev, curr) => curr.maxRate > prev.maxRate ? curr : prev, windows[0]);
              digestHeadline += `🌧️ Primary downpour expected ${formatWindow(peak)}, with scattered showers at other intervals. `;
              hasDigestData = true;
            }

            if (heatStart !== -1) {
              if (heatStart === heatEnd) {
                digestHeadline += `🔥 High heat (up to ${Math.round(maxHeat)}°C) expected around ${formatHour(heatStart)}. `;
              } else {
                digestHeadline += `🔥 High heat (up to ${Math.round(maxHeat)}°C) expected from ${formatHour(heatStart)} – ${formatHour(heatEnd)}. `;
              }
              hasDigestData = true;
            }

            if (hasDigestData) {
              const futureDate = new Date();
              futureDate.setHours(23, 59, 59, 999); // Expire at the end of the day

              await db.insert(alerts).values({
                hazard: "flood",
                severity: "advisory",
                title: digestTitle,
                headline: "Here is your weather schedule for today: " + digestHeadline,
                instruction: "Plan your day accordingly and stay safe. Check the dashboard for real-time updates.",
                area: p.name,
                placeId: p.id,
                source: "platform",
                sourceName: "AEGIS AI Daily Digest",
                sourceUrl: "",
                confidence: 85,
                onset: new Date(),
                expires: futureDate,
                active: true,
              });

              const digestRecipients = await getUsersToNotifyForPlace(p, "advisory");
              if (digestRecipients.length > 0) {
                await sendAlertEmailMulti(digestRecipients, {
                  hazard: "flood",
                  severity: "advisory",
                  title: "Daily Morning Digest",
                  headline: "Here is your weather schedule for today: " + digestHeadline,
                  instruction: "Plan your day accordingly and stay safe.",
                  area: p.name,
                });
              }
            } else {
              // When weather is calm, save record and email calm morning digest
              await db.insert(alerts).values({
                hazard: "flood",
                severity: "calm",
                title: digestTitle,
                headline: "All clear today. Mild temperatures and pleasant conditions ahead.",
                instruction: "Enjoy your day! No hazardous weather expected in your area.",
                area: p.name,
                placeId: p.id,
                source: "platform",
                sourceName: "AEGIS AI Daily Digest",
                sourceUrl: "",
                confidence: 90,
                onset: new Date(),
                expires: new Date(0), // Automatically expired so it's instantly hidden from UI alerts
                active: false,
              });

              const calmRecipients = await getUsersToNotifyForPlace(p, "calm");
              if (calmRecipients.length > 0) {
                await sendAlertEmailMulti(calmRecipients, {
                  hazard: "flood",
                  severity: "calm",
                  title: "Daily Morning Digest",
                  headline: "All clear today! No heavy rain or extreme heat forecasted.",
                  instruction: "Conditions are calm and safe. Enjoy your day!",
                  area: p.name,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[syncPlatformAlerts] Failed for place ${p.name}:`, err);
      }
    }));

    return {
      totalPlaces: allPlaces.length,
      syncedAt: new Date().toISOString(),
    };
  } catch (e: any) {
    console.error("[syncPlatformAlerts] Critical error:", e);
    if (forceDigest) throw e;
  }
}


