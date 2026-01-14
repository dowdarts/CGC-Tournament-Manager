import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '@/types';
import { Users } from 'lucide-react';

interface GroupConfigurationProps {
  tournament: Tournament;
  players: Player[];
  onSaveConfiguration: (config: { num_groups: number; advancement_rules: string; game_type: 'singles' | 'doubles' }) => void;
}

const GroupConfiguration: React.FC<GroupConfigurationProps> = ({ tournament, players, onSaveConfiguration }) => {
  const [numGroups, setNumGroups] = useState(4);
  const [gameType, setGameType] = useState<'singles' | 'doubles'>('singles');
  const [advancePlayers, setAdvancePlayers] = useState(2);

  const playerCount = players.length;
  const validGroupSizes = [2, 4, 8, 16, 32];

  // Calculate group distribution
  const calculateDistribution = () => {
    if (playerCount === 0) return { distribution: [], playersPerGroup: 0, evenGroups: 0, extraGroup: 0 };

    const playersPerGroup = Math.floor(playerCount / numGroups);
    const remainder = playerCount % numGroups;

    const evenGroups = numGroups - (remainder > 0 ? 1 : 0);
    const extraGroup = remainder > 0 ? playersPerGroup + remainder : 0;

    const distribution = [];
    for (let i = 0; i < numGroups; i++) {
      if (i === numGroups - 1 && remainder > 0) {
        distribution.push(playersPerGroup + remainder);
      } else {
        distribution.push(playersPerGroup);
      }
    }

    return { distribution, playersPerGroup, evenGroups, extraGroup };
  };

  const dist = calculateDistribution();

  const handleSave = () => {
    const advancementText = `Top ${advancePlayers} from each group advance to knockout bracket`;
    onSaveConfiguration({
      num_groups: numGroups,
      advancement_rules: advancementText,
      game_type: gameType
    });
  };

  if (playerCount === 0) {
    return (
      <div className="alert alert-info">
        Add players first before configuring groups
      </div>
    );
  }

  return (
    <div className="card" style={{ marginTop: '20px' }}>
      <h3 style={{ marginBottom: '15px' }}>
        <Users size={20} style={{ display: 'inline', marginRight: '8px' }} />
        Configure Groups
      </h3>

      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        <strong>{playerCount} players registered</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Game Type</label>
        <select 
          value={gameType} 
          onChange={(e) => setGameType(e.target.value as 'singles' | 'doubles')}
          className="input"
        >
          <option value="singles">Singles</option>
          <option value="doubles">Doubles (Teams of 2)</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Number of Groups</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {validGroupSizes.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => setNumGroups(size)}
              className={`button ${numGroups === size ? 'button-primary' : 'button-secondary'}`}
              disabled={size > playerCount}
            >
              {size} Groups
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ backgroundColor: '#0f172a', padding: '15px', marginTop: '15px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#94a3b8' }}>Group Distribution:</h4>
        {dist.distribution.length > 0 ? (
          <>
            <p style={{ marginBottom: '8px' }}>
              {dist.evenGroups > 0 && (
                <span><strong>{dist.evenGroups}</strong> groups of <strong>{dist.playersPerGroup}</strong> players</span>
              )}
              {dist.extraGroup > 0 && (
                <span>
                  {dist.evenGroups > 0 ? ', ' : ''}
                  <strong>1</strong> group of <strong>{dist.extraGroup}</strong> players
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {dist.distribution.map((count, idx) => (
                <div key={idx} className="badge badge-primary">
                  Group {idx + 1}: {count} players
                </div>
              ))}
            </div>
          </>
        ) : (
          <p style={{ color: '#94a3b8' }}>Select number of groups</p>
        )}
      </div>

      {tournament.format === 'group-knockout' && (
        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">Players advancing from each group to bracket</label>
          <select 
            value={advancePlayers} 
            onChange={(e) => setAdvancePlayers(parseInt(e.target.value))}
            className="input"
          >
            <option value="1">Top 1</option>
            <option value="2">Top 2</option>
            <option value="3">Top 3</option>
            <option value="4">Top 4</option>
          </select>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
            This will create a {numGroups * advancePlayers}-player knockout bracket
          </p>
        </div>
      )}

      <button 
        onClick={handleSave}
        className="button button-success button-large"
        style={{ marginTop: '20px' }}
      >
        Save Group Configuration
      </button>
    </div>
  );
};

export default GroupConfiguration;
