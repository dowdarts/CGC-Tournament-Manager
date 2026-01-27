import React, { useState } from 'react';
import { Tournament } from '@/types';
import { 
  Play, 
  Users, 
  Calendar, 
  MapPin, 
  MoreVertical, 
  Trash2, 
  Archive, 
  CheckCircle,
  ArchiveRestore,
  Settings,
  Grid3x3
} from 'lucide-react';

interface TournamentCardProps {
  tournament: Tournament;
  playerCount: number;
  teamCount?: number;
  onManage: (id: string) => void;
  onBoards: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onArchive?: (id: string, name: string) => void;
  onUnarchive?: (id: string) => void;
  onMarkComplete?: (id: string, name: string) => void;
  onMarkIncomplete?: (id: string) => void;
  isArchived?: boolean;
  isCompleted?: boolean;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  playerCount,
  teamCount,
  onManage,
  onBoards,
  onDelete,
  onArchive,
  onUnarchive,
  onMarkComplete,
  onMarkIncomplete,
  isArchived = false,
  isCompleted = false
}) => {
  const [openMenu, setOpenMenu] = useState(false);

  const getStatusBadge = (status: string) => {
    const config: { [key: string]: { class: string; label: string } } = {
      'setup': { class: 'badge-warning', label: 'Setup' },
      'group-stage': { class: 'badge-primary', label: 'Group Stage' },
      'knockout': { class: 'badge-primary', label: 'Knockout' },
      'completed': { class: 'badge-success', label: 'Completed' }
    };
    return config[status] || { class: 'badge-warning', label: 'Setup' };
  };

  const statusInfo = getStatusBadge(tournament.status);
  const displayCount = tournament.game_type === 'doubles' && teamCount !== undefined 
    ? `${teamCount} Teams (${playerCount} Players)`
    : `${playerCount} Players`;

  return (
    <div className="card hover-lift" style={{ position: 'relative' }}>
      {/* Action Menu */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10 }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpenMenu(!openMenu);
          }}
          className="button button-secondary"
          style={{ 
            padding: '8px', 
            minWidth: 'auto',
            background: 'rgba(40, 40, 40, 0.8)',
            border: '1px solid rgba(255, 102, 0, 0.2)'
          }}
        >
          <MoreVertical size={16} />
        </button>
        {openMenu && (
          <>
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9
              }}
              onClick={() => setOpenMenu(false)}
            />
            <div style={{
              position: 'absolute',
              right: 0,
              top: '45px',
              background: 'rgba(26, 26, 26, 0.98)',
              border: '1px solid rgba(255, 102, 0, 0.3)',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '180px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(20px)',
              zIndex: 11
            }}>
              {!isArchived && !isCompleted && onMarkComplete && (
                <button
                  onClick={() => {
                    onMarkComplete(tournament.id, tournament.name);
                    setOpenMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: '#10b981',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <CheckCircle size={16} /> Mark Complete
                </button>
              )}
              {isCompleted && onMarkIncomplete && (
                <button
                  onClick={() => {
                    onMarkIncomplete(tournament.id);
                    setOpenMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: '#f59e0b',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <ArchiveRestore size={16} /> Mark Incomplete
                </button>
              )}
              {!isArchived && onArchive && (
                <button
                  onClick={() => {
                    onArchive(tournament.id, tournament.name);
                    setOpenMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: '#6b7280',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <Archive size={16} /> Archive
                </button>
              )}
              {isArchived && onUnarchive && (
                <button
                  onClick={() => {
                    onUnarchive(tournament.id);
                    setOpenMenu(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    color: '#10b981',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  <ArchiveRestore size={16} /> Unarchive
                </button>
              )}
              <button
                onClick={() => {
                  onDelete(tournament.id, tournament.name);
                  setOpenMenu(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </>
        )}
      </div>

      {/* Card Content */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <h3 className="text-gradient" style={{ 
            fontSize: '20px', 
            margin: 0,
            flex: 1,
            paddingRight: '40px'
          }}>
            {tournament.name}
          </h3>
        </div>
        <span className={`badge ${statusInfo.class}`}>{statusInfo.label}</span>
      </div>

      <div style={{ 
        display: 'grid', 
        gap: '12px', 
        marginBottom: '24px',
        fontSize: '14px',
        color: '#9ca3af'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={16} color="#ff6600" />
          <span style={{ fontWeight: '600', color: '#d1d5db' }}>{displayCount}</span>
          <span style={{ 
            marginLeft: 'auto',
            fontSize: '12px',
            textTransform: 'uppercase',
            fontWeight: '700',
            color: '#ff6600'
          }}>
            {tournament.game_type}
          </span>
        </div>
        {tournament.date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Calendar size={16} color="#ff6600" />
            <span>{new Date(tournament.date).toLocaleDateString()}</span>
          </div>
        )}
        {tournament.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={16} color="#ff6600" />
            <span>{tournament.location}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div>
        <button
          onClick={() => onManage(tournament.id)}
          className="button button-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            width: '100%'
          }}
        >
          <Settings size={16} /> Manage
        </button>
      </div>
    </div>
  );
};
