/**
 * Risk Assessment Service
 *
 * Deterministic risk assessment for the active well based on historical
 * drilling events from offset wells, existing RiskEvents and RiskRules.
 *
 * For each detected risk, produces:
 *   - risk type
 *   - risk score (0–100)
 *   - severity (LOW | MEDIUM | HIGH | CRITICAL)
 *   - confidence (0–1)
 *   - historical evidence array (human-readable strings)
 *   - source wells
 *   - recommended action
 *   - detection reason (WHY it was detected)
 */

import prisma from '../utils/prisma';
import { calculateDistanceKm } from '../utils/geospatial';
import type { RelevantEvent } from './offsetIntelligence.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AssessedRisk {
  riskType: string;
  riskLabel: string;
  riskScore: number; // 0–100
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number; // 0–1
  detectionReason: string; // WHY this risk was detected
  evidence: string[];
  sourceWells: Array<{
    wellId: string;
    wellName: string;
    distanceKm: number;
    eventDepth: number;
    eventSeverity: string;
    depthDelta: number;
  }>;
  recommendedAction: string;
  eventCount: number;
  nearestEventDepthDelta: number;
  nearestEventDistanceKm: number;
}

export interface RiskAssessmentResult {
  wellId: string;
  wellName: string;
  currentDepth: number;
  currentFormation: string | null;
  depthWindow: number;
  assessedAt: string;
  risks: AssessedRisk[];
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: {
    totalRisks: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
  };
}

// ─── Risk type labels ────────────────────────────────────────────────────────

const RISK_LABELS: Record<string, string> = {
  MUD_LOSS: 'Mud Loss',
  STUCK_PIPE: 'Stuck Pipe',
  KICK: 'Well Kick',
  OVERPRESSURE: 'Overpressure / Kick',
  TORQUE_SPIKE: 'Torque Spike',
  CEMENTING_ISSUE: 'Cementing Issue',
  LOST_CIRCULATION: 'Lost Circulation',
  WELL_CONTROL: 'Well Control',
};

// ─── Recommended actions per risk type ───────────────────────────────────────

const RECOMMENDED_ACTIONS: Record<string, string> = {
  MUD_LOSS:
    'Prepare LCM pill (fine-medium nut shells + fibers). Reduce ECD by lowering flow rate. Monitor pit returns at 5-minute intervals. Have blind drilling procedure on standby.',
  STUCK_PIPE:
    'Limit static time to <4 hours. Maintain minimum circulation (2 m³/min). Pre-mix 200L diesel spotting fluid. Have jar activation sequence ready. Perform wiper trip every 150m.',
  KICK:
    'Verify BOP is tested and operational. Ensure kill fluid on standby. Monitor flow-check every stand. Have emergency kill procedure briefed with crew.',
  OVERPRESSURE:
    'Monitor D-exponent trend. Increase MW in 0.01 g/cc increments as early indicators appear. Flow-check every stand. Verify BOP tested. Stage MW increase program before entering high-pressure zone.',
  TORQUE_SPIKE:
    'Monitor torque continuously. Clean hole at each stand. Reduce WOB by 2t if torque exceeds 20 kN.m. Circulate bottom-up if sustained above baseline +50%.',
  CEMENTING_ISSUE:
    'Ensure adequate spacer volume (2x annular). Use turbulent displacement. Centralizer spacing ≤60ft in deviated sections. Plan CBL verification post-cement.',
  LOST_CIRCULATION:
    'Same as MUD_LOSS. Additionally prepare cement-bentonite squeeze. Consider managed pressure drilling if sustained.',
  WELL_CONTROL:
    'Ensure BOP stack fully tested. Stage emergency response. Pre-calculate kill sheet for current conditions. Crew drill on well control procedure.',
};

// ─── Service ─────────────────────────────────────────────────────────────────

