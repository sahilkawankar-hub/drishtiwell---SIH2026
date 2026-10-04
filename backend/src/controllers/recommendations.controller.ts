import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { wellId, category, priority, status } = req.query;

    const recommendations = await prisma.recommendation.findMany({
      where: {
        ...(wellId ? { wellId: wellId as string } : {}),
        ...(category ? { category: category as string } : {}),
        ...(priority ? { priority: priority as string } : {}),
        ...(status ? { status: status as string } : {}),
      },
      include: {
        well: { select: { wellName: true, wellId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: recommendations, count: recommendations.length });
  } catch (err) {
    next(err);
  }
}

export async function getRecommendationById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const rec = await prisma.recommendation.findUnique({
      where: { id },
      include: { well: true },
    });
    if (!rec) throw new AppError('Recommendation not found', 404, true, 'RECOMMENDATION_NOT_FOUND');
    res.json({ success: true, data: rec });
  } catch (err) {
    next(err);
  }
}
