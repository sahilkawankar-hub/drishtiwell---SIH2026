import { useState } from 'react';
import {
  Search, BookOpen, CheckCircle, Shield,
  Layers, ChevronDown, ChevronUp, FileText,
  MapPin, X, ArrowRight, Info
} from 'lucide-react';
import { useKnowledgeSearch, useWells, useFormations } from '../hooks/useApi';
import { Card, MetricCard } from '../components/ui/Card';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { SeverityBadge } from '../components/ui/Badge';
import { formatDate, formatDepth, getEventTypeLabel } from '../lib/utils';
import type { DrillingEvent, KnowledgeEntry } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  LESSON_LEARNED:  'Lesson Learned',
  BEST_PRACTICE:   'Best Practice',
  MITIGATION:      'Mitigation',
  GEOLOGICAL_NOTE: 'Geological Note',
};

const CATEGORY_COLORS: Record<string, string> = {
  LESSON_LEARNED:  '#d97706',
  BEST_PRACTICE:   '#16a34a',
  MITIGATION:      '#0284c7',
  GEOLOGICAL_NOTE: '#0d9488',
};

const EVENT_TYPES = [
  'ALL',
  'STUCK_PIPE',
  'MUD_LOSS',
  'TORQUE_SPIKE',
  'OVERPRESSURE',
  'KICK',
  'CEMENTING_ISSUE',
];

