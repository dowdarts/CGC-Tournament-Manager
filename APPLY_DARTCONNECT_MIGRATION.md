# Applying the DartConnect Integration Migration

## Quick Apply (Copy & Paste)

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Copy Migration SQL

Open the file: `backend/migration_add_dartconnect_integration.sql`

**Or copy directly from below:**

The migration is located at:
```
CGC-Tournament-Manager/backend/migration_add_dartconnect_integration.sql
```

### Step 3: Paste and Run

1. Paste the entire migration into the SQL Editor
2. Click the "Run" button (or press Ctrl+Enter)
3. Wait for execution to complete

### Step 4: Verify Success

You should see:
```
Success. No rows returned
```

### Step 5: Verify Tables Created

Run this query to verify:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'pending_match_results',
    'match_watch_codes', 
    'match_score_history'
  )
ORDER BY table_name;
```

**Expected Result:** 3 rows showing all three tables

### Step 6: Verify Functions Created

Run this query:

```sql
-- Check if functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'match_dartconnect_players',
    'auto_accept_pending_result'
  )
ORDER BY routine_name;
```

**Expected Result:** 2 rows showing both functions

### Step 7: Verify Tournament Columns

Run this query:

```sql
-- Check if tournament columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tournaments'
  AND column_name LIKE 'dartconnect%'
ORDER BY column_name;
```

**Expected Result:** 3 rows
- `dartconnect_auto_accept_scores` (boolean)
- `dartconnect_integration_enabled` (boolean)
- `dartconnect_require_manual_approval` (boolean)

## Migration Details

### What Gets Created

#### Tables (3)
1. **pending_match_results** - Stores match results from DartConnect
2. **match_watch_codes** - Links matches to watch codes
3. **match_score_history** - Audit trail of score changes

#### Functions (2)
1. **match_dartconnect_players()** - Finds matching scheduled matches
2. **auto_accept_pending_result()** - Auto-accepts high-confidence results

#### Columns Added
- `tournaments.dartconnect_integration_enabled`
- `tournaments.dartconnect_auto_accept_scores`
- `tournaments.dartconnect_require_manual_approval`
- `scraper_sessions.tournament_id`
- `scraper_sessions.linked_match_id`
- `scraper_sessions.match_completed`
- `scraper_sessions.result_submitted`

#### Indexes (9)
Performance indexes on all major query paths

#### RLS Policies (3)
Row Level Security on all new tables

## Troubleshooting Migration

### Error: "relation already exists"

**Cause:** Migration was partially applied before

**Solution:**
1. Check which tables exist
2. Drop existing tables if needed:
   ```sql
   DROP TABLE IF EXISTS match_score_history;
   DROP TABLE IF EXISTS match_watch_codes;
   DROP TABLE IF EXISTS pending_match_results;
   ```
3. Re-run migration

### Error: "function already exists"

**Cause:** Functions were created in previous attempt

**Solution:**
1. Drop existing functions:
   ```sql
   DROP FUNCTION IF EXISTS match_dartconnect_players;
   DROP FUNCTION IF EXISTS auto_accept_pending_result;
   ```
2. Re-run migration

### Error: "column already exists"

**Cause:** Columns were added in previous attempt

**Solution:**
1. Check which columns exist:
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'tournaments' 
     AND column_name LIKE 'dartconnect%';
   ```
2. Migration will skip existing columns (no action needed)

### Error: "permission denied"

**Cause:** Insufficient database permissions

**Solution:**
1. Verify you're logged in as admin
2. Check project permissions in Supabase Dashboard
3. Contact project owner if needed

## Testing the Migration

### Test 1: Insert Pending Result

```sql
-- Test insert
INSERT INTO pending_match_results (
  tournament_id,
  watch_code,
  player1_name,
  player2_name,
  player1_legs,
  player2_legs,
  winner_name,
  status,
  match_found,
  match_completed_at
) VALUES (
  gen_random_uuid(), -- Replace with real tournament_id
  'TEST123',
  'Test Player 1',
  'Test Player 2',
  3,
  1,
  'Test Player 1',
  'pending',
  false,
  CURRENT_TIMESTAMP
);

-- Verify insert
SELECT * FROM pending_match_results 
WHERE watch_code = 'TEST123';

-- Clean up
DELETE FROM pending_match_results 
WHERE watch_code = 'TEST123';
```

### Test 2: Call Player Matching Function

```sql
-- Test function (replace with real tournament_id)
SELECT * FROM match_dartconnect_players(
  'your-tournament-id-here'::uuid,
  'Player Name 1',
  'Player Name 2'
);
```

Should return:
- `match_id`: UUID or NULL
- `confidence`: 0.00 to 1.00
- `notes`: Explanation

### Test 3: Verify RLS Policies

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'pending_match_results',
    'match_watch_codes',
    'match_score_history'
  );
```

All should show `rowsecurity = true`

## Post-Migration Steps

1. **Update Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Test Integration**
   - Enable DartConnect in a test tournament
   - Run a test scraper session
   - Verify pending results appear

3. **Configure Settings**
   - Set auto-accept preferences
   - Configure manual approval requirements
   - Test with real data

## Migration Rollback

If you need to undo the migration:

```sql
-- Remove tables
DROP TABLE IF EXISTS match_score_history CASCADE;
DROP TABLE IF EXISTS match_watch_codes CASCADE;
DROP TABLE IF EXISTS pending_match_results CASCADE;

-- Remove functions
DROP FUNCTION IF EXISTS match_dartconnect_players(uuid, text, text);
DROP FUNCTION IF EXISTS auto_accept_pending_result(uuid);

-- Remove tournament columns
ALTER TABLE tournaments 
  DROP COLUMN IF EXISTS dartconnect_integration_enabled,
  DROP COLUMN IF EXISTS dartconnect_auto_accept_scores,
  DROP COLUMN IF EXISTS dartconnect_require_manual_approval;

-- Remove scraper_sessions columns
ALTER TABLE scraper_sessions
  DROP COLUMN IF EXISTS tournament_id,
  DROP COLUMN IF EXISTS linked_match_id,
  DROP COLUMN IF EXISTS match_completed,
  DROP COLUMN IF EXISTS result_submitted;
```

## Maintenance

### Check Migration Status

```sql
-- Count records in new tables
SELECT 
  'pending_match_results' as table_name,
  COUNT(*) as record_count
FROM pending_match_results
UNION ALL
SELECT 
  'match_watch_codes',
  COUNT(*)
FROM match_watch_codes
UNION ALL
SELECT 
  'match_score_history',
  COUNT(*)
FROM match_score_history;
```

### View Recent Activity

```sql
-- Recent pending results
SELECT 
  watch_code,
  player1_name,
  player2_name,
  status,
  created_at
FROM pending_match_results
ORDER BY created_at DESC
LIMIT 10;

-- Recent score changes
SELECT 
  change_type,
  source,
  changed_by,
  created_at
FROM match_score_history
ORDER BY created_at DESC
LIMIT 10;
```

## Support

If you encounter issues:

1. Check Supabase logs for detailed errors
2. Verify all prerequisites are met
3. Review the troubleshooting section
4. Check [Installation Checklist](DARTCONNECT_INSTALLATION_CHECKLIST.md)
5. Review [Full Documentation](DARTCONNECT_INTEGRATION_GUIDE.md)

---

**Migration Version:** 1.0.0  
**Date:** January 27, 2026  
**Compatibility:** Supabase PostgreSQL 14+
