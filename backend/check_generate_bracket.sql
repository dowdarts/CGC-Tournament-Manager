-- Check if generate_bracket_matches has the DELETE statement
SELECT pg_get_functiondef('generate_bracket_matches'::regproc);
