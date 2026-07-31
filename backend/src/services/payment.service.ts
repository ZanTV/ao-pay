import prisma from '../lib/prisma.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { gatewayRegistry } from '../gateways/registry.js';
import { createAuditLog } from './audit.service.js';
import { paymentLinkService } from './paymentLink.service.js';

type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PAYMENT' | 'REFUND' | 'EXPORT' | 'SETTINGS_CHANGE';
type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

interface InitiatePaymentParams {
  token: string;
  gatewaySlug: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  country?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class PaymentService {
  async initiate(params: InitiatePaymentParams) {
    const linkData = await paymentLinkService.getByToken(params.token);

    const gateway = gatewayRegistry.get(params.gatewaySlug);
    if (!gateway) {
      throw new AppError(400, 'Invalid payment gateway');
    }

    const dbGateway = await prisma.gateway.findUnique({ where: { slug: params.gatewaySlug } });
    const fee = Number(linkData.amount) * 0.029;
    const total = Number(linkData.amount) + fee;

    let customer = await prisma.customer.findUnique({
      where: { email: params.customerEmail.toLowerCase() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          email: params.customerEmail.toLowerCase(),
          fullName: params.customerName,
          phone: params.customerPhone,
          company: params.company,
          country: params.country,
        },
      });
    }

    const transaction = await prisma.transaction.create({
      data: {
        paymentLinkId: linkData.id,
        customerId: customer.id,
        gatewayId: dbGateway?.id,
        amount: linkData.amount,
        fee,
        total,
        currency: linkData.currency,
        status: 'PENDING',
        paymentMethod: params.paymentMethod,
        customerName: params.customerName,
        customerEmail: params.customerEmail.toLowerCase(),
        customerPhone: params.customerPhone,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        country: params.country,
      },
    });

    await prisma.paymentLink.update({
      where: { id: linkData.id },
      data: { attemptCount: { increment: 1 } },
    });

    const returnUrl = `${config.frontendUrl}/pay/${params.token}/success?transactionId=${transaction.id}`;
    const cancelUrl = `${config.frontendUrl}/pay/${params.token}/failed?transactionId=${transaction.id}`;

    const result = await gateway.createPayment({
      amount: Number(linkData.amount),
      currency: linkData.currency,
      description: linkData.description || undefined,
      customerEmail: params.customerEmail,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      transactionId: transaction.id,
      returnUrl,
      cancelUrl,
      metadata: { paymentLinkId: linkData.id, token: params.token },
    });

    if (!result.success) {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED', metadata: { error: result.error } },
      });
      throw new AppError(502, result.error || 'Payment initiation failed');
    }

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { externalId: result.externalId, status: 'PROCESSING' },
    });

    return {
      transactionId: transaction.id,
      paymentUrl: result.paymentUrl,
      clientSecret: result.clientSecret,
    };
  }

  async complete(transactionId: string, externalId?: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { paymentLink: true, gateway: true },
    });

    if (!transaction) {
      throw new AppError(404, 'Transaction not found');
    }

    if (transaction.status === 'COMPLETED') {
      return this.formatTransaction(transaction);
    }

    const gatewaySlug = transaction.gateway?.slug || 'stripe';
    const gateway = gatewayRegistry.get(gatewaySlug);

    if (gateway && transaction.externalId) {
      const verification = await gateway.verifyPayment({
        externalId: transaction.externalId,
        transactionId: transaction.id,
      });

      if (verification.status !== 'completed') {
        await prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'FAILED' },
        });
        throw new AppError(402, 'Payment verification failed');
      }
    }

    const updated = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        externalId: externalId || transaction.externalId,
      },
      include: { paymentLink: true, gateway: true },
    });

    if (updated.customerId) {
      await prisma.customer.update({
        where: { id: updated.customerId },
        data: { totalPaid: { increment: updated.amount } },
      });
    }

    await createAuditLog({
      action: 'PAYMENT',
      entity: 'Transaction',
      entityId: transactionId,
      details: { amount: Number(updated.amount), currency: updated.currency },
    });

    return this.formatTransaction(updated);
  }

  async getTransaction(transactionId: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { paymentLink: true, gateway: true },
    });

    if (!transaction) {
      throw new AppError(404, 'Transaction not found');
    }

    return this.formatTransaction(transaction);
  }

  async refund(transactionId: string, adminId: string, amount: number, reason?: string) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { gateway: true },
    });

    if (!transaction) throw new AppError(404, 'Transaction not found');
    if (transaction.status !== 'COMPLETED') {
      throw new AppError(400, 'Only completed transactions can be refunded');
    }

    const gateway = transaction.gateway ? gatewayRegistry.get(transaction.gateway.slug) : null;
    let externalId: string | undefined;

    if (gateway && transaction.externalId) {
      const result = await gateway.refund({
        externalId: transaction.externalId,
        amount,
        currency: transaction.currency,
        reason,
      });

      if (!result.success) {
        throw new AppError(502, result.error || 'Refund failed');
      }
      externalId = result.externalId;
    }

    const refund = await prisma.refund.create({
      data: {
        transactionId,
        adminId,
        amount,
        reason,
        status: 'COMPLETED',
        externalId,
        processedAt: new Date(),
      },
    });

    const isPartial = amount < Number(transaction.amount);
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: isPartial ? 'PARTIALLY_REFUNDED' : 'REFUNDED',
      },
    });

    await createAuditLog({
      adminId,
      action: 'REFUND',
      entity: 'Transaction',
      entityId: transactionId,
      details: { amount, reason },
    });

    return refund;
  }

  private formatTransaction(transaction: {
    id: string;
    amount: { toString(): string } | number;
    fee: { toString(): string } | number;
    total: { toString(): string } | number;
    currency: string;
    status: string;
    paymentMethod: string | null;
    customerName: string | null;
    customerEmail: string | null;
    paidAt: Date | null;
    createdAt: Date;
    paymentLink?: { invoiceNumber: string | null; description: string | null } | null;
    gateway?: { displayName: string } | null;
  }) {
    return {
      id: transaction.id,
      amount: Number(transaction.amount),
      fee: Number(transaction.fee),
      total: Number(transaction.total),
      currency: transaction.currency,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      customerName: transaction.customerName,
      customerEmail: transaction.customerEmail,
      invoiceNumber: transaction.paymentLink?.invoiceNumber,
      description: transaction.paymentLink?.description,
      gateway: transaction.gateway?.displayName,
      paidAt: transaction.paidAt,
      createdAt: transaction.createdAt,
    };
  }
}

export const paymentService = new PaymentService();
