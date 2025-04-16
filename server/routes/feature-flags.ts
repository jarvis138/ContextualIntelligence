/**
 * Feature Flags Routes
 * 
 * API routes for retrieving and managing feature flags
 */

import { Router } from 'express';
import { featureFlagService } from '../../shared/feature-flags';
import { logger } from '../services/observability';

const featureFlagsRouter = Router();
const flagsLogger = logger.createChildLogger({ component: 'FeatureFlagsAPI' });

/**
 * GET /api/feature-flags
 * Get all feature flags (for current user)
 */
featureFlagsRouter.get('/', (req, res) => {
  // In a real implementation, we would filter based on user permissions
  // and only return flags applicable to the current user
  const flags = featureFlagService.getAllFlags();
  
  flagsLogger.info('Feature flags retrieved', { userId: req.user?.id });
  
  res.json(flags);
});

/**
 * GET /api/feature-flags/:name
 * Get a specific feature flag
 */
featureFlagsRouter.get('/:name', (req, res) => {
  const { name } = req.params;
  const flag = featureFlagService.getFlag(name);
  
  if (!flag) {
    return res.status(404).json({
      message: `Feature flag '${name}' not found`
    });
  }
  
  flagsLogger.info(`Feature flag '${name}' retrieved`, { userId: req.user?.id });
  
  res.json(flag);
});

/**
 * PUT /api/feature-flags/:name
 * Update a feature flag (admin only)
 */
featureFlagsRouter.put('/:name', (req, res) => {
  // In a real implementation, check if the user is an admin
  // if (!req.user || req.user.role !== 'admin') {
  //   return res.status(403).json({
  //     message: 'Only administrators can update feature flags'
  //   });
  // }
  
  const { name } = req.params;
  
  try {
    const updatedFlag = featureFlagService.updateFlag(name, req.body);
    
    flagsLogger.info(`Feature flag '${name}' updated`, {
      userId: req.user?.id,
      updates: req.body
    });
    
    res.json(updatedFlag);
  } catch (error: any) {
    res.status(404).json({
      message: error.message
    });
  }
});

export default featureFlagsRouter;