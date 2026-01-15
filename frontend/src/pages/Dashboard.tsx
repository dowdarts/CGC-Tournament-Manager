import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TournamentService, PlayerService } from '@/services/api';
import { Tournament } from '@/types';
import { Plus, Play, Trash2, Users } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [playerCounts, setPlayerCounts] = useState<{ [key: string]: number }>({});
  const [teamCounts, setTeamCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTournaments();
  }, []);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      const data = await TournamentService.getTournaments();
      setTournaments(data);
      
      // Load player counts and team counts for each tournament
      const counts: { [key: string]: number } = {};
      const teams: { [key: string]: number } = {};
      await Promise.all(
        data.map(async (tournament) => {
          try {
            const players = await PlayerService.getPlayers(tournament.id);
            const paidPlayers = players.filter(p => p.paid);
            counts[tournament.id] = paidPlayers.length;
            
            // Count unique teams for doubles
            if (tournament.game_type === 'doubles') {
              const uniqueTeams = new Set<string>();
              let soloPlayers = 0;
              paidPlayers.forEach(player => {
                if (player.team_id) {
                  uniqueTeams.add(player.team_id);
                } else {
                  soloPlayers++;
                }
              });
              teams[tournament.id] = uniqueTeams.size + soloPlayers;
            }
          } catch {
            counts[tournament.id] = 0;
            teams[tournament.id] = 0;
          }
        })
      );
      setPlayerCounts(counts);
      setTeamCounts(teams);
    } catch (err) {
      setError('Failed to load tournaments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all players, matches, and data. This cannot be undone.`)) {
      return;
    }

    try {
      await TournamentService.deleteTournament(id);
      setTournaments(tournaments.filter(t => t.id !== id));
    } catch (err) {
      setError('Failed to delete tournament');
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      'setup': 'badge-warning',
      'group-stage': 'badge-primary',
      'knockout': 'badge-primary',
      'completed': 'badge-success'
    };
    return badges[status] || 'badge-warning';
  };

  if (loading) {
    return <div className="alert alert-info">Loading tournaments...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Tournaments</h1>
        <button
          onClick={() => navigate('/tournament/new/info')}
          className="button button-primary button-large"
        >
          <Plus size={20} style={{ marginRight: '8px' }} /> New Tournament
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {tournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ marginBottom: '20px', color: '#94a3b8' }}>No tournaments yet</p>
          <button
            onClick={() => navigate('/tournament/new/info')}
            className="button button-primary"
          >
            Create Your First Tournament
          </button>
        </div>
      ) : (
        <div className="grid grid-2">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="card">
              <div style={{ marginBottom: '15px' }}>
                <h3 style={{ marginBottom: '5px' }}>{tournament.name}</h3>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px' }}>
                  {tournament.date} • {tournament.location}
                </p>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className={`badge ${tournament.game_type === 'doubles' ? 'badge-primary' : 'badge-success'}`}>
                    {tournament.game_type === 'doubles' ? 'DOUBLES' : 'SINGLES'}
                  </span>
                  {tournament.game_type === 'doubles' ? (
                    <span style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} />
                      {teamCounts[tournament.id] || 0} teams ({playerCounts[tournament.id] || 0} players)
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={14} />
                      {playerCounts[tournament.id] || 0} players
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => window.open(`/tournament/${tournament.id}/info`, '_blank')}
                  className="button button-primary"
                  style={{ flex: 1 }}
                  title="Open tournament management in a new tab"
                >
                  <Play size={16} style={{ marginRight: '5px' }} /> Manage
                </button>
                <button
                  onClick={() => window.open(`/tournament/${tournament.id}/boards`, '_blank')}
                  className="button button-secondary"
                  style={{ flex: 1 }}
                  title="Open board manager in a new tab"
                >
                  Boards
                </button>
                <button
                  onClick={() => handleDeleteTournament(tournament.id, tournament.name)}
                  className="button button-danger"
                  title="Delete Tournament"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
