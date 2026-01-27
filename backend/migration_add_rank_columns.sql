-- Migration: Add ranking columns to matches table for bracket seeding display
-- Date: 2026-01-20
-- Purpose: Store group and rank information for knockout bracket display

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS p1_group INTEGER,
ADD COLUMN IF NOT EXISTS p1_rank INTEGER,
ADD COLUMN IF NOT EXISTS p2_group INTEGER,
ADD COLUMN IF NOT EXISTS p2_rank INTEGER;

-- Add comments
COMMENT ON COLUMN matches.p1_group IS 'Player 1 group index (for knockout bracket display)';
COMMENT ON COLUMN matches.p1_rank IS 'Player 1 rank within group (for knockout bracket display)';
COMMENT ON COLUMN matches.p2_group IS 'Player 2 group index (for knockout bracket display)';
COMMENT ON COLUMN matches.p2_rank IS 'Player 2 rank within group (for knockout bracket display)';

SELECT 'Added ranking columns to matches table' as status;
