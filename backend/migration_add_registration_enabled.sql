-- Add registration_enabled field to tournaments table

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT false;

-- Set default for existing tournaments
UPDATE tournaments 
SET registration_enabled = false 
WHERE registration_enabled IS NULL;

COMMENT ON COLUMN tournaments.registration_enabled IS 'Whether self-service registration portal is enabled for this tournament';
