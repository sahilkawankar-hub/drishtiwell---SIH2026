import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

export async function getFormations(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const formations = await prisma.formation.findMany({
      include: {
        wellFormations: {
          include: { well: { select: { wellName: true, wellId: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: formations, count: formations.length });
  } catch (err) {
    next(err);
  }
}
