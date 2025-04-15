/**
 * Microsoft Graph Connector
 * 
 * Implements data fetching from Microsoft Graph API for emails (Outlook)
 */

import * as MicrosoftGraph from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch'; // Required for Microsoft Graph client
import { BaseConnector, ConnectorAuth, ConnectorOptions } from './baseConnector';

/**
 * Email message interface for Microsoft Graph
 */
export interface MsGraphEmailMessage {
  id: string;
  subject?: string;
  bodyPreview?: string;
  body?: {
    contentType?: string;
    content?: string;
  };
  from?: {
    emailAddress?: {
      name?: string;
      address?: string;
    }
  };
  toRecipients?: Array<{
    emailAddress: {
      name?: string;
      address?: string;
    }
  }>;
  ccRecipients?: Array<{
    emailAddress: {
      name?: string;
      address?: string;
    }
  }>;
  bccRecipients?: Array<{
    emailAddress: {
      name?: string;
      address?: string;
    }
  }>;
  receivedDateTime?: string;
  sentDateTime?: string;
  conversationId?: string;
  hasAttachments?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    contentType: string;
    size: number;
    isInline: boolean;
    contentId?: string;
    contentBytes?: string;
  }>;
  [key: string]: any;
}

/**
 * Microsoft Graph connector for fetching emails via Microsoft Graph API
 */
export class MicrosoftGraphConnector extends BaseConnector {
  private client: MicrosoftGraph.Client | null = null;
  
  constructor() {
    super('microsoftGraph');
  }
  
  /**
   * Initialize the Microsoft Graph connector with OAuth credentials
   */
  public async initialize(auth: ConnectorAuth): Promise<void> {
    await super.initialize(auth);
    
    try {
      // Create Microsoft Graph client
      this.client = MicrosoftGraph.Client.init({
        authProvider: async (done) => {
          // Return the token
          done(null, auth.accessToken!);
        }
      });
    } catch (error) {
      console.error('Error initializing Microsoft Graph connector:', error);
      throw new Error('Failed to initialize Microsoft Graph connector');
    }
  }
  
  /**
   * Validate authentication parameters
   */
  public validateAuth(auth: ConnectorAuth): boolean {
    return !!auth && !!auth.accessToken;
  }
  
  /**
   * Test the connection to Microsoft Graph
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.api('/me').get()
      );
      return !!response && !!response.id;
    } catch (error) {
      console.error('Error testing Microsoft Graph connection:', error);
      return false;
    }
  }
  
  /**
   * Refresh authentication token (must be implemented by the authentication provider)
   * Microsoft Graph token refresh is typically handled by the auth provider outside this connector
   */
  public async refreshAuth(): Promise<void> {
    throw new Error('Token refresh must be implemented by the OAuth provider');
  }
  
  /**
   * List email messages
   */
  public async listMessages(options: ConnectorOptions = {}): Promise<MsGraphEmailMessage[]> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    const {
      folderId = 'inbox',
      top = 50,
      skip = 0,
      filter = '',
      orderBy = 'receivedDateTime DESC',
      select = 'id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,hasAttachments,conversationId',
      expand = ''
    } = options;
    
