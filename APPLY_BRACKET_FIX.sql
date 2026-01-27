-- ============================================================================
-- APPLY THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- Copy this entire SQL block and run it in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_seed_order(bracket_size INT)
RETURNS INT[]
LANGUAGE plpgsql
AS $$
DECLARE
  result INT[];
BEGIN
  CASE bracket_size
    WHEN 2 THEN
      result := ARRAY[1, 2];
    WHEN 4 THEN
      -- Match 1: 1 vs 4 (Group A vs Group D)
      -- Match 2: 2 vs 3 (Group B vs Group C)
      result := ARRAY[1, 4, 2, 3];
    WHEN 8 THEN
      -- Match 1: 1 vs 8 (Group A-1st vs Group D-2nd)
      -- Match 2: 4 vs 5 (Group D-1st vs Group A-2nd)
      -- Match 3: 2 vs 7 (Group B-1st vs Group C-2nd)
      -- Match 4: 3 vs 6 (Group C-1st vs Group B-2nd)
      result := ARRAY[1, 8, 4, 5, 2, 7, 3, 6];
    WHEN 16 THEN
      result := ARRAY[1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11];
    WHEN 32 THEN
      result := ARRAY[1, 32, 16, 17, 8, 25, 9, 24, 4, 29, 13, 20, 5, 28, 12, 21, 2, 31, 15, 18, 7, 26, 10, 23, 3, 30, 14, 19, 6, 27, 11, 22];
    ELSE
      result := ARRAY[]::INT[];
      FOR i IN 1..bracket_size LOOP
        result := array_append(result, i);
      END LOOP;
  END CASE;
  RETURN result;
END;
$$;

-- Verify the fix worked
SELECT get_seed_order(4);
-- Should return: {1,4,2,3} → Match 1: 1v4, Match 2: 2v3

SELECT get_seed_order(8);
-- Should return: {1,8,4,5,2,7,3,6} → Proper 8-player bracket
