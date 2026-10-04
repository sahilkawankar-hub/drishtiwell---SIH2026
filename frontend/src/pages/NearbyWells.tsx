import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, AlertTriangle, X, Navigation, ChevronRight,
} from 'lucide-react';
import { useActiveWell, useNearbyWellsIntelligence, useFormations } from '../hooks/useApi';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { Card } from '../components/ui/Card';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import {
  formatDepth, formatDate, getEventTypeLabel,
  getSeverityTextColor, clsx,
} from '../lib/utils';
import type { NearbyWell, NearbyWellsFilters } from '../types';

// ─── Fix leaflet default icon paths ───────────────────────────────────────────
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ─── Map Icons ───────────────────────────────────────────────────────────────
function makeActiveIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:inline-flex;align-items:center;gap:4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));cursor:pointer;">
        <div style="width:18px;height:18px;background:#0d9488;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 0 2px #0f766e;"></div>
        <span style="background:#0f766e;color:#ffffff;font-size:10px;font-weight:700;font-family:Inter,sans-serif;padding:1px 5px;border-radius:4px;">ACTIVE</span>
      </div>`,
    iconSize: [80, 24],
    iconAnchor: [9, 12],
  });
}

function makeWellMarkerIcon(isSelected: boolean, isHighRisk: boolean) {
  if (isSelected) {
    return L.divIcon({
      className: '',
      html: `<div style="width:18px;height:18px;background:#d97706;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 0 2px #b45309, 0 2px 6px rgba(0,0,0,0.25);cursor:pointer;"></div>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }
  if (isHighRisk) {
    return L.divIcon({
      className: '',
      html: `
        <div style="display:inline-flex;align-items:center;gap:3px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.25));cursor:pointer;">
          <div style="width:14px;height:14px;background:#dc2626;border:2px solid #ffffff;border-radius:50%;"></div>
          <span style="background:#dc2626;color:#ffffff;font-size:9px;font-weight:700;font-family:Inter,sans-serif;padding:0.5px 3.5px;border-radius:3px;">RISK</span>
        </div>`,
      iconSize: [50, 18],
      iconAnchor: [7, 9],
    });
  }
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;background:#0284c7;border:2px solid #ffffff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.25);cursor:pointer;"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// ─── Map Centerer ────────────────────────────────────────────────────────────
function MapCenterer({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 11);
    map.invalidateSize();
  }, [lat, lng, map]);
  return null;
}

