# Knockout Bracket Generation Flow

## Overview
This document explains how the knockout bracket generation and display system works in the CGC Tournament Manager.

## Complete Workflow

### 1. Group Stage Setup
Users configure the knockout stage settings in the Group Stage tab:

```
Group Stage Tab → "Setup Knockout Stage" Section
├── Match Format Selection (Best of 3, 5, 7, 9, 11)
├── Advancement Count per Group (1-8 players)
└── "Generate Knockout Bracket" Button
```

### 2. Bracket Generation Process

When the user clicks "Generate Knockout Bracket":

#### Step 1: Collect Advancing Players
```typescript
const advancingPlayersByGroup: { [groupLetter: string]: Player[] } = {};

groupMatchData.forEach(groupData => {
  const advancingCount = advancementCounts[groupData.groupId] || 2;
  const advancingPlayers = groupData.standings
    .slice(0, advancingCount)
    .map(standing => standing.player);
  
  advancingPlayersByGroup[groupData.groupLetter] = advancingPlayers;
});
```

#### Step 2: Generate First Round Matches
```typescript
const firstRoundMatches = generateKnockoutBracket(advancingPlayersByGroup);
```

Uses standardized seeding:
- Crossover pairing (1 vs last, 2 vs second-to-last)
- 64-position seeding map for balanced bracket
- Proper opponent assignment across groups

#### Step 3: Create Complete Bracket Structure
```typescript
const fullBracket = generateFullBracketStructure(firstRoundMatches, totalPlayers);
```

Generates all rounds:
- **First Round**: Filled with player matchups
- **Subsequent Rounds**: Empty matches (filled as tournament progresses)
- **Round Names**: Automatically determined (Round of 64 → Round of 32 → Round of 16 → Quarter-Final → Semi-Final → Final)
- **Bracket Positions**: Sequential numbering for brackets-viewer.js

#### Step 4: Save to localStorage
```typescript
// Save bracket data
localStorage.setItem('knockoutBracket', JSON.stringify(fullBracket));
localStorage.setItem('knockoutBracketTimestamp', Date.now().toString());

// Save tournament metadata
const tournamentInfo = {
  id: tournamentId,
  name: tournamentId,
  totalPlayers,
  advancingPlayers: firstRoundMatches.length * 2,
  format: knockoutMatchFormat,
  generatedAt: new Date().toISOString()
};
localStorage.setItem('currentTournament', JSON.stringify(tournamentInfo));

// Notify KnockoutBracket component
window.dispatchEvent(new Event('knockoutBracketUpdated'));
```

### 3. Knockout Bracket Display

When the user navigates to the Knockout Bracket tab:

#### Step 1: Load Data
```typescript
useEffect(() => {
  const savedKnockout = localStorage.getItem('knockoutBracket');
  const savedTournament = localStorage.getItem('currentTournament');
  
  if (savedKnockout) {
    const matches = JSON.parse(savedKnockout);
    setKnockoutMatches(matches);
    extractParticipants(matches);
  }
  
  if (savedTournament) {
    setTournamentData(JSON.parse(savedTournament));
  }
}, []);
```

#### Step 2: Extract Participants
```typescript
const extractParticipants = (matches: KnockoutMatch[]) => {
  const uniquePlayers = new Map<string, Player>();
  
  matches.forEach(match => {
    if (match.player1) uniquePlayers.set(match.player1.id, match.player1);
    if (match.player2) uniquePlayers.set(match.player2.id, match.player2);
  });
  
  setParticipants(Array.from(uniquePlayers.values()));
};
```

#### Step 3: Convert to Brackets-Viewer Format
```typescript
const convertToBracketFormat = (matches: KnockoutMatch[]): BracketData => {
  // Group matches by round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) acc[match.round] = [];
    acc[match.round].push(match);
    return acc;
  }, {} as Record<string, KnockoutMatch[]>);

  // Create rounds array
  const rounds = Object.keys(matchesByRound).map((roundName, index) => ({
    id: index + 1,
    number: index + 1,
    stage_id: 1,
    group_id: 1
  }));

  // Create matches array with brackets-viewer format
  const bracketMatches = matches.map((match, index) => ({
    id: index + 1,
    number: match.match,
    stage_id: 1,
    group_id: 1,
    round_id: rounds.find(r => matchesByRound[match.round]?.includes(match))?.id || 1,
    status: match.completed ? 4 : 2,
    opponent1: match.player1 ? {
      id: participants.findIndex(p => p.id === match.player1?.id) + 1,
      position: match.bracket_position * 2 - 1,
      score: match.player1Score,
      result: match.winner?.id === match.player1.id ? 'win' : 'loss'
    } : null,
    opponent2: match.player2 ? {
      id: participants.findIndex(p => p.id === match.player2?.id) + 1,
      position: match.bracket_position * 2,
      score: match.player2Score,
      result: match.winner?.id === match.player2.id ? 'win' : 'loss'
    } : null
  }));

  return { stages, groups, rounds, matches: bracketMatches, participants: bracketParticipants };
};
```

