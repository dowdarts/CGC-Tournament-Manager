import React, { useState, useEffect } from 'react';
import { Player } from '@/types';
import { X, Save, User, Mail, Phone } from 'lucide-react';

interface EditPlayerModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: (player: Player) => void;
  isLoading?: boolean;
}

const EditPlayerModal: React.FC<EditPlayerModalProps> = ({
  player,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [name, setName] = useState(player.name);
  const [email, setEmail] = useState(player.email || '');
  const [phoneNumber, setPhoneNumber] = useState(player.phone_number || '');

  useEffect(() => {
    setName(player.name);
    setEmail(player.email || '');
    setPhoneNumber(player.phone_number || '');
  }, [player]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Player name is required');
      return;
    }

    const updatedPlayer: Player = {
      ...player,
      name: name.trim(),
      email: email.trim() || undefined,
      phone_number: phoneNumber.trim() || undefined,
    };

    onSave(updatedPlayer);
  };

  const handleCancel = () => {
    setName(player.name);
    setEmail(player.email || '');
    setPhoneNumber(player.phone_number || '');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={handleCancel}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div 
        className="modal-content card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '500px',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 600 }}>Edit Player</h2>
          <button
            onClick={handleCancel}
            className="button button-ghost"
            style={{ padding: '8px' }}
            disabled={isLoading}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <User size={18} />
              Player Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Enter player name"
              required
              disabled={isLoading}
              style={{ fontSize: '16px', padding: '12px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Mail size={18} />
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="player@example.com"
              disabled={isLoading}
              style={{ fontSize: '16px', padding: '12px' }}
            />
            <small style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px', display: 'block' }}>
              Optional - Used for match notifications and confirmations
            </small>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Phone size={18} />
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="input"
              placeholder="+1 (555) 123-4567"
              disabled={isLoading}
              style={{ fontSize: '16px', padding: '12px' }}
            />
            <small style={{ color: '#94a3b8', fontSize: '13px', marginTop: '4px', display: 'block' }}>
              Optional - Contact information
            </small>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={handleCancel}
              className="button button-secondary"
              disabled={isLoading}
              style={{ padding: '10px 20px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={isLoading}
              style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              {isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPlayerModal;
