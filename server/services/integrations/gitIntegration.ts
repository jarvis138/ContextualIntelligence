/**
 * Git Integration Service
 * 
 * Provides integration with GitHub and GitLab APIs for retrieving repository data,
 * issues, pull requests, and other data from Git-based code repositories.
 */

import axios from 'axios';
import { storage } from '../../storage';
import { User, Integration, InsertActivity } from '@shared/schema';
import { pipeline, createStage } from '../../utils/pipeline';

// Git provider types
export type GitProvider = 'github' | 'gitlab';

/**
 * Repository structure
 */
export interface Repository {
  id: string;
  provider: GitProvider;
  name: string;
  fullName: string;
  owner: string;
  description: string;
  url: string;
  cloneUrl: string;
  defaultBranch: string;
  private: boolean;
  fork: boolean;
  createdAt: Date;
  updatedAt: Date;
  stars: number;
  watchers: number;
  forks: number;
  openIssues: number;
  language: string;
  topics: string[];
  license?: string;
}

/**
 * Git issue structure
 */
export interface GitIssue {
  id: string;
  provider: GitProvider;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  repository: {
    id: string;
    name: string;
    fullName: string;
  };
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  labels: string[];
  assignees: {
    id: string;
    username: string;
    avatarUrl?: string;
  }[];
  milestone?: {
    id: string;
    title: string;
    description?: string;
    dueOn?: Date;
  };
  comments: number;
  pullRequest?: {
    url: string;
    mergedAt?: Date;
  };
}

/**
 * Git pull request structure
 */
export interface GitPullRequest {
  id: string;
  provider: GitProvider;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  user: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  repository: {
    id: string;
    name: string;
    fullName: string;
  };
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  mergedAt?: Date;
  labels: string[];
  assignees: {
    id: string;
    username: string;
    avatarUrl?: string;
  }[];
  requestedReviewers: {
    id: string;
    username: string;
    avatarUrl?: string;
  }[];
  milestone?: {
    id: string;
    title: string;
    description?: string;
    dueOn?: Date;
  };
  comments: number;
  reviewComments: number;
  additions: number;
  deletions: number;
  changedFiles: number;
  baseBranch: string;
  headBranch: string;
  isDraft: boolean;
}

/**
 * Git commit structure
 */
export interface GitCommit {
  id: string;
  provider: GitProvider;
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: Date;
    username?: string;
  };
  committer: {
    name: string;
    email: string;
    date: Date;
    username?: string;
  };
  repository: {
    id: string;
    name: string;
    fullName: string;
  };
  url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  parentShas: string[];
}

/**
 * Git extraction options
 */
export interface GitExtractionOptions {
  provider: GitProvider;
  repositories?: string[];
  startDate?: Date;
  endDate?: Date;
  includeIssues?: boolean;
  includePullRequests?: boolean;
  includeCommits?: boolean;
  limit?: number;
  linkToProjects?: number[];
}

/**
 * GitHub specific API client
 */
class GitHubClient {
  private baseUrl = 'https://api.github.com';
  
  constructor(private token: string) {}
  
  /**
   * Create request headers
   */
  private getHeaders() {
    return {
      'Authorization': `token ${this.token}`,
      'Accept': 'application/vnd.github.v3+json'
    };
  }
  
  /**
   * Get user repositories
   */
  async getRepositories(limit = 100): Promise<Repository[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/user/repos`, {
        headers: this.getHeaders(),
        params: {
          per_page: limit,
          sort: 'updated',
          direction: 'desc'
        }
      });
      
      return response.data.map((repo: any) => this.mapRepository(repo));
    } catch (error) {
      console.error('Error getting GitHub repositories:', error);
      throw error;
    }
  }
  
  /**
   * Get repository by full name (owner/repo)
   */
  async getRepository(fullName: string): Promise<Repository> {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${fullName}`, {
        headers: this.getHeaders()
      });
      
