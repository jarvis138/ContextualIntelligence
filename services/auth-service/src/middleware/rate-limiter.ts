import { Request, Response, NextFunction } from 'express';
import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ApiError } from './error-handler';

// Redis client for rate limiting
let redisClient;

// Initialize Redis client if in production
if (process.env.NODE_ENV === 'production') {
  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis rate limiter error', { error: err.message });
  });

  redisClient.connect().catch((err) => {
    logger.error('Failed to connect to Redis for rate limiting', { error: err.message });
  });
}

// In-memory store for development
const inMemoryStore = new Map();

// Rate limiter middleware
export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for health checks
  if (req.path === '/health') {
    return next();
  }

  try {
    // Get client identifier (IP or user ID if authenticated)
    const clientId = req.user ? `user:${(req.user as any).id}` : `ip:${req.ip}`;
    const key = `ratelimit:${clientId}`;
    const windowMs = config.security.rateLimitWindow;
    const maxRequests = config.security.rateLimitMax;
    const now = Date.now();

    // Different implementation based on environment
    if (process.env.NODE_ENV === 'production' && redisClient?.isReady) {
      // Redis-based rate limiting for production
      const result = await redisClient.eval(`
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local windowMs = tonumber(ARGV[2])
        local maxRequests = tonumber(ARGV[3])
        
        -- Clean up old requests
        redis.call('ZREMRANGEBYSCORE', key, 0, now - windowMs)
        
        -- Count requests in current window
        local requestCount = redis.call('ZCARD', key)
        
        -- Check if limit exceeded
        if requestCount >= maxRequests then
          return requestCount
        end
        
        -- Add current request
        redis.call('ZADD', key, now, now)
        -- Set expiry
        redis.call('EXPIRE', key, math.ceil(windowMs/1000))
        
        return requestCount
      `, 1, key, now, windowMs, maxRequests);

      // Set headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result));
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      // If limit exceeded
      if (result >= maxRequests) {
        throw new ApiError(429, 'Too Many Requests', 'RATE_LIMIT_EXCEEDED');
      }
    } else {
      // In-memory rate limiting for development
      let requests = inMemoryStore.get(key) || [];
      
      // Filter requests within current window
      const windowStart = now - windowMs;
      requests = requests.filter(timestamp => timestamp > windowStart);
      
      // Check if limit exceeded
      if (requests.length >= maxRequests) {
        // Set headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
        
        throw new ApiError(429, 'Too Many Requests', 'RATE_LIMIT_EXCEEDED');
      }
      
      // Add current request
      requests.push(now);
      inMemoryStore.set(key, requests);
      
      // Set headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - requests.length);
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
    }

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      // If Redis fails, log and continue
      logger.error('Rate limiter error', { error });
      next();
    }
  }
};