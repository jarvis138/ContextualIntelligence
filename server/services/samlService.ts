/**
 * SAML Service
 * 
 * Provides SAML-based authentication for enterprise identity providers
 * such as Okta, Azure AD, OneLogin, etc.
 */

import { Request, Response, NextFunction } from 'express';
import { Strategy as SamlStrategy } from '@node-saml/passport-saml';
import passport from 'passport';
import { db } from '../db';
import { users, tenants } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AuditService, AuditCategory, AuditSeverity } from './auditService';
import fs from 'fs';
import path from 'path';

// Type definitions
interface SamlConfig {
  entryPoint: string;
  callbackUrl: string;
  issuer: string;
  cert: string;
  privateKey?: string;
  decryptionPvk?: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  wantAssertionsSigned?: boolean;
  validateInResponseTo?: boolean;
  disableRequestedAuthnContext?: boolean;
  authnContext?: string;
  forceAuthn?: boolean;
  skipRequestCompression?: boolean;
  identifierFormat?: string;
  acceptedClockSkewMs?: number;
  maxAssertionAgeMs?: number;
  attributeConsumingServiceIndex?: string;
  tenantId?: number;
  provider?: string;
}

interface SamlUser {
  id?: string;
  nameID: string;
  nameIDFormat: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  roles?: string[];
  tenantId?: number;
  [key: string]: any;
}

interface SamlProvider {
  id: number;
  name: string;
  enabled: boolean;
  tenantId: number | null;
  config: SamlConfig;
}

/**
 * SAML Authentication Service
 * Manages SAML-based SSO for enterprise identity providers
 */
export class SamlService {
  private static providers: Map<string, SamlProvider> = new Map();
  private static initialized = false;

  /**
   * Initialize the SAML service with all enabled providers
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load SAML providers from database
      const providers = await this.getEnabledProviders();
      
      // Configure each provider
      for (const provider of providers) {
        this.configureProvider(provider);
      }
      
      this.initialized = true;
      console.log(`SAML Service initialized with ${providers.length} providers`);
    } catch (error) {
      console.error('Failed to initialize SAML service:', error);
    }
  }

  /**
   * Get all enabled SAML identity providers
   */
  static async getEnabledProviders(): Promise<SamlProvider[]> {
    try {
      // In a real implementation, this would fetch from a database table
      // This is a placeholder implementation
      const providers: SamlProvider[] = [];
      
      // Fetch from environment variables or configuration system
      const envProviders = process.env.SAML_PROVIDERS ? JSON.parse(process.env.SAML_PROVIDERS) : [];
      
      for (const config of envProviders) {
        if (config.enabled) {
          providers.push({
            id: config.id,
            name: config.name,
            enabled: config.enabled,
            tenantId: config.tenantId,
            config: {
              entryPoint: config.entryPoint,
              callbackUrl: config.callbackUrl,
              issuer: config.issuer,
              cert: config.cert,
              privateKey: config.privateKey,
              // Other SAML configuration options
              ...config.samlOptions
            }
          });
        }
      }
      
      return providers;
    } catch (error) {
      console.error('Failed to get enabled SAML providers:', error);
      return [];
    }
  }

