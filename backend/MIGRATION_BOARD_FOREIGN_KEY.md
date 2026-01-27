# Add Board Foreign Key Migration

## Issue
The Livestream Scoreboard is receiving a PostgREST error:
```
PGRST200: Could not find a relationship between 'matches' and 'boards' using the hint 'matches_board_id_fkey'
```

This is because the `matches.board_id` column exists but doesn't have a foreign key constraint.

## Solution
Apply the migration `migration_add_board_foreign_key.sql` to add the foreign key constraint.

## How to Apply

### Via Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: **pfujbgwgsxuhgvmeatjh**
3. Click on "SQL Editor" in the left sidebar
4. Click "New query"
5. Copy the contents of `backend/migration_add_board_foreign_key.sql`
6. Paste into the SQL editor
7. Click "Run" to execute

### What This Does
- Adds foreign key constraint `matches_board_id_fkey` on `matches.board_id` → `boards.id`
- Sets `ON DELETE SET NULL` so if a board is deleted, matches aren't deleted (just unassigned)
- Creates an index on `matches.board_id` for better query performance
- Verifies the constraint was created successfully

### Expected Result
After running, you should see output showing:
```
constraint_name: matches_board_id_fkey
table_name: matches
foreign_table: boards
column_name: board_id
foreign_column: id
```

### Impact
- Enables PostgREST to join `matches` with `boards` using `.select('*, board:boards!matches_board_id_fkey(*)')`
- Fixes the Livestream Scoreboard board display
- No data is modified, only the schema structure

## Verification
After applying, test by loading the Livestream Scoreboard:
- Navigate to `/tournament/{id}/scoreboard`
- Check that board assignments display correctly
- Live matches should show "Board X" or "Boards X & Y"
- No PGRST200 errors in console
