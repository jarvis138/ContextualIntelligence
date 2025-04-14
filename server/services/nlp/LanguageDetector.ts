/**
 * Advanced Language Detector
 * 
 * Provides enhanced language detection capabilities with confidence scoring
 * and multi-model consensus for higher accuracy.
 */

import * as langdetect from 'langdetect';
import { Container } from '@nlpjs/core';
import { LangEn } from '@nlpjs/lang-en';

// Supported languages with ISO codes
export const SUPPORTED_LANGUAGES: Record<string, string> = {
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
  'ar': 'Arabic',
  'hi': 'Hindi',
  'tr': 'Turkish',
  'vi': 'Vietnamese',
  'pl': 'Polish',
  'sv': 'Swedish',
  'da': 'Danish',
  'fi': 'Finnish',
  'no': 'Norwegian',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'el': 'Greek',
  'bg': 'Bulgarian',
  'ro': 'Romanian',
  'uk': 'Ukrainian',
  'he': 'Hebrew',
  'th': 'Thai'
};

// Language detection result with confidence
export interface LanguageDetectionResult {
  languageCode: string;
  languageName: string;
  confidence: number;
  isReliable: boolean;
}

// Language detector options
export interface LanguageDetectorOptions {
  confidenceThreshold: number;
  minTextLength: number;
  useFallback: boolean;
  fallbackLanguage: string;
  detectScript: boolean;
}

/**
 * Advanced language detection class
 */
export class LanguageDetector {
  private options: LanguageDetectorOptions;
  private nlpContainer: Container;
  
  constructor(options: Partial<LanguageDetectorOptions> = {}) {
    // Default options
    this.options = {
      confidenceThreshold: 0.65,
      minTextLength: 10,
      useFallback: true,
      fallbackLanguage: 'en',
      detectScript: true,
      ...options
    };
    
    // Initialize NLP container
    this.nlpContainer = new Container();
    this.nlpContainer.use(LangEn);
  }
  
  /**
   * Detect language with confidence scoring
   */
  public detectLanguage(text: string): LanguageDetectionResult {
    // Check if text meets minimum length
    if (!text || text.length < this.options.minTextLength) {
      return this.createFallbackResult(text, 'Text too short for reliable detection');
    }
    
    try {
      // Detect script (optional)
      let scriptResult: { script: string; confidence: number } | null = null;
      if (this.options.detectScript) {
        scriptResult = this.detectScript(text);
      }
      
      // Use langdetect for primary detection
      const langdetectResults = langdetect.detect(text);
      
      if (!langdetectResults || langdetectResults.length === 0) {
        return this.createFallbackResult(text, 'No language detected');
      }
      
      // Get top result
      const topResult = langdetectResults[0];
      const languageCode = topResult.lang;
      const confidence = topResult.prob;
      
      // Adjust confidence based on script detection
      const adjustedConfidence = scriptResult 
        ? this.adjustConfidenceWithScript(languageCode, confidence, scriptResult)
        : confidence;
      
      // Check if language is supported and confidence is above threshold
      if (SUPPORTED_LANGUAGES[languageCode] && adjustedConfidence >= this.options.confidenceThreshold) {
        return {
          languageCode,
          languageName: SUPPORTED_LANGUAGES[languageCode],
          confidence: adjustedConfidence,
          isReliable: true
        };
      } else if (langdetectResults.length > 1) {
        // Try secondary result if primary didn't meet threshold
        const secondResult = langdetectResults[1];
        const secondLangCode = secondResult.lang;
        const secondConfidence = secondResult.prob;
        
        // Check if secondary result is better
        if (
          SUPPORTED_LANGUAGES[secondLangCode] && 
          secondConfidence >= this.options.confidenceThreshold
        ) {
          return {
            languageCode: secondLangCode,
            languageName: SUPPORTED_LANGUAGES[secondLangCode],
            confidence: secondConfidence,
            isReliable: true
          };
        }
      }
      
      // If the best result doesn't meet threshold but is still reasonable
      if (SUPPORTED_LANGUAGES[languageCode] && adjustedConfidence >= 0.35) {
        return {
          languageCode,
          languageName: SUPPORTED_LANGUAGES[languageCode],
          confidence: adjustedConfidence,
          isReliable: false
        };
      }
      
      // Fall back to default language
      return this.createFallbackResult(text, 'Confidence too low');
      
    } catch (error) {
      console.error('Language detection error:', error);
      return this.createFallbackResult(text, 'Detection error');
    }
  }
  
