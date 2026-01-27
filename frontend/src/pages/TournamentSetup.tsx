import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TournamentForm from '@/components/TournamentForm';
import QuickAddPlayer from '@/components/QuickAddPlayer';
import PlayerList from '@/components/PlayerList';
import GroupConfiguration from '@/components/GroupConfiguration';
import { useTournamentStore } from '@/store/tournament';
import { TournamentService, PlayerService, GroupService } from '@/services/api';
import { Tournament, Player } from '@/types';
import { ExternalLink, Copy, Check, RefreshCw, WifiOff, Wifi } from 'lucide-react';
import supabase from '@/services/supabase';

const TournamentSetup: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const store = useTournamentStore();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    // Don't try to load if ID is "new" (creating new tournament)
    if (id && id !== 'new') {
      loadTournament(id);
    }
  }, [id]);

  // Real-time subscription for player updates
  useEffect(() => {
    // Don't subscribe if no ID or if creating new tournament
    if (!id || id === 'new') return;

    // Subscribe to player inserts for this tournament
    const channel = supabase
      .channel(`tournament-${id}-players`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'players',
          filter: `tournament_id=eq.${id}`
        },
        (payload) => {
          console.log('New player registered:', payload.new);
          // Add the new player to the store
          store.addPlayer(payload.new as Player);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `tournament_id=eq.${id}`
        },
        (payload) => {
          console.log('Player updated:', payload.new);
          // Update player in store
          const players = store.players.map(p => 
            p.id === payload.new.id ? payload.new as Player : p
          );
          store.setPlayers(players);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'players',
          filter: `tournament_id=eq.${id}`
        },
        (payload) => {
          console.log('Player deleted:', payload.old);
          // Remove player from store
          const players = store.players.filter(p => p.id !== payload.old.id);
          store.setPlayers(players);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, store]);

  // Auto-refresh registrations every 5 seconds when registration is online
  useEffect(() => {
    if (!tournament?.id || !tournament.registration_enabled) return;

    const refreshPlayers = async () => {
      try {
        const players = await PlayerService.getPlayers(tournament.id);
        store.setPlayers(players);
        console.log(`Auto-refreshed: ${players.length} players found`);
      } catch (err) {
        console.error('Auto-refresh failed:', err);
      }
    };

    // Initial load
    refreshPlayers();

    // Set up interval for auto-refresh
    const intervalId = setInterval(refreshPlayers, 5000);

    // Cleanup interval on unmount or when registration is disabled
    return () => {
      clearInterval(intervalId);
    };
  }, [tournament?.id, tournament?.registration_enabled, store]);

  const loadTournament = async (tournamentId: string) => {
    try {
      setLoading(true);
      const t = await TournamentService.getTournament(tournamentId);
      setTournament(t);
      store.setCurrentTournament(t);
      
      const players = await PlayerService.getPlayers(tournamentId);
      store.setPlayers(players);
    } catch (err) {
      setError('Failed to load tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (data: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      const newTournament = await TournamentService.createTournament(data);
      setTournament(newTournament);
      store.setCurrentTournament(newTournament);
      navigate(`/tournament/${newTournament.id}/setup`);
    } catch (err) {
      setError('Failed to create tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPlayer = async (playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!tournament) return;
    
    try {
      setLoading(true);
      const newPlayer = await PlayerService.addPlayer(playerData);
      store.addPlayer(newPlayer);
    } catch (err) {
      setError('Failed to add player');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlayer = async (player: Player) => {
    try {
      const updated = await PlayerService.updatePlayer(player.id, player);
      store.updatePlayer(updated);
    } catch (err) {
      setError('Failed to update player');
      console.error(err);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('Delete this player?')) return;
    
    try {
      await PlayerService.deletePlayer(playerId);
      store.removePlayer(playerId);
    } catch (err) {
      setError('Failed to delete player');
      console.error(err);
    }
  };

  const handleSaveGroupConfiguration = async (config: { num_groups: number; advancement_rules: string; game_type: string }) => {
    if (!tournament) return;

    try {
      setLoading(true);
      const updated = await TournamentService.updateTournament(tournament.id, {
        num_groups: config.num_groups,
        advancement_rules: config.advancement_rules
      });
      setTournament(updated);
      store.setCurrentTournament(updated);
      setError(null);
      alert('Group configuration saved!');
    } catch (err) {
      setError('Failed to save configuration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyRegistrationLink = async () => {
    const url = `${window.location.origin}/register/${tournament?.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      alert('Failed to copy link');
    }
  };

  const handleToggleRegistration = async () => {
    if (!tournament) return;
    
    try {
      setLoading(true);
      const updated = await TournamentService.updateTournament(tournament.id, {
        registration_enabled: !tournament.registration_enabled
      });
      setTournament(updated);
      store.setCurrentTournament(updated);
      alert(updated.registration_enabled ? '✅ Registration is now ONLINE' : '🔴 Registration is now OFFLINE');
    } catch (err) {
      alert('Failed to toggle registration');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!tournament) {
    return <TournamentForm onSubmit={handleCreateTournament} isLoading={loading} />;
  }

  const registrationUrl = `${window.location.origin}/register/${tournament.id}`;

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ marginBottom: '10px' }}>{tournament.name}</h1>
        <p style={{ color: '#94a3b8' }}>
          {tournament.date} • {tournament.location || 'Location TBD'}
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Registration Portal Link */}
      <div className="card" style={{ marginBottom: '30px', backgroundColor: '#1e293b' }}>
        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ExternalLink size={20} />
          Self-Service Registration Portal
        </h3>
        <p style={{ marginBottom: '15px', color: '#94a3b8' }}>
          Share this link for online registration. Players appear in the check-in list below. Mark as "Paid" to add to confirmed roster.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            value={registrationUrl} 
            readOnly 
            className="input"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: '14px' }}
          />
          <button
            onClick={copyRegistrationLink}
            className="button button-secondary"
            style={{ whiteSpace: 'nowrap' }}
          >
            {copiedLink ? (
              <>
                <Check size={16} style={{ marginRight: '5px' }} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} style={{ marginRight: '5px' }} />
                Copy Link
              </>
            )}
          </button>
          <a
            href={registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button button-primary"
          >
            <ExternalLink size={16} style={{ marginRight: '5px' }} />
            Open Portal
          </a>
        </div>
        <p style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
          Players will register as {tournament.game_type === 'doubles' ? 'teams (2 players)' : 'individuals'}
        </p>
      </div>

      {tournament.id && (
        <>
          <QuickAddPlayer 
            tournamentId={tournament.id} 
            onAddPlayer={handleAddPlayer}
            isLoading={loading}
          />
          
          {/* Control Buttons */}
          <div className="card" style={{ marginBottom: '20px', backgroundColor: '#1e293b' }}>
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 600 }}>Registration is:</span>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: 700, 
                  color: tournament.registration_enabled ? '#10b981' : '#ef4444',
                  textTransform: 'uppercase'
                }}>
                  {tournament.registration_enabled ? 'OPEN' : 'CLOSED'}
                </span>
              </div>
              
              <button
                onClick={handleToggleRegistration}
                className={`button ${tournament.registration_enabled ? 'button-danger' : 'button-primary'}`}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {tournament.registration_enabled ? (
                  <>
                    <WifiOff size={16} />
                    Close Registration
                  </>
                ) : (
                  <>
                    <Wifi size={16} />
                    Open Registration
                  </>
                )}
              </button>
            </div>
            {tournament.registration_enabled && (
              <p style={{ marginTop: '15px', fontSize: '14px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={14} className="spinning" />
                Auto-refreshing check-in list every 5 seconds - New players will appear automatically
              </p>
            )}
          </div>
          
          {/* Check-In List - Unpaid Players Only - Yellow Highlight */}
          <div style={{ border: '3px solid #fbbf24', borderRadius: '12px', padding: '15px', backgroundColor: 'rgba(251, 191, 36, 0.05)', marginBottom: '20px' }}>
            <PlayerList 
              players={store.players}
              onUpdatePlayer={handleUpdatePlayer}
              onDeletePlayer={handleDeletePlayer}
              isLoading={loading}
              title="Check-In List (Unpaid)"
              showPaidOnly={false}
              emptyMessage="No unpaid registrations. All players have been marked as paid!"
            />
          </div>

          {/* Master Registration List - Paid Players Only */}
          <PlayerList 
            players={store.players}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            isLoading={loading}
            title="✅ Master Registration List (Confirmed & Paid)"
            showPaidOnly={true}
            emptyMessage="No confirmed players yet. Mark players as paid in the check-in list to add them here."
          />

          {store.players.filter(p => p.paid).length > 0 && (tournament.format === 'group-knockout' || tournament.format === 'round-robin') && (
            <GroupConfiguration
              tournament={tournament}
              players={store.players.filter(p => p.paid)}
              onSaveConfiguration={handleSaveGroupConfiguration}
            />
          )}
        </>
      )}
    </div>
  );
};

export default TournamentSetup;
