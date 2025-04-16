/**
 * Elasticsearch Service
 * 
 * This service manages the connection to Elasticsearch and provides methods
 * for indexing and searching data.
 */

import { Client } from '@elastic/elasticsearch';
import { logger } from './observability';
import { metrics } from './observability/metrics-util';
import { FetchedData } from '@shared/schema';

// Create Elasticsearch client
const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME && process.env.ELASTICSEARCH_PASSWORD
    ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      }
    : undefined
});

// Index names
const FETCHED_DATA_INDEX = 'fetched_data';
const RELATIONSHIP_INDEX = 'relationships';

/**
 * Elasticsearch Service Class
 */
export class ElasticsearchService {
  /**
   * Check if Elasticsearch is running
   */
  async ping(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const result = await client.ping();
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'elasticsearch', 
        endpoint: 'ping' 
      });
      
      return result;
    } catch (error) {
      logger.error('Elasticsearch ping failed', { error });
      metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
      return false;
    }
  }

  /**
   * Create indices if they don't exist
   */
  async createIndices(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Check if fetched data index exists
      const fetchedDataIndexExists = await client.indices.exists({ 
        index: FETCHED_DATA_INDEX 
      });
      
      if (!fetchedDataIndexExists) {
        // Create fetched data index
        await client.indices.create({
          index: FETCHED_DATA_INDEX,
          body: {
            mappings: {
              properties: {
                dataId: { type: 'keyword' },
                userId: { type: 'integer' },
                jobId: { type: 'keyword' },
                connectorType: { type: 'keyword' },
                dataType: { type: 'keyword' },
                title: { 
                  type: 'text',
                  fields: {
                    keyword: { type: 'keyword' }
                  }
                },
                content: { 
                  type: 'text',
                  analyzer: 'standard'
                },
                metadata: { type: 'object', enabled: true },
                sourceUrl: { type: 'keyword' },
                sourceId: { type: 'keyword' },
                fetchedAt: { type: 'date' },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            }
          }
        });
        
        logger.info('Created fetched data index');
      }
      
      // Check if relationships index exists
      const relationshipsIndexExists = await client.indices.exists({ 
        index: RELATIONSHIP_INDEX 
      });
      
      if (!relationshipsIndexExists) {
        // Create relationships index
        await client.indices.create({
          index: RELATIONSHIP_INDEX,
          body: {
            mappings: {
              properties: {
                relationshipId: { type: 'keyword' },
                sourceType: { type: 'keyword' },
                sourceId: { type: 'keyword' },
                targetType: { type: 'keyword' },
                targetId: { type: 'keyword' },
                relationshipType: { type: 'keyword' },
                confidence: { type: 'float' },
                metadata: { type: 'object', enabled: true },
                createdAt: { type: 'date' },
                updatedAt: { type: 'date' }
              }
            }
          }
        });
        
        logger.info('Created relationships index');
      }
      
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'elasticsearch', 
        endpoint: 'createIndices' 
      });
    } catch (error) {
      logger.error('Error creating Elasticsearch indices', { error });
      metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
      throw new Error(`Failed to create Elasticsearch indices: ${error.message}`);
    }
  }

  /**
   * Index a batch of fetched data items
   */
  async indexFetchedData(dataItems: FetchedData[]): Promise<boolean> {
    if (!dataItems.length) {
      return true;
    }
    
    try {
      const startTime = Date.now();
      
      // Create bulk operations
      const operations = dataItems.flatMap(doc => [
        { index: { _index: FETCHED_DATA_INDEX, _id: doc.dataId } },
        {
          dataId: doc.dataId,
          userId: doc.userId,
          jobId: doc.jobId,
          connectorType: doc.connectorType,
          dataType: doc.dataType,
          title: doc.title,
          content: doc.content,
          metadata: doc.metadata,
          sourceUrl: doc.sourceUrl,
          sourceId: doc.sourceId,
          fetchedAt: doc.fetchedAt,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt
        }
      ]);
      
      // Send bulk request
      const result = await client.bulk({ operations, refresh: true });
      
      // Check for errors
      if (result.errors) {
        const errors = result.items
          .filter(item => item.index && item.index.error)
          .map(item => item.index.error);
        
        logger.error('Errors in bulk indexing', { errors });
        metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
        return false;
      }
      
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'elasticsearch', 
        endpoint: 'indexFetchedData' 
      });
      metrics.increment('index_operations_total', { count: dataItems.length });
      
      return true;
    } catch (error) {
      logger.error('Error indexing fetched data', { error });
      metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
      return false;
    }
  }

  /**
   * Search the fetched data index
   */
  async searchFetchedData(
    query: string,
    filters: Record<string, any> = {},
    page = 1,
    size = 10
  ) {
    try {
      const startTime = Date.now();
      
      // Build query
      const mustClauses = [];
      const filterClauses = [];
      
      // Add search query if present
      if (query && query.trim()) {
        mustClauses.push({
          multi_match: {
            query: query.trim(),
            fields: ['title^2', 'content', 'metadata.*'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }
      
      // Add filters
      if (filters.userId) {
        filterClauses.push({ term: { userId: filters.userId } });
      }
      
      if (filters.connectorType) {
        filterClauses.push({ term: { connectorType: filters.connectorType } });
      }
      
      if (filters.dataType) {
        filterClauses.push({ term: { dataType: filters.dataType } });
      }
      
      // Date range filter
      if (filters.dateFrom || filters.dateTo) {
        const rangeFilter: any = { range: { fetchedAt: {} } };
        
        if (filters.dateFrom) {
          rangeFilter.range.fetchedAt.gte = filters.dateFrom;
        }
        
        if (filters.dateTo) {
          rangeFilter.range.fetchedAt.lte = filters.dateTo;
        }
        
        filterClauses.push(rangeFilter);
      }
      
      // Build query object
      const queryObject: any = {
        bool: {}
      };
      
      if (mustClauses.length) {
        queryObject.bool.must = mustClauses;
      }
      
      if (filterClauses.length) {
        queryObject.bool.filter = filterClauses;
      }
      
      // If no query clauses, match all
      if (!mustClauses.length && !filterClauses.length) {
        queryObject.bool.must = [{ match_all: {} }];
      }
      
      // Execute search
      const response = await client.search({
        index: FETCHED_DATA_INDEX,
        body: {
          query: queryObject,
          highlight: {
            fields: {
              title: {},
              content: {}
            },
            pre_tags: ['<strong>'],
            post_tags: ['</strong>'],
            fragment_size: 150,
            number_of_fragments: 3
          },
          sort: [
            { _score: { order: 'desc' } },
            { fetchedAt: { order: 'desc' } }
          ],
          from: (page - 1) * size,
          size: size
        }
      });
      
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'elasticsearch', 
        endpoint: 'searchFetchedData' 
      });
      metrics.increment('search_operations_total');
      
      return {
        total: response.hits.total,
        hits: response.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlights: hit.highlight
        })),
        page,
        size,
        pages: Math.ceil(Number(response.hits.total) / size)
      };
    } catch (error) {
      logger.error('Error searching fetched data', { error, query, filters });
      metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
      throw new Error(`Failed to search fetched data: ${error.message}`);
    }
  }

  /**
   * Store a relationship between two items
   */
  async storeRelationship(relationship: {
    sourceType: string;
    sourceId: string;
    targetType: string;
    targetId: string;
    relationshipType: string;
    confidence: number;
    metadata?: any;
  }) {
    try {
      const startTime = Date.now();
      
      // Generate a unique ID for the relationship
      const relationshipId = `${relationship.sourceType}_${relationship.sourceId}_${relationship.relationshipType}_${relationship.targetType}_${relationship.targetId}`;
      
      // Store the relationship
      await client.index({
        index: RELATIONSHIP_INDEX,
        id: relationshipId,
        body: {
          relationshipId,
          ...relationship,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        refresh: true
      });
      
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'elasticsearch', 
        endpoint: 'storeRelationship' 
      });
      metrics.increment('relationship_operations_total');
      
      return relationshipId;
    } catch (error) {
      logger.error('Error storing relationship', { error, relationship });
      metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
      throw new Error(`Failed to store relationship: ${error.message}`);
    }
  }

  /**
   * Find relationships for a specific item
   */
  async findRelationships(
    itemType: string,
    itemId: string,
    relationshipType?: string,
    direction: 'outgoing' | 'incoming' | 'both' = 'both'
  ) {
    try {
      const startTime = Date.now();
      
      // Build query
      const mustClauses = [];
      
      if (direction === 'outgoing' || direction === 'both') {
        const sourceClauses = [
          { term: { sourceType: itemType } },
          { term: { sourceId: itemId } }
        ];
        
        if (relationshipType) {
          sourceClauses.push({ term: { relationshipType } });
        }
        
        mustClauses.push({
          bool: {
            must: sourceClauses
          }
        });
      }
      
      if (direction === 'incoming' || direction === 'both') {
        const targetClauses = [
          { term: { targetType: itemType } },
          { term: { targetId: itemId } }
        ];
        
        if (relationshipType) {
          targetClauses.push({ term: { relationshipType } });
        }
        
        mustClauses.push({
          bool: {
            must: targetClauses
          }
        });
      }
      
      // Execute search
      const response = await client.search({
        index: RELATIONSHIP_INDEX,
        body: {
          query: {
            bool: {
              should: mustClauses,
              minimum_should_match: 1
            }
          },
          sort: [
            { confidence: { order: 'desc' } },
            { createdAt: { order: 'desc' } }
          ],
          size: 100
        }
      });
      
      metrics.histogram('external_api_duration', Date.now() - startTime, { 
        service: 'elasticsearch', 
        endpoint: 'findRelationships' 
      });
      
      return response.hits.hits.map(hit => hit._source);
    } catch (error) {
      logger.error('Error finding relationships', { error, itemType, itemId });
      metrics.increment('external_api_errors_total', { service: 'elasticsearch' });
      throw new Error(`Failed to find relationships: ${error.message}`);
    }
  }
}

export const elasticsearchService = new ElasticsearchService();