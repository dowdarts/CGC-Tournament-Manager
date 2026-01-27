import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TournamentService, PlayerService, GroupService, MatchService } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Tournament, Player, Group, Match, Board } from '@/types';
import { Trophy, Users, Eye, X, PlayCircle } from 'lucide-react';
import PostRoundRobinConfig from '@/components/PostRoundRobinConfig';
import { EmailService } from '@/services/EmailService';

interface GroupMatchData {
  groupId: string;
  groupLetter: string;
  players: Player[];
  matchesByRound: { [round: number]: Match[] };
  totalRounds: number;
  standings: PlayerStanding[];
}

interface PlayerStanding {
  player: Player;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  legsPlayed: number;
  legsWon: number;
  legsLost: number;
  legDifferential: number;
  points: number;
  isAdvancing: boolean;
  matchHistory: MatchResult[];
}

interface MatchResult {
  won: boolean;
  matchId: string;
}

const GroupStage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [groupMatchData, setGroupMatchData] = useState<GroupMatchData[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [inProgressMatches, setInProgressMatches] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [draggedPlayerIndex, setDraggedPlayerIndex] = useState<{ groupId: string; index: number } | null>(null);
  const [manualStandings, setManualStandings] = useState<{ [groupId: string]: any[] }>({});
  const [activeGroupTabs, setActiveGroupTabs] = useState<{ [groupId: string]: 'standings' | 'matches' }>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Initial setup states (format + boards)
  const [setupComplete, setSetupComplete] = useState(false);
  const [matchFormat, setMatchFormat] = useState<'match_play' | 'set_play'>('match_play');
  const [playStyle, setPlayStyle] = useState<'best_of' | 'play_all'>('best_of');
  const [legsPerMatch, setLegsPerMatch] = useState(5);
  const [setsPerMatch, setSetsPerMatch] = useState(3);
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardCount, setNewBoardCount] = useState(0);
  const [boardGroupAssignments, setBoardGroupAssignments] = useState<Record<string, string>>({});
  const [formatSaved, setFormatSaved] = useState(false);
  
  // Post-round-robin configuration
  const [showPostRRConfig, setShowPostRRConfig] = useState(false);
  const [postRRConfigComplete, setPostRRConfigComplete] = useState(false);
  
  // Knockout bracket states
  const [showKnockoutSetup, setShowKnockoutSetup] = useState(false);
  const [knockoutMatchFormat, setKnockoutMatchFormat] = useState<'set_play' | 'match_play'>('set_play');
  const [advancementCounts, setAdvancementCounts] = useState<{ [groupId: string]: number }>({});
  const [knockoutBracket, setKnockoutBracket] = useState<any[]>([]);
  const [knockoutGenerated, setKnockoutGenerated] = useState(false); // Force cache refresh
  const [knockoutStarted, setKnockoutStarted] = useState(false);
  const [selectedKnockoutMatch, setSelectedKnockoutMatch] = useState<any>(null);
  
  // Store raw data for recalculation
  const [rawGroupData, setRawGroupData] = useState<{
    groups: Group[];
    players: Player[];
    matches: Match[];
  } | null>(null);
  
  // Advancing players preview
  const [showAdvancingPreview, setShowAdvancingPreview] = useState(false);
  const [advancingPlayersPreview, setAdvancingPlayersPreview] = useState<{
    groupLetter: string;
    players: { player: Player; rank: number; points: number; legDiff: number }[];
  }[]>([]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  // Recalculate standings when advancement counts change
  useEffect(() => {
    if (rawGroupData && tournament) {
      processGroupData(rawGroupData.groups, rawGroupData.players, rawGroupData.matches, tournament);
    }
  }, [advancementCounts]);

  const loadData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [tournamentData, playersData, groupsData, matchesData] = await Promise.all([
        TournamentService.getTournament(id),
        PlayerService.getPlayers(id),
        GroupService.getGroups(id),
        MatchService.getMatches(id)
      ]);

      setTournament(tournamentData);
      setAllPlayers(playersData);
      setGroups(groupsData);

      // Load boards
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('*')
        .eq('tournament_id', id);
      
      if (!boardsError && boardsData) {
        setBoards(boardsData);
      }
      
      // Initialize advancement counts from groups data
      const initialAdvancementCounts: { [groupId: string]: number } = {};
      groupsData.forEach(group => {
        initialAdvancementCounts[group.id] = group.advancement_count || Math.ceil(group.player_ids.length / 2);
      });
      setAdvancementCounts(initialAdvancementCounts);
      
      // Check if post-round-robin config is already complete
      if (tournamentData.scoring_system && tournamentData.advancement_rules) {
        setPostRRConfigComplete(true);
      }
      
      // Filter only group stage matches
      const groupMatches = matchesData.filter(m => m.group_id);
      setAllMatches(groupMatches);

      // Populate inProgressMatches from database
      const inProgressMatchIds = new Set(
        groupMatches
          .filter(m => m.status === 'in-progress')
          .map(m => m.id)
      );
      setInProgressMatches(inProgressMatchIds);

      // Store raw data for recalculation when advancementCounts changes
      setRawGroupData({
        groups: groupsData,
        players: playersData,
        matches: groupMatches
      });

      // Process group data
      processGroupData(groupsData, playersData, groupMatches, tournamentData);
    } catch (err) {
      console.error('Failed to load group stage data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processGroupData = (
    groupsData: Group[],
    playersData: Player[],
    matches: Match[],
    tournamentData: Tournament
  ) => {
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    
    const processedGroups = groupsData.map((group, index) => {
      const groupPlayers = playersData.filter(p => group.player_ids.includes(p.id));
      const groupMatches = matches.filter(m => m.group_id === group.id);

      // Organize matches by round
      const matchesByRound: { [round: number]: Match[] } = {};
      let maxRound = 0;

      groupMatches.forEach(match => {
        const round = match.round_number || 1;
        if (!matchesByRound[round]) {
          matchesByRound[round] = [];
        }
        matchesByRound[round].push(match);
        maxRound = Math.max(maxRound, round);
      });

      // Sort matches within each round by board number to maintain consistent order
      Object.keys(matchesByRound).forEach(round => {
        matchesByRound[Number(round)].sort((a, b) => 
          (a.board_number || 0) - (b.board_number || 0)
        );
      });

      // Calculate standings
      const advancingCount = advancementCounts[group.id] || 2;
      const standings = calculateStandings(groupPlayers, groupMatches, group, tournamentData, advancingCount);

      return {
        groupId: group.id,
        groupLetter: groupLetters[index] || `Group ${index + 1}`,
        players: groupPlayers,
        matchesByRound,
        totalRounds: maxRound,
        standings
      };
    });

    setGroupMatchData(processedGroups);
  };

  // Helper function for head-to-head tie-breaking
  const getHeadToHeadResult = (player1Id: string, player2Id: string, matches: Match[]): number => {
    // Find the match between these two players
    const headToHeadMatch = matches.find(match => 
      (match.player1_id === player1Id && match.player2_id === player2Id) ||
      (match.player1_id === player2Id && match.player2_id === player1Id)
    );
    
    if (!headToHeadMatch || headToHeadMatch.status !== 'completed') {
      return 0; // No head-to-head result available
    }
    
    // Determine who won
    if (headToHeadMatch.winner_id === player1Id) {
      return -1; // Player 1 should be ranked higher (negative for descending sort)
    } else if (headToHeadMatch.winner_id === player2Id) {
      return 1; // Player 2 should be ranked higher
    }
    
    return 0; // Match was a tie
  };

  // Knockout bracket crossover logic using standardized tournament seeding
  const generateKnockoutBracket = (advancingPlayersByGroup: { [groupLetter: string]: Player[] }) => {
    const groupLetters = Object.keys(advancingPlayersByGroup).sort();
    const totalGroups = groupLetters.length;
    
    // Standardized seeding map based on tournament standards
    const seedingMap: { [seed: number]: string } = {
      1: 'A1', 2: 'D1', 3: 'C1', 4: 'B1', 5: 'B1', 6: 'C1', 7: 'D1', 8: 'A1',
      9: 'A1', 10: 'D1', 11: 'C1', 12: 'B1', 13: 'B1', 14: 'C1', 15: 'D1', 16: 'A1',
      17: 'A2', 18: 'D2', 19: 'C2', 20: 'B2', 21: 'C2', 22: 'D2', 23: 'A2', 24: 'B2',
      25: 'C2', 26: 'B2', 27: 'A2', 28: 'D2', 29: 'A2', 30: 'B2', 31: 'C2', 32: 'D2',
      33: 'C3', 34: 'B3', 35: 'A3', 36: 'D3', 37: 'D3', 38: 'C3', 39: 'B3', 40: 'A3',
      41: 'B3', 42: 'A3', 43: 'D3', 44: 'C3', 45: 'A3', 46: 'D3', 47: 'B3', 48: 'A3',
      49: 'C4', 50: 'B4', 51: 'A4', 52: 'D4', 53: 'A4', 54: 'B4', 55: 'C4', 56: 'D4',
      57: 'C4', 58: 'D4', 59: 'A4', 60: 'B4', 61: 'D4', 62: 'C4', 63: 'B4', 64: 'A4'
    };
    
    // Collect all advancing players with proper seeding
    const allAdvancingPlayers: (Player & { groupLetter: string; groupRank: number; overallSeed: number })[] = [];
    let seedCounter = 1;
    
    // Get max advancement count to handle different group sizes
    const maxAdvancementCount = Math.max(...Object.values(advancementCounts));
    
    // Assign seeds based on group placement (all 1st place, then all 2nd place, etc.)
    for (let rank = 1; rank <= maxAdvancementCount; rank++) {
      groupLetters.forEach(groupLetter => {
        const groupPlayers = advancingPlayersByGroup[groupLetter];
        if (groupPlayers && groupPlayers[rank - 1]) {
          allAdvancingPlayers.push({
            ...groupPlayers[rank - 1],
            groupLetter,
            groupRank: rank,
            overallSeed: seedCounter++
          });
        }
      });
    }
    
    // Sort by overall seed
    allAdvancingPlayers.sort((a, b) => a.overallSeed - b.overallSeed);
    
    // Generate first round matchups using standard bracket pairing
    const matches: any[] = [];
    const totalPlayers = allAdvancingPlayers.length;
    
    // Standard tournament bracket pairing (1 vs last, 2 vs second-to-last, etc.)
    for (let i = 0; i < totalPlayers / 2; i++) {
      const player1 = allAdvancingPlayers[i];
      const player2 = allAdvancingPlayers[totalPlayers - 1 - i];
      
      // Determine round name based on bracket size
      let roundName = 'Final';
      if (totalPlayers > 2) roundName = 'Semi-Final';
      if (totalPlayers > 4) roundName = 'Quarter-Final';
      if (totalPlayers > 8) roundName = 'Round of 16';
      if (totalPlayers > 16) roundName = 'Round of 32';
      if (totalPlayers > 32) roundName = 'First Round';
      
      matches.push({
        player1: player1,
        player2: player2,
        round: roundName,
        match: i + 1,
        overallSeed1: player1.overallSeed,
        overallSeed2: player2.overallSeed
      });
    }
    
    return matches;
  };

  // Generate preview of advancing players before bracket creation
  const generateAdvancingPreview = async () => {
    const previewData = groupMatchData.map(groupData => {
      const advancingCount = advancementCounts[groupData.groupId] || 2;
      const advancingPlayers = groupData.standings
        .slice(0, advancingCount)
        .map((standing, index) => ({
          player: standing.player,
          rank: index + 1,
          points: standing.points,
          legDiff: standing.legDiff
        }));
      
      return {
        groupLetter: groupData.groupLetter,
        players: advancingPlayers
      };
    });
    
    setAdvancingPlayersPreview(previewData);
    setShowAdvancingPreview(true);

    // Save flags to show standings on live display and the advancement count
    if (id) {
      try {
        const advancePerGroup = advancementCounts[groupMatchData[0]?.groupId] || 2;
        await TournamentService.updateTournament(id, {
          show_standings_on_display: true,
          players_advancing_per_group: advancePerGroup
        });
        console.log('✅ Standings visibility enabled for live display');
        console.log(`✅ Players advancing per group set to: ${advancePerGroup}`);
      } catch (err) {
        console.error('Failed to enable standings display:', err);
      }
    }
  };

  const createKnockoutBracket = async () => {
    if (!id || !tournament) return;
    
    try {
      setStarting(true);
      
      // Calculate total advancing players and format name
      const numGroups = groupMatchData.length;
      const advancePerGroup = advancementCounts[groupMatchData[0]?.groupId] || 2;
      const formatName = `${numGroups}_groups_${advancePerGroup}_advance`;
      
      console.log('🔍 DEBUG advancementCounts:', advancementCounts);
      console.log('🔍 DEBUG groupMatchData[0]?.groupId:', groupMatchData[0]?.groupId);
      console.log('🔍 DEBUG advancePerGroup:', advancePerGroup);
      console.log(`Creating knockout bracket with format: ${formatName}`);
      
      // Save players_advancing_per_group to tournament for live display
      await TournamentService.updateTournament(id, {
        players_advancing_per_group: advancePerGroup
      });
      
      // Call new DartConnect professional seeding SQL function
      const { data: matchesCreated, error } = await supabase.rpc('setup_knockout_bracket', {
        tournament_id: id,
        format_name: formatName
      });
      
      if (error) {
        console.error('Error creating knockout bracket:', error);
        throw error;
      }
      
      console.log('✅ Knockout bracket created with professional seeding:', matchesCreated);
      
      // Update tournament status to knockout
      await TournamentService.updateTournament(id, {
        status: 'knockout'
      });
      
      setKnockoutGenerated(true);
      setShowKnockoutSetup(false);
      setKnockoutStarted(true);
      setShowAdvancingPreview(false);
      
      // Dispatch event to notify KnockoutBracket component
      window.dispatchEvent(new Event('knockoutBracketUpdated'));
      
      const totalPlayers = numGroups * advancePerGroup;
      alert(`Knockout bracket started with DartConnect professional seeding! ${totalPlayers} players advanced. Go to the Knockout Bracket tab to enter scores.`);
      
      // Reload data to show updated tournament state
      await loadData();
    } catch (error) {
      console.error('❌ Error creating knockout bracket:', error);
      alert('Failed to start knockout bracket. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  // Generate complete bracket structure with all rounds (not just first round)
  const generateFullBracketStructure = (firstRoundMatches: any[], totalPlayers: number) => {
    const allMatches: any[] = [];
    let currentRound = 1;
    
    // Calculate number of rounds based on total players
    const numRounds = Math.ceil(Math.log2(totalPlayers));
    
    // Round names based on bracket size
    const getRoundName = (roundNumber: number, totalRounds: number) => {
      const roundsFromEnd = totalRounds - roundNumber;
      if (roundsFromEnd === 0) return 'Final';
      if (roundsFromEnd === 1) return 'Semi-Final';
      if (roundsFromEnd === 2) return 'Quarter-Final';
      if (roundsFromEnd === 3) return 'Round of 16';
      if (roundsFromEnd === 4) return 'Round of 32';
      if (roundsFromEnd === 5) return 'Round of 64';
      return `Round ${roundNumber}`;
    };
    
    // Add first round matches (all quarter-finals for 8 players)
    firstRoundMatches.forEach((match, index) => {
      allMatches.push({
        ...match,
        round: getRoundName(currentRound, numRounds),
        match: index + 1,
        roundNumber: currentRound,
        completed: false,
        player1Score: undefined,
        player2Score: undefined,
        winner: null
      });
    });
    
    // Generate subsequent rounds (empty matches that will be filled as tournament progresses)
    let matchesInCurrentRound = firstRoundMatches.length;
    
    for (let round = 2; round <= numRounds; round++) {
      const matchesInThisRound = Math.floor(matchesInCurrentRound / 2);
      
      for (let i = 0; i < matchesInThisRound; i++) {
        allMatches.push({
          player1: null,
          player2: null,
          round: getRoundName(round, numRounds),
          match: i + 1,
          roundNumber: round,
          completed: false,
          player1Score: undefined,
          player2Score: undefined,
          winner: null,
          overallSeed1: undefined,
          overallSeed2: undefined
        });
      }
      
      matchesInCurrentRound = matchesInThisRound;
    }
    
    return allMatches;
  };

  // Function to advance winner to next round
  const advanceWinner = (bracket: any[], completedMatch: any, winner: any) => {
    const { round, match } = completedMatch;
    
    // Define advancement logic based on round
    let nextRound = '';
    let nextMatchNumber = 0;
    
    if (round === 'Round 1') {
      nextRound = 'Quarterfinals';
      nextMatchNumber = Math.ceil(match / 2);
    } else if (round === 'Quarterfinals') {
      nextRound = 'Semifinals';
      nextMatchNumber = Math.ceil(match / 2);
    } else if (round === 'Semifinals') {
      nextRound = 'Final';
      nextMatchNumber = 1;
    } else if (round === 'Final') {
      // Tournament is complete!
      console.log('Tournament Champion:', winner.name);
      return bracket;
    }
    
    // Find the next match and place the winner
    const updatedBracket = bracket.map(m => {
      if (m.round === nextRound && m.match === nextMatchNumber) {
        // Determine if winner goes to player1 or player2 slot
        if (match % 2 === 1) {
          // Odd match number -> player1 slot
          return { ...m, player1: winner, overallSeed1: completedMatch.winner?.id === completedMatch.player1?.id ? completedMatch.overallSeed1 : completedMatch.overallSeed2 };
        } else {
          // Even match number -> player2 slot
          return { ...m, player2: winner, overallSeed2: completedMatch.winner?.id === completedMatch.player1?.id ? completedMatch.overallSeed1 : completedMatch.overallSeed2 };
        }
      }
      return m;
    });
    
    console.log(`Advanced ${winner.name} from ${round} Match ${match} to ${nextRound} Match ${nextMatchNumber}`);
    return updatedBracket;
  };

  const calculateStandings = (
    players: Player[],
    matches: Match[],
    group: Group,
    tournamentData: Tournament,
    advancingCount: number
  ): PlayerStanding[] => {
    const standings = players.map(player => {
      const playerMatches = matches.filter(
        m => m.player1_id === player.id || m.player2_id === player.id
      );

      let wins = 0;
      let losses = 0;
      let ties = 0;
      let legsWon = 0;
      let legsLost = 0;
      const matchHistory: MatchResult[] = [];

      // Sort matches by round for history
      const sortedMatches = [...playerMatches].sort((a, b) => 
        (a.round_number || 0) - (b.round_number || 0)
      );

      sortedMatches.forEach(match => {
        if (match.status === 'completed') {
          // Calculate leg scores for this player
          const playerIsPlayer1 = match.player1_id === player.id;
          const playerLegs = playerIsPlayer1 ? (match.player1_legs || 0) : (match.player2_legs || 0);
          const opponentLegs = playerIsPlayer1 ? (match.player2_legs || 0) : (match.player1_legs || 0);
          
          legsWon += playerLegs;
          legsLost += opponentLegs;
          
          if (match.winner_id === player.id) {
            wins++;
            matchHistory.push({ won: true, matchId: match.id });
          } else if (match.winner_id) {
            losses++;
            matchHistory.push({ won: false, matchId: match.id });
          } else {
            ties++;
          }
        }
      });

      const matchesPlayed = wins + losses + ties;
      const legsPlayed = legsWon + legsLost;
      const legDifferential = legsWon - legsLost;

      return {
        player,
        matchesPlayed,
        wins,
        losses,
        ties,
        legsPlayed,
        legsWon,
        legsLost,
        legDifferential,
        points: wins * 2, // 2 points per win
        isAdvancing: false,
        matchHistory
      };
    });

    // Sort with proper tie-breaking: points → head-to-head → leg differential → legs won → name
    standings.sort((a, b) => {
      // 1. Points (match wins)
      if (b.points !== a.points) return b.points - a.points;
      
      // 2. Head-to-head result (if tied on points)
      const headToHeadResult = getHeadToHeadResult(a.player.id, b.player.id, matches);
      if (headToHeadResult !== 0) return headToHeadResult;
      
      // 3. Leg differential (+/-)
      if (b.legDifferential !== a.legDifferential) return b.legDifferential - a.legDifferential;
      
      // 4. Total legs won
      if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
      
      // 5. Alphabetical by name
      return a.player.name.localeCompare(b.player.name);
    });

    // Mark advancing players ONLY if group stage is completed
    // advancingCount is passed as parameter from advancementCounts state
    standings.forEach((standing, index) => {
      standing.isAdvancing = tournament?.group_stage_completed === true && index < advancingCount;
    });

    return standings;
  };

  const handleMatchClick = (match: Match) => {
    if (!tournament.group_stage_started) {
      alert('Please start the group stage first before entering scores.');
      return;
    }
    if (tournament.group_stage_completed) {
      alert('Group stage is completed. Scores are locked.');
      return;
    }
    
    // Save current scroll position
    setScrollPosition(window.pageYOffset || document.documentElement.scrollTop);
    
    setSelectedMatch(match);
    // Use legs fields that actually exist in database
    setScore1(match.player1_legs?.toString() || '0');
    setScore2(match.player2_legs?.toString() || '0');
  };

  const handleScoreUpdate = async () => {
    if (!selectedMatch || !id) return;

    try {
      setUpdating(true);

      const p1Score = parseInt(score1) || 0;
      const p2Score = parseInt(score2) || 0;

      const legsToWin = selectedMatch.legs_to_win || 6; // Default best of 11
      const winnerId = p1Score > p2Score ? selectedMatch.player1_id : 
                       p2Score > p1Score ? selectedMatch.player2_id : undefined;

      await MatchService.updateMatch(selectedMatch.id, {
        player1_legs: p1Score,
        player2_legs: p2Score,
        winner_id: winnerId,
        status: winnerId ? 'completed' : 'in-progress'
      });

      // Auto Board Call: If match is completed and auto board call is enabled
      if (winnerId && tournament.auto_board_call_enabled && selectedMatch.board_number) {
        await handleAutoBoardCall(selectedMatch.board_number);
      }

      // Reload data
      await loadData();
      
      // Restore scroll position after a short delay to ensure DOM is updated
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
      
      setSelectedMatch(null);
      setScore1('');
      setScore2('');
    } catch (err) {
      console.error('Failed to update match score:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleAutoBoardCall = async () => {
    if (!id || !tournament) return;

    try {
      const newValue = !tournament.auto_board_call_enabled;
      
      // Update tournament setting
      await TournamentService.updateTournament(id, {
        auto_board_call_enabled: newValue
      });

      // Reload tournament data
      const updatedTournament = await TournamentService.getTournament(id);
      setTournament(updatedTournament);

      // If enabling, automatically mark all Round 1 matches as in-progress
      if (newValue) {
        await markRound1MatchesInProgress();
      }
    } catch (err) {
      console.error('Failed to toggle auto board call:', err);
      alert('Failed to toggle auto board call system');
    }
  };

  const markRound1MatchesInProgress = async () => {
    if (!id || !tournament) return;

    try {
      // Get all Round 1 matches that are scheduled
      const round1Matches = allMatches.filter(m => 
        m.round_number === 1 && 
        m.status === 'scheduled' &&
        m.group_id // Only group stage matches
      );

      console.log(`🤖 Auto Board Call: Marking ${round1Matches.length} Round 1 matches as in-progress`);

      // Mark each match as in-progress and send board calls
      for (const match of round1Matches) {
        await MatchService.updateMatch(match.id, {
          status: 'in-progress'
        });

        // Send board call emails
        if (match.board_number && EmailService.isConfigured()) {
          const player1 = allPlayers.find(p => p.id === match.player1_id);
          const player2 = allPlayers.find(p => p.id === match.player2_id);
          
          if (player1 && player2) {
            const emailPromises = [];
            
            if (player1.email) {
              emailPromises.push(
                EmailService.sendEmail({
                  to: player1.email,
                  subject: `Board Call - ${tournament.name}`,
                  html: getBoardCallEmailTemplate({
                    playerName: player1.name,
                    opponentName: player2.name,
                    boardNumber: match.board_number.toString(),
                    eventName: tournament.name,
                  })
                })
              );
            }
            
            if (player2.email) {
              emailPromises.push(
                EmailService.sendEmail({
                  to: player2.email,
                  subject: `Board Call - ${tournament.name}`,
                  html: getBoardCallEmailTemplate({
                    playerName: player2.name,
                    opponentName: player1.name,
                    boardNumber: match.board_number.toString(),
                    eventName: tournament.name,
                  })
                })
              );
            }
            
            await Promise.all(emailPromises);
          }
        }
      }

      // Reload data to show updated match statuses
      await loadData();
      
      alert(`✅ Auto Board Call activated! ${round1Matches.length} Round 1 matches marked as in-progress.`);
    } catch (err) {
      console.error('Failed to mark Round 1 matches:', err);
      alert('Failed to mark Round 1 matches as in-progress');
    }
  };

  const handleAutoBoardCall = async (boardNumber: number) => {
    if (!id || !tournament) return;

    try {
      console.log(`🤖 Auto Board Call: Looking for next match on board ${boardNumber}`);
      
      // Find the next scheduled match for this board
      // Sort by round number to get the earliest round first
      const nextMatch = allMatches
        .filter(m => 
          m.board_number === boardNumber &&
          m.status === 'scheduled' &&
          m.group_id // Only group stage matches
        )
        .sort((a, b) => (a.round_number || 0) - (b.round_number || 0))[0];

      if (!nextMatch) {
        console.log(`🤖 Auto Board Call: No more matches on board ${boardNumber}`);
        return;
      }

      console.log(`🤖 Auto Board Call: Found next match on board ${boardNumber} - Round ${nextMatch.round_number}`);

      // Mark match as in-progress
      await MatchService.updateMatch(nextMatch.id, {
        status: 'in-progress'
      });

      // Send board call emails
      if (EmailService.isConfigured()) {
        const player1 = allPlayers.find(p => p.id === nextMatch.player1_id);
        const player2 = allPlayers.find(p => p.id === nextMatch.player2_id);
        
        if (player1 && player2) {
          const emailPromises = [];
          
          if (player1.email) {
            emailPromises.push(
              EmailService.sendEmail({
                to: player1.email,
                subject: `Board Call - ${tournament.name}`,
                html: getBoardCallEmailTemplate({
                  playerName: player1.name,
                  opponentName: player2.name,
                  boardNumber: boardNumber.toString(),
                  eventName: tournament.name,
                })
              })
            );
          }
          
          if (player2.email) {
            emailPromises.push(
              EmailService.sendEmail({
                to: player2.email,
                subject: `Board Call - ${tournament.name}`,
                html: getBoardCallEmailTemplate({
                  playerName: player2.name,
                  opponentName: player1.name,
                  boardNumber: boardNumber.toString(),
                  eventName: tournament.name,
                })
              })
            );
          }
          
          await Promise.all(emailPromises);
          console.log(`🤖 Auto Board Call: Sent board call emails for board ${boardNumber}`);
        }
      }
    } catch (err) {
      console.error('Failed to auto board call:', err);
    }
  };

  const handleStartGroupStage = async () => {
    if (!id || !tournament) return;

    try {
      setStarting(true);
      
      // Update tournament to mark group stage as started
      await TournamentService.updateTournament(id, {
        group_stage_started: true
      });

      // Send group assignment emails if email service is configured
      if (EmailService.isConfigured()) {
        const emailAssignments: { email: string; data: any }[] = [];

        // Extract match format details from scoring_system
        let matchFormat = 'Match Play';
        let playStyle = 'Best Of';
        let formatDetails = 'Best of 11 legs';
        
        if (tournament.scoring_system) {
          const format = tournament.scoring_system.roundrobin_format || 'matchplay';
          const style = tournament.scoring_system.roundrobin_play_style || 'best_of';
          
          matchFormat = format === 'matchplay' ? 'Match Play' : 'Set Play';
          playStyle = style === 'best_of' ? 'Best Of' : 'Play All';
          
          if (format === 'matchplay') {
            const legs = tournament.scoring_system.roundrobin_legs_per_match || 11;
            if (style === 'best_of') {
              formatDetails = `Best of ${legs} legs (first to ${Math.ceil(legs / 2)} wins)`;
            } else {
              formatDetails = `Play all ${legs} legs`;
            }
          } else {
            const sets = tournament.scoring_system.roundrobin_sets_per_match || 3;
            const legsPerSet = tournament.scoring_system.roundrobin_legs_per_set || 5;
            if (style === 'best_of') {
              formatDetails = `Best of ${sets} sets (first to ${Math.ceil(sets / 2)} wins), ${legsPerSet} legs per set`;
            } else {
              formatDetails = `Play all ${sets} sets, ${legsPerSet} legs per set`;
            }
          }
        }

        // Collect all players with emails and their group/board info
        for (const groupData of groupMatchData) {
          // Get board numbers assigned to this group
          const { data: groupBoards } = await supabase
            .from('boards')
            .select('board_number')
            .eq('tournament_id', id)
            .contains('assigned_group_ids', [groupData.groupId]);

          const boardNumbers = groupBoards && groupBoards.length > 0
            ? groupBoards.map(b => `Board ${b.board_number}`).join(', ')
            : 'TBD';

          // Add each player with email to the list
          for (const player of groupData.players) {
            if (player.email) {
              emailAssignments.push({
                email: player.email,
                data: {
                  playerName: player.name,
                  eventName: tournament.name,
                  groupName: groupData.groupLetter,
                  boardNumbers: boardNumbers,
                  matchFormat: matchFormat,
                  playStyle: playStyle,
                  formatDetails: formatDetails,
                  date: tournament.date || 'TBD',
                  startTime: tournament.start_time || 'TBD',
                },
              });
            }
          }
        }

        // Send all emails
        if (emailAssignments.length > 0) {
          const results = await EmailService.sendBulkGroupAssignments(emailAssignments);
          console.log(`Group assignment emails: ${results.sent} sent, ${results.failed} failed`);
          if (results.errors.length > 0) {
            console.error('Email errors:', results.errors);
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Failed to start group stage:', err);
      alert('Failed to start group stage');
    } finally {
      setStarting(false);
    }
  };

  const handleMarkInProgress = async (match: Match) => {
    if (inProgressMatches.has(match.id)) {
      // Remove from in-progress and update database
      setInProgressMatches(prev => {
        const newSet = new Set(prev);
        newSet.delete(match.id);
        return newSet;
      });
      
      // Update match status in database (keep original board_number)
      await MatchService.updateMatch(match.id, {
        status: 'scheduled'
      });
    } else {
      // Mark as in-progress using existing board number
      setInProgressMatches(prev => new Set(prev).add(match.id));
      
      // Update match status in database (keep original board_number)
      await MatchService.updateMatch(match.id, {
        status: 'in-progress'
      });
      
      // Send board call emails if board number exists
      if (match.board_number && EmailService.isConfigured() && tournament) {
        const player1 = allPlayers.find(p => p.id === match.player1_id);
        const player2 = allPlayers.find(p => p.id === match.player2_id);
        
        if (player1 && player2) {
          const emailPromises = [];
          
          if (player1.email) {
            emailPromises.push(
              EmailService.sendEmail({
                to: player1.email,
                subject: `Board Call - ${tournament.name}`,
                html: getBoardCallEmailTemplate({
                  playerName: player1.name,
                  opponentName: player2.name,
                  boardNumber: match.board_number.toString(),
                  eventName: tournament.name,
                })
              })
            );
          }
          
          if (player2.email) {
            emailPromises.push(
              EmailService.sendEmail({
                to: player2.email,
                subject: `Board Call - ${tournament.name}`,
                html: getBoardCallEmailTemplate({
                  playerName: player2.name,
                  opponentName: player1.name,
                  boardNumber: match.board_number.toString(),
                  eventName: tournament.name,
                })
              })
            );
          }
          
          try {
            await Promise.all(emailPromises);
          } catch (error) {
            console.error('Failed to send board call emails:', error);
          }
        }
      }
    }
  };

  const handleInputScore = (match: Match) => {
    handleMatchClick(match);
  };

  const getBoardCallEmailTemplate = (data: {
    playerName: string;
    opponentName: string;
    boardNumber: string;
    eventName: string;
  }): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .board-highlight {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 40px;
      margin: 30px 0;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    }
    .board-highlight h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .board-number {
      font-size: 56px;
      font-weight: bold;
      margin: 10px 0;
      text-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    .opponent-box {
      background: white;
      border: 2px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      text-align: center;
    }
    .opponent-box h3 {
      margin: 0 0 10px 0;
      color: #f59e0b;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .opponent-name {
      font-size: 24px;
      font-weight: bold;
      color: #1f2937;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .urgent {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 BOARD CALL</h1>
  </div>
  
  <div class="content">
    <p>Hi <strong>${data.playerName}</strong>,</p>
    
    <div class="urgent">
      <strong>⚠️ Your match is ready to begin!</strong><br>
      Please proceed to your assigned board immediately.
    </div>
    
    <div class="board-highlight">
      <h2>Report To</h2>
      <div class="board-number">Board ${data.boardNumber}</div>
    </div>
    
    <div class="opponent-box">
      <h3>Your Opponent</h3>
      <div class="opponent-name">${data.opponentName}</div>
    </div>
    
    <p style="text-align: center; margin-top: 30px; font-size: 18px; color: #1f2937;">
      <strong>Good luck! 🎯</strong>
    </p>
    
    <div class="footer">
      <p><strong>${data.eventName}</strong></p>
      <p>This is an automated board call from CGC Tournament Manager</p>
    </div>
  </div>
</body>
</html>
    `;
  };

  const handleStartGroupStage_OLD = async () => {
    if (!id || !tournament) return;

    try {
      setStarting(true);
      
      // Update tournament to mark group stage as started
      await TournamentService.updateTournament(id, {
        group_stage_started: true
      });

      // Send group assignment emails if email service is configured
      if (EmailService.isConfigured()) {
        const emailAssignments: { email: string; data: any }[] = [];

        // Extract match format details from scoring_system
        let matchFormat = 'Match Play';
        let playStyle = 'Best Of';
        let formatDetails = 'Best of 11 legs';
        
        if (tournament.scoring_system) {
          const format = tournament.scoring_system.roundrobin_format || 'matchplay';
          const style = tournament.scoring_system.roundrobin_play_style || 'best_of';
          
          matchFormat = format === 'matchplay' ? 'Match Play' : 'Set Play';
          playStyle = style === 'best_of' ? 'Best Of' : 'Play All';
          
          if (format === 'matchplay') {
            const legs = tournament.scoring_system.roundrobin_legs_per_match || 11;
            if (style === 'best_of') {
              formatDetails = `Best of ${legs} legs (first to ${Math.ceil(legs / 2)} wins)`;
            } else {
              formatDetails = `Play all ${legs} legs`;
            }
          } else {
            const sets = tournament.scoring_system.roundrobin_sets_per_match || 3;
            const legsPerSet = tournament.scoring_system.roundrobin_legs_per_set || 5;
            if (style === 'best_of') {
              formatDetails = `Best of ${sets} sets (first to ${Math.ceil(sets / 2)} wins), ${legsPerSet} legs per set`;
            } else {
              formatDetails = `Play all ${sets} sets, ${legsPerSet} legs per set`;
            }
          }
        }

        // Collect all players with emails and their group/board info
        for (const groupData of groupMatchData) {
          // Get board numbers assigned to this group
          const { data: groupBoards } = await supabase
            .from('boards')
            .select('board_number')
            .eq('tournament_id', id)
            .contains('assigned_group_ids', [groupData.groupId]);

          const boardNumbers = groupBoards && groupBoards.length > 0
            ? groupBoards.map(b => `Board ${b.board_number}`).join(', ')
            : 'TBD';

          // Add each player with email to the list
          for (const player of groupData.players) {
            if (player.email) {
              emailAssignments.push({
                email: player.email,
                data: {
                  playerName: player.name,
                  eventName: tournament.name,
                  groupName: groupData.groupLetter,
                  boardNumbers: boardNumbers,
                  matchFormat: matchFormat,
                  playStyle: playStyle,
                  formatDetails: formatDetails,
                  date: tournament.date || 'TBD',
                  startTime: tournament.start_time || 'TBD',
                },
              });
            }
          }
        }

        // Send all emails
        if (emailAssignments.length > 0) {
          const results = await EmailService.sendBulkGroupAssignments(emailAssignments);
          console.log(`Group assignment emails: ${results.sent} sent, ${results.failed} failed`);
          if (results.errors.length > 0) {
            console.error('Email errors:', results.errors);
          }
        }
      }

      await loadData();
    } catch (err) {
      console.error('Failed to start group stage:', err);
      alert('Failed to start group stage');
    } finally {
      setStarting(false);
    }
  };

  const handleEndGroupStage = async () => {
    if (!id || !tournament) return;

    // Validate all matches are complete before ending
    const completedMatches = allMatches.filter(m => m.status === 'completed').length;
    const totalMatches = allMatches.length;
    
    if (completedMatches !== totalMatches || totalMatches === 0) {
      alert(`Cannot end group stage: ${totalMatches - completedMatches} matches still need to be completed.`);
      return;
    }

    try {
      setEnding(true);
      await TournamentService.updateTournament(id, {
        group_stage_completed: true
      });
      await loadData();
      // Show the post-round-robin configuration modal
      setShowPostRRConfig(true);
    } catch (err) {
      console.error('Failed to end group stage:', err);
      alert('Failed to end group stage');
    } finally {
      setEnding(false);
    }
  };

  const handleRestartGroupStage = async () => {
    if (!id || !tournament) return;

    const confirmRestart = confirm(
      'Are you sure you want to restart the group stage?\n\n' +
      'This will:\n' +
      '• Clear all match scores\n' +
      '• Reset all match statuses to scheduled\n' +
      '• Keep the same groups and matches\n' +
      '• Allow you to re-enter all scores\n\n' +
      'This action cannot be undone.'
    );

    if (!confirmRestart) return;

    try {
      setStarting(true);

      // Reset all group stage matches (where group_id is not null)
      const { error: resetError } = await supabase
        .from('matches')
        .update({
          player1_legs: 0,
          player2_legs: 0,
          winner_id: null,
          status: 'scheduled'
        })
        .eq('tournament_id', id)
        .not('group_id', 'is', null);

      if (resetError) throw resetError;

      // Reset tournament status to allow re-entering scores
      await TournamentService.updateTournament(id, {
        group_stage_completed: false
      });

      // Clear any cached data
      setSelectedMatch(null);
      setScore1('');
      setScore2('');
      
      await loadData();
      
      alert('Group stage has been restarted. All scores have been cleared.');
    } catch (error) {
      console.error('Error restarting group stage:', error);
      alert('Failed to restart group stage. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleReactivateGroupStage = async () => {
    if (!id || !tournament) return;

    const confirmReactivate = confirm(
      'Are you sure you want to reactivate the group stage?\n\n' +
      'This will:\n' +
      '• Mark the group stage as not completed\n' +
      '• Allow you to edit match scores again\n' +
      '• Hide knockout bracket configuration\n' +
      '• Return to group stage editing mode\n\n' +
      'You can end the group stage again when ready.'
    );

    if (!confirmReactivate) return;

    try {
      setEnding(true);

      // Set group stage as not completed
      await TournamentService.updateTournament(id, {
        group_stage_completed: false
      });

      // Clear any knockout-related state
      setKnockoutGenerated(false);
      setShowKnockoutSetup(false);
      
      await loadData();
      
      alert('Group stage reactivated. You can now edit match scores again.');
    } catch (error) {
      console.error('Error reactivating group stage:', error);
      alert('Failed to reactivate group stage. Please try again.');
    } finally {
      setEnding(false);
    }
  };

  const handlePostRRConfigSave = async (config: { 
    advancement_count: number; 
    tiebreak_order: string[];
    primary_metric: 'match_wins' | 'leg_wins' | 'tournament_points';
    points_for_win: number;
    points_for_draw: number;
    points_for_loss: number;
  }) => {
    if (!id || !tournament) return;

    try {
      // Save the advancement rules, tiebreaker order, and scoring system
      await TournamentService.updateTournament(id, {
        advancement_rules: `Top ${config.advancement_count} from each group advance to knockout bracket`,
        scoring_system: {
          primary_metric: config.primary_metric,
          points_for_win: config.points_for_win,
          points_for_draw: config.points_for_draw,
          points_for_loss: config.points_for_loss,
          tiebreak_order: config.tiebreak_order
        }
      });
      
      setPostRRConfigComplete(true);
      setShowPostRRConfig(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save post-round-robin config:', err);
      alert('Failed to save configuration');
    }
  };

  const getMatchDisplay = (match: Match, players: Player[]) => {
    const player1 = players.find(p => p.id === match.player1_id);
    const player2 = players.find(p => p.id === match.player2_id);

    return {
      player1Name: player1?.name || 'TBD',
      player2Name: player2?.name || 'TBD',
      score: match.status === 'completed' || match.status === 'in-progress'
        ? `${match.player1_legs || 0}-${match.player2_legs || 0}`
        : 'vs',
      winner: match.winner_id
    };
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Loading group stage...</div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div>Tournament not found</div>
      </div>
    );
  }

  // Show initial setup if no matches created yet
  if (allMatches.length === 0 && !setupComplete) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '10px' }}>Group Stage Setup</h2>
          <p style={{ color: '#94a3b8' }}>
            Configure match format and assign boards before starting the group stage
          </p>
        </div>

        {/* Format Selection */}
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Match Format</h3>
          
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Format Type</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={`button ${matchFormat === 'match_play' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setMatchFormat('match_play')}
              >
                Match Play
              </button>
              <button
                className={`button ${matchFormat === 'set_play' ? 'button-primary' : 'button-secondary'}`}
                onClick={() => setMatchFormat('set_play')}
              >
                Set Play
              </button>
            </div>
          </div>

          {matchFormat === 'match_play' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Game Style</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className={`button ${playStyle === 'best_of' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => setPlayStyle('best_of')}
                  >
                    Best Of
                  </button>
                  <button
                    className={`button ${playStyle === 'play_all' ? 'button-primary' : 'button-secondary'}`}
                    onClick={() => setPlayStyle('play_all')}
                  >
                    Play All
                  </button>
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">
                  {playStyle === 'best_of' ? 'Best of X Legs' : 'Play All X Legs'}
                </label>
                <input
                  type="number"
                  className="input"
                  value={legsPerMatch}
                  onChange={(e) => setLegsPerMatch(parseInt(e.target.value))}
                  min="1"
                  max="21"
                  style={{ maxWidth: '200px' }}
                />
                {playStyle === 'best_of' && (
                  <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    First to {Math.ceil(legsPerMatch / 2)} wins
                  </p>
                )}
              </div>
            </>
          )}

          {matchFormat === 'set_play' && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Best of X Sets</label>
                <input
                  type="number"
                  className="input"
                  value={setsPerMatch}
                  onChange={(e) => setSetsPerMatch(parseInt(e.target.value))}
                  min="1"
                  max="11"
                  style={{ maxWidth: '200px' }}
                />
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  First to {Math.ceil(setsPerMatch / 2)} sets wins
                </p>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label className="form-label">Best of X Legs per Set</label>
                <input
                  type="number"
                  className="input"
                  value={legsPerMatch}
                  onChange={(e) => setLegsPerMatch(parseInt(e.target.value))}
                  min="1"
                  max="21"
                  style={{ maxWidth: '200px' }}
                />
                <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                  First to {Math.ceil(legsPerMatch / 2)} legs per set
                </p>
              </div>
            </>
          )}

          <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '4px', fontSize: '13px', color: '#1e40af' }}>
            <strong>Format Summary:</strong>
            {matchFormat === 'match_play' && playStyle === 'best_of' && (
              <p style={{ margin: '4px 0 0 0' }}>Match Play - Best of {legsPerMatch} legs (first to {Math.ceil(legsPerMatch / 2)})</p>
            )}
            {matchFormat === 'match_play' && playStyle === 'play_all' && (
              <p style={{ margin: '4px 0 0 0' }}>Match Play - Play all {legsPerMatch} legs</p>
            )}
            {matchFormat === 'set_play' && (
              <p style={{ margin: '4px 0 0 0' }}>Set Play - Best of {setsPerMatch} sets, first to {Math.ceil(legsPerMatch / 2)} legs per set</p>
            )}
          </div>
        </div>

        {/* Board Assignment */}
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Board Assignment</h3>
          <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
            Assign boards to groups for balanced rotation during matches
          </p>

          {/* Add Boards */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="input"
                value={newBoardCount}
                onChange={(e) => setNewBoardCount(parseInt(e.target.value) || 0)}
                min="0"
                max="20"
                placeholder="Number of boards"
                style={{ width: '150px' }}
              />
              <button 
                className="button button-primary"
                onClick={async () => {
                  if (!id || newBoardCount < 1) return;
                  try {
                    const newBoards = [];
                    for (let i = 0; i < newBoardCount; i++) {
                      const board = await supabase
                        .from('boards')
                        .insert({
                          tournament_id: id,
                          board_number: boards.length + i + 1,
                          status: 'available'
                        })
                        .select()
                        .single();
                      if (board.data) newBoards.push(board.data);
                    }
                    setBoards([...boards, ...newBoards]);
                    setNewBoardCount(0);
                  } catch (err) {
                    console.error('Error adding boards:', err);
                  }
                }}
                disabled={newBoardCount < 1}
              >
                Add {newBoardCount} Board{newBoardCount !== 1 ? 's' : ''}
              </button>
              <span style={{ marginLeft: 'auto', color: '#64748b', fontSize: '14px' }}>
                Total boards: <strong>{boards.length}</strong>
              </span>
            </div>
          </div>

          {/* Board Assignment Table */}
          {boards.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Board</th>
                      <th>Assigned Group</th>
                    </tr>
                  </thead>
                  <tbody>
                    {boards.map(board => (
                      <tr key={board.id}>
                        <td style={{ fontWeight: 'bold' }}>Board {board.board_number}</td>
                        <td>
                          <select
                            className="input"
                            value={boardGroupAssignments[board.id] || ''}
                            onChange={(e) => setBoardGroupAssignments(prev => ({
                              ...prev,
                              [board.id]: e.target.value
                            }))}
                            style={{ maxWidth: '300px' }}
                          >
                            <option value="">Unassigned</option>
                            {groups.map(group => (
                              <option key={group.id} value={group.id}>
                                {group.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '4px', fontSize: '13px', color: '#1e40af' }}>
            <strong>💡 Board Assignment Tips:</strong>
            <ul style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '0' }}>
              <li>Small groups (2-3 players): 1 board recommended</li>
              <li>Medium groups (4-6 players): 2 boards recommended</li>
              <li>Large groups (7+ players): 3 or more boards recommended</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="card">
          <button
            className="button button-success button-large"
            onClick={async () => {
              if (!id) return;
              try {
                // Save format to tournament
                await TournamentService.updateTournament(id, {
                  match_format: matchFormat,
                  play_style: playStyle,
                  legs_per_match: legsPerMatch,
                  sets_per_match: matchFormat === 'set_play' ? setsPerMatch : null
                });

                // Save board assignments
                for (const board of boards) {
                  const assignedGroupId = boardGroupAssignments[board.id];
                  await supabase
                    .from('boards')
                    .update({ 
                      assigned_group_ids: assignedGroupId ? [assignedGroupId] : []
                    })
                    .eq('id', board.id);
                }

                setFormatSaved(true);
                setSetupComplete(true);
                // Reload to create matches
                window.location.reload();
              } catch (err) {
                console.error('Error saving setup:', err);
                alert('Failed to save format and board assignments');
              }
            }}
            style={{ width: '100%' }}
          >
            Save Format and Board Assignment
          </button>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '12px', textAlign: 'center' }}>
            After saving, the group stage matches will be generated
          </p>
        </div>
      </div>
    );
  }

  // Show post-round-robin configuration modal
  if (showPostRRConfig && tournament.group_stage_completed) {
    return (
      <div style={{ padding: '20px' }}>
        <PostRoundRobinConfig 
          tournament={tournament}
          onSave={handlePostRRConfigSave}
          onCancel={() => setShowPostRRConfig(false)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={28} />
          Group Stage - Round Robin
        </h2>
        <p style={{ color: '#94a3b8' }}>
          {!tournament.group_stage_started && 'Review matches, then click "Start Group Stage" to begin'}
          {tournament.group_stage_started && !tournament.group_stage_completed && 'Click on any match to update scores'}
          {tournament.group_stage_completed && 'Group stage completed - see standings below'}
        </p>
      </div>

      {/* Start/End Group Stage Buttons */}
      {!tournament.group_stage_started && groupMatchData.length > 0 && (
        <div className="card" style={{ marginBottom: '20px', background: '#f0fdf4', border: '2px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: 0, color: '#15803d', marginBottom: '8px' }}>Ready to Start?</h4>
              <p style={{ margin: 0, color: '#15803d', fontSize: '14px' }}>
                Review the matches below. Once started, players cannot be moved between groups.
              </p>
            </div>
            <button
              onClick={handleStartGroupStage}
              disabled={starting}
              className="button button-success"
              style={{ whiteSpace: 'nowrap' }}
            >
              {starting ? 'Starting...' : 'Start Group Stage'}
            </button>
          </div>
        </div>
      )}

      {tournament.group_stage_started && !tournament.group_stage_completed && (
        <div className="card" style={{ marginBottom: '20px', background: '#fef3c7', border: '2px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ flex: 1, marginRight: '20px' }}>
              <h4 style={{ margin: 0, color: '#b45309', marginBottom: '8px' }}>Group Stage In Progress</h4>
              <p style={{ margin: 0, color: '#b45309', fontSize: '14px', marginBottom: '12px' }}>
                Enter all match scores to complete the group stage.
              </p>
              
              {/* Auto Board Call Toggle */}
              <div style={{ 
                marginBottom: '12px', 
                padding: '10px', 
                background: 'rgba(245, 158, 11, 0.1)', 
                borderRadius: '6px',
                border: '1px solid rgba(245, 158, 11, 0.3)'
              }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#b45309'
                }}>
                  <input
                    type="checkbox"
                    checked={tournament.auto_board_call_enabled || false}
                    onChange={handleToggleAutoBoardCall}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  🤖 Auto Board Call System
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'normal',
                    marginLeft: 'auto',
                    color: tournament.auto_board_call_enabled ? '#22c55e' : '#64748b'
                  }}>
                    {tournament.auto_board_call_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </label>
                <p style={{ 
                  margin: '6px 0 0 28px', 
                  fontSize: '12px', 
                  color: '#92400e',
                  lineHeight: '1.4'
                }}>
                  Automatically marks Round 1 matches as in-progress and sends board calls. When a match completes, 
                  the next match on that board is automatically called.
                </p>
              </div>
              
              {/* Progress Bar */}
              {(() => {
                const completedMatches = allMatches.filter(m => m.status === 'completed').length;
                const totalMatches = allMatches.length;
                const progressPercentage = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;
                
                return (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      marginBottom: '4px' 
                    }}>
                      <span style={{ fontSize: '12px', color: '#b45309', fontWeight: '500' }}>
                        Match Completion
                      </span>
                      <span style={{ fontSize: '12px', color: '#b45309' }}>
                        {completedMatches}/{totalMatches} matches
                      </span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      backgroundColor: '#fed7aa', 
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${progressPercentage}%`,
                        height: '100%',
                        backgroundColor: progressPercentage === 100 ? '#22c55e' : '#f59e0b',
                        borderRadius: '4px',
                        transition: 'all 0.3s ease-in-out'
                      }} />
                    </div>
                    <div style={{ fontSize: '11px', color: '#b45309', marginTop: '2px' }}>
                      {progressPercentage.toFixed(1)}% complete
                    </div>
                  </div>
                );
              })()}
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleRestartGroupStage}
                disabled={starting}
                className="button button-danger"
                style={{ whiteSpace: 'nowrap' }}
                title="Clear all scores and restart group stage"
              >
                {starting ? 'Restarting...' : 'Restart Group Stage'}
              </button>
              
              {(() => {
                const completedMatches = allMatches.filter(m => m.status === 'completed').length;
                const totalMatches = allMatches.length;
                const allMatchesComplete = completedMatches === totalMatches && totalMatches > 0;
                
                return allMatchesComplete ? (
                  <button
                    onClick={handleEndGroupStage}
                    disabled={ending}
                    className="button button-success"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {ending ? 'Ending...' : 'End Group Stage'}
                  </button>
                ) : (
                  <button
                    disabled={true}
                    className="button button-secondary"
                    style={{ 
                      whiteSpace: 'nowrap',
                      opacity: 0.6,
                      cursor: 'not-allowed'
                    }}
                    title={`Complete all ${totalMatches - completedMatches} remaining matches to end group stage`}
                  >
                    End Group Stage
                  </button>
                );
              })()} 
            </div>
          </div>
        </div>
      )}

      {tournament.group_stage_completed && (() => {
        const completedMatches = allMatches.filter(m => m.status === 'completed').length;
        const totalMatches = allMatches.length;
        const allMatchesComplete = completedMatches === totalMatches && totalMatches > 0;
        
        // If marked complete but matches aren't done, show warning instead
        if (!allMatchesComplete) {
          return (
            <div className="card" style={{ marginBottom: '20px', background: '#fef2f2', border: '2px solid #ef4444' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Trophy size={20} style={{ color: '#991b1b' }} />
                  <div>
                    <h4 style={{ margin: 0, color: '#991b1b', marginBottom: '4px' }}>Group Stage Incomplete</h4>
                    <p style={{ margin: 0, color: '#991b1b', fontSize: '14px' }}>
                      Group stage was marked as completed, but {totalMatches - completedMatches} matches still need scores. Complete all matches to proceed.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleReactivateGroupStage}
                  disabled={ending}
                  className="button button-secondary"
                  style={{ whiteSpace: 'nowrap' }}
                  title="Mark group stage as not completed and allow score editing"
                >
                  {ending ? 'Reactivating...' : 'Reactivate Group Stage'}
                </button>
              </div>
            </div>
          );
        }
        
        // All matches complete - show completion banner
        return (
          <div className="card" style={{ marginBottom: '20px', background: '#dbeafe', border: '2px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trophy size={20} style={{ color: '#1e40af' }} />
                <div>
                  <h4 style={{ margin: 0, color: '#1e40af', marginBottom: '4px' }}>Group Stage Completed</h4>
                  <p style={{ margin: 0, color: '#1e40af', fontSize: '14px' }}>
                    Final standings shown below with advancing players highlighted.
                  </p>
                </div>
              </div>
              <button
                onClick={handleReactivateGroupStage}
                disabled={ending}
                className="button button-secondary"
                style={{ whiteSpace: 'nowrap' }}
                title="Mark group stage as not completed and allow score editing"
              >
                {ending ? 'Reactivating...' : 'Reactivate Group Stage'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Knockout Configuration - Inline */}
      {tournament.group_stage_completed && !knockoutGenerated && (() => {
        const completedMatches = allMatches.filter(m => m.status === 'completed').length;
        const totalMatches = allMatches.length;
        const allMatchesComplete = completedMatches === totalMatches && totalMatches > 0;
        
        return (
          <div className="card" style={{ 
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            border: '2px solid #3b82f6',
            padding: '0'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
              color: 'white',
              padding: '20px 30px',
              borderRadius: '10px 10px 0 0'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Trophy size={24} />
                Knockout Bracket Configuration
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Configure match format and advancing players per group before generating the bracket
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '25px' }}>
              {/* Match Format Selection */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#e2e8f0', fontSize: '16px' }}>Match Format</h4>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="set_play"
                      checked={knockoutMatchFormat === 'set_play'}
                      onChange={(e) => setKnockoutMatchFormat(e.target.value as 'set_play' | 'match_play')}
                      style={{ marginRight: '5px' }}
                    />
                    <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Set Play</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="match_play"
                      checked={knockoutMatchFormat === 'match_play'}
                      onChange={(e) => setKnockoutMatchFormat(e.target.value as 'set_play' | 'match_play')}
                      style={{ marginRight: '5px' }}
                    />
                    <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Match Play</span>
                  </label>
                </div>
              </div>

              {/* Advancement Counts */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#e2e8f0', fontSize: '16px' }}>Advancing Players from Each Group</h4>
                <div style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid #22c55e',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '400px'
                }}>
                  <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                    Number of players advancing from each group
                  </label>
                  
                  {(() => {
                    const numGroups = groupMatchData.length;
                    const maxPlayersPerGroup = Math.min(...groupMatchData.map(g => g.players.length));
                    
                    // Show all standard advancement options: 1, 2, 4, 8, 16
                    const validOptions = [1, 2, 4, 8, 16];
                    
                    const currentValue = advancementCounts[groupMatchData[0]?.groupId] || 2;
                    
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <select
                          value={currentValue}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value);
                            const updatedCounts: { [groupId: string]: number } = {};
                            groupMatchData.forEach(group => {
                              updatedCounts[group.groupId] = newValue;
                            });
                            setAdvancementCounts(updatedCounts);
                          }}
                          style={{
                            background: '#1e293b',
                            color: '#ffffff',
                            border: '2px solid #22c55e',
                            borderRadius: '6px',
                            padding: '12px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            width: '100%'
                          }}
                        >
                          {validOptions.map(option => {
                            const totalPlayers = option * numGroups;
                            return (
                              <option key={option} value={option}>
                                {option} players per group → {totalPlayers} total in bracket
                              </option>
                            );
                          })}
                        </select>
                        
                        <div style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                          {numGroups} groups × {currentValue} players each = {currentValue * numGroups} players in knockout bracket
                        </div>
                        
                        {(() => {
                          const totalPlayers = currentValue * numGroups;
                          
                          // Check if advancement count exceeds smallest group size
                          if (currentValue > maxPlayersPerGroup) {
                            return (
                              <div style={{ fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>
                                ⚠️ Warning: Cannot advance {currentValue} players per group. Smallest group has only {maxPlayersPerGroup} player(s).
                              </div>
                            );
                          }
                          
                          // Check if total is not a power of 2
                          if (totalPlayers < 4 || totalPlayers > 128 || (totalPlayers & (totalPlayers - 1)) !== 0) {
                            return (
                              <div style={{ fontSize: '12px', color: '#ef4444', fontStyle: 'italic' }}>
                                ⚠️ Warning: {totalPlayers} players is not ideal for knockout brackets. 
                                Recommended: 4, 8, 16, 32, 64, or 128 players total.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Generate and Preview Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1px solid #475569' }}>
                {/* Apply to Standings Preview Button */}
                <button
                  className="button"
                  disabled={!allMatchesComplete || starting}
                  onClick={generateAdvancingPreview}
                  style={{
                    background: allMatchesComplete && !starting ? '#3b82f6' : '#cbd5e1',
                    borderColor: allMatchesComplete && !starting ? '#3b82f6' : '#cbd5e1',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: allMatchesComplete && !starting ? 1 : 0.6,
                    cursor: allMatchesComplete && !starting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title={!allMatchesComplete ? `Complete all ${totalMatches - completedMatches} remaining matches first` : 'Preview which players will advance'}
                >
                  <Eye size={18} />
                  Apply to Standings
                </button>
                
                {/* Start Knockout Bracket Button */}
                <button
                  className="button button-primary"
                  disabled={!allMatchesComplete || starting}
                  onClick={createKnockoutBracket}
                  style={{
                    background: allMatchesComplete && !starting ? '#22c55e' : '#cbd5e1',
                    borderColor: allMatchesComplete && !starting ? '#22c55e' : '#cbd5e1',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    opacity: allMatchesComplete && !starting ? 1 : 0.6,
                    cursor: allMatchesComplete && !starting ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  title={!allMatchesComplete ? `Complete all ${totalMatches - completedMatches} remaining matches first` : ''}
                >
                  {starting ? (
                    <>⏳ Starting...</>
                  ) : (
                    <>
                      <Trophy size={18} />
                      Start Knockout Bracket
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Old knockout section - Remove this */}
      {false && tournament.group_stage_completed && !knockoutGenerated && postRRConfigComplete && (() => {
        const completedMatches = allMatches.filter(m => m.status === 'completed').length;
        const totalMatches = allMatches.length;
        const allMatchesComplete = completedMatches === totalMatches && totalMatches > 0;
        
        return (
          <div className="card" style={{ marginBottom: '20px', background: allMatchesComplete ? '#f0fdf4' : '#fef3c7', border: allMatchesComplete ? '2px solid #22c55e' : '2px solid #f59e0b' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, color: allMatchesComplete ? '#15803d' : '#b45309', marginBottom: '8px' }}>
                  {allMatchesComplete ? 'Ready for Knockout Stage' : 'Complete All Matches First'}
                </h4>
                <p style={{ margin: 0, color: allMatchesComplete ? '#15803d' : '#b45309', fontSize: '14px' }}>
                  {allMatchesComplete 
                    ? 'Configuration complete. Click to generate knockout bracket.'
                    : `Complete all ${totalMatches - completedMatches} remaining matches before starting knockout stage.`}
                </p>
              </div>
              <button
                className="button button-primary"
                disabled={!allMatchesComplete || starting}
                onClick={createKnockoutBracket}
                style={{
                  background: allMatchesComplete && !starting ? '#22c55e' : '#cbd5e1',
                  borderColor: allMatchesComplete && !starting ? '#22c55e' : '#cbd5e1',
                  color: 'white',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: allMatchesComplete && !starting ? 1 : 0.6,
                  cursor: allMatchesComplete && !starting ? 'pointer' : 'not-allowed'
                }}
                title={!allMatchesComplete ? `Complete all ${totalMatches - completedMatches} remaining matches first` : ''}
              >
                {starting ? '⏳ Starting...' : '🏆 Start Knockout Bracket'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Knockout Setup Modal - REMOVED - Now happens in Knockout tab */}
      {false && showKnockoutSetup && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            maxWidth: '600px',
            width: '95%',
            padding: '0',
            borderRadius: '12px',
            border: '2px solid #22c55e',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              color: 'white',
              padding: '20px 30px',
              borderRadius: '10px 10px 0 0',
              borderBottom: '1px solid #475569'
            }}>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Knockout Bracket Setup</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Configure match format and advancing players per group
              </p>
            </div>

            {/* Content */}
            <div style={{ padding: '25px' }}>
              {/* Match Format Selection */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#e2e8f0', fontSize: '16px' }}>Match Format</h4>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="set_play"
                      checked={knockoutMatchFormat === 'set_play'}
                      onChange={(e) => setKnockoutMatchFormat(e.target.value as 'set_play' | 'match_play')}
                      style={{ marginRight: '5px' }}
                    />
                    <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Set Play</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      value="match_play"
                      checked={knockoutMatchFormat === 'match_play'}
                      onChange={(e) => setKnockoutMatchFormat(e.target.value as 'set_play' | 'match_play')}
                      style={{ marginRight: '5px' }}
                    />
                    <span style={{ color: '#e2e8f0', fontSize: '14px' }}>Match Play</span>
                  </label>
                </div>
              </div>

              {/* Advancement Counts */}
              <div style={{ marginBottom: '25px' }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#e2e8f0', fontSize: '16px' }}>Advancing Players per Group</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  {groupMatchData.map(group => (
                    <div key={group.groupId} style={{
                      background: 'rgba(34, 197, 94, 0.1)',
                      border: '1px solid #22c55e',
                      borderRadius: '8px',
                      padding: '15px'
                    }}>
                      <label style={{ display: 'block', color: '#e2e8f0', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                        Group {group.groupLetter}
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={() => {
                            const current = advancementCounts[group.groupId] || 2;
                            if (current > 1) {
                              setAdvancementCounts(prev => ({
                                ...prev,
                                [group.groupId]: current - 1
                              }));
                            }
                          }}
                          style={{
                            background: '#64748b',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '4px',
                            width: '30px',
                            height: '30px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                          onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                        >
                          −
                        </button>
                        
                        <input
                          type="number"
                          min="1"
                          max={group.players.length}
                          value={advancementCounts[group.groupId] || 2}
                          onChange={(e) => setAdvancementCounts(prev => ({
                            ...prev,
                            [group.groupId]: parseInt(e.target.value) || 1
                          }))}
                          onFocus={(e) => e.target.select()}
                          style={{
                            background: '#1e293b',
                            color: '#ffffff',
                            border: '1px solid #22c55e',
                            borderRadius: '4px',
                            padding: '8px',
                            width: '60px',
                            fontSize: '14px',
                            textAlign: 'center'
                          }}
                        />
                        
                        <button
                          type="button"
                          onClick={() => {
                            const current = advancementCounts[group.groupId] || 2;
                            if (current < group.players.length) {
                              setAdvancementCounts(prev => ({
                                ...prev,
                                [group.groupId]: current + 1
                              }));
                            }
                          }}
                          style={{
                            background: '#64748b',
                            border: 'none',
                            color: '#ffffff',
                            borderRadius: '4px',
                            width: '30px',
                            height: '30px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                          onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                        >
                          +
                        </button>
                        
                        <span style={{ color: '#94a3b8', fontSize: '12px' }}>of {group.players.length}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '20px', borderTop: '1px solid #475569' }}>
                <button
                  className="button button-secondary"
                  onClick={() => setShowKnockoutSetup(false)}
                  style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={createKnockoutBracket}
                  style={{
                    background: '#22c55e',
                    borderColor: '#22c55e',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Generate Knockout Bracket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Group Stage Content */}
      {groupMatchData.length === 0 ? (
        <div className="alert alert-info">
          No group stage matches found. Please generate the group stage first.
        </div>
      ) : (
        <div>
          {groupMatchData.map((groupData) => {
            const currentTab = activeGroupTabs[groupData.groupId] || 'standings';
            
            return (
              <div key={groupData.groupId} className="card" style={{ marginBottom: '40px' }}>
                <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={24} />
                  Group {groupData.groupLetter}
                </h3>

                {/* Tab Navigation */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginBottom: '20px',
                  borderBottom: '2px solid #334155'
                }}>
                  <button
                    onClick={() => setActiveGroupTabs(prev => ({ 
                      ...prev, 
                      [groupData.groupId]: 'standings' 
                    }))}
                    style={{
                      padding: '10px 20px',
                      background: currentTab === 'standings' ? '#3b82f6' : 'transparent',
                      color: currentTab === 'standings' ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderBottom: currentTab === 'standings' ? '3px solid #3b82f6' : '3px solid transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Standings
                  </button>
                  <button
                    onClick={() => setActiveGroupTabs(prev => ({ 
                      ...prev, 
                      [groupData.groupId]: 'matches' 
                    }))}
                    style={{
                      padding: '10px 20px',
                      background: currentTab === 'matches' ? '#3b82f6' : 'transparent',
                      color: currentTab === 'matches' ? '#fff' : '#94a3b8',
                      border: 'none',
                      borderBottom: currentTab === 'matches' ? '3px solid #3b82f6' : '3px solid transparent',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  >
                    Matches
                  </button>
                </div>

                {/* Standings Tab Content */}
                {currentTab === 'standings' && (
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      padding: '10px 15px',
                      marginBottom: '15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}>
                      <span style={{ fontSize: '16px' }}>ℹ️</span>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        <strong>Admin Override:</strong> Drag and drop players to manually adjust seeding before creating the knockout bracket
                      </span>
                    </div>
                    <table className="table" style={{ minWidth: '700px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
                          <th>Participant</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>MP</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>MW</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>ML</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>LP</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>LW</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>LL</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>+/-</th>
                          <th style={{ width: '70px', textAlign: 'center' }}>Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(manualStandings[groupData.groupId] || groupData.standings).map((standing, index) => (
                          <tr 
                            key={standing.player.id}
                            draggable={true}
                            onDragStart={(e) => {
                              setDraggedPlayerIndex({ groupId: groupData.groupId, index });
                              e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = '1';
                              setDraggedPlayerIndex(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.style.background = '';
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.style.background = '';
                              
                              if (draggedPlayerIndex && draggedPlayerIndex.groupId === groupData.groupId) {
                                const currentStandings = manualStandings[groupData.groupId] || [...groupData.standings];
                                const newStandings = [...currentStandings];
                                const draggedItem = newStandings[draggedPlayerIndex.index];
                                newStandings.splice(draggedPlayerIndex.index, 1);
                                newStandings.splice(index, 0, draggedItem);
                                
                                setManualStandings({
                                  ...manualStandings,
                                  [groupData.groupId]: newStandings
                                });
                              }
                            }}
                            style={{ 
                              cursor: 'move',
                              transition: 'all 0.2s',
                              userSelect: 'none'
                            }}
                          >
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <span style={{ color: '#64748b', fontSize: '18px' }}>⋮⋮</span>
                                {index + 1}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {standing.player.name}
                                {standing.isAdvancing && (
                                  <span style={{
                                    background: '#3b82f6',
                                    color: '#fff',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    fontWeight: '600'
                                  }}>
                                    ADVANCED
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>{standing.matchesPlayed}</td>
                            <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{standing.wins}</td>
                            <td style={{ textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{standing.losses}</td>
                            <td style={{ textAlign: 'center' }}>{standing.legsPlayed}</td>
                            <td style={{ textAlign: 'center', color: '#10b981' }}>{standing.legsWon}</td>
                            <td style={{ textAlign: 'center', color: '#ef4444' }}>{standing.legsLost}</td>
                            <td style={{ 
                              textAlign: 'center', 
                              fontWeight: 'bold',
                              color: standing.legDifferential > 0 ? '#10b981' : standing.legDifferential < 0 ? '#ef4444' : '#64748b'
                            }}>
                              {standing.legDifferential > 0 ? '+' : ''}{standing.legDifferential}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{standing.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Matches Tab Content */}
                {currentTab === 'matches' && (
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: `repeat(${groupData.totalRounds}, 1fr)`,
                      gap: '20px',
                      minWidth: '600px'
                    }}>
                      {Array.from({ length: groupData.totalRounds }, (_, i) => i + 1).map(round => {
                        const roundMatches = groupData.matchesByRound[round] || [];
                        
                        return (
                          <div key={round}>
                            <h4 style={{ 
                              marginBottom: '15px', 
                              fontSize: '14px',
                              textAlign: 'center',
                              color: '#94a3b8',
                              fontWeight: '600'
                            }}>
                              Round {round}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {roundMatches.map(match => {
                                const display = getMatchDisplay(match, groupData.players);
                                // Enhanced winner detection - use winner_id if available, otherwise compare legs
                                const player1Legs = match.player1_legs || 0;
                                const player2Legs = match.player2_legs || 0;
                                const isWinner1 = match.winner_id === match.player1_id || 
                                  (match.status === 'completed' && player1Legs > player2Legs && !match.winner_id);
                                const isWinner2 = match.winner_id === match.player2_id || 
                                  (match.status === 'completed' && player2Legs > player1Legs && !match.winner_id);
                                
                                return (
                                  <div
                                    key={match.id}
                                    onClick={() => handleInputScore(match)}
                                    style={{
                                      background: '#1e293b',
                                      borderRadius: '8px',
                                      padding: '12px',
                                      border: inProgressMatches.has(match.id) ? '2px solid #ff6600' : '1px solid #334155',
                                      transition: 'all 0.2s',
                                      minHeight: '120px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between',
                                      position: 'relative',
                                      boxShadow: inProgressMatches.has(match.id) ? '0 0 20px rgba(255, 102, 0, 0.3)' : 'none',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.border = '1px solid #475569'}
                                    onMouseLeave={e => e.currentTarget.style.border = inProgressMatches.has(match.id) ? '2px solid #ff6600' : '1px solid #334155'}
                                  >
                                    {/* Play Button - Mark as In Progress */}
                                    {match.status !== 'completed' && (
                                      <div style={{ 
                                        position: 'absolute', 
                                        top: '8px', 
                                        right: '8px',
                                        zIndex: 10
                                      }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkInProgress(match);
                                          }}
                                          style={{
                                            background: inProgressMatches.has(match.id) ? 'rgba(255, 102, 0, 0.2)' : 'rgba(51, 65, 85, 0.8)',
                                            border: inProgressMatches.has(match.id) ? '1px solid #ff6600' : '1px solid #475569',
                                            borderRadius: '6px',
                                            padding: '6px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                          }}
                                          onMouseEnter={e => {
                                            e.currentTarget.style.background = inProgressMatches.has(match.id) ? 'rgba(255, 102, 0, 0.3)' : 'rgba(71, 85, 105, 0.9)';
                                            e.currentTarget.style.transform = 'scale(1.1)';
                                          }}
                                          onMouseLeave={e => {
                                            e.currentTarget.style.background = inProgressMatches.has(match.id) ? 'rgba(255, 102, 0, 0.2)' : 'rgba(51, 65, 85, 0.8)';
                                            e.currentTarget.style.transform = 'scale(1)';
                                          }}
                                          title={inProgressMatches.has(match.id) ? 'Remove from In Progress' : 'Mark as In Progress & Send Board Call'}
                                        >
                                          <PlayCircle size={18} color={inProgressMatches.has(match.id) ? '#ff6600' : '#94a3b8'} />
                                        </button>
                                      </div>
                                    )}

                                    {/* Board Number */}
                                    <div style={{ 
                                      fontSize: '11px', 
                                      color: '#64748b', 
                                      marginBottom: '8px',
                                      textAlign: 'center',
                                      flexShrink: 0
                                    }}>
                                      Board {match.board_number}
                                    </div>
                                    
                                    {/* Players Container */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      {/* Player 1 */}
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px',
                                        background: isWinner1 ? 'rgba(34, 197, 94, 0.1)' : '#0f172a',
                                        borderRadius: '4px',
                                        border: isWinner1 ? '1px solid #22c55e' : 'none'
                                      }}>
                                        <span style={{ 
                                          fontSize: '13px',
                                          fontWeight: isWinner1 ? '700' : '400',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {display.player1Name}
                                        </span>
                                        {match.status === 'completed' && (
                                          <span style={{
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: isWinner1 ? '#22c55e' : '#64748b',
                                            minWidth: '24px',
                                            textAlign: 'right',
                                            flexShrink: 0
                                          }}>
                                            {match.player1_legs || 0}
                                          </span>
                                        )}
                                      </div>

                                      {/* Player 2 */}
                                      <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px',
                                        background: isWinner2 ? 'rgba(34, 197, 94, 0.1)' : '#0f172a',
                                        borderRadius: '4px',
                                        border: isWinner2 ? '1px solid #22c55e' : 'none'
                                      }}>
                                        <span style={{ 
                                          fontSize: '13px',
                                          fontWeight: isWinner2 ? '700' : '400',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {display.player2Name}
                                        </span>
                                        {match.status === 'completed' && (
                                          <span style={{
                                            fontSize: '14px',
                                            fontWeight: 'bold',
                                            color: isWinner2 ? '#22c55e' : '#64748b',
                                            minWidth: '24px',
                                            textAlign: 'right',
                                            flexShrink: 0
                                          }}>
                                            {match.player2_legs || 0}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Match Status */}
                                    <div style={{
                                      marginTop: '8px',
                                      fontSize: '11px',
                                      color: '#64748b',
                                      textAlign: 'center',
                                      flexShrink: 0
                                    }}>
                                      {match.status !== 'completed' ? 'Click to enter score' : ''}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Score Update Modal */}
      {selectedMatch && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => {
            // Restore scroll position when clicking outside modal
            setTimeout(() => {
              window.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
              });
            }, 50);
            setSelectedMatch(null);
          }}
        >
          <div 
            className="card"
            style={{
              maxWidth: '800px',
              width: '95%',
              padding: '0',
              borderRadius: '12px',
              border: '2px solid #3b82f6',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
              color: 'white',
              padding: '20px 30px',
              borderRadius: '10px 10px 0 0',
              borderBottom: '1px solid #475569'
            }}>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Update Match Score</h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9 }}>
                Board {selectedMatch.board_number} • Enter the final leg count for each player
              </p>
            </div>
            
            {/* Score Input Section */}
            <div style={{ padding: '25px' }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '25px'
              }}>
                {/* Player 1 */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    padding: '20px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '12px',
                    border: '2px solid #3b82f6'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 20px 0', 
                      fontWeight: '600',
                      fontSize: '18px',
                      color: '#e2e8f0'
                    }}>
                      {allPlayers.find(p => p.id === selectedMatch.player1_id)?.name || 'Player 1'}
                    </h4>
                    
                    {/* Score Controls */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(score1) || 0;
                          if (current > 0) setScore1((current - 1).toString());
                        }}
                        style={{
                          background: '#64748b',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          width: '50px',
                          height: '50px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                        onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                      >
                        −
                      </button>
                      
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={score1}
                        onChange={(e) => setScore1(e.target.value === '' ? '0' : e.target.value)}
                        onFocus={(e) => e.target.select()}
                        style={{ 
                          fontSize: '32px', 
                          textAlign: 'center', 
                          fontWeight: '700',
                          background: '#1e293b',
                          color: '#ffffff',
                          border: '2px solid #3b82f6',
                          borderRadius: '8px',
                          padding: '12px',
                          width: '100px',
                          boxSizing: 'border-box',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                        autoFocus
                      />
                      
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(score1) || 0;
                          if (current < 999) setScore1((current + 1).toString());
                        }}
                        style={{
                          background: '#64748b',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          width: '50px',
                          height: '50px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                        onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Legs Won</div>
                  </div>
                </div>
                
                {/* VS Divider */}
                <div style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#64748b',
                  background: 'rgba(100, 116, 139, 0.2)',
                  padding: '15px',
                  borderRadius: '50%',
                  border: '2px solid #475569',
                  minWidth: '60px',
                  height: '60px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  VS
                </div>
                
                {/* Player 2 */}
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    padding: '20px',
                    background: 'rgba(251, 146, 60, 0.1)',
                    borderRadius: '12px',
                    border: '2px solid #f97316'
                  }}>
                    <h4 style={{ 
                      margin: '0 0 20px 0', 
                      fontWeight: '600',
                      fontSize: '18px',
                      color: '#e2e8f0'
                    }}>
                      {allPlayers.find(p => p.id === selectedMatch.player2_id)?.name || 'Player 2'}
                    </h4>
                    
                    {/* Score Controls */}
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '15px',
                      marginBottom: '15px'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(score2) || 0;
                          if (current > 0) setScore2((current - 1).toString());
                        }}
                        style={{
                          background: '#64748b',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          width: '50px',
                          height: '50px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                        onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                      >
                        −
                      </button>
                      
                      <input
                        type="number"
                        min="0"
                        max="999"
                        value={score2}
                        onChange={(e) => setScore2(e.target.value === '' ? '0' : e.target.value)}
                        onFocus={(e) => e.target.select()}
                        style={{ 
                          fontSize: '32px', 
                          textAlign: 'center', 
                          fontWeight: '700',
                          background: '#1e293b',
                          color: '#ffffff',
                          border: '2px solid #f97316',
                          borderRadius: '8px',
                          padding: '12px',
                          width: '100px',
                          boxSizing: 'border-box',
                          outline: 'none',
                          transition: 'border-color 0.2s'
                        }}
                      />
                      
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(score2) || 0;
                          if (current < 999) setScore2((current + 1).toString());
                        }}
                        style={{
                          background: '#64748b',
                          border: 'none',
                          color: '#ffffff',
                          borderRadius: '8px',
                          width: '50px',
                          height: '50px',
                          fontSize: '20px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                        onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                      >
                        +
                      </button>
                    </div>
                    <div style={{ fontSize: '14px', color: '#94a3b8', fontWeight: '500' }}>Legs Won</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ 
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid #475569'
              }}>
                <button
                  className="button button-secondary"
                  onClick={() => {
                    // Restore scroll position when canceling
                    setTimeout(() => {
                      window.scrollTo({
                        top: scrollPosition,
                        behavior: 'smooth'
                      });
                    }, 50);
                    setSelectedMatch(null);
                  }}
                  disabled={updating}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  onClick={handleScoreUpdate}
                  disabled={updating}
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    background: 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                    border: 'none'
                  }}
                >
                  {updating ? 'Updating...' : 'Update Score'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Score Input Modal */}
      {selectedKnockoutMatch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1e293b',
            borderRadius: '20px',
            padding: '30px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #3b82f6',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{
              textAlign: 'center',
              marginBottom: '25px',
              paddingBottom: '20px',
              borderBottom: '2px solid #475569'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '8px'
              }}>
                {selectedKnockoutMatch.round} - Match {selectedKnockoutMatch.match}
              </h3>
              <p style={{
                margin: 0,
                color: '#94a3b8',
                fontSize: '16px',
                fontWeight: '500'
              }}>
                Knockout Stage - {knockoutMatchFormat === 'set_play' ? 'Set Play' : 'Match Play'}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
              {/* Player 1 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  padding: '20px',
                  background: 'rgba(34, 197, 94, 0.1)',
                  borderRadius: '12px',
                  border: '2px solid #22c55e'
                }}>
                  <h4 style={{
                    margin: '0 0 20px 0',
                    fontWeight: '600',
                    fontSize: '18px',
                    color: '#e2e8f0'
                  }}>
                    {selectedKnockoutMatch.player1?.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                    #{selectedKnockoutMatch.overallSeed1} • Group {(selectedKnockoutMatch.player1 as any)?.groupLetter}
                  </div>

                  {/* Score Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt((selectedKnockoutMatch as any).player1_score || '0');
                        if (current > 0) {
                          setSelectedKnockoutMatch({
                            ...selectedKnockoutMatch,
                            player1_score: current - 1
                          });
                        }
                      }}
                      style={{
                        background: '#64748b',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        width: '50px',
                        height: '50px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                      onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                    >
                      −
                    </button>

                    <div style={{
                      fontSize: '32px',
                      textAlign: 'center',
                      fontWeight: '700',
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '2px solid #22c55e',
                      borderRadius: '8px',
                      padding: '12px',
                      width: '100px',
                      minHeight: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(selectedKnockoutMatch as any).player1_score || 0}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt((selectedKnockoutMatch as any).player1_score || '0');
                        setSelectedKnockoutMatch({
                          ...selectedKnockoutMatch,
                          player1_score: current + 1
                        });
                      }}
                      style={{
                        background: '#64748b',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        width: '50px',
                        height: '50px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                      onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* VS */}
              <div style={{
                color: '#64748b',
                background: 'rgba(100, 116, 139, 0.2)',
                padding: '15px',
                borderRadius: '50%',
                border: '2px solid #475569',
                minWidth: '60px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                VS
              </div>

              {/* Player 2 */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  padding: '20px',
                  background: 'rgba(251, 146, 60, 0.1)',
                  borderRadius: '12px',
                  border: '2px solid #f97316'
                }}>
                  <h4 style={{
                    margin: '0 0 20px 0',
                    fontWeight: '600',
                    fontSize: '18px',
                    color: '#e2e8f0'
                  }}>
                    {selectedKnockoutMatch.player2?.name}
                  </h4>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '15px' }}>
                    #{selectedKnockoutMatch.overallSeed2} • Group {(selectedKnockoutMatch.player2 as any)?.groupLetter}
                  </div>

                  {/* Score Controls */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt((selectedKnockoutMatch as any).player2_score || '0');
                        if (current > 0) {
                          setSelectedKnockoutMatch({
                            ...selectedKnockoutMatch,
                            player2_score: current - 1
                          });
                        }
                      }}
                      style={{
                        background: '#64748b',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        width: '50px',
                        height: '50px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                      onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                    >
                      −
                    </button>

                    <div style={{
                      fontSize: '32px',
                      textAlign: 'center',
                      fontWeight: '700',
                      background: '#1e293b',
                      color: '#ffffff',
                      border: '2px solid #f97316',
                      borderRadius: '8px',
                      padding: '12px',
                      width: '100px',
                      minHeight: '56px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {(selectedKnockoutMatch as any).player2_score || 0}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt((selectedKnockoutMatch as any).player2_score || '0');
                        setSelectedKnockoutMatch({
                          ...selectedKnockoutMatch,
                          player2_score: current + 1
                        });
                      }}
                      style={{
                        background: '#64748b',
                        border: 'none',
                        color: '#ffffff',
                        borderRadius: '8px',
                        width: '50px',
                        height: '50px',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                      onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              paddingTop: '20px',
              borderTop: '1px solid #475569'
            }}>
              <button
                onClick={() => setSelectedKnockoutMatch(null)}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: '#64748b',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#475569'}
                onMouseLeave={e => e.currentTarget.style.background = '#64748b'}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const match = selectedKnockoutMatch as any;
                  const p1Score = parseInt(match.player1_score || '0');
                  const p2Score = parseInt(match.player2_score || '0');
                  
                  if (p1Score === p2Score) {
                    alert('Knockout matches cannot end in a tie. Please adjust the scores.');
                    return;
                  }
                  
                  // Determine winner
                  const winner = p1Score > p2Score ? match.player1 : match.player2;
                  
                  // Update the match in knockout bracket
                  const updatedBracket = knockoutBracket.map(m => {
                    if (m.round === match.round && m.match === match.match) {
                      return {
                        ...m,
                        player1_score: p1Score,
                        player2_score: p2Score,
                        winner: winner,
                        completed: true
                      };
                    }
                    return m;
                  });
                  
                  // Advance winner to next round if applicable
                  const advancedBracket = advanceWinner(updatedBracket, match, winner);
                  
                  setKnockoutBracket(advancedBracket);
                  setSelectedKnockoutMatch(null);
                }}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(90deg, #16a34a, #15803d)'}
                onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(90deg, #22c55e, #16a34a)'}
              >
                Complete Match
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advancing Players Preview Modal */}
      {showAdvancingPreview && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowAdvancingPreview(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: '900px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              background: '#1e293b',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                padding: '24px',
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'white' }}>
                  Advancing Players Preview
                </h2>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', opacity: 0.9, color: 'white' }}>
                  Review which players will advance to knockout bracket
                </p>
              </div>
              <button
                onClick={() => setShowAdvancingPreview(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Summary */}
              <div
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid #22c55e',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '24px'
                }}
              >
                <p style={{ margin: 0, color: '#22c55e', fontSize: '14px', fontWeight: '600' }}>
                  Total Advancing: {advancingPlayersPreview.reduce((sum, group) => sum + group.players.length, 0)} players
                </p>
              </div>

              {/* Groups */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {advancingPlayersPreview.map((groupData) => (
                  <div
                    key={groupData.groupLetter}
                    style={{
                      background: '#334155',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Group Header */}
                    <div
                      style={{
                        background: '#475569',
                        padding: '12px 16px',
                        borderBottom: '2px solid #22c55e'
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'white' }}>
                        Group {groupData.groupLetter}
                      </h3>
                    </div>

                    {/* Players */}
                    <div style={{ padding: '12px' }}>
                      {groupData.players.map((playerData) => (
                        <div
                          key={playerData.player.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '10px 12px',
                            background: '#1e293b',
                            borderRadius: '6px',
                            marginBottom: '8px',
                            border: '1px solid #22c55e'
                          }}
                        >
                          <div>
                            <div style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                              #{playerData.rank} {playerData.player.name}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                              {playerData.points} pts • Leg Diff: {playerData.legDiff > 0 ? '+' : ''}{playerData.legDiff}
                            </div>
                          </div>
                          <div
                            style={{
                              background: '#22c55e',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            Advancing
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Info */}
              <div
                style={{
                  marginTop: '24px',
                  padding: '16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid #3b82f6',
                  borderRadius: '8px'
                }}
              >
                <p style={{ margin: 0, color: '#3b82f6', fontSize: '13px' }}>
                  ℹ️ These players will advance to the knockout bracket using DartConnect professional seeding.
                  Click "Start Knockout Bracket" when ready to generate matches.
                </p>
              </div>

              {/* Close Button */}
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowAdvancingPreview(false)}
                  className="button"
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GroupStage;
