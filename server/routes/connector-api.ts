/**
 * Connector API Routes
 * 
 * These routes handle interactions with data connectors for external services
 * like Slack, Google Drive, Gmail, and Microsoft 365.
 */

import express, { Request, Response, NextFunction } from "express";
import { connectorService } from "../services/connectors";
import { logger } from "../services/observability";
import crypto from "crypto";
import { TokenStorage } from "../services/tokenStorage";
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

// Generate authorization URL for OAuth flow
router.post("/auth-url", ensureAuthenticated, async (req, res) => {
  try {
    const { connectorType, name } = req.body;
    
    if (!connectorType || !connectorTypeEnum.enumValues.includes(connectorType)) {
      return res.status(400).json({ error: 'Invalid connector type' });
    }
    
    // Generate a state parameter for OAuth security
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store the state in the session for verification when callback occurs
    req.session.oauthState = state;
    req.session.connectorType = connectorType;
    req.session.connectorName = name;
    
    // Call the appropriate connector to get authorization URL
    const result = await connectorService.executeConnector(
      connectorType,
      'getAuthorizationUrl',
      { 
        userId: req.user.id,
        state,
        callbackUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/connectors/callback/${connectorType}`
      }
    );
    
    res.json(result);
  } catch (error) {
    logger.error('Error generating auth URL', { error });
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// Handle OAuth callback from external service
router.get("/callback/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const { code, state } = req.query;
    
    // Validate state parameter to prevent CSRF attacks
    if (!req.session.oauthState || req.session.oauthState !== state) {
      return res.status(400).send(
        '<html><body><h3>Authentication failed: Invalid state parameter</h3><p>Please close this window and try again.</p></body></html>'
      );
    }
    
    if (!req.session.connectorType || req.session.connectorType !== type) {
      return res.status(400).send(
        '<html><body><h3>Authentication failed: Connector type mismatch</h3><p>Please close this window and try again.</p></body></html>'
      );
    }
    
    if (!req.user || !req.user.id) {
      return res.status(401).send(
        '<html><body><h3>Authentication failed: User not authenticated</h3><p>Please log in and try again.</p></body></html>'
      );
    }
    
    // Exchange the authorization code for tokens
    const result = await connectorService.executeConnector(
      type,
      'handleAuthCallback',
      { 
        userId: req.user.id,
        code,
        state,
        connectorName: req.session.connectorName
      }
    );
    
    if (result.success) {
      // Clear the state from session
      delete req.session.oauthState;
      delete req.session.connectorType;
      delete req.session.connectorName;
      
      // Return success page that will trigger the parent window to update
      res.send(`
        <html>
          <body>
            <h3>Authentication successful!</h3>
            <p>You can close this window and return to the application.</p>
            <script>
              window.opener && window.opener.postMessage({ type: 'oauth-success', connectorType: '${type}' }, '*');
              setTimeout(() => window.close(), 2000);
            </script>
          </body>
        </html>
      `);
    } else {
      res.status(400).send(
        '<html><body><h3>Authentication failed</h3><p>Please close this window and try again.</p></body></html>'
      );
    }
  } catch (error) {
    logger.error('Error handling OAuth callback', { error });
    res.status(500).send(
      '<html><body><h3>Authentication failed</h3><p>An error occurred during authentication. Please close this window and try again.</p></body></html>'
    );
  }
});

// Check if a recent token was added (used for polling after OAuth)
router.get("/check-auth", ensureAuthenticated, async (req, res) => {
  try {
    // Simple check if a token was recently added in the last minute
    const userId = req.user.id;
    const tokens = await connectorService.getApiTokensByUser(userId);
    
    // Find a token created in the last minute
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    const recentToken = tokens.find(token => 
      token.createdAt && new Date(token.createdAt) > oneMinuteAgo
    );
    
    res.json({ success: !!recentToken });
  } catch (error) {
    logger.error('Error checking for recent auth', { error });
    res.status(500).json({ error: 'Failed to check authentication status' });
  }
});

// Handle direct credential input
router.post("/direct-auth", ensureAuthenticated, async (req, res) => {
  try {
    const { 
      connectorType, 
      name, 
      username, 
      password, 
      email, 
      workspaceUrl, 
      tokenName,
      rememberMe 
    } = req.body;
    
    if (!connectorType || !connectorTypeEnum.enumValues.includes(connectorType)) {
      return res.status(400).json({ error: 'Invalid connector type' });
    }
    
    if (!username || !password || !tokenName) {
      return res.status(400).json({ error: 'Missing required credentials' });
    }
    
    // Additional validation for specific connector types
    if (connectorType === 'slack' && !workspaceUrl) {
      return res.status(400).json({ error: 'Workspace URL is required for Slack' });
    }
    
    if ((connectorType === 'google_drive' || connectorType === 'gmail') && !email) {
      return res.status(400).json({ error: 'Email is required for Google services' });
    }
    
    // Call the connector service to authenticate with direct credentials
    const result = await connectorService.executeConnector(
      connectorType,
      'authenticateWithCredentials',
      { 
        userId: req.user.id,
        username,
        password,
        email,
        workspaceUrl,
        tokenName,
        connectorName: name,
        rememberMe
      }
    );
    
    if (result.success) {
      res.json({ success: true, tokenId: result.tokenId });
    } else {
      res.status(401).json({ error: result.error || 'Authentication failed' });
    }
  } catch (error) {
    logger.error('Error with direct authentication', { error });
    res.status(500).json({ error: 'Failed to authenticate with credentials' });
  }
});

// Revoke a connector token
router.delete("/tokens/:id", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const tokenId = parseInt(id);
    
    if (isNaN(tokenId)) {
      return res.status(400).json({ error: 'Invalid token ID' });
    }
    
    // Call the connector service to revoke the token
    const result = await connectorService.revokeToken(tokenId, req.user.id);
    
    res.json({ success: result });
  } catch (error) {
    logger.error('Error revoking token', { error });
    res.status(500).json({ error: 'Failed to revoke token' });
  }
});

export const connectorApiRouter = router;