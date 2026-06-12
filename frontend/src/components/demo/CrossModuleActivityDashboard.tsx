

import { useState, useMemo } from 'react';
import {
  Activity, Zap, Clock, CheckCircle, AlertTriangle, ArrowRight, Filter,
  ChevronDown, ChevronRight, RefreshCw, XCircle, Loader2, Bell, GitBranch,
  FlaskConical, Shield, FileText, Globe, Package, Beaker, ClipboardList,
  FileQuestion, FolderOpen  // v0.15.33: Added for HAQ and TMF modules
} from 'lucide-react';
import { 
  useCrossModuleEventStore,
  CrossModuleEvent,
  ModuleId,
  CrossModuleEventType,
  CascadeAction
} from '@/store/useCrossModuleEventStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

// ============================================================================
// CROSS-MODULE ACTIVITY DASHBOARD - v159
// Centralized view of all cross-module data flows
// ============================================================================

// Module icons and colors
const DEFAULT_MODULE_CONFIG = { 
  icon: <FileText className="w-4 h-4" />, 
  label: 'Unknown', 
  color: 'text-slate-400',
  bgColor: 'bg-slate-500/20'
};

const MODULE_CONFIG: Partial<Record<ModuleId, { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  bgColor: string;
}>> & Record<string, { icon: React.ReactNode; label: string; color: string; bgColor: string; }> = {
  research: { 
    icon: <FlaskConical className="w-4 h-4" />, 
    label: 'Research', 
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/20'
  },
  clinical: { 
    icon: <Beaker className="w-4 h-4" />, 
    label: 'Clinical', 
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/20'
  },
  safety: { 
    icon: <Shield className="w-4 h-4" />, 
    label: 'Safety', 
    color: 'text-accent-red',
    bgColor: 'bg-accent-red/20'
  },
  glp: { 
    icon: <FlaskConical className="w-4 h-4" />, 
    label: 'GLP', 
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/20'
  },
  psmf: { 
    icon: <ClipboardList className="w-4 h-4" />, 
    label: 'PSMF', 
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/20'
  },
  regulatory: { 
    icon: <FileText className="w-4 h-4" />, 
    label: 'Regulatory', 
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/20'
  },
  submissions: { 
    icon: <FileText className="w-4 h-4" />, 
    label: 'Submissions', 
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/20'
  },
  labeling: { 
    icon: <Globe className="w-4 h-4" />, 
    label: 'Labeling', 
    color: 'text-accent-green',
    bgColor: 'bg-accent-green/20'
  },
  authoring: { 
    icon: <FileText className="w-4 h-4" />, 
    label: 'Authoring', 
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20'
  },
  qms: { 
    icon: <ClipboardList className="w-4 h-4" />, 
    label: 'QMS', 
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/20'
  },
  cmc: { 
    icon: <Package className="w-4 h-4" />, 
    label: 'CMC', 
    color: 'text-accent-purple',
    bgColor: 'bg-accent-purple/20'
  },
  haq: {  // v0.15.33: Added for HAQ workflow scenarios
    icon: <FileQuestion className="w-4 h-4" />, 
    label: 'HAQ', 
    color: 'text-accent-amber',
    bgColor: 'bg-accent-amber/20'
  },
  tmf: {  // v0.15.33: Added for document scenarios
    icon: <FolderOpen className="w-4 h-4" />, 
    label: 'TMF', 
    color: 'text-accent-blue',
    bgColor: 'bg-accent-blue/20'
  },
  'supply-chain': { 
    icon: <Package className="w-4 h-4" />, 
    label: 'Supply Chain', 
    color: 'text-accent-teal',
    bgColor: 'bg-accent-teal/20'
  },
};

// Priority colors
const PRIORITY_CONFIG = {
  critical: { color: 'text-accent-red', bg: 'bg-accent-red/20', badge: 'red' as const },
  high: { color: 'text-accent-amber', bg: 'bg-accent-amber/20', badge: 'amber' as const },
  medium: { color: 'text-accent-blue', bg: 'bg-accent-blue/20', badge: 'blue' as const },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/20', badge: 'slate' as const },
};

