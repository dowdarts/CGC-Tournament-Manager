import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import TournamentSetup from './pages/TournamentSetup';
import GroupStage from './pages/GroupStage';
import BoardManager from './pages/BoardManager';
import Scorer from './pages/Scorer';
import KnockoutBracket from './pages/KnockoutBracket';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import PublicRegister from './pages/PublicRegister';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes without layout */}
        <Route path="/register/:id" element={<PublicRegister />} />
        
        {/* Admin routes with layout */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/tournament/:id/setup" element={<TournamentSetup />} />
              <Route path="/tournament/:id/groups" element={<GroupStage />} />
              <Route path="/tournament/:id/boards" element={<BoardManager />} />
              <Route path="/tournament/:id/match/:matchId/score" element={<Scorer />} />
              <Route path="/tournament/:id/bracket" element={<KnockoutBracket />} />
              <Route path="/tournament/:id/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
