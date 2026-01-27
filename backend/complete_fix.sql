-- COMPLETE FIX FOR KNOCKOUT BRACKET CREATION
-- This will: 1) Clean up any existing knockout matches, 2) Drop old function, 3) Create new function without DELETE

-- Step 1: Manually delete any existing knockout matches (RLS-compliant)
-- This finds all knockout matches (where group_id IS NULL) and deletes them
DO $$
DECLARE
  t_id UUID;
BEGIN
  -- Get all tournament IDs that have knockout matches
  FOR t_id IN 
    SELECT DISTINCT tournament_id 
    FROM matches 
    WHERE group_id IS NULL
  LOOP
    -- Delete knockout matches for each tournament (has WHERE clause for RLS)
    DELETE FROM matches 
    WHERE tournament_id = t_id 
      AND group_id IS NULL;
  END LOOP;
END $$;

-- Step 2: Drop ALL versions of the function
DROP FUNCTION IF EXISTS promote_to_knockout CASCADE;
DROP FUNCTION IF EXISTS promote_to_knockout(UUID, INT, INT, TEXT, INT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS promote_to_knockout(UUID, INT, INT) CASCADE;

-- Step 3: Recreate the function WITHOUT the DELETE statement
CREATE FUNCTION promote_to_knockout(
  tournament_id UUID,
  num_groups INT,
  advance_count INT,
  sort_method TEXT DEFAULT 'matches',
  win_points INT DEFAULT 3,
  draw_points INT DEFAULT 1,
  loss_points INT DEFAULT 0
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  match_record RECORD;
  player1_uuid UUID;
  player2_uuid UUID;
  matches_created INT := 0;
  p1_label TEXT;
  p2_label TEXT;
BEGIN
  -- No DELETE statement - old matches were cleaned up before calling this
  
  FOR match_record IN 
    SELECT * FROM generate_bracket_matches(promote_to_knockout.tournament_id, num_groups, advance_count)
  LOOP
    player1_uuid := get_player_by_rank(
      promote_to_knockout.tournament_id, 
      match_record.p1_group, 
      match_record.p1_rank,
      sort_method
    );
    
    player2_uuid := get_player_by_rank(
      promote_to_knockout.tournament_id,
      match_record.p2_group,
      match_record.p2_rank,
      sort_method
    );
    
    p1_label := CHR(65 + match_record.p1_group) || match_record.p1_rank;
    p2_label := CHR(65 + match_record.p2_group) || match_record.p2_rank;
    
    IF player1_uuid IS NOT NULL AND player2_uuid IS NOT NULL THEN
      INSERT INTO matches (
        tournament_id,
        p1_id,
        p2_id,
        round_number,
        match_number,
        p1_label,
        p2_label,
        status
      ) VALUES (
        promote_to_knockout.tournament_id,
        player1_uuid,
        player2_uuid,
        1,
        match_record.match_index + 1,
        p1_label,
        p2_label,
        'pending'
      );
      
      matches_created := matches_created + 1;
    END IF;
  END LOOP;
  
  RETURN matches_created;
END;
$$;

-- Verify the function was created
SELECT 'SUCCESS: promote_to_knockout function recreated without DELETE statement' as status;
