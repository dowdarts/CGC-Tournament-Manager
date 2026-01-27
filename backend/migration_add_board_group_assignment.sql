-- Migration: Add assigned_group_ids column to boards table
-- This allows boards to be assigned to specific groups for round robin play

-- Add the column to store group IDs assigned to each board
ALTER TABLE boards 
ADD COLUMN assigned_group_ids UUID[] DEFAULT ARRAY[]::uuid[];

-- Add index for faster group-based board queries
CREATE INDEX idx_boards_assigned_groups ON boards USING GIN (assigned_group_ids);

-- Add comment for documentation
COMMENT ON COLUMN boards.assigned_group_ids IS 'Array of group IDs that this board is assigned to for round robin matches';
