-- Add show_standings_on_display column to tournaments table
-- This enables showing group stage standings on live display after "Apply to Standings" is clicked

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS show_standings_on_display BOOLEAN DEFAULT FALSE;

-- Add comment to explain the column
COMMENT ON COLUMN tournaments.show_standings_on_display IS 'Shows group stage standings with advancing player labels on the live display when enabled via "Apply to Standings" button';
