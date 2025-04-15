/**
 * Token Service
 * 
 * Handles JWT token generation, validation, and rotation for enhanced security.
 * Implements refresh tokens along with access tokens to provide secure authentication.
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { storage } from '../storage';
import { AuthUser } from '../auth';

// Default token expiration times
const ACCESS_TOKEN_EXPIRY = '1h';  // Access tokens expire in 1 hour
const REFRESH_TOKEN_EXPIRY = '7d'; // Refresh tokens expire in 7 days

// Token types
export type TokenType = 'access' | 'refresh';

// Token payload with standard claims
interface TokenPayload extends JwtPayload {
  id: number;
  username: string;
  role: string;
  authMethod?: string;
  type: TokenType;
  jti: string; // JWT ID (unique identifier for token)
}

/**
 * Generate a secure random token ID
 */
function generateTokenId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Generate a JWT token
 */
export function generateToken(
  user: AuthUser, 
  type: TokenType = 'access', 
  expiry: string = type === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY
): string {
  // Generate a unique token ID
  const jti = generateTokenId();
  
  // Create the payload
  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    role: user.role,
    authMethod: user.authMethod,
    type,
    jti
  };
  
  // Sign the token
  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'default-secret-change-in-production',
    { expiresIn: expiry }
  );
  
  // Store refresh tokens in the database for validation
  if (type === 'refresh') {
    storeRefreshToken(user.id, jti, token);
  }
  
  return token;
}

/**
 * Store a refresh token in the database
 */
async function storeRefreshToken(userId: number, tokenId: string, token: string): Promise<void> {
  try {
    await storage.saveRefreshToken({
      userId,
      tokenId,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
  } catch (error) {
    console.error('Error storing refresh token:', error);
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string, type: TokenType = 'access'): Promise<TokenPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'default-secret-change-in-production',
      async (err, decoded) => {
        if (err) {
          return reject(err);
        }
        
        const payload = decoded as TokenPayload;
        
        // Verify token type
        if (payload.type !== type) {
          return reject(new Error(`Invalid token type: expected ${type}, got ${payload.type}`));
        }
        
        // For refresh tokens, verify it exists in the database
        if (type === 'refresh') {
          try {
            const storedToken = await storage.getRefreshToken(payload.id, payload.jti);
            if (!storedToken) {
              return reject(new Error('Invalid refresh token'));
            }
          } catch (error) {
            return reject(error);
          }
        }
        
        resolve(payload);
      }
    );
  });
}

/**
 * Generate a new access token from a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string, user: AuthUser }> {
  try {
    // Verify the refresh token
    const payload = await verifyToken(refreshToken, 'refresh');
    
    // Get the user
    const user = await storage.getUser(payload.id);
    if (!user) {
      throw new Error('User not found');
    }
    
    // Generate a new access token
    const accessToken = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
      authMethod: user.authMethod
    });
    
    return { accessToken, user };
  } catch (error) {
    throw error;
  }
}

/**
 * Revoke a refresh token
 */
export async function revokeRefreshToken(userId: number, tokenId: string): Promise<boolean> {
  try {
    return await storage.deleteRefreshToken(userId, tokenId);
  } catch (error) {
    console.error('Error revoking refresh token:', error);
    return false;
  }
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllRefreshTokens(userId: number): Promise<boolean> {
  try {
    return await storage.deleteAllRefreshTokens(userId);
  } catch (error) {
    console.error('Error revoking all refresh tokens:', error);
    return false;
  }
}

/**
 * Clean up expired refresh tokens
 */
export async function cleanupExpiredTokens(): Promise<number> {
  try {
    return await storage.deleteExpiredRefreshTokens();
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
}