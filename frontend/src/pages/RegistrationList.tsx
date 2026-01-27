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
import { EmailService } from '@/services/EmailService';

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
  const [newBoardCount, setNewBoardCount] = useState(0);
  const [boardGroupAssignments, setBoardGroupAssignments] = useState<Record<string, string>>({});
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [dragOverPlayer, setDragOverPlayer] = useState<Player | null>(null);

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
      // Delete all existing matches for this tournament
      console.log('🗑️ Deleting all matches before updating groups...');
      await MatchService.deleteAllMatches(id);
      console.log('✅ All matches deleted');

      // Extra safety: delete any matches referencing groups in this tournament (in case of orphaned matches)
      const dbGroups = await GroupService.getGroups(id);
      if (dbGroups.length > 0) {
        for (const group of dbGroups) {
          try {
            await MatchService.deleteGroupMatches(group.id);
          } catch (err) {
            // Ignore if no matches, log otherwise
            console.warn('No matches or error deleting group matches for group', group.id, err);
          }
        }
      }

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
      
      // Mark groups as generated, confirm participants, and save advancement rules
      await TournamentService.updateTournament(id, {
        groups_generated: true,
        participants_confirmed: true,
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

  const handleDragStart = (e: React.DragEvent, player: Player) => {
    setDraggedPlayer(player);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetPlayer: Player) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPlayer(targetPlayer);
  };

  const handleDragLeave = () => {
    setDragOverPlayer(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPlayer: Player) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPlayer(null);
    
    if (!draggedPlayer || draggedPlayer.id === targetPlayer.id || !tournament) {
      setDraggedPlayer(null);
      return;
    }

    // Find source and target groups
    const sourceGroup = groups.find(g => g.player_ids.includes(draggedPlayer.id));
    const targetGroup = groups.find(g => g.player_ids.includes(targetPlayer.id));

    if (!sourceGroup || !targetGroup) {
      setDraggedPlayer(null);
      return;
    }

    try {
      // Swap players between groups AND their seed rankings
      const sourcePlayerIds = [...sourceGroup.player_ids];
      const targetPlayerIds = [...targetGroup.player_ids];

      // Find indices
      const sourceIndex = sourcePlayerIds.indexOf(draggedPlayer.id);
      const targetIndex = targetPlayerIds.indexOf(targetPlayer.id);

      // Get current seed rankings
      const draggedSeed = draggedPlayer.seed_ranking;
      const targetSeed = targetPlayer.seed_ranking;

      if (sourceGroup.id === targetGroup.id) {
        // Same group: swap positions and seed rankings
        [sourcePlayerIds[sourceIndex], sourcePlayerIds[targetIndex]] = 
          [sourcePlayerIds[targetIndex], sourcePlayerIds[sourceIndex]];
        
        await Promise.all([
          GroupService.updateGroup(sourceGroup.id, { player_ids: sourcePlayerIds }),
          PlayerService.updatePlayer(draggedPlayer.id, { seed_ranking: targetSeed }),
          PlayerService.updatePlayer(targetPlayer.id, { seed_ranking: draggedSeed })
        ]);
      } else {
        // Different groups: swap players and seed rankings
        sourcePlayerIds[sourceIndex] = targetPlayer.id;
        targetPlayerIds[targetIndex] = draggedPlayer.id;
        
        await Promise.all([
          GroupService.updateGroup(sourceGroup.id, { player_ids: sourcePlayerIds }),
          GroupService.updateGroup(targetGroup.id, { player_ids: targetPlayerIds }),
          PlayerService.updatePlayer(draggedPlayer.id, { seed_ranking: targetSeed }),
          PlayerService.updatePlayer(targetPlayer.id, { seed_ranking: draggedSeed })
        ]);
      }

      // Reload data to reflect changes
      await loadData();
      setDraggedPlayer(null);
    } catch (error) {
      console.error('Error swapping players:', error);
      alert('Failed to swap players');
      setDraggedPlayer(null);
    }
  };

  const handleAddBoards = async () => {
    if (!id || newBoardCount < 1) return;
    
    // Save current scroll position
    const currentScrollPosition = window.scrollY;
    
    try {
      await BoardService.createBoards(id, newBoardCount);
      setNewBoardCount(0);
      await loadData();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
      
      // Restore scroll position after data reload
      requestAnimationFrame(() => {
        window.scrollTo(0, currentScrollPosition);
      });
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
      // Save to localStorage
      localStorage.setItem(`board-assignments-${id}`, JSON.stringify(boardGroupAssignments));
      
      // Save to database - update each board's assigned_group_ids
      for (const board of boards) {
        const assignedGroupId = boardGroupAssignments[board.id];
        
        if (assignedGroupId) {
          // Set this board to be assigned to only this group
          await BoardService.updateBoard(board.id, { 
            assigned_group_ids: [assignedGroupId]
          });
        } else {
          // Clear this board's group assignments
          await BoardService.updateBoard(board.id, { 
            assigned_group_ids: [] 
          });
        }
      }
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 1500);
      alert('Board assignments saved successfully!');
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
      // Delete all existing matches before creating new ones
      console.log('🗑️ Deleting existing matches...');
      await MatchService.deleteAllMatches(id);
      console.log('✅ Existing matches deleted');
      
      // Update tournament with round-robin format configuration
      const updatedScoringSystem = {
        ...tournament.scoring_system,
        roundrobin_format: formatConfig.match_format,
        roundrobin_play_style: formatConfig.play_style,
        roundrobin_legs_per_match: formatConfig.legs_per_match,
        roundrobin_legs_per_set: formatConfig.legs_per_set,
        roundrobin_sets_per_match: formatConfig.sets_per_match
      };

      console.log('💾 Saving match format to database...');
      const updatedTournament = await TournamentService.updateTournament(id, {
        scoring_system: updatedScoringSystem
      });
      
      // Update local tournament object with the saved format
      setTournament(updatedTournament);
      console.log('✅ Match format saved to database');

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
      
      // Get all boards and create group-to-boards mapping
      const allBoards = await BoardService.getBoards(id);
      const groupBoardNumbers = new Map<string, number[]>();
      
      // Initialize empty arrays for all groups
      dbGroups.forEach(group => {
        groupBoardNumbers.set(group.id, []);
      });
      
      // Collect assigned board numbers for each group
      allBoards.forEach(board => {
        const assignedGroupId = boardAssignments[board.id];
        if (assignedGroupId && groupBoardNumbers.has(assignedGroupId)) {
          groupBoardNumbers.get(assignedGroupId)!.push(board.board_number);
        }
      });
      
      // Sort board numbers for each group (ascending order)
      groupBoardNumbers.forEach(boardList => {
        boardList.sort((a, b) => a - b);
      });
      
      // Prepare groups for round-robin generation with board allocation
      const groupsForMatches = dbGroups.map(group => {
        return players
          .filter(p => group.player_ids.includes(p.id))
          .map(p => ({ id: p.id, name: p.name }));
      });
      
      // Generate board number arrays for each group
      const boardsPerGroup = dbGroups.map(group => {
        const assignedBoards = groupBoardNumbers.get(group.id) || [];
        // If no boards assigned, use sequential numbering starting from 1
        if (assignedBoards.length === 0) {
          const groupSize = groupsForMatches[dbGroups.indexOf(group)].length;
          const boardCount = groupSize <= 3 ? 1 : groupSize <= 6 ? 2 : Math.floor(groupSize / 2);
          return Array.from({ length: boardCount }, (_, i) => i + 1);
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

      // Send group assignment emails
      if (EmailService.isConfigured()) {
        console.log('📧 Sending group assignment emails...');
        const emailAssignments: { email: string; data: any }[] = [];

        // Extract match format details from the UPDATED scoring_system
        let matchFormat = 'Match Play';
        let playStyle = 'Best Of';
        let formatDetails = 'Best of 11 legs';
        
        if (updatedTournament.scoring_system) {
          const format = updatedTournament.scoring_system.roundrobin_format || 'matchplay';
          const style = updatedTournament.scoring_system.roundrobin_play_style || 'best_of';
          
          matchFormat = format === 'matchplay' ? 'Match Play' : 'Set Play';
          playStyle = style === 'best_of' ? 'Best Of' : 'Play All';
          
          if (format === 'matchplay') {
            const legs = updatedTournament.scoring_system.roundrobin_legs_per_match || 11;
            if (style === 'best_of') {
              formatDetails = `Best of ${legs} legs (first to ${Math.ceil(legs / 2)} wins)`;
            } else {
              formatDetails = `Play all ${legs} legs`;
            }
          } else {
            const sets = updatedTournament.scoring_system.roundrobin_sets_per_match || 3;
            const legsPerSet = updatedTournament.scoring_system.roundrobin_legs_per_set || 5;
            if (style === 'best_of') {
              formatDetails = `Best of ${sets} sets (first to ${Math.ceil(sets / 2)} wins), ${legsPerSet} legs per set`;
            } else {
              formatDetails = `Play all ${sets} sets, ${legsPerSet} legs per set`;
            }
          }
        }

        // Prepare email data for each player with an email
        for (const dbGroup of dbGroups) {
          const groupIndex = dbGroups.indexOf(dbGroup);
          const groupLetter = String.fromCharCode(65 + groupIndex); // A, B, C, etc.
          const assignedBoards = groupBoardNumbers.get(dbGroup.id) || [];
          const boardsText = assignedBoards.length > 0 
            ? assignedBoards.map(num => `Board ${num}`).join(', ')
            : 'TBD';

          // Get players in this group who have emails
          const groupPlayers = players.filter(p => 
            dbGroup.player_ids.includes(p.id) && p.email && p.email.trim()
          );

          for (const player of groupPlayers) {
            emailAssignments.push({
              email: player.email!,
              data: {
                playerName: player.name,
                eventName: updatedTournament.name,
                groupName: `Group ${groupLetter}`,
                boardNumbers: boardsText,
                matchFormat,
                playStyle,
                formatDetails,
                date: updatedTournament.date || 'TBD',
                startTime: updatedTournament.start_time || 'TBD',
              }
            });
          }
        }

        if (emailAssignments.length > 0) {
          const emailResults = await EmailService.sendBulkGroupAssignments(emailAssignments);
          console.log(`📧 Email results: ${emailResults.sent} sent, ${emailResults.failed} failed`);
          if (emailResults.errors.length > 0) {
            console.error('📧 Email errors:', emailResults.errors);
          }
        } else {
          console.log('📧 No players with email addresses found');
        }
      } else {
        console.log('📧 Email service not configured - skipping group assignment emails');
      }

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {idx + 1}. {player.name}
                                  {player.paid && (
                                    <span style={{
                                      backgroundColor: '#10b981',
                                      color: '#fff',
                                      padding: '2px 8px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}>PAID</span>
                                  )}
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
                            }}>                              {teamCounter}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {player.name}
                                {player.paid && (
                                  <span style={{
                                    backgroundColor: '#10b981',
                                    color: '#fff',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 'bold'
                                  }}>PAID</span>
                                )}
                              </div>
                              {player.email && (
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#94a3b8',
                                  marginTop: '5px'
                                }}>
                                  {player.email}
                                </div>
                              )}
                            </div>
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
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {player.name}
                        {player.paid && (
                          <span style={{
                            backgroundColor: '#10b981',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold'
                          }}>PAID</span>
                        )}
                      </div>
                      {player.email && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#94a3b8',
                          marginTop: '5px'
                        }}>
                          {player.email}
                        </div>
                      )}
                    </div>
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
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px' }}>
                💡 Drag players over other players to swap their positions
              </p>
              
              {groups.map((group) => {
                const groupPlayers = players.filter(p => group.player_ids.includes(p.id));
                // Sort by seed ranking
                groupPlayers.sort((a, b) => (a.seed_ranking || 999) - (b.seed_ranking || 999));
                
                return (
                  <div key={group.id} style={{ marginBottom: '20px' }}>
                    <h4 style={{ 
                      marginBottom: '10px', 
                      color: '#667eea',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '10px 0',
                      borderBottom: '2px solid rgba(102, 126, 234, 0.3)'
                    }}>
                      {group.name}
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {groupPlayers.map((player, idx) => {
                        const isDragging = draggedPlayer?.id === player.id;
                        const isDragOver = dragOverPlayer?.id === player.id;
                        
                        return (
                          <div
                            key={player.id}
                            draggable={!tournament.group_stage_started}
                            onDragStart={(e) => handleDragStart(e, player)}
                            onDragOver={(e) => handleDragOver(e, player)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, player)}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '15px',
                              backgroundColor: isDragOver ? 'rgba(102, 126, 234, 0.3)' : '#1e293b',
                              borderRadius: '8px',
                              border: isDragOver 
                                ? '3px solid rgba(102, 126, 234, 0.8)' 
                                : '1px solid rgba(100, 116, 139, 0.3)',
                              cursor: tournament.group_stage_started ? 'default' : 'move',
                              opacity: isDragging ? 0.5 : 1,
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                <span style={{ color: '#667eea', marginRight: '8px' }}>#{player.seed_ranking || idx + 1}</span>
                                {player.name}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
                      min="0"
                      max="20"
                      value={newBoardCount}
                      onChange={(e) => setNewBoardCount(e.target.value === '' ? 0 : parseInt(e.target.value))}
                      placeholder="Number of boards"
                    />
                  </div>
                  <button className="button button-primary" onClick={handleAddBoards} disabled={newBoardCount < 1}>
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
