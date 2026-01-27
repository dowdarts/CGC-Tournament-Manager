import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TournamentService, PlayerService } from '@/services/api';
import { Tournament } from '@/types';
import { Calendar, MapPin, Users, ArrowRight, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '@/services/supabase';

const TournamentLobby: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentDetails, setTournamentDetails] = useState<{ 
    [key: string]: { 
      hostName: string; 
      checkedIn: number; 
      totalRegistered: number; 
    } 
  }>({});
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
      
      // Load details for each tournament
      const details: { [key: string]: { hostName: string; checkedIn: number; totalRegistered: number } } = {};
      await Promise.all(
        live.map(async (tournament) => {
          // Get host name
          let hostName = 'Tournament Host';
          if (tournament.user_id) {
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('display_name, organization')
              .eq('id', tournament.user_id)
              .single();
            
            if (profile) {
              hostName = profile.display_name || profile.organization || 'Tournament Host';
            }
          }
          
          // Get player counts
          try {
            const players = await PlayerService.getPlayers(tournament.id);
            const checkedIn = players.filter(p => p.paid).length;
            details[tournament.id] = {
              hostName,
              checkedIn,
              totalRegistered: players.length
            };
          } catch {
            details[tournament.id] = {
              hostName,
              checkedIn: 0,
              totalRegistered: 0
            };
          }
        })
      );
      setTournamentDetails(details);
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

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'Not set';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  const formatDateTime = (datetimeStr: string) => {
    if (!datetimeStr) return 'Not set';
    try {
      const dt = new Date(datetimeStr);
      return dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return datetimeStr;
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
        <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="skeleton" style={{ height: '24px', width: '200px', margin: '0 auto' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      padding: '0',
      position: 'relative'
    }}>
      {/* Logo Banner */}
      <div style={{
        width: '100%',
        backgroundColor: '#1e293b',
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: '3px solid #667eea'
      }}>
        <img 
          src={`${import.meta.env.BASE_URL}Tournament manager logo.png`}
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
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '50px' }}>
          <h1 className="text-gradient" style={{ 
            fontSize: '56px', 
            fontWeight: '900', 
            marginBottom: '16px',
            textShadow: '0 4px 20px rgba(255, 102, 0, 0.3)',
            letterSpacing: '2px'
          }}>
            TOURNAMENT REGISTRATION
          </h1>
          <p style={{ 
            fontSize: '20px', 
            color: '#d1d5db',
            fontWeight: '500'
          }}>
            Select a tournament to register
          </p>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: '30px' }}>
            {error}
          </div>
        )}

        {/* Tournament List */}
        {tournaments.length === 0 ? (
          <div className="glass-card" style={{ 
            padding: '60px 40px',
            textAlign: 'center'
          }}>
            <Users size={64} style={{ marginBottom: '20px', opacity: 0.3, color: '#ff6600' }} />
            <h2 style={{ fontSize: '28px', marginBottom: '12px', color: '#f5f5f5' }}>No Live Tournaments</h2>
            <p style={{ fontSize: '18px', color: '#9ca3af' }}>
              Check back later or contact the tournament organizer
            </p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '30px'
          }}>
            {tournaments.map(tournament => {
              const details = tournamentDetails[tournament.id] || { hostName: 'Loading...', checkedIn: 0, totalRegistered: 0 };
              
              return (
              <div
                key={tournament.id}
                className="glass-card hover-lift"
                style={{
                  padding: '0',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  border: '2px solid rgba(255, 102, 0, 0.2)',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(`/registration-portal/${tournament.id}`)}
              >
                {/* Header Section */}
                <div style={{
                  background: 'linear-gradient(135deg, #ff6600 0%, #ff8800 100%)',
                  padding: '20px 24px',
                  borderBottom: '3px solid rgba(0, 0, 0, 0.2)'
                }}>
                  <div className="badge" style={{ 
                    marginBottom: '8px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    fontWeight: '700'
                  }}>
                    🔴 LIVE REGISTRATION
                  </div>
                  <h2 style={{ 
                    fontSize: '22px', 
                    fontWeight: '900',
                    marginBottom: '6px',
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {tournament.name}
                  </h2>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontStyle: 'italic'
                  }}>
                    Hosted by {details.hostName}
                  </p>
                </div>

                {/* Details Section */}
                <div style={{ padding: '24px', background: 'rgba(0, 0, 0, 0.3)' }}>
                  {/* Tournament Name Label */}
                  <div style={{
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <div style={{ fontSize: '11px', color: '#ff6600', fontWeight: '700', marginBottom: '4px', textTransform: 'uppercase' }}>
                      Tournament Name
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#ffffff' }}>
                      {tournament.name}
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    {/* Date */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Calendar size={14} color="#ff6600" />
                        <span style={{ fontSize: '11px', color: '#ff6600', fontWeight: '700', textTransform: 'uppercase' }}>
                          Date
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {formatDate(tournament.date)}
                      </span>
                    </div>

                    {/* Start Time */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Clock size={14} color="#ff6600" />
                        <span style={{ fontSize: '11px', color: '#ff6600', fontWeight: '700', textTransform: 'uppercase' }}>
                          Start Time
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {formatTime(tournament.start_time || '')}
                      </span>
                    </div>

                    {/* Location */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      gridColumn: '1 / -1'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <MapPin size={14} color="#ff6600" />
                        <span style={{ fontSize: '11px', color: '#ff6600', fontWeight: '700', textTransform: 'uppercase' }}>
                          Location
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {tournament.location || 'Not set'}
                      </span>
                    </div>

                    {/* Checked In Players */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Users size={14} color="#ff6600" />
                        <span style={{ fontSize: '11px', color: '#ff6600', fontWeight: '700', textTransform: 'uppercase' }}>
                          Checked In
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {details.checkedIn} of {details.totalRegistered}
                      </span>
                    </div>

                    {/* Registration Closes */}
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      gap: '6px',
                      padding: '12px',
                      background: 'rgba(239, 68, 68, 0.15)',
                      borderRadius: '8px',
                      border: '1px solid rgba(239, 68, 68, 0.4)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <AlertCircle size={14} color="#ef4444" />
                        <span style={{ fontSize: '11px', color: '#fca5a5', fontWeight: '700', textTransform: 'uppercase' }}>
                          Reg. Closes
                        </span>
                      </div>
                      <span style={{ fontSize: '13px', color: '#ffffff', fontWeight: '600' }}>
                        {formatDateTime(tournament.registration_close_time || '')}
                      </span>
                    </div>

                    {/* Entry Fee - if set */}
                    {tournament.registration_price !== undefined && tournament.registration_price !== null && (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        gap: '6px',
                        padding: '12px',
                        background: 'rgba(16, 185, 129, 0.15)',
                        borderRadius: '8px',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        gridColumn: '1 / -1'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <DollarSign size={14} color="#10b981" />
                          <span style={{ fontSize: '11px', color: '#6ee7b7', fontWeight: '700', textTransform: 'uppercase' }}>
                            Entry Fee
                          </span>
                        </div>
                        <span style={{ fontSize: '18px', color: '#ffffff', fontWeight: '900' }}>
                          ${tournament.registration_price.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Register Button */}
                  <button 
                    className="button button-primary" 
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '16px',
                      fontWeight: '900',
                      padding: '16px',
                      background: 'linear-gradient(135deg, #ff6600 0%, #ff8800 100%)',
                      border: 'none',
                      boxShadow: '0 4px 12px rgba(255, 102, 0, 0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    Register Now
                    <ArrowRight size={20} />
                  </button>
                </div>
              </div>
            );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default TournamentLobby;
