import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Elasticsearch client
const createClient = () => {
  const options: any = {
    node: config.elasticsearch.url
  };

  // Add authentication if provided
  if (config.elasticsearch.username && config.elasticsearch.password) {
    options.auth = {
      username: config.elasticsearch.username,
      password: config.elasticsearch.password
    };
  }

  return new Client(options);
};

// Elasticsearch client instance
export const esClient = createClient();

// Setup Elasticsearch indices and mappings
export const setupElasticsearch = async () => {
  try {
    logger.info('Setting up Elasticsearch');

    // Check if Elasticsearch is available
    const health = await esClient.cluster.health();
    logger.info('Elasticsearch cluster health', { status: health.status });

    // Create document index if it doesn't exist
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    const documentIndexExists = await esClient.indices.exists({ index: documentIndexName });

    if (!documentIndexExists) {
      logger.info(`Creating index: ${documentIndexName}`);
      
      await esClient.indices.create({
        index: documentIndexName,
        body: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                content_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              tenantId: { type: 'keyword' },
              title: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              content: { 
                type: 'text',
                analyzer: 'content_analyzer'
              },
              fileType: { type: 'keyword' },
              mimeType: { type: 'keyword' },
              tags: { type: 'keyword' },
              metadata: { type: 'object' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              createdBy: { type: 'keyword' },
              folderId: { type: 'keyword' },
              path: { type: 'keyword' }
            }
          }
        }
      });
    }

    logger.info('Elasticsearch setup completed');
  } catch (error) {
    logger.error('Failed to setup Elasticsearch', { error });
    throw error;
  }
};

// Index a document
export const indexDocument = async (document: any) => {
  try {
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    
    await esClient.index({
      index: documentIndexName,
      id: document.id.toString(),
      document: {
        id: document.id,
        tenantId: document.tenantId,
        title: document.title,
        content: document.content,
        fileType: document.fileType,
        mimeType: document.mimeType,
        tags: document.tags,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        createdBy: document.createdBy,
        folderId: document.folderId,
        path: document.path
      },
      refresh: true
    });
    
    logger.info(`Document indexed: ${document.id}`);
  } catch (error) {
    logger.error(`Failed to index document: ${document.id}`, { error });
    throw error;
  }
};

// Search documents
export const searchDocuments = async (params: {
  tenantId: string | number;
  query: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  try {
    const { 
      tenantId, 
      query, 
      filters = {}, 
      page = 1, 
      limit = 10,
      sortField = 'updatedAt',
      sortOrder = 'desc'
    } = params;
    
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    
    // Build query
    const must: any[] = [
      { term: { tenantId: tenantId.toString() } }
    ];
    
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'content', 'tags^2'],
          fuzziness: 'AUTO'
        }
      });
    }
    
    // Add filters
    const filter: any[] = [];
    
    if (filters.fileType) {
      filter.push({ term: { fileType: filters.fileType } });
    }
    
    if (filters.folderId) {
      filter.push({ term: { folderId: filters.folderId } });
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filter.push({ terms: { tags: filters.tags } });
    }
    
    if (filters.createdBy) {
      filter.push({ term: { createdBy: filters.createdBy } });
    }
    
    if (filters.dateFrom || filters.dateTo) {
      const range: any = {};
      
      if (filters.dateFrom) {
        range.gte = filters.dateFrom;
      }
      
      if (filters.dateTo) {
        range.lte = filters.dateTo;
      }
      
      filter.push({ range: { createdAt: range } });
    }
    
    // Execute search
    const result = await esClient.search({
      index: documentIndexName,
      body: {
        query: {
          bool: {
            must,
            filter
          }
        },
        sort: [
          { [sortField]: { order: sortOrder } }
        ],
        from: (page - 1) * limit,
        size: limit,
        highlight: {
          fields: {
            content: { 
              fragment_size: 150,
              number_of_fragments: 3,
              pre_tags: ['<strong>'],
              post_tags: ['</strong>']
            },
            title: {
              fragment_size: 150,
              number_of_fragments: 1,
              pre_tags: ['<strong>'],
              post_tags: ['</strong>']
            }
          }
        }
      }
    });
    
    // Format results
    const hits = result.hits.hits.map(hit => ({
      id: hit._source.id,
      title: hit._source.title,
      fileType: hit._source.fileType,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt,
      createdBy: hit._source.createdBy,
      folderId: hit._source.folderId,
      tags: hit._source.tags,
      highlights: hit.highlight,
      score: hit._score
    }));
    
    return {
      hits,
      total: result.hits.total.value,
      page,
      limit,
      totalPages: Math.ceil(result.hits.total.value / limit)
    };
  } catch (error) {
    logger.error('Search documents error', { error });
    throw error;
  }
};

// Delete document from index
export const deleteDocument = async (documentId: string | number) => {
  try {
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    
    await esClient.delete({
      index: documentIndexName,
      id: documentId.toString(),
      refresh: true
    });
    
    logger.info(`Document deleted from index: ${documentId}`);
  } catch (error) {
    logger.error(`Failed to delete document from index: ${documentId}`, { error });
    throw error;
  }
};import { Client } from '@elastic/elasticsearch';
import { config } from '../config';
import { logger } from '../utils/logger';

// Create Elasticsearch client
const createClient = () => {
  const options: any = {
    node: config.elasticsearch.url
  };

  // Add authentication if provided
  if (config.elasticsearch.username && config.elasticsearch.password) {
    options.auth = {
      username: config.elasticsearch.username,
      password: config.elasticsearch.password
    };
  }

  return new Client(options);
};

