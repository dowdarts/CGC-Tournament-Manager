# Board Management & Balanced Round-Robin System

## Overview
The tournament manager now includes a comprehensive board management system with automatic match generation using balanced round-robin scheduling with fair board rotation.

## Key Features Implemented

### 1. Balanced Round-Robin Algorithm
**Location:** `frontend/src/utils/roundRobin.ts`

#### Circle Method
- Fixes Player 1 in position, rotates others clockwise each round
- Ensures every player faces every other player exactly once
- Automatically handles odd-numbered groups with BYE rotation

#### Board Rotation Formula
```
Board Assignment = (matchIndex + round) mod TotalBoards + 1
```

**Benefits:**
- Even the "fixed" player (Player 1) rotates through all boards
- No player gets stuck on the same board
- Fair distribution across all available boards

### 2. Automatic Match Generation
**Location:** `frontend/src/pages/RegistrationList.tsx` (handleFormatConfirm)

When clicking "Generate Group Stage", the system:
1. Loads board assignments from localStorage
2. Calculates optimal board count per group if not manually assigned
3. Generates round-robin matches using balanced rotation
4. Creates all Match records in database with:
   - Round number
   - Board number
   - Player pairings
   - Match format settings

#### Optimal Board Calculation
- **Small groups (2-3 players):** 1 board
- **Medium groups (4-6 players):** 2 boards
- **Large groups (7+ players):** floor(groupSize / 2) boards

### 3. Board Manager Page
**Location:** `frontend/src/pages/BoardManager.tsx`

Features:
- Create boards for the tournament
- Assign boards to specific groups
- View board allocation summary
- See real-time board assignments per group
- Save assignments to localStorage

**Guidelines Displayed:**
- Board assignment recommendations based on group size
- Explanation of balanced board rotation system
- Visual summary of boards per group

### 4. Enhanced Group Stage Display
**Location:** `frontend/src/pages/GroupStage.tsx`

New features:
- **Tab Selection:** Switch between "Standings" and "Matches" per group
- **Standings Tab:**
  - Rank, Participant, Wins, Losses, Ties, Points
  - Match History with W/L boxes (blue for wins, red for losses)
  - "ADVANCED" badges for qualifying players
  
- **Matches Tab:**
  - Round-by-round columnar layout
  - Matches stacked vertically within each round
  - Board numbers displayed on each match card
  - Scores highlighted in orange for winners
  - Interactive scoring via click-to-edit

## 5-Player Group Special Handling

For groups with exactly 5 players (odd number):
- System adds a BYE player to normalize to 6 participants
- **Special Rule:** Player 4 (last player) gets the BYE in Round 5
- Each player sits out exactly once
- Board rotation still applies to all played matches

### Example 5-Player Schedule
```
Round 1: Player 2 vs Player 5 (Board 1), Player 3 vs Player 4 (Board 2), Player 1 BYE
Round 2: Player 1 vs Player 3 (Board 2), Player 4 vs Player 5 (Board 1), Player 2 BYE
Round 3: Player 5 vs Player 1 (Board 1), Player 2 vs Player 4 (Board 2), Player 3 BYE
Round 4: Player 3 vs Player 2 (Board 2), Player 1 vs Player 4 (Board 1), Player 5 BYE
Round 5: Player 5 vs Player 3 (Board 1), Player 1 vs Player 2 (Board 2), Player 4 BYE
```

## Board Fairness Rules

### Group Size Distribution
- Groups must differ by at most 1 player
- Validated via `validateGroupDistribution()`

### Even Groups (4, 6, 8 players)
- No BYEs required
- All boards rotate every round using `(i + r) mod B + 1`

### Odd Groups (3, 5, 7 players)
- 1 BYE per round
- BYE rotates so each player sits out exactly once
- Board rotation applies to all non-BYE matches

## Technical Implementation Details

### Database Schema
- **boards table:** id, tournament_id, board_number, status
- **matches table:** includes `board_number` field for assignment
- **groups table:** stores player_ids array

### Board Assignment Flow
1. Admin creates boards via Board Manager
2. Admin assigns boards to groups (stored in localStorage)
3. When generating matches, system:
   - Loads board assignments
   - Calculates boards per group
   - Passes to `generateGroupStageMatches(groups, boardsPerGroup)`
4. Each match gets `board_number` based on rotation formula

### Storage Strategy
**Current:** Board-to-group assignments stored in localStorage
```javascript
localStorage.setItem(`board-assignments-${tournamentId}`, JSON.stringify(assignments));
```

**Future Enhancement:** Could migrate to database table `group_boards` for persistence across devices

## User Workflow

### Setup Phase
1. Create tournament
2. Register players
3. Configure groups
4. **NEW:** Go to Board Manager
5. **NEW:** Add boards (e.g., "Add 6 boards")
6. **NEW:** Assign boards to groups (e.g., Group A: 3 boards, Group B: 3 boards)
7. **NEW:** Save assignments

### Match Generation Phase
1. Click "Generate Group Stage" button
2. System auto-generates all round-robin matches with:
   - Proper player pairings (Circle Method)
   - Balanced board rotation
   - Correct round numbers
3. Navigate to Group Stage view

### Competition Phase
1. View "Matches" tab to see which matches on which boards
2. Click matches to enter scores
3. View "Standings" tab to see rankings and match history
4. Advancing players automatically marked

## Code References

### Key Functions
```typescript
// Round-robin match generation
generateRoundRobin(players, playerIds, totalBoards, specificByePlayer)

// Group stage with board allocation
generateGroupStageMatches(groups, boardsPerGroup)

// Board rotation formula (in generateRoundRobin)
const board = ((matchIndex + round) % boards) + 1;
```

### API Services
```typescript
BoardService.createBoards(tournamentId, count)
BoardService.getBoards(tournamentId)
BoardService.updateBoard(boardId, updates)
```

## Benefits of This System

✅ **Fair Play:** Every player faces every other player once  
✅ **Fair Boards:** Players rotate through all boards equally  
✅ **Scalable:** Works for any group size (2+ players)  
✅ **Automatic:** No manual scheduling required  
✅ **Flexible:** Supports custom board allocation per group  
✅ **Visual:** Clear display of boards, rounds, and matches  
✅ **Persistent:** Board assignments saved and loaded automatically

## Testing the System

### Test Case 1: 5-Player Group with 2 Boards
1. Create 5 players
2. Create 1 group with all 5 players
3. Assign 2 boards to the group
4. Generate matches
5. **Expected:** 10 matches over 5 rounds, Player 4 has BYE in Round 5
6. **Board distribution:** Each match alternates boards based on (i+r) mod 2 + 1

### Test Case 2: Multiple Groups with Different Board Counts
1. Create 12 players
2. Create 3 groups (4 players each)
3. Assign Group A: 1 board, Group B: 2 boards, Group C: 2 boards
4. Generate matches
5. **Expected:** 
   - Group A: 6 matches, all on Board 1
   - Group B: 6 matches, rotating between 2 boards
   - Group C: 6 matches, rotating between 2 boards

## Future Enhancements

- [ ] Migrate board assignments to database for multi-device support
- [ ] Add board deletion functionality
- [ ] Real-time board status updates (in-use, available, break)
- [ ] Board call notifications system
- [ ] Automatic board optimization suggestions
- [ ] Board usage analytics and statistics

## Navigation

- **Board Manager:** `/tournament/:id/boards`
- **Group Stage:** `/tournament/:id/groups`
- **Registration:** `/tournament/:id/registration`

---

**Last Updated:** January 15, 2026  
**Version:** 1.0  
**Status:** ✅ Complete and Tested
