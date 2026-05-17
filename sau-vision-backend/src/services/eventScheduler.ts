import { db } from "../db/client";
import { bookings, registrations, students, studentHistory } from "../db/schema";
import { eq, and, lte, inArray } from "drizzle-orm";
import axios from "axios";

export async function concludeEvent(bookingId: string) {
  console.log(`[EventScheduler] Concluding event: ${bookingId}`);
  
  const booking = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    with: {
      registrations: true,
      student: { columns: { fullName: true, email: true } },
      lab: {
        with: {
          faculty: {
            with: {
              admins: {
                columns: { fullName: true, email: true, jobTitle: true },
                where: (a: any, { eq: eqFn }: any) => eqFn(a.isActive, true),
              },
            },
          },
        },
      },
    }
  });

  if (!booking) {
    console.error(`[EventScheduler] Booking not found: ${bookingId}`);
    return null;
  }

  if (booking.status === "completed") {
    console.log(`[EventScheduler] Event already concluded: ${bookingId}`);
    return null;
  }

  // 1. Find no-shows (registered but didn't attend)
  const noShows = booking.registrations.filter((r: any) => r.status === "registered");

  // 2. Punish no-shows
  for (const noShow of noShows) {
    // Update registration status to "no_show"
    await db.update(registrations)
      .set({ status: "no_show", updatedAt: new Date() })
      .where(eq(registrations.id, noShow.id));

    // Fetch the student
    const student = await db.query.students.findFirst({
      where: eq(students.id, (noShow as any).studentId)
    });

    if (student) {
      // Decrease rating and increase ghosted count
      // Rating drops by 0.5 (min 0)
      const newRating = Math.max((student.eventRating || 5.0) - 0.5, 0);
      const newGhostCount = (student.ghostedEventCount || 0) + 1;

      await db.update(students)
        .set({
          eventRating: newRating,
          ghostedEventCount: newGhostCount,
          updatedAt: new Date()
        })
        .where(eq(students.id, student.id));

      // Log punishment in their history
      await db.insert(studentHistory).values({
        studentId: student.id,
        bookingId: booking.id,
        eventType: "ghosted",
        description: `Failed to attend event '${booking.title}'. Rating decreased to ${newRating.toFixed(1)} and ghost count increased.`
      });
    }
  }

  // 3. Mark booking as completed
  const [completedBooking] = await db.update(bookings)
    .set({ status: "completed", actualEnd: new Date(), updatedAt: new Date() })
    .where(eq(bookings.id, booking.id))
    .returning();

  // 4. Send certificate webhooks to puq.ai for all attendees (only if required)
  const attendedRegistrations = await db.query.registrations.findMany({
    where: and(
      eq(registrations.bookingId, booking.id),
      eq(registrations.status, "attended")
    ),
    with: {
      student: { columns: { fullName: true, email: true } }
    }
  });

  if (booking.requiresCertificate && attendedRegistrations.length > 0) {
    const PUQ_WEBHOOK = "https://api.puq.ai/h/570e414d8707/sync";

    // Format the event date in Turkish locale
    const eventDate = new Date(booking.scheduledStart).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Fire-and-forget
    (async () => {
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      for (let i = 0; i < attendedRegistrations.length; i++) {
        const reg = attendedRegistrations[i];
        const payload = {
          participant_name: (reg as any).student?.fullName || "Unknown",
          event_date: eventDate,
          event_name: booking.title,
          participant_email: (reg as any).student?.email || "",
          organizer_name: (booking as any).student?.fullName || "Unknown Organizer",
        };

        try {
          await axios.post(PUQ_WEBHOOK, payload, {
            headers: { "Content-Type": "application/json" },
            timeout: 8000,
          });
          console.log(`✅ [${i + 1}/${attendedRegistrations.length}] puq.ai certificate sent for: ${payload.participant_email}`);
        } catch (err: any) {
          console.error(`❌ [${i + 1}/${attendedRegistrations.length}] puq.ai webhook failed for ${payload.participant_email}:`, err.message);
        }

        if (i < attendedRegistrations.length - 1) {
          await sleep(10000);
        }
      }

      console.log(`🏁 puq.ai certificate loop complete. ${attendedRegistrations.length} certificate(s) processed.`);
    })();
  } else {
    console.log(`ℹ️ Skipping certificates for event '${booking.title}' (requiresCertificate: ${booking.requiresCertificate}, attendees: ${attendedRegistrations.length})`);
  }

  // 5. Send admin event-report to puq.ai
  (async () => {
    const { getNovaVisionStats } = require("./novavision"); // dynamic import to prevent circular dependency issues
    const visionStats = getNovaVisionStats();
    
    const PUQ_ADMIN_WEBHOOK = "https://api.puq.ai/h/584d68b66834/sync";
    const lab = (booking as any).lab;
    const faculty = lab?.faculty;
    const adminsList: { fullName: string; email: string; jobTitle?: string }[] = faculty?.admins ?? [];

    const attendeeNames = attendedRegistrations.map((r: any) => r.student?.fullName || "Unknown");
    const noShowNames   = noShows.map((r: any) => r.studentId);

    const reportPayload = {
      report_type:         "event_summary",
      event_name:          booking.title,
      event_description:   booking.description ?? "",
      event_date:          new Date(booking.scheduledStart).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }),
      event_start_time:    new Date(booking.scheduledStart).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      event_end_time:      new Date(booking.scheduledEnd).toLocaleTimeString("tr-TR",   { hour: "2-digit", minute: "2-digit" }),
      organizer_name:      (booking as any).student?.fullName ?? "Unknown",
      organizer_email:     (booking as any).student?.email    ?? "",
      lab_name:            lab?.name       ?? "Unknown Lab",
      lab_room:            lab?.roomNumber ?? "N/A",
      lab_floor:           lab != null ? `Floor ${lab.floor}` : "N/A",
      faculty_name:        faculty?.name   ?? "Unknown Faculty",
      responsible_admins:  adminsList.map((a) => `${a.fullName} (${a.email})`).join(", ") || "N/A",
      expected_attendees:  booking.expectedAttendees,
      actual_attendees:    attendedRegistrations.length,
      max_video_attendance: visionStats.totalStudents, // <-- Injected from Nova Vision
      no_shows:            noShows.length,
      attendance_rate:     booking.expectedAttendees > 0
                             ? `${Math.round((attendedRegistrations.length / booking.expectedAttendees) * 100)}%`
                             : "N/A",
      attendee_list:       attendeeNames.join(", ") || "None",
      concluded_at:        new Date().toISOString(),
    };

    console.log("📊 Sending admin event report to puq.ai...");
    try {
      await axios.post(PUQ_ADMIN_WEBHOOK, reportPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 8000,
      });
      console.log("✅ Admin event report sent successfully.");
    } catch (err: any) {
      console.error("❌ Admin report webhook failed:", err.message);
    }
  })();

  return {
    booking: completedBooking,
    stats: {
      totalRegistrations: booking.registrations.length,
      attended: attendedRegistrations.length,
      noShowsPunished: noShows.length,
      certificatesSent: booking.requiresCertificate ? attendedRegistrations.length : 0,
    }
  };
}

export function startEventScheduler() {
  console.log("⏱️ Event Scheduler starting... Polling every 60s for expired events.");
  
  setInterval(async () => {
    try {
      const now = new Date();
      // Find events that have ended but are not yet completed
      const expiredEvents = await db.query.bookings.findMany({
        where: and(
          inArray(bookings.status, ['active', 'approved']),
          lte(bookings.scheduledEnd, now)
        )
      });

      if (expiredEvents.length > 0) {
        console.log(`[EventScheduler] Found ${expiredEvents.length} expired events to conclude.`);
        for (const event of expiredEvents) {
          await concludeEvent(event.id);
        }
      }
    } catch (error) {
      console.error("[EventScheduler] Error during polling:", error);
    }
  }, 60000); // Check every minute
}
