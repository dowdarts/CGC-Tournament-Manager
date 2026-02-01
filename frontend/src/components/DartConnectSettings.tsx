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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('disconnected');
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [watchCodes, setWatchCodes] = useState<string[]>(['', '', '', '']);
  const [savingWatchCodes, setSavingWatchCodes] = useState(false);
  const [scraperStatus, setScraperStatus] = useState<'stopped' | 'starting' | 'running' | 'stopping'>('stopped');
  const [controlServerStatus, setControlServerStatus] = useState<'running' | 'stopped'>('stopped');

  useEffect(() => {
    loadPendingCount();
    loadWatchCodes();
    checkControlServer();
    checkScraperStatus();
    if (integrationEnabled) {
      checkConnection();
      // Check connection and scraper status every 30 seconds
      const interval = setInterval(() => {
        checkControlServer();
        checkConnection();
        checkScraperStatus();
      }, 30000);
      return () => clearInterval(interval);
    } else {
      // When disabled, still check control server status
      const interval = setInterval(() => {
        checkControlServer();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [tournament.id, integrationEnabled]);

  const loadWatchCodes = () => {
    // Load watch codes from tournament settings if available
    if (tournament.dartconnect_watch_codes && Array.isArray(tournament.dartconnect_watch_codes)) {
      setWatchCodes([
        tournament.dartconnect_watch_codes[0] || '',
        tournament.dartconnect_watch_codes[1] || '',
        tournament.dartconnect_watch_codes[2] || '',
        tournament.dartconnect_watch_codes[3] || ''
      ]);
    }
  };

  const handleWatchCodeChange = (index: number, value: string) => {
    const newCodes = [...watchCodes];
    newCodes[index] = value.toUpperCase();
    setWatchCodes(newCodes);
  };

  const handleSaveWatchCodes = async () => {
    try {
      setSavingWatchCodes(true);
      addLog('Saving watch codes...');
      
      // Filter out empty codes
      const activeCodes = watchCodes.filter(code => code.trim() !== '');
      
      // Include ALL dartconnect settings to prevent them from being lost
      const updates = {
        dartconnect_integration_enabled: integrationEnabled,
        dartconnect_auto_accept_scores: autoAccept,
        dartconnect_require_manual_approval: requireManualApproval,
        dartconnect_watch_codes: watchCodes
      };
      
      await DartConnectService.updateDartConnectSettings(tournament.id, updates);
      
      onUpdate(updates);
      
      addLog(`✓ Saved ${activeCodes.length} watch code(s)`);
      alert(`Watch codes saved! Active codes: ${activeCodes.length}`);
    } catch (error: any) {
      addLog(`✗ Failed to save watch codes: ${error.message}`);
      alert(`Failed to save watch codes: ${error.message}`);
    } finally {
      setSavingWatchCodes(false);
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const startScraperService = async () => {
    if (controlServerStatus !== 'running') {
      addLog('❌ Control server must be running first');
      addLog('💡 Click "Start Control Server" button above');
      return;
    }

    try {
      setScraperStatus('starting');
      addLog('🚀 Starting DartConnect scraper service...');
      
      const response = await fetch('http://localhost:3001/api/scraper/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setScraperStatus('running');
        addLog('✅ Scraper service started successfully');
        checkConnection();
      } else {
        setScraperStatus('stopped');
        addLog(`⚠️ ${data.message}`);
      }
    } catch (error: any) {
      setScraperStatus('stopped');
      addLog(`❌ Control server not reachable`);
      addLog('💡 Make sure control server is started');
      console.error('Failed to start scraper:', error);
    }
  };

  const stopScraperService = async () => {
    try {
      setScraperStatus('stopping');
      addLog('🛑 Stopping DartConnect scraper service...');
      
      const response = await fetch('http://localhost:3001/api/scraper/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = await response.json();
      setScraperStatus('stopped');
      addLog('✅ Scraper service stopped');
    } catch (error: any) {
      setScraperStatus('stopped');
      addLog('⚠️ Scraper stopped (control server not reachable)');
      console.error('Failed to stop scraper:', error);
    }
  };

  const checkControlServer = async () => {
    try {
      const response = await fetch('http://localhost:3001/health', {
        signal: AbortSignal.timeout(2000)
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setControlServerStatus('running');
        return true;
      }
    } catch (error) {
      // Expected when control server not started yet - don't log to console
      setControlServerStatus('stopped');
      return false;
    }
    return false;
  };



  const checkScraperStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/scraper/status', {
        signal: AbortSignal.timeout(2000)
      });
      const data = await response.json();
      setScraperStatus(data.status || 'stopped');
      
      if (data.running) {
        addLog(`✓ Scraper is running (PID: ${data.pid})`);
      }
    } catch (error) {
      // Expected when control server not running - don't log to console
      setScraperStatus('stopped');
    }
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
        dartconnect_require_manual_approval: requireManualApproval,
        dartconnect_watch_codes: watchCodes // Include watch codes in main save too
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

      {/* Control Server Status */}
      <div className="settings-card control-server-card">
        <div className="setting-item">
          <div className="setting-header">
            <div className="setting-title">
              {controlServerStatus === 'running' ? (
                <CheckCircle size={20} className="icon-success" />
              ) : (
                <AlertCircle size={20} className="icon-danger" />
              )}
              <div>
                <h3>Control Server Status</h3>
                <p className="setting-description">
                  {controlServerStatus === 'running' 
                    ? 'Control server is running - you can now enable DartConnect integration below'
                    : 'Control server not running. Start it to enable DartConnect integration.'}
                </p>
              </div>
            </div>
            <span className={`status-badge status-${controlServerStatus === 'running' ? 'connected' : 'disconnected'}`}>
              {controlServerStatus === 'running' ? '🟢 Running' : '🔴 Stopped'}
            </span>
          </div>
        </div>
        
        {controlServerStatus === 'stopped' && (
          <div className="control-server-instructions">
            <h4>Start the control server to enable DartConnect</h4>
            <p>Run this command to start both the frontend and control server:</p>
            <div className="code-block">
              <code>npm run dev:with-scraper</code>
            </div>
            <p className="instructions-note">
              The control server runs in the background and manages the DartConnect scraper.
            </p>
          </div>
        )}
      </div>

      <div className="settings-card">
        <div className="setting-item">
          <div className="setting-header">
            <div className="setting-title">
              <Zap size={20} className="icon-primary" />
              <div>
                <h3>Enable DartConnect Integration</h3>
                <p className="setting-description">
                  Allow match scores to be captured from DartConnect scoring tablets
                  {controlServerStatus !== 'running' && (
                    <span className="warning-text"> (Start control server first)</span>
                  )}
                </p>
              </div>
            </div>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={integrationEnabled}
                disabled={!integrationEnabled && controlServerStatus !== 'running'}
                onChange={async (e) => {
                  const enabled = e.target.checked;
                  
                  // Allow turning OFF at any time, but check server before turning ON
                  if (enabled && controlServerStatus !== 'running') {
                    addLog('❌ Control server must be running to enable integration');
                    addLog('💡 Click "Start Control Server" button above');
                    return;
                  }
                  
                  setIntegrationEnabled(enabled);
                  
                  if (enabled) {
                    await startScraperService();
                  } else {
                    await stopScraperService();
                  }
                }}
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
              <div className="connection-header scraper-status-header">
                {scraperStatus === 'running' && <CheckCircle size={20} className="icon-success" />}
                {scraperStatus === 'stopped' && <AlertCircle size={20} className="icon-danger" />}
                {(scraperStatus === 'starting' || scraperStatus === 'stopping') && <AlertCircle size={20} className="icon-warning" />}
                <h3>
                  Scraper Service: {' '}
                  <span className={`status-badge status-${scraperStatus === 'running' ? 'connected' : scraperStatus === 'stopped' ? 'disconnected' : 'checking'}`}>
                    {scraperStatus === 'running' && '🟢 Running'}
                    {scraperStatus === 'stopped' && '🔴 Stopped'}
                    {scraperStatus === 'starting' && '🟡 Starting...'}
                    {scraperStatus === 'stopping' && '🟡 Stopping...'}
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

            {/* Watch Code Inputs for Multiple Tablets */}
            {connectionStatus === 'connected' && (
              <>
                <div className="setting-divider"></div>
                <div className="watch-code-section">
                  <div className="section-title">
                    <Play size={20} className="icon-primary" />
                    <h3>Active Watch Codes (Up to 4 Tablets)</h3>
                  </div>
                  <p className="section-description">
                    Enter the DartConnect TV watch codes for matches currently in progress. 
                    The scraper will monitor all active codes and automatically capture results when matches complete.
                  </p>
                  
                  <div className="watch-codes-grid">
                    {watchCodes.map((code, index) => (
                      <div key={index} className="watch-code-input-group">
                        <label htmlFor={`watchCode${index + 1}`}>
                          Tablet {index + 1} / Board {index + 1}
                        </label>
                        <input
                          id={`watchCode${index + 1}`}
                          type="text"
                          placeholder="e.g., ABC123"
                          value={code}
                          onChange={(e) => handleWatchCodeChange(index, e.target.value)}
                          className="watch-code-input"
                          maxLength={10}
                        />
                        {code.trim() && (
                          <span className="code-active-badge">
                            <CheckCircle size={14} />
                            Active
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <button
                    className="btn-save-watch-codes"
                    onClick={handleSaveWatchCodes}
                    disabled={savingWatchCodes}
                  >
                    {savingWatchCodes ? 'Saving...' : 'Save Watch Codes'}
                  </button>
                  
                  <div className="watch-code-info">
                    <AlertCircle size={16} />
                    <p>
                      After saving, run the scraper for each active watch code. 
                      The scraper will monitor all matches and auto-detect which tournament match 
                      corresponds to each watch code based on player names.
                    </p>
                  </div>
                </div>
              </>
            )}

            <div className="setting-divider"></div>

            {/* Automatic Match Detection Info */}
            <div className="watch-code-section">
              <div className="section-title">
                <CheckCircle size={20} className="icon-success" />
                <h3>Automatic Match Detection</h3>
              </div>
              <p className="section-description">
                The scraper automatically identifies tournament matches by matching player names from DartConnect TV with your scheduled matches. No manual linking required!
              </p>
              
              <div className="auto-detection-info">
                <div className="info-box">
                  <CheckCircle size={18} className="icon-success" />
                  <div>
                    <h4>How It Works:</h4>
                    <ol>
                      <li>Enter watch codes above for each active tablet/board</li>
                      <li>Start matches on DartConnect scoring tablets</li>
                      <li>Run the scraper with your tournament ID:</li>
                    </ol>
                    <div className="code-example">
                      <code>node enhanced-scraper.js {tournament.id}</code>
                    </div>
                    <ol start={4}>
                      <li><strong>Player names are automatically extracted</strong> from each watch code</li>
                      <li><strong>System finds matching scheduled matches</strong> using intelligent name matching</li>
                      <li>When matches complete, results appear in Match Results Manager</li>
                    </ol>
                  </div>
                </div>
                
                <div className="matching-details">
                  <h4>Player Name Matching:</h4>
                  <ul>
                    <li><strong>Exact Match (100% confidence):</strong> Player names match exactly</li>
                    <li><strong>High Confidence (90%+):</strong> Close match using fuzzy matching (handles typos, spacing)</li>
                    <li><strong>Partial Match (&lt;90%):</strong> Similar names but requires manual review</li>
                  </ul>
                  <p className="note">
                    💡 <strong>Tip:</strong> Use consistent player names in both DartConnect and your tournament registration for best auto-detection accuracy
                  </p>
                </div>
              </div>
            </div>

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
