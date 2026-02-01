import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DartConnectService } from '@/services/api';
import { PendingMatchResult } from '@/types';
import { Check, X, AlertCircle, TrendingUp, Trophy, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import TaleOfTheTape from '@/components/TaleOfTheTape';
import '@/styles/MatchResultsManager.css';

/**
 * Match Results Manager
 * 
 * This page displays all pending match results captured from DartConnect.
 * Tournament directors can review and approve/reject scores before they're
 * applied to matches and standings.
 */
export default function MatchResultsManager() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  
  const [pendingResults, setPendingResults] = useState<PendingMatchResult[]>([]);
  const [liveMatches, setLiveMatches] = useState<PendingMatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'live' | 'pending' | 'approved' | 'rejected' | 'auto-accepted'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleExpanded = (resultId: string) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(resultId)) {
        newSet.delete(resultId);
      } else {
        newSet.add(resultId);
      }
      return newSet;
    });
  };

  useEffect(() => {
    if (tournamentId) {
      loadPendingResults();
      // Set up auto-refresh for live matches every 3 seconds
      const interval = setInterval(() => {
        if (filterStatus === 'live' || filterStatus === 'all') {
          loadPendingResults();
        }
      }, 3000);
      
      return () => clearInterval(interval);
    }
  }, [tournamentId, filterStatus]);

  const loadPendingResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFilter = filterStatus === 'all' ? undefined : filterStatus;
      const results = await DartConnectService.getPendingResults(tournamentId!, statusFilter);
      
      // Separate live matches from others
      const live = results.filter(r => r.is_live && r.status === 'live');
      const others = results.filter(r => !r.is_live || r.status !== 'live');
      
      setLiveMatches(live);
      setPendingResults(filterStatus === 'live' ? live : others);
    } catch (err: any) {
      console.error('Failed to load pending results:', err);
      setError(err.message || 'Failed to load match results');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (resultId: string) => {
    try {
      setProcessing(resultId);
      await DartConnectService.approvePendingResult(resultId);
      await loadPendingResults(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to approve result:', err);
      alert(`Failed to approve: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (resultId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    try {
      setProcessing(resultId);
      await DartConnectService.rejectPendingResult(resultId, 'user', reason || undefined);
      await loadPendingResults(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to reject result:', err);
      alert(`Failed to reject: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string, isLive: boolean = false) => {
    if (isLive && status === 'live') {
      return (
        <span className="status-badge live">
          <Zap size={14} className="pulse" />
          LIVE
        </span>
      );
    }
    
    const badges = {
      pending: { className: 'status-badge pending', text: 'Pending Review', icon: AlertCircle },
      approved: { className: 'status-badge approved', text: 'Approved', icon: Check },
      rejected: { className: 'status-badge rejected', text: 'Rejected', icon: X },
      'auto-accepted': { className: 'status-badge auto-accepted', text: 'Auto-Accepted', icon: Zap }
    };
    const badge = badges[status as keyof typeof badges] || badges.pending;
    const Icon = badge.icon;
    
    return (
      <span className={badge.className}>
        <Icon size={14} />
        {badge.text}
      </span>
    );
  };

  const getConfidenceBadge = (score?: number) => {
    if (!score && score !== 0) return null;
    
    const percentage = Math.round(score * 100);
    let className = 'confidence-badge ';
    
    if (score >= 0.9) className += 'high';
    else if (score >= 0.7) className += 'medium';
    else className += 'low';
    
    return (
      <span className={className}>
        Match Confidence: {percentage}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className="match-results-manager">
        <div className="loading">Loading match results...</div>
      </div>
    );
  }

  return (
    <div className="match-results-manager">
      <div className="page-header">
        <div className="header-content">
          <h1>Match Results Manager</h1>
          <p className="subtitle">
            Review and approve match scores captured from DartConnect
          </p>
        </div>
        <button 
          className="btn-secondary"
          onClick={() => navigate(`/tournament/${tournamentId}/group-stage`)}
        >
          Back to Tournament
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      <div className="filters">
        <button 
          className={filterStatus === 'live' ? 'active' : ''}
          onClick={() => setFilterStatus('live')}
        >
          🔴 Live ({liveMatches.length})
        </button>
        <button 
          className={filterStatus === 'pending' ? 'active' : ''}
          onClick={() => setFilterStatus('pending')}
        >
          Pending ({pendingResults.filter(r => r.status === 'pending' && !r.is_live).length})
        </button>
        <button 
          className={filterStatus === 'approved' ? 'active' : ''}
          onClick={() => setFilterStatus('approved')}
        >
          Approved
        </button>
        <button 
          className={filterStatus === 'auto-accepted' ? 'active' : ''}
          onClick={() => setFilterStatus('auto-accepted')}
        >
          Auto-Accepted
        </button>
        <button 
          className={filterStatus === 'rejected' ? 'active' : ''}
          onClick={() => setFilterStatus('rejected')}
        >
          Rejected
        </button>
        <button 
          className={filterStatus === 'all' ? 'active' : ''}
          onClick={() => setFilterStatus('all')}
        >
          All Results
        </button>
      </div>

      {pendingResults.length === 0 ? (
        <div className="empty-state">
          <Target size={64} className="empty-icon" />
          <h2>No Match Results</h2>
          <p>
            {filterStatus === 'live'
              ? 'No live matches. Matches will appear here when scrapers connect to DartConnect.'
              : filterStatus === 'pending' 
              ? 'No pending results to review. Match results will appear here when scrapers detect completed matches.'
              : `No ${filterStatus} results found.`
            }
          </p>
        </div>
      ) : (
        <>
          {filterStatus === 'live' && liveMatches.length > 0 && (
            <div className="live-matches-section">
              <h2 className="section-title">🔴 Live Matches</h2>
              <p className="section-subtitle">Scores update automatically every 3 seconds</p>
            </div>
          )}
          
          <div className="results-grid">
            {pendingResults.map(result => (
              <div key={result.id} className={`result-card ${result.status} ${result.is_live ? 'live-match' : ''}`}>
                <div className="card-header">
                  <div className="watch-code">
                    Watch Code: <strong>{result.watch_code}</strong>
                    {result.is_live && result.live_updated_at && (
                      <span className="last-update">
                        Updated {new Date(result.live_updated_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                  {getStatusBadge(result.status, result.is_live)}
                </div>

              <div className="match-info">
                <div className="player-result">
                  <div className="player-name">
                    {result.player1_name}
                    {result.player1_legs > result.player2_legs && (
                      <Trophy size={16} className="winner-icon" />
                    )}
                  </div>
                  <div className="player-stats">
                    <span className="legs-score">{result.player1_legs} legs</span>
                    {result.player1_sets > 0 && (
                      <span className="sets-score">{result.player1_sets} sets</span>
                    )}
                    {result.player1_average && (
                      <span className="average">
                        <TrendingUp size={12} />
                        {result.player1_average.toFixed(2)} avg
                      </span>
                    )}
                  </div>
                </div>

                <div className="vs-divider">VS</div>

                <div className="player-result">
                  <div className="player-name">
                    {result.player2_name}
                    {result.player2_legs > result.player1_legs && (
                      <Trophy size={16} className="winner-icon" />
                    )}
                  </div>
                  <div className="player-stats">
                    <span className="legs-score">{result.player2_legs} legs</span>
                    {result.player2_sets > 0 && (
                      <span className="sets-score">{result.player2_sets} sets</span>
                    )}
                    {result.player2_average && (
                      <span className="average">
                        <TrendingUp size={12} />
                        {result.player2_average.toFixed(2)} avg
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="match-details">
                {result.match_format && (
                  <div className="detail-item">
                    <span className="label">Format:</span>
                    <span className="value">{result.match_format}</span>
                  </div>
                )}
                {result.total_legs_played && (
                  <div className="detail-item">
                    <span className="label">Total Legs:</span>
                    <span className="value">{result.total_legs_played}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="label">Completed:</span>
                  <span className="value">
                    {new Date(result.match_completed_at).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="matching-info">
                {result.match_found ? (
                  <>
                    <div className="match-found">
                      <Check size={16} />
                      Linked to scheduled match
                    </div>
                    {getConfidenceBadge(result.confidence_score)}
                  </>
                ) : (
                  <div className="match-not-found">
                    <AlertCircle size={16} />
                    No matching scheduled match found
                  </div>
                )}
                {result.matching_notes && (
                  <div className="matching-notes">
                    {result.matching_notes}
                  </div>
                )}
              </div>

              {/* Tale of the Tape - Expandable Statistics */}
              <div className="stats-section">
                <button 
                  className="stats-toggle"
                  onClick={() => toggleExpanded(result.id)}
                >
                  {expandedResults.has(result.id) ? (
                    <>
                      <ChevronUp size={18} />
                      Hide Detailed Statistics
                    </>
                  ) : (
                    <>
                      <ChevronDown size={18} />
                      Show Detailed Statistics
                    </>
                  )}
                </button>
                
                {expandedResults.has(result.id) && (
                  <TaleOfTheTape result={result} />
                )}
              </div>

              {result.status === 'pending' && !result.is_live && (
                <div className="card-actions">
                  <button
                    className="btn-approve"
                    onClick={() => handleApprove(result.id)}
                    disabled={processing === result.id || !result.match_found}
                    title={!result.match_found ? 'Cannot approve - no matching scheduled match' : ''}
                  >
                    <Check size={18} />
                    Approve & Apply
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => handleReject(result.id)}
                    disabled={processing === result.id}
                  >
                    <X size={18} />
                    Reject
                  </button>
                </div>
              )}
              
              {result.is_live && (
                <div className="live-notice">
                  ⚡ Match in progress - Approve/reject options will appear when match completes
                </div>
              )}

              {result.status !== 'pending' && result.processed_at && (
                <div className="processed-info">
                  Processed by {result.processed_by} on{' '}
                  {new Date(result.processed_at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}
