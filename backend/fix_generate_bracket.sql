-- Fix generate_bracket_matches - remove DELETE, use DROP/CREATE instead
CREATE OR REPLACE FUNCTION public.generate_bracket_matches(t_id uuid, num_groups integer, advancing_per_group integer)
 RETURNS TABLE(match_index integer, p1_group integer, p1_rank integer, p2_group integer, p2_rank integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
  total_slots INT := num_groups * advancing_per_group;
  seed_order INT[];
  seed_map RECORD;
  i INT;
BEGIN
  -- 1. Generate the Seed Order (Mirror Seeding)
  seed_order := get_seed_order(total_slots);
  
  -- 2. Create a temporary table to hold seed-to-player mappings
  -- Drop first to ensure clean state
  DROP TABLE IF EXISTS temp_seed_map;
  
  CREATE TEMP TABLE temp_seed_map (
    seed_value INT,
    group_id INT,
    group_rank INT
  ) ON COMMIT DROP;
  
  -- No DELETE needed - table is fresh
  
  -- Populate the mapping
  INSERT INTO temp_seed_map
  SELECT * FROM map_groups_to_seeds(num_groups, advancing_per_group);
  
  -- 3. Generate matches by pairing seeds
  FOR i IN 1..total_slots BY 2 LOOP
    RETURN QUERY
    SELECT 
      ((i - 1) / 2)::INT as match_index,
      p1_map.group_id::INT,
      p1_map.group_rank::INT,
      p2_map.group_id::INT,
      p2_map.group_rank::INT
    FROM temp_seed_map p1_map
    JOIN temp_seed_map p2_map ON p2_map.seed_value = seed_order[i + 1]
    WHERE p1_map.seed_value = seed_order[i];
  END LOOP;
END;
$function$;
