

/**
 * Escalation Rules Store - v0.13.93
 * Zustand store for managing automated escalation workflows
 */

import { create } from 'zustand';
import {
  EscalationRulesStore,
  EscalationRule,
  EscalationTier,
  EscalationInstance,
  EscalationNotification,
  EscalationHistoryEntry,
  EscalationRuleTemplate,
  WorkingHoursConfig,
  ModuleScope,
  DEFAULT_WORKING_HOURS,
} from './escalationRulesTypes';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const now = (): string => new Date().toISOString();

// =============================================================================
// DEFAULT RULE TEMPLATES
// =============================================================================

const DEFAULT_TEMPLATES: EscalationRuleTemplate[] = [
  {
    id: 'template-haq-response',
    name: 'HAQ Response Overdue',
    description: 'Escalation for Health Authority Questions that are approaching or past their response deadline',
    category: 'regulatory',
    triggerType: 'response-overdue',
    moduleScope: ['haq'],
    suggestedThresholdHours: 48,
    suggestedTiers: [
      {
        tier: 1,
        name: 'Initial Reminder',
        description: 'Reminder sent to HAQ owner',
        triggerAfterHours: 48,
        actions: ['send-reminder'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        tier: 2,
        name: 'Regulatory Lead Notification',
        description: 'Regulatory lead notified of delay',
        triggerAfterHours: 72,
        actions: ['notify-manager', 'flag-critical'],
        notifyRoles: ['regulatory-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
      {
        tier: 3,
        name: 'Executive Escalation',
        description: 'Executive sponsor alerted - submission at risk',
        triggerAfterHours: 96,
        actions: ['notify-executive', 'flag-critical'],
        notifyRoles: ['executive-sponsor', 'regulatory-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
  },
  {
    id: 'template-safety-review',
    name: 'Safety Case Review Overdue',
    description: 'Escalation for safety/pharmacovigilance cases requiring urgent medical review',
    category: 'safety',
    triggerType: 'safety-critical',
    moduleScope: ['safety'],
    suggestedThresholdHours: 24,
    suggestedTiers: [
      {
        tier: 1,
        name: 'Medical Reviewer Alert',
        description: 'Alert sent to assigned medical reviewer',
        triggerAfterHours: 24,
        actions: ['send-reminder', 'flag-critical'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms'],
        requiresAcknowledgment: true,
      },
      {
        tier: 2,
        name: 'Medical Director Escalation',
        description: 'Medical Director notified - regulatory timeline at risk',
        triggerAfterHours: 36,
        actions: ['notify-manager', 'auto-reassign'],
        notifyRoles: ['medical-director', 'safety-officer'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms'],
        requiresAcknowledgment: true,
        autoReassignToRole: 'medical-director',
      },
      {
        tier: 3,
        name: 'Critical Safety Alert',
        description: 'Executive and compliance notified - potential regulatory breach',
        triggerAfterHours: 48,
        actions: ['notify-executive', 'create-incident'],
        notifyRoles: ['executive-sponsor', 'compliance-officer'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: { ...DEFAULT_WORKING_HOURS, enabled: false }, // 24/7 for safety
  },
  {
    id: 'template-document-approval',
    name: 'Document Approval Overdue',
    description: 'Escalation for document approvals exceeding SLA',
    category: 'quality',
    triggerType: 'approval-overdue',
    moduleScope: ['document-control', 'qms'],
    suggestedThresholdHours: 72,
    suggestedTiers: [
      {
        tier: 1,
        name: 'Approver Reminder',
        description: 'Reminder sent to pending approver',
        triggerAfterHours: 72,
        actions: ['send-reminder'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        tier: 2,
        name: 'Department Head Alert',
        description: 'Department head notified of approval delay',
        triggerAfterHours: 96,
        actions: ['notify-department'],
        notifyRoles: ['department-head'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: true,
      },
      {
        tier: 3,
        name: 'QA Manager Escalation',
        description: 'QA Manager involved - document release delayed',
        triggerAfterHours: 120,
        actions: ['notify-manager', 'flag-critical'],
        notifyRoles: ['qa-manager', 'department-head'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
  },
  {
    id: 'template-submission-deadline',
    name: 'Submission Deadline Approaching',
    description: 'Escalation as regulatory submission deadlines approach',
    category: 'regulatory',
    triggerType: 'submission-deadline',
    moduleScope: ['submissions', 'regulatory'],
    suggestedThresholdHours: 168, // 7 days
    suggestedTiers: [
      {
        tier: 1,
        name: '7-Day Warning',
        description: 'Submission team reminded of approaching deadline',
        triggerAfterHours: 168,
        actions: ['send-reminder'],
        notifyRoles: ['regulatory-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        tier: 2,
        name: '3-Day Alert',
        description: 'Department heads notified - final preparation phase',
        triggerAfterHours: 240, // 10 days from threshold = 3 days to deadline
        actions: ['notify-department', 'flag-critical'],
        notifyRoles: ['regulatory-lead', 'department-head'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
      {
        tier: 3,
        name: '24-Hour Critical',
        description: 'Executive escalation - submission at immediate risk',
        triggerAfterHours: 288, // 12 days = 1 day to deadline
        actions: ['notify-executive', 'flag-critical'],
        notifyRoles: ['executive-sponsor', 'regulatory-lead', 'qa-manager'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
  },
  {
    id: 'template-tmf-artifact',
    name: 'TMF Artifact Missing',
    description: 'Escalation for missing or incomplete TMF artifacts approaching milestone',
    category: 'clinical',
    triggerType: 'document-stale',
    moduleScope: ['tmf', 'ctms'],
    suggestedThresholdHours: 120, // 5 days
    suggestedTiers: [
      {
        tier: 1,
        name: 'Document Owner Reminder',
        description: 'Reminder to upload or complete TMF artifact',
        triggerAfterHours: 120,
        actions: ['send-reminder'],
        notifyRoles: ['document-owner'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        tier: 2,
        name: 'Clinical Ops Alert',
        description: 'Clinical operations lead notified',
        triggerAfterHours: 168,
        actions: ['notify-manager'],
        notifyRoles: ['clinical-operations-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: true,
      },
      {
        tier: 3,
        name: 'Inspection Readiness Risk',
        description: 'QA and compliance notified - inspection readiness impacted',
        triggerAfterHours: 240,
        actions: ['notify-manager', 'create-incident', 'flag-critical'],
        notifyRoles: ['qa-manager', 'compliance-officer'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
  },
  {
    id: 'template-quality-issue',
    name: 'QMS Issue Unresolved',
    description: 'Escalation for quality issues (deviations, CAPAs) exceeding resolution timeline',
    category: 'quality',
    triggerType: 'quality-issue',
    moduleScope: ['qms'],
    suggestedThresholdHours: 240, // 10 days
    suggestedTiers: [
      {
        tier: 1,
        name: 'Owner Reminder',
        description: 'Reminder to issue owner for resolution',
        triggerAfterHours: 240,
        actions: ['send-reminder'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        tier: 2,
        name: 'QA Review',
        description: 'QA manager reviews delayed issue',
        triggerAfterHours: 336, // 14 days
        actions: ['notify-manager'],
        notifyRoles: ['qa-manager'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: true,
      },
      {
        tier: 3,
        name: 'Compliance Escalation',
        description: 'Compliance officer involved - regulatory risk assessment',
        triggerAfterHours: 480, // 20 days
        actions: ['notify-manager', 'flag-critical'],
        notifyRoles: ['compliance-officer', 'executive-sponsor'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
  },
];

// =============================================================================
// DEMO RULES (Initial data for UI demonstration)
// =============================================================================

const DEMO_RULES: EscalationRule[] = [
  {
    id: 'rule-demo-haq-response',
    name: 'HAQ Response Overdue',
    description: 'Automatically escalate when Health Authority Question responses exceed their SLA deadline',
    triggerType: 'response-overdue',
    moduleScope: ['haq'],
    priority: 'high',
    status: 'active',
    thresholdHours: 48,
    tiers: [
      {
        id: 'tier-haq-1',
        tier: 1,
        name: 'Initial Reminder',
        description: 'Reminder sent to HAQ owner',
        triggerAfterHours: 48,
        actions: ['send-reminder'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        id: 'tier-haq-2',
        tier: 2,
        name: 'Regulatory Lead Alert',
        description: 'Regulatory lead notified of delay',
        triggerAfterHours: 72,
        actions: ['notify-manager', 'flag-critical'],
        notifyRoles: ['regulatory-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
      {
        id: 'tier-haq-3',
        tier: 3,
        name: 'Executive Escalation',
        description: 'Executive sponsor alerted - submission at risk',
        triggerAfterHours: 96,
        actions: ['notify-executive', 'flag-critical'],
        notifyRoles: ['executive-sponsor', 'regulatory-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
    createdAt: '2025-12-01T10:00:00Z',
    createdBy: 'system',
    updatedAt: '2025-12-15T14:30:00Z',
    updatedBy: 'admin',
    timesTriggered: 12,
    lastTriggeredAt: '2026-01-06T09:15:00Z',
  },
  {
    id: 'rule-demo-safety-critical',
    name: 'Safety Case Review Critical',
    description: 'Urgent escalation for safety/pharmacovigilance cases requiring immediate medical review',
    triggerType: 'safety-critical',
    moduleScope: ['safety'],
    priority: 'critical',
    status: 'active',
    thresholdHours: 24,
    tiers: [
      {
        id: 'tier-safety-1',
        tier: 1,
        name: 'Medical Reviewer Alert',
        description: 'Alert sent to assigned medical reviewer',
        triggerAfterHours: 24,
        actions: ['send-reminder', 'flag-critical'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms'],
        requiresAcknowledgment: true,
      },
      {
        id: 'tier-safety-2',
        tier: 2,
        name: 'Medical Director Escalation',
        description: 'Medical Director notified - regulatory timeline at risk',
        triggerAfterHours: 36,
        actions: ['notify-manager', 'auto-reassign'],
        notifyRoles: ['medical-director', 'safety-officer'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms'],
        requiresAcknowledgment: true,
        autoReassignToRole: 'medical-director',
      },
      {
        id: 'tier-safety-3',
        tier: 3,
        name: 'Critical Safety Alert',
        description: 'Executive and compliance notified - potential regulatory breach',
        triggerAfterHours: 48,
        actions: ['notify-executive', 'create-incident'],
        notifyRoles: ['executive-sponsor', 'compliance-officer'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: { ...DEFAULT_WORKING_HOURS, enabled: false }, // 24/7 for safety
    createdAt: '2025-11-15T08:00:00Z',
    createdBy: 'system',
    updatedAt: '2025-12-20T11:45:00Z',
    updatedBy: 'safety-admin',
    timesTriggered: 8,
    lastTriggeredAt: '2026-01-07T16:30:00Z',
  },
  {
    id: 'rule-demo-doc-approval',
    name: 'Document Approval SLA',
    description: 'Escalation for document approvals exceeding standard review timeline',
    triggerType: 'approval-overdue',
    moduleScope: ['document-control', 'qms'],
    priority: 'medium',
    status: 'active',
    thresholdHours: 72,
    tiers: [
      {
        id: 'tier-doc-1',
        tier: 1,
        name: 'Approver Reminder',
        description: 'Reminder sent to pending approver',
        triggerAfterHours: 72,
        actions: ['send-reminder'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        id: 'tier-doc-2',
        tier: 2,
        name: 'Department Head Alert',
        description: 'Department head notified of approval delay',
        triggerAfterHours: 96,
        actions: ['notify-department'],
        notifyRoles: ['department-head'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: true,
      },
      {
        id: 'tier-doc-3',
        tier: 3,
        name: 'QA Manager Escalation',
        description: 'QA Manager involved - document release delayed',
        triggerAfterHours: 120,
        actions: ['notify-manager', 'flag-critical'],
        notifyRoles: ['qa-manager', 'department-head'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
    createdAt: '2025-12-05T09:00:00Z',
    createdBy: 'qa-admin',
    updatedAt: '2025-12-28T10:00:00Z',
    updatedBy: 'qa-admin',
    timesTriggered: 23,
    lastTriggeredAt: '2026-01-08T08:00:00Z',
  },
  {
    id: 'rule-demo-tmf-missing',
    name: 'TMF Artifact Missing',
    description: 'Escalation for missing or incomplete Trial Master File artifacts before milestone',
    triggerType: 'document-stale',
    moduleScope: ['tmf', 'ctms'],
    priority: 'high',
    status: 'active',
    thresholdHours: 120,
    tiers: [
      {
        id: 'tier-tmf-1',
        tier: 1,
        name: 'Document Owner Reminder',
        description: 'Reminder to upload or complete TMF artifact',
        triggerAfterHours: 120,
        actions: ['send-reminder'],
        notifyRoles: ['document-owner'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        id: 'tier-tmf-2',
        tier: 2,
        name: 'Clinical Ops Alert',
        description: 'Clinical operations lead notified',
        triggerAfterHours: 168,
        actions: ['notify-manager'],
        notifyRoles: ['clinical-operations-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: true,
      },
      {
        id: 'tier-tmf-3',
        tier: 3,
        name: 'Inspection Readiness Risk',
        description: 'QA and compliance notified - inspection readiness impacted',
        triggerAfterHours: 240,
        actions: ['notify-manager', 'create-incident', 'flag-critical'],
        notifyRoles: ['qa-manager', 'compliance-officer'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
    createdAt: '2025-11-20T14:00:00Z',
    createdBy: 'clinical-admin',
    updatedAt: '2026-01-02T09:30:00Z',
    updatedBy: 'clinical-admin',
    timesTriggered: 5,
    lastTriggeredAt: '2026-01-05T11:00:00Z',
  },
  {
    id: 'rule-demo-submission-deadline',
    name: 'Submission Deadline Warning',
    description: 'Progressive escalation as regulatory submission deadlines approach',
    triggerType: 'submission-deadline',
    moduleScope: ['submissions', 'regulatory'],
    priority: 'critical',
    status: 'paused',
    thresholdHours: 168,
    tiers: [
      {
        id: 'tier-sub-1',
        tier: 1,
        name: '7-Day Warning',
        description: 'Submission team reminded of approaching deadline',
        triggerAfterHours: 168,
        actions: ['send-reminder'],
        notifyRoles: ['regulatory-lead'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        id: 'tier-sub-2',
        tier: 2,
        name: '3-Day Alert',
        description: 'Department heads notified - final preparation phase',
        triggerAfterHours: 240,
        actions: ['notify-department', 'flag-critical'],
        notifyRoles: ['regulatory-lead', 'department-head'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'slack'],
        requiresAcknowledgment: true,
      },
      {
        id: 'tier-sub-3',
        tier: 3,
        name: '24-Hour Critical',
        description: 'Executive escalation - submission at immediate risk',
        triggerAfterHours: 288,
        actions: ['notify-executive', 'flag-critical'],
        notifyRoles: ['executive-sponsor', 'regulatory-lead', 'qa-manager'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email', 'sms', 'slack'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
    createdAt: '2025-10-01T10:00:00Z',
    createdBy: 'reg-admin',
    updatedAt: '2026-01-03T16:00:00Z',
    updatedBy: 'reg-admin',
    timesTriggered: 3,
    lastTriggeredAt: '2025-12-15T14:00:00Z',
  },
  {
    id: 'rule-demo-qms-issue',
    name: 'QMS Issue Unresolved',
    description: 'Escalation for quality issues (deviations, CAPAs) exceeding resolution timeline',
    triggerType: 'quality-issue',
    moduleScope: ['qms'],
    priority: 'medium',
    status: 'disabled',
    thresholdHours: 240,
    tiers: [
      {
        id: 'tier-qms-1',
        tier: 1,
        name: 'Owner Reminder',
        description: 'Reminder to issue owner for resolution',
        triggerAfterHours: 240,
        actions: ['send-reminder'],
        notifyRoles: [],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: false,
      },
      {
        id: 'tier-qms-2',
        tier: 2,
        name: 'QA Review',
        description: 'QA manager reviews delayed issue',
        triggerAfterHours: 336,
        actions: ['notify-manager'],
        notifyRoles: ['qa-manager'],
        notifyUserIds: [],
        notificationChannels: ['in-app', 'email'],
        requiresAcknowledgment: true,
      },
    ],
    workingHoursConfig: DEFAULT_WORKING_HOURS,
    createdAt: '2025-12-10T11:00:00Z',
    createdBy: 'qa-admin',
    updatedAt: '2025-12-10T11:00:00Z',
    updatedBy: 'qa-admin',
    timesTriggered: 0,
  },
];

// =============================================================================
// WORKING HOURS UTILITIES
// =============================================================================

const isWorkDay = (date: Date, config: WorkingHoursConfig): boolean => {
  const dayOfWeek = date.getDay();
  return config.workDays.includes(dayOfWeek);
};

const isHoliday = (date: Date, config: WorkingHoursConfig): boolean => {
  if (!config.excludeHolidays || !config.holidays) return false;
  const dateStr = date.toISOString().split('T')[0];
  return config.holidays.includes(dateStr);
};

const isWithinWorkingHoursImpl = (date: Date, config: WorkingHoursConfig): boolean => {
  if (!config.enabled) return true;
  
  const hours = date.getHours();
  const isInHours = hours >= config.startHour && hours < config.endHour;
  const isWorkingDay = isWorkDay(date, config) && !isHoliday(date, config);
  
  return isInHours && isWorkingDay;
};

const getNextWorkingHourImpl = (date: Date, config: WorkingHoursConfig): Date => {
  if (!config.enabled) return date;
  
  const result = new Date(date);
  
  // If already in working hours, return as-is
  if (isWithinWorkingHoursImpl(result, config)) {
    return result;
  }
  
  // Move to next working day/hour
  let iterations = 0;
  const maxIterations = 14 * 24; // Max 2 weeks of hours
  
  while (!isWithinWorkingHoursImpl(result, config) && iterations < maxIterations) {
    result.setHours(result.getHours() + 1);
    
    // If past end of day, move to start of next day
    if (result.getHours() >= config.endHour) {
      result.setDate(result.getDate() + 1);
      result.setHours(config.startHour, 0, 0, 0);
    }
    
    // If before start of day, move to start hour
    if (result.getHours() < config.startHour) {
      result.setHours(config.startHour, 0, 0, 0);
    }
    
    iterations++;
  }
  
  return result;
};

const calculateWorkingHoursImpl = (
  startDate: Date,
  endDate: Date,
  config: WorkingHoursConfig
): number => {
  if (!config.enabled) {
    // If working hours not enabled, return total hours
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  }
  
  let workingHours = 0;
  const current = new Date(startDate);
  const hoursPerDay = config.endHour - config.startHour;
  
  // Iterate day by day
  while (current < endDate) {
    if (isWorkDay(current, config) && !isHoliday(current, config)) {
      const dayStart = new Date(current);
      dayStart.setHours(config.startHour, 0, 0, 0);
      
      const dayEnd = new Date(current);
      dayEnd.setHours(config.endHour, 0, 0, 0);
      
      // Calculate overlap with working hours
      const effectiveStart = new Date(Math.max(startDate.getTime(), dayStart.getTime()));
      const effectiveEnd = new Date(Math.min(endDate.getTime(), dayEnd.getTime()));
      
      if (effectiveEnd > effectiveStart) {
        const hoursThisDay = (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
        workingHours += Math.min(hoursThisDay, hoursPerDay);
      }
    }
    
    // Move to next day
    current.setDate(current.getDate() + 1);
    current.setHours(0, 0, 0, 0);
  }
  
  return workingHours;
};

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useEscalationRulesStore = create<EscalationRulesStore>((set, get) => ({
  // ==========================================================================
  // STATE
  // ==========================================================================
  rules: DEMO_RULES,
  activeInstances: [],
  history: [],
  templates: DEFAULT_TEMPLATES,
  selectedRuleId: null,
  selectedInstanceId: null,
  isLoading: false,
  error: null,

  // ==========================================================================
  // RULE CRUD
  // ==========================================================================
  createRule: (ruleData) => {
    const newRule: EscalationRule = {
      ...ruleData,
      id: generateId('rule'),
      createdAt: now(),
      updatedAt: now(),
      timesTriggered: 0,
    };
    
    set((state) => ({
      rules: [...state.rules, newRule],
    }));
    
    return newRule;
  },

  updateRule: (id, updates) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === id
          ? { ...rule, ...updates, updatedAt: now() }
          : rule
      ),
    }));
  },

  deleteRule: (id) => {
    set((state) => ({
      rules: state.rules.filter((rule) => rule.id !== id),
      selectedRuleId: state.selectedRuleId === id ? null : state.selectedRuleId,
    }));
  },

  duplicateRule: (id) => {
    const state = get();
    const original = state.rules.find((r) => r.id === id);
    if (!original) return null;
    
    const duplicate: EscalationRule = {
      ...original,
      id: generateId('rule'),
      name: `${original.name} (Copy)`,
      status: 'disabled',
      createdAt: now(),
      updatedAt: now(),
      timesTriggered: 0,
      lastTriggeredAt: undefined,
      tiers: original.tiers.map((tier) => ({
        ...tier,
        id: generateId('tier'),
      })),
    };
    
    set((state) => ({
      rules: [...state.rules, duplicate],
    }));
    
    return duplicate;
  },

  // ==========================================================================
  // RULE STATUS
  // ==========================================================================
  toggleRuleStatus: (id) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === id
          ? {
              ...rule,
              status: rule.status === 'active' ? 'paused' : 'active',
              updatedAt: now(),
            }
          : rule
      ),
    }));
  },

  pauseRule: (id) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === id
          ? { ...rule, status: 'paused', updatedAt: now() }
          : rule
      ),
    }));
  },

  activateRule: (id) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === id
          ? { ...rule, status: 'active', updatedAt: now() }
          : rule
      ),
    }));
  },

  // ==========================================================================
  // TIER MANAGEMENT
  // ==========================================================================
  addTierToRule: (ruleId, tierData) => {
    const newTier: EscalationTier = {
      ...tierData,
      id: generateId('tier'),
    };
    
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              tiers: [...rule.tiers, newTier].sort((a, b) => a.tier - b.tier),
              updatedAt: now(),
            }
          : rule
      ),
    }));
  },

  updateTier: (ruleId, tierId, updates) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              tiers: rule.tiers.map((tier) =>
                tier.id === tierId ? { ...tier, ...updates } : tier
              ),
              updatedAt: now(),
            }
          : rule
      ),
    }));
  },

  removeTierFromRule: (ruleId, tierId) => {
    set((state) => ({
      rules: state.rules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              tiers: rule.tiers.filter((tier) => tier.id !== tierId),
              updatedAt: now(),
            }
          : rule
      ),
    }));
  },

  // ==========================================================================
  // INSTANCE MANAGEMENT
  // ==========================================================================
  triggerEscalation: (ruleId, sourceModule, sourceItemId, sourceItemType, sourceItemName) => {
    const state = get();
    const rule = state.rules.find((r) => r.id === ruleId);
    
    const instance: EscalationInstance = {
      id: generateId('esc'),
      ruleId,
      ruleName: rule?.name || 'Unknown Rule',
      sourceModule,
      sourceItemId,
      sourceItemType,
      sourceItemName,
      status: 'triggered',
      currentTier: 1,
      triggeredAt: now(),
      hoursOverdue: 0,
      notificationsSent: [],
    };
    
    set((state) => ({
      activeInstances: [...state.activeInstances, instance],
      rules: state.rules.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              timesTriggered: r.timesTriggered + 1,
              lastTriggeredAt: now(),
            }
          : r
      ),
    }));
    
    // Add history entry
    get().addHistoryEntry({
      instanceId: instance.id,
      ruleId,
      ruleName: rule?.name || 'Unknown Rule',
      action: 'triggered',
      tier: 1,
      details: `Escalation triggered for ${sourceItemType}: ${sourceItemName}`,
    });
    
    return instance;
  },

  acknowledgeEscalation: (instanceId, userId) => {
    // Guard: Check if already acknowledged
    const existingInstance = get().activeInstances.find((i) => i.id === instanceId);
    if (!existingInstance || existingInstance.status === 'acknowledged' || existingInstance.status === 'resolved') {
      return; // Already acknowledged or resolved - no-op
    }
    
    set((state) => ({
      activeInstances: state.activeInstances.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              status: 'acknowledged',
              acknowledgedAt: now(),
              acknowledgedBy: userId,
            }
          : inst
      ),
    }));
    
    const instance = get().activeInstances.find((i) => i.id === instanceId);
    if (instance) {
      get().addHistoryEntry({
        instanceId,
        ruleId: instance.ruleId,
        ruleName: instance.ruleName,
        action: 'acknowledged',
        performedBy: userId,
        details: `Escalation acknowledged by user ${userId}`,
      });
    }
  },

  resolveEscalation: (instanceId, userId, notes) => {
    // Guard: Check if already resolved
    const existingInstance = get().activeInstances.find((i) => i.id === instanceId);
    if (!existingInstance || existingInstance.status === 'resolved') {
      return; // Already resolved - no-op
    }
    
    set((state) => ({
      activeInstances: state.activeInstances.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              status: 'resolved',
              resolvedAt: now(),
              resolvedBy: userId,
              resolutionNotes: notes,
            }
          : inst
      ),
    }));
    
    const instance = get().activeInstances.find((i) => i.id === instanceId);
    if (instance) {
      get().addHistoryEntry({
        instanceId,
        ruleId: instance.ruleId,
        ruleName: instance.ruleName,
        action: 'resolved',
        performedBy: userId,
        details: notes || `Escalation resolved by user ${userId}`,
      });
    }
  },

  escalateToNextTier: (instanceId) => {
    const state = get();
    const instance = state.activeInstances.find((i) => i.id === instanceId);
    if (!instance) return;
    
    // Guard: Don't escalate resolved instances
    if (instance.status === 'resolved') return;
    
    const nextTier = instance.currentTier + 1;
    
    // Check if rule has explicit tiers defined
    const rule = state.rules.find((r) => r.id === instance.ruleId);
    const hasExplicitTiers = rule?.tiers && rule.tiers.length > 0;
    
    // If rule has tiers, check if next tier exists; otherwise allow up to tier 3
    if (hasExplicitTiers) {
      const tierExists = rule.tiers.some((t) => t.tier === nextTier);
      if (!tierExists) return;
    } else {
      // Default: allow up to 3 tiers
      if (nextTier > 3) return;
    }
    
    set((state) => ({
      activeInstances: state.activeInstances.map((inst) =>
        inst.id === instanceId
          ? { ...inst, currentTier: nextTier }
          : inst
      ),
    }));
    
    get().addHistoryEntry({
      instanceId,
      ruleId: instance.ruleId,
      ruleName: instance.ruleName,
      action: 'tier-escalated',
      tier: nextTier,
      details: `Escalated to tier ${nextTier}`,
    });
  },

  // ==========================================================================
  // NOTIFICATIONS
  // ==========================================================================
  recordNotification: (instanceId, notificationData) => {
    const notification: EscalationNotification = {
      ...notificationData,
      id: generateId('notif'),
    };
    
    set((state) => ({
      activeInstances: state.activeInstances.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              notificationsSent: [...inst.notificationsSent, notification],
            }
          : inst
      ),
    }));
    
    const instance = get().activeInstances.find((i) => i.id === instanceId);
    if (instance) {
      get().addHistoryEntry({
        instanceId,
        ruleId: instance.ruleId,
        ruleName: instance.ruleName,
        action: 'notification-sent',
        tier: notificationData.tier,
        details: `Notification sent to ${notificationData.recipientName} via ${notificationData.channel}`,
      });
    }
  },

  acknowledgeNotification: (instanceId, notificationId) => {
    set((state) => ({
      activeInstances: state.activeInstances.map((inst) =>
        inst.id === instanceId
          ? {
              ...inst,
              notificationsSent: inst.notificationsSent.map((n) =>
                n.id === notificationId
                  ? { ...n, acknowledged: true, acknowledgedAt: now() }
                  : n
              ),
            }
          : inst
      ),
    }));
  },

  // ==========================================================================
  // HISTORY
  // ==========================================================================
  addHistoryEntry: (entryData) => {
    const entry: EscalationHistoryEntry = {
      ...entryData,
      id: generateId('hist'),
      timestamp: now(),
    };
    
    set((state) => ({
      history: [entry, ...state.history],
    }));
  },

  getHistoryForInstance: (instanceId) => {
    return get().history.filter((h) => h.instanceId === instanceId);
  },

  getHistoryForRule: (ruleId) => {
    return get().history.filter((h) => h.ruleId === ruleId);
  },

  // ==========================================================================
  // TEMPLATE OPERATIONS
  // ==========================================================================
  createRuleFromTemplate: (templateId, overrides = {}) => {
    const state = get();
    const template = state.templates.find((t) => t.id === templateId);
    if (!template) return null;
    
    const rule = state.createRule({
      name: overrides.name || template.name,
      description: overrides.description || template.description,
      triggerType: template.triggerType,
      moduleScope: overrides.moduleScope || template.moduleScope,
      priority: overrides.priority || 'medium',
      status: 'disabled',
      thresholdHours: overrides.thresholdHours || template.suggestedThresholdHours,
      tiers: template.suggestedTiers.map((t) => ({
        ...t,
        id: generateId('tier'),
      })),
      workingHoursConfig: overrides.workingHoursConfig || template.workingHoursConfig,
      createdBy: overrides.createdBy || 'system',
      updatedBy: overrides.updatedBy || 'system',
      ...overrides,
    });
    
    return rule;
  },

  // ==========================================================================
  // WORKING HOURS CALCULATION
  // ==========================================================================
  calculateWorkingHours: calculateWorkingHoursImpl,
  isWithinWorkingHours: isWithinWorkingHoursImpl,
  getNextWorkingHour: getNextWorkingHourImpl,

  // ==========================================================================
  // QUERIES
  // ==========================================================================
  getRuleById: (id) => {
    return get().rules.find((r) => r.id === id);
  },

  getActiveInstancesForRule: (ruleId) => {
    return get().activeInstances.filter(
      (i) => i.ruleId === ruleId && i.status !== 'resolved'
    );
  },

  getInstancesForSourceItem: (sourceItemId) => {
    return get().activeInstances.filter((i) => i.sourceItemId === sourceItemId);
  },

  getInstanceById: (instanceId) => {
    return get().activeInstances.find((i) => i.id === instanceId);
  },

  getRulesByModule: (module) => {
    return get().rules.filter(
      (r) => r.moduleScope.includes(module) || r.moduleScope.includes('all')
    );
  },

  getOverdueInstances: () => {
    return get().activeInstances.filter(
      (i) => i.status === 'triggered' && i.hoursOverdue > 0
    );
  },

  // ==========================================================================
  // UI STATE
  // ==========================================================================
  setSelectedRuleId: (id) => {
    set({ selectedRuleId: id });
  },

  setSelectedInstanceId: (id) => {
    set({ selectedInstanceId: id });
  },

  setError: (error) => {
    set({ error });
  },

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================
  importRules: (rules) => {
    set((state) => ({
      rules: [
        ...state.rules,
        ...rules.map((r) => ({
          ...r,
          id: generateId('rule'),
          createdAt: now(),
          updatedAt: now(),
        })),
      ],
    }));
  },

  exportRules: () => {
    return get().rules;
  },

  clearAllInstances: () => {
    set({ activeInstances: [] });
  },

  // v0.13.97: Added reset for testing
  reset: () => {
    set({
      rules: [],
      activeInstances: [],
      history: [],
      templates: DEFAULT_TEMPLATES,
      selectedRuleId: null,
      selectedInstanceId: null,
      isLoading: false,
      error: null,
    });
  },
}));
