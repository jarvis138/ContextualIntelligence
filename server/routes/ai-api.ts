/**
 * AI API Routes
 * 
 * This file contains API routes for AI-powered features in the CPI Hub.
 * Phase 3 implementation for AI Intelligence.
 */

import { Router, Request, Response } from 'express';
import { openaiService, Entity, Relation, DocumentAnalysis, ProjectInsight } from '../services/openai';
import { authenticateToken } from '../auth';
import { logger } from '../services/observability';
import { metrics } from '../services/observability/metrics-util';

const router = Router();

/**
 * Extract entities from text
 * POST /api/ai/entities
 */
router.post('/entities', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const entities = await openaiService.extractEntities(text);
    
    metrics.increment('feature_usage_total', { feature: 'entity_extraction' });
    return res.json({ entities });
  } catch (error) {
    logger.error('Error extracting entities', { error });
    return res.status(500).json({ error: 'Failed to extract entities' });
  }
});

/**
 * Extract relationships between entities
 * POST /api/ai/relations
 */
router.post('/relations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text, entities } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const relations = await openaiService.extractRelations(text, entities);
    
    metrics.increment('feature_usage_total', { feature: 'relation_extraction' });
    return res.json({ relations });
  } catch (error) {
    logger.error('Error extracting relations', { error });
    return res.status(500).json({ error: 'Failed to extract relations' });
  }
});

/**
 * Analyze document
 * POST /api/ai/document-analysis
 */
router.post('/document-analysis', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const analysis = await openaiService.analyzeDocument(text);
    
    metrics.increment('feature_usage_total', { feature: 'document_analysis' });
    return res.json({ analysis });
  } catch (error) {
    logger.error('Error analyzing document', { error });
    return res.status(500).json({ error: 'Failed to analyze document' });
  }
});

/**
 * Generate project insights
 * POST /api/ai/project-insights
 */
router.post('/project-insights', authenticateToken, async (req: Request, res: Response) => {
  try {
    const context = req.body;
    
    if (!context || typeof context !== 'object') {
      return res.status(400).json({ error: 'Context object is required' });
    }
    
    const insights = await openaiService.generateProjectInsights(context);
    
    metrics.increment('feature_usage_total', { feature: 'project_insights' });
    return res.json({ insights });
  } catch (error) {
    logger.error('Error generating project insights', { error });
    return res.status(500).json({ error: 'Failed to generate project insights' });
  }
});

/**
 * Analyze sentiment
 * POST /api/ai/sentiment
 */
router.post('/sentiment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const sentiment = await openaiService.analyzeSentiment(text);
    
    metrics.increment('feature_usage_total', { feature: 'sentiment_analysis' });
    return res.json({ sentiment });
  } catch (error) {
    logger.error('Error analyzing sentiment', { error });
    return res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

/**
 * Summarize text
 * POST /api/ai/summarize
 */
router.post('/summarize', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { text, maxLength } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const summary = await openaiService.summarizeText(text, maxLength);
    
    metrics.increment('feature_usage_total', { feature: 'text_summarization' });
    return res.json({ summary });
  } catch (error) {
    logger.error('Error summarizing text', { error });
    return res.status(500).json({ error: 'Failed to summarize text' });
  }
});

export default router;