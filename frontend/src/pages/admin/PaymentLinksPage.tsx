import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Plus } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, PaginatedResponse } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PaymentLink {
  id: string;
  token: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  amount: number;
  status: string;
  invoiceNumber: string;
  paymentUrl: string;
  expiresAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  DISABLED: 'bg-muted text-muted-foreground',
  EXPIRED: 'bg-warning/10 text-warning',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchLinks();
  }, [search]);

  const fetchLinks = async () => {
    try {
      const { data } = await api.get<PaginatedResponse<PaymentLink>>('/payment-links', {
        params: { search: search || undefined },
      });
      setLinks(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Payment Links</h1>
            <p className="text-muted-foreground">Manage all your payment links</p>
          </div>
          <Link to="/admin/links/create">
            <Button variant="accent">
              <Plus className="h-4 w-4" />
              Create Link
            </Button>
          </Link>
        </div>

        <Input
          placeholder="Search by name, email, or invoice..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />

        <Card>
          <CardHeader>
            <CardTitle>All Links</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No payment links found</p>
                <Link to="/admin/links/create">
                  <Button variant="accent" className="mt-4">Create your first link</Button>
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Invoice</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Created</th>
                      <th className="pb-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link) => (
                      <tr key={link.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-4">
                          <p className="font-medium">{link.customerName}</p>
                          <p className="text-xs text-muted-foreground">{link.customerEmail}</p>
                        </td>
                        <td className="py-4">{link.invoiceNumber}</td>
                        <td className="py-4 font-semibold">{formatCurrency(link.amount, link.currency)}</td>
                        <td className="py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[link.status]}`}>
                            {link.status}
                          </span>
                        </td>
                        <td className="py-4 text-muted-foreground">{formatDate(link.createdAt)}</td>
                        <td className="py-4">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => copyLink(link.paymentUrl)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => window.open(link.paymentUrl, '_blank')}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
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
