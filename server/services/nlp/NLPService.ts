/**
 * NLP Service
 * 
 * Main service that integrates all NLP components and provides a unified interface
 * for natural language processing operations throughout the application.
 */

import { AdvancedNLPProcessor, NLPProcessingResult, DocumentEntity } from './AdvancedNLPProcessor';
import { DependencyParser, ParsedSentence } from './DependencyParser';
import { CoreferenceResolver, CoreferenceChain } from './CoreferenceResolver';
import { TextRank } from './TextRankImplementation';
import { LDATopicModeling, BERTopicModeling, Topic } from './TopicModeling';
import { LanguageDetector, LanguageDetectionResult } from './LanguageDetector';
import { IdentityResolver, IdentityMatch } from './IdentityResolver';

export interface NLPServiceOptions {
  enableAdvancedFeatures: boolean;
  coreResolution: boolean;
  languageDetection: boolean;
  topicModeling: {
    enabled: boolean;
    numTopics: number;
  };
  summarization: {
    enabled: boolean;
    ratio: number;
  };
  identity: {
    enabled: boolean;
    minConfidence: number;
  };
}

export interface DocumentProcessingResult {
  // Basic analysis
  language: LanguageDetectionResult;
  entities: DocumentEntity[];
  keywords: { term: string; score: number }[];
  sentiment: {
    score: number;
    comparative: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  tokens: string[];
  
  // Advanced analysis
  dependencies?: ParsedSentence[];
  coreferences?: CoreferenceChain[];
  topics?: Topic[];
  identityMatches?: IdentityMatch[];
  summary?: string;
  
  // Performance and quality data
  processingMetadata: {
    processingTimeMs: number;
    confidenceScores: Record<string, number>;
  };
}

/**
 * Main NLP Service class
 */
export class NLPService {
  private processor: AdvancedNLPProcessor;
  private dependencyParser: DependencyParser;
  private coreferenceResolver: CoreferenceResolver;
  private textRank: TextRank;
  private ldaTopicModeling: LDATopicModeling;
  private bertTopicModeling: BERTopicModeling;
  private languageDetector: LanguageDetector;
  private identityResolver: IdentityResolver;
  private options: NLPServiceOptions;
  
  constructor(options: Partial<NLPServiceOptions> = {}) {
    // Default options
    this.options = {
      enableAdvancedFeatures: true,
      coreResolution: true,
      languageDetection: true,
      topicModeling: {
        enabled: true,
        numTopics: 5
      },
      summarization: {
        enabled: true,
        ratio: 0.3
      },
      identity: {
        enabled: true,
        minConfidence: 0.7
      },
      ...options
    };
    
    // Initialize components
    this.processor = new AdvancedNLPProcessor();
    this.dependencyParser = new DependencyParser();
    this.coreferenceResolver = new CoreferenceResolver();
    this.textRank = new TextRank();
    this.ldaTopicModeling = new LDATopicModeling({
      numTopics: this.options.topicModeling.numTopics
    });
    this.bertTopicModeling = new BERTopicModeling(
      this.options.topicModeling.numTopics
    );
    this.languageDetector = new LanguageDetector();
    this.identityResolver = new IdentityResolver();
    
    console.log('NLP Service initialized with all components');
  }
  
  /**
   * Process text with comprehensive NLP analysis
   */
  public async processText(text: string): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    console.log('Starting comprehensive NLP processing');
    
