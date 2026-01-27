# Apply Migration for Archive and Complete Features

## Purpose
This migration adds `archived` and `completed` fields to the tournaments table to support organizing tournaments into Active, Completed, and Archived sections.

## How to Apply

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `migration_add_archived_completed.sql`
5. Paste and run the migration
6. Verify the columns were added by checking the **Table Editor**

### Option 2: Using Supabase CLI
```bash
# If you have the Supabase CLI installed
supabase db push migration_add_archived_completed.sql
```

### Option 3: Using psql
```bash
psql -h your-project.supabase.co -U postgres -d postgres -f migration_add_archived_completed.sql
```

## What This Migration Does

1. **Adds `archived` field**: Boolean field to mark tournaments as archived
2. **Adds `completed` field**: Boolean field to mark tournaments as completed
3. **Creates indexes**: Improves query performance when filtering by archived/completed status
4. **Adds comments**: Documents the purpose of the new fields

## Verification

After applying the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
AND column_name IN ('archived', 'completed');

-- Should return:
-- archived  | boolean | false
-- completed | boolean | false
```

## Rollback (if needed)

If you need to remove these fields:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_tournaments_archived;
DROP INDEX IF EXISTS idx_tournaments_completed;

-- Remove columns
ALTER TABLE tournaments DROP COLUMN IF EXISTS archived;
ALTER TABLE tournaments DROP COLUMN IF EXISTS completed;
```

## Notes

- Existing tournaments will have both fields set to `false` by default
- The `status` field and `completed` field can work together (status tracks workflow state, completed marks if tournament is finished for organizational purposes)
- Archived tournaments can be either completed or active
