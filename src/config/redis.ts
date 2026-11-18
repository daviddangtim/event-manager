import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);
export const redisPub = new Redis(redisUrl);
export const redisSub = new Redis(redisUrl);

redis.on('connect', () => console.log('Connected to Redis cache'));
redis.on('error', (err) => console.error('Redis connection error:', err));