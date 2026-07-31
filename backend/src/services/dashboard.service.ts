import prisma from '../lib/prisma.js';

type PaymentLinkStatus = 'ACTIVE' | 'DISABLED' | 'EXPIRED' | 'ARCHIVED' | 'DELETED';
type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'CANCELLED';

export class DashboardService {
  async getOverview(adminId: string) {
    const [
      totalRevenue,
      pendingPayments,
      completedPayments,
      expiredLinks,
      activeLinks,
      recentTransactions,
    ] = await Promise.all([
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED', paymentLink: { adminId } },
        _sum: { amount: true },
      }),
      prisma.transaction.count({
        where: { status: 'PENDING', paymentLink: { adminId } },
      }),
      prisma.transaction.count({
        where: { status: 'COMPLETED', paymentLink: { adminId } },
      }),
      prisma.paymentLink.count({
        where: { adminId, status: 'EXPIRED' },
      }),
      prisma.paymentLink.count({
        where: { adminId, status: 'ACTIVE' },
      }),
      prisma.transaction.findMany({
        where: { paymentLink: { adminId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          paymentLink: { select: { customerName: true, invoiceNumber: true } },
          gateway: { select: { displayName: true } },
        },
      }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueByDay = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        status: 'COMPLETED',
        paymentLink: { adminId },
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
    });

    const topCustomers = await prisma.customer.findMany({
      orderBy: { totalPaid: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        email: true,
        totalPaid: true,
        country: true,
      },
    });

    const gatewayStats = await prisma.transaction.groupBy({
      by: ['gatewayId'],
      where: { status: 'COMPLETED', paymentLink: { adminId } },
      _count: { id: true },
      _sum: { amount: true },
    });

    const gateways = await prisma.gateway.findMany();
    const gatewayMap = new Map(gateways.map((g) => [g.id, g.displayName]));

    return {
      overview: {
        revenue: Number(totalRevenue._sum.amount || 0),
        pendingPayments,
        completedPayments,
        expiredLinks,
        activeLinks,
      },
      recentTransactions: recentTransactions.map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        currency: t.currency,
        status: t.status,
        customerName: t.customerName || t.paymentLink.customerName,
        invoiceNumber: t.paymentLink.invoiceNumber,
        gateway: t.gateway?.displayName,
        createdAt: t.createdAt,
      })),
      revenueByDay: revenueByDay.map((r) => ({
        date: r.createdAt,
        amount: Number(r._sum.amount || 0),
      })),
      topCustomers: topCustomers.map((c) => ({
        ...c,
        totalPaid: Number(c.totalPaid),
      })),
      gatewayPerformance: gatewayStats.map((g) => ({
        gateway: gatewayMap.get(g.gatewayId || '') || 'Unknown',
        count: g._count.id,
        amount: Number(g._sum.amount || 0),
      })),
    };
  }
}

export const dashboardService = new DashboardService();
