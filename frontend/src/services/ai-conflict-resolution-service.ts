
/**
 * AI Conflict Resolution Service
 * Provides AI-powered merge suggestions for document conflicts
 * 
 * v0.42.0 - Conflict Resolution Suggestions
 */

import { DetectedConflict } from './collaboration/conflict-detection-service';

// =============================================================================
// TYPES
// =============================================================================

export interface MergeSuggestion {
  id: string;
  conflictId: string;
  mergedContent: string;
  confidence: number; // 0-1
  explanation: string;
  preservesIntent: {
    local: boolean;
    remote: boolean;
  };
  changesSummary: string[];
  alternatives?: AlternativeSuggestion[];
}

export interface AlternativeSuggestion {
  id: string;
  content: string;
  description: string;
  confidence: number;
}

// v0.42.28: AI response structure interface for parseResponse
interface AIResponseParsed {
  mergedContent?: string;
  confidence?: number;
  explanation?: string;
  preservesLocalIntent?: boolean;
  preservesRemoteIntent?: boolean;
  changesSummary?: string[];
  alternatives?: Array<{
    content: string;
    description?: string;
    confidence?: number;
  }>;
}

interface AIAlternativeParsed {
  content: string;
  description?: string;
  confidence?: number;
}

export interface ResolutionContext {
  documentType?: string;      // e.g., 'protocol', 'report', 'regulatory'
  sectionType?: string;       // e.g., 'objectives', 'methodology', 'results'
  localUserRole?: string;     // e.g., 'author', 'reviewer', 'editor'
  remoteUserRole?: string;
  precedenceRule?: 'local-first' | 'remote-first' | 'merge' | 'newest';
}

export interface AIResolutionConfig {
  apiEndpoint: string;
  maxRetries: number;
  timeout: number;
  model: string;
  includeAlternatives: boolean;
  maxAlternatives: number;
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

const DEFAULT_CONFIG: AIResolutionConfig = {
  apiEndpoint: '/api/ai/resolve-conflict',
  maxRetries: 2,
  timeout: 30000,
  model: 'claude-sonnet-4-6',
  includeAlternatives: true,
  maxAlternatives: 2,
};

// =============================================================================
// AI CONFLICT RESOLUTION SERVICE
// =============================================================================

export class AIConflictResolutionService {
  private config: AIResolutionConfig;
  private suggestionIdCounter = 0;

  constructor(config: Partial<AIResolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Main Resolution Method
  // ---------------------------------------------------------------------------

  /**
   * Generate AI-powered merge suggestion for a conflict
   */
  async suggestResolution(
    conflict: DetectedConflict,
    context?: ResolutionContext
  ): Promise<MergeSuggestion> {
    // Build prompt
    const prompt = this.buildPrompt(conflict, context);
    
    try {
      // Call AI API
      const response = await this.callAI(prompt);
      
      // Parse response
      return this.parseResponse(conflict, response);
    } catch (error) {
      // Fallback to rule-based suggestion
      console.warn('AI resolution failed, using fallback:', error);
      return this.generateFallbackSuggestion(conflict, context);
    }
  }

  /**
   * Generate suggestions for multiple conflicts
   */
  async suggestResolutions(
    conflicts: DetectedConflict[],
    context?: ResolutionContext
  ): Promise<Map<string, MergeSuggestion>> {
    const suggestions = new Map<string, MergeSuggestion>();
    
    // Process in parallel with limit
    const batchSize = 3;
    for (let i = 0; i < conflicts.length; i += batchSize) {
      const batch = conflicts.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(conflict => this.suggestResolution(conflict, context))
      );
      
      for (let j = 0; j < results.length; j++) {
        suggestions.set(batch[j].id, results[j]);
      }
    }
    
    return suggestions;
  }

  // ---------------------------------------------------------------------------
  // Prompt Building
  // ---------------------------------------------------------------------------

  private buildPrompt(conflict: DetectedConflict, context?: ResolutionContext): string {
    const parts: string[] = [];
    
    parts.push(`You are helping resolve a document editing conflict. Two users made changes to the same part of a document.`);
    
    if (context?.documentType) {
      parts.push(`Document type: ${context.documentType}`);
    }
    if (context?.sectionType) {
      parts.push(`Section: ${context.sectionType}`);
    }
    
    parts.push(`
Conflict details:
- Type: ${conflict.type}
- Position: ${conflict.position}

Context before conflict:
"${conflict.context.before}"

Original content:
"${conflict.context.baseContent}"

User A's changes (${context?.localUserRole || 'local user'}):
"${conflict.context.localContent}"

User B's changes (${context?.remoteUserRole || 'remote user'}):
"${conflict.context.remoteContent}"

Context after conflict:
"${conflict.context.after}"
`);

    if (context?.precedenceRule) {
      parts.push(`Precedence rule: ${context.precedenceRule}`);
    }

    parts.push(`
Please provide:
1. A merged version that preserves the intent of both users' changes
2. A brief explanation of how you merged the content
3. Whether each user's intent is preserved (true/false)
4. A summary of changes made

Respond in JSON format:
{
  "mergedContent": "...",
  "explanation": "...",
  "preservesLocalIntent": true/false,
  "preservesRemoteIntent": true/false,
  "changesSummary": ["change 1", "change 2"],
  "confidence": 0.0-1.0,
  "alternatives": [
    {"content": "...", "description": "...", "confidence": 0.0-1.0}
  ]
}
`);

    return parts.join('\n');
  }

  // ---------------------------------------------------------------------------
  // AI API Call
  // ---------------------------------------------------------------------------

