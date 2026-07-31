import { Request, Response } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { paymentService } from '../services/payment.service.js';
import { gatewayRegistry } from '../gateways/registry.js';

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.initiate({
    token: req.params.token,
    ...req.body,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ success: true, data: result });
});

export const completePayment = asyncHandler(async (req: Request, res: Response) => {
  const { transactionId, externalId } = req.query as { transactionId?: string; externalId?: string };

  if (!transactionId) {
    throw new AppError(400, 'Transaction ID required');
  }

  const result = await paymentService.complete(transactionId, externalId);
  res.json({ success: true, data: result });
});

export const getTransaction = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.getTransaction(String(req.params.id));
  res.json({ success: true, data: result });
});

export const refundTransaction = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.refund(
    String(req.params.id),
    req.admin!.adminId,
    req.body.amount,
    req.body.reason
  );

  res.json({ success: true, data: result });
});

export const listGateways = asyncHandler(async (_req: Request, res: Response) => {
  const gateways = gatewayRegistry.getAll().map((g) => ({
    slug: g.slug,
    displayName: g.displayName,
  }));

  res.json({ success: true, data: gateways });
});

export const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
  const gateway = String(req.params.gateway);
  const gatewayInstance = gatewayRegistry.get(gateway);

  if (!gatewayInstance) {
    throw new AppError(404, 'Gateway not found');
  }

  const payload = req.method === 'GET' ? req.query : req.body;
  const signature = req.headers['stripe-signature'] as string | undefined;
  const result = await gatewayInstance.handleWebhook(payload, signature);

  if (result.success && result.transactionId && result.status === 'completed') {
    await paymentService.complete(result.transactionId, result.externalId);
  }

  res.status(200).json({ received: true, status: result.status || 'processed' });
});
