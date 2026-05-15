import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// FACULTIES
//
// Represents a university faculty building.
// Each faculty:
//   → owns many labs (students browse them on a map)
//   → has many admins (who receive and approve student event requests)
//
// Flow:
//   Student picks a faculty on the map → sees its labs → submits event request
//   → request is routed to the admins of that faculty for approval
// ─────────────────────────────────────────────────────────────────────────────
export const faculties = pgTable("faculties", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── Identity ───────────────────────────────────────────────────────────────
  /** e.g. "Faculty of Engineering and Natural Sciences" */
  name: varchar("name", { length: 128 }).notNull(),

  /** Short code for room IDs, e.g. "ENG", "MED", "LAW" */
  code: varchar("code", { length: 16 }).notNull().unique(),

  deanName: varchar("dean_name", { length: 128 }),
  contactEmail: varchar("contact_email", { length: 255 }),

  // ── Campus Map & Location ──────────────────────────────────────────────────
  /**
   * Physical address of the faculty building on campus.
   * e.g. "North Campus, Sakarya University, Serdivan"
   */
  buildingAddress: text("building_address"),

  /**
   * Latitude of the faculty building — used to pin it on the campus map.
   * e.g. 40.7377 (Sakarya University approx.)
   */
  latitude: real("latitude"),

  /**
   * Longitude of the faculty building — used to pin it on the campus map.
   */
  longitude: real("longitude"),

  /**
   * URL to a static campus map image with this faculty highlighted.
   * Displayed on the faculty detail page so students can find the building.
   */
  campusMapImageUrl: varchar("campus_map_image_url", { length: 512 }),

  /**
   * URL to the faculty building's floor plan image.
   * Displayed when a student clicks on the faculty to see its internal layout
   * and browse available labs by floor/room.
   */
  floorPlanImageUrl: varchar("floor_plan_image_url", { length: 512 }),

  /**
   * Optional external map link (Google Maps / campus portal).
   * Opens in a new tab from the faculty card.
   */
  mapUrl: varchar("map_url", { length: 512 }),

  // ── Status ─────────────────────────────────────────────────────────────────
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * facultiesRelations is intentionally minimal here.
 * The full one-to-many relations (faculty → admins, faculty → labs) are
 * defined in admins.ts and labs.ts respectively to avoid circular imports.
 */
export const facultiesRelations = relations(faculties, () => ({}));

export type Faculty = typeof faculties.$inferSelect;
export type NewFaculty = typeof faculties.$inferInsert;
