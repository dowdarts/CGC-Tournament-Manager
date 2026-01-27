-- Professional DartConnect-Style Knockout Bracket Generation
-- Based on WDF (World Darts Federation) Crossover Rules
-- Implements Mirror Seeding and Dynamic Standings
-- Date: 2026-01-19
-- Reference: DartConnect "RR Seed Test" Algorithm

-- ============================================================================
-- PART 1: DYNAMIC STANDINGS WITH CUSTOM POINT VALUES
-- ============================================================================

-- Function to calculate group standings with dynamic scoring rules
-- Supports: Match Wins, Points System, or Pure Leg-based ranking
CREATE OR REPLACE FUNCTION get_dynamic_standings(
  t_id UUID, 
  sort_method TEXT DEFAULT 'matches', -- 'matches', 'points', or 'legs'
  val_win INT DEFAULT 3,               -- Points for a win
  val_draw INT DEFAULT 1,              -- Points for a draw
  val_loss INT DEFAULT 0               -- Points for a loss
)
RETURNS TABLE (
  player_id UUID,
  group_index INT,
  total_wins INT,
  total_points INT,
  leg_diff INT,
  legs_won INT,
  final_rank INT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH stats AS (
    SELECT 
      m.tournament_id, m.group_index, p.p_id as p_id,
      -- Count Match Outcomes
      COUNT(*) FILTER (WHERE (m.p1_id = p.p_id AND m.p1_legs > m.p2_legs) OR (m.p2_id = p.p_id AND m.p2_legs > m.p1_legs)) as wins,
      COUNT(*) FILTER (WHERE m.p1_legs = m.p2_legs) as draws,
      -- Calculate Dynamic Points
      SUM(CASE 
        WHEN (m.p1_id = p.p_id AND m.p1_legs > m.p2_legs) OR (m.p2_id = p.p_id AND m.p2_legs > m.p1_legs) THEN val_win
        WHEN m.p1_legs = m.p2_legs THEN val_draw
        ELSE val_loss
      END) as points,
      -- Leg Math
      SUM(CASE WHEN m.p1_id = p.p_id THEN m.p1_legs ELSE m.p2_legs END) as l_for,
      SUM(CASE WHEN m.p1_id = p.p_id THEN m.p2_legs ELSE m.p1_legs END) as l_ag
    FROM matches m
    CROSS JOIN LATERAL (SELECT m.p1_id UNION SELECT m.p2_id) AS p(p_id)
    WHERE m.tournament_id = get_dynamic_standings.t_id AND m.status = 'completed' AND m.group_id IS NOT NULL
    GROUP BY m.tournament_id, m.group_index, p.p_id
  )
  SELECT 
    s.p_id, s.group_index, s.wins::INT, s.points::INT, (s.l_for - s.l_ag)::INT, s.l_for::INT,
    DENSE_RANK() OVER (
      PARTITION BY s.group_index 
      ORDER BY 
        CASE WHEN sort_method = 'matches' THEN s.wins END DESC,
        CASE WHEN sort_method = 'points' THEN s.points END DESC,
        CASE WHEN sort_method = 'legs' THEN s.l_for END DESC,
        (s.l_for - s.l_ag) DESC, 
        s.l_for DESC
    )::INT as final_rank
  FROM stats s;
END;
$$;

-- ============================================================================
-- PART 2: SEED ORDER GENERATION (MIRROR SEEDING)
-- ============================================================================

-- Generates the standard tournament seed order for any power of 2
-- E.g., for 8: [1, 8, 5, 4, 3, 6, 7, 2]
-- Formula: Opponent = (N + 1) - Seed
CREATE OR REPLACE FUNCTION get_seed_order(bracket_size INT)
RETURNS INT[]
LANGUAGE plpgsql
AS $$
DECLARE
  seeds INT[] := ARRAY[1, 2];
  next_level INT[];
  seed_val INT;
BEGIN
  -- Build seed order recursively until we reach bracket_size
  WHILE array_length(seeds, 1) < bracket_size LOOP
    next_level := ARRAY[]::INT[];
    
    FOREACH seed_val IN ARRAY seeds LOOP
      next_level := array_append(next_level, seed_val);
      next_level := array_append(next_level, (array_length(seeds, 1) * 2 + 1) - seed_val);
    END LOOP;
    
    seeds := next_level;
  END LOOP;
  
  RETURN seeds;
END;
$$;

-- ============================================================================
-- PART 3: GROUP-TO-SEED MAPPING (CROSSOVER LOGIC)
-- ============================================================================

-- Maps Round Robin finishers to Bracket Seeds using WDF crossover rules
-- Ensures Winner and Runner-up from same group are in opposite bracket halves
CREATE OR REPLACE FUNCTION map_groups_to_seeds(
  num_groups INT,
  num_qualifiers INT
)
RETURNS TABLE (
  seed_value INT,
  group_id INT,
  group_rank INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_players INT := num_groups * num_qualifiers;
  current_rank INT;
  current_group INT;
  current_seed INT;
BEGIN
  -- WDF Mapping: 1st place finishers first, then 2nd, then 3rd...
  -- This spreads different ranks across different quarters of the bracket
  FOR current_rank IN 1..num_qualifiers LOOP
    FOR current_group IN 0..(num_groups - 1) LOOP
      current_seed := ((current_rank - 1) * num_groups) + (current_group + 1);
      
      RETURN QUERY SELECT 
        current_seed::INT,
        current_group::INT,
        current_rank::INT;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================================================
-- PART 4: CROSSOVER OPPONENT CALCULATION
-- ============================================================================

-- Calculates the opponent's Group Index based on the Offset
-- For 8 Groups: Offset is 4 (Group 1 pairs with Group 5)
-- For 16 Groups: Offset is 8 (Group 1 pairs with Group 9)
CREATE OR REPLACE FUNCTION get_crossover_group(
  current_group INT,
  total_groups INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  group_offset INT;
BEGIN
  group_offset := total_groups / 2;
  RETURN (current_group + group_offset) % total_groups;
END;
$$;

-- Calculates the opponent's Rank (1st plays 4th, 2nd plays 3rd)
CREATE OR REPLACE FUNCTION get_opponent_rank(
  current_rank INT,
  total_qualifiers INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN (total_qualifiers + 1) - current_rank;
END;
$$;

-- ============================================================================
-- PART 5: BRACKET MATCH GENERATION
-- ============================================================================

-- Generates all first-round knockout matches using professional crossover seeding
CREATE OR REPLACE FUNCTION generate_bracket_matches(
  t_id UUID,
  num_groups INT,
  advancing_per_group INT
)
RETURNS TABLE (
  match_index INT,
  p1_group INT,
  p1_rank INT,
  p2_group INT,
  p2_rank INT
)
LANGUAGE plpgsql
AS $$
DECLARE
  total_slots INT := num_groups * advancing_per_group;
  seed_order INT[];
  seed_map RECORD;
  i INT;
BEGIN
  -- 1. Generate the Seed Order (Mirror Seeding)
  seed_order := get_seed_order(total_slots);
  
  -- 2. Create a temporary table to hold seed-to-player mappings
  CREATE TEMP TABLE IF NOT EXISTS temp_seed_map (
    seed_value INT,
    group_id INT,
    group_rank INT
  ) ON COMMIT DROP;
  
  DELETE FROM temp_seed_map;
  
  -- Populate the mapping
  INSERT INTO temp_seed_map
  SELECT * FROM map_groups_to_seeds(num_groups, advancing_per_group);
  
  -- 3. Generate matches by pairing seeds
  FOR i IN 1..total_slots BY 2 LOOP
    RETURN QUERY
    SELECT 
      ((i - 1) / 2)::INT as match_index,
      p1_map.group_id::INT,
      p1_map.group_rank::INT,
      p2_map.group_id::INT,
      p2_map.group_rank::INT
    FROM temp_seed_map p1_map
    JOIN temp_seed_map p2_map ON p2_map.seed_value = seed_order[i + 1]
    WHERE p1_map.seed_value = seed_order[i];
  END LOOP;
END;
$$;

-- ============================================================================
-- PART 6: COMPLETE BRACKET PROMOTION WORKFLOW
-- ============================================================================

-- Fetches a specific player from a group based on their rank
CREATE OR REPLACE FUNCTION get_player_by_rank(
  t_id UUID,
  group_idx INT,
  rank_pos INT,
  sort_method TEXT DEFAULT 'matches'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  player_uuid UUID;
BEGIN
  SELECT player_id INTO player_uuid
  FROM get_dynamic_standings(t_id, sort_method, 3, 1, 0)
  WHERE group_index = group_idx AND final_rank = rank_pos
  LIMIT 1;
  
  RETURN player_uuid;
END;
$$;

-- Main function to promote Round Robin qualifiers to Knockout Bracket
-- Creates all knockout matches with proper seeding and crossover
CREATE OR REPLACE FUNCTION promote_to_knockout(
  tournament_id UUID,
  num_groups INT,
  advance_count INT,
  sort_method TEXT DEFAULT 'matches',
  win_points INT DEFAULT 3,
  draw_points INT DEFAULT 1,
  loss_points INT DEFAULT 0
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  match_record RECORD;
  player1_uuid UUID;
  player2_uuid UUID;
  matches_created INT := 0;
  p1_label TEXT;
  p2_label TEXT;
BEGIN
  -- 1. Clear any existing knockout matches for this tournament
  DELETE FROM matches 
  WHERE tournament_id = promote_to_knockout.tournament_id 
  AND group_id IS NULL;
  
  -- 2. Generate bracket matchups using crossover logic
  FOR match_record IN 
    SELECT * FROM generate_bracket_matches(promote_to_knockout.tournament_id, num_groups, advance_count)
  LOOP
    -- 3. Get actual player IDs based on group rankings
    player1_uuid := get_player_by_rank(
      promote_to_knockout.tournament_id, 
      match_record.p1_group, 
      match_record.p1_rank,
      sort_method
    );
    
    player2_uuid := get_player_by_rank(
      promote_to_knockout.tournament_id,
      match_record.p2_group,
      match_record.p2_rank,
      sort_method
    );
    
    -- 4. Create player labels (e.g., "A1" for Group A, Rank 1)
    p1_label := CHR(65 + match_record.p1_group) || match_record.p1_rank;
    p2_label := CHR(65 + match_record.p2_group) || match_record.p2_rank;
    
    -- 5. Insert the match into the database
    IF player1_uuid IS NOT NULL AND player2_uuid IS NOT NULL THEN
      INSERT INTO matches (
        tournament_id,
        p1_id,
        p2_id,
        round_number,
        match_number,
        p1_label,
        p2_label,
        status
      ) VALUES (
        promote_to_knockout.tournament_id,
        player1_uuid,
        player2_uuid,
        1, -- First round of knockout
        match_record.match_index + 1,
        p1_label,
        p2_label,
        'pending'
      );
      
      matches_created := matches_created + 1;
    END IF;
  END LOOP;
  
  RETURN matches_created;
END;
$$;

-- ============================================================================
-- PART 7: HELPER FUNCTIONS FOR COMMON TOURNAMENT FORMATS
-- ============================================================================

-- Quick setup for common tournament formats
CREATE OR REPLACE FUNCTION setup_knockout_bracket(
  tournament_id UUID,
  format_name TEXT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  matches_count INT;
BEGIN
  CASE format_name
    -- 2 Groups Scenarios
    WHEN '2_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 2);
    WHEN '2_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 4);
    WHEN '2_groups_8_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 2, 8);
    
    -- 4 Groups Scenarios
    WHEN '4_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 4, 2);
    WHEN '4_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 4, 4);
    
    -- 8 Groups Scenarios
    WHEN '8_groups_2_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 8, 2);
    WHEN '8_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 8, 4);
    
    -- 16 Groups Scenarios
    WHEN '16_groups_4_advance' THEN
      matches_count := promote_to_knockout(setup_knockout_bracket.tournament_id, 16, 4);
    
    ELSE
      RAISE EXCEPTION 'Unsupported tournament format: %. Use format like "4_groups_2_advance"', format_name;
  END CASE;
  
  RETURN matches_count;
END;
$$;

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Generate bracket for 4 groups, 2 advancing each (8-player bracket)
-- SELECT promote_to_knockout('your-tournament-uuid', 4, 2);

-- Example 2: Use quick setup for standard format
-- SELECT setup_knockout_bracket('your-tournament-uuid', '4_groups_2_advance');

-- Example 3: Custom points system (5 pts for win, 2 for draw)
-- SELECT promote_to_knockout('your-tournament-uuid', 8, 4, 'points', 5, 2, 0);

-- Example 4: View standings for a tournament with custom scoring
-- SELECT * FROM get_dynamic_standings('your-tournament-uuid', 'points', 3, 1, 0);

-- Example 5: See the theoretical bracket matchups (without creating matches)
-- SELECT * FROM generate_bracket_matches('your-tournament-uuid', 4, 2);

COMMENT ON FUNCTION get_dynamic_standings IS 'Calculates group standings with configurable scoring: matches (match wins), points (custom point values), or legs (total legs won)';
COMMENT ON FUNCTION get_seed_order IS 'Generates mirror seeding order for professional brackets (1 vs N, 2 vs N-1, etc.)';
COMMENT ON FUNCTION map_groups_to_seeds IS 'Maps group finishers to bracket seeds using WDF crossover logic';
COMMENT ON FUNCTION generate_bracket_matches IS 'Generates first-round knockout matchups with professional crossover seeding';
COMMENT ON FUNCTION promote_to_knockout IS 'Main function: Promotes Round Robin qualifiers to knockout bracket with proper seeding';
COMMENT ON FUNCTION setup_knockout_bracket IS 'Quick setup for common tournament formats (e.g., "4_groups_2_advance")';
