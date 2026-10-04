import { Router } from 'express';
import {
  getAlerts,
  getAlertById,
  acknowledgeAlert,
  resolveAlert,
  evaluateAlerts,
} from '../controllers/alerts.controller';

const router = Router();

router.get('/', getAlerts);
router.post('/evaluate', evaluateAlerts);
router.get('/:id', getAlertById);
router.patch('/:id/acknowledge', acknowledgeAlert);
router.patch('/:id/resolve', resolveAlert);

export default router;

