import React, { useState } from 'react';
import { Player } from '@/types';
import { capitalizePlayerName } from '@/utils/nameFormatter';

interface QuickAddPlayerProps {
  tournamentId: string;
  onAddPlayer: (player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
}

const QuickAddPlayer: React.FC<QuickAddPlayerProps> = ({ tournamentId, onAddPlayer, isLoading = false }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddPlayer({
      tournament_id: tournamentId,
      name: capitalizePlayerName(name),
      email: email.trim() || undefined,
      paid: false
    });

    setName('');
    setEmail('');
  };

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const lines = bulkText.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      // Check if line contains a comma (name, email format)
      const commaIndex = trimmedLine.indexOf(',');
      
      if (commaIndex !== -1) {
        // Format: "Name, Email"
        const playerName = trimmedLine.substring(0, commaIndex).trim();
        const playerEmail = trimmedLine.substring(commaIndex + 1).trim();
        
        if (playerName) {
          onAddPlayer({
            tournament_id: tournamentId,
            name: capitalizePlayerName(playerName),
            email: playerEmail || undefined,
            paid: false
          });
        }
      } else {
        // Format: "Name" (no email)
        onAddPlayer({
          tournament_id: tournamentId,
          name: capitalizePlayerName(trimmedLine),
          email: undefined,
          paid: false
        });
      }
    });

    setBulkText('');
    setShowBulkAdd(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h3 style={{ margin: 0 }}>Manual Check-In</h3>
          <button
            type="button"
            onClick={() => setShowBulkAdd(!showBulkAdd)}
            className="button"
            style={{ 
              padding: '8px 16px', 
              fontSize: '14px',
              background: showBulkAdd ? '#64748b' : '#667eea',
              color: 'white'
            }}
          >
            {showBulkAdd ? 'Single Add' : 'Bulk Add'}
          </button>
        </div>
        <p style={{ marginBottom: '15px', fontSize: '14px', color: '#64748b' }}>
          Add players manually. Mark as "Paid" to add them to the confirmed roster.
        </p>

        {!showBulkAdd ? (
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
        ) : null}
      </form>

      {showBulkAdd && (
        <form onSubmit={handleBulkAdd} className="card" style={{ marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '10px' }}>Bulk Add Players</h4>
          <p style={{ marginBottom: '10px', fontSize: '14px', color: '#64748b' }}>
            Paste one player per line. Format: <strong>Name, Email</strong> or just <strong>Name</strong>
          </p>
          <p style={{ marginBottom: '15px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
            Example:<br />
            Mike Leger, mike@email.com<br />
            Matthew Dow<br />
            John Smith, john@email.com
          </p>
          <div className="form-group">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="input"
              placeholder="Mike Leger, mike@email.com&#10;Matthew Dow&#10;John Smith, john@email.com"
              rows={8}
              style={{ fontFamily: 'monospace', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className="button button-success"
              disabled={isLoading || !bulkText.trim()}
              style={{ flex: 1 }}
            >
              Add All Players
            </button>
            <button
              type="button"
              onClick={() => setBulkText('')}
              className="button"
              style={{ background: '#64748b', color: 'white' }}
            >
              Clear
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default QuickAddPlayer;
