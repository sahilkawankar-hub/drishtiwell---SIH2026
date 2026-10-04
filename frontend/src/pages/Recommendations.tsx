import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecommendations, useActiveWell } from '../hooks/useApi';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { MetricCard } from '../components/ui/Card';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { formatDateTime, parseJsonField } from '../lib/utils';
import {
  Lightbulb, ChevronDown, ChevronUp, ArrowRight,
  ShieldCheck, AlertCircle, Layers, MapPin
} from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  MUD_PROGRAM:    'Mud Program',
  CASING_DESIGN:  'Casing Design',
  BIT_SELECTION:  'Bit Selection',
  WEIGHT_PROGRAM: 'Weight Program',
  CEMENTING:      'Cementing',
  GENERAL:        'General',
};

const CATEGORY_BENEFITS: Record<string, string> = {
  MUD_PROGRAM:    'Stabilizes wellbore pressure, prevents influx/kicks, and avoids severe lost circulation.',
  CASING_DESIGN:  'Ensures structural integrity across weak formations and isolates overpressured zones.',
  BIT_SELECTION:  'Optimizes ROP, reduces vibration fatigue, and avoids unnecessary round trips for bit change.',
  WEIGHT_PROGRAM: 'Maintains optimal drilling margin without exceeding formation breakdown gradients.',
  CEMENTING:      'Establishes zonal isolation and prevents sustained casing pressure or gas channeling.',
  GENERAL:        'Reduces non-productive time (NPT) and mitigates operational drilling hazards.',
};

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: activeWell } = useActiveWell();
  const { data: recs = [], isLoading, error, refetch } = useRecommendations({
    category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
  });

  if (isLoading) return <Loading text="Loading engineering recommendations..." />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  const criticalRecs = recs.filter(r => r.priority === 'CRITICAL');
  const highRecs = recs.filter(r => r.priority === 'HIGH');
  const pendingRecs = recs.filter(r => r.status === 'PENDING');

  const wellDisplayName = activeWell?.wellName || 'Active Well';
  const wellDisplayId = activeWell?.wellId || '';

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
          <button
            onClick={() => navigate('/alerts')}
            className="px-2 py-0.5 rounded text-surface-600 hover:text-surface-900 hover:bg-surface-100 font-medium transition-colors"
          >
            3. Alerts
          </button>
          <ArrowRight size={12} className="text-surface-300" />
          <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 font-bold">
            4. Recommended Actions
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-surface-500">
          <span>Target Well:</span>
          <span className="font-semibold text-surface-800">{wellDisplayName}</span>
          {wellDisplayId && <span className="font-mono text-2xs text-surface-400">({wellDisplayId})</span>}
        </div>
      </div>

      {/* ─── SUMMARY KPIS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Recommendations"
          value={recs.length}
          sub="Synthesized from offset benchmarks"
          icon={<Lightbulb size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Critical Actions"
          value={criticalRecs.length}
          sub={criticalRecs.length > 0 ? 'Requires immediate action' : 'None required'}
          color="#dc2626"
        />
        <MetricCard
          label="High Priority"
          value={highRecs.length}
          sub="Pre-drill & operational controls"
          color="#ea580c"
        />
        <MetricCard
          label="Pending Review"
          value={pendingRecs.length}
          sub="Awaiting superintendent sign-off"
          color="#0d9488"
        />
      </div>

      {/* ─── CATEGORY FILTERS TOOLBAR ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['ALL', ...Object.keys(CATEGORY_LABELS)].map(cat => (
            <button
              key={cat}
              id={`rec-filter-${cat.toLowerCase()}`}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                categoryFilter === cat
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50 hover:text-surface-900'
              }`}
            >
              {cat === 'ALL' ? 'All Disciplines' : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <span className="text-xs text-surface-500">
          Showing <strong className="text-surface-800">{recs.length}</strong> engineering plan(s)
        </span>
      </div>

      {/* ─── RECOMMENDATIONS LIST ───────────────────────────────────────────── */}
      {recs.length === 0 ? (
        <EmptyState message="No recommendations available for the selected category." />
      ) : (
        <div className="space-y-3.5">
          {recs.map(rec => {
            const refs = parseJsonField<string[]>(rec.references, []);
            const isExpanded = expandedId === rec.id;

            const isCrit = rec.priority === 'CRITICAL';
            const isHigh = rec.priority === 'HIGH';
            const borderClass = isCrit
              ? 'border-l-red-600'
              : isHigh
              ? 'border-l-amber-500'
              : 'border-l-teal-600';

            const defaultBenefit = CATEGORY_BENEFITS[rec.category] || CATEGORY_BENEFITS.GENERAL;

            return (
              <div
                key={rec.id}
                className={`card bg-white border-l-4 ${borderClass} p-4 transition-all shadow-2xs hover:shadow-xs`}
              >
                {/* Header: Priority, Category, Status, Confidence, Target Well */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-surface-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge severity={rec.priority}>{rec.priority}</SeverityBadge>
                    <span className="badge badge-info text-2xs font-semibold">
                      {CATEGORY_LABELS[rec.category] || rec.category}
                    </span>
                    <StatusBadge status={rec.status} />

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 text-xs font-semibold text-surface-700">
                      <MapPin size={10} className="text-primary-600" />
                      {rec.well?.wellName || wellDisplayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-surface-500">
                      Confidence: <strong className="font-mono text-teal-700">{(rec.confidence * 100).toFixed(0)}%</strong>
                    </span>
                    <button
                      id={`rec-toggle-${rec.id}`}
                      onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                      className="btn btn-ghost text-xs py-1 px-2 text-surface-600 flex items-center gap-1"
                    >
                      {isExpanded ? 'Less' : 'Details'}
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* ─── 4 CORE STRUCTURED SECTIONS ───────────────────────────── */}
                <div className="pt-3 space-y-3">
                  {/* 1. RECOMMENDED ACTION */}
                  <div>
                    <h3 className="text-sm font-bold text-surface-900 mb-1 flex items-center gap-1.5">
                      <Lightbulb size={15} className="text-primary-600 shrink-0" />
                      {rec.title}
                    </h3>
                    <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-md text-xs text-teal-950 leading-relaxed font-medium">
                      {rec.content}
                    </div>
                  </div>

                  {/* 2 & 3: WHY IT IS SUGGESTED + EXPECTED BENEFIT */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Why It Is Suggested */}
                    <div className="p-2.5 rounded-md bg-surface-50 border border-surface-200">
                      <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <AlertCircle size={11} className="text-amber-600" />
                        Why It Is Suggested (Risk Driver)
                      </div>
                      <p className="text-xs text-surface-800 leading-relaxed">
                        {rec.rationale || 'Triggered by formation boundary transitions and offset well incident records.'}
                      </p>
                    </div>

                    {/* Expected Benefit */}
                    <div className="p-2.5 rounded-md bg-surface-50 border border-surface-200">
                      <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ShieldCheck size={11} className="text-teal-600" />
                        Expected Operational Benefit
                      </div>
                      <p className="text-xs text-surface-800 leading-relaxed">
                        {defaultBenefit}
                      </p>
                    </div>
                  </div>

                  {/* 4. EXPANDABLE SUPPORTING EVIDENCE & CITATIONS */}
                  {isExpanded && (
                    <div className="mt-2 pt-3 border-t border-surface-100 space-y-2.5">
                      {refs.length > 0 && (
                        <div>
                          <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                            <Layers size={11} className="text-primary-600" />
                            Supporting Historical Evidence & Offset Wells
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {refs.map(ref => (
                              <span key={ref} className="badge badge-info text-2xs px-2 py-0.5">
                                {ref}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between text-2xs text-surface-400 pt-1">
                        <span>
                          Source: {rec.aiProvider || 'NWIS Benchmark Rules Engine'} · Generated {formatDateTime(rec.createdAt)}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate('/risk-intelligence')}
                            className="btn btn-ghost text-xs py-0.5 px-2"
                          >
                            Inspect Risk Profile <ArrowRight size={11} />
                          </button>
                          <button
                            onClick={() => navigate('/alerts')}
                            className="btn btn-ghost text-xs py-0.5 px-2"
                          >
                            View Active Alerts <ArrowRight size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