#### Step 4: Initialize Brackets-Viewer
```typescript
const initializeBracket = () => {
  if (!bracketRef.current || participants.length === 0) return;

  const bracketData = convertToBracketFormat(knockoutMatches);
  
  renderBracket({
    stages: bracketData.stages,
    matches: bracketData.matches,
    matchGames: bracketData.match_games,
    participants: bracketData.participants
  }, {
    selector: bracketRef.current,
    participantOriginPlacement: 'before',
    separatorWidth: 40,
    roundHeader: {
      display: true
    }
  });

  setBracketInitialized(true);
};
```

### 4. Real-Time Updates

The system supports automatic refreshing when:

#### Tab Visibility Change
```typescript
const handleVisibilityChange = () => {
  if (!document.hidden) {
    console.log('🔄 Tab visible, refreshing knockout bracket...');
    setBracketInitialized(false);
    loadKnockoutData();
  }
};

document.addEventListener('visibilitychange', handleVisibilityChange);
```

#### Custom Event from Group Stage
```typescript
const handleBracketUpdate = () => {
  console.log('🔄 Received bracket update event');
  setBracketInitialized(false);
  loadKnockoutData();
};

window.addEventListener('knockoutBracketUpdated', handleBracketUpdate);
```

#### Manual Refresh Button
```typescript
const handleRefresh = () => {
  setBracketInitialized(false);
  setKnockoutMatches([]);
  setParticipants([]);
  
  setTimeout(() => {
    const savedKnockout = localStorage.getItem('knockoutBracket');
    if (savedKnockout) {
      const matches = JSON.parse(savedKnockout);
      setKnockoutMatches(matches);
      extractParticipants(matches);
    }
    initializeBracket();
  }, 100);
};
```

## Data Structures

### KnockoutMatch Interface
```typescript
interface KnockoutMatch {
  player1: Player | null;
  player2: Player | null;
  player1Score?: number;
  player2Score?: number;
  round: string;              // "Quarter-Final", "Semi-Final", "Final", etc.
  match: number;              // Match number within round (1, 2, 3...)
  overallSeed1?: number;      // Overall tournament seed (1-64)
  overallSeed2?: number;
  completed?: boolean;        // Match completion status
  winner?: Player | null;     // Winner of the match
  bracket_position: number;   // Position in bracket tree (1, 2, 3...)
}
```

### Player Interface
```typescript
interface Player {
  id: string;
  name: string;
  groupLetter?: string;       // "A", "B", "C", etc.
  groupRank?: number;         // Rank within group (1, 2, 3...)
}
```

### BracketData Interface (brackets-viewer.js)
```typescript
interface BracketData {
  stages: Array<{
    id: number;
    tournament_id: number;
    name: string;
    type: 'single_elimination' | 'double_elimination';
    number: number;
    settings: {
      size?: number;
      seedOrdering?: string[];
      grandFinal?: string;
    };
  }>;
  groups: Array<{
    id: number;
    stage_id: number;
    number: number;
  }>;
  rounds: Array<{
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
  }>;
  matches: Match[];
  match_games: MatchGame[];
  participants: Participant[];
}
```

## LocalStorage Keys

### `knockoutBracket`
- **Type**: `JSON.stringify(KnockoutMatch[])`
- **Purpose**: Complete bracket data with all rounds and matches
- **Updated**: When "Generate Knockout Bracket" is clicked

### `knockoutBracketTimestamp`
- **Type**: `string` (timestamp)
- **Purpose**: Track when bracket was last generated
- **Updated**: When "Generate Knockout Bracket" is clicked

