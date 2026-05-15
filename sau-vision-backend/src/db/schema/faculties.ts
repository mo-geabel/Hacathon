import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// FACULTIES
// Parent entity — owns many admins who manage its facilities.
// Relations are defined in admins.ts to avoid circular imports.
// ─────────────────────────────────────────────────────────────────────────────
export const faculties = pgTable("faculties", {
  id: uuid("id").primaryKey().defaultRandom(),

  /** e.g. "Faculty of Engineering and Natural Sciences" */
  name: varchar("name", { length: 128 }).notNull(),

  /** Short code for room numbers / IDs, e.g. "ENG", "MED", "LAW" */
  code: varchar("code", { length: 16 }).notNull().unique(),

  deanName: varchar("dean_name", { length: 128 }),
  contactEmail: varchar("contact_email", { length: 255 }),

  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// facultiesRelations (one faculty → many admins) lives in admins.ts
// to avoid the circular import: faculties ↔ admins.

export const facultiesRelations = relations(faculties, () => ({}));

export type Faculty = typeof faculties.$inferSelect;
export type NewFaculty = typeof faculties.$inferInsert;
