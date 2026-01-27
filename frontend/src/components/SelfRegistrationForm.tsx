import React, { useState } from 'react';
import { Player } from '@/types';
import { UserPlus, Users } from 'lucide-react';
import { capitalizePlayerName } from '@/utils/nameFormatter';
import { EmailService } from '@/services/EmailService';
import { getLogoUrl } from '@/utils/assets';

interface SelfRegistrationFormProps {
  tournamentId: string;
  tournamentName: string;
  tournamentDate?: string;
  tournamentLocation?: string;
  tournamentStartTime?: string;
  gameType: 'singles' | 'doubles';
  onRegister: (players: Omit<Player, 'id' | 'created_at' | 'updated_at'>[]) => Promise<void>;
}

const SelfRegistrationForm: React.FC<SelfRegistrationFormProps> = ({ 
  tournamentId, 
  tournamentName,
  tournamentDate,
  tournamentLocation,
  tournamentStartTime,
  gameType,
  onRegister 
}) => {
  const [player1Name, setPlayer1Name] = useState('');
  const [player1Email, setPlayer1Email] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [player2Email, setPlayer2Email] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player1Name.trim()) return;

    if (gameType === 'doubles' && !player2Name.trim()) {
      alert('Please enter both team members');
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      // Generate team_id for doubles
      const teamId = gameType === 'doubles' ? crypto.randomUUID() : undefined;

      const players: Omit<Player, 'id' | 'created_at' | 'updated_at'>[] = [
        {
          tournament_id: tournamentId,
          name: capitalizePlayerName(player1Name),
          email: player1Email.trim() || undefined,
          paid: false,
          team_id: teamId
        }
      ];

      if (gameType === 'doubles') {
        players.push({
          tournament_id: tournamentId,
          name: capitalizePlayerName(player2Name),
          email: player2Email.trim() || undefined,
          paid: false,
          team_id: teamId
        });
      }

      await onRegister(players);

      // Send confirmation emails if emails provided and email service configured
      console.log('🔍 Checking email service configuration...');
      console.log('🔍 Email service configured:', EmailService.isConfigured());
      
      if (EmailService.isConfigured()) {
        console.log('📧 Email service is configured, preparing to send emails...');
        const emailData = {
          playerName: '',
          eventName: tournamentName,
          date: tournamentDate || 'TBD',
          location: tournamentLocation || 'TBD',
          startTime: tournamentStartTime || 'TBD',
        };

        // Send email to player 1
        if (player1Email.trim()) {
          console.log('📧 Sending confirmation email to player 1:', player1Email);
          const success = await EmailService.sendRegistrationConfirmation(player1Email, {
            ...emailData,
            playerName: capitalizePlayerName(player1Name),
          });
          console.log('📧 Player 1 email result:', success ? 'SUCCESS' : 'FAILED');
        }

        // Send email to player 2 if doubles
        if (gameType === 'doubles' && player2Email.trim()) {
          console.log('📧 Sending confirmation email to player 2:', player2Email);
          const success = await EmailService.sendRegistrationConfirmation(player2Email, {
            ...emailData,
            playerName: capitalizePlayerName(player2Name),
          });
          console.log('📧 Player 2 email result:', success ? 'SUCCESS' : 'FAILED');
        }
      } else {
        console.warn('⚠️ Email service not configured - skipping email send');
      }
      
      // Clear form
      setPlayer1Name('');
      setPlayer1Email('');
      setPlayer2Name('');
      setPlayer2Email('');
      setSuccess(true);

      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      alert('Registration failed. Please try again or see tournament desk.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <img 
          src={getLogoUrl()}
          alt="Tournament Manager" 
          style={{ 
            maxWidth: '100%',
            height: 'auto',
            maxHeight: '150px',
            display: 'block',
            margin: '0 auto 20px',
            filter: 'drop-shadow(0 4px 20px rgba(102, 126, 234, 0.4))'
          }} 
        />
        <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>{tournamentName}</h1>
        <p style={{ fontSize: '18px', color: '#94a3b8' }}>
          {gameType === 'singles' ? 'Player Registration' : 'Team Registration (Doubles)'}
        </p>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px', fontSize: '16px' }}>
          ✅ Registration successful! Good luck!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={24} />
            {gameType === 'singles' ? 'Your Details' : 'Player 1'}
          </h3>
          
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '16px' }}>Full Name *</label>
            <input
              type="text"
              value={player1Name}
              onChange={(e) => setPlayer1Name(e.target.value)}
              className="input"
              placeholder="Enter your name"
              required
              style={{ fontSize: '18px', padding: '15px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '16px' }}>
              Email (optional - for match notifications)
            </label>
            <input
              type="email"
              value={player1Email}
              onChange={(e) => setPlayer1Email(e.target.value)}
              className="input"
              placeholder="your.email@example.com"
              style={{ fontSize: '18px', padding: '15px' }}
            />
          </div>
        </div>

        {gameType === 'doubles' && (
          <div style={{ marginBottom: '30px', paddingTop: '20px', borderTop: '1px solid #334155' }}>
            <h3 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={24} />
              Player 2 (Your Partner)
            </h3>
            
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '16px' }}>Full Name *</label>
              <input
                type="text"
                value={player2Name}
                onChange={(e) => setPlayer2Name(e.target.value)}
                className="input"
                placeholder="Enter partner's name"
                required={gameType === 'doubles'}
                style={{ fontSize: '18px', padding: '15px' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ fontSize: '16px' }}>
                Email (optional)
              </label>
              <input
                type="email"
                value={player2Email}
                onChange={(e) => setPlayer2Email(e.target.value)}
                className="input"
                placeholder="partner.email@example.com"
                style={{ fontSize: '18px', padding: '15px' }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          className="button button-success"
          disabled={loading}
          style={{ 
            width: '100%', 
            fontSize: '20px', 
            padding: '18px',
            marginTop: '20px'
          }}
        >
          {loading ? 'Registering...' : gameType === 'singles' ? 'Register' : 'Register Team'}
        </button>
      </form>

      <p style={{ 
        textAlign: 'center', 
        marginTop: '30px', 
        fontSize: '14px', 
        color: '#94a3b8' 
      }}>
        Having trouble? Please see the tournament desk
      </p>
    </div>
  );
};

export default SelfRegistrationForm;
