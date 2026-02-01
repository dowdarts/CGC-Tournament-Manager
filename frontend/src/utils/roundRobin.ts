/**
 * Round-Robin Scheduling Utility
 * Implements balanced round-robin using standard Circle Method
 * 
 * Key Implementation: Odd-numbered groups (5, 7, 9, 11) use the next even schedule.
 * Any match involving a player number > actual group size is treated as a BYE.
 * 
 * Example: 5-player group uses 6-player schedule. Matches with Player 6 become BYEs.
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
 * Standard round-robin schedules for even-numbered groups (3-12 players)
 * Odd groups use the next even schedule (5→6, 7→8, 9→10, 11→12)
 * Format: [player1, player2] pairs (1-indexed)
 */
const ROUND_ROBIN_SCHEDULES: Record<number, { r: number; m: number[][]; bye?: number }[]> = {
  3: [
    { r: 1, m: [[2, 3]], bye: 1 },
    { r: 2, m: [[1, 2]], bye: 3 },
    { r: 3, m: [[3, 1]], bye: 2 }
  ],
  4: [
    { r: 1, m: [[1, 4], [2, 3]] },
    { r: 2, m: [[4, 3], [1, 2]] },
    { r: 3, m: [[2, 4], [3, 1]] }
  ],
  6: [
    { r: 1, m: [[1, 6], [2, 5], [3, 4]] },
    { r: 2, m: [[6, 4], [5, 3], [1, 2]] },
    { r: 3, m: [[2, 6], [3, 1], [4, 5]] },
    { r: 4, m: [[6, 5], [1, 4], [2, 3]] },
    { r: 5, m: [[3, 6], [4, 2], [5, 1]] }
  ],
  8: [
    { r: 1, m: [[1, 8], [2, 7], [3, 6], [4, 5]] },
    { r: 2, m: [[8, 5], [6, 4], [7, 3], [1, 2]] },
    { r: 3, m: [[2, 8], [3, 1], [4, 7], [5, 6]] },
    { r: 4, m: [[8, 6], [7, 5], [1, 4], [2, 3]] },
    { r: 5, m: [[3, 8], [4, 2], [5, 1], [6, 7]] },
    { r: 6, m: [[8, 7], [1, 6], [2, 5], [3, 4]] },
    { r: 7, m: [[4, 8], [5, 3], [6, 2], [7, 1]] }
  ],
  10: [
    { r: 1, m: [[1, 10], [2, 9], [3, 8], [4, 7], [5, 6]] },
    { r: 2, m: [[10, 6], [7, 5], [8, 4], [9, 3], [1, 2]] },
    { r: 3, m: [[2, 10], [3, 1], [4, 9], [5, 8], [6, 7]] },
    { r: 4, m: [[10, 7], [8, 6], [9, 5], [1, 4], [2, 3]] },
    { r: 5, m: [[3, 10], [4, 2], [5, 1], [6, 9], [7, 8]] },
    { r: 6, m: [[10, 8], [9, 7], [1, 6], [2, 5], [3, 4]] },
    { r: 7, m: [[4, 10], [5, 3], [6, 2], [7, 1], [8, 9]] },
    { r: 8, m: [[10, 9], [1, 8], [2, 7], [3, 6], [4, 5]] },
    { r: 9, m: [[5, 10], [6, 4], [7, 3], [8, 2], [9, 1]] }
  ],
  12: [
    { r: 1, m: [[1, 12], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]] },
    { r: 2, m: [[12, 7], [8, 6], [9, 5], [10, 4], [11, 3], [1, 2]] },
    { r: 3, m: [[2, 12], [3, 1], [4, 11], [5, 10], [6, 9], [7, 8]] },
    { r: 4, m: [[12, 8], [9, 7], [10, 6], [11, 5], [1, 4], [2, 3]] },
    { r: 5, m: [[3, 12], [4, 2], [5, 1], [6, 11], [7, 10], [8, 9]] },
    { r: 6, m: [[12, 9], [10, 8], [11, 7], [1, 6], [2, 5], [3, 4]] },
    { r: 7, m: [[4, 12], [5, 3], [6, 2], [7, 1], [8, 11], [9, 10]] },
    { r: 8, m: [[12, 10], [11, 9], [1, 8], [2, 7], [3, 6], [4, 5]] },
    { r: 9, m: [[5, 12], [6, 4], [7, 3], [8, 2], [9, 1], [10, 11]] },
    { r: 10, m: [[12, 11], [1, 10], [2, 9], [3, 8], [4, 7], [5, 6]] },
    { r: 11, m: [[6, 12], [7, 5], [8, 4], [9, 3], [10, 2], [11, 1]] }
  ]
};

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
 * Generate round-robin matches with specific board numbers
 * Uses the assigned board numbers in sequential order for each round
 * 
 * @param players - Array of player names
 * @param playerIds - Array of corresponding player IDs
 * @param boardNumbers - Array of specific board numbers to use (e.g., [1, 2] or [4, 5])
 * @returns Array of matches with specific board assignments
 */
