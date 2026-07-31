import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import {
  createPaymentLinkSchema,
  listPaymentLinksSchema,
  updateLinkStatusSchema,
  tokenParamSchema,
  idParamSchema,
} from '../validators/index.js';
import * as paymentLinkController from '../controllers/paymentLink.controller.js';

const router = Router();

router.post('/', authenticate, validateBody(createPaymentLinkSchema), paymentLinkController.createPaymentLink);
router.get('/', authenticate, validateQuery(listPaymentLinksSchema), paymentLinkController.listPaymentLinks);
router.get('/public/:token', validateParams(tokenParamSchema), paymentLinkController.getPaymentLink);
router.patch('/:id/status', authenticate, validateParams(idParamSchema), validateBody(updateLinkStatusSchema), paymentLinkController.updateLinkStatus);
router.post('/:id/duplicate', authenticate, validateParams(idParamSchema), paymentLinkController.duplicateLink);

export default router;
