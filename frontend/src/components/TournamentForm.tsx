import React, { useState } from 'react';
import { Tournament } from '@/types';

interface TournamentFormProps {
  onSubmit: (tournament: Omit<Tournament, 'id' | 'createdAt' | 'updatedAt'>) => void;
  isLoading?: boolean;
  isEditing?: boolean;
  existingTournament?: Tournament;
}

const TournamentForm: React.FC<TournamentFormProps> = ({ onSubmit, isLoading = false, isEditing = false }) => {
  const [formData, setFormData] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    start_time: '19:00', // Default 7 PM
    location: '',
    format: 'group-knockout' as const,
    game_type: 'singles' as const,
    registration_enabled: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      num_groups: 1,
      advancement_rules: '',
      tiebreakers: ['legDifference', 'headToHead'],
      status: 'setup'
    });
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '30px' }}>
      <h2 style={{ marginBottom: '20px' }}>Create New Tournament</h2>
      
      <div className="form-group">
        <label className="form-label">Tournament Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          className="input"
          placeholder="e.g., CGC Winter Challenge 2026"
          required
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '16px' }}>
        <div className="form-group">
          <label className="form-label">Date</label>
          <input
            type="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="input"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Start Time</label>
          <input
            type="time"
            name="start_time"
            value={formData.start_time}
            onChange={handleChange}
            className="input"
            required
          />
          <p style={{ marginTop: '5px', fontSize: '12px', color: '#64748b' }}>
            Registration closes 1 hour after start time
          </p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Location</label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="input"
          placeholder="e.g., The Local Pub"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Format</label>
        <select name="format" value={formData.format} onChange={handleChange} className="input">
          <option value="group-knockout">Group Stage + Knockout Bracket</option>
          <option value="round-robin">Round Robin Only</option>
          <option value="knockout">Knockout Only</option>
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Game Type</label>
        <select 
          name="game_type" 
          value={formData.game_type} 
          onChange={handleChange} 
          className="input"
          disabled={isEditing}
        >
          <option value="singles">Singles</option>
          <option value="doubles">Doubles (Teams of 2)</option>
        </select>
        {isEditing && (
          <p style={{ marginTop: '5px', fontSize: '12px', color: '#f59e0b', fontStyle: 'italic' }}>
            ⚠️ Game type cannot be changed after tournament creation
          </p>
        )}
      </div>

      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            name="registration_enabled"
            checked={formData.registration_enabled}
            onChange={handleChange}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <span className="form-label" style={{ marginBottom: 0 }}>
            Enable Self-Service Registration Portal
          </span>
        </label>
        <p style={{ marginTop: '5px', fontSize: '14px', color: '#64748b', marginLeft: '30px' }}>
          Allows players to register themselves via the public portal
        </p>
      </div>

      <button type="submit" className="button button-primary button-large" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Tournament'}
      </button>
    </form>
  );
};

export default TournamentForm;
