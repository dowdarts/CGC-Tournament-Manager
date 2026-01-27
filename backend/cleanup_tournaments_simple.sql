-- Clean up tournaments created before user authentication system
-- This provides multiple cleanup options

-- OPTION 1: Complete clean slate (recommended for fresh start)
-- This removes ALL existing tournament data

-- Remove all tournament-related data in correct order (due to foreign keys)
DELETE FROM board_notifications;
DELETE FROM boards;
DELETE FROM matches;
DELETE FROM groups;
DELETE FROM players;
DELETE FROM tournaments;

-- OPTION 2: Remove only tournaments without user_id (use after migration is applied)
-- Uncomment these lines if you want to keep some tournaments that have user associations
-- 
-- DELETE FROM board_notifications WHERE match_id IN (
--     SELECT m.id FROM matches m JOIN tournaments t ON m.tournament_id = t.id WHERE t.user_id IS NULL
-- );
-- DELETE FROM boards WHERE tournament_id IN (
--     SELECT id FROM tournaments WHERE user_id IS NULL
-- );
-- DELETE FROM matches WHERE tournament_id IN (
--     SELECT id FROM tournaments WHERE user_id IS NULL  
-- );
-- DELETE FROM groups WHERE tournament_id IN (
--     SELECT id FROM tournaments WHERE user_id IS NULL
-- );
-- DELETE FROM players WHERE tournament_id IN (
--     SELECT id FROM tournaments WHERE user_id IS NULL
-- );
-- DELETE FROM tournaments WHERE user_id IS NULL;