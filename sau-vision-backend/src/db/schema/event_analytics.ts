import { pgTable, uuid, integer, real, timestamp, text, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { bookings } from "./bookings";
import { facilities } from "./facilities";

export const analyticsSourceEnum = pgEnum("analytics_source", [
  "novavision", "iot_checkin", "puq_ai", "manual",
]);

export const eventAnalytics = pgTable("event_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
  source: analyticsSourceEnum("source").notNull(),
  personCount: integer("person_count"),
  occupancyRatio: real("occupancy_ratio"),
  peakOccupancy: integer("peak_occupancy"),
  actualDurationMinutes: integer("actual_duration_minutes"),
  roiScore: real("roi_score"),
  rawPayload: jsonb("raw_payload"),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventAnalytic = typeof eventAnalytics.$inferSelect;
export type NewEventAnalytic = typeof eventAnalytics.$inferInsert;
