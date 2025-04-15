/**
 * Base Connector Interface
 * 
 * Defines the common interface for all data source connectors
 */

import { executeWithRateLimit } from '../../utils/rateLimiting';

/**
 * Authentication configuration for a connector
 */
export interface ConnectorAuth {
  type: string;
  credentials: any;
  scopes?: string[];
  userId?: number;
  refreshToken?: string;
  accessToken?: string;
  expiresAt?: number;
}

/**
 * Generic options interface for connector methods
 */
export interface ConnectorOptions {
  [key: string]: any;
}

/**
 * Base interface for all data connectors
 */
export interface DataConnector {
  /**
   * Initialize the connector with authentication details
   */
  initialize(auth: ConnectorAuth): Promise<void>;
  
  /**
   * Test the connection to ensure it works properly
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Refresh the authentication token if needed
   */
  refreshAuth?(): Promise<void>;
  
  /**
   * Get the name of the service this connector handles
   */
  getServiceName(): string;
  
  /**
   * Get the current authentication status
   */
  getAuthStatus(): { authenticated: boolean; expiresAt?: number };
  
  /**
   * Validate the authentication credentials
   */
  validateAuth(auth: ConnectorAuth): boolean;
}

/**
 * Base class that all connector implementations should extend
 */
export abstract class BaseConnector implements DataConnector {
  protected auth: ConnectorAuth | null = null;
  protected serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Initialize the connector with authentication details
   */
  public async initialize(auth: ConnectorAuth): Promise<void> {
    if (!this.validateAuth(auth)) {
      throw new Error(`Invalid authentication credentials for ${this.serviceName} connector`);
    }
    
    this.auth = auth;
  }
  
  /**
   * Execute an API request with rate limiting
   */
  protected async executeRequest<T>(fn: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T> {
    return executeWithRateLimit(this.serviceName, fn, ...args);
  }
  
  /**
   * Get the name of the service this connector handles
   */
  public getServiceName(): string {
    return this.serviceName;
  }
  
  /**
   * Get the current authentication status
   */
  public getAuthStatus(): { authenticated: boolean; expiresAt?: number } {
    return {
      authenticated: !!this.auth,
      expiresAt: this.auth?.expiresAt
    };
  }
  
  /**
   * Test the connection to ensure it works properly
   */
  public abstract testConnection(): Promise<boolean>;
  
  /**
   * Validate the authentication credentials
   */
  public abstract validateAuth(auth: ConnectorAuth): boolean;
}