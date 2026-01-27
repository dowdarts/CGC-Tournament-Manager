-- Migration: Add workflow tracking and scoring configuration to tournaments table
-- Date: 2026-01-15
-- Purpose: Enable step-by-step tournament setup workflow and comprehensive scoring configuration

-- Add workflow tracking columns to tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS participants_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS groups_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_stage_created BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_stage_started BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_stage_completed BOOLEAN DEFAULT FALSE;

-- Add scoring system configuration column to tournaments
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS scoring_system JSONB DEFAULT '{
  "primary_metric": "match_wins",
  "roundrobin_format": "matchplay",
  "roundrobin_legs_per_match": 11,
  "knockout_format": "matchplay",
  "knockout_legs_per_match": 11,
  "points_for_win": 2,
  "points_for_draw": 1,
  "points_for_loss": 0,
  "tiebreak_order": ["leg_difference", "head_to_head", "legs_won", "legs_lost", "match_wins"]
}'::jsonb;

-- Add comments for tournaments table
COMMENT ON COLUMN tournaments.setup_completed IS 'True when basic info and scoring configuration are completed';
COMMENT ON COLUMN tournaments.participants_confirmed IS 'True when participant list is confirmed and ready for group generation';
COMMENT ON COLUMN tournaments.groups_generated IS 'True when groups have been created and assigned';
COMMENT ON COLUMN tournaments.group_stage_created IS 'True when group stage matches have been generated';
COMMENT ON COLUMN tournaments.group_stage_started IS 'True when group stage has been started (locks player movement)';
COMMENT ON COLUMN tournaments.group_stage_completed IS 'True when all group stage matches are completed and standings finalized';
COMMENT ON COLUMN tournaments.scoring_system IS 'JSON configuration for tournament scoring: primary_metric (match_wins|leg_wins|tournament_points), roundrobin_format/knockout_format (matchplay|set_play), legs/sets configuration for each stage, points system, and tiebreaker order';

-- Alter existing matches table to add new columns
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS round_number INTEGER,
ADD COLUMN IF NOT EXISTS match_number INTEGER,
ADD COLUMN IF NOT EXISTS board_number INTEGER,
ADD COLUMN IF NOT EXISTS team1_id UUID,
ADD COLUMN IF NOT EXISTS team2_id UUID,
ADD COLUMN IF NOT EXISTS player1_sets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_sets INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Modify existing columns (safe operations only)
ALTER TABLE matches
ALTER COLUMN player1_id DROP NOT NULL,
ALTER COLUMN player2_id DROP NOT NULL;

-- Update status column check constraint (drop old, add new)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;
ALTER TABLE matches ADD CONSTRAINT matches_status_check 
  CHECK (status IN ('pending', 'scheduled', 'in-progress', 'completed'));

-- Add indexes for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round_number);
CREATE INDEX IF NOT EXISTS idx_matches_board ON matches(board_number);

-- Add comments for matches table columns
COMMENT ON COLUMN matches.round_number IS 'Round number (1 for group stage, increments for knockout)';
COMMENT ON COLUMN matches.match_number IS 'Sequential match number within round';
COMMENT ON COLUMN matches.board_number IS 'Physical board/location assigned for match';
COMMENT ON COLUMN matches.team1_id IS 'For doubles tournaments, UUID linking to team';
COMMENT ON COLUMN matches.team2_id IS 'For doubles tournaments, UUID linking to team';
