/**
 * Integration Manager
 * 
 * Central service for managing all external integrations.
 * Provides a unified interface for registering and working with various integrations.
 */

import { slackIntegrationService } from './integrations/slackIntegration';
import { gitIntegrationService } from './integrations/gitIntegration';
import { taskManagementIntegrationService } from './integrations/taskManagementIntegration';
import { googleWorkspaceIntegrationService } from './integrations/googleWorkspaceIntegration';
import { storage } from '../storage';
import { User, Integration, InsertIntegration } from '@shared/schema';

/**
 * Integration metadata type defining available integration providers
 */
export interface IntegrationMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  configSchema: {
    fields: {
      name: string;
      label: string;
      type: string;
      required: boolean;
      placeholder?: string;
      description?: string;
      options?: { label: string; value: string }[];
    }[];
  };
  capabilities: string[];
}

/**
 * List of all supported integrations with their metadata
 */
export const SUPPORTED_INTEGRATIONS: IntegrationMeta[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Connect to Slack to import messages, files, and other data',
    icon: 'ri-slack-line',
    configSchema: {
      fields: [
        {
          name: 'token',
          label: 'Bot Token',
          type: 'password',
          required: true,
          placeholder: 'xoxb-...',
          description: 'Slack bot token starting with xoxb-'
        },
        {
          name: 'channels',
          label: 'Channels',
          type: 'multiselect',
          required: false,
          description: 'Channels to monitor (leave empty for all accessible channels)'
        }
      ]
    },
    capabilities: ['messages', 'files', 'users', 'reactions']
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect to GitHub to track repositories, issues, and pull requests',
    icon: 'ri-github-fill',
    configSchema: {
      fields: [
        {
          name: 'token',
          label: 'Personal Access Token',
          type: 'password',
          required: true,
          placeholder: 'ghp_...',
          description: 'GitHub personal access token with repo scope'
        },
        {
          name: 'repositories',
          label: 'Repositories',
          type: 'multiselect',
          required: false,
          description: 'Repositories to monitor (leave empty for all accessible repositories)'
        }
      ]
    },
    capabilities: ['repositories', 'issues', 'pull_requests', 'commits', 'code']
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Connect to GitLab to track projects, issues, and merge requests',
    icon: 'ri-gitlab-fill',
    configSchema: {
      fields: [
        {
          name: 'token',
          label: 'Personal Access Token',
          type: 'password',
          required: true,
          placeholder: 'glpat-...',
          description: 'GitLab personal access token with api scope'
        },
        {
          name: 'repositories',
          label: 'Repositories',
          type: 'multiselect',
          required: false,
          description: 'Projects to monitor (leave empty for all accessible projects)'
        }
      ]
    },
    capabilities: ['repositories', 'issues', 'merge_requests', 'commits', 'code']
  },
  {
    id: 'jira',
    name: 'Jira',
    description: 'Connect to Jira to track projects, issues, and sprints',
    icon: 'ri-jira-line',
    configSchema: {
      fields: [
        {
          name: 'domain',
          label: 'Jira Domain',
          type: 'text',
          required: true,
          placeholder: 'company',
          description: 'Your Jira domain (e.g., "company" for company.atlassian.net)'
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true,
          placeholder: 'user@example.com',
          description: 'Email address used for Jira'
        },
        {
          name: 'token',
          label: 'API Token',
          type: 'password',
          required: true,
          placeholder: '',
          description: 'Jira API token from your Atlassian account'
        }
      ]
    },
    capabilities: ['projects', 'issues', 'sprints', 'epics', 'boards']
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Connect to Trello to track boards, lists, and cards',
    icon: 'ri-trello-line',
    configSchema: {
      fields: [
        {
          name: 'key',
          label: 'API Key',
          type: 'text',
          required: true,
          placeholder: '',
          description: 'Trello API key'
        },
        {
          name: 'token',
          label: 'API Token',
          type: 'password',
          required: true,
          placeholder: '',
          description: 'Trello API token with read access'
        }
      ]
    },
    capabilities: ['boards', 'lists', 'cards', 'members']
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Connect to Google Workspace to import documents, emails, and calendar events',
    icon: 'ri-google-fill',
    configSchema: {
      fields: [
        {
          name: 'clientId',
          label: 'Client ID',
          type: 'text',
          required: true,
          placeholder: '',
          description: 'Google OAuth client ID'
        },
        {
          name: 'clientSecret',
          label: 'Client Secret',
          type: 'password',
          required: true,
          placeholder: '',
          description: 'Google OAuth client secret'
        },
        {
          name: 'refreshToken',
          label: 'Refresh Token',
          type: 'password',
          required: true,
          placeholder: '',
          description: 'Google OAuth refresh token'
        }
      ]
    },
    capabilities: ['drive', 'calendar', 'gmail', 'documents', 'spreadsheets', 'forms']
  }
];

