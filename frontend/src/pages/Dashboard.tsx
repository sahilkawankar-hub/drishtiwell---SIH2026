import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, Activity, Map, Droplets, TrendingUp, ChevronRight, Clock } from 'lucide-react';
import { MetricCard, Card } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage } from '../components/ui/Loading';
import { useActiveWell, useAlerts, useRisks, useWells, useWellEvents } from '../hooks/useApi';
import { formatDepth, formatRelativeTime, getEventTypeLabel } from '../lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const RISK_COLORS: Record<string, string> = {
  MUD_LOSS:        '#0284c7', // petroleum blue
  STUCK_PIPE:      '#dc2626', // critical red
  OVERPRESSURE:    '#ea580c', // orange
  TORQUE_SPIKE:    '#d97706', // amber
  CEMENTING_ISSUE: '#0d9488', // teal
};

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: activeWell, isLoading: wellLoading, error: wellError } = useActiveWell();
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts({ status: 'ACTIVE' });
  const { data: risks = [], isLoading: risksLoading } = useRisks({ status: 'ACTIVE' });
  const { data: wells = [] } = useWells();
  const { data: recentEvents = [], isLoading: eventsLoading } = useWellEvents(activeWell?.id || '');

  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highAlerts = alerts.filter(a => a.severity === 'HIGH').length;
  const nearbyCount = wells.filter(w => w.wellId !== activeWell?.wellId).length;

  // Risk distribution for pie chart
  const riskDistData = risks.reduce((acc: Record<string, number>, r) => {
    acc[r.riskType] = (acc[r.riskType] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(riskDistData).map(([name, value]) => ({
    name: getEventTypeLabel(name),
    value,
    color: RISK_COLORS[name] || '#64748b',
  }));

  // Severity bar data
  const severityData = [
    { name: 'Critical', value: risks.filter(r => r.severity === 'CRITICAL').length, fill: '#dc2626' },
    { name: 'High',     value: risks.filter(r => r.severity === 'HIGH').length,     fill: '#ea580c' },
    { name: 'Medium',   value: risks.filter(r => r.severity === 'MEDIUM').length,   fill: '#d97706' },
    { name: 'Low',      value: risks.filter(r => r.severity === 'LOW').length,      fill: '#16a34a' },
  ];

  if (wellLoading) return <Loading text="Loading NWIS dashboard..." />;
  if (wellError) return <ErrorMessage error={wellError as Error} />;

  const currentFormationName = activeWell?.formations?.find(f => f.isActive)?.formation.name || activeWell?.currentFormation || 'Barail Formation';

  return (
    <div className="space-y-3.5 max-w-[1600px] mx-auto pb-4">
      {/* Subtle Demo Data Notice */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50/80 border border-amber-200/80 rounded-md text-amber-900 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
          <span>
            <strong>DEMO DATA:</strong> Fictional operational data for SIH 2026 prototype evaluation · Field: Duliajan, Upper Assam Basin
          </span>
        </div>
        <span className="text-2xs text-amber-700 font-mono hidden sm:inline">OIL INDIA LIMITED · PS 26121</span>
      </div>

      {/* 1. TOP: Active Well + current depth + formation + status */}
      {activeWell && (
        <div className="card p-4 border-l-4 border-l-primary-600 bg-white shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">
                  Active Well
                </span>
                <span className="text-xs text-surface-500 font-medium">
                  {activeWell.field} · {activeWell.block} · {activeWell.operator}
                </span>
              </div>
              <h2 className="text-xl font-bold text-surface-900 tracking-tight flex items-center gap-2">
                {activeWell.wellName}
                <span className="text-xs font-mono font-normal text-surface-500">({activeWell.wellId})</span>
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-5 sm:gap-7">
              {/* Current Depth */}
              <div className="text-left sm:text-center">
                <div className="text-2xs font-semibold uppercase tracking-wider text-surface-500 mb-0.5">Current Depth</div>
                <div className="text-2xl font-bold font-mono text-surface-900">
                  {formatDepth(activeWell.currentDepth)}
                </div>
              </div>

              {/* Target TD */}
              <div className="text-left sm:text-center">
                <div className="text-2xs font-semibold uppercase tracking-wider text-surface-500 mb-0.5">Target TD</div>
                <div className="text-base font-semibold font-mono text-surface-600">
                  {activeWell.totalDepth ? formatDepth(activeWell.totalDepth) : '—'}
                </div>
              </div>

              {/* Formation */}
              <div className="text-left sm:text-center">
                <div className="text-2xs font-semibold uppercase tracking-wider text-surface-500 mb-0.5">Formation</div>
                <div className="text-sm font-bold text-teal-700">
                  {currentFormationName}
                </div>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-1 items-start sm:items-center">
                <div className="text-2xs font-semibold uppercase tracking-wider text-surface-500 mb-0.5">Status</div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={activeWell.status} />
                  <span className="badge badge-normal">
                    <span className="status-dot-normal" /> Live
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                id="dash-view-well-btn"
                onClick={() => navigate('/active-well')}
                className="btn btn-primary text-xs font-semibold shadow-xs"
              >
                View Well Details <ChevronRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. THEN: 6 METRIC CARDS IN SPECIFIED ORDER:
          Nearby Wells, Active Alerts, Active Risks, Current Depth, Drilling Status, Progress */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          label="Nearby Wells"
          value={nearbyCount}
          sub="Within Duliajan field"
          icon={<Map size={18} />}
          color="#0284c7"
          onClick={() => navigate('/nearby-wells')}
        />
        <MetricCard
          label="Active Alerts"
          value={alerts.filter(a => a.status === 'ACTIVE').length}
          sub={`${criticalAlerts} critical, ${highAlerts} high`}
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
          label="Current Depth"
          value={activeWell ? formatDepth(activeWell.currentDepth) : '—'}
          sub={`MD · ${currentFormationName}`}
          icon={<Droplets size={18} />}
          color="#0d9488"
        />
        <MetricCard
          label="Drilling Status"
          value={activeWell?.status || '—'}
          sub={`${activeWell?.wellType || 'Vertical'} well`}
          icon={<Activity size={18} />}
          color="#16a34a"
        />
        <MetricCard
          label="Progress"
          value={activeWell?.totalDepth
            ? `${((activeWell.currentDepth / activeWell.totalDepth) * 100).toFixed(0)}%`
            : '—'}
          sub={`${activeWell?.totalDepth ? formatDepth(activeWell.totalDepth - activeWell.currentDepth) : '—'} to TD`}
          icon={<TrendingUp size={18} />}
          color="#0284c7"
        />
      </div>

      {/* 3. THEN: Risk overview, Active alerts, Recent drilling events */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
        {/* Risk Overview */}
        <Card
          title="Risk Overview"
          subtitle="Active risk distribution by type and severity"
          className="bg-white"
        >
          {risksLoading ? <Loading size="sm" /> : (
            <div className="space-y-3">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        color: '#0f172a'
                      }}
                      itemStyle={{ color: '#0f172a' }}
                    />
                    <Legend
                      iconSize={8}
                      formatter={(value) => <span style={{ color: '#334155', fontSize: '11px', fontWeight: 500 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="py-8 text-center text-surface-500 text-xs">No active risks detected</div>
              )}

              {/* Severity breakdown bars */}
              <div className="pt-2 border-t border-surface-100 space-y-1.5">
                {severityData.map(item => (
                  <div key={item.name} className="flex items-center gap-2">
                    <span className="text-2xs font-medium text-surface-600 w-14">{item.name}</span>
                    <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${risks.length > 0 ? (item.value / risks.length) * 100 : 0}%`,
                          backgroundColor: item.fill,
                        }}
                      />
                    </div>
                    <span className="text-2xs font-mono font-semibold text-surface-700 w-5 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Active Alerts */}
        <Card
          title="Active Alerts"
          subtitle={`${alerts.filter(a => a.status === 'ACTIVE').length} operational alerts requiring review`}
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
                      ? 'bg-red-50/70 border-red-200 text-red-900'
                      : alert.severity === 'HIGH'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                      : alert.severity === 'WARNING'
                      ? 'bg-amber-50/50 border-amber-200 text-amber-800'
                      : 'bg-blue-50/70 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SeverityBadge severity={alert.severity}>{alert.severity}</SeverityBadge>
                      <span className="text-xs font-bold text-surface-900">{alert.alertType}</span>
                    </div>
                    <div className="text-xs text-surface-700 line-clamp-2 leading-relaxed">{alert.message}</div>
                    {alert.depth && (
                      <div className="text-2xs text-surface-500 font-medium mt-1">
                        Depth: <span className="font-mono text-surface-800 font-semibold">{formatDepth(alert.depth)}</span> · {alert.formation}
                      </div>
                    )}
                  </div>
                  <div className="text-2xs text-surface-500 font-medium shrink-0 flex items-center gap-1">
                    <Clock size={11} /> {formatRelativeTime(alert.createdAt)}
                  </div>
                </div>
              ))}
              {alerts.filter(a => a.status === 'ACTIVE').length === 0 && (
                <div className="py-8 text-center text-surface-500 text-xs">No active alerts at this time</div>
              )}
            </div>
          )}
        </Card>

        {/* Recent Drilling Events */}
        <Card
          title="Recent Drilling Events"
          subtitle="Operational events logged on active well"
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
                        <div className="font-medium text-surface-900 text-xs">{getEventTypeLabel(event.eventType)}</div>
                        <div className="text-2xs text-surface-500 truncate max-w-[130px]">{event.description}</div>
                      </td>
                      <td className="font-mono font-medium text-surface-800 text-xs">{formatDepth(event.depth)}</td>
                      <td><SeverityBadge severity={event.severity}>{event.severity}</SeverityBadge></td>
                      <td className="text-2xs text-surface-500">{formatRelativeTime(event.timestamp)}</td>
                    </tr>
                  ))}
                  {recentEvents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-surface-500 text-xs py-6">
                        No recent drilling events recorded
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
