import { getSeverityClass, getSeverityDotClass } from '../../lib/utils';

interface BadgeProps {
  severity: string;
  children: React.ReactNode;
  showDot?: boolean;
}

export function SeverityBadge({ severity, children, showDot = false }: BadgeProps) {
  return (
    <span className={getSeverityClass(severity)}>
      {showDot && <span className={getSeverityDotClass(severity)} />}
      {children}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  children?: React.ReactNode;
}

const statusMap: Record<string, { cls: string; label: string }> = {
  ACTIVE:       { cls: 'badge-normal',  label: 'Active' },
  DRILLING:     { cls: 'badge-normal',  label: 'Drilling' },
  COMPLETED:    { cls: 'badge-info',    label: 'Completed' },
  ABANDONED:    { cls: 'badge',         label: 'Abandoned' },
  PLANNED:      { cls: 'badge-warning', label: 'Planned' },
  ACKNOWLEDGED: { cls: 'badge-info',    label: 'Acknowledged' },
  DISMISSED:    { cls: 'badge',         label: 'Dismissed' },
  RESOLVED:     { cls: 'badge-normal',  label: 'Resolved' },
  MONITORING:   { cls: 'badge-warning', label: 'Monitoring' },
  PENDING:      { cls: 'badge-warning', label: 'Pending' },
  REVIEWED:     { cls: 'badge-info',    label: 'Reviewed' },
  ACCEPTED:     { cls: 'badge-normal',  label: 'Accepted' },
  REJECTED:     { cls: 'badge-high',    label: 'Rejected' },
  PROCESSED:    { cls: 'badge-normal',  label: 'Processed' },
  PROCESSING:   { cls: 'badge-warning', label: 'Processing' },
  FAILED:       { cls: 'badge-critical',label: 'Failed' },
};

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const mapping = statusMap[status] || { cls: 'badge', label: status };
  return (
    <span className={mapping.cls}>
      {children || mapping.label}
    </span>
  );
}
