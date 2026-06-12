
// =============================================================================
// SESSION ANALYTICS TYPES
// =============================================================================
// TypeScript types for collaboration session analytics and metrics.
// Provides comprehensive tracking of session health, participant activity,
// and collaboration effectiveness.
// Part of v0.19.2 - Session Analytics Types
// =============================================================================

import { OperationType, ParticipantRole } from './collaboration-persistence';

// -----------------------------------------------------------------------------
// Session Metrics
// -----------------------------------------------------------------------------

/**
 * Comprehensive metrics for a collaborative session
 */
export interface SessionMetrics {
  /** Session identifier */
  sessionId: string;
  
  /** Document being edited */
  documentId: string;
  
  /** Tenant identifier */
  tenantId: string;
  
  /** Session duration in milliseconds */
  duration: number;
  
  /** Total participants who joined */
  participantCount: number;
  
  /** Participants currently active */
  activeParticipantCount: number;
  
  /** Peak concurrent participants */
  peakConcurrency: number;
  
  /** Total operations performed */
  operationCount: number;
  
  /** Operations per minute average */
  operationsPerMinute: number;
  
  /** Number of conflicts detected */
  conflictCount: number;
  
  /** Number of conflicts resolved */
  conflictsResolved: number;
  
  /** Conflict resolution rate (0-1) */
  conflictResolutionRate: number;
  
  /** Average latency in milliseconds */
  averageLatency: number;
  
  /** 95th percentile latency */
  p95Latency: number;
  
  /** Maximum latency observed */
  maxLatency: number;
  
  /** Number of sync failures */
  syncFailures: number;
  
  /** Number of reconnections */
  reconnectionCount: number;
  
  /** Average time to recover from disconnection */
  avgRecoveryTime: number;
  
  /** Session start time */
  startedAt: Date;
  
  /** Session end time (if closed) */
  endedAt?: Date;
  
  /** Last activity timestamp */
  lastActivityAt: Date;
  
  /** Breakdown by operation type */
  operationsByType: Record<OperationType, number>;
  
  /** Characters inserted */
  charactersInserted: number;
  
  /** Characters deleted */
  charactersDeleted: number;
  
  /** Net character change */
  netCharacterChange: number;
}

/**
 * Time-series data point for session metrics
 */
export interface SessionMetricsSample {
  /** Timestamp of sample */
  timestamp: Date;
  
  /** Active participants at this time */
  activeParticipants: number;
  
  /** Operations in sampling window */
  operations: number;
  
  /** Average latency in window */
  avgLatency: number;
  
  /** Conflicts in window */
  conflicts: number;
}

// -----------------------------------------------------------------------------
// Participant Metrics
// -----------------------------------------------------------------------------

/**
 * Metrics for a single participant in a session
 */
export interface ParticipantMetrics {
  /** User identifier */
  userId: string;
  
  /** User display name */
  userName: string;
  
  /** Session identifier */
  sessionId: string;
  
  /** Participant role */
  role: ParticipantRole;
  
  /** Time joined the session */
  joinTime: Date;
  
  /** Time left the session (if applicable) */
  leaveTime?: Date;
  
  /** Total time in session (ms) */
  sessionTime: number;
  
  /** Time actively editing (ms) */
  activeTime: number;
  
  /** Time idle (ms) */
  idleTime: number;
  
  /** Activity ratio (activeTime / sessionTime) */
  activityRatio: number;
  
  /** Operations performed */
  operationsPerformed: number;
  
  /** Operations per minute */
  operationsPerMinute: number;
  
  /** Characters typed */
  charactersTyped: number;
  
  /** Characters deleted */
  charactersDeleted: number;
  
  /** Words typed (estimated) */
  wordsTyped: number;
  
  /** Number of conflicts caused */
  conflictsCaused: number;
  
  /** Number of conflicts resolved */
  conflictsResolved: number;
  
  /** Number of undo operations */
  undoCount: number;
  
  /** Number of redo operations */
  redoCount: number;
  
  /** Number of cursor movements */
  cursorMoves: number;
  
  /** Number of selections made */
  selectionsMade: number;
  
  /** Longest edit streak (continuous editing, ms) */
  longestEditStreak: number;
  
  /** Number of disconnections */
  disconnectionCount: number;
  
  /** Average latency for this user */
  averageLatency: number;
  
  /** Comments added (if applicable) */
  commentsAdded: number;
  
  /** Suggestions made (if applicable) */
  suggestionsMade: number;
}