function generateRoundRobinWithBoards(
  players: string[],
  playerIds: string[],
  boardNumbers: number[]
): Match[] {
  if (players.length !== playerIds.length) {
    throw new Error('Players and playerIds arrays must have the same length');
  }
  
  if (players.length < 2) {
    console.log('⚠️ Cannot generate matches: need at least 2 players');
    return [];
  }
  
  // Use sorted board numbers to ensure lowest to highest assignment
  const sortedBoards = [...boardNumbers].sort((a, b) => a - b);
  const totalBoards = sortedBoards.length || 1;
  
  console.log(`🎯 Round-Robin: ${players.length} players, Boards: [${sortedBoards.join(', ')}]`);
  
  // Use optimized schedule for common group sizes
  const effectiveSize = players.length % 2 === 0 ? players.length : players.length + 1;
  const schedule = ROUND_ROBIN_SCHEDULES[effectiveSize];
  
  if (schedule) {
    return generateOptimizedRoundRobinWithBoards(players, playerIds, schedule, sortedBoards, players.length);
  } else {
    return generateBasicRoundRobinWithBoards(players, playerIds, sortedBoards);
  }
}

/**
 * Generate round-robin using optimized schedules with specific board numbers
 */
function generateOptimizedRoundRobinWithBoards(
  players: string[],
  playerIds: string[],
  schedule: { r: number; m: number[][]; bye?: number }[],
  boardNumbers: number[],
  actualPlayerCount: number
): Match[] {
  const matches: Match[] = [];
  const totalBoards = boardNumbers.length;
  
  console.log(`📋 Using optimized schedule for ${players.length} players (${schedule.length} rounds)`);
  
  let matchIndex = 0; // Track board assignment across ALL rounds
  
  schedule.forEach((round, roundIndex) => {
    const actualRound = roundIndex + 1;
    
    console.log(`  Round ${actualRound}:`);
    
    round.m.forEach(([p1, p2]) => {
      // Convert from 1-indexed to 0-indexed and handle BYEs for odd groups
      const player1Index = p1 - 1;
      const player2Index = p2 - 1;
      
      // Skip matches involving players beyond actual count (BYE scenarios)
      if (player1Index >= actualPlayerCount || player2Index >= actualPlayerCount) {
        const byePlayer = player1Index < actualPlayerCount ? players[player1Index] : players[player2Index];
        console.log(`    BYE: ${byePlayer}`);
        return;
      }
      
      const player1Name = players[player1Index];
      const player2Name = players[player2Index];
      const player1Id = playerIds[player1Index];
      const player2Id = playerIds[player2Index];
      
      // Assign board using sequential assignment within the group's allocated boards
      const boardIndex = matchIndex % totalBoards;
      const boardNumber = boardNumbers[boardIndex];
      
      matches.push({
        round: actualRound,
        player1: player1Name,
        player2: player2Name,
        board: boardNumber,
        player1_id: player1Id,
        player2_id: player2Id
      });
      
      console.log(`    Board ${boardNumber}: ${player1Name} vs ${player2Name}`);
      matchIndex++;
    });
  });
  
  return matches;
}

/**
 * Fallback basic round-robin generator with specific board numbers
 */
