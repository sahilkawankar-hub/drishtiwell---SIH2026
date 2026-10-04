import { useState } from 'react';
import { useRecommendations } from '../hooks/useApi';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Card, MetricCard } from '../components/ui/Card';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { formatDateTime, parseJsonField } from '../lib/utils';
import { Lightbulb, Cpu, ChevronDown, ChevronUp } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  MUD_PROGRAM:    'Mud Program',
  CASING_DESIGN:  'Casing Design',
  BIT_SELECTION:  'Bit Selection',
  WEIGHT_PROGRAM: 'Weight Program',
  CEMENTING:      'Cementing',
  GENERAL:        'General',
};

export default function RecommendationsPage() {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: recs = [], isLoading, error, refetch } = useRecommendations({
    category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
  });

  if (isLoading) return <Loading text="Loading AI recommendations..." />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      {/* Header Banner */}
      <div className="card p-4 flex items-center gap-3.5 bg-white shadow-2xs border-l-4 border-l-primary-600">
        <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
          <Cpu size={20} className="text-primary-700" />
        </div>
        <div>
          <div className="text-surface-900 font-bold text-base">Engineering Recommendations Engine</div>
          <div className="text-xs text-surface-500">
            Automated recommendations synthesized from offset well drilling benchmarks and historical incident data.
          </div>
        </div>
        <div className="ml-auto badge badge-normal text-2xs">Rules + Spatial AI</div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total Advisories" value={recs.length} icon={<Lightbulb size={18} />} color="#0284c7" />
        <MetricCard label="Critical Priority" value={recs.filter(r => r.priority === 'CRITICAL').length} color="#dc2626" />
        <MetricCard label="High Priority" value={recs.filter(r => r.priority === 'HIGH').length} color="#ea580c" />
        <MetricCard label="Pending Review" value={recs.filter(r => r.status === 'PENDING').length} color="#d97706" />
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {['ALL', ...Object.keys(CATEGORY_LABELS)].map(cat => (
          <button
            key={cat}
            id={`rec-filter-${cat.toLowerCase()}`}
            onClick={() => setCategoryFilter(cat)}
            className={`btn text-xs font-semibold py-1 px-3 ${
              categoryFilter === cat ? 'bg-primary-600 border-primary-600 text-white' : 'btn-ghost'
            }`}
          >
            {cat === 'ALL' ? 'All Categories' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {recs.length === 0 && <EmptyState message="No recommendations for selected category" />}

      {/* Recommendation Cards */}
      <div className="space-y-3">
        {recs.map(rec => {
          const refs = parseJsonField<string[]>(rec.references, []);
          const isExpanded = expanded === rec.id;

          const borderLeftColor =
            rec.priority === 'CRITICAL' ? '#dc2626' :
            rec.priority === 'HIGH' ? '#ea580c' :
            '#d97706';

          return (
            <Card
              key={rec.id}
              className="border-l-4 bg-white shadow-2xs"
              style={{ borderLeftColor }}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary-50 border border-primary-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lightbulb size={15} className="text-primary-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <SeverityBadge severity={rec.priority}>{rec.priority}</SeverityBadge>
                    <span className="badge badge-info text-2xs">{CATEGORY_LABELS[rec.category] || rec.category}</span>
                    <StatusBadge status={rec.status} />
                    <span className="text-2xs text-surface-500 font-medium ml-auto">
                      Confidence: <span className="font-mono text-primary-700 font-bold">{(rec.confidence * 100).toFixed(0)}%</span>
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-surface-900 mb-1">{rec.title}</h3>

                  <p className={`text-xs text-surface-700 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {rec.content}
                  </p>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-surface-100 space-y-2.5">
                      {rec.rationale && (
                        <div className="p-3 bg-surface-50 rounded-md border border-surface-200">
                          <div className="text-2xs text-surface-500 font-bold uppercase tracking-wider mb-1">
                            Rationale & Geological Evidence
                          </div>
                          <p className="text-xs text-surface-800 leading-relaxed">{rec.rationale}</p>
                        </div>
                      )}
                      {refs.length > 0 && (
                        <div>
                          <div className="text-2xs text-surface-500 font-bold uppercase tracking-wider mb-1">
                            Referenced Offset Wells
                          </div>
                          <div className="flex gap-1.5 flex-wrap">
                            {refs.map(ref => (
                              <span key={ref} className="badge badge-info text-2xs">{ref}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="text-2xs text-surface-400">
                        Generated by: {rec.aiProvider || 'NWIS Rule Engine'} · {formatDateTime(rec.createdAt)}
                      </div>
                    </div>
                  )}

                  <button
                    id={`rec-expand-${rec.id}`}
                    onClick={() => setExpanded(isExpanded ? null : rec.id)}
                    className="mt-2.5 btn btn-ghost text-xs py-1 flex items-center gap-1 text-surface-600 hover:text-surface-900"
                  >
                    {isExpanded ? (
                      <>Show Less <ChevronUp size={13} /></>
                    ) : (
                      <>Show Full Recommendation <ChevronDown size={13} /></>
                    )}
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