export default function KnowledgePage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('ALL');
  const [eventType, setEventType] = useState('ALL');
  const [formation, setFormation] = useState('ALL');
  const [wellName, setWellName] = useState('ALL');
  const [minDepth, setMinDepth] = useState<string>('');
  const [maxDepth, setMaxDepth] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'events' | 'knowledge'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: wells = [] } = useWells();
  const { data: formations = [] } = useFormations();

  // Search query hook
  const { data: searchResult, isLoading, error, refetch } = useKnowledgeSearch({
    q: q.trim().length > 1 ? q.trim() : undefined,
    category: category !== 'ALL' ? category : undefined,
    eventType: eventType !== 'ALL' ? eventType : undefined,
    formation: formation !== 'ALL' ? formation : undefined,
    wellName: wellName !== 'ALL' ? wellName : undefined,
    minDepth: minDepth ? parseFloat(minDepth) : undefined,
    maxDepth: maxDepth ? parseFloat(maxDepth) : undefined,
    limit: 60,
  });

  const knowledgeEntries = searchResult?.knowledgeEntries || [];
  const drillingEvents = searchResult?.drillingEvents || [];
  const totalMatches = searchResult?.totalMatches || 0;
  const facets = searchResult?.facets;

  const resetFilters = () => {
    setQ('');
    setCategory('ALL');
    setEventType('ALL');
    setFormation('ALL');
    setWellName('ALL');
    setMinDepth('');
    setMaxDepth('');
  };

  const hasActiveFilters =
    q.trim().length > 0 ||
    category !== 'ALL' ||
    eventType !== 'ALL' ||
    formation !== 'ALL' ||
    wellName !== 'ALL' ||
    minDepth !== '' ||
    maxDepth !== '';

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── HEADER & WORKFLOW CONNECTION ─────────────────────────────────── */}
      <div className="card p-4 bg-white border-l-4 border-l-primary-600 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-surface-900 font-bold text-base">Knowledge & Incident Search</h1>
                <span className="badge badge-info text-2xs">Unified Offset Repository</span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Query historical drilling events, lessons learned, and mitigation procedures across offset wells in the Upper Assam Shelf.
              </p>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="btn btn-ghost text-xs text-surface-600 hover:text-surface-900"
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>

        {/* Operational Link Banner */}
        <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center gap-2 text-2xs text-teal-900 bg-teal-50/70 p-2 rounded border border-teal-200/80">
          <Info size={13} className="text-teal-700 shrink-0" />
          <span>
            <strong>Connection to Operational Decisions:</strong> Searching historical offset well records provides the geological context and proven mitigation protocols needed before penetrating high-risk formations on the active well.
          </span>
        </div>
      </div>

      {/* ─── KPI METRICS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Matches"
          value={totalMatches}
          sub="Search results retrieved"
          icon={<BookOpen size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Historical Incidents"
          value={drillingEvents.length}
          sub="Indexed from offset wells"
          icon={<Layers size={18} />}
          color="#ea580c"
        />
        <MetricCard
          label="Lessons Learned"
          value={knowledgeEntries.length}
          sub="Rig team best practices"
          icon={<Shield size={18} />}
          color="#0d9488"
        />
        <MetricCard
          label="Mitigations Indexed"
          value={
            knowledgeEntries.filter((k) => k.category === 'MITIGATION').length +
            drillingEvents.filter((e) => !!e.mitigation).length
          }
          sub="Actionable operational solutions"
          icon={<CheckCircle size={18} />}
          color="#16a34a"
        />
      </div>

      {/* ─── SEARCH & MULTI-CRITERIA FILTERS ───────────────────────────────── */}
      <Card noPadding className="bg-white shadow-2xs p-3.5 space-y-3">
        {/* Keyword Search Input */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
          <input
            id="knowledge-search-input"
            type="text"
            placeholder="Search by keywords (e.g. mud loss, stuck pipe, kick, barail shale, differential pressure)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="form-input w-full pl-9 pr-8 text-xs py-2"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-700 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Compact Filters Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Category */}
          <div>
            <label className="block text-2xs font-semibold text-surface-500 mb-1">Category</label>
            <select
              id="search-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-input w-full text-xs py-1"
            >
              <option value="ALL">All Categories</option>
              {Object.keys(CATEGORY_LABELS).map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-2xs font-semibold text-surface-500 mb-1">Event Type</label>
            <select
              id="search-event-type-select"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="form-input w-full text-xs py-1"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Event Types' : getEventTypeLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Formation */}
          <div>
            <label className="block text-2xs font-semibold text-surface-500 mb-1">Formation</label>
            <select
              id="search-formation-select"
              value={formation}
              onChange={(e) => setFormation(e.target.value)}
              className="form-input w-full text-xs py-1"
            >
              <option value="ALL">All Formations</option>
              {formations.map((f: any) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Well */}
          <div>
            <label className="block text-2xs font-semibold text-surface-500 mb-1">Source Well</label>
            <select
              id="search-well-select"
              value={wellName}
              onChange={(e) => setWellName(e.target.value)}
              className="form-input w-full text-xs py-1"
            >
              <option value="ALL">All Wells</option>
              {wells.map((w: any) => (
                <option key={w.id} value={w.wellName}>
                  {w.wellName}
                </option>
              ))}
            </select>
          </div>

          {/* Depth Window */}
          <div>
            <label className="block text-2xs font-semibold text-surface-500 mb-1">Depth Window (m)</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                placeholder="Min"
                value={minDepth}
                onChange={(e) => setMinDepth(e.target.value)}
                className="form-input w-1/2 text-xs py-1 text-center font-mono"
              />
              <span className="text-surface-400 text-xs">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxDepth}
                onChange={(e) => setMaxDepth(e.target.value)}
                className="form-input w-1/2 text-xs py-1 text-center font-mono"
              />
            </div>
          </div>
        </div>

        {/* Facet Chips (Quick Filters) */}
        {facets && (
          <div className="flex items-center gap-1.5 flex-wrap pt-1 text-2xs text-surface-500">
            <span className="font-semibold text-surface-600">Quick Filters:</span>
            {Object.entries(facets.eventTypes).slice(0, 4).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setEventType(eventType === type ? 'ALL' : type)}
                className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${
                  eventType === type
                    ? 'bg-primary-600 border-primary-600 text-white font-semibold'
                    : 'bg-surface-50 border-surface-200 hover:bg-surface-100 text-surface-700'
                }`}
              >
                {getEventTypeLabel(type)} ({count})
              </button>
            ))}
            {Object.entries(facets.formations).slice(0, 3).map(([form, count]) => (
              <button
                key={form}
                onClick={() => setFormation(formation === form ? 'ALL' : form)}
                className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${
                  formation === form
                    ? 'bg-teal-600 border-teal-600 text-white font-semibold'
                    : 'bg-surface-50 border-surface-200 hover:bg-surface-100 text-surface-700'
                }`}
              >
                {form} ({count})
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* ─── TABS: RESULTS CLASSIFICATION ──────────────────────────────────── */}
      <div className="flex items-center border-b border-surface-200 gap-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-primary-600 text-primary-700 font-bold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          All Results ({totalMatches})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'events'
              ? 'border-primary-600 text-primary-700 font-bold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          Historical Drilling Incidents ({drillingEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('knowledge')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'knowledge'
              ? 'border-primary-600 text-primary-700 font-bold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          Lessons Learned & Best Practices ({knowledgeEntries.length})
        </button>
      </div>

      {/* ─── LOADING / ERROR / EMPTY STATES ─────────────────────────────────── */}
      {isLoading && <Loading text="Searching database for matching knowledge & offset events..." />}
      {error && <ErrorMessage error={error as Error} retry={refetch} />}

      {!isLoading && !error && totalMatches === 0 && (
        <div className="text-center py-10 card bg-white">
          <EmptyState message="No knowledge entries or drilling events match your search criteria." />
          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn btn-ghost text-xs mt-3">
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* ─── RESULTS LIST ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {/* SECTION 1: DRILLING EVENTS */}
        {(activeTab === 'all' || activeTab === 'events') &&
          drillingEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;
            const wellLabel = ev.well?.wellName || `Well ${ev.wellId}`;
            const wellIdLabel = ev.well?.wellId || ev.wellId;

            return (
              <div
                key={ev.id}
                className="card bg-white border-l-4 border-l-amber-500 p-4 transition-all shadow-2xs hover:shadow-xs space-y-2.5"
              >
                {/* Header: Event Type, Severity, Well & Formation Context, Date */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge badge-warning text-2xs font-semibold">
                      {getEventTypeLabel(ev.eventType)}
                    </span>
                    <SeverityBadge severity={ev.severity}>{ev.severity}</SeverityBadge>

                    {/* Well Context */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 text-xs font-semibold text-surface-800">
                      <MapPin size={10} className="text-primary-600" />
                      {wellLabel}
                      {wellIdLabel && <span className="font-mono text-2xs text-surface-400 font-normal">({wellIdLabel})</span>}
                    </span>

                    {/* Horizon & Formation */}
                    <span className="font-mono text-xs font-bold text-surface-800">
                      @ {formatDepth(ev.depth)}
                    </span>
                    {ev.formation && (
                      <span className="text-2xs text-teal-800 font-semibold px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                        {ev.formation.name}
                      </span>
                    )}
                  </div>

                  <div className="text-surface-400 font-mono text-2xs">
                    {formatDate(ev.timestamp)}
                  </div>
                </div>

                {/* Main Incident Description */}
                <div>
                  <h3 className="text-xs font-bold text-surface-900 mb-1">
                    {wellLabel} — {getEventTypeLabel(ev.eventType)} Incident
                  </h3>
                  <p className="text-xs text-surface-700 leading-relaxed font-medium">
                    {ev.description}
                  </p>
                </div>

                {/* Mitigation & Operational Decision Impact */}
                {(ev.mitigation || ev.cause) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-xs">
                    {ev.cause && (
                      <div className="p-2 rounded bg-surface-50 border border-surface-200">
                        <span className="text-2xs text-surface-500 font-semibold block mb-0.5">
                          Root Cause
                        </span>
                        <span className="text-surface-800">{ev.cause}</span>
                      </div>
                    )}
                    {ev.mitigation && (
                      <div className="p-2 rounded bg-teal-50 border border-teal-200">
                        <span className="text-2xs text-teal-800 font-semibold block mb-0.5">
                          Operational Mitigation Protocol
                        </span>
                        <span className="text-teal-950 font-medium">{ev.mitigation}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Secondary Details (Expandable) */}
                {isExpanded && ev.outcome && (
                  <div className="p-2 bg-surface-50 border border-surface-200 rounded text-xs text-surface-700">
                    <span className="font-semibold text-surface-900">Incident Outcome: </span>
                    {ev.outcome}
                  </div>
                )}

                {/* Footer: Source Document & Expansion */}
                <div className="flex items-center justify-between pt-1 border-t border-surface-100 text-2xs text-surface-500">
                  <div className="flex items-center gap-1.5">
                    {ev.sourceDocument ? (
                      <>
                        <FileText size={11} className="text-primary-600" />
                        <span>Source: <strong className="text-surface-700">{ev.sourceDocument.title}</strong></span>
                      </>
                    ) : (
                      <span>Historical Well Log Records</span>
                    )}
                    {ev.nptHours && <span className="ml-2 font-mono">· NPT: <strong>{ev.nptHours} hrs</strong></span>}
                    {ev.mudLossRate && <span className="font-mono">· Loss: <strong>{ev.mudLossRate} m³/hr</strong></span>}
                  </div>

                  <button
                    onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                    className="btn btn-ghost text-xs py-0.5 px-2 flex items-center gap-1 text-surface-600 hover:text-surface-900"
                  >
                    {isExpanded ? 'Less' : 'Details'}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>
            );
          })}

        {/* SECTION 2: KNOWLEDGE ENTRIES */}
        {(activeTab === 'all' || activeTab === 'knowledge') &&
          knowledgeEntries.map((kn) => {
            const isExpanded = expandedId === kn.id;
            const catColor = CATEGORY_COLORS[kn.category] || '#0284c7';

            return (
              <div
                key={kn.id}
                className="card bg-white border-l-4 p-4 transition-all shadow-2xs hover:shadow-xs space-y-2.5"
                style={{ borderLeftColor: catColor }}
              >
                {/* Header: Category Badge, Title, Horizon, Well Context */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="badge text-2xs font-semibold"
                      style={{
                        backgroundColor: `${catColor}15`,
                        color: catColor,
                        borderColor: `${catColor}30`,
                      }}
                    >
                      {CATEGORY_LABELS[kn.category] || kn.category}
                    </span>

                    {kn.wellRef && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-100 text-xs font-semibold text-surface-800">
                        <MapPin size={10} className="text-primary-600" />
                        {kn.wellRef}
                      </span>
                    )}

                    {kn.formationRef && (
                      <span className="text-2xs text-teal-800 font-semibold px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                        {kn.formationRef}
                      </span>
                    )}

                    {kn.depthRef && (
                      <span className="text-2xs font-mono text-surface-700 font-semibold">
                        @ {formatDepth(kn.depthRef)}
                      </span>
                    )}

                    {kn.verified && (
                      <span className="badge badge-normal text-2xs inline-flex items-center gap-1">
                        <CheckCircle size={10} /> Verified Protocol
                      </span>
                    )}
                  </div>

                  <div className="text-surface-400 font-mono text-2xs">
                    {formatDate(kn.createdAt)}
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h3 className="text-sm font-bold text-surface-900 mb-1">{kn.title}</h3>
                  <p
                    className={`text-xs text-surface-700 leading-relaxed font-medium ${
                      isExpanded ? '' : 'line-clamp-3'
                    }`}
                  >
                    {kn.content}
                  </p>
                </div>

                {/* Tags */}
                {(() => {
                  const parsedTags = Array.isArray(kn.tags)
                    ? kn.tags
                    : typeof kn.tags === 'string'
                    ? (() => {
                        try {
                          return JSON.parse(kn.tags);
                        } catch {
                          return [kn.tags];
                        }
                      })()
                    : [];
                  if (!parsedTags || parsedTags.length === 0) return null;
                  return (
                    <div className="flex gap-1.5 flex-wrap pt-1">
                      {parsedTags.map((tag: string) => (
                        <span
                          key={tag}
                          className="text-2xs px-2 py-0.5 bg-surface-100 text-surface-600 rounded border border-surface-200"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-surface-100 text-2xs text-surface-400">
                  <span>{kn.author ? `Verified by: ${kn.author}` : 'Extracted Engineering Knowledge'}</span>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : kn.id)}
                    className="btn btn-ghost text-xs py-0.5 px-2 flex items-center gap-1 text-surface-600 hover:text-surface-900"
                  >
                    {isExpanded ? 'Collapse' : 'Read Full'}
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
