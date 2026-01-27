-- Test get_dynamic_standings to see what it returns
-- Replace this UUID with your actual tournament ID
SELECT * FROM get_dynamic_standings('fe25af62-a7ef-40ca-bc03-675098317d84', 'matches', 3, 1, 0)
ORDER BY group_index, final_rank;
