

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Activity, Zap, Clock, CheckCircle, AlertTriangle, ArrowRight, Filter,
  ChevronDown, ChevronRight, RefreshCw, XCircle, Loader2, Bell, GitBranch,
  FlaskConical, Shield, FileText, Globe, Package, Beaker, ClipboardList,
  Play, Pause, Settings, Download, BarChart3, TrendingUp,
  FileQuestion, FolderOpen  // v0.15.33: Added for HAQ and TMF modules
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
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
import { useNotifications } from '@/components/notifications/NotificationSystem';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// ACTIVITY SCREEN - v160
// Full-page view of cross-module data flows with real-time notifications
// ============================================================================

// Module icons and colors
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
// EVENT CARD COMPONENT
// ============================================================================

interface EventCardProps {
  event: CrossModuleEvent;
  expanded: boolean;
  onToggle: () => void;
}

function EventCard({ event, expanded, onToggle }: EventCardProps) {
  const sourceConfig = MODULE_CONFIG[event.sourceModule];
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
        <div className={`w-10 h-10 rounded-full ${sourceConfig?.bgColor || 'bg-slate-500/20'} flex items-center justify-center flex-shrink-0`}>
          <span className={sourceConfig?.color || 'text-slate-400'}>{sourceConfig?.icon || <Activity className="w-4 h-4" />}</span>
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
            <span className={sourceConfig?.color || 'text-slate-400'}>{sourceConfig?.label || event.sourceModule}</span>
            <ArrowRight className="w-3 h-3" />
            <span>{event.targetModules.map(m => MODULE_CONFIG[m]?.label || m).join(', ')}</span>
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
        <div className="px-4 pb-4 border-t border-border/50 pt-3">
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Cascade Actions ({completedActions}/{totalActions})
          </h4>
          <div className="space-y-2">
            {event.cascadeActions.map(action => {
              const targetConfig = MODULE_CONFIG[action.targetModule];
              const statusConfig = STATUS_CONFIG[action.status];
              
              return (
                <div 
                  key={action.id}
                  className="flex items-center gap-3 p-2 bg-surface-card rounded-lg"
                >
                  <div className={`w-6 h-6 rounded ${targetConfig?.bgColor || 'bg-slate-500/20'} flex items-center justify-center`}>
                    <span className={targetConfig?.color || 'text-slate-400'} style={{ transform: 'scale(0.8)' }}>
                      {targetConfig?.icon || <Activity className="w-3 h-3" />}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary truncate">
                      {action.description}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {targetConfig?.label || action.targetModule} • {action.actionType} • {action.entityType}
                    </div>
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

// ============================================================================
// MODULE FLOW DIAGRAM
// ============================================================================

function ModuleFlowDiagram({ events }: { events: CrossModuleEvent[] }) {
  // Calculate flow metrics per module
    const { deadClick } = useDeadClick();
  const flowMetrics = useMemo(() => {
    const metrics: Record<string, { incoming: number; outgoing: number }> = {};
    
    Object.keys(MODULE_CONFIG).forEach(moduleId => {
      metrics[moduleId] = { incoming: 0, outgoing: 0 };
    });
    
    events.forEach(event => {
      if (metrics[event.sourceModule]) {
        metrics[event.sourceModule].outgoing++;
      }
      event.targetModules.forEach(target => {
        if (metrics[target]) {
          metrics[target].incoming++;
        }
      });
    });
    
    return metrics;
  }, [events]);
  
  return (
    <Card variant="elevated" padding="lg">
      <CardHeader title="Module Data Flows" />
      <CardContent>
        <div className="space-y-2">
          {Object.entries(MODULE_CONFIG).map(([moduleId, config]) => {
            const metrics = flowMetrics[moduleId] || { incoming: 0, outgoing: 0 };
            const total = metrics.incoming + metrics.outgoing;
            if (total === 0) return null;
            
            return (
              <div key={moduleId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-card">
                <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                  <span className={config.color}>{config.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{config.label}</div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span className="text-accent-green">↓ {metrics.incoming} in</span>
                    <span className="text-accent-blue">↑ {metrics.outgoing} out</span>
                  </div>
                </div>
              </div>
            );
          })}
          {Object.values(flowMetrics).every(m => m.incoming === 0 && m.outgoing === 0) && (
            <div className="text-center py-4 text-sm text-text-muted">
              No data flows recorded yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// PENDING ACTIONS LIST
// ============================================================================

function PendingActionsList() {
  const pendingActions = useCrossModuleEventStore(s => s.pendingActions);
  
  const allPending = useMemo(() => {
    return Object.entries(pendingActions)
      .flatMap(([moduleId, actions]) => 
        actions.map(a => ({ ...a, moduleId: moduleId as ModuleId }))
      )
      .slice(0, 10);
  }, [pendingActions]);
  
  if (allPending.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-text-muted">
        No pending actions
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {allPending.map(action => {
        const config = MODULE_CONFIG[action.moduleId];
        const statusConfig = STATUS_CONFIG[action.cascadeAction.status];
        
        return (
          <div key={action.cascadeAction.id} className="flex items-center gap-2 p-2 bg-surface-card rounded-lg">
            <div className={`w-6 h-6 rounded ${config?.bgColor || 'bg-slate-500/20'} flex items-center justify-center`}>
              <span className={config?.color || 'text-slate-400'} style={{ transform: 'scale(0.75)' }}>
                {config?.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-text-primary truncate">
                {action.cascadeAction.description}
              </div>
              <div className="text-[10px] text-text-muted">
                {config?.label || action.moduleId}
              </div>
            </div>
            <div className={statusConfig.color}>
              {statusConfig.icon}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// LIVE FEED INDICATOR
// ============================================================================

function LiveFeedIndicator({ isLive, onToggle }: { isLive: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
        isLive 
          ? 'bg-accent-green/20 text-accent-green' 
          : 'bg-surface-card text-text-muted hover:text-text-secondary'
      }`}
    >
      {isLive ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green"></span>
          </span>
          <span>Live</span>
          <Pause className="w-3 h-3" />
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-text-muted"></span>
          <span>Paused</span>
          <Play className="w-3 h-3" />
        </>
      )}
    </button>
  );
}

// ============================================================================
// MAIN ACTIVITY SCREEN
// ============================================================================

export function ActivityScreen() {
  const { deadClick } = useDeadClick();
  const events = useCrossModuleEventStore(s => s.events);
  const eventFeed = useCrossModuleEventStore(s => s.eventFeed);
  const clearEventFeed = useCrossModuleEventStore(s => s.clearEventFeed);
  const { addNotification } = useNotifications();
  
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleId | 'all'>('all');
  const [isLive, setIsLive] = useState(true);
  
  // v164: Proper infinite loop fix
  // Track both count and latest event ID to detect true new events
  const lastEventStateRef = useRef({ count: eventFeed.length, latestId: eventFeed[0]?.id || '' });
  const isLiveRef = useRef(isLive);
  isLiveRef.current = isLive;
  
  // v164: Use stable callback reference for notifications
  const addNotificationRef = useRef(addNotification);
  addNotificationRef.current = addNotification;
  
  // v160: Toast notifications for new events
  // v164 fix: Proper ref tracking to prevent infinite loops
  useEffect(() => {
    // Skip if not live mode
    if (!isLiveRef.current) return;
    
    const currentCount = eventFeed.length;
    const currentLatestId = eventFeed[0]?.id || '';
    const prevState = lastEventStateRef.current;
    
    // Only trigger notification if:
    // 1. Count increased AND
    // 2. Latest event ID changed (truly a new event, not just a re-render)
    const hasNewEvent = currentCount > prevState.count && 
                        currentLatestId !== prevState.latestId &&
                        currentCount > 0;
    
    if (hasNewEvent) {
      const newEvent = eventFeed[0];
      const sourceConfig = MODULE_CONFIG[newEvent.sourceModule];
      
      // Use ref to avoid dependency on addNotification
      addNotificationRef.current({
        type: newEvent.metadata?.priority === 'critical' ? 'warning' : 'info',
        title: EVENT_TYPE_LABELS[newEvent.type],
        message: `${sourceConfig?.label || newEvent.sourceModule} → ${newEvent.targetModules.map(m => MODULE_CONFIG[m]?.label || m).join(', ')}`,
        duration: 5000,
        action: {
          label: 'View Details',
          onClick: () => setExpandedEventId(newEvent.id),
        },
      });
    }
    
    // Always update ref to current state
    lastEventStateRef.current = { count: currentCount, latestId: currentLatestId };
  }, [eventFeed]); // Only depend on eventFeed - refs handle the rest
  
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
    const automatedActions = allEvents.filter(e => e.metadata?.automated).length;
    
    return { totalEvents, completedActions, pendingActions, failedActions, automatedActions };
  }, [events]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Cross-Module Activity"
        subtitle="Real-time data flows and cascade actions across the platform"
        icon={<Activity className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <LiveFeedIndicator isLive={isLive} onToggle={() => setIsLive(!isLive)} />
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
              Clear Feed
            </Button>
          </div>
        }
      />
      <div className="flex-1 p-6 space-y-4 md:space-y-6 overflow-auto">
      
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
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
        
        <Card variant="elevated" padding="md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">{stats.automatedActions}</div>
              <div className="text-xs text-text-muted">Automated</div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Event Feed */}
        <div className="col-span-1 md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Event Feed</h2>
            <Badge color="blue" size="sm">{filteredEvents.length} events</Badge>
          </div>
          
          {filteredEvents.length === 0 ? (
            <Card variant="elevated" padding="lg">
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 mx-auto mb-4 text-text-muted opacity-50" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No Cross-Module Events</h3>
                <p className="text-sm text-text-muted max-w-md mx-auto">
                  Events will appear here as data flows between modules. Try confirming a safety signal 
                  or approving packaging artwork to trigger cascade events.
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
        <div className="space-y-4 md:space-y-6">
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
          
          {/* Quick Actions */}
          <Card variant="elevated" padding="lg">
            <CardHeader title="Quick Actions" />
            <CardContent>
              <div className="space-y-2">
                <Button
                  onClick={() => toast.info('Activity detail — select an activity row to view full history')}
                  variant="secondary" 
                  size="sm" 
                  className="w-full justify-start"
                  icon={<Download className="w-4 h-4" />}
                >
                  Export Event Log
                </Button>
                <Button
                  onClick={() => toast.info('Activity detail — select an activity row to view full history')}
                  variant="secondary" 
                  size="sm" 
                  className="w-full justify-start"
                  icon={<BarChart3 className="w-4 h-4" />}
                >
                  View Analytics
                </Button>
                <Button
                  onClick={() => toast.info('Activity detail — select an activity row to view full history')}
                  variant="secondary" 
                  size="sm" 
                  className="w-full justify-start"
                  icon={<Settings className="w-4 h-4" />}
                >
                  Configure Cascades
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
  );
}

// Export skeleton for dynamic loading
export function ActivityScreenSkeleton() {
  return (
    <div className="flex-1 p-6 space-y-4 md:space-y-6 overflow-auto animate-pulse">
      <div className="h-10 w-64 bg-surface-card rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-surface-card rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="col-span-1 md:col-span-2 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-surface-card rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-surface-card rounded-lg" />
          <div className="h-48 bg-surface-card rounded-lg" />
        </div>
      </div>
    </div>
  );
}
