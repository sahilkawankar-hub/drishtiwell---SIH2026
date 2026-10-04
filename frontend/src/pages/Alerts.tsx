import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, Eye, Clock } from 'lucide-react';
import { useAlerts } from '../hooks/useApi';
import { acknowledgeAlert } from '../lib/api';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { EmptyState, Loading, ErrorMessage } from '../components/ui/Loading';
import { formatDepth, parseJsonField, formatRelativeTime } from '../lib/utils';

export default function AlertsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: alerts = [], isLoading, error, refetch } = useAlerts({
    status: filter !== 'ALL' ? filter : undefined,
    severity: severityFilter !== 'ALL' ? severityFilter : undefined,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  if (isLoading) return <Loading text="Loading operational alerts..." />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      {/* Summary KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Alerts', value: alerts.length, cls: 'text-surface-900' },
          { label: 'Critical Alerts', value: alerts.filter(a => a.severity === 'CRITICAL').length, cls: 'text-status-critical' },
          { label: 'High Alerts', value: alerts.filter(a => a.severity === 'HIGH').length, cls: 'text-status-high' },
          { label: 'Acknowledged', value: alerts.filter(a => a.status === 'ACKNOWLEDGED').length, cls: 'text-primary-700' },
        ].map(m => (
          <div key={m.label} className="metric-card bg-white shadow-2xs">
            <div className="metric-label">{m.label}</div>
            <div className={`metric-value ${m.cls}`}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5 bg-surface-100 border border-surface-200 rounded-lg p-0.5 shadow-2xs">
          {['ACTIVE', 'ACKNOWLEDGED', 'ALL'].map(s => (
            <button
              key={s}
              id={`filter-status-${s.toLowerCase()}`}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === s ? 'bg-white text-primary-700 shadow-xs' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-0.5 bg-surface-100 border border-surface-200 rounded-lg p-0.5 shadow-2xs">
          {['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'INFO'].map(s => (
            <button
              key={s}
              id={`filter-severity-${s.toLowerCase()}`}
              onClick={() => setSeverityFilter(s)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                severityFilter === s ? 'bg-white text-primary-700 shadow-xs' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-surface-500 font-medium ml-auto">{alerts.length} operational alert(s)</span>
      </div>

      {alerts.length === 0 && <EmptyState message="No alerts matching the selected filters" />}

      {/* Alert Cards */}
      <div className="space-y-2.5">
        {alerts.map(alert => {
          const evidence = parseJsonField<string[]>(alert.evidence, []);
          const isExpanded = expanded === alert.id;

          const borderClass =
            alert.severity === 'CRITICAL' ? 'border-l-status-critical' :
            alert.severity === 'HIGH' ? 'border-l-status-high' :
            alert.severity === 'WARNING' ? 'border-l-status-warning' :
            'border-l-primary-600';

          return (
            <div
              key={alert.id}
              className={`card border-l-4 transition-all bg-white shadow-2xs ${borderClass} ${
                alert.status === 'ACKNOWLEDGED' ? 'opacity-70 bg-surface-50/50' : ''
              }`}
            >
              <div className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <SeverityBadge severity={alert.severity} showDot>{alert.severity}</SeverityBadge>
                      <span className="badge badge-info text-2xs">{alert.alertType}</span>
                      <StatusBadge status={alert.status} />
                      {alert.depth && (
                        <span className="text-2xs text-surface-600 font-mono font-medium">Depth: {formatDepth(alert.depth)}</span>
                      )}
                      {alert.formation && (
                        <span className="text-2xs text-surface-500">· {alert.formation}</span>
                      )}
                      <span className="ml-auto text-2xs text-surface-400 flex items-center gap-1">
                        <Clock size={11} /> {formatRelativeTime(alert.createdAt)}
                      </span>
                    </div>

                    {/* Message */}
                    <div className="text-sm font-semibold text-surface-900 mb-1.5 leading-snug">{alert.message}</div>

                    {/* Recommended Action */}
                    {alert.recommendedAction && (
                      <div className="text-xs text-teal-900 bg-teal-50 border border-teal-200 rounded-md px-3 py-2 font-medium leading-relaxed">
                        <strong className="text-teal-800">Action Plan: </strong> {alert.recommendedAction}
                      </div>
                    )}

                    {/* Expanded: Evidence */}
                    {isExpanded && evidence.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-surface-100">
                        <div className="text-2xs text-surface-500 font-bold uppercase tracking-wider mb-1.5">
                          Correlated Offset Evidence
                        </div>
                        <div className="space-y-1">
                          {evidence.map((e, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-surface-700 bg-surface-50 p-1.5 rounded border border-surface-200">
                              <span className="text-primary-600 font-bold">•</span>
                              <span>{e}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      id={`alert-expand-${alert.id}`}
                      onClick={() => setExpanded(isExpanded ? null : alert.id)}
                      className="btn btn-ghost p-1.5 text-surface-600 hover:text-surface-900"
                      title={isExpanded ? 'Hide evidence' : 'View offset evidence'}
                    >
                      <Eye size={14} />
                    </button>
                    {alert.status === 'ACTIVE' && (
                      <button
                        id={`alert-ack-${alert.id}`}
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={acknowledgeMutation.isPending}
                        className="btn btn-ghost p-1.5 text-teal-700 hover:bg-teal-50 hover:border-teal-200"
                        title="Acknowledge alert"
                      >
                        <CheckCheck size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
