# CGC DartConnect Scraper Service

Background service for automatically scraping live match scores from DartConnect tablets and submitting them to the tournament management system.

## Features

- ✅ **24/7 Background Operation** - Runs independently of the frontend
- ✅ **Multi-Tablet Support** - Monitor up to 4 DartConnect watch codes simultaneously
- ✅ **Automatic Player Matching** - Intelligently matches DartConnect players to tournament roster
- ✅ **Auto-Accept Scores** - Optional automatic approval of high-confidence matches
- ✅ **Real-time Monitoring** - Checks for match completion every 5 seconds
- ✅ **Auto-Restart** - Automatically restarts on crashes with PM2
- ✅ **Detailed Logging** - Winston logger with file and console output

## How It Works

1. **Database Polling**: Service checks the tournament settings every 10 seconds for active watch codes
2. **Browser Automation**: Launches Puppeteer instances for each watch code
3. **Match Monitoring**: Scrapes DartConnect pages every 5 seconds for match completion
4. **Player Matching**: Uses PostgreSQL function to match player names (exact or fuzzy matching)
5. **Result Submission**: Creates pending results in the database for review/auto-approval
6. **Graceful Shutdown**: Stops all browsers when watch codes are removed

## Prerequisites

- Node.js 16+ and npm
- Access to Supabase database (Service Role Key required)
- Chrome/Chromium for Puppeteer (auto-installed)
- PM2 (optional, for production deployment)

## Installation

### 1. Install Dependencies

```bash
cd dartconnect-scraper
npm install
```

### 2. Install PM2 (Optional - For Production)

```bash
npm install -g pm2
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Tournament Configuration
TOURNAMENT_ID=your-tournament-uuid-here

# Scraper Settings
POLL_INTERVAL_MS=10000              # Check DB every 10 seconds
SCRAPER_CHECK_INTERVAL_MS=5000      # Check DartConnect every 5 seconds
MAX_CONCURRENT_SCRAPERS=4

# Logging
LOG_LEVEL=info
LOG_FILE=logs/scraper.log

# Environment
NODE_ENV=production
```

### 4. Get Your Configuration Values

#### Supabase URL and Service Key
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **Service Role Key** → `SUPABASE_SERVICE_KEY` (⚠️ Keep this secret!)

#### Tournament ID
1. Open your tournament in the CGC Tournament Manager
2. Copy the UUID from the URL: `/tournament/{uuid}`
3. Paste into `TOURNAMENT_ID`

## Usage

### Development Mode (with auto-restart on code changes)

```bash
npm run dev
```

### Production Mode (manual start)

```bash
npm start
```

### Production Mode (with PM2 - Recommended)

```bash
# Start the service
npm run pm2:start

# Check status
npm run pm2:status

# View logs
npm run pm2:logs

# Restart service
npm run pm2:restart

# Stop service
npm run pm2:stop
```

## How to Use with Tournament Manager

### Step 1: Enable DartConnect Integration

1. Open your tournament in CGC Tournament Manager
2. Go to **Settings** tab
3. Toggle **Enable DartConnect Integration** to ON
4. Configure settings:
   - **Auto-Accept Scores**: Automatically approve high-confidence matches
   - **Require Manual Approval**: Force manual review for all results

### Step 2: Add Watch Codes

1. Get watch codes from DartConnect tablets (e.g., `ABCD`)
2. Enter up to 4 watch codes in the **Active Watch Codes** section
3. Click **Save Watch Codes**

### Step 3: Start the Scraper Service

The scraper service will:
- Detect the watch codes automatically
- Launch browsers for each watch code
- Monitor matches in real-time
- Submit results when matches complete

### Step 4: Review Results

- **Auto-Accept ON**: High-confidence matches are automatically applied
- **Manual Review**: Go to **Match Results** tab to approve/reject pending results

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Tournament Manager Frontend (React)                    │
│  - Settings: Enable integration, add watch codes        │
│  - Match Results: Review pending results                │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  Supabase Database (PostgreSQL)                         │
│  - tournaments.dartconnect_watch_codes                  │
│  - pending_match_results                                │
│  - match_dartconnect_players() function                 │
└─────────────────────────────────────────────────────────┘
                          ▲
                          │
┌─────────────────────────────────────────────────────────┐
│  DartConnect Scraper Service (Node.js)                  │
│  ├── index.js           (Main orchestrator)             │
│  ├── dartconnect-scraper.js  (Puppeteer logic)          │
│  └── config.js          (Environment config)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│  DartConnect TV                                         │
│  - https://tv.dartconnect.com/history/match/{code}      │
└─────────────────────────────────────────────────────────┘
```

## Logging

Logs are written to:
- **Console**: Real-time output when running
- **File**: `logs/scraper.log` (configurable)
- **PM2 Logs**: `logs/pm2-out.log` and `logs/pm2-error.log`

View logs:

```bash
# Tail logs in real-time
npm run pm2:logs

