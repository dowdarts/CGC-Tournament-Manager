/**
 * Round-Robin Scheduling Utility
 * Implements balanced group distribution and fair board rotation
 */

export interface Match {
  round: number;
  player1: string;
  player2: string;
  board: number;
  player1_id?: string;
  player2_id?: string;
}

export interface GroupDistribution {
  groupSizes: number[];
  baseSize: number;
  largerGroups: number;
}

/**
 * Calculate balanced group distribution
 * Ensures no group has more than 1 player difference from others
 */
export function calculateGroupDistribution(totalPlayers: number, totalGroups: number): GroupDistribution {
  const baseSize = Math.floor(totalPlayers / totalGroups);
  const remainder = totalPlayers % totalGroups;
  
  const groupSizes: number[] = [];
  for (let i = 0; i < totalGroups; i++) {
    // First 'remainder' groups get an extra player
    groupSizes.push(i < remainder ? baseSize + 1 : baseSize);
  }
  
  return {
    groupSizes,
    baseSize,
    largerGroups: remainder
  };
}

/**
 * Generate round-robin matches with balanced board rotation
 * Uses Circle Method (fix one player, rotate others)
 * Board Assignment: (i + r) mod TotalBoards + 1
 * 
 * @param players - Array of player names
 * @param playerIds - Array of player IDs corresponding to players
 * @param totalBoards - Number of boards available for the group
 * @param specificByePlayer - Optional: player who should get bye in final round (for 5-player groups)
 * @returns Array of matches with round, players, and board assignments
 */
export function generateRoundRobin(
  players: string[],
  playerIds: string[],
  totalBoards: number = 2,
  specificByePlayer?: string
): Match[] {
  if (players.length < 2) {
    return []; // Need at least 2 players for matches
  }
  
  let participants = [...players];
  let participantIds = [...playerIds];
  const hasBye = participants.length % 2 === 1;
  const byeToken = 'BYE';
  
  // Normalize odd groups by adding a bye
  if (hasBye) {
    // For 5-player groups, arrange so specific player gets bye last
    if (participants.length === 5 && specificByePlayer) {
      const specificIndex = participants.indexOf(specificByePlayer);
      if (specificIndex !== -1) {
        // Move specific player to end so they get bye in round 5
        participants = [
          ...participants.slice(0, specificIndex),
          ...participants.slice(specificIndex + 1),
          participants[specificIndex]
        ];
        participantIds = [
          ...participantIds.slice(0, specificIndex),
          ...participantIds.slice(specificIndex + 1),
          participantIds[specificIndex]
        ];
      }
    }
    
    participants.push(byeToken);
    participantIds.push('BYE');
  }
  
  const n = participants.length;
  const rounds = n - 1;
  const matchesPerRound = Math.floor(n / 2);
  const matches: Match[] = [];
  
  console.log(`Round-Robin Setup: ${players.length} players, ${hasBye ? 'ODD (bye added)' : 'EVEN'}`);
  console.log(`  Participants (with bye): ${n}, Rounds: ${rounds}, Match slots per round: ${matchesPerRound}`);
  
  // Ensure we have at least 1 board
  const boards = Math.max(1, totalBoards);
  
  // Circle Method: Fix first player, rotate others clockwise
  for (let round = 0; round < rounds; round++) {
    for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex++) {
      let home: number, away: number;
      
      if (matchIndex === 0) {
        // Fixed player (position 0) always in first match of each round
        home = 0;
        away = round + 1;
      } else {
        // Rotating players - clockwise rotation
        home = ((round + 1 - matchIndex) % (n - 1)) + 1;
        away = ((round + matchIndex) % (n - 1)) + 1;
      }
      
      const player1 = participants[home];
      const player2 = participants[away];
      
      // Skip bye matches
      if (player1 === byeToken || player2 === byeToken) {
        const byePlayer = player1 === byeToken ? player2 : player1;
        console.log(`  Round ${round + 1}, Slot ${matchIndex + 1}: ${byePlayer} has BYE`);
        continue;
      }
      
      // Balanced Board Rotation: (matchIndex + round) mod TotalBoards + 1
      // This ensures even the "fixed" player rotates through all boards
      const board = ((matchIndex + round) % boards) + 1;
      
      matches.push({
        round: round + 1,
        player1,
        player2,
        board,
        player1_id: participantIds[home],
        player2_id: participantIds[away]
      });
      
      console.log(`  Round ${round + 1}, Match ${matchIndex + 1}: ${player1} vs ${player2} on Board ${board}`);
    }
  }
  
  console.log(`Total matches created: ${matches.length}`);
  return matches;
}

/**
 * Distribute players into balanced groups
 * Returns array of player arrays, one per group
 */
