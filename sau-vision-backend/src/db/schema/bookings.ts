import { pgTable, uuid, varchar, integer, timestamp, text, boolean, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { facilities } from "./facilities";

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending", "confirmed", "checked_in", "active",
  "completed", "ghosted", "cancelled",
]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  facilityId: uuid("facility_id").notNull().references(() => facilities.id, { onDelete: "restrict" }),
  /** Raw NL text from the user before Gemini parsing */
  rawNlRequest: text("raw_nl_request"),
  /** Structured intent extracted by Gemini */
  geminiParsedData: jsonb("gemini_parsed_data"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  expectedAttendees: integer("expected_attendees").notNull(),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
  actualStart: timestamp("actual_start", { withTimezone: true }),
  actualEnd: timestamp("actual_end", { withTimezone: true }),
  status: bookingStatusEnum("status").notNull().default("pending"),
  // ── Anti-Ghosting FSM ─────────────────────────────────────────────────────
  checkInRegistered: boolean("check_in_registered").notNull().default(false),
  checkInTime: timestamp("check_in_time", { withTimezone: true }),
  warningIssuedAt: timestamp("warning_issued_at", { withTimezone: true }),
  ghostedAt: timestamp("ghosted_at", { withTimezone: true }),
  ghostReason: text("ghost_reason"),
  // ── puq.ai Report Outputs ─────────────────────────────────────────────────
  certificateUrl: text("certificate_url"),
  roiReportUrl: text("roi_report_url"),
  puqAiReportPayload: jsonb("puq_ai_report_payload"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
