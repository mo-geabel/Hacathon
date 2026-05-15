import "dotenv/config";
import { db } from "./src/db/client";
import { faculties, admins, labs } from "./src/db/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const extraFacultiesData = [
  {
    name: "İletişim Fakültesi",
    code: "COM",
    deanName: "Prof. Dr. Yusuf Adıgüzel",
    latitude: 40.7420, // Esentepe Kampüsü
    longitude: 30.3340,
    adminEmail: "admin.com@sau.edu.tr",
    adminName: "İletişim Admin",
    labs: [
      { name: "Mac Studio 1", type: "computer", capacity: 25, aiDesc: "Apple iMac computers with Final Cut Pro and Adobe Creative Cloud. Perfect for video editing, graphic design, and media production." },
      { name: "TV Stüdyosu", type: "other", capacity: 30, aiDesc: "Professional TV broadcasting studio with green screen, lighting grid, and multi-cam setup. Suitable for broadcasting practice and video shoots." },
      { name: "Radyo Stüdyosu", type: "other", capacity: 5, aiDesc: "Soundproof radio broadcasting room with professional microphones and mixing consoles. Ideal for podcast recording and radio shows." },
      { name: "Fotoğraf Stüdyosu", type: "other", capacity: 15, aiDesc: "Photography studio with backdrops, softboxes, and strobe lights. Great for portrait and product photography shoots." },
      { name: "Kurgu Odası A", type: "computer", capacity: 10, aiDesc: "Quiet editing suite with high-performance Windows PCs for post-production and rendering." },
      { name: "Kurgu Odası B", type: "computer", capacity: 10, aiDesc: "Quiet editing suite with dual-monitor setups for advanced video editing." },
      { name: "Haber Atölyesi", type: "seminar", capacity: 40, aiDesc: "Large seminar room equipped with a smart board and round tables, designed for journalism workshops and editorial meetings." },
      { name: "Halkla İlişkiler Lab", type: "computer", capacity: 30, aiDesc: "Standard computer lab with internet access and basic office software for PR campaigns and research." },
      { name: "Sinema Salonu", type: "seminar", capacity: 60, aiDesc: "Mini movie theater with a projector and surround sound system. Suitable for film screenings and film analysis classes." },
      { name: "Animasyon Laboratuvarı", type: "computer", capacity: 20, aiDesc: "High-end workstations with drawing tablets (Wacom) and 3D modeling software (Blender, Maya) for animation." }
    ]
  },
  {
    name: "Fen Fakültesi",
    code: "SCI",
    deanName: "Prof. Dr. Ali Osman Kuşakcı",
    latitude: 40.7390, // Esentepe Kampüsü
    longitude: 30.3330,
    adminEmail: "admin.sci@sau.edu.tr",
    adminName: "Fen Admin",
    labs: [
      { name: "Genel Kimya Lab", type: "chemistry", capacity: 40, aiDesc: "Basic chemistry laboratory with fume hoods, safety showers, and standard glassware. Suitable for introductory chemistry experiments." },
      { name: "Organik Kimya Lab", type: "chemistry", capacity: 30, aiDesc: "Advanced chemistry lab with rotary evaporators, spectrometers, and specialized ventilation for volatile organic compounds." },
      { name: "Mekanik Fizik Lab", type: "physics", capacity: 30, aiDesc: "Physics lab equipped with air tracks, pendulums, and force sensors for classical mechanics experiments." },
      { name: "Elektromanyetizma Lab", type: "physics", capacity: 30, aiDesc: "Physics lab with oscilloscopes, multimeters, and circuit boards for electricity and magnetism experiments." },
      { name: "Mikrobiyoloji Lab", type: "biology", capacity: 25, aiDesc: "Biology lab with microscopes, incubators, and autoclaves for studying microorganisms." },
      { name: "Moleküler Biyoloji Lab", type: "biology", capacity: 20, aiDesc: "Advanced biology lab with PCR machines, centrifuges, and gel electrophoresis equipment for DNA/RNA analysis." },
      { name: "Hesaplamalı Bilimler Lab", type: "computer", capacity: 50, aiDesc: "Computer lab with Linux workstations used for numerical analysis, physics simulations, and big data processing." },
      { name: "Optik Laboratuvarı", type: "physics", capacity: 15, aiDesc: "Dark room physics lab with lasers, lenses, and optical benches for studying light and optics." },
      { name: "Analitik Kimya Lab", type: "chemistry", capacity: 25, aiDesc: "Chemistry lab featuring precision balances and titration setups for quantitative chemical analysis." },
      { name: "Araştırma ve İnovasyon Lab", type: "research", capacity: 10, aiDesc: "Small, quiet research room for graduate students and professors working on specialized science projects." }
    ]
  },
  {
    name: "İlahiyat Fakültesi",
    code: "THEO",
    deanName: "Prof. Dr. Ahmet Bostancı",
    latitude: 40.7850, // Ozanlar
    longitude: 30.3950,
    adminEmail: "admin.theo@sau.edu.tr",
    adminName: "İlahiyat Admin",
    labs: [
      { name: "Kıraat Odası 1", type: "seminar", capacity: 15, aiDesc: "Acoustically treated quiet room for Quran recitation and vocal practice. Contains traditional seating and recording equipment." },
      { name: "Kıraat Odası 2", type: "seminar", capacity: 15, aiDesc: "Small acoustic room for Quran recitation practice with audio playback systems." },
      { name: "Hüsn-i Hat Atölyesi", type: "other", capacity: 20, aiDesc: "Art studio with drafting tables and specialized lighting for Islamic calligraphy (Hat) and illumination (Tezhip) arts." },
      { name: "Ebru Sanatı Atölyesi", type: "other", capacity: 20, aiDesc: "Workshop equipped with water basins and paints specifically for traditional Turkish paper marbling (Ebru)." },
      { name: "Arapça Dil Laboratuvarı", type: "computer", capacity: 30, aiDesc: "Computer lab with language learning software, headsets, and microphones for practicing Arabic listening and speaking." },
      { name: "İhtisas Kütüphanesi", type: "research", capacity: 40, aiDesc: "Quiet reading and research room containing rare manuscripts, tafsir, and hadith collections." },
      { name: "Seminer Salonu A", type: "seminar", capacity: 50, aiDesc: "Medium-sized lecture hall with a projector and podium, suitable for religious studies seminars and presentations." },
      { name: "Seminer Salonu B", type: "seminar", capacity: 50, aiDesc: "Medium-sized lecture hall equipped with video conferencing tools for guest lectures and remote speakers." },
      { name: "Musiki Odası", type: "other", capacity: 25, aiDesc: "Music room with traditional instruments (Ney, Kanun, Bendir) for Turkish Islamic music practice and choir rehearsals." },
      { name: "Lisansüstü Çalışma Odası", type: "research", capacity: 15, aiDesc: "Private, silent study space dedicated to master's and PhD students writing their theses." }
    ]
  }
];