/**
 * Participation summary for leaderboard/comparison
 */
export interface ParticipationSummary {
  userId: string;
  userName: string;
  operationCount: number;
  charactersContributed: number;
  activityPercentage: number;
  rank: number;
}

// -----------------------------------------------------------------------------
// Collaboration Health
// -----------------------------------------------------------------------------

/**
 * Letter grade for metrics
 */
export type MetricGrade = 'A' | 'B' | 'C' | 'D' | 'F';

/**
 * Health status levels
 */
export type HealthStatus = 'healthy' | 'degraded' | 'critical';

/**
 * Overall health assessment of collaboration
 */
export interface CollaborationHealth {
  /** Session identifier */
  sessionId: string;
  
  /** Overall health score (0-100) */
  score: number;
  
  /** Overall health status */
  status: HealthStatus;
  
  /** Latency grade */
  latencyGrade: MetricGrade;
  
  /** Latency score (0-100) */
  latencyScore: number;
  
  /** Sync health status */
  syncHealth: HealthStatus;
  
  /** Sync score (0-100) */
  syncScore: number;
  
  /** Conflict rate grade */
  conflictGrade: MetricGrade;
  
  /** Conflict score (0-100) */
  conflictScore: number;
  
  /** Participation balance grade */
  participationGrade: MetricGrade;
  
  /** Participation balance score (0-100) */
  participationScore: number;
  
  /** Stability grade (reconnections, failures) */
  stabilityGrade: MetricGrade;
  
  /** Stability score (0-100) */
  stabilityScore: number;
  
  /** Issues detected */
  issues: HealthIssue[];
  
  /** Recommendations for improvement */
  recommendations: string[];
  
  /** Timestamp of assessment */
  assessedAt: Date;
}

/**
 * A specific health issue
 */
export interface HealthIssue {
  /** Issue identifier */
  id: string;
  
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** Issue category */
  category: 'latency' | 'sync' | 'conflict' | 'participation' | 'stability';
  
  /** Human-readable description */
  description: string;
  
  /** Metric that triggered this issue */
  metric?: string;
  
  /** Current value */
  currentValue?: number;
  
  /** Threshold that was exceeded */
  threshold?: number;
  
  /** When the issue was first detected */
  detectedAt: Date;
}

// -----------------------------------------------------------------------------
// Analytics Configuration
// -----------------------------------------------------------------------------

/**
 * Configuration for analytics collection
 */
export interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled: boolean;
  
  /** Sampling interval for time-series data (ms) */
  samplingInterval: number;
  
  /** How long to retain detailed metrics (ms) */
  retentionPeriod: number;
  
  /** Latency thresholds for grading */
  latencyThresholds: LatencyThresholds;
  
  /** Conflict rate thresholds */
  conflictThresholds: ConflictThresholds;
  
  /** Participation balance thresholds */
  participationThresholds: ParticipationThresholds;
  
  /** Stability thresholds */
  stabilityThresholds: StabilityThresholds;
  
  /** Whether to track individual participant metrics */
  trackParticipants: boolean;
  
  /** Whether to generate time-series samples */
  generateTimeSeries: boolean;
  
  /** Maximum samples to retain */
  maxSamples: number;
}

/**
 * Latency grading thresholds (in ms)
 */
export interface LatencyThresholds {
  excellent: number;  // <= this = A
  good: number;       // <= this = B
  fair: number;       // <= this = C
  poor: number;       // <= this = D
  // > poor = F
}

/**
 * Conflict rate thresholds (conflicts per 100 operations)
 */
export interface ConflictThresholds {
  excellent: number;
  good: number;
  fair: number;
  poor: number;
}

/**
 * Participation balance thresholds (Gini coefficient)
 */
export interface ParticipationThresholds {
  balanced: number;      // <= this = good balance
  acceptable: number;    // <= this = acceptable
  unbalanced: number;    // <= this = concerning
  // > unbalanced = problematic
}

/**
 * Stability thresholds
 */
export interface StabilityThresholds {
  /** Max reconnections per hour per user */
  maxReconnectionsPerHour: number;
  /** Max sync failures per hour */
  maxSyncFailuresPerHour: number;
  /** Max acceptable recovery time (ms) */
  maxRecoveryTime: number;
}

// -----------------------------------------------------------------------------
// Analytics Events
// -----------------------------------------------------------------------------

/**
 * Event types for analytics
 */
