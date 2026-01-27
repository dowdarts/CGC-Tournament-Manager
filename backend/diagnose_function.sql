-- Diagnostic query to see the actual function definition in the database
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'promote_to_knockout';
