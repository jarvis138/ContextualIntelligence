/**
 * Encryption utility for secure storage of sensitive credentials
 * 
 * This module provides utilities for encrypting and decrypting sensitive data
 * like OAuth tokens using AES-256-GCM.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// Use a secure environment variable for the encryption key or generate one
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'cpi-hub-default-encryption-key-change-in-prod';

// Derive a 32-byte key (256 bits) from the encryption key string
const getKey = (key: string): Buffer => {
  return createHash('sha256').update(key).digest();
};

// Encryption algorithm
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt a string using AES-256-GCM
 * 
 * @param text The text to encrypt
 * @returns Object containing the encrypted text, initialization vector, and auth tag
 */
export function encrypt(text: string): { 
  encryptedData: string; 
  iv: string; 
  authTag: string 
} {
  // Generate a random initialization vector
  const iv = randomBytes(16);
  
  // Create cipher with key, IV, and algorithm
  const cipher = createCipheriv(ALGORITHM, getKey(ENCRYPTION_KEY), iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag
  };
}

/**
 * Decrypt a string that was encrypted with AES-256-GCM
 * 
 * @param encryptedData The encrypted data (hex string)
 * @param iv The initialization vector used for encryption (hex string)
 * @param authTag The authentication tag generated during encryption (hex string)
 * @returns The decrypted text
 */
export function decrypt(encryptedData: string, iv: string, authTag: string): string {
  try {
    // Create decipher
    const decipher = createDecipheriv(
      ALGORITHM, 
      getKey(ENCRYPTION_KEY), 
      Buffer.from(iv, 'hex')
    );
    
    // Set auth tag
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    // Decrypt
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. The data may be corrupted or the encryption key is incorrect.');
  }
}

/**
 * Encrypt an object by serializing it to JSON and encrypting the result
 * 
 * @param obj The object to encrypt
 * @returns The encrypted object data with IV and auth tag
 */
export function encryptObject<T>(obj: T): { 
  encryptedData: string; 
  iv: string; 
  authTag: string 
} {
  return encrypt(JSON.stringify(obj));
}

/**
 * Decrypt an object that was encrypted with encryptObject
 * 
 * @param encryptedData The encrypted data
 * @param iv The initialization vector
 * @param authTag The authentication tag
 * @returns The decrypted object
 */
export function decryptObject<T>(
  encryptedData: string, 
  iv: string, 
  authTag: string
): T {
  const decrypted = decrypt(encryptedData, iv, authTag);
  return JSON.parse(decrypted) as T;
}