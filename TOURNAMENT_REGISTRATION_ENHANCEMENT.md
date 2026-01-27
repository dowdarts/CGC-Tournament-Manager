# Tournament Registration Enhancement

## Overview
Enhanced the tournament setup and public registration portal to require and display comprehensive tournament information including registration price, registration close time, host information, and player counts.

## Changes Made

### 1. Database Migration
**File:** `backend/migration_add_registration_fields.sql`

Added two new columns to the `tournaments` table:
- `registration_price` (DECIMAL): Entry fee for the tournament
- `registration_close_time` (TIMESTAMP): When registration closes

**To Apply Migration:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `backend/migration_add_registration_fields.sql`
4. Click "Run" to execute the migration

### 2. TypeScript Types
**File:** `frontend/src/types/index.ts`

Updated the `Tournament` interface to include:
- `registration_price?: number` - Entry fee in dollars
- `registration_close_time?: string` - ISO datetime string for when registration closes
- `user_id?: string` - Tournament host/owner (for displaying host name)

### 3. Tournament Setup Form
**File:** `frontend/src/pages/BasicInfo.tsx`

Enhanced the tournament setup form with new required fields:
- **Registration Price ($)** - Number input with 2 decimal places
- **Registration Close Time** - Datetime-local input for precise registration deadline
- **Location/Venue** - Now required (was optional)

All new fields are required when creating or editing tournaments. The form now:
- Validates registration price (minimum 0, step 0.01)
- Stores registration close time in ISO format
- Converts price string to number before saving

### 4. Tournament Info Banner Component
**File:** `frontend/src/components/TournamentInfoBanner.tsx`

Created a new, beautiful info banner that displays:
- **Tournament Name** (large heading)
- **Host Name** (fetched from user_profiles via user_id)
- **Date** (formatted as "Wednesday, January 15, 2025")
- **Start Time** (formatted as "7:00 PM")
- **Venue** (tournament location)
- **Entry Fee** (if registration_price is set)
- **Players** (X checked in / Y registered)
- **Registration Closes** (highlighted in red for visibility)

Features:
- Responsive grid layout (adapts to screen size)
- Icon-based UI with lucide-react icons
- Professional gradient background
- Glassmorphism card design
- Automatic date/time formatting

### 5. Public Registration Portal
**File:** `frontend/src/pages/PublicRegister.tsx`

Enhanced the registration portal to:
- Fetch tournament host's display name from `user_profiles` table
- Load all players to calculate checked-in vs registered counts
- Display the comprehensive `TournamentInfoBanner` above the registration form
- Show all tournament details before users register

## User Experience Flow

### Tournament Organizer (Dashboard)
1. Create new tournament or edit existing
2. Fill in required fields:
   - Tournament Name
   - Date
   - Start Time
   - Registration Price ($)
   - Registration Close Time
   - Location/Venue
   - Format & Game Type
3. Enable "Public Registration Portal"
4. Save and share the registration link

### Players (Registration Portal)
1. Navigate to tournament registration URL
2. See comprehensive tournament information banner:
   - Who's hosting
   - When and where
   - How much it costs
   - How many have registered/checked in
   - When registration closes
3. Fill out registration form below
4. Submit to register

## Visual Design

The TournamentInfoBanner features:
- **Dark gradient background** (#1e293b to #334155)
- **Card-based info blocks** with icons
- **Color-coded urgency** (registration close time in red)
- **Professional typography** with proper hierarchy
- **Responsive grid** (auto-fit, minmax(250px, 1fr))
- **Glassmorphism effects** with transparency and borders

## Next Steps

1. **Run the database migration** in Supabase SQL Editor
2. **Test creating a new tournament** with all required fields
3. **Test the registration portal** by navigating to the public URL
4. **Optional:** Set default prices or close times based on your use case

## Important Notes

- Old tournaments without these fields will still work (fields are nullable)
- Location is now required for better UX on registration portal
- The `paid` field on players is used to determine "checked in" status
- Host name falls back to organization name if display_name is not set
- Registration close time should be set after start time (no validation yet)

## Files Changed

1. `backend/migration_add_registration_fields.sql` (NEW)
2. `frontend/src/types/index.ts` (UPDATED)
3. `frontend/src/pages/BasicInfo.tsx` (UPDATED)
4. `frontend/src/components/TournamentInfoBanner.tsx` (NEW)
5. `frontend/src/pages/PublicRegister.tsx` (UPDATED)
