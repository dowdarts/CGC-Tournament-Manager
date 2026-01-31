-- Migration: Add support for single-group knockout formats
-- This allows tournaments with 1 group to advance players to knockout stage

CREATE OR REPLACE FUNCTION setup_knockout_bracket(
  tournament_id UUID,
  format_name TEXT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  matches_count INT;
BEGIN
  CASE format_name
    -- 1 Group Scenarios (Single Round Robin advancing to knockout)
    WHEN '1_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 1, 2);
    WHEN '1_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 1, 4);
    WHEN '1_groups_8_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 1, 8);
    WHEN '1_groups_16_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 1, 16);
    
    -- 2 Groups Scenarios
    WHEN '2_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 2);
    WHEN '2_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 4);
    WHEN '2_groups_8_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 8);
    
    -- 4 Groups Scenarios
    WHEN '4_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 4, 2);
    WHEN '4_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 4, 4);
    
    -- 8 Groups Scenarios
    WHEN '8_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 8, 2);
    WHEN '8_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 8, 4);
    
    -- 16 Groups Scenarios
    WHEN '16_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 16, 4);
    
    ELSE
      RAISE EXCEPTION 'Unsupported tournament format: %. Use format like "4_groups_2_advance" or "1_groups_4_advance"', format_name;
  END CASE;
  
  RETURN matches_count;
END;
$$;

COMMENT ON FUNCTION setup_knockout_bracket IS 'Quick setup for common tournament formats including single group (e.g., "1_groups_4_advance", "4_groups_2_advance")';
