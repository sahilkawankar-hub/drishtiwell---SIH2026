import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Gauge, Thermometer, RefreshCw, Crosshair,
  ArrowDown, ArrowUp, Shield, Eye, MapPin, Layers, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage } from '../components/ui/Loading';
import {
  useActiveWell, useWellEvents, useWellParameters, useAlerts,
  useActiveWellIntelligence,
} from '../hooks/useApi';
import {
  formatDepth, formatNumber, formatRelativeTime, formatDateTime,
  getEventTypeLabel, getSeverityTextColor,
} from '../lib/utils';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import type { AssessedRisk, OffsetWellScore } from '../types';

export default function ActiveWellPage() {
  const navigate = useNavigate();
  const { data: well, isLoading, error, refetch } = useActiveWell();

  const wellId = well?.id || '';
  const { data: events = [] } = useWellEvents(wellId);
  const { data: params = [] } = useWellParameters(wellId, 48);
  const { data: alerts = [] } = useAlerts({ wellId, status: 'ACTIVE' });

  // ─── Depth Simulator ──────────────────────────────────────────────────
  const [depthOverride, setDepthOverride] = useState<number | null>(null);
  const currentDepth = depthOverride ?? well?.currentDepth ?? 0;

  // ─── Intelligence ─────────────────────────────────────────────────────
  const intelligenceOptions = useMemo(() => {
    if (depthOverride !== null) {
      return { depth: depthOverride };
    }
    return undefined;
  }, [depthOverride]);

  const {
    data: intelligence,
    isLoading: intelLoading,
    refetch: refetchIntel,
  } = useActiveWellIntelligence(wellId || undefined, intelligenceOptions);

  // ─── Expand states ────────────────────────────────────────────────────
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [showAllOffsets, setShowAllOffsets] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);

  if (isLoading) return <Loading text="Loading active well data..." />;
  if (error || !well) return <ErrorMessage error={error as Error || new Error('Active well not found')} retry={refetch} />;

  // Latest parameters
  const latestParam = well.drillingParameters?.[0] || params[0];

  // Parameter time series for charts
  const chartData = [...params].reverse().slice(-24).map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    depth: p.depth,
    torque: p.torque,
    rop: p.rop,
    wob: p.wob,
    spp: p.standpipePressure,
    mw: p.mudWeight,
  }));

  const currentFormation = well.formations?.find(f => f.isActive)?.formation;

  // Intelligence data
  const risks = intelligence?.riskAssessment?.risks ?? [];
  const offsetWells = intelligence?.offsetWells ?? [];
  const relevantEvents = intelligence?.allRelevantEvents ?? [];
  const intelFormationName = intelligence?.activeWell?.currentFormationName;

  const displayedOffsets = showAllOffsets ? offsetWells : offsetWells.slice(0, 5);
  const displayedEvents = showAllEvents ? relevantEvents : relevantEvents.slice(0, 6);

  // Critical alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-6">
      {/* ─── 1. ACTIVE WELL HEADER ────────────────────────────────────────── */}
      <div className="card p-4 border-l-4 border-l-teal-600 bg-white shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Active Well Intelligence
              </span>
              <span className="text-xs text-surface-500 font-medium">
                {well.field} · {well.block} · {well.operator}
              </span>
            </div>
            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl font-bold text-surface-900 tracking-tight">{well.wellName}</h1>
              <span className="text-xs font-mono text-surface-500">{well.wellId}</span>
              <span className="text-xs font-medium text-surface-600">· {well.wellType} Well</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1 bg-surface-50 rounded-md border border-surface-200">
              <span className="status-dot-normal animate-pulse" />
              <StatusBadge status={well.status} />
            </div>
            <button
              id="active-well-refresh-btn"
              onClick={() => { refetch(); refetchIntel(); }}
              className="btn btn-ghost text-xs"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Panel (Clear light red alert panel, not a dark block) */}
      {criticalAlerts.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5 text-status-critical">
            <AlertTriangle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-900 mb-0.5">
              {criticalAlerts.length} Critical Alert(s) Active on Well
            </div>
            <div className="space-y-1">
              {criticalAlerts.map(a => (
                <div key={a.id} className="text-xs text-red-800 leading-relaxed">
                  • <strong>{a.alertType}:</strong> {a.message}
                </div>
              ))}
            </div>
          </div>
          <button
            id="active-view-alerts-btn"
            onClick={() => navigate('/alerts')}
            className="btn btn-danger text-xs self-start shrink-0"
          >
            Review Alerts
          </button>
        </div>
      )}

      {/* ─── 2. CURRENT DRILLING STATUS ──────────────────────────────────── */}
      {latestParam && (
        <Card
          title="Current Drilling Status & Real-Time Telemetry"
          subtitle={`Surface sensors & telemetry as of ${formatDateTime(latestParam.timestamp)}`}
          className="bg-white"
        >
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
            {[
              { label: 'WOB', value: latestParam.wob, unit: 't', warn: 20, crit: 25 },
              { label: 'RPM', value: latestParam.rpm, unit: 'rpm', warn: 100, crit: 120 },
              { label: 'Torque', value: latestParam.torque, unit: 'kN.m', warn: 20, crit: 25 },
              { label: 'ROP', value: latestParam.rop, unit: 'm/hr', warn: null, crit: null },
              { label: 'MW', value: latestParam.mudWeight, unit: 'g/cc', warn: 1.42, crit: 1.45 },
              { label: 'SPP', value: latestParam.standpipePressure, unit: 'bar', warn: 280, crit: 310 },
              { label: 'Flow Rate', value: latestParam.flowRate, unit: 'L/min', warn: null, crit: null },
              { label: 'Hook Load', value: latestParam.hookLoad, unit: 't', warn: null, crit: null },
              { label: 'ECD', value: latestParam.ecd, unit: 'g/cc', warn: 1.43, crit: 1.46 },
            ].map(param => {
              const val = param.value ?? null;
              const isWarn = param.warn !== null && val !== null && val > param.warn!;
              const isCrit = param.crit !== null && val !== null && val > param.crit!;
              const valueColor = isCrit ? 'text-status-critical' : isWarn ? 'text-status-warning' : 'text-surface-900';
              const cardBg = isCrit ? 'bg-red-50/60 border-red-200' : isWarn ? 'bg-amber-50/60 border-amber-200' : 'bg-surface-50 border-surface-200';

              return (
                <div key={param.label} className={`p-2.5 rounded-lg border text-center ${cardBg}`}>
                  <div className="text-2xs font-bold text-surface-500 uppercase tracking-wider mb-0.5">{param.label}</div>
                  <div className={`text-lg font-bold font-mono ${valueColor}`}>
                    {val !== null ? formatNumber(val) : '—'}
                  </div>
                  <div className="text-2xs font-medium text-surface-400">{param.unit}</div>
                  {isCrit ? (
                    <span className="inline-block mt-0.5 px-1 py-0.2 text-3xs font-bold bg-red-100 text-red-800 rounded">
                      Critical
                    </span>
                  ) : isWarn ? (
                    <span className="inline-block mt-0.5 px-1 py-0.2 text-3xs font-bold bg-amber-100 text-amber-800 rounded">
                      Elevated
                    </span>
                  ) : (
                    <span className="inline-block mt-0.5 text-3xs text-surface-400">Normal</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Real-time parameter charts */}
          {chartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-surface-100">
              <div className="p-2 bg-surface-50/60 rounded-md border border-surface-200">
                <div className="text-2xs font-bold uppercase tracking-wider text-surface-600 mb-1 flex items-center justify-between">
                  <span>Torque Trend (Last 24 readings)</span>
                  <span className="text-amber-700 font-mono text-2xs">Warn &gt; 20 kN.m</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
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
                    <ReferenceLine y={20} stroke="#d97706" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="torque" stroke="#d97706" strokeWidth={2} dot={false} name="Torque (kN.m)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="p-2 bg-surface-50/60 rounded-md border border-surface-200">
                <div className="text-2xs font-bold uppercase tracking-wider text-surface-600 mb-1 flex items-center justify-between">
                  <span>ROP Trend (Rate of Penetration)</span>
                  <span className="text-teal-700 font-mono text-2xs">Live ROP</span>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
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
                    <Line type="monotone" dataKey="rop" stroke="#0d9488" strokeWidth={2} dot={false} name="ROP (m/hr)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ─── 3. DEPTH + FORMATION + OFFSET WELLS + RISK (METRICS) ────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Current Depth (MD)"
          value={<span className="text-surface-900 font-bold">{formatDepth(currentDepth)}</span>}
          sub={`Target TD: ${well.totalDepth ? formatDepth(well.totalDepth) : 'TBD'}`}
          icon={<Gauge size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Current Formation"
          value={<span className="text-teal-700 font-bold text-base">{intelFormationName || currentFormation?.name || well.currentFormation || 'Barail Formation'}</span>}
          sub={currentFormation?.ageEra || 'Upper Assam Basin'}
          icon={<Thermometer size={18} />}
          color="#0d9488"
        />
        <MetricCard
          label="Offset Wells Analyzed"
          value={intelligence?.summary?.totalOffsetWells ?? '8'}
          sub={intelligence ? `Nearest: ${intelligence.summary.nearestWellKm.toFixed(1)} km` : 'Duliajan operational field'}
          icon={<MapPin size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Computed Risk Level"
          value={
            <span className={getSeverityTextColor(intelligence?.riskAssessment?.overallRiskLevel ?? 'LOW')}>
              {intelligence?.riskAssessment?.overallRiskLevel ?? 'MODERATE'}
            </span>
          }
          sub={`${risks.length} active risk types · ${intelligence?.summary?.totalRelevantEvents ?? 0} events`}
          icon={<Shield size={18} />}
          color={risks.some(r => r.severity === 'CRITICAL') ? '#dc2626' : risks.some(r => r.severity === 'HIGH') ? '#ea580c' : '#d97706'}
          onClick={() => navigate('/risk-intelligence')}
        />
      </div>

      {/* ─── 4. DEPTH SIMULATOR ─────────────────────────────────────────── */}
      <Card
        title="Depth Simulator & Look-Ahead Engine"
        subtitle="Simulate target depth to dynamically recalculate risks, formation boundaries, and offset well incidents"
        className="bg-white"
        headerAction={
          depthOverride !== null && (
            <button
              className="btn btn-ghost text-xs"
              onClick={() => setDepthOverride(null)}
            >
              Reset to Live ({formatDepth(well.currentDepth)})
            </button>
          )
        }
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Crosshair size={16} className="text-primary-600" />
            <span className="text-xs font-semibold text-surface-700">Simulated Depth:</span>
          </div>

          <div className="flex-1 flex items-center gap-3">
            <input
              id="depth-simulator-slider"
              type="range"
              min={0}
              max={well.totalDepth ?? 4000}
              step={10}
              value={currentDepth}
              onChange={(e) => setDepthOverride(Number(e.target.value))}
              className="flex-1 accent-primary-600 h-2 bg-surface-200 rounded-lg cursor-pointer"
            />
            <div className="flex items-center gap-1 shrink-0">
              <input
                id="depth-simulator-input"
                type="number"
                value={currentDepth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!isNaN(val) && val >= 0) setDepthOverride(val);
                }}
                className="form-input w-24 text-center font-mono font-bold text-sm py-1"
              />
              <span className="text-surface-500 text-xs font-semibold">m</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <button
              className="btn btn-ghost px-2.5 py-1 text-xs"
              onClick={() => setDepthOverride(Math.max(0, currentDepth - 50))}
              title="Step back 50m"
            >
              <ArrowUp size={13} /> −50m
            </button>
            <button
              className="btn btn-ghost px-2.5 py-1 text-xs"
              onClick={() => setDepthOverride(currentDepth + 50)}
              title="Step forward 50m"
            >
              <ArrowDown size={13} /> +50m
            </button>
          </div>
        </div>

        {depthOverride !== null && (
          <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-center justify-between">
            <span>
              ⚡ Simulation Mode Active: <strong>{formatDepth(depthOverride)}</strong> (Live well depth: {formatDepth(well.currentDepth)})
            </span>
            <span className="text-2xs text-amber-700 font-mono">Look-ahead intelligence active</span>
          </div>
        )}
      </Card>

      {/* ─── 5. RISK ASSESSMENT ─────────────────────────────────────────── */}
      <Card
        title="Risk Assessment & Multi-Well Evidence"
        subtitle={`${risks.length} calculated operational risk(s) at depth ${formatDepth(currentDepth)} from ${offsetWells.length} offset wells`}
        className="bg-white"
      >
        {intelLoading && risks.length === 0 ? (
          <div className="py-8 text-center text-surface-500 text-xs">
            <div className="animate-pulse">Computing multi-well spatial risk scores...</div>
          </div>
        ) : risks.length === 0 ? (
          <div className="py-6 text-center text-surface-500 text-xs">
            No high-probability risks identified for the current depth horizon.
          </div>
        ) : (
          <div className="space-y-3">
            {risks.map((risk) => (
              <RiskCard
                key={risk.riskType}
                risk={risk}
                isExpanded={expandedRisk === risk.riskType}
                onToggle={() => setExpandedRisk(expandedRisk === risk.riskType ? null : risk.riskType)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* ─── 6. HISTORICAL EVIDENCE (Events Near Current Depth) ─────────── */}
      {relevantEvents.length > 0 && (
        <Card
          title="Historical Evidence Near Current Depth"
          subtitle={`${relevantEvents.length} historical offset event(s) recorded within ±${intelligence?.depthWindow ?? 150}m of ${formatDepth(currentDepth)}`}
          className="bg-white"
          headerAction={
            relevantEvents.length > 6 && (
              <button
                className="btn btn-ghost text-xs py-1"
                onClick={() => setShowAllEvents(!showAllEvents)}
              >
                {showAllEvents ? 'Show Less' : `Show All (${relevantEvents.length})`}
              </button>
            )
          }
        >
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source Offset Well</th>
                  <th>Event Type</th>
                  <th>Event Depth</th>
                  <th>Depth Delta</th>
                  <th>Severity</th>
                  <th>Incident Description</th>
                  <th>NPT (hrs)</th>
                </tr>
              </thead>
              <tbody>
                {displayedEvents.map(event => (
                  <tr key={event.id}>
                    <td className="font-semibold text-primary-700 text-xs">{event.wellName}</td>
                    <td className="font-medium text-surface-900 text-xs">{getEventTypeLabel(event.eventType)}</td>
                    <td className="font-mono text-surface-800 text-xs">{formatDepth(event.depth)}</td>
                    <td className="font-mono text-xs">
                      <span className={Math.abs(event.depthDelta) <= 50 ? 'text-status-critical font-bold' : Math.abs(event.depthDelta) <= 100 ? 'text-status-warning font-semibold' : 'text-surface-600'}>
                        {event.depthDelta >= 0 ? '+' : ''}{event.depthDelta}m
                      </span>
                    </td>
                    <td><SeverityBadge severity={event.severity}>{event.severity}</SeverityBadge></td>
                    <td className="max-w-md truncate text-surface-600 text-xs">{event.description}</td>
                    <td className="font-mono text-surface-700 text-xs">{event.nptHours ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── 7. RECOMMENDATION & OFFSET BENCHMARKING ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recommendation Panel */}
        <Card
          title="AI & Engineering Recommendations"
          subtitle="Proactive drilling advisory based on offset evidence"
          className="xl:col-span-2 bg-white"
        >
          <div className="space-y-3">
            {risks.slice(0, 3).map((r, i) => (
              <div key={r.riskType} className="p-3 rounded-lg border border-surface-200 bg-surface-50/70">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold text-surface-900">{r.riskLabel} Mitigation Advisory</span>
                  <SeverityBadge severity={r.severity}>{r.severity}</SeverityBadge>
                  <span className="ml-auto text-2xs font-mono text-surface-500">Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xs text-surface-700 leading-relaxed bg-white p-2.5 rounded border border-surface-200">
                  <strong className="text-teal-800">Action Plan: </strong>
                  {r.recommendedAction}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-2xs text-surface-500">
                  <span className="font-medium text-surface-600">Based on {r.eventCount} incident(s) from {r.sourceWells.length} offset well(s):</span>
                  <span>{r.sourceWells.map(s => s.wellName).slice(0, 3).join(', ')}</span>
                </div>
              </div>
            ))}

            {risks.length === 0 && (
              <div className="p-4 text-center text-surface-500 text-xs">
                Drilling parameters are within standard operating envelope for current depth.
              </div>
            )}
          </div>
        </Card>

        {/* Offset Wells Similarity List */}
        <Card
          title="Top Offset Wells"
          subtitle={`${offsetWells.length} wells ranked by geological & spatial proximity`}
          className="bg-white"
          headerAction={
            offsetWells.length > 5 && (
              <button
                className="btn btn-ghost text-xs py-1"
                onClick={() => setShowAllOffsets(!showAllOffsets)}
              >
                {showAllOffsets ? 'Less' : `All (${offsetWells.length})`}
              </button>
            )
          }
        >
          <div className="space-y-2">
            {displayedOffsets.map((offset) => (
              <OffsetWellRow
                key={offset.well.id}
                offset={offset}
                onNavigate={() => navigate(`/wells/${offset.well.id}`)}
              />
            ))}
          </div>
        </Card>
      </div>

      {/* Formation Profile & Recent Well Events */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Formation Column */}
        {well.formations && well.formations.length > 0 && (
          <Card title="Formation Column (Lithology Depth Log)" subtitle="Stratigraphic sequence for active well" className="bg-white">
            <div className="space-y-1.5">
              {[...well.formations].sort((a, b) => a.topDepth - b.topDepth).map(wf => {
                const isCurrentInSim = currentDepth >= wf.topDepth && currentDepth <= wf.bottomDepth;
                return (
                  <div
                    key={wf.id}
                    className={`flex items-center gap-3 p-2 rounded-md border transition-colors ${
                      isCurrentInSim
                        ? 'bg-teal-50 border-teal-300 shadow-xs'
                        : 'bg-surface-50 border-surface-200'
                    }`}
                  >
                    <div className="text-xs font-mono font-medium text-surface-600 w-24 text-right">
                      {wf.topDepth}–{wf.bottomDepth}m
                    </div>
                    <div
                      className="w-3.5 h-3.5 rounded-sm shrink-0"
                      style={{ backgroundColor: getFormationColor(wf.formation.code) }}
                    />
                    <div className="flex-1 text-xs font-semibold text-surface-800">
                      {wf.formation.name}
                    </div>
                    {isCurrentInSim && (
                      <span className="badge badge-normal text-2xs">
                        Active Formation
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Recent Events Log */}
        <Card title="Active Well Operational Events" subtitle="Latest drilling events recorded" className="bg-white">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event Type</th>
                  <th>Depth</th>
                  <th>Severity</th>
                  <th>Description</th>
                  <th>Logged</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 6).map(event => (
                  <tr key={event.id}>
                    <td className="font-semibold text-surface-900 text-xs">{getEventTypeLabel(event.eventType)}</td>
                    <td className="font-mono text-surface-800 text-xs">{formatDepth(event.depth)}</td>
                    <td><SeverityBadge severity={event.severity}>{event.severity}</SeverityBadge></td>
                    <td className="max-w-xs truncate text-surface-600 text-xs">{event.description}</td>
                    <td className="text-surface-500 text-2xs">{formatRelativeTime(event.timestamp)}</td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-surface-500 text-xs py-4">No events recorded</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── Risk Card Component ─────────────────────────────────────────────────────

function RiskCard({ risk, isExpanded, onToggle }: {
  risk: AssessedRisk;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const severityStyles: Record<string, { card: string; score: string }> = {
    CRITICAL: { card: 'border-red-200 bg-red-50/50', score: '#dc2626' },
    HIGH:     { card: 'border-amber-200 bg-amber-50/40', score: '#ea580c' },
    MEDIUM:   { card: 'border-amber-200 bg-amber-50/30', score: '#d97706' },
    LOW:      { card: 'border-surface-200 bg-surface-50', score: '#16a34a' },
  };

  const currentStyle = severityStyles[risk.severity] ?? severityStyles.LOW;

  return (
    <div className={`rounded-lg border p-3 transition-all ${currentStyle.card}`}>
      {/* Header */}
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-12 h-12 bg-white rounded-md border border-surface-200 shadow-2xs">
            <div className="text-xl font-bold font-mono leading-none" style={{ color: currentStyle.score }}>
              {risk.riskScore}
            </div>
            <div className="text-3xs font-semibold text-surface-400 uppercase mt-0.5">Risk</div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-surface-900">{risk.riskLabel}</span>
              <SeverityBadge severity={risk.severity}>{risk.severity}</SeverityBadge>
            </div>
            <div className="text-xs text-surface-600 mt-0.5 max-w-xl">
              {risk.detectionReason}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-2xs text-surface-400 font-semibold uppercase">Confidence</div>
            <div className="text-xs font-mono font-bold text-surface-800">{Math.round(risk.confidence * 100)}%</div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-2xs text-surface-400 font-semibold uppercase">Incidents</div>
            <div className="text-xs font-mono font-bold text-surface-800">{risk.eventCount}</div>
          </div>
          <button className="p-1 rounded hover:bg-surface-200/60 text-surface-500">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-surface-200/80 space-y-3">
          {/* Evidence */}
          <div>
            <div className="text-2xs text-surface-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Eye size={12} className="text-primary-600" /> Multi-Well Historical Evidence
            </div>
            <ul className="space-y-1">
              {risk.evidence.map((e, i) => (
                <li key={i} className="text-xs text-surface-700 flex items-start gap-2 bg-white/70 p-1.5 rounded border border-surface-200">
                  <span className="text-primary-600 font-bold mt-0.5">•</span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Source Wells */}
          <div>
            <div className="text-2xs text-surface-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Layers size={12} className="text-primary-600" /> Correlated Offset Wells
            </div>
            <div className="flex flex-wrap gap-2">
              {risk.sourceWells.map((sw) => (
                <span key={sw.wellId} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-surface-200 text-xs text-surface-800 shadow-2xs font-medium">
                  <MapPin size={11} className="text-primary-600" />
                  {sw.wellName} · {sw.distanceKm.toFixed(1)} km · {formatDepth(sw.eventDepth)}
                  <SeverityBadge severity={sw.eventSeverity}>{sw.eventSeverity}</SeverityBadge>
                </span>
              ))}
            </div>
          </div>

          {/* Recommended Action */}
          <div>
            <div className="text-2xs text-teal-800 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Shield size={12} className="text-teal-700" /> Recommended Engineering Mitigation
            </div>
            <div className="text-xs text-teal-900 bg-teal-50 border border-teal-200 rounded-md p-2.5 font-medium leading-relaxed">
              {risk.recommendedAction}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Offset Well Row ─────────────────────────────────────────────────────────

function OffsetWellRow({ offset, onNavigate }: { offset: OffsetWellScore; onNavigate: () => void }) {
  const scoreColor = offset.similarityScore >= 70 ? 'text-teal-700' : offset.similarityScore >= 40 ? 'text-amber-700' : 'text-surface-600';

  return (
    <div
      className="flex items-center gap-2.5 p-2 rounded-md bg-surface-50 hover:bg-surface-100 border border-surface-200 transition-colors cursor-pointer"
      onClick={onNavigate}
    >
      {/* Score */}
      <div className="flex flex-col items-center justify-center w-10 h-10 bg-white rounded border border-surface-200 shrink-0">
        <div className={`text-sm font-bold font-mono ${scoreColor}`}>
          {offset.similarityScore}
        </div>
        <div className="text-3xs text-surface-400 font-semibold uppercase">match</div>
      </div>

      {/* Well info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-surface-900 truncate">{offset.well.wellName}</span>
          <StatusBadge status={offset.well.status} />
        </div>
        <div className="text-2xs text-surface-500 mt-0.5">
          {offset.distanceKm.toFixed(1)} km away · TD: {formatDepth(offset.well.currentDepth)}
        </div>
      </div>

      {/* Formations and events count */}
      <div className="text-right shrink-0">
        <div className="text-2xs font-mono font-semibold text-surface-700">
          {offset.relevantEvents.length} event(s)
        </div>
        <div className="text-3xs text-surface-400">
          {offset.formationMatch.matchedFormations.length} formations
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFormationColor(code: string): string {
  const colors: Record<string, string> = {
    FRM_ALLUVIUM: '#94a3b8',
    FRM_TIPAM:    '#d97706',
    FRM_GIRUJAN:  '#7c3aed',
    FRM_BARAIL:   '#0d9488',
    FRM_KOPILI:   '#dc2626',
    FRM_SYLHET:   '#0284c7',
    FRM_JAINTIA:  '#6366f1',
  };
  return colors[code] || '#64748b';
}
