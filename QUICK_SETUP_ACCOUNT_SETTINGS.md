# Quick Setup Guide for Account Settings

## Step 1: Apply Database Migration

**Go to Supabase Dashboard → SQL Editor → New Query**

Copy and paste this migration:

```sql
-- Minimal User Authentication Migration
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS on tournaments table
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

-- Create policy for tournaments
DROP POLICY IF EXISTS "Users can only see their own tournaments" ON public.tournaments;
CREATE POLICY "Users can only see their own tournaments" ON public.tournaments
    FOR ALL USING (auth.uid() = user_id);

-- Function to set user_id automatically
CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

DROP POLICY IF EXISTS "Users can only see their own profile" ON public.user_profiles;
CREATE POLICY "Users can only see their own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id);

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.tournaments TO authenticated;
```

**Click "Run" to execute the migration.**

## Step 2: Create Storage Bucket

**Go to Supabase Dashboard → Storage → Create a new bucket**

1. **Bucket name:** `user-assets`
2. **Public bucket:** ✅ **Check this box** (for profile images and branding logos)
3. **File size limit:** 5MB (optional)
4. **Allowed MIME types:** `image/*` (optional)
5. Click **"Create bucket"**

## Step 3: Set Storage Policies (Optional but Recommended)

**Go to Storage → user-assets bucket → Policies → New Policy**

**Policy 1: Allow authenticated users to upload**
- Policy name: `Allow authenticated uploads`
- Operation: `INSERT` 
- Target: `authenticated`
- Policy definition: `auth.uid()::text = (storage.foldername(name))[1]`

**Policy 2: Allow public read access**
- Policy name: `Allow public read`
- Operation: `SELECT`
- Target: `public`
- Policy definition: `true`

## Step 4: Test Account Settings

1. **Refresh your application**
2. **Sign in with a user account**
3. **Go to Settings via hamburger menu**
4. **Click on "Account Settings" tab**
5. **Test profile editing, image uploads**

## Expected Result

✅ Account settings should load without errors
✅ Profile editing should work
✅ Image uploads should work
✅ Password changes should work

## If You Still See Errors

Check browser console for specific error messages and verify:
- Migration was applied successfully
- user-assets bucket was created
- Bucket is marked as public
- User is authenticated properly