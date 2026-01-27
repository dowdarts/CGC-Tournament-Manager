-- STEP 1: Forcefully drop ALL versions of the function
DROP FUNCTION IF EXISTS promote_to_knockout CASCADE;
DROP FUNCTION IF EXISTS promote_to_knockout(UUID, INT, INT, TEXT, INT, INT, INT) CASCADE;
DROP FUNCTION IF EXISTS promote_to_knockout(UUID, INT, INT) CASCADE;

-- STEP 2: Recreate the function WITHOUT the DELETE statement
CREATE OR REPLACE FUNCTION promote_to_knockout(
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
  t_id_var UUID;
BEGIN
  t_id_var := promote_to_knockout.tournament_id;
  
  -- NOTE: DELETE removed due to RLS restrictions
  -- Manually delete old knockout matches before calling this function if needed
  
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
