import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCheck, CheckCircle2, Clock, ArrowRight,
  ChevronDown, ChevronUp, MapPin, Eye
} from 'lucide-react';
import { useAlerts, useActiveWell } from '../hooks/useApi';
import { acknowledgeAlert, resolveAlert } from '../lib/api';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/Card';
import { EmptyState, Loading, ErrorMessage } from '../components/ui/Loading';
import { formatDepth, parseJsonField, formatRelativeTime } from '../lib/utils';
import type { AlertSeverity } from '../types';

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 1,
  HIGH: 2,
  WARNING: 3,
  MEDIUM: 3,
  INFO: 4,
  LOW: 4,
};

export default function AlertsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('ACTIVE');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: activeWell } = useActiveWell();
  const { data: rawAlerts = [], isLoading, error, refetch } = useAlerts({
    status: filter !== 'ALL' ? filter : undefined,
    severity: severityFilter !== 'ALL' ? severityFilter : undefined,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: resolveAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  // Prioritize Critical → High → Warning/Medium → Info/Low, then by latest timestamp
  const alerts = useMemo(() => {
    return [...rawAlerts].sort((a, b) => {
      const rankA = SEVERITY_ORDER[a.severity] ?? 99;
      const rankB = SEVERITY_ORDER[b.severity] ?? 99;
      if (rankA !== rankB) return rankA - rankB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rawAlerts]);

  if (isLoading) return <Loading text="Loading operational alerts..." />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;
  const activeCount = alerts.filter(a => a.status === 'ACTIVE').length;
  const ackCount = alerts.filter(a => a.status === 'ACKNOWLEDGED').length;

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── WORKFLOW BREADCRUMB ────────────────────────────────────────────── */}
      <div className="card px-3.5 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-surface-400">Workflow:</span>
          <span className="px-2 py-0.5 rounded bg-surface-100 text-surface-600 font-medium">1. Evidence</span>
          <ArrowRight size={12} className="text-surface-300" />
          <button
            onClick={() => navigate('/risk-intelligence')}
            className="px-2 py-0.5 rounded text-surface-600 hover:text-surface-900 hover:bg-surface-100 font-medium transition-colors"
          >
            2. Risk Assessment
          </button>
          <ArrowRight size={12} className="text-surface-300" />
          <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">3. Operational Alerts</span>
          <ArrowRight size={12} className="text-surface-300" />
          <button
            onClick={() => navigate('/recommendations')}
            className="px-2 py-0.5 rounded text-surface-600 hover:text-surface-900 hover:bg-surface-100 font-medium transition-colors"
          >
            4. Actions
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-500">
          <span>Priority sorted:</span>
          <span className="font-semibold text-surface-700">Critical → High → Warning → Info</span>
        </div>
      </div>

      {/* ─── SUMMARY KPIS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Active Alerts"
          value={activeCount}
          sub={`${alerts.length} total operational alerts`}
          color="#0284c7"
        />
        <MetricCard
          label="Critical Priority"
          value={criticalCount}
          sub={criticalCount > 0 ? 'Requires immediate supervisor sign-off' : 'None active'}
          color="#dc2626"
        />
        <MetricCard
          label="High Priority"
          value={highCount}
          sub="Requires parameter adjustment"
          color="#ea580c"
        />
        <MetricCard
          label="Acknowledged"
          value={ackCount}
          sub="Reviewed by rig team"
          color="#0d9488"
        />
      </div>

      {/* ─── FILTERS TOOLBAR ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filters */}
          <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-lg p-0.5 shadow-2xs">
            {['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'ALL'].map(s => (
              <button
                key={s}
                id={`filter-status-${s.toLowerCase()}`}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  filter === s ? 'bg-white text-primary-700 shadow-2xs' : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Severity Filters */}
          <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-lg p-0.5 shadow-2xs">
            {['ALL', 'CRITICAL', 'HIGH', 'WARNING', 'INFO'].map(s => (
              <button
                key={s}
                id={`filter-severity-${s.toLowerCase()}`}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  severityFilter === s ? 'bg-white text-primary-700 shadow-2xs' : 'text-surface-600 hover:text-surface-900'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs text-surface-500">
          Showing <strong className="text-surface-800">{alerts.length}</strong> alerts
        </span>
      </div>

      {/* ─── ALERTS LIST ────────────────────────────────────────────────────── */}
      {alerts.length === 0 ? (
        <EmptyState message="No alerts matching the selected filters." />
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const evidence = parseJsonField<string[]>(alert.evidence, []);
            const isExpanded = expanded === alert.id;

            const isCrit = alert.severity === 'CRITICAL';
            const isHigh = alert.severity === 'HIGH';
            const isWarn = alert.severity === 'WARNING';
            const borderClass = isCrit
              ? 'border-l-red-600'
              : isHigh
              ? 'border-l-amber-500'
              : isWarn
              ? 'border-l-amber-400'
              : 'border-l-teal-600';

            const wellDisplayName = alert.well?.wellName || activeWell?.wellName || 'Active Well';
            const wellDisplayId = alert.well?.wellId || activeWell?.wellId || alert.wellId;

            return (
              <div
                key={alert.id}
                className={`card bg-white border-l-4 ${borderClass} p-4 transition-all shadow-2xs hover:shadow-xs ${
                  alert.status === 'ACKNOWLEDGED' ? 'opacity-80 bg-surface-50/40' : ''
                }`}
              >
                {/* Header Row: Severity, Well Tag, Alert Type, Depth/Formation, Time, Primary Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-surface-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={alert.severity as AlertSeverity} showDot>
                      {alert.severity}
                    </SeverityBadge>

                    {/* Affected Well */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 text-xs font-semibold text-surface-800">
                      <MapPin size={11} className="text-primary-600" />
                      {wellDisplayName}
                      {wellDisplayId && (
                        <span className="font-mono text-2xs font-normal text-surface-500">({wellDisplayId})</span>
                      )}
                    </span>

                    <span className="badge badge-info text-2xs">{alert.alertType}</span>
                    <StatusBadge status={alert.status} />
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {alert.depth && (
                      <span className="font-mono text-surface-700">
                        {formatDepth(alert.depth)}
                      </span>
                    )}
                    {alert.formation && (
                      <span className="text-teal-700 font-medium">· {alert.formation}</span>
                    )}
                    <span className="text-surface-400 flex items-center gap-1 text-2xs">
                      <Clock size={11} /> {formatRelativeTime(alert.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Reason & Content */}
                <div className="pt-3 space-y-2.5">
                  <div>
                    <div className="text-2xs font-semibold text-surface-400 uppercase tracking-wider mb-0.5">
                      Trigger Reason
                    </div>
                    <div className="text-sm font-semibold text-surface-900 leading-snug">
                      {alert.message}
                    </div>
                  </div>

                  {/* Recommended Action Plan */}
                  {alert.recommendedAction && (
                    <div className="text-xs text-teal-900 bg-teal-50 border border-teal-200 rounded-md p-2.5 leading-relaxed">
                      <strong className="text-teal-800 font-semibold">Immediate Action Plan: </strong>
                      {alert.recommendedAction}
                    </div>
                  )}

                  {/* Secondary Details (Expandable Evidence) */}
                  {isExpanded && evidence.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-surface-100 space-y-1.5">
                      <div className="text-2xs text-surface-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Eye size={11} className="text-primary-600" />
                        Supporting Offset Well Incidents & Benchmark Triggers
                      </div>
                      <div className="space-y-1">
                        {evidence.map((ev, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-xs text-surface-700 bg-surface-50 p-2 rounded border border-surface-200"
                          >
                            <span className="text-primary-600 font-bold">•</span>
                            <span>{ev}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Card Actions Footer */}
                  <div className="flex items-center justify-between pt-1">
                    {evidence.length > 0 ? (
                      <button
                        id={`alert-expand-${alert.id}`}
                        onClick={() => setExpanded(isExpanded ? null : alert.id)}
                        className="btn btn-ghost text-xs py-1 px-2 text-surface-600 flex items-center gap-1"
                      >
                        {isExpanded ? 'Hide Supporting Evidence' : `View Offset Evidence (${evidence.length})`}
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                    ) : <div />}

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/recommendations')}
                        className="btn btn-ghost text-xs py-1 px-2.5 text-primary-700 hover:text-primary-800"
                      >
                        Engineering Actions <ArrowRight size={12} />
                      </button>

                      {alert.status === 'ACTIVE' && (
                        <button
                          id={`alert-ack-${alert.id}`}
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          disabled={acknowledgeMutation.isPending}
                          className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1 font-semibold"
                        >
                          <CheckCheck size={13} />
                          {acknowledgeMutation.isPending ? 'Saving...' : 'Acknowledge Alert'}
                        </button>
                      )}

                      {alert.status === 'ACKNOWLEDGED' && (
                        <button
                          id={`alert-resolve-${alert.id}`}
                          onClick={() => resolveMutation.mutate(alert.id)}
                          disabled={resolveMutation.isPending}
                          className="btn btn-secondary text-xs py-1 px-3 flex items-center gap-1 font-semibold"
                        >
                          <CheckCircle2 size={13} />
                          {resolveMutation.isPending ? 'Saving...' : 'Resolve Alert'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
