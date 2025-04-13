import { Request, Response, NextFunction } from 'express';

interface CacheItem {
  data: any;
  expiry: number;
}

/**
 * Simple in-memory cache implementation
 */
class MemoryCache {
  private cache: Map<string, CacheItem>;
  private readonly defaultTTL: number;

  constructor(defaultTTL = 60) { // Default TTL in seconds
    this.cache = new Map();
    this.defaultTTL = defaultTTL;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any, ttl = this.defaultTTL): void {
    const expiry = Date.now() + (ttl * 1000);
    this.cache.set(key, { data, expiry });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate all cache entries that match the given pattern
   * @param pattern String pattern to match against keys (e.g., '/api/projects')
   */
  invalidatePattern(pattern: string): void {
    Array.from(this.cache.keys()).forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }
}

// Create a singleton instance
export const cache = new MemoryCache();

/**
 * Express middleware for caching API responses
 * @param ttl Time to live in seconds
 */
export function cacheMiddleware(ttl = 60) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Create a cache key from the request URL and query params
    const key = `${req.originalUrl || req.url}`;
    
    // Check if we have a cached response
    const cachedData = cache.get(key);
    
    if (cachedData) {
      // Add cache header for debugging
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedData);
    }

    // Store the original res.json method
    const originalJson = res.json;
    
    // Override the json method to cache the response
    res.json = function(data: any): Response {
      // Add cache header for debugging
      res.setHeader('X-Cache', 'MISS');
      
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttl);
      }
      
      // Call the original json method
      return originalJson.call(this, data);
    };

    next();
  };
}

/**
 * Middleware to invalidate cache when related resources are modified
 * @param patterns Array of patterns to invalidate
 */
export function invalidateCache(patterns: string[]) {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Store the original res.json and res.send methods
    const originalEnd = res.end;
    
    // Override the end method to invalidate cache after successful modifications
    res.end = function(this: Response): Response {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        patterns.forEach(pattern => {
          cache.invalidatePattern(pattern);
        });
      }
      
      // Call the original end method with the original arguments
      return originalEnd.apply(this, arguments);
    };

    next();
  };
}