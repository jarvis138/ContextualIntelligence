/**
 * OAuth Service
 * 
 * Provides OAuth 2.0 authentication with PKCE support for enhanced security.
 * This service can be used with various OAuth providers including Google, Microsoft, GitHub, etc.
 */

import { Request, Response, NextFunction } from 'express';
import PKCEOAuthProvider from '../utils/oauth-pkce';
import { db } from '../db';
import { users, oauthCredentials } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AuditService, AuditCategory, AuditSeverity, AuditActions } from './auditService';
import { AuthAuditLogger, AuthAuditType } from '../utils/auth-audit-logger';
import { generateToken } from '../auth';

// Interface for OAuth provider configuration
export interface OAuthProviderConfig {
  id: string;
  name: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
  clientId: string;
  clientSecret: string;
  scope: string;
  redirectUri: string;
  enabled: boolean;
  additionalAuthParams?: Record<string, string>;
  userInfoMapping: {
    id: string;
    email: string;
    name: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
  };
}

/**
 * Service for OAuth authentication with multiple providers
 */
export class OAuthService {
  private static providers: Map<string, OAuthProviderConfig> = new Map();
  private static initialized = false;

  /**
   * Initialize the OAuth service
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Load OAuth configurations
      const configs = await this.loadOAuthConfigs();
      
      // Store configurations
      for (const config of configs) {
        if (config.enabled) {
          this.providers.set(config.id, config);
        }
      }
      
      this.initialized = true;
      console.log(`OAuth Service initialized with ${this.providers.size} providers`);
    } catch (error) {
      console.error('Failed to initialize OAuth service:', error);
    }
  }

  /**
   * Load OAuth configurations from storage or environment
   */
  private static async loadOAuthConfigs(): Promise<OAuthProviderConfig[]> {
    try {
      // Load from environment variables for now
      // In a real implementation, this would load from database
      
      const configs: OAuthProviderConfig[] = [];
      
      // Google OAuth configuration
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        configs.push({
          id: 'google',
          name: 'Google',
          authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenEndpoint: 'https://oauth2.googleapis.com/token',
          userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          scope: 'openid profile email',
          redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:5000'}/auth/google/callback`,
          enabled: true,
          userInfoMapping: {
            id: 'sub',
            email: 'email',
            name: 'name',
            firstName: 'given_name',
            lastName: 'family_name',
            picture: 'picture'
          }
        });
      }
      
      // Microsoft OAuth configuration
      if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
        configs.push({
          id: 'microsoft',
          name: 'Microsoft',
          authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
          tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
          userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          scope: 'openid profile email User.Read',
          redirectUri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:5000'}/auth/microsoft/callback`,
          enabled: true,
          userInfoMapping: {
            id: 'id',
            email: 'mail',
            name: 'displayName',
            firstName: 'givenName',
            lastName: 'surname',
            picture: undefined
          }
        });
      }
      
