import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { TournamentService } from '@/services/api';
import { Tournament } from '@/types';
import { Settings as SettingsIcon, Info, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';

const Settings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
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
    if (!id) return;
    try {
      setLoading(true);
      const data = await TournamentService.getTournament(id);
      setTournament(data);
      
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

  const handleSave = async () => {
    if (!id) return;
    
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      await TournamentService.updateTournament(id, {
        scoring_system: {
          primary_metric: primaryMetric,
          points_for_win: pointsForWin,
          points_for_draw: pointsForDraw,
          points_for_loss: pointsForLoss,
          tiebreak_order: tiebreakOrder
        }
      });
      
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
  );
};

export default Settings;
