import { Router } from 'express';
import { getFormations } from '../controllers/formations.controller';

const router = Router();

router.get('/', getFormations);

export default router;
