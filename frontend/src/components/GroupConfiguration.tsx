import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '@/types';
import { Users } from 'lucide-react';

interface GroupConfigurationProps {
  tournament: Tournament;
  players: Player[];
  onAdvancementChange?: (count: number) => void;
}

const GroupConfiguration: React.FC<GroupConfigurationProps> = ({ tournament, players, onAdvancementChange }) => {
  const [numGroups, setNumGroups] = useState(tournament.num_groups || 4);
  
  // Extract number from advancement_rules (e.g., "Top 2 from each group..." -> 2)
  const getAdvancementCount = () => {
    const match = tournament.advancement_rules?.match(/Top (\d+)/);
    return match ? parseInt(match[1]) : 2;
  };
  const [advancePlayers, setAdvancePlayers] = useState(getAdvancementCount());
  
  // Track if config has changed
  const [numGroupsChanged, setNumGroupsChanged] = useState(false);
  const [advancementChanged, setAdvancementChanged] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Notify parent when advancement count changes
  React.useEffect(() => {
    if (onAdvancementChange) {
      onAdvancementChange(advancePlayers);
    }
  }, [advancePlayers, onAdvancementChange]);

  const gameType = tournament.game_type || 'singles';
  
  // For doubles, count teams instead of individual players
  const getEntityCount = () => {
    if (gameType === 'doubles') {
      // Group players by team_id to count teams
      const teams = new Set<string>();
      let soloPlayers = 0;
      
      players.forEach(player => {
        if (player.team_id) {
          teams.add(player.team_id);
        } else {
          soloPlayers++;
        }
      });
      
      return teams.size + soloPlayers;
    }
    return players.length;
  };
  
  const entityCount = getEntityCount();
  const entityLabel = gameType === 'doubles' ? 'teams' : 'players';
  const validGroupSizes = [2, 4, 8, 16, 32];

  // Calculate group distribution
  const calculateDistribution = () => {
    if (entityCount === 0) return { distribution: [], entitiesPerGroup: 0, groupsWithExtra: 0, groupsWithBase: 0 };

    const entitiesPerGroup = Math.floor(entityCount / numGroups);
    const remainder = entityCount % numGroups;

    // Distribute remainder evenly: first 'remainder' groups get +1 entity
    const groupsWithExtra = remainder; // Groups that get entitiesPerGroup + 1
    const groupsWithBase = numGroups - remainder; // Groups that get entitiesPerGroup

    const distribution = [];
    for (let i = 0; i < numGroups; i++) {
      if (i < remainder) {
        distribution.push(entitiesPerGroup + 1);
      } else {
        distribution.push(entitiesPerGroup);
      }
    }

    return { distribution, entitiesPerGroup, groupsWithExtra, groupsWithBase };
  };

  const dist = calculateDistribution();

  if (entityCount === 0) {
    return (
      <div className="alert alert-info">
        Add {gameType === 'doubles' ? 'teams' : 'players'} first before configuring groups
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
        <strong>{entityCount} {entityLabel} registered</strong> {gameType === 'doubles' && `(${players.length} players total)`}
      </div>

      <div className="form-group">
        <label className="form-label">Number of Groups</label>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {validGroupSizes.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => {
                setNumGroups(size);
                setNumGroupsChanged(size !== tournament.num_groups);
              }}
              className={`button ${numGroups === size ? 'button-primary' : 'button-secondary'}`}
              disabled={size > entityCount}
            >
              {size} Groups
            </button>
          ))}
        </div>
        {numGroupsChanged && (
          <button
            onClick={async () => {
              setUpdating(true);
              try {
                const { TournamentService, GroupService, PlayerService } = await import('@/services/api');
                
                // Delete existing groups
                await GroupService.deleteGroups(tournament.id);
                
                // Clear group_id from all players
                for (const player of players) {
                  await PlayerService.updatePlayer(player.id, { group_id: null });
                }
                
                // Update tournament with new num_groups and mark groups as not generated
                await TournamentService.updateTournament(tournament.id, {
                  num_groups: numGroups,
                  groups_generated: false
                });
                
                // Reload page data to reflect changes
                window.location.reload();
              } catch (err) {
                console.error('Failed to update group config:', err);
                setUpdating(false);
              }
            }}
            className="button button-warning"
            disabled={updating}
            style={{ marginTop: '10px', width: '100%' }}
          >
            {updating ? 'Updating...' : 'Update Group Config (Will Clear Existing Groups)'}
          </button>
        )}
        <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
          {numGroupsChanged ? 'Click "Update Group Config" to apply changes and regenerate groups' : 'Select number of groups, then generate to create groups'}
        </p>
      </div>

      <div className="card" style={{ backgroundColor: '#0f172a', padding: '15px', marginTop: '15px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#94a3b8' }}>Group Distribution (Balanced):</h4>
        {dist.distribution.length > 0 ? (
          <>
            <p style={{ marginBottom: '8px', color: '#e2e8f0' }}>
              {dist.groupsWithBase > 0 && (
                <span><strong>{dist.groupsWithBase}</strong> groups of <strong>{dist.entitiesPerGroup}</strong> {entityLabel}</span>
              )}
              {dist.groupsWithExtra > 0 && (
                <span>
                  {dist.groupsWithBase > 0 ? ', ' : ''}
                  <strong>{dist.groupsWithExtra}</strong> {dist.groupsWithExtra === 1 ? 'group' : 'groups'} of <strong>{dist.entitiesPerGroup + 1}</strong> {entityLabel}
                </span>
              )}
            </p>
            <p style={{ fontSize: '12px', color: '#60a5fa', marginBottom: '10px' }}>
              ✓ Fair distribution: No group differs by more than 1 {entityLabel === 'teams' ? 'team' : 'player'}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              {dist.distribution.map((count, idx) => {
                // Convert index to letter: 0->A, 1->B, etc.
                const groupLetter = String.fromCharCode(65 + idx);
                return (
                  <div key={idx} className="badge badge-primary" style={{ 
                    padding: '8px 12px',
                    fontSize: '14px',
                    backgroundColor: count === dist.entitiesPerGroup + 1 ? '#667eea' : '#475569'
                  }}>
                    Group {groupLetter}: {count} {entityLabel}
                  </div>
                );
              })}
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
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setAdvancePlayers(value);
              setAdvancementChanged(value !== getAdvancementCount());
            }}
            className="input"
          >
            <option value="1">Top 1</option>
            <option value="2">Top 2</option>
            <option value="3">Top 3</option>
            <option value="4">Top 4</option>
          </select>
          {advancementChanged && (
            <button
              onClick={async () => {
                setUpdating(true);
                try {
                  const { TournamentService } = await import('@/services/api');
                  await TournamentService.updateTournament(tournament.id, {
                    advancement_rules: `Top ${advancePlayers} from each group advance to knockout bracket`
                  });
                  // Reload to show updated highlights
                  window.location.reload();
                } catch (err) {
                  console.error('Failed to update advancement:', err);
                  setUpdating(false);
                }
              }}
              className="button button-success"
              disabled={updating}
              style={{ marginTop: '10px', width: '100%' }}
            >
              {updating ? 'Updating...' : 'Update Group Config (No Regeneration)'}
            </button>
          )}
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '5px' }}>
            {advancementChanged 
              ? 'Click "Update Group Config" to change advancement without regenerating groups' 
              : `This will create a ${numGroups * advancePlayers}-player knockout bracket`}
          </p>
        </div>
      )}
    </div>
  );
};

export default GroupConfiguration;
