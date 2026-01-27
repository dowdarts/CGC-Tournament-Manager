-- Create missing get_player_by_rank function
CREATE OR REPLACE FUNCTION get_player_by_rank(
  t_id UUID,
  group_idx INT,
  rank_pos INT,
  sort_method TEXT DEFAULT 'matches'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  player_uuid UUID;
BEGIN
  SELECT player_id INTO player_uuid
  FROM get_dynamic_standings(t_id, sort_method, 3, 1, 0)
  WHERE group_index = group_idx AND final_rank = rank_pos
  LIMIT 1;
  
  RETURN player_uuid;
END;
$$;

SELECT 'get_player_by_rank function created successfully' as status;
