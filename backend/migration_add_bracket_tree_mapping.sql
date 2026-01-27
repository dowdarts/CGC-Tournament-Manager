-- Migration: Add winner mapping columns for bracket tree structure
-- Date: 2026-01-20
-- Purpose: Track which matches feed winners into subsequent rounds

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS feeds_from_match1_id UUID REFERENCES matches(id),
ADD COLUMN IF NOT EXISTS feeds_from_match2_id UUID REFERENCES matches(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_feeds_from1 ON matches(feeds_from_match1_id);
CREATE INDEX IF NOT EXISTS idx_matches_feeds_from2 ON matches(feeds_from_match2_id);

-- Add comments
COMMENT ON COLUMN matches.feeds_from_match1_id IS 'Match ID whose winner becomes player1 in this match (for bracket tree)';
COMMENT ON COLUMN matches.feeds_from_match2_id IS 'Match ID whose winner becomes player2 in this match (for bracket tree)';

SELECT 'Added winner mapping columns for bracket tree structure' as status;
