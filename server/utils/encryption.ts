import crypto from 'crypto';

/**
 * Utility class for AES-256 encryption and decryption of sensitive data
 */
export class Encryption {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32; // 256 bits
  private static readonly ivLength = 16; // 128 bits
  private static readonly authTagLength = 16; // 128 bits
  
  /**
   * Get encryption key from environment or generate a new one
   * In production, this should always be from environment
   */
  private static getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey) {
      return Buffer.from(envKey, 'hex');
    } else {
      // For development only - in production, always use an environment variable
      console.warn('WARNING: Using fallback encryption key. Set ENCRYPTION_KEY environment variable in production.');
      
      // Use a deterministic key for development to avoid losing access to encrypted data
      // on application restart
      return crypto.scryptSync('development-encryption-key-do-not-use-in-production', 'salt', this.keyLength);
    }
  }
  
  /**
   * Encrypts a string using AES-256-GCM
   * @param text Plain text to encrypt
   * @returns Encrypted text in format: iv:authTag:encryptedData (base64)
   */
  public static encrypt(text: string): string {
    // Generate a random initialization vector
    const iv = crypto.randomBytes(this.ivLength);
    
    // Get the encryption key
    const key = this.getEncryptionKey();
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Format as iv:authTag:encryptedData and encode to base64
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }
  
  /**
   * Decrypts a string that was encrypted using the encrypt method
   * @param encryptedText The encrypted text in format: iv:authTag:encryptedData (base64)
   * @returns The decrypted plain text
   */
  public static decrypt(encryptedText: string): string {
    try {
      // Parse the parts from the base64 string
      const buffer = Buffer.from(encryptedText, 'base64');
      
      // Extract the different parts
      const iv = buffer.subarray(0, this.ivLength);
      const authTag = buffer.subarray(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = buffer.subarray(this.ivLength + this.authTagLength);
      
      // Get the decryption key
      const key = this.getEncryptionKey();
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data: The data may be corrupted or tampered with');
    }
  }
}