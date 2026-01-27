import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import TournamentLayout from './components/TournamentLayout';
// Explicit Dashboard import
import Dashboard from './pages/Dashboard';
import BasicInfo from './pages/BasicInfo';
import CheckinList from './pages/CheckinList';
import RegistrationList from './pages/RegistrationList';
import TournamentSetup from './pages/TournamentSetup';
import GroupStage from './pages/GroupStage';
import BoardManager from './pages/BoardManager';
import Scorer from './pages/Scorer';
import KnockoutBracket from './pages/KnockoutBracket';
import Paycal from './pages/Paycal';
import StreamOverlay from '@/pages/StreamOverlay';
import Standings from '@/pages/Standings';
import Settings from './pages/Settings';
import PublicRegister from './pages/PublicRegister';
import TournamentLobby from './pages/TournamentLobby';
import TournamentDisplay from './pages/TournamentDisplay';
import PublicStandings from './pages/PublicStandings';
import DisplayLinks from './pages/DisplayLinks';
import SignInContainer from './components/SignInContainer';
import UserHeader from './components/UserHeader';
import './App.css';
import './auth.css';

// Component that handles authenticated routes
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  // Use '/' for Electron app, '/CGC-Tournament-Manager' for GitHub Pages
  const isElectron = window.location.protocol === 'file:';
  const basename = (!isElectron && import.meta.env.PROD) ? '/CGC-Tournament-Manager' : '/';

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="spinner-small loading-spinner" />
          Loading...
        </div>
      </div>
    );
  }

  // Always show the app with dashboard layout
  return (
    <Router 
      basename={basename}
      future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}
    >
      <Routes>
        {/* Main route - Dashboard with conditional content */}
        <Route path="/" element={
          <Layout>
            {user ? (
              <>
                <UserHeader />
                {Dashboard ? <Dashboard /> : <div>Loading Dashboard...</div>}
              </>
            ) : (
              <SignInContainer />
            )}
          </Layout>
        } />
        
        {/* Public routes without layout - these work without authentication */}
        <Route path="/lobby" element={<TournamentLobby />} />
        <Route path="/registration-portal" element={<TournamentLobby />} />
        <Route path="/registration-portal/:id" element={<PublicRegister />} />
        
        {/* DartConnect Stream Overlay - Full screen, no layout */}
        <Route path="/stream-overlay" element={<StreamOverlay />} />
        
        {/* Tournament Display - Full screen, no layout */}
        <Route path="/tournament-display" element={<TournamentDisplay />} />
        
        {/* Public Standings Display - Full screen, no layout */}
        <Route path="/standings-display" element={<PublicStandings />} />
        
        {/* Protected routes - only accessible when authenticated */}
        {user && (
          <>
            <Route path="/dashboard" element={
              <Layout>
                <UserHeader />
                <Dashboard />
              </Layout>
            } />
            
            <Route path="/settings" element={
              <Layout>
                <UserHeader />
                <Settings />
              </Layout>
            } />

            {/* Tournament-specific routes with TournamentLayout */}
            <Route path="/tournament/:id/*" element={
              <TournamentLayout>
                <Routes>
                  <Route path="info" element={<BasicInfo />} />
                  <Route path="checkin" element={<CheckinList />} />
                  <Route path="players" element={<RegistrationList />} />
                  <Route path="setup" element={<TournamentSetup />} />
                  <Route path="groups" element={<GroupStage />} />
                  <Route path="boards" element={<BoardManager />} />
                  <Route path="match/:matchId/score" element={<Scorer />} />
                  <Route path="bracket" element={<KnockoutBracket />} />
                  <Route path="standings" element={<Standings />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="display-links" element={<DisplayLinks />} />
                  <Route path="paycal" element={<Paycal />} />
                </Routes>
              </TournamentLayout>
            } />
          </>
        )}
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
