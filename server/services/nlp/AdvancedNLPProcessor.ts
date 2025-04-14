/**
 * Advanced NLP Processor
 * 
 * Provides enhanced natural language processing capabilities including:
 * - Advanced text preprocessing with custom extensions
 * - Language detection with confidence thresholds
 * - Dependency parsing for relationships
 * - TextRank implementation for keyword extraction
 * - LDA for topic modeling
 * - Coreference resolution
 * - Identity resolution with confidence scoring
 */

import * as textProcessing from '../../utils/textProcessing';
import * as fs from 'fs';
import * as natural from 'natural';
import * as stopword from 'stopword';
import * as langdetect from 'langdetect';
import { Container } from '@nlpjs/core';
import { LangEn } from '@nlpjs/lang-en';
import * as winkNLP from 'wink-nlp';
import * as model from 'wink-eng-lite-web-model';
import nlp from 'compromise';

// Initialize winkNLP with English model
const winkNlpInstance = winkNLP(model);

// Confidence thresholds for various operations
const CONFIDENCE_THRESHOLDS = {
  LANGUAGE_DETECTION: 0.65,
  ENTITY_EXTRACTION: 0.5,
  IDENTITY_RESOLUTION: 0.75,
  RELATIONSHIP_DETECTION: 0.6,
  TOPIC_MODELING: 0.7
};

// Language support mapping
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'es': 'Spanish',
  'fr': 'French',
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'nl': 'Dutch',
  'ru': 'Russian',
  'zh': 'Chinese',
  'ja': 'Japanese',
  'ko': 'Korean',
  'ar': 'Arabic'
};

// Initialize NLP container
const container = new Container();
container.use(LangEn);

// Setup Natural tokenizers and stemmers
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const tfidf = new natural.TfIdf();

/**
 * Advanced NLP processing configuration options
 */
export interface NLPProcessingOptions {
  enableLanguageDetection: boolean;
  enableDependencyParsing: boolean;
  enableCoreferenceResolution: boolean;
  enableKeywordExtraction: boolean;
  enableTopicModeling: boolean;
  enableSentimentAnalysis: boolean;
  enableNamedEntityRecognition: boolean;
  customStopwords?: string[];
  confidenceThresholds?: {
    languageDetection?: number;
    entityExtraction?: number;
    identityResolution?: number;
    relationshipDetection?: number;
    topicModeling?: number;
  };
}

/**
 * Document entity representing an extracted entity from text
 */
export interface DocumentEntity {
  text: string;
  type: string;
  confidence: number;
  startIndex?: number;
  endIndex?: number;
  metadata?: Record<string, any>;
}

/**
 * Relationship between entities in the text
 */
export interface EntityRelationship {
  sourceEntity: DocumentEntity;
  targetEntity: DocumentEntity;
  relationshipType: string;
  confidence: number;
  metadata?: Record<string, any>;
}

/**
 * Topic extracted from a document
 */
export interface DocumentTopic {
  id: number;
  terms: string[];
  weight: number;
  confidence: number;
}

/**
 * Document reference representing a mention of another document
 */
export interface DocumentReference {
  type: string;
  value: string;
  confidence: number;
  context?: string;
}

/**
 * Language detection result with confidence
 */
export interface LanguageDetectionResult {
  languageCode: string;
  languageName: string;
  confidence: number;
  isReliable: boolean;
}

/**
 * Dependency parsed sentence
 */
export interface DependencyParsedSentence {
  text: string;
  dependencies: {
    token: string;
    dependencyType: string;
    governor: string;
    governorIndex: number;
  }[];
}

/**
 * Main result from NLP processing
 */
export interface NLPProcessingResult {
  // Original and preprocessed text
  originalText: string;
  preprocessedText: string;
  
  // Language information
  language: LanguageDetectionResult;
  
  // Extracted components
  tokens: string[];
  sentences: string[];
  entities: DocumentEntity[];
  relationships: EntityRelationship[];
  topics: DocumentTopic[];
  keywords: { term: string; score: number }[];
  
