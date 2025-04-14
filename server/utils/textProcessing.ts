/**
 * Text Processing Utilities
 * 
 * Advanced utilities for processing and normalizing text data, including:
 * - Custom text preprocessing pipeline with extensible transformations
 * - Language-specific text normalization
 * - Context-aware text cleaning
 * - Domain-specific content extraction
 * - Email and data normalization
 */

import * as natural from 'natural';
import * as stopword from 'stopword';

// Text preprocessing pipeline types
export type TextTransformer = (text: string) => string;
export type TextAnalyzer = (text: string) => any;

export interface PreprocessingExtension {
  name: string;
  description: string;
  transformer: TextTransformer;
  priority: number; // Lower numbers run first
  isEnabled: boolean;
  appliesTo?: string[]; // List of language codes this applies to, empty means all
}

// Registry of available text preprocessing extensions
export const preprocessingExtensions: PreprocessingExtension[] = [
  // Core preprocessing stages
  {
    name: 'unicode_normalization',
    description: 'Normalizes Unicode characters to their canonical form',
    transformer: normalizeUnicode,
    priority: 10,
    isEnabled: true
  },
  {
    name: 'html_removal',
    description: 'Extracts plain text from HTML content',
    transformer: extractTextFromHtml,
    priority: 20,
    isEnabled: true
  },
  {
    name: 'whitespace_normalization',
    description: 'Normalizes whitespace characters',
    transformer: normalizeWhitespace,
    priority: 30,
    isEnabled: true
  },
  {
    name: 'unicode_entities_decoding',
    description: 'Decodes Unicode and HTML entities',
    transformer: decodeUnicodeEntities,
    priority: 40,
    isEnabled: true
  },
  
  // Language-specific preprocessing
  {
    name: 'english_contractions_expansion',
    description: 'Expands common English contractions',
    transformer: (text: string) => {
      const contractions: Record<string, string> = {
        "can't": "cannot",
        "won't": "will not",
        "n't": " not",
        "'ve": " have",
        "'re": " are",
        "'ll": " will",
        "'d": " would",
        "'m": " am",
        "'s": " is"
      };
      
      return Object.entries(contractions).reduce(
        (result, [pattern, replacement]) => 
          result.replace(new RegExp(pattern, 'gi'), replacement),
        text
      );
    },
    priority: 100,
    isEnabled: true,
    appliesTo: ['en']
  },
  
  // Domain-specific preprocessing
  {
    name: 'email_quote_removal',
    description: 'Removes email quote markers and quoted text for cleaner analysis',
    transformer: (text: string) => {
      // Remove lines starting with quote markers
      return text
        .replace(/^>+.+?$(\r?\n)?/gm, '') // Lines starting with '>'
        .replace(/^On .* wrote:$(\r?\n)?/gm, '') // Common email quote header
        .replace(/^-+ Original Message -+$(\r?\n)?/gm, '') // Outlook style markers
        .replace(/^From:.*?$(\r?\n)?^Sent:.*?$(\r?\n)?^To:.*?$(\r?\n)?^Subject:.*?$(\r?\n)?/gm, '') // Header info
        .replace(/\n{3,}/g, '\n\n'); // Normalize consecutive new lines
    },
    priority: 200,
    isEnabled: true
  },
  
  // Technical preprocessing
  {
    name: 'url_replacement',
    description: 'Replaces URLs with a placeholder to reduce noise',
    transformer: (text: string) => {
      return text.replace(/https?:\/\/[^\s<>"']+/g, '[URL]');
    },
    priority: 300,
    isEnabled: false // Disabled by default
  },
  
  // Project-specific specialized preprocessing
  {
    name: 'jira_ticket_extraction',
    description: 'Extracts and normalizes JIRA ticket references',
    transformer: (text: string) => {
      // Standardize JIRA ticket formats (matches formats like "ABC-123", "abc-123", "Ticket ABC-123")
      return text.replace(/\b([A-Za-z]+)[-_](\d+)\b/g, (match, project, number) => {
        return `[JIRA:${project.toUpperCase()}-${number}]`;
      });
    },
    priority: 400,
    isEnabled: true
  },
  
  {
    name: 'version_number_normalization',
    description: 'Standardizes version number formats',
    transformer: (text: string) => {
      // Standardize version formats (v1.2.3, 1.2.3, version 1.2.3)
      return text.replace(/\b(?:v|version\s+)?(\d+)\.(\d+)(?:\.(\d+))?(?:\.(\d+))?\b/gi, 'v$1.$2.$3$4');
    },
    priority: 500,
    isEnabled: true
  }
];

/**
 * Process text through the preprocessing pipeline
 * @param text Raw input text
 * @param languageCode Optional language code for language-specific processing
 * @param options Optional configuration for preprocessing
 * @returns Processed text
 */
export function preprocessText(
  text: string, 
  languageCode?: string,
  options: { disabledSteps?: string[], enabledSteps?: string[] } = {}
): string {
  // If text is empty, return empty string
  if (!text) return '';
  
  // Detect language if not provided
  if (!languageCode) {
    const { language } = identifyLanguage(text);
    languageCode = language;
  }
  
  // Filter and sort transformers
  const transformers = preprocessingExtensions
    .filter(ext => {
      // Skip disabled extensions
      if (options.disabledSteps?.includes(ext.name)) return false;
      
      // Include specifically enabled extensions
      if (options.enabledSteps?.includes(ext.name)) return true;
      
      // Skip disabled extensions
      if (!ext.isEnabled) return false;
      
      // Skip language-specific extensions that don't apply to this language
      if (ext.appliesTo?.length && !ext.appliesTo.includes(languageCode || 'unknown')) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => a.priority - b.priority);
  
  // Apply transformations in order
  return transformers.reduce(
    (processedText, extension) => extension.transformer(processedText),
    text
  );
}

// Registry for text analyzers
export const textAnalyzers: Record<string, TextAnalyzer> = {
  /**
   * Sentiment analysis (basic implementation)
   */
  'sentiment': (text: string) => {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 
                          'best', 'love', 'happy', 'positive', 'perfect', 
                          'resolve', 'solved', 'solution', 'successfully'];
    
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'worst',
                          'hate', 'poor', 'negative', 'issue', 'problem', 
                          'fail', 'failed', 'failure', 'error', 'broken'];
    
    // Preprocess text for consistent analysis
    const processedText = preprocessText(text.toLowerCase());
    
    // Count positive and negative words
    const posCount = positiveWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = processedText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    const negCount = negativeWords.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = processedText.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    // Calculate sentiment score (-1 to +1)
    const totalWords = processedText.split(/\s+/).length;
    const sentimentScore = totalWords > 0 
      ? (posCount - negCount) / Math.min(totalWords, posCount + negCount + 5)
      : 0;
    
    // Determine sentiment category
    let sentiment: 'positive' | 'negative' | 'neutral';
    if (sentimentScore > 0.2) {
      sentiment = 'positive';
    } else if (sentimentScore < -0.2) {
      sentiment = 'negative';
    } else {
      sentiment = 'neutral';
    }
    
    const confidence = Math.min(1, Math.abs(sentimentScore) * 1.5 + 0.3);
    
    return {
      sentiment,
      score: sentimentScore,
      confidence,
      counts: {
        positive: posCount,
        negative: negCount,
        total: totalWords
      }
    };
  },
  
  /**
   * Readability analysis
   */
  'readability': (text: string) => {
    // Preprocess and split text into sentences and words
    const processedText = preprocessText(text);
    const sentences = processedText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = processedText.split(/\s+/).filter(w => w.match(/[a-z0-9]/i));
    
    // Calculate basic statistics
    const sentenceCount = sentences.length;
    const wordCount = words.length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
    
    // Count syllables (very simple approach)
    const syllableCount = words.reduce((count, word) => {
      // Count vowel groups as syllables
      const syllables = word.toLowerCase().replace(/[^a-z]/g, '').match(/[aeiouy]+/g);
      return count + (syllables ? syllables.length : 1);
    }, 0);
    
    // Flesch-Kincaid Grade Level (simplified)
    const fkGrade = 0.39 * avgWordsPerSentence + 11.8 * (syllableCount / Math.max(wordCount, 1)) - 15.59;
    
    // Flesch Reading Ease (simplified)
    const fkEase = 206.835 - 1.015 * avgWordsPerSentence - 84.6 * (syllableCount / Math.max(wordCount, 1));
    
    return {
      metrics: {
        fleschKincaidGrade: Math.max(0, Math.min(18, Math.round(fkGrade * 10) / 10)),
        fleschReadingEase: Math.max(0, Math.min(100, Math.round(fkEase * 10) / 10)),
        sentenceCount,
        wordCount,
        syllableCount,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10
      },
      complexity: fkGrade > 12 ? 'high' : fkGrade > 8 ? 'medium' : 'low'
    };
  }
};

/**
 * Decode Unicode entities (such as HTML entities) in text
 * @param text Text containing unicode entities
 * @returns Decoded text
 */
export function decodeUnicodeEntities(text: string): string {
  // Handle numeric entities
  text = text.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  
  // Handle hex entities
  text = text.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Handle named entities
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&mdash;': '—',
    '&ndash;': '–',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
    '&euro;': '€',
    '&pound;': '£',
    '&yen;': '¥',
    '&cent;': '¢',
  };
  
  // Replace all known entities
  for (const [entity, char] of Object.entries(entities)) {
    text = text.replace(new RegExp(entity, 'g'), char);
  }
  
  return text;
}

