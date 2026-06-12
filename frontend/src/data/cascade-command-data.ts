// Cascade Command Center Data - v0.6.3
// "Three events. 127 actions. One command center. Zero spreadsheets."
// The capstone of the R&D Connected cascade trifecta.

import { SignalCascade, CascadeAction, hepatotoxicityCascade, LinkedModule } from './signal-cascade-data';
import { DBLockCascade, DBLockCascadeAction, illuminateDBLockCascade, DBLockLinkedModule } from './db-lock-cascade-data';
import { QualityEventCascade, QualityEventAction, criticalDeviationCascade, QualityLinkedModule } from './quality-event-cascade-data';

// ============================================================================
// UNIFIED CASCADE TYPES
// ============================================================================

export type CascadeType = 'safety-signal' | 'db-lock' | 'quality-event';

export type UnifiedModule = 
  | 'safety' | 'labeling' | 'authoring' | 'submissions-hub' | 'haq' 
  | 'medical-affairs' | 'clinical' | 'qms' | 'supply-chain' | 'ctms'
  | 'publishing' | 'regulatory' | 'tmf' | 'manufacturing';

export interface UnifiedCascadeAction {
  id: string;
  cascadeId: string;
  cascadeType: CascadeType;
  category: string;
  title: string;
  description: string;
  status: 'triggered' | 'in-progress' | 'pending-review' | 'completed' | 'verified' | 'escalated' | 'blocked' | 'validated';
  priority: 'critical' | 'high' | 'standard' | 'low';
  linkedModule: UnifiedModule;
  triggeredAt: string;
  completedAt?: string;
  assignedTo?: string;
  dueDate?: string;
  automatedAction: boolean;
  requiresApproval: boolean;
}

export interface UnifiedCascade {
  id: string;
  type: CascadeType;
  code: string;
  title: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor' | 'significant';
  productId: string;
  productName: string;
  triggeredAt: string;
  lastUpdated: string;
  totalActions: number;
  completedActions: number;
  automatedActions: number;
  modulesImpacted: number;
  estimatedResolutionDate: string;
  status: 'active' | 'resolved' | 'monitoring';
  sourceModule: UnifiedModule;
  actions: UnifiedCascadeAction[];
}

export interface ModuleImpactSummary {
  module: UnifiedModule;
  label: string;
  icon: string;
  totalActions: number;
  completedActions: number;
  criticalActions: number;
  cascadesSources: CascadeType[];
}

export interface CrossCascadeDependency {
  id: string;
  sourceCascadeId: string;
  sourceCascadeType: CascadeType;
  targetCascadeId: string;
  targetCascadeType: CascadeType;
  linkType: 'triggers' | 'blocks' | 'informs' | 'requires';
  description: string;
  createdAt: string;
}

// ============================================================================
// CASCADE TYPE METADATA
// ============================================================================

export const cascadeTypeMeta: Record<CascadeType, {
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  color: string;
  sourceModule: UnifiedModule;
}> = {
  'safety-signal': {
    label: 'Safety Signal Cascade',
    shortLabel: 'Safety Signal',
    description: 'Safety event propagating across regulatory and commercial functions',
    icon: 'AlertTriangle',
    color: 'red',
    sourceModule: 'safety',
  },
  'db-lock': {
    label: 'Database Lock Cascade',
    shortLabel: 'Database Lock',
    description: 'Clinical database lock triggering submission activities',
    icon: 'Database',
    color: 'green',
    sourceModule: 'clinical',
  },
  'quality-event': {
    label: 'Quality Event Cascade',
    shortLabel: 'Quality Event',
    description: 'Quality deviation propagating to manufacturing and clinical',
    icon: 'Shield',
    color: 'orange',
    sourceModule: 'qms',
  },
};

