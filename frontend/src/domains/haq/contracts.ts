
/**
 * HAQ Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for all HAQ-related types in Ligature.
 * 
 * Health Authority Questions (HAQs) are formal requests for information from
 * regulatory agencies (FDA, EMA, PMDA, etc.) during the drug review process.
 * This module handles question tracking, response drafting, AI assistance,
 * approval workflows, and submission linking.
 * 
 * RULES:
 * 1. All HAQ types MUST be defined here
 * 2. Stores and components import FROM here, never define HAQ types locally
 * 3. Changes here should be deliberate - they affect the entire HAQ workflow
 * 
 * @module domains/haq/contracts
 * @version 0.27.18
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

/**
 * Discipline categories for HAQ classification.
 * Determines which SMEs should be involved in the response.
 */
export type HAQDiscipline = 
  | 'CMC'           // Chemistry, Manufacturing, Controls
  | 'Clinical'      // Clinical development
  | 'Nonclinical'   // Preclinical/toxicology
  | 'Biometrics'    // Statistics, data management
  | 'Pharmacology'  // PK/PD, pharmacology
  | 'Labeling'      // Product labeling
  | 'Administrative'// Administrative/procedural
  | 'Safety';       // Pharmacovigilance

/**
 * Priority levels for HAQ triage
 */
export type HAQPriority = 'critical' | 'major' | 'minor';

/**
 * Status of a HAQ through its lifecycle
 */
export type HAQStatus = 
  | 'new'                // Just received
  | 'open'               // Acknowledged, not started
  | 'in-progress'        // Response being drafted
  | 'draft-ready'        // Draft complete, pending review
  | 'under-review'       // In review workflow
  | 'partially-responded'// Some questions answered
  | 'submitted'          // Response sent to HA
  | 'closed';            // HA accepted, no further action

/**
 * Health Authority sources
 */
export type HAQSource = 'FDA' | 'EMA' | 'PMDA' | 'Health Canada' | 'TGA' | 'NMPA';

/**
 * Types of regulatory correspondence
 */
export type QuestionType = 
  | 'IR'             // Information Request
  | 'RTF'            // Refuse to File
  | 'CRL'            // Complete Response Letter
  | 'Day-74'         // Day 74 questions (EMA)
  | 'Day-120'        // Day 120 questions (EMA)
  | 'RSI'            // Request for Supplemental Information
  | 'GMP'            // GMP-related questions
  | 'Pre-submission';// Pre-submission meeting questions

// =============================================================================
// CORE ENTITY: HAQuestion
// =============================================================================

/**
 * A single Health Authority Question.
 * This is the core entity of the HAQ module.
 */
export interface HAQuestion {
  id: string;
  applicationId: string;
  applicationNumber: string;
  productId: string;
  productName: string;
  
  // Question details
  questionNumber: string;
  questionText: string;
  discipline: HAQDiscipline;
  subdiscipline?: string;
  ctdSection?: string;
  
  // Classification
  type: QuestionType;
  source: HAQSource;
  priority: HAQPriority;
  
  // Dates
  receivedDate: string;
  dueDate: string;
  submittedDate?: string;
  
  // Status tracking
  status: HAQStatus;
  assignedTo?: string;
  assignedToName?: string;
  reviewers?: string[];
  
  // Response
  responseText?: string;
  responseDraftHistory?: ResponseDraft[];
  attachments?: HAQAttachment[];
  
  // AI analysis
  aiAnalysis?: HAQAIAnalysis;
  similarQuestions?: SimilarQuestion[];
  suggestedResponse?: string;
  suggestedSources?: SuggestedSource[];
  
  // Metadata
  tags: string[];
  linkedDocuments?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// RESPONSE DRAFTING
// =============================================================================

/**
 * A draft response to a HAQ
 */
export interface ResponseDraft {
  id: string;
  version: number;
  content: string;
  author: string;
  authorName: string;
  createdAt: string;
  aiGenerated: boolean;
  comments?: DraftComment[];
}

/**
 * Comment on a draft
 */
export interface DraftComment {
  id: string;
  author: string;
  authorName: string;
  content: string;
  createdAt: string;
  resolved: boolean;
}

/**
 * Attachment to a HAQ response
 */
export interface HAQAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
}

