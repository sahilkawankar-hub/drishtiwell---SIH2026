import { Router } from 'express';
import {
  getKnowledgeEntries,
  getKnowledgeById,
  searchKnowledge,
} from '../controllers/knowledge.controller';

const router = Router();

router.get('/search', searchKnowledge);
router.get('/', getKnowledgeEntries);
router.get('/:id', getKnowledgeById);

export default router;
