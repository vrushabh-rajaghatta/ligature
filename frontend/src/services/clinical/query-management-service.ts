
/**
 * Query Management Service
 * Data query workflow, auto-query generation, and query metrics
 * @version 0.20.6.1
 * 
 * Provides:
 * - Query creation and assignment
 * - Query response workflow
 * - Auto-query generation from edit checks
 * - Query aging and escalation
 * - Query metrics and reports
 */

import {
  DataQuery,
  QueryStatus,
  QueryType,
  createDataQuery,
} from '@/types/clinical-form';

// ============================================================================
// Service Configuration
// ============================================================================

export interface QueryManagementConfig {
  tenantId: string;
  autoQueryEnabled?: boolean;
  defaultAgingThresholds?: AgingThresholds;
  escalationEnabled?: boolean;
}

// ============================================================================
// Query Types
// ============================================================================

export type QueryPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type QueryCategory =
  | 'DATA_CLARIFICATION'
  | 'MISSING_DATA'
  | 'OUT_OF_RANGE'
  | 'INCONSISTENT_DATA'
  | 'PROTOCOL_DEVIATION'
  | 'SOURCE_VERIFICATION'
  | 'CODING'
  | 'OTHER';

export interface ExtendedQuery extends DataQuery {
  // Extended properties
  priority: QueryPriority;
  category: QueryCategory;
  
  // Assignment
  assignedTo?: string;
  assignedAt?: Date;
  
  // Aging
  ageInDays: number;
  isOverdue: boolean;
  dueDate?: Date;
  
  // Escalation
  escalationLevel: number;
  escalatedAt?: Date;
  escalatedTo?: string;
  
  // Follow-up
  followUpCount: number;
  lastFollowUpAt?: Date;
  
  // Resolution
  resolutionType?: 'CORRECTED' | 'CONFIRMED' | 'NOT_APPLICABLE' | 'WAIVED';
  
  // Metadata
  studyId: string;
  siteId: string;
  subjectId: string;
}

// ============================================================================
// Query Creation
// ============================================================================

export interface CreateQueryParams {
  formInstanceId: string;
  fieldOID: string;
  sectionId: string;
  repeatKey?: string;
  queryType: QueryType;
  queryText: string;
  category: QueryCategory;
  priority?: QueryPriority;
  openedBy: string;
  assignedTo?: string;
  dueDate?: Date;
  studyId: string;
  siteId: string;
  subjectId: string;
}

export interface QueryResponse {
  queryId: string;
  response: string;
  respondedBy: string;
  attachments?: string[];
}

// ============================================================================
// Auto-Query Configuration
// ============================================================================

export interface AutoQueryRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  
  // Trigger
  editCheckId?: string;
  fieldOID?: string;
  condition: string;
  
  // Query template
  queryTextTemplate: string;
  category: QueryCategory;
  priority: QueryPriority;
  
  // Assignment
  autoAssignRole?: string;
  
  // Created
  createdAt: Date;
  createdBy: string;
}

// ============================================================================
// Aging and Escalation
// ============================================================================

export interface AgingThresholds {
  warningDays: number;    // Yellow flag
  overdueDays: number;    // Red flag
  criticalDays: number;   // Escalation trigger
}

export interface EscalationRule {
  id: string;
  name: string;
  level: number;
  triggerDays: number;
  escalateTo: string;  // Role or user ID
  notifyOriginator: boolean;
  isActive: boolean;
}

export interface EscalationEvent {
  queryId: string;
  level: number;
  escalatedAt: Date;
  escalatedTo: string;
  reason: string;
}

// ============================================================================
// Query Filters
// ============================================================================

export interface QueryFilter {
  studyId?: string;
  siteId?: string;
  subjectId?: string;
  formInstanceId?: string;
  fieldOID?: string;
  status?: QueryStatus | QueryStatus[];
  queryType?: QueryType | QueryType[];
  category?: QueryCategory | QueryCategory[];
  priority?: QueryPriority | QueryPriority[];
  assignedTo?: string;
  openedBy?: string;
  isOverdue?: boolean;
  minAge?: number;
  maxAge?: number;
  escalationLevel?: number;
}

// ============================================================================
// Query Metrics
// ============================================================================

