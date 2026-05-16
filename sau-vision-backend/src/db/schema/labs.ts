import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  jsonb,
  pgEnum,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { faculties } from "./faculties";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────
export const labTypeEnum = pgEnum("lab_type", [
  "computer",
  "chemistry",
  "physics",
  "biology",
  "electronics",
  "research",
  "seminar",
  "other",
]);

export const labStatusEnum = pgEnum("lab_status", [
  "available",
  "occupied",
  "maintenance",
  "reserved",
]);

// ─────────────────────────────────────────────────────────────────────────────
// LABS
//
// A lab lives inside a faculty building.
// Location = faculty building + floor + room number within that building.
// Admins of the parent faculty approve booking requests for this lab.
// ─────────────────────────────────────────────────────────────────────────────
export const labs = pgTable("labs", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── Ownership ──────────────────────────────────────────────────────────────
  /** The faculty this lab belongs to — also determines its physical building */
  facultyId: uuid("faculty_id")
    .notNull()
    .references(() => faculties.id, { onDelete: "restrict" }),

  // ── Identity ───────────────────────────────────────────────────────────────
  name: varchar("name", { length: 128 }).notNull(),
  type: labTypeEnum("type").notNull(),

  // ── Location (inside the faculty building) ─────────────────────────────────
  /** Floor within the faculty building. 0 = ground, negative = basement */
  floor: integer("floor").notNull().default(0),

  /** Room number as shown on the door, e.g. "204", "B-12" */
  roomNumber: varchar("room_number", { length: 32 }).notNull(),

  /**
   * Extra location hint shown to students after booking, e.g.
   * "Turn left after the main entrance, end of the corridor"
   */
  locationHint: text("location_hint"),

  // ── Capacity ───────────────────────────────────────────────────────────────
  capacity: integer("capacity").notNull(),

  /** Live headcount updated by NovaVision webhook */
  currentOccupancy: integer("current_occupancy").notNull().default(0),

  // ── AI Matching ────────────────────────────────────────────────────────────
  /**
   * Gemini reads this field to decide if this lab fits a student's
   * natural-language booking request.
   *
   * Describe: purpose, equipment/software, suitable event types,
   * and any restrictions.
   *
   * Example:
   *   "40-seat computer lab with MATLAB, Python (Anaconda), and AutoCAD.
   *    Ideal for data science workshops and engineering design sessions.
   *    Projector and whiteboard available. Not suitable for wet experiments."
   */
  aiDescription: text("ai_description").notNull(),

  /**
   * Short keyword array for fast pre-filtering before Gemini matching.
   * e.g. ["matlab", "python", "cad", "projector"]
   */
  aiTags: jsonb("ai_tags").default([]),

  // ── Equipment ──────────────────────────────────────────────────────────────
  /**
   * JSON object of available equipment.
   * e.g. { "projector": true, "whiteboard": true, "fume_hood": 4 }
   */
  equipment: jsonb("equipment").default({}),

  // ── Booking Rules ──────────────────────────────────────────────────────────
  /** Minimum session length in minutes */
  minBookingMinutes: integer("min_booking_minutes").notNull().default(30),

  /** Maximum session length in minutes */
  maxBookingMinutes: integer("max_booking_minutes").notNull().default(240),

  // ── NovaVision / IoT ───────────────────────────────────────────────────────
  novavisionCameraId: varchar("novavision_camera_id", { length: 64 }).unique(),
  iotDeviceId: varchar("iot_device_id", { length: 64 }).unique(),

  // ── Status ─────────────────────────────────────────────────────────────────
  status: labStatusEnum("status").notNull().default("available"),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

/** Each lab belongs to one faculty and has many bookings */
export const labsRelations = relations(labs, ({ one, many }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { bookings } = require("./bookings");
  return {
    faculty: one(faculties, {
      fields: [labs.facultyId],
      references: [faculties.id],
    }),
    bookings: many(bookings),
  };
});

/**
 * Each faculty has many labs.
 * Defined here (not in faculties.ts) to avoid a circular import.
 *
 * Usage: db.query.faculties.findFirst({ with: { labs: true } })
 * → returns the faculty with all its labs nested inside.
 *
 * This powers the "click on a faculty → see its labs on the map" feature.
 * It also means event requests automatically know which faculty admins
 * to notify — because labs.facultyId → faculties.id → admins.facultyId.
 */
export const facultyHasManyLabs = relations(faculties, ({ many }) => ({
  labs: many(labs),
}));

export type Lab = typeof labs.$inferSelect;
export type NewLab = typeof labs.$inferInsert;
