/**
 * Offset-Well Intelligence Service
 *
 * Core intelligence engine for SIH PS 26121.
 * Given an active well and its current depth, this service:
 *   1. Finds nearby offset wells (Haversine distance)
 *   2. Computes formation overlap
 *   3. Evaluates depth similarity
 *   4. Scores historical event relevance
 *   5. Produces an overall similarity score (0–100)
 *
 * All scoring is deterministic — NO random values.
 */

import prisma from '../utils/prisma';
import { calculateDistanceKm } from '../utils/geospatial';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Default depth window for finding relevant events (±metres) */
const DEFAULT_DEPTH_WINDOW = 150;

/** Maximum search radius (km) */
const DEFAULT_RADIUS_KM = 50;

/** Event types considered relevant for risk intelligence */
const RELEVANT_EVENT_TYPES = [
  'MUD_LOSS',
  'STUCK_PIPE',
  'KICK',
  'OVERPRESSURE',
  'TORQUE_SPIKE',
  'CEMENTING_ISSUE',
  'LOST_CIRCULATION',
  'WELL_CONTROL',
] as const;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OffsetWellScore {
  well: {
    id: string;
    wellId: string;
    wellName: string;
    field: string;
    block: string;
    latitude: number;
    longitude: number;
    status: string;
    wellType: string;
    currentDepth: number;
    totalDepth: number | null;
  };
  distanceKm: number;
  formationMatch: {
    matchedFormations: string[];
    activeWellFormations: string[];
    offsetWellFormations: string[];
    overlapRatio: number; // 0–1
  };
  depthSimilarity: number; // 0–1
  relevantEvents: RelevantEvent[];
  eventRelevanceScore: number; // 0–1
  similarityScore: number; // 0–100
}

export interface RelevantEvent {
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
  timestamp: string;
  wellId: string;
  wellName: string;
  formationName: string | null;
  depthDelta: number; // distance from active well current depth
}

