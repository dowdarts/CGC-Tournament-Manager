-- Migration: Add Scoreboard Views and Functions
-- Description: Creates optimized views and functions for the live scoreboard display
-- Date: 2026-01-19

-- ============================================================================
-- SCOREBOARD VIEWS
-- ============================================================================

-- View: Live Matches with Full Details
-- Purpose: Provides all information needed for live match display
CREATE OR REPLACE VIEW scoreboard_live_matches AS
SELECT 
  m.id,
  m.tournament_id,
  m.player1_id,
  m.player2_id,
  m.group_id,
  m.board_id,
  m.status,
  m.winner_id,
  m.player1_legs,
  m.player2_legs,
  m.legs_to_win,
  m.sets_to_win,
  m.current_set,
  m.round_number,
  m.started_at,
  m.completed_at,
  -- Player 1 details
  p1.name as player1_name,
  p1.email as player1_email,
  -- Player 2 details
  p2.name as player2_name,
  p2.email as player2_email,
  -- Board details
  b.board_number,
  b.status as board_status,
  -- Group details
  g.name as group_name,
  -- Match duration in seconds
  CASE 
    WHEN m.status = 'in-progress' AND m.started_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (NOW() - m.started_at))::INTEGER
    ELSE 0
  END as duration_seconds,
  -- Leader indicator
  CASE 
    WHEN m.player1_legs > m.player2_legs THEN 1
    WHEN m.player2_legs > m.player1_legs THEN 2
    ELSE 0
  END as leader
FROM matches m
INNER JOIN players p1 ON m.player1_id = p1.id
INNER JOIN players p2 ON m.player2_id = p2.id
LEFT JOIN boards b ON m.board_id = b.id
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.status = 'in-progress';

-- View: Upcoming Matches
-- Purpose: Shows scheduled matches ready to start
CREATE OR REPLACE VIEW scoreboard_upcoming_matches AS
SELECT 
  m.id,
  m.tournament_id,
  m.player1_id,
  m.player2_id,
  m.group_id,
  m.board_id,
  m.round_number,
  m.legs_to_win,
  m.created_at,
  -- Player 1 details
  p1.name as player1_name,
  -- Player 2 details
  p2.name as player2_name,
  -- Board details
  b.board_number,
  -- Group details
  g.name as group_name
FROM matches m
INNER JOIN players p1 ON m.player1_id = p1.id
INNER JOIN players p2 ON m.player2_id = p2.id
LEFT JOIN boards b ON m.board_id = b.id
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.status = 'scheduled'
ORDER BY m.created_at ASC;

-- View: Recent Results
-- Purpose: Shows recently completed matches with winners
CREATE OR REPLACE VIEW scoreboard_recent_results AS
SELECT 
  m.id,
  m.tournament_id,
  m.player1_id,
  m.player2_id,
  m.group_id,
  m.board_id,
  m.winner_id,
  m.player1_legs,
  m.player2_legs,
  m.round_number,
  m.completed_at,
  -- Player 1 details
  p1.name as player1_name,
  -- Player 2 details
  p2.name as player2_name,
  -- Winner details
  w.name as winner_name,
  -- Board details
  b.board_number,
  -- Group details
  g.name as group_name,
  -- Match duration
  CASE 
    WHEN m.started_at IS NOT NULL AND m.completed_at IS NOT NULL
    THEN EXTRACT(EPOCH FROM (m.completed_at - m.started_at))::INTEGER
    ELSE 0
  END as duration_seconds
FROM matches m
INNER JOIN players p1 ON m.player1_id = p1.id
INNER JOIN players p2 ON m.player2_id = p2.id
LEFT JOIN players w ON m.winner_id = w.id
LEFT JOIN boards b ON m.board_id = b.id
LEFT JOIN groups g ON m.group_id = g.id
WHERE m.status = 'completed'
ORDER BY m.completed_at DESC;

-- ============================================================================
-- SCOREBOARD FUNCTIONS
-- ============================================================================

