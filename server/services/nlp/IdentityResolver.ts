/**
 * Identity Resolution
 * 
 * Resolves entity identities across documents, connecting mentions of the
 * same entity even when they appear in different forms.
 */

import { DocumentEntity } from './AdvancedNLPProcessor';
import * as natural from 'natural';

// Identity confidence levels
export enum ConfidenceLevel {
  VERY_HIGH = 'VERY_HIGH',  // Near-exact match
  HIGH = 'HIGH',            // Strong confidence
  MEDIUM = 'MEDIUM',        // Reasonable confidence
  LOW = 'LOW',              // Possible match, but uncertain
  VERY_LOW = 'VERY_LOW'     // Weak indicator of a match
}

// Identity resolution match
export interface IdentityMatch {
  sourceEntity: DocumentEntity;
  matchedEntity: DocumentEntity;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  matchReason: string;
}

// Identity resolver options
export interface IdentityResolverOptions {
  exactMatchThreshold: number;
  strongMatchThreshold: number;
  moderateMatchThreshold: number;
  weakMatchThreshold: number;
  useFuzzyMatching: boolean;
  maxFuzzyDistance: number;
  sameTypeFactor: number;
  useContextualMatching: boolean;
}

/**
 * Identity Resolver class
 */
export class IdentityResolver {
  private options: IdentityResolverOptions;
  private knownEntities: DocumentEntity[];
  private metaphone: typeof natural.Metaphone;
  
  constructor(options: Partial<IdentityResolverOptions> = {}) {
    // Default options
    this.options = {
      exactMatchThreshold: 0.95,   // 95% similarity for exact match
      strongMatchThreshold: 0.8,   // 80% similarity for strong match
      moderateMatchThreshold: 0.6, // 60% similarity for moderate match
      weakMatchThreshold: 0.4,     // 40% similarity for weak match
      useFuzzyMatching: true,     
      maxFuzzyDistance: 2,         // Allow up to 2 edit distance for fuzzy match
      sameTypeFactor: 0.2,         // Add 0.2 to score if entities are same type
      useContextualMatching: true,
      ...options
    };
    
    this.knownEntities = [];
    this.metaphone = natural.Metaphone;
  }
  
  /**
   * Add known entities for matching
   */
  public addKnownEntities(entities: DocumentEntity[]): void {
    this.knownEntities.push(...entities);
  }
  
  /**
   * Clear known entities
   */
  public clearKnownEntities(): void {
    this.knownEntities = [];
  }
  
  /**
   * Find matches for a given entity
   */
  public findMatches(entity: DocumentEntity): IdentityMatch[] {
    const matches: IdentityMatch[] = [];
    
    for (const knownEntity of this.knownEntities) {
      // Skip comparisons with self
      if (
        entity.text === knownEntity.text && 
        entity.startIndex === knownEntity.startIndex && 
        entity.endIndex === knownEntity.endIndex
      ) {
        continue;
      }
      
      // Calculate match confidence
      const { confidence, reason } = this.calculateMatchConfidence(entity, knownEntity);
      
      // Determine confidence level
      const confidenceLevel = this.determineConfidenceLevel(confidence);
      
      // Add match if above threshold
      if (confidence >= this.options.weakMatchThreshold) {
        matches.push({
          sourceEntity: entity,
          matchedEntity: knownEntity,
          confidence,
          confidenceLevel,
          matchReason: reason
        });
      }
    }
    
    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);
    
