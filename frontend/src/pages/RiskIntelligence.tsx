import { useState } from 'react';
import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { useRisks } from '../hooks/useApi';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Card, MetricCard } from '../components/ui/Card';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { formatDepth, formatPercent, getEventTypeLabel, parseJsonField, getRiskTypeLabel } from '../lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';

const RISK_COLORS: Record<string, string> = {
  MUD_LOSS:        '#0284c7',
  STUCK_PIPE:      '#dc2626',
  OVERPRESSURE:    '#ea580c',
  TORQUE_SPIKE:    '#d97706',
  CEMENTING_ISSUE: '#0d9488',
};

export default function RiskIntelligencePage() {
  const [selectedRisk, setSelectedRisk] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');

  const { data: risks = [], isLoading, error, refetch } = useRisks({
    status: filter !== 'ALL' ? filter : undefined,
  });

  if (isLoading) return <Loading text="Loading risk analysis..." />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  const activeRisks = risks.filter(r => r.status === 'ACTIVE');
  const critRisks = risks.filter(r => r.severity === 'CRITICAL');
  const highRisks = risks.filter(r => r.severity === 'HIGH');

  // Radar chart data
  const riskTypes = ['MUD_LOSS', 'STUCK_PIPE', 'OVERPRESSURE', 'TORQUE_SPIKE', 'CEMENTING_ISSUE'];
  const radarData = riskTypes.map(rt => {
    const risk = risks.find(r => r.riskType === rt && r.status === 'ACTIVE');
    return {
      type: getRiskTypeLabel(rt).replace('/', '/\n'),
      probability: risk ? Math.round(risk.probability * 100) : 0,
    };
  });

  // Bar chart
  const barData = risks.map(r => ({
    name: getRiskTypeLabel(r.riskType),
    probability: Math.round(r.probability * 100),
    fill: RISK_COLORS[r.riskType] || '#64748b',
  }));

  const selected = risks.find(r => r.id === selectedRisk);

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Active Risks" value={activeRisks.length} icon={<AlertTriangle size={18} />} color="#ea580c" />
        <MetricCard label="Critical Risks" value={critRisks.length} icon={<AlertTriangle size={18} />} color="#dc2626" />
        <MetricCard label="High Risks" value={highRisks.length} icon={<Shield size={18} />} color="#ea580c" />
        <MetricCard label="Monitoring" value={risks.filter(r => r.status === 'MONITORING').length} icon={<TrendingUp size={18} />} color="#d97706" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Risk Probability by Type" subtitle="Active risk events at current depth horizon" className="bg-white">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }} width={120} />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#0f172a'
                }}
                formatter={(v: unknown) => [`${v}%`, 'Probability']}
              />
              <Bar dataKey="probability" radius={[0, 4, 4, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Multi-Risk Radar Envelope" subtitle="Composite multidimensional hazard distribution" className="bg-white">
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="type" tick={{ fill: '#334155', fontSize: 10, fontWeight: 500 }} />
              <Radar
                name="Risk Probability (%)"
                dataKey="probability"
                stroke="#0284c7"
                fill="#0284c7"
                fillOpacity={0.25}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '11px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  color: '#0f172a'
                }}
                formatter={(v: unknown) => [`${v}%`, 'Probability']}
              />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Risk Filter */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 bg-surface-100 border border-surface-200 rounded-lg p-0.5">
          {['ALL', 'ACTIVE', 'MONITORING', 'RESOLVED'].map(s => (
            <button
              key={s}
              id={`risk-filter-${s.toLowerCase()}`}
              onClick={() => setFilter(s)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                filter === s ? 'bg-white text-primary-700 shadow-xs' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {risks.length === 0 && <EmptyState message="No risk events found" />}

      {/* Risk Table & Detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card title="Risk Events Register" className="xl:col-span-2 bg-white" noPadding>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Risk Type</th>
                  <th>Depth</th>
                  <th>Severity</th>
                  <th>Probability</th>
                  <th>Evidence</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {risks.map(risk => {
                  const evidence = parseJsonField<string[]>(risk.evidence, []);
                  const refs = parseJsonField<string[]>(risk.historicalRefs, []);
                  const isSelected = selectedRisk === risk.id;
                  return (
                    <tr
                      key={risk.id}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary-50/70 border-l-[3px] border-primary-600' : ''}`}
                      onClick={() => setSelectedRisk(isSelected ? null : risk.id)}
                    >
                      <td className="font-bold text-surface-900 text-xs">{getEventTypeLabel(risk.riskType)}</td>
                      <td className="font-mono text-surface-800 text-xs">{formatDepth(risk.depth)}</td>
                      <td><SeverityBadge severity={risk.severity}>{risk.severity}</SeverityBadge></td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-surface-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${risk.probability * 100}%`,
                                backgroundColor: risk.probability > 0.6 ? '#dc2626' : risk.probability > 0.4 ? '#d97706' : '#16a34a',
                              }}
                            />
                          </div>
                          <span className="text-xs font-mono font-semibold text-surface-800">{formatPercent(risk.probability)}</span>
                        </div>
                      </td>
                      <td className="text-surface-500 text-xs">{evidence.length} pts / {refs.length} wells</td>
                      <td><StatusBadge status={risk.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Risk Detail */}
        <Card title={selected ? getEventTypeLabel(selected.riskType) : 'Risk Details'} subtitle="Select a risk row to inspect evidence" className="bg-white">
          {!selected ? (
            <div className="py-12 text-center text-surface-400 text-xs">
              Click any risk event in the register to view correlated offset well evidence and mitigation actions.
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={selected.severity}>{selected.severity}</SeverityBadge>
                <StatusBadge status={selected.status} />
                <span className="text-xs font-mono text-surface-600 font-semibold">{formatDepth(selected.depth)}</span>
              </div>

              <div>
                <div className="text-2xs font-bold text-surface-500 uppercase tracking-wider mb-1">Calculated Probability</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all"
                      style={{
                        width: `${selected.probability * 100}%`,
                        backgroundColor: selected.probability > 0.6 ? '#dc2626' : '#d97706',
                      }}
                    />
                  </div>
                  <span className="text-base font-bold font-mono text-surface-900">{formatPercent(selected.probability)}</span>
                </div>
              </div>

              {parseJsonField<string[]>(selected.evidence, []).length > 0 && (
                <div>
                  <div className="text-2xs font-bold text-surface-500 uppercase tracking-wider mb-1">Offset Evidence</div>
                  <div className="space-y-1">
                    {parseJsonField<string[]>(selected.evidence, []).map((e, i) => (
                      <div key={i} className="text-xs text-surface-700 bg-surface-50 p-1.5 rounded border border-surface-200 flex gap-1.5">
                        <span className="text-primary-600 font-bold">→</span>
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parseJsonField<string[]>(selected.historicalRefs, []).length > 0 && (
                <div>
                  <div className="text-2xs font-bold text-surface-500 uppercase tracking-wider mb-1">Referenced Offset Wells</div>
                  <div className="flex flex-wrap gap-1">
                    {parseJsonField<string[]>(selected.historicalRefs, []).map((ref) => (
                      <span key={ref} className="badge badge-info text-2xs">{ref}</span>
                    ))}
                  </div>
                </div>
              )}

              {selected.mitigation && (
                <div>
                  <div className="text-2xs font-bold text-teal-800 uppercase tracking-wider mb-1">Recommended Mitigation</div>
                  <div className="text-xs text-teal-900 bg-teal-50 rounded-md p-2.5 border border-teal-200 leading-relaxed font-medium">
                    {selected.mitigation}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