      return this.mapRepository(response.data);
    } catch (error) {
      console.error(`Error getting GitHub repository ${fullName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get repository issues
   */
  async getIssues(fullName: string, options: {
    state?: 'open' | 'closed' | 'all';
    since?: string;
    limit?: number;
  } = {}): Promise<GitIssue[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${fullName}/issues`, {
        headers: this.getHeaders(),
        params: {
          state: options.state || 'all',
          since: options.since,
          per_page: options.limit || 100,
          sort: 'updated',
          direction: 'desc'
        }
      });
      
      return response.data.map((issue: any) => this.mapIssue(issue, fullName));
    } catch (error) {
      console.error(`Error getting GitHub issues for ${fullName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get repository pull requests
   */
  async getPullRequests(fullName: string, options: {
    state?: 'open' | 'closed' | 'all';
    since?: string;
    limit?: number;
  } = {}): Promise<GitPullRequest[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${fullName}/pulls`, {
        headers: this.getHeaders(),
        params: {
          state: options.state || 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: options.limit || 100
        }
      });
      
      // Fetch detailed PR data for each PR
      const prs = await Promise.all(
        response.data.map(async (pr: any) => {
          // Get detailed PR data
          const detailResponse = await axios.get(`${this.baseUrl}/repos/${fullName}/pulls/${pr.number}`, {
            headers: this.getHeaders()
          });
          
          return this.mapPullRequest(detailResponse.data, fullName);
        })
      );
      
      return prs;
    } catch (error) {
      console.error(`Error getting GitHub pull requests for ${fullName}:`, error);
      throw error;
    }
  }
  
  /**
   * Get repository commits
   */
  async getCommits(fullName: string, options: {
    since?: string;
    until?: string;
    path?: string;
    limit?: number;
  } = {}): Promise<GitCommit[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/repos/${fullName}/commits`, {
        headers: this.getHeaders(),
        params: {
          since: options.since,
          until: options.until,
          path: options.path,
          per_page: options.limit || 100
        }
      });
      
      const commits = await Promise.all(
        response.data.map(async (commit: any) => {
          // Get detailed commit data
          const detailResponse = await axios.get(`${this.baseUrl}/repos/${fullName}/commits/${commit.sha}`, {
            headers: this.getHeaders()
          });
          
          return this.mapCommit(detailResponse.data, fullName);
        })
      );
      
      return commits;
    } catch (error) {
      console.error(`Error getting GitHub commits for ${fullName}:`, error);
      throw error;
    }
  }
  
  /**
   * Map GitHub repository format to standard format
   */
  private mapRepository(repo: any): Repository {
    return {
      id: repo.id.toString(),
      provider: 'github',
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login || '',
      description: repo.description || '',
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
      private: repo.private,
      fork: repo.fork,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.updated_at),
      stars: repo.stargazers_count,
      watchers: repo.watchers_count,
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      language: repo.language || '',
      topics: repo.topics || [],
      license: repo.license?.name
    };
  }
  
  /**
   * Map GitHub issue format to standard format
   */
  private mapIssue(issue: any, repoFullName: string): GitIssue {
    const [owner, repoName] = repoFullName.split('/');
    
    return {
      id: issue.id.toString(),
      provider: 'github',
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state,
      user: {
        id: issue.user?.id?.toString() || '',
        username: issue.user?.login || '',
        avatarUrl: issue.user?.avatar_url
      },
      repository: {
        id: '',  // Not available in the issue response
        name: repoName,
        fullName: repoFullName
      },
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      labels: issue.labels ? issue.labels.map((label: any) => label.name) : [],
      assignees: issue.assignees ? issue.assignees.map((assignee: any) => ({
        id: assignee.id.toString(),
        username: assignee.login,
        avatarUrl: assignee.avatar_url
      })) : [],
      milestone: issue.milestone ? {
        id: issue.milestone.id.toString(),
        title: issue.milestone.title,
        description: issue.milestone.description,
        dueOn: issue.milestone.due_on ? new Date(issue.milestone.due_on) : undefined
      } : undefined,
      comments: issue.comments,
      pullRequest: issue.pull_request ? {
        url: issue.pull_request.html_url,
        mergedAt: undefined  // Not available in the issue response
      } : undefined
    };
  }
  
  /**
   * Map GitHub pull request format to standard format
   */
  private mapPullRequest(pr: any, repoFullName: string): GitPullRequest {
    const [owner, repoName] = repoFullName.split('/');
    
    return {
      id: pr.id.toString(),
      provider: 'github',
      number: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.merged_at ? 'merged' : pr.state,
      user: {
        id: pr.user?.id?.toString() || '',
        username: pr.user?.login || '',
        avatarUrl: pr.user?.avatar_url
      },
      repository: {
        id: pr.base?.repo?.id?.toString() || '',
        name: repoName,
        fullName: repoFullName
      },
      createdAt: new Date(pr.created_at),
      updatedAt: new Date(pr.updated_at),
      closedAt: pr.closed_at ? new Date(pr.closed_at) : undefined,
      mergedAt: pr.merged_at ? new Date(pr.merged_at) : undefined,
      labels: pr.labels ? pr.labels.map((label: any) => label.name) : [],
      assignees: pr.assignees ? pr.assignees.map((assignee: any) => ({
        id: assignee.id.toString(),
        username: assignee.login,
        avatarUrl: assignee.avatar_url
      })) : [],
      requestedReviewers: pr.requested_reviewers ? pr.requested_reviewers.map((reviewer: any) => ({
        id: reviewer.id.toString(),
        username: reviewer.login,
        avatarUrl: reviewer.avatar_url
      })) : [],
      milestone: pr.milestone ? {
        id: pr.milestone.id.toString(),
        title: pr.milestone.title,
        description: pr.milestone.description,
        dueOn: pr.milestone.due_on ? new Date(pr.milestone.due_on) : undefined
      } : undefined,
      comments: pr.comments,
      reviewComments: pr.review_comments,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      baseBranch: pr.base?.ref || '',
      headBranch: pr.head?.ref || '',
      isDraft: pr.draft || false
    };
  }
  
  /**
   * Map GitHub commit format to standard format
   */
  private mapCommit(commit: any, repoFullName: string): GitCommit {
    const [owner, repoName] = repoFullName.split('/');
    
    return {
      id: commit.sha,
      provider: 'github',
      sha: commit.sha,
      message: commit.commit?.message || '',
      author: {
        name: commit.commit?.author?.name || '',
        email: commit.commit?.author?.email || '',
        date: new Date(commit.commit?.author?.date),
        username: commit.author?.login
      },
      committer: {
        name: commit.commit?.committer?.name || '',
        email: commit.commit?.committer?.email || '',
        date: new Date(commit.commit?.committer?.date),
        username: commit.committer?.login
      },
      repository: {
        id: '',  // Not available in the commit response
        name: repoName,
        fullName: repoFullName
      },
      url: commit.html_url,
      stats: commit.stats ? {
        additions: commit.stats.additions,
        deletions: commit.stats.deletions,
        total: commit.stats.total
      } : undefined,
      parentShas: commit.parents ? commit.parents.map((parent: any) => parent.sha) : []
    };
  }
}

/**
 * GitLab specific API client
 */
class GitLabClient {
  private baseUrl = 'https://gitlab.com/api/v4';
  
  constructor(private token: string) {}
  
  /**
   * Create request headers
   */
  private getHeaders() {
    return {
      'PRIVATE-TOKEN': this.token
    };
  }
  
  /**
   * Get user repositories (projects in GitLab terminology)
   */
  async getRepositories(limit = 100): Promise<Repository[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/projects`, {
        headers: this.getHeaders(),
        params: {
          per_page: limit,
          order_by: 'updated_at',
          sort: 'desc',
          membership: true
        }
      });
      
      return response.data.map((repo: any) => this.mapRepository(repo));
    } catch (error) {
      console.error('Error getting GitLab projects:', error);
      throw error;
    }
  }
  
  /**
   * Get repository by ID or path (encoded path)
   */
  async getRepository(id: string): Promise<Repository> {
    try {
      const response = await axios.get(`${this.baseUrl}/projects/${encodeURIComponent(id)}`, {
        headers: this.getHeaders()
      });
      
      return this.mapRepository(response.data);
    } catch (error) {
      console.error(`Error getting GitLab project ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get repository issues
   */
  async getIssues(id: string, options: {
    state?: 'opened' | 'closed' | 'all';
    updatedAfter?: string;
    limit?: number;
  } = {}): Promise<GitIssue[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/projects/${encodeURIComponent(id)}/issues`, {
        headers: this.getHeaders(),
        params: {
          state: options.state || 'all',
          updated_after: options.updatedAfter,
          per_page: options.limit || 100,
          order_by: 'updated_at',
          sort: 'desc'
        }
      });
      
      return response.data.map((issue: any) => this.mapIssue(issue, id));
    } catch (error) {
      console.error(`Error getting GitLab issues for ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get repository merge requests (equivalent to pull requests)
   */
  async getPullRequests(id: string, options: {
    state?: 'opened' | 'closed' | 'locked' | 'merged' | 'all';
    updatedAfter?: string;
    limit?: number;
  } = {}): Promise<GitPullRequest[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/projects/${encodeURIComponent(id)}/merge_requests`, {
        headers: this.getHeaders(),
        params: {
          state: options.state || 'all',
          updated_after: options.updatedAfter,
          per_page: options.limit || 100,
          order_by: 'updated_at',
          sort: 'desc'
        }
      });
      
      // Fetch detailed MR data for each MR
      const mrs = await Promise.all(
        response.data.map(async (mr: any) => {
          // Get detailed MR data
          const detailResponse = await axios.get(
            `${this.baseUrl}/projects/${encodeURIComponent(id)}/merge_requests/${mr.iid}`,
            { headers: this.getHeaders() }
          );
          
          return this.mapPullRequest(detailResponse.data, id);
        })
      );
      
      return mrs;
    } catch (error) {
      console.error(`Error getting GitLab merge requests for ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Get repository commits
   */
  async getCommits(id: string, options: {
    since?: string;
    until?: string;
    path?: string;
    limit?: number;
  } = {}): Promise<GitCommit[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/projects/${encodeURIComponent(id)}/repository/commits`, {
        headers: this.getHeaders(),
        params: {
          since: options.since,
          until: options.until,
          path: options.path,
          per_page: options.limit || 100
        }
      });
      
      const commits = await Promise.all(
        response.data.map(async (commit: any) => {
          // Get detailed commit data
          const detailResponse = await axios.get(
            `${this.baseUrl}/projects/${encodeURIComponent(id)}/repository/commits/${commit.id}`,
            { headers: this.getHeaders() }
          );
          
          return this.mapCommit(detailResponse.data, id);
        })
      );
      
      return commits;
    } catch (error) {
      console.error(`Error getting GitLab commits for ${id}:`, error);
      throw error;
    }
  }
  
  /**
   * Map GitLab repository format to standard format
   */
  private mapRepository(repo: any): Repository {
    return {
      id: repo.id.toString(),
      provider: 'gitlab',
      name: repo.name,
      fullName: repo.path_with_namespace,
      owner: repo.namespace?.name || '',
      description: repo.description || '',
      url: repo.web_url,
      cloneUrl: repo.http_url_to_repo,
      defaultBranch: repo.default_branch,
      private: !repo.public,
      fork: repo.forked_from_project !== null,
      createdAt: new Date(repo.created_at),
      updatedAt: new Date(repo.last_activity_at),
      stars: repo.star_count,
      watchers: 0,  // Not available in GitLab
      forks: repo.forks_count,
      openIssues: repo.open_issues_count,
      language: '',  // Not directly available in GitLab API
      topics: repo.topics || [],
      license: repo.license?.name
    };
  }
  
  /**
   * Map GitLab issue format to standard format
   */
  private mapIssue(issue: any, repoId: string): GitIssue {
    const repoName = issue.references?.full?.split('!')[0] || '';
    
    return {
      id: issue.id.toString(),
      provider: 'gitlab',
      number: issue.iid,
      title: issue.title,
      body: issue.description || '',
      state: issue.state === 'opened' ? 'open' : 'closed',
      user: {
        id: issue.author?.id?.toString() || '',
        username: issue.author?.username || '',
        avatarUrl: issue.author?.avatar_url
      },
      repository: {
        id: repoId,
        name: issue.project_id.toString(),
        fullName: repoName
      },
      createdAt: new Date(issue.created_at),
      updatedAt: new Date(issue.updated_at),
      closedAt: issue.closed_at ? new Date(issue.closed_at) : undefined,
      labels: issue.labels || [],
      assignees: issue.assignees ? issue.assignees.map((assignee: any) => ({
        id: assignee.id.toString(),
        username: assignee.username,
        avatarUrl: assignee.avatar_url
      })) : [],
      milestone: issue.milestone ? {
        id: issue.milestone.id.toString(),
        title: issue.milestone.title,
        description: issue.milestone.description,
        dueOn: issue.milestone.due_date ? new Date(issue.milestone.due_date) : undefined
      } : undefined,
      comments: 0  // Not directly available in GitLab API
    };
  }
  
  /**
   * Map GitLab merge request format to standard format
   */
  private mapPullRequest(mr: any, repoId: string): GitPullRequest {
    return {
      id: mr.id.toString(),
      provider: 'gitlab',
      number: mr.iid,
      title: mr.title,
      body: mr.description || '',
      state: mr.state === 'merged' ? 'merged' : (mr.state === 'opened' ? 'open' : 'closed'),
      user: {
        id: mr.author?.id?.toString() || '',
        username: mr.author?.username || '',
        avatarUrl: mr.author?.avatar_url
      },
      repository: {
        id: repoId,
        name: mr.project_id.toString(),
        fullName: mr.references?.full?.split('!')[0] || ''
      },
      createdAt: new Date(mr.created_at),
      updatedAt: new Date(mr.updated_at),
      closedAt: mr.closed_at ? new Date(mr.closed_at) : undefined,
      mergedAt: mr.merged_at ? new Date(mr.merged_at) : undefined,
      labels: mr.labels || [],
      assignees: mr.assignees ? mr.assignees.map((assignee: any) => ({
        id: assignee.id.toString(),
        username: assignee.username,
        avatarUrl: assignee.avatar_url
      })) : [],
      requestedReviewers: mr.reviewers ? mr.reviewers.map((reviewer: any) => ({
        id: reviewer.id.toString(),
        username: reviewer.username,
        avatarUrl: reviewer.avatar_url
      })) : [],
      milestone: mr.milestone ? {
        id: mr.milestone.id.toString(),
        title: mr.milestone.title,
        description: mr.milestone.description,
        dueOn: mr.milestone.due_date ? new Date(mr.milestone.due_date) : undefined
      } : undefined,
      comments: mr.user_notes_count || 0,
      reviewComments: 0,  // Not directly available in GitLab API
      additions: 0,  // Not directly available in GitLab API
      deletions: 0,  // Not directly available in GitLab API
      changedFiles: 0,  // Not directly available in GitLab API
      baseBranch: mr.target_branch || '',
      headBranch: mr.source_branch || '',
      isDraft: mr.work_in_progress || false
    };
  }
  
  /**
   * Map GitLab commit format to standard format
   */
  private mapCommit(commit: any, repoId: string): GitCommit {
    // Repository name is not directly available from the commit in GitLab
    const repoName = '';
    
    return {
      id: commit.id,
      provider: 'gitlab',
      sha: commit.id,
      message: commit.message || '',
      author: {
        name: commit.author_name || '',
        email: commit.author_email || '',
        date: new Date(commit.authored_date),
        username: ''  // Not directly available in GitLab API
      },
      committer: {
        name: commit.committer_name || '',
        email: commit.committer_email || '',
        date: new Date(commit.committed_date),
        username: ''  // Not directly available in GitLab API
      },
      repository: {
        id: repoId,
        name: repoName,
        fullName: repoName
      },
      url: commit.web_url,
      stats: commit.stats ? {
        additions: commit.stats.additions,
        deletions: commit.stats.deletions,
        total: commit.stats.total
      } : undefined,
      parentShas: commit.parent_ids || []
    };
  }
}

