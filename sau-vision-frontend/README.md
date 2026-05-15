# SAÜ-Vision Frontend

React + Vite + TypeScript UI for the SAÜ-Vision Smart Campus Platform.

## Tech Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React

## Project Structure
```
src/
├── main.tsx          # React entry point
├── App.tsx           # Router + layout
├── index.css         # Global styles & design system
├── lib/
│   └── api.ts        # Axios client + API helpers
├── hooks/
│   └── useFacilities.ts  # Live occupancy polling hook
├── components/
│   ├── Navbar.tsx        # Top navigation
│   ├── FacilityCard.tsx  # Facility with occupancy bar
│   ├── DensityMap.tsx    # Live facility grid
│   ├── StatsBar.tsx      # Active / available / ghosted counters
│   └── BookingForm.tsx   # NL input → Gemini parse → confirm
└── pages/
    ├── HomePage.tsx      # Hero + stats + density map
    ├── BookPage.tsx      # Booking form page
    └── DashboardPage.tsx # Admin overview
```

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Set VITE_API_URL to your backend URL

# 3. Start dev server
npm run dev
```

App runs at **http://localhost:3000**

> The Vite dev server proxies `/api` requests to `http://localhost:4000` automatically.

## Pages
| Route | Description |
|-------|-------------|
| `/` | Live density map + hero |
| `/book` | Natural language booking form |
| `/dashboard` | Admin facility & booking overview |
