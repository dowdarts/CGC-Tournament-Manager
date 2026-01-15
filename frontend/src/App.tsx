import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import TournamentLayout from './components/TournamentLayout';
import Dashboard from './pages/Dashboard';
import BasicInfo from './pages/BasicInfo';
import CheckinList from './pages/CheckinList';
import RegistrationList from './pages/RegistrationList';
import TournamentSetup from './pages/TournamentSetup';
import GroupStage from './pages/GroupStage';
import BoardManager from './pages/BoardManager';
import Scorer from './pages/Scorer';
import KnockoutBracket from './pages/KnockoutBracket';
import Analytics from './pages/Analytics';
import Paycal from './pages/Paycal';
import Settings from './pages/Settings';
import PublicRegister from './pages/PublicRegister';
import TournamentLobby from './pages/TournamentLobby';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes without layout */}
        <Route path="/registration-portal" element={<TournamentLobby />} />
        <Route path="/registration-portal/:id" element={<PublicRegister />} />
        
        {/* Dashboard with main layout */}
        <Route path="/" element={
          <Layout>
            <Dashboard />
          </Layout>
        } />
        
        <Route path="/settings" element={
          <Layout>
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
              <Route path="paycal" element={<Paycal />} />
              <Route path="analytics" element={<Analytics />} />
            </Routes>
          </TournamentLayout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
