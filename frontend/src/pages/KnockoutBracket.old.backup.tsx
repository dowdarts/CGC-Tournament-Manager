import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { Match, Player, Tournament } from '@/types';
import { X, Trophy, Printer, RotateCcw } from 'lucide-react';
import { TournamentService } from '@/services/api';

interface KnockoutMatch extends Match {
  player1?: Player;
  player2?: Player;
  winner?: Player;
  round_name?: string;
}

const KnockoutBracket: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<KnockoutMatch | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Setup mode states
  const [setupMode, setSetupMode] = useState(false);
  const [groupStandings, setGroupStandings] = useState<any>({});
  const [advancementCounts, setAdvancementCounts] = useState<{ [groupLetter: string]: number }>({});
  const [seedingPlayers, setSeedingPlayers] = useState<Player[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Helper: Get next power of 2 for bracket size
  const getBracketSize = (playerCount: number): number => {
    if (playerCount <= 2) return 2;
    return Math.pow(2, Math.ceil(Math.log2(playerCount)));
  };

  useEffect(() => {
    if (id) {
      checkSetupMode();
    }
  }, [id]);
  
  const checkSetupMode = async () => {
    // Check if we're in setup mode (coming from group stage)
    const setupModeFlag = localStorage.getItem('knockoutSetupMode');
    const standingsJson = localStorage.getItem('groupStandings');
    
    if (setupModeFlag === 'true' && standingsJson) {
      // Enter setup mode
      const standings = JSON.parse(standingsJson);
      setGroupStandings(standings);
      setSetupMode(true);
      
      // Initialize advancement counts (default 2 per group)
      const counts: { [key: string]: number } = {};
      Object.keys(standings).forEach(letter => {
        counts[letter] = 2;
      });
      setAdvancementCounts(counts);
      
      setLoading(false);
    } else {
      // Normal mode - check for existing bracket
      checkAndGenerateBracket();
    }
  };

  const checkAndGenerateBracket = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Check if knockout matches already exist
      const { data: existingMatches, error } = await supabase
        .from('matches')
        .select('id')
        .eq('tournament_id', id)
        .is('group_id', null)
        .limit(1);
      
      if (error) throw error;
      
      if (!existingMatches || existingMatches.length === 0) {
        // No knockout matches exist - check if we should generate them
        const advancementCountsJson = localStorage.getItem('knockoutAdvancementCounts');
        
        if (advancementCountsJson) {
          // Auto-generate bracket
          await generateKnockoutBracket();
        } else {
          // Just load empty state
          setKnockoutMatches([]);
          setLoading(false);
        }
      } else {
        // Knockout matches exist - load them
        await loadKnockoutMatches();
      }
    } catch (error) {
      console.error('❌ Error checking knockout matches:', error);
      setLoading(false);
    }
  };

  const generateKnockoutBracket = async () => {
    if (!id) return;
    
    try {
      setGenerating(true);
      
      // Get advancement counts from localStorage
      const advancementCountsJson = localStorage.getItem('knockoutAdvancementCounts');
      const advancementCounts = advancementCountsJson ? JSON.parse(advancementCountsJson) : {};
      
      // Get group standings from localStorage
      const knockoutBracketJson = localStorage.getItem('knockoutBracket');
      if (!knockoutBracketJson) {
        alert('No knockout bracket data found. Please go back to Group Stage and click \"Start Knockout Bracket\"');
        setGenerating(false);
        setLoading(false);
        return;
      }
      
      const fullBracket = JSON.parse(knockoutBracketJson);
      
      // Save matches to database
      const matchesToCreate = fullBracket.map((match: any, index: number) => ({
        tournament_id: id,
        player1_id: match.player1?.id || null,
        player2_id: match.player2?.id || null,
        player1_legs: 0,
        player2_legs: 0,
        winner_id: null,
        status: 'scheduled',
        group_id: null // Null for knockout matches
      }));
      
      // Create matches in database
      const { data: createdMatches, error } = await supabase
        .from('matches')
        .insert(matchesToCreate)
        .select();
      
      if (error) throw error;
      
      console.log('✅ Generated knockout bracket with', createdMatches?.length, 'matches');
      
      // Update tournament status to knockout
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'knockout' })
        .eq('id', id);
      
      if (updateError) throw updateError;
      
      // Load the newly created matches
      await loadKnockoutMatches();
      
    } catch (error) {
      console.error('❌ Error generating knockout bracket:', error);
      alert('Failed to generate knockout bracket. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const loadKnockoutMatches = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Fetch knockout matches from database (group_id IS NULL = knockout matches)
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', id)
        .is('group_id', null)
        .order('created_at', { ascending: true });
      
      // Fetch player data separately
      if (matches && matches.length > 0) {
        const playerIds = new Set<string>();
        matches.forEach(m => {
          if (m.player1_id) playerIds.add(m.player1_id);
          if (m.player2_id) playerIds.add(m.player2_id);
          if (m.winner_id) playerIds.add(m.winner_id);
        });
        
        const { data: players } = await supabase
          .from('players')
          .select('id, name')
          .in('id', Array.from(playerIds));
        
        const playerMap = new Map(players?.map(p => [p.id, p]) || []);
        
        // Add player data to matches
        matches.forEach((match: any) => {
          match.player1 = match.player1_id ? playerMap.get(match.player1_id) : null;
          match.player2 = match.player2_id ? playerMap.get(match.player2_id) : null;
          match.winner = match.winner_id ? playerMap.get(match.winner_id) : null;
        });
      }
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      
      // Load round names from localStorage
      const roundNamesJson = localStorage.getItem('knockoutRoundNames');
      const roundNames = roundNamesJson ? JSON.parse(roundNamesJson) : {};
      
      // Map round names to matches
      const matchesWithRoundNames = (matches || []).map(match => ({
        ...match,
        round_name: roundNames[match.round] || `Round ${match.round}`
      }));
      
      console.log('📦 Loaded knockout matches from database:', matchesWithRoundNames);
      setKnockoutMatches(matchesWithRoundNames);
    } catch (error) {
      console.error('❌ Error loading knockout matches:', error);
      setKnockoutMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMatchClick = (match: KnockoutMatch) => {
    if (!match.player1 || !match.player2) {
      return; // Can't score incomplete matches
    }
    
    setSelectedMatch(match);
    setScore1(match.player1_legs?.toString() || '');
    setScore2(match.player2_legs?.toString() || '');
    setShowScoreModal(true);
  };

  const handleSaveScore = async () => {
    if (!selectedMatch || !id) return;
    
    const s1 = parseInt(score1) || 0;
    const s2 = parseInt(score2) || 0;
    
    if (s1 === s2) {
      alert('Scores cannot be tied in knockout matches');
      return;
    }
    
    try {
      setUpdating(true);
      
      const winnerId = s1 > s2 ? selectedMatch.player1_id : selectedMatch.player2_id;
      
      // Update match in database
      const { error: updateError } = await supabase
        .from('matches')
        .update({
          player1_legs: s1,
          player2_legs: s2,
          winner_id: winnerId,
          status: 'completed'
        })
        .eq('id', selectedMatch.id);
      
      if (updateError) throw updateError;
      
      // Advance winner to next round
      await advanceWinnerToNextRound(selectedMatch, winnerId);
      
      // Reload matches
      await loadKnockoutMatches();
      
      setShowScoreModal(false);
      setSelectedMatch(null);
      setScore1('');
      setScore2('');
    } catch (error) {
      console.error('❌ Error saving score:', error);
      alert('Failed to save score. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const advanceWinnerToNextRound = async (currentMatch: KnockoutMatch, winnerId: string) => {
    if (!id) return;
    
    // Find the next round match
    const currentRound = currentMatch.round || 0;
    const currentPosition = currentMatch.board_number || 0;
    
    // Determine which slot (upper or lower) in the next round
    const isUpperSlot = currentPosition % 2 === 1;
    const nextMatchPosition = Math.ceil(currentPosition / 2);
    
    // Find next round match
    const { data: nextMatches, error: findError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', id)
      .is('group_id', null)
      .eq('round', currentRound + 1)
      .eq('board_number', nextMatchPosition);
    
    if (findError || !nextMatches || nextMatches.length === 0) {
      // This was the final match
      console.log('🏆 Tournament complete!');
      return;
    }
    
    const nextMatch = nextMatches[0];
    
    // Update next match with winner
    const updateField = isUpperSlot ? 'player1_id' : 'player2_id';
    const { error: updateError } = await supabase
      .from('matches')
      .update({ [updateField]: winnerId })
      .eq('id', nextMatch.id);
    
    if (updateError) throw updateError;
    
    console.log(`✅ Advanced winner to ${nextMatch.round_name} Match ${nextMatch.board_number}`);
  };

  const generateBracketFromSetup = async () => {
    if (!id) return;
    
    try {
      setGenerating(true);
      
      // Collect advancing players based on selection
      const advancingPlayersByGroup: { [groupLetter: string]: Player[] } = {};
      
      Object.entries(groupStandings).forEach(([letter, data]: [string, any]) => {
        const count = advancementCounts[letter] || 2;
        advancingPlayersByGroup[letter] = data.standings.slice(0, count).map((s: any) => s.player);
      });
      
      // If user has adjusted seeding, use that order
      let allAdvancing = seedingPlayers.length > 0 ? seedingPlayers : [];
      if (allAdvancing.length === 0) {
        // Flatten all advancing players in group order
        Object.keys(advancingPlayersByGroup).sort().forEach(letter => {
          allAdvancing.push(...advancingPlayersByGroup[letter]);
        });
      }
      
      // Generate bracket structure with byes for non-power-of-2 counts
      const bracketSize = getBracketSize(allAdvancing.length);
      const numByes = bracketSize - allAdvancing.length;
      
      console.log(`📊 Bracket size: ${bracketSize}, Players: ${allAdvancing.length}, Byes: ${numByes}`);
      
      // Create seeded slots with nulls for byes (byes go at the end)
      const seededSlots: (Player | null)[] = [...allAdvancing];
      for (let i = 0; i < numByes; i++) {
        seededSlots.push(null);
      }
      
      const firstRoundMatches = [];
      
      // Standard tournament bracket pairing (1 vs last, 2 vs second-last, etc.)
      for (let i = 0; i < bracketSize / 2; i++) {
        const p1 = seededSlots[i];
        const p2 = seededSlots[bracketSize - 1 - i];
        
        const match: any = {
          player1: p1,
          player2: p2,
          round: 'Round 1',
          isBye: p1 === null || p2 === null
        };
        
        // If one player is null (bye), the other auto-advances
        if (match.isBye) {
          match.winner = p1 || p2;
          match.status = 'completed';
        }
        
        firstRoundMatches.push(match);
      }
      
      // Generate full bracket with all rounds
      const fullBracket = generateFullBracketStructure(firstRoundMatches, allAdvancing.length);
      
      // Create matches in database
      const matchesToCreate = fullBracket.map((match, index) => ({
        tournament_id: id,
        round_number: match.roundNum || 1,
        match_number: match.matchNum || (index + 1),
        board_number: match.bracket_position || (index + 1),
        player1_id: match.player1?.id || null,
        player2_id: match.player2?.id || null,
        player1_legs: 0,
        player2_legs: 0,
        winner_id: match.winner?.id || null,
        status: match.isBye ? 'completed' : 'scheduled',
        group_id: null
      }));
      
      const { data: createdMatches, error } = await supabase
        .from('matches')
        .insert(matchesToCreate)
        .select();
      
      if (error) throw error;
      
      console.log('✅ Created knockout matches:', createdMatches);
      
      // Update tournament status
      const { error: updateError } = await supabase
        .from('tournaments')
        .update({ status: 'knockout' })
        .eq('id', id);
      
      if (updateError) console.error('Error updating tournament status:', updateError);
      
      // Clear setup mode
      localStorage.removeItem('knockoutSetupMode');
      localStorage.removeItem('groupStandings');
      
      // Reload bracket
      setSetupMode(false);
      await loadKnockoutMatches();
    } catch (error) {
      console.error('❌ Error generating bracket:', error);
      alert('Failed to generate bracket. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  
  const generateFullBracketStructure = (firstRoundMatches: any[], totalPlayers: number) => {
    const allMatches: any[] = [];
    let matchCounter = 0;
    let bracketPosition = 1;
    
    const numRounds = Math.ceil(Math.log2(totalPlayers));
    
    const getRoundName = (roundNumber: number, totalRounds: number) => {
      const roundsFromEnd = totalRounds - roundNumber;
      if (roundsFromEnd === 0) return 'Final';
      if (roundsFromEnd === 1) return 'Semi-Final';
      if (roundsFromEnd === 2) return 'Quarter-Final';
      if (roundsFromEnd === 3) return 'Round of 16';
      if (roundsFromEnd === 4) return 'Round of 32';
      if (roundsFromEnd === 5) return 'Round of 64';
      if (roundsFromEnd === 6) return 'Round of 128';
      return `Round ${roundNumber}`;
    };
    
    let currentRoundMatches = firstRoundMatches.map((m, i) => ({
      ...m,
      bracket_position: i + 1,
      round: getRoundName(1, numRounds),
      roundNum: 1,
      matchNum: i + 1
    }));
    
    allMatches.push(...currentRoundMatches);
    
    for (let round = 2; round <= numRounds; round++) {
      const nextRoundMatches = [];
      for (let i = 0; i < currentRoundMatches.length; i += 2) {
        const match1 = currentRoundMatches[i];
        const match2 = currentRoundMatches[i + 1];
        
        // Auto-advance bye winners to next round
        const p1 = match1?.winner || null;
        const p2 = match2?.winner || null;
        
        nextRoundMatches.push({
          player1: p1,
          player2: p2,
          round: getRoundName(round, numRounds),
          bracket_position: allMatches.length + 1,
          roundNum: round,
          matchNum: nextRoundMatches.length + 1
        });
      }
      allMatches.push(...nextRoundMatches);
      currentRoundMatches = nextRoundMatches;
    }
    
    return allMatches;
  };

  const renderBracketByRound = () => {
    if (knockoutMatches.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <p className="text-slate-400 text-lg">No knockout bracket generated yet.</p>
            <p className="text-slate-500 text-sm mt-2">Go to Group Stage and click "Start Knockout Bracket"</p>
          </div>
        </div>
      );
    }

    // Group matches by round
    const matchesByRound: { [round: string]: KnockoutMatch[] } = {};
    knockoutMatches.forEach(match => {
      const roundName = match.round_name || 'Unknown';
      if (!matchesByRound[roundName]) {
        matchesByRound[roundName] = [];
      }
      matchesByRound[roundName].push(match);
    });

    const rounds = Object.keys(matchesByRound).sort((a, b) => {
      const order: { [key: string]: number } = {
        'Round of 128': 1, 'Round of 64': 2, 'Round of 32': 3, 'Round of 16': 4,
        'Quarter-Final': 5, 'Semi-Final': 6, 'Final': 7
      };
      return (order[a] || 0) - (order[b] || 0);
    });

    // Calculate total players from first round
    const firstRound = rounds[0];
    const firstRoundMatches = matchesByRound[firstRound] || [];
    const totalPlayers = firstRoundMatches.length * 2;
    const totalRounds = Math.log2(totalPlayers);

    // Find the champion
    const finalRound = rounds[rounds.length - 1];
    const finalMatch = matchesByRound[finalRound]?.[0];
    const champion = finalMatch?.winner;

    // Dynamic spacing based on bracket size
    const baseSpacing = totalPlayers <= 16 ? 80 : totalPlayers <= 32 ? 60 : 40;
    const roundGap = totalPlayers <= 16 ? 80 : totalPlayers <= 32 ? 70 : 60;

    return (
      <div className="relative py-12 min-h-screen overflow-auto" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        {/* Bracket Info Bar with Search */}
        <div className="fixed top-0 left-0 right-0 border-b px-6 py-3 z-50" style={{ background: 'linear-gradient(90deg, #1e293b, #334155)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <div className="flex justify-between items-center gap-4">
            <div className="flex-1">
              <h1 className="text-lg font-bold text-white">🏆 Tournament Bracket</h1>
              <p className="text-xs text-slate-300 uppercase tracking-widest">
                {totalPlayers} Players • {totalRounds} Rounds • Click any match to enter scores
              </p>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="🔍 Search player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: 'white' }}
              />
            </div>
            
            {champion && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)', boxShadow: '0 4px 20px rgba(251, 191, 36, 0.3)' }}>
                <Trophy className="w-4 h-4 text-white" />
                <span className="text-xs font-bold text-white uppercase">Champion:</span>
                <span className="text-sm font-black text-white">{champion.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center pt-16" style={{ gap: `${roundGap}px`, minWidth: 'max-content', padding: `64px ${roundGap}px` }}>
          {rounds.map((roundName, roundIndex) => {
            const matches = matchesByRound[roundName];
            const verticalGap = Math.pow(2, roundIndex) * baseSpacing;
            
            return (
              <div key={roundName} className="relative flex flex-col items-center">
                {/* Round Header */}
                <div className="mb-8 sticky top-20 z-10">
                  <div className="text-white px-8 py-3 rounded-full shadow-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '2px solid rgba(59, 130, 246, 0.5)', boxShadow: '0 10px 40px rgba(59, 130, 246, 0.4)' }}>
                    {roundName}
                  </div>
                </div>
                
                {/* Matches Column */}
                <div className="flex flex-col" style={{ gap: `${verticalGap}px` }}>
                  {matches.map((match, matchIndex) => {
                    // Check if this match should be highlighted by search
                    const isSearchMatch = searchTerm.length > 0 && (
                      match.player1?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      match.player2?.name.toLowerCase().includes(searchTerm.toLowerCase())
                    );
                    
                    return (
                    <div key={match.id} className="relative">
                      {/* Match Card - Clickable for scoring */}
                      <div 
                        onClick={() => handleMatchClick(match)}
                        className={`rounded-xl transition-all duration-200 w-56 ${
                          isSearchMatch
                            ? 'ring-4 ring-blue-400 shadow-2xl scale-105'
                            : match.player1 && match.player2 && match.status !== 'completed'
                            ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-xl'
                            : match.status === 'completed'
                            ? ''
                            : 'cursor-not-allowed opacity-60'
                        }`}
                        style={{ background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(10px)', border: '2px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
                      >
                        {/* Player 1 */}
                        <div 
                          className={`flex items-center justify-between px-3 py-3 border-b font-semibold ${
                            match.player1 ? 'text-white' : 'text-slate-400'
                          }`}
                          style={match.winner_id === match.player1_id ? { background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)', borderColor: 'rgba(16, 185, 129, 0.3)' } : { background: 'rgba(15, 23, 42, 0.5)', borderColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate text-sm">
                              {match.player1?.name || 'TBD'}
                            </span>
                          </div>
                          {match.player1_legs !== null && match.player1_legs !== undefined && (
                            <span 
                              className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center text-white`}
                              style={match.winner_id === match.player1_id ? { background: '#22c55e', boxShadow: '0 2px 10px rgba(34, 197, 94, 0.4)' } : { background: 'rgba(30, 41, 59, 0.8)' }}
                            >
                              {match.player1_legs}
                            </span>
                          )}
                        </div>
                        
                        {/* Player 2 */}
                        <div 
                          className={`flex items-center justify-between px-3 py-3 font-semibold ${
                            match.player2 ? 'text-white' : 'text-slate-400'
                          }`}
                          style={match.winner_id === match.player2_id ? { background: 'linear-gradient(90deg, #10b981, #059669)', boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)' } : { background: 'rgba(15, 23, 42, 0.5)' }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate text-sm">
                              {match.player2?.name || 'TBD'}
                            </span>
                          </div>
                          {match.player2_legs !== null && match.player2_legs !== undefined && (
                            <span 
                              className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center text-white`}
                              style={match.winner_id === match.player2_id ? { background: '#22c55e', boxShadow: '0 2px 10px rgba(34, 197, 94, 0.4)' } : { background: 'rgba(30, 41, 59, 0.8)' }}
                            >
                              {match.player2_legs}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Connector Lines to Next Round */}
                      {roundIndex < rounds.length - 1 && (
                        <svg 
                          className="absolute top-1/2 left-full pointer-events-none" 
                          style={{ 
                            width: `${roundGap}px`,
                            height: `${verticalGap + 150}px`,
                            transform: 'translateY(-50%)',
                            overflow: 'visible'
                          }}
                        >
                          {/* Horizontal line from match */}
                          <line 
                            x1="0" 
                            y1="50%" 
                            x2={roundGap / 2} 
                            y2="50%" 
                            stroke="rgba(148, 163, 184, 0.5)" 
                            strokeWidth="2"
                            strokeLinejoin="round"
                          />
                          
                          {/* Vertical and horizontal connecting lines (pairs of matches) */}
                          {matchIndex % 2 === 0 && matchIndex < matches.length - 1 && (
                            <>
                              {/* Vertical line down to midpoint between this match and next */}
                              <line 
                                x1={roundGap / 2} 
                                y1="50%" 
                                x2={roundGap / 2} 
                                y2={`calc(50% + ${verticalGap / 2 + 75}px)`}
                                stroke="rgba(148, 163, 184, 0.5)" 
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              {/* Horizontal line to next round */}
                              <line 
                                x1={roundGap / 2} 
                                y1={`calc(50% + ${verticalGap / 2 + 75}px)`}
                                x2={roundGap} 
                                y2={`calc(50% + ${verticalGap / 2 + 75}px)`}
                                stroke="rgba(148, 163, 184, 0.5)" 
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            </>
                          )}
                          {matchIndex % 2 === 1 && (
                            <>
                              {/* Vertical line up to midpoint */}
                              <line 
                                x1={roundGap / 2} 
                                y1="50%" 
                                x2={roundGap / 2} 
                                y2={`calc(50% - ${verticalGap / 2 + 75}px)`}
                                stroke="rgba(148, 163, 184, 0.5)" 
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            </>
                          )}
                        </svg>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Champion Display */}
          <div className="relative flex flex-col items-center">
            <div className="mb-8 sticky top-20 z-10">
              <div className="bg-yellow-50 border-2 border-yellow-400 px-6 py-2 rounded-lg font-bold text-yellow-700 shadow-sm text-sm">
                Champion
              </div>
            </div>
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl shadow-2xl p-6 text-center w-56">
              <div className="text-[10px] font-bold text-yellow-600 uppercase mb-2 tracking-widest">
                Tournament Winner
              </div>
              <div className="text-2xl font-black text-slate-800 tracking-tight">
                {champion ? champion.name : '???'}
              </div>
            </div>
          </div>
        </div>

        {/* Score Input Modal */}
        {showScoreModal && selectedMatch && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">Enter Match Score</h3>
                <button 
                  onClick={() => setShowScoreModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Player 1 Score Input */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700 truncate mr-4 flex-1">
                    {selectedMatch.player1?.name}
                  </span>
                  <input 
                    type="number" 
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                  />
                </div>
                
                <div className="text-center text-slate-300 font-black">VS</div>
                
                {/* Player 2 Score Input */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700 truncate mr-4 flex-1">
                    {selectedMatch.player2?.name}
                  </span>
                  <input 
                    type="number" 
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    className="w-20 p-2 border border-slate-300 rounded-lg text-center font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    min="0"
                  />
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => setShowScoreModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                  disabled={updating}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveScore}
                  className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={updating}
                >
                  {updating ? 'Saving...' : 'Save & Advance Winner'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading || generating) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-300">{generating ? 'Generating knockout bracket...' : 'Loading bracket...'}</p>
        </div>
      </div>
    );
  }
  
  // Render setup mode UI
  if (setupMode) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">🏆 Setup Knockout Bracket</h2>
          <p className="text-slate-600 mb-6">Select how many players advance from each group and confirm their seeding positions.</p>
          
          {/* Advancement Count Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {Object.entries(groupStandings).map(([letter, data]: [string, any]) => (
              <div key={letter} className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">Group {letter}</h3>
                <label className="block text-sm text-slate-600 mb-2">Players advancing:</label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  value={advancementCounts[letter] || 2}
                  onChange={(e) => setAdvancementCounts({ ...advancementCounts, [letter]: parseInt(e.target.value) })}
                >
                  {[1, 2, 3, 4].map(num => (
                    <option key={num} value={num}>{num} player{num > 1 ? 's' : ''}</option>
                  ))}
                </select>
                
                {/* Show advancing players */}
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Advancing:</p>
                  {data.standings.slice(0, advancementCounts[letter] || 2).map((s: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                      <span className="font-medium">{idx + 1}. {s.player.name}</span>
                      <span className="text-xs text-slate-500">{s.wins}W-{s.losses}L</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Preview Total Players */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-900 font-semibold">
              Total players in knockout bracket: {Object.values(advancementCounts).reduce((sum, count) => sum + count, 0)}
            </p>
            <p className="text-blue-700 text-sm mt-1">
              Players will be seeded based on their group standings with standard tournament crossover.
            </p>
            {(() => {
              const totalPlayers = Object.values(advancementCounts).reduce((sum, count) => sum + count, 0);
              const bracketSize = getBracketSize(totalPlayers);
              const numByes = bracketSize - totalPlayers;
              return numByes > 0 ? (
                <p className="text-blue-700 text-sm mt-2 font-semibold">
                  ⚡ {numByes} bye{numByes > 1 ? 's' : ''} will be assigned (bracket size: {bracketSize}) - Top seeds automatically advance to Round 2
                </p>
              ) : null;
            })()}
          </div>
          
          {/* Generate Bracket Button */}
          <div className="flex justify-center gap-4">
            <button
              className="btn btn-secondary"
              onClick={() => {
                localStorage.removeItem('knockoutSetupMode');
                localStorage.removeItem('groupStandings');
                setSetupMode(false);
                checkAndGenerateBracket();
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={generateBracketFromSetup}
              disabled={generating}
            >
              {generating ? 'Generating Bracket...' : '🏆 Generate Knockout Bracket'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return renderBracketByRound();
};

export default KnockoutBracket;
