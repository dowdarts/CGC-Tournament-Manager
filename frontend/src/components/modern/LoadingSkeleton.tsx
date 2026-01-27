import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  type?: 'card' | 'stat' | 'table-row';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  count = 3, 
  type = 'card' 
}) => {
  if (type === 'stat') {
    return (
      <div className="grid grid-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px' }}>
            <div className="skeleton" style={{ height: '20px', width: '60%', marginBottom: '12px' }} />
            <div className="skeleton" style={{ height: '40px', width: '80%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '16px', width: '40%' }} />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <tr key={i}>
            <td><div className="skeleton" style={{ height: '16px', width: '100%' }} /></td>
            <td><div className="skeleton" style={{ height: '16px', width: '80%' }} /></td>
            <td><div className="skeleton" style={{ height: '16px', width: '60%' }} /></td>
          </tr>
        ))}
      </>
    );
  }

  return (
    <div className="grid grid-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card" style={{ padding: '24px' }}>
          <div className="skeleton" style={{ height: '24px', width: '70%', marginBottom: '16px' }} />
          <div className="skeleton" style={{ height: '16px', width: '50%', marginBottom: '20px' }} />
          <div className="skeleton" style={{ height: '16px', width: '90%', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '16px', width: '80%', marginBottom: '20px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="skeleton" style={{ height: '40px' }} />
            <div className="skeleton" style={{ height: '40px' }} />
          </div>
        </div>
      ))}
    </div>
  );
};
