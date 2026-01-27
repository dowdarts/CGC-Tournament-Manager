import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Tournament, Match, Player, Group, Board } from '@/types';
import { Trophy, Clock, CheckCircle, Tv, Monitor, Settings, X, Maximize, Minimize } from 'lucide-react';

interface MatchWithDetails extends Match {
  player1Name: string;
  player2Name: string;
  groupName: string;
  boardNumbers?: string;
  round_number?: number;
}

interface GroupStanding {
  groupId: string;
  groupName: string;
  standings: {
    playerId: string;
    playerName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    legDifference: number;
  }[];
}

const TournamentDisplay: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [completedMatches, setCompletedMatches] = useState<MatchWithDetails[]>([]);
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithDetails[]>([]);
  const [inProgressMatches, setInProgressMatches] = useState<MatchWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [tvMode, setTvMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState<'slow' | 'medium' | 'fast'>('slow');
  const [totalGroupMatches, setTotalGroupMatches] = useState(0);
  const [completedGroupMatches, setCompletedGroupMatches] = useState(0);
  const [totalKnockoutMatches, setTotalKnockoutMatches] = useState(0);
  const [completedKnockoutMatches, setCompletedKnockoutMatches] = useState(0);
  const [groupStandings, setGroupStandings] = useState<GroupStanding[]>([]);
  const [isChampionshipComplete, setIsChampionshipComplete] = useState(false);
  const [champion, setChampion] = useState<{ id: string; name: string } | null>(null);
  const [finalResults, setFinalResults] = useState<{
    champion: { id: string; name: string };
    runnerUp: { id: string; name: string };
    thirdPlace: { id: string; name: string }[];
    fifthPlace: { id: string; name: string }[];
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [championshipCompletedAt, setChampionshipCompletedAt] = useState<Date | null>(null);

  useEffect(() => {
    loadActiveTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournamentId) {
      loadTournamentData();
      
      // Set up real-time subscriptions with unique channel name
      const matchesSubscription = supabase
        .channel(`matches-changes-${selectedTournamentId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `tournament_id=eq.${selectedTournamentId}`
          },
          (payload) => {
            console.log('Match update received:', payload);
            loadTournamentData();
          }
        )
        .subscribe((status) => {
          console.log('Matches subscription status:', status);
        });

      // Subscribe to tournament updates for flags like show_standings_on_display
      const tournamentSubscription = supabase
        .channel(`tournament-changes-${selectedTournamentId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'tournaments',
            filter: `id=eq.${selectedTournamentId}`
          },
          (payload) => {
            console.log('Tournament update received:', payload);
            loadTournamentData();
          }
        )
        .subscribe((status) => {
          console.log('Tournament subscription status:', status);
        });

      // Fallback: Poll for updates every 10 seconds
      const pollInterval = setInterval(() => {
        loadTournamentData();
      }, 10000);

      return () => {
        matchesSubscription.unsubscribe();
        tournamentSubscription.unsubscribe();
        clearInterval(pollInterval);
      };
    }
  }, [selectedTournamentId]);

  const checkChampionshipComplete = async (knockoutMatches: Match[]) => {
    if (!knockoutMatches || knockoutMatches.length === 0) return;

    // Find the final match (highest round number)
    const maxRound = Math.max(...knockoutMatches.map(m => m.round_number || 1));
    const finalMatch = knockoutMatches.find(m => (m.round_number || 1) === maxRound);
    
    if (!finalMatch || finalMatch.status !== 'completed' || !finalMatch.winner_id) {
      setIsChampionshipComplete(false);
      return;
    }

    // Get player details for the champion
    const { data: championData, error } = await supabase
      .from('players')
      .select('id, name')
      .eq('id', finalMatch.winner_id)
      .single();

    if (error || !championData) return;

    const championInfo = { id: championData.id, name: championData.name };
    setChampion(championInfo);

    // Calculate final results
    const results = await calculateFinalResults(knockoutMatches);
    setFinalResults(results);
    
    // Check if this is a new championship (not already shown)
    const wasComplete = isChampionshipComplete;
    setIsChampionshipComplete(true);
    
    // Set championship completion time for 1-hour timer
    if (!wasComplete) {
      const completionTime = new Date();
      setChampionshipCompletedAt(completionTime);
      
      // Show celebration animation
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 10000); // 10 second celebration
      
      // Hide championship results after 1 hour
      setTimeout(() => {
        setIsChampionshipComplete(false);
        setChampionshipCompletedAt(null);
        setFinalResults(null);
      }, 3600000); // 3600000 ms = 1 hour
    }
  };

  const calculateFinalResults = async (knockoutMatches: Match[]) => {
    // Get all player details
    const playerIds = new Set<string>();
    knockoutMatches.forEach(match => {
      if (match.player1_id) playerIds.add(match.player1_id);
      if (match.player2_id) playerIds.add(match.player2_id);
    });

    const { data: playersData } = await supabase
      .from('players')
      .select('id, name')
      .in('id', Array.from(playerIds));

    if (!playersData) return null;

    const playersMap = new Map(playersData.map(p => [p.id, p.name]));

    // Only consider completed matches
    const completedMatches = knockoutMatches.filter(m => m.status === 'completed');
    
    console.log('🏆 Calculating final results');
    console.log('Total knockout matches:', knockoutMatches.length);
    console.log('Completed matches:', completedMatches.length);
    
    // Find final match
    const maxRound = Math.max(...completedMatches.map(m => m.round_number || 1));
    const finalMatch = completedMatches.find(m => (m.round_number || 1) === maxRound);
    
    console.log('Max round:', maxRound);
    console.log('Final match:', finalMatch);
    
    if (!finalMatch || !finalMatch.winner_id) return null;

    // Champion
    const championId = finalMatch.winner_id;
    const championName = playersMap.get(championId) || 'Unknown';

    // Runner-up (loser of final)
    const runnerUpId = finalMatch.player1_id === championId ? finalMatch.player2_id : finalMatch.player1_id;
    const runnerUpName = playersMap.get(runnerUpId!) || 'Unknown';

    // Third place (losers of semi-finals) - round before final
    const semiMatches = completedMatches.filter(m => (m.round_number || 1) === maxRound - 1);
    console.log('Semi-final matches:', semiMatches);
    
    const thirdPlace = semiMatches.map(match => {
      if (!match.winner_id) return null;
      const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
      console.log(`Semi match: winner=${match.winner_id}, loser=${loserId}, name=${playersMap.get(loserId!)}`);
      return loserId ? { id: loserId, name: playersMap.get(loserId) || 'Unknown' } : null;
    }).filter((p): p is { id: string; name: string } => p !== null);

    // Fifth place (losers of quarter-finals) - two rounds before final
    const quarterMatches = completedMatches.filter(m => (m.round_number || 1) === maxRound - 2);
    console.log('Quarter-final matches:', quarterMatches);
    
    const fifthPlace = quarterMatches.map(match => {
      if (!match.winner_id) return null;
      const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
      console.log(`Quarter match: winner=${match.winner_id}, loser=${loserId}, name=${playersMap.get(loserId!)}`);
      return loserId ? { id: loserId, name: playersMap.get(loserId) || 'Unknown' } : null;
    }).filter((p): p is { id: string; name: string } => p !== null);

    console.log('Third place finishers:', thirdPlace);
    console.log('Fifth place finishers:', fifthPlace);

    return {
      champion: { id: championId, name: championName },
      runnerUp: { id: runnerUpId!, name: runnerUpName },
      thirdPlace,
      fifthPlace
    };
  };

  // Fullscreen functionality
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const loadActiveTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Get current time minus 1 hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      console.log('Filtering tournaments for activity since:', oneHourAgo.toISOString());
      
      // Filter tournaments with recent activity (created or updated in last hour)
      const recentTournaments = [];
      
      for (const tournament of data || []) {
        // Skip archived or cancelled tournaments
        if (tournament.status === 'archived' || tournament.status === 'cancelled') {
          console.log(`Skipping ${tournament.name} - status: ${tournament.status}`);
          continue;
        }
        
        // Always include currently selected tournament to prevent it from disappearing
        if (selectedTournamentId && tournament.id === selectedTournamentId) {
          console.log(`Including ${tournament.name} - currently selected`);
          recentTournaments.push(tournament);
          continue;
        }
        
        // Check if tournament was created in the last hour
        const createdAt = new Date(tournament.created_at);
        const updatedAt = new Date(tournament.updated_at);
        
        if (createdAt > oneHourAgo || updatedAt > oneHourAgo) {
          console.log(`Including ${tournament.name} - tournament activity (created: ${createdAt.toISOString()}, updated: ${updatedAt.toISOString()})`);
          recentTournaments.push(tournament);
          continue;
        }
        
        // Check if any matches were updated in the last hour
        const { data: recentMatches, error: matchError } = await supabase
          .from('matches')
          .select('updated_at, id')
          .eq('tournament_id', tournament.id)
          .gte('updated_at', oneHourAgo.toISOString())
          .limit(1);
        
        if (matchError) {
          console.error(`Error checking matches for ${tournament.name}:`, matchError);
          continue;
        }
        
        if (recentMatches && recentMatches.length > 0) {
          console.log(`Including ${tournament.name} - has recent match updates:`, recentMatches[0]);
          recentTournaments.push(tournament);
        } else {
          console.log(`Excluding ${tournament.name} - no recent activity (created: ${createdAt.toISOString()})`);
        }
      }
      
      console.log(`Filtered ${(data || []).length} tournaments down to ${recentTournaments.length} with recent activity`);
      setTournaments(recentTournaments);
      
      // Auto-select first tournament if available
      if (recentTournaments.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(recentTournaments[0].id);
      }
    } catch (err) {
      console.error('Error loading tournaments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentData = async () => {
    if (!selectedTournamentId) return;

    try {
      // Load tournament
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', selectedTournamentId)
        .single();

      setSelectedTournament(tournamentData);

      // Load players
      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', selectedTournamentId);

      // Load groups
      const { data: groupsData } = await supabase
        .from('groups')
        .select('*')
        .eq('tournament_id', selectedTournamentId);

      // Load group stage matches (round robin)
      const { data: groupMatchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .not('group_id', 'is', null)
        .order('round_number', { ascending: true });

      // Load knockout matches
      const { data: knockoutMatchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .is('group_id', null)
        .order('round_number', { ascending: true });

      // Load boards
      const { data: boardsData } = await supabase
        .from('boards')
        .select('*')
        .eq('tournament_id', selectedTournamentId);

      // Calculate group stage progress
      if (groupMatchesData) {
        const totalGroup = groupMatchesData.length;
        const completedGroup = groupMatchesData.filter(m => m.status === 'completed').length;
        setTotalGroupMatches(totalGroup);
        setCompletedGroupMatches(completedGroup);
      }

      // Calculate knockout stage progress
      if (knockoutMatchesData) {
        const totalKnockout = knockoutMatchesData.length;
        const completedKnockout = knockoutMatchesData.filter(m => m.status === 'completed').length;
        setTotalKnockoutMatches(totalKnockout);
        setCompletedKnockoutMatches(completedKnockout);
        
        // Check if championship is complete
        await checkChampionshipComplete(knockoutMatchesData);
      }

      // Determine which matches to display
      // If knockout matches exist, only show knockout matches
      // Otherwise, show group stage matches
      const matchesData = knockoutMatchesData && knockoutMatchesData.length > 0
        ? knockoutMatchesData
        : (groupMatchesData || []);

      if (!matchesData || !playersData || !groupsData) return;

      // Process matches with player and group details
      const processedMatches: MatchWithDetails[] = matchesData.map(match => {
        const player1 = playersData.find(p => p.id === match.player1_id);
        const player2 = playersData.find(p => p.id === match.player2_id);
        const group = groupsData.find(g => g.id === match.group_id);
        
        // Determine if this is a knockout match (no group_id)
        const isKnockoutMatch = !match.group_id;
        
        // Get board info
        let boardNumbers = '';
        if (match.board_number) {
          // Specific board was selected when marking in-progress
          boardNumbers = match.board_number.toString();
        } else if (group && boardsData) {
          // No specific board, use group's assigned boards
          const groupBoards = boardsData.filter(b => 
            b.assigned_group_ids && b.assigned_group_ids.includes(group.id)
          );
          if (groupBoards.length > 0) {
            const boardNums = groupBoards.map(b => b.board_number).sort((a, b) => a - b);
            boardNumbers = boardNums.join('-');
          }
        }

        // Determine group/round name
        let displayName: string;
        if (isKnockoutMatch) {
          // For knockout matches, get all knockout matches to determine total rounds
          const knockoutMatches = matchesData.filter(m => !m.group_id);
          const maxRound = Math.max(...knockoutMatches.map(m => m.round_number || 1));
          const matchesInSameRound = matchesData.filter(m => m.round_number === match.round_number).length;
          displayName = getKnockoutRoundLabel(match.round_number || 1, matchesInSameRound, maxRound);
        } else {
          displayName = group?.name || 'Unknown Group';
        }

        return {
          ...match,
          player1Name: player1?.name || 'TBD',
          player2Name: player2?.name || 'TBD',
          groupName: displayName,
          boardNumbers
        };
      });

      // Separate matches by status
      const completed = processedMatches.filter(m => m.status === 'completed');
      const inProgress = processedMatches.filter(m => m.status === 'in-progress');
      let upcoming = processedMatches.filter(m => m.status === 'scheduled');

      // Filter upcoming matches to only show the next incomplete round
      // Group matches separately from knockout matches
      const upcomingGroupMatches = upcoming.filter(m => m.group_id);
      const upcomingKnockoutMatches = upcoming.filter(m => !m.group_id);

      let filteredUpcoming: MatchWithDetails[] = [];

      // For group stage matches: only show matches from the next incomplete round
      if (upcomingGroupMatches.length > 0) {
        // Find the earliest round that has incomplete matches in group stage
        const allGroupMatches = processedMatches.filter(m => m.group_id);
        const groupRoundStatus = new Map<number, { total: number; completed: number }>();
        
        allGroupMatches.forEach(match => {
          const round = match.round_number || 1;
          if (!groupRoundStatus.has(round)) {
            groupRoundStatus.set(round, { total: 0, completed: 0 });
          }
          const status = groupRoundStatus.get(round)!;
          status.total++;
          if (match.status === 'completed') {
            status.completed++;
          }
        });

        // Find the first incomplete round for group stage
        let nextIncompleteGroupRound: number | null = null;
        const sortedGroupRounds = Array.from(groupRoundStatus.keys()).sort((a, b) => a - b);
        
        for (const round of sortedGroupRounds) {
          const status = groupRoundStatus.get(round)!;
          if (status.completed < status.total) {
            nextIncompleteGroupRound = round;
            break;
          }
        }

        // Only show group matches from the next incomplete round
        if (nextIncompleteGroupRound !== null) {
          const nextRoundGroupMatches = upcomingGroupMatches.filter(m => m.round_number === nextIncompleteGroupRound);
          filteredUpcoming.push(...nextRoundGroupMatches);
        }
      }

      // For knockout matches: only show matches from the next incomplete round
      // BUT also show matches with board assignments even if players are TBD
      if (upcomingKnockoutMatches.length > 0) {
        // Find the earliest round that has incomplete matches
        const allKnockoutMatches = processedMatches.filter(m => !m.group_id);
        const roundStatus = new Map<number, { total: number; completed: number }>();
        
        allKnockoutMatches.forEach(match => {
          const round = match.round_number || 1;
          if (!roundStatus.has(round)) {
            roundStatus.set(round, { total: 0, completed: 0 });
          }
          const status = roundStatus.get(round)!;
          status.total++;
          if (match.status === 'completed') {
            status.completed++;
          }
        });

        // Find the first incomplete round
        let nextIncompleteRound: number | null = null;
        const sortedRounds = Array.from(roundStatus.keys()).sort((a, b) => a - b);
        
        for (const round of sortedRounds) {
          const status = roundStatus.get(round)!;
          if (status.completed < status.total) {
            nextIncompleteRound = round;
            break;
          }
        }

        // Show matches from the next incomplete round
        if (nextIncompleteRound !== null) {
          const nextRoundMatches = upcomingKnockoutMatches.filter(m => m.round_number === nextIncompleteRound);
          filteredUpcoming.push(...nextRoundMatches);
        }
        
        // ALSO show any knockout matches with board assignments even if they have TBD players
        // This allows pre-assigned boards to be displayed before players are determined
        const matchesWithBoards = upcomingKnockoutMatches.filter(m => {
          // Has a board assignment
          const hasBoard = m.board_number || m.boardNumbers;
          // Is not already in the filtered list
          const notAlreadyIncluded = !filteredUpcoming.some(fm => fm.id === m.id);
          return hasBoard && notAlreadyIncluded;
        });
        filteredUpcoming.push(...matchesWithBoards);
      }

      upcoming = filteredUpcoming;

      console.log('📊 Match filtering:');
      console.log('  Total processed matches:', processedMatches.length);
      console.log('  Completed:', completed.length);
      console.log('  In Progress:', inProgress.length);
      console.log('  Upcoming (filtered to next round only):', upcoming.length);
      console.log('  Sample in-progress match:', inProgress[0]);
      console.log('  All match statuses:', processedMatches.map(m => ({ id: m.id, status: m.status, group: m.groupName })));

      // Sort completed by most recent
      completed.sort((a, b) => {
        if (b.completed_at && a.completed_at) {
          return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
        }
        return 0;
      });

      // Sort upcoming by round, then group
      upcoming.sort((a, b) => {
        if (a.round_number !== b.round_number) {
          return (a.round_number || 0) - (b.round_number || 0);
        }
        return a.groupName.localeCompare(b.groupName);
      });

      setCompletedMatches(completed);
      setInProgressMatches(inProgress);
      setUpcomingMatches(upcoming);

      // Calculate group standings if all group matches are completed
      const totalGroup = groupMatchesData?.length || 0;
      const completedGroup = groupMatchesData?.filter(m => m.status === 'completed').length || 0;
      
      console.log('📊 Group Standings Calculation Check:', {
        totalGroup,
        completedGroup,
        hasGroupsData: !!groupsData,
        groupsCount: groupsData?.length || 0,
        hasGroupMatchesData: !!groupMatchesData,
        groupMatchesCount: groupMatchesData?.length || 0,
        hasPlayersData: !!playersData,
        playersCount: playersData?.length || 0,
        willCalculate: totalGroup > 0 && completedGroup === totalGroup && groupsData && groupMatchesData && playersData
      });
      
      if (totalGroup > 0 && completedGroup === totalGroup && groupsData && groupMatchesData && playersData) {
        console.log('🎯 Calling calculateGroupStandings...');
        calculateGroupStandings(groupsData, groupMatchesData, playersData);
      }
    } catch (err) {
      console.error('Error loading tournament data:', err);
    }
  };

  const getAdvancementCount = (): number => {
    // Use players_advancing_per_group which is set when configuring knockout bracket
    if (selectedTournament?.players_advancing_per_group) {
      return selectedTournament.players_advancing_per_group;
    }
    // Fallback to parsing advancement_rules if the field doesn't exist
    if (selectedTournament?.advancement_rules) {
      const match = selectedTournament.advancement_rules.match(/Top (\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 0; // No advancement configured
  };

  const getKnockoutRoundLabel = (roundNumber: number, matchesInRound: number, maxRound: number): string => {
    // Determine the round label based on matches in round and position from finals
    // Finals = 1 match, Semi Finals = 2 matches, Quarter Finals = 4 matches
    // Earlier rounds labeled as Round 1, Round 2, etc.
    
    if (roundNumber === undefined || roundNumber === null) {
      return 'Knockout';
    }

    // Calculate rounds from the end (finals = last round)
    const roundsFromEnd = maxRound - roundNumber;
    
    if (matchesInRound === 1) {
      return 'Finals';
    } else if (matchesInRound === 2) {
      return 'Semi Finals';
    } else if (matchesInRound === 4) {
      return 'Quarter Finals';
    } else {
      // For rounds before quarter finals, use Round 1, Round 2, etc.
      return `Round ${roundNumber}`;
    }
  };

  const calculateGroupStandings = (groups: Group[], matches: Match[], players: Player[]) => {
    console.log('🔍 calculateGroupStandings called with:', {
      groupsCount: groups.length,
      matchesCount: matches.length,
      playersCount: players.length,
      groups: groups.map(g => ({ id: g.id, name: g.name, playerIds: g.player_ids }))
    });
    
    const standings: GroupStanding[] = [];

    groups.forEach(group => {
      const groupMatches = matches.filter(m => m.group_id === group.id);
      const groupPlayers = players.filter(p => group.player_ids.includes(p.id));
      
      console.log(`  Group ${group.name}:`, {
        groupMatchesCount: groupMatches.length,
        groupPlayersCount: groupPlayers.length,
        playerIds: group.player_ids
      });

      const playerStats = groupPlayers.map(player => {
        const playerMatches = groupMatches.filter(
          m => m.player1_id === player.id || m.player2_id === player.id
        );

        let wins = 0;
        let losses = 0;
        let legsFor = 0;
        let legsAgainst = 0;

        playerMatches.forEach(match => {
          if (match.status === 'completed') {
            const isPlayer1 = match.player1_id === player.id;
            const playerLegs = isPlayer1 ? (match.player1_legs || 0) : (match.player2_legs || 0);
            const opponentLegs = isPlayer1 ? (match.player2_legs || 0) : (match.player1_legs || 0);

            legsFor += playerLegs;
            legsAgainst += opponentLegs;

            if (match.winner_id === player.id) {
              wins++;
            } else if (match.winner_id) {
              losses++;
            }
          }
        });

        return {
          playerId: player.id,
          playerName: player.name,
          matchesPlayed: wins + losses,
          wins,
          losses,
          legDifference: legsFor - legsAgainst
        };
      });

      // Sort by wins (desc), then leg difference (desc)
      playerStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.legDifference - a.legDifference;
      });

      standings.push({
        groupId: group.id,
        groupName: group.name,
        standings: playerStats
      });
    });

    console.log('✅ Calculated standings:', standings);
    setGroupStandings(standings);
  };

  // Get animation duration based on scroll speed
  const getAnimationDuration = (baseSeconds: number): number => {
    const multiplier = { slow: 1, medium: 0.6, fast: 0.4 };
    return baseSeconds * multiplier[scrollSpeed];
  };

  // Calculate duration based on number of matches to keep columns synchronized
  const getScrollDuration = (matchCount: number): number => {
    // Match card height + margin: 220px + 15px = 235px (normal), 280px + 15px = 295px (TV mode)
    const matchHeight = tvMode ? 295 : 235;
    const totalHeight = matchCount * matchHeight;
    
    // Base speed: pixels per second (adjust this to control overall scroll speed)
    const baseSpeed = 100; // pixels per second
    
    // Calculate base duration: total height / speed
    const baseDuration = totalHeight / baseSpeed;
    
    // Apply speed multiplier
    return getAnimationDuration(baseDuration);
  };

  // Check if list needs scrolling (has enough matches to overflow)
  const needsScrolling = (matches: MatchWithDetails[]): boolean => {
    // Rough estimate: if more than 3 matches in TV mode, it likely needs scrolling
    return tvMode && matches.length > 3;
  };

  const MatchCard: React.FC<{ match: MatchWithDetails; type: 'completed' | 'in-progress' | 'upcoming'; tvMode?: boolean }> = ({ match, type, tvMode = false }) => {
    const isWinner1 = match.winner_id === match.player1_id;
    const isWinner2 = match.winner_id === match.player2_id;

    return (
      <div style={{
        background: type === 'in-progress' ? 'linear-gradient(135deg, rgba(255, 102, 0, 0.2) 0%, rgba(255, 102, 0, 0.1) 100%)' : '#1e293b',
        border: type === 'in-progress' ? '2px solid #ff6600' : '1px solid #334155',
        borderRadius: '12px',
        padding: tvMode ? '30px' : '20px',
        marginBottom: '15px',
        boxShadow: type === 'in-progress' ? '0 0 30px rgba(255, 102, 0, 0.3)' : 'none',
        animation: type === 'in-progress' ? 'pulse 2s infinite' : 'none',
        minHeight: tvMode ? '280px' : '220px',
        maxHeight: tvMode ? '280px' : '220px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: tvMode ? '20px' : '14px', 
              color: '#94a3b8',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {match.groupName} • Round {match.round_number}
            </span>
          </div>
          
          {match.boardNumbers && (
            <div style={{
              background: type === 'in-progress' ? '#ff6600' : '#3b82f6',
              color: 'white',
              padding: tvMode ? '10px 20px' : '6px 12px',
              borderRadius: '20px',
              fontSize: tvMode ? '16px' : '12px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {match.boardNumbers.includes('-') 
                ? `Boards ${match.boardNumbers}` 
                : `Board ${match.boardNumbers}`
              }
            </div>
          )}
        </div>

        {/* Players */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: tvMode ? '25px' : '15px',
            background: isWinner1 ? 'rgba(34, 197, 94, 0.1)' : '#0f172a',
            borderRadius: '8px',
            border: isWinner1 ? '2px solid #22c55e' : 'none',
            minHeight: tvMode ? '70px' : '50px',
            maxHeight: tvMode ? '70px' : '50px'
          }}>
            <span style={{ 
              fontSize: tvMode ? '28px' : '18px',
              fontWeight: isWinner1 ? '700' : '500',
              color: isWinner1 ? '#22c55e' : '#e2e8f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '10px'
            }}>
              {match.player1Name}
            </span>
            {type === 'completed' && (
              <span style={{
                fontSize: tvMode ? '36px' : '24px',
                fontWeight: 'bold',
                color: isWinner1 ? '#22c55e' : '#64748b',
                minWidth: tvMode ? '60px' : '40px',
                textAlign: 'right'
              }}>
                {match.player1_legs || 0}
              </span>
            )}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: tvMode ? '25px' : '15px',
            background: isWinner2 ? 'rgba(34, 197, 94, 0.1)' : '#0f172a',
            borderRadius: '8px',
            border: isWinner2 ? '2px solid #22c55e' : 'none',
            minHeight: tvMode ? '70px' : '50px',
            maxHeight: tvMode ? '70px' : '50px'
          }}>
            <span style={{ 
              fontSize: tvMode ? '28px' : '18px',
              fontWeight: isWinner2 ? '700' : '500',
              color: isWinner2 ? '#22c55e' : '#e2e8f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              marginRight: '10px'
            }}>
              {match.player2Name}
            </span>
            {type === 'completed' && (
              <span style={{
                fontSize: tvMode ? '36px' : '24px',
                fontWeight: 'bold',
                color: isWinner2 ? '#22c55e' : '#64748b',
                minWidth: tvMode ? '60px' : '40px',
                textAlign: 'right'
              }}>
                {match.player2_legs || 0}
              </span>
            )}
          </div>
        </div>

        {type === 'in-progress' && (
          <div style={{
            marginTop: '15px',
            textAlign: 'center',
            color: '#ff6600',
            fontWeight: 'bold',
            fontSize: tvMode ? '20px' : '14px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            🔴 LIVE NOW
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#e2e8f0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎯</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0f172a',
      color: '#e2e8f0',
      padding: '20px'
    }}>
      <style>
        {`
          @keyframes celebrationPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.9; }
          }
          
          @keyframes celebrationBounce {
            0% { transform: translateY(-200px) scale(0.3); opacity: 0; }
            60% { transform: translateY(30px) scale(1.1); opacity: 1; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          
          @keyframes sparkle {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.2) rotate(90deg); }
            50% { transform: scale(1) rotate(180deg); }
            75% { transform: scale(1.2) rotate(270deg); }
          }
          
          @keyframes scrollResults {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          
          @keyframes scrollFinalPositions {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.8; }
          }
          
          @keyframes scrollSlow {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          
          @keyframes scrollMedium {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          
          @keyframes scrollFast {
            0% { transform: translateY(0); }
            100% { transform: translateY(-50%); }
          }
          
          .scroll-container {
            overflow: hidden;
            position: relative;
          }
          
          .scroll-content {
            display: flex;
            flex-direction: column;
          }
          
          /* Hide scrollbar */
          .scroll-container::-webkit-scrollbar {
            display: none;
          }
          .scroll-container {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        borderRadius: '16px',
        padding: '30px',
        marginBottom: '30px',
        border: '2px solid #3b82f6'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ 
            margin: 0,
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#e2e8f0'
          }}>
            🎯 <span style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>Tournament Live Display</span>
          </h1>

          {/* Settings, Fullscreen and TV Mode Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: '#64748b',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              <Settings size={20} />
              Settings
            </button>
            
            <button
              onClick={toggleFullscreen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: isFullscreen ? '#22c55e' : '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isFullscreen ? '0 0 20px rgba(34, 197, 94, 0.5)' : '0 0 20px rgba(99, 102, 241, 0.5)'
              }}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
            
            <button
              onClick={() => setTvMode(!tvMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: tvMode ? '#ff6600' : '#3b82f6',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: tvMode ? '0 0 20px rgba(255, 102, 0, 0.5)' : '0 0 20px rgba(59, 130, 246, 0.5)'
              }}
            >
              {tvMode ? <Monitor size={20} /> : <Tv size={20} />}
              {tvMode ? 'Exit TV Mode' : 'TV Mode'}
            </button>
          </div>
        </div>

        {/* Settings Modal */}
        {showSettings && (
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
            zIndex: 1000
          }}>
            <div style={{
              background: '#1e293b',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '500px',
              width: '90%',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '24px', color: '#e2e8f0' }}>Display Settings</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '5px'
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
                  TV MODE
                </label>
                <button
                  onClick={() => setTvMode(!tvMode)}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: tvMode ? '#22c55e' : '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {tvMode ? <><Tv size={20} /> TV Mode: ON</> : <><Monitor size={20} /> TV Mode: OFF</>}
                </button>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', marginBottom: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
                  FULLSCREEN
                </label>
                <button
                  onClick={toggleFullscreen}
                  style={{
                    width: '100%',
                    padding: '15px',
                    background: isFullscreen ? '#22c55e' : '#334155',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                  }}
                >
                  {isFullscreen ? <><Minimize size={20} /> Fullscreen: ON</> : <><Maximize size={20} /> Fullscreen: OFF</>}
                </button>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '10px', color: '#94a3b8', fontSize: '14px', fontWeight: '600' }}>
                  SCROLL SPEED
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setScrollSpeed('slow')}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: scrollSpeed === 'slow' ? '#3b82f6' : '#334155',
                      border: scrollSpeed === 'slow' ? '2px solid #60a5fa' : '1px solid #475569',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Slow
                  </button>
                  <button
                    onClick={() => setScrollSpeed('medium')}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: scrollSpeed === 'medium' ? '#3b82f6' : '#334155',
                      border: scrollSpeed === 'medium' ? '2px solid #60a5fa' : '1px solid #475569',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setScrollSpeed('fast')}
                    style={{
                      flex: 1,
                      padding: '15px',
                      background: scrollSpeed === 'fast' ? '#3b82f6' : '#334155',
                      border: scrollSpeed === 'fast' ? '2px solid #60a5fa' : '1px solid #475569',
                      borderRadius: '8px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Fast
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Selector */}
        <select
          value={selectedTournamentId || ''}
          onChange={(e) => setSelectedTournamentId(e.target.value)}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            background: '#0f172a',
            border: '2px solid #475569',
            borderRadius: '8px',
            color: '#e2e8f0',
            cursor: 'pointer'
          }}
        >
          <option value="">Select a tournament...</option>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} - {t.date}
            </option>
          ))}
        </select>

        {selectedTournament && (
          <div style={{ marginTop: '15px', fontSize: '14px', color: '#94a3b8' }}>
            {selectedTournament.location} • {selectedTournament.start_time}
          </div>
        )}
      </div>

      {/* Championship Celebration */}
      {showCelebration && champion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          animation: 'celebrationPulse 2s ease-in-out infinite'
        }}>
          <div style={{
            textAlign: 'center',
            animation: 'celebrationBounce 1s ease-out'
          }}>
            <div style={{
              fontSize: tvMode ? '120px' : '80px',
              marginBottom: '30px'
            }}>🏆</div>
            <h1 style={{
              fontSize: tvMode ? '72px' : '48px',
              fontWeight: 'bold',
              marginBottom: '20px',
              textShadow: '0 4px 20px rgba(0,0,0,0.3)'
            }}>CHAMPION!</h1>
            <h2 style={{
              fontSize: tvMode ? '48px' : '32px',
              fontWeight: 'bold',
              marginBottom: '40px',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>{champion.name}</h2>
            <div style={{
              fontSize: tvMode ? '36px' : '24px',
              animation: 'sparkle 1.5s ease-in-out infinite'
            }}>🎉 ✨ 🎯 ✨ 🎉</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {!isChampionshipComplete && selectedTournamentId && (totalGroupMatches > 0 || totalKnockoutMatches > 0) && (
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          borderRadius: '12px',
          padding: '25px',
          marginBottom: '20px',
          border: '2px solid #3b82f6'
        }}>
          {/* Round Robin Progress */}
          {totalGroupMatches > 0 && (
            <div style={{ marginBottom: totalKnockoutMatches > 0 ? '20px' : '0' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#e2e8f0'
                }}>
                  🏁 Round Robin Progress
                </h3>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#3b82f6'
                }}>
                  {completedGroupMatches} / {totalGroupMatches}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '30px',
                background: '#0f172a',
                borderRadius: '15px',
                overflow: 'hidden',
                border: '2px solid #475569'
              }}>
                <div style={{
                  width: `${totalGroupMatches > 0 ? (completedGroupMatches / totalGroupMatches) * 100 : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  transition: 'width 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {totalGroupMatches > 0 ? Math.round((completedGroupMatches / totalGroupMatches) * 100) : 0}%
                </div>
              </div>
            </div>
          )}

          {/* Knockout Progress */}
          {totalKnockoutMatches > 0 && (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#e2e8f0'
                }}>
                  🏆 Knockout Bracket Progress
                </h3>
                <span style={{
                  fontSize: '16px',
                  fontWeight: 'bold',
                  color: '#ff6600'
                }}>
                  {completedKnockoutMatches} / {totalKnockoutMatches}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '30px',
                background: '#0f172a',
                borderRadius: '15px',
                overflow: 'hidden',
                border: '2px solid #475569'
              }}>
                <div style={{
                  width: `${totalKnockoutMatches > 0 ? (completedKnockoutMatches / totalKnockoutMatches) * 100 : 0}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #ff6600, #ff8800)',
                  transition: 'width 0.5s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  {totalKnockoutMatches > 0 ? Math.round((completedKnockoutMatches / totalKnockoutMatches) * 100) : 0}%
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedTournamentId && (
        <>
          {/* Show Group Standings when Round Robin is Complete (and either no knockout started, or standings display enabled AND no knockout matches in progress) */}
          {(() => {
            const shouldShowStandings = completedGroupMatches === totalGroupMatches && totalGroupMatches > 0 && groupStandings.length > 0 && 
             (totalKnockoutMatches === 0 || (selectedTournament?.show_standings_on_display && inProgressMatches.filter(m => !m.group_id).length === 0));
            
            console.log('🏆 Standings Display Check:', {
              completedGroupMatches,
              totalGroupMatches,
              groupStandingsLength: groupStandings.length,
              totalKnockoutMatches,
              showStandingsFlag: selectedTournament?.show_standings_on_display,
              knockoutInProgress: inProgressMatches.filter(m => !m.group_id).length,
              shouldShowStandings
            });
            
            return shouldShowStandings;
          })() ? (
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              borderRadius: '16px',
              padding: '30px',
              border: '2px solid #22c55e'
            }}>
              <h2 style={{
                margin: '0 0 30px 0',
                fontSize: tvMode ? '36px' : '28px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#22c55e',
                textAlign: 'center',
                justifyContent: 'center'
              }}>
                🏆 Group Stage Complete - Final Standings
              </h2>

              {/* Scrolling Standings Container */}
              <div className="scroll-container" style={{ 
                maxHeight: tvMode ? 'calc(100vh - 300px)' : '1200px',
                overflow: tvMode && groupStandings.length > 3 ? 'hidden' : 'auto'
              }}>
                <div 
                  className="scroll-content"
                  style={{
                    animation: tvMode && groupStandings.length > 3
                      ? `scroll${scrollSpeed.charAt(0).toUpperCase() + scrollSpeed.slice(1)} ${getScrollDuration(groupStandings.length * 8)}s linear infinite`
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '25px'
                  }}
                >
                  {groupStandings.map(group => (
                    <div key={group.groupId} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      padding: tvMode ? '25px' : '20px',
                      border: '2px solid #3b82f6',
                      width: '100%',
                      maxWidth: '900px',
                      margin: '0 auto'
                    }}>
                      <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: tvMode ? '24px' : '20px',
                        fontWeight: 'bold',
                        color: '#3b82f6'
                      }}>
                        {group.groupName}
                      </h3>

                      <table style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: '0 8px'
                      }}>
                        <thead>
                          <tr style={{ color: '#94a3b8', fontSize: tvMode ? '16px' : '14px' }}>
                            <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>Pos</th>
                            <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>Player</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>P</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>W</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>L</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>+/-</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.standings.map((player, index) => (
                            <tr key={player.playerId} style={{
                              background: index === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              fontSize: tvMode ? '18px' : '16px',
                              color: '#e2e8f0'
                            }}>
                              <td style={{
                                padding: '12px',
                                borderRadius: '8px 0 0 8px',
                                fontWeight: 'bold',
                                color: index === 0 ? '#22c55e' : '#94a3b8'
                              }}>
                                {index + 1}
                              </td>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {player.playerName}
                                  {getAdvancementCount() > 0 && index < getAdvancementCount() && (
                                    <span style={{
                                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                      color: 'white',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: tvMode ? '14px' : '12px',
                                      fontWeight: 'bold',
                                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                                    }}>
                                      ✓ ADVANCED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {player.matchesPlayed}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#22c55e', fontWeight: 'bold' }}>
                                {player.wins}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#ef4444' }}>
                                {player.losses}
                              </td>
                              <td style={{
                                padding: '12px',
                                borderRadius: '0 8px 8px 0',
                                textAlign: 'center',
                                color: player.legDifference >= 0 ? '#22c55e' : '#ef4444',
                                fontWeight: 'bold'
                              }}>
                                {player.legDifference >= 0 ? '+' : ''}{player.legDifference}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  
                  {/* Duplicate for seamless scrolling */}
                  {groupStandings.length > 2 && groupStandings.map(group => (
                    <div key={`${group.groupId}-dup`} style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '12px',
                      padding: tvMode ? '25px' : '20px',
                      border: '2px solid #3b82f6'
                    }}>
                      <h3 style={{
                        margin: '0 0 20px 0',
                        fontSize: tvMode ? '24px' : '20px',
                        fontWeight: 'bold',
                        color: '#3b82f6'
                      }}>
                        {group.groupName}
                      </h3>

                      <table style={{
                        width: '100%',
                        borderCollapse: 'separate',
                        borderSpacing: '0 8px'
                      }}>
                        <thead>
                          <tr style={{ color: '#94a3b8', fontSize: tvMode ? '16px' : '14px' }}>
                            <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>Pos</th>
                            <th style={{ textAlign: 'left', padding: '8px', fontWeight: 'bold' }}>Player</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>P</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>W</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>L</th>
                            <th style={{ textAlign: 'center', padding: '8px', fontWeight: 'bold' }}>+/-</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.standings.map((player, index) => (
                            <tr key={`${player.playerId}-dup`} style={{
                              background: index === 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              fontSize: tvMode ? '18px' : '16px',
                              color: '#e2e8f0'
                            }}>
                              <td style={{
                                padding: '12px',
                                borderRadius: '8px 0 0 8px',
                                fontWeight: 'bold',
                                color: index === 0 ? '#22c55e' : '#94a3b8'
                              }}>
                                {index + 1}
                              </td>
                              <td style={{ padding: '12px', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {player.playerName}
                                  {getAdvancementCount() > 0 && index < getAdvancementCount() && (
                                    <span style={{
                                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                                      color: 'white',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: tvMode ? '14px' : '12px',
                                      fontWeight: 'bold',
                                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                                    }}>
                                      ✓ ADVANCED
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center' }}>
                                {player.matchesPlayed}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#22c55e', fontWeight: 'bold' }}>
                                {player.wins}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'center', color: '#ef4444' }}>
                                {player.losses}
                              </td>
                              <td style={{
                                padding: '12px',
                                borderRadius: '0 8px 8px 0',
                                textAlign: 'center',
                                color: player.legDifference >= 0 ? '#22c55e' : '#ef4444',
                                fontWeight: 'bold'
                              }}>
                                {player.legDifference >= 0 ? '+' : ''}{player.legDifference}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : isChampionshipComplete && finalResults ? (
            /* Show Final Tournament Positions */
            <div style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '3px solid #f59e0b',
              borderRadius: '20px',
              padding: tvMode ? '40px' : '30px',
              color: 'white',
              boxShadow: '0 20px 60px rgba(245, 158, 11, 0.3)'
            }}>
              <div style={{
                textAlign: 'center',
                marginBottom: '30px'
              }}>
                <h1 style={{
                  fontSize: tvMode ? '36px' : '28px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  background: 'linear-gradient(45deg, #f59e0b, #fbbf24)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>🏆 FINAL STANDINGS</h1>
                <p style={{
                  fontSize: tvMode ? '20px' : '16px',
                  color: '#cbd5e1',
                  margin: '0 0 10px 0'
                }}>{selectedTournament?.name}</p>
                {championshipCompletedAt && (
                  <p style={{
                    fontSize: tvMode ? '14px' : '12px',
                    color: '#64748b',
                    margin: 0,
                    fontStyle: 'italic'
                  }}>
                    Tournament completed at {championshipCompletedAt.toLocaleTimeString()} • Results will display for 1 hour
                  </p>
                )}
              </div>

              {/* Scrolling Final Positions */}
              <div style={{
                maxHeight: tvMode ? '600px' : '500px',
                overflow: 'hidden'
              }}>
                <div style={{
                  animation: 'scrollFinalPositions 25s linear infinite',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Champion */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    borderRadius: '15px',
                    padding: tvMode ? '35px' : '25px',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)'
                  }}>
                    <div style={{ fontSize: tvMode ? '72px' : '56px', marginBottom: '15px' }}>🥇</div>
                    <h2 style={{ 
                      fontSize: tvMode ? '32px' : '24px', 
                      fontWeight: 'bold', 
                      margin: '0 0 15px 0',
                      color: '#1e293b'
                    }}>1ST PLACE</h2>
                    <p style={{ 
                      fontSize: tvMode ? '28px' : '22px', 
                      fontWeight: 'bold',
                      margin: 0,
                      color: '#1e293b'
                    }}>{finalResults.champion.name}</p>
                  </div>

                  {/* Runner-up */}
                  <div style={{
                    background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
                    borderRadius: '15px',
                    padding: tvMode ? '30px' : '22px',
                    textAlign: 'center',
                    color: '#1f2937'
                  }}>
                    <div style={{ fontSize: tvMode ? '64px' : '48px', marginBottom: '15px' }}>🥈</div>
                    <h3 style={{ 
                      fontSize: tvMode ? '28px' : '20px', 
                      fontWeight: 'bold', 
                      margin: '0 0 15px 0'
                    }}>2ND PLACE</h3>
                    <p style={{ 
                      fontSize: tvMode ? '24px' : '18px', 
                      fontWeight: 'bold',
                      margin: 0
                    }}>{finalResults.runnerUp.name}</p>
                  </div>

                  {/* Third Place */}
                  {finalResults.thirdPlace.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                      borderRadius: '15px',
                      padding: tvMode ? '30px' : '22px',
                      textAlign: 'center',
                      color: '#1e293b'
                    }}>
                      <div style={{ fontSize: tvMode ? '56px' : '40px', marginBottom: '15px' }}>🥉</div>
                      <h3 style={{ 
                        fontSize: tvMode ? '24px' : '18px', 
                        fontWeight: 'bold', 
                        margin: '0 0 20px 0'
                      }}>JOINT 3RD PLACE</h3>
                      {finalResults.thirdPlace.map((player, index) => (
                        <p key={player.id} style={{ 
                          fontSize: tvMode ? '20px' : '16px', 
                          fontWeight: 'bold',
                          margin: '8px 0'
                        }}>{player.name}</p>
                      ))}
                    </div>
                  )}

                  {/* Fifth Place */}
                  {finalResults.fifthPlace.length > 0 && (
                    <div style={{
                      background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                      borderRadius: '15px',
                      padding: tvMode ? '30px' : '22px',
                      textAlign: 'center',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: tvMode ? '48px' : '36px', marginBottom: '15px' }}>🏅</div>
                      <h3 style={{ 
                        fontSize: tvMode ? '22px' : '16px', 
                        fontWeight: 'bold', 
                        margin: '0 0 20px 0'
                      }}>JOINT 5TH PLACE</h3>
                      {finalResults.fifthPlace.map((player, index) => (
                        <p key={player.id} style={{ 
                          fontSize: tvMode ? '18px' : '14px', 
                          fontWeight: 'bold',
                          margin: '8px 0'
                        }}>{player.name}</p>
                      ))}
                    </div>
                  )}

                  {/* Duplicate for continuous scroll */}
                  <div style={{
                    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                    borderRadius: '15px',
                    padding: tvMode ? '35px' : '25px',
                    textAlign: 'center',
                    boxShadow: '0 10px 30px rgba(251, 191, 36, 0.4)'
                  }}>
                    <div style={{ fontSize: tvMode ? '72px' : '56px', marginBottom: '15px' }}>🥇</div>
                    <h2 style={{ 
                      fontSize: tvMode ? '32px' : '24px', 
                      fontWeight: 'bold', 
                      margin: '0 0 15px 0',
                      color: '#1e293b'
                    }}>1ST PLACE</h2>
                    <p style={{ 
                      fontSize: tvMode ? '28px' : '22px', 
                      fontWeight: 'bold',
                      margin: 0,
                      color: '#1e293b'
                    }}>{finalResults.champion.name}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Show Match Columns when Round Robin is in Progress */
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '20px'
            }}>
              {/* In Progress Matches */}
              <div style={{ position: 'relative' }}>
            {/* Fixed Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(255, 102, 0, 0.1)',
              border: '2px solid #ff6600',
              borderRadius: '12px',
              padding: tvMode ? '25px' : '20px',
              marginBottom: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: tvMode ? '28px' : '24px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#ff6600'
              }}>
                <Clock size={tvMode ? 32 : 28} />
                In Progress ({inProgressMatches.length})
              </h2>
            </div>
            
            {/* Scrolling Content */}
            <div className="scroll-container" style={{ 
              maxHeight: tvMode ? 'calc(100vh - 300px)' : '800px',
              overflow: needsScrolling(inProgressMatches) ? 'hidden' : 'auto'
            }}>
              <div 
                className="scroll-content"
                style={{
                  animation: needsScrolling(inProgressMatches) 
                    ? `scroll${scrollSpeed.charAt(0).toUpperCase() + scrollSpeed.slice(1)} ${getScrollDuration(inProgressMatches.length)}s linear infinite`
                    : 'none'
                }}
              >
                {inProgressMatches.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#64748b',
                    fontSize: '16px'
                  }}>
                    No matches currently in progress
                  </div>
                ) : (
                  <>
                    {inProgressMatches.map(match => (
                      <MatchCard key={match.id} match={match} type="in-progress" tvMode={tvMode} />
                    ))}
                    {needsScrolling(inProgressMatches) && inProgressMatches.map(match => (
                      <MatchCard key={`${match.id}-dup`} match={match} type="in-progress" tvMode={tvMode} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Matches */}
          <div style={{ position: 'relative' }}>
            {/* Fixed Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(59, 130, 246, 0.1)',
              border: '2px solid #3b82f6',
              borderRadius: '12px',
              padding: tvMode ? '25px' : '20px',
              marginBottom: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: tvMode ? '28px' : '24px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#3b82f6'
              }}>
                <Trophy size={tvMode ? 32 : 28} />
                Upcoming Matches ({upcomingMatches.length})
              </h2>
            </div>
            
            {/* Scrolling Content */}
            <div className="scroll-container" style={{ 
              maxHeight: tvMode ? 'calc(100vh - 300px)' : '800px',
              overflow: needsScrolling(upcomingMatches) ? 'hidden' : 'auto'
            }}>
              <div 
                className="scroll-content"
                style={{
                  animation: needsScrolling(upcomingMatches) 
                    ? `scroll${scrollSpeed.charAt(0).toUpperCase() + scrollSpeed.slice(1)} ${getScrollDuration(upcomingMatches.length)}s linear infinite`
                    : 'none'
                }}
              >
                {upcomingMatches.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#64748b',
                    fontSize: '16px'
                  }}>
                    No upcoming matches
                  </div>
                ) : (
                  <>
                    {upcomingMatches.map(match => (
                      <MatchCard key={match.id} match={match} type="upcoming" tvMode={tvMode} />
                    ))}
                    {needsScrolling(upcomingMatches) && upcomingMatches.map(match => (
                      <MatchCard key={`${match.id}-dup`} match={match} type="upcoming" tvMode={tvMode} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Completed Matches */}
          <div style={{ position: 'relative' }}>
            {/* Fixed Header */}
            <div style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: 'rgba(34, 197, 94, 0.1)',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: tvMode ? '25px' : '20px',
              marginBottom: '15px',
              backdropFilter: 'blur(10px)'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: tvMode ? '28px' : '24px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#22c55e'
              }}>
                <CheckCircle size={tvMode ? 32 : 28} />
                Match Results ({completedMatches.length})
              </h2>
            </div>
            
            {/* Scrolling Content */}
            <div className="scroll-container" style={{ 
              maxHeight: tvMode ? 'calc(100vh - 300px)' : '800px',
              overflow: needsScrolling(completedMatches) ? 'hidden' : 'auto'
            }}>
              <div 
                className="scroll-content"
                style={{
                  animation: needsScrolling(completedMatches) 
                    ? `scroll${scrollSpeed.charAt(0).toUpperCase() + scrollSpeed.slice(1)} ${getScrollDuration(completedMatches.length)}s linear infinite`
                    : 'none'
                }}
              >
                {completedMatches.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    color: '#64748b',
                    fontSize: '16px'
                  }}>
                    No completed matches yet
                  </div>
                ) : (
                  <>
                    {completedMatches.map(match => (
                      <MatchCard key={match.id} match={match} type="completed" tvMode={tvMode} />
                    ))}
                    {needsScrolling(completedMatches) && completedMatches.map(match => (
                      <MatchCard key={`${match.id}-dup`} match={match} type="completed" tvMode={tvMode} />
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TournamentDisplay;

<style jsx>{`
  @keyframes celebrationPulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.9; }
  }

  @keyframes celebrationBounce {
    0% { transform: translateY(-100px) scale(0.8); opacity: 0; }
    50% { transform: translateY(20px) scale(1.1); opacity: 1; }
    100% { transform: translateY(0) scale(1); opacity: 1; }
  }

  @keyframes sparkle {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.2); }
    50% { transform: scale(0.9); }
    75% { transform: scale(1.1); }
  }

  @keyframes scrollResults {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }

  @keyframes scrollFinalPositions {
    0% { transform: translateY(0); }
    100% { transform: translateY(-50%); }
  }
`}</style>
