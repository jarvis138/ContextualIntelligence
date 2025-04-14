/**
 * Entity Correlator Service
 * 
 * Analyzes and correlates entities across different data sources/platforms
 * to identify and link related entities across the entire project ecosystem.
 */

import { storage } from '../../storage';
import { logger } from '../../utils/logger';
import { Relationship, entityTypeEnum } from '@shared/schema';

// Create a type for entity types based on the PostgreSQL enum values
type EntityType = typeof entityTypeEnum.enumValues[number];
import { logAuditEvent, AuditEventType } from '../../utils/auditLogger';

// Types of matches for entity correlation
export enum CorrelationMatchType {
  EXACT = 'exact',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  NONE = 'none'
}

// Types of correlation strategies
export enum CorrelationStrategy {
  TEXT_SIMILARITY = 'text_similarity',
  SEMANTIC_SIMILARITY = 'semantic_similarity',
  REFERENCE_MATCHING = 'reference_matching',
  TEMPORAL_PROXIMITY = 'temporal_proximity',
  CONTACT_MATCHING = 'contact_matching',
  PROJECT_CONTEXT = 'project_context',
  COMBINED = 'combined'
}

// Entity correlation result
export interface CorrelationResult {
  sourceEntity: {
    type: EntityType;
    id: number;
    name?: string;
  };
  matchedEntity: {
    type: EntityType;
    id: number;
    name?: string;
  };
  matchType: CorrelationMatchType;
  confidence: number;
  strategy: CorrelationStrategy;
  metadata?: any;
}

// Correlation options
export interface CorrelationOptions {
  strategies: CorrelationStrategy[];
  minConfidence: number;
  maxResults?: number;
  restrictToProject?: number;
  restrictToEntityTypes?: EntityType[];
  includeExistingRelationships?: boolean;
}

// Default correlation options
const DEFAULT_CORRELATION_OPTIONS: CorrelationOptions = {
  strategies: [
    CorrelationStrategy.TEXT_SIMILARITY,
    CorrelationStrategy.REFERENCE_MATCHING,
    CorrelationStrategy.TEMPORAL_PROXIMITY,
    CorrelationStrategy.PROJECT_CONTEXT
  ],
  minConfidence: 0.5,
  maxResults: 20,
  includeExistingRelationships: false
};

/**
 * Entity Correlator class
 * Identifies relationships between entities across different platforms/sources
 */
export class EntityCorrelator {
  private options: CorrelationOptions;
  
  constructor(options: Partial<CorrelationOptions> = {}) {
    this.options = {
      ...DEFAULT_CORRELATION_OPTIONS,
      ...options
    };
  }
  
  /**
   * Find correlations for a specific entity
   * @param entityType Type of entity to find correlations for
   * @param entityId ID of the entity to find correlations for
   * @returns Promise resolving to array of correlation results
   */
  async findCorrelations(
    entityType: EntityType,
    entityId: number
  ): Promise<CorrelationResult[]> {
    try {
      logger.info(`Finding correlations for ${entityType}:${entityId}`);
      
      // Get the entity data based on type
      const entityData = await this.getEntityData(entityType, entityId);
      
      if (!entityData) {
        logger.warn(`Entity ${entityType}:${entityId} not found`);
        return [];
      }
      
      // Apply different correlation strategies based on options
      const correlationResults: CorrelationResult[] = [];
      
      for (const strategy of this.options.strategies) {
        const strategyResults = await this.applyCorrelationStrategy(
          strategy,
          entityType,
          entityId,
          entityData
        );
        
        correlationResults.push(...strategyResults);
      }
      
      // Filter by confidence and sort by confidence (highest first)
      const filteredResults = correlationResults
        .filter(result => result.confidence >= this.options.minConfidence)
        .sort((a, b) => b.confidence - a.confidence);
      
      // Limit results if specified
      const limitedResults = this.options.maxResults
        ? filteredResults.slice(0, this.options.maxResults)
        : filteredResults;
      
      // Log the correlation activity
      await logAuditEvent({
        eventType: AuditEventType.SYSTEM_CORRELATION_COMPLETE,
        description: `Found ${limitedResults.length} correlations for ${entityType}:${entityId}`,
        metadata: {
          entityType,
          entityId,
          resultCount: limitedResults.length,
          strategies: this.options.strategies,
        }
      });
      
      return limitedResults;
    } catch (error) {
      logger.error(`Error finding correlations for ${entityType}:${entityId}`, error);
      
      await logAuditEvent({
        eventType: AuditEventType.SYSTEM_CORRELATION_FAILED,
        description: `Failed to find correlations for ${entityType}:${entityId}`,
        severity: 'error',
        metadata: {
          entityType,
          entityId,
          error: error.message,
        }
      });
      
      return [];
    }
  }
  
