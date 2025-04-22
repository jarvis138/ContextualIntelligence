import { Router } from 'express';
import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../db';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.env,
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' }
    }
  };

  // Check database connection
  try {
    await db.execute('SELECT 1');
    health.checks.database = { status: 'ok' };
  } catch (error) {
    health.checks.database = { 
      status: 'error',
      message: (error as Error).message
    };
    health.status = 'degraded';
    logger.error('Database health check failed', { error });
  }

  // Check Redis connection if in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const redisClient = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 1000,
          reconnectStrategy: false
        }
      });
      
      await redisClient.connect();
      await redisClient.ping();
      await redisClient.quit();
      
      health.checks.redis = { status: 'ok' };
    } catch (error) {
      health.checks.redis = { 
        status: 'error',
        message: (error as Error).message
      };
      health.status = 'degraded';
      logger.error('Redis health check failed', { error });
    }
  } else {
    health.checks.redis = { status: 'skipped', message: 'Not in production mode' };
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
});

// Kubernetes liveness probe
router.get('/liveness', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Kubernetes readiness probe
router.get('/readiness', async (req, res) => {
  try {
    // Check database connection
    await db.execute('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({ 
      status: 'error',
      message: 'Service not ready'
    });
  }
});

export { router as healthRoutes };import { Router } from 'express';
import { createClient } from 'redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { db } from '../db';

const router = Router();

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString()
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.env,
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' }
    }
  };

  // Check database connection
  try {
    await db.execute('SELECT 1');
    health.checks.database = { status: 'ok' };
  } catch (error) {
    health.checks.database = { 
      status: 'error',
      message: (error as Error).message
    };
    health.status = 'degraded';
    logger.error('Database health check failed', { error });
  }

  // Check Redis connection if in production
  if (process.env.NODE_ENV === 'production') {
    try {
      const redisClient = createClient({
        url: config.redis.url,
        socket: {
          connectTimeout: 1000,
          reconnectStrategy: false
        }
      });
      
      await redisClient.connect();
      await redisClient.ping();
      await redisClient.quit();
      
      health.checks.redis = { status: 'ok' };
    } catch (error) {
      health.checks.redis = { 
        status: 'error',
        message: (error as Error).message
      };
      health.status = 'degraded';
      logger.error('Redis health check failed', { error });
    }
  } else {
    health.checks.redis = { status: 'skipped', message: 'Not in production mode' };
  }

  // Return appropriate status code
  const statusCode = health.status === 'ok' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json(health);
});

// Kubernetes liveness probe
router.get('/liveness', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Kubernetes readiness probe
router.get('/readiness', async (req, res) => {
  try {
    // Check database connection
    await db.execute('SELECT 1');
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({ 
      status: 'error',
      message: 'Service not ready'
    });
  }
});

export { router as healthRoutes };