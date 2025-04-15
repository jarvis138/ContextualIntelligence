/**
 * Gmail Connector
 * 
 * Implements data fetching from Gmail API
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { BaseConnector, ConnectorAuth, ConnectorOptions } from './baseConnector';

/**
 * Email message interface
 */
export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: string;
  payload?: {
    mimeType?: string;
    headers?: Array<{ name: string; value: string }>;
    body?: { size: number; data?: string };
    parts?: Array<any>;
  };
  sizeEstimate?: number;
  raw?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  date?: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    mimeType: string;
    size: number;
    attachmentId?: string;
    data?: any;
  }>;
  [key: string]: any;
}

/**
 * Thread interface
 */
export interface EmailThread {
  id: string;
  snippet?: string;
  historyId?: string;
  messages?: EmailMessage[];
  [key: string]: any;
}

/**
 * Gmail connector for fetching emails via Gmail API
 */
export class GmailConnector extends BaseConnector {
  private client: OAuth2Client | null = null;
  private gmailClient: gmail_v1.Gmail | null = null;
  
  constructor() {
    super('gmail');
  }
  
  /**
   * Initialize the Gmail connector with OAuth credentials
   */
  public async initialize(auth: ConnectorAuth): Promise<void> {
    await super.initialize(auth);
    
    try {
      // Create OAuth client
      this.client = new google.auth.OAuth2(
        auth.credentials.clientId,
        auth.credentials.clientSecret,
        auth.credentials.redirectUri
      );
      
      // Set credentials
      this.client.setCredentials({
        access_token: auth.accessToken,
        refresh_token: auth.refreshToken,
        expiry_date: auth.expiresAt
      });
      
      // Create Gmail client
      this.gmailClient = google.gmail({
        version: 'v1',
        auth: this.client
      });
    } catch (error) {
      console.error('Error initializing Gmail connector:', error);
      throw new Error('Failed to initialize Gmail connector');
    }
  }
  
  /**
   * Validate authentication parameters
   */
  public validateAuth(auth: ConnectorAuth): boolean {
    return (
      !!auth &&
      !!auth.credentials &&
      !!auth.credentials.clientId &&
      !!auth.credentials.clientSecret &&
      (!!auth.accessToken || !!auth.refreshToken)
    );
  }
  
