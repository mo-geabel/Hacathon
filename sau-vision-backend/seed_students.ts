import "dotenv/config";
import { db } from "./src/db/client";
import { students } from "./src/db/schema";
import bcrypt from "bcrypt";

async function run() {
  console.log("🌱 Seeding Students with varying GPA and ratings...");

  // Generate a hashed password "student123" for everyone to make testing easy
  const passwordHash = await bcrypt.hash("student123", 10);

  const mockStudents = [
    {
      universityId: "B221210001",
      fullName: "Ahmet Yılmaz (The Perfect Student)",
      email: "ahmet.yilmaz@ogr.sau.edu.tr",
      passwordHash,
      faculty: "Computer Engineering",
      programme: "Software Engineering",
      gpa: 3.95,
      eventRating: 4.8,
      totalEventsCreated: 5,
      ghostedEventCount: 0,
      isActive: true,
    },
    {
      universityId: "B221210002",
      fullName: "Ayşe Kaya (The Average Student)",
      email: "ayse.kaya@ogr.sau.edu.tr",
      passwordHash,
      faculty: "Computer Engineering",
      programme: "Information Systems",
      gpa: 2.80,
      eventRating: 3.5,
      totalEventsCreated: 2,
      ghostedEventCount: 1,
      isActive: true,
    },
    {
      universityId: "B221210003",
      fullName: "Mehmet Demir (The Ghoster)",
      email: "mehmet.demir@ogr.sau.edu.tr",
      passwordHash,
      faculty: "Electrical Engineering",
      programme: "Electronics",
      gpa: 1.90,
      eventRating: 2.1,
      totalEventsCreated: 1,
      ghostedEventCount: 5, // Very unreliable!
      isActive: true,
    },
    {
      universityId: "B221210004",
      fullName: "Zeynep Çelik (The Rising Star)",
      email: "zeynep.celik@ogr.sau.edu.tr",
      passwordHash,
      faculty: "Business Administration",
      programme: "Management",
      gpa: 3.50,
      eventRating: 4.5,
      totalEventsCreated: 3,
      ghostedEventCount: 0,
      isActive: true,
    }
  ];

  try {
    for (const student of mockStudents) {
      await db.insert(students).values(student).onConflictDoNothing();
      console.log(`✅ Inserted student: ${student.fullName}`);
    }
    console.log("🎉 Seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding students:", error);
  }
  
  process.exit(0);
}

run();
