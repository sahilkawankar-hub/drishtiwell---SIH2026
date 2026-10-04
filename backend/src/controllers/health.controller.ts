import { Request, Response } from 'express';
import prisma from '../utils/prisma';

export async function healthCheck(_req: Request, res: Response): Promise<void> {
  const start = Date.now();

  let dbStatus = 'unknown';
  let dbLatencyMs = 0;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'disconnected';
  }

  const uptimeSeconds = process.uptime();

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'eRTMAC-NWIS API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: Math.floor(uptimeSeconds),
        formatted: formatUptime(uptimeSeconds),
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      responseMs: Date.now() - start,
    },
  });
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}
