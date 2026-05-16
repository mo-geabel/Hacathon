import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  text,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { bookings } from "./bookings";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────
export const registrationStatusEnum = pgEnum("registration_status", [
  "pending",      // Waiting for admin approval
  "approved",     // Approved by admin
  "rejected",     // Rejected by admin
  "registered",   // Student is signed up to attend (legacy/auto-approved)
  "cancelled",    // Student cancelled their registration
  "attended",     // Student successfully checked in at the event
  "no_show",      // Event ended and student never checked in
]);

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATIONS
//
// Allows students to sign up as attendees for events (bookings) created
// by other students.
// ─────────────────────────────────────────────────────────────────────────────
export const registrations = pgTable("registrations", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── Relations ──────────────────────────────────────────────────────────────
  /** The student who is attending */
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),

  /** The event (booking) they are attending */
  bookingId: uuid("booking_id")
    .notNull()
    .references(() => bookings.id, { onDelete: "cascade" }),

  // ── Status & Check-in ──────────────────────────────────────────────────────
  status: registrationStatusEnum("status").notNull().default("pending"),

  // ── AI Filtering (puq.ai / Gemini) ─────────────────────────────────────────
  aiScore: integer("ai_score"),
  aiRecommendation: text("ai_recommendation"),

  /** When the student physically scanned the IoT QR code to enter the room */
  checkInTime: timestamp("check_in_time", { withTimezone: true }),

  /** Optional feedback/rating from the student after the event ends */
  postEventFeedback: text("post_event_feedback"),

  // ── Timestamps ─────────────────────────────────────────────────────────────
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const registrationsRelations = relations(registrations, ({ one }) => ({
  student: one(students, {
    fields: [registrations.studentId],
    references: [students.id],
  }),
  booking: one(bookings, {
    fields: [registrations.bookingId],
    references: [bookings.id],
  }),
}));

export type Registration = typeof registrations.$inferSelect;
export type NewRegistration = typeof registrations.$inferInsert;
