-- Add players_advancing_per_group column to tournaments table
-- This stores the number of players advancing from each group to the knockout bracket

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS players_advancing_per_group INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN tournaments.players_advancing_per_group IS 'Number of players advancing from each group to the knockout bracket. Used by live display to show correct "Advanced" labels.';
