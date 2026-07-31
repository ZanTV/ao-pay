import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createPaymentLinkSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(200),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').toUpperCase(),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().max(500).optional(),
  invoiceNumber: z.string().max(50).optional(),
  paymentType: z.enum(['ONE_TIME', 'PARTIAL', 'INSTALLMENTS']).optional(),
  expiresAt: z.string().datetime().optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  successUrl: z.string().url().optional().or(z.literal('')),
  cancelUrl: z.string().url().optional().or(z.literal('')),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().max(1000).optional(),
});

export const listPaymentLinksSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: z.enum(['ACTIVE', 'DISABLED', 'EXPIRED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
});

export const updateLinkStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'DISABLED', 'EXPIRED', 'ARCHIVED', 'DELETED']),
});

export const initiatePaymentSchema = z.object({
  gatewaySlug: z.string().min(1),
  paymentMethod: z.string().min(1),
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
});

export const refundSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().max(500).optional(),
});

export const tokenParamSchema = z.object({
  token: z.string().uuid(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
