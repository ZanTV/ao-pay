import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Copy, Check, QrCode, ExternalLink } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, ApiResponse } from '@/lib/api';

const schema = z.object({
  customerName: z.string().min(1, 'Required'),
  customerEmail: z.string().email('Invalid email'),
  customerPhone: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().length(3),
  amount: z.coerce.number().positive('Must be positive'),
  description: z.string().optional(),
  invoiceNumber: z.string().optional(),
  paymentType: z.enum(['ONE_TIME', 'PARTIAL', 'INSTALLMENTS']).optional(),
  expiresAt: z.string().optional(),
  maxAttempts: z.coerce.number().min(1).max(10).optional(),
  successUrl: z.string().url().optional().or(z.literal('')),
  cancelUrl: z.string().url().optional().or(z.literal('')),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CreatedLink {
  id: string;
  token: string;
  paymentUrl: string;
  qrCode: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}

const currencies = ['TZS', 'USD', 'KES', 'UGX', 'EUR', 'GBP', 'NGN', 'ZAR'];

export default function CreatePaymentLinkPage() {
  const navigate = useNavigate();
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'TZS',
      paymentType: 'ONE_TIME',
      maxAttempts: 3,
      country: 'Tanzania',
    },
  });

  const onSubmit = async (data: FormData) => {
    const payload = {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      successUrl: data.successUrl || undefined,
      cancelUrl: data.cancelUrl || undefined,
      webhookUrl: data.webhookUrl || undefined,
    };

    const { data: res } = await api.post<ApiResponse<CreatedLink>>('/payment-links', payload);
    setCreated(res.data);
  };

  const copyLink = async () => {
    if (created?.paymentUrl) {
      await navigator.clipboard.writeText(created.paymentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (created) {
    return (
      <AdminLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-success" />
              </div>
              <CardTitle>Payment Link Created</CardTitle>
              <CardDescription>Share this link with your customer to collect payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-muted/50 break-all text-sm font-mono">
                {created.paymentUrl}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={copyLink} variant="accent" className="flex-1">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.open(created.paymentUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                  Preview
                </Button>
              </div>

              {created.qrCode && (
                <div className="flex flex-col items-center gap-3 p-6 rounded-lg border">
                  <QrCode className="h-5 w-5 text-muted-foreground" />
                  <img src={created.qrCode} alt="Payment QR Code" className="w-48 h-48" />
                  <p className="text-xs text-muted-foreground">Scan to pay</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-semibold">{created.currency} {Number(created.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice</p>
                  <p className="font-semibold">{created.invoiceNumber}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setCreated(null)}>
                  Create Another
                </Button>
                <Button className="flex-1" onClick={() => navigate('/admin/links')}>
                  View All Links
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Create Payment Link</h1>
          <p className="text-muted-foreground">Generate a secure payment link for your customer</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Customer Name *</Label>
                  <Input {...register('customerName')} error={errors.customerName?.message} placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input {...register('customerEmail')} type="email" error={errors.customerEmail?.message} placeholder="john@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input {...register('customerPhone')} placeholder="+1234567890" />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input {...register('country')} placeholder="United States" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency *</Label>
                  <Select value={watch('currency')} onValueChange={(v) => setValue('currency', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input {...register('amount')} type="number" step="0.01" error={errors.amount?.message} placeholder="0.00" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description</Label>
                  <Input {...register('description')} placeholder="Payment for services" />
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input {...register('invoiceNumber')} placeholder="Auto-generated if empty" />
                </div>
                <div className="space-y-2">
                  <Label>Payment Type</Label>
                  <Select value={watch('paymentType')} onValueChange={(v) => setValue('paymentType', v as FormData['paymentType'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONE_TIME">One Time</SelectItem>
                      <SelectItem value="PARTIAL">Partial</SelectItem>
                      <SelectItem value="INSTALLMENTS">Installments</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Link Settings</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiration Date</Label>
                  <Input {...register('expiresAt')} type="datetime-local" />
                </div>
                <div className="space-y-2">
                  <Label>Max Attempts</Label>
                  <Input {...register('maxAttempts')} type="number" min={1} max={10} />
                </div>
                <div className="space-y-2">
                  <Label>Success URL</Label>
                  <Input {...register('successUrl')} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Cancel URL</Label>
                  <Input {...register('cancelUrl')} placeholder="https://..." />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Webhook URL</Label>
                  <Input {...register('webhookUrl')} placeholder="https://..." />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notes</Label>
                  <Input {...register('notes')} placeholder="Internal notes" />
                </div>
              </CardContent>
            </Card>

            <Button type="submit" variant="accent" size="lg" className="w-full" loading={isSubmitting}>
              Generate Secure Link
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
