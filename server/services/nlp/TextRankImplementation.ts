/**
 * TextRank Algorithm Implementation
 * 
 * Implements the TextRank algorithm for keyword extraction and text summarization.
 * Based on the concept of Google's PageRank algorithm applied to text processing.
 */

import * as natural from 'natural';
import * as stopword from 'stopword';

// Represents a node in the TextRank graph
interface TextRankNode {
  id: number;
  text: string;
  score: number;
  neighbors: Map<number, number>; // node id -> edge weight
}

// Options for the TextRank algorithm
export interface TextRankOptions {
  // General options
  dampingFactor: number;  // Damping factor (typically 0.85)
  maxIterations: number;  // Max number of iterations
  convergenceThreshold: number; // Convergence threshold
  
  // Keyword extraction options
  windowSize: number;     // Window size for co-occurrence
  topN: number;           // Number of top keywords to extract
  
  // Summarization options
  useSentences: boolean;  // Use sentences as nodes instead of words
  sentenceOverlapThreshold: number;  // Minimum similarity for connecting sentences
  summaryRatio: number;   // Percentage of sentences to include in summary (0-1)
}

/**
 * TextRank Algorithm class for keyword extraction and text summarization
 */
export class TextRank {
  private tokenizer: natural.WordTokenizer;
  private sentenceTokenizer: natural.SentenceTokenizer;
  private stemmer: typeof natural.PorterStemmer;
  private options: TextRankOptions;
  
  constructor(options: Partial<TextRankOptions> = {}) {
    // Initialize tokenizers with fallbacks
    try {
      if (natural.WordTokenizer) {
        this.tokenizer = new natural.WordTokenizer();
      } else {
        // Fallback tokenizer if the constructor is not available
        this.tokenizer = { tokenize: (text: string) => text.split(/\s+/) };
      }
      
      if (natural.SentenceTokenizer) {
        this.sentenceTokenizer = new natural.SentenceTokenizer();
      } else {
        // Fallback sentence tokenizer
        this.sentenceTokenizer = { tokenize: (text: string) => text.split(/[.!?]+/) };
      }
    } catch (error) {
      console.error("Error initializing Natural.js tokenizers in TextRank:", error);
      // Fallback implementations
      this.tokenizer = { tokenize: (text: string) => text.split(/\s+/) };
      this.sentenceTokenizer = { tokenize: (text: string) => text.split(/[.!?]+/) };
    }
    
    // Set up stemmer
    this.stemmer = natural.PorterStemmer || { 
      stem: (word: string) => word,
      attach: () => {} 
    };
    
    // Default options
    this.options = {
      dampingFactor: 0.85,
      maxIterations: 50,
      convergenceThreshold: 0.0001,
      windowSize: 4,
      topN: 10,
      useSentences: false,
      sentenceOverlapThreshold: 0.1,
      summaryRatio: 0.3,
      ...options
    };
  }
  
  /**
   * Extract keywords from text using TextRank
   */
  public extractKeywords(text: string): Array<{ term: string; score: number }> {
    // Tokenize the text
    const rawTokens = this.tokenizer.tokenize(text.toLowerCase());
    
    // Remove stopwords
    const filteredTokens = stopword.removeStopwords(rawTokens).filter(token => token.length > 2);
    
    // Create nodes for each unique token
    const nodes = new Map<string, TextRankNode>();
    const tokenToId = new Map<string, number>();
    
    // Stem tokens for better results
    const stemmedTokens = filteredTokens.map(token => this.stemmer.stem(token));
    
    // Create nodes for each unique stemmed token
    let nodeId = 0;
    for (const token of stemmedTokens) {
      if (!nodes.has(token) && token.length > 1) {
        const originalText = filteredTokens[stemmedTokens.indexOf(token)];
        nodes.set(token, {
          id: nodeId,
          text: originalText,
          score: 1.0,  // Initial score
          neighbors: new Map()
        });
        tokenToId.set(token, nodeId);
        nodeId++;
      }
    }
    
    // Build the graph - connect co-occurring words
    for (let i = 0; i < stemmedTokens.length; i++) {
      const token = stemmedTokens[i];
      if (!tokenToId.has(token)) continue;
      
      const tokenId = tokenToId.get(token)!;
      const node = nodes.get(token)!;
      
      // Look at words within the window
      const windowStart = Math.max(0, i - this.options.windowSize);
      const windowEnd = Math.min(stemmedTokens.length, i + this.options.windowSize);
      
      for (let j = windowStart; j < windowEnd; j++) {
        if (i === j) continue;  // Skip self
        
        const coOccurringToken = stemmedTokens[j];
        if (!tokenToId.has(coOccurringToken)) continue;
        
        const coOccurringId = tokenToId.get(coOccurringToken)!;
        
        // Add edge or increase weight
        if (node.neighbors.has(coOccurringId)) {
          node.neighbors.set(coOccurringId, node.neighbors.get(coOccurringId)! + 1);
        } else {
          node.neighbors.set(coOccurringId, 1);
        }
      }
    }
    
    // Run the TextRank algorithm
    this.runTextRankAlgorithm(nodes);
    
    // Convert to array and sort by score
    const keywordArray = Array.from(nodes.values()).map(node => ({
      term: node.text,
      score: node.score
    }));
    
    keywordArray.sort((a, b) => b.score - a.score);
    
    // Return top N keywords
    return keywordArray.slice(0, this.options.topN);
  }
  
