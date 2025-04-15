/**
 * API Router
 * 
 * This module serves as the main entry point for all API routes.
 * It organizes routes by resource and version.
 */

import { Router } from 'express';
import { userRoutes } from './users';
import { projectRoutes } from './projects';
import { documentRoutes } from './documents';
import { taskRoutes } from './tasks';
import { teamRoutes } from './teams';
import { settingsRoutes } from './settings';
import { errorHandler } from '../../middleware/errorHandler';

// Create API router
const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Mount resource routes
apiRouter.use('/users', userRoutes);
apiRouter.use('/projects', projectRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/tasks', taskRoutes);
apiRouter.use('/teams', teamRoutes);
apiRouter.use('/settings', settingsRoutes);

// Apply error handler to all API routes
apiRouter.use(errorHandler);

export { apiRouter };