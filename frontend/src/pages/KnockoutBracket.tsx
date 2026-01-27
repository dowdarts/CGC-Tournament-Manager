import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { Match, Player, Tournament } from "@/types";
import { Trophy, Printer, RotateCcw, X, RefreshCw, Plus, Send, PlayCircle, Edit3 } from "lucide-react";
import { TournamentService, MatchService, PlayerService } from "@/services/api";
import { EmailService } from "@/services/EmailService";

interface BracketMatch {
  id: string;
  p1: string | null;
  p2: string | null;
  s1: string;
  s2: string;
  p1Id: string | null;
  p2Id: string | null;
  p1Rank?: number; // Round robin rank for player 1 (preserved through bracket)
  p2Rank?: number; // Round robin rank for player 2 (preserved through bracket)
  p1Group?: string; // Group letter for player 1 (preserved through bracket)
  p2Group?: string; // Group letter for player 2 (preserved through bracket)
  winnerId: string | null;
  nextMatchId: string | null;
  slot: "p1" | "p2" | null;
  label: string;
  round: number;
  matchNumber: number;
  dbId?: string; // Database match ID
  boardId?: string | null; // Assigned board ID
  boardNumber?: number | null; // Assigned board number
  status?: 'scheduled' | 'in-progress' | 'completed'; // Match status
}

interface GroupStanding {
  player: Player;
  rank: number;
  wins: number;
  losses: number;
  legDifferential: number;
  points: number;
}

interface GroupStandings {
  [groupLetter: string]: {
    groupId: string;
    groupLetter: string;
    standings: GroupStanding[];
  };
}

interface RoundFormat {
  round: number;
  roundName: string;
  legsToWin: number;
  format: string; // e.g., "Best of 3", "Best of 5", etc.
}

