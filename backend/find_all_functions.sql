-- Find ALL versions of promote_to_knockout function
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    p.oid::regprocedure as full_signature,
    n.nspname as schema
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'promote_to_knockout';
