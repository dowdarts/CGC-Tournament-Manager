import React, { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import { Tournament, Match, Player, Group } from '@/types';

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
    legsWon: number;
    legsLost: number;
  }[];
}

const PublicStandings: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [groupStandings, setGroupStandings] = useState<GroupStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Load tournaments updated in the last hour
  useEffect(() => {
    loadTournaments();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadTournaments();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Load standings when tournament is selected
  useEffect(() => {
    if (selectedTournamentId) {
      loadStandings();
      subscribeToChanges();
    }
  }, [selectedTournamentId]);

  const loadTournaments = async () => {
    try {
      // Get all active tournaments with show_standings_on_display enabled
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('show_standings_on_display', true)
        .in('status', ['active', 'in_progress'])
        .order('updated_at', { ascending: false });

      if (error) throw error;

      console.log('📊 Found tournaments with standings display enabled:', data?.length || 0);
      
      setTournaments(data || []);
      
      // Auto-select first tournament if none selected
      if (data && data.length > 0 && !selectedTournamentId) {
        setSelectedTournamentId(data[0].id);
        setSelectedTournament(data[0]);
        console.log('✅ Auto-selected tournament:', data[0].name);
      }
    } catch (error) {
      console.error('Error loading tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStandings = async () => {
    if (!selectedTournamentId) return;

    try {
      console.log('📊 Loading standings for tournament:', selectedTournamentId);
      
      // Load groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .order('name');

      if (groupsError) throw groupsError;
      console.log('📦 Loaded groups:', groupsData?.length || 0);

      // Load all group stage matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', selectedTournamentId)
        .not('group_id', 'is', null);

      if (matchesError) throw matchesError;
      console.log('🎯 Loaded group matches:', matchesData?.length || 0);

      // Load players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('tournament_id', selectedTournamentId);

      if (playersError) throw playersError;
      console.log('👥 Loaded players:', playersData?.length || 0);

      // Calculate standings for each group
      const standings = calculateGroupStandings(
        groupsData || [],
        matchesData || [],
        playersData || []
      );

      setGroupStandings(standings);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading standings:', error);
    }
  };

  const calculateGroupStandings = (
    groups: Group[],
    matches: Match[],
    players: Player[]
  ): GroupStanding[] => {
    return groups.map(group => {
      const groupMatches = matches.filter(m => m.group_id === group.id);
      const groupPlayers = players.filter(p => p.group_id === group.id);

      const playerStats = groupPlayers.map(player => {
        const playerMatches = groupMatches.filter(
          m => m.player1_id === player.id || m.player2_id === player.id
        );

        const completedMatches = playerMatches.filter(m => m.status === 'completed');

        let wins = 0;
        let losses = 0;
        let legsWon = 0;
        let legsLost = 0;

        completedMatches.forEach(match => {
          const isPlayer1 = match.player1_id === player.id;
          const playerLegs = isPlayer1 ? (match.player1_legs || 0) : (match.player2_legs || 0);
          const opponentLegs = isPlayer1 ? (match.player2_legs || 0) : (match.player1_legs || 0);

          legsWon += playerLegs;
          legsLost += opponentLegs;

          if (playerLegs > opponentLegs) {
            wins++;
          } else if (playerLegs < opponentLegs) {
            losses++;
          }
        });

        return {
          playerId: player.id,
          playerName: player.name,
          matchesPlayed: completedMatches.length,
          wins,
          losses,
          legDifference: legsWon - legsLost,
          legsWon,
          legsLost,
        };
      });

      // Sort by wins, then leg difference, then legs won
      playerStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.legDifference !== a.legDifference) return b.legDifference - a.legDifference;
        return b.legsWon - a.legsWon;
      });

      return {
        groupId: group.id,
        groupName: group.name,
        standings: playerStats,
      };
    });
  };

  const subscribeToChanges = () => {
    if (!selectedTournamentId) return;

    // Subscribe to match changes
    const matchSubscription = supabase
      .channel(`public-standings-matches-${selectedTournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${selectedTournamentId}`,
        },
        () => {
          loadStandings();
        }
      )
      .subscribe();

    return () => {
      matchSubscription.unsubscribe();
    };
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff'
      }}>
        <div style={{ fontSize: '24px' }}>Loading standings...</div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        color: '#fff'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          margin: '0 0 10px 0',
          color: '#fff'
        }}>
          Group Standings
        </h1>
        <p style={{
          fontSize: '18px',
          color: '#999',
          margin: 0
        }}>
          Live Tournament Standings
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          color: '#fff',
          border: '2px solid #ff6b35'
        }}>
          <p style={{ fontSize: '18px', margin: 0 }}>Loading tournaments...</p>
        </div>
      )}

      {/* No Tournaments Message */}
      {!loading && tournaments.length === 0 && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          border: '2px solid #ff6b35'
        }}>
          <h2 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: '#ff6b35',
            margin: '0 0 15px 0'
          }}>
            No Active Tournaments
          </h2>
          <p style={{
            fontSize: '16px',
            color: '#999',
            margin: '0 0 10px 0'
          }}>
            There are no tournaments currently configured to display standings.
          </p>
          <p style={{
            fontSize: '14px',
            color: '#666',
            margin: 0
          }}>
            Tournaments must have "Show on Display" enabled and activity within the last hour.
          </p>
        </div>
      )}

      {/* Tournament Selection */}
      {!loading && tournaments.length > 0 && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto 30px auto',
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '20px',
          border: '2px solid #ff6b35'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '10px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#fff'
          }}>
            Select Live Tournament:
          </label>
          <select
            value={selectedTournamentId || ''}
            onChange={(e) => {
              setSelectedTournamentId(e.target.value);
              const tournament = tournaments.find(t => t.id === e.target.value);
              setSelectedTournament(tournament || null);
            }}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid #ff6b35',
              background: '#000',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            {tournaments.map(tournament => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tournament Title */}
      {selectedTournament && (
        <div style={{
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 5px 0'
          }}>
            {selectedTournament.name}
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#94a3b8',
            margin: 0
          }}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Group Standings */}
      {groupStandings.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#999',
          fontSize: '18px'
        }}>
          No group stage matches found for this tournament.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '20px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {groupStandings.map(group => (
            <div
              key={group.groupId}
              style={{
                background: '#1a1a1a',
                borderRadius: '12px',
                border: '2px solid #ff6b35',
                overflow: 'hidden'
              }}
            >
              {/* Group Header */}
              <div style={{
                background: '#ff6b35',
                padding: '16px 20px',
                color: '#fff'
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '700'
                }}>
                  {group.groupName}
                </h3>
              </div>

              {/* Standings Table */}
              <div style={{ padding: '0' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse'
                }}>
                  <thead>
                    <tr style={{
                      background: '#000',
                      color: '#999',
                      fontSize: '12px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Rank</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left' }}>Player</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>W</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>L</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>+/-</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center' }}>Legs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings.map((player, index) => (
                      <tr
                        key={player.playerId}
                        style={{
                          borderTop: '1px solid #333',
                          background: index === 0 ? 'rgba(255, 107, 53, 0.2)' : 
                                     index === 1 ? 'rgba(255, 107, 53, 0.1)' : 
                                     'transparent',
                          color: '#fff'
                        }}
                      >
                        <td style={{
                          padding: '14px 16px',
                          fontWeight: '700',
                          fontSize: '18px',
                          color: index === 0 ? '#ff6b35' : 
                                 index === 1 ? '#ff8c61' : 
                                 '#999'
                        }}>
                          {index + 1}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          fontWeight: '600',
                          fontSize: '16px'
                        }}>
                          {player.playerName}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#4ade80'
                        }}>
                          {player.wins}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#f87171'
                        }}>
                          {player.losses}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: player.legDifference > 0 ? '#4ade80' : 
                                 player.legDifference < 0 ? '#f87171' : 
                                 '#999'
                        }}>
                          {player.legDifference > 0 ? '+' : ''}{player.legDifference}
                        </td>
                        <td style={{
                          padding: '14px 16px',
                          textAlign: 'center',
                          fontSize: '14px',
                          color: '#999'
                        }}>
                          {player.legsWon}-{player.legsLost}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        marginTop: '40px',
        color: '#666',
        fontSize: '14px'
      }}>
        <p>Updates automatically every 30 seconds</p>
      </div>
    </div>
  );
};

export default PublicStandings;
