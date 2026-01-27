-- Migration: Add archived and completed fields to tournaments table
-- Purpose: Support archiving and marking tournaments as complete

-- Add archived field
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;

-- Add completed field
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;

-- Add indexes for filtering
CREATE INDEX IF NOT EXISTS idx_tournaments_archived ON tournaments(archived);
CREATE INDEX IF NOT EXISTS idx_tournaments_completed ON tournaments(completed);

-- Add comment
COMMENT ON COLUMN tournaments.archived IS 'Whether the tournament is archived';
COMMENT ON COLUMN tournaments.completed IS 'Whether the tournament is marked as completed';
