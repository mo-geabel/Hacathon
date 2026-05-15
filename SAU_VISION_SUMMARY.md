# SAÜ-Vision: Smart Campus Ecosystem

## 📌 Project Overview
**SAÜ-Vision** is a University Facility & Activity Management Platform designed specifically for Sakarya University. Its core mission is to solve resource management (Kaynak Yönetimi) inefficiencies across the campus by combining traditional booking systems with cutting-edge AI and IoT technologies.

---

## 🛠️ Technology Stack
* **Frontend**: React / TypeScript (Vite)
* **Backend**: Node.js / Express / TypeScript
* **Database**: PostgreSQL (Neon Serverless)
* **ORM**: Drizzle ORM
* **Authentication**: JWT (JSON Web Tokens) & bcrypt

---

## 🧠 Core AI & External Services
1. **Gemini API (Natural Language UI)**: 
   Translates natural language requests from students (e.g., *"I need a lab for 30 people with AutoCAD tomorrow"*) into structured JSON data, matching them against the `ai_description` of available labs to find the perfect fit.
2. **NovaVision (Vision AI)**: 
   Real-time camera analytics that monitor live occupancy (`current_occupancy`) in the labs and trigger webhooks.
3. **puq.ai (Agentic Orchestration)**: 
   Handles post-event ROI calculation, generates engagement reports, and automatically issues PDF certificates to attendees.

---

## ⚙️ Core System Rules & Workflows

### 1. Intent-Based Booking
Instead of manually searching through endless drop-down menus, students type what they need. Gemini reads the request, scans the database of labs, and proposes the best available room based on equipment, capacity, and schedule.

### 2. The Anti-Ghosting Protocol (Autonomous Reclamation)
To prevent "ghost bookings" (where a student reserves a room but never shows up), the system uses a strict State Machine worker:
* **T+10 Minutes**: If NovaVision's webhook reports `person_count: 0` ten minutes after the scheduled start time, the system triggers a warning.
* **T+15 Minutes**: If no student scans the IoT QR code at the door (Check-in) 5 minutes after the warning, the booking status automatically flips to `ghosted`.
* **Consequence**: The lab immediately becomes `available` for others to book. The student's profile increments `ghostedEventCount`, which can restrict future booking privileges.

### 3. Event Reputation & ROI
When an event finishes, **puq.ai** calculates an ROI score based on expected vs. actual attendees and duration. This score updates the lab's `avgRoiScore` (showing which rooms are used efficiently) and updates the student's personal `eventRating`.

---

## 🗄️ Database Architecture (Neon + Drizzle)

1. **Faculties**: Represents the university buildings/departments (e.g., Engineering). Holds map coordinates and floor plan URLs.
2. **Admins**: Faculty staff. Tied to exactly one Faculty. They receive and approve/reject booking requests for labs in their building.
3. **Students**: The users. They have a GPA, an `eventRating`, and a `ghostedEventCount` to track reliability.
4. **Labs**: The physical spaces (computer labs, seminar rooms, etc.). Contains `ai_description` for Gemini matching, equipment JSON, and IoT/NovaVision integration IDs.
5. **Bookings**: The events created by students. Tracks scheduled times, actual check-in times, and the entire Anti-Ghosting state flow.
6. **Registrations**: Allows students to sign up to attend an event (Booking) created by another student. Tracks their individual attendance.

---

## 🚀 Current Status (Backend)
* **Completed**: Full PostgreSQL schema deployed to Neon.
* **Completed**: JWT Authentication middleware and routing.
* **Completed**: Core REST APIs (`GET /api/faculties`, `/api/labs`, `/api/bookings`, `/api/registrations`).
* **Next Major Phase**: Implementing the Gemini Parsing Engine (`/api/bookings/parse`) and the Anti-Ghosting / Webhook listeners.
