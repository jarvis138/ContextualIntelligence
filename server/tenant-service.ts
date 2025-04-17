import { db } from "./db";
import { eq, and, or, like, ilike } from "drizzle-orm";
import { 
  tenants, 
  tenantFeatureFlags, 
  tenantAdmins,
  type InsertTenant, 
  type Tenant, 
  type UpdateTenant,
  type TenantFeatureFlag,
  type TenantAdmin
} from "../shared/tenant-schema";
import { v4 as uuidv4 } from "uuid";

export class TenantService {
  /**
   * Create a new tenant
   */
  async createTenant(data: InsertTenant): Promise<Tenant> {
    const rlsTenantId = uuidv4();
    
    const result = await db.insert(tenants).values({
      ...data,
      rlsTenantId,
      schemaName: data.schemaStrategy === "schema_per_tenant" 
        ? `tenant_${data.subdomain.replace(/[^a-z0-9]/g, '_')}` 
        : null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    return result[0];
  }

  /**
   * Get a tenant by ID
   */
  async getTenantById(id: number): Promise<Tenant | null> {
    const result = await db.query.tenants.findFirst({
      where: eq(tenants.id, id),
      with: {
        featureFlags: true
      }
    });
    
    return result;
  }

  /**
   * Get a tenant by subdomain
   */
  async getTenantBySubdomain(subdomain: string): Promise<Tenant | null> {
    const result = await db.query.tenants.findFirst({
      where: eq(tenants.subdomain, subdomain),
      with: {
        featureFlags: true
      }
    });
    
    return result;
  }

  /**
   * Get a tenant by custom domain
   */
  async getTenantByCustomDomain(domain: string): Promise<Tenant | null> {
    const result = await db.query.tenants.findFirst({
      where: eq(tenants.customDomain, domain),
      with: {
        featureFlags: true
      }
    });
    
    return result;
  }

  /**
   * Get a tenant by RLS tenant ID
   */
  async getTenantByRlsTenantId(rlsTenantId: string): Promise<Tenant | null> {
    const result = await db.query.tenants.findFirst({
      where: eq(tenants.rlsTenantId, rlsTenantId),
      with: {
        featureFlags: true
      }
    });
    
    return result;
  }

  /**
   * List all tenants with optional pagination and filtering
   */
  async listTenants({
    page = 1,
    limit = 20,
    search = "",
    status = "",
    tier = ""
  }: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tier?: string;
  } = {}): Promise<{ data: Tenant[]; total: number; page: number; limit: number }> {
    // Build the where conditions
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(tenants.name, `%${search}%`),
          ilike(tenants.displayName || "", `%${search}%`),
          ilike(tenants.subdomain, `%${search}%`),
          ilike(tenants.customDomain || "", `%${search}%`)
        )
      );
    }
    
    if (status) {
      whereConditions.push(eq(tenants.status, status));
    }
    
    if (tier) {
      whereConditions.push(eq(tenants.tier, tier));
    }
    
    // Build the final where condition
    const whereCondition = whereConditions.length > 0
      ? and(...whereConditions)
      : undefined;
    
    // Get the total count
    const countResult = await db
      .select({ count: tenants.id })
      .from(tenants)
      .where(whereCondition)
      .count();
    
    const total = Number(countResult[0]?.count || 0);
    
    // Get the paginated results
    const data = await db.query.tenants.findMany({
      where: whereCondition,
      limit,
      offset: (page - 1) * limit,
      orderBy: tenants.id,
      with: {
        featureFlags: true
      }
    });
    
    return {
      data,
      total,
      page,
      limit
    };
  }

  /**
   * Update a tenant
   */
  async updateTenant(id: number, data: UpdateTenant): Promise<Tenant | null> {
    const existingTenant = await this.getTenantById(id);
    if (!existingTenant) {
      return null;
    }
    
    // If changing the schema strategy from row_level_security to schema_per_tenant
    // we need to generate a schema name
    let schemaName = existingTenant.schemaName;
    if (data.schemaStrategy === "schema_per_tenant" && existingTenant.schemaStrategy === "row_level_security") {
      const subdomain = data.subdomain || existingTenant.subdomain;
      schemaName = `tenant_${subdomain.replace(/[^a-z0-9]/g, '_')}`;
    }
    
    const result = await db.update(tenants)
      .set({
        ...data,
        schemaName,
        updatedAt: new Date()
      })
      .where(eq(tenants.id, id))
      .returning();
    
    return result[0];
  }

  /**
   * Delete a tenant
   */
  async deleteTenant(id: number): Promise<boolean> {
    // This will cascade delete all related records
    const result = await db.delete(tenants)
      .where(eq(tenants.id, id))
      .returning({ id: tenants.id });
    
    return result.length > 0;
  }

  /**
   * Set a tenant feature flag
   */
  async setTenantFeatureFlag(
    tenantId: number, 
    key: string, 
    enabled: boolean, 
    settings: Record<string, any> = {}
  ): Promise<TenantFeatureFlag> {
    // Check if the feature flag already exists
    const existingFlag = await db.query.tenantFeatureFlags.findFirst({
      where: and(
        eq(tenantFeatureFlags.tenantId, tenantId),
        eq(tenantFeatureFlags.key, key)
      )
    });
    
    if (existingFlag) {
      // Update the existing flag
      const result = await db.update(tenantFeatureFlags)
        .set({
          enabled,
          settings,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantFeatureFlags.tenantId, tenantId),
          eq(tenantFeatureFlags.key, key)
        ))
        .returning();
      
      return result[0];
    } else {
      // Create a new flag
      const result = await db.insert(tenantFeatureFlags)
        .values({
          tenantId,
          key,
          enabled,
          settings,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
      
      return result[0];
    }
  }

  /**
   * Get a tenant feature flag
   */
  async getTenantFeatureFlag(tenantId: number, key: string): Promise<TenantFeatureFlag | null> {
    const result = await db.query.tenantFeatureFlags.findFirst({
      where: and(
        eq(tenantFeatureFlags.tenantId, tenantId),
        eq(tenantFeatureFlags.key, key)
      )
    });
    
    return result;
  }

  /**
   * List tenant feature flags
   */
  async listTenantFeatureFlags(tenantId: number): Promise<TenantFeatureFlag[]> {
    const result = await db.query.tenantFeatureFlags.findMany({
      where: eq(tenantFeatureFlags.tenantId, tenantId)
    });
    
    return result;
  }

  /**
   * Add a tenant admin
   */
  async addTenantAdmin(tenantId: number, userId: number, role: string = "admin"): Promise<TenantAdmin> {
    const result = await db.insert(tenantAdmins)
      .values({
        tenantId,
        userId,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    return result[0];
  }

  /**
   * Remove a tenant admin
   */
  async removeTenantAdmin(tenantId: number, userId: number): Promise<boolean> {
    const result = await db.delete(tenantAdmins)
      .where(and(
        eq(tenantAdmins.tenantId, tenantId),
        eq(tenantAdmins.userId, userId)
      ))
      .returning({ id: tenantAdmins.id });
    
    return result.length > 0;
  }

  /**
   * List tenant admins
   */
  async listTenantAdmins(tenantId: number): Promise<TenantAdmin[]> {
    const result = await db.query.tenantAdmins.findMany({
      where: eq(tenantAdmins.tenantId, tenantId)
    });
    
    return result;
  }

  /**
   * Check if a user is admin for a tenant
   */
  async isUserTenantAdmin(tenantId: number, userId: number): Promise<boolean> {
    const result = await db.query.tenantAdmins.findFirst({
      where: and(
        eq(tenantAdmins.tenantId, tenantId),
        eq(tenantAdmins.userId, userId)
      )
    });
    
    return !!result;
  }
}

export const tenantService = new TenantService();