  /**
   * Generate a summary of the text using TextRank
   */
  public generateSummary(text: string): string {
    // Split text into sentences
    const sentences = this.sentenceTokenizer.tokenize(text);
    
    if (sentences.length <= 3) {
      return text; // Text is already short, return as is
    }
    
    // Create nodes for each sentence
    const nodes = new Map<number, TextRankNode>();
    
    for (let i = 0; i < sentences.length; i++) {
      nodes.set(i, {
        id: i,
        text: sentences[i],
        score: 1.0,  // Initial score
        neighbors: new Map()
      });
    }
    
    // Build the graph - connect similar sentences
    for (let i = 0; i < sentences.length; i++) {
      const nodeA = nodes.get(i)!;
      
      for (let j = i + 1; j < sentences.length; j++) {
        const nodeB = nodes.get(j)!;
        
        // Calculate similarity between sentences
        const similarity = this.calculateSentenceSimilarity(sentences[i], sentences[j]);
        
        // Connect if similarity is above threshold
        if (similarity >= this.options.sentenceOverlapThreshold) {
          nodeA.neighbors.set(j, similarity);
          nodeB.neighbors.set(i, similarity);
        }
      }
    }
    
    // Run the TextRank algorithm
    this.runTextRankAlgorithm(nodes);
    
    // Get sentences with highest scores
    const rankedSentences = Array.from(nodes.entries())
      .map(([id, node]) => ({ id, score: node.score }))
      .sort((a, b) => b.score - a.score);
    
    // Determine how many sentences to include in summary
    const summarySize = Math.max(1, Math.ceil(sentences.length * this.options.summaryRatio));
    
    // Get the top sentences
    const topSentenceIds = rankedSentences
      .slice(0, summarySize)
      .map(s => s.id)
      .sort();  // Sort by original order
    
    // Build summary
    const summary = topSentenceIds.map(id => sentences[id]).join(' ');
    
    return summary;
  }
  
  /**
   * Run the TextRank algorithm on the graph
   */
  private runTextRankAlgorithm(nodes: Map<string | number, TextRankNode>): void {
    const nodeCount = nodes.size;
    
    if (nodeCount === 0) return;
    
    // Initialize scores
    for (const node of nodes.values()) {
      node.score = 1.0 / nodeCount;
    }
    
    // Run iterations
    for (let iteration = 0; iteration < this.options.maxIterations; iteration++) {
      let convergence = 0.0;
      
      // Store old scores to check convergence
      const oldScores = new Map<number, number>();
      for (const node of nodes.values()) {
        oldScores.set(node.id, node.score);
      }
      
      // Update scores based on TextRank formula
      for (const node of nodes.values()) {
        let newScore = (1.0 - this.options.dampingFactor) / nodeCount;
        
        // Sum contributions from neighboring nodes
        for (const [neighborId, weight] of node.neighbors.entries()) {
          // Find the neighbor node
          let neighborNode: TextRankNode | undefined;
          for (const n of nodes.values()) {
            if (n.id === neighborId) {
              neighborNode = n;
              break;
            }
          }
          
          if (!neighborNode) continue;
          
          // Calculate total weight of neighbor's outgoing links
          let totalWeight = 0.0;
          for (const w of neighborNode.neighbors.values()) {
            totalWeight += w;
          }
          
          if (totalWeight > 0) {
            newScore += this.options.dampingFactor * (weight / totalWeight) * neighborNode.score;
          }
        }
        
        // Update node score
        node.score = newScore;
        
        // Calculate convergence
        const diff = Math.abs(newScore - oldScores.get(node.id)!);
        convergence = Math.max(convergence, diff);
      }
      
      // Check for convergence
      if (convergence < this.options.convergenceThreshold) {
        console.log(`TextRank converged after ${iteration + 1} iterations`);
        break;
      }
    }
    
    // Normalize scores to sum to 1.0
    let totalScore = 0.0;
    for (const node of nodes.values()) {
      totalScore += node.score;
    }
    
    if (totalScore > 0) {
      for (const node of nodes.values()) {
        node.score /= totalScore;
      }
    }
  }
  
  /**
   * Calculate similarity between two sentences
   */
  private calculateSentenceSimilarity(sentenceA: string, sentenceB: string): number {
    // Tokenize both sentences
    const tokensA = this.tokenizeAndCleanSentence(sentenceA);
    const tokensB = this.tokenizeAndCleanSentence(sentenceB);
    
    if (tokensA.length === 0 || tokensB.length === 0) {
      return 0.0;
    }
    
    // Create sets for efficient intersection calculation
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    
    // Calculate intersection size
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    
    // Calculate Jaccard similarity coefficient
    return intersection.size / (setA.size + setB.size - intersection.size);
  }
  
  /**
   * Tokenize and clean a sentence
   */
  private tokenizeAndCleanSentence(sentence: string): string[] {
    // Tokenize
    const tokens = this.tokenizer.tokenize(sentence.toLowerCase());
    
    // Remove stopwords and short words
    const filtered = stopword.removeStopwords(tokens).filter(token => token.length > 2);
    
    // Stem tokens
    return filtered.map(token => this.stemmer.stem(token));
  }
}