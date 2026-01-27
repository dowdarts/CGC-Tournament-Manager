# Apply Migration for Tournament Start Time

## Purpose
This migration adds a `start_time` field to the tournaments table to track when tournaments begin. This enables automatic registration closure 1 hour after the tournament starts.

## How to Apply

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `migration_add_start_time.sql`
5. Paste and run the migration
6. Verify the column was added by checking the **Table Editor**

### Option 2: Using Supabase CLI
```bash
supabase db push migration_add_start_time.sql
```

### Option 3: Using psql
```bash
psql -h your-project.supabase.co -U postgres -d postgres -f migration_add_start_time.sql
```

## What This Migration Does

1. **Adds `start_time` field**: TIME field to store the tournament start time (HH:MM format)
2. **Creates index**: Improves query performance when filtering by start time
3. **Adds comment**: Documents the purpose of the field

## Automatic Registration Closure

With this feature:
- When creating a tournament, you must specify a start time (e.g., 19:00 for 7 PM)
- The public registration portal automatically closes 1 hour after the start time
- For example: Tournament starts at 7:00 PM → Registration closes at 8:00 PM
- Users trying to register after closure will see "Registration has closed for this tournament"

## Verification

After applying the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
AND column_name = 'start_time';

-- Should return:
-- start_time | time without time zone | (null)
```

## Updating Existing Tournaments

Existing tournaments won't have a start time. You can:

1. **Let them remain null**: They will still accept registrations (no automatic closure)
2. **Update them manually**:
```sql
-- Update a specific tournament
UPDATE tournaments 
SET start_time = '19:00:00' 
WHERE id = 'your-tournament-id';

-- Set default time for all tournaments without start_time
UPDATE tournaments 
SET start_time = '19:00:00' 
WHERE start_time IS NULL;
```

## Rollback (if needed)

If you need to remove this field:

```sql
-- Remove index
DROP INDEX IF EXISTS idx_tournaments_start_time;

-- Remove column
ALTER TABLE tournaments DROP COLUMN IF EXISTS start_time;
```

## Notes

- Start time is stored in TIME format (e.g., '19:00:00')
- Registration closes exactly 1 hour after the combined date + start time
- If `start_time` is null, registration remains open indefinitely
- The frontend form defaults to 19:00 (7 PM) but can be adjusted
