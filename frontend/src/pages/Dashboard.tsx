import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TournamentService } from '@/services/api';
import { Tournament } from '@/types';
import { Plus, Play, Trash2 } from 'lucide-react';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
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
        <h1>Dart Tournament Manager</h1>
        <button
          onClick={() => navigate('/tournament/new/setup')}
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
            onClick={() => navigate('/tournament/new/setup')}
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
                <span className={`badge ${getStatusBadge(tournament.status)}`}>
                  {tournament.status.replace('-', ' ').toUpperCase()}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={() => navigate(`/tournament/${tournament.id}/setup`)}
                  className="button button-primary"
                  style={{ flex: 1 }}
                >
                  <Play size={16} style={{ marginRight: '5px' }} /> Manage
                </button>
                <button
                  onClick={() => navigate(`/tournament/${tournament.id}/boards`)}
                  className="button button-secondary"
                  style={{ flex: 1 }}
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
