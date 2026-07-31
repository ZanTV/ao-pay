import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  customerName: string;
  paymentMethod: string;
  createdAt: string;
  paymentLink?: { invoiceNumber: string };
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-success/10 text-success',
  PENDING: 'bg-warning/10 text-warning',
  PROCESSING: 'bg-accent/10 text-accent',
  FAILED: 'bg-destructive/10 text-destructive',
  REFUNDED: 'bg-muted text-muted-foreground',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<PaginatedResponse<Transaction>>('/transactions')
      .then((res) => setTransactions(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View and manage all payment transactions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No transactions recorded yet.</p>
                <p className="text-sm mt-1">Transactions appear here when customers complete payments.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Method</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="py-4 font-medium">{tx.customerName}</td>
                        <td className="py-4">{formatCurrency(tx.amount, tx.currency)}</td>
                        <td className="py-4 capitalize">{tx.paymentMethod?.replace('_', ' ')}</td>
                        <td className="py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[tx.status]}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-4 text-muted-foreground">{formatDate(tx.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
