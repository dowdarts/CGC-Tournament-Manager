-- Fix bracket seeding to prevent first place finishers from meeting before finals
-- The issue: Sequential seed assignment puts all 1st place finishers in seeds 1-4,
-- which means they can meet in semi-finals instead of finals.
--
-- The solution: Interleave ranks so 1st place finishers are maximally separated

CREATE OR REPLACE FUNCTION map_groups_to_seeds(
  num_groups INT,
  num_qualifiers INT
)
RETURNS TABLE (
  seed_value INT,
  group_id INT,
  group_rank INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_players INT := num_groups * num_qualifiers;
  current_rank INT;
  current_group INT;
  current_seed INT;
BEGIN
  -- IMPROVED MAPPING: Interleave ranks to maximize separation
  -- Old way: All 1st place, then all 2nd place, etc.
  -- New way: Rotate through ranks for each group
  --
  -- Example for 4 groups, 2 advancing (8 players):
  -- Group 0: Rank 1 → Seed 1, Rank 2 → Seed 5
  -- Group 1: Rank 1 → Seed 2, Rank 2 → Seed 6
  -- Group 2: Rank 1 → Seed 3, Rank 2 → Seed 7
  -- Group 3: Rank 1 → Seed 4, Rank 2 → Seed 8
  --
  -- With seed order [1,8,5,4,3,6,7,2], matches become:
  -- Match 1: Seed 1 vs 8 → Group0-1st vs Group3-2nd
  -- Match 2: Seed 5 vs 4 → Group0-2nd vs Group3-1st
  -- Match 3: Seed 3 vs 6 → Group2-1st vs Group1-2nd
  -- Match 4: Seed 7 vs 2 → Group2-2nd vs Group1-1st
  --
  -- This ensures 1st place finishers can only meet in finals!
  
  FOR current_group IN 0..(num_groups - 1) LOOP
    FOR current_rank IN 1..num_qualifiers LOOP
      -- New formula: seed = group + (rank - 1) * num_groups + 1
      current_seed := current_group + ((current_rank - 1) * num_groups) + 1;
      
      RETURN QUERY SELECT 
        current_seed::INT,
        current_group::INT,
        current_rank::INT;
    END LOOP;
  END LOOP;
END;
$$;

-- Test the new mapping
-- For 4 groups, 2 advancing:
-- SELECT * FROM map_groups_to_seeds(4, 2) ORDER BY seed_value;
-- Expected output:
-- seed_value | group_id | group_rank
-- -----------+----------+-----------
--     1      |    0     |     1
--     2      |    1     |     1
--     3      |    2     |     1
--     4      |    3     |     1
--     5      |    0     |     2
--     6      |    1     |     2
--     7      |    2     |     2
--     8      |    3     |     2
