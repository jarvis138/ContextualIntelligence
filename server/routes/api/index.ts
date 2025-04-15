/**
 * API Router
 * 
 * This module serves as the main entry point for all API routes.
 * It organizes routes by resource and version.
 */

import { Router } from 'express';

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
// These will be implemented in their respective files
// apiRouter.use('/users', userRoutes);
// apiRouter.use('/projects', projectRoutes);
// apiRouter.use('/documents', documentRoutes);
// apiRouter.use('/tasks', taskRoutes);
// apiRouter.use('/teams', teamRoutes);
// apiRouter.use('/settings', settingsRoutes);

export { apiRouter };