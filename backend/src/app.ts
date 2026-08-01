import express from 'express';
import { setupSecurity } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.routes.js';
import paymentLinkRoutes from './routes/paymentLink.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import transactionRoutes from './routes/transaction.routes.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  setupSecurity(app);

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'AO PAY API', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'AO PAY API', timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/payment-links', paymentLinkRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/transactions', transactionRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// Vercel Express service requires a default export
const app = createApp();
export default app;
