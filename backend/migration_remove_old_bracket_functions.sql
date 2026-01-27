-- Migration to remove old knockout bracket functions
-- This removes the previous seeding logic in preparation for the new DartConnect-based system
-- Date: 2026-01-19

-- Drop old bracket generation functions
DROP FUNCTION IF EXISTS generate_bracket_seed_order(integer) CASCADE;
DROP FUNCTION IF EXISTS create_two_group_crossover_seeding(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS create_four_group_crossover_seeding(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_professional_bracket_matches(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS setup_tournament_bracket(uuid, text) CASCADE;

-- Drop any views that might depend on these functions
DROP VIEW IF EXISTS bracket_seeding_view CASCADE;
DROP VIEW IF EXISTS knockout_bracket_view CASCADE;

COMMENT ON SCHEMA public IS 'Old bracket functions removed. Ready for new WDF-based professional seeding system.';
