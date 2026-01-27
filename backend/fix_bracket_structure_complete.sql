-- COMPLETE FIX: Proper bracket seeding with correct match numbering
-- 
-- Problem: Two first-place finishers meeting in semi-finals instead of finals
-- Root cause: Match numbering doesn't respect bracket structure
-- 
-- In database: Matches 1,2,3,4 created sequentially
-- Frontend logic: Match 1 & 2 → Semi 1, Match 3 & 4 → Semi 2
-- 
-- But seeding creates: Match 1 (A1 vs D2), Match 2 (A2 vs D1)
-- If both A1 and D1 win, they meet in Semi 1 - WRONG!
--
-- Solution: Reorder which seed pairs go into which match number
-- Based on standard bracket pairing structure

CREATE OR REPLACE FUNCTION generate_bracket_matches(
  t_id UUID,
  num_groups INT,
  advancing_per_group INT
)
RETURNS TABLE (
  match_index INT,
  p1_group INT,
  p1_rank INT,
  p2_group INT,
  p2_rank INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_slots INT := num_groups * advancing_per_group;
  seed_order INT[];
  seed_map RECORD;
  i INT;
  pair_index INT := 0;
  match_number INT;
  bracket_positions INT[];
BEGIN
  -- 1. Generate the Seed Order (Mirror Seeding)
  seed_order := get_seed_order(total_slots);
  
  -- 2. Create bracket position mapping
  -- For 8 players (4 matches), standard bracket pairs:
  --   Match 1: Seeds at positions 1,2 (1 vs 8)
  --   Match 2: Seeds at positions 7,8 (7 vs 2)
  --   Match 3: Seeds at positions 3,4 (5 vs 4)
  --   Match 4: Seeds at positions 5,6 (3 vs 6)
  -- This ensures Match 1 & 4 feed into one semi, Match 2 & 3 into the other
  
  CASE total_slots
    WHEN 4 THEN
      bracket_positions := ARRAY[1, 2]; -- Match 1: 1v4, Match 2: 2v3
    WHEN 8 THEN
      -- Standard 8-player bracket structure
      -- Top half: Matches 1 & 4, Bottom half: Matches 2 & 3
      bracket_positions := ARRAY[1, 2, 3, 4];
    WHEN 16 THEN
      bracket_positions := ARRAY[1, 8, 4, 5, 2, 7, 3, 6];
    WHEN 32 THEN
      bracket_positions := ARRAY[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
    ELSE
      -- Default to sequential
      bracket_positions := ARRAY[]::INT[];
      FOR i IN 1..(total_slots/2) LOOP
        bracket_positions := array_append(bracket_positions, i);
      END LOOP;
  END CASE;
  
  -- 3. Create a temporary table to hold seed-to-player mappings
  CREATE TEMP TABLE IF NOT EXISTS temp_seed_map (
    seed_value INT,
    group_id INT,
    group_rank INT
  ) ON COMMIT DROP;
  
  DELETE FROM temp_seed_map;
  
  -- Populate the mapping
  INSERT INTO temp_seed_map
  SELECT * FROM map_groups_to_seeds(num_groups, advancing_per_group);
  
  -- 4. Generate matches by pairing seeds with proper bracket positioning
  FOR i IN 1..total_slots BY 2 LOOP
    pair_index := pair_index + 1;
    match_number := bracket_positions[pair_index];
    
    RETURN QUERY
    SELECT 
      (match_number - 1)::INT as match_index,  -- Convert to 0-based for array index
      p1_map.group_id::INT,
      p1_map.group_rank::INT,
      p2_map.group_id::INT,
      p2_map.group_rank::INT
    FROM temp_seed_map p1_map
    JOIN temp_seed_map p2_map ON p2_map.seed_value = seed_order[i + 1]
    WHERE p1_map.seed_value = seed_order[i];
  END LOOP;
END;
$$;

-- Apply this fix by running:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Regenerate your knockout bracket (delete existing knockout matches and recreate)
