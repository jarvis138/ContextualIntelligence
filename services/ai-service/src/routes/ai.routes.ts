import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { ApiError } from '../middleware/error-handler';
import { 
  generateCompletion, 
  generateEmbeddings, 
  analyzeSentiment, 
  extractEntities, 
  summarizeText 
} from '../services/openai-service';
import { validateRequest } from '../middleware/validate-request';

const router = Router();

// Validation schemas
const completionSchema = z.object({
  prompt: z.string().min(1).max(4000),
  model: z.string().optional(),
  maxTokens: z.number().min(1).max(4000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  n: z.number().min(1).max(10).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  useCache: z.boolean().optional()
});

const embeddingsSchema = z.object({
  texts: z.array(z.string().max(8000)).max(100),
  model: z.string().optional(),
  useCache: z.boolean().optional()
});

const sentimentSchema = z.object({
  text: z.string().min(1).max(8000),
  useCache: z.boolean().optional()
});

const entitiesSchema = z.object({
  text: z.string().min(1).max(8000),
  useCache: z.boolean().optional()
});

const summarizeSchema = z.object({
  text: z.string().min(1).max(8000),
  maxLength: z.number().min(50).max(1000).optional(),
  useCache: z.boolean().optional()
});

// Generate text completion
router.post('/completion', validateRequest(completionSchema), async (req, res, next) => {
  try {
    const { prompt, model, maxTokens, temperature, topP, n, stop, useCache } = req.body;
    const userId = (req.user as any).id;
    const tenantId = (req.user as any).tenantId;

    // Check if user has permission to use AI
    // This would be implemented based on your permission system

    // Generate completion
    const result = await generateCompletion({
      prompt,
      model,
      maxTokens,
      temperature,
      topP,
      n,
      stop,
      userId,
      tenantId,
      useCache
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Generate embeddings
router.post('/embeddings', validateRequest(embeddingsSchema), async (req, res, next) => {
  try {
    const { texts, model, useCache } = req.body;
    const userId = (req.user as any).id;
    const tenantId = (req.user as any).tenantId;

    // Generate embeddings
    const embeddings = await generateEmbeddings({
      texts,
      model,
      userId,
      tenantId,
      useCache
    });

    res.json({ embeddings });
  } catch (error) {
    next(error);
  }
});

// Analyze sentiment
router.post('/sentiment', validateRequest(sentimentSchema), async (req, res, next) => {
  try {
    const { text, useCache } = req.body;
    const userId = (req.user as any).id;
    const tenantId = (req.user as any).tenantId;

    // Analyze sentiment
    const result = await analyzeSentiment({
      text,
      userId,
      tenantId,
      useCache
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Extract entities
router.post('/entities', validateRequest(entitiesSchema), async (req, res, next) => {
  try {
    const { text, useCache } = req.body;
    const userId = (req.user as any).id;
    const tenantId = (req.user as any).tenantId;

    // Extract entities
    const entities = await extractEntities({
      text,
      userId,
      tenantId,
      useCache
    });

    res.json({ entities });
  } catch (error) {
    next(error);
  }
});

// Summarize text
router.post('/summarize', validateRequest(summarizeSchema), async (req, res, next) => {
  try {
    const { text, maxLength, useCache } = req.body;
    const userId = (req.user as any).id;
    const tenantId = (req.user as any).tenantId;

    // Summarize text
    const summary = await summarizeText({
      text,
      maxLength,
      userId,
      tenantId,
      useCache
    });

    res.json({ summary });
  } catch (error) {
    next(error);
  }
});

export { router as aiRoutes };