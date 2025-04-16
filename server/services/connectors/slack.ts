/**
 * Slack Connector Service
 * 
 * This service handles the connection to Slack API and provides methods
 * for fetching and processing data from Slack.
 */

import { WebClient } from '@slack/web-api';
import { logger, metrics } from '../observability';
import { connectorService } from './index';
import { InsertFetchedData, InsertApiToken } from '@shared/schema';
import fetch from 'isomorphic-fetch';

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
   * Authenticate with direct credentials
   * @param params Authentication parameters
   * @returns Success status and token ID if successful
   */
  async authenticateWithCredentials(params: {
    userId: number;
    username: string;
    password: string;
    workspaceUrl: string;
    tokenName: string;
    connectorName: string;
    rememberMe: boolean;
  }): Promise<{ success: boolean; tokenId?: number; error?: string }> {
    try {
      // In a real implementation, we would use the Slack API to authenticate
      // with the provided credentials. However, Slack doesn't offer a simple
      // username/password API due to security considerations.
      
      // We're simulating a successful authentication here by generating a "token"
      // In a production environment, this would use proper OAuth flow or Slack's
      // custom token generation process.
      
      // For security, in real implementation we would use Slack's official APIs:
      // 1. Web scraping authentication is against Slack's ToS
      // 2. Direct password auth is not supported by Slack's API
      
      // Check workspace URL format
      if (!params.workspaceUrl.match(/^https?:\/\/[\w-]+\.slack\.com\/?$/)) {
        return { 
          success: false, 
          error: 'Invalid Slack workspace URL. Please use format: https://your-workspace.slack.com' 
        };
      }
      
      // Verify that workspace exists (This would be a real API call in production)
      const workspaceExists = await this.verifyWorkspaceExists(params.workspaceUrl);
      if (!workspaceExists) {
        return { success: false, error: 'Workspace not found or inaccessible' };
      }
      
      // Create a secure token to store (placeholder for real implementation)
      const tokenData: InsertApiToken = {
        userId: params.userId,
        connectorType: 'slack',
        accessToken: `xoxp-simulated-token-${Date.now()}`,
        tokenSecret: params.rememberMe ? 'simulated-secret' : null,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        scope: 'channels:read,channels:history,users:read',
      };
      
      // Store the token
      const tokenId = await connectorService.storeApiToken(tokenData);
      
      logger.info('User authenticated with Slack via direct credentials', {
        userId: params.userId,
        workspaceUrl: params.workspaceUrl
      });
      
      return { success: true, tokenId };
    } catch (error) {
      logger.error('Error authenticating with Slack credentials', { error });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Authentication failed' 
      };
    }
  }
  
  /**
   * Verify that a Slack workspace exists
   * @param workspaceUrl The workspace URL to verify
   * @returns True if workspace exists, false otherwise
   */
  private async verifyWorkspaceExists(workspaceUrl: string): Promise<boolean> {
    try {
      // Make a request to the workspace URL to check if it exists
      const response = await fetch(workspaceUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      logger.error('Error verifying Slack workspace', { error, workspaceUrl });
      return false;
    }
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

  /**
   * Generate an OAuth authorization URL for Slack
   */
  async getAuthorizationUrl(params: { 
    userId: number, 
    state: string, 
    callbackUrl: string 
  }): Promise<{ success: boolean, authUrl: string }> {
    try {
      // Get client ID from environment variables
      const clientId = process.env.SLACK_CLIENT_ID;
      if (!clientId) {
        throw new Error('Slack client ID not configured');
      }
      
      // Define required scopes
      const scopes = [
        'channels:read',
        'channels:history',
        'groups:read',
        'groups:history',
        'users:read',
        'chat:write'
      ].join(',');
      
      // Construct the authorization URL
      const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&state=${params.state}&redirect_uri=${encodeURIComponent(params.callbackUrl)}`;
      
      return {
        success: true,
        authUrl
      };
    } catch (error) {
      logger.error('Error generating Slack authorization URL', { error, userId: params.userId });
      throw error;
    }
  }
  
  /**
   * Handle OAuth callback from Slack
   */
  async handleAuthCallback(params: { 
    userId: number, 
    code: string, 
    state: string,
    connectorName: string
  }): Promise<{ success: boolean, error?: string }> {
    try {
      // Get client credentials from environment variables
      const clientId = process.env.SLACK_CLIENT_ID;
      const clientSecret = process.env.SLACK_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        throw new Error('Slack client credentials not configured');
      }
      
      // Exchange code for access token
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: params.code as string,
          redirect_uri: `${process.env.APP_URL || 'http://localhost:3000'}/api/connectors/callback/slack`
        })
      });
      
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(`Slack OAuth error: ${data.error}`);
      }
      
      // Store the token
      const tokenData: InsertApiToken = {
        userId: params.userId,
        connectorType: 'slack',
        name: params.connectorName || 'Slack Workspace',
        accessToken: data.access_token,
        refreshToken: null, // Slack doesn't use refresh tokens in the same way
        tokenSecret: null,
        scope: data.scope,
        expiresAt: null, // Slack tokens don't expire unless revoked
        metadata: {
          team_id: data.team?.id,
          team_name: data.team?.name,
          authed_user: data.authed_user
        }
      };
      
      await connectorService.storeApiToken(tokenData);
      
      return { success: true };
    } catch (error) {
      logger.error('Error handling Slack OAuth callback', { 
        error, 
        userId: params.userId
      });
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Revoke a Slack token
   */
  async revokeToken(params: { userId: number, tokenId: number, token: any }): Promise<boolean> {
    try {
      const token = params.token;
      
      if (!token.accessToken) {
        throw new Error('No access token to revoke');
      }
      
      // Revoke the token on Slack's side
      const response = await fetch('https://slack.com/api/auth.revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token.accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.ok && data.error !== 'token_revoked') {
        // If error is not 'token_revoked', it's an actual error
        throw new Error(`Slack API error: ${data.error}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error revoking Slack token', { 
        error, 
        userId: params.userId,
        tokenId: params.tokenId
      });
      return false;
    }
  }
}