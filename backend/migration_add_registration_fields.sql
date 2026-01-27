-- Migration: Add registration fields to tournaments table
-- Description: Adds registration_price and registration_close_time columns for public registration portal

-- Add registration_price column (nullable for backward compatibility)
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_price DECIMAL(10, 2);

-- Add registration_close_time column (nullable for backward compatibility)
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_close_time TIMESTAMP;

-- Add comment to describe the columns
COMMENT ON COLUMN tournaments.registration_price IS 'Registration fee in dollars for the tournament';
COMMENT ON COLUMN tournaments.registration_close_time IS 'Timestamp when registration closes for the tournament';

-- Optional: Set default registration_close_time to 1 hour after start_time for existing tournaments
-- UPDATE tournaments 
-- SET registration_close_time = (date + start_time::time + interval '1 hour')
-- WHERE registration_close_time IS NULL AND start_time IS NOT NULL AND date IS NOT NULL;
