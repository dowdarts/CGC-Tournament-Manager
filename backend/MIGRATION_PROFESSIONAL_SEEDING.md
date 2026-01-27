# DartConnect Professional Knockout Bracket System

## Overview

This migration implements the **DartConnect/WDF (World Darts Federation) professional seeding algorithm** for knockout brackets. The system ensures proper separation of players from the same group and uses mirror seeding to create fair, professional-grade tournament brackets.

---

## Migration Steps

### Step 1: Remove Old Bracket Functions

First, remove the old bracket generation functions from your Supabase database.

**⚠️ IMPORTANT:** This will delete existing bracket functions. Any TypeScript code calling these functions will need to be updated.

```sql
-- Run this in Supabase SQL Editor
-- File: migration_remove_old_bracket_functions.sql

DROP FUNCTION IF EXISTS generate_bracket_seed_order(integer) CASCADE;
DROP FUNCTION IF EXISTS create_two_group_crossover_seeding(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS create_four_group_crossover_seeding(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_professional_bracket_matches(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS setup_tournament_bracket(uuid, text) CASCADE;
```

### Step 2: Apply New DartConnect System

Run the complete new migration file in your Supabase SQL Editor:

**File:** `migration_dartconnect_professional_seeding.sql`

This creates 7 new functions:
1. `get_dynamic_standings` - Calculates group rankings with custom scoring
2. `get_seed_order` - Generates mirror seed order (1 vs N, 2 vs N-1...)
3. `map_groups_to_seeds` - Maps group finishers to bracket seeds
4. `get_crossover_group` - Calculates crossover opponents
5. `get_opponent_rank` - Determines opponent rank pairing
6. `generate_bracket_matches` - Creates theoretical matchups
7. `promote_to_knockout` - **Main function** - Promotes players to knockout
8. `setup_knockout_bracket` - Quick setup for common formats

---

## How It Works

### The Mirror Seeding Formula

In professional darts tournaments, the bracket uses **Mirror Seeding**:

```
Opponent = (N + 1) - Seed
```

For an 8-player bracket:
- Seed 1 plays Seed 8
- Seed 2 plays Seed 7
- Seed 3 plays Seed 6
- Seed 4 plays Seed 5

### Group Crossover Logic

The system prevents players from the same group meeting until the latest possible round.

#### Example: 4 Groups, 2 Advancing Each (8-player bracket)

| Match | Player 1 | Player 2 |
|-------|----------|----------|
| 1     | Winner Group A | 2nd Place Group D |
| 2     | Winner Group B | 2nd Place Group C |
| 3     | Winner Group C | 2nd Place Group B |
| 4     | Winner Group D | 2nd Place Group A |

**Result:** Group A's winner and runner-up are in opposite halves of the bracket!

---

## Usage Guide

### Basic Usage (Recommended)

Use the quick setup function for standard formats:

```sql
-- For 4 groups with 2 advancing each (8-player knockout)
SELECT setup_knockout_bracket('your-tournament-uuid', '4_groups_2_advance');

-- For 8 groups with 4 advancing each (32-player knockout)
SELECT setup_knockout_bracket('your-tournament-uuid', '8_groups_4_advance');
```

**Available Formats:**
- `2_groups_4_advance` (8 players)
- `2_groups_8_advance` (16 players)
- `4_groups_2_advance` (8 players)
- `4_groups_4_advance` (16 players)
- `8_groups_2_advance` (16 players)
- `8_groups_4_advance` (32 players)
- `16_groups_4_advance` (64 players)

### Advanced Usage (Custom Scoring)

For tournaments with custom point systems:

```sql
-- League format: 5 points for win, 2 for draw, 0 for loss
SELECT promote_to_knockout(
  'your-tournament-uuid', 
  8,          -- Number of groups
  4,          -- Players advancing per group
  'points',   -- Ranking method: 'matches', 'points', or 'legs'
  5,          -- Points for a win
  2,          -- Points for a draw
  0           -- Points for a loss
);
```

### View Standings Before Promotion

Check how players will be ranked:

```sql
-- Standard match-wins ranking
SELECT * FROM get_dynamic_standings('your-tournament-uuid', 'matches', 3, 1, 0);

-- Custom points system
SELECT * FROM get_dynamic_standings('your-tournament-uuid', 'points', 5, 2, 0);

-- Pure leg-based ranking (aggressive style)
SELECT * FROM get_dynamic_standings('your-tournament-uuid', 'legs', 3, 1, 0);
```

### Preview Bracket Matchups (Without Creating Matches)

```sql
-- See theoretical matchups before committing
SELECT * FROM generate_bracket_matches('your-tournament-uuid', 4, 2);
```

Output:
```
match_index | p1_group | p1_rank | p2_group | p2_rank
------------|----------|---------|----------|--------
0           | 0        | 1       | 3        | 2
1           | 1        | 1       | 2        | 2
2           | 2        | 1       | 1        | 2
3           | 3        | 1       | 0        | 2
```

Translation:
- Match 1: Winner Group A vs 2nd Place Group D
- Match 2: Winner Group B vs 2nd Place Group C
- Match 3: Winner Group C vs 2nd Place Group B
- Match 4: Winner Group D vs 2nd Place Group A

