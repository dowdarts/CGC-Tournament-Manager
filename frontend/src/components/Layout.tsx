import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Settings, LogOut } from 'lucide-react';
import '../App.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
              >
                <Menu size={24} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src="/Tournament manager logo.png" alt="Tournament Manager" style={{ height: '36px', width: 'auto' }} />
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
                  Dart Tournament Manager
                </h1>
              </div>
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
                <li>
                  <Link
                    to="/settings"
                    className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                  >
                    <Settings size={18} style={{ display: 'inline' }} /> Settings
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

export default Layout;
