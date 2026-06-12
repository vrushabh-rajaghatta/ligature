
/**
 * Alerting Rules Engine
 * Configurable alert conditions with complex rule evaluation
 * 
 * v0.42.5 - Alerting Rules Engine
 * 
 * Features:
 * - Declarative rule definitions
 * - Complex condition operators
 * - Alert aggregation and deduplication
 * - Escalation policies
 * - Silence and maintenance windows
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';
export type AlertState = 'pending' | 'firing' | 'resolved' | 'silenced' | 'acknowledged';

export type ConditionOperator = 
  | 'eq'        // equals
  | 'neq'       // not equals
  | 'gt'        // greater than
  | 'gte'       // greater than or equal
  | 'lt'        // less than
  | 'lte'       // less than or equal
  | 'contains'  // string contains
  | 'matches'   // regex match
  | 'in'        // value in list
  | 'not-in'    // value not in list
  | 'exists'    // field exists
  | 'not-exists'; // field does not exist

export type AggregationFunction = 
  | 'avg'       // average
  | 'sum'       // sum
  | 'min'       // minimum
  | 'max'       // maximum
  | 'count'     // count
  | 'p50'       // 50th percentile
  | 'p90'       // 90th percentile
  | 'p95'       // 95th percentile
  | 'p99'       // 99th percentile
  | 'rate';     // rate of change

export interface AlertCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  aggregation?: AggregationFunction;
  window?: number;             // Aggregation window in ms
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  
  // Targeting
  source: string;              // Data source (circuit-breaker, bulkhead, etc.)
  sourceFilter?: Record<string, string>; // Filter specific instances
  
  // Conditions
  conditions: AlertCondition[];
  conditionLogic: 'and' | 'or'; // How conditions combine
  
  // Timing
  evaluationInterval: number;  // How often to evaluate (ms)
  forDuration: number;         // Condition must be true for X ms before firing
  
  // Alert configuration
  severity: AlertSeverity;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  
  // Actions
  notificationChannels: string[];
  escalationPolicyId?: string;
  runbook?: string;
  
  // Metadata
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: AlertSeverity;
  state: AlertState;
  
  // Instance info
  source: string;
  sourceInstance?: string;
  
  // Condition details
  conditionValues: Record<string, unknown>;
  message: string;
  
  // Labels and annotations
  labels: Record<string, string>;
  annotations: Record<string, string>;
  
  // Timing
  startsAt: number;
  endsAt?: number;
  lastEvaluatedAt: number;
  firingDuration: number;
  
  // State management
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  silencedUntil?: number;
  
  // Actions
  notificationsSent: { channel: string; sentAt: number }[];
  escalationLevel: number;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description?: string;
  
  levels: EscalationLevel[];
  
  // Options
  repeatInterval?: number;     // Re-notify after X ms if not acknowledged
  maxRepeats?: number;
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;        // Wait X minutes before escalating to this level
  notificationChannels: string[];
  notifyUsers?: string[];
}

export interface SilenceWindow {
  id: string;
  name: string;
  description?: string;
  
  // Matching
  matchers: { label: string; value: string; regex?: boolean }[];
  
  // Timing
  startsAt: number;
  endsAt: number;
  
  // Metadata
  createdBy: string;
  createdAt: number;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  description?: string;
  
  // Affected sources
  sources: string[];
  sourceInstances?: string[];
  
  // Timing
  startsAt: number;
  endsAt: number;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];     // 0-6 for weekly
    dayOfMonth?: number;       // 1-31 for monthly
  };
  
  // Metadata
  createdBy: string;
  createdAt: number;
}

export interface RuleEvaluationResult {
  ruleId: string;
  timestamp: number;
  conditionsMet: boolean;
  conditionResults: { conditionId: string; met: boolean; value: unknown }[];
  error?: string;
}

export interface AlertingStats {
  totalRules: number;
  enabledRules: number;
  totalAlerts: number;
  alertsByState: Record<AlertState, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  activeSilences: number;
  activeMaintenanceWindows: number;
  evaluationsPerMinute: number;
  lastEvaluation?: number;
}

// =============================================================================
// DEFAULT RULE TEMPLATES
// =============================================================================

export const RULE_TEMPLATES: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Circuit Breaker Open',
    description: 'Fires when a circuit breaker opens',
    enabled: true,
    source: 'circuit-breaker',
    conditions: [
      { id: 'cond-1', field: 'state', operator: 'eq', value: 'open' },
    ],
    conditionLogic: 'and',
    evaluationInterval: 5000,
    forDuration: 0,
    severity: 'error',
    labels: { type: 'circuit-breaker', event: 'open' },
    annotations: {
      summary: 'Circuit breaker {{source.name}} is open',
      description: 'Circuit breaker has opened due to failures',
    },
    notificationChannels: [],
  },
  {
    name: 'High Error Rate',
    description: 'Fires when error rate exceeds 10% for 5 minutes',
    enabled: true,
    source: 'executor',
    conditions: [
      { id: 'cond-1', field: 'errorRate', operator: 'gt', value: 10, aggregation: 'avg', window: 300000 },
    ],
    conditionLogic: 'and',
    evaluationInterval: 30000,
    forDuration: 300000,
    severity: 'warning',
    labels: { type: 'performance', metric: 'error-rate' },
    annotations: {
      summary: 'High error rate detected: {{value}}%',
      description: 'Error rate has exceeded 10% threshold',
    },
    notificationChannels: [],
  },
  {
    name: 'Bulkhead Saturated',
    description: 'Fires when bulkhead utilization exceeds 90%',
    enabled: true,
    source: 'bulkhead',
    conditions: [
      { id: 'cond-1', field: 'utilizationPercent', operator: 'gte', value: 90 },
    ],
    conditionLogic: 'and',
    evaluationInterval: 10000,
    forDuration: 60000,
    severity: 'warning',
    labels: { type: 'capacity', resource: 'bulkhead' },
    annotations: {
      summary: 'Bulkhead {{source.name}} is saturated at {{value}}%',
      description: 'Resource pool is nearing capacity',
    },
    notificationChannels: [],
  },
  {
    name: 'Rate Limit Exceeded',
    description: 'Fires when rate limit rejections spike',
    enabled: true,
    source: 'rate-limiter',
    conditions: [
      { id: 'cond-1', field: 'rejectedCount', operator: 'gt', value: 100, aggregation: 'sum', window: 60000 },
    ],
    conditionLogic: 'and',
    evaluationInterval: 15000,
    forDuration: 0,
    severity: 'info',
    labels: { type: 'throttling' },
    annotations: {
      summary: '{{value}} requests rejected in last minute',
      description: 'Rate limiting is actively rejecting requests',
    },
    notificationChannels: [],
  },
  {
    name: 'Storage Critical',
    description: 'Fires when storage usage exceeds 95%',
    enabled: true,
    source: 'storage',
    conditions: [
      { id: 'cond-1', field: 'usagePercent', operator: 'gte', value: 95 },
    ],
    conditionLogic: 'and',
    evaluationInterval: 60000,
    forDuration: 0,
    severity: 'critical',
    labels: { type: 'storage', urgency: 'immediate' },
    annotations: {
      summary: 'Storage critical: {{value}}% used',
      description: 'Storage is nearly full, immediate action required',
    },
    notificationChannels: [],
  },
];

// =============================================================================
// ALERTING RULES ENGINE
// =============================================================================

class AlertingRulesEngine {
  private rules: Map<string, AlertRule> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  private silenceWindows: Map<string, SilenceWindow> = new Map();
  private maintenanceWindows: Map<string, MaintenanceWindow> = new Map();
  
  private evaluationTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private pendingConditions: Map<string, { since: number; values: Record<string, unknown> }> = new Map();
  private evaluationCount: number = 0;
  private evaluationStartTime: number = Date.now();
  
  private dataFetcher?: (source: string, instance?: string) => Promise<Record<string, unknown>>;
  private notificationSender?: (channelId: string, alert: Alert) => Promise<void>;
  
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ---------------------------------------------------------------------------
  // CONFIGURATION
  // ---------------------------------------------------------------------------

  setDataFetcher(fetcher: (source: string, instance?: string) => Promise<Record<string, unknown>>): void {
    this.dataFetcher = fetcher;
  }

  setNotificationSender(sender: (channelId: string, alert: Alert) => Promise<void>): void {
    this.notificationSender = sender;
  }

  // ---------------------------------------------------------------------------
  // RULE MANAGEMENT
  // ---------------------------------------------------------------------------

  createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.rules.set(newRule.id, newRule);
    
    if (newRule.enabled) {
      this.startRuleEvaluation(newRule);
    }

    this.saveToStorage();
    this.notifyListeners();
    return newRule;
  }

  updateRule(id: string, updates: Partial<AlertRule>): AlertRule | undefined {
    const rule = this.rules.get(id);
    if (!rule) return undefined;

    const wasEnabled = rule.enabled;
    const updated = {
      ...rule,
      ...updates,
      id: rule.id,
      createdAt: rule.createdAt,
      updatedAt: Date.now(),
    };

    this.rules.set(id, updated);

    // Handle enable/disable
    if (wasEnabled && !updated.enabled) {
      this.stopRuleEvaluation(id);
    } else if (!wasEnabled && updated.enabled) {
      this.startRuleEvaluation(updated);
    } else if (updated.enabled && updates.evaluationInterval !== undefined) {
      // Restart with new interval
      this.stopRuleEvaluation(id);
      this.startRuleEvaluation(updated);
    }

    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  deleteRule(id: string): boolean {
    const rule = this.rules.get(id);
    if (!rule) return false;

    this.stopRuleEvaluation(id);
    this.rules.delete(id);
    this.pendingConditions.delete(id);

    // Resolve any alerts for this rule
    for (const [alertId, alert] of Array.from(Array.from(Array.from(Array.from(Array.from(this.alerts.entries())))))) {
      if (alert.ruleId === id) {
        this.resolveAlert(alertId);
      }
    }

    this.saveToStorage();
    this.notifyListeners();
    return true;
  }

  getRule(id: string): AlertRule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  createRuleFromTemplate(templateIndex: number, overrides?: Partial<AlertRule>): AlertRule {
    const template = RULE_TEMPLATES[templateIndex];
    if (!template) {
      throw new Error(`Template at index ${templateIndex} not found`);
    }
    return this.createRule({ ...template, ...overrides });
  }

  // ---------------------------------------------------------------------------
  // RULE EVALUATION
  // ---------------------------------------------------------------------------

  private startRuleEvaluation(rule: AlertRule): void {
    if (this.evaluationTimers.has(rule.id)) return;

    const timer = setInterval(() => {
      this.evaluateRule(rule.id);
    }, rule.evaluationInterval);

    this.evaluationTimers.set(rule.id, timer);
    
    // Initial evaluation
    this.evaluateRule(rule.id);
  }

  private stopRuleEvaluation(ruleId: string): void {
    const timer = this.evaluationTimers.get(ruleId);
    if (timer) {
      clearInterval(timer);
      this.evaluationTimers.delete(ruleId);
    }
  }

  async evaluateRule(ruleId: string): Promise<RuleEvaluationResult> {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.enabled) {
      return {
        ruleId,
        timestamp: Date.now(),
        conditionsMet: false,
        conditionResults: [],
        error: 'Rule not found or disabled',
      };
    }

    this.evaluationCount++;

    try {
      // Fetch data
      const data = this.dataFetcher
        ? await this.dataFetcher(rule.source)
        : this.getMockData(rule.source);

      // Evaluate conditions
      const conditionResults: { conditionId: string; met: boolean; value: unknown }[] = [];
      
      for (const condition of rule.conditions) {
        const value = this.evaluateCondition(condition, data);
        const met = this.checkCondition(condition, value);
        conditionResults.push({ conditionId: condition.id, met, value });
      }

      // Combine results based on logic
      const conditionsMet = rule.conditionLogic === 'and'
        ? conditionResults.every(r => r.met)
        : conditionResults.some(r => r.met);

      // Handle forDuration
      if (conditionsMet) {
        this.handleConditionsMet(rule, conditionResults);
      } else {
        this.handleConditionsNotMet(rule);
      }

      return {
        ruleId,
        timestamp: Date.now(),
        conditionsMet,
        conditionResults,
      };
    } catch (error) {
      return {
        ruleId,
        timestamp: Date.now(),
        conditionsMet: false,
        conditionResults: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private evaluateCondition(condition: AlertCondition, data: Record<string, unknown>): unknown {
    const fieldValue = this.getNestedValue(data, condition.field);

    if (condition.aggregation) {
      // For now, return raw value - in production, would aggregate over window
      return fieldValue;
    }

    return fieldValue;
  }

  private checkCondition(condition: AlertCondition, value: unknown): boolean {
    const target = condition.value;

    switch (condition.operator) {
      case 'eq':
        return value === target;
      case 'neq':
        return value !== target;
      case 'gt':
        return typeof value === 'number' && typeof target === 'number' && value > target;
      case 'gte':
        return typeof value === 'number' && typeof target === 'number' && value >= target;
      case 'lt':
        return typeof value === 'number' && typeof target === 'number' && value < target;
      case 'lte':
        return typeof value === 'number' && typeof target === 'number' && value <= target;
      case 'contains':
        return typeof value === 'string' && typeof target === 'string' && value.includes(target);
      case 'matches':
        return typeof value === 'string' && typeof target === 'string' && new RegExp(target).test(value);
      case 'in':
        return Array.isArray(target) && target.includes(value);
      case 'not-in':
        return Array.isArray(target) && !target.includes(value);
      case 'exists':
        return value !== undefined && value !== null;
      case 'not-exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private handleConditionsMet(
    rule: AlertRule,
    conditionResults: { conditionId: string; met: boolean; value: unknown }[]
  ): void {
    const conditionValues = conditionResults.reduce((acc, r) => {
      acc[r.conditionId] = r.value;
      return acc;
    }, {} as Record<string, unknown>);

    const pending = this.pendingConditions.get(rule.id);

    if (rule.forDuration === 0) {
      // Fire immediately
      this.fireAlert(rule, conditionValues);
    } else if (!pending) {
      // Start pending
      this.pendingConditions.set(rule.id, {
        since: Date.now(),
        values: conditionValues,
      });
    } else if (Date.now() - pending.since >= rule.forDuration) {
      // Duration met, fire alert
      this.fireAlert(rule, conditionValues);
    }
    // Else: still pending, continue waiting
  }

  private handleConditionsNotMet(rule: AlertRule): void {
    // Clear pending
    this.pendingConditions.delete(rule.id);

    // Resolve any firing alerts for this rule
    for (const [alertId, alert] of Array.from(Array.from(Array.from(Array.from(Array.from(this.alerts.entries())))))) {
      if (alert.ruleId === rule.id && alert.state === 'firing') {
        this.resolveAlert(alertId);
      }
    }
  }

  private fireAlert(rule: AlertRule, conditionValues: Record<string, unknown>): void {
    // Check if already firing
    const existingAlert = Array.from(this.alerts.values()).find(
      a => a.ruleId === rule.id && a.state === 'firing'
    );

    if (existingAlert) {
      // Update existing alert
      existingAlert.lastEvaluatedAt = Date.now();
      existingAlert.firingDuration = Date.now() - existingAlert.startsAt;
      existingAlert.conditionValues = conditionValues;
      this.notifyListeners();
      return;
    }

    // Check silences
    if (this.isRuleSilenced(rule)) {
      return;
    }

    // Check maintenance windows
    if (this.isInMaintenanceWindow(rule)) {
      return;
    }

    // Create new alert
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      state: 'firing',
      source: rule.source,
      conditionValues,
      message: this.interpolateTemplate(rule.annotations.summary || rule.name, conditionValues),
      labels: { ...rule.labels },
      annotations: { ...rule.annotations },
      startsAt: Date.now(),
      lastEvaluatedAt: Date.now(),
      firingDuration: 0,
      notificationsSent: [],
      escalationLevel: 0,
    };

    this.alerts.set(alert.id, alert);
    this.pendingConditions.delete(rule.id);

    // Send notifications
    this.sendNotifications(alert, rule.notificationChannels);

    this.saveToStorage();
    this.notifyListeners();
  }

  private isRuleSilenced(rule: AlertRule): boolean {
    const now = Date.now();
    
    for (const silence of Array.from(Array.from(Array.from(Array.from(Array.from(this.silenceWindows.values())))))) {
      if (now < silence.startsAt || now > silence.endsAt) continue;

      const matches = silence.matchers.every(matcher => {
        const labelValue = rule.labels[matcher.label];
        if (matcher.regex) {
          return labelValue && new RegExp(matcher.value).test(labelValue);
        }
        return labelValue === matcher.value;
      });

      if (matches) return true;
    }

    return false;
  }

  private isInMaintenanceWindow(rule: AlertRule): boolean {
    const now = Date.now();
    
    for (const window of Array.from(Array.from(Array.from(Array.from(Array.from(this.maintenanceWindows.values())))))) {
      if (now < window.startsAt || now > window.endsAt) continue;
      if (window.sources.includes(rule.source)) return true;
    }

    return false;
  }

  private interpolateTemplate(template: string, values: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
      const value = this.getNestedValue(values, path);
      return value !== undefined ? String(value) : `{{${path}}}`;
    });
  }

  private async sendNotifications(alert: Alert, channelIds: string[]): Promise<void> {
    if (!this.notificationSender) return;

    for (const channelId of channelIds) {
      try {
        await this.notificationSender(channelId, alert);
        alert.notificationsSent.push({ channel: channelId, sentAt: Date.now() });
      } catch (error) {
        console.error(`Failed to send notification to ${channelId}:`, error);
      }
    }
  }

  private getMockData(source: string): Record<string, unknown> {
    // Mock data for testing
    switch (source) {
      case 'circuit-breaker':
        return { state: 'closed', failures: 0, successes: 100 };
      case 'executor':
        return { errorRate: 5, avgDuration: 100, totalExecutions: 1000 };
      case 'bulkhead':
        return { utilizationPercent: 60, activeCount: 6, queuedCount: 10 };
      case 'rate-limiter':
        return { rejectedCount: 10, allowedCount: 990 };
      case 'storage':
        return { usagePercent: 75, usedBytes: 750000000, totalBytes: 1000000000 };
      default:
        return {};
    }
  }

  // ---------------------------------------------------------------------------
  // ALERT MANAGEMENT
  // ---------------------------------------------------------------------------

  getAlert(id: string): Alert | undefined {
    return this.alerts.get(id);
  }

  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  getFiringAlerts(): Alert[] {
    return Array.from(this.alerts.values()).filter(a => a.state === 'firing');
  }

  acknowledgeAlert(id: string, userId: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert || alert.state !== 'firing') return undefined;

    alert.state = 'acknowledged';
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners();
    return alert;
  }

  resolveAlert(id: string): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    alert.state = 'resolved';
    alert.endsAt = Date.now();

    this.saveToStorage();
    this.notifyListeners();
    return alert;
  }

  silenceAlert(id: string, durationMs: number): Alert | undefined {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    alert.state = 'silenced';
    alert.silencedUntil = Date.now() + durationMs;

    this.saveToStorage();
    this.notifyListeners();
    return alert;
  }

  // ---------------------------------------------------------------------------
  // ESCALATION POLICIES
  // ---------------------------------------------------------------------------

  createEscalationPolicy(policy: Omit<EscalationPolicy, 'id'>): EscalationPolicy {
    const newPolicy: EscalationPolicy = {
      ...policy,
      id: `escalation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this.escalationPolicies.set(newPolicy.id, newPolicy);
    this.saveToStorage();
    this.notifyListeners();
    return newPolicy;
  }

  getEscalationPolicy(id: string): EscalationPolicy | undefined {
    return this.escalationPolicies.get(id);
  }

  getAllEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this.escalationPolicies.values());
  }

  deleteEscalationPolicy(id: string): boolean {
    const result = this.escalationPolicies.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // SILENCE WINDOWS
  // ---------------------------------------------------------------------------

  createSilenceWindow(silence: Omit<SilenceWindow, 'id' | 'createdAt'>): SilenceWindow {
    const newSilence: SilenceWindow = {
      ...silence,
      id: `silence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    this.silenceWindows.set(newSilence.id, newSilence);
    this.saveToStorage();
    this.notifyListeners();
    return newSilence;
  }

  getSilenceWindow(id: string): SilenceWindow | undefined {
    return this.silenceWindows.get(id);
  }

  getAllSilenceWindows(): SilenceWindow[] {
    return Array.from(this.silenceWindows.values());
  }

  getActiveSilenceWindows(): SilenceWindow[] {
    const now = Date.now();
    return Array.from(this.silenceWindows.values()).filter(
      s => now >= s.startsAt && now <= s.endsAt
    );
  }

  deleteSilenceWindow(id: string): boolean {
    const result = this.silenceWindows.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // MAINTENANCE WINDOWS
  // ---------------------------------------------------------------------------

  createMaintenanceWindow(window: Omit<MaintenanceWindow, 'id' | 'createdAt'>): MaintenanceWindow {
    const newWindow: MaintenanceWindow = {
      ...window,
      id: `maintenance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    this.maintenanceWindows.set(newWindow.id, newWindow);
    this.saveToStorage();
    this.notifyListeners();
    return newWindow;
  }

  getMaintenanceWindow(id: string): MaintenanceWindow | undefined {
    return this.maintenanceWindows.get(id);
  }

  getAllMaintenanceWindows(): MaintenanceWindow[] {
    return Array.from(this.maintenanceWindows.values());
  }

  getActiveMaintenanceWindows(): MaintenanceWindow[] {
    const now = Date.now();
    return Array.from(this.maintenanceWindows.values()).filter(
      w => now >= w.startsAt && now <= w.endsAt
    );
  }

  deleteMaintenanceWindow(id: string): boolean {
    const result = this.maintenanceWindows.delete(id);
    if (result) {
      this.saveToStorage();
      this.notifyListeners();
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------

  getStats(): AlertingStats {
    const alerts = Array.from(this.alerts.values());
    const rules = Array.from(this.rules.values());

    const alertsByState: Record<AlertState, number> = {
      pending: 0,
      firing: 0,
      resolved: 0,
      silenced: 0,
      acknowledged: 0,
    };

    const alertsBySeverity: Record<AlertSeverity, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    for (const alert of alerts) {
      alertsByState[alert.state]++;
      alertsBySeverity[alert.severity]++;
    }

    const elapsedMinutes = Math.max(1, (Date.now() - this.evaluationStartTime) / 60000);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      totalAlerts: alerts.length,
      alertsByState,
      alertsBySeverity,
      activeSilences: this.getActiveSilenceWindows().length,
      activeMaintenanceWindows: this.getActiveMaintenanceWindows().length,
      evaluationsPerMinute: this.evaluationCount / elapsedMinutes,
      lastEvaluation: Date.now(),
    };
  }

  // ---------------------------------------------------------------------------
  // PERSISTENCE
  // ---------------------------------------------------------------------------

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem('ligature:alerting-rules');
      if (stored) {
        const data = JSON.parse(stored);
        this.rules = new Map(data.rules?.map((r: AlertRule) => [r.id, r]) || []);
        this.alerts = new Map(data.alerts?.map((a: Alert) => [a.id, a]) || []);
        this.escalationPolicies = new Map(data.escalationPolicies?.map((p: EscalationPolicy) => [p.id, p]) || []);
        this.silenceWindows = new Map(data.silenceWindows?.map((s: SilenceWindow) => [s.id, s]) || []);
        this.maintenanceWindows = new Map(data.maintenanceWindows?.map((m: MaintenanceWindow) => [m.id, m]) || []);

        // Restart evaluation for enabled rules
        for (const rule of Array.from(Array.from(Array.from(Array.from(Array.from(this.rules.values())))))) {
          if (rule.enabled) {
            this.startRuleEvaluation(rule);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load alerting rules:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = {
        rules: Array.from(this.rules.values()),
        alerts: Array.from(this.alerts.values()),
        escalationPolicies: Array.from(this.escalationPolicies.values()),
        silenceWindows: Array.from(this.silenceWindows.values()),
        maintenanceWindows: Array.from(this.maintenanceWindows.values()),
      };
      localStorage.setItem('ligature:alerting-rules', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save alerting rules:', error);
    }
  }

  // ---------------------------------------------------------------------------
  // SUBSCRIPTIONS
  // ---------------------------------------------------------------------------

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of Array.from(this.listeners)) {
      listener();
    }
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  start(): void {
    for (const rule of Array.from(Array.from(Array.from(Array.from(Array.from(this.rules.values())))))) {
      if (rule.enabled) {
        this.startRuleEvaluation(rule);
      }
    }
  }

  stop(): void {
    for (const [ruleId] of Array.from(Array.from(Array.from(Array.from(Array.from(this.evaluationTimers.entries())))))) {
      this.stopRuleEvaluation(ruleId);
    }
  }
}

// Singleton instance
export const alertingRulesEngine = new AlertingRulesEngine();

// =============================================================================
// REACT HOOKS
// =============================================================================

export function useAlertingRules() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertingStats | null>(null);

  useEffect(() => {
    const update = () => {
      setRules(alertingRulesEngine.getAllRules());
      setStats(alertingRulesEngine.getStats());
    };

    update();
    return alertingRulesEngine.subscribe(update);
  }, []);

  const createRule = useCallback((rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    return alertingRulesEngine.createRule(rule);
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<AlertRule>) => {
    return alertingRulesEngine.updateRule(id, updates);
  }, []);

  const deleteRule = useCallback((id: string) => {
    return alertingRulesEngine.deleteRule(id);
  }, []);

  const createFromTemplate = useCallback((index: number, overrides?: Partial<AlertRule>) => {
    return alertingRulesEngine.createRuleFromTemplate(index, overrides);
  }, []);

  return {
    rules,
    stats,
    createRule,
    updateRule,
    deleteRule,
    createFromTemplate,
    templates: RULE_TEMPLATES,
  };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [firingAlerts, setFiringAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    const update = () => {
      setAlerts(alertingRulesEngine.getAllAlerts());
      setFiringAlerts(alertingRulesEngine.getFiringAlerts());
    };

    update();
    return alertingRulesEngine.subscribe(update);
  }, []);

  const acknowledge = useCallback((id: string, userId: string) => {
    return alertingRulesEngine.acknowledgeAlert(id, userId);
  }, []);

  const resolve = useCallback((id: string) => {
    return alertingRulesEngine.resolveAlert(id);
  }, []);

  const silence = useCallback((id: string, durationMs: number) => {
    return alertingRulesEngine.silenceAlert(id, durationMs);
  }, []);

  return {
    alerts,
    firingAlerts,
    acknowledge,
    resolve,
    silence,
  };
}

export function useSilenceWindows() {
  const [silences, setSilences] = useState<SilenceWindow[]>([]);
  const [active, setActive] = useState<SilenceWindow[]>([]);

  useEffect(() => {
    const update = () => {
      setSilences(alertingRulesEngine.getAllSilenceWindows());
      setActive(alertingRulesEngine.getActiveSilenceWindows());
    };

    update();
    return alertingRulesEngine.subscribe(update);
  }, []);

  const create = useCallback((silence: Omit<SilenceWindow, 'id' | 'createdAt'>) => {
    return alertingRulesEngine.createSilenceWindow(silence);
  }, []);

  const remove = useCallback((id: string) => {
    return alertingRulesEngine.deleteSilenceWindow(id);
  }, []);

  return { silences, active, create, remove };
}

export function useMaintenanceWindows() {
  const [windows, setWindows] = useState<MaintenanceWindow[]>([]);
  const [active, setActive] = useState<MaintenanceWindow[]>([]);

  useEffect(() => {
    const update = () => {
      setWindows(alertingRulesEngine.getAllMaintenanceWindows());
      setActive(alertingRulesEngine.getActiveMaintenanceWindows());
    };

    update();
    return alertingRulesEngine.subscribe(update);
  }, []);

  const create = useCallback((window: Omit<MaintenanceWindow, 'id' | 'createdAt'>) => {
    return alertingRulesEngine.createMaintenanceWindow(window);
  }, []);

  const remove = useCallback((id: string) => {
    return alertingRulesEngine.deleteMaintenanceWindow(id);
  }, []);

  return { windows, active, create, remove };
}
