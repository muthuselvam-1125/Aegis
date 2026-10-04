import {
  pgTable,
  serial,
  text,
  doublePrecision,
  integer,
  timestamp,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

/* Saved locations for a household — each scored against its own geography. */
export const places = pgTable("places", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  label: text("label").notNull().default("home"), // home | work | school | family | farm | other
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  region: text("region").notNull().default(""),
  country: text("country").notNull().default(""),
  authority: text("authority").notNull().default(""), // official agency name for the region
  authorityUrl: text("authority_url").notNull().default(""),
  elevationM: integer("elevation_m").notNull().default(0),
  coastalKm: doublePrecision("coastal_km").notNull().default(50),
  floodHistory: integer("flood_history").notNull().default(0), // events in last 10y
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: integer("user_id"), // Optional for backwards compatibility, but filtered going forward
});

/* Household members with mark-yourself-safe status. */
export const members = pgTable("members", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("adult"), // adult | child | elder | responder
  placeId: integer("place_id"),
  status: text("status").notNull().default("unknown"), // safe | needs_help | unknown
  statusNote: text("status_note").notNull().default(""),
  bloodType: text("blood_type").notNull().default(""),
  allergies: text("allergies").notNull().default(""),
  medical: text("medical").notNull().default(""),
  emergencyContact: text("emergency_contact").notNull().default(""),
  lastCheckIn: timestamp("last_check_in"),
  lastLat: doublePrecision("last_lat"),
  lastLon: doublePrecision("last_lon"),
  userId: integer("user_id"),
});

/* Alerts — official-agency-issued OR platform-derived guidance (always labelled). */
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  hazard: text("hazard").notNull(), // flood | cyclone | thunderstorm | heat | cold | wildfire | smoke | drought | earthquake | tsunami | landslide | frost | hail
  severity: text("severity").notNull(), // advisory | watch | warning | emergency
  title: text("title").notNull(),
  headline: text("headline").notNull(),
  instruction: text("instruction").notNull(),
  area: text("area").notNull(),
  placeId: integer("place_id"),
  source: text("source").notNull().default("platform"), // official | platform
  sourceName: text("source_name").notNull().default(""),
  sourceUrl: text("source_url").notNull().default(""),
  confidence: integer("confidence").notNull().default(70), // 0-100
  onset: timestamp("onset").notNull().defaultNow(),
  expires: timestamp("expires").notNull(),
  polygon: jsonb("polygon"), // [[lat,lon],...]
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* Community ground-truth confirm/deny tallies on an alert. */
export const confirmations = pgTable("confirmations", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").notNull(),
  verdict: text("verdict").notNull(), // confirm | deny
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* Crowdsourced situational reports — always visually distinct from official data. */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  hazard: text("hazard").notNull(),
  body: text("body").notNull(),
  area: text("area").notNull().default(""),
  lat: doublePrecision("lat"),
  lon: doublePrecision("lon"),
  reporter: text("reporter").notNull().default("Anonymous"),
  kind: text("kind").notNull().default("observation"), // observation | resource | need | offer
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* Emergency resources: shelters / hospitals / distribution points. */
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // shelter | hospital | water | fuel | aid
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
  area: text("area").notNull().default(""),
  status: text("status").notNull().default("open"), // open | full | closed
  capacity: integer("capacity").notNull().default(0),
  occupancy: integer("occupancy").notNull().default(0),
  contact: text("contact").notNull().default(""),
});

/* Per-hazard go-bag / preparedness checklist. */
export const checklist = pgTable("checklist", {
  id: serial("id").primaryKey(),
  hazard: text("hazard").notNull(),
  item: text("item").notNull(),
  detail: text("detail").notNull().default(""),
  done: boolean("done").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Place = typeof places.$inferSelect;
export type Member = typeof members.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ChecklistItem = typeof checklist.$inferSelect;


/* ================= AUTHENTICATION ================= */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url").default(""),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
