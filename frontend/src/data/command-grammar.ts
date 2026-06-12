/**
 * Command Grammar - v0.12.4
 * 
 * Defines verb-first command patterns for the enhanced command palette.
 * Supports natural language commands like:
 * - "draft response to HAQ-FDA-2024-123"
 * - "compare sequence 0015 vs 0016"
 * - "show safety signals for nexavant"
 * - "find documents about stability"
 */

import { ModuleId } from '@/types/core';

// ============================================================================
// Types
// ============================================================================

export type CommandVerb = 'draft' | 'compare' | 'show' | 'find' | 'approve' | 'submit';

export type CommandObjectType = 
  | 'haq' 
  | 'document' 
  | 'sequence' 
  | 'signal' 
  | 'submission' 
  | 'deviation'
  | 'task';

export interface ParsedCommand {
  id: string;
  verb: CommandVerb;
  objectType: CommandObjectType;
  objectId?: string;           // Specific ID if mentioned (e.g., "HAQ-FDA-2024-123")
  objectQuery?: string;        // Search term if no specific ID (e.g., "about stability")
  parameters?: Record<string, string>;  // Additional params (e.g., seq1, seq2 for compare)
  targetModule: ModuleId;      // Module to navigate to
  confidence: number;          // 0-1 how confident we are in the parse
}

// ============================================================================
// Verb Definitions
// ============================================================================

export interface VerbDefinition {
  verb: CommandVerb;
  aliases: string[];
  description: string;
  objectTypes: CommandObjectType[];
  defaultModule: ModuleId;
}

export const COMMAND_VERBS: Record<CommandVerb, VerbDefinition> = {
  draft: {
    verb: 'draft',
    aliases: ['write', 'create', 'compose', 'respond'],
    description: 'Create or draft content',
    objectTypes: ['haq', 'document'],
    defaultModule: 'haq',
  },
  compare: {
    verb: 'compare',
    aliases: ['diff', 'versus', 'vs'],
    description: 'Compare two items',
    objectTypes: ['sequence', 'document'],
    defaultModule: 'ectd-workspace',
  },
  show: {
    verb: 'show',
    aliases: ['view', 'list', 'display', 'open'],
    description: 'Display items or navigate to view',
    objectTypes: ['signal', 'submission', 'task', 'deviation', 'haq', 'document'],
    defaultModule: 'portfolio',
  },
  find: {
    verb: 'find',
    aliases: ['search', 'locate', 'lookup', 'get'],
    description: 'Search for items',
    objectTypes: ['document', 'haq', 'submission', 'signal'],
    defaultModule: 'authoring',
  },
  approve: {
    verb: 'approve',
    aliases: ['sign', 'accept', 'confirm'],
    description: 'Approve or sign off on item',
    objectTypes: ['document', 'submission', 'deviation'],
    defaultModule: 'authoring',
  },
  submit: {
    verb: 'submit',
    aliases: ['send', 'publish', 'release'],
    description: 'Submit or publish item',
    objectTypes: ['submission', 'sequence', 'document'],
    defaultModule: 'submissions-hub',
  },
};

// ============================================================================
// Object Type Definitions
// ============================================================================

export interface ObjectTypeDefinition {
  type: CommandObjectType;
  patterns: RegExp[];           // Patterns to match this object type
  idPatterns: RegExp[];         // Patterns to extract specific IDs
  targetModule: ModuleId;       // Module this object lives in
  keywords: string[];           // Keywords that suggest this object type
}