    return matches;
  }
  
  /**
   * Calculate match confidence between two entities
   */
  private calculateMatchConfidence(
    entityA: DocumentEntity, 
    entityB: DocumentEntity
  ): { confidence: number; reason: string } {
    let confidence = 0;
    let reasons: string[] = [];
    
    // Check for exact text match
    if (entityA.text === entityB.text) {
      confidence = 0.95; // Near-exact match
      reasons.push('Exact text match');
    } 
    // Check for case-insensitive match
    else if (entityA.text.toLowerCase() === entityB.text.toLowerCase()) {
      confidence = 0.9; // Strong match with different case
      reasons.push('Case-insensitive match');
    }
    // Check for fuzzy match
    else if (this.options.useFuzzyMatching) {
      const distance = natural.LevenshteinDistance(
        entityA.text.toLowerCase(), 
        entityB.text.toLowerCase(), 
        { insertion_cost: 1, deletion_cost: 1, substitution_cost: 1 }
      );
      
      // Check if distance is within tolerance
      if (distance <= this.options.maxFuzzyDistance) {
        // Scale confidence based on distance and length
        const maxLength = Math.max(entityA.text.length, entityB.text.length);
        const fuzzyConfidence = Math.max(0, 1 - (distance / maxLength));
        
        confidence = Math.max(confidence, fuzzyConfidence * 0.8);
        reasons.push(`Fuzzy match (distance: ${distance})`);
      }
      
      // Check for metaphone (phonetic) match
      const phoneticA = this.metaphone.process(entityA.text);
      const phoneticB = this.metaphone.process(entityB.text);
      
      if (phoneticA === phoneticB) {
        confidence = Math.max(confidence, 0.75);
        reasons.push('Phonetic match');
      }
    }
    
    // Adjust confidence if entities are of the same type
    if (entityA.type === entityB.type) {
      confidence += this.options.sameTypeFactor;
      reasons.push(`Same entity type (${entityA.type})`);
    }
    
    // Cap confidence at 0.99
    confidence = Math.min(0.99, confidence);
    
    return {
      confidence,
      reason: reasons.join(', ')
    };
  }
  
  /**
   * Determine confidence level from numerical score
   */
  private determineConfidenceLevel(confidence: number): ConfidenceLevel {
    if (confidence >= this.options.exactMatchThreshold) {
      return ConfidenceLevel.VERY_HIGH;
    } else if (confidence >= this.options.strongMatchThreshold) {
      return ConfidenceLevel.HIGH;
    } else if (confidence >= this.options.moderateMatchThreshold) {
      return ConfidenceLevel.MEDIUM;
    } else if (confidence >= this.options.weakMatchThreshold) {
      return ConfidenceLevel.LOW;
    } else {
      return ConfidenceLevel.VERY_LOW;
    }
  }
  
  /**
   * Find all identity clusters in a set of entities
   */
  public findIdentityClusters(entities: DocumentEntity[]): DocumentEntity[][] {
    // Add entities to known entities
    this.addKnownEntities(entities);
    
    // Create initial clusters (each entity in its own cluster)
    const clusters: Set<DocumentEntity>[] = entities.map(entity => new Set([entity]));
    
    // Find matches for each entity
    for (const entity of entities) {
      const matches = this.findMatches(entity);
      
      // Process strong matches
      for (const match of matches) {
        if (
          match.confidenceLevel === ConfidenceLevel.VERY_HIGH || 
          match.confidenceLevel === ConfidenceLevel.HIGH
        ) {
          // Find clusters for both entities
          const sourceClusterIndex = this.findClusterIndex(clusters, match.sourceEntity);
          const targetClusterIndex = this.findClusterIndex(clusters, match.matchedEntity);
          
          // If entities are in different clusters, merge them
          if (sourceClusterIndex !== targetClusterIndex) {
            this.mergeClusters(clusters, sourceClusterIndex, targetClusterIndex);
          }
        }
      }
    }
    
    // Convert to array of arrays
    return clusters
      .filter(cluster => cluster.size > 0) // Remove empty clusters
      .map(cluster => Array.from(cluster));
  }
  
  /**
   * Find the index of the cluster containing an entity
   */
  private findClusterIndex(clusters: Set<DocumentEntity>[], entity: DocumentEntity): number {
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      
      for (const clusterEntity of cluster) {
        if (this.areEntitiesEqual(clusterEntity, entity)) {
          return i;
        }
      }
    }
    
    return -1; // Not found
  }
  
  /**
   * Merge two clusters
   */
  private mergeClusters(
    clusters: Set<DocumentEntity>[], 
    sourceIndex: number, 
    targetIndex: number
  ): void {
    // If either index is invalid, do nothing
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      return;
    }
    
    // Get clusters
    const sourceCluster = clusters[sourceIndex];
    const targetCluster = clusters[targetIndex];
    
    // Add all entities from source to target
    for (const entity of sourceCluster) {
      targetCluster.add(entity);
    }
    
    // Clear source cluster
    sourceCluster.clear();
  }
  
  /**
   * Check if two entities are the same (reference equality)
   */
  private areEntitiesEqual(entityA: DocumentEntity, entityB: DocumentEntity): boolean {
    return (
      entityA.text === entityB.text &&
      entityA.startIndex === entityB.startIndex &&
      entityA.endIndex === entityB.endIndex
    );
  }
  
  /**
   * Create canonical forms for entities in a cluster
   */
  public createCanonicalForms(clusters: DocumentEntity[][]): Record<string, DocumentEntity>[] {
    return clusters.map(cluster => {
      // Find the best entity to serve as canonical form
      const bestEntity = this.findBestCanonicalEntity(cluster);
      
      // Create canonical form record
      const canonical: Record<string, DocumentEntity> = {
        canonical: bestEntity
      };
      
      // Add all entities in the cluster
      for (let i = 0; i < cluster.length; i++) {
        canonical[`variant_${i}`] = cluster[i];
      }
      
      return canonical;
    });
  }
  
  /**
   * Find the best entity to serve as canonical form
   */
  private findBestCanonicalEntity(cluster: DocumentEntity[]): DocumentEntity {
    if (cluster.length === 0) {
      throw new Error('Cannot find canonical form in empty cluster');
    }
    
    if (cluster.length === 1) {
      return cluster[0];
    }
    
    // Score entities based on various factors
    const scores = cluster.map(entity => {
      let score = 0;
      
      // Prefer longer entity names
      score += entity.text.length * 0.1;
      
      // Prefer entities with higher confidence
      score += entity.confidence * 5;
      
      // Prefer proper case over all lowercase or all uppercase
      if (this.isProperCase(entity.text)) {
        score += 3;
      } else if (this.isAllCaps(entity.text)) {
        score += 1;
      }
      
      // Prefer PERSON, ORGANIZATION, LOCATION types
      if (['PERSON', 'ORGANIZATION', 'LOCATION'].includes(entity.type)) {
        score += 2;
      }
      
      return { entity, score };
    });
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    // Return highest scoring entity
    return scores[0].entity;
  }
  
  /**
   * Check if text is in proper case (first letter of each word capitalized)
   */
  private isProperCase(text: string): boolean {
    const words = text.split(/\s+/);
    
    return words.every(word => 
      word.length > 0 && 
      word[0] === word[0].toUpperCase() && 
      word.slice(1) === word.slice(1).toLowerCase()
    );
  }
  
  /**
   * Check if text is all uppercase
   */
  private isAllCaps(text: string): boolean {
    return text === text.toUpperCase();
  }
  
  /**
   * Get a formatted report of identity matches
   */
  public formatMatchesReport(matches: IdentityMatch[]): string {
    if (matches.length === 0) {
      return 'No identity matches found.';
    }
    
    let report = 'Identity Matches:\n\n';
    
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      
      report += `Match ${i+1}:\n`;
      report += `Source: "${match.sourceEntity.text}" (${match.sourceEntity.type})\n`;
      report += `Target: "${match.matchedEntity.text}" (${match.matchedEntity.type})\n`;
      report += `Confidence: ${(match.confidence * 100).toFixed(1)}% (${match.confidenceLevel})\n`;
      report += `Reason: ${match.matchReason}\n\n`;
    }
    
    return report;
  }
}