/**
 * Google Drive Connector
 * 
 * Implements data fetching from Google Drive including files and metadata
 */

import { google, drive_v3 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { BaseConnector, ConnectorAuth, ConnectorOptions } from './baseConnector';

/**
 * File metadata interface for Google Drive files
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: { 
    displayName?: string; 
    emailAddress?: string;
  }[];
  webViewLink?: string;
  size?: string;
  description?: string;
  parents?: string[];
  md5Checksum?: string;
  sharedWithMe?: boolean;
  shared?: boolean;
  content?: string;
  [key: string]: any;
}

/**
 * Google Drive connector for fetching files and metadata
 */
export class GoogleDriveConnector extends BaseConnector {
  private client: OAuth2Client | null = null;
  private driveClient: drive_v3.Drive | null = null;
  
  constructor() {
    super('googleDrive');
  }
  
  /**
   * Initialize the Google Drive connector with OAuth credentials
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
      
      // Create Drive client
      this.driveClient = google.drive({
        version: 'v3',
        auth: this.client
      });
    } catch (error) {
      console.error('Error initializing Google Drive connector:', error);
      throw new Error('Failed to initialize Google Drive connector');
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
   * Test the connection to Google Drive
   */
  public async testConnection(): Promise<boolean> {
    if (!this.driveClient) {
      return false;
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.driveClient!.files.list({ pageSize: 1 })
      );
      return !!response && !!response.data;
    } catch (error) {
      console.error('Error testing Google Drive connection:', error);
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
      console.error('Error refreshing Google Drive authentication:', error);
      throw new Error('Failed to refresh Google Drive authentication');
    }
  }
  
  /**
   * List files in Google Drive
   */
  public async listFiles(options: ConnectorOptions = {}): Promise<DriveFile[]> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }
    
    const {
      pageSize = 100,
      pageToken,
      query = '',
      fields = 'id,name,mimeType,createdTime,modifiedTime,owners,webViewLink,size,description,parents,md5Checksum,sharedWithMe',
      orderBy = 'modifiedTime desc'
    } = options;
    
    try {
      // Execute API request with rate limiting
      const response = await this.executeRequest(
        async () => await this.driveClient!.files.list({
          pageSize,
          pageToken,
          q: query,
          fields: `nextPageToken, files(${fields})`,
          orderBy
        })
      );
      
      return (response.data.files || []) as DriveFile[];
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      throw new Error('Failed to list Google Drive files');
    }
  }
  
  /**
   * Get file metadata
   */
  public async getFile(fileId: string, options: ConnectorOptions = {}): Promise<DriveFile> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }
    
    const { fields = 'id,name,mimeType,createdTime,modifiedTime,owners,webViewLink,size,description,parents,md5Checksum,sharedWithMe' } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.driveClient!.files.get({
          fileId,
          fields
        })
      );
      
      return response.data as DriveFile;
    } catch (error) {
      console.error(`Error getting Google Drive file ${fileId}:`, error);
      throw new Error(`Failed to get Google Drive file ${fileId}`);
    }
  }
  
  /**
   * Download file content
   */
  public async downloadFile(fileId: string, options: ConnectorOptions = {}): Promise<{ content: any; mimeType: string }> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.driveClient!.files.get({
          fileId,
          alt: 'media'
        }, {
          responseType: 'arraybuffer'
        })
      );
      
      // Get file metadata to include mime type
      const metadata = await this.getFile(fileId);
      
      return {
        content: response.data,
        mimeType: metadata.mimeType
      };
    } catch (error) {
      console.error(`Error downloading Google Drive file ${fileId}:`, error);
      throw new Error(`Failed to download Google Drive file ${fileId}`);
    }
  }
  
  /**
   * Search for files in Google Drive
   */
  public async searchFiles(query: string, options: ConnectorOptions = {}): Promise<DriveFile[]> {
    return this.listFiles({
      ...options,
      query
    });
  }
  
  /**
   * Get all files shared with me
   */
  public async getSharedWithMe(options: ConnectorOptions = {}): Promise<DriveFile[]> {
    return this.listFiles({
      ...options,
      query: 'sharedWithMe=true'
    });
  }
  
  /**
   * Get file revisions
   */
  public async getFileRevisions(fileId: string, options: ConnectorOptions = {}): Promise<any[]> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }
    
    const { fields = 'id,modifiedTime,keepForever,originalFilename,published,size' } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.driveClient!.revisions.list({
          fileId,
          fields: `revisions(${fields})`
        })
      );
      
      return response.data.revisions || [];
    } catch (error) {
      console.error(`Error getting revisions for Google Drive file ${fileId}:`, error);
      throw new Error(`Failed to get revisions for Google Drive file ${fileId}`);
    }
  }
  
  /**
   * Get file comments
   */
  public async getFileComments(fileId: string, options: ConnectorOptions = {}): Promise<any[]> {
    if (!this.driveClient) {
      throw new Error('Google Drive client not initialized');
    }
    
    const { fields = 'id,content,createdTime,modifiedTime,author,resolved' } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.driveClient!.comments.list({
          fileId,
          fields: `comments(${fields})`
        })
      );
      
      return response.data.comments || [];
    } catch (error) {
      console.error(`Error getting comments for Google Drive file ${fileId}:`, error);
      throw new Error(`Failed to get comments for Google Drive file ${fileId}`);
    }
  }
}