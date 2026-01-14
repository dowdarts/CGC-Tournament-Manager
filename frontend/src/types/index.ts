// Tournament Types
export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  format: 'group-knockout' | 'round-robin' | 'knockout';
  game_type?: 'singles' | 'doubles'; // For registration portal
  registration_enabled?: boolean; // Enable self-service registration
  num_groups: number;
  advancement_rules: string;
  tiebreakers: string[];
  status: 'setup' | 'group-stage' | 'knockout' | 'completed';
  created_at: string;
  updated_at: string;
}

// Player Types
export interface Player {
  id: string;
  tournament_id: string;
  name: string;
  email?: string; // Optional
  phone_number?: string;
  paid: boolean;
  team_id?: string; // For doubles - links partner players
  group_id?: string;
  seed_ranking?: number;
  created_at: string;
  updated_at: string;
}

// Group/Round Robin Types
export interface Group {
  id: string;
  tournament_id: string;
  name: string;
  player_ids: string[];
  created_at: string;
}

export interface GroupStandings {
  groupId: string;
  standings: PlayerStanding[];
}

export interface PlayerStanding {
  playerId: string;
  playerName: string;
  wins: number;
  losses: number;
  legsWon: number;
  legsLost: number;
  legDifference: number;
  headToHeadRecord: { [opponentId: string]: { wins: number; losses: number } };
}

// Match Types
export interface Match {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1: Player;
  player2: Player;
  group_id?: string;
  board_id?: string;
  status: 'scheduled' | 'in-progress' | 'completed';
  winner_id?: string; // player ID
  player1_legs: number;
  player2_legs: number;
  legs_to_win: number;
  sets_to_win: number;
  current_set: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// Board Types
export interface Board {
  id: string;
  tournament_id: string;
  board_number: number;
  current_match_id?: string;
  next_match_id?: string;
  status: 'available' | 'in-use' | 'break';
  created_at: string;
}

// Bracket Types
export interface BracketRound {
  roundNumber: number;
  matches: BracketMatch[];
}

export interface BracketMatch {
  id: string;
  roundNumber: number;
  player1Id?: string;
  player2Id?: string;
  player1Seed?: string;
  player2Seed?: string;
  winner?: string;
  player1Score?: number;
  player2Score?: number;
  status: 'pending' | 'in-progress' | 'completed';
}

// Notification Types
export interface BoardCallNotification {
  matchId: string;
  boardNumber: number;
  player1Id: string;
  player2Id: string;
  sentAt: string;
  emailsSent: { playerId: string; email: string; sent: boolean }[];
}
