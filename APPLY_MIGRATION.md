# Apply Database Migration - INSTRUCTIONS

## Quick Steps to Apply Migration

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project: `pfujbgwgsxuhgvmeatjh`

2. **Open SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy and Paste:**
   - Open the file: `backend/migration_add_workflow_and_scoring.sql`
   - Copy ALL contents
   - Paste into the SQL Editor

4. **Run Migration:**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for success message

5. **Verify:**
   - Refresh your tournament app
   - Try clicking "Next Step" again

## What This Migration Does

Adds to `tournaments` table:
- ✅ `setup_completed` - Tracks if setup is done
- ✅ `participants_confirmed` - Tracks if participants confirmed
- ✅ `groups_generated` - Tracks if groups created
- ✅ `group_stage_created` - Tracks if matches generated
- ✅ `scoring_system` - JSON config for scoring rules

Creates `matches` table:
- Stores all tournament matches
- Tracks scores, boards, rounds
- Links to players and groups

## Direct Link to Your Project

https://supabase.com/dashboard/project/pfujbgwgsxuhgvmeatjh/editor

## After Migration

The app will work correctly with:
- "Next Step" buttons
- Workflow progression
- Tab locking
- Score tracking
