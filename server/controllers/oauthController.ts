/**
 * OAuth Controller
 * 
 * This controller handles OAuth2.0 flows with PKCE for different providers.
 * It manages authorization requests, callbacks, and token refresh operations.
 */

import { Request, Response } from 'express';
import { OAuthService } from '../services/oauth';
import { PKCEService } from '../services/pkceService';
import { TokenStorage } from '../services/tokenStorage';
import { storage } from '../storage';
import { z } from 'zod';

// Schema for OAuth callback validation
const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required')
});

/**
 * Get available OAuth providers and their status
 */
export async function getOAuthProviders(req: Request, res: Response) {
  try {
    // Get all OAuth provider settings from database
    const providers = await storage.getOAuthProviderSettings();
    
    // Format providers for client consumption
    const formattedProviders = providers.reduce((acc: any, provider) => {
      acc[provider.providerId] = provider.enabled && !!provider.clientId && !!provider.clientSecret;
      return acc;
    }, { local: true }); // Local auth is always enabled
    
    res.json({ providers: formattedProviders });
  } catch (error) {
    console.error('Error fetching OAuth providers:', error);
    res.status(500).json({ 
      message: 'Failed to fetch OAuth providers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate authorization URL for OAuth provider
 */
export async function authorizeOAuthProvider(req: Request, res: Response) {
  const { provider } = req.params;
  const userId = req.user?.id || undefined; // Convert potential null to undefined
  const redirectUri = req.query.redirectUri as string | undefined;
  
  try {
    // Validate provider is supported
    if (!provider || !['google', 'microsoft', 'slack', 'github'].includes(provider)) {
      return res.status(400).json({ message: `Unsupported OAuth provider: ${provider}` });
    }
    
    // Check if provider is configured and enabled
    const providerSetting = await storage.getOAuthProviderSetting(provider);
    if (!providerSetting || !providerSetting.enabled) {
      return res.status(400).json({ message: `OAuth provider ${provider} is not configured or enabled` });
    }
    
    // Generate authorization URL with PKCE
    const { authorizationUrl, state } = await OAuthService.generateAuthorizationUrl(
      provider,
      userId,
      redirectUri
    );
    
    // Return the authorization URL and state to the client
    res.json({ authorizationUrl, state });
  } catch (error) {
    console.error(`Error generating ${provider} authorization URL:`, error);
    res.status(500).json({ 
      message: `Failed to generate authorization URL for ${provider}`,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Handle OAuth callback and token exchange
 */
export async function handleOAuthCallback(req: Request, res: Response) {
  const { provider } = req.params;
  
  try {
    // Validate request body
    const validation = oauthCallbackSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Invalid request parameters',
        errors: validation.error.errors
      });
    }
    
    const { code, state } = validation.data;
    
    // Exchange the code for tokens
    const result = await OAuthService.exchangeCodeForTokens(provider, code, state);
    
    // Create or update user from OAuth userInfo if needed
    let user = null;
    if (result.userInfo) {
      user = await OAuthService.createOrUpdateUserFromOAuth(
        provider,
        result.userInfo,
        result.userId
      );
    }
    
    // Clean up verifier (this happens in exchangeCodeForTokens, but we make sure it's done)
    await PKCEService.markPkceCodeVerifierAsUsed(state);
    
    // Return successful response with user and tokens
    res.json({
      success: true,
      user,
      provider,
      accessTokenExpires: result.tokens.expires_in,
      // Don't send the actual tokens back to the client for security reasons
    });
  } catch (error) {
    console.error(`Error handling ${provider} OAuth callback:`, error);
    res.status(500).json({ 
      message: `Authentication with ${provider} failed`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Revoke OAuth tokens for a provider
 */
export async function revokeOAuthToken(req: Request, res: Response) {
  const { provider } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  
  try {
    // Revoke the token both on the provider and in our database
    const success = await OAuthService.revokeToken(userId, provider);
    
    res.json({
      success,
      message: success 
        ? `Successfully disconnected from ${provider}` 
        : `Removed ${provider} connection, but provider revocation may have failed`
    });
  } catch (error) {
    console.error(`Error revoking ${provider} token:`, error);
    res.status(500).json({ 
      message: `Failed to revoke token for ${provider}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get all connected OAuth providers for the current user
 */
export async function getUserConnectedProviders(req: Request, res: Response) {
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ message: 'User not authenticated' });
  }
  
  try {
    // Get all OAuth tokens for the user
    const tokens = await TokenStorage.getUserOAuthTokens(userId);
    
    // Format the response to simply indicate which providers are connected
    const connectedProviders = tokens.reduce((acc: any, token) => {
      acc[token.provider] = true;
      return acc;
    }, {});
    
    res.json({ connectedProviders });
  } catch (error) {
    console.error('Error fetching user connected providers:', error);
    res.status(500).json({ 
      message: 'Failed to fetch connected providers',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}