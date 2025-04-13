import { Client } from '@elastic/elasticsearch';
import { storage } from '../storage';

// Initialize Elasticsearch client
// In a production environment, you would read this from environment variables
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

// Index names
const INDICES = {
  PROJECTS: 'projects',
  DOCUMENTS: 'documents',
  TASKS: 'tasks',
  USERS: 'users',
  TEAMS: 'teams',
  CONVERSATIONS: 'conversations'
};

/**
 * Check if Elasticsearch is available and create indices if needed
 */
export async function initializeElasticsearch(): Promise<boolean> {
  try {
    // Check if the cluster is available
    await esClient.ping();
    console.log('Elasticsearch cluster is available');
    
    // Create indices if they don't exist
    await createIndices();
    
    return true;
  } catch (error: any) {
    console.error('Elasticsearch error:', error);
    return false;
  }
}

/**
 * Create required indices if they don't exist
 */
async function createIndices(): Promise<void> {
  try {
    // Create projects index
    const projectsExists = await esClient.indices.exists({ index: INDICES.PROJECTS });
    if (!projectsExists) {
      await esClient.indices.create({
        index: INDICES.PROJECTS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              name: { type: 'text' },
              description: { type: 'text' },
              status: { type: 'keyword' },
              progress: { type: 'integer' }
            }
          }
        }
      });
      console.log(`Created index: ${INDICES.PROJECTS}`);
    }
    
    // Create documents index
    const documentsExists = await esClient.indices.exists({ index: INDICES.DOCUMENTS });
    if (!documentsExists) {
      await esClient.indices.create({
        index: INDICES.DOCUMENTS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { type: 'text' },
              content: { type: 'text' },
              fileType: { type: 'keyword' },
              projectId: { type: 'integer' },
              createdBy: { type: 'integer' },
              updatedBy: { type: 'integer' }
            }
          }
        }
      });
      console.log(`Created index: ${INDICES.DOCUMENTS}`);
    }
    
    // Create tasks index
    const tasksExists = await esClient.indices.exists({ index: INDICES.TASKS });
    if (!tasksExists) {
      await esClient.indices.create({
        index: INDICES.TASKS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              title: { type: 'text' },
              description: { type: 'text' },
              status: { type: 'keyword' },
              projectId: { type: 'integer' },
              assigneeId: { type: 'integer' },
              teamId: { type: 'integer' }
            }
          }
        }
      });
      console.log(`Created index: ${INDICES.TASKS}`);
    }
    
    // Create users index
    const usersExists = await esClient.indices.exists({ index: INDICES.USERS });
    if (!usersExists) {
      await esClient.indices.create({
        index: INDICES.USERS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              username: { type: 'keyword' },
              fullName: { type: 'text' },
              email: { type: 'keyword' },
              role: { type: 'keyword' }
            }
          }
        }
      });
      console.log(`Created index: ${INDICES.USERS}`);
    }
    
    // Create teams index
    const teamsExists = await esClient.indices.exists({ index: INDICES.TEAMS });
    if (!teamsExists) {
      await esClient.indices.create({
        index: INDICES.TEAMS,
        body: {
          mappings: {
            properties: {
              id: { type: 'integer' },
              name: { type: 'text' },
              description: { type: 'text' },
              progress: { type: 'integer' }
            }
          }
        }
      });
      console.log(`Created index: ${INDICES.TEAMS}`);
    }
  } catch (error: any) {
    console.error('Error creating indices:', error);
    throw error;
  }
}

/**
 * Index a project in Elasticsearch
 */
export async function indexProject(project: any): Promise<boolean> {
  try {
    await esClient.index({
      index: INDICES.PROJECTS,
      id: project.id.toString(),
      document: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        progress: project.progress
      },
      refresh: true
    });
    
    return true;
  } catch (error: any) {
    console.error('Error indexing project:', error);
    return false;
  }
}

/**
 * Index a document in Elasticsearch
 */
export async function indexDocument(document: any): Promise<boolean> {
  try {
    await esClient.index({
      index: INDICES.DOCUMENTS,
      id: document.id.toString(),
      document: {
        id: document.id,
        title: document.title,
        content: document.content || '',
        fileType: document.fileType,
        projectId: document.projectId,
        createdBy: document.createdBy,
        updatedBy: document.updatedBy
      },
      refresh: true
    });
    
    return true;
  } catch (error: any) {
    console.error('Error indexing document:', error);
    return false;
  }
}

/**
 * Index a task in Elasticsearch
 */
export async function indexTask(task: any): Promise<boolean> {
  try {
    await esClient.index({
      index: INDICES.TASKS,
      id: task.id.toString(),
      document: {
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        projectId: task.projectId,
        assigneeId: task.assigneeId,
        teamId: task.teamId
      },
      refresh: true
    });
    
    return true;
  } catch (error: any) {
    console.error('Error indexing task:', error);
    return false;
  }
}

/**
 * Index a user in Elasticsearch
 */
export async function indexUser(user: any): Promise<boolean> {
  try {
    await esClient.index({
      index: INDICES.USERS,
      id: user.id.toString(),
      document: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      },
      refresh: true
    });
    
    return true;
  } catch (error: any) {
    console.error('Error indexing user:', error);
    return false;
  }
}

/**
 * Index a team in Elasticsearch
 */
export async function indexTeam(team: any): Promise<boolean> {
  try {
    await esClient.index({
      index: INDICES.TEAMS,
      id: team.id.toString(),
      document: {
        id: team.id,
        name: team.name,
        description: team.description || '',
        progress: team.progress
      },
      refresh: true
    });
    
    return true;
  } catch (error: any) {
    console.error('Error indexing team:', error);
    return false;
  }
}

/**
 * Index all data from storage
 */
