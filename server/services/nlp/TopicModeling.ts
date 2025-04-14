/**
 * Topic Modeling Implementation
 * 
 * Implements Latent Dirichlet Allocation (LDA) for topic modeling
 * and BERTopic-inspired functionality for transformer-based topic detection.
 */

import * as natural from 'natural';
import * as stopword from 'stopword';
import { DocumentEntity } from './AdvancedNLPProcessor';

// Document for topic modeling
export interface TopicDocument {
  id: string | number;
  text: string;
  tokens?: string[];
  bagOfWords?: Map<string, number>;
}

// Topic model result
export interface Topic {
  id: number;
  topTerms: Array<{ term: string; weight: number }>;
  documents: Array<{ id: string | number; score: number }>;
}

// Topic modeling options
export interface TopicModelingOptions {
  numTopics: number;
  numTerms: number;
  iterations: number;
  alpha: number;  // Dirichlet prior on document-topic distributions
  beta: number;   // Dirichlet prior on topic-term distributions
  burnIn: number; // Number of burn-in iterations
  randomSeed?: number;
}

/**
 * LDA Topic Modeling class
 */
export class LDATopicModeling {
  private tokenizer: natural.WordTokenizer;
  private stemmer: typeof natural.PorterStemmer;
  private options: TopicModelingOptions;
  private vocabulary: Map<string, number>;
  private documentTermMatrix: number[][];
  private topicTermMatrix: number[][];
  private documentTopicMatrix: number[][];
  private documents: TopicDocument[];
  
  constructor(options: Partial<TopicModelingOptions> = {}) {
    // Initialize tokenizer with fallback
    try {
      if (natural.WordTokenizer) {
        this.tokenizer = new natural.WordTokenizer();
      } else {
        // Fallback tokenizer
        this.tokenizer = { tokenize: (text: string) => text.split(/\s+/) };
      }
    } catch (error) {
      console.error("Error initializing Natural.js tokenizer in LDATopicModeling:", error);
      // Fallback implementation
      this.tokenizer = { tokenize: (text: string) => text.split(/\s+/) };
    }
    
    // Set up stemmer with fallback
    this.stemmer = natural.PorterStemmer || { 
      stem: (word: string) => word,
      attach: () => {} 
    };
    
    // Default options
    this.options = {
      numTopics: 5,
      numTerms: 10,
      iterations: 1000,
      alpha: 0.1,
      beta: 0.01,
      burnIn: 100,
      ...options
    };
    
    this.vocabulary = new Map<string, number>();
    this.documentTermMatrix = [];
    this.topicTermMatrix = [];
    this.documentTopicMatrix = [];
    this.documents = [];
  }
  
  /**
   * Add a document to the corpus
   */
  public addDocument(id: string | number, text: string): void {
    // Tokenize and clean the text
    const tokens = this.preprocessText(text);
    
    // Create document
    const document: TopicDocument = {
      id,
      text,
      tokens,
      bagOfWords: this.createBagOfWords(tokens)
    };
    
    this.documents.push(document);
  }
  
  /**
   * Add multiple documents to the corpus
   */
  public addDocuments(documents: Array<{ id: string | number; text: string }>): void {
    for (const doc of documents) {
      this.addDocument(doc.id, doc.text);
    }
  }
  
  /**
   * Preprocess text for topic modeling
   */
  private preprocessText(text: string): string[] {
    // Tokenize
    const tokens = this.tokenizer.tokenize(text.toLowerCase());
    
    // Remove stopwords and short words
    const filtered = stopword.removeStopwords(tokens).filter(token => token.length > 2);
    
    // Stem tokens
    return filtered.map(token => this.stemmer.stem(token));
  }
  
  /**
   * Create bag of words representation
   */
  private createBagOfWords(tokens: string[]): Map<string, number> {
    const bow = new Map<string, number>();
    
    for (const token of tokens) {
      if (bow.has(token)) {
        bow.set(token, bow.get(token)! + 1);
      } else {
        bow.set(token, 1);
      }
      
      // Add to vocabulary if not already there
      if (!this.vocabulary.has(token)) {
        this.vocabulary.set(token, this.vocabulary.size);
      }
    }
    
    return bow;
  }
  
  /**
   * Build the document-term matrix
   */
  private buildDocumentTermMatrix(): void {
    const numDocs = this.documents.length;
    const vocabSize = this.vocabulary.size;
    
    // Initialize matrix
    this.documentTermMatrix = Array(numDocs)
      .fill(null)
      .map(() => Array(vocabSize).fill(0));
    
    // Fill matrix with term frequencies
    for (let docIdx = 0; docIdx < numDocs; docIdx++) {
      const document = this.documents[docIdx];
      
      for (const [term, count] of document.bagOfWords!) {
        const termIdx = this.vocabulary.get(term)!;
        this.documentTermMatrix[docIdx][termIdx] = count;
      }
    }
  }
  
