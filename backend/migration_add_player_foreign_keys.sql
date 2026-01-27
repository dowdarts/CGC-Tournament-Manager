-- Migration: Add foreign key relationships between matches and players
-- Date: 2026-01-20
-- Purpose: Ensure proper relationships exist for PostgREST queries

-- Drop existing foreign keys if they exist (to avoid conflicts)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_player1_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_player2_id_fkey;
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_winner_id_fkey;

-- Add foreign key constraints with explicit names
ALTER TABLE matches
ADD CONSTRAINT matches_player1_id_fkey 
  FOREIGN KEY (player1_id) 
  REFERENCES players(id) 
  ON DELETE CASCADE;

ALTER TABLE matches
ADD CONSTRAINT matches_player2_id_fkey 
  FOREIGN KEY (player2_id) 
  REFERENCES players(id) 
  ON DELETE CASCADE;

ALTER TABLE matches
ADD CONSTRAINT matches_winner_id_fkey 
  FOREIGN KEY (winner_id) 
  REFERENCES players(id) 
  ON DELETE SET NULL;

SELECT 'Added foreign key relationships between matches and players' as status;
