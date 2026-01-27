# DartConnect Live Scraping Integration

## Overview

The DartConnect Integration feature allows tournament managers to automatically capture match scores from DartConnect's live scoring system. When players use DartConnect tablets to score their matches, the system can detect match completion, extract the results, and automatically or manually apply them to your tournament.

## Features

✅ **Automatic Match Detection** - Scraper monitors live matches and detects completion  
✅ **Smart Player Matching** - Automatically links scraped results to scheduled matches  
✅ **Confidence Scoring** - Shows how confident the system is in player name matches  
✅ **Auto-Accept Option** - High-confidence matches can be automatically accepted  
✅ **Manual Approval** - Review all scores before applying them to standings  
✅ **Match Results Manager** - Visual interface to approve/reject pending results  
✅ **Audit Trail** - Complete history of all score changes and approvals  

## System Architecture

```
DartConnect Tablets → DartConnect TV → Enhanced Scraper → Supabase DB → Match Results Manager → Tournament Standings
```

## Setup Guide

### Step 1: Apply Database Migration

1. Open Supabase Dashboard
2. Navigate to: **SQL Editor**
3. Copy the contents of `backend/migration_add_dartconnect_integration.sql`
4. Paste and run in SQL Editor
5. Verify all tables were created successfully

### Step 2: Enable Integration in Tournament Settings

1. Navigate to your tournament
2. Go to **Settings**
3. Find the **DartConnect Integration** section
4. Toggle **Enable DartConnect Integration** to ON
5. Configure your preferences:
   - **Auto-Accept High Confidence Scores** - Automatically apply scores with ≥90% confidence
   - **Require Manual Approval** - All scores must be reviewed before applying

6. Click **Save Settings**

### Step 3: Start Matches on DartConnect

1. Create matches on DartConnect as normal
2. Start scoring on tablets
3. Note the **Watch Code** for each match (e.g., ABC123)

### Step 4: Run the Enhanced Scraper

#### For Each Match:

```bash
cd dartconnect-scraper
node enhanced-scraper.js <watch-code> <tournament-id>
```

**Example:**
```bash
node enhanced-scraper.js ABC123 550e8400-e29b-41d4-a716-446655440000
```

**Parameters:**
- `<watch-code>` - The DartConnect watch code for the match
- `<tournament-id>` - Your tournament's UUID from the database

The scraper will:
- Open a headless browser to monitor DartConnect
- Scrape live scores every 2 seconds
- Detect when the match is completed
- Create a pending result in the database
- Attempt to match players with scheduled matches
- Auto-accept if enabled and confidence is high

## Match Results Manager

The Match Results Manager is your central hub for reviewing and approving captured scores.

### Accessing the Manager

Navigate to: `/tournament/<tournament-id>/match-results`

Or click the **View Pending Results** link in tournament settings.

### Result Card Information

Each pending result shows:

#### Player Information
- Player names from DartConnect
- Legs won by each player
- Sets won (if applicable)
- 3-dart averages (if available)
- Winner indicator (trophy icon)

#### Match Details
- Match format (e.g., "Best of 5 Legs")
- Total legs played
- Completion timestamp
- Watch code

#### Matching Information
- **Match Found** - Whether a scheduled match was found
- **Confidence Score** - How confident the system is in the match (0-100%)
  - ✅ **High (90-100%)** - Exact player name match
  - ⚠️ **Medium (70-89%)** - Fuzzy/partial name match
  - ❌ **Low (0-69%)** - Poor or no match

- **Matching Notes** - Explanation of how match was found

### Approving Results

1. Review the match details
2. Verify player names and scores are correct
3. Click **Approve & Apply**
4. The match score is immediately updated
5. Round robin standings are automatically recalculated

**Note:** You can only approve results that have a linked match (Match Found = ✅)

### Rejecting Results

1. Click **Reject**
2. Optionally provide a reason
3. The result is marked as rejected but kept for records

## Auto-Accept Feature

### How It Works

When Auto-Accept is enabled:
1. Scraper detects match completion
2. System attempts to match players
3. If confidence score ≥ 90%, the result is **automatically** applied
4. Match status changes to "completed"
5. Standings are updated immediately
6. Result is marked as "auto-accepted" in Match Results Manager

### When to Use Auto-Accept

✅ **Use When:**
- Player names in DartConnect exactly match tournament registrations
- You trust the DartConnect scoring system
- You want faster tournament progression

❌ **Don't Use When:**
- Player names might be misspelled or abbreviated
- You want to review every score manually
- Running a high-stakes tournament

### Safety Features

Auto-accept will **NOT** be triggered if:
- Confidence score is below 90%
- No matching scheduled match is found
- Match-specific auto-accept is disabled
- Tournament-level auto-accept is disabled

## Player Name Matching

The system uses two methods to match players:

### Exact Match (100% Confidence)
- Player names must match exactly (case-insensitive)
- Whitespace is normalized
- Works in either order (P1 vs P2 or P2 vs P1)

**Example:**
- Tournament: "John Smith" vs "Jane Doe"
- DartConnect: "john smith" vs "jane doe"
- Result: ✅ Match found (100% confidence)

### Fuzzy Match (75% Confidence)
- Partial name matching using LIKE operator
- One name contains the other

**Example:**
- Tournament: "John Michael Smith" vs "Jane Elizabeth Doe"
- DartConnect: "John Smith" vs "Jane Doe"
- Result: ✅ Match found (75% confidence)

### No Match (0% Confidence)
- No similarity found
- Result cannot be auto-accepted
- Manual linking required

