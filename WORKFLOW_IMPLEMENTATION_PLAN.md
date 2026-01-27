# Tournament Workflow Implementation Plan

## Overview

Complete step-by-step tournament setup workflow with locked progression.

## Completed

- ✅ Added workflow step tracking to Tournament type (`setup_completed`, `participants_confirmed`, `groups_generated`, `group_stage_created`)
- ✅ Renamed "Basic Info" to "Setup Info" in navigation menu
- ✅ Added scoring configuration to Tournament type

## Remaining Tasks

### 1. Setup Info Page (BasicInfo.tsx → SetupInfo.tsx)

**Status**: In Progress

**Requirements**:

- [ ] Move scoring configuration from Settings.tsx to SetupInfo
- [ ] Add tiebreaker configuration UI
- [ ] Include all scoring options:
  - Primary metric (Match Wins / Leg Wins / Tournament Points)
  - Match format (Matchplay / Set Play)
  - Legs per match/set configuration
  - Points system (Win/Draw/Loss)
  - Tiebreaker order with drag-and-drop
- [ ] Add "Next Step" button that:
  - Saves all configuration
  - Marks `setup_completed = true`
  - Navigates to Participants tab
- [ ] Show completion badge when setup is done

**Files to Modify**:

- `frontend/src/pages/BasicInfo.tsx` (rename to SetupInfo.tsx)
- `frontend/src/App.tsx` (update route)

---

### 2. Participants Page Enhancement

**Status**: Not Started

**Requirements**:

- [ ] Add "Next Step" button at bottom of page
- [ ] Button opens confirmation modal:

  ```text
  "Are you sure?"
  "Double check all checked-in players who have paid are selected  
  and in the registration list before advancing to next step"
  
  [Return to Check List] [Confirm & Continue]
  ```

- [ ] On confirm:
  - Mark `participants_confirmed = true`
  - Navigate to Group Configuration tab
- [ ] Show warning if no paid players
- [ ] Disable button if setup not completed

**Files to Modify**:

- `frontend/src/pages/CheckinList.tsx`

---

### 3. Group Configuration Enhancement

**Status**: Not Started

**Requirements**:

- [ ] Lock access until `participants_confirmed = true`
- [ ] Add "Shuffle Players" button
  - Randomly redistribute players across groups
  - Keep team pairings intact for doubles
- [ ] Add "Generate Groups" button  
  - Show preview of group assignments
  - Display player list for each group
- [ ] Add "Generate Group Stage" button
  - Creates all round-robin matches for each group
  - Marks `groups_generated = true`
  - Navigates to Group Stage tab
- [ ] Show group assignment preview cards:

  ```text
  Group A (4 players)
  - Player 1
  - Player 2
  - Player 3
  - Player 4
  ```

**Files to Modify**:

- `frontend/src/components/GroupConfiguration.tsx`
- `frontend/src/pages/RegistrationList.tsx`

---

### 4. Group Stage Tab

**Status**: Not Started

**Requirements**:

- [ ] Lock access until `groups_generated = true`
- [ ] Display round-robin schedule for each group
- [ ] Show match scoring interface
- [ ] Calculate standings based on scoring rules
- [ ] Apply tiebreakers from configuration
- [ ] Track:
  - Match wins/losses
  - Leg wins/losses
  - Tournament points
  - Leg difference (+/-)

**Files to Modify**:

- `frontend/src/pages/GroupStage.tsx`
- Create `frontend/src/services/scoringService.ts`

---

### 5. Board Manager Integration

**Status**: Not Started

**Requirements**:

- [ ] Lock access until `group_stage_created = true`
- [ ] Allow adding board numbers (1, 2, 3, etc.)
- [ ] Assign groups to specific boards
- [ ] Display matches by board in round-robin schedule
- [ ] Update match assignments when boards change

**Files to Modify**:

- `frontend/src/pages/BoardManager.tsx`

---

### 6. Navigation Lock System

**Status**: Not Started

**Requirements**:

- [ ] Update TournamentLayout to check workflow status
- [ ] Disable/gray out locked tabs
- [ ] Show lock icon (🔒) on inaccessible tabs  
- [ ] Add tooltips explaining requirements:

  ```text
  "Complete Setup Info first"
  "Confirm participants before configuring groups"
  "Generate groups before accessing group stage"
  "Create group stage before managing boards"
  ```

- [ ] Allow going back to previous steps

**Workflow Order**:

1. Setup Info (always accessible)
2. Participants (accessible after setup)
3. Group Configuration (accessible after participants confirmed)
4. Group Stage (accessible after groups generated)
5. Board Manager (accessible after group stage created)
6. Knockout Bracket (accessible after group stage completed)
7. Analytics (always accessible)

**Files to Modify**:

- `frontend/src/components/TournamentLayout.tsx`

---

## Database Schema Updates

### tournaments table

```sql
ALTER TABLE tournaments ADD COLUMN setup_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN participants_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN groups_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN group_stage_created BOOLEAN DEFAULT FALSE;
ALTER TABLE tournaments ADD COLUMN scoring_system JSONB;
```

### matches table (if not exists)

```sql
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  round_number INTEGER,
  board_number INTEGER,
  player1_id UUID REFERENCES players(id),
  player2_id UUID REFERENCES players(id),
  player1_legs INTEGER DEFAULT 0,
  player2_legs INTEGER DEFAULT 0,
  winner_id UUID REFERENCES players(id),
  status TEXT DEFAULT 'pending', -- pending, in_progress, completed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Priority Order

1. **HIGH**: Setup Info page with scoring configuration
2. **HIGH**: Navigation lock system  
3. **MEDIUM**: Participants confirmation flow
4. **MEDIUM**: Group Configuration shuffle/generate
5. **LOW**: Group Stage match creation
6. **LOW**: Board Manager integration

## Testing Checklist

- [ ] Create new tournament with all scoring options
- [ ] Test workflow progression (can't skip steps)
- [ ] Test going back to previous steps
- [ ] Test shuffle maintains team pairings in doubles
- [ ] Test tiebreaker calculations
- [ ] Test scoring systems (match wins, leg wins, points)
- [ ] Test lock/unlock of tabs based on completion

## Notes

- Settings page can be deprecated or repurposed for other configuration
- Keep auto-refresh on Participants page
- Maintain bulk add functionality
- Preserve team grouping for doubles throughout workflow

