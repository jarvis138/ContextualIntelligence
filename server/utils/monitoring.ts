/**
 * Monitoring Utility
 * 
 * Provides functions for monitoring application performance and health in production.
 */
import os from 'os';
import { performance } from 'perf_hooks';
import logger from './logger';
import { pool } from '../db';

// Metrics storage
const metrics = {
  requestCount: 0,
  errorCount: 0,
  requestDurations: [] as number[],
  lastChecked: Date.now(),
  startTime: Date.now(),
};

// Health check state
let isHealthy = true;
let lastHealthCheckError: string | null = null;

/**
 * Measure request duration and track metrics
 */
export const requestTracker = {
  start: (): number => {
    metrics.requestCount++;
    return performance.now();
  },
  
  end: (startTime: number, error?: Error): void => {
    const duration = performance.now() - startTime;
    metrics.requestDurations.push(duration);
    
    // Keep only the last 100 request durations
    if (metrics.requestDurations.length > 100) {
      metrics.requestDurations.shift();
    }
    
    if (error) {
      metrics.errorCount++;
      logger.error(`Request error: ${error.message}`, { stack: error.stack });
    }
  },
};

/**
 * Perform a health check of critical system components
 */
export async function performHealthCheck(): Promise<boolean> {
  try {
    // Check database connection
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
    } finally {
      client.release();
    }
    
    // System check passed
    isHealthy = true;
    lastHealthCheckError = null;
    return true;
  } catch (error) {
    isHealthy = false;
    lastHealthCheckError = error instanceof Error ? error.message : String(error);
    logger.error(`Health check failed: ${lastHealthCheckError}`);
    return false;
  }
}

/**
 * Get system information
 */
export function getSystemInfo(): Record<string, any> {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024)),
    freeMemory: Math.round(os.freemem() / (1024 * 1024)),
    uptime: Math.round(process.uptime()),
    processMemoryUsage: process.memoryUsage(),
  };
}

/**
 * Calculate average response time
 */
function calculateAverageResponseTime(): number {
  if (metrics.requestDurations.length === 0) return 0;
  const sum = metrics.requestDurations.reduce((a, b) => a + b, 0);
  return Math.round(sum / metrics.requestDurations.length);
}

/**
 * Get application metrics
 */
export function getMetrics(): Record<string, any> {
  const now = Date.now();
  const timeRange = (now - metrics.lastChecked) / 1000; // in seconds
  const requestsPerSecond = timeRange > 0 ? metrics.requestCount / timeRange : 0;
  
  // Reset counters
  metrics.requestCount = 0;
  metrics.lastChecked = now;
  
  return {
    isHealthy,
    uptime: Math.round((now - metrics.startTime) / 1000), // in seconds
    averageResponseTime: calculateAverageResponseTime(),
    requestsPerSecond: requestsPerSecond.toFixed(2),
    errorCount: metrics.errorCount,
    lastHealthCheckError,
    system: getSystemInfo(),
  };
}

/**
 * Health check middleware
 */
export const healthCheckMiddleware = async (req: any, res: any, next: any) => {
  if (req.path === '/api/health') {
    const isHealthy = await performHealthCheck();
    const metrics = getMetrics();
    
    if (isHealthy) {
      return res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        ...metrics,
      });
    } else {
      return res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        message: lastHealthCheckError || 'Health check failed',
        ...metrics,
      });
    }
  }
  
  next();
};

// Perform an initial health check
performHealthCheck().catch(err => {
  logger.error('Initial health check failed', { error: err.message });
});