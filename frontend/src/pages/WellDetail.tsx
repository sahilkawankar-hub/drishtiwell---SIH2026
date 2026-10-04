import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, Activity,
  Layers, FileText, Clock, Navigation,
} from 'lucide-react';
import { useWellById, useWellEvents, useWellParameters } from '../hooks/useApi';
import { Card, MetricCard } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import {
  formatDepth, formatDate, formatDateTime, getEventTypeLabel,
  getSeverityTextColor, clsx,
} from '../lib/utils';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from 'recharts';

export default function WellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: well, isLoading, error, refetch } = useWellById(id || '');
  const { data: events = [] } = useWellEvents(id || '');
  const { data: params = [] } = useWellParameters(id || '', 48);

  if (isLoading) return <Loading text="Loading well profile..." />;
  if (error || !well) {
    return (
      <div className="space-y-3 max-w-[1600px] mx-auto pb-4">
        <button onClick={() => navigate(-1)} className="btn btn-ghost text-xs">
          <ArrowLeft size={14} /> Back
        </button>
        <ErrorMessage error={(error as Error) || new Error('Well not found')} retry={refetch} />
      </div>
    );
  }

  const chartData = [...params].reverse().map((p) => ({
    depth: p.depth.toFixed(0),
    rop: p.rop ?? null,
    wob: p.wob ?? null,
    torque: p.torque ?? null,
    ecd: p.ecd ?? null,
  }));

  const sortedFormations = [...(well.formations ?? [])].sort(
    (a, b) => a.topDepth - b.topDepth
  );
  const activeFormation = sortedFormations.find((f) => f.isActive);
  const riskEvents = well.riskEvents ?? [];
  const docs = well.historicalDocuments ?? [];

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="btn btn-ghost text-xs">
        <ArrowLeft size={14} /> Back to Wells
      </button>

      {/* ── Well Header ─────────────────────────────────────────────────── */}
      <div
        className="card p-4 border-l-4 bg-white shadow-sm"
        style={{ borderLeftColor: well.isActive ? '#0d9488' : '#0284c7' }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="text-2xs text-surface-500 font-bold uppercase tracking-wider mb-1">Well Operational Profile</div>
            <div className="text-surface-900 text-2xl font-bold">{well.wellName}</div>
            <div className="text-surface-500 text-xs mt-0.5">
              {well.wellId} · {well.field} · {well.block} · {well.wellType} · {well.operator}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={well.status} />
            {well.isActive && (
              <span className="badge badge-normal">
                <span className="status-dot-normal animate-pulse" /> Active Well
              </span>
            )}
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-surface-100">
          {[
            { label: 'Current Depth', value: formatDepth(well.currentDepth), mono: true, accent: true },
            { label: 'Total Depth', value: well.totalDepth ? formatDepth(well.totalDepth) : '—', mono: true },
            { label: 'Spud Date', value: well.spudDate ? formatDate(well.spudDate) : '—' },
            { label: 'Completion Date', value: well.completionDate ? formatDate(well.completionDate) : 'Ongoing' },
            { label: 'Target Formation', value: well.targetFormation ?? '—' },
            {
              label: 'Current Formation',
              value: activeFormation?.formation.name ?? well.currentFormation ?? '—',
              accent: true,
            },
            {
              label: 'Coordinates',
              value: `${well.latitude.toFixed(5)}°N, ${well.longitude.toFixed(5)}°E`,
              mono: true,
            },
            { label: 'Field Operator', value: well.operator },
          ].map(({ label, value, mono, accent }) => (
            <div key={label}>
              <div className="text-2xs font-semibold text-surface-400 uppercase tracking-wider">{label}</div>
              <div
                className={clsx(
                  'mt-0.5 text-xs font-semibold',
                  mono ? 'font-mono' : '',
                  accent ? 'text-teal-700 font-bold' : 'text-surface-800'
                )}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Key Metrics ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Drilling Events"
          value={well._count?.drillingEvents ?? 0}
          icon={<Clock size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Active Risk Incidents"
          value={riskEvents.filter((r) => r.status === 'ACTIVE').length}
          icon={<AlertTriangle size={18} />}
          color={riskEvents.some((r) => r.severity === 'CRITICAL') ? '#dc2626' : '#ea580c'}
        />
        <MetricCard
          label="Active Alerts"
          value={well._count?.alerts ?? 0}
          icon={<Activity size={18} />}
          color="#d97706"
        />
        <MetricCard
          label="Historical Documents"
          value={docs.length}
          icon={<FileText size={18} />}
          color="#0d9488"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Formation Column ─────────────────────────────────────────── */}
        {sortedFormations.length > 0 && (
          <Card title="Formation Column" subtitle={`${sortedFormations.length} formations penetrated`} className="bg-white">
            <div className="space-y-1.5">
              {sortedFormations.map((wf) => (
                <div
                  key={wf.id}
                  className={clsx(
                    'flex items-center gap-2 p-2 rounded text-xs border',
                    wf.isActive
                      ? 'bg-teal-50 border-teal-200'
                      : 'bg-surface-50 border-surface-200'
                  )}
                >
                  <div
                    className="w-2 h-6 rounded-full shrink-0"
                    style={{
                      background: wf.isActive ? '#0d9488' : '#94a3b8',
                    }}
                  />
                  <div className="min-w-0">
                    <div className="font-bold text-surface-900 truncate">{wf.formation.name}</div>
                    <div className="text-2xs text-surface-500 font-mono">
                      {wf.topDepth}–{wf.bottomDepth}m · {wf.formation.lithology ?? 'Unknown'}
                    </div>
                  </div>
                  {wf.isActive && (
                    <span className="badge badge-normal text-2xs ml-auto shrink-0">Active</span>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Risk Events ──────────────────────────────────────────────── */}
        <Card
          title="Risk Events"
          subtitle={`${riskEvents.length} total · ${riskEvents.filter((r) => r.status === 'ACTIVE').length} active`}
          className="bg-white"
        >
          {riskEvents.length === 0 ? (
            <EmptyState message="No risk events recorded for this well" />
          ) : (
            <div className="space-y-2">
              {riskEvents.map((rv) => (
                <div
                  key={rv.id}
                  className={clsx(
                    'p-2.5 rounded border text-xs',
                    rv.status === 'ACTIVE' && rv.severity === 'CRITICAL'
                      ? 'bg-red-50 border-red-200'
                      : rv.status === 'ACTIVE' && rv.severity === 'HIGH'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-surface-50 border-surface-200'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-surface-900">{getEventTypeLabel(rv.riskType)}</span>
                    <div className="flex items-center gap-1">
                      <SeverityBadge severity={rv.severity} showDot>{rv.severity}</SeverityBadge>
                      <StatusBadge status={rv.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-2xs text-surface-500">
                    <span><Navigation size={9} className="inline mr-0.5" />{formatDepth(rv.depth)}</span>
                    <span>P: <span className="font-mono text-surface-800 font-bold">{(rv.probability * 100).toFixed(0)}%</span></span>
                    <span className="ml-auto">{formatDate(rv.detectedAt)}</span>
                  </div>
                  {rv.mitigation && (
                    <div className="text-2xs text-surface-700 mt-1 border-t border-surface-200 pt-1 font-medium">
                      Mitigation: {rv.mitigation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── Historical Documents ─────────────────────────────────────── */}
        <Card
          title="Historical Documents"
          subtitle={`${docs.length} document${docs.length !== 1 ? 's' : ''} available`}
          className="bg-white"
        >
          {docs.length === 0 ? (
            <EmptyState message="No documents uploaded for this well" />
          ) : (
            <div className="space-y-1.5">
              {docs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 bg-surface-50 border border-surface-200 rounded p-2 text-xs">
                  <FileText size={14} className="text-primary-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-surface-900 truncate">{doc.title}</div>
                    <div className="text-2xs text-surface-500">
                      {doc.documentType} · {formatDate(doc.uploadedAt)}
                    </div>
                  </div>
                  <StatusBadge status={doc.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── Drilling Parameter Chart ─────────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card title="Drilling Parameters Trend" subtitle="Real-time parameter curve vs depth" className="bg-white">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="depth"
                tick={{ fill: '#64748b', fontSize: 10 }}
                label={{ value: 'Depth (m)', fill: '#64748b', fontSize: 10, position: 'insideBottom', offset: -4 }}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#0f172a'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="rop" stroke="#0d9488" dot={false} strokeWidth={2} name="ROP (m/hr)" />
              <Line type="monotone" dataKey="torque" stroke="#d97706" dot={false} strokeWidth={2} name="Torque (kN.m)" />
              <Line type="monotone" dataKey="wob" stroke="#0284c7" dot={false} strokeWidth={1.5} name="WOB (t)" />
              <Line type="monotone" dataKey="ecd" stroke="#7c3aed" dot={false} strokeWidth={1.5} name="ECD (g/cc)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* ── Drilling Events Table ────────────────────────────────────────── */}
      <Card
        title="Drilling Events Log"
        subtitle={`${events.length} events recorded`}
        className="bg-white"
        headerAction={
          <div className="flex items-center gap-1 text-2xs text-surface-500 font-medium">
            <Layers size={11} />
            <span>Sorted by depth</span>
          </div>
        }
      >
        {events.length === 0 ? (
          <EmptyState message="No events recorded for this well" />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Depth</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Cause</th>
                  <th>NPT (hrs)</th>
                  <th>Formation</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td>
                      <span className={clsx('font-bold text-xs', getSeverityTextColor(ev.severity))}>
                        {getEventTypeLabel(ev.eventType)}
                      </span>
                    </td>
                    <td className="font-mono text-surface-800 text-xs">{formatDepth(ev.depth)}</td>
                    <td>
                      <SeverityBadge severity={ev.severity} showDot>
                        {ev.severity}
                      </SeverityBadge>
                    </td>
                    <td className="max-w-xs">
                      <div className="truncate text-surface-700 text-xs">{ev.description}</div>
                    </td>
                    <td className="max-w-xs">
                      <div className="truncate text-surface-500 text-xs">{ev.cause ?? '—'}</div>
                    </td>
                    <td className="font-mono text-center text-xs">
                      {ev.nptHours != null ? (
                        <span className={ev.nptHours > 10 ? 'text-status-high font-bold' : 'text-surface-700'}>
                          {ev.nptHours}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="text-xs text-surface-700 font-medium">{ev.formation?.name ?? '—'}</td>
                    <td className="text-surface-500 whitespace-nowrap text-2xs">
                      {formatDateTime(ev.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
