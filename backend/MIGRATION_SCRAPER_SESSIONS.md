# DartConnect Scraper Sessions Migration

## Overview
This migration creates the `scraper_sessions` table to manage DartConnect live match scraping sessions for custom livestream overlays.

## Purpose
- Track active DartConnect scraper instances
- Store live match data for real-time broadcasting
- Enable public access for livestream overlays
- Support multiple concurrent scraping sessions

## Migration Details

### Table: `scraper_sessions`
- **id**: UUID primary key
- **watch_code**: Unique DartConnect watch code (e.g., "ABC123")
- **status**: Session status (active, stopped, error)
- **started_at**: When scraping session began
- **last_update**: Last time data was received
- **last_data**: Latest match data (JSON format)
- **created_at**: Record creation timestamp
- **updated_at**: Auto-updated timestamp

### Features
- **Row Level Security**: Enabled with public read/write policies
- **Realtime**: Enabled for live broadcasting to overlays
- **Indexes**: Optimized for watch_code and status queries
- **Auto-timestamps**: Automatic updated_at trigger

## How to Apply

### Option 1: Supabase Dashboard
1. Go to your Supabase project: https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `migration_add_scraper_sessions.sql`
4. Click **Run** to execute

### Option 2: Supabase CLI
```bash
cd backend
supabase db push --include-schema migration_add_scraper_sessions.sql
```

## Verification
After applying the migration, verify with:
```sql
-- Check table exists
SELECT * FROM scraper_sessions LIMIT 1;

-- Check realtime is enabled
SELECT * FROM pg_publication_tables WHERE tablename = 'scraper_sessions';

-- Test insert
INSERT INTO scraper_sessions (watch_code, status) 
VALUES ('TEST123', 'active');
```

## Expected Results
- New `scraper_sessions` table created
- Realtime broadcasting enabled
- Public policies allow overlay access
- Automatic timestamp management

## Usage
This table supports the DartConnect scraper system:
1. **Scraper** inserts new session when starting
2. **Scraper** updates `last_data` with live scores
3. **Overlay** subscribes to realtime changes
4. **Overlay** displays live updates instantly

## Related Files
- `../dartconnect-scraper/scraper.js` - Uses this table
- `../frontend/src/pages/StreamOverlay.tsx` - Reads from this table
- `../frontend/src/services/dartconnect.ts` - Service layer