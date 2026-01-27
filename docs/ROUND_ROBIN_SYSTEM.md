# Round-Robin Tournament Scheduling System

This document explains the balanced round-robin scheduling implementation used in the CGC Tournament Manager.

## Overview

The system ensures fair and balanced tournament play through:
1. Balanced group distribution
2. Fair board rotation
3. Proper bye handling for odd-numbered groups

## 1. Group Distribution Logic

### Rule: Maximum 1 Player Difference
No group should have more than 1 player more than any other group.

### Algorithm: Snake/Deal Distribution
```
Base Group Size = Total Players ÷ Total Groups (integer division)
Remainder = Total Players % Total Groups
```

**Example:** 23 players, 4 groups
- 23 ÷ 4 = 5 (base size)
- 23 % 4 = 3 (remainder)
- Result: **3 groups of 6 players, 1 group of 5 players**

### Implementation
```typescript
function calculateGroupDistribution(totalPlayers: number, totalGroups: number) {
  const baseSize = Math.floor(totalPlayers / totalGroups);
  const remainder = totalPlayers % totalGroups;
  
  // First 'remainder' groups get baseSize + 1
  // Remaining groups get baseSize
}
```

## 2. Round-Robin Scheduling

### Circle Method (Fixed Player Rotation)
- **Fix Player 1** in position
- **Rotate all other players clockwise** each round
- Ensures every player faces every other player exactly once

### Board Rotation Formula
```
Board Assignment = (match_index + round_number) mod Total_Boards + 1
```

This ensures:
- Even the "fixed" player moves boards
- All players play on all boards approximately equally
- No player gets "stuck" on one board

### Example: 6 Players, 2 Boards

| Round | Board 1 | Board 2 | Board 1 | Board 2 | Board 1 |
|-------|---------|---------|---------|---------|---------|
| **1** | P1 vs P6 | P2 vs P5 | P3 vs P4 | - | - |
| **2** | P1 vs P5 | P6 vs P4 | P2 vs P3 | - | - |
| **3** | P1 vs P4 | P5 vs P3 | P6 vs P2 | - | - |
| **4** | P1 vs P3 | P4 vs P2 | P5 vs P6 | - | - |
| **5** | P1 vs P2 | P3 vs P6 | P4 vs P5 | - | - |

## 3. Odd-Numbered Groups (Bye Logic)

### Normalization
When a group has an odd number of players, add a virtual "BYE" player to make it even.

### Bye Rotation
- One player sits out each round (has the bye)
- The bye rotates so **each player sits out exactly once**
- The sitting player's match is skipped

### Specific 5-Player Example
For a 5-player group where **Player 4 should have the bye in the final round**:

| Round | Board 1 | Board 2 | Bye (Sitting Out) |
|-------|---------|---------|-------------------|
| 1 | P2 vs P5 | P3 vs P4 | **P1** |
| 2 | P1 vs P3 | P4 vs P5 | **P2** |
| 3 | P5 vs P1 | P2 vs P4 | **P3** |
| 4 | P3 vs P2 | P1 vs P4 | **P5** |
| 5 | P5 vs P3 | P1 vs P2 | **P4** ✓ |

### Implementation
```typescript
function generateRoundRobin(players, totalBoards, specificByePlayer?) {
  // Add BYE if odd number
  if (players.length % 2 === 1) {
    if (specificByePlayer) {
      // Rotate array to position specific player for final bye
      rotateToEnd(specificByePlayer);
    }
    players.push('BYE');
  }
  
  // Generate matches with Circle Method
  // Skip matches where either player is 'BYE'
}
```

## 4. Board Parity

### Even Distribution Guarantee
Using the formula `(i + r) mod B + 1`, where:
- `i` = match index (0, 1, 2, ...)
- `r` = round number (0, 1, 2, ...)
- `B` = total boards

**Result:** Every player plays on every available board approximately equally.

### Board Rotation Example (4 Rounds, 2 Boards)

Match 0 boards: Board 1 → Board 2 → Board 1 → Board 2  
Match 1 boards: Board 2 → Board 1 → Board 2 → Board 1  
Match 2 boards: Board 1 → Board 2 → Board 1 → Board 2

## 5. Validation Rules

### Group Size Validation
```typescript
function validateGroupDistribution(groupSizes: number[]): boolean {
  const max = Math.max(...groupSizes);
  const min = Math.min(...groupSizes);
  return (max - min) <= 1; // Must differ by at most 1
}
```

### Match Count Validation
For `n` players in round-robin:
- **Total matches** = `n × (n - 1) / 2`
- **Matches per round** = `n / 2` (or `(n-1) / 2` for odd groups)
- **Total rounds** = `n - 1`

**Example:** 6 players
- Total matches: 6 × 5 / 2 = **15 matches**
- Matches per round: 6 / 2 = **3 matches/round**
- Total rounds: 6 - 1 = **5 rounds**

## 6. Implementation Files

- **`frontend/src/utils/roundRobin.ts`** - Core scheduling algorithms
- **`frontend/src/pages/RegistrationList.tsx`** - Group generation UI
- **`backend/migration_add_workflow_and_scoring.sql`** - Database schema

## 7. Usage Flow

1. **Setup Info** → Configure tournament details and scoring
2. **Participants** → Add and confirm player list
3. **Group Configuration** → Set number of groups
4. **Shuffle Players** → Randomize for fairness
5. **Generate Groups** → Distribute players using balanced algorithm
6. **Generate Group Stage** → Create round-robin matches with board rotation

## 8. Key Benefits

✅ **Fair Distribution:** No group exceeds another by more than 1 player  
✅ **Board Rotation:** All players experience all boards equally  
✅ **Bye Fairness:** In odd groups, every player sits out exactly once  
✅ **Deterministic:** Same inputs produce same schedule (without shuffle)  
✅ **Scalable:** Works for 2-32+ players per group  
✅ **Team Support:** Handles doubles tournaments with team entities

## 9. Mathematical Proofs

### Proof: All Players Meet Exactly Once
The Circle Method with n players generates n-1 rounds. In each round:
- Fixed player (P1) faces one rotating opponent
- Other players form pairs based on rotation

Total unique pairings = n × (n-1) / 2 = matches generated ✓

### Proof: Fair Board Distribution
For B boards and R rounds:
- Each match rotates: Board = (i + r) mod B + 1
- Over R rounds, match i uses boards: i, i+1, i+2, ..., i+R-1 (mod B)
- Since R = n-1 and typically n > B, each match cycles through all boards

Result: Approximately equal board usage across all players ✓

## 10. Future Enhancements

- **Board count customization** (currently fixed at 2)
- **Swiss system** for larger tournaments
- **Seeding** to separate strong players
- **Constraint satisfaction** for specific player/time requirements
- **Multi-stage tournaments** (group → knockout)
