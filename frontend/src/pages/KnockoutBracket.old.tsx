import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Calendar, Users, RefreshCw } from 'lucide-react';
import type { Match, MatchGame, Participant } from 'brackets-model';

interface Player {
  id: string;
  name: string;
  groupLetter?: string;
  groupRank?: number;
}

interface KnockoutMatch {
  player1: Player | null;
  player2: Player | null;
  player1Score?: number;
  player2Score?: number;
  round: string;
  match: number;
  overallSeed1?: number;
  overallSeed2?: number;
  completed?: boolean;
  winner?: Player | null;
  bracket_position: number;
}

// Brackets-viewer data structure
interface BracketData {
  stages: Array<{
    id: number;
    tournament_id: number;
    name: string;
    type: 'single_elimination' | 'double_elimination';
    number: number;
    settings: {
      size?: number;
      seedOrdering?: string[];
      grandFinal?: string;
    };
  }>;
  groups: Array<{
    id: number;
    stage_id: number;
    number: number;
  }>;
  rounds: Array<{
    id: number;
    number: number;
    stage_id: number;
    group_id: number;
  }>;
  matches: Match[];
  match_games: MatchGame[];
  participants: Participant[];
}

const KnockoutBracket: React.FC = () => {
  const bracketRef = useRef<HTMLDivElement>(null);
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>([]);
  const [tournamentData, setTournamentData] = useState<any>(null);
  const [bracketInitialized, setBracketInitialized] = useState(false);
  const [participants, setParticipants] = useState<Player[]>([]);

  // Load tournament data and knockout bracket from localStorage/API
  useEffect(() => {
    const loadKnockoutData = () => {
      try {
        // Try to load from localStorage first (for demo purposes)
        const savedTournament = localStorage.getItem('currentTournament');
        const savedKnockout = localStorage.getItem('knockoutBracket');
        
        console.log('🔍 Loading knockout bracket data...');
        console.log('Tournament data:', savedTournament);
        console.log('Knockout data:', savedKnockout);
        
        if (savedTournament) {
          setTournamentData(JSON.parse(savedTournament));
        }
        
        if (savedKnockout) {
          const matches = JSON.parse(savedKnockout);
          console.log('✅ Loaded knockout bracket with', matches.length, 'matches');
          setKnockoutMatches(matches);
          extractParticipants(matches);
        } else {
          console.log('ℹ️ No saved knockout bracket found, generating sample...');
          // Generate sample bracket for demonstration
          generateSampleBracket();
        }
      } catch (error) {
        console.error('❌ Error loading knockout data:', error);
        generateSampleBracket();
      }
    };

    loadKnockoutData();
    
    // Refresh data when tab becomes visible (when user navigates back)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Tab visible, refreshing knockout bracket...');
        setBracketInitialized(false); // Force re-initialization
        loadKnockoutData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Also listen for custom event from GroupStage when bracket is generated
    const handleBracketUpdate = () => {
      console.log('🔄 Received bracket update event');
      setBracketInitialized(false);
      loadKnockoutData();
    };
    
    window.addEventListener('knockoutBracketUpdated', handleBracketUpdate);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('knockoutBracketUpdated', handleBracketUpdate);
    };
  }, []);

  // Initialize brackets-viewer when data is ready
  useEffect(() => {
    if (bracketRef.current && participants.length > 0 && !bracketInitialized) {
      initializeBracket();
    }
  }, [participants, bracketInitialized]);

  const extractParticipants = (matches: KnockoutMatch[]) => {
    const uniquePlayers = new Map<string, Player>();
    
    matches.forEach(match => {
      if (match.player1 && !uniquePlayers.has(match.player1.id)) {
        uniquePlayers.set(match.player1.id, match.player1);
      }
      if (match.player2 && !uniquePlayers.has(match.player2.id)) {
        uniquePlayers.set(match.player2.id, match.player2);
      }
    });
    
    setParticipants(Array.from(uniquePlayers.values()));
  };

  const generateSampleBracket = () => {
    // Sample bracket with 8 players
    const sampleMatches: KnockoutMatch[] = [
      // Quarter-finals (Round 1)
      {
        player1: { id: '1', name: 'Dana', groupLetter: 'A', groupRank: 1 },
        player2: { id: '8', name: 'Cecil', groupLetter: 'B', groupRank: 2 },
        round: 'Quarter-Final',
        match: 1,
        overallSeed1: 1,
        overallSeed2: 8,
        bracket_position: 1,
        player1Score: 3,
        player2Score: 0,
        completed: true,
        winner: { id: '1', name: 'Dana' }
      },
      {
        player1: { id: '4', name: 'Steve', groupLetter: 'A', groupRank: 2 },
        player2: { id: '5', name: 'Matthew', groupLetter: 'B', groupRank: 1 },
        round: 'Quarter-Final',
        match: 2,
        overallSeed1: 4,
        overallSeed2: 5,
        bracket_position: 2,
        player1Score: 3,
        player2Score: 2,
        completed: true,
        winner: { id: '4', name: 'Steve' }
      },
      {
        player1: { id: '3', name: 'Tyler S', groupLetter: 'C', groupRank: 1 },
        player2: { id: '6', name: 'Mark', groupLetter: 'D', groupRank: 2 },
        round: 'Quarter-Final',
        match: 3,
        overallSeed1: 3,
        overallSeed2: 6,
        bracket_position: 3,
        player1Score: 3,
        player2Score: 1,
        completed: true,
        winner: { id: '3', name: 'Tyler S' }
      },
      {
        player1: { id: '2', name: 'René', groupLetter: 'C', groupRank: 2 },
        player2: { id: '7', name: 'Aubrey', groupLetter: 'D', groupRank: 1 },
        round: 'Quarter-Final',
        match: 4,
        overallSeed1: 2,
        overallSeed2: 7,
        bracket_position: 4,
        player1Score: 1,
        player2Score: 3,
        completed: true,
        winner: { id: '7', name: 'Aubrey' }
      },
      // Semi-finals (Round 2)
      {
        player1: { id: '1', name: 'Dana' },
        player2: { id: '4', name: 'Steve' },
        round: 'Semi-Final',
        match: 1,
        bracket_position: 5,
        player1Score: 3,
        player2Score: 1,
        completed: true,
        winner: { id: '1', name: 'Dana' }
      },
      {
        player1: { id: '3', name: 'Tyler S' },
        player2: { id: '7', name: 'Aubrey' },
        round: 'Semi-Final',
        match: 2,
        bracket_position: 6,
        player1Score: 2,
        player2Score: 3,
        completed: true,
        winner: { id: '7', name: 'Aubrey' }
      },
      // Final
      {
        player1: { id: '1', name: 'Dana' },
        player2: { id: '7', name: 'Aubrey' },
        round: 'Final',
        match: 1,
        bracket_position: 7,
        completed: false
      }
    ];

    setKnockoutMatches(sampleMatches);
    extractParticipants(sampleMatches);
  };

  const initializeBracket = () => {
    setBracketInitialized(true);
  };

  const convertToBracketFormat = (matches: KnockoutMatch[], players: Player[]): BracketData => {
    const participantsList: Participant[] = players.map((player, index) => ({
      id: parseInt(player.id),
      tournament_id: 1,
      name: player.name
    }));

    const matchesList: Match[] = matches.map((match, index) => ({
      id: index + 1,
      stage_id: 1,
      group_id: 1,
      round_id: getRoundId(match.round),
      number: match.match,
      child_count: 0,
      status: match.completed ? 4 : 2, // 4 = completed, 2 = ready
      opponent1: match.player1 ? {
        id: parseInt(match.player1.id),
        position: match.overallSeed1,
        score: match.player1Score,
        result: match.completed && match.winner?.id === match.player1.id ? 'win' : match.completed ? 'loss' : undefined
      } : null,
      opponent2: match.player2 ? {
        id: parseInt(match.player2.id),
        position: match.overallSeed2,
        score: match.player2Score,
        result: match.completed && match.winner?.id === match.player2.id ? 'win' : match.completed ? 'loss' : undefined
      } : null
    }));

    // Determine bracket size
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(players.length)));

    return {
      stages: [{
        id: 1,
        tournament_id: 1,
        name: 'Knockout Stage',
        type: 'single_elimination',
        number: 1,
        settings: {
          size: bracketSize
        }
      }],
      groups: [{
        id: 1,
        stage_id: 1,
        number: 1
      }],
      rounds: [
        { id: 1, number: 1, stage_id: 1, group_id: 1 },
        { id: 2, number: 2, stage_id: 1, group_id: 1 },
        { id: 3, number: 3, stage_id: 1, group_id: 1 }
      ],
      matches: matchesList,
      match_games: [],
      participants: participantsList
    };
  };

  const getRoundId = (roundName: string): number => {
    const roundMap: { [key: string]: number } = {
      'Quarter-Final': 1,
      'Semi-Final': 2,
      'Final': 3
    };
    return roundMap[roundName] || 1;
  };

  const handleRefresh = () => {
    setBracketInitialized(false);
    const savedKnockout = localStorage.getItem('knockoutBracket');
    if (savedKnockout) {
      const matches = JSON.parse(savedKnockout);
      setKnockoutMatches(matches);
      extractParticipants(matches);
    }
    setTimeout(() => {
      initializeBracket();
    }, 100);
  };

  const renderBracketByRound = () => {
    if (knockoutMatches.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-center">
            <p className="text-slate-400 text-lg">No knockout bracket generated yet.</p>
            <p className="text-slate-500 text-sm mt-2">Go to Group Stage and click "Generate Knockout Bracket"</p>
          </div>
        </div>
      );
    }

    // Group matches by round
    const matchesByRound: { [round: string]: KnockoutMatch[] } = {};
    knockoutMatches.forEach(match => {
      if (!matchesByRound[match.round]) {
        matchesByRound[match.round] = [];
      }
      matchesByRound[match.round].push(match);
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

    console.log(`Bracket Info: ${totalPlayers} players, ${totalRounds} rounds, Rounds: ${rounds.join(', ')}`);

    // Find the champion (final round winner)
    const finalRound = rounds[rounds.length - 1];
    const finalMatch = matchesByRound[finalRound]?.[0];
    const champion = finalMatch?.winner;

    // Dynamic spacing based on bracket size (scales for larger brackets)
    const baseSpacing = totalPlayers <= 16 ? 80 : totalPlayers <= 32 ? 60 : 40;
    const roundGap = totalPlayers <= 16 ? 80 : totalPlayers <= 32 ? 70 : 60;

    return (
      <div className="relative py-12 bg-slate-50 min-h-screen overflow-auto">
        {/* Bracket Info Bar */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-50">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Tournament Bracket</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              {totalPlayers} Players • {totalRounds} Rounds
            </p>
          </div>
          {champion && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 px-4 py-2 rounded-lg">
              <span className="text-xs font-bold text-yellow-600 uppercase">Champion:</span>
              <span className="text-sm font-black text-slate-800">{champion.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center pt-16" style={{ gap: `${roundGap}px`, minWidth: 'max-content', padding: `64px ${roundGap}px` }}>
          {rounds.map((roundName, roundIndex) => {
            const matches = matchesByRound[roundName];
            // Exponential spacing for clean bracket layout - scales dynamically
            const verticalGap = Math.pow(2, roundIndex) * baseSpacing;
            
            return (
              <div key={roundName} className="relative flex flex-col items-center">
                {/* Round Header */}
                <div className="mb-8 sticky top-20 z-10">
                  <div className="bg-white border-2 border-slate-200 px-6 py-2 rounded-lg font-bold text-slate-800 shadow-sm text-sm">
                    {roundName}
                  </div>
                </div>
                
                {/* Matches Column */}
                <div className="flex flex-col" style={{ gap: `${verticalGap}px` }}>
                  {matches.map((match, matchIndex) => (
                    <div key={match.bracket_position} className="relative">
                      {/* Match Card */}
                      <div className="bg-white border-2 border-slate-200 rounded-xl shadow-lg hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200 cursor-pointer w-56">
                        {/* Player 1 */}
                        <div 
                          className={`flex items-center justify-between px-3 py-3 border-b ${
                            match.winner?.id === match.player1?.id 
                              ? 'bg-green-50 text-green-800 font-semibold' 
                              : match.player1 ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {match.overallSeed1 && (
                              <span className="flex-shrink-0 text-[10px] font-bold text-slate-400">
                                {match.overallSeed1}
                              </span>
                            )}
                            <span className="truncate text-sm">
                              {match.player1?.name || 'TBD'}
                            </span>
                          </div>
                          {match.player1Score !== undefined && (
                            <span 
                              className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center ${
                                match.winner?.id === match.player1?.id 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {match.player1Score}
                            </span>
                          )}
                        </div>
                        
                        {/* Player 2 */}
                        <div 
                          className={`flex items-center justify-between px-3 py-3 ${
                            match.winner?.id === match.player2?.id 
                              ? 'bg-green-50 text-green-800 font-semibold' 
                              : match.player2 ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {match.overallSeed2 && (
                              <span className="flex-shrink-0 text-[10px] font-bold text-slate-400">
                                {match.overallSeed2}
                              </span>
                            )}
                            <span className="truncate text-sm">
                              {match.player2?.name || 'TBD'}
                            </span>
                          </div>
                          {match.player2Score !== undefined && (
                            <span 
                              className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center ${
                                match.winner?.id === match.player2?.id 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {match.player2Score}
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
                            stroke="#cbd5e1" 
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
                                stroke="#cbd5e1" 
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                              {/* Horizontal line to next round */}
                              <line 
                                x1={roundGap / 2} 
                                y1={`calc(50% + ${verticalGap / 2 + 75}px)`}
                                x2={roundGap} 
                                y2={`calc(50% + ${verticalGap / 2 + 75}px)`}
                                stroke="#cbd5e1" 
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
                                stroke="#cbd5e1" 
                                strokeWidth="2"
                                strokeLinejoin="round"
                              />
                            </>
                          )}
                        </svg>
                      )}
                    </div>
                  ))}
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
      </div>
    );
  };

  if (knockoutMatches.length === 0) {
    return (
      <div className="p-10 text-center">
        <Trophy size={64} color="#64748b" />
        <h2 className="mt-5 text-gray-400 mb-2">Knockout Bracket</h2>
        <p className="text-gray-400 mb-5">
          No knockout bracket has been generated yet.
        </p>
        <p className="text-gray-500 text-sm">
          Complete the group stage and generate the knockout bracket from the Group Stage tab.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy size={32} className="text-yellow-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Knockout Bracket</h1>
              <p className="text-purple-100">Tournament Elimination Rounds</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-purple-100">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} />
                <span className="text-sm">{participants.length} Participants</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <span className="text-sm">Live Tournament</span>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
              title="Refresh bracket"
            >
              <RefreshCw size={18} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bracket Visualization Container */}
      <div className="px-6 pb-6">
        <div className="bg-gray-800 rounded-lg border border-gray-600 overflow-x-auto">
          <div className="p-6">
            {/* Custom Bracket Display */}
            <div className="knockout-bracket-display">
              {renderBracketByRound()}
            </div>
            
            {/* Championship indicator */}
            {knockoutMatches.find(m => m.round === 'Final' && m.completed) && (
              <div className="text-center mt-8 pt-6 border-t border-gray-600">
                <Trophy size={48} className="text-yellow-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-white mb-2">Tournament Champion</h2>
                <p className="text-xl text-yellow-400 font-medium">
                  {knockoutMatches.find(m => m.round === 'Final' && m.completed)?.winner?.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnockoutBracket;
