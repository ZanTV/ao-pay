import { Redis } from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis: Redis | null = null;
let redisAvailable = false;

export function isRedisEnabled(): boolean {
  return config.redis.enabled;
}

export function getRedis(): Redis | null {
  if (!config.redis.enabled) return null;

  if (!redis) {
    redis = new Redis(config.redis.url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    redis.on('error', () => {
      redisAvailable = false;
    });

    redis.on('connect', () => {
      redisAvailable = true;
      logger.info('Redis connected');
    });
  }
  return redis;
}

export async function connectRedis(): Promise<boolean> {
  if (!config.redis.enabled) {
    logger.info('Redis disabled - caching off');
    return false;
  }

  try {
    const client = getRedis();
    if (!client) return false;
    await client.connect();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    logger.warn('Redis not available - caching disabled');
    return false;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redisAvailable) return null;
  try {
    const client = getRedis();
    if (!client) return null;
    const data = await client.get(key);
    return data ? (JSON.parse(data) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
  if (!redisAvailable) return;
  try {
    const client = getRedis();
    if (!client) return;
    await client.setex(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Cache failures are non-critical
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (!redisAvailable) return;
  try {
    const client = getRedis();
    if (!client) return;
    await client.del(key);
  } catch {
    // Cache failures are non-critical
  }
}
