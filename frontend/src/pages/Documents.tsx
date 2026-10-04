import { useState } from 'react';
import {
  FileText, Upload, RefreshCw, CheckCircle, AlertTriangle,
  Layers, ChevronDown, ChevronUp,
  X, MapPin, ArrowRight, Clock, Info
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { formatDate, formatDateTime, formatDepth, getEventTypeLabel } from '../lib/utils';
import { useDocuments, useDocument, useWells } from '../hooks/useApi';
import { uploadDocument, processDocument } from '../lib/api';
import type { HistoricalDocument, DrillingEvent } from '../types';

const DOCUMENT_TYPES = [
  'Daily Drilling Report',
  'Well Completion Report',
  'Mud Log',
  'Drilling Report',
  'Geological Report',
  'Other',
];

export default function DocumentsPage() {
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  // Queries
  const { data: docs = [], isLoading, error, refetch } = useDocuments({
    documentType: selectedType !== 'ALL' ? selectedType : undefined,
    status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
  });

  const { data: wells = [] } = useWells();

  // Filter docs locally by search keyword
  const filteredDocs = docs.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.documentType.toLowerCase().includes(q) ||
      (d.well?.wellName && d.well.wellName.toLowerCase().includes(q))
    );
  });

  if (isLoading) return <Loading text="Loading historical documents..." />;
  if (error) return <ErrorMessage error={error as Error} retry={refetch} />;

  const processedCount = docs.filter((d) => d.status === 'PROCESSED').length;
  const ocrRequiredCount = docs.filter((d) => d.status === 'OCR_REQUIRED').length;
  const pendingCount = docs.filter((d) => d.status === 'PENDING').length;
  const totalEventsExtracted = docs.reduce((acc, d) => acc + (d.drillingEvents?.length || 0), 0);
  const uniqueWellsCount = new Set(docs.map((d) => d.wellId).filter(Boolean)).size;

  return (
    <div className="space-y-3.5 max-w-[1400px] mx-auto pb-6">
      {/* ─── HEADER & WORKFLOW CONNECTION ─────────────────────────────────── */}
      <div className="card p-4 bg-white border-l-4 border-l-primary-600 shadow-2xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-surface-900 font-bold text-base">Document Intelligence</h1>
                <span className="badge badge-info text-2xs">Historical Ingestion</span>
              </div>
              <p className="text-xs text-surface-500 mt-0.5">
                Ingest Daily Drilling Reports (DDRs) and Well Completion Reports to automatically extract drilling events and populate offset risk models.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="docs-refresh-btn"
              onClick={() => refetch()}
              className="btn btn-ghost text-xs py-1.5"
            >
              <RefreshCw size={13} /> Refresh
            </button>
            <button
              id="doc-upload-open-btn"
              onClick={() => setIsUploadOpen(true)}
              className="btn btn-primary text-xs py-1.5 font-semibold"
            >
              <Upload size={13} /> Upload Drilling PDF
            </button>
          </div>
        </div>

        {/* Operational Link Banner */}
        <div className="mt-3 pt-2.5 border-t border-surface-100 flex items-center gap-2 text-2xs text-teal-900 bg-teal-50/70 p-2 rounded border border-teal-200/80">
          <Info size={13} className="text-teal-700 shrink-0" />
          <span>
            <strong>Connection to Operational Decisions:</strong> Extracted drilling events (mud losses, stuck pipes, gas kicks) are correlated with live depth horizons on active wells to trigger predictive alerts and mitigation plans.
          </span>
        </div>
      </div>

      {/* ─── KPI METRICS (4 CARDS) ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Documents"
          value={docs.length}
          sub="Indexed drilling reports"
          icon={<FileText size={18} />}
          color="#0284c7"
        />
        <MetricCard
          label="Processed & Indexed"
          value={processedCount}
          sub="Text extracted & parsed"
          icon={<CheckCircle size={18} />}
          color="#16a34a"
        />
        <MetricCard
          label="Extracted Events"
          value={totalEventsExtracted}
          sub="Historical incidents detected"
          icon={<Layers size={18} />}
          color="#ea580c"
        />
        <MetricCard
          label="Pending / Review"
          value={ocrRequiredCount + pendingCount}
          sub={ocrRequiredCount > 0 ? `${ocrRequiredCount} scanned (OCR required)` : 'All up to date'}
          icon={<AlertTriangle size={18} />}
          color="#d97706"
        />
      </div>

      {/* ─── SEARCH & FILTER TOOLBAR ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-1">
          <input
            id="docs-search-input"
            type="text"
            placeholder="Search documents by title, well, or type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input flex-1 max-w-sm text-xs py-1.5"
          />

          <select
            id="docs-type-filter"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="form-input text-xs py-1.5 w-40"
          >
            <option value="ALL">All Document Types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            id="docs-status-filter"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="form-input text-xs py-1.5 w-36"
          >
            <option value="ALL">All Statuses</option>
            <option value="PROCESSED">Processed</option>
            <option value="PENDING">Pending</option>
            <option value="OCR_REQUIRED">OCR Required</option>
            <option value="ERROR">Error</option>
          </select>

          {(search || selectedType !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedType('ALL');
                setSelectedStatus('ALL');
              }}
              className="btn btn-ghost text-xs py-1 px-2 text-surface-500"
            >
              Reset
            </button>
          )}
        </div>

        <span className="text-xs text-surface-500 text-right">
          Showing <strong className="text-surface-800">{filteredDocs.length}</strong> document(s)
        </span>
      </div>

      {/* ─── DOCUMENTS TABLE ───────────────────────────────────────────────── */}
      <Card noPadding className="bg-white shadow-2xs">
        {filteredDocs.length === 0 ? (
          <div className="text-center py-10">
            <EmptyState message="No documents found matching your criteria." />
            <button
              className="btn btn-primary text-xs mt-3 inline-flex items-center gap-1.5"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload size={14} /> Upload First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Type</th>
                  <th>Associated Well</th>
                  <th>Processing Status</th>
                  <th>Extracted Events</th>
                  <th>Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const eventsCount = doc.drillingEvents?.length ?? 0;
                  const wellName = doc.well?.wellName;
                  const wellId = doc.well?.wellId;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="cursor-pointer hover:bg-surface-50 transition-colors"
                    >
                      <td className="max-w-xs">
                        <div className="font-bold text-surface-900 text-xs truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-2xs text-surface-400 font-mono">
                          {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'PDF'}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-info text-2xs">
                          {doc.documentType.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td>
                        {wellName ? (
                          <div className="flex items-center gap-1 text-xs">
                            <MapPin size={11} className="text-primary-600 shrink-0" />
                            <span className="font-semibold text-surface-800">{wellName}</span>
                            {wellId && (
                              <span className="font-mono text-2xs text-surface-400">({wellId})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-surface-400 text-xs italic">Auto-detect</span>
                        )}
                      </td>

                      <td>
                        {doc.status === 'OCR_REQUIRED' ? (
                          <span className="badge badge-warning text-2xs inline-flex items-center gap-1">
                            <AlertTriangle size={10} /> Scanned (OCR Req.)
                          </span>
                        ) : doc.status === 'PROCESSED' ? (
                          <span className="badge badge-normal text-2xs inline-flex items-center gap-1">
                            <CheckCircle size={10} /> Processed
                          </span>
                        ) : (
                          <StatusBadge status={doc.status} />
                        )}
                      </td>

                      <td>
                        {eventsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                            {eventsCount} incident(s)
                          </span>
                        ) : (
                          <span className="text-surface-400 text-xs font-mono">0 events</span>
                        )}
                      </td>

                      <td className="text-surface-500 text-xs font-mono">
                        {formatDate(doc.uploadedAt)}
                      </td>

                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                          }}
                          className="btn btn-ghost text-xs py-1 px-2.5 text-primary-700 font-medium"
                        >
                          View Extracted Data <ArrowRight size={11} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ─── UPLOAD MODAL ──────────────────────────────────────────────────── */}
      {isUploadOpen && (
        <UploadModal
          wells={wells}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={() => {
            setIsUploadOpen(false);
            refetch();
          }}
        />
      )}

      {/* ─── DOCUMENT DETAIL MODAL (LIGHT ENTERPRISE THEME) ────────────────── */}
      {selectedDocId && (
        <DocumentDetailModal
          docId={selectedDocId}
          onClose={() => setSelectedDocId(null)}
          onRefreshList={() => refetch()}
        />
      )}
    </div>
  );
}