  /**
   * Configure a SAML provider with Passport
   */
  static configureProvider(provider: SamlProvider): void {
    try {
      const providerKey = provider.tenantId 
        ? `saml-${provider.id}-tenant-${provider.tenantId}`
        : `saml-${provider.id}`;
      
      // Create a SAML strategy for this provider
      const strategy = new SamlStrategy(
        {
          entryPoint: provider.config.entryPoint,
          callbackUrl: provider.config.callbackUrl,
          issuer: provider.config.issuer,
          cert: provider.config.cert,
          privateKey: provider.config.privateKey,
          decryptionPvk: provider.config.decryptionPvk,
          signatureAlgorithm: provider.config.signatureAlgorithm,
          digestAlgorithm: provider.config.digestAlgorithm,
          wantAssertionsSigned: provider.config.wantAssertionsSigned ?? true,
          validateInResponseTo: provider.config.validateInResponseTo ?? true,
          disableRequestedAuthnContext: provider.config.disableRequestedAuthnContext,
          authnContext: provider.config.authnContext,
          forceAuthn: provider.config.forceAuthn,
          skipRequestCompression: provider.config.skipRequestCompression,
          identifierFormat: provider.config.identifierFormat,
          acceptedClockSkewMs: provider.config.acceptedClockSkewMs,
          maxAssertionAgeMs: provider.config.maxAssertionAgeMs,
          attributeConsumingServiceIndex: provider.config.attributeConsumingServiceIndex,
          // Add passReqToCallback for multi-tenant support
          passReqToCallback: true,
        },
        async (req: Request, profile: any, done: any) => {
          try {
            // Determine tenant ID from provider config or subdomain/header
            const tenantId = provider.tenantId || this.getTenantIdFromRequest(req);
            
            // Extract user profile data
            const samlUser: SamlUser = {
              nameID: profile.nameID,
              nameIDFormat: profile.nameIDFormat,
              email: profile.email || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'],
              firstName: profile.firstName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname'],
              lastName: profile.lastName || profile['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname'],
              displayName: profile.displayName,
              groups: profile.groups || profile['http://schemas.xmlsoap.org/claims/Group'],
              tenantId
            };

            // Find or create user
            const user = await this.findOrCreateUser(samlUser, provider.name);
            
            // Log successful authentication
            await AuditService.logFromRequest(req, {
              userId: user.id,
              tenantId,
              action: 'SAML login',
              category: AuditCategory.AUTH,
              severity: AuditSeverity.INFO,
              resourceType: 'user',
              resourceId: user.id.toString(),
              description: `User authenticated via SAML (${provider.name})`,
              success: true,
              metadata: {
                provider: provider.name,
                nameIDFormat: samlUser.nameIDFormat,
                groups: samlUser.groups
              }
            });
            
            return done(null, user);
          } catch (error) {
            console.error('SAML authentication error:', error);
            
            // Log authentication failure
            await AuditService.logFromRequest(req, {
              userId: 0, // Anonymous user
              tenantId: provider.tenantId,
              action: 'SAML login failed',
              category: AuditCategory.AUTH,
              severity: AuditSeverity.ERROR,
              resourceType: 'auth',
              description: `Failed SAML authentication attempt (${provider.name})`,
              success: false,
              metadata: {
                provider: provider.name,
                error: error instanceof Error ? error.message : String(error)
              }
            });
            
            return done(error);
          }
        }
      );
      
      // Register the strategy with Passport
      passport.use(providerKey, strategy);
      
      // Store the provider configuration
      this.providers.set(providerKey, provider);
      
      console.log(`Configured SAML provider: ${provider.name}`);
    } catch (error) {
      console.error(`Failed to configure SAML provider ${provider.name}:`, error);
    }
  }

  /**
   * Get tenant ID from the request
   */
  private static getTenantIdFromRequest(req: Request): number | undefined {
    // Check for tenant ID in headers
    const tenantHeader = req.headers['x-tenant-id'];
    if (tenantHeader) {
      return Number(tenantHeader);
    }
    
    // Check for tenant in subdomain
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    
    // In a real implementation, we would look up the tenant by subdomain
    // This is a placeholder
    if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
      // Look up tenant by subdomain in the database
      // Return tenant ID if found
    }
    
