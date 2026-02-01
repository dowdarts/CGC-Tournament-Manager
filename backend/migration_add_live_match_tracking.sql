-- Migration: Add Live Match Tracking
-- Description: Track matches in progress with real-time score updates
-- Date: 2026-01-27

-- =====================================================================
-- 1. Add 'live' status to pending_match_results
-- =====================================================================

-- Modify the status CHECK constraint to include 'live'
ALTER TABLE pending_match_results 
DROP CONSTRAINT IF EXISTS pending_match_results_status_check;

ALTER TABLE pending_match_results
ADD CONSTRAINT pending_match_results_status_check 
CHECK (status IN ('live', 'pending', 'approved', 'rejected', 'auto-accepted'));

-- Add live match tracking columns
ALTER TABLE pending_match_results
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS match_started_at TIMESTAMP;

-- =====================================================================
-- 2. Create index for live matches
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_pending_results_live ON pending_match_results(is_live, tournament_id) 
WHERE is_live = TRUE;

CREATE INDEX IF NOT EXISTS idx_pending_results_live_updated ON pending_match_results(live_updated_at DESC) 
WHERE is_live = TRUE;

-- =====================================================================
-- 3. Comments
-- =====================================================================

COMMENT ON COLUMN pending_match_results.is_live IS 'True if match is currently in progress and being updated in real-time';
COMMENT ON COLUMN pending_match_results.live_updated_at IS 'Last time live scores were updated by scraper';
COMMENT ON COLUMN pending_match_results.match_started_at IS 'When the match started (first score update)';

-- =====================================================================
-- Migration Complete
-- =====================================================================

SELECT 'Live match tracking migration completed successfully!' as status;
