/**
 * Encryption Service
 * 
 * This service provides encryption, key management, and cryptographic 
 * operations for sensitive data across the application.
 */

// Core imports
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { FeatureFlags } from '../../../shared/feature-flags';
import { featureFlagService } from '../feature-flag';
import { auditLogger } from '../../utils/auditLogger';

// Define encryption modes, key scopes, and rotation frequencies
export enum EncryptionMode {
  DATABASE = 'database',
  FIELD = 'field',
  FILE = 'file',
  MEMORY = 'memory'
}

export enum KeyScope {
  GLOBAL = 'global',
  TENANT = 'tenant',
  USER = 'user'
}

export enum KeyRotationFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  MANUAL = 'manual'
}

// Interface for the encryption key material
interface KeyMaterial {
  id: string;
  key: Buffer;
  iv?: Buffer;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  scope: KeyScope;
  scopeId?: string; // Tenant ID or user ID if applicable
  version: number;
  active: boolean;
}

// Interface for the encrypted data
export interface EncryptedData {
  encryptedValue: string;
  iv: string;
  authTag?: string;
  keyId: string;
  algorithm: string;
  metadata?: {
    encryptedAt: string;
    mode: EncryptionMode;
    version: number;
  };
}

// Default encryption settings
const DEFAULT_ALGORITHM = 'aes-256-gcm';
const DEFAULT_IV_LENGTH = 16;
const DEFAULT_KEY_LENGTH = 32;
const DEFAULT_SALT_ROUNDS = 10;
const DEFAULT_HMAC_ALGORITHM = 'sha256';

class EncryptionService {
  private keys: Map<string, KeyMaterial> = new Map();
  private activeKeysByScope: Map<string, string> = new Map(); // scope:scopeId -> keyId
  
  constructor() {
    console.log('Encryption Service initialized');
    
    // Initialize encryption keys
    this.initializeKeys();
    
    // Set up key rotation schedules based on configuration
    // In a real implementation, we would use a scheduler like node-cron
  }
  
  /**
   * Initialize encryption keys
   */
  private initializeKeys(): void {
    // In a real application, keys would be loaded from a secure storage
    // such as AWS KMS, HashiCorp Vault, or a database with proper encryption at rest
    
    // For development purposes, we'll generate some initial keys
    if (process.env.NODE_ENV === 'development') {
      // Generate a global key
      this.generateKey(KeyScope.GLOBAL, DEFAULT_ALGORITHM);
      
      // Generate keys for demo tenants
      this.generateKey(KeyScope.TENANT, DEFAULT_ALGORITHM, '1');
      this.generateKey(KeyScope.TENANT, DEFAULT_ALGORITHM, '2');
    } else {
      // In production, we would load keys from secure storage
      // For now, we'll also generate keys in memory for demo purposes
      this.generateKey(KeyScope.GLOBAL, DEFAULT_ALGORITHM);
    }
  }
  
  /**
   * Generate a new encryption key
   */
  public generateKey(
    scope: KeyScope = KeyScope.GLOBAL,
    algorithm: string = DEFAULT_ALGORITHM,
    scopeId?: string,
    expiresInDays?: number
  ): string {
    // Generate a new random key
    const keyLength = this.getKeyLength(algorithm);
    const key = crypto.randomBytes(keyLength);
    const iv = crypto.randomBytes(DEFAULT_IV_LENGTH);
    const keyId = crypto.randomUUID();
    
    // Create a new key material object
    const keyMaterial: KeyMaterial = {
      id: keyId,
      key,
      iv,
      algorithm,
      createdAt: new Date(),
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined,
      scope,
      scopeId,
      version: this.getNextKeyVersion(scope, scopeId),
      active: true
    };
    
    // Store the key
    this.keys.set(keyId, keyMaterial);
    
    // Set as active key for this scope
    const scopeKey = `${scope}:${scopeId || 'global'}`;
    this.activeKeysByScope.set(scopeKey, keyId);
    
    // Log key generation (excluding the actual key material)
    auditLogger.log({
      action: 'encryption_key_generated',
      actor: 'system',
      target: `key:${keyId}`,
      targetType: 'encryption_key',
      tenant: scopeId,
      details: {
        scope,
        scopeId,
        algorithm,
        version: keyMaterial.version,
        expiresAt: keyMaterial.expiresAt
      }
    });
    
    return keyId;
  }
  