  /**
   * Initialize matrices for LDA
   */
  private initializeMatrices(): void {
    const numDocs = this.documents.length;
    const numTopics = this.options.numTopics;
    const vocabSize = this.vocabulary.size;
    
    // Build document-term matrix if not already built
    if (this.documentTermMatrix.length === 0) {
      this.buildDocumentTermMatrix();
    }
    
    // Initialize topic-term matrix (randomly)
    this.topicTermMatrix = Array(numTopics)
      .fill(null)
      .map(() => Array(vocabSize).fill(0));
    
    // Initialize document-topic matrix (randomly)
    this.documentTopicMatrix = Array(numDocs)
      .fill(null)
      .map(() => Array(numTopics).fill(0));
    
    // Random initialization
    const seed = this.options.randomSeed || Date.now();
    const random = new SeededRandom(seed);
    
    for (let t = 0; t < numTopics; t++) {
      for (let v = 0; v < vocabSize; v++) {
        this.topicTermMatrix[t][v] = random.random();
      }
    }
    
    for (let d = 0; d < numDocs; d++) {
      for (let t = 0; t < numTopics; t++) {
        this.documentTopicMatrix[d][t] = random.random();
      }
    }
    
    // Normalize matrices
    this.normalizeMatrix(this.topicTermMatrix);
    this.normalizeMatrix(this.documentTopicMatrix);
  }
  
  /**
   * Normalize a matrix rows to sum to 1
   */
  private normalizeMatrix(matrix: number[][]): void {
    for (let i = 0; i < matrix.length; i++) {
      const rowSum = matrix[i].reduce((sum, val) => sum + val, 0);
      
      if (rowSum > 0) {
        for (let j = 0; j < matrix[i].length; j++) {
          matrix[i][j] /= rowSum;
        }
      } else {
        // If row sums to 0, set uniform distribution
        const uniform = 1.0 / matrix[i].length;
        for (let j = 0; j < matrix[i].length; j++) {
          matrix[i][j] = uniform;
        }
      }
    }
  }
  
  /**
   * Run LDA inference
   */
  public fitModel(): void {
    // Check if we have documents
    if (this.documents.length === 0) {
      throw new Error('No documents added to the model');
    }
    
    console.log(`Starting LDA with ${this.documents.length} documents and ${this.vocabulary.size} terms`);
    
    // Initialize matrices
    this.initializeMatrices();
    
    // Run iterations
    for (let iter = 0; iter < this.options.iterations; iter++) {
      // E-step: Update document-topic matrix
      this.updateDocumentTopicMatrix();
      
      // M-step: Update topic-term matrix
      this.updateTopicTermMatrix();
      
      // Log progress
      if (iter % 100 === 0) {
        console.log(`LDA iteration ${iter}/${this.options.iterations}`);
      }
    }
    
    console.log('LDA completed');
  }
  
  /**
   * Update document-topic matrix (E-step)
   */
  private updateDocumentTopicMatrix(): void {
    const numDocs = this.documents.length;
    const numTopics = this.options.numTopics;
    
    for (let d = 0; d < numDocs; d++) {
      // Calculate unnormalized probabilities
      for (let t = 0; t < numTopics; t++) {
        let logProb = Math.log(this.options.alpha);
        
        // Multiply by likelihood of terms given topic
        for (let term = 0; term < this.vocabulary.size; term++) {
          const termCount = this.documentTermMatrix[d][term];
          if (termCount > 0) {
            logProb += termCount * Math.log(this.topicTermMatrix[t][term]);
          }
        }
        
        this.documentTopicMatrix[d][t] = Math.exp(logProb);
      }
    }
    
    // Normalize
    this.normalizeMatrix(this.documentTopicMatrix);
  }
  
  /**
   * Update topic-term matrix (M-step)
   */
  private updateTopicTermMatrix(): void {
    const numDocs = this.documents.length;
    const numTopics = this.options.numTopics;
    const vocabSize = this.vocabulary.size;
    
    // Reset topic-term matrix
    this.topicTermMatrix = Array(numTopics)
      .fill(null)
      .map(() => Array(vocabSize).fill(this.options.beta));
    
    // Accumulate term-topic counts
    for (let d = 0; d < numDocs; d++) {
      for (let term = 0; term < vocabSize; term++) {
        const termCount = this.documentTermMatrix[d][term];
        
        if (termCount > 0) {
          for (let t = 0; t < numTopics; t++) {
            this.topicTermMatrix[t][term] += 
              termCount * this.documentTopicMatrix[d][t];
          }
        }
      }
    }
    
    // Normalize
    this.normalizeMatrix(this.topicTermMatrix);
  }
  
