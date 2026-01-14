import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SelfRegistrationForm from '@/components/SelfRegistrationForm';
import { TournamentService, PlayerService } from '@/services/api';
import { Tournament, Player } from '@/types';

const PublicRegister: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadTournament(id);
    }
  }, [id]);

  const loadTournament = async (tournamentId: string) => {
    try {
      setLoading(true);
      const t = await TournamentService.getTournament(tournamentId);
      setTournament(t);
    } catch (err) {
      setError('Tournament not found');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (players: Omit<Player, 'id' | 'created_at' | 'updated_at'>[]) => {
    for (const playerData of players) {
      await PlayerService.addPlayer(playerData);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#e2e8f0'
      }}>
        <div className="alert alert-info">Loading tournament...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#0f172a',
        color: '#e2e8f0'
      }}>
        <div className="alert alert-danger">
          {error || 'Tournament not found'}
        </div>
      </div>
    );
  }

  // Determine game type from tournament
  const gameType = tournament.game_type || 'singles';

  return (
    <div style={{ 
      minHeight: '100vh', 
      padding: '40px 20px',
      backgroundColor: '#0f172a',
      color: '#e2e8f0'
    }}>
      <SelfRegistrationForm
        tournamentId={tournament.id}
        tournamentName={tournament.name}
        gameType={gameType}
        onRegister={handleRegister}
      />
    </div>
  );
};

export default PublicRegister;
