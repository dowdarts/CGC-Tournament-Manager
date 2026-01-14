# Self-Service Registration Portal - Implementation Summary

## What Was Built

A complete self-service registration system that allows players to register themselves at the tournament registration desk using a tablet.

## Features Implemented

### 1. Registration Portal Page (`/register/:id`)

- **Public-facing page** (no admin layout)
- Clean, touch-friendly interface
- Large buttons and inputs optimized for tablets
- Auto-clearing forms after successful registration
- Success confirmations with visual feedback

### 2. Singles Registration

- Player enters name (required)
- Player enters email (optional for match notifications)
- One submission = one player added to tournament

### 3. Doubles Registration

- **Team registration** with two player sections
- Player 1: Name + Email (optional)
- Player 2 (Partner): Name + Email (optional)
- Both players automatically linked with the same `team_id`
- One submission = two players added as a team

### 4. Tournament Setup Integration

- **Game Type selector** on tournament creation form

  - Singles
  - Doubles (Teams of 2)

- **Registration Link Card** showing:

  - Unique registration URL
  - Copy to clipboard button
  - Open in new tab button
  - Visual indicator of game type

### 5. Database Schema Updates

- Added `game_type` column to `tournaments` table

  - Values: `singles` | `doubles`
  - Determines portal behavior

- Added `team_id` column to `players` table

  - UUID linking doubles partners
  - Index for fast team lookups

## Files Created/Modified

### New Components

- `SelfRegistrationForm.tsx` – The registration form component
- `PublicRegister.tsx` – Public portal page

### Modified Components

- `TournamentForm.tsx` – Added game type selector
- `TournamentSetup.tsx` – Added registration link card with copy/open functions
- `App.tsx` – Added public route for `/register/:id`

### Database Files

- `backend/migration_add_game_type_team_id.sql` – Migration script
- `backend/MIGRATION_INSTRUCTIONS.md` – How to run the migration

### Documentation

- `docs/REGISTRATION_PORTAL_GUIDE.md` – Complete user guide

### Type Updates

- `frontend/src/types/index.ts` – Added `game_type` and `team_id` fields

## How It Works

### Flow Diagram

```text
1. Organizer creates tournament
   ↓
2. Selects Singles or Doubles
   ↓
3. Gets shareable registration URL
   ↓
4. Opens URL on tablet at registration desk
   ↓
5. Players register themselves
   ↓
6. Data appears in admin dashboard instantly
```

### Technical Flow

```text
Player Registration
    ↓
SelfRegistrationForm
    ↓
Generate team_id (if doubles)
    ↓
Create player records in Supabase
    ↓
Players appear in Tournament Setup
```

## Next Steps Required

### 1. Run Database Migration

```bash
# Go to Supabase Dashboard → SQL Editor → Run:
# backend/migration_add_game_type_team_id.sql
```

### 2. Test the Portal

1. Create a new tournament
2. Select "Doubles" game type
3. Click "Copy Link" in registration card
4. Open link in new tab
5. Register a test team
6. Verify both players appear in player list with matching `team_id`

### 3. Production Setup

When deploying:

- Build the app: `npm run build`
- Deploy to GitHub Pages or web host
- Registration URL becomes: `https://your-domain.com/register/{tournament-id}`
- Generate QR codes for easy access

## Benefits

### For Tournament Organizers

- ✅ No manual data entry
- ✅ Faster registration process
- ✅ Reduced errors (players enter their own info)
- ✅ Less staff needed at registration desk
- ✅ Real-time visibility of registrations

### For Players

- ✅ Self-service convenience
- ✅ Control over their own data
- ✅ Optional email for notifications
- ✅ Easy team registration for doubles

## Security & Privacy

- Portal is read-only for tournament details
- No authentication required (intentional for ease of access)
- Players cannot view other registrations
- Players cannot edit or delete after submission
- Only organizers have admin access

## Testing Checklist

- [ ] Run migration in Supabase
- [ ] Create singles tournament
- [ ] Test singles registration
- [ ] Create doubles tournament
- [ ] Test doubles team registration
- [ ] Verify `team_id` links partners
- [ ] Test copy link button
- [ ] Test on actual tablet device
- [ ] Verify registration appears in dashboard
- [ ] Test form validation (empty names)

## Known Limitations

1. Players cannot edit their registration (by design)
2. No email confirmation sent (future enhancement)
3. No duplicate name detection (players responsible for accuracy)
4. Internet connection required (offline not supported)

## Future Enhancements

- Email confirmation after registration
- QR code generation for sharing
- Registration count display (public-facing)
- Check-in system when players arrive
- Duplicate name warnings
- Edit/cancel registration within 5 minutes
