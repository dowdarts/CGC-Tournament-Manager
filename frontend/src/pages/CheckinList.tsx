import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayerService, TournamentService } from '@/services/api';
import { Player, Tournament } from '@/types';
import { CheckCircle, UserPlus, Trash2, ExternalLink, Copy, Users, Info, ArrowRight } from 'lucide-react';

const CheckinList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerEmail, setNewPlayerEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'checkin' | 'registered'>('checkin');
  const [helpMode, setHelpMode] = useState(() => {
    return localStorage.getItem('helpMode') === 'true';
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [showPreviousPlayers, setShowPreviousPlayers] = useState(false);
  const [previousPlayers, setPreviousPlayers] = useState<{ name: string; email?: string; phone?: string }[]>([]);
  const [previousPlayersFilter, setPreviousPlayersFilter] = useState('');
  const [selectedPreviousPlayers, setSelectedPreviousPlayers] = useState<Set<string>>(new Set());

  // Helper function to capitalize names properly
  const capitalizeName = (name: string): string => {
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Listen for helpMode changes from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setHelpMode(localStorage.getItem('helpMode') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    // Also check periodically for same-page updates
    const interval = setInterval(handleStorageChange, 100);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Always use production URL
  const registrationUrl = 'https://dowdarts.github.io/CGC-Tournament-Manager/registration-portal';
  const currentUrl = registrationUrl;

  useEffect(() => {
    loadTournament();
    loadPlayers();
    
    // Auto-reload every 5 seconds (background refresh only)
    const interval = setInterval(() => {
      loadPlayers(true); // Pass true to skip loading state
    }, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const loadTournament = async () => {
    if (!id) return;
    try {
      const data = await TournamentService.getTournament(id);
      setTournament(data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
    }
  };

  const loadPlayers = async (isBackgroundRefresh = false) => {
    if (!id) return;
    try {
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      const data = await PlayerService.getPlayers(id);
      setPlayers(data);
    } catch (err) {
      if (!isBackgroundRefresh) {
        setError('Failed to load check-in list');
      }
      console.error(err);
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newPlayerName.trim()) return;

    setAdding(true);
    try {
      if (tournament?.game_type === 'doubles') {
        // For doubles, add both players as a team
        const teamId = crypto.randomUUID();
        const player1Name = capitalizeName(newPlayerName);
        const player2Name = capitalizeName(newPlayerEmail); // Reusing email field for player 2 name in doubles
        
        if (!player2Name) {
          setError('Both team members are required for doubles');
          setAdding(false);
          return;
        }
        
        // Check for duplicate names
        const name1Exists = players.some(p => 
          p.name.toLowerCase() === player1Name.toLowerCase()
        );
        const name2Exists = players.some(p => 
          p.name.toLowerCase() === player2Name.toLowerCase()
        );
        
        if (name1Exists) {
          setError(`Player "${player1Name}" already exists in this tournament`);
          setAdding(false);
          return;
        }
        if (name2Exists) {
          setError(`Player "${player2Name}" already exists in this tournament`);
          setAdding(false);
          return;
        }
        
        await Promise.all([
          PlayerService.addPlayer({
            tournament_id: id,
            name: player1Name,
            paid: false,
            team_id: teamId
          }),
          PlayerService.addPlayer({
            tournament_id: id,
            name: player2Name,
            paid: false,
            team_id: teamId
          })
        ]);
      } else {
        // For singles, add single player
        const nameToAdd = capitalizeName(newPlayerName);
        const nameExists = players.some(p => 
          p.name.toLowerCase() === nameToAdd.toLowerCase()
        );
        
        if (nameExists) {
          setError(`Player "${nameToAdd}" already exists in this tournament`);
          setAdding(false);
          return;
        }
        
        await PlayerService.addPlayer({
          tournament_id: id,
          name: nameToAdd,
          email: newPlayerEmail.trim() || undefined,
          paid: false
        });
      }
      
      setNewPlayerName('');
      setNewPlayerEmail('');
      loadPlayers(true);
    } catch (err) {
      setError('Failed to add player(s)');
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleBulkAdd = async () => {
    if (!id || !bulkInput.trim()) return;

    setAdding(true);
    setError(null);
    try {
      const lines = bulkInput.split('\n').map(line => line.trim()).filter(line => line);
      
      if (tournament?.game_type === 'doubles') {
        // For doubles, pair consecutive entries as teams
        if (lines.length % 2 !== 0) {
          setError('For doubles, you must enter an even number of players (pairs)');
          setAdding(false);
          return;
        }
        
        const existingNames = new Set(players.map(p => p.name.toLowerCase()));
        const namesToAdd = new Set<string>();
        const duplicates: string[] = [];
        
        // Check for duplicates first
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split(',').map(p => p.trim());
          const name = capitalizeName(parts[0]);
          const nameLower = name.toLowerCase();
          
          if (existingNames.has(nameLower) || namesToAdd.has(nameLower)) {
            duplicates.push(name);
          } else {
            namesToAdd.add(nameLower);
          }
        }
        
        if (duplicates.length > 0) {
          setError(`Duplicate names found: ${duplicates.join(', ')}`);
          setAdding(false);
          return;
        }
        
        const teams = [];
        for (let i = 0; i < lines.length; i += 2) {
          const teamId = crypto.randomUUID();
          const player1Parts = lines[i].split(',').map(p => p.trim());
          const player2Parts = lines[i + 1].split(',').map(p => p.trim());
          
          teams.push(
            PlayerService.addPlayer({
              tournament_id: id,
              name: capitalizeName(player1Parts[0]),
              email: player1Parts[1] || undefined,
              paid: false,
              team_id: teamId
            }),
            PlayerService.addPlayer({
              tournament_id: id,
              name: capitalizeName(player2Parts[0]),
              email: player2Parts[1] || undefined,
              paid: false,
              team_id: teamId
            })
          );
        }
        
        await Promise.all(teams);
      } else {
        // For singles, add each line as a player
        const existingNames = new Set(players.map(p => p.name.toLowerCase()));
        const namesToAdd = new Set<string>();
        const duplicates: string[] = [];
        
        const playersToAdd = lines.map(line => {
          const parts = line.split(',').map(p => p.trim());
          const name = capitalizeName(parts[0]);
          const nameLower = name.toLowerCase();
          
          if (existingNames.has(nameLower) || namesToAdd.has(nameLower)) {
            duplicates.push(name);
            return null;
          }
          
          namesToAdd.add(nameLower);
          return PlayerService.addPlayer({
            tournament_id: id,
            name: name,
            email: parts[1] || undefined,
            paid: false
          });
        }).filter(Boolean);
        
        if (duplicates.length > 0) {
          setError(`Duplicate names found: ${duplicates.join(', ')}`);
          setAdding(false);
          return;
        }
        
        await Promise.all(playersToAdd);
      }
      
      setBulkInput('');
      setShowBulkModal(false);
      loadPlayers(true);
    } catch (err) {
      setError('Failed to add players');
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  const handleMarkPaid = async (playerId: string) => {
    if (!id) return;
    try {
      // Get the player to check if they're part of a team
      const player = players.find(p => p.id === playerId);
      
      if (player?.team_id && tournament?.game_type === 'doubles') {
        // Mark all players in the team as paid
        const teamPlayers = players.filter(p => p.team_id === player.team_id);
        await Promise.all(
          teamPlayers.map(p => PlayerService.updatePlayer(p.id, { paid: true }))
        );
      } else {
        // Mark just this player as paid
        await PlayerService.updatePlayer(playerId, { paid: true });
      }
      
      loadPlayers(true);
    } catch (err) {
      setError('Failed to mark player as paid');
      console.error(err);
    }
  };

  const handleMarkUnpaid = async (playerId: string) => {
    if (!id) return;
    
    // Get the player to show their name in confirmation
    const player = players.find(p => p.id === playerId);
    const playerName = player ? capitalizeName(player.name) : 'this player';
    
    // Confirm before marking as unpaid to prevent accidents
    if (!confirm(`Mark ${playerName} as unpaid? This will remove them from the Registration List.`)) {
      return;
    }
    
    try {
      // Get the player to check if they're part of a team
      if (player?.team_id && tournament?.game_type === 'doubles') {
        // Mark all players in the team as unpaid
        const teamPlayers = players.filter(p => p.team_id === player.team_id);
        await Promise.all(
          teamPlayers.map(p => PlayerService.updatePlayer(p.id, { paid: false }))
        );
      } else {
        // Mark just this player as unpaid
        await PlayerService.updatePlayer(playerId, { paid: false });
      }
      
      loadPlayers(true);
    } catch (err) {
      setError('Failed to mark player as unpaid');
      console.error(err);
    }
  };

  const handleConfirmParticipants = async () => {
    if (!id) return;
    
    setAdvancing(true);
    try {
      // Mark participants as confirmed and advance
      await TournamentService.updateTournament(id, {
        participants_confirmed: true
      });
      
      // Navigate to Group Configuration
      navigate(`/tournament/${id}/players`);
    } catch (err) {
      setError('Failed to confirm participants');
      console.error(err);
    } finally {
      setAdvancing(false);
      setShowConfirmModal(false);
    }
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from tournament?`)) return;
    if (!id) return;

    try {
      await PlayerService.deletePlayer(playerId);
      loadPlayers();
    } catch (err) {
      setError('Failed to delete player');
      console.error(err);
    }
  };

  const loadPreviousPlayers = async () => {
    try {
      const allPlayers = await PlayerService.getAllPlayers();
      setPreviousPlayers(allPlayers);
      setShowPreviousPlayers(true);
    } catch (error) {
      console.error('Error loading previous players:', error);
      setError('Failed to load previous players');
    }
  };

  const handleAddSelectedPlayers = async () => {
    if (!id || selectedPreviousPlayers.size === 0) return;
    
    try {
      const playersToAdd = previousPlayers.filter(p => 
        selectedPreviousPlayers.has(p.name)
      );
      
      for (const player of playersToAdd) {
        const exists = players.some(p => 
          p.name.toLowerCase().trim() === player.name.toLowerCase().trim()
        );
        
        if (!exists) {
          await PlayerService.addPlayer({
            tournament_id: id,
            name: capitalizeName(player.name),
            email: player.email || '',
            paid: false
          });
        }
      }
      
      setSelectedPreviousPlayers(new Set());
      setShowPreviousPlayers(false);
      await loadPlayers(true);
    } catch (error) {
      console.error('Error adding players:', error);
      setError('Failed to add players');
    }
  };

  const togglePlayerSelection = (playerName: string) => {
    setSelectedPreviousPlayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(playerName)) {
        newSet.delete(playerName);
      } else {
        newSet.add(playerName);
      }
      return newSet;
    });
  };

  if (loading) {
    return <div className="alert alert-info">Loading check-in list...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2>Participants</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>
          Manage all players/teams for this tournament
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '30px',
        borderBottom: '2px solid #334155',
        paddingBottom: '10px'
      }}>
        <button
          onClick={() => setActiveTab('checkin')}
          className={`button ${activeTab === 'checkin' ? 'button-primary' : 'button-secondary'}`}
          style={{ flex: 1, fontSize: '20px', padding: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          Check-in List ({players.length})
          {helpMode && (
            <span 
              title="All registered players showing their payment status. Toggle payment status here to control Registration List."
              style={{ 
                cursor: 'help',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              <Info size={16} />
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('registered')}
          className={`button ${activeTab === 'registered' ? 'button-primary' : 'button-secondary'}`}
          style={{ flex: 1, fontSize: '20px', padding: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
        >
          Registration List ({players.filter(p => p.paid).length})
          {helpMode && (
            <span 
              title="Players/teams who have paid and are officially registered. These players will be used for group configuration."
              style={{ 
                cursor: 'help',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              <Info size={16} />
            </span>
          )}
        </button>
      </div>

      {/* Previous Players Section */}
      {showPreviousPlayers && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Previous Players</h3>
            <button 
              className="btn btn-secondary"
              onClick={() => {
                setShowPreviousPlayers(false);
                setSelectedPreviousPlayers(new Set());
                setPreviousPlayersFilter('');
              }}
            >
              Close
            </button>
          </div>

          <input
            type="text"
            className="form-control"
            placeholder="Filter players by name..."
            value={previousPlayersFilter}
            onChange={(e) => setPreviousPlayersFilter(e.target.value)}
            style={{ marginBottom: '15px' }}
          />

          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
            border: '1px solid #334155',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '15px'
          }}>
            {previousPlayers
              .filter(p => p.name.toLowerCase().includes(previousPlayersFilter.toLowerCase()))
              .map(player => (
                <div
                  key={player.name}
                  style={{
                    padding: '10px',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedPreviousPlayers.has(player.name) ? '#1e3a5f' : 'transparent'
                  }}
                  onClick={() => togglePlayerSelection(player.name)}
                >
                  <div style={{ fontWeight: 'bold' }}>{player.name}</div>
                  {player.email && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{player.email}</div>}
                </div>
              ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                const filtered = previousPlayers.filter(p => 
                  p.name.toLowerCase().includes(previousPlayersFilter.toLowerCase())
                );
                if (selectedPreviousPlayers.size === filtered.length) {
                  setSelectedPreviousPlayers(new Set());
                } else {
                  setSelectedPreviousPlayers(new Set(filtered.map(p => p.name)));
                }
              }}
            >
              {selectedPreviousPlayers.size === previousPlayers.filter(p => 
                p.name.toLowerCase().includes(previousPlayersFilter.toLowerCase())
              ).length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAddSelectedPlayers}
              disabled={selectedPreviousPlayers.size === 0}
              style={{ flex: 1 }}
            >
              Add {selectedPreviousPlayers.size} Player{selectedPreviousPlayers.size !== 1 ? 's' : ''} to Tournament
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {/* Check-in List Tab */}
      {activeTab === 'checkin' && (
        <>
          {/* Registration Portal Link */}
          <div className="card" style={{ 
        marginBottom: '30px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: '2px solid #667eea'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExternalLink size={20} style={{ display: 'inline', marginRight: '8px' }} />
            Self-Service Registration Portal
            {helpMode && (
              <span 
                title="Share this link with players to let them register themselves on tablets or phones. Registrations appear in the Check-in List."
                style={{ 
                  cursor: 'help',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  fontSize: '12px'
                }}
              >
                <Info size={14} />
              </span>
            )}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              fontSize: '14px', 
              fontWeight: 600, 
              color: '#fff'
            }}>
              Status:
            </span>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: 700, 
              color: tournament?.registration_enabled ? '#10b981' : '#ef4444',
              textTransform: 'uppercase',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '4px 12px',
              borderRadius: '6px'
            }}>
              {tournament?.registration_enabled ? 'OPEN' : 'CLOSED'}
            </span>
            <button
              onClick={async () => {
                if (!id) return;
                try {
                  const updated = await TournamentService.updateTournament(id, {
                    registration_enabled: !tournament?.registration_enabled
                  });
                  setTournament(updated);
                  alert(updated.registration_enabled ? '✅ Registration is now ONLINE' : '🔴 Registration is now OFFLINE');
                } catch (err) {
                  console.error('Failed to toggle registration:', err);
                  setError('Failed to toggle registration');
                }
              }}
              className="button"
              style={{ 
                backgroundColor: tournament?.registration_enabled ? '#ef4444' : '#10b981',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px'
              }}
            >
              {tournament?.registration_enabled ? 'Close' : 'Open'} Registration
            </button>
          </div>
        </div>
        
        <p style={{ color: '#e2e8f0', marginBottom: '15px', fontSize: '14px' }}>
          {tournament?.registration_enabled 
            ? 'Share this link with players. Live tournaments will appear in the registration lobby.'
            : 'Registration is closed. Enable it to allow new player registrations and make this tournament visible in the lobby.'}
        </p>
        
        <div style={{ 
          display: 'flex', 
          gap: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          padding: '12px',
          borderRadius: '8px',
          alignItems: 'center'
        }}>
          <input
            type="text"
            value={currentUrl}
            readOnly
            className="input"
            style={{ 
              flex: 1,
              backgroundColor: '#fff',
              color: '#0f172a',
              fontFamily: 'monospace',
              fontSize: '13px'
            }}
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(currentUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="button button-success"
            style={{ minWidth: '100px' }}
            title="Copy the registration link to clipboard to share with players"
          >
            <Copy size={16} style={{ marginRight: '5px' }} />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={() => window.open(currentUrl, '_blank')}
            className="button"
            style={{ 
              backgroundColor: '#fff',
              color: '#667eea',
              minWidth: '100px'
            }}
            title="Open the registration portal in a new tab to test it or register players directly"
          >
            <ExternalLink size={16} style={{ marginRight: '5px' }} />
            Open
          </button>
        </div>
      </div>

      {/* Add Player Form */}
      <form onSubmit={handleAddPlayer} className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tournament?.game_type === 'doubles' ? 'Add Team' : 'Add Player'}
            {helpMode && (
              <span 
                title={tournament?.game_type === 'doubles' 
                  ? "Add a single team to the check-in list. Use Bulk Add for multiple teams."
                  : "Add a single player to the check-in list. Use Bulk Add for multiple players."}
                style={{ 
                  cursor: 'help',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(102, 126, 234, 0.2)',
                  fontSize: '12px'
                }}
              >
                <Info size={14} />
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={loadPreviousPlayers}
              className="btn btn-secondary"
            >
              <Users size={16} style={{ marginRight: '6px' }} />
              Add from Previous Players
            </button>
            <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="button button-secondary"
            style={{ padding: '10px 20px' }}
          >
            <Users size={18} style={{ marginRight: '5px' }} />
            Bulk Add
          </button>
        </div>
        </div>
        
        {tournament?.game_type === 'doubles' ? (
          /* Doubles: Add team */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Player 1 Name</label>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="input"
                placeholder="Enter player 1 name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Player 2 Name</label>
              <input
                type="text"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                className="input"
                placeholder="Enter player 2 name"
                required={tournament?.game_type === 'doubles'}
              />
            </div>
            <button
              type="submit"
              className="button button-primary"
              disabled={adding || !newPlayerName.trim() || (tournament?.game_type === 'doubles' && !newPlayerEmail.trim())}
              title="Add this team to the check-in list (unpaid status)"
            >
              <UserPlus size={18} style={{ marginRight: '5px' }} />
              {adding ? 'Adding...' : 'Add Team'}
            </button>
          </div>
        ) : (
          /* Singles: Add single player */
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: '10px', alignItems: 'end' }}>
            <div className="form-group">
              <label className="form-label">Player Name</label>
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                className="input"
                placeholder="Enter player name"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                value={newPlayerEmail}
                onChange={(e) => setNewPlayerEmail(e.target.value)}
                className="input"
                placeholder="email@example.com"
              />
            </div>
            <button
              type="submit"
              className="button button-primary"
              disabled={adding || !newPlayerName.trim()}
              title="Add this player to the check-in list (unpaid status)"
            >
              <UserPlus size={18} style={{ marginRight: '5px' }} />
              {adding ? 'Adding...' : 'Add Player'}
            </button>
          </div>
        )}
      </form>

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Bulk Add {tournament?.game_type === 'doubles' ? 'Teams' : 'Players'}</h2>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkInput('');
                }}
                className="button button-danger"
                style={{ padding: '8px 16px' }}
              >
                Close
              </button>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'rgba(102, 126, 234, 0.1)', borderRadius: '8px' }}>
              <h4 style={{ marginTop: 0 }}>Format:</h4>
              {tournament?.game_type === 'doubles' ? (
                <>
                  <p style={{ margin: '10px 0', color: '#94a3b8' }}>Enter players in pairs (consecutive lines form a team):</p>
                  <pre style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                    padding: '10px', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    overflow: 'auto'
                  }}>
Player 1 Name,email@example.com
Player 2 Name,email@example.com
Player 3 Name
Player 4 Name,email@example.com</pre>
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>• Players 1 & 2 = Team 1<br/>• Players 3 & 4 = Team 2<br/>• Email is optional</p>
                </>
              ) : (
                <>
                  <p style={{ margin: '10px 0', color: '#94a3b8' }}>Enter one player per line:</p>
                  <pre style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.3)', 
                    padding: '10px', 
                    borderRadius: '6px',
                    fontSize: '14px',
                    overflow: 'auto'
                  }}>
Matthew Dow,dow1800@gmail.com
Mike Leger,mike2cool@gmail.com
Mark Roberts
Moe Cormier,moec@gmail.com</pre>
                  <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>• Format: Name,Email<br/>• Email is optional</p>
                </>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Enter {tournament?.game_type === 'doubles' ? 'Team' : 'Player'} List</label>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                className="input"
                placeholder={tournament?.game_type === 'doubles' 
                  ? "Player 1 Name,email@example.com\nPlayer 2 Name,email@example.com\nPlayer 3 Name\nPlayer 4 Name"
                  : "Name,Email\nName\nName,Email"}
                rows={12}
                style={{ resize: 'vertical', fontFamily: 'monospace', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleBulkAdd}
                className="button button-success"
                disabled={adding || !bulkInput.trim()}
                style={{ flex: 1 }}
              >
                <UserPlus size={18} style={{ marginRight: '5px' }} />
                {adding ? 'Adding...' : `Add ${bulkInput.split('\n').filter(l => l.trim()).length} ${tournament?.game_type === 'doubles' ? 'Players (' + Math.floor(bulkInput.split('\n').filter(l => l.trim()).length / 2) + ' Teams)' : 'Players'}`}
              </button>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkInput('');
                }}
                className="button button-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-in List */}
      <div className="card">
        <h3 style={{ marginBottom: '20px' }}>
          <Users size={20} style={{ display: 'inline', marginRight: '8px' }} />
          All Participants ({players.length})
        </h3>

        {players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>No players registered yet</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Players will appear here after registering via the portal or being added manually
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tournament?.game_type === 'doubles' ? (
              // Render teams for doubles
              (() => {
                // Group players by team_id
                const teams: { [key: string]: Player[] } = {};
                const soloPlayers: Player[] = [];
                
                players.forEach(player => {
                  if (player.team_id) {
                    if (!teams[player.team_id]) {
                      teams[player.team_id] = [];
                    }
                    teams[player.team_id].push(player);
                  } else {
                    soloPlayers.push(player);
                  }
                });

                return (
                  <>
                    {/* Render Teams */}
                    {Object.entries(teams).map(([teamId, teamPlayers]) => (
                      <div
                        key={teamId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px',
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          border: teamPlayers[0].paid ? '3px solid #10b981' : '3px solid #f59e0b',
                          boxShadow: teamPlayers[0].paid ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        <div>
                          <div style={{ 
                            fontWeight: 'bold', 
                            marginBottom: '5px',
                            color: '#3b82f6',
                            fontSize: '13px'
                          }}>
                            TEAM
                          </div>
                          {teamPlayers.map((player, idx) => (
                            <div key={player.id}>
                              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                                {idx + 1}. {capitalizeName(player.name)}
                              </div>
                              {player.email && (
                                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                                  {player.email}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => teamPlayers[0].paid ? handleMarkUnpaid(teamPlayers[0].id) : handleMarkPaid(teamPlayers[0].id)}
                            className={`button ${teamPlayers[0].paid ? 'button-success' : 'button-warning'}`}
                            title={teamPlayers[0].paid ? "Mark entire team as unpaid" : "Mark entire team as paid and add them to the Registration List"}
                          >
                            {teamPlayers[0].paid ? 'Paid' : 'Unpaid'}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove entire team from check-in list?`)) {
                                teamPlayers.forEach(p => handleDeletePlayer(p.id, p.name));
                              }
                            }}
                            className="button button-danger"
                            title="Permanently remove this entire team from the tournament"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Render Solo Players (if any without team_id) */}
                    {soloPlayers.map((player) => (
                      <div
                        key={player.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px',
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          border: player.paid ? '3px solid #10b981' : '3px solid #f59e0b',
                          boxShadow: player.paid ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(245, 158, 11, 0.3)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {capitalizeName(player.name)}
                          </div>
                          {player.email && (
                            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                              {player.email}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => player.paid ? handleMarkUnpaid(player.id) : handleMarkPaid(player.id)}
                            className={`button ${player.paid ? 'button-success' : 'button-warning'}`}
                            title={player.paid ? "Mark as unpaid" : "Mark as paid"}
                          >
                            {player.paid ? 'Paid' : 'Unpaid'}
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id, player.name)}
                            className="button button-danger"
                            title="Remove from list"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()
            ) : (
              // Render individual players for singles
              players.map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: player.paid ? '3px solid #10b981' : '3px solid #f59e0b',
                    boxShadow: player.paid ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {capitalizeName(player.name)}
                    </div>
                    {player.email && (
                      <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {player.email}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => player.paid ? handleMarkUnpaid(player.id) : handleMarkPaid(player.id)}
                      className={`button ${player.paid ? 'button-success' : 'button-warning'}`}
                      title={player.paid ? "Mark this player as unpaid" : "Mark this player as paid and add them to the Registration List"}
                    >
                      {player.paid ? 'Paid' : 'Unpaid'}
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id, player.name)}
                      className="button button-danger"
                      title="Permanently remove this player from the tournament"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Paid Players (Registration List) Tab */}
      {activeTab === 'registered' && (
        <div className="card">
        <h3 style={{ marginBottom: '20px' }}>
          <Users size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Registered & Paid {tournament?.game_type === 'doubles' ? 'Teams' : 'Players'} ({players.filter(p => p.paid).length})
        </h3>

        {players.filter(p => p.paid).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>No paid players yet</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Players will appear here after being marked as paid
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tournament?.game_type === 'doubles' ? (
              // Render teams for doubles
              (() => {
                // Group players by team_id
                const teams: { [key: string]: Player[] } = {};
                const soloPlayers: Player[] = [];
                
                players.filter(p => p.paid).forEach(player => {
                  if (player.team_id) {
                    if (!teams[player.team_id]) {
                      teams[player.team_id] = [];
                    }
                    teams[player.team_id].push(player);
                  } else {
                    soloPlayers.push(player);
                  }
                });

                return (
                  <>
                    {/* Render Teams */}
                    {Object.entries(teams).map(([teamId, teamPlayers]) => (
                      <div
                        key={teamId}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px',
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          border: '3px solid #10b981',
                          boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <div>
                          <div style={{ 
                            fontWeight: 'bold', 
                            marginBottom: '5px',
                            color: '#3b82f6',
                            fontSize: '13px'
                          }}>
                            TEAM
                          </div>
                          {teamPlayers.map((player, idx) => (
                            <div key={player.id}>
                              <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                                {idx + 1}. {capitalizeName(player.name)}
                              </div>
                              {player.email && (
                                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>
                                  {player.email}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleMarkUnpaid(teamPlayers[0].id)}
                            className="button button-success"
                            title="Mark team as unpaid and move back to Check-in List"
                          >
                            Paid
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove entire team from tournament?`)) {
                                teamPlayers.forEach(p => handleDeletePlayer(p.id, p.name));
                              }
                            }}
                            className="button button-danger"
                            title="Permanently remove this entire team from the tournament"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Render Solo Players (if any without team_id) */}
                    {soloPlayers.map((player) => (
                      <div
                        key={player.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '15px',
                          backgroundColor: '#1e293b',
                          borderRadius: '8px',
                          border: '3px solid #10b981',
                          boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                            {capitalizeName(player.name)}
                          </div>
                          {player.email && (
                            <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                              {player.email}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleMarkUnpaid(player.id)}
                            className="button button-success"
                            title="Mark player as unpaid and move back to Check-in List"
                          >
                            Paid
                          </button>
                          <button
                            onClick={() => handleDeletePlayer(player.id, player.name)}
                            className="button button-danger"
                            title="Permanently remove this player from the tournament"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                );
              })()
            ) : (
              // Render individual players for singles
              players.filter(p => p.paid).map((player) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: '3px solid #10b981',
                    boxShadow: '0 0 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                      {capitalizeName(player.name)}
                    </div>
                    {player.email && (
                      <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                        {player.email}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleMarkUnpaid(player.id)}
                      className="button button-success"
                      title="Mark player as unpaid and move back to Check-in List"
                    >
                      Paid
                    </button>
                    <button
                      onClick={() => handleDeletePlayer(player.id, player.name)}
                      className="button button-danger"
                      title="Permanently remove this player from the tournament"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      )}

      {/* Next Step Button */}
      {tournament && (
        <div style={{ marginTop: '30px', textAlign: 'center' }}>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="button button-success button-large"
            disabled={advancing}
          >
            {advancing ? 'Saving...' : 'Next Step: Configure Groups'}
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{
            maxWidth: '600px',
            margin: '20px',
            backgroundColor: '#1e293b',
            border: '2px solid #667eea'
          }}>
            <h3 style={{ marginBottom: '15px', color: '#fff' }}>
              Confirm Participants
            </h3>
            <p style={{ color: '#e2e8f0', marginBottom: '20px', lineHeight: '1.6' }}>
              Double check all checked-in {tournament?.game_type === 'doubles' ? 'teams' : 'players'} who have paid are selected and are ready to participate in the tournament.
            </p>
            <p style={{ color: '#f59e0b', marginBottom: '20px', fontWeight: 'bold' }}>
              ⚠️ Once confirmed, you'll proceed to group configuration. Make sure all participants are accounted for!
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="button button-secondary"
                disabled={advancing}
              >
                Go Back & Review
              </button>
              <button
                onClick={handleConfirmParticipants}
                className="button button-success"
                disabled={advancing}
              >
                {advancing ? 'Confirming...' : 'Confirm & Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckinList;
