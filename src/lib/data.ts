import { db } from "@/db";
import { places, members, alerts, reports, resources, checklist, confirmations, users } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { sendAlertEmail } from "./email";
import { sendAlertSMS } from "./sms";
import { topRisks } from "./hazards";
import { currentConditions, hourly } from "./wx";

function parsePlaceId(val: any): number | null {
  if (val === null || val === undefined || val === "" || val === "new") return null;
  const num = Number(val);
  return isNaN(num) ? null : num;
}

const DEFAULT_PLACES: any[] = [];

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
    `);

    // 2. Seed default places if empty
    let existingPlaces = await db.select().from(places);
    if (existingPlaces.length === 0) {
      console.log("🌱 Auto-seeding default places...");
      existingPlaces = await db.insert(places).values(DEFAULT_PLACES).returning();
    }

    // 3. (Removed auto-seeding of default members to prevent unwanted data)

    initDone = true;
  } catch (e) {
    console.warn("Auto init & seeding error:", e);
  }
}

// PLACES
export async function getPlaces(userId?: number) {
  try {
    await ensureSeeded();
    let query = db.select().from(places);
    if (userId) {
      query = query.where(eq(places.userId, userId)) as any;
    }
    return await query.orderBy(desc(places.id));
  } catch (e) {
    console.error("getPlaces DB error:", e);
    return [];
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
    const [newPlace] = await db.insert(places).values({
      name: data.name,
      label: data.label || "home",
      lat: Number(data.lat || 0),
      lon: Number(data.lon || 0),
      region: data.region || "",
      country: data.country || "",
      authority: data.authority || "",
      authorityUrl: data.authorityUrl || "",
      elevationM: Number(data.elevationM || 0),
      coastalKm: Number(data.coastalKm || 50),
      floodHistory: Number(data.floodHistory || 0),
      isPrimary: Boolean(data.isPrimary || false),
      userId: userId || null,
    }).returning();
    return newPlace;
  } catch (e) {
    console.error("addPlace DB error:", e);
    throw e;
  }
}

export async function deletePlace(id: number) {
  try {
    await ensureSeeded();
    await db.delete(alerts).where(eq(alerts.placeId, id));
    await db.delete(members).where(eq(members.placeId, id));
    await db.delete(places).where(eq(places.id, id));
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

export async function updateMember(id: number, data: any) {
  try {
    await ensureSeeded();
    const updatePayload: any = { ...data, lastCheckIn: new Date() };
    if ("placeId" in data) {
      updatePayload.placeId = parsePlaceId(data.placeId);
    }
    if ("lastLat" in data) updatePayload.lastLat = data.lastLat;
    if ("lastLon" in data) updatePayload.lastLon = data.lastLon;
    const [updated] = await db.update(members)
      .set(updatePayload)
      .where(eq(members.id, id))
      .returning();
    return updated;
  } catch (e) {
    console.error("updateMember DB error:", e);
    throw e;
  }
}

export async function deleteMember(id: number) {
  try {
    await ensureSeeded();
    await db.delete(members).where(eq(members.id, id));
    return true;
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

    if (userId) {
      const userPlaces = await getPlaces(userId);
      if (userPlaces.length > 0) {
        const userPlaceIds = new Set(userPlaces.map((p) => p.id));
        const userPlaceNames = userPlaces.map((p) => p.name.toLowerCase().trim());
        return allAlerts.filter((a) => {
          if (a.placeId && userPlaceIds.has(a.placeId)) return true;
          if (a.area && userPlaceNames.some((name) => a.area.toLowerCase().includes(name))) return true;
          return false;
        });
      }
      return []; // Return empty array if user has no places, instead of all alerts
    }
    return allAlerts; // For public view / no user
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
export async function getChecklist() {
  try {
    await ensureSeeded();
    return await db.select().from(checklist);
  } catch (e) {
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
        
        // Process "flood" (Heavy Rainfall)
        const floodRisk = risks.find(r => r.hazard === "flood");
        if (floodRisk && floodRisk.severity !== "calm") {
          const existing = await db.select().from(alerts).where(
            and(
              eq(alerts.placeId, p.id),
              eq(alerts.hazard, "flood"),
              eq(alerts.source, "platform")
            )
          ).orderBy(desc(alerts.createdAt));
          
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
          const recentAlert = existing.find(a => {
            const t = a.onset ? new Date(a.onset) : new Date(a.createdAt);
            return t.getTime() > twelveHoursAgo.getTime();
          });
          
          if (!recentAlert) {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);
            
            await db.insert(alerts).values({
               hazard: "flood",
               severity: floodRisk.severity,
               title: "Rainfall Forecast Alert",
               headline: "Live weather models indicate heavy clouds and a high chance of rainfall in your region.",
               instruction: floodRisk.action,
               area: p.name,
               placeId: p.id,
               source: "platform",
               sourceName: "AEGIS AI",
               sourceUrl: "",
               confidence: floodRisk.confidence,
               onset: new Date(),
               expires: futureDate,
               active: true,
            });
            
            if (p.userId) {
              const userRows = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
              if (userRows.length > 0) {
                await sendAlertEmail(userRows[0].email, {
                  hazard: "flood",
                  severity: floodRisk.severity,
                  title: "Rainfall Forecast Alert",
                  headline: "Live weather models indicate heavy clouds and a high chance of rainfall in your region.",
                  instruction: floodRisk.action,
                  area: p.name
                });
              }
            }

            // Send SMS to all emergency contacts for this place
            const placeMembers = await db.select().from(members).where(eq(members.placeId, p.id));
            for (const m of placeMembers) {
              if (m.emergencyContact && m.emergencyContact.trim().length > 5) {
                await sendAlertSMS(m.emergencyContact, {
                  hazard: "flood",
                  severity: floodRisk.severity,
                  title: "Rainfall Alert",
                  instruction: floodRisk.action,
                  area: p.name
                });
              }
            }
          } else {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);
            
            await db.update(alerts).set({
              severity: floodRisk.severity,
              confidence: floodRisk.confidence,
              active: true,
              expires: futureDate
            }).where(eq(alerts.id, recentAlert.id));
          }
        } else {
          // Erase (expire) any active platform flood alert if the weather is now calm
          console.log(`[syncPlatformAlerts] Flood Risk is low, clearing flood alerts for place ${p.id}...`);
          await db.update(alerts).set({ expires: new Date(Date.now() - 1000), active: false }).where(
            and(
              eq(alerts.placeId, p.id),
              eq(alerts.hazard, "flood"),
              eq(alerts.source, "platform"),
              eq(alerts.title, "Rainfall Forecast Alert")
            )
          );
        }

        // Process "heat" (Extreme Heat)
        const heatRisk = risks.find(r => r.hazard === "heat");
        if (heatRisk && (heatRisk.severity === "watch" || heatRisk.severity === "warning" || heatRisk.severity === "emergency")) {
          const existing = await db.select().from(alerts).where(
            and(
              eq(alerts.placeId, p.id),
              eq(alerts.hazard, "heat"),
              eq(alerts.source, "platform")
            )
          ).orderBy(desc(alerts.createdAt));
          
          const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
          const recentAlert = existing.find(a => {
            const t = a.onset ? new Date(a.onset) : new Date(a.createdAt);
            return t.getTime() > twelveHoursAgo.getTime();
          });
          
          const alertTitle = heatRisk.severity === "watch" ? "Heavy Heat Alert" : "Extreme Heat Alert";
          const alertHeadline = `Live weather models indicate dangerous heat levels in your region. Current temperature is ${Math.round(wx.tempC.mean)}°C (Feels like ${Math.round(wx.feelsLikeC)}°C).`;

          if (!recentAlert) {
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);
            
            await db.insert(alerts).values({
               hazard: "heat",
               severity: heatRisk.severity,
               title: alertTitle,
               headline: alertHeadline,
               instruction: heatRisk.action,
               area: p.name,
               placeId: p.id,
               source: "platform",
               sourceName: "AEGIS AI",
               sourceUrl: "",
               confidence: heatRisk.confidence,
               onset: new Date(),
               expires: futureDate,
               active: true,
            });

            if (p.userId) {
              const userRows = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
              if (userRows.length > 0) {
                await sendAlertEmail(userRows[0].email, {
                  hazard: "heat",
                  severity: heatRisk.severity,
                  title: alertTitle,
                  headline: alertHeadline,
                  instruction: heatRisk.action,
                  area: p.name
                });
              }
            }

            // Send SMS to all emergency contacts for this place
            const placeMembers = await db.select().from(members).where(eq(members.placeId, p.id));
            for (const m of placeMembers) {
              if (m.emergencyContact && m.emergencyContact.trim().length > 5) {
                await sendAlertSMS(m.emergencyContact, {
                  hazard: "heat",
                  severity: heatRisk.severity,
                  title: alertTitle,
                  instruction: heatRisk.action,
                  area: p.name
                });
              }
            }
          } else {
            // Update existing alert title/severity/headline if it escalated or de-escalated
            const futureDate = new Date();
            futureDate.setHours(futureDate.getHours() + 24);

            await db.update(alerts).set({
              severity: heatRisk.severity,
              title: alertTitle,
              headline: alertHeadline,
              confidence: heatRisk.confidence,
              active: true,
              expires: futureDate
            }).where(eq(alerts.id, recentAlert.id));
          }
        } else {
          // Erase (expire) any active platform heat alert if the weather is now calm
          console.log(`[syncPlatformAlerts] Heat Risk is low, clearing heat alerts for place ${p.id}...`);
          await db.update(alerts).set({ expires: new Date(Date.now() - 1000), active: false }).where(
            and(
              eq(alerts.placeId, p.id),
              eq(alerts.hazard, "heat"),
              eq(alerts.source, "platform")
            )
          );
        }

        // Morning Digest Generation (runs between 5 AM and 9 AM local, or forced via cron)
        const currentHour = new Date(now).getHours();
        if (forceDigest || (currentHour >= 5 && currentHour <= 9)) {
          const todayStr = new Date(now).toISOString().split('T')[0];
          const digestTitle = `Daily Morning Digest - ${todayStr}`;
          
          const existingDigest = await db.select().from(alerts).where(
            and(
              eq(alerts.placeId, p.id),
              eq(alerts.title, digestTitle)
            )
          );

          if (existingDigest.length === 0) {
            const hourData = await hourly(p.lat, p.lon, 24);
            let rainStart = -1, rainEnd = -1;
            let heatStart = -1, heatEnd = -1;
            let maxHeat = 0;

            for (const hp of hourData) {
              const hDate = new Date(hp.time);
              if (hDate.getDate() !== new Date(now).getDate()) continue;
              
              const h = hDate.getHours();
              // Rain detection
              if (hp.precipProb > 40 || hp.precipMm > 0.5) {
                if (rainStart === -1) rainStart = h;
                rainEnd = h;
              }
              // Heat detection (>35C)
              if (hp.tempC >= 35) {
                if (heatStart === -1) heatStart = h;
                heatEnd = h;
                if (hp.tempC > maxHeat) maxHeat = hp.tempC;
              }
            }

            let digestHeadline = "";
            let hasDigestData = false;

            const formatHour = (h: number) => {
               const ampm = h >= 12 ? 'PM' : 'AM';
               const hr = h % 12 || 12;
               return `${hr}:00 ${ampm}`;
            };

            if (rainStart !== -1) {
              digestHeadline += `🌧️ Rain expected from ${formatHour(rainStart)} to ${formatHour(rainEnd)}. `;
              hasDigestData = true;
            }
            if (heatStart !== -1) {
              digestHeadline += `🔥 High heat (up to ${Math.round(maxHeat)}°C) expected from ${formatHour(heatStart)} to ${formatHour(heatEnd)}. `;
              hasDigestData = true;
            }

            if (hasDigestData) {
              const futureDate = new Date();
              futureDate.setHours(23, 59, 59, 999); // Expire at the end of the day

              await db.insert(alerts).values({
                 hazard: "flood", // Visual choice for UI mapping
                 severity: "advisory", // Standard info tier
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

              if (p.userId) {
                const userRows = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
                if (userRows.length > 0) {
                  await sendAlertEmail(userRows[0].email, {
                    hazard: "flood",
                    severity: "advisory",
                    title: "Daily Morning Digest",
                    headline: "Here is your weather schedule for today: " + digestHeadline,
                    instruction: "Plan your day accordingly and stay safe.",
                    area: p.name
                  });
                }
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

              if (p.userId) {
                const userRows = await db.select().from(users).where(eq(users.id, p.userId)).limit(1);
                if (userRows.length > 0) {
                  await sendAlertEmail(userRows[0].email, {
                    hazard: "flood",
                    severity: "calm",
                    title: "Daily Morning Digest",
                    headline: "All clear today! No heavy rain or extreme heat forecasted.",
                    instruction: "Conditions are calm and safe. Enjoy your day!",
                    area: p.name
                  });
                }
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