/**
 * Integration Manager Service
 */
export class IntegrationManager {
  /**
   * Get all available integration types
   */
  getAvailableIntegrations(): IntegrationMeta[] {
    return SUPPORTED_INTEGRATIONS;
  }
  
  /**
   * Get integration by ID
   */
  getIntegrationById(id: string): IntegrationMeta | undefined {
    return SUPPORTED_INTEGRATIONS.find(integration => integration.id === id);
  }
  
  /**
   * Get user integrations
   */
  async getUserIntegrations(userId: number): Promise<Integration[]> {
    return storage.getIntegrations(userId);
  }
  
  /**
   * Add integration for user
   */
  async addIntegration(userId: number, integration: InsertIntegration): Promise<Integration> {
    // Validate integration type
    const integrationType = this.getIntegrationById(integration.type);
    if (!integrationType) {
      throw new Error(`Unsupported integration type: ${integration.type}`);
    }
    
    // Create the integration
    return storage.createIntegration({
      ...integration,
      userId
    });
  }
  
  /**
   * Update integration
   */
  async updateIntegration(
    userId: number,
    integrationId: number,
    update: Partial<InsertIntegration>
  ): Promise<Integration | undefined> {
    // Get the integration
    const integration = await storage.getIntegration(integrationId);
    
    // Check if integration exists and belongs to the user
    if (!integration || integration.userId !== userId) {
      throw new Error('Integration not found or does not belong to user');
    }
    
    // Update the integration
    return storage.updateIntegration(integrationId, update);
  }
  
  /**
   * Delete integration
   */
  async deleteIntegration(userId: number, integrationId: number): Promise<boolean> {
    // Get the integration
    const integration = await storage.getIntegration(integrationId);
    
    // Check if integration exists and belongs to the user
    if (!integration || integration.userId !== userId) {
      throw new Error('Integration not found or does not belong to user');
    }
    
    // Delete the integration
    return storage.deleteIntegration(integrationId);
  }
  
