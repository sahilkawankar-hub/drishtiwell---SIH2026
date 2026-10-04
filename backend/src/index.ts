import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { requestIdMiddleware } from './middleware/requestId';

// Routes
import healthRouter from './routes/health.routes';
import wellsRouter from './routes/wells.routes';
import alertsRouter from './routes/alerts.routes';
import risksRouter from './routes/risks.routes';
import formationsRouter from './routes/formations.routes';
import knowledgeRouter from './routes/knowledge.routes';
import documentsRouter from './routes/documents.routes';
import recommendationsRouter from './routes/recommendations.routes';
import intelligenceRouter from './routes/intelligence.routes';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Security & Parsing Middleware ───────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // disable for dev
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Statically serve uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Logging Middleware ───────────────────────────────────────────────────────
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.http(message.trim()),
  },
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api/wells', wellsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/risks', risksRouter);
app.use('/api/formations', formationsRouter);
app.use('/api/knowledge', knowledgeRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/recommendations', recommendationsRouter);
app.use('/api/intelligence', intelligenceRouter);

// ─── Error Handlers ───────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🛢️  eRTMAC-NWIS API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
