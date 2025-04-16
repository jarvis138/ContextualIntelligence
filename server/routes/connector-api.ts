/**
 * Connector API Routes
 * 
 * These routes handle interactions with data connectors for external services
 * like Slack, Google Drive, Gmail, and Microsoft 365.
 */

import express, { Request, Response, NextFunction } from "express";
import { connectorService } from "../services/connectors";
import { logger } from "../services/observability";
import { 
  insertApiTokenSchema, 
  insertFetchingJobSchema,
  connectorTypeEnum
} from "@shared/schema";

// Create router
const router = express.Router();

// Auth middleware to ensure a user is logged in
const ensureAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
};

// Get available connector types
router.get("/types", ensureAuthenticated, (req, res) => {
  try {
    // Return the connector types from the enum
    const types = Object.values(connectorTypeEnum.enumValues);
    
    res.json({
      types: types.map(type => ({
        id: type,
        name: formatConnectorName(type),
        icon: getConnectorIcon(type),
        description: getConnectorDescription(type)
      }))
    });
  } catch (error) {
    logger.error('Error getting connector types', { error });
    res.status(500).json({ error: 'Failed to get connector types' });
  }
});

// Test a connector connection
router.post("/test", ensureAuthenticated, async (req, res) => {
  try {
    const { type } = req.body;
    
    if (!type || !connectorTypeEnum.enumValues.includes(type)) {
      return res.status(400).json({ error: 'Invalid connector type' });
    }
    
    const result = await connectorService.executeConnector(
      type, 
      'testConnection', 
      { userId: req.user.id }
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error testing connector', { error });
    res.status(500).json({ error: 'Failed to test connector connection' });
  }
});

// Store API token for a connector
router.post("/token", ensureAuthenticated, async (req, res) => {
  try {
    // Validate request body
    const tokenData = insertApiTokenSchema.safeParse({
      ...req.body,
      userId: req.user.id
    });
    
    if (!tokenData.success) {
      return res.status(400).json({ error: 'Invalid token data', details: tokenData.error.format() });
    }
    
    const tokenId = await connectorService.storeApiToken(tokenData.data);
    
    res.json({ success: true, tokenId });
  } catch (error) {
    logger.error('Error storing API token', { error });
    res.status(500).json({ error: 'Failed to store API token' });
  }
});

// Get user's active connectors
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    // Get user tokens
    const tokens = await connectorService.getApiTokensByUser(req.user.id);
    
    res.json({
      connectors: tokens.map(token => ({
        id: token.id,
        type: token.connectorType,
        name: formatConnectorName(token.connectorType),
        icon: getConnectorIcon(token.connectorType),
        expiresAt: token.expiresAt
      }))
    });
  } catch (error) {
    logger.error('Error getting user connectors', { error });
    res.status(500).json({ error: 'Failed to get user connectors' });
  }
});

// Create a data fetching job
router.post("/jobs", ensureAuthenticated, async (req, res) => {
  try {
    // Validate request body
    const jobData = insertFetchingJobSchema.safeParse({
      ...req.body,
      userId: req.user.id
    });
    
    if (!jobData.success) {
      return res.status(400).json({ error: 'Invalid job data', details: jobData.error.format() });
    }
    
    const jobId = await connectorService.createFetchingJob(jobData.data);
    
    res.json({ success: true, jobId });
  } catch (error) {
    logger.error('Error creating fetching job', { error });
    res.status(500).json({ error: 'Failed to create fetching job' });
  }
});

// Get user's fetching jobs
router.get("/jobs", ensureAuthenticated, async (req, res) => {
  try {
    const jobs = await connectorService.getFetchingJobsByUser(req.user.id);
    
    res.json({ jobs });
  } catch (error) {
    logger.error('Error getting user jobs', { error });
    res.status(500).json({ error: 'Failed to get user jobs' });
  }
});

// Get user's fetched data
router.get("/data", ensureAuthenticated, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await connectorService.getRecentUserData(req.user.id, limit);
    
    res.json({ data });
  } catch (error) {
    logger.error('Error getting user data', { error });
    res.status(500).json({ error: 'Failed to get user data' });
  }
});

// Execute connector operation
router.post("/execute/:type/:operation", ensureAuthenticated, async (req, res) => {
  try {
    const { type, operation } = req.params;
    
    if (!type || !connectorTypeEnum.enumValues.includes(type)) {
      return res.status(400).json({ error: 'Invalid connector type' });
    }
    
    // Add the user ID to the parameters
    const params = {
      ...req.body,
      userId: req.user.id
    };
    
    const result = await connectorService.executeConnector(type, operation, params);
    
    res.json(result);
  } catch (error) {
    logger.error('Error executing connector operation', { error });
    res.status(500).json({ error: 'Failed to execute connector operation' });
  }
});

// Helper functions
function formatConnectorName(type: string): string {
  switch (type) {
    case 'google_drive':
      return 'Google Drive';
    case 'gmail':
      return 'Gmail';
    case 'microsoft_graph':
      return 'Microsoft 365';
    case 'slack':
      return 'Slack';
    default:
      return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }
}

function getConnectorIcon(type: string): string {
  switch (type) {
    case 'google_drive':
      return 'drive';
    case 'gmail':
      return 'mail';
    case 'microsoft_graph':
      return 'microsoft';
    case 'slack':
      return 'slack';
    default:
      return 'folder';
  }
}

function getConnectorDescription(type: string): string {
  switch (type) {
    case 'google_drive':
      return 'Connect to Google Drive to fetch documents, spreadsheets, and other files';
    case 'gmail':
      return 'Connect to Gmail to fetch emails and attachments';
    case 'microsoft_graph':
      return 'Connect to Microsoft 365 to fetch emails, files, and calendar events';
    case 'slack':
      return 'Connect to Slack to fetch messages, channels, and files';
    default:
      return 'Connect to external service';
  }
}

export const connectorApiRouter = router;