# Quick Start: DartConnect Enhanced Statistics

## 🚀 Quick Setup (5 minutes)

### 1. Apply Database Migration
```sql
-- Run in Supabase Dashboard > SQL Editor
-- Copy/paste from: backend/migration_add_detailed_match_stats.sql
```

### 2. Start Scraper
```bash
cd dartconnect-scraper
node dartconnect-scraper.js <WATCH_CODE> <TOURNAMENT_ID>
```

### 3. View Results
1. Go to: `/tournament/<tournament-id>/match-results`
2. Click "Show Detailed Statistics"
3. See Tale of the Tape!

## 📊 What You Get

### Statistics Captured (per player):
- ✅ 3-dart average
- ✅ First 9 average
- ✅ Darts thrown
- ✅ Checkout % (attempts vs completed)
- ✅ Highest checkout
- ✅ 100+ finishes (ton plus)
- ✅ 180s, 160+, 140+, 120+, 100+ scores
- ✅ Sets & legs won
- ✅ Winner declaration

### Visual Features:
- 🏆 Winner highlighted in gold
- 💚 Better values highlighted in green
- 📱 Fully responsive design
- ✨ Smooth animations
- 🎯 Head-to-head comparison

## 🎬 Real-Time Match Detection

The scraper now:
- Monitors DOM changes with MutationObserver
- Instantly detects match completion
- Logs winner and final score
- Auto-stops after submission

### Console Output:
```
[ABC123] ⚡ MATCH COMPLETED! ⚡
[ABC123] Winner: John Doe
[ABC123] Final Score: John Doe 3-2 Jane Smith
[ABC123] Sets: N/A
```

## 📁 Files Changed

### New:
- `backend/migration_add_detailed_match_stats.sql`
- `frontend/src/components/TaleOfTheTape.tsx`
- `frontend/src/styles/TaleOfTheTape.css`
- `DARTCONNECT_TESTING_GUIDE.md`
- `DARTCONNECT_ENHANCED_STATS_SUMMARY.md`

### Modified:
- `dartconnect-scraper/dartconnect-scraper.js` (enhanced)
- `frontend/src/types/index.ts` (new fields)
- `frontend/src/pages/MatchResultsManager.tsx` (Tale of Tape)
- `frontend/src/styles/MatchResultsManager.css` (toggle button)

## 🧪 Quick Test

```bash
# 1. Run migration (Supabase Dashboard)
# 2. Start scraper
node dartconnect-scraper.js ABC123 550e8400-e29b-41d4-a716-446655440000

# 3. Wait for match completion
# 4. Check Match Results Manager
# 5. Click "Show Detailed Statistics"
```

## 💡 Tips

- **Multiple Scrapers**: Run one per board simultaneously
- **Auto-Accept**: Enable in tournament settings for high-confidence matches
- **Custom Interval**: Change `checkInterval` in scraper options
- **Mobile View**: Tale of Tape is fully responsive

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Stats not captured | Update CSS selectors in `extractMatchData()` |
| Match not detected | Check console logs for errors |
| Tale not displaying | Verify migration applied, check browser console |
| Wrong winner | Check sets vs legs logic in scraper |

## 📖 Full Documentation

- **Testing Guide**: `DARTCONNECT_TESTING_GUIDE.md`
- **Complete Summary**: `DARTCONNECT_ENHANCED_STATS_SUMMARY.md`
- **Original Guide**: `DARTCONNECT_INTEGRATION_GUIDE.md`

## ✨ That's It!

Your DartConnect integration now captures comprehensive match statistics and displays them in a beautiful Tale of the Tape format!
