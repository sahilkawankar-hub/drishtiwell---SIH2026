import prisma from '../utils/prisma';

export class RiskService {
  async findAll(filters: {
    wellId?: string;
    riskType?: string;
    severity?: string;
    status?: string;
  }) {
    return prisma.riskEvent.findMany({
      where: {
        ...(filters.wellId ? { wellId: filters.wellId } : {}),
        ...(filters.riskType ? { riskType: filters.riskType } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        well: { select: { wellName: true, wellId: true } },
        formation: true,
        alerts: true,
      },
      orderBy: [{ severity: 'desc' }, { detectedAt: 'desc' }],
    });
  }

  async findById(id: string) {
    return prisma.riskEvent.findUnique({
      where: { id },
      include: {
        well: true,
        formation: true,
        alerts: true,
      },
    });
  }
}
