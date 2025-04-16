/**
 * API Router
 * 
 * Central router for all API routes in the application.
 * Modular design for easier maintenance and organization.
 */

import { Router } from 'express';
import featureFlagsRouter from './feature-flags';
import { connectorApiRouter } from './connector-api';
import aiApiRouter from './ai-api';
import { logger } from '../services/observability';

// Create the main API router
export const apiRouter = Router();
const apiLogger = logger.createChildLogger({ component: 'APIRouter' });

// Register routes
apiRouter.use('/feature-flags', featureFlagsRouter);
apiRouter.use('/connectors', connectorApiRouter);

// Add version information endpoint
apiRouter.get('/version', (req, res) => {
  res.json({
    name: 'CPI Hub API',
    version: '0.1.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint (different from the one in observability)
apiRouter.get('/status', (req, res) => {
  res.json({
    status: 'up',
    timestamp: new Date().toISOString()
  });
});

apiLogger.info('API router initialized with all routes');