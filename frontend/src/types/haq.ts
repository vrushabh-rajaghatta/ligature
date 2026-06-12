
/**
 * HAQ Types - Re-exports from canonical source
 * 
 * @deprecated Import from '@/domains/haq/contracts' instead
 * 
 * This file re-exports HAQ types from the canonical source for backward compatibility.
 * New code should import directly from '@/domains/haq/contracts'.
 * 
 * Example migration:
 * ```ts
 * // Before (deprecated)
 * import { HAQuestion, HAQStatus } from '@/types/haq';
 * 
 * // After (preferred)
 * import { HAQuestion, HAQStatus } from '@/domains/haq/contracts';
 * ```
 */

// Re-export everything from canonical source
export {
  // Core enums
  type HAQDiscipline,
  type HAQPriority,
  type HAQStatus,
  type HAQSource,
  type QuestionType,
  
  // Core entity
  type HAQuestion,
  
  // Response drafting
  type ResponseDraft,
  type DraftComment,
  type HAQAttachment,
  
  // AI analysis
  type HAQAIAnalysis,
  type SimilarQuestion,
  type SuggestedSource,
  
  // Predictive questions
  type PredictedQuestion,
  
  // Correspondence
  type HAQCorrespondence,
  
  // Analytics
  type HAQAnalytics,
  type TrendDataPoint,
  
  // Review workflow
  type ReviewRole,
  type ReviewStatus,
  type ReviewAssignment,
  type HAQHistoryEvent,
  type HAQHistoryEventType,
  
  // Filters
  type HAQFilters,
  type HAQSortField,
  
  // Constants
  DISCIPLINE_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_COLORS,
  
  // Type guards
  isHAQStatus,
  isHAQPriority,
  isHAQDiscipline,
  isHAQSource,
  
  // Utilities
  isOverdue,
  getDaysUntilDue,
  getUrgencyLevel,
} from '@/domains/haq/contracts';
