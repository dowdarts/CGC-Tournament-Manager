-- Migration: Add DartConnect Live Scraper Integration
-- Description: Adds support for automatic match score capture from DartConnect
-- Date: 2026-01-27

-- =====================================================================
-- 1. Pending Match Results Table
-- =====================================================================
-- Stores match results captured from DartConnect that need approval
CREATE TABLE IF NOT EXISTS pending_match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL, -- Linked match (if found)
  watch_code TEXT NOT NULL, -- DartConnect watch code
  scraper_session_id UUID REFERENCES scraper_sessions(id) ON DELETE SET NULL,
  
  -- Player Information from DartConnect
  player1_name TEXT NOT NULL,
  player2_name TEXT NOT NULL,
  
  -- Match Results
  player1_legs INTEGER NOT NULL DEFAULT 0,
  player2_legs INTEGER NOT NULL DEFAULT 0,
  player1_sets INTEGER DEFAULT 0,
  player2_sets INTEGER DEFAULT 0,
  winner_name TEXT, -- Determined winner
  
  -- Additional Match Data
  match_format TEXT, -- e.g., "Best of 5 Legs"
  player1_average DECIMAL(5,2), -- 3-dart average
  player2_average DECIMAL(5,2),
  player1_highest_checkout INTEGER,
  player2_highest_checkout INTEGER,
  player1_180s INTEGER DEFAULT 0,
  player2_180s INTEGER DEFAULT 0,
  total_legs_played INTEGER,
  match_duration_minutes INTEGER,
  
  -- Match Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto-accepted')),
  
  -- Matching Information
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 (how confident we are in the match link)
  match_found BOOLEAN DEFAULT FALSE,
  matching_notes TEXT, -- Why a match was or wasn't found
  
  -- Raw Data
  raw_scraper_data JSONB, -- Full data from scraper for debugging
  
  -- Timestamps
  match_started_at TIMESTAMP,
  match_completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP, -- When admin approved/rejected
  processed_by TEXT -- Admin who processed it
);

-- =====================================================================
-- 2. DartConnect Watch Codes (Link matches to watch codes)
-- =====================================================================
-- Associates scheduled matches with DartConnect watch codes
CREATE TABLE IF NOT EXISTS match_watch_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  watch_code TEXT NOT NULL,
  
  -- Scraper Status
  scraper_active BOOLEAN DEFAULT FALSE,
  scraper_started_at TIMESTAMP,
  scraper_stopped_at TIMESTAMP,
  
  -- Settings
  auto_accept_enabled BOOLEAN DEFAULT FALSE, -- Auto-accept scores for this match
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(match_id, watch_code)
);

-- =====================================================================
-- 3. Tournament Settings Extension
-- =====================================================================
-- Add columns to tournaments table for scraper integration
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS dartconnect_integration_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dartconnect_auto_accept_scores BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dartconnect_require_manual_approval BOOLEAN DEFAULT TRUE;

-- =====================================================================
-- 4. Scraper Sessions Update
-- =====================================================================
-- Extend scraper_sessions table with match linking
ALTER TABLE scraper_sessions
ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS linked_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS result_submitted BOOLEAN DEFAULT FALSE;

