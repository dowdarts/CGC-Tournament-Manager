-- Migration: Add user authentication and Row Level Security (RLS)
-- This migration adds user authentication support and implements RLS for user isolation

-- Add user_id column to tournaments table to associate tournaments with users
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on tournaments table
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to see only their own tournaments
DROP POLICY IF EXISTS "Users can only see their own tournaments" ON public.tournaments;
CREATE POLICY "Users can only see their own tournaments" ON public.tournaments
    FOR ALL USING (auth.uid() = user_id);

-- Add user_id column to players table (optional - for user-specific player management)
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on players table
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own players
DROP POLICY IF EXISTS "Users can only see their own players" ON public.players;
CREATE POLICY "Users can only see their own players" ON public.players
    FOR ALL USING (auth.uid() = user_id);

-- Add user_id column to matches table (for match ownership)
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own matches
DROP POLICY IF EXISTS "Users can only see their own matches" ON public.matches;
CREATE POLICY "Users can only see their own matches" ON public.matches
    FOR ALL USING (auth.uid() = user_id);

-- Add user_id column to groups table (for group ownership)
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own groups
DROP POLICY IF EXISTS "Users can only see their own groups" ON public.groups;
CREATE POLICY "Users can only see their own groups" ON public.groups
    FOR ALL USING (auth.uid() = user_id);

-- Add user_id column to standings table (for standings ownership) - only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standings') THEN
        ALTER TABLE public.standings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        ALTER TABLE public.standings ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can only see their own standings" ON public.standings;
        CREATE POLICY "Users can only see their own standings" ON public.standings
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add user_id column to scraper_sessions table (for session ownership) - only if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_sessions') THEN
        ALTER TABLE public.scraper_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        ALTER TABLE public.scraper_sessions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can only see their own scraper sessions" ON public.scraper_sessions;
        CREATE POLICY "Users can only see their own scraper sessions" ON public.scraper_sessions
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function to automatically set user_id on insert for tournaments
CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to automatically set user_id on insert - only for tables that exist
DO $$
BEGIN
    -- Always create triggers for core tables
    DROP TRIGGER IF EXISTS set_tournaments_user_id ON public.tournaments;
    CREATE TRIGGER set_tournaments_user_id 
        BEFORE INSERT ON public.tournaments 
        FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

    DROP TRIGGER IF EXISTS set_players_user_id ON public.players;
    CREATE TRIGGER set_players_user_id 
        BEFORE INSERT ON public.players 
        FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

    DROP TRIGGER IF EXISTS set_matches_user_id ON public.matches;
    CREATE TRIGGER set_matches_user_id 
        BEFORE INSERT ON public.matches 
        FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

    DROP TRIGGER IF EXISTS set_groups_user_id ON public.groups;
    CREATE TRIGGER set_groups_user_id 
        BEFORE INSERT ON public.groups 
        FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

    -- Optional triggers for tables that may not exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'standings') THEN
        DROP TRIGGER IF EXISTS set_standings_user_id ON public.standings;
        CREATE TRIGGER set_standings_user_id 
            BEFORE INSERT ON public.standings 
            FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_sessions') THEN
        DROP TRIGGER IF EXISTS set_scraper_sessions_user_id ON public.scraper_sessions;
        CREATE TRIGGER set_scraper_sessions_user_id 
            BEFORE INSERT ON public.scraper_sessions 
            FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();
    END IF;
END $$;

-- Create a user profile table to store additional user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    organization TEXT,
    phone TEXT,
    profile_image_url TEXT,
    branding_logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to see only their own profile
DROP POLICY IF EXISTS "Users can only see their own profile" ON public.user_profiles;
CREATE POLICY "Users can only see their own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile when user signs up
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Note: This migration will isolate all tournament data by user.
-- Existing data will not be visible until manually assigned to users.
-- You may need to run a data migration script to assign existing tournaments to users.