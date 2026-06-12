

import { useState, useEffect } from 'react';
import {
  Activity, ArrowRight, Check, Clock, AlertTriangle, Zap, Link2,
  FileText, Shield, Package, Beaker, FlaskConical, Pill, BookOpen,
  Send, RefreshCw, ChevronRight, X, Bell, Sparkles, ClipboardList,
  FileQuestion, FolderOpen  // v0.15.33: Added for HAQ and TMF modules
} from 'lucide-react';
import {
  useCrossModuleEventStore,
  useCrossModuleEventFeed,
  usePendingActions,
  CrossModuleEvent,
  CascadeAction,
  ModuleId,
  CrossModuleEventType,
} from '@/store/useCrossModuleEventStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// ============================================================================
// CROSS-MODULE EVENT FEED - v158
// Real-time display of cross-module data flow and cascade actions
// ============================================================================

// Default module metadata for unknown modules
const DEFAULT_MODULE_METADATA = { name: 'Unknown', icon: FileText, color: 'text-slate-400' };

// Module metadata for display
const MODULE_METADATA: Partial<Record<ModuleId, { name: string; icon: typeof Activity; color: string }>> & Record<string, { name: string; icon: typeof Activity; color: string }> = {
  research: { name: 'Research', icon: FlaskConical, color: 'text-purple-400' },
  clinical: { name: 'Clinical', icon: Activity, color: 'text-blue-400' },
  safety: { name: 'Safety', icon: Shield, color: 'text-red-400' },
  glp: { name: 'GLP', icon: FlaskConical, color: 'text-emerald-400' },
  psmf: { name: 'PSMF', icon: ClipboardList, color: 'text-rose-400' },
  regulatory: { name: 'Regulatory', icon: FileText, color: 'text-amber-400' },
  submissions: { name: 'Submissions', icon: Send, color: 'text-green-400' },
  labeling: { name: 'Labeling', icon: Package, color: 'text-teal-400' },
  authoring: { name: 'Authoring', icon: BookOpen, color: 'text-indigo-400' },
  qms: { name: 'QMS', icon: Check, color: 'text-orange-400' },
  cmc: { name: 'CMC', icon: Beaker, color: 'text-pink-400' },
  haq: { name: 'HAQ', icon: FileQuestion, color: 'text-amber-400' },  // v0.15.33
  tmf: { name: 'TMF', icon: FolderOpen, color: 'text-blue-400' },  // v0.15.33
  'supply-chain': { name: 'Supply Chain', icon: Package, color: 'text-cyan-400' },
};