// =============================================================================
// AI ANALYSIS
// =============================================================================

/**
 * AI-generated analysis of a HAQ
 */
export interface HAQAIAnalysis {
  complexity: 'low' | 'medium' | 'high';
  estimatedEffort: string;
  keyTopics: string[];
  regulatoryContext?: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommendedApproach?: string;
}

/**
 * A similar historical question for reference
 */
export interface SimilarQuestion {
  id: string;
  questionText: string;
  applicationNumber: string;
  productName: string;
  source: HAQSource;
  discipline: HAQDiscipline;
  responseText: string;
  outcome: 'accepted' | 'follow-up' | 'rejected';
  similarity: number;
  date: string;
}

/**
 * A suggested source for response drafting
 */
export interface SuggestedSource {
  type: 'document' | 'regulation' | 'guidance' | 'historical-response';
  title: string;
  reference?: string;
  section?: string;
  relevance: number;
  excerpt?: string;
}

// =============================================================================
// PREDICTIVE QUESTIONS
// =============================================================================

/**
 * A predicted question based on submission content
 */
export interface PredictedQuestion {
  id: string;
  questionText: string;
  discipline: HAQDiscipline;
  ctdSection: string;
  probability: number;
  rationale: string;
  basedOn: string[];
  suggestedPreparation?: string;
  historicalFrequency?: string;
}

// =============================================================================
// CORRESPONDENCE
// =============================================================================

/**
 * A correspondence thread (collection of related HAQs)
 */
export interface HAQCorrespondence {
  id: string;
  applicationId: string;
  type: QuestionType;
  subject: string;
  receivedDate: string;
  questions: HAQuestion[];
  status: 'open' | 'partially-responded' | 'fully-responded' | 'closed';
  dueDate: string;
  responseDeadline: string;
}

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * HAQ analytics summary
 */
export interface HAQAnalytics {
  totalQuestions: number;
  byStatus: Record<HAQStatus, number>;
  byDiscipline: Record<HAQDiscipline, number>;
  byPriority: Record<HAQPriority, number>;
  bySource: Record<HAQSource, number>;
  averageResponseTime: number;
  overdueCount: number;
  onTimeRate: number;
  trendData: TrendDataPoint[];
}

/**
 * Time series data point for trends
 */
export interface TrendDataPoint {
  period: string;
  received: number;
  submitted: number;
  avgResponseDays: number;
}

// =============================================================================
// REVIEW WORKFLOW
// =============================================================================

/**
 * Roles in the review workflow
 */
export type ReviewRole = 'sme' | 'lead' | 'qa';

/**
 * Status of a review assignment
 */
export type ReviewStatus = 'pending' | 'in-review' | 'approved' | 'changes-requested';

/**
 * A review assignment for a HAQ response
 */
export interface ReviewAssignment {
  id: string;
  haqId: string;
  reviewerId: string;
  reviewerName: string;
  role: ReviewRole;
  status: ReviewStatus;
  assignedAt: string;
  completedAt?: string;
  feedback?: string;
}

/**
 * History event for audit trail
 */
export interface HAQHistoryEvent {
  id: string;
  haqId: string;
  type: HAQHistoryEventType;
  actor: string;
  actorName: string;
  timestamp: string;
  details?: Record<string, unknown>;
  source?: string;
}

export type HAQHistoryEventType = 
  | 'created' 
  | 'draft-saved' 
  | 'version-created' 
  | 'status-changed' 
  | 'reviewer-assigned'
  | 'review-completed' 
  | 'comment-added' 
  | 'comment-resolved' 
  | 'ai-generated' 
  | 'submitted';

// =============================================================================
// FILTER & UI TYPES
// =============================================================================

/**
 * Filter configuration for HAQ list views
 */
