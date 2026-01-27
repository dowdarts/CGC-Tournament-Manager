# Quick Migration Fix - Manual Application

The error indicates that the `standings` table doesn't exist in your database. I've fixed the migration to be more defensive and created a minimal version.

## Option 1: Apply the Minimal Migration (Recommended)

Use the file `backend/migration_minimal_auth.sql` which only modifies core tables:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** 
3. Copy and paste the content from `migration_minimal_auth.sql`
4. Click **Run**

This migration only affects:
- `tournaments` table (adds user_id, RLS, triggers)
- Creates `user_profiles` table
- Sets up basic permissions

## Option 2: Use the Full Migration (Fixed)

The main migration file `migration_add_user_authentication.sql` has been updated to:
- Check if tables exist before modifying them
- Use `DROP POLICY IF EXISTS` to prevent conflicts
- Wrap optional table modifications in conditional blocks

## Test After Migration

After applying either migration:

1. Refresh your app at `http://localhost:5174`
2. Click "Get Started" to test authentication
3. Create a test account
4. Verify the dashboard loads with user header
5. Create a test tournament to confirm user isolation

## If You Still Get Errors

If you encounter other missing table errors:

1. Run this query in Supabase SQL Editor to see your tables:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

2. Let me know which tables exist and I can create a custom migration for your specific schema.

## Current Status

✅ **Frontend authentication is complete and working**
✅ **Professional styling preserved**  
✅ **Migration files fixed for missing tables**
⚠️ **Database migration pending** (manual application required)

Once you apply the migration, the authentication system will be fully functional!