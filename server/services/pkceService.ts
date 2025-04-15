/**
 * PKCE Service
 * 
 * This service handles OAuth 2.0 with PKCE (Proof Key for Code Exchange) authentication.
 * PKCE adds an extra layer of security to OAuth 2.0 authorization code flow by preventing
 * authorization code interception attacks.
 */

import * as pkceChallenge from 'pkce-challenge';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import { oauthConfig } from '../config/oauth';
import { AuthUser } from '../auth';
import { generateToken } from './tokenService';

// Wrapper for pkce-challenge to handle the correct type
const generateChallenge = (length: string) => {
  return pkceChallenge.default(length);
};

// PKCE configuration
const PKCE_EXPIRES_IN = 10 * 60 * 1000; // 10 minutes

// Supported OAuth providers
type OAuthProvider = 'google' | 'microsoft' | 'slack' | 'github';

// PKCE Code Challenge Methods
type CodeChallengeMethod = 'S256' | 'plain';

/**
 * Create PKCE Parameters
 * Generates the code verifier and code challenge for PKCE flow
 * @param userId Optional user ID for pre-authenticated users
 * @param provider OAuth provider
 * @param redirectUri Redirect URI after authentication
 * @param scope OAuth scopes
 * @returns PKCE parameters including state, codeVerifier, and codeChallenge
 */
export async function createPKCEParams(
  userId: number | null,
  provider: OAuthProvider,
  redirectUri: string,
  scope: string[] = []
) {
  try {
    // Generate PKCE challenge
    const pkce = generateChallenge('32');
    
    // Generate unique state parameter for CSRF protection
    const state = uuidv4();
    
    // Set expiration time
    const expiresAt = new Date(Date.now() + PKCE_EXPIRES_IN);
    
    // Store PKCE parameters in database
    await storage.createPkceCodeVerifier({
      userId: userId || undefined,
      codeChallenge: pkce.code_challenge,
      codeVerifier: pkce.code_verifier,
      state,
      provider,
      redirectUri,
      scope: scope.join(' '),
      expiresAt,
      used: false
    });
    
    return {
      state,
      codeVerifier: pkce.code_verifier,
      codeChallenge: pkce.code_challenge,
      codeChallengeMethod: 'S256' as CodeChallengeMethod // SHA256 is the recommended method
    };
  } catch (error) {
    console.error('Error creating PKCE parameters:', error);
    throw error;
  }
}

/**
 * Build OAuth Authorization URL
 * Creates the URL for redirecting the user to the OAuth provider
 * @param provider OAuth provider name
 * @param codeChallenge PKCE code challenge
 * @param codeChallengeMethod PKCE code challenge method (S256 recommended)
 * @param state CSRF state parameter
 * @param redirectUri Redirect URI after authentication
 * @param scope OAuth scopes
 * @returns Authorization URL
 */
export function buildAuthorizationUrl(
  provider: OAuthProvider,
  codeChallenge: string,
  codeChallengeMethod: CodeChallengeMethod,
  state: string,
  redirectUri: string,
  scope: string[] = []
): string {
  // Get provider configuration
  const config = oauthConfig[provider];
  if (!config || !config.clientID) {
    throw new Error(`OAuth provider ${provider} is not configured`);
  }
  
  // Build authorization URL based on provider
  let authUrl = '';
  const params = new URLSearchParams({
    client_id: config.clientID,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope: scope.length > 0 ? scope.join(' ') : config.scope.join(' ')
  });
  
  switch (provider) {
    case 'google':
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
      break;
    case 'microsoft':
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
      break;
    case 'slack':
      authUrl = `https://slack.com/oauth/v2/authorize?${params.toString()}`;
      break;
    case 'github':
      authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
      break;
    default:
      throw new Error(`Unsupported OAuth provider: ${provider}`);
  }
  
  return authUrl;
}

/**
 * Exchange Authorization Code for Access Token
 * Completes the OAuth flow by exchanging the code for tokens
 * @param provider OAuth provider name
 * @param code Authorization code from OAuth provider
 * @param state CSRF state parameter
 * @param redirectUri Redirect URI after authentication
 * @returns Access token and user information
 */
