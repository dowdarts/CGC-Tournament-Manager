import React from 'react';
import { Player } from '@/types';
import { Trash2, Edit2, Check } from 'lucide-react';

interface PlayerListProps {
  players: Player[];
  onUpdatePlayer: (player: Player) => void;
  onDeletePlayer: (playerId: string) => void;
  isLoading?: boolean;
  title?: string;
  showPaidOnly?: boolean;
  emptyMessage?: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ 
  players, 
  onUpdatePlayer, 
  onDeletePlayer, 
  isLoading = false,
  title = 'Check-In List',
  showPaidOnly = false,
  emptyMessage = 'No players yet.'
}) => {
  const handleTogglePaid = (player: Player) => {
    onUpdatePlayer({
      ...player,
      paid: !player.paid
    });
  };

  const filteredPlayers = showPaidOnly 
    ? players.filter(p => p.paid)
    : players.filter(p => !p.paid);

  if (filteredPlayers.length === 0) {
    return (
      <div className="alert alert-info">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ marginBottom: '15px' }}>{title} ({filteredPlayers.length})</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Paid</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredPlayers.map((player) => (
            <tr key={player.id}>
              <td style={{ fontWeight: 500 }}>{player.name}</td>
              <td style={{ color: '#94a3b8', fontSize: '14px' }}>
                {player.email || <span style={{ opacity: 0.5 }}>No email</span>}
              </td>
              <td>
                <button
                  onClick={() => handleTogglePaid(player)}
                  className={`badge ${player.paid ? 'badge-success' : 'badge-warning'}`}
                  style={{ cursor: 'pointer', border: 'none', padding: '6px 12px' }}
                >
                  {player.paid ? 'Paid' : 'Unpaid'}
                </button>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => onDeletePlayer(player.id)}
                    className="button button-danger"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    disabled={isLoading}
                    title="Delete player"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerList;
