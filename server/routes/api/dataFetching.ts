/**
 * Data Fetching API Routes
 * 
 * API routes for data fetching operations
 */

import express, { Router } from 'express';
import { DataFetchingController } from '../../controllers/dataFetchingController';
import { authenticateToken } from '../../auth';

// Create controller instance
const dataFetchingController = new DataFetchingController();

// Initialize controller
dataFetchingController.initialize().catch(error => {
  console.error('Error initializing data fetching controller:', error);
});

// Create router
const router: Router = express.Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Get connector status
 * 
 * GET /api/data-fetching/connectors/status
 */
router.get('/connectors/status', dataFetchingController.getConnectorStatus.bind(dataFetchingController));

/**
 * Save connector token
 * 
 * POST /api/data-fetching/connectors/token
 */
router.post('/connectors/token', dataFetchingController.saveToken.bind(dataFetchingController));

/**
 * Delete connector token
 * 
 * DELETE /api/data-fetching/connectors/token
 */
router.delete('/connectors/token', dataFetchingController.deleteToken.bind(dataFetchingController));

/**
 * Schedule a data fetching job
 * 
 * POST /api/data-fetching/jobs
 */
router.post('/jobs', dataFetchingController.scheduleJob.bind(dataFetchingController));

/**
 * Get all jobs for the current user
 * 
 * GET /api/data-fetching/jobs
 */
router.get('/jobs', dataFetchingController.getJobs.bind(dataFetchingController));

/**
 * Get a specific job
 * 
 * GET /api/data-fetching/jobs/:id
 */
router.get('/jobs/:id', dataFetchingController.getJob.bind(dataFetchingController));

/**
 * Cancel a job
 * 
 * DELETE /api/data-fetching/jobs/:id
 */
router.delete('/jobs/:id', dataFetchingController.cancelJob.bind(dataFetchingController));

/**
 * Run a job immediately
 * 
 * POST /api/data-fetching/jobs/:id/run
 */
router.post('/jobs/:id/run', dataFetchingController.runJob.bind(dataFetchingController));

/**
 * Set up full sync
 * 
 * POST /api/data-fetching/full-sync
 */
router.post('/full-sync', dataFetchingController.setupFullSync.bind(dataFetchingController));

/**
 * Get fetched data
 * 
 * GET /api/data-fetching/data
 */
router.get('/data', dataFetchingController.getData.bind(dataFetchingController));

/**
 * Get a specific data item
 * 
 * GET /api/data-fetching/data/:id
 */
router.get('/data/:id', dataFetchingController.getDataById.bind(dataFetchingController));

/**
 * Search fetched data
 * 
 * GET /api/data-fetching/data/search
 */
router.get('/data/search', dataFetchingController.searchData.bind(dataFetchingController));

/**
 * Delete a data item
 * 
 * DELETE /api/data-fetching/data/:id
 */
router.delete('/data/:id', dataFetchingController.deleteData.bind(dataFetchingController));

export default router;