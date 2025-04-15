import crypto from 'crypto';

/**
 * Utility class for AES-256 encryption and decryption of sensitive data
 */
export class Encryption {
  private static readonly algorithm = 'aes-256-gcm';
  private static readonly keyLength = 32; // 256 bits
  private static readonly ivLength = 16; // 128 bits
  private static readonly authTagLength = 16; // 128 bits
  
  // Encryption key (derived from environment or a secure source)
  private static getEncryptionKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    
    if (envKey && envKey.length >= this.keyLength) {
      return Buffer.from(envKey.slice(0, this.keyLength));
    }
    
    // If no key in environment, derive one from server secret
    // NOTE: In production, you should always provide a strong encryption key
    const serverSecret = process.env.SESSION_SECRET || 'default-session-secret-do-not-use-in-production';
    return crypto.scryptSync(serverSecret, 'cpi-hub-salt', this.keyLength);
  }
  
  /**
   * Encrypts a string using AES-256-GCM
   * @param text Plain text to encrypt
   * @returns Encrypted text in format: iv:authTag:encryptedData (base64)
   */
  public static encrypt(text: string): string {
    // Generate random initialization vector
    const iv = crypto.randomBytes(this.ivLength);
    
    // Create cipher using key and IV
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return IV, auth tag, and encrypted data as a single string
    return Buffer.concat([
      iv, 
      authTag, 
      Buffer.from(encrypted, 'base64')
    ]).toString('base64');
  }
  
  /**
   * Decrypts a string that was encrypted using the encrypt method
   * @param encryptedText The encrypted text in format: iv:authTag:encryptedData (base64)
   * @returns The decrypted plain text
   */
  public static decrypt(encryptedText: string): string {
    try {
      // Convert from base64 to buffer
      const buffer = Buffer.from(encryptedText, 'base64');
      
      // Extract IV, auth tag, and encrypted data
      const iv = buffer.subarray(0, this.ivLength);
      const authTag = buffer.subarray(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = buffer.subarray(this.ivLength + this.authTagLength).toString('base64');
      
      // Create decipher
      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
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
}