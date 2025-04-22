import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { config } from '../config';
import { CacheService } from '../utils/cache-service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// Initialize cache service
const cacheService = new CacheService({
  url: config.redis.url,
  ttl: 3600, // 1 hour
  prefix: 'ai-service:openai'
});

/**
 * Generate text completion using OpenAI
 */
export const generateCompletion = async (params: {
  prompt: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  n?: number;
  stop?: string | string[];
  userId: string | number;
  tenantId: string | number;
  useCache?: boolean;
}): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
  try {
    const {
      prompt,
      model = config.openai.defaultModel,
      maxTokens = 1000,
      temperature = 0.7,
      topP = 1,
      n = 1,
      stop,
      userId,
      tenantId,
      useCache = true
    } = params;

    // Generate cache key
    const cacheKey = `completion:${model}:${temperature}:${maxTokens}:${topP}:${JSON.stringify(stop)}:${prompt}`;

    // Try to get from cache if enabled
    if (useCache) {
      const cachedResult = await cacheService.get<{ text: string; usage: any }>(cacheKey);
      if (cachedResult) {
        logger.debug('Using cached OpenAI completion', { userId, tenantId, model });
        return cachedResult;
      }
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature,
      top_p: topP,
      n,
      stop,
      user: `tenant-${tenantId}-user-${userId}`
    });

    // Extract result
    const result = {
      text: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };

    // Cache result if enabled
    if (useCache) {
      await cacheService.set(cacheKey, result);
    }

    // Log usage
    logger.info('OpenAI completion generated', {
      userId,
      tenantId,
      model,
      tokens: result.usage.totalTokens
    });

    return result;
  } catch (error) {
    logger.error('Error generating OpenAI completion', { error });
    throw error;
  }
};

/**
 * Generate embeddings using OpenAI
 */
export const generateEmbeddings = async (params: {
  texts: string[];
  model?: string;
  userId: string | number;
  tenantId: string | number;
  useCache?: boolean;
}): Promise<number[][]> {
  try {
    const {
      texts,
      model = config.openai.defaultEmbeddingModel,
      userId,
      tenantId,
      useCache = true
    } = params;

    // Process texts in batches to avoid token limits
    const batchSize = 20;
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      // Generate cache keys for batch
      const cacheKeys = batch.map(text => `embedding:${model}:${text}`);
      
      // Try to get from cache if enabled
      let cachedResults: (number[] | null)[] = [];
      if (useCache) {
        cachedResults = await Promise.all(cacheKeys.map(key => cacheService.get<number[]>(key)));
      }
      
      // Filter texts that need to be processed
      const textsToProcess: string[] = [];
      const textsToProcessIndices: number[] = [];
      
      batch.forEach((text, index) => {
        if (!useCache || !cachedResults[index]) {
          textsToProcess.push(text);
          textsToProcessIndices.push(i + index);
        }
      });
      
      // If there are texts to process
      if (textsToProcess.length > 0) {
        // Call OpenAI API
        const response = await openai.embeddings.create({
          model,
          input: textsToProcess,
          user: `tenant-${tenantId}-user-${userId}`
        });
        
        // Cache results and add to embeddings
        response.data.forEach((item, index) => {
          const embedding = item.embedding;
          const originalIndex = textsToProcessIndices[index];
          
          // Cache embedding
          if (useCache) {
            const cacheKey = `embedding:${model}:${textsToProcess[index]}`;
            cacheService.set(cacheKey, embedding);
          }
          
          // Add to results at the correct position
          while (embeddings.length <= originalIndex) {
            embeddings.push([]);
          }
          embeddings[originalIndex] = embedding;
        });
        
        // Log usage
        logger.info('OpenAI embeddings generated', {
          userId,
          tenantId,
          model,
          count: textsToProcess.length
        });
      }
      
      // Add cached results to embeddings
      if (useCache) {
        cachedResults.forEach((embedding, index) => {
          if (embedding) {
            const originalIndex = i + index;
            while (embeddings.length <= originalIndex) {
              embeddings.push([]);
            }
            embeddings[originalIndex] = embedding;
          }
        });
      }
    }

    return embeddings;
  } catch (error) {
    logger.error('Error generating OpenAI embeddings', { error });
    throw error;
  }
};

/**
 * Analyze sentiment of text
 */