export interface ActiveWellIntelligence {
  activeWell: {
    id: string;
    wellId: string;
    wellName: string;
    currentDepth: number;
    totalDepth: number | null;
    currentFormation: string | null;
    currentFormationName: string | null;
    status: string;
    field: string;
    block: string;
    latitude: number;
    longitude: number;
    wellType: string;
    spudDate: string | null;
  };
  offsetWells: OffsetWellScore[];
  allRelevantEvents: RelevantEvent[];
  depthWindow: number;
  radiusKm: number;
  summary: {
    totalOffsetWells: number;
    totalRelevantEvents: number;
    highestSimilarity: number;
    nearestWellKm: number;
    dominantRiskTypes: string[];
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class OffsetIntelligenceService {
  /**
   * Full intelligence analysis for an active well at a given depth.
   */
  async analyzeActiveWell(
    wellId: string,
    options: {
      depthOverride?: number;
      depthWindow?: number;
      radiusKm?: number;
    } = {}
  ): Promise<ActiveWellIntelligence | null> {
    const depthWindow = options.depthWindow ?? DEFAULT_DEPTH_WINDOW;
    const radiusKm = options.radiusKm ?? DEFAULT_RADIUS_KM;

    // 1. Resolve active well
    const activeWell = await prisma.well.findFirst({
      where: { OR: [{ id: wellId }, { wellId }] },
      include: {
        formations: { include: { formation: true } },
      },
    });

    if (!activeWell) return null;

    const currentDepth = options.depthOverride ?? activeWell.currentDepth;

    // Determine which formation the well is currently in
    const activeFormation = activeWell.formations.find(
      (wf) => currentDepth >= wf.topDepth && currentDepth <= wf.bottomDepth
    );
    const currentFormation = activeFormation?.formation ?? null;

    // 2. Get all other wells
    const allWells = await prisma.well.findMany({
      where: { NOT: { id: activeWell.id } },
      include: {
        formations: { include: { formation: true } },
        drillingEvents: {
          include: { formation: true },
          orderBy: { depth: 'asc' },
        },
      },
    });

    // 3. Filter by radius and score each offset well
    const activeFormationNames = activeWell.formations.map(
      (wf) => wf.formation.name
    );

    const offsetWells: OffsetWellScore[] = [];

    for (const well of allWells) {
      const distanceKm = calculateDistanceKm(
        activeWell.latitude,
        activeWell.longitude,
        well.latitude,
        well.longitude
      );

      if (distanceKm > radiusKm) continue;

      const offsetFormationNames = well.formations.map(
        (wf) => wf.formation.name
      );

      // Formation match
      const matchedFormations = activeFormationNames.filter((f) =>
        offsetFormationNames.includes(f)
      );
      const unionSize = new Set([
        ...activeFormationNames,
        ...offsetFormationNames,
      ]).size;
      const overlapRatio =
        unionSize > 0 ? matchedFormations.length / unionSize : 0;

      // Depth similarity — how close is the offset well's TD to the active well's current depth?
      const depthSimilarity = computeDepthSimilarity(
        currentDepth,
        well.currentDepth,
        activeWell.totalDepth ?? currentDepth
      );

      // Find relevant events within depth window
      const relevantEvents = findRelevantEvents(
        well,
        currentDepth,
        depthWindow
      );

      // Event relevance score
      const eventRelevanceScore = computeEventRelevanceScore(
        relevantEvents,
        currentDepth,
        depthWindow
      );

      // Overall similarity score (0–100)
      const similarityScore = computeSimilarityScore(
        distanceKm,
        radiusKm,
        overlapRatio,
        depthSimilarity,
        eventRelevanceScore
      );

      offsetWells.push({
        well: {
          id: well.id,
          wellId: well.wellId,
          wellName: well.wellName,
          field: well.field,
          block: well.block,
          latitude: well.latitude,
          longitude: well.longitude,
          status: well.status,
          wellType: well.wellType,
          currentDepth: well.currentDepth,
          totalDepth: well.totalDepth,
        },
        distanceKm: Math.round(distanceKm * 100) / 100,
        formationMatch: {
          matchedFormations,
          activeWellFormations: activeFormationNames,
          offsetWellFormations: offsetFormationNames,
          overlapRatio: Math.round(overlapRatio * 100) / 100,
        },
        depthSimilarity: Math.round(depthSimilarity * 100) / 100,
        relevantEvents,
        eventRelevanceScore: Math.round(eventRelevanceScore * 100) / 100,
        similarityScore: Math.round(similarityScore),
      });
    }

    // Sort by similarity score descending
    offsetWells.sort((a, b) => b.similarityScore - a.similarityScore);

    // Collect all relevant events across offset wells
    const allRelevantEvents = offsetWells
      .flatMap((ow) => ow.relevantEvents)
      .sort((a, b) => Math.abs(a.depthDelta) - Math.abs(b.depthDelta));

    // Count dominant risk types
    const riskTypeCounts: Record<string, number> = {};
    for (const event of allRelevantEvents) {
      riskTypeCounts[event.eventType] =
        (riskTypeCounts[event.eventType] || 0) + 1;
    }
    const dominantRiskTypes = Object.entries(riskTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type);

    return {
      activeWell: {
        id: activeWell.id,
        wellId: activeWell.wellId,
        wellName: activeWell.wellName,
        currentDepth,
        totalDepth: activeWell.totalDepth,
        currentFormation: currentFormation?.code ?? activeWell.currentFormation,
        currentFormationName: currentFormation?.name ?? null,
        status: activeWell.status,
        field: activeWell.field,
        block: activeWell.block,
        latitude: activeWell.latitude,
        longitude: activeWell.longitude,
        wellType: activeWell.wellType,
        spudDate: activeWell.spudDate?.toISOString() ?? null,
      },
      offsetWells,
      allRelevantEvents,
      depthWindow,
      radiusKm,
      summary: {
        totalOffsetWells: offsetWells.length,
        totalRelevantEvents: allRelevantEvents.length,
        highestSimilarity: offsetWells[0]?.similarityScore ?? 0,
        nearestWellKm: offsetWells.length > 0
          ? Math.min(...offsetWells.map((ow) => ow.distanceKm))
          : 0,
        dominantRiskTypes,
      },
    };
  }

  /**
   * Get only offset wells for the active well (lighter payload).
   */
  async getOffsets(
    wellId: string,
    options: {
      depthOverride?: number;
      depthWindow?: number;
      radiusKm?: number;
    } = {}
  ): Promise<OffsetWellScore[] | null> {
    const result = await this.analyzeActiveWell(wellId, options);
    return result?.offsetWells ?? null;
  }
}

// ─── Scoring Functions (deterministic) ───────────────────────────────────────

/**
 * Depth similarity: how far the offset well's final depth is relative to the
 * active well's current depth. A well that drilled through the same depth
 * range scores higher.
 *
 * Returns 0–1 where 1 means the offset well drilled well past the current depth.
 */
function computeDepthSimilarity(
  activeDepth: number,
  offsetDepth: number,
  activeTD: number
): number {
  if (offsetDepth >= activeDepth) return 1.0;
  // Offset well did not reach active depth — partial credit
  const ratio = offsetDepth / activeDepth;
  return Math.max(0, ratio);
}

/**
 * Event relevance score: based on the count and severity of relevant events
 * near the current depth.
 *
 * Weighting: CRITICAL=4, HIGH=3, MEDIUM=2, LOW=1
 * Score is capped at 1.0.
 */
function computeEventRelevanceScore(
  events: RelevantEvent[],
  currentDepth: number,
  depthWindow: number
): number {
  if (events.length === 0) return 0;

  const severityWeight: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  let totalWeight = 0;

  for (const event of events) {
    const sWeight = severityWeight[event.severity] ?? 1;
    // Events closer to the current depth get a proximity boost (1.0 at delta=0, 0.5 at edge)
    const proximityFactor =
      1 - Math.abs(event.depthDelta) / (depthWindow * 2);
    totalWeight += sWeight * Math.max(0.5, proximityFactor);
  }

  // Normalize: 12 weighted points = 1.0 (e.g., 3 HIGH events = 9 → 0.75)
  return Math.min(1.0, totalWeight / 12);
}

/**
 * Overall similarity score (0–100).
 *
 * Weights:
 *   - Distance:    25% (closer = better)
 *   - Formation:   30% (more overlap = better)
 *   - Depth:       15% (offset drilled through same depth = better)
 *   - Events:      30% (more relevant events = more informative)
 */
function computeSimilarityScore(
  distanceKm: number,
  maxRadiusKm: number,
  formationOverlap: number,
  depthSimilarity: number,
  eventRelevance: number
): number {
  // Distance score: inverse linear within radius
  const distanceScore = Math.max(0, 1 - distanceKm / maxRadiusKm);

  const score =
    distanceScore * 25 +
    formationOverlap * 30 +
    depthSimilarity * 15 +
    eventRelevance * 30;

  return Math.min(100, Math.max(0, score));
}

/**
 * Find drilling events from an offset well that are relevant to the
 * active well's current depth (within ±depthWindow).
 */
function findRelevantEvents(
  well: {
    id: string;
    wellId: string;
    wellName: string;
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
      timestamp: Date;
      formation: { name: string } | null;
    }>;
  },
  currentDepth: number,
  depthWindow: number
): RelevantEvent[] {
  return well.drillingEvents
    .filter((event) => {
      const isRelevantType = RELEVANT_EVENT_TYPES.includes(
        event.eventType as (typeof RELEVANT_EVENT_TYPES)[number]
      );
      const withinWindow =
        event.depth >= currentDepth - depthWindow &&
        event.depth <= currentDepth + depthWindow;
      return isRelevantType && withinWindow;
    })
    .map((event) => ({
      id: event.id,
      eventType: event.eventType,
      depth: event.depth,
      severity: event.severity,
      description: event.description,
      cause: event.cause,
      mitigation: event.mitigation,
      outcome: event.outcome,
      nptHours: event.nptHours,
      mudLossRate: event.mudLossRate,
      timestamp: event.timestamp.toISOString(),
      wellId: well.wellId,
      wellName: well.wellName,
      formationName: event.formation?.name ?? null,
      depthDelta: Math.round(event.depth - currentDepth),
    }));
}

export const offsetIntelligenceService = new OffsetIntelligenceService();
export default offsetIntelligenceService;
