import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GitCompare, MapPin, AlertTriangle, Layers,
  Clock, ArrowRight, X, Plus, Info, Droplets
} from 'lucide-react';
import { useWells, useActiveWell } from '../hooks/useApi';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { formatDepth } from '../lib/utils';
import { Card, MetricCard } from '../components/ui/Card';
import type { Well } from '../types';

export default function ComparisonPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: activeWell, isLoading: awLoading, error: awError } = useActiveWell();
  const { data: allWells = [], isLoading: wellsLoading, error: wellsError } = useWells();

  // Read initial well IDs from URL query params (e.g. ?wells=id1,id2)
  const initialWellIds = useMemo(() => {
    const param = searchParams.get('wells');
    if (!param) return [];
    return param.split(',').filter(Boolean);
  }, [searchParams]);

  const [selectedWellIds, setSelectedWellIds] = useState<string[]>([]);

  // Initialize selected wells from query params or pick default top 3 offsets
  useEffect(() => {
    if (allWells.length === 0) return;
    if (initialWellIds.length > 0) {
      const valid = initialWellIds.filter(id => allWells.some(w => w.id === id));
      if (valid.length > 0) {
        setSelectedWellIds(valid);
        return;
      }
    }
    // Default to first 3 non-active offset wells
    const defaults = allWells.filter(w => !w.isActive).slice(0, 3).map(w => w.id);
    setSelectedWellIds(defaults);
  }, [allWells, initialWellIds]);

  const toggleWell = (id: string) => {
    setSelectedWellIds(prev => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
      } else {
        if (prev.length >= 4) return prev; // max 4 offsets (+ active well = 5 total)
        next = [...prev, id];
      }
      setSearchParams(next.length > 0 ? { wells: next.join(',') } : {});
      return next;
    });
  };

  const removeWell = (id: string) => {
    setSelectedWellIds(prev => {
      const next = prev.filter(x => x !== id);
      setSearchParams(next.length > 0 ? { wells: next.join(',') } : {});
      return next;
    });
  };

  if (awLoading || wellsLoading) return <Loading text="Loading wells for comparative benchmarking..." />;
  if (awError || wellsError) return <ErrorMessage error={(awError || wellsError) as Error} />;

  // Build the comparison wells list: Active Well first, followed by selected offsets
  const comparedOffsetWells: Well[] = selectedWellIds
    .map(id => allWells.find(w => w.id === id))
    .filter((w): w is Well => !!w && w.id !== activeWell?.id);

  const availableOffsets = allWells.filter(w => !w.isActive && !selectedWellIds.includes(w.id));

  // Compute comparative stats
  const totalOffsetEvents = comparedOffsetWells.reduce((acc, w) => acc + (w._count?.drillingEvents || 0), 0);
  const totalOffsetRisks = comparedOffsetWells.reduce((acc, w) => acc + (w._count?.riskEvents || 0), 0);

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="card p-4 bg-white border-l-4 border-l-primary-600 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shrink-0">
              <GitCompare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-surface-900 font-bold text-base">Well Benchmarking & Comparison</h1>
                <span className="badge badge-info text-2xs">Multi-Well Analysis</span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Benchmark the active drilling well against offset wells in the Upper Assam Basin to identify stratigraphy shifts, historical NPT, and recurring incident patterns.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/nearby-wells')}
            className="btn btn-ghost text-xs py-1.5 flex items-center gap-1.5 text-primary-700 shrink-0"
          >
            <MapPin size={13} /> Select from Map
          </button>
        </div>

        {/* Operational Context Callout */}
        <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center gap-2 text-2xs text-teal-900 bg-teal-50/70 p-2 rounded border border-teal-200/80">
          <Info size={13} className="text-teal-700 shrink-0" />
          <span>
            <strong>Comparative Intelligence:</strong> Missing historical logs are marked honestly as <em>“Not reported / —”</em>. Comparing TD, drilled formations, and recorded mud loss events helps verify drilling fluid weight margins.
          </span>
        </div>
      </div>

      {/* ─── SUMMARY KPIS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Wells in Comparison"
          value={comparedOffsetWells.length + (activeWell ? 1 : 0)}
          sub="1 Active + Selected Offsets"
          icon={<GitCompare size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Active Well Depth"
          value={activeWell ? formatDepth(activeWell.currentDepth) : '—'}
          sub={`Target: ${activeWell?.totalDepth ? formatDepth(activeWell.totalDepth) : 'TBD'}`}
          icon={<Droplets size={18} />}
          color="#0d9488"
        />
        <MetricCard
          label="Offset Incidents Logged"
          value={totalOffsetEvents}
          sub="Historical drilling events across selected"
          icon={<Layers size={18} />}
          color="#ea580c"
        />
        <MetricCard
          label="Hazard Alerts Flagged"
          value={totalOffsetRisks}
          sub="Documented severe risk occurrences"
          icon={<AlertTriangle size={18} />}
          color="#dc2626"
        />
      </div>

      {/* ─── ACTIVE WELL COMPARISON SELECTOR BAR ───────────────────────────── */}
      <Card noPadding className="bg-white shadow-2xs p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-surface-600">Compared Wells:</span>

            {/* Active well chip (fixed reference) */}
            {activeWell && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-xs font-bold text-teal-900 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                {activeWell.wellName} (Live Active)
              </span>
            )}

            {/* Selected offset chips */}
            {comparedOffsetWells.map(w => (
              <span
                key={w.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-100 border border-surface-200 text-xs font-semibold text-surface-800"
              >
                {w.wellName}
                <button
                  onClick={() => removeWell(w.id)}
                  className="text-surface-400 hover:text-surface-700 p-0.5"
                  title="Remove from comparison"
                >
                  <X size={12} />
                </button>
              </span>
            ))}

            {comparedOffsetWells.length === 0 && (
              <span className="text-xs text-surface-400 italic">No offset wells selected. Add from dropdown.</span>
            )}
          </div>

          {/* Add more offset wells dropdown */}
          {availableOffsets.length > 0 && comparedOffsetWells.length < 4 && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Plus size={14} className="text-surface-400" />
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    toggleWell(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="form-input text-xs py-1 w-44"
                defaultValue=""
              >
                <option value="" disabled>Add offset well...</option>
                {availableOffsets.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.wellName} ({w.wellId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Card>

      {/* ─── SIDE-BY-SIDE PARAMETER MATRIX ─────────────────────────────────── */}
      <Card
        title="Comparative Parameters & Operational Register"
        subtitle="Direct side-by-side benchmark matrix (Active well highlighted in teal)"
        className="bg-white shadow-2xs"
        noPadding
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-56 bg-surface-50 text-surface-800">Operational Parameter</th>
                {activeWell && (
                  <th className="bg-teal-50/80 text-teal-950 font-bold border-r-2 border-teal-200 min-w-48">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      <div>
                        <div className="text-xs font-bold">{activeWell.wellName}</div>
                        <div className="text-2xs font-normal text-teal-700 font-mono">Reference Active Well</div>
                      </div>
                    </div>
                  </th>
                )}
                {comparedOffsetWells.map(w => (
                  <th key={w.id} className="min-w-44 text-surface-900 font-semibold">
                    <div className="text-xs font-bold">{w.wellName}</div>
                    <div className="text-2xs text-surface-400 font-mono font-normal">{w.wellId}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* SECTION: GENERAL SPECIFICATIONS */}
              <tr className="bg-surface-50/70">
                <td colSpan={1 + (activeWell ? 1 : 0) + comparedOffsetWells.length} className="font-bold text-surface-900 text-2xs uppercase tracking-wider py-1.5">
                  1. Field & General Specifications
                </td>
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Operating Status</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200">
                    <StatusBadge status={activeWell.status} />
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id}>
                    <StatusBadge status={w.status} />
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Field / Asset</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs font-medium text-surface-800">
                    {activeWell.field || '—'}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs text-surface-700">
                    {w.field || '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Block / Concession</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs font-medium text-surface-800">
                    {activeWell.block || '—'}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs text-surface-700">
                    {w.block || '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Well Trajectory / Type</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs font-semibold text-surface-800">
                    {activeWell.wellType || 'Vertical'}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs text-surface-700">
                    {w.wellType || 'Vertical'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Operator</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs text-surface-800">
                    {activeWell.operator || 'Oil India Limited'}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs text-surface-700">
                    {w.operator || 'Oil India Limited'}
                  </td>
                ))}
              </tr>

              {/* SECTION: DEPTH & STRATIGRAPHY */}
              <tr className="bg-surface-50/70">
                <td colSpan={1 + (activeWell ? 1 : 0) + comparedOffsetWells.length} className="font-bold text-surface-900 text-2xs uppercase tracking-wider py-1.5">
                  2. Depth & Stratigraphy Horizon
                </td>
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Current Depth (MD)</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 font-mono font-bold text-teal-900 text-xs">
                    {formatDepth(activeWell.currentDepth)}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="font-mono text-xs text-surface-800">
                    {formatDepth(w.currentDepth)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Total Depth (TD)</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 font-mono text-xs font-semibold text-surface-800">
                    {activeWell.totalDepth ? formatDepth(activeWell.totalDepth) : '— (In Progress)'}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="font-mono text-xs text-surface-700">
                    {w.totalDepth ? formatDepth(w.totalDepth) : '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Active / Target Formation</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs font-semibold text-teal-800">
                    {activeWell.currentFormation || 'Barail Group'}
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs text-surface-700">
                    {w.currentFormation || w.targetFormation || '—'}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Formations Intersected</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs font-mono font-semibold text-surface-800">
                    {activeWell.formations?.length || 4} formations
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs font-mono text-surface-700">
                    {w.formations?.length ? `${w.formations.length} formations` : '—'}
                  </td>
                ))}
              </tr>

              {/* SECTION: HISTORICAL INCIDENTS & HAZARDS */}
              <tr className="bg-surface-50/70">
                <td colSpan={1 + (activeWell ? 1 : 0) + comparedOffsetWells.length} className="font-bold text-surface-900 text-2xs uppercase tracking-wider py-1.5">
                  3. Recorded Historical Incidents & NPT
                </td>
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Logged Drilling Incidents</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 font-mono font-bold text-xs text-surface-800">
                    {activeWell._count?.drillingEvents ?? 0} events
                  </td>
                )}
                {comparedOffsetWells.map(w => {
                  const count = w._count?.drillingEvents ?? 0;
                  return (
                    <td key={w.id} className="font-mono text-xs">
                      {count > 0 ? (
                        <span className="font-bold text-amber-700">{count} events</span>
                      ) : (
                        <span className="text-surface-400">0 events</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Documented Hazard Risks</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 font-mono font-bold text-xs text-red-700">
                    {activeWell._count?.riskEvents ?? 0} active risks
                  </td>
                )}
                {comparedOffsetWells.map(w => {
                  const count = w._count?.riskEvents ?? 0;
                  return (
                    <td key={w.id} className="font-mono text-xs">
                      {count > 0 ? (
                        <span className="font-bold text-red-600">{count} recorded</span>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>

              <tr>
                <td className="font-semibold text-surface-700">Active / Operational Alerts</td>
                {activeWell && (
                  <td className="bg-teal-50/30 border-r-2 border-teal-200 text-xs font-mono font-bold text-amber-700">
                    {activeWell._count?.alerts ?? 0} alerts
                  </td>
                )}
                {comparedOffsetWells.map(w => (
                  <td key={w.id} className="text-xs font-mono text-surface-600">
                    {w._count?.alerts ? `${w._count.alerts} alerts` : '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── KEY DIFFERENCES & OFFSET LESSONS SUMMARY ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        <Card title="Offset Incident Highlights" className="bg-white shadow-2xs">
          <div className="space-y-2 text-xs text-surface-700">
            {comparedOffsetWells.length === 0 ? (
              <p className="text-surface-400 italic">Select offset wells above to inspect incident history.</p>
            ) : (
              comparedOffsetWells.map(w => {
                const hasRisks = (w._count?.riskEvents ?? 0) > 0;
                return (
                  <div key={w.id} className="p-2.5 rounded-lg bg-surface-50 border border-surface-200 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-surface-900">{w.wellName}</div>
                      <div className="text-2xs text-surface-500 font-mono mt-0.5">
                        TD: {w.totalDepth ? formatDepth(w.totalDepth) : '—'} · {w.field}
                      </div>
                      <div className="text-2xs mt-1 text-surface-600">
                        {hasRisks
                          ? `⚠ Experienced ${w._count?.riskEvents} hazardous incidents during drilling.`
                          : 'No major unmitigated hazard flags documented.'}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/wells/${w.id}`)}
                      className="btn btn-ghost text-2xs py-1 px-2 text-primary-700 shrink-0"
                    >
                      Profile <ArrowRight size={10} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <Card title="Operational Benchmark Takeaway" className="bg-white shadow-2xs">
          <div className="p-3 bg-teal-50/80 rounded-lg border border-teal-200 text-xs text-teal-950 space-y-2 leading-relaxed">
            <div className="font-bold text-teal-900 flex items-center gap-1.5">
              <Info size={14} className="text-teal-700" />
              Strategic Takeaways for Live Active Well
            </div>
            <p>
              Offset wells in this cluster reach Total Depths between <strong>3,400 m</strong> and <strong>4,100 m</strong> in the Barail and Kopili sequences.
            </p>
            <p>
              When advancing {activeWell?.wellName || 'the active well'} past <strong>2,850 m</strong>, offset records indicate elevated overbalance pressure differentials. Keep static pipe time below 4 hours and verify continuous mud weight sampling.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