const KnockoutBracket: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<{ [key: string]: BracketMatch }>({});
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [boards, setBoards] = useState<any[]>([]);
  const [showBoardDropdown, setShowBoardDropdown] = useState<string | null>(
    null,
  );
  const [roundFormats, setRoundFormats] = useState<{
    [round: number]: RoundFormat;
  }>({});
  const [showRoundFormatModal, setShowRoundFormatModal] = useState(false);
  const [editingRound, setEditingRound] = useState<number | null>(null);
  const [boardCallMatch, setBoardCallMatch] = useState<BracketMatch | null>(null);
  const [selectedBoard, setSelectedBoard] = useState('');
  const [sendingBoardCall, setSendingBoardCall] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [autoBoardAssignmentEnabled, setAutoBoardAssignmentEnabled] = useState(false);
  const [draggedPlayer, setDraggedPlayer] = useState<{ matchId: string; playerPosition: 'p1' | 'p2' } | null>(null);
  const [viewMode, setViewMode] = useState<'bracket' | 'round'>('bracket');
  const [selectedRoundView, setSelectedRoundView] = useState<number>(1);

  // Use the existing helpMode from TournamentLayout (stored in localStorage)
  const helpMode = localStorage.getItem("helpMode") === "true";

  // Reset board call modal state on mount
  useEffect(() => {
    setBoardCallMatch(null);
    setSelectedBoard('');
    setSendingBoardCall(false);
  }, []);

  // Initialize or Load Bracket
  useEffect(() => {
    if (id) {
      loadTournamentAndBracket();
    }
  }, [id]);

  // Autosave whenever matches change
  useEffect(() => {
    if (Object.keys(matches).length > 0 && !loading) {
      localStorage.setItem(`tournament_bracket_${id}`, JSON.stringify(matches));
      // Save to database
      saveBracketToDatabase();
    }
  }, [matches, id, loading]);

  // Load players
  useEffect(() => {
    if (id) {
      loadPlayers();
    }
  }, [id]);

  // Close board dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showBoardDropdown) {
        setShowBoardDropdown(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showBoardDropdown]);

  const loadPlayers = async () => {
    if (!id) return;
    console.log('🔄 Loading players for tournament:', id);
    try {
      const playersData = await PlayerService.getPlayers(id);
      console.log('✅ Players loaded:', playersData.length, 'players');
      console.log('Players data:', playersData);
      setPlayers(playersData);
      console.log('Players state updated');
    } catch (error) {
      console.error('❌ Failed to load players:', error);
    }
  };

  const loadTournamentAndBracket = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Load tournament data
      const tournamentData = await TournamentService.getTournament(id);
      setTournament(tournamentData);
      console.log("🏆 Tournament loaded:", tournamentData);

      // Load boards
      const { data: boardsData } = await supabase
        .from("boards")
        .select("*")
        .eq("tournament_id", id)
        .order("board_number", { ascending: true });

      if (boardsData) {
        setBoards(boardsData);
      }

      // Check if bracket was already generated
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", id)
        .is("group_id", null);

      console.log(
        "🎯 Knockout matches found:",
        existingMatches?.length || 0,
        existingMatches,
      );

      if (existingMatches && existingMatches.length > 0) {
        // Load from database
        console.log(
          "🗄️ Loading existing matches from database:",
          existingMatches,
        );
        await loadBracketFromDatabase(existingMatches, boardsData || []);

        // NOTE: group_standings table doesn't exist - this feature is disabled for now
        // Load CURRENT tournament's group standings from database
        // console.log(
        //   "📊 Loading current tournament group standings from database",
        // );
        // const { data: currentStandings } = await supabase
        //   .from("group_standings")
        //   .select(
        //     `
        //     *,
        //     player:players(id, name),
        //     group:groups(id, name, group_letter)
        //   `,
        //   )
        //   .eq("tournament_id", id)
        //   .order("points", { ascending: false })
        //   .order("legs_difference", { ascending: false });

        // if (currentStandings && currentStandings.length > 0) {
        //   // Build standings object from database
        //   const standings: GroupStandings = {};
        //   currentStandings.forEach((standing: any) => {
        //     const groupLetter = standing.group.group_letter;
        //     if (!standings[groupLetter]) {
        //       standings[groupLetter] = {
        //         groupId: standing.group.id,
        //         groupLetter: groupLetter,
        //         standings: [],
        //       };
        //     }
        //   });

        //   // Add players with ranks
        //   currentStandings.forEach((standing: any) => {
        //     const groupLetter = standing.group.group_letter;
        //     const currentRank = standings[groupLetter].standings.length + 1;
        //     standings[groupLetter].standings.push({
        //       player: standing.player,
        //       rank: currentRank,
        //       wins: standing.wins || 0,
        //       losses: standing.losses || 0,
        //       legDifferential: standing.legs_difference || 0,
        //       points: standing.points || 0,
        //     });
        //   });

        //   console.log("✅ Loaded current standings from database:", standings);
        //   await applyRankingsToExistingBracket(standings);
        // }
      } else {
        // Load standings from database for new bracket generation
        // NOTE: group_standings table doesn't exist - this feature is disabled for now
        // console.log(
        //   "📊 Loading standings from database for bracket generation",
        // );
        // const { data: currentStandings } = await supabase
        //   .from("group_standings")
        //   .select(
        //     `
        //     *,
        //     player:players(id, name),
        //     group:groups(id, name, group_letter)
        //   `,
        //   )
        //   .eq("tournament_id", id)
        //   .order("points", { ascending: false })
        //   .order("legs_difference", { ascending: false });

        // if (currentStandings && currentStandings.length > 0) {
        //   // Build standings object from database
        //   const standings: GroupStandings = {};
        //   currentStandings.forEach((standing: any) => {
        //     const groupLetter = standing.group.group_letter;
        //     if (!standings[groupLetter]) {
        //       standings[groupLetter] = {
        //         groupId: standing.group.id,
        //         groupLetter: groupLetter,
        //         standings: [],
        //       };
        //     }
        //   });

        //   // Add players with ranks
        //   currentStandings.forEach((standing: any) => {
        //     const groupLetter = standing.group.group_letter;
        //     const currentRank = standings[groupLetter].standings.length + 1;
        //     standings[groupLetter].standings.push({
        //       player: standing.player,
        //       rank: currentRank,
        //       wins: standing.wins || 0,
        //       losses: standing.losses || 0,
        //       legDifferential: standing.legs_difference || 0,
        //       points: standing.points || 0,
        //     });
        //   });

        //   console.log("✅ Loaded standings from database, generating bracket");
        //   generateSeeding(standings);
        // } else {
        //   // No data available
        //   console.log("❌ No matches or standings found");
        //   setMatches({});
        // }
      }
    } catch (error) {
      console.error("Error loading bracket:", error);
      alert("Failed to load knockout bracket");
    } finally {
      setLoading(false);

      // Initialize round formats after bracket is loaded
      const maxRound = Math.max(
        ...Object.values(matches).map((m) => m.round),
        0,
      );
      if (maxRound > 0) {
        initializeRoundFormats(maxRound);
      }
    }
  };

  const loadBracketFromDatabase = async (dbMatches: any[], boardsData: any[]) => {
    // Convert database matches to bracket match format
    const bracketMatches: { [key: string]: BracketMatch } = {};

    console.log('🔄 Loading bracket from database, matches:', dbMatches.length);
    console.log('Sample database match:', dbMatches[0]);

    // Get all players
    const playerIds = new Set<string>();
    dbMatches.forEach((m) => {
      if (m.player1_id) playerIds.add(m.player1_id);
      if (m.player2_id) playerIds.add(m.player2_id);
      if (m.winner_id) playerIds.add(m.winner_id);
    });

    console.log('📋 Player IDs from matches:', Array.from(playerIds));

    const { data: players } = await supabase
      .from("players")
      .select("id, name")
      .in("id", Array.from(playerIds));

    const playerMap = new Map(players?.map((p) => [p.id, p]) || []);

    // Sort by round to build bracket structure
    const sortedMatches = dbMatches.sort(
      (a, b) => (a.round_number || 0) - (b.round_number || 0),
    );

    // Group matches by round for proper bracket structure
    const dbMatchesByRound: { [round: number]: any[] } = {};
    sortedMatches.forEach((match) => {
      const round = match.round_number || 1;
      if (!dbMatchesByRound[round]) {
        dbMatchesByRound[round] = [];
      }
      dbMatchesByRound[round].push(match);
    });

    const totalMatches = sortedMatches.length;

    // Build match structure round by round
    Object.keys(dbMatchesByRound).forEach((roundStr) => {
      const round = parseInt(roundStr);
      const roundMatches = dbMatchesByRound[round];

      roundMatches.forEach((dbMatch, matchIndex) => {
        const matchInRound = matchIndex + 1;
        const matchId = generateMatchId(round, matchInRound);
        const nextRound = round + 1;
        const nextMatchId = dbMatchesByRound[nextRound]
          ? generateMatchId(nextRound, Math.ceil(matchInRound / 2))
          : null;
        const slot = matchInRound % 2 === 1 ? "p1" : "p2";

        bracketMatches[matchId] = {
          id: matchId,
          p1: dbMatch.player1_id
            ? playerMap.get(dbMatch.player1_id)?.name || "TBD"
            : "TBD",
          p2: dbMatch.player2_id
            ? playerMap.get(dbMatch.player2_id)?.name || "TBD"
            : "TBD",
          p1Id: dbMatch.player1_id,
          p2Id: dbMatch.player2_id,
          s1:
            dbMatch.player1_legs !== null &&
            dbMatch.player1_legs !== undefined &&
            dbMatch.player1_legs > 0
              ? dbMatch.player1_legs.toString()
              : "",
          s2:
            dbMatch.player2_legs !== null &&
            dbMatch.player2_legs !== undefined &&
            dbMatch.player2_legs > 0
              ? dbMatch.player2_legs.toString()
              : "",
          winnerId: dbMatch.winner_id,
          nextMatchId,
          slot,
          label: getRoundLabel(round, totalMatches, matchInRound),
          round,
          matchNumber: matchInRound,
          dbId: dbMatch.id,
          boardId: dbMatch.board_id,
          boardNumber:
            boardsData && boardsData.length > 0
              ? boardsData.find((b) => b.id === dbMatch.board_id)?.board_number || null
              : null,
          status: dbMatch.status || 'scheduled',
        };
      });
    });

    console.log('✅ Bracket matches created:', Object.keys(bracketMatches).length);
    console.log('Sample bracket match:', Object.values(bracketMatches)[0]);
    
    setMatches(bracketMatches);
  };

  const generateMatchId = (round: number, matchNumber: number): string => {
    return `r${round}m${matchNumber}`;
  };

  const getRoundLabel = (
    round: number,
    totalMatches: number,
    matchNumber: number,
  ): string => {
    const roundNames: { [key: number]: string } = {
      1: "Quarter-Final",
      2: "Semi-Final",
      3: "Final",
    };

    if (totalMatches <= 1) return "Final";
    if (totalMatches <= 3) return round === 1 ? "Semi-Final" : "Final";
    if (totalMatches <= 7) return roundNames[round] || `Round ${round}`;
    if (totalMatches <= 15)
      return round === 1
        ? "Round of 16"
        : roundNames[round - 1] || `Round ${round}`;

    return round === 1
      ? "First Round"
      : roundNames[round - 1] || `Round ${round}`;
  };

  const getRoundLabelDynamic = (
    round: number,
    totalRounds: number,
    matchNumber: number,
    roundMatches: number,
  ): string => {
    if (totalRounds === 1) return "Final";
    if (totalRounds === 2) return round === 1 ? "Semi-Final" : "Final";
    if (totalRounds === 3) {
      if (round === 1) return "Quarter-Final";
      if (round === 2) return "Semi-Final";
      return "Final";
    }
    if (totalRounds === 4) {
      if (round === 1) return "Round of 16";
      if (round === 2) return "Quarter-Final";
      if (round === 3) return "Semi-Final";
      return "Final";
    }

    // For larger tournaments
    if (round === totalRounds) return "Final";
    if (round === totalRounds - 1) return "Semi-Final";
    if (round === totalRounds - 2) return "Quarter-Final";
    if (round === 1) return `Round of ${Math.pow(2, totalRounds)}`;

    return `Round ${round}`;
  };

  /**
   * Get predetermined tournament seed for a bracket position
   * This creates the mapping of bracket positions to tournament seeds
   */
  const getTournamentSeedForPosition = (
    bracketPosition: number,
    totalPlayers: number,
  ): number => {
    // Standard tournament bracket seeding positions
    // Position 1 gets seed 1, position 2 gets highest seed, etc.
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalPlayers)));

    // Create standard tournament seed mapping for this bracket size
    const seedMapping: { [position: number]: number } = {};

    // First round pairing creates: 1v16, 8v9, 4v13, 5v12, 2v15, 7v10, 3v14, 6v11 (for 16-player bracket)
    // This translates to positions getting specific seeds
    for (let i = 1; i <= bracketSize / 2; i++) {
      const seed1 = i;
      const seed2 = bracketSize + 1 - i;

      // Position mapping for first round matches
      const matchPosition = i;
      const pos1 = (matchPosition - 1) * 2 + 1; // Odd positions get lower seeds
      const pos2 = (matchPosition - 1) * 2 + 2; // Even positions get higher seeds

      if (pos1 <= totalPlayers) seedMapping[pos1] = seed1;
      if (pos2 <= totalPlayers && seed2 <= totalPlayers)
        seedMapping[pos2] = seed2;
    }

    return seedMapping[bracketPosition] || bracketPosition;
  };

  /**
   * Helper function to determine how many groups exist in the current tournament
   * Uses round-robin standings data for accurate count
   */
  const getNumberOfGroups = (): number => {
    // First try to get from round-robin standings data
    const standingsJson = localStorage.getItem("groupStandings");
    if (standingsJson) {
      try {
        const standings = JSON.parse(standingsJson);
        return Object.keys(standings).length;
      } catch (e) {
        console.warn("Could not parse group standings");
      }
    }

    // Fallback: detect from bracket matches
    const allGroupLetters = new Set<string>();
    Object.values(matches).forEach((match) => {
      if (match.p1Group) allGroupLetters.add(match.p1Group);
      if (match.p2Group) allGroupLetters.add(match.p2Group);
    });
    return allGroupLetters.size;
  };

  /**
   * Format seeding display based on tournament structure
   * Multiple groups: show group+rank (e.g., "A1", "B2")
   * Single group: show rank only (e.g., "#1", "#2")
   */
  const formatSeedDisplay = (
    group: string | undefined,
    rank: number | undefined,
  ): string => {
    if (!rank) return "";

    const numGroups = getNumberOfGroups();

    if (numGroups > 1 && group) {
      // Multiple groups: show group letter + rank
      return `${group}${rank}`;
    } else {
      // Single group or no group info: show rank number
      return `#${rank}`;
    }
  };

  /**
   * Apply ranking information to an existing bracket loaded from database
   * This reconstructs the seeding info that wasn't stored in the database
   */
  const applyRankingsToExistingBracket = async (standings: GroupStandings) => {
    console.log("🏅 Applying rankings to existing bracket");
    console.log("🔍 Raw standings data:", standings);

    const groups = Object.keys(standings).sort();
    console.log("📋 Groups found:", groups);

    // Parse advancement count from tournament rules
    let advancePerGroup = 2;
    if (tournament?.advancement_rules) {
      const match = tournament.advancement_rules.match(/Top (\d+)/i);
      if (match) {
        advancePerGroup = parseInt(match[1], 10);
      }
    }
    console.log("🎯 Players advancing per group:", advancePerGroup);

    // Create player ranking map: player name -> {rank, group}
    const playerRankingMap = new Map<string, { rank: number; group: string }>();

    // Debug: Show all standings for each group
    groups.forEach((groupLetter) => {
      const group = standings[groupLetter];
      console.log(
        `📊 Group ${groupLetter} standings:`,
        group.standings.map((s, idx) => ({
          position: idx + 1,
          name: s.player.name,
          rank: s.rank,
          points: s.points,
        })),
      );
    });

    for (let rank = 1; rank <= advancePerGroup; rank++) {
      groups.forEach((groupLetter) => {
        const standing = standings[groupLetter].standings[rank - 1];
        if (standing) {
          // Add multiple name variations to handle potential mismatches
          const playerName = standing.player.name;
          const nameVariations = [
            playerName,
            playerName.toLowerCase(),
            playerName.toUpperCase(),
            playerName.trim(),
            playerName.toLowerCase().trim(),
            playerName.toUpperCase().trim(),
          ];

          console.log(
            `🏷️ Adding ${groupLetter}${rank}: ${playerName} (position: ${rank}) with ${nameVariations.length} variations`,
          );

          nameVariations.forEach((nameVar) => {
            playerRankingMap.set(nameVar, {
              rank: rank,
              group: groupLetter,
            });
          });
        }
      });
    }

    console.log(
      "📋 Player ranking map:",
      Array.from(playerRankingMap.entries()),
    );

    // Update existing matches with ranking information
    setMatches((prevMatches) => {
      const updatedMatches = { ...prevMatches };

      Object.keys(updatedMatches).forEach((matchId) => {
        const match = updatedMatches[matchId];

        // Apply ranking info to player 1
        if (match.p1 && match.p1 !== "TBD" && match.p1 !== "BYE") {
          const p1Ranking = playerRankingMap.get(match.p1);
          if (p1Ranking) {
            match.p1Rank = p1Ranking.rank;
            match.p1Group = p1Ranking.group;
          }
        }

        // Apply ranking info to player 2
        if (match.p2 && match.p2 !== "TBD" && match.p2 !== "BYE") {
          const p2Ranking = playerRankingMap.get(match.p2);
          if (p2Ranking) {
            match.p2Rank = p2Ranking.rank;
            match.p2Group = p2Ranking.group;
          }
        }

        updatedMatches[matchId] = match;
      });

      console.log("✅ Applied rankings to bracket matches");
      return updatedMatches;
    });
  };

  const generateSeeding = (standings: GroupStandings) => {
    console.log("🎯 generateSeeding called with:", standings);

    const groups = Object.keys(standings).sort();
    console.log("📋 Groups found:", groups);

    // Parse advancement count from tournament rules instead of using all players
    let advancePerGroup = 2; // Default fallback
    if (tournament?.advancement_rules) {
      const match = tournament.advancement_rules.match(/Top (\d+)/i);
      if (match) {
        advancePerGroup = parseInt(match[1], 10);
      }
    }
    console.log("⬆️ Advancing per group (from rules):", advancePerGroup);
    console.log(
      "📜 Tournament advancement rules:",
      tournament?.advancement_rules,
    );

    // Collect advancing players with crossover seeding
    const advancingPlayers: Array<{
      player: Player;
      groupLetter: string;
      rank: number;
    }> = [];

    // Crossover seeding: Alternate groups, reverse ranks for pairing
    // For 2 groups: A1,A2,A3,A4, B1,B2,B3,B4 becomes pairs: A1-B4, A2-B3, A3-B2, A4-B1
    // For 4 groups: Similar pattern but across group pairs (A vs B, C vs D)

    for (let rank = 1; rank <= advancePerGroup; rank++) {
      groups.forEach((groupLetter) => {
        const standing = standings[groupLetter].standings[rank - 1];
        if (standing) {
          advancingPlayers.push({
            player: standing.player,
            groupLetter,
            rank,
          });
          console.log(
            `➕ Added player: ${standing.player.name} (${groupLetter}${rank})`,
          );
        }
      });
    }

    console.log("👥 All advancing players:", advancingPlayers);
    console.log(
      `🔢 Expected: ${groups.length} groups × ${advancePerGroup} players = ${groups.length * advancePerGroup} total advancing players`,
    );
    console.log(`🔢 Actual: ${advancingPlayers.length} advancing players`);

    // Generate single elimination bracket using proper algorithm
    const initialMatches: { [key: string]: BracketMatch } = {};
    generateSingleEliminationBracket(advancingPlayers, initialMatches);

    setMatches(initialMatches);
  };

  /**
   * Generate Single Elimination Bracket following proper tournament algorithms
   * Based on the provided specifications for handling byes and seeding
   */
  const generateSingleEliminationBracket = (
    participants: Array<{ player: Player; groupLetter: string; rank: number }>,
    matchesObj: { [key: string]: BracketMatch },
  ) => {
    const N = participants.length;
    console.log(
      `🏆 Generating single elimination bracket for ${N} participants`,
    );

    if (N < 2) {
      console.warn("⚠️ Need at least 2 participants for a bracket");
      return;
    }

    // 1. Find next power of 2 (P) greater than or equal to N
    const P = Math.pow(2, Math.ceil(Math.log2(N)));

    // 2. Calculate Byes = P - N
    const byes = P - N;
    console.log(`📊 Bracket size: ${P} slots, ${byes} byes needed`);

    // 3. Create seeded participants list with proper tournament seeding
    // Sort participants by their overall tournament ranking (group + rank)
    const seededParticipants = createTournamentSeeding(participants);
    console.log(
      "🏅 Seeded participants:",
      seededParticipants.map(
        (p) =>
          `${p.tournamentSeed}: ${p.player.name} (${p.groupLetter}${p.rank})`,
      ),
    );

    // 4. Generate Round 1 matches with proper bye distribution
    const round1Matches = generateRound1WithByes(seededParticipants, byes, P);

    // 5. Calculate total rounds needed
    const totalRounds = Math.ceil(Math.log2(P));
    console.log(`🔄 Total rounds needed: ${totalRounds}`);

    // 6. Generate all bracket rounds
    generateAllBracketRounds(round1Matches, totalRounds, matchesObj);

    console.log(`✅ Generated ${Object.keys(matchesObj).length} total matches`);
  };

  /**
   * Professional seeding algorithm used by DartConnect/PDC systems
   * Generates proper bracket seed order for any power of 2 size
   */
  const generateBracketSeedOrder = (size: number): number[] => {
    let seeds = [1, 2];
    while (seeds.length < size) {
      let nextLevel = [];
      for (let seed of seeds) {
        // Formula: (Current_Sum_of_Seeds) - Current_Seed
        // For any two opponents, their seeds sum to (Bracket_Size + 1)
        nextLevel.push(seed);
        nextLevel.push(seeds.length * 2 + 1 - seed);
      }
      seeds = nextLevel;
    }
    return seeds;
  };

  /**
   * Dynamic crossover logic for group-to-bracket assignment
   * Uses professional WDF/PDC standards for optimal bracket distribution
   */
  const createProfessionalCrossoverSeeding = (
    participants: any[],
    groups: string[],
  ) => {
    const numGroups = groups.length;
    const totalPlayers = participants.length;
    const playersPerGroup = totalPlayers / numGroups;

    // Generate professional bracket seed order (1v(n), 2v(n-1), etc.)
    const seedOrder = generateBracketSeedOrder(totalPlayers);

    // TRUE crossover: Same groups NEVER meet in first round
    const getPlayer = (group: string, rank: number) =>
      participants.find((p) => p.groupLetter === group && p.rank === rank);

    const seeded = [];

    if (numGroups === 2) {
      // 2 groups: TRUE crossover to separate group winners A1 and B1
      let crossoverOrder;

      if (totalPlayers === 4) {
        // For 4 players (2 from each group): A1 and B1 MUST be in different halves
        crossoverOrder = [
          { group: "A", rank: 1 }, // A1 = seed 1 (top half)
          { group: "B", rank: 2 }, // B2 = seed 4 (plays A1)
          { group: "A", rank: 2 }, // A2 = seed 2 (bottom half)
          { group: "B", rank: 1 }, // B1 = seed 3 (plays A2)
        ];
        // Creates: A1 vs B2, A2 vs B1 - group winners in separate semifinals!
      } else {
        // For 8+ players: A1 and B1 must be in opposite halves of bracket
        crossoverOrder = [
          { group: "A", rank: 1 }, // A1 = seed 1 (top half)
          { group: "B", rank: 4 }, // B4 = seed 8 (plays seed 1)
          { group: "B", rank: 2 }, // B2 = seed 2 (top half)
          { group: "A", rank: 3 }, // A3 = seed 7 (plays seed 2)
          { group: "B", rank: 1 }, // B1 = seed 5 (bottom half)
          { group: "A", rank: 4 }, // A4 = seed 4 (plays seed 5)
          { group: "A", rank: 2 }, // A2 = seed 3 (bottom half)
          { group: "B", rank: 3 }, // B3 = seed 6 (plays seed 3)
        ];
      }

      crossoverOrder.forEach((pos, index) => {
        const player = getPlayer(pos.group, pos.rank);
        if (player) {
          seeded.push({
            ...player,
            tournamentSeed: seedOrder[index],
          });
        }
      });
    } else {
      // Multi-group crossover: Distribute to prevent same-group matches
      const crossoverAssignments = [];

      // Collect all players by rank
      for (let rank = 1; rank <= playersPerGroup; rank++) {
        for (let groupIdx = 0; groupIdx < numGroups; groupIdx++) {
          const player = getPlayer(groups[groupIdx], rank);
          if (player) {
            crossoverAssignments.push({
              player,
              rank,
              groupIndex: groupIdx,
              crossoverIndex: (rank - 1) * numGroups + groupIdx,
            });
          }
        }
      }

      // Assign tournament seeds using professional bracket order
      crossoverAssignments.forEach((assignment, index) => {
        seeded.push({
          ...assignment.player,
          tournamentSeed: seedOrder[index],
        });
      });
    }

    return seeded;
  };

  /**
   * Create proper tournament seeding from group standings
   * Based on tournament management best practices for group-to-knockout transitions
   */
  const createTournamentSeeding = (
    participants: Array<{ player: Player; groupLetter: string; rank: number }>,
  ) => {
    const groups = [...new Set(participants.map((p) => p.groupLetter))].sort();
    const numGroups = groups.length;
    const totalPlayers = participants.length;
    const playersPerGroup = totalPlayers / numGroups;

    console.log(
      `🔄 Professional seeding: ${totalPlayers} players from ${numGroups} groups (${playersPerGroup} per group)`,
    );

    // Use professional DartConnect/PDC seeding algorithm for all scenarios
    const reseeded = createProfessionalCrossoverSeeding(participants, groups);

    console.log(
      "🏅 Professional seeding result:",
      reseeded.map(
        (p) =>
          `${p.tournamentSeed}: ${p.player.name} (${p.groupLetter}${p.rank})`,
      ),
    );

    // Verify bracket structure: 1 vs highest seed, 2 vs second-highest, etc.
    const bracketPairs = [];
    for (let i = 0; i < reseeded.length; i += 2) {
      if (reseeded[i + 1]) {
        bracketPairs.push(
          `${reseeded[i].tournamentSeed}v${reseeded[i + 1].tournamentSeed}`,
        );
      }
    }
    console.log("🏆 First round matchups:", bracketPairs.join(", "));

    return reseeded;
  };

  /**
   * 4 groups, 16 players (4 from each group)
   * Crossover seeding to prevent same-group rematches until semifinals
   */
  const createFourGroupSixteenPlayerSeeding = (
    participants: any[],
    groups: string[],
  ) => {
    const seeded = [];
    let seed = 1;

    const getPlayer = (group: string, rank: number) =>
      participants.find((p) => p.groupLetter === group && p.rank === rank);

    // Crossover order for 4 groups, 4 advancing each
    // Distribute to prevent same-group matches in early rounds
    const crossoverOrder = [
      // First quarter (seeds 1-4)
      { group: groups[0], rank: 1 }, // A1
      { group: groups[2], rank: 4 }, // C4
      { group: groups[1], rank: 3 }, // B3
      { group: groups[3], rank: 2 }, // D2
      // Second quarter (seeds 5-8)
      { group: groups[2], rank: 1 }, // C1
      { group: groups[0], rank: 4 }, // A4
      { group: groups[3], rank: 3 }, // D3
      { group: groups[1], rank: 2 }, // B2
      // Third quarter (seeds 9-12)
      { group: groups[1], rank: 1 }, // B1
      { group: groups[3], rank: 4 }, // D4
      { group: groups[0], rank: 3 }, // A3
      { group: groups[2], rank: 2 }, // C2
      // Fourth quarter (seeds 13-16)
      { group: groups[3], rank: 1 }, // D1
      { group: groups[1], rank: 4 }, // B4
      { group: groups[2], rank: 3 }, // C3
      { group: groups[0], rank: 2 }, // A2
    ];

    crossoverOrder.forEach((position) => {
      const player = getPlayer(position.group, position.rank);
      if (player) {
        seeded.push({ ...player, tournamentSeed: seed++ });
      }
    });

    return seeded;
  };

  /**
   * 4 groups, 8 players (2 from each group - winners and runners-up)
   * Crossover seeding: A1, C2, B1, D2, C1, A2, D1, B2
   * This separates group winners and prevents early same-group matches
   */
  const createFourGroupEightPlayerSeeding = (
    participants: any[],
    groups: string[],
  ) => {
    const seeded = [];
    let seed = 1;

    const getPlayer = (group: string, rank: number) =>
      participants.find((p) => p.groupLetter === group && p.rank === rank);

    // Crossover order for 4 groups, 2 advancing
    // Winners: A, B, C, D (spread across bracket)
    // Runners-up: paired with winners from distant groups
    const crossoverOrder = [
      { group: groups[0], rank: 1 }, // A1 (seed 1)
      { group: groups[2], rank: 2 }, // C2 (seed 2)
      { group: groups[1], rank: 1 }, // B1 (seed 3)
      { group: groups[3], rank: 2 }, // D2 (seed 4)
      { group: groups[2], rank: 1 }, // C1 (seed 5)
      { group: groups[0], rank: 2 }, // A2 (seed 6)
      { group: groups[3], rank: 1 }, // D1 (seed 7)
      { group: groups[1], rank: 2 }, // B2 (seed 8)
    ];

    crossoverOrder.forEach((position) => {
      const player = getPlayer(position.group, position.rank);
      if (player) {
        seeded.push({ ...player, tournamentSeed: seed++ });
      }
    });

    return seeded;
  };

  /**
   * 2 groups, 16 players (8 from each group)
   * Crossover seeding: A1 vs B16, A2 vs B15, etc.
   */
  const createTwoGroupSixteenPlayerSeeding = (
    participants: any[],
    groups: string[],
  ) => {
    const seeded = [];
    let seed = 1;

    const getPlayer = (group: string, rank: number) =>
      participants.find((p) => p.groupLetter === group && p.rank === rank);

    const groupA = groups[0];
    const groupB = groups[1];

    // Crossover pattern for 2 groups, 8 advancing each
    // A1 vs B8, A8 vs B1, A4 vs B5, A5 vs B4, etc.
    const crossoverOrder = [
      { group: groupA, rank: 1 },
      { group: groupB, rank: 8 },
      { group: groupA, rank: 4 },
      { group: groupB, rank: 5 },
      { group: groupA, rank: 3 },
      { group: groupB, rank: 6 },
      { group: groupA, rank: 6 },
      { group: groupB, rank: 3 },
      { group: groupA, rank: 2 },
      { group: groupB, rank: 7 },
      { group: groupA, rank: 7 },
      { group: groupB, rank: 2 },
      { group: groupA, rank: 5 },
      { group: groupB, rank: 4 },
      { group: groupA, rank: 8 },
      { group: groupB, rank: 1 },
    ];

    crossoverOrder.forEach((position) => {
      const player = getPlayer(position.group, position.rank);
      if (player) {
        seeded.push({ ...player, tournamentSeed: seed++ });
      }
    });

    return seeded;
  };

  /**
   * 2 groups, 8 players (4 from each group)
   * Standard tournament seeding: A1=1, A2=3, A3=6, A4=8, B1=5, B2=2, B3=7, B4=4
   * This creates: 1v8(A1vA4), 2v7(B2vB3), 3v6(A2vA3), 4v5(B4vB1)
   * Group winners A1 and B1 meet in different semi-finals
   */
  const createTwoGroupEightPlayerSeeding = (
    participants: any[],
    groups: string[],
  ) => {
    const seeded = [];

    // Get players by group and rank
    const groupA = groups[0];
    const groupB = groups[1];

    const getPlayer = (group: string, rank: number) =>
      participants.find((p) => p.groupLetter === group && p.rank === rank);

    // Tournament seeding to create correct bracket structure
    const seedAssignments = [
      { player: getPlayer(groupA, 1), seed: 1 }, // Kyle Gray (A1) = seed 1
      { player: getPlayer(groupB, 2), seed: 2 }, // Moe Cormier (B2) = seed 2
      { player: getPlayer(groupA, 2), seed: 3 }, // Cecil Dow (A2) = seed 3
      { player: getPlayer(groupA, 4), seed: 4 }, // Kayla Melanson (A4) = seed 4
      { player: getPlayer(groupB, 1), seed: 5 }, // Dee Cormier (B1) = seed 5
      { player: getPlayer(groupB, 3), seed: 6 }, // Matthew Dow (B3) = seed 6
      { player: getPlayer(groupA, 3), seed: 7 }, // Mark Roberts (A3) = seed 7
      { player: getPlayer(groupB, 4), seed: 8 }, // Connie Dow (B4) = seed 8
    ];

    // Sort by seed and add to seeded array
    seedAssignments
      .filter((assignment) => assignment.player)
      .sort((a, b) => a.seed - b.seed)
      .forEach((assignment) => {
        seeded.push({ ...assignment.player, tournamentSeed: assignment.seed });
      });

    return seeded;
  };

  /**
   * Single group knockout (round-robin to single elimination)
   * Direct ranking order: 1, 2, 3, 4...
   */
  const createSingleGroupSeeding = (participants: any[]) => {
    return participants
      .sort((a, b) => a.rank - b.rank)
      .map((p, index) => ({ ...p, tournamentSeed: index + 1 }));
  };

  /**
   * Fallback for unusual group/qualifier combinations
   * Distribute ranks evenly across groups
   */
  const createBalancedRankSeeding = (participants: any[], groups: string[]) => {
    const seeded = [];
    const maxRank = Math.max(...participants.map((p) => p.rank));
    let seed = 1;

    for (let rank = 1; rank <= maxRank; rank++) {
      for (const group of groups) {
        const player = participants.find(
          (p) => p.groupLetter === group && p.rank === rank,
        );
        if (player) {
          seeded.push({ ...player, tournamentSeed: seed++ });
        }
      }
    }
    return seeded;
  };

  /**
   * Generate Round 1 matches with proper bye distribution
   * Top seeds get byes, remaining players are matched using tournament pairing
   */
  const generateRound1WithByes = (
    seededParticipants: Array<{
      player: Player;
      groupLetter: string;
      rank: number;
      tournamentSeed: number;
    }>,
    byes: number,
    bracketSize: number,
  ) => {
    const round1Matches: Array<{
      seed1: number;
      seed2: number | undefined;
      p1?:
        | {
            player: Player;
            groupLetter: string;
            rank: number;
            tournamentSeed: number;
          }
        | undefined;
      p2?:
        | {
            player: Player;
            groupLetter: string;
            rank: number;
            tournamentSeed: number;
          }
        | undefined;
    }> = [];

    // Create seeding map
    const seedMap = new Map(
      seededParticipants.map((p) => [p.tournamentSeed, p]),
    );

    // Calculate first round matchups using standard tournament bracket pairing
    const totalSlots = bracketSize;
    const matchCount = totalSlots / 2;

    for (let i = 1; i <= matchCount; i++) {
      // Standard tournament pairing: 1v8, 4v5, 2v7, 3v6 for 8-player bracket
      const seed1 = i;
      const seed2 = totalSlots + 1 - i; // This creates proper bracket pairing

      const p1 = seedMap.get(seed1) || undefined;
      const p2 = seedMap.get(seed2) || undefined;

      // Only create match if at least one player exists
      if (p1 || p2) {
        round1Matches.push({
          seed1,
          seed2: p2 ? seed2 : undefined,
          p1,
          p2: p2 || undefined,
        });
      }
    }

    console.log(`🥊 Round 1: ${round1Matches.length} matches, ${byes} byes`);
    return round1Matches;
  };

  /**
   * Generate all bracket rounds using proper advancement formula
   */
  const generateAllBracketRounds = (
    round1Matches: Array<any>,
    totalRounds: number,
    matchesObj: { [key: string]: BracketMatch },
  ) => {
    let matchCounter = 1;

    // Generate Round 1
    round1Matches.forEach((matchData, idx) => {
      if (!matchData.p1 && !matchData.p2) return; // Skip empty matches

      const matchId = `r1m${matchCounter}`;
      const nextRound = 2;
      const nextMatchNumber = Math.ceil(matchCounter / 2);
      const nextMatchId =
        nextRound <= totalRounds ? `r${nextRound}m${nextMatchNumber}` : null;
      const slot = matchCounter % 2 === 1 ? "p1" : "p2";

      // Handle bye (when p2 is null)
      if (matchData.p1 && !matchData.p2) {
        // Player gets automatic bye to next round
        matchesObj[matchId] = {
          id: matchId,
          p1: matchData.p1.player.name,
          p2: "BYE",
          p1Id: matchData.p1.player.id,
          p2Id: null,
          p1Rank: matchData.p1.rank,
          p2Rank: undefined,
          p1Group: matchData.p1.groupLetter,
          p2Group: undefined,
          s1: "1", // Auto-win for bye
          s2: "0",
          winnerId: matchData.p1.player.id,
          nextMatchId,
          slot,
          label: getRoundLabelDynamic(
            1,
            totalRounds,
            matchCounter,
            round1Matches.length,
          ),
          round: 1,
          matchNumber: matchCounter,
        };
      } else if (matchData.p1 && matchData.p2) {
        // Normal match
        matchesObj[matchId] = {
          id: matchId,
          p1: matchData.p1.player.name,
          p2: matchData.p2.player.name,
          p1Id: matchData.p1.player.id,
          p2Id: matchData.p2.player.id,
          p1Rank: matchData.p1.rank,
          p2Rank: matchData.p2.rank,
          p1Group: matchData.p1.groupLetter,
          p2Group: matchData.p2.groupLetter,
          s1: "0",
          s2: "0",
          winnerId: null,
          nextMatchId,
          slot,
          label: getRoundLabelDynamic(
            1,
            totalRounds,
            matchCounter,
            round1Matches.length,
          ),
          round: 1,
          matchNumber: matchCounter,
        };
      }

      matchCounter++;
    });

    // Generate subsequent rounds (placeholders for winners)
    for (let round = 2; round <= totalRounds; round++) {
      const prevRoundMatches = Math.ceil(matchCounter / 2);
      const thisRoundMatches = Math.ceil(prevRoundMatches / 2);

      for (let matchNum = 1; matchNum <= thisRoundMatches; matchNum++) {
        const matchId = `r${round}m${matchNum}`;
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(matchNum / 2);
        const nextMatchId =
          nextRound <= totalRounds ? `r${nextRound}m${nextMatchNumber}` : null;
        const slot = matchNum % 2 === 1 ? "p1" : "p2";

        matchesObj[matchId] = {
          id: matchId,
          p1: "TBD",
          p2: "TBD",
          p1Id: null,
          p2Id: null,
          s1: "0",
          s2: "0",
          winnerId: null,
          nextMatchId,
          slot,
          label: getRoundLabelDynamic(
            round,
            totalRounds,
            matchNum,
            thisRoundMatches,
          ),
          round,
          matchNumber: matchNum,
        };
      }
    }
  };

  const generateCrossoverBracket = (
    players: Array<{ player: Player; groupLetter: string; rank: number }>,
    groups: string[],
    advancePerGroup: number,
    matchesObj: { [key: string]: BracketMatch },
  ) => {
    const totalPlayers = players.length;
    const totalRounds = Math.ceil(Math.log2(totalPlayers));
    const numGroups = groups.length;

    // Create matchups with crossover pattern
    const firstRoundMatchups: Array<{ p1: any; p2: any }> = [];

    // Pair groups: (A with B), (C with D), (E with F), etc.
    for (let groupPairIdx = 0; groupPairIdx < numGroups / 2; groupPairIdx++) {
      const group1 = groups[groupPairIdx * 2];
      const group2 = groups[groupPairIdx * 2 + 1];

      // Get players from both groups
      const group1Players = players
        .filter((p) => p.groupLetter === group1)
        .sort((a, b) => a.rank - b.rank);
      const group2Players = players
        .filter((p) => p.groupLetter === group2)
        .sort((a, b) => a.rank - b.rank);

      console.log(
        `📊 ${group1} players:`,
        group1Players.map((p) => `${p.player.name}(${p.rank})`),
      );
      console.log(
        `📊 ${group2} players:`,
        group2Players.map((p) => `${p.player.name}(${p.rank})`),
      );

      // Create proper tournament seeding matchups
      // Requested structure: A1-B4, A3-B2, A2-B3, A4-B1
      // This ensures proper bracket flow and separation of top seeds
      const groupPairMatchups: Array<{ p1: any; p2: any }> = [];

      if (advancePerGroup === 2) {
        // For 2 advancing: A1-B2, A2-B1 (standard crossover)
        groupPairMatchups.push({ p1: group1Players[0], p2: group2Players[1] }); // A1-B2
        groupPairMatchups.push({ p1: group1Players[1], p2: group2Players[0] }); // A2-B1
      } else if (advancePerGroup === 4) {
        // For 4 advancing: A1-B4, A3-B2, A2-B3, A4-B1
        // But only create matchups if both players exist
        if (group1Players[0] && group2Players[3]) {
          groupPairMatchups.push({
            p1: group1Players[0],
            p2: group2Players[3],
          }); // A1-B4 (QF1)
        }
        if (group1Players[2] && group2Players[1]) {
          groupPairMatchups.push({
            p1: group1Players[2],
            p2: group2Players[1],
          }); // A3-B2 (QF2)
        }
        if (group1Players[1] && group2Players[2]) {
          groupPairMatchups.push({
            p1: group1Players[1],
            p2: group2Players[2],
          }); // A2-B3 (QF3)
        }
        if (group1Players[3] && group2Players[0]) {
          groupPairMatchups.push({
            p1: group1Players[3],
            p2: group2Players[0],
          }); // A4-B1 (QF4)
        }

        // Handle any leftover players who don't have opponents
        const allUsedPlayers = new Set();
        groupPairMatchups.forEach((match) => {
          if (match.p1)
            allUsedPlayers.add(`${match.p1.groupLetter}${match.p1.rank}`);
          if (match.p2)
            allUsedPlayers.add(`${match.p2.groupLetter}${match.p2.rank}`);
        });

        // Check for unused players and log byes
        [...group1Players, ...group2Players].forEach((player) => {
          if (
            player &&
            !allUsedPlayers.has(`${player.groupLetter}${player.rank}`)
          ) {
            console.log(
              `🎯 ${player.player.name} (${player.groupLetter}${player.rank}) gets a bye (unmatched)`,
            );
          }
        });
      } else {
        // For other numbers, use the traditional crossover pattern
        for (let rank = 0; rank < advancePerGroup; rank++) {
          const p1 = group1Players[rank];
          const p2 = group2Players[advancePerGroup - 1 - rank]; // Reverse order
          if (p1 && p2) {
            groupPairMatchups.push({ p1, p2 });
          } else if (p1) {
            // If there's no opponent, this player gets a bye (automatically advances)
            console.log(`🎯 ${p1.player.name} gets a bye (no opponent)`);
            // We could handle byes here, but for now we'll skip incomplete matchups
          }
        }
      }

      firstRoundMatchups.push(...groupPairMatchups);
    }

    // Use the matchups as created - they're already in the correct order for proper bracket flow
    // No reordering needed since we've specifically designed the bracket structure

    // Generate all rounds of matches
    let matchCounter = 1;

    // Round 1
    firstRoundMatchups.forEach((matchup, idx) => {
      // Validate that both players exist before creating the match
      if (
        !matchup.p1 ||
        !matchup.p2 ||
        !matchup.p1.player ||
        !matchup.p2.player
      ) {
        console.warn("⚠️ Skipping invalid matchup:", matchup);
        return; // Skip this matchup if either player is missing
      }

      const matchId = `r1m${matchCounter}`;
      const nextRound = 2;
      const nextMatchNumber = Math.ceil(matchCounter / 2);
      const nextMatchId = `r${nextRound}m${nextMatchNumber}`;
      const slot = matchCounter % 2 === 1 ? "p1" : "p2";

      matchesObj[matchId] = {
        id: matchId,
        p1: matchup.p1.player.name,
        p2: matchup.p2.player.name,
        p1Id: matchup.p1.player.id,
        p2Id: matchup.p2.player.id,
        p1Rank: matchup.p1.rank,
        p2Rank: matchup.p2.rank,
        p1Group: matchup.p1.groupLetter,
        p2Group: matchup.p2.groupLetter,
        s1: "0",
        s2: "0",
        winnerId: null,
        nextMatchId,
        slot,
        label: getRoundLabelDynamic(
          1,
          totalRounds,
          matchCounter,
          firstRoundMatchups.length,
        ),
        round: 1,
        matchNumber: matchCounter,
      };

      matchCounter++;
    });

    // Generate subsequent rounds (TBD matches)
    for (let round = 2; round <= totalRounds; round++) {
      const matchesInRound = Math.pow(2, totalRounds - round);

      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        const matchId = `r${round}m${matchNum}`;
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(matchNum / 2);
        const nextMatchId =
          nextRound <= totalRounds ? `r${nextRound}m${nextMatchNumber}` : null;
        const slot = matchNum % 2 === 1 ? "p1" : "p2";

        matchesObj[matchId] = {
          id: matchId,
          p1: "TBD",
          p2: "TBD",
          p1Id: null,
          p2Id: null,
          s1: "",
          s2: "",
          winnerId: null,
          nextMatchId,
          slot,
          label: getRoundLabelDynamic(
            round,
            totalRounds,
            matchNum,
            matchesInRound,
          ),
          round,
          matchNumber: matchNum,
        };
      }
    }
  };

  const reorderForBracketBalance = (
    matchups: Array<{ p1: any; p2: any }>,
    advancePerGroup: number,
    numGroups: number,
  ): Array<{ p1: any; p2: any }> => {
    // For proper tournament seeding, ensure #1 seeds are on opposite sides of bracket
    // and can only meet in the final

    const numGroupPairs = numGroups / 2;
    const totalMatches = matchups.length;

    // For 2 groups (A,B) with 2 advancing each: A1-B2, A2-B1
    // For 2 groups (A,B) with 4 advancing each: A1-B4, A2-B3, A3-B2, A4-B1
    // For 4 groups (A,B,C,D) with 2 advancing each: A1-B2, A2-B1, C1-D2, C2-D1

    if (numGroups === 2) {
      // Simple case: just return matchups as they are - they're already properly seeded
      // A1-B4 will be at top, A4-B1 will be at bottom, ensuring A1 and B1 are on opposite sides
      return matchups;
    }

    // For 4+ groups, arrange so that the #1 seeds from different group pairs are separated
    const reordered: Array<{ p1: any; p2: any }> = [];

    // Split matchups into two halves of the bracket
    const halfSize = Math.ceil(totalMatches / 2);

    // Place matchups to ensure #1 seeds are maximally separated
    for (let groupPairIdx = 0; groupPairIdx < numGroupPairs; groupPairIdx++) {
      const pairMatchups = matchups.slice(
        groupPairIdx * advancePerGroup,
        (groupPairIdx + 1) * advancePerGroup,
      );

      if (groupPairIdx % 2 === 0) {
        // Even group pairs go to top half
        reordered.push(...pairMatchups);
      } else {
        // Odd group pairs get reversed and go to bottom half
        reordered.push(...pairMatchups.reverse());
      }
    }

    return reordered;
  };

  const getNextPowerOf2 = (n: number): number => {
    return Math.pow(2, Math.ceil(Math.log2(n)));
  };

  const generateStandardBracket = (
    players: Array<{ player: Player; overallSeed: number }>,
    matchesObj: { [key: string]: BracketMatch },
  ) => {
    const totalPlayers = players.length;
    const bracketSize = getNextPowerOf2(totalPlayers);
    const rounds = Math.log2(bracketSize);

    // First round matchups
    const firstRoundMatches = bracketSize / 2;
    for (let i = 0; i < firstRoundMatches; i++) {
      const matchNumber = i + 1;
      const player1 = players[i * 2];
      const player2 = players[i * 2 + 1];

      const nextRound = 2;
      const nextMatchNumber = Math.ceil(matchNumber / 2);
      const nextMatchId =
        nextRound <= rounds ? `r${nextRound}m${nextMatchNumber}` : null;
      const slot = matchNumber % 2 === 1 ? "p1" : "p2";

      matchesObj[`r1m${matchNumber}`] = {
        id: `r1m${matchNumber}`,
        p1: player1?.player.name || "TBD",
        p2: player2?.player.name || "TBD",
        p1Id: player1?.player.id || null,
        p2Id: player2?.player.id || null,
        s1: "0",
        s2: "0",
        winnerId: null,
        nextMatchId,
        slot,
        label: getRoundLabel(1, firstRoundMatches * 2 - 1, matchNumber),
        round: 1,
        matchNumber,
      };
    }

    // Subsequent rounds (empty TBD matches)
    for (let round = 2; round <= rounds; round++) {
      const matchesInRound = Math.pow(2, rounds - round);
      for (let matchNumber = 1; matchNumber <= matchesInRound; matchNumber++) {
        const nextRound = round + 1;
        const nextMatchNumber = Math.ceil(matchNumber / 2);
        const nextMatchId =
          nextRound <= rounds ? `r${nextRound}m${nextMatchNumber}` : null;
        const slot = matchNumber % 2 === 1 ? "p1" : "p2";

        matchesObj[`r${round}m${matchNumber}`] = {
          id: `r${round}m${matchNumber}`,
          p1: "TBD",
          p2: "TBD",
          p1Id: null,
          p2Id: null,
          s1: "",
          s2: "",
          winnerId: null,
          nextMatchId,
          slot,
          label: getRoundLabel(
            round,
            Object.keys(matchesObj).length,
            matchNumber,
          ),
          round,
          matchNumber,
        };
      }
    }
  };

  const handleScoreChange = (
    matchId: string,
    player: "p1" | "p2",
    value: string,
  ) => {
    setMatches((prev) => {
      const updated = { ...prev };
      const match = { ...updated[matchId] };

      // Update score
      if (player === "p1") {
        match.s1 = value;
      } else {
        match.s2 = value;
      }

      // Determine winner and mark as completed
      if (match.s1 !== "" && match.s2 !== "" && match.s1 !== match.s2) {
        const winner =
          parseInt(match.s1) > parseInt(match.s2) ? match.p1 : match.p2;
        const winnerId =
          parseInt(match.s1) > parseInt(match.s2) ? match.p1Id : match.p2Id;
        match.winnerId = winnerId;
        match.status = "completed"; // Mark match as completed

        // Auto-advance winner to next match
        if (match.nextMatchId && winner && updated[match.nextMatchId]) {
          const nextMatch = { ...updated[match.nextMatchId] };
          if (match.slot === "p1") {
            nextMatch.p1 = winner;
            nextMatch.p1Id = winnerId;
            // Preserve seeding information
            nextMatch.p1Rank =
              parseInt(match.s1) > parseInt(match.s2)
                ? match.p1Rank
                : match.p2Rank;
            nextMatch.p1Group =
              parseInt(match.s1) > parseInt(match.s2)
                ? match.p1Group
                : match.p2Group;
          } else if (match.slot === "p2") {
            nextMatch.p2 = winner;
            nextMatch.p2Id = winnerId;
            // Preserve seeding information
            nextMatch.p2Rank =
              parseInt(match.s1) > parseInt(match.s2)
                ? match.p1Rank
                : match.p2Rank;
            nextMatch.p2Group =
              parseInt(match.s1) > parseInt(match.s2)
                ? match.p1Group
                : match.p2Group;
          }
          updated[match.nextMatchId] = nextMatch;
        }
      }

      updated[matchId] = match;
      return updated;
    });
    
    // Check if tournament should be completed after score update
    setTimeout(() => checkAndUpdateTournamentStatus(), 100);
  };

  const saveBracketToDatabase = async () => {
    if (!id || Object.keys(matches).length === 0) return;

    try {
      const matchesToSave = Object.values(matches).map((match) => ({
        id: match.dbId,
        tournament_id: id,
        player1_id: match.p1Id,
        player2_id: match.p2Id,
        player1_legs: match.s1 ? parseInt(match.s1) : 0,
        player2_legs: match.s2 ? parseInt(match.s2) : 0,
        winner_id: match.winnerId,
        status: match.status || (match.s1 && match.s2 ? "completed" : "scheduled"),
        group_id: null,
        round_number: match.round,
        legs_to_win: roundFormats[match.round]?.legsToWin || 2,
      }));

      console.log('💾 Saving bracket to database:', matchesToSave.length, 'matches');
      console.log('Sample match being saved:', matchesToSave[0]);

      if (matchesToSave[0].id) {
        // Update existing matches - exclude id from update data
        for (const match of matchesToSave) {
          const { id: matchId, ...updateData } = match;
          await supabase.from("matches").update(updateData).eq("id", matchId);
        }
      } else {
        // Insert new matches
        const matchesToInsert = matchesToSave.map(({ id, ...match }) => match);
        const { data } = await supabase
          .from("matches")
          .insert(matchesToInsert)
          .select();

        // Update with database IDs
        if (data) {
          setMatches((prev) => {
            const updated = { ...prev };
            data.forEach((dbMatch, index) => {
              const matchKey = Object.keys(updated)[index];
              if (matchKey) {
                updated[matchKey].dbId = dbMatch.id;
              }
            });
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error saving bracket to database:", error);
    }
  };

  // Initialize default round formats
  const initializeRoundFormats = (totalRounds: number) => {
    const defaultFormats: { [round: number]: RoundFormat } = {};

    // Count matches per round to determine proper labels
    const matchesByRound: { [round: number]: number } = {};
    Object.values(matches).forEach((match) => {
      if (match.round) {
        matchesByRound[match.round] = (matchesByRound[match.round] || 0) + 1;
      }
    });

    for (let i = 1; i <= totalRounds; i++) {
      let roundName = "";
      let legsToWin = 2; // Default best of 3
      const matchesInRound = matchesByRound[i] || 0;

      // Determine round name based on number of matches in round
      if (matchesInRound === 1) {
        roundName = "Finals";
        legsToWin = 4; // Best of 7 for finals
      } else if (matchesInRound === 2) {
        roundName = "Semi Finals";
        legsToWin = 3; // Best of 5 for semi finals
      } else if (matchesInRound === 4) {
        roundName = "Quarter Finals";
        legsToWin = 3; // Best of 5 for quarter finals
      } else {
        // For rounds with 8+ matches, use Round 1, Round 2, etc.
        roundName = `Round ${i}`;
        legsToWin = 2; // Best of 3 for early rounds
      }

      defaultFormats[i] = {
        round: i,
        roundName,
        legsToWin,
        format: `Best of ${legsToWin * 2 - 1}`,
      };
    }

    setRoundFormats(defaultFormats);
  };

  // Update round format
  const updateRoundFormat = async (round: number, legsToWin: number) => {
    const newFormat: RoundFormat = {
      round,
      roundName: roundFormats[round]?.roundName || `Round ${round}`,
      legsToWin,
      format: `Best of ${legsToWin * 2 - 1}`,
    };

    setRoundFormats((prev) => ({
      ...prev,
      [round]: newFormat,
    }));

    // Update all matches in this round in the database
    try {
      await supabase
        .from("matches")
        .update({ legs_to_win: legsToWin })
        .eq("tournament_id", id)
        .eq("round_number", round);
    } catch (error) {
      console.error("Error updating round format:", error);
    }
  };

  const handleResetBracket = async () => {
    // Check if any matches have scores entered
    const hasScores = Object.values(matches).some(
      (match) =>
        (match.s1 && match.s1 !== "" && match.s1 !== "0") ||
        (match.s2 && match.s2 !== "" && match.s2 !== "0"),
    );

    if (hasScores) {
      alert(
        "Cannot reset bracket - scores have been entered. Please clear all scores first or contact an administrator.",
      );
      return;
    }

    const confirmReset = confirm(
      "Are you sure you want to reset the knockout bracket?\n\n" +
        "This will:\n" +
        "• Delete all knockout matches\n" +
        "• Return to Group Stage\n" +
        "• Allow you to adjust advancing players and regenerate\n\n" +
        "This action cannot be undone.",
    );

    if (!confirmReset) return;

    try {
      // Delete all knockout matches from database (where group_id is null)
      const { error: deleteError } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", id)
        .is("group_id", null);

      if (deleteError) throw deleteError;

      // Update tournament status back to group-stage
      await supabase
        .from("tournaments")
        .update({ status: "group-stage" })
        .eq("id", id);

      // Clear localStorage
      localStorage.removeItem("knockoutBracket");
      localStorage.removeItem("knockoutBracketTimestamp");
      localStorage.removeItem("knockoutRoundNames");
      localStorage.removeItem("currentTournament");
      localStorage.removeItem(`tournament_bracket_${id}`);

      // Clear local state
      setMatches({});

      // Notify other components
      window.dispatchEvent(new Event("knockoutBracketUpdated"));

      alert("Knockout bracket reset successfully. Returning to Group Stage...");

      // Navigate back to group stage
      window.location.href = `/tournament/${id}/groups`;
    } catch (error) {
      console.error("Error resetting bracket:", error);
      alert("Failed to reset bracket. Please try again.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const deleteBracket = async () => {
    if (!id) return;

    const confirmed = confirm(
      "Are you sure you want to delete the entire bracket? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setLoading(true);

      // Delete all knockout matches from database
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("tournament_id", id)
        .is("group_id", null);

      if (error) throw error;

      // Clear local storage
      localStorage.removeItem(`tournament_bracket_${id}`);

      // Clear state
      setMatches({});

      console.log("🗑️ Bracket deleted successfully");
      alert(
        "Bracket deleted successfully! Return to Group Stage to regenerate.",
      );
    } catch (error) {
      console.error("❌ Error deleting bracket:", error);
      alert("Error deleting bracket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openScoreModal = (match: BracketMatch) => {
    // Set default scores to '0' if they are empty
    const matchWithDefaults = {
      ...match,
      s1: match.s1 || "0",
      s2: match.s2 || "0",
    };
    setSelectedMatch(matchWithDefaults);
    setShowScoreModal(true);
  };

  const closeScoreModal = () => {
    setShowScoreModal(false);
    setSelectedMatch(null);
  };

  const saveScore = () => {
    if (selectedMatch) {
      handleScoreChange(selectedMatch.id, "p1", selectedMatch.s1);
      handleScoreChange(selectedMatch.id, "p2", selectedMatch.s2);
      
      // Check if tournament should be marked as completed after score update
      setTimeout(() => checkAndUpdateTournamentStatus(), 100);
      
      closeScoreModal();
    }
  };

  // Check if all knockout matches are complete and update tournament status
  const checkAndUpdateTournamentStatus = async () => {
    if (!id || !tournament) return;

    // Get all knockout matches
    const allMatches = Object.values(matches);
    const totalMatches = allMatches.length;
    
    if (totalMatches === 0) return;

    // Count completed matches (matches with winners)
    const completedMatches = allMatches.filter(match => 
      match.winnerId && match.s1 && match.s2 && match.s1 !== match.s2
    );
    
    console.log('🏆 Knockout progress check:', {
      totalMatches,
      completedMatches: completedMatches.length,
      progress: Math.round((completedMatches.length / totalMatches) * 100)
    });

    // If all matches are complete (100% progress)
    if (completedMatches.length === totalMatches) {
      console.log('🎉 All knockout matches completed! Marking tournament as completed...');
      
      try {
        // Update tournament status to completed
        await TournamentService.updateTournament(id, { 
          completed: true, 
          status: 'completed' 
        });
        
        // Update local tournament state
        setTournament(prev => prev ? { ...prev, status: 'completed', completed: true } : null);
        
        console.log('✅ Tournament marked as completed successfully');
        
        // Optional: Show success message
        setTimeout(() => {
          alert('🎉 Tournament completed! All knockout matches have been finished.');
        }, 500);
        
      } catch (error) {
        console.error('❌ Error updating tournament status:', error);
      }
    }
  };

  const assignBoardToMatch = async (
    matchDbId: string,
    boardId: string | null,
  ) => {
    if (!matchDbId) return;

    try {
      await supabase
        .from("matches")
        .update({ board_id: boardId })
        .eq("id", matchDbId);

      // Update local state
      setMatches((prev) => {
        const matchKey = Object.keys(prev).find(
          (key) => prev[key].dbId === matchDbId,
        );
        if (!matchKey) return prev;

        const board = boards.find((b) => b.id === boardId);
        return {
          ...prev,
          [matchKey]: {
            ...prev[matchKey],
            boardId: boardId,
            boardNumber: board?.board_number || null,
          },
        };
      });

      // Force reload from DB to ensure persistence
      const { data: updatedMatch, error } = await supabase
        .from("matches")
        .select("id, board_id")
        .eq("id", matchDbId)
        .single();
      console.log('Board assignment saved. DB value:', updatedMatch, 'Error:', error);

      setShowBoardDropdown(null);
    } catch (error) {
      console.error("Error assigning board:", error);
      alert("Failed to assign board");
    }
  };

  const handleOpenBoardCall = (match: BracketMatch) => {
    if (!match.boardNumber) {
      alert('Please assign a board to this match before sending a board call');
      return;
    }
    
    setSelectedBoard(match.boardNumber.toString());
    setBoardCallMatch(match);
  };

  const handleSendBoardCall = async () => {
    if (!boardCallMatch || !selectedBoard || !tournament) return;
    
    try {
      setSendingBoardCall(true);
      
      console.log('🔍 Attempting to send board call');
      console.log('Match:', boardCallMatch);
      console.log('Match p1Id:', boardCallMatch.p1Id);
      console.log('Match p2Id:', boardCallMatch.p2Id);
      console.log('Players array length:', players.length);
      console.log('All players:', players);
      
      // Get player details
      const player1 = players.find(p => p.id === boardCallMatch.p1Id);
      const player2 = players.find(p => p.id === boardCallMatch.p2Id);
      
      console.log('Found player1:', player1);
      console.log('Found player2:', player2);
      
      if (!player1 || !player2 || !player1.name || !player2.name || player1.name === 'TBD' || player2.name === 'TBD') {
        console.log('❌ Email validation failed');
        console.log('player1 exists:', !!player1);
        console.log('player2 exists:', !!player2);
        console.log('player1.name:', player1?.name);
        console.log('player2.name:', player2?.name);
        alert('Both players must be assigned before sending board calls');
        setBoardCallMatch(null);
        return;
      }
      
      // Prepare board call emails
      const emailPromises = [];
      
      // Get round information
      const matchesInRound = Object.values(matches).filter(
        m => m.round === boardCallMatch.round
      ).length;
      const roundLabel = boardCallMatch.label || getKnockoutRoundLabel(boardCallMatch.round, matchesInRound);
      const setFormat = getSetFormat(roundLabel);
      
      if (player1.email && EmailService.isConfigured()) {
        emailPromises.push(
          EmailService.sendEmail({
            to: player1.email,
            subject: `Board Call - ${tournament.name}`,
            html: getBoardCallEmailTemplate({
              playerName: player1.name,
              opponentName: player2.name,
              boardNumber: selectedBoard,
              eventName: tournament.name,
              round: roundLabel,
              setFormat: setFormat
            })
          })
        );
      }
      
      if (player2.email && EmailService.isConfigured()) {
        emailPromises.push(
          EmailService.sendEmail({
            to: player2.email,
            subject: `Board Call - ${tournament.name}`,
            html: getBoardCallEmailTemplate({
              playerName: player2.name,
              opponentName: player1.name,
              boardNumber: selectedBoard,
              eventName: tournament.name,
              round: roundLabel,
              setFormat: setFormat
            })
          })
        );
      }
      
      await Promise.all(emailPromises);
      
      alert(`Board call sent successfully to ${emailPromises.length} player(s)`);
      setBoardCallMatch(null);
      setSelectedBoard('');
    } catch (err) {
      console.error('Failed to send board call:', err);
      alert('Failed to send board call emails');
    } finally {
      setSendingBoardCall(false);
    }
  };

  const handleMarkInProgress = async (match: BracketMatch) => {
    if (!match.dbId) return;
    
    // Check if board is assigned before allowing status change to in-progress
    if (!match.boardNumber && match.status !== 'in-progress') {
      alert('Please assign a board to this match before marking it as in progress');
      return;
    }
    
    try {
      const newStatus = match.status === 'in-progress' ? 'scheduled' : 'in-progress';
      
      // Update match status in database (include board_number for live display)
      await MatchService.updateMatch(match.dbId, {
        status: newStatus,
        board_number: match.boardNumber || null
      });
      
      // Update local state
      setMatches((prev) => {
        const matchKey = Object.keys(prev).find(
          (key) => prev[key].dbId === match.dbId,
        );
        if (!matchKey) return prev;

        return {
          ...prev,
          [matchKey]: {
            ...prev[matchKey],
            status: newStatus,
          },
        };
      });
      
      // Send board call emails if marking as in-progress and board number exists
      if (newStatus === 'in-progress' && match.boardNumber && EmailService.isConfigured() && tournament) {
        console.log('Attempting to send board call emails...');
        console.log('Match p1Id:', match.p1Id, 'p2Id:', match.p2Id);
        console.log('Players state:', players);
        console.log('Players count:', players.length);
        
        const player1 = players.find(p => p.id === match.p1Id);
        const player2 = players.find(p => p.id === match.p2Id);
        
        console.log('Player 1:', player1);
        console.log('Player 2:', player2);
        
        if (player1 && player2 && player1.name && player2.name && player1.name !== 'TBD' && player2.name !== 'TBD') {
          const emailPromises = [];
          
          // Get round information
          const matchesInRound = Object.values(matches).filter(
            m => m.round === match.round
          ).length;
          const roundLabel = match.label || getKnockoutRoundLabel(match.round, matchesInRound);
          const setFormat = getSetFormat(roundLabel);
          
          console.log('Round label:', roundLabel, 'Set format:', setFormat);
          
          if (player1.email) {
            console.log('Sending email to player 1:', player1.email);
            emailPromises.push(
              EmailService.sendEmail({
                to: player1.email,
                subject: `Board Call - ${tournament.name}`,
                html: getBoardCallEmailTemplate({
                  playerName: player1.name,
                  opponentName: player2.name,
                  boardNumber: match.boardNumber.toString(),
                  eventName: tournament.name,
                  round: roundLabel,
                  setFormat: setFormat
                })
              })
            );
          }
          
          if (player2.email) {
            console.log('Sending email to player 2:', player2.email);
            emailPromises.push(
              EmailService.sendEmail({
                to: player2.email,
                subject: `Board Call - ${tournament.name}`,
                html: getBoardCallEmailTemplate({
                  playerName: player2.name,
                  opponentName: player1.name,
                  boardNumber: match.boardNumber.toString(),
                  eventName: tournament.name,
                  round: roundLabel,
                  setFormat: setFormat
                })
              })
            );
          }
          
          try {
            await Promise.all(emailPromises);
            console.log('Board call emails sent successfully');
          } catch (error) {
            console.error('Failed to send board call emails:', error);
          }
        } else {
          console.log('Email sending skipped - players not ready or TBD');
        }
      } else {
        console.log('Email sending skipped - conditions not met:', {
          newStatus,
          boardNumber: match.boardNumber,
          emailConfigured: EmailService.isConfigured(),
          tournament: !!tournament
        });
      }
    } catch (error) {
      console.error('Error updating match status:', error);
      alert('Failed to update match status');
    }
  };

  // Auto board assignment function for knockout bracket
  const handleToggleAutoBoardAssignment = async () => {
    const newValue = !autoBoardAssignmentEnabled;
    setAutoBoardAssignmentEnabled(newValue);
    
    if (newValue) {
      // When enabled, auto-assign boards
      await autoAssignKnockoutBoards();
    }
  };

  const autoAssignKnockoutBoards = async () => {
    if (!boards || boards.length === 0) {
      alert('No boards available for assignment');
      return;
    }

    try {
      // Group matches by round
      const matchesByRound: { [round: number]: BracketMatch[] } = {};
      Object.values(matches).forEach((match) => {
        if (!matchesByRound[match.round]) {
          matchesByRound[match.round] = [];
        }
        matchesByRound[match.round].push(match);
      });

      // Sort rounds
      const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
      
      for (const round of rounds) {
        const roundMatches = matchesByRound[round];
        
        // Sort matches by match number within round
        roundMatches.sort((a, b) => {
          const aNum = parseInt(a.id.split('-')[1]);
          const bNum = parseInt(b.id.split('-')[1]);
          return aNum - bNum;
        });

        // Determine if round is odd or even (alternating pattern)
        const isOddRound = round % 2 === 1;
        
        if (isOddRound) {
          // Odd rounds: Assign boards sequentially forward (1, 2, 3, 4...)
          for (let i = 0; i < roundMatches.length; i++) {
            const boardIndex = i % boards.length;
            const board = boards[boardIndex];
            await assignBoardToMatch(roundMatches[i].dbId!, board.id);
          }
        } else {
          // Even rounds: Assign boards with alternating pattern backward
          // Match 2-8 → board 1, Match 2-7 → board 3, Match 2-6 → board 5...
          const skipPattern = 2; // Skip every other board
          let boardIndex = 0;
          
          for (let i = roundMatches.length - 1; i >= 0; i--) {
            // Find next available board with skip pattern
            const board = boards[boardIndex % boards.length];
            await assignBoardToMatch(roundMatches[i].dbId!, board.id);
            boardIndex += skipPattern;
          }
        }
      }

      console.log('✅ Auto board assignment complete');
    } catch (error) {
      console.error('Error during auto board assignment:', error);
      alert('Failed to auto-assign boards');
    }
  };

  // Drag and drop handlers for swapping players
  const handleDragStart = (e: React.DragEvent, matchId: string, playerPosition: 'p1' | 'p2', playerName: string) => {
    // Don't allow dragging TBD players
    if (playerName === 'TBD') {
      e.preventDefault();
      return;
    }
    
    setDraggedPlayer({ matchId, playerPosition });
    e.dataTransfer.effectAllowed = 'move';
    // Add visual feedback
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDraggedPlayer(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetMatchId: string, targetPosition: 'p1' | 'p2', targetPlayerName: string) => {
    e.preventDefault();
    
    if (!draggedPlayer || targetPlayerName === 'TBD') {
      return;
    }

    // Don't swap with self
    if (draggedPlayer.matchId === targetMatchId && draggedPlayer.playerPosition === targetPosition) {
      setDraggedPlayer(null);
      return;
    }

    try {
      const sourceMatch = matches[draggedPlayer.matchId];
      const targetMatch = matches[targetMatchId];

      if (!sourceMatch || !targetMatch) return;

      // Get player IDs and details
      const sourcePlayerId = draggedPlayer.playerPosition === 'p1' ? sourceMatch.p1Id : sourceMatch.p2Id;
      const sourceTBracketRank = draggedPlayer.playerPosition === 'p1' ? sourceMatch.p1Rank : sourceMatch.p2Rank;
      const sourceGroup = draggedPlayer.playerPosition === 'p1' ? sourceMatch.p1Group : sourceMatch.p2Group;

      const targetPlayerId = targetPosition === 'p1' ? targetMatch.p1Id : targetMatch.p2Id;
      const targetBracketRank = targetPosition === 'p1' ? targetMatch.p1Rank : targetMatch.p2Rank;
      const targetGroup = targetPosition === 'p1' ? targetMatch.p1Group : targetMatch.p2Group;

      // Update source match
      const sourceUpdate: any = {};
      if (draggedPlayer.playerPosition === 'p1') {
        sourceUpdate.player1_id = targetPlayerId;
        sourceUpdate.player1_rank = targetBracketRank;
        sourceUpdate.player1_group = targetGroup;
      } else {
        sourceUpdate.player2_id = targetPlayerId;
        sourceUpdate.player2_rank = targetBracketRank;
        sourceUpdate.player2_group = targetGroup;
      }

      // Update target match
      const targetUpdate: any = {};
      if (targetPosition === 'p1') {
        targetUpdate.player1_id = sourcePlayerId;
        targetUpdate.player1_rank = sourceTBracketRank;
        targetUpdate.player1_group = sourceGroup;
      } else {
        targetUpdate.player2_id = sourcePlayerId;
        targetUpdate.player2_rank = sourceTBracketRank;
        targetUpdate.player2_group = sourceGroup;
      }

      // Update database
      await Promise.all([
        supabase.from('matches').update(sourceUpdate).eq('id', sourceMatch.dbId),
        supabase.from('matches').update(targetUpdate).eq('id', targetMatch.dbId)
      ]);

      // Reload bracket to reflect changes
      await loadTournamentAndBracket();
      
      console.log('✅ Players swapped successfully');
    } catch (error) {
      console.error('Error swapping players:', error);
      alert('Failed to swap players');
    }

    setDraggedPlayer(null);
  };

  const handleInputScore = (match: BracketMatch) => {
    openScoreModal(match);
  };

  // Calculate grid layout dimensions for round view
  const getGridLayout = (matchCount: number): { cols: number; rows: number } => {
    if (matchCount === 1) return { cols: 1, rows: 1 };
    if (matchCount === 2) return { cols: 2, rows: 1 };
    if (matchCount === 4) return { cols: 2, rows: 2 };
    if (matchCount === 8) return { cols: 4, rows: 2 };
    if (matchCount === 16) return { cols: 4, rows: 4 };
    if (matchCount === 32) return { cols: 8, rows: 4 };
    
    // Default: Try to make it as square as possible
    const cols = Math.ceil(Math.sqrt(matchCount));
    const rows = Math.ceil(matchCount / cols);
    return { cols, rows };
  };

  const getKnockoutRoundLabel = (roundNumber: number, totalMatches: number): string => {
    // Determine the round label based on number of matches in the round
    // Finals = 1 match, Semi Finals = 2 matches, Quarter Finals = 4 matches, etc.
    
    if (totalMatches === 1) {
      return 'Finals';
    } else if (totalMatches === 2) {
      return 'Semi Finals';
    } else if (totalMatches === 4) {
      return 'Quarter Finals';
    } else {
      return `Round ${roundNumber}`;
    }
  };

  const getSetFormat = (roundLabel: string): string => {
    // Determine set format based on the round
    // Finals: Best of 9, Semi Finals: Best of 7, Quarter Finals: Best of 5, Others: Best of 3
    
    if (roundLabel === 'Finals') {
      return 'Best of 9';
    } else if (roundLabel === 'Semi Finals') {
      return 'Best of 7';
    } else if (roundLabel === 'Quarter Finals') {
      return 'Best of 5';
    } else {
      return 'Best of 3';
    }
  };

  const getBoardCallEmailTemplate = (data: {
    playerName: string;
    opponentName: string;
    boardNumber: string;
    eventName: string;
    round?: string;
    setFormat?: string;
  }): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .board-highlight {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 40px;
      margin: 30px 0;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    }
    .board-highlight h2 {
      margin: 0 0 10px 0;
      font-size: 18px;
      opacity: 0.9;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .board-number {
      font-size: 56px;
      font-weight: bold;
      margin: 10px 0;
      text-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    .opponent-box {
      background: white;
      border: 2px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      text-align: center;
    }
    .opponent-box h3 {
      margin: 0 0 10px 0;
      color: #f59e0b;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .opponent-name {
      font-size: 24px;
      font-weight: bold;
      color: #1e293b;
    }
    .detail-box {
      background: white;
      border-left: 4px solid #f59e0b;
      padding: 15px 20px;
      margin: 15px 0;
      border-radius: 4px;
    }
    .detail-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #f59e0b;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .detail-value {
      font-size: 18px;
      color: #1e293b;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 20px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Board Call</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">${data.eventName}</p>
  </div>
  
  <div class="content">
    <p style="font-size: 18px; margin-top: 0;">Hello <strong>${data.playerName}</strong>,</p>
    <p style="font-size: 16px; color: #64748b;">Your match is ready to begin. Please proceed to your assigned board.</p>
    
    <div class="board-highlight">
      <h2>Your Board Assignment</h2>
      <div class="board-number">Board ${data.boardNumber}</div>
    </div>
    
    ${data.round ? `
    <div class="detail-box">
      <div class="detail-label">Round</div>
      <div class="detail-value">${data.round}</div>
    </div>
    ` : ''}
    
    ${data.setFormat ? `
    <div class="detail-box">
      <div class="detail-label">Match Format</div>
      <div class="detail-value">${data.setFormat}</div>
    </div>
    ` : ''}
    
    <div class="opponent-box">
      <h3>Your Opponent</h3>
      <div class="opponent-name">${data.opponentName}</div>
    </div>
    
    <div class="footer">Good luck! 🎯</div>
  </div>
</body>
</html>
    `.trim();
  };

  // Group matches by round
  const matchesByRound: { [round: number]: BracketMatch[] } = {};
  Object.values(matches).forEach((match) => {
    if (!matchesByRound[match.round]) {
      matchesByRound[match.round] = [];
    }
    matchesByRound[match.round].push(match);
  });

  const rounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="text-white text-xl">Loading Knockout Bracket...</div>
      </div>
    );
  }

  if (Object.keys(matches).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white p-8">
        <Trophy size={64} className="text-yellow-400 mb-4" />
        <h2 className="text-2xl font-bold mb-4">No Knockout Bracket Yet</h2>
        <p className="text-gray-400 mb-6">
          Complete the group stage and click "Start Knockout Bracket" to
          generate the playoff bracket.
        </p>
        <button
          onClick={() => navigate(`/tournament/${id}/groups`)}
          className="button button-primary"
        >
          Go to Group Stage
        </button>
      </div>
    );
  }

  // Check if the bracket is missing rank data (for existing brackets created before rank feature)
  const round1Matches = Object.values(matches).filter((m) => m.round === 1);
  const missingRankData =
    round1Matches.length > 0 &&
    round1Matches.some((m) => !m.p1Rank || !m.p2Rank);

  return (
    <>
      {/* Missing Rank Data Warning - Only show when help mode is enabled */}
      {missingRankData && helpMode && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg border-2 border-red-600">
            <div className="flex items-center gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <div className="font-bold text-sm">MISSING RANKINGS!</div>
                <div className="text-xs">
                  Use "Reset Bracket" to clear scores, or "Delete Bracket" to

                  remove and regenerate from Group Stage
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Screen View */}
      <div
        className="no-print"
        style={{ padding: "20px", minHeight: "100vh", background: "#1e293b" }}
      >
        {/* Header */}
        <div
          className="card"
          style={{
            marginBottom: "20px",
            background: "#334155",
            border: "2px solid #64748b",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
              <Trophy size={28} style={{ color: "#fbbf24" }} />
              <div>
                <h1
                  style={{
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#ffffff",
                    marginBottom: "5px",
                  }}
                >
                  Knockout Bracket
                </h1>
                <p style={{ fontSize: "14px", color: "#cbd5e1", margin: 0 }}>
                  Click on any match to enter scores
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {/* View Mode Toggle */}
              <div style={{ 
                display: "flex", 
                background: "#374151",
                borderRadius: "8px",
                padding: "4px",
                gap: "4px"
              }}>
                <button
                  onClick={() => setViewMode('bracket')}
                  style={{
                    padding: "8px 16px",
                    background: viewMode === 'bracket' ? "#3b82f6" : "transparent",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s"
                  }}
                >
                  Bracket View
                </button>
                <button
                  onClick={() => setViewMode('round')}
                  style={{
                    padding: "8px 16px",
                    background: viewMode === 'round' ? "#3b82f6" : "transparent",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    transition: "all 0.2s"
                  }}
                >
                  Round View
                </button>
              </div>

              {/* Round Selector - Only show in round view */}
              {viewMode === 'round' && (
                <select
                  value={selectedRoundView}
                  onChange={(e) => setSelectedRoundView(Number(e.target.value))}
                  style={{
                    padding: "8px 16px",
                    background: "#374151",
                    color: "white",
                    border: "1px solid #475569",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  {Object.keys(roundFormats).map((round) => (
                    <option key={round} value={round}>
                      {roundFormats[Number(round)]?.roundName || `Round ${round}`}
                    </option>
                  ))}
                </select>
              )}
              
              {/* Auto Board Assignment Toggle */}
              <label style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                padding: "8px 16px",
                background: autoBoardAssignmentEnabled ? "#22c55e" : "#374151",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
                fontSize: "14px",
                fontWeight: "500"
              }}>
                <input
                  type="checkbox"
                  checked={autoBoardAssignmentEnabled}
                  onChange={handleToggleAutoBoardAssignment}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span>Auto Board Assignment</span>
              </label>
              
              <button
                onClick={handleResetBracket}
                className="button button-secondary"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                title="Reset and re-seed bracket"
              >
                <RotateCcw size={18} />
                Reset Bracket
              </button>
              <button
                onClick={deleteBracket}
                className="button button-danger"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#dc2626",
                  color: "white",
                }}
                title="Delete entire bracket - return to Group Stage to regenerate"
              >
                <X size={18} />
                Delete Bracket
              </button>
              <button
                onClick={handlePrint}
                className="button button-primary"
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
                title="Print bracket"
              >
                <Printer size={18} />
                Print
              </button>
            </div>
          </div>
        </div>

        {/* Bracket Display */}
        {viewMode === 'bracket' ? (
          // Traditional horizontal bracket view
          <div
            style={{
              display: "flex",
              gap: "20px",
              overflowX: "auto",
              paddingBottom: "20px",
            }}
          >
            {rounds.map((round) => {
              const roundMatches = matchesByRound[round];
              const roundLabel = roundMatches[0]?.label.includes("Final")
                ? roundMatches[0]?.label.split(" - ")[0]
                : `Round ${round}`;

              return (
                <div key={round} style={{ minWidth: "320px", flex: "0 0 auto" }}>
                  {/* Round Header */}
                  <button
                    onClick={() => {
                      setEditingRound(round);
                      setShowRoundFormatModal(true);
                    }}
                    style={{
                      width: "100%",
                      background: "#475569",
                      color: "#fff",
                      padding: "15px 20px",
                      borderRadius: "10px 10px 0 0",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "16px",
                      border: "2px solid #64748b",
                      borderBottom: "none",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#64748b")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#475569")
                    }
                  >
                    <div>{roundFormats[round]?.roundName || roundLabel}</div>
                    <div
                      style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}
                    >
                      {roundFormats[round]?.format || "Best of 3"}
                    </div>
                  </button>

                  {/* Matches */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "20px",
                      marginTop: "0",
                    }}
                  >
                    {roundMatches.map((match, idx) => {
                    // A match is complete when there's a winner (scores are different) or both players have non-zero scores
                    const p1Score = match.s1 ? parseInt(match.s1) : 0;
                    const p2Score = match.s2 ? parseInt(match.s2) : 0;
                    const hasWinner = p1Score !== p2Score;
                    const bothHaveScores = p1Score > 0 || p2Score > 0;
                    const isComplete = hasWinner || bothHaveScores;

                    const p1Wins = isComplete && p1Score > p2Score;
                    const p2Wins = isComplete && p2Score > p1Score;
                    const isTie = isComplete && p1Score === p2Score;

                    return (
                      <div
                        key={match.id}
                        onClick={() => openScoreModal(match)}
                        className="card"
                        style={{
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background: match.status === 'in-progress' 
                            ? 'linear-gradient(135deg, rgba(255, 102, 0, 0.3) 0%, rgba(255, 102, 0, 0.15) 100%)'
                            : "#475569",
                          border: match.status === 'in-progress'
                            ? "2px solid #ff6600"
                            : "2px solid #64748b",
                          borderRadius: "10px",
                          marginTop: idx === 0 ? "0" : "0",
                          boxShadow: match.status === 'in-progress'
                            ? '0 0 20px rgba(255, 102, 0, 0.4)'
                            : 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "translateY(-2px)";
                          e.currentTarget.style.boxShadow = match.status === 'in-progress'
                            ? "0 8px 16px rgba(255, 102, 0, 0.4)"
                            : "0 4px 8px rgba(34, 197, 94, 0.2)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "translateY(0)";
                          e.currentTarget.style.boxShadow = match.status === 'in-progress'
                            ? '0 0 20px rgba(255, 102, 0, 0.4)'
                            : "none";
                        }}
                      >
                        {/* Match Number and Board Assignment Header */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "12px",
                          }}
                        >
                          {/* Match Number Box (Round-Match format like screenshot) */}
                          <div
                            style={{
                              background: "#ef4444",
                              padding: "8px 14px",
                              borderRadius: "6px",
                              fontSize: "14px",
                              fontWeight: "700",
                              color: "white",
                              minWidth: "50px",
                              textAlign: "center",
                            }}
                          >
                            {match.round}-{match.matchNumber}
                          </div>

                          {/* Right side: Board Assignment and Hamburger Menu */}
                          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                            {/* Board Assignment Dropdown */}
                            <div style={{ position: "relative" }}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowBoardDropdown(
                                    showBoardDropdown === match.id
                                      ? null
                                      : match.id,
                                  );
                                }}
                                style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: "32px",
                                height: "32px",
                                padding: "0",
                                background: match.boardNumber
                                  ? "#22c55e"
                                  : "#ef4444",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                fontSize: "18px",
                                fontWeight: "700",
                                cursor: "pointer",
                                transition: "all 0.2s",
                              }}
                              title={
                                match.boardNumber
                                  ? `Board ${match.boardNumber}`
                                  : "Assign Board"
                              }
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform = "scale(1.1)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = "scale(1)";
                              }}
                            >
                              {match.boardNumber || "+"}
                            </button>

                            {/* Dropdown Menu */}
                            {showBoardDropdown === match.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  right: 0,
                                  marginTop: "8px",
                                  background: "#1e293b",
                                  border: "2px solid #3b82f6",
                                  borderRadius: "8px",
                                  padding: "10px",
                                  minWidth: "140px",
                                  zIndex: 1000,
                                  boxShadow: "0 8px 16px rgba(0,0,0,0.4)",
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#94a3b8",
                                    marginBottom: "8px",
                                    fontWeight: "700",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",
                                  }}
                                >
                                  Assign Board
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "6px",
                                  }}
                                >
                                  {boards.map((board) => (
                                    <button
                                      key={board.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        assignBoardToMatch(
                                          match.dbId!,
                                          board.id,
                                        );
                                      }}
                                      style={{
                                        width: "100%",
                                        padding: "8px 12px",
                                        background:
                                          match.boardId === board.id
                                            ? "#3b82f6"
                                            : "#334155",
                                        color: "white",
                                        border:
                                          match.boardId === board.id
                                            ? "2px solid #60a5fa"
                                            : "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                        textAlign: "left",
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => {
                                        if (match.boardId !== board.id) {
                                          e.currentTarget.style.background =
                                            "#475569";
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (match.boardId !== board.id) {
                                          e.currentTarget.style.background =
                                            "#334155";
                                        }
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
                                        width: "100%",
                                        padding: "8px 12px",
                                        background: "#dc2626",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        marginTop: "4px",
                                        transition: "all 0.2s",
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background =
                                          "#b91c1c";
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background =
                                          "#dc2626";
                                      }}
                                    >
                                      Clear Board
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Icons */}
                          {/* Send Board Call */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenBoardCall(match);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              padding: "0",
                              background: "rgba(59, 130, 246, 0.2)",
                              border: "1px solid #3b82f6",
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            title="Send Board Call"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
                              e.currentTarget.style.transform = "scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <Send size={16} color="#3b82f6" />
                          </button>

                          {/* Mark as In Progress */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkInProgress(match);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              padding: "0",
                              background: match.status === 'in-progress' ? "rgba(255, 102, 0, 0.2)" : "rgba(34, 197, 94, 0.2)",
                              border: `1px solid ${match.status === 'in-progress' ? '#ff6600' : '#22c55e'}`,
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            title={match.status === 'in-progress' ? 'Remove In Progress' : 'Mark as In Progress'}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = match.status === 'in-progress' ? "rgba(255, 102, 0, 0.3)" : "rgba(34, 197, 94, 0.3)";
                              e.currentTarget.style.transform = "scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = match.status === 'in-progress' ? "rgba(255, 102, 0, 0.2)" : "rgba(34, 197, 94, 0.2)";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <PlayCircle size={16} color={match.status === 'in-progress' ? '#ff6600' : '#22c55e'} />
                          </button>

                          {/* Input Score */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInputScore(match);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              padding: "0",
                              background: "rgba(139, 92, 246, 0.2)",
                              border: "1px solid #8b5cf6",
                              borderRadius: "6px",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            title="Input Score"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(139, 92, 246, 0.3)";
                              e.currentTarget.style.transform = "scale(1.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <Edit3 size={16} color="#8b5cf6" />
                          </button>
                        </div>
                        </div>

                        {/* Match Label */}
                        <div
                          style={{
                            background: "#64748b",
                            padding: "6px 10px",
                            borderRadius: "4px",
                            marginBottom: "12px",
                            fontSize: "11px",
                            fontWeight: "600",
                            color: "#e2e8f0",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            textAlign: "center",
                          }}
                        >
                          {match.label}
                        </div>

                        {/* Players */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          {/* Player 1 */}
                          <div
                            draggable={match.p1 !== 'TBD'}
                            onDragStart={(e) => handleDragStart(e, match.id, 'p1', match.p1)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, match.id, 'p1', match.p1)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px",
                              background: p1Wins
                                ? "rgba(34, 197, 94, 0.2)"
                                : "#64748b",
                              borderRadius: "8px",
                              border: p1Wins
                                ? "2px solid #22c55e"
                                : "1px solid #94a3b8",
                              cursor: match.p1 !== 'TBD' ? 'grab' : 'default',
                              transition: "all 0.2s",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "15px",
                                fontWeight: p1Wins ? "700" : "500",
                                color: p1Wins ? "#22c55e" : "#e2e8f0",
                                flex: 1,
                                pointerEvents: 'none', // Prevent text selection during drag
                              }}
                            >
                              {p1Wins && "👑 "}
                              {match.p1}
                              {/* Show seeding info with proper formatting */}
                              {(() => {
                                if (match.p1Rank) {
                                  // Show properly formatted seeding
                                  const seedDisplay = formatSeedDisplay(
                                    match.p1Group,
                                    match.p1Rank,
                                  );
                                  return (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#94a3b8",
                                        marginLeft: "6px",
                                        fontWeight: "500",
                                      }}
                                    >
                                      ({seedDisplay})
                                    </span>
                                  );
                                }
                                // No fallback needed - if no rank data, show no seeding
                                return null;
                              })()}
                            </span>
                            <span
                              style={{
                                fontSize: "18px",
                                fontWeight: "700",
                                color: p1Wins ? "#22c55e" : "#e2e8f0",
                                minWidth: "40px",
                                textAlign: "center",
                                background: p1Wins
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : "#475569",
                                padding: "4px 12px",
                                borderRadius: "6px",
                              }}
                            >
                              {match.s1 || "-"}
                            </span>
                          </div>

                          {/* VS Divider */}
                          <div
                            style={{
                              textAlign: "center",
                              color: "#cbd5e1",
                              fontSize: "11px",
                              fontWeight: "600",
                              letterSpacing: "1px",
                            }}
                          >
                            VS
                          </div>

                          {/* Player 2 */}
                          <div
                            draggable={match.p2 !== 'TBD'}
                            onDragStart={(e) => handleDragStart(e, match.id, 'p2', match.p2)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, match.id, 'p2', match.p2)}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "12px",
                              background: p2Wins
                                ? "rgba(34, 197, 94, 0.2)"
                                : "#64748b",
                              borderRadius: "8px",
                              border: p2Wins
                                ? "2px solid #22c55e"
                                : "1px solid #94a3b8",
                              cursor: match.p2 !== 'TBD' ? 'grab' : 'default',
                              transition: "all 0.2s",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "15px",
                                fontWeight: p2Wins ? "700" : "500",
                                color: p2Wins ? "#22c55e" : "#e2e8f0",
                                flex: 1,
                                pointerEvents: 'none', // Prevent text selection during drag
                              }}
                            >
                              {p2Wins && "👑 "}
                              {match.p2}
                              {/* Show seeding info with proper formatting */}
                              {(() => {
                                if (match.p2Rank) {
                                  // Show properly formatted seeding
                                  const seedDisplay = formatSeedDisplay(
                                    match.p2Group,
                                    match.p2Rank,
                                  );
                                  return (
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "#94a3b8",
                                        marginLeft: "6px",
                                        fontWeight: "500",
                                      }}
                                    >
                                      ({seedDisplay})
                                    </span>
                                  );
                                }
                                // No fallback needed - if no rank data, show no seeding
                                return null;
                              })()}
                            </span>
                            <span
                              style={{
                                fontSize: "18px",
                                fontWeight: "700",
                                color: p2Wins ? "#22c55e" : "#e2e8f0",
                                minWidth: "40px",
                                textAlign: "center",
                                background: p2Wins
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : "#475569",
                                padding: "4px 12px",
                                borderRadius: "6px",
                              }}
                            >
                              {match.s2 || "-"}
                            </span>
                          </div>
                        </div>

                        {/* Winner Declaration */}
                        {isComplete && (p1Wins || p2Wins) && (
                          <div
                            style={{
                              marginTop: "12px",
                              textAlign: "center",
                              padding: "6px 12px",
                              background: "rgba(34, 197, 94, 0.2)",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#22c55e",
                              border: "1px solid #22c55e",
                            }}
                          >
                            🏆 {p1Wins ? match.p1 : match.p2} Wins!
                          </div>
                        )}
                        {isComplete && isTie && (
                          <div
                            style={{
                              marginTop: "12px",
                              textAlign: "center",
                              padding: "6px 12px",
                              background: "rgba(251, 191, 36, 0.2)",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#f59e0b",
                              border: "1px solid #f59e0b",
                            }}
                          >
                            🤝 Tie Game
                          </div>
                        )}
                        {!isComplete && (
                          <div
                            style={{
                              marginTop: "12px",
                              textAlign: "center",
                              padding: "6px 12px",
                              background: "rgba(59, 130, 246, 0.2)",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#60a5fa",
                              border: "1px solid #3b82f6",
                            }}
                          >
                            Click to Enter Score
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        ) : (
          // Round Grid View - shows one round at a time in a grid layout
          <div style={{ paddingBottom: "20px" }}>
            {selectedRoundView && matchesByRound[selectedRoundView] && (() => {
              const roundMatches = matchesByRound[selectedRoundView];
              const roundLabel = roundMatches[0]?.label.includes("Final")
                ? roundMatches[0]?.label.split(" - ")[0]
                : `Round ${selectedRoundView}`;
              const gridLayout = getGridLayout(roundMatches.length);

              return (
                <>
                  {/* Round Header */}
                  <button
                    onClick={() => {
                      setEditingRound(selectedRoundView);
                      setShowRoundFormatModal(true);
                    }}
                    style={{
                      width: "100%",
                      maxWidth: "800px",
                      margin: "0 auto 20px auto",
                      display: "block",
                      background: "#475569",
                      color: "#fff",
                      padding: "20px",
                      borderRadius: "12px",
                      textAlign: "center",
                      fontWeight: "700",
                      fontSize: "20px",
                      border: "2px solid #64748b",
                      cursor: "pointer",
                      transition: "background-color 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background = "#64748b")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background = "#475569")
                    }
                  >
                    <div>{roundFormats[selectedRoundView]?.roundName || roundLabel}</div>
                    <div
                      style={{ fontSize: "14px", opacity: 0.8, marginTop: "6px" }}
                    >
                      {roundFormats[selectedRoundView]?.format || "Best of 3"}
                    </div>
                  </button>

                  {/* Matches Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                      gap: "20px",
                      maxWidth: "1400px",
                      margin: "0 auto",
                    }}
                  >
                    {roundMatches.map((match, idx) => {
                      // A match is complete when there's a winner (scores are different) or both players have non-zero scores
                      const p1Score = match.s1 ? parseInt(match.s1) : 0;
                      const p2Score = match.s2 ? parseInt(match.s2) : 0;
                      const hasWinner = p1Score !== p2Score;
                      const bothHaveScores = p1Score > 0 || p2Score > 0;
                      const isComplete = hasWinner || bothHaveScores;

                      const p1Wins = isComplete && p1Score > p2Score;
                      const p2Wins = isComplete && p2Score > p1Score;
                      const isTie = isComplete && p1Score === p2Score;

                      // Board info
                      const boardInfo = match.board
                        ? getBoardInfo(match.board)
                        : null;

                      return (
                        <div
                          key={match.id}
                          onClick={() => setScoreMatch(match)}
                          style={{
                            background: "#1e293b",
                            borderRadius: "10px",
                            padding: "16px",
                            border: "2px solid #334155",
                            cursor: "pointer",
                            transition: "all 0.2s",
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.border = "2px solid #3b82f6";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.border = "2px solid #334155";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          {/* Match Label */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "12px",
                              paddingBottom: "8px",
                              borderBottom: "1px solid #334155",
                            }}
                          >
                            <span
                              style={{
                                color: "#94a3b8",
                                fontSize: "13px",
                                fontWeight: "600",
                              }}
                            >
                              Match {idx + 1}
                            </span>
                            {boardInfo && (
                              <span
                                style={{
                                  fontSize: "12px",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  fontWeight: "600",
                                  background: boardInfo.color,
                                  color: "#fff",
                                }}
                              >
                                {boardInfo.displayText}
                              </span>
                            )}
                          </div>

                          {/* Players Container */}
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            {/* Player 1 */}
                            <div
                              draggable={match.p1 !== 'TBD'}
                              onDragStart={(e) => handleDragStart(e, match.id, 'p1', match.p1)}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, match.id, 'p1', match.p1)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px",
                                background: p1Wins
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : "#64748b",
                                borderRadius: "6px",
                                border: p1Wins
                                  ? "2px solid #22c55e"
                                  : "1px solid #94a3b8",
                                cursor: match.p1 !== 'TBD' ? 'grab' : 'default',
                                transition: "all 0.2s",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: "#f8fafc",
                                  fontSize: "14px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {match.p1 || "TBD"}
                                {(() => {
                                  // P1: show group if available, otherwise show ranking position if available
                                  if (match.p1Group) {
                                    return (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#94a3b8",
                                          marginLeft: "6px",
                                          fontWeight: "500",
                                        }}
                                      >
                                        (Grp {match.p1Group})
                                      </span>
                                    );
                                  }
                                  if (match.p1Rank) {
                                    const seedDisplay = getSeedingDisplay(
                                      match.p1,
                                      match.p1Rank,
                                    );
                                    return (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#94a3b8",
                                          marginLeft: "6px",
                                          fontWeight: "500",
                                        }}
                                      >
                                        ({seedDisplay})
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </span>
                              <span
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "700",
                                  color: p1Wins ? "#22c55e" : "#e2e8f0",
                                  minWidth: "32px",
                                  textAlign: "center",
                                  background: p1Wins
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : "#475569",
                                  padding: "3px 10px",
                                  borderRadius: "5px",
                                }}
                              >
                                {match.s1 || "-"}
                              </span>
                            </div>

                            {/* VS Divider */}
                            <div
                              style={{
                                textAlign: "center",
                                color: "#cbd5e1",
                                fontSize: "10px",
                                fontWeight: "600",
                                letterSpacing: "1px",
                              }}
                            >
                              VS
                            </div>

                            {/* Player 2 */}
                            <div
                              draggable={match.p2 !== 'TBD'}
                              onDragStart={(e) => handleDragStart(e, match.id, 'p2', match.p2)}
                              onDragEnd={handleDragEnd}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, match.id, 'p2', match.p2)}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "10px",
                                background: p2Wins
                                  ? "rgba(34, 197, 94, 0.2)"
                                  : "#64748b",
                                borderRadius: "6px",
                                border: p2Wins
                                  ? "2px solid #22c55e"
                                  : "1px solid #94a3b8",
                                cursor: match.p2 !== 'TBD' ? 'grab' : 'default',
                                transition: "all 0.2s",
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: "600",
                                  color: "#f8fafc",
                                  fontSize: "14px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {match.p2 || "TBD"}
                                {(() => {
                                  // P2: show group if available, otherwise show ranking position if available
                                  if (match.p2Group) {
                                    return (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#94a3b8",
                                          marginLeft: "6px",
                                          fontWeight: "500",
                                        }}
                                      >
                                        (Grp {match.p2Group})
                                      </span>
                                    );
                                  }
                                  if (match.p2Rank) {
                                    const seedDisplay = getSeedingDisplay(
                                      match.p2,
                                      match.p2Rank,
                                    );
                                    return (
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          color: "#94a3b8",
                                          marginLeft: "6px",
                                          fontWeight: "500",
                                        }}
                                      >
                                        ({seedDisplay})
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </span>
                              <span
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "700",
                                  color: p2Wins ? "#22c55e" : "#e2e8f0",
                                  minWidth: "32px",
                                  textAlign: "center",
                                  background: p2Wins
                                    ? "rgba(34, 197, 94, 0.2)"
                                    : "#475569",
                                  padding: "3px 10px",
                                  borderRadius: "5px",
                                }}
                              >
                                {match.s2 || "-"}
                              </span>
                            </div>
                          </div>

                          {/* Match Status */}
                          {isComplete && (p1Wins || p2Wins) && (
                            <div
                              style={{
                                marginTop: "10px",
                                textAlign: "center",
                                padding: "5px 10px",
                                background: "rgba(34, 197, 94, 0.2)",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#22c55e",
                                border: "1px solid #22c55e",
                              }}
                            >
                              🏆 {p1Wins ? match.p1 : match.p2} Wins!
                            </div>
                          )}
                          {isComplete && isTie && (
                            <div
                              style={{
                                marginTop: "10px",
                                textAlign: "center",
                                padding: "5px 10px",
                                background: "rgba(251, 191, 36, 0.2)",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#f59e0b",
                                border: "1px solid #f59e0b",
                              }}
                            >
                              🤝 Tie Game
                            </div>
                          )}
                          {!isComplete && (
                            <div
                              style={{
                                marginTop: "10px",
                                textAlign: "center",
                                padding: "5px 10px",
                                background: "rgba(59, 130, 246, 0.2)",
                                borderRadius: "5px",
                                fontSize: "11px",
                                fontWeight: "600",
                                color: "#60a5fa",
                                border: "1px solid #3b82f6",
                              }}
                            >
                              Click to Enter Score
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* Board Call Modal */}
      {boardCallMatch && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setBoardCallMatch(null)}
        >
          <div
            className="card"
            style={{
              width: '450px',
              maxWidth: '95%',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '2px solid #3b82f6',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                padding: '20px',
                borderRadius: '10px 10px 0 0',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#fff' }}>
                📢 Send Board Call
              </h3>
              <button
                onClick={() => setBoardCallMatch(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#fff'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              <div style={{ marginBottom: '20px', fontSize: '14px', color: '#cbd5e1' }}>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong style={{ color: '#e2e8f0' }}>Match:</strong> {boardCallMatch.label}
                </p>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong style={{ color: '#e2e8f0' }}>Players:</strong> {boardCallMatch.p1} vs {boardCallMatch.p2}
                </p>
                <p style={{ margin: '0 0 10px 0' }}>
                  <strong style={{ color: '#e2e8f0' }}>Board:</strong> {selectedBoard}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setBoardCallMatch(null)}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: '#475569',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBoardCall}
                  disabled={sendingBoardCall}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    background: sendingBoardCall ? '#64748b' : '#3b82f6',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: sendingBoardCall ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Send size={16} />
                  {sendingBoardCall ? 'Sending...' : 'Send Board Call'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Entry Modal */}
      {showScoreModal && selectedMatch && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              width: "450px",
              maxWidth: "95%",
              background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
              border: "2px solid #3b82f6",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Header */}
            <div
              style={{
                background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                padding: "20px",
                borderRadius: "10px 10px 0 0",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                {selectedMatch.label}
              </h3>
              <button
                onClick={closeScoreModal}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  color: "#fff",
                }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Player Inputs */}
            <div style={{ padding: "0 20px 20px" }}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Player 1
                </label>
                <div
                  style={{
                    background: "#0f172a",
                    border: "2px solid #334155",
                    borderRadius: "8px",
                    padding: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    {selectedMatch.p1}
                  </span>
                  <input
                    type="number"
                    value={selectedMatch.s1}
                    onChange={(e) =>
                      setSelectedMatch({ ...selectedMatch, s1: e.target.value })
                    }
                    className="input"
                    style={{
                      width: "80px",
                      textAlign: "center",
                      fontSize: "20px",
                      fontWeight: "700",
                      background: "#1e293b",
                      border: "2px solid #3b82f6",
                      color: "#fff",
                    }}
                    placeholder="0"
                    min="0"
                    title="Player 1 score"
                  />
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    color: "#94a3b8",
                    fontSize: "13px",
                    fontWeight: "600",
                    marginBottom: "8px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Player 2
                </label>
                <div
                  style={{
                    background: "#0f172a",
                    border: "2px solid #334155",
                    borderRadius: "8px",
                    padding: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{
                      color: "#e2e8f0",
                      fontSize: "16px",
                      fontWeight: "600",
                    }}
                  >
                    {selectedMatch.p2}
                  </span>
                  <input
                    type="number"
                    value={selectedMatch.s2}
                    onChange={(e) =>
                      setSelectedMatch({ ...selectedMatch, s2: e.target.value })
                    }
                    className="input"
                    style={{
                      width: "80px",
                      textAlign: "center",
                      fontSize: "20px",
                      fontWeight: "700",
                      background: "#1e293b",
                      border: "2px solid #3b82f6",
                      color: "#fff",
                    }}
                    placeholder="0"
                    min="0"
                    title="Player 2 score"
                  />
                </div>
              </div>

              <button
                onClick={saveScore}
                className="button button-success"
                style={{
                  width: "100%",
                  padding: "15px",
                  fontSize: "16px",
                  fontWeight: "700",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  marginTop: "10px",
                }}
              >
                💾 Save Score
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Round Format Modal */}
      {showRoundFormatModal && editingRound && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#334155",
              padding: "30px",
              borderRadius: "15px",
              border: "2px solid #64748b",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <h2
              style={{
                color: "#ffffff",
                marginBottom: "20px",
                textAlign: "center",
                fontSize: "24px",
                fontWeight: "700",
              }}
            >
              Edit{" "}
              {roundFormats[editingRound]?.roundName || `Round ${editingRound}`}{" "}
              Format
            </h2>

            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  color: "#cbd5e1",
                  display: "block",
                  marginBottom: "10px",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                Match Format:
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "10px",
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((legs) => (
                  <button
                    key={legs}
                    onClick={() => updateRoundFormat(editingRound, legs)}
                    style={{
                      padding: "15px 20px",
                      backgroundColor:
                        (roundFormats[editingRound]?.legsToWin || 2) === legs
                          ? "#22c55e"
                          : "#475569",
                      color: "#ffffff",
                      border: "2px solid #64748b",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                      if (
                        (roundFormats[editingRound]?.legsToWin || 2) !== legs
                      ) {
                        e.currentTarget.style.backgroundColor = "#64748b";
                      }
                    }}
                    onMouseOut={(e) => {
                      if (
                        (roundFormats[editingRound]?.legsToWin || 2) !== legs
                      ) {
                        e.currentTarget.style.backgroundColor = "#475569";
                      }
                    }}
                  >
                    Best of {legs * 2 - 1}
                    <br />
                    <small style={{ opacity: 0.8 }}>First to {legs}</small>
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{ display: "flex", gap: "15px", justifyContent: "center" }}
            >
              <button
                onClick={() => {
                  setShowRoundFormatModal(false);
                  setEditingRound(null);
                }}
                style={{
                  padding: "12px 30px",
                  backgroundColor: "#64748b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "16px",
                  fontWeight: "600",
                  transition: "background-color 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#475569")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#64748b")
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default KnockoutBracket;
