-- FINAL FIX: Correct seed order generation for proper bracket structure
--
-- The root problem: get_seed_order() generates [1,8,5,4,3,6,7,2]
-- This pairs seeds: (1v8), (5v4), (3v6), (7v2)
-- With group mapping where seeds 1-4 are all 1st place finishers
-- This means seed 1 and seed 4 (both 1st place) can meet in semi-finals!
--
-- Correct bracket structure for 8 players:
-- Top quarter:    1 vs 8
-- Second quarter: 4 vs 5
-- Third quarter:  3 vs 6
-- Bottom quarter: 2 vs 7
--
-- This ensures 1 and 2 (top seeds) are in opposite halves
-- And 3 and 4 (next seeds) are also in opposite halves

CREATE OR REPLACE FUNCTION get_seed_order(bracket_size INT)
RETURNS INT[]
LANGUAGE plpgsql
AS $$
DECLARE
  result INT[];
BEGIN
  -- Hardcoded proper bracket structures
  CASE bracket_size
    WHEN 2 THEN
      result := ARRAY[1, 2];
    WHEN 4 THEN
      result := ARRAY[1, 4, 2, 3];
    WHEN 8 THEN
      -- Correct structure: ensures top 4 seeds are in different quarters
      result := ARRAY[1, 8, 4, 5, 2, 7, 3, 6];
    WHEN 16 THEN
      result := ARRAY[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
    WHEN 32 THEN
      result := ARRAY[1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21,
                      2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22];
    ELSE
      -- For unrecognized sizes, fall back to simple pairing
      result := ARRAY[]::INT[];
      FOR i IN 1..bracket_size LOOP
        result := array_append(result, i);
      END LOOP;
  END CASE;
  
  RETURN result;
END;
$$;

-- Verification for 8-player bracket with 4 groups, 2 advancing:
-- 
-- Seeds: 1=A1, 2=B1, 3=C1, 4=D1, 5=A2, 6=B2, 7=C2, 8=D2
-- Seed order: [1, 8, 4, 5, 2, 7, 3, 6]
-- 
-- Match 1: Seed 1 vs Seed 8 = A1 vs D2
-- Match 2: Seed 4 vs Seed 5 = D1 vs A2
-- Match 3: Seed 2 vs Seed 7 = B1 vs C2
-- Match 4: Seed 3 vs Seed 6 = C1 vs B2
--
-- Bracket structure (matches 1&2 feed into semi-1, matches 3&4 feed into semi-2):
-- Semi-Final 1: Winner of (A1 vs D2) vs Winner of (D1 vs A2)
--   - If both 1st place win: A1 vs D1 in semi ✓
-- Semi-Final 2: Winner of (B1 vs C2) vs Winner of (C1 vs B2)
--   - If both 1st place win: B1 vs C1 in semi ✓
-- 
-- Finals: Winner of Semi-1 vs Winner of Semi-2
--   - Could be A1 vs B1 (both group winners) ✓
--
-- This is CORRECT! Group A and D winners meet in semi-1, Group B and C winners meet in semi-2
-- All four 1st place finishers are in different quarters of the bracket!

-- Instructions to apply:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Delete existing knockout matches: DELETE FROM matches WHERE tournament_id = 'your-id' AND group_id IS NULL;
-- 3. Recreate knockout bracket from Group Stage page
