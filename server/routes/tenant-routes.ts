import { Router, Request, Response, Express } from 'express';
import { tenantService } from '../tenant-service';
import { insertTenantSchema, insertTenantFeatureFlagSchema } from '../../shared/tenant-schema';
import { authenticateToken, authorizeRoles } from '../auth';

const router = Router();

/**
 * Register tenant routes with the Express application
 * 
 * @param app Express application
 */
export function registerTenantRoutes(app: Express) {
  app.use('/api/v1', router);
}

/**
 * Get all tenants
 * Requires admin role
 */
router.get('/tenants', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const tenants = await tenantService.getAllTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching tenants:', error);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

/**
 * Get active tenants
 * Requires admin role
 */
router.get('/tenants/active', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const tenants = await tenantService.getActiveTenants();
    res.json(tenants);
  } catch (error) {
    console.error('Error fetching active tenants:', error);
    res.status(500).json({ error: 'Failed to fetch active tenants' });
  }
});

/**
 * Get a tenant by ID
 * Requires admin role
 */
router.get('/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const tenant = await tenantService.getTenantById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(tenant);
  } catch (error) {
    console.error(`Error fetching tenant ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

/**
 * Create a new tenant
 * Requires admin role
 */
router.post('/tenants', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = insertTenantSchema.parse(req.body);
    
    // Check if subdomain is already taken
    const existingTenant = await tenantService.getTenantBySubdomain(validatedData.subdomain);
    if (existingTenant) {
      return res.status(409).json({ error: 'Subdomain is already in use' });
    }
    
    // Check if custom domain is already taken (if provided)
    if (validatedData.customDomain) {
      const domainTenant = await tenantService.getTenantByCustomDomain(validatedData.customDomain);
      if (domainTenant) {
        return res.status(409).json({ error: 'Custom domain is already in use' });
      }
    }
    
    // Create tenant
    const tenant = await tenantService.createTenant(validatedData);
    res.status(201).json(tenant);
  } catch (error) {
    console.error('Error creating tenant:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid tenant data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

/**
 * Update a tenant
 * Requires admin role
 */
router.patch('/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }
    
    // Check if tenant exists
    const existingTenant = await tenantService.getTenantById(id);
    if (!existingTenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    // If custom domain is provided, check if it's already in use by another tenant
    if (req.body.customDomain && req.body.customDomain !== existingTenant.customDomain) {
      const domainTenant = await tenantService.getTenantByCustomDomain(req.body.customDomain);
      if (domainTenant && domainTenant.id !== id) {
        return res.status(409).json({ error: 'Custom domain is already in use' });
      }
    }
    
    // Update tenant
    const updatedTenant = await tenantService.updateTenant(id, req.body);
    res.json(updatedTenant);
  } catch (error) {
    console.error(`Error updating tenant ${req.params.id}:`, error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid tenant data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

/**
 * Archive a tenant (soft delete)
 * Requires admin role
 */
router.delete('/tenants/:id', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }
    
    // Archive the tenant
    const tenant = await tenantService.archiveTenant(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json({ message: 'Tenant archived successfully', tenant });
  } catch (error) {
    console.error(`Error archiving tenant ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to archive tenant' });
  }
});

/**
 * Get tenant feature flags
 * Requires admin role
 */
router.get('/tenants/:id/feature-flags', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }
    
    // Check if tenant exists
    const tenant = await tenantService.getTenantById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    const featureFlags = await tenantService.getTenantFeatureFlags(id);
    res.json(featureFlags);
  } catch (error) {
    console.error(`Error fetching feature flags for tenant ${req.params.id}:`, error);
    res.status(500).json({ error: 'Failed to fetch feature flags' });
  }
});

/**
 * Set a tenant feature flag
 * Requires admin role
 */
router.post('/tenants/:id/feature-flags', authenticateToken, authorizeRoles('admin'), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }
    
    // Validate request body
    const validatedData = insertTenantFeatureFlagSchema.parse({
      ...req.body,
      tenantId: id
    });
    
    // Set the feature flag
    const featureFlag = await tenantService.setTenantFeatureFlag(
      id,
      validatedData.featureKey,
      validatedData.enabled,
      validatedData.configuration
    );
    
    if (!featureFlag) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.status(201).json(featureFlag);
  } catch (error) {
    console.error(`Error setting feature flag for tenant ${req.params.id}:`, error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Invalid feature flag data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to set feature flag' });
  }
});

export default router;