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
import { encryptToken, decryptToken, shouldRefreshToken } from '../utils/tokenEncryption';
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
      return null;
    }
    
    // Check if token needs to be refreshed
    if (token.expiresAt && shouldRefreshToken(token.expiresAt)) {
      // Implement token refresh logic here
      // This would require provider-specific refresh token logic
      console.log('Token needs refreshing, but refresh not implemented yet');
    }
    
    // Decrypt the access token
    return decryptToken(token.accessToken);
  } catch (error) {
    console.error('Error getting OAuth access token:', error);
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