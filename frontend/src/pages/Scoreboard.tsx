// Deleted: Old Tournament Standings page removed for redesign
// This file has been removed as part of the redesign process.
// Future implementation will replace this with a new standings page.
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/services/supabase";
import { useTournamentStore } from "@/store/tournament";
import { Match, Player, Board } from "@/types";
import { Trophy, Calendar, Clock, TrendingUp } from "lucide-react";
import "../styles/standings.css";

interface MatchWithDetails extends Match {
  player1: Player;
  player2: Player;
  board?: Board;
  group_name?: string;
  round_number?: number | null;
}

interface PlayerStanding {
  id: string;
  name: string;
  email: string;
  wins: number;
  losses: number;
  matches_played?: number;
  legs_won?: number;
  legs_lost?: number;
  leg_difference?: number;
  legDifferential: number;
  win_percentage?: number;
  group_name?: string;
  position?: number;
  points: number; // For group stage (wins * 3 + draws * 1)
  draws: number; // For group stage draws
}

interface KnockoutStanding {
  id: string;
  name: string;
  email: string;
  status?: string; // Winner, Runner-up, Semi-Finals, etc.
  phase_reached: string;
  highest_round: number;
  knockout_wins: number;
  knockout_losses: number;
  knockout_matches?: number;
  knockout_legs_won?: number;
  knockout_legs_lost?: number;
  leg_differential: number;
  position?: number;
}

interface TournamentStanding {
  id: string;
  name: string;
  email: string;
  phase_reached: string; // Winner, Finalist, Semi-Finals, Group Stage, etc.
  total_wins: number;
  total_losses: number;
  rr_points: number; // Round robin points
  ko_wins: number; // Knockout wins only
  total_leg_diff: number;
  highest_round: number; // For sorting priority
  position?: number;
}

