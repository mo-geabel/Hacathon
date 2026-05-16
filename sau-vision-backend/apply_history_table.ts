import "dotenv/config";
import { db } from "./src/db/client";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Applying student_history table migration...");
  try {
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "public"."history_event_type" AS ENUM('booking_created', 'booking_completed', 'last_minute_cancellation', 'delay_recorded', 'ghosted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Enum 'history_event_type' ready.");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "student_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "student_id" uuid NOT NULL,
        "booking_id" uuid,
        "event_type" "history_event_type" NOT NULL,
        "description" text,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    console.log("✅ Table 'student_history' ready.");

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "student_history" ADD CONSTRAINT "student_history_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "student_history" ADD CONSTRAINT "student_history_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log("✅ Constraints ready.");

    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
}

run();
