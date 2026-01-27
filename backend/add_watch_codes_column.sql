-- Add dartconnect_watch_codes column to tournaments table
-- This allows storing up to 4 active DCTV watch codes

ALTER TABLE tournaments
ADD COLUMN IF NOT EXISTS dartconnect_watch_codes TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add comment for documentation
COMMENT ON COLUMN tournaments.dartconnect_watch_codes IS 'Array of active DartConnect TV watch codes (up to 4) for simultaneous match tracking';
