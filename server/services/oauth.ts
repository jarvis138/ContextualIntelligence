import { db } from "../db";
import { TokenStorage } from "./tokenStorage";
import { PKCEService } from "./pkceService";
import axios from "axios";
import { eq } from "drizzle-orm";
import { oauthProviderSettings } from "@shared/schema";
import crypto from "crypto";
import type { Express } from "express";

// OAuth provider configuration interface
interface OAuthProviderConfig {
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  revokeUrl?: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  accessType?: string;
  responseType?: string;
  redirectUri: string;
}

// Configuration for supported OAuth providers
const providers: Record<string, Partial<OAuthProviderConfig>> = {
  google: {
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v3/userinfo",
    revokeUrl: "https://oauth2.googleapis.com/revoke",
    scopes: ["openid", "profile", "email"],
    accessType: "offline",
    responseType: "code"
  },
  microsoft: {
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    userInfoUrl: "https://graph.microsoft.com/v1.0/me",
    revokeUrl: undefined, // Microsoft doesn't have a standard revoke endpoint
    scopes: ["openid", "profile", "email", "User.Read"],
    responseType: "code"
  },
  slack: {
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    userInfoUrl: "https://slack.com/api/users.identity",
    revokeUrl: "https://slack.com/api/auth.revoke",
    scopes: ["channels:read", "chat:write", "team:read", "users:read"],
    responseType: "code"
  }
};

/**
 * Configure OAuth strategies for passport authentication
 * @param app Express application
 */
export function configureOAuthStrategies(app: Express) {
  console.log('OAuth strategies configuration placeholder');
  // This is a placeholder for OAuth strategy configuration
  // The actual implementation would set up passport strategies for each provider
  // Currently, we're using a custom OAuth implementation with PKCE
}

