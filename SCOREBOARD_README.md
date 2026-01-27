# Scoreboard Feature

## Overview

The **Live Scoreboard** is a real-time display component designed for external viewing during tournaments. Perfect for projection on TVs, monitors, or displays for spectators.

## Features

### Real-Time Updates
- ✅ **Auto-refresh every 10 seconds** - No manual refresh needed
- ✅ **Live match tracking** - Shows all in-progress matches
- ✅ **Match duration timer** - Displays elapsed time for each match
- ✅ **Score updates** - Real-time leg/set scores

### Display Sections

#### 1. Live Matches
- Current score for each player
- Board assignment
- Match duration
- Leading player highlighted in green
- Pulsing red indicator for live status
- Glowing animation on live match cards

#### 2. Upcoming Matches
- Next 10 scheduled matches
- Player names
- Board assignments
- Round information (Group Stage, Quarter-Final, etc.)

#### 3. Recent Results
- Last 5 completed matches
- Winner highlighted with trophy icon
- Final scores
- Match details (round, board)

## Database Schema

### Views Created

```sql
-- Live matches with full details
scoreboard_live_matches

-- Scheduled upcoming matches
scoreboard_upcoming_matches

-- Recently completed matches
scoreboard_recent_results
```

### Functions Available

```sql
-- Get complete scoreboard data as JSON
get_tournament_scoreboard(tournament_id UUID)

-- Get status of all boards
get_board_status_summary(tournament_id UUID)

-- Get match queue for specific board
get_board_match_queue(board_id UUID)
```

## Usage

### Access in Application

1. Navigate to any tournament
2. Click the **Scoreboard** tab (📺 icon)
3. The scoreboard displays automatically

### External Display Setup

#### Method 1: Direct Access (Development)
```
http://localhost:5173/tournament/{tournament-id}/scoreboard
```

#### Method 2: GitHub Pages (Production)
```
https://dowdarts.github.io/CGC-Tournament-Manager/tournament/{tournament-id}/scoreboard
```

### Full-Screen Mode

For clean display on external monitors:

1. Open the scoreboard URL
2. Press `F11` for full-screen (most browsers)
3. Or add `?fullscreen=true` to the URL (future feature)

## Deployment to GitHub Pages

### Quick Start

```bash
# Navigate to frontend directory
cd frontend

# Install gh-pages package
npm install --save-dev gh-pages

# Build and deploy
npm run deploy
```

### Automated Deployment

A GitHub Actions workflow is configured to automatically deploy on push to `main`:

```yaml
# .github/workflows/deploy.yml
# Automatically builds and deploys to GitHub Pages
```

**Enable GitHub Pages:**
1. Go to repository **Settings**
2. Navigate to **Pages**
3. Select `gh-pages` branch as source
4. Save

Your scoreboard will be live at:
```
https://dowdarts.github.io/CGC-Tournament-Manager/
```

## SQL Migration

Apply the scoreboard migration to your Supabase project:

```bash
# Copy the SQL file
cat backend/migration_scoreboard.sql

# Paste into Supabase SQL Editor and run
```

**What it creates:**
- 3 optimized views for scoreboard data
- 3 functions for data retrieval
- Performance indexes
- Proper permissions for anon/authenticated users

## Customization

### Update Refresh Rate

Edit `src/pages/Scoreboard.tsx`:

```typescript
// Change from 10000 (10 seconds) to desired interval
const interval = setInterval(loadScoreboardData, 10000);
```

### Styling

The scoreboard uses a dark theme optimized for projection:

- **Background**: Dark blue/black gradient (`#0f172a`)
- **Live indicator**: Pulsing red circle
- **Winning player**: Green highlight (`#22c55e`)
- **Scores**: Large monospace font for clarity

**To modify colors:**
```typescript
// In Scoreboard.tsx, update style objects:
background: '#0f172a' // Change main background
color: '#ef4444' // Change live indicator color
border: '3px solid #ef4444' // Change live match border
```

### Animation Speed