// ─── UPLOAD MODAL COMPONENT ──────────────────────────────────────────────────

function UploadModal({
  wells,
  onClose,
  onSuccess,
}: {
  wells: any[];
  onClose: () => void;
  onSuccess: () => void;
  }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('Daily Drilling Report');
  const [wellId, setWellId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (!title.trim()) {
        const cleanName = selected.name.replace(/\.[^/.]+$/, '').replace(/[_\\-]/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a PDF document to upload.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('documentType', documentType);
      if (wellId) formData.append('wellId', wellId);
      if (date) formData.append('reportDate', date);
      if (description) formData.append('description', description);

      await uploadDocument(formData);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to upload document.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-surface-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-4 border-b border-surface-200">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-primary-600" />
            <h2 className="text-sm font-bold text-surface-900">Upload Drilling Document</h2>
          </div>
          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-700 p-1 rounded hover:bg-surface-100"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {errorMsg && (
            <div className="p-2.5 rounded bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File input */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Select PDF Report <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              accept=".pdf"
              required
              onChange={handleFileChange}
              className="form-input w-full text-xs py-1.5"
            />
            <p className="text-2xs text-surface-400 mt-1">
              Select a digital drilling PDF. Text-layer documents will be automatically parsed for events.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Daily Drilling Report #24 - DUL-001"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input w-full text-xs"
            />
          </div>

          {/* Document Type & Associated Well */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="form-input w-full text-xs"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Associated Well
              </label>
              <select
                value={wellId}
                onChange={(e) => setWellId(e.target.value)}
                className="form-input w-full text-xs"
              >
                <option value="">Auto-detect from text</option>
                {wells.map((w: any) => (
                  <option key={w.id} value={w.id}>
                    {w.wellName} ({w.wellId})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Report Date & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Report Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input w-full text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">
                Notes / Remarks
              </label>
              <input
                type="text"
                placeholder="Optional notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input w-full text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="btn btn-primary text-xs font-semibold flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  Uploading & Parsing...
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Upload & Ingest
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DOCUMENT DETAIL MODAL COMPONENT (LIGHT THEME) ───────────────────────────

function DocumentDetailModal({
  docId,
  onClose,
  onRefreshList,
}: {
  docId: string;
  onClose: () => void;
  onRefreshList: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'events' | 'knowledge' | 'text' | 'meta'>('events');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: doc, isLoading, error, refetch } = useDocument(docId);

  const handleReprocess = async () => {
    setIsProcessing(true);
    try {
      await processDocument(docId);
      refetch();
      onRefreshList();
    } catch (err) {
      console.error('Failed to reprocess:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="card p-6 bg-white max-w-sm w-full text-center shadow-xl">
          <Loading text="Loading document extraction..." />
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="card p-6 bg-white max-w-md w-full shadow-xl">
          <ErrorMessage error={(error as Error) || new Error('Document not found')} retry={refetch} />
          <button onClick={onClose} className="btn btn-ghost text-xs mt-3 w-full">
            Close
          </button>
        </div>
      </div>
    );
  }

  const events = doc.drillingEvents || [];
  const knowledge = doc.knowledgeEntries || [];
  const latestExtraction = doc.extractions?.[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-surface-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-surface-200 bg-surface-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="badge badge-info text-2xs">{doc.documentType.replace(/_/g, ' ')}</span>
              {doc.status === 'OCR_REQUIRED' ? (
                <span className="badge badge-warning text-2xs">Scanned PDF (OCR Required)</span>
              ) : (
                <StatusBadge status={doc.status} />
              )}
              {doc.well && (
                <span className="inline-flex items-center gap-1 text-xs text-primary-700 font-semibold">
                  <MapPin size={11} /> {doc.well.wellName} ({doc.well.wellId})
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-surface-900 leading-tight">{doc.title}</h2>
          </div>

          <button
            onClick={onClose}
            className="text-surface-400 hover:text-surface-700 p-1.5 rounded hover:bg-surface-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Operational Link Banner */}
        <div className="px-4 py-2 bg-teal-50 border-b border-teal-100 text-2xs text-teal-900 flex items-center justify-between gap-2">
          <span>
            <strong>Operational Decision Impact:</strong> Events detected in this report are correlated with active drilling depth horizons to forecast mud losses and stuck pipe risks.
          </span>
          {doc.status !== 'PROCESSED' && (
            <button
              onClick={handleReprocess}
              disabled={isProcessing}
              className="btn btn-primary text-2xs py-0.5 px-2 shrink-0 font-semibold"
            >
              {isProcessing ? 'Processing...' : 'Run Extraction'}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-surface-200 px-4 bg-white">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'events'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Detected Drilling Events ({events.length})
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'knowledge'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Lessons Learned ({knowledge.length})
          </button>
          <button
            onClick={() => setActiveTab('text')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'text'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Extracted Text Preview
          </button>
          <button
            onClick={() => setActiveTab('meta')}
            className={`py-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'meta'
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            Document Metadata
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {/* TAB 1: DRILLING EVENTS */}
          {activeTab === 'events' && (
            <div>
              {events.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-xs">
                  {doc.status === 'PROCESSED'
                    ? 'No hazardous drilling events detected in this report.'
                    : 'Process this document to extract drilling events.'}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {events.map((ev: DrillingEvent) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border border-surface-200 bg-surface-50 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-warning text-2xs font-semibold">
                            {getEventTypeLabel(ev.eventType)}
                          </span>
                          <SeverityBadge severity={ev.severity}>{ev.severity}</SeverityBadge>
                          <span className="font-mono text-xs font-bold text-surface-800">
                            {formatDepth(ev.depth)}
                          </span>
                          {ev.formation && (
                            <span className="text-2xs text-teal-800 font-semibold px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                              {ev.formation.name}
                            </span>
                          )}
                        </div>

                        <div className="text-2xs text-surface-400 font-mono">
                          {formatDateTime(ev.timestamp)}
                        </div>
                      </div>

                      <p className="text-xs text-surface-800 leading-relaxed font-medium">
                        {ev.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                        {ev.cause && (
                          <div className="p-2 rounded bg-white border border-surface-200">
                            <span className="text-2xs text-surface-400 uppercase font-semibold block mb-0.5">
                              Root Cause
                            </span>
                            <span className="text-surface-700">{ev.cause}</span>
                          </div>
                        )}
                        {ev.mitigation && (
                          <div className="p-2 rounded bg-teal-50 border border-teal-200">
                            <span className="text-2xs text-teal-800 uppercase font-semibold block mb-0.5">
                              Mitigation Applied
                            </span>
                            <span className="text-teal-950 font-medium">{ev.mitigation}</span>
                          </div>
                        )}
                      </div>

                      {(ev.nptHours || ev.mudLossRate) && (
                        <div className="flex items-center gap-3 text-2xs text-surface-500 pt-1 font-mono">
                          {ev.nptHours && <span>NPT: <strong>{ev.nptHours} hrs</strong></span>}
                          {ev.mudLossRate && <span>Loss Rate: <strong>{ev.mudLossRate} m³/hr</strong></span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KNOWLEDGE */}
          {activeTab === 'knowledge' && (
            <div>
              {knowledge.length === 0 ? (
                <div className="text-center py-8 text-surface-400 text-xs">
                  No lessons learned entries linked to this document.
                </div>
              ) : (
                <div className="space-y-2">
                  {knowledge.map((k) => (
                    <div key={k.id} className="p-3 rounded-lg border border-surface-200 bg-surface-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="badge badge-info text-2xs">{k.category.replace(/_/g, ' ')}</span>
                        <h4 className="text-xs font-bold text-surface-900">{k.title}</h4>
                      </div>
                      <p className="text-xs text-surface-700 leading-relaxed">{k.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: EXTRACTED TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-surface-700">
                Raw Extracted Text ({latestExtraction?.rawText?.length || 0} characters)
              </div>
              <pre className="p-3 bg-surface-50 border border-surface-200 rounded-lg text-2xs font-mono text-surface-700 whitespace-pre-wrap max-h-80 overflow-y-auto leading-relaxed">
                {latestExtraction?.rawText || 'No extracted text available for this document.'}
              </pre>
            </div>
          )}

          {/* TAB 4: METADATA */}
          {activeTab === 'meta' && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
                <div className="text-2xs text-surface-400 uppercase font-semibold">Document ID</div>
                <div className="font-mono text-surface-800 break-all">{doc.id}</div>
              </div>
              <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
                <div className="text-2xs text-surface-400 uppercase font-semibold">File Size</div>
                <div className="font-mono text-surface-800">
                  {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'N/A'}
                </div>
              </div>
              <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
                <div className="text-2xs text-surface-400 uppercase font-semibold">Uploaded Date</div>
                <div className="font-mono text-surface-800">{formatDateTime(doc.uploadedAt)}</div>
              </div>
              <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
                <div className="text-2xs text-surface-400 uppercase font-semibold">Processed Date</div>
                <div className="font-mono text-surface-800">
                  {doc.processedAt ? formatDateTime(doc.processedAt) : 'Pending'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-surface-200 bg-surface-50 flex items-center justify-end">
          <button onClick={onClose} className="btn btn-ghost text-xs px-4">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
