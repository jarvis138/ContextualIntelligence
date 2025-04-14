/**
 * Token Encryption Utilities
 * 
 * This module provides functions for encrypting and decrypting OAuth tokens
 * using AES-256-GCM for secure storage in the database.
 */

import crypto from 'crypto';
import { tokenEncryption, tokenRefresh } from '../config/oauth';

// Secret key for encryption (should be set via environment variable in production)
const SECRET_KEY = process.env.TOKEN_ENCRYPTION_KEY || 'development-token-encryption-key-not-for-production';

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