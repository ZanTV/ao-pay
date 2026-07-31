import { createApp } from './app.js';
import { config, validateConfig } from './config/index.js';
import { logger } from './utils/logger.js';
import { connectRedis } from './lib/redis.js';
import prisma from './lib/prisma.js';

async function bootstrap() {
  validateConfig();

  const app = createApp();

  await connectRedis();

  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }

  app.listen(config.port, () => {
    logger.info(`AO PAY API running on port ${config.port} [${config.env}]`);
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
