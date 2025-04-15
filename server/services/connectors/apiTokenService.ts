/**
 * API Token Service
 * 
 * Manages API tokens for external services
 */

import { pool, db } from '../../db';
import { ConnectorType } from './connectorFactory';
import { ConnectorAuth } from './baseConnector';
import { executeWithRetry } from '../../utils/rateLimiting';

/**
 * API token record
 */
export interface ApiTokenRecord {
  id: number;
  userId: number;
  connectorType: ConnectorType;
  accessToken: string | null;
  refreshToken: string | null;
  tokenSecret: string | null;
  expiresAt: Date | null;
  scope: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Class for managing API tokens
 */
export class ApiTokenService {
  private static instance: ApiTokenService;
  
  /**
   * Get singleton instance of the API token service
   */
  public static getInstance(): ApiTokenService {
    if (!ApiTokenService.instance) {
      ApiTokenService.instance = new ApiTokenService();
    }
    return ApiTokenService.instance;
  }
  
  /**
   * Save an API token
   */
  public async saveToken(
    userId: number,
    connectorType: ConnectorType,
    token: {
      accessToken?: string;
      refreshToken?: string;
      tokenSecret?: string;
      expiresAt?: Date | number;
      scope?: string;
    }
  ): Promise<void> {
    try {
      // Check if token already exists
      const existingToken = await this.getToken(userId, connectorType);
      
      // Convert expiresAt to ISO string if it's a number (timestamp)
      const expiresAt = token.expiresAt 
        ? (typeof token.expiresAt === 'number' 
          ? new Date(token.expiresAt) 
          : token.expiresAt)
        : null;
      
      if (existingToken) {
        // Update existing token
        await executeWithRetry(async () => {
          await pool.query(
            `UPDATE api_tokens
            SET 
              access_token = COALESCE($1, access_token),
              refresh_token = COALESCE($2, refresh_token),
              token_secret = COALESCE($3, token_secret),
              expires_at = COALESCE($4, expires_at),
              scope = COALESCE($5, scope),
              updated_at = NOW()
            WHERE 
              user_id = $6 AND
              connector_type = $7`,
            [
              token.accessToken || null,
              token.refreshToken || null,
              token.tokenSecret || null,
              expiresAt,
              token.scope || null,
              userId,
              connectorType
            ]
          );
        });
      } else {
        // Insert new token
        await executeWithRetry(async () => {
          await pool.query(
            `INSERT INTO api_tokens (
              user_id,
              connector_type,
              access_token,
              refresh_token,
              token_secret,
              expires_at,
              scope,
              created_at,
              updated_at
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
            )`,
            [
              userId,
              connectorType,
              token.accessToken || null,
              token.refreshToken || null,
              token.tokenSecret || null,
              expiresAt,
              token.scope || null
            ]
          );
        });
      }
    } catch (error) {
      console.error(`Error saving API token for user ${userId}, connector ${connectorType}:`, error);
      throw error;
    }
  }
  
  /**
   * Get an API token
   */
  public async getToken(userId: number, connectorType: ConnectorType): Promise<ApiTokenRecord | null> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(
          `SELECT * FROM api_tokens
          WHERE 
            user_id = $1 AND
            connector_type = $2`,
          [userId, connectorType]
        );
      });
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      return {
        id: row.id,
        userId: row.user_id,
        connectorType: row.connector_type as ConnectorType,
        accessToken: row.access_token,
        refreshToken: row.refresh_token,
        tokenSecret: row.token_secret,
        expiresAt: row.expires_at ? new Date(row.expires_at) : null,
        scope: row.scope,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
    } catch (error) {
      console.error(`Error getting API token for user ${userId}, connector ${connectorType}:`, error);
      return null;
    }
  }
  
  /**
   * Delete an API token
   */
  public async deleteToken(userId: number, connectorType: ConnectorType): Promise<boolean> {
    try {
      const result = await executeWithRetry(async () => {
        return await pool.query(
          `DELETE FROM api_tokens
          WHERE 
            user_id = $1 AND
            connector_type = $2`,
          [userId, connectorType]
        );
      });
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting API token for user ${userId}, connector ${connectorType}:`, error);
      return false;
    }
  }
  
  /**
   * Get authentication details for a connector
   */
  public async getConnectorAuth(userId: number, connectorType: ConnectorType): Promise<ConnectorAuth | null> {
    try {
      const token = await this.getToken(userId, connectorType);
      
      if (!token) {
        return null;
      }
      
      // Get connector credentials (client ID, client secret, etc.)
      // This could be stored in a config table or environment variables
      const credentials = this.getConnectorCredentials(connectorType);
      
      return {
        type: 'oauth',
        credentials,
        userId,
        accessToken: token.accessToken || undefined,
        refreshToken: token.refreshToken || undefined,
        expiresAt: token.expiresAt?.getTime(),
        scopes: token.scope?.split(' ')
      };
    } catch (error) {
      console.error(`Error getting connector auth for user ${userId}, connector ${connectorType}:`, error);
      return null;
    }
  }
  
  /**
   * Get connector credentials
   * In a real application, these would be stored in a database or environment variables
   */
  private getConnectorCredentials(connectorType: ConnectorType): any {
    switch (connectorType) {
      case ConnectorType.GOOGLE_DRIVE:
      case ConnectorType.GMAIL:
        return {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          redirectUri: process.env.GOOGLE_REDIRECT_URI
        };
        
      case ConnectorType.MICROSOFT_GRAPH:
        return {
          clientId: process.env.MICROSOFT_CLIENT_ID,
          clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
          redirectUri: process.env.MICROSOFT_REDIRECT_URI,
          tenantId: process.env.MICROSOFT_TENANT_ID
        };
        
      case ConnectorType.SLACK:
        return {
          clientId: process.env.SLACK_CLIENT_ID,
          clientSecret: process.env.SLACK_CLIENT_SECRET,
          redirectUri: process.env.SLACK_REDIRECT_URI
        };
        
      default:
        throw new Error(`Unsupported connector type: ${connectorType}`);
    }
  }
}