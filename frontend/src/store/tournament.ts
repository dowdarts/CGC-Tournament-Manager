import { create } from 'zustand';
import { Tournament, Player, Match, Group, Board } from '@/types';

interface TournamentStore {
  // State
  currentTournament: Tournament | null;
  players: Player[];
  matches: Match[];
  groups: Group[];
  boards: Board[];
  
  // Tournament actions
  setCurrentTournament: (tournament: Tournament | null) => void;
  updateTournament: (tournament: Tournament) => void;
  
  // Player actions
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  
  // Match actions
  setMatches: (matches: Match[]) => void;
  addMatch: (match: Match) => void;
  updateMatch: (match: Match) => void;
  
  // Group actions
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  
  // Board actions
  setBoards: (boards: Board[]) => void;
  updateBoard: (board: Board) => void;
}

export const useTournamentStore = create<TournamentStore>((set) => ({
  currentTournament: null,
  players: [],
  matches: [],
  groups: [],
  boards: [],
  
  setCurrentTournament: (tournament) => set({ currentTournament: tournament }),
  updateTournament: (tournament) => set({ currentTournament: tournament }),
  
  setPlayers: (players) => set({ players }),
  addPlayer: (player) => set((state) => ({ players: [...state.players, player] })),
  updatePlayer: (player) => set((state) => ({
    players: state.players.map((p) => (p.id === player.id ? player : p))
  })),
  removePlayer: (playerId) => set((state) => ({
    players: state.players.filter((p) => p.id !== playerId)
  })),
  
  setMatches: (matches) => set({ matches }),
  addMatch: (match) => set((state) => ({ matches: [...state.matches, match] })),
  updateMatch: (match) => set((state) => ({
    matches: state.matches.map((m) => (m.id === match.id ? match : m))
  })),
  
  setGroups: (groups) => set({ groups }),
  addGroup: (group) => set((state) => ({ groups: [...state.groups, group] })),
  
  setBoards: (boards) => set({ boards }),
  updateBoard: (board) => set((state) => ({
    boards: state.boards.map((b) => (b.id === board.id ? board : b))
  }))
}));
