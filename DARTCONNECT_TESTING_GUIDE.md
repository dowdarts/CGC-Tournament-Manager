# DartConnect Integration Testing Guide

## Overview

This guide helps you test the enhanced DartConnect integration with detailed statistics tracking and the Tale of the Tape feature.

## Prerequisites

- Tournament set up in CGC Tournament Manager
- DartConnect integration enabled in tournament settings
- Match scheduled with players
- DartConnect watch code for a match

## Step 1: Apply Database Migration

Before testing, apply the new database migration for detailed statistics:

```bash
# Copy the SQL from the migration file
cat backend/migration_add_detailed_match_stats.sql
```

1. Open Supabase Dashboard
2. Navigate to **SQL Editor**
3. Paste the migration SQL
4. Click **Run** to execute
5. Verify all columns were added successfully

## Step 2: Start DartConnect Scraper

### Option A: Using the enhanced scraper directly

```bash
cd dartconnect-scraper
node dartconnect-scraper.js <WATCH_CODE> <TOURNAMENT_ID>
```

**Example:**
```bash
node dartconnect-scraper.js ABC123 550e8400-e29b-41d4-a716-446655440000
```

### Option B: Using the enhanced scraper module

```javascript
const DartConnectScraper = require('./dartconnect-scraper');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_KEY');

const scraper = new DartConnectScraper({
  watchCode: 'ABC123',
  tournamentId: '550e8400-e29b-41d4-a716-446655440000',
  autoAccept: false,
  requireManualApproval: true,
  supabase: supabase,
  logger: console,
  checkInterval: 5000 // Check every 5 seconds
});

scraper.start();
```

## Step 3: Monitor Scraper Behavior

### Expected Console Output

The scraper should log the following:

```
[ABC123] Launching browser...
[ABC123] Navigating to https://tv.dartconnect.com/history/match/ABC123
[ABC123] Session created: <session-id>
[ABC123] Real-time monitoring set up successfully
[ABC123] Scraper started. Checking every 5000ms
```

### During Match Progress

```
[ABC123] Match update detected: { complete: false, score: '1-0', sets: 'N/A', winner: 'TBD' }
[ABC123] Match update detected: { complete: false, score: '2-1', sets: 'N/A', winner: 'TBD' }
```

### When Match Completes

```
[ABC123] ⚡ MATCH COMPLETED! ⚡
[ABC123] Winner: John Doe
[ABC123] Final Score: John Doe 3-2 Jane Smith
[ABC123] Match found: <match-id>, Confidence: 1.00, Notes: Exact name match found
[ABC123] Pending result created: <result-id>
[ABC123] Result requires manual approval.
[ABC123] Scraper stopped.
```

## Step 4: Review Match Results in UI

1. Navigate to your tournament in the web app
2. Click **Match Results** in the sidebar
3. You should see a new pending result

### Expected Data in Result Card

**Basic Info:**
- Watch Code: ABC123
- Status Badge: "Pending Review"
- Player names
- Legs/Sets won
- 3-dart averages

**Click "Show Detailed Statistics"** to expand Tale of the Tape

### Tale of the Tape Should Display

#### Match Result Section
- ✅ Sets Won (if applicable)
- ✅ Legs Won
- ✅ Total Legs Played

#### Averages Section
- ✅ 3-Dart Average
- ✅ First 9 Average (if captured)
- ✅ Darts Thrown

#### Checkout Performance Section
- ✅ Checkout Percentage
- ✅ Checkouts Hit (X/Y format)
- ✅ Highest Checkout
- ✅ 100+ Finishes

#### High Scores Section
- ✅ 180s
- ✅ 160+
- ✅ 140+
- ✅ 120+
- ✅ 100+

## Step 5: Verify Data Accuracy

### Open Browser DevTools (for manual verification)

1. Go to DartConnect match page
2. Compare displayed stats with scraped data
3. Verify all statistics match

### Database Verification

Query the database to verify stored data:

