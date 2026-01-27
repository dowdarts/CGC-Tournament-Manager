# TypeScript Integration Guide for New DartConnect SQL Functions

## Overview

This guide shows how to update your `KnockoutBracket.tsx` component to use the new DartConnect professional seeding SQL functions instead of the manual TypeScript seeding logic.

## Key Changes

### ❌ OLD APPROACH (Remove)
The old code manually generates bracket seeding in TypeScript with complex functions like:
- `generateSeeding()`
- `createProfessionalCrossoverSeeding()`
- `createFourGroupEightPlayerSeeding()`
- `createTwoGroupEightPlayerSeeding()`
- etc.

### ✅ NEW APPROACH (Use This)
Let the database handle all seeding logic with a single function call:
```typescript
await supabase.rpc('setup_knockout_bracket', {
  tournament_id: tournamentId,
  format_name: '4_groups_2_advance'
})
```

---

## Step-by-Step Integration

### 1. Add New Function to Generate Bracket (Replace generateSeeding)

**Location:** `frontend/src/pages/KnockoutBracket.tsx`

**Remove the entire `generateSeeding` function (lines ~480-530)**

**Add this new function instead:**

```typescript
/**
 * Generate knockout bracket using DartConnect professional seeding
 * This replaces all the manual seeding logic with a database call
 */
const generateBracketFromDatabase = async () => {
  if (!id || !tournament) return;
  
  try {
    setLoading(true);
    
    // Determine format based on tournament configuration
    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .eq('tournament_id', id);
    
    const numGroups = groups?.length || 0;
    
    // Parse advancement count from tournament rules
    let advancePerGroup = 2; // Default
    if (tournament.advancement_rules) {
      const match = tournament.advancement_rules.match(/Top (\d+)/i);
      if (match) {
        advancePerGroup = parseInt(match[1], 10);
      }
    }
    
    // Format name for SQL function (e.g., "4_groups_2_advance")
    const formatName = `${numGroups}_groups_${advancePerGroup}_advance`;
    
    console.log(`🎯 Generating bracket: ${formatName}`);
    
    // Call the new SQL function to generate all knockout matches
    const { data: matchesCreated, error: rpcError } = await supabase.rpc(
      'setup_knockout_bracket',
      {
        tournament_id: id,
        format_name: formatName
      }
    );
    
    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      throw rpcError;
    }
    
    console.log(`✅ Created ${matchesCreated} knockout matches`);
    
    // Now load the matches from database
    const { data: knockoutMatches, error: fetchError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .is('group_id', null)
      .order('round_number')
      .order('match_number');
    
    if (fetchError) throw fetchError;
    
    // Convert database matches to bracket format
    await loadBracketFromDatabase(knockoutMatches || []);
    
    // Update tournament status to knockout
    await supabase
      .from('tournaments')
      .update({ status: 'knockout' })
      .eq('id', id);
    
  } catch (error) {
    console.error('Error generating bracket:', error);
    alert('Failed to generate knockout bracket. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

### 2. Update the Initial Load Logic

**Find this code in `loadTournamentAndBracket()` (around line 183):**

```typescript
console.log('✅ Loaded standings from database, generating bracket');
generateSeeding(standings);  // ❌ OLD
```

**Replace with:**

```typescript
console.log('✅ Loaded standings from database, generating bracket');
await generateBracketFromDatabase();  // ✅ NEW
```

### 3. Add a "Generate Bracket" Button (Optional but Recommended)

Add this button to manually trigger bracket generation:

```typescript
// In your JSX return statement, add:
<button
  onClick={generateBracketFromDatabase}
  disabled={loading}
  className="btn btn-primary"
>
  {loading ? 'Generating...' : 'Generate Knockout Bracket'}
