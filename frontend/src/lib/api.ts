import axios from 'axios';
import type {
  ApiResponse,
  Well,
  WellWithDistance,
  NearbyWellsIntelligenceResponse,
  NearbyWellsFilters,
  DrillingEvent,
  DrillingParameter,
  Alert,
  RiskEvent,
  Recommendation,
  KnowledgeEntry,
  HistoricalDocument,
  HistoricalDocumentDetail,
  DocumentExtraction,
  KnowledgeSearchResult,
  Formation,
  HealthResponse,
  ActiveWellIntelligence,
  RiskAssessmentResult,
  OffsetWellScore,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Response interceptor ────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.error?.message || error.message || 'Network error';
    return Promise.reject(new Error(message));
  }
);

// ─── Health ──────────────────────────────────────────────────────────────────
export async function getHealth(): Promise<HealthResponse> {
  const { data } = await api.get<ApiResponse<HealthResponse>>('/health');
  return data.data;
}

// ─── Wells ───────────────────────────────────────────────────────────────────
export async function getWells(filters?: { status?: string; field?: string }): Promise<Well[]> {
  const { data } = await api.get<ApiResponse<Well[]>>('/wells', { params: filters });
  return data.data;
}

export async function getActiveWell(): Promise<Well> {
  const { data } = await api.get<ApiResponse<Well>>('/wells/active');
  return data.data;
}

export async function getWellById(id: string): Promise<Well> {
  const { data } = await api.get<ApiResponse<Well>>(`/wells/${id}`);
  return data.data;
}

/** Legacy nearby wells – raw lat/lng based */
export async function getNearbyWells(lat: number, lng: number, radiusKm: number = 50): Promise<WellWithDistance[]> {
  const { data } = await api.get<ApiResponse<WellWithDistance[]>>('/wells/nearby', {
    params: { lat, lng, radiusKm },
  });
  return data.data;
}

/**
 * New nearby-intelligence endpoint.
 * Backend performs Haversine filtering; returns active well + enriched offset wells.
 */
export async function getNearbyWellsIntelligence(
  filters: NearbyWellsFilters
): Promise<NearbyWellsIntelligenceResponse> {
  const { data } = await api.get<ApiResponse<NearbyWellsIntelligenceResponse>>(
    '/wells/nearby-intelligence',
    { params: filters }
  );
  return data.data;
}

export async function getWellEvents(id: string, filters?: { eventType?: string; severity?: string; limit?: number }): Promise<DrillingEvent[]> {
  const { data } = await api.get<ApiResponse<DrillingEvent[]>>(`/wells/${id}/events`, { params: filters });
  return data.data;
}

