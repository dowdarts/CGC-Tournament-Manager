-- Enable Standings Display for Tournaments
-- Run this in Supabase SQL Editor to make tournaments visible on the public standings page

-- First, let's see which tournaments exist
SELECT id, name, show_standings_on_display, updated_at
FROM tournaments
ORDER BY updated_at DESC;

-- Enable standings display for ALL tournaments
-- Uncomment the line below to enable for all tournaments:
-- UPDATE tournaments SET show_standings_on_display = true;

-- OR enable for specific tournaments by name
-- UPDATE tournaments SET show_standings_on_display = true WHERE name = 'Your Tournament Name';

-- OR enable for a specific tournament by ID
-- UPDATE tournaments SET show_standings_on_display = true WHERE id = 'your-tournament-id';

-- IMPORTANT: The standings display also requires tournaments to have been updated
-- in the last hour. To "refresh" a tournament's timestamp, you can run:
-- UPDATE tournaments SET updated_at = NOW() WHERE id = 'your-tournament-id';

-- Example: Enable for the most recent tournament
UPDATE tournaments 
SET show_standings_on_display = true, updated_at = NOW()
WHERE id = (
  SELECT id FROM tournaments ORDER BY created_at DESC LIMIT 1
);

-- Verify the changes
SELECT id, name, show_standings_on_display, 
       updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at))/3600 as hours_since_update
FROM tournaments
WHERE show_standings_on_display = true
ORDER BY updated_at DESC;
