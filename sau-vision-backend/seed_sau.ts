import "dotenv/config";
import { db } from "./src/db/client";
import { faculties, admins, labs } from "./src/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const sauFacultiesData = [
  {
    name: "Bilgisayar ve Bilişim Bilimleri Fakültesi",
    code: "CS",
    deanName: "Prof. Dr. Nejat Yumuşak",
    latitude: 40.7410,
    longitude: 30.3320,
    adminEmail: "admin.cs@sau.edu.tr",
    adminName: "Bilişim Admin",
  },
  {
    name: "Mühendislik Fakültesi",
    code: "ENG",
    deanName: "Prof. Dr. Ahmet Alp",
    latitude: 40.7415,
    longitude: 30.3325,
    adminEmail: "admin.eng@sau.edu.tr",
    adminName: "Mühendislik Admin",
  },
  {
    name: "İşletme Fakültesi",
    code: "BUS",
    deanName: "Prof. Dr. Mustafa Kemal",
    latitude: 40.7400,
    longitude: 30.3315,
    adminEmail: "admin.bus@sau.edu.tr",
    adminName: "İşletme Admin",
  },
  {
    name: "Tıp Fakültesi",
    code: "MED",
    deanName: "Prof. Dr. Oğuz Karabay",
    latitude: 40.8240, // Korucuk Kampüsü
    longitude: 30.3160,
    adminEmail: "admin.med@sau.edu.tr",
    adminName: "Tıp Admin",
  },
  {
    name: "Eğitim Fakültesi",
    code: "EDU",
    deanName: "Prof. Dr. Firdevs Karahan",
    latitude: 40.7960, // Hendek Kampüsü
    longitude: 30.7430,
    adminEmail: "admin.edu@sau.edu.tr",
    adminName: "Eğitim Admin",
  }
];

async function seedSAU() {
  console.log("🌱 Seeding Sakarya University Data...");

  try {
    const passwordHash = await bcrypt.hash("admin123", 10);

    for (const data of sauFacultiesData) {
      // 1. Insert Faculty
      console.log(`\nInserting Faculty: ${data.name}...`);
      const [faculty] = await db.insert(faculties).values({
        name: data.name,
        code: data.code,
        deanName: data.deanName,
        latitude: data.latitude,
        longitude: data.longitude,
      }).returning();

      // 2. Insert Admin for this Faculty
      await db.insert(admins).values({
        facultyId: faculty.id,
        universityId: `ADM-${data.code}`,
        fullName: data.adminName,
        email: data.adminEmail,
        passwordHash,
        canApproveBookings: true,
        canManageFacilities: true,
      });

      // 3. Insert a dummy lab for demonstration
      await db.insert(labs).values({
        facultyId: faculty.id,
        name: `Ana Laboratuvar (${data.code})`,
        type: data.code === 'CS' ? 'computer' : (data.code === 'MED' ? 'biology' : 'research'),
        floor: 1,
        roomNumber: "101",
        capacity: 40,
        aiDescription: `${data.name} için genel amaçlı laboratuvar.`,
        aiTags: ["general", "workspace"],
      });

      console.log(`✅ Success! Created ${data.name} with Admin: ${data.adminEmail}`);
    }

    console.log("\n🎉 Seeding Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
}

seedSAU();
