# Quick Start: Apply DartConnect Seeding Migration

## 🚀 Quick Steps

### 1. Open Supabase SQL Editor
Go to your Supabase project → SQL Editor

### 2. Remove Old Functions (Copy & Paste)

```sql
-- Step 1: Drop old bracket functions
DROP FUNCTION IF EXISTS generate_bracket_seed_order(integer) CASCADE;
DROP FUNCTION IF EXISTS create_two_group_crossover_seeding(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS create_four_group_crossover_seeding(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS generate_professional_bracket_matches(uuid, integer, integer) CASCADE;
DROP FUNCTION IF EXISTS setup_tournament_bracket(uuid, text) CASCADE;
DROP VIEW IF EXISTS bracket_seeding_view CASCADE;
DROP VIEW IF EXISTS knockout_bracket_view CASCADE;
```

Click **Run** ✅

### 3. Install New System (Copy Entire File)

Open this file in VS Code:
```
backend/migration_dartconnect_professional_seeding.sql
```

Copy the **entire contents** and paste into Supabase SQL Editor.

Click **Run** ✅

### 4. Test It

```sql
-- Replace 'your-tournament-uuid' with an actual tournament ID from your database
SELECT setup_knockout_bracket('your-tournament-uuid', '4_groups_2_advance');
```

If you see a number returned (like `4`), it worked! That's the number of matches created.

---

## 🎯 Usage in Your TypeScript Code

### Simple Format (Recommended)

```typescript
// In your KnockoutBracket component or wherever you start the knockout stage
const generateBracket = async () => {
  const { data, error } = await supabase.rpc('setup_knockout_bracket', {
    tournament_id: tournamentId,
    format_name: '4_groups_2_advance'  // Change based on your tournament
  });
  
  if (error) {
    console.error('Error generating bracket:', error);
    return;
  }
  
  console.log(`Created ${data} knockout matches`);
};
```

### Common Formats

```typescript
'2_groups_4_advance'   // 2 groups, 4 advance each = 8 player bracket
'4_groups_2_advance'   // 4 groups, 2 advance each = 8 player bracket
'4_groups_4_advance'   // 4 groups, 4 advance each = 16 player bracket
'8_groups_4_advance'   // 8 groups, 4 advance each = 32 player bracket
'16_groups_4_advance'  // 16 groups, 4 advance each = 64 player bracket
```

### Custom Scoring (Advanced)

```typescript
// For tournaments with custom point systems (e.g., 5 pts win, 2 pts draw)
const { data, error } = await supabase.rpc('promote_to_knockout', {
  tournament_id: tournamentId,
  num_groups: 4,
  advance_count: 2,
  sort_method: 'points',  // 'matches', 'points', or 'legs'
  win_points: 5,
  draw_points: 2,
  loss_points: 0
});
```

---

## 📝 What Changed

### Old Functions (REMOVED)
- ❌ `generate_bracket_seed_order`
- ❌ `create_two_group_crossover_seeding`
- ❌ `create_four_group_crossover_seeding`
- ❌ `generate_professional_bracket_matches`
- ❌ `setup_tournament_bracket`

### New Functions (ADDED)
- ✅ `get_dynamic_standings` - Calculate rankings with custom scoring
- ✅ `get_seed_order` - Mirror seeding algorithm
- ✅ `map_groups_to_seeds` - DartConnect crossover logic
- ✅ `generate_bracket_matches` - Preview matchups
- ✅ `promote_to_knockout` - Main bracket generation (with custom scoring)
- ✅ `setup_knockout_bracket` - Quick setup for standard formats

---

## 🔧 Files to Update in Your TypeScript Code

Search your project for these old function calls and update them:

### File: `frontend/src/pages/KnockoutBracket.tsx`

**Find:**
```typescript
supabase.rpc('generate_professional_bracket_matches', ...)
```

**Replace with:**
```typescript
supabase.rpc('setup_knockout_bracket', {
  tournament_id: tournamentId,
  format_name: '4_groups_2_advance'
})
```

### File: `frontend/src/pages/GroupStage.tsx` (or wherever you transition to knockout)

**Find:**
```typescript
const { data } = await supabase.rpc('setup_tournament_bracket', ...)
```

**Replace with:**
```typescript
const { data } = await supabase.rpc('setup_knockout_bracket', {
  tournament_id: tournament.id,
  format_name: `${numGroups}_groups_${advancingPerGroup}_advance`
})
```

---

## ✅ Verification

After migration, verify the new functions exist:

```sql
-- Check that all 8 new functions are installed
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'get_dynamic_standings',
  'get_seed_order',
  'map_groups_to_seeds',
  'get_crossover_group',
  'get_opponent_rank',
  'generate_bracket_matches',
  'promote_to_knockout',
  'setup_knockout_bracket'
);
```

You should see all 8 function names listed.

---

## 🆘 Troubleshooting

**Error: "function does not exist"**
- Make sure you ran the full migration SQL file
- Check for any syntax errors in the SQL editor

**Error: "No matches created"**
- Ensure group stage matches exist with `status = 'completed'`
- Verify players have `group_index` values set
- Check that you have the right number of groups and players

**Wrong matchups**
- The new system uses DartConnect crossover rules
- Group A Winner plays Group D Runner-up (for 4 groups, 2 advance)
- This prevents same-group rematches until the final

---

## 📚 Full Documentation

For detailed explanation of the seeding algorithm, see:
- `backend/MIGRATION_DARTCONNECT_SEEDING.md` (Full guide)
- `logicforknockoutbraket.txt` (Original algorithm specification)

---

**Ready to Go!** 🎯

The new system is production-ready and follows professional darts tournament standards.
