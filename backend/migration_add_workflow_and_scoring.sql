-- Migration: Add workflow tracking and scoring configuration to tournaments table
-- Date: 2026-01-15
-- Purpose: Enable step-by-step tournament setup workflow and comprehensive scoring configuration

-- Add workflow tracking columns
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS setup_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS participants_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS groups_generated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS group_stage_created BOOLEAN DEFAULT FALSE;

-- Add scoring system configuration column
ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS scoring_system JSONB DEFAULT '{
  "primary_metric": "match_wins",
  "match_format": "matchplay",
  "legs_per_match": 11,
  "points_for_win": 2,
  "points_for_draw": 1,
  "points_for_loss": 0,
  "tiebreak_order": ["leg_difference", "head_to_head", "legs_won", "legs_lost", "match_wins"]
}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN tournaments.setup_completed IS 'True when basic info and scoring configuration are completed';
COMMENT ON COLUMN tournaments.participants_confirmed IS 'True when participant list is confirmed and ready for group generation';
COMMENT ON COLUMN tournaments.groups_generated IS 'True when groups have been created and assigned';
COMMENT ON COLUMN tournaments.group_stage_created IS 'True when group stage matches have been generated';
COMMENT ON COLUMN tournaments.scoring_system IS 'JSON configuration for tournament scoring: primary_metric (match_wins|leg_wins|tournament_points), match_format (matchplay|set_play), legs/sets configuration, points system, and tiebreaker order';

-- Create matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  round_number INTEGER,
  match_number INTEGER,
  board_number INTEGER,
  
  -- Players/Teams
  player1_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES players(id) ON DELETE SET NULL,
  team1_id UUID,
  team2_id UUID,
  
  -- Scores
  player1_legs INTEGER DEFAULT 0,
  player2_legs INTEGER DEFAULT 0,
  player1_sets INTEGER DEFAULT 0,
  player2_sets INTEGER DEFAULT 0,
  player1_points INTEGER DEFAULT 0,
  player2_points INTEGER DEFAULT 0,
  
  -- Match state
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
  winner_id UUID,
  
  -- Timestamps
  scheduled_time TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_group ON matches(group_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_board ON matches(board_number);

-- Add comments for matches table
COMMENT ON TABLE matches IS 'Individual matches in tournament group stage or knockout rounds';
COMMENT ON COLUMN matches.round_number IS 'Round number (1 for group stage, increments for knockout)';
COMMENT ON COLUMN matches.match_number IS 'Sequential match number within round';
COMMENT ON COLUMN matches.board_number IS 'Physical board/location assigned for match';
COMMENT ON COLUMN matches.team1_id IS 'For doubles tournaments, UUID linking to team';
COMMENT ON COLUMN matches.team2_id IS 'For doubles tournaments, UUID linking to team';
