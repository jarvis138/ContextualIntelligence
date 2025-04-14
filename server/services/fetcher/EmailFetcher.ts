/**
 * Email Fetcher
 * 
 * This class fetches emails from Gmail or Outlook,
 * handling pagination, incremental updates, and error handling.
 */

import { FetcherBase, FetchConfig, FetchResult, FetchStatus, ChangeRecord } from './FetcherBase';
import { getOAuthAccessToken } from '../oauth';
import { db } from '../../db';
import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';

// Email provider types
export enum EmailProvider {
  GMAIL = 'gmail',
  OUTLOOK = 'outlook'
}

// Email fetch configuration
interface EmailFetchConfig extends FetchConfig {
  provider: EmailProvider;
  folderName?: string;      // Folder/label to fetch from (e.g., 'INBOX')
  query?: string;           // Search query (e.g., 'is:unread')
  maxEmailsPerFetch?: number; // Maximum number of emails to fetch at once
  includeAttachments?: boolean; // Whether to include attachment metadata
  includeBody?: boolean;    // Whether to include email body content
  historyId?: string;       // Gmail history ID for incremental updates
  deltaLink?: string;       // Outlook delta link for incremental updates
}

// Email representation (unified across providers)
interface Email {
  id: string;
  provider: EmailProvider;
  providerId: string;  // Original ID from the provider
  threadId?: string;
  subject: string;
  from: { name?: string; email: string }[];
  to: { name?: string; email: string }[];
  cc?: { name?: string; email: string }[];
  bcc?: { name?: string; email: string }[];
  date: Date;
  receivedDate: Date;
  snippet?: string;
  body?: string;
  bodyType?: 'text' | 'html';
  isRead: boolean;
  isStarred?: boolean;
  isImportant?: boolean;
  labels?: string[];
  folder?: string;
  attachments?: {
    id: string;
    name: string;
    contentType: string;
    size: number;
  }[];
  [key: string]: any;
}

/**
 * Fetcher for Gmail or Outlook emails
 */
export class EmailFetcher extends FetcherBase {
  private config: EmailFetchConfig;
  
  constructor(config: EmailFetchConfig) {
    super(config);
    this.config = config;
  }
  
  /**
   * Fetch emails from the configured provider
   */
  protected async fetch(signal: AbortSignal): Promise<FetchResult> {
    try {
      // Determine the provider type
      switch (this.config.provider) {
        case EmailProvider.GMAIL:
          return this.fetchGmail(signal);
        case EmailProvider.OUTLOOK:
          return this.fetchOutlook(signal);
        default:
          return {
            status: FetchStatus.FAILED,
            errorMessage: `Unsupported email provider: ${this.config.provider}`
          };
      }
    } catch (error) {
      console.error(`Error in ${this.config.provider} fetcher:`, error);
      
      // Check for rate limiting errors
      if (error.status === 429 || (error.message && error.message.includes('rate limit'))) {
        // Parse retry-after header if available
        const retryAfter = error.headers?.['retry-after'] 
          ? parseInt(error.headers['retry-after']) * 1000 
          : 60000; // Default to 1 minute
        
        return {
          status: FetchStatus.RATE_LIMITED,
          errorMessage: `Rate limited by ${this.config.provider} API`,
          retryAfter
        };
      }
      
      // Check for authorization errors
      if (error.status === 401 || error.status === 403) {
        return {
          status: FetchStatus.FAILED,
          errorMessage: `Authorization error accessing ${this.config.provider}`,
          error
        };
      }
      
      // Generic error
      return {
        status: FetchStatus.FAILED,
        errorMessage: error.message || `Unknown error fetching from ${this.config.provider}`,
        error
      };
    }
  }
  
