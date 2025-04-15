/**
 * Token Storage Service
 * 
 * This service handles secure storage and retrieval of OAuth tokens.
 * Tokens are encrypted before being stored in the database.
 */

import { db } from '../db';
import { oauthTokens } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import * as encryption from '../utils/encryption';

export class TokenStorage {
  /**
   * Store an OAuth token in the database
   * 
   * @param userId The user ID
   * @param provider The OAuth provider ID
   * @param accessToken The access token
   * @param refreshToken The refresh token (if available)
   * @param expiresAt The token expiration time
   * @returns The stored token
   */
  static async storeOAuthToken(
    userId: number,
    provider: string,
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date
  ) {
    // Encrypt tokens before storage
    const encryptedAccessToken = encryption.Encryption.encrypt(accessToken);
    const encryptedRefreshToken = refreshToken ? encryption.Encryption.encrypt(refreshToken) : null;
    
    // Check if token already exists for this user and provider
    const existingToken = await db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      )
      .limit(1);
    
    const tokenData = {
      accessToken: encryptedAccessToken,
      refreshToken: encryptedRefreshToken,
      expiresAt,
      updatedAt: new Date()
    };
    
    // Update or insert token
    if (existingToken.length > 0) {
      const [updatedToken] = await db
        .update(oauthTokens)
        .set(tokenData)
        .where(
          and(
            eq(oauthTokens.userId, userId),
            eq(oauthTokens.provider, provider)
          )
        )
        .returning();
      
      return updatedToken;
    } else {
      const [newToken] = await db
        .insert(oauthTokens)
        .values({
          userId,
          provider,
          ...tokenData,
          createdAt: new Date()
        })
        .returning();
      
      return newToken;
    }
  }
  
  /**
   * Get an access token for a user and provider
   * 
   * @param userId The user ID
   * @param provider The OAuth provider ID
   * @returns The decrypted access token or null if not found
   */
  static async getAccessToken(userId: number, provider: string): Promise<string | null> {
    const [token] = await db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      );
    
    if (!token || !token.accessToken) {
      return null;
    }
    
    // Decrypt the access token
    return encryption.Encryption.decrypt(token.accessToken);
  }
  
  /**
   * Get a refresh token for a user and provider
   * 
   * @param userId The user ID
   * @param provider The OAuth provider ID
   * @returns The decrypted refresh token or null if not found
   */
  static async getRefreshToken(userId: number, provider: string): Promise<string | null> {
    const [token] = await db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      );
    
    if (!token || !token.refreshToken) {
      return null;
    }
    
    // Decrypt the refresh token
    return encryption.Encryption.decrypt(token.refreshToken);
  }
  
  /**
   * Get token information for a user and provider
   * 
   * @param userId The user ID
   * @param provider The OAuth provider ID
   * @returns The token information or null if not found
   */
  static async getToken(userId: number, provider: string) {
    const [token] = await db
      .select()
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      );
    
    if (!token) {
      return null;
    }
    
    // Return token without the actual token values
    // This is useful for checking expiration without exposing tokens
    return {
      id: token.id,
      userId: token.userId,
      provider: token.provider,
      expiresAt: token.expiresAt,
      hasRefreshToken: !!token.refreshToken,
      isExpired: token.expiresAt ? token.expiresAt < new Date() : true,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }
  
  /**
   * Check if a token is expired
   * 
   * @param userId The user ID
   * @param provider The OAuth provider ID
   * @returns Whether the token is expired
   */
  static async isTokenExpired(userId: number, provider: string): Promise<boolean> {
    const [token] = await db
      .select({ expiresAt: oauthTokens.expiresAt })
      .from(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      );
    
    if (!token) {
      // If no token exists, consider it expired
      return true;
    }
    
    return token.expiresAt ? token.expiresAt < new Date() : true;
  }
  
  /**
   * Revoke a token by removing it from the database
   * 
   * @param userId The user ID
   * @param provider The OAuth provider ID
   * @returns Whether the token was successfully revoked
   */
  static async revokeToken(userId: number, provider: string): Promise<boolean> {
    const result = await db
      .delete(oauthTokens)
      .where(
        and(
          eq(oauthTokens.userId, userId),
          eq(oauthTokens.provider, provider)
        )
      );
    
    return (result.rowCount || 0) > 0;
  }
  
  /**
   * Clean up expired tokens
   * 
   * @returns The number of deleted tokens
   */
  static async cleanupExpiredTokens(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(oauthTokens)
      .where(lt(oauthTokens.expiresAt, now));
    
    return result.rowCount || 0;
  }
  
  /**
   * Get all OAuth tokens for a user
   * 
   * @param userId The user ID
   * @returns A list of tokens (without the actual token values for security)
   */
  static async getUserOAuthTokens(userId: number) {
    const tokens = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.userId, userId));
    
    // Return tokens without exposing the actual token values
    return tokens.map(token => ({
      id: token.id,
      userId: token.userId,
      provider: token.provider,
      expiresAt: token.expiresAt,
      hasRefreshToken: !!token.refreshToken,
      isExpired: token.expiresAt ? token.expiresAt < new Date() : true,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    }));
  }
}