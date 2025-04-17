import { db } from './db';
import { 
  tenants, 
  tenantFeatureFlags, 
  insertTenantSchema, 
  insertTenantFeatureFlagSchema,
  Tenant,
  TenantFeatureFlag
} from '../shared/tenant-schema';
import { eq, and, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Tenant Service
 * 
 * Provides methods for managing tenants in the multi-tenant CPI Hub system.
 */
export const tenantService = {
  /**
   * Get all tenants
   * 
   * @returns Array of all tenant records
   */
  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants);
  },

  /**
   * Get active tenants (non-archived)
   * 
   * @returns Array of active tenant records
   */
  async getActiveTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).where(
      and(
        eq(tenants.status, 'active')
      )
    );
  },

  /**
   * Get a tenant by ID
   * 
   * @param id The tenant ID
   * @returns The tenant record or null if not found
   */
  async getTenantById(id: number): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0] || null;
  },

  /**
   * Get a tenant by subdomain
   * 
   * @param subdomain The tenant subdomain
   * @returns The tenant record or null if not found
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.subdomain, subdomain)).limit(1);
    return result[0] || null;
  },

  /**
   * Get a tenant by custom domain
   * 
   * @param domain The tenant custom domain
   * @returns The tenant record or null if not found
   */
  async getTenantByCustomDomain(domain: string): Promise<Tenant | null> {
    const result = await db.select().from(tenants).where(eq(tenants.customDomain, domain)).limit(1);
    return result[0] || null;
  },

  /**
   * Create a new tenant
   * 
   * @param data The tenant data to insert
   * @returns The created tenant record
   */
  async createTenant(data: any): Promise<Tenant> {
    // Parse and validate the input data
    const validatedData = insertTenantSchema.parse(data);
    
    // Generate schema name if using schema_per_tenant strategy
    let schemaName = null;
    if (validatedData.schemaStrategy === 'schema_per_tenant') {
      schemaName = `tenant_${validatedData.subdomain.replace(/-/g, '_')}_${Date.now().toString(36)}`;
    }
    
    // Generate a UUID for RLS tenant ID
    const rlsTenantId = uuidv4();
    
    // Insert the tenant record
    const result = await db.insert(tenants).values({
      ...validatedData,
      schemaName,
      rlsTenantId,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    // Create a new schema if using schema_per_tenant
    if (validatedData.schemaStrategy === 'schema_per_tenant' && schemaName) {
      await db.execute(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      
      // Create RLS function in this schema
      await db.execute(`
        CREATE OR REPLACE FUNCTION ${schemaName}.tenant_id() RETURNS INT AS $$
        BEGIN
          RETURN current_setting('app.current_tenant_id', true)::INT;
        END;
        $$ LANGUAGE plpgsql;
      `);
    }
    
    return result[0];
  },

  /**
   * Update an existing tenant
   * 
   * @param id The tenant ID
   * @param data The tenant data to update
   * @returns The updated tenant record
   */
  async updateTenant(id: number, data: any): Promise<Tenant | null> {
    // Check if the tenant exists
    const existingTenant = await this.getTenantById(id);
    if (!existingTenant) {
      return null;
    }
    
    // Filter out fields that cannot be updated
    const { subdomain, schemaStrategy, schemaName, ...updateData } = data;
    
    // Update the tenant
    const result = await db.update(tenants)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, id))
      .returning();
    
    return result[0];
  },

  /**
   * Archive a tenant
   * 
   * @param id The tenant ID
   * @returns The archived tenant record or null if not found
   */
  async archiveTenant(id: number): Promise<Tenant | null> {
    // Check if the tenant exists
    const existingTenant = await this.getTenantById(id);
    if (!existingTenant) {
      return null;
    }
    
    // Archive the tenant
    const result = await db.update(tenants)
      .set({
        status: 'archived',
        updatedAt: new Date()
      })
      .where(eq(tenants.id, id))
      .returning();
    
    return result[0];
  },

  /**
   * Delete a tenant (hard delete, use with caution)
   * 
   * @param id The tenant ID
   * @returns Boolean indicating if the operation was successful
   */
  async deleteTenant(id: number): Promise<boolean> {
    // Check if the tenant exists
    const existingTenant = await this.getTenantById(id);
    if (!existingTenant) {
      return false;
    }
    
    // Delete the tenant feature flags
    await db.delete(tenantFeatureFlags).where(eq(tenantFeatureFlags.tenantId, id));
    
    // Delete the tenant
    await db.delete(tenants).where(eq(tenants.id, id));
    
    // Drop the schema if using schema_per_tenant
    if (existingTenant.schemaStrategy === 'schema_per_tenant' && existingTenant.schemaName) {
      await db.execute(`DROP SCHEMA IF EXISTS ${existingTenant.schemaName} CASCADE`);
    }
    
    return true;
  },

  /**
   * Get feature flags for a tenant
   * 
   * @param tenantId The tenant ID
   * @returns Array of the tenant's feature flags
   */
  async getTenantFeatureFlags(tenantId: number): Promise<TenantFeatureFlag[]> {
    return await db.select().from(tenantFeatureFlags).where(eq(tenantFeatureFlags.tenantId, tenantId));
  },

  /**
   * Set a feature flag for a tenant
   * 
   * @param tenantId The tenant ID
   * @param featureKey The feature key
   * @param enabled Whether the feature is enabled
   * @param configuration Optional configuration for the feature
   * @returns The created or updated feature flag
   */
  async setTenantFeatureFlag(
    tenantId: number, 
    featureKey: string, 
    enabled: boolean, 
    configuration: any = null
  ): Promise<TenantFeatureFlag | null> {
    // Check if the tenant exists
    const existingTenant = await this.getTenantById(tenantId);
    if (!existingTenant) {
      return null;
    }
    
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
      const result = await db.update(tenantFeatureFlags)
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
      
      return result[0];
    } else {
      // Create new flag
      const flagData = {
        tenantId,
        featureKey,
        enabled,
        configuration
      };
      
      const validatedData = insertTenantFeatureFlagSchema.parse(flagData);
      
      const result = await db.insert(tenantFeatureFlags)
        .values({
          ...validatedData,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0];
    }
  },

  /**
   * Check if a feature is enabled for a tenant
   * 
   * @param tenantId The tenant ID
   * @param featureKey The feature key
   * @returns Boolean indicating if the feature is enabled
   */
  async isFeatureEnabled(tenantId: number, featureKey: string): Promise<boolean> {
    const flag = await db.select()
      .from(tenantFeatureFlags)
      .where(
        and(
          eq(tenantFeatureFlags.tenantId, tenantId),
          eq(tenantFeatureFlags.featureKey, featureKey)
        )
      )
      .limit(1);
    
    return flag.length > 0 && flag[0].enabled;
  },

  /**
   * Create schema for tenant (used for migration)
   * 
   * @param tenant The tenant object
   * @returns Boolean indicating if the operation was successful
   */
  async createSchemaForTenant(tenant: Tenant): Promise<boolean> {
    if (tenant.schemaStrategy !== 'schema_per_tenant' || !tenant.schemaName) {
      return false;
    }
    
    try {
      // Create the schema
      await db.execute(`CREATE SCHEMA IF NOT EXISTS ${tenant.schemaName}`);
      
      // Create RLS function in this schema
      await db.execute(`
        CREATE OR REPLACE FUNCTION ${tenant.schemaName}.tenant_id() RETURNS INT AS $$
        BEGIN
          RETURN current_setting('app.current_tenant_id', true)::INT;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      return true;
    } catch (error) {
      console.error(`Error creating schema for tenant ${tenant.id}:`, error);
      return false;
    }
  }
};