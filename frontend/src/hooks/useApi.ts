import { useQuery } from '@tanstack/react-query';
import * as api from '../lib/api';
import type { NearbyWellsFilters } from '../types';

export function useActiveWell() {
  return useQuery({
    queryKey: ['wells', 'active'],
    queryFn: api.getActiveWell,
    refetchInterval: 30000, // 30s
    staleTime: 15000,
  });
}

export function useWells(filters?: { status?: string; field?: string }) {
  return useQuery({
    queryKey: ['wells', filters],
    queryFn: () => api.getWells(filters),
    staleTime: 60000,
  });
}

export function useWellById(id: string) {
  return useQuery({
    queryKey: ['well', id],
    queryFn: () => api.getWellById(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

/** Legacy nearby hook – uses raw lat/lng */
export function useNearbyWells(lat?: number, lng?: number, radiusKm = 50) {
  return useQuery({
    queryKey: ['wells', 'nearby', lat, lng, radiusKm],
    queryFn: () => api.getNearbyWells(lat!, lng!, radiusKm),
    enabled: lat !== undefined && lng !== undefined,
    staleTime: 60000,
  });
}

/**
 * New nearby-intelligence hook.
 * Calls the backend Haversine-filtered endpoint with full filter support.
 */
export function useNearbyWellsIntelligence(filters: NearbyWellsFilters | null) {
  return useQuery({
    queryKey: ['wells', 'nearby-intelligence', filters],
    queryFn: () => api.getNearbyWellsIntelligence(filters!),
    enabled: !!filters?.activeWellId,
    staleTime: 60000,
  });
}

export function useWellEvents(id: string, filters?: { eventType?: string; severity?: string }) {
  return useQuery({
    queryKey: ['well-events', id, filters],
    queryFn: () => api.getWellEvents(id, filters),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useWellParameters(id: string, limit?: number) {
  return useQuery({
    queryKey: ['well-params', id, limit],
    queryFn: () => api.getWellParameters(id, limit),
    enabled: !!id,
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useAlerts(filters?: { wellId?: string; severity?: string; status?: string }) {
  return useQuery({
    queryKey: ['alerts', filters],
    queryFn: () => api.getAlerts(filters),
    refetchInterval: 30000,
    staleTime: 15000,
  });
}

export function useRisks(filters?: { wellId?: string; riskType?: string; status?: string }) {
  return useQuery({
    queryKey: ['risks', filters],
    queryFn: () => api.getRisks(filters),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useFormations() {
  return useQuery({
    queryKey: ['formations'],
    queryFn: api.getFormations,
    staleTime: 300000, // 5 min - formations don't change often
  });
}

export function useKnowledge(filters?: { category?: string; search?: string }) {
  return useQuery({
    queryKey: ['knowledge', filters],
    queryFn: () => api.getKnowledge(filters),
    staleTime: 120000,
  });
}

export function useDocuments(filters?: { wellId?: string; documentType?: string; status?: string }) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => api.getDocuments(filters),
    staleTime: 30000,
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => api.getDocument(id!),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useDocumentExtraction(id: string | undefined) {
  return useQuery({
    queryKey: ['document-extraction', id],
    queryFn: () => api.getDocumentExtraction(id!),
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useKnowledgeSearch(filters?: {
  q?: string;
  eventType?: string;
  formation?: string;
  wellId?: string;
  wellName?: string;
  minDepth?: number;
  maxDepth?: number;
  category?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['knowledge-search', filters],
    queryFn: () => api.searchKnowledge(filters),
    staleTime: 30000,
  });
}

export function useRecommendations(filters?: { wellId?: string; category?: string }) {
  return useQuery({
    queryKey: ['recommendations', filters],
    queryFn: () => api.getRecommendations(filters),
    staleTime: 60000,
  });
}

// ─── Intelligence Hooks ──────────────────────────────────────────────────────

export function useActiveWellIntelligence(
  wellId: string | undefined,
  options?: { depth?: number; depthWindow?: number; radiusKm?: number }
) {
  return useQuery({
    queryKey: ['intelligence', wellId, options],
    queryFn: () => api.getActiveWellIntelligence(wellId!, options),
    enabled: !!wellId,
    staleTime: 30000,
  });
}

export function useActiveWellRisks(
  wellId: string | undefined,
  options?: { depth?: number; depthWindow?: number; radiusKm?: number }
) {
  return useQuery({
    queryKey: ['intelligence-risks', wellId, options],
    queryFn: () => api.getActiveWellRisks(wellId!, options),
    enabled: !!wellId,
    staleTime: 30000,
  });
}

