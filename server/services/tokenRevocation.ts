/**
 * Token Revocation Service
 * 
 * This service handles revoking OAuth tokens and maintaining a blacklist
 * of revoked tokens to prevent their usage.
 */

import { db } from '../db';
import { oauthTokens } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { AuditEventType, logAuditEvent } from '../utils/auditLogger';

// In-memory blacklist for revoked tokens (to avoid DB lookups for every request)
// In production, this should be replaced with a distributed cache like Redis
interface RevokedToken {
  tokenId: number;
  userId: number;
  fingerprint: string;
  expiresAt: Date;
  revokedAt: Date;
}

class TokenBlacklist {
  private revokedTokens: Map<string, RevokedToken> = new Map();
  
  // Add a token to the blacklist
  add(revokedToken: RevokedToken): void {
    const key = this.getBlacklistKey(revokedToken.userId, revokedToken.tokenId);
    this.revokedTokens.set(key, revokedToken);
    
    // Clean up expired blacklist entries periodically
    this.cleanupExpiredEntries();
  }
  
  // Check if a token is in the blacklist
  isRevoked(userId: number, tokenId: number, fingerprint?: string): boolean {
    const key = this.getBlacklistKey(userId, tokenId);
    const revokedToken = this.revokedTokens.get(key);
    
    if (!revokedToken) {
      return false;
    }
    
    // If a fingerprint is provided, check if it matches the revoked token
    if (fingerprint && revokedToken.fingerprint !== fingerprint) {
      return false;
    }
    
    // Check if the blacklist entry has expired
    if (revokedToken.expiresAt && new Date() > revokedToken.expiresAt) {
      this.revokedTokens.delete(key);
      return false;
    }
    
    return true;
  }
  
  // Remove expired entries from the blacklist
  private cleanupExpiredEntries(): void {
    const now = new Date();
    
    for (const [key, token] of this.revokedTokens.entries()) {
      if (token.expiresAt && now > token.expiresAt) {
        this.revokedTokens.delete(key);
      }
    }
  }
  
  // Create a unique key for the blacklist
  private getBlacklistKey(userId: number, tokenId: number): string {
    return `${userId}:${tokenId}`;
  }
}

// Singleton instance of the token blacklist
export const tokenBlacklist = new TokenBlacklist();

/**
 * Revoke a specific OAuth token
 * @param userId User ID
 * @param provider OAuth provider name
 * @param reason Optional reason for revocation
 */
export async function revokeToken(
  userId: number, 
  provider: string,
  reason: string = 'User requested'
): Promise<boolean> {
  try {
    // Get the token from the database
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
      return false;
    }
    
    // Get the token data if available
    const tokenData = token.tokenData as any || {};
    const fingerprint = tokenData.rotationFingerprint;
    
    // Calculate expiry time for blacklist entry - use token expiry or default to 30 days
    const expiryDate = token.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    // Add to blacklist
    tokenBlacklist.add({
      tokenId: token.id,
      userId: token.userId,
      fingerprint: fingerprint || '',
      expiresAt: expiryDate,
      revokedAt: new Date()
    });
    
    // Delete the token from the database
    await db
      .delete(oauthTokens)
      .where(eq(oauthTokens.id, token.id));
    
    // Log the revocation
    await logAuditEvent({
      userId,
      eventType: AuditEventType.TOKEN_REVOCATION,
      description: `OAuth token revoked: ${provider}`,
      metadata: {
        provider,
        reason,
        tokenId: token.id,
        revokedAt: new Date().toISOString()
      }
    });
    
    return true;
  } catch (error) {
    console.error('Token revocation failed:', error);
    return false;
  }
}

/**
 * Revoke all tokens for a user
 * @param userId User ID
 * @param reason Reason for revocation
 */
export async function revokeAllUserTokens(
  userId: number,
  reason: string = 'Security measure'
): Promise<boolean> {
  try {
    // Get all tokens for the user
    const tokens = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.userId, userId));
    
    if (tokens.length === 0) {
      return false;
    }
    
    // Add all tokens to blacklist
    for (const token of tokens) {
      const tokenData = token.tokenData as any || {};
      const fingerprint = tokenData.rotationFingerprint;
      
      // Calculate expiry time for blacklist entry - use token expiry or default to 30 days
      const expiryDate = token.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // Add to blacklist
      tokenBlacklist.add({
        tokenId: token.id,
        userId: token.userId,
        fingerprint: fingerprint || '',
        expiresAt: expiryDate,
        revokedAt: new Date()
      });
    }
    
    // Delete all tokens from the database
    await db
      .delete(oauthTokens)
      .where(eq(oauthTokens.userId, userId));
    
    // Log the revocation
    await logAuditEvent({
      userId,
      eventType: AuditEventType.TOKEN_REVOCATION,
      description: `All OAuth tokens revoked for user`,
      metadata: {
        reason,
        tokenCount: tokens.length,
        revokedAt: new Date().toISOString()
      }
    });
    
    return true;
  } catch (error) {
    console.error('Token revocation failed:', error);
    return false;
  }
}

/**
 * Check if a token is valid (not revoked)
 */
export function isTokenValid(userId: number, tokenId: number, fingerprint?: string): boolean {
  return !tokenBlacklist.isRevoked(userId, tokenId, fingerprint);
}