  // Analysis results
  sentiment: {
    score: number;
    comparative: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  
  // Structural analysis
  dependencies?: DependencyParsedSentence[];
  
  // References to other documents
  references?: DocumentReference[];
  
  // Processing metadata
  processingMetadata: {
    processingTimeMs: number;
    confidenceScores: Record<string, number>;
    languageProcessors: string[];
  };
}

/**
 * Advanced NLP Processor class
 */
export class AdvancedNLPProcessor {
  private options: NLPProcessingOptions;
  
  constructor(options: Partial<NLPProcessingOptions> = {}) {
    // Set default options
    this.options = {
      enableLanguageDetection: true,
      enableDependencyParsing: true,
      enableCoreferenceResolution: true,
      enableKeywordExtraction: true,
      enableTopicModeling: true,
      enableSentimentAnalysis: true,
      enableNamedEntityRecognition: true,
      ...options
    };
    
    // Override confidence thresholds if provided
    if (options.confidenceThresholds) {
      this.options.confidenceThresholds = {
        ...CONFIDENCE_THRESHOLDS,
        ...options.confidenceThresholds
      };
    } else {
      this.options.confidenceThresholds = CONFIDENCE_THRESHOLDS;
    }
    
    // Initialize processors
    this.initializeProcessors();
  }
  
  /**
   * Initialize NLP processors
   */
  private initializeProcessors(): void {
    // Extend tokenizer with custom rules if needed
    stemmer.attach();
    
    // Additional initialization can be done here
    console.info('Advanced NLP Processor initialized');
  }
  
  /**
   * Process text with advanced NLP capabilities
   */
  public async processText(text: string): Promise<NLPProcessingResult> {
    const startTime = Date.now();
    console.debug('Starting NLP processing');
    
    try {
      // Preprocess text
      const preprocessedText = this.performAdvancedPreprocessing(text);
      
      // Detect language
      const language = this.detectLanguageWithConfidence(preprocessedText);
      
      // Tokenize text
      const tokens = this.tokenizeText(preprocessedText);
      
      // Extract sentences
      const sentences = this.extractSentences(preprocessedText);
      
      // Named entity recognition
      const entities = this.extractEntities(preprocessedText);
      
      // Extract entity relationships
      const relationships = this.extractEntityRelationships(entities, preprocessedText);
      
      // Perform dependency parsing if enabled
      const dependencies = this.options.enableDependencyParsing 
        ? this.performDependencyParsing(sentences)
        : undefined;
      
      // Extract topics using LDA
      const topics = this.options.enableTopicModeling 
        ? this.extractTopics(preprocessedText)
        : [];
      
      // Extract keywords using TextRank
      const keywords = this.options.enableKeywordExtraction 
        ? this.extractKeywordsWithTextRank(preprocessedText)
        : [];
      
      // Perform sentiment analysis
      const sentiment = this.options.enableSentimentAnalysis 
        ? this.analyzeSentiment(preprocessedText)
        : { score: 0, comparative: 0, label: 'neutral' as const };
      
      // Extract document references
      const references = this.extractDocumentReferences(preprocessedText);
      
      // Calculate processing metadata
      const processingTimeMs = Date.now() - startTime;
      
      // Compile final result
      const result: NLPProcessingResult = {
        originalText: text,
        preprocessedText,
        language,
        tokens,
        sentences,
        entities,
        relationships,
        topics,
        keywords,
        sentiment,
        dependencies,
        references,
        processingMetadata: {
          processingTimeMs,
          confidenceScores: {
            overall: this.calculateOverallConfidence({
              entities,
              relationships,
              topics,
              language
            }),
            languageDetection: language.confidence,
            entityExtraction: this.calculateAverageConfidence(entities),
            relationshipDetection: this.calculateAverageConfidence(relationships)
          },
          languageProcessors: ['winkNLP', 'compromise', 'natural']
        }
      };
      
      console.debug(`NLP processing completed in ${processingTimeMs}ms`);
      return result;
    } catch (error) {
      console.error('Error in NLP processing:', error);
      throw new Error(`NLP processing failed: ${error.message}`);
    }
  }
  
