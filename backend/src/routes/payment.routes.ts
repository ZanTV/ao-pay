import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { initiatePaymentSchema, refundSchema, tokenParamSchema, idParamSchema } from '../validators/index.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

router.get('/gateways', paymentController.listGateways);
router.post('/:token/initiate', validateParams(tokenParamSchema), validateBody(initiatePaymentSchema), paymentController.initiatePayment);
router.get('/complete', paymentController.completePayment);
router.get('/transactions/:id', paymentController.getTransaction);
router.post('/transactions/:id/refund', authenticate, validateParams(idParamSchema), validateBody(refundSchema), paymentController.refundTransaction);
router.post('/webhooks/:gateway', paymentController.handleWebhook);
router.get('/webhooks/:gateway', paymentController.handleWebhook);

export default router;
