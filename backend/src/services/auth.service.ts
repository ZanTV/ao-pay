import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { createAuditLog } from './audit.service.js';

interface LoginParams {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface RegisterParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export class AuthService {
  async login(params: LoginParams) {
    const admin = await prisma.admin.findUnique({ where: { email: params.email.toLowerCase() } });

    if (!admin || !admin.isActive) {
      throw new AppError(401, 'Invalid email or password');
    }

    const isValid = await bcrypt.compare(params.password, admin.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'Invalid email or password');
    }

    const payload = { adminId: admin.id, email: admin.email, role: admin.role };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.session.create({
      data: {
        adminId: admin.id,
        refreshToken,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        expiresAt,
      },
    });

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date(), lastLoginIp: params.ipAddress },
    });

    await createAuditLog({
      adminId: admin.id,
      action: 'LOGIN',
      entity: 'Admin',
      entityId: admin.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
        avatar: admin.avatar,
      },
    };
  }

  async register(params: RegisterParams) {
    const existing = await prisma.admin.findUnique({
      where: { email: params.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError(409, 'Email already registered');
    }

    const passwordHash = await bcrypt.hash(params.password, 12);

    const admin = await prisma.admin.create({
      data: {
        email: params.email.toLowerCase(),
        passwordHash,
        firstName: params.firstName,
        lastName: params.lastName,
        phone: params.phone,
      },
    });

    await createAuditLog({
      adminId: admin.id,
      action: 'CREATE',
      entity: 'Admin',
      entityId: admin.id,
    });

    return {
      id: admin.id,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
    };
  }

  async refreshToken(token: string) {
    const session = await prisma.session.findUnique({ where: { refreshToken: token } });

    if (!session || session.expiresAt < new Date()) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
    if (!admin || !admin.isActive) {
      throw new AppError(401, 'Account inactive');
    }

    const payload = { adminId: admin.id, email: admin.email, role: admin.role };
    const accessToken = generateAccessToken(payload);

    return { accessToken };
  }

  async logout(refreshToken: string, adminId?: string) {
    await prisma.session.deleteMany({ where: { refreshToken } });

    if (adminId) {
      await createAuditLog({
        adminId,
        action: 'LOGOUT',
        entity: 'Admin',
        entityId: adminId,
      });
    }
  }

  async getProfile(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        twoFactorEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new AppError(404, 'Admin not found');
    }

    return admin;
  }
}

export const authService = new AuthService();
