/**
 * Rate Limiting and Retry Logic for API Requests
 * 
 * This module provides utility functions for rate limiting API requests
 * and retrying failed requests with exponential backoff.
 */

import Bottleneck from 'bottleneck';
import pRetry from 'p-retry';

interface RateLimiterOptions {
  maxConcurrent?: number;
  minTime?: number;
  maxRetries?: number;
  retryTimeout?: number;
}

interface ServiceConfig {
  [key: string]: RateLimiterOptions;
}

/**
 * Default rate limiting configuration for various services
 */
const serviceConfigs: ServiceConfig = {
  googleDrive: {
    maxConcurrent: 5,
    minTime: 100, // 100ms between requests (max 10 requests per second)
    maxRetries: 3,
    retryTimeout: 1000
  },
  slack: {
    maxConcurrent: 1,
    minTime: 1000, // 1000ms between requests (max 1 request per second)
    maxRetries: 5,
    retryTimeout: 2000
  },
  gmail: {
    maxConcurrent: 5,
    minTime: 100, // 100ms between requests (max 10 requests per second)
    maxRetries: 3,
    retryTimeout: 1000
  },
  microsoftGraph: {
    maxConcurrent: 3,
    minTime: 100, // 100ms between requests
    maxRetries: 3,
    retryTimeout: 1000
  },
  default: {
    maxConcurrent: 1,
    minTime: 1000, // 1000ms between requests
    maxRetries: 3,
    retryTimeout: 1000
  }
};

/**
 * Rate limiters for different services
 */
const limiters: Record<string, Bottleneck> = {};

/**
 * Get a rate limiter for a specific service
 * 
 * @param service - The service name to get a rate limiter for
 * @returns A Bottleneck rate limiter instance
 */
export function getRateLimiter(service: string): Bottleneck {
  if (!limiters[service]) {
    const config = serviceConfigs[service] || serviceConfigs.default;
    limiters[service] = new Bottleneck({
      maxConcurrent: config.maxConcurrent,
      minTime: config.minTime
    });
  }
  return limiters[service];
}

/**
 * Execute a function with rate limiting and automatic retries
 * 
 * @param service - The service name to use rate limiting configuration for
 * @param fn - The function to execute
 * @param args - Arguments to pass to the function
 * @returns The result of the function
 */
export async function executeWithRateLimit<T>(
  service: string,
  fn: (...args: any[]) => Promise<T>,
  ...args: any[]
): Promise<T> {
  const limiter = getRateLimiter(service);
  const config = serviceConfigs[service] || serviceConfigs.default;
  
  return limiter.schedule(() => {
    return pRetry(
      async () => {
        try {
          return await fn(...args);
        } catch (error: any) {
          // Check if error is transient (e.g. rate limit, server error)
          if (error.code === 429 || error.code >= 500) {
            console.log(`Rate limit or server error (${error.code}), retrying...`);
            throw error; // This will trigger a retry
          }
          
          // For non-transient errors, don't retry
          throw new pRetry.AbortError(error);
        }
      },
      {
        retries: config.maxRetries,
        onFailedAttempt: error => {
          console.error(
            `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
            error.message
          );
        }
      }
    );
  });
}

/**
 * Delay execution for a specified time
 * 
 * @param ms - Milliseconds to delay
 * @returns A promise that resolves after the delay
 */
export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Execute a function with automatic retries and exponential backoff
 * 
 * @param fn - The function to execute
 * @param options - Retry options
 * @returns The result of the function
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: { retries?: number; initialDelay?: number } = {}
): Promise<T> {
  const { retries = 3, initialDelay = 1000 } = options;
  
  return pRetry(
    async () => {
      try {
        return await fn();
      } catch (error: any) {
        // Check if error is retryable
        if (error.code === 429 || error.code >= 500 || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
          console.log(`Retryable error (${error.code}), retrying...`);
          throw error; // This will trigger a retry
        }
        
        // For non-retryable errors, don't retry
        throw new pRetry.AbortError(error);
      }
    },
    {
      retries,
      factor: 2,
      minTimeout: initialDelay,
      onFailedAttempt: error => {
        console.error(
          `Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`,
          error.message
        );
      }
    }
  );
}