// OAuth service helper class
export class OAuthService {
  /**
   * Get all available OAuth providers and their configuration
   */
  static async getAvailableProviders() {
    const providerList = Object.keys(providers);
    
    // Return the list of available providers with minimal info
    return providerList.map(id => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      configurable: true,
    }));
  }
  
  /**
   * Get configuration for a specific provider
   */
  static async getProviderConfig(providerId: string): Promise<OAuthProviderConfig> {
    // Get base configuration
    const baseConfig = providers[providerId];
    if (!baseConfig) {
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
    }
    
    // Get stored provider settings
    const [storedSettings] = await db
      .select()
      .from(oauthProviderSettings)
      .where(eq(oauthProviderSettings.providerId, providerId));
    
    if (!storedSettings) {
      throw new Error(`Provider settings not found for ${providerId}`);
    }
    
    // Create complete configuration
    return {
      ...baseConfig,
      clientId: storedSettings.clientId,
      clientSecret: storedSettings.clientSecret,
      redirectUri: `${process.env.APP_URL || ""}/oauth/callback/${providerId}`,
    } as OAuthProviderConfig;
  }
  
  /**
   * Generate authorization URL for OAuth flow
   */
  static async generateAuthorizationUrl(provider: string, userId: number) {
    try {
      // Get provider configuration
      const config = await OAuthService.getProviderConfig(provider);
      
      // Generate PKCE challenge
      const codeVerifier = PKCEService.generateCodeVerifier();
      const codeChallenge = PKCEService.generateCodeChallenge(codeVerifier);
      
      // Generate state parameter (used to prevent CSRF)
      const state = PKCEService.generateState();
      
      // Store code verifier for later use
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiration
      await PKCEService.storePkceCodeVerifier({
        state,
        codeVerifier,
        codeChallenge,
        userId,
        expiresAt,
        used: false,
        provider,
        redirectUri: config.redirectUri,
        scope: config.scopes.join(' ')
      });
      
      // Build authorization URL
      const authUrl = new URL(config.authorizeUrl);
      
      // Add common parameters
      authUrl.searchParams.append('client_id', config.clientId);
      authUrl.searchParams.append('redirect_uri', config.redirectUri);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('response_type', config.responseType || 'code');
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('code_challenge_method', 'S256');
      
      // Add scopes
      authUrl.searchParams.append('scope', config.scopes.join(' '));
      
      // Add provider-specific parameters
      if (config.accessType) {
        authUrl.searchParams.append('access_type', config.accessType);
      }
      
      // Return authorization URL
      return authUrl.toString();
    } catch (error) {
      console.error(`Error generating authorization URL for ${provider}:`, error);
      throw new Error(`Failed to generate authorization URL for ${provider}`);
    }
  }
  
  /**
   * Exchange authorization code for tokens
   */
  static async exchangeCodeForTokens(provider: string, code: string, state: string) {
    try {
      // Get provider configuration
      const config = await OAuthService.getProviderConfig(provider);
      
      // Get PKCE code verifier
      const verifier = await PKCEService.getPkceCodeVerifierByState(state);
      if (!verifier) {
        throw new Error('Invalid or expired state parameter');
      }
      const { codeVerifier, userId } = verifier;
      if (!codeVerifier) {
        throw new Error('Invalid or expired state parameter');
      }
      
      // Build token request
      const tokenRequest = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code'
      };
      
      // Exchange code for tokens
      const response = await axios.post(config.tokenUrl, new URLSearchParams(tokenRequest as Record<string, string>), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const tokens = response.data;
      
      // Get user info if provider supports it
      let userInfo = null;
      if (config.userInfoUrl) {
        const userInfoResponse = await axios.get(config.userInfoUrl, {
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        });
        userInfo = userInfoResponse.data;
      }
      
      // Mark code verifier as used to prevent replay attacks
      await PKCEService.markPkceCodeVerifierAsUsed(state);
      
      // Store tokens
      const expiresIn = tokens.expires_in || 3600; // Default to 1 hour if not provided
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      
      if (userId) {
        await TokenStorage.storeOAuthToken(
          userId,
          provider,
          tokens.access_token,
          tokens.refresh_token || null,
          expiresAt
        );
      }
      
      return {
        tokens,
        userInfo,
        userId
      };
    } catch (error) {
      console.error(`Error exchanging code for tokens for ${provider}:`, error);
      throw new Error(`Failed to exchange code for tokens for ${provider}`);
    }
  }
  
  /**
   * Create or update user from OAuth info
   */
  static async createOrUpdateUserFromOAuth(provider: string, userInfo: any, userId?: number) {
    // This method would typically create or update a user in the database
    // based on the provided OAuth user info and link it to the OAuth account
    
    // For now, we'll just return the user info since user management
    // is already implemented separately
    return {
      id: userId,
      provider,
      providerUserId: userInfo.id || userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.display_name,
      profilePicture: userInfo.picture || userInfo.image_url
    };
  }
  
  /**
   * Revoke an OAuth token
   */
  static async revokeToken(userId: number, provider: string): Promise<boolean> {
    try {
      // Get provider configuration
      const config = await OAuthService.getProviderConfig(provider);
      
      // Get token to revoke
      const accessToken = await TokenStorage.getAccessToken(userId, provider);
      
      if (!accessToken) {
        // If no token found, consider it already revoked
        return true;
      }
      
      // If provider supports token revocation
      if (config.revokeUrl) {
        try {
          await axios.post(config.revokeUrl, new URLSearchParams({
            token: accessToken,
            client_id: config.clientId,
            ...(config.clientSecret ? { client_secret: config.clientSecret } : {})
          }), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
        } catch (error) {
          console.error(`Error revoking token for ${provider}:`, error);
          // Continue to delete token from our storage even if revocation fails
        }
      }
      
      // Remove token from storage
      await TokenStorage.revokeToken(userId, provider);
      
      return true;
    } catch (error) {
      console.error(`Error revoking token for ${provider}:`, error);
      throw new Error(`Failed to revoke token for ${provider}`);
    }
  }
}