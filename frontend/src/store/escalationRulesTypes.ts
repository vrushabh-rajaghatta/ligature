
/**
 * Escalation Rules Types - v0.13.93
 * Type definitions for automated escalation workflow system
 */

// =============================================================================
// CORE ENUMS AND TYPES
// =============================================================================

export type EscalationTriggerType =
  | 'sla-breach'           // Triggered when SLA threshold is breached
  | 'approval-overdue'     // Approval step is past due date
  | 'review-pending'       // Review has been pending too long
  | 'response-overdue'     // HAQ/HA response is overdue
  | 'safety-critical'      // Safety-related item requires attention
  | 'document-stale'       // Document hasn't been updated in threshold period
  | 'submission-deadline'  // Approaching regulatory submission deadline
  | 'quality-issue'        // QMS issue has not been resolved
  | 'custom';              // Custom trigger with user-defined conditions

export type EscalationActionType =
  | 'send-reminder'        // Send reminder to current assignee
  | 'notify-manager'       // Notify direct manager
  | 'notify-department'    // Notify department head
  | 'notify-executive'     // Notify VP/executive level
  | 'notify-custom'        // Notify custom list of users/roles
  | 'auto-reassign'        // Automatically reassign to backup
  | 'flag-critical'        // Flag item as critical priority
  | 'create-incident'      // Create QMS incident/CAPA
  | 'pause-workflow'       // Pause dependent workflows
  | 'webhook';             // Call external webhook

export type EscalationPriority = 'low' | 'medium' | 'high' | 'critical';

export type EscalationStatus = 
  | 'active'               // Rule is actively monitoring
  | 'paused'               // Rule is temporarily paused
  | 'disabled'             // Rule is disabled
  | 'triggered'            // Rule has been triggered (for instances)
  | 'acknowledged'         // Escalation was acknowledged
  | 'resolved';            // Escalation was resolved

export type NotificationChannel = 
  | 'in-app' 
  | 'email' 
  | 'sms' 
  | 'slack' 
  | 'teams' 
  | 'webhook';

export type ModuleScope =
  | 'haq'
  | 'tmf'
  | 'ctms'
  | 'safety'
  | 'regulatory'
  | 'qms'
  | 'document-control'
  | 'submissions'
  | 'all';

export type ApproverRole =
  | 'document-owner'
  | 'department-head'
  | 'medical-director'
  | 'regulatory-lead'
  | 'qa-manager'
  | 'legal-counsel'
  | 'executive-sponsor'
  | 'subject-matter-expert'
  | 'quality-reviewer'
  | 'compliance-officer'
  | 'safety-officer'
  | 'clinical-operations-lead';

// =============================================================================
// WORKING HOURS CONFIGURATION
// =============================================================================

export interface WorkingHoursConfig {
  enabled: boolean;
  timezone: string;
  startHour: number;        // 0-23
  endHour: number;          // 0-23
  workDays: number[];       // 0=Sunday, 1=Monday, etc.
  excludeHolidays: boolean;
  holidays?: string[];      // ISO date strings
}

export const DEFAULT_WORKING_HOURS: WorkingHoursConfig = {
  enabled: true,
  timezone: 'America/New_York',
  startHour: 9,
  endHour: 17,
  workDays: [1, 2, 3, 4, 5], // Monday-Friday
  excludeHolidays: true,
  holidays: [],
};

// =============================================================================
// ESCALATION TIER
// =============================================================================

export interface EscalationTier {
  id: string;
  tier: number;             // 1, 2, 3, etc.
  name: string;
  description: string;
  triggerAfterHours: number;
  actions: EscalationActionType[];
  notifyRoles: ApproverRole[];
  notifyUserIds: string[];
  notificationChannels: NotificationChannel[];
  requiresAcknowledgment: boolean;
  autoReassignToUserId?: string;
  autoReassignToRole?: ApproverRole;
  webhookUrl?: string;
  messageTemplate?: string;
}

// =============================================================================
// ESCALATION RULE
// =============================================================================

export interface EscalationRule {
  id: string;
  name: string;
  description: string;
  triggerType: EscalationTriggerType;
  moduleScope: ModuleScope[];
  priority: EscalationPriority;
  status: EscalationStatus;
  
  // Trigger conditions
  thresholdHours: number;           // Hours before first escalation
  conditions?: EscalationCondition[];
  
  // Escalation tiers (progressive escalation)
  tiers: EscalationTier[];
  
  // Working hours
  workingHoursConfig: WorkingHoursConfig;
  
  // Metadata
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  
  // Statistics
  timesTriggered: number;
  lastTriggeredAt?: string;
}

export interface EscalationCondition {
  field: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in';
  value: string | number | string[];
}

// =============================================================================
// ESCALATION INSTANCE (Active Escalation)
// =============================================================================

export interface EscalationInstance {
  id: string;
  ruleId: string;
  ruleName: string;
  
