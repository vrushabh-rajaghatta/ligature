

/**
 * ActivityFeed - v127
 * 
 * Cross-module activity feed component displaying platform-wide events.
 * Features:
 * - Real-time activity stream
 * - Module-specific filtering
 * - Event causality visualization
 * - Severity-based styling
 * - Acknowledge/dismiss functionality
 */

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import {
  useActivityStore,
  useRecentActivity,
  ActivityModule,
  ActivityEvent,
  ActivitySeverity,
} from '@/store/useActivityStore';
import {
  Activity, Bell, Check, ChevronRight, Filter, X, ExternalLink,
  AlertTriangle, AlertCircle, Info, CheckCircle, Zap,
  FlaskConical, FileText, Send, MessageSquare, Shield, 
  Building2, Beaker, Tag, ClipboardList, FolderOpen, Cog,
  Clock, Link2, ArrowRight,
} from 'lucide-react';

// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

interface ActivityFeedProps {
  /** Max items to display */
  limit?: number;
  /** Filter by module */
  module?: ActivityModule;
  /** Filter by program */
  programId?: string;
  /** Show header */
  showHeader?: boolean;
  /** Compact mode for sidebars */
  compact?: boolean;
  /** Show filters */
  showFilters?: boolean;
  /** Show cascade chains */
  showChains?: boolean;
  /** Custom empty state */
  emptyMessage?: string;
  /** Loading state override */
  isLoading?: boolean;
}

const severityConfig: Record<ActivitySeverity, { 
  icon: React.ReactNode; 
  bg: string; 
  border: string;
  text: string;
}> = {
  critical: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: 'bg-accent-red/10',
    border: 'border-accent-red/30',
    text: 'text-accent-red',
  },
  high: {
    icon: <AlertCircle className="w-4 h-4" />,
    bg: 'bg-accent-amber/10',
    border: 'border-accent-amber/30',
    text: 'text-accent-amber',
  },
  medium: {
    icon: <Zap className="w-4 h-4" />,
    bg: 'bg-accent-blue/10',
    border: 'border-accent-blue/30',
    text: 'text-accent-blue',
  },
  low: {
    icon: <Info className="w-4 h-4" />,
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/30',
    text: 'text-slate-400',
  },
  info: {
    icon: <CheckCircle className="w-4 h-4" />,
    bg: 'bg-accent-green/10',
    border: 'border-accent-green/30',
    text: 'text-accent-green',
  },
};