export const OBJECT_TYPES: Record<CommandObjectType, ObjectTypeDefinition> = {
  haq: {
    type: 'haq',
    patterns: [/haq/i, /health\s*authority\s*question/i, /response/i, /question/i],
    idPatterns: [
      /HAQ[-_]?([A-Z]{2,4}[-_]?\d{4}[-_]\d{2,4})/i,  // HAQ-FDA-2024-123
      /([A-Z]{2,4}[-_]?\d{4}[-_]\d{2,4})/i,          // FDA-2024-123
    ],
    targetModule: 'haq',
    keywords: ['haq', 'question', 'response', 'fda', 'ema', 'pmda', 'health authority'],
  },
  document: {
    type: 'document',
    patterns: [/document/i, /doc/i, /file/i, /report/i, /section/i],
    idPatterns: [
      /DOC[-_]?(\d+)/i,           // DOC-123
      /([A-Z]{2,3}[-_]?\d{4,})/i, // Module sections like M2-2847
    ],
    targetModule: 'authoring',
    keywords: ['document', 'doc', 'file', 'report', 'csr', 'protocol', 'ib', 'ctd'],
  },
  sequence: {
    type: 'sequence',
    patterns: [/sequence/i, /seq/i, /ectd/i],
    idPatterns: [
      /(\d{4})/,                  // 0015, 0016
      /seq(?:uence)?[-_\s]*(\d{4})/i,
    ],
    targetModule: 'ectd-workspace',
    keywords: ['sequence', 'seq', 'ectd', 'ctd', 'submission'],
  },
  signal: {
    type: 'signal',
    patterns: [/signal/i, /safety/i, /alert/i, /pv/i, /pharmacovigilance/i],
    idPatterns: [
      /SIG[-_]?(\d+)/i,          // SIG-001
      /signal[-_\s]*(\d+)/i,
    ],
    targetModule: 'safety',
    keywords: ['signal', 'safety', 'alert', 'adverse', 'event', 'pv', 'icsr'],
  },
  submission: {
    type: 'submission',
    patterns: [/submission/i, /nda/i, /bla/i, /ind/i, /maa/i, /anda/i],
    idPatterns: [
      /SUB[-_]?(\d+)/i,          // SUB-001
      /(NDA|BLA|IND|MAA|ANDA)[-_]?(\d+)/i,
    ],
    targetModule: 'submissions-hub',
    keywords: ['submission', 'nda', 'bla', 'ind', 'maa', 'regulatory', 'filing'],
  },
  deviation: {
    type: 'deviation',
    patterns: [/deviation/i, /dev/i, /capa/i, /quality/i],
    idPatterns: [
      /DEV[-_]?(\d+)/i,          // DEV-001
      /CAPA[-_]?(\d+)/i,
    ],
    targetModule: 'qms',
    keywords: ['deviation', 'capa', 'quality', 'qms', 'corrective', 'preventive'],
  },
  task: {
    type: 'task',
    patterns: [/task/i, /item/i, /todo/i, /action/i],
    idPatterns: [
      /TASK[-_]?(\d+)/i,
    ],
    targetModule: 'action-center',
    keywords: ['task', 'item', 'todo', 'action', 'work', 'pending'],
  },
};

// ============================================================================
// Command Parsing
// ============================================================================

/**
 * Normalize input by resolving verb aliases to canonical verbs
 */
function resolveVerb(word: string): CommandVerb | null {
  const lower = word.toLowerCase();
  
  for (const [verb, def] of Object.entries(COMMAND_VERBS)) {
    if (verb === lower || def.aliases.includes(lower)) {
      return verb as CommandVerb;
    }
  }
  
  return null;
}

/**
 * Detect object type from input string
 */
function detectObjectType(input: string): { type: CommandObjectType; confidence: number } | null {
  const lower = input.toLowerCase();
  
  // Check each object type's patterns and keywords
  for (const [type, def] of Object.entries(OBJECT_TYPES)) {
    // Check explicit patterns first (higher confidence)
    for (const pattern of def.patterns) {
      if (pattern.test(input)) {
        return { type: type as CommandObjectType, confidence: 0.9 };
      }
    }
    
    // Check keywords (lower confidence)
    for (const keyword of def.keywords) {
      if (lower.includes(keyword)) {
        return { type: type as CommandObjectType, confidence: 0.7 };
      }
    }
  }
  
  return null;
}

/**
 * Extract object ID from input string
 */
function extractObjectId(input: string, objectType: CommandObjectType): string | null {
  const def = OBJECT_TYPES[objectType];
  
  for (const pattern of def.idPatterns) {
    const match = input.match(pattern);
    if (match) {
      // Return the full match or first capture group
      return match[1] || match[0];
    }
  }
  
  return null;
}