function generateBasicRoundRobinWithBoards(
  players: string[],
  playerIds: string[],
  boardNumbers: number[]
): Match[] {
  let participants = [...players];
  let participantIds = [...playerIds];
  const hasBye = participants.length % 2 === 1;
  const byeToken = 'BYE';
  const totalBoards = boardNumbers.length;
  
  if (hasBye) {
    participants.push(byeToken);
    participantIds.push('BYE');
  }
  
  const n = participants.length;
  const rounds = n - 1;
  const matchesPerRound = Math.floor(n / 2);
  const matches: Match[] = [];
  
  console.log(`Basic Round-Robin: ${players.length} players, Boards: [${boardNumbers.join(', ')}], ${hasBye ? 'ODD (bye added)' : 'EVEN'}`);
  
  let matchIndex = 0; // Track board assignment across ALL rounds
  
  for (let round = 0; round < rounds; round++) {
    for (let matchNum = 0; matchNum < matchesPerRound; matchNum++) {
      let home: number, away: number;
      
      if (matchNum === 0) {
        home = 0;
        away = round + 1;
      } else {
        const offset1 = n - 1 - matchNum;
        const offset2 = matchNum;
        home = ((offset1 + round - 1) % (n - 1)) + 1;
        away = ((offset2 + round - 1) % (n - 1)) + 1;
      }
      
      const player1 = participants[home];
      const player2 = participants[away];
      
      if (player1 === byeToken || player2 === byeToken) {
        const byePlayer = player1 === byeToken ? player2 : player1;
        console.log(`  Round ${round + 1}, Bye: ${byePlayer}`);
        continue;
      }
      
      // Use specific board numbers in sequential order
      const boardIndex = matchIndex % totalBoards;
      const boardNumber = boardNumbers[boardIndex];
      
      matches.push({
        round: round + 1,
        player1,
        player2,
        board: boardNumber,
        player1_id: participantIds[home],
        player2_id: participantIds[away]
      });
      
      matchIndex++;
    }
  }
  
  return matches;
}

/**
 * Generate round-robin matches using standard Circle Method schedules
 * Odd groups (5, 7, 9, 11) use next even schedule - matches with ghost player become BYEs
 * 
 * @param players - Array of player names
 * @param playerIds - Array of player IDs corresponding to players
 * @param totalBoards - Number of boards available for rotation
 * @returns Array of matches with round, players, and board assignments
 */
export function generateRoundRobin(
  players: string[],
  playerIds: string[],
  totalBoards: number = 2
): Match[] {
  if (players.length < 2) {
    return [];
  }

  const actualPlayerCount = players.length;
  
  // Odd groups use next even schedule (5→6, 7→8, 9→10, 11→12)
  const scheduleSize = actualPlayerCount % 2 === 0 ? actualPlayerCount : actualPlayerCount + 1;
  
  if (!ROUND_ROBIN_SCHEDULES[scheduleSize]) {
    console.warn(`No schedule for ${actualPlayerCount} players, falling back to basic algorithm`);
    return generateBasicRoundRobin(players, playerIds, totalBoards);
  }

  const schedule = ROUND_ROBIN_SCHEDULES[scheduleSize];
  const matches: Match[] = [];
  const boards = Math.max(1, totalBoards);
  
  // Track all matchups to detect duplicates (use sorted pair as key)
  const seenMatchups = new Set<string>();
  
  console.log(`Round-Robin Setup: ${actualPlayerCount} players${actualPlayerCount !== scheduleSize ? ` (using ${scheduleSize}-player schedule)` : ''}`);
  console.log(`  Rounds: ${schedule.length}, Boards available: ${boards}`);
  
  let matchCounter = 0;
  
  for (const roundData of schedule) {
    let roundHasBye = false;
    
    for (const [p1Num, p2Num] of roundData.m) {
      // Check if either player exceeds actual group size (ghost player = BYE)
      if (p1Num > actualPlayerCount || p2Num > actualPlayerCount) {
        const byePlayerNum = p1Num > actualPlayerCount ? p2Num : p1Num;
        const byePlayer = players[byePlayerNum - 1]; // Convert 1-indexed to 0-indexed
        console.log(`  Round ${roundData.r}, BYE: ${byePlayer}`);
        roundHasBye = true;
        continue;
      }
      
      // Create matchup key (sorted to catch duplicates regardless of order)
      const matchupKey = [p1Num, p2Num].sort((a, b) => a - b).join('-');
      
      // Check for duplicate matchup
      if (seenMatchups.has(matchupKey)) {
        console.error(`❌ DUPLICATE MATCH DETECTED: Player ${p1Num} vs Player ${p2Num} in Round ${roundData.r}`);
        console.error(`   This matchup already exists! Skipping duplicate.`);
        continue;
      }
      
      seenMatchups.add(matchupKey);
      
      // Both players are real - create match
      const player1 = players[p1Num - 1]; // Convert 1-indexed to 0-indexed
      const player2 = players[p2Num - 1];
      const player1_id = playerIds[p1Num - 1];
      const player2_id = playerIds[p2Num - 1];
      
      // Rotate boards: (matchCounter % totalBoards) + 1
      const board = (matchCounter % boards) + 1;
      matchCounter++;
      
      matches.push({
        round: roundData.r,
        player1,
        player2,
        board,
        player1_id,
        player2_id
      });
      
      console.log(`  Round ${roundData.r}: ${player1} vs ${player2} on Board ${board}`);
    }
  }
  
  const expectedMatches = actualPlayerCount * (actualPlayerCount - 1) / 2;
  console.log(`Total matches created: ${matches.length}`);
  console.log(`Expected matches: ${expectedMatches}`);
  
  if (matches.length !== expectedMatches) {
    console.warn(`⚠️ Match count mismatch! Created ${matches.length} but expected ${expectedMatches}`);
  } else {
    console.log(`✅ Match count validated - all players play each other exactly once`);
  }
  
  return matches;
}

