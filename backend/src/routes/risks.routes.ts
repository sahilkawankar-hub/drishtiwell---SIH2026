import { Router } from 'express';
import { getRisks, getRiskById } from '../controllers/risks.controller';

const router = Router();

router.get('/', getRisks);
router.get('/:id', getRiskById);

export default router;
