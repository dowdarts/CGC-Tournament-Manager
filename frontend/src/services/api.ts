import { supabase } from './supabase';
import { Tournament, Player, Match, Group, Board } from '@/types';

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
