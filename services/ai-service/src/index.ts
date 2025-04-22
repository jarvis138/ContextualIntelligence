import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import { logger } from './utils/logger';
import { config } from './config';
import { aiRoutes } from './routes/ai.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limiter';
import { authMiddleware } from './middleware/auth-middleware';
import { tenantMiddleware } from './middleware/tenant-middleware';
import { setupMessageQueue } from './services/message-queue';

// Initialize Redis client for caching
let redisClient;

if (process.env.NODE_ENV === 'production') {
  redisClient = createClient({
    url: config.redis.url,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
    }
  });

  redisClient.on('error', (err) => {
    logger.error('Redis client error', { error: err.message });
  });

  redisClient.on('connect', () => {
    logger.info('Connected to Redis');
  });

  redisClient.connect().catch((err) => {
    logger.error('Failed to connect to Redis', { error: err.message });
  });
}

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(requestLogger);
app.use(rateLimiter);

// Authentication and tenant middleware
app.use(authMiddleware);
app.use(tenantMiddleware);

// Register routes
app.use('/health', healthRoutes);
app.use('/ai', aiRoutes);

// Error handling
app.use(errorHandler);

// Initialize services
(async () => {
  try {
    // Setup message queue
    await setupMessageQueue();
    
    // Start server
    const PORT = config.server.port;
    app.listen(PORT, () => {
      logger.info(`AI service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to initialize services', { error });
    process.exit(1);
  }
})();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

export default app;