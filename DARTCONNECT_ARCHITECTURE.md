# DartConnect Integration - System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DartConnect Live Scraping System                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌───────────────────┐         ┌─────────────────┐
│  DartConnect     │         │  Enhanced         │         │   Supabase      │
│  Scoring Tablets │────────▶│  Scraper          │────────▶│   Database      │
│                  │ Live    │  (Puppeteer)      │ Store   │                 │
│  - Player 1      │ Match   │                   │ Results │  pending_match_ │
│  - Player 2      │ Data    │  - Monitor match  │         │  results table  │
│  - Leg scores    │         │  - Detect finish  │         │                 │
│  - Averages      │         │  - Extract data   │         │  match_watch_   │
└──────────────────┘         │  - Match players  │         │  codes table    │
                             │  - Auto-accept    │         │                 │
                             └───────────────────┘         └─────────────────┘
                                                                     │
                                                                     │
                                                                     ▼
                             ┌───────────────────┐         ┌─────────────────┐
                             │  Match Results    │◀────────│  Tournament     │
                             │  Manager UI       │ Fetch   │  Manager App    │
                             │                   │ Pending │                 │
                             │  - Review scores  │ Results │  - Settings     │
                             │  - Approve/Reject │         │  - Auto-accept  │
                             │  - Confidence     │         │  - Manual mode  │
                             │  - History        │         │                 │
                             └───────────────────┘         └─────────────────┘
                                      │
                                      │ Apply
                                      ▼
                             ┌───────────────────┐
                             │  Tournament       │
                             │  Standings        │
                             │                   │
                             │  - Auto update    │
                             │  - Recalculate    │
                             │  - Audit trail    │
                             └───────────────────┘
```

## Data Flow

### 1. Match Start

```
Player starts match on DartConnect tablet
         │
         ▼
Tournament Director runs scraper
         │
         ▼
node enhanced-scraper.js ABC123 <tournament-id>
         │
         ▼
Scraper opens headless browser to tv.dartconnect.com/live/ABC123
```

### 2. During Match

```
Scraper polls every 2 seconds
         │
         ▼
Extract: Player names, scores, legs, averages
         │
         ▼
Update scraper_sessions table with latest data
         │
         ▼
Check for match completion
```

### 3. Match Completion Detection

```
Match finished (one player reaches winning legs)
         │
         ▼
Verify stable scores (3 consecutive identical checks)
         │
         ▼
Determine winner
         │
         ▼
Execute: match_dartconnect_players() function
         │
         ├─ Exact match found ──▶ Confidence: 100%
         ├─ Fuzzy match found ──▶ Confidence: 75%
         └─ No match found ─────▶ Confidence: 0%
         │
         ▼
Create pending_match_result record
```

### 4. Auto-Accept Decision Tree

```
Pending result created
         │
         ▼
Is integration enabled? ──No──▶ Manual review required
         │
        Yes
         │
         ▼
Is auto-accept enabled? ──No──▶ Manual review required
         │
        Yes
         │
         ▼
Confidence ≥ 90%? ────────No──▶ Manual review required
         │
        Yes
         │
         ▼
Match found? ─────────────No──▶ Manual review required
         │
        Yes
         │
         ▼
Execute: auto_accept_pending_result()
         │
         ▼
Update matches table
         │
         ▼
Log to match_score_history
         │
         ▼
Standings auto-update ✅
```

### 5. Manual Review Flow

```
Pending results awaiting review
         │
         ▼
Tournament Director opens Match Results Manager
         │
         ▼
Reviews: Player names, scores, confidence, matching notes
         │
         ├─ Click "Approve" ────▶ Update match → Update standings ✅
         └─ Click "Reject" ─────▶ Mark rejected → No changes
