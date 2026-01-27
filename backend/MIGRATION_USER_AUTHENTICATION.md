# User Authentication Migration Instructions

This document provides instructions for applying the user authentication migration that adds Row Level Security (RLS) and user isolation to the Tournament Manager application.

## Overview

The migration `migration_add_user_authentication.sql` implements:

1. **User Authentication**: Integration with Supabase Auth
2. **Row Level Security (RLS)**: Users can only access their own data
3. **Automatic User ID Assignment**: Triggers set user_id on insert
4. **User Profiles**: Additional user information storage
5. **Data Isolation**: Complete separation of user tournament data

## Tables Modified

The following tables will have `user_id` columns added and RLS policies applied:

- `tournaments` - Tournament ownership
- `players` - Player data per user  
- `matches` - Match data per user
- `groups` - Group data per user
- `standings` - Standings per user
- `scraper_sessions` - Scraper sessions per user
- `user_profiles` - User profile information (new table)

## Before Migration

⚠️ **IMPORTANT**: This migration will make existing data invisible to all users until manually assigned.

### Backup Existing Data

```sql
-- Backup existing tournaments
CREATE TABLE tournaments_backup AS SELECT * FROM tournaments;

-- Backup existing players  
CREATE TABLE players_backup AS SELECT * FROM players;

-- Backup existing matches
CREATE TABLE matches_backup AS SELECT * FROM matches;
```

### Note Existing Data Count

```sql
SELECT 
    (SELECT COUNT(*) FROM tournaments) as tournament_count,
    (SELECT COUNT(*) FROM players) as player_count,
    (SELECT COUNT(*) FROM matches) as match_count;
```

## Apply Migration

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire `migration_add_user_authentication.sql` content
4. Run the migration

### Using Supabase CLI

```bash
# Navigate to your project directory
cd frontend

# Apply the migration
supabase db reset --linked
# Or push the migration
supabase db push
```

## After Migration

### Verify RLS is Working

```sql
-- This should return empty (no data visible without auth)
SELECT COUNT(*) FROM tournaments;

-- Check RLS policies are in place
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('tournaments', 'players', 'matches');
```

### Assign Existing Data to Test User (Optional)

If you have existing test data and want to assign it to a specific user:

```sql
-- First, create a test user via the Supabase Auth interface
-- Then get the user ID and assign existing data

-- Replace 'YOUR_USER_ID' with actual user ID from auth.users table
UPDATE tournaments SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE players SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE matches SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE groups SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE standings SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
UPDATE scraper_sessions SET user_id = 'YOUR_USER_ID' WHERE user_id IS NULL;
```

## Testing Authentication

### 1. Test Unauthenticated Access

- Open the application
- Verify the landing page shows with "Get Started" button
- Verify no tournament data is accessible

### 2. Test User Registration

- Click "Get Started"
- Click "Create Account"
- Register with a new email
- Check email for verification link
- Verify account and sign in

### 3. Test Data Isolation

- Create a tournament as User A
- Sign out and create User B
- Verify User B cannot see User A's tournaments
- Verify each user sees only their own data

### 4. Test Auto User ID Assignment

```sql
-- As an authenticated user, insert a test tournament
INSERT INTO tournaments (name, description) VALUES ('Test Tournament', 'Test Description');

-- Verify user_id was automatically set
SELECT id, name, user_id FROM tournaments WHERE name = 'Test Tournament';
```

## Rollback (if needed)

If you need to rollback the migration:

```sql
-- Remove RLS policies
DROP POLICY IF EXISTS "Users can only see their own tournaments" ON tournaments;
DROP POLICY IF EXISTS "Users can only see their own players" ON players;
DROP POLICY IF EXISTS "Users can only see their own matches" ON matches;
DROP POLICY IF EXISTS "Users can only see their own groups" ON groups;
DROP POLICY IF EXISTS "Users can only see their own standings" ON standings;
DROP POLICY IF EXISTS "Users can only see their own scraper sessions" ON scraper_sessions;
DROP POLICY IF EXISTS "Users can only see their own profile" ON user_profiles;

-- Disable RLS
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE standings DISABLE ROW LEVEL SECURITY;
ALTER TABLE scraper_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop triggers
DROP TRIGGER IF EXISTS set_tournaments_user_id ON tournaments;
DROP TRIGGER IF EXISTS set_players_user_id ON players;
DROP TRIGGER IF EXISTS set_matches_user_id ON matches;
DROP TRIGGER IF EXISTS set_groups_user_id ON groups;
DROP TRIGGER IF EXISTS set_standings_user_id ON standings;
DROP TRIGGER IF EXISTS set_scraper_sessions_user_id ON scraper_sessions;
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS set_user_id_on_insert();
DROP FUNCTION IF EXISTS create_user_profile();

-- Drop user_profiles table
DROP TABLE IF EXISTS user_profiles;

-- Remove user_id columns (optional)
ALTER TABLE tournaments DROP COLUMN IF EXISTS user_id;
ALTER TABLE players DROP COLUMN IF EXISTS user_id;
ALTER TABLE matches DROP COLUMN IF EXISTS user_id;
ALTER TABLE groups DROP COLUMN IF EXISTS user_id;
ALTER TABLE standings DROP COLUMN IF EXISTS user_id;
ALTER TABLE scraper_sessions DROP COLUMN IF EXISTS user_id;
```

## Production Considerations

1. **Email Configuration**: Ensure Supabase Auth email settings are configured
2. **Domain Configuration**: Add your domain to Supabase Auth settings
3. **Rate Limiting**: Consider implementing rate limiting for auth endpoints
4. **User Cleanup**: Implement user data cleanup procedures if needed
5. **Monitoring**: Monitor auth failures and user creation patterns

## Support

If you encounter issues:

1. Check Supabase Auth logs in dashboard
2. Verify RLS policies are correctly applied
3. Ensure user_id columns exist and triggers are working
4. Test with fresh user accounts
5. Check browser console for auth errors

Remember: After this migration, all tournament data becomes user-specific and isolated!