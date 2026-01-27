import React, { useState } from 'react';
import { Tournament } from '@/types';
import { Save, ArrowUp, ArrowDown, Trash2, Info } from 'lucide-react';

interface PostRoundRobinConfigProps {
  tournament: Tournament;
  onSave: (config: { 
    advancement_count: number; 
    tiebreak_order: string[];
    primary_metric: 'match_wins' | 'leg_wins' | 'tournament_points';
    points_for_win: number;
    points_for_draw: number;
    points_for_loss: number;
  }) => void;
  onCancel: () => void;
}

const PostRoundRobinConfig: React.FC<PostRoundRobinConfigProps> = ({ tournament, onSave, onCancel }) => {
  const numGroups = tournament.num_groups || 4;
  
  // Scoring system
  const [primaryMetric, setPrimaryMetric] = useState<'match_wins' | 'leg_wins' | 'tournament_points'>('leg_wins');
  const [pointsForWin, setPointsForWin] = useState(3);
  const [pointsForDraw, setPointsForDraw] = useState(1);
  const [pointsForLoss, setPointsForLoss] = useState(0);
  
  // Advancement count per group - parse from tournament rules
  const getAdvancementCount = (): number => {
    if (tournament.advancement_rules) {
      const match = tournament.advancement_rules.match(/Top (\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return 2; // Default fallback
  };
  
  const advancePlayers = getAdvancementCount();
  
  // Tiebreaker rules - default order based on user request
  const [tiebreakOrder, setTiebreakOrder] = useState<('leg_difference' | 'head_to_head' | 'legs_won' | 'legs_lost' | 'match_wins')[]>([
    'legs_won',
    'head_to_head', 
    'leg_difference'
  ]);

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

  const handleSave = () => {
    onSave({
      advancement_count: advancePlayers,
      tiebreak_order: tiebreakOrder,
      primary_metric: primaryMetric,
      points_for_win: pointsForWin,
      points_for_draw: pointsForDraw,
      points_for_loss: pointsForLoss
    });
  };

  const totalAdvancing = numGroups * advancePlayers;

  return (
    <div className="card" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '10px' }}>Configure Knockout Bracket</h2>
      <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '25px' }}>
        The group stage is complete. Configure scoring metrics and tiebreaker rules for knockout bracket seeding.
      </p>

      {/* Scoring System */}
      <div style={{ marginBottom: '30px' }}>
        <label className="form-label">Primary Scoring Metric</label>
        <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
          How should players be ranked in group standings?
        </p>
        <div style={{ display: 'grid', gap: '10px' }}>
          <label style={{ padding: '12px', border: '2px solid ' + (primaryMetric === 'leg_wins' ? '#667eea' : '#334155'), borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              value="leg_wins"
              checked={primaryMetric === 'leg_wins'}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>Leg Wins (Recommended)</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Players ranked by total legs won
              </div>
            </div>
          </label>
          
          <label style={{ padding: '12px', border: '2px solid ' + (primaryMetric === 'match_wins' ? '#667eea' : '#334155'), borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              value="match_wins"
              checked={primaryMetric === 'match_wins'}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>Match Wins</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Players ranked by total matches won
              </div>
            </div>
          </label>
          
          <label style={{ padding: '12px', border: '2px solid ' + (primaryMetric === 'tournament_points' ? '#667eea' : '#334155'), borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              value="tournament_points"
              checked={primaryMetric === 'tournament_points'}
              onChange={(e) => setPrimaryMetric(e.target.value as any)}
              style={{ marginRight: '10px' }}
            />
            <div>
              <strong>Tournament Points</strong>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                Points awarded per match result (custom points system)
              </div>
            </div>
          </label>
        </div>

        {primaryMetric === 'tournament_points' && (
          <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
            <label className="form-label" style={{ marginBottom: '10px' }}>Points System</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Win</label>
                <input
                  type="number"
                  value={pointsForWin}
                  onChange={(e) => setPointsForWin(parseInt(e.target.value) || 0)}
                  className="input"
                  min="0"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Draw</label>
                <input
                  type="number"
                  value={pointsForDraw}
                  onChange={(e) => setPointsForDraw(parseInt(e.target.value) || 0)}
                  className="input"
                  min="0"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>Loss</label>
                <input
                  type="number"
                  value={pointsForLoss}
                  onChange={(e) => setPointsForLoss(parseInt(e.target.value) || 0)}
                  className="input"
                  min="0"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tiebreaker Rules */}
      <div style={{ marginBottom: '30px' }}>
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Tiebreaker Rules
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
        </label>
        <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '15px' }}>
          Define the priority order for breaking ties in group standings
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
        <button
          onClick={handleSave}
          className="button button-success"
          disabled={tiebreakOrder.length === 0}
        >
          <Save size={18} style={{ marginRight: '8px' }} />
          Save & Continue to Bracket
        </button>
        <button
          onClick={onCancel}
          className="button button-secondary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PostRoundRobinConfig;