export interface QueryMetrics {
  totalQueries: number;
  byStatus: Record<QueryStatus, number>;
  byCategory: Record<QueryCategory, number>;
  byPriority: Record<QueryPriority, number>;
  bySite: Record<string, number>;
  
  // Age metrics
  averageAgeOpen: number;
  averageTimeToClose: number;
  overdueCount: number;
  
  // Response metrics
  averageResponseTime: number;
  reopenRate: number;
  
  // Trend
  openedThisWeek: number;
  closedThisWeek: number;
}

export interface SiteQueryMetrics {
  siteId: string;
  siteName?: string;
  openQueries: number;
  closedQueries: number;
  overdueQueries: number;
  averageAge: number;
  responseRate: number;
}

// ============================================================================
// Query Report
// ============================================================================

export interface QueryReport {
  reportId: string;
  reportType: 'OPEN_QUERIES' | 'AGING' | 'SITE_COMPARISON' | 'TREND';
  generatedAt: Date;
  generatedBy: string;
  filters: QueryFilter;
  metrics: QueryMetrics;
  queries: ExtendedQuery[];
}

// ============================================================================
// Service Interface
// ============================================================================

export interface IQueryManagementService {
  // Query CRUD
  createQuery(params: CreateQueryParams): ExtendedQuery;
  getQuery(queryId: string): ExtendedQuery | undefined;
  listQueries(filter?: QueryFilter): ExtendedQuery[];
  updateQuery(queryId: string, updates: Partial<ExtendedQuery>, userId: string): ExtendedQuery;
  
  // Query Workflow
  respondToQuery(response: QueryResponse): ExtendedQuery;
  closeQuery(queryId: string, closedBy: string, resolutionType: ExtendedQuery['resolutionType']): ExtendedQuery;
  reopenQuery(queryId: string, reopenedBy: string, reason: string): ExtendedQuery;
  cancelQuery(queryId: string, cancelledBy: string, reason: string): ExtendedQuery;
  
  // Assignment
  assignQuery(queryId: string, assignedTo: string, assignedBy: string): ExtendedQuery;
  reassignQuery(queryId: string, newAssignee: string, reassignedBy: string, reason?: string): ExtendedQuery;
  
  // Auto-Query
  addAutoQueryRule(rule: Omit<AutoQueryRule, 'id' | 'createdAt'>): AutoQueryRule;
  updateAutoQueryRule(ruleId: string, updates: Partial<AutoQueryRule>): AutoQueryRule;
  deleteAutoQueryRule(ruleId: string): void;
  listAutoQueryRules(): AutoQueryRule[];
  generateAutoQueries(formInstanceId: string, fieldOID: string, checkResult: { failed: boolean; message?: string }): ExtendedQuery[];
  
  // Aging & Escalation
  setAgingThresholds(thresholds: AgingThresholds): void;
  getAgingThresholds(): AgingThresholds;
  addEscalationRule(rule: Omit<EscalationRule, 'id'>): EscalationRule;
  updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): EscalationRule;
  deleteEscalationRule(ruleId: string): void;
  listEscalationRules(): EscalationRule[];
  processAging(): { aged: number; escalated: number; events: EscalationEvent[] };
  
  // Follow-up
  sendFollowUp(queryId: string, message: string, sentBy: string): void;
  
  // Metrics & Reports
  getMetrics(filter?: QueryFilter): QueryMetrics;
  getSiteMetrics(studyId: string): SiteQueryMetrics[];
  generateReport(reportType: QueryReport['reportType'], filter: QueryFilter, generatedBy: string): QueryReport;
  
  // Bulk Operations
  bulkClose(queryIds: string[], closedBy: string, resolutionType: ExtendedQuery['resolutionType']): { succeeded: number; failed: number };
  bulkAssign(queryIds: string[], assignedTo: string, assignedBy: string): { succeeded: number; failed: number };
}

// ============================================================================
// Service Implementation
// ============================================================================

export class QueryManagementService implements IQueryManagementService {
  private readonly config: Required<QueryManagementConfig>;
  private readonly queries: Map<string, ExtendedQuery> = new Map();
  private readonly autoQueryRules: Map<string, AutoQueryRule> = new Map();
  private readonly escalationRules: Map<string, EscalationRule> = new Map();
  private agingThresholds: AgingThresholds;
  private readonly escalationEvents: EscalationEvent[] = [];
  private readonly followUpHistory: Map<string, Array<{ message: string; sentBy: string; sentAt: Date }>> = new Map();
  