export function distributePlayersIntoGroups(
  players: { id: string; name: string }[],
  numGroups: number,
  shuffle: boolean = true
): { id: string; name: string }[][] {
  let playerList = [...players];
  
  // Shuffle if requested
  if (shuffle) {
    playerList = playerList.sort(() => Math.random() - 0.5);
  }
  
  const distribution = calculateGroupDistribution(playerList.length, numGroups);
  const groups: { id: string; name: string }[][] = [];
  
  let playerIndex = 0;
  for (let i = 0; i < numGroups; i++) {
    const groupSize = distribution.groupSizes[i];
    groups.push(playerList.slice(playerIndex, playerIndex + groupSize));
    playerIndex += groupSize;
  }
  
  return groups;
}

/**
 * Generate all matches for multiple groups
 * Each group gets its own board allocation based on group size
 * 
 * @param groups - Array of player groups
 * @param boardsPerGroup - Number of boards allocated to each group (can be array for per-group allocation)
 * @returns Array of group match schedules with board assignments
 */
export function generateGroupStageMatches(
  groups: { id: string; name: string }[][],
  boardsPerGroup: number | number[] = 2
): { groupIndex: number; groupLetter: string; matches: Match[] }[] {
  const allGroupMatches: { groupIndex: number; groupLetter: string; matches: Match[] }[] = [];
  
  groups.forEach((group, index) => {
    const playerNames = group.map(p => p.name);
    const playerIds = group.map(p => p.id);
    
    // Determine boards for this group
    const groupBoards = Array.isArray(boardsPerGroup) 
      ? boardsPerGroup[index] || 2 
      : boardsPerGroup;
    
    // Calculate optimal board count based on group size
    // For small groups (2-3 players), 1 board is sufficient
    // For medium groups (4-6 players), 2 boards recommended
    // For large groups (7+ players), use Math.floor(groupSize / 2) boards
    const optimalBoards = group.length <= 3 ? 1 : 
                         group.length <= 6 ? 2 : 
                         Math.floor(group.length / 2);
    
    const boardsToUse = Math.min(groupBoards, optimalBoards);
    
    // For 5-player groups, last player gets bye in final round
    const specificByePlayer = group.length === 5 ? playerNames[4] : undefined;
    
    const matches = generateRoundRobin(playerNames, playerIds, boardsToUse, specificByePlayer);
    
    allGroupMatches.push({
      groupIndex: index,
      groupLetter: String.fromCharCode(65 + index), // A, B, C, etc.
      matches
    });
  });
  
  return allGroupMatches;
}

/**
 * Get player who should have bye in a specific round (for odd groups)
 */
export function getByePlayer(players: string[], round: number): string | null {
  if (players.length % 2 === 0) return null;
  
  // In circle method with bye, the bye rotates through positions
  const n = players.length;
  const byeIndex = (round - 1) % n;
  
  return players[byeIndex];
}

/**
 * Validate group distribution fairness
 */
export function validateGroupDistribution(groupSizes: number[]): boolean {
  if (groupSizes.length === 0) return true;
  
  const max = Math.max(...groupSizes);
  const min = Math.min(...groupSizes);
  
  // No group should differ by more than 1
  return (max - min) <= 1;
}

/**
 * Debug utility: Print round-robin schedule with board assignments
 * Useful for verifying balanced board rotation
 */
export function printRoundRobinSchedule(
  players: string[],
  totalBoards: number = 2
): void {
  const playerIds = players.map((_, i) => `player-${i}`);
  const matches = generateRoundRobin(players, playerIds, totalBoards);
  
  console.log(`\n=== Round-Robin Schedule ===`);
  console.log(`Players: ${players.length}, Boards: ${totalBoards}`);
  console.log(`Total Matches: ${matches.length}\n`);
  
  const maxRound = Math.max(...matches.map(m => m.round));
  
  for (let r = 1; r <= maxRound; r++) {
    const roundMatches = matches.filter(m => m.round === r);
    console.log(`Round ${r}:`);
    roundMatches.forEach(m => {
      console.log(`  Board ${m.board}: ${m.player1} vs ${m.player2}`);
    });
    console.log('');
  }
  
  // Board usage statistics
  const boardUsage = new Map<number, number>();
  const playerBoardUsage = new Map<string, Map<number, number>>();
  
  matches.forEach(m => {
    // Track overall board usage
    boardUsage.set(m.board, (boardUsage.get(m.board) || 0) + 1);
    
    // Track per-player board usage
    [m.player1, m.player2].forEach(player => {
      if (!playerBoardUsage.has(player)) {
        playerBoardUsage.set(player, new Map());
      }
      const playerBoards = playerBoardUsage.get(player)!;
      playerBoards.set(m.board, (playerBoards.get(m.board) || 0) + 1);
    });
  });
  
  console.log('=== Board Usage Statistics ===');
  console.log('Overall:');
  boardUsage.forEach((count, board) => {
    console.log(`  Board ${board}: ${count} matches`);
  });
  
  console.log('\nPer Player:');
  playerBoardUsage.forEach((boards, player) => {
    const boardCounts = Array.from(boards.entries())
      .map(([board, count]) => `Board ${board}:${count}`)
      .join(', ');
    console.log(`  ${player}: ${boardCounts}`);
  });
  console.log('');
}

