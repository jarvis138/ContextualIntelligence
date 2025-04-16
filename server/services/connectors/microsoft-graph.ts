/**
 * Microsoft Graph Connector Service
 * 
 * This service handles the connection to Microsoft Graph API and provides methods
 * for fetching and processing data from Microsoft services (OneDrive, Outlook, Teams, etc.)
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { logger, metrics } from '../observability';
import { connectorService } from './index';
import { InsertFetchedData } from '@shared/schema';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { Readable } from 'stream';

// Helper for file operations
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/**
 * Authentication Provider for Microsoft Graph Client
 */
class TokenAuthProvider {
  private accessToken: string;
  
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }
  
  /**
   * Get access token for MS Graph API
   */
  public async getAccessToken(): Promise<string> {
    return this.accessToken;
  }
}

export class MicrosoftGraphConnector {
  /**
   * Initialize Microsoft Graph client with token
   */
  private async getClient(userId: number): Promise<Client> {
    const token = await connectorService.getApiToken(userId, 'microsoft_graph');
    
    if (!token || !token.accessToken) {
      throw new Error('No valid Microsoft Graph token found for this user');
    }
    
    const authProvider = new TokenAuthProvider(token.accessToken);
    
    return Client.initWithMiddleware({
      authProvider: authProvider
    });
  }

