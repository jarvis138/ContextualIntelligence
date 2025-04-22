import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MemoryStore from 'memorystore';
import passport from 'passport';
import { createClient } from 'redis';
import { logger } from './utils/logger';
import { configurePassport } from './config/passport';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';
import { samlRoutes } from './routes/saml.routes';
import { oauthRoutes } from './routes/oauth.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';
import { rateLimiter } from './middleware/rate-limiter';
import { config } from './config';

// Initialize Redis client for session storage in production
let redisClient;
let redisStore;

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

  // Use Redis for session storage in production
  const RedisStore = require('connect-redis').default;
  redisStore = new RedisStore({ client: redisClient });
} else {
  // Use memory store for development
  const MemoryStoreSession = MemoryStore(session);
  redisStore = new MemoryStoreSession({
    checkPeriod: 86400000 // prune expired entries every 24h
  });
}

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(config.session.secret));
app.use(requestLogger);
app.use(rateLimiter);

// Configure session
app.use(session({
  store: redisStore,
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: config.session.maxAge,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());
configurePassport();

// Register routes
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/saml', samlRoutes);
app.use('/oauth', oauthRoutes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (redisClient) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

export default app;