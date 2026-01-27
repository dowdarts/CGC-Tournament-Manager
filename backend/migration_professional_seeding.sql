-- Professional Seeding Algorithm for Tournament Brackets
-- Based on WDF/PDC standards
-- Author: CGC Tournament Manager
-- Date: 2026-01-18

-- Function to generate professional bracket seed order (recursive power of 2)
CREATE OR REPLACE FUNCTION generate_bracket_seed_order(bracket_size integer)
RETURNS integer[] AS $$
DECLARE
    seeds integer[] := ARRAY[1, 2];
    next_seeds integer[] := ARRAY[]::integer[];
    seed integer;
BEGIN
    -- Build seed order recursively until we reach bracket_size
    WHILE array_length(seeds, 1) < bracket_size LOOP
        next_seeds := ARRAY[]::integer[];
        
        -- For each current seed, add it and its opponent
        FOREACH seed IN ARRAY seeds LOOP
            next_seeds := next_seeds || seed;
            next_seeds := next_seeds || (array_length(seeds, 1) * 2 + 1 - seed);
        END LOOP;
        
        seeds := next_seeds;
    END LOOP;
    
    RETURN seeds;
END;
$$ LANGUAGE plpgsql;

-- Function to create professional crossover seeding for 2 groups
CREATE OR REPLACE FUNCTION create_two_group_crossover_seeding(
    tournament_id uuid,
    total_advancing integer
)
RETURNS TABLE(player_id uuid, tournament_seed integer, group_letter text, group_rank integer) AS $$
DECLARE
    seed_order integer[];
    crossover_order text[];
BEGIN
    -- Get professional seed order
    seed_order := generate_bracket_seed_order(total_advancing);
    
    -- Define crossover order to prevent same-group matches
    -- For 4 players: A1=1, B2=4, A2=2, B1=3 (A1 and B1 in different halves!)
    -- For 8 players: A1=1, B4=8, B2=2, A3=7, B1=5, A4=4, A2=3, B3=6
    IF total_advancing = 4 THEN
        crossover_order := ARRAY['A1', 'B2', 'A2', 'B1'];
    ELSE
        crossover_order := ARRAY[
            'A1', 'B4', 'B2', 'A3', 'B1', 'A4', 'A2', 'B3',
            'A5', 'B8', 'B6', 'A7', 'B5', 'A8', 'A6', 'B7'
        ];
    END IF;
    
    -- Return seeded players using crossover logic
    RETURN QUERY
    WITH group_standings AS (
        SELECT DISTINCT 
            p.id as player_id,
            gs.group_letter,
            ROW_NUMBER() OVER (PARTITION BY gs.group_letter ORDER BY gs.points DESC, gs.legs_difference DESC) as group_rank
        FROM group_standings gs
        JOIN players p ON gs.player_id = p.id
        WHERE gs.tournament_id = create_two_group_crossover_seeding.tournament_id
    ),
    crossover_mapping AS (
        SELECT 
            unnest(crossover_order) as group_pos,
            unnest(seed_order) as seed_value,
            generate_series(1, array_length(crossover_order, 1)) as position
    ),
    seeding_assignment AS (
        SELECT DISTINCT
            gs.player_id,
            cm.seed_value as tournament_seed,
            gs.group_letter,
            gs.group_rank
        FROM group_standings gs
        JOIN crossover_mapping cm ON 
            cm.group_pos = gs.group_letter || gs.group_rank
        WHERE gs.group_rank <= (total_advancing / 2)  -- Only advancing players
    )
    SELECT 
        sa.player_id,
        sa.tournament_seed,
        sa.group_letter,
        sa.group_rank
    FROM seeding_assignment sa
    ORDER BY sa.tournament_seed;
END;
$$ LANGUAGE plpgsql;

-- Function to create professional crossover seeding for 4 groups
CREATE OR REPLACE FUNCTION create_four_group_crossover_seeding(
    tournament_id uuid,
    total_advancing integer,
    advancing_per_group integer
)
RETURNS TABLE(player_id uuid, tournament_seed integer, group_letter text, group_rank integer) AS $$
DECLARE
    seed_order integer[];
    group_letters text[] := ARRAY['A', 'B', 'C', 'D'];
    group_letter text;
    rank_num integer;
    assignment_index integer := 1;
BEGIN
    -- Get professional seed order
    seed_order := generate_bracket_seed_order(total_advancing);
    
    -- Return seeded players using snake distribution with crossover
    RETURN QUERY
    WITH group_standings AS (
        SELECT DISTINCT 
            p.id as player_id,
            gs.group_letter,
            ROW_NUMBER() OVER (PARTITION BY gs.group_letter ORDER BY gs.points DESC, gs.legs_difference DESC) as group_rank
        FROM group_standings gs
        JOIN players p ON gs.player_id = p.id
        WHERE gs.tournament_id = create_four_group_crossover_seeding.tournament_id
    ),
    crossover_assignment AS (
        SELECT 
            gs.player_id,
            gs.group_letter,
            gs.group_rank,
            -- Snake distribution: rank 1 players first, then rank 2, etc.
            ((gs.group_rank - 1) * 4) + 
            CASE gs.group_letter 
                WHEN 'A' THEN 1
                WHEN 'B' THEN 2 
                WHEN 'C' THEN 3
                WHEN 'D' THEN 4
            END as crossover_position
        FROM group_standings gs
        WHERE gs.group_rank <= advancing_per_group
    ),
    seeding_assignment AS (
        SELECT 
            ca.player_id,
            seed_order[ca.crossover_position] as tournament_seed,
            ca.group_letter,
            ca.group_rank
        FROM crossover_assignment ca
        WHERE ca.crossover_position <= total_advancing
    )
    SELECT 
        sa.player_id,
        sa.tournament_seed,
        sa.group_letter,
        sa.group_rank
    FROM seeding_assignment sa
    ORDER BY sa.tournament_seed;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically generate bracket matches with professional seeding
