/**
 * Slack Connector Service
 * 
 * This service handles the connection to Slack API and provides methods
 * for fetching and processing data from Slack.
 */

import { WebClient } from '@slack/web-api';
import { logger, metrics } from '../observability';
import { connectorService } from './index';
import { InsertFetchedData } from '@shared/schema';

export class SlackConnector {
  /**
   * Initialize Slack client with token
   */
  private async getClient(userId: number): Promise<WebClient> {
    const token = await connectorService.getApiToken(userId, 'slack');
    
    if (!token || !token.accessToken) {
      throw new Error('No valid Slack token found for this user');
    }
    
    return new WebClient(token.accessToken);
  }

  /**
   * Test the connection to Slack
   */
  async testConnection(params: { userId: number }): Promise<{ success: boolean, userInfo?: any }> {
    const startTime = Date.now();
    
    try {
      const client = await this.getClient(params.userId);
      
      // Call auth.test to verify token
      const authTest = await client.auth.test();
      
      metrics.increment('external_api_calls_total', { service: 'slack', endpoint: 'auth.test' });
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'slack', endpoint: 'auth.test' });
      
      if (!authTest.ok) {
        throw new Error('Slack token validation failed');
      }
      
      // Get user info
      const userInfo = await client.users.info({
        user: authTest.user_id as string
      });
      
      metrics.increment('external_api_calls_total', { service: 'slack', endpoint: 'users.info' });
      
