import { storage } from "../storage";
import { Encryption } from "../utils/encryption";
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
    refreshToken?: string,
    expiresIn?: number
  ): Promise<number> {
    try {
      // Encrypt tokens before storage
      const encryptedAccessToken = Encryption.encrypt(accessToken);
      const encryptedRefreshToken = refreshToken ? Encryption.encrypt(refreshToken) : null;
      
      // Calculate expiration date if expiresIn is provided
      const expiresAt = expiresIn 
        ? new Date(Date.now() + (expiresIn * 1000)) 
        : new Date(Date.now() + (3600 * 24 * 30 * 1000)); // Default 30 days
      
      // Store token in database
      const token = await storage.saveOAuthToken({
        userId,
        provider,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        issuedAt: new Date(),
        tokenId: uuidv4()
      });
      
      return token.id;
    } catch (error) {
      console.error('Error storing OAuth token:', error);
      throw new Error('Failed to store OAuth token');
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
      const token = await storage.getLatestOAuthToken(userId, provider);
      
      if (!token || !token.accessToken) {
        return null;
      }
      
      // Check if token is expired
      if (token.expiresAt && token.expiresAt < new Date()) {
        // TODO: Implement token refresh using the refresh token
        console.warn('Token expired, refresh not yet implemented');
        return null;
      }
      
      // Decrypt and return the token
      return Encryption.decrypt(token.accessToken);
    } catch (error) {
      console.error('Error retrieving access token:', error);
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
      const token = await storage.getLatestOAuthToken(userId, provider);
      
      if (!token || !token.refreshToken) {
        return null;
      }
      
      // Decrypt and return the token
      return Encryption.decrypt(token.refreshToken);
    } catch (error) {
      console.error('Error retrieving refresh token:', error);
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
      await storage.revokeOAuthToken(userId, provider);
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
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
    tokenId: string,
    token: string,
    expiresAt: Date
  ) {
    try {
      // Encrypt the refresh token
      const encryptedToken = Encryption.encrypt(token);
      
      return await storage.createRefreshToken({
        userId,
        tokenId,
        token: encryptedToken,
        expiresAt,
        createdAt: new Date()
      });
    } catch (error) {
      console.error('Error storing refresh token:', error);
      throw new Error('Failed to store refresh token');
    }
  }
  
  /**
   * Retrieves and decrypts a refresh token by its ID
   * @param tokenId The token's unique identifier
   * @returns The decrypted refresh token or null if not found
   */
  public static async getRefreshTokenById(tokenId: string): Promise<string | null> {
    try {
      const tokenRecord = await storage.getRefreshTokenByTokenId(tokenId);
      
      if (!tokenRecord) {
        return null;
      }
      
      // Check if token is expired or revoked
      if (tokenRecord.expiresAt < new Date() || tokenRecord.revokedAt) {
        return null;
      }
      
      // Decrypt and return the token
      return Encryption.decrypt(tokenRecord.token);
    } catch (error) {
      console.error('Error retrieving refresh token by ID:', error);
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
      await storage.revokeRefreshToken(tokenId);
      return true;
    } catch (error) {
      console.error('Error revoking refresh token:', error);
      return false;
    }
  }
}