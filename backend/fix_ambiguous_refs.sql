-- Fix get_dynamic_standings
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
      m.tournament_id, m.group_index, p.p_id as p_id,
      COUNT(*) FILTER (WHERE (m.p1_id = p.p_id AND m.p1_legs > m.p2_legs) OR (m.p2_id = p.p_id AND m.p2_legs > m.p1_legs)) as wins,
      COUNT(*) FILTER (WHERE m.p1_legs = m.p2_legs) as draws,
      SUM(CASE 
        WHEN (m.p1_id = p.p_id AND m.p1_legs > m.p2_legs) OR (m.p2_id = p.p_id AND m.p2_legs > m.p1_legs) THEN val_win
        WHEN m.p1_legs = m.p2_legs THEN val_draw
        ELSE val_loss
      END) as points,
      SUM(CASE WHEN m.p1_id = p.p_id THEN m.p1_legs ELSE m.p2_legs END) as l_for,
      SUM(CASE WHEN m.p1_id = p.p_id THEN m.p2_legs ELSE m.p1_legs END) as l_ag
    FROM matches m
    CROSS JOIN LATERAL (SELECT m.p1_id UNION SELECT m.p2_id) AS p(p_id)
    WHERE m.tournament_id = get_dynamic_standings.t_id AND m.status = 'completed' AND m.group_id IS NOT NULL
    GROUP BY m.tournament_id, m.group_index, p.p_id
  )
  SELECT 
    s.p_id, s.group_index, s.wins::INT, s.points::INT, (s.l_for - s.l_ag)::INT, s.l_for::INT,
    DENSE_RANK() OVER (
      PARTITION BY s.group_index 
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

DROP FUNCTION IF EXISTS promote_to_knockout(UUID, INT, INT, TEXT, INT, INT, INT);

-- Fix promote_to_knockout
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
  
  -- NOTE: DELETE commented out due to RLS restrictions
  -- You may need to manually delete old knockout matches first
  -- DELETE FROM matches WHERE tournament_id = t_id_var AND group_id IS NULL;
  
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

-- Fix setup_knockout_bracket
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
    WHEN '2_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 2);
    WHEN '2_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 4);
    WHEN '2_groups_8_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 8);
    WHEN '4_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 4, 2);
    WHEN '4_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 4, 4);
    WHEN '8_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 8, 2);
    WHEN '8_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 8, 4);
    WHEN '16_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 16, 4);
    ELSE
      RAISE EXCEPTION 'Unsupported tournament format: %. Use format like "4_groups_2_advance"', format_name;
  END CASE;
  
  RETURN matches_count;
END;
$$;