CREATE OR REPLACE FUNCTION generate_professional_bracket_matches(
    tournament_id_param uuid,
    num_groups integer,
    advancing_per_group integer
)
RETURNS void AS $$
DECLARE
    total_advancing integer := num_groups * advancing_per_group;
    seeded_player record;
    match_pairs integer[];
    i integer;
    round_number integer := 1;
    match_number integer := 1;
BEGIN
    -- Clear existing knockout matches
    DELETE FROM matches 
    WHERE tournament_id = tournament_id_param 
    AND round_number >= 1;
    
    -- Get professional seeding
    IF num_groups = 2 THEN
        -- Use 2-group crossover seeding
        FOR seeded_player IN 
            SELECT * FROM create_two_group_crossover_seeding(tournament_id_param, total_advancing)
            ORDER BY tournament_seed
        LOOP
            -- Store seeded players for match creation
            match_pairs := array_append(match_pairs, seeded_player.tournament_seed);
        END LOOP;
        
    ELSIF num_groups = 4 THEN
        -- Use 4-group crossover seeding  
        FOR seeded_player IN 
            SELECT * FROM create_four_group_crossover_seeding(tournament_id_param, total_advancing, advancing_per_group)
            ORDER BY tournament_seed
        LOOP
            -- Store seeded players for match creation
            match_pairs := array_append(match_pairs, seeded_player.tournament_seed);
        END LOOP;
    END IF;
    
    -- Create first round matches using professional bracket pairings
    FOR i IN 1..total_advancing BY 2 LOOP
        INSERT INTO matches (
            tournament_id,
            round_number,
            match_number,
            player1_id,
            player2_id,
            created_at
        )
        SELECT 
            tournament_id_param,
            round_number,
            match_number,
            p1.player_id,
            p2.player_id,
            NOW()
        FROM (
            SELECT player_id, tournament_seed FROM (
                SELECT * FROM create_two_group_crossover_seeding(tournament_id_param, total_advancing)
                WHERE num_groups = 2
                UNION ALL
                SELECT * FROM create_four_group_crossover_seeding(tournament_id_param, total_advancing, advancing_per_group)
                WHERE num_groups = 4
            ) seeding
            WHERE tournament_seed = match_pairs[i]
        ) p1
        CROSS JOIN (
            SELECT player_id, tournament_seed FROM (
                SELECT * FROM create_two_group_crossover_seeding(tournament_id_param, total_advancing)
                WHERE num_groups = 2
                UNION ALL
                SELECT * FROM create_four_group_crossover_seeding(tournament_id_param, total_advancing, advancing_per_group)
                WHERE num_groups = 4
            ) seeding
            WHERE tournament_seed = match_pairs[i + 1]
        ) p2;
        
        match_number := match_number + 1;
    END LOOP;
    
    RAISE NOTICE 'Generated % professional bracket matches for tournament %', 
        total_advancing / 2, tournament_id_param;
END;
$$ LANGUAGE plpgsql;

-- Example usage function to generate brackets for common tournament formats
CREATE OR REPLACE FUNCTION setup_tournament_bracket(
    tournament_id_param uuid,
    format_name text
)
RETURNS void AS $$
BEGIN
    CASE format_name
        WHEN '2_groups_4_advance' THEN
            PERFORM generate_professional_bracket_matches(tournament_id_param, 2, 4);
        WHEN '2_groups_8_advance' THEN
            PERFORM generate_professional_bracket_matches(tournament_id_param, 2, 8);
        WHEN '4_groups_2_advance' THEN
            PERFORM generate_professional_bracket_matches(tournament_id_param, 4, 2);
        WHEN '4_groups_4_advance' THEN
            PERFORM generate_professional_bracket_matches(tournament_id_param, 4, 4);
        WHEN '8_groups_4_advance' THEN
            PERFORM generate_professional_bracket_matches(tournament_id_param, 8, 4);
        ELSE
            RAISE EXCEPTION 'Unsupported tournament format: %', format_name;
    END CASE;
    
    RAISE NOTICE 'Tournament bracket setup complete for format: %', format_name;
END;
$$ LANGUAGE plpgsql;

-- Usage examples:
-- SELECT setup_tournament_bracket('your-tournament-uuid', '2_groups_4_advance');
-- SELECT setup_tournament_bracket('your-tournament-uuid', '4_groups_4_advance');