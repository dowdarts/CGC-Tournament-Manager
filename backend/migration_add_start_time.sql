-- Migration: Add start_time field to tournaments table
-- Purpose: Track tournament start time for automatic registration closure

-- Add start_time field (TIME type for time of day)
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS start_time TIME;

-- Add comment
COMMENT ON COLUMN tournaments.start_time IS 'Tournament start time (HH:MM format). Registration closes 1 hour after this time.';

-- Optional: Add index if you'll be querying by start_time frequently
CREATE INDEX IF NOT EXISTS idx_tournaments_start_time ON tournaments(start_time);
