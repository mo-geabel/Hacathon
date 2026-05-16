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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { labs } from "./labs";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────
export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",      // Waiting for admin approval
  "approved",     // Approved by admin, waiting for scheduled time
  "rejected",     // Rejected by admin
  "active",       // Currently happening (check-in complete)
  "completed",    // Finished successfully
  "ghosted",      // Cancelled automatically by Anti-Ghosting AI
  "cancelled",    // Cancelled manually by the student or admin
]);

// ─────────────────────────────────────────────────────────────────────────────
// BOOKINGS
//
// Represents a reservation made by a student for a specific lab.
// Includes tracking for Gemini AI requests, NovaVision occupancy checks,
// and puq.ai post-event reports.
// ─────────────────────────────────────────────────────────────────────────────
export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── Relations ──────────────────────────────────────────────────────────────
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "restrict" }),

  labId: uuid("lab_id")
    .notNull()
    .references(() => labs.id, { onDelete: "restrict" }),

  // ── Core Details ───────────────────────────────────────────────────────────
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  expectedAttendees: integer("expected_attendees").notNull(),

  // ── Timing ─────────────────────────────────────────────────────────────────
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),

  /** Logged when IoT check-in occurs */
  actualStart: timestamp("actual_start", { withTimezone: true }),
  /** Logged when IoT check-out occurs or event naturally ends */
  actualEnd: timestamp("actual_end", { withTimezone: true }),

  status: bookingStatusEnum("status").notNull().default("pending"),

  // ── Event Type ─────────────────────────────────────────────────────────────
  /**
   * When true:
   *  - The event QR code drives a scan-to-join flow (participants scan → register)
   *  - After the event concludes, puq.ai generates a PDF certificate per attendee
   * When false:
   *  - NovaVision camera is used to count occupancy only
   *  - No certificate is generated
   */
  requiresCertificate: boolean("requires_certificate").notNull().default(false),

  // ── Communication ────────────────────────────────────────────────────────────
  /** Optional comment added by the student after booking is approved */
  studentComment: text("student_comment"),

  // ── Gemini AI Engine ───────────────────────────────────────────────────────
  /** The natural language prompt the student typed (e.g. "I need a lab for 10 people") */
  rawNlRequest: text("raw_nl_request"),
  
  /** The structured JSON data extracted by Gemini */
  geminiParsedData: jsonb("gemini_parsed_data"),

  // ── Anti-Ghosting AI (NovaVision + IoT) ────────────────────────────────────
  /** Has the organizer scanned the IoT QR code at the door? */
  checkInRegistered: boolean("check_in_registered").notNull().default(false),
  checkInTime: timestamp("check_in_time", { withTimezone: true }),

  /** When the 5-minute Anti-Ghosting warning was sent via WebSocket/Email */
  warningIssuedAt: timestamp("warning_issued_at", { withTimezone: true }),

  /** When the system automatically reclaimed the room */
  ghostedAt: timestamp("ghosted_at", { withTimezone: true }),
  ghostReason: text("ghost_reason"),

  // ── puq.ai Post-Event Reports ──────────────────────────────────────────────
  /** URL to the generated PDF certificate for attendees (legacy single URL, now per-registration) */
  certificateUrl: text("certificate_url"),
  
  /** URL to the ROI and engagement report */
  roiReportUrl: text("roi_report_url"),
  
  /** The full JSON response from the puq.ai report generation */
  puqAiReportPayload: jsonb("puq_ai_report_payload"),

  /** Summary stats stored after conclude: { totalRegistered, attended, noShows, attendanceRate } */
  eventStats: jsonb("event_stats"),

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
// Note: `registrations` is lazy-imported to avoid a circular dependency
// (registrations.ts imports bookings.ts, so we cannot import it at the top)
export const bookingsRelations = relations(bookings, ({ one, many }) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { registrations } = require("./registrations");
  return {
    student: one(students, {
      fields: [bookings.studentId],
      references: [students.id],
    }),
    lab: one(labs, {
      fields: [bookings.labId],
      references: [labs.id],
    }),
    registrations: many(registrations),
  };
});

export type Booking = typeof bookings.$inferSelect;
export type NewBooking = typeof bookings.$inferInsert;