  /**
   * Test integration connection
   */
  async testIntegration(userId: number, type: string, config: any): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      switch (type) {
        case 'slack':
          // Test Slack connection by listing channels
          const slackClient = new (require('@slack/web-api').WebClient)(config.token);
          const slackResult = await slackClient.conversations.list({
            limit: 5
          });
          
          return {
            success: true,
            message: `Successfully connected to Slack. Found ${slackResult.channels?.length || 0} channels.`,
            details: {
              channels: slackResult.channels?.slice(0, 5).map((c: any) => ({ id: c.id, name: c.name }))
            }
          };
          
        case 'github':
          // Test GitHub connection by listing repositories
          const githubResponse = await fetch('https://api.github.com/user/repos?per_page=5', {
            headers: {
              'Authorization': `token ${config.token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          
          if (!githubResponse.ok) {
            throw new Error(`GitHub API error: ${githubResponse.statusText}`);
          }
          
          const githubRepos = await githubResponse.json();
          
          return {
            success: true,
            message: `Successfully connected to GitHub. Found ${githubRepos.length} repositories.`,
            details: {
              repositories: githubRepos.map((repo: any) => ({ id: repo.id, name: repo.full_name }))
            }
          };
          
        case 'gitlab':
          // Test GitLab connection by listing projects
          const gitlabResponse = await fetch('https://gitlab.com/api/v4/projects?per_page=5', {
            headers: {
              'PRIVATE-TOKEN': config.token
            }
          });
          
          if (!gitlabResponse.ok) {
            throw new Error(`GitLab API error: ${gitlabResponse.statusText}`);
          }
          
          const gitlabProjects = await gitlabResponse.json();
          
          return {
            success: true,
            message: `Successfully connected to GitLab. Found ${gitlabProjects.length} projects.`,
            details: {
              projects: gitlabProjects.map((project: any) => ({ id: project.id, name: project.path_with_namespace }))
            }
          };
          
        case 'jira':
          // Test Jira connection by listing projects
          const jiraResponse = await fetch(`https://${config.domain}.atlassian.net/rest/api/3/project`, {
            headers: {
              'Authorization': `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`,
              'Accept': 'application/json'
            }
          });
          
          if (!jiraResponse.ok) {
            throw new Error(`Jira API error: ${jiraResponse.statusText}`);
          }
          
          const jiraProjects = await jiraResponse.json();
          
          return {
            success: true,
            message: `Successfully connected to Jira. Found ${jiraProjects.length} projects.`,
            details: {
              projects: jiraProjects.map((project: any) => ({ id: project.id, key: project.key, name: project.name }))
            }
          };
          
        case 'trello':
          // Test Trello connection by listing boards
          const trelloResponse = await fetch(`https://api.trello.com/1/members/me/boards?key=${config.key}&token=${config.token}`);
          
          if (!trelloResponse.ok) {
            throw new Error(`Trello API error: ${trelloResponse.statusText}`);
          }
          
          const trelloBoards = await trelloResponse.json();
          
          return {
            success: true,
            message: `Successfully connected to Trello. Found ${trelloBoards.length} boards.`,
            details: {
              boards: trelloBoards.map((board: any) => ({ id: board.id, name: board.name }))
            }
          };
          
        case 'google':
          // Test Google connection by creating OAuth client
          const { google } = require('googleapis');
          const oauth2Client = new google.auth.OAuth2(
            config.clientId,
            config.clientSecret,
            'https://developers.google.com/oauthplayground'
          );
          
          oauth2Client.setCredentials({
            refresh_token: config.refreshToken
          });
          
          // Get user info
          const oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
          });
          
          const userInfo = await oauth2.userinfo.get();
          
          return {
            success: true,
            message: `Successfully connected to Google Workspace as ${userInfo.data.email}.`,
            details: {
              user: {
                email: userInfo.data.email,
                name: userInfo.data.name
              }
            }
          };
          
        default:
          return {
            success: false,
            message: `Unsupported integration type: ${type}`
          };
      }
    } catch (error) {
      console.error(`Error testing integration:`, error);
      
      return {
        success: false,
        message: `Failed to connect: ${error.message || 'Unknown error'}`
      };
    }
  }
  
  /**
   * Extract data from integration
   */
  async extractData(
    userId: number,
    type: string,
    options: any
  ): Promise<any> {
    try {
      switch (type) {
        case 'slack':
          return slackIntegrationService.extractMessages(userId, options);
          
        case 'github':
        case 'gitlab':
          return gitIntegrationService.extractRepositoryData(userId, {
            provider: type as any,
            ...options
          });
          
        case 'jira':
        case 'trello':
          return taskManagementIntegrationService.extractTaskData(userId, {
            provider: type as any,
            ...options
          });
          
        case 'google':
          return googleWorkspaceIntegrationService.extractGoogleWorkspaceData(userId, options);
          
        default:
          throw new Error(`Unsupported integration type: ${type}`);
      }
    } catch (error) {
      console.error(`Error extracting data from ${type} integration:`, error);
      throw error;
    }
  }
}

// Create instance
export const integrationManager = new IntegrationManager();