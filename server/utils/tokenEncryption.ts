/**
 * Token Encryption Utilities
 * 
 * This module provides functions for encrypting and decrypting OAuth tokens
 * using AES-256-GCM for secure storage in the database, as well as token
 * rotation and revocation mechanisms.
 */

import crypto from 'crypto';
import { tokenEncryption, tokenRefresh } from '../config/oauth';
import { AuditEventType, logAuditEvent } from './auditLogger';

// Secret key for encryption (should be set via environment variable in production)
const SECRET_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'development-token-encryption-key-not-for-production';

// Token rotation constants
const ROTATION_INTERVAL = 24 * 60 * 60 * 1000; // Rotate tokens every 24 hours
const ROTATION_JITTER = 2 * 60 * 60 * 1000;  // Add random jitter of up to 2 hours

/**
 * Derive a key from the secret using PBKDF2
 */
function deriveKey(secret: string): Buffer {
  const salt = 'cpi-hub-salt'; // In production, use a proper salt strategy
  return crypto.pbkdf2Sync(secret, salt, 10000, tokenEncryption.keyLength, 'sha256');
}

/**
 * Encrypt a token string using AES-256-GCM
 * Returns the encrypted data in format: iv:authTag:encryptedData (base64 encoded)
 */
export function encryptToken(text: string): string {
  const key = deriveKey(SECRET_KEY);
  const iv = crypto.randomBytes(tokenEncryption.ivLength);
  const cipher = crypto.createCipheriv(tokenEncryption.algorithm as crypto.CipherGCMTypes, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag().toString('base64');
  
  // Format: iv:authTag:encryptedData (all base64 encoded)
  return `${iv.toString('base64')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt a token string that was encrypted with AES-256-GCM
 * Expects the encrypted data in format: iv:authTag:encryptedData (base64 encoded)
 */
export function decryptToken(encryptedText: string): string {
  const key = deriveKey(SECRET_KEY);
  const parts = encryptedText.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encryptedData = parts[2];
  
  const decipher = crypto.createDecipheriv(tokenEncryption.algorithm as crypto.CipherGCMTypes, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Test if a token needs to be refreshed based on its expiry time
 */
export function shouldRefreshToken(expiresAt: Date): boolean {
  const now = Date.now();
  const expiry = expiresAt.getTime();
  return (expiry - now) < tokenRefresh.refreshBeforeExpiry;
}

/**
 * Check if a token has exceeded the maximum allowed age
 */
export function isTokenExpired(createdAt: Date): boolean {
  const now = Date.now();
  const created = createdAt.getTime();
  return (now - created) > tokenRefresh.maxTokenAge;
}

/**
 * Determine if a token should be rotated based on its last rotation time
 * We add a random jitter to prevent all tokens from being rotated at once
 */
export function shouldRotateToken(lastRotatedAt: Date): boolean {
  const now = Date.now();
  const lastRotation = lastRotatedAt.getTime();
  
  // Generate a rotation interval with jitter
  const jitter = Math.floor(Math.random() * ROTATION_JITTER);
  const rotationThreshold = ROTATION_INTERVAL + jitter;
  
  return (now - lastRotation) > rotationThreshold;
}

/**
 * Generate a token rotation fingerprint for token identification
 * This helps prevent token reuse or replay attacks after rotation
 */
export function generateRotationFingerprint(userId: number, tokenId: number): string {
  const data = `${userId}:${tokenId}:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create a new token with rotation metadata
 * @param originalToken The original token to rotate
 * @param userId The ID of the user who owns the token
 * @param tokenId The ID of the token in the database
 */
export function rotateToken(originalToken: string, userId: number, tokenId: number): { 
  rotatedToken: string; 
  fingerprint: string;
  rotatedAt: Date;
} {
  try {
    // Parse the original token to get the data we need to preserve
    const tokenData = JSON.parse(decryptToken(originalToken));
    
    // Generate a new rotation fingerprint
    const fingerprint = generateRotationFingerprint(userId, tokenId);
    const rotatedAt = new Date();
    
    // Create a new token with the updated rotation information
    const newTokenData = {
      ...tokenData,
      rotationFingerprint: fingerprint,
      rotatedAt: rotatedAt.toISOString(),
      previousRotationFingerprint: tokenData.rotationFingerprint || null
    };
    
    // Encrypt the new token
    const rotatedToken = encryptToken(JSON.stringify(newTokenData));
    
    // Log the token rotation event
    logAuditEvent({
      userId,
      eventType: AuditEventType.TOKEN_ROTATION,
      description: `Token rotated for user ${userId}`,
      metadata: {
        tokenId,
        rotatedAt: rotatedAt.toISOString()
      }
    });
    
    return {
      rotatedToken,
      fingerprint,
      rotatedAt
    };
  } catch (error) {
    console.error('Token rotation failed:', error);
    throw new Error('Failed to rotate token');
  }
}

/**
 * Verify if a token's rotation fingerprint is valid
 */
export function validateTokenFingerprint(token: string, expectedFingerprint: string): boolean {
  try {
    const tokenData = JSON.parse(decryptToken(token));
    return tokenData.rotationFingerprint === expectedFingerprint;
  } catch (error) {
    return false;
  }
}