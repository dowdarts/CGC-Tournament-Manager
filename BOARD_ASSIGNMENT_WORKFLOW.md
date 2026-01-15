# Board Assignment Workflow Guide

## Complete Setup Flow

### Phase 1: Player Registration
1. Navigate to **Check-in List**
2. Mark players as "Paid" 
3. Players automatically appear in **Registration List**

### Phase 2: Group Configuration
1. Navigate to **Registration → Group Configuration**
2. Configure number of groups
3. (Optional) Click **"Shuffle Players"** for random seed order
4. Click **"Generate Groups"** to create groups with snake draft

### Phase 3: Board Assignment (NEW!)
**After groups are generated**, a blue **Board Assignment** section appears:

#### Add Boards
1. Enter number of boards to create (e.g., 6)
2. Click **"Add X Board(s)"**
3. Boards are created and displayed in table

#### Assign Boards to Groups
1. For each board, select the assigned group from dropdown
2. See real-time summary: "Group A: 3 boards (4 players)"
3. Click **"Save Board Assignments"**

#### Board Assignment Tips
- **Small groups (2-3 players):** 1 board recommended
- **Medium groups (4-6 players):** 2 boards recommended  
- **Large groups (7+ players):** floor(groupSize / 2) boards recommended
- **If no boards assigned:** System auto-calculates optimal boards per group

### Phase 4: Generate Group Stage
1. Click **"Generate Group Stage"**
2. Configure match format (legs, sets, play style)
3. System creates all matches with:
   - Proper player pairings (Circle Method)
   - Board assignments using balanced rotation
   - Round numbers for scheduling

### Phase 5: View & Score Matches
1. Navigate to **Group Stage** tab
2. Select group and view **"Matches"** tab
3. See matches organized by round with board numbers
4. Click matches to enter scores

## Editing Board Assignments Later

### If you need to adjust boards after group stage creation:
1. Navigate to **Board Manager** page
2. View all boards and current assignments
3. Modify board-to-group assignments
4. Save changes
5. **Note:** Existing matches keep their board assignments; new match generation will use updated assignments

## Visual Flow Diagram

```
Register Players
     ↓
Generate Groups (Snake Draft)
     ↓
[NEW!] Board Assignment Section Appears
     ↓
Add Boards (e.g., 6 boards)
     ↓
Assign Boards to Groups
  - Group A: 3 boards
  - Group B: 3 boards
     ↓
Save Assignments
     ↓
Generate Group Stage
     ↓
Matches Created with Board Rotation
     ↓
View in Group Stage → Matches Tab
```

## Key Features

### Inline Board Management
✅ No need to navigate to separate Board Manager page  
✅ Board creation and assignment in same workflow  
✅ Visual feedback with board counts per group  
✅ Real-time assignment preview

### Intelligent Defaults
✅ If no boards assigned, system calculates optimal boards  
✅ Based on group size and best practices  
✅ Ensures balanced match distribution

### Flexible Workflow
✅ Boards optional - system works without explicit assignment  
✅ Can add/edit boards before generating matches  
✅ Can adjust assignments later via Board Manager  
✅ Assignments saved and persist across sessions

## Board Rotation Formula

The system uses **Balanced Modular Rotation**:
```
Board Number = (matchIndex + round) mod TotalBoards + 1
```

### Benefits:
- Even the "fixed" player rotates through all boards
- No player stuck on same board all rounds
- Fair distribution across available space
- Works for any number of boards (1 to N)

## Example: 4-Player Group with 2 Boards

```
Round 1:
  Board 1: Player 1 vs Player 4
  Board 2: Player 2 vs Player 3

Round 2:
  Board 2: Player 1 vs Player 3  (Player 1 moved!)
  Board 1: Player 4 vs Player 2

Round 3:
  Board 1: Player 1 vs Player 2  (Player 1 on Board 1 again)
  Board 2: Player 3 vs Player 4
```

Every player plays on both boards equally.

## Storage

### Current Implementation
- Board-to-group assignments stored in **localStorage**
- Key: `board-assignments-{tournamentId}`
- Persists across browser sessions
- Loaded automatically when viewing tournament

### Future Enhancement
Could migrate to database table for:
- Multi-device synchronization
- Shared access across users
- Persistent backup
- Audit trail

## Troubleshooting

### "No boards showing after adding"
- Check browser console for errors
- Refresh page to reload data
- Verify tournament ID is correct

### "Board assignments not saved"
- Click "Save Board Assignments" button
- Check for success message (green alert)
- Verify localStorage permissions enabled

### "Matches created without boards"
- System auto-calculates if no assignments
- Check Group Stage → Matches to see board numbers
- Board numbers will be 1, 2, 3... based on optimal calculation

### "Want to change boards after match creation"
- Go to Board Manager page
- Adjust assignments
- Note: Existing matches keep original boards
- New match generation will use new assignments

## Best Practices

1. **Plan Board Layout:** Consider physical space before adding boards
2. **Balance Groups:** Assign similar boards per group for fairness
3. **Save Early:** Save assignments before generating matches
4. **Document Setup:** Note board positions for physical setup
5. **Test First:** Try with small tournament to verify workflow

## Navigation Quick Reference

- **Registration List:** `/tournament/:id/registration`
- **Group Configuration:** Same page, scroll to groups section
- **Board Assignment:** Appears after "Generate Groups"
- **Board Manager:** `/tournament/:id/boards` (for editing later)
- **Group Stage:** `/tournament/:id/groups`

---

**Status:** ✅ Fully Implemented  
**Version:** 1.1  
**Last Updated:** January 15, 2026
