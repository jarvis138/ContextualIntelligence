import { Request, Response, NextFunction } from 'express';
import { tenantService } from '../tenant-service';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      tenant?: any;
    }
  }
}

// Define the strategies for tenant identification
export enum TenantIdentificationStrategy {
  SUBDOMAIN = 'subdomain',
  HEADER = 'header',
  DOMAIN = 'domain',
  JWT = 'jwt',
  QUERY = 'query'
}

interface TenantMiddlewareOptions {
  strategies: TenantIdentificationStrategy[];
  defaultTenantId?: number;
  headerName?: string;
  queryParamName?: string;
  jwtTokenKey?: string;
  ignorePaths?: string[];
}

// A middleware that identifies the tenant from various sources
export const tenantMiddleware = (options: TenantMiddlewareOptions) => {
  const {
    strategies,
    defaultTenantId,
    headerName = 'X-Tenant-ID',
    queryParamName = 'tenantId',
    jwtTokenKey = 'tenantId',
    ignorePaths = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip tenant identification for ignored paths
      if (ignorePaths.some(path => req.path.startsWith(path) || req.path === path)) {
        return next();
      }

      // Try to identify the tenant using the provided strategies in order
      let tenantId = null;

      for (const strategy of strategies) {
        switch (strategy) {
          case TenantIdentificationStrategy.SUBDOMAIN:
            tenantId = await identifyTenantFromSubdomain(req);
            break;
          case TenantIdentificationStrategy.HEADER:
            tenantId = identifyTenantFromHeader(req, headerName);
            break;
          case TenantIdentificationStrategy.DOMAIN:
            tenantId = await identifyTenantFromDomain(req);
            break;
          case TenantIdentificationStrategy.JWT:
            tenantId = identifyTenantFromJWT(req, jwtTokenKey);
            break;
          case TenantIdentificationStrategy.QUERY:
            tenantId = identifyTenantFromQuery(req, queryParamName);
            break;
        }

        if (tenantId) {
          break;
        }
      }

      // If no tenant was identified, use the default if provided
      if (!tenantId && defaultTenantId) {
        tenantId = defaultTenantId;
      }

      // If we have a tenant ID, get the tenant details and set in request
      if (tenantId) {
        const tenant = await tenantService.getTenantById(tenantId);
        if (tenant) {
          req.tenantId = tenantId;
          req.tenant = tenant;

          // Set PostgreSQL session variables for RLS
          // This will be used by the row level security policies
          if (tenant.schemaStrategy === 'row_level_security') {
            // Execute the SQL function to set the tenant context
            const { pool } = await import('../db');
            const client = await pool.connect();
            try {
              await client.query(`SELECT set_tenant_id($1)`, [tenantId]);
              await client.query(`SELECT set_tenant_rls_id($1)`, [tenant.rlsTenantId]);
            } finally {
              client.release();
            }
          }
        }
      }

      next();
    } catch (error) {
      console.error('Error in tenant middleware:', error);
      next(error);
    }
  };
};

// Helper function to identify tenant from subdomain
async function identifyTenantFromSubdomain(req: Request): Promise<number | null> {
  const host = req.get('host');
  if (!host) return null;

  // Extract subdomain (assuming format: subdomain.domain.com)
  const hostParts = host.split('.');
  if (hostParts.length < 3) return null;

  const subdomain = hostParts[0];
  if (subdomain === 'www' || subdomain === 'api') return null;

  const tenant = await tenantService.getTenantBySubdomain(subdomain);
  return tenant?.id || null;
}

// Helper function to identify tenant from custom domain
async function identifyTenantFromDomain(req: Request): Promise<number | null> {
  const host = req.get('host');
  if (!host) return null;

  // Remove port if present
  const domain = host.split(':')[0];

  const tenant = await tenantService.getTenantByCustomDomain(domain);
  return tenant?.id || null;
}

// Helper function to identify tenant from header
function identifyTenantFromHeader(req: Request, headerName: string): number | null {
  const tenantIdHeader = req.get(headerName);
  if (!tenantIdHeader) return null;

  const tenantId = parseInt(tenantIdHeader, 10);
  return isNaN(tenantId) ? null : tenantId;
}

// Helper function to identify tenant from JWT token
function identifyTenantFromJWT(req: Request, tokenKey: string): number | null {
  const authHeader = req.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret') as any;
    const tenantId = decoded[tokenKey];
    return tenantId ? parseInt(tenantId.toString(), 10) : null;
  } catch (error) {
    return null;
  }
}

// Helper function to identify tenant from query parameter
function identifyTenantFromQuery(req: Request, paramName: string): number | null {
  const tenantIdParam = req.query[paramName];
  if (!tenantIdParam) return null;

  const tenantId = parseInt(tenantIdParam.toString(), 10);
  return isNaN(tenantId) ? null : tenantId;
}