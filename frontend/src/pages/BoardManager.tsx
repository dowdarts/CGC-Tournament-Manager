import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament';
import { BoardService, GroupService } from '@/services/api';
import { Board, Group } from '@/types';
import { Trash2, Plus, Grid, ArrowRight } from 'lucide-react';

interface GroupWithBoards extends Group {
  assignedBoards: number[];
}

export default function BoardManager() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentTournament } = useTournamentStore();
  
  const [boards, setBoards] = useState<Board[]>([]);
  const [groups, setGroups] = useState<GroupWithBoards[]>([]);
  const [newBoardCount, setNewBoardCount] = useState(0);
  const [boardGroupAssignments, setBoardGroupAssignments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const [boardsData, groupsData] = await Promise.all([
        BoardService.getBoards(id),
        GroupService.getGroups(id)
      ]);
      
      setBoards(boardsData);
      
      // Process groups and their board assignments
      const groupsWithBoards: GroupWithBoards[] = groupsData.map(group => ({
        ...group,
        assignedBoards: []
      }));
      
      setGroups(groupsWithBoards);
      
      // Load saved assignments from localStorage
      const savedAssignments = localStorage.getItem(`board-assignments-${id}`);
      if (savedAssignments) {
        setBoardGroupAssignments(JSON.parse(savedAssignments));
      } else {
        // Initialize empty assignments
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

  const handleAddBoards = async () => {
    if (!id || newBoardCount < 1) return;
    
    try {
      // Get the current max board number
      const maxBoardNumber = boards.length > 0 
        ? Math.max(...boards.map(b => b.board_number))
        : 0;
      
      // Create new boards starting from the next number
      const newBoards = Array.from({ length: newBoardCount }, (_, i) => ({
        tournament_id: id,
        board_number: maxBoardNumber + i + 1,
        status: 'available' as const
      }));
      
      await BoardService.createBoardsBatch(id, newBoards);
      setNewBoardCount(0);
      await loadData();
    } catch (error) {
      console.error('Error creating boards:', error);
      alert('Failed to create boards');
    }
  };

  const handleBoardAssignment = (boardId: string, groupId: string) => {
    setBoardGroupAssignments(prev => ({
      ...prev,
      [boardId]: groupId
    }));
  };

  const getGroupBoardCount = (groupId: string): number => {
    return Object.values(boardGroupAssignments).filter(gId => gId === groupId).length;
  };

  const saveAssignments = async () => {
    setSaving(true);
    try {
      localStorage.setItem(`board-assignments-${id}`, JSON.stringify(boardGroupAssignments));
      alert('Board assignments saved successfully!');
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert('Failed to save assignments');
    } finally {
      setSaving(false);
    }
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

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Grid size={28} />
          Board Manager
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

      {/* Board Assignment Section */}
      {groups.length > 0 && boards.length > 0 && (
        <div className="card" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Assign Boards to Groups</h3>
          
          {/* Group Summary */}
          <div style={{ marginBottom: '20px', padding: '15px', background: '#f8fafc', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Group Board Allocation</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {groups.map(group => (
                <div key={group.id} style={{ padding: '8px', background: '#fff', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{group.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>
                    Players: {group.player_ids.length} | Boards: {getGroupBoardCount(group.id)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Board List with Assignment */}
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