export class RiskAssessmentService {
  /**
   * Assess risks for an active well at a given depth using historical offset
   * well events.
   *
   * @param relevantEvents - events from offset wells near current depth
   *   (produced by OffsetIntelligenceService)
   * @param offsetWells - scored offset wells for distance info
   */
  async assessRisks(params: {
    wellId: string;
    wellName: string;
    currentDepth: number;
    currentFormation: string | null;
    depthWindow: number;
    relevantEvents: RelevantEvent[];
    offsetWells: Array<{
      well: { wellId: string; wellName: string };
      distanceKm: number;
    }>;
  }): Promise<RiskAssessmentResult> {
    const {
      wellId,
      wellName,
      currentDepth,
      currentFormation,
      depthWindow,
      relevantEvents,
      offsetWells,
    } = params;

    // Build distance lookup
    const distanceLookup: Record<string, number> = {};
    for (const ow of offsetWells) {
      distanceLookup[ow.well.wellId] = ow.distanceKm;
    }

    // Group events by risk type
    const eventsByType: Record<string, RelevantEvent[]> = {};
    for (const event of relevantEvents) {
      const type = event.eventType;
      if (!eventsByType[type]) eventsByType[type] = [];
      eventsByType[type].push(event);
    }

    // Assess each risk type
    const risks: AssessedRisk[] = [];

    for (const [riskType, events] of Object.entries(eventsByType)) {
      const assessed = this.assessSingleRisk(
        riskType,
        events,
        currentDepth,
        currentFormation,
        depthWindow,
        distanceLookup
      );
      risks.push(assessed);
    }

    // Sort by risk score descending
    risks.sort((a, b) => b.riskScore - a.riskScore);

    // Determine overall risk level
    const overallRiskLevel = this.computeOverallRiskLevel(risks);

    const summary = {
      totalRisks: risks.length,
      criticalCount: risks.filter((r) => r.severity === 'CRITICAL').length,
      highCount: risks.filter((r) => r.severity === 'HIGH').length,
      mediumCount: risks.filter((r) => r.severity === 'MEDIUM').length,
      lowCount: risks.filter((r) => r.severity === 'LOW').length,
    };

    return {
      wellId,
      wellName,
      currentDepth,
      currentFormation,
      depthWindow,
      assessedAt: new Date().toISOString(),
      risks,
      overallRiskLevel,
      summary,
    };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private assessSingleRisk(
    riskType: string,
    events: RelevantEvent[],
    currentDepth: number,
    currentFormation: string | null,
    depthWindow: number,
    distanceLookup: Record<string, number>
  ): AssessedRisk {
    const severityWeight: Record<string, number> = {
      CRITICAL: 4,
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    // Count unique source wells
    const uniqueWells = new Map<string, RelevantEvent>();
    for (const event of events) {
      if (
        !uniqueWells.has(event.wellId) ||
        severityWeight[event.severity] >
          severityWeight[uniqueWells.get(event.wellId)!.severity]
      ) {
        uniqueWells.set(event.wellId, event);
      }
    }

    // Events within tight window (±depthWindow)
    const tightWindowEvents = events.filter(
      (e) => Math.abs(e.depthDelta) <= depthWindow
    );

    // Source wells data
    const sourceWells = events.map((event) => ({
      wellId: event.wellId,
      wellName: event.wellName,
      distanceKm:
        Math.round((distanceLookup[event.wellId] ?? 0) * 100) / 100,
      eventDepth: event.depth,
      eventSeverity: event.severity,
      depthDelta: event.depthDelta,
    }));

    // Deduplicate source wells — keep the one with worst severity
    const uniqueSourceWells = Array.from(
      sourceWells
        .reduce((map, sw) => {
          const existing = map.get(sw.wellId);
          if (
            !existing ||
            (severityWeight[sw.eventSeverity] ?? 0) >
              (severityWeight[existing.eventSeverity] ?? 0)
          ) {
            map.set(sw.wellId, sw);
          }
          return map;
        }, new Map<string, (typeof sourceWells)[0]>())
        .values()
    );

    // Nearest event
    const sortedByDelta = [...events].sort(
      (a, b) => Math.abs(a.depthDelta) - Math.abs(b.depthDelta)
    );
    const nearestEvent = sortedByDelta[0];
    const nearestEventDistanceKm =
      distanceLookup[nearestEvent.wellId] ?? 0;

    // ─── Risk score calculation (deterministic) ───────────────────────

    // Base: number of wells with this event (more wells = higher confidence)
    const wellCountFactor = Math.min(1, uniqueWells.size / 4); // max at 4 wells

    // Severity factor: average severity of events
    const avgSeverity =
      events.reduce((sum, e) => sum + (severityWeight[e.severity] ?? 1), 0) /
      events.length;
    const severityFactor = avgSeverity / 4; // normalize to 0–1

    // Proximity factor: closest event to current depth
    const closestDelta = Math.abs(nearestEvent.depthDelta);
    const proximityFactor = 1 - closestDelta / (depthWindow * 2);

    // Formation match bonus
    const formationMatchBonus = events.some(
      (e) =>
        e.formationName &&
        currentFormation &&
        (e.formationName === currentFormation ||
          e.formationName.includes('Barail') && currentFormation.includes('Barail') ||
          e.formationName.includes('Kopili') && currentFormation.includes('Kopili') ||
          e.formationName.includes('Sylhet') && currentFormation.includes('Sylhet'))
    )
      ? 0.15
      : 0;

    const rawScore =
      wellCountFactor * 30 +
      severityFactor * 30 +
      Math.max(0, proximityFactor) * 25 +
      formationMatchBonus * 100 +
      Math.min(events.length / 5, 1) * 15; // event count bonus

    const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Severity classification
    const severity = this.classifySeverity(riskScore);

    // Confidence: based on data quality
    const confidence =
      Math.round(
        (wellCountFactor * 0.4 +
          (tightWindowEvents.length > 0 ? 0.3 : 0.1) +
          (events.length >= 3 ? 0.3 : events.length * 0.1)) *
          100
      ) / 100;

    // Build human-readable evidence
    const evidence = this.buildEvidence(
      riskType,
      events,
      uniqueWells.size,
      tightWindowEvents.length,
      currentDepth,
      depthWindow,
      currentFormation,
      nearestEvent,
      nearestEventDistanceKm
    );

    // Detection reason
    const detectionReason = this.buildDetectionReason(
      riskType,
      uniqueWells.size,
      tightWindowEvents.length,
      currentDepth,
      depthWindow,
      nearestEvent,
      nearestEventDistanceKm
    );

    return {
      riskType,
      riskLabel: RISK_LABELS[riskType] ?? riskType,
      riskScore,
      severity,
      confidence: Math.min(1, confidence),
      detectionReason,
      evidence,
      sourceWells: uniqueSourceWells,
      recommendedAction:
        RECOMMENDED_ACTIONS[riskType] ?? 'Monitor and evaluate.',
      eventCount: events.length,
      nearestEventDepthDelta: nearestEvent.depthDelta,
      nearestEventDistanceKm:
        Math.round(nearestEventDistanceKm * 100) / 100,
    };
  }

  private classifySeverity(
    score: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private computeOverallRiskLevel(
    risks: AssessedRisk[]
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (risks.some((r) => r.severity === 'CRITICAL')) return 'CRITICAL';
    if (risks.some((r) => r.severity === 'HIGH')) return 'HIGH';
    if (risks.some((r) => r.severity === 'MEDIUM')) return 'MEDIUM';
    return 'LOW';
  }

  private buildEvidence(
    riskType: string,
    events: RelevantEvent[],
    uniqueWellCount: number,
    tightWindowCount: number,
    currentDepth: number,
    depthWindow: number,
    currentFormation: string | null,
    nearestEvent: RelevantEvent,
    nearestDistanceKm: number
  ): string[] {
    const evidence: string[] = [];

    evidence.push(
      `${uniqueWellCount} nearby well(s) experienced ${RISK_LABELS[riskType] ?? riskType}`
    );

    evidence.push(
      `${tightWindowCount} event(s) occurred within ±${depthWindow}m of current depth (${currentDepth}m)`
    );

    if (currentFormation) {
      const sameFormation = events.filter(
        (e) => e.formationName && e.formationName === currentFormation
      );
      if (sameFormation.length > 0) {
        evidence.push(
          `${sameFormation.length} event(s) in the same formation (${currentFormation})`
        );
      }
    }

    evidence.push(
      `Closest relevant event: ${nearestEvent.wellName} at ${nearestEvent.depth}m (${nearestEvent.depthDelta >= 0 ? '+' : ''}${nearestEvent.depthDelta}m from current depth), ${Math.round(nearestDistanceKm * 10) / 10} km away`
    );

    // Add specific event details
    for (const event of events.slice(0, 3)) {
      const dist = Math.round((distanceLookupFromEvent(event, nearestDistanceKm)) * 10) / 10;
      evidence.push(
        `${event.wellName} @ ${event.depth}m: ${event.description.slice(0, 100)}${event.description.length > 100 ? '...' : ''}`
      );
    }

    return evidence;
  }

  private buildDetectionReason(
    riskType: string,
    uniqueWellCount: number,
    tightWindowCount: number,
    currentDepth: number,
    depthWindow: number,
    nearestEvent: RelevantEvent,
    nearestDistanceKm: number
  ): string {
    const label = RISK_LABELS[riskType] ?? riskType;

    return `${label.toUpperCase()} risk detected because ${uniqueWellCount} nearby offset well(s) had ${label.toLowerCase()} events, with ${tightWindowCount} occurring within ±${depthWindow}m of current depth (${currentDepth}m). The closest event was at ${nearestEvent.wellName} (${nearestEvent.depth}m, ${Math.round(nearestDistanceKm * 10) / 10} km away).`;
  }
}

/**
 * Helper: we already have distanceKm from the offset lookup
 * but for building evidence we just pass through the nearest value.
 */
function distanceLookupFromEvent(
  _event: RelevantEvent,
  fallbackDistance: number
): number {
  return fallbackDistance;
}

export const riskAssessmentService = new RiskAssessmentService();
export default riskAssessmentService;