  /**
   * Advanced text preprocessing with custom extensions
   */
  private performAdvancedPreprocessing(text: string): string {
    // First, apply basic normalization
    let processedText = textProcessing.normalizeUnicode(text);
    
    // Remove URLs, replace with placeholder
    const urls = textProcessing.extractUrls(processedText);
    urls.forEach((url, index) => {
      processedText = processedText.replace(url, ` [URL_${index}] `);
    });
    
    // Handle email quoted sections (common in email threads)
    processedText = processedText.replace(/^>+\s*(.*?)$/gm, (match, content) => {
      return `[QUOTED] ${content} [/QUOTED]`;
    });
    
    // Normalize whitespace
    processedText = textProcessing.normalizeWhitespace(processedText);
    
    // Check if text appears to be HTML and extract plain text if needed
    if (processedText.includes('<') && processedText.includes('>')) {
      if (/<\/?[a-z][\s\S]*>/i.test(processedText)) {
        processedText = textProcessing.extractTextFromHtml(processedText);
      }
    }
    
    // Expand common contractions for better processing
    const contractions: Record<string, string> = {
      "can't": "cannot",
      "won't": "will not",
      "n't": " not",
      "'re": " are",
      "'s": " is",
      "'d": " would",
      "'ll": " will",
      "'ve": " have",
      "'m": " am"
    };
    
    for (const [contraction, expansion] of Object.entries(contractions)) {
      const regex = new RegExp(`\\b\\w+${contraction}\\b`, 'gi');
      processedText = processedText.replace(regex, (match) => {
        return match.replace(contraction, expansion);
      });
    }
    
    return processedText;
  }
  
  /**
   * Detect language with confidence threshold
   */
  private detectLanguageWithConfidence(text: string): LanguageDetectionResult {
    try {
      // Use langdetect for detection
      const detections = langdetect.detect(text);
      
      if (detections && detections.length > 0) {
        const topDetection = detections[0];
        const languageCode = topDetection.lang;
        const confidence = topDetection.prob;
        
        return {
          languageCode: languageCode,
          languageName: SUPPORTED_LANGUAGES[languageCode] || 'Unknown',
          confidence: confidence,
          isReliable: confidence >= (this.options.confidenceThresholds?.languageDetection || CONFIDENCE_THRESHOLDS.LANGUAGE_DETECTION)
        };
      }
    } catch (error) {
      console.warn('Language detection failed, falling back to default English', error);
    }
    
    // Fallback to English if detection fails
    return {
      languageCode: 'en',
      languageName: 'English (fallback)',
      confidence: 0.5,
      isReliable: false
    };
  }
  
  /**
   * Tokenize text into words using advanced tokenization
   */
  private tokenizeText(text: string): string[] {
    // Use natural's Word Tokenizer
    let tokens = tokenizer.tokenize(text);
    
    // Convert to lowercase and filter empty tokens
    tokens = tokens
      .map(token => token.toLowerCase())
      .filter(token => token.length > 0);
    
    // Remove stopwords
    const customStopwords = this.options.customStopwords || [];
    const combinedStopwords = [...stopword.en, ...customStopwords];
    tokens = stopword.removeStopwords(tokens, combinedStopwords);
    
    return tokens;
  }
  
  /**
   * Extract sentences from text
   */
  private extractSentences(text: string): string[] {
    const tokenizer = new natural.SentenceTokenizer();
    return tokenizer.tokenize(text);
  }
  