    return undefined;
  }

  /**
   * Find or create a user based on SAML profile data
   */
  private static async findOrCreateUser(samlUser: SamlUser, providerName: string): Promise<any> {
    try {
      // Look for existing user with this email
      let user = null;
      
      if (samlUser.email) {
        const existingUsers = await db.select()
          .from(users)
          .where(eq(users.email, samlUser.email))
          .limit(1);
        
        if (existingUsers.length > 0) {
          user = existingUsers[0];
          
          // Update existing user with latest SAML data
          await db.update(users)
            .set({
              authMethod: 'saml',
              authProvider: providerName,
              lastLogin: new Date()
            })
            .where(eq(users.id, user.id));
            
          return user;
        }
      }
      
      // If no user found, create a new one
      const [newUser] = await db.insert(users)
        .values({
          username: samlUser.email || samlUser.nameID,
          email: samlUser.email,
          fullName: samlUser.displayName || `${samlUser.firstName || ''} ${samlUser.lastName || ''}`.trim(),
          firstName: samlUser.firstName,
          lastName: samlUser.lastName,
          authMethod: 'saml',
          authProvider: providerName,
          role: this.determineUserRole(samlUser),
          tenantId: samlUser.tenantId,
          active: true,
          lastLogin: new Date()
        })
        .returning();
      
      return newUser;
    } catch (error) {
      console.error('Error finding/creating SAML user:', error);
      throw new Error('Failed to process SAML user');
    }
  }

  /**
   * Determine user role from SAML attributes and groups
   */
  private static determineUserRole(samlUser: SamlUser): string {
    // Check if role is directly provided in SAML attributes
    if (samlUser.roles && samlUser.roles.length > 0) {
      // Map external roles to internal roles
      if (samlUser.roles.some(r => r.toLowerCase().includes('admin'))) {
        return 'admin';
      }
      if (samlUser.roles.some(r => r.toLowerCase().includes('manager'))) {
        return 'manager';
      }
    }
    
    // Check groups for role information
    if (samlUser.groups && samlUser.groups.length > 0) {
      if (samlUser.groups.some(g => g.toLowerCase().includes('admin'))) {
        return 'admin';
      }
      if (samlUser.groups.some(g => g.toLowerCase().includes('manager'))) {
        return 'manager';
      }
    }
    
    // Default role
    return 'user';
  }

  /**
   * Get middleware for SAML authentication
   */
  static getAuthMiddleware(providerId: string | number, tenantId?: number): any[] {
    const providerKey = tenantId 
      ? `saml-${providerId}-tenant-${tenantId}`
      : `saml-${providerId}`;
    
    if (!this.providers.has(providerKey)) {
      throw new Error(`SAML provider not configured: ${providerKey}`);
    }
    
    return [
      // Middleware to initiate SAML authentication
      passport.authenticate(providerKey, {
        failureRedirect: '/login?error=saml',
        session: true
      })
    ];
  }

  /**
   * Get callback middleware for SAML authentication
   */
  static getCallbackMiddleware(providerId: string | number, tenantId?: number): any[] {
    const providerKey = tenantId 
      ? `saml-${providerId}-tenant-${tenantId}`
      : `saml-${providerId}`;
    
    if (!this.providers.has(providerKey)) {
      throw new Error(`SAML provider not configured: ${providerKey}`);
    }
    
    return [
      // Middleware to handle SAML assertion
      passport.authenticate(providerKey, {
        failureRedirect: '/login?error=saml_callback',
        session: true
      }),
      
      // Custom middleware to handle successful authentication
      (req: Request, res: Response, next: NextFunction) => {
        // After successful SAML authentication
        if (req.user) {
          // Redirect to appropriate location based on tenant and user role
          const user = req.user as any;
          const redirectUrl = user.tenantId 
            ? `/tenant/${user.tenantId}/dashboard` 
            : '/dashboard';
          
          res.redirect(redirectUrl);
        } else {
          res.redirect('/login?error=unknown');
        }
      }
    ];
  }

  /**
   * Get metadata for a SAML provider
   */
  static async getMetadata(providerId: string | number, tenantId?: number): Promise<string> {
    const providerKey = tenantId 
      ? `saml-${providerId}-tenant-${tenantId}`
      : `saml-${providerId}`;
    
    if (!this.providers.has(providerKey)) {
      throw new Error(`SAML provider not configured: ${providerKey}`);
    }
    
    const provider = this.providers.get(providerKey);
    const strategy = passport._strategies[providerKey] as SamlStrategy;
    
    if (!strategy || typeof strategy.generateServiceProviderMetadata !== 'function') {
      throw new Error('Invalid SAML strategy');
    }
    
    // Generate metadata XML
    const decryptionCert = provider?.config.privateKey 
      ? fs.readFileSync(path.resolve(provider.config.privateKey), 'utf8')
      : null;
      
    const metadata = strategy.generateServiceProviderMetadata(
      null, 
      decryptionCert
    );
    
    return metadata;
  }
}

// Export types
export type { SamlConfig, SamlUser, SamlProvider };