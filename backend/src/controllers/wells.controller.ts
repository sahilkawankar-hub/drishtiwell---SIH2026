import { Request, Response, NextFunction } from 'express';
import { WellService } from '../services/well.service';
import { AppError } from '../middleware/errorHandler';

const wellService = new WellService();

// GET /api/wells
export async function getWells(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, field, block } = req.query;

    const wells = await wellService.findAll({
      status: status as string | undefined,
      field: field as string | undefined,
      block: block as string | undefined,
    });

    res.json({ success: true, data: wells, count: wells.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/wells/active
export async function getActiveWell(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const well = await wellService.findActive();
    if (!well) throw new AppError('No active well found', 404, true, 'ACTIVE_WELL_NOT_FOUND');
    res.json({ success: true, data: well });
  } catch (err) {
    next(err);
  }
}

// GET /api/wells/nearby?lat=&lng=&radiusKm=   (legacy – lat/lng based)
export async function getNearbyWells(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radiusKm as string) || 50;

    if (isNaN(lat) || isNaN(lng)) {
      throw new AppError('lat and lng query params are required', 400, true, 'INVALID_PARAMS');
    }

    const wells = await wellService.findNearby(lat, lng, radiusKm);
    res.json({ success: true, data: wells, count: wells.length });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/wells/nearby-intelligence
 *
 * Query params:
 *   activeWellId  – required, the cuid or wellId of the active well
 *   radiusKm      – optional, default 25
 *   status        – optional, filter offset wells by status (ACTIVE|COMPLETED|…)
 *   wellType      – optional, filter offset wells by type (VERTICAL|DIRECTIONAL|HORIZONTAL)
 *   formationId   – optional, filter offset wells that pass through a specific formation
 *
 * Response:
 *   { success, data: { activeWell, nearbyWells[], radiusKm } }
 */
export async function getNearbyWellsIntelligence(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const activeWellId = req.query.activeWellId as string | undefined;
    const status = req.query.status as string | undefined;
    const wellType = req.query.wellType as string | undefined;
    const formationId = req.query.formationId as string | undefined;
    const radiusKm = parseFloat(req.query.radiusKm as string) || 25;

    if (!activeWellId) {
      throw new AppError('activeWellId query param is required', 400, true, 'INVALID_PARAMS');
    }

    const result = await wellService.findNearbyByActiveWell(activeWellId, {
      radiusKm,
      status: status || undefined,
      wellType: wellType || undefined,
      formationId: formationId || undefined,
    });

    if (!result) {
      throw new AppError('Active well not found', 404, true, 'ACTIVE_WELL_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        activeWell: result.activeWell,
        nearbyWells: result.nearbyWells,
        radiusKm,
        count: result.nearbyWells.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/wells/:id
export async function getWellById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const well = await wellService.findById(id);
    if (!well) throw new AppError('Well not found', 404, true, 'WELL_NOT_FOUND');
    res.json({ success: true, data: well });
  } catch (err) {
    next(err);
  }
}

// GET /api/wells/:id/events
export async function getWellEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params['id'] as string;
    const eventType = req.query.eventType as string | undefined;
    const severity = req.query.severity as string | undefined;
    const limitRaw = req.query.limit;
    const limit = limitRaw ? parseInt(limitRaw as string, 10) : undefined;
    const events = await wellService.findEvents(wellId, { eventType, severity, limit });
    res.json({ success: true, data: events, count: events.length });
  } catch (err) {
    next(err);
  }
}

// GET /api/wells/:id/parameters
export async function getWellParameters(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const wellId = req.params['id'] as string;
    const limitRaw = req.query.limit;
    const limit = limitRaw ? parseInt(limitRaw as string, 10) : 100;
    const params = await wellService.findParameters(wellId, { limit });
    res.json({ success: true, data: params, count: params.length });
  } catch (err) {
    next(err);
  }
}