// Event type display names
const EVENT_TYPE_NAMES: Record<CrossModuleEventType, string> = {
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

// Priority colors
const PRIORITY_COLORS = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

// Action status colors
const ACTION_STATUS_COLORS = {
  pending: 'text-slate-400',
  'in-progress': 'text-blue-400',
  completed: 'text-green-400',
  failed: 'text-red-400',
};

// ============================================================================
// SINGLE EVENT CARD
// ============================================================================

interface EventCardProps {
  event: CrossModuleEvent;
  compact?: boolean;
  onAcknowledge?: (eventId: string) => void;
}

function EventCard({ event, compact = false, onAcknowledge }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const completeCascadeAction = useCrossModuleEventStore(s => s.completeCascadeAction);
  
  const sourceModule = MODULE_METADATA[event.sourceModule] ?? DEFAULT_MODULE_METADATA;
  const SourceIcon = sourceModule.icon;
  
  const timeSince = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const pendingActions = event.cascadeActions.filter(a => a.status === 'pending' || a.status === 'in-progress');
  const completedActions = event.cascadeActions.filter(a => a.status === 'completed');

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-surface-card rounded-lg border border-border hover:border-border-hover transition-colors">
        <div className={`p-1.5 rounded-lg bg-surface ${sourceModule?.color ?? ''}`}>
          <SourceIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">
            {EVENT_TYPE_NAMES[event.type]}
          </p>
          <p className="text-xs text-text-muted">
            {sourceModule.name} → {event.targetModules.map(m => (MODULE_METADATA[m] ?? DEFAULT_MODULE_METADATA).name).join(', ')}
          </p>
        </div>
        <span className="text-xs text-text-muted">{timeSince(event.timestamp)}</span>
      </div>
    );
  }

  return (
    <div 
      className={`bg-surface-card rounded-lg border border-border overflow-hidden transition-all ${
        event.metadata?.priority === 'critical' ? 'border-red-500/50' : ''
      }`}
    >
      {/* Header */}
      <div 
        className="p-4 cursor-pointer hover:bg-surface-elevated/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Source module icon */}
          <div className={`p-2 rounded-lg bg-surface ${sourceModule?.color ?? ''}`}>
            <SourceIcon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Event type */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-text-primary">
                {EVENT_TYPE_NAMES[event.type]}
              </h3>
              {event.metadata?.priority && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[event.metadata.priority]}`}>
                  {event.metadata.priority}
                </span>
              )}
              {event.metadata?.automated && (
                <span title="Automated">
                  <Zap className="w-3 h-3 text-amber-400" />
                </span>
              )}
            </div>
            
            {/* Flow indicator */}
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <span className={sourceModule.color}>{sourceModule.name}</span>
              <ArrowRight className="w-3 h-3" />
              {event.targetModules.map((moduleId, idx) => {
                const mod = MODULE_METADATA[moduleId] ?? DEFAULT_MODULE_METADATA;
                return (
                  <span key={moduleId} className="flex items-center gap-1">
                    {idx > 0 && <span className="text-text-muted">,</span>}
                    <span className={mod.color}>{mod.name}</span>
                  </span>
                );
              })}
            </div>
            
            {/* Payload preview */}
            {event.payload.product && (
              <p className="text-xs text-text-secondary mt-1">
                Product: <span className="text-accent-blue">{event.payload.product}</span>
                {event.payload.studyNumber && <> • Study: {event.payload.studyNumber}</>}
                {event.payload.signalName && <> • Signal: {event.payload.signalName}</>}
              </p>
            )}
          </div>
          
          {/* Time and expand */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">{timeSince(event.timestamp)}</span>
            <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>
        
        {/* Cascade action summary */}
        {pendingActions.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="text-blue-400">{pendingActions.length} actions in progress</span>
            </div>
            {completedActions.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-green-400">{completedActions.length} completed</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border bg-surface-elevated/30 p-4">
          {/* Cascade actions */}
          <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
            Cascade Actions
          </h4>
          <div className="space-y-2">
            {event.cascadeActions.map(action => {
              const targetMod = MODULE_METADATA[action.targetModule] ?? DEFAULT_MODULE_METADATA;
              const TargetIcon = targetMod.icon;
              
              return (
                <div 
                  key={action.id}
                  className="flex items-center gap-3 p-2.5 bg-surface rounded-lg"
                >
                  <div className={`p-1.5 rounded ${targetMod?.color ?? ''} bg-surface-card`}>
                    <TargetIcon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{action.description}</p>
                    <p className="text-xs text-text-muted">
                      {action.actionType} • {action.entityType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${ACTION_STATUS_COLORS[action.status]}`}>
                      {action.status === 'in-progress' && <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />}
                      {action.status === 'completed' && <Check className="w-3 h-3 inline mr-1" />}
                      {action.status === 'pending' && <Clock className="w-3 h-3 inline mr-1" />}
                      {action.status}
                    </span>
                    {action.status === 'pending' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          completeCascadeAction(event.id, action.id, `entity-${Date.now()}`);
                        }}
                        className="text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Payload details */}
          {Object.keys(event.payload).length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
                Event Data
              </h4>
              <pre className="text-xs text-text-secondary bg-surface p-2 rounded overflow-x-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CROSS-MODULE EVENT FEED
// ============================================================================

interface CrossModuleEventFeedProps {
  limit?: number;
  showHeader?: boolean;
  compact?: boolean;
  moduleFilter?: ModuleId;
}

export function CrossModuleEventFeed({ 
  limit = 10, 
  showHeader = true,
  compact = false,
  moduleFilter,
}: CrossModuleEventFeedProps) {
  const eventFeed = useCrossModuleEventFeed();
  const clearEventFeed = useCrossModuleEventStore(s => s.clearEventFeed);
  
  // Filter events if moduleFilter is provided
  const filteredEvents = moduleFilter
    ? eventFeed.filter(e => e.sourceModule === moduleFilter || e.targetModules.includes(moduleFilter))
    : eventFeed;
  
  const displayEvents = filteredEvents.slice(0, limit);

  if (displayEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">No cross-module events yet</p>
        <p className="text-xs text-text-muted mt-1">Events will appear here as data flows between modules</p>
      </div>
    );
  }

  return (
    <div>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent-purple" />
            <h3 className="text-sm font-semibold text-text-primary">Cross-Module Events</h3>
            {displayEvents.length > 0 && (
              <Badge color="purple" size="xs">{displayEvents.length}</Badge>
            )}
          </div>
          <button
            onClick={clearEventFeed}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors"
          >
            Clear
          </button>
        </div>
      )}
      
      <div className="space-y-3">
        {displayEvents.map(event => (
          <EventCard key={event.id} event={event} compact={compact} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// PENDING ACTIONS PANEL (For module-specific view)
// ============================================================================

interface PendingActionsPanelProps {
  moduleId: ModuleId;
  onActionComplete?: (eventId: string, actionId: string) => void;
}

export function PendingActionsPanel({ moduleId, onActionComplete }: PendingActionsPanelProps) {
  const pendingActions = usePendingActions(moduleId);
  const completeCascadeAction = useCrossModuleEventStore(s => s.completeCascadeAction);
  
  const moduleInfo = MODULE_METADATA[moduleId] ?? DEFAULT_MODULE_METADATA;
  const ModuleIcon = moduleInfo.icon;

  if (pendingActions.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-accent-amber" />
        <h3 className="text-sm font-semibold text-text-primary">
          Incoming Actions
        </h3>
        <Badge color="amber" size="xs">{pendingActions.length}</Badge>
      </div>
      
      <div className="space-y-2">
        {pendingActions.map(({ eventId, cascadeAction }) => (
          <div 
            key={cascadeAction.id}
            className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary">{cascadeAction.description}</p>
              <p className="text-xs text-text-muted">
                {cascadeAction.actionType} • {cascadeAction.entityType}
              </p>
            </div>
            <button
              onClick={() => {
                completeCascadeAction(eventId, cascadeAction.id, `entity-${Date.now()}`);
                onActionComplete?.(eventId, cascadeAction.id);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 rounded-lg transition-colors"
            >
              Complete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// CASCADE INDICATOR (Mini notification for toolbar)
// ============================================================================

interface CascadeIndicatorProps {
  onClick?: () => void;
}

export function CascadeIndicator({ onClick }: CascadeIndicatorProps) {
  const eventFeed = useCrossModuleEventFeed();
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastCount, setLastCount] = useState(0);
  
  // Animate when new events arrive
  useEffect(() => {
    if (eventFeed.length > lastCount) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      setLastCount(eventFeed.length);
      return () => clearTimeout(timer);
    }
  }, [eventFeed.length, lastCount]);

  const recentEvents = eventFeed.filter(e => {
    const age = Date.now() - new Date(e.timestamp).getTime();
    return age < 60000; // Last minute
  });

  if (recentEvents.length === 0) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      data-cascade-indicator
      className={`relative flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-purple/10 hover:bg-accent-purple/20 border border-accent-purple/30 rounded-lg transition-all ${
        isAnimating ? 'animate-pulse ring-2 ring-accent-purple/50' : ''
      }`}
    >
      <Sparkles className="w-3.5 h-3.5 text-accent-purple" />
      <span className="text-xs font-medium text-accent-purple">
        {recentEvents.length} cascade{recentEvents.length !== 1 ? 's' : ''}
      </span>
    </button>
  );
}

export default CrossModuleEventFeed;
