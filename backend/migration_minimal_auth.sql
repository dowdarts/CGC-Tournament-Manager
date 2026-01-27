-- Minimal User Authentication Migration
-- This migration adds basic user authentication support for core tables only

-- Add user_id column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on tournaments table
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Create policy for tournaments
DROP POLICY IF EXISTS "Users can only see their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can select their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can insert tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can update their own tournaments" ON public.tournaments;

-- Allow users to select their own tournaments
CREATE POLICY "Users can select their own tournaments" ON public.tournaments
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert tournaments (user_id will be set by trigger)
CREATE POLICY "Users can insert tournaments" ON public.tournaments
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Allow users to update their own tournaments
CREATE POLICY "Users can update their own tournaments" ON public.tournaments
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to set user_id automatically
CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user profile creation/updates
CREATE OR REPLACE FUNCTION handle_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user profile if it doesn't exist
    INSERT INTO public.user_profiles (id, email, display_name, created_at, updated_at)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email), NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = NEW.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic user profile creation
DROP TRIGGER IF EXISTS create_user_profile ON auth.users;
CREATE TRIGGER create_user_profile
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_user_profile();

-- Trigger for tournaments
DROP TRIGGER IF EXISTS set_tournaments_user_id ON public.tournaments;
CREATE TRIGGER set_tournaments_user_id 
    BEFORE INSERT ON public.tournaments 
    FOR EACH ROW EXECUTE FUNCTION set_user_id_on_insert();

-- User profiles table
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

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Separate policies for different operations on user_profiles
DROP POLICY IF EXISTS "Users can only see their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can select their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Allow users to select their own profile
CREATE POLICY "Users can select their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile  
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.tournaments TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;