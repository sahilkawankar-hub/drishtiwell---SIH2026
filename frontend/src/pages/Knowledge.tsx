import { useState } from 'react';
import {
  Search, BookOpen, CheckCircle, Shield,
  Layers, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { useKnowledgeSearch, useWells, useFormations } from '../hooks/useApi';
import { Card, MetricCard } from '../components/ui/Card';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { SeverityBadge } from '../components/ui/Badge';
import { formatDate, formatDepth } from '../lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  LESSON_LEARNED:  'Lesson Learned',
  BEST_PRACTICE:   'Best Practice',
  MITIGATION:      'Mitigation',
  GEOLOGICAL_NOTE: 'Geological Note',
};

const CATEGORY_COLORS: Record<string, string> = {
  LESSON_LEARNED:  '#f59e0b',
  BEST_PRACTICE:   '#22c55e',
  MITIGATION:      '#60a5fa',
  GEOLOGICAL_NOTE: '#a78bfa',
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
  const [activeTab, setActiveTab] = useState<'all' | 'knowledge' | 'events'>('all');
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
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="card p-4 border-l-4 border-l-primary-600 bg-white shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shrink-0">
            <BookOpen size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-surface-900 font-bold text-lg">Drilling Knowledge & Event Intelligence</h1>
              <span className="badge badge-info text-2xs">Unified Search</span>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Cross-well search across historical drilling events, lessons learned, mitigations, and geological notes (SIH PS 26121).
            </p>
          </div>
        </div>

        {hasActiveFilters && (
          <button onClick={resetFilters} className="btn btn-ghost text-xs text-status-warning">
            Reset Filters
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Matches"
          value={totalMatches}
          icon={<BookOpen size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Knowledge Entries"
          value={knowledgeEntries.length}
          sub={`${knowledgeEntries.filter((k) => k.category === 'LESSON_LEARNED').length} lessons learned`}
          icon={<Shield size={18} />}
          color="#d97706"
        />
        <MetricCard
          label="Historical Events"
          value={drillingEvents.length}
          sub="Indexed from offset wells"
          icon={<Layers size={18} />}
          color="#16a34a"
        />
        <MetricCard
          label="Mitigations Indexed"
          value={
            knowledgeEntries.filter((k) => k.category === 'MITIGATION').length +
            drillingEvents.filter((e) => !!e.mitigation).length
          }
          icon={<CheckCircle size={18} />}
          color="#0d9488"
        />
      </div>

      {/* Multi-Dimensional Search Controls */}
      <Card title="Search & Multi-Criteria Filtering" className="bg-white shadow-2xs">
        <div className="space-y-3">
          {/* Keyword Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              id="knowledge-search-input"
              type="text"
              placeholder="Search by keywords, lessons learned, mitigation protocols, causes, or descriptions..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="form-input w-full pl-9 text-xs py-2"
            />
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {/* Category */}
            <div>
              <label className="block text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Knowledge Category</label>
              <select
                id="search-category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input w-full text-xs"
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
              <label className="block text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Drilling Event Type</label>
              <select
                id="search-event-type-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="form-input w-full text-xs"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === 'ALL' ? 'All Event Types' : t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Formation */}
            <div>
              <label className="block text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Formation</label>
              <select
                id="search-formation-select"
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                className="form-input w-full text-xs"
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
              <label className="block text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Source Well</label>
              <select
                id="search-well-select"
                value={wellName}
                onChange={(e) => setWellName(e.target.value)}
                className="form-input w-full text-xs"
              >
                <option value="ALL">All Wells</option>
                {wells.map((w: any) => (
                  <option key={w.id} value={w.wellName}>
                    {w.wellName}
                  </option>
                ))}
              </select>
            </div>

            {/* Depth Range */}
            <div>
              <label className="block text-2xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Depth Window (m)</label>
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

          {/* Facets Chips */}
          {facets && (
            <div className="flex items-center gap-2 flex-wrap pt-1 text-2xs text-surface-600">
              <span className="font-bold text-surface-500 uppercase tracking-wider">Quick Filters:</span>
              {Object.entries(facets.eventTypes).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setEventType(eventType === type ? 'ALL' : type)}
                  className={`px-2 py-0.5 rounded-full border text-xs transition-colors ${
                    eventType === type
                      ? 'bg-primary-600 border-primary-600 text-white font-semibold'
                      : 'bg-surface-50 border-surface-200 hover:bg-surface-100 text-surface-700'
                  }`}
                >
                  {type.replace(/_/g, ' ')} ({count})
                </button>
              ))}
              {Object.entries(facets.formations).slice(0, 4).map(([form, count]) => (
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
        </div>
      </Card>

      {/* Tabs for Results View */}
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
          onClick={() => setActiveTab('knowledge')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'knowledge'
              ? 'border-primary-600 text-primary-700 font-bold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          Knowledge Repository ({knowledgeEntries.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'events'
              ? 'border-primary-600 text-primary-700 font-bold'
              : 'border-transparent text-surface-500 hover:text-surface-800'
          }`}
        >
          Drilling Events ({drillingEvents.length})
        </button>
      </div>

      {isLoading && <Loading text="Searching database for matching knowledge & events..." />}
      {error && <ErrorMessage error={error as Error} retry={refetch} />}

      {!isLoading && !error && totalMatches === 0 && (
        <div className="text-center py-8">
          <EmptyState message="No knowledge entries or drilling events match your search criteria" />
          {hasActiveFilters && (
            <button onClick={resetFilters} className="btn btn-ghost text-xs mt-3">
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Results List */}
      <div className="space-y-3">
        {/* KNOWLEDGE ENTRIES (Shown if activeTab === 'all' or 'knowledge') */}
        {(activeTab === 'all' || activeTab === 'knowledge') &&
          knowledgeEntries.map((kn) => {
            const isExpanded = expandedId === kn.id;
            const catColor = CATEGORY_COLORS[kn.category] || '#94a3b8';

            return (
              <Card
                key={kn.id}
                className="border-l-4 transition-all bg-white shadow-2xs"
                style={{ borderLeftColor: catColor }}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
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

                        {kn.verified && (
                          <span className="badge badge-normal text-2xs">
                            <CheckCircle size={10} /> Verified
                          </span>
                        )}

                        {kn.formationRef && (
                          <span className="text-2xs text-surface-500 font-medium">
                            Formation: {kn.formationRef}
                          </span>
                        )}

                        {kn.depthRef && (
                          <span className="text-2xs font-mono text-primary-700 font-semibold">
                            @ {formatDepth(kn.depthRef)}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-surface-900">{kn.title}</h3>

                      {kn.wellRef && (
                        <div className="text-2xs text-primary-700 font-medium mt-0.5">
                          Source Well: {kn.wellRef}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-2xs text-surface-500 font-mono">
                        {formatDate(kn.createdAt)}
                      </span>
                    </div>
                  </div>

                  <p
                    className={`text-xs text-surface-700 leading-relaxed ${
                      isExpanded ? '' : 'line-clamp-3'
                    }`}
                  >
                    {kn.content}
                  </p>

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
                      <div className="flex gap-1.5 flex-wrap mt-2">
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
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-100">
                    <span className="text-2xs text-surface-500">
                      {kn.author ? `By: ${kn.author}` : 'Extracted Knowledge'}
                    </span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : kn.id)}
                      className="btn btn-ghost text-xs py-0.5 px-2 flex items-center gap-1 text-surface-600 hover:text-surface-900"
                    >
                      {isExpanded ? (
                        <>
                          Collapse <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          Read Full <ChevronDown size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}

        {/* DRILLING EVENTS (Shown if activeTab === 'all' or 'events') */}
        {(activeTab === 'all' || activeTab === 'events') &&
          drillingEvents.map((ev) => {
            const isExpanded = expandedId === ev.id;
            const wellLabel = ev.well?.wellName || `Well ${ev.wellId}`;
            const wellIdLabel = ev.well?.wellId || ev.wellId;

            return (
              <Card
                key={ev.id}
                className="border-l-4 border-status-warning bg-white shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="badge badge-warning text-2xs">
                          {ev.eventType.replace(/_/g, ' ')}
                        </span>
                        <SeverityBadge severity={ev.severity}>{ev.severity}</SeverityBadge>
                        <span className="font-mono text-xs text-primary-700 font-semibold">
                          @ {formatDepth(ev.depth)}
                        </span>
                        {ev.formation && (
                          <span className="text-2xs text-surface-500 font-medium">
                            {ev.formation.name}
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-surface-900">
                        {wellLabel} — {ev.eventType.replace(/_/g, ' ')} Incident
                      </h3>

                      <div className="text-2xs text-surface-500 mt-0.5">
                        Well ID: {wellIdLabel}{ev.well?.field ? ` · Field: ${ev.well.field}` : ''}
                        {ev.nptHours && ` · NPT: ${ev.nptHours} hrs`}
                        {ev.mudLossRate && ` · Loss Rate: ${ev.mudLossRate} m³/hr`}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-2xs text-surface-500 font-mono">
                        {formatDate(ev.timestamp)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-surface-700 mt-1 leading-relaxed">{ev.description}</p>

                  {/* Cause & Mitigation Callouts */}
                  {(ev.cause || ev.mitigation) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      {ev.cause && (
                        <div className="text-xs p-2 rounded bg-surface-50 border border-surface-200">
                          <span className="text-surface-600 font-bold block mb-0.5">
                            Cause:
                          </span>
                          <span className="text-surface-700">{ev.cause}</span>
                        </div>
                      )}
                      {ev.mitigation && (
                        <div className="text-xs p-2 rounded bg-teal-50 border border-teal-200">
                          <span className="text-teal-800 font-bold block mb-0.5">
                            Mitigation Protocol:
                          </span>
                          <span className="text-teal-950 font-medium">{ev.mitigation}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Outcome & Source Document */}
                  {isExpanded && ev.outcome && (
                    <div className="mt-2 text-xs text-surface-600 p-2 rounded bg-surface-50 border border-surface-200 italic">
                      <span className="font-semibold text-surface-700">Outcome: </span>
                      {ev.outcome}
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-surface-100">
                    <div className="text-2xs text-surface-500 flex items-center gap-1">
                      {ev.sourceDocument ? (
                        <>
                          <FileText size={12} className="text-primary-600" />
                          <span>Extracted from: {ev.sourceDocument.title}</span>
                        </>
                      ) : (
                        <span>Historical Well Log</span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                      className="btn btn-ghost text-xs py-0.5 px-2 flex items-center gap-1 text-surface-600 hover:text-surface-900"
                    >
                      {isExpanded ? (
                        <>
                          Collapse <ChevronUp size={12} />
                        </>
                      ) : (
                        <>
                          Details <ChevronDown size={12} />
                        </>
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
