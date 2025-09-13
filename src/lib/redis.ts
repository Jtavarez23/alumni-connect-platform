import Redis from 'ioredis';

// Only create Redis client if we're not in browser environment
let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  // Skip Redis in browser environment
  if (typeof window !== 'undefined') {
    console.warn('Redis not available in browser environment');
    return null;
  }
  
  if (!redis) {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0'),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    };
    
    redis = new Redis(redisConfig);
    
    redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      // Don't crash the app on Redis errors
    });
    
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
  }
  
  return redis;
}

// Cache utility functions
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCached(key: string, data: any, options: CacheOptions = {}): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    const serialized = JSON.stringify(data);
    
    if (options.ttl) {
      await client.setex(key, options.ttl, serialized);
    } else {
      await client.set(key, serialized);
    }
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.del(key);
  } catch (error) {
    console.error('Redis delete error:', error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
  } catch (error) {
    console.error('Redis pattern delete error:', error);
  }
}

// Cache key generators
export const cacheKeys = {
  feed: (userId: string, feedType: string, cursor?: string) => 
    `feed:${userId}:${feedType}:${cursor || 'initial'}`,
  
  post: (postId: string) => `post:${postId}`,
  
  user: (userId: string) => `user:${userId}`,
  
  api: (endpoint: string, params: Record<string, any> = {}) => {
    const paramString = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return `api:${endpoint}:${paramString}`;
  }
};

// Close Redis connection (for cleanup)
export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}