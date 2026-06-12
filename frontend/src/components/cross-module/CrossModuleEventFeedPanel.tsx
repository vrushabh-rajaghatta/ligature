

/**
 * Cross-Module Event Feed Panel
 * 
 * Real-time activity feed showing cross-module events for a specific module.
 * Uses the domain-driven event system from useCrossModuleStore.
 * 
 * @module components/cross-module/CrossModuleEventFeedPanel
 * @version 0.27.46
 */

import { useState, useMemo } from 'react';
import {
  Activity, ArrowRight, AlertTriangle, CheckCircle2, Clock, XCircle,
  FileText, Shield, Package, Beaker, FlaskConical, BookOpen, Send,
  ChevronRight, ChevronDown, Filter, RefreshCw, Bell, BellOff,
  Database, Archive, BarChart3, ClipboardList, FolderOpen, FileQuestion,
  Layers, Microscope, TestTube, Building2, LinkIcon, Workflow,
  ClipboardCheck,
  Sparkles,
  Link,
} from 'lucide-react';
import {
  useModuleEvents,
  useCrossModuleStore,
  type ModuleType,
  type CrossModuleEventType,
  MODULE_LABELS,
  MODULE_SHORT_LABELS,
} from '@/store/useCrossModuleStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// =============================================================================
// MODULE ICONS & COLORS
// =============================================================================

