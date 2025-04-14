/**
 * Google Drive Fetcher
 * 
 * This class fetches files and folders from Google Drive,
 * handling pagination, incremental updates, and error handling.
 */

import { FetcherBase, FetchConfig, FetchResult, FetchStatus, ChangeRecord } from './FetcherBase';
import { getOAuthAccessToken } from '../oauth';
import { db } from '../../db';
import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';

interface GoogleDriveConfig extends FetchConfig {
  folderId?: string;      // Root folder ID to fetch from (optional)
  includeTrash?: boolean; // Whether to include trashed files
  includeShared?: boolean; // Whether to include shared files
  fields?: string[];      // Fields to fetch for each file
  maxFilesPerFetch?: number; // Maximum number of files to fetch per request
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
  shared?: boolean;
  trashed?: boolean;
  owners?: Array<{ displayName: string, emailAddress: string }>;
  lastModifyingUser?: { displayName: string, emailAddress: string };
  [key: string]: any;
}

interface DriveChangeResponse {
  kind: string;
  newStartPageToken?: string;
  nextPageToken?: string;
  changes: Array<{
    kind: string;
    type: string;
    time: string;
    removed: boolean;
    fileId: string;
    file?: DriveFile;
  }>;
}

/**
 * Fetcher for Google Drive files and folders
 */
export class GoogleDriveFetcher extends FetcherBase {
  private config: GoogleDriveConfig;
  private changePageToken?: string;
  
  constructor(config: GoogleDriveConfig) {
    super(config);
    this.config = config;
  }
  
  /**
   * Fetch files and changes from Google Drive
   */
  protected async fetch(signal: AbortSignal): Promise<FetchResult> {
    try {
      // Get the OAuth token
      const accessToken = await getOAuthAccessToken(this.config.userId, 'google');
      
      if (!accessToken) {
        return {
          status: FetchStatus.FAILED,
          errorMessage: 'No valid access token available for Google Drive'
        };
      }
      
      // If we have a change token, fetch changes incrementally
      if (this.changePageToken) {
        return this.fetchChanges(accessToken, signal);
      } else {
        // Otherwise, do a full fetch and then get a change token for future updates
        const result = await this.fetchFiles(accessToken, signal);
        
        if (result.status === FetchStatus.COMPLETED) {
          await this.initializeChangeTracking(accessToken, signal);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Error in Google Drive fetcher:', error);
      
      // Check for rate limiting errors
      if (error.status === 429 || (error.message && error.message.includes('rate limit'))) {
        // Parse retry-after header if available
        const retryAfter = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) * 1000 
          : 60000; // Default to 1 minute
        
        return {
          status: FetchStatus.RATE_LIMITED,
          errorMessage: 'Rate limited by Google Drive API',
          retryAfter
        };
      }
      
      // Check for authorization errors
      if (error.status === 401 || error.status === 403) {
        return {
          status: FetchStatus.FAILED,
          errorMessage: 'Authorization error accessing Google Drive',
          error
        };
      }
      
      // Generic error
      return {
        status: FetchStatus.FAILED,
        errorMessage: error.message || 'Unknown error fetching from Google Drive',
        error
      };
    }
  }
  
  /**
   * Fetch files from Google Drive
   */
  private async fetchFiles(accessToken: string, signal: AbortSignal): Promise<FetchResult> {
    const files: DriveFile[] = [];
    let nextPageToken: string | undefined;
    let fetchCount = 0;
    const maxFetchCount = 10; // Safety limit for pagination
    
    try {
      do {
        // Construct the query parameters
        const queryParams = new URLSearchParams();
        
        // Base fields to always fetch
        const baseFields = 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents, shared, trashed, owners, lastModifyingUser)';
        
        queryParams.append('fields', baseFields);
        queryParams.append('pageSize', String(this.config.maxFilesPerFetch || 100));
        
        if (nextPageToken) {
          queryParams.append('pageToken', nextPageToken);
        }
        
        // Construct query string
        let q = '';
        
        // Filter by folder if specified
        if (this.config.folderId) {
          q += `'${this.config.folderId}' in parents`;
        }
        
        // Include/exclude trashed files
        if (!this.config.includeTrash) {
          q += q ? ' and ' : '';
          q += 'trashed = false';
        }
        
        // Include/exclude shared files
        if (!this.config.includeShared) {
          q += q ? ' and ' : '';
          q += 'sharedWithMe = false';
        }
        
        if (q) {
          queryParams.append('q', q);
        }
        
        // Make the API request
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            signal
          }
        );
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: `Google Drive API error: ${response.statusText}`,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
        
        const data = await response.json();
        nextPageToken = data.nextPageToken;
        
        // Add files to our collection
        if (data.files && Array.isArray(data.files)) {
          files.push(...data.files);
        }
        
        fetchCount++;
      } while (nextPageToken && fetchCount < maxFetchCount && !signal.aborted);
      
      // Calculate hash for data consistency
      const hash = this.calculateHash(files);
      
