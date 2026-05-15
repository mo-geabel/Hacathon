import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { faculties } from "./faculties";

// ─────────────────────────────────────────────────────────────────────────────
// ADMINS
// Self-contained table — holds both auth credentials and faculty assignment.
// Each admin belongs to exactly ONE faculty.
// A faculty can have MANY admins.
// Admins approve/reject booking requests for their faculty's facilities.
// ─────────────────────────────────────────────────────────────────────────────
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),

  // ── Auth / Identity ────────────────────────────────────────────────────────
  universityId: varchar("university_id", { length: 20 }).notNull().unique(),
  fullName: varchar("full_name", { length: 128 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),

  // ── Faculty Assignment ─────────────────────────────────────────────────────
  /**
   * The faculty this admin manages.
   * Restrict delete: cannot delete a faculty that still has admins.
   */
  facultyId: uuid("faculty_id")
    .notNull()
    .references(() => faculties.id, { onDelete: "restrict" }),

  /** e.g. "Lab Coordinator", "Department Secretary" */
  jobTitle: varchar("job_title", { length: 128 }),

  // ── Permissions ────────────────────────────────────────────────────────────
  /** Approve or reject booking requests for this faculty's facilities */
  canApproveBookings: boolean("can_approve_bookings").notNull().default(true),

  /** Create / edit / deactivate facilities within this faculty */
  canManageFacilities: boolean("can_manage_facilities").notNull().default(false),

  /** Edit student GPA and event rating within this faculty */
  canManageStudents: boolean("can_manage_students").notNull().default(false),

  notes: text("notes"),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

/** Each admin belongs to one faculty */
export const adminsRelations = relations(admins, ({ one }) => ({
  faculty: one(faculties, {
    fields: [admins.facultyId],
    references: [faculties.id],
  }),
}));

/** Each faculty has many admins (defined here to avoid circular import) */
export const facultyHasManyAdmins = relations(faculties, ({ many }) => ({
  admins: many(admins),
}));

export type Admin = typeof admins.$inferSelect;
export type NewAdmin = typeof admins.$inferInsert;
