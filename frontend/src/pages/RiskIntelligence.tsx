import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Shield, CheckCircle2,
  ChevronDown, ChevronUp, ArrowRight, Eye, Layers, Compass,
  ShieldAlert, Crosshair,
} from 'lucide-react';
import { useActiveWell, useActiveWellIntelligence } from '../hooks/useApi';
import { evaluateAlerts } from '../lib/api';
import { SeverityBadge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/Card';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { formatDepth, formatPercent, getEventTypeLabel } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import type { AssessedRisk } from '../types';

const RISK_COLORS: Record<string, string> = {
  MUD_LOSS:        '#0284c7',
  STUCK_PIPE:      '#dc2626',
  OVERPRESSURE:    '#ea580c',
  TORQUE_SPIKE:    '#d97706',
  CEMENTING_ISSUE: '#0d9488',
  KICK:            '#dc2626',
};

export default function RiskIntelligencePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('ALL');
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null);
  const [showCharts, setShowCharts] = useState(false);
  const [depthOverride, setDepthOverride] = useState<number | null>(null);

  const { data: activeWell, isLoading: wellLoading, error: wellError } = useActiveWell();

  const currentDepth = depthOverride ?? activeWell?.currentDepth ?? 0;

  const intelligenceOptions = useMemo(() => {
    if (depthOverride !== null) return { depth: depthOverride };
    return undefined;
  }, [depthOverride]);

  const {
    data: intelligence,
    isLoading: intelLoading,
    error: intelError,
    refetch,
  } = useActiveWellIntelligence(activeWell?.id, intelligenceOptions);

  // Alert evaluation state
  const [isEvaluatingAlerts, setIsEvaluatingAlerts] = useState(false);
  const [evalMessage, setEvalMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const handleRunRiskCheck = async () => {
    if (!activeWell) return;
    setIsEvaluatingAlerts(true);
    setEvalMessage(null);
    try {
      const res = await evaluateAlerts({
        wellId: activeWell.id,
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

  if (wellLoading || (intelLoading && !intelligence)) return <Loading text="Loading dynamic risk intelligence..." />;
  if (wellError) return <ErrorMessage error={wellError as Error} retry={refetch} />;
  if (intelError) return <ErrorMessage error={intelError as Error} retry={refetch} />;

  const risks: AssessedRisk[] = intelligence?.riskAssessment?.risks ?? [];
  const currentFormationName = intelligence?.activeWell?.currentFormationName || activeWell?.currentFormation || 'Barail Formation';

  const critRisks = risks.filter(r => r.severity === 'CRITICAL');
  const highRisks = risks.filter(r => r.severity === 'HIGH');
  const mediumRisks = risks.filter(r => r.severity === 'MEDIUM');
  const maxScore = risks.length > 0 ? Math.max(...risks.map(r => r.riskScore)) : 0;

  const filteredRisks = filter === 'ALL' ? risks : risks.filter(r => r.severity === filter);

  // Chart data
  const radarData = risks.map(r => ({
    type: r.riskLabel,
    probability: r.riskScore,
  }));

  const barData = risks.map(r => ({
    name: r.riskLabel,
    probability: r.riskScore,
    fill: RISK_COLORS[r.riskType] || '#64748b',
  }));

  const wellName = activeWell?.wellName || 'Active Well';
  const wellId = activeWell?.wellId || '';

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── WORKFLOW BREADCRUMB ────────────────────────────────────────────── */}
      <div className="card px-3.5 py-2.5 bg-white flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-surface-400">Workflow:</span>
          <span className="px-2 py-0.5 rounded bg-surface-100 text-surface-600 font-medium">1. Evidence</span>
          <ArrowRight size={12} className="text-surface-300" />
          <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">2. Dynamic Risk Assessment</span>
          <ArrowRight size={12} className="text-surface-300" />
          <button
            onClick={() => navigate('/alerts')}
            className="px-2 py-0.5 rounded text-surface-600 hover:text-surface-900 hover:bg-surface-100 font-medium transition-colors"
          >
            3. Alerts
          </button>
          <ArrowRight size={12} className="text-surface-300" />
          <button
            onClick={() => navigate('/recommendations')}
            className="px-2 py-0.5 rounded text-surface-600 hover:text-surface-900 hover:bg-surface-100 font-medium transition-colors"
          >
            4. Actions
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-500">
          <span>Well:</span>
          <span className="font-semibold text-surface-800">{wellName}</span>
          {wellId && <span className="font-mono text-2xs text-surface-400">({wellId})</span>}
          <span className="text-surface-300">·</span>
          <span>Depth:</span>
          <span className="font-mono font-bold text-surface-900">{formatDepth(currentDepth)}</span>
          <span className="text-teal-700 font-semibold">({currentFormationName})</span>
        </div>
      </div>

      {/* ─── SUMMARY KPIS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Evaluated Risks"
          value={risks.length}
          sub={`${critRisks.length} critical · ${highRisks.length} high · ${mediumRisks.length} medium`}
          icon={<AlertTriangle size={18} />}
          color="#ea580c"
        />
        <MetricCard
          label="Critical Hazards"
          value={critRisks.length}
          sub={critRisks.length > 0 ? 'Requires immediate action plan' : 'No critical hazards detected'}
          icon={<AlertTriangle size={18} />}
          color="#dc2626"
        />
        <MetricCard
          label="High Hazards"
          value={highRisks.length}
          sub="Precautionary mitigation required"
          icon={<Shield size={18} />}
          color="#ea580c"
        />
        <MetricCard
          label="Peak Risk Score"
          value={`${maxScore}/100`}
          sub={intelligence?.riskAssessment?.overallRiskLevel ? `Overall Level: ${intelligence.riskAssessment.overallRiskLevel}` : 'Synthesized from offset wells'}
          icon={<CheckCircle2 size={18} />}
          color="#0d9488"
        />
      </div>

      {/* ─── TOOLBAR & EXPANDABLE CHARTS TOGGLE ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-white p-3 rounded-lg border border-surface-200">
        {/* Severity Filters */}
        <div className="flex items-center gap-1 bg-surface-100 border border-surface-200 rounded-lg p-0.5">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(s => (
            <button
              key={s}
              id={`risk-filter-${s.toLowerCase()}`}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === s ? 'bg-white text-primary-700 shadow-2xs' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Horizon Simulation Quick Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-surface-600">
            <Crosshair size={13} className="text-primary-600" />
            <span>Horizon:</span>
          </div>
          <button
            onClick={() => setDepthOverride(null)}
            className={`px-2 py-1 rounded text-2xs font-semibold border ${
              depthOverride === null
                ? 'bg-primary-50 text-primary-800 border-primary-200'
                : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
            }`}
          >
            Live (2847m)
          </button>
          <button
            onClick={() => setDepthOverride(3100)}
            className={`px-2 py-1 rounded text-2xs font-semibold border ${
              depthOverride === 3100
                ? 'bg-primary-50 text-primary-800 border-primary-200'
                : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
            }`}
          >
            Kopili (3100m)
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            id="run-risk-check-page-btn"
            onClick={handleRunRiskCheck}
            disabled={isEvaluatingAlerts}
            className="btn btn-primary text-xs py-1 px-3 flex items-center gap-1.5 font-semibold"
          >
            <ShieldAlert size={13} />
            {isEvaluatingAlerts ? 'Evaluating...' : 'Run Risk Check'}
          </button>

          <button
            onClick={() => setShowCharts(!showCharts)}
            className="btn btn-ghost text-xs py-1 px-2.5 flex items-center gap-1.5 text-surface-600"
          >
            <Compass size={13} />
            {showCharts ? 'Hide Visuals' : 'Show Charts'}
          </button>
        </div>
      </div>

      {/* Inline Feedback Banner for Risk Check */}
      {evalMessage && (
        <div
          className={`px-3.5 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border ${
            evalMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : evalMessage.type === 'error'
              ? 'bg-red-50 text-red-900 border-red-200'
              : 'bg-teal-50 text-teal-900 border-teal-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">
              {evalMessage.type === 'success' ? 'Alert Triggered' : evalMessage.type === 'error' ? 'Evaluation Failed' : 'Check Complete'}:
            </span>
            <span>{evalMessage.text}</span>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="underline font-semibold shrink-0 hover:opacity-80"
          >
            Review Operational Alerts &rarr;
          </button>
        </div>
      )}

      {/* ─── SECONDARY TECHNICAL CHARTS (EXPANDABLE) ─────────────────────────── */}
      {showCharts && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5 p-3.5 bg-white rounded-lg border border-surface-200">
          <div>
            <div className="text-xs font-semibold text-surface-800 mb-2">Calculated Hazard Score by Risk Type</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 10, fontWeight: 500 }} width={130} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', color: '#0f172a' }}
                  formatter={(v: unknown) => [`${v}/100`, 'Hazard Score']}
                />
                <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div className="text-xs font-semibold text-surface-800 mb-2">Composite Hazard Radar Profile</div>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="type" tick={{ fill: '#334155', fontSize: 9, fontWeight: 500 }} />
                <Radar name="Hazard Score" dataKey="probability" stroke="#0284c7" fill="#0284c7" fillOpacity={0.25} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '11px', color: '#0f172a' }}
                  formatter={(v: unknown) => [`${v}/100`, 'Hazard Score']}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ─── DYNAMIC RISK LIST ──────────────────────────────────────────────── */}
      {filteredRisks.length === 0 ? (
        <EmptyState message="No risk events match the selected filter at this depth horizon." />
      ) : (
        <div className="space-y-3">
          {filteredRisks.map(risk => {
            const isExpanded = expandedRiskId === risk.riskType;
            const isCrit = risk.severity === 'CRITICAL';
            const isHigh = risk.severity === 'HIGH';
            const borderAccent = isCrit ? 'border-l-red-600' : isHigh ? 'border-l-amber-500' : 'border-l-teal-600';

            return (
              <div
                key={risk.riskType}
                className={`card bg-white border-l-4 ${borderAccent} p-4 transition-all shadow-2xs hover:shadow-xs`}
              >
                {/* Header Row: Title, Severity, Depth & Formation, Status */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-surface-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <SeverityBadge severity={risk.severity}>{risk.severity}</SeverityBadge>
                    <h3 className="text-base font-bold text-surface-900">
                      {risk.riskLabel}
                    </h3>
                    <span className="text-xs text-surface-400 font-mono">({risk.riskType})</span>
                    <span className="badge badge-normal text-2xs">Dynamic Offset Assessment</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-surface-400">Horizon: </span>
                      <span className="font-mono font-bold text-surface-800">{formatDepth(currentDepth)}</span>
                    </div>
                    {currentFormationName && (
                      <div className="text-teal-800 font-semibold px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                        {currentFormationName}
                      </div>
                    )}
                    <button
                      id={`toggle-risk-${risk.riskType}`}
                      onClick={() => setExpandedRiskId(isExpanded ? null : risk.riskType)}
                      className="btn btn-ghost text-xs py-1 px-2 text-surface-600 flex items-center gap-1"
                    >
                      {isExpanded ? 'Less' : 'Details'}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Main Body: Detection Reason + Score + Recommended Action */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-3">
                  {/* Risk Score Bar */}
                  <div className="lg:col-span-3 flex flex-col justify-center p-2.5 rounded-lg bg-surface-50 border border-surface-200/70">
                    <div className="flex items-center justify-between text-2xs text-surface-500 mb-1">
                      <span>Calculated Risk Score</span>
                      <span className="font-mono font-bold text-surface-800 text-xs">
                        {risk.riskScore}/100 ({formatPercent(risk.confidence)} conf.)
                      </span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${risk.riskScore}%`,
                          backgroundColor: isCrit ? '#dc2626' : isHigh ? '#ea580c' : '#0d9488',
                        }}
                      />
                    </div>
                    <div className="text-2xs text-surface-400 mt-1.5">
                      {risk.evidence.length} evidence point(s) · {risk.sourceWells.length} offset well(s)
                    </div>
                  </div>

                  {/* Primary Mitigation Action & Detection Reason */}
                  <div className="lg:col-span-9 space-y-2">
                    {/* Detection Reason */}
                    <div className="text-xs text-surface-800 bg-surface-50 p-2.5 rounded-md border border-surface-200 leading-relaxed">
                      <strong className="text-surface-900 font-semibold">Detection Reason: </strong>
                      {risk.detectionReason}
                    </div>

                    {/* Recommended Action */}
                    {risk.recommendedAction && (
                      <div className="p-2.5 rounded-md bg-teal-50 border border-teal-200 text-xs text-teal-900 leading-relaxed">
                        <strong className="text-teal-800 font-semibold">Recommended Mitigation: </strong>
                        {risk.recommendedAction}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── EXPANDABLE SECONDARY DETAILS ──────────────────────────── */}
                {isExpanded && (
                  <div className="mt-3.5 pt-3 border-t border-surface-100 space-y-3">
                    {/* Supporting Historical Evidence */}
                    {risk.evidence.length > 0 && (
                      <div>
                        <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Eye size={12} className="text-primary-600" />
                          Supporting Historical Evidence from Offset Wells
                        </div>
                        <div className="space-y-1">
                          {risk.evidence.map((ev, i) => (
                            <div
                              key={i}
                              className="text-xs text-surface-700 bg-surface-50/70 p-2 rounded border border-surface-200 flex items-start gap-2"
                            >
                              <span className="text-primary-600 font-bold">•</span>
                              <span>{ev}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Referenced Source Wells */}
                    {risk.sourceWells.length > 0 && (
                      <div>
                        <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Layers size={12} className="text-primary-600" />
                          Referenced Offset Wells
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {risk.sourceWells.map(sw => (
                            <span key={sw.wellId} className="badge badge-info text-2xs px-2.5 py-1 flex items-center gap-1.5">
                              <span className="font-bold">{sw.wellName}</span>
                              <span className="text-surface-400">·</span>
                              <span>{sw.distanceKm} km away</span>
                              <span className="text-surface-400">·</span>
                              <span>@ {formatDepth(sw.eventDepth)} ({sw.eventSeverity})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Navigation Shortcut */}
                    <div className="flex items-center justify-end gap-2 pt-1 text-xs">
                      <button
                        onClick={() => navigate('/alerts')}
                        className="btn btn-ghost text-xs py-1"
                      >
                        View Related Alerts <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => navigate('/recommendations')}
                        className="btn btn-primary text-xs py-1"
                      >
                        View Action Plans <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

