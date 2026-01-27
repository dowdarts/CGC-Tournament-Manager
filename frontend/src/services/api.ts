import { supabase } from './supabase';
import { Tournament, Player, Match, Group, Board, PendingMatchResult, MatchWatchCode } from '@/types';

// Tournament API
export const TournamentService = {
  async createTournament(data: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data: result, error } = await supabase
      .from('tournaments')
      .insert([data])
      .select();
    if (error) throw error;
    return result?.[0];
  },

  async getTournaments() {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getTournament(id: string) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async updateTournament(id: string, updates: Partial<Tournament>) {
    // Prevent changing game_type after tournament creation
    // This could corrupt data (singles vs doubles have different structures)
    if (updates.game_type !== undefined) {
      console.warn('Attempting to change game_type - this is not allowed after tournament creation');
      delete updates.game_type;
    }
    
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteTournament(id: string) {
    // Delete in correct order to avoid foreign key constraint violations
    
    // 1. First, get all matches for this tournament to delete their notifications
    const { data: matches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', id);
    
    // 2. Delete board notifications that reference matches
    if (matches && matches.length > 0) {
      const matchIds = matches.map(m => m.id);
      const { error: notificationError } = await supabase
        .from('board_notifications')
        .delete()
        .in('match_id', matchIds);
      if (notificationError) throw new Error(`Failed to delete board notifications: ${notificationError.message}`);
    }
    
    // 3. Delete all matches for this tournament
    const { error: matchError } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', id);
    if (matchError) throw new Error(`Failed to delete matches: ${matchError.message}`);
    
    // 4. Delete all groups for this tournament
    const { error: groupError } = await supabase
      .from('groups')
      .delete()
      .eq('tournament_id', id);
    if (groupError) throw new Error(`Failed to delete groups: ${groupError.message}`);
    
    // 5. Delete all boards for this tournament
    const { error: boardError } = await supabase
      .from('boards')
      .delete()
      .eq('tournament_id', id);
    if (boardError) throw new Error(`Failed to delete boards: ${boardError.message}`);
    
    // 6. Delete all players for this tournament
    const { error: playerError } = await supabase
      .from('players')
      .delete()
      .eq('tournament_id', id);
    if (playerError) throw new Error(`Failed to delete players: ${playerError.message}`);
    
    // 7. Finally delete the tournament itself
    const { error: tournamentError } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
    if (tournamentError) throw new Error(`Failed to delete tournament: ${tournamentError.message}`);
  }
};

// Player API
export const PlayerService = {
  async addPlayer(data: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data: result, error } = await supabase
      .from('players')
      .insert([data])
      .select();
    if (error) throw error;
    return result?.[0];
  },

  async getPlayers(tournamentId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPlayer(id: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async updatePlayer(id: string, updates: Partial<Player>) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deletePlayer(id: string) {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getAllPlayers() {
    const { data, error } = await supabase
      .from('players')
      .select('name, email')
      .order('name', { ascending: true });
    if (error) throw error;
    
    // Remove duplicates based on name (case-insensitive)
    const uniquePlayers = new Map<string, { name: string; email?: string }>();
    
    data?.forEach(player => {
      const normalizedName = player.name.toLowerCase().trim();
      if (!uniquePlayers.has(normalizedName)) {
        uniquePlayers.set(normalizedName, {
          name: player.name,
          email: player.email || undefined
        });
      }
    });
    
    return Array.from(uniquePlayers.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }
};

// Match API
export const MatchService = {
  async createMatch(data: Omit<Match, 'id' | 'createdAt'>) {
    const { data: result, error } = await supabase
      .from('matches')
      .insert([data])
      .select();
    if (error) throw error;
    return result?.[0];
  },

  async getMatches(tournamentId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId);
    if (error) throw error;
    return data || [];
  },

  async getGroupMatches(groupId: string) {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('group_id', groupId);
    if (error) throw error;
    return data || [];
  },

  async updateMatch(id: string, updates: Partial<Match>) {
    const { data, error } = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteAllMatches(tournamentId: string) {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId);
    if (error) throw error;
  }
};

// Group API
export const GroupService = {
  async createGroup(data: Omit<Group, 'id' | 'created_at'>) {
    const { data: result, error } = await supabase
      .from('groups')
      .insert([data])
      .select();
    if (error) throw error;
    return result?.[0];
  },

  async getGroups(tournamentId: string) {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('tournament_id', tournamentId);
    if (error) throw error;
    return data || [];
  },

  async updateGroup(groupId: string, updates: Partial<Group>) {
    const { data, error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  async deleteGroups(tournamentId: string) {
    // First delete all matches associated with groups in this tournament
    // This is necessary because matches have a foreign key to groups without CASCADE
    const { error: matchesError } = await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)
      .not('group_id', 'is', null);
    if (matchesError) throw matchesError;
    
    // Now delete the groups
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('tournament_id', tournamentId);
    if (error) throw error;
  }
};

// Board API
export const BoardService = {
  async createBoards(tournamentId: string, count: number) {
    const boards = Array.from({ length: count }, (_, i) => ({
      tournament_id: tournamentId,
      board_number: i + 1,
      status: 'available' as const
    }));
    
    const { data, error } = await supabase
      .from('boards')
      .insert(boards)
      .select();
    if (error) throw error;
    return data || [];
  },

  async createBoardsBatch(tournamentId: string, boards: Array<{ tournament_id: string; board_number: number; status: 'available' }>) {
    const { data, error } = await supabase
      .from('boards')
      .insert(boards)
      .select();
    if (error) throw error;
    return data || [];
  },

  async getBoards(tournamentId: string) {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('board_number', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async updateBoard(id: string, updates: Partial<Board>) {
    const { data, error } = await supabase
      .from('boards')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data?.[0];
  }
};

// DartConnect Integration API
export const DartConnectService = {
  // ===== Pending Match Results =====
  
  async getPendingResults(tournamentId: string, status?: string) {
    let query = supabase
      .from('pending_match_results')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('created_at', { ascending: false });
    
    if (status) {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getPendingResult(id: string) {
    const { data, error } = await supabase
      .from('pending_match_results')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async approvePendingResult(id: string, userId?: string) {
    // Get the pending result
    const { data: pendingResult, error: fetchError } = await supabase
      .from('pending_match_results')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    if (!pendingResult) throw new Error('Pending result not found');
    
    // Update the linked match if it exists
    if (pendingResult.match_id) {
      const winnerId = await this.determineWinnerId(
        pendingResult.match_id,
        pendingResult.player1_legs,
        pendingResult.player2_legs
      );
      
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          player1_legs: pendingResult.player1_legs,
          player2_legs: pendingResult.player2_legs,
          winner_id: winnerId,
          status: 'completed',
          completed_at: pendingResult.match_completed_at
        })
        .eq('id', pendingResult.match_id);
      
      if (matchError) throw matchError;

      // Log the change
      await this.logScoreChange({
        match_id: pendingResult.match_id,
        tournament_id: pendingResult.tournament_id,
        change_type: 'dartconnect_approved',
        new_player1_legs: pendingResult.player1_legs,
        new_player2_legs: pendingResult.player2_legs,
        new_winner_id: winnerId,
        new_status: 'completed',
        source: 'dartconnect',
        pending_result_id: id,
        changed_by: userId || 'user',
        change_reason: 'Approved from DartConnect scraper'
      });
    }
    
    // Update pending result status
    const { data, error } = await supabase
      .from('pending_match_results')
      .update({
        status: 'approved',
        processed_at: new Date().toISOString(),
        processed_by: userId || 'user'
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async rejectPendingResult(id: string, userId?: string, reason?: string) {
    const { data, error } = await supabase
      .from('pending_match_results')
      .update({
        status: 'rejected',
        processed_at: new Date().toISOString(),
        processed_by: userId || 'user',
        matching_notes: reason || 'Rejected by user'
      })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async deletePendingResult(id: string) {
    const { error } = await supabase
      .from('pending_match_results')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // ===== Watch Codes =====
  
  async getMatchWatchCode(matchId: string) {
    const { data, error } = await supabase
      .from('match_watch_codes')
      .select('*')
      .eq('match_id', matchId)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  async setMatchWatchCode(matchId: string, tournamentId: string, watchCode: string, autoAccept: boolean = false) {
    const { data, error } = await supabase
      .from('match_watch_codes')
      .upsert({
        match_id: matchId,
        tournament_id: tournamentId,
        watch_code: watchCode,
        auto_accept_enabled: autoAccept,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'match_id,watch_code'
      })
      .select();
    
    if (error) throw error;
    return data?.[0];
  },

  async deleteMatchWatchCode(id: string) {
    const { error } = await supabase
      .from('match_watch_codes')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getWatchCodesByTournament(tournamentId: string) {
    const { data, error } = await supabase
      .from('match_watch_codes')
      .select('*')
      .eq('tournament_id', tournamentId);
    if (error) throw error;
    return data || [];
  },

  // ===== Score History =====
  
  async getMatchHistory(matchId: string) {
    const { data, error } = await supabase
      .from('match_score_history')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async logScoreChange(changeData: {
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
  }) {
    const { data, error } = await supabase
      .from('match_score_history')
      .insert(changeData)
      .select();
    if (error) throw error;
    return data?.[0];
  },

  // ===== Helper Methods =====
  
  async determineWinnerId(matchId: string, player1Legs: number, player2Legs: number): Promise<string | null> {
    const { data: match } = await supabase
      .from('matches')
      .select('player1_id, player2_id')
      .eq('id', matchId)
      .single();
    
    if (!match) return null;
    
    if (player1Legs > player2Legs) {
      return match.player1_id;
    } else if (player2Legs > player1Legs) {
      return match.player2_id;
    }
    return null;
  },

  // Update tournament DartConnect settings
  async updateDartConnectSettings(tournamentId: string, settings: {
    dartconnect_integration_enabled?: boolean;
    dartconnect_auto_accept_scores?: boolean;
    dartconnect_require_manual_approval?: boolean;
  }) {
    const { data, error } = await supabase
      .from('tournaments')
      .update(settings)
      .eq('id', tournamentId)
      .select();
    if (error) throw error;
    return data?.[0];
  }
};
