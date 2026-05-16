import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { students } from "./students";
import { bookings } from "./bookings";

// ─────────────────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────────────────
export const historyEventTypeEnum = pgEnum("history_event_type", [
  "booking_created",
  "booking_completed",
  "last_minute_cancellation",
  "delay_recorded",
  "ghosted"
]);

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT HISTORY
// Tracks all events related to a student's booking behavior
// ─────────────────────────────────────────────────────────────────────────────
export const studentHistory = pgTable("student_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),

  bookingId: uuid("booking_id")
    .references(() => bookings.id, { onDelete: "set null" }),

  eventType: historyEventTypeEnum("event_type").notNull(),
  
  description: text("description"), // e.g., "Arrived 15 minutes late"
  
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const studentHistoryRelations = relations(studentHistory, ({ one }) => ({
  student: one(students, {
    fields: [studentHistory.studentId],
    references: [students.id],
  }),
  booking: one(bookings, {
    fields: [studentHistory.bookingId],
    references: [bookings.id],
  }),
}));

export const studentHasManyHistory = relations(students, ({ many }) => ({
  history: many(studentHistory),
}));

export type StudentHistory = typeof studentHistory.$inferSelect;
export type NewStudentHistory = typeof studentHistory.$inferInsert;
