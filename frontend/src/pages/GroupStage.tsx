import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TournamentService, PlayerService, GroupService, MatchService } from '@/services/api';
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
  wins: number;
  losses: number;
  ties: number;
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
  const [activeGroupTabs, setActiveGroupTabs] = useState<{ [groupId: string]: 'standings' | 'matches' }>({});

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
      const matchHistory: MatchResult[] = [];

      // Sort matches by round for history
      const sortedMatches = [...playerMatches].sort((a, b) => 
        (a.round_number || 0) - (b.round_number || 0)
      );

      sortedMatches.forEach(match => {
        if (match.status === 'completed') {
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

      return {
        player,
        wins,
        losses,
        ties,
        points: wins * 2, // 2 points per win
        isAdvancing: false,
        matchHistory
      };
    });

    // Sort by points (wins), then by name
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.player.name.localeCompare(b.player.name);
    });

    // Mark advancing players
    const advancingCount = group.advancement_count || Math.ceil(players.length / 2);
    standings.forEach((standing, index) => {
      standing.isAdvancing = index < advancingCount;
    });

    return standings;
  };

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
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
      setSelectedMatch(null);
      setScore1('');
      setScore2('');
    } catch (err) {
      console.error('Failed to update match score:', err);
    } finally {
      setUpdating(false);
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
          Click on any match to update scores
        </p>
      </div>

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
                          <th style={{ width: '80px', textAlign: 'center' }}>Wins</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Losses</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Ties</th>
                          <th style={{ width: '80px', textAlign: 'center' }}>Points</th>
                          <th style={{ width: '200px', textAlign: 'center' }}>Match History</th>
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
                            <td style={{ textAlign: 'center' }}>{standing.wins}</td>
                            <td style={{ textAlign: 'center' }}>{standing.losses}</td>
                            <td style={{ textAlign: 'center' }}>{standing.ties}</td>
                            <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{standing.points}</td>
                            <td>
                              <div style={{ 
                                display: 'flex', 
                                gap: '4px', 
                                justifyContent: 'center',
                                flexWrap: 'wrap'
                              }}>
                                {standing.matchHistory.map((result, idx) => (
                                  <span
                                    key={idx}
                                    style={{
                                      display: 'inline-block',
                                      width: '24px',
                                      height: '24px',
                                      lineHeight: '24px',
                                      textAlign: 'center',
                                      background: result.won ? '#3b82f6' : '#ef4444',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    {result.won ? 'W' : 'L'}
                                  </span>
                                ))}
                              </div>
                            </td>
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
                                const isWinner1 = match.winner_id === match.player1_id;
                                const isWinner2 = match.winner_id === match.player2_id;
                                
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
                                      transition: 'all 0.2s'
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
                                      textAlign: 'center'
                                    }}>
                                      Board {match.board_number}
                                    </div>
                                    
                                    {/* Player 1 */}
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '8px',
                                      background: '#0f172a',
                                      borderRadius: '4px',
                                      marginBottom: '4px'
                                    }}>
                                      <span style={{ 
                                        fontSize: '13px',
                                        fontWeight: isWinner1 ? '700' : '400'
                                      }}>
                                        {display.player1Name}
                                      </span>
                                      {match.status === 'completed' && (
                                        <span style={{
                                          fontSize: '14px',
                                          fontWeight: 'bold',
                                          color: isWinner1 ? '#f97316' : '#64748b',
                                          minWidth: '24px',
                                          textAlign: 'right'
                                        }}>
                                          {match.player1_score || 0}
                                        </span>
                                      )}
                                    </div>

                                    {/* Player 2 */}
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      padding: '8px',
                                      background: '#0f172a',
                                      borderRadius: '4px'
                                    }}>
                                      <span style={{ 
                                        fontSize: '13px',
                                        fontWeight: isWinner2 ? '700' : '400'
                                      }}>
                                        {display.player2Name}
                                      </span>
                                      {match.status === 'completed' && (
                                        <span style={{
                                          fontSize: '14px',
                                          fontWeight: 'bold',
                                          color: isWinner2 ? '#f97316' : '#64748b',
                                          minWidth: '24px',
                                          textAlign: 'right'
                                        }}>
                                          {match.player2_score || 0}
                                        </span>
                                      )}
                                    </div>

                                    {/* Match Status */}
                                    {match.status !== 'completed' && (
                                      <div style={{
                                        marginTop: '8px',
                                        fontSize: '11px',
                                        color: '#64748b',
                                        textAlign: 'center'
                                      }}>
                                        Click to enter score
                                      </div>
                                    )}
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
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedMatch(null)}
        >
          <div 
            className="card"
            style={{
              maxWidth: '500px',
              width: '90%',
              padding: '30px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '20px' }}>Update Match Score</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: '20px',
                alignItems: 'center'
              }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    {allPlayers.find(p => p.id === selectedMatch.player1_id)?.name || 'Player 1'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={score1}
                    onChange={(e) => setScore1(e.target.value)}
                    style={{ fontSize: '20px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                </div>
                
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#64748b' }}>
                  VS
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                    {allPlayers.find(p => p.id === selectedMatch.player2_id)?.name || 'Player 2'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    value={score2}
                    onChange={(e) => setScore2(e.target.value)}
                    style={{ fontSize: '20px', textAlign: 'center', fontWeight: 'bold' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                className="btn btn-secondary"
                onClick={() => setSelectedMatch(null)}
                disabled={updating}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleScoreUpdate}
                disabled={updating}
              >
                {updating ? 'Updating...' : 'Update Score'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupStage;
