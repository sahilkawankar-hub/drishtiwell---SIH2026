import { Router } from 'express';
import {
  getWells,
  getWellById,
  getWellEvents,
  getWellParameters,
  getNearbyWells,
  getNearbyWellsIntelligence,
  getActiveWell,
} from '../controllers/wells.controller';

const router = Router();

// GET /api/wells
router.get('/', getWells);

// GET /api/wells/active
router.get('/active', getActiveWell);

// GET /api/wells/nearby-intelligence?activeWellId=&radiusKm=&status=&wellType=&formationId=
// Must be BEFORE /:id to avoid being matched as an id param
router.get('/nearby-intelligence', getNearbyWellsIntelligence);

// GET /api/wells/nearby?lat=&lng=&radius=  (legacy)
router.get('/nearby', getNearbyWells);

// GET /api/wells/:id
router.get('/:id', getWellById);

// GET /api/wells/:id/events
router.get('/:id/events', getWellEvents);

// GET /api/wells/:id/parameters
router.get('/:id/parameters', getWellParameters);

export default router;
