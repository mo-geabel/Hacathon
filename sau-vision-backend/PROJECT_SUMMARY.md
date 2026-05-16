# SAÜ-Vision: Project Summary for AI Handover

## 🚀 Overview
SAÜ-Vision is an intelligent lab management system for Sakarya University (SAÜ). It transitions traditional lab bookings into a data-driven ecosystem focusing on student performance, behavioral accountability, and automated event management.

## 🛠️ Tech Stack
- **Backend**: Node.js, TypeScript, Express.js.
- **Database**: PostgreSQL (Neon) with Drizzle ORM.
- **AI Integration**: Google Gemini (parsing) and puq.ai (webhooks).
- **Security**: JWT-based authentication with role-based access (Admin/Faculty vs. Student).

## ✨ Key Features & Logic

### 1. Performance-Based Sorting (The "Priority Algorithm")
The Professor dashboard does not show requests chronologically. Instead, it uses an "Importance Score" to surface the best students:
- **Formula**: `(GPA * 5) + (Event Rating * 15) - (Ghosting Count * 30)`.
- **Logic**: Event Rating (0-5) has 3x the weight of GPA (0-4). Penalties for "ghosting" (no-shows) heavily suppress requests.

### 2. Unified Public Event Model
- Every approved booking is automatically a **Public Event** visible to the campus.
- Students register as attendees and receive unique QR tokens.

### 3. QR Attendance & Anti-Ghosting
- **Check-in**: Organizers scan student QR codes via `POST /api/bookings/checkin`.
- **Status Tracking**: Registrations move from `registered` -> `attended`.
- **Conclude Action**: `POST /api/bookings/:id/conclude` is called when an event ends.
- **Automatic Punishment**: 
    - Students who registered but never checked in (no-shows) are flagged.
    - Their `eventRating` is automatically decreased by **0.5**.
    - Their `ghostedEventCount` is incremented.
    - This directly affects their future priority score.

### 4. AI-Powered Booking (`/parse`)
- Translates natural language (e.g., "I need a lab for 10 people for Python") into a structured request.
- Matches against available labs based on capacity, tags, and faculty ownership.
- Integrates with `puq.ai` webhooks for advanced reasoning.

## 📊 Database Schema Highlights
- **`bookings`**: Stores schedules, statuses, and AI-parsed metadata.
- **`registrations`**: Tracks student attendance for specific bookings.
- **`students`**: Enhanced with `gpa`, `eventRating`, and `ghostedEventCount`.
- **`student_history`**: Behavioral ledger logging every creation, cancellation, and penalty.

## 🧪 Verification
- A comprehensive test suite `test-bookings-api.ts` covers the entire lifecycle:
    - Auth & Scoping.
    - Booking creation & Faculty-based approval.
    - QR fetching & Scanning.
    - Event conclusion & Automated punishment verification.

## 📂 Key Files
- `src/db/schema/`: Database definitions (bookings, registrations, students, etc.).
- `src/routes/api/bookings.ts`: Core logic for sorting, check-in, and conclusion.
- `test-bookings-api.ts`: E2E validation script.
- `.env`: Contains `PUQAI_WEBHOOK_TOKEN` and `GEMINI_API_KEY`.