  /**
   * Create relationships from correlation results
   * @param correlations Correlation results
   * @param description Optional description for the relationships
   * @returns Promise resolving to created relationships
   */
  async createRelationshipsFromCorrelations(
    correlations: CorrelationResult[],
    description: string = 'Auto-detected correlation'
  ): Promise<Relationship[]> {
    const relationships: Relationship[] = [];
    
    for (const correlation of correlations) {
      try {
        // Calculate relationship strength based on confidence
        const strength = Math.round(correlation.confidence * 100);
        
        // Create relationship record
        const relationship = await storage.createRelationship({
          sourceType: correlation.sourceEntity.type,
          sourceId: correlation.sourceEntity.id,
          targetType: correlation.matchedEntity.type,
          targetId: correlation.matchedEntity.id,
          strength,
          description: `${description} (${correlation.matchType})`,
          metadata: {
            correlationStrategy: correlation.strategy,
            confidence: correlation.confidence,
            matchType: correlation.matchType,
            ...correlation.metadata
          }
        });
        
        relationships.push(relationship);
        
        logger.info(`Created relationship between ${correlation.sourceEntity.type}:${correlation.sourceEntity.id} and ${correlation.matchedEntity.type}:${correlation.matchedEntity.id}`);
      } catch (error) {
        logger.error(`Failed to create relationship for correlation`, error);
      }
    }
    
    return relationships;
  }
  
  /**
   * Apply a specific correlation strategy
   */
  private async applyCorrelationStrategy(
    strategy: CorrelationStrategy,
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    switch (strategy) {
      case CorrelationStrategy.TEXT_SIMILARITY:
        return this.findTextSimilarities(entityType, entityId, entityData);
        
      case CorrelationStrategy.REFERENCE_MATCHING:
        return this.findReferenceMatches(entityType, entityId, entityData);
        
      case CorrelationStrategy.TEMPORAL_PROXIMITY:
        return this.findTemporalProximities(entityType, entityId, entityData);
        
      case CorrelationStrategy.CONTACT_MATCHING:
        return this.findContactMatches(entityType, entityId, entityData);
        
      case CorrelationStrategy.PROJECT_CONTEXT:
        return this.findProjectContextCorrelations(entityType, entityId, entityData);
        
      case CorrelationStrategy.SEMANTIC_SIMILARITY:
        return this.findSemanticSimilarities(entityType, entityId, entityData);
        
      case CorrelationStrategy.COMBINED:
        // Combined strategy applies all strategies and merges results
        const allResults: CorrelationResult[] = [];
        
        for (const subStrategy of Object.values(CorrelationStrategy)) {
          if (subStrategy !== CorrelationStrategy.COMBINED) {
            const results = await this.applyCorrelationStrategy(
              subStrategy,
              entityType,
              entityId,
              entityData
            );
            allResults.push(...results);
          }
        }
        
        // Deduplicate and recompute confidence
        return this.deduplicateAndMergeResults(allResults);
        
      default:
        logger.warn(`Unknown correlation strategy: ${strategy}`);
        return [];
    }
  }
  
  /**
   * Find text-based similarities between entities
   */
  private async findTextSimilarities(
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];
    
