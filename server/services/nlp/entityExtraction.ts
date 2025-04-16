/**
 * NLP Entity Extraction Service
 * 
 * This service provides natural language processing capabilities for extracting
 * entities, references, and other patterns from text content.
 */

import { logger } from '../observability';
import { metrics } from '../observability/metrics-util';
import { openaiService } from '../openai';
import { EntityType } from '@shared/schema';
import * as winkNLP from 'wink-nlp';
import model from 'wink-eng-lite-web-model';
import * as compromise from 'compromise';
import { natural } from 'natural';

// Initialize NLP libraries
const nlp = winkNLP(model);
const its = nlp.its;
const as = nlp.as;

// Reference pattern types
export enum ReferencePatternType {
  URL = 'url',
  EMAIL = 'email',
  DOCUMENT_ID = 'document_id',
  TICKET_ID = 'ticket_id',
  USER_MENTION = 'user_mention',
  CHANNEL_MENTION = 'channel_mention',
  THREAD_REFERENCE = 'thread_reference'
}

// Entity interface
export interface Entity {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
  metadata?: any;
}

// Reference pattern interface
export interface ReferencePattern {
  id: string;
  type: ReferencePatternType;
  context: string;
  confidence: number;
}

/**
 * Extract entities from text using local NLP libraries
 */
export async function findEntities(text: string): Promise<Entity[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const startTime = Date.now();
  const entities: Entity[] = [];
  
  try {
    // Process with winkNLP
    const doc = nlp.readDoc(text);
    
    // Extract named entities
    const namedEntities = doc.entities().out(its.detail);
    
    for (const entity of namedEntities) {
      entities.push({
        text: entity.value,
        type: mapEntityType(entity.type),
        startIndex: entity.span[0],
        endIndex: entity.span[1],
        confidence: 0.85 // Wink doesn't provide confidence scores
      });
    }
    
    // Process with compromise for additional entities
    const doc2 = compromise(text);
    
    // Extract organizations, people, and places
    const orgs = doc2.organizations().out('array');
    const people = doc2.people().out('array');
    const places = doc2.places().out('array');
    
    // Add compromise entities (avoiding duplicates)
    addCompromiseEntities(entities, orgs, EntityType.ORGANIZATION);
    addCompromiseEntities(entities, people, EntityType.PERSON);
    addCompromiseEntities(entities, places, EntityType.LOCATION);
    
    // Extract dates and times
    const dates = doc2.dates().out('array');
    addCompromiseEntities(entities, dates, EntityType.DATE);
    
    metrics.histogram('nlp_entity_extraction_duration', Date.now() - startTime);
    metrics.increment('nlp_operations_total', { type: 'entity_extraction' });
    
    return entities;
  } catch (error) {
    logger.error('Error extracting entities from text', { error });
    metrics.increment('nlp_errors_total', { type: 'entity_extraction' });
    
    // Return any entities found before the error
    return entities;
  }
}

/**
 * Find reference patterns in text
 */
export async function findReferencePatterns(text: string): Promise<ReferencePattern[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const startTime = Date.now();
  const patterns: ReferencePattern[] = [];
  
  try {
    // Find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = text.match(urlRegex) || [];
    
    for (const url of urls) {
      const contextStart = Math.max(0, text.indexOf(url) - 30);
      const contextEnd = Math.min(text.length, text.indexOf(url) + url.length + 30);
      
      patterns.push({
        id: url,
        type: ReferencePatternType.URL,
        context: text.substring(contextStart, contextEnd),
        confidence: 0.9
      });
    }
    
    // Find email addresses
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    const emails = text.match(emailRegex) || [];
    
    for (const email of emails) {
      const contextStart = Math.max(0, text.indexOf(email) - 30);
      const contextEnd = Math.min(text.length, text.indexOf(email) + email.length + 30);
      
      patterns.push({
        id: email,
        type: ReferencePatternType.EMAIL,
        context: text.substring(contextStart, contextEnd),
        confidence: 0.9
      });
    }
    
    // Find document IDs (common patterns like DOC-1234, JIRA-5678)
    const docIdRegex = /([A-Z]+-\d+)/g;
    const docIds = text.match(docIdRegex) || [];
    
    for (const docId of docIds) {
      const contextStart = Math.max(0, text.indexOf(docId) - 30);
      const contextEnd = Math.min(text.length, text.indexOf(docId) + docId.length + 30);
      
      patterns.push({
        id: docId,
        type: ReferencePatternType.TICKET_ID,
        context: text.substring(contextStart, contextEnd),
        confidence: 0.85
      });
    }
    
    // Find user mentions (@username)
    const userMentionRegex = /@([a-zA-Z0-9._-]+)/g;
    const userMentions = text.match(userMentionRegex) || [];
    
    for (const mention of userMentions) {
      const contextStart = Math.max(0, text.indexOf(mention) - 30);
      const contextEnd = Math.min(text.length, text.indexOf(mention) + mention.length + 30);
      
      patterns.push({
        id: mention.substring(1), // Remove @ symbol
        type: ReferencePatternType.USER_MENTION,
        context: text.substring(contextStart, contextEnd),
        confidence: 0.8
      });
    }
    
    // Find channel mentions (#channel)
    const channelMentionRegex = /#([a-zA-Z0-9_-]+)/g;
    const channelMentions = text.match(channelMentionRegex) || [];
    
    for (const mention of channelMentions) {
      const contextStart = Math.max(0, text.indexOf(mention) - 30);
      const contextEnd = Math.min(text.length, text.indexOf(mention) + mention.length + 30);
      
      patterns.push({
        id: mention.substring(1), // Remove # symbol
        type: ReferencePatternType.CHANNEL_MENTION,
        context: text.substring(contextStart, contextEnd),
        confidence: 0.8
      });
    }
    
    metrics.histogram('nlp_pattern_extraction_duration', Date.now() - startTime);
    metrics.increment('nlp_operations_total', { type: 'pattern_extraction' });
    
    return patterns;
  } catch (error) {
    logger.error('Error finding reference patterns in text', { error });
    metrics.increment('nlp_errors_total', { type: 'pattern_extraction' });
    
    // Return any patterns found before the error
    return patterns;
  }
}