export const moduleMetadata: Record<UnifiedModule, {
  label: string;
  icon: string;
  color: string;
}> = {
  'safety': { label: 'Safety & PV', icon: 'AlertTriangle', color: 'red' },
  'labeling': { label: 'Labeling', icon: 'Tag', color: 'amber' },
  'authoring': { label: 'Authoring', icon: 'FileText', color: 'blue' },
  'submissions-hub': { label: 'Submissions', icon: 'Send', color: 'purple' },
  'haq': { label: 'HAQ Response', icon: 'MessageSquare', color: 'cyan' },
  'medical-affairs': { label: 'Medical Affairs', icon: 'Stethoscope', color: 'teal' },
  'clinical': { label: 'Clinical', icon: 'Activity', color: 'indigo' },
  'qms': { label: 'Quality', icon: 'Shield', color: 'orange' },
  'supply-chain': { label: 'Supply Chain', icon: 'Truck', color: 'gray' },
  'ctms': { label: 'CTMS', icon: 'Building2', color: 'violet' },
  'publishing': { label: 'Publishing', icon: 'BookOpen', color: 'pink' },
  'regulatory': { label: 'Regulatory', icon: 'FileCheck', color: 'emerald' },
  'tmf': { label: 'TMF', icon: 'FolderOpen', color: 'slate' },
  'manufacturing': { label: 'Manufacturing', icon: 'Factory', color: 'stone' },
};

// ============================================================================
// TRANSFORM FUNCTIONS - Convert source cascades to unified format
// ============================================================================

function transformSignalCascade(cascade: SignalCascade): UnifiedCascade {
  const actions: UnifiedCascadeAction[] = cascade.actions.map(a => ({
    id: `signal-${a.id}`,
    cascadeId: cascade.id,
    cascadeType: 'safety-signal' as CascadeType,
    category: a.category,
    title: a.title,
    description: a.description,
    status: a.status as UnifiedCascadeAction['status'],
    priority: a.priority,
    linkedModule: a.linkedModule as UnifiedModule,
    triggeredAt: a.triggeredAt,
    completedAt: a.completedAt,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    automatedAction: a.automatedAction,
    requiresApproval: a.requiresApproval,
  }));

  const uniqueModules = new Set(actions.map(a => a.linkedModule));

  return {
    id: `signal-cascade-${cascade.id}`,
    type: 'safety-signal',
    code: cascade.signalCode,
    title: cascade.signalName,
    severity: cascade.severity,
    productId: cascade.productId,
    productName: cascade.productName,
    triggeredAt: cascade.triggeredAt,
    lastUpdated: cascade.lastUpdated,
    totalActions: cascade.totalActions,
    completedActions: cascade.completedActions,
    automatedActions: cascade.automatedActions,
    modulesImpacted: uniqueModules.size,
    estimatedResolutionDate: cascade.estimatedCompletionDate,
    status: 'active',
    sourceModule: 'safety',
    actions,
  };
}

function transformDBLockCascade(cascade: DBLockCascade): UnifiedCascade {
  const actions: UnifiedCascadeAction[] = cascade.actions.map(a => ({
    id: `dblock-${a.id}`,
    cascadeId: cascade.id,
    cascadeType: 'db-lock' as CascadeType,
    category: a.category,
    title: a.title,
    description: a.description,
    status: a.status as UnifiedCascadeAction['status'],
    priority: a.priority,
    linkedModule: a.linkedModule as UnifiedModule,
    triggeredAt: a.triggeredAt,
    completedAt: a.completedAt,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    automatedAction: a.automatedAction,
    requiresApproval: a.requiresApproval,
  }));

  const uniqueModules = new Set(actions.map(a => a.linkedModule));

  return {
    id: `dblock-cascade-${cascade.id}`,
    type: 'db-lock',
    code: cascade.lockEventCode,
    title: `${cascade.studyName} - ${cascade.databaseType} Database Lock`,
    severity: 'major',
    productId: cascade.productId,
    productName: cascade.productName,
    triggeredAt: cascade.triggeredAt,
    lastUpdated: cascade.lastUpdated,
    totalActions: cascade.totalActions,
    completedActions: cascade.completedActions,
    automatedActions: cascade.automatedActions,
    modulesImpacted: uniqueModules.size,
    estimatedResolutionDate: cascade.estimatedSubmissionDate,
    status: 'active',
    sourceModule: 'clinical',
    actions,
  };
}