/**
 * Format an email date string to a standardized ISO format
 * @param dateStr Email date string (potentially in various formats)
 * @returns ISO date string or null if invalid
 */
export function formatEmailDate(dateStr: string): string | null {
  try {
    // Try to parse the date
    const date = new Date(dateStr);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Return ISO string
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Normalize various date formats to ISO format
 * @param dateStr Date string in any recognized format
 * @returns ISO date string or null if invalid
 */
export function normalizeDate(dateStr: string): string | null {
  try {
    // Special handling for common formats
    
    // Handle European format (dd/mm/yyyy)
    if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[\/.-]/);
      dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    
    // Convert to date and check validity
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    return date.toISOString();
  } catch (e) {
    return null;
  }
}

/**
 * Extract plain text content from HTML
 * @param html HTML content
 * @returns Plain text version
 */
export function extractTextFromHtml(html: string): string {
  // Remove scripts
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove styles
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Replace common block elements with newlines
  text = text.replace(/<(div|p|h[1-6]|br|hr|table|tr)[^>]*>/gi, '\n');
  text = text.replace(/<\/(div|p|h[1-6]|table|tr)>/gi, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  
  // Replace list items with * for bullets
  text = text.replace(/<li[^>]*>/gi, '\n* ');
  
  // Remove remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode entities
  text = decodeUnicodeEntities(text);
  
  // Normalize whitespace
  text = text.replace(/\n{3,}/g, '\n\n');  // No more than 2 consecutive newlines
  text = text.replace(/[ \t]+/g, ' ');     // Normalize spaces and tabs
  
  return text.trim();
}

/**
 * Parse and normalize an email address
 * @param email Email address (possibly with display name)
 * @returns Normalized email parts
 */
export function parseEmailAddress(email: string): { name: string | null, address: string } {
  // Handle format: "Display Name" <email@example.com>
  const match = email.match(/^(?:"([^"]+)"|([^<]+))?[ ]*(?:<([^>]+)>)?$/);
  
  if (match) {
    const name = (match[1] || match[2] || '').trim() || null;
    const address = (match[3] || email).trim();
    return { name, address };
  }
  
  // If no match, return the full string as the address
  return { name: null, address: email.trim() };
}

/**
 * Normalize whitespace in text
 * @param text Input text with inconsistent whitespace
 * @returns Text with normalized whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')       // Convert CRLF to LF
    .replace(/\s+/g, ' ')         // Convert multiple whitespace to single space
    .trim();                      // Remove leading/trailing whitespace
}

/**
 * Normalize all Unicode characters to their canonical form
 * @param text Text with potentially non-normalized Unicode
 * @returns Normalized text
 */
export function normalizeUnicode(text: string): string {
  // Use Unicode normalization form NFC (Normalization Form Canonical Composition)
  // This ensures characters are decomposed and then recomposed to their canonical form
  return text.normalize('NFC');
}

/**
 * Convert quoted-printable encoded text to normal text
 * @param text Quoted-printable encoded text
 * @returns Decoded text
 */
export function decodeQuotedPrintable(text: string): string {
  // Remove soft line breaks (=<EOL>)
  text = text.replace(/=\r?\n/g, '');
  
  // Replace encoded characters
  return text.replace(/=([0-9A-F]{2})/gi, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
}

/**
 * Extract domains from a list of email addresses
 * @param addresses Array of email addresses
 * @returns Array of unique domains
 */
export function extractDomainsFromEmails(addresses: string[]): string[] {
  const domains = new Set<string>();
  
  for (const address of addresses) {
    const match = address.match(/@([^@]+)$/);
    if (match) {
      domains.add(match[1].toLowerCase());
    }
  }
  
  return Array.from(domains);
}

/**
 * Identify the primary language of text
 * @param text Text to analyze
 * @returns ISO language code and confidence score or 'unknown'
 */
export function identifyLanguage(text: string): { language: string; confidence: number } {
  try {
    // Use the langdetect library first if available
    const langResults = langdetect.detect(text);
    
    if (langResults && langResults.length > 0) {
      // langdetect returns an array of [language, confidence] pairs
      return {
        language: langResults[0][0],
        confidence: langResults[0][1]
      };
    }
  } catch (error) {
    console.log('Language detection fallback to basic heuristics');
  }
  
  // Fallback to basic heuristics for common languages
  const languagePatterns: Record<string, { words: string[]; threshold: number }> = {
    en: {
      words: ['the', 'and', 'to', 'of', 'is', 'in', 'that', 'it', 'for', 'on'],
      threshold: 5
    },
    es: {
      words: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'ser', 'se', 'no'],
      threshold: 4
    },
    fr: {
      words: ['le', 'la', 'de', 'et', 'est', 'en', 'un', 'une', 'du', 'que'],
      threshold: 4
    }
  };
  
  let bestMatch = { language: 'unknown', confidence: 0, count: 0 };
  
  for (const [lang, pattern] of Object.entries(languagePatterns)) {
    const wordCount = pattern.words.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = text.match(regex);
      return count + (matches ? matches.length : 0);
    }, 0);
    
    const confidence = Math.min(1.0, wordCount / (pattern.threshold * 2));
    
    if (wordCount >= pattern.threshold && wordCount > bestMatch.count) {
      bestMatch = { 
        language: lang, 
        confidence, 
        count: wordCount 
      };
    }
  }
  
  return { 
    language: bestMatch.language, 
    confidence: bestMatch.confidence 
  };
}

/**
 * Extract all URLs from text
 * @param text Text possibly containing URLs
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  return text.match(urlRegex) || [];
}

/**
 * Detect if text is base64 encoded
 * @param text Text to check
 * @returns True if text appears to be base64 encoded
 */
export function isBase64(text: string): boolean {
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  return base64Regex.test(text.trim()) && text.trim().length % 4 === 0;
}