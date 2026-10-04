import type { Severity, AlertSeverity } from '../types';

export function getSeverityClass(severity: Severity | AlertSeverity | string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'badge-critical';
    case 'HIGH':     return 'badge-high';
    case 'WARNING':
    case 'MEDIUM':   return 'badge-warning';
    case 'INFO':
    case 'LOW':      return 'badge-info';
    default:         return 'badge-normal';
  }
}

export function getSeverityDotClass(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'status-dot-critical';
    case 'HIGH':     return 'status-dot-high';
    case 'WARNING':
    case 'MEDIUM':   return 'status-dot-warning';
    default:         return 'status-dot-normal';
  }
}

export function getSeverityTextColor(severity: string): string {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'text-status-critical';
    case 'HIGH':     return 'text-status-high';
    case 'WARNING':
    case 'MEDIUM':   return 'text-status-warning';
    case 'INFO':
    case 'LOW':      return 'text-status-info';
    default:         return 'text-status-normal';
  }
}

export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    MUD_LOSS:        'Mud Loss',
    STUCK_PIPE:      'Stuck Pipe',
    OVERPRESSURE:    'Overpressure / Kick',
    TORQUE_SPIKE:    'Torque Spike',
    CEMENTING_ISSUE: 'Cementing Issue',
    KICK:            'Well Kick',
    WASHOUT:         'Washout',
    BIT_DAMAGE:      'Bit Damage',
  };
  return labels[eventType] || eventType;
}

export function getEventTypeColor(eventType: string): string {
  const colors: Record<string, string> = {
    MUD_LOSS:        '#60a5fa',
    STUCK_PIPE:      '#f87171',
    OVERPRESSURE:    '#ef4444',
    TORQUE_SPIKE:    '#f59e0b',
    CEMENTING_ISSUE: '#a78bfa',
    KICK:            '#ef4444',
  };
  return colors[eventType] || '#94a3b8';
}

export function getRiskTypeLabel(riskType: string): string {
  return getEventTypeLabel(riskType);
}

export function formatDepth(depth: number): string {
  return `${depth.toFixed(0)} m`;
}

export function formatNumber(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function parseJsonField<T>(field: string | null | undefined, fallback: T): T {
  if (!field) return fallback;
  try { return JSON.parse(field) as T; } catch { return fallback; }
}

export function getWellStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DRILLING: '#22c55e',
    ACTIVE:   '#22c55e',
    COMPLETED:'#60a5fa',
    ABANDONED:'#6b7280',
    PLANNED:  '#f59e0b',
  };
  return colors[status] || '#94a3b8';
}

export function clsx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