export type AnalyticsEventType =
  | 'session:started'
  | 'session:ended'
  | 'participant:joined'
  | 'participant:left'
  | 'operation:recorded'
  | 'conflict:detected'
  | 'conflict:resolved'
  | 'latency:measured'
  | 'health:assessed'
  | 'issue:detected'
  | 'issue:resolved'
  | 'sample:recorded';

/**
 * Analytics event data
 */
export interface AnalyticsEvent {
  type: AnalyticsEventType;
  sessionId: string;
  timestamp: Date;
  data: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Aggregation Types
// -----------------------------------------------------------------------------

/**
 * Time period for aggregation
 */
export type AggregationPeriod = 'minute' | 'hour' | 'day' | 'week' | 'month';

/**
 * Aggregated metrics over a time period
 */
export interface AggregatedMetrics {
  /** Start of period */
  periodStart: Date;
  
  /** End of period */
  periodEnd: Date;
  
  /** Aggregation period type */
  period: AggregationPeriod;
  
  /** Number of sessions in period */
  sessionCount: number;
  
  /** Total participants across sessions */
  totalParticipants: number;
  
  /** Unique participants */
  uniqueParticipants: number;
  
  /** Total operations */
  totalOperations: number;
  
  /** Average operations per session */
  avgOperationsPerSession: number;
  
  /** Average session duration (ms) */
  avgSessionDuration: number;
  
  /** Average latency */
  avgLatency: number;
  
  /** Total conflicts */
  totalConflicts: number;
  
  /** Average health score */
  avgHealthScore: number;
  
  /** Sessions by health status */
  sessionsByHealth: Record<HealthStatus, number>;
}

/**
 * Trend data for a metric
 */
export interface MetricTrend {
  metric: string;
  period: AggregationPeriod;
  dataPoints: TrendDataPoint[];
  trend: 'improving' | 'stable' | 'declining';
  changePercent: number;
}

/**
 * Single data point in a trend
 */
export interface TrendDataPoint {
  timestamp: Date;
  value: number;
}

// -----------------------------------------------------------------------------
// Export/Report Types
// -----------------------------------------------------------------------------

/**
 * Format for analytics export
 */
export type ExportFormat = 'json' | 'csv' | 'xlsx';

/**
 * Analytics report
 */
export interface AnalyticsReport {
  /** Report identifier */
  id: string;
  
  /** Report title */
  title: string;
  
  /** Report type */
  type: 'session' | 'participant' | 'health' | 'trend' | 'comprehensive';
  
  /** Period covered */
  periodStart: Date;
  periodEnd: Date;
  
  /** Sessions included */
  sessionIds: string[];
  
  /** Generation timestamp */
  generatedAt: Date;
  
  /** Generated by */
  generatedBy?: string;
  
  /** Session metrics (if applicable) */
  sessionMetrics?: SessionMetrics[];
  
  /** Participant metrics (if applicable) */
  participantMetrics?: ParticipantMetrics[];
  
  /** Health assessments (if applicable) */
  healthAssessments?: CollaborationHealth[];
  
  /** Trend data (if applicable) */
  trends?: MetricTrend[];
  
  /** Summary statistics */
  summary?: ReportSummary;
}

/**
 * Summary for a report
 */
export interface ReportSummary {
  totalSessions: number;
  totalParticipants: number;
  totalOperations: number;
  avgSessionDuration: number;
  avgHealthScore: number;
  topContributors: ParticipationSummary[];
  keyFindings: string[];
}

// -----------------------------------------------------------------------------
// Service Interface
// -----------------------------------------------------------------------------

/**
 * Interface for session analytics service
 */
export interface ISessionAnalyticsService {
  // Session tracking
  startTracking(sessionId: string): void;
  stopTracking(sessionId: string): SessionMetrics;
  isTracking(sessionId: string): boolean;
  
  // Event recording
  recordOperation(sessionId: string, operation: AnalyticsOperation): void;
  recordConflict(sessionId: string, conflict: AnalyticsConflict): void;
  recordLatency(sessionId: string, latencyMs: number): void;
  recordParticipantJoin(sessionId: string, userId: string, role: ParticipantRole): void;
  recordParticipantLeave(sessionId: string, userId: string): void;
  
  // Metrics retrieval
  getSessionMetrics(sessionId: string): SessionMetrics | null;
  getParticipantMetrics(sessionId: string, userId: string): ParticipantMetrics | null;
  getAllParticipantMetrics(sessionId: string): ParticipantMetrics[];
  