  /**
   * Fetch emails from Gmail
   */
  private async fetchGmail(signal: AbortSignal): Promise<FetchResult> {
    // Get the OAuth token for Google
    const accessToken = await getOAuthAccessToken(this.config.userId, 'google');
    
    if (!accessToken) {
      return {
        status: FetchStatus.FAILED,
        errorMessage: 'No valid access token available for Gmail'
      };
    }
    
    // Check if we can use incremental updates
    if (this.config.historyId) {
      return this.fetchGmailHistory(accessToken, signal);
    } else {
      return this.fetchGmailMessages(accessToken, signal);
    }
  }
  
  /**
   * Fetch full list of Gmail messages
   */
  private async fetchGmailMessages(accessToken: string, signal: AbortSignal): Promise<FetchResult> {
    const emails: Email[] = [];
    let nextPageToken: string | undefined;
    let fetchCount = 0;
    const maxFetchCount = 5; // Safety limit for pagination
    let historyId: string | undefined;
    
    try {
      // First, get message IDs
      const messageIds: string[] = [];
      
      do {
        // Construct query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('maxResults', String(this.config.maxEmailsPerFetch || 100));
        
        if (nextPageToken) {
          queryParams.append('pageToken', nextPageToken);
        }
        
        // Add the search query if specified
        if (this.config.query) {
          queryParams.append('q', this.config.query);
        }
        
        // Add the label/folder if specified
        if (this.config.folderName) {
          queryParams.append('labelIds', this.config.folderName);
        }
        
        // Fetch the list of message IDs
        const listResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?${queryParams.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            signal
          }
        );
        
        if (!listResponse.ok) {
          throw {
            status: listResponse.status,
            message: `Gmail API error: ${listResponse.statusText}`,
            headers: Object.fromEntries(listResponse.headers.entries())
          };
        }
        
        const listData = await listResponse.json();
        nextPageToken = listData.nextPageToken;
        
        // Store history ID for future incremental updates
        if (listData.historyId && !historyId) {
          historyId = listData.historyId;
        }
        
        // Add message IDs to our collection
        if (listData.messages && Array.isArray(listData.messages)) {
          messageIds.push(...listData.messages.map(m => m.id));
        }
        
        fetchCount++;
      } while (nextPageToken && fetchCount < maxFetchCount && !signal.aborted);
      
      // Now fetch the full content of each message
      for (const messageId of messageIds) {
        if (signal.aborted) break;
        
        // Construct field parameters
        const format = this.config.includeBody ? 'full' : 'metadata';
        const queryParams = new URLSearchParams();
        queryParams.append('format', format);
        
        // Fields to fetch
        const metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date', 'Received'];
        queryParams.append('metadataHeaders', metadataHeaders.join(','));
        
        // Fetch the message
        const messageResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${queryParams.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            signal
          }
        );
        
        if (!messageResponse.ok) {
          console.error(`Error fetching Gmail message ${messageId}: ${messageResponse.statusText}`);
          continue; // Skip this message and continue with others
        }
        
        const messageData = await messageResponse.json();
        
        // Convert Gmail message to our unified email format
        const email = this.convertGmailMessageToEmail(messageData);
        emails.push(email);
        
        // Update historyId from message if available
        if (messageData.historyId && !historyId) {
          historyId = messageData.historyId;
        }
        
        // Rate limiting: add small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Store the history ID for future incremental updates
      if (historyId) {
        this.config.historyId = historyId;
      }
      
      // Calculate hash for data consistency
      const hash = this.calculateHash(emails);
      
      return {
        status: FetchStatus.COMPLETED,
        items: emails,
        count: emails.length,
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
   * Fetch Gmail history (incremental updates)
   */
  private async fetchGmailHistory(accessToken: string, signal: AbortSignal): Promise<FetchResult> {
    if (!this.config.historyId) {
      throw new Error('History ID is required for incremental Gmail updates');
    }
    
    const changes: ChangeRecord[] = [];
    let nextPageToken: string | undefined;
    let newHistoryId: string | undefined;
    let fetchCount = 0;
    const maxFetchCount = 5; // Safety limit for pagination
    
    try {
      do {
        // Construct query parameters
        const queryParams = new URLSearchParams();
        queryParams.append('startHistoryId', this.config.historyId);
        queryParams.append('maxResults', '100');
        
        if (nextPageToken) {
          queryParams.append('pageToken', nextPageToken);
        }
        
        // Specify history types to include
        const historyTypes = ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'];
        queryParams.append('historyTypes', historyTypes.join(','));
        
        // Fetch the history
        const historyResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/history?${queryParams.toString()}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            },
            signal
          }
        );
        
        if (!historyResponse.ok) {
          // If history ID is invalid, return to full fetch
          if (historyResponse.status === 404 || historyResponse.status === 400) {
            this.config.historyId = undefined;
            return {
              status: FetchStatus.FAILED,
              errorMessage: 'Invalid history ID, will perform full fetch next time'
            };
          }
          
          throw {
            status: historyResponse.status,
            message: `Gmail API error: ${historyResponse.statusText}`,
            headers: Object.fromEntries(historyResponse.headers.entries())
          };
        }
        
        const historyData = await historyResponse.json();
        nextPageToken = historyData.nextPageToken;
        newHistoryId = historyData.historyId;
        
        // Process history entries
        if (historyData.history && Array.isArray(historyData.history)) {
          for (const historyEntry of historyData.history) {
            // Handle message additions
            if (historyEntry.messagesAdded) {
              for (const messageAdded of historyEntry.messagesAdded) {
                // Skip drafts and other non-inbox messages
                if (!messageAdded.message.labelIds.includes('INBOX')) {
                  continue;
                }
                
                // Fetch the full message and create a change record
                try {
                  const messageData = await this.fetchGmailMessageById(
                    accessToken, 
                    messageAdded.message.id,
                    signal
                  );
                  
                  const email = this.convertGmailMessageToEmail(messageData);
                  
                  const changeRecord: ChangeRecord = {
                    entityId: messageAdded.message.id,
                    entityType: 'email',
                    operation: 'create',
                    timestamp: new Date(),
                    data: email,
                    currentHash: this.calculateHash(email)
                  };
                  
                  changes.push(changeRecord);
                  this.trackChange(changeRecord);
                } catch (error) {
                  console.error(`Error fetching added message ${messageAdded.message.id}:`, error);
                }
              }
            }
            
            // Handle message deletions
            if (historyEntry.messagesDeleted) {
              for (const messageDeleted of historyEntry.messagesDeleted) {
                const changeRecord: ChangeRecord = {
                  entityId: messageDeleted.message.id,
                  entityType: 'email',
                  operation: 'delete',
                  timestamp: new Date()
                };
                
                changes.push(changeRecord);
                this.trackChange(changeRecord);
              }
            }
            
            // Handle label changes (updates)
            if (historyEntry.labelsAdded || historyEntry.labelsRemoved) {
              // Combine messages from both label operations
              const messageIds = new Set<string>();
              
              if (historyEntry.labelsAdded) {
                for (const labelAdded of historyEntry.labelsAdded) {
                  messageIds.add(labelAdded.message.id);
                }
              }
              
              if (historyEntry.labelsRemoved) {
                for (const labelRemoved of historyEntry.labelsRemoved) {
                  messageIds.add(labelRemoved.message.id);
                }
              }
              
              // Fetch and update each affected message
              for (const messageId of messageIds) {
                try {
                  const messageData = await this.fetchGmailMessageById(
                    accessToken, 
                    messageId,
                    signal
                  );
                  
                  const email = this.convertGmailMessageToEmail(messageData);
                  
                  const changeRecord: ChangeRecord = {
                    entityId: messageId,
                    entityType: 'email',
                    operation: 'update',
                    timestamp: new Date(),
                    data: email,
                    currentHash: this.calculateHash(email)
                  };
                  
                  changes.push(changeRecord);
                  this.trackChange(changeRecord);
                } catch (error) {
                  console.error(`Error fetching updated message ${messageId}:`, error);
                }
              }
            }
          }
        }
        
        fetchCount++;
      } while (nextPageToken && fetchCount < maxFetchCount && !signal.aborted);
      
      // Update history ID for next time
      if (newHistoryId) {
        this.config.historyId = newHistoryId;
      }
      
      return {
        status: FetchStatus.COMPLETED,
        items: changes,
        count: changes.length,
        hasMore: !!nextPageToken
      };
    } catch (error) {
      // Re-throw to be handled by parent
      throw error;
    }
  }
  
  /**
   * Fetch a specific Gmail message by ID
   */
  private async fetchGmailMessageById(
    accessToken: string, 
    messageId: string,
    signal: AbortSignal
  ): Promise<any> {
    // Construct field parameters
    const format = this.config.includeBody ? 'full' : 'metadata';
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    // Fields to fetch
    const metadataHeaders = ['From', 'To', 'Cc', 'Bcc', 'Subject', 'Date', 'Received'];
    queryParams.append('metadataHeaders', metadataHeaders.join(','));
    
    // Fetch the message
    const messageResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?${queryParams.toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        },
        signal
      }
    );
    
    if (!messageResponse.ok) {
      throw {
        status: messageResponse.status,
        message: `Gmail API error: ${messageResponse.statusText}`,
        headers: Object.fromEntries(messageResponse.headers.entries())
      };
    }
    
    return await messageResponse.json();
  }
  
  /**
   * Convert Gmail message format to our unified email format
   */
  private convertGmailMessageToEmail(messageData: any): Email {
    // Extract headers into a map for easier access
    const headers: { [key: string]: string } = {};
    if (messageData.payload && messageData.payload.headers) {
      for (const header of messageData.payload.headers) {
        headers[header.name.toLowerCase()] = header.value;
      }
    }
    
    // Parse email addresses
    const parseEmailAddresses = (addressStr: string): { name?: string; email: string }[] => {
      if (!addressStr) return [];
      
      // This is a simplified parser - a real implementation would be more robust
      return addressStr.split(',').map(address => {
        address = address.trim();
        const match = address.match(/<(.+)>$/);
        if (match) {
          return {
            name: address.substring(0, address.indexOf('<')).trim(),
            email: match[1]
          };
        }
        return { email: address };
      });
    };
    
    // Extract body content if requested
    let body = '';
    let bodyType: 'text' | 'html' = 'text';
    
    if (this.config.includeBody && messageData.payload) {
      const extractBody = (part: any): string | null => {
        // If this part has a body
        if (part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
        
        // If this part has child parts, recursively check them
        if (part.parts && Array.isArray(part.parts)) {
          for (const childPart of part.parts) {
            const childBody = extractBody(childPart);
            if (childBody) {
              return childBody;
            }
          }
        }
        
        return null;
      };
      
      // Try to get HTML content first, then fallback to plain text
      const htmlPart = messageData.payload.parts?.find(
        (p: any) => p.mimeType === 'text/html'
      );
      
      const textPart = messageData.payload.parts?.find(
        (p: any) => p.mimeType === 'text/plain'
      );
      
      if (htmlPart) {
        body = extractBody(htmlPart) || '';
        bodyType = 'html';
      } else if (textPart) {
        body = extractBody(textPart) || '';
        bodyType = 'text';
      } else {
        // Try to extract from the payload directly
        body = extractBody(messageData.payload) || '';
      }
    }
    
    // Extract attachment metadata if requested
    const attachments = this.config.includeAttachments 
      ? this.extractGmailAttachments(messageData)
      : [];
    
    // Create the unified email object
    const email: Email = {
      id: `gmail-${messageData.id}`,
      provider: EmailProvider.GMAIL,
      providerId: messageData.id,
      threadId: messageData.threadId,
      subject: headers.subject || '(No Subject)',
      from: parseEmailAddresses(headers.from || ''),
      to: parseEmailAddresses(headers.to || ''),
      cc: headers.cc ? parseEmailAddresses(headers.cc) : [],
      bcc: headers.bcc ? parseEmailAddresses(headers.bcc) : [],
      date: new Date(headers.date || messageData.internalDate),
      receivedDate: new Date(Number(messageData.internalDate)),
      snippet: messageData.snippet || '',
      isRead: !messageData.labelIds?.includes('UNREAD'),
      isStarred: messageData.labelIds?.includes('STARRED') || false,
      isImportant: messageData.labelIds?.includes('IMPORTANT') || false,
      labels: messageData.labelIds || [],
      folder: this.getFolderFromLabels(messageData.labelIds || [])
    };
    
    // Only include body and attachments if requested
    if (this.config.includeBody) {
      email.body = body;
      email.bodyType = bodyType;
    }
    
    if (this.config.includeAttachments && attachments.length > 0) {
      email.attachments = attachments;
    }
    
    return email;
  }
  
  /**
   * Extract attachment metadata from Gmail message
   */
  private extractGmailAttachments(messageData: any): any[] {
    const attachments: any[] = [];
    
    const processMessageParts = (part: any) => {
      // Check if this part is an attachment
      if (
        part.filename && 
        part.filename.trim() !== '' && 
        part.body && 
        (part.body.attachmentId || part.body.size > 0)
      ) {
        attachments.push({
          id: part.body.attachmentId,
          name: part.filename,
          contentType: part.mimeType || 'application/octet-stream',
          size: parseInt(part.body.size) || 0
        });
      }
      
      // Recursively process child parts
      if (part.parts && Array.isArray(part.parts)) {
        for (const childPart of part.parts) {
          processMessageParts(childPart);
        }
      }
    };
    
    // Start with the top-level payload
    if (messageData.payload) {
      processMessageParts(messageData.payload);
    }
    
    return attachments;
  }
  
  /**
   * Get folder name from Gmail labels
   */
  private getFolderFromLabels(labels: string[]): string {
    // Priority order for common Gmail system labels
    const systemLabelMapping: { [key: string]: string } = {
      'INBOX': 'Inbox',
      'SENT': 'Sent',
      'DRAFT': 'Drafts',
      'TRASH': 'Trash',
      'SPAM': 'Spam',
      'STARRED': 'Starred',
      'IMPORTANT': 'Important'
    };
    
    // Check system labels first
    for (const labelId of Object.keys(systemLabelMapping)) {
      if (labels.includes(labelId)) {
        return systemLabelMapping[labelId];
      }
    }
    
    // If no system label found, return the first user label or 'Other'
    const userLabels = labels.filter(l => !l.startsWith('CATEGORY_') && !Object.keys(systemLabelMapping).includes(l));
    return userLabels.length > 0 ? userLabels[0] : 'Other';
  }
  
  /**
   * Fetch emails from Outlook
   */
  private async fetchOutlook(signal: AbortSignal): Promise<FetchResult> {
    // Get the OAuth token for Microsoft
    const accessToken = await getOAuthAccessToken(this.config.userId, 'microsoft');
    
    if (!accessToken) {
      return {
        status: FetchStatus.FAILED,
        errorMessage: 'No valid access token available for Outlook'
      };
    }
    
    // Check if we can use delta queries for incremental updates
    if (this.config.deltaLink) {
      return this.fetchOutlookDelta(accessToken, signal);
    } else {
      return this.fetchOutlookMessages(accessToken, signal);
    }
  }
  
  /**
   * Fetch messages from Outlook
   */
  private async fetchOutlookMessages(accessToken: string, signal: AbortSignal): Promise<FetchResult> {
    const emails: Email[] = [];
    let nextLink: string | undefined;
    let deltaLink: string | undefined;
    let fetchCount = 0;
    const maxFetchCount = 5; // Safety limit for pagination
    
    try {
      // Construct the base URL for the Microsoft Graph API
      let apiUrl = 'https://graph.microsoft.com/v1.0/me/messages';
      
      // Add filter for folder if specified
      if (this.config.folderName) {
        apiUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/${this.config.folderName}/messages`;
      }
      
      // Add query parameters
      const queryParams = new URLSearchParams();
      
      // Select fields to include
      const selectFields = [
        'id', 'subject', 'from', 'toRecipients', 'ccRecipients', 'bccRecipients',
        'receivedDateTime', 'sentDateTime', 'importance', 'bodyPreview', 'isRead',
        'hasAttachments', 'internetMessageId', 'parentFolderId'
      ];
      
      // Add body content if requested
      if (this.config.includeBody) {
        selectFields.push('body');
      }
      
      queryParams.append('$select', selectFields.join(','));
      
      // Set result limit
      queryParams.append('$top', String(this.config.maxEmailsPerFetch || 50));
      
      // Order by received date, newest first
      queryParams.append('$orderby', 'receivedDateTime DESC');
      
      // Add search query if specified
      if (this.config.query) {
        queryParams.append('$filter', this.config.query);
      }
      
      // Append query params to URL
      apiUrl += `?${queryParams.toString()}`;
      
      // Add preference for getting delta link if we want incremental updates
      const headers: HeadersInit = {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Prefer': 'odata.track-changes' // Request a delta link
      };
      
      do {
        // Use nextLink if available, otherwise use the base URL
        const requestUrl = nextLink || apiUrl;
        
        // Make the API request
        const response = await fetch(requestUrl, {
          headers,
          signal
        });
        
        if (!response.ok) {
          throw {
            status: response.status,
            message: `Outlook API error: ${response.statusText}`,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
        
        const data = await response.json();
        
        // Process messages
        if (data.value && Array.isArray(data.value)) {
          for (const message of data.value) {
            const email = this.convertOutlookMessageToEmail(message);
            emails.push(email);
          }
        }
        
        // Get next page link
        nextLink = data['@odata.nextLink'];
        
        // Get delta link for future incremental updates
        if (data['@odata.deltaLink'] && !deltaLink) {
          deltaLink = data['@odata.deltaLink'];
        }
        
        fetchCount++;
      } while (nextLink && fetchCount < maxFetchCount && !signal.aborted);
      
      // Store delta link for future incremental updates
      if (deltaLink) {
        this.config.deltaLink = deltaLink;
      }
      
      // Calculate hash for data consistency
      const hash = this.calculateHash(emails);
      
      return {
        status: FetchStatus.COMPLETED,
        items: emails,
        count: emails.length,
        hasMore: !!nextLink,
        nextCursor: nextLink,
        hash
      };
    } catch (error) {
      // Re-throw to be handled by parent
      throw error;
    }
  }
  
  /**
   * Fetch delta changes from Outlook
   */
  private async fetchOutlookDelta(accessToken: string, signal: AbortSignal): Promise<FetchResult> {
    if (!this.config.deltaLink) {
      throw new Error('Delta link is required for incremental Outlook updates');
    }
    
    const changes: ChangeRecord[] = [];
    let nextLink: string | undefined;
    let newDeltaLink: string | undefined;
    let fetchCount = 0;
    const maxFetchCount = 5; // Safety limit for pagination
    
    try {
      // Use the stored delta link
      let requestUrl = this.config.deltaLink;
      
      do {
        // Make the API request
        const response = await fetch(requestUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/json'
          },
          signal
        });
        
        if (!response.ok) {
          // If delta link is invalid, return to full fetch
          if (response.status === 404 || response.status === 410) {
            this.config.deltaLink = undefined;
            return {
              status: FetchStatus.FAILED,
              errorMessage: 'Invalid delta link, will perform full fetch next time'
            };
          }
          
          throw {
            status: response.status,
            message: `Outlook API error: ${response.statusText}`,
            headers: Object.fromEntries(response.headers.entries())
          };
        }
        
        const data = await response.json();
        
        // Process changes
        if (data.value && Array.isArray(data.value)) {
          for (const message of data.value) {
            // Determine the operation (create, update, delete)
            const operation = message['@removed'] 
              ? 'delete' 
              : (message.receivedDateTime > new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() 
                ? 'create' 
                : 'update');
            
            if (operation === 'delete') {
              // For deleted messages, we only have the ID
              const changeRecord: ChangeRecord = {
                entityId: message.id,
                entityType: 'email',
                operation,
                timestamp: new Date()
              };
              changes.push(changeRecord);
              this.trackChange(changeRecord);
            } else {
              // For created or updated messages, convert to our format
              const email = this.convertOutlookMessageToEmail(message);
              const changeRecord: ChangeRecord = {
                entityId: message.id,
                entityType: 'email',
                operation,
                timestamp: new Date(message.lastModifiedDateTime || message.receivedDateTime),
                data: email,
                currentHash: this.calculateHash(email)
              };
              changes.push(changeRecord);
              this.trackChange(changeRecord);
            }
          }
        }
        
        // Get next page link
        nextLink = data['@odata.nextLink'];
        
        // Get new delta link
        if (data['@odata.deltaLink']) {
          newDeltaLink = data['@odata.deltaLink'];
        }
        
        // Use nextLink for the next iteration
        requestUrl = nextLink as string;
        
        fetchCount++;
      } while (nextLink && fetchCount < maxFetchCount && !signal.aborted);
      
      // Update delta link for next time
      if (newDeltaLink) {
        this.config.deltaLink = newDeltaLink;
      }
      
      return {
        status: FetchStatus.COMPLETED,
        items: changes,
        count: changes.length,
        hasMore: !!nextLink
      };
    } catch (error) {
      // Re-throw to be handled by parent
      throw error;
    }
  }
  
  /**
   * Convert Outlook message to our unified email format
   */
  private convertOutlookMessageToEmail(message: any): Email {
    // Create the unified email object
    const email: Email = {
      id: `outlook-${message.id}`,
      provider: EmailProvider.OUTLOOK,
      providerId: message.id,
      subject: message.subject || '(No Subject)',
      from: message.from?.emailAddress 
        ? [{ name: message.from.emailAddress.name, email: message.from.emailAddress.address }] 
        : [],
      to: (message.toRecipients || []).map((r: any) => ({
        name: r.emailAddress.name,
        email: r.emailAddress.address
      })),
      cc: (message.ccRecipients || []).map((r: any) => ({
        name: r.emailAddress.name,
        email: r.emailAddress.address
      })),
      bcc: (message.bccRecipients || []).map((r: any) => ({
        name: r.emailAddress.name,
        email: r.emailAddress.address
      })),
      date: new Date(message.sentDateTime),
      receivedDate: new Date(message.receivedDateTime),
      snippet: message.bodyPreview || '',
      isRead: message.isRead,
      isImportant: message.importance === 'high',
      folder: message.parentFolderId
    };
    
    // Include body content if requested
    if (this.config.includeBody && message.body) {
      email.body = message.body.content;
      email.bodyType = message.body.contentType.toLowerCase() === 'html' ? 'html' : 'text';
    }
    
    // Include attachment metadata if requested and available
    if (this.config.includeAttachments && message.hasAttachments) {
      // Note: We'd need to make another API call to get attachment details,
      // but we'll just indicate their presence for now
      email.attachments = [{ 
        id: 'attachment-info-not-fetched',
        name: 'Attachment info not fetched',
        contentType: 'unknown',
        size: 0
      }];
    }
    
    return email;
  }
  
  /**
   * Process changes from incremental fetching
   */
  protected async processChanges(changes: ChangeRecord[]): Promise<void> {
    // Log the changes
    console.log(`Processing ${changes.length} changes from ${this.config.provider}`);
    
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
      description: `Processed ${this.config.provider} changes`,
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
    // For now, we'll just preserve the history ID or delta link
    switch (this.config.provider) {
      case EmailProvider.GMAIL:
        this.config = {
          ...this.config,
          extraData: {
            historyId: this.config.historyId
          }
        };
        break;
      case EmailProvider.OUTLOOK:
        this.config = {
          ...this.config,
          extraData: {
            deltaLink: this.config.deltaLink
          }
        };
        break;
    }
    
    console.log(`Saved ${this.config.provider} fetcher config for ${this.config.id}`);
  }
}