      return {
        success: true,
        userInfo: userInfo.user
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'slack' });
      logger.error('Slack connection test failed', { error, userId: params.userId });
      
      return {
        success: false,
        error: error.message || 'Failed to connect to Slack'
      };
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'slack' });
    }
  }

  /**
   * Get channels list from Slack
   */
  async getChannels(params: { userId: number, limit?: number }): Promise<{ channels: any[] }> {
    const startTime = Date.now();
    const limit = params.limit || 100;
    
    try {
      const client = await this.getClient(params.userId);
      
      const result = await client.conversations.list({
        limit,
        types: 'public_channel,private_channel',
        exclude_archived: true
      });
      
      metrics.increment('external_api_calls_total', { service: 'slack', endpoint: 'conversations.list' });
      
      return {
        channels: result.channels || []
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'slack' });
      logger.error('Failed to get Slack channels', { error, userId: params.userId });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'slack' });
    }
  }

  /**
   * Get messages from a Slack channel
   */
  async getChannelMessages(params: { 
    userId: number, 
    channelId: string, 
    limit?: number,
    oldest?: string,
    latest?: string
  }): Promise<{ messages: any[] }> {
    const startTime = Date.now();
    const limit = params.limit || 100;
    
    try {
      const client = await this.getClient(params.userId);
      
      const result = await client.conversations.history({
        channel: params.channelId,
        limit,
        oldest: params.oldest,
        latest: params.latest
      });
      
      metrics.increment('external_api_calls_total', { service: 'slack', endpoint: 'conversations.history' });
      
      return {
        messages: result.messages || []
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'slack' });
      logger.error('Failed to get Slack channel messages', { 
        error, 
        userId: params.userId,
        channelId: params.channelId
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'slack' });
    }
  }

  /**
   * Get messages from threads in a channel
   */
  async getThreadReplies(params: {
    userId: number,
    channelId: string,
    threadTs: string,
    limit?: number
  }): Promise<{ replies: any[] }> {
    const startTime = Date.now();
    const limit = params.limit || 100;
    
    try {
      const client = await this.getClient(params.userId);
      
      const result = await client.conversations.replies({
        channel: params.channelId,
        ts: params.threadTs,
        limit
      });
      
      metrics.increment('external_api_calls_total', { service: 'slack', endpoint: 'conversations.replies' });
      
      return {
        replies: result.messages || []
      };
    } catch (error) {
      metrics.increment('external_api_errors_total', { service: 'slack' });
      logger.error('Failed to get Slack thread replies', { 
        error, 
        userId: params.userId,
        channelId: params.channelId,
        threadTs: params.threadTs
      });
      throw error;
    } finally {
      metrics.histogram('external_api_duration', Date.now() - startTime, { service: 'slack' });
    }
  }

  /**
   * Process fetched messages from Slack
   */
  async processMessages(params: {
    userId: number,
    messages: any[],
    channelId: string,
    channelName: string,
    jobId?: string
  }): Promise<InsertFetchedData[]> {
    const { userId, messages, channelId, channelName, jobId } = params;
    
    try {
      if (!messages.length) {
        return [];
      }
      
      const dataItems: InsertFetchedData[] = messages.map(message => {
        const timestamp = new Date(parseInt(message.ts.split('.')[0]) * 1000);
        const isThread = message.thread_ts !== undefined && message.thread_ts === message.ts;
        const hasReplies = message.reply_count && message.reply_count > 0;
        
        // Process message text for title
        let title = 'Slack message';
        if (message.text) {
          // Extract first line or up to 100 chars for title
          title = message.text.split('\n')[0].substring(0, 100);
          if (title.length < message.text.length) {
            title += '...';
          }
        }
        
        if (isThread) {
          title = `[Thread] ${title}`;
        }
        
        const metadata = {
          channelId,
          channelName,
          ts: message.ts,
          threadTs: message.thread_ts,
          replyCount: message.reply_count || 0,
          reactions: message.reactions || [],
          isThread,
          hasReplies,
          files: message.files || [],
          userId: message.user,
          userProfile: message.user_profile
        };
        
        const sourceUrl = `slack://channel?id=${channelId}&message_ts=${message.ts}`;
        
        return {
          userId,
          jobId: jobId || null,
          dataId: `slack_msg_${channelId}_${message.ts.replace('.', '_')}`,
          connectorType: 'slack',
          dataType: 'slack_message',
          title,
          content: message.text || '',
          metadata,
          sourceUrl,
          sourceId: message.ts,
          fetchedAt: timestamp
        };
      });
      
      return dataItems;
    } catch (error) {
      logger.error('Error processing Slack messages', { error, userId, channelId });
      throw error;
    }
  }

  /**
   * Fetch messages from a channel and store them
   */
  async fetchAndStoreChannelMessages(params: {
    userId: number,
    channelId: string,
    limit?: number,
    jobId?: string
  }): Promise<{ count: number, messages: any[] }> {
    try {
      // Get channel info first
      const client = await this.getClient(params.userId);
      const channelInfo = await client.conversations.info({
        channel: params.channelId
      });
      
      if (!channelInfo.ok || !channelInfo.channel) {
        throw new Error('Failed to get channel information');
      }
      
      // Get channel name
      const channelName = channelInfo.channel.name || `channel-${params.channelId}`;
      
      // Get messages
      const { messages } = await this.getChannelMessages({
        userId: params.userId,
        channelId: params.channelId,
        limit: params.limit
      });
      
      // Process messages
      const dataItems = await this.processMessages({
        userId: params.userId,
        messages,
        channelId: params.channelId,
        channelName,
        jobId: params.jobId
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
      logger.error('Error fetching and storing Slack messages', { 
        error, 
        userId: params.userId,
        channelId: params.channelId
      });
      throw error;
    }
  }

  /**
   * Execute a job to fetch Slack messages
   */
  async executeJob(job: any): Promise<{ success: boolean, count: number, error?: string }> {
    try {
      const { parameters, userId } = job;
      
      if (!parameters.channelId) {
        throw new Error('Channel ID is required for Slack message fetching');
      }
      
      const result = await this.fetchAndStoreChannelMessages({
        userId,
        channelId: parameters.channelId,
        limit: parameters.limit || 100,
        jobId: job.jobId
      });
      
      return {
        success: true,
        count: result.count
      };
    } catch (error) {
      logger.error('Slack job execution failed', { error, jobId: job.jobId });
      return {
        success: false,
        count: 0,
        error: error.message
      };
    }
  }
}