  /**
   * Create a fallback result when detection fails
   */
  private createFallbackResult(text: string, reason: string): LanguageDetectionResult {
    if (!this.options.useFallback) {
      return {
        languageCode: 'unknown',
        languageName: 'Unknown',
        confidence: 0.0,
        isReliable: false
      };
    }
    
    // Simple heuristic for common English words (used as fallback)
    const englishWords = ['the', 'and', 'to', 'of', 'is', 'in', 'that', 'for', 'it', 'with'];
    const englishWordCount = englishWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    // If text has several common English words, use English as fallback
    if (englishWordCount >= 3) {
      return {
        languageCode: 'en',
        languageName: 'English (fallback)',
        confidence: 0.4,
        isReliable: false
      };
    }
    
    // Use configured fallback language
    return {
      languageCode: this.options.fallbackLanguage,
      languageName: `${SUPPORTED_LANGUAGES[this.options.fallbackLanguage]} (fallback)`,
      confidence: 0.3,
      isReliable: false
    };
  }
  
  /**
   * Detect script based on character ranges
   */
  private detectScript(text: string): { script: string; confidence: number } {
    // Character ranges for common scripts
    const scriptRanges: Record<string, [number, number][]> = {
      'Latin': [[0x0041, 0x007A]], // Basic Latin
      'Cyrillic': [[0x0400, 0x04FF]],
      'Greek': [[0x0370, 0x03FF]],
      'Arabic': [[0x0600, 0x06FF]],
      'Hebrew': [[0x0590, 0x05FF]],
      'Devanagari': [[0x0900, 0x097F]], // Hindi
      'Chinese': [[0x4E00, 0x9FFF]], // CJK Unified Ideographs
      'Japanese': [[0x3040, 0x309F], [0x30A0, 0x30FF]], // Hiragana and Katakana
      'Korean': [[0xAC00, 0xD7AF]] // Hangul Syllables
    };
    
    // Count characters in each script
    const scriptCounts: Record<string, number> = {};
    let totalCount = 0;
    
    for (const char of text) {
      const code = char.charCodeAt(0);
      let matched = false;
      
      for (const [script, ranges] of Object.entries(scriptRanges)) {
        for (const [start, end] of ranges) {
          if (code >= start && code <= end) {
            scriptCounts[script] = (scriptCounts[script] || 0) + 1;
            matched = true;
            totalCount++;
            break;
          }
        }
        if (matched) break;
      }
    }
    
    // Find dominant script
    let dominantScript = 'Unknown';
    let maxCount = 0;
    
    for (const [script, count] of Object.entries(scriptCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantScript = script;
      }
    }
    
    // Calculate confidence
    const confidence = totalCount > 0 ? maxCount / totalCount : 0;
    
    return {
      script: dominantScript,
      confidence
    };
  }
  
  /**
   * Adjust language confidence based on script detection
   */
  private adjustConfidenceWithScript(
    languageCode: string, 
    baseConfidence: number, 
    scriptResult: { script: string; confidence: number }
  ): number {
    // Map languages to their typical scripts
    const languageScripts: Record<string, string[]> = {
      'en': ['Latin'],
      'es': ['Latin'],
      'fr': ['Latin'],
      'de': ['Latin'],
      'it': ['Latin'],
      'pt': ['Latin'],
      'nl': ['Latin'],
      'sv': ['Latin'],
      'ru': ['Cyrillic'],
      'uk': ['Cyrillic'],
      'bg': ['Cyrillic'],
      'zh': ['Chinese'],
      'ja': ['Japanese', 'Chinese'],
      'ko': ['Korean'],
      'ar': ['Arabic'],
      'he': ['Hebrew'],
      'hi': ['Devanagari'],
      'el': ['Greek']
    };
    
    // If script matches expected script for language, boost confidence
    const expectedScripts = languageScripts[languageCode] || [];
    
    if (expectedScripts.includes(scriptResult.script)) {
      // Boost confidence based on script confidence
      return Math.min(
        1.0, 
        baseConfidence + (0.15 * scriptResult.confidence)
      );
    } else if (scriptResult.confidence > 0.8) {
      // If script is very confident but doesn't match language, reduce confidence
      return Math.max(
        0.1,
        baseConfidence - (0.2 * scriptResult.confidence)
      );
    }
    
    // No adjustment
    return baseConfidence;
  }
  
