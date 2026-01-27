# DartConnect Live Scraping Integration - README Entry

Add this section to the main README.md:

---

## 🎯 DartConnect Live Scraping Integration

**NEW!** Automatically capture match scores from DartConnect tablets and integrate them with your tournament.

### Features

- ✅ **Automatic Score Capture** - Monitor live matches and detect completion
- ✅ **Smart Player Matching** - Links scraped results to scheduled matches  
- ✅ **Auto-Accept Option** - High-confidence matches update automatically
- ✅ **Match Results Manager** - Visual interface for reviewing and approving scores
- ✅ **Audit Trail** - Complete history of all score changes
- ✅ **Flexible Configuration** - Control auto-accept and approval requirements

### Quick Setup

1. **Apply Database Migration**
   ```bash
   # Open Supabase SQL Editor
   # Run: backend/migration_add_dartconnect_integration.sql
   ```

2. **Enable in Tournament Settings**
   - Navigate to tournament settings
   - Toggle "Enable DartConnect Integration"
   - Configure auto-accept preferences
   - Save settings

3. **Run the Scraper**
   ```bash
   cd dartconnect-scraper
   node enhanced-scraper.js <WATCH_CODE> <TOURNAMENT_ID>
   ```

4. **Approve Results**
   - Visit the Match Results Manager
   - Review pending results
   - Click "Approve & Apply"
   - Standings update automatically!

### Documentation

- 📖 [Complete Integration Guide](DARTCONNECT_INTEGRATION_GUIDE.md) - Full documentation
- ⚡ [Quick Start Guide](DARTCONNECT_QUICKSTART.md) - 5-minute setup
- 📋 [Implementation Summary](DARTCONNECT_IMPLEMENTATION_SUMMARY.md) - Technical details

### How It Works

```
DartConnect Tablets → Enhanced Scraper → Database → Match Results Manager → Tournament Standings
```

When players use DartConnect tablets to score matches, the scraper:
1. Monitors the live match on tv.dartconnect.com
2. Detects when the match is completed
3. Extracts scores, player names, and statistics
4. Matches players with scheduled tournament matches
5. Creates a pending result for approval
6. (Optional) Auto-accepts high-confidence matches
7. Updates standings when approved

### Configuration Options

| Feature | Description | Default |
|---------|-------------|---------|
| Integration Enabled | Enable DartConnect scraping | `false` |
| Auto-Accept Scores | Automatically apply high-confidence matches (≥90%) | `false` |
| Require Manual Approval | All scores need review before applying | `true` |

### Benefits

- **Saves Time** - No manual score entry required
- **Reduces Errors** - Scores captured directly from tablets
- **Real-time Updates** - Standings update immediately upon approval
- **Complete Audit Trail** - Track all score changes and who approved them
- **Flexible** - Choose between full automation or manual review

### Use Cases

**Tournament with Perfect Name Matching**
- Enable auto-accept
- Scores automatically update standings
- Review only problematic matches

**High-Stakes Tournament**
- Require manual approval for all matches
- Review every score before applying
- Full control and verification

**Hybrid Approach** (Recommended)
- Auto-accept high-confidence matches
- Manually review uncertain matches
- Balance of speed and control

---

## Project Structure (Updated)

```
CGC-Tournament-Manager/
├── backend/
│   ├── schema.sql
│   └── migration_add_dartconnect_integration.sql  # NEW
├── dartconnect-scraper/
│   ├── scraper.js
│   └── enhanced-scraper.js                         # NEW
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DartConnectSettings.tsx             # NEW
│   │   ├── pages/
│   │   │   └── MatchResultsManager.tsx             # NEW
│   │   ├── services/
│   │   │   └── api.ts                              # UPDATED
│   │   ├── styles/
│   │   │   ├── DartConnectSettings.css             # NEW
│   │   │   └── MatchResultsManager.css             # NEW
│   │   └── types/
│   │       └── index.ts                            # UPDATED
├── DARTCONNECT_INTEGRATION_GUIDE.md                # NEW
├── DARTCONNECT_QUICKSTART.md                       # NEW
└── DARTCONNECT_IMPLEMENTATION_SUMMARY.md           # NEW
```

---

Add this to the existing README.md in an appropriate section.
