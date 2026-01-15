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
    const { error } = await supabase
      .from('tournaments')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
  }
};

// Group API
export const GroupService = {
  async createGroup(data: Omit<Group, 'id' | 'createdAt'>) {
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
