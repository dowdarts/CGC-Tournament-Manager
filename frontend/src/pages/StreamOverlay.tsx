import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';
import { Monitor, Play, Square, Settings, Wifi, WifiOff, Eye } from 'lucide-react';

interface MatchData {
  player1: {
    name: string;
    score: string;
    legs: string;
    isActive: boolean;
  };
  player2: {
    name: string;
    score: string;
    legs: string;
    isActive: boolean;
  };
  match: {
    format: string;
    currentLeg: string;
    lastThrow: string;
  };
  timestamp: number;
}

export default function StreamOverlay() {
  const [watchCode, setWatchCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [showSettings, setShowSettings] = useState(false);
  const [overlaySettings, setOverlaySettings] = useState({
    showLogo: true,
    showLastThrow: true,
    showFormat: true,
    theme: 'dark',
    position: 'bottom'
  });
  
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectToMatch = async () => {
    if (!watchCode.trim()) {
      alert('Please enter a DartConnect watch code');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Clean up existing connection
      if (channelRef.current) {
        await channelRef.current.unsubscribe();
      }

      // Create new channel for this match
      const channel = supabase.channel(`match-${watchCode}`);
      channelRef.current = channel;

      // Subscribe to live score updates
      channel
        .on('broadcast', { event: 'live-score-update' }, (payload) => {
          console.log('📡 Received live update:', payload);
          setMatchData(payload.payload);
          setLastUpdate(new Date());
          setIsLive(true);
        })
        .subscribe((status) => {
          console.log('📡 Subscription status:', status);
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionStatus('connected');
          } else if (status === 'CLOSED') {
            setIsConnected(false);
            setConnectionStatus('disconnected');
            setIsLive(false);
            // Auto-reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              if (watchCode) {
                connectToMatch();
              }
            }, 5000);
          }
        });

      // Check for existing session data
      const { data: sessionData } = await supabase
        .from('scraper_sessions')
        .select('last_data, status, last_update')
        .eq('watch_code', watchCode)
        .single();

      if (sessionData && sessionData.last_data) {
        setMatchData(sessionData.last_data);
        setLastUpdate(new Date(sessionData.last_update));
        setIsLive(sessionData.status === 'active');
      }

    } catch (error) {
      console.error('❌ Failed to connect to match:', error);
      setConnectionStatus('disconnected');
      alert('Failed to connect to match. Please check the watch code and try again.');
    }
  };

  const disconnectFromMatch = async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    setIsLive(false);
    setMatchData(null);
    setWatchCode('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi size={16} className="text-green-500" />;
      case 'connecting':
        return <Wifi size={16} className="text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff size={16} className="text-red-500" />;
    }
  };

  // Control Panel Component
  const ControlPanel = () => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Monitor size={24} className="text-blue-500" />
        <h1 className="text-xl font-bold text-white">DartConnect Stream Overlay</h1>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={watchCode}
            onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isConnected && watchCode.trim()) {
                connectToMatch();
              }
            }}
            placeholder="Enter DartConnect Watch Code (e.g., ABC123)"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnected}
            maxLength={10}
            autoComplete="off"
          />
          {!isConnected ? (
            <button
              onClick={connectToMatch}
              disabled={connectionStatus === 'connecting'}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded flex items-center gap-2"
            >
              <Play size={16} />
              Connect
            </button>
          ) : (
            <button
              onClick={disconnectFromMatch}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-2"
            >
              <Square size={16} />
              Disconnect
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-gray-300">
              {connectionStatus === 'connected' ? 'Connected' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
            {isLive && (
              <div className="flex items-center gap-1 text-green-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>
          
          {lastUpdate && (
            <span className="text-gray-400">
              Last update: {formatTime(lastUpdate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  // Professional Branded Scoreboard Component
  const Scoreboard = () => {
    if (!matchData) {
      return (
        <div className="bg-black bg-opacity-90 rounded-lg border border-gray-800 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <Monitor size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg">Waiting for match data...</p>
            <p className="text-sm">Start the scraper and connect to a DartConnect match</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 rounded-xl border-2 border-blue-500 shadow-2xl overflow-hidden">
        {/* Header with branding */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Monitor size={16} className="text-blue-600" />
              </div>
              <span className="text-white font-bold text-lg">CGC TOURNAMENT</span>
            </div>
            <div className="flex items-center gap-2 text-white text-sm">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span>LIVE</span>
            </div>
          </div>
        </div>

        {/* Match info */}
        <div className="px-6 py-2 bg-gray-800 text-center">
          <div className="text-gray-300 text-sm">
            {matchData.match.format && (
              <span className="mr-4">{matchData.match.format}</span>
            )}
            <span>Leg {matchData.match.currentLeg}</span>
            {matchData.match.lastThrow && (
              <span className="ml-4 text-yellow-400 font-bold">
                Last: {matchData.match.lastThrow}
              </span>
            )}
          </div>
        </div>

        {/* Players and scores */}
        <div className="grid grid-cols-3 gap-0">
          {/* Player 1 */}
          <div className={`p-6 text-center transition-all duration-300 ${
            matchData.player1.isActive 
              ? 'bg-gradient-to-b from-green-600 to-green-800 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}>
            <div className="mb-2">
              <div className="text-lg font-bold truncate">{matchData.player1.name}</div>
              <div className="text-xs opacity-75">PLAYER 1</div>
            </div>
            <div className="text-6xl font-black mb-2 font-mono">
              {matchData.player1.score}
            </div>
            <div className="text-sm">
              Legs: <span className="font-bold">{matchData.player1.legs}</span>
            </div>
          </div>

          {/* VS Divider */}
          <div className="bg-gradient-to-b from-blue-600 to-blue-800 flex items-center justify-center">
            <div className="text-white text-4xl font-black">VS</div>
          </div>

          {/* Player 2 */}
          <div className={`p-6 text-center transition-all duration-300 ${
            matchData.player2.isActive 
              ? 'bg-gradient-to-b from-green-600 to-green-800 text-white' 
              : 'bg-gray-800 text-gray-300'
          }`}>
            <div className="mb-2">
              <div className="text-lg font-bold truncate">{matchData.player2.name}</div>
              <div className="text-xs opacity-75">PLAYER 2</div>
            </div>
            <div className="text-6xl font-black mb-2 font-mono">
              {matchData.player2.score}
            </div>
            <div className="text-sm">
              Legs: <span className="font-bold">{matchData.player2.legs}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-900 px-6 py-2 text-center text-xs text-gray-400">
          DartConnect Watch Code: {watchCode} • Powered by CGC Tournament Manager
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Show control panel when not in OBS mode */}
      {!window.location.search.includes('obs=true') && <ControlPanel />}
      
      {/* Instructions for OBS */}
      {!window.location.search.includes('obs=true') && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-blue-300 mb-2">📹 OBS Setup Instructions:</h3>
          <ol className="text-sm text-gray-300 space-y-1">
            <li>1. Connect to a DartConnect match using the form above</li>
            <li>2. Run the scraper: <code className="bg-gray-800 px-2 py-1 rounded">node scraper.js {watchCode || 'WATCH_CODE'}</code></li>
            <li>3. Add Browser Source in OBS with URL: <code className="bg-gray-800 px-2 py-1 rounded">{window.location.href}?obs=true</code></li>
            <li>4. Set size to 800x400 (or adjust as needed) with transparent background</li>
          </ol>
        </div>
      )}

      {/* Main scoreboard */}
      <div className={window.location.search.includes('obs=true') ? 'max-w-4xl mx-auto' : ''}>
        <Scoreboard />
      </div>

      {/* Debug info (hidden in OBS mode) */}
      {!window.location.search.includes('obs=true') && matchData && (
        <div className="mt-6 bg-gray-900 border border-gray-700 rounded p-4">
          <details>
            <summary className="cursor-pointer text-sm text-gray-400 mb-2">🔍 Debug Data</summary>
            <pre className="text-xs text-gray-500 overflow-auto">
              {JSON.stringify(matchData, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}