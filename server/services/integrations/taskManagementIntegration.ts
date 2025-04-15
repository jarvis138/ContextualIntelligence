/**
 * Task Management Integration Service
 * 
 * Provides integration with Jira and Trello APIs for retrieving project/board data,
 * issues/cards, and other data from task management systems.
 */

import axios from 'axios';
import { storage } from '../../storage';
import { User, Integration, InsertActivity } from '@shared/schema';
import { pipeline, createStage } from '../../utils/pipeline';

// Task management provider types
export type TaskProvider = 'jira' | 'trello';

/**
 * Task project/board structure
 */
export interface TaskProject {
  id: string;
  provider: TaskProvider;
  name: string;
  key?: string;
  description?: string;
  url?: string;
  createdAt?: Date;
  updatedAt?: Date;
  type?: string;
  category?: string;
  isArchived?: boolean;
  owner?: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
  };
}

/**
 * Task board column/list structure
 */
export interface TaskColumn {
  id: string;
  provider: TaskProvider;
  name: string;
  projectId: string;
  position: number;
  createdAt?: Date;
  updatedAt?: Date;
  cardCount?: number;
  isArchived?: boolean;
}

/**
 * Task card/issue structure
 */
export interface TaskCard {
  id: string;
  provider: TaskProvider;
  key?: string;
  title: string;
  description?: string;
  url?: string;
  projectId: string;
  columnId?: string;
  position?: number;
  createdAt?: Date;
  updatedAt?: Date;
  dueDate?: Date;
  startDate?: Date;
  completedAt?: Date;
  status?: string;
  priority?: string;
  estimate?: number;
  isArchived?: boolean;
  labels?: string[];
  assignees?: {
    id: string;
    name: string;
    avatarUrl?: string;
  }[];
  creator?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  comments?: {
    id: string;
    text: string;
    createdAt: Date;
    author: {
      id: string;
      name: string;
      avatarUrl?: string;
    };
  }[];
  attachments?: {
    id: string;
    name: string;
    url?: string;
    size?: number;
    mimeType?: string;
    createdAt?: Date;
  }[];
  customFields?: {
    id: string;
    name: string;
    type: string;
    value: any;
  }[];
}

/**
 * Task extraction options
 */
export interface TaskExtractionOptions {
  provider: TaskProvider;
  projects?: string[];
  startDate?: Date;
  endDate?: Date;
  includeArchivedProjects?: boolean;
  includeArchivedCards?: boolean;
  includeComments?: boolean;
  includeAttachments?: boolean;
  limit?: number;
  linkToProjects?: number[];
}

/**
 * Jira specific API client
 */
class JiraClient {
  private baseUrl: string;
  
  constructor(private email: string, private token: string, private domain: string) {
    this.baseUrl = `https://${domain}.atlassian.net/rest/api/3`;
  }
  
