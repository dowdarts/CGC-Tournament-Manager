## URGENT: Migration Not Applied

The `user_profiles` table and `user-assets` bucket still don't exist in your Supabase project.

**IMMEDIATE ACTION NEEDED:**

### Option 1: Manual Database Setup (Fastest)

1. **Go to Supabase Dashboard → Database → Tables**
2. **Click "Create a new table"**
3. **Table name:** `user_profiles`
4. **Add these columns:**
   - `id` (uuid, primary key, foreign key to auth.users)
   - `email` (text)  
   - `display_name` (text)
   - `organization` (text)
   - `phone` (text)
   - `profile_image_url` (text)
   - `branding_logo_url` (text)
   - `created_at` (timestamptz, default now())
   - `updated_at` (timestamptz, default now())

5. **Enable RLS on the table**
6. **Add policy:** "Allow users to manage their own profile" (All operations, `auth.uid() = id`)

### Option 2: SQL Editor (Copy-Paste)

1. **Go to Supabase Dashboard → SQL Editor**
2. **Copy and paste EXACTLY this:**

```sql
CREATE TABLE public.user_profiles (
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

CREATE POLICY "Users can manage their own profile" ON public.user_profiles
    FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT ALL ON public.user_profiles TO authenticated;
```

3. **Click "Run"**

### Step 3: Create Storage Bucket

1. **Go to Storage → Create new bucket**
2. **Name:** `user-assets`  
3. **Public:** ✅ Check this
4. **Click "Create"**

### Test
- Refresh your app
- Go to Settings → Account Settings
- Errors should be GONE!

**The 406/400 errors will persist until you complete these steps.**