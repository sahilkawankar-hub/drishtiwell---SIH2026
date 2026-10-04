/**
 * Knowledge Search Service
 * 
 * Provides unified multi-dimensional search across:
 *   - KnowledgeRepository (lessons learned, best practices, mitigations, geological notes)
 *   - Historical DrillingEvents (with well, formation, and source document links)
 * 
 * Supports filtering by keyword, event type, formation, well, depth range, and category.
 */

import prisma from '../utils/prisma';

export interface KnowledgeSearchFilters {
  q?: string;
  eventType?: string;
  formation?: string;
  wellId?: string;
  wellName?: string;
  minDepth?: number;
  maxDepth?: number;
  category?: string;
  limit?: number;
}

export interface KnowledgeSearchResult {
  query: KnowledgeSearchFilters;
  totalMatches: number;
  knowledgeEntries: Array<{
    id: string;
    title: string;
    category: string;
    content: string;
    tags: string[];
    wellRef: string | null;
    depthRef: number | null;
    formationRef: string | null;
    author: string | null;
    verified: boolean;
    createdAt: string;
  }>;
  drillingEvents: Array<{
    id: string;
    eventType: string;
    depth: number;
    severity: string;
    description: string;
    cause: string | null;
    mitigation: string | null;
    outcome: string | null;
    nptHours: number | null;
    mudLossRate: number | null;
    well: {
      id: string;
      wellId: string;
      wellName: string;
      field: string;
      block: string;
    };
    formation: {
      id: string;
      name: string;
      code: string;
    } | null;
    sourceDocument: {
      id: string;
      title: string;
      documentType: string;
    } | null;
    timestamp: string;
  }>;
  facets: {
    categories: Record<string, number>;
    eventTypes: Record<string, number>;
    formations: Record<string, number>;
  };
}

export class KnowledgeSearchService {
  async search(filters: KnowledgeSearchFilters): Promise<KnowledgeSearchResult> {
    const q = filters.q?.trim() || '';
    const eventType = filters.eventType?.trim();
    const formation = filters.formation?.trim();
    const wellId = filters.wellId?.trim();
    const wellName = filters.wellName?.trim();
    const minDepth = filters.minDepth !== undefined ? Number(filters.minDepth) : undefined;
    const maxDepth = filters.maxDepth !== undefined ? Number(filters.maxDepth) : undefined;
    const category = filters.category?.trim();
    const limit = filters.limit ? Math.min(Number(filters.limit), 100) : 50;

    // ─── 1. Query Knowledge Entries ──────────────────────────────────────────
    const knowledgeWhere: any = {};

    if (category && category !== 'ALL') {
      knowledgeWhere.category = category;
    }

    if (formation) {
      knowledgeWhere.formationRef = { contains: formation };
    }

    if (wellName) {
      knowledgeWhere.wellRef = { contains: wellName };
    }

    if (minDepth !== undefined || maxDepth !== undefined) {
      knowledgeWhere.depthRef = {};
      if (minDepth !== undefined) knowledgeWhere.depthRef.gte = minDepth;
      if (maxDepth !== undefined) knowledgeWhere.depthRef.lte = maxDepth;
    }

    if (q) {
      knowledgeWhere.OR = [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
        { wellRef: { contains: q } },
        { formationRef: { contains: q } },
      ];
    }

    const rawKnowledge = await prisma.knowledgeEntry.findMany({
      where: knowledgeWhere,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // ─── 2. Query Drilling Events ───────────────────────────────────────────
    const eventWhere: any = {};

    if (eventType && eventType !== 'ALL') {
      eventWhere.eventType = eventType;
    }

    if (wellId) {
      eventWhere.wellId = wellId;
    }

    if (wellName) {
      eventWhere.well = { wellName: { contains: wellName } };
    }

    if (formation) {
      eventWhere.formation = { name: { contains: formation } };
    }

    if (minDepth !== undefined || maxDepth !== undefined) {
      eventWhere.depth = {};
      if (minDepth !== undefined) eventWhere.depth.gte = minDepth;
      if (maxDepth !== undefined) eventWhere.depth.lte = maxDepth;
    }

    if (q) {
      eventWhere.OR = [
        { description: { contains: q } },
        { cause: { contains: q } },
        { mitigation: { contains: q } },
        { outcome: { contains: q } },
        { eventType: { contains: q } },
      ];
    }

    const rawEvents = await prisma.drillingEvent.findMany({
      where: eventWhere,
      include: {
        well: {
          select: { id: true, wellId: true, wellName: true, field: true, block: true },
        },
        formation: {
          select: { id: true, name: true, code: true },
        },
        sourceDocument: {
          select: { id: true, title: true, documentType: true },
        },
      },
      take: limit,
      orderBy: { depth: 'asc' },
    });

    // ─── 3. Format and Compute Facets ────────────────────────────────────────
    const categories: Record<string, number> = {};
    for (const kn of rawKnowledge) {
      categories[kn.category] = (categories[kn.category] || 0) + 1;
    }

    const eventTypes: Record<string, number> = {};
    const formations: Record<string, number> = {};
    for (const ev of rawEvents) {
      eventTypes[ev.eventType] = (eventTypes[ev.eventType] || 0) + 1;
      if (ev.formation?.name) {
        formations[ev.formation.name] = (formations[ev.formation.name] || 0) + 1;
      }
    }

    const knowledgeEntries = rawKnowledge.map((kn) => {
      let parsedTags: string[] = [];
      try {
        if (kn.tags) parsedTags = JSON.parse(kn.tags);
      } catch {
        parsedTags = kn.tags ? [kn.tags] : [];
      }
      return {
        id: kn.id,
        title: kn.title,
        category: kn.category,
        content: kn.content,
        tags: parsedTags,
        wellRef: kn.wellRef,
        depthRef: kn.depthRef,
        formationRef: kn.formationRef,
        author: kn.author,
        verified: kn.verified,
        createdAt: kn.createdAt.toISOString(),
      };
    });

    const drillingEvents = rawEvents.map((ev) => ({
      id: ev.id,
      eventType: ev.eventType,
      depth: ev.depth,
      severity: ev.severity,
      description: ev.description,
      cause: ev.cause,
      mitigation: ev.mitigation,
      outcome: ev.outcome,
      nptHours: ev.nptHours,
      mudLossRate: ev.mudLossRate,
      well: ev.well,
      formation: ev.formation,
      sourceDocument: ev.sourceDocument,
      timestamp: ev.timestamp.toISOString(),
    }));

    return {
      query: filters,
      totalMatches: knowledgeEntries.length + drillingEvents.length,
      knowledgeEntries,
      drillingEvents,
      facets: {
        categories,
        eventTypes,
        formations,
      },
    };
  }
}

export const knowledgeSearchService = new KnowledgeSearchService();
export default knowledgeSearchService;