# Or view file directly
tail -f logs/scraper.log
```

## Troubleshooting

### Scraper Not Starting

**Check configuration:**

```bash
node -e "console.log(require('./config'))"
```

**Verify database connection:**
- Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` are correct
- Test connection in Supabase Dashboard

### No Matches Being Detected

**Check watch codes:**
- Ensure watch codes are entered in Settings tab
- Verify watch codes are valid on DartConnect
- Check scraper logs for errors

**Manual test:**

```bash
# Visit DartConnect page directly
https://tv.dartconnect.com/history/match/YOUR_CODE
```

### Player Names Not Matching

**Check player names in database:**
- Ensure players are added to tournament roster
- Player names must match DartConnect names (case-insensitive)
- Fuzzy matching allows partial matches

**Test matching function in Supabase SQL Editor:**

```sql
SELECT * FROM match_dartconnect_players(
  'your-tournament-id',
  'Player 1 Name',
  'Player 2 Name'
);
```

### Scraper Crashes

**Check PM2 status:**

```bash
npm run pm2:status
```

**View error logs:**

```bash
npm run pm2:logs
```

**Common issues:**
- Out of memory: Reduce `MAX_CONCURRENT_SCRAPERS`
- Puppeteer errors: Install Chrome dependencies
- Network timeouts: Check internet connection

### PM2 Not Starting

**Install Chrome dependencies (Linux):**

```bash
sudo apt-get install -y \
  chromium-browser \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libnss3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxkbcommon0 \
  libpangocairo-1.0-0
```

## Performance

- **CPU Usage**: ~2-5% per active scraper
- **Memory Usage**: ~150-200 MB per Puppeteer instance
- **Network**: Minimal (checks every 5 seconds)
- **Recommended**: 4 scrapers max on standard hardware

## Security

⚠️ **Important Security Notes:**

- **Service Role Key**: Keep `SUPABASE_SERVICE_KEY` secret! Never commit to Git.
- **File Permissions**: Ensure `.env` is readable only by service user
- **Network Access**: Service needs outbound access to Supabase and DartConnect
- **RLS Bypass**: Service role key bypasses Row Level Security policies

## Updates

### Updating Watch Codes

No restart needed! The service polls the database every 10 seconds and automatically:
- Starts scrapers for new watch codes
- Stops scrapers for removed watch codes

### Updating Configuration

Restart required for `.env` changes:

```bash
npm run pm2:restart
```

## Support

- **Frontend Issues**: Check CGC-Tournament-Manager repository
- **Database Issues**: Run migration in Supabase SQL Editor
- **Scraper Issues**: Check logs in `logs/scraper.log`

## License

MIT
For production streaming:
1. **Deploy scraper** on dedicated server/VPS
2. **Use GitHub Pages** for overlay hosting
3. **Monitor uptime** with process managers
4. **Backup strategy** for critical matches

### Development
```bash
# Run with auto-restart
npm run dev

# Debug mode (visible browser)
# Edit scraper.js: headless: false

# Test overlay locally
cd ../frontend
npm run dev
```

## Security & Compliance

### Rate Limiting
The scraper requests DartConnect every 1 second. This is respectful and shouldn't trigger rate limiting.

### Terms of Service
- ✅ Only scrapes **public** DartConnect TV pages
- ✅ No login or private data access
- ✅ Equivalent to manual viewing
- ✅ No bulk downloading or storage

### Performance
- Uses headless Chrome for efficiency
- Minimal CPU/memory footprint
- Auto-cleanup on exit
- Browser instance reuse

## Contributing

### Adding Features
1. Fork the repository
2. Create feature branch
3. Add new functionality to scraper or overlay
4. Test with live DartConnect match
5. Submit pull request

### Common Enhancements
- [ ] Match history/replay system
- [ ] Multiple overlay themes
- [ ] Sound effects/alerts
- [ ] Social media integration
- [ ] Tournament bracket overlay
- [ ] Player statistics display

## Support

### Common URLs
- **DartConnect TV**: https://tv.dartconnect.com/live/WATCH_CODE
- **Supabase Dashboard**: https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh
- **Local Overlay**: http://localhost:5173/stream-overlay
- **GitHub Pages**: https://aads.github.io/CGC-Tournament-Manager/stream-overlay

### Error Codes
- `ECONNREFUSED`: Supabase connection issue
- `ERR_NAME_NOT_RESOLVED`: Invalid watch code or network issue  
- `TimeoutError`: DartConnect page loading slowly
- `No such element`: CSS selectors need updating

For support, check the GitHub issues or create a new issue with:
1. Watch code (if comfortable sharing)
2. Error message and full logs
3. Operating system and Node.js version
4. Screenshot of DartConnect page if possible