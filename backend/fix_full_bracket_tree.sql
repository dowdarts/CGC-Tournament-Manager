-- Fix promote_to_knockout to create full bracket tree with TBD placeholders
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
  total_players INT;
  total_matches INT;
  current_round INT;
  matches_in_round INT;
  round_1_match_ids UUID[];
  previous_round_ids UUID[];
  current_round_ids UUID[];
  match_id UUID;
  idx INT;
BEGIN
  total_players := num_groups * advance_count;
  
  -- Calculate total matches needed: n-1 for single elimination
  total_matches := total_players - 1;
  
  -- ROUND 1: Create matches with real players
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
        player1_id,
        player2_id,
        round_number,
        match_number,
        status,
        p1_group,
        p1_rank,
        p2_group,
        p2_rank
      ) VALUES (
        promote_to_knockout.tournament_id,
        player1_uuid,
        player2_uuid,
        1,
        match_record.match_index + 1,
        'pending',
        match_record.p1_group,
        match_record.p1_rank,
        match_record.p2_group,
        match_record.p2_rank
      )
      RETURNING id INTO match_id;
      
      -- Store round 1 match IDs in order
      round_1_match_ids := array_append(round_1_match_ids, match_id);
      matches_created := matches_created + 1;
    END IF;
  END LOOP;
  
  -- SUBSEQUENT ROUNDS: Create TBD matches with winner mappings
  previous_round_ids := round_1_match_ids;
  current_round := 2;
  matches_in_round := total_players / 2; -- Start with half the players
  
  WHILE matches_in_round > 1 LOOP
    matches_in_round := matches_in_round / 2;
    current_round_ids := ARRAY[]::UUID[];
    
    -- Create matches for this round
    FOR idx IN 1..matches_in_round LOOP
      INSERT INTO matches (
        tournament_id,
        player1_id,
        player2_id,
        round_number,
        match_number,
        status,
        feeds_from_match1_id,
        feeds_from_match2_id
      ) VALUES (
        promote_to_knockout.tournament_id,
        NULL, -- TBD
        NULL, -- TBD
        current_round,
        idx,
        'pending',
        previous_round_ids[(idx - 1) * 2 + 1], -- Winner of match 2n-1
        previous_round_ids[(idx - 1) * 2 + 2]  -- Winner of match 2n
      )
      RETURNING id INTO match_id;
      
      current_round_ids := array_append(current_round_ids, match_id);
      matches_created := matches_created + 1;
    END LOOP;
    
    previous_round_ids := current_round_ids;
    current_round := current_round + 1;
  END LOOP;
  
  -- FINAL MATCH: Create the championship match
  IF array_length(previous_round_ids, 1) = 2 THEN
    INSERT INTO matches (
      tournament_id,
      player1_id,
      player2_id,
      round_number,
      match_number,
      status,
      feeds_from_match1_id,
      feeds_from_match2_id
    ) VALUES (
      promote_to_knockout.tournament_id,
      NULL, -- TBD
      NULL, -- TBD
      current_round,
      1,
      'pending',
      previous_round_ids[1],
      previous_round_ids[2]
    );
    
    matches_created := matches_created + 1;
  END IF;
  
  RETURN matches_created;
END;
$$;

SELECT 'Created full bracket tree with TBD placeholders and winner mappings' as status;
