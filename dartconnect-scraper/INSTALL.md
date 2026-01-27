# DartConnect Scraper Installation

## Quick Install Script

Run this in the `dartconnect-scraper` directory:

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit with your Supabase credentials
notepad .env

# Test the scraper
node scraper.js TEST123
```

## Manual Installation

### 1. Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase project with `scraper_sessions` table

### 2. Dependencies
```bash
npm install puppeteer @supabase/supabase-js dotenv
```

### 3. Environment Setup
Create `.env` file:
```env
SUPABASE_URL=https://pfujbgwgsxuhgvmeatjh.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Database Migration
Execute in Supabase SQL Editor:
```sql
-- From ../backend/migration_add_scraper_sessions.sql
CREATE TABLE scraper_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  watch_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz DEFAULT now() NOT NULL,
  last_update timestamptz DEFAULT now() NOT NULL,
  last_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE scraper_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public access" ON scraper_sessions FOR ALL USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE scraper_sessions;
```

### 5. First Run
```bash
# Replace with actual DartConnect watch code
node scraper.js ABC123
```

You should see:
```
🎯 Initializing DartConnect scraper for watch code: ABC123
🌐 Navigating to: https://tv.dartconnect.com/live/ABC123
🚀 Starting live scraping...
📡 Broadcasted update: { player1: { name: "Player 1", score: "501" ... } }
```

## Troubleshooting

### Common Issues

#### "Module not found"
```bash
npm install
```

#### "ECONNREFUSED" (Supabase)
Check your `.env` file and Supabase credentials.

#### "Page didn't load"
Verify the DartConnect watch code is correct and the match is active.

#### "No such element"
DartConnect may have changed their HTML. Update CSS selectors in `scraper.js`.

### Testing Without DartConnect
```bash
# Create mock data for testing
node -e "
const DartConnect = require('./scraper.js');
const scraper = new DartConnect();
// Test Supabase connection
console.log('Testing Supabase...');
"
```

### Development Mode
Edit `scraper.js` to see browser:
```javascript
this.browser = await puppeteer.launch({ 
  headless: false,  // Change this line
  args: ['--no-sandbox']
});
```