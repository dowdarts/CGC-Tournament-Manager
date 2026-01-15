import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/services/supabase';
import { Match, Player } from '@/types';
import { X, Trophy } from 'lucide-react';

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
  const [selectedMatch, setSelectedMatch] = useState<KnockoutMatch | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      loadKnockoutMatches();
    }
  }, [id]);

  const loadKnockoutMatches = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Fetch knockout matches from database
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *,
          player1:players!matches_player1_id_fkey(id, name),
          player2:players!matches_player2_id_fkey(id, name),
          winner:players!matches_winner_id_fkey(id, name)
        `)
        .eq('tournament_id', id)
        .is('group_id', null)
        .order('round', { ascending: true })
        .order('board_number', { ascending: true });
      
      if (error) throw error;
      
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
    setScore1(match.player1_score?.toString() || '');
    setScore2(match.player2_score?.toString() || '');
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
          player1_score: s1,
          player2_score: s2,
          winner_id: winnerId,
          completed: true
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
      <div className="relative py-12 bg-slate-50 min-h-screen overflow-auto">
        {/* Bracket Info Bar */}
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center z-50">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Tournament Bracket</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">
              {totalPlayers} Players • {totalRounds} Rounds • Click any match to enter scores
            </p>
          </div>
          {champion && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-300 px-4 py-2 rounded-lg">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="text-xs font-bold text-yellow-600 uppercase">Champion:</span>
              <span className="text-sm font-black text-slate-800">{champion.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center pt-16" style={{ gap: `${roundGap}px`, minWidth: 'max-content', padding: `64px ${roundGap}px` }}>
          {rounds.map((roundName, roundIndex) => {
            const matches = matchesByRound[roundName];
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
                    <div key={match.id} className="relative">
                      {/* Match Card - Clickable for scoring */}
                      <div 
                        onClick={() => handleMatchClick(match)}
                        className={`bg-white border-2 rounded-xl shadow-lg transition-all duration-200 w-56 ${
                          match.player1 && match.player2 && !match.completed
                            ? 'border-blue-300 cursor-pointer hover:border-blue-500 hover:-translate-y-0.5 hover:shadow-xl'
                            : match.completed
                            ? 'border-slate-200'
                            : 'border-slate-200 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {/* Player 1 */}
                        <div 
                          className={`flex items-center justify-between px-3 py-3 border-b ${
                            match.winner_id === match.player1_id 
                              ? 'bg-green-50 text-green-800 font-semibold' 
                              : match.player1 ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate text-sm">
                              {match.player1?.name || 'TBD'}
                            </span>
                          </div>
                          {match.player1_score !== null && match.player1_score !== undefined && (
                            <span 
                              className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center ${
                                match.winner_id === match.player1_id 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {match.player1_score}
                            </span>
                          )}
                        </div>
                        
                        {/* Player 2 */}
                        <div 
                          className={`flex items-center justify-between px-3 py-3 ${
                            match.winner_id === match.player2_id 
                              ? 'bg-green-50 text-green-800 font-semibold' 
                              : match.player2 ? 'text-slate-700' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="truncate text-sm">
                              {match.player2?.name || 'TBD'}
                            </span>
                          </div>
                          {match.player2_score !== null && match.player2_score !== undefined && (
                            <span 
                              className={`ml-2 flex-shrink-0 text-xs font-bold px-2 py-0.5 rounded min-w-[28px] text-center ${
                                match.winner_id === match.player2_id 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-slate-700 text-white'
                              }`}
                            >
                              {match.player2_score}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading bracket...</p>
        </div>
      </div>
    );
  }

  return renderBracketByRound();
};

export default KnockoutBracket;
