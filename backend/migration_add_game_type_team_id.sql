-- Migration to add game_type to tournaments and team_id to players

-- Add game_type column to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS game_type TEXT CHECK (game_type IN ('singles', 'doubles'));

-- Set default value for existing records
UPDATE tournaments 
SET game_type = 'singles' 
WHERE game_type IS NULL;

-- Add team_id column to players (for linking doubles partners)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Create index on team_id for faster team lookups
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- Add comment
COMMENT ON COLUMN tournaments.game_type IS 'Singles or doubles tournament - affects registration portal';
COMMENT ON COLUMN players.team_id IS 'UUID linking doubles partners together as a team';