### `currentTournament`
- **Type**: `JSON.stringify(TournamentInfo)`
- **Purpose**: Metadata about current tournament
- **Content**:
  ```typescript
  {
    id: string;
    name: string;
    totalPlayers: number;
    advancingPlayers: number;
    format: string;           // "Best of 3", "Best of 5", etc.
    generatedAt: string;      // ISO timestamp
  }
  ```

## User Journey

1. **Complete Group Stage**
   - User runs all group matches
   - Standings are calculated automatically

2. **Setup Knockout Stage**
   - Navigate to Group Stage tab
   - Click "Setup Knockout Stage"
   - Select match format (Best of 3, 5, 7, etc.)
   - Configure advancement count per group (1-8 players)

3. **Generate Bracket**
   - Click "Generate Knockout Bracket"
   - System collects top N players from each group
   - Creates first-round matchups with crossover pairing
   - Generates complete bracket structure (all rounds)
   - Saves to localStorage
   - Shows success alert

4. **View Bracket**
   - Navigate to Knockout Bracket tab
   - Professional tournament tree displays automatically
   - Uses brackets-viewer.js library
   - Dark theme matching tournament software aesthetics
   - Shows all rounds: Quarter-Final → Semi-Final → Final

5. **Update Results** (Future)
   - Click on matches to update scores
   - Winners automatically advance to next round
   - Bracket updates in real-time

## Technical Details

### Seeding Algorithm
- Uses standardized 64-position seeding map
- Ensures balanced bracket (1 vs 64, 2 vs 63, etc.)
- Crossover pairing across groups (Group A #1 vs Group D #2, etc.)
- Prevents same-group rematches in early rounds

### Round Naming
Automatically determined based on bracket size:
- 64+ players: Round of 64 → Round of 32 → Round of 16 → Quarter-Final → Semi-Final → Final
- 32 players: Round of 32 → Round of 16 → Quarter-Final → Semi-Final → Final
- 16 players: Round of 16 → Quarter-Final → Semi-Final → Final
- 8 players: Quarter-Final → Semi-Final → Final
- 4 players: Semi-Final → Final
- 2 players: Final

### Brackets-Viewer Integration
- **Library**: brackets-viewer.js v1.9.0
- **Rendering**: SVG-based tournament tree
- **Theme**: Custom CSS variables for dark mode
- **Responsive**: Adapts to screen size (mobile/tablet/desktop)
- **Features**: Winner highlighting, connector lines, participant names

## Troubleshooting

### Bracket Not Showing
1. Check browser console for errors
2. Verify localStorage has `knockoutBracket` key
3. Click "Refresh" button in Knockout Bracket tab
4. Re-generate bracket from Group Stage tab

### Wrong Players in Bracket
1. Verify group standings are correct
2. Check advancement counts are set properly
3. Re-generate bracket after fixing group results

### Bracket Layout Issues
1. Clear browser cache
2. Check CSS variables in index.css
3. Verify brackets-viewer.js is loaded (check Network tab)
4. Try different browser zoom level

## Future Enhancements

1. **Database Persistence**
   - Save knockout bracket to Supabase
   - Enable multi-device access
   - Support bracket history

2. **Real-Time Updates**
   - Update bracket as matches complete
   - WebSocket integration for live updates
   - Automatic winner advancement

3. **Interactive Scoring**
   - Click matches to enter scores
   - Automatic winner calculation
   - Match completion tracking

4. **Print/Export**
   - PDF export of bracket
   - PNG/SVG export for sharing
   - Printable bracket layout

5. **Advanced Features**
   - Double elimination brackets
   - Consolation brackets
   - Custom bracket templates
   - Manual bracket editing

## Related Files

- `frontend/src/pages/GroupStage.tsx` - Bracket generation logic
- `frontend/src/pages/KnockoutBracket.tsx` - Bracket display component
- `frontend/src/styles/index.css` - Brackets-viewer styling
- `BRACKETS_VIEWER_INTEGRATION.md` - Brackets-viewer.js documentation
- `package.json` - Library dependencies (brackets-viewer, brackets-manager, brackets-model)

## Support

For issues or questions:
1. Check this documentation
2. Review `BRACKETS_VIEWER_INTEGRATION.md`
3. Check browser console for error messages
4. Verify localStorage data integrity
