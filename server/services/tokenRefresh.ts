import { TokenStorage } from './tokenStorage';
import axios from 'axios';
import { OAuthToken } from '@shared/schema';
import { oauthConfig, type OAuthConfig } from '../config/oauth';
import { storage } from '../storage';
import { Request, Response, NextFunction } from 'express';

/**
 * Service responsible for refreshing expired OAuth tokens
 */
export class TokenRefresh {
  /**
   * Refreshes an OAuth access token using the refresh token if available
   * @param userId User ID associated with the token
   * @param provider OAuth provider (google, microsoft, slack)
   * @returns New refreshed token data or null if refresh failed
   */
  public static async refreshAccessToken(userId: number, provider: string): Promise<OAuthToken | null> {
    try {
      // Get the refresh token for this user and provider
      const refreshToken = await TokenStorage.getRefreshToken(userId, provider);
      
      if (!refreshToken) {
        console.warn(`No refresh token found for user ${userId} and provider ${provider}`);
        return null;
      }
      
      // Get the provider configuration
      const providerSettings = await storage.getOAuthProviderSetting(provider);
      if (!providerSettings || !providerSettings.enabled) {
        console.warn(`Provider ${provider} is not enabled or configured`);
        return null;
      }
      
      // Get the token endpoint for this provider
      const providerConfig = (provider === 'google' || provider === 'microsoft' || provider === 'slack') 
        ? oauthConfig[provider] 
        : null;
        
      if (!providerConfig || !providerConfig.tokenUrl) {
        console.error(`No token endpoint found for provider ${provider}`);
        return null;
      }
      
      const tokenEndpoint = providerConfig.tokenUrl;
      
      // Execute the token refresh
      const response = await axios.post(tokenEndpoint, {
        client_id: providerSettings.clientId,
        client_secret: providerSettings.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.status !== 200 || !response.data.access_token) {
        console.error('Token refresh failed:', response.status, response.data);
        return null;
      }
      
      // Store the new tokens
      const tokenData = response.data;
      const tokenId = await TokenStorage.storeOAuthToken(
        userId,
        provider,
        tokenData.access_token,
        tokenData.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep the old one
        tokenData.expires_in,
        tokenData
      );
      
      // Return the new token
      return await storage.getOAuthToken(userId, provider);
      
    } catch (error) {
      console.error('Failed to refresh access token:', error);
      return null;
    }
  }
  
  /**
   * Rotates refresh tokens as a security measure
   * @param userId User ID of the token owner
   * @param provider OAuth provider
   * @param oldToken The old refresh token to be rotated
   * @param newToken The new refresh token to replace it with
   * @returns Whether the rotation was successful
   */
  public static async rotateRefreshToken(
    userId: number,
    provider: string,
    oldToken: string,
    newToken: string
  ): Promise<boolean> {
    try {
      // Revoke the old token first
      const tokenRevoked = await TokenStorage.revokeToken(userId, provider);
      
      if (!tokenRevoked) {
        console.warn(`Failed to revoke old refresh token for user ${userId}`);
        // Continue anyway, as we still want to save the new token
      }
      
      // Calculate a reasonable expiration date (90 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 90);
      
      // Store the new refresh token
      const tokenId = await TokenStorage.storeRefreshToken(userId, newToken, expiresAt);
      
      return !!tokenId;
    } catch (error) {
      console.error('Failed to rotate refresh token:', error);
      return false;
    }
  }
  
  /**
   * Periodically refreshes a token to prevent expiration
   * @param userId User ID of the token owner
   * @param provider OAuth provider
   * @param refreshInterval How often to refresh the token (in ms), defaults to 1 hour
   */
  public static scheduleTokenRefresh(
    userId: number,
    provider: string,
    refreshInterval: number = 3600000
  ): NodeJS.Timeout {
    return setInterval(async () => {
      const token = await storage.getOAuthToken(userId, provider);
      
      if (!token) {
        console.warn(`No token found for scheduled refresh (user: ${userId}, provider: ${provider})`);
        return;
      }
      
      // Check if token is close to expiry (within 15 minutes)
      const isNearExpiry = token.expiresAt && 
        (new Date(token.expiresAt).getTime() - Date.now() < 900000);
      
      if (isNearExpiry) {
        console.log(`Refreshing token for user ${userId} and provider ${provider}`);
        await TokenRefresh.refreshAccessToken(userId, provider);
      }
    }, refreshInterval);
  }
  
  /**
   * Middleware that automatically refreshes expired tokens when needed
   */
  public static createTokenRefreshMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return next();
      }
      
      const userId = req.user.id;
      
      // If the request has a specific provider in the path, check that token
      const pathMatch = req.path.match(/\/api\/(google|microsoft|slack)\//i);
      if (pathMatch) {
        const provider = pathMatch[1].toLowerCase();
        const token = await storage.getOAuthToken(userId, provider);
        
        if (token && token.expiresAt && new Date(token.expiresAt) < new Date()) {
          // Token is expired, attempt to refresh
          const refreshedToken = await TokenRefresh.refreshAccessToken(userId, provider);
          if (!refreshedToken) {
            return res.status(401).json({ 
              error: 'Token expired', 
              message: 'Your authentication token has expired and could not be refreshed' 
            });
          }
        }
      } else {
        // For all other requests, don't block but still check all tokens in background
        const providers = ['google', 'microsoft', 'slack'];
        for (const provider of providers) {
          const token = await storage.getOAuthToken(userId, provider);
          if (token && token.expiresAt && new Date(token.expiresAt) < new Date()) {
            // Don't await here to avoid blocking the request
            TokenRefresh.refreshAccessToken(userId, provider).catch(err => {
              console.error(`Background token refresh failed for ${provider}:`, err);
            });
          }
        }
      }
      
      return next();
    };
  }
}