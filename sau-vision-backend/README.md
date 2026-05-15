# SAÜ-Vision Backend

Node.js + Express + TypeScript API for the SAÜ-Vision Smart Campus Platform.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **Database**: PostgreSQL + Drizzle ORM
- **AI Services**: Gemini API, NovaVision, puq.ai

## Project Structure
```
src/
├── app.ts                    # Express server entry point
├── db/
│   ├── client.ts             # Drizzle database client
│   └── schema/               # Database schemas (users, facilities, bookings, analytics)
├── middleware/
│   └── webhookAuth.ts        # HMAC & Bearer token verification
├── routes/
│   ├── api/                  # REST API routes
│   └── webhooks/             # NovaVision & puq.ai webhook handlers
├── services/
│   ├── geminiService.ts      # Natural language → booking intent (Gemini)
│   └── puqAiService.ts       # Post-event report submission
└── workers/
    └── antiGhostingWorker.ts # Auto-reclamation state machine (10min + 5min)
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Fill in your values in .env

# 3. Push database schema
npm run db:push

# 4. Start dev server
npm run dev
```

## API Endpoints
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET | `/api/facilities` | List all facilities |
| GET | `/api/facilities/density-map` | Live occupancy data |
| POST | `/api/bookings/parse` | Parse NL request via Gemini |
| POST | `/api/bookings` | Create a booking |
| POST | `/api/bookings/:id/checkin` | Register IoT QR check-in |
| POST | `/webhooks/novavision` | NovaVision occupancy webhook |
| POST | `/webhooks/puqai` | puq.ai report callback |

## Environment Variables
See `.env.example` for all required variables.