export const analyzeSentiment = async (params: {
  text: string;
  userId: string | number;
  tenantId: string | number;
  useCache?: boolean;
}): Promise<{
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
}> {
  try {
    const { text, userId, tenantId, useCache = true } = params;

    // Generate cache key
    const cacheKey = `sentiment:${text}`;

    // Try to get from cache if enabled
    if (useCache) {
      const cachedResult = await cacheService.get<{
        sentiment: 'positive' | 'negative' | 'neutral';
        score: number;
        confidence: number;
      }>(cacheKey);
      if (cachedResult) {
        logger.debug('Using cached sentiment analysis', { userId, tenantId });
        return cachedResult;
      }
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: config.openai.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'You are a sentiment analysis expert. Analyze the sentiment of the following text and respond with a JSON object containing "sentiment" (positive, negative, or neutral), "score" (a number from -1 to 1 where -1 is very negative and 1 is very positive), and "confidence" (a number from 0 to 1 indicating your confidence in the analysis).'
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      user: `tenant-${tenantId}-user-${userId}`
    });

    // Parse result
    const content = response.choices[0]?.message?.content || '{}';
    const result = JSON.parse(content) as {
      sentiment: 'positive' | 'negative' | 'neutral';
      score: number;
      confidence: number;
    };

    // Cache result if enabled
    if (useCache) {
      await cacheService.set(cacheKey, result);
    }

    // Log usage
    logger.info('Sentiment analysis completed', {
      userId,
      tenantId,
      sentiment: result.sentiment,
      textLength: text.length
    });

    return result;
  } catch (error) {
    logger.error('Error analyzing sentiment', { error });
    throw error;
  }
};

/**
 * Extract entities from text
 */
export const extractEntities = async (params: {
  text: string;
  userId: string | number;
  tenantId: string | number;
  useCache?: boolean;
}): Promise<Array<{
  entity: string;
  type: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}>> {
  try {
    const { text, userId, tenantId, useCache = true } = params;

    // Generate cache key
    const cacheKey = `entities:${text}`;

    // Try to get from cache if enabled
    if (useCache) {
      const cachedResult = await cacheService.get<Array<{
        entity: string;
        type: string;
        startIndex: number;
        endIndex: number;
        confidence: number;
      }>>(cacheKey);
      if (cachedResult) {
        logger.debug('Using cached entity extraction', { userId, tenantId });
        return cachedResult;
      }
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: config.openai.defaultModel,
      messages: [
        {
          role: 'system',
          content: 'You are an entity extraction expert. Extract named entities from the following text and respond with a JSON array of objects. Each object should contain "entity" (the extracted entity text), "type" (person, organization, location, date, etc.), "startIndex" (the character index where the entity starts in the original text), "endIndex" (the character index where the entity ends), and "confidence" (a number from 0 to 1 indicating your confidence).'
        },
        { role: 'user', content: text }
      ],
      response_format: { type: 'json_object' },
      user: `tenant-${tenantId}-user-${userId}`
    });

    // Parse result
    const content = response.choices[0]?.message?.content || '{"entities":[]}';
    const parsed = JSON.parse(content);
    const result = parsed.entities || [];

    // Cache result if enabled
    if (useCache) {
      await cacheService.set(cacheKey, result);
    }

    // Log usage
    logger.info('Entity extraction completed', {
      userId,
      tenantId,
      entityCount: result.length,
      textLength: text.length
    });

    return result;
  } catch (error) {
    logger.error('Error extracting entities', { error });
    throw error;
  }
};

/**
 * Summarize text
 */
export const summarizeText = async (params: {
  text: string;
  maxLength?: number;
  userId: string | number;
  tenantId: string | number;
  useCache?: boolean;
}): Promise<string> {
  try {
    const { text, maxLength = 200, userId, tenantId, useCache = true } = params;

    // Generate cache key
    const cacheKey = `summary:${maxLength}:${text}`;

    // Try to get from cache if enabled
    if (useCache) {
      const cachedResult = await cacheService.get<string>(cacheKey);
      if (cachedResult) {
        logger.debug('Using cached text summarization', { userId, tenantId });
        return cachedResult;
      }
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: config.openai.defaultModel,
      messages: [
        {
          role: 'system',
          content: `You are a text summarization expert. Summarize the following text in ${maxLength} characters or less.`
        },
        { role: 'user', content: text }
      ],
      max_tokens: Math.ceil(maxLength / 4), // Rough estimate of tokens needed
      user: `tenant-${tenantId}-user-${userId}`
    });

    // Extract result
    const result = response.choices[0]?.message?.content || '';

    // Cache result if enabled
    if (useCache) {
      await cacheService.set(cacheKey, result);
    }

    // Log usage
    logger.info('Text summarization completed', {
      userId,
      tenantId,
      originalLength: text.length,
      summaryLength: result.length
    });

    return result;
  } catch (error) {
    logger.error('Error summarizing text', { error });
    throw error;
  }
};