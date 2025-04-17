import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { tenants } from '../../shared/tenant-schema';
import { eq } from 'drizzle-orm';

// Define a custom request interface that includes tenant information
export interface TenantRequest extends Request {
  tenantId?: number;
  tenantSubdomain?: string;
  tenantCustomDomain?: string;
  tenantName?: string;
  tenant?: any; // Full tenant record
}

// Tenant information extraction strategies
export enum TenantIdentificationStrategy {
  SUBDOMAIN = 'subdomain',
  HEADER = 'header',
  PATH_PREFIX = 'path-prefix',
  JWT = 'jwt',
  DOMAIN = 'domain',
}

// Tenant middleware configuration options
export interface TenantMiddlewareOptions {
  strategies: TenantIdentificationStrategy[];
  headerName?: string; // Used for HEADER strategy
  pathPrefix?: string; // Used for PATH_PREFIX strategy
  jwtField?: string;   // Used for JWT strategy
  defaultTenantId?: number; // Used for fallback (typically in development)
  ignorePaths?: string[]; // Paths that should bypass tenant identification
}

/**
 * Middleware that identifies the current tenant based on configured strategies
 * 
 * @param options Configuration options for tenant identification
 * @returns Express middleware function
 */
export function tenantMiddleware(options: TenantMiddlewareOptions) {
  const defaultOptions: TenantMiddlewareOptions = {
    strategies: [TenantIdentificationStrategy.SUBDOMAIN],
    headerName: 'X-Tenant-ID',
    pathPrefix: '/t',
    jwtField: 'tenantId',
    ignorePaths: ['/health', '/metrics', '/api/v1/auth/login', '/api/v1/auth/register'],
  };

  const config = { ...defaultOptions, ...options };

  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    // Skip tenant identification for ignored paths
    if (config.ignorePaths?.some(path => req.path.startsWith(path))) {
      return next();
    }

    let tenantId: number | undefined;
    let tenantIdentifier: string | undefined;

    // Try each strategy until we find a tenant
    for (const strategy of config.strategies) {
      switch (strategy) {
        case TenantIdentificationStrategy.SUBDOMAIN:
          tenantIdentifier = extractTenantFromSubdomain(req);
          break;
        case TenantIdentificationStrategy.HEADER:
          tenantIdentifier = req.headers[config.headerName?.toLowerCase() || ''] as string;
          break;
        case TenantIdentificationStrategy.PATH_PREFIX:
          tenantIdentifier = extractTenantFromPath(req, config.pathPrefix || '/t');
          break;
        case TenantIdentificationStrategy.JWT:
          tenantIdentifier = extractTenantFromJwt(req, config.jwtField || 'tenantId');
          break;
        case TenantIdentificationStrategy.DOMAIN:
          tenantIdentifier = req.hostname;
          break;
      }

      if (tenantIdentifier) {
        // If we found a tenant identifier (either ID, subdomain, or domain)
        try {
          const tenant = await findTenant(tenantIdentifier, strategy);
          if (tenant) {
            req.tenantId = tenant.id;
            req.tenantSubdomain = tenant.subdomain;
            req.tenantCustomDomain = tenant.customDomain;
            req.tenantName = tenant.name;
            req.tenant = tenant;
            tenantId = tenant.id;
            break;
          }
        } catch (error) {
          console.error(`Error finding tenant with identifier ${tenantIdentifier}:`, error);
        }
      }
    }

    // If no tenant found and a default is specified, use that
    if (!tenantId && config.defaultTenantId) {
      try {
        const tenant = await findTenantById(config.defaultTenantId);
        if (tenant) {
          req.tenantId = tenant.id;
          req.tenantSubdomain = tenant.subdomain;
          req.tenantCustomDomain = tenant.customDomain;
          req.tenantName = tenant.name;
          req.tenant = tenant;
          tenantId = tenant.id;
        }
      } catch (error) {
        console.error(`Error finding default tenant ${config.defaultTenantId}:`, error);
      }
    }

    // If we found a tenant, set the PostgreSQL session variable for RLS
    if (tenantId) {
      try {
        // This will be used by PostgreSQL RLS policies
        await db.execute(`SELECT set_tenant_id(${tenantId})`);
      } catch (error) {
        console.error('Error setting tenant context in PostgreSQL:', error);
        return res.status(500).json({ 
          error: 'Database error',
          message: 'Failed to establish tenant database context'
        });
      }
      next();
    } else {
      // No tenant found and no default - return 404
      return res.status(404).json({ 
        error: 'Tenant not found',
        message: 'The requested tenant could not be identified'
      });
    }
  };
}

