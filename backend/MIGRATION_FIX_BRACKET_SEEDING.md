# Knockout Bracket Seeding Fix

## Problem

In the knockout bracket, two first-place group finishers (Mark Roberts and Matthew Dow) were positioned such that they could meet in the semi-finals instead of the finals. This violates proper bracket seeding principles where top seeds should be maximally separated.

## Root Cause

The `get_seed_order()` function was generating seed order `[1, 8, 5, 4, 3, 6, 7, 2]` for 8-player brackets. This created the following matchups:

- Match 1: Seed 1 vs Seed 8 (Group A-1st vs Group D-2nd)
- Match 2: Seed 5 vs Seed 4 (Group A-2nd vs Group D-1st)
- Match 3: Seed 3 vs Seed 6 (Group C-1st vs Group B-2nd)
- Match 4: Seed 7 vs Seed 2 (Group C-2nd vs Group B-1st)

Since the frontend pairs Matches 1&2 → Semi-Final 1, if both Group A-1st and Group D-1st won their quarterfinals, they would meet in Semi-Final 1 instead of the Finals.

## Solution

Changed the seed order to `[1, 8, 4, 5, 2, 7, 3, 6]` which creates proper bracket structure:

- Match 1: Seed 1 vs Seed 8 (Group A-1st vs Group D-2nd) - **Quarter 1**
- Match 2: Seed 4 vs Seed 5 (Group D-1st vs Group A-2nd) - **Quarter 2**
- Match 3: Seed 2 vs Seed 7 (Group B-1st vs Group C-2nd) - **Quarter 3**
- Match 4: Seed 3 vs Seed 6 (Group C-1st vs Group B-2nd) - **Quarter 4**

### Bracket Structure

```
Quarter 1: A1 vs D2 ┐
                    ├─ Semi 1 (A1 vs D1 if both win)
Quarter 2: D1 vs A2 ┘

Quarter 3: B1 vs C2 ┐
                    ├─ Semi 2 (B1 vs C1 if both win)
Quarter 4: C1 vs B2 ┘
                    
                Finals: Winner Semi 1 vs Winner Semi 2
```

## Benefits

✅ All four 1st-place finishers are in different quarters  
✅ Maximum separation achieved  
✅ Group winners can only meet in semi-finals or finals  
✅ Follows standard tournament bracket principles

## How to Apply

### Method 1: For New Tournaments (Recommended)

1. Run the migration SQL in Supabase SQL Editor:
   ```sql
   -- Copy contents of backend/migration_fix_bracket_seeding.sql
   ```

2. Create future knockout brackets normally - the fix is automatic

### Method 2: For Existing Tournaments (No Scores Yet)

1. Run the migration SQL (same as Method 1)

2. Delete existing knockout matches:
   ```sql
   DELETE FROM matches 
   WHERE tournament_id = '<your-tournament-id>' 
   AND group_id IS NULL;
   ```

3. Recreate the knockout bracket from the Group Stage page

### Method 3: For Existing Tournaments (Already Has Scores)

If you've already entered scores in knockout matches:

1. Run the migration SQL for future tournaments
2. For the current tournament, use the drag-and-drop feature in the Knockout Bracket page to manually reposition players to correct matchups
3. OR manually update match records in the database

## Files Modified

- `backend/migration_fix_bracket_seeding.sql` - Main migration file (APPLY THIS)
- `backend/fix_seed_order_final.sql` - Standalone fix with documentation
- `backend/fix_bracket_seeding.sql` - Initial investigation notes
- `backend/fix_bracket_match_numbers.sql` - Alternative approach (not used)
- `backend/fix_bracket_structure_complete.sql` - Alternative approach (not used)

## Technical Details

The fix modifies the `get_seed_order(bracket_size INT)` function in the database. This function is called by `generate_bracket_matches()`, which is called by `promote_to_knockout()`, which is ultimately called by the `setup_knockout_bracket()` RPC function from the frontend.

### Seed Order Patterns

- **2 players**: `[1, 2]`
- **4 players**: `[1, 4, 2, 3]`
- **8 players**: `[1, 8, 4, 5, 2, 7, 3, 6]` ← Fixed
- **16 players**: `[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11]`
- **32 players**: `[1, 32, 16, 17, ...]`

## Verification

After applying the fix and recreating the bracket:

1. Check Match 1-1: Should have a 1st place finisher from one group
2. Check Match 1-2: Should have a 1st place finisher from a DIFFERENT group
3. Verify that if both win, they would meet in the Finals, not Semi-Finals

## Date

Applied: January 25, 2026
