-- Fix get_dynamic_standings with correct column names
CREATE OR REPLACE FUNCTION get_dynamic_standings(
  t_id UUID, 
  sort_method TEXT DEFAULT 'matches',
  val_win INT DEFAULT 3,
  val_draw INT DEFAULT 1,
  val_loss INT DEFAULT 0
)
RETURNS TABLE (
  player_id UUID,
  group_index INT,
  total_wins INT,
  total_points INT,
  leg_diff INT,
  legs_won INT,
  final_rank INT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      m.tournament_id, m.group_id, p.p_id as p_id,
      COUNT(*) FILTER (WHERE (m.player1_id = p.p_id AND m.player1_legs > m.player2_legs) OR (m.player2_id = p.p_id AND m.player2_legs > m.player1_legs)) as wins,
      COUNT(*) FILTER (WHERE m.player1_legs = m.player2_legs) as draws,
      SUM(CASE 
        WHEN (m.player1_id = p.p_id AND m.player1_legs > m.player2_legs) OR (m.player2_id = p.p_id AND m.player2_legs > m.player1_legs) THEN val_win
        WHEN m.player1_legs = m.player2_legs THEN val_draw
        ELSE val_loss
      END) as points,
      SUM(CASE WHEN m.player1_id = p.p_id THEN m.player1_legs ELSE m.player2_legs END) as l_for,
      SUM(CASE WHEN m.player1_id = p.p_id THEN m.player2_legs ELSE m.player1_legs END) as l_ag
    FROM matches m
    CROSS JOIN LATERAL (SELECT m.player1_id UNION SELECT m.player2_id) AS p(p_id)
    WHERE m.tournament_id = get_dynamic_standings.t_id AND m.status = 'completed' AND m.group_id IS NOT NULL
    GROUP BY m.tournament_id, m.group_id, p.p_id
  )
  SELECT 
    s.p_id, 
    DENSE_RANK() OVER (ORDER BY s.group_id)::INT - 1 as group_index,
    s.wins::INT, 
    s.points::INT, 
    (s.l_for - s.l_ag)::INT, 
    s.l_for::INT,
    DENSE_RANK() OVER (
      PARTITION BY s.group_id 
      ORDER BY 
        CASE WHEN sort_method = 'matches' THEN s.wins END DESC,
        CASE WHEN sort_method = 'points' THEN s.points END DESC,
        CASE WHEN sort_method = 'legs' THEN s.l_for END DESC,
        (s.l_for - s.l_ag) DESC, 
        s.l_for DESC
    )::INT as final_rank
  FROM stats s;
END;
$$;

-- Fix promote_to_knockout with correct column names
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
BEGIN
  -- No DELETE statement - old matches cleaned up separately
  
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
        status
      ) VALUES (
        promote_to_knockout.tournament_id,
        player1_uuid,
        player2_uuid,
        1,
        match_record.match_index + 1,
        'pending'
      );
      
      matches_created := matches_created + 1;
    END IF;
  END LOOP;
  
  RETURN matches_created;
END;
$$;
