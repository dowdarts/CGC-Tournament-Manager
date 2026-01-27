-- Get the ACTUAL code that's currently in the database
SELECT pg_get_functiondef('promote_to_knockout(uuid,integer,integer,text,integer,integer,integer)'::regprocedure);
