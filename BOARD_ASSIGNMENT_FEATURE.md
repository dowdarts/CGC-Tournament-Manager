// KNOCKOUT BRACKET - BOARD ASSIGNMENT FEATURE
// This file documents the changes needed to add board assignment dropdown to knockout bracket matches

/*
CHANGES NEEDED:

1. Add loadBoards function to load boards from database
2. Add assignBoardToMatch function to save board assignments
3. Update match container to show:
   - Match number (e.g., "1-1" for Round 1 Match 1)
   - Board assignment dropdown with + button
4. Style the board dropdown

=== IMPLEMENTATION ===
*/

// Add to loadTournamentAndBracket function after loading tournament:
async function loadBoards() {
  const { data: boardsData, error } = await supabase
    .from('boards')
    .select('*')
    .eq('tournament_id', id)
    .order('board_number', { ascending: true });

  if (!error && boardsData) {
    setBoards(boardsData);
  }
}

// Add board assignment function
async function assignBoardToMatch(matchDbId: string, boardId: string | null) {
  if (!matchDbId) return;
  
  try {
    await supabase
      .from('matches')
      .update({ board_id: boardId })
      .eq('id', matchDbId);
    
    // Update local state
    setMatches(prev => {
      const matchKey = Object.keys(prev).find(key => prev[key].dbId === matchDbId);
      if (!matchKey) return prev;
      
      const board = boards.find(b => b.id === boardId);
      return {
        ...prev,
        [matchKey]: {
          ...prev[matchKey],
          boardId: boardId,
          boardNumber: board?.board_number || null
        }
      };
    });
    
    setShowBoardDropdown(null);
  } catch (error) {
    console.error('Error assigning board:', error);
    alert('Failed to assign board');
  }
}

/*
MATCH CONTAINER UPDATE:

Replace the match label div with:

<div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#64748b',
  padding: '8px 12px',
  borderRadius: '6px',
  marginBottom: '12px'
}}>
  {/* Match Number */}
  <div style={{
    fontSize: '12px',
    fontWeight: '600',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  }}>
    {match.round}-{match.matchNumber}
  </div>
  
  {/* Board Assignment Dropdown */}
  <div style={{ position: 'relative' }}>
    <button
      onClick={(e) => {
        e.stopPropagation();
        setShowBoardDropdown(showBoardDropdown === match.id ? null : match.id);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 8px',
        background: match.boardNumber ? '#22c55e' : '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: '600',
        cursor: 'pointer'
      }}
      title={match.boardNumber ? `Board ${match.boardNumber}` : 'Assign Board'}
    >
      {match.boardNumber ? `Board ${match.boardNumber}` : <Plus size={14} />}
    </button>
    
    {/* Dropdown */}
    {showBoardDropdown === match.id && (
      <div style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: '4px',
        background: '#1e293b',
        border: '2px solid #3b82f6',
        borderRadius: '6px',
        padding: '8px',
        minWidth: '120px',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginBottom: '6px',
          fontWeight: '600'
        }}>
          ASSIGN BOARD
        </div>
        {boards.map(board => (
          <button
            key={board.id}
            onClick={(e) => {
              e.stopPropagation();
              assignBoardToMatch(match.dbId!, board.id);
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: match.boardId === board.id ? '#3b82f6' : '#334155',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginBottom: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              textAlign: 'left'
            }}
          >
            Board {board.board_number}
          </button>
        ))}
        {match.boardId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              assignBoardToMatch(match.dbId!, null);
            }}
            style={{
              width: '100%',
              padding: '6px 8px',
              background: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              marginTop: '4px'
            }}
          >
            Clear Board
          </button>
        )}
      </div>
    )}
  </div>
</div>
*/
