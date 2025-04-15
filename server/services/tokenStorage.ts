import { storage } from '../storage';
import { encrypt, decrypt } from '../utils/encryption';
import { InsertOAuthToken, InsertRefreshToken } from '@shared/schema';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for secure storage and retrieval of access/refresh tokens
 * using AES-256 encryption
 */
export class TokenStorage {
  /**
   * Stores an OAuth access token with encryption
   * @param userId User ID associated with the token
   * @param provider OAuth provider (google, microsoft, slack, etc.)
   * @param accessToken The access token to store
   * @param refreshToken Optional refresh token
   * @param expiresIn Token expiration time in seconds
   * @returns The ID of the stored token
   */
  public static async storeOAuthToken(
    userId: number,
    provider: string,
    accessToken: string,
    refreshToken?: string | null,
    expiresIn?: number | null,
    tokenData?: any
  ): Promise<number> {
    try {
      // Encrypt sensitive token data
      const encryptedAccessToken = encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? encrypt(refreshToken) : null;
      
      // Calculate expiration date if expiresIn is provided
      const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
      
      // Save the token to the database
      const token = await storage.saveOAuthToken({
        userId,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        tokenData: tokenData || null
      });
      
      return token.id;
    } catch (error) {
      console.error('Failed to store OAuth token:', error);
      throw new Error('Failed to securely store OAuth tokens');
    }
  }
  
  /**
   * Retrieves an OAuth access token
   * @param userId User ID associated with the token
   * @param provider OAuth provider
   * @returns Decrypted access token
   */
  public static async getAccessToken(userId: number, provider: string): Promise<string | null> {
    try {
      // Get the most recent token for this user and provider
      const token = await storage.getLatestOAuthToken(userId, provider);
      
      if (!token || !token.accessToken) {
        return null;
      }
      
      // Check if token is expired
      if (token.expiresAt && new Date(token.expiresAt) < new Date()) {
        console.warn(`Access token for user ${userId} and provider ${provider} is expired`);
        return null;
      }
      
      // Decrypt and return the access token
      return decrypt(token.accessToken);
    } catch (error) {
      console.error('Failed to retrieve OAuth access token:', error);
      return null;
    }
  }
  
  /**
   * Retrieves a refresh token
   * @param userId User ID associated with the token
   * @param provider OAuth provider
   * @returns Decrypted refresh token
   */
  public static async getRefreshToken(userId: number, provider: string): Promise<string | null> {
    try {
      // Get the token for this user and provider
      const token = await storage.getLatestOAuthToken(userId, provider);
      
      if (!token || !token.refreshToken) {
        return null;
      }
      
      // Decrypt and return the refresh token
      return decrypt(token.refreshToken);
    } catch (error) {
      console.error('Failed to retrieve OAuth refresh token:', error);
      return null;
    }
  }
  
  /**
   * Revokes an OAuth token
   * @param userId User ID associated with the token
   * @param provider OAuth provider
   * @returns Whether the revocation was successful
   */
  public static async revokeToken(userId: number, provider: string): Promise<boolean> {
    try {
      return await storage.revokeOAuthToken(userId, provider);
    } catch (error) {
      console.error('Failed to revoke OAuth token:', error);
      return false;
    }
  }
  
  /**
   * Stores an encrypted refresh token
   * @param userId User ID associated with the token
   * @param tokenId A unique token identifier
   * @param token The refresh token to store
   * @param expiresAt When the token expires
   * @returns The stored token record
   */
  public static async storeRefreshToken(
    userId: number,
    token: string,
    expiresAt: Date
  ): Promise<string> {
    try {
      // Generate a unique token ID
      const tokenId = uuidv4();
      
      // Encrypt the token
      const encryptedToken = encrypt(token);
      
      // Store the token
      await storage.storeRefreshToken(userId, tokenId, encryptedToken, expiresAt);
      
      return tokenId;
    } catch (error) {
      console.error('Failed to store refresh token:', error);
      throw new Error('Failed to securely store refresh token');
    }
  }
  
  /**
   * Retrieves and decrypts a refresh token by its ID
   * @param tokenId The token's unique identifier
   * @returns The decrypted refresh token or null if not found
   */
  public static async getRefreshTokenById(tokenId: string): Promise<string | null> {
    try {
      const token = await storage.getRefreshTokenByTokenId(tokenId);
      
      if (!token || !token.token) {
        return null;
      }
      
      // Check if token is expired or revoked
      if (token.expiresAt < new Date() || token.revokedAt) {
        return null;
      }
      
      // Decrypt and return the token
      return decrypt(token.token);
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error);
      return null;
    }
  }
  
  /**
   * Revokes a refresh token by its ID
   * @param tokenId The token's unique identifier
   * @returns Whether the revocation was successful
   */
  public static async revokeRefreshToken(tokenId: string): Promise<boolean> {
    try {
      return await storage.revokeRefreshToken(tokenId);
    } catch (error) {
      console.error('Failed to revoke refresh token:', error);
      return false;
    }
  }
  
  /**
   * Cleans up expired refresh tokens
   * @returns The number of tokens deleted
   */
  public static async cleanupExpiredRefreshTokens(): Promise<number> {
    try {
      return await storage.deleteExpiredRefreshTokens();
    } catch (error) {
      console.error('Failed to clean up expired refresh tokens:', error);
      return 0;
    }
  }
}