export default function TournamentStandings() {
  const { id } = useParams<{ id: string }>();
  const { currentTournament } = useTournamentStore();
  const [upcomingMatches, setUpcomingMatches] = useState<MatchWithDetails[]>(
    [],
  );
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [groupStandings, setGroupStandings] = useState<
    Record<string, PlayerStanding[]>
  >({});
  const [overallStandings, setOverallStandings] = useState<
    TournamentStanding[]
  >([]);
  const [knockoutStandings, setKnockoutStandings] = useState<
    KnockoutStanding[]
  >([]);
  const [groupBoards, setGroupBoards] = useState<Record<string, number[]>>({});
  const [maxRoundNumber, setMaxRoundNumber] = useState(0);
  const [currentStage, setCurrentStage] = useState<"group" | "knockout">(
    "group",
  );
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<
    "tournament" | "group" | "knockout" | "matches"
  >("tournament");

  useEffect(() => {
    if (id) {
      loadStandingsData();
      const interval = setInterval(loadStandingsData, 30000);
      const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

      return () => {
        clearInterval(interval);
        clearInterval(timeInterval);
      };
    }
  }, [id]);

  const loadStandingsData = async () => {
    if (!id) return;

    try {
      // Load Group Stage standings (Round Robin matches only)
      const { data: groupMatches, error: groupError } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:players!matches_player1_id_fkey(*),
          player2:players!matches_player2_id_fkey(*),
          winner:players!matches_winner_id_fkey(*)
        `,
        )
        .eq("tournament_id", id)
        .eq("status", "completed")
        .is("round_number", null); // Only group stage matches

      if (groupError) throw groupError;

      // Get all players
      const { data: allPlayers, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("tournament_id", id);

      if (playersError) throw playersError;

      // Calculate Group Standings
      const groupStats: Record<string, PlayerStanding> = {};

      allPlayers?.forEach((player) => {
        groupStats[player.id] = {
          id: player.id,
          name: player.name,
          email: player.email,
          wins: 0,
          losses: 0,
          draws: 0,
          points: 0,
          legDifferential: 0,
        };
      });

      groupMatches?.forEach((match) => {
        const p1Stats = groupStats[match.player1.id];
        const p2Stats = groupStats[match.player2.id];

        if (p1Stats && p2Stats) {
          p1Stats.legDifferential += match.player1_legs - match.player2_legs;
          p2Stats.legDifferential += match.player2_legs - match.player1_legs;

          if (match.winner_id === match.player1.id) {
            p1Stats.wins++;
            p1Stats.points += 3;
            p2Stats.losses++;
          } else if (match.winner_id === match.player2.id) {
            p2Stats.wins++;
            p2Stats.points += 3;
            p1Stats.losses++;
          } else {
            // Draw case
            p1Stats.draws++;
            p2Stats.draws++;
            p1Stats.points += 1;
            p2Stats.points += 1;
          }
        }
      });

      const groupStandings = Object.values(groupStats)
        .sort((a, b) => {
          if (a.points !== b.points) return b.points - a.points;
          if (a.legDifferential !== b.legDifferential) return b.legDifferential - a.legDifferential;
          return a.name.localeCompare(b.name);
        })
        .map((player, index) => ({ ...player, position: index + 1 }));

      setStandings(groupStandings);

      // Load Knockout Standings (Knockout matches only)
      const { data: knockoutMatches, error: knockoutError } = await supabase
        .from("matches")
        .select(
          `
          *,
          player1:players!matches_player1_id_fkey(*),
          player2:players!matches_player2_id_fkey(*),
          winner:players!matches_winner_id_fkey(*)
        `,
        )
        .eq("tournament_id", id)
        .eq("status", "completed")
        .not("round_number", "is", null); // Only knockout matches

      if (knockoutError) throw knockoutError;

// Calculate Knockout Standings with proper deduplication
        const knockoutStats: Record<string, KnockoutStanding> = {};
        const processedMatches = new Set<string>();

        allPlayers?.forEach((player) => {
          knockoutStats[player.id] = {
            id: player.id,
            name: player.name,
            email: player.email,
            phase_reached: "Group Stage",
            knockout_wins: 0,
            knockout_losses: 0,
            leg_differential: 0,
            highest_round: 0,
          };
        });

        const maxRound = Math.max(...(knockoutMatches?.map(m => m.round_number) || [0]));

        // Debug: Log all knockout matches to understand the duplication
        console.log("🥊 ALL KNOCKOUT MATCHES:", knockoutMatches?.map(m => ({
          id: m.id,
          round: m.round_number,
          p1: m.player1?.name,
          p2: m.player2?.name,
          p1_id: m.player1?.id?.substring(0,8),
          p2_id: m.player2?.id?.substring(0,8),
          p1_direct_id: m.player1_id?.substring(0,8),
          p2_direct_id: m.player2_id?.substring(0,8),
          winner: m.winner?.name,
          score: `${m.player1_legs}-${m.player2_legs}`,
        })));

        console.log("🔍 FIRST MATCH FULL STRUCTURE:", knockoutMatches?.[0]);

        // Process each match only once using match ID deduplication (simpler approach)
        knockoutMatches?.forEach((match) => {
          // Use match ID as the unique identifier - much simpler and foolproof
          const matchKey = match.id;
          
          console.log(`🔑 Processing match: ${match.player1?.name} vs ${match.player2?.name}, Round ${match.round_number}, MatchID: ${matchKey}`);
          
          if (!processedMatches.has(matchKey)) {
            processedMatches.add(matchKey);
            console.log(`✅ NEW match processed`);
            
            // Use player1 and player2 objects directly
            const p1Stats = knockoutStats[match.player1?.id];
            const p2Stats = knockoutStats[match.player2?.id];

            if (p1Stats && p2Stats) {
              // Both players reached this round
              p1Stats.highest_round = Math.max(p1Stats.highest_round, match.round_number);
              p2Stats.highest_round = Math.max(p2Stats.highest_round, match.round_number);

              p1Stats.leg_differential += match.player1_legs - match.player2_legs;
              p2Stats.leg_differential += match.player2_legs - match.player1_legs;

              if (match.winner?.id === match.player1?.id) {
                p1Stats.knockout_wins++;
                p2Stats.knockout_losses++;
                console.log(`🏆 ${match.player1?.name} wins`);
              } else if (match.winner?.id === match.player2?.id) {
                p2Stats.knockout_wins++;
                p1Stats.knockout_losses++;
                console.log(`🏆 ${match.player2?.name} wins`);
              }
            }
          } else {
            console.log(`❌ DUPLICATE match skipped`);
          }
        });

        console.log("📊 FINAL KNOCKOUT STATS:", Object.values(knockoutStats).map(s => ({
          name: s.name,
          wins: s.knockout_wins,
          losses: s.knockout_losses,
          total_matches: s.knockout_wins + s.knockout_losses
        })));

        // Determine phase reached
        Object.values(knockoutStats).forEach((stats) => {
          const round = stats.highest_round;
          if (round === 0) {
            stats.phase_reached = "Group Stage";
          } else {
            const roundsFromEnd = maxRound - round;
            if (roundsFromEnd <= -1) stats.phase_reached = "Winner";
            else if (roundsFromEnd === 0) stats.phase_reached = "Finalist";
            else if (roundsFromEnd === 1) stats.phase_reached = "Semi-Finals";
            else if (roundsFromEnd === 2) stats.phase_reached = "Quarter-Finals";
            else stats.phase_reached = `Round ${round}`;
          }
        });

        const knockoutStandingsData = Object.values(knockoutStats)
          .sort((a, b) => {
            if (a.highest_round !== b.highest_round) return b.highest_round - a.highest_round;
            if (a.knockout_wins !== b.knockout_wins) return b.knockout_wins - a.knockout_wins;
            if (a.leg_differential !== b.leg_differential) return b.leg_differential - a.leg_differential;
            return a.name.localeCompare(b.name);
          })
          .map((player, index) => ({ ...player, position: index + 1 }));

        setKnockoutStandings(knockoutStandingsData);

        await Promise.all([
          loadUpcomingMatches(),
          loadTournamentStage(),
          // loadGroupBoards(), // Temporarily disabled to avoid DB error
        ]);
      } catch (error) {
        console.error("Error loading standings data:", error);
      } finally {
        setLoading(false);
      }
    };

  const loadUpcomingMatches = async () => {
    if (!id) return;

    const { data: scheduled, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        player1:players!matches_player1_id_fkey(*),
        player2:players!matches_player2_id_fkey(*),
        board:boards!matches_board_id_fkey(*),
        group:groups(name)
      `,
      )
      .eq("tournament_id", id)
      .eq("status", "scheduled")
      .order("round_number", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
      .limit(8);

    if (error) throw error;

    setUpcomingMatches(
      (scheduled || []).map((m) => ({
        ...m,
        group_name: (m.group as any)?.name,
      })),
    );
  };

  const loadTournamentStage = async () => {
    if (!id) return;

    const { data: groupMatches } = await supabase
      .from("matches")
      .select("id, round_number")
      .eq("tournament_id", id)
      .is("round_number", null)
      .limit(1);

    const { data: maxRound } = await supabase
      .from("matches")
      .select("round_number")
      .eq("tournament_id", id)
      .not("round_number", "is", null)
      .order("round_number", { ascending: false })
      .limit(1);

    setMaxRoundNumber(maxRound?.[0]?.round_number || 0);
    const stage =
      groupMatches && groupMatches.length > 0 ? "group" : "knockout";
    setCurrentStage(stage);

    if (stage === "group") {
      await loadGroupStandings();
      await loadKnockoutStandings();
      await loadTournamentStandings();
    } else {
      await loadTournamentStandings();
      await loadKnockoutStandings();
    }
  };

  const loadGroupStandings = async () => {
    if (!id) return;

    const { data: matches, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        player1:players!matches_player1_id_fkey(*),
        player2:players!matches_player2_id_fkey(*),
        group:groups(name),
        winner:players!matches_winner_id_fkey(*)
      `,
      )
      .eq("tournament_id", id)
      .is("round_number", null)
      .eq("status", "completed");

    if (error) throw error;

    const groupStats: Record<string, Record<string, PlayerStanding>> = {};

    matches?.forEach((match) => {
      const groupName = (match.group as any)?.name || "Ungrouped";

      if (!groupStats[groupName]) {
        groupStats[groupName] = {};
      }

      [match.player1, match.player2].forEach((player) => {
        if (!groupStats[groupName][player.id]) {
          groupStats[groupName][player.id] = {
            id: player.id,
            name: player.name,
            email: player.email,
            wins: 0,
            losses: 0,
            draws: 0,
            matches_played: 0,
            legs_won: 0,
            legs_lost: 0,
            leg_difference: 0,
            win_percentage: 0,
            points: 0,
            group_name: groupName,
          };
        }
      });

      const p1Stats = groupStats[groupName][match.player1.id];
      const p2Stats = groupStats[groupName][match.player2.id];

      p1Stats.matches_played++;
      p2Stats.matches_played++;
      p1Stats.legs_won += match.player1_legs;
      p1Stats.legs_lost += match.player2_legs;
      p2Stats.legs_won += match.player2_legs;
      p2Stats.legs_lost += match.player1_legs;

      if (match.winner_id === match.player1.id) {
        p1Stats.wins++;
        p1Stats.points = (p1Stats.points || 0) + 3; // Win = 3 points
        p2Stats.losses++;
      } else if (match.winner_id === match.player2.id) {
        p2Stats.wins++;
        p2Stats.points = (p2Stats.points || 0) + 3; // Win = 3 points
        p1Stats.losses++;
      } else {
        // Draw case (if applicable)
        p1Stats.draws = (p1Stats.draws || 0) + 1;
        p2Stats.draws = (p2Stats.draws || 0) + 1;
        p1Stats.points = (p1Stats.points || 0) + 1; // Draw = 1 point
        p2Stats.points = (p2Stats.points || 0) + 1; // Draw = 1 point
      }
    });

    const standings: Record<string, PlayerStanding[]> = {};

    Object.entries(groupStats).forEach(([groupName, players]) => {
      standings[groupName] = Object.values(players)
        .map((player) => ({
          ...player,
          leg_difference: player.legs_won - player.legs_lost,
          win_percentage:
            player.matches_played > 0
              ? (player.wins / player.matches_played) * 100
              : 0,
        }))
        .sort((a, b) => {
          // Sort by Points → Goal/Point Difference → Head-to-Head (legs won as tiebreaker)
          if ((a.points || 0) !== (b.points || 0))
            return (b.points || 0) - (a.points || 0);
          if (a.leg_difference !== b.leg_difference)
            return b.leg_difference - a.leg_difference;
          return b.legs_won - a.legs_won;
        })
        .map((player, index) => ({ ...player, position: index + 1 }));
    });

    setGroupStandings(standings);
  };

  const loadKnockoutStandings = async () => {
    if (!id) return;

    const { data: matches, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        player1:players!matches_player1_id_fkey(*),
        player2:players!matches_player2_id_fkey(*),
        winner:players!matches_winner_id_fkey(*)
      `,
      )
      .eq("tournament_id", id)
      .not("round_number", "is", null)
      .eq("status", "completed");

    if (error) throw error;

    const knockoutStats: Record<string, KnockoutStanding> = {};
    const playerHighestRounds: Record<string, number> = {};

    matches?.forEach((match) => {
      [match.player1, match.player2].forEach((player) => {
        if (!knockoutStats[player.id]) {
          knockoutStats[player.id] = {
            id: player.id,
            name: player.name,
            email: player.email,
            status: "Eliminated",
            highest_round: 0,
            knockout_wins: 0,
            knockout_losses: 0,
            knockout_matches: 0,
            knockout_legs_won: 0,
            knockout_legs_lost: 0,
            knockout_leg_diff: 0,
          };
        }
      });

      const p1Stats = knockoutStats[match.player1.id];
      const p2Stats = knockoutStats[match.player2.id];
      const round = match.round_number || 0;

      // Track highest round reached
      playerHighestRounds[match.player1.id] = Math.max(
        playerHighestRounds[match.player1.id] || 0,
        round,
      );
      playerHighestRounds[match.player2.id] = Math.max(
        playerHighestRounds[match.player2.id] || 0,
        round,
      );

      p1Stats.knockout_matches++;
      p2Stats.knockout_matches++;
      p1Stats.knockout_legs_won += match.player1_legs;
      p1Stats.knockout_legs_lost += match.player2_legs;
      p2Stats.knockout_legs_won += match.player2_legs;
      p2Stats.knockout_legs_lost += match.player1_legs;

      if (match.winner_id === match.player1.id) {
        p1Stats.knockout_wins++;
        p2Stats.knockout_losses++;
        // Winner advances to next round
        playerHighestRounds[match.player1.id] = Math.max(
          playerHighestRounds[match.player1.id] || 0,
          round + 1,
        );
      } else if (match.winner_id === match.player2.id) {
        p2Stats.knockout_wins++;
        p1Stats.knockout_losses++;
        // Winner advances to next round
        playerHighestRounds[match.player2.id] = Math.max(
          playerHighestRounds[match.player2.id] || 0,
          round + 1,
        );
      }
    });

    // Determine status based on highest round reached
    Object.entries(knockoutStats).forEach(([playerId, stats]) => {
      const highestRound = playerHighestRounds[playerId] || 0;
      stats.highest_round = highestRound;

      const roundsFromEnd = maxRoundNumber - highestRound;
      if (roundsFromEnd <= -1) {
        stats.status = "Winner";
      } else if (roundsFromEnd === 0) {
        stats.status = "Runner-up";
      } else if (roundsFromEnd === 1) {
        stats.status = "Semi-Finals";
      } else if (roundsFromEnd === 2) {
        stats.status = "Quarter-Finals";
      } else if (roundsFromEnd === 3) {
        stats.status = "Round of 16";
      } else {
        stats.status = `Round ${highestRound}`;
      }

      stats.knockout_leg_diff =
        stats.knockout_legs_won - stats.knockout_legs_lost;
    });

    // Sort by Round Reached → Knockout Wins → Knockout Leg Difference
    const standings = Object.values(knockoutStats)
      .sort((a, b) => {
        if (a.highest_round !== b.highest_round)
          return b.highest_round - a.highest_round;
        if (a.knockout_wins !== b.knockout_wins)
          return b.knockout_wins - a.knockout_wins;
        if (a.knockout_leg_diff !== b.knockout_leg_diff)
          return b.knockout_leg_diff - a.knockout_leg_diff;
        return b.knockout_legs_won - a.knockout_legs_won;
      })
      .map((player, index) => ({ ...player, position: index + 1 }));

    setKnockoutStandings(standings);
  };

  const loadTournamentStandings = async () => {
    if (!id) return;

    // Get all completed matches
    const { data: allMatches, error } = await supabase
      .from("matches")
      .select(
        `
        *,
        player1:players!matches_player1_id_fkey(*),
        player2:players!matches_player2_id_fkey(*),
        winner:players!matches_winner_id_fkey(*)
      `,
      )
      .eq("tournament_id", id)
      .eq("status", "completed");

    if (error) throw error;

    // Get all players
    const { data: allPlayers, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("tournament_id", id);

    if (playersError) throw playersError;

    const tournamentStats: Record<string, TournamentStanding> = {};

    // Initialize all players
    allPlayers?.forEach((player) => {
      tournamentStats[player.id] = {
        id: player.id,
        name: player.name,
        email: player.email,
        phase_reached: "Group Stage",
        total_wins: 0,
        total_losses: 0,
        rr_points: 0,
        ko_wins: 0,
        total_leg_diff: 0,
        highest_round: 0,
      };
    });

    // Process ALL matches (both group and knockout) for overall stats
    allMatches?.forEach((match) => {
      const p1Stats = tournamentStats[match.player1.id];
      const p2Stats = tournamentStats[match.player2.id];

      if (p1Stats && p2Stats) {
        // Add legs to total differential
        p1Stats.total_leg_diff += match.player1_legs - match.player2_legs;
        p2Stats.total_leg_diff += match.player2_legs - match.player1_legs;

        if (match.winner_id === match.player1.id) {
          p1Stats.total_wins++;
          p2Stats.total_losses++;
          
          // If it's a group match, add RR points
          if (match.round_number === null) {
            p1Stats.rr_points += 3;
          }
          // If it's a knockout match, add KO win
          else {
            p1Stats.ko_wins++;
          }
        } else if (match.winner_id === match.player2.id) {
          p2Stats.total_wins++;
          p1Stats.total_losses++;
          
          // If it's a group match, add RR points
          if (match.round_number === null) {
            p2Stats.rr_points += 3;
          }
          // If it's a knockout match, add KO win
          else {
            p2Stats.ko_wins++;
          }
        }
      }
    });

    // Determine phase reached for each player
    const knockoutMatches = allMatches?.filter((m) => m.round_number !== null) || [];
    const maxRoundNumber = Math.max(...knockoutMatches.map((m) => m.round_number || 0), 0);

    Object.entries(tournamentStats).forEach(([playerId, stats]) => {
      // Find highest round this player reached
      let highestRound = 0;
      knockoutMatches.forEach((match) => {
        if (match.player1.id === playerId || match.player2.id === playerId) {
          highestRound = Math.max(highestRound, match.round_number || 0);
        }
      });

      stats.highest_round = highestRound;

      if (highestRound === 0) {
        stats.phase_reached = "Group Stage";
      } else {
        const roundsFromEnd = maxRoundNumber - highestRound;
        if (roundsFromEnd <= -1) {
          stats.phase_reached = "Winner";
        } else if (roundsFromEnd === 0) {
          stats.phase_reached = "Finalist";
        } else if (roundsFromEnd === 1) {
          stats.phase_reached = "Semi-Finals";
        } else if (roundsFromEnd === 2) {
          stats.phase_reached = "Quarter-Finals";
        } else {
          stats.phase_reached = `Round ${highestRound}`;
        }
      }
    });

    // Sort and rank players
    const standings = Object.values(tournamentStats)
      .sort((a, b) => {
        if (a.highest_round !== b.highest_round) return b.highest_round - a.highest_round;
        if (a.total_wins !== b.total_wins) return b.total_wins - a.total_wins;
        if (a.total_leg_diff !== b.total_leg_diff) return b.total_leg_diff - a.total_leg_diff;
        return 0;
      })
      .map((player, index) => ({ ...player, position: index + 1 }));

    setOverallStandings(standings);
  };

  const loadGroupBoards = async () => {
    if (!id) return;

    const { data: groups, error } = await supabase
      .from("groups")
      .select(
        `
        name,
        group_boards!group_boards_group_id_fkey(
          board:boards(id, name, board_number)
        )
      `,
      )
      .eq("tournament_id", id);

    if (error) throw error;

    const boardMap: Record<string, number[]> = {};
    groups?.forEach((group) => {
      const boards =
        (group.group_boards as any[])
          ?.map((gb: any) => gb.board?.board_number)
          .filter(Boolean) || [];
      boardMap[group.name] = boards.sort((a, b) => a - b);
    });

    setGroupBoards(boardMap);
  };

  const getRoundName = (roundNum: number) => {
    if (roundNum === 0 || !roundNum) return "Group Stage";

    const roundsFromEnd = maxRoundNumber - roundNum;
    const playersInRound = Math.pow(2, roundsFromEnd + 1);

    if (playersInRound >= 128) return `Round ${roundNum}`;
    if (playersInRound === 64) return "Round of 64";
    if (playersInRound === 32) return "Round of 32";
    if (playersInRound === 16) return "Round of 16";
    if (playersInRound === 8) return "Quarter Finals";
    if (playersInRound === 4) return "Semi Finals";
    if (playersInRound === 2) return "Final";

    return `Round ${roundNum}`;
  };

  const getBoardDisplay = (match: MatchWithDetails) => {
    if (match.board) {
      return `Board ${match.board.board_number}`;
    }

    if (match.group_name && groupBoards[match.group_name]) {
      const boards = groupBoards[match.group_name];
      if (boards.length === 1) {
        return `Board ${boards[0]}`;
      } else if (boards.length > 1) {
        return `Boards ${boards.join(", ")}`;
      }
    }

    return "TBD";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPositionBadge = (position: number) => {
    const baseClasses =
      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold";

    if (position === 1) {
      return <div className={`${baseClasses} bg-yellow-500 text-white`}>1</div>;
    } else if (position === 2) {
      return <div className={`${baseClasses} bg-gray-400 text-white`}>2</div>;
    } else if (position === 3) {
      return <div className={`${baseClasses} bg-orange-500 text-white`}>3</div>;
    }
    return (
      <div className={`${baseClasses} bg-slate-600 text-gray-200`}>
        {position}
      </div>
    );
  };

  // Get player's recent form (last 5 matches) - simplified version using tournament store
  const getPlayerForm = (playerId: string): string[] => {
    // For now, return a mock form until we have access to all matches
    // In a real implementation, you'd fetch completed matches for this player
    const mockForm = ["w", "l", "w", "w", "l"]; // Mock recent form data
    return mockForm.slice(0, 5);
  };

  const renderForm = (form: string[]) => (
    <div className="form-container">
      {form.map((result, index) => (
        <div key={index} className={`form-dot ${result}`}>
          {result.toUpperCase()}
        </div>
      ))}
    </div>
  );

  const renderTournamentStandingsTable = (
    players: TournamentStanding[],
    title: string,
  ) => (
    <div className="standings-wrapper">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {players.length} players
          </span>
        </div>
      </div>

      <table className="standings-table">
        <thead>
          <tr>
            <th className="align-left">Rank</th>
            <th className="align-left">Player</th>
            <th>Phase Reached</th>
            <th>Total Wins</th>
            <th>RR Pts</th>
            <th>KO Wins</th>
            <th>Total +/-</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.id}
              className={player.position! <= 3 ? "qualify-top" : ""}
            >
              <td>
                <div className="flex items-center">
                  {getPositionBadge(player.position!)}
                </div>
              </td>
              <td className="team-name">{player.name}</td>
              <td
                className={
                  player.phase_reached === "Winner"
                    ? "win-stat"
                    : player.phase_reached === "Finalist"
                      ? "pts-col"
                      : ""
                }
              >
                {player.phase_reached}
              </td>
              <td className="win-stat">{player.total_wins}</td>
              <td>{player.rr_points}</td>
              <td className="pts-col">{player.ko_wins}</td>
              <td
                className={
                  player.total_leg_diff > 0
                    ? "diff-positive"
                    : player.total_leg_diff < 0
                      ? "diff-negative"
                      : "diff-neutral"
                }
              >
                {player.total_leg_diff > 0 ? "+" : ""}
                {player.total_leg_diff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderKnockoutStandingsTable = (
    players: KnockoutStanding[],
    title: string,
  ) => (
    <div className="standings-wrapper">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {players.length} players
          </span>
        </div>
      </div>

      <table className="standings-table">
        <thead>
          <tr>
            <th className="align-left">Rank</th>
            <th className="align-left">Player</th>
            <th>Status</th>
            <th>KO Wins</th>
            <th>KO Matches</th>
            <th>KO +/-</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.id}
              className={player.position! <= 3 ? "qualify-top" : ""}
            >
              <td>
                <div className="flex items-center">
                  {getPositionBadge(player.position!)}
                </div>
              </td>
              <td className="team-name">{player.name}</td>
              <td
                className={
                  player.status === "Winner"
                    ? "win-stat"
                    : player.status === "Runner-up"
                      ? "pts-col"
                      : ""
                }
              >
                {player.status}
              </td>
              <td className="win-stat">{player.knockout_wins}</td>
              <td>{player.knockout_matches}</td>
              <td
                className={
                  player.knockout_leg_diff > 0
                    ? "diff-positive"
                    : player.knockout_leg_diff < 0
                      ? "diff-negative"
                      : "diff-neutral"
                }
              >
                {player.knockout_leg_diff > 0 ? "+" : ""}
                {player.knockout_leg_diff}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderStandingsTable = (players: PlayerStanding[], title: string) => (
    <div className="standings-wrapper">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <span className="text-sm text-gray-500">
            {players.length} players
          </span>
        </div>
      </div>

      <table className="standings-table">
        <thead>
          <tr>
            <th className="align-left">Rank</th>
            <th className="align-left">Player</th>
            <th>MP</th>
            <th>W</th>
            <th>L</th>
            <th>Win%</th>
            <th>LW</th>
            <th>LL</th>
            <th>Diff</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr
              key={player.id}
              className={player.position! <= 3 ? "qualify-top" : ""}
            >
              <td>
                <div className="flex items-center">
                  {getPositionBadge(player.position!)}
                </div>
              </td>
              <td className="team-name">{player.name}</td>
              <td>{player.matches_played}</td>
              <td className="win-stat">{player.wins}</td>
              <td className="loss-stat">{player.losses}</td>
              <td className="pts-col">{player.win_percentage.toFixed(0)}%</td>
              <td>{player.legs_won}</td>
              <td>{player.legs_lost}</td>
              <td
                className={
                  player.leg_difference > 0
                    ? "diff-positive"
                    : player.leg_difference < 0
                      ? "diff-negative"
                      : "diff-neutral"
                }
              >
                {player.leg_difference > 0 ? "+" : ""}
                {player.leg_difference}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTournamentStandings = () => (
    <div>
      {renderTournamentStandingsTable(
        overallStandings,
        "Overall Tournament Standings",
      )}
    </div>
  );

  const renderGroupStandings = () => (
    <div className="space-y-8">
      {Object.entries(groupStandings).map(([groupName, players]) => (
        <div key={groupName} className="standings-wrapper">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {groupName}
                </h3>
                {groupBoards[groupName] &&
                  groupBoards[groupName].length > 0 && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      Boards {groupBoards[groupName].join(", ")}
                    </span>
                  )}
              </div>
              <span className="text-sm text-gray-500">
                {players.length} players
              </span>
            </div>
          </div>

          <table className="standings-table">
            <thead>
              <tr>
                <th className="align-left">Pos</th>
                <th className="align-left">Player</th>
                <th>MP</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>Pts</th>
                <th>LW</th>
                <th>LL</th>
                <th>Diff</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr
                  key={player.id}
                  className={player.position! <= 2 ? "qualify-top" : ""}
                >
                  <td>
                    <div className="flex items-center">
                      {getPositionBadge(player.position!)}
                    </div>
                  </td>
                  <td className="team-name">{player.name}</td>
                  <td>{player.matches_played}</td>
                  <td className="win-stat">{player.wins}</td>
                  <td>{player.draws || 0}</td>
                  <td className="loss-stat">{player.losses}</td>
                  <td className="pts-col">{player.points || 0}</td>
                  <td>{player.legs_won}</td>
                  <td>{player.legs_lost}</td>
                  <td
                    className={
                      player.leg_difference > 0
                        ? "diff-positive"
                        : player.leg_difference < 0
                          ? "diff-negative"
                          : "diff-neutral"
                    }
                  >
                    {player.leg_difference > 0 ? "+" : ""}
                    {player.leg_difference}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const renderKnockoutStandings = () => (
    <div>
      {renderKnockoutStandingsTable(
        knockoutStandings,
        "Knockout Stage Standings",
      )}
    </div>
  );

  const renderUpcomingMatches = () => (
    <div className="max-w-6xl mx-auto">
      <div className="upcoming-matches-wrapper">
        <div className="upcoming-matches-header">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 calendar-icon" />
            <h3>Upcoming Matches</h3>
          </div>
        </div>

        <div className="upcoming-matches-content">
          {upcomingMatches.length > 0 ? (
            <div className="upcoming-matches-table">
              {upcomingMatches.map((match, index) => (
                <div key={match.id} className="match-row">
                  <div className="match-info">
                    <div className="match-round">
                      {getRoundName(match.round_number || 0)}
                    </div>
                    <div className="match-board">{getBoardDisplay(match)}</div>
                    <div className="match-format">
                      First to {match.legs_to_win}
                    </div>
                  </div>

                  <div className="player-left">
                    <div className="player-name">
                      {match.player1?.name || "TBD"}
                    </div>
                    {match.player1?.id && (
                      <div className="player-form">
                        {renderForm(getPlayerForm(match.player1.id))}
                      </div>
                    )}
                  </div>

                  <div className="vs-section">
                    <div className="vs-text">VS</div>
                  </div>

                  <div className="player-right">
                    <div className="player-name">
                      {match.player2?.name || "TBD"}
                    </div>
                    {match.player2?.id && (
                      <div className="player-form">
                        {renderForm(getPlayerForm(match.player2.id))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-matches">
              <TrendingUp className="w-12 h-12 no-matches-icon" />
              <p className="no-matches-text">No upcoming matches</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const getRowClasses = (position: number, isQualified: boolean) => {
    let classes = "border-b border-gray-200 hover:bg-gray-50 transition-colors";

    if (position <= 3) {
      classes += " bg-gradient-to-r from-yellow-50 to-transparent";
    } else if (isQualified) {
      classes += " bg-gradient-to-r from-green-50 to-transparent";
    }

    return classes;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Trophy
            size={48}
            className="mx-auto mb-4 text-blue-600 animate-pulse"
          />
          <p className="text-gray-600 text-lg font-medium">
            Loading Tournament Standings...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="standings-dark-bg">
        {/* Professional Header */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-600 rounded-lg">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Tournament Standings
                  </h1>
                  {currentTournament && (
                    <p className="text-lg text-gray-600 mt-1">
                      {currentTournament.name}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center space-x-4 text-sm text-gray-300">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" color="#ff6600" />
                    <span>{formatTime(currentTime)}</span>
                  </div>
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    {currentStage === "group"
                      ? "Group Stage"
                      : "Knockout Stage"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="standings-tabs">
            <button
              className={`standings-tab ${activeTab === "tournament" ? "active" : ""}`}
              onClick={() => setActiveTab("tournament")}
            >
              Tournament Standings
            </button>
            <button
              className={`standings-tab ${activeTab === "group" ? "active" : ""}`}
              onClick={() => setActiveTab("group")}
            >
              Group Standings
            </button>
            <button
              className={`standings-tab ${activeTab === "knockout" ? "active" : ""}`}
              onClick={() => setActiveTab("knockout")}
            >
              Knockout Standings
            </button>
            <button
              className={`standings-tab ${activeTab === "matches" ? "active" : ""}`}
              onClick={() => setActiveTab("matches")}
            >
              Upcoming Matches
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Tab Content */}
          {activeTab === "tournament" && renderTournamentStandings()}
          {activeTab === "group" && renderGroupStandings()}
          {activeTab === "knockout" && renderKnockoutStandings()}
          {activeTab === "matches" && renderUpcomingMatches()}
        </div>
      </div>
    </>
  );
}
