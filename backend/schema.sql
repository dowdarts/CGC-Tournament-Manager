-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  location TEXT,
  format TEXT NOT NULL CHECK (format IN ('group-knockout', 'round-robin', 'knockout')),
  num_groups INTEGER DEFAULT 1,
  advancement_rules TEXT,
  tiebreakers TEXT[] DEFAULT ARRAY['legDifference', 'headToHead'],
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN ('setup', 'group-stage', 'knockout', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT,
  paid BOOLEAN DEFAULT FALSE,
  group_id UUID,
  seed_ranking INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups (for group stage)
CREATE TABLE groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  player_ids UUID[] DEFAULT ARRAY[]::uuid[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player1_id UUID NOT NULL REFERENCES players(id),
  player2_id UUID NOT NULL REFERENCES players(id),
  group_id UUID REFERENCES groups(id),
  board_id UUID,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in-progress', 'completed')),
  winner_id UUID,
  player1_legs INTEGER DEFAULT 0,
  player2_legs INTEGER DEFAULT 0,
  legs_to_win INTEGER DEFAULT 2,
  sets_to_win INTEGER DEFAULT 1,
  current_set INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Boards table
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  board_number INTEGER NOT NULL,
  current_match_id UUID REFERENCES matches(id),
  next_match_id UUID REFERENCES matches(id),
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in-use', 'break')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Board call notifications
CREATE TABLE board_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  board_number INTEGER NOT NULL,
  player1_id UUID NOT NULL REFERENCES players(id),
  player2_id UUID NOT NULL REFERENCES players(id),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  emails_sent JSONB DEFAULT '[]'::jsonb
);

-- Indexes for common queries
CREATE INDEX idx_players_tournament ON players(tournament_id);
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_group ON matches(group_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_boards_tournament ON boards(tournament_id);
CREATE INDEX idx_groups_tournament ON groups(tournament_id);
