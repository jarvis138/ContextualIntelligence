import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limiter to prevent abuse of API endpoints
 */
export class RateLimiter {
  private store: Map<string, RateLimitInfo>;
  private readonly maxRequests: number;
  private readonly windowMs: number;

  /**
   * Create a new rate limiter
   * @param maxRequests Maximum number of requests allowed within the time window
   * @param windowMs Time window in milliseconds
   */
  constructor(maxRequests = 100, windowMs = 60 * 1000) {
    this.store = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if a request from the given IP address can be processed
   * @param ip IP address of the client
   * @returns Boolean indicating if the request is allowed
   */
  isAllowed(ip: string): boolean {
    const now = Date.now();
    const info = this.store.get(ip);

    if (!info) {
      // First request from this IP
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (now > info.resetTime) {
      // Reset window has passed, reset counters
      this.store.set(ip, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (info.count < this.maxRequests) {
      // Increment counter
      info.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  /**
   * Get rate limit information for the given IP
   * @param ip IP address of the client
   * @returns Object with rate limit information
   */
  getRateLimitInfo(ip: string): { 
    remaining: number; 
    reset: number; 
    limit: number; 
  } {
    const now = Date.now();
    const info = this.store.get(ip);

    if (!info || now > info.resetTime) {
      return {
        remaining: this.maxRequests,
        reset: now + this.windowMs,
        limit: this.maxRequests
      };
    }

    return {
      remaining: Math.max(0, this.maxRequests - info.count),
      reset: info.resetTime,
      limit: this.maxRequests
    };
  }

  /**
   * Clear all stored rate limit information
   */
  clear(): void {
    this.store.clear();
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

/**
 * Express middleware for rate limiting
 * @param maxRequests Maximum number of requests allowed within the time window
 * @param windowMs Time window in milliseconds
 */
export function rateLimitMiddleware(maxRequests = 100, windowMs = 60 * 1000) {
  const limiter = new RateLimiter(maxRequests, windowMs);
  
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (limiter.isAllowed(ip)) {
      // Add rate limit headers
      const info = limiter.getRateLimitInfo(ip);
      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', info.remaining.toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil(info.reset / 1000).toString());
      
      next();
    } else {
      const info = limiter.getRateLimitInfo(ip);
      res.setHeader('X-RateLimit-Limit', info.limit.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(info.reset / 1000).toString());
      
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((info.reset - Date.now()) / 1000)
      });
    }
  };
}