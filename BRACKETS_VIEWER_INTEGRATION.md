# Brackets-Viewer.js Integration Guide

## Overview

The CGC Tournament Manager now uses [brackets-viewer.js](https://github.com/Drarig29/brackets-viewer.js) - a professional, open-source library for rendering beautiful, scalable tournament brackets.

## Why Brackets-Viewer.js?

### Key Benefits

1. **Professional Visualization**: Automatically renders tournament trees with proper connector lines and spacing
2. **Scalability**: Handles tournaments from 4 to 128+ participants without manual configuration
3. **Interactive**: Built-in support for match updates, score input, and winner advancement
4. **Responsive**: Adapts to different screen sizes automatically
5. **Well-Maintained**: Active open-source project with regular updates

### Features Used

- **Single Elimination Brackets**: Perfect for knockout stages
- **Automatic Seeding**: Handles participant placement based on group standings
- **Match Status Tracking**: Shows completed, in-progress, and upcoming matches
- **Winner Highlighting**: Visual indication of match winners
- **Round Labeling**: Custom round names (Quarter-Finals, Semi-Finals, Final)

## Implementation Details

### Dependencies

```json
{
  "brackets-viewer": "^1.9.0",
  "brackets-model": "^1.6.0",
  "brackets-manager": "^1.8.2"
}
```

### File Structure

```
frontend/src/
├── pages/
│   └── KnockoutBracket.tsx    # Main bracket component
├── styles/
│   └── index.css              # Custom dark theme styling
```

### Key Components

#### 1. Data Conversion

The system converts your tournament data into the brackets-viewer format:

```typescript
interface BracketData {
  stages: Stage[];        // Tournament stages (e.g., "Knockout Stage")
  groups: Group[];        // Match groupings
  rounds: Round[];        // Individual rounds
  matches: Match[];       // All matches with scores
  participants: Participant[];  // All players/teams
}
```

#### 2. Initialization

```typescript
renderBracket(
  {
    stages: bracketData.stages,
    matches: bracketData.matches,
    matchGames: bracketData.match_games,
    participants: bracketData.participants
  },
  {
    selector: containerElement,
    participantOriginPlacement: 'before',
    separatorHeight: 30,
    matchMinWidth: 280,
    roundHeader: {
      size: 60,
      roundTextGenerator: customRoundNames
    }
  }
);
```

## Customization

### Dark Theme Integration

Custom CSS variables in `index.css`:

```css
.brackets-viewer-container {
  --match-border-color: #4b5563;
  --match-bg-color: #374151;
  --match-hover-bg-color: #4b5563;
  --match-winner-bg-color: #10b981;
  --connector-color: #6b7280;
  --primary-text-color: #f3f4f6;
}
```

### Round Names

Customize round labels:

```typescript
roundTextGenerator: (round) => {
  const roundNames = ['Quarter-Finals', 'Semi-Finals', 'Final'];
  return roundNames[round.number - 1] || `Round ${round.number}`;
}
```

### Match Display

- **Completed Matches**: Green background with final scores
- **Active Matches**: Clickable with hover effects
- **Upcoming Matches**: TBD display with participant seeds

## Data Flow

### From Group Stage → Knockout Bracket

1. **Group Stage Completion**
   - Players ranked within groups
   - Overall seeding calculated
   - Matchups determined using crossover system

2. **Bracket Generation**
   - Participants extracted from group standings
   - Matches created with proper seeding
   - Bracket data converted to brackets-viewer format

3. **Visualization**
   - Bracket rendered with connector lines
   - Match cards displayed with scores
   - Winner highlighting applied

### LocalStorage Integration

```typescript
// Save bracket state
localStorage.setItem('knockoutBracket', JSON.stringify(matches));

// Load bracket state
const savedKnockout = localStorage.getItem('knockoutBracket');
const matches = JSON.parse(savedKnockout);
```

## Extending the System

### Adding Double Elimination

```typescript
// Change stage type
stages: [{
  type: 'double_elimination',  // Instead of 'single_elimination'
  settings: {
    grandFinal: 'simple',  // or 'double'
  }
}]
```

### Adding More Rounds

The system automatically scales:
- **4 players**: Semi-Final → Final
- **8 players**: Quarter-Final → Semi-Final → Final
- **16 players**: Round of 16 → QF → SF → Final
- **32 players**: Round of 32 → R16 → QF → SF → Final
- **64 players**: Round of 64 → etc.

### Score Input Integration

Current: Click match → Modal → Input scores → Save

Future enhancement: Direct inline editing via brackets-viewer API

```typescript
// Update match score
const updatedMatch = {
  ...match,
  opponent1: { ...match.opponent1, score: newScore1 },
  opponent2: { ...match.opponent2, score: newScore2 },
  status: 4  // Completed
};
```

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Bracket only initializes when data is ready
2. **Memoization**: Participant list cached to prevent recalculation
3. **Conditional Rendering**: Bracket only shown when matches exist

### Large Tournament Support

The library efficiently handles:
- **64+ participants**: Horizontal scrolling enabled
- **Multiple stages**: Round-robin → Single Elim → Finals
- **Live updates**: Re-render on match completion

## Responsive Design

### Breakpoints

```css
/* Desktop */
@media (max-width: 1024px) {
  .brackets-viewer .match { min-width: 220px; }
}

/* Tablet */
@media (max-width: 768px) {
  .brackets-viewer .match { min-width: 180px; }
}
```

### Mobile Considerations

- Horizontal scrolling for wide brackets
- Touch-friendly match cards
- Compact round headers

## Troubleshooting

### Common Issues

#### Bracket Not Rendering
**Cause**: Missing or invalid data
**Solution**: Check browser console for errors, verify data format

#### Styling Issues
**Cause**: CSS conflicts
**Solution**: Ensure brackets-viewer.css is loaded before custom styles

#### Performance Issues
**Cause**: Too many participants
**Solution**: Implement pagination or collapsible rounds

## Future Enhancements

### Planned Features

1. **Live Scoring**: WebSocket integration for real-time updates
2. **Drag-and-Drop Seeding**: Manual bracket adjustments
3. **PDF Export**: Print-friendly bracket generation
4. **Third-Place Match**: Optional consolation round
5. **Multi-Stage Tournaments**: Combined round-robin + knockout

### API Integration

When connecting to Supabase:

```typescript
// Fetch bracket data
const { data: matches } = await supabase
  .from('matches')
  .select('*')
  .eq('tournament_id', tournamentId)
  .eq('stage', 'knockout');

// Convert and render
const bracketData = convertToBracketFormat(matches, participants);
renderBracket(bracketData, config);
```

## Resources

### Documentation
- [Brackets-Viewer GitHub](https://github.com/Drarig29/brackets-viewer.js)
- [Brackets-Manager API](https://github.com/Drarig29/brackets-manager.js)
- [Brackets-Model Types](https://github.com/Drarig29/brackets-model)

### Examples
- [Interactive Demo](https://drarig29.github.io/brackets-viewer.js/demo/)
- [Configuration Options](https://github.com/Drarig29/brackets-viewer.js#usage)

## Support

For issues related to:
- **Bracket Display**: Check brackets-viewer.js GitHub issues
- **Tournament Logic**: Review tournament.ts store
- **Styling**: See index.css customizations

## Credits

- **Brackets-Viewer.js**: Created by [Drarig29](https://github.com/Drarig29)
- **Integration**: CGC Tournament Manager Team
- **Design**: Custom dark theme for CGCDarts.com

---

**Last Updated**: January 15, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