---

## TypeScript Integration

### Update Your Frontend Code

Replace old bracket generation calls with the new system:

```typescript
// OLD (Remove this)
const { data, error } = await supabase.rpc('generate_professional_bracket_matches', {
  tournament_id_param: tournamentId,
  num_groups: 4,
  advancing_per_group: 2
});

// NEW (Use this)
const { data, error } = await supabase.rpc('setup_knockout_bracket', {
  tournament_id: tournamentId,
  format_name: '4_groups_2_advance'
});

// Or with custom scoring
const { data, error } = await supabase.rpc('promote_to_knockout', {
  tournament_id: tournamentId,
  num_groups: 4,
  advance_count: 2,
  sort_method: 'points',
  win_points: 5,
  draw_points: 2,
  loss_points: 0
});
```

### Example React Component Update

```typescript
const startKnockoutStage = async () => {
  setLoading(true);
  
  try {
    // Determine format based on tournament config
    const format = `${tournament.num_groups}_groups_${tournament.advancing_per_group}_advance`;
    
    // Generate knockout bracket
    const { data: matchesCreated, error } = await supabase.rpc('setup_knockout_bracket', {
      tournament_id: tournament.id,
      format_name: format
    });
    
    if (error) throw error;
    
    console.log(`✅ Created ${matchesCreated} knockout matches`);
    
    // Update tournament status
    await supabase
      .from('tournaments')
      .update({ status: 'knockout' })
      .eq('id', tournament.id);
    
    // Navigate to bracket view
    navigate(`/tournament/${tournament.id}/bracket`);
    
  } catch (error) {
    console.error('❌ Error generating bracket:', error);
  } finally {
    setLoading(false);
  }
};
```

---

## Tie-Breaking Rules

The system uses professional darts tie-breaking hierarchy:

1. **Matches Won** (or Points, if using points system)
2. **Leg Difference** (+/- legs for/against)
3. **Total Legs Won** (aggressive play tiebreaker)

### Example Standings

| Rank | Player | Wins | Leg Diff | Legs For |
|------|--------|------|----------|----------|
| 1    | Player A | 3 | +12 | 25 |
| 2    | Player B | 3 | +8  | 22 |
| 3    | Player C | 2 | +4  | 18 |
| 4    | Player D | 0 | -24 | 5  |

Players A and B are tied on wins, but Player A has better leg difference.

---

## Database Schema Requirements

Ensure your `matches` table has these columns:

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL,
  group_id UUID,              -- NULL for knockout matches
  group_index INT,            -- Group number (0-based)
  p1_id UUID NOT NULL,
  p2_id UUID NOT NULL,
  p1_legs INT DEFAULT 0,
  p2_legs INT DEFAULT 0,
  p1_label TEXT,              -- e.g., "A1" (Group A, Rank 1)
  p2_label TEXT,              -- e.g., "D2" (Group D, Rank 2)
  round_number INT DEFAULT 1,
  match_number INT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Benefits of the New System

✅ **Professional Standard:** Matches DartConnect/WDF tournament software
✅ **Scalable:** Works for 4 to 128 players
✅ **Flexible Scoring:** Supports match wins, points systems, or leg-based ranking
✅ **Automatic Crossover:** Prevents same-group rematches until finals
✅ **Tie-Breaking:** Uses official darts tie-break hierarchy
✅ **Database-Driven:** All logic in PostgreSQL for performance and reliability

---

## Testing the Migration

After applying the migration, test with a sample tournament:

```sql
-- 1. Create test tournament (use your actual tournament UUID)
-- 2. Generate some group stage results
-- 3. Test bracket generation
SELECT setup_knockout_bracket('test-tournament-uuid', '4_groups_2_advance');

-- 4. Verify matches were created
SELECT 
  match_number,
  p1_label,
  p2_label,
  round_number
FROM matches
WHERE tournament_id = 'test-tournament-uuid'
AND group_id IS NULL
ORDER BY match_number;
```

Expected output:
```
match_number | p1_label | p2_label | round_number
-------------|----------|----------|-------------
1            | A1       | D2       | 1
2            | B1       | C2       | 1
3            | C1       | B2       | 1
4            | D1       | A2       | 1
```

---

## Troubleshooting

### Issue: Function not found

**Solution:** Ensure you ran the migration in the correct order (remove old functions first).

### Issue: No matches created

**Solution:** Check that:
1. Group stage matches exist and are marked `status = 'completed'`
2. Players have `group_id` and `group_index` set in the matches table
3. At least `advancing_per_group` players exist per group

### Issue: Wrong player rankings

**Solution:** Verify your scoring method:
- Use `'matches'` for standard match-wins ranking
- Use `'points'` if you have a custom points system
- Use `'legs'` for pure leg-based tournaments

---

## Support

For questions or issues:
1. Check the function comments in the SQL file
2. Review the usage examples above
3. Test with `generate_bracket_matches` to see theoretical matchups before committing

**Version:** 1.0.0  
**Date:** January 19, 2026  
**Compatibility:** Supabase PostgreSQL 14+
