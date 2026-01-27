import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Group, Player, Match } from '@/types';
import { GroupService, PlayerService, MatchService } from '@/services/api';
import '../styles/standings.css';
import '../App.css';

interface GroupStats {
  group: Group;
  players: PlayerStats[];
}

interface PlayerStats {
  id: string;
  name: string;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  legsPlayed: number;
  legsWon: number;
  legsLost: number;
  legDiff: number;
}

const Standings: React.FC = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const [groupStats, setGroupStats] = useState<GroupStats[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'standings' | 'results' | 'knockoutResults' | 'knockoutStandings'>('standings');
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [knockoutPlayers, setKnockoutPlayers] = useState<Player[]>([]);

  // Helper: ensure tournamentId is string
  const safeTournamentId = tournamentId || '';

  useEffect(() => {
    if (!safeTournamentId) return;
    loadStats();
    loadKnockout();
  }, [safeTournamentId]);

  async function loadStats() {
    try {
      const groups = await GroupService.getGroups(safeTournamentId);
      const allPlayers = await PlayerService.getPlayers(safeTournamentId);
      const allMatches = await MatchService.getMatches(safeTournamentId);
      setAllMatches(allMatches);
      setAllPlayers(allPlayers);
      setGroups(groups);
      const stats: GroupStats[] = groups.map(group => {
        const groupPlayers = allPlayers.filter(p => p.group_id === group.id);
        const playersStats: PlayerStats[] = groupPlayers.map(player => {
          const matches = allMatches.filter(m => m.group_id === group.id && (m.player1_id === player.id || m.player2_id === player.id));
          let matchesPlayed = 0, matchesWon = 0, matchesLost = 0, legsPlayed = 0, legsWon = 0, legsLost = 0;
          matches.forEach(match => {
            if (match.status !== 'completed') return;
            matchesPlayed++;
            const isPlayer1 = match.player1_id === player.id;
            // Use correct fields for legs
            const playerLegs = isPlayer1 ? match.player1_legs : match.player2_legs;
            const oppLegs = isPlayer1 ? match.player2_legs : match.player1_legs;
            legsPlayed += (playerLegs ?? 0) + (oppLegs ?? 0);
            legsWon += playerLegs ?? 0;
            legsLost += oppLegs ?? 0;
            if ((playerLegs ?? 0) > (oppLegs ?? 0)) matchesWon++;
            else if ((playerLegs ?? 0) < (oppLegs ?? 0)) matchesLost++;
          });
          return {
            id: player.id,
            name: player.name,
            matchesPlayed,
            matchesWon,
            matchesLost,
            legsPlayed,
            legsWon,
            legsLost,
            legDiff: legsWon - legsLost,
          };
        });
        return { group, players: playersStats };
      });
      setGroupStats(stats);
    } catch (e) {
      // handle error
    } finally {
      setLoading(false);
    }
  }

  async function loadKnockout() {
    try {
      const koMatches = await MatchService.getMatches(safeTournamentId);
      console.log('KO matches fetched:', koMatches);
      // Get all knockout matches (group_id is null) that have scores entered
      const knockoutWithScores = koMatches.filter(m => 
        !m.group_id && 
        (m.player1_legs !== null && m.player1_legs !== undefined && 
         m.player2_legs !== null && m.player2_legs !== undefined)
      );
      console.log('KO matches filtered (group_id null, with scores):', knockoutWithScores);
      setKnockoutMatches(knockoutWithScores);
    } catch (e) {
      console.error('Error loading knockout matches:', e);
      // handle error
    }
  }

  if (loading) return <div className="standings-dark-bg"><div className="standings-wrapper"><div>Loading standings...</div></div></div>;

  // Results tab: show only group stage completed matches (exclude knockout matches), latest first
  const completedMatches = allMatches
    .filter(m => m.status === 'completed' && m.group_id !== null)
    .sort((a, b) => (b.completed_at && a.completed_at) ? b.completed_at.localeCompare(a.completed_at) : 0);

  return (
    <div className="standings-dark-bg">
      <div className="card orange-highlight standings-card">
        <h2 className="standings-header">Group Standings</h2>
        <div className="standings-tab-bar">
          <button
            className={`button${activeTab === 'standings' ? ' button-primary' : ' button-secondary'}`}
            onClick={() => setActiveTab('standings')}
          >
            Standings
          </button>
          <button
            className={`button${activeTab === 'results' ? ' button-primary' : ' button-secondary'}`}
            onClick={() => setActiveTab('results')}
          >
            Match Results
          </button>
          <button
            className={`button${activeTab === 'knockoutResults' ? ' button-primary' : ' button-secondary'}`}
            onClick={() => setActiveTab('knockoutResults')}
          >
            Knockout Match Results
          </button>
          <button
            className={`button${activeTab === 'knockoutStandings' ? ' button-primary' : ' button-secondary'}`}
            onClick={() => setActiveTab('knockoutStandings')}
          >
            Knockout Standings
          </button>
        </div>
        {activeTab === 'standings' && (
          <>{groupStats.map(({ group, players }) => {
            // Sort players by legsWon descending, then by head-to-head result (who won the match) if tied
            const sortedPlayers = [...players].sort((a, b) => {
              if (b.legsWon !== a.legsWon) return b.legsWon - a.legsWon;
              // If tied, check head-to-head winner
              const aVsB = allMatches.find(
                m => ((m.player1_id === a.id && m.player2_id === b.id) || (m.player1_id === b.id && m.player2_id === a.id)) && m.group_id === group.id
              );
              if (aVsB) {
                if (aVsB.winner_id === a.id) return -1;
                if (aVsB.winner_id === b.id) return 1;
              }
              return 0;
            });
            return (
              <div key={group.id} className="standings-group">
                <div className="standings-table-wrapper">
                  <table className="table standings-table">
                    <thead>
                      <tr>
                        <th className="standings-th-rank">Rank</th>
                        <th>Name</th>
                        <th className="standings-th">MP</th>
                        <th className="standings-th">MW</th>
                        <th className="standings-th">ML</th>
                        <th className="standings-th">LP</th>
                        <th className="standings-th">LW</th>
                        <th className="standings-th">LL</th>
                        <th className="standings-th">+/-</th>
                      </tr>
                    </thead>
                    <tbody>
                    {sortedPlayers.map((player, i) => (
                        <tr key={player.id}>
                          <td className="standings-td-rank">
                            <div className="standings-rank-flex">
                              <span>{i + 1}</span>
                            </div>
                          </td>
                          <td>{player.name}</td>
                          <td className="standings-td">{player.matchesPlayed}</td>
                          <td className="standings-td">{player.matchesWon}</td>
                          <td className="standings-td">{player.matchesLost}</td>
                          <td className="standings-td">{player.legsPlayed}</td>
                          <td className="standings-td">{player.legsWon}</td>
                          <td className="standings-td">{player.legsLost}</td>
                          <td className="standings-td">{player.legDiff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}</>
        )}
        {activeTab === 'results' && (
          <div className="standings-group">
            <div className="standings-table-wrapper">
              <h3 className="standings-results-header">Match Results</h3>
              <table className="table standings-table minw-500">
                <thead>
                  <tr>
                    <th className="standings-th-date">Date</th>
                    <th>Player 1</th>
                    <th>Score</th>
                    <th>Player 2</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {completedMatches.map(match => {
                    const group = groups.find(g => g.id === match.group_id);
                    const player1 = allPlayers.find(p => p.id === match.player1_id);
                    const player2 = allPlayers.find(p => p.id === match.player2_id);
                    return (
                      <tr key={match.id}>
                        <td>{match.completed_at ? new Date(match.completed_at).toLocaleString() : ''}</td>
                        <td>{player1?.name || ''}</td>
                        <td><span className="standings-score-win">{match.player1_legs}</span> - <span className="standings-score-lose">{match.player2_legs}</span></td>
                        <td>{player2?.name || ''}</td>
                        <td>{group?.name || match.group_id}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'knockoutResults' && (
          <div className="standings-group">
            <div className="standings-table-wrapper">
              <h3 className="standings-knockout-header">Knockout Match Results</h3>
              <table className="table standings-table">
                <thead>
                  <tr>
                    <th>Round</th>
                    <th>Player 1</th>
                    <th>Score</th>
                    <th>Player 2</th>
                    <th>Winner</th>
                  </tr>
                </thead>
                <tbody>
                  {knockoutMatches
                    .sort((a, b) => {
                      // Sort by round (if available), then by id descending (latest first)
                      const roundA = (a as any).round_number || (a as any).round || 0;
                      const roundB = (b as any).round_number || (b as any).round || 0;
                      if (roundA !== roundB) return roundA - roundB;
                      // Ensure id is a number for sorting
                      const idA = typeof a.id === 'number' ? a.id : parseInt(a.id, 10);
                      const idB = typeof b.id === 'number' ? b.id : parseInt(b.id, 10);
                      return idB - idA;
                    })
                    .map(match => {
                      const player1 = allPlayers.find(p => p.id === match.player1_id);
                      const player2 = allPlayers.find(p => p.id === match.player2_id);
                      const winner = match.winner_id === player1?.id ? player1?.name : player2?.name;
                      const round = (match as any).round_number || (match as any).round || '';
                      return (
                        <tr key={match.id}>
                          <td>{round}</td>
                          <td>{player1?.name || ''}</td>
                          <td><span className="standings-score-win">{match.player1_legs}</span> - <span className="standings-score-lose">{match.player2_legs}</span></td>
                          <td>{player2?.name || ''}</td>
                          <td className="standings-winner">{winner}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'knockoutStandings' && (
          <div className="standings-group">
            <div className="standings-table-wrapper">
              <h3 className="standings-knockout-header">Knockout Standings</h3>
              <table className="table standings-table">
                <thead>
                  <tr>
                    <th className="standings-th-rank">Rank</th>
                    <th>Name</th>
                    <th className="standings-th">Matches Played</th>
                    <th className="standings-th">Wins</th>
                    <th className="standings-th">Losses</th>
                    <th className="standings-th">Legs Won</th>
                    <th className="standings-th">Legs Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Calculate knockout standings from knockoutMatches */}
                  {(() => {
                    // Get all unique player IDs from knockoutMatches
                    const playerIds = Array.from(new Set(knockoutMatches.flatMap(m => [m.player1_id, m.player2_id])));
                    // Build stats for each player
                    const stats = playerIds.map(pid => {
                      const player = allPlayers.find(p => p.id === pid);
                      const played = knockoutMatches.filter(m => m.player1_id === pid || m.player2_id === pid);
                      const wins = played.filter(m => m.winner_id === pid).length;
                      const losses = played.length - wins;
                      const legsWon = played.reduce((sum, m) => sum + (m.player1_id === pid ? m.player1_legs : m.player2_legs), 0);
                      const legsLost = played.reduce((sum, m) => sum + (m.player1_id === pid ? m.player2_legs : m.player1_legs), 0);
                      return { id: pid, name: player?.name || '', matchesPlayed: played.length, wins, losses, legsWon, legsLost };
                    });
                    // Sort by wins, then legsWon
                    stats.sort((a, b) => b.wins - a.wins || b.legsWon - a.legsWon);
                    return stats.map((player, i) => (
                      <tr key={player.id}>
                        <td className="standings-td-rank">
                          <div className="standings-rank-flex">
                            <span>{i + 1}</span>
                          </div>
                        </td>
                        <td>{player.name}</td>
                        <td className="standings-td">{player.matchesPlayed}</td>
                        <td className="standings-td">{player.wins}</td>
                        <td className="standings-td">{player.losses}</td>
                        <td className="standings-td">{player.legsWon}</td>
                        <td className="standings-td">{player.legsLost}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Standings;
