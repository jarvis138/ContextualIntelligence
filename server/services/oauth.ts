/**
 * OAuth Service
 * 
 * This service handles OAuth authentication with multiple providers
 * and manages token storage, validation, and refreshing.
 */

import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import { Strategy as SlackStrategy } from 'passport-slack-oauth2';
import { oauthConfig } from '../config/oauth';
import { storage } from '../storage';
import { User, insertOAuthTokenSchema } from '@shared/schema';
import { 
  encryptToken, 
  decryptToken, 
  shouldRefreshToken, 
  shouldRotateToken,
  rotateToken,
  validateTokenFingerprint
} from '../utils/tokenEncryption';
import { tokenBlacklist, isTokenValid } from './tokenRevocation';
import { AuditEventType, logAuditEvent } from '../utils/auditLogger';
import { z } from 'zod';

// OAuth Profile interfaces
interface BaseProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string }>;
  photos?: Array<{ value: string }>;
  provider: string;
}

// Type guard for checking if profile has emails
function hasEmails(profile: BaseProfile): profile is BaseProfile & { emails: Array<{ value: string }> } {
  return !!profile.emails && profile.emails.length > 0;
}

/**
 * Process user profile from OAuth provider and create or update user
 */
export async function processOAuthUser(profile: BaseProfile, accessToken: string, refreshToken: string | undefined, expiresIn?: number): Promise<User> {
  try {
    // Check if user already exists with this external ID
    let user = await storage.getUserByExternalId(profile.id, profile.provider);
    
    if (!user) {
      // Extract email from profile
      if (!hasEmails(profile)) {
        throw new Error('OAuth profile does not contain an email address');
      }
      
      const email = profile.emails[0].value;
      
      // Check if user exists with this email
      const existingUserWithEmail = await findUserByEmail(email);
      
      if (existingUserWithEmail) {
        // Update existing user with OAuth info
        user = await storage.updateUser(existingUserWithEmail.id, {
          authMethod: profile.provider as any,
          externalId: profile.id,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined
        }) as User;
      } else {
        // Create new user
        const username = generateUsername(profile.displayName, email);
        
        user = await storage.createUser({
          username,
          fullName: profile.displayName,
          email,
          password: '', // No password for OAuth users
          role: 'user',
          authMethod: profile.provider as any,
          externalId: profile.id,
          avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : undefined
        });
      }
    }
    
    // Store the OAuth tokens
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : undefined;
    
    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? encryptToken(refreshToken) : undefined;
    
    await storage.saveOAuthToken({
      userId: user.id,
      provider: profile.provider,
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      tokenData: {}
    });
    
    return user;
  } catch (error) {
    console.error('Error processing OAuth user:', error);
    throw error;
  }
}

/**
 * Configure OAuth strategies for Passport
 */
export function configureOAuthStrategies(passport: any) {
  // Google Strategy
  if (oauthConfig.google.clientID && oauthConfig.google.clientSecret) {
    passport.use(new GoogleStrategy({
      clientID: oauthConfig.google.clientID,
      clientSecret: oauthConfig.google.clientSecret,
      callbackURL: oauthConfig.google.callbackURL,
      scope: oauthConfig.google.scope
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Get token expiration from response
        const tokenData = profile._json;
        const expiresIn = tokenData.expires_in || 3600; // Default 1 hour
        
        const user = await processOAuthUser(
          { ...profile, provider: 'google' },
          accessToken,
          refreshToken,
          expiresIn
        );
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }));
  }
  
  // Microsoft Strategy
  if (oauthConfig.microsoft.clientID && oauthConfig.microsoft.clientSecret) {
    passport.use(new MicrosoftStrategy({
      clientID: oauthConfig.microsoft.clientID,
      clientSecret: oauthConfig.microsoft.clientSecret,
      callbackURL: oauthConfig.microsoft.callbackURL,
      scope: oauthConfig.microsoft.scope
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Microsoft token typically expires in 1 hour
        const expiresIn = 3600;
        
        const user = await processOAuthUser(
          { ...profile, provider: 'microsoft' },
          accessToken,
          refreshToken,
          expiresIn
        );
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }));
  }
  
  // Slack Strategy
  if (oauthConfig.slack.clientID && oauthConfig.slack.clientSecret) {
    passport.use(new SlackStrategy({
      clientID: oauthConfig.slack.clientID,
      clientSecret: oauthConfig.slack.clientSecret,
      callbackURL: oauthConfig.slack.callbackURL,
      scope: oauthConfig.slack.scope
    }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Slack doesn't provide expiresIn in standard OAuth response
        const expiresIn = 43200; // Default 12 hours
        
        const user = await processOAuthUser(
          {
            id: profile.id,
            displayName: profile.displayName || profile.user.name || profile.user.real_name,
            emails: profile.user.email ? [{ value: profile.user.email }] : undefined,
            photos: profile.user.image_192 ? [{ value: profile.user.image_192 }] : undefined,
            provider: 'slack'
          },
          accessToken,
          refreshToken,
          expiresIn
        );
        
        return done(null, user);
      } catch (error) {
        return done(error as Error);
      }
    }));
  }
}