    try {
      // Extract text content based on entity type
      const textContent = this.extractTextContent(entityType, entityData);
      
      if (!textContent || textContent.length < 10) {
        return results;
      }
      
      // Get potential matches to compare against
      const potentialMatches = await this.getPotentialMatches(entityType, entityId);
      
      for (const match of potentialMatches) {
        // Skip if it's the same entity
        if (match.type === entityType && match.id === entityId) {
          continue;
        }
        
        // Get match entity data
        const matchData = await this.getEntityData(match.type, match.id);
        
        if (!matchData) {
          continue;
        }
        
        // Extract text content for the potential match
        const matchTextContent = this.extractTextContent(match.type, matchData);
        
        if (!matchTextContent || matchTextContent.length < 10) {
          continue;
        }
        
        // Calculate text similarity
        const similarity = this.calculateTextSimilarity(textContent, matchTextContent);
        
        // Determine match type based on similarity
        let matchType = CorrelationMatchType.NONE;
        if (similarity > 0.9) {
          matchType = CorrelationMatchType.EXACT;
        } else if (similarity > 0.7) {
          matchType = CorrelationMatchType.HIGH;
        } else if (similarity > 0.5) {
          matchType = CorrelationMatchType.MEDIUM;
        } else if (similarity > 0.3) {
          matchType = CorrelationMatchType.LOW;
        }
        
        // Only include if it's not NONE
        if (matchType !== CorrelationMatchType.NONE) {
          results.push({
            sourceEntity: {
              type: entityType,
              id: entityId,
              name: this.getEntityName(entityType, entityData)
            },
            matchedEntity: {
              type: match.type,
              id: match.id,
              name: this.getEntityName(match.type, matchData)
            },
            matchType,
            confidence: similarity,
            strategy: CorrelationStrategy.TEXT_SIMILARITY,
            metadata: {
              textSimilarity: similarity
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error in text similarity correlation`, error);
    }
    
    return results;
  }
  
  /**
   * Find reference matches (explicit mentions of IDs, names, etc.)
   */
  private async findReferenceMatches(
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];
    
    try {
      // Extract reference identifiers based on entity type
      const references = this.extractReferenceIdentifiers(entityType, entityData);
      
      if (!references || references.length === 0) {
        return results;
      }
      
      // For each reference, find entities that might match
      for (const reference of references) {
        const matchingEntities = await this.findEntitiesMatchingReference(reference);
        
        for (const match of matchingEntities) {
          // Skip if it's the same entity
          if (match.type === entityType && match.id === entityId) {
            continue;
          }
          
          // Get match data
          const matchData = await this.getEntityData(match.type, match.id);
          
          if (!matchData) {
            continue;
          }
          
          // Add to results with high confidence for reference matches
          results.push({
            sourceEntity: {
              type: entityType,
              id: entityId,
              name: this.getEntityName(entityType, entityData)
            },
            matchedEntity: {
              type: match.type,
              id: match.id,
              name: this.getEntityName(match.type, matchData)
            },
            matchType: CorrelationMatchType.EXACT,
            confidence: 0.95,
            strategy: CorrelationStrategy.REFERENCE_MATCHING,
            metadata: {
              referenceType: reference.type,
              referenceValue: reference.value
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error in reference matching correlation`, error);
    }
    
    return results;
  }
  
  /**
   * Find entities that are temporally close (created around same time)
   */
  private async findTemporalProximities(
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];
    
    try {
      // Get creation date of entity
      const creationDate = this.getEntityCreationDate(entityType, entityData);
      
      if (!creationDate) {
        return results;
      }
      
      // Look for entities created within a time window
      const timeWindowMs = 24 * 60 * 60 * 1000; // 24 hours
      const minDate = new Date(creationDate.getTime() - timeWindowMs);
      const maxDate = new Date(creationDate.getTime() + timeWindowMs);
      
      // Get entities created in this time window
      const temporalMatches = await this.findEntitiesInTimeWindow(
        minDate, 
        maxDate,
        entityType,
        entityId
      );
      
      for (const match of temporalMatches) {
        // Get match data
        const matchData = await this.getEntityData(match.type, match.id);
        
        if (!matchData) {
          continue;
        }
        
        // Calculate temporal proximity as a confidence score
        const matchDate = this.getEntityCreationDate(match.type, matchData);
        
        if (!matchDate) {
          continue;
        }
        
        const timeDiffMs = Math.abs(creationDate.getTime() - matchDate.getTime());
        const proximityScore = 1 - (timeDiffMs / timeWindowMs);
        
        // Determine match type based on proximity
        let matchType = CorrelationMatchType.NONE;
        if (proximityScore > 0.9) {
          matchType = CorrelationMatchType.HIGH;
        } else if (proximityScore > 0.7) {
          matchType = CorrelationMatchType.MEDIUM;
        } else if (proximityScore > 0.5) {
          matchType = CorrelationMatchType.LOW;
        }
        
        if (matchType !== CorrelationMatchType.NONE) {
          results.push({
            sourceEntity: {
              type: entityType,
              id: entityId,
              name: this.getEntityName(entityType, entityData)
            },
            matchedEntity: {
              type: match.type,
              id: match.id,
              name: this.getEntityName(match.type, matchData)
            },
            matchType,
            confidence: proximityScore,
            strategy: CorrelationStrategy.TEMPORAL_PROXIMITY,
            metadata: {
              sourceCreatedAt: creationDate.toISOString(),
              targetCreatedAt: matchDate.toISOString(),
              timeDifferenceHours: timeDiffMs / (1000 * 60 * 60)
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error in temporal proximity correlation`, error);
    }
    
    return results;
  }
  
  /**
   * Find contact matches (email addresses, usernames, etc.)
   */
  private async findContactMatches(
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];
    
    try {
      // Extract contact information
      const contacts = this.extractContactInformation(entityType, entityData);
      
      if (!contacts || contacts.length === 0) {
        return results;
      }
      
      // Find entities with matching contact info
      for (const contact of contacts) {
        const matches = await this.findEntitiesWithMatchingContact(contact);
        
        for (const match of matches) {
          // Skip if it's the same entity
          if (match.type === entityType && match.id === entityId) {
            continue;
          }
          
          // Get match data
          const matchData = await this.getEntityData(match.type, match.id);
          
          if (!matchData) {
            continue;
          }
          
          results.push({
            sourceEntity: {
              type: entityType,
              id: entityId,
              name: this.getEntityName(entityType, entityData)
            },
            matchedEntity: {
              type: match.type,
              id: match.id,
              name: this.getEntityName(match.type, matchData)
            },
            matchType: CorrelationMatchType.EXACT,
            confidence: 0.9,
            strategy: CorrelationStrategy.CONTACT_MATCHING,
            metadata: {
              contactType: contact.type,
              contactValue: contact.value
            }
          });
        }
      }
    } catch (error) {
      logger.error(`Error in contact matching correlation`, error);
    }
    
    return results;
  }
  
  /**
   * Find correlations based on project context
   */
  private async findProjectContextCorrelations(
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];
    
    try {
      // Get project ID
      const projectId = this.getEntityProjectId(entityType, entityData);
      
      if (!projectId) {
        return results;
      }
      
      // Get entities in the same project with temporal proximity
      const projectEntities = await this.getEntitiesInProject(projectId, entityType, entityId);
      
      for (const projectEntity of projectEntities) {
        // Get entity data
        const matchData = await this.getEntityData(projectEntity.type, projectEntity.id);
        
        if (!matchData) {
          continue;
        }
        
        // Use project context plus temporal proximity for higher confidence
        const entityDate = this.getEntityCreationDate(entityType, entityData);
        const matchDate = this.getEntityCreationDate(projectEntity.type, matchData);
        
        let confidence = 0.6; // Base confidence for same project
        
        // Increase confidence based on temporal proximity if dates are available
        if (entityDate && matchDate) {
          const timeDiffMs = Math.abs(entityDate.getTime() - matchDate.getTime());
          const daysDiff = timeDiffMs / (1000 * 60 * 60 * 24);
          
          if (daysDiff < 1) {
            confidence += 0.3; // Same day, high confidence
          } else if (daysDiff < 7) {
            confidence += 0.2; // Same week
          } else if (daysDiff < 30) {
            confidence += 0.1; // Same month
          }
        }
        
        // Determine match type
        let matchType = CorrelationMatchType.MEDIUM;
        if (confidence > 0.8) {
          matchType = CorrelationMatchType.HIGH;
        } else if (confidence < 0.7) {
          matchType = CorrelationMatchType.LOW;
        }
        
        results.push({
          sourceEntity: {
            type: entityType,
            id: entityId,
            name: this.getEntityName(entityType, entityData)
          },
          matchedEntity: {
            type: projectEntity.type,
            id: projectEntity.id,
            name: this.getEntityName(projectEntity.type, matchData)
          },
          matchType,
          confidence,
          strategy: CorrelationStrategy.PROJECT_CONTEXT,
          metadata: {
            projectId,
            entityCreatedAt: entityDate?.toISOString(),
            matchCreatedAt: matchDate?.toISOString()
          }
        });
      }
    } catch (error) {
      logger.error(`Error in project context correlation`, error);
    }
    
    return results;
  }
  
  /**
   * Find semantic similarities between entities
   * Note: This requires embedding vectors and semantic search capabilities
   */
  private async findSemanticSimilarities(
    entityType: EntityType,
    entityId: number,
    entityData: any
  ): Promise<CorrelationResult[]> {
    // Placeholder implementation - in a real implementation, this would use
    // embedding vectors and semantic search capabilities
    return [];
  }
  
  /**
   * Get entity data based on type and ID
   */
  private async getEntityData(
    entityType: EntityType,
    entityId: number
  ): Promise<any> {
    try {
      switch (entityType) {
        case 'project':
          return await storage.getProject(entityId);
          
        case 'task':
          return await storage.getTask(entityId);
          
        case 'document':
          return await storage.getDocument(entityId);
          
        case 'user':
          return await storage.getUser(entityId);
          
        case 'team':
          return await storage.getTeam(entityId);
          
        case 'integration':
          return await storage.getIntegration(entityId);
          
        case 'insight':
          return await storage.getInsight(entityId);
          
        default:
          logger.warn(`Unhandled entity type: ${entityType}`);
          return null;
      }
    } catch (error) {
      logger.error(`Error getting entity data for ${entityType}:${entityId}`, error);
      return null;
    }
  }
  
  /**
   * Extract text content from entity data
   */
  private extractTextContent(entityType: EntityTypeEnum, entityData: any): string {
    if (!entityData) return '';
    
    switch (entityType) {
      case EntityTypeEnum.DOCUMENT:
        return entityData.content || '';
        
      case EntityTypeEnum.TASK:
        return `${entityData.title} ${entityData.description || ''}`;
        
      case EntityTypeEnum.PROJECT:
        return `${entityData.name} ${entityData.description || ''}`;
        
      case EntityTypeEnum.INSIGHT:
        return entityData.content || '';
        
      case EntityTypeEnum.USER:
        return `${entityData.fullName} ${entityData.username}`;
        
      case EntityTypeEnum.TEAM:
        return `${entityData.name} ${entityData.description || ''}`;
        
      default:
        return '';
    }
  }
  
  /**
   * Get entity name for display
   */
  private getEntityName(entityType: EntityTypeEnum, entityData: any): string {
    if (!entityData) return 'Unknown';
    
    switch (entityType) {
      case EntityTypeEnum.DOCUMENT:
        return entityData.title || 'Untitled Document';
        
      case EntityTypeEnum.TASK:
        return entityData.title || 'Untitled Task';
        
      case EntityTypeEnum.PROJECT:
        return entityData.name || 'Untitled Project';
        
      case EntityTypeEnum.USER:
        return entityData.fullName || entityData.username || 'Unknown User';
        
      case EntityTypeEnum.TEAM:
        return entityData.name || 'Untitled Team';
        
      case EntityTypeEnum.INTEGRATION:
        return entityData.name || 'Unnamed Integration';
        
      case EntityTypeEnum.INSIGHT:
        return 'Insight';
        
      default:
        return 'Unknown Entity';
    }
  }
  
  /**
   * Get entity creation date
   */
  private getEntityCreationDate(entityType: EntityTypeEnum, entityData: any): Date | null {
    if (!entityData) return null;
    
    try {
      if (entityData.createdAt) {
        return new Date(entityData.createdAt);
      }
      
      // Fallbacks for entities without standard createdAt
      switch (entityType) {
        case EntityTypeEnum.INSIGHT:
          return entityData.timestamp ? new Date(entityData.timestamp) : null;
          
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error getting creation date for ${entityType}`, error);
      return null;
    }
  }
  
  /**
   * Get potential matches for an entity
   */
  private async getPotentialMatches(
    entityType: EntityTypeEnum,
    entityId: number
  ): Promise<Array<{ type: EntityTypeEnum, id: number }>> {
    const matches: Array<{ type: EntityTypeEnum, id: number }> = [];
    
    // If restricting to specific entity types, filter accordingly
    const targetEntityTypes = this.options.restrictToEntityTypes || 
      Object.values(EntityTypeEnum);
    
    // Get project ID if restricting to a project
    const projectId = this.options.restrictToProject;
    
    // Add potential matches for each entity type
    for (const targetType of targetEntityTypes) {
      // Skip if it's the same entity type and we're not interested in cross-referencing
      if (targetType === entityType && !this.options.includeExistingRelationships) {
        continue;
      }
      
      try {
        // Get entities by type and project
        const entities = await this.getEntitiesByTypeAndProject(targetType, projectId);
        
        // Add to matches
        for (const entity of entities) {
          if (!(targetType === entityType && entity.id === entityId)) {
            matches.push({
              type: targetType,
              id: entity.id
            });
          }
        }
      } catch (error) {
        logger.error(`Error getting potential matches for ${targetType}`, error);
      }
    }
    
    return matches;
  }
  
  /**
   * Get entities by type and project
   */
  private async getEntitiesByTypeAndProject(
    entityType: EntityTypeEnum,
    projectId?: number
  ): Promise<Array<{ id: number }>> {
    try {
      switch (entityType) {
        case EntityTypeEnum.DOCUMENT:
          return projectId 
            ? await storage.getDocuments(projectId)
            : await storage.getRecentDocuments(100);
          
        case EntityTypeEnum.TASK:
          return projectId
            ? await storage.getTasks(projectId)
            : [];
          
        case EntityTypeEnum.PROJECT:
          return await storage.getProjects(100);
          
        case EntityTypeEnum.USER:
          return await storage.getUsers();
          
        case EntityTypeEnum.TEAM:
          return await storage.getTeams();
          
        case EntityTypeEnum.INSIGHT:
          return projectId
            ? await storage.getInsights(projectId)
            : [];
          
        default:
          return [];
      }
    } catch (error) {
      logger.error(`Error getting entities by type ${entityType}`, error);
      return [];
    }
  }
  
  /**
   * Calculate text similarity between two strings
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    // Simple implementation based on word overlap
    if (!text1 || !text2 || text1.length < 10 || text2.length < 10) {
      return 0;
    }
    
    // Normalize and tokenize both texts
    const words1 = this.tokenizeText(text1);
    const words2 = this.tokenizeText(text2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }
    
    // Calculate Jaccard similarity coefficient
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }
  
  /**
   * Tokenize text into words
   */
  private tokenizeText(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.isStopWord(word));
  }
  
  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with',
      'by', 'is', 'was', 'were', 'be', 'been', 'being', 'are', 'this',
      'that', 'these', 'those', 'of', 'from'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
  
  /**
   * Extract reference identifiers from an entity
   */
  private extractReferenceIdentifiers(
    entityType: EntityTypeEnum,
    entityData: any
  ): Array<{ type: string, value: string }> {
    const references: Array<{ type: string, value: string }> = [];
    
    if (!entityData) return references;
    
    try {
      switch (entityType) {
        case EntityTypeEnum.DOCUMENT:
          // Extract references from document content
          if (entityData.content) {
            // Extract message IDs for emails
            if (entityData.metadata?.emailSpecific?.messageId) {
              references.push({
                type: 'messageId',
                value: entityData.metadata.emailSpecific.messageId
              });
            }
            
            // Extract thread IDs
            if (entityData.metadata?.emailSpecific?.threadId) {
              references.push({
                type: 'threadId',
                value: entityData.metadata.emailSpecific.threadId
              });
            }
            
            // Extract parent message IDs
            if (entityData.metadata?.emailSpecific?.parentMessageId) {
              references.push({
                type: 'parentMessageId',
                value: entityData.metadata.emailSpecific.parentMessageId
              });
            }
            
            // Check for any reference IDs in the content
            const referenceMatches = entityData.content.match(/\b(REF|ID|JIRA|TICKET)[-:]([A-Z0-9-]+)\b/gi);
            if (referenceMatches) {
              for (const match of referenceMatches) {
                references.push({
                  type: 'externalReference',
                  value: match
                });
              }
            }
            
            // Extract URLs
            const urlMatches = entityData.content.match(/https?:\/\/[^\s<>"']+/g);
            if (urlMatches) {
              for (const url of urlMatches) {
                references.push({
                  type: 'url',
                  value: url
                });
              }
            }
          }
          break;
          
        case EntityTypeEnum.TASK:
          // Extract task references
          if (entityData.metadata?.externalId) {
            references.push({
              type: 'externalTaskId',
              value: entityData.metadata.externalId
            });
          }
          break;
          
        // Add more entity types as needed
      }
    } catch (error) {
      logger.error(`Error extracting references from ${entityType}`, error);
    }
    
    return references;
  }
  
  /**
   * Find entities matching a reference
   */
  private async findEntitiesMatchingReference(
    reference: { type: string, value: string }
  ): Promise<Array<{ type: EntityTypeEnum, id: number }>> {
    const matches: Array<{ type: EntityTypeEnum, id: number }> = [];
    
    try {
      switch (reference.type) {
        case 'messageId':
        case 'threadId':
        case 'parentMessageId':
          // Search for documents with matching message IDs
          // This would ideally use a database query directly
          const documents = await storage.getRecentDocuments(1000);
          
          for (const doc of documents) {
            if (doc.metadata?.emailSpecific?.[reference.type] === reference.value) {
              matches.push({
                type: EntityTypeEnum.DOCUMENT,
                id: doc.id
              });
            }
          }
          break;
          
        case 'externalTaskId':
          // Search for tasks with matching external IDs
          const tasks = await this.getAllTasks();
          
          for (const task of tasks) {
            if (task.metadata?.externalId === reference.value) {
              matches.push({
                type: EntityTypeEnum.TASK,
                id: task.id
              });
            }
          }
          break;
          
        // Add more reference types as needed
      }
    } catch (error) {
      logger.error(`Error finding entities matching reference ${reference.type}`, error);
    }
    
    return matches;
  }
  
  /**
   * Find entities within a time window
   */
  private async findEntitiesInTimeWindow(
    minDate: Date,
    maxDate: Date,
    excludeEntityType?: EntityTypeEnum,
    excludeEntityId?: number
  ): Promise<Array<{ type: EntityTypeEnum, id: number }>> {
    const matches: Array<{ type: EntityTypeEnum, id: number }> = [];
    
    try {
      // Get all entities (would be more efficient with direct database query)
      const entityTypes = this.options.restrictToEntityTypes || 
        Object.values(EntityTypeEnum);
      
      for (const entityType of entityTypes) {
        if (entityType === excludeEntityType && this.options.includeExistingRelationships === false) {
          continue;
        }
        
        // Get entities of this type
        const entities = await this.getEntitiesByTypeAndProject(
          entityType,
          this.options.restrictToProject
        );
        
        for (const entity of entities) {
          // Skip excluded entity
          if (entityType === excludeEntityType && entity.id === excludeEntityId) {
            continue;
          }
          
          // Get entity data
          const entityData = await this.getEntityData(entityType, entity.id);
          
          if (!entityData) {
            continue;
          }
          
          // Check creation date
          const creationDate = this.getEntityCreationDate(entityType, entityData);
          
          if (creationDate && 
              creationDate >= minDate && 
              creationDate <= maxDate) {
            matches.push({
              type: entityType,
              id: entity.id
            });
          }
        }
      }
    } catch (error) {
      logger.error(`Error finding entities in time window`, error);
    }
    
    return matches;
  }
  
  /**
   * Extract contact information from entity
   */
  private extractContactInformation(
    entityType: EntityTypeEnum,
    entityData: any
  ): Array<{ type: string, value: string }> {
    const contacts: Array<{ type: string, value: string }> = [];
    
    if (!entityData) return contacts;
    
    try {
      switch (entityType) {
        case EntityTypeEnum.DOCUMENT:
          // Extract email addresses for email-type documents
          if (entityData.metadata?.emailSpecific) {
            // From address
            if (entityData.metadata.emailSpecific.from) {
              contacts.push({
                type: 'email',
                value: this.extractEmailAddress(entityData.metadata.emailSpecific.from)
              });
            }
            
            // To addresses
            if (Array.isArray(entityData.metadata.emailSpecific.to)) {
              for (const to of entityData.metadata.emailSpecific.to) {
                contacts.push({
                  type: 'email',
                  value: this.extractEmailAddress(to)
                });
              }
            }
            
            // Cc addresses
            if (Array.isArray(entityData.metadata.emailSpecific.cc)) {
              for (const cc of entityData.metadata.emailSpecific.cc) {
                contacts.push({
                  type: 'email',
                  value: this.extractEmailAddress(cc)
                });
              }
            }
          }
          
          // Extract email addresses from content
          if (entityData.content) {
            const emailMatches = entityData.content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
            if (emailMatches) {
              for (const email of emailMatches) {
                contacts.push({
                  type: 'email',
                  value: email.toLowerCase()
                });
              }
            }
          }
          break;
          
        case EntityTypeEnum.USER:
          // User email
          if (entityData.email) {
            contacts.push({
              type: 'email',
              value: entityData.email.toLowerCase()
            });
          }
          break;
          
        // Add more entity types as needed
      }
    } catch (error) {
      logger.error(`Error extracting contact information from ${entityType}`, error);
    }
    
    return contacts;
  }
  
  /**
   * Extract email address from a string (possibly with name)
   */
  private extractEmailAddress(emailString: string): string {
    // Handle format like "Name <email@example.com>"
    const match = emailString.match(/<([^>]+)>/);
    if (match) {
      return match[1].toLowerCase();
    }
    
    // Check if it's already just an email address
    if (emailString.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/)) {
      return emailString.toLowerCase();
    }
    
    return emailString.toLowerCase();
  }
  
  /**
   * Find entities with matching contact information
   */
  private async findEntitiesWithMatchingContact(
    contact: { type: string, value: string }
  ): Promise<Array<{ type: EntityTypeEnum, id: number }>> {
    const matches: Array<{ type: EntityTypeEnum, id: number }> = [];
    
    try {
      if (contact.type === 'email') {
        // Find users with matching email
        const users = await storage.getUsers();
        
        for (const user of users) {
          if (user.email && user.email.toLowerCase() === contact.value.toLowerCase()) {
            matches.push({
              type: EntityTypeEnum.USER,
              id: user.id
            });
          }
        }
        
        // Find documents with matching email metadata
        const documents = await storage.getRecentDocuments(1000);
        
        for (const doc of documents) {
          if (doc.metadata?.emailSpecific) {
            // Check From field
            if (doc.metadata.emailSpecific.from && 
                this.extractEmailAddress(doc.metadata.emailSpecific.from) === contact.value.toLowerCase()) {
              matches.push({
                type: EntityTypeEnum.DOCUMENT,
                id: doc.id
              });
              continue; // Skip further checks for this doc
            }
            
            // Check To field
            if (Array.isArray(doc.metadata.emailSpecific.to)) {
              const hasMatch = doc.metadata.emailSpecific.to.some(
                to => this.extractEmailAddress(to) === contact.value.toLowerCase()
              );
              
              if (hasMatch) {
                matches.push({
                  type: EntityTypeEnum.DOCUMENT,
                  id: doc.id
                });
                continue; // Skip further checks for this doc
              }
            }
            
            // Check Cc field
            if (Array.isArray(doc.metadata.emailSpecific.cc)) {
              const hasMatch = doc.metadata.emailSpecific.cc.some(
                cc => this.extractEmailAddress(cc) === contact.value.toLowerCase()
              );
              
              if (hasMatch) {
                matches.push({
                  type: EntityTypeEnum.DOCUMENT,
                  id: doc.id
                });
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Error finding entities with matching contact`, error);
    }
    
    return matches;
  }
  
  /**
   * Get entity project ID
   */
  private getEntityProjectId(entityType: EntityTypeEnum, entityData: any): number | null {
    if (!entityData) return null;
    
    try {
      switch (entityType) {
        case EntityTypeEnum.DOCUMENT:
        case EntityTypeEnum.TASK:
        case EntityTypeEnum.INSIGHT:
          return entityData.projectId || null;
          
        case EntityTypeEnum.PROJECT:
          return entityData.id;
          
        default:
          return null;
      }
    } catch (error) {
      logger.error(`Error getting project ID for ${entityType}`, error);
      return null;
    }
  }
  
  /**
   * Get entities in a project
   */
  private async getEntitiesInProject(
    projectId: number,
    excludeEntityType?: EntityTypeEnum,
    excludeEntityId?: number
  ): Promise<Array<{ type: EntityTypeEnum, id: number }>> {
    const entities: Array<{ type: EntityTypeEnum, id: number }> = [];
    
    try {
      // Get documents in project
      if (excludeEntityType !== EntityTypeEnum.DOCUMENT || this.options.includeExistingRelationships) {
        const documents = await storage.getDocuments(projectId);
        
        for (const doc of documents) {
          if (!(excludeEntityType === EntityTypeEnum.DOCUMENT && doc.id === excludeEntityId)) {
            entities.push({
              type: EntityTypeEnum.DOCUMENT,
              id: doc.id
            });
          }
        }
      }
      
      // Get tasks in project
      if (excludeEntityType !== EntityTypeEnum.TASK || this.options.includeExistingRelationships) {
        const tasks = await storage.getTasks(projectId);
        
        for (const task of tasks) {
          if (!(excludeEntityType === EntityTypeEnum.TASK && task.id === excludeEntityId)) {
            entities.push({
              type: EntityTypeEnum.TASK,
              id: task.id
            });
          }
        }
      }
      
      // Get insights in project
      if (excludeEntityType !== EntityTypeEnum.INSIGHT || this.options.includeExistingRelationships) {
        const insights = await storage.getInsights(projectId);
        
        for (const insight of insights) {
          if (!(excludeEntityType === EntityTypeEnum.INSIGHT && insight.id === excludeEntityId)) {
            entities.push({
              type: EntityTypeEnum.INSIGHT,
              id: insight.id
            });
          }
        }
      }
      
      // Get the project itself
      if ((excludeEntityType !== EntityTypeEnum.PROJECT || this.options.includeExistingRelationships) && 
          !(excludeEntityType === EntityTypeEnum.PROJECT && projectId === excludeEntityId)) {
        entities.push({
          type: EntityTypeEnum.PROJECT,
          id: projectId
        });
      }
    } catch (error) {
      logger.error(`Error getting entities in project ${projectId}`, error);
    }
    
    return entities;
  }
  
  /**
   * Get all tasks (helper method)
   */
  private async getAllTasks(): Promise<any[]> {
    try {
      if (this.options.restrictToProject) {
        return await storage.getTasks(this.options.restrictToProject);
      }
      
      // If no project restriction, get tasks for all projects
      // This would be more efficient with a dedicated storage method
      const projects = await storage.getProjects();
      const allTasks: any[] = [];
      
      for (const project of projects) {
        const tasks = await storage.getTasks(project.id);
        allTasks.push(...tasks);
      }
      
      return allTasks;
    } catch (error) {
      logger.error(`Error getting all tasks`, error);
      return [];
    }
  }
  
  /**
   * Deduplicate and merge correlation results
   */
  private deduplicateAndMergeResults(results: CorrelationResult[]): CorrelationResult[] {
    // Group by source and target entity
    const groupedResults = new Map<string, CorrelationResult[]>();
    
    for (const result of results) {
      const key = `${result.sourceEntity.type}:${result.sourceEntity.id}_${result.matchedEntity.type}:${result.matchedEntity.id}`;
      
      if (!groupedResults.has(key)) {
        groupedResults.set(key, []);
      }
      
      groupedResults.get(key)!.push(result);
    }
    
    // Merge each group
    const mergedResults: CorrelationResult[] = [];
    
    for (const group of groupedResults.values()) {
      if (group.length === 1) {
        // Just add the single result
        mergedResults.push(group[0]);
      } else {
        // Merge multiple results
        const firstResult = group[0];
        
        // Calculate average confidence weighted by strategy importance
        const totalWeight = group.reduce((sum, r) => sum + this.getStrategyWeight(r.strategy), 0);
        
        const weightedConfidence = group.reduce((sum, r) => {
          return sum + (r.confidence * this.getStrategyWeight(r.strategy));
        }, 0) / totalWeight;
        
        // Determine the best match type (use the highest confidence one)
        const bestMatch = group.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        
        // Merge the metadata
        const mergedMetadata: any = {};
        
        for (const result of group) {
          if (result.metadata) {
            for (const [key, value] of Object.entries(result.metadata)) {
              mergedMetadata[`${result.strategy}_${key}`] = value;
            }
          }
        }
        
        // Create the merged result
        mergedResults.push({
          sourceEntity: firstResult.sourceEntity,
          matchedEntity: firstResult.matchedEntity,
          matchType: bestMatch.matchType,
          confidence: weightedConfidence,
          strategy: CorrelationStrategy.COMBINED,
          metadata: {
            usedStrategies: group.map(r => r.strategy),
            individualConfidences: group.reduce((obj, r) => {
              obj[r.strategy] = r.confidence;
              return obj;
            }, {} as Record<string, number>),
            ...mergedMetadata
          }
        });
      }
    }
    
    return mergedResults;
  }
  
  /**
   * Get weight for a correlation strategy
   */
  private getStrategyWeight(strategy: CorrelationStrategy): number {
    // Assign different weights to different strategies
    switch (strategy) {
      case CorrelationStrategy.REFERENCE_MATCHING:
        return 10;
        
      case CorrelationStrategy.CONTACT_MATCHING:
        return 8;
        
      case CorrelationStrategy.SEMANTIC_SIMILARITY:
        return 7;
        
      case CorrelationStrategy.TEXT_SIMILARITY:
        return 6;
        
      case CorrelationStrategy.PROJECT_CONTEXT:
        return 4;
        
      case CorrelationStrategy.TEMPORAL_PROXIMITY:
        return 3;
        
      default:
        return 1;
    }
  }
}