function transformQualityCascade(cascade: QualityEventCascade): UnifiedCascade {
  const actions: UnifiedCascadeAction[] = cascade.actions.map(a => ({
    id: `quality-${a.id}`,
    cascadeId: cascade.id,
    cascadeType: 'quality-event' as CascadeType,
    category: a.category,
    title: a.title,
    description: a.description,
    status: a.status as UnifiedCascadeAction['status'],
    priority: a.priority,
    linkedModule: a.linkedModule as UnifiedModule,
    triggeredAt: a.triggeredAt,
    completedAt: a.completedAt,
    assignedTo: a.assignedTo,
    dueDate: a.dueDate,
    automatedAction: a.automatedAction,
    requiresApproval: a.requiresApproval,
  }));

  const uniqueModules = new Set(actions.map(a => a.linkedModule));

  return {
    id: `quality-cascade-${cascade.id}`,
    type: 'quality-event',
    code: cascade.eventCode,
    title: cascade.eventTitle,
    severity: cascade.severity,
    productId: cascade.productId,
    productName: cascade.productName,
    triggeredAt: cascade.triggeredAt,
    lastUpdated: cascade.lastUpdated,
    totalActions: cascade.totalActions,
    completedActions: cascade.completedActions,
    automatedActions: cascade.automatedActions,
    modulesImpacted: uniqueModules.size,
    estimatedResolutionDate: cascade.estimatedResolutionDate,
    status: 'active',
    sourceModule: 'qms',
    actions,
  };
}

// ============================================================================
// UNIFIED CASCADE DATA
// ============================================================================

// Transform all three source cascades into unified format
export const unifiedCascades: UnifiedCascade[] = [
  transformSignalCascade(hepatotoxicityCascade),
  transformDBLockCascade(illuminateDBLockCascade),
  transformQualityCascade(criticalDeviationCascade),
];

