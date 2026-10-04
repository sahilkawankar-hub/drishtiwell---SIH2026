import { useState } from 'react';
import {
  FileText, Upload, RefreshCw, CheckCircle, AlertTriangle,
  Brain, FileCode, Layers, Shield,
  X, Play, Tag,
} from 'lucide-react';
import { Card, MetricCard } from '../components/ui/Card';
import { StatusBadge, SeverityBadge } from '../components/ui/Badge';
import { Loading, ErrorMessage, EmptyState } from '../components/ui/Loading';
import { formatDate, formatDateTime, formatDepth } from '../lib/utils';
import { useDocuments, useDocument, useWells } from '../hooks/useApi';
import { uploadDocument, processDocument } from '../lib/api';

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

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="card p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-l-4 border-l-primary-600 bg-white shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-surface-900 font-bold text-lg">Document Intelligence</h1>
              <span className="badge badge-info text-2xs">Automated Extraction</span>
            </div>
            <p className="text-xs text-surface-500 mt-0.5">
              Historical drilling PDF ingestion, domain entity extraction, and structured knowledge repository for Duliajan field.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            id="docs-refresh-btn"
            onClick={() => refetch()}
            className="btn btn-ghost text-xs"
            title="Refresh documents list"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            id="doc-upload-open-btn"
            onClick={() => setIsUploadOpen(true)}
            className="btn btn-primary text-xs"
          >
            <Upload size={14} /> Upload Drilling PDF
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Documents"
          value={docs.length}
          icon={<FileText size={18} />}
          color="#60a5fa"
        />
        <MetricCard
          label="Processed"
          value={processedCount}
          icon={<CheckCircle size={18} />}
          color="#22c55e"
        />
        <MetricCard
          label="OCR Required / Pending"
          value={ocrRequiredCount + pendingCount}
          sub={ocrRequiredCount > 0 ? `${ocrRequiredCount} require OCR` : undefined}
          icon={<AlertTriangle size={18} />}
          color="#f59e0b"
        />
        <MetricCard
          label="AI Engine"
          value={<span className="text-sm font-semibold text-primary-300">Demo AI</span>}
          sub="Deterministic extraction"
          icon={<Brain size={18} />}
          color="#a78bfa"
        />
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full md:w-auto flex-1">
            <input
              id="docs-search-input"
              type="text"
              placeholder="Search documents by title, well, or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input flex-1 max-w-md text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <select
              id="docs-type-filter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-input text-xs"
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
              className="form-input text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="PROCESSED">Processed</option>
              <option value="PENDING">Pending</option>
              <option value="OCR_REQUIRED">OCR Required</option>
              <option value="ERROR">Error</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Table */}
      <Card
        title="Drilling Documents"
        subtitle={`${filteredDocs.length} document(s) registered · Click any document to view extracted events and text`}
      >
        {filteredDocs.length === 0 ? (
          <div className="text-center py-8">
            <EmptyState message="No documents matching your criteria" />
            <button
              className="btn btn-primary text-xs mt-3 inline-flex items-center gap-1.5"
              onClick={() => setIsUploadOpen(true)}
            >
              <Upload size={14} /> Upload a Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Type</th>
                  <th>Well</th>
                  <th>Status</th>
                  <th>Confidence</th>
                  <th>Created Events</th>
                  <th>Uploaded</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocs.map((doc) => {
                  const latestExtraction = doc.extractions?.[0];
                  const confidencePct = latestExtraction
                    ? Math.round(latestExtraction.confidence * 100)
                    : null;

                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                      className="cursor-pointer hover:bg-surface-50 transition-colors"
                    >
                      <td className="max-w-xs">
                        <div className="font-bold text-surface-900 truncate" title={doc.title}>
                          {doc.title}
                        </div>
                        <div className="text-2xs text-surface-500 font-mono">
                          {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'PDF'}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-info text-2xs">
                          {doc.documentType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="text-surface-700">
                        {doc.well?.wellName ? (
                          <span className="font-semibold text-primary-700">
                            {doc.well.wellName}
                          </span>
                        ) : (
                          <span className="text-surface-400 italic">Auto-detect</span>
                        )}
                      </td>
                      <td>
                        {doc.status === 'OCR_REQUIRED' ? (
                          <span className="badge badge-warning text-2xs">
                            <AlertTriangle size={10} /> OCR Required
                          </span>
                        ) : (
                          <StatusBadge status={doc.status} />
                        )}
                      </td>
                      <td>
                        {confidencePct !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs text-white">{confidencePct}%</span>
                            <div className="w-12 bg-surface-600 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${confidencePct}%`,
                                  backgroundColor:
                                    confidencePct >= 80
                                      ? '#22c55e'
                                      : confidencePct >= 60
                                      ? '#f59e0b'
                                      : '#ef4444',
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>
                      <td>
                        <span className="font-mono text-xs text-slate-300">
                          {doc.drillingEvents?.length ?? 0}
                        </span>
                      </td>
                      <td className="text-slate-400 text-xs font-mono">
                        {formatDate(doc.uploadedAt)}
                      </td>
                      <td>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(doc.id);
                          }}
                          className="btn btn-ghost text-xs py-1 px-2"
                        >
                          View Details
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

      {/* Upload Modal */}
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

      {/* Document Detail Modal */}
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

// ─── Upload Modal Component ──────────────────────────────────────────────────

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
      setErrorMsg('Please select a PDF file to upload.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Please enter a document name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('documentType', documentType);
      if (wellId) formData.append('wellId', wellId);
      formData.append('date', date);
      if (description) formData.append('description', description);

      await uploadDocument(formData);
      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to upload document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="card w-full max-w-lg bg-white border border-surface-200 shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-100 bg-surface-50">
          <div className="flex items-center gap-2">
            <Upload size={18} className="text-primary-600" />
            <h3 className="font-bold text-surface-900 text-sm">Upload Historical Drilling PDF</h3>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-700">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded bg-status-criticalBg border border-status-critical/50 text-xs text-status-critical flex items-center gap-2">
              <AlertTriangle size={14} />
              {errorMsg}
            </div>
          )}

          {/* File input */}
          <div>
            <label className="block text-xs font-semibold text-surface-700 mb-1">
              Select PDF File <span className="text-status-critical">*</span>
            </label>
            <div className="border-2 border-dashed border-surface-300 hover:border-primary-500 rounded-lg p-4 text-center cursor-pointer transition-colors bg-surface-50">
              <input
                id="doc-file-input"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="doc-file-input" className="cursor-pointer">
                <FileText size={28} className="mx-auto text-primary-600 mb-2" />
                {file ? (
                  <div className="text-sm font-bold text-surface-900">
                    {file.name}{' '}
                    <span className="text-xs text-surface-500 font-normal">
                      ({Math.round(file.size / 1024)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-primary-700">
                      Click to choose PDF or drag & drop here
                    </div>
                    <div className="text-2xs text-surface-400 mt-1">
                      PDF with selectable text will be parsed. Scanned PDFs will be marked for OCR.
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Document Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Document Name / Title <span className="text-status-critical">*</span>
            </label>
            <input
              id="doc-title-input"
              type="text"
              required
              placeholder="e.g., Daily Drilling Report #42"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="form-input w-full text-xs"
            />
          </div>

          {/* Document Type & Well Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Document Type <span className="text-status-critical">*</span>
              </label>
              <select
                id="doc-type-select"
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
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Associated Well
              </label>
              <select
                id="doc-well-select"
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

          {/* Date & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Report Date
              </label>
              <input
                id="doc-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Description / Notes
              </label>
              <input
                id="doc-desc-input"
                type="text"
                placeholder="Optional summary note"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input w-full text-xs"
              />
            </div>
          </div>

          <div className="text-2xs text-slate-500 bg-surface-700/50 p-2 rounded flex items-center gap-1.5">
            <Brain size={12} className="text-primary-400 flex-shrink-0" />
            <span>
              Document will be stored locally and automatically processed through Demo AI extraction.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              id="doc-submit-btn"
              type="submit"
              disabled={isSubmitting || !file}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Uploading & Analyzing...
                </>
              ) : (
                <>
                  <Upload size={14} /> Upload & Extract
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Document Detail Modal Component ────────────────────────────────────────

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
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="card p-8 bg-surface-800 max-w-md w-full text-center">
          <Loading text="Loading document analysis..." />
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="card p-6 bg-surface-800 max-w-md w-full">
          <ErrorMessage error={error as Error || new Error('Document not found')} retry={refetch} />
          <button onClick={onClose} className="btn btn-ghost text-xs mt-4 w-full">
            Close
          </button>
        </div>
      </div>
    );
  }

  const latestExtraction = doc.extractions?.[0];
  let parsedStructured: any = null;
  if (latestExtraction?.structuredData) {
    try {
      parsedStructured =
        typeof latestExtraction.structuredData === 'string'
          ? JSON.parse(latestExtraction.structuredData)
          : latestExtraction.structuredData;
    } catch {
      parsedStructured = null;
    }
  }

  const confidencePct = latestExtraction ? Math.round(latestExtraction.confidence * 100) : 0;
  const drillingEvents = doc.drillingEvents || [];
  const knowledgeEntries = doc.knowledgeEntries || [];
  const parameters = parsedStructured?.parameters || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="card w-full max-w-4xl max-h-[90vh] bg-white border border-surface-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-surface-100 bg-surface-50 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="badge badge-info text-2xs">
                {doc.documentType.replace(/_/g, ' ')}
              </span>
              <StatusBadge status={doc.status} />
              <span className="text-2xs text-surface-500 font-mono">
                Uploaded: {formatDateTime(doc.uploadedAt)}
              </span>
              {doc.processedAt && (
                <span className="text-2xs text-teal-700 font-mono font-semibold">
                  Processed: {formatDateTime(doc.processedAt)}
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-surface-900">{doc.title}</h2>
            <div className="text-xs text-surface-500 mt-0.5 flex items-center gap-2">
              <span>Well: {doc.well?.wellName || 'Unassigned / Auto-detected'}</span>
              <span>·</span>
              <span>File size: {doc.fileSize ? `${Math.round(doc.fileSize / 1024)} KB` : 'N/A'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="doc-reprocess-btn"
              onClick={handleReprocess}
              disabled={isProcessing}
              className="btn btn-primary text-xs flex items-center gap-1.5"
              title="Run Demo AI extraction again"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  <Play size={14} /> Re-process Document
                </>
              )}
            </button>
            <button onClick={onClose} className="text-surface-400 hover:text-surface-700 p-1">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Confidence Banner */}
        <div className="bg-surface-50 px-4 py-2 border-b border-surface-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Brain size={14} className="text-primary-600" />
            <span className="text-surface-600 font-medium">Extraction Provider:</span>
            <span className="text-primary-800 font-bold">Structured Text & RegEx Parser</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-surface-500 font-medium">Confidence:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-surface-900">{confidencePct}%</span>
              <div className="w-16 bg-surface-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${confidencePct}%`,
                    backgroundColor:
                      confidencePct >= 80 ? '#16a34a' : confidencePct >= 50 ? '#d97706' : '#dc2626',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-surface-200 px-4 bg-white">
          <button
            onClick={() => setActiveTab('events')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'events'
                ? 'border-primary-600 text-primary-700 font-bold'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Layers size={14} />
            Extracted Events ({drillingEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('knowledge')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'knowledge'
                ? 'border-primary-600 text-primary-700 font-bold'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Shield size={14} />
            Knowledge & Lessons ({knowledgeEntries.length})
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'text'
                ? 'border-primary-600 text-primary-700 font-bold'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <FileCode size={14} />
            Extracted Text
          </button>

          <button
            onClick={() => setActiveTab('meta')}
            className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'meta'
                ? 'border-primary-600 text-primary-700 font-bold'
                : 'border-transparent text-surface-500 hover:text-surface-800'
            }`}
          >
            <Tag size={14} />
            Metadata & JSON
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: EVENTS */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {drillingEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  {doc.status === 'OCR_REQUIRED'
                    ? 'No selectable text found in this scanned document. OCR is required to extract drilling events.'
                    : 'No drilling events were identified in this document.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {drillingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-lg border border-surface-200 bg-surface-50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-surface-900">
                            {ev.eventType.replace(/_/g, ' ')}
                          </span>
                          <SeverityBadge severity={ev.severity}>{ev.severity}</SeverityBadge>
                          <span className="font-mono text-xs text-primary-700 font-semibold">
                            @ {formatDepth(ev.depth)}
                          </span>
                        </div>
                        {ev.nptHours && (
                          <span className="text-2xs font-mono px-2 py-0.5 rounded bg-surface-200 text-surface-700 font-semibold">
                            NPT: {ev.nptHours} hrs
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-surface-700">{ev.description}</p>

                      {ev.cause && (
                        <div className="text-xs bg-white p-2 rounded border border-surface-200">
                          <span className="text-surface-500 font-semibold">Cause: </span>
                          <span className="text-surface-800">{ev.cause}</span>
                        </div>
                      )}

                      {ev.mitigation && (
                        <div className="text-xs bg-teal-50 border border-teal-200 p-2 rounded">
                          <span className="text-teal-800 font-semibold">Mitigation: </span>
                          <span className="text-teal-950 font-medium">{ev.mitigation}</span>
                        </div>
                      )}

                      {ev.outcome && (
                        <div className="text-xs text-surface-500 italic">
                          <span>Outcome: </span>
                          {ev.outcome}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Parameters section */}
              {parameters.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
                    Extracted Drilling Parameters
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {parameters.map((p: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-surface-50 border border-surface-200">
                        <div className="text-2xs font-semibold text-surface-500 uppercase">{p.paramName}</div>
                        <div className="text-sm font-bold font-mono text-surface-900 mt-0.5">
                          {p.value} <span className="text-2xs font-normal text-surface-500">{p.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: KNOWLEDGE */}
          {activeTab === 'knowledge' && (
            <div className="space-y-3">
              {knowledgeEntries.length === 0 ? (
                <div className="text-center py-8 text-surface-500 text-xs">
                  No knowledge entries or lessons learned extracted from this document.
                </div>
              ) : (
                knowledgeEntries.map((kn) => (
                  <div
                    key={kn.id}
                    className="p-3 rounded-lg border border-surface-200 bg-surface-50 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="badge badge-normal text-2xs">{kn.category}</span>
                        <h4 className="text-sm font-bold text-surface-900">{kn.title}</h4>
                      </div>
                      {kn.depthRef && (
                        <span className="text-2xs font-mono text-surface-500 font-semibold">
                          @ {formatDepth(kn.depthRef)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-surface-700 leading-relaxed">{kn.content}</p>
                    {kn.formationRef && (
                      <div className="text-2xs text-teal-700 font-semibold">
                        Formation: {kn.formationRef}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: EXTRACTED TEXT */}
          {activeTab === 'text' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-2xs text-surface-500 font-medium">
                <span>Selectable Text Stream</span>
                <span>
                  {latestExtraction?.rawText ? `${latestExtraction.rawText.length} characters` : 'No text'}
                </span>
              </div>
              <div className="bg-surface-50 border border-surface-200 rounded-lg p-3 font-mono text-xs text-surface-800 whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed shadow-2xs">
                {latestExtraction?.rawText || (
                  <span className="text-surface-400 italic">No text extracted.</span>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: METADATA & JSON */}
          {activeTab === 'meta' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
                  <span className="text-surface-500 font-medium block">Document ID:</span>
                  <span className="font-mono text-surface-800 font-bold">{doc.id}</span>
                </div>
                <div className="p-2.5 rounded bg-surface-50 border border-surface-200">
                  <span className="text-surface-500 font-medium block">File URL:</span>
                  <span className="font-mono text-surface-800">{doc.fileUrl || 'N/A'}</span>
                </div>
              </div>

              <div>
                <span className="text-2xs font-bold text-surface-500 uppercase tracking-wider block mb-1">
                  Structured Extraction JSON
                </span>
                <pre className="bg-surface-50 border border-surface-200 rounded-lg p-3 font-mono text-2xs text-surface-800 overflow-x-auto max-h-72">
                  {JSON.stringify(parsedStructured, null, 2) || '{}'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-surface-200 bg-surface-50 flex items-center justify-between">
          <div className="text-2xs text-surface-500">
            Source document linked to active offset-well intelligence engine.
          </div>
          <button onClick={onClose} className="btn btn-ghost text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
