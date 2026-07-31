import { createApp } from '../src/app.js';
import prisma from '../src/lib/prisma.js';

const app = createApp();

// Warm up database connection for serverless
prisma.$connect().catch(() => {});

export default app;