  /**
   * Test the connection to Microsoft Graph
   */
  async testConnection(params: { userId: number }): Promise<{ success: boolean, userInfo?: any }> {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient(params.userId);
      
      // Get user info to validate connection
      const response = await client.api('/me').get();
      
      metrics.increment('external_api_calls_total', { service: 'microsoft_graph', endpoint: '/me' });
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'microsoft_graph', 
        endpoint: '/me' 
      });
      
      return {
        success: true,
        userInfo: response
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'microsoft_graph' });
      logger.error('Microsoft Graph connection test failed', { error, userId: params.userId });
      
      return {
        success: false,
        error: error.message || 'Failed to connect to Microsoft Graph'
      };
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'microsoft_graph' });
    }
  }

  /**
   * Get files list from OneDrive
   */
  async getOneDriveFiles(params: { 
    userId: number, 
    folderId?: string,
    pageSize?: number,
    filter?: string,
    orderBy?: string
  }): Promise<{ files: any[], nextLink?: string }> {
    const startTime = Date.now();
    const pageSize = params.pageSize || 100;
    
    try {
      const client = await this.getClient(params.userId);
      
      // Determine base path based on folder ID
      let apiPath = '/me/drive/root/children';
      if (params.folderId) {
        apiPath = `/me/drive/items/${params.folderId}/children`;
      }
      
      // Build request with query parameters
      let request = client.api(apiPath)
        .top(pageSize);
      
      // Add optional parameters
      if (params.filter) {
        request = request.filter(params.filter);
      }
      
      if (params.orderBy) {
        request = request.orderby(params.orderBy);
      }
      
      const response = await request.get();
      
      metrics.increment('external_api_calls_total', { service: 'microsoft_graph', endpoint: 'onedrive.files' });
      
      return {
        files: response.value || [],
        nextLink: response['@odata.nextLink']
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'microsoft_graph' });
      logger.error('Failed to get OneDrive files', { error, userId: params.userId });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'microsoft_graph' });
    }
  }

  /**
   * Get file metadata from OneDrive
   */
  async getOneDriveFileMetadata(params: {
    userId: number,
    fileId: string
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient(params.userId);
      
      const response = await client.api(`/me/drive/items/${params.fileId}`).get();
      
      metrics.increment('external_api_calls_total', { service: 'microsoft_graph', endpoint: 'onedrive.file' });
      
      return response;
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'microsoft_graph' });
      logger.error('Failed to get OneDrive file metadata', { 
        error, 
        userId: params.userId,
        fileId: params.fileId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'microsoft_graph' });
    }
  }

  /**
   * Download file content from OneDrive
   */
  async downloadOneDriveFile(params: {
    userId: number,
    fileId: string
  }): Promise<{ path: string, contentType: string }> {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient(params.userId);
      
      // Get file metadata first to check size and get name
      const metadata = await this.getOneDriveFileMetadata({
        userId: params.userId,
        fileId: params.fileId
      });
      
      // Check file size
      const maxSizeBytes = 10 * 1024 * 1024; // 10 MB limit
      const fileSize = metadata.size;
      
      if (fileSize > maxSizeBytes) {
        throw new Error(`File too large to download (${fileSize} bytes). Maximum size is ${maxSizeBytes} bytes.`);
      }
      
      // Set up temp directory
      const tempDir = path.join(os.tmpdir(), 'cpi-hub-onedrive');
      await mkdir(tempDir, { recursive: true });
      
      // Create filename with sanitized name
      const filename = metadata.name.replace(/[^a-z0-9.-]/gi, '_');
      const filePath = path.join(tempDir, `${params.fileId}_${filename}`);
      
      // Get file content as arraybuffer
      const response = await client.api(`/me/drive/items/${params.fileId}/content`)
        .responseType('arraybuffer')
        .get();
      
      metrics.increment('external_api_calls_total', { service: 'microsoft_graph', endpoint: 'onedrive.content' });
      
      // Save file to temp location
      await writeFile(filePath, Buffer.from(response));
      
      return {
        path: filePath,
        contentType: metadata.file?.mimeType || 'application/octet-stream'
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'microsoft_graph' });
      logger.error('Failed to download OneDrive file', { 
        error, 
        userId: params.userId,
        fileId: params.fileId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'microsoft_graph' });
    }
  }

  /**
   * Get emails from Outlook
   */
  async getOutlookMessages(params: { 
    userId: number, 
    folderId?: string,
    filter?: string,
    pageSize?: number,
    orderBy?: string
  }): Promise<{ messages: any[], nextLink?: string }> {
    const startTime = Date.now();
    const pageSize = params.pageSize || 50;
    
    try {
      const client = await this.getClient(params.userId);
      
      // Determine base path based on folder ID
      let apiPath = '/me/messages';
      if (params.folderId) {
        apiPath = `/me/mailFolders/${params.folderId}/messages`;
      }
      
      // Build request with query parameters
      let request = client.api(apiPath)
        .top(pageSize)
        .select('id,subject,bodyPreview,receivedDateTime,from,toRecipients,ccRecipients,importance,hasAttachments');
      
      // Add optional parameters
      if (params.filter) {
        request = request.filter(params.filter);
      }
      
      if (params.orderBy) {
        request = request.orderby(params.orderBy);
      }
      
      const response = await request.get();
      
      metrics.increment('external_api_calls_total', { service: 'microsoft_graph', endpoint: 'outlook.messages' });
      
      return {
        messages: response.value || [],
        nextLink: response['@odata.nextLink']
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'microsoft_graph' });
      logger.error('Failed to get Outlook messages', { error, userId: params.userId });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'microsoft_graph' });
    }
  }

  /**
   * Get email details from Outlook
   */
  async getOutlookMessage(params: {
    userId: number,
    messageId: string,
    includeBody?: boolean
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient(params.userId);
      
      let request = client.api(`/me/messages/${params.messageId}`);
      
      if (params.includeBody) {
        request = request.expand('body');
      }
      
      const response = await request.get();
      
      metrics.increment('external_api_calls_total', { service: 'microsoft_graph', endpoint: 'outlook.message' });
      
      return response;
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'microsoft_graph' });
      logger.error('Failed to get Outlook message details', { 
        error, 
        userId: params.userId,
        messageId: params.messageId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'microsoft_graph' });
    }
  }

  /**
   * Process fetched files from OneDrive
   */
  async processOneDriveFiles(params: {
    userId: number,
    files: any[],
    jobId?: string,
    downloadContent?: boolean
  }): Promise<InsertFetchedData[]> {
    const { userId, files, jobId, downloadContent = false } = params;
    
    try {
      if (!files.length) {
        return [];
      }
      
      const dataItems: InsertFetchedData[] = [];
      
      for (const file of files) {
        // Skip folders
        if (file.folder) {
          continue;
        }
        
        const createdAt = new Date(file.createdDateTime);
        const modifiedAt = new Date(file.lastModifiedDateTime);
        
        // Process file info
        let content = '';
        
        // Handle downloading content for text-based files if requested
        if (downloadContent && file.file && file.file.mimeType && (
          file.file.mimeType.includes('text/') || 
          file.file.mimeType.includes('application/json') || 
          file.file.mimeType.includes('application/xml')
        )) {
          try {
            const { path: filePath } = await this.downloadOneDriveFile({
              userId,
              fileId: file.id
            });
            
            // Read file content
            content = fs.readFileSync(filePath, 'utf8');
            
            // Clean up temp file
            fs.unlinkSync(filePath);
          } catch (error) {
            logger.warn('Could not download OneDrive file content', { 
              fileId: file.id, 
              name: file.name,
              error: error.message
            });
          }
        }
        
        const metadata = {
          fileId: file.id,
          driveId: file.parentReference?.driveId,
          mimeType: file.file?.mimeType,
          size: file.size,
          webUrl: file.webUrl,
          parentFolder: file.parentReference?.path,
          shared: !!file.shared,
          fileType: file.file?.mimeType
        };
        
        dataItems.push({
          userId,
          jobId: jobId || null,
          dataId: `onedrive_${file.id}`,
          connectorType: 'microsoft_graph',
          dataType: 'onedrive_file',
          title: file.name,
          content,
          metadata,
          sourceUrl: file.webUrl,
          sourceId: file.id,
          fetchedAt: modifiedAt
        });
      }
      
      return dataItems;
    } catch (error) {
      logger.error('Error processing OneDrive files', { error, userId });
      throw error;
    }
  }

  /**
   * Process fetched emails from Outlook
   */
  async processOutlookMessages(params: {
    userId: number,
    messages: any[],
    jobId?: string,
    includeBody?: boolean
  }): Promise<InsertFetchedData[]> {
    const { userId, messages, jobId, includeBody = true } = params;
    
    try {
      if (!messages.length) {
        return [];
      }
      
      const dataItems: InsertFetchedData[] = [];
      
      for (const message of messages) {
        let fullMessage = message;
        
        // If full body is needed, fetch the complete message
        if (includeBody) {
          try {
            fullMessage = await this.getOutlookMessage({
              userId,
              messageId: message.id,
              includeBody: true
            });
          } catch (error) {
            logger.warn('Could not get full Outlook message', { 
              messageId: message.id, 
              error: error.message
            });
            // Continue with the partial message
          }
        }
        
        const receivedDate = new Date(message.receivedDateTime);
        
        // Extract body content
        let bodyContent = message.bodyPreview || '';
        if (fullMessage.body && fullMessage.body.content) {
          bodyContent = fullMessage.body.content;
          
          // If content is HTML, try to extract plain text
          if (fullMessage.body.contentType === 'html') {
            // Simple HTML to text conversion
            bodyContent = bodyContent
              .replace(/<[^>]*>/g, ' ')  // Replace HTML tags with space
              .replace(/\s+/g, ' ')      // Normalize whitespace
              .trim();
          }
        }
        
        // Extract recipients
        const toRecipients = message.toRecipients?.map((recipient: any) => 
          recipient.emailAddress?.address || '') || [];
        
        const ccRecipients = message.ccRecipients?.map((recipient: any) => 
          recipient.emailAddress?.address || '') || [];
        
        const metadata = {
          messageId: message.id,
          conversationId: message.conversationId,
          internetMessageId: message.internetMessageId,
          importance: message.importance,
          hasAttachments: message.hasAttachments,
          from: message.from?.emailAddress?.address,
          fromName: message.from?.emailAddress?.name,
          toRecipients,
          ccRecipients,
          categories: message.categories || []
        };
        
        dataItems.push({
          userId,
          jobId: jobId || null,
          dataId: `outlook_${message.id}`,
          connectorType: 'microsoft_graph',
          dataType: 'outlook_email',
          title: message.subject || '(no subject)',
          content: bodyContent,
          metadata,
          sourceUrl: `https://outlook.office.com/mail/deeplink/readmessage?id=${message.id}`,
          sourceId: message.id,
          fetchedAt: receivedDate
        });
      }
      
      return dataItems;
    } catch (error) {
      logger.error('Error processing Outlook messages', { error, userId });
      throw error;
    }
  }

  /**
   * Fetch OneDrive files and store them
   */
  async fetchAndStoreOneDriveFiles(params: {
    userId: number,
    folderId?: string,
    filter?: string,
    pageSize?: number,
    jobId?: string,
    downloadContent?: boolean
  }): Promise<{ count: number, files: any[] }> {
    try {
      // Get files
      const { files } = await this.getOneDriveFiles({
        userId: params.userId,
        folderId: params.folderId,
        filter: params.filter,
        pageSize: params.pageSize
      });
      
      // Process files
      const dataItems = await this.processOneDriveFiles({
        userId: params.userId,
        files,
        jobId: params.jobId,
        downloadContent: params.downloadContent
      });
      
      // Store in database
      if (dataItems.length > 0) {
        await connectorService.storeFetchedData(dataItems);
      }
      
      return {
        count: dataItems.length,
        files
      };
    } catch (error) {
      logger.error('Error fetching and storing OneDrive files', { 
        error, 
        userId: params.userId,
        folderId: params.folderId
      });
      throw error;
    }
  }

  /**
   * Fetch Outlook emails and store them
   */
  async fetchAndStoreOutlookMessages(params: {
    userId: number,
    folderId?: string,
    filter?: string,
    pageSize?: number,
    jobId?: string,
    includeBody?: boolean
  }): Promise<{ count: number, messages: any[] }> {
    try {
      // Get messages
      const { messages } = await this.getOutlookMessages({
        userId: params.userId,
        folderId: params.folderId,
        filter: params.filter,
        pageSize: params.pageSize
      });
      
      // Process messages
      const dataItems = await this.processOutlookMessages({
        userId: params.userId,
        messages,
        jobId: params.jobId,
        includeBody: params.includeBody
      });
      
      // Store in database
      if (dataItems.length > 0) {
        await connectorService.storeFetchedData(dataItems);
      }
      
      return {
        count: dataItems.length,
        messages
      };
    } catch (error) {
      logger.error('Error fetching and storing Outlook messages', { 
        error, 
        userId: params.userId,
        folderId: params.folderId
      });
      throw error;
    }
  }

  /**
   * Execute a job to fetch Microsoft Graph data
   */
  async executeJob(job: any): Promise<{ success: boolean, count: number, error?: string }> {
    try {
      const { parameters, userId } = job;
      
      // Determine the type of data to fetch
      const dataType = parameters.dataType || 'onedrive_files';
      
      let result;
      
      switch (dataType) {
        case 'onedrive_files':
          result = await this.fetchAndStoreOneDriveFiles({
            userId,
            folderId: parameters.folderId,
            filter: parameters.filter,
            pageSize: parameters.pageSize || 100,
            jobId: job.jobId,
            downloadContent: parameters.downloadContent || false
          });
          break;
          
        case 'outlook_messages':
          result = await this.fetchAndStoreOutlookMessages({
            userId,
            folderId: parameters.folderId,
            filter: parameters.filter,
            pageSize: parameters.pageSize || 50,
            jobId: job.jobId,
            includeBody: parameters.includeBody !== false
          });
          break;
          
        default:
          throw new Error(`Unsupported data type: ${dataType}`);
      }
      
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      logger.error('Microsoft Graph job execution failed', { error, jobId: job.jobId });
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }
  }
}