      // GitHub OAuth configuration
      if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        configs.push({
          id: 'github',
          name: 'GitHub',
          authorizationEndpoint: 'https://github.com/login/oauth/authorize',
          tokenEndpoint: 'https://github.com/login/oauth/access_token',
          userInfoEndpoint: 'https://api.github.com/user',
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          scope: 'read:user user:email',
          redirectUri: process.env.GITHUB_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:5000'}/auth/github/callback`,
          enabled: true,
          userInfoMapping: {
            id: 'id',
            email: 'email',
            name: 'name',
            picture: 'avatar_url'
          }
        });
      }
      
      return configs;
    } catch (error) {
      console.error('Failed to load OAuth configurations:', error);
      return [];
    }
  }

  /**
   * Register OAuth routes with Express
   * 
   * @param app Express application
   */
  static registerRoutes(app: any): void {
    // For each provider, register the necessary routes
    for (const [providerId, config] of this.providers.entries()) {
      // Authorization route
      app.get(`/auth/${providerId}`, this.handleAuthorize(providerId));
      
      // Callback route
      app.get(`/auth/${providerId}/callback`, this.handleCallback(providerId));
    }
  }

  /**
   * Create a handler for the authorization route
   * 
   * @param providerId The OAuth provider ID
   * @returns Express route handler
   */
  private static handleAuthorize(providerId: string) {
    return async (req: Request, res: Response) => {
      try {
        const config = this.providers.get(providerId);
        if (!config) {
          // Audit failed authorization attempt
          await AuthAuditLogger.logOAuthEvent(
            AuthAuditType.OAUTH_START,
            { 
              provider: providerId,
              userId: req.user?.id
            },
            `OAuth provider not found: ${providerId}`,
            {
              request: req,
              success: false,
              reason: 'Provider not configured'
            }
          );
          
          return res.status(404).send('OAuth provider not found');
        }
        
        // Generate authorization URL with PKCE
        const result = PKCEOAuthProvider.generateAuthorizationUrl(
          config.authorizationEndpoint,
          config.clientId,
          config.redirectUri,
          config.scope,
          config.additionalAuthParams
        );
        
        const url = result.url;
        const state = result.pkceData.state;
        const codeVerifier = result.pkceData.codeVerifier;
        
        // Log the OAuth authorization start
        await AuthAuditLogger.logOAuthEvent(
          AuthAuditType.OAUTH_START,
          {
            provider: providerId,
            userId: req.user?.id,
            isPkceFlow: true,
            scopeRequested: config.scope,
            state,
            redirectUri: config.redirectUri
          },
          `Started OAuth PKCE flow with ${config.name}`,
          {
            request: req
          }
        );
        
        // Redirect to the authorization URL
        res.redirect(url);
      } catch (error) {
        console.error(`OAuth authorize error (${providerId}):`, error);
        
        // Audit failed authorization attempt
        await AuthAuditLogger.logOAuthEvent(
          AuthAuditType.OAUTH_START,
          { 
            provider: providerId,
            userId: req.user?.id
          },
          `OAuth authorization error for ${providerId}`,
          {
            request: req,
            success: false,
            reason: error instanceof Error ? error.message : String(error),
            severity: AuditSeverity.ERROR
          }
        );
        
        res.status(500).send('Internal server error during authorization');
      }
    };
  }

  /**
   * Create a handler for the callback route
   * 
   * @param providerId The OAuth provider ID
   * @returns Express route handler
   */
  private static handleCallback(providerId: string) {
    return async (req: Request, res: Response) => {
      try {
        const { code, state, error, error_description } = req.query as Record<string, string>;
        
        // Check for OAuth error
        if (error) {
          console.error(`OAuth callback error (${providerId}):`, error, error_description);
          
          // Log the OAuth error
          await AuthAuditLogger.logOAuthEvent(
            AuthAuditType.OAUTH_CALLBACK,
            { 
              provider: providerId,
              userId: req.user?.id,
              state
            },
            `OAuth callback error: ${error}`,
            {
              request: req,
              success: false,
              reason: error_description || error,
              severity: AuditSeverity.WARNING
            }
          );
          
          return res.redirect(`/login?error=${encodeURIComponent(error_description || error)}`);
        }
        
        // Check for required parameters
        if (!code || !state) {
          // Log missing parameters error
          await AuthAuditLogger.logOAuthEvent(
            AuthAuditType.OAUTH_CALLBACK,
            { 
              provider: providerId,
              userId: req.user?.id
            },
            `OAuth callback missing parameters`,
            {
              request: req,
              success: false,
              reason: 'Missing required parameters (code or state)',
              severity: AuditSeverity.WARNING
            }
          );
          
          return res.redirect('/login?error=Invalid%20OAuth%20callback');
        }
        
        const config = this.providers.get(providerId);
        if (!config) {
          // Log provider not found error
          await AuthAuditLogger.logOAuthEvent(
            AuthAuditType.OAUTH_CALLBACK,
            { 
              provider: providerId,
              userId: req.user?.id
            },
            `OAuth provider not found: ${providerId}`,
            {
              request: req,
              success: false,
              reason: 'Provider not configured',
              severity: AuditSeverity.WARNING
            }
          );
          
          return res.redirect('/login?error=OAuth%20provider%20not%20found');
        }
        
        // Log received callback before token exchange
        await AuthAuditLogger.logOAuthEvent(
          AuthAuditType.OAUTH_CALLBACK,
          { 
            provider: providerId,
            userId: req.user?.id,
            state,
            isPkceFlow: true
          },
          `Received OAuth callback for ${config.name}`,
          { request: req }
        );
        
        // Exchange code for token using PKCE
        const tokenResponse = await PKCEOAuthProvider.exchangeCodeForToken(
          config.tokenEndpoint,
          config.clientId,
          config.redirectUri,
          code,
          state,
          config.clientSecret
        );
        
        // Log successful token exchange
        await AuthAuditLogger.logOAuthEvent(
          AuthAuditType.OAUTH_TOKEN_EXCHANGE,
          { 
            provider: providerId,
            userId: req.user?.id,
            state,
            isPkceFlow: true,
            scopeRequested: tokenResponse.scope
          },
          `Successfully exchanged authorization code for tokens with ${config.name}`,
          { request: req }
        );
        
        // Get user info
        const userInfo = await this.getUserInfo(config, tokenResponse.access_token);
        
        // Find or create user
        const user = await this.findOrCreateUser(providerId, userInfo, tokenResponse);
        
        // Generate JWT token
        const token = generateToken({
          id: user.id,
          username: user.username,
          role: user.role
        });
        
        // Log successful authentication
        await AuthAuditLogger.logAuthEvent(
          AuthAuditType.LOGIN,
          user.id,
          `User ${user.username} logged in using ${config.name}`,
          {
            request: req,
            success: true,
            metadata: {
              provider: providerId,
              providerUserId: userInfo[config.userInfoMapping.id],
              authMethod: 'oauth',
              isNewUser: !userInfo.id
            }
          }
        );
        
        // Log token creation
        await AuthAuditLogger.logTokenEvent(
          AuthAuditType.TOKEN_REFRESH,
          {
            userId: user.id,
            tokenType: 'access',
            source: 'oauth',
            expiresAt: new Date(Date.now() + 3600000) // Assuming 1 hour token
          },
          `Created access token for user ${user.username}`,
          {
            request: req,
            success: true
          }
        );
        
        // Redirect to frontend with token
        res.redirect(`/auth/callback?token=${token}`);
      } catch (error) {
        console.error(`OAuth callback error (${providerId}):`, error);
        
        // Log the error
        await AuthAuditLogger.logOAuthEvent(
          AuthAuditType.OAUTH_CALLBACK,
          { 
            provider: providerId,
            userId: req.user?.id
          },
          `OAuth callback processing error for ${providerId}`,
          {
            request: req,
            success: false,
            reason: error instanceof Error ? error.message : String(error),
            severity: AuditSeverity.ERROR
          }
        );
        
        res.redirect(`/login?error=${encodeURIComponent('Authentication failed')}`);
      }
    };
  }

  /**
   * Get user information from the OAuth provider
   * 
   * @param config OAuth provider configuration
   * @param accessToken OAuth access token
   * @returns User information object
   */
  private static async getUserInfo(config: OAuthProviderConfig, accessToken: string): Promise<any> {
    const response = await fetch(config.userInfoEndpoint, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
    }
    
    const userInfo = await response.json();
    
    // For GitHub, we might need to fetch email separately if not included
    if (config.id === 'github' && !userInfo.email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (emailsResponse.ok) {
        const emails = await emailsResponse.json();
        const primaryEmail = emails.find((email: any) => email.primary);
        
        if (primaryEmail) {
          userInfo.email = primaryEmail.email;
        }
      }
    }
    
    return userInfo;
  }

  /**
   * Find or create a user based on OAuth profile
   * 
   * @param providerId OAuth provider ID
   * @param userInfo User information from OAuth provider
   * @param tokenResponse Token response from OAuth provider
   * @returns User object
   */
  private static async findOrCreateUser(providerId: string, userInfo: any, tokenResponse: any): Promise<any> {
    const config = this.providers.get(providerId);
    if (!config) {
      throw new Error(`OAuth provider ${providerId} not found`);
    }
    
    // Extract profile info using the mapping
    const mapping = config.userInfoMapping;
    const externalId = userInfo[mapping.id]?.toString();
    const email = userInfo[mapping.email];
    const name = userInfo[mapping.name];
    const firstName = mapping.firstName ? userInfo[mapping.firstName] : null;
    const lastName = mapping.lastName ? userInfo[mapping.lastName] : null;
    const picture = mapping.picture ? userInfo[mapping.picture] : null;
    
    if (!externalId || !email) {
      throw new Error('OAuth provider did not return required user information');
    }
    
    // Look for existing user with this provider ID
    const existingOAuthUsers = await db.select()
      .from(oauthCredentials)
      .where(
        and(
          eq(oauthCredentials.providerId, providerId),
          eq(oauthCredentials.providerUserId, externalId)
        )
      )
      .limit(1);
    
    if (existingOAuthUsers.length > 0) {
      // Get the user record
      const credential = existingOAuthUsers[0];
      const existingUsers = await db.select()
        .from(users)
        .where(eq(users.id, credential.userId))
        .limit(1);
      
      if (existingUsers.length > 0) {
        const user = existingUsers[0];
        
        // Update OAuth credentials with new tokens
        await db.update(oauthCredentials)
          .set({
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || credential.refreshToken,
            expiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : null,
            updatedAt: new Date()
          })
          .where(eq(oauthCredentials.id, credential.id));
        
        return user;
      }
    }
    
    // No existing user, create a new one
    
    // Create username from email
    const username = email.split('@')[0];
    
    // Set up user data
    const userData = {
      username,
      email,
      firstName: firstName || (name ? name.split(' ')[0] : username),
      lastName: lastName || (name && name.includes(' ') ? name.split(' ').slice(1).join(' ') : ''),
      fullName: name || username,
      profilePicture: picture,
      authMethod: 'oauth',
      authProvider: providerId,
      role: 'user',
      active: true,
      // Additional fields as required
    };
    
    // Create the user using the schema field names (not DB column names)
    const [createdUser] = await db.insert(users)
      .values({
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
        avatar: userData.profilePicture,
        role: userData.role,
        authMethod: userData.authMethod,
        externalId: externalId
      })
      .returning();
    
    // Store OAuth credentials
    await db.insert(oauthCredentials)
      .values({
        userId: createdUser.id,
        providerId,
        providerUserId: externalId,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        idToken: tokenResponse.id_token,
        expiresAt: tokenResponse.expires_in ? new Date(Date.now() + tokenResponse.expires_in * 1000) : null
      });
    
    return createdUser;
  }
}

export default OAuthService;