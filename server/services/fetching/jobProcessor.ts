/**
 * Job Processor
 * 
 * Processes data fetching jobs for different data sources
 */

import { FetchingJob } from './fetchingJob';
import { ConnectorFactory, ConnectorType } from '../connectors/connectorFactory';
import { DataConnector, ConnectorAuth } from '../connectors/baseConnector';
import { GoogleDriveConnector } from '../connectors/googleDriveConnector';
import { SlackConnector } from '../connectors/slackConnector';
import { GmailConnector } from '../connectors/gmailConnector';
import { MicrosoftGraphConnector } from '../connectors/microsoftGraphConnector';

/**
 * Service for processing data fetching jobs
 */
export class JobProcessor {
  private connectorFactory: ConnectorFactory;
  private authProvider: (userId: number, connectorType: ConnectorType) => Promise<ConnectorAuth>;
  private dataStorage: (userId: number, connectorType: ConnectorType, dataType: string, data: any) => Promise<void>;
  
  /**
   * Create a new job processor
   * 
   * @param authProvider - Function to get authentication details for a user and connector
   * @param dataStorage - Function to store fetched data
   */
  constructor(
    authProvider: (userId: number, connectorType: ConnectorType) => Promise<ConnectorAuth>,
    dataStorage: (userId: number, connectorType: ConnectorType, dataType: string, data: any) => Promise<void>
  ) {
    this.connectorFactory = ConnectorFactory.getInstance();
    this.authProvider = authProvider;
    this.dataStorage = dataStorage;
  }
  
