import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, Activity, Droplets, TrendingUp, ChevronRight, Clock } from 'lucide-react';
import { MetricCard, Card } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage } from '../components/ui/Loading';
import { useActiveWell, useAlerts, useRisks, useWellEvents } from '../hooks/useApi';
import { formatDepth, formatRelativeTime, getEventTypeLabel } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: activeWell, isLoading: wellLoading, error: wellError } = useActiveWell();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts({ status: 'ACTIVE' });
  const { data: risks = [], isLoading: risksLoading } = useRisks({ status: 'ACTIVE' });
  const { data: recentEvents = [], isLoading: eventsLoading } = useWellEvents(activeWell?.id || '');

  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;

  if (wellLoading) return <Loading text="Loading dashboard..." />;
  if (wellError) return <ErrorMessage error={wellError as Error} />;

  const currentFormationName = activeWell?.formations?.find(f => f.isActive)?.formation.name || activeWell?.currentFormation || 'Barail Formation';
  const progress = activeWell?.totalDepth
    ? ((activeWell.currentDepth / activeWell.totalDepth) * 100).toFixed(0)
    : null;

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-4">
      {/* Active Well Summary */}
      {activeWell && (
        <div className="card p-4 border-l-4 border-l-primary-600 bg-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={activeWell.status} />
                <span className="text-xs text-surface-500">
                  {activeWell.field} · {activeWell.block}
                </span>
              </div>
              <h2 className="text-lg font-bold text-surface-900 tracking-tight flex items-center gap-2">
                {activeWell.wellName}
                <span className="text-xs font-mono font-normal text-surface-400">({activeWell.wellId})</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-5">
              <div>
                <div className="text-2xs text-surface-500 mb-0.5">Current Depth</div>
                <div className="text-xl font-bold font-mono text-surface-900">
                  {formatDepth(activeWell.currentDepth)}
                </div>
              </div>
              <div>
                <div className="text-2xs text-surface-500 mb-0.5">Formation</div>
                <div className="text-sm font-semibold text-teal-700">{currentFormationName}</div>
              </div>
              {progress && (
                <div>
                  <div className="text-2xs text-surface-500 mb-0.5">Progress</div>
                  <div className="text-sm font-bold font-mono text-surface-800">{progress}%</div>
                </div>
              )}
              <button
                id="dash-view-well-btn"
                onClick={() => navigate('/active-well')}
                className="btn btn-primary text-xs font-semibold"
              >
                View Well <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Current Depth"
          value={activeWell ? formatDepth(activeWell.currentDepth) : '—'}
          sub={`MD · ${currentFormationName}`}
          icon={<Droplets size={18} />}
          color="#0d9488"
        />
        <MetricCard
          label="Active Alerts"
          value={alerts.filter(a => a.status === 'ACTIVE').length}
          sub={criticalAlerts > 0 ? `${criticalAlerts} critical` : highAlerts > 0 ? `${highAlerts} high` : 'No critical alerts'}
          icon={<Bell size={18} />}
          color={criticalAlerts > 0 ? '#dc2626' : highAlerts > 0 ? '#ea580c' : '#16a34a'}
          onClick={() => navigate('/alerts')}
        />
        <MetricCard
          label="Active Risks"
          value={risks.filter(r => r.status === 'ACTIVE').length}
          sub={`${risks.filter(r => r.severity === 'CRITICAL').length} critical`}
          icon={<AlertTriangle size={18} />}
          color="#ea580c"
          onClick={() => navigate('/risk-intelligence')}
        />
        <MetricCard
          label="Drilling Status"
          value={activeWell?.status || '—'}
          sub={`${activeWell?.wellType || 'Vertical'} · ${progress ? `${progress}% to TD` : 'In progress'}`}
          icon={<Activity size={18} />}
          color="#0284c7"
        />
      </div>

      {/* Risk summary + Active alerts + Recent events */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
        {/* Risk Summary */}
        <Card
          title="Risk Summary"
          subtitle="Active risk distribution by severity"
          className="bg-white"
        >
          {risksLoading ? <Loading size="sm" /> : (
            <div className="space-y-2">
              {[
                { name: 'Critical', value: risks.filter(r => r.severity === 'CRITICAL').length, fill: '#dc2626' },
                { name: 'High', value: risks.filter(r => r.severity === 'HIGH').length, fill: '#ea580c' },
                { name: 'Medium', value: risks.filter(r => r.severity === 'MEDIUM').length, fill: '#d97706' },
                { name: 'Low', value: risks.filter(r => r.severity === 'LOW').length, fill: '#16a34a' },
              ].map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-xs text-surface-600 w-14">{item.name}</span>
                  <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${risks.length > 0 ? (item.value / risks.length) * 100 : 0}%`,
                        backgroundColor: item.fill,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-surface-700 w-5 text-right">{item.value}</span>
                </div>
              ))}
              {risks.length === 0 && (
                <div className="py-6 text-center text-surface-400 text-xs">No active risks</div>
              )}
            </div>
          )}
        </Card>

        {/* Active Alerts */}
        <Card
          title="Active Alerts"
          subtitle={`${alerts.filter(a => a.status === 'ACTIVE').length} requiring review`}
          className="bg-white"
          headerAction={
            <button id="dash-alerts-btn" onClick={() => navigate('/alerts')} className="btn btn-ghost text-xs py-1">
              View All
            </button>
          }
        >
          {alertsLoading ? <Loading size="sm" /> : (
            <div className="space-y-2">
              {alerts.filter(a => a.status === 'ACTIVE').slice(0, 4).map(alert => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border flex items-start gap-2.5 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-50/70 border-red-200'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-50/70 border-amber-200'
                      : 'bg-surface-50 border-surface-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SeverityBadge severity={alert.severity}>{alert.severity}</SeverityBadge>
                      <span className="text-xs font-semibold text-surface-800">{alert.alertType}</span>
                    </div>
                    <div className="text-xs text-surface-600 line-clamp-1">{alert.message}</div>
                  </div>
                  <div className="text-2xs text-surface-400 shrink-0 flex items-center gap-1">
                    <Clock size={10} /> {formatRelativeTime(alert.createdAt)}
                  </div>
                </div>
              ))}
              {alerts.filter(a => a.status === 'ACTIVE').length === 0 && (
                <div className="py-6 text-center text-surface-400 text-xs">No active alerts</div>
              )}
            </div>
          )}
        </Card>

        {/* Recent Drilling Events */}
        <Card
          title="Recent Events"
          subtitle="Latest operational events"
          className="bg-white"
          headerAction={
            <button id="dash-events-btn" onClick={() => navigate('/active-well')} className="btn btn-ghost text-xs py-1">
              Active Well
            </button>
          }
        >
          {eventsLoading ? <Loading size="sm" /> : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Depth</th>
                    <th>Severity</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.slice(0, 5).map(event => (
                    <tr key={event.id}>
                      <td>
                        <div className="text-xs font-medium text-surface-800">{getEventTypeLabel(event.eventType)}</div>
                      </td>
                      <td className="font-mono text-xs text-surface-700">{formatDepth(event.depth)}</td>
                      <td><SeverityBadge severity={event.severity}>{event.severity}</SeverityBadge></td>
                      <td className="text-2xs text-surface-400">{formatRelativeTime(event.timestamp)}</td>
                    </tr>
                  ))}
                  {recentEvents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-surface-400 text-xs py-6">
                        No recent events
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