  // Source item
  sourceModule: ModuleScope;
  sourceItemId: string;
  sourceItemType: string;
  sourceItemName: string;
  
  // Status tracking
  status: EscalationStatus;
  currentTier: number;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  
  // Notifications sent
  notificationsSent: EscalationNotification[];
  
  // Timing
  hoursOverdue: number;
  nextEscalationAt?: string;
}

export interface EscalationNotification {
  id: string;
  instanceId: string;
  tier: number;
  channel: NotificationChannel;
  recipientType: 'user' | 'role';
  recipientId: string;
  recipientName: string;
  sentAt: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  messageContent: string;
}

// =============================================================================
// ESCALATION HISTORY
// =============================================================================

export interface EscalationHistoryEntry {
  id: string;
  instanceId: string;
  ruleId: string;
  ruleName: string;
  action: 'triggered' | 'tier-escalated' | 'notification-sent' | 'acknowledged' | 'resolved' | 'auto-reassigned';
  tier?: number;
  timestamp: string;
  performedBy?: string;
  details: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// RULE TEMPLATES
// =============================================================================

export interface EscalationRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: 'regulatory' | 'safety' | 'quality' | 'clinical' | 'general';
  triggerType: EscalationTriggerType;
  moduleScope: ModuleScope[];
  suggestedThresholdHours: number;
  suggestedTiers: Omit<EscalationTier, 'id'>[];
  workingHoursConfig: WorkingHoursConfig;
}

// =============================================================================
// STORE STATE
// =============================================================================

export interface EscalationRulesState {
  // Rules
  rules: EscalationRule[];
  
  // Active instances
  activeInstances: EscalationInstance[];
  
  // History
  history: EscalationHistoryEntry[];
  
  // Templates
  templates: EscalationRuleTemplate[];
  
  // UI State
  selectedRuleId: string | null;
  selectedInstanceId: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface EscalationRulesActions {
  // Rule CRUD
  createRule: (rule: Omit<EscalationRule, 'id' | 'createdAt' | 'updatedAt' | 'timesTriggered'>) => EscalationRule;
  updateRule: (id: string, updates: Partial<EscalationRule>) => void;
  deleteRule: (id: string) => void;
  duplicateRule: (id: string) => EscalationRule | null;
  
  // Rule status
  toggleRuleStatus: (id: string) => void;
  pauseRule: (id: string) => void;
  activateRule: (id: string) => void;
  
  // Tier management
  addTierToRule: (ruleId: string, tier: Omit<EscalationTier, 'id'>) => void;
  updateTier: (ruleId: string, tierId: string, updates: Partial<EscalationTier>) => void;
  removeTierFromRule: (ruleId: string, tierId: string) => void;
  
  // Instance management
  triggerEscalation: (ruleId: string, sourceModule: ModuleScope, sourceItemId: string, sourceItemType: string, sourceItemName: string) => EscalationInstance;
  acknowledgeEscalation: (instanceId: string, userId: string) => void;
  resolveEscalation: (instanceId: string, userId: string, notes?: string) => void;
  escalateToNextTier: (instanceId: string) => void;
  
  // Notifications
  recordNotification: (instanceId: string, notification: Omit<EscalationNotification, 'id'>) => void;
  acknowledgeNotification: (instanceId: string, notificationId: string) => void;
  
  // History
  addHistoryEntry: (entry: Omit<EscalationHistoryEntry, 'id' | 'timestamp'>) => void;
  getHistoryForInstance: (instanceId: string) => EscalationHistoryEntry[];
  getHistoryForRule: (ruleId: string) => EscalationHistoryEntry[];
  
  // Template operations
  createRuleFromTemplate: (templateId: string, overrides?: Partial<EscalationRule>) => EscalationRule | null;
  
  // Working hours calculation
  calculateWorkingHours: (startDate: Date, endDate: Date, config: WorkingHoursConfig) => number;
  isWithinWorkingHours: (date: Date, config: WorkingHoursConfig) => boolean;
  getNextWorkingHour: (date: Date, config: WorkingHoursConfig) => Date;
  
  // Queries
  getRuleById: (id: string) => EscalationRule | undefined;
  getActiveInstancesForRule: (ruleId: string) => EscalationInstance[];
  getInstancesForSourceItem: (sourceItemId: string) => EscalationInstance[];
  getInstanceById: (instanceId: string) => EscalationInstance | undefined;
  getRulesByModule: (module: ModuleScope) => EscalationRule[];
  getOverdueInstances: () => EscalationInstance[];
  
  // UI State
  setSelectedRuleId: (id: string | null) => void;
  setSelectedInstanceId: (id: string | null) => void;
  setError: (error: string | null) => void;
  
  // Bulk operations
  importRules: (rules: EscalationRule[]) => void;
  exportRules: () => EscalationRule[];
  clearAllInstances: () => void;
  
  // Testing
  reset: () => void;
}

export type EscalationRulesStore = EscalationRulesState & EscalationRulesActions;