    try {
      // 1. Language detection (always run first)
      const language = this.options.languageDetection
        ? this.languageDetector.detectLanguage(text)
        : {
            languageCode: 'en',
            languageName: 'English (default)',
            confidence: 1.0,
            isReliable: true
          };
      
      // 2. Basic NLP processing with the main processor
      const nlpResult = await this.processor.processText(text);
      
      // 3. Additional processing based on options
      let dependencies: ParsedSentence[] | undefined;
      let coreferences: CoreferenceChain[] | undefined;
      let topics: Topic[] | undefined;
      let identityMatches: IdentityMatch[] | undefined;
      let summary: string | undefined;
      
      if (this.options.enableAdvancedFeatures) {
        // Parse dependencies
        dependencies = this.dependencyParser.parse(text);
        
        // Resolve coreferences if enabled
        if (this.options.coreResolution) {
          coreferences = this.coreferenceResolver.resolve(text, nlpResult.entities);
        }
        
        // Topic modeling if enabled
        if (this.options.topicModeling.enabled) {
          this.ldaTopicModeling.addDocument('current', text);
          this.ldaTopicModeling.fitModel();
          topics = this.ldaTopicModeling.getTopics();
        }
        
        // Identity resolution if enabled
        if (this.options.identity.enabled && nlpResult.entities.length > 0) {
          // Find identity matches for all entities
          const allMatches: IdentityMatch[] = [];
          
          for (const entity of nlpResult.entities) {
            this.identityResolver.addKnownEntities([entity]);
            const matches = this.identityResolver.findMatches(entity);
            allMatches.push(...matches);
          }
          
          // Filter by confidence
          identityMatches = allMatches.filter(
            match => match.confidence >= this.options.identity.minConfidence
          );
        }
        
        // Text summarization if enabled
        if (this.options.summarization.enabled) {
          summary = this.textRank.generateSummary(text);
        }
      }
      
      // Calculate total processing time
      const processingTimeMs = Date.now() - startTime;
      
      // Compile final result
      const result: DocumentProcessingResult = {
        language,
        entities: nlpResult.entities,
        keywords: nlpResult.keywords,
        sentiment: nlpResult.sentiment,
        tokens: nlpResult.tokens,
        dependencies,
        coreferences,
        topics,
        identityMatches,
        summary,
        processingMetadata: {
          processingTimeMs,
          confidenceScores: {
            overall: nlpResult.processingMetadata.confidenceScores.overall,
            languageDetection: language.confidence,
            entityExtraction: nlpResult.processingMetadata.confidenceScores.entityExtraction,
            relationshipDetection: nlpResult.processingMetadata.confidenceScores.relationshipDetection
          }
        }
      };
      
      console.log(`NLP processing completed in ${processingTimeMs}ms`);
      return result;
      
    } catch (error) {
      console.error('Error in NLP service:', error);
      throw new Error(`NLP processing failed: ${error.message}`);
    }
  }
  
  /**
   * Extract key insights from text
   */
  public async extractInsights(text: string): Promise<{
    entities: DocumentEntity[];
    keywords: { term: string; score: number }[];
    summary: string;
    sentiment: string;
    confidence: number;
  }> {
    // Process the text
    const result = await this.processText(text);
    
    // Extract top entities
    const topEntities = result.entities
      .filter(entity => entity.confidence > 0.7)
      .slice(0, 5);
    
    // Extract top keywords
    const topKeywords = result.keywords.slice(0, 10);
    
    // Get summary
    const summary = result.summary || 
      (this.options.summarization.enabled ? this.textRank.generateSummary(text) : text.slice(0, 200) + '...');
    
    // Determine overall sentiment
    let sentiment: string;
    if (result.sentiment.score > 0.1) {
      sentiment = 'Positive';
    } else if (result.sentiment.score < -0.1) {
      sentiment = 'Negative';
    } else {
      sentiment = 'Neutral';
    }
    
    // Calculate confidence
    const confidence = Object.values(result.processingMetadata.confidenceScores)
      .reduce((sum, score) => sum + score, 0) / 
      Object.values(result.processingMetadata.confidenceScores).length;
    
    return {
      entities: topEntities,
      keywords: topKeywords,
      summary,
      sentiment,
      confidence
    };
  }
  
  /**
   * Compare two texts for similarity
   */
  public async compareSimilarity(text1: string, text2: string): Promise<{
    overallSimilarity: number;
    entitySimilarity: number;
    keywordSimilarity: number;
    sentimentSimilarity: number;
  }> {
    // Process both texts
    const [result1, result2] = await Promise.all([
      this.processText(text1),
      this.processText(text2)
    ]);
    
    // Calculate entity similarity
    const entitySimilarity = this.calculateEntityOverlap(
      result1.entities,
      result2.entities
    );
    
    // Calculate keyword similarity
    const keywordSimilarity = this.calculateKeywordOverlap(
      result1.keywords,
      result2.keywords
    );
    
    // Calculate sentiment similarity (normalized difference)
    const sentimentDiff = Math.abs(result1.sentiment.score - result2.sentiment.score);
    const sentimentSimilarity = Math.max(0, 1 - sentimentDiff);
    
    // Calculate overall similarity (weighted average)
    const overallSimilarity = (
      entitySimilarity * 0.4 +
      keywordSimilarity * 0.4 +
      sentimentSimilarity * 0.2
    );
    
    return {
      overallSimilarity,
      entitySimilarity,
      keywordSimilarity,
      sentimentSimilarity
    };
  }
  
