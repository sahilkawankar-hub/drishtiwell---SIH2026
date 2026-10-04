import { useState, useMemo } from 'react';
import { Card, MetricCard } from '../components/ui/Card';
import { useWells, useFormations, useActiveWell } from '../hooks/useApi';
import { Loading, ErrorMessage } from '../components/ui/Loading';
import { formatDepth } from '../lib/utils';
import { Layers, MapPin, Info, ChevronRight, Eye } from 'lucide-react';
import type { Formation, WellFormation } from '../types';

const FORMATION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  FRM_ALLUVIUM: { bg: '#f1f5f9', border: '#94a3b8', text: '#334155' },
  FRM_TIPAM:    { bg: '#fef3c7', border: '#d97706', text: '#92400e' },
  FRM_GIRUJAN:  { bg: '#ede9fe', border: '#7c3aed', text: '#5b21b6' },
  FRM_BARAIL:   { bg: '#ccfbf1', border: '#0d9488', text: '#115e59' },
  FRM_KOPILI:   { bg: '#fee2e2', border: '#dc2626', text: '#991b1b' },
  FRM_SYLHET:   { bg: '#e0f2fe', border: '#0284c7', text: '#075985' },
  FRM_JAINTIA:  { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
};

export default function CorrelationPage() {
  const { data: activeWell } = useActiveWell();
  const { data: wells = [], isLoading: wl, error: we } = useWells();
  const { data: formations = [], isLoading: fl, error: fe } = useFormations();

  const [selectedFormationCode, setSelectedFormationCode] = useState<string | null>(null);
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);
  const [filterField, setFilterField] = useState<string>('ALL');

  // Filter wells by field if requested
  const filteredWells = useMemo(() => {
    let list = [...wells];
    if (filterField !== 'ALL') {
      list = list.filter(w => w.field === filterField);
    }
    // Put active well first if present
    if (activeWell) {
      list = [activeWell, ...list.filter(w => w.id !== activeWell.id)];
    }
    return list.slice(0, 8); // max 8 columns for clean 1366x768 horizontal layout
  }, [wells, activeWell, filterField]);

  const maxDepth = useMemo(() => {
    const depths = wells.flatMap(w => [
      w.totalDepth || 0,
      w.currentDepth || 0,
      ...(w.formations?.map(f => f.bottomDepth) || [])
    ]);
    return Math.max(...depths, 4200);
  }, [wells]);

  const chartHeightPx = 460;
  const depthTicks = useMemo(() => {
    return [0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000].filter(d => d <= maxDepth);
  }, [maxDepth]);

  if (wl || fl) return <Loading text="Loading stratigraphic correlation data..." />;
  if (we || fe) return <ErrorMessage error={(we || fe) as Error} />;

  const selectedFormation = formations.find(f => f.code === selectedFormationCode);
  const selectedWell = wells.find(w => w.id === selectedWellId) || activeWell;

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── HEADER BANNER ─────────────────────────────────────────────────── */}
      <div className="card p-4 bg-white border-l-4 border-l-primary-600 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-surface-900 font-bold text-base">Stratigraphic & Formation Correlation</h1>
                <span className="badge badge-info text-2xs">Subsurface Mapping</span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Multi-well stratigraphic correlation across depth. Compare formation boundaries, reservoir thickness, and regional dip across the Upper Assam Basin.
              </p>
            </div>
          </div>

          {/* Field Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-surface-500">Asset:</span>
            <select
              value={filterField}
              onChange={(e) => setFilterField(e.target.value)}
              className="form-input text-xs py-1 w-36"
            >
              <option value="ALL">All Fields ({wells.length})</option>
              {Array.from(new Set(wells.map(w => w.field).filter(Boolean))).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Geological Link Callout */}
        <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center gap-2 text-2xs text-teal-900 bg-teal-50/70 p-2 rounded border border-teal-200/80">
          <Info size={13} className="text-teal-700 shrink-0" />
          <span>
            <strong>Stratigraphic Insight:</strong> The <strong>Barail Group</strong> (teal) forms the primary reservoir sandstones in Duliajan. Note the regional depth plunge from Nahorkatia to Moran, requiring mud weight adjustments when crossing the Kopili boundary.
          </span>
        </div>
      </div>

      {/* ─── SUMMARY KPIS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Correlated Wells"
          value={filteredWells.length}
          sub={`${wells.length} total wells in database`}
          icon={<Layers size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Mapped Formations"
          value={formations.length}
          sub="Alluvium to Jaintia sequences"
          icon={<Layers size={18} />}
          color="#0d9488"
        />
        <MetricCard
          label="Deepest Penetration"
          value={`${formatDepth(maxDepth)}`}
          sub="Maximum stratigraphic horizon"
          color="#ea580c"
        />
        <MetricCard
          label="Target Reservoir"
          value={<span className="text-teal-800 text-sm font-bold">Barail Group</span>}
          sub="Oligocene productive sandstones"
          color="#16a34a"
        />
      </div>

      {/* ─── FORMATION LEGEND BAR ───────────────────────────────────────────── */}
      <Card noPadding className="bg-white shadow-2xs p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xs font-bold uppercase tracking-wider text-surface-500">
            Formations:
          </span>
          {formations.map(f => {
            const colors = FORMATION_COLORS[f.code] || { bg: '#f1f5f9', border: '#64748b', text: '#334155' };
            const isSelected = selectedFormationCode === f.code;

            return (
              <button
                key={f.id}
                onClick={() => setSelectedFormationCode(isSelected ? null : f.code)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-all border ${
                  isSelected
                    ? 'ring-2 ring-primary-500 font-bold shadow-xs'
                    : 'hover:bg-surface-50'
                }`}
                style={{
                  backgroundColor: colors.bg,
                  borderColor: colors.border,
                  color: colors.text,
                }}
              >
                <div style={{ width: 9, height: 9, background: colors.border, borderRadius: 2 }} />
                <span>{f.name}</span>
              </button>
            );
          })}

          {selectedFormationCode && (
            <button
              onClick={() => setSelectedFormationCode(null)}
              className="text-2xs text-surface-500 hover:text-surface-800 underline ml-auto"
            >
              Clear highlight
            </button>
          )}
        </div>
      </Card>

      {/* ─── MAIN CORRELATION CHART PANEL ──────────────────────────────────── */}
      <Card
        title="Cross-Well Subsurface Formation Depth Log"
        subtitle="Depth in meters True Vertical / Measured Depth (MD) across offset wells"
        className="bg-white shadow-2xs"
        noPadding
      >
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {/* 1. Depth Axis Column */}
            <div className="w-16 flex-shrink-0 flex flex-col items-end pr-2 pt-16">
              <div className="text-2xs font-bold text-surface-500 mb-1 text-right">Depth (m)</div>
              <div className="relative w-full" style={{ height: chartHeightPx }}>
                {depthTicks.map(d => {
                  const topPct = (d / maxDepth) * 100;
                  return (
                    <div
                      key={d}
                      style={{ top: `${topPct}%` }}
                      className="absolute right-0 -translate-y-1/2 flex items-center gap-1"
                    >
                      <span className="text-2xs font-mono font-semibold text-surface-500">{d}</span>
                      <div className="w-2 h-px bg-surface-300" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Well Columns Container with Background Gridlines */}
            <div className="relative flex gap-3 flex-1">
              {/* Background Depth Gridlines running across all columns */}
              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ top: '64px', height: chartHeightPx }}>
                {depthTicks.map(d => {
                  const topPct = (d / maxDepth) * 100;
                  return (
                    <div
                      key={d}
                      style={{ top: `${topPct}%` }}
                      className="absolute inset-x-0 border-b border-surface-200/60"
                    />
                  );
                })}
              </div>

              {/* Individual Well Columns */}
              {filteredWells.map(well => {
                const isLiveActive = well.id === activeWell?.id;
                const wf = well.formations || [];
                const sorted = [...wf].sort((a, b) => a.topDepth - b.topDepth);
                const isWellSelected = selectedWellId === well.id;

                return (
                  <div
                    key={well.id}
                    onClick={() => setSelectedWellId(well.id)}
                    className={`w-32 flex-shrink-0 flex flex-col p-2 rounded-lg transition-all cursor-pointer ${
                      isLiveActive
                        ? 'bg-teal-50/40 border border-teal-300'
                        : isWellSelected
                        ? 'bg-primary-50/30 border border-primary-300'
                        : 'bg-surface-50/50 hover:bg-surface-100/50 border border-transparent'
                    }`}
                  >
                    {/* Well Header */}
                    <div className="text-center mb-2 pb-1.5 border-b border-surface-200">
                      <div className="flex items-center justify-center gap-1">
                        {isLiveActive && <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />}
                        <div
                          className={`text-xs font-bold truncate ${
                            isLiveActive ? 'text-teal-900' : 'text-surface-900'
                          }`}
                          title={well.wellName}
                        >
                          {well.wellName.replace('Duliajan-', 'DUL-').replace('Nahorkatia-', 'NAH-').replace('Moran-', 'MOR-')}
                        </div>
                      </div>
                      <div className="text-2xs text-surface-500 font-mono">
                        {well.wellId}
                      </div>
                      <div className="text-2xs text-surface-600 font-medium">
                        {formatDepth(well.currentDepth)}
                      </div>
                    </div>

                    {/* Stratigraphic Column Bar */}
                    <div
                      className="relative rounded-md border border-surface-300 overflow-hidden shadow-2xs"
                      style={{ height: chartHeightPx, width: '100%', background: '#f8fafc' }}
                    >
                      {sorted.map(wff => {
                        const topPct = (wff.topDepth / maxDepth) * 100;
                        const heightPct = Math.max(((wff.bottomDepth - wff.topDepth) / maxDepth) * 100, 3);
                        const colors = FORMATION_COLORS[wff.formation.code] || { bg: '#f1f5f9', border: '#64748b', text: '#334155' };
                        const isHighlighted = selectedFormationCode === wff.formation.code;

                        return (
                          <div
                            key={wff.id}
                            style={{
                              position: 'absolute',
                              top: `${topPct}%`,
                              height: `${heightPct}%`,
                              width: '100%',
                              backgroundColor: isHighlighted ? `${colors.border}35` : colors.bg,
                              borderTop: `1.5px solid ${colors.border}`,
                              borderBottom: `1px solid ${colors.border}40`,
                              opacity: selectedFormationCode && !isHighlighted ? 0.45 : 1,
                            }}
                            className="flex flex-col items-center justify-center p-0.5 text-center transition-opacity"
                            title={`${wff.formation.name}\nInterval: ${wff.topDepth}–${wff.bottomDepth}m\nThickness: ${wff.bottomDepth - wff.topDepth}m`}
                          >
                            {heightPct > 6 && (
                              <span
                                style={{ color: colors.text }}
                                className="text-2xs font-bold leading-tight truncate px-1"
                              >
                                {wff.formation.name}
                              </span>
                            )}
                            {heightPct > 10 && (
                              <span style={{ color: colors.text }} className="text-3xs font-mono opacity-80">
                                {wff.topDepth}–{wff.bottomDepth}m
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Current Depth Indicator Line */}
                      {well.currentDepth > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: `${(well.currentDepth / maxDepth) * 100}%`,
                            width: '100%',
                            borderBottom: '2px dashed #0d9488',
                            zIndex: 10,
                          }}
                          title={`Current Depth: ${formatDepth(well.currentDepth)}`}
                        />
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="text-center mt-2 text-2xs text-surface-500 font-mono">
                      TD: {well.totalDepth ? formatDepth(well.totalDepth) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* ─── SELECTED FORMATION / WELL DETAIL DRAWER ───────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Formation Details */}
        <Card title="Formation Profile & Lithology" className="bg-white shadow-2xs">
          {selectedFormation ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-xs shrink-0"
                  style={{ background: FORMATION_COLORS[selectedFormation.code]?.border || '#0d9488' }}
                />
                <h3 className="text-sm font-bold text-surface-900">{selectedFormation.name}</h3>
                <span className="badge badge-info text-2xs font-mono">{selectedFormation.code}</span>
              </div>
              <p className="text-surface-700 leading-relaxed">{selectedFormation.description}</p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-2xs">
                <div className="p-2 rounded bg-surface-50 border border-surface-200">
                  <span className="text-surface-400 block mb-0.5">Geological Era</span>
                  <span className="font-semibold text-surface-800">{selectedFormation.ageEra || 'Upper Assam'}</span>
                </div>
                <div className="p-2 rounded bg-surface-50 border border-surface-200">
                  <span className="text-surface-400 block mb-0.5">Lithology</span>
                  <span className="font-semibold text-surface-800">{selectedFormation.lithology || 'Sandstone / Shale'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-surface-400">
              Click any formation badge in the key above to view lithology, geological age, and regional reservoir properties.
            </div>
          )}
        </Card>

        {/* Selected Well Summary */}
        <Card title="Well Stratigraphy Summary" className="bg-white shadow-2xs">
          {selectedWell ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-surface-900 text-sm">{selectedWell.wellName}</div>
                  <div className="text-2xs text-surface-500 font-mono">{selectedWell.wellId} · {selectedWell.field}</div>
                </div>
                <div className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200">
                  {formatDepth(selectedWell.currentDepth)}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider">
                  Stratigraphic Column ({selectedWell.formations?.length || 0} intervals):
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {(selectedWell.formations || []).map(wf => (
                    <div
                      key={wf.id}
                      className="flex items-center justify-between p-1.5 rounded bg-surface-50 border border-surface-200 text-2xs"
                    >
                      <span className="font-semibold text-surface-800">{wf.formation.name}</span>
                      <span className="font-mono text-surface-600">
                        {wf.topDepth}–{wf.bottomDepth}m ({wf.bottomDepth - wf.topDepth}m thick)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-surface-400">
              Select any well column to view its detailed formation depths.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