// Elasticsearch client instance
export const esClient = createClient();

// Setup Elasticsearch indices and mappings
export const setupElasticsearch = async () => {
  try {
    logger.info('Setting up Elasticsearch');

    // Check if Elasticsearch is available
    const health = await esClient.cluster.health();
    logger.info('Elasticsearch cluster health', { status: health.status });

    // Create document index if it doesn't exist
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    const documentIndexExists = await esClient.indices.exists({ index: documentIndexName });

    if (!documentIndexExists) {
      logger.info(`Creating index: ${documentIndexName}`);
      
      await esClient.indices.create({
        index: documentIndexName,
        body: {
          settings: {
            number_of_shards: 3,
            number_of_replicas: 1,
            analysis: {
              analyzer: {
                content_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'stop', 'snowball']
                }
              }
            }
          },
          mappings: {
            properties: {
              id: { type: 'keyword' },
              tenantId: { type: 'keyword' },
              title: { 
                type: 'text',
                analyzer: 'standard',
                fields: {
                  keyword: { type: 'keyword' }
                }
              },
              content: { 
                type: 'text',
                analyzer: 'content_analyzer'
              },
              fileType: { type: 'keyword' },
              mimeType: { type: 'keyword' },
              tags: { type: 'keyword' },
              metadata: { type: 'object' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
              createdBy: { type: 'keyword' },
              folderId: { type: 'keyword' },
              path: { type: 'keyword' }
            }
          }
        }
      });
    }

    logger.info('Elasticsearch setup completed');
  } catch (error) {
    logger.error('Failed to setup Elasticsearch', { error });
    throw error;
  }
};

// Index a document
export const indexDocument = async (document: any) => {
  try {
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    
    await esClient.index({
      index: documentIndexName,
      id: document.id.toString(),
      document: {
        id: document.id,
        tenantId: document.tenantId,
        title: document.title,
        content: document.content,
        fileType: document.fileType,
        mimeType: document.mimeType,
        tags: document.tags,
        metadata: document.metadata,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        createdBy: document.createdBy,
        folderId: document.folderId,
        path: document.path
      },
      refresh: true
    });
    
    logger.info(`Document indexed: ${document.id}`);
  } catch (error) {
    logger.error(`Failed to index document: ${document.id}`, { error });
    throw error;
  }
};

// Search documents
export const searchDocuments = async (params: {
  tenantId: string | number;
  query: string;
  filters?: Record<string, any>;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  try {
    const { 
      tenantId, 
      query, 
      filters = {}, 
      page = 1, 
      limit = 10,
      sortField = 'updatedAt',
      sortOrder = 'desc'
    } = params;
    
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    
    // Build query
    const must: any[] = [
      { term: { tenantId: tenantId.toString() } }
    ];
    
    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'content', 'tags^2'],
          fuzziness: 'AUTO'
        }
      });
    }
    
    // Add filters
    const filter: any[] = [];
    
    if (filters.fileType) {
      filter.push({ term: { fileType: filters.fileType } });
    }
    
    if (filters.folderId) {
      filter.push({ term: { folderId: filters.folderId } });
    }
    
    if (filters.tags && filters.tags.length > 0) {
      filter.push({ terms: { tags: filters.tags } });
    }
    
    if (filters.createdBy) {
      filter.push({ term: { createdBy: filters.createdBy } });
    }
    
    if (filters.dateFrom || filters.dateTo) {
      const range: any = {};
      
      if (filters.dateFrom) {
        range.gte = filters.dateFrom;
      }
      
      if (filters.dateTo) {
        range.lte = filters.dateTo;
      }
      
      filter.push({ range: { createdAt: range } });
    }
    
    // Execute search
    const result = await esClient.search({
      index: documentIndexName,
      body: {
        query: {
          bool: {
            must,
            filter
          }
        },
        sort: [
          { [sortField]: { order: sortOrder } }
        ],
        from: (page - 1) * limit,
        size: limit,
        highlight: {
          fields: {
            content: { 
              fragment_size: 150,
              number_of_fragments: 3,
              pre_tags: ['<strong>'],
              post_tags: ['</strong>']
            },
            title: {
              fragment_size: 150,
              number_of_fragments: 1,
              pre_tags: ['<strong>'],
              post_tags: ['</strong>']
            }
          }
        }
      }
    });
    
    // Format results
    const hits = result.hits.hits.map(hit => ({
      id: hit._source.id,
      title: hit._source.title,
      fileType: hit._source.fileType,
      createdAt: hit._source.createdAt,
      updatedAt: hit._source.updatedAt,
      createdBy: hit._source.createdBy,
      folderId: hit._source.folderId,
      tags: hit._source.tags,
      highlights: hit.highlight,
      score: hit._score
    }));
    
    return {
      hits,
      total: result.hits.total.value,
      page,
      limit,
      totalPages: Math.ceil(result.hits.total.value / limit)
    };
  } catch (error) {
    logger.error('Search documents error', { error });
    throw error;
  }
};

// Delete document from index
export const deleteDocument = async (documentId: string | number) => {
  try {
    const documentIndexName = `${config.elasticsearch.indexPrefix}_documents`;
    
    await esClient.delete({
      index: documentIndexName,
      id: documentId.toString(),
      refresh: true
    });
    
    logger.info(`Document deleted from index: ${documentId}`);
  } catch (error) {
    logger.error(`Failed to delete document from index: ${documentId}`, { error });
    throw error;
  }
};