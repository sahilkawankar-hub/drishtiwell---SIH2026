import { GitCompare } from 'lucide-react';
import { useWells, useActiveWell } from '../hooks/useApi';
import { Loading } from '../components/ui/Loading';
import { StatusBadge } from '../components/ui/Badge';
import { formatDepth } from '../lib/utils';
import { Card } from '../components/ui/Card';

export default function ComparisonPage() {
  const { data: activeWell } = useActiveWell();
  const { data: wells = [], isLoading } = useWells();

  if (isLoading) return <Loading text="Loading wells for comparison..." />;

  const offsetWells = wells.filter(w => !w.isActive).slice(0, 5);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      <div className="card p-4 flex items-center gap-3 bg-white shadow-2xs border-l-4 border-l-primary-600">
        <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
          <GitCompare size={20} className="text-primary-700" />
        </div>
        <div>
          <div className="text-surface-900 font-bold text-base">Well Benchmarking & Comparison</div>
          <div className="text-xs text-surface-500">
            Side-by-side comparative parameters for active well against historical offset wells in Duliajan field.
          </div>
        </div>
      </div>

      {activeWell && (
        <Card title="Comparative Parameter Matrix" subtitle="Active well vs top 5 offset wells" className="bg-white shadow-sm" noPadding>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-48">Parameter</th>
                  <th className="bg-teal-50/70 text-teal-900 font-bold border-r border-teal-100">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      {activeWell.wellName} (Active)
                    </span>
                  </th>
                  {offsetWells.map(w => (
                    <th key={w.id} className="text-surface-700 font-semibold">{w.wellName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Field', key: 'field' as const },
                  { label: 'Block', key: 'block' as const },
                  { label: 'Status', key: 'status' as const },
                  { label: 'Well Type', key: 'wellType' as const },
                  { label: 'Current Depth', key: 'currentDepth' as const },
                  { label: 'Total Depth', key: 'totalDepth' as const },
                  { label: 'Current Formation', key: 'currentFormation' as const },
                ].map(row => (
                  <tr key={row.label}>
                    <td className="font-semibold text-surface-700 bg-surface-50/50">{row.label}</td>
                    <td className="bg-teal-50/30 text-teal-900 font-bold border-r border-teal-100 font-mono">
                      {row.key === 'currentDepth' || row.key === 'totalDepth'
                        ? (activeWell[row.key] ? formatDepth(activeWell[row.key] as number) : '—')
                        : row.key === 'status'
                        ? <StatusBadge status={activeWell.status} />
                        : (activeWell[row.key] || '—')}
                    </td>
                    {offsetWells.map(w => (
                      <td key={w.id} className="text-surface-700 font-mono text-xs">
                        {row.key === 'currentDepth' || row.key === 'totalDepth'
                          ? (w[row.key] ? formatDepth(w[row.key] as number) : '—')
                          : row.key === 'status'
                          ? <StatusBadge status={w.status} />
                          : (w[row.key] || '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
