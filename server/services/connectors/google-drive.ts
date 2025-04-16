/**
 * Google Drive Connector Service
 * 
 * This service handles the connection to Google Drive API and provides methods
 * for fetching and processing data from Google Drive.
 */

import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../observability';
import { connectorService } from './index';
import { InsertFetchedData } from '@shared/schema';
import { metrics } from '../observability';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as stream from 'stream';
import * as os from 'os';

// Helper for file streaming
const pipeline = util.promisify(stream.pipeline);
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const unlink = util.promisify(fs.unlink);
const mkdir = util.promisify(fs.mkdir);

export class GoogleDriveConnector {
  /**
   * Initialize Google Drive client with token
   */
  private async getClient(userId: number): Promise<{
    drive: drive_v3.Drive;
    client: OAuth2Client;
  }> {
    const token = await connectorService.getApiToken(userId, 'google_drive');
    
    if (!token || !token.accessToken) {
      throw new Error('No valid Google Drive token found for this user');
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
    
    // Create Drive client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    return { drive, client: oauth2Client };
  }

  /**
   * Test the connection to Google Drive
   */
  async testConnection(params: { userId: number }): Promise<{ success: boolean, userInfo?: any }> {
    const startTime = Date.now();
    
    try {
      const { drive } = await this.getClient(params.userId);
      
      // Get about info to validate connection
      const about = await drive.about.get({
        fields: 'user,storageQuota'
      });
      
      metrics.increment('external_api_calls_total', { service: 'google_drive', endpoint: 'about.get' });
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'google_drive', 
        endpoint: 'about.get' 
      });
      
      return {
        success: true,
        userInfo: about.data.user,
        storageQuota: about.data.storageQuota
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'google_drive' });
      logger.error('Google Drive connection test failed', { error, userId: params.userId });
      