  /**
   * Get the next key version for a scope
   */
  private getNextKeyVersion(scope: KeyScope, scopeId?: string): number {
    let maxVersion = 0;
    
    // Find the highest existing version for this scope
    for (const [, keyMaterial] of this.keys) {
      if (keyMaterial.scope === scope && keyMaterial.scopeId === scopeId && keyMaterial.version > maxVersion) {
        maxVersion = keyMaterial.version;
      }
    }
    
    return maxVersion + 1;
  }
  
  /**
   * Get key length based on algorithm
   */
  private getKeyLength(algorithm: string): number {
    // For AES, derive key length from the algorithm name (e.g., aes-256-gcm -> 32 bytes)
    if (algorithm.startsWith('aes-')) {
      const match = algorithm.match(/aes-(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10) / 8; // Convert bits to bytes
      }
    }
    
    // Default key length
    return DEFAULT_KEY_LENGTH;
  }
  
  /**
   * Get the active key for a scope
   */
  private getActiveKey(scope: KeyScope = KeyScope.GLOBAL, scopeId?: string): KeyMaterial {
    const scopeKey = `${scope}:${scopeId || 'global'}`;
    const activeKeyId = this.activeKeysByScope.get(scopeKey);
    
    if (activeKeyId && this.keys.has(activeKeyId)) {
      return this.keys.get(activeKeyId)!;
    }
    
    // If no active key found, use the global key or throw error
    if (scope !== KeyScope.GLOBAL) {
      return this.getActiveKey(KeyScope.GLOBAL);
    }
    
    throw new Error('No active encryption key available');
  }
  
  /**
   * Encrypt data
   */
  public encrypt(
    data: string | object,
    mode: EncryptionMode = EncryptionMode.FIELD,
    scope: KeyScope = KeyScope.GLOBAL,
    scopeId?: string
  ): EncryptedData {
    // Convert object to string if necessary
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Get the active key for the specified scope
    const keyMaterial = this.getActiveKey(scope, scopeId);
    
    // Create initialization vector
    const iv = crypto.randomBytes(DEFAULT_IV_LENGTH);
    
    // Encrypt the data
    let cipher, encryptedValue, authTag;
    
    if (keyMaterial.algorithm.includes('gcm')) {
      // For GCM mode, which provides authenticated encryption
      cipher = crypto.createCipheriv(keyMaterial.algorithm, keyMaterial.key, iv, { authTagLength: 16 });
      encryptedValue = Buffer.concat([
        cipher.update(dataString, 'utf8'),
        cipher.final()
      ]).toString('base64');
      authTag = cipher.getAuthTag().toString('base64');
    } else {
      // For other modes (CBC, CTR, etc.)
      cipher = crypto.createCipheriv(keyMaterial.algorithm, keyMaterial.key, iv);
      encryptedValue = Buffer.concat([
        cipher.update(dataString, 'utf8'),
        cipher.final()
      ]).toString('base64');
    }
    
    // Create result object
    const encryptedData: EncryptedData = {
      encryptedValue,
      iv: iv.toString('base64'),
      authTag,
      keyId: keyMaterial.id,
      algorithm: keyMaterial.algorithm,
      metadata: {
        encryptedAt: new Date().toISOString(),
        mode,
        version: keyMaterial.version
      }
    };
    
    return encryptedData;
  }
  
  /**
   * Decrypt data
   */
  public decrypt(encryptedData: EncryptedData): string {
    // Get the key used for encryption
    const keyMaterial = this.keys.get(encryptedData.keyId);
    
    if (!keyMaterial) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
    }
    
