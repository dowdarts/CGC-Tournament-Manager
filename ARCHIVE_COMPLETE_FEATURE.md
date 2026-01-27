# Tournament Archive & Complete Features

## Overview
Added functionality to organize tournaments into Active, Completed, and Archived sections with a three-dot menu for management actions.

## Features Implemented

### 1. Filter Tabs
Three tabs at the top of the dashboard to organize tournaments:
- **Active**: Currently running or in-progress tournaments
- **Completed**: Finished tournaments
- **Archived**: Archived tournaments for long-term storage

### 2. Three-Dot Menu (⋮)
Each tournament card now has a dropdown menu in the top-right corner with context-specific options:

#### Active Tournaments
- **Mark as Complete**: Move tournament to Completed section
- **Archive**: Move tournament to Archived section
- **Delete**: Permanently delete tournament and all data

#### Completed Tournaments
- **Move to Active**: Return tournament to Active section
- **Archive**: Move tournament to Archived section
- **Delete**: Permanently delete tournament and all data

#### Archived Tournaments
- **Restore from Archive**: Return tournament to Active section
- **Delete**: Permanently delete tournament and all data

### 3. Database Changes
Added two new fields to the `tournaments` table:
- `archived` (boolean): Whether tournament is archived
- `completed` (boolean): Whether tournament is marked as complete

### 4. Smart Filtering
- Active: Shows tournaments where `archived = false` AND `completed = false`
- Completed: Shows tournaments where `completed = true` AND `archived = false`
- Archived: Shows tournaments where `archived = true`

## Files Modified

### Frontend
- `frontend/src/pages/Dashboard.tsx`: 
  - Added filter tabs
  - Added three-dot dropdown menu
  - Added archive/complete/restore functions
  - Updated UI to show filtered tournaments

- `frontend/src/types/index.ts`:
  - Added `archived?: boolean` to Tournament interface
  - Added `completed?: boolean` to Tournament interface

### Backend
- `backend/migration_add_archived_completed.sql`: SQL migration to add new fields
- `backend/MIGRATION_ARCHIVED_COMPLETED.md`: Instructions for applying the migration

## Usage

### For Tournament Organizers

1. **Creating a Tournament**: New tournaments appear in the Active tab by default

2. **During Tournament**: Keep in Active tab for easy access

3. **After Tournament Ends**: 
   - Click the three-dot menu (⋮)
   - Select "Mark as Complete"
   - Tournament moves to Completed tab

4. **Long-term Storage**:
   - Click the three-dot menu on a completed tournament
   - Select "Archive"
   - Tournament moves to Archived tab for historical reference

5. **Restore a Tournament**:
   - Go to Archived or Completed tab
   - Click three-dot menu
   - Select "Restore from Archive" or "Move to Active"

6. **Delete a Tournament**:
   - Click three-dot menu on any tournament
   - Select "Delete"
   - Confirm deletion (irreversible)

## Migration Required

**Important**: You must apply the database migration before using these features.

See `backend/MIGRATION_ARCHIVED_COMPLETED.md` for detailed instructions.

Quick steps:
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the SQL from `migration_add_archived_completed.sql`

## Benefits

- **Better Organization**: Separate active, completed, and archived tournaments
- **Cleaner Dashboard**: Hide old tournaments without deleting them
- **Historical Reference**: Keep archived tournaments for future reference
- **Flexible Management**: Easy to restore or permanently delete
- **No Data Loss**: Archive instead of delete to preserve tournament history
