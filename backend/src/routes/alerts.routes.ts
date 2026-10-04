import { Router } from 'express';
import { getAlerts, getAlertById, acknowledgeAlert } from '../controllers/alerts.controller';

const router = Router();

router.get('/', getAlerts);
router.get('/:id', getAlertById);
router.patch('/:id/acknowledge', acknowledgeAlert);

export default router;
