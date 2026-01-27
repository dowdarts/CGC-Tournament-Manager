import React, { useState, useEffect } from 'react';
import { Tournament, Player } from '@/types';
import { Users } from 'lucide-react';

interface GroupConfigurationProps {
  tournament: Tournament;
  players: Player[];
}

const GroupConfiguration: React.FC<GroupConfigurationProps> = ({ tournament, players }) => {
  const [numGroups, setNumGroups] = useState(tournament.num_groups || 4);
  
  // Track if config has changed
  const [numGroupsChanged, setNumGroupsChanged] = useState(false);
  const [updating, setUpdating] = useState(false);

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
            
            {/* UPDATE GROUP CONFIG BUTTON */}
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
                  // Update tournament with new num_groups and reset group/stage flags
                  await TournamentService.updateTournament(tournament.id, {
                    num_groups: numGroups,
                    groups_generated: false,
                    group_stage_created: false,
                    group_stage_started: false
                  });
                  // Reload page data to reflect changes
                  window.location.reload();
                } catch (err) {
                  console.error('Failed to update group config:', err);
                  setUpdating(false);
                }
              }}
              className={numGroupsChanged ? "button button-success" : "button button-secondary"}
              disabled={updating}
              style={{ marginTop: '15px', width: '100%' }}
            >
              {updating ? 'Updating...' : 'UPDATE GROUP CONFIG (WILL CLEAR EXISTING GROUPS)'}
            </button>
            <p style={{ fontSize: '12px', color: numGroupsChanged ? '#22c55e' : '#94a3b8', marginTop: '8px' }}>
              {numGroupsChanged ? '⚠️ Click "UPDATE GROUP CONFIG" to apply changes and regenerate groups' : 'Select number of groups, then generate to create groups'}
            </p>
          </>
        ) : (
          <p style={{ color: '#94a3b8' }}>Select number of groups</p>
        )}
      </div>
    </div>
  );
};

export default GroupConfiguration;
