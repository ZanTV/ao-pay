import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { z } from 'zod';
import * as transactionController from '../controllers/transaction.controller.js';

const listSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  search: z.string().optional(),
});

const router = Router();

router.get('/', authenticate, validateQuery(listSchema), transactionController.list);

export default router;
