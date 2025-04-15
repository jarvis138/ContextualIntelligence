/**
 * Slack Integration Service
 * 
 * Provides integration with Slack API for retrieving messages, files,
 * and other data from Slack workspaces.
 */

import { WebClient } from '@slack/web-api';
import { storage } from '../../storage';
import { User, Integration, InsertActivity } from '@shared/schema';
import { pipeline, createStage } from '../../utils/pipeline';

/**
 * Slack message structure
 */
export interface SlackMessage {
  id: string;
  text: string;
  user: string;
  username?: string;
  timestamp: string;
  threadTimestamp?: string;
  channel: string;
  channelName?: string;
  reactions?: {
    name: string;
    count: number;
    users: string[];
  }[];
  files?: {
    id: string;
    name: string;
    type: string;
    url?: string;
    size?: number;
  }[];
  links?: {
    url: string;
    text: string;
  }[];
  mentions?: {
    userId: string;
    username: string;
  }[];
  isThread: boolean;
  isReply: boolean;
  replyCount?: number;
}

/**
 * Slack channel structure
 */
export interface SlackChannel {
  id: string;
  name: string;
  topic?: string;
  purpose?: string;
  memberCount?: number;
  isPrivate: boolean;
  isArchived: boolean;
  created?: Date;
}

/**
 * Slack conversation history options
 */
export interface SlackHistoryOptions {
  channel: string;
  cursor?: string;
  limit?: number;
  oldest?: string;
  latest?: string;
  inclusive?: boolean;
  includeThreads?: boolean;
}

/**
 * Slack message extraction options
 */
export interface MessageExtractionOptions {
  channels?: string[];
  startDate?: Date;
  endDate?: Date;
  includeThreads?: boolean;
  includeFiles?: boolean;
  limit?: number;
  linkToProjects?: number[];
}

/**
 * Main Slack Integration Service
 */
export class SlackIntegrationService {
  private clients: Map<number, WebClient> = new Map();
  
