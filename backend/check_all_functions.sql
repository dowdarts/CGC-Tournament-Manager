-- Check if all required functions exist
SELECT 
    proname as function_name,
    'EXISTS' as status
FROM pg_proc 
WHERE proname IN (
    'get_dynamic_standings',
    'get_player_by_rank',
    'promote_to_knockout',
    'setup_knockout_bracket',
    'generate_bracket_matches',
    'get_seed_order',
    'map_groups_to_seeds'
)
ORDER BY proname;
