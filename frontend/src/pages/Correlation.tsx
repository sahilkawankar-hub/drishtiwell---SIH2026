import { Card } from '../components/ui/Card';
import { useWells, useFormations } from '../hooks/useApi';
import { Loading } from '../components/ui/Loading';
import { formatDepth } from '../lib/utils';
import { Layers } from 'lucide-react';

const FORMATION_COLORS: Record<string, string> = {
  FRM_ALLUVIUM: '#94a3b8',
  FRM_TIPAM:    '#d97706',
  FRM_GIRUJAN:  '#7c3aed',
  FRM_BARAIL:   '#0d9488',
  FRM_KOPILI:   '#dc2626',
  FRM_SYLHET:   '#0284c7',
  FRM_JAINTIA:  '#6366f1',
};

export default function CorrelationPage() {
  const { data: wells = [], isLoading: wl } = useWells();
  const { data: formations = [], isLoading: fl } = useFormations();

  if (wl || fl) return <Loading text="Loading correlation data..." />;

  const maxDepth = Math.max(...wells.map(w => w.totalDepth || w.currentDepth || 0), 4500);
  const displayWells = wells.slice(0, 8);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      <div className="card p-4 flex items-center gap-3 bg-white shadow-2xs border-l-4 border-l-primary-600">
        <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
          <Layers size={20} className="text-primary-700" />
        </div>
        <div>
          <div className="text-surface-900 font-bold text-base">Formation & Stratigraphic Correlation</div>
          <div className="text-xs text-surface-500">
            Cross-well stratigraphic correlation across depth. Each column represents a well with intervals color-coded by lithology.
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-3 flex items-center gap-4 flex-wrap bg-white shadow-2xs">
        <span className="text-2xs font-bold uppercase tracking-wider text-surface-500">Formation Key:</span>
        {formations.map(f => (
          <div key={f.id} className="flex items-center gap-1.5">
            <div style={{ width: 12, height: 12, background: FORMATION_COLORS[f.code] || '#64748b', borderRadius: 2 }} />
            <span className="text-xs text-surface-700 font-medium">{f.name}</span>
          </div>
        ))}
      </div>

      {/* Correlation Panel */}
      <Card title="Well-to-Well Formation Depth Log" subtitle={`${displayWells.length} wells across Duliajan field`} className="bg-white shadow-sm" noPadding>
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-4 min-w-max">
            {/* Depth axis */}
            <div className="w-16 flex-shrink-0">
              <div className="text-2xs font-semibold text-surface-500 mb-2 text-center">Depth (m)</div>
              {[0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000].filter(d => d <= maxDepth + 200).map(d => (
                <div key={d} style={{ height: `${(500 / maxDepth) * 100}px`, minHeight: 40 }} className="flex items-start justify-end pr-2 border-r border-surface-200">
                  <span className="text-2xs text-surface-500 font-mono font-medium">{d}</span>
                </div>
              ))}
            </div>

            {/* Well columns */}
            {displayWells.map(well => {
              const height = 400;
              const wf = well.formations || [];
              const sorted = [...wf].sort((a, b) => a.topDepth - b.topDepth);

              return (
                <div key={well.id} className="w-24 flex-shrink-0 flex flex-col">
                  <div className="text-2xs text-center text-surface-800 mb-2 font-bold truncate" title={well.wellName}>
                    {well.wellName.replace('Duliajan-', 'DUL-').replace('Nahorkatia-', 'NAH-').replace('Moran-', 'MOR-')}
                  </div>
                  <div
                    className="relative rounded-md border border-surface-200 overflow-hidden shadow-2xs"
                    style={{ height, width: '100%', background: '#f8fafc' }}
                  >
                    {sorted.map(wff => {
                      const topPct = (wff.topDepth / maxDepth) * 100;
                      const heightPct = ((wff.bottomDepth - wff.topDepth) / maxDepth) * 100;
                      const color = FORMATION_COLORS[wff.formation.code] || '#64748b';
                      return (
                        <div
                          key={wff.id}
                          style={{
                            position: 'absolute',
                            top: `${topPct}%`,
                            height: `${heightPct}%`,
                            width: '100%',
                            backgroundColor: `${color}30`,
                            borderTop: `1.5px solid ${color}`,
                            borderBottom: `1px solid ${color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title={`${wff.formation.name}: ${wff.topDepth}-${wff.bottomDepth}m`}
                        >
                          {heightPct > 8 && (
                            <span style={{ fontSize: '9px', color: '#0f172a', fontWeight: 700 }}>
                              {wff.formation.name.slice(0, 4)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {/* Current depth indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        top: `${(well.currentDepth / maxDepth) * 100}%`,
                        width: '100%',
                        borderBottom: '2px dashed #0d9488',
                      }}
                      title={`Current Depth: ${formatDepth(well.currentDepth)}`}
                    />
                  </div>
                  <div className="text-2xs text-center text-surface-600 mt-1 font-mono font-semibold">
                    {formatDepth(well.currentDepth)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}
