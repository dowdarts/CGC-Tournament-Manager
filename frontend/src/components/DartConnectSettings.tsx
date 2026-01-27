import React, { useState, useEffect } from 'react';
import { DartConnectService } from '@/services/api';
import { Tournament } from '@/types';
import { Zap, Shield, AlertCircle, Link, ExternalLink, CheckCircle, Wifi, WifiOff, Play } from 'lucide-react';
import '@/styles/DartConnectSettings.css';

interface DartConnectSettingsProps {
  tournament: Tournament;
  onUpdate: (updates: Partial<Tournament>) => void;
}

/**
 * DartConnect Integration Settings Component
 * 
 * Allows tournament directors to:
 * - Enable/disable DartConnect live scraping
 * - Toggle auto-accept scores
 * - Configure approval requirements
 * - View pending results count
 * - Monitor server connection status
 * - Input watch codes for match tracking
 */
export default function DartConnectSettings({ tournament, onUpdate }: DartConnectSettingsProps) {
  const [integrationEnabled, setIntegrationEnabled] = useState(
    tournament.dartconnect_integration_enabled || false
  );
  const [autoAccept, setAutoAccept] = useState(
    tournament.dartconnect_auto_accept_scores || false
  );
  const [requireManualApproval, setRequireManualApproval] = useState(
    tournament.dartconnect_require_manual_approval !== false
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [watchCode, setWatchCode] = useState('');
  const [matchId, setMatchId] = useState('');
  const [linkingWatchCode, setLinkingWatchCode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [connectionLog, setConnectionLog] = useState<string[]>([]);

  useEffect(() => {
    loadPendingCount();
    if (integrationEnabled) {
      checkConnection();
      // Check connection every 30 seconds
      const interval = setInterval(checkConnection, 30000);
      return () => clearInterval(interval);
    }
  }, [tournament.id, integrationEnabled]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const checkConnection = async () => {
    if (!integrationEnabled) return;
    
    setConnectionStatus('checking');
    addLog('Checking server connection...');
    
    try {
      // Simple health check - just verify we can reach the API
      await DartConnectService.getPendingResults(tournament.id, 'pending');
      setConnectionStatus('connected');
      addLog('✓ Server connection established');
    } catch (error) {
      setConnectionStatus('disconnected');
      addLog('✗ Server connection failed');
    }
  };

  const handleLinkWatchCode = async () => {
    if (!watchCode.trim() || !matchId.trim()) {
      alert('Please enter both watch code and match ID');
      return;
    }

    try {
      setLinkingWatchCode(true);
      addLog(`Linking watch code ${watchCode} to match ${matchId}...`);
      
      await DartConnectService.setMatchWatchCode(matchId, tournament.id, watchCode, autoAccept);
      
      addLog(`✓ Watch code linked successfully`);
      alert('Watch code linked to match successfully!');
      setWatchCode('');
      setMatchId('');
    } catch (error: any) {
      addLog(`✗ Failed to link watch code: ${error.message}`);
      alert(`Failed to link watch code: ${error.message}`);
    } finally {
      setLinkingWatchCode(false);
    }
  };

  const loadPendingCount = async () => {
    try {
      const results = await DartConnectService.getPendingResults(tournament.id, 'pending');
      setPendingCount(results.length);
    } catch (error) {
      console.error('Failed to load pending results count:', error);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updates = {
        dartconnect_integration_enabled: integrationEnabled,
        dartconnect_auto_accept_scores: autoAccept,
        dartconnect_require_manual_approval: requireManualApproval
      };
      
      await DartConnectService.updateDartConnectSettings(tournament.id, updates);
      onUpdate(updates);
      
      alert('DartConnect settings saved successfully!');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      alert(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dartconnect-settings">
      <div className="section-header">
        <div className="header-title">
          <Link size={24} />
          <h2>DartConnect Integration</h2>
        </div>
        <a 
          href={`/tournament/${tournament.id}/match-results`}
          className="view-results-link"
          target="_blank"
        >
          <ExternalLink size={16} />
          View Pending Results {pendingCount > 0 && `(${pendingCount})`}
        </a>
      </div>

      <p className="section-description">
        Automatically capture match scores from DartConnect live scoring system. 
        When enabled, completed matches will be detected and results can be 
        automatically or manually applied to your tournament.
      </p>

      <div className="settings-card">
        <div className="setting-item">
          <div className="setting-header">
            <div className="setting-title">
              <Zap size={20} className="icon-primary" />
              <div>
                <h3>Enable DartConnect Integration</h3>
                <p className="setting-description">
                  Allow match scores to be captured from DartConnect scoring tablets
                </p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={integrationEnabled}
                onChange={(e) => setIntegrationEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        {integrationEnabled && (
          <>
            <div className="setting-divider"></div>

            {/* Connection Status */}
            <div className="connection-status-section">
              <div className="connection-header">
                {connectionStatus === 'connected' && <Wifi size={20} className="icon-success" />}
                {connectionStatus === 'disconnected' && <WifiOff size={20} className="icon-danger" />}
                {connectionStatus === 'checking' && <Wifi size={20} className="icon-warning" />}
                <h3>
                  Server Connection: {' '}
                  <span className={`status-badge status-${connectionStatus}`}>
                    {connectionStatus === 'connected' && 'Connected'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                    {connectionStatus === 'checking' && 'Checking...'}
                  </span>
                </h3>
              </div>
              
              {connectionLog.length > 0 && (
                <div className="connection-log">
                  <h4>Connection Log:</h4>
                  <div className="log-entries">
                    {connectionLog.map((log, idx) => (
                      <div key={idx} className="log-entry">{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Watch Code Input */}
            {connectionStatus === 'connected' && (
              <>
                <div className="setting-divider"></div>
                <div className="watch-code-section">
                  <div className="section-title">
                    <Play size={20} className="icon-primary" />
                    <h3>Link Match to DCTV Watch Code</h3>
                  </div>
                  <p className="section-description">
                    Enter the DartConnect TV watch code and match ID to track live scores. 
                    The watch code will be converted to an alley_id for score tracking.
                  </p>
                  
                  <div className="watch-code-form">
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="watchCode">DCTV Watch Code</label>
                        <input
                          id="watchCode"
                          type="text"
                          placeholder="e.g., ABC123"
                          value={watchCode}
                          onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
                          className="input-field"
                        />
                      </div>
                      
                      <div className="form-field">
                        <label htmlFor="matchId">Match ID</label>
                        <input
                          id="matchId"
                          type="text"
                          placeholder="Match UUID"
                          value={matchId}
                          onChange={(e) => setMatchId(e.target.value)}
                          className="input-field"
                        />
                      </div>
                    </div>
                    
                    <button
                      className="btn-link-watch-code"
                      onClick={handleLinkWatchCode}
                      disabled={linkingWatchCode || !watchCode.trim() || !matchId.trim()}
                    >
                      {linkingWatchCode ? 'Linking...' : 'Link Watch Code to Match'}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="setting-divider"></div>

            <div className="setting-item">
              <div className="setting-header">
                <div className="setting-title">
                  <CheckCircle size={20} className="icon-success" />
                  <div>
                    <h3>Auto-Accept High Confidence Scores</h3>
                    <p className="setting-description">
                      Automatically apply scores when match confidence is ≥90% 
                      (exact player name match with scheduled match)
                    </p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={autoAccept}
                    onChange={(e) => setAutoAccept(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              
              {autoAccept && (
                <div className="setting-warning">
                  <AlertCircle size={16} />
                  <span>
                    Auto-accept will immediately update match scores and standings 
                    without manual review. Only high-confidence matches are auto-accepted.
                  </span>
                </div>
              )}
            </div>

            <div className="setting-divider"></div>

            <div className="setting-item">
              <div className="setting-header">
                <div className="setting-title">
                  <Shield size={20} className="icon-warning" />
                  <div>
                    <h3>Require Manual Approval</h3>
                    <p className="setting-description">
                      All captured scores must be reviewed and approved in the 
                      Match Results Manager before being applied
                    </p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={requireManualApproval}
                    onChange={(e) => setRequireManualApproval(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {integrationEnabled && (
        <div className="integration-info">
          <div className="info-card">
            <h4>How It Works</h4>
            <ol>
              <li>Start a match on DartConnect scoring tablets</li>
              <li>Run the enhanced scraper with your tournament ID and watch code</li>
              <li>The scraper monitors the match and detects completion</li>
              <li>Match results appear in the Match Results Manager</li>
              <li>
                {autoAccept && !requireManualApproval
                  ? 'High-confidence matches are auto-accepted and applied to standings'
                  : 'Review and approve results to update standings'}
              </li>
            </ol>
          </div>

          <div className="info-card">
            <h4>Running the Scraper</h4>
            <pre className="code-block">
              <code>
{`cd dartconnect-scraper
node enhanced-scraper.js <watch-code> ${tournament.id}`}
              </code>
            </pre>
            <p className="code-description">
              Replace <code>&lt;watch-code&gt;</code> with your DartConnect watch code (e.g., ABC123)
            </p>
          </div>
        </div>
      )}

      <div className="settings-actions">
        <button
          className="btn-save"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}
