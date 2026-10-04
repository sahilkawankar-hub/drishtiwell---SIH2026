import { useState } from 'react';
import {
  Printer, RefreshCw, AlertTriangle, Shield, CheckCircle,
  Layers, MapPin, Droplets, Gauge, Info,
  Calendar, Building2, UserCheck
} from 'lucide-react';
import {
  useActiveWell, useRisks, useAlerts,
  useRecommendations, useActiveWellIntelligence
} from '../hooks/useApi';
import { Loading, ErrorMessage } from '../components/ui/Loading';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import {
  formatDepth, formatDateTime, formatDate,
  getEventTypeLabel, parseJsonField
} from '../lib/utils';
import type { RiskEvent, Alert, Recommendation } from '../types';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'DAILY' | 'PRE_SPUD'>('DAILY');

  const { data: activeWell, isLoading: awLoading, error: awError, refetch: refetchWell } = useActiveWell();
  const { data: risks = [], isLoading: risksLoading, refetch: refetchRisks } = useRisks({ status: 'ACTIVE' });
  const { data: alerts = [], isLoading: alertsLoading, refetch: refetchAlerts } = useAlerts({ status: 'ACTIVE' });
  const { data: recommendations = [], isLoading: recsLoading, refetch: refetchRecs } = useRecommendations();
  const { data: intel } = useActiveWellIntelligence(activeWell?.id);

  const handlePrint = () => {
    window.print();
  };

  const handleRefreshAll = () => {
    refetchWell();
    refetchRisks();
    refetchAlerts();
    refetchRecs();
  };

  if (awLoading || risksLoading || alertsLoading || recsLoading) {
    return <Loading text="Compiling operational drilling report from live data..." />;
  }

  if (awError) {
    return <ErrorMessage error={awError as Error} retry={handleRefreshAll} />;
  }

  const latestParam = activeWell?.drillingParameters?.[0];
  const formations = (activeWell?.formations || []).slice().sort((a, b) => a.topDepth - b.topDepth);
  const currentFormationName = formations.find(f => f.isActive)?.formation.name || activeWell?.currentFormation || 'Barail Group';

  const reportId = `DUL-RPT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`;
  const reportDate = formatDateTime(new Date().toISOString());

  return (
    <div className="space-y-4 max-w-[1200px] mx-auto pb-10">
      {/* ─── PRINT CONTROL TOOLBAR (HIDDEN ON PRINT) ───────────────────────── */}
      <div className="card p-3.5 bg-white border border-surface-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-surface-600">Report Template:</span>
          <div className="flex items-center gap-1 bg-surface-100 p-0.5 rounded-lg border border-surface-200">
            <button
              onClick={() => setReportType('DAILY')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                reportType === 'DAILY' ? 'bg-white text-primary-700 shadow-2xs' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Daily Drilling Intelligence Report
            </button>
            <button
              onClick={() => setReportType('PRE_SPUD')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                reportType === 'PRE_SPUD' ? 'bg-white text-primary-700 shadow-2xs' : 'text-surface-600 hover:text-surface-900'
              }`}
            >
              Pre-Section Hazard Summary
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="btn btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 text-surface-600"
          >
            <RefreshCw size={13} /> Refresh Data
          </button>
          <button
            onClick={handlePrint}
            className="btn btn-primary text-xs py-1.5 px-4 font-semibold flex items-center gap-1.5 shadow-2xs"
          >
            <Printer size={14} /> Print / Save as PDF
          </button>
        </div>
      </div>

      {/* ─── PRINTABLE FORMAL REPORT DOCUMENT CONTAINER ───────────────────── */}
      <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-6 sm:p-8 space-y-6 print:p-0 print:border-none print:shadow-none">
        {/* DOCUMENT HEADER */}
        <div className="border-b-2 border-surface-900 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-surface-600 text-xs font-semibold uppercase tracking-wider mb-1">
                <Building2 size={14} className="text-primary-700" />
                Oil India Limited · eRTMAC-NWIS Advisory System
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-surface-900 tracking-tight">
                {reportType === 'DAILY'
                  ? 'DAILY OPERATIONAL DRILLING & OFFSET HAZARD REPORT'
                  : 'PRE-SECTION STRATIGRAPHIC & HAZARD ADVISORY REPORT'}
              </h1>
              <div className="text-xs text-surface-500 mt-1">
                Asset: <strong>Upper Assam Shelf</strong> · Field: <strong>{activeWell?.field || 'Duliajan'}</strong> · Block: <strong>{activeWell?.block || 'Assam-Arakan'}</strong>
              </div>
            </div>

            <div className="text-left sm:text-right text-xs space-y-1 shrink-0 font-mono">
              <div className="text-surface-400">Report Ref: <strong className="text-surface-800">{reportId}</strong></div>
              <div className="text-surface-400">Generated: <strong className="text-surface-800">{reportDate}</strong></div>
              <div className="text-surface-400">Rig Status: <strong className="text-teal-700 uppercase">{activeWell?.status || 'DRILLING'}</strong></div>
            </div>
          </div>

          {/* SIMULATION / DEMO DATA DISCLAIMER */}
          <div className="mt-4 p-2.5 bg-amber-50/80 border border-amber-200 rounded-md text-2xs text-amber-900 flex items-start gap-2">
            <Info size={14} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold uppercase tracking-wide">Academic Prototype Simulation Advisory: </strong>
              This operational report is compiled by the SIH 2026 eRTMAC-NWIS demonstration system using synthetic sensor streams and historical offset well benchmarks. It is intended for software evaluation and technical demonstration, and is not an officially certified Oil India Limited field record.
            </div>
          </div>
        </div>

        {/* ─── SECTION 1: ACTIVE WELL SUMMARY ──────────────────────────────── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-surface-200">
            <Droplets size={14} className="text-primary-700" />
            1. Active Well Profile & Current Drilling Parameters
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
              <span className="text-2xs text-surface-500 uppercase block mb-0.5">Well Designation</span>
              <span className="font-bold text-surface-900 text-sm">{activeWell?.wellName}</span>
              <span className="text-2xs text-surface-400 font-mono block mt-0.5">{activeWell?.wellId}</span>
            </div>
            <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
              <span className="text-2xs text-surface-500 uppercase block mb-0.5">Current Depth (MD)</span>
              <span className="font-bold text-teal-800 font-mono text-base">{activeWell ? formatDepth(activeWell.currentDepth) : '—'}</span>
              <span className="text-2xs text-surface-500 block mt-0.5">Horizon: {currentFormationName}</span>
            </div>
            <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
              <span className="text-2xs text-surface-500 uppercase block mb-0.5">Planned Total Depth</span>
              <span className="font-bold text-surface-900 font-mono text-sm">{activeWell?.totalDepth ? formatDepth(activeWell.totalDepth) : 'TBD'}</span>
              <span className="text-2xs text-surface-500 block mt-0.5">Trajectory: {activeWell?.wellType || 'Vertical'}</span>
            </div>
            <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
              <span className="text-2xs text-surface-500 uppercase block mb-0.5">Operational Status</span>
              <div className="mt-0.5"><StatusBadge status={activeWell?.status || 'DRILLING'} /></div>
              <span className="text-2xs text-surface-400 block mt-0.5">Operator: {activeWell?.operator || 'Oil India Limited'}</span>
            </div>
          </div>

          {/* Real-Time Parameter Strip */}
          {latestParam && (
            <div className="p-2.5 bg-surface-50/70 rounded-lg border border-surface-200">
              <div className="text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                Current Sensor Stream Readings (Last Recorded telemetry)
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                <div className="p-1.5 bg-white rounded border border-surface-200">
                  <div className="text-3xs text-surface-400 font-sans">WOB</div>
                  <div className="font-bold text-surface-800">{latestParam.wob?.toFixed(1) || '—'} t</div>
                </div>
                <div className="p-1.5 bg-white rounded border border-surface-200">
                  <div className="text-3xs text-surface-400 font-sans">RPM</div>
                  <div className="font-bold text-surface-800">{latestParam.rpm?.toFixed(0) || '—'}</div>
                </div>
                <div className="p-1.5 bg-white rounded border border-surface-200">
                  <div className="text-3xs text-surface-400 font-sans">Torque</div>
                  <div className="font-bold text-amber-700">{latestParam.torque?.toFixed(1) || '—'} kN.m</div>
                </div>
                <div className="p-1.5 bg-white rounded border border-surface-200">
                  <div className="text-3xs text-surface-400 font-sans">ROP</div>
                  <div className="font-bold text-surface-800">{latestParam.rop?.toFixed(1) || '—'} m/hr</div>
                </div>
                <div className="p-1.5 bg-white rounded border border-surface-200">
                  <div className="text-3xs text-surface-400 font-sans">Mud Weight</div>
                  <div className="font-bold text-teal-800">{latestParam.mudWeight?.toFixed(2) || '—'} g/cc</div>
                </div>
                <div className="p-1.5 bg-white rounded border border-surface-200">
                  <div className="text-3xs text-surface-400 font-sans">SPP</div>
                  <div className="font-bold text-surface-800">{latestParam.standpipePressure?.toFixed(0) || '—'} bar</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION 2: ACTIVE RISK REGISTER ─────────────────────────────── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-surface-200">
            <AlertTriangle size={14} className="text-amber-600" />
            2. Active Subsurface Risk Register & Hazard Assessment
          </h2>

          {risks.length === 0 ? (
            <p className="text-xs text-surface-500 italic p-3 bg-surface-50 rounded border border-surface-200">
              No critical or high probability risk hazards currently flagged for active depth horizon.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hazard Type</th>
                    <th>Horizon Depth</th>
                    <th>Formation</th>
                    <th>Severity</th>
                    <th>Probability</th>
                    <th>Primary Mitigation Action</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((risk: RiskEvent) => (
                    <tr key={risk.id}>
                      <td className="font-bold text-xs text-surface-900">{getEventTypeLabel(risk.riskType)}</td>
                      <td className="font-mono text-xs text-surface-700">{formatDepth(risk.depth)}</td>
                      <td className="text-xs text-teal-800 font-semibold">{risk.formation?.name || 'Barail Group'}</td>
                      <td><SeverityBadge severity={risk.severity}>{risk.severity}</SeverityBadge></td>
                      <td className="font-mono font-bold text-xs text-surface-800">{(risk.probability * 100).toFixed(0)}%</td>
                      <td className="text-xs text-surface-800 max-w-sm">{risk.mitigation || 'Maintain parameter surveillance.'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── SECTION 3: CORRELATED OFFSET EVIDENCE ────────────────────────── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-surface-200">
            <Layers size={14} className="text-teal-700" />
            3. Correlated Offset Well Evidence (Depth Horizon Window: ±150m)
          </h2>

          <div className="p-3 bg-surface-50 rounded-lg border border-surface-200 text-xs space-y-2">
            <p className="text-surface-700 leading-relaxed">
              Based on proximity mapping, <strong>{intel?.summary?.totalOffsetWells || 5} offset wells</strong> within a {intel?.summary?.nearestWellKm ? `${intel.summary.nearestWellKm.toFixed(1)} km` : '15 km'} radius share matching stratigraphy with the active wellbore.
            </p>

            <div className="space-y-1.5 pt-1">
              {(intel?.allRelevantEvents || []).slice(0, 4).map((ev) => (
                <div key={ev.id} className="p-2 bg-white rounded border border-surface-200 flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-primary-700">{ev.wellName}</span>
                    <span className="text-surface-600"> recorded <strong>{getEventTypeLabel(ev.eventType)}</strong> at <strong>{formatDepth(ev.depth)}</strong></span>
                    <span className="text-2xs text-surface-500 font-mono ml-2">(Δ depth: {ev.depthDelta >= 0 ? `+${ev.depthDelta}` : ev.depthDelta}m)</span>
                  </div>
                  <SeverityBadge severity={ev.severity}>{ev.severity}</SeverityBadge>
                </div>
              ))}
              {(!intel?.allRelevantEvents || intel.allRelevantEvents.length === 0) && (
                <div className="text-surface-500 italic">Historical incident correlation active across Barail and Kopili horizons.</div>
              )}
            </div>
          </div>
        </div>

        {/* ─── SECTION 4: ACTIVE ALERTS & WARNINGS ──────────────────────────── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-surface-200">
            <AlertTriangle size={14} className="text-red-600" />
            4. Active Predictive Alerts & Operational Action Triggers
          </h2>

          <div className="space-y-2">
            {alerts.slice(0, 3).map((alert: Alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg border border-surface-200 bg-surface-50/70 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={alert.severity}>{alert.severity}</SeverityBadge>
                    <span className="font-bold text-surface-900">{alert.alertType}</span>
                    {alert.depth && <span className="font-mono text-surface-600">@ {formatDepth(alert.depth)}</span>}
                  </div>
                  <span className="text-2xs text-surface-400 font-mono">{formatDate(alert.createdAt)}</span>
                </div>
                <div className="text-surface-800 font-medium">{alert.message}</div>
                {alert.recommendedAction && (
                  <div className="p-2 bg-teal-50 border border-teal-200 rounded text-2xs text-teal-950 font-medium">
                    <strong className="text-teal-800">Action Plan: </strong>{alert.recommendedAction}
                  </div>
                )}
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-xs text-surface-500 italic p-3 bg-surface-50 rounded border border-surface-200">
                No active operational alerts requiring immediate supervisor escalation.
              </div>
            )}
          </div>
        </div>

        {/* ─── SECTION 5: ENGINEERING RECOMMENDATIONS ───────────────────────── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-surface-200">
            <Shield size={14} className="text-primary-700" />
            5. Recommended Engineering Actions & Mitigation Protocols
          </h2>

          <div className="space-y-2 text-xs">
            {recommendations.slice(0, 3).map((rec: Recommendation) => (
              <div key={rec.id} className="p-3 bg-surface-50 rounded-lg border border-surface-200 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-surface-900">{rec.title}</span>
                  <span className="badge badge-info text-2xs">{rec.category.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-surface-700 leading-relaxed">{rec.content}</p>
                {rec.rationale && (
                  <div className="text-2xs text-surface-500 pt-0.5">
                    <strong>Technical Rationale: </strong>{rec.rationale}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ─── SECTION 6: FORMATION COLUMN ──────────────────────────────────── */}
        <div className="space-y-2.5">
          <h2 className="text-xs font-bold text-surface-900 uppercase tracking-wider flex items-center gap-1.5 pb-1 border-b border-surface-200">
            <Layers size={14} className="text-teal-700" />
            6. Stratigraphic Formation Horizon Schedule
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {formations.map((f) => (
              <div
                key={f.id}
                className={`p-2 rounded border ${
                  f.isActive ? 'bg-teal-50 border-teal-300' : 'bg-surface-50 border-surface-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-surface-800">{f.formation.name}</span>
                  {f.isActive && <span className="badge badge-normal text-3xs">Active</span>}
                </div>
                <div className="font-mono text-2xs text-surface-500 mt-0.5">
                  {f.topDepth}–{f.bottomDepth}m
                </div>
                <div className="text-3xs text-surface-400 mt-0.5 truncate">
                  {f.formation.lithology || 'Sandstone/Shale'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── SECTION 7: RIG REVIEW & OPERATIONAL SIGN-OFF (PRINT-FRIENDLY) ─── */}
        <div className="pt-6 border-t-2 border-surface-300 space-y-3">
          <div className="text-2xs font-bold uppercase tracking-wider text-surface-500">
            7. Operational Verification & Sign-Off Block
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
            <div className="p-3 rounded border border-surface-300 bg-surface-50/50 h-24 flex flex-col justify-between">
              <span className="text-2xs text-surface-500">Drilling Superintendent</span>
              <div className="border-b border-surface-400 border-dashed pb-1 text-2xs text-surface-400">Signature / Stamp</div>
            </div>
            <div className="p-3 rounded border border-surface-300 bg-surface-50/50 h-24 flex flex-col justify-between">
              <span className="text-2xs text-surface-500">Rig Toolpusher</span>
              <div className="border-b border-surface-400 border-dashed pb-1 text-2xs text-surface-400">Signature / Date</div>
            </div>
            <div className="p-3 rounded border border-surface-300 bg-surface-50/50 h-24 flex flex-col justify-between">
              <span className="text-2xs text-surface-500">Lead Geologist / Mud Engr</span>
              <div className="border-b border-surface-400 border-dashed pb-1 text-2xs text-surface-400">Verification Code</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
