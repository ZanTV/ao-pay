import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import prisma from '../lib/prisma.js';

type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

export const list = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as TransactionStatus | undefined;
  const search = req.query.search as string | undefined;

  const where = {
    paymentLink: { adminId: req.admin!.adminId },
    ...(status && { status }),
    ...(search && {
      OR: [
        { customerName: { contains: search, mode: 'insensitive' as const } },
        { customerEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        paymentLink: { select: { invoiceNumber: true } },
        gateway: { select: { displayName: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  res.json({
    success: true,
    data: transactions.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      fee: Number(t.fee),
      total: Number(t.total),
      currency: t.currency,
      status: t.status,
      paymentMethod: t.paymentMethod,
      customerName: t.customerName,
      customerEmail: t.customerEmail,
      invoiceNumber: t.paymentLink.invoiceNumber,
      gateway: t.gateway?.displayName,
      paidAt: t.paidAt,
      createdAt: t.createdAt,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});
