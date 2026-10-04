import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin, Layers, AlertTriangle, Clock, ChevronRight, X,
  Filter, SlidersHorizontal, CheckSquare, Square, BarChart2,
  Navigation, Activity, Drill,
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

// ─── Simple Enterprise Map Icons ─────────────────────────────────────────────
// Requirement 6:
// Active well: blue/green marker + "ACTIVE"
// Offset wells: blue markers
// Selected well: orange/amber marker
// Critical/high-risk well: red marker or risk badge
function makeActiveIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:inline-flex;align-items:center;gap:4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25));cursor:pointer;">
        <div style="width:18px;height:18px;background:#0d9488;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 0 0 2px #0f766e;"></div>
        <span style="background:#0f766e;color:#ffffff;font-size:10px;font-weight:700;font-family:Inter,sans-serif;padding:1px 5px;border-radius:4px;letter-spacing:0.4px;">ACTIVE</span>
      </div>`,
    iconSize: [80, 24],
    iconAnchor: [9, 12],
  });
}

function makeWellMarkerIcon(isSelected: boolean, isHighRisk: boolean) {
  if (isSelected) {
    // Orange/amber marker
    return L.divIcon({
      className: '',
      html: `
        <div style="width:18px;height:18px;background:#d97706;border:3px solid #ffffff;border-radius:50%;box-shadow:0 0 0 2px #b45309, 0 2px 6px rgba(0,0,0,0.25);cursor:pointer;"></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
  }

  if (isHighRisk) {
    // Red marker + risk badge
    return L.divIcon({
      className: '',
      html: `
        <div style="display:inline-flex;align-items:center;gap:3px;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.25));cursor:pointer;">
          <div style="width:14px;height:14px;background:#dc2626;border:2px solid #ffffff;border-radius:50%;"></div>
          <span style="background:#dc2626;color:#ffffff;font-size:9px;font-weight:700;font-family:Inter,sans-serif;padding:0.5px 3.5px;border-radius:3px;">RISK</span>
        </div>
      `,
      iconSize: [50, 18],
      iconAnchor: [7, 9],
    });
  }

  // Standard offset well: blue marker
  return L.divIcon({
    className: '',
    html: `
      <div style="width:12px;height:12px;background:#0284c7;border:2px solid #ffffff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.25);cursor:pointer;"></div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

// ─── MapCenterer – updates map view when active well changes ──────────────────
function MapCenterer({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 11);
  }, [lat, lng, map]);
  return null;
}

// ─── Well Intelligence Side Panel (Light Industrial) ─────────────────────────
function WellIntelPanel({
  well,
  onClose,
  onView,
  isCompared,
  onToggleCompare,
}: {
  well: NearbyWell;
  onClose: () => void;
  onView: () => void;
  isCompared: boolean;
  onToggleCompare: () => void;
}) {
  const formations = (well.formations ?? []).sort((a, b) => a.topDepth - b.topDepth);
  const activeFormation = formations.find((f) => f.isActive);
  const hasRisk = (well._count?.riskEvents ?? 0) > 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Header */}
      <div className="flex items-start justify-between p-3.5 border-b border-surface-200">
        <div>
          <div className="text-2xs text-surface-500 font-semibold uppercase tracking-wider mb-0.5">Offset Well Intelligence</div>
          <div className="text-surface-900 font-bold text-base leading-tight">{well.wellName}</div>
          <div className="text-surface-500 text-xs mt-0.5">{well.wellId} · {well.wellType}</div>
        </div>
        <button
          onClick={onClose}
          className="text-surface-400 hover:text-surface-700 p-1 rounded hover:bg-surface-100 transition-colors"
          title="Close panel"
        >
          <X size={16} />
        </button>
      </div>

      {/* Distance badge */}
      <div className="flex items-center gap-2 px-3.5 py-2 bg-surface-50 border-b border-surface-200">
        <Navigation size={13} className="text-primary-600" />
        <span className="text-primary-800 font-mono font-bold text-sm">{well.distanceKm.toFixed(2)} km</span>
        <span className="text-surface-500 text-xs">from active well</span>
        <div className="ml-auto">
          <StatusBadge status={well.status} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Field', value: well.field },
            { label: 'Block', value: well.block },
            { label: 'Current Depth', value: formatDepth(well.currentDepth) },
            { label: 'Total Depth', value: well.totalDepth ? formatDepth(well.totalDepth) : '—' },
            { label: 'Operator', value: well.operator },
            { label: 'Well Type', value: well.wellType },
            {
              label: 'Coordinates',
              value: `${well.latitude.toFixed(4)}°N, ${well.longitude.toFixed(4)}°E`,
            },
            {
              label: 'Formation',
              value: activeFormation?.formation.name ?? well.currentFormation ?? '—',
            },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface-50 rounded-md p-2 border border-surface-200/80">
              <div className="text-2xs text-surface-500 font-medium mb-0.5">{label}</div>
              <div className="text-xs text-surface-800 font-semibold truncate">{value}</div>
            </div>
          ))}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-surface-50 rounded-md p-2 text-center border border-surface-200/80">
            <div className="text-base font-bold font-mono text-surface-900">{well._count?.drillingEvents ?? 0}</div>
            <div className="text-2xs text-surface-500">Hist. Events</div>
          </div>
          <div className={clsx('rounded-md p-2 text-center border', hasRisk ? 'bg-red-50 border-red-200' : 'bg-surface-50 border-surface-200/80')}>
            <div className={clsx('text-base font-bold font-mono', hasRisk ? 'text-red-700' : 'text-surface-900')}>
              {well._count?.riskEvents ?? 0}
            </div>
            <div className="text-2xs text-surface-500">Risk Events</div>
          </div>
          <div className="bg-surface-50 rounded-md p-2 text-center border border-surface-200/80">
            <div className="text-base font-bold font-mono text-surface-900">{formations.length}</div>
            <div className="text-2xs text-surface-500">Formations</div>
          </div>
        </div>

        {/* Formation profile */}
        {formations.length > 0 && (
          <div>
            <div className="text-2xs text-surface-500 font-semibold uppercase tracking-wider mb-1.5">Formation Profile</div>
            <div className="space-y-1">
              {formations.map((wf) => (
                <div
                  key={wf.id}
                  className={clsx(
                    'flex items-center gap-2 px-2 py-1.5 rounded text-xs border',
                    wf.isActive ? 'bg-teal-50 border-teal-200 font-medium text-teal-900' : 'bg-surface-50 border-surface-200 text-surface-700'
                  )}
                >
                  <span className="font-mono text-2xs text-surface-500 w-20 shrink-0">
                    {wf.topDepth}–{wf.bottomDepth}m
                  </span>
                  <span className="truncate">{wf.formation.name}</span>
                  {wf.isActive && <span className="ml-auto badge badge-normal text-2xs shrink-0">Active</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent drilling events */}
        {well.drillingEvents && well.drillingEvents.length > 0 && (
          <div>
            <div className="text-2xs text-surface-500 font-semibold uppercase tracking-wider mb-1.5">Recent Historical Events</div>
            <div className="space-y-1.5">
              {well.drillingEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-2 bg-surface-50 border border-surface-200 rounded p-2 text-xs">
                  <AlertTriangle size={12} className={clsx('mt-0.5 shrink-0', getSeverityTextColor(ev.severity))} />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-surface-900">{getEventTypeLabel(ev.eventType)}</div>
                    <div className="text-2xs text-surface-500">{formatDepth(ev.depth)} · {formatDate(ev.timestamp)}</div>
                    <div className="text-2xs text-surface-600 truncate mt-0.5">{ev.description}</div>
                  </div>
                  <SeverityBadge severity={ev.severity} showDot={false}>{ev.severity}</SeverityBadge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active risk events */}
        {well.riskEvents && well.riskEvents.length > 0 && (
          <div>
            <div className="text-2xs text-red-700 font-semibold uppercase tracking-wider mb-1.5">Offset Risk Incidents</div>
            <div className="space-y-1.5">
              {well.riskEvents.map((rv) => (
                <div key={rv.id} className="flex items-center gap-2 rounded px-2.5 py-1.5 border border-red-200 bg-red-50 text-xs text-red-900">
                  <span className="font-bold">{getEventTypeLabel(rv.riskType)}</span>
                  <span className="text-2xs opacity-75">{formatDepth(rv.depth)}</span>
                  <span className="ml-auto text-2xs font-mono font-bold">{(rv.probability * 100).toFixed(0)}% prob</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-surface-200 flex gap-2 bg-surface-50">
        <button
          id={`well-compare-btn-${well.id}`}
          onClick={onToggleCompare}
          className={clsx(
            'flex-1 btn text-xs justify-center',
            isCompared ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold' : 'btn-ghost'
          )}
        >
          {isCompared ? <CheckSquare size={13} /> : <Square size={13} />}
          {isCompared ? 'Selected for Compare' : 'Compare'}
        </button>
        <button
          id={`well-view-btn-${well.id}`}
          onClick={onView}
          className="flex-1 btn btn-primary text-xs justify-center"
        >
          <ChevronRight size={13} /> View Details
        </button>
      </div>
    </div>
  );
}

// ─── Radius options ────────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [5, 10, 25, 50, 100];

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function NearbyWellsPage() {
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  // Filter state
  const [radiusKm, setRadiusKm] = useState(25);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterWellType, setFilterWellType] = useState('');
  const [filterFormationId, setFilterFormationId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null);
  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set());

  // Load active well first
  const { data: activeWell, isLoading: awLoading, error: awError } = useActiveWell();
  const { data: formations = [] } = useFormations();

  // Build filters object for intelligence query
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
  const selectedWell = nearbyWells.find((w) => w.id === selectedWellId) ?? null;

  // Comparison logic
  function toggleCompare(id: string) {
    setComparedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); return next; }
      if (next.size >= 4) return prev; // max 4
      next.add(id);
      return next;
    });
  }

  function handleCompareSelected() {
    const ids = Array.from(comparedIds).join(',');
    setSearchParams({ wells: ids });
    navigate(`/comparison?wells=${ids}`);
  }

  // ─── Map center (Duliajan, Assam, India) ────────────────────────────────────
  const centerLat = activeWell?.latitude ?? 27.5;
  const centerLng = activeWell?.longitude ?? 94.9;

  // Loading / error guards
  if (awLoading) return <Loading text="Loading active well & nearby GIS data..." />;
  if (awError || !activeWell) {
    return <ErrorMessage error={(awError as Error) || new Error('Cannot load active well')} retry={refetch} />;
  }

  return (
    <div className="flex flex-col gap-3.5 h-full max-w-[1600px] mx-auto pb-4">
      {/* ── TOP BAR: Active well info + radius + filters ───────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active well pill */}
          <div className="flex items-center gap-2 card px-3 py-1.5 bg-white shadow-2xs">
            <span className="status-dot-normal animate-pulse" />
            <span className="text-xs font-bold text-surface-900">{activeWell.wellName}</span>
            <span className="text-2xs text-surface-500 font-mono">({activeWell.wellId})</span>
            <span className="badge badge-normal text-2xs">Active</span>
          </div>

          {/* Radius selector */}
          <div className="flex items-center gap-1.5 card px-3 py-1.5 bg-white shadow-2xs">
            <Navigation size={12} className="text-primary-600" />
            <span className="text-2xs text-surface-500 font-semibold uppercase">Radius:</span>
            <div className="flex items-center gap-1">
              {RADIUS_OPTIONS.map((r) => (
                <button
                  key={r}
                  id={`radius-btn-${r}`}
                  onClick={() => setRadiusKm(r)}
                  className={clsx(
                    'px-2 py-0.5 rounded text-2xs font-mono font-semibold transition-colors',
                    radiusKm === r
                      ? 'bg-primary-600 text-white shadow-2xs'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  )}
                >
                  {r}km
                </button>
              ))}
            </div>
          </div>

          {/* Filter toggle */}
          <button
            id="toggle-filters-btn"
            onClick={() => setShowFilters((v) => !v)}
            className={clsx('btn text-xs gap-1.5', showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : 'btn-ghost')}
          >
            <Filter size={13} />
            Filters
            {(filterStatus || filterWellType || filterFormationId) && (
              <span className="w-4 h-4 rounded-full bg-primary-600 text-white text-2xs flex items-center justify-center font-bold">
                {[filterStatus, filterWellType, filterFormationId].filter(Boolean).length}
              </span>
            )}
          </button>

          {/* Well count */}
          <div className="text-xs text-surface-500 font-medium">
            {nearbyLoading ? (
              <span className="animate-pulse">Searching nearby wells...</span>
            ) : (
              <span>
                <strong className="text-surface-900">{nearbyWells.length}</strong> wells within {radiusKm}km
              </span>
            )}
          </div>
        </div>

        {/* Comparison banner */}
        {comparedIds.size > 0 && (
          <div className="flex items-center gap-2 card px-3 py-1.5 border-amber-300 bg-amber-50 shadow-2xs">
            <BarChart2 size={13} className="text-amber-700" />
            <span className="text-xs text-amber-900 font-bold">{comparedIds.size} well{comparedIds.size > 1 ? 's' : ''} selected</span>
            <button
              id="compare-selected-btn"
              onClick={handleCompareSelected}
              className="btn text-xs py-0.5 px-2 bg-amber-600 text-white hover:bg-amber-700 font-semibold"
            >
              Compare Selected
            </button>
            <button
              onClick={() => setComparedIds(new Set())}
              className="text-amber-700 hover:text-amber-900 p-0.5"
              title="Clear selection"
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── FILTER ROW ─────────────────────────────────────────────────────── */}
      {showFilters && (
        <div className="card p-3 flex flex-wrap items-center gap-3 bg-white shadow-2xs">
          <SlidersHorizontal size={13} className="text-surface-400" />
          <span className="text-2xs text-surface-500 font-bold uppercase tracking-wider">Filter By:</span>

          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="form-input py-1 text-xs w-36"
          >
            <option value="">All Statuses</option>
            {['DRILLING', 'ACTIVE', 'COMPLETED', 'ABANDONED', 'PLANNED'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            id="filter-well-type"
            value={filterWellType}
            onChange={(e) => setFilterWellType(e.target.value)}
            className="form-input py-1 text-xs w-40"
          >
            <option value="">All Well Types</option>
            {['VERTICAL', 'DIRECTIONAL', 'HORIZONTAL'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            id="filter-formation"
            value={filterFormationId}
            onChange={(e) => setFilterFormationId(e.target.value)}
            className="form-input py-1 text-xs w-48"
          >
            <option value="">All Formations</option>
            {formations.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {(filterStatus || filterWellType || filterFormationId) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterWellType(''); setFilterFormationId(''); }}
              className="btn btn-ghost text-xs text-status-critical border-red-200"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      )}

      {/* ── MAIN CONTENT: Map + Intelligence Panel ─────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5" style={{ minHeight: '480px' }}>
        {/* Map Container – 2/3 on desktop */}
        <div className="xl:col-span-2 card overflow-hidden relative shadow-sm" style={{ height: '500px' }}>
          {/* Location indicator + India Locator / Inset */}
          <div className="absolute top-3 left-3 z-[1000] bg-white/95 backdrop-blur-xs border border-surface-200 rounded-lg p-2.5 shadow-md pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-teal-700" />
              <span className="text-xs font-bold text-surface-900 tracking-tight">Duliajan, Assam, India</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-2xs text-surface-600 font-semibold">
              <span className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-800 font-bold">INDIA</span>
              <span className="text-surface-400">→</span>
              <span className="px-1.5 py-0.5 bg-surface-100 rounded text-surface-800 font-bold">Assam</span>
              <span className="text-surface-400">→</span>
              <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 rounded font-bold border border-teal-200">Duliajan</span>
            </div>
            <div className="text-3xs text-surface-500 mt-1 font-medium">
              Upper Assam Shelf · OIL Operational Field (27.5°N, 95.3°E)
            </div>
          </div>

          <MapContainer
            center={[centerLat, centerLng]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            {/* Clean Light CartoDB Positron Basemap */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              subdomains="abcd"
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

            {/* Active well marker (Requirement 6: blue/green marker + "ACTIVE") */}
            <Marker
              position={[activeWell.latitude, activeWell.longitude]}
              icon={makeActiveIcon()}
            >
              <Popup>
                <div style={{ color: '#0f172a', minWidth: '190px', fontFamily: 'Inter, sans-serif' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{activeWell.wellName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>ID: {activeWell.wellId} · {activeWell.field}</div>
                  <div style={{ marginTop: '4px', fontSize: '11px', fontWeight: 600, color: '#0f766e' }}>
                    ⚡ ACTIVE DRILLING WELL
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '2px' }}>
                    Depth: <strong>{formatDepth(activeWell.currentDepth)}</strong>
                  </div>
                  {activeWell.currentFormation && (
                    <div style={{ fontSize: '11px' }}>Formation: {activeWell.currentFormation}</div>
                  )}
                  <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px' }}>
                    {activeWell.latitude.toFixed(4)}°N, {activeWell.longitude.toFixed(4)}°E (Duliajan)
                  </div>
                </div>
              </Popup>
            </Marker>

            {/* Offset well markers */}
            {nearbyWells.map((well) => {
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
                    <div style={{ color: '#0f172a', minWidth: '180px', fontFamily: 'Inter, sans-serif' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{well.wellName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '1px' }}>
                        {well.wellId} · {well.field}
                      </div>
                      <div style={{ fontSize: '11px', marginTop: '4px' }}>
                        <strong style={{ color: '#0284c7' }}>{well.distanceKm.toFixed(2)} km</strong> from active well
                      </div>
                      <div style={{ fontSize: '11px' }}>Status: {well.status} · {well.wellType}</div>
                      <div style={{ fontSize: '11px' }}>TD: {well.totalDepth ? formatDepth(well.totalDepth) : '—'}</div>
                      {hasRiskEvents && (
                        <div style={{ fontSize: '11px', marginTop: '3px', color: '#dc2626', fontWeight: 600 }}>
                          ⚠ {well._count?.riskEvents} risk event(s)
                        </div>
                      )}
                      <button
                        onClick={() => setSelectedWellId(well.id)}
                        style={{
                          marginTop: '6px', fontSize: '11px', color: '#0284c7',
                          fontWeight: 600, textDecoration: 'underline', cursor: 'pointer',
                          background: 'none', border: 'none', padding: 0,
                        }}
                      >
                        Open Intelligence Panel →
                      </button>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right Panel – Well Intelligence or Placeholder */}
        <div className="card overflow-hidden flex flex-col shadow-sm bg-white" style={{ height: '500px' }}>
          {selectedWell ? (
            <WellIntelPanel
              well={selectedWell}
              onClose={() => setSelectedWellId(null)}
              onView={() => navigate(`/wells/${selectedWell.id}`)}
              isCompared={comparedIds.has(selectedWell.id)}
              onToggleCompare={() => toggleCompare(selectedWell.id)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 text-center p-6 bg-surface-50/50">
              <div className="w-12 h-12 rounded-full bg-surface-100 flex items-center justify-center text-surface-400 mb-3 border border-surface-200">
                <MapPin size={22} className="text-surface-500" />
              </div>
              <div className="text-sm font-bold text-surface-800 mb-1">Select an Offset Well</div>
              <div className="text-xs text-surface-500 max-w-xs leading-relaxed">
                Click any well marker on the Duliajan map or select a row in the table below to inspect its operational profile, historical risks, and geological formations.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MAP LEGEND (Clean Light Industrial) ────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-5 card px-3.5 py-2 bg-white shadow-2xs">
        <span className="text-2xs font-bold uppercase tracking-wider text-surface-400">Map Legend:</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <div style={{ width: 12, height: 12, background: '#0d9488', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1.5px #0f766e' }} />
          <span className="text-xs text-surface-700 font-medium">Active Well (<span className="text-teal-700 font-bold">ACTIVE</span>)</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div style={{ width: 10, height: 10, background: '#0284c7', borderRadius: '50%', border: '1.5px solid #fff', boxShadow: '0 0 0 1px #0284c7' }} />
          <span className="text-xs text-surface-700 font-medium">Offset Wells (Blue)</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div style={{ width: 12, height: 12, background: '#d97706', borderRadius: '50%', border: '2px solid #fff', boxShadow: '0 0 0 1.5px #b45309' }} />
          <span className="text-xs text-surface-700 font-medium">Selected Well (Amber)</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <div style={{ width: 11, height: 11, background: '#dc2626', borderRadius: '50%', border: '1.5px solid #fff', boxShadow: '0 0 0 1px #dc2626' }} />
          <span className="text-xs text-surface-700 font-medium">Critical / High Risk Well (Red / <span className="text-red-700 font-bold">RISK</span>)</span>
        </div>
      </div>

      {/* ── NEARBY WELLS TABLE ─────────────────────────────────────────────── */}
      <Card
        title="Nearby Offset Wells Table"
        subtitle={`${nearbyWells.length} wells within ${radiusKm} km radius in Duliajan operational area · Sorted by proximity`}
        className="bg-white shadow-sm"
        headerAction={
          <div className="flex items-center gap-1.5 text-2xs text-surface-500 font-medium">
            <Activity size={12} className="text-teal-600" />
            <span>Haversine Spatial Proximity</span>
          </div>
        }
        noPadding
      >
        {nearbyLoading ? (
          <Loading text="Querying nearby offset wells..." />
        ) : nearbyError ? (
          <ErrorMessage error={nearbyError as Error} retry={refetch} />
        ) : nearbyWells.length === 0 ? (
          <EmptyState message={`No offset wells found within ${radiusKm} km matching active filters.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>
                    <div className="flex items-center gap-1"><Drill size={11} />Well Name</div>
                  </th>
                  <th>
                    <div className="flex items-center gap-1"><Navigation size={11} />Proximity</div>
                  </th>
                  <th>
                    <div className="flex items-center gap-1"><Layers size={11} />Depth (MD)</div>
                  </th>
                  <th>Target Formation</th>
                  <th>Status</th>
                  <th>
                    <div className="flex items-center gap-1"><AlertTriangle size={11} />Risk Events</div>
                  </th>
                  <th>
                    <div className="flex items-center gap-1"><Clock size={11} />Hist. Events</div>
                  </th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {nearbyWells.map((well) => {
                  const primaryFormation =
                    well.formations?.find((f) => f.isActive)?.formation.name ??
                    well.formations?.[0]?.formation.name ??
                    well.currentFormation ??
                    '—';
                  const isSelected = selectedWellId === well.id;
                  const isCompared = comparedIds.has(well.id);

                  return (
                    <tr
                      key={well.id}
                      id={`well-row-${well.id}`}
                      className={clsx(
                        'cursor-pointer transition-colors',
                        isSelected && 'bg-primary-50/70 border-l-[3px] border-primary-600',
                        isCompared && !isSelected && 'bg-amber-50/70 border-l-[3px] border-amber-500'
                      )}
                      onClick={() => setSelectedWellId(isSelected ? null : well.id)}
                    >
                      <td>
                        <div className="font-bold text-surface-900 text-xs">{well.wellName}</div>
                        <div className="text-2xs text-surface-500">{well.wellId} · {well.wellType}</div>
                      </td>
                      <td>
                        <span className="font-mono text-primary-700 font-bold text-xs">
                          {well.distanceKm.toFixed(2)} km
                        </span>
                      </td>
                      <td>
                        <div className="font-mono font-medium text-xs text-surface-800">{formatDepth(well.currentDepth)}</div>
                        {well.totalDepth && (
                          <div className="text-2xs text-surface-500">TD: {formatDepth(well.totalDepth)}</div>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-surface-700 font-medium">{primaryFormation}</span>
                      </td>
                      <td>
                        <StatusBadge status={well.status} />
                      </td>
                      <td>
                        {(well._count?.riskEvents ?? 0) > 0 ? (
                          <span className="badge badge-critical text-2xs">
                            <AlertTriangle size={9} />
                            {well._count?.riskEvents}
                          </span>
                        ) : (
                          <span className="text-surface-400 text-xs">—</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs text-surface-700 font-semibold">
                          {well._count?.drillingEvents ?? 0}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            id={`table-view-btn-${well.id}`}
                            onClick={() => navigate(`/wells/${well.id}`)}
                            className="btn btn-ghost text-xs py-0.5 px-2"
                          >
                            View
                          </button>
                          <button
                            id={`table-compare-btn-${well.id}`}
                            onClick={() => toggleCompare(well.id)}
                            disabled={!isCompared && comparedIds.size >= 4}
                            className={clsx(
                              'btn text-xs py-0.5 px-2',
                              isCompared
                                ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                : 'btn-ghost',
                              !isCompared && comparedIds.size >= 4 && 'opacity-40 cursor-not-allowed'
                            )}
                          >
                            {isCompared ? '✓ Selected' : '+ Compare'}
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
