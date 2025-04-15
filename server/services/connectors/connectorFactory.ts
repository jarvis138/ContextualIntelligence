/**
 * Connector Factory
 * 
 * Provides a centralized way to create and manage data source connectors
 */

import { DataConnector, ConnectorAuth } from './baseConnector';
import { GoogleDriveConnector } from './googleDriveConnector';
import { SlackConnector } from './slackConnector';
import { GmailConnector } from './gmailConnector';
import { MicrosoftGraphConnector } from './microsoftGraphConnector';

/**
 * Available connector types
 */
export enum ConnectorType {
  GOOGLE_DRIVE = 'googleDrive',
  SLACK = 'slack',
  GMAIL = 'gmail',
  MICROSOFT_GRAPH = 'microsoftGraph'
}

/**
 * Connector factory for creating and managing connectors
 */
export class ConnectorFactory {
  private static instance: ConnectorFactory;
  private connectors: Map<string, DataConnector> = new Map();
  
  /**
   * Get singleton instance of the connector factory
   */
  public static getInstance(): ConnectorFactory {
    if (!ConnectorFactory.instance) {
      ConnectorFactory.instance = new ConnectorFactory();
    }
    return ConnectorFactory.instance;
  }
  
  /**
   * Create a new connector instance of the specified type
   */
  public createConnector(type: ConnectorType): DataConnector {
    switch (type) {
      case ConnectorType.GOOGLE_DRIVE:
        return new GoogleDriveConnector();
      case ConnectorType.SLACK:
        return new SlackConnector();
      case ConnectorType.GMAIL:
        return new GmailConnector();
      case ConnectorType.MICROSOFT_GRAPH:
        return new MicrosoftGraphConnector();
      default:
        throw new Error(`Unsupported connector type: ${type}`);
    }
  }
  
  /**
   * Create and initialize a connector
   */
  public async getConnector(type: ConnectorType, userId: number, auth: ConnectorAuth): Promise<DataConnector> {
    const key = `${type}:${userId}`;
    
    // Return existing connector if available
    if (this.connectors.has(key)) {
      return this.connectors.get(key)!;
    }
    
    // Create and initialize new connector
    const connector = this.createConnector(type);
    await connector.initialize(auth);
    
    // Cache the connector
    this.connectors.set(key, connector);
    
    return connector;
  }
  
  /**
   * Remove a connector from the cache
   */
  public removeConnector(type: ConnectorType, userId: number): boolean {
    const key = `${type}:${userId}`;
    return this.connectors.delete(key);
  }
  
  /**
   * Clear all connectors
   */
  public clearConnectors(): void {
    this.connectors.clear();
  }
  
  /**
   * Check if a connector is available for a user
   */
  public hasConnector(type: ConnectorType, userId: number): boolean {
    const key = `${type}:${userId}`;
    return this.connectors.has(key);
  }
  
  /**
   * Get all data sources for a user
   */
  public getUserDataSources(userId: number): { type: ConnectorType; status: { authenticated: boolean; expiresAt?: number } }[] {
    const userDataSources: { type: ConnectorType; status: { authenticated: boolean; expiresAt?: number } }[] = [];
    
    // Check each connector type
    for (const type of Object.values(ConnectorType)) {
      const key = `${type}:${userId}`;
      
      if (this.connectors.has(key)) {
        const connector = this.connectors.get(key)!;
        userDataSources.push({
          type: type as ConnectorType,
          status: connector.getAuthStatus()
        });
      }
    }
    
    return userDataSources;
  }
}