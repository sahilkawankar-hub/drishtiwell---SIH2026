import { Request, Response, NextFunction } from 'express';
import { RiskService } from '../services/risk.service';
import { AppError } from '../middleware/errorHandler';

const riskService = new RiskService();

export async function getRisks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wellId, riskType, severity, status } = req.query;
    const risks = await riskService.findAll({
      wellId: wellId as string | undefined,
      riskType: riskType as string | undefined,
      severity: severity as string | undefined,
      status: status as string | undefined,
    });
    res.json({ success: true, data: risks, count: risks.length });
  } catch (err) {
    next(err);
  }
}

export async function getRiskById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const risk = await riskService.findById(id);
    if (!risk) throw new AppError('Risk event not found', 404, true, 'RISK_NOT_FOUND');
    res.json({ success: true, data: risk });
  } catch (err) {
    next(err);
  }
}