async function seedExtra() {
  console.log("🌱 Seeding Additional Faculties & Rich AI Labs...");

  try {
    const passwordHash = await bcrypt.hash("admin123", 10);

    for (const data of extraFacultiesData) {
      // 1. Insert Faculty
      console.log(`\nInserting Faculty: ${data.name}...`);
      const [faculty] = await db.insert(faculties).values({
        name: data.name,
        code: data.code,
        deanName: data.deanName,
        latitude: data.latitude,
        longitude: data.longitude,
      }).returning();

      // 2. Insert Admin
      await db.insert(admins).values({
        facultyId: faculty.id,
        universityId: `ADM-${data.code}`,
        fullName: data.adminName,
        email: data.adminEmail,
        passwordHash,
        canApproveBookings: true,
        canManageFacilities: true,
      });

      // 3. Insert 10 Labs for this Faculty
      console.log(`   Adding 10 Labs for ${data.code}...`);
      for (let i = 0; i < data.labs.length; i++) {
        const labData = data.labs[i];
        await db.insert(labs).values({
          facultyId: faculty.id,
          name: labData.name,
          type: labData.type as any,
          floor: i < 5 ? 1 : 2, // Split across two floors
          roomNumber: `${i < 5 ? 1 : 2}0${(i % 5) + 1}`, // Generates 101-105, 201-205
          capacity: labData.capacity,
          aiDescription: labData.aiDesc,
          aiTags: [labData.type, data.code.toLowerCase(), "specialized"],
        });
      }

      console.log(`✅ Success! Created ${data.name} and 10 detailed labs.`);
    }

    console.log("\n🎉 Extra Seeding Complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Failed:", error);
    process.exit(1);
  }
}

seedExtra();