  /**
   * Get topics from the model
   */
  public getTopics(): Topic[] {
    const numTopics = this.options.numTopics;
    const topics: Topic[] = [];
    
    // Map from term index to term
    const indexToTerm = new Map<number, string>();
    for (const [term, index] of this.vocabulary.entries()) {
      indexToTerm.set(index, term);
    }
    
    // Extract top terms for each topic
    for (let t = 0; t < numTopics; t++) {
      // Get term weights for this topic
      const termWeights = this.topicTermMatrix[t].map((weight, index) => ({
        term: indexToTerm.get(index)!,
        weight
      }));
      
      // Sort by weight descending
      termWeights.sort((a, b) => b.weight - a.weight);
      
      // Get top documents for this topic
      const docScores = this.documents.map((doc, index) => ({
        id: doc.id,
        score: this.documentTopicMatrix[index][t]
      }));
      
      // Sort by score descending
      docScores.sort((a, b) => b.score - a.score);
      
      // Create topic
      topics.push({
        id: t,
        topTerms: termWeights.slice(0, this.options.numTerms),
        documents: docScores.filter(doc => doc.score > 0.1) // Only include docs with significant topic presence
      });
    }
    
    return topics;
  }
  
  /**
   * Classify a new document into existing topics
   */
  public classifyDocument(text: string): { topicId: number; score: number }[] {
    // Preprocess text
    const tokens = this.preprocessText(text);
    const bow = this.createBagOfWords(tokens);
    
    // Create term vector
    const termVector = Array(this.vocabulary.size).fill(0);
    for (const [term, count] of bow.entries()) {
      const termIdx = this.vocabulary.get(term);
      if (termIdx !== undefined) {
        termVector[termIdx] = count;
      }
    }
    
    // Calculate topic probabilities
    const topicProbs = Array(this.options.numTopics).fill(0);
    for (let t = 0; t < this.options.numTopics; t++) {
      let logProb = Math.log(this.options.alpha);
      
      for (let term = 0; term < this.vocabulary.size; term++) {
        const termCount = termVector[term];
        if (termCount > 0) {
          logProb += termCount * Math.log(this.topicTermMatrix[t][term]);
        }
      }
      
      topicProbs[t] = Math.exp(logProb);
    }
    
    // Normalize
    const sum = topicProbs.reduce((a, b) => a + b, 0);
    for (let t = 0; t < this.options.numTopics; t++) {
      topicProbs[t] /= sum;
    }
    
    // Create result
    const result = topicProbs.map((score, topicId) => ({ topicId, score }));
    
    // Sort by score descending
    result.sort((a, b) => b.score - a.score);
    
    return result;
  }
  
  /**
   * Format topics for display
   */
  public formatTopics(): string {
    const topics = this.getTopics();
    let result = 'Topics:\n';
    
    for (const topic of topics) {
      result += `\nTopic ${topic.id}:\n`;
      
      // Format terms
      for (const { term, weight } of topic.topTerms) {
        result += `  - ${term}: ${weight.toFixed(4)}\n`;
      }
      
      // Format top documents
      if (topic.documents.length > 0) {
        result += '\n  Top documents:\n';
        for (let i = 0; i < Math.min(3, topic.documents.length); i++) {
          const { id, score } = topic.documents[i];
          result += `  - Doc ${id}: ${score.toFixed(4)}\n`;
        }
      }
    }
    
    return result;
  }
}

/**
 * Simple seeded random number generator
 */
class SeededRandom {
  private seed: number;
  
  constructor(seed: number) {
    this.seed = seed;
  }
  
