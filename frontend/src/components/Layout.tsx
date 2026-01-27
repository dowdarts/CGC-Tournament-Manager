import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Settings, LogOut, Archive, CheckCircle, Home } from 'lucide-react';
import '../App.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const isActive = (path: string) => location.pathname === path;

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
          src={`${import.meta.env.BASE_URL}Tournament manager logo.png`} 
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
                title="Menu"
              >
                <Menu size={24} />
              </button>
              
              {/* Dropdown Menu */}
              {menuOpen && (
                <>
                  <div
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 999
                    }}
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '40px',
                      left: 0,
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      minWidth: '200px',
                      zIndex: 1000,
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      onClick={() => {
                        navigate('/');
                        setMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#334155',
                        fontWeight: location.pathname === '/' ? '600' : '400'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Home size={18} />
                      Active Tournaments
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate('/?filter=completed');
                        setMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#334155'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <CheckCircle size={18} />
                      Completed Tournaments
                    </button>
                    
                    <button
                      onClick={() => {
                        navigate('/?filter=archived');
                        setMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#334155'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Archive size={18} />
                      Archived Tournaments
                    </button>
                    
                    <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0' }} />
                    
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setMenuOpen(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '14px',
                        color: '#334155'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Settings size={18} />
                      Settings
                    </button>
                  </div>
                </>
              )}
              
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                Dart Tournament Manager
              </h1>
            </div>
            <nav>
              <ul className="nav-menu">
                <li>
                  <Link
                    to="/"
                    className={`nav-link ${isActive('/') ? 'active' : ''}`}
                  >
                    Dashboard
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          {children}
        </div>
      </main>

      <footer style={{ 
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
        padding: '40px 20px', 
        textAlign: 'center', 
        borderTop: '2px solid #ff6600',
        marginTop: '60px',
        boxShadow: '0 -8px 32px rgba(255, 102, 0, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h3 className="text-gradient" style={{ 
            fontSize: '20px', 
            fontWeight: '900',
            marginBottom: '12px',
            letterSpacing: '1px'
          }}>
            CGC TOURNAMENT MANAGER
          </h3>
          <p style={{ 
            margin: 0, 
            fontSize: '11px', 
            color: '#ff6600',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            marginBottom: '8px'
          }}>
            POWERED BY AADS DARTS
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af' }}>
            © 2026 All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