```

## Database Schema Relationships

```
tournaments
    │
    ├──▶ matches
    │       │
    │       ├──▶ match_watch_codes (watch_code linkage)
    │       ├──▶ match_score_history (audit trail)
    │       └──▶ pending_match_results (scraped data)
    │
    ├──▶ players (name matching)
    │
    └──▶ scraper_sessions (active scrapers)
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐       ┌─────────────────────────┐    │
│  │ Tournament       │       │ DartConnect Settings    │    │
│  │ Settings Page    │──────▶│ Component               │    │
│  │                  │       │                         │    │
│  │ - Enable/disable │       │ - Integration toggle    │    │
│  │ - View results   │       │ - Auto-accept toggle    │    │
│  └──────────────────┘       │ - Manual approval       │    │
│                              │ - Usage instructions    │    │
│                              └─────────────────────────┘    │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Match Results Manager Page                            │  │
│  │                                                        │  │
│  │ ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │ │ Pending    │  │ Approved   │  │ Rejected   │     │  │
│  │ │ Results    │  │ Results    │  │ Results    │     │  │
│  │ └────────────┘  └────────────┘  └────────────┘     │  │
│  │                                                        │  │
│  │ For each result:                                      │  │
│  │ - Player names & scores                               │  │
│  │ - Confidence badge                                    │  │
│  │ - Matching info                                       │  │
│  │ - Approve/Reject buttons                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ DartConnectService (API)                              │  │
│  │                                                        │  │
│  │ - getPendingResults()                                 │  │
│  │ - approvePendingResult()                              │  │
│  │ - rejectPendingResult()                               │  │
│  │ - setMatchWatchCode()                                 │  │
│  │ - updateDartConnectSettings()                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            │ Supabase Client
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase (Backend)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Tables:                                                      │
│  - pending_match_results                                      │
│  - match_watch_codes                                          │
│  - match_score_history                                        │
│  - scraper_sessions                                           │
│  - matches (updated)                                          │
│  - tournaments (extended)                                     │
│                                                               │
│  Functions:                                                   │
│  - match_dartconnect_players()                                │
│  - auto_accept_pending_result()                               │
│                                                               │
│  RLS Policies:                                                │
│  - Authenticated user access                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Scraper Internal Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            EnhancedDartConnectScraper Class                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Properties:                                                  │
│  - watchCode                                                  │
│  - tournamentId                                               │
│  - browser (Puppeteer)                                        │
│  - page                                                       │
│  - matchCompleted                                             │
│  - linkedMatchId                                              │
│  - scraperSessionId                                           │
│                                                               │
│  Methods:                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ init()                                                │   │
│  │ - Launch browser                                      │   │
│  │ - Navigate to DartConnect TV                          │   │
│  │ - Create scraper session                              │   │
│  │ - Attempt match linking                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ startScraping()                                       │   │
│  │ - Poll every 2 seconds                                │   │
│  │ - Call scrapeMatchData()                              │   │
│  │ - Call checkMatchCompletion()                         │   │
│  │ - Update session                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ scrapeMatchData()                                     │   │
│  │ - Extract player names                                │   │
│  │ - Extract legs/sets                                   │   │
│  │ - Extract averages                                    │   │
│  │ - Extract active player                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ checkMatchCompletion()                                │   │
│  │ - Check if one player won                             │   │
│  │ - Verify stable scores (3 checks)                     │   │
│  │ - Return true if completed                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ handleMatchCompletion()                               │   │
│  │ - Determine winner                                    │   │
│  │ - Find matching scheduled match                       │   │
│  │ - Create pending result                               │   │
│  │ - Try auto-accept                                     │   │
│  │ - Stop scraper                                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## State Transitions

### Pending Result States

```
                    Created
                       │
                       ▼
    ┌──────────── [pending] ────────────┐
    │                                    │
    │ (Auto-accept)        (User action)│
    │                                    │
    ▼                                    ▼
[auto-accepted] ◀───────────────▶ [approved]
                                         │
                                         │
                                         ▼
                                    [rejected]
```

### Match States

```
[scheduled] ──▶ [in-progress] ──▶ [completed]
                                        ▲
                                        │
                           (Approved pending result)
```

## Security Flow

```
User Request
    │
    ▼
Frontend (React)
    │
    ▼
Supabase Client
    │
    ▼
RLS Policies Check
    │
    ├─ Authenticated? ──No──▶ Denied ❌
    │
   Yes
    │
    ▼
Database Operation ✅
```

## Error Handling

```
Scraper Error
    │
    ├─ Browser crash ──▶ Cleanup & exit
    ├─ Network error ──▶ Log & continue
    ├─ Invalid HTML ───▶ Log & continue
    └─ DB error ───────▶ Log & retry
```

```
Frontend Error
    │
    ├─ API error ──────▶ Show error message
    ├─ Network error ──▶ Show retry button
    ├─ Invalid data ───▶ Show validation error
    └─ Auth error ─────▶ Redirect to login
```

## Monitoring Points

```
✓ Scraper console logs
✓ Supabase database logs
✓ Frontend console errors
✓ Match score history table
✓ Scraper sessions status
✓ Pending results count
✓ Auto-accept success rate
```

---

This architecture provides:
- Clear separation of concerns
- Robust error handling
- Flexible configuration
- Complete audit trail
- Safe auto-accept with fallbacks
- User-friendly approval process