  /**
   * Create request headers and auth
   */
  private getAuth() {
    return {
      auth: {
        username: this.email,
        password: this.token
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
  }
  
  /**
   * Get accessible projects
   */
  async getProjects(limit = 100): Promise<TaskProject[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/project`, {
        ...this.getAuth(),
        params: {
          maxResults: limit
        }
      });
      
      return response.data.map((project: any) => this.mapProject(project));
    } catch (error) {
      console.error('Error getting Jira projects:', error);
      throw error;
    }
  }
  
  /**
   * Get project by ID or key
   */
  async getProject(idOrKey: string): Promise<TaskProject> {
    try {
      const response = await axios.get(`${this.baseUrl}/project/${idOrKey}`, this.getAuth());
      return this.mapProject(response.data);
    } catch (error) {
      console.error(`Error getting Jira project ${idOrKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Get columns (statuses) for a project
   */
  async getColumns(projectIdOrKey: string): Promise<TaskColumn[]> {
    try {
      // Get project's status categories from its workflows
      const response = await axios.get(
        `${this.baseUrl}/project/${projectIdOrKey}/statuses`,
        this.getAuth()
      );
      
      // Flatten and map statuses from all issue types
      const columns: TaskColumn[] = [];
      
      response.data.forEach((issueType: any) => {
        let position = 0;
        
        issueType.statuses.forEach((status: any) => {
          // Check if we already have this status
          const existingColumn = columns.find(col => col.id === status.id);
          if (!existingColumn) {
            columns.push({
              id: status.id,
              provider: 'jira',
              name: status.name,
              projectId: projectIdOrKey,
              position: position++
            });
          }
        });
      });
      
      return columns;
    } catch (error) {
      console.error(`Error getting Jira columns for project ${projectIdOrKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Search for issues
   */
  async searchIssues(jql: string, options: {
    startAt?: number;
    maxResults?: number;
    fields?: string[];
    expand?: string[];
  } = {}): Promise<{
    issues: TaskCard[];
    total: number;
  }> {
    try {
      const defaultFields = [
        'summary',
        'description',
        'issuetype',
        'status',
        'assignee',
        'reporter',
        'priority',
        'labels',
        'created',
        'updated',
        'duedate',
        'comment',
        'attachment',
        'project'
      ];
      
      const response = await axios.post(
        `${this.baseUrl}/search`,
        {
          jql,
          startAt: options.startAt || 0,
          maxResults: options.maxResults || 100,
          fields: options.fields || defaultFields,
          expand: options.expand || ['renderedFields', 'names']
        },
        this.getAuth()
      );
      
      return {
        issues: response.data.issues.map((issue: any) => this.mapIssue(issue)),
        total: response.data.total
      };
    } catch (error) {
      console.error('Error searching Jira issues:', error);
      throw error;
    }
  }
  
  /**
   * Get issues for a project
   */
  async getIssues(
    projectIdOrKey: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      includeComments?: boolean;
      includeAttachments?: boolean;
    } = {}
  ): Promise<TaskCard[]> {
    try {
      // Build JQL query
      let jql = `project = ${projectIdOrKey}`;
      
      if (options.startDate) {
        jql += ` AND updated >= "${options.startDate.toISOString().split('T')[0]}"`;
      }
      
      if (options.endDate) {
        jql += ` AND updated <= "${options.endDate.toISOString().split('T')[0]}"`;
      }
      
      jql += ' ORDER BY updated DESC';
      
      // Add fields to request
      const fields = [
        'summary',
        'description',
        'issuetype',
        'status',
        'assignee',
        'reporter',
        'priority',
        'labels',
        'created',
        'updated',
        'duedate',
        'project'
      ];
      
      if (options.includeComments) {
        fields.push('comment');
      }
      
      if (options.includeAttachments) {
        fields.push('attachment');
      }
      
      // Paginate results if needed
      const maxResults = options.limit || 100;
      let startAt = 0;
      let totalIssues: TaskCard[] = [];
      let hasMore = true;
      
      while (hasMore) {
        const result = await this.searchIssues(jql, {
          startAt,
          maxResults,
          fields
        });
        
        totalIssues = totalIssues.concat(result.issues);
        
        // Check if we need to fetch more
        startAt += maxResults;
        hasMore = startAt < result.total && startAt < (options.limit || Infinity);
      }
      
      return totalIssues;
    } catch (error) {
      console.error(`Error getting Jira issues for project ${projectIdOrKey}:`, error);
      throw error;
    }
  }
  
  /**
   * Map Jira project to standard format
   */
  private mapProject(project: any): TaskProject {
    return {
      id: project.id,
      provider: 'jira',
      name: project.name,
      key: project.key,
      description: project.description,
      url: project.self,
      type: project.projectTypeKey,
      category: project.projectCategory?.name,
      isArchived: project.archived || false,
      owner: project.lead ? {
        id: project.lead.accountId,
        name: project.lead.displayName,
        email: project.lead.emailAddress,
        avatarUrl: project.lead.avatarUrls?.['48x48']
      } : undefined
    };
  }
  
  /**
   * Map Jira issue to standard format
   */
  private mapIssue(issue: any): TaskCard {
    const fields = issue.fields;
    
    const card: TaskCard = {
      id: issue.id,
      provider: 'jira',
      key: issue.key,
      title: fields.summary,
      description: fields.description,
      url: `https://${this.domain}.atlassian.net/browse/${issue.key}`,
      projectId: fields.project.id,
      status: fields.status?.name,
      priority: fields.priority?.name,
      createdAt: fields.created ? new Date(fields.created) : undefined,
      updatedAt: fields.updated ? new Date(fields.updated) : undefined,
      dueDate: fields.duedate ? new Date(fields.duedate) : undefined,
      isArchived: false,
      labels: fields.labels || [],
      creator: fields.reporter ? {
        id: fields.reporter.accountId,
        name: fields.reporter.displayName,
        avatarUrl: fields.reporter.avatarUrls?.['48x48']
      } : undefined
    };
    
    // Add assignees
    if (fields.assignee) {
      card.assignees = [{
        id: fields.assignee.accountId,
        name: fields.assignee.displayName,
        avatarUrl: fields.assignee.avatarUrls?.['48x48']
      }];
    }
    
    // Add comments
    if (fields.comment && fields.comment.comments) {
      card.comments = fields.comment.comments.map((comment: any) => ({
        id: comment.id,
        text: comment.body,
        createdAt: new Date(comment.created),
        author: {
          id: comment.author.accountId,
          name: comment.author.displayName,
          avatarUrl: comment.author.avatarUrls?.['48x48']
        }
      }));
    }
    
    // Add attachments
    if (fields.attachment && fields.attachment.length > 0) {
      card.attachments = fields.attachment.map((attachment: any) => ({
        id: attachment.id,
        name: attachment.filename,
        url: attachment.content,
        size: attachment.size,
        mimeType: attachment.mimeType,
        createdAt: new Date(attachment.created)
      }));
    }
    
    return card;
  }
}

/**
 * Trello specific API client
 */
class TrelloClient {
  private baseUrl = 'https://api.trello.com/1';
  
  constructor(private key: string, private token: string) {}
  
  /**
   * Create request parameters with auth
   */
  private getAuth() {
    return {
      key: this.key,
      token: this.token
    };
  }
  
  /**
   * Get boards
   */
  async getBoards(limit = 100): Promise<TaskProject[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/members/me/boards`, {
        params: {
          ...this.getAuth(),
          filter: 'open',
          fields: 'id,name,desc,url,dateLastActivity,closed,prefs',
          memberships: 'admins'
        }
      });
      
      return response.data.map((board: any) => this.mapBoard(board));
    } catch (error) {
      console.error('Error getting Trello boards:', error);
      throw error;
    }
  }
  
  /**
   * Get board by ID
   */
  async getBoard(id: string): Promise<TaskProject> {
    try {
      const response = await axios.get(`${this.baseUrl}/boards/${id}`, {
        params: {
          ...this.getAuth(),
          fields: 'id,name,desc,url,dateLastActivity,closed,prefs',
          memberships: 'admins'
        }
      });
      
      return this.mapBoard(response.data);
    } catch (error) {
      console.error(`Error getting Trello board ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get lists for a board
   */
  async getLists(boardId: string): Promise<TaskColumn[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/boards/${boardId}/lists`, {
        params: {
          ...this.getAuth(),
          cards: 'none',
          filter: 'all',
          fields: 'id,name,closed,pos'
        }
      });
      
      return response.data.map((list: any, index: number) => this.mapList(list, boardId, index));
    } catch (error) {
      console.error(`Error getting Trello lists for board ${boardId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get cards for a board
   */
  async getCards(
    boardId: string,
    options: {
      since?: string;
      before?: string;
      limit?: number;
      includeComments?: boolean;
      includeAttachments?: boolean;
    } = {}
  ): Promise<TaskCard[]> {
    try {
      const params: any = {
        ...this.getAuth(),
        fields: 'id,name,desc,idBoard,idList,dateLastActivity,due,start,closed,labels,idMembers,idMembersVoted,pos,shortUrl,cover,idAttachmentCover,attachments,members,checkItemStates'
      };
      
      if (options.since) {
        params.since = options.since;
      }
      
      if (options.before) {
        params.before = options.before;
      }
      
      if (options.limit) {
        params.limit = options.limit;
      }
      
      if (options.includeComments) {
        params.actions = 'commentCard';
      }
      
      if (options.includeAttachments) {
        params.attachments = true;
      }
      
      // Fetch members to resolve assignees
      const membersResponse = await axios.get(`${this.baseUrl}/boards/${boardId}/members`, {
        params: this.getAuth()
      });
      
      const members = membersResponse.data;
      
      // Fetch lists to resolve columns
      const lists = await this.getLists(boardId);
      
      // Fetch cards
      const response = await axios.get(`${this.baseUrl}/boards/${boardId}/cards`, {
        params
      });
      
      return response.data.map((card: any) => this.mapCard(card, lists, members));
    } catch (error) {
      console.error(`Error getting Trello cards for board ${boardId}:`, error);
      throw error;
    }
  }
  
  /**
   * Map Trello board to standard format
   */
  private mapBoard(board: any): TaskProject {
    // Find admin member
    let owner;
    if (board.memberships && board.memberships.length > 0) {
      const adminMembership = board.memberships.find((m: any) => m.memberType === 'admin');
      if (adminMembership) {
        owner = {
          id: adminMembership.idMember,
          name: adminMembership.fullName || adminMembership.username || 'Unknown',
        };
      }
    }
    
    return {
      id: board.id,
      provider: 'trello',
      name: board.name,
      description: board.desc,
      url: board.url,
      updatedAt: board.dateLastActivity ? new Date(board.dateLastActivity) : undefined,
      isArchived: board.closed,
      category: board.prefs?.permissionLevel,
      owner
    };
  }
  
  /**
   * Map Trello list to standard format
   */
  private mapList(list: any, boardId: string, position: number): TaskColumn {
    return {
      id: list.id,
      provider: 'trello',
      name: list.name,
      projectId: boardId,
      position: position,
      isArchived: list.closed
    };
  }
  
  /**
   * Map Trello card to standard format
   */
  private mapCard(card: any, lists: TaskColumn[], members: any[]): TaskCard {
    // Find list/column
    const column = lists.find(list => list.id === card.idList);
    
    // Map labels
    const labels = card.labels ? card.labels.map((label: any) => label.name || label.color) : [];
    
    // Map assignees
    const assignees = card.members ? card.members.map((member: any) => ({
      id: member.id,
      name: member.fullName || member.username,
      avatarUrl: member.avatarUrl
    })) : [];
    
    // Find creator if available
    let creator;
    if (card.actions && card.actions.length > 0) {
      const createAction = card.actions.find((a: any) => a.type === 'createCard');
      if (createAction) {
        creator = {
          id: createAction.idMemberCreator,
          name: createAction.memberCreator.fullName || createAction.memberCreator.username
        };
      }
    }
    
    // Map comments
    let comments;
    if (card.actions) {
      comments = card.actions
        .filter((action: any) => action.type === 'commentCard')
        .map((action: any) => ({
          id: action.id,
          text: action.data.text,
          createdAt: new Date(action.date),
          author: {
            id: action.idMemberCreator,
            name: action.memberCreator.fullName || action.memberCreator.username,
            avatarUrl: action.memberCreator.avatarURL
          }
        }));
    }
    
    // Map attachments
    let attachments;
    if (card.attachments) {
      attachments = card.attachments.map((attachment: any) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
        size: attachment.bytes,
        mimeType: attachment.mimeType,
        createdAt: new Date(attachment.date)
      }));
    }
    
    return {
      id: card.id,
      provider: 'trello',
      title: card.name,
      description: card.desc,
      url: card.shortUrl,
      projectId: card.idBoard,
      columnId: card.idList,
      status: column?.name,
      position: card.pos,
      createdAt: undefined,  // Not directly available
      updatedAt: card.dateLastActivity ? new Date(card.dateLastActivity) : undefined,
      dueDate: card.due ? new Date(card.due) : undefined,
      startDate: card.start ? new Date(card.start) : undefined,
      isArchived: card.closed,
      labels,
      assignees,
      creator,
      comments,
      attachments
    };
  }
}

/**
 * Main Task Management Integration Service
 */
export class TaskManagementIntegrationService {
  private jiraClients: Map<number, JiraClient> = new Map();
  private trelloClients: Map<number, TrelloClient> = new Map();
  
  /**
   * Initialize the appropriate task management client for a user
   */
  async initializeClient(
    userId: number,
    provider: TaskProvider
  ): Promise<JiraClient | TrelloClient | null> {
    try {
      // Check if client already exists
      if (provider === 'jira' && this.jiraClients.has(userId)) {
        return this.jiraClients.get(userId)!;
      }
      
      if (provider === 'trello' && this.trelloClients.has(userId)) {
        return this.trelloClients.get(userId)!;
      }
      
      // Get task management integration for user
      const integration = await this.getUserIntegration(userId, provider);
      if (!integration) {
        return null;
      }
      
      // Create appropriate client
      let client;
      if (provider === 'jira') {
        const config = integration.config || {};
        const email = config.email as string;
        const token = config.token as string;
        const domain = config.domain as string;
        
        if (!email || !token || !domain) {
          throw new Error('Missing Jira configuration (email, token, or domain)');
        }
        
        client = new JiraClient(email, token, domain);
        this.jiraClients.set(userId, client);
      } else if (provider === 'trello') {
        const config = integration.config || {};
        const key = config.key as string;
        const token = config.token as string;
        
        if (!key || !token) {
          throw new Error('Missing Trello configuration (key or token)');
        }
        
        client = new TrelloClient(key, token);
        this.trelloClients.set(userId, client);
      } else {
        throw new Error(`Unsupported task management provider: ${provider}`);
      }
      
      return client;
    } catch (error) {
      console.error(`Error initializing ${provider} client for user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Get task management integration for a user
   */
  async getUserIntegration(
    userId: number,
    provider: TaskProvider
  ): Promise<Integration | undefined> {
    const integrations = await storage.getIntegrations(userId);
    return integrations.find(integration => integration.type === provider);
  }
  
  /**
   * Get projects/boards for a user from a specific task management provider
   */
  async getProjects(
    userId: number,
    provider: TaskProvider,
    limit?: number
  ): Promise<TaskProject[]> {
    const client = await this.initializeClient(userId, provider);
    if (!client) {
      throw new Error(`${provider} client not initialized`);
    }
    
    if (provider === 'jira') {
      return (client as JiraClient).getProjects(limit);
    } else if (provider === 'trello') {
      return (client as TrelloClient).getBoards(limit);
    }
    
    throw new Error(`Unsupported task management provider: ${provider}`);
  }
  
  /**
   * Get columns for a project/board
   */
  async getColumns(
    userId: number,
    provider: TaskProvider,
    projectId: string
  ): Promise<TaskColumn[]> {
    const client = await this.initializeClient(userId, provider);
    if (!client) {
      throw new Error(`${provider} client not initialized`);
    }
    
    if (provider === 'jira') {
      return (client as JiraClient).getColumns(projectId);
    } else if (provider === 'trello') {
      return (client as TrelloClient).getLists(projectId);
    }
    
    throw new Error(`Unsupported task management provider: ${provider}`);
  }
  
  /**
   * Extract task data for a user from a specific task management provider
   */
  async extractTaskData(
    userId: number,
    options: TaskExtractionOptions
  ): Promise<{
    projects: TaskProject[];
    columns: TaskColumn[];
    cards: TaskCard[];
    stats: {
      totalProjects: number;
      totalColumns: number;
      totalCards: number;
    };
  }> {
    const client = await this.initializeClient(userId, options.provider);
    if (!client) {
      throw new Error(`${options.provider} client not initialized`);
    }
    
    // Initialize stats
    const stats = {
      totalProjects: 0,
      totalColumns: 0,
      totalCards: 0
    };
    
    // Get projects if not specified
    let projects: TaskProject[] = [];
    if (options.projects && options.projects.length > 0) {
      // Fetch specified projects
      if (options.provider === 'jira') {
        projects = await Promise.all(
          options.projects.map(projectId => (client as JiraClient).getProject(projectId))
        );
      } else if (options.provider === 'trello') {
        projects = await Promise.all(
          options.projects.map(boardId => (client as TrelloClient).getBoard(boardId))
        );
      }
    } else {
      // Fetch all projects
      projects = await this.getProjects(userId, options.provider, options.limit);
    }
    
    // Filter out archived projects if requested
    if (!options.includeArchivedProjects) {
      projects = projects.filter(project => !project.isArchived);
    }
    
    stats.totalProjects = projects.length;
    
    // Extract columns and cards
    const allColumns: TaskColumn[] = [];
    const allCards: TaskCard[] = [];
    
    for (const project of projects) {
      // Get columns
      try {
        let columns: TaskColumn[] = [];
        
        if (options.provider === 'jira') {
          columns = await (client as JiraClient).getColumns(project.id);
        } else if (options.provider === 'trello') {
          columns = await (client as TrelloClient).getLists(project.id);
        }
        
        allColumns.push(...columns);
        stats.totalColumns += columns.length;
      } catch (error) {
        console.error(`Error getting columns for ${project.id}:`, error);
      }
      
      // Get cards
      try {
        let cards: TaskCard[] = [];
        
        if (options.provider === 'jira') {
          const cardOptions: any = {
            includeComments: options.includeComments,
            includeAttachments: options.includeAttachments,
            limit: options.limit
          };
          
          if (options.startDate) {
            cardOptions.startDate = options.startDate;
          }
          
          if (options.endDate) {
            cardOptions.endDate = options.endDate;
          }
          
          cards = await (client as JiraClient).getIssues(project.id, cardOptions);
        } else if (options.provider === 'trello') {
          const cardOptions: any = {
            includeComments: options.includeComments,
            includeAttachments: options.includeAttachments,
            limit: options.limit
          };
          
          if (options.startDate) {
            cardOptions.since = options.startDate.toISOString();
          }
          
          if (options.endDate) {
            cardOptions.before = options.endDate.toISOString();
          }
          
          cards = await (client as TrelloClient).getCards(project.id, cardOptions);
        }
        
        // Filter out archived cards if requested
        if (!options.includeArchivedCards) {
          cards = cards.filter(card => !card.isArchived);
        }
        
        allCards.push(...cards);
        stats.totalCards += cards.length;
      } catch (error) {
        console.error(`Error getting cards for ${project.id}:`, error);
      }
      
      // Short pause to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Create activities for projects if requested
    if (options.linkToProjects && options.linkToProjects.length > 0) {
      await this.createActivitiesForProjects(
        userId,
        projects,
        allCards,
        options.linkToProjects,
        options.provider
      );
    }
    
    return {
      projects,
      columns: allColumns,
      cards: allCards,
      stats
    };
  }
  
  /**
   * Create activities for projects based on task data
   */
  private async createActivitiesForProjects(
    userId: number,
    taskProjects: TaskProject[],
    cards: TaskCard[],
    projectIds: number[],
    provider: TaskProvider
  ): Promise<void> {
    // Skip if no task projects
    if (taskProjects.length === 0) {
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
          type: `${provider}_import`,
          userId: userId,
          projectId: projectId,
          description: `Imported ${taskProjects.length} ${provider} ${provider === 'jira' ? 'projects' : 'boards'} with ${cards.length} ${provider === 'jira' ? 'issues' : 'cards'}`,
          entityType: provider === 'jira' ? 'jira_project' : 'trello_board',
          entityId: null
        };
        
        await storage.createActivity(activity);
      }
    } catch (error) {
      console.error('Error creating activities for projects:', error);
    }
  }
  
  /**
   * Create a processing pipeline for task data extraction
   */
  createExtractionPipeline(userId: number, options: TaskExtractionOptions) {
    return pipeline(
      createStage('initialize', async () => {
        const client = await this.initializeClient(userId, options.provider);
        if (!client) {
          throw new Error('Failed to initialize task management client');
        }
        return {
          client,
          options,
          projects: [],
          columns: [],
          cards: [],
          stats: null
        };
      }),
      
      createStage('fetch-projects', async (context) => {
        context.projects = await this.getProjects(
          userId,
          options.provider,
          options.limit
        );
        return context;
      }),
      
      createStage('extract-data', async (context) => {
        const result = await this.extractTaskData(userId, options);
        context.columns = result.columns;
        context.cards = result.cards;
        context.stats = result.stats;
        return context;
      })
    );
  }
}

// Create instance
export const taskManagementIntegrationService = new TaskManagementIntegrationService();