// Cross-cascade dependencies - how cascades can trigger each other
export const crossCascadeDependencies: CrossCascadeDependency[] = [
  {
    id: 'dep-001',
    sourceCascadeId: 'quality-cascade-qe-2026-001',
    sourceCascadeType: 'quality-event',
    targetCascadeId: 'signal-cascade-sig-2026-001',
    targetCascadeType: 'safety-signal',
    linkType: 'informs',
    description: 'Batch deviation may correlate with hepatotoxicity cases - under investigation',
    createdAt: '2026-01-02T10:30:00Z',
  },
  {
    id: 'dep-002',
    sourceCascadeId: 'dblock-cascade-dbl-2026-001',
    sourceCascadeType: 'db-lock',
    targetCascadeId: 'signal-cascade-sig-2026-001',
    targetCascadeType: 'safety-signal',
    linkType: 'requires',
    description: 'CSR safety section requires signal assessment completion',
    createdAt: '2026-01-02T08:00:00Z',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAllUnifiedActions(): UnifiedCascadeAction[] {
  return unifiedCascades.flatMap(c => c.actions);
}

export function getUnifiedCriticalActions(): UnifiedCascadeAction[] {
  return getAllUnifiedActions().filter(a => 
    a.priority === 'critical' && 
    a.status !== 'completed' && 
    a.status !== 'verified'
  );
}

export function getUnifiedActionsByModule(module: UnifiedModule): UnifiedCascadeAction[] {
  return getAllUnifiedActions().filter(a => a.linkedModule === module);
}

export function getModuleImpactSummary(): ModuleImpactSummary[] {
  const moduleMap = new Map<UnifiedModule, {
    totalActions: number;
    completedActions: number;
    criticalActions: number;
    cascadeTypes: Set<CascadeType>;
  }>();

  getAllUnifiedActions().forEach(action => {
    const existing = moduleMap.get(action.linkedModule) || {
      totalActions: 0,
      completedActions: 0,
      criticalActions: 0,
      cascadeTypes: new Set<CascadeType>(),
    };

    existing.totalActions++;
    if (action.status === 'completed' || action.status === 'verified') {
      existing.completedActions++;
    }
    if (action.priority === 'critical' && action.status !== 'completed' && action.status !== 'verified') {
      existing.criticalActions++;
    }
    existing.cascadeTypes.add(action.cascadeType);
    
    moduleMap.set(action.linkedModule, existing);
  });

  return Array.from(moduleMap.entries()).map(([module, data]) => ({
    module,
    label: moduleMetadata[module]?.label || module,
    icon: moduleMetadata[module]?.icon || 'Circle',
    totalActions: data.totalActions,
    completedActions: data.completedActions,
    criticalActions: data.criticalActions,
    cascadesSources: Array.from(data.cascadeTypes),
  })).sort((a, b) => b.totalActions - a.totalActions);
}

export function getCascadeCommandStats(): {
  totalCascades: number;
  activeCascades: number;
  totalActions: number;
  completedActions: number;
  criticalActions: number;
  modulesImpacted: number;
  automationRate: number;
  avgResponseTime: string;
  legacyComparison: string;
} {
  const allActions = getAllUnifiedActions();
  const completedActions = allActions.filter(a => a.status === 'completed' || a.status === 'verified').length;
  const criticalActions = getUnifiedCriticalActions().length;
  const automatedActions = allActions.filter(a => a.automatedAction).length;
  
  const uniqueModules = new Set(allActions.map(a => a.linkedModule));

  return {
    totalCascades: unifiedCascades.length,
    activeCascades: unifiedCascades.filter(c => c.status === 'active').length,
    totalActions: allActions.length,
    completedActions,
    criticalActions,
    modulesImpacted: uniqueModules.size,
    automationRate: Math.round((automatedActions / allActions.length) * 100),
    avgResponseTime: '45 seconds',
    legacyComparison: '4-6 weeks',
  };
}

export function getRecentUnifiedActivity(limit: number = 10): {
  action: UnifiedCascadeAction;
  cascade: UnifiedCascade;
  timestamp: string;
  eventType: 'triggered' | 'completed';
}[] {
  const events: {
    action: UnifiedCascadeAction;
    cascade: UnifiedCascade;
    timestamp: string;
    eventType: 'triggered' | 'completed';
  }[] = [];

  unifiedCascades.forEach(cascade => {
    cascade.actions.forEach(action => {
      events.push({
        action,
        cascade,
        timestamp: action.triggeredAt,
        eventType: 'triggered',
      });
      
      if (action.completedAt) {
        events.push({
          action,
          cascade,
          timestamp: action.completedAt,
          eventType: 'completed',
        });
      }
    });
  });

  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function getPriorityActionQueue(): UnifiedCascadeAction[] {
  return getAllUnifiedActions()
    .filter(a => a.status !== 'completed' && a.status !== 'verified')
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { critical: 0, high: 1, standard: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      // Finally by triggered time
      return new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime();
    });
}

// ============================================================================
// DEMO STATISTICS
// ============================================================================

export const cascadeCommandStats = {
  // The unified cascade stats
  totalCascades: 3,
  totalActions: 127,
  totalAutomatedPercent: 88,
  avgResponseTime: '45 seconds',
  legacyTime: '4-6 weeks',
  
  // Per-cascade breakdown
  cascadeBreakdown: {
    safetySignal: { actions: 47, modules: 10, responseTime: '30 seconds' },
    dbLock: { actions: 38, modules: 8, responseTime: '45 seconds' },
    qualityEvent: { actions: 42, modules: 9, responseTime: '60 seconds' },
  },
  
  // The investor pitch
  keyMessage: 'Three events. 127 actions. One command center. Zero spreadsheets.',
  
  // Competitor comparison
  competitorGap: {
    veeva: 'Quality events siloed in Vault QMS, no clinical cascade',
    oracle: 'Manual handoffs between Argus, InForm, and Fusion',
    sap: 'Requires custom integrations for cross-module flow',
  },
};