  private async callAI(prompt: string): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.model,
          prompt,
          maxTokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Response Parsing
  // ---------------------------------------------------------------------------

  private parseResponse(conflict: DetectedConflict, response: Record<string, unknown>): MergeSuggestion {
    // Handle direct JSON or nested response
    const data = (response.result || response.data || response) as AIResponseParsed | string;
    
    // Parse JSON from string if needed
    let parsed: AIResponseParsed;
    if (typeof data === 'string') {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = data.match(/```json\n?([\s\S]*?)\n?```/) || 
                          data.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]) as AIResponseParsed;
        } else {
          return this.generateFallbackSuggestion(conflict);
        }
      } catch (e) {
        console.warn('Failed to parse AI response:', e);
        return this.generateFallbackSuggestion(conflict);
      }
    } else {
      parsed = data;
    }

    const suggestion: MergeSuggestion = {
      id: this.generateSuggestionId(),
      conflictId: conflict.id,
      mergedContent: parsed.mergedContent || conflict.context.localContent,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      explanation: parsed.explanation || 'AI-suggested merge',
      preservesIntent: {
        local: parsed.preservesLocalIntent ?? true,
        remote: parsed.preservesRemoteIntent ?? true,
      },
      changesSummary: parsed.changesSummary || [],
    };

    // Add alternatives if available
    if (this.config.includeAlternatives && parsed.alternatives) {
      suggestion.alternatives = parsed.alternatives
        .slice(0, this.config.maxAlternatives)
        .map((alt: AIAlternativeParsed, idx: number) => ({
          id: `${suggestion.id}-alt-${idx}`,
          content: alt.content,
          description: alt.description || `Alternative ${idx + 1}`,
          confidence: alt.confidence || 0.3,
        }));
    }

    return suggestion;
  }

  // ---------------------------------------------------------------------------
  // Fallback Resolution
  // ---------------------------------------------------------------------------

  private generateFallbackSuggestion(
    conflict: DetectedConflict,
    context?: ResolutionContext
  ): MergeSuggestion {
    let mergedContent: string;
    let explanation: string;
    let preservesLocal = true;
    let preservesRemote = true;

    switch (conflict.type) {
      case 'concurrent-edit':
        // Try to merge by combining changes
        if (conflict.localOperation.type === 'insert' && conflict.remoteOperation.type === 'insert') {
          // Both inserting - concatenate based on precedence
          if (context?.precedenceRule === 'remote-first') {
            mergedContent = conflict.context.remoteContent + ' ' + conflict.context.localContent;
          } else {
            mergedContent = conflict.context.localContent + ' ' + conflict.context.remoteContent;
          }
          explanation = 'Combined both insertions';
        } else {
          // Default to local
          mergedContent = conflict.context.localContent;
          explanation = 'Kept local changes (remote changes may need review)';
          preservesRemote = false;
        }
        break;

      case 'overlapping-delete':
        // Take the union of deletes
        mergedContent = '';
        explanation = 'Applied combined deletion';
        break;

      case 'edit-in-deleted':
        // Prefer keeping content over deletion
        mergedContent = conflict.context.localContent;
        explanation = 'Preserved inserted content (overriding deletion)';
        preservesRemote = false;
        break;

      case 'semantic':
        // Keep both with separator
        mergedContent = conflict.context.localContent + '\n\n' + conflict.context.remoteContent;
        explanation = 'Kept both versions (similar content detected)';
        break;

      default:
        mergedContent = conflict.context.localContent;
        explanation = 'Default: kept local changes';
        preservesRemote = false;
    }

    return {
      id: this.generateSuggestionId(),
      conflictId: conflict.id,
      mergedContent,
      confidence: 0.5, // Lower confidence for fallback
      explanation,
      preservesIntent: {
        local: preservesLocal,
        remote: preservesRemote,
      },
      changesSummary: [explanation],
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private generateSuggestionId(): string {
    return `suggestion-${Date.now()}-${++this.suggestionIdCounter}`;
  }

  /**
   * Validate a merge suggestion
   */
  validateSuggestion(suggestion: MergeSuggestion, conflict: DetectedConflict): {
    isValid: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Check if content is empty when it shouldn't be
    if (!suggestion.mergedContent && conflict.context.baseContent) {
      issues.push('Merged content is empty but original had content');
    }

    // Check for reasonable length
    const combinedLength = (conflict.context.localContent?.length || 0) + 
                           (conflict.context.remoteContent?.length || 0);
    if (suggestion.mergedContent.length > combinedLength * 2) {
      issues.push('Merged content is unusually long');
    }

    // Check confidence
    if (suggestion.confidence < 0.3) {
      issues.push('Low confidence in merge suggestion');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let serviceInstance: AIConflictResolutionService | null = null;

export function getAIResolutionService(config?: Partial<AIResolutionConfig>): AIConflictResolutionService {
  if (!serviceInstance) {
    serviceInstance = new AIConflictResolutionService(config);
  }
  return serviceInstance;
}

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useCallback } from 'react';

export function useAIResolution() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const service = getAIResolutionService();

  const suggestResolution = useCallback(async (
    conflict: DetectedConflict,
    context?: ResolutionContext
  ): Promise<MergeSuggestion | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const suggestion = await service.suggestResolution(conflict, context);
      return suggestion;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate suggestion');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const suggestResolutions = useCallback(async (
    conflicts: DetectedConflict[],
    context?: ResolutionContext
  ): Promise<Map<string, MergeSuggestion>> => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await service.suggestResolutions(conflicts, context);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate suggestions');
      return new Map();
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  return {
    suggestResolution,
    suggestResolutions,
    isLoading,
    error,
  };
}

export default AIConflictResolutionService;