const moduleConfig: Record<ActivityModule, { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
}> = {
  portfolio: { icon: <Building2 className="w-4 h-4" />, label: 'Portfolio', color: 'text-accent-purple' },
  authoring: { icon: <FileText className="w-4 h-4" />, label: 'Authoring', color: 'text-accent-blue' },
  submissions: { icon: <Send className="w-4 h-4" />, label: 'Submissions', color: 'text-accent-teal' },
  haq: { icon: <MessageSquare className="w-4 h-4" />, label: 'HAQ', color: 'text-accent-amber' },
  safety: { icon: <Shield className="w-4 h-4" />, label: 'Safety', color: 'text-accent-red' },
  clinical: { icon: <FlaskConical className="w-4 h-4" />, label: 'Clinical', color: 'text-accent-green' },
  quality: { icon: <ClipboardList className="w-4 h-4" />, label: 'Quality', color: 'text-accent-purple' },
  cmc: { icon: <Beaker className="w-4 h-4" />, label: 'CMC', color: 'text-accent-teal' },
  labeling: { icon: <Tag className="w-4 h-4" />, label: 'Labeling', color: 'text-accent-amber' },
  regulatory: { icon: <Building2 className="w-4 h-4" />, label: 'Regulatory', color: 'text-accent-blue' },
  tmf: { icon: <FolderOpen className="w-4 h-4" />, label: 'TMF', color: 'text-accent-purple' },
  publishing: { icon: <Send className="w-4 h-4" />, label: 'Publishing', color: 'text-accent-green' },
  admin: { icon: <Cog className="w-4 h-4" />, label: 'Admin', color: 'text-slate-400' },
  system: { icon: <Cog className="w-4 h-4" />, label: 'System', color: 'text-slate-400' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ActivityItemProps {
  event: ActivityEvent;
  compact?: boolean;
  showChain?: boolean;
  onAcknowledge?: (id: string) => void;
}

function ActivityItem({ event, compact, showChain, onAcknowledge }: ActivityItemProps) {
  const severity = severityConfig[event.severity];
  const module = moduleConfig[event.module];
  const hasChain = (event.triggeredBy || (event.triggers && event.triggers.length > 0));
  
  return (
    <div
      className={`
        group relative flex gap-3 p-3 rounded-lg transition-all
        ${event.acknowledged ? 'opacity-60' : ''}
        ${severity?.bg ?? ''} ${severity?.border ?? ''} border
        hover:border-opacity-50
      `}
    >
      {/* Severity indicator */}
      <div className={`flex-shrink-0 ${severity?.text ?? ''}`}>
        {severity.icon}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${module?.color ?? ''}`}>
                {module.label}
              </span>
              {event.programName && (
                <Badge color="gray" size="xs">{event.programName}</Badge>
              )}
              {event.applicationName && (
                <Badge color="blue" size="xs">{event.applicationName}</Badge>
              )}
            </div>
            
            <p className={`text-sm font-medium text-text-primary mt-1 ${compact ? 'truncate' : ''}`}>
              {event.title}
            </p>
            
            {!compact && (
              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
          
          {/* Time & actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-text-muted flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(event.timestamp)}
            </span>
            
            {!event.acknowledged && onAcknowledge && (
              <button
                onClick={() => onAcknowledge(event.id)}
                className="p-1 rounded hover:bg-surface-elevated opacity-0 group-hover:opacity-100 transition-opacity"
                title="Acknowledge"
              >
                <Check className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
          </div>
        </div>
        
        {/* Chain indicator */}
        {showChain && hasChain && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-text-muted">
            <Link2 className="w-3 h-3" />
            {event.triggeredBy && <span>Triggered by previous event</span>}
            {event.triggers && event.triggers.length > 0 && (
              <span>Triggered {event.triggers.length} cascade event{event.triggers.length > 1 ? 's' : ''}</span>
            )}
          </div>
        )}
        
        {/* Action link */}
        {event.actionModule && !compact && (
          <button className="mt-2 text-xs text-accent-blue hover:text-accent-blue/80 flex items-center gap-1">
            Go to {moduleConfig[event.actionModule]?.label ?? event.actionModule}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ActivityFeed({
  limit = 10,
  module,
  programId,
  showHeader = true,
  compact = false,
  showFilters = false,
  showChains = true,
  emptyMessage = 'No recent activity',
  isLoading: loadingOverride,
}: ActivityFeedProps) {
  const [selectedModule, setSelectedModule] = useState<ActivityModule | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<ActivitySeverity | 'all'>('all');
  const [showAcknowledged, setShowAcknowledged] = useState(false);
  
  const events = useActivityStore((s) => s.events);
  const acknowledgeEvent = useActivityStore((s) => s.acknowledgeEvent);
  const acknowledgeAll = useActivityStore((s) => s.acknowledgeAll);
  const getUnacknowledgedCount = useActivityStore((s) => s.getUnacknowledgedCount);
  
  // Simulate initial loading
  const [isLoading, setIsLoading] = useState(true);
  React.useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  const finalLoading = loadingOverride ?? isLoading;
  
  // Filter events
  const filteredEvents = useMemo(() => {
    let result = [...events];
    
    // Module filter (prop or selected)
    const moduleFilter = module || (selectedModule !== 'all' ? selectedModule : null);
    if (moduleFilter) {
      result = result.filter(e => e.module === moduleFilter);
    }
    
    // Program filter
    if (programId) {
      result = result.filter(e => e.programId === programId);
    }
    
    // Severity filter
    if (selectedSeverity !== 'all') {
      result = result.filter(e => e.severity === selectedSeverity);
    }
    
    // Acknowledged filter
    if (!showAcknowledged) {
      result = result.filter(e => !e.acknowledged);
    }
    
    return result.slice(0, limit);
  }, [events, module, selectedModule, programId, selectedSeverity, showAcknowledged, limit]);
  
  const unreadCount = getUnacknowledgedCount();
  
  // Module options for filter
  const moduleOptions: Array<{ value: ActivityModule | 'all'; label: string }> = [
    { value: 'all', label: 'All Modules' },
    { value: 'safety', label: 'Safety' },
    { value: 'clinical', label: 'Clinical' },
    { value: 'regulatory', label: 'Regulatory' },
    { value: 'haq', label: 'HAQ' },
    { value: 'authoring', label: 'Authoring' },
    { value: 'submissions', label: 'Submissions' },
    { value: 'quality', label: 'Quality' },
    { value: 'cmc', label: 'CMC' },
  ];
  
  return (
    <Card variant="elevated" padding={compact ? 'sm' : 'lg'} radius="lg">
      {showHeader && (
        <CardHeader
          title="Activity Feed"
          icon={<Activity className="w-5 h-5 text-accent-teal" />}
          action={
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge color="blue" size="sm">{unreadCount} new</Badge>
              )}
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={acknowledgeAll}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          }
        />
      )}
      
      {/* Filters */}
      {showFilters && !module && (
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
          <Filter className="w-4 h-4 text-text-muted" />
          
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value as ActivityModule | 'all')}
            className="text-sm bg-surface border border-border rounded-lg px-2 py-1"
          >
            {moduleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value as ActivitySeverity | 'all')}
            className="text-sm bg-surface border border-border rounded-lg px-2 py-1"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          
          <label className="flex items-center gap-1.5 text-sm text-text-muted cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showAcknowledged}
              onChange={(e) => setShowAcknowledged(e.target.checked)}
              className="rounded border-border"
            />
            Show acknowledged
          </label>
        </div>
      )}
      
      {/* Loading state */}
      {finalLoading ? (
        <ListSkeleton items={compact ? 3 : 5} showIcon showAction={false} />
      ) : filteredEvents.length > 0 ? (
        <div className="space-y-2">
          {filteredEvents.map((event) => (
            <ActivityItem
              key={event.id}
              event={event}
              compact={compact}
              showChain={showChains}
              onAcknowledge={acknowledgeEvent}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          type="no-data"
          size="sm"
          title={emptyMessage}
          icon={<Bell className="w-8 h-8" />}
        />
      )}
    </Card>
  );
}

// ============================================================================
// COMPACT VARIANTS
// ============================================================================

/**
 * Sidebar activity widget - compact version for sidebar panels
 */
export function ActivityWidget({ limit = 5 }: { limit?: number }) {
  return (
    <ActivityFeed
      limit={limit}
      compact
      showHeader
      showFilters={false}
      showChains={false}
    />
  );
}

/**
 * Module-specific activity - shows activity for a specific module
 */
export function ModuleActivity({ 
  module, 
  limit = 10 
}: { 
  module: ActivityModule; 
  limit?: number;
}) {
  const config = moduleConfig[module];
  
  return (
    <Card variant="elevated" padding="lg" radius="lg">
      <CardHeader
        title={`${config?.label ?? ''} Activity`}
        icon={<span className={config.color}>{config.icon}</span>}
      />
      <ActivityFeed
        module={module}
        limit={limit}
        showHeader={false}
        showFilters={false}
        showChains
      />
    </Card>
  );
}

/**
 * Critical activity alert - only shows critical unacknowledged events
 */
export function CriticalActivityAlert() {
  // Use shallow comparison to prevent infinite loops
  const events = useActivityStore((s) => s.events);
  const criticalEvents = events.filter(e => e.severity === 'critical' && !e.acknowledged);
  
  if (criticalEvents.length === 0) return null;
  
  return (
    <Card 
      variant="elevated" 
      padding="md" 
      radius="lg"
      className="border-accent-red/30 bg-accent-red/5"
    >
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-accent-red" />
        <span className="font-medium text-accent-red">
          {criticalEvents.length} Critical Alert{criticalEvents.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="space-y-2">
        {criticalEvents.slice(0, 3).map((event) => (
          <ActivityItem
            key={event.id}
            event={event}
            compact
            showChain={false}
          />
        ))}
      </div>
    </Card>
  );
}

export default ActivityFeed;