/**
 * Parse a natural language command into structured format
 * 
 * Examples:
 * - "draft response to HAQ-FDA-2024-123" → { verb: 'draft', objectType: 'haq', objectId: 'FDA-2024-123' }
 * - "compare sequence 0015 vs 0016" → { verb: 'compare', objectType: 'sequence', parameters: { seq1: '0015', seq2: '0016' } }
 * - "show safety signals" → { verb: 'show', objectType: 'signal' }
 * - "find documents about stability" → { verb: 'find', objectType: 'document', objectQuery: 'stability' }
 */
export function parseCommand(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  
  const words = trimmed.split(/\s+/);
  if (words.length === 0) return null;
  
  // Try to find verb (first word or second if first is filler like "please")
  let verb: CommandVerb | null = null;
  let verbIndex = 0;
  
  const fillerWords = ['please', 'can', 'could', 'would', 'i', 'want', 'to', 'need'];
  
  for (let i = 0; i < Math.min(words.length, 3); i++) {
    if (fillerWords.includes(words[i].toLowerCase())) continue;
    
    verb = resolveVerb(words[i]);
    if (verb) {
      verbIndex = i;
      break;
    }
  }
  
  if (!verb) return null;
  
  // Rest of input after verb
  const remainder = words.slice(verbIndex + 1).join(' ');
  
  // Special handling for "compare X vs Y" pattern
  if (verb === 'compare') {
    const compareMatch = remainder.match(/(?:sequence\s*)?(\d{4})\s*(?:vs|and|to|with)\s*(\d{4})/i);
    if (compareMatch) {
      return {
        id: `compare-sequences-${compareMatch[1]}-${compareMatch[2]}`,
        verb: 'compare',
        objectType: 'sequence',
        parameters: { seq1: compareMatch[1], seq2: compareMatch[2] },
        targetModule: 'ectd-workspace',
        confidence: 0.95,
      };
    }
  }
  
  // Detect object type from remainder
  const objectResult = detectObjectType(remainder);
  if (!objectResult) {
    // Try to infer from verb's default object types
    const verbDef = COMMAND_VERBS[verb];
    if (verbDef.objectTypes.length > 0) {
      const defaultType = verbDef.objectTypes[0];
      return {
        id: `${verb}-${defaultType}`,
        verb,
        objectType: defaultType,
        objectQuery: remainder || undefined,
        targetModule: OBJECT_TYPES[defaultType].targetModule,
        confidence: 0.5,
      };
    }
    return null;
  }
  
  const { type: objectType, confidence: typeConfidence } = objectResult;
  
  // Try to extract specific ID
  const objectId = extractObjectId(remainder, objectType);
  
  // Extract query (words after "about", "for", "with", etc.)
  let objectQuery: string | undefined;
  const queryMatch = remainder.match(/(?:about|for|with|regarding|containing)\s+(.+)$/i);
  if (queryMatch) {
    objectQuery = queryMatch[1].trim();
  }
  
  // Determine target module
  const targetModule = OBJECT_TYPES[objectType].targetModule;
  
  return {
    id: objectId ? `${verb}-${objectType}-${objectId}` : `${verb}-${objectType}`,
    verb,
    objectType,
    objectId: objectId || undefined,
    objectQuery,
    targetModule,
    confidence: objectId ? Math.min(typeConfidence + 0.1, 1) : typeConfidence,
  };
}

// ============================================================================
// Suggestion Helpers
// ============================================================================

/**
 * Get suggested verbs based on partial input
 */
export function getSuggestedVerbs(partialInput: string): CommandVerb[] {
  const lower = partialInput.toLowerCase();
  
  const matches: CommandVerb[] = [];
  
  for (const [verb, def] of Object.entries(COMMAND_VERBS)) {
    if (verb.startsWith(lower) || def.aliases.some(a => a.startsWith(lower))) {
      matches.push(verb as CommandVerb);
    }
  }
  
  return matches;
}

/**
 * Get the first word (potential verb) from input
 */
export function getFirstWord(input: string): string {
  return input.trim().split(/\s+/)[0]?.toLowerCase() || '';
}

/**
 * Check if input starts with a known verb or alias
 */
export function startsWithVerb(input: string): CommandVerb | null {
  const firstWord = getFirstWord(input);
  return resolveVerb(firstWord);
}