  /**
   * Initialize Slack client for a user
   */
  async initializeClient(userId: number): Promise<WebClient | null> {
    try {
      // Check if client already exists
      if (this.clients.has(userId)) {
        return this.clients.get(userId)!;
      }
      
      // Get Slack integration for user
      const integration = await this.getUserIntegration(userId);
      if (!integration) {
        return null;
      }
      
      // Create Slack client
      const token = integration.config?.token as string;
      if (!token) {
        throw new Error('Slack token not found in integration config');
      }
      
      const client = new WebClient(token);
      this.clients.set(userId, client);
      
      return client;
    } catch (error) {
      console.error(`Error initializing Slack client for user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Get Slack integration for a user
   */
  async getUserIntegration(userId: number): Promise<Integration | undefined> {
    const integrations = await storage.getIntegrations(userId);
    return integrations.find(integration => integration.type === 'slack');
  }
  
  /**
   * Get Slack channels
   */
  async getChannels(userId: number): Promise<SlackChannel[]> {
    const client = await this.initializeClient(userId);
    if (!client) {
      throw new Error('Slack client not initialized');
    }
    
    try {
      // Get public channels
      const publicResult = await client.conversations.list({
        types: 'public_channel',
        exclude_archived: true,
        limit: 1000
      });
      
      // Get private channels (if accessible)
      const privateResult = await client.conversations.list({
        types: 'private_channel',
        exclude_archived: true,
        limit: 1000
      });
      
      // Combine results
      const channels: SlackChannel[] = [];
      
      // Process public channels
      if (publicResult.channels && publicResult.channels.length > 0) {
        for (const channel of publicResult.channels) {
          if (channel.id) {
            channels.push({
              id: channel.id,
              name: channel.name || `channel-${channel.id}`,
              topic: channel.topic?.value,
              purpose: channel.purpose?.value,
              memberCount: channel.num_members,
              isPrivate: false,
              isArchived: channel.is_archived || false,
              created: channel.created ? new Date(channel.created * 1000) : undefined
            });
          }
        }
      }
      
      // Process private channels
      if (privateResult.channels && privateResult.channels.length > 0) {
        for (const channel of privateResult.channels) {
          if (channel.id) {
            channels.push({
              id: channel.id,
              name: channel.name || `private-${channel.id}`,
              topic: channel.topic?.value,
              purpose: channel.purpose?.value,
              memberCount: channel.num_members,
              isPrivate: true,
              isArchived: channel.is_archived || false,
              created: channel.created ? new Date(channel.created * 1000) : undefined
            });
          }
        }
      }
      
      return channels;
    } catch (error) {
      console.error('Error getting Slack channels:', error);
      throw error;
    }
  }
  
  /**
   * Get channel history (messages)
   */
  async getChannelHistory(
    userId: number,
    options: SlackHistoryOptions
  ): Promise<{
    messages: SlackMessage[];
    hasMore: boolean;
    nextCursor?: string;
  }> {
    const client = await this.initializeClient(userId);
    if (!client) {
      throw new Error('Slack client not initialized');
    }
    
    try {
      // Get channel info for name
      let channelName: string | undefined;
      try {
        const channelInfo = await client.conversations.info({
          channel: options.channel
        });
        channelName = channelInfo.channel?.name;
      } catch (e) {
        // Channel info not accessible or doesn't exist
        channelName = options.channel;
      }
      
      // Get conversation history
      const result = await client.conversations.history({
        channel: options.channel,
        cursor: options.cursor,
        limit: options.limit || 100,
        oldest: options.oldest,
        latest: options.latest,
        inclusive: options.inclusive
      });
      
      const messages: SlackMessage[] = [];
      
      if (result.messages && result.messages.length > 0) {
        // Process messages
        for (const msg of result.messages) {
          if (!msg.ts) continue;
          
          const slackMessage: SlackMessage = {
            id: msg.ts,
            text: msg.text || '',
            user: msg.user || 'unknown',
            username: msg.username,
            timestamp: msg.ts,
            threadTimestamp: msg.thread_ts,
            channel: options.channel,
            channelName,
            isThread: msg.thread_ts !== undefined && msg.thread_ts === msg.ts,
            isReply: msg.thread_ts !== undefined && msg.thread_ts !== msg.ts,
            replyCount: msg.reply_count
          };
          
          // Process reactions
          if (msg.reactions && msg.reactions.length > 0) {
            slackMessage.reactions = msg.reactions.map(reaction => ({
              name: reaction.name || '',
              count: reaction.count || 0,
              users: reaction.users || []
            }));
          }
          
          // Process files
          if (msg.files && msg.files.length > 0) {
            slackMessage.files = msg.files.map(file => ({
              id: file.id || '',
              name: file.name || `file-${file.id}`,
              type: file.filetype || 'unknown',
              url: file.url_private,
              size: file.size
            }));
          }
          
          // Extract links from text
          const linkRegex = /<(https?:[^|>]+)(?:\|([^>]+))?>/g;
          const links: { url: string; text: string }[] = [];
          let match;
          
          while ((match = linkRegex.exec(slackMessage.text)) !== null) {
            links.push({
              url: match[1],
              text: match[2] || match[1]
            });
          }
          
          if (links.length > 0) {
            slackMessage.links = links;
          }
          
          // Extract user mentions
          const mentionRegex = /<@([A-Z0-9]+)>/g;
          const mentions: { userId: string; username: string }[] = [];
          
          while ((match = mentionRegex.exec(slackMessage.text)) !== null) {
            mentions.push({
              userId: match[1],
              username: 'user' // Will be resolved later
            });
          }
          
          if (mentions.length > 0) {
            slackMessage.mentions = mentions;
          }
          
          messages.push(slackMessage);
          
          // Get thread replies if requested and available
          if (options.includeThreads && slackMessage.isThread && slackMessage.replyCount && slackMessage.replyCount > 0) {
            try {
              const threadReplies = await this.getThreadReplies(
                client,
                options.channel,
                slackMessage.id,
                channelName
              );
              messages.push(...threadReplies);
            } catch (threadError) {
              console.warn(`Error getting thread replies for ${slackMessage.id}:`, threadError);
            }
          }
        }
      }
      
      return {
        messages,
        hasMore: result.has_more || false,
        nextCursor: result.response_metadata?.next_cursor
      };
    } catch (error) {
      console.error('Error getting Slack channel history:', error);
      throw error;
    }
  }
  
  /**
   * Get thread replies for a message
   */
  private async getThreadReplies(
    client: WebClient,
    channel: string,
    threadTs: string,
    channelName?: string
  ): Promise<SlackMessage[]> {
    try {
      const result = await client.conversations.replies({
        channel,
        ts: threadTs,
        limit: 100
      });
      
      const replies: SlackMessage[] = [];
      
      if (result.messages && result.messages.length > 0) {
        // Skip the first message as it's the parent
        for (let i = 1; i < result.messages.length; i++) {
          const msg = result.messages[i];
          if (!msg.ts) continue;
          
          replies.push({
            id: msg.ts,
            text: msg.text || '',
            user: msg.user || 'unknown',
            username: msg.username,
            timestamp: msg.ts,
            threadTimestamp: msg.thread_ts,
            channel,
            channelName,
            isThread: false,
            isReply: true
          });
        }
      }
      
      return replies;
    } catch (error) {
      console.error(`Error getting thread replies for ${threadTs}:`, error);
      return [];
    }
  }
  
  /**
   * Extract messages using specified options
   */
  async extractMessages(
    userId: number,
    options: MessageExtractionOptions
  ): Promise<{
    messages: SlackMessage[];
    channels: SlackChannel[];
    stats: {
      totalMessages: number;
      totalThreads: number;
      totalReplies: number;
      totalFiles: number;
      processedChannels: number;
    };
  }> {
    const client = await this.initializeClient(userId);
    if (!client) {
      throw new Error('Slack client not initialized');
    }
    
    // Initialize stats
    const stats = {
      totalMessages: 0,
      totalThreads: 0,
      totalReplies: 0,
      totalFiles: 0,
      processedChannels: 0
    };
    
    // Get channels if not specified
    let channels: SlackChannel[] = [];
    let targetChannelIds: string[] = options.channels || [];
    
    if (targetChannelIds.length === 0) {
      channels = await this.getChannels(userId);
      targetChannelIds = channels.map(channel => channel.id);
    } else {
      // Just get info for the specified channels
      for (const channelId of targetChannelIds) {
        try {
          const channelInfo = await client.conversations.info({
            channel: channelId
          });
          
          if (channelInfo.channel) {
            channels.push({
              id: channelInfo.channel.id || channelId,
              name: channelInfo.channel.name || `channel-${channelId}`,
              topic: channelInfo.channel.topic?.value,
              purpose: channelInfo.channel.purpose?.value,
              isPrivate: channelInfo.channel.is_private || false,
              isArchived: channelInfo.channel.is_archived || false
            });
          }
        } catch (e) {
          console.warn(`Could not get info for channel ${channelId}:`, e);
        }
      }
    }
    
    // Convert date options to timestamps
    const oldest = options.startDate ? Math.floor(options.startDate.getTime() / 1000).toString() : undefined;
    const latest = options.endDate ? Math.floor(options.endDate.getTime() / 1000).toString() : undefined;
    
    // Extract messages from each channel
    const allMessages: SlackMessage[] = [];
    
    for (const channelId of targetChannelIds) {
      try {
        let hasMore = true;
        let cursor: string | undefined;
        let messagesProcessed = 0;
        const messageLimit = options.limit || 1000;
        
        while (hasMore && (!options.limit || messagesProcessed < messageLimit)) {
          const result = await this.getChannelHistory(userId, {
            channel: channelId,
            cursor,
            limit: 100,
            oldest,
            latest,
            includeThreads: options.includeThreads
          });
          
          // Update counters
          messagesProcessed += result.messages.length;
          stats.totalMessages += result.messages.length;
          stats.totalThreads += result.messages.filter(msg => msg.isThread).length;
          stats.totalReplies += result.messages.filter(msg => msg.isReply).length;
          stats.totalFiles += result.messages.reduce((count, msg) => 
            count + (msg.files?.length || 0), 0
          );
          
          // Add messages to result
          allMessages.push(...result.messages);
          
          // Check if we should continue
          hasMore = result.hasMore && (!options.limit || messagesProcessed < messageLimit);
          cursor = result.nextCursor;
          
          // Short pause to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        stats.processedChannels++;
      } catch (error) {
        console.error(`Error processing channel ${channelId}:`, error);
      }
    }
    
    // Create activities for projects if requested
    if (options.linkToProjects && options.linkToProjects.length > 0) {
      await this.createActivitiesForProjects(
        userId,
        allMessages,
        options.linkToProjects
      );
    }
    
    return {
      messages: allMessages,
      channels,
      stats
    };
  }
  
  /**
   * Create activities for projects based on Slack messages
   */
  private async createActivitiesForProjects(
    userId: number,
    messages: SlackMessage[],
    projectIds: number[]
  ): Promise<void> {
    // Skip if no messages or projects
    if (messages.length === 0 || projectIds.length === 0) {
      return;
    }
    
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
        
        // Create summary activity
        const activity: InsertActivity = {
          type: 'slack_import',
          userId: userId,
          projectId: projectId,
          description: `Imported ${messages.length} Slack messages from ${new Set(messages.map(m => m.channelName || m.channel)).size} channels`,
          entityType: 'slack_message',
          entityId: null
        };
        
        await storage.createActivity(activity);
      }
    } catch (error) {
      console.error('Error creating activities for projects:', error);
    }
  }
  
  /**
   * Create a processing pipeline for Slack message extraction
   */
  createExtractionPipeline(userId: number, options: MessageExtractionOptions) {
    return pipeline(
      createStage('initialize', async () => {
        const client = await this.initializeClient(userId);
        if (!client) {
          throw new Error('Failed to initialize Slack client');
        }
        return { client, options, messages: [], channels: [], stats: null };
      }),
      
      createStage('fetch-channels', async (context) => {
        context.channels = await this.getChannels(userId);
        return context;
      }),
      
      createStage('extract-messages', async (context) => {
        const result = await this.extractMessages(userId, options);
        context.messages = result.messages;
        context.stats = result.stats;
        return context;
      }),
      
      createStage('enrich-messages', async (context) => {
        // Additional enrichment could be done here
        // For example, resolving user IDs to names
        return context;
      })
    );
  }
}

// Create instance
export const slackIntegrationService = new SlackIntegrationService();