## Watch Code Management

### Linking Watch Codes to Matches

You can pre-link watch codes to specific matches:

1. Navigate to the match in Board Manager or Group Stage
2. Click "Set Watch Code"
3. Enter the DartConnect watch code
4. Optionally enable per-match auto-accept
5. Save

This improves matching confidence and enables match-specific settings.

### Multiple Matches

Run multiple scrapers simultaneously for different matches:

```bash
# Terminal 1
node enhanced-scraper.js ABC123 <tournament-id>

# Terminal 2
node enhanced-scraper.js DEF456 <tournament-id>

# Terminal 3
node enhanced-scraper.js GHI789 <tournament-id>
```

Each scraper runs independently and creates separate pending results.

## Match Score History

Every score change is logged in the audit trail:

- **Manual Entry** - Scores entered by tournament director
- **DartConnect Auto** - Auto-accepted from scraper
- **DartConnect Approved** - Manually approved pending result
- **DartConnect Rejected** - Rejected pending result
- **Score Update** - Score changed after initial entry

View history by calling: `DartConnectService.getMatchHistory(matchId)`

## Troubleshooting

### Scraper Won't Start

**Problem:** Error when running scraper  
**Solution:**
1. Ensure all dependencies are installed: `npm install`
2. Check `.env` file has correct Supabase credentials
3. Verify watch code is correct
4. Check internet connection

### No Match Found

**Problem:** Pending result says "No matching scheduled match found"  
**Solution:**
1. Verify player names in DartConnect match tournament registration
2. Check that match is scheduled and not yet completed
3. Manually link the result if needed
4. Ensure match is in the correct tournament

### Auto-Accept Not Working

**Problem:** High-confidence results not being auto-accepted  
**Solution:**
1. Check tournament settings have auto-accept enabled
2. Verify confidence score is ≥ 90%
3. Ensure match was found (match_found = true)
4. Check if require manual approval is enabled

### Scraper Stops After Match

**Problem:** Scraper exits after detecting completion  
**Solution:** This is expected behavior. The scraper stops 5 seconds after detecting match completion.

### Wrong Player Names

**Problem:** DartConnect has incorrect player names  
**Solution:**
1. Reject the pending result
2. Update player names in DartConnect or tournament
3. Re-run the match or manually enter scores

## API Reference

### DartConnectService Methods

```typescript
// Get pending results for a tournament
await DartConnectService.getPendingResults(tournamentId, status?)

// Get single pending result
await DartConnectService.getPendingResult(id)

// Approve pending result
await DartConnectService.approvePendingResult(id, userId?)

// Reject pending result
await DartConnectService.rejectPendingResult(id, userId?, reason?)

// Link watch code to match
await DartConnectService.setMatchWatchCode(matchId, tournamentId, watchCode, autoAccept)

// Get watch code for match
await DartConnectService.getMatchWatchCode(matchId)

// Get match score history
await DartConnectService.getMatchHistory(matchId)

// Update tournament DartConnect settings
await DartConnectService.updateDartConnectSettings(tournamentId, settings)
```

## Database Schema

### pending_match_results
Stores captured match results awaiting approval

### match_watch_codes
Links scheduled matches to DartConnect watch codes

### match_score_history
Audit trail of all score changes

### scraper_sessions
Tracks active scraper sessions

See `backend/migration_add_dartconnect_integration.sql` for complete schema.

## Best Practices

1. **Test First** - Test the feature with a practice tournament before using in production
2. **Name Consistency** - Ensure player names in DartConnect match your tournament registrations
3. **Monitor Results** - Regularly check Match Results Manager during tournament
4. **Use Auto-Accept Wisely** - Only enable for tournaments with consistent naming
5. **Keep Scrapers Running** - Don't close scraper terminals until matches complete
6. **Document Watch Codes** - Keep a list of which watch codes correspond to which matches

## Workflow Example

### Scenario: Round Robin Tournament with 4 Matches

1. **Setup**
   - Apply database migration ✓
   - Enable DartConnect integration in tournament settings ✓
   - Enable auto-accept (optional) ✓

2. **Match Day**
   - Create 4 matches on DartConnect
   - Note watch codes: ABC123, DEF456, GHI789, JKL012

3. **Start Scrapers**
   ```bash
   # Terminal 1-4, run one per match
   node enhanced-scraper.js ABC123 <tournament-id>
   node enhanced-scraper.js DEF456 <tournament-id>
   node enhanced-scraper.js GHI789 <tournament-id>
   node enhanced-scraper.js JKL012 <tournament-id>
   ```

4. **Players Play Matches**
   - Players use DartConnect tablets to score
   - Scrapers monitor in background
   - No manual intervention needed

5. **Match Completion**
   - Scraper detects completion
   - Creates pending result
   - If auto-accept enabled and confidence ≥90%, automatically applies
   - Otherwise, appears in Match Results Manager

6. **Review & Approve** (if manual approval required)
   - Open Match Results Manager
   - Review each pending result
   - Click "Approve & Apply" for correct results
   - Click "Reject" for any errors

7. **Standings Update**
   - Approved results automatically update standings
   - Round robin table recalculates
   - Players can see updated standings immediately

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Supabase logs for errors
3. Check scraper console output for error messages
4. Verify database migration was applied correctly

## Future Enhancements

Potential future features:
- Real-time notifications when results are pending
- Bulk approve/reject actions
- Advanced player name fuzzy matching
- Integration with email notifications
- Live scoreboard updates during matches
- Statistical analysis from scraped data