  /**
   * Calculate overlap between entity sets
   */
  private calculateEntityOverlap(entities1: DocumentEntity[], entities2: DocumentEntity[]): number {
    if (entities1.length === 0 && entities2.length === 0) {
      return 1.0; // Both empty = perfect similarity
    }
    
    if (entities1.length === 0 || entities2.length === 0) {
      return 0.0; // One empty = no similarity
    }
    
    // Extract entity texts
    const texts1 = entities1.map(e => e.text.toLowerCase());
    const texts2 = entities2.map(e => e.text.toLowerCase());
    
    // Count matches
    let matches = 0;
    
    for (const text of texts1) {
      if (texts2.includes(text)) {
        matches++;
      }
    }
    
    // Jaccard similarity (intersection / union)
    const union = new Set([...texts1, ...texts2]).size;
    return matches / union;
  }
  
  /**
   * Calculate overlap between keyword sets
   */
  private calculateKeywordOverlap(
    keywords1: Array<{ term: string; score: number }>,
    keywords2: Array<{ term: string; score: number }>
  ): number {
    if (keywords1.length === 0 && keywords2.length === 0) {
      return 1.0; // Both empty = perfect similarity
    }
    
    if (keywords1.length === 0 || keywords2.length === 0) {
      return 0.0; // One empty = no similarity
    }
    
    // Extract keyword terms
    const terms1 = keywords1.map(k => k.term.toLowerCase());
    const terms2 = keywords2.map(k => k.term.toLowerCase());
    
    // Count matches
    let matches = 0;
    
    for (const term of terms1) {
      if (terms2.includes(term)) {
        matches++;
      }
    }
    
    // Jaccard similarity (intersection / union)
    const union = new Set([...terms1, ...terms2]).size;
    return matches / union;
  }
  
  /**
   * Process a batch of texts
   */
  public async processBatch(texts: string[]): Promise<DocumentProcessingResult[]> {
    // Process each text concurrently
    const promises = texts.map(text => this.processText(text));
    return Promise.all(promises);
  }
  
  /**
   * Analyze sentiment of a text corpus
   */
  public async analyzeSentimentTrends(texts: string[]): Promise<{
    overall: number;
    positive: number;
    negative: number;
    neutral: number;
    trend: ('improving' | 'declining' | 'stable');
  }> {
    // Process each text
    const results = await this.processBatch(texts);
    
    // Count sentiment categories
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    let sentimentSum = 0;
    
    for (const result of results) {
      sentimentSum += result.sentiment.score;
      
      if (result.sentiment.label === 'positive') {
        positive++;
      } else if (result.sentiment.label === 'negative') {
        negative++;
      } else {
        neutral++;
      }
    }
    
    // Calculate averages
    const total = results.length;
    const overall = sentimentSum / total;
    
    // Determine trend
    let trend: 'improving' | 'declining' | 'stable';
    
    if (results.length >= 3) {
      // Compare first third to last third
      const chunkSize = Math.floor(results.length / 3);
      const firstChunk = results.slice(0, chunkSize);
      const lastChunk = results.slice(-chunkSize);
      
      const firstAvg = firstChunk.reduce((sum, r) => sum + r.sentiment.score, 0) / firstChunk.length;
      const lastAvg = lastChunk.reduce((sum, r) => sum + r.sentiment.score, 0) / lastChunk.length;
      
      if (lastAvg > firstAvg + 0.1) {
        trend = 'improving';
      } else if (lastAvg < firstAvg - 0.1) {
        trend = 'declining';
      } else {
        trend = 'stable';
      }
    } else {
      trend = 'stable'; // Not enough data for trend
    }
    
    return {
      overall,
      positive: positive / total,
      negative: negative / total,
      neutral: neutral / total,
      trend
    };
  }
}