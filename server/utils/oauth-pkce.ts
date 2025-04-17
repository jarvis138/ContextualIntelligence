/**
 * OAuth 2.0 with PKCE Utilities
 * 
 * This module implements the PKCE (Proof Key for Code Exchange) extension to OAuth 2.0
 * for enhanced security when using the authorization code flow. PKCE helps prevent
 * code interception attacks by requiring a dynamically generated challenge for verification.
 * 
 * https://oauth.net/2/pkce/
 */

import { generatePKCEChallenge } from 'pkce-challenge';
import crypto from 'crypto';

/**
 * PKCE verification data structure
 */
export interface PKCEData {
  codeVerifier: string;
  codeChallenge: string;
  challengeMethod: 'S256' | 'plain';
  state: string;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
}

// In-memory store for PKCE verification data
// In production, this should be stored in a database or Redis
const pkceStore = new Map<string, PKCEData>();

/**
 * Generate a new PKCE challenge and verifier
 * 
 * @param expirationMinutes How long the PKCE challenge is valid for (defaults to 10 minutes)
 * @returns PKCE data including code verifier, code challenge, and state
 */
export function generatePKCE(expirationMinutes = 10): PKCEData {
  // Generate PKCE values
  const pkce = generatePKCEChallenge();
  
  // Generate random state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Calculate expiration time
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
  
  // Create PKCE data object
  const pkceData: PKCEData = {
    codeVerifier: pkce.code_verifier,
    codeChallenge: pkce.code_challenge,
    challengeMethod: 'S256',
    state,
    createdAt: now,
    expiresAt,
    used: false
  };
  
  // Store PKCE data indexed by state for later verification
  pkceStore.set(state, pkceData);
  
  // Set expiration cleanup
  setTimeout(() => {
    pkceStore.delete(state);
  }, expirationMinutes * 60 * 1000);
  
  return pkceData;
}

/**
 * Verify a PKCE exchange with received authorization code
 * 
 * @param state The state value returned from the OAuth provider
 * @param code The authorization code from the OAuth provider
 * @returns The original PKCE data if valid, null otherwise
 */
export function verifyPKCE(state: string): PKCEData | null {
  // Look up the PKCE data by state
  const pkceData = pkceStore.get(state);
  
  // Verify the PKCE exchange is valid
  if (!pkceData) {
    return null; // State not found
  }
  
  if (pkceData.used) {
    return null; // Already used (potential replay attack)
  }
  
  if (pkceData.expiresAt < new Date()) {
    pkceStore.delete(state);
    return null; // Expired
  }
  
  // Mark as used to prevent replay attacks
  pkceData.used = true;
  
  return pkceData;
}

/**
 * Clear expired PKCE data from the store
 * This should be called periodically, or when the server is idle
 */
export function cleanupExpiredPKCE(): void {
  const now = new Date();
  
  // Remove expired PKCE data
  for (const [state, pkceData] of pkceStore.entries()) {
    if (pkceData.expiresAt < now) {
      pkceStore.delete(state);
    }
  }
}

/**
 * Class that can be extended by any OAuth provider that wants to use PKCE
 */
export class PKCEOAuthProvider {
  /**
   * Generate authorization URL with PKCE challenge
   * 
   * @param authorizationEndpoint The OAuth provider's authorization endpoint
   * @param clientId The client ID registered with the OAuth provider
   * @param redirectUri The redirect URI registered with the OAuth provider
   * @param scope The requested scopes
   * @param additionalParams Any additional parameters to include in the request
   * @returns The authorization URL and PKCE data
   */
  static generateAuthorizationUrl(
    authorizationEndpoint: string,
    clientId: string,
    redirectUri: string,
    scope: string,
    additionalParams: Record<string, string> = {}
  ): { url: string, pkceData: PKCEData } {
    // Generate PKCE data
    const pkceData = generatePKCE();
    
    // Build the authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state: pkceData.state,
      code_challenge: pkceData.codeChallenge,
      code_challenge_method: pkceData.challengeMethod,
      ...additionalParams
    });
    
    const url = `${authorizationEndpoint}?${params.toString()}`;
    
    return { url, pkceData };
  }
  
  /**
   * Exchange authorization code for tokens using PKCE verifier
   * 
   * @param tokenEndpoint The OAuth provider's token endpoint
   * @param clientId The client ID registered with the OAuth provider
   * @param clientSecret The client secret (if required)
   * @param redirectUri The redirect URI registered with the OAuth provider
   * @param code The authorization code from the callback
   * @param state The state value from the callback
   * @param additionalParams Any additional parameters to include in the request
   * @returns The token response
   */
  static async exchangeCodeForToken(
    tokenEndpoint: string,
    clientId: string,
    redirectUri: string,
    code: string,
    state: string,
    clientSecret?: string,
    additionalParams: Record<string, string> = {}
  ): Promise<any> {
    // Verify the PKCE exchange
    const pkceData = verifyPKCE(state);
    if (!pkceData) {
      throw new Error('Invalid or expired authorization request');
    }
    
    // Build the token request params
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: pkceData.codeVerifier,
      ...additionalParams
    });
    
    // Add client secret if provided
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    if (clientSecret) {
      // Some providers accept client_secret in the body
      params.append('client_secret', clientSecret);
      
      // Some providers require Basic auth
      const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${authString}`;
    }
    
    // Make the token request
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers,
      body: params.toString()
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${errorData}`);
    }
    
    return response.json();
  }
}

export default PKCEOAuthProvider;