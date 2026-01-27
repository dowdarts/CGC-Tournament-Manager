import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon: Icon, 
  iconColor = '#ff6600',
  trend,
  subtitle
}) => {
  return (
    <div className="glass-card hover-lift" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <p style={{ 
            fontSize: '13px', 
            fontWeight: '700', 
            color: '#9ca3af', 
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px'
          }}>
            {title}
          </p>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: '900', 
            margin: 0,
            background: 'linear-gradient(135deg, #ff6600 0%, #ffaa66 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            {value}
          </h2>
          {subtitle && (
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
              {subtitle}
            </p>
          )}
        </div>
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          background: `linear-gradient(135deg, ${iconColor}15 0%, ${iconColor}08 100%)`,
          border: `1px solid ${iconColor}30`
        }}>
          <Icon size={24} color={iconColor} />
        </div>
      </div>
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            fontSize: '12px', 
            fontWeight: '700',
            color: trend.isPositive ? '#10b981' : '#ef4444'
          }}>
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>vs last month</span>
        </div>
      )}
    </div>
  );
};
