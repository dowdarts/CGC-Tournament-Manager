import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TournamentService } from '@/services/api';
import { Tournament } from '@/types';
import { Calendar, MapPin, Users, ArrowRight } from 'lucide-react';

const TournamentLobby: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLiveTournaments();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(loadLiveTournaments, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadLiveTournaments = async () => {
    try {
      const allTournaments = await TournamentService.getTournaments();
      // Filter to only show tournaments with registration enabled
      const live = allTournaments.filter(t => t.registration_enabled);
      setTournaments(live);
    } catch (err) {
      setError('Failed to load tournaments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <h2>Loading tournaments...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 style={{ 
            fontSize: '48px', 
            fontWeight: 'bold', 
            color: '#fff', 
            marginBottom: '16px',
            textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
          }}>
            Tournament Registration
          </h1>
          <p style={{ fontSize: '20px', color: '#e2e8f0' }}>
            Select a tournament to register
          </p>
        </div>

        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.2)', 
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px',
            color: '#fff',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Tournament List */}
        {tournaments.length === 0 ? (
          <div style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '60px 40px',
            textAlign: 'center',
            color: '#fff'
          }}>
            <Users size={64} style={{ marginBottom: '20px', opacity: 0.5 }} />
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>No Live Tournaments</h2>
            <p style={{ fontSize: '18px', color: '#e2e8f0' }}>
              Check back later or contact the tournament organizer
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '30px'
          }}>
            {tournaments.map(tournament => (
              <div
                key={tournament.id}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '16px',
                  padding: '30px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                  border: '2px solid transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.3)';
                  e.currentTarget.style.borderColor = '#667eea';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onClick={() => navigate(`/registration-portal/${tournament.id}`)}
              >
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    display: 'inline-block',
                    backgroundColor: '#10b981',
                    color: '#fff',
                    padding: '4px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '12px'
                  }}>
                    OPEN FOR REGISTRATION
                  </div>
                  <h2 style={{ 
                    fontSize: '24px', 
                    fontWeight: 'bold', 
                    color: '#0f172a',
                    marginBottom: '12px'
                  }}>
                    {tournament.name}
                  </h2>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    color: '#64748b',
                    marginBottom: '8px'
                  }}>
                    <Calendar size={18} />
                    <span>{formatDate(tournament.date)}</span>
                  </div>
                  
                  {tournament.location && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      color: '#64748b'
                    }}>
                      <MapPin size={18} />
                      <span>{tournament.location}</span>
                    </div>
                  )}
                </div>

                <button
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    backgroundColor: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5568d3';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#667eea';
                  }}
                >
                  Register Now
                  <ArrowRight size={20} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentLobby;
