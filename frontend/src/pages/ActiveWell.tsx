import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Gauge, RefreshCw, Crosshair,
  ArrowDown, ArrowUp, Shield, Eye, MapPin, Layers, ChevronDown, ChevronUp,
  ShieldAlert,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage } from '../components/ui/Loading';
import {
  useActiveWell, useWellEvents, useWellParameters, useAlerts,
  useActiveWellIntelligence,
} from '../hooks/useApi';
import { evaluateAlerts } from '../lib/api';
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
  const queryClient = useQueryClient();
  const { data: well, isLoading, error, refetch } = useActiveWell();

  const wellId = well?.id || '';
  const { data: events = [] } = useWellEvents(wellId);
  const { data: params = [] } = useWellParameters(wellId, 48);
  const { data: alerts = [] } = useAlerts({ wellId, status: 'ACTIVE' });

  // Depth Simulator
  const [depthOverride, setDepthOverride] = useState<number | null>(null);
  const currentDepth = depthOverride ?? well?.currentDepth ?? 0;

  // Intelligence
  const intelligenceOptions = useMemo(() => {
    if (depthOverride !== null) return { depth: depthOverride };
    return undefined;
  }, [depthOverride]);

  const {
    data: intelligence,
    isLoading: intelLoading,
    refetch: refetchIntel,
  } = useActiveWellIntelligence(wellId || undefined, intelligenceOptions);

  // Expand states
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [showAllOffsets, setShowAllOffsets] = useState(false);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showFormations, setShowFormations] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);

  // Alert evaluation
  const [isEvaluatingAlerts, setIsEvaluatingAlerts] = useState(false);
  const [evalMessage, setEvalMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const handleRunRiskCheck = async () => {
    if (!well) return;
    setIsEvaluatingAlerts(true);
    setEvalMessage(null);
    try {
      const res = await evaluateAlerts({
        wellId: well.id,
        depth: currentDepth,
        thresholdScore: 70,
      });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['intelligence'] });

      if (res.createdCount > 0) {
        const labels = res.createdAlerts.map(a => `${a.severity} ${a.formation ? '(' + a.formation + ')' : ''}`).join(', ');
        setEvalMessage({
          type: 'success',
          text: `Proactive Alert Triggered: ${res.createdCount} new operational alert generated at ${formatDepth(res.evaluatedDepth)} (${labels}). Threshold: score ≥ 70.`,
        });
      } else {
        setEvalMessage({
          type: 'info',
          text: `Risk Check Complete at ${formatDepth(res.evaluatedDepth)}: Evaluated ${res.assessedRisksCount} hazard(s). No new alerts (${res.existingActiveAlertsCount} active/acknowledged alerts already recorded).`,
        });
      }
    } catch (err: any) {
      setEvalMessage({
        type: 'error',
        text: `Risk evaluation failed: ${err.message || 'Unknown error'}`,
      });
    } finally {
      setIsEvaluatingAlerts(false);
    }
  };

  if (isLoading) return <Loading text="Loading active well data..." />;
  if (error || !well) return <ErrorMessage error={error as Error || new Error('Active well not found')} retry={refetch} />;

  const latestParam = well.drillingParameters?.[0] || params[0];

  // Chart data
  const chartData = [...params].reverse().slice(-24).map(p => ({
    time: new Date(p.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    torque: p.torque,
    rop: p.rop,
  }));

  const currentFormation = well.formations?.find(f => f.isActive)?.formation;

  // Intelligence data
  const risks = intelligence?.riskAssessment?.risks ?? [];
  const offsetWells = intelligence?.offsetWells ?? [];
  const relevantEvents = intelligence?.allRelevantEvents ?? [];
  const intelFormationName = intelligence?.activeWell?.currentFormationName;

  const displayedOffsets = showAllOffsets ? offsetWells : offsetWells.slice(0, 5);
  const displayedEvents = showAllEvents ? relevantEvents : relevantEvents.slice(0, 6);

  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── 1. WELL SUMMARY ──────────────────────────────────────────── */}
      <div className="card p-4 border-l-4 border-l-teal-600 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={well.status} />
              <span className="text-xs text-surface-500">
                {well.field} · {well.block} · {well.wellType}
              </span>
            </div>
            <h1 className="text-xl font-bold text-surface-900 tracking-tight">
              {well.wellName}
              <span className="text-xs font-mono font-normal text-surface-400 ml-2">{well.wellId}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              id="active-well-refresh-btn"
              onClick={() => { refetch(); refetchIntel(); }}
              className="btn btn-ghost text-xs"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalAlerts.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-900 mb-0.5">
              {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
            </div>
            {criticalAlerts.slice(0, 2).map(a => (
              <div key={a.id} className="text-xs text-red-800">• {a.alertType}: {a.message}</div>
            ))}
          </div>
          <button id="active-view-alerts-btn" onClick={() => navigate('/alerts')} className="btn btn-danger text-xs shrink-0">
            Review
          </button>
        </div>
      )}

      {/* Key Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Current Depth"
          value={formatDepth(currentDepth)}
          sub={`Target: ${well.totalDepth ? formatDepth(well.totalDepth) : 'TBD'}`}
          icon={<Gauge size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Formation"
          value={<span className="text-teal-700 text-base">{intelFormationName || currentFormation?.name || well.currentFormation || 'Barail'}</span>}
          sub={currentFormation?.ageEra || 'Upper Assam Basin'}
          color="#0d9488"
        />
        <MetricCard
          label="Offset Wells"
          value={intelligence?.summary?.totalOffsetWells ?? '—'}
          sub={intelligence ? `Nearest: ${intelligence.summary.nearestWellKm.toFixed(1)} km` : 'Analyzing...'}
          icon={<MapPin size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Risk Level"
          value={
            <span className={getSeverityTextColor(intelligence?.riskAssessment?.overallRiskLevel ?? 'LOW')}>
              {intelligence?.riskAssessment?.overallRiskLevel ?? 'MODERATE'}
            </span>
          }
          sub={`${risks.length} risk types · ${intelligence?.summary?.totalRelevantEvents ?? 0} events`}
          icon={<Shield size={18} />}
          color={risks.some(r => r.severity === 'CRITICAL') ? '#dc2626' : '#d97706'}
          onClick={() => navigate('/risk-intelligence')}
        />
      </div>

      {/* ─── 2. CURRENT DRILLING PARAMETERS ───────────────────────────── */}
      {latestParam && (
        <Card
          title="Current Parameters"
          subtitle={`As of ${formatDateTime(latestParam.timestamp)}`}
          className="bg-white"
          headerAction={
            <button onClick={() => setShowCharts(!showCharts)} className="btn btn-ghost text-xs py-1">
              {showCharts ? 'Hide Charts' : 'Show Trends'}
            </button>
          }
        >
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {[
              { label: 'WOB', value: latestParam.wob, unit: 't', warn: 20, crit: 25 },
              { label: 'RPM', value: latestParam.rpm, unit: 'rpm', warn: 100, crit: 120 },
              { label: 'Torque', value: latestParam.torque, unit: 'kN.m', warn: 20, crit: 25 },
              { label: 'ROP', value: latestParam.rop, unit: 'm/hr', warn: null, crit: null },
              { label: 'MW', value: latestParam.mudWeight, unit: 'g/cc', warn: 1.42, crit: 1.45 },
              { label: 'SPP', value: latestParam.standpipePressure, unit: 'bar', warn: 280, crit: 310 },
              { label: 'Flow', value: latestParam.flowRate, unit: 'L/min', warn: null, crit: null },
              { label: 'Hook', value: latestParam.hookLoad, unit: 't', warn: null, crit: null },
              { label: 'ECD', value: latestParam.ecd, unit: 'g/cc', warn: 1.43, crit: 1.46 },
            ].map(param => {
              const val = param.value ?? null;
              const isCrit = param.crit !== null && val !== null && val > param.crit!;
              const isWarn = !isCrit && param.warn !== null && val !== null && val > param.warn!;
              const valueColor = isCrit ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-surface-900';
              const cardBg = isCrit ? 'bg-red-50 border-red-200' : isWarn ? 'bg-amber-50 border-amber-200' : 'bg-surface-50 border-surface-200';

              return (
                <div key={param.label} className={`p-2 rounded-lg border text-center ${cardBg}`}>
                  <div className="text-2xs text-surface-500 mb-0.5">{param.label}</div>
                  <div className={`text-lg font-bold font-mono ${valueColor}`}>
                    {val !== null ? formatNumber(val) : '—'}
                  </div>
                  <div className="text-2xs text-surface-400">{param.unit}</div>
                </div>
              );
            })}
          </div>

          {/* Expandable charts */}
          {showCharts && chartData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-surface-100">
              <div className="p-2 bg-surface-50 rounded-md border border-surface-200">
                <div className="text-2xs text-surface-500 mb-1">Torque Trend (Last 24 readings)</div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', color: '#0f172a' }} />
                    <ReferenceLine y={20} stroke="#d97706" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="torque" stroke="#d97706" strokeWidth={2} dot={false} name="Torque (kN.m)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="p-2 bg-surface-50 rounded-md border border-surface-200">
                <div className="text-2xs text-surface-500 mb-1">ROP Trend</div>
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 9 }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', color: '#0f172a' }} />
                    <Line type="monotone" dataKey="rop" stroke="#0d9488" strokeWidth={2} dot={false} name="ROP (m/hr)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ─── 3. DEPTH SIMULATOR ───────────────────────────────────────── */}
      <Card
        title="Depth Simulator"
        subtitle="Simulate depth to recalculate risks and offset incidents"
        className="bg-white"
        headerAction={
          <div className="flex items-center gap-2">
            {depthOverride !== null && (
              <button className="btn btn-ghost text-xs" onClick={() => setDepthOverride(null)}>
                Reset to Live ({formatDepth(well.currentDepth)})
              </button>
            )}
            <button
              id="run-risk-check-btn"
              onClick={handleRunRiskCheck}
              disabled={isEvaluatingAlerts}
              className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1.5 font-semibold"
            >
              <ShieldAlert size={13} />
              {isEvaluatingAlerts ? 'Evaluating...' : 'Run Risk Check'}
            </button>
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <Crosshair size={14} className="text-primary-600" />
            <span className="text-xs text-surface-600">Depth:</span>
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
            <input
              id="depth-simulator-input"
              type="number"
              value={currentDepth}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) setDepthOverride(val);
              }}
              className="form-input w-20 text-center font-mono font-bold text-xs py-1"
            />
            <span className="text-surface-400 text-xs">m</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setDepthOverride(Math.max(0, currentDepth - 50))}>
              <ArrowUp size={12} /> −50m
            </button>
            <button className="btn btn-ghost px-2 py-1 text-xs" onClick={() => setDepthOverride(currentDepth + 50)}>
              <ArrowDown size={12} /> +50m
            </button>
          </div>
        </div>

        {depthOverride !== null && (
          <div className="mt-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
            Simulation: <strong>{formatDepth(depthOverride)}</strong> (live: {formatDepth(well.currentDepth)})
          </div>
        )}

        {evalMessage && (
          <div
            className={`mt-2.5 px-3 py-2 rounded-lg text-xs flex items-center justify-between gap-2 border ${
              evalMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : evalMessage.type === 'error'
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-teal-50 text-teal-900 border-teal-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {evalMessage.type === 'success' ? 'Alert Created' : evalMessage.type === 'error' ? 'Evaluation Failed' : 'Check Complete'}:
              </span>
              <span>{evalMessage.text}</span>
            </div>
            <button
              onClick={() => navigate('/alerts')}
              className="underline font-semibold shrink-0 hover:opacity-80"
            >
              View Alerts &rarr;
            </button>
          </div>
        )}
      </Card>

      {/* ─── 4. RISK ASSESSMENT ───────────────────────────────────────── */}
      <Card
        title="Risk Assessment"
        subtitle={`${risks.length} risk(s) at ${formatDepth(currentDepth)} from ${offsetWells.length} offset wells`}
        className="bg-white"
      >
        {intelLoading && risks.length === 0 ? (
          <div className="py-6 text-center text-surface-400 text-xs animate-pulse">Computing risk scores...</div>
        ) : risks.length === 0 ? (
          <div className="py-6 text-center text-surface-400 text-xs">No high-probability risks at current depth.</div>
        ) : (
          <div className="space-y-2.5">
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

      {/* ─── 5. HISTORICAL EVIDENCE & OFFSET WELLS ────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5">
        {/* Evidence Table */}
        {relevantEvents.length > 0 && (
          <Card
            title="Historical Evidence"
            subtitle={`${relevantEvents.length} events within ±${intelligence?.depthWindow ?? 150}m`}
            className="xl:col-span-2 bg-white"
            headerAction={
              relevantEvents.length > 6 && (
                <button className="btn btn-ghost text-xs py-1" onClick={() => setShowAllEvents(!showAllEvents)}>
                  {showAllEvents ? 'Less' : `All (${relevantEvents.length})`}
                </button>
              )
            }
          >
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source Well</th>
                    <th>Event</th>
                    <th>Depth</th>
                    <th>Delta</th>
                    <th>Severity</th>
                    <th>NPT</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEvents.map(event => (
                    <tr key={event.id}>
                      <td className="text-primary-700 font-semibold text-xs">{event.wellName}</td>
                      <td className="text-xs text-surface-800">{getEventTypeLabel(event.eventType)}</td>
                      <td className="font-mono text-xs text-surface-700">{formatDepth(event.depth)}</td>
                      <td className="font-mono text-xs">
                        <span className={Math.abs(event.depthDelta) <= 50 ? 'text-red-600 font-bold' : Math.abs(event.depthDelta) <= 100 ? 'text-amber-600' : 'text-surface-500'}>
                          {event.depthDelta >= 0 ? '+' : ''}{event.depthDelta}m
                        </span>
                      </td>
                      <td><SeverityBadge severity={event.severity}>{event.severity}</SeverityBadge></td>
                      <td className="font-mono text-xs text-surface-600">{event.nptHours ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Offset Wells List */}
        <Card
          title="Top Offset Wells"
          subtitle={`${offsetWells.length} ranked by proximity`}
          className="bg-white"
          headerAction={
            offsetWells.length > 5 && (
              <button className="btn btn-ghost text-xs py-1" onClick={() => setShowAllOffsets(!showAllOffsets)}>
                {showAllOffsets ? 'Less' : `All (${offsetWells.length})`}
              </button>
            )
          }
        >
          <div className="space-y-1.5">
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

      {/* ─── 6. RECOMMENDED ACTIONS ───────────────────────────────────── */}
      {risks.length > 0 && (
        <Card
          title="Recommended Actions"
          subtitle="Proactive advisory based on offset evidence"
          className="bg-white"
        >
          <div className="space-y-2.5">
            {risks.slice(0, 3).map((r, i) => (
              <div key={r.riskType} className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-bold text-surface-900">{r.riskLabel}</span>
                  <SeverityBadge severity={r.severity}>{r.severity}</SeverityBadge>
                  <span className="ml-auto text-2xs font-mono text-surface-400">{(r.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="text-xs text-teal-900 bg-teal-50 border border-teal-200 p-2 rounded leading-relaxed">
                  {r.recommendedAction}
                </div>
                <div className="mt-1 text-2xs text-surface-400">
                  Based on {r.eventCount} incident(s) from {r.sourceWells.length} well(s)
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ─── EXPANDABLE: Formation Column & Well Events ────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
        {/* Formation Column */}
        {well.formations && well.formations.length > 0 && (
          <div className="card bg-white">
            <button
              onClick={() => setShowFormations(!showFormations)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <h3 className="text-sm font-semibold text-surface-900">Formation Column</h3>
                <p className="text-xs text-surface-500">{well.formations.length} formations</p>
              </div>
              {showFormations ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
            </button>
            {showFormations && (
              <div className="px-4 pb-4 space-y-1.5">
                {[...well.formations].sort((a, b) => a.topDepth - b.topDepth).map(wf => {
                  const isCurrentInSim = currentDepth >= wf.topDepth && currentDepth <= wf.bottomDepth;
                  return (
                    <div
                      key={wf.id}
                      className={`flex items-center gap-3 p-2 rounded border ${
                        isCurrentInSim ? 'bg-teal-50 border-teal-200' : 'bg-surface-50 border-surface-200'
                      }`}
                    >
                      <div className="text-xs font-mono text-surface-500 w-24 text-right">
                        {wf.topDepth}–{wf.bottomDepth}m
                      </div>
                      <div
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: getFormationColor(wf.formation.code) }}
                      />
                      <div className="flex-1 text-xs font-semibold text-surface-800">{wf.formation.name}</div>
                      {isCurrentInSim && <span className="badge badge-normal text-2xs">Active</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Well Events */}
        <div className="card bg-white">
          <button
            onClick={() => setShowEventLog(!showEventLog)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-surface-900">Well Event Log</h3>
              <p className="text-xs text-surface-500">{events.length} events recorded</p>
            </div>
            {showEventLog ? <ChevronUp size={16} className="text-surface-400" /> : <ChevronDown size={16} className="text-surface-400" />}
          </button>
          {showEventLog && (
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Depth</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Logged</th>
                  </tr>
                </thead>
                <tbody>
                  {events.slice(0, 8).map(event => (
                    <tr key={event.id}>
                      <td className="font-semibold text-surface-800 text-xs">{getEventTypeLabel(event.eventType)}</td>
                      <td className="font-mono text-surface-700 text-xs">{formatDepth(event.depth)}</td>
                      <td><SeverityBadge severity={event.severity}>{event.severity}</SeverityBadge></td>
                      <td className="max-w-xs truncate text-surface-600 text-xs">{event.description}</td>
                      <td className="text-surface-400 text-2xs">{formatRelativeTime(event.timestamp)}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr><td colSpan={5} className="text-center text-surface-400 text-xs py-4">No events</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
  const borderColor =
    risk.severity === 'CRITICAL' ? 'border-red-200 bg-red-50/40' :
    risk.severity === 'HIGH' ? 'border-amber-200 bg-amber-50/30' :
    'border-surface-200 bg-surface-50';

  const scoreColor =
    risk.severity === 'CRITICAL' ? '#dc2626' :
    risk.severity === 'HIGH' ? '#ea580c' :
    risk.severity === 'MEDIUM' ? '#d97706' : '#16a34a';

  return (
    <div className={`rounded-lg border p-3 ${borderColor}`}>
      <div className="flex items-center justify-between cursor-pointer select-none" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-10 h-10 bg-white rounded border border-surface-200 shrink-0">
            <div className="text-lg font-bold font-mono leading-none" style={{ color: scoreColor }}>
              {risk.riskScore}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-surface-900">{risk.riskLabel}</span>
              <SeverityBadge severity={risk.severity}>{risk.severity}</SeverityBadge>
            </div>
            <div className="text-xs text-surface-500 mt-0.5 max-w-xl line-clamp-1">{risk.detectionReason}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-2xs text-surface-400">Confidence</div>
            <div className="text-xs font-mono font-bold text-surface-700">{Math.round(risk.confidence * 100)}%</div>
          </div>
          <button className="p-1 rounded hover:bg-surface-200/60 text-surface-400">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-surface-200/80 space-y-2.5">
          <div>
            <div className="text-2xs text-surface-500 font-semibold mb-1 flex items-center gap-1">
              <Eye size={11} className="text-primary-600" /> Evidence
            </div>
            <ul className="space-y-1">
              {risk.evidence.map((e, i) => (
                <li key={i} className="text-xs text-surface-700 bg-white/70 p-1.5 rounded border border-surface-200">
                  • {e}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-2xs text-surface-500 font-semibold mb-1 flex items-center gap-1">
              <Layers size={11} className="text-primary-600" /> Source Wells
            </div>
            <div className="flex flex-wrap gap-1.5">
              {risk.sourceWells.map((sw) => (
                <span key={sw.wellId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-surface-200 text-xs text-surface-700">
                  <MapPin size={10} className="text-primary-600" />
                  {sw.wellName} · {sw.distanceKm.toFixed(1)}km · {formatDepth(sw.eventDepth)}
                </span>
              ))}
            </div>
          </div>
          <div className="text-xs text-teal-900 bg-teal-50 border border-teal-200 rounded p-2 leading-relaxed">
            <strong>Action:</strong> {risk.recommendedAction}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Offset Well Row ─────────────────────────────────────────────────────────

function OffsetWellRow({ offset, onNavigate }: { offset: OffsetWellScore; onNavigate: () => void }) {
  const scoreColor = offset.similarityScore >= 70 ? 'text-teal-700' : offset.similarityScore >= 40 ? 'text-amber-700' : 'text-surface-500';

  return (
    <div
      className="flex items-center gap-2 p-2 rounded bg-surface-50 hover:bg-surface-100 border border-surface-200 cursor-pointer transition-colors"
      onClick={onNavigate}
    >
      <div className={`text-sm font-bold font-mono ${scoreColor} w-8 text-center`}>
        {offset.similarityScore}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-surface-800 truncate">{offset.well.wellName}</div>
        <div className="text-2xs text-surface-400">
          {offset.distanceKm.toFixed(1)} km · {formatDepth(offset.well.currentDepth)} · {offset.relevantEvents.length} events
        </div>
      </div>
      <StatusBadge status={offset.well.status} />
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