/**
 * Fallback basic round-robin generator for player counts without optimal schedules
 */
function generateBasicRoundRobin(
  players: string[],
  playerIds: string[],
  totalBoards: number
): Match[] {
  let participants = [...players];
  let participantIds = [...playerIds];
  const hasBye = participants.length % 2 === 1;
  const byeToken = 'BYE';
  
  if (hasBye) {
    participants.push(byeToken);
    participantIds.push('BYE');
  }
  
  const n = participants.length;
  const rounds = n - 1;
  const matchesPerRound = Math.floor(n / 2);
  const matches: Match[] = [];
  const boards = Math.max(1, totalBoards);
  
  console.log(`Basic Round-Robin: ${players.length} players, ${hasBye ? 'ODD (bye added)' : 'EVEN'}`);
  
  let globalMatchCounter = 0; // Track board assignment across ALL rounds
  
  for (let round = 0; round < rounds; round++) {
    for (let matchIndex = 0; matchIndex < matchesPerRound; matchIndex++) {
      let home: number, away: number;
      
      if (matchIndex === 0) {
        home = 0;
        away = round + 1;
      } else {
        const offset1 = n - 1 - matchIndex;
        const offset2 = matchIndex;
        home = ((offset1 + round - 1) % (n - 1)) + 1;
        away = ((offset2 + round - 1) % (n - 1)) + 1;
      }
      
      const player1 = participants[home];
      const player2 = participants[away];
      
      if (player1 === byeToken || player2 === byeToken) {
        const byePlayer = player1 === byeToken ? player2 : player1;
        console.log(`  Round ${round + 1}, Bye: ${byePlayer}`);
        continue;
      }
      
      // Use global counter to rotate boards across all rounds
      const board = (globalMatchCounter % boards) + 1;
      globalMatchCounter++;
      
      matches.push({
        round: round + 1,
        player1,
        player2,
        board,
        player1_id: participantIds[home],
        player2_id: participantIds[away]
      });
    }
  }
  
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
 * Each group gets its own board allocation with specific board numbers
 * 
 * @param groups - Array of player groups
 * @param boardsPerGroup - Array of board numbers for each group (e.g., [[1,2], [4,5], [7,8]])
 * @returns Array of group match schedules with specific board assignments
 */
export function generateGroupStageMatches(
  groups: { id: string; name: string }[][],
  boardsPerGroup: number[][] = []
): { groupIndex: number; groupLetter: string; matches: Match[] }[] {
  const allGroupMatches: { groupIndex: number; groupLetter: string; matches: Match[] }[] = [];
  
  groups.forEach((group, index) => {
    const playerNames = group.map(p => p.name);
    const playerIds = group.map(p => p.id);
    
    // Get specific board numbers for this group
    const groupBoardNumbers = boardsPerGroup[index] || [1];
    
    const matches = generateRoundRobinWithBoards(playerNames, playerIds, groupBoardNumbers);
    
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

