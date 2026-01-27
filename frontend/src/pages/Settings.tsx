import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TournamentService, BoardService, GroupService } from '@/services/api';
import { Tournament, Board, Group } from '@/types';
import { Settings as SettingsIcon, Info, ArrowUp, ArrowDown, Trash2, Grid, User, Shield } from 'lucide-react';
import AccountSettings from '@/components/AccountSettings';

const Settings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'account' | 'tournament'>(!id ? 'account' : 'tournament');
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Match Format Configuration
  const [matchFormat, setMatchFormat] = useState<'matchplay' | 'set_play'>('matchplay');
  const [playStyle, setPlayStyle] = useState<'play_all' | 'best_of'>('best_of');
  const [legsPerMatch, setLegsPerMatch] = useState(5);
  const [setsPerMatch, setSetsPerMatch] = useState(3);
  const [legsPerSet, setLegsPerSet] = useState(5);
  
  // Board Assignment
  const [boards, setBoards] = useState<Board[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [boardGroupAssignments, setBoardGroupAssignments] = useState<Record<string, string>>({});
  
  // Scoring configuration
  const [primaryMetric, setPrimaryMetric] = useState<'match_wins' | 'leg_wins' | 'tournament_points'>('match_wins');
  const [pointsForWin, setPointsForWin] = useState(2);
  const [pointsForDraw, setPointsForDraw] = useState(1);
  const [pointsForLoss, setPointsForLoss] = useState(0);
  const [tiebreakOrder, setTiebreakOrder] = useState<('leg_difference' | 'head_to_head' | 'legs_won' | 'legs_lost' | 'match_wins')[]>(['leg_difference', 'head_to_head']);

  useEffect(() => {
    loadTournament();
  }, [id]);

  const loadTournament = async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [tournamentData, boardsData, groupsData] = await Promise.all([
        TournamentService.getTournament(id),
        BoardService.getBoards(id),
        GroupService.getGroups(id)
      ]);
      
      setTournament(tournamentData);
      setBoards(boardsData);
      setGroups(groupsData);
      
      // Load match format settings from scoring_system JSONB
      if (tournamentData.scoring_system) {
        if (tournamentData.scoring_system.roundrobin_format) {
          setMatchFormat(tournamentData.scoring_system.roundrobin_format);
        }
        if (tournamentData.scoring_system.roundrobin_play_style) {
          setPlayStyle(tournamentData.scoring_system.roundrobin_play_style);
        }
        if (tournamentData.scoring_system.roundrobin_legs_per_match) {
          setLegsPerMatch(tournamentData.scoring_system.roundrobin_legs_per_match);
        }
        if (tournamentData.scoring_system.roundrobin_sets_per_match) {
          setSetsPerMatch(tournamentData.scoring_system.roundrobin_sets_per_match);
        }
        if (tournamentData.scoring_system.roundrobin_legs_per_set) {
          setLegsPerSet(tournamentData.scoring_system.roundrobin_legs_per_set);
        }
        
        // Load scoring config
        if (tournamentData.scoring_system.primary_metric) {
          setPrimaryMetric(tournamentData.scoring_system.primary_metric);
        }
        if (tournamentData.scoring_system.points_for_win !== undefined) {
          setPointsForWin(tournamentData.scoring_system.points_for_win);
        }
        if (tournamentData.scoring_system.points_for_draw !== undefined) {
          setPointsForDraw(tournamentData.scoring_system.points_for_draw);
        }
        if (tournamentData.scoring_system.points_for_loss !== undefined) {
          setPointsForLoss(tournamentData.scoring_system.points_for_loss);
        }
        if (tournamentData.scoring_system.tiebreak_order) {
          setTiebreakOrder(tournamentData.scoring_system.tiebreak_order);
        }
      }
      
      // Load board assignments
      const assignments: Record<string, string> = {};
      boardsData.forEach(board => {
        if (board.assigned_group_ids && board.assigned_group_ids.length > 0) {
          assignments[board.id] = board.assigned_group_ids[0];
        }
      });
      setBoardGroupAssignments(assignments);
    } catch (err) {
      setError('Failed to load tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Save tournament settings (match format and scoring configuration)
      await TournamentService.updateTournament(id, {
        scoring_system: {
          primary_metric: primaryMetric,
          roundrobin_format: matchFormat,
          roundrobin_play_style: playStyle,
          roundrobin_legs_per_match: matchFormat === 'matchplay' ? legsPerMatch : undefined,
          roundrobin_sets_per_match: matchFormat === 'set_play' ? setsPerMatch : undefined,
          roundrobin_legs_per_set: matchFormat === 'set_play' ? legsPerSet : undefined,
          knockout_format: matchFormat,
          knockout_legs_per_match: matchFormat === 'matchplay' ? legsPerMatch : undefined,
          knockout_sets_per_match: matchFormat === 'set_play' ? setsPerMatch : undefined,
          knockout_legs_per_set: matchFormat === 'set_play' ? legsPerSet : undefined,
          points_for_win: pointsForWin,
          points_for_draw: pointsForDraw,
          points_for_loss: pointsForLoss,
          tiebreak_order: tiebreakOrder
        }
      });
      
      // Save board assignments
      for (const board of boards) {
        const assignedGroupId = boardGroupAssignments[board.id];
        if (assignedGroupId) {
          await BoardService.updateBoard(board.id, { 
            assigned_group_ids: [assignedGroupId]
          });
        } else {
          await BoardService.updateBoard(board.id, { 
            assigned_group_ids: [] 
          });
        }
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const addTiebreaker = (rule: 'leg_difference' | 'head_to_head' | 'legs_won' | 'legs_lost' | 'match_wins') => {
    if (!tiebreakOrder.includes(rule)) {
      setTiebreakOrder([...tiebreakOrder, rule]);
    }
  };

  const removeTiebreaker = (index: number) => {
    setTiebreakOrder(tiebreakOrder.filter((_, i) => i !== index));
  };

  const moveTiebreakerUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...tiebreakOrder];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setTiebreakOrder(newOrder);
  };

  const moveTiebreakerDown = (index: number) => {
    if (index === tiebreakOrder.length - 1) return;
    const newOrder = [...tiebreakOrder];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setTiebreakOrder(newOrder);
  };

  const getTiebreakLabel = (rule: string) => {
    const labels: { [key: string]: string } = {
      'leg_difference': 'Leg Difference (+/-)',
      'head_to_head': 'Head-to-Head Result',
      'legs_won': 'Total Legs Won',
      'legs_lost': 'Total Legs Lost',
      'match_wins': 'Total Match Wins'
    };
    return labels[rule] || rule;
  };

  if (loading) {
    return <div className="alert alert-info">Loading settings...</div>;
  }

  return (
    <div>
      {/* Settings Navigation Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <User size={18} />
          Account Settings
        </button>
        {id && (
          <button
            className={`tab-button ${activeTab === 'tournament' ? 'active' : ''}`}
            onClick={() => setActiveTab('tournament')}
          >
            <SettingsIcon size={18} />
            Tournament Settings
          </button>
        )}
      </div>

      {/* Account Settings Tab */}
      {activeTab === 'account' && <AccountSettings />}

      {/* Tournament Settings Tab */}
      {activeTab === 'tournament' && id && (
        <div className="tournament-settings">
          <div style={{ marginBottom: '30px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SettingsIcon size={28} />
              Tournament Settings & Scoring Rules
            </h2>
            <p style={{ color: '#94a3b8', marginTop: '8px' }}>
              Configure how matches are scored and ranked in this tournament
            </p>
          </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          Settings saved successfully!
        </div>
      )}

      {/* Match Format Configuration */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Match Format</h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '15px' }}>
          Configure how matches are played throughout the tournament
        </p>

        <div className="form-group" style={{ marginBottom: '15px' }}>
          <label className="form-label">Format Type</label>
          <select 
            className="input"
            value={matchFormat}
            onChange={(e) => setMatchFormat(e.target.value as 'matchplay' | 'set_play')}
          >
            <option value="matchplay">Match Play (First to X legs)</option>
            <option value="set_play">Set Play (Best of X sets)</option>
          </select>
        </div>

        {matchFormat === 'matchplay' && (
          <>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Play Style</label>
              <select 
                className="input"
                value={playStyle}
                onChange={(e) => setPlayStyle(e.target.value as 'play_all' | 'best_of')}
              >
                <option value="best_of">Best Of (First to win majority)</option>
                <option value="play_all">Play All (All games must be played)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                {playStyle === 'best_of' ? 'Best of X games' : 'Total games to play'}
              </label>
              <input
                type="number"
                className="input"
                value={legsPerMatch}
                onChange={(e) => setLegsPerMatch(parseInt(e.target.value) || 1)}
                min="1"
                max="21"
              />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                {playStyle === 'best_of' 
                  ? `First player to win ${Math.ceil(legsPerMatch / 2)} games wins the match`
                  : `All ${legsPerMatch} games will be played regardless of score`
                }
              </p>
            </div>
          </>
        )}

        {matchFormat === 'set_play' && (
          <>
            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">Play Style</label>
              <select 
                className="input"
                value={playStyle}
                onChange={(e) => setPlayStyle(e.target.value as 'play_all' | 'best_of')}
              >
                <option value="best_of">Best Of (First to win majority of sets)</option>
                <option value="play_all">Play All (All sets must be played)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '15px' }}>
              <label className="form-label">
                {playStyle === 'best_of' ? 'Best of X sets' : 'Total sets to play'}
              </label>
              <input
                type="number"
                className="input"
                value={setsPerMatch}
                onChange={(e) => setSetsPerMatch(parseInt(e.target.value) || 1)}
                min="1"
                max="11"
              />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                {playStyle === 'best_of' 
                  ? `First player to win ${Math.ceil(setsPerMatch / 2)} sets wins the match`
                  : `All ${setsPerMatch} sets will be played regardless of score`
                }
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Legs per set</label>
              <input
                type="number"
                className="input"
                value={legsPerSet}
                onChange={(e) => setLegsPerSet(parseInt(e.target.value) || 1)}
                min="1"
                max="21"
              />
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
                Each set is played as best of {legsPerSet} legs (first to {Math.ceil(legsPerSet / 2)} legs wins the set)
              </p>
            </div>
          </>
        )}
      </div>

      {/* Board Assignments */}
      {boards.length > 0 && groups.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Grid size={20} />
            Board Assignments
          </h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '15px' }}>
            Assign physical boards to groups for round robin matches
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {boards.map(board => (
              <div key={board.id} style={{ padding: '15px', border: '1px solid #334155', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Board {board.board_number}</div>
                <select
                  className="input"
                  value={boardGroupAssignments[board.id] || ''}
                  onChange={(e) => setBoardGroupAssignments(prev => ({
                    ...prev,
                    [board.id]: e.target.value
                  }))}
                >
                  <option value="">Unassigned</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.player_ids.length} players)
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary Scoring Metric */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Primary Scoring Metric
          <span 
            title="How players are ranked in the standings"
            style={{ 
              cursor: 'help',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(102, 126, 234, 0.2)'
            }}
          >
            <Info size={14} />
          </span>
        </h3>
        
        <div style={{ display: 'grid', gap: '10px' }}>
          <label className="radio-label" style={{ padding: '15px', border: '2px solid ' + (primaryMetric === 'match_wins' ? '#667eea' : '#334155'), borderRadius: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              value="match_wins"
              checked={primaryMetric === 'match_wins'}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              style={{ marginRight: '10px' }}
            />
            <strong>Match Wins</strong> - Players ranked by total matches won
          </label>
          
          <label className="radio-label" style={{ padding: '15px', border: '2px solid ' + (primaryMetric === 'leg_wins' ? '#667eea' : '#334155'), borderRadius: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              value="leg_wins"
              checked={primaryMetric === 'leg_wins'}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              style={{ marginRight: '10px' }}
            />
            <strong>Leg Wins</strong> - Players ranked by total legs won
          </label>
          
          <label className="radio-label" style={{ padding: '15px', border: '2px solid ' + (primaryMetric === 'tournament_points' ? '#667eea' : '#334155'), borderRadius: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              value="tournament_points"
              checked={primaryMetric === 'tournament_points'}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              style={{ marginRight: '10px' }}
            />
            <strong>Tournament Points</strong> - Points awarded per match result (configurable below)
          </label>
        </div>
      </div>

      {/* Tournament Points */}
      {primaryMetric === 'tournament_points' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Tournament Points System</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Points for Win</label>
              <input
                type="number"
                value={pointsForWin}
                onChange={(e) => setPointsForWin(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="input"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Points for Draw</label>
              <input
                type="number"
                value={pointsForDraw}
                onChange={(e) => setPointsForDraw(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="input"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Points for Loss</label>
              <input
                type="number"
                value={pointsForLoss}
                onChange={(e) => setPointsForLoss(e.target.value === '' ? 0 : parseInt(e.target.value))}
                className="input"
                min="0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tiebreaker Rules */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Tiebreaker Rules
          <span 
            title="Order of rules to determine ranking when players are tied on primary metric"
            style={{ 
              cursor: 'help',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: 'rgba(102, 126, 234, 0.2)'
            }}
          >
            <Info size={14} />
          </span>
        </h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '15px' }}>
          Define the order of tiebreaker rules when players have equal primary scores
        </p>

        <div style={{ marginBottom: '15px' }}>
          {tiebreakOrder.map((rule, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderRadius: '8px',
                marginBottom: '8px'
              }}
            >
              <span style={{ fontWeight: 'bold', minWidth: '30px' }}>{index + 1}.</span>
              <span style={{ flex: 1 }}>{getTiebreakLabel(rule)}</span>
              <button
                onClick={() => moveTiebreakerUp(index)}
                className="button button-secondary"
                disabled={index === 0}
                style={{ padding: '5px 10px' }}
                title="Move up"
              >
                <ArrowUp size={16} />
              </button>
              <button
                onClick={() => moveTiebreakerDown(index)}
                className="button button-secondary"
                disabled={index === tiebreakOrder.length - 1}
                style={{ padding: '5px 10px' }}
                title="Move down"
              >
                <ArrowDown size={16} />
              </button>
              <button
                onClick={() => removeTiebreaker(index)}
                className="button button-danger"
                style={{ padding: '5px 10px' }}
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div>
          <label className="form-label">Add Tiebreaker Rule</label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {(['leg_difference', 'head_to_head', 'legs_won', 'legs_lost', 'match_wins'] as const).map((rule) => (
              <button
                key={rule}
                onClick={() => addTiebreaker(rule)}
                className="button button-secondary"
                disabled={tiebreakOrder.includes(rule)}
                style={{ opacity: tiebreakOrder.includes(rule) ? 0.5 : 1 }}
              >
                {getTiebreakLabel(rule)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleSave}
          className="button button-success button-large"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
