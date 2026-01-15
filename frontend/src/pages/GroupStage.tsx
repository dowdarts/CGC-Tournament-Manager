import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TournamentService, PlayerService, GroupService, MatchService } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Tournament, Player, Group, Match } from '@/types';
import { Trophy, Users } from 'lucide-react';

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
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [activeGroupTabs, setActiveGroupTabs] = useState<{ [groupId: string]: 'standings' | 'matches' }>({});
  const [scrollPosition, setScrollPosition] = useState(0);
  
  // Knockout bracket states
  const [showKnockoutSetup, setShowKnockoutSetup] = useState(false);
  const [knockoutMatchFormat, setKnockoutMatchFormat] = useState<'set_play' | 'match_play'>('set_play');
  const [advancementCounts, setAdvancementCounts] = useState<{ [groupId: string]: number }>({});
  const [knockoutBracket, setKnockoutBracket] = useState<any[]>([]);
  const [knockoutGenerated, setKnockoutGenerated] = useState(false); // Force cache refresh
  const [knockoutStarted, setKnockoutStarted] = useState(false);
  const [selectedKnockoutMatch, setSelectedKnockoutMatch] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

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
      
      // Filter only group stage matches
      const groupMatches = matchesData.filter(m => m.group_id);
      setAllMatches(groupMatches);

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

      // Calculate standings
      const standings = calculateStandings(groupPlayers, groupMatches, group, tournamentData);

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

  const createKnockoutBracket = async () => {
    if (!id || !tournament) return;
    
    try {
      setStarting(true);
      
      // Get advancing players from each group based on advancement counts
      const advancingPlayersByGroup: { [groupLetter: string]: Player[] } = {};
      
      groupMatchData.forEach(groupData => {
        const advancingCount = advancementCounts[groupData.groupId] || 2;
        // Take the top N players based on standings, regardless of isAdvancing flag
        const advancingPlayers = groupData.standings
          .slice(0, advancingCount)
          .map(standing => standing.player);
        
        advancingPlayersByGroup[groupData.groupLetter] = advancingPlayers;
        
        // Debug logging
        console.log(`Group ${groupData.groupLetter}: ${advancingPlayers.length} players advancing:`, 
          advancingPlayers.map(p => p.name));
      });
      
      console.log('All advancing players by group:', advancingPlayersByGroup);
      
      const firstRoundMatches = generateKnockoutBracket(advancingPlayersByGroup);
      
      // Generate complete bracket structure with all rounds
      const totalPlayers = firstRoundMatches.length * 2;
      const fullBracket = generateFullBracketStructure(firstRoundMatches, totalPlayers);
      
      // Save matches to database
      const matchesToCreate = fullBracket.map((match, index) => ({
        tournament_id: id,
        round: index + 1,
        board_number: match.bracket_position || (index + 1),
        player1_id: match.player1?.id || null,
        player2_id: match.player2?.id || null,
        player1_score: null,
        player2_score: null,
        winner_id: null,
        completed: false,
        group_id: null // Null for knockout matches to distinguish from group stage
      }));
      
      // Create matches in database
      const { data: createdMatches, error } = await supabase
        .from('matches')
        .insert(matchesToCreate)
        .select();
      
      if (error) throw error;
      
      console.log('✅ Created knockout matches in database:', createdMatches);
      
      // Update tournament status
      await TournamentService.updateTournament(id, {
        knockout_started: true,
        group_stage_completed: true
      });
      
      setKnockoutBracket(fullBracket);
      setKnockoutGenerated(true);
      setShowKnockoutSetup(false);
      setKnockoutStarted(true);
      
      // Save round names to localStorage for display
      const roundNamesMap: { [key: number]: string } = {};
      fullBracket.forEach((match, index) => {
        roundNamesMap[index + 1] = match.round;
      });
      localStorage.setItem('knockoutRoundNames', JSON.stringify(roundNamesMap));
      localStorage.setItem('knockoutBracket', JSON.stringify(fullBracket));
      localStorage.setItem('knockoutBracketTimestamp', Date.now().toString());
      
      // Also save tournament info
      const tournamentInfo = {
        id: id || 'tournament',
        name: tournament?.name || 'Tournament',
        totalPlayers,
        advancingPlayers: firstRoundMatches.length * 2,
        format: knockoutMatchFormat,
        generatedAt: new Date().toISOString()
      };
      localStorage.setItem('currentTournament', JSON.stringify(tournamentInfo));
      
      // Dispatch event to notify KnockoutBracket component
      window.dispatchEvent(new Event('knockoutBracketUpdated'));
      
      console.log('✅ Knockout bracket saved successfully:', fullBracket);
      alert(`Knockout bracket started! ${totalPlayers} players in ${fullBracket.length} matches. Go to the Knockout Bracket tab to enter scores.`);
      
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
    let matchCounter = 0;
    let bracketPosition = 1;
    
    // Calculate number of rounds
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
    
    // Add first round matches with proper round names
    firstRoundMatches.forEach((match, index) => {
      allMatches.push({
        ...match,
        round: getRoundName(1, numRounds),
        match: index + 1,
        bracket_position: bracketPosition++,
        completed: false,
        player1Score: undefined,
        player2Score: undefined,
        winner: null
      });
    });
    
    // Generate subsequent rounds (empty matches that will be filled as tournament progresses)
    let previousRoundMatches = firstRoundMatches.length;
    for (let round = 2; round <= numRounds; round++) {
      const matchesInRound = previousRoundMatches / 2;
      
      for (let i = 0; i < matchesInRound; i++) {
        allMatches.push({
          player1: null,
          player2: null,
          round: getRoundName(round, numRounds),
          match: i + 1,
          bracket_position: bracketPosition++,
          completed: false,
          player1Score: undefined,
          player2Score: undefined,
          winner: null,
          overallSeed1: undefined,
          overallSeed2: undefined
        });
      }
      
      previousRoundMatches = matchesInRound;
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
    tournamentData: Tournament
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
    const advancingCount = group.advancement_count || Math.ceil(players.length / 2);
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

  const handleStartGroupStage = async () => {
    if (!id || !tournament) return;

    try {
      setStarting(true);
      await TournamentService.updateTournament(id, {
        group_stage_started: true
      });
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

    try {
      setEnding(true);
      await TournamentService.updateTournament(id, {
        group_stage_completed: true
      });
      await loadData();
    } catch (err) {
      console.error('Failed to end group stage:', err);
      alert('Failed to end group stage');
    } finally {
      setEnding(false);
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
      )}

      {tournament.group_stage_completed && (
        <div className="card" style={{ marginBottom: '20px', background: '#dbeafe', border: '2px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={20} style={{ color: '#1e40af' }} />
            <div>
              <h4 style={{ margin: 0, color: '#1e40af', marginBottom: '4px' }}>Group Stage Completed</h4>
              <p style={{ margin: 0, color: '#1e40af', fontSize: '14px' }}>
                Final standings shown below with advancing players highlighted.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Knockout Bracket Section */}
      {tournament.group_stage_completed && !knockoutGenerated && (
        <div className="card" style={{ marginBottom: '20px', background: '#f0fdf4', border: '2px solid #22c55e' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ margin: 0, color: '#15803d', marginBottom: '8px' }}>Ready for Knockout Stage?</h4>
              <p style={{ margin: 0, color: '#15803d', fontSize: '14px' }}>
                Configure advancing players and match format to generate knockout bracket.
              </p>
            </div>
            <button
              className="button button-primary"
              onClick={() => {
                // Initialize advancement counts
                const initialCounts: { [groupId: string]: number } = {};
                groupMatchData.forEach(group => {
                  initialCounts[group.groupId] = Math.min(2, group.players.length);
                });
                setAdvancementCounts(initialCounts);
                setShowKnockoutSetup(true);
              }}
              style={{
                background: '#22c55e',
                borderColor: '#22c55e',
                color: 'white',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Setup Knockout Bracket
            </button>
          </div>
        </div>
      )}

      {/* Knockout Setup Modal */}
      {showKnockoutSetup && (
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

      {/* Generated Knockout Bracket Display */}
      {knockoutGenerated && knockoutBracket.length > 0 && !knockoutStarted && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} />
            Knockout Bracket Preview ({knockoutMatchFormat === 'set_play' ? 'Set Play' : 'Match Play'})
          </h3>
          
          {/* Start Knockout Bracket Button */}
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <button
              onClick={() => setKnockoutStarted(true)}
              style={{
                background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0px)'}
            >
              🏆 Start Knockout Bracket
            </button>
            <div style={{ marginTop: '10px', fontSize: '14px', color: '#94a3b8' }}>
              This will begin the elimination tournament
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
            {knockoutBracket.map((match, index) => (
              <div key={index} style={{
                background: 'rgba(59, 130, 246, 0.1)',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h4 style={{ margin: '0 0 15px 0', color: '#3b82f6', fontSize: '16px', fontWeight: '600' }}>
                  {match.round} - Match {match.match}
                </h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '5px' }}>
                      {match.player1?.name || 'TBD'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {match.player1 ? (
                        <>
                          <span style={{ color: '#3b82f6', fontWeight: '600' }}>#{match.overallSeed1}</span>
                          {' • '}
                          Group {(match.player1 as any).groupLetter} #{(match.player1 as any).groupRank || 1}
                        </>
                      ) : ''}
                    </div>
                  </div>
                  <div style={{ padding: '0 20px', fontSize: '18px', fontWeight: 'bold', color: '#64748b' }}>VS</div>
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '5px' }}>
                      {match.player2?.name || 'TBD'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {match.player2 ? (
                        <>
                          <span style={{ color: '#3b82f6', fontWeight: '600' }}>#{match.overallSeed2}</span>
                          {' • '}
                          Group {(match.player2 as any).groupLetter} #{(match.player2 as any).groupRank || 1}
                        </>
                      ) : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Knockout Bracket (after started) */}
      {knockoutGenerated && knockoutBracket.length > 0 && knockoutStarted && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} />
            Live Knockout Bracket ({knockoutMatchFormat === 'set_play' ? 'Set Play' : 'Match Play'})
          </h3>
          
          {/* Knockout Matches */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {knockoutBracket.map((match, index) => (
              <div 
                key={index}
                onClick={() => match.player1 && match.player2 && !match.completed ? setSelectedKnockoutMatch(match) : null}
                style={{
                  background: match.completed 
                    ? 'rgba(34, 197, 94, 0.1)' 
                    : (match.player1 && match.player2) 
                      ? 'rgba(59, 130, 246, 0.1)' 
                      : 'rgba(100, 116, 139, 0.1)',
                  border: match.completed 
                    ? '2px solid #22c55e' 
                    : (match.player1 && match.player2) 
                      ? '2px solid #3b82f6' 
                      : '2px solid #64748b',
                  borderRadius: '12px',
                  padding: '20px',
                  cursor: (match.player1 && match.player2 && !match.completed) ? 'pointer' : 'default',
                  position: 'relative',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  if (match.player1 && match.player2 && !match.completed) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.2)';
                  }
                }}
                onMouseLeave={e => {
                  if (match.player1 && match.player2 && !match.completed) {
                    e.currentTarget.style.transform = 'translateY(0px)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                <h4 style={{ margin: '0 0 15px 0', color: '#3b82f6', fontSize: '16px', fontWeight: '600' }}>
                  {match.round} - Match {match.match}
                  {match.completed && <span style={{ color: '#22c55e', marginLeft: '10px', fontSize: '14px' }}>✓ COMPLETE</span>}
                  {!match.completed && match.player1 && match.player2 && <span style={{ color: '#94a3b8', marginLeft: '10px', fontSize: '12px' }}>Click to Score</span>}
                </h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Player 1 */}
                  <div style={{ 
                    textAlign: 'center', 
                    flex: 1,
                    opacity: match.completed && match.winner?.id !== match.player1?.id ? 0.6 : 1
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      marginBottom: '5px',
                      color: match.completed && match.winner?.id === match.player1?.id ? '#22c55e' : '#e2e8f0'
                    }}>
                      {match.player1?.name || 'TBD'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                      {match.player1 ? (
                        <>
                          <span style={{ color: '#3b82f6', fontWeight: '600' }}>#{match.overallSeed1}</span>
                          {' • '}
                          Group {(match.player1 as any).groupLetter} #{(match.player1 as any).groupRank || 1}
                        </>
                      ) : ''}
                    </div>
                    {match.completed && (
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        color: match.winner?.id === match.player1?.id ? '#22c55e' : '#64748b'
                      }}>
                        {match.player1_score || 0}
                      </div>
                    )}
                  </div>

                  {/* VS */}
                  <div style={{ 
                    padding: '0 20px', 
                    fontSize: '18px', 
                    fontWeight: 'bold', 
                    color: '#64748b' 
                  }}>
                    {match.completed ? '🏆' : 'VS'}
                  </div>

                  {/* Player 2 */}
                  <div style={{ 
                    textAlign: 'center', 
                    flex: 1,
                    opacity: match.completed && match.winner?.id !== match.player2?.id ? 0.6 : 1
                  }}>
                    <div style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      marginBottom: '5px',
                      color: match.completed && match.winner?.id === match.player2?.id ? '#22c55e' : '#e2e8f0'
                    }}>
                      {match.player2?.name || 'TBD'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>
                      {match.player2 ? (
                        <>
                          <span style={{ color: '#3b82f6', fontWeight: '600' }}>#{match.overallSeed2}</span>
                          {' • '}
                          Group {(match.player2 as any).groupLetter} #{(match.player2 as any).groupRank || 1}
                        </>
                      ) : ''}
                    </div>
                    {match.completed && (
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold',
                        color: match.winner?.id === match.player2?.id ? '#22c55e' : '#64748b'
                      }}>
                        {match.player2_score || 0}
                      </div>
                    )}
                  </div>
                </div>

                {/* Winner indicator */}
                {match.completed && match.winner && (
                  <div style={{ 
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: '#22c55e',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Trophy size={16} color="white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

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
                        {groupData.standings.map((standing, index) => (
                          <tr key={standing.player.id}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{index + 1}</td>
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
                                    onClick={() => handleMatchClick(match)}
                                    style={{
                                      background: '#1e293b',
                                      borderRadius: '8px',
                                      padding: '12px',
                                      cursor: 'pointer',
                                      border: '1px solid #334155',
                                      transition: 'all 0.2s',
                                      minHeight: '120px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      justifyContent: 'space-between'
                                    }}
                                    onMouseEnter={e => {
                                      e.currentTarget.style.borderColor = '#3b82f6';
                                      e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={e => {
                                      e.currentTarget.style.borderColor = '#334155';
                                      e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                  >
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
    </div>
  );
};

export default GroupStage;