  /**
   * Process a fetching job
   */
  public async processJob(job: FetchingJob): Promise<any> {
    try {
      // Get authentication for the user and connector
      const auth = await this.authProvider(job.userId, job.connectorType);
      
      // Get or create connector
      const connector = await this.connectorFactory.getConnector(job.connectorType, job.userId, auth);
      
      // Process the job based on the connector type and data type
      const result = await this.fetchData(connector, job);
      
      // Store the fetched data
      await this.dataStorage(job.userId, job.connectorType, job.dataType, result);
      
      return result;
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Fetch data based on connector type and data type
   */
  private async fetchData(connector: DataConnector, job: FetchingJob): Promise<any> {
    switch (job.connectorType) {
      case ConnectorType.GOOGLE_DRIVE:
        return this.fetchGoogleDriveData(connector as GoogleDriveConnector, job);
      case ConnectorType.SLACK:
        return this.fetchSlackData(connector as SlackConnector, job);
      case ConnectorType.GMAIL:
        return this.fetchGmailData(connector as GmailConnector, job);
      case ConnectorType.MICROSOFT_GRAPH:
        return this.fetchMicrosoftGraphData(connector as MicrosoftGraphConnector, job);
      default:
        throw new Error(`Unsupported connector type: ${job.connectorType}`);
    }
  }
  
  /**
   * Fetch Google Drive data
   */
  private async fetchGoogleDriveData(connector: GoogleDriveConnector, job: FetchingJob): Promise<any> {
    switch (job.dataType) {
      case 'files':
        // Fetch files based on parameters
        const { query, pageSize, pageToken, fields, orderBy } = job.parameters;
        return connector.listFiles({
          query,
          pageSize,
          pageToken,
          fields,
          orderBy
        });
        
      case 'file':
        // Fetch a specific file
        const { fileId, includeContent = false } = job.parameters;
        
        if (!fileId) {
          throw new Error('File ID is required');
        }
        
        const file = await connector.getFile(fileId);
        
        if (includeContent) {
          try {
            const content = await connector.downloadFile(fileId);
            return { ...file, content };
          } catch (error) {
            console.warn(`Could not download file content for ${fileId}:`, error);
            return file;
          }
        }
        
        return file;
        
      case 'sharedWithMe':
        // Fetch files shared with the user
        return connector.getSharedWithMe(job.parameters);
        
      case 'search':
        // Search for files
        const { searchQuery } = job.parameters;
        
        if (!searchQuery) {
          throw new Error('Search query is required');
        }
        
        return connector.searchFiles(searchQuery, job.parameters);
        
      case 'revisions':
        // Get file revisions
        const { revisionFileId } = job.parameters;
        
        if (!revisionFileId) {
          throw new Error('File ID is required for revisions');
        }
        
        return connector.getFileRevisions(revisionFileId, job.parameters);
        
      case 'comments':
        // Get file comments
        const { commentFileId } = job.parameters;
        
        if (!commentFileId) {
          throw new Error('File ID is required for comments');
        }
        
        return connector.getFileComments(commentFileId, job.parameters);
        
      default:
        throw new Error(`Unsupported Google Drive data type: ${job.dataType}`);
    }
  }
  
  /**
   * Fetch Slack data
   */
  private async fetchSlackData(connector: SlackConnector, job: FetchingJob): Promise<any> {
    switch (job.dataType) {
      case 'conversations':
        // Fetch conversations
        return connector.listConversations(job.parameters);
        
      case 'messages':
        // Fetch messages from a conversation
        const { channelId } = job.parameters;
        
        if (!channelId) {
          throw new Error('Channel ID is required');
        }
        
        return connector.getConversationHistory(channelId, job.parameters);
        
      case 'thread':
        // Fetch thread replies
        const { threadChannelId, threadTs } = job.parameters;
        
        if (!threadChannelId || !threadTs) {
          throw new Error('Channel ID and thread timestamp are required');
        }
        
        return connector.getThreadReplies(threadChannelId, threadTs, job.parameters);
        
      case 'files':
        // Fetch files
        return connector.listFiles(job.parameters);
        
      case 'file':
        // Fetch a specific file
        const { fileId } = job.parameters;
        
        if (!fileId) {
          throw new Error('File ID is required');
        }
        
        return connector.getFileInfo(fileId);
        
      case 'search':
        // Search messages or files
        const { query, target = 'messages' } = job.parameters;
        
        if (!query) {
          throw new Error('Search query is required');
        }
        
        if (target === 'files') {
          return connector.searchFiles(query, job.parameters);
        } else {
          return connector.searchMessages(query, job.parameters);
        }
        
      case 'users':
        // Fetch users
        return connector.listUsers(job.parameters);
        
      case 'user':
        // Fetch a specific user
        const { userId } = job.parameters;
        
        if (!userId) {
          throw new Error('User ID is required');
        }
        
        return connector.getUserInfo(userId);
        
      default:
        throw new Error(`Unsupported Slack data type: ${job.dataType}`);
    }
  }
  
  /**
   * Fetch Gmail data
   */
  private async fetchGmailData(connector: GmailConnector, job: FetchingJob): Promise<any> {
    switch (job.dataType) {
      case 'messages':
        // Fetch messages
        return connector.listMessages(job.parameters);
        
      case 'message':
        // Fetch a specific message
        const { messageId } = job.parameters;
        
        if (!messageId) {
          throw new Error('Message ID is required');
        }
        
        return connector.getMessage(messageId, job.parameters);
        
      case 'threads':
        // Fetch threads
        return connector.listThreads(job.parameters);
        
      case 'thread':
        // Fetch a specific thread
        const { threadId } = job.parameters;
        
        if (!threadId) {
          throw new Error('Thread ID is required');
        }
        
        return connector.getThread(threadId);
        
      case 'attachment':
        // Fetch a message attachment
        const { attachmentMessageId, attachmentId } = job.parameters;
        
        if (!attachmentMessageId || !attachmentId) {
          throw new Error('Message ID and attachment ID are required');
        }
        
        return connector.getAttachment(attachmentMessageId, attachmentId);
        
      case 'search':
        // Search messages
        const { query } = job.parameters;
        
        if (!query) {
          throw new Error('Search query is required');
        }
        
        return connector.searchMessages(query, job.parameters);
        
      case 'labels':
        // Fetch labels
        return connector.listLabels();
        
      default:
        throw new Error(`Unsupported Gmail data type: ${job.dataType}`);
    }
  }
  
  /**
   * Fetch Microsoft Graph data
   */
  private async fetchMicrosoftGraphData(connector: MicrosoftGraphConnector, job: FetchingJob): Promise<any> {
    switch (job.dataType) {
      case 'messages':
        // Fetch messages
        return connector.listMessages(job.parameters);
        
      case 'message':
        // Fetch a specific message
        const { messageId } = job.parameters;
        
        if (!messageId) {
          throw new Error('Message ID is required');
        }
        
        return connector.getMessage(messageId, job.parameters);
        
      case 'conversation':
        // Fetch a conversation (thread)
        const { conversationId } = job.parameters;
        
        if (!conversationId) {
          throw new Error('Conversation ID is required');
        }
        
        return connector.getConversation(conversationId, job.parameters);
        
      case 'folders':
        // Fetch mail folders
        return connector.listFolders(job.parameters);
        
      case 'folderMessages':
        // Fetch messages in a folder
        const { folderId } = job.parameters;
        
        if (!folderId) {
          throw new Error('Folder ID is required');
        }
        
        return connector.getMessagesInFolder(folderId, job.parameters);
        
      case 'attachment':
        // Fetch a message attachment
        const { attachmentMessageId, attachmentId } = job.parameters;
        
        if (!attachmentMessageId || !attachmentId) {
          throw new Error('Message ID and attachment ID are required');
        }
        
        return connector.getAttachment(attachmentMessageId, attachmentId);
        
      case 'search':
        // Search messages
        const { query } = job.parameters;
        
        if (!query) {
          throw new Error('Search query is required');
        }
        
        return connector.searchMessages(query, job.parameters);
        
      case 'user':
        // Fetch user info
        return connector.getUserInfo();
        
      default:
        throw new Error(`Unsupported Microsoft Graph data type: ${job.dataType}`);
    }
  }
}