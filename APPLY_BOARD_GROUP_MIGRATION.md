# Apply Board Group Assignment Migration

## Steps to Add `assigned_group_ids` Column to Boards Table

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Navigate to your project: `pfujbgwgsxuhgvmeatjh`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy and paste the following SQL:

```sql
-- Migration: Add assigned_group_ids column to boards table
-- This allows boards to be assigned to specific groups for round robin play

-- Add the column to store group IDs assigned to each board
ALTER TABLE boards 
ADD COLUMN assigned_group_ids UUID[] DEFAULT ARRAY[]::uuid[];

-- Add index for faster group-based board queries
CREATE INDEX idx_boards_assigned_groups ON boards USING GIN (assigned_group_ids);

-- Add comment for documentation
COMMENT ON COLUMN boards.assigned_group_ids IS 'Array of group IDs that this board is assigned to for round robin matches';
```

4. **Execute the Query**
   - Click "Run" or press `Ctrl+Enter`
   - You should see a success message

5. **Verify the Migration**
   - Run this query to verify the column was added:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'boards' 
   AND column_name = 'assigned_group_ids';
   ```
   - You should see the new column listed

## After Migration

Once the migration is complete:
1. Refresh your application
2. Assign boards to groups in the Board Assignment section
3. Click "Save Board Assignments"
4. The assignments will now save successfully to the database
5. Group assignment emails will include the correct board numbers
