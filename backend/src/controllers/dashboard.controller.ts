import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { dashboardService } from '../services/dashboard.service.js';

export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const data = await dashboardService.getOverview(req.admin!.adminId);
  res.json({ success: true, data });
});
