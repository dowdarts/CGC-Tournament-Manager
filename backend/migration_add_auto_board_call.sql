-- Add auto_board_call_enabled column to tournaments table
-- This enables the automatic board call system feature

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS auto_board_call_enabled BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN tournaments.auto_board_call_enabled IS 'Enables automatic board call system: automatically marks Round 1 matches as in-progress and progressively calls next matches when boards become available';
