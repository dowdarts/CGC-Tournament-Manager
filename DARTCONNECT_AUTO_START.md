# DartConnect Auto-Start Scraper

## Overview

The scraper now starts/stops automatically when you toggle DartConnect on/off in the frontend.

## How It Works

**Architecture:**
1. **Control Server** (`backend/scraper-control.js`) - Manages scraper lifecycle
2. **DartConnect Scraper** (`dartconnect-scraper/index.js`) - Monitors matches  
3. **Frontend Toggle** - Calls control server API to start/stop scraper

**Flow:**
```
User toggles DartConnect ON
  → Frontend calls POST /api/scraper/start
    → Control server spawns scraper process
      → Scraper monitors database for watch codes
        → Reports match results to database
          → Frontend displays results

User toggles DartConnect OFF
  → Frontend calls POST /api/scraper/stop
    → Control server terminates scraper process
```

## Setup

### 1. Configure Scraper Environment

```bash
cd dartconnect-scraper
cp .env.example .env
```

Edit `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
TOURNAMENT_ID=your-tournament-id
```

### 2. Start Control Server

```bash
cd backend
node scraper-control.js
```

This runs on `http://localhost:3001` and manages the scraper.

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

### 4. Use the Toggle

1. Open your tournament in the frontend
2. Go to Settings → DartConnect
3. Toggle "Enable DartConnect Integration" ON
4. Watch the status indicators:
   - **Server Connection:** Connected/Disconnected
   - **Scraper Service:** 🟢 Running / 🔴 Stopped

## Status Indicators

**Scraper Service States:**
- 🟢 **Running** - Actively monitoring matches
- 🔴 **Stopped** - Not running
- 🟡 **Starting...** - Launching
- 🟡 **Stopping...** - Shutting down

## API Endpoints

The control server provides:

- `GET /health` - Health check
- `GET /api/scraper/status` - Get scraper status
- `POST /api/scraper/start` - Start scraper
- `POST /api/scraper/stop` - Stop scraper  
- `POST /api/scraper/restart` - Restart scraper

## Development vs Production

**Development (Local):**
```bash
# Terminal 1
cd backend
node scraper-control.js

# Terminal 2  
cd frontend
npm run dev
```

**Production:**
- Deploy control server as a service (PM2, systemd, Docker)
- Control server runs 24/7
- Frontend calls it to manage scraper lifecycle

## Troubleshooting

**Scraper won't start:**
- Check control server is running: `http://localhost:3001/health`
- Check scraper `.env` file has correct credentials
- Check console logs in control server terminal

**Toggle doesn't work:**
- Open browser console (F12) for error messages
- Verify control server is accessible
- Check CORS if frontend on different domain

**Scraper stops unexpectedly:**
- Check scraper logs: Control server terminal shows scraper output
- Verify Supabase credentials are valid
- Check database migrations are applied

## Log Monitoring

All scraper output appears in the control server terminal with `[Scraper]` prefix:

```
[Scraper] Starting DartConnect scraper...
[Scraper] Connected to Supabase
[Scraper] Polling for watch codes...
[Scraper] Found 2 active watch codes
```

## Next Steps

1. Start control server: `node backend/scraper-control.js`
2. Start frontend dev server
3. Toggle DartConnect ON
4. Add watch codes
5. Monitor live matches!