  // Health assessment
  assessHealth(sessionId: string): CollaborationHealth;
  getHealthHistory(sessionId: string): CollaborationHealth[];
  
  // Time series
  getSamples(sessionId: string, since?: Date): SessionMetricsSample[];
  
  // Aggregation
  getAggregatedMetrics(period: AggregationPeriod, since: Date, until: Date): AggregatedMetrics;
  getTrend(metric: string, period: AggregationPeriod, since: Date, until: Date): MetricTrend;
  
  // Export
  exportAnalytics(sessionId: string, format: ExportFormat): string;
  generateReport(options: ReportOptions): AnalyticsReport;
}

/**
 * Operation data for analytics
 */
export interface AnalyticsOperation {
  operationId: string;
  userId: string;
  operationType: OperationType;
  characterCount?: number;
  timestamp: Date;
}

/**
 * Conflict data for analytics
 */
export interface AnalyticsConflict {
  conflictId: string;
  userIds: string[];
  resolved: boolean;
  resolutionTime?: number;
  timestamp: Date;
}

/**
 * Options for generating a report
 */
export interface ReportOptions {
  type: 'session' | 'participant' | 'health' | 'trend' | 'comprehensive';
  sessionIds?: string[];
  periodStart: Date;
  periodEnd: Date;
  includeParticipants?: boolean;
  includeHealth?: boolean;
  includeTrends?: boolean;
  format?: ExportFormat;
}

// -----------------------------------------------------------------------------
// Factory Functions
// -----------------------------------------------------------------------------

/**
 * Create default analytics configuration
 */
export function createDefaultAnalyticsConfig(): AnalyticsConfig {
  return {
    enabled: true,
    samplingInterval: 60000, // 1 minute
    retentionPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
    latencyThresholds: {
      excellent: 50,
      good: 100,
      fair: 200,
      poor: 500,
    },
    conflictThresholds: {
      excellent: 1,
      good: 3,
      fair: 5,
      poor: 10,
    },
    participationThresholds: {
      balanced: 0.2,
      acceptable: 0.4,
      unbalanced: 0.6,
    },
    stabilityThresholds: {
      maxReconnectionsPerHour: 3,
      maxSyncFailuresPerHour: 5,
      maxRecoveryTime: 10000,
    },
    trackParticipants: true,
    generateTimeSeries: true,
    maxSamples: 1440, // 24 hours at 1-minute intervals
  };
}

/**
 * Create initial session metrics
 */
export function createInitialSessionMetrics(
  sessionId: string,
  documentId: string,
  tenantId: string
): SessionMetrics {
  const now = new Date();
  return {
    sessionId,
    documentId,
    tenantId,
    duration: 0,
    participantCount: 0,
    activeParticipantCount: 0,
    peakConcurrency: 0,
    operationCount: 0,
    operationsPerMinute: 0,
    conflictCount: 0,
    conflictsResolved: 0,
    conflictResolutionRate: 1,
    averageLatency: 0,
    p95Latency: 0,
    maxLatency: 0,
    syncFailures: 0,
    reconnectionCount: 0,
    avgRecoveryTime: 0,
    startedAt: now,
    lastActivityAt: now,
    operationsByType: {
      INSERT: 0,
      DELETE: 0,
      REPLACE: 0,
      FORMAT: 0,
      MOVE: 0,
      COMPOUND: 0,
    },
    charactersInserted: 0,
    charactersDeleted: 0,
    netCharacterChange: 0,
  };
}

/**
 * Create initial participant metrics
 */
export function createInitialParticipantMetrics(
  userId: string,
  userName: string,
  sessionId: string,
  role: ParticipantRole
): ParticipantMetrics {
  const now = new Date();
  return {
    userId,
    userName,
    sessionId,
    role,
    joinTime: now,
    sessionTime: 0,
    activeTime: 0,
    idleTime: 0,
    activityRatio: 0,
    operationsPerformed: 0,
    operationsPerMinute: 0,
    charactersTyped: 0,
    charactersDeleted: 0,
    wordsTyped: 0,
    conflictsCaused: 0,
    conflictsResolved: 0,
    undoCount: 0,
    redoCount: 0,
    cursorMoves: 0,
    selectionsMade: 0,
    longestEditStreak: 0,
    disconnectionCount: 0,
    averageLatency: 0,
    commentsAdded: 0,
    suggestionsMade: 0,
  };
}

/**
 * Create a health assessment with default values
 */
export function createInitialHealthAssessment(sessionId: string): CollaborationHealth {
  return {
    sessionId,
    score: 100,
    status: 'healthy',
    latencyGrade: 'A',
    latencyScore: 100,
    syncHealth: 'healthy',
    syncScore: 100,
    conflictGrade: 'A',
    conflictScore: 100,
    participationGrade: 'A',
    participationScore: 100,
    stabilityGrade: 'A',
    stabilityScore: 100,
    issues: [],
    recommendations: [],
    assessedAt: new Date(),
  };
}

// -----------------------------------------------------------------------------
// Utility Functions
// -----------------------------------------------------------------------------

/**
 * Calculate grade from score
 */
export function scoreToGrade(score: number): MetricGrade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Calculate health status from score
 */
export function scoreToStatus(score: number): HealthStatus {
  if (score >= 70) return 'healthy';
  if (score >= 40) return 'degraded';
  return 'critical';
}

/**
 * Calculate latency score based on thresholds
 */
export function calculateLatencyScore(
  latencyMs: number,
  thresholds: LatencyThresholds
): number {
  if (latencyMs <= thresholds.excellent) return 100;
  if (latencyMs <= thresholds.good) {
    return 90 - ((latencyMs - thresholds.excellent) / (thresholds.good - thresholds.excellent)) * 10;
  }
  if (latencyMs <= thresholds.fair) {
    return 80 - ((latencyMs - thresholds.good) / (thresholds.fair - thresholds.good)) * 10;
  }
  if (latencyMs <= thresholds.poor) {
    return 70 - ((latencyMs - thresholds.fair) / (thresholds.poor - thresholds.fair)) * 10;
  }
  // Beyond poor
  return Math.max(0, 60 - ((latencyMs - thresholds.poor) / thresholds.poor) * 60);
}

/**
 * Calculate conflict score based on rate
 */
export function calculateConflictScore(
  conflictsPerHundredOps: number,
  thresholds: ConflictThresholds
): number {
  if (conflictsPerHundredOps <= thresholds.excellent) return 100;
  if (conflictsPerHundredOps <= thresholds.good) return 85;
  if (conflictsPerHundredOps <= thresholds.fair) return 70;
  if (conflictsPerHundredOps <= thresholds.poor) return 55;
  return Math.max(0, 40 - (conflictsPerHundredOps - thresholds.poor) * 4);
}

/**
 * Calculate Gini coefficient for participation balance
 * 0 = perfect equality, 1 = perfect inequality
 */
export function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  if (sum === 0) return 0;
  
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return numerator / (n * sum);
}

