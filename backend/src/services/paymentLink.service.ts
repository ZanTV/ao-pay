import QRCode from 'qrcode';
import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateSecureToken, signToken, verifyTokenSignature } from '../utils/crypto.js';
import { createAuditLog } from './audit.service.js';

type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PAYMENT' | 'REFUND' | 'EXPORT' | 'SETTINGS_CHANGE';
type PaymentLinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'ARCHIVED' | 'DELETED';
type PaymentType = 'ONE_TIME' | 'PARTIAL' | 'INSTALLMENTS';

interface CreatePaymentLinkParams {
  adminId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  country?: string;
  currency: string;
  amount: number;
  description?: string;
  invoiceNumber?: string;
  paymentType?: PaymentType;
  expiresAt?: Date;
  maxAttempts?: number;
  successUrl?: string;
  cancelUrl?: string;
  webhookUrl?: string;
  notes?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface ListPaymentLinksParams {
  adminId: string;
  page?: number;
  limit?: number;
  status?: PaymentLinkStatus;
  search?: string;
}

export class PaymentLinkService {
  async create(params: CreatePaymentLinkParams) {
    const token = generateSecureToken();
    const expiresAt = params.expiresAt;
    const tokenSignature = signToken(token, expiresAt);

    const paymentLink = await prisma.paymentLink.create({
      data: {
        token,
        tokenSignature,
        adminId: params.adminId,
        customerName: params.customerName,
        customerEmail: params.customerEmail.toLowerCase(),
        customerPhone: params.customerPhone,
        country: params.country,
        currency: params.currency.toUpperCase(),
        amount: params.amount,
        description: params.description,
        invoiceNumber: params.invoiceNumber || `INV-${Date.now()}`,
        paymentType: params.paymentType || 'ONE_TIME',
        expiresAt,
        maxAttempts: params.maxAttempts || 3,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        webhookUrl: params.webhookUrl,
        notes: params.notes,
      },
    });

    const paymentUrl = `${config.paymentBaseUrl}/${token}`;
    const qrCodeDataUrl = await QRCode.toDataURL(paymentUrl, {
      width: 300,
      margin: 2,
      color: { dark: '#0F172A', light: '#FFFFFF' },
    });

    await prisma.invoice.create({
      data: {
        paymentLinkId: paymentLink.id,
        invoiceNumber: paymentLink.invoiceNumber!,
        subtotal: params.amount,
        total: params.amount,
        currency: params.currency.toUpperCase(),
      },
    });

    await createAuditLog({
      adminId: params.adminId,
      action: 'CREATE',
      entity: 'PaymentLink',
      entityId: paymentLink.id,
      details: { amount: params.amount, currency: params.currency },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      ...paymentLink,
      paymentUrl,
      qrCode: qrCodeDataUrl,
    };
  }

  async getByToken(token: string) {
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { token },
      include: {
        invoice: true,
        admin: { select: { firstName: true, lastName: true } },
      },
    });

    if (!paymentLink) {
      throw new AppError(404, 'Payment link not found');
    }

    if (!verifyTokenSignature(paymentLink.token, paymentLink.tokenSignature, paymentLink.expiresAt || undefined)) {
      throw new AppError(403, 'Invalid payment link signature');
    }

    if (paymentLink.status === 'DISABLED') {
      throw new AppError(403, 'Payment link has been disabled');
    }

    if (paymentLink.status === 'DELETED' || paymentLink.status === 'ARCHIVED') {
      throw new AppError(404, 'Payment link not found');
    }

    if (paymentLink.expiresAt && paymentLink.expiresAt < new Date()) {
      if (paymentLink.status !== 'EXPIRED') {
        await prisma.paymentLink.update({
          where: { id: paymentLink.id },
          data: { status: 'EXPIRED' },
        });
      }
      throw new AppError(410, 'Payment link has expired');
    }

    if (paymentLink.attemptCount >= paymentLink.maxAttempts) {
      throw new AppError(429, 'Maximum payment attempts exceeded');
    }

    const gateways = await prisma.gateway.findMany({ where: { isActive: true } });
    const paymentMethods = await prisma.paymentMethod.findMany({ where: { isActive: true } });
    const companySetting = await prisma.systemSetting.findUnique({ where: { key: 'company' } });

    return {
      id: paymentLink.id,
      token: paymentLink.token,
      customerName: paymentLink.customerName,
      customerEmail: paymentLink.customerEmail,
      customerPhone: paymentLink.customerPhone,
      country: paymentLink.country,
      currency: paymentLink.currency,
      amount: Number(paymentLink.amount),
      description: paymentLink.description,
      invoiceNumber: paymentLink.invoiceNumber,
      paymentType: paymentLink.paymentType,
      expiresAt: paymentLink.expiresAt,
      maxAttempts: paymentLink.maxAttempts,
      attemptCount: paymentLink.attemptCount,
      invoice: paymentLink.invoice,
      gateways: gateways.map((g) => ({
        slug: g.slug,
        displayName: g.displayName,
        supportedMethods: g.supportedMethods,
      })),
      paymentMethods,
      company: companySetting?.value || {},
    };
  }

  async list(params: ListPaymentLinksParams) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where = {
      adminId: params.adminId,
      status: params.status ? params.status : { not: 'DELETED' as PaymentLinkStatus },
      ...(params.search && {
        OR: [
          { customerName: { contains: params.search, mode: 'insensitive' as const } },
          { customerEmail: { contains: params.search, mode: 'insensitive' as const } },
          { invoiceNumber: { contains: params.search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [links, total] = await Promise.all([
      prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          transactions: {
            where: { status: 'COMPLETED' },
            select: { id: true, amount: true, status: true },
          },
        },
      }),
      prisma.paymentLink.count({ where }),
    ]);

    return {
      data: links.map((link) => ({
        ...link,
        amount: Number(link.amount),
        paymentUrl: `${config.paymentBaseUrl}/${link.token}`,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateStatus(id: string, adminId: string, status: PaymentLinkStatus) {
    const link = await prisma.paymentLink.findFirst({ where: { id, adminId } });
    if (!link) throw new AppError(404, 'Payment link not found');

    const updated = await prisma.paymentLink.update({
      where: { id },
      data: { status },
    });

    await createAuditLog({
      adminId,
      action: 'UPDATE',
      entity: 'PaymentLink',
      entityId: id,
      details: { status },
    });

    return updated;
  }

  async duplicate(id: string, adminId: string) {
    const original = await prisma.paymentLink.findFirst({ where: { id, adminId } });
    if (!original) throw new AppError(404, 'Payment link not found');

    return this.create({
      adminId,
      customerName: original.customerName,
      customerEmail: original.customerEmail,
      customerPhone: original.customerPhone || undefined,
      country: original.country || undefined,
      currency: original.currency,
      amount: Number(original.amount),
      description: original.description || undefined,
      paymentType: original.paymentType,
      maxAttempts: original.maxAttempts,
      successUrl: original.successUrl || undefined,
      cancelUrl: original.cancelUrl || undefined,
      webhookUrl: original.webhookUrl || undefined,
      notes: original.notes || undefined,
    });
  }
}

export const paymentLinkService = new PaymentLinkService();
