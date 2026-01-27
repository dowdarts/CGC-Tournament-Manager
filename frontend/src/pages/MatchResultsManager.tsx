import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DartConnectService } from '@/services/api';
import { PendingMatchResult } from '@/types';
import { Check, X, AlertCircle, TrendingUp, Trophy, Target, Zap } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'auto-accepted'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tournamentId) {
      loadPendingResults();
    }
  }, [tournamentId, filterStatus]);

  const loadPendingResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const statusFilter = filterStatus === 'all' ? undefined : filterStatus;
      const results = await DartConnectService.getPendingResults(tournamentId!, statusFilter);
      setPendingResults(results);
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

  const getStatusBadge = (status: string) => {
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
          className={filterStatus === 'pending' ? 'active' : ''}
          onClick={() => setFilterStatus('pending')}
        >
          Pending ({pendingResults.filter(r => r.status === 'pending').length})
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
            {filterStatus === 'pending' 
              ? 'No pending results to review. Match results will appear here when scrapers detect completed matches.'
              : `No ${filterStatus} results found.`
            }
          </p>
        </div>
      ) : (
        <div className="results-grid">
          {pendingResults.map(result => (
            <div key={result.id} className={`result-card ${result.status}`}>
              <div className="card-header">
                <div className="watch-code">
                  Watch Code: <strong>{result.watch_code}</strong>
                </div>
                {getStatusBadge(result.status)}
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

              {result.status === 'pending' && (
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

              {result.status !== 'pending' && result.processed_at && (
                <div className="processed-info">
                  Processed by {result.processed_by} on{' '}
                  {new Date(result.processed_at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
