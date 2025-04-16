/**
 * AI API Router
 * 
 * Handles AI-related API endpoints for the CPI Hub.
 * These routes are used by the Phase 3 AI Intelligence features.
 */

import { Router } from 'express';
import { z } from 'zod';
import { openaiService } from '../services/openai';
import { authenticateToken } from '../auth';
import { logger } from '../services/observability';

const router = Router();
const aiLogger = logger.createChildLogger({ component: 'AIApiRouter' });

// Entity extraction endpoint
router.post('/entities', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      text: z.string().min(1, 'Text is required')
    });
    
    const { text } = schema.parse(req.body);
    
    const entities = await openaiService.extractEntities(text);
    
    aiLogger.info('Entity extraction performed', {
      userId: req.user?.id,
      entityCount: entities.length
    });
    
    res.json({ entities });
  } catch (error: any) {
    aiLogger.error('Entity extraction failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to extract entities' });
  }
});

// Relation extraction endpoint
router.post('/relations', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      text: z.string().min(1, 'Text is required'),
      entities: z.array(
        z.object({
          name: z.string(),
          type: z.string(),
          confidence: z.number()
        })
      ).optional()
    });
    
    const { text, entities } = schema.parse(req.body);
    
    const relations = await openaiService.extractRelations(text, entities);
    
    aiLogger.info('Relation extraction performed', {
      userId: req.user?.id,
      relationCount: relations.length
    });
    
    res.json({ relations });
  } catch (error: any) {
    aiLogger.error('Relation extraction failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to extract relations' });
  }
});

// Document analysis endpoint
router.post('/document-analysis', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      text: z.string().min(1, 'Document text is required')
    });
    
    const { text } = schema.parse(req.body);
    
    const analysis = await openaiService.analyzeDocument(text);
    
    aiLogger.info('Document analysis performed', {
      userId: req.user?.id,
      textLength: text.length,
      topics: analysis.topics
    });
    
    res.json({ analysis });
  } catch (error: any) {
    aiLogger.error('Document analysis failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to analyze document' });
  }
});

// Project insights endpoint
router.post('/project-insights', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      projectDescription: z.string().optional(),
      recentDocuments: z.array(z.string()).optional(),
      teamMembers: z.array(z.string()).optional(),
      recentActivities: z.array(z.string()).optional(),
      currentIssues: z.array(z.string()).optional()
    });
    
    const context = schema.parse(req.body);
    
    const insights = await openaiService.generateProjectInsights(context);
    
    aiLogger.info('Project insights generated', {
      userId: req.user?.id,
      insightCount: insights.length
    });
    
    res.json({ insights });
  } catch (error: any) {
    aiLogger.error('Project insights generation failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to generate project insights' });
  }
});

// Sentiment analysis endpoint
router.post('/sentiment', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      text: z.string().min(1, 'Text is required')
    });
    
    const { text } = schema.parse(req.body);
    
    const sentiment = await openaiService.analyzeSentiment(text);
    
    aiLogger.info('Sentiment analysis performed', {
      userId: req.user?.id,
      sentiment: sentiment.sentiment
    });
    
    res.json({ sentiment });
  } catch (error: any) {
    aiLogger.error('Sentiment analysis failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to analyze sentiment' });
  }
});

// Text summarization endpoint
router.post('/summarize', authenticateToken, async (req, res) => {
  try {
    const schema = z.object({
      text: z.string().min(1, 'Text is required'),
      maxLength: z.number().optional()
    });
    
    const { text, maxLength } = schema.parse(req.body);
    
    const summary = await openaiService.summarizeText(text, maxLength);
    
    aiLogger.info('Text summarization performed', {
      userId: req.user?.id,
      textLength: text.length,
      summaryLength: summary.length
    });
    
    res.json({ summary });
  } catch (error: any) {
    aiLogger.error('Text summarization failed', { error: error.message });
    res.status(400).json({ error: error.message || 'Failed to summarize text' });
  }
});

aiLogger.info('AI API routes initialized');

export default router;