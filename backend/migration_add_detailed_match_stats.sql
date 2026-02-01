-- Migration: Add Detailed Match Statistics to DartConnect Integration
-- Description: Adds comprehensive darts statistics tracking for Tale of the Tape display
-- Date: 2026-01-27

-- =====================================================================
-- 1. Add Detailed Statistics Columns to pending_match_results
-- =====================================================================

-- Player 1 Detailed Statistics
ALTER TABLE pending_match_results
ADD COLUMN IF NOT EXISTS player1_darts_thrown INTEGER,
ADD COLUMN IF NOT EXISTS player1_first_9_average DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS player1_checkout_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_checkouts_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_checkout_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS player1_100_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_120_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_140_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_160_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player1_ton_plus_finishes INTEGER DEFAULT 0;

-- Player 2 Detailed Statistics
ALTER TABLE pending_match_results
ADD COLUMN IF NOT EXISTS player2_darts_thrown INTEGER,
ADD COLUMN IF NOT EXISTS player2_first_9_average DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS player2_checkout_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_checkouts_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_checkout_percentage DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS player2_100_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_120_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_140_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_160_plus INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS player2_ton_plus_finishes INTEGER DEFAULT 0;

-- =====================================================================
-- 2. Comments for New Columns
-- =====================================================================

COMMENT ON COLUMN pending_match_results.player1_darts_thrown IS 'Total darts thrown by player 1 in the match';
COMMENT ON COLUMN pending_match_results.player1_first_9_average IS 'Average of first 9 darts thrown (3 visits)';
COMMENT ON COLUMN pending_match_results.player1_checkout_attempts IS 'Number of checkout opportunities';
COMMENT ON COLUMN pending_match_results.player1_checkouts_completed IS 'Number of successful checkouts';
COMMENT ON COLUMN pending_match_results.player1_checkout_percentage IS 'Checkout success rate as percentage';
COMMENT ON COLUMN pending_match_results.player1_100_plus IS 'Number of scores 100-119';
COMMENT ON COLUMN pending_match_results.player1_120_plus IS 'Number of scores 120-139';
COMMENT ON COLUMN pending_match_results.player1_140_plus IS 'Number of scores 140-159';
COMMENT ON COLUMN pending_match_results.player1_160_plus IS 'Number of scores 160-179';
COMMENT ON COLUMN pending_match_results.player1_ton_plus_finishes IS 'Number of finishes 100 or more';

COMMENT ON COLUMN pending_match_results.player2_darts_thrown IS 'Total darts thrown by player 2 in the match';
COMMENT ON COLUMN pending_match_results.player2_first_9_average IS 'Average of first 9 darts thrown (3 visits)';
COMMENT ON COLUMN pending_match_results.player2_checkout_attempts IS 'Number of checkout opportunities';
COMMENT ON COLUMN pending_match_results.player2_checkouts_completed IS 'Number of successful checkouts';
COMMENT ON COLUMN pending_match_results.player2_checkout_percentage IS 'Checkout success rate as percentage';
COMMENT ON COLUMN pending_match_results.player2_100_plus IS 'Number of scores 100-119';
COMMENT ON COLUMN pending_match_results.player2_120_plus IS 'Number of scores 120-139';
COMMENT ON COLUMN pending_match_results.player2_140_plus IS 'Number of scores 140-159';
COMMENT ON COLUMN pending_match_results.player2_160_plus IS 'Number of scores 160-179';
COMMENT ON COLUMN pending_match_results.player2_ton_plus_finishes IS 'Number of finishes 100 or more';

-- =====================================================================
-- 3. Migration Complete
-- =====================================================================
-- To apply this migration:
-- 1. Copy all SQL above
-- 2. Go to Supabase Dashboard > SQL Editor
-- 3. Paste and run
-- 4. Verify all columns were added successfully

SELECT 'Detailed match statistics migration completed successfully!' as status;