    try {
      // Build request URL
      let requestUrl = `/me/mailFolders/${folderId}/messages`;
      
      // Execute API request with rate limiting
      const response = await this.executeRequest(
        async () => {
          let request = this.client!.api(requestUrl)
            .top(top as number)
            .skip(skip as number)
            .select(select as string)
            .orderby(orderBy as string);
          
          if (filter) {
            request = request.filter(filter as string);
          }
          
          if (expand) {
            request = request.expand(expand as string);
          }
          
          return await request.get();
        }
      );
      
      return (response.value || []) as MsGraphEmailMessage[];
    } catch (error) {
      console.error('Error listing Microsoft Graph messages:', error);
      throw new Error('Failed to list Microsoft Graph messages');
    }
  }
  
  /**
   * Get a single email message
   */
  public async getMessage(messageId: string, options: ConnectorOptions = {}): Promise<MsGraphEmailMessage> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    const {
      select = 'id,subject,body,bodyPreview,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,sentDateTime,hasAttachments,conversationId',
      expand = 'attachments'
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => {
          let request = this.client!.api(`/me/messages/${messageId}`)
            .select(select as string);
          
          if (expand) {
            request = request.expand(expand as string);
          }
          
          return await request.get();
        }
      );
      
      return response as MsGraphEmailMessage;
    } catch (error) {
      console.error(`Error getting Microsoft Graph message ${messageId}:`, error);
      throw new Error(`Failed to get Microsoft Graph message ${messageId}`);
    }
  }
  
  /**
   * Get messages in a conversation (thread)
   */
  public async getConversation(conversationId: string, options: ConnectorOptions = {}): Promise<MsGraphEmailMessage[]> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    const {
      top = 50,
      skip = 0,
      select = 'id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,hasAttachments,conversationId',
      expand = ''
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => {
          let request = this.client!.api(`/me/messages`)
            .filter(`conversationId eq '${conversationId}'`)
            .top(top as number)
            .skip(skip as number)
            .select(select as string)
            .orderby('receivedDateTime ASC');
          
          if (expand) {
            request = request.expand(expand as string);
          }
          
          return await request.get();
        }
      );
      
      return (response.value || []) as MsGraphEmailMessage[];
    } catch (error) {
      console.error(`Error getting Microsoft Graph conversation ${conversationId}:`, error);
      throw new Error(`Failed to get Microsoft Graph conversation ${conversationId}`);
    }
  }
  
  /**
   * List mail folders
   */
  public async listFolders(options: ConnectorOptions = {}): Promise<any[]> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    const {
      top = 100,
      select = 'id,displayName,parentFolderId,childFolderCount,totalItemCount,unreadItemCount'
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => {
          return await this.client!.api('/me/mailFolders')
            .top(top as number)
            .select(select as string)
            .get();
        }
      );
      
      return (response.value || []);
    } catch (error) {
      console.error('Error listing Microsoft Graph mail folders:', error);
      throw new Error('Failed to list Microsoft Graph mail folders');
    }
  }
  
  /**
   * List messages in a folder
   */
  public async getMessagesInFolder(folderId: string, options: ConnectorOptions = {}): Promise<MsGraphEmailMessage[]> {
    return this.listMessages({
      ...options,
      folderId
    });
  }
  
  /**
   * Get an attachment
   */
  public async getAttachment(messageId: string, attachmentId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.api(`/me/messages/${messageId}/attachments/${attachmentId}`).get()
      );
      
      return response;
    } catch (error) {
      console.error(`Error getting Microsoft Graph attachment ${attachmentId} for message ${messageId}:`, error);
      throw new Error(`Failed to get Microsoft Graph attachment ${attachmentId}`);
    }
  }
  
  /**
   * Search messages
   */
  public async searchMessages(query: string, options: ConnectorOptions = {}): Promise<MsGraphEmailMessage[]> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    const {
      top = 50,
      skip = 0,
      select = 'id,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,hasAttachments,conversationId',
      orderBy = 'receivedDateTime DESC'
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => {
          return await this.client!.api('/me/messages')
            .search(JSON.stringify({
              "requests": [
                {
                  "entityTypes": ["message"],
                  "query": {
                    "queryString": query
                  }
                }
              ]
            }))
            .top(top as number)
            .skip(skip as number)
            .select(select as string)
            .orderby(orderBy as string)
            .get();
        }
      );
      
      return (response.value || []) as MsGraphEmailMessage[];
    } catch (error) {
      // If search API fails, fallback to filter
      console.warn('Microsoft Graph search API failed, falling back to filter:', error);
      
      try {
        // Use filter as a fallback (less efficient but more compatible)
        return this.listMessages({
          ...options,
          filter: `contains(subject,'${query}') or contains(bodyPreview,'${query}')`
        });
      } catch (fallbackError) {
        console.error(`Error searching Microsoft Graph messages for "${query}":`, fallbackError);
        throw new Error(`Failed to search Microsoft Graph messages for "${query}"`);
      }
    }
  }
  
  /**
   * Get user information
   */
  public async getUserInfo(): Promise<any> {
    if (!this.client) {
      throw new Error('Microsoft Graph client not initialized');
    }
    
    try {
      return await this.executeRequest(
        async () => await this.client!.api('/me').get()
      );
    } catch (error) {
      console.error('Error getting Microsoft Graph user info:', error);
      throw new Error('Failed to get Microsoft Graph user info');
    }
  }
}