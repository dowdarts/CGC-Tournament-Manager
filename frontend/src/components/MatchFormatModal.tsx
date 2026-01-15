import React, { useState } from 'react';
import { X } from 'lucide-react';

interface MatchFormatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (format: {
    match_format: 'matchplay' | 'set_play';
    play_style?: 'play_all' | 'best_of';
    legs_per_match?: number;
    legs_per_set?: number;
    sets_per_match?: number;
  }) => void;
  stage: 'roundrobin' | 'knockout';
  title: string;
}

const MatchFormatModal = ({
  isOpen,
  onClose,
  onConfirm,
  stage,
  title
}: MatchFormatModalProps) => {
  const [matchFormat, setMatchFormat] = useState<'matchplay' | 'set_play'>('matchplay');
  const [playStyle, setPlayStyle] = useState<'play_all' | 'best_of'>('best_of');
  const [legsPerMatch, setLegsPerMatch] = useState(3);
  const [legsPerSet, setLegsPerSet] = useState(3);
  const [setsPerMatch, setSetsPerMatch] = useState(5);

  if (!isOpen) return <></>;

  const handleConfirm = () => {
    onConfirm({
      match_format: matchFormat,
      play_style: matchFormat === 'matchplay' ? playStyle : undefined,
      legs_per_match: matchFormat === 'matchplay' ? legsPerMatch : undefined,
      legs_per_set: matchFormat === 'set_play' ? legsPerSet : undefined,
      sets_per_match: matchFormat === 'set_play' ? setsPerMatch : undefined
    });
  };

  const stageColor = stage === 'roundrobin' ? '#667eea' : '#f59e0b';
  const stageName = stage === 'roundrobin' ? 'Round Robin (Group Stage)' : 'Knockout (Elimination)';

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="card" style={{
        maxWidth: '600px',
        width: '90%',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
            padding: '5px'
          }}
          title="Close"
        >
          <X size={24} />
        </button>

        <h2 style={{ marginBottom: '10px', color: stageColor }}>{title}</h2>
        <p style={{ color: '#94a3b8', marginBottom: '20px', fontSize: '14px' }}>
          Configure match format for <strong style={{ color: stageColor }}>{stageName}</strong>
        </p>

        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Match Format</label>
          <div style={{ display: 'grid', gap: '10px' }}>
            <label className="radio-label" style={{
              padding: '15px',
              border: '2px solid ' + (matchFormat === 'matchplay' ? stageColor : '#334155'),
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                value="matchplay"
                checked={matchFormat === 'matchplay'}
                onChange={(e) => setMatchFormat(e.target.value as any)}
                style={{ marginRight: '10px' }}
              />
              <div>
                <strong>Matchplay</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>
                  Race to win a specific number of legs (e.g., Best of 11 = first to 6 legs)
                </p>
              </div>
            </label>

            <label className="radio-label" style={{
              padding: '15px',
              border: '2px solid ' + (matchFormat === 'set_play' ? stageColor : '#334155'),
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <input
                type="radio"
                value="set_play"
                checked={matchFormat === 'set_play'}
                onChange={(e) => setMatchFormat(e.target.value as any)}
                style={{ marginRight: '10px' }}
              />
              <div>
                <strong>Set Play</strong>
                <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#94a3b8' }}>
                  Legs grouped into sets, win sets to win the match
                </p>
              </div>
            </label>
          </div>

          {matchFormat === 'matchplay' && (
            <>
              <div className="form-group" style={{ marginTop: '15px' }}>
                <label className="form-label">Number of Legs</label>
                <input
                  type="number"
                  value={legsPerMatch}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setLegsPerMatch(value);
                  }}
                  className="input"
                  min="0"
                  style={{ maxWidth: '200px' }}
                />
              </div>

              <div className="form-group" style={{ marginTop: '15px' }}>
                <label className="form-label">Play Style</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setPlayStyle('best_of')}
                    className={`button ${playStyle === 'best_of' ? 'button-primary' : 'button-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Best of {legsPerMatch}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlayStyle('play_all')}
                    className={`button ${playStyle === 'play_all' ? 'button-primary' : 'button-secondary'}`}
                    style={{ flex: 1 }}
                  >
                    Play All {legsPerMatch}
                  </button>
                </div>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '5px' }}>
                  {playStyle === 'best_of' 
                    ? `First to ${Math.ceil(legsPerMatch / 2)} legs wins the match` 
                    : `All ${legsPerMatch} legs will be played for statistics`}
                </p>
              </div>
            </>
          )}

          {matchFormat === 'set_play' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
              <div className="form-group">
                <label className="form-label">Legs Per Set</label>
                <input
                  type="number"
                  value={legsPerSet}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setLegsPerSet(value);
                  }}
                  className="input"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sets Per Match (Best of)</label>
                <input
                  type="number"
                  value={setsPerMatch}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseInt(e.target.value);
                    setSetsPerMatch(value);
                  }}
                  className="input"
                  min="0"
                />
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '5px' }}>
                  First to {Math.ceil(setsPerMatch / 2)} sets wins
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={handleConfirm} className="btn btn-primary">
            Confirm & Generate
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchFormatModal;
