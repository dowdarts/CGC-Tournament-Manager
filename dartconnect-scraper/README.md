# DartConnect Live Stream Scraper

## Overview
This system creates a professional, branded scoreboard overlay for live streaming dart matches by scraping DartConnect's live match data in real-time. Perfect for tournament organizers who want custom branding without paying for DartConnect's Digital Steel events.

## Features
- ✅ **Real-time scraping** of DartConnect live match data
- ✅ **Professional overlay design** with custom branding
- ✅ **OBS-ready** with transparent background
- ✅ **Auto-reconnection** if connection drops
- ✅ **Multiple concurrent matches** support
- ✅ **Live indicators** and animations
- ✅ **Responsive design** for different screen sizes

## System Architecture

```
DartConnect TV → Puppeteer Scraper → Supabase Realtime → Stream Overlay → OBS
```

### Components
1. **Scraper** (`dartconnect-scraper/scraper.js`) - Node.js Puppeteer bot
2. **Database** (`scraper_sessions` table) - Stores session data
3. **Overlay** (`/stream-overlay`) - React component for OBS
4. **Realtime** - Supabase broadcasts for instant updates

## Quick Start

### 1. Setup Database
Apply the migration in Supabase Dashboard:
```sql
-- Copy contents of backend/migration_add_scraper_sessions.sql
```
Navigate to: https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh/sql

### 2. Install Scraper Dependencies
```bash
cd dartconnect-scraper
npm install
```

### 3. Start a DartConnect Match
1. Create a match on DartConnect
2. Get the **Watch Code** (e.g., "ABC123")
3. Note the URL: `https://tv.dartconnect.com/live/ABC123`

### 4. Run the Scraper
```bash
# Replace ABC123 with your actual watch code
node scraper.js ABC123
```

### 5. Setup OBS Overlay
1. Open OBS Studio
2. Add **Browser Source**
3. URL: `http://localhost:5173/stream-overlay?obs=true`
4. Size: 800x400 (adjust as needed)
5. Check "Shutdown source when not visible"

### 6. Go Live!
The overlay will show live scores, player names, legs, and active player indicator.

## Detailed Setup

### Environment Variables
Create `.env` in the `dartconnect-scraper` folder:
```env
SUPABASE_URL=https://pfujbgwgsxuhgvmeatjh.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### Scraper Usage
```bash
# Basic usage
node scraper.js WATCH_CODE

# Example with real watch code
node scraper.js XYZ789

# The scraper will:
# 1. Open DartConnect TV page in headless browser
# 2. Scrape live match data every second
# 3. Broadcast updates to Supabase realtime
# 4. Store session data for overlay recovery
```

### Overlay Configuration
Visit the overlay setup page:
- **Control Panel**: `http://localhost:5173/stream-overlay`
- **OBS Mode**: `http://localhost:5173/stream-overlay?obs=true`

#### OBS Setup Details
1. **Browser Source Settings**:
   - URL: Full overlay URL with `?obs=true`
   - Width: 800, Height: 400
   - FPS: 30 (default is fine)
   - Custom CSS: (optional for positioning)
   
2. **Position the Overlay**:
   - Drag to desired location (typically bottom third)
   - Scale as needed
   - Set above your main camera feed

## Customization

### Branding
Edit `StreamOverlay.tsx` to customize:
- **Colors**: Change gradient and theme colors
- **Logo**: Replace the monitor icon with your logo
- **Text**: Update "CGC TOURNAMENT" to your brand
- **Layout**: Adjust positioning and sizing

### Match Data Structure
The scraper provides this data structure:
```javascript
{
  player1: {
    name: "John Doe",
    score: "301",      // Current score
    legs: "2",         // Legs won
    isActive: true     // Currently throwing
  },
  player2: {
    name: "Jane Smith",
    score: "180", 
    legs: "1",
    isActive: false
  },
  match: {
    format: "First to 3 legs",
    currentLeg: "3",
    lastThrow: "180"   // Last dart score
  },
  timestamp: 1640995200000
}
```

## Troubleshooting

### Scraper Issues
```bash
# Check if DartConnect page loads
node -e "
const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  await page.goto('https://tv.dartconnect.com/live/YOUR_CODE');
  await page.waitForTimeout(10000);
  await browser.close();
})();
"

# Common fixes:
# 1. Update watch code
# 2. Check DartConnect is working
# 3. Verify Supabase connection
# 4. Update CSS selectors if DartConnect changes layout
```

### Overlay Issues
1. **No data showing**: Check scraper is running
2. **OBS not transparent**: Ensure ?obs=true parameter
3. **Connection lost**: Overlay auto-reconnects every 5 seconds
4. **Wrong scores**: Restart scraper to refresh selectors

### CSS Selectors
DartConnect may update their HTML structure. If scraping fails, update selectors in `scraper.js`:
```javascript
// Check browser developer tools on DartConnect TV page
// Update these selectors as needed:
const getPlayerScore = (playerNum) => {
  const selectors = [
    `#p${playerNum}_score`,        // Most common
    `.player-${playerNum}-score`,   // Alternative
    `.score-${playerNum}`,         // Backup
    `[data-player="${playerNum}"] .score`
  ];
  // ...
};
```

## Advanced Usage

### Multiple Matches
Run multiple scrapers for different matches:
```bash
# Terminal 1
node scraper.js ABC123

# Terminal 2  
node scraper.js DEF456

# Each creates separate Supabase channel
# Use different overlay URLs for each match
```

### Production Deployment
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