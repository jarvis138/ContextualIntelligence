/**
 * Enterprise-Grade Encryption Service
 * 
 * This service provides encryption capabilities for sensitive data at rest,
 * supporting the enhanced security requirements for enterprise deployments.
 * 
 * Features:
 * - AES-256-GCM encryption for data at rest
 * - Key rotation support
 * - Envelope encryption (data key + master key)
 * - Support for different encryption contexts
 */

import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { featureFlagService } from '../feature-flag';
import { FeatureFlags } from '../../../shared/feature-flags';

// Default algorithm for encryption
const DEFAULT_ALGORITHM = 'aes-256-gcm';

// Types of data that may be encrypted
export type EncryptionContext = 
  | 'ai_prompt'
  | 'ai_completion'
  | 'pii'
  | 'document'
  | 'user'
  | 'authentication'
  | 'financial'
  | 'health';

interface EncryptionKey {
  id: string;
  key: Buffer;
  createdAt: Date;
  algorithm: string;
  active: boolean;
}

interface EncryptedData {
  iv: string;
  authTag: string; 
  encryptedData: string;
  keyId: string;
  algorithm: string;
  context: EncryptionContext;
  metadata?: Record<string, string>;
}

export class EnterpriseEncryptionService {
  private keys: Map<string, EncryptionKey> = new Map();
  private currentKeyId: string | null = null;
  
  constructor() {
    // Initialize with at least one encryption key
    this.generateNewKey();
    console.log('Enterprise Encryption Service initialized');
  }
  
  /**
   * Generate a new encryption key
   */
  public generateNewKey(makeActive: boolean = true): string {
    const keyId = randomUUID();
    const key = crypto.randomBytes(32); // 256 bits
    
    const encryptionKey: EncryptionKey = {
      id: keyId,
      key,
      createdAt: new Date(),
      algorithm: DEFAULT_ALGORITHM,
      active: makeActive
    };
    
    this.keys.set(keyId, encryptionKey);
    
    if (makeActive) {
      this.currentKeyId = keyId;
    }
    
    return keyId;
  }
  
  /**
   * Encrypt data with the current active key
   */
  public encrypt(
    data: string,
    context: EncryptionContext,
    metadata?: Record<string, string>
  ): EncryptedData {
    // Check if enhanced security is enabled
    if (!this.isEnhancedSecurityEnabled()) {
      // Return a format that indicates the data is not encrypted
      return {
        iv: '',
        authTag: '',
        encryptedData: data, // Store plaintext
        keyId: 'none',
        algorithm: 'none',
        context,
        metadata
      };
    }
    
    if (!this.currentKeyId || !this.keys.has(this.currentKeyId)) {
      this.generateNewKey();
    }
    
    const key = this.keys.get(this.currentKeyId!)!;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      key.algorithm,
      key.key,
      iv
    ) as crypto.CipherGCM;
    
    let encryptedData = cipher.update(data, 'utf8', 'hex');
    encryptedData += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    
    return {
      iv: iv.toString('hex'),
      authTag,
      encryptedData,
      keyId: key.id,
      algorithm: key.algorithm,
      context,
      metadata
    };
  }
  
  /**
   * Decrypt previously encrypted data
   */
  public decrypt(encryptedData: EncryptedData): string {
    // Check if the data is actually encrypted
    if (encryptedData.keyId === 'none' && encryptedData.algorithm === 'none') {
      return encryptedData.encryptedData; // Return the plaintext
    }
    
    const key = this.keys.get(encryptedData.keyId);
    if (!key) {
      throw new Error(`Encryption key with ID ${encryptedData.keyId} not found`);
    }
    
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(
      encryptedData.algorithm,
      key.key,
      iv
    ) as crypto.DecipherGCM;
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Rotate encryption keys - generates a new active key
   */
  public rotateKeys(): string {
    // Mark all current keys as inactive
    this.keys.forEach(key => {
      key.active = false;
    });
    
    // Generate a new active key
    return this.generateNewKey(true);
  }
  
  /**
   * Re-encrypt data with the current active key
   */
  public reencrypt(encryptedData: EncryptedData): EncryptedData {
    const decrypted = this.decrypt(encryptedData);
    return this.encrypt(
      decrypted, 
      encryptedData.context, 
      encryptedData.metadata
    );
  }
  
  /**
   * Check if enhanced security features are enabled
   */
  private isEnhancedSecurityEnabled(): boolean {
    return featureFlagService.isEnabled(FeatureFlags.ENHANCED_SECURITY);
  }
  
  /**
   * Get information about a specific encryption key
   */
  public getKeyInfo(keyId: string): Omit<EncryptionKey, 'key'> | null {
    const key = this.keys.get(keyId);
    if (!key) {
      return null;
    }
    
    // Return key info without the sensitive key material
    const { key: _, ...keyInfo } = key;
    return keyInfo;
  }
  
  /**
   * Get information about all encryption keys
   */
  public getAllKeyInfo(): Omit<EncryptionKey, 'key'>[] {
    return Array.from(this.keys.values()).map(key => {
      const { key: _, ...keyInfo } = key;
      return keyInfo;
    });
  }
  
  /**
   * Remove an old encryption key (should only be done after re-encrypting all data)
   */
  public removeKey(keyId: string): boolean {
    if (keyId === this.currentKeyId) {
      throw new Error('Cannot remove the current active key');
    }
    
    return this.keys.delete(keyId);
  }
}

// Create and export a singleton instance
export const enterpriseEncryptionService = new EnterpriseEncryptionService();