-- Function: Get Tournament Scoreboard Summary
-- Returns: Complete scoreboard data for a tournament
CREATE OR REPLACE FUNCTION get_tournament_scoreboard(tournament_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'live_matches', (
      SELECT COALESCE(json_agg(row_to_json(lm)), '[]'::json)
      FROM scoreboard_live_matches lm
      WHERE lm.tournament_id = tournament_uuid
    ),
    'upcoming_matches', (
      SELECT COALESCE(json_agg(row_to_json(um)), '[]'::json)
      FROM (
        SELECT * FROM scoreboard_upcoming_matches
        WHERE tournament_id = tournament_uuid
        LIMIT 10
      ) um
    ),
    'recent_results', (
      SELECT COALESCE(json_agg(row_to_json(rr)), '[]'::json)
      FROM (
        SELECT * FROM scoreboard_recent_results
        WHERE tournament_id = tournament_uuid
        LIMIT 5
      ) rr
    ),
    'stats', json_build_object(
      'total_matches', (SELECT COUNT(*) FROM matches WHERE tournament_id = tournament_uuid),
      'completed_matches', (SELECT COUNT(*) FROM matches WHERE tournament_id = tournament_uuid AND status = 'completed'),
      'live_matches', (SELECT COUNT(*) FROM matches WHERE tournament_id = tournament_uuid AND status = 'in-progress'),
      'scheduled_matches', (SELECT COUNT(*) FROM matches WHERE tournament_id = tournament_uuid AND status = 'scheduled')
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get Board Status Summary
-- Returns: Current status of all boards
CREATE OR REPLACE FUNCTION get_board_status_summary(tournament_uuid UUID)
RETURNS TABLE (
  board_id UUID,
  board_number INTEGER,
  status TEXT,
  current_match_id UUID,
  player1_name TEXT,
  player2_name TEXT,
  score TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as board_id,
    b.board_number,
    b.status,
    m.id as current_match_id,
    p1.name as player1_name,
    p2.name as player2_name,
    CONCAT(m.player1_legs, ' - ', m.player2_legs) as score
  FROM boards b
  LEFT JOIN matches m ON b.id = m.board_id AND m.status = 'in-progress'
  LEFT JOIN players p1 ON m.player1_id = p1.id
  LEFT JOIN players p2 ON m.player2_id = p2.id
  WHERE b.tournament_id = tournament_uuid
  ORDER BY b.board_number;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get Match Queue for Board
-- Returns: Upcoming matches assigned to a specific board
CREATE OR REPLACE FUNCTION get_board_match_queue(board_uuid UUID)
RETURNS TABLE (
  match_id UUID,
  player1_name TEXT,
  player2_name TEXT,
  round_name TEXT,
  position INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as match_id,
    p1.name as player1_name,
    p2.name as player2_name,
    CASE 
      WHEN m.group_id IS NOT NULL THEN 'Group Stage'
      WHEN m.round_number = 1 THEN 'Round 1'
      WHEN m.round_number = 2 THEN 'Quarter-Final'
      WHEN m.round_number = 3 THEN 'Semi-Final'
      WHEN m.round_number = 4 THEN 'Final'
      ELSE CONCAT('Round ', m.round_number::TEXT)
    END as round_name,
    ROW_NUMBER() OVER (ORDER BY m.created_at) as position
  FROM matches m
  INNER JOIN players p1 ON m.player1_id = p1.id
  INNER JOIN players p2 ON m.player2_id = p2.id
  WHERE m.board_id = board_uuid
    AND m.status = 'scheduled'
  ORDER BY m.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant access to scoreboard views (public read access for display purposes)
GRANT SELECT ON scoreboard_live_matches TO anon, authenticated;
GRANT SELECT ON scoreboard_upcoming_matches TO anon, authenticated;
GRANT SELECT ON scoreboard_recent_results TO anon, authenticated;

-- Grant execute permissions on scoreboard functions
GRANT EXECUTE ON FUNCTION get_tournament_scoreboard(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_board_status_summary(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_board_match_queue(UUID) TO anon, authenticated;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Ensure we have indexes for scoreboard queries
CREATE INDEX IF NOT EXISTS idx_matches_status_started ON matches(status, started_at DESC) WHERE status = 'in-progress';
CREATE INDEX IF NOT EXISTS idx_matches_status_completed ON matches(status, completed_at DESC) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS idx_matches_board_status ON matches(board_id, status) WHERE board_id IS NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON VIEW scoreboard_live_matches IS 'Real-time view of all in-progress matches with full player and board details';
COMMENT ON VIEW scoreboard_upcoming_matches IS 'Scheduled matches ordered by creation time for queue display';
COMMENT ON VIEW scoreboard_recent_results IS 'Recently completed matches with winner information';
COMMENT ON FUNCTION get_tournament_scoreboard(UUID) IS 'Returns complete scoreboard data as JSON for a tournament';
COMMENT ON FUNCTION get_board_status_summary(UUID) IS 'Returns current status of all boards in a tournament';
COMMENT ON FUNCTION get_board_match_queue(UUID) IS 'Returns upcoming matches for a specific board';
