/**
 * Coreference Resolver
 * 
 * Identifies and resolves coreference chains in text, connecting pronouns
 * and other referring expressions to their antecedents.
 */

import nlp from 'compromise';
import { DocumentEntity } from './AdvancedNLPProcessor';

// A coreference entity with text span information
export interface CoreferenceEntity {
  text: string;
  type: string;
  startIndex: number;
  endIndex: number;
  sentenceIndex: number;
}

// A coreference mention which refers to a specific entity
export interface CoreferenceMention {
  text: string;
  type: 'PRONOUN' | 'NOMINAL' | 'PROPER' | 'OTHER';
  startIndex: number;
  endIndex: number;
  sentenceIndex: number;
}

// A coreference chain connecting mentions to an entity
export interface CoreferenceChain {
  entity: CoreferenceEntity;
  mentions: CoreferenceMention[];
  confidence: number;
}

// Extended entity with coreference information
export interface EntityWithCoreferences extends DocumentEntity {
  coreferenceChain?: CoreferenceChain;
}

/**
 * Coreference Resolver class
 */
export class CoreferenceResolver {
  
  /**
   * Resolve coreferences in text
   */
  public resolve(text: string, entities: DocumentEntity[]): CoreferenceChain[] {
    // Split into sentences for contextual resolution
    const sentences = this.splitSentences(text);
    const chains: CoreferenceChain[] = [];
    
    // First, find all potential entities that could be referred to
    const potentialEntities = this.extractPotentialEntities(text, sentences, entities);
    
    // Then, find all pronouns and other referring expressions
    const referringExpressions = this.findReferringExpressions(sentences);
    
    // Now, resolve each referring expression to its most likely antecedent
    for (const expression of referringExpressions) {
      // Skip first-person pronouns as they usually don't have antecedents in the text
      if (['i', 'me', 'my', 'mine', 'we', 'us', 'our', 'ours'].includes(expression.text.toLowerCase())) {
        continue;
      }
      
      // Skip second-person pronouns as they usually refer to the reader
      if (['you', 'your', 'yours'].includes(expression.text.toLowerCase())) {
        continue;
      }
      
      // Find the most likely antecedent for this referring expression
      const antecedent = this.findAntecedent(expression, potentialEntities, sentences);
      
      if (antecedent) {
        // Check if this entity already has a coreference chain
        let existingChain = chains.find(chain => 
          chain.entity.text === antecedent.text && 
          chain.entity.startIndex === antecedent.startIndex
        );
        
        if (existingChain) {
          // Add this mention to the existing chain
          existingChain.mentions.push(expression);
        } else {
          // Create a new coreference chain
          const chain: CoreferenceChain = {
            entity: antecedent,
            mentions: [expression],
            confidence: this.calculateCoreferenceConfidence(antecedent, expression, sentences)
          };
          chains.push(chain);
        }
      }
    }
    
    return chains;
  }
  
  /**
   * Split text into sentences
   */
  private splitSentences(text: string): string[] {
    const doc = nlp(text);
    return doc.sentences().out('array');
  }
  
