import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../cache-service';
import { logger } from '../logger';

interface CacheMiddlewareOptions {
  ttl?: number; // Cache TTL in seconds
  keyGenerator?: (req: Request) => string; // Custom key generator
  condition?: (req: Request) => boolean; // Condition to determine if response should be cached
  tags?: string[] | ((req: Request) => string[]); // Tags for cache invalidation
}

/**
 * Create a middleware for caching API responses
 */
export const createCacheMiddleware = (
  cacheService: CacheService,
  options: CacheMiddlewareOptions = {}
) => {
  const {
    ttl,
    keyGenerator = defaultKeyGenerator,
    condition = defaultCacheCondition,
    tags
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching if condition is not met
    if (!condition(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator(req);

    try {
      // Try to get from cache
      const cachedResponse = await cacheService.get<{
        status: number;
        headers: Record<string, string>;
        data: any;
      }>(cacheKey);

      if (cachedResponse) {
        // Set headers from cached response
        for (const [key, value] of Object.entries(cachedResponse.headers)) {
          res.setHeader(key, value);
        }

        // Add cache header
        res.setHeader('X-Cache', 'HIT');

        // Send cached response
        return res.status(cachedResponse.status).json(cachedResponse.data);
      }

      // Cache miss, continue with request
      res.setHeader('X-Cache', 'MISS');

      // Capture the original res.json method
      const originalJson = res.json;

      // Override res.json method to cache the response
      res.json = function (data: any) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Get response headers to cache
          const headers: Record<string, string> = {};
          const headersToCache = ['content-type', 'content-language', 'cache-control'];

          for (const header of headersToCache) {
            const value = res.getHeader(header);
            if (value) {
              headers[header] = value.toString();
            }
          }

          // Determine tags for this request
          const cacheTags = typeof tags === 'function' ? tags(req) : tags;

          // Store response in cache
          cacheService.set(
            cacheKey,
            {
              status: res.statusCode,
              headers,
              data
            },
            {
              ttl,
              tags: cacheTags
            }
          ).catch(err => {
            logger.error('Error caching response', { error: err, cacheKey });
          });
        }

        // Call the original json method
        return originalJson.call(res, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error, cacheKey });
      next();
    }
  };
};

/**
 * Default key generator function
 */
const defaultKeyGenerator = (req: Request): string => {
  // Include tenant ID if available
  const tenantId = req.headers['x-tenant-id'] || 
                  (req.hostname.includes('.') ? req.hostname.split('.')[0] : 'default');
  
  // Include user ID if authenticated
  const userId = req.user ? (req.user as any).id : 'anonymous';
  
  // Generate key based on method, path, query params, and tenant/user context
  return `${tenantId}:${userId}:${req.method}:${req.path}:${JSON.stringify(req.query)}`;
};

/**
 * Default condition function
 */
const defaultCacheCondition = (req: Request): boolean => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    return false;
  }
  
  // Don't cache if Authorization header contains 'Bearer'
  // This is to avoid caching responses with sensitive data
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  // Don't cache if no-cache is specified
  const cacheControl = req.headers['cache-control'];
  if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('no-store'))) {
    return false;
  }
  
  return true;
};