/**
 * Slack Connector
 * 
 * Implements data fetching from Slack including conversations, messages, and files
 */

import { WebClient } from '@slack/web-api';
import { BaseConnector, ConnectorAuth, ConnectorOptions } from './baseConnector';

/**
 * Interface for Slack messages
 */
export interface SlackMessage {
  ts: string;
  text: string;
  user?: string;
  channel?: string;
  team?: string;
  type?: string;
  subtype?: string;
  thread_ts?: string;
  attachments?: any[];
  files?: any[];
  reactions?: any[];
  [key: string]: any;
}

/**
 * Interface for Slack conversations (channels)
 */
export interface SlackConversation {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  creator?: string;
  topic?: { value: string; creator?: string; last_set?: number };
  purpose?: { value: string; creator?: string; last_set?: number };
  num_members?: number;
  [key: string]: any;
}

/**
 * Interface for Slack files
 */
export interface SlackFile {
  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private?: string;
  url_private_download?: string;
  permalink?: string;
  created: number;
  timestamp: number;
  user?: string;
  username?: string;
  channels?: string[];
  groups?: string[];
  content?: string;
  [key: string]: any;
}

/**
 * Slack connector for fetching conversations, messages, and files
 */
export class SlackConnector extends BaseConnector {
  private client: WebClient | null = null;
  
  constructor() {
    super('slack');
  }
  
  /**
   * Initialize the Slack connector with token
   */
  public async initialize(auth: ConnectorAuth): Promise<void> {
    await super.initialize(auth);
    
    try {
      // Create Slack client
      this.client = new WebClient(auth.accessToken);
    } catch (error) {
      console.error('Error initializing Slack connector:', error);
      throw new Error('Failed to initialize Slack connector');
    }
  }
  
  /**
   * Validate authentication parameters
   */
  public validateAuth(auth: ConnectorAuth): boolean {
    return !!auth && !!auth.accessToken;
  }
  
  /**
   * Test the connection to Slack
   */
  public async testConnection(): Promise<boolean> {
    if (!this.client) {
      return false;
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.auth.test()
      );
      return !!response && response.ok === true;
    } catch (error) {
      console.error('Error testing Slack connection:', error);
      return false;
    }
  }
  
  /**
   * List conversations (channels)
   */
  public async listConversations(options: ConnectorOptions = {}): Promise<SlackConversation[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      types = 'public_channel,private_channel',
      excludeArchived = true,
      limit = 100,
      cursor
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.conversations.list({
          types: types as string,
          exclude_archived: excludeArchived as boolean,
          limit: limit as number,
          cursor: cursor as string
        })
      );
      
      return (response.channels || []) as SlackConversation[];
    } catch (error) {
      console.error('Error listing Slack conversations:', error);
      throw new Error('Failed to list Slack conversations');
    }
  }
  
  /**
   * Get conversation history (messages)
   */
  public async getConversationHistory(channelId: string, options: ConnectorOptions = {}): Promise<SlackMessage[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      limit = 100,
      latest,
      oldest,
      inclusive = true,
      cursor
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.conversations.history({
          channel: channelId,
          limit: limit as number,
          latest: latest as string,
          oldest: oldest as string,
          inclusive: inclusive as boolean,
          cursor: cursor as string
        })
      );
      
      return (response.messages || []) as SlackMessage[];
    } catch (error) {
      console.error(`Error getting Slack conversation history for ${channelId}:`, error);
      throw new Error(`Failed to get Slack conversation history for ${channelId}`);
    }
  }
  
  /**
   * Get replies to a thread
   */
  public async getThreadReplies(channelId: string, threadTs: string, options: ConnectorOptions = {}): Promise<SlackMessage[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      limit = 100,
      latest,
      oldest,
      inclusive = true,
      cursor
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.conversations.replies({
          channel: channelId,
          ts: threadTs,
          limit: limit as number,
          latest: latest as string,
          oldest: oldest as string,
          inclusive: inclusive as boolean,
          cursor: cursor as string
        })
      );
      
      return (response.messages || []) as SlackMessage[];
    } catch (error) {
      console.error(`Error getting Slack thread replies for ${channelId}/${threadTs}:`, error);
      throw new Error(`Failed to get Slack thread replies for ${channelId}/${threadTs}`);
    }
  }
  
  /**
   * List files
   */
  public async listFiles(options: ConnectorOptions = {}): Promise<SlackFile[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      channel,
      user,
      types = 'all',
      limit = 100,
      page = 1
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.files.list({
          channel: channel as string,
          user: user as string,
          types: types as string,
          count: limit as number,
          page: page as number
        })
      );
      
      return (response.files || []) as SlackFile[];
    } catch (error) {
      console.error('Error listing Slack files:', error);
      throw new Error('Failed to list Slack files');
    }
  }
  
  /**
   * Get file info
   */
  public async getFileInfo(fileId: string): Promise<SlackFile> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.files.info({
          file: fileId
        })
      );
      
      if (!response.file) {
        throw new Error(`File not found: ${fileId}`);
      }
      
      return response.file as SlackFile;
    } catch (error) {
      console.error(`Error getting Slack file info for ${fileId}:`, error);
      throw new Error(`Failed to get Slack file info for ${fileId}`);
    }
  }
  
  /**
   * Search messages
   */
  public async searchMessages(query: string, options: ConnectorOptions = {}): Promise<SlackMessage[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      sort = 'timestamp',
      sortDir = 'desc',
      count = 100,
      page = 1
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.search.messages({
          query,
          sort: sort as string,
          sort_dir: sortDir as string,
          count: count as number,
          page: page as number
        })
      );
      
      // Extract messages from search results
      const messages = response.messages?.matches || [];
      return messages as SlackMessage[];
    } catch (error) {
      console.error(`Error searching Slack messages for "${query}":`, error);
      throw new Error(`Failed to search Slack messages for "${query}"`);
    }
  }
  
  /**
   * Search files
   */
  public async searchFiles(query: string, options: ConnectorOptions = {}): Promise<SlackFile[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      sort = 'timestamp',
      sortDir = 'desc',
      count = 100,
      page = 1
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.search.files({
          query,
          sort: sort as string,
          sort_dir: sortDir as string,
          count: count as number,
          page: page as number
        })
      );
      
      // Extract files from search results
      const files = response.files?.matches || [];
      return files as SlackFile[];
    } catch (error) {
      console.error(`Error searching Slack files for "${query}":`, error);
      throw new Error(`Failed to search Slack files for "${query}"`);
    }
  }
  
  /**
   * Get user info
   */
  public async getUserInfo(userId: string): Promise<any> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.users.info({
          user: userId
        })
      );
      
      return response.user;
    } catch (error) {
      console.error(`Error getting Slack user info for ${userId}:`, error);
      throw new Error(`Failed to get Slack user info for ${userId}`);
    }
  }
  
  /**
   * List users
   */
  public async listUsers(options: ConnectorOptions = {}): Promise<any[]> {
    if (!this.client) {
      throw new Error('Slack client not initialized');
    }
    
    const {
      limit = 100,
      cursor
    } = options;
    
    try {
      const response = await this.executeRequest(
        async () => await this.client!.users.list({
          limit: limit as number,
          cursor: cursor as string
        })
      );
      
      return (response.members || []) as any[];
    } catch (error) {
      console.error('Error listing Slack users:', error);
      throw new Error('Failed to list Slack users');
    }
  }
}