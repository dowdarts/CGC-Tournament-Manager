import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TournamentService } from '@/services/api';
import { Tournament } from '@/types';
import { Save, ArrowRight, Info, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

const BasicInfo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  
  // Basic info
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    format: 'group-knockout' as const,
    game_type: 'singles' as const,
    registration_enabled: true
  });

  // Scoring configuration (determined at setup)
  const [primaryMetric, setPrimaryMetric] = useState<'match_wins' | 'leg_wins' | 'tournament_points'>('match_wins');
  const [pointsForWin, setPointsForWin] = useState(2);
  const [pointsForDraw, setPointsForDraw] = useState(1);
  const [pointsForLoss, setPointsForLoss] = useState(0);
  const [tiebreakOrder, setTiebreakOrder] = useState<('leg_difference' | 'head_to_head' | 'legs_won' | 'legs_lost' | 'match_wins')[]>(['leg_difference', 'head_to_head']);
  const [helpMode, setHelpMode] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadTournament();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Sync help mode with localStorage
    const syncHelpMode = () => {
      setHelpMode(localStorage.getItem('helpMode') === 'true');
    };
    syncHelpMode();
    const interval = setInterval(syncHelpMode, 100);
    window.addEventListener('storage', syncHelpMode);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncHelpMode);
    };
  }, []);

  const loadTournament = async () => {
    if (!id) return;
    try {
      const data = await TournamentService.getTournament(id);
      setTournament(data);
      setFormData({
        name: data.name,
        date: data.date,
        location: data.location || '',
        format: data.format,
        game_type: data.game_type,
        registration_enabled: data.registration_enabled ?? true
      });
      
      // Load existing scoring config if available
      if (data.scoring_system) {
        setPrimaryMetric(data.scoring_system.primary_metric);
        setPointsForWin(data.scoring_system.points_for_win);
        setPointsForDraw(data.scoring_system.points_for_draw);
        setPointsForLoss(data.scoring_system.points_for_loss);
        setTiebreakOrder(data.scoring_system.tiebreak_order);
      }
    } catch (err) {
      setError('Failed to load tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const tournamentData = {
        ...formData,
        scoring_system: {
          primary_metric: primaryMetric,
          points_for_win: pointsForWin,
          points_for_draw: pointsForDraw,
          points_for_loss: pointsForLoss,
          tiebreak_order: tiebreakOrder
        },
        setup_completed: true
      };

      if (id && id !== 'new') {
        await TournamentService.updateTournament(id, tournamentData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Create new tournament
        const newTournament = await TournamentService.createTournament({
          ...tournamentData,
          num_groups: 1,
          advancement_rules: '',
          tiebreakers: ['legDifference', 'headToHead'],
          status: 'setup'
        });
        navigate(`/tournament/${newTournament.id}/info`);
      }
    } catch (err) {
      setError('Failed to save tournament');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = async () => {
    if (!id) return;
    
    // Save first
    setSaving(true);
    setError(null);

    try {
      await TournamentService.updateTournament(id, {
        ...formData,
        scoring_system: {
          primary_metric: primaryMetric,
          points_for_win: pointsForWin,
          points_for_draw: pointsForDraw,
          points_for_loss: pointsForLoss,
          tiebreak_order: tiebreakOrder
        },
        setup_completed: true
      });
      
      // Navigate to participants tab
      navigate(`/tournament/${id}/checkin`);
    } catch (err) {
      setError('Failed to save tournament');
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
    return <div className="alert alert-info">Loading tournament...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2>Basic Tournament Information</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>
          Configure the basic details of your tournament
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          Tournament updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label className="form-label">Tournament Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            placeholder="e.g., AADS Winter Challenge 2026"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="input"
              placeholder="e.g., The Local Pub"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tournament Format</label>
          <select name="format" value={formData.format} onChange={handleChange} className="input">
            <option value="group-knockout">Group Stage + Knockout Bracket</option>
            <option value="round-robin">Round Robin Only</option>
            <option value="knockout">Knockout Only</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Game Type</label>
          <select 
            name="game_type" 
            value={formData.game_type} 
            onChange={handleChange} 
            className="input"
            disabled={!!tournament}
          >
            <option value="singles">Singles</option>
            <option value="doubles">Doubles (Teams of 2)</option>
          </select>
          {tournament && (
            <p style={{ marginTop: '5px', fontSize: '12px', color: '#f59e0b', fontStyle: 'italic' }}>
              ⚠️ Game type cannot be changed after tournament creation
            </p>
          )}
        </div>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="registration_enabled"
              checked={formData.registration_enabled}
              onChange={handleChange}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <span className="form-label" style={{ marginBottom: 0 }}>
              Enable Public Registration Portal
            </span>
          </label>
          <p style={{ marginTop: '5px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
            Allow players to register themselves via the public registration page
          </p>
        </div>
      </form>

      {/* Scoring Configuration */}
      <div className="card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          Scoring & Match Format
          {helpMode && (
            <span 
              title="Configure how matches are scored and players are ranked"
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
          )}
        </h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Primary Scoring Metric</label>
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
              <strong>Tournament Points</strong> - Points awarded per match result
            </label>
          </div>
        </div>

        {/* Tournament Points */}
        {primaryMetric === 'tournament_points' && (
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">Tournament Points System</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div className="form-group">
                <label className="form-label">Points for Win</label>
                <input
                  type="number"
                  value={pointsForWin}
                  onChange={(e) => setPointsForWin(parseInt(e.target.value))}
                  className="input"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Points for Draw</label>
                <input
                  type="number"
                  value={pointsForDraw}
                  onChange={(e) => setPointsForDraw(parseInt(e.target.value))}
                  className="input"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Points for Loss</label>
                <input
                  type="number"
                  value={pointsForLoss}
                  onChange={(e) => setPointsForLoss(parseInt(e.target.value))}
                  className="input"
                  min="0"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tiebreaker Rules */}
        <div>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Tiebreaker Rules
            {helpMode && (
              <span 
                title="Order of rules to determine ranking when players are tied"
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
            )}
          </label>
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
                  type="button"
                  onClick={() => moveTiebreakerUp(index)}
                  className="button button-secondary"
                  disabled={index === 0}
                  style={{ padding: '5px 10px' }}
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => moveTiebreakerDown(index)}
                  className="button button-secondary"
                  disabled={index === tiebreakOrder.length - 1}
                  style={{ padding: '5px 10px' }}
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
                <button
                  type="button"
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
                  type="button"
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
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={handleSubmit}
          className="button button-primary"
          disabled={saving}
          type="button"
        >
          <Save size={18} style={{ marginRight: '8px' }} />
          {saving ? 'Saving...' : 'Save Setup'}
        </button>

        {tournament && (
          <button
            onClick={handleNextStep}
            className="button button-success button-large"
            disabled={saving}
            type="button"
          >
            {saving ? 'Saving...' : 'Next Step: Add Participants'}
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BasicInfo;
