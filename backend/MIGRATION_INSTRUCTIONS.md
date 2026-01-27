# Database Migration Instructions

## Run the migration to add game_type and team_id columns

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Open your project: **pfujbgwgsxuhgvmeatjh**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `backend/migration_add_game_type_team_id.sql`
6. Click **Run** button
7. Verify success message

### Option 2: Direct SQL Execution
```sql
-- Add game_type column to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS game_type TEXT CHECK (game_type IN ('singles', 'doubles'));

-- Set default value for existing records
UPDATE tournaments 
SET game_type = 'singles' 
WHERE game_type IS NULL;

-- Add team_id column to players (for linking doubles partners)
ALTER TABLE players
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Create index on team_id for faster team lookups
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- Add registration_enabled column to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS registration_enabled BOOLEAN DEFAULT false;
```

### Verification
After running the migration, verify it worked:

```sql
-- Check tournaments table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tournaments' AND column_name = 'game_type';

-- Check players table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'players' AND column_name = 'team_id';
```

You should see:
- `tournaments.game_type` - TEXT column
- `players.team_id` - UUID column

## What This Migration Does

1. **Adds `game_type` to tournaments**
   - Allows tracking if tournament is Singles or Doubles
   - Determines registration portal behavior
   - Defaults to 'singles' for existing tournaments

2. **Adds `team_id` to players**
   - Links doubles partners together
   - Same team_id = they're partners
   - NULL for singles tournaments

3. **Creates index**
   - Speeds up team lookups
   - Important for displaying partner information

4. **Adds `registration_enabled` to tournaments**
   - Indicates if registration is open
   - Defaults to false