const MODULE_METADATA: Record<ModuleType, { icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  authoring: { icon: BookOpen, color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
  haq: { icon: FileQuestion, color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  submissions: { icon: Send, color: 'text-green-400', bgColor: 'bg-green-500/20' },
  regulatory: { icon: FileText, color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
  labeling: { icon: Package, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  ctms: { icon: Activity, color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  tmf: { icon: FolderOpen, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
  edc: { icon: Database, color: 'text-sky-400', bgColor: 'bg-sky-500/20' },
  safety: { icon: Shield, color: 'text-red-400', bgColor: 'bg-red-500/20' },
  quality: { icon: CheckCircle2, color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
  psmf: { icon: ClipboardList, color: 'text-rose-400', bgColor: 'bg-rose-500/20' },
  eln: { icon: Microscope, color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  glp: { icon: FlaskConical, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  'sample-management': { icon: TestTube, color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
  idmp: { icon: Layers, color: 'text-lime-400', bgColor: 'bg-lime-500/20' },
  'master-data': { icon: Building2, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  'study-intel': { icon: BarChart3, color: 'text-fuchsia-400', bgColor: 'bg-fuchsia-500/20' },
  archives: { icon: Archive, color: 'text-stone-400', bgColor: 'bg-stone-500/20' },
  'document-control': { icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
  qms: { icon: Shield, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
  audit: { icon: ClipboardCheck, color: 'text-teal-400', bgColor: 'bg-teal-500/20' },
  executive: { icon: BarChart3, color: 'text-violet-400', bgColor: 'bg-violet-500/20' },
};

// Event type display names and icons
const EVENT_TYPE_CONFIG: Record<CrossModuleEventType, { label: string; icon: React.ComponentType<{ className?: string }>; severity: 'info' | 'success' | 'warning' | 'error' }> = {
  'entity-created': { label: 'Created', icon: CheckCircle2, severity: 'success' },
  'entity-updated': { label: 'Updated', icon: RefreshCw, severity: 'info' },
  'entity-deleted': { label: 'Deleted', icon: XCircle, severity: 'warning' },
  'entity-status-changed': { label: 'Status Changed', icon: Activity, severity: 'info' },
  'workflow-started': { label: 'Workflow Started', icon: Workflow, severity: 'info' },
  'workflow-step-completed': { label: 'Step Completed', icon: CheckCircle2, severity: 'success' },
  'workflow-completed': { label: 'Workflow Completed', icon: CheckCircle2, severity: 'success' },
  'workflow-failed': { label: 'Workflow Failed', icon: XCircle, severity: 'error' },
  'data-available': { label: 'Data Available', icon: Database, severity: 'info' },
  'data-locked': { label: 'Data Locked', icon: Shield, severity: 'warning' },
  'data-released': { label: 'Data Released', icon: CheckCircle2, severity: 'success' },
  'signature-applied': { label: 'Signed', icon: CheckCircle2, severity: 'success' },
  'approval-granted': { label: 'Approved', icon: CheckCircle2, severity: 'success' },
  'deviation-detected': { label: 'Deviation', icon: AlertTriangle, severity: 'warning' },
  'deadline-approaching': { label: 'Deadline Approaching', icon: Clock, severity: 'warning' },
  'deadline-missed': { label: 'Deadline Missed', icon: AlertTriangle, severity: 'error' },
  'threshold-exceeded': { label: 'Threshold Exceeded', icon: AlertTriangle, severity: 'warning' },
  'document-archived': { label: 'Document Archived', icon: Archive, severity: 'info' as const },
  'review-cycle-initiated': { label: 'Review Cycle Initiated', icon: ClipboardCheck, severity: 'info' as const },
  'capa-closed': { label: 'CAPA Closed', icon: CheckCircle2, severity: 'success' as const },
  'deviation-requires-capa': { label: 'Deviation Requires CAPA', icon: AlertTriangle, severity: 'warning' as const },
  'critical-deviation': { label: 'Critical Deviation', icon: AlertTriangle, severity: 'error' as const },
  'signal-validated': { label: 'Signal Validated', icon: Activity, severity: 'warning' as const },
  'tmf-artifact-approved': { label: 'TMF Artifact Approved', icon: CheckCircle2, severity: 'success' as const },
  'tmf-qc-failed': { label: 'TMF QC Failed', icon: AlertTriangle, severity: 'error' as const },
  'tmf-artifact-auto-linked': { label: 'TMF Artifact Auto-linked', icon: Link, severity: 'info' as const },
  'tmf-gap-status-changed': { label: 'TMF Gap Status Changed', icon: Activity, severity: 'info' as const },
  'tmf-gap-resolved': { label: 'TMF Gap Resolved', icon: CheckCircle2, severity: 'success' as const },
  'tmf-gap-identified': { label: 'TMF Gap Identified', icon: AlertTriangle, severity: 'warning' as const },
  'inspection-report-generated': { label: 'Inspection Report Generated', icon: FileText, severity: 'info' as const },
  'safety-signal-confirmed': { label: 'Safety Signal Confirmed', icon: AlertTriangle, severity: 'error' as const },
  'safety-signal-detected': { label: 'Safety Signal Detected', icon: Activity, severity: 'warning' as const },
  'icsr-submitted': { label: 'ICSR Submitted', icon: Send, severity: 'success' as const },
  'aggregate-report-due': { label: 'Aggregate Report Due', icon: FileText, severity: 'warning' as const },
  'capa-created': { label: 'CAPA Created', icon: Shield, severity: 'info' as const },
  'demo-ai-generate-section': { label: 'AI Section Generation', icon: Sparkles, severity: 'info' as const },
  'demo-glp-cascade': { label: 'GLP Cascade Demo', icon: Activity, severity: 'info' as const },

};

const SEVERITY_COLORS = {
  info: 'border-blue-500/30 bg-blue-500/10',
  success: 'border-green-500/30 bg-green-500/10',
  warning: 'border-amber-500/30 bg-amber-500/10',
  error: 'border-red-500/30 bg-red-500/10',
};

const SEVERITY_ICON_COLORS = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-amber-400',
  error: 'text-red-400',
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// =============================================================================
// EVENT CARD COMPONENT
// =============================================================================

interface EventCardProps {
  event: {
    id: string;
    eventType: CrossModuleEventType;
    sourceModule: ModuleType;
    targetModules: ModuleType[];
    entityType: string;
    entityId: string;
    description: string;
    payload: Record<string, unknown>;
    timestamp: string;
    triggeredBy?: string;
    correlationId?: string;
  };
  compact?: boolean;
}

function EventCard({ event, compact = false }: EventCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const sourceModule = MODULE_METADATA[event.sourceModule];
  const eventConfig = EVENT_TYPE_CONFIG[event.eventType];
  const SourceIcon = sourceModule.icon;
  const EventIcon = eventConfig.icon;
  
  return (
    <div className={`border rounded-lg transition-all ${SEVERITY_COLORS[eventConfig.severity]} ${compact ? 'p-2' : 'p-3'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Source module icon */}
        <div className={`p-1.5 rounded ${sourceModule.bgColor}`}>
          <SourceIcon className={`w-4 h-4 ${sourceModule?.color ?? ''}`} />
        </div>
        
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Event description */}
          <p className="text-sm text-slate-200 leading-snug">{event.description}</p>
          
          {/* Metadata row */}
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            {/* Event type badge */}
            <div className="flex items-center gap-1">
              <EventIcon className={`w-3 h-3 ${SEVERITY_ICON_COLORS[eventConfig.severity]}`} />
              <span className={`text-xs ${SEVERITY_ICON_COLORS[eventConfig.severity]}`}>{eventConfig.label}</span>
            </div>
            
            {/* Source → Target flow */}
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span className={sourceModule.color}>{MODULE_SHORT_LABELS[event.sourceModule]}</span>
              {event.targetModules.length > 0 && (
                <>
                  <ArrowRight className="w-3 h-3" />
                  <span>
                    {event.targetModules.slice(0, 2).map(m => MODULE_SHORT_LABELS[m]).join(', ')}
                    {event.targetModules.length > 2 && ` +${event.targetModules.length - 2}`}
                  </span>
                </>
              )}
            </div>
            
            {/* Timestamp */}
            <span className="text-xs text-slate-500">{formatTimestamp(event.timestamp)}</span>
          </div>
        </div>
        
        {/* Expand button (if payload has content) */}
        {Object.keys(event.payload).length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/5 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>
        )}
      </div>
      
      {/* Expanded payload */}
      {isExpanded && Object.keys(event.payload).length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(event.payload).map(([key, value]) => (
              <div key={key} className="text-xs">
                <span className="text-slate-500">{key}:</span>
                <span className="text-slate-300 ml-1">
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
          {event.correlationId && (
            <div className="text-xs text-slate-500 mt-2">
              <LinkIcon className="w-3 h-3 inline mr-1" />
              Correlation: {event.correlationId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface CrossModuleEventFeedPanelProps {
  /** Module to filter events for (null = all modules) */
  module?: ModuleType;
  /** Maximum number of events to display */
  limit?: number;
  /** Compact display mode */
  compact?: boolean;
  /** Show filter controls */
  showFilters?: boolean;
  /** Title override */
  title?: string;
  /** CSS class for container */
  className?: string;
}

export function CrossModuleEventFeedPanel({
  module,
  limit = 20,
  compact = false,
  showFilters = true,
  title = 'Activity Feed',
  className = '',
}: CrossModuleEventFeedPanelProps) {
  const [eventTypeFilter, setEventTypeFilter] = useState<CrossModuleEventType | 'all'>('all');
  const [isLive, setIsLive] = useState(true);
  
  // Get events from store
  const allEvents = useCrossModuleStore(state => state.recentEvents);
  
  // Filter events
  const filteredEvents = useMemo(() => {
    let events = module
      ? allEvents.filter(e => 
          e.sourceModule === module || 
          e.targetModules.length === 0 || 
          e.targetModules.includes(module)
        )
      : allEvents;
    
    if (eventTypeFilter !== 'all') {
      events = events.filter(e => e.eventType === eventTypeFilter);
    }
    
    return events.slice(0, limit);
  }, [allEvents, module, eventTypeFilter, limit]);
  
  // Count by event type for filter badges
  const eventTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEvents.forEach(e => {
      counts[e.eventType] = (counts[e.eventType] || 0) + 1;
    });
    return counts;
  }, [filteredEvents]);
  
  // Get unique event types for filter dropdown
  const availableEventTypes = useMemo(() => {
    const types = new Set(allEvents.map(e => e.eventType));
    return Array.from(types);
  }, [allEvents]);
  
  return (
    <div className={`bg-slate-800/50 rounded-lg border border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-medium text-white">{title}</h3>
          {module && (
            <Badge variant="outline" className="text-xs">
              {MODULE_LABELS[module]}
            </Badge>
          )}
          <Badge variant={filteredEvents.length > 0 ? 'default' : 'outline'} className="text-xs">
            {filteredEvents.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Live toggle */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`p-1.5 rounded transition-colors ${isLive ? 'text-green-400 bg-green-500/10' : 'text-slate-400 hover:bg-white/5'}`}
            title={isLive ? 'Live updates on' : 'Live updates off'}
          >
            {isLive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* Filters */}
      {showFilters && availableEventTypes.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-700/50 flex items-center gap-2 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          <button
            onClick={() => setEventTypeFilter('all')}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              eventTypeFilter === 'all' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-slate-400 hover:bg-white/5'
            }`}
          >
            All
          </button>
          {availableEventTypes.slice(0, 5).map(type => {
            const config = EVENT_TYPE_CONFIG[type];
            return (
              <button
                key={type}
                onClick={() => setEventTypeFilter(type)}
                className={`px-2 py-0.5 rounded text-xs transition-colors whitespace-nowrap ${
                  eventTypeFilter === type 
                    ? `${SEVERITY_COLORS[config.severity]}` 
                    : 'text-slate-400 hover:bg-white/5'
                }`}
              >
                {config.label}
                {eventTypeCounts[type] && (
                  <span className="ml-1 text-slate-500">({eventTypeCounts[type]})</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* Event list */}
      <div className={`overflow-y-auto ${compact ? 'max-h-64' : 'max-h-96'}`}>
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-500">
            <Activity className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No events yet</p>
            <p className="text-xs mt-1">Activity will appear here in real-time</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} compact={compact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CrossModuleEventFeedPanel;