export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string,
  state: string,
  redirectUri: string
): Promise<{ accessToken: string, refreshToken?: string, user: AuthUser, idToken?: string }> {
  try {
    // Verify state and get stored PKCE parameters
    const pkceData = await storage.getPkceCodeVerifierByState(state);
    if (!pkceData) {
      throw new Error('Invalid or expired state parameter');
    }
    
    if (pkceData.used) {
      throw new Error('Authorization code has already been used');
    }
    
    if (new Date() > pkceData.expiresAt) {
      throw new Error('PKCE code verifier has expired');
    }
    
    // Get provider configuration
    const config = oauthConfig[provider];
    if (!config || !config.clientID || !config.clientSecret) {
      throw new Error(`OAuth provider ${provider} is not configured`);
    }
    
    // Build token request parameters
    const tokenParams = new URLSearchParams({
      client_id: config.clientID,
      client_secret: config.clientSecret,
      code,
      code_verifier: pkceData.codeVerifier,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    });
    
    // Determine token endpoint based on provider
    let tokenUrl = '';
    switch (provider) {
      case 'google':
        tokenUrl = 'https://oauth2.googleapis.com/token';
        break;
      case 'microsoft':
        tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
        break;
      case 'slack':
        tokenUrl = 'https://slack.com/api/oauth.v2.access';
        break;
      case 'github':
        tokenUrl = 'https://github.com/login/oauth/access_token';
        break;
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
    
    // Make token request
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: tokenParams.toString()
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to exchange code for token: ${errorText}`);
    }
    
    // Parse token response
    const tokenData = await response.json();
    
    // Mark PKCE verifier as used
    await storage.updatePkceCodeVerifier(pkceData.id, { used: true });
    
    // Get user profile from provider
    const userProfile = await getUserProfile(provider, tokenData.access_token);
    
    // Process user (create or update)
    const user = await processOAuthUser(provider, userProfile, tokenData);
    
    // Generate JWT token for authenticated user
    const jwtToken = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      authMethod: provider
    });
    
    return {
      accessToken: jwtToken,
      refreshToken: tokenData.refresh_token,
      user,
      idToken: tokenData.id_token // Some providers like Google return an ID token
    };
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw error;
  }
}

/**
 * Get User Profile from OAuth Provider
 * Fetches user profile data from the OAuth provider
 * @param provider OAuth provider name
 * @param accessToken Provider-specific access token
 * @returns User profile data
 */
async function getUserProfile(provider: OAuthProvider, accessToken: string): Promise<any> {
  try {
    let profileUrl = '';
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`
    };
    
    // Determine profile endpoint based on provider
    switch (provider) {
      case 'google':
        profileUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
        break;
      case 'microsoft':
        profileUrl = 'https://graph.microsoft.com/v1.0/me';
        break;
      case 'slack':
        profileUrl = 'https://slack.com/api/users.identity';
        break;
      case 'github':
        profileUrl = 'https://api.github.com/user';
        headers['Accept'] = 'application/vnd.github.v3+json';
        break;
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
    
    // Fetch user profile
    const response = await fetch(profileUrl, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get user profile: ${errorText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

/**
 * Process OAuth User
 * Creates or updates a user based on OAuth profile information
 * @param provider OAuth provider name
 * @param profile User profile from OAuth provider
 * @param tokenData Token data from OAuth provider
 * @returns User object
 */
async function processOAuthUser(
  provider: OAuthProvider,
  profile: any,
  tokenData: any
): Promise<AuthUser> {
  try {
    // Extract user data based on provider
    let userData = { 
      id: '', 
      email: '', 
      name: '', 
      picture: '' 
    };
    
    switch (provider) {
      case 'google':
        userData = {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          picture: profile.picture
        };
        break;
      case 'microsoft':
        userData = {
          id: profile.id,
          email: profile.mail || profile.userPrincipalName,
          name: profile.displayName,
          picture: null
        };
        break;
      case 'slack':
        userData = {
          id: profile.user.id,
          email: profile.user.email,
          name: profile.user.name || profile.user.real_name,
          picture: profile.user.image_192
        };
        break;
      case 'github':
        userData = {
          id: profile.id.toString(),
          email: profile.email,
          name: profile.name || profile.login,
          picture: profile.avatar_url
        };
        break;
      default:
        throw new Error(`Unsupported OAuth provider: ${provider}`);
    }
    
    // Check for existing user with this external ID
    let user = await storage.getUserByExternalId(userData.id, provider);
    
    if (!user && userData.email) {
      // Check if user exists with this email
      const existingUserWithEmail = await findUserByEmail(userData.email);
      
      if (existingUserWithEmail) {
        // Update existing user with OAuth info
        user = await storage.updateUser(existingUserWithEmail.id, {
          authMethod: provider,
          externalId: userData.id,
          avatar: userData.picture || undefined
        });
      }
    }
    
    if (!user) {
      // Create new user
      const username = generateUsername(userData.name, userData.email);
      
      user = await storage.createUser({
        username,
        fullName: userData.name,
        email: userData.email,
        password: '', // No password for OAuth users
        role: 'user',
        authMethod: provider,
        externalId: userData.id,
        avatar: userData.picture || undefined
      });
    }
    
    // Store the OAuth tokens
    const expiresIn = tokenData.expires_in ? parseInt(tokenData.expires_in) : 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    await storage.saveOAuthToken({
      userId: user.id,
      provider,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      tokenData: {
        scope: tokenData.scope,
        tokenType: tokenData.token_type,
        idToken: tokenData.id_token
      }
    });
    
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      authMethod: provider
    };
  } catch (error) {
    console.error('Error processing OAuth user:', error);
    throw error;
  }
}

/**
 * Helper function to find a user by email
 */
async function findUserByEmail(email: string) {
  const users = await storage.getUsers();
  return users.find(user => user.email === email);
}

/**
 * Generate a username from display name and email
 */
function generateUsername(displayName: string, email: string): string {
  // Remove spaces and special characters
  let username = displayName.toLowerCase().replace(/[^a-z0-9]/gi, '');
  
  // If username is too short, use part of email
  if (username.length < 4) {
    const emailUsername = email.split('@')[0];
    username = emailUsername.replace(/[^a-z0-9]/gi, '');
  }
  
  // Add a random number to avoid duplicates
  const randomNum = Math.floor(Math.random() * 1000);
  return `${username}${randomNum}`;
}