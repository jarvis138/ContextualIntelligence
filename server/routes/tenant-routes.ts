import { Express, Request, Response } from 'express';
import { tenantService } from '../tenant-service';
import { authenticateToken, authorizeRoles } from '../auth';
import { z } from 'zod';
import { insertTenantSchema, insertTenantFeatureFlagSchema } from '../../shared/tenant-schema';

/**
 * Register tenant management routes
 * @param app Express application
 */
export function registerTenantRoutes(app: Express) {
  /**
   * Create a new tenant
   * Requires admin role
   */
  app.post('/api/v1/tenants', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = insertTenantSchema.parse(req.body);
      
      // Create the tenant
      const tenant = await tenantService.createTenant(validatedData);
      
      res.status(201).json({ 
        message: 'Tenant created successfully',
        tenant
      });
    } catch (error) {
      console.error('Error creating tenant:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }
      
      if (error instanceof Error) {
        return res.status(400).json({
          message: error.message
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to create tenant',
        error: String(error)
      });
    }
  });

  /**
   * Get all tenants
   * Requires admin role
   */
  app.get('/api/v1/tenants', authenticateToken, authorizeRoles('admin'), async (_req: Request, res: Response) => {
    try {
      const tenants = await tenantService.getAllTenants();
      res.json(tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ 
        message: 'Failed to fetch tenants',
        error: String(error)
      });
    }
  });

  /**
   * Get a tenant by ID
   * Requires admin role
   */
  app.get('/api/v1/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      const tenant = await tenantService.getTenantById(id);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      res.json(tenant);
    } catch (error) {
      console.error(`Error fetching tenant ${req.params.id}:`, error);
      res.status(500).json({ 
        message: 'Failed to fetch tenant',
        error: String(error)
      });
    }
  });

  /**
   * Update a tenant
   * Requires admin role
   */
  app.patch('/api/v1/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Validate request body (partial schema validation)
      const validatedData = insertTenantSchema.partial().parse(req.body);
      
      // Update the tenant
      const tenant = await tenantService.updateTenant(id, validatedData);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      res.json({ 
        message: 'Tenant updated successfully',
        tenant
      });
    } catch (error) {
      console.error(`Error updating tenant ${req.params.id}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to update tenant',
        error: String(error)
      });
    }
  });

  /**
   * Archive (soft-delete) a tenant
   * Requires admin role
   */
  app.delete('/api/v1/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Archive the tenant
      const tenant = await tenantService.archiveTenant(id);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      res.json({ 
        message: 'Tenant archived successfully',
        tenant
      });
    } catch (error) {
      console.error(`Error archiving tenant ${req.params.id}:`, error);
      res.status(500).json({ 
        message: 'Failed to archive tenant',
        error: String(error)
      });
    }
  });

  /**
   * Set tenant feature flag
   * Requires admin role
   */
  app.post('/api/v1/tenants/:tenantId/features/:featureKey', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId, 10);
      const { featureKey } = req.params;
      
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Validate request body
      const validatedData = insertTenantFeatureFlagSchema.omit({ tenantId: true, featureKey: true }).parse(req.body);
      
      // Set the feature flag
      const featureFlag = await tenantService.setFeatureFlag(
        tenantId,
        featureKey,
        validatedData.enabled,
        validatedData.configuration
      );
      
      res.json({ 
        message: 'Feature flag set successfully',
        featureFlag
      });
    } catch (error) {
      console.error(`Error setting feature flag for tenant ${req.params.tenantId}:`, error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation error',
          errors: error.errors
        });
      }
      
      res.status(500).json({ 
        message: 'Failed to set feature flag',
        error: String(error)
      });
    }
  });

  /**
   * Get tenant feature flags
   * Requires admin role
   */
  app.get('/api/v1/tenants/:tenantId/features', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.params.tenantId, 10);
      
      if (isNaN(tenantId)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Get the feature flags
      const featureFlags = await tenantService.getFeatureFlags(tenantId);
      
      res.json(featureFlags);
    } catch (error) {
      console.error(`Error getting feature flags for tenant ${req.params.tenantId}:`, error);
      res.status(500).json({ 
        message: 'Failed to get feature flags',
        error: String(error)
      });
    }
  });
}