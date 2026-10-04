import { Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { knowledgeSearchService } from '../services/knowledgeSearch.service';

export async function getKnowledgeEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, search } = req.query;

    const entries = await prisma.knowledgeEntry.findMany({
      where: {
        ...(category ? { category: category as string } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search as string } },
                { content: { contains: search as string } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: entries, count: entries.length });
  } catch (err) {
    next(err);
  }
}

export async function getKnowledgeById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const entry = await prisma.knowledgeEntry.findUnique({ where: { id } });
    if (!entry) throw new AppError('Knowledge entry not found', 404, true, 'KNOWLEDGE_NOT_FOUND');
    res.json({ success: true, data: entry });
  } catch (err) {
    next(err);
  }
}

export async function searchKnowledge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, eventType, formation, wellId, wellName, minDepth, maxDepth, category, limit } = req.query;

    const result = await knowledgeSearchService.search({
      q: q as string | undefined,
      eventType: eventType as string | undefined,
      formation: formation as string | undefined,
      wellId: wellId as string | undefined,
      wellName: wellName as string | undefined,
      minDepth: minDepth ? parseFloat(minDepth as string) : undefined,
      maxDepth: maxDepth ? parseFloat(maxDepth as string) : undefined,
      category: category as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