// Status colors
const STATUS_CONFIG = {
  pending: { color: 'text-slate-400', icon: <Clock className="w-3 h-3" /> },
  'in-progress': { color: 'text-accent-blue', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed: { color: 'text-accent-green', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { color: 'text-accent-red', icon: <XCircle className="w-3 h-3" /> },
};

// Event type labels
const EVENT_TYPE_LABELS: Record<CrossModuleEventType, string> = {
  'preclinical-study-completed': 'Preclinical Study Completed',
  'preclinical-finding-reported': 'Preclinical Finding Reported',
  'glp-study-finalized': 'GLP Study Finalized',
  'clinical-ae-reported': 'Clinical AE Reported',
  'clinical-sae-escalated': 'Clinical SAE Escalated',
  'dsmb-safety-alert': 'DSMB Safety Alert',
  'safety-signal-confirmed': 'Safety Signal Confirmed',
  'safety-update-required': 'Safety Update Required',
  'label-change-recommended': 'Label Change Recommended',
  'labeling-approved': 'Labeling Approved',
  'labeling-update-finalized': 'Labeling Update Finalized',
  'packaging-artwork-approved': 'Packaging Artwork Approved',
  'document-finalized': 'Document Finalized',
  'csr-completed': 'CSR Completed',
  'ctd-section-ready': 'CTD Section Ready',
  'deviation-reported': 'Deviation Reported',
  'capa-initiated': 'CAPA Initiated',
  'change-control-approved': 'Change Control Approved',
  'supply-risk-detected': 'Supply Risk Detected',
  'supply-decision-required': 'Supply Decision Required',
  'suppliability-status-changed': 'Suppliability Status Changed',
  'ectd-validation-complete': 'eCTD Validation Complete',
  'evidence-package-generated': 'Evidence Package Generated',
  'capa-created': 'CAPA Created',
  'demo-ai-generate-section': 'AI Section Generation',
  'demo-glp-cascade': 'GLP Cascade Demo',
};

// Format time ago
function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return then.toLocaleDateString();
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface EventCardProps {
  event: CrossModuleEvent;
  expanded: boolean;
  onToggle: () => void;
}

function EventCard({ event, expanded, onToggle }: EventCardProps) {
  const sourceConfig = MODULE_CONFIG[event.sourceModule] ?? DEFAULT_MODULE_CONFIG;
  const priorityConfig = event.metadata?.priority 
    ? PRIORITY_CONFIG[event.metadata.priority] 
    : PRIORITY_CONFIG.medium;
  
  const completedActions = event.cascadeActions.filter(a => a.status === 'completed').length;
  const totalActions = event.cascadeActions.length;
  const hasInProgress = event.cascadeActions.some(a => a.status === 'in-progress');
  const hasFailed = event.cascadeActions.some(a => a.status === 'failed');
  
  return (
    <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 flex items-start gap-3 cursor-pointer hover:bg-surface-card/50 transition-colors"
        onClick={onToggle}
      >
        <div className={`w-10 h-10 rounded-full ${sourceConfig.bgColor} flex items-center justify-center flex-shrink-0`}>
          <span className={sourceConfig.color}>{sourceConfig.icon}</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-text-primary truncate">
              {EVENT_TYPE_LABELS[event.type]}
            </span>
            <Badge color={priorityConfig.badge} size="xs">
              {event.metadata?.priority?.toUpperCase() || 'MEDIUM'}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span className={sourceConfig.color}>{sourceConfig.label}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{event.targetModules.map(m => (MODULE_CONFIG[m] ?? DEFAULT_MODULE_CONFIG).label).join(', ')}</span>
          </div>
          
          {event.payload.product && (
            <div className="text-xs text-text-muted mt-1">
              Product: <span className="text-accent-blue">{event.payload.product}</span>
              {event.payload.studyNumber && <span> • {event.payload.studyNumber}</span>}
              {event.payload.signal && <span> • {event.payload.signal}</span>}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-xs text-text-muted">{formatTimeAgo(event.timestamp)}</div>
            <div className="flex items-center gap-1 text-xs mt-1">
              {hasFailed && <XCircle className="w-3 h-3 text-accent-red" />}
              {hasInProgress && <Loader2 className="w-3 h-3 text-accent-blue animate-spin" />}
              {completedActions > 0 && (
                <span className="text-accent-green flex items-center gap-0.5">
                  <CheckCircle className="w-3 h-3" />
                  {completedActions}
                </span>
              )}
              <span className="text-text-muted">/{totalActions}</span>
            </div>
          </div>
          
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </div>
      
      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-border p-4 bg-surface-card/50">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">
            Cascade Actions
          </h4>
          
          <div className="space-y-2">
            {event.cascadeActions.map(action => {
              const targetConfig = MODULE_CONFIG[action.targetModule] ?? DEFAULT_MODULE_CONFIG;
              const statusConfig = STATUS_CONFIG[action.status];
              
              return (
                <div 
                  key={action.id}
                  className="flex items-center gap-3 p-2 bg-surface-elevated rounded-lg"
                >
                  <div className={`w-6 h-6 rounded ${targetConfig.bgColor} flex items-center justify-center`}>
                    <span className={targetConfig.color}>{targetConfig.icon}</span>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-primary capitalize">
                        {action.actionType}
                      </span>
                      <span className="text-xs text-text-muted">→</span>
                      <span className="text-xs text-text-muted">{targetConfig.label}</span>
                    </div>
                    <div className="text-xs text-text-muted truncate">{action.description}</div>
                  </div>
                  
                  <div className={`flex items-center gap-1 ${statusConfig?.color ?? ''}`}>
                    {statusConfig.icon}
                    <span className="text-xs capitalize">{action.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

interface ModuleFlowDiagramProps {
  events: CrossModuleEvent[];
}

function ModuleFlowDiagram({ events }: ModuleFlowDiagramProps) {
  // Calculate flow metrics between modules
  const flowMetrics = useMemo(() => {
    const flows: Record<string, number> = {};
    
    events.forEach(event => {
      event.targetModules.forEach(target => {
        const key = `${event.sourceModule}->${target}`;
        flows[key] = (flows[key] || 0) + 1;
      });
    });
    
    return flows;
  }, [events]);
  
  const modules: ModuleId[] = ['research', 'clinical', 'safety', 'regulatory', 'labeling', 'submissions'];
  
  return (
    <Card variant="elevated" padding="lg">
      <CardHeader title="Cross-Module Flow" />
      <CardContent>
        <div className="grid grid-cols-6 gap-2">
          {modules.map(module => {
            const config = MODULE_CONFIG[module] ?? DEFAULT_MODULE_CONFIG;
            const outgoing = Object.entries(flowMetrics)
              .filter(([key]) => key.startsWith(`${module}->`))
              .reduce((sum, [, count]) => sum + count, 0);
            const incoming = Object.entries(flowMetrics)
              .filter(([key]) => key.endsWith(`->${module}`))
              .reduce((sum, [, count]) => sum + count, 0);
            
            return (
              <div 
                key={module}
                className={`p-3 rounded-lg border ${config.bgColor} border-border text-center`}
              >
                <div className={`w-8 h-8 mx-auto rounded-full bg-surface-elevated flex items-center justify-center mb-2`}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <div className="text-xs font-medium text-text-primary">{config.label}</div>
                <div className="flex items-center justify-center gap-2 mt-1 text-xs text-text-muted">
                  <span className="text-accent-green">↓{incoming}</span>
                  <span className="text-accent-blue">↑{outgoing}</span>
                </div>
              </div>
            );
          })}
        </div>
        
        {Object.keys(flowMetrics).length === 0 && (
          <div className="text-center py-8 text-text-muted text-sm">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No data flows recorded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PendingActionsListProps {
  moduleId?: ModuleId;
}

function PendingActionsList({ moduleId }: PendingActionsListProps) {
  const getPendingActionsForModule = useCrossModuleEventStore(s => s.getPendingActionsForModule);
  const events = useCrossModuleEventStore(s => s.events);
  
  // Get all pending actions across all modules if no module specified
  const pendingActions = useMemo(() => {
    if (moduleId) {
      return getPendingActionsForModule(moduleId);
    }
    
    const allPending: { moduleId: ModuleId; eventId: string; cascadeAction: CascadeAction }[] = [];
    (['research', 'clinical', 'safety', 'regulatory', 'submissions', 'labeling', 'authoring', 'qms', 'cmc'] as ModuleId[]).forEach(m => {
      getPendingActionsForModule(m).forEach(action => {
        allPending.push(action);
      });
    });
    
    return allPending;
  }, [moduleId, getPendingActionsForModule, events]);
  
  if (pendingActions.length === 0) {
    return (
      <div className="text-center py-4 text-text-muted text-sm">
        <CheckCircle className="w-6 h-6 mx-auto mb-2 text-accent-green opacity-70" />
        No pending actions
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {pendingActions.slice(0, 5).map((action, index) => {
        const config = MODULE_CONFIG[action.moduleId] ?? DEFAULT_MODULE_CONFIG;
        const statusConfig = STATUS_CONFIG[action.cascadeAction.status];
        
        return (
          <div 
            key={`${action.eventId}-${action.cascadeAction.id}-${index}`}
            className="flex items-center gap-3 p-3 bg-surface-card rounded-lg"
          >
            <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
              <span className={config.color}>{config.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary truncate">
                {action.cascadeAction.description}
              </div>
              <div className="text-xs text-text-muted capitalize">
                {action.cascadeAction.actionType} • {config.label}
              </div>
            </div>
            <div className={`flex items-center gap-1 ${statusConfig?.color ?? ''}`}>
              {statusConfig.icon}
            </div>
          </div>
        );
      })}
      
      {pendingActions.length > 5 && (
        <div className="text-center text-xs text-text-muted py-2">
          +{pendingActions.length - 5} more pending actions
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CrossModuleActivityDashboardProps {
  moduleFilter?: ModuleId;
  compact?: boolean;
}

export function CrossModuleActivityDashboard({ 
  moduleFilter, 
  compact = false 
}: CrossModuleActivityDashboardProps) {
  const events = useCrossModuleEventStore(s => s.events);
  const eventFeed = useCrossModuleEventStore(s => s.eventFeed);
  const clearEventFeed = useCrossModuleEventStore(s => s.clearEventFeed);
  
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleId | 'all'>(moduleFilter || 'all');
  
  // Filter events by module
  const filteredEvents = useMemo(() => {
    if (selectedModule === 'all') return eventFeed;
    return eventFeed.filter(
      e => e.sourceModule === selectedModule || e.targetModules.includes(selectedModule)
    );
  }, [eventFeed, selectedModule]);
  
  // Stats
  const stats = useMemo(() => {
    const allEvents = events;
    const totalEvents = allEvents.length;
    const completedActions = allEvents.flatMap(e => e.cascadeActions).filter(a => a.status === 'completed').length;
    const pendingActions = allEvents.flatMap(e => e.cascadeActions).filter(a => a.status === 'pending' || a.status === 'in-progress').length;
    const failedActions = allEvents.flatMap(e => e.cascadeActions).filter(a => a.status === 'failed').length;
    
    return { totalEvents, completedActions, pendingActions, failedActions };
  }, [events]);
  
  if (compact) {
    return (
      <Card variant="elevated" padding="lg">
        <CardHeader 
          title="Cross-Module Activity"
          action={
            <Badge color="blue" size="sm">
              {filteredEvents.length} events
            </Badge>
          }
        />
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-6 text-text-muted">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No cross-module events yet</p>
              <p className="text-xs mt-1">Events will appear here as data flows between modules</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.slice(0, 5).map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  expanded={expandedEventId === event.id}
                  onToggle={() => setExpandedEventId(
                    expandedEventId === event.id ? null : event.id
                  )}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Cross-Module Activity</h1>
          <p className="text-sm text-text-muted mt-1">
            Real-time data flows across the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as ModuleId | 'all')}
            className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
          >
            <option value="all">All Modules</option>
            {Object.entries(MODULE_CONFIG).map(([id, config]) => (
              <option key={id} value={id}>{config.label}</option>
            ))}
          </select>
          <Button 
            variant="ghost" 
            size="sm" 
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={clearEventFeed}
          >
            Clear
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-blue/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">{stats.totalEvents}</div>
              <div className="text-xs text-text-muted">Total Events</div>
            </div>
          </div>
        </Card>
        
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-green/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">{stats.completedActions}</div>
              <div className="text-xs text-text-muted">Completed</div>
            </div>
          </div>
        </Card>
        
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-amber/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-accent-amber" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">{stats.pendingActions}</div>
              <div className="text-xs text-text-muted">Pending</div>
            </div>
          </div>
        </Card>
        
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-red/20 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-accent-red" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">{stats.failedActions}</div>
              <div className="text-xs text-text-muted">Failed</div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Event Feed */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">Recent Events</h2>
          
          {filteredEvents.length === 0 ? (
            <Card variant="elevated" padding="lg">
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No Cross-Module Events</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto">
                  Events will appear here as data flows between modules. Try completing a study 
                  in Research or confirming a signal in Safety to trigger cascades.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  expanded={expandedEventId === event.id}
                  onToggle={() => setExpandedEventId(
                    expandedEventId === event.id ? null : event.id
                  )}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Flow Diagram */}
          <ModuleFlowDiagram events={events} />
          
          {/* Pending Actions */}
          <Card variant="elevated" padding="lg">
            <CardHeader 
              title="Pending Actions" 
              action={
                <Badge color="amber" size="xs">
                  {stats.pendingActions}
                </Badge>
              }
            />
            <CardContent>
              <PendingActionsList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { EventCard, ModuleFlowDiagram, PendingActionsList };
export default CrossModuleActivityDashboard;