```css
/* In the <style> tag at bottom of Scoreboard.tsx */
@keyframes pulse {
  /* Adjust animation speed */
}

@keyframes glow {
  /* Adjust glow effect */
}
```

## Architecture

### Component Structure

```
Scoreboard.tsx
├── Header (Tournament name, time)
├── Live Matches Section
│   ├── Match Card (for each live match)
│   │   ├── Board & Round info
│   │   ├── Match duration
│   │   ├── Player 1 score
│   │   ├── VS divider
│   │   └── Player 2 score
│   └── Empty state (if no live matches)
├── Upcoming Matches Section
│   └── Table of next 10 matches
└── Recent Results Section
    └── List of last 5 completed matches
```

### Data Flow

```
Scoreboard Component
  ↓
Load Data (every 10s)
  ↓
Supabase Queries
  ├── Live Matches (status = 'in-progress')
  ├── Upcoming Matches (status = 'scheduled', limit 10)
  └── Recent Results (status = 'completed', limit 5)
  ↓
Update State
  ↓
Re-render Display
```

### Performance Optimizations

1. **Indexed Queries**: Custom indexes on `matches` table
2. **Limited Results**: Only fetch what's needed
3. **Optimized Views**: Pre-joined data in database views
4. **Efficient Polling**: 10-second interval balances freshness vs. load

## Troubleshooting

### Scoreboard Not Updating

**Issue**: Scores don't refresh

**Solutions**:
1. Check browser console for errors
2. Verify Supabase connection
3. Ensure matches are marked as 'in-progress'
4. Check network tab for API calls

### No Live Matches Shown

**Issue**: "No live matches" displayed when matches are active

**Solutions**:
1. Verify match `status` is set to `'in-progress'`
2. Check `started_at` timestamp is set
3. Confirm tournament ID in URL is correct
4. Review Supabase logs for query errors

### GitHub Pages 404

**Issue**: Page not found after deployment

**Solutions**:
1. Ensure GitHub Pages is enabled in repo settings
2. Check `gh-pages` branch exists
3. Verify `base` path in `vite.config.ts`
4. Wait 2-3 minutes after deployment

### CORS Errors

**Issue**: Cross-origin request blocked

**Solutions**:
1. Check Supabase project settings
2. Verify anon key is correct
3. Add GitHub Pages domain to Supabase allowed origins
4. Check browser security settings

## Best Practices

### For Tournament Day

1. **Test before the event**: Load scoreboard 30 minutes early
2. **Use dedicated device**: Separate from scoring device
3. **Check internet connection**: Stable connection required
4. **Bookmark the URL**: Save direct link to scoreboard
5. **Full-screen mode**: Use F11 for clean display
6. **Volume off**: Mute device to avoid notification sounds

### For Display Setup

1. **Screen resolution**: 1080p or higher recommended
2. **Refresh rate**: 60Hz minimum
3. **Cable quality**: Use HDMI 2.0 or better
4. **Display mode**: Duplicate or extend, not mirror
5. **Power settings**: Disable sleep mode
6. **Browser cache**: Clear before tournament starts

### For Developers

1. **Monitor Supabase quotas**: Track API usage
2. **Log errors**: Check browser console regularly
3. **Version control**: Tag releases before tournaments
4. **Backup database**: Before major events
5. **Test offline fallback**: Handle connection issues gracefully

## Future Enhancements

Potential features for future versions:

- [ ] Fullscreen API integration
- [ ] Custom themes/color schemes
- [ ] Tournament bracket display
- [ ] Player photos
- [ ] Sound effects for match completion
- [ ] Multi-tournament display
- [ ] QR code for easy access
- [ ] Print-friendly match schedules
- [ ] Touch controls for manual refresh
- [ ] Offline mode with cached data

## Support

For issues or feature requests:
1. Check this documentation first
2. Review the main project README
3. Check Supabase logs
4. Inspect browser console
5. Contact tournament administrator

## License

Same as main project - see root LICENSE file