      return {
        success: false,
        error: error.message || 'Failed to connect to Google Drive'
      };
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'google_drive' });
    }
  }

  /**
   * Get files list from Google Drive
   */
  async getFiles(params: { 
    userId: number, 
    folderId?: string,
    pageSize?: number,
    pageToken?: string,
    query?: string,
    fields?: string,
    orderBy?: string
  }): Promise<{ files: any[], nextPageToken?: string }> {
    const startTime = Date.now();
    const pageSize = params.pageSize || 100;
    const fields = params.fields || 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents),nextPageToken';
    
    try {
      const { drive } = await this.getClient(params.userId);
      
      // Build query
      let query = params.query || '';
      
      if (params.folderId) {
        if (query) query += ' and ';
        query += `'${params.folderId}' in parents`;
      }
      
      if (!query) query = 'trashed = false';
      else query += ' and trashed = false';
      
      // List files
      const response = await drive.files.list({
        q: query,
        pageSize,
        pageToken: params.pageToken,
        fields,
        orderBy: params.orderBy || 'modifiedTime desc'
      });
      
      metrics.increment('external_api_calls_total', { service: 'google_drive', endpoint: 'files.list' });
      
      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'google_drive' });
      logger.error('Failed to get Google Drive files', { error, userId: params.userId });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'google_drive' });
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(params: {
    userId: number,
    fileId: string,
    fields?: string
  }): Promise<any> {
    const startTime = Date.now();
    const fields = params.fields || 'id,name,mimeType,size,createdTime,modifiedTime,webViewLink,parents,description,fullFileExtension,md5Checksum,owners,sharingUser,shared,capabilities';
    
    try {
      const { drive } = await this.getClient(params.userId);
      
      const response = await drive.files.get({
        fileId: params.fileId,
        fields
      });
      
      metrics.increment('external_api_calls_total', { service: 'google_drive', endpoint: 'files.get' });
      
      return response.data;
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'google_drive' });
      logger.error('Failed to get Google Drive file metadata', { 
        error, 
        userId: params.userId,
        fileId: params.fileId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'google_drive' });
    }
  }

  /**
   * Download file content
   */
  async downloadFile(params: {
    userId: number,
    fileId: string,
    mimeType?: string
  }): Promise<{ path: string, contentType: string }> {
    const startTime = Date.now();
    
    try {
      const { drive } = await this.getClient(params.userId);
      
      // Get file metadata first to check size
      const metadata = await this.getFileMetadata({
        userId: params.userId,
        fileId: params.fileId,
        fields: 'id,name,mimeType,size'
      });
      
      // Check file size
      const maxSizeBytes = 10 * 1024 * 1024; // 10 MB limit
      const fileSize = parseInt(metadata.size);
      
      if (fileSize > maxSizeBytes) {
        throw new Error(`File too large to download (${fileSize} bytes). Maximum size is ${maxSizeBytes} bytes.`);
      }
      
      // Set up temp directory
      const tempDir = path.join(os.tmpdir(), 'cpi-hub-gdrive');
      await mkdir(tempDir, { recursive: true });
      
      // Create filename with sanitized name
      const filename = metadata.name.replace(/[^a-z0-9.-]/gi, '_');
      const filePath = path.join(tempDir, `${params.fileId}_${filename}`);
      
      // Get file content
      const response = await drive.files.get({
        fileId: params.fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });
      
      metrics.increment('external_api_calls_total', { service: 'google_drive', endpoint: 'files.get.media' });
      
      // Save file to temp location
      const dest = fs.createWriteStream(filePath);
      await pipeline(response.data, dest);
      
      return {
        path: filePath,
        contentType: metadata.mimeType
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'google_drive' });
      logger.error('Failed to download Google Drive file', { 
        error, 
        userId: params.userId,
        fileId: params.fileId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'google_drive' });
    }
  }

  /**
   * Process fetched files from Google Drive
   */
  async processFiles(params: {
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
        const createdAt = new Date(file.createdTime);
        const modifiedAt = new Date(file.modifiedTime);
        
        // Process file info
        let content = '';
        
        // Handle downloading content for text-based files if requested
        if (downloadContent && file.mimeType && (
          file.mimeType.includes('text/') || 
          file.mimeType.includes('application/json') || 
          file.mimeType.includes('application/xml')
        )) {
          try {
            const { path: filePath } = await this.downloadFile({
              userId,
              fileId: file.id
            });
            
            // Read file content
            content = await readFile(filePath, 'utf8');
            
            // Clean up temp file
            await unlink(filePath);
          } catch (error) {
            logger.warn('Could not download file content', { 
              fileId: file.id, 
              name: file.name,
              error: error.message
            });
          }
        }
        
        const metadata = {
          fileId: file.id,
          driveId: file.driveId || null,
          mimeType: file.mimeType,
          size: file.size,
          fileExtension: file.fullFileExtension || null,
          webViewLink: file.webViewLink,
          parents: file.parents || [],
          shared: file.shared || false,
          owners: file.owners || []
        };
        
        dataItems.push({
          userId,
          jobId: jobId || null,
          dataId: `gdrive_file_${file.id}`,
          connectorType: 'google_drive',
          dataType: 'google_drive_file',
          title: file.name,
          content,
          metadata,
          sourceUrl: file.webViewLink,
          sourceId: file.id,
          fetchedAt: modifiedAt
        });
      }
      
      return dataItems;
    } catch (error) {
      logger.error('Error processing Google Drive files', { error, userId });
      throw error;
    }
  }

  /**
   * Fetch files and store them
   */
  async fetchAndStoreFiles(params: {
    userId: number,
    folderId?: string,
    query?: string,
    pageSize?: number,
    jobId?: string,
    downloadContent?: boolean
  }): Promise<{ count: number, files: any[] }> {
    try {
      // Get files
      const { files } = await this.getFiles({
        userId: params.userId,
        folderId: params.folderId,
        query: params.query,
        pageSize: params.pageSize
      });
      
      // Process files
      const dataItems = await this.processFiles({
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
      logger.error('Error fetching and storing Google Drive files', { 
        error, 
        userId: params.userId,
        folderId: params.folderId
      });
      throw error;
    }
  }

  /**
   * Execute a job to fetch Google Drive files
   */
  async executeJob(job: any): Promise<{ success: boolean, count: number, error?: string }> {
    try {
      const { parameters, userId } = job;
      
      const result = await this.fetchAndStoreFiles({
        userId,
        folderId: parameters.folderId,
        query: parameters.query,
        pageSize: parameters.pageSize || 100,
        jobId: job.jobId,
        downloadContent: parameters.downloadContent || false
      });
      
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      logger.error('Google Drive job execution failed', { error, jobId: job.jobId });
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }
  }
}