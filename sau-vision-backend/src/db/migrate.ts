import { db } from './client';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log("Running manual migrations...");
    
    try {
      await db.execute(sql`ALTER TABLE "bookings" ADD COLUMN "student_comment" text;`);
      console.log("Added student_comment to bookings");
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.error("Warning on student_comment:", e.message);
      }
    }
    
    console.log("Migrations completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main();
