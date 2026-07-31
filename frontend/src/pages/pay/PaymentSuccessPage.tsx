import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Download, Printer, Mail, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Transaction {
  id: string;
  amount: number;
  fee: number;
  total: number;
  currency: string;
  status: string;
  paymentMethod: string;
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  description: string;
  gateway: string;
  paidAt: string;
}

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const txId =
      searchParams.get('transactionId') ||
      searchParams.get('OrderMerchantReference');
    const externalId =
      searchParams.get('OrderTrackingId') ||
      searchParams.get('externalId');

    if (txId) {
      api
        .get('/payments/complete', { params: { transactionId: txId, externalId } })
        .then((res) => setTransaction(res.data.data))
        .catch(console.error);
    }
  }, [searchParams]);

  const copyId = async () => {
    if (transaction?.id) {
      await navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="max-w-lg w-full"
      >
        <Card className="overflow-hidden">
          <div className="bg-success/10 p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <CheckCircle className="h-20 w-20 text-success mx-auto" />
            </motion.div>
            <h1 className="text-2xl font-bold mt-4">Payment Successful!</h1>
            <p className="text-muted-foreground mt-1">Your payment has been processed successfully</p>
          </div>

          <CardContent className="p-6 space-y-6">
            {transaction && (
              <>
                <div className="text-center">
                  <p className="text-3xl font-bold text-success">
                    {formatCurrency(transaction.total, transaction.currency)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Total Paid</p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{transaction.id.slice(0, 8)}...</span>
                      <button onClick={copyId}>
                        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {transaction.invoiceNumber && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="text-muted-foreground">Invoice</span>
                      <span className="font-medium">{transaction.invoiceNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Payment Method</span>
                    <span className="font-medium capitalize">{transaction.paymentMethod?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Gateway</span>
                    <span className="font-medium">{transaction.gateway}</span>
                  </div>
                  {transaction.paidAt && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Paid Date</span>
                      <span className="font-medium">{formatDate(transaction.paidAt)}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1">
                    <Download className="h-4 w-4" />
                    <span className="text-xs">PDF</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" />
                    <span className="text-xs">Print</span>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-col h-auto py-3 gap-1">
                    <Mail className="h-4 w-4" />
                    <span className="text-xs">Email</span>
                  </Button>
                </div>
              </>
            )}

            <p className="text-xs text-center text-muted-foreground">
              A receipt has been sent to {transaction?.customerEmail || 'your email'}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
