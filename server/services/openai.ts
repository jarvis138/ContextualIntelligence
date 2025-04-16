/**
 * OpenAI Service
 * 
 * This service provides interfaces to OpenAI APIs for various NLP tasks.
 * Enhanced for Phase 3 with entity relation extraction, document analysis,
 * and project insights generation capabilities.
 */

import { logger } from './observability';
import { metrics } from './observability/metrics-util';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

/**
 * OpenAI Service Class
 */
// Define Zod schemas for advanced AI features (Phase 3)
export const EntitySchema = z.object({
  name: z.string(),
  type: z.string(),
  confidence: z.number().min(0).max(1),
  aliases: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const RelationSchema = z.object({
  source: z.string(),
  sourceType: z.string().optional(),
  target: z.string(),
  targetType: z.string().optional(),
  relationType: z.string(),
  confidence: z.number().min(0).max(1),
  context: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const DocumentAnalysisSchema = z.object({
  summary: z.string(),
  entities: z.array(EntitySchema),
  keywords: z.array(z.string()),
  topics: z.array(z.string()),
  sentiment: z.object({
    score: z.number().min(-1).max(1),
    label: z.string()
  }),
  importance: z.number().min(0).max(1),
  metadata: z.record(z.string(), z.any()).optional()
});

export const ProjectInsightSchema = z.object({
  title: z.string(),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  impact: z.number().min(0).max(1),
  category: z.string(),
  relatedEntities: z.array(z.string()).optional(),
  suggestions: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

export type Entity = z.infer<typeof EntitySchema>;
export type Relation = z.infer<typeof RelationSchema>;
export type DocumentAnalysis = z.infer<typeof DocumentAnalysisSchema>;
export type ProjectInsight = z.infer<typeof ProjectInsightSchema>;

export class OpenAIService {
  /**
   * Check if OpenAI service is available
   */
  isAvailable(): boolean {
    return !!openai;
  }

  /**
   * Get embeddings for a text
   */
  async getEmbeddings(text: string): Promise<number[] | null> {
    if (!this.isAvailable()) {
      return null;
    }
    
    try {
      const startTime = Date.now();
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.substring(0, 8000), // Limit to 8000 chars to avoid token limits
      });
      
      metrics.histogram('openai_api_duration', Date.now() - startTime, {
        operation: 'embeddings'
      });
      metrics.increment('openai_api_calls_total', { operation: 'embeddings' });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('OpenAI embeddings error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'embeddings' });
      return null;
    }
  }

  /**
   * Get chat completion
   */
  async chatCompletion(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service is not available');
    }
    
    try {
      const startTime = Date.now();
      
      const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
      
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }
      
      messages.push({
        role: 'user',
        content: prompt
      });
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.1, // Lower temperature for more deterministic outputs
        max_tokens: 1000
      });
      
      metrics.histogram('openai_api_duration', Date.now() - startTime, {
        operation: 'chat_completion'
      });
      metrics.increment('openai_api_calls_total', { operation: 'chat_completion' });
      
      return response.choices[0].message.content || '';
    } catch (error: any) {
      logger.error('OpenAI chat completion error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'chat_completion' });
      throw new Error(`Failed to get chat completion: ${error.message}`);
    }
  }

  /**
   * Analyze text sentiment
   */
  async analyzeSentiment(text: string): Promise<{ sentiment: string; confidence: number }> {
    if (!this.isAvailable()) {
      return { sentiment: 'neutral', confidence: 0.5 }; // Default fallback
    }
    
    try {
      const startTime = Date.now();
      
      const prompt = `Analyze the sentiment of the following text and classify it as one of: positive, negative, or neutral. Provide a confidence score between 0 and 1. Return the result in JSON format like this:
{ "sentiment": "positive|negative|neutral", "confidence": 0.8 }
Only return the JSON with no additional text.

Text: "${text.substring(0, 1000)}"`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      try {
        // Parse the response
        const result = JSON.parse(response);
        
        if (result.sentiment && typeof result.confidence === 'number') {
          metrics.histogram('openai_api_duration', Date.now() - startTime, {
            operation: 'sentiment_analysis'
          });
          metrics.increment('openai_api_calls_total', { operation: 'sentiment_analysis' });
          
          return {
            sentiment: result.sentiment.toLowerCase(),
            confidence: Math.min(Math.max(result.confidence, 0), 1) // Ensure confidence is between 0 and 1
          };
        }
      } catch (parseError) {
        logger.error('Error parsing OpenAI sentiment analysis response', { parseError, response });
      }
      
      // Fallback
      return { sentiment: 'neutral', confidence: 0.5 };
    } catch (error) {
      logger.error('OpenAI sentiment analysis error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'sentiment_analysis' });
      return { sentiment: 'neutral', confidence: 0.5 }; // Default fallback
    }
  }

  /**
   * Extract keywords from text
   */
  async extractKeywords(text: string, maxKeywords = 10): Promise<string[]> {
    if (!this.isAvailable()) {
      return []; // Default fallback
    }
    
    try {
      const startTime = Date.now();
      
      const prompt = `Extract the top ${maxKeywords} most important keywords or phrases from the following text. Return them as a JSON array of strings, with no explanations.
Only return the JSON array with no additional text.

Text: "${text.substring(0, 2000)}"`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      try {
        // Parse the response
        const keywords = JSON.parse(response);
        
        if (Array.isArray(keywords)) {
          metrics.histogram('openai_api_duration', Date.now() - startTime, {
            operation: 'keyword_extraction'
          });
          metrics.increment('openai_api_calls_total', { operation: 'keyword_extraction' });
          
          return keywords.slice(0, maxKeywords); // Ensure we don't exceed maxKeywords
        }
      } catch (parseError) {
        logger.error('Error parsing OpenAI keyword extraction response', { parseError, response });
      }
      
      // Fallback
      return [];
    } catch (error) {
      logger.error('OpenAI keyword extraction error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'keyword_extraction' });
      return []; // Default fallback
    }
  }

  /**
   * Summarize text
   */
  async summarizeText(text: string, maxLength = 200): Promise<string> {
    if (!this.isAvailable()) {
      return ''; // Default fallback
    }
    
    try {
      const startTime = Date.now();
      
      const prompt = `Summarize the following text in ${maxLength} characters or less:

Text: "${text.substring(0, 3000)}"`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      metrics.histogram('openai_api_duration', Date.now() - startTime, {
        operation: 'text_summarization'
      });
      metrics.increment('openai_api_calls_total', { operation: 'text_summarization' });
      
      // Truncate to ensure we don't exceed maxLength
      return response.substring(0, maxLength);
    } catch (error) {
      logger.error('OpenAI text summarization error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'text_summarization' });
      return ''; // Default fallback
    }
  }

  /**
   * Extract named entities from text
   * Phase 3 feature
   */
  async extractEntities(text: string): Promise<Entity[]> {
    if (!this.isAvailable()) {
      return [];
    }
    
    try {
      const startTime = Date.now();
      
      const prompt = `Extract the named entities from the following text. For each entity, provide:
1. The entity name
2. The entity type (person, organization, project, location, technology, etc.)
3. A confidence score between 0 and 1
4. Any aliases mentioned in the text (if applicable)

Return the results as a JSON array of objects with the format:
[
  {
    "name": "Entity name",
    "type": "entity_type",
    "confidence": 0.9,
    "aliases": ["alias1", "alias2"]
  }
]

Only return the JSON array with no additional text.

Text: "${text.substring(0, 4000)}"`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      try {
        // Parse the response and validate with Zod
        const parsedEntities = JSON.parse(response);
        const validatedEntities = z.array(EntitySchema).parse(parsedEntities);
        
        metrics.histogram('openai_api_duration', Date.now() - startTime, {
          operation: 'entity_extraction'
        });
        metrics.increment('openai_api_calls_total', { operation: 'entity_extraction' });
        
        return validatedEntities;
      } catch (parseError) {
        logger.error('Error parsing OpenAI entity extraction response', { parseError, response });
        return [];
      }
    } catch (error) {
      logger.error('OpenAI entity extraction error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'entity_extraction' });
      return [];
    }
  }

  /**
   * Extract relationships between entities
   * Phase 3 feature
   */
  async extractRelations(text: string, entities?: Entity[]): Promise<Relation[]> {
    if (!this.isAvailable()) {
      return [];
    }
    
    try {
      const startTime = Date.now();
      
      // If entities not provided, extract them first
      let textEntities = entities;
      if (!textEntities || textEntities.length === 0) {
        textEntities = await this.extractEntities(text);
      }
      
      if (textEntities.length === 0) {
        return []; // No entities found, so no relations
      }
      
      const entityNames = textEntities.map(e => e.name).join(', ');
      
      const prompt = `Identify the relationships between the following entities in the given text:
Entities: ${entityNames}

For each relationship, provide:
1. The source entity
2. The target entity
3. The type of relationship (e.g., "works for", "manages", "part of", "uses", "precedes", "depends on", etc.)
4. A confidence score between 0 and 1
5. A short context phrase from the text that supports this relationship (if available)

Return the results as a JSON array of objects with the format:
[
  {
    "source": "Source Entity",
    "sourceType": "person",
    "target": "Target Entity",
    "targetType": "organization",
    "relationType": "works for",
    "confidence": 0.85,
    "context": "Source Entity joined Target Entity in 2022"
  }
]

Only return the JSON array with no additional text.

Text: "${text.substring(0, 4000)}"`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      try {
        // Parse the response and validate with Zod
        const parsedRelations = JSON.parse(response);
        const validatedRelations = z.array(RelationSchema).parse(parsedRelations);
        
        metrics.histogram('openai_api_duration', Date.now() - startTime, {
          operation: 'relation_extraction'
        });
        metrics.increment('openai_api_calls_total', { operation: 'relation_extraction' });
        
        return validatedRelations;
      } catch (parseError) {
        logger.error('Error parsing OpenAI relation extraction response', { parseError, response });
        return [];
      }
    } catch (error) {
      logger.error('OpenAI relation extraction error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'relation_extraction' });
      return [];
    }
  }

  /**
   * Perform comprehensive document analysis
   * Phase 3 feature
   */
  async analyzeDocument(text: string): Promise<DocumentAnalysis> {
    if (!this.isAvailable()) {
      return {
        summary: '',
        entities: [],
        keywords: [],
        topics: [],
        sentiment: { score: 0, label: 'neutral' },
        importance: 0.5
      };
    }
    
    try {
      const startTime = Date.now();
      
      const prompt = `Perform a comprehensive analysis of the following document. Provide:
1. A concise summary (max 200 words)
2. The key entities mentioned (name and type)
3. Important keywords (up to 10)
4. Main topics covered (up to 5)
5. Overall sentiment (score from -1 to 1, and label as positive/negative/neutral)
6. Importance score (0 to 1) reflecting how critical this document appears to be

Return the results as a JSON object with the format:
{
  "summary": "...",
  "entities": [{"name": "Entity name", "type": "entity_type", "confidence": 0.9}],
  "keywords": ["keyword1", "keyword2", ...],
  "topics": ["topic1", "topic2", ...],
  "sentiment": {"score": 0.2, "label": "positive"},
  "importance": 0.8
}

Only return the JSON object with no additional text.

Document: "${text.substring(0, 5000)}"`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      try {
        // Parse the response and validate with Zod
        const parsedAnalysis = JSON.parse(response);
        const validatedAnalysis = DocumentAnalysisSchema.parse(parsedAnalysis);
        
        metrics.histogram('openai_api_duration', Date.now() - startTime, {
          operation: 'document_analysis'
        });
        metrics.increment('openai_api_calls_total', { operation: 'document_analysis' });
        
        return validatedAnalysis;
      } catch (parseError) {
        logger.error('Error parsing OpenAI document analysis response', { parseError, response });
        return {
          summary: '',
          entities: [],
          keywords: [],
          topics: [],
          sentiment: { score: 0, label: 'neutral' },
          importance: 0.5
        };
      }
    } catch (error) {
      logger.error('OpenAI document analysis error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'document_analysis' });
      return {
        summary: '',
        entities: [],
        keywords: [],
        topics: [],
        sentiment: { score: 0, label: 'neutral' },
        importance: 0.5
      };
    }
  }

  /**
   * Generate project insights based on provided data
   * Phase 3 feature
   */
  async generateProjectInsights(
    context: { 
      projectDescription?: string;
      recentDocuments?: string[];
      teamMembers?: string[];
      recentActivities?: string[];
      currentIssues?: string[];
    }
  ): Promise<ProjectInsight[]> {
    if (!this.isAvailable()) {
      return [];
    }
    
    try {
      const startTime = Date.now();
      
      const contextText = `
Project Description: ${context.projectDescription || 'N/A'}

Recent Documents: ${context.recentDocuments?.join('\n') || 'N/A'}

Team Members: ${context.teamMembers?.join(', ') || 'N/A'}

Recent Activities: ${context.recentActivities?.join('\n') || 'N/A'}

Current Issues: ${context.currentIssues?.join('\n') || 'N/A'}
`;
      
      const prompt = `Based on the following project information, generate insights that would be valuable for project management and decision-making.

For each insight, provide:
1. A concise title
2. A detailed description
3. A confidence score (0-1)
4. An impact score (0-1) indicating how important this insight is
5. A category (e.g., "Risk", "Opportunity", "Efficiency", "Communication", "Resource", etc.)
6. Related entities (if applicable)
7. Actionable suggestions (if applicable)

Return 3-5 insights as a JSON array with the format:
[
  {
    "title": "Insight title",
    "description": "Detailed description",
    "confidence": 0.85,
    "impact": 0.9,
    "category": "Risk",
    "relatedEntities": ["Entity1", "Entity2"],
    "suggestions": ["Suggestion 1", "Suggestion 2"]
  }
]

Only return the JSON array with no additional text.

Project Information:
${contextText.substring(0, 6000)}`; // Truncate to avoid token limits
      
      const response = await this.chatCompletion(prompt);
      
      try {
        // Parse the response and validate with Zod
        const parsedInsights = JSON.parse(response);
        const validatedInsights = z.array(ProjectInsightSchema).parse(parsedInsights);
        
        metrics.histogram('openai_api_duration', Date.now() - startTime, {
          operation: 'project_insights'
        });
        metrics.increment('openai_api_calls_total', { operation: 'project_insights' });
        
        return validatedInsights;
      } catch (parseError) {
        logger.error('Error parsing OpenAI project insights response', { parseError, response });
        return [];
      }
    } catch (error) {
      logger.error('OpenAI project insights error', { error });
      metrics.increment('openai_api_errors_total', { operation: 'project_insights' });
      return [];
    }
  }
}

export const openaiService = new OpenAIService();