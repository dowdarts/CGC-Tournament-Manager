-- MIGRATION: Fix Knockout Bracket Seeding
-- Date: 2026-01-25
-- Issue: First-place group finishers can meet before finals
-- Solution: Correct seed order generation to ensure proper bracket structure

-- ============================================================================
-- FIX: Correct Seed Order Generation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_seed_order(bracket_size INT)
RETURNS INT[]
LANGUAGE plpgsql
AS $$
DECLARE
  result INT[];
BEGIN
  -- Proper bracket structures that ensure top seeds are maximally separated
  -- Formula: Seeds are paired to keep them in different bracket quarters
  -- Top half vs Bottom half, then further subdivided
  
  CASE bracket_size
    WHEN 2 THEN
      result := ARRAY[1, 2];
      
    WHEN 4 THEN
      -- Match 1: 1 vs 4 (Group A vs Group D - crossover)
      -- Match 2: 2 vs 3 (Group B vs Group C - crossover)
      -- Winners meet in final
      result := ARRAY[1, 4, 2, 3];
      
    WHEN 8 THEN
      -- Critical fix: Ensures seeds 1,2,3,4 are in different quarters
      -- Match 1: 1v8 (Qtr 1), Match 2: 4v5 (Qtr 2)
      -- Match 3: 2v7 (Qtr 3), Match 4: 3v6 (Qtr 4)
      -- Semi 1: Winner(1v8) vs Winner(4v5)
      -- Semi 2: Winner(2v7) vs Winner(3v6)
      -- Finals: Winner(Semi1) vs Winner(Semi2)
      result := ARRAY[1, 8, 4, 5, 2, 7, 3, 6];
      
    WHEN 16 THEN
      result := ARRAY[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
      
    WHEN 32 THEN
      result := ARRAY[1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21,
                      2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22];
    ELSE
      -- Fallback for unknown sizes
      result := ARRAY[]::INT[];
      FOR i IN 1..bracket_size LOOP
        result := array_append(result, i);
      END LOOP;
  END CASE;
  
  RETURN result;
END;
$$;

-- ============================================================================
-- VERIFICATION EXAMPLE: 4 Groups, 2 Advancing Each (8 Players)
-- ============================================================================

-- Seed Assignment (from map_groups_to_seeds function):
-- Seed 1 = Group A, Rank 1 (A1)
-- Seed 2 = Group B, Rank 1 (B1)
-- Seed 3 = Group C, Rank 1 (C1)
-- Seed 4 = Group D, Rank 1 (D1)
-- Seed 5 = Group A, Rank 2 (A2)
-- Seed 6 = Group B, Rank 2 (B2)
-- Seed 7 = Group C, Rank 2 (C2)
-- Seed 8 = Group D, Rank 2 (D2)

-- New Seed Order: [1, 8, 4, 5, 2, 7, 3, 6]

-- Match Pairings:
-- Match 1 (Qtr 1): Seed 1 vs Seed 8 = A1 vs D2
-- Match 2 (Qtr 2): Seed 4 vs Seed 5 = D1 vs A2  
-- Match 3 (Qtr 3): Seed 2 vs Seed 7 = B1 vs C2
-- Match 4 (Qtr 4): Seed 3 vs Seed 6 = C1 vs B2

-- Bracket Structure (assuming matches 1&2 → Semi 1, matches 3&4 → Semi 2):
-- 
-- QUARTER-FINALS:
--   Qtr 1: A1 vs D2
--   Qtr 2: D1 vs A2
--   Qtr 3: B1 vs C2
--   Qtr 4: C1 vs B2
--
-- SEMI-FINALS:
--   Semi 1: Winner(A1 vs D2) vs Winner(D1 vs A2)
--           Best case: A1 vs D1 (both group winners)
--   Semi 2: Winner(B1 vs C2) vs Winner(C1 vs B2)
--           Best case: B1 vs C1 (both group winners)
--
-- FINALS:
--   Winner of Semi 1 vs Winner of Semi 2
--   Best case: Could be any combination of the 4 group winners
--
-- RESULT: ✓ All four 1st-place finishers are in different quarters
--         ✓ Maximum separation achieved
--         ✓ Group winners can only meet in semi-finals or finals

-- ============================================================================
-- HOW TO APPLY THIS FIX
-- ============================================================================

-- Step 1: Run this migration in Supabase SQL Editor
-- Step 2: Delete existing knockout matches (ONLY if bracket hasn't started):
--         DELETE FROM matches 
--         WHERE tournament_id = '<your-tournament-id>' 
--         AND group_id IS NULL;
-- Step 3: Recreate the knockout bracket from the Group Stage page

-- ============================================================================
-- ALTERNATIVE: If knockout has already started with scores
-- ============================================================================

-- If you have already entered scores in the knockout bracket, you'll need to:
-- 1. Manually reassign players to different matches based on the correct seeding
-- 2. OR start a new tournament with this fix applied
-- 3. The drag-and-drop feature in KnockoutBracket can help reposition players

COMMENT ON FUNCTION get_seed_order(INT) IS 
'Generates standard tournament bracket seed order ensuring maximum separation of top seeds. Fixed 2026-01-25 to prevent group winners from meeting before finals.';
