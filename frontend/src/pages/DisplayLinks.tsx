import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Copy, Check } from 'lucide-react';

const DisplayLinks: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [copiedDisplay, setCopiedDisplay] = useState(false);
  const [copiedRegistration, setCopiedRegistration] = useState(false);
  const [copiedStandings, setCopiedStandings] = useState(false);

  const githubPagesBase = 'https://dowdarts.github.io/CGC-Tournament-Manager';
  const displayUrl = `${githubPagesBase}/tournament-display`;
  const standingsUrl = `${githubPagesBase}/standings-display`;
  const registrationUrl = `${githubPagesBase}/registration/`;

  const handleCopy = async (text: string, type: 'display' | 'registration' | 'standings') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'display') {
        setCopiedDisplay(true);
        setTimeout(() => setCopiedDisplay(false), 2000);
      } else if (type === 'registration') {
        setCopiedRegistration(true);
        setTimeout(() => setCopiedRegistration(false), 2000);
      } else {
        setCopiedStandings(true);
        setTimeout(() => setCopiedStandings(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '10px', fontSize: '32px', fontWeight: 'bold' }}>
          Display & Registration URLs
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '16px' }}>
          Share these links for tournament display and player registration
        </p>
      </div>

      {/* Tournament Display URL */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '2px solid #334155'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ExternalLink size={28} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              Tournament Display
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Live match updates and scores
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ 
            color: '#e2e8f0', 
            fontSize: '15px', 
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            Open this URL on a TV, projector, or any device to display live tournament progress. 
            Shows in-progress matches, upcoming matches, and completed match results in real-time.
          </p>

          <div style={{
            background: '#0f172a',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <code style={{
              flex: 1,
              color: '#3b82f6',
              fontSize: '16px',
              wordBreak: 'break-all',
              fontFamily: 'monospace'
            }}>
              {displayUrl}
            </code>
            <button
              onClick={() => handleCopy(displayUrl, 'display')}
              style={{
                background: copiedDisplay ? '#22c55e' : '#3b82f6',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                minWidth: '100px',
                justifyContent: 'center'
              }}
              onMouseEnter={e => {
                if (!copiedDisplay) e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={e => {
                if (!copiedDisplay) e.currentTarget.style.background = '#3b82f6';
              }}
            >
              {copiedDisplay ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#3b82f6'
          }}>
            💡 Display Tips
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px',
            color: '#e2e8f0',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Open on a separate device or browser window</li>
            <li>Select your tournament from the dropdown</li>
            <li>Updates automatically when you score matches</li>
            <li>Shows board assignments when matches are in progress</li>
            <li>Perfect for lobby displays or streaming overlays</li>
          </ul>
        </div>
      </div>

      {/* Public Standings Display URL */}
      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '2px solid #334155'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #22c55e, #10b981)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ExternalLink size={28} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              Public Standings Display
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Live group standings for fans
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ 
            color: '#e2e8f0', 
            fontSize: '15px', 
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            Share this URL for fans to view live group standings remotely. 
            Shows real-time rankings, wins/losses, and leg differentials for all groups.
          </p>

          <div style={{
            background: '#0f172a',
            border: '2px solid #22c55e',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <code style={{
              flex: 1,
              color: '#22c55e',
              fontSize: '16px',
              wordBreak: 'break-all',
              fontFamily: 'monospace'
            }}>
              {standingsUrl}
            </code>
            <button
              onClick={() => handleCopy(standingsUrl, 'standings')}
              style={{
                background: copiedStandings ? '#3b82f6' : '#22c55e',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                minWidth: '100px',
                justifyContent: 'center'
              }}
              onMouseEnter={e => {
                if (!copiedStandings) e.currentTarget.style.background = '#10b981';
              }}
              onMouseLeave={e => {
                if (!copiedStandings) e.currentTarget.style.background = '#22c55e';
              }}
            >
              {copiedStandings ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid #22c55e',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#22c55e'
          }}>
            💡 Standings Display Tips
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px',
            color: '#e2e8f0',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Perfect for fans watching remotely</li>
            <li>Shows all groups with live rankings</li>
            <li>Updates automatically every 30 seconds</li>
            <li>Displays tournaments with recent activity (last hour)</li>
            <li>Color-coded positions (1st in green, 2nd in blue)</li>
          </ul>
        </div>
      </div>

      {/* Registration Portal URL */}
      <div className="card">
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '20px',
          paddingBottom: '20px',
          borderBottom: '2px solid #334155'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            borderRadius: '12px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ExternalLink size={28} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
              Registration Portal
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '14px' }}>
              Player sign-up and registration
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <p style={{ 
            color: '#e2e8f0', 
            fontSize: '15px', 
            lineHeight: '1.6',
            marginBottom: '15px'
          }}>
            Share this URL with players to allow them to register for the tournament. 
            They can enter their name, email, and phone number to join.
          </p>

          <div style={{
            background: '#0f172a',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <code style={{
              flex: 1,
              color: '#f59e0b',
              fontSize: '16px',
              wordBreak: 'break-all',
              fontFamily: 'monospace'
            }}>
              {registrationUrl}
            </code>
            <button
              onClick={() => handleCopy(registrationUrl, 'registration')}
              style={{
                background: copiedRegistration ? '#22c55e' : '#f59e0b',
                border: 'none',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
                minWidth: '100px',
                justifyContent: 'center'
              }}
              onMouseEnter={e => {
                if (!copiedRegistration) e.currentTarget.style.background = '#d97706';
              }}
              onMouseLeave={e => {
                if (!copiedRegistration) e.currentTarget.style.background = '#f59e0b';
              }}
            >
              {copiedRegistration ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div style={{
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid #f59e0b',
          borderRadius: '8px',
          padding: '16px'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            fontSize: '16px', 
            fontWeight: '600',
            color: '#f59e0b'
          }}>
            💡 Registration Tips
          </h4>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px',
            color: '#e2e8f0',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <li>Post on social media or send via email</li>
            <li>Players receive confirmation emails automatically</li>
            <li>Registration can be enabled/disabled in Setup Info</li>
            <li>View all registrations in the Participants tab</li>
            <li>Mark players as paid when they arrive</li>
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ 
        marginTop: '30px',
        display: 'flex',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <a
          href={displayUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: '#3b82f6',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
        >
          <ExternalLink size={18} />
          Open Display in New Tab
        </a>
        <a
          href={registrationUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: '#f59e0b',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#d97706'}
          onMouseLeave={e => e.currentTarget.style.background = '#f59e0b'}
        >
          <ExternalLink size={18} />
          Open Registration in New Tab
        </a>
      </div>
    </div>
  );
};

export default DisplayLinks;