/**
 * Main Git Integration Service
 */
export class GitIntegrationService {
  private githubClients: Map<number, GitHubClient> = new Map();
  private gitlabClients: Map<number, GitLabClient> = new Map();
  
  /**
   * Initialize the appropriate Git client for a user
   */
  async initializeClient(
    userId: number,
    provider: GitProvider
  ): Promise<GitHubClient | GitLabClient | null> {
    try {
      // Check if client already exists
      if (provider === 'github' && this.githubClients.has(userId)) {
        return this.githubClients.get(userId)!;
      }
      
      if (provider === 'gitlab' && this.gitlabClients.has(userId)) {
        return this.gitlabClients.get(userId)!;
      }
      
      // Get Git integration for user
      const integration = await this.getUserIntegration(userId, provider);
      if (!integration) {
        return null;
      }
      
      // Create appropriate client
      const token = integration.config?.token as string;
      if (!token) {
        throw new Error(`${provider} token not found in integration config`);
      }
      
      let client;
      if (provider === 'github') {
        client = new GitHubClient(token);
        this.githubClients.set(userId, client);
      } else if (provider === 'gitlab') {
        client = new GitLabClient(token);
        this.gitlabClients.set(userId, client);
      } else {
        throw new Error(`Unsupported Git provider: ${provider}`);
      }
      
      return client;
    } catch (error) {
      console.error(`Error initializing ${provider} client for user ${userId}:`, error);
      return null;
    }
  }
  