  /**
   * Get the most likely language code from text (simple version)
   */
  public getLanguageCode(text: string): string {
    const result = this.detectLanguage(text);
    return result.languageCode;
  }
  
  /**
   * Verify if the text is in the expected language
   */
  public isLanguage(text: string, expectedLanguage: string): boolean {
    const result = this.detectLanguage(text);
    
    // Exact match
    if (result.languageCode === expectedLanguage) {
      return true;
    }
    
    // Check for language families (e.g., considering 'en-US' as 'en')
    if (
      expectedLanguage.includes('-') && 
      expectedLanguage.split('-')[0] === result.languageCode
    ) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Detect multiple languages in a document
   * Returns an array of language codes with their respective confidence scores
   */
  public detectMultipleLanguages(text: string, minSegmentLength: number = 100): LanguageDetectionResult[] {
    // Don't process very short texts
    if (text.length < minSegmentLength) {
      return [this.detectLanguage(text)];
    }
    
    // Split text into paragraphs
    const paragraphs = text.split(/\n\s*\n/);
    
    // Minimum paragraph length
    const MIN_PARAGRAPH_LENGTH = Math.min(minSegmentLength, 50);
    
    // Group short paragraphs
    const segments: string[] = [];
    let currentSegment = '';
    
    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();
      if (trimmedParagraph.length < MIN_PARAGRAPH_LENGTH) {
        currentSegment += ' ' + trimmedParagraph;
      } else {
        if (currentSegment.length >= MIN_PARAGRAPH_LENGTH) {
          segments.push(currentSegment.trim());
        }
        segments.push(trimmedParagraph);
        currentSegment = '';
      }
    }
    
    // Add final segment if it's long enough
    if (currentSegment.length >= MIN_PARAGRAPH_LENGTH) {
      segments.push(currentSegment.trim());
    }
    
    // Detect language for each segment
    const segmentResults = segments
      .filter(segment => segment.length >= MIN_PARAGRAPH_LENGTH)
      .map(segment => this.detectLanguage(segment));
    
    // Aggregate results by language
    const languageCounts: Record<string, { count: number, totalConfidence: number }> = {};
    
    for (const result of segmentResults) {
      if (!languageCounts[result.languageCode]) {
        languageCounts[result.languageCode] = { count: 0, totalConfidence: 0 };
      }
      
      languageCounts[result.languageCode].count++;
      languageCounts[result.languageCode].totalConfidence += result.confidence;
    }
    
    // Convert to array and calculate average confidence
    const results = Object.entries(languageCounts).map(([languageCode, { count, totalConfidence }]) => ({
      languageCode,
      languageName: SUPPORTED_LANGUAGES[languageCode] || 'Unknown',
      confidence: totalConfidence / count,
      isReliable: (totalConfidence / count) >= this.options.confidenceThreshold,
      segmentCount: count
    }));
    
    // Sort by segment count and confidence
    results.sort((a, b) => {
      if ((a as any).segmentCount !== (b as any).segmentCount) {
        return (b as any).segmentCount - (a as any).segmentCount;
      }
      return b.confidence - a.confidence;
    });
    
    // Remove segmentCount property before returning
    return results.map(({ languageCode, languageName, confidence, isReliable }) => ({
      languageCode,
      languageName,
      confidence,
      isReliable
    }));
  }
}