/**
 * Calculate participation balance score
 */
export function calculateParticipationScore(
  operationCounts: number[],
  thresholds: ParticipationThresholds
): number {
  const gini = calculateGiniCoefficient(operationCounts);
  
  if (gini <= thresholds.balanced) return 100;
  if (gini <= thresholds.acceptable) {
    return 85 - ((gini - thresholds.balanced) / (thresholds.acceptable - thresholds.balanced)) * 15;
  }
  if (gini <= thresholds.unbalanced) {
    return 70 - ((gini - thresholds.acceptable) / (thresholds.unbalanced - thresholds.acceptable)) * 20;
  }
  return Math.max(0, 50 - ((gini - thresholds.unbalanced) / (1 - thresholds.unbalanced)) * 50);
}

/**
 * Determine trend direction from data points
 */
export function determineTrend(dataPoints: TrendDataPoint[]): 'improving' | 'stable' | 'declining' {
  if (dataPoints.length < 2) return 'stable';
  
  // Simple linear regression slope
  const n = dataPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += dataPoints[i].value;
    sumXY += i * dataPoints[i].value;
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avgValue = sumY / n;
  const normalizedSlope = slope / (avgValue || 1);
  
  if (normalizedSlope > 0.05) return 'improving';
  if (normalizedSlope < -0.05) return 'declining';
  return 'stable';
}

/**
 * Calculate percentage change between periods
 */
export function calculateChangePercent(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Default sampling interval (1 minute)
 */
export const DEFAULT_SAMPLING_INTERVAL = 60000;

/**
 * Default retention period (7 days)
 */
export const DEFAULT_RETENTION_PERIOD = 7 * 24 * 60 * 60 * 1000;

/**
 * Health score thresholds
 */
export const HEALTH_THRESHOLDS = {
  healthy: 70,
  degraded: 40,
} as const;

/**
 * Grade thresholds
 */
export const GRADE_THRESHOLDS = {
  A: 90,
  B: 80,
  C: 70,
  D: 60,
} as const;
