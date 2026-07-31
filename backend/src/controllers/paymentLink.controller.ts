import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { paymentLinkService } from '../services/paymentLink.service.js';

type LinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'ARCHIVED' | 'DELETED';

export const createPaymentLink = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentLinkService.create({
    adminId: req.admin!.adminId,
    ...req.body,
    expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.status(201).json({ success: true, data: result });
});

export const listPaymentLinks = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentLinkService.list({
    adminId: req.admin!.adminId,
    ...req.query,
  });

  res.json({ success: true, ...result });
});

export const getPaymentLink = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentLinkService.getByToken(String(req.params.token));
  res.json({ success: true, data: result });
});

export const updateLinkStatus = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentLinkService.updateStatus(
    String(req.params.id),
    req.admin!.adminId,
    req.body.status as LinkStatus
  );

  res.json({ success: true, data: result });
});

export const duplicateLink = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentLinkService.duplicate(String(req.params.id), req.admin!.adminId);
  res.status(201).json({ success: true, data: result });
});
