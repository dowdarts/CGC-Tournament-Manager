import React from 'react';
import { PendingMatchResult } from '@/types';
import { Trophy, TrendingUp, Target, Zap, Award } from 'lucide-react';
import '@/styles/TaleOfTheTape.css';

interface TaleOfTheTapeProps {
  result: PendingMatchResult;
}

/**
 * Tale of the Tape - Match Statistics Comparison
 * 
 * Displays a comprehensive head-to-head comparison of match statistics
 * in a visually appealing "boxing-style" tale of the tape format.
 */
export default function TaleOfTheTape({ result }: TaleOfTheTapeProps) {
  const isPlayer1Winner = result.player1_legs > result.player2_legs || result.player1_sets > result.player2_sets;
  const isPlayer2Winner = result.player2_legs > result.player1_legs || result.player2_sets > result.player1_sets;

  // Helper to determine which value is better for highlighting
  const getBetterValue = (val1?: number | null, val2?: number | null, higherIsBetter = true) => {
    if (!val1 && !val2) return null;
    if (!val1) return 'player2';
    if (!val2) return 'player1';
    if (val1 === val2) return 'tie';
    
    if (higherIsBetter) {
      return val1 > val2 ? 'player1' : 'player2';
    } else {
      return val1 < val2 ? 'player1' : 'player2';
    }
  };

  interface StatRowProps {
    label: string;
    player1Value: string | number | undefined | null;
    player2Value: string | number | undefined | null;
    icon?: React.ReactNode;
    higherIsBetter?: boolean;
  }

  const StatRow: React.FC<StatRowProps> = ({ label, player1Value, player2Value, icon, higherIsBetter = true }) => {
    const better = getBetterValue(
      typeof player1Value === 'string' ? parseFloat(player1Value) : player1Value,
      typeof player2Value === 'string' ? parseFloat(player2Value) : player2Value,
      higherIsBetter
    );

    const p1Display = player1Value ?? '-';
    const p2Display = player2Value ?? '-';

    return (
      <div className="stat-row">
        <div className={`stat-value player1 ${better === 'player1' ? 'better' : better === 'tie' ? 'tie' : ''}`}>
          {p1Display}
        </div>
        <div className="stat-label">
          {icon && <span className="stat-icon">{icon}</span>}
          {label}
        </div>
        <div className={`stat-value player2 ${better === 'player2' ? 'better' : better === 'tie' ? 'tie' : ''}`}>
          {p2Display}
        </div>
      </div>
    );
  };

  return (
    <div className="tale-of-the-tape">
      <div className="tape-header">
        <h3>
          <Award size={20} />
          Tale of the Tape
        </h3>
        <p className="tape-subtitle">Match Statistics Comparison</p>
      </div>

      <div className="player-headers">
        <div className={`player-header player1 ${isPlayer1Winner ? 'winner' : ''}`}>
          <div className="player-name">{result.player1_name}</div>
          {isPlayer1Winner && <Trophy size={18} className="winner-trophy" />}
        </div>
        <div className="vs-divider">VS</div>
        <div className={`player-header player2 ${isPlayer2Winner ? 'winner' : ''}`}>
          <div className="player-name">{result.player2_name}</div>
          {isPlayer2Winner && <Trophy size={18} className="winner-trophy" />}
        </div>
      </div>

      <div className="stats-grid">
        {/* Match Result */}
        <div className="stat-category">
          <h4 className="category-title">Match Result</h4>
          
          {(result.player1_sets > 0 || result.player2_sets > 0) && (
            <StatRow
              label="Sets Won"
              player1Value={result.player1_sets}
              player2Value={result.player2_sets}
              icon={<Trophy size={14} />}
            />
          )}
          
          <StatRow
            label="Legs Won"
            player1Value={result.player1_legs}
            player2Value={result.player2_legs}
            icon={<Target size={14} />}
          />
          
          {result.total_legs_played && (
            <StatRow
              label="Total Legs Played"
              player1Value={result.total_legs_played}
              player2Value={result.total_legs_played}
            />
          )}
        </div>

        {/* Averages */}
        <div className="stat-category">
          <h4 className="category-title">Averages</h4>
          
          <StatRow
            label="3-Dart Average"
            player1Value={result.player1_average?.toFixed(2)}
            player2Value={result.player2_average?.toFixed(2)}
            icon={<TrendingUp size={14} />}
          />
          
          {(result.player1_first_9_average || result.player2_first_9_average) && (
            <StatRow
              label="First 9 Average"
              player1Value={result.player1_first_9_average?.toFixed(2)}
              player2Value={result.player2_first_9_average?.toFixed(2)}
              icon={<Zap size={14} />}
            />
          )}
          
          {(result.player1_darts_thrown || result.player2_darts_thrown) && (
            <StatRow
              label="Darts Thrown"
              player1Value={result.player1_darts_thrown}
              player2Value={result.player2_darts_thrown}
              higherIsBetter={false}
            />
          )}
        </div>

        {/* Checkout Performance */}
        <div className="stat-category">
          <h4 className="category-title">Checkout Performance</h4>
          
          {(result.player1_checkout_percentage !== undefined || result.player2_checkout_percentage !== undefined) && (
            <StatRow
              label="Checkout %"
              player1Value={result.player1_checkout_percentage ? `${result.player1_checkout_percentage}%` : undefined}
              player2Value={result.player2_checkout_percentage ? `${result.player2_checkout_percentage}%` : undefined}
              icon={<Target size={14} />}
            />
          )}
          
          {(result.player1_checkouts_completed || result.player2_checkouts_completed) && (
            <StatRow
              label="Checkouts Hit"
              player1Value={`${result.player1_checkouts_completed}/${result.player1_checkout_attempts}`}
              player2Value={`${result.player2_checkouts_completed}/${result.player2_checkout_attempts}`}
            />
          )}
          
          {(result.player1_highest_checkout || result.player2_highest_checkout) && (
            <StatRow
              label="Highest Checkout"
              player1Value={result.player1_highest_checkout}
              player2Value={result.player2_highest_checkout}
              icon={<Award size={14} />}
            />
          )}
          
          {(result.player1_ton_plus_finishes || result.player2_ton_plus_finishes) && (
            <StatRow
              label="100+ Finishes"
              player1Value={result.player1_ton_plus_finishes}
              player2Value={result.player2_ton_plus_finishes}
            />
          )}
        </div>

        {/* High Scores */}
        <div className="stat-category">
          <h4 className="category-title">High Scores</h4>
          
          <StatRow
            label="180s"
            player1Value={result.player1_180s}
            player2Value={result.player2_180s}
            icon={<Zap size={14} />}
          />
          
          {(result.player1_160_plus || result.player2_160_plus) && (
            <StatRow
              label="160+"
              player1Value={result.player1_160_plus}
              player2Value={result.player2_160_plus}
            />
          )}
          
          {(result.player1_140_plus || result.player2_140_plus) && (
            <StatRow
              label="140+"
              player1Value={result.player1_140_plus}
              player2Value={result.player2_140_plus}
            />
          )}
          
          {(result.player1_120_plus || result.player2_120_plus) && (
            <StatRow
              label="120+"
              player1Value={result.player1_120_plus}
              player2Value={result.player2_120_plus}
            />
          )}
          
          {(result.player1_100_plus || result.player2_100_plus) && (
            <StatRow
              label="100+"
              player1Value={result.player1_100_plus}
              player2Value={result.player2_100_plus}
            />
          )}
        </div>
      </div>

      {result.match_duration_minutes && (
        <div className="match-footer">
          <p>Match Duration: {result.match_duration_minutes} minutes</p>
        </div>
      )}
    </div>
  );
}