  /**
   * Extract potential entities from text that could be referred to
   */
  private extractPotentialEntities(
    text: string, 
    sentences: string[], 
    extractedEntities: DocumentEntity[]
  ): CoreferenceEntity[] {
    const entities: CoreferenceEntity[] = [];
    
    // First, convert existing named entities to potential coreference entities
    for (const entity of extractedEntities) {
      // Only use entities of types that are commonly referred to
      if (['PERSON', 'ORGANIZATION', 'LOCATION', 'PRODUCT', 'EVENT'].includes(entity.type)) {
        // Find which sentence this entity belongs to
        let sentenceIndex = 0;
        let currentPosition = 0;
        
        for (let i = 0; i < sentences.length; i++) {
          if (
            // If we have explicit start/end indices, use them
            (entity.startIndex !== undefined && 
             entity.startIndex >= currentPosition && 
             entity.startIndex < currentPosition + sentences[i].length) ||
            // Otherwise check if the entity text appears in this sentence
            sentences[i].includes(entity.text)
          ) {
            sentenceIndex = i;
            break;
          }
          currentPosition += sentences[i].length + 1; // +1 for the implied newline
        }
        
        // Compute start and end indices if not provided
        const startIndex = entity.startIndex !== undefined 
          ? entity.startIndex 
          : text.indexOf(entity.text, currentPosition);
          
        const endIndex = entity.endIndex !== undefined
          ? entity.endIndex
          : startIndex + entity.text.length;
        
        entities.push({
          text: entity.text,
          type: entity.type,
          startIndex,
          endIndex,
          sentenceIndex
        });
      }
    }
    
    // Also find other named entities and noun phrases not captured in the entity extraction
    const doc = nlp(text);
    
    // Add people
    const people = doc.people();
    people.forEach(person => {
      const personText = person.text();
      // Skip if already included in extracted entities
      if (!entities.some(e => e.text === personText)) {
        const offset = person.offset();
        
        // Find sentence index
        let sentenceIndex = 0;
        let currentPosition = 0;
        for (let i = 0; i < sentences.length; i++) {
          if (offset.start >= currentPosition && offset.start < currentPosition + sentences[i].length) {
            sentenceIndex = i;
            break;
          }
          currentPosition += sentences[i].length + 1;
        }
        
        entities.push({
          text: personText,
          type: 'PERSON',
          startIndex: offset.start,
          endIndex: offset.end,
          sentenceIndex
        });
      }
    });
    
    // Add organizations
    const organizations = doc.organizations();
    organizations.forEach(org => {
      const orgText = org.text();
      // Skip if already included in extracted entities
      if (!entities.some(e => e.text === orgText)) {
        const offset = org.offset();
        
        // Find sentence index
        let sentenceIndex = 0;
        let currentPosition = 0;
        for (let i = 0; i < sentences.length; i++) {
          if (offset.start >= currentPosition && offset.start < currentPosition + sentences[i].length) {
            sentenceIndex = i;
            break;
          }
          currentPosition += sentences[i].length + 1;
        }
        
        entities.push({
          text: orgText,
          type: 'ORGANIZATION',
          startIndex: offset.start,
          endIndex: offset.end,
          sentenceIndex
        });
      }
    });
    
    // Add places
    const places = doc.places();
    places.forEach(place => {
      const placeText = place.text();
      // Skip if already included in extracted entities
      if (!entities.some(e => e.text === placeText)) {
        const offset = place.offset();
        
        // Find sentence index
        let sentenceIndex = 0;
        let currentPosition = 0;
        for (let i = 0; i < sentences.length; i++) {
          if (offset.start >= currentPosition && offset.start < currentPosition + sentences[i].length) {
            sentenceIndex = i;
            break;
          }
          currentPosition += sentences[i].length + 1;
        }
        
        entities.push({
          text: placeText,
          type: 'LOCATION',
          startIndex: offset.start,
          endIndex: offset.end,
          sentenceIndex
        });
      }
    });
    
    // Add noun phrases (potential antecedents that aren't named entities)
    const nounPhrases = doc.match('#Determiner? #Adjective* #Noun+');
    nounPhrases.forEach(np => {
      const npText = np.text();
      // Skip small noun phrases and those already included
      if (npText.length <= 2 || entities.some(e => e.text === npText)) {
        return;
      }
      
      const offset = np.offset();
      
      // Find sentence index
      let sentenceIndex = 0;
      let currentPosition = 0;
      for (let i = 0; i < sentences.length; i++) {
        if (offset.start >= currentPosition && offset.start < currentPosition + sentences[i].length) {
          sentenceIndex = i;
          break;
        }
        currentPosition += sentences[i].length + 1;
      }
      
      entities.push({
        text: npText,
        type: 'NOMINAL',
        startIndex: offset.start,
        endIndex: offset.end,
        sentenceIndex
      });
    });
    
    return entities;
  }
  
  /**
   * Find all referring expressions (pronouns, etc.) in the text
   */
  private findReferringExpressions(sentences: string[]): CoreferenceMention[] {
    const mentions: CoreferenceMention[] = [];
    
    sentences.forEach((sentence, sentenceIndex) => {
      const doc = nlp(sentence);
      
      // Find pronouns
      const pronouns = doc.match('#Pronoun');
      pronouns.forEach(pronoun => {
        const text = pronoun.text();
        const offset = pronoun.offset();
        
        mentions.push({
          text,
          type: 'PRONOUN',
          startIndex: offset.start,
          endIndex: offset.end,
          sentenceIndex
        });
      });
      
      // Find demonstratives (this, that, these, those)
      const demonstratives = doc.match('(this|that|these|those) (#Noun|#Adjective #Noun)');
      demonstratives.forEach(dem => {
        const text = dem.text();
        const offset = dem.offset();
        
        mentions.push({
          text,
          type: 'NOMINAL',
          startIndex: offset.start,
          endIndex: offset.end,
          sentenceIndex
        });
      });
    });
    
    return mentions;
  }
  
