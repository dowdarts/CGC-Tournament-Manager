# Add Auto Board Call Migration

## What This Migration Does

Adds the `auto_board_call_enabled` column to the `tournaments` table to support the automatic board call system feature.

## How to Apply

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `migration_add_auto_board_call.sql`
6. Click **Run** or press `Ctrl+Enter`

## What the Migration Adds

- **Column**: `auto_board_call_enabled` (BOOLEAN, default: FALSE)
- **Purpose**: Enables automatic board call system
  - When enabled: Automatically marks Round 1 matches as in-progress
  - When a match completes: Automatically calls the next match on that board
  - Sends board call emails automatically

## Verification

After running the migration, verify it worked:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'tournaments' 
AND column_name = 'auto_board_call_enabled';
```

Expected result:
```
column_name              | data_type | column_default
-------------------------|-----------|---------------
auto_board_call_enabled  | boolean   | false
```

## Rollback (if needed)

If you need to undo this migration:

```sql
ALTER TABLE tournaments DROP COLUMN IF EXISTS auto_board_call_enabled;
```