export async function getWellParameters(id: string, limit?: number): Promise<DrillingParameter[]> {
  const { data } = await api.get<ApiResponse<DrillingParameter[]>>(`/wells/${id}/parameters`, {
    params: { limit },
  });
  return data.data;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────
export async function getAlerts(filters?: { wellId?: string; severity?: string; status?: string }): Promise<Alert[]> {
  const { data } = await api.get<ApiResponse<Alert[]>>('/alerts', { params: filters });
  return data.data;
}

export async function acknowledgeAlert(id: string): Promise<Alert> {
  const { data } = await api.patch<ApiResponse<Alert>>(`/alerts/${id}/acknowledge`);
  return data.data;
}

export async function resolveAlert(id: string): Promise<Alert> {
  const { data } = await api.patch<ApiResponse<Alert>>(`/alerts/${id}/resolve`);
  return data.data;
}

export async function evaluateAlerts(params: {
  wellId?: string;
  depth?: number;
  thresholdScore?: number;
}): Promise<{
  wellId: string;
  wellName: string;
  evaluatedDepth: number;
  thresholdScore: number;
  assessedRisksCount: number;
  qualifyingRisksCount: number;
  createdCount: number;
  createdAlerts: Alert[];
  existingActiveAlertsCount: number;
}> {
  const { data } = await api.post<ApiResponse<any>>('/alerts/evaluate', params);
  return data.data;
}

// ─── Risks ───────────────────────────────────────────────────────────────────
export async function getRisks(filters?: { wellId?: string; riskType?: string; status?: string }): Promise<RiskEvent[]> {
  const { data } = await api.get<ApiResponse<RiskEvent[]>>('/risks', { params: filters });
  return data.data;
}

// ─── Formations ──────────────────────────────────────────────────────────────
export async function getFormations(): Promise<Formation[]> {
  const { data } = await api.get<ApiResponse<Formation[]>>('/formations');
  return data.data;
}

// ─── Knowledge ───────────────────────────────────────────────────────────────
export async function getKnowledge(filters?: { category?: string; search?: string }): Promise<KnowledgeEntry[]> {
  const { data } = await api.get<ApiResponse<KnowledgeEntry[]>>('/knowledge', { params: filters });
  return data.data;
}

export async function searchKnowledge(filters?: {
  q?: string;
  eventType?: string;
  formation?: string;
  wellId?: string;
  wellName?: string;
  minDepth?: number;
  maxDepth?: number;
  category?: string;
  limit?: number;
}): Promise<KnowledgeSearchResult> {
  const { data } = await api.get<ApiResponse<KnowledgeSearchResult>>('/knowledge/search', { params: filters });
  return data.data;
}

// ─── Documents ───────────────────────────────────────────────────────────────
export async function getDocuments(filters?: { wellId?: string; documentType?: string; status?: string }): Promise<HistoricalDocument[]> {
  const { data } = await api.get<ApiResponse<HistoricalDocument[]>>('/documents', { params: filters });
  return data.data;
}

export async function getDocument(id: string): Promise<HistoricalDocumentDetail> {
  const { data } = await api.get<ApiResponse<HistoricalDocumentDetail>>(`/documents/${id}`);
  return data.data;
}

export async function uploadDocument(formData: FormData): Promise<{
  success: boolean;
  message: string;
  data: HistoricalDocumentDetail;
  extraction: any;
}> {
  const { data } = await api.post<ApiResponse<HistoricalDocumentDetail> & { extraction: any }>('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return {
    success: data.success,
    message: 'Document uploaded successfully',
    data: data.data,
    extraction: data.extraction,
  };
}

export async function processDocument(id: string): Promise<{
  success: boolean;
  message: string;
  data: HistoricalDocumentDetail;
  extractionResult: any;
}> {
  const { data } = await api.post<ApiResponse<HistoricalDocumentDetail> & { extractionResult: any }>(`/documents/${id}/process`);
  return {
    success: data.success,
    message: data.error?.message || 'Document processed successfully',
    data: data.data,
    extractionResult: data.extractionResult,
  };
}

export async function getDocumentExtraction(id: string): Promise<DocumentExtraction> {
  const { data } = await api.get<ApiResponse<DocumentExtraction>>(`/documents/${id}/extraction`);
  return data.data;
}

// ─── Recommendations ─────────────────────────────────────────────────────────
export async function getRecommendations(filters?: { wellId?: string; category?: string }): Promise<Recommendation[]> {
  const { data } = await api.get<ApiResponse<Recommendation[]>>('/recommendations', { params: filters });
  return data.data;
}

// ─── Intelligence ────────────────────────────────────────────────────────────

/** Full intelligence analysis for a well at a given depth */
export async function getActiveWellIntelligence(
  wellId: string,
  options?: { depth?: number; depthWindow?: number; radiusKm?: number }
): Promise<ActiveWellIntelligence> {
  const { data } = await api.get<ApiResponse<ActiveWellIntelligence>>(
    `/intelligence/active-well/${wellId}`,
    { params: options }
  );
  return data.data;
}

/** Offset well scores only */
export async function getActiveWellOffsets(
  wellId: string,
  options?: { depth?: number; depthWindow?: number; radiusKm?: number }
): Promise<OffsetWellScore[]> {
  const { data } = await api.get<ApiResponse<OffsetWellScore[]>>(
    `/intelligence/active-well/${wellId}/offsets`,
    { params: options }
  );
  return data.data;
}

/** Risk assessment only */
export async function getActiveWellRisks(
  wellId: string,
  options?: { depth?: number; depthWindow?: number; radiusKm?: number }
): Promise<RiskAssessmentResult> {
  const { data } = await api.get<ApiResponse<RiskAssessmentResult>>(
    `/intelligence/active-well/${wellId}/risks`,
    { params: options }
  );
  return data.data;
}

export default api;