export interface HAQFilters {
  priority: HAQPriority | 'all';
  status: HAQStatus | 'all';
  discipline: HAQDiscipline | 'all';
  source: HAQSource | 'all';
  productId: string | 'all';
  assignee: string | 'all' | 'unassigned';
  dueWithin: number | null;
  searchQuery: string;
}

/**
 * Sort options for HAQ list
 */
export type HAQSortField = 'dueDate' | 'priority' | 'status' | 'receivedDate' | 'questionNumber';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Human-readable labels for disciplines
 */
export const DISCIPLINE_LABELS: Record<HAQDiscipline, string> = {
  CMC: 'Chemistry, Manufacturing & Controls',
  Clinical: 'Clinical Development',
  Nonclinical: 'Nonclinical/Toxicology',
  Biometrics: 'Biostatistics & Data Management',
  Pharmacology: 'Clinical Pharmacology',
  Labeling: 'Product Labeling',
  Administrative: 'Administrative',
  Safety: 'Safety & Pharmacovigilance',
};

/**
 * Human-readable labels for priorities
 */
export const PRIORITY_LABELS: Record<HAQPriority, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
};

/**
 * Human-readable labels for statuses
 */
export const STATUS_LABELS: Record<HAQStatus, string> = {
  new: 'New',
  open: 'Open',
  'in-progress': 'In Progress',
  'draft-ready': 'Draft Ready',
  'under-review': 'Under Review',
  'partially-responded': 'Partially Responded',
  submitted: 'Submitted',
  closed: 'Closed',
};

/**
 * Colors for status badges (Tailwind classes)
 */
export const STATUS_COLORS: Record<HAQStatus, string> = {
  new: 'bg-blue-100 text-blue-800',
  open: 'bg-yellow-100 text-yellow-800',
  'in-progress': 'bg-purple-100 text-purple-800',
  'draft-ready': 'bg-green-100 text-green-800',
  'under-review': 'bg-orange-100 text-orange-800',
  'partially-responded': 'bg-teal-100 text-teal-800',
  submitted: 'bg-gray-100 text-gray-800',
  closed: 'bg-gray-200 text-gray-600',
};

/**
 * Colors for priority badges
 */
export const PRIORITY_COLORS: Record<HAQPriority, string> = {
  critical: 'bg-red-100 text-red-800',
  major: 'bg-orange-100 text-orange-800',
  minor: 'bg-gray-100 text-gray-800',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isHAQStatus(value: string): value is HAQStatus {
  return ['new', 'open', 'in-progress', 'draft-ready', 'under-review', 'partially-responded', 'submitted', 'closed'].includes(value);
}

export function isHAQPriority(value: string): value is HAQPriority {
  return ['critical', 'major', 'minor'].includes(value);
}

export function isHAQDiscipline(value: string): value is HAQDiscipline {
  return ['CMC', 'Clinical', 'Nonclinical', 'Biometrics', 'Pharmacology', 'Labeling', 'Administrative', 'Safety'].includes(value);
}

export function isHAQSource(value: string): value is HAQSource {
  return ['FDA', 'EMA', 'PMDA', 'Health Canada', 'TGA', 'NMPA'].includes(value);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a HAQ is overdue
 */
export function isOverdue(haq: HAQuestion): boolean {
  if (haq.status === 'submitted' || haq.status === 'closed') return false;
  return new Date(haq.dueDate) < new Date();
}

/**
 * Get days until due (negative if overdue)
 */
export function getDaysUntilDue(haq: HAQuestion): number {
  const now = new Date();
  const due = new Date(haq.dueDate);
  const diffTime = due.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get urgency level based on due date
 */
export function getUrgencyLevel(haq: HAQuestion): 'overdue' | 'urgent' | 'soon' | 'normal' {
  const days = getDaysUntilDue(haq);
  if (days < 0) return 'overdue';
  if (days <= 3) return 'urgent';
  if (days <= 7) return 'soon';
  return 'normal';
}