// ─── Well Detail Panel ───────────────────────────────────────────────────────
function WellPanel({
  well,
  onClose,
  onView,
}: {
  well: NearbyWell;
  onClose: () => void;
  onView: () => void;
}) {
  const formations = (well.formations ?? []).sort((a, b) => a.topDepth - b.topDepth);
  const activeFormation = formations.find(f => f.isActive);
  const hasRisk = (well._count?.riskEvents ?? 0) > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start justify-between p-3 border-b border-surface-200">
        <div>
          <div className="text-surface-900 font-bold text-sm">{well.wellName}</div>
          <div className="text-surface-400 text-xs">{well.wellId} · {well.wellType}</div>
        </div>
        <button onClick={onClose} className="text-surface-400 hover:text-surface-700 p-1 rounded hover:bg-surface-50">
          <X size={16} />
        </button>
      </div>

      {/* Distance + Status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-50 border-b border-surface-200">
        <Navigation size={12} className="text-primary-600" />
        <span className="text-primary-800 font-mono font-bold text-sm">{well.distanceKm.toFixed(2)} km</span>
        <span className="text-surface-400 text-xs">away</span>
        <div className="ml-auto"><StatusBadge status={well.status} /></div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Key Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Field', value: well.field },
            { label: 'Block', value: well.block },
            { label: 'Depth', value: formatDepth(well.currentDepth) },
            { label: 'TD', value: well.totalDepth ? formatDepth(well.totalDepth) : '—' },
            { label: 'Operator', value: well.operator },
            { label: 'Formation', value: activeFormation?.formation.name ?? well.currentFormation ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-50 rounded p-1.5 border border-surface-200/80">
              <div className="text-2xs text-surface-400">{label}</div>
              <div className="text-xs text-surface-800 font-medium truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-50 rounded p-1.5 text-center border border-surface-200/80">
            <div className="text-sm font-bold font-mono text-surface-800">{well._count?.drillingEvents ?? 0}</div>
            <div className="text-2xs text-surface-400">Events</div>
          </div>
          <div className={clsx('rounded p-1.5 text-center border', hasRisk ? 'bg-red-50 border-red-200' : 'bg-surface-50 border-surface-200/80')}>
            <div className={clsx('text-sm font-bold font-mono', hasRisk ? 'text-red-700' : 'text-surface-800')}>
              {well._count?.riskEvents ?? 0}
            </div>
            <div className="text-2xs text-surface-400">Risks</div>
          </div>
          <div className="bg-surface-50 rounded p-1.5 text-center border border-surface-200/80">
            <div className="text-sm font-bold font-mono text-surface-800">{formations.length}</div>
            <div className="text-2xs text-surface-400">Formations</div>
          </div>
        </div>

        {/* Formations */}
        {formations.length > 0 && (
          <div>
            <div className="text-2xs text-surface-400 font-medium mb-1">Formations</div>
            <div className="space-y-0.5">
              {formations.map(wf => (
                <div
                  key={wf.id}
                  className={clsx(
                    'flex items-center gap-2 px-2 py-1 rounded text-xs border',
                    wf.isActive ? 'bg-teal-50 border-teal-200 text-teal-900' : 'bg-surface-50 border-surface-200 text-surface-600'
                  )}
                >
                  <span className="font-mono text-2xs text-surface-400 w-20 shrink-0">
                    {wf.topDepth}–{wf.bottomDepth}m
                  </span>
                  <span className="truncate">{wf.formation.name}</span>
                  {wf.isActive && <span className="ml-auto badge badge-normal text-2xs shrink-0">Active</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drilling Events */}
        {well.drillingEvents && well.drillingEvents.length > 0 && (
          <div>
            <div className="text-2xs text-surface-400 font-medium mb-1">Historical Events</div>
            <div className="space-y-1">
              {well.drillingEvents.slice(0, 5).map(ev => (
                <div key={ev.id} className="flex items-start gap-2 bg-surface-50 border border-surface-200 rounded p-1.5 text-xs">
                  <AlertTriangle size={11} className={clsx('mt-0.5 shrink-0', getSeverityTextColor(ev.severity))} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-surface-800">{getEventTypeLabel(ev.eventType)}</div>
                    <div className="text-2xs text-surface-400">{formatDepth(ev.depth)} · {formatDate(ev.timestamp)}</div>
                  </div>
                  <SeverityBadge severity={ev.severity} showDot={false}>{ev.severity}</SeverityBadge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Events */}
        {well.riskEvents && well.riskEvents.length > 0 && (
          <div>
            <div className="text-2xs text-red-600 font-medium mb-1">Risk Incidents</div>
            <div className="space-y-1">
              {well.riskEvents.map(rv => (
                <div key={rv.id} className="flex items-center gap-2 rounded px-2 py-1 border border-red-200 bg-red-50 text-xs text-red-800">
                  <span className="font-semibold">{getEventTypeLabel(rv.riskType)}</span>
                  <span className="text-2xs opacity-75">{formatDepth(rv.depth)}</span>
                  <span className="ml-auto text-2xs font-mono font-bold">{(rv.probability * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="p-3 border-t border-surface-200 bg-surface-50">
        <button
          id={`well-view-btn-${well.id}`}
          onClick={onView}
          className="w-full btn btn-primary text-xs justify-center"
        >
          <ChevronRight size={13} /> View Full Profile
        </button>
      </div>
    </div>
  );
}

// ─── Radius options ────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [5, 10, 25, 50];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NearbyWellsPage() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  // Filter state
  const [radiusKm, setRadiusKm] = useState(25);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWellType, setFilterWellType] = useState('');
  const [filterFormationId, setFilterFormationId] = useState('');

  // Selection
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);
  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set());

  const { data: activeWell, isLoading: awLoading, error: awError } = useActiveWell();
  const { data: formations = [] } = useFormations();

  const intelligenceFilters = useMemo<NearbyWellsFilters | null>(() => {
    if (!activeWell) return null;
    return {
      activeWellId: activeWell.id,
      radiusKm,
      status: filterStatus || undefined,
      wellType: filterWellType || undefined,
      formationId: filterFormationId || undefined,
    };
  }, [activeWell, radiusKm, filterStatus, filterWellType, filterFormationId]);

  const {
    data: intelligenceData,
    isLoading: nearbyLoading,
    error: nearbyError,
    refetch,
  } = useNearbyWellsIntelligence(intelligenceFilters);

  const nearbyWells = intelligenceData?.nearbyWells ?? [];
  const selectedWell = nearbyWells.find(w => w.id === selectedWellId) ?? null;

  function toggleCompare(id: string) {
    setComparedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 4) return prev;
      next.add(id);
      return next;
    });
  }

  function handleCompareSelected() {
    const ids = Array.from(comparedIds).join(',');
    setSearchParams({ wells: ids });
    navigate(`/comparison?wells=${ids}`);
  }

  const centerLat = activeWell?.latitude ?? 27.5;
  const centerLng = activeWell?.longitude ?? 94.9;

  const hasActiveFilters = filterStatus || filterWellType || filterFormationId;

  if (awLoading) return <Loading text="Loading well & map data..." />;
  if (awError || !activeWell) {
    return <ErrorMessage error={(awError as Error) || new Error('Cannot load active well')} retry={refetch} />;
  }

  return (
    <div className="flex flex-col gap-3 h-full max-w-[1400px] mx-auto pb-4">
      {/* Compact Top Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Active well pill */}
        <div className="flex items-center gap-2 card px-2.5 py-1.5 bg-white shadow-2xs">
          <span className="status-dot-normal animate-pulse" />
          <span className="text-xs font-bold text-surface-800">{activeWell.wellName}</span>
          <span className="badge badge-normal text-2xs">Active</span>
        </div>

        {/* Radius */}
        <div className="flex items-center gap-1 card px-2 py-1.5 bg-white shadow-2xs">
          <span className="text-2xs text-surface-400">Radius:</span>
          {RADIUS_OPTIONS.map(r => (
            <button
              key={r}
              id={`radius-btn-${r}`}
              onClick={() => setRadiusKm(r)}
              className={clsx(
                'px-1.5 py-0.5 rounded text-2xs font-mono font-semibold transition-colors',
                radiusKm === r ? 'bg-primary-600 text-white' : 'text-surface-500 hover:bg-surface-100'
              )}
            >
              {r}km
            </button>
          ))}
        </div>

        {/* Compact filters */}
        <select
          id="filter-status"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="form-input py-1 text-xs w-28"
        >
          <option value="">All Status</option>
          {['DRILLING', 'ACTIVE', 'COMPLETED', 'ABANDONED'].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          id="filter-well-type"
          value={filterWellType}
          onChange={e => setFilterWellType(e.target.value)}
          className="form-input py-1 text-xs w-32"
        >
          <option value="">All Types</option>
          {['VERTICAL', 'DIRECTIONAL', 'HORIZONTAL'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select
          id="filter-formation"
          value={filterFormationId}
          onChange={e => setFilterFormationId(e.target.value)}
          className="form-input py-1 text-xs w-36"
        >
          <option value="">All Formations</option>
          {formations.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() => { setFilterStatus(''); setFilterWellType(''); setFilterFormationId(''); }}
            className="btn btn-ghost text-xs py-1 px-2 text-surface-500"
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* Well count */}
        <span className="text-xs text-surface-400 ml-auto">
          {nearbyLoading ? (
            <span className="animate-pulse">Searching...</span>
          ) : (
            <><strong className="text-surface-700">{nearbyWells.length}</strong> wells within {radiusKm}km</>
          )}
        </span>

        {/* Compare banner */}
        {comparedIds.size > 0 && (
          <div className="flex items-center gap-2 card px-2.5 py-1 border-amber-300 bg-amber-50">
            <span className="text-xs text-amber-800 font-semibold">{comparedIds.size} selected</span>
            <button
              id="compare-selected-btn"
              onClick={handleCompareSelected}
              className="btn text-xs py-0.5 px-2 bg-amber-600 text-white hover:bg-amber-700 font-semibold border-amber-600"
            >
              Compare
            </button>
            <button onClick={() => setComparedIds(new Set())} className="text-amber-600 hover:text-amber-800 p-0.5">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Map + Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3" style={{ minHeight: '460px' }}>
        {/* Map */}
        <div className="xl:col-span-2 card overflow-hidden relative shadow-sm" style={{ height: '480px' }}>
          {/* Location badge */}
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 border border-surface-200 rounded-lg px-2.5 py-2 shadow-md pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <MapPin size={12} className="text-teal-700" />
              <span className="text-xs font-bold text-surface-800">Duliajan, Assam, India</span>
            </div>
            <div className="text-2xs text-surface-400 mt-0.5">
              Upper Assam Shelf · 27.5°N, 95.3°E
            </div>
          </div>

          <MapContainer
            center={[centerLat, centerLng]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
              maxZoom={19}
            />
            <MapCenterer lat={centerLat} lng={centerLng} />

            {/* Radius circle */}
            <Circle
              center={[centerLat, centerLng]}
              radius={radiusKm * 1000}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#0284c7',
                fillOpacity: 0.04,
                weight: 1.5,
                dashArray: '5 5',
              }}
            />

            {/* Active well marker */}
            <Marker position={[activeWell.latitude, activeWell.longitude]} icon={makeActiveIcon()}>
              <Popup>
                <div style={{ color: '#0f172a', minWidth: '180px', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px' }}>{activeWell.wellName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{activeWell.wellId} · {activeWell.field}</div>
                  <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>⚡ Active Well</div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>Depth: <strong>{formatDepth(activeWell.currentDepth)}</strong></div>
                </div>
              </Popup>
            </Marker>

            {/* Offset well markers */}
            {nearbyWells.map(well => {
              const isSelected = selectedWellId === well.id;
              const hasRiskEvents = (well._count?.riskEvents ?? 0) > 0;
              return (
                <Marker
                  key={well.id}
                  position={[well.latitude, well.longitude]}
                  icon={makeWellMarkerIcon(isSelected, hasRiskEvents)}
                  eventHandlers={{
                    click: () => setSelectedWellId(well.id === selectedWellId ? null : well.id),
                  }}
                >
                  <Popup>
                    <div style={{ color: '#0f172a', minWidth: '170px', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{well.wellName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{well.wellId} · {well.status}</div>
                      <div style={{ fontSize: '11px', marginTop: '3px' }}>
                        <strong style={{ color: '#0284c7' }}>{well.distanceKm.toFixed(2)} km</strong> away
                      </div>
                      <div style={{ fontSize: '11px' }}>TD: {well.totalDepth ? formatDepth(well.totalDepth) : '—'}</div>
                      {hasRiskEvents && (
                        <div style={{ fontSize: '11px', marginTop: '2px', color: '#dc2626', fontWeight: 600 }}>
                          ⚠ {well._count?.riskEvents} risk event(s)
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right Panel */}
        <div className="card overflow-hidden flex flex-col shadow-sm bg-white" style={{ height: '480px' }}>
          {selectedWell ? (
            <WellPanel
              well={selectedWell}
              onClose={() => setSelectedWellId(null)}
              onView={() => navigate(`/wells/${selectedWell.id}`)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6 bg-surface-50/50">
              <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center text-surface-400 mb-3 border border-surface-200">
                <MapPin size={20} />
              </div>
              <div className="text-sm font-semibold text-surface-700 mb-1">Select a Well</div>
              <div className="text-xs text-surface-400 max-w-xs leading-relaxed">
                Click any marker on the map to view its profile, formations, and historical risk data.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center gap-4 card px-3 py-1.5 bg-white shadow-2xs">
        <span className="text-2xs text-surface-400">Legend:</span>
        {[
          { color: '#0d9488', label: 'Active Well', ring: '#0f766e' },
          { color: '#0284c7', label: 'Offset Wells' },
          { color: '#d97706', label: 'Selected' },
          { color: '#dc2626', label: 'Risk' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div style={{
              width: 10, height: 10, background: item.color,
              borderRadius: '50%', border: '1.5px solid #fff',
              boxShadow: `0 0 0 1px ${item.ring || item.color}`,
            }} />
            <span className="text-xs text-surface-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Wells Table */}
      <Card
        title="Nearby Wells"
        subtitle={`${nearbyWells.length} wells within ${radiusKm} km · sorted by proximity`}
        className="bg-white"
        noPadding
      >
        {nearbyLoading ? (
          <Loading text="Querying nearby wells..." />
        ) : nearbyError ? (
          <ErrorMessage error={nearbyError as Error} retry={refetch} />
        ) : nearbyWells.length === 0 ? (
          <EmptyState message={`No wells found within ${radiusKm} km.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Well</th>
                  <th>Distance</th>
                  <th>Depth</th>
                  <th>Status</th>
                  <th>Risks</th>
                  <th>Events</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nearbyWells.map(well => {
                  const isSelected = selectedWellId === well.id;
                  const isCompared = comparedIds.has(well.id);
                  return (
                    <tr
                      key={well.id}
                      className={clsx(
                        'cursor-pointer',
                        isSelected && 'bg-primary-50/70',
                        isCompared && !isSelected && 'bg-amber-50/50'
                      )}
                      onClick={() => setSelectedWellId(isSelected ? null : well.id)}
                    >
                      <td>
                        <div className="font-bold text-surface-800 text-xs">{well.wellName}</div>
                        <div className="text-2xs text-surface-400">{well.wellId}</div>
                      </td>
                      <td className="font-mono text-primary-700 font-semibold text-xs">{well.distanceKm.toFixed(2)} km</td>
                      <td className="font-mono text-xs text-surface-700">{formatDepth(well.currentDepth)}</td>
                      <td><StatusBadge status={well.status} /></td>
                      <td>
                        {(well._count?.riskEvents ?? 0) > 0 ? (
                          <span className="badge badge-critical text-2xs">
                            <AlertTriangle size={9} /> {well._count?.riskEvents}
                          </span>
                        ) : (
                          <span className="text-surface-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="font-mono text-xs text-surface-600">{well._count?.drillingEvents ?? 0}</td>
                      <td>
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => navigate(`/wells/${well.id}`)}
                            className="btn btn-ghost text-xs py-0.5 px-2"
                          >
                            View
                          </button>
                          <button
                            onClick={() => toggleCompare(well.id)}
                            disabled={!isCompared && comparedIds.size >= 4}
                            className={clsx(
                              'btn text-xs py-0.5 px-2',
                              isCompared ? 'bg-amber-100 border-amber-300 text-amber-800 font-bold' : 'btn-ghost',
                              !isCompared && comparedIds.size >= 4 && 'opacity-40 cursor-not-allowed'
                            )}
                          >
                            {isCompared ? '✓' : '+'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
