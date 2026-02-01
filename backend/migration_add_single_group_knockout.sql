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
  groups_count INT;
  advance_count INT;
  matches_count INT;
BEGIN
  -- Regex explanation: 
  -- '(\d+)_groups_(\d+)_advance'
  -- (\d+) captures one or more digits
  
  SELECT 
    (regexp_matches(format_name, '(\d+)_groups_(\d+)_advance'))[1]::INT,
    (regexp_matches(format_name, '(\d+)_groups_(\d+)_advance'))[2]::INT
  INTO groups_count, advance_count;

  -- Safety check: Ensure we actually got numbers
  IF groups_count IS NULL OR advance_count IS NULL THEN
    RAISE EXCEPTION 'Invalid format string: %. Expected format: "X_groups_Y_advance"', format_name;
  END IF;

  -- Execute the promotion logic using the extracted numbers
  matches_count := promote_to_knockout(tournament_id, groups_count, advance_count);
  
  RETURN matches_count;

EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Error processing format "%": %', format_name, SQLERRM;
END;
$$;

COMMENT ON FUNCTION setup_knockout_bracket IS 'Quick setup for common tournament formats including single group (e.g., "1_groups_4_advance", "4_groups_2_advance")';
