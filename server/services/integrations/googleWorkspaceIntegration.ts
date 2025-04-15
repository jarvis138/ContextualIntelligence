/**
 * Google Workspace Integration Service
 * 
 * Provides integration with Google Workspace APIs (Drive, Calendar, Gmail)
 * for retrieving files, events, emails, and other data from Google services.
 */

import axios from 'axios';
import { google } from 'googleapis';
import { storage } from '../../storage';
import { User, Integration, InsertActivity } from '@shared/schema';
import { pipeline, createStage } from '../../utils/pipeline';
import { DocumentProcessingService } from '../documentProcessingService.fixed';

/**
 * Google service types
 */
export type GoogleService = 'drive' | 'calendar' | 'gmail';

/**
 * Google file structure
 */
export interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  description?: string;
  webViewLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  createdTime?: Date;
  modifiedTime?: Date;
  size?: number;
  fileExtension?: string;
  fullText?: string;
  parents?: string[];
  owners?: {
    id: string;
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  }[];
  lastModifyingUser?: {
    id: string;
    displayName: string;
    emailAddress: string;
    photoLink?: string;
  };
  shared: boolean;
  starred: boolean;
  trashed: boolean;
  contentHints?: {
    indexableText?: string;
    thumbnail?: {
      image?: string;
      mimeType?: string;
    };
  };
}

/**
 * Google event structure
 */
export interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start?: {
    dateTime?: Date;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: Date;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  created?: Date;
  updated?: Date;
  organizer?: {
    id?: string;
    email: string;
    displayName?: string;
    self?: boolean;
  };
  creator?: {
    id?: string;
    email: string;
    displayName?: string;
    self?: boolean;
  };
  attendees?: {
    id?: string;
    email: string;
    displayName?: string;
    responseStatus?: string;
    optional?: boolean;
  }[];
  recurringEventId?: string;
  originalStartTime?: {
    dateTime?: Date;
    date?: string;
    timeZone?: string;
  };
  status?: string;
  iCalUID?: string;
  colorId?: string;
}

/**
 * Google email structure
 */
export interface GoogleEmail {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  historyId?: string;
  internalDate?: Date;
  sizeEstimate?: number;
  subject?: string;
  from?: {
    name?: string;
    email: string;
  };
  to?: {
    name?: string;
    email: string;
  }[];
  cc?: {
    name?: string;
    email: string;
  }[];
  bcc?: {
    name?: string;
    email: string;
  }[];
  bodyText?: string;
  bodyHtml?: string;
  attachments?: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    data?: Buffer;
  }[];
}

/**
 * Google extraction options
 */
export interface GoogleExtractionOptions {
  services: GoogleService[];
  startDate?: Date;
  endDate?: Date;
  query?: string;
  includeTrash?: boolean;
  includeSharedWithMe?: boolean;
  includeAttachments?: boolean;
  maxResults?: number;
  linkToProjects?: number[];
}

/**
 * Google Workspace Integration Service
 */
export class GoogleWorkspaceIntegrationService {
  private oauthClients: Map<number, any> = new Map();
  private documentService: DocumentProcessingService;
  
  constructor(documentService: DocumentProcessingService) {
    this.documentService = documentService;
  }
  
