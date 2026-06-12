
// =============================================================================
// SESSION ANALYTICS SERVICE
// =============================================================================
// Service for collecting and analyzing collaboration session metrics.
// Tracks operations, participants, latency, conflicts, and health.
// Part of v0.19.3 - Session Analytics Service
// =============================================================================

import { EventEmitter } from 'events';
import { OperationType, ParticipantRole } from '@/types/collaboration-persistence';
import {
  SessionMetrics,
  ParticipantMetrics,
  CollaborationHealth,
  HealthIssue,
  SessionMetricsSample,
  AnalyticsConfig,
  AggregatedMetrics,
  MetricTrend,
  TrendDataPoint,
  AnalyticsReport,
  ReportOptions,
  ReportSummary,
  ParticipationSummary,
  AnalyticsOperation,
  AnalyticsConflict,
  AnalyticsEventType,
  AnalyticsEvent,
  AggregationPeriod,
  ExportFormat,
  ISessionAnalyticsService,
  createDefaultAnalyticsConfig,
  createInitialSessionMetrics,
  createInitialParticipantMetrics,
  createInitialHealthAssessment,
  scoreToGrade,
  scoreToStatus,
  calculateLatencyScore,
  calculateConflictScore,
  calculateParticipationScore,
  determineTrend,
  calculateChangePercent,
} from '@/types/session-analytics';

// -----------------------------------------------------------------------------
// Session Analytics Service
// -----------------------------------------------------------------------------

/**
 * Service for tracking and analyzing collaboration session metrics
 */
export class SessionAnalyticsService implements ISessionAnalyticsService {
  private config: AnalyticsConfig;
  private emitter: EventEmitter;
  
  // Storage
  private sessions: Map<string, SessionMetrics> = new Map();
  private participants: Map<string, Map<string, ParticipantMetrics>> = new Map();
  private samples: Map<string, SessionMetricsSample[]> = new Map();
  private healthHistory: Map<string, CollaborationHealth[]> = new Map();
  private latencies: Map<string, number[]> = new Map();
  private events: AnalyticsEvent[] = [];
  
