import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "./src/db/client";
import { bookings, students, labs, admins } from "./src/db/schema";

async function main() {
  const admin = await db.query.admins.findFirst({
    where: eq(admins.email, "admin.cs@sau.edu.tr"),
  });
  console.log('Admin faculty:', admin?.facultyId);
  
  const b = await db.query.bookings.findFirst({
    where: eq(bookings.title, 'Hackathon Live Tracking Test'),
    with: { lab: true }
  });
  
  console.log('Booking lab faculty:', (b as any)?.lab?.facultyId);
  process.exit(0);
}
main();
