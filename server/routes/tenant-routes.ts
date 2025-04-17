import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { tenantService } from '../tenant-service';
import { authenticateToken, authorizeRoles } from '../auth';
import { 
  insertTenantSchema,
  updateTenantSchema,
  insertTenantFeatureFlagSchema
} from '../../shared/tenant-schema';

export function registerTenantRoutes(app: Express) {
  // Get all tenants (admin only)
  app.get('/api/v1/tenants', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const { page, limit, search, status, tier } = req.query;
      
      const queryParams = {
        page: page ? parseInt(page.toString(), 10) : undefined,
        limit: limit ? parseInt(limit.toString(), 10) : undefined,
        search: search?.toString() || '',
        status: status?.toString() || '',
        tier: tier?.toString() || ''
      };
      
      const tenants = await tenantService.listTenants(queryParams);
      res.json(tenants);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      res.status(500).json({ message: 'Error fetching tenants' });
    }
  });

  // Get a tenant by ID (admin only)
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
      console.error('Error fetching tenant:', error);
      res.status(500).json({ message: 'Error fetching tenant' });
    }
  });

  // Create a new tenant (admin only)
  app.post('/api/v1/tenants', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      // Validate the request body
      const validateResult = insertTenantSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ 
          message: 'Invalid tenant data', 
          errors: validateResult.error.errors 
        });
      }
      
      // Check if the subdomain is already in use
      const existingTenant = await tenantService.getTenantBySubdomain(req.body.subdomain);
      if (existingTenant) {
        return res.status(409).json({ message: 'Subdomain already in use' });
      }
      
      // Check if the custom domain is already in use (if provided)
      if (req.body.customDomain) {
        const existingDomainTenant = await tenantService.getTenantByCustomDomain(req.body.customDomain);
        if (existingDomainTenant) {
          return res.status(409).json({ message: 'Custom domain already in use' });
        }
      }
      
      // Create the tenant
      const newTenant = await tenantService.createTenant(validateResult.data);
      res.status(201).json(newTenant);
    } catch (error) {
      console.error('Error creating tenant:', error);
      res.status(500).json({ message: 'Error creating tenant' });
    }
  });

  // Update a tenant (admin only)
  app.patch('/api/v1/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Validate the request body
      const validateResult = updateTenantSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ 
          message: 'Invalid tenant data', 
          errors: validateResult.error.errors 
        });
      }
      
      // Check if the tenant exists
      const existingTenant = await tenantService.getTenantById(id);
      if (!existingTenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      // Check if subdomain is being changed and is already in use
      if (req.body.subdomain && req.body.subdomain !== existingTenant.subdomain) {
        const existingSubdomainTenant = await tenantService.getTenantBySubdomain(req.body.subdomain);
        if (existingSubdomainTenant && existingSubdomainTenant.id !== id) {
          return res.status(409).json({ message: 'Subdomain already in use' });
        }
      }
      
      // Check if custom domain is being changed and is already in use
      if (req.body.customDomain && req.body.customDomain !== existingTenant.customDomain) {
        const existingDomainTenant = await tenantService.getTenantByCustomDomain(req.body.customDomain);
        if (existingDomainTenant && existingDomainTenant.id !== id) {
          return res.status(409).json({ message: 'Custom domain already in use' });
        }
      }
      
      // Update the tenant
      const updatedTenant = await tenantService.updateTenant(id, validateResult.data);
      res.json(updatedTenant);
    } catch (error) {
      console.error('Error updating tenant:', error);
      res.status(500).json({ message: 'Error updating tenant' });
    }
  });

  // Delete a tenant (admin only)
  app.delete('/api/v1/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Check if the tenant exists
      const existingTenant = await tenantService.getTenantById(id);
      if (!existingTenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      // Delete the tenant
      const deleted = await tenantService.deleteTenant(id);
      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete tenant' });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error('Error deleting tenant:', error);
      res.status(500).json({ message: 'Error deleting tenant' });
    }
  });

  // Get tenant feature flags
  app.get('/api/v1/tenants/:id/feature-flags', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      // Check if the tenant exists
      const existingTenant = await tenantService.getTenantById(id);
      if (!existingTenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      // Get the feature flags
      const featureFlags = await tenantService.listTenantFeatureFlags(id);
      res.json(featureFlags);
    } catch (error) {
      console.error('Error fetching tenant feature flags:', error);
      res.status(500).json({ message: 'Error fetching tenant feature flags' });
    }
  });

  // Set a tenant feature flag
  app.put('/api/v1/tenants/:id/feature-flags/:key', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid tenant ID' });
      }
      
      const { key } = req.params;
      
      // Validate the request body
      const flagSchema = z.object({
        enabled: z.boolean(),
        settings: z.record(z.any()).optional()
      });
      
      const validateResult = flagSchema.safeParse(req.body);
      if (!validateResult.success) {
        return res.status(400).json({ 
          message: 'Invalid feature flag data', 
          errors: validateResult.error.errors 
        });
      }
      
      // Check if the tenant exists
      const existingTenant = await tenantService.getTenantById(id);
      if (!existingTenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }
      
      // Set the feature flag
      const { enabled, settings = {} } = validateResult.data;
      const featureFlag = await tenantService.setTenantFeatureFlag(id, key, enabled, settings);
      
      res.json(featureFlag);
    } catch (error) {
      console.error('Error setting tenant feature flag:', error);
      res.status(500).json({ message: 'Error setting tenant feature flag' });
    }
  });

  // Get current tenant info (for authenticated users)
  app.get('/api/v1/current-tenant', authenticateToken, async (req: Request, res: Response) => {
    try {
      // If tenant middleware is active, the tenant will be available in req.tenant
      if (req.tenant) {
        // Remove sensitive fields before sending to client
        const { rlsTenantId, schemaName, ...safeFields } = req.tenant;
        return res.json(safeFields);
      }
      
      // If we don't have a tenant in the request, return 404
      res.status(404).json({ message: 'No tenant context available' });
    } catch (error) {
      console.error('Error fetching current tenant:', error);
      res.status(500).json({ message: 'Error fetching current tenant' });
    }
  });
}