  // Timers
  private samplingTimers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      ...createDefaultAnalyticsConfig(),
      ...config,
    };
    this.emitter = new EventEmitter();
  }

  // ---------------------------------------------------------------------------
  // Session Tracking
  // ---------------------------------------------------------------------------

  startTracking(sessionId: string, documentId?: string, tenantId?: string): void {
    if (this.sessions.has(sessionId)) {
      return; // Already tracking
    }

    const metrics = createInitialSessionMetrics(
      sessionId,
      documentId || 'unknown',
      tenantId || 'unknown'
    );

    this.sessions.set(sessionId, metrics);
    this.participants.set(sessionId, new Map());
    this.samples.set(sessionId, []);
    this.healthHistory.set(sessionId, []);
    this.latencies.set(sessionId, []);

    // Start sampling timer
    if (this.config.generateTimeSeries) {
      const timer = setInterval(() => {
        this.recordSample(sessionId);
      }, this.config.samplingInterval);
      this.samplingTimers.set(sessionId, timer);
    }

    this.emitEvent('session:started', sessionId, { documentId, tenantId });
  }

  stopTracking(sessionId: string): SessionMetrics {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) {
      return createInitialSessionMetrics(sessionId, 'unknown', 'unknown');
    }

    // Stop sampling timer
    const timer = this.samplingTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.samplingTimers.delete(sessionId);
    }

    // Finalize metrics
    metrics.endedAt = new Date();
    metrics.duration = metrics.endedAt.getTime() - metrics.startedAt.getTime();

    // Calculate final operations per minute
    const durationMinutes = metrics.duration / 60000;
    if (durationMinutes > 0) {
      metrics.operationsPerMinute = metrics.operationCount / durationMinutes;
    }

    // Finalize participant metrics
    const sessionParticipants = this.participants.get(sessionId);
    if (sessionParticipants) {
      for (const participant of Array.from(Array.from(sessionParticipants.values()))) {
        if (!participant.leaveTime) {
          participant.leaveTime = new Date();
        }
        this.finalizeParticipantMetrics(participant);
      }
    }

    this.emitEvent('session:ended', sessionId, { duration: metrics.duration });

    return { ...metrics };
  }

  isTracking(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  // ---------------------------------------------------------------------------
  // Event Recording
  // ---------------------------------------------------------------------------

  recordOperation(sessionId: string, operation: AnalyticsOperation): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    metrics.operationCount++;
    metrics.operationsByType[operation.operationType]++;
    metrics.lastActivityAt = operation.timestamp;

    // Track character changes
    if (operation.characterCount) {
      if (operation.operationType === 'INSERT') {
        metrics.charactersInserted += operation.characterCount;
        metrics.netCharacterChange += operation.characterCount;
      } else if (operation.operationType === 'DELETE') {
        metrics.charactersDeleted += operation.characterCount;
        metrics.netCharacterChange -= operation.characterCount;
      }
    }

    // Update participant metrics
    const participant = this.getOrCreateParticipant(sessionId, operation.userId);
    if (participant) {
      participant.operationsPerformed++;
      if (operation.characterCount) {
        if (operation.operationType === 'INSERT') {
          participant.charactersTyped += operation.characterCount;
          // Estimate words (rough: 5 chars per word)
          participant.wordsTyped = Math.floor(participant.charactersTyped / 5);
        } else if (operation.operationType === 'DELETE') {
          participant.charactersDeleted += operation.characterCount;
        }
      }
    }

    this.emitEvent('operation:recorded', sessionId, {
      operationId: operation.operationId,
      userId: operation.userId,
      type: operation.operationType,
    });
  }

  recordConflict(sessionId: string, conflict: AnalyticsConflict): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    metrics.conflictCount++;
    if (conflict.resolved) {
      metrics.conflictsResolved++;
    }

    // Update conflict resolution rate
    metrics.conflictResolutionRate = metrics.conflictCount > 0
      ? metrics.conflictsResolved / metrics.conflictCount
      : 1;

    // Update participant metrics
    for (const userId of conflict.userIds) {
      const participant = this.getOrCreateParticipant(sessionId, userId);
      if (participant) {
        participant.conflictsCaused++;
        if (conflict.resolved) {
          participant.conflictsResolved++;
        }
      }
    }

    this.emitEvent('conflict:detected', sessionId, {
      conflictId: conflict.conflictId,
      userIds: conflict.userIds,
      resolved: conflict.resolved,
    });

    if (conflict.resolved) {
      this.emitEvent('conflict:resolved', sessionId, {
        conflictId: conflict.conflictId,
        resolutionTime: conflict.resolutionTime,
      });
    }
  }

  recordLatency(sessionId: string, latencyMs: number): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    const latencies = this.latencies.get(sessionId) || [];
    latencies.push(latencyMs);

    // Keep only recent latencies (last 1000)
    if (latencies.length > 1000) {
      latencies.shift();
    }

    this.latencies.set(sessionId, latencies);

    // Update metrics
    metrics.averageLatency = this.calculateAverage(latencies);
    metrics.p95Latency = this.calculatePercentile(latencies, 95);
    metrics.maxLatency = Math.max(...latencies);

    this.emitEvent('latency:measured', sessionId, { latencyMs });
  }

  recordParticipantJoin(
    sessionId: string,
    userId: string,
    role: ParticipantRole,
    userName?: string
  ): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    metrics.participantCount++;
    metrics.activeParticipantCount++;
    metrics.peakConcurrency = Math.max(
      metrics.peakConcurrency,
      metrics.activeParticipantCount
    );

    // Create participant metrics
    const participant = createInitialParticipantMetrics(
      userId,
      userName || userId,
      sessionId,
      role
    );
    
    let sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) {
      sessionParticipants = new Map();
      this.participants.set(sessionId, sessionParticipants);
    }
    sessionParticipants.set(userId, participant);

    this.emitEvent('participant:joined', sessionId, { userId, role });
  }

  recordParticipantLeave(sessionId: string, userId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    metrics.activeParticipantCount = Math.max(0, metrics.activeParticipantCount - 1);

    const sessionParticipants = this.participants.get(sessionId);
    const participant = sessionParticipants?.get(userId);
    if (participant) {
      participant.leaveTime = new Date();
      this.finalizeParticipantMetrics(participant);
    }

    this.emitEvent('participant:left', sessionId, { userId });
  }

  recordReconnection(sessionId: string, userId: string, recoveryTimeMs: number): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    metrics.reconnectionCount++;
    
    // Update average recovery time
    const totalRecoveryTime = metrics.avgRecoveryTime * (metrics.reconnectionCount - 1) + recoveryTimeMs;
    metrics.avgRecoveryTime = totalRecoveryTime / metrics.reconnectionCount;

    const participant = this.getOrCreateParticipant(sessionId, userId);
    if (participant) {
      participant.disconnectionCount++;
    }
  }

  recordSyncFailure(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    metrics.syncFailures++;
  }

  // ---------------------------------------------------------------------------
  // Metrics Retrieval
  // ---------------------------------------------------------------------------

  getSessionMetrics(sessionId: string): SessionMetrics | null {
    const metrics = this.sessions.get(sessionId);
    return metrics ? { ...metrics } : null;
  }

  getParticipantMetrics(sessionId: string, userId: string): ParticipantMetrics | null {
    const sessionParticipants = this.participants.get(sessionId);
    const participant = sessionParticipants?.get(userId);
    return participant ? { ...participant } : null;
  }

  getAllParticipantMetrics(sessionId: string): ParticipantMetrics[] {
    const sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) return [];
    return Array.from(sessionParticipants.values()).map(p => ({ ...p }));
  }

  // ---------------------------------------------------------------------------
  // Health Assessment
  // ---------------------------------------------------------------------------

  assessHealth(sessionId: string): CollaborationHealth {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) {
      return createInitialHealthAssessment(sessionId);
    }

    const health = createInitialHealthAssessment(sessionId);
    const issues: HealthIssue[] = [];

    // Latency score
    health.latencyScore = calculateLatencyScore(
      metrics.averageLatency,
      this.config.latencyThresholds
    );
    health.latencyGrade = scoreToGrade(health.latencyScore);

    if (health.latencyScore < 70) {
      issues.push({
        id: `latency-${Date.now()}`,
        severity: health.latencyScore < 40 ? 'critical' : 'high',
        category: 'latency',
        description: `High average latency: ${Math.round(metrics.averageLatency)}ms`,
        metric: 'averageLatency',
        currentValue: metrics.averageLatency,
        threshold: this.config.latencyThresholds.fair,
        detectedAt: new Date(),
      });
    }

    // Conflict score
    const conflictsPerHundred = metrics.operationCount > 0
      ? (metrics.conflictCount / metrics.operationCount) * 100
      : 0;
    health.conflictScore = calculateConflictScore(
      conflictsPerHundred,
      this.config.conflictThresholds
    );
    health.conflictGrade = scoreToGrade(health.conflictScore);

    if (health.conflictScore < 70) {
      issues.push({
        id: `conflict-${Date.now()}`,
        severity: health.conflictScore < 40 ? 'critical' : 'medium',
        category: 'conflict',
        description: `High conflict rate: ${conflictsPerHundred.toFixed(1)} per 100 operations`,
        metric: 'conflictRate',
        currentValue: conflictsPerHundred,
        threshold: this.config.conflictThresholds.fair,
        detectedAt: new Date(),
      });
    }

    // Participation score
    const sessionParticipants = this.participants.get(sessionId);
    const operationCounts = sessionParticipants
      ? Array.from(sessionParticipants.values()).map(p => p.operationsPerformed)
      : [];
    
    health.participationScore = calculateParticipationScore(
      operationCounts,
      this.config.participationThresholds
    );
    health.participationGrade = scoreToGrade(health.participationScore);

    if (health.participationScore < 70 && operationCounts.length > 1) {
      issues.push({
        id: `participation-${Date.now()}`,
        severity: 'low',
        category: 'participation',
        description: 'Unbalanced participation among collaborators',
        detectedAt: new Date(),
      });
    }

    // Stability score
    const durationHours = metrics.duration / 3600000 || 1;
    const reconnectsPerHour = metrics.reconnectionCount / durationHours;
    const failuresPerHour = metrics.syncFailures / durationHours;

    let stabilityScore = 100;
    if (reconnectsPerHour > this.config.stabilityThresholds.maxReconnectionsPerHour) {
      stabilityScore -= 20;
    }
    if (failuresPerHour > this.config.stabilityThresholds.maxSyncFailuresPerHour) {
      stabilityScore -= 30;
    }
    if (metrics.avgRecoveryTime > this.config.stabilityThresholds.maxRecoveryTime) {
      stabilityScore -= 20;
    }
    stabilityScore = Math.max(0, stabilityScore);

    health.stabilityScore = stabilityScore;
    health.stabilityGrade = scoreToGrade(stabilityScore);

    if (stabilityScore < 70) {
      issues.push({
        id: `stability-${Date.now()}`,
        severity: stabilityScore < 40 ? 'high' : 'medium',
        category: 'stability',
        description: 'Connection stability issues detected',
        detectedAt: new Date(),
      });
    }

    // Sync health
    health.syncScore = metrics.syncFailures === 0 ? 100 : Math.max(0, 100 - metrics.syncFailures * 10);
    health.syncHealth = scoreToStatus(health.syncScore);

    // Overall score (weighted average)
    health.score = Math.round(
      health.latencyScore * 0.3 +
      health.conflictScore * 0.2 +
      health.participationScore * 0.15 +
      health.stabilityScore * 0.2 +
      health.syncScore * 0.15
    );
    health.status = scoreToStatus(health.score);

    // Generate recommendations
    health.recommendations = this.generateRecommendations(health, metrics);
    health.issues = issues;
    health.assessedAt = new Date();

    // Store in history
    const history = this.healthHistory.get(sessionId) || [];
    history.push(health);
    if (history.length > 100) {
      history.shift();
    }
    this.healthHistory.set(sessionId, history);

    this.emitEvent('health:assessed', sessionId, { score: health.score, status: health.status });

    return health;
  }

  getHealthHistory(sessionId: string): CollaborationHealth[] {
    return [...(this.healthHistory.get(sessionId) || [])];
  }

  // ---------------------------------------------------------------------------
  // Time Series
  // ---------------------------------------------------------------------------

  getSamples(sessionId: string, since?: Date): SessionMetricsSample[] {
    const allSamples = this.samples.get(sessionId) || [];
    if (!since) return [...allSamples];
    
    return allSamples.filter(s => s.timestamp >= since);
  }

  private recordSample(sessionId: string): void {
    const metrics = this.sessions.get(sessionId);
    if (!metrics) return;

    const sample: SessionMetricsSample = {
      timestamp: new Date(),
      activeParticipants: metrics.activeParticipantCount,
      operations: metrics.operationCount,
      avgLatency: metrics.averageLatency,
      conflicts: metrics.conflictCount,
    };

    const samples = this.samples.get(sessionId) || [];
    samples.push(sample);

    // Trim to max samples
    if (samples.length > this.config.maxSamples) {
      samples.shift();
    }

    this.samples.set(sessionId, samples);
    this.emitEvent('sample:recorded', sessionId, { ...sample });
  }

  // ---------------------------------------------------------------------------
  // Aggregation
  // ---------------------------------------------------------------------------

  getAggregatedMetrics(
    period: AggregationPeriod,
    since: Date,
    until: Date
  ): AggregatedMetrics {
    const sessionsInPeriod = Array.from(this.sessions.values()).filter(
      s => s.startedAt >= since && s.startedAt <= until
    );

    const uniqueUsers = new Set<string>();
    let totalOps = 0;
    let totalDuration = 0;
    let totalLatency = 0;
    let totalConflicts = 0;
    let totalHealthScore = 0;

    const sessionsByHealth: Record<string, number> = {
      healthy: 0,
      degraded: 0,
      critical: 0,
    };

    for (const session of sessionsInPeriod) {
      const sessionParticipants = this.participants.get(session.sessionId);
      if (sessionParticipants) {
        for (const userId of Array.from(Array.from(sessionParticipants.keys()))) {
          uniqueUsers.add(userId);
        }
      }

      totalOps += session.operationCount;
      totalDuration += session.duration;
      totalLatency += session.averageLatency;
      totalConflicts += session.conflictCount;

      const health = this.assessHealth(session.sessionId);
      totalHealthScore += health.score;
      sessionsByHealth[health.status]++;
    }

    const sessionCount = sessionsInPeriod.length || 1;

    return {
      periodStart: since,
      periodEnd: until,
      period,
      sessionCount: sessionsInPeriod.length,
      totalParticipants: Array.from(this.participants.values())
        .reduce((sum, map) => sum + map.size, 0),
      uniqueParticipants: uniqueUsers.size,
      totalOperations: totalOps,
      avgOperationsPerSession: totalOps / sessionCount,
      avgSessionDuration: totalDuration / sessionCount,
      avgLatency: totalLatency / sessionCount,
      totalConflicts,
      avgHealthScore: totalHealthScore / sessionCount,
      sessionsByHealth: sessionsByHealth as Record<'healthy' | 'degraded' | 'critical', number>,
    };
  }

  getTrend(
    metric: string,
    period: AggregationPeriod,
    since: Date,
    until: Date
  ): MetricTrend {
    const dataPoints: TrendDataPoint[] = [];
    const periodMs = this.getPeriodMs(period);
    
    let current = new Date(since);
    while (current <= until) {
      const periodEnd = new Date(current.getTime() + periodMs);
      const value = this.getMetricValue(metric, current, periodEnd);
      
      dataPoints.push({
        timestamp: new Date(current),
        value,
      });
      
      current = periodEnd;
    }

    const trend = determineTrend(dataPoints);
    const changePercent = dataPoints.length >= 2
      ? calculateChangePercent(dataPoints[0].value, dataPoints[dataPoints.length - 1].value)
      : 0;

    return {
      metric,
      period,
      dataPoints,
      trend,
      changePercent,
    };
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  exportAnalytics(sessionId: string, format: ExportFormat): string {
    const metrics = this.getSessionMetrics(sessionId);
    const participants = this.getAllParticipantMetrics(sessionId);
    const health = this.assessHealth(sessionId);
    const samples = this.getSamples(sessionId);

    const data = {
      sessionMetrics: metrics,
      participantMetrics: participants,
      healthAssessment: health,
      timeSeries: samples,
      exportedAt: new Date().toISOString(),
    };

    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      
      case 'csv':
        return this.toCSV(data);
      
      case 'xlsx':
        // Return JSON for now; actual XLSX would need a library
        return JSON.stringify(data);
      
      default:
        return JSON.stringify(data);
    }
  }

  generateReport(options: ReportOptions): AnalyticsReport {
    const sessionIds = options.sessionIds || Array.from(this.sessions.keys());
    const sessionMetrics: SessionMetrics[] = [];
    const participantMetrics: ParticipantMetrics[] = [];
    const healthAssessments: CollaborationHealth[] = [];
    const trends: MetricTrend[] = [];

    for (const sessionId of sessionIds) {
      const metrics = this.getSessionMetrics(sessionId);
      if (metrics) {
        sessionMetrics.push(metrics);
      }

      if (options.includeParticipants) {
        participantMetrics.push(...this.getAllParticipantMetrics(sessionId));
      }

      if (options.includeHealth) {
        healthAssessments.push(this.assessHealth(sessionId));
      }
    }

    if (options.includeTrends) {
      trends.push(
        this.getTrend('operationCount', 'hour', options.periodStart, options.periodEnd),
        this.getTrend('averageLatency', 'hour', options.periodStart, options.periodEnd),
        this.getTrend('conflictCount', 'hour', options.periodStart, options.periodEnd)
      );
    }

    // Generate summary
    const summary = this.generateSummary(sessionMetrics, participantMetrics, healthAssessments);

    return {
      id: `report-${Date.now()}`,
      title: `Collaboration Analytics Report`,
      type: options.type,
      periodStart: options.periodStart,
      periodEnd: options.periodEnd,
      sessionIds,
      generatedAt: new Date(),
      sessionMetrics: sessionMetrics.length > 0 ? sessionMetrics : undefined,
      participantMetrics: participantMetrics.length > 0 ? participantMetrics : undefined,
      healthAssessments: healthAssessments.length > 0 ? healthAssessments : undefined,
      trends: trends.length > 0 ? trends : undefined,
      summary,
    };
  }

  // ---------------------------------------------------------------------------
  // Configuration
  // ---------------------------------------------------------------------------

  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  on(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.on(event, handler);
  }

  off(event: string, handler: (...args: unknown[]) => void): void {
    this.emitter.off(event, handler);
  }

  private emitEvent(
    type: AnalyticsEventType,
    sessionId: string,
    data: Record<string, unknown>
  ): void {
    const event: AnalyticsEvent = {
      type,
      sessionId,
      timestamp: new Date(),
      data,
    };

    this.events.push(event);
    if (this.events.length > 10000) {
      this.events.shift();
    }

    this.emitter.emit(type, event);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private getOrCreateParticipant(
    sessionId: string,
    userId: string
  ): ParticipantMetrics | null {
    let sessionParticipants = this.participants.get(sessionId);
    if (!sessionParticipants) {
      sessionParticipants = new Map();
      this.participants.set(sessionId, sessionParticipants);
    }

    let participant = sessionParticipants.get(userId);
    if (!participant) {
      participant = createInitialParticipantMetrics(userId, userId, sessionId, 'EDITOR');
      sessionParticipants.set(userId, participant);
    }

    return participant;
  }

  private finalizeParticipantMetrics(participant: ParticipantMetrics): void {
    if (participant.leaveTime) {
      participant.sessionTime = participant.leaveTime.getTime() - participant.joinTime.getTime();
    }
    
    // Estimate active time as 80% of session time if they made operations
    if (participant.operationsPerformed > 0) {
      participant.activeTime = participant.sessionTime * 0.8;
      participant.idleTime = participant.sessionTime * 0.2;
    } else {
      participant.activeTime = 0;
      participant.idleTime = participant.sessionTime;
    }

    participant.activityRatio = participant.sessionTime > 0
      ? participant.activeTime / participant.sessionTime
      : 0;

    const sessionMinutes = participant.sessionTime / 60000;
    participant.operationsPerMinute = sessionMinutes > 0
      ? participant.operationsPerformed / sessionMinutes
      : 0;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private generateRecommendations(
    health: CollaborationHealth,
    metrics: SessionMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (health.latencyScore < 70) {
      recommendations.push('Consider reducing network load or upgrading connection');
    }

    if (health.conflictScore < 70) {
      recommendations.push('Encourage participants to work on different sections');
    }

    if (health.participationScore < 70) {
      recommendations.push('Facilitate more balanced participation among collaborators');
    }

    if (health.stabilityScore < 70) {
      recommendations.push('Check network stability and consider auto-save frequency');
    }

    if (metrics.reconnectionCount > 5) {
      recommendations.push('Investigate frequent disconnections');
    }

    return recommendations;
  }

  private getPeriodMs(period: AggregationPeriod): number {
    switch (period) {
      case 'minute': return 60000;
      case 'hour': return 3600000;
      case 'day': return 86400000;
      case 'week': return 604800000;
      case 'month': return 2592000000;
      default: return 3600000;
    }
  }

  private getMetricValue(metric: string, since: Date, until: Date): number {
    let total = 0;
    let count = 0;

    for (const session of Array.from(Array.from(this.sessions.values()))) {
      if (session.startedAt >= since && session.startedAt <= until) {
        switch (metric) {
          case 'operationCount':
            total += session.operationCount;
            break;
          case 'averageLatency':
            total += session.averageLatency;
            count++;
            break;
          case 'conflictCount':
            total += session.conflictCount;
            break;
          case 'participantCount':
            total += session.participantCount;
            break;
          default:
            break;
        }
      }
    }

    return metric === 'averageLatency' && count > 0 ? total / count : total;
  }

  private toCSV(data: Record<string, unknown>): string {
    const lines: string[] = [];

    // Session metrics
    if (data.sessionMetrics) {
      const metrics = data.sessionMetrics as SessionMetrics;
      lines.push('Session Metrics');
      lines.push('Metric,Value');
      lines.push(`Session ID,${metrics.sessionId}`);
      lines.push(`Duration (ms),${metrics.duration}`);
      lines.push(`Participants,${metrics.participantCount}`);
      lines.push(`Operations,${metrics.operationCount}`);
      lines.push(`Avg Latency (ms),${metrics.averageLatency}`);
      lines.push(`Conflicts,${metrics.conflictCount}`);
      lines.push('');
    }

    // Health assessment
    if (data.healthAssessment) {
      const health = data.healthAssessment as CollaborationHealth;
      lines.push('Health Assessment');
      lines.push('Category,Score,Grade');
      lines.push(`Overall,${health.score},${scoreToGrade(health.score)}`);
      lines.push(`Latency,${health.latencyScore},${health.latencyGrade}`);
      lines.push(`Conflicts,${health.conflictScore},${health.conflictGrade}`);
      lines.push(`Participation,${health.participationScore},${health.participationGrade}`);
      lines.push(`Stability,${health.stabilityScore},${health.stabilityGrade}`);
    }

    return lines.join('\n');
  }

  private generateSummary(
    sessions: SessionMetrics[],
    participants: ParticipantMetrics[],
    healthAssessments: CollaborationHealth[]
  ): ReportSummary {
    const totalOperations = sessions.reduce((sum, s) => sum + s.operationCount, 0);
    const totalDuration = sessions.reduce((sum, s) => sum + s.duration, 0);
    const avgHealthScore = healthAssessments.length > 0
      ? healthAssessments.reduce((sum, h) => sum + h.score, 0) / healthAssessments.length
      : 100;

    // Top contributors
    const sorted = [...participants].sort((a, b) => b.operationsPerformed - a.operationsPerformed);
    const topContributors: ParticipationSummary[] = sorted.slice(0, 5).map((p, i) => ({
      userId: p.userId,
      userName: p.userName,
      operationCount: p.operationsPerformed,
      charactersContributed: p.charactersTyped,
      activityPercentage: totalOperations > 0
        ? (p.operationsPerformed / totalOperations) * 100
        : 0,
      rank: i + 1,
    }));

    const keyFindings: string[] = [];
    if (sessions.length > 0) {
      keyFindings.push(`${sessions.length} collaboration sessions analyzed`);
    }
    if (participants.length > 0) {
      keyFindings.push(`${participants.length} unique participants`);
    }
    if (avgHealthScore >= 80) {
      keyFindings.push('Overall collaboration health is good');
    } else if (avgHealthScore < 60) {
      keyFindings.push('Collaboration health needs improvement');
    }

    return {
      totalSessions: sessions.length,
      totalParticipants: participants.length,
      totalOperations,
      avgSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      avgHealthScore,
      topContributors,
      keyFindings,
    };
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createSessionAnalyticsService(
  config?: Partial<AnalyticsConfig>
): SessionAnalyticsService {
  return new SessionAnalyticsService(config);
}