  /**
   * Initialize Google OAuth client for a user
   */
  async initializeClient(userId: number): Promise<any> {
    try {
      // Check if client already exists
      if (this.oauthClients.has(userId)) {
        return this.oauthClients.get(userId);
      }
      
      // Get Google integration for user
      const integration = await this.getUserIntegration(userId);
      if (!integration) {
        return null;
      }
      
      // Create OAuth client
      const config = integration.config || {};
      const refreshToken = config.refreshToken as string;
      const clientId = config.clientId as string;
      const clientSecret = config.clientSecret as string;
      
      if (!refreshToken || !clientId || !clientSecret) {
        throw new Error('Missing Google OAuth configuration');
      }
      
      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        // Redirect URI is not needed for refresh token usage
        'https://developers.google.com/oauthplayground'
      );
      
      // Set credentials
      oauth2Client.setCredentials({
        refresh_token: refreshToken
      });
      
      // Store client
      this.oauthClients.set(userId, oauth2Client);
      
      return oauth2Client;
    } catch (error) {
      console.error(`Error initializing Google OAuth client for user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Get Google integration for a user
   */
  async getUserIntegration(userId: number): Promise<Integration | undefined> {
    const integrations = await storage.getIntegrations(userId);
    return integrations.find(integration => 
      integration.type === 'google' || integration.type === 'gsuite'
    );
  }
  
  /**
   * List files from Google Drive
   */
  async listFiles(
    auth: any,
    options: {
      query?: string;
      pageSize?: number;
      fields?: string;
      orderBy?: string;
      pageToken?: string;
    } = {}
  ): Promise<{
    files: GoogleFile[];
    nextPageToken?: string;
  }> {
    try {
      const drive = google.drive({ version: 'v3', auth });
      
      const defaultFields = 'id, name, mimeType, description, webViewLink, iconLink, ' +
        'thumbnailLink, createdTime, modifiedTime, size, fileExtension, parents, ' +
        'owners, lastModifyingUser, shared, starred, trashed, contentHints';
      
      const response = await drive.files.list({
        q: options.query,
        pageSize: options.pageSize || 100,
        fields: `nextPageToken, files(${options.fields || defaultFields})`,
        orderBy: options.orderBy || 'modifiedTime desc',
        pageToken: options.pageToken
      });
      
      return {
        files: (response.data.files || []).map(this.mapFile),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Error listing Google Drive files:', error);
      throw error;
    }
  }
  
  /**
   * Get file content from Google Drive
   */
  async getFileContent(
    auth: any,
    fileId: string,
    mimeType?: string
  ): Promise<{
    content: Buffer;
    mimeType: string;
  }> {
    try {
      const drive = google.drive({ version: 'v3', auth });
      
      // Get file metadata
      const fileResponse = await drive.files.get({
        fileId,
        fields: 'mimeType,name,size'
      });
      
      const fileMimeType = fileResponse.data.mimeType;
      const fileName = fileResponse.data.name;
      
      // Check exportable formats for Google Docs, Sheets, etc.
      const googleWorkspaceMimeTypes = {
        'application/vnd.google-apps.document': 'application/pdf',
        'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.google-apps.presentation': 'application/pdf',
        'application/vnd.google-apps.drawing': 'application/pdf'
      };
      
      let content;
      let contentMimeType;
      
      // Handle Google Workspace files differently
      if (fileMimeType.startsWith('application/vnd.google-apps')) {
        // Use export for Google Workspace files
        const exportMimeType = mimeType || googleWorkspaceMimeTypes[fileMimeType] || 'application/pdf';
        
        const exportResponse = await drive.files.export({
          fileId,
          mimeType: exportMimeType
        }, {
          responseType: 'arraybuffer'
        });
        
        content = Buffer.from(exportResponse.data);
        contentMimeType = exportResponse.headers['content-type'] || exportMimeType;
      } else {
        // Use get with alt=media for regular files
        const contentResponse = await drive.files.get({
          fileId,
          alt: 'media'
        }, {
          responseType: 'arraybuffer'
        });
        
        content = Buffer.from(contentResponse.data);
        contentMimeType = contentResponse.headers['content-type'] || fileMimeType;
      }
      
      return {
        content,
        mimeType: contentMimeType
      };
    } catch (error) {
      console.error(`Error getting Google Drive file content for ${fileId}:`, error);
      throw error;
    }
  }
  
  /**
   * Extract file with content for document processing
   */
  async extractFileWithContent(
    auth: any,
    fileId: string
  ): Promise<{
    file: GoogleFile;
    content: Buffer;
    mimeType: string;
  }> {
    try {
      // Get file metadata
      const drive = google.drive({ version: 'v3', auth });
      const fileResponse = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, description, webViewLink, iconLink, ' +
                'thumbnailLink, createdTime, modifiedTime, size, fileExtension, parents, ' +
                'owners, lastModifyingUser, shared, starred, trashed, contentHints'
      });
      
      const file = this.mapFile(fileResponse.data);
      
      // Get file content
      const { content, mimeType } = await this.getFileContent(auth, fileId);
      
      return {
        file,
        content,
        mimeType
      };
    } catch (error) {
      console.error(`Error extracting Google Drive file with content for ${fileId}:`, error);
      throw error;
    }
  }
  
  /**
   * List events from Google Calendar
   */
  async listEvents(
    auth: any,
    options: {
      calendarId?: string;
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
      orderBy?: string;
      pageToken?: string;
      query?: string;
    } = {}
  ): Promise<{
    events: GoogleEvent[];
    nextPageToken?: string;
  }> {
    try {
      const calendar = google.calendar({ version: 'v3', auth });
      
      const response = await calendar.events.list({
        calendarId: options.calendarId || 'primary',
        timeMin: options.timeMin ? options.timeMin.toISOString() : undefined,
        timeMax: options.timeMax ? options.timeMax.toISOString() : undefined,
        maxResults: options.maxResults || 250,
        singleEvents: true,
        orderBy: options.orderBy || 'startTime',
        pageToken: options.pageToken,
        q: options.query
      });
      
      return {
        events: (response.data.items || []).map(this.mapEvent),
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Error listing Google Calendar events:', error);
      throw error;
    }
  }
  
  /**
   * List messages from Gmail
   */
  async listEmails(
    auth: any,
    options: {
      query?: string;
      maxResults?: number;
      pageToken?: string;
      labelIds?: string[];
    } = {}
  ): Promise<{
    emails: GoogleEmail[];
    nextPageToken?: string;
  }> {
    try {
      const gmail = google.gmail({ version: 'v1', auth });
      
      // List messages
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults: options.maxResults || 100,
        pageToken: options.pageToken,
        q: options.query,
        labelIds: options.labelIds
      });
      
      if (!response.data.messages || response.data.messages.length === 0) {
        return {
          emails: [],
          nextPageToken: response.data.nextPageToken
        };
      }
      
      // Get full message details for each message ID
      const messagePromises = response.data.messages.map(async (message) => {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full'
          });
          
          return messageResponse.data;
        } catch (error) {
          console.error(`Error fetching Gmail message ${message.id}:`, error);
          return null;
        }
      });
      
      const messageResponses = (await Promise.all(messagePromises)).filter(Boolean);
      
      // Process messages
      const emails = messageResponses.map(this.mapEmail);
      
      // Get attachment content if requested
      if (options.includeAttachments) {
        for (const email of emails) {
          if (email.attachments && email.attachments.length > 0) {
            for (const attachment of email.attachments) {
              try {
                const attachmentResponse = await gmail.users.messages.attachments.get({
                  userId: 'me',
                  messageId: email.id,
                  id: attachment.id
                });
                
                // Decode base64 data
                if (attachmentResponse.data.data) {
                  attachment.data = Buffer.from(
                    attachmentResponse.data.data.replace(/-/g, '+').replace(/_/g, '/'),
                    'base64'
                  );
                }
              } catch (error) {
                console.error(`Error fetching Gmail attachment ${attachment.id}:`, error);
              }
            }
          }
        }
      }
      
      return {
        emails,
        nextPageToken: response.data.nextPageToken
      };
    } catch (error) {
      console.error('Error listing Gmail messages:', error);
      throw error;
    }
  }
  
  /**
   * Extract Google Workspace data
   */
  async extractGoogleWorkspaceData(
    userId: number,
    options: GoogleExtractionOptions
  ): Promise<{
    files: GoogleFile[];
    events: GoogleEvent[];
    emails: GoogleEmail[];
    stats: {
      totalFiles: number;
      totalEvents: number;
      totalEmails: number;
      processedFiles: number;
    };
  }> {
    const auth = await this.initializeClient(userId);
    if (!auth) {
      throw new Error('Google OAuth client not initialized');
    }
    
    // Initialize results
    const result = {
      files: [] as GoogleFile[],
      events: [] as GoogleEvent[],
      emails: [] as GoogleEmail[],
      stats: {
        totalFiles: 0,
        totalEvents: 0,
        totalEmails: 0,
        processedFiles: 0
      }
    };
    
    // Process each requested service
    for (const service of options.services) {
      switch (service) {
        case 'drive':
          await this.extractDriveFiles(auth, options, result);
          break;
        case 'calendar':
          await this.extractCalendarEvents(auth, options, result);
          break;
        case 'gmail':
          await this.extractGmailEmails(auth, options, result);
          break;
      }
    }
    
    // Create activities for projects if requested
    if (options.linkToProjects && options.linkToProjects.length > 0) {
      await this.createActivitiesForProjects(
        userId,
        result,
        options.linkToProjects
      );
    }
    
    return result;
  }
  
  /**
   * Extract files from Google Drive
   */
  private async extractDriveFiles(
    auth: any,
    options: GoogleExtractionOptions,
    result: {
      files: GoogleFile[];
      stats: {
        totalFiles: number;
        processedFiles: number;
      };
    }
  ): Promise<void> {
    try {
      // Build query parts
      const queryParts = [];
      
      // Don't include trashed files unless explicitly requested
      if (!options.includeTrash) {
        queryParts.push('trashed = false');
      }
      
      // Add date filters
      if (options.startDate) {
        queryParts.push(`modifiedTime >= '${options.startDate.toISOString()}'`);
      }
      
      if (options.endDate) {
        queryParts.push(`modifiedTime <= '${options.endDate.toISOString()}'`);
      }
      
      // Handle "shared with me" option
      if (!options.includeSharedWithMe) {
        queryParts.push('\'me\' in owners');
      }
      
      // Add search terms
      if (options.query) {
        queryParts.push(`fullText contains '${options.query}'`);
      }
      
      // Form the complete query
      const query = queryParts.join(' and ');
      
      // Fetch files with pagination
      let nextPageToken: string | undefined;
      let filesProcessed = 0;
      const maxResults = options.maxResults || 500;
      
      do {
        const response = await this.listFiles(auth, {
          query,
          pageSize: 100,
          pageToken: nextPageToken
        });
        
        result.files.push(...response.files);
        filesProcessed += response.files.length;
        result.stats.totalFiles += response.files.length;
        
        nextPageToken = response.nextPageToken;
      } while (nextPageToken && filesProcessed < maxResults);
      
      // Optionally process file contents
      if (options.maxResults && options.maxResults < 10) { // Limit for performance
        for (const file of result.files.slice(0, options.maxResults)) {
          try {
            // Skip folders and very large files
            if (file.mimeType === 'application/vnd.google-apps.folder' || 
                (file.size && parseInt(file.size.toString()) > 5 * 1024 * 1024)) {
              continue;
            }
            
            // Extract file content
            const { content, mimeType } = await this.getFileContent(auth, file.id);
            
            // Process content for indexing
            if (content) {
              // Logic to process file contents would go here
              // For example, using the DocumentProcessingService
              result.stats.processedFiles++;
            }
          } catch (error) {
            console.error(`Error processing file ${file.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting Google Drive files:', error);
    }
  }
  
  /**
   * Extract events from Google Calendar
   */
  private async extractCalendarEvents(
    auth: any,
    options: GoogleExtractionOptions,
    result: {
      events: GoogleEvent[];
      stats: {
        totalEvents: number;
      };
    }
  ): Promise<void> {
    try {
      // Fetch events with pagination
      let nextPageToken: string | undefined;
      let eventsProcessed = 0;
      const maxResults = options.maxResults || 500;
      
      do {
        const response = await this.listEvents(auth, {
          timeMin: options.startDate,
          timeMax: options.endDate,
          maxResults: 100,
          pageToken: nextPageToken,
          query: options.query
        });
        
        result.events.push(...response.events);
        eventsProcessed += response.events.length;
        result.stats.totalEvents += response.events.length;
        
        nextPageToken = response.nextPageToken;
      } while (nextPageToken && eventsProcessed < maxResults);
    } catch (error) {
      console.error('Error extracting Google Calendar events:', error);
    }
  }
  
  /**
   * Extract emails from Gmail
   */
  private async extractGmailEmails(
    auth: any,
    options: GoogleExtractionOptions,
    result: {
      emails: GoogleEmail[];
      stats: {
        totalEmails: number;
      };
    }
  ): Promise<void> {
    try {
      // Build query parts
      const queryParts = [];
      
      // Add date filters
      if (options.startDate) {
        queryParts.push(`after:${Math.floor(options.startDate.getTime() / 1000)}`);
      }
      
      if (options.endDate) {
        queryParts.push(`before:${Math.floor(options.endDate.getTime() / 1000)}`);
      }
      
      // Add search terms
      if (options.query) {
        queryParts.push(options.query);
      }
      
      // Form the complete query
      const query = queryParts.join(' ');
      
      // Fetch emails with pagination
      let nextPageToken: string | undefined;
      let emailsProcessed = 0;
      const maxResults = options.maxResults || 500;
      
      do {
        const response = await this.listEmails(auth, {
          query,
          maxResults: 100,
          pageToken: nextPageToken,
          includeAttachments: options.includeAttachments
        });
        
        result.emails.push(...response.emails);
        emailsProcessed += response.emails.length;
        result.stats.totalEmails += response.emails.length;
        
        nextPageToken = response.nextPageToken;
      } while (nextPageToken && emailsProcessed < maxResults);
    } catch (error) {
      console.error('Error extracting Gmail emails:', error);
    }
  }
  
  /**
   * Create activities for projects based on Google Workspace data
   */
  private async createActivitiesForProjects(
    userId: number,
    data: {
      files: GoogleFile[];
      events: GoogleEvent[];
      emails: GoogleEmail[];
    },
    projectIds: number[]
  ): Promise<void> {
    try {
      // Get user
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }
      
      // Create activity for each project
      for (const projectId of projectIds) {
        // Check if project exists
        const project = await storage.getProject(projectId);
        if (!project) {
          console.warn(`Project ${projectId} not found, skipping activity creation`);
          continue;
        }
        
        // Build activity description
        const parts = [];
        
        if (data.files.length > 0) {
          parts.push(`${data.files.length} Google Drive files`);
        }
        
        if (data.events.length > 0) {
          parts.push(`${data.events.length} Google Calendar events`);
        }
        
        if (data.emails.length > 0) {
          parts.push(`${data.emails.length} Gmail messages`);
        }
        
        if (parts.length === 0) {
          continue; // Skip if no data
        }
        
        const description = `Imported ${parts.join(', ')}`;
        
        // Create activity
        const activity: InsertActivity = {
          type: 'google_import',
          userId: userId,
          projectId: projectId,
          description,
          entityType: 'google_workspace',
          entityId: null
        };
        
        await storage.createActivity(activity);
      }
    } catch (error) {
      console.error('Error creating activities for projects:', error);
    }
  }
  
