/**
 * NLP Controller
 * 
 * Handles API routes for NLP processing operations, providing endpoints
 * for text analysis, entity extraction, and other NLP-related features.
 */

import { Request, Response } from 'express';
import { NLPService } from '../services/nlp/NLPService';
import { z } from 'zod';

// Create NLP service instance
const nlpService = new NLPService();

// Validation schemas for request bodies
const analyzeTextSchema = z.object({
  text: z.string().min(1, 'Text is required').max(100000, 'Text is too long'),
  options: z
    .object({
      enableAdvancedFeatures: z.boolean().optional(),
      coreResolution: z.boolean().optional(),
      languageDetection: z.boolean().optional(),
      topicModeling: z
        .object({
          enabled: z.boolean().optional(),
          numTopics: z.number().int().min(1).max(20).optional()
        })
        .optional(),
      summarization: z
        .object({
          enabled: z.boolean().optional(),
          ratio: z.number().min(0.1).max(0.9).optional()
        })
        .optional(),
      identity: z
        .object({
          enabled: z.boolean().optional(),
          minConfidence: z.number().min(0).max(1).optional()
        })
        .optional()
    })
    .optional()
});

const compareSimilaritySchema = z.object({
  text1: z.string().min(1, 'First text is required'),
  text2: z.string().min(1, 'Second text is required')
});

const extractInsightsSchema = z.object({
  text: z.string().min(1, 'Text is required').max(100000, 'Text is too long')
});

const analyzeSentimentSchema = z.object({
  texts: z.array(z.string()).min(1, 'At least one text is required')
});

/**
 * Analyze text with NLP processing
 */
export async function analyzeText(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = analyzeTextSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.format()
      });
      return;
    }
    
    const { text, options } = validationResult.data;
    
    // Process text with NLP service
    const result = await nlpService.processText(text);
    
    // Return processed result
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in analyzeText:', error);
    res.status(500).json({
      error: 'Failed to analyze text',
      message: error.message
    });
  }
}

/**
 * Extract key insights from text
 */
export async function extractInsights(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = extractInsightsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.format()
      });
      return;
    }
    
    const { text } = validationResult.data;
    
    // Extract insights
    const insights = await nlpService.extractInsights(text);
    
    // Return insights
    res.status(200).json(insights);
  } catch (error) {
    console.error('Error in extractInsights:', error);
    res.status(500).json({
      error: 'Failed to extract insights',
      message: error.message
    });
  }
}

/**
 * Compare similarity between two texts
 */
export async function compareSimilarity(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = compareSimilaritySchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.format()
      });
      return;
    }
    
    const { text1, text2 } = validationResult.data;
    
    // Compare texts
    const similarity = await nlpService.compareSimilarity(text1, text2);
    
    // Return similarity result
    res.status(200).json(similarity);
  } catch (error) {
    console.error('Error in compareSimilarity:', error);
    res.status(500).json({
      error: 'Failed to compare texts',
      message: error.message
    });
  }
}

/**
 * Analyze sentiment trends in a corpus of texts
 */
export async function analyzeSentimentTrends(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const validationResult = analyzeSentimentSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      res.status(400).json({
        error: 'Invalid request body',
        details: validationResult.error.format()
      });
      return;
    }
    
    const { texts } = validationResult.data;
    
    // Analyze sentiment trends
    const trends = await nlpService.analyzeSentimentTrends(texts);
    
    // Return trends
    res.status(200).json(trends);
  } catch (error) {
    console.error('Error in analyzeSentimentTrends:', error);
    res.status(500).json({
      error: 'Failed to analyze sentiment trends',
      message: error.message
    });
  }
}

/**
 * Analyze a document (used for document processing in the application)
 */
export async function analyzeDocument(req: Request, res: Response): Promise<void> {
  try {
    // Validate request
    if (!req.body.content || !req.body.documentId) {
      res.status(400).json({
        error: 'Invalid request, content and documentId are required'
      });
      return;
    }
    
    const { content, documentId } = req.body;
    
    // Process document content
    const result = await nlpService.processText(content);
    
    // Return processed result
    res.status(200).json({
      documentId,
      analysis: result
    });
  } catch (error) {
    console.error('Error in analyzeDocument:', error);
    res.status(500).json({
      error: 'Failed to analyze document',
      message: error.message
    });
  }
}