  constructor(config: QueryManagementConfig) {
    this.config = {
      tenantId: config.tenantId,
      autoQueryEnabled: config.autoQueryEnabled ?? true,
      defaultAgingThresholds: config.defaultAgingThresholds ?? {
        warningDays: 3,
        overdueDays: 7,
        criticalDays: 14,
      },
      escalationEnabled: config.escalationEnabled ?? true,
    };
    
    this.agingThresholds = { ...this.config.defaultAgingThresholds };
    this.initializeDefaultEscalationRules();
  }
  
  private initializeDefaultEscalationRules(): void {
    this.addEscalationRule({
      name: 'Level 1 - Site Coordinator',
      level: 1,
      triggerDays: 7,
      escalateTo: 'SITE_COORDINATOR',
      notifyOriginator: true,
      isActive: true,
    });
    
    this.addEscalationRule({
      name: 'Level 2 - CRA',
      level: 2,
      triggerDays: 14,
      escalateTo: 'CRA',
      notifyOriginator: true,
      isActive: true,
    });
    
    this.addEscalationRule({
      name: 'Level 3 - Project Manager',
      level: 3,
      triggerDays: 21,
      escalateTo: 'PROJECT_MANAGER',
      notifyOriginator: true,
      isActive: true,
    });
  }
  
  // --------------------------------------------------------------------------
  // Query CRUD
  // --------------------------------------------------------------------------
  
  createQuery(params: CreateQueryParams): ExtendedQuery {
    const baseQuery = createDataQuery({
      formInstanceId: params.formInstanceId,
      fieldOID: params.fieldOID,
      sectionId: params.sectionId,
      repeatKey: params.repeatKey,
      queryType: params.queryType,
      queryText: params.queryText,
      openedBy: params.openedBy,
    });
    
    const extendedQuery: ExtendedQuery = {
      ...baseQuery,
      queryCategory: params.category,
      priority: params.priority ?? 'NORMAL',
      category: params.category,
      assignedTo: params.assignedTo,
      assignedAt: params.assignedTo ? new Date() : undefined,
      ageInDays: 0,
      isOverdue: false,
      dueDate: params.dueDate,
      escalationLevel: 0,
      followUpCount: 0,
      studyId: params.studyId,
      siteId: params.siteId,
      subjectId: params.subjectId,
    };
    
    this.queries.set(extendedQuery.id, extendedQuery);
    return extendedQuery;
  }
  
  getQuery(queryId: string): ExtendedQuery | undefined {
    const query = this.queries.get(queryId);
    if (query) {
      this.updateQueryAge(query);
    }
    return query;
  }
  
