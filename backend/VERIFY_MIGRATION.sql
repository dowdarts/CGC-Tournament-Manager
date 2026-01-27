-- Verification Script for DartConnect Seeding Migration
-- Run this after applying the migration to verify everything installed correctly
-- Date: 2026-01-19

-- ============================================================================
-- PART 1: Verify all new functions exist
-- ============================================================================

SELECT 
  routine_name as function_name,
  routine_type as type,
  'Installed ✅' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_dynamic_standings',
  'get_seed_order',
  'map_groups_to_seeds',
  'get_crossover_group',
  'get_opponent_rank',
  'generate_bracket_matches',
  'promote_to_knockout',
  'get_player_by_rank',
  'setup_knockout_bracket'
)
ORDER BY routine_name;

-- Expected: 9 rows (all functions should show "Installed ✅")

-- ============================================================================
-- PART 2: Verify old functions are removed
-- ============================================================================

SELECT 
  routine_name as old_function_name,
  'Should be removed ❌' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'generate_bracket_seed_order',
  'create_two_group_crossover_seeding',
  'create_four_group_crossover_seeding',
  'generate_professional_bracket_matches',
  'setup_tournament_bracket'
)
ORDER BY routine_name;

-- Expected: 0 rows (all old functions should be gone)

-- ============================================================================
-- PART 3: Test seed order generation
-- ============================================================================

-- Test 8-player bracket seed order
-- Expected: [1, 8, 5, 4, 3, 6, 7, 2]
SELECT get_seed_order(8) as eight_player_seeds;

-- Test 16-player bracket seed order
-- Expected: [1, 16, 9, 8, 5, 12, 13, 4, 3, 14, 11, 6, 7, 10, 15, 2]
SELECT get_seed_order(16) as sixteen_player_seeds;

-- ============================================================================
-- PART 4: Test group-to-seed mapping
-- ============================================================================

-- Test 4 groups, 2 advancing each (8 players total)
-- This shows how group finishers map to bracket seeds
SELECT 
  seed_value as seed,
  'Group ' || CHR(65 + group_id) as group_letter,
  'Rank ' || group_rank as position,
  CHR(65 + group_id) || group_rank as display
FROM map_groups_to_seeds(4, 2)
ORDER BY seed_value;

-- Expected output:
-- seed | group_letter | position | display
-- -----|--------------|----------|--------
-- 1    | Group A      | Rank 1   | A1
-- 2    | Group B      | Rank 1   | B1
-- 3    | Group C      | Rank 1   | C1
-- 4    | Group D      | Rank 1   | D1
-- 5    | Group A      | Rank 2   | A2
-- 6    | Group B      | Rank 2   | B2
-- 7    | Group C      | Rank 2   | C2
-- 8    | Group D      | Rank 2   | D2

-- ============================================================================
-- PART 5: Test crossover group calculation
-- ============================================================================

-- For 8 groups, what is Group 0's crossover opponent?
-- Expected: 4 (Group 0 pairs with Group 4)
SELECT get_crossover_group(0, 8) as group_0_opponent;

-- For 16 groups, what is Group 0's crossover opponent?
-- Expected: 8 (Group 0 pairs with Group 8)
SELECT get_crossover_group(0, 16) as group_0_opponent_16;

-- ============================================================================
-- PART 6: Test opponent rank pairing
-- ============================================================================

-- In a 4-advancing scenario, who does Rank 1 play?
-- Expected: 4 (1st plays 4th)
SELECT get_opponent_rank(1, 4) as rank_1_opponent;

-- Expected: 3 (2nd plays 3rd)
SELECT get_opponent_rank(2, 4) as rank_2_opponent;

-- ============================================================================
-- PART 7: Full integration test (requires a test tournament)
-- ============================================================================

-- IMPORTANT: Replace 'test-tournament-uuid' with an actual tournament ID
-- This will show what the bracket matchups would be WITHOUT creating them

/*
SELECT 
  match_index + 1 as match_number,
  CHR(65 + p1_group) || p1_rank as player1_label,
  CHR(65 + p2_group) || p2_rank as player2_label,
  'Match ' || (match_index + 1) || ': ' || 
    CHR(65 + p1_group) || p1_rank || ' vs ' || 
    CHR(65 + p2_group) || p2_rank as matchup
FROM generate_bracket_matches(
  'test-tournament-uuid'::uuid,
  4,  -- 4 groups
  2   -- 2 advancing per group
)
ORDER BY match_index;
*/

-- Expected output for 4 groups, 2 advancing:
-- match_number | player1_label | player2_label | matchup
-- -------------|---------------|---------------|------------------
-- 1            | A1            | D2            | Match 1: A1 vs D2
-- 2            | B1            | C2            | Match 2: B1 vs C2
-- 3            | C1            | B2            | Match 3: C1 vs B2
-- 4            | D1            | A2            | Match 4: D1 vs A2

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- If all tests pass, you should see:
-- ✅ 9 functions installed
-- ✅ 0 old functions remaining
-- ✅ Correct seed orders generated
-- ✅ Proper group-to-seed mappings
-- ✅ Correct crossover pairings
-- ✅ Proper rank opponents (1 plays 4, 2 plays 3)

-- Migration is SUCCESSFUL! ✅

-- ============================================================================
-- NEXT STEPS
-- ============================================================================

-- 1. Update your TypeScript code to use the new functions
--    See: TYPESCRIPT_INTEGRATION.md
--
-- 2. Test with a real tournament:
--    SELECT setup_knockout_bracket('your-tournament-uuid', '4_groups_2_advance');
--
-- 3. Verify matches in database:
--    SELECT match_number, p1_label, p2_label 
--    FROM matches 
--    WHERE tournament_id = 'your-tournament-uuid' 
--    AND group_id IS NULL;