/**
 * Extract entities from text
 */
export async function extractEntities(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    if (!req.body.text) {
      res.status(400).json({
        error: 'Invalid request, text is required'
      });
      return;
    }
    
    const { text } = req.body;
    
    // Process text to extract entities
    const result = await nlpService.processText(text);
    
    // Return only the entities from the processing result
    res.status(200).json({
      entities: result.entities,
      language: result.language,
      processingMetadata: result.processingMetadata
    });
  } catch (error) {
    console.error('Error in extractEntities:', error);
    res.status(500).json({
      error: 'Failed to extract entities',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Summarize a document by its ID
 */
export async function summarizeDocument(req: Request, res: Response): Promise<void> {
  try {
    const documentId = parseInt(req.params.documentId);
    
    if (isNaN(documentId)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }
    
    // Get document from storage
    const storage = req.app.locals.storage;
    const document = await storage.getDocument(documentId);
    
    if (!document || !document.content) {
      res.status(404).json({ error: 'Document not found or has no content' });
      return;
    }
    
    // Process document with NLP service to generate summary
    const result = await nlpService.processText(document.content);
    
    // Extract summary using extractInsights if it has the necessary implementation
    const insights = await nlpService.extractInsights(document.content);
    
    res.status(200).json({
      documentId,
      title: document.title,
      summary: insights.summary || 'Summary not available',
      keyEntities: result.entities.slice(0, 5),
      keywords: result.keywords.slice(0, 10),
      sentiment: result.sentiment,
      language: result.language,
      processingMetadata: result.processingMetadata
    });
  } catch (error) {
    console.error('Error in summarizeDocument:', error);
    res.status(500).json({
      error: 'Failed to summarize document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Process a document by its ID (more comprehensive than summarize)
 */
export async function processDocument(req: Request, res: Response): Promise<void> {
  try {
    const documentId = parseInt(req.params.documentId);
    
    if (isNaN(documentId)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }
    
    // Get document from storage
    const storage = req.app.locals.storage;
    const document = await storage.getDocument(documentId);
    
    if (!document || !document.content) {
      res.status(404).json({ error: 'Document not found or has no content' });
      return;
    }
    
    // Process document with NLP service
    const result = await nlpService.processText(document.content);
    
    // Store processing results or update document metadata as needed
    // This would typically update the document with extracted entities, etc.
    
    res.status(200).json({
      documentId,
      title: document.title,
      processingResult: result,
      status: 'completed'
    });
  } catch (error) {
    console.error('Error in processDocument:', error);
    res.status(500).json({
      error: 'Failed to process document',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate a context graph for a project
 */
export async function generateContextGraph(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    
    // Get project documents
    const storage = req.app.locals.storage;
    const documents = await storage.getDocuments(projectId);
    
    if (!documents || documents.length === 0) {
      res.status(404).json({ error: 'No documents found for this project' });
      return;
    }
    
    // Process each document to extract entities and relationships
    const projectGraph = {
      nodes: [],
      edges: [],
      projectId,
      metadata: {
        documentCount: documents.length,
        generatedAt: new Date().toISOString()
      }
    };
    
    // For each document with content, process and add to graph
    for (const document of documents) {
      if (document.content) {
        // Process document with NLP service
        const result = await nlpService.processText(document.content);
        
        // Add document as a node
        projectGraph.nodes.push({
          id: `doc-${document.id}`,
          type: 'document',
          label: document.title,
          properties: {
            documentId: document.id,
            fileType: document.fileType,
            sentiment: result.sentiment.label
          }
        });
        
        // Add entities as nodes
        for (const entity of result.entities) {
          // Check if entity node already exists
          const existingNodeIndex = projectGraph.nodes.findIndex(
            node => node.type === 'entity' && node.label === entity.text && node.properties.entityType === entity.type
          );
          
          if (existingNodeIndex === -1) {
            // Add new entity node
            projectGraph.nodes.push({
              id: `entity-${projectGraph.nodes.length}`,
              type: 'entity',
              label: entity.text,
              properties: {
                entityType: entity.type,
                confidence: entity.confidence,
                metadata: entity.metadata
              }
            });
            
            // Add edge from document to entity
            projectGraph.edges.push({
              source: `doc-${document.id}`,
              target: `entity-${projectGraph.nodes.length - 1}`,
              type: 'CONTAINS',
              properties: {
                confidence: entity.confidence
              }
            });
          } else {
            // Add edge from document to existing entity
            projectGraph.edges.push({
              source: `doc-${document.id}`,
              target: projectGraph.nodes[existingNodeIndex].id,
              type: 'CONTAINS',
              properties: {
                confidence: entity.confidence
              }
            });
          }
        }
        
        // Add relationships as edges between entities
        for (const relationship of result.relationships) {
          const sourceEntityNode = projectGraph.nodes.find(
            node => node.type === 'entity' && node.label === relationship.sourceEntity.text
          );
          
          const targetEntityNode = projectGraph.nodes.find(
            node => node.type === 'entity' && node.label === relationship.targetEntity.text
          );
          
          if (sourceEntityNode && targetEntityNode) {
            projectGraph.edges.push({
              source: sourceEntityNode.id,
              target: targetEntityNode.id,
              type: relationship.relationshipType,
              properties: {
                confidence: relationship.confidence,
                context: relationship.metadata?.context || ''
              }
            });
          }
        }
      }
    }
    
    res.status(200).json(projectGraph);
  } catch (error) {
    console.error('Error in generateContextGraph:', error);
    res.status(500).json({
      error: 'Failed to generate context graph',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Perform semantic search across project documents
 */
export async function semanticSearch(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.params.projectId);
    
    if (isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project ID' });
      return;
    }
    
    if (!req.body.query) {
      res.status(400).json({ error: 'Search query is required' });
      return;
    }
    
    const { query } = req.body;
    
    // Get project documents
    const storage = req.app.locals.storage;
    const documents = await storage.getDocuments(projectId);
    
    if (!documents || documents.length === 0) {
      res.status(404).json({ error: 'No documents found for this project' });
      return;
    }
    
    // Process query with NLP service
    const queryResult = await nlpService.processText(query);
    
    // Calculate search results
    const searchResults = [];
    
    for (const document of documents) {
      if (document.content) {
        // Process document content for semantic comparison
        const documentResult = await nlpService.processText(document.content);
        
        // Compare query and document using compareSimilarity
        const similarity = await nlpService.compareSimilarity(query, document.content);
        
        // Calculate relevance score (simplified)
        const relevanceScore = similarity.overallSimilarity;
        
        // Only include documents with relevance above threshold
        if (relevanceScore > 0.2) {
          // Find matching entities between query and document
          const matchingEntities = queryResult.entities.filter(queryEntity => 
            documentResult.entities.some(docEntity => 
              docEntity.text.toLowerCase() === queryEntity.text.toLowerCase())
          );
          
          // Extract a brief snippet from the document (first 200 chars)
          const snippet = document.content.length > 200 
            ? document.content.substring(0, 200) + '...' 
            : document.content;
          
          searchResults.push({
            documentId: document.id,
            title: document.title,
            relevanceScore,
            snippet,
            matchingEntities,
            entityOverlapScore: similarity.entitySimilarity,
            keywordOverlapScore: similarity.keywordSimilarity
          });
        }
      }
    }
    
    // Sort results by relevance score (descending)
    searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    res.status(200).json({
      query,
      projectId,
      results: searchResults,
      matchCount: searchResults.length,
      processingMetadata: queryResult.processingMetadata
    });
  } catch (error) {
    console.error('Error in semanticSearch:', error);
    res.status(500).json({
      error: 'Failed to perform semantic search',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}