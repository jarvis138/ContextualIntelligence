/**
 * Text Processing Utilities
 * 
 * Utilities for processing and normalizing text data, specifically for
 * email processing and data normalization.
 */

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
 * @returns ISO language code or 'unknown'
 */
export function identifyLanguage(text: string): string {
  // A real implementation would use a language detection library
  // This is a placeholder implementation
  
  // Check for common English words
  const englishWords = ['the', 'and', 'to', 'of', 'is', 'in', 'that'];
  const englishWordCount = englishWords.reduce((count, word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = text.match(regex);
    return count + (matches ? matches.length : 0);
  }, 0);
  
  // Very simple heuristic
  if (englishWordCount > 5) {
    return 'en';
  }
  
  return 'unknown';
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