/**
 * PKCE (Proof Key for Code Exchange) Service
 * 
 * This service implements the PKCE extension for OAuth 2.0 authorization code flow.
 * PKCE provides additional security for authorization code flow, especially for public clients.
 */

import { randomBytes, createHash } from 'crypto';
import { db } from '../db';
import { pkceCodeVerifiers, type InsertPkceCodeVerifier } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

export class PKCEService {
  /**
   * Generate a code verifier for PKCE
   * A code verifier is a high-entropy cryptographic random string
   * 
   * @returns A randomly generated code verifier string
   */
  static generateCodeVerifier(): string {
    // Generate a random string between 43-128 characters
    // (we use 64 bytes which gives us ~86 characters after base64url encoding)
    return randomBytes(64)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .slice(0, 128);
  }

  /**
   * Generate a code challenge for PKCE
   * The code challenge is derived from the code verifier using a hash function
   * 
   * @param codeVerifier The code verifier to generate a challenge from
   * @param method The method to use for generating the challenge (S256 or plain)
   * @returns The generated code challenge
   */
  static generateCodeChallenge(codeVerifier: string, method: 'S256' | 'plain' = 'S256'): string {
    if (method === 'plain') {
      return codeVerifier;
    }
    
    // SHA-256 hash
    const hash = createHash('sha256').update(codeVerifier).digest('base64');
    
    // Base64url encoding
    return hash
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Generate a random state for OAuth authorization requests
   * 
   * @returns A random state string
   */
  static generateState(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Store a PKCE code verifier in the database
   * 
   * @param params The PKCE code verifier data to store
   * @returns The stored PKCE code verifier
   */
  static async storePkceCodeVerifier(params: InsertPkceCodeVerifier) {
    const [result] = await db.insert(pkceCodeVerifiers).values(params).returning();
    return result;
  }

  /**
   * Retrieve a PKCE code verifier by state
   * 
   * @param state The state used to retrieve the code verifier
   * @returns The PKCE code verifier or null if not found
   */
  static async getPkceCodeVerifierByState(state: string) {
    const [verifier] = await db
      .select()
      .from(pkceCodeVerifiers)
      .where(eq(pkceCodeVerifiers.state, state));
    
    return verifier || null;
  }

  /**
   * Mark a PKCE code verifier as used
   * 
   * @param state The state of the code verifier to mark as used
   * @returns The updated PKCE code verifier or null if not found
   */
  static async markPkceCodeVerifierAsUsed(state: string) {
    const [verifier] = await db
      .update(pkceCodeVerifiers)
      .set({ used: true })
      .where(eq(pkceCodeVerifiers.state, state))
      .returning();
    
    return verifier || null;
  }

  /**
   * Clean up expired PKCE code verifiers
   * 
   * @returns The number of deleted records
   */
  static async cleanupExpiredCodeVerifiers() {
    const now = new Date();
    const result = await db
      .delete(pkceCodeVerifiers)
      .where(sql`${pkceCodeVerifiers.expiresAt} < ${now}`);
    
    return result.rowCount || 0;
  }
}