import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TournamentService } from '@/services/api';
import { Tournament } from '@/types';
import { Save, ArrowRight, Info } from 'lucide-react';

const BasicInfo: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  
  // Basic info
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    start_time: '19:00',
    registration_close_time: '',
    registration_price: '',
    location: '',
    format: 'group-knockout' as const,
    game_type: 'singles' as const,
    registration_enabled: true
  });

  // Scoring configuration (determined at setup)
  const [primaryMetric, setPrimaryMetric] = useState<'match_wins' | 'leg_wins' | 'tournament_points'>('match_wins');
  const [pointsForWin, setPointsForWin] = useState(2);
  const [pointsForDraw, setPointsForDraw] = useState(1);
  const [pointsForLoss, setPointsForLoss] = useState(0);

  const [helpMode, setHelpMode] = useState(false);

  useEffect(() => {
    if (id && id !== 'new') {
      loadTournament();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Sync help mode with localStorage
    const syncHelpMode = () => {
      setHelpMode(localStorage.getItem('helpMode') === 'true');
    };
    syncHelpMode();
    const interval = setInterval(syncHelpMode, 100);
    window.addEventListener('storage', syncHelpMode);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', syncHelpMode);
    };
  }, []);

  // Auto-calculate registration close time (15 minutes before start time)
  useEffect(() => {
    if (formData.date && formData.start_time) {
      try {
        // Combine date and time
        const dateTimeStr = `${formData.date}T${formData.start_time}`;
        const startDateTime = new Date(dateTimeStr);
        
        // Subtract 15 minutes
        const closeDateTime = new Date(startDateTime.getTime() - 15 * 60 * 1000);
        
        // Format for datetime-local input (YYYY-MM-DDTHH:MM)
        const year = closeDateTime.getFullYear();
        const month = String(closeDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(closeDateTime.getDate()).padStart(2, '0');
        const hours = String(closeDateTime.getHours()).padStart(2, '0');
        const minutes = String(closeDateTime.getMinutes()).padStart(2, '0');
        const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
        
        setFormData(prev => ({
          ...prev,
          registration_close_time: formattedDateTime
        }));
      } catch (err) {
        console.error('Error calculating registration close time:', err);
      }
    }
  }, [formData.date, formData.start_time]);

  const loadTournament = async () => {
    if (!id) return;
    try {
      const data = await TournamentService.getTournament(id);
      setTournament(data);
      setFormData({
        name: data.name,
        date: data.date,
        start_time: data.start_time || '19:00',
        registration_close_time: data.registration_close_time || '',
        registration_price: data.registration_price?.toString() || '',
        location: data.location || '',
        format: data.format,
        game_type: data.game_type,
        registration_enabled: data.registration_enabled ?? true
      });
    } catch (err) {
      setError('Failed to load tournament');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const tournamentData = {
        ...formData,
        registration_price: formData.registration_price ? parseFloat(formData.registration_price) : undefined,
        registration_close_time: formData.registration_close_time || undefined,
        scoring_system: {
          primary_metric: 'leg_wins',
          points_for_win: 3,
          points_for_draw: 1,
          points_for_loss: 0,
          tiebreak_order: []
        },
        setup_completed: true
      };

      if (id && id !== 'new') {
        // Don't send game_type on updates (can't be changed after creation)
        const { game_type, ...updateData } = tournamentData;
        await TournamentService.updateTournament(id, updateData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Create new tournament
        const newTournament = await TournamentService.createTournament({
          ...tournamentData,
          num_groups: 1,
          advancement_rules: '',
          tiebreakers: ['legDifference', 'headToHead'],
          status: 'setup'
        });
        navigate(`/tournament/${newTournament.id}/info`);
      }
    } catch (err) {
      setError('Failed to save tournament');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleNextStep = async () => {
    if (!id) return;
    
    // Save first
    setSaving(true);
    setError(null);

    try {
      // Don't send game_type on updates (can't be changed after creation)
      const { game_type, ...updateData } = formData;
      await TournamentService.updateTournament(id, {
        ...updateData,
        registration_price: formData.registration_price ? parseFloat(formData.registration_price) : undefined,
        registration_close_time: formData.registration_close_time || undefined,
        scoring_system: {
          primary_metric: 'leg_wins',
          points_for_win: 3,
          points_for_draw: 1,
          points_for_loss: 0,
          tiebreak_order: []
        },
        setup_completed: true
      });
      
      // Navigate to participants tab
      navigate(`/tournament/${id}/checkin`);
    } catch (err) {
      setError('Failed to save tournament');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="alert alert-info">Loading tournament...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '12px' }}>Basic Tournament Information</h2>
        <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '16px' }}>
          Configure the basic details of your tournament
        </p>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          Tournament updated successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="card" style={{ padding: '40px' }}>
        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>Tournament Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="input"
            style={{ fontSize: '16px', padding: '14px' }}
            placeholder="e.g., AADS Winter Challenge 2026"
            required
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="input"
              style={{ fontSize: '16px', padding: '14px' }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>Start Time</label>
            <input
              type="time"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="input"
              style={{ fontSize: '16px', padding: '14px' }}
              required
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          <div className="form-group">
            <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>
              Registration Price ($)
            </label>
            <input
              type="number"
              name="registration_price"
              value={formData.registration_price}
              onChange={handleChange}
              className="input"
              style={{ fontSize: '16px', padding: '14px' }}
              placeholder="e.g., 20.00"
              min="0"
              step="0.01"
              required
            />
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#94a3b8' }}>
              Entry fee for players to register
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>
              Registration Close Time
            </label>
            <input
              type="datetime-local"
              name="registration_close_time"
              value={formData.registration_close_time}
              onChange={handleChange}
              className="input"
              style={{ fontSize: '16px', padding: '14px', backgroundColor: 'rgba(102, 126, 234, 0.05)' }}
              required
            />
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#667eea', fontStyle: 'italic' }}>
              ⚡ Auto-set to 15 minutes before start time (editable)
            </p>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>Location/Venue</label>
          <input
            type="text"
            name="location"
            value={formData.location}
            onChange={handleChange}
            className="input"
            style={{ fontSize: '16px', padding: '14px' }}
            placeholder="e.g., The Local Pub"
            required
          />
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>Tournament Format</label>
          <select name="format" value={formData.format} onChange={handleChange} className="input" style={{ fontSize: '16px', padding: '14px' }}>
            <option value="group-knockout">Group Stage + Knockout Bracket</option>
            <option value="round-robin">Round Robin Only</option>
            <option value="knockout">Knockout Only</option>
          </select>
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="form-label" style={{ fontSize: '18px', marginBottom: '12px', display: 'block' }}>Game Type</label>
          <select 
            name="game_type" 
            value={formData.game_type} 
            onChange={handleChange} 
            className="input"
            style={{ fontSize: '16px', padding: '14px' }}
            disabled={!!tournament}
          >
            <option value="singles">Singles</option>
            <option value="doubles">Doubles (Teams of 2)</option>
          </select>
          {tournament && (
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#f59e0b', fontStyle: 'italic' }}>
              ⚠️ Game type cannot be changed after tournament creation
            </p>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              name="registration_enabled"
              checked={formData.registration_enabled}
              onChange={handleChange}
              style={{ width: '24px', height: '24px', cursor: 'pointer' }}
            />
            <span className="form-label" style={{ marginBottom: 0, fontSize: '18px' }}>
              Enable Public Registration Portal
            </span>
          </label>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#94a3b8', fontStyle: 'italic', marginLeft: '36px' }}>
            Allow players to register themselves via the public registration page
          </p>
        </div>
      </form>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button
          onClick={handleSubmit}
          className="button button-primary"
          style={{ fontSize: '16px', padding: '14px 24px' }}
          disabled={saving}
          type="button"
        >
          <Save size={20} style={{ marginRight: '8px' }} />
          {saving ? 'Saving...' : 'Save Setup'}
        </button>

        {tournament && (
          <button
            onClick={handleNextStep}
            className="button button-success button-large"
            style={{ fontSize: '16px', padding: '14px 24px' }}
            disabled={saving}
            type="button"
          >
            {saving ? 'Saving...' : 'Next Step: Add Participants'}
            <ArrowRight size={20} style={{ marginLeft: '8px' }} />
          </button>
        )}
      </div>
    </div>
  );
};

export default BasicInfo;
