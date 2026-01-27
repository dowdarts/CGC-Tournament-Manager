-- Fix get_dynamic_standings to use ROW_NUMBER for unique ranks
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
    ROW_NUMBER() OVER (
      PARTITION BY s.group_id 
      ORDER BY 
        CASE WHEN sort_method = 'matches' THEN s.wins END DESC,
        CASE WHEN sort_method = 'points' THEN s.points END DESC,
        CASE WHEN sort_method = 'legs' THEN s.l_for END DESC,
        (s.l_for - s.l_ag) DESC, 
        s.l_for DESC,
        s.p_id  -- Add player_id as final tiebreaker for consistency
    )::INT as final_rank
  FROM stats s;
END;
$$;

SELECT 'Updated to use ROW_NUMBER for unique ranks' as status;
