import React from 'react';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  noPadding?: boolean;
  style?: React.CSSProperties;
}

export function Card({ title, subtitle, children, className = '', headerAction, noPadding = false, style }: CardProps) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || headerAction) && (
        <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-surface-100">
          <div>
            {title && <h3 className="text-sm font-semibold text-surface-900 tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div className="flex items-center gap-2">{headerAction}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>
        {children}
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
  onClick?: () => void;
}

export function MetricCard({ label, value, sub, icon, color, onClick }: MetricCardProps) {
  return (
    <div
      className={`metric-card ${onClick ? 'cursor-pointer card-hover' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <span className="metric-label">{label}</span>
        {icon && (
          <span style={{ color: color || '#60a5fa' }} className="text-lg">
            {icon}
          </span>
        )}
      </div>
      <div className="metric-value" style={color ? { color } : undefined}>
        {value}
      </div>
      {sub && <span className="metric-sub">{sub}</span>}
    </div>
  );
}