  /**
   * Find the most likely antecedent for a referring expression
   */
  private findAntecedent(
    mention: CoreferenceMention, 
    potentialAntecedents: CoreferenceEntity[],
    sentences: string[]
  ): CoreferenceEntity | null {
    // Skip if no potential antecedents
    if (potentialAntecedents.length === 0) {
      return null;
    }
    
    // Filter potential antecedents to those that appear before this mention
    // or in the same sentence
    const candidates = potentialAntecedents.filter(ant => 
      ant.sentenceIndex < mention.sentenceIndex || 
      (ant.sentenceIndex === mention.sentenceIndex && ant.endIndex < mention.startIndex)
    );
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Score candidates based on various features
    const scores = candidates.map(candidate => {
      let score = 0;
      
      // Recency - more recent antecedents are preferred
      const sentenceDistance = mention.sentenceIndex - candidate.sentenceIndex;
      score += Math.max(0, 3 - sentenceDistance) * 2;
      
      // Grammatical role - subjects are preferred antecedents
      const candidateSentence = sentences[candidate.sentenceIndex];
      const doc = nlp(candidateSentence);
      const subjects = doc.match('(#Noun|#Pronoun) #Verb').out('array');
      
      if (subjects.some(subject => subject.includes(candidate.text))) {
        score += 2; // Bonus for being a subject
      }
      
      // Frequency - entities mentioned multiple times are more likely antecedents
      const entityMentions = sentences.filter(s => s.includes(candidate.text)).length;
      score += Math.min(entityMentions, 3);
      
      // Pronoun compatibility - check if pronoun and antecedent are compatible
      if (mention.type === 'PRONOUN') {
        const pronoun = mention.text.toLowerCase();
        
        // Gender compatibility
        if (['he', 'him', 'his'].includes(pronoun) && candidate.type === 'PERSON') {
          // Assume male for now (simplification)
          score += 1;
        } else if (['she', 'her', 'hers'].includes(pronoun) && candidate.type === 'PERSON') {
          // Assume female for now (simplification)
          score += 1;
        } else if (['it', 'its'].includes(pronoun) && 
                  ['ORGANIZATION', 'LOCATION', 'PRODUCT', 'EVENT', 'NOMINAL'].includes(candidate.type)) {
          score += 1;
        } else if (['they', 'them', 'their', 'theirs'].includes(pronoun)) {
          // 'They' could refer to people or organizations
          if (['PERSON', 'ORGANIZATION'].includes(candidate.type)) {
            score += 1;
          }
        }
      }
      
      return { candidate, score };
    });
    
    // Sort by score and return the highest scoring candidate
    scores.sort((a, b) => b.score - a.score);
    
    // Return null if no candidates scored above threshold
    if (scores.length === 0 || scores[0].score < 2) {
      return null;
    }
    
    return scores[0].candidate;
  }
  
  /**
   * Calculate confidence score for a coreference resolution
   */
  private calculateCoreferenceConfidence(
    antecedent: CoreferenceEntity, 
    mention: CoreferenceMention,
    sentences: string[]
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Adjust based on distance
    const distance = mention.sentenceIndex - antecedent.sentenceIndex;
    if (distance === 0) {
      confidence += 0.2; // Same sentence is more confident
    } else if (distance === 1) {
      confidence += 0.1; // Adjacent sentence
    } else if (distance > 3) {
      confidence -= 0.1 * Math.min(5, distance - 3); // Decay for distant mentions
    }
    
    // Adjust based on pronoun type and antecedent type compatibility
    if (mention.type === 'PRONOUN') {
      const pronoun = mention.text.toLowerCase();
      
      // Strong gender indicators
      if (['he', 'him', 'his'].includes(pronoun) && antecedent.type === 'PERSON') {
        confidence += 0.15;
      } else if (['she', 'her', 'hers'].includes(pronoun) && antecedent.type === 'PERSON') {
        confidence += 0.15;
      } else if (['it', 'its'].includes(pronoun) && 
                 ['ORGANIZATION', 'LOCATION', 'PRODUCT', 'EVENT', 'NOMINAL'].includes(antecedent.type)) {
        confidence += 0.15;
      } else if (['they', 'them', 'their', 'theirs'].includes(pronoun) && 
                 ['PERSON', 'ORGANIZATION'].includes(antecedent.type)) {
        confidence += 0.1;
      } else {
        // Incompatible types
        confidence -= 0.2;
      }
    }
    
    // Cap confidence between 0.1 and 0.95
    return Math.max(0.1, Math.min(0.95, confidence));
  }
  
  /**
   * Replace pronouns with their antecedents in text
   */
  public replacePronouns(text: string, chains: CoreferenceChain[]): string {
    // Sort all mentions by their position in reverse order
    // (to avoid index shifting problems when replacing)
    const allMentions = chains.flatMap(chain => 
      chain.mentions.map(mention => ({
        mention,
        entity: chain.entity
      }))
    ).sort((a, b) => b.mention.startIndex - a.mention.startIndex);
    
    // Replace mentions with their antecedents
    let result = text;
    
    for (const { mention, entity } of allMentions) {
      // Only replace pronouns, not other kinds of mentions
      if (mention.type === 'PRONOUN') {
        const beforeText = result.slice(0, mention.startIndex);
        const afterText = result.slice(mention.endIndex);
        
        // Format replacement based on pronoun type
        let replacement = entity.text;
        
        // For possessive pronouns, add apostrophe
        const pronoun = mention.text.toLowerCase();
        if (['his', 'her', 'its', 'their'].includes(pronoun)) {
          replacement = `${entity.text}'s`;
        }
        
        result = beforeText + replacement + afterText;
      }
    }
    
    return result;
  }
  
  /**
   * Get a formatted report of coreference chains
   */
  public getCoreferenceReport(chains: CoreferenceChain[]): string {
    let report = 'Coreference Chains:\n\n';
    
    chains.forEach((chain, i) => {
      report += `Chain ${i+1}: ${chain.entity.text} (${chain.entity.type})\n`;
      report += `Confidence: ${(chain.confidence * 100).toFixed(1)}%\n`;
      report += 'Mentions:\n';
      
      chain.mentions.forEach(mention => {
        report += `  - "${mention.text}" (${mention.type})\n`;
      });
      
      report += '\n';
    });
    
    return report;
  }
}