/**
 * Perform entity recognition on text
 */
export async function entityRecognition(text: string): Promise<Entity[]> {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const startTime = Date.now();
  
  try {
    // First try with local libraries
    const localEntities = await findEntities(text);
    
    // If we have enough entities or the text is very long, don't use OpenAI
    if (localEntities.length >= 5 || text.length > 3000) {
      return localEntities;
    }
    
    // Try to enhance with OpenAI if available
    try {
      // Use OpenAI entity extraction
      const openaiEntities = await openaiEntityExtraction(text);
      
      // Merge entities, avoiding duplicates
      const mergedEntities = mergeEntities(localEntities, openaiEntities);
      
      metrics.histogram('nlp_entity_recognition_duration', Date.now() - startTime);
      metrics.increment('nlp_operations_total', { type: 'entity_recognition' });
      
      return mergedEntities;
    } catch (error) {
      logger.warn('OpenAI entity extraction failed, using local entities only', { error });
      return localEntities;
    }
  } catch (error) {
    logger.error('Error in entity recognition', { error });
    metrics.increment('nlp_errors_total', { type: 'entity_recognition' });
    return [];
  }
}

/**
 * Use OpenAI to extract entities (fallback)
 */
async function openaiEntityExtraction(text: string): Promise<Entity[]> {
  try {
    const prompt = `Extract all named entities from the following text and return them in JSON format. 
Format: { "entities": [ {"text": "extracted text", "type": "PERSON|ORGANIZATION|LOCATION|DATE|...", "confidence": 0.0-1.0} ] }
Only return the JSON with no additional text.

Text: "${text.substring(0, 1000)}"`; // Truncate to avoid token limits

    const response = await openaiService.chatCompletion(prompt);
    
    try {
      // Parse the response
      const result = JSON.parse(response);
      
      if (result.entities && Array.isArray(result.entities)) {
        // Transform to our entity format
        return result.entities.map((entity, index) => ({
          text: entity.text,
          type: entity.type.toUpperCase(),
          startIndex: text.indexOf(entity.text),
          endIndex: text.indexOf(entity.text) + entity.text.length,
          confidence: entity.confidence || 0.8
        })).filter(e => e.startIndex !== -1); // Filter out entities not found in text
      }
    } catch (parseError) {
      logger.error('Error parsing OpenAI entity extraction response', { parseError, response });
    }
    
    return [];
  } catch (error) {
    logger.error('OpenAI entity extraction failed', { error });
    metrics.increment('openai_api_errors_total', { operation: 'entity_extraction' });
    return [];
  }
}

/**
 * Map winkNLP entity types to our standardized types
 */
function mapEntityType(winkType: string): string {
  switch (winkType.toUpperCase()) {
    case 'PERSON':
      return EntityType.PERSON;
    case 'ORGANIZATION':
    case 'ORG':
      return EntityType.ORGANIZATION;
    case 'LOCATION':
    case 'GPE':
    case 'LOC':
      return EntityType.LOCATION;
    case 'FACILITY':
      return EntityType.FACILITY;
    case 'PRODUCT':
      return EntityType.PRODUCT;
    case 'EVENT':
      return EntityType.EVENT;
    case 'DATE':
    case 'TIME':
      return EntityType.DATE;
    case 'MONEY':
    case 'CURRENCY':
      return EntityType.MONEY;
    default:
      return EntityType.OTHER;
  }
}

/**
 * Add entities from compromise to our entities array, avoiding duplicates
 */
function addCompromiseEntities(entities: Entity[], items: string[], type: string): void {
  for (const item of items) {
    // Check if this entity is already in the list (avoid duplicates)
    const isDuplicate = entities.some(e => 
      e.text.toLowerCase() === item.toLowerCase() || 
      item.includes(e.text) || 
      e.text.includes(item)
    );
    
    if (!isDuplicate) {
      entities.push({
        text: item,
        type,
        startIndex: -1, // Compromise doesn't provide positions
        endIndex: -1,
        confidence: 0.8 // Compromise doesn't provide confidence scores
      });
    }
  }
}

/**
 * Merge entities from different sources, avoiding duplicates
 */
function mergeEntities(localEntities: Entity[], openaiEntities: Entity[]): Entity[] {
  const mergedEntities = [...localEntities];
  
  for (const openaiEntity of openaiEntities) {
    // Check if this entity is already in the list (avoid duplicates)
    const isDuplicate = mergedEntities.some(e => 
      e.text.toLowerCase() === openaiEntity.text.toLowerCase() || 
      (e.type === openaiEntity.type && 
        (openaiEntity.text.includes(e.text) || e.text.includes(openaiEntity.text)))
    );
    
    if (!isDuplicate) {
      mergedEntities.push(openaiEntity);
    }
  }
  
  return mergedEntities;
}