```sql
SELECT 
  player1_name,
  player2_name,
  player1_legs,
  player2_legs,
  player1_average,
  player2_average,
  player1_180s,
  player2_180s,
  player1_checkout_percentage,
  player2_checkout_percentage,
  player1_100_plus,
  player1_120_plus,
  player1_140_plus,
  player1_160_plus
FROM pending_match_results
WHERE watch_code = 'ABC123'
ORDER BY created_at DESC
LIMIT 1;
```

## Step 6: Test Statistics Display

### Visual Verification

1. **Player Headers**: Winner should have gold background with trophy
2. **Better Values**: Higher values (or lower for darts thrown) highlighted in green
3. **Responsive Design**: Test on mobile and desktop
4. **Animation**: Stats should fade in when expanded

### Test Edge Cases

**Case 1: No statistics available**
- Some fields may be null/undefined
- Display should show "-" for missing values

**Case 2: Tied statistics**
- Both values should be highlighted equally
- No green highlighting

**Case 3: Sets-based match**
- Sets should display prominently
- Winner determined by sets, not legs

## Step 7: Test Approval/Rejection Flow

### Approve a Result

1. Click "Approve & Apply"
2. Verify match is updated in database
3. Check standings are recalculated
4. Result status changes to "Approved"

### Reject a Result

1. Click "Reject"
2. Enter rejection reason
3. Verify result status changes to "Rejected"
4. Verify match scores are NOT updated

## Common Issues & Troubleshooting

### Issue: Scraper doesn't detect match completion

**Possible Causes:**
- DartConnect page structure changed
- Match status element not found
- Network issues

**Solution:**
```javascript
// Check browser console for errors
// The scraper logs detailed information about DOM queries
```

### Issue: Statistics not captured

**Possible Causes:**
- DartConnect doesn't display certain stats
- CSS selectors don't match page structure

**Solution:**
- Manually inspect DartConnect page HTML
- Update CSS selectors in `extractMatchData()` function

### Issue: Tale of the Tape not displaying

**Possible Causes:**
- Missing statistics data
- CSS not loaded

**Solution:**
- Check browser console for errors
- Verify TaleOfTheTape.css is imported
- Check if result object has required fields

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Scraper launches and connects to DartConnect
- [ ] Real-time monitoring initialized
- [ ] Match state changes logged correctly
- [ ] Match completion detected
- [ ] Winner declared correctly
- [ ] Final score captured (legs and sets)
- [ ] All detailed statistics extracted:
  - [ ] 3-dart average
  - [ ] First 9 average
  - [ ] Darts thrown
  - [ ] Checkout percentage
  - [ ] Checkout attempts/completed
  - [ ] Highest checkout
  - [ ] 180s count
  - [ ] 160+ count
  - [ ] 140+ count
  - [ ] 120+ count
  - [ ] 100+ count
  - [ ] Ton plus finishes
- [ ] Pending result created in database
- [ ] Match Results Manager displays result
- [ ] Tale of the Tape expands/collapses
- [ ] Statistics displayed correctly
- [ ] Winner highlighting works
- [ ] Better value highlighting works
- [ ] Approval flow works
- [ ] Rejection flow works
- [ ] Mobile responsive display tested

## Performance Notes

- **Scraper Interval**: 5 seconds (configurable)
- **Real-time Detection**: Uses MutationObserver for instant completion detection
- **Browser Resources**: Headless Chrome uses ~100-200MB RAM per scraper
- **Network**: Minimal data usage (page loads once, then monitors DOM)

## Next Steps

After successful testing:

1. Monitor scraper logs during live tournament
2. Adjust CSS selectors if DartConnect updates their UI
3. Fine-tune confidence scoring for player matching
4. Consider adding more statistics fields as needed

## Support

If you encounter issues:

1. Check scraper logs for errors
2. Verify database migration was applied
3. Check browser console for frontend errors
4. Review Supabase logs for backend errors
5. Inspect DartConnect page HTML structure

## Additional Features to Test (Optional)

- **Auto-Accept**: Enable auto-accept for high-confidence matches
- **Multiple Scrapers**: Run multiple scrapers simultaneously for different boards
- **Watch Code Management**: Test assigning watch codes to scheduled matches
- **Score History**: Verify audit trail is created for all changes