</button>
```

### 4. Remove Unused Functions (Cleanup)

These functions are no longer needed and can be removed to reduce code size:

- `generateSeeding()`
- `generateSingleEliminationBracket()`
- `generateBracketSeedOrder()`
- `createProfessionalCrossoverSeeding()`
- `createTournamentSeeding()`
- `createFourGroupSixteenPlayerSeeding()`
- `createFourGroupEightPlayerSeeding()`
- `createTwoGroupSixteenPlayerSeeding()`
- `createTwoGroupEightPlayerSeeding()`
- `createSingleGroupSeeding()`
- `createBalancedRankSeeding()`
- `generateRound1WithByes()`
- `generateAllBracketRounds()`

**Total lines removed: ~800 lines!**

---

## Advanced Usage: Custom Scoring

If your tournament uses a custom points system (not standard match wins), use the advanced function:

```typescript
const generateBracketWithCustomScoring = async () => {
  const { data: matchesCreated, error } = await supabase.rpc(
    'promote_to_knockout',
    {
      tournament_id: id,
      num_groups: 4,
      advance_count: 2,
      sort_method: 'points',  // 'matches', 'points', or 'legs'
      win_points: 5,          // Points for a win
      draw_points: 2,         // Points for a draw
      loss_points: 0          // Points for a loss
    }
  );
  
  if (error) throw error;
  
  console.log(`✅ Created ${matchesCreated} matches with custom scoring`);
  
  // Reload matches from database
  const { data: knockoutMatches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', id)
    .is('group_id', null);
  
  await loadBracketFromDatabase(knockoutMatches || []);
};
```

---

## Testing

### 1. Test Standard Format

```typescript
// In browser console after loading a tournament:
const { data, error } = await supabase.rpc('setup_knockout_bracket', {
  tournament_id: 'your-tournament-id',
  format_name: '4_groups_2_advance'
});
console.log('Matches created:', data);
```

### 2. Verify Matches in Database

```sql
-- In Supabase SQL Editor:
SELECT 
  match_number,
  p1_label,
  p2_label,
  round_number
FROM matches
WHERE tournament_id = 'your-tournament-id'
AND group_id IS NULL
ORDER BY round_number, match_number;
```

Expected output for 4 groups, 2 advancing:
```
match_number | p1_label | p2_label | round_number
-------------|----------|----------|-------------
1            | A1       | D2       | 1
2            | B1       | C2       | 1
3            | C1       | B2       | 1
4            | D1       | A2       | 1
```

---

## Benefits

✅ **Simpler Code:** ~800 lines of complex seeding logic replaced with 1 SQL call
✅ **More Reliable:** Database handles all crossover logic consistently
✅ **Professional Standard:** Uses DartConnect/WDF algorithms
✅ **Easier to Test:** Can test SQL functions independently
✅ **Better Performance:** Database operations are faster than JS calculations
✅ **Maintainable:** All seeding logic in one place (SQL file)

---

## Common Formats Reference

```typescript
const COMMON_FORMATS = {
  '2_groups_4_advance': '8 players (2 groups × 4 advancing)',
  '2_groups_8_advance': '16 players (2 groups × 8 advancing)',
  '4_groups_2_advance': '8 players (4 groups × 2 advancing)',
  '4_groups_4_advance': '16 players (4 groups × 4 advancing)',
  '8_groups_2_advance': '16 players (8 groups × 2 advancing)',
  '8_groups_4_advance': '32 players (8 groups × 4 advancing)',
  '16_groups_4_advance': '64 players (16 groups × 4 advancing)',
};
```

---

## Migration Checklist

- [ ] Apply SQL migration (`migration_dartconnect_professional_seeding.sql`)
- [ ] Add `generateBracketFromDatabase()` function
- [ ] Update `loadTournamentAndBracket()` to call new function
- [ ] Remove old seeding functions (~800 lines)
- [ ] Test with existing tournament
- [ ] Verify matchups follow DartConnect crossover rules
- [ ] Update UI with "Generate Bracket" button (optional)

---

## Support

If you encounter issues:

1. Check browser console for error messages
2. Verify SQL migration was applied successfully
3. Check that group stage matches are marked `status = 'completed'`
4. Verify players have proper `group_index` values

**Complete Integration Time: ~15 minutes**