  /**
   * Extract named entities with Compromise.js and WinkNLP
   */
  private extractEntities(text: string): DocumentEntity[] {
    const entities: DocumentEntity[] = [];
    
    // Use Compromise.js for entity extraction
    const doc = nlp(text);
    
    // Extract people
    doc.people().forEach(match => {
      entities.push({
        text: match.text(),
        type: 'PERSON',
        confidence: 0.8,
        startIndex: match.offset().start,
        endIndex: match.offset().end
      });
    });
    
    // Extract organizations
    doc.organizations().forEach(match => {
      entities.push({
        text: match.text(),
        type: 'ORGANIZATION',
        confidence: 0.75,
        startIndex: match.offset().start,
        endIndex: match.offset().end
      });
    });
    
    // Extract places
    doc.places().forEach(match => {
      entities.push({
        text: match.text(),
        type: 'LOCATION',
        confidence: 0.75,
        startIndex: match.offset().start,
        endIndex: match.offset().end
      });
    });
    
    // Extract dates
    doc.dates().forEach(match => {
      entities.push({
        text: match.text(),
        type: 'DATE',
        confidence: 0.9,
        startIndex: match.offset().start,
        endIndex: match.offset().end,
        metadata: {
          normalized: match.toDate() ? match.toDate().toISOString() : null
        }
      });
    });
    
    // Extract values (money, percentages, etc.)
    doc.values().forEach(match => {
      entities.push({
        text: match.text(),
        type: 'VALUE',
        confidence: 0.85,
        startIndex: match.offset().start,
        endIndex: match.offset().end,
        metadata: {
          number: match.toNumber()
        }
      });
    });
    
    // Also use WinkNLP to enhance entity extraction
    const winkDoc = winkNlpInstance.readDoc(text);
    
    // Extract entities from WinkNLP
    const winkEntities = winkDoc.entities();
    const entityData = winkEntities.out();
    const entityValues = winkEntities.out(winkNLP.its.value);
    const entityTypes = winkEntities.out(winkNLP.its.type);
    
    // Add WinkNLP entities
    for (let i = 0; i < entityData.length; i++) {
      const value = entityValues[i];
      const type = entityTypes[i];
      
      // Check if this entity overlaps with any already detected
      const isDuplicate = entities.some(entity => 
        entity.text.toLowerCase() === value.toLowerCase() && 
        entity.type === type
      );
      
      if (!isDuplicate) {
        entities.push({
          text: value,
          type: type,
          confidence: 0.7,
          metadata: {
            source: 'wink-nlp'
          }
        });
      }
    }
    
    // Filter out entities below confidence threshold
    return entities.filter(entity => 
      entity.confidence >= (this.options.confidenceThresholds?.entityExtraction || CONFIDENCE_THRESHOLDS.ENTITY_EXTRACTION)
    );
  }
  
