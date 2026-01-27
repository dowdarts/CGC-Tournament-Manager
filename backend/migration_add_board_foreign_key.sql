-- Add foreign key constraint for matches.board_id
-- This enables PostgREST to join matches with boards using the board_id column

ALTER TABLE matches
ADD CONSTRAINT matches_board_id_fkey 
FOREIGN KEY (board_id) 
REFERENCES boards(id) 
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_matches_board_id ON matches(board_id);

-- Verify the constraint was created
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table,
    a.attname as column_name,
    af.attname as foreign_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conname = 'matches_board_id_fkey';
