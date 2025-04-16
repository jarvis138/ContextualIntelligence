/**
 * Relationship Discovery Service
 * 
 * This service analyzes fetched data and identifies relationships between different
 * data items based on content analysis, metadata, and other heuristics.
 */

import { logger } from './observability';
import { metrics } from './observability/metrics-util';
import { elasticsearchService } from './elasticsearch';
import { FetchedData } from '@shared/schema';
import { db } from '../db';
import { fetchedData } from '@shared/schema';
import { eq, and, gt, lt, desc } from 'drizzle-orm';
import { openaiService } from './openai';
import { entityRecognition, findEntities, findReferencePatterns } from './nlp/entityExtraction';

/**
 * Types of relationships that can be discovered
 */
enum RelationshipType {
  REFERENCES = 'references',
  CONTAINS = 'contains',
  RELATED_TO = 'related_to',
  RESPONDS_TO = 'responds_to',
  CREATED_BY = 'created_by',
  MENTIONS = 'mentions',
  SAME_TOPIC = 'same_topic',
  PARENT_CHILD = 'parent_child'
}

/**
 * Relationship Discovery Service Class
 */
export class RelationshipDiscoveryService {
  /**
   * Discover relationships for a batch of new data items
   */
  async discoverRelationships(dataItems: FetchedData[]): Promise<number> {
    if (!dataItems.length) {
      return 0;
    }
    
    let discoveredRelationships = 0;
    const startTime = Date.now();
    
    try {
      // Process each data item
      for (const item of dataItems) {
        // Skip items without content
        if (!item.content) {
          continue;
        }
        
        try {
          // Find references to other items
          const referencesCount = await this.findReferences(item);
          discoveredRelationships += referencesCount;
          
          // Find related items based on content similarity
          const similarityCount = await this.findSimilarContent(item);
          discoveredRelationships += similarityCount;
          
          // Find entity-based relationships
          const entityCount = await this.findEntityRelationships(item);
          discoveredRelationships += entityCount;
          
          // Find thread/conversation relationships
          const threadCount = await this.findThreadRelationships(item);
          discoveredRelationships += threadCount;
          
          logger.info('Relationship discovery completed for item', {
            dataId: item.dataId,
            discoveredRelationships: referencesCount + similarityCount + entityCount + threadCount
          });
        } catch (error) {
          logger.error('Error discovering relationships for item', {
            error,
            dataId: item.dataId
          });
        }
      }
      
      metrics.histogram('relationship_discovery_duration', Date.now() - startTime);
      metrics.increment('relationship_discovery_total', { count: discoveredRelationships });
      
      return discoveredRelationships;
    } catch (error) {
      logger.error('Error in relationship discovery process', { error });
      metrics.increment('external_api_errors_total', { service: 'relationship_discovery' });
      return discoveredRelationships;
    }
  }

  /**
   * Find direct references between data items
   */
  private async findReferences(item: FetchedData): Promise<number> {
    let discoveredRelationships = 0;
    
    try {
      // Extract potential references from content
      const referencePatterns = await findReferencePatterns(item.content);
      
      if (!referencePatterns.length) {
        return 0;
      }
      
      // Check each reference against the database
      for (const pattern of referencePatterns) {
        // Check if referenced item exists
        const [referencedItem] = await db.select()
          .from(fetchedData)
          .where(
            and(
              eq(fetchedData.sourceId, pattern.id),
              eq(fetchedData.connectorType, item.connectorType)
            )
          )
          .limit(1);
        
        if (referencedItem) {
          // Store the relationship
          await elasticsearchService.storeRelationship({
            sourceType: 'data_item',
            sourceId: item.dataId,
            targetType: 'data_item',
            targetId: referencedItem.dataId,
            relationshipType: RelationshipType.REFERENCES,
            confidence: pattern.confidence || 0.8,
            metadata: {
              referenceType: pattern.type,
              context: pattern.context
            }
          });
          
          discoveredRelationships++;
        }
      }
    } catch (error) {
      logger.error('Error finding references', { error, dataId: item.dataId });
    }
    
    return discoveredRelationships;
  }

  /**
   * Find items with similar content
   */
  private async findSimilarContent(item: FetchedData): Promise<number> {
    let discoveredRelationships = 0;
    
    try {
      // Use Elasticsearch to find similar content
      const searchResults = await elasticsearchService.searchFetchedData(
        item.content?.substring(0, 500) || item.title || '',
        {
          connectorType: item.connectorType,
          dataType: item.dataType
        },
        1,
        5
      );
      
      // Filter out the current item and items with low scores
      const similarItems = searchResults.hits
        .filter(hit => hit.id !== item.dataId && hit.score > 0.4)
        .slice(0, 3); // Limit to top 3 similar items
      
      for (const similarItem of similarItems) {
        const sourceId = item.dataId;
        const targetId = similarItem.source.dataId;
        
        // Don't create duplicate relationships
        if (sourceId === targetId) {
          continue;
        }
        
        // Store the relationship
        await elasticsearchService.storeRelationship({
          sourceType: 'data_item',
          sourceId,
          targetType: 'data_item',
          targetId,
          relationshipType: RelationshipType.RELATED_TO,
          confidence: Math.min(similarItem.score / 2, 0.95), // Normalize score
          metadata: {
            similarityScore: similarItem.score,
            matchFields: similarItem.highlights ? Object.keys(similarItem.highlights) : []
          }
        });
        
        discoveredRelationships++;
      }
    } catch (error) {
      logger.error('Error finding similar content', { error, dataId: item.dataId });
    }
    
    return discoveredRelationships;
  }

