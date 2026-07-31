import { motion } from 'framer-motion';
import { Clock, Mail } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function PaymentExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-warning/10 flex items-center justify-center">
              <Clock className="h-10 w-10 text-warning" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Link Expired</h1>
              <p className="text-muted-foreground mt-2">
                This payment link has expired and is no longer valid for payment.
              </p>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 mx-auto mb-2" />
              Please contact the sender to request a new payment link.
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
