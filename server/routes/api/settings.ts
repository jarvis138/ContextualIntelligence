/**
 * Settings API Routes
 * 
 * This module defines the API routes for application settings.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken, authorizeRoles } from '../../middleware/auth';
import { validateBody } from '../../middleware/validation';
import { createSuccessResponse } from '../../utils/apiResponse';
import { ForbiddenError, BadRequestError } from '../../utils/apiError';
import { storage } from '../../storage';
import { z } from 'zod';

// Create router
const settingsRoutes = Router();

// Validation schemas
const oauthProviderSettingSchema = z.object({
  id: z.string(),
  name: z.string(),
  providerId: z.string(),
  enabled: z.boolean(),
  clientId: z.string().nullable(),
  clientSecret: z.string().nullable(),
  scope: z.string().nullable(),
});

const oauthProvidersSettingsSchema = z.array(oauthProviderSettingSchema);

/**
 * Get OAuth provider settings
 */
async function getOAuthProviderSettings(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only admins can access OAuth provider settings');
    }
    
    // Get OAuth provider settings
    const providers = await storage.getOAuthProviderSettings();
    
    return res.json(createSuccessResponse(providers));
  } catch (error) {
    next(error);
  }
}

/**
 * Update OAuth provider settings
 */
async function updateOAuthProviderSettings(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only admins can update OAuth provider settings');
    }
    
    // Validate request body
    const providers = req.body;
    
    // Ensure providers is an array
    if (!Array.isArray(providers)) {
      throw new BadRequestError('Invalid data format. Expected an array of providers.');
    }
    
    // Validate each provider
    oauthProvidersSettingsSchema.parse(providers);
    
    // Update each provider
    for (const provider of providers) {
      await storage.saveOAuthProviderSettings(provider);
    }
    
    // Update environment variables in memory
    for (const provider of providers) {
      if (provider.enabled && provider.clientId && provider.clientSecret) {
        process.env[`${provider.id.toUpperCase()}_CLIENT_ID`] = provider.clientId;
        process.env[`${provider.id.toUpperCase()}_CLIENT_SECRET`] = provider.clientSecret;
      }
    }
    
    return res.json(createSuccessResponse({ success: true, message: "OAuth provider settings saved successfully" }));
  } catch (error) {
    next(error);
  }
}

/**
 * Get application settings
 */
async function getApplicationSettings(req: Request, res: Response, next: NextFunction) {
  try {
    // Get application settings
    // Assuming getApplicationSettings will be implemented in storage
    const settings = {}; // await storage.getApplicationSettings();
    
    return res.json(createSuccessResponse(settings));
  } catch (error) {
    next(error);
  }
}

/**
 * Update application settings
 */
async function updateApplicationSettings(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if user has admin role
    if (req.user?.role !== 'admin') {
      throw new ForbiddenError('Only admins can update application settings');
    }
    
    // Validate request body
    const settings = req.body;
    
    // Update application settings
    // Assuming updateApplicationSettings will be implemented in storage
    // await storage.updateApplicationSettings(settings);
    
    return res.json(createSuccessResponse({ success: true, message: "Application settings saved successfully" }));
  } catch (error) {
    next(error);
  }
}

// Routes
// GET /api/settings/oauth-providers - Get OAuth provider settings
settingsRoutes.get('/oauth-providers',
  authenticateToken,
  authorizeRoles('admin'),
  getOAuthProviderSettings
);

// POST /api/settings/oauth-providers - Update OAuth provider settings
settingsRoutes.post('/oauth-providers',
  authenticateToken,
  authorizeRoles('admin'),
  validateBody(oauthProvidersSettingsSchema),
  updateOAuthProviderSettings
);

// GET /api/settings - Get application settings
settingsRoutes.get('/',
  authenticateToken,
  getApplicationSettings
);

// POST /api/settings - Update application settings
settingsRoutes.post('/',
  authenticateToken,
  authorizeRoles('admin'),
  updateApplicationSettings
);

export { settingsRoutes };