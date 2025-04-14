/**
 * Dependency Parser
 * 
 * Provides advanced dependency parsing capabilities for natural language text,
 * extracting syntactic relationships between words in sentences.
 */

import nlp from 'compromise';
import * as natural from 'natural';

// Types of syntactic dependencies
export enum DependencyType {
  SUBJECT = 'nsubj',      // Nominal subject
  DIRECT_OBJECT = 'dobj', // Direct object
  INDIRECT_OBJECT = 'iobj', // Indirect object
  DETERMINER = 'det',     // Determiner
  ADJECTIVE_MOD = 'amod', // Adjectival modifier
  ADVERB_MOD = 'advmod',  // Adverbial modifier
  PREPOSITION = 'prep',   // Prepositional modifier
  POSSESSION = 'poss',    // Possession modifier
  CONJUNCTION = 'conj',   // Conjunction
  COMPOUND = 'compound',  // Compound word
  ROOT = 'root',          // Root of the sentence
  AUX = 'aux',            // Auxiliary verb
  NEGATION = 'neg',       // Negation modifier
  CLAUSAL_COMPLEMENT = 'ccomp', // Clausal complement
  OPEN_CLAUSAL_COMPLEMENT = 'xcomp', // Open clausal complement
  CASE = 'case',          // Case marking
  PASSIVE_SUBJECT = 'nsubjpass', // Passive nominal subject
  RELATIVE_CLAUSE = 'relcl', // Relative clause modifier
  OTHER = 'dep'           // Generic dependency
}

// Types of parts of speech (simplified)
export enum PartOfSpeech {
  NOUN = 'NOUN',
  VERB = 'VERB',
  ADJECTIVE = 'ADJ',
  ADVERB = 'ADV',
  PRONOUN = 'PRON',
  DETERMINER = 'DET',
  PREPOSITION = 'PREP',
  CONJUNCTION = 'CONJ',
  INTERJECTION = 'INTERJ',
  NUMERAL = 'NUM',
  PARTICLE = 'PART',
  PUNCTUATION = 'PUNCT',
  SYMBOL = 'SYM',
  OTHER = 'X'
}

// A token in a parsed sentence
export interface Token {
  text: string;
  lemma: string;
  pos: PartOfSpeech;
  index: number;
}

// A dependency relationship between two tokens
export interface Dependency {
  governor: Token;
  dependent: Token;
  type: DependencyType;
}

// A fully parsed sentence
export interface ParsedSentence {
  text: string;
  tokens: Token[];
  dependencies: Dependency[];
  rootIndex: number;
}

/**
 * Main Dependency Parser class
 */
export class DependencyParser {
  private sentenceTokenizer: natural.SentenceTokenizer;
  private wordTokenizer: natural.WordTokenizer;
  
  constructor() {
    this.sentenceTokenizer = new natural.SentenceTokenizer();
    this.wordTokenizer = new natural.WordTokenizer();
  }
  
  /**
   * Parse text into array of ParsedSentence objects
   */
  public parse(text: string): ParsedSentence[] {
    const sentences = this.sentenceTokenizer.tokenize(text);
    return sentences.map(sentence => this.parseSentence(sentence));
  }
  
