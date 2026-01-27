import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament';
import { BoardService, GroupService } from '@/services/api';
import { supabase } from '@/services/supabase';
import { Board, Group, Match } from '@/types';
import { Trash2, Plus, Grid, ArrowRight, Edit2, ArrowLeftRight, Calendar, Play } from 'lucide-react';

interface GroupWithBoards extends Group {
  assignedBoards: number[];
}

interface BoardEdit {
  id: string;
  board_number: number;
}

export default function BoardManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTournament } = useTournamentStore();
  
  const [boards, setBoards] = useState<Board[]>([]);
  const [groups, setGroups] = useState<GroupWithBoards[]>([]);
  const [knockoutMatches, setKnockoutMatches] = useState<Match[]>([]);
  const [groupMatches, setGroupMatches] = useState<Match[]>([]);
  const [newBoardCount, setNewBoardCount] = useState(0);
  const [boardGroupAssignments, setBoardGroupAssignments] = useState<Record<string, string>>({});
  const [boardMatchAssignments, setBoardMatchAssignments] = useState<Record<string, string>>({});
  const [groupMatchBoardAssignments, setGroupMatchBoardAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBoard, setEditingBoard] = useState<BoardEdit | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapBoard1, setSwapBoard1] = useState<string | null>(null);

  const isKnockoutStage = currentTournament?.status === 'knockout';
  const isGroupStage = currentTournament?.status === 'group-stage';

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (id && isKnockoutStage) {
      loadKnockoutData();
    }
  }, [id, isKnockoutStage]);

  useEffect(() => {
    if (id && isGroupStage) {
      loadGroupMatches();
    }
  }, [id, isGroupStage]);

  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [boardsData, groupsData] = await Promise.all([
        BoardService.getBoards(id),
        GroupService.getGroups(id)
      ]);
      
      setBoards(boardsData.sort((a, b) => a.board_number - b.board_number));
      
      const groupsWithBoards: GroupWithBoards[] = groupsData.map(group => ({
        ...group,
        assignedBoards: []
      }));
      
      setGroups(groupsWithBoards);
      
      const savedAssignments = localStorage.getItem(`board-assignments-${id}`);
      if (savedAssignments) {
        setBoardGroupAssignments(JSON.parse(savedAssignments));
      } else {
        const assignments: Record<string, string> = {};
        boardsData.forEach(board => {
          assignments[board.id] = '';
        });
        setBoardGroupAssignments(assignments);
      }
      
    } catch (error) {
      console.error('Error loading boards:', error);
      alert('Failed to load boards');
    } finally {
      setLoading(false);
    }
  };

  const loadKnockoutData = async () => {
    if (!id) return;

    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*, player1:players!matches_player1_id_fkey(name), player2:players!matches_player2_id_fkey(name)')
        .eq('tournament_id', id)
        .is('group_id', null)
        .order('round_number', { ascending: true });

      if (error) throw error;

      setKnockoutMatches(matches || []);

      const savedKnockoutAssignments = localStorage.getItem(`knockout-board-assignments-${id}`);
      if (savedKnockoutAssignments) {
        setBoardMatchAssignments(JSON.parse(savedKnockoutAssignments));
      } else {
        autoAssignKnockoutBoards(matches || []);
      }

    } catch (error) {
      console.error('Error loading knockout matches:', error);
    }
  };

  const loadGroupMatches = async () => {
    if (!id) return;

    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          *, 
          player1:players!matches_player1_id_fkey(name), 
          player2:players!matches_player2_id_fkey(name),
          group:groups(name)
        `)
        .eq('tournament_id', id)
        .not('group_id', 'is', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setGroupMatches(matches || []);

      // Initialize board assignments from database
      const assignments: Record<string, string> = {};
      (matches || []).forEach(match => {
        if (match.board_id) {
          assignments[match.id] = match.board_id;
        }
      });

      // Load saved local assignments and merge with database
      const savedGroupMatchAssignments = localStorage.getItem(`group-match-board-assignments-${id}`);
      if (savedGroupMatchAssignments) {
        const localAssignments = JSON.parse(savedGroupMatchAssignments);
        Object.assign(assignments, localAssignments);
      }

      setGroupMatchBoardAssignments(assignments);

    } catch (error) {
      console.error('Error loading group matches:', error);
    }
  };

  const autoAssignKnockoutBoards = (matches: Match[]) => {
    if (boards.length === 0 || matches.length === 0) return;

    const assignments: Record<string, string> = {};
    
    const matchesByRound: { [round: number]: Match[] } = {};
    matches.forEach(match => {
      if (!matchesByRound[match.round_number]) {
        matchesByRound[match.round_number] = [];
      }
      matchesByRound[match.round_number].push(match);
    });

    Object.keys(matchesByRound).forEach(roundKey => {
      const roundMatches = matchesByRound[parseInt(roundKey)];
      roundMatches.forEach((match, index) => {
        const boardIndex = index % boards.length;
        assignments[match.id] = boards[boardIndex].id;
      });
    });

    setBoardMatchAssignments(assignments);
    localStorage.setItem(`knockout-board-assignments-${id}`, JSON.stringify(assignments));
  };

  const handleAddBoards = async () => {
    if (!id || newBoardCount < 1) return;
    
    const currentScrollPosition = window.scrollY;
    
    try {
      const maxBoardNumber = boards.length > 0 
        ? Math.max(...boards.map(b => b.board_number))
        : 0;
      
      const newBoards = Array.from({ length: newBoardCount }, (_, i) => ({
        tournament_id: id,
        board_number: maxBoardNumber + i + 1,
        status: 'available' as const
      }));
      
      await BoardService.createBoardsBatch(id, newBoards);
      setNewBoardCount(0);
      await loadData();
      
      requestAnimationFrame(() => {
        window.scrollTo(0, currentScrollPosition);
      });

      alert(`Successfully added ${newBoardCount} board(s)!`);
    } catch (error) {
      console.error('Error creating boards:', error);
      alert('Failed to create boards');
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm('Are you sure you want to delete this board?')) return;

    try {
      await supabase.from('boards').delete().eq('id', boardId);
      await loadData();
      alert('Board deleted successfully!');
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board');
    }
  };

  const handleEditBoard = async (board: BoardEdit) => {
    if (!board.board_number || board.board_number < 1) {
      alert('Board number must be at least 1');
      return;
    }

    try {
      await supabase
        .from('boards')
        .update({ board_number: board.board_number })
        .eq('id', board.id);
      
      setEditingBoard(null);
      await loadData();
      alert('Board updated successfully!');
    } catch (error) {
      console.error('Error updating board:', error);
      alert('Failed to update board');
    }
  };

  const executeSwap = async (board2Id: string) => {
    if (!swapBoard1 || swapBoard1 === board2Id) {
      setSwapMode(false);
      setSwapBoard1(null);
      return;
    }

    try {
      const board1 = boards.find(b => b.id === swapBoard1);
      const board2 = boards.find(b => b.id === board2Id);

      if (!board1 || !board2) return;

      await supabase
        .from('boards')
        .update({ board_number: board2.board_number })
        .eq('id', board1.id);

      await supabase
        .from('boards')
        .update({ board_number: board1.board_number })
        .eq('id', board2.id);

      setSwapMode(false);
      setSwapBoard1(null);
      await loadData();
      alert(`Swapped Board ${board1.board_number} with Board ${board2.board_number}`);
    } catch (error) {
      console.error('Error swapping boards:', error);
      alert('Failed to swap boards');
    }
  };

  const handleBoardAssignment = (boardId: string, groupId: string) => {
    setBoardGroupAssignments(prev => ({
      ...prev,
      [boardId]: groupId
    }));
  };

  const handleKnockoutBoardAssignment = (matchId: string, boardId: string) => {
    setBoardMatchAssignments(prev => ({
      ...prev,
      [matchId]: boardId
    }));
  };

  const handleGroupMatchBoardAssignment = (matchId: string, boardId: string) => {
    setGroupMatchBoardAssignments(prev => ({
      ...prev,
      [matchId]: boardId
    }));
  };

  const getGroupBoardCount = (groupId: string): number => {
    return Object.values(boardGroupAssignments).filter(gId => gId === groupId).length;
  };

  const saveAssignments = async () => {
    setSaving(true);
    try {
      if (isKnockoutStage) {
        localStorage.setItem(`knockout-board-assignments-${id}`, JSON.stringify(boardMatchAssignments));
        
        for (const [matchId, boardId] of Object.entries(boardMatchAssignments)) {
          if (boardId) {
            await supabase
              .from('matches')
              .update({ board_id: boardId })
              .eq('id', matchId);
          }
        }
      } else if (isGroupStage) {
        localStorage.setItem(`group-match-board-assignments-${id}`, JSON.stringify(groupMatchBoardAssignments));
        
        for (const [matchId, boardId] of Object.entries(groupMatchBoardAssignments)) {
          if (boardId) {
            await supabase
              .from('matches')
              .update({ board_id: boardId })
              .eq('id', matchId);
          } else {
            // Clear board assignment if empty
            await supabase
              .from('matches')
              .update({ board_id: null })
              .eq('id', matchId);
          }
        }
      } else {
        // Save board-to-group assignments to database
        localStorage.setItem(`board-assignments-${id}`, JSON.stringify(boardGroupAssignments));
        
        // Update each board with its assigned group
        for (const board of boards) {
          const assignedGroupId = boardGroupAssignments[board.id];
          
          if (assignedGroupId) {
            // Set this board to be assigned to only this group
            await supabase
              .from('boards')
              .update({ 
                assigned_group_ids: [assignedGroupId]
              })
              .eq('id', board.id);
          } else {
            // Clear this board's group assignments
            await supabase
              .from('boards')
              .update({ assigned_group_ids: [] })
              .eq('id', board.id);
          }
        }
      }
      alert('Board assignments saved successfully!');
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const getRoundName = (roundNumber: number, totalRounds: number): string => {
    const remaining = totalRounds - roundNumber + 1;
    if (remaining === 1) return 'Final';
    if (remaining === 2) return 'Semi-Final';
    if (remaining === 3) return 'Quarter-Final';
    return `Round ${roundNumber}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Loading boards...</p>
      </div>
    );
  }

  if (!currentTournament) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p>Tournament not found</p>
      </div>
    );
  }

  // KNOCKOUT BOARD MANAGER
  if (isKnockoutStage) {
    const totalRounds = knockoutMatches.length > 0 
      ? Math.max(...knockoutMatches.map(m => m.round_number))
      : 0;

    const matchesByRound: { [round: number]: Match[] } = {};
    knockoutMatches.forEach(match => {
      if (!matchesByRound[match.round_number]) {
        matchesByRound[match.round_number] = [];
      }
      matchesByRound[match.round_number].push(match);
    });

    return (
      <div style={{ padding: '20px' }}>
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Play size={28} />
            Knockout Board Manager
          </h2>
          <p style={{ color: '#64748b' }}>
            Assign boards to individual knockout matches
          </p>
        </div>

        {/* Add/Edit Boards Section */}
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Board Management</h3>
          
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Add Boards</label>
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
              <Plus size={18} />
              Add Boards
            </button>
          </div>

          {swapMode && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, color: '#b45309' }}>🔄 Swap Mode Active - Click a board to swap with Board {boards.find(b => b.id === swapBoard1)?.board_number}</p>
              <button className="button" onClick={() => { setSwapMode(false); setSwapBoard1(null); }}>
                Cancel
              </button>
            </div>
          )}

          {/* Boards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {boards.map(board => (
              <div 
                key={board.id} 
                className="card"
                style={{ 
                  padding: '15px',
                  cursor: swapMode ? 'pointer' : 'default',
                  border: swapBoard1 === board.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: swapBoard1 === board.id ? '#eff6ff' : 'white'
                }}
                onClick={() => {
                  if (swapMode && swapBoard1) {
                    executeSwap(board.id);
                  }
                }}
              >
                {editingBoard?.id === board.id ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Board Number:</label>
                    <input
                      type="number"
                      className="input"
                      value={editingBoard.board_number}
                      onChange={(e) => setEditingBoard({ ...editingBoard, board_number: parseInt(e.target.value) || 0 })}
                      min="1"
                      style={{ marginBottom: '10px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="button button-primary" style={{ flex: 1 }} onClick={() => handleEditBoard(editingBoard)}>
                        Save
                      </button>
                      <button className="button" style={{ flex: 1 }} onClick={() => setEditingBoard(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>Board {board.board_number}</h4>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className="button"
                          style={{ padding: '6px', minWidth: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBoard({ id: board.id, board_number: board.board_number });
                          }}
                          title="Edit board number"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="button"
                          style={{ padding: '6px', minWidth: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwapBoard1(board.id);
                            setSwapMode(true);
                          }}
                          title="Swap with another board"
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                        <button 
                          className="button"
                          style={{ padding: '6px', minWidth: 'auto', background: '#fecaca', color: '#991b1b' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBoard(board.id);
                          }}
                          title="Delete board"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: board.status === 'available' ? '#dcfce7' : '#fef3c7',
                      color: board.status === 'available' ? '#166534' : '#854d0e'
                    }}>
                      {board.status}
                    </span>
                  </>
                )}
              </div>
            ))}

            {boards.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <p>No boards yet. Add boards above to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Match Board Assignments */}
        {knockoutMatches.length > 0 && boards.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="#ff6600" />
              Match Board Assignments
            </h3>
            <p style={{ marginBottom: '20px', color: '#64748b', fontSize: '14px' }}>
              Assign boards to each knockout match. Boards are auto-distributed for balanced usage.
            </p>

            {Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).map(roundKey => {
              const roundNum = parseInt(roundKey);
              const roundMatches = matchesByRound[roundNum];
              
              return (
                <div key={roundNum} style={{ marginBottom: '30px' }}>
                  <h4 style={{ marginBottom: '15px', color: '#3b82f6', fontSize: '18px' }}>{getRoundName(roundNum, totalRounds)}</h4>
                  
                  <div style={{ overflowX: 'auto' }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Match</th>
                          <th>Players</th>
                          <th>Status</th>
                          <th>Assigned Board</th>
                        </tr>
                      </thead>
                      <tbody>
                        {roundMatches.map((match, idx) => {
                          const board = boards.find(b => b.id === boardMatchAssignments[match.id]);
                          
                          return (
                            <tr key={match.id}>
                              <td><strong>Match {idx + 1}</strong></td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span>{(match as any).player1?.name || 'TBD'}</span>
                                  <span style={{ color: '#94a3b8', fontSize: '12px' }}>vs</span>
                                  <span>{(match as any).player2?.name || 'TBD'}</span>
                                </div>
                              </td>
                              <td>
                                <span style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  background: match.status === 'completed' ? '#dcfce7' : match.status === 'in-progress' ? '#fef3c7' : '#f1f5f9',
                                  color: match.status === 'completed' ? '#166534' : match.status === 'in-progress' ? '#854d0e' : '#64748b'
                                }}>
                                  {match.status}
                                </span>
                              </td>
                              <td>
                                <select
                                  className="input"
                                  value={boardMatchAssignments[match.id] || ''}
                                  onChange={(e) => handleKnockoutBoardAssignment(match.id, e.target.value)}
                                  style={{ maxWidth: '200px' }}
                                >
                                  <option value="">Unassigned</option>
                                  {boards.map(b => (
                                    <option key={b.id} value={b.id}>
                                      Board {b.board_number}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                className="button"
                onClick={() => {
                  if (confirm('Reset all board assignments to automatic distribution?')) {
                    autoAssignKnockoutBoards(knockoutMatches);
                  }
                }}
              >
                <Calendar size={18} color="#ff6600" />
                Auto-Assign Boards
              </button>
              <button
                className="button button-primary"
                onClick={saveAssignments}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save All Assignments'}
              </button>
            </div>
          </div>
        )}

        {knockoutMatches.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#64748b' }}>No knockout matches found. Generate the knockout bracket first.</p>
          </div>
        )}
      </div>
    );
  }

  // ROUND ROBIN BOARD MANAGER
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Grid size={28} />
          Round Robin Board Manager
        </h2>
        <p style={{ color: '#64748b' }}>
          Create boards and assign them to groups for balanced match distribution
        </p>
      </div>

      {/* Add Boards Section */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Add Boards</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="label">Number of Boards to Add</label>
            <input
              type="number"
              className="input"
              min="0"
              max="20"
              value={newBoardCount}
              onChange={(e) => setNewBoardCount(e.target.value === '' ? 0 : parseInt(e.target.value))}
            />
          </div>
          <button className="button button-primary" onClick={handleAddBoards} disabled={newBoardCount < 1}>
            <Plus size={18} />
            Add Boards
          </button>
        </div>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#64748b' }}>
          Total boards: <strong>{boards.length}</strong>
        </p>
      </div>

      {/* Manage Boards */}
      {boards.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Manage Boards</h3>
          
          {swapMode && (
            <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: '8px', padding: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, color: '#b45309' }}>🔄 Swap Mode Active - Click a board to swap with Board {boards.find(b => b.id === swapBoard1)?.board_number}</p>
              <button className="button" onClick={() => { setSwapMode(false); setSwapBoard1(null); }}>
                Cancel
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
            {boards.map(board => (
              <div 
                key={board.id} 
                className="card"
                style={{ 
                  padding: '15px',
                  cursor: swapMode ? 'pointer' : 'default',
                  border: swapBoard1 === board.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                  background: swapBoard1 === board.id ? '#eff6ff' : 'white'
                }}
                onClick={() => {
                  if (swapMode && swapBoard1) {
                    executeSwap(board.id);
                  }
                }}
              >
                {editingBoard?.id === board.id ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Board Number:</label>
                    <input
                      type="number"
                      className="input"
                      value={editingBoard.board_number}
                      onChange={(e) => setEditingBoard({ ...editingBoard, board_number: parseInt(e.target.value) || 0 })}
                      min="1"
                      style={{ marginBottom: '10px' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="button button-primary" style={{ flex: 1 }} onClick={() => handleEditBoard(editingBoard)}>
                        Save
                      </button>
                      <button className="button" style={{ flex: 1 }} onClick={() => setEditingBoard(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0 }}>Board {board.board_number}</h4>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          className="button"
                          style={{ padding: '6px', minWidth: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBoard({ id: board.id, board_number: board.board_number });
                          }}
                          title="Edit board number"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="button"
                          style={{ padding: '6px', minWidth: 'auto' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSwapBoard1(board.id);
                            setSwapMode(true);
                          }}
                          title="Swap with another board"
                        >
                          <ArrowLeftRight size={16} />
                        </button>
                        <button 
                          className="button"
                          style={{ padding: '6px', minWidth: 'auto', background: '#fecaca', color: '#991b1b' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteBoard(board.id);
                          }}
                          title="Delete board"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: board.status === 'available' ? '#dcfce7' : '#fef3c7',
                      color: board.status === 'available' ? '#166534' : '#854d0e'
                    }}>
                      {board.status}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Board Assignment to Groups */}
      {groups.length > 0 && boards.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Assign Boards to Groups</h3>
          
          {/* Group Summary */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px', color: '#e2e8f0' }}>Group Board Allocation</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {groups.map(group => (
                <div key={group.id} style={{ padding: '12px', background: '#0f172a', borderRadius: '6px', border: '2px solid #ff6600' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#ff6600', fontSize: '16px' }}>{group.name}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Players: {group.player_ids.length} | Boards: {getGroupBoardCount(group.id)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Board Assignment Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '100px' }}>Board #</th>
                  <th style={{ width: '120px' }}>Status</th>
                  <th>Assigned Group</th>
                </tr>
              </thead>
              <tbody>
                {boards.map(board => (
                  <tr key={board.id}>
                    <td style={{ fontWeight: 'bold' }}>Board {board.board_number}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: board.status === 'available' ? '#dcfce7' : '#fef3c7',
                        color: board.status === 'available' ? '#166534' : '#854d0e'
                      }}>
                        {board.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="input"
                        value={boardGroupAssignments[board.id] || ''}
                        onChange={(e) => handleBoardAssignment(board.id, e.target.value)}
                        style={{ maxWidth: '300px' }}
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

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              className="button button-primary"
              onClick={saveAssignments}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </div>
      )}

      {/* Group Match Board Assignments */}
      {groupMatches.length > 0 && boards.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Group Match Board Assignments</h3>
          
          <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '14px' }}>
            Assign specific boards to individual group stage matches. Matches are organized by group.
          </p>

          {/* Organize matches by group */}
          {(() => {
            const matchesByGroup: Record<string, typeof groupMatches> = {};
            groupMatches.forEach(match => {
              const groupName = (match as any).group?.name || 'Unknown Group';
              if (!matchesByGroup[groupName]) {
                matchesByGroup[groupName] = [];
              }
              matchesByGroup[groupName].push(match);
            });

            return Object.entries(matchesByGroup).map(([groupName, matches]) => (
              <div key={groupName} style={{ marginBottom: '25px' }}>
                <h4 style={{ 
                  marginBottom: '15px', 
                  paddingBottom: '8px', 
                  borderBottom: '2px solid #e2e8f0',
                  color: '#1e293b'
                }}>
                  {groupName}
                </h4>
                
                <div style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ width: '100px' }}>Match</th>
                        <th>Players</th>
                        <th style={{ width: '120px' }}>Status</th>
                        <th style={{ width: '200px' }}>Assigned Board</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map((match, idx) => (
                        <tr key={match.id}>
                          <td><strong>Match {idx + 1}</strong></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{(match as any).player1?.name || 'TBD'}</span>
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>vs</span>
                              <span>{(match as any).player2?.name || 'TBD'}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              background: match.status === 'completed' ? '#dcfce7' : match.status === 'in-progress' ? '#fef3c7' : '#f1f5f9',
                              color: match.status === 'completed' ? '#166534' : match.status === 'in-progress' ? '#854d0e' : '#64748b'
                            }}>
                              {match.status}
                            </span>
                          </td>
                          <td>
                            <select
                              className="input"
                              value={groupMatchBoardAssignments[match.id] || match.board_id || ''}
                              onChange={(e) => handleGroupMatchBoardAssignment(match.id, e.target.value)}
                              style={{ maxWidth: '200px' }}
                            >
                              <option value="">Unassigned</option>
                              {boards.map(b => (
                                <option key={b.id} value={b.id}>
                                  Board {b.board_number}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ));
          })()}

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              className="button button-primary"
              onClick={saveAssignments}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Match Board Assignments'}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {groups.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#64748b' }}>
            Create groups first before assigning boards.<br />
            <button
              className="button button-primary"
              onClick={() => navigate(`/tournament/${id}/registration`)}
              style={{ marginTop: '15px' }}
            >
              Go to Registration
            </button>
          </p>
        </div>
      )}

      {boards.length === 0 && groups.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: '#64748b' }}>
            Add boards above to start assigning them to groups.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="card" style={{ background: '#f0f9ff', border: '1px solid #bfdbfe' }}>
        <h4 style={{ marginBottom: '10px', color: '#1e40af' }}>
          <ArrowRight size={18} style={{ display: 'inline', marginRight: '8px' }} />
          Board Assignment Guidelines
        </h4>
        <ul style={{ marginLeft: '20px', color: '#1e40af', fontSize: '14px', lineHeight: '1.8' }}>
          <li>Assign boards based on group size and available space</li>
          <li>Small groups (2-3 players): 1 board recommended</li>
          <li>Medium groups (4-6 players): 2 boards recommended</li>
          <li>Large groups (7+ players): Use floor(groupSize / 2) boards</li>
          <li>The system uses balanced board rotation: (matchIndex + round) mod TotalBoards + 1</li>
          <li>This ensures every player plays on every board approximately equally</li>
        </ul>
      </div>
    </div>
  );
}