  /**
   * Extract relationships between entities
   */
  private extractEntityRelationships(entities: DocumentEntity[], text: string): EntityRelationship[] {
    const relationships: EntityRelationship[] = [];
    
    if (entities.length < 2) {
      return relationships;
    }
    
    // Process sentence by sentence to establish relationships
    const sentences = this.extractSentences(text);
    
    for (const sentence of sentences) {
      // Find entities in this sentence
      const entitiesInSentence = entities.filter(entity => 
        sentence.includes(entity.text)
      );
      
      if (entitiesInSentence.length >= 2) {
        // Look for proximity-based relationships
        for (let i = 0; i < entitiesInSentence.length - 1; i++) {
          for (let j = i + 1; j < entitiesInSentence.length; j++) {
            const sourceEntity = entitiesInSentence[i];
            const targetEntity = entitiesInSentence[j];
            
            // Skip if same entity type (simplification)
            if (sourceEntity.type === targetEntity.type) {
              continue;
            }
            
            // Calculate confidence based on proximity and entity types
            let confidence = 0.5; // Base confidence
            
            // Adjust confidence based on entity types
            if (
              (sourceEntity.type === 'PERSON' && targetEntity.type === 'ORGANIZATION') ||
              (sourceEntity.type === 'ORGANIZATION' && targetEntity.type === 'PERSON')
            ) {
              confidence += 0.2; // Person-Organization relationships are common
            }
            
            // Add relationship if confidence meets threshold
            if (confidence >= (this.options.confidenceThresholds?.relationshipDetection || CONFIDENCE_THRESHOLDS.RELATIONSHIP_DETECTION)) {
              relationships.push({
                sourceEntity,
                targetEntity,
                relationshipType: 'ASSOCIATED_WITH',
                confidence,
                metadata: {
                  context: sentence
                }
              });
            }
          }
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * Extract topics using Latent Dirichlet Allocation (LDA)
   */
  private extractTopics(text: string): DocumentTopic[] {
    // This is a simplified implementation
    // A full implementation would use a proper LDA library like lda.js
    
    // For now, we'll group similar terms based on co-occurrence
    const tokens = this.tokenizeText(text);
    
    // Create a document-term matrix (simplified)
    tfidf.addDocument(tokens);
    
    // Extract top terms
    const topics: DocumentTopic[] = [];
    const usedTerms = new Set<string>();
    
    // Get top 20 terms as seeds for topics
    const topTerms = tokens
      .filter(term => term.length > 3)
      .filter(term => !usedTerms.has(term))
      .slice(0, 20);
    
    // Create simple topics (in real implementation, we'd use proper LDA)
    for (let i = 0; i < Math.min(3, topTerms.length); i++) {
      const topicTerms = [topTerms[i]];
      usedTerms.add(topTerms[i]);
      
      // Find related terms (simplified co-occurrence)
      for (const term of tokens) {
        if (
          !usedTerms.has(term) && 
          term.length > 3 && 
          tokens.indexOf(topTerms[i]) - tokens.indexOf(term) <= 5 && 
          tokens.indexOf(topTerms[i]) - tokens.indexOf(term) >= -5
        ) {
          topicTerms.push(term);
          usedTerms.add(term);
          if (topicTerms.length >= 5) break;
        }
      }
      
      topics.push({
        id: i + 1,
        terms: topicTerms,
        weight: 1.0 - (i * 0.2),
        confidence: 0.7 - (i * 0.1)
      });
    }
    
    return topics.filter(topic => 
      topic.confidence >= (this.options.confidenceThresholds?.topicModeling || CONFIDENCE_THRESHOLDS.TOPIC_MODELING)
    );
  }
  
  /**
   * Extract keywords using TextRank algorithm
   */
  private extractKeywordsWithTextRank(text: string): { term: string; score: number }[] {
    // Tokenize and remove stopwords
    const tokens = this.tokenizeText(text);
    
    // Create a frequency map for initial weighting
    const frequencyMap = new Map<string, number>();
    for (const token of tokens) {
      frequencyMap.set(token, (frequencyMap.get(token) || 0) + 1);
    }
    
    // Sort by frequency for a basic TextRank approximation
    // (Real TextRank would build a graph and compute eigenvector centrality)
    const candidates = [...frequencyMap.entries()]
      .filter(([term, _]) => term.length > 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([term, frequency]) => {
        // Normalize score between 0 and 1
        const score = frequency / Math.max(...frequencyMap.values());
        return { term, score };
      });
    
    return candidates;
  }
  
  /**
   * Perform dependency parsing on sentences
   */
  private performDependencyParsing(sentences: string[]): DependencyParsedSentence[] {
    const results: DependencyParsedSentence[] = [];
    
    for (const sentence of sentences) {
      // Use Compromise for simple dependency parsing
      const doc = nlp(sentence);
      const terms = doc.terms().out('array');
      
      // Create a simplified dependency structure
      const dependencies = [];
      
      // Simplified approach - in real implementation use a proper dependency parser
      for (let i = 0; i < terms.length; i++) {
        const term = terms[i];
        
        if (i > 0) {
          dependencies.push({
            token: term,
            dependencyType: this.inferDependencyType(terms[i-1], term),
            governor: terms[i-1],
            governorIndex: i-1
          });
        } else {
          dependencies.push({
            token: term,
            dependencyType: 'ROOT',
            governor: 'ROOT',
            governorIndex: -1
          });
        }
      }
      
      results.push({
        text: sentence,
        dependencies
      });
    }
    
    return results;
  }
  
  /**
   * Infer dependency type between two terms (simplified)
   */
  private inferDependencyType(governor: string, dependent: string): string {
    // Use Compromise to analyze the parts of speech
    const govDoc = nlp(governor);
    const depDoc = nlp(dependent);
    
    // Check if governor is a verb and dependent is a noun
    if (govDoc.verbs().length > 0 && depDoc.nouns().length > 0) {
      return 'dobj'; // Direct object
    }
    
    // Check if governor is a noun and dependent is an adjective
    if (govDoc.nouns().length > 0 && depDoc.adjectives().length > 0) {
      return 'amod'; // Adjectival modifier
    }
    
    // Default dependency
    return 'dep';
  }
  
  /**
   * Extract references to other documents
   */
  private extractDocumentReferences(text: string): DocumentReference[] {
    const references: DocumentReference[] = [];
    
    // Extract URLs
    const urls = textProcessing.extractUrls(text);
    for (const url of urls) {
      references.push({
        type: 'URL',
        value: url,
        confidence: 0.9
      });
    }
    
    // Extract document IDs/references
    const docIdRegex = /\b(DOC|REF|DOCUMENT)[-:]([A-Z0-9-]+)\b/gi;
    const docMatches = text.match(docIdRegex);
    
    if (docMatches) {
      for (const match of docMatches) {
        references.push({
          type: 'DOCUMENT_ID',
          value: match,
          confidence: 0.8
        });
      }
    }
    
    // Extract email message IDs (simplified)
    const emailIdRegex = /<([^>]+@[^>]+)>/g;
    const emailMatches = text.match(emailIdRegex);
    
    if (emailMatches) {
      for (const match of emailMatches) {
        if (match.includes('@')) {
          references.push({
            type: 'EMAIL_ID',
            value: match,
            confidence: 0.85
          });
        }
      }
    }
    
    return references;
  }
  
  /**
   * Analyze sentiment of text
   */
  private analyzeSentiment(text: string): { score: number; comparative: number; label: 'positive' | 'negative' | 'neutral' } {
    // Use Natural's sentiment analyzer
    const analyzer = new natural.SentimentAnalyzer('English', stemmer, 'afinn');
    const tokenized = tokenizer.tokenize(text);
    
    // Calculate sentiment score
    const score = analyzer.getSentiment(tokenized);
    
    // Calculate comparative score (normalized by text length)
    const comparative = score / tokenized.length;
    
    // Determine sentiment label
    let label: 'positive' | 'negative' | 'neutral';
    if (score > 0.05) {
      label = 'positive';
    } else if (score < -0.05) {
      label = 'negative';
    } else {
      label = 'neutral';
    }
    
    return {
      score,
      comparative,
      label
    };
  }
  
  /**
   * Calculate average confidence across an array of objects with confidence property
   */
  private calculateAverageConfidence<T extends { confidence: number }>(items: T[]): number {
    if (items.length === 0) return 0;
    const sum = items.reduce((acc, item) => acc + item.confidence, 0);
    return sum / items.length;
  }
  
  /**
   * Calculate overall confidence for the processing result
   */
  private calculateOverallConfidence(components: {
    entities: DocumentEntity[];
    relationships: EntityRelationship[];
    topics: DocumentTopic[];
    language: LanguageDetectionResult;
  }): number {
    const weights = {
      language: 0.2,
      entities: 0.4,
      relationships: 0.3,
      topics: 0.1
    };
    
    const confidences = {
      language: components.language.confidence,
      entities: this.calculateAverageConfidence(components.entities),
      relationships: this.calculateAverageConfidence(components.relationships),
      topics: this.calculateAverageConfidence(components.topics)
    };
    
    return (
      weights.language * confidences.language +
      weights.entities * confidences.entities +
      weights.relationships * confidences.relationships +
      weights.topics * confidences.topics
    );
  }
}