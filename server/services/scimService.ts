/**
 * SCIM Service
 * 
 * System for Cross-domain Identity Management (SCIM) integration
 * allowing enterprise identity providers to provision and manage users.
 */

import { Request, Response, NextFunction } from 'express';
import { 
  Schema, 
  Resource, 
  Filter,
  Messages,
  Types 
} from 'scimmy';
import { db } from '../db';
import { users, tenants } from '@shared/schema';
import { eq, like, and, or, sql } from 'drizzle-orm';
import { AuditService, AuditCategory, AuditSeverity } from './auditService';

// Configure the schemas we'll need
const UserSchema = new Schema.User();
const GroupSchema = new Schema.Group();

// Interface for API key validation
interface ScimConfig {
  enabled: boolean;
  authMethod: 'bearer' | 'basic';
  apiKey?: string;
  basicCredentials?: {
    username: string;
    password: string;
  };
  tenantId?: number;
}

/**
 * SCIM Service for user provisioning
 * Allows enterprise identity providers to manage users in the system
 */
export class ScimService {
  private static configs: Map<number | 'system', ScimConfig> = new Map();
  private static initialized = false;

  /**
   * Initialize the SCIM service
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load SCIM configurations
      const configs = await this.loadScimConfigs();
      
      // Store configurations
      for (const [key, config] of Object.entries(configs)) {
        this.configs.set(
          key === 'system' ? 'system' : parseInt(key), 
          config
        );
      }
      
      this.initialized = true;
      console.log(`SCIM Service initialized with ${this.configs.size} configurations`);
    } catch (error) {
      console.error('Failed to initialize SCIM service:', error);
    }
  }

  /**
   * Load SCIM configurations from storage
   */
  private static async loadScimConfigs(): Promise<Record<string, ScimConfig>> {
    try {
      // In a real implementation, this would fetch from a database table
      // This is a placeholder implementation
      
      // Get from environment variable
      const configJson = process.env.SCIM_CONFIGS || '{}';
      const configs = JSON.parse(configJson);
      
      // Apply defaults
      if (!configs.system) {
        configs.system = {
          enabled: false,
          authMethod: 'bearer',
          apiKey: ''
        };
      }
      
      return configs;
    } catch (error) {
      console.error('Failed to load SCIM configurations:', error);
      return {
        system: {
          enabled: false,
          authMethod: 'bearer',
          apiKey: ''
        }
      };
    }
  }

  /**
   * Authentication middleware for SCIM requests
   */
  static authMiddleware(req: Request, res: Response, next: NextFunction): void {
    try {
      // Get tenant ID from request
      const tenantId = this.getTenantId(req);
      
      // Get config for this tenant
      const config = this.configs.get(tenantId || 'system');
      
      if (!config || !config.enabled) {
        return res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '404',
          detail: 'SCIM service not available'
        });
      }
      