  /**
   * Map Google Drive file response to standard format
   */
  private mapFile(file: any): GoogleFile {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      description: file.description,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      thumbnailLink: file.thumbnailLink,
      createdTime: file.createdTime ? new Date(file.createdTime) : undefined,
      modifiedTime: file.modifiedTime ? new Date(file.modifiedTime) : undefined,
      size: file.size,
      fileExtension: file.fileExtension,
      parents: file.parents,
      owners: file.owners ? file.owners.map((owner: any) => ({
        id: owner.permissionId,
        displayName: owner.displayName,
        emailAddress: owner.emailAddress,
        photoLink: owner.photoLink
      })) : undefined,
      lastModifyingUser: file.lastModifyingUser ? {
        id: file.lastModifyingUser.permissionId,
        displayName: file.lastModifyingUser.displayName,
        emailAddress: file.lastModifyingUser.emailAddress,
        photoLink: file.lastModifyingUser.photoLink
      } : undefined,
      shared: file.shared || false,
      starred: file.starred || false,
      trashed: file.trashed || false,
      contentHints: file.contentHints
    };
  }
  
  /**
   * Map Google Calendar event response to standard format
   */
  private mapEvent(event: any): GoogleEvent {
    return {
      id: event.id,
      summary: event.summary || '(No title)',
      description: event.description,
      location: event.location,
      start: event.start ? {
        dateTime: event.start.dateTime ? new Date(event.start.dateTime) : undefined,
        date: event.start.date,
        timeZone: event.start.timeZone
      } : undefined,
      end: event.end ? {
        dateTime: event.end.dateTime ? new Date(event.end.dateTime) : undefined,
        date: event.end.date,
        timeZone: event.end.timeZone
      } : undefined,
      htmlLink: event.htmlLink,
      created: event.created ? new Date(event.created) : undefined,
      updated: event.updated ? new Date(event.updated) : undefined,
      organizer: event.organizer ? {
        id: event.organizer.id,
        email: event.organizer.email,
        displayName: event.organizer.displayName,
        self: event.organizer.self
      } : undefined,
      creator: event.creator ? {
        id: event.creator.id,
        email: event.creator.email,
        displayName: event.creator.displayName,
        self: event.creator.self
      } : undefined,
      attendees: event.attendees ? event.attendees.map((attendee: any) => ({
        id: attendee.id,
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus,
        optional: attendee.optional
      })) : undefined,
      recurringEventId: event.recurringEventId,
      originalStartTime: event.originalStartTime ? {
        dateTime: event.originalStartTime.dateTime ? new Date(event.originalStartTime.dateTime) : undefined,
        date: event.originalStartTime.date,
        timeZone: event.originalStartTime.timeZone
      } : undefined,
      status: event.status,
      iCalUID: event.iCalUID,
      colorId: event.colorId
    };
  }
  
  /**
   * Map Gmail message response to standard format
   */
  private mapEmail(message: any): GoogleEmail {
    // Extract headers
    const headers = message.payload?.headers || [];
    const getHeader = (name: string) => {
      const header = headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : undefined;
    };
    
    // Extract body parts
    let bodyText = '';
    let bodyHtml = '';
    const attachments: any[] = [];
    
    const processParts = (parts: any[]) => {
      for (const part of parts) {
        const mimeType = part.mimeType;
        
        if (mimeType === 'text/plain' && part.body.data) {
          const decoded = Buffer.from(
            part.body.data.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
          ).toString('utf8');
          bodyText += decoded;
        } else if (mimeType === 'text/html' && part.body.data) {
          const decoded = Buffer.from(
            part.body.data.replace(/-/g, '+').replace(/_/g, '/'),
            'base64'
          ).toString('utf8');
          bodyHtml += decoded;
        } else if (part.filename && part.body.attachmentId) {
          attachments.push({
            id: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size || 0
          });
        }
        
        // Recurse into nested parts
        if (part.parts) {
          processParts(part.parts);
        }
      }
    };
    
    // Process body directly if no parts
    if (message.payload) {
      if (message.payload.body && message.payload.body.data) {
        const mimeType = message.payload.mimeType;
        const decoded = Buffer.from(
          message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'),
          'base64'
        ).toString('utf8');
        
        if (mimeType === 'text/plain') {
          bodyText = decoded;
        } else if (mimeType === 'text/html') {
          bodyHtml = decoded;
        }
      }
      
      // Process parts if any
      if (message.payload.parts) {
        processParts(message.payload.parts);
      }
    }
    
    // Parse addresses
    const parseAddresses = (addressHeader: string | undefined) => {
      if (!addressHeader) return [];
      
      try {
        return addressHeader.split(',').map(addr => {
          const match = addr.trim().match(/^(?:"?([^"]*)"?\s)?<?([^\s>]+@[^\s>]+)>?$/);
          if (match) {
            return {
              name: match[1],
              email: match[2]
            };
          }
          return { email: addr.trim() };
        });
      } catch (e) {
        return [{ email: addressHeader }];
      }
    };
    
    return {
      id: message.id,
      threadId: message.threadId,
      labelIds: message.labelIds,
      snippet: message.snippet,
      historyId: message.historyId,
      internalDate: message.internalDate ? new Date(parseInt(message.internalDate)) : undefined,
      sizeEstimate: message.sizeEstimate,
      subject: getHeader('subject'),
      from: parseAddresses(getHeader('from'))[0],
      to: parseAddresses(getHeader('to')),
      cc: parseAddresses(getHeader('cc')),
      bcc: parseAddresses(getHeader('bcc')),
      bodyText,
      bodyHtml,
      attachments: attachments.length > 0 ? attachments : undefined
    };
  }
  
  /**
   * Create a processing pipeline for Google Workspace data extraction
   */
  createExtractionPipeline(userId: number, options: GoogleExtractionOptions) {
    return pipeline(
      createStage('initialize', async () => {
        const auth = await this.initializeClient(userId);
        if (!auth) {
          throw new Error('Failed to initialize Google OAuth client');
        }
        return {
          auth,
          options,
          files: [],
          events: [],
          emails: [],
          stats: {
            totalFiles: 0,
            totalEvents: 0,
            totalEmails: 0,
            processedFiles: 0
          }
        };
      }),
      
      createStage('extract-data', async (context) => {
        const result = await this.extractGoogleWorkspaceData(userId, options);
        context.files = result.files;
        context.events = result.events;
        context.emails = result.emails;
        context.stats = result.stats;
        return context;
      })
    );
  }
}

// Create instance
import { documentProcessingService } from '../documentProcessingService.fixed';
export const googleWorkspaceIntegrationService = new GoogleWorkspaceIntegrationService(documentProcessingService);