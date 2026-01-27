-- Migration: Clean up tournaments created before user authentication
-- This removes tournaments that were created before the user authentication system

BEGIN;

-- First, let's see what we're working with
-- SELECT id, name, created_at, user_id FROM tournaments WHERE user_id IS NULL OR user_id = '';

-- Remove all tournaments that don't have a valid user_id
-- This will clean up any test tournaments or tournaments created before user auth
DELETE FROM tournament_players WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE user_id IS NULL OR user_id = ''
);

DELETE FROM tournament_matches WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE user_id IS NULL OR user_id = ''
);

DELETE FROM tournament_groups WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE user_id IS NULL OR user_id = ''
);

DELETE FROM tournament_settings WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE user_id IS NULL OR user_id = ''
);

-- Delete any other related tournament data
DELETE FROM boards WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE user_id IS NULL OR user_id = ''
);

-- Finally, delete the tournaments themselves
DELETE FROM tournaments WHERE user_id IS NULL OR user_id = '';

-- Alternative: If you want to delete ALL existing tournaments to start fresh:
-- UNCOMMENT the lines below if you want to completely clear all tournaments

-- DELETE FROM tournament_players;
-- DELETE FROM tournament_matches; 
-- DELETE FROM tournament_groups;
-- DELETE FROM tournament_settings;
-- DELETE FROM boards;
-- DELETE FROM tournaments;

-- Reset auto-increment sequences (optional)
-- ALTER SEQUENCE tournaments_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tournament_players_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tournament_matches_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tournament_groups_id_seq RESTART WITH 1;
-- ALTER SEQUENCE boards_id_seq RESTART WITH 1;

COMMIT;