      return {
        status: FetchStatus.COMPLETED,
        items: files,
        count: files.length,
        hasMore: !!nextPageToken,
        nextCursor: nextPageToken,
        hash
      };
    } catch (error) {
      // Re-throw to be handled by parent
      throw error;
    }
  }
  
  /**
   * Initialize change tracking by getting a start page token
   */
  private async initializeChangeTracking(accessToken: string, signal: AbortSignal): Promise<void> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/changes/startPageToken',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          signal
        }
      );
      
      if (!response.ok) {
        throw {
          status: response.status,
          message: `Google Drive API error: ${response.statusText}`,
          headers: Object.fromEntries(response.headers.entries())
        };
      }
      
      const data = await response.json();
      this.changePageToken = data.startPageToken;
      
      // Store this token for future use
      // In a real implementation, this would be saved to the database
      console.log(`Initialized change tracking with start token: ${this.changePageToken}`);
    } catch (error) {
      console.error('Error initializing change tracking:', error);
      // We'll try again on the next fetch
    }
  }
  
  /**
   * Fetch changes since the last sync
   */
  private async fetchChanges(accessToken: string, signal: AbortSignal): Promise<FetchResult> {
    if (!this.changePageToken) {
      throw new Error('Change tracking not initialized');
    }
    
    const changes: ChangeRecord[] = [];
    let nextPageToken: string | undefined = this.changePageToken;
    let newStartPageToken: string | undefined;
    let fetchCount = 0;
    const maxFetchCount = 10; // Safety limit for pagination
    
    try {
      do {
        // Construct the query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('pageToken', nextPageToken);
        queryParams.append('pageSize', String(this.config.maxFilesPerFetch || 100));
        
        // Include removed files and detailed file info
        queryParams.append('includeRemoved', 'true');
        queryParams.append('includeItemsFromAllDrives', 'true');
        queryParams.append('supportsAllDrives', 'true');
        
        // Base fields to always fetch
        const fields = 'nextPageToken, newStartPageToken, changes(fileId, time, removed, file)';
        queryParams.append('fields', fields);
        
        // Make the API request
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/changes?${queryParams.toString()}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            signal
          }
        );
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: `Google Drive API error: ${response.statusText}`,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
        
        const data: DriveChangeResponse = await response.json();
        nextPageToken = data.nextPageToken;
        newStartPageToken = data.newStartPageToken;
        
        // Process the changes
        if (data.changes && Array.isArray(data.changes)) {
          for (const change of data.changes) {
            // Create a change record
            const changeRecord: ChangeRecord = {
              entityId: change.fileId,
              entityType: 'drive_file',
              operation: change.removed ? 'delete' : (change.file ? 'update' : 'create'),
              timestamp: new Date(change.time),
              data: change.file
            };
            
            // Add hash for data consistency if file data is present
            if (change.file) {
              changeRecord.currentHash = this.calculateHash(change.file);
            }
            
            // Add to our changes collection
            changes.push(changeRecord);
            
            // Also add to the base class changes array for processing
            this.trackChange(changeRecord);
          }
        }
        
        fetchCount++;
      } while (nextPageToken && fetchCount < maxFetchCount && !signal.aborted);
      
      // Update our change token for the next fetch
      if (newStartPageToken) {
        this.changePageToken = newStartPageToken;
      }
      
      return {
        status: FetchStatus.COMPLETED,
        items: changes,
        count: changes.length,
        hasMore: false
      };
    } catch (error) {
      // Handle token expiration or invalidation
      if (error.status === 400 && error.message.includes('invalid')) {
        // Our change token is invalid, need to re-initialize
        this.changePageToken = undefined;
        return {
          status: FetchStatus.FAILED,
          errorMessage: 'Change token expired, will re-initialize on next fetch'
        };
      }
      
      // Re-throw to be handled by parent
      throw error;
    }
  }
  
  /**
   * Process changes from incremental fetching
   */
  protected async processChanges(changes: ChangeRecord[]): Promise<void> {
    // Log the changes
    console.log(`Processing ${changes.length} changes from Google Drive`);
    
    // In a real implementation, this would update the database
    // and trigger any necessary actions or notifications
    
    // Track update counts
    let createdCount = 0;
    let updatedCount = 0;
    let deletedCount = 0;
    
    for (const change of changes) {
      switch (change.operation) {
        case 'create':
          createdCount++;
          break;
        case 'update':
          updatedCount++;
          break;
        case 'delete':
          deletedCount++;
          break;
      }
    }
    
    // Log change statistics
    logAuditEvent({
      userId: this.config.userId,
      eventType: AuditEventType.ACCOUNT_UPDATED,
      description: `Processed Google Drive changes`,
      metadata: {
        integrationId: this.config.integrationId,
        fetcherId: this.config.id,
        created: createdCount,
        updated: updatedCount,
        deleted: deletedCount,
        total: changes.length
      }
    });
  }
  
  /**
   * Save the current configuration to the database
   */
  protected async saveConfig(): Promise<void> {
    // In a real implementation, this would save to the database
    // For now, we'll just add the change token to the config
    this.config = {
      ...this.config,
      extraData: {
        changePageToken: this.changePageToken
      }
    };
    
    console.log(`Saved Google Drive fetcher config for ${this.config.id}`);
  }
}