import { Client } from "pg";
import "dotenv/config";

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requires_certificate boolean NOT NULL DEFAULT false;
    `);
    console.log("Added requires_certificate to bookings");

    await client.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS event_stats jsonb;
    `);
    console.log("Added event_stats to bookings");

    await client.query(`
      ALTER TABLE registrations ADD COLUMN IF NOT EXISTS certificate_data jsonb;
    `);
    console.log("Added certificate_data to registrations");

    console.log("Database schema updated successfully");
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    await client.end();
  }
}

main();