      // Validate authentication
      if (config.authMethod === 'bearer') {
        // Bearer token auth
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            status: '401',
            detail: 'Bearer token required'
          });
        }
        
        const token = authHeader.split(' ')[1];
        if (token !== config.apiKey) {
          return res.status(401).json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            status: '401',
            detail: 'Invalid token'
          });
        }
      } else if (config.authMethod === 'basic') {
        // Basic auth
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Basic ')) {
          return res.status(401).json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            status: '401',
            detail: 'Basic authentication required'
          });
        }
        
        const base64Credentials = authHeader.split(' ')[1];
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');
        
        if (
          !config.basicCredentials || 
          username !== config.basicCredentials.username || 
          password !== config.basicCredentials.password
        ) {
          return res.status(401).json({
            schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
            status: '401',
            detail: 'Invalid credentials'
          });
        }
      }
      
      // Store tenant ID for later use
      res.locals.tenantId = tenantId;
      
      next();
    } catch (error) {
      console.error('SCIM authentication error:', error);
      res.status(500).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '500',
        detail: 'Internal server error'
      });
    }
  }

  /**
   * Extract tenant ID from request
   */
  private static getTenantId(req: Request): number | undefined {
    // Check for tenant ID in path parameter
    const pathTenantId = req.params.tenantId;
    if (pathTenantId && !isNaN(parseInt(pathTenantId))) {
      return parseInt(pathTenantId);
    }
    
    // Check for tenant ID in headers
    const tenantHeader = req.headers['x-tenant-id'];
    if (tenantHeader && !isNaN(parseInt(tenantHeader as string))) {
      return parseInt(tenantHeader as string);
    }
    
    // Check for tenant from subdomain
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      // Look up tenant by subdomain in the database
      // Return tenant ID if found
    }
    
    return undefined;
  }

  /**
   * Handle user creation
   */
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = res.locals.tenantId;
      
      // Parse user data from request
      const userData = req.body;
      
      // Use SCIMMY to validate the user data
      const user = new Resource.User(userData);
      
      // Map SCIM user to our database schema
      const mappedUser = {
        username: user.userName,
        email: user.emails?.[0]?.value,
        firstName: user.name?.givenName,
        lastName: user.name?.familyName,
        fullName: user.name?.formatted || `${user.name?.givenName || ''} ${user.name?.familyName || ''}`.trim(),
        active: user.active === undefined ? true : user.active,
        externalId: user.externalId,
        authMethod: 'scim',
        authProvider: 'scim',
        role: this.mapGroups(user.groups),
        tenantId
      };
      
      // Create user in database
      const [createdUser] = await db.insert(users)
        .values(mappedUser)
        .returning();
      
      // Log the user creation
      await AuditService.log({
        userId: 0, // System user
        tenantId,
        action: 'User provisioned via SCIM',
        category: AuditCategory.USER_MANAGEMENT,
        severity: AuditSeverity.INFO,
        resourceType: 'user',
        resourceId: createdUser.id.toString(),
        description: `User ${mappedUser.username} created via SCIM`,
        success: true,
        metadata: {
          externalId: user.externalId
        }
      });
      
      // Convert our user back to SCIM format
      const scimResponse = this.mapToScimUser(createdUser);
      
      res.status(201).json(scimResponse);
    } catch (error) {
      console.error('SCIM create user error:', error);
      
      if (error instanceof Resource.Error) {
        // Handle SCIM-specific errors
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '400',
          detail: error.message
        });
      } else {
        res.status(500).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '500',
          detail: 'Internal server error creating user'
        });
      }
    }
  }

  /**
   * Handle user retrieval
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = res.locals.tenantId;
      const userId = req.params.id;
      
      // Get user from database
      const userResults = await db.select()
        .from(users)
        .where(
          and(
            tenantId ? eq(users.tenantId, tenantId) : sql`TRUE`,
            or(
              eq(users.id, parseInt(userId)),
              eq(users.externalId, userId)
            )
          )
        )
        .limit(1);
      
      if (userResults.length === 0) {
        return res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '404',
          detail: 'User not found'
        });
      }
      
      const user = userResults[0];
      
      // Convert to SCIM format
      const scimUser = this.mapToScimUser(user);
      
      res.json(scimUser);
    } catch (error) {
      console.error('SCIM get user error:', error);
      res.status(500).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '500',
        detail: 'Internal server error retrieving user'
      });
    }
  }

  /**
   * Handle user update
   */
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = res.locals.tenantId;
      const userId = req.params.id;
      
      // Find user
      const userResults = await db.select()
        .from(users)
        .where(
          and(
            tenantId ? eq(users.tenantId, tenantId) : sql`TRUE`,
            or(
              eq(users.id, parseInt(userId)),
              eq(users.externalId, userId)
            )
          )
        )
        .limit(1);
      
      if (userResults.length === 0) {
        return res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '404',
          detail: 'User not found'
        });
      }
      
      const existingUser = userResults[0];
      
      // Parse update data
      const userData = req.body;
      
      // Use SCIMMY to validate the update
      const scimUser = new Resource.User(userData);
      
      // Map SCIM user to our database schema
      const updateData: Record<string, any> = {};
      
      if (scimUser.userName !== undefined) updateData.username = scimUser.userName;
      if (scimUser.emails && scimUser.emails[0]?.value) updateData.email = scimUser.emails[0].value;
      if (scimUser.name?.givenName !== undefined) updateData.firstName = scimUser.name.givenName;
      if (scimUser.name?.familyName !== undefined) updateData.lastName = scimUser.name.familyName;
      if (scimUser.name?.formatted !== undefined) updateData.fullName = scimUser.name.formatted;
      if (scimUser.active !== undefined) updateData.active = scimUser.active;
      if (scimUser.externalId !== undefined) updateData.externalId = scimUser.externalId;
      if (scimUser.groups !== undefined) updateData.role = this.mapGroups(scimUser.groups);
      
      // If no fields to update, return the existing user
      if (Object.keys(updateData).length === 0) {
        const scimResponse = this.mapToScimUser(existingUser);
        return res.json(scimResponse);
      }
      
      // Update user
      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, existingUser.id))
        .returning();
      
      // Log the update
      await AuditService.log({
        userId: 0, // System user
        tenantId,
        action: 'User updated via SCIM',
        category: AuditCategory.USER_MANAGEMENT,
        severity: AuditSeverity.INFO,
        resourceType: 'user',
        resourceId: updatedUser.id.toString(),
        description: `User ${updatedUser.username} updated via SCIM`,
        success: true,
        oldValue: existingUser,
        newValue: updatedUser
      });
      
      // Convert updated user to SCIM format
      const scimResponse = this.mapToScimUser(updatedUser);
      
      res.json(scimResponse);
    } catch (error) {
      console.error('SCIM update user error:', error);
      
      if (error instanceof Resource.Error) {
        // Handle SCIM-specific errors
        res.status(400).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '400',
          detail: error.message
        });
      } else {
        res.status(500).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '500',
          detail: 'Internal server error updating user'
        });
      }
    }
  }

  /**
   * Handle user deletion
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = res.locals.tenantId;
      const userId = req.params.id;
      
      // Find user
      const userResults = await db.select()
        .from(users)
        .where(
          and(
            tenantId ? eq(users.tenantId, tenantId) : sql`TRUE`,
            or(
              eq(users.id, parseInt(userId)),
              eq(users.externalId, userId)
            )
          )
        )
        .limit(1);
      
      if (userResults.length === 0) {
        return res.status(404).json({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          status: '404',
          detail: 'User not found'
        });
      }
      
      const user = userResults[0];
      
      // Delete user or mark as inactive
      // In this implementation, we'll mark as inactive instead of deleting
      const [updatedUser] = await db.update(users)
        .set({ active: false })
        .where(eq(users.id, user.id))
        .returning();
      
      // Log the deletion
      await AuditService.log({
        userId: 0, // System user
        tenantId,
        action: 'User deactivated via SCIM',
        category: AuditCategory.USER_MANAGEMENT,
        severity: AuditSeverity.WARNING,
        resourceType: 'user',
        resourceId: user.id.toString(),
        description: `User ${user.username} deactivated via SCIM`,
        success: true
      });
      
      // No content response for successful deletion
      res.status(204).end();
    } catch (error) {
      console.error('SCIM delete user error:', error);
      res.status(500).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '500',
        detail: 'Internal server error deactivating user'
      });
    }
  }

  /**
   * Handle user search
   */
  static async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = res.locals.tenantId;
      
      // Parse search parameters
      const {
        filter = '',
        startIndex = 1,
        count = 10,
        attributes = [],
        excludedAttributes = []
      } = req.body;
      
      // Build filter from SCIM filter syntax
      let query = db.select().from(users);
      
      // Apply tenant filter if applicable
      if (tenantId) {
        query = query.where(eq(users.tenantId, tenantId));
      }
      
      // Apply specific filters if provided
      if (filter) {
        try {
          const parsedFilter = Filter.parse(filter, { schema: UserSchema });
          
          // Convert SCIM filter to Drizzle query
          // This is a simplified implementation
          if (parsedFilter.attribute === 'userName' && parsedFilter.operator === 'eq') {
            query = query.where(eq(users.username, parsedFilter.value));
          } else if (parsedFilter.attribute === 'emails.value' && parsedFilter.operator === 'eq') {
            query = query.where(eq(users.email, parsedFilter.value));
          } else if (parsedFilter.attribute === 'active' && parsedFilter.operator === 'eq') {
            query = query.where(eq(users.active, parsedFilter.value === 'true'));
          } else if (parsedFilter.attribute === 'externalId' && parsedFilter.operator === 'eq') {
            query = query.where(eq(users.externalId, parsedFilter.value));
          }
        } catch (error) {
          console.error('SCIM filter parse error:', error);
          // Continue with unfiltered query
        }
      }
      
      // Apply pagination
      const offset = (startIndex - 1);
      const userResults = await query.limit(count).offset(offset);
      
      // Get total count
      const totalResults = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(tenantId ? eq(users.tenantId, tenantId) : sql`TRUE`);
      
      // Convert to SCIM format
      const scimUsers = userResults.map(user => this.mapToScimUser(user, attributes, excludedAttributes));
      
      // Create response
      const response = {
        schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        totalResults: parseInt(totalResults[0].count.toString()),
        itemsPerPage: count,
        startIndex,
        Resources: scimUsers
      };
      
      res.json(response);
    } catch (error) {
      console.error('SCIM search users error:', error);
      res.status(500).json({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        status: '500',
        detail: 'Internal server error searching users'
      });
    }
  }

  /**
   * Map group memberships to internal roles
   */
  private static mapGroups(groups: any[] | undefined): string {
    if (!groups || !Array.isArray(groups) || groups.length === 0) {
      return 'user'; // Default role
    }
    
    // Check for admin groups
    const adminGroups = ['admin', 'administrators', 'system administrators'];
    if (groups.some(g => {
      const displayName = typeof g === 'string' ? g : g.display || g.value;
      return adminGroups.includes(displayName.toLowerCase());
    })) {
      return 'admin';
    }
    
    // Check for manager groups
    const managerGroups = ['manager', 'managers', 'team leaders'];
    if (groups.some(g => {
      const displayName = typeof g === 'string' ? g : g.display || g.value;
      return managerGroups.includes(displayName.toLowerCase());
    })) {
      return 'manager';
    }
    
    return 'user';
  }

  /**
   * Map internal user to SCIM format
   */
  private static mapToScimUser(
    user: any, 
    attributes: string[] = [], 
    excludedAttributes: string[] = []
  ): any {
    const scimUser = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      id: user.id.toString(),
      externalId: user.externalId,
      userName: user.username,
      name: {
        formatted: user.fullName,
        givenName: user.firstName,
        familyName: user.lastName
      },
      displayName: user.fullName,
      emails: [
        {
          value: user.email,
          primary: true,
          type: 'work'
        }
      ],
      active: user.active,
      meta: {
        resourceType: 'User',
        created: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
        lastModified: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
        location: `/scim/v2/Users/${user.id}`
      }
    };
    
    // Add role-based groups
    const roleGroups: any[] = [];
    if (user.role === 'admin') {
      roleGroups.push({ value: 'admin', display: 'Administrators' });
    } else if (user.role === 'manager') {
      roleGroups.push({ value: 'manager', display: 'Managers' });
    } else {
      roleGroups.push({ value: 'user', display: 'Users' });
    }
    
    scimUser.groups = roleGroups;
    
    // Apply attribute filtering if needed
    if (attributes.length > 0 || excludedAttributes.length > 0) {
      // This would implement attribute filtering as defined in the SCIM spec
      // For simplicity, we're returning the full user object
    }
    
    return scimUser;
  }
}

export default ScimService;