/**
 * Get access token for a specific OAuth provider
 */
export async function getOAuthAccessToken(userId: number, provider: string): Promise<string | null> {
  try {
    const token = await storage.getOAuthToken(userId, provider);
    
    if (!token) {
      // Log attempted access with no token
      await logAuditEvent({
        userId,
        eventType: AuditEventType.ACCESS_DENIED,
        description: `OAuth token access denied - token not found for provider: ${provider}`,
        metadata: { provider }
      });
      return null;
    }
    
    // Check if token is blacklisted/revoked
    if (!isTokenValid(userId, token.id, (token.tokenData as any)?.rotationFingerprint)) {
      await logAuditEvent({
        userId,
        eventType: AuditEventType.ACCESS_DENIED,
        description: `OAuth token access denied - token has been revoked for provider: ${provider}`,
        metadata: { provider, tokenId: token.id }
      });
      return null;
    }
    
    // Check if token should be rotated
    const tokenData = token.tokenData as any || {};
    const lastRotatedAt = tokenData.rotatedAt ? new Date(tokenData.rotatedAt) : new Date(0);
    
    // Perform token rotation if needed
    if (shouldRotateToken(lastRotatedAt)) {
      // Rotate the token
      const { rotatedToken, fingerprint, rotatedAt } = rotateToken(
        token.accessToken, 
        userId, 
        token.id
      );
      
      // Update the token in storage with rotation information
      await storage.updateOAuthToken(token.id, {
        accessToken: rotatedToken,
        tokenData: {
          ...tokenData,
          rotationFingerprint: fingerprint,
          rotatedAt: rotatedAt.toISOString(),
          previousRotationFingerprint: tokenData.rotationFingerprint || null
        }
      });
      
      // Decrypt and return the rotated token
      return decryptToken(rotatedToken);
    }
    
    // Check if token needs to be refreshed
    if (token.expiresAt && shouldRefreshToken(token.expiresAt)) {
      // Get the refresh token
      if (!token.refreshToken) {
        console.warn(`No refresh token available for user ${userId} and provider ${provider}`);
      } else {
        try {
          // Decrypt the refresh token
          const refreshToken = decryptToken(token.refreshToken);
          
          // Implement provider-specific token refresh logic here
          // This would typically make an API call to the OAuth provider
          // For now, log that refresh would be happening
          console.log(`Token refresh needed for user ${userId} and provider ${provider}`);
          
          // Log the token refresh attempt
          await logAuditEvent({
            userId,
            eventType: AuditEventType.TOKEN_REFRESH,
            description: `OAuth token refresh attempted for provider: ${provider}`,
            metadata: { provider, tokenId: token.id }
          });
          
          // Future implementation:
          // const { newAccessToken, newRefreshToken, newExpiresIn } = await refreshOAuthToken(provider, refreshToken);
          // ... update token in storage
        } catch (refreshError) {
          console.error('Error refreshing token:', refreshError);
        }
      }
    }
    
    // Log successful token access
    await logAuditEvent({
      userId,
      eventType: AuditEventType.ACCESS_GRANTED,
      description: `OAuth token accessed for provider: ${provider}`,
      metadata: { provider, tokenId: token.id }
    });
    
    // Decrypt and return the access token
    return decryptToken(token.accessToken);
  } catch (error) {
    console.error('Error getting OAuth access token:', error);
    
    // Log the error
    await logAuditEvent({
      userId,
      eventType: AuditEventType.ACCESS_DENIED,
      description: `OAuth token access error for provider: ${provider}`,
      metadata: { provider, error: (error as Error).message }
    });
    
    return null;
  }
}

/**
 * Helper function to find a user by email
 */
async function findUserByEmail(email: string): Promise<User | undefined> {
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