  public random(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

/**
 * Mock BERTopic implementation inspired by transformer-based topic detection
 * In a real implementation, this would use BERT or similar embeddings
 */
export class BERTopicModeling {
  private documents: Array<{ id: string | number; text: string; embedding?: number[] }>;
  private numTopics: number;
  private numTermsPerTopic: number;
  
  constructor(numTopics: number = 5, numTermsPerTopic: number = 10) {
    this.documents = [];
    this.numTopics = numTopics;
    this.numTermsPerTopic = numTermsPerTopic;
  }
  
  /**
   * Add a document to the corpus
   */
  public addDocument(id: string | number, text: string): void {
    this.documents.push({ id, text });
  }
  
  /**
   * Add multiple documents
   */
  public addDocuments(documents: Array<{ id: string | number; text: string }>): void {
    for (const doc of documents) {
      this.addDocument(doc.id, doc.text);
    }
  }
  
  /**
   * Create document embeddings (mock implementation)
   * In a real implementation, this would use BERT or similar to create embeddings
   */
  private createEmbeddings(): void {
    // This is a mock implementation that creates random embeddings
    // In a real implementation, you would use a pre-trained model
    console.log('Creating mock embeddings for BERTopic (in real implementation, would use BERT)');
    
    const embeddingDim = 32; // In real implementation, this would be larger (768+ for BERT)
    const random = new SeededRandom(123456);
    
    for (const doc of this.documents) {
      // Create random embedding (mock)
      doc.embedding = Array(embeddingDim)
        .fill(0)
        .map(() => random.random() * 2 - 1); // Random values between -1 and 1
      
      // In a real implementation, you would do something like:
      // doc.embedding = bertModel.encode(doc.text);
    }
  }
  
  /**
   * Cluster documents into topics (mock implementation)
   * In a real implementation, this would use UMAP + HDBSCAN on embeddings
   */
  private clusterDocuments(): number[] {
    // Ensure embeddings exist
    if (!this.documents[0]?.embedding) {
      this.createEmbeddings();
    }
    
    // This is a mock implementation that assigns random topics
    // In a real implementation, you would use UMAP + HDBSCAN
    console.log('Clustering documents for BERTopic (mock implementation)');
    
    const random = new SeededRandom(789012);
    
    // Assign random cluster (topic) to each document
    return this.documents.map(() => 
      Math.floor(random.random() * this.numTopics)
    );
  }
  
  /**
   * Extract representative terms for each topic (mock implementation)
   * In a real implementation, this would use c-TF-IDF
   */
  private extractTopicTerms(topicAssignments: number[]): Map<number, string[]> {
    // This is a mock implementation
    // In a real implementation, you would use c-TF-IDF
    console.log('Extracting topic terms for BERTopic (mock implementation)');
    
    const result = new Map<number, string[]>();
    const tokenizer = new natural.WordTokenizer();
    
    // Group documents by topic
    const docsByTopic = new Map<number, string[]>();
    
    for (let i = 0; i < this.documents.length; i++) {
      const topic = topicAssignments[i];
      if (!docsByTopic.has(topic)) {
        docsByTopic.set(topic, []);
      }
      docsByTopic.get(topic)!.push(this.documents[i].text);
    }
    
    // For each topic, extract top terms
    for (const [topic, docs] of docsByTopic.entries()) {
      // Tokenize all documents
      const allTokens = docs.flatMap(doc => 
        tokenizer.tokenize(doc.toLowerCase())
      );
      
      // Count term frequencies
      const termCounts = new Map<string, number>();
      for (const token of allTokens) {
        if (token.length <= 2) continue; // Skip short tokens
        termCounts.set(token, (termCounts.get(token) || 0) + 1);
      }
      
      // Sort by frequency
      const sortedTerms = Array.from(termCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, this.numTermsPerTopic)
        .map(([term, _]) => term);
      
      result.set(topic, sortedTerms);
    }
    
    return result;
  }
  
  /**
   * Fit the model
   */
  public fitModel(): Topic[] {
    // Check if we have documents
    if (this.documents.length === 0) {
      throw new Error('No documents added to the model');
    }
    
    console.log(`Starting BERTopic with ${this.documents.length} documents`);
    
    // Create embeddings
    this.createEmbeddings();
    
    // Cluster documents
    const topicAssignments = this.clusterDocuments();
    
    // Extract terms for each topic
    const topicTerms = this.extractTopicTerms(topicAssignments);
    
    // Create final topic representation
    const topics: Topic[] = [];
    
    for (let t = 0; t < this.numTopics; t++) {
      // Get terms for this topic
      const terms = topicTerms.get(t) || [];
      
      // Get documents assigned to this topic
      const docIndices = topicAssignments
        .map((topic, index) => ({ topic, index }))
        .filter(({ topic }) => topic === t)
        .map(({ index }) => index);
      
      // Calculate mock topic scores for documents (would be based on distance to cluster center in real impl)
      const documents = docIndices.map(index => ({
        id: this.documents[index].id,
        score: 0.5 + Math.random() * 0.5 // Mock scores between 0.5 and 1.0
      }));
      
      // Create topic with terms and documents
      topics.push({
        id: t,
        topTerms: terms.map(term => ({ term, weight: 0.5 + Math.random() * 0.5 })), // Mock weights
        documents
      });
    }
    
    return topics;
  }
}