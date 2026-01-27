-- Migration: Create scraper sessions table for DartConnect live streaming
-- This table stores active scraper sessions and their live match data

-- Create scraper_sessions table
CREATE TABLE IF NOT EXISTS scraper_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  watch_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'error')),
  started_at timestamptz DEFAULT now() NOT NULL,
  last_update timestamptz DEFAULT now() NOT NULL,
  last_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_scraper_sessions_watch_code ON scraper_sessions(watch_code);
CREATE INDEX idx_scraper_sessions_status ON scraper_sessions(status);
CREATE INDEX idx_scraper_sessions_last_update ON scraper_sessions(last_update);

-- Enable Row Level Security
ALTER TABLE scraper_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read access for live streaming
CREATE POLICY "Allow public read access to scraper sessions"
ON scraper_sessions FOR SELECT
USING (true);

CREATE POLICY "Allow public insert/update for scraper sessions"
ON scraper_sessions FOR ALL
USING (true);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_scraper_sessions_updated_at
BEFORE UPDATE ON scraper_sessions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for live streaming
ALTER PUBLICATION supabase_realtime ADD TABLE scraper_sessions;

-- Verification query
SELECT 
  schemaname,
  tablename,
  tableowner,
  tablespace,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename = 'scraper_sessions';