import { Router } from 'express';
import { getRecommendations, getRecommendationById } from '../controllers/recommendations.controller';

const router = Router();

router.get('/', getRecommendations);
router.get('/:id', getRecommendationById);

export default router;
