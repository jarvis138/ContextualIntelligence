/**
 * Encryption Utility
 * 
 * This utility provides methods for encrypting and decrypting sensitive data
 * using AES-256-GCM encryption algorithm.
 */

import crypto from 'crypto';

// Get encryption key from environment, or generate a development one
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 
  // If no key is provided in development, generate a consistent one
  // In production, ENCRYPTION_KEY should be set in the environment
  crypto.createHash('sha256').update('cpi-hub-dev-key').digest('base64').substring(0, 32);

// Algorithm to use
const ALGORITHM = 'aes-256-gcm';
// Length of the authentication tag
const AUTH_TAG_LENGTH = 16;
// Length of the initialization vector
const IV_LENGTH = 12;

export class Encryption {
  /**
   * Encrypt a string value
   * 
   * @param text The text to encrypt
   * @returns The encrypted text as a base64 string
   */
  static encrypt(text: string): string {
    try {
      // Generate a random initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher with key, iv, and auth tag length
      const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv, {
        authTagLength: AUTH_TAG_LENGTH
      });
      
      // Encrypt the data
      let encrypted = cipher.update(text, 'utf8', 'base64');
      encrypted += cipher.final('base64');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine iv, encrypted data, and auth tag into a single string
      // Format: iv:encrypted:authTag (all base64)
      return [
        iv.toString('base64'),
        encrypted,
        authTag.toString('base64')
      ].join(':');
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }
  
  /**
   * Decrypt an encrypted string value
   * 
   * @param encryptedText The encrypted text to decrypt
   * @returns The decrypted text
   */
  static decrypt(encryptedText: string): string {
    try {
      // Split the encrypted text into its components
      const [ivBase64, encrypted, authTagBase64] = encryptedText.split(':');
      
      if (!ivBase64 || !encrypted || !authTagBase64) {
        throw new Error('Invalid encrypted data format');
      }
      
      // Convert base64 strings back to buffers
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv, {
        authTagLength: AUTH_TAG_LENGTH
      });
      
      // Set auth tag
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
  
  /**
   * Generate a random string that can be used as an encryption key
   * 
   * @param length The length of the key to generate
   * @returns The generated key
   */
  static generateKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64').substring(0, length);
  }
  
  /**
   * Hash a string value using SHA-256
   * 
   * @param text The text to hash
   * @returns The hashed text
   */
  static hash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}