  /**
   * Test the connection to Gmail
   */
  public async testConnection(): Promise<boolean> {
    if (!this.gmailClient) {
      return false;
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.getProfile({ userId: 'me' })
      );
      return !!response && !!response.data;
    } catch (error) {
      console.error('Error testing Gmail connection:', error);
      return false;
    }
  }
  
  /**
   * Refresh authentication token if expired
   */
  public async refreshAuth(): Promise<void> {
    if (!this.client || !this.auth?.refreshToken) {
      throw new Error('Cannot refresh authentication: No refresh token available');
    }
    
    try {
      const refreshedTokens = await this.client.refreshAccessToken();
      
      // Update local auth state
      if (this.auth) {
        this.auth.accessToken = refreshedTokens.credentials.access_token;
        this.auth.expiresAt = refreshedTokens.credentials.expiry_date;
      }
      
      // Update client with new tokens
      this.client.setCredentials(refreshedTokens.credentials);
    } catch (error) {
      console.error('Error refreshing Gmail authentication:', error);
      throw new Error('Failed to refresh Gmail authentication');
    }
  }
  
  /**
   * List email messages
   */
  public async listMessages(options: ConnectorOptions = {}): Promise<EmailMessage[]> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }
    
    const {
      maxResults = 100,
      pageToken,
      q = '',
      labelIds = [],
      includeSpamTrash = false
    } = options;
    
    try {
      // Get message list
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.messages.list({
          userId: 'me',
          maxResults: maxResults as number,
          pageToken: pageToken as string,
          q: q as string,
          labelIds: labelIds as string[],
          includeSpamTrash: includeSpamTrash as boolean
        })
      );
      
      const messages = response.data.messages || [];
      
      // Get full message details for each message ID
      const fullMessages = await Promise.all(
        messages.map(async (message) => {
          return await this.getMessage(message.id!);
        })
      );
      
      return fullMessages;
    } catch (error) {
      console.error('Error listing Gmail messages:', error);
      throw new Error('Failed to list Gmail messages');
    }
  }
  
  /**
   * Get a single email message
   */
  public async getMessage(messageId: string, options: ConnectorOptions = {}): Promise<EmailMessage> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }
    
    const { format = 'full' } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.messages.get({
          userId: 'me',
          id: messageId,
          format: format as string
        })
      );
      
      const message = response.data;
      
      // Extract common email fields from headers
      const emailMessage: EmailMessage = {
        id: message.id!,
        threadId: message.threadId!,
        labelIds: message.labelIds,
        snippet: message.snippet,
        historyId: message.historyId,
        internalDate: message.internalDate,
        payload: message.payload,
        sizeEstimate: message.sizeEstimate
      };
      
      // Parse headers for common fields
      if (message.payload?.headers) {
        const headers: Record<string, string> = {};
        for (const header of message.payload.headers) {
          headers[header.name.toLowerCase()] = header.value;
        }
        
        emailMessage.from = headers.from || headers['from'] || '';
        emailMessage.to = (headers.to || headers['to'] || '').split(',').map(e => e.trim());
        emailMessage.cc = (headers.cc || headers['cc'] || '').split(',').map(e => e.trim()).filter(Boolean);
        emailMessage.bcc = (headers.bcc || headers['bcc'] || '').split(',').map(e => e.trim()).filter(Boolean);
        emailMessage.subject = headers.subject || headers['subject'] || '';
        emailMessage.date = headers.date || headers['date'] || '';
      }
      
      // Parse parts for content
      if (message.payload) {
        emailMessage.text = '';
        emailMessage.html = '';
        emailMessage.attachments = [];
        
        // Helper function to process message parts recursively
        const processParts = (part: any) => {
          const mimeType = part.mimeType || '';
          
          // Handle plain text
          if (mimeType === 'text/plain' && part.body?.data) {
            const text = Buffer.from(part.body.data, 'base64').toString('utf-8');
            emailMessage.text = (emailMessage.text || '') + text;
          }
          
          // Handle HTML
          if (mimeType === 'text/html' && part.body?.data) {
            const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
            emailMessage.html = (emailMessage.html || '') + html;
          }
          
          // Handle attachments
          if (part.filename && part.filename.length > 0) {
            emailMessage.attachments!.push({
              filename: part.filename,
              mimeType: part.mimeType,
              size: part.body?.size || 0,
              attachmentId: part.body?.attachmentId
            });
          }
          
          // Process nested parts
          if (part.parts && part.parts.length > 0) {
            for (const subPart of part.parts) {
              processParts(subPart);
            }
          }
        };
        
        // Process the main payload
        if (message.payload.body?.data) {
          if (message.payload.mimeType === 'text/plain') {
            emailMessage.text = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
          } else if (message.payload.mimeType === 'text/html') {
            emailMessage.html = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
          }
        }
        
        // Process parts if they exist
        if (message.payload.parts) {
          for (const part of message.payload.parts) {
            processParts(part);
          }
        }
      }
      
      return emailMessage;
    } catch (error) {
      console.error(`Error getting Gmail message ${messageId}:`, error);
      throw new Error(`Failed to get Gmail message ${messageId}`);
    }
  }
  
  /**
   * Get thread with all messages
   */
  public async getThread(threadId: string): Promise<EmailThread> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.threads.get({
          userId: 'me',
          id: threadId
        })
      );
      
      const thread = response.data;
      
      // Process messages in the thread
      const messages = await Promise.all(
        (thread.messages || []).map(async (message) => {
          // Create basic message structure from thread data
          const emailMessage: EmailMessage = {
            id: message.id!,
            threadId: message.threadId!,
            labelIds: message.labelIds,
            snippet: message.snippet,
            historyId: message.historyId,
            internalDate: message.internalDate,
            payload: message.payload,
            sizeEstimate: message.sizeEstimate
          };
          
          // Parse headers
          if (message.payload?.headers) {
            const headers: Record<string, string> = {};
            for (const header of message.payload.headers) {
              headers[header.name.toLowerCase()] = header.value;
            }
            
            emailMessage.from = headers.from || headers['from'] || '';
            emailMessage.to = (headers.to || headers['to'] || '').split(',').map(e => e.trim());
            emailMessage.cc = (headers.cc || headers['cc'] || '').split(',').map(e => e.trim()).filter(Boolean);
            emailMessage.bcc = (headers.bcc || headers['bcc'] || '').split(',').map(e => e.trim()).filter(Boolean);
            emailMessage.subject = headers.subject || headers['subject'] || '';
            emailMessage.date = headers.date || headers['date'] || '';
          }
          
          // Parse parts for content
          if (message.payload) {
            emailMessage.text = '';
            emailMessage.html = '';
            emailMessage.attachments = [];
            
            // Helper function to process message parts recursively
            const processParts = (part: any) => {
              const mimeType = part.mimeType || '';
              
              // Handle plain text
              if (mimeType === 'text/plain' && part.body?.data) {
                const text = Buffer.from(part.body.data, 'base64').toString('utf-8');
                emailMessage.text = (emailMessage.text || '') + text;
              }
              
              // Handle HTML
              if (mimeType === 'text/html' && part.body?.data) {
                const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
                emailMessage.html = (emailMessage.html || '') + html;
              }
              
              // Handle attachments
              if (part.filename && part.filename.length > 0) {
                emailMessage.attachments!.push({
                  filename: part.filename,
                  mimeType: part.mimeType,
                  size: part.body?.size || 0,
                  attachmentId: part.body?.attachmentId
                });
              }
              
              // Process nested parts
              if (part.parts && part.parts.length > 0) {
                for (const subPart of part.parts) {
                  processParts(subPart);
                }
              }
            };
            
            // Process the main payload
            if (message.payload.body?.data) {
              if (message.payload.mimeType === 'text/plain') {
                emailMessage.text = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
              } else if (message.payload.mimeType === 'text/html') {
                emailMessage.html = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
              }
            }
            
            // Process parts if they exist
            if (message.payload.parts) {
              for (const part of message.payload.parts) {
                processParts(part);
              }
            }
          }
          
          return emailMessage;
        })
      );
      
      return {
        id: thread.id!,
        snippet: thread.snippet,
        historyId: thread.historyId,
        messages
      };
    } catch (error) {
      console.error(`Error getting Gmail thread ${threadId}:`, error);
      throw new Error(`Failed to get Gmail thread ${threadId}`);
    }
  }
  
  /**
   * List email threads
   */
  public async listThreads(options: ConnectorOptions = {}): Promise<EmailThread[]> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }
    
    const {
      maxResults = 100,
      pageToken,
      q = '',
      labelIds = [],
      includeSpamTrash = false
    } = options;
    
    try {
      // Get thread list
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.threads.list({
          userId: 'me',
          maxResults: maxResults as number,
          pageToken: pageToken as string,
          q: q as string,
          labelIds: labelIds as string[],
          includeSpamTrash: includeSpamTrash as boolean
        })
      );
      
      const threads = response.data.threads || [];
      
      // Get thread details (using partial info to avoid over-fetching)
      return threads.map(thread => ({
        id: thread.id!,
        snippet: thread.snippet
        // Messages will be loaded on demand
      }));
    } catch (error) {
      console.error('Error listing Gmail threads:', error);
      throw new Error('Failed to list Gmail threads');
    }
  }
  
  /**
   * Get an attachment
   */
  public async getAttachment(messageId: string, attachmentId: string): Promise<{ data: string; size: number }> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.messages.attachments.get({
          userId: 'me',
          messageId,
          id: attachmentId
        })
      );
      
      return {
        data: response.data.data || '',
        size: response.data.size || 0
      };
    } catch (error) {
      console.error(`Error getting Gmail attachment ${attachmentId} for message ${messageId}:`, error);
      throw new Error(`Failed to get Gmail attachment ${attachmentId}`);
    }
  }
  
  /**
   * Search messages
   */
  public async searchMessages(query: string, options: ConnectorOptions = {}): Promise<EmailMessage[]> {
    return this.listMessages({
      ...options,
      q: query
    });
  }
  
  /**
   * List labels
   */
  public async listLabels(): Promise<any[]> {
    if (!this.gmailClient) {
      throw new Error('Gmail client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.gmailClient!.users.labels.list({
          userId: 'me'
        })
      );
      
      return response.data.labels || [];
    } catch (error) {
      console.error('Error listing Gmail labels:', error);
      throw new Error('Failed to list Gmail labels');
    }
  }
}