  /**
   * Get Git integration for a user
   */
  async getUserIntegration(
    userId: number,
    provider: GitProvider
  ): Promise<Integration | undefined> {
    const integrations = await storage.getIntegrations(userId);
    return integrations.find(integration => integration.type === provider);
  }
  
  /**
   * Get repositories for a user from a specific Git provider
   */
  async getRepositories(
    userId: number,
    provider: GitProvider,
    limit?: number
  ): Promise<Repository[]> {
    const client = await this.initializeClient(userId, provider);
    if (!client) {
      throw new Error(`${provider} client not initialized`);
    }
    
    return client.getRepositories(limit);
  }
  
  /**
   * Extract repository data for a user from a specific Git provider
   */
  async extractRepositoryData(
    userId: number,
    options: GitExtractionOptions
  ): Promise<{
    repositories: Repository[];
    issues: GitIssue[];
    pullRequests: GitPullRequest[];
    commits: GitCommit[];
    stats: {
      totalRepositories: number;
      totalIssues: number;
      totalPullRequests: number;
      totalCommits: number;
    };
  }> {
    const client = await this.initializeClient(userId, options.provider);
    if (!client) {
      throw new Error(`${options.provider} client not initialized`);
    }
    
    // Initialize stats
    const stats = {
      totalRepositories: 0,
      totalIssues: 0,
      totalPullRequests: 0,
      totalCommits: 0
    };
    
    // Get repositories if not specified
    let repositories: Repository[] = [];
    if (options.repositories && options.repositories.length > 0) {
      // Fetch specified repositories
      repositories = await Promise.all(
        options.repositories.map(repo => client.getRepository(repo))
      );
    } else {
      // Fetch all repositories
      repositories = await client.getRepositories(options.limit);
    }
    
    stats.totalRepositories = repositories.length;
    
    // Extract issues, pull requests, and commits
    const issues: GitIssue[] = [];
    const pullRequests: GitPullRequest[] = [];
    const commits: GitCommit[] = [];
    
    for (const repo of repositories) {
      // Get issues if requested
      if (options.includeIssues) {
        try {
          const since = options.startDate ? options.startDate.toISOString() : undefined;
          const repoIssues = await client.getIssues(
            repo.fullName,
            {
              state: 'all',
              since: since,
              limit: options.limit
            }
          );
          
          issues.push(...repoIssues);
          stats.totalIssues += repoIssues.length;
        } catch (error) {
          console.error(`Error getting issues for ${repo.fullName}:`, error);
        }
      }
      
      // Get pull requests if requested
      if (options.includePullRequests) {
        try {
          const repoOptions: any = {
            state: 'all',
            limit: options.limit
          };
          
          // Add date filters if applicable
          if (options.provider === 'github' && options.startDate) {
            repoOptions.since = options.startDate.toISOString();
          } else if (options.provider === 'gitlab' && options.startDate) {
            repoOptions.updatedAfter = options.startDate.toISOString();
          }
          
          const repoPullRequests = await client.getPullRequests(
            repo.fullName,
            repoOptions
          );
          
          pullRequests.push(...repoPullRequests);
          stats.totalPullRequests += repoPullRequests.length;
        } catch (error) {
          console.error(`Error getting pull requests for ${repo.fullName}:`, error);
        }
      }
      
      // Get commits if requested
      if (options.includeCommits) {
        try {
          const repoOptions: any = {
            limit: options.limit
          };
          
          if (options.startDate) {
            repoOptions.since = options.startDate.toISOString();
          }
          
          if (options.endDate) {
            repoOptions.until = options.endDate.toISOString();
          }
          
          const repoCommits = await client.getCommits(
            repo.fullName,
            repoOptions
          );
          
          commits.push(...repoCommits);
          stats.totalCommits += repoCommits.length;
        } catch (error) {
          console.error(`Error getting commits for ${repo.fullName}:`, error);
        }
      }
      
      // Short pause to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Create activities for projects if requested
    if (options.linkToProjects && options.linkToProjects.length > 0) {
      await this.createActivitiesForProjects(
        userId,
        repositories,
        issues,
        pullRequests,
        commits,
        options.linkToProjects,
        options.provider
      );
    }
    
    return {
      repositories,
      issues,
      pullRequests,
      commits,
      stats
    };
  }
  
  /**
   * Create activities for projects based on Git data
   */
  private async createActivitiesForProjects(
    userId: number,
    repositories: Repository[],
    issues: GitIssue[],
    pullRequests: GitPullRequest[],
    commits: GitCommit[],
    projectIds: number[],
    provider: GitProvider
  ): Promise<void> {
    // Skip if no repositories
    if (repositories.length === 0) {
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
          description: `Imported ${repositories.length} ${provider} repositories (${issues.length} issues, ${pullRequests.length} PRs, ${commits.length} commits)`,
          entityType: 'repository',
          entityId: null
        };
        
        await storage.createActivity(activity);
      }
    } catch (error) {
      console.error('Error creating activities for projects:', error);
    }
  }
  
  /**
   * Create a processing pipeline for Git data extraction
   */
  createExtractionPipeline(userId: number, options: GitExtractionOptions) {
    return pipeline(
      createStage('initialize', async () => {
        const client = await this.initializeClient(userId, options.provider);
        if (!client) {
          throw new Error('Failed to initialize Git client');
        }
        return {
          client,
          options,
          repositories: [],
          issues: [],
          pullRequests: [],
          commits: [],
          stats: null
        };
      }),
      
      createStage('fetch-repositories', async (context) => {
        context.repositories = await this.getRepositories(
          userId,
          options.provider,
          options.limit
        );
        return context;
      }),
      
      createStage('extract-data', async (context) => {
        const result = await this.extractRepositoryData(userId, options);
        context.issues = result.issues;
        context.pullRequests = result.pullRequests;
        context.commits = result.commits;
        context.stats = result.stats;
        return context;
      })
    );
  }
}

// Create instance
export const gitIntegrationService = new GitIntegrationService();