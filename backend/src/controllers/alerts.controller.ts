import { Request, Response, NextFunction } from 'express';
import { AlertService } from '../services/alert.service';
import { AppError } from '../middleware/errorHandler';

const alertService = new AlertService();

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wellId, severity, status } = req.query;
    const alerts = await alertService.findAll({
      wellId: wellId as string | undefined,
      severity: severity as string | undefined,
      status: status as string | undefined,
    });
    res.json({ success: true, data: alerts, count: alerts.length });
  } catch (err) {
    next(err);
  }
}

export async function getAlertById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const alert = await alertService.findById(id);
    if (!alert) throw new AppError('Alert not found', 404, true, 'ALERT_NOT_FOUND');
    res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

export async function acknowledgeAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const alert = await alertService.acknowledge(id);
    res.json({ success: true, data: alert, message: 'Alert acknowledged' });
  } catch (err) {
    next(err);
  }
}

export async function resolveAlert(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const alert = await alertService.resolve(id);
    res.json({ success: true, data: alert, message: 'Alert resolved successfully' });
  } catch (err) {
    next(err);
  }
}

export async function evaluateAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wellId, depth, thresholdScore } = req.body || {};
    const targetWellId = (wellId || req.query.wellId) as string | undefined;
    const targetDepth =
      depth !== undefined
        ? parseFloat(depth)
        : req.query.depth
        ? parseFloat(req.query.depth as string)
        : undefined;
    const threshold =
      thresholdScore !== undefined
        ? parseFloat(thresholdScore)
        : req.query.thresholdScore
        ? parseFloat(req.query.thresholdScore as string)
        : 70;

    const result = await alertService.evaluateAlertsForWell(targetWellId, targetDepth, threshold);
    res.json({
      success: true,
      data: result,
      message: `Risk check complete at ${result.evaluatedDepth}m: ${result.createdCount} new alert(s) generated.`,
    });
  } catch (err) {
    next(err);
  }
}

