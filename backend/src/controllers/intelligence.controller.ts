/**
 * Intelligence Controller
 *
 * API endpoints for the Offset-Well Intelligence feature.
 *
 * GET /api/intelligence/active-well/:id           — Full intelligence analysis
 * GET /api/intelligence/active-well/:id/offsets    — Offset well scores only
 * GET /api/intelligence/active-well/:id/risks      — Risk assessment only
 */

import { Request, Response, NextFunction } from 'express';
import { offsetIntelligenceService } from '../services/offsetIntelligence.service';
import { riskAssessmentService } from '../services/riskAssessment.service';
import { AppError } from '../middleware/errorHandler';

/**
 * GET /api/intelligence/active-well/:id
 *
 * Full intelligence report for a well.
 *
 * Query params:
 *   depth       – optional depth override (number)
 *   depthWindow – optional ±m window (default 150)
 *   radiusKm    – optional search radius (default 50)
 */
export async function getActiveWellIntelligence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const wellId = req.params['id'] as string;
    const depthOverride = req.query.depth
      ? parseFloat(req.query.depth as string)
      : undefined;
    const depthWindow = req.query.depthWindow
      ? parseFloat(req.query.depthWindow as string)
      : undefined;
    const radiusKm = req.query.radiusKm
      ? parseFloat(req.query.radiusKm as string)
      : undefined;

    const result = await offsetIntelligenceService.analyzeActiveWell(wellId, {
      depthOverride,
      depthWindow,
      radiusKm,
    });

    if (!result) {
      throw new AppError('Well not found', 404, true, 'WELL_NOT_FOUND');
    }

    // Also include risk assessment
    const riskAssessment = await riskAssessmentService.assessRisks({
      wellId: result.activeWell.id,
      wellName: result.activeWell.wellName,
      currentDepth: result.activeWell.currentDepth,
      currentFormation: result.activeWell.currentFormationName,
      depthWindow: result.depthWindow,
      relevantEvents: result.allRelevantEvents,
      offsetWells: result.offsetWells,
    });

    res.json({
      success: true,
      data: {
        ...result,
        riskAssessment,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/intelligence/active-well/:id/offsets
 *
 * Offset well scores only.
 */
export async function getActiveWellOffsets(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const wellId = req.params['id'] as string;
    const depthOverride = req.query.depth
      ? parseFloat(req.query.depth as string)
      : undefined;
    const depthWindow = req.query.depthWindow
      ? parseFloat(req.query.depthWindow as string)
      : undefined;
    const radiusKm = req.query.radiusKm
      ? parseFloat(req.query.radiusKm as string)
      : undefined;

    const offsets = await offsetIntelligenceService.getOffsets(wellId, {
      depthOverride,
      depthWindow,
      radiusKm,
    });

    if (!offsets) {
      throw new AppError('Well not found', 404, true, 'WELL_NOT_FOUND');
    }

    res.json({
      success: true,
      data: offsets,
      count: offsets.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/intelligence/active-well/:id/risks
 *
 * Risk assessment only.
 */
export async function getActiveWellRisks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const wellId = req.params['id'] as string;
    const depthOverride = req.query.depth
      ? parseFloat(req.query.depth as string)
      : undefined;
    const depthWindow = req.query.depthWindow
      ? parseFloat(req.query.depthWindow as string)
      : undefined;
    const radiusKm = req.query.radiusKm
      ? parseFloat(req.query.radiusKm as string)
      : undefined;

    const result = await offsetIntelligenceService.analyzeActiveWell(wellId, {
      depthOverride,
      depthWindow,
      radiusKm,
    });

    if (!result) {
      throw new AppError('Well not found', 404, true, 'WELL_NOT_FOUND');
    }

    const riskAssessment = await riskAssessmentService.assessRisks({
      wellId: result.activeWell.id,
      wellName: result.activeWell.wellName,
      currentDepth: result.activeWell.currentDepth,
      currentFormation: result.activeWell.currentFormationName,
      depthWindow: result.depthWindow,
      relevantEvents: result.allRelevantEvents,
      offsetWells: result.offsetWells,
    });

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (err) {
    next(err);
  }
}
