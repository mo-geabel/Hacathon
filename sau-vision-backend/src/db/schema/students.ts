import {
  pgTable,
  uuid,
  varchar,
  real,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// STUDENTS
// Self-contained table — holds both auth credentials and academic profile.
// ─────────────────────────────────────────────────────────────────────────────
export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── Auth / Identity ────────────────────────────────────────────────────────
  /** e.g. "B221210019" */
  universityId: varchar("university_id", { length: 20 }).notNull().unique(),
  fullName: varchar("full_name", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  // ── Academic info ──────────────────────────────────────────────────────────
  /** Faculty the student is enrolled in, e.g. "Faculty of Engineering" */
  faculty: varchar("faculty", { length: 128 }).notNull(),

  /** Specific programme, e.g. "Computer Engineering" */
  programme: varchar("programme", { length: 128 }),

  /**
   * GPA — Grade Point Average (0.00 – 4.00).
   * NULL = not yet recorded.
   */
  gpa: real("gpa"),

  // ── Event reputation ───────────────────────────────────────────────────────
  /**
   * Average rating (0.0 – 5.0) earned from events the student organised.
   * Recalculated after each event is completed via puq.ai report.
   * NULL = no events rated yet.
   */
  eventRating: real("event_rating"),

  /** Total number of events this student has created. */
  totalEventsCreated: integer("total_events_created").notNull().default(0),

  /**
   * Number of the student's bookings that were reclaimed by Anti-Ghosting.
   * A high count can restrict future booking privileges.
   */
  ghostedEventCount: integer("ghosted_event_count").notNull().default(0),

  // ── Status ─────────────────────────────────────────────────────────────────
  /** Student must verify email before booking facilities. */
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentsRelations = relations(students, () => ({}));

export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