  listQueries(filter?: QueryFilter): ExtendedQuery[] {
    let results = Array.from(this.queries.values());
    
    // Update ages
    results.forEach(q => this.updateQueryAge(q));
    
    if (!filter) return results;
    
    if (filter.studyId) {
      results = results.filter(q => q.studyId === filter.studyId);
    }
    if (filter.siteId) {
      results = results.filter(q => q.siteId === filter.siteId);
    }
    if (filter.subjectId) {
      results = results.filter(q => q.subjectId === filter.subjectId);
    }
    if (filter.formInstanceId) {
      results = results.filter(q => q.formInstanceId === filter.formInstanceId);
    }
    if (filter.fieldOID) {
      results = results.filter(q => q.fieldOID === filter.fieldOID);
    }
    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      results = results.filter(q => statuses.includes(q.status));
    }
    if (filter.queryType) {
      const types = Array.isArray(filter.queryType) ? filter.queryType : [filter.queryType];
      results = results.filter(q => types.includes(q.queryType));
    }
    if (filter.category) {
      const categories = Array.isArray(filter.category) ? filter.category : [filter.category];
      results = results.filter(q => categories.includes(q.category));
    }
    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      results = results.filter(q => priorities.includes(q.priority));
    }
    if (filter.assignedTo) {
      results = results.filter(q => q.assignedTo === filter.assignedTo);
    }
    if (filter.openedBy) {
      results = results.filter(q => q.openedBy === filter.openedBy);
    }
    if (filter.isOverdue !== undefined) {
      results = results.filter(q => q.isOverdue === filter.isOverdue);
    }
    if (filter.minAge !== undefined) {
      results = results.filter(q => q.ageInDays >= filter.minAge!);
    }
    if (filter.maxAge !== undefined) {
      results = results.filter(q => q.ageInDays <= filter.maxAge!);
    }
    if (filter.escalationLevel !== undefined) {
      results = results.filter(q => q.escalationLevel === filter.escalationLevel);
    }
    
    return results;
  }
  
  updateQuery(queryId: string, updates: Partial<ExtendedQuery>, userId: string): ExtendedQuery {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    const updated: ExtendedQuery = {
      ...query,
      ...updates,
      id: query.id,
      updatedAt: new Date(),
    };
    
    this.queries.set(queryId, updated);
    return updated;
  }
  
  private updateQueryAge(query: ExtendedQuery): void {
    if (query.status === 'OPEN' || query.status === 'ANSWERED') {
      const now = new Date();
      const ageMs = now.getTime() - query.openedDate.getTime();
      query.ageInDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
      
      if (query.dueDate) {
        query.isOverdue = now > query.dueDate;
      } else {
        query.isOverdue = query.ageInDays > this.agingThresholds.overdueDays;
      }
    }
  }
  
  // --------------------------------------------------------------------------
  // Query Workflow
  // --------------------------------------------------------------------------
  
  respondToQuery(response: QueryResponse): ExtendedQuery {
    const query = this.queries.get(response.queryId);
    if (!query) {
      throw new Error(`Query not found: ${response.queryId}`);
    }
    
    if (query.status !== 'OPEN') {
      throw new Error(`Query is not open: ${query.status}`);
    }
    
    query.response = response.response;
    query.answeredBy = response.respondedBy;
    query.answeredDate = new Date();
    query.status = 'ANSWERED';
    query.updatedAt = new Date();
    
    return query;
  }
  
  closeQuery(
    queryId: string,
    closedBy: string,
    resolutionType: ExtendedQuery['resolutionType']
  ): ExtendedQuery {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    if (query.status === 'CLOSED' || query.status === 'CANCELLED') {
      throw new Error(`Query is already ${query.status}`);
    }
    
    query.status = 'CLOSED';
    query.closedBy = closedBy;
    query.closedDate = new Date();
    query.resolutionType = resolutionType;
    query.updatedAt = new Date();
    
    return query;
  }
  
  reopenQuery(queryId: string, reopenedBy: string, reason: string): ExtendedQuery {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    if (query.status !== 'CLOSED' && query.status !== 'ANSWERED') {
      throw new Error(`Cannot reopen query with status: ${query.status}`);
    }
    
    query.status = 'OPEN';
    query.closedBy = undefined;
    query.closedDate = undefined;
    query.resolutionType = undefined;
    query.response = undefined;
    query.answeredBy = undefined;
    query.answeredDate = undefined;
    query.updatedAt = new Date();
    query.followUpCount++;
    
    // Add reopen to follow-up history
    this.addFollowUpEntry(queryId, `Query reopened: ${reason}`, reopenedBy);
    
    return query;
  }
  
  cancelQuery(queryId: string, cancelledBy: string, reason: string): ExtendedQuery {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    if (query.status === 'CANCELLED') {
      throw new Error('Query is already cancelled');
    }
    
    query.status = 'CANCELLED';
    query.closedBy = cancelledBy;
    query.closedDate = new Date();
    query.updatedAt = new Date();
    
    // Record reason
    this.addFollowUpEntry(queryId, `Query cancelled: ${reason}`, cancelledBy);
    
    return query;
  }
  
  // --------------------------------------------------------------------------
  // Assignment
  // --------------------------------------------------------------------------
  
  assignQuery(queryId: string, assignedTo: string, assignedBy: string): ExtendedQuery {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    query.assignedTo = assignedTo;
    query.assignedAt = new Date();
    query.updatedAt = new Date();
    
    return query;
  }
  
  reassignQuery(
    queryId: string,
    newAssignee: string,
    reassignedBy: string,
    reason?: string
  ): ExtendedQuery {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    const previousAssignee = query.assignedTo;
    query.assignedTo = newAssignee;
    query.assignedAt = new Date();
    query.updatedAt = new Date();
    
    this.addFollowUpEntry(
      queryId,
      `Reassigned from ${previousAssignee || 'unassigned'} to ${newAssignee}${reason ? `: ${reason}` : ''}`,
      reassignedBy
    );
    
    return query;
  }
  
  // --------------------------------------------------------------------------
  // Auto-Query
  // --------------------------------------------------------------------------
  
  addAutoQueryRule(rule: Omit<AutoQueryRule, 'id' | 'createdAt'>): AutoQueryRule {
    const newRule: AutoQueryRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    
    this.autoQueryRules.set(newRule.id, newRule);
    return newRule;
  }
  
  updateAutoQueryRule(ruleId: string, updates: Partial<AutoQueryRule>): AutoQueryRule {
    const rule = this.autoQueryRules.get(ruleId);
    if (!rule) {
      throw new Error(`Auto-query rule not found: ${ruleId}`);
    }
    
    const updated = { ...rule, ...updates, id: rule.id, createdAt: rule.createdAt };
    this.autoQueryRules.set(ruleId, updated);
    return updated;
  }
  
  deleteAutoQueryRule(ruleId: string): void {
    if (!this.autoQueryRules.has(ruleId)) {
      throw new Error(`Auto-query rule not found: ${ruleId}`);
    }
    this.autoQueryRules.delete(ruleId);
  }
  
  listAutoQueryRules(): AutoQueryRule[] {
    return Array.from(this.autoQueryRules.values());
  }
  
  generateAutoQueries(
    formInstanceId: string,
    fieldOID: string,
    checkResult: { failed: boolean; message?: string }
  ): ExtendedQuery[] {
    if (!this.config.autoQueryEnabled || !checkResult.failed) {
      return [];
    }
    
    const generated: ExtendedQuery[] = [];
    const activeRules = Array.from(this.autoQueryRules.values())
      .filter(r => r.isActive && r.fieldOID === fieldOID);
    
    for (const rule of activeRules) {
      // Check if query already exists for this field
      const existingQuery = Array.from(this.queries.values()).find(
        q => q.formInstanceId === formInstanceId &&
             q.fieldOID === fieldOID &&
             q.queryType === 'AUTO_QUERY' &&
             q.status === 'OPEN'
      );
      
      if (existingQuery) {
        continue; // Don't duplicate
      }
      
      const queryText = rule.queryTextTemplate
        .replace('{fieldOID}', fieldOID)
        .replace('{message}', checkResult.message || 'Validation failed');
      
      // Need form context to create query - use placeholder values
      const query = this.createQuery({
        formInstanceId,
        fieldOID,
        sectionId: 'auto',
        queryType: 'AUTO_QUERY',
        queryText,
        category: rule.category,
        priority: rule.priority,
        openedBy: 'SYSTEM',
        assignedTo: rule.autoAssignRole,
        studyId: 'auto',
        siteId: 'auto',
        subjectId: 'auto',
      });
      
      generated.push(query);
    }
    
    return generated;
  }
  
  // --------------------------------------------------------------------------
  // Aging & Escalation
  // --------------------------------------------------------------------------
  
  setAgingThresholds(thresholds: AgingThresholds): void {
    this.agingThresholds = { ...thresholds };
  }
  
  getAgingThresholds(): AgingThresholds {
    return { ...this.agingThresholds };
  }
  
  addEscalationRule(rule: Omit<EscalationRule, 'id'>): EscalationRule {
    const newRule: EscalationRule = {
      ...rule,
      id: crypto.randomUUID(),
    };
    
    this.escalationRules.set(newRule.id, newRule);
    return newRule;
  }
  
  updateEscalationRule(ruleId: string, updates: Partial<EscalationRule>): EscalationRule {
    const rule = this.escalationRules.get(ruleId);
    if (!rule) {
      throw new Error(`Escalation rule not found: ${ruleId}`);
    }
    
    const updated = { ...rule, ...updates, id: rule.id };
    this.escalationRules.set(ruleId, updated);
    return updated;
  }
  
  deleteEscalationRule(ruleId: string): void {
    if (!this.escalationRules.has(ruleId)) {
      throw new Error(`Escalation rule not found: ${ruleId}`);
    }
    this.escalationRules.delete(ruleId);
  }
  
  listEscalationRules(): EscalationRule[] {
    return Array.from(this.escalationRules.values()).sort((a, b) => a.level - b.level);
  }
  
  processAging(): { aged: number; escalated: number; events: EscalationEvent[] } {
    let aged = 0;
    let escalated = 0;
    const events: EscalationEvent[] = [];
    
    const openQueries = this.listQueries({ status: ['OPEN', 'ANSWERED'] });
    const activeEscalationRules = Array.from(this.escalationRules.values())
      .filter(r => r.isActive)
      .sort((a, b) => a.level - b.level);
    
    for (const query of openQueries) {
      this.updateQueryAge(query);
      aged++;
      
      if (!this.config.escalationEnabled) continue;
      
      // Check for escalation
      for (const rule of activeEscalationRules) {
        if (query.ageInDays >= rule.triggerDays && query.escalationLevel < rule.level) {
          query.escalationLevel = rule.level;
          query.escalatedAt = new Date();
          query.escalatedTo = rule.escalateTo;
          
          const event: EscalationEvent = {
            queryId: query.id,
            level: rule.level,
            escalatedAt: query.escalatedAt,
            escalatedTo: rule.escalateTo,
            reason: `Query age (${query.ageInDays} days) exceeded threshold (${rule.triggerDays} days)`,
          };
          
          events.push(event);
          this.escalationEvents.push(event);
          escalated++;
        }
      }
    }
    
    return { aged, escalated, events };
  }
  
  // --------------------------------------------------------------------------
  // Follow-up
  // --------------------------------------------------------------------------
  
  sendFollowUp(queryId: string, message: string, sentBy: string): void {
    const query = this.queries.get(queryId);
    if (!query) {
      throw new Error(`Query not found: ${queryId}`);
    }
    
    this.addFollowUpEntry(queryId, message, sentBy);
    
    query.followUpCount++;
    query.lastFollowUpAt = new Date();
    query.updatedAt = new Date();
  }
  
  private addFollowUpEntry(queryId: string, message: string, sentBy: string): void {
    if (!this.followUpHistory.has(queryId)) {
      this.followUpHistory.set(queryId, []);
    }
    this.followUpHistory.get(queryId)!.push({
      message,
      sentBy,
      sentAt: new Date(),
    });
  }
  
  // --------------------------------------------------------------------------
  // Metrics & Reports
  // --------------------------------------------------------------------------
  
  getMetrics(filter?: QueryFilter): QueryMetrics {
    const queries = this.listQueries(filter);
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const byStatus: Record<QueryStatus, number> = {
      OPEN: 0,
      ANSWERED: 0,
      CLOSED: 0,
      CANCELLED: 0,
    };
    
    const byCategory: Record<QueryCategory, number> = {
      DATA_CLARIFICATION: 0,
      MISSING_DATA: 0,
      OUT_OF_RANGE: 0,
      INCONSISTENT_DATA: 0,
      PROTOCOL_DEVIATION: 0,
      SOURCE_VERIFICATION: 0,
      CODING: 0,
      OTHER: 0,
    };
    
    const byPriority: Record<QueryPriority, number> = {
      LOW: 0,
      NORMAL: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    
    const bySite: Record<string, number> = {};
    
    let totalAgeOpen = 0;
    let openCount = 0;
    let totalTimeToClose = 0;
    let closedCount = 0;
    let overdueCount = 0;
    let totalResponseTime = 0;
    let respondedCount = 0;
    let reopenCount = 0;
    let openedThisWeek = 0;
    let closedThisWeek = 0;
    
    for (const query of queries) {
      byStatus[query.status]++;
      byCategory[query.category]++;
      byPriority[query.priority]++;
      bySite[query.siteId] = (bySite[query.siteId] || 0) + 1;
      
      if (query.status === 'OPEN' || query.status === 'ANSWERED') {
        totalAgeOpen += query.ageInDays;
        openCount++;
        if (query.isOverdue) overdueCount++;
      }
      
      if (query.status === 'CLOSED' && query.closedDate) {
        const timeToClose = query.closedDate.getTime() - query.openedDate.getTime();
        totalTimeToClose += timeToClose / (1000 * 60 * 60 * 24); // days
        closedCount++;
      }
      
      if (query.answeredDate) {
        const responseTime = query.answeredDate.getTime() - query.openedDate.getTime();
        totalResponseTime += responseTime / (1000 * 60 * 60 * 24); // days
        respondedCount++;
      }
      
      if (query.followUpCount > 1) {
        reopenCount++;
      }
      
      if (query.openedDate >= oneWeekAgo) {
        openedThisWeek++;
      }
      if (query.closedDate && query.closedDate >= oneWeekAgo) {
        closedThisWeek++;
      }
    }
    
    return {
      totalQueries: queries.length,
      byStatus,
      byCategory,
      byPriority,
      bySite,
      averageAgeOpen: openCount > 0 ? totalAgeOpen / openCount : 0,
      averageTimeToClose: closedCount > 0 ? totalTimeToClose / closedCount : 0,
      overdueCount,
      averageResponseTime: respondedCount > 0 ? totalResponseTime / respondedCount : 0,
      reopenRate: queries.length > 0 ? (reopenCount / queries.length) * 100 : 0,
      openedThisWeek,
      closedThisWeek,
    };
  }
  
  getSiteMetrics(studyId: string): SiteQueryMetrics[] {
    const queries = this.listQueries({ studyId });
    const siteMap: Map<string, {
      open: number;
      closed: number;
      overdue: number;
      totalAge: number;
      responded: number;
      total: number;
    }> = new Map();
    
    for (const query of queries) {
      if (!siteMap.has(query.siteId)) {
        siteMap.set(query.siteId, {
          open: 0,
          closed: 0,
          overdue: 0,
          totalAge: 0,
          responded: 0,
          total: 0,
        });
      }
      
      const site = siteMap.get(query.siteId)!;
      site.total++;
      
      if (query.status === 'OPEN' || query.status === 'ANSWERED') {
        site.open++;
        site.totalAge += query.ageInDays;
        if (query.isOverdue) site.overdue++;
      } else if (query.status === 'CLOSED') {
        site.closed++;
      }
      
      if (query.answeredDate) {
        site.responded++;
      }
    }
    
    return Array.from(siteMap.entries()).map(([siteId, data]) => ({
      siteId,
      openQueries: data.open,
      closedQueries: data.closed,
      overdueQueries: data.overdue,
      averageAge: data.open > 0 ? data.totalAge / data.open : 0,
      responseRate: data.total > 0 ? (data.responded / data.total) * 100 : 0,
    }));
  }
  
  generateReport(
    reportType: QueryReport['reportType'],
    filter: QueryFilter,
    generatedBy: string
  ): QueryReport {
    const queries = this.listQueries(filter);
    const metrics = this.getMetrics(filter);
    
    // Apply report-specific filtering
    let reportQueries = queries;
    
    switch (reportType) {
      case 'OPEN_QUERIES':
        reportQueries = queries.filter(q => q.status === 'OPEN' || q.status === 'ANSWERED');
        break;
      case 'AGING':
        reportQueries = queries
          .filter(q => q.status === 'OPEN' || q.status === 'ANSWERED')
          .sort((a, b) => b.ageInDays - a.ageInDays);
        break;
      case 'SITE_COMPARISON':
        // Include all, will be grouped by site in display
        break;
      case 'TREND':
        reportQueries = queries.sort((a, b) => 
          b.openedDate.getTime() - a.openedDate.getTime()
        );
        break;
    }
    
    return {
      reportId: crypto.randomUUID(),
      reportType,
      generatedAt: new Date(),
      generatedBy,
      filters: filter,
      metrics,
      queries: reportQueries,
    };
  }
  
  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------
  
  bulkClose(
    queryIds: string[],
    closedBy: string,
    resolutionType: ExtendedQuery['resolutionType']
  ): { succeeded: number; failed: number } {
    let succeeded = 0;
    let failed = 0;
    
    for (const queryId of queryIds) {
      try {
        this.closeQuery(queryId, closedBy, resolutionType);
        succeeded++;
      } catch {
        failed++;
      }
    }
    
    return { succeeded, failed };
  }
  
  bulkAssign(
    queryIds: string[],
    assignedTo: string,
    assignedBy: string
  ): { succeeded: number; failed: number } {
    let succeeded = 0;
    let failed = 0;
    
    for (const queryId of queryIds) {
      try {
        this.assignQuery(queryId, assignedTo, assignedBy);
        succeeded++;
      } catch {
        failed++;
      }
    }
    
    return { succeeded, failed };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createQueryManagementService(config: QueryManagementConfig): QueryManagementService {
  return new QueryManagementService(config);
}
