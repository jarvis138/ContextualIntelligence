/**
 * Gmail Connector Service
 * 
 * This service handles the connection to Gmail API and provides methods
 * for fetching and processing emails.
 */

import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger, metrics } from '../observability';
import { connectorService } from './index';
import { InsertFetchedData } from '@shared/schema';

export class GmailConnector {
  /**
   * Initialize Gmail client with token
   */
  private async getClient(userId: number): Promise<{
    gmail: gmail_v1.Gmail;
    client: OAuth2Client;
  }> {
    const token = await connectorService.getApiToken(userId, 'gmail');
    
    if (!token || !token.accessToken) {
      throw new Error('No valid Gmail token found for this user');
    }
    
    // Get provider settings
    const oauth2Client = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI
    });
    
    // Set credentials
    oauth2Client.setCredentials({
      access_token: token.accessToken,
      refresh_token: token.refreshToken || undefined,
      expiry_date: token.expiresAt ? new Date(token.expiresAt).getTime() : undefined
    });
    
    // Create Gmail client
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    return { gmail, client: oauth2Client };
  }

  /**
   * Test the connection to Gmail
   */
  async testConnection(params: { userId: number }): Promise<{ success: boolean, profile?: any }> {
    const startTime = Date.now();
    
    try {
      const { gmail } = await this.getClient(params.userId);
      
      // Get profile info to validate connection
      const profile = await gmail.users.getProfile({
        userId: 'me'
      });
      
      metrics.increment('external_api_calls_total', { service: 'gmail', endpoint: 'users.getProfile' });
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'gmail', 
        endpoint: 'users.getProfile' 
      });
      
      return {
        success: true,
        profile: profile.data
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'gmail' });
      logger.error('Gmail connection test failed', { error, userId: params.userId });
      
      return {
        success: false,
        error: error.message || 'Failed to connect to Gmail'
      };
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'gmail' });
    }
  }

  /**
   * Get emails list from Gmail
   */
  async getEmails(params: { 
    userId: number, 
    maxResults?: number,
    query?: string,
    labelIds?: string[],
    includeSpamTrash?: boolean,
    pageToken?: string
  }): Promise<{ messages: any[], nextPageToken?: string }> {
    const startTime = Date.now();
    const maxResults = params.maxResults || 100;
    
    try {
      const { gmail } = await this.getClient(params.userId);
      
      // List messages
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q: params.query,
        labelIds: params.labelIds,
        includeSpamTrash: params.includeSpamTrash,
        pageToken: params.pageToken
      });
      
      metrics.increment('external_api_calls_total', { service: 'gmail', endpoint: 'users.messages.list' });
      
      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'gmail' });
      logger.error('Failed to get Gmail messages', { error, userId: params.userId });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'gmail' });
    }
  }

  /**
   * Get email details
   */
  async getEmail(params: {
    userId: number,
    messageId: string,
    format?: string
  }): Promise<any> {
    const startTime = Date.now();
    const format = params.format || 'full'; // Can be 'minimal', 'full', 'raw', or 'metadata'
    
    try {
      const { gmail } = await this.getClient(params.userId);
      
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: params.messageId,
        format: format as any
      });
      
      metrics.increment('external_api_calls_total', { service: 'gmail', endpoint: 'users.messages.get' });
      
      return response.data;
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'gmail' });
      logger.error('Failed to get Gmail message details', { 
        error, 
        userId: params.userId,
        messageId: params.messageId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'gmail' });
    }
  }

  /**
   * Get Gmail labels
   */
  async getLabels(params: { userId: number }): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      const { gmail } = await this.getClient(params.userId);
      
      const response = await gmail.users.labels.list({
        userId: 'me'
      });
      
      metrics.increment('external_api_calls_total', { service: 'gmail', endpoint: 'users.labels.list' });
      
      return response.data.labels || [];
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'gmail' });
      logger.error('Failed to get Gmail labels', { error, userId: params.userId });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'gmail' });
    }
  }

  /**
   * Parse email content from raw message
   */
  private parseEmailContent(message: any): { 
    subject: string; 
    body: { plain: string; html: string; }; 
    from: string;
    to: string[];
    cc: string[];
    date: Date;
  } {
    let subject = '';
    let plainBody = '';
    let htmlBody = '';
    let from = '';
    let to: string[] = [];
    let cc: string[] = [];
    let date = new Date();
    
    // Process headers
    if (message.payload && message.payload.headers) {
      for (const header of message.payload.headers) {
        switch (header.name.toLowerCase()) {
          case 'subject':
            subject = header.value;
            break;
          case 'from':
            from = header.value;
            break;
          case 'to':
            to = header.value.split(',').map((email: string) => email.trim());
            break;
          case 'cc':
            cc = header.value.split(',').map((email: string) => email.trim());
            break;
          case 'date':
            date = new Date(header.value);
            break;
        }
      }
    }
    
    // Process parts recursively to find plain text and HTML content
    const processParts = (parts: any[]) => {
      if (!parts) return;
      
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          const decoded = Buffer.from(part.body.data, 'base64').toString('utf8');
          plainBody = decoded;
        } else if (part.mimeType === 'text/html' && part.body.data) {
          const decoded = Buffer.from(part.body.data, 'base64').toString('utf8');
          htmlBody = decoded;
        } else if (part.parts) {
          processParts(part.parts);
        }
      }
    };
    
    // Process body parts if they exist
    if (message.payload.parts) {
      processParts(message.payload.parts);
    } else if (message.payload.body && message.payload.body.data) {
      // Handle single-part messages
      const decoded = Buffer.from(message.payload.body.data, 'base64').toString('utf8');
      if (message.payload.mimeType === 'text/html') {
        htmlBody = decoded;
      } else {
        plainBody = decoded;
      }
    }
    
    return {
      subject,
      body: {
        plain: plainBody,
        html: htmlBody
      },
      from,
      to,
      cc,
      date
    };
  }

  /**
   * Process fetched emails from Gmail
   */
  async processEmails(params: {
    userId: number,
    messageIds: string[],
    jobId?: string
  }): Promise<InsertFetchedData[]> {
    const { userId, messageIds, jobId } = params;
    
    try {
      if (!messageIds.length) {
        return [];
      }
      
      const dataItems: InsertFetchedData[] = [];
      
      // Fetch full message details for each email
      for (const messageId of messageIds) {
        try {
          const message = await this.getEmail({
            userId,
            messageId
          });
          
          // Parse email content
          const parsedEmail = this.parseEmailContent(message);
          
          const metadata = {
            messageId: message.id,
            threadId: message.threadId,
            labelIds: message.labelIds || [],
            snippet: message.snippet,
            historyId: message.historyId,
            internalDate: message.internalDate,
            headers: message.payload.headers,
            from: parsedEmail.from,
            to: parsedEmail.to,
            cc: parsedEmail.cc,
            hasAttachments: this.hasAttachments(message)
          };
          
          // Create source URL for Gmail
          const sourceUrl = `https://mail.google.com/mail/#inbox/${message.id}`;
          
          dataItems.push({
            userId,
            jobId: jobId || null,
            dataId: `gmail_msg_${message.id}`,
            connectorType: 'gmail',
            dataType: 'email',
            title: parsedEmail.subject || '(no subject)',
            content: parsedEmail.body.plain,
            metadata,
            sourceUrl,
            sourceId: message.id,
            fetchedAt: parsedEmail.date
          });
        } catch (error) {
          logger.error('Failed to process Gmail message', { 
            error, 
            userId, 
            messageId 
          });
          // Continue with other messages
        }
      }
      
      return dataItems;
    } catch (error) {
      logger.error('Error processing Gmail messages', { error, userId });
      throw error;
    }
  }

  /**
   * Check if an email has attachments
   */
  private hasAttachments(message: any): boolean {
    // Helper function to check parts recursively
    const checkPartsForAttachments = (parts: any[]): boolean => {
      if (!parts) return false;
      
      for (const part of parts) {
        // Check if this part is an attachment
        if (part.filename && part.filename.length > 0) {
          return true;
        }
        
        // Check nested parts
        if (part.parts && checkPartsForAttachments(part.parts)) {
          return true;
        }
      }
      
      return false;
    };
    
    if (!message.payload) return false;
    
    return checkPartsForAttachments(message.payload.parts || []);
  }

  /**
   * Fetch emails and store them
   */
  async fetchAndStoreEmails(params: {
    userId: number,
    query?: string,
    labelIds?: string[],
    maxResults?: number,
    includeSpamTrash?: boolean,
    jobId?: string
  }): Promise<{ count: number, messageIds: string[] }> {
    try {
      // Get email IDs first
      const { messages } = await this.getEmails({
        userId: params.userId,
        query: params.query,
        labelIds: params.labelIds,
        maxResults: params.maxResults,
        includeSpamTrash: params.includeSpamTrash
      });
      
      if (!messages || messages.length === 0) {
        return { count: 0, messageIds: [] };
      }
      
      // Extract message IDs
      const messageIds = messages.map(msg => msg.id);
      
      // Process the emails to get content
      const dataItems = await this.processEmails({
        userId: params.userId,
        messageIds,
        jobId: params.jobId
      });
      
      // Store in database
      if (dataItems.length > 0) {
        await connectorService.storeFetchedData(dataItems);
      }
      
      return {
        count: dataItems.length,
        messageIds
      };
    } catch (error) {
      logger.error('Error fetching and storing Gmail messages', { 
        error, 
        userId: params.userId,
        query: params.query
      });
      throw error;
    }
  }

  /**
   * Execute a job to fetch Gmail messages
   */
  async executeJob(job: any): Promise<{ success: boolean, count: number, error?: string }> {
    try {
      const { parameters, userId } = job;
      
      const result = await this.fetchAndStoreEmails({
        userId,
        query: parameters.query,
        labelIds: parameters.labelIds,
        maxResults: parameters.maxResults || 50,
        includeSpamTrash: parameters.includeSpamTrash || false,
        jobId: job.jobId
      });
      
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      logger.error('Gmail job execution failed', { error, jobId: job.jobId });
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }
  }
}