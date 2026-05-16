import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  doublePrecision,
  pgEnum,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────
export const eventCategoryEnum = pgEnum("event_category", [
  "academic",
  "sports",
  "social",
  "other",
]);

// ─────────────────────────────────────────────────────────────────────────────
// CAMPUS EVENTS
//
// Represents a user-placed event marker on the campus image map.
// Uses CRS.Simple pixel coordinates (mapX, mapY) instead of real lat/lng.
// ─────────────────────────────────────────────────────────────────────────────
export const campusEvents = pgTable("campus_events", {
  id: uuid("id").primaryKey().defaultRandom(),

  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  date: varchar("date", { length: 20 }).notNull(), // YYYY-MM-DD

  category: eventCategoryEnum("category").notNull().default("other"),

  // CRS.Simple pixel coordinates on the campus image overlay
  mapX: doublePrecision("map_x").notNull(),
  mapY: doublePrecision("map_y").notNull(),

  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CampusEvent = typeof campusEvents.$inferSelect;
export type NewCampusEvent = typeof campusEvents.$inferInsert;
