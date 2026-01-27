# DartConnect Integration - Quick Setup

## Quick Start (5 Minutes)

### 1. Apply Database Migration

```bash
# Copy the SQL migration
# Open: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
# Paste contents of: backend/migration_add_dartconnect_integration.sql
# Click RUN
```

### 2. Enable in Tournament Settings

1. Open your tournament
2. Go to **Settings** tab
3. Toggle **Enable DartConnect Integration** → ON
4. (Optional) Toggle **Auto-Accept High Confidence Scores** → ON
5. Click **Save Settings**

### 3. Run a Match

```bash
cd dartconnect-scraper
node enhanced-scraper.js <WATCH_CODE> <TOURNAMENT_ID>
```

**Example:**
```bash
node enhanced-scraper.js ABC123 550e8400-e29b-41d4-a716-446655440000
```

### 4. Approve Results

1. Navigate to: `/tournament/<tournament-id>/match-results`
2. Review pending results
3. Click **Approve & Apply**
4. Standings update automatically!

## What You Get

✅ Automatic score capture from DartConnect tablets  
✅ Smart player name matching  
✅ Optional auto-accept for perfect matches  
✅ Visual approval interface  
✅ Automatic standings updates  
✅ Complete audit trail  

## Files Created/Modified

### New Files
- `backend/migration_add_dartconnect_integration.sql` - Database schema
- `dartconnect-scraper/enhanced-scraper.js` - Enhanced scraper with completion detection
- `frontend/src/pages/MatchResultsManager.tsx` - Results approval UI
- `frontend/src/components/DartConnectSettings.tsx` - Settings component
- `frontend/src/styles/MatchResultsManager.css` - Results page styling
- `frontend/src/styles/DartConnectSettings.css` - Settings styling

### Modified Files
- `frontend/src/types/index.ts` - Added new types
- `frontend/src/services/api.ts` - Added DartConnectService
- `frontend/src/App.tsx` - Added route for Match Results Manager

## Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Integration Enabled | Enable DartConnect scraping | `false` |
| Auto-Accept Scores | Auto-apply high-confidence matches | `false` |
| Require Manual Approval | All scores need review | `true` |

## Confidence Levels

- **100%** - Exact player name match → Auto-accept eligible
- **75%** - Fuzzy/partial match → Manual review required
- **0%** - No match found → Cannot apply

## Common Use Cases

### Scenario 1: Full Auto-Accept
**Settings:** Integration ON, Auto-Accept ON, Manual Approval OFF  
**Result:** High-confidence matches auto-update standings  
**Best For:** Tournaments with exact name matching

### Scenario 2: Review All
**Settings:** Integration ON, Auto-Accept OFF, Manual Approval ON  
**Result:** All matches require approval in Results Manager  
**Best For:** High-stakes tournaments, inconsistent naming

### Scenario 3: Hybrid
**Settings:** Integration ON, Auto-Accept ON, Manual Approval ON  
**Result:** High-confidence matches auto-update, others need review  
**Best For:** Most tournaments (recommended)

## Troubleshooting

**Scraper won't start?**
```bash
cd dartconnect-scraper
npm install
```

**No match found?**
- Check player names match exactly
- Verify match is scheduled, not completed
- Check tournament ID is correct

**Auto-accept not working?**
- Confidence must be ≥90%
- Auto-accept must be enabled in settings
- Match must be found

## Full Documentation

See `DARTCONNECT_INTEGRATION_GUIDE.md` for complete documentation.

## Support

- Check Supabase logs for errors
- Review scraper console output
- Verify database migration applied successfully
