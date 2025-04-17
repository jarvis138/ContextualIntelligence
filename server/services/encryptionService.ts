/**
 * Field-Level Encryption Service
 * 
 * Provides encryption and decryption of sensitive data fields to protect them
 * at rest in the database. This is an important security feature for enterprise
 * environments where data protection is critical.
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Encryption algorithm to use
const ALGORITHM = 'aes-256-gcm';

// Environment variables for encryption keys
// In production, these should be securely managed via a key management service
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-for-development-only';
const ENCRYPTION_SALT = process.env.ENCRYPTION_SALT || 'default-salt-for-development-only';

// Interface for encrypted data
interface EncryptedData {
  iv: string;         // Initialization vector
  authTag: string;    // Authentication tag
  encryptedData: string; // Encrypted data
}

/**
 * Field-Level Encryption Service
 * Provides methods to encrypt and decrypt sensitive data
 */
export class EncryptionService {
  private static keyBuffer: Buffer;
  private static initialized = false;

  /**
   * Initialize the encryption service
   */
  static initialize(): void {
    if (this.initialized) return;
    
    // Generate a key from the encryption key and salt using PBKDF2
    this.keyBuffer = crypto.pbkdf2Sync(
      ENCRYPTION_KEY, 
      ENCRYPTION_SALT, 
      100000,  // Iterations
      32,      // Key length (for AES-256)
      'sha256'
    );
    
    this.initialized = true;
    
    // Log warning if using default encryption keys in production
    if (process.env.NODE_ENV === 'production' && 
        (ENCRYPTION_KEY === 'default-encryption-key-for-development-only' || 
         ENCRYPTION_SALT === 'default-salt-for-development-only')) {
      console.error('WARNING: Using default encryption keys in production environment!');
      console.error('Set ENCRYPTION_KEY and ENCRYPTION_SALT environment variables for secure encryption.');
    }
  }

  /**
   * Encrypt sensitive data
   * @param data Data to encrypt
   * @returns Encrypted data object with IV and auth tag
   */
  static encrypt(data: string): string {
    if (!this.initialized) {
      this.initialize();
    }
    
    try {
      // Generate random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(ALGORITHM, this.keyBuffer, iv);
      
      // Encrypt data
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get authentication tag
      const authTag = cipher.getAuthTag().toString('hex');
      
      // Create encrypted data object
      const encryptedDataObj: EncryptedData = {
        iv: iv.toString('hex'),
        authTag,
        encryptedData: encrypted
      };
      
      // Return as stringified JSON
      return JSON.stringify(encryptedDataObj);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * @param encryptedDataStr Encrypted data string (JSON)
   * @returns Decrypted data
   */
  static decrypt(encryptedDataStr: string): string {
    if (!this.initialized) {
      this.initialize();
    }
    
    try {
      // Parse encrypted data object
      const encryptedData: EncryptedData = JSON.parse(encryptedDataStr);
      
      // Convert IV and auth tag from hex
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(ALGORITHM, this.keyBuffer, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Check if a string is already encrypted
   * @param data String to check
   * @returns True if the string appears to be encrypted
   */
  static isEncrypted(data: string): boolean {
    if (!data) return false;
    
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(data);
      
      // Check if it has the required properties
      return (
        typeof parsed === 'object' &&
        parsed !== null &&
        'iv' in parsed &&
        'authTag' in parsed &&
        'encryptedData' in parsed
      );
    } catch (error) {
      // Not a valid JSON string
      return false;
    }
  }

  /**
   * Generate a secure random token (useful for API keys, etc.)
   * @param length Length of the token in bytes (will be 2x this length in hex)
   * @returns Random hex string
   */
  static generateToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a UUID v4
   * @returns UUID string
   */
  static generateUuid(): string {
    return uuidv4();
  }

  /**
   * Hash a password using bcrypt
   * @param password Password to hash
   * @returns Hashed password
   */
  static async hashPassword(password: string): Promise<string> {
    // We use the auth service for password hashing
    // This is just a placeholder
    throw new Error('Use auth service for password hashing');
  }
}

/**
 * Higher-order function to create an Encrypted field transformer
 * Used with Drizzle ORM schema to automatically encrypt/decrypt fields
 */
export function createEncryptedFieldTransformer() {
  return {
    // When reading from database
    from: (value: string): string => {
      if (!value) return value;
      
      // Check if the value is encrypted
      if (EncryptionService.isEncrypted(value)) {
        try {
          return EncryptionService.decrypt(value);
        } catch (error) {
          console.error('Error decrypting field:', error);
          return '[DECRYPTION ERROR]';
        }
      }
      
      // Return as is if not encrypted
      return value;
    },
    // When writing to database
    to: (value: string): string => {
      if (!value) return value;
      
      // Don't double-encrypt
      if (EncryptionService.isEncrypted(value)) {
        return value;
      }
      
      try {
        return EncryptionService.encrypt(value);
      } catch (error) {
        console.error('Error encrypting field:', error);
        throw new Error('Failed to encrypt field');
      }
    }
  };
}

export default EncryptionService;