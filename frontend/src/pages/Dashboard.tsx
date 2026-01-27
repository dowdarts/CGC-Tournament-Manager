import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TournamentService, PlayerService } from '@/services/api';
import { Tournament } from '@/types';
import { Plus, Users, HelpCircle, X, Trophy, TrendingUp, Calendar } from 'lucide-react';
import { TournamentCard } from '@/components/modern/TournamentCard';
import { StatCard } from '@/components/modern/StatCard';
import { LoadingSkeleton } from '@/components/modern/LoadingSkeleton';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [playerCounts, setPlayerCounts] = useState<{ [key: string]: number }>({});
  const [teamCounts, setTeamCounts] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Read filter from URL params, default to 'active'
  const searchParams = new URLSearchParams(window.location.search);
  const urlFilter = searchParams.get('filter') as 'active' | 'archived' | 'completed' | null;
  const [filter, setFilter] = useState<'active' | 'archived' | 'completed'>(urlFilter || 'active');

  // Update filter when URL changes
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const newFilter = params.get('filter') as 'active' | 'archived' | 'completed' | null;
    if (newFilter && newFilter !== filter) {
      setFilter(newFilter);
    }
  }, [window.location.search]);

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

  const handleArchiveTournament = async (id: string, name: string) => {
    if (!confirm(`Archive "${name}"? You can restore it later from the Archived section.`)) {
      return;
    }

    try {
      await TournamentService.updateTournament(id, { archived: true });
      await loadTournaments();
    } catch (err) {
      setError('Failed to archive tournament');
      console.error(err);
    }
  };

  const handleUnarchiveTournament = async (id: string) => {
    try {
      await TournamentService.updateTournament(id, { archived: false });
      await loadTournaments();
    } catch (err) {
      setError('Failed to unarchive tournament');
      console.error(err);
    }
  };

  const handleMarkComplete = async (id: string, name: string) => {
    if (!confirm(`Mark "${name}" as completed? This will move it to the Completed section.`)) {
      return;
    }

    try {
      await TournamentService.updateTournament(id, { completed: true, status: 'completed' });
      await loadTournaments();
    } catch (err) {
      setError('Failed to mark tournament as complete');
      console.error(err);
    }
  };

  const handleMarkIncomplete = async (id: string) => {
    try {
      await TournamentService.updateTournament(id, { completed: false });
      await loadTournaments();
    } catch (err) {
      setError('Failed to mark tournament as incomplete');
      console.error(err);
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (filter === 'archived') return t.archived === true;
    if (filter === 'completed') return t.completed === true && !t.archived;
    return !t.archived && !t.completed; // active
  });

  // Debug logging
  console.log('Dashboard - Filter:', filter);
  console.log('Dashboard - All tournaments:', tournaments.map(t => ({ 
    id: t.id, 
    name: t.name, 
    archived: t.archived, 
    completed: t.completed 
  })));
  console.log('Dashboard - Filtered tournaments:', filteredTournaments.map(t => ({ 
    id: t.id, 
    name: t.name 
  })));

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: string } = {
      'setup': 'badge-warning',
      'group-stage': 'badge-primary',
      'knockout': 'badge-primary',
      'completed': 'badge-success'
    };
    return badges[status] || 'badge-warning';
  };

  const handleManageTournament = (id: string) => {
    const tournament = tournaments.find(t => t.id === id);
    if (!tournament) return;

    let route = `/tournament/${id}/info`;
    
    if (tournament.status === 'knockout' || tournament.status === 'completed') {
      route = `/tournament/${id}/bracket`;
    } else if (tournament.group_stage_created || tournament.status === 'group-stage') {
      route = `/tournament/${id}/groups`;
    } else if (tournament.groups_generated) {
      route = `/tournament/${id}/players`;
    }
    
    navigate(route);
  };

  const handleBoardsClick = (id: string) => {
    navigate(`/tournament/${id}/boards`);
  };

  // Calculate stats for stat cards
  const activeTournaments = tournaments.filter(t => !t.archived && !t.completed);
  const totalPlayers = Object.values(playerCounts).reduce((sum, count) => sum + count, 0);
  const upcomingTournaments = tournaments.filter(t => 
    !t.archived && !t.completed && new Date(t.date || '') > new Date()
  );

  if (loading) {
    return (
      <div>
        <div className="divider" />
        <LoadingSkeleton type="stat" count={3} />
        <div className="divider" />
        <LoadingSkeleton count={4} />
      </div>
    );
  }

  return (
    <div>
      {/* Help Guide */}
      {showHelp && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-lg relative">
          <button
            onClick={() => setShowHelp(false)}
            className="absolute top-2 right-2 text-blue-600 hover:text-blue-800"
            title="Close help"
          >
            <X size={20} />
          </button>
          <div className="flex items-start gap-3">
            <HelpCircle size={24} className="text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-900 mb-2">Tournament Lobby - Main Dashboard</h3>
              <div className="text-blue-800 space-y-2 text-sm">
                <p>
                  <strong>Welcome to your Tournament Management Hub!</strong> This is your central command center where you can access and manage all your tournaments.
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Create New Tournaments:</strong> Click the "New Tournament" button to set up a new event with custom settings</li>
                  <li><strong>Manage Tournaments:</strong> Click "Manage" to access tournament setup, registration, group stage, and knockout brackets</li>
                  <li><strong>Board Manager:</strong> Click "Boards" to assign matches to physical board numbers and manage match flow</li>
                  <li><strong>Smart Navigation:</strong> The system automatically takes you to the right stage of your tournament (setup, group stage, or knockout)</li>
                  <li><strong>View at a Glance:</strong> See player counts, game type (singles/doubles), and tournament status badges for each event</li>
                </ul>
                <p className="mt-3 italic">
                  💡 Tip: Use your browser's back button to return to the dashboard after managing a tournament.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex items-center gap-3">
          <h1>My Tournaments</h1>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title={showHelp ? "Hide help guide" : "Show help guide"}
          >
            <HelpCircle size={24} />
          </button>
        </div>
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

      {/* Stats Overview - Only show for active tournaments */}
      {filter === 'active' && (
        <>
          <div style={{ maxWidth: '400px', marginBottom: '40px' }} className="fade-in">
            <StatCard
              title="Active Tournaments"
              value={activeTournaments.length}
              icon={Trophy}
              iconColor="#ff6600"
              subtitle="Currently running"
            />
          </div>
        </>
      )}

      {filteredTournaments.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ marginBottom: '20px', color: '#94a3b8' }}>
            {filter === 'archived' && 'No archived tournaments'}
            {filter === 'completed' && 'No completed tournaments'}
            {filter === 'active' && 'No active tournaments yet'}
          </p>
          {filter === 'active' && (
            <button
              onClick={() => navigate('/tournament/new/info')}
              className="button button-primary"
            >
              Create Your First Tournament
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-2 fade-in">
          {filteredTournaments.map((tournament) => (
            <TournamentCard
              key={tournament.id}
              tournament={tournament}
              playerCount={playerCounts[tournament.id] || 0}
              teamCount={teamCounts[tournament.id]}
              onManage={handleManageTournament}
              onBoards={handleBoardsClick}
              onDelete={handleDeleteTournament}
              onArchive={handleArchiveTournament}
              onUnarchive={handleUnarchiveTournament}
              onMarkComplete={handleMarkComplete}
              onMarkIncomplete={handleMarkIncomplete}
              isArchived={filter === 'archived'}
              isCompleted={filter === 'completed'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
