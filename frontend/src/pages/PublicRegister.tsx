import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import SelfRegistrationForm from '@/components/SelfRegistrationForm';
import { TournamentService, PlayerService } from '@/services/api';
import { Tournament, Player } from '@/types';
import { getLogoUrl } from '@/utils/assets';

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
      
      // Check if registration is enabled for this tournament
      if (!t.registration_enabled) {
        setError('Registration is currently closed for this tournament');
        setTournament(null);
        setLoading(false);
        return;
      }
      
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
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
      }}>
        <div className="glass-card" style={{ padding: '40px' }}>
          <div className="skeleton" style={{ height: '24px', width: '200px' }} />
        </div>
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
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)'
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
      padding: '0',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      color: '#f5f5f5',
      position: 'relative'
    }}>
      {/* Logo Banner */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(135deg, #ff6600 0%, #ff9500 100%)',
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: '3px solid #ff6600',
        boxShadow: '0 4px 20px rgba(255, 102, 0, 0.3)'
      }}>
        <img 
          src={getLogoUrl()}
          alt="Tournament Manager" 
          style={{ 
            maxWidth: '100%',
            height: '80px',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Content */}
      <div style={{ padding: '40px 20px' }}>
        {/* Background Pattern */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(255, 102, 0, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(255, 102, 0, 0.05) 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          {/* Tournament Name Title */}
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '40px',
            background: 'linear-gradient(135deg, #ff6600 0%, #ff9500 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 30px rgba(255, 102, 0, 0.3)'
          }}>
            {tournament.name}
          </h1>

          {/* Registration Form */}
          <SelfRegistrationForm
            tournamentId={tournament.id}
            tournamentName={tournament.name}
            tournamentDate={tournament.date}
            tournamentLocation={tournament.location}
            tournamentStartTime={tournament.start_time}
            gameType={gameType}
            onRegister={handleRegister}
          />
        </div>
      </div>
    </div>
  );
};

export default PublicRegister;
