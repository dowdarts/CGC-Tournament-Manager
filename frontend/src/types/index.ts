// Tournament Types
export interface Tournament {
  id: string;
  name: string;
  date: string;
  start_time?: string; // Tournament start time (HH:MM format)
  registration_close_time?: string; // Registration close time (YYYY-MM-DDTHH:MM:SS format)
  registration_price?: number; // Price for registration in dollars
  location: string;
  format: 'group-knockout' | 'round-robin' | 'knockout';
  game_type?: 'singles' | 'doubles'; // For registration portal
  registration_enabled?: boolean; // Enable self-service registration
  user_id?: string; // Tournament host/owner
  num_groups: number;
  advancement_rules: string;
  players_advancing_per_group?: number; // Number of players advancing from each group to knockout
  tiebreakers: string[];
  status: 'setup' | 'group-stage' | 'knockout' | 'completed';
  archived?: boolean; // Tournament is archived
  completed?: boolean; // Tournament is marked as completed
  
  // DartConnect Integration
  dartconnect_integration_enabled?: boolean; // Enable live scraping integration
  dartconnect_auto_accept_scores?: boolean; // Auto-accept scores with high confidence
  dartconnect_require_manual_approval?: boolean; // Require manual approval for all scores
  
  // Workflow steps
  setup_completed?: boolean;
  participants_confirmed?: boolean;
  groups_generated?: boolean;
  group_stage_created?: boolean;
  group_stage_started?: boolean;
  group_stage_completed?: boolean;
  auto_board_call_enabled?: boolean; // Automatic board call system
  show_standings_on_display?: boolean; // Show standings on live display after "Apply to Standings"
  
  // Scoring Configuration
  scoring_system?: {
    primary_metric: 'match_wins' | 'leg_wins' | 'tournament_points';
    
    // Round Robin (Group Stage) Format
    roundrobin_format: 'matchplay' | 'set_play';
    roundrobin_legs_per_match?: number; // For matchplay
    roundrobin_legs_per_set?: number; // For set play
    roundrobin_sets_per_match?: number; // For set play
    
    // Knockout Format
    knockout_format: 'matchplay' | 'set_play';
    knockout_legs_per_match?: number; // For matchplay
    knockout_legs_per_set?: number; // For set play
    knockout_sets_per_match?: number; // For set play
    
    // Play Style (for match play only)
    roundrobin_play_style?: 'play_all' | 'best_of'; // Play all legs or best of
    knockout_play_style?: 'play_all' | 'best_of'; // Play all legs or best of
    
    // Points System
    points_for_win: number; // Default: 2
    points_for_draw: number; // Default: 1
    points_for_loss: number; // Default: 0
    bonus_points_enabled?: boolean;
    tiebreak_order: ('leg_difference' | 'head_to_head' | 'legs_won' | 'legs_lost' | 'match_wins')[];
  };
  
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

// DartConnect Integration Types
export interface PendingMatchResult {
  id: string;
  tournament_id: string;
  match_id?: string;
  watch_code: string;
  scraper_session_id?: string;
  
  // Player Information
  player1_name: string;
  player2_name: string;
  
  // Match Results
  player1_legs: number;
  player2_legs: number;
  player1_sets: number;
  player2_sets: number;
  winner_name?: string;
  
  // Additional Data
  match_format?: string;
  player1_average?: number;
  player2_average?: number;
  player1_highest_checkout?: number;
  player2_highest_checkout?: number;
  player1_180s?: number;
  player2_180s?: number;
  total_legs_played?: number;
  match_duration_minutes?: number;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'auto-accepted';
  
  // Matching Info
  confidence_score?: number;
  match_found: boolean;
  matching_notes?: string;
  
  // Raw Data
  raw_scraper_data?: any;
  
  // Timestamps
  match_started_at?: string;
  match_completed_at: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
}

export interface MatchWatchCode {
  id: string;
  match_id: string;
  tournament_id: string;
  watch_code: string;
  scraper_active: boolean;
  scraper_started_at?: string;
  scraper_stopped_at?: string;
  auto_accept_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchScoreHistory {
  id: string;
  match_id: string;
  tournament_id: string;
  change_type: 'manual_entry' | 'dartconnect_auto' | 'dartconnect_approved' | 'dartconnect_rejected' | 'score_update';
  old_player1_legs?: number;
  old_player2_legs?: number;
  old_winner_id?: string;
  old_status?: string;
  new_player1_legs?: number;
  new_player2_legs?: number;
  new_winner_id?: string;
  new_status?: string;
  source?: string;
  pending_result_id?: string;
  changed_by?: string;
  change_reason?: string;
  created_at: string;
}
