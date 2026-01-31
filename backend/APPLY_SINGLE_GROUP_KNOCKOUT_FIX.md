# Apply Single Group Knockout Migration

## Problem
When tournaments have only 1 group (single round-robin), trying to advance players to knockout stage fails with error:
```
Unsupported tournament format: 1_groups_4_advance. Use format like "4_groups_2_advance"
```

## Solution
This migration adds support for single-group knockout formats to the `setup_knockout_bracket` function.

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `migration_add_single_group_knockout.sql`
5. Click **Run** to execute

### Option 2: Supabase CLI
```bash
supabase db reset
# Or apply specific migration
psql -h your-db-host -U postgres -d postgres < backend/migration_add_single_group_knockout.sql
```

## What This Fixes
After applying this migration, the following single-group formats will be supported:
- `1_groups_2_advance` - 1 group, top 2 advance
- `1_groups_4_advance` - 1 group, top 4 advance  
- `1_groups_8_advance` - 1 group, top 8 advance
- `1_groups_16_advance` - 1 group, top 16 advance

## Verification
After applying the migration, test by:
1. Creating a tournament with 1 group
2. Complete group stage matches
3. Try to start the knockout bracket
4. Should now work without error

## Note
This is a safe migration - it only replaces the `setup_knockout_bracket` function and doesn't modify any data.
