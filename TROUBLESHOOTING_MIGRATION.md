# 🔧 Troubleshooting: Database Migration Error

## Error You're Seeing
```
{code: 'PGRST204', details: null, hint: null, message: "Could not find the 'registration_close_time' column of 'tournaments' in the schema cache"}
```

## 🎯 Quick Fix

### Step 1: Apply the Migration
Open Supabase Dashboard → SQL Editor → Paste this:

```sql
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_price DECIMAL(10, 2);

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_close_time TIMESTAMP;
```

Click **RUN** → You should see "Success"

### Step 2: Reload Schema Cache
In the same SQL Editor, run:

```sql
NOTIFY pgrst, 'reload schema';
```

### Step 3: Refresh Your Browser
Press `Ctrl + Shift + R` (hard refresh) to clear cache

---

## 📋 Detailed Steps with Screenshots

### 1. Access Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project: **CGC-Tournament-Manager**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### 2. Paste the Migration SQL
Copy this entire block:

```sql
-- Migration: Add registration fields to tournaments table
-- Description: Adds registration_price and registration_close_time columns

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_price DECIMAL(10, 2);

ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_close_time TIMESTAMP;

COMMENT ON COLUMN tournaments.registration_price IS 'Registration fee in dollars for the tournament';
COMMENT ON COLUMN tournaments.registration_close_time IS 'Timestamp when registration closes for the tournament';

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
```

### 3. Execute the Query
- Click the **RUN** button (or press Ctrl+Enter)
- Wait for "Success. No rows returned" message

### 4. Verify Columns Were Added
Run this verification query:

```sql
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'tournaments'
    AND column_name IN ('registration_price', 'registration_close_time')
ORDER BY 
    column_name;
```

You should see:
```
column_name             | data_type | is_nullable
------------------------|-----------|------------
registration_close_time | timestamp | YES
registration_price      | numeric   | YES
```

---

## 🚀 What Fixed

### ✅ React Router Warnings
- Added `v7_startTransition: true` future flag
- Added `v7_relativeSplatPath: true` future flag
- These warnings are now suppressed

### ✅ Database Schema
Once you apply the migration:
- `registration_price` column added (DECIMAL)
- `registration_close_time` column added (TIMESTAMP)
- Schema cache reloaded

---

## 🔍 Still Not Working?

### Check 1: Verify You're in the Right Project
```sql
SELECT current_database();
```
Should return your project name.

### Check 2: Check Table Exists
```sql
SELECT * FROM tournaments LIMIT 1;
```
Should return data (or empty if no tournaments).

### Check 3: Check User Permissions
```sql
SELECT current_user;
```
Make sure you have ALTER TABLE permissions.

### Check 4: Force Schema Reload
Sometimes PostgREST needs a manual reload:

```sql
-- Method 1: NOTIFY
NOTIFY pgrst, 'reload schema';

-- Method 2: Check PostgREST config
NOTIFY pgrst, 'reload config';
```

Then restart your dev server:
```bash
# Stop the dev server (Ctrl+C in terminal)
cd frontend
npm run dev
```

---

## 💡 Alternative: Temporary Workaround

If you can't apply the migration immediately, you can temporarily make the fields optional:

### File: `frontend/src/pages/BasicInfo.tsx`

Change the inputs from `required` to optional:

```tsx
// Change this:
<input ... required />

// To this:
<input ... />
```

But **this is not recommended** - you should apply the migration properly!

---

## 📞 Need More Help?

### Quick Diagnostic
Run these checks:

1. **Supabase Connection**: Can you see other data in the dashboard?
2. **SQL Editor Access**: Can you run simple queries like `SELECT 1;`?
3. **Table Structure**: Does `SELECT * FROM tournaments;` work?
4. **Browser Console**: Any other errors besides the PGRST204?

### Common Mistakes
- ❌ Running migration on wrong project
- ❌ Not reloading schema cache after DDL
- ❌ Browser cache showing old TypeScript types
- ❌ Multiple instances of dev server running

### Checklist
- [ ] Migration SQL executed successfully
- [ ] Schema cache reloaded (NOTIFY pgrst)
- [ ] Browser hard refresh (Ctrl+Shift+R)
- [ ] Dev server restarted
- [ ] Verification query shows both columns
- [ ] React Router warnings gone

---

## ✨ After Migration Success

You can now:
1. Create new tournaments with registration price and close time
2. Edit existing tournaments to add these fields
3. View beautiful tournament info on registration portal
4. Track player registrations with deadlines

---

**File Created**: `backend/migration_add_registration_fields.sql`  
**Documentation**: `TOURNAMENT_REGISTRATION_ENHANCEMENT.md`  
**Quick Guide**: `QUICKSTART_REGISTRATION.md`
