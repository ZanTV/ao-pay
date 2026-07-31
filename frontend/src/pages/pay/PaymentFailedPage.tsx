import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, RefreshCw, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentFailedPage() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-red-50 to-white dark:from-red-950/20 dark:to-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
              <XCircle className="h-20 w-20 text-destructive mx-auto" />
            </motion.div>

            <div>
              <h1 className="text-2xl font-bold">Payment Failed</h1>
              <p className="text-muted-foreground mt-2">
                We couldn&apos;t process your payment. Please try again or choose a different payment method.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link to={`/pay/${token}`}>
                <Button variant="accent" className="w-full">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </Link>
              <Button variant="outline" className="w-full">
                <HelpCircle className="h-4 w-4" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