    // Convert base64 strings back to buffers
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const encryptedValue = Buffer.from(encryptedData.encryptedValue, 'base64');
    
    // Decrypt the data
    let decipher, decryptedValue;
    
    if (keyMaterial.algorithm.includes('gcm')) {
      // For GCM mode, which provides authenticated encryption
      if (!encryptedData.authTag) {
        throw new Error('Authentication tag missing for GCM decryption');
      }
      
      decipher = crypto.createDecipheriv(keyMaterial.algorithm, keyMaterial.key, iv);
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
      decryptedValue = Buffer.concat([
        decipher.update(encryptedValue),
        decipher.final()
      ]).toString('utf8');
    } else {
      // For other modes (CBC, CTR, etc.)
      decipher = crypto.createDecipheriv(keyMaterial.algorithm, keyMaterial.key, iv);
      decryptedValue = Buffer.concat([
        decipher.update(encryptedValue),
        decipher.final()
      ]).toString('utf8');
    }
    
    return decryptedValue;
  }
  
  /**
   * Rotate keys for a scope
   */
  public rotateKey(scope: KeyScope = KeyScope.GLOBAL, scopeId?: string): string {
    // Mark current active key as inactive
    const oldKey = this.getActiveKey(scope, scopeId);
    oldKey.active = false;
    
    // Generate a new key
    const newKeyId = this.generateKey(scope, oldKey.algorithm, scopeId);
    
    // Log key rotation
    auditLogger.log({
      action: 'encryption_key_rotated',
      actor: 'system',
      target: `key:${newKeyId}`,
      targetType: 'encryption_key',
      tenant: scopeId,
      details: {
        scope,
        scopeId,
        oldKeyId: oldKey.id,
        newKeyId
      }
    });
    
    return newKeyId;
  }
  
  /**
   * Re-encrypt data with the current active key
   */
  public reencrypt(encryptedData: EncryptedData, mode?: EncryptionMode): EncryptedData {
    // Decrypt the data
    const decryptedData = this.decrypt(encryptedData);
    
    // Get key information to determine the original scope
    const keyMaterial = this.keys.get(encryptedData.keyId);
    
    if (!keyMaterial) {
      throw new Error(`Encryption key not found: ${encryptedData.keyId}`);
    }
    
    // Re-encrypt with current active key
    return this.encrypt(
      decryptedData,
      mode || (encryptedData.metadata?.mode as EncryptionMode) || EncryptionMode.FIELD,
      keyMaterial.scope,
      keyMaterial.scopeId
    );
  }
  
  /**
   * Get key information (without the actual key material)
   */
  public getKeyInfo(keyId: string): Omit<KeyMaterial, 'key'> | null {
    const keyMaterial = this.keys.get(keyId);
    
    if (!keyMaterial) {
      return null;
    }
    
    // Return key info without the actual key material
    const { key, ...keyInfo } = keyMaterial;
    return keyInfo;
  }
  
  /**
   * List all keys (without the actual key material)
   */
  public listKeys(): Array<Omit<KeyMaterial, 'key'>> {
    const keyList: Array<Omit<KeyMaterial, 'key'>> = [];
    
    for (const [, keyMaterial] of this.keys) {
      const { key, ...keyInfo } = keyMaterial;
      keyList.push(keyInfo);
    }
    
    return keyList;
  }
  
  /**
   * Calculate HMAC for data integrity verification
   */
  public calculateHmac(data: string | object, keyId?: string): string {
    // Convert object to string if necessary
    const dataString = typeof data === 'object' ? JSON.stringify(data) : data;
    
    // Get key to use
    let keyMaterial: KeyMaterial;
    
    if (keyId && this.keys.has(keyId)) {
      keyMaterial = this.keys.get(keyId)!;
    } else {
      keyMaterial = this.getActiveKey(KeyScope.GLOBAL);
    }
    
    // Calculate HMAC
    const hmac = crypto.createHmac(DEFAULT_HMAC_ALGORITHM, keyMaterial.key);
    hmac.update(dataString, 'utf8');
    return hmac.digest('base64');
  }
  
  /**
   * Verify HMAC for data integrity
   */
  public verifyHmac(data: string | object, hmac: string, keyId: string): boolean {
    // Calculate HMAC with the specified key
    const calculatedHmac = this.calculateHmac(data, keyId);
    
    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHmac, 'base64'),
      Buffer.from(hmac, 'base64')
    );
  }
  
  /**
   * Generate a password hash
   */
  public hashPassword(password: string): string {
    // Use bcrypt to hash passwords
    return bcrypt.hashSync(password, DEFAULT_SALT_ROUNDS);
  }
  
  /**
   * Verify a password against a hash
   */
  public verifyPassword(password: string, storedHash: string): boolean {
    // Use bcrypt to verify passwords
    return bcrypt.compareSync(password, storedHash);
  }
  
  /**
   * Encrypt a file
   */
  public encryptFile(fileBuffer: Buffer, scope: KeyScope = KeyScope.GLOBAL, scopeId?: string): {
    encryptedBuffer: Buffer;
    metadata: EncryptedData;
  } {
    // Get the active key for the specified scope
    const keyMaterial = this.getActiveKey(scope, scopeId);
    
    // Create initialization vector
    const iv = crypto.randomBytes(DEFAULT_IV_LENGTH);
    
    // Encrypt the file
    let cipher, encryptedBuffer, authTag;
    
    if (keyMaterial.algorithm.includes('gcm')) {
      // For GCM mode, which provides authenticated encryption
      cipher = crypto.createCipheriv(keyMaterial.algorithm, keyMaterial.key, iv, { authTagLength: 16 });
      encryptedBuffer = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
      authTag = cipher.getAuthTag().toString('base64');
    } else {
      // For other modes (CBC, CTR, etc.)
      cipher = crypto.createCipheriv(keyMaterial.algorithm, keyMaterial.key, iv);
      encryptedBuffer = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final()
      ]);
    }
    
    // Create metadata object
    const metadata: EncryptedData = {
      encryptedValue: '', // Not used for files, as we return the buffer separately
      iv: iv.toString('base64'),
      authTag,
      keyId: keyMaterial.id,
      algorithm: keyMaterial.algorithm,
      metadata: {
        encryptedAt: new Date().toISOString(),
        mode: EncryptionMode.FILE,
        version: keyMaterial.version
      }
    };
    
    return {
      encryptedBuffer,
      metadata
    };
  }
  
  /**
   * Decrypt a file
   */
  public decryptFile(encryptedBuffer: Buffer, metadata: EncryptedData): Buffer {
    // Get the key used for encryption
    const keyMaterial = this.keys.get(metadata.keyId);
    
    if (!keyMaterial) {
      throw new Error(`Encryption key not found: ${metadata.keyId}`);
    }
    
    // Convert base64 strings back to buffers
    const iv = Buffer.from(metadata.iv, 'base64');
    
    // Decrypt the file
    let decipher, decryptedBuffer;
    
    if (keyMaterial.algorithm.includes('gcm')) {
      // For GCM mode, which provides authenticated encryption
      if (!metadata.authTag) {
        throw new Error('Authentication tag missing for GCM decryption');
      }
      
      decipher = crypto.createDecipheriv(keyMaterial.algorithm, keyMaterial.key, iv);
      decipher.setAuthTag(Buffer.from(metadata.authTag, 'base64'));
      decryptedBuffer = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);
    } else {
      // For other modes (CBC, CTR, etc.)
      decipher = crypto.createDecipheriv(keyMaterial.algorithm, keyMaterial.key, iv);
      decryptedBuffer = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final()
      ]);
    }
    
    return decryptedBuffer;
  }
  
  /**
   * Generate a secure random token
   */
  public generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }
}

// Create and export the singleton instance
export const encryptionService = new EncryptionService();