  /**
   * Find relationships based on recognized entities
   */
  private async findEntityRelationships(item: FetchedData): Promise<number> {
    let discoveredRelationships = 0;
    
    try {
      // Extract entities from content
      const entities = await findEntities(item.content || '');
      
      if (!entities.length) {
        return 0;
      }
      
      // For each entity, find items that mention the same entity
      for (const entity of entities) {
        // Skip entities with low confidence
        if (entity.confidence < 0.7) {
          continue;
        }
        
        // Search for items that mention this entity
        const searchResults = await elasticsearchService.searchFetchedData(
          `"${entity.text}"`,
          {
            connectorType: item.connectorType
          },
          1,
          10
        );
        
        // Filter out the current item and create relationships
        const relatedItems = searchResults.hits
          .filter(hit => hit.id !== item.dataId)
          .slice(0, 5); // Limit to top 5 related items
        
        for (const relatedItem of relatedItems) {
          // Store the relationship
          await elasticsearchService.storeRelationship({
            sourceType: 'data_item',
            sourceId: item.dataId,
            targetType: 'data_item',
            targetId: relatedItem.source.dataId,
            relationshipType: RelationshipType.MENTIONS,
            confidence: entity.confidence * 0.9, // Adjust confidence
            metadata: {
              entity: {
                text: entity.text,
                type: entity.type
              }
            }
          });
          
          discoveredRelationships++;
        }
      }
    } catch (error) {
      logger.error('Error finding entity relationships', { error, dataId: item.dataId });
    }
    
    return discoveredRelationships;
  }

  /**
   * Find thread or conversation relationships
   */
  private async findThreadRelationships(item: FetchedData): Promise<number> {
    let discoveredRelationships = 0;
    
    try {
      // Only process certain data types that are likely part of threads/conversations
      if (!['email', 'slack_message', 'comment', 'message', 'thread'].includes(item.dataType)) {
        return 0;
      }
      
      // Check if item is part of a thread based on metadata
      const threadId = 
        item.metadata?.threadId || 
        item.metadata?.thread_id || 
        item.metadata?.thread_ts || 
        item.metadata?.conversation_id;
      
      if (!threadId) {
        return 0;
      }
      
      // Find other items in the same thread
      const [parentItem] = await db.select()
        .from(fetchedData)
        .where(
          and(
            eq(fetchedData.connectorType, item.connectorType),
            eq(fetchedData.sourceId, threadId.toString())
          )
        )
        .limit(1);
      
      if (parentItem) {
        // Create parent-child relationship
        await elasticsearchService.storeRelationship({
          sourceType: 'data_item',
          sourceId: parentItem.dataId,
          targetType: 'data_item',
          targetId: item.dataId,
          relationshipType: RelationshipType.PARENT_CHILD,
          confidence: 0.95,
          metadata: {
            threadId: threadId.toString()
          }
        });
        
        discoveredRelationships++;
      }
      
      // Find siblings (other responses in the same thread)
      const threadItems = await db.select()
        .from(fetchedData)
        .where(
          and(
            eq(fetchedData.connectorType, item.connectorType),
            eq(fetchedData.dataType, item.dataType)
          )
        )
        .limit(50);
      
      // Filter items that are in the same thread
      const siblingItems = threadItems.filter(threadItem => {
        if (threadItem.dataId === item.dataId) {
          return false;
        }
        
        const itemThreadId = 
          threadItem.metadata?.threadId || 
          threadItem.metadata?.thread_id || 
          threadItem.metadata?.thread_ts || 
          threadItem.metadata?.conversation_id;
        
        return itemThreadId && itemThreadId.toString() === threadId.toString();
      });
      
      // Create relationships with each sibling
      for (const siblingItem of siblingItems) {
        // Check chronology to identify which message responds to which
        const itemDate = new Date(item.fetchedAt);
        const siblingDate = new Date(siblingItem.fetchedAt);
        
        // Only create relationships if this item comes after the sibling
        // (meaning this item potentially responds to the sibling)
        if (itemDate > siblingDate) {
          await elasticsearchService.storeRelationship({
            sourceType: 'data_item',
            sourceId: item.dataId,
            targetType: 'data_item',
            targetId: siblingItem.dataId,
            relationshipType: RelationshipType.RESPONDS_TO,
            confidence: 0.8,
            metadata: {
              threadId: threadId.toString(),
              timeDiff: itemDate.getTime() - siblingDate.getTime()
            }
          });
          
          discoveredRelationships++;
        }
      }
    } catch (error) {
      logger.error('Error finding thread relationships', { error, dataId: item.dataId });
    }
    
    return discoveredRelationships;
  }

  /**
   * Schedule relationship discovery for recently fetched data
   */
  async scheduleDiscovery(): Promise<number> {
    try {
      const startTime = Date.now();
      
      // Get recent items that haven't been processed for relationships
      const recentItems = await db.select()
        .from(fetchedData)
        .orderBy(desc(fetchedData.fetchedAt))
        .limit(50);
      
      // Process items in batches
      const batchSize = 10;
      let processedCount = 0;
      
      for (let i = 0; i < recentItems.length; i += batchSize) {
        const batch = recentItems.slice(i, i + batchSize);
        const discoveredCount = await this.discoverRelationships(batch);
        processedCount += batch.length;
        
        logger.info('Processed batch for relationship discovery', {
          batchSize: batch.length,
          discoveredRelationships: discoveredCount
        });
      }
      
      metrics.histogram('relationship_discovery_duration', Date.now() - startTime);
      
      return processedCount;
    } catch (error) {
      logger.error('Error scheduling relationship discovery', { error });
      return 0;
    }
  }
}

export const relationshipDiscoveryService = new RelationshipDiscoveryService();