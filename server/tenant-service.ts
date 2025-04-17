import { db } from './db';
import { tenants, TenantFeatureFlag, tenantFeatureFlags } from '../shared/tenant-schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * TenantService provides functionality for tenant management
 */
export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(data: {
    name: string;
    displayName: string;
    subdomain: string;
    customDomain?: string;
    tier?: string;
    schemaStrategy?: string;
    settings?: any;
    metadata?: any;
    branding?: any;
  }) {
    const {
      name,
      displayName,
      subdomain,
      customDomain,
      tier = 'standard',
      schemaStrategy = 'row_level_security',
      settings = {},
      metadata = {},
      branding = {}
    } = data;

    try {
      // Validate subdomain format
      if (!/^[a-z0-9-]+$/.test(subdomain)) {
        throw new Error('Subdomain can only contain lowercase letters, numbers, and hyphens');
      }

      // Check if subdomain or customDomain already exists
      const existingTenant = await db.select({ id: tenants.id })
        .from(tenants)
        .where(
          customDomain
            ? eq(tenants.subdomain, subdomain) || eq(tenants.customDomain, customDomain)
            : eq(tenants.subdomain, subdomain)
        )
        .limit(1);

      if (existingTenant.length > 0) {
        throw new Error('A tenant with this subdomain or custom domain already exists');
      }

      // Generate a unique RLS tenant ID
      const rlsTenantId = uuidv4();

      // Create schema name from subdomain for schema-per-tenant strategy
      const schemaName = schemaStrategy === 'schema_per_tenant'
        ? `tenant_${subdomain.replace(/-/g, '_')}`
        : null;

      // Insert the new tenant
      const [tenant] = await db.insert(tenants).values({
        name,
        displayName,
        subdomain,
        customDomain,
        status: 'active',
        tier: tier as any,
        schemaStrategy: schemaStrategy as any,
        schemaName,
        rlsTenantId,
        settings,
        metadata,
        branding,
      }).returning();

      // If using schema-per-tenant strategy, create the schema
      if (schemaStrategy === 'schema_per_tenant' && schemaName) {
        await db.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
        
        // Clone the table structure to the new schema
        // This is a simplified approach - a real implementation would need to handle
        // all tables, constraints, indexes, etc.
        await db.execute(`
          -- Clone basic table structure to the tenant schema
          CREATE TABLE ${schemaName}.users AS SELECT * FROM public.users WHERE 1=0;
          CREATE TABLE ${schemaName}.projects AS SELECT * FROM public.projects WHERE 1=0;
          CREATE TABLE ${schemaName}.teams AS SELECT * FROM public.teams WHERE 1=0;
          CREATE TABLE ${schemaName}.documents AS SELECT * FROM public.documents WHERE 1=0;
          CREATE TABLE ${schemaName}.tasks AS SELECT * FROM public.tasks WHERE 1=0;
          CREATE TABLE ${schemaName}.comments AS SELECT * FROM public.comments WHERE 1=0;
        `);
      }

      return tenant;
    } catch (error) {
      console.error('Error creating tenant:', error);
      throw error;
    }
  }

  /**
   * Get a tenant by ID
   */
  async getTenantById(id: number) {
    try {
      const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error getting tenant by ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get a tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string) {
    try {
      const result = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error getting tenant by subdomain ${subdomain}:`, error);
      throw error;
    }
  }

  /**
   * Get all tenants
   */
  async getAllTenants() {
    try {
      return await db.select().from(tenants).orderBy(tenants.name);
    } catch (error) {
      console.error('Error getting all tenants:', error);
      throw error;
    }
  }

  /**
   * Get a tenant by custom domain
   */
  async getTenantByCustomDomain(customDomain: string) {
    try {
      const result = await db.select().from(tenants).where(eq(tenants.customDomain, customDomain)).limit(1);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error(`Error getting tenant by custom domain ${customDomain}:`, error);
      throw error;
    }
  }

  /**
   * Update a tenant
   */
  async updateTenant(id: number, data: Partial<{
    name: string;
    displayName: string;
    subdomain: string;
    customDomain: string;
    status: string;
    tier: string;
    settings: any;
    metadata: any;
    branding: any;
  }>) {
    try {
      const [updatedTenant] = await db.update(tenants)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(tenants.id, id))
        .returning();
      
      return updatedTenant;
    } catch (error) {
      console.error(`Error updating tenant ${id}:`, error);
      throw error;
    }
  }

  /**
   * Set tenant feature flag
   */
  async setFeatureFlag(tenantId: number, featureKey: string, enabled: boolean, configuration: any = null) {
    try {
      // Check if the feature flag already exists
      const existingFlag = await db.select()
        .from(tenantFeatureFlags)
        .where(
          and(
            eq(tenantFeatureFlags.tenantId, tenantId),
            eq(tenantFeatureFlags.featureKey, featureKey)
          )
        )
        .limit(1);

      if (existingFlag.length > 0) {
        // Update existing flag
        const [updatedFlag] = await db.update(tenantFeatureFlags)
          .set({
            enabled,
            configuration,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(tenantFeatureFlags.tenantId, tenantId),
              eq(tenantFeatureFlags.featureKey, featureKey)
            )
          )
          .returning();
        
        return updatedFlag;
      } else {
        // Create new flag
        const [newFlag] = await db.insert(tenantFeatureFlags)
          .values({
            tenantId,
            featureKey,
            enabled,
            configuration
          })
          .returning();
        
        return newFlag;
      }
    } catch (error) {
      console.error(`Error setting feature flag for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get tenant feature flags
   */
  async getFeatureFlags(tenantId: number): Promise<TenantFeatureFlag[]> {
    try {
      return await db.select()
        .from(tenantFeatureFlags)
        .where(eq(tenantFeatureFlags.tenantId, tenantId));
    } catch (error) {
      console.error(`Error getting feature flags for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a feature is enabled for a tenant
   */
  async isFeatureEnabled(tenantId: number, featureKey: string): Promise<boolean> {
    try {
      const result = await db.select({ enabled: tenantFeatureFlags.enabled })
        .from(tenantFeatureFlags)
        .where(
          and(
            eq(tenantFeatureFlags.tenantId, tenantId),
            eq(tenantFeatureFlags.featureKey, featureKey)
          )
        )
        .limit(1);
      
      return result.length > 0 ? result[0].enabled : false;
    } catch (error) {
      console.error(`Error checking feature ${featureKey} for tenant ${tenantId}:`, error);
      return false;
    }
  }

  /**
   * Archive (soft-delete) a tenant
   */
  async archiveTenant(id: number) {
    try {
      const [archivedTenant] = await db.update(tenants)
        .set({
          status: 'archived',
          updatedAt: new Date()
        })
        .where(eq(tenants.id, id))
        .returning();
      
      return archivedTenant;
    } catch (error) {
      console.error(`Error archiving tenant ${id}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const tenantService = new TenantService();