/**
 * Extract tenant identifier from the subdomain
 */
function extractTenantFromSubdomain(req: Request): string | undefined {
  const host = req.hostname;
  
  // Skip localhost
  if (host === 'localhost' || host.startsWith('127.0.0.')) {
    return undefined;
  }
  
  // Look for pattern: tenant.example.com
  const parts = host.split('.');
  if (parts.length > 2) {
    return parts[0]; // First part is the subdomain
  }
  
  return undefined;
}

/**
 * Extract tenant identifier from the URL path
 */
function extractTenantFromPath(req: Request, prefix: string): string | undefined {
  if (req.path.startsWith(prefix + '/')) {
    const pathParts = req.path.split('/');
    // prefix/tenantId/rest/of/path
    if (pathParts.length > 2) {
      return pathParts[2];
    }
  }
  return undefined;
}

/**
 * Extract tenant identifier from the JWT token
 */
function extractTenantFromJwt(req: Request, field: string): string | undefined {
  // JWT is typically stored in user property after authentication middleware runs
  if (req.user && (req.user as any)[field]) {
    return (req.user as any)[field];
  }
  return undefined;
}

/**
 * Find a tenant by identifier (ID, subdomain, or domain)
 */
async function findTenant(identifier: string, strategy: TenantIdentificationStrategy) {
  try {
    let query;
    
    switch (strategy) {
      case TenantIdentificationStrategy.SUBDOMAIN:
        query = db.select().from(tenants).where(eq(tenants.subdomain, identifier)).limit(1);
        break;
      case TenantIdentificationStrategy.DOMAIN:
        query = db.select().from(tenants).where(eq(tenants.customDomain, identifier)).limit(1);
        break;
      case TenantIdentificationStrategy.HEADER:
      case TenantIdentificationStrategy.PATH_PREFIX:
      case TenantIdentificationStrategy.JWT:
        // Assume identifier is a tenant ID in these cases
        const tenantId = parseInt(identifier, 10);
        if (isNaN(tenantId)) {
          return null;
        }
        query = db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        break;
      default:
        return null;
    }
    
    const result = await query;
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error finding tenant:', error);
    throw error;
  }
}

/**
 * Find a tenant by ID
 */
async function findTenantById(id: number) {
  try {
    const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error(`Error finding tenant by ID ${id}:`, error);
    throw error;
  }
}

/**
 * Create a database connection with the tenant's schema set
 * Used for schema-per-tenant isolation strategy
 */
export async function getTenantConnection(tenantId: number) {
  try {
    // Find the tenant to get schema info
    const tenant = await findTenantById(tenantId);
    
    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`);
    }
    
    // For schema-per-tenant strategy
    if (tenant.schemaStrategy === 'schema_per_tenant' && tenant.schemaName) {
      // Set the search_path to the tenant's schema
      await db.execute(`SET search_path TO ${tenant.schemaName}, public`);
      return db;
    }
    
    // For row-level security strategy
    if (tenant.schemaStrategy === 'row_level_security' || tenant.schemaStrategy === 'combined') {
      // Set the tenant ID for row-level security
      await db.execute(`SELECT set_tenant_id(${tenantId})`);
      return db;
    }
    
    throw new Error(`Unsupported schema strategy: ${tenant.schemaStrategy}`);
  } catch (error) {
    console.error(`Error getting tenant connection for ID ${tenantId}:`, error);
    throw error;
  }
}