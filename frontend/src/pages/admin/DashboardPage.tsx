import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Clock,
  CheckCircle,
  Link2,
  AlertCircle,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { StatCard } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiResponse } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface DashboardData {
  overview: {
    revenue: number;
    pendingPayments: number;
    completedPayments: number;
    expiredLinks: number;
    activeLinks: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    customerName: string;
    invoiceNumber: string;
    gateway: string;
    createdAt: string;
  }>;
  topCustomers: Array<{
    id: string;
    fullName: string;
    email: string;
    totalPaid: number;
  }>;
  gatewayPerformance: Array<{
    gateway: string;
    count: number;
    amount: number;
  }>;
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/10 text-warning',
  PROCESSING: 'bg-accent/10 text-accent',
  FAILED: 'bg-destructive/10 text-destructive',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<ApiResponse<DashboardData>>('/dashboard/overview')
      .then((res) => setData(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  const overview = data?.overview;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back. Here&apos;s your payment overview.</p>
          </div>
          <Link to="/admin/links/create">
            <Button variant="accent">
              <Plus className="h-4 w-4" />
              Create Payment Link
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(overview?.revenue || 0)}
            icon={DollarSign}
          />
          <StatCard
            title="Pending Payments"
            value={overview?.pendingPayments || 0}
            icon={Clock}
          />
          <StatCard
            title="Completed"
            value={overview?.completedPayments || 0}
            icon={CheckCircle}
          />
          <StatCard
            title="Active Links"
            value={overview?.activeLinks || 0}
            icon={Link2}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <Link to="/admin/transactions">
                <Button variant="ghost" size="sm">
                  View All <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {data?.recentTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data?.recentTransactions.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                          {tx.customerName?.[0] || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{tx.customerName}</p>
                          <p className="text-xs text-muted-foreground">{tx.invoiceNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(tx.amount, tx.currency)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[tx.status] || ''}`}>
                          {tx.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Customers</CardTitle>
            </CardHeader>
            <CardContent>
              {data?.topCustomers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No customers yet</p>
              ) : (
                <div className="space-y-4">
                  {data?.topCustomers.map((customer, i) => (
                    <div key={customer.id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{customer.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{customer.email}</p>
                      </div>
                      <p className="text-sm font-semibold">{formatCurrency(customer.totalPaid)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {data?.gatewayPerformance && data.gatewayPerformance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Gateway Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.gatewayPerformance.map((gw) => (
                  <div key={gw.gateway} className="p-4 rounded-lg bg-muted/50">
                    <p className="font-medium">{gw.gateway}</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(gw.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{gw.count} transactions</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
