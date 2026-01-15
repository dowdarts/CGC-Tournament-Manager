import React, { useState } from 'react';
import { Player } from '@/types';

interface QuickAddPlayerProps {
  tournamentId: string;
  onAddPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
}

const QuickAddPlayer: React.FC<QuickAddPlayerProps> = ({ tournamentId, onAddPlayer, isLoading = false }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddPlayer({
      tournament_id: tournamentId,
      name: name.trim(),
      email: email.trim() || undefined,
      paid: false
    });

    setName('');
    setEmail('');
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '20px' }}>
      <h3 style={{ marginBottom: '10px' }}>Manual Check-In</h3>
      <p style={{ marginBottom: '15px', fontSize: '14px', color: '#64748b' }}>
        Add players manually. Mark as "Paid" to add them to the confirmed roster.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Player Name (required)"
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="Email (optional)"
          />
        </div>

        <button
          type="submit"
          className="button button-success"
          disabled={isLoading || !name.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          Add
        </button>
      </div>
    </form>
  );
};

export default QuickAddPlayer;
