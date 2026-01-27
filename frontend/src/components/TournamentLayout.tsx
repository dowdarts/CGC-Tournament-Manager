import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { Menu, ChevronDown, Home, Info, Lock } from 'lucide-react';
import { TournamentService } from '@/services/api';
import { Tournament } from '@/types';
import { getLogoUrl } from '@/utils/assets';
import '../App.css';

interface TournamentLayoutProps {
  children: React.ReactNode;
}

const TournamentLayout: React.FC<TournamentLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [helpMode, setHelpMode] = useState(() => {
    return localStorage.getItem('helpMode') === 'true';
  });

  const toggleHelpMode = () => {
    const newHelpMode = !helpMode;
    setHelpMode(newHelpMode);
    localStorage.setItem('helpMode', String(newHelpMode));
  };

  useEffect(() => {
    if (id && id !== 'new') {
      loadTournament();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Listen for knockout bracket updates to refresh tournament state
    const handleKnockoutBracketUpdate = () => {
      if (id) {
        loadTournament();
      }
    };

    window.addEventListener('knockoutBracketUpdated', handleKnockoutBracketUpdate);
    return () => {
      window.removeEventListener('knockoutBracketUpdated', handleKnockoutBracketUpdate);
    };
  }, [id]);

  useEffect(() => {
    // Update browser tab title when tournament loads
    if (tournament) {
      document.title = `${tournament.name} - CGC Tournament Manager`;
    } else {
      document.title = 'CGC Tournament Manager';
    }
    
    // Reset title when component unmounts
    return () => {
      document.title = 'CGC Tournament Manager';
    };
  }, [tournament]);

  const loadTournament = async () => {
    if (!id) return;
    try {
      const data = await TournamentService.getTournament(id);
      setTournament(data);
    } catch (err) {
      console.error('Failed to load tournament:', err);
    } finally {
      setLoading(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const isTabLocked = (tabLabel: string): { locked: boolean; reason: string } => {
    if (!tournament) return { locked: false, reason: '' };

    switch (tabLabel) {
      case 'Setup Info':
        return { locked: false, reason: '' }; // Always accessible
      
      case 'Participants':
        return { locked: false, reason: '' }; // Always accessible after setup
      
      case 'Group Configuration':
        if (!tournament.setup_completed) {
          return { locked: true, reason: 'Complete Setup Info first' };
        }
        return { locked: false, reason: '' };
      
      case 'Group Stage':
        // Always accessible - no workflow requirements
        return { locked: false, reason: '' };
      
      case 'Board Manager':
        if (!tournament.setup_completed) {
          return { locked: true, reason: 'Complete Setup Info first' };
        }
        if (!tournament.participants_confirmed) {
          return { locked: true, reason: 'Confirm participants first' };
        }
        return { locked: false, reason: '' };
      
      case 'Knockout Bracket':
        if (!tournament.setup_completed) {
          return { locked: true, reason: 'Complete Setup Info first' };
        }
        if (!tournament.participants_confirmed) {
          return { locked: true, reason: 'Confirm participants first' };
        }
        // Only accessible after knockout is generated from Group Stage (status changes to 'knockout')
        if (tournament.status !== 'knockout' && tournament.format !== 'knockout') {
          return { locked: true, reason: 'Generate Knockout Bracket from Group Stage first' };
        }
        return { locked: false, reason: '' };
      
      default:
        return { locked: false, reason: '' };
    }
  };

  const menuItems = [
    { path: `/tournament/${id}/info`, label: 'Setup Info', icon: '📋', tooltip: 'Configure tournament details, scoring rules, and tiebreakers' },
    { path: `/tournament/${id}/checkin`, label: 'Participants', icon: '👥', tooltip: 'Manage player check-ins and registrations. Mark players as paid/unpaid and view team rosters' },
    { path: `/tournament/${id}/players`, label: 'Group Configuration', icon: '⚙️', tooltip: 'Configure tournament groups and distribute players/teams for round-robin play' },
    { path: `/tournament/${id}/groups`, label: 'Group Stage', icon: '🎯', tooltip: 'Run the group stage matches and track scores for round-robin play' },
    { path: `/tournament/${id}/bracket`, label: 'Knockout Bracket', icon: '🏆', tooltip: 'View and manage the knockout bracket for playoff rounds' },
    { path: `/tournament/${id}/standings`, label: 'Group Standings', icon: '🏆', tooltip: 'View group standings and stats' },
    { path: `/tournament/${id}/match-results`, label: 'Match Results', icon: '📊', tooltip: 'Review and approve DartConnect match results from live scoring tablets' },
    { path: `/tournament/${id}/settings`, label: 'Settings', icon: '⚙️', tooltip: 'Configure match format, board assignments, and scoring rules for this tournament' },
    { path: `/tournament/${id}/display-links`, label: 'Display URLs', icon: '🔗', tooltip: 'Get shareable links for tournament display and registration portal' },
    { path: `/tournament/${id}/paycal`, label: 'Paycal', icon: '💰', tooltip: 'Calculate and manage tournament prize distributions and player payouts' },

  ];

  return (
    <div className="app">
      {/* Logo Banner Header */}
      <div style={{
        width: '100%',
        backgroundColor: '#1e293b',
        padding: '20px 0',
        textAlign: 'center',
        borderBottom: '3px solid #667eea'
      }}>
        <img 
          src={getLogoUrl()} 
          alt="Tournament Manager" 
          style={{ 
            maxWidth: '100%',
            height: 'auto',
            maxHeight: '200px',
            display: 'block',
            margin: '0 auto'
          }} 
        />
      </div>

      {/* Navigation Bar */}
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h1 style={{ margin: 0, fontSize: '42px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Managing Event - {loading ? 'Loading...' : tournament ? tournament.name : 'New Tournament'}
            </h1>
            
            {/* Dashboard and Help Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={toggleHelpMode}
                className={`button ${helpMode ? 'button-primary' : 'button-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                title={helpMode ? 'Hide help tooltips' : 'Show help tooltips'}
              >
                <Info size={18} />
                Help
              </button>
              <button
                onClick={() => navigate('/')}
                className="button button-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Home size={18} />
                Dashboard
              </button>
            </div>
          </div>

          {/* Horizontal Menu Buttons */}
          <nav style={{ 
            display: 'flex', 
            gap: '10px', 
            flexWrap: 'wrap',
            paddingTop: '15px',
            borderTop: '1px solid #334155'
          }}>
            {menuItems.map((item) => {
              const lockStatus = isTabLocked(item.label);
              const isLocked = lockStatus.locked;
              
              if (isLocked) {
                // Render as disabled button with lock icon
                return (
                  <button
                    key={item.path}
                    className="button button-secondary"
                    disabled
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      padding: '10px 16px',
                      opacity: 0.5,
                      cursor: 'not-allowed'
                    }}
                    title={lockStatus.reason}
                  >
                    <Lock size={14} style={{ color: '#94a3b8' }} />
                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {helpMode && (
                      <span 
                        title={item.tooltip}
                        style={{ 
                          cursor: 'help',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          fontSize: '12px',
                          marginLeft: '4px'
                        }}
                      >
                        <Info size={12} />
                      </span>
                    )}
                  </button>
                );
              }

              // Render as normal link
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`button ${isActive(item.path) ? 'button-primary' : 'button-secondary'}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    padding: '10px 16px'
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  <span>{item.label}</span>
                  {helpMode && (
                    <span 
                      title={item.tooltip}
                      style={{ 
                        cursor: 'help',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                        fontSize: '12px',
                        marginLeft: '4px'
                      }}
                    >
                      <Info size={12} />
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>

      <footer style={{ 
        backgroundColor: '#0f172a', 
        padding: '20px', 
        textAlign: 'center', 
        borderTop: '1px solid #334155',
        marginTop: '40px'
      }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
          © 2026 Dart Tournament Manager. Desktop application for Windows.
        </p>
      </footer>
    </div>
  );
};

export default TournamentLayout;
