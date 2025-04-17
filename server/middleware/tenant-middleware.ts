import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { tenants } from '../../shared/tenant-schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

/**
 * Extends Express Request to include tenant information
 */
export interface TenantRequest extends Request {
  tenantId?: number;
  tenantSubdomain?: string;
  tenantCustomDomain?: string;
  tenantName?: string;
  tenant?: any; // Full tenant record
}

/**
 * Strategies for identifying tenants from requests
 */
export enum TenantIdentificationStrategy {
  SUBDOMAIN = 'subdomain',
  HEADER = 'header',
  PATH_PREFIX = 'path-prefix',
  JWT = 'jwt',
  DOMAIN = 'domain',
}

/**
 * Configuration options for the tenant middleware
 */
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
    pathPrefix: '/tenant',
    jwtField: 'tenantId',
    ignorePaths: [],
  };

  // Merge options with defaults
  const config = { ...defaultOptions, ...options };

  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Skip tenant identification for ignored paths
      if (config.ignorePaths && config.ignorePaths.some(path => req.path.startsWith(path))) {
        return next();
      }

      let tenantIdentifier: string | undefined;
      let strategy: TenantIdentificationStrategy | undefined;

      // Try each strategy in order until we find a tenant identifier
      for (const s of config.strategies) {
        switch (s) {
          case TenantIdentificationStrategy.SUBDOMAIN:
            tenantIdentifier = extractTenantFromSubdomain(req);
            break;
          case TenantIdentificationStrategy.HEADER:
            tenantIdentifier = req.header(config.headerName!);
            break;
          case TenantIdentificationStrategy.PATH_PREFIX:
            tenantIdentifier = extractTenantFromPath(req, config.pathPrefix!);
            break;
          case TenantIdentificationStrategy.JWT:
            tenantIdentifier = extractTenantFromJwt(req, config.jwtField!);
            break;
          case TenantIdentificationStrategy.DOMAIN:
            tenantIdentifier = req.hostname;
            break;
        }

        if (tenantIdentifier) {
          strategy = s;
          break;
        }
      }

      // If we found a tenant identifier, try to find the tenant
      if (tenantIdentifier && strategy) {
        try {
          const tenant = await findTenant(tenantIdentifier, strategy);
          if (tenant) {
            req.tenantId = tenant.id;
            req.tenantSubdomain = tenant.subdomain;
            req.tenantCustomDomain = tenant.customDomain || undefined;
            req.tenantName = tenant.name;
            req.tenant = tenant;
            
            // Set the tenant ID in the PostgreSQL session for RLS
            if (tenant.rlsTenantId) {
              await db.execute(`SELECT set_tenant_rls_id('${tenant.rlsTenantId}')`);
            }
            await db.execute(`SELECT set_tenant_id(${tenant.id})`);
            
            return next();
          }
        } catch (error) {
          console.error(`Error finding tenant with identifier ${tenantIdentifier}:`, error);
        }
      }

      // If we have a default tenant ID (typically used in development), use it
      if (config.defaultTenantId) {
        try {
          const defaultTenant = await findTenantById(config.defaultTenantId);
          if (defaultTenant) {
            req.tenantId = defaultTenant.id;
            req.tenantSubdomain = defaultTenant.subdomain;
            req.tenantCustomDomain = defaultTenant.customDomain || undefined;
            req.tenantName = defaultTenant.name;
            req.tenant = defaultTenant;
            
            // Set the tenant ID in the PostgreSQL session for RLS
            if (defaultTenant.rlsTenantId) {
              await db.execute(`SELECT set_tenant_rls_id('${defaultTenant.rlsTenantId}')`);
            }
            await db.execute(`SELECT set_tenant_id(${defaultTenant.id})`);
            
            return next();
          }
        } catch (error) {
          console.error(`Error finding default tenant ${config.defaultTenantId}:`, error);
        }
      }

      // If the request is for an API and we couldn't identify a tenant,
      // return a 401 Unauthorized response
      if (req.path.startsWith('/api')) {
        return res.status(401).json({ 
          message: 'Tenant not identified', 
          tenant: null 
        });
      }

      // For non-API requests, let the application handle it
      next();
    } catch (error) {
      console.error('Error in tenant middleware:', error);
      next(error);
    }
  };
}

/**
 * Extract tenant identifier from the subdomain
 */
function extractTenantFromSubdomain(req: Request): string | undefined {
  const hostname = req.hostname;
  if (!hostname) return undefined;

  // Handle localhost development
  if (hostname === 'localhost') return undefined;

  // Check if this is a replit domain
  if (hostname.includes('.repl.co')) {
    return undefined; // Replit domains don't have tenant subdomains
  }

  // Extract subdomain from hostname
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts[0]; // First part is the subdomain
  }

  return undefined;
}

/**
 * Extract tenant identifier from the URL path
 */
function extractTenantFromPath(req: Request, prefix: string): string | undefined {
  if (!req.path.startsWith(prefix)) return undefined;

  const parts = req.path.split('/');
  if (parts.length < 3) return undefined;

  // The tenant identifier is the part after the prefix
  // e.g., /tenant/acme/users -> acme
  return parts[2];
}

/**
 * Extract tenant identifier from the JWT token
 */
function extractTenantFromJwt(req: Request, field: string): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return undefined;
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-default-secret');
    if (typeof decoded === 'object' && decoded !== null && field in decoded) {
      return String(decoded[field]);
    }
  } catch (error) {
    console.error('Error decoding JWT for tenant identification:', error);
  }

  return undefined;
}

/**
 * Find a tenant by identifier (ID, subdomain, or domain)
 */
async function findTenant(identifier: string, strategy: TenantIdentificationStrategy) {
  switch (strategy) {
    case TenantIdentificationStrategy.SUBDOMAIN:
      return await db.select().from(tenants).where(eq(tenants.subdomain, identifier)).limit(1).then(res => res[0] || null);
    
    case TenantIdentificationStrategy.DOMAIN:
      return await db.select().from(tenants).where(eq(tenants.customDomain, identifier)).limit(1).then(res => res[0] || null);
    
    case TenantIdentificationStrategy.HEADER:
    case TenantIdentificationStrategy.JWT:
      // Try to parse as integer for ID lookup
      const id = parseInt(identifier, 10);
      if (!isNaN(id)) {
        return await findTenantById(id);
      }
      // Fall back to subdomain lookup
      return await db.select().from(tenants).where(eq(tenants.subdomain, identifier)).limit(1).then(res => res[0] || null);
    
    default:
      return null;
  }
}

/**
 * Find a tenant by ID
 */
async function findTenantById(id: number) {
  return await db.select().from(tenants).where(eq(tenants.id, id)).limit(1).then(res => res[0] || null);
}

/**
 * Create a database connection with the tenant's schema set
 * Used for schema-per-tenant isolation strategy
 */
export async function getTenantConnection(tenantId: number) {
  // Get the tenant record
  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant with ID ${tenantId} not found`);
  }
  
  // If this tenant uses schema isolation, set the search path
  if (tenant.schemaStrategy === 'schema_per_tenant' && tenant.schemaName) {
    // Create a connection with the schema search path set
    await db.execute(`SET search_path TO ${tenant.schemaName}, public`);
    return db;
  }
  
  // For row-level security, we use the same connection but set the tenant ID
  if (tenant.schemaStrategy === 'row_level_security') {
    await db.execute(`SELECT set_tenant_id(${tenant.id})`);
    if (tenant.rlsTenantId) {
      await db.execute(`SELECT set_tenant_rls_id('${tenant.rlsTenantId}')`);
    }
    return db;
  }
  
  // Default case - just return the regular db connection
  return db;
}