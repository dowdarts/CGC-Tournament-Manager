import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TournamentService, PlayerService, GroupService, MatchService, BoardService } from '@/services/api';
import { Player, Tournament, Group, Board } from '@/types';
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
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardCount, setNewBoardCount] = useState(1);
  const [boardGroupAssignments, setBoardGroupAssignments] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [playersData, tournamentData, groupsData, boardsData] = await Promise.all([
        PlayerService.getPlayers(id),
        TournamentService.getTournament(id),
        GroupService.getGroups(id),
        BoardService.getBoards(id)
      ]);
      // Filter for paid players only and sort by seed_ranking
      const paidPlayers = playersData.filter(p => p.paid);
      paidPlayers.sort((a, b) => (a.seed_ranking || 999) - (b.seed_ranking || 999));
      setPlayers(paidPlayers);
      setTournament(tournamentData);
      setGroups(groupsData);
      setBoards(boardsData);
      
      // Load board assignments from localStorage
      const savedAssignments = localStorage.getItem(`board-assignments-${id}`);
      if (savedAssignments) {
        setBoardGroupAssignments(JSON.parse(savedAssignments));
      } else {
        // Initialize empty assignments for existing boards
        const assignments: Record<string, string> = {};
        boardsData.forEach(board => {
          assignments[board.id] = '';
        });
        setBoardGroupAssignments(assignments);
      }
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
  const handleAddBoards = async () => {
    if (!id || newBoardCount < 1) return;
    
    try {
      await BoardService.createBoards(id, newBoardCount);
      setNewBoardCount(1);
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (error) {
      console.error('Error creating boards:', error);
      setError('Failed to create boards');
    }
  };

  const handleBoardAssignment = (boardId: string, groupId: string) => {
    setBoardGroupAssignments(prev => ({
      ...prev,
      [boardId]: groupId
    }));
  };

  const saveBoardAssignments = async () => {
    if (!id) return;
    try {
      localStorage.setItem(`board-assignments-${id}`, JSON.stringify(boardGroupAssignments));
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
    } catch (error) {
      console.error('Error saving assignments:', error);
      setError('Failed to save board assignments');
    }
  };

  const getGroupBoardCount = (groupId: string): number => {
    return Object.values(boardGroupAssignments).filter(gId => gId === groupId).length;
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
    if (!id || !tournament || !tournament.num_groups) {
      console.error('Missing required data:', { id, tournament: !!tournament, num_groups: tournament?.num_groups });
      return;
    }
    
    console.log('🚀 Starting group stage creation...');
    console.log('Format config:', formatConfig);
    
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
      
      console.log('✅ Generated matches:', allMatches.length, 'groups');
      console.log('Match Format:', formatConfig.match_format);
      if (formatConfig.match_format === 'matchplay') {
        console.log(`Legs Per Match: ${formatConfig.legs_per_match}, Play Style: ${formatConfig.play_style}`);
      } else {
        console.log(`Legs Per Set: ${formatConfig.legs_per_set}, Sets Per Match: ${formatConfig.sets_per_match}`);
      }
      
      // Create matches in database
      let totalMatchesCreated = 0;
      for (const { groupIndex, groupLetter, matches } of allMatches) {
        const dbGroup = dbGroups[groupIndex];
        
        console.log(`\n📋 Group ${groupLetter} (${dbGroup.id}): Creating ${matches.length} matches`);
        
        for (const match of matches) {
          console.log(`  Creating match: ${match.player1} vs ${match.player2}, Round ${match.round}, Board ${match.board}`);
          
          const createdMatch = await MatchService.createMatch({
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
          
          if (createdMatch) {
            totalMatchesCreated++;
            console.log(`    ✓ Match created: ${createdMatch.id}`);
          } else {
            console.error(`    ✗ Failed to create match`);
          }
        }
      }
      
      // Mark group stage as created
      console.log(`\n🎉 Total matches created: ${totalMatchesCreated}`);
      
      await TournamentService.updateTournament(id, {
        group_stage_created: true
      });
      
      console.log('✅ Group stage matches created successfully');
      alert(`Successfully created ${totalMatchesCreated} matches across ${allMatches.length} groups!`);
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

          {/* Board Management Section - Only show after groups are generated */}
          {groups.length > 0 && !tournament.group_stage_created && (
            <div className="card" style={{ marginTop: '20px', background: '#f0f9ff', border: '2px solid #3b82f6' }}>
              <h3 style={{ marginBottom: '15px', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Grid size={20} />
                Board Assignment
              </h3>
              <p style={{ color: '#1e40af', marginBottom: '20px', fontSize: '14px' }}>
                Assign boards to groups before generating matches. The system will use balanced board rotation for fair play.
              </p>

              {/* Add Boards */}
              <div style={{ marginBottom: '20px', padding: '15px', background: '#fff', borderRadius: '8px' }}>
                <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Add Boards</h4>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <div style={{ flex: '0 0 150px' }}>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      max="20"
                      value={newBoardCount}
                      onChange={(e) => setNewBoardCount(parseInt(e.target.value) || 1)}
                      placeholder="Number of boards"
                    />
                  </div>
                  <button className="button button-primary" onClick={handleAddBoards}>
                    <Grid size={16} />
                    Add {newBoardCount} Board{newBoardCount !== 1 ? 's' : ''}
                  </button>
                  <div style={{ marginLeft: 'auto', color: '#64748b', fontSize: '14px' }}>
                    Total boards: <strong>{boards.length}</strong>
                  </div>
                </div>
              </div>

              {/* Board Assignment Table */}
              {boards.length > 0 && (
                <div style={{ marginBottom: '15px' }}>
                  <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#1e40af' }}>
                    Assign Boards to Groups
                  </h4>
                  
                  {/* Group Summary */}
                  <div style={{ marginBottom: '15px', padding: '10px', background: '#dbeafe', borderRadius: '4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                      {groups.map(group => (
                        <div key={group.id} style={{ fontSize: '13px' }}>
                          <strong>{group.name}:</strong> {getGroupBoardCount(group.id)} board{getGroupBoardCount(group.id) !== 1 ? 's' : ''}
                          <span style={{ color: '#64748b', marginLeft: '4px' }}>
                            ({group.player_ids.length} players)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Board List */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table" style={{ fontSize: '14px' }}>
                      <thead>
                        <tr>
                          <th style={{ width: '120px' }}>Board</th>
                          <th>Assigned Group</th>
                        </tr>
                      </thead>
                      <tbody>
                        {boards.map(board => (
                          <tr key={board.id}>
                            <td style={{ fontWeight: 'bold' }}>Board {board.board_number}</td>
                            <td>
                              <select
                                className="input"
                                value={boardGroupAssignments[board.id] || ''}
                                onChange={(e) => handleBoardAssignment(board.id, e.target.value)}
                                style={{ maxWidth: '300px', padding: '6px' }}
                              >
                                <option value="">Unassigned</option>
                                {groups.map(group => (
                                  <option key={group.id} value={group.id}>
                                    {group.name} ({group.player_ids.length} players)
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button
                    className="button button-primary"
                    onClick={saveBoardAssignments}
                    style={{ marginTop: '10px' }}
                  >
                    Save Board Assignments
                  </button>
                </div>
              )}

              {boards.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', background: '#fff', borderRadius: '8px' }}>
                  <p style={{ color: '#64748b', fontSize: '14px' }}>
                    No boards created yet. Add boards above to assign them to groups.
                  </p>
                </div>
              )}

              {/* Guidelines */}
              <div style={{ padding: '12px', background: '#dbeafe', borderRadius: '4px', fontSize: '13px', color: '#1e40af' }}>
                <strong>💡 Board Assignment Tips:</strong>
                <ul style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '0' }}>
                  <li>Small groups (2-3 players): 1 board recommended</li>
                  <li>Medium groups (4-6 players): 2 boards recommended</li>
                  <li>Large groups (7+ players): {Math.floor(7/2)} or more boards recommended</li>
                  <li>System uses balanced rotation: (matchIndex + round) mod Boards + 1</li>
                </ul>
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
                ✅ Groups ready! {boards.length > 0 ? 'Assign boards above, then click' : 'Click'} "Generate Group Stage" to create matches
                {boards.length === 0 && ' (boards are optional - system will auto-calculate if not assigned)'}
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
