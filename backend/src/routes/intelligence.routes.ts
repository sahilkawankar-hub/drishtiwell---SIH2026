import { Router } from 'express';
import {
  getActiveWellIntelligence,
  getActiveWellOffsets,
  getActiveWellRisks,
} from '../controllers/intelligence.controller';

const router = Router();

// GET /api/intelligence/active-well/:id
router.get('/active-well/:id', getActiveWellIntelligence);

// GET /api/intelligence/active-well/:id/offsets
router.get('/active-well/:id/offsets', getActiveWellOffsets);

// GET /api/intelligence/active-well/:id/risks
router.get('/active-well/:id/risks', getActiveWellRisks);

export default router;