-- =====================================================================
-- 5. Match History Log
-- =====================================================================
-- Tracks all score changes and approvals for audit trail
CREATE TABLE IF NOT EXISTS match_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  
  -- What changed
  change_type TEXT NOT NULL CHECK (change_type IN ('manual_entry', 'dartconnect_auto', 'dartconnect_approved', 'dartconnect_rejected', 'score_update')),
  
  -- Old values
  old_player1_legs INTEGER,
  old_player2_legs INTEGER,
  old_winner_id UUID,
  old_status TEXT,
  
  -- New values
  new_player1_legs INTEGER,
  new_player2_legs INTEGER,
  new_winner_id UUID,
  new_status TEXT,
  
  -- Source information
  source TEXT, -- 'manual', 'dartconnect', 'auto-accept'
  pending_result_id UUID REFERENCES pending_match_results(id) ON DELETE SET NULL,
  changed_by TEXT, -- User who made the change
  change_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 6. Indexes for Performance
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_pending_results_tournament ON pending_match_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_pending_results_status ON pending_match_results(status);
CREATE INDEX IF NOT EXISTS idx_pending_results_watch_code ON pending_match_results(watch_code);
CREATE INDEX IF NOT EXISTS idx_pending_results_match ON pending_match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_pending_results_created ON pending_match_results(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_codes_match ON match_watch_codes(match_id);
CREATE INDEX IF NOT EXISTS idx_watch_codes_tournament ON match_watch_codes(tournament_id);
CREATE INDEX IF NOT EXISTS idx_watch_codes_code ON match_watch_codes(watch_code);

CREATE INDEX IF NOT EXISTS idx_score_history_match ON match_score_history(match_id);
CREATE INDEX IF NOT EXISTS idx_score_history_tournament ON match_score_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_score_history_created ON match_score_history(created_at DESC);

-- =====================================================================
-- 7. Row Level Security (RLS) Policies
-- =====================================================================
-- Enable RLS on new tables
ALTER TABLE pending_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_watch_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_score_history ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (you can make this more restrictive)
CREATE POLICY "Allow all for authenticated users" ON pending_match_results
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON match_watch_codes
  FOR ALL USING (true);

CREATE POLICY "Allow all for authenticated users" ON match_score_history
  FOR ALL USING (true);

-- =====================================================================
-- 8. Helper Functions
-- =====================================================================

-- Function to automatically match player names and create pending result
CREATE OR REPLACE FUNCTION match_dartconnect_players(
  p_tournament_id UUID,
  p_player1_name TEXT,
  p_player2_name TEXT
) RETURNS TABLE (
  match_id UUID,
  confidence DECIMAL(3,2),
  notes TEXT
) AS $$
DECLARE
  v_match_id UUID;
  v_player1_id UUID;
  v_player2_id UUID;
  v_confidence DECIMAL(3,2);
  v_notes TEXT;
BEGIN
  -- Try to find exact match first
  SELECT m.id INTO v_match_id
  FROM matches m
  JOIN players p1 ON m.player1_id = p1.id
  JOIN players p2 ON m.player2_id = p2.id
  WHERE m.tournament_id = p_tournament_id
    AND m.status IN ('scheduled', 'in-progress')
    AND (
      (LOWER(TRIM(p1.name)) = LOWER(TRIM(p_player1_name)) AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p_player2_name)))
      OR
      (LOWER(TRIM(p1.name)) = LOWER(TRIM(p_player2_name)) AND LOWER(TRIM(p2.name)) = LOWER(TRIM(p_player1_name)))
    )
  LIMIT 1;

  IF v_match_id IS NOT NULL THEN
    v_confidence := 1.00;
    v_notes := 'Exact name match found';
  ELSE
    -- Try fuzzy matching (contains)
    SELECT m.id INTO v_match_id
    FROM matches m
    JOIN players p1 ON m.player1_id = p1.id
    JOIN players p2 ON m.player2_id = p2.id
    WHERE m.tournament_id = p_tournament_id
      AND m.status IN ('scheduled', 'in-progress')
      AND (
        (LOWER(p1.name) LIKE '%' || LOWER(TRIM(p_player1_name)) || '%' 
         AND LOWER(p2.name) LIKE '%' || LOWER(TRIM(p_player2_name)) || '%')
        OR
        (LOWER(p1.name) LIKE '%' || LOWER(TRIM(p_player2_name)) || '%' 
         AND LOWER(p2.name) LIKE '%' || LOWER(TRIM(p_player1_name)) || '%')
      )
    LIMIT 1;

    IF v_match_id IS NOT NULL THEN
      v_confidence := 0.75;
      v_notes := 'Fuzzy name match found';
    ELSE
      v_confidence := 0.00;
      v_notes := 'No matching scheduled match found';
    END IF;
  END IF;

  RETURN QUERY SELECT v_match_id, v_confidence, v_notes;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-accept pending result if enabled
