import prisma from '../utils/prisma';

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
    });
  }
}
