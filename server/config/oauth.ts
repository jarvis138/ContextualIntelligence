/**
 * OAuth Provider Configuration
 * 
 * This file contains configuration settings for OAuth providers used in the application.
 * Environment variables should be set for each provider's credentials in production.
 */

export interface OAuthProviderConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  scope: string[];
  profileFields?: string[];
  authorizeUrl?: string;
  tokenUrl?: string;
  revokeUrl?: string;
  userInfoUrl?: string;
}

export interface OAuthConfig {
  google: OAuthProviderConfig;
  microsoft: OAuthProviderConfig;
  slack: OAuthProviderConfig;
}

// Base URL for callbacks
const baseURL = process.env.BASE_URL || 'http://localhost:5000';

// OAuth configuration for supported providers
export const oauthConfig: OAuthConfig = {
  google: {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: `${baseURL}/auth/google/callback`,
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/gmail.readonly'
    ],
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  microsoft: {
    clientID: process.env.MICROSOFT_CLIENT_ID || '',
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
    callbackURL: `${baseURL}/auth/microsoft/callback`,
    scope: [
      'user.read',
      'mail.read',
      'files.read'
    ],
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    revokeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/logout',
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me'
  },
  slack: {
    clientID: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    callbackURL: `${baseURL}/auth/slack/callback`,
    scope: [
      'channels:read',
      'channels:history',
      'users:read',
      'files:read'
    ],
    authorizeUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    revokeUrl: 'https://slack.com/api/auth.revoke',
    userInfoUrl: 'https://slack.com/api/users.identity'
  }
};

// CSRF protection settings
export const csrfProtection = {
  enabled: true,
  cookieName: 'csrf_token',
  headerName: 'X-CSRF-Token'
};

// Token encryption settings
export const tokenEncryption = {
  algorithm: 'aes-256-gcm',
  ivLength: 16,
  keyLength: 32
};

// Token refresh settings
export const tokenRefresh = {
  refreshBeforeExpiry: 24 * 60 * 60 * 1000, // 24 hours
  maxTokenAge: 30 * 24 * 60 * 60 * 1000 // 30 days
};