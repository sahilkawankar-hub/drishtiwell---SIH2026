import prisma from '../utils/prisma';
import { calculateDistanceKm } from '../utils/geospatial';

export class WellService {
  async findAll(filters: { status?: string; field?: string; block?: string }) {
    return prisma.well.findMany({
      where: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.field ? { field: filters.field } : {}),
        ...(filters.block ? { block: filters.block } : {}),
      },
      include: {
        formations: { include: { formation: true } },
        _count: {
          select: { drillingEvents: true, alerts: true, riskEvents: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findActive() {
    return prisma.well.findFirst({
      where: { isActive: true },
      include: {
        formations: { include: { formation: true } },
        drillingParameters: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
        riskEvents: {
          where: { status: 'ACTIVE' },
          orderBy: { severity: 'desc' },
          take: 5,
        },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { drillingEvents: true, alerts: true, riskEvents: true },
        },
      },
    });
  }

  async findById(id: string) {
    // Try by cuid first, then by wellId string
    const byId = await prisma.well.findUnique({
      where: { id },
      include: {
        formations: { include: { formation: true } },
        drillingEvents: {
          orderBy: { depth: 'desc' },
          take: 20,
          include: { formation: true },
        },
        riskEvents: { orderBy: { detectedAt: 'desc' }, take: 10 },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
        historicalDocuments: true,
        _count: {
          select: { drillingEvents: true, alerts: true, riskEvents: true },
        },
      },
    });
    if (byId) return byId;

    return prisma.well.findUnique({
      where: { wellId: id },
      include: {
        formations: { include: { formation: true } },
        drillingEvents: {
          orderBy: { depth: 'desc' },
          take: 20,
          include: { formation: true },
        },
        riskEvents: { orderBy: { detectedAt: 'desc' }, take: 10 },
        alerts: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
        },
        historicalDocuments: true,
        _count: {
          select: { drillingEvents: true, alerts: true, riskEvents: true },
        },
      },
    });
  }

  /**
   * Legacy nearby search by raw lat/lng – kept for backwards compatibility.
   * Distance is calculated using the Haversine formula (geospatial.ts).
   */
  async findNearby(lat: number, lng: number, radiusKm: number) {
    const allWells = await prisma.well.findMany({
      include: {
        formations: { include: { formation: true } },
        _count: {
          select: { drillingEvents: true, riskEvents: true },
        },
      },
    });

    return allWells
      .map((well) => ({
        ...well,
        distanceKm: calculateDistanceKm(lat, lng, well.latitude, well.longitude),
      }))
      .filter((w) => w.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Full nearby-wells query driven by an active well ID.
   * Filters: radiusKm, status, wellType, formationId.
   * Returns active well + sorted offset wells with rich metadata.
   */
  async findNearbyByActiveWell(
    activeWellId: string,
    options: {
      radiusKm?: number;
      status?: string;
      wellType?: string;
      formationId?: string;
    }
  ) {
    const { radiusKm = 25, status, wellType, formationId } = options;

    // 1. Resolve active well
    const activeWell = await prisma.well.findFirst({
      where: { OR: [{ id: activeWellId }, { wellId: activeWellId }] },
      include: {
        formations: { include: { formation: true } },
        _count: { select: { drillingEvents: true, riskEvents: true, alerts: true } },
      },
    });

    if (!activeWell) return null;

    // 2. Build WHERE clause for offset wells
    const where: Record<string, unknown> = {
      NOT: { id: activeWell.id }, // exclude the active well itself
    };
    if (status) where['status'] = status;
    if (wellType) where['wellType'] = wellType;
    if (formationId) {
      where['formations'] = {
        some: { formationId },
      };
    }

    // 3. Fetch all candidate wells with enriched relations
    const candidates = await prisma.well.findMany({
      where,
      include: {
        formations: { include: { formation: true } },
        drillingEvents: {
          orderBy: { timestamp: 'desc' },
          take: 3,
        },
        riskEvents: {
          where: { status: 'ACTIVE' },
          orderBy: { severity: 'desc' },
          take: 3,
        },
        _count: {
          select: { drillingEvents: true, riskEvents: true, alerts: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 4. Haversine filter + distance annotation
    const nearbyWells = candidates
      .map((w) => ({
        ...w,
        distanceKm: calculateDistanceKm(
          activeWell.latitude,
          activeWell.longitude,
          w.latitude,
          w.longitude
        ),
      }))
      .filter((w) => w.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    return { activeWell, nearbyWells };
  }

  async findEvents(
    wellId: string,
    filters: { eventType?: string; severity?: string; limit?: number }
  ) {
    const well = await prisma.well.findFirst({
      where: { OR: [{ id: wellId }, { wellId }] },
      select: { id: true },
    });

    if (!well) return [];

    return prisma.drillingEvent.findMany({
      where: {
        wellId: well.id,
        ...(filters.eventType ? { eventType: filters.eventType } : {}),
        ...(filters.severity ? { severity: filters.severity } : {}),
      },
      include: { formation: true },
      orderBy: { depth: 'desc' },
      take: filters.limit || 50,
    });
  }

  async findParameters(wellId: string, filters: { limit?: number }) {
    const well = await prisma.well.findFirst({
      where: { OR: [{ id: wellId }, { wellId }] },
      select: { id: true },
    });

    if (!well) return [];

    return prisma.drillingParameter.findMany({
      where: { wellId: well.id },
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
    });
  }
}
