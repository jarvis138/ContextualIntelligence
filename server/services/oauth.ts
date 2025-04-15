/**
 * OAuth Service
 * 
 * This service handles OAuth 2.0 authorization with PKCE for various providers including Google,
 * Microsoft, and Slack. It includes methods for generating authorization URLs, token exchange,
 * token refresh, and token revocation.
 */

import axios from 'axios';
import querystring from 'querystring';
import { storage } from '../storage';
import { PKCEService } from './pkceService';
import { TokenStorage } from './tokenStorage';
import { oauthConfig } from '../config/oauth';
import { db } from '../db';
import { oauthProviderSettings, users, oauthTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

// Types for OAuth responses
interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

interface UserInfoResponse {
  id?: string;
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: any;
}

/**
 * Configure OAuth strategies for Passport
 * @param app Express application
 */
export function configureOAuthStrategies(app: any) {
  // Implementation will be added as needed
  // This sets up OAuth providers with Passport
  console.log('OAuth strategies configuration placeholder');
}

export class OAuthService {
  /**
   * Generate an authorization URL for a specific provider
   * 
   * @param providerId The OAuth provider ID (google, microsoft, slack)
   * @param userId The user ID requesting authorization
   * @param redirectUri The redirect URI after authorization
   * @returns An object containing the authorization URL and state
   */
  static async generateAuthorizationUrl(providerId: string, userId?: number, redirectUri?: string) {
    // Get provider configuration from database or fallback to static config
    const providerSetting = await storage.getOAuthProviderSetting(providerId);
    const providerBaseConfig = oauthConfig[providerId as keyof typeof oauthConfig];
    
    if (!providerBaseConfig) {
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
    }
    
    // Use dynamic provider settings from DB if available, otherwise use static config
    const clientId = providerSetting?.clientId || providerBaseConfig.clientID;
    const scope = providerSetting?.scope || providerBaseConfig.scope.join(' ');
    const authorizeUrl = providerBaseConfig.authorizeUrl;
    
    if (!clientId) {
      throw new Error(`Missing client ID for provider: ${providerId}`);
    }
    
    if (!authorizeUrl) {
      throw new Error(`Missing authorization URL for provider: ${providerId}`);
    }
    
    // Use actual redirect URI or fallback to configured one
    const finalRedirectUri = redirectUri || providerBaseConfig.callbackURL;
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = PKCEService.generateCodeVerifier();
    const codeChallenge = PKCEService.generateCodeChallenge(codeVerifier);
    
    // Generate state for CSRF protection
    const state = PKCEService.generateState();
    
    // Set expiration time for code verifier (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    
    // Store PKCE data in the database
    await PKCEService.storePkceCodeVerifier({
      userId,
      codeVerifier,
      codeChallenge,
      state,
      provider: providerId,
      redirectUri: finalRedirectUri,
      scope,
      expiresAt,
      used: false,
    });
    
    // Generate authorization URL
    const params = {
      client_id: clientId,
      redirect_uri: finalRedirectUri,
      response_type: 'code',
      scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'offline', // For refresh tokens
      prompt: 'consent', // Force consent to ensure refresh tokens
    };
    
    const authUrl = `${authorizeUrl}?${querystring.stringify(params)}`;
    
    return {
      authorizationUrl: authUrl,
      state,
    };
  }
  
  /**
   * Exchange an authorization code for tokens
   * 
   * @param providerId The OAuth provider ID
   * @param code The authorization code
   * @param state The state from the authorization request
   * @returns The tokens and user info
   */
  static async exchangeCodeForTokens(providerId: string, code: string, state: string) {
    // Retrieve the PKCE code verifier from the database using the state
    const verifier = await PKCEService.getPkceCodeVerifierByState(state);
    
    if (!verifier) {
      throw new Error(`Invalid state parameter: ${state}`);
    }
    
    if (verifier.used) {
      throw new Error('Authorization code has already been used');
    }
    
    if (verifier.expiresAt < new Date()) {
      throw new Error('Authorization code has expired');
    }
    
    // Get provider configuration
    const providerSetting = await storage.getOAuthProviderSetting(providerId);
    const providerBaseConfig = oauthConfig[providerId as keyof typeof oauthConfig];
    
    if (!providerBaseConfig) {
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
    }
    
    // Use dynamic provider settings from DB if available, otherwise use static config
    const clientId = providerSetting?.clientId || providerBaseConfig.clientID;
    const clientSecret = providerSetting?.clientSecret || providerBaseConfig.clientSecret;
    const tokenUrl = providerBaseConfig.tokenUrl;
    
    if (!tokenUrl) {
      throw new Error(`Missing token URL for provider: ${providerId}`);
    }
    
    // Exchange the code for tokens
    try {
      const tokenParams = {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: verifier.codeVerifier,
        redirect_uri: verifier.redirectUri,
        grant_type: 'authorization_code',
      };

      // Make the token request
      const tokenResponse = await axios.post<TokenResponse>(
        tokenUrl,
        querystring.stringify(tokenParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const tokens = tokenResponse.data;
      
      // Mark the code verifier as used
      await PKCEService.markPkceCodeVerifierAsUsed(state);
      
      // Get user info using the access token
      const userInfo = await this.getUserInfo(providerId, tokens.access_token);
      
      // Calculate token expiration time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);
      
      // Store tokens if userId is available
      if (verifier.userId) {
        await TokenStorage.storeOAuthToken(
          verifier.userId,
          providerId,
          tokens.access_token,
          tokens.refresh_token || null,
          expiresAt
        );
      }
      
      return {
        tokens,
        userInfo,
        userId: verifier.userId,
      };
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw new Error(`Failed to exchange authorization code: ${error.message}`);
    }
  }
  
  /**
   * Get user information from an OAuth provider using an access token
   * 
   * @param providerId The OAuth provider ID
   * @param accessToken The OAuth access token
   * @returns The user information from the provider
   */
  static async getUserInfo(providerId: string, accessToken: string): Promise<UserInfoResponse> {
    const providerConfig = oauthConfig[providerId as keyof typeof oauthConfig];
    
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
    }
    
    const userInfoUrl = providerConfig.userInfoUrl;
    
    if (!userInfoUrl) {
      throw new Error(`Missing user info URL for provider: ${providerId}`);
    }
    
    try {
      const response = await axios.get<UserInfoResponse>(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching user info:', error);
      throw new Error(`Failed to fetch user info: ${error.message}`);
    }
  }
  
  /**
   * Refresh an OAuth token
   * 
   * @param userId The user ID
   * @param providerId The OAuth provider ID
   * @returns The refreshed tokens
   */
  static async refreshToken(userId: number, providerId: string) {
    // Get the refresh token from storage
    const refreshToken = await TokenStorage.getRefreshToken(userId, providerId);
    
    if (!refreshToken) {
      throw new Error(`No refresh token found for user ${userId} and provider ${providerId}`);
    }
    
    // Get provider configuration
    const providerSetting = await storage.getOAuthProviderSetting(providerId);
    const providerBaseConfig = oauthConfig[providerId as keyof typeof oauthConfig];
    
    if (!providerBaseConfig) {
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
    }
    
    const clientId = providerSetting?.clientId || providerBaseConfig.clientID;
    const clientSecret = providerSetting?.clientSecret || providerBaseConfig.clientSecret;
    const tokenUrl = providerBaseConfig.tokenUrl;
    
    if (!tokenUrl) {
      throw new Error(`Missing token URL for provider: ${providerId}`);
    }
    
    try {
      // Prepare refresh token request
      const refreshParams = {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      };
      
      // Make the refresh token request
      const response = await axios.post<TokenResponse>(
        tokenUrl,
        querystring.stringify(refreshParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      const tokens = response.data;
      
      // Calculate token expiration time
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);
      
      // Store the new tokens
      await TokenStorage.storeOAuthToken(
        userId,
        providerId,
        tokens.access_token,
        tokens.refresh_token || refreshToken, // Use the new refresh token or keep the old one
        expiresAt
      );
      
      return tokens;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw new Error(`Failed to refresh token: ${error.message}`);
    }
  }
  
  /**
   * Revoke an OAuth token
   * 
   * @param userId The user ID
   * @param providerId The OAuth provider ID
   * @returns Whether the revocation was successful
   */
  static async revokeToken(userId: number, providerId: string) {
    const providerConfig = oauthConfig[providerId as keyof typeof oauthConfig];
    
    if (!providerConfig) {
      throw new Error(`Unsupported OAuth provider: ${providerId}`);
    }
    
    const revokeUrl = providerConfig.revokeUrl;
    
    if (!revokeUrl) {
      // If no revoke URL is available, just remove the token from storage
      return await TokenStorage.revokeToken(userId, providerId);
    }
    
    // Get the access token from storage
    const accessToken = await TokenStorage.getAccessToken(userId, providerId);
    
    if (!accessToken) {
      throw new Error(`No access token found for user ${userId} and provider ${providerId}`);
    }
    
    // Get provider configuration
    const providerSetting = await storage.getOAuthProviderSetting(providerId);
    const clientId = providerSetting?.clientId || providerConfig.clientID;
    
    try {
      // Prepare revoke token request
      const revokeParams = {
        client_id: clientId,
        token: accessToken,
        token_type_hint: 'access_token',
      };
      
      // Make the revoke token request
      await axios.post(
        revokeUrl,
        querystring.stringify(revokeParams),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      // Remove the token from storage
      await TokenStorage.revokeToken(userId, providerId);
      
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      
      // Even if the revocation fails on the provider side, we should still
      // remove the token from our storage
      await TokenStorage.revokeToken(userId, providerId);
      
      return false;
    }
  }
  
  /**
   * Create or update a user from OAuth user info
   * 
   * @param providerId The OAuth provider ID
   * @param userInfo The user info from the OAuth provider
   * @param existingUserId Optional existing user ID to update
   * @returns The user
   */
  static async createOrUpdateUserFromOAuth(
    providerId: string,
    userInfo: UserInfoResponse,
    existingUserId?: number
  ) {
    // Extract user data from provider-specific format
    const email = userInfo.email;
    const externalId = userInfo.id || userInfo.sub;
    const name = userInfo.name || `${userInfo.given_name || ''} ${userInfo.family_name || ''}`.trim();
    const picture = userInfo.picture;
    
    if (!email || !externalId) {
      throw new Error('OAuth provider did not return required user information (email or ID)');
    }
    
    try {
      // Check if we have an existing user with this external ID and provider
      let user;
      
      if (existingUserId) {
        // Update existing user
        const [updatedUser] = await db.update(users)
          .set({
            email,
            fullName: name,
            avatar: picture || null,
          })
          .where(eq(users.id, existingUserId))
          .returning();
        
        user = updatedUser;
      } else {
        // Check if user exists by external ID
        const [existingUserByExtId] = await db.select()
          .from(users)
          .where(
            and(
              eq(users.authMethod, providerId as any),
              eq(users.externalId as any, externalId)
            )
          );
        
        if (existingUserByExtId) {
          // Update existing user
          const [updatedUser] = await db.update(users)
            .set({
              email,
              fullName: name,
              avatar: picture || null,
            })
            .where(eq(users.id, existingUserByExtId.id))
            .returning();
          
          user = updatedUser;
        } else {
          // Check if user exists by email
          const [existingUserByEmail] = await db.select()
            .from(users)
            .where(eq(users.email, email));
          
          if (existingUserByEmail) {
            // Update existing user to connect OAuth
            const [updatedUser] = await db.update(users)
              .set({
                authMethod: providerId as any,
                externalId,
                fullName: name || existingUserByEmail.fullName,
                avatar: picture || existingUserByEmail.avatar,
              })
              .where(eq(users.id, existingUserByEmail.id))
              .returning();
            
            user = updatedUser;
          } else {
            // Create new user
            const [newUser] = await db.insert(users)
              .values({
                username: email.split('@')[0] + '-' + Math.floor(Math.random() * 1000),
                email,
                fullName: name,
                authMethod: providerId as any,
                externalId,
                avatar: picture || null,
                role: 'user',
                password: null,
              })
              .returning();
            
            user = newUser;
          }
        }
      }
      
      return user;
    } catch (error) {
      console.error('Error creating/updating user from OAuth:', error);
      throw new Error(`Failed to create/update user: ${error.message}`);
    }
  }
  
  /**
   * Connect an OAuth provider to an existing user
   * 
   * @param userId The user ID to connect to
   * @param providerId The OAuth provider ID
   * @param code The authorization code
   * @param state The state from the authorization request
   * @returns The updated user
   */
  static async connectProviderToUser(userId: number, providerId: string, code: string, state: string) {
    // Exchange code for tokens
    const { tokens, userInfo } = await this.exchangeCodeForTokens(providerId, code, state);
    
    // Update user with OAuth provider info
    const user = await this.createOrUpdateUserFromOAuth(providerId, userInfo, userId);
    
    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);
    
    // Store OAuth tokens
    await TokenStorage.storeOAuthToken(
      user.id,
      providerId,
      tokens.access_token,
      tokens.refresh_token || null,
      expiresAt
    );
    
    return user;
  }
  
  /**
   * Disconnect an OAuth provider from a user
   * 
   * @param userId The user ID
   * @param providerId The OAuth provider ID
   * @returns Whether the disconnection was successful
   */
  static async disconnectProviderFromUser(userId: number, providerId: string) {
    try {
      // Revoke the token at the provider
      await this.revokeToken(userId, providerId);
      
      // Update user to remove OAuth connection if this isn't their primary auth method
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user && user.authMethod === providerId) {
        // If this is their primary auth method, they need to have a password set
        // before we can disconnect this provider
        if (!user.password) {
          throw new Error('Cannot disconnect primary authentication method without setting a password first');
        }
        
        // Update to local auth method
        await db.update(users)
          .set({
            authMethod: 'local',
            externalId: null,
          })
          .where(eq(users.id, userId));
      }
      
      // Remove tokens from database
      await db.delete(oauthTokens)
        .where(
          and(
            eq(oauthTokens.userId, userId),
            eq(oauthTokens.provider, providerId)
          )
        );
      
      return true;
    } catch (error) {
      console.error('Error disconnecting provider:', error);
      throw new Error(`Failed to disconnect provider: ${error.message}`);
    }
  }
  
  /**
   * Get a user's connected OAuth providers
   * 
   * @param userId The user ID
   * @returns Array of connected provider IDs
   */
  static async getUserConnectedProviders(userId: number) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Get all OAuth tokens for this user
    const tokens = await db.select()
      .from(oauthTokens)
      .where(eq(oauthTokens.userId, userId));
    
    // Create a set of connected providers
    const providers = new Set<string>();
    
    // Add the user's primary auth method if it's not local
    if (user.authMethod !== 'local') {
      providers.add(user.authMethod);
    }
    
    // Add all providers with tokens
    for (const token of tokens) {
      providers.add(token.provider);
    }
    
    return Array.from(providers);
  }
}