CREATE OR REPLACE FUNCTION auto_accept_pending_result(p_pending_result_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_pending_result pending_match_results%ROWTYPE;
  v_tournament tournaments%ROWTYPE;
  v_match matches%ROWTYPE;
  v_watch_code_record match_watch_codes%ROWTYPE;
BEGIN
  -- Get the pending result
  SELECT * INTO v_pending_result
  FROM pending_match_results
  WHERE id = p_pending_result_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Get tournament settings
  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = v_pending_result.tournament_id;

  -- Check if auto-accept is enabled
  IF NOT v_tournament.dartconnect_auto_accept_scores THEN
    RETURN FALSE;
  END IF;

  -- Check if match-specific auto-accept is enabled
  IF v_pending_result.match_id IS NOT NULL THEN
    SELECT * INTO v_watch_code_record
    FROM match_watch_codes
    WHERE match_id = v_pending_result.match_id
    LIMIT 1;

    IF FOUND AND NOT v_watch_code_record.auto_accept_enabled THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Only auto-accept if confidence is high
  IF v_pending_result.confidence_score < 0.90 THEN
    RETURN FALSE;
  END IF;

  -- Only auto-accept if match was found
  IF NOT v_pending_result.match_found OR v_pending_result.match_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update the match with the scores
  UPDATE matches
  SET 
    player1_legs = v_pending_result.player1_legs,
    player2_legs = v_pending_result.player2_legs,
    winner_id = (
      CASE 
        WHEN v_pending_result.player1_legs > v_pending_result.player2_legs THEN player1_id
        WHEN v_pending_result.player2_legs > v_pending_result.player1_legs THEN player2_id
        ELSE NULL
      END
    ),
    status = 'completed',
    completed_at = v_pending_result.match_completed_at
  WHERE id = v_pending_result.match_id;

  -- Update pending result status
  UPDATE pending_match_results
  SET 
    status = 'auto-accepted',
    processed_at = CURRENT_TIMESTAMP,
    processed_by = 'system'
  WHERE id = p_pending_result_id;

  -- Log the change
  INSERT INTO match_score_history (
    match_id,
    tournament_id,
    change_type,
    new_player1_legs,
    new_player2_legs,
    new_winner_id,
    new_status,
    source,
    pending_result_id,
    changed_by,
    change_reason
  ) VALUES (
    v_pending_result.match_id,
    v_pending_result.tournament_id,
    'dartconnect_auto',
    v_pending_result.player1_legs,
    v_pending_result.player2_legs,
    (SELECT winner_id FROM matches WHERE id = v_pending_result.match_id),
    'completed',
    'auto-accept',
    p_pending_result_id,
    'system',
    'Auto-accepted from DartConnect scraper'
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 9. Comments
-- =====================================================================
COMMENT ON TABLE pending_match_results IS 'Stores match results from DartConnect that need approval before being applied to matches';
COMMENT ON TABLE match_watch_codes IS 'Links scheduled matches to DartConnect watch codes for live scoring';
COMMENT ON TABLE match_score_history IS 'Audit trail of all match score changes';

COMMENT ON COLUMN pending_match_results.confidence_score IS 'How confident we are that this result matches the scheduled match (0.00 to 1.00)';
COMMENT ON COLUMN pending_match_results.status IS 'pending: awaiting approval, approved: accepted by user, rejected: rejected by user, auto-accepted: automatically accepted';

-- =====================================================================
-- Migration Complete
-- =====================================================================
-- To apply this migration:
-- 1. Copy all SQL above
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run
-- 4. Verify all tables and columns were created successfully