  /**
   * Parse a single sentence into a ParsedSentence object
   */
  private parseSentence(sentence: string): ParsedSentence {
    // Use Compromise for tagging parts of speech
    const doc = nlp(sentence);
    
    // Get all terms
    const terms = doc.terms().out('array');
    const tags = doc.terms().out('tags');
    
    // Create tokens
    const tokens: Token[] = terms.map((term, index) => ({
      text: term,
      lemma: this.lemmatize(term, this.mapCompromiseTagToPOS(tags[index])),
      pos: this.mapCompromiseTagToPOS(tags[index]),
      index: index
    }));
    
    // Extract dependencies (simplified approach)
    const dependencies: Dependency[] = [];
    let rootIndex = -1;
    
    // First, find the root (main verb)
    const verbs = doc.verbs().out('array');
    if (verbs.length > 0) {
      // Find the index of the first verb in the tokens array
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i].text === verbs[0]) {
          rootIndex = i;
          break;
        }
      }
    } else {
      // If no verb, use the first token as root
      rootIndex = 0;
    }
    
    // Now build dependency tree centered around the root
    for (let i = 0; i < tokens.length; i++) {
      if (i === rootIndex) continue;
      
      // Determine dependency type based on POS and position
      const dependencyType = this.inferDependencyType(tokens[rootIndex], tokens[i]);
      
      dependencies.push({
        governor: tokens[rootIndex],
        dependent: tokens[i],
        type: dependencyType
      });
    }
    
    // Find additional dependencies between non-root tokens
    for (let i = 0; i < tokens.length; i++) {
      if (i === rootIndex) continue;
      
      for (let j = 0; j < tokens.length; j++) {
        if (j === rootIndex || j === i) continue;
        
        // Only consider tokens that are close to each other
        if (Math.abs(i - j) <= 3) {
          const depType = this.inferDependencyTypeBetweenNonRoot(tokens[i], tokens[j]);
          
          if (depType !== DependencyType.OTHER) {
            dependencies.push({
              governor: tokens[i],
              dependent: tokens[j],
              type: depType
            });
          }
        }
      }
    }
    
    return {
      text: sentence,
      tokens,
      dependencies,
      rootIndex
    };
  }
  
  /**
   * Infer dependency type between root token and dependent
   */
  private inferDependencyType(governor: Token, dependent: Token): DependencyType {
    // If governor is verb
    if (governor.pos === PartOfSpeech.VERB) {
      // Noun before verb is likely subject
      if (dependent.pos === PartOfSpeech.NOUN && dependent.index < governor.index) {
        return DependencyType.SUBJECT;
      }
      
      // Noun after verb is likely object
      if (dependent.pos === PartOfSpeech.NOUN && dependent.index > governor.index) {
        return DependencyType.DIRECT_OBJECT;
      }
      
      // Adverb is adverbial modifier
      if (dependent.pos === PartOfSpeech.ADVERB) {
        return DependencyType.ADVERB_MOD;
      }
    }
    
    // If governor is noun
    if (governor.pos === PartOfSpeech.NOUN) {
      // Adjective is adjectival modifier
      if (dependent.pos === PartOfSpeech.ADJECTIVE) {
        return DependencyType.ADJECTIVE_MOD;
      }
      
      // Determiner
      if (dependent.pos === PartOfSpeech.DETERMINER) {
        return DependencyType.DETERMINER;
      }
      
      // Another noun could be compound
      if (dependent.pos === PartOfSpeech.NOUN && Math.abs(governor.index - dependent.index) === 1) {
        return DependencyType.COMPOUND;
      }
    }
    
    // Preposition
    if (dependent.pos === PartOfSpeech.PREPOSITION) {
      return DependencyType.PREPOSITION;
    }
    
    // Conjunction
    if (dependent.pos === PartOfSpeech.CONJUNCTION) {
      return DependencyType.CONJUNCTION;
    }
    
    return DependencyType.OTHER;
  }
  
  /**
   * Infer dependency type between two non-root tokens
   */
  private inferDependencyTypeBetweenNonRoot(governor: Token, dependent: Token): DependencyType {
    // Only consider specific relationships to avoid explosion of dependencies
    
    // Adjective modifying noun
    if (governor.pos === PartOfSpeech.NOUN && dependent.pos === PartOfSpeech.ADJECTIVE) {
      // Adjectives usually come before nouns
      if (dependent.index < governor.index) {
        return DependencyType.ADJECTIVE_MOD;
      }
    }
    
    // Determiner for noun
    if (governor.pos === PartOfSpeech.NOUN && dependent.pos === PartOfSpeech.DETERMINER) {
      // Determiners come before nouns
      if (dependent.index < governor.index && governor.index - dependent.index <= 2) {
        return DependencyType.DETERMINER;
      }
    }
    
    // Possessive
    if (governor.pos === PartOfSpeech.NOUN && dependent.pos === PartOfSpeech.PRONOUN) {
      const possessives = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
      if (possessives.includes(dependent.text.toLowerCase())) {
        return DependencyType.POSSESSION;
      }
    }
    
    return DependencyType.OTHER;
  }
  
  /**
   * Map Compromise.js tag to our simplified POS enum
   */
  private mapCompromiseTagToPOS(tag: string): PartOfSpeech {
    if (tag.includes('Noun')) return PartOfSpeech.NOUN;
    if (tag.includes('Verb')) return PartOfSpeech.VERB;
    if (tag.includes('Adjective')) return PartOfSpeech.ADJECTIVE;
    if (tag.includes('Adverb')) return PartOfSpeech.ADVERB;
    if (tag.includes('Pronoun')) return PartOfSpeech.PRONOUN;
    if (tag.includes('Determiner')) return PartOfSpeech.DETERMINER;
    if (tag.includes('Preposition')) return PartOfSpeech.PREPOSITION;
    if (tag.includes('Conjunction')) return PartOfSpeech.CONJUNCTION;
    if (tag.includes('Interjection')) return PartOfSpeech.INTERJECTION;
    if (tag.includes('Value')) return PartOfSpeech.NUMERAL;
    if (tag.includes('Particle')) return PartOfSpeech.PARTICLE;
    if (tag.includes('Punctuation')) return PartOfSpeech.PUNCTUATION;
    if (tag.includes('Symbol')) return PartOfSpeech.SYMBOL;
    return PartOfSpeech.OTHER;
  }
  
  /**
   * Simple lemmatization based on part of speech
   */
  private lemmatize(word: string, pos: PartOfSpeech): string {
    // Use Natural.js lemmatizer
    if (pos === PartOfSpeech.VERB) {
      return natural.LancasterStemmer.stem(word);
    } else if (pos === PartOfSpeech.NOUN && word.endsWith('s')) {
      // Simple singular conversion for nouns ending in 's'
      return word.endsWith('ies') 
        ? word.slice(0, -3) + 'y' 
        : word.slice(0, -1);
    }
    return word;
  }
  
  /**
   * Get a textual representation of the dependency tree
   */
  public getTreeString(parsedSentence: ParsedSentence): string {
    let result = `ROOT: ${parsedSentence.tokens[parsedSentence.rootIndex].text}\n`;
    
    // Group dependencies by governor
    const dependenciesByGovernor = new Map<number, Dependency[]>();
    
    for (const dep of parsedSentence.dependencies) {
      if (!dependenciesByGovernor.has(dep.governor.index)) {
        dependenciesByGovernor.set(dep.governor.index, []);
      }
      dependenciesByGovernor.get(dep.governor.index)!.push(dep);
    }
    
    // Start with root's dependencies
    this.addDependenciesToTree(result, parsedSentence.rootIndex, dependenciesByGovernor, 1);
    
    return result;
  }
  
  /**
   * Recursively add dependencies to tree string
   */
  private addDependenciesToTree(
    result: string, 
    governorIndex: number, 
    dependenciesByGovernor: Map<number, Dependency[]>, 
    level: number
  ): string {
    const indent = '  '.repeat(level);
    const deps = dependenciesByGovernor.get(governorIndex) || [];
    
    for (const dep of deps) {
      result += `${indent}${dep.type} → ${dep.dependent.text} (${dep.dependent.pos})\n`;
      
      // Recursively add dependent's dependents
      this.addDependenciesToTree(result, dep.dependent.index, dependenciesByGovernor, level + 1);
    }
    
    return result;
  }
}