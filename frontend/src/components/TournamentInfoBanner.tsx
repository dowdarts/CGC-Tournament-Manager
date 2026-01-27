import React from 'react';
import { Calendar, Clock, MapPin, DollarSign, Users, AlertCircle } from 'lucide-react';

interface TournamentInfoBannerProps {
  tournamentName: string;
  hostName: string;
  date: string;
  startTime: string;
  venue: string;
  registrationPrice?: number;
  registrationCloseTime?: string;
  checkedInCount: number;
  totalRegistered: number;
}

const TournamentInfoBanner: React.FC<TournamentInfoBannerProps> = ({
  tournamentName,
  hostName,
  date,
  startTime,
  venue,
  registrationPrice,
  registrationCloseTime,
  checkedInCount,
  totalRegistered
}) => {
  // Format date for display
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };

  // Format time for display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    try {
      // Handle HH:MM format
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return timeStr;
    }
  };

  // Format datetime for display
  const formatDateTime = (datetimeStr: string) => {
    try {
      const dt = new Date(datetimeStr);
      return dt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return datetimeStr;
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      borderRadius: '16px',
      padding: '32px',
      marginBottom: '32px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Tournament Title */}
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{ 
          fontSize: '36px', 
          fontWeight: 'bold', 
          color: '#ffffff',
          marginBottom: '8px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)'
        }}>
          {tournamentName}
        </h1>
        <p style={{ 
          fontSize: '18px', 
          color: '#94a3b8',
          fontStyle: 'italic'
        }}>
          Hosted by {hostName}
        </p>
      </div>

      {/* Info Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '20px',
        marginBottom: '20px'
      }}>
        {/* Tournament Name */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          gridColumn: '1 / -1'
        }}>
          <div style={{ width: '100%' }}>
            <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Tournament Name</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#ffffff' }}>
              {tournamentName}
            </div>
          </div>
        </div>

        {/* Date */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Calendar size={24} style={{ color: '#667eea', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Date</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
              {date ? formatDate(date) : 'Not set'}
            </div>
          </div>
        </div>

        {/* Start Time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Clock size={24} style={{ color: '#667eea', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Start Time</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
              {startTime ? formatTime(startTime) : 'Not set'}
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <MapPin size={24} style={{ color: '#667eea', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Location</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
              {venue || 'Not set'}
            </div>
          </div>
        </div>

        {/* Checked In Players */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <Users size={24} style={{ color: '#667eea', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Checked In Players</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
              {checkedInCount} of {totalRegistered}
            </div>
          </div>
        </div>

        {/* Registration Close Time - Always show */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '12px',
          border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <AlertCircle size={24} style={{ color: '#ef4444', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '12px', color: '#fca5a5', marginBottom: '4px', fontWeight: '600' }}>Registration Closes</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
              {registrationCloseTime ? formatDateTime(registrationCloseTime) : 'Not set'}
            </div>
          </div>
        </div>

        {/* Registration Price - Always show if set */}
        {registrationPrice !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            <DollarSign size={24} style={{ color: '#10b981', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '12px', color: '#6ee7b7', marginBottom: '4px', fontWeight: '600' }}>Entry Fee</div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                ${registrationPrice.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentInfoBanner;
