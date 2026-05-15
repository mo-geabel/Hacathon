import { pgTable, uuid, varchar, integer, boolean, timestamp, text, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const facilityTypeEnum = pgEnum("facility_type", [
  "lecture_hall", "seminar_room", "laboratory",
  "sports_hall", "conference_room", "study_room", "amphitheater",
]);

export const facilityStatusEnum = pgEnum("facility_status", [
  "available", "occupied", "ghosted", "maintenance",
]);

export const facilities = pgTable("facilities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  building: varchar("building", { length: 64 }).notNull(),
  floor: integer("floor").notNull().default(0),
  roomNumber: varchar("room_number", { length: 16 }).notNull(),
  type: facilityTypeEnum("type").notNull(),
  capacity: integer("capacity").notNull(),
  currentOccupancy: integer("current_occupancy").notNull().default(0),
  status: facilityStatusEnum("status").notNull().default("available"),
  /** NovaVision camera identifier — used to correlate webhooks */
  novavisionCameraId: varchar("novavision_camera_id", { length: 64 }).unique(),
  /** IoT QR device at the entrance */
  iotDeviceId: varchar("iot_device_id", { length: 64 }).unique(),
  amenities: jsonb("amenities").default({}),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Facility = typeof facilities.$inferSelect;
export type NewFacility = typeof facilities.$inferInsert;
