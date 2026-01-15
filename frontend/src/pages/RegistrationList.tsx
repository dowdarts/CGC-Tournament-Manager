import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TournamentService, PlayerService, GroupService, MatchService } from '@/services/api';
import { Player, Tournament, Group } from '@/types';
import GroupConfiguration from '@/components/GroupConfiguration';
import MatchFormatModal from '@/components/MatchFormatModal';
import { Users, Trash2, Shuffle, Grid, Play } from 'lucide-react';
import { 
  distributePlayersIntoGroups, 
  generateGroupStageMatches, 
  calculateGroupDistribution 
} from '@/utils/roundRobin';

const RegistrationList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [shuffling, setShuffling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);
  const [advancementCount, setAdvancementCount] = useState(2);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [playersData, tournamentData, groupsData] = await Promise.all([
        PlayerService.getPlayers(id),
        TournamentService.getTournament(id),
        GroupService.getGroups(id)
      ]);
      // Filter for paid players only and sort by seed_ranking
      const paidPlayers = playersData.filter(p => p.paid);
      paidPlayers.sort((a, b) => (a.seed_ranking || 999) - (b.seed_ranking || 999));
      setPlayers(paidPlayers);
      setTournament(tournamentData);
      setGroups(groupsData);
    } catch (err) {
      setError('Failed to load registration list');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const handleShufflePlayers = async () => {
    if (!id || !tournament) return;
    
    setShuffling(true);
    try {
      // Create array of seed rankings and shuffle them
      const seedRankings = Array.from({ length: players.length }, (_, i) => i + 1);
      const shuffledSeeds = seedRankings.sort(() => Math.random() - 0.5);
      
      // Update each player's seed_ranking in the database
      for (let i = 0; i < players.length; i++) {
        await PlayerService.updatePlayer(players[i].id, {
          seed_ranking: shuffledSeeds[i]
        });
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      loadData(); // Reload to show new seed rankings
    } catch (err) {
      setError('Failed to shuffle players');
      console.error(err);
    } finally {
      setShuffling(false);
    }
  };

  const handleGenerateGroups = async () => {
    if (!id || !tournament || !tournament.num_groups) return;
    
    setGenerating(true);
    try {
      // Delete existing groups first (regenerate from scratch)
      await GroupService.deleteGroups(id);
      
      // Clear group_id from all players
      for (const player of players) {
        await PlayerService.updatePlayer(player.id, {
          group_id: null
        });
      }
      
      // Sort players by seed ranking
      const sortedPlayers = [...players].sort((a, b) => {
        const seedA = a.seed_ranking || 999;
        const seedB = b.seed_ranking || 999;
        return seedA - seedB;
      });
      
      // Get entity list (players or teams)
      const entities = tournament.game_type === 'doubles' 
        ? getTeamEntities() 
        : sortedPlayers.map(p => ({ id: p.id, name: p.name }));
      
      // Distribute into balanced groups using snake draft
      const numGroups = tournament.num_groups;
      const groups = distributePlayersIntoGroups(entities, numGroups, false); // Don't shuffle, use seed order
      
      // Create groups in database and assign players
      const groupLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < groups.length; i++) {
        // Create the group and get its ID
        const createdGroup = await GroupService.createGroup({
          tournament_id: id,
          name: `Group ${groupLetters[i]}`,
          player_ids: groups[i].map(p => p.id)
        });
        
        // Update each player with the actual group UUID
        for (const player of groups[i]) {
          await PlayerService.updatePlayer(player.id, {
            group_id: createdGroup.id
          });
        }
      }
      
      // Mark groups as generated and save advancement rules
      await TournamentService.updateTournament(id, {
        groups_generated: true,
        advancement_rules: `Top ${advancementCount} from each group advance to knockout bracket`
      });
      
      console.log(`Created ${numGroups} groups:`);
      groups.forEach((group, idx) => {
        console.log(`Group ${groupLetters[idx]}: ${group.map(p => p.name).join(', ')}`);
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      
      // Reload data to fetch the created groups
      await loadData();
      console.log('Groups loaded:', groups.length);
    } catch (err) {
      setError('Failed to generate groups');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateGroupStage = () => {
    // Show format modal instead of generating immediately
    setShowFormatModal(true);
  };

  const handleFormatConfirm = async (formatConfig: {
    match_format: 'matchplay' | 'set_play';
    play_style?: 'play_all' | 'best_of';
    legs_per_match?: number;
    legs_per_set?: number;
    sets_per_match?: number;
  }) => {
    if (!id || !tournament || !tournament.num_groups) return;
    
    setShowFormatModal(false);
    setGenerating(true);
    
    try {
      // Update tournament with round-robin format configuration
      const updatedScoringSystem = {
        ...tournament.scoring_system,
        roundrobin_format: formatConfig.match_format,
        roundrobin_play_style: formatConfig.play_style,
        roundrobin_legs_per_match: formatConfig.legs_per_match,
        roundrobin_legs_per_set: formatConfig.legs_per_set,
        roundrobin_sets_per_match: formatConfig.sets_per_match
      };

      await TournamentService.updateTournament(id, {
        scoring_system: updatedScoringSystem
      });

      // Get groups from database
      const dbGroups = await GroupService.getGroups(id);
      
      if (dbGroups.length === 0) {
        throw new Error('No groups found. Please generate groups first.');
      }

      // Load board assignments from localStorage
      const savedAssignments = localStorage.getItem(`board-assignments-${id}`);
      const boardAssignments: Record<string, string> = savedAssignments 
        ? JSON.parse(savedAssignments) 
        : {};
      
      // Calculate boards per group based on assignments
      const groupBoardCounts = new Map<string, number>();
      dbGroups.forEach(group => {
        groupBoardCounts.set(group.id, 0);
      });
      
      // Count assigned boards for each group
      Object.values(boardAssignments).forEach(groupId => {
        if (groupId && groupBoardCounts.has(groupId)) {
          groupBoardCounts.set(groupId, groupBoardCounts.get(groupId)! + 1);
        }
      });
      
      // Prepare groups for round-robin generation with board allocation
      const groupsForMatches = dbGroups.map(group => {
        return players
          .filter(p => group.player_ids.includes(p.id))
          .map(p => ({ id: p.id, name: p.name }));
      });
      
      // Generate boards array for each group
      const boardsPerGroup = dbGroups.map(group => {
        const assignedBoards = groupBoardCounts.get(group.id) || 0;
        // If no boards assigned, use optimal calculation
        if (assignedBoards === 0) {
          const groupSize = groupsForMatches[dbGroups.indexOf(group)].length;
          return groupSize <= 3 ? 1 : groupSize <= 6 ? 2 : Math.floor(groupSize / 2);
        }
        return assignedBoards;
      });
      
      const allMatches = generateGroupStageMatches(groupsForMatches, boardsPerGroup);
      
      console.log('Generated Group Stage:');
      console.log('Match Format:', formatConfig.match_format);
      if (formatConfig.match_format === 'matchplay') {
        console.log(`Legs Per Match: ${formatConfig.legs_per_match}, Play Style: ${formatConfig.play_style}`);
      } else {
        console.log(`Legs Per Set: ${formatConfig.legs_per_set}, Sets Per Match: ${formatConfig.sets_per_match}`);
      }
      
      // Create matches in database
      for (const { groupIndex, groupLetter, matches } of allMatches) {
        const dbGroup = dbGroups[groupIndex];
        
        console.log(`\nGroup ${groupLetter}: Creating ${matches.length} matches`);
        
        for (const match of matches) {
          await MatchService.createMatch({
            tournament_id: id,
            player1_id: match.player1_id!,
            player2_id: match.player2_id!,
            group_id: dbGroup.id,
            status: 'scheduled',
            player1_legs: 0,
            player2_legs: 0,
            legs_to_win: formatConfig.match_format === 'matchplay' 
              ? (formatConfig.play_style === 'best_of' ? Math.ceil((formatConfig.legs_per_match || 11) / 2) : (formatConfig.legs_per_match || 11))
              : (formatConfig.legs_per_set || 3),
            sets_to_win: formatConfig.match_format === 'set_play' 
              ? Math.ceil((formatConfig.sets_per_match || 5) / 2) 
              : 0,
            current_set: 1,
            round_number: match.round,
            board_number: match.board
          });
        }
      }
      
      // Mark group stage as created
      await TournamentService.updateTournament(id, {
        group_stage_created: true
      });
      
      console.log('✅ Group stage matches created successfully');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      
      // Navigate to Group Stage tab
      setTimeout(() => {
        navigate(`/tournament/${id}/groups`);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group stage');
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  // Helper function to get team entities for doubles tournaments
  const getTeamEntities = () => {
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
    
    const entities: { id: string; name: string }[] = [];
    
    // Add teams
    Object.entries(teams).forEach(([teamId, teamPlayers]) => {
      const teamName = teamPlayers.map(p => p.name).join(' & ');
      entities.push({ id: teamId, name: teamName });
    });
    
    // Add solo players
    soloPlayers.forEach(player => {
      entities.push({ id: player.id, name: player.name });
    });
    
    return entities;
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`Remove ${playerName} from the tournament? This will also remove them from any matches.`)) return;
    if (!id) return;

    try {
      await PlayerService.deletePlayer(playerId);
      loadData();
    } catch (err) {
      setError('Failed to delete player');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="alert alert-info">Loading registration list...</div>;
  }

  if (!tournament) {
    return <div className="alert alert-danger">Tournament not found</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h2>Main Tournament Registration List</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px' }}>
          All registered and paid players/teams. Configure groups below when ready to start the tournament.
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          Configuration saved successfully!
        </div>
      )}

      {/* Registered Players List */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>
          <Users size={20} style={{ display: 'inline', marginRight: '8px' }} />
          Registered {tournament.game_type === 'doubles' ? 'Teams' : 'Players'} ({tournament.game_type === 'doubles' ? 
            Object.keys(players.reduce((acc, p) => { if (p.team_id) acc[p.team_id] = true; return acc; }, {} as Record<string, boolean>)).length + players.filter(p => !p.team_id).length :
            players.length})
        </h3>

        {players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <p>No paid players registered yet</p>
            <p style={{ fontSize: '14px', marginTop: '10px' }}>
              Players will appear here after being marked as paid in the Check-in List
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
            {tournament.game_type === 'doubles' ? (
              // Render teams for doubles
              (() => {
                // Group players by team_id
                const teams: { [key: string]: Player[] } = {};
                const soloPlayers: Player[] = [];
                let teamCounter = 0;
                
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
                    {Object.entries(teams).map(([teamId, teamPlayers]) => {
                      teamCounter++;
                      return (
                        <div
                          key={teamId}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '15px',
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            border: '1px solid #334155'
                          }}
                        >
                          <div>
                            <div style={{
                              display: 'inline-block',
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              backgroundColor: '#667eea',
                              color: '#fff',
                              textAlign: 'center',
                              lineHeight: '30px',
                              marginRight: '10px',
                              fontWeight: 'bold'
                            }}>
                              {teamCounter}
                            </div>
                            <span style={{ 
                              fontWeight: 'bold',
                              color: '#3b82f6',
                              fontSize: '13px'
                            }}>TEAM</span>
                            {teamPlayers.map((player, idx) => (
                              <div key={player.id} style={{ marginLeft: '40px', marginTop: '8px' }}>
                                <div style={{ fontWeight: 'bold' }}>
                                  {idx + 1}. {player.name}
                                </div>
                                {player.email && (
                                  <div style={{ 
                                    fontSize: '12px', 
                                    color: '#94a3b8',
                                    marginTop: '3px'
                                  }}>
                                    {player.email}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => {
                              if (confirm(`Remove entire team from tournament?`)) {
                                teamPlayers.forEach(p => handleDeletePlayer(p.id, p.name));
                              }
                            }}
                            className="button button-danger"
                            title="Remove team"
                            style={{ padding: '8px 12px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}

                    {/* Render Solo Players */}
                    {soloPlayers.map((player) => {
                      teamCounter++;
                      return (
                        <div
                          key={player.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '15px',
                            backgroundColor: '#1e293b',
                            borderRadius: '8px',
                            border: '1px solid #334155'
                          }}
                        >
                          <div>
                            <div style={{ 
                              display: 'inline-block',
                              width: '30px',
                              height: '30px',
                              borderRadius: '50%',
                              backgroundColor: '#667eea',
                              color: '#fff',
                              textAlign: 'center',
                              lineHeight: '30px',
                              marginRight: '10px',
                              fontWeight: 'bold'
                            }}>
                              {teamCounter}
                            </div>
                            <span style={{ fontWeight: 'bold' }}>{player.name}</span>
                            {player.email && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#94a3b8',
                                marginLeft: '40px',
                                marginTop: '5px'
                              }}>
                                {player.email}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeletePlayer(player.id, player.name)}
                            className="button button-danger"
                            title="Remove player"
                            style={{ padding: '8px 12px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </>
                );
              })()
            ) : (
              // Render individual players for singles
              players.map((player, index) => (
                <div
                  key={player.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '15px',
                    backgroundColor: '#1e293b',
                    borderRadius: '8px',
                    border: '1px solid #334155'
                  }}
                >
                  <div>
                    <div style={{ 
                      display: 'inline-block',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#667eea',
                      color: '#fff',
                      textAlign: 'center',
                      lineHeight: '30px',
                      marginRight: '10px',
                      fontWeight: 'bold'
                    }}>
                      {index + 1}
                    </div>
                    <span style={{ fontWeight: 'bold' }}>{player.name}</span>
                    {player.email && (
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#94a3b8',
                        marginLeft: '40px',
                        marginTop: '5px'
                      }}>
                        {player.email}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeletePlayer(player.id, player.name)}
                    className="button button-danger"
                    title="Remove player"
                    style={{ padding: '8px 12px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Group Configuration Section */}
      {players.length > 0 && (
        <>
          <GroupConfiguration
            tournament={tournament}
            players={players}
            onAdvancementChange={setAdvancementCount}
          />

          {/* Display Generated Groups */}
          {groups.length > 0 && (
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '15px' }}>Generated Groups</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {groups.map((group) => {
                  const groupPlayers = players.filter(p => group.player_ids.includes(p.id));
                  // Sort by seed ranking to show advancing players at top
                  groupPlayers.sort((a, b) => (a.seed_ranking || 999) - (b.seed_ranking || 999));
                  
                  // Get advancement count from tournament
                  const getAdvancementCount = () => {
                    const match = tournament.advancement_rules?.match(/Top (\d+)/);
                    return match ? parseInt(match[1]) : 2;
                  };
                  const advancingCount = tournament.format === 'group-knockout' ? getAdvancementCount() : 0;
                  
                  return (
                    <div
                      key={group.id}
                      style={{
                        padding: '15px',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderRadius: '8px',
                        border: '2px solid rgba(102, 126, 234, 0.3)'
                      }}
                    >
                      <h4 style={{ marginBottom: '10px', color: '#667eea' }}>{group.name}</h4>
                      <div>
                        {groupPlayers.map((player, idx) => {
                          const isAdvancing = tournament.format === 'group-knockout' && idx < advancingCount;
                          return (
                            <div
                              key={player.id}
                              style={{
                                padding: '8px',
                                marginBottom: '5px',
                                backgroundColor: isAdvancing ? 'rgba(52, 211, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                borderRadius: '4px',
                                border: isAdvancing ? '2px solid rgba(52, 211, 153, 0.5)' : 'none'
                              }}
                            >
                              <span style={{ fontWeight: 'bold' }}>#{player.seed_ranking || idx + 1}</span> {player.name}
                              {isAdvancing && <span style={{ color: '#34d399', marginLeft: '8px', fontSize: '12px' }}>✓ Advances</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="card" style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '15px' }}>Group Configuration Actions</h3>
            <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
              Shuffle players for random distribution, generate groups based on configuration, and create the group stage matches.
            </p>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={handleShufflePlayers}
                className="button button-secondary"
                disabled={shuffling || generating}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Shuffle size={18} />
                {shuffling ? 'Shuffling...' : 'Shuffle Players'}
              </button>

              <button
                onClick={handleGenerateGroups}
                className="button button-primary"
                disabled={!tournament.num_groups || shuffling || generating}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Grid size={18} />
                {generating ? 'Generating...' : 'Generate Groups'}
              </button>

              <button
                onClick={handleGenerateGroupStage}
                className="button button-success button-large"
                disabled={!tournament.groups_generated || shuffling || generating}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Play size={18} />
                {generating ? 'Creating...' : 'Generate Group Stage'}
              </button>
            </div>

            {!tournament.num_groups && (
              <p style={{ color: '#f59e0b', marginTop: '15px', fontSize: '14px' }}>
                ⚠️ Configure number of groups above before generating
              </p>
            )}

            {tournament.num_groups && !tournament.groups_generated && (
              <p style={{ color: '#60a5fa', marginTop: '15px', fontSize: '14px' }}>
                ℹ️ Click "Generate Groups" to assign players to groups
              </p>
            )}

            {tournament.groups_generated && !tournament.group_stage_created && (
              <p style={{ color: '#34d399', marginTop: '15px', fontSize: '14px' }}>
                ✅ Groups ready! Click "Generate Group Stage" to create matches
              </p>
            )}
          </div>
        </>
      )}

      <MatchFormatModal
        isOpen={showFormatModal}
        onClose={() => setShowFormatModal(false)}
        onConfirm={handleFormatConfirm}
        stage="roundrobin"
        title="Configure Round Robin Format"
      />
    </div>
  );
};

export default RegistrationList;
