# Dart Tournament Manager - Development Guide

Complete guide for building out the Dart Tournament Manager application.

## Getting Started

### 1. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend (Supabase) Setup

1. Create account at supabase.com
2. Create new project
3. Run SQL from `backend/schema.sql` in SQL Editor
4. Copy project URL and anon key

### 3. Environment Configuration

Create `frontend/.env.local`:
```
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Architecture Overview

### Frontend Architecture

- **Pages**: Route-based page components
- **Components**: Reusable UI components
- **Services**: API clients and external integrations
- **Store**: Zustand for global state management
- **Types**: TypeScript interfaces for type safety

### Database Schema

The application uses PostgreSQL via Supabase with the following main entities:

- `tournaments` - Tournament records
- `players` - Player registrations
- `groups` - Group stage groupings
- `matches` - Individual match records
- `boards` - Physical dartboard mappings
- `board_notifications` - Email tracking

### Real-time Features

Supabase enables real-time updates via WebSockets:

```typescript
// Subscribe to board changes
const subscription = supabase
  .from('boards')
  .on('*', payload => {
    // Update UI in real-time
  })
  .subscribe();
```

## Feature Implementation Guide

### Screen 1: Tournament Setup & Player Entry

**Components needed:**
- TournamentForm - Create/edit tournament settings
- QuickAddPlayer - Fast player entry form
- PlayerList - Table with edit/delete actions
- GroupConfiguration - Define group rules

**Implementation steps:**
1. Create form component for tournament details
2. Build quick-add player form (name + optional email)
3. Create player list table with CRUD operations
4. Implement group configuration panel
5. Wire up to Supabase (TournamentService, PlayerService)

**Key files:**
- `frontend/src/pages/TournamentSetup.tsx`
- `frontend/src/components/TournamentForm.tsx`
- `frontend/src/components/QuickAddPlayer.tsx`
- `frontend/src/components/PlayerList.tsx`

### Screen 2: Group Stage (Round Robin)

**Components needed:**
- GroupSelector - Pick which group to view
- StandingsGrid - Matrix view of matches
- MatchQueue - List of scheduled/completed matches
- LiveMatchIndicator - Current match status

**Implementation steps:**
1. Create standings calculation logic
2. Build matrix/grid view component
3. Create match queue display
4. Implement real-time match updates
5. Add filter/sort options

**Key files:**
- `frontend/src/pages/GroupStage.tsx`
- `frontend/src/components/StandingsGrid.tsx`
- `frontend/src/components/MatchQueue.tsx`

**Data flow:**
```
Tournament selected → Load groups → Load matches
→ Calculate standings → Display matrix
```

### Screen 3: Board Manager (Command Center)

**Components needed:**
- BoardCard - Individual board display
- CurrentMatchInfo - Player names and details
- OnDeckDisplay - Next match queue
- CallMatchButton - Trigger email notification

**Implementation steps:**
1. Create board card layout
2. Build match info display
3. Implement email notification service
4. Create call match action
5. Add notification status indicators

**Key files:**
- `frontend/src/pages/BoardManager.tsx`
- `frontend/src/components/BoardCard.tsx`
- `frontend/src/services/email.ts`

**Email Integration:**
```typescript
// When "Call Match" is clicked:
1. Send email to player1 (if email exists)
2. Send email to player2 (if email exists)
3. Update board status to "in-use"
4. Log notification in board_notifications table
```

### Screen 4: Match Score Input (Scorer UI)

**Components needed:**
- LargeScoreButtons - Leg/Set win buttons
- PlayerInfo - Current players displayed
- CurrentScore - Live score display
- UndoButton - Undo last action
- QuickEntry - Fast input mode

**Implementation steps:**
1. Create large button interface
2. Build score display
3. Implement score state management
4. Add undo functionality
5. Create quick entry system

**Key files:**
- `frontend/src/pages/Scorer.tsx`
- `frontend/src/components/ScoreBoard.tsx`

**Requirements:**
- Very large touch-friendly buttons
- High contrast for visibility
- Minimal text/maximum clarity
- Quick action (no complex navigation)

### Screen 5: Knockout Bracket

**Components needed:**
- BracketTree - Visual bracket layout
- BracketMatch - Individual match node
- SeedIndicators - Show group winners
- ResultsInput - Enter match results

**Implementation steps:**
1. Create bracket data structure
2. Build bracket visualization
3. Auto-populate from group stage results
4. Implement match result entry
5. Handle cascade updates

**Key files:**
- `frontend/src/pages/KnockoutBracket.tsx`
- `frontend/src/components/BracketTree.tsx`

**Algorithm:**
```
Group stage complete → Get top players per group
→ Seed bracket positions → Display visual tree
→ Allow result entry → Update subsequent rounds
```

### Screen 6: Analytics & Leaderboard

**Components needed:**
- PublicLeaderboard - Spectator display view
- PlayerStats - Individual player statistics
- ExportButton - PDF/CSV export
- TournamentSummary - Overall tournament data

**Implementation steps:**
1. Create statistics calculation functions
2. Build leaderboard display
3. Implement export functionality
4. Create spectator view
5. Add filtering/sorting

**Key files:**
- `frontend/src/pages/Analytics.tsx`
- `frontend/src/components/PublicLeaderboard.tsx`

### Screen 7: Admin & Settings

**Components needed:**
- EventConfiguration - Tournament settings
- UserManagement - Access levels
- BackupRestore - Data management
- EmailConfiguration - Email service setup
- BoardLayoutConfig - Physical board setup

**Implementation steps:**
1. Create settings forms
2. Implement configuration persistence
3. Build backup/restore logic
4. Add email service configuration
5. Create board layout editor

**Key files:**
- `frontend/src/pages/Settings.tsx`
- `frontend/src/components/Settings/*`

## State Management Patterns

Using Zustand for global state:

```typescript
// Store hook
const store = useTournamentStore();

// Update tournament
store.updateTournament(updatedTournament);

// Add player
store.addPlayer(newPlayer);

// Update match
store.updateMatch(matchWithNewScore);
```

## API Service Patterns

```typescript
// Simple API call
const players = await PlayerService.getPlayers(tournamentId);

// Create with data
const newPlayer = await PlayerService.addPlayer({
  tournamentId,
  name: 'John Doe',
  email: 'john@example.com'
});

// Update
await PlayerService.updatePlayer(playerId, { paid: true });
```

## Testing Patterns

```bash
# Run tests
npm run test

# Build for production
npm run build

# Preview production build
npm run preview
```

## Common Development Tasks

### Add a New Page

1. Create file: `src/pages/NewPage.tsx`
2. Add route in `App.tsx`
3. Add navigation link in `Layout.tsx`

### Add a New Component

1. Create file: `src/components/NewComponent.tsx`
2. Define TypeScript interface for props
3. Export as default
4. Import and use in page

### Add API Endpoint

1. Add function to `src/services/api.ts`
2. Use in component via service call
3. Update store if needed
4. Handle errors appropriately

### Styling

- Global styles in `App.css`
- Component-specific styles inline or in CSS files
- Tailwind utility classes for rapid development
- Dark theme: `#0f172a` background, `#e2e8f0` text

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Desktop (Electron/Tauri) - Future

```bash
npm run build:electron
# Creates dist/Dart Tournament Manager.exe
```

## Troubleshooting

### Supabase Connection Issues
- Verify `.env.local` has correct URL and key
- Check Supabase project is active
- Run schema.sql to ensure tables exist

### Real-time Updates Not Working
- Check browser console for WebSocket errors
- Verify Supabase real-time is enabled
- Check subscription is active

### Email Notifications Not Sending
- Verify email service is configured
- Check player email field is populated
- Review email service logs in Supabase

## Next Steps

1. Complete TournamentSetup screen
2. Implement GroupStage standings
3. Build BoardManager with email
4. Create Scorer interface
5. Add Knockout bracket
6. Implement Analytics
7. Create Settings panel
8. Test end-to-end
9. Package for Windows
10. Create installer

---

For questions, refer to individual component READMEs or review the plan document.
