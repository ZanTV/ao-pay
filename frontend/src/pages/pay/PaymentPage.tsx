import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import {
  Shield,
  Clock,
  CreditCard,
  Smartphone,
  Building2,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, ApiResponse } from '@/lib/api';
import { cn, formatCurrency, getTimeRemaining } from '@/lib/utils';

interface PaymentLinkData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  country: string | null;
  currency: string;
  amount: number;
  description: string | null;
  invoiceNumber: string | null;
  expiresAt: string | null;
  gateways: Array<{ slug: string; displayName: string; supportedMethods: string[] }>;
  paymentMethods: Array<{ slug: string; name: string; icon: string | null }>;
  company: { name?: string; logo?: string; tagline?: string };
}

const paymentSchema = z.object({
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  gatewaySlug: z.string().min(1),
  paymentMethod: z.string().min(1),
  acceptTerms: z.boolean().refine((v) => v, 'You must accept the terms'),
});

type PaymentForm = z.infer<typeof paymentSchema>;

const methodIcons: Record<string, React.ReactNode> = {
  paypal: <CreditCard className="h-5 w-5" />,
  visa: <CreditCard className="h-5 w-5" />,
  mastercard: <CreditCard className="h-5 w-5" />,
  apple_pay: <Smartphone className="h-5 w-5" />,
  google_pay: <Smartphone className="h-5 w-5" />,
  bank: <Building2 className="h-5 w-5" />,
  mobile_money: <Smartphone className="h-5 w-5" />,
};

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [time, setTime] = useState(getTimeRemaining(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeRemaining(expiresAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (time.expired) return <span className="text-destructive font-medium">Expired</span>;

  return (
    <span className="font-mono font-medium">
      {time.days > 0 && `${time.days}d `}
      {String(time.hours).padStart(2, '0')}:
      {String(time.minutes).padStart(2, '0')}:
      {String(time.seconds).padStart(2, '0')}
    </span>
  );
}

export default function PaymentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [linkData, setLinkData] = useState<PaymentLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      acceptTerms: false,
    },
  });

  useEffect(() => {
    if (linkData) {
      setValue('customerName', linkData.customerName);
      setValue('customerEmail', linkData.customerEmail);
      if (linkData.customerPhone) setValue('customerPhone', linkData.customerPhone);
      if (linkData.country) setValue('country', linkData.country);
    }
  }, [linkData, setValue]);

  useEffect(() => {
    api
      .get<ApiResponse<PaymentLinkData>>(`/payment-links/public/${token}`)
      .then((res) => setLinkData(res.data.data))
      .catch((err) => {
        const status = err.response?.status;
        if (status === 410) {
          navigate(`/pay/${token}/expired`);
        } else {
          setError(err.response?.data?.message || 'Payment link not found');
        }
      })
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const fee = linkData ? linkData.amount * 0.029 : 0;
  const total = linkData ? linkData.amount + fee : 0;

  const onSubmit = async (data: PaymentForm) => {
    try {
      const { data: res } = await api.post<ApiResponse<{ paymentUrl: string; transactionId: string }>>(
        `/payments/${token}/initiate`,
        data
      );

      if (res.data.paymentUrl) {
        window.location.href = res.data.paymentUrl;
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Payment failed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <p className="text-destructive font-medium">{error || 'Link not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold mb-3">
            AO
          </div>
          <h1 className="text-2xl font-bold">{linkData.company?.name || 'AO PAY'}</h1>
          <p className="text-muted-foreground text-sm">{linkData.company?.tagline}</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 space-y-4"
          >
            <Card className="border-2 border-accent/20">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(linkData.amount, linkData.currency)}</p>
                {linkData.description && (
                  <p className="text-sm text-muted-foreground mt-2">{linkData.description}</p>
                )}
                {linkData.invoiceNumber && (
                  <p className="text-xs text-muted-foreground mt-3">Invoice: {linkData.invoiceNumber}</p>
                )}
              </CardContent>
            </Card>

            {linkData.expiresAt && (
              <Card>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <Clock className="h-4 w-4 text-warning" />
                  <div>
                    <p className="text-xs text-muted-foreground">Expires in</p>
                    <CountdownTimer expiresAt={linkData.expiresAt} />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Shield className="h-3.5 w-3.5" />
              <Lock className="h-3.5 w-3.5" />
              <span>256-bit SSL encrypted payment</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <Card>
              <CardHeader>
                <CardTitle>Complete Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {error && (
                    <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input {...register('customerName')} error={errors.customerName?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input {...register('customerEmail')} type="email" error={errors.customerEmail?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input {...register('customerPhone')} />
                    </div>
                    <div className="space-y-2">
                      <Label>Company (Optional)</Label>
                      <Input {...register('company')} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Choose Payment Method</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {linkData.paymentMethods.map((method) => (
                        <button
                          key={method.slug}
                          type="button"
                          onClick={() => {
                            setSelectedMethod(method.slug);
                            setValue('paymentMethod', method.slug);
                            const pesapal = linkData.gateways.find(
                              (g) => g.slug === 'pesapal' && g.supportedMethods.includes(method.slug)
                            );
                            const gw =
                              pesapal ||
                              linkData.gateways.find((g) => g.supportedMethods.includes(method.slug));
                            if (gw) {
                              setSelectedGateway(gw.slug);
                              setValue('gatewaySlug', gw.slug);
                            }
                          }}
                          className={cn(
                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                            selectedMethod === method.slug
                              ? 'border-accent bg-accent/5 shadow-glow'
                              : 'border-border hover:border-accent/50'
                          )}
                        >
                          {methodIcons[method.slug] || <CreditCard className="h-5 w-5" />}
                          <span className="text-xs font-medium">{method.name}</span>
                        </button>
                      ))}
                    </div>
                    {errors.paymentMethod && (
                      <p className="text-xs text-destructive">{errors.paymentMethod.message}</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span>{formatCurrency(linkData.amount, linkData.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing Fee</span>
                      <span>{formatCurrency(fee, linkData.currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(total, linkData.currency)}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={watch('acceptTerms')}
                      onCheckedChange={(v) => setValue('acceptTerms', v === true)}
                    />
                    <label className="text-sm text-muted-foreground leading-tight">
                      I agree to the terms and conditions and authorize this payment
                    </label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="text-xs text-destructive">{errors.acceptTerms.message}</p>
                  )}

                  <Button
                    type="submit"
                    variant="accent"
                    size="lg"
                    className="w-full"
                    loading={isSubmitting}
                    disabled={!selectedMethod || !selectedGateway}
                  >
                    Pay {formatCurrency(total, linkData.currency)}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