export async function indexAllData(): Promise<{
  projects: number;
  documents: number;
  tasks: number;
  users: number;
  teams: number;
}> {
  try {
    // Get all data from storage
    const projects = await storage.getProjects();
    const users = await storage.getUsers();
    const teams = await storage.getTeams();
    
    // Index all projects
    let indexedProjects = 0;
    for (const project of projects) {
      const success = await indexProject(project);
      if (success) indexedProjects++;
      
      // Index documents and tasks for this project
      const documents = await storage.getDocuments(project.id);
      const tasks = await storage.getTasks(project.id);
      
      for (const document of documents) {
        await indexDocument(document);
      }
      
      for (const task of tasks) {
        await indexTask(task);
      }
    }
    
    // Index all users
    let indexedUsers = 0;
    for (const user of users) {
      const success = await indexUser(user);
      if (success) indexedUsers++;
    }
    
    // Index all teams
    let indexedTeams = 0;
    for (const team of teams) {
      const success = await indexTeam(team);
      if (success) indexedTeams++;
    }
    
    return {
      projects: indexedProjects,
      documents: documents.flat().length,
      tasks: tasks.flat().length,
      users: indexedUsers,
      teams: indexedTeams
    };
  } catch (error: any) {
    console.error('Error indexing all data:', error);
    return {
      projects: 0,
      documents: 0,
      tasks: 0,
      users: 0,
      teams: 0
    };
  }
}

/**
 * Perform global search across all indices
 */
export async function globalSearch(query: string, filters: any = {}): Promise<{
  projects: any[];
  documents: any[];
  tasks: any[];
  users: any[];
  teams: any[];
}> {
  try {
    // Prepare the search query with filters
    const searchQuery = {
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ['name^2', 'title^2', 'fullName^2', 'description', 'content'],
                fuzziness: 'AUTO'
              }
            }
          ],
          filter: [] as any[]
        }
      },
      highlight: {
        fields: {
          name: {},
          title: {},
          fullName: {},
          description: {},
          content: {}
        },
        pre_tags: ['<strong>'],
        post_tags: ['</strong>']
      }
    };
    
    // Add filters if they exist
    if (filters.projectId) {
      searchQuery.query.bool.filter.push({
        term: { projectId: filters.projectId }
      });
    }
    
    if (filters.status) {
      searchQuery.query.bool.filter.push({
        term: { status: filters.status }
      });
    }
    
    // Search each index separately
    const [projectsResult, documentsResult, tasksResult, usersResult, teamsResult] = await Promise.all([
      esClient.search({
        index: INDICES.PROJECTS,
        ...searchQuery,
        size: 10
      }).catch(() => ({ hits: { hits: [] } })),
      
      esClient.search({
        index: INDICES.DOCUMENTS,
        ...searchQuery,
        size: 10
      }).catch(() => ({ hits: { hits: [] } })),
      
      esClient.search({
        index: INDICES.TASKS,
        ...searchQuery,
        size: 10
      }).catch(() => ({ hits: { hits: [] } })),
      
      esClient.search({
        index: INDICES.USERS,
        ...searchQuery,
        size: 10
      }).catch(() => ({ hits: { hits: [] } })),
      
      esClient.search({
        index: INDICES.TEAMS,
        ...searchQuery,
        size: 10
      }).catch(() => ({ hits: { hits: [] } }))
    ]);
    
    // Process and format the results
    const formatResults = (hits: any[]) => hits.map(hit => {
      const source = hit._source;
      const highlights = hit.highlight || {};
      
      // Format highlights
      const getHighlight = (field: string) => {
        return highlights[field] ? highlights[field][0] : '';
      };
      
      return {
        ...source,
        highlights: {
          title: getHighlight('title') || getHighlight('name') || getHighlight('fullName') || '',
          description: getHighlight('description') || getHighlight('content') || ''
        }
      };
    });
    
    return {
      projects: formatResults(projectsResult.hits.hits || []),
      documents: formatResults(documentsResult.hits.hits || []),
      tasks: formatResults(tasksResult.hits.hits || []),
      users: formatResults(usersResult.hits.hits || []),
      teams: formatResults(teamsResult.hits.hits || [])
    };
  } catch (error: any) {
    console.error('Error performing global search:', error);
    
    // Return empty results on error
    return {
      projects: [],
      documents: [],
      tasks: [],
      users: [],
      teams: []
    };
  }
}

/**
 * Check if Elasticsearch is available
 */
export async function isElasticsearchAvailable(): Promise<boolean> {
  try {
    await esClient.ping();
    return true;
  } catch (error) {
    console.warn('Elasticsearch is not available:', error);
    return false;
  }
}

/**
 * Perform hybrid search using both Elasticsearch and semantic search
 */
export async function hybridSearch(query: string, projectId?: number): Promise<{
  projects: any[];
  documents: any[];
  tasks: any[];
  users: any[];
  teams: any[];
  semanticResults: any[];
}> {
  try {
    // Create filters if projectId is provided
    const filters = projectId ? { projectId } : {};
    
    // Get Elasticsearch results
    const elasticsearchResults = await globalSearch(query, filters);
    
    // Get semantic search results if projectId is provided
    let semanticResults: any[] = [];
    
    if (projectId) {
      try {
        // Import dynamically to avoid circular dependency
        const { semanticSearch } = await import('./nlp');
        const results = await semanticSearch(projectId, query);
        semanticResults = results;
      } catch (error) {
        console.error('Error performing semantic search:', error);
      }
    }
    
    return {
      ...elasticsearchResults,
      semanticResults
    };
  } catch (error: any) {
    console.error('Error performing hybrid search:', error);
    
    // Return empty results on error
    return {
      projects: [],
      documents: [],
      tasks: [],
      users: [],
      teams: [],
      semanticResults: []
    };
  }
}