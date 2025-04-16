/**
 * OpenAI Service
 * 
 * This service provides interfaces to OpenAI APIs for various NLP tasks.
 */

import { logger } from './observability';
import { metrics } from './observability/metrics-util';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) 
  : null;

/**
 * OpenAI Service Class
 */
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
}

export const openaiService = new OpenAIService();