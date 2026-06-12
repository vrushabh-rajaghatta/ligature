// ============================================================================
// LifecycleManagementPanel - v0.38.9
// UI for Submission Lifecycle & Archival Management
// ============================================================================


import React, { useState, useMemo, useCallback } from 'react';
import {
  Archive, Clock, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  ChevronRight, ChevronDown, Play, Pause, RotateCcw, FileText,
  Calendar, User, History, Shield, Trash2, Eye, MoreHorizontal,
  Loader2, Filter, Search, ArrowRight, Box, FolderArchive
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  useSubmissionLifecycleStore,
  SubmissionLifecycle,
  ArchivalTask,
  LifecycleEvent,
  LifecycleState,
} from '@/store/useSubmissionLifecycleStore';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATE_CONFIG: Record<LifecycleState, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  'draft': { label: 'Draft', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: FileText },
  'in-preparation': { label: 'In Preparation', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: FileText },
  'under-review': { label: 'Under Review', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Eye },
  'ready-to-submit': { label: 'Ready', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  'submitted': { label: 'Submitted', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: ArrowRight },
  'under-ha-review': { label: 'HA Review', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: Shield },
  'approved': { label: 'Approved', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  'rejected': { label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
  'withdrawn': { label: 'Withdrawn', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: XCircle },
  'archived': { label: 'Archived', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: Archive },
  'retired': { label: 'Retired', color: 'text-slate-500', bgColor: 'bg-slate-600/20', icon: Box },
};

const TASK_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'pending': { label: 'Pending', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'in-progress': { label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'completed': { label: 'Completed', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  'failed': { label: 'Failed', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'cancelled': { label: 'Cancelled', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

const REGION_FLAGS: Record<string, string> = {
  'US': '🇺🇸', 'EU': '🇪🇺', 'JP': '🇯🇵', 'CN': '🇨🇳', 'CA': '🇨🇦',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ArchivalTaskCard({
  task,
  onExecute,
  onCancel,
  isProcessing,
}: {
  task: ArchivalTask;
  onExecute: () => void;
  onCancel: () => void;
  isProcessing: boolean;
}) {
  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const daysUntil = Math.ceil(
    (new Date(task.scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isOverdue = daysUntil < 0;
  const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
  
  return (
    <div className={`
      p-4 rounded-lg border transition-all
      ${isOverdue ? 'border-red-500/50 bg-red-500/5' : 
        isDueSoon ? 'border-amber-500/50 bg-amber-500/5' : 
        'border-border bg-surface-elevated'}
    `}>
      <div className="flex items-start gap-4">
        <div className={`p-2 rounded-lg ${task.taskType === 'archive' ? 'bg-purple-500/20' : 'bg-amber-500/20'}`}>
          {task.taskType === 'archive' ? (
            <FolderArchive className="w-5 h-5 text-purple-400" />
          ) : (
            <Trash2 className="w-5 h-5 text-amber-400" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig?.color ?? ''}`}>
              {statusConfig.label}
            </span>
            <span className="text-xs text-text-muted capitalize">
              {task.taskType.replace('-', ' ')}
            </span>
          </div>
          
          <h4 className="font-medium text-text-primary text-sm">{task.productName}</h4>
          <p className="text-xs text-text-muted">{task.applicationNumber}</p>
          
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1 text-text-muted">
              <Calendar className="w-3 h-3" />
              Scheduled: {task.scheduledFor}
            </span>
            {task.documentCount && (
              <span className="flex items-center gap-1 text-text-muted">
                <FileText className="w-3 h-3" />
                {task.documentCount} documents
              </span>
            )}
          </div>
          
          {isOverdue && (
            <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Overdue by {Math.abs(daysUntil)} days
            </div>
          )}
        </div>
        
        {task.status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={onExecute}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Play className="w-3 h-3 mr-1" />
                  Execute
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isProcessing}
            >
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {task.status === 'completed' && task.completedAt && (
          <span className="text-xs text-green-400">
            Completed {new Date(task.completedAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

function LifecycleCard({
  lifecycle,
  onArchive,
  onRestore,
  onViewHistory,
  isExpanded,
  onToggle,
}: {
  lifecycle: SubmissionLifecycle;
  onArchive: () => void;
  onRestore: () => void;
  onViewHistory: () => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const stateConfig = STATE_CONFIG[lifecycle.currentState];
  const StateIcon = stateConfig.icon;
  
  return (
    <div className="rounded-lg border border-border bg-surface-elevated">
      <button
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-center gap-4">
          <span className="text-lg">{REGION_FLAGS[lifecycle.region] || '🌐'}</span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded ${stateConfig.bgColor} ${stateConfig?.color ?? ''} flex items-center gap-1`}>
                <StateIcon className="w-3 h-3" />
                {stateConfig.label}
              </span>
              <span className="text-xs text-text-muted">v{lifecycle.version}</span>
              {lifecycle.isArchivalPending && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                  Archival Scheduled
                </span>
              )}
            </div>
            
            <h4 className="font-medium text-text-primary text-sm">{lifecycle.productName}</h4>
            <p className="text-xs text-text-muted">
              {lifecycle.applicationNumber} • {lifecycle.sequenceNumber} • {lifecycle.submissionType}
            </p>
          </div>
          
          <div className="text-right">
            {lifecycle.approvedAt && (
              <div className="text-xs text-text-muted">
                Approved: {lifecycle.approvedAt}
              </div>
            )}
            {lifecycle.retentionExpiresAt && (
              <div className="text-xs text-text-muted">
                Retention: {lifecycle.retentionExpiresAt}
              </div>
            )}
          </div>
          
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-text-muted" />
          ) : (
            <ChevronRight className="w-4 h-4 text-text-muted" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="border-t border-border p-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-text-muted mb-1">Created</div>
              <div className="text-sm text-text-secondary">{lifecycle.createdAt}</div>
            </div>
            {lifecycle.submittedAt && (
              <div>
                <div className="text-xs text-text-muted mb-1">Submitted</div>
                <div className="text-sm text-text-secondary">{lifecycle.submittedAt}</div>
              </div>
            )}
            {lifecycle.archivedAt && (
              <div>
                <div className="text-xs text-text-muted mb-1">Archived</div>
                <div className="text-sm text-text-secondary">{lifecycle.archivedAt}</div>
              </div>
            )}
            {lifecycle.archivalScheduledFor && (
              <div>
                <div className="text-xs text-text-muted mb-1">Archival Scheduled</div>
                <div className="text-sm text-amber-400">{lifecycle.archivalScheduledFor}</div>
              </div>
            )}
          </div>
          
          {lifecycle.archivalNotes && (
            <div className="mb-4 p-3 bg-surface-card rounded text-sm text-text-muted">
              <strong>Archival Notes:</strong> {lifecycle.archivalNotes}
            </div>
          )}
          
          {lifecycle.documentsRetired.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-text-muted mb-2">Retired Documents</div>
              <div className="flex flex-wrap gap-1">
                {lifecycle.documentsRetired.map(docId => (
                  <span key={docId} className="text-xs px-2 py-1 bg-surface-card rounded text-text-secondary">
                    {docId}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onViewHistory}>
              <History className="w-4 h-4 mr-1" />
              View History
            </Button>
            
            {lifecycle.currentState === 'archived' ? (
              <Button variant="secondary" size="sm" onClick={onRestore}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Restore
              </Button>
            ) : lifecycle.currentState === 'approved' && !lifecycle.isArchivalPending ? (
              <Button variant="secondary" size="sm" onClick={onArchive}>
                <Archive className="w-4 h-4 mr-1" />
                Archive Now
              </Button>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function EventHistoryModal({
  isOpen,
  onClose,
  events,
  submissionName,
}: {
  isOpen: boolean;
  onClose: () => void;
  events: LifecycleEvent[];
  submissionName: string;
}) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-elevated rounded-xl border border-border w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">Lifecycle History</h3>
            <p className="text-sm text-text-muted">{submissionName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="space-y-3">
            {events.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-3 bg-surface-card rounded-lg">
                <div className="w-2 h-2 mt-2 rounded-full bg-accent-blue" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary capitalize">
                      {event.eventType.replace('-', ' ')}
                    </span>
                    {event.fromState && event.toState && (
                      <span className="text-xs text-text-muted">
                        {event.fromState} → {event.toState}
                      </span>
                    )}
                  </div>
                  {event.reason && (
                    <p className="text-sm text-text-secondary">{event.reason}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {event.userName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type ViewTab = 'queue' | 'active' | 'archived' | 'all';

interface LifecycleManagementPanelProps {
  onNavigateToSubmission?: (submissionId: string) => void;
}

export function LifecycleManagementPanel({ onNavigateToSubmission }: LifecycleManagementPanelProps) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<ViewTab>('queue');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyModal, setHistoryModal] = useState<{ submissionId: string; name: string } | null>(null);
  
  // Store
  const {
    lifecycles,
    lifecycleIndex,
    archivalTasks,
    isProcessing,
    executeArchival,
    cancelArchival,
    restoreFromArchive,
    getEventHistory,
    processScheduledArchivals,
  } = useSubmissionLifecycleStore();
  
  // Computed
  const pendingTasks = useMemo(() =>
    archivalTasks.filter(t => t.status === 'pending'),
    [archivalTasks]
  );
  
  const activeSubmissions = useMemo(() =>
    lifecycleIndex
      .map(id => lifecycles[id])
      .filter(l => l && !['archived', 'retired', 'withdrawn'].includes(l.currentState)),
    [lifecycles, lifecycleIndex]
  );
  
  const archivedSubmissions = useMemo(() =>
    lifecycleIndex
      .map(id => lifecycles[id])
      .filter(l => l && l.currentState === 'archived'),
    [lifecycles, lifecycleIndex]
  );
  
  const allSubmissions = useMemo(() =>
    lifecycleIndex.map(id => lifecycles[id]).filter(Boolean),
    [lifecycles, lifecycleIndex]
  );
  
  // Filtered by search
  const filteredSubmissions = useMemo(() => {
    const list = activeTab === 'active' ? activeSubmissions :
                 activeTab === 'archived' ? archivedSubmissions :
                 activeTab === 'all' ? allSubmissions : [];
    
    if (!searchQuery) return list;
    
    const query = searchQuery.toLowerCase();
    return list.filter(l =>
      l.productName.toLowerCase().includes(query) ||
      l.applicationNumber.toLowerCase().includes(query)
    );
  }, [activeTab, activeSubmissions, archivedSubmissions, allSubmissions, searchQuery]);
  
  // Stats
  const stats = useMemo(() => ({
    pendingTasks: pendingTasks.length,
    active: activeSubmissions.length,
    archived: archivedSubmissions.length,
    pendingArchival: activeSubmissions.filter(l => l.isArchivalPending).length,
  }), [pendingTasks, activeSubmissions, archivedSubmissions]);
  
  // Handlers
  const handleExecuteTask = useCallback(async (task: ArchivalTask) => {
    await executeArchival(task.submissionId, 'current-user', 'Current User', 'Executed from lifecycle panel');
    toast.success(`Archived ${task.productName} (${task.applicationNumber})`);
  }, [executeArchival, toast]);
  
  const handleCancelTask = useCallback((task: ArchivalTask) => {
    cancelArchival(task.submissionId, 'current-user', 'Current User', 'Cancelled from lifecycle panel');
    toast.info(`Cancelled archival for ${task.productName}`);
  }, [cancelArchival, toast]);
  
  const handleArchiveNow = useCallback(async (lifecycle: SubmissionLifecycle) => {
    await executeArchival(lifecycle.submissionId, 'current-user', 'Current User', 'Manual archive');
    toast.success(`Archived ${lifecycle.productName}`);
  }, [executeArchival, toast]);
  
  const handleRestore = useCallback((lifecycle: SubmissionLifecycle) => {
    restoreFromArchive(lifecycle.submissionId, 'current-user', 'Current User', 'Restored from lifecycle panel');
    toast.success(`Restored ${lifecycle.productName} from archive`);
  }, [restoreFromArchive, toast]);
  
  const handleProcessAll = useCallback(async () => {
    const count = await processScheduledArchivals('current-user', 'Current User');
    toast.success(`Processed ${count} scheduled archivals`);
  }, [processScheduledArchivals, toast]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Archive className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Lifecycle Management</h2>
              <p className="text-sm text-text-muted">Archival workflows and document retirement</p>
            </div>
          </div>
          
          {pendingTasks.length > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleProcessAll}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Process All ({pendingTasks.length})
            </Button>
          )}
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setActiveTab('queue')}
            className={`p-3 rounded-lg text-center transition-all ${
              activeTab === 'queue' ? 'bg-amber-500/20 ring-1 ring-amber-500/50' : 'bg-surface-card hover:bg-surface-elevated'
            }`}
          >
            <div className={`text-2xl font-bold ${activeTab === 'queue' ? 'text-amber-400' : 'text-text-primary'}`}>
              {stats.pendingTasks}
            </div>
            <div className="text-xs text-text-muted">Pending Tasks</div>
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={`p-3 rounded-lg text-center transition-all ${
              activeTab === 'active' ? 'bg-blue-500/20 ring-1 ring-blue-500/50' : 'bg-surface-card hover:bg-surface-elevated'
            }`}
          >
            <div className={`text-2xl font-bold ${activeTab === 'active' ? 'text-blue-400' : 'text-text-primary'}`}>
              {stats.active}
            </div>
            <div className="text-xs text-text-muted">Active</div>
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`p-3 rounded-lg text-center transition-all ${
              activeTab === 'archived' ? 'bg-purple-500/20 ring-1 ring-purple-500/50' : 'bg-surface-card hover:bg-surface-elevated'
            }`}
          >
            <div className={`text-2xl font-bold ${activeTab === 'archived' ? 'text-purple-400' : 'text-text-primary'}`}>
              {stats.archived}
            </div>
            <div className="text-xs text-text-muted">Archived</div>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`p-3 rounded-lg text-center transition-all ${
              activeTab === 'all' ? 'bg-slate-500/20 ring-1 ring-slate-500/50' : 'bg-surface-card hover:bg-surface-elevated'
            }`}
          >
            <div className={`text-2xl font-bold ${activeTab === 'all' ? 'text-slate-300' : 'text-text-primary'}`}>
              {allSubmissions.length}
            </div>
            <div className="text-xs text-text-muted">Total</div>
          </button>
        </div>
      </div>
      
      {/* Search (for non-queue tabs) */}
      {activeTab !== 'queue' && (
        <div className="p-3 border-b border-border bg-surface-card">
          <SearchInput
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product or application number..."
            className="w-full"
          />
        </div>
      )}
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'queue' && (
          <div className="space-y-3">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pending archival tasks</p>
                <p className="text-sm mt-1">Submissions will appear here when scheduled for archival</p>
              </div>
            ) : (
              pendingTasks.map(task => (
                <ArchivalTaskCard
                  key={task.id}
                  task={task}
                  onExecute={() => handleExecuteTask(task)}
                  onCancel={() => handleCancelTask(task)}
                  isProcessing={isProcessing}
                />
              ))
            )}
          </div>
        )}
        
        {activeTab !== 'queue' && (
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="p-8 text-center text-text-muted">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No submissions found</p>
              </div>
            ) : (
              filteredSubmissions.map(lifecycle => (
                <LifecycleCard
                  key={lifecycle.submissionId}
                  lifecycle={lifecycle}
                  isExpanded={expandedId === lifecycle.submissionId}
                  onToggle={() => setExpandedId(
                    expandedId === lifecycle.submissionId ? null : lifecycle.submissionId
                  )}
                  onArchive={() => handleArchiveNow(lifecycle)}
                  onRestore={() => handleRestore(lifecycle)}
                  onViewHistory={() => setHistoryModal({
                    submissionId: lifecycle.submissionId,
                    name: `${lifecycle.productName} (${lifecycle.applicationNumber})`,
                  })}
                />
              ))
            )}
          </div>
        )}
      </div>
      
      {/* History Modal */}
      {historyModal && (
        <EventHistoryModal
          isOpen={true}
          onClose={() => setHistoryModal(null)}
          events={getEventHistory(historyModal.submissionId)}
          submissionName={historyModal.name}
        />
      )}
    </div>
  );
}

export default LifecycleManagementPanel;
