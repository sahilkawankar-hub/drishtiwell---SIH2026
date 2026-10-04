import prisma from '../utils/prisma';
import logger from '../utils/logger';
import { offsetIntelligenceService } from './offsetIntelligence.service';
import { riskAssessmentService } from './riskAssessment.service';

export class AlertService {
  async findAll(filters: { wellId?: string; severity?: string; status?: string }) {
    return prisma.alert.findMany({
      where: {
        ...(filters.wellId ? { wellId: filters.wellId } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        well: { select: { wellName: true, wellId: true } },
        riskEvent: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.alert.findUnique({
      where: { id },
      include: {
        well: true,
        riskEvent: true,
      },
    });
  }

  async acknowledge(id: string) {
    return prisma.alert.update({
      where: { id },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
      },
      include: {
        well: { select: { wellName: true, wellId: true } },
      },
    });
  }

  async resolve(id: string) {
    return prisma.alert.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
      },
      include: {
        well: { select: { wellName: true, wellId: true } },
      },
    });
  }

  /**
   * Evaluate risks dynamically for an active well and generate alerts for qualifying risks.
   *
   * Rules:
   * 1. Evaluates risks at the specified depth using real offset-well incidents.
   * 2. Triggers an alert when riskScore >= thresholdScore (default 70).
   * 3. Prevents duplicate active/acknowledged alerts for the same well and risk type.
   * 4. Allows new alert generation if previous alert for this risk type was RESOLVED.
   */
  async evaluateAlertsForWell(
    wellIdentifier?: string,
    depthOverride?: number,
    thresholdScore: number = 70
  ) {
    // 1. Resolve well
    let well = null;
    if (wellIdentifier) {
      well = await prisma.well.findFirst({
        where: {
          OR: [{ id: wellIdentifier }, { wellId: wellIdentifier }],
        },
        include: {
          formations: { include: { formation: true } },
        },
      });
    }

    if (!well) {
      well = await prisma.well.findFirst({
        where: {
          OR: [{ isActive: true }, { status: 'ACTIVE' }, { status: 'DRILLING' }],
        },
        include: {
          formations: { include: { formation: true } },
        },
      });
    }

    if (!well) {
      throw new Error('No active well found to evaluate risks.');
    }

    const currentDepth = depthOverride !== undefined && !isNaN(depthOverride)
      ? depthOverride
      : well.currentDepth;

    // 2. Perform intelligence analysis at currentDepth
    const intel = await offsetIntelligenceService.analyzeActiveWell(well.id, {
      depthOverride: currentDepth,
    });

    if (!intel) {
      throw new Error(`Failed to calculate offset intelligence for well ${well.id}`);
    }

    // 3. Assess risks dynamically
    const riskAssessment = await riskAssessmentService.assessRisks({
      wellId: intel.activeWell.id,
      wellName: intel.activeWell.wellName,
      currentDepth: intel.activeWell.currentDepth,
      currentFormation: intel.activeWell.currentFormationName,
      depthWindow: intel.depthWindow,
      relevantEvents: intel.allRelevantEvents,
      offsetWells: intel.offsetWells,
    });

    // 4. Filter qualifying risks meeting threshold
    const qualifyingRisks = riskAssessment.risks.filter(
      (r) => r.riskScore >= thresholdScore
    );

    // 5. Query existing active or acknowledged alerts for this well
    const existingActiveAlerts = await prisma.alert.findMany({
      where: {
        wellId: well.id,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
      },
    });

    const createdAlerts = [];

    // 6. Create alert for qualifying risks without an active/acknowledged counterpart
    for (const risk of qualifyingRisks) {
      const isAlreadyActive = existingActiveAlerts.some((existing) => {
        const msg = existing.message.toUpperCase();
        // Exact structured tag match: [STUCK_PIPE]
        if (msg.includes(`[${risk.riskType}]`)) return true;

        // Headline / hazard prefix match on legacy alerts
        const label = risk.riskLabel.toUpperCase();
        const typeSpaced = risk.riskType.toUpperCase().replace('_', ' ');
        return (
          msg.includes(`${label} RISK`) ||
          msg.includes(`${typeSpaced} RISK`) ||
          msg.startsWith(label) ||
          msg.includes(`⚠️ ${label}`) ||
          msg.includes(`🔴 ${label}`) ||
          msg.includes(`HIGH ${label}`) ||
          msg.includes(`CRITICAL ${label}`)
        );
      });

      if (!isAlreadyActive) {
        const severity = risk.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        const formationName = intel.activeWell.currentFormationName || well.currentFormation || null;
        const message = `[${risk.riskType}] ${risk.riskLabel.toUpperCase()}: ${risk.detectionReason} (Score: ${risk.riskScore}/100, Confidence: ${Math.round(risk.confidence * 100)}%)`;

        const newAlert = await prisma.alert.create({
          data: {
            wellId: well.id,
            alertType: 'PREDICTIVE',
            severity,
            depth: currentDepth,
            formation: formationName,
            message,
            evidence: JSON.stringify(risk.evidence),
            recommendedAction: risk.recommendedAction,
            status: 'ACTIVE',
          },
          include: {
            well: { select: { wellName: true, wellId: true } },
          },
        });
        createdAlerts.push(newAlert);
        logger.info(`Generated proactive alert ${newAlert.id} for well ${well.wellName} (${risk.riskType} at ${currentDepth}m)`);
      }
    }

    return {
      wellId: well.id,
      wellName: well.wellName,
      evaluatedDepth: currentDepth,
      thresholdScore,
      assessedRisksCount: riskAssessment.risks.length,
      qualifyingRisksCount: qualifyingRisks.length,
      createdCount: createdAlerts.length,
      createdAlerts,
      existingActiveAlertsCount: existingActiveAlerts.length,
    };
  }
}

