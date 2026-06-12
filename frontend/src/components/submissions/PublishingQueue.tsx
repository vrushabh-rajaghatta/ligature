
/**
 * PublishingQueue Component
 * Comprehensive queue management UI for submissions publishing workflow
 * Version: 0.13.38
 */


import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ListOrdered,
  Play,
  Pause,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Loader2,
  Send,
  FileCheck,
  Package,
  Upload,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Plus,
  Trash2,
  RotateCcw,
  Globe,
  Filter,
  Search,
  ArrowUp,
  ArrowDown,
  Zap,
} from 'lucide-react';
import { 
  submissionsApi, 
  QueueItem, 
  QueueItemStatus, 
  QueueStats,
  Submission 
} from '@/lib/submissions-api';

// =============================================================================
// TYPES
// =============================================================================

interface PublishingQueueProps {
  onItemClick?: (item: QueueItem) => void;
  onClose?: () => void;
}

interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<QueueItemStatus, StatusConfig> = {
  pending: { 
    label: 'Pending', 
    color: 'text-slate-400', 
    bgColor: 'bg-slate-500/20', 
    icon: <Clock className="w-4 h-4" /> 
  },
  validating: { 
    label: 'Validating', 
    color: 'text-accent-amber', 
    bgColor: 'bg-accent-amber/20', 
    icon: <Loader2 className="w-4 h-4 animate-spin" /> 
  },
  validated: { 
    label: 'Validated', 
    color: 'text-accent-green', 
    bgColor: 'bg-accent-green/20', 
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  validation_failed: { 
    label: 'Validation Failed', 
    color: 'text-accent-red', 
    bgColor: 'bg-accent-red/20', 
    icon: <XCircle className="w-4 h-4" /> 
  },
  publishing: { 
    label: 'Publishing', 
    color: 'text-accent-blue', 
    bgColor: 'bg-accent-blue/20', 
    icon: <Upload className="w-4 h-4 animate-pulse" /> 
  },
  completed: { 
    label: 'Completed', 
    color: 'text-accent-green', 
    bgColor: 'bg-accent-green/20', 
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  failed: { 
    label: 'Failed', 
    color: 'text-accent-red', 
    bgColor: 'bg-accent-red/20', 
    icon: <XCircle className="w-4 h-4" /> 
  },
};

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: 'text-red-500', bgColor: 'bg-red-500/20', icon: <Zap className="w-3 h-3" /> },
  high: { label: 'High', color: 'text-orange-500', bgColor: 'bg-orange-500/20', icon: <ArrowUp className="w-3 h-3" /> },
  normal: { label: 'Normal', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: null },
  low: { label: 'Low', color: 'text-slate-500', bgColor: 'bg-slate-500/10', icon: <ArrowDown className="w-3 h-3" /> },
};

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

function QueueStatsBar({ stats }: { stats: QueueStats }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-surface-card border-b border-border text-sm">
      <span className="text-text-secondary">
        <span className="font-medium text-text-primary">{stats.total}</span> Total
      </span>
      <span className="text-text-muted">|</span>
      <span className="text-slate-400">
        <Clock className="w-3 h-3 inline mr-1" />
        {stats.pending} Pending
      </span>
      <span className="text-accent-amber">
        <Loader2 className="w-3 h-3 inline mr-1" />
        {stats.validating} Validating
      </span>
      <span className="text-accent-green">
        <CheckCircle className="w-3 h-3 inline mr-1" />
        {stats.validated} Ready
      </span>
      <span className="text-accent-blue">
        <Upload className="w-3 h-3 inline mr-1" />
        {stats.publishing} Publishing
      </span>
      <span className="text-accent-green">
        <FileCheck className="w-3 h-3 inline mr-1" />
        {stats.completed} Done
      </span>
      {(stats.validationFailed + stats.failed) > 0 && (
        <span className="text-accent-red">
          <XCircle className="w-3 h-3 inline mr-1" />
          {stats.validationFailed + stats.failed} Failed
        </span>
      )}
    </div>
  );
}

function QueueItemRow({ 
  item, 
  isExpanded, 
  onToggle, 
  onRetry, 
  onRemove,
  onPublish,
}: { 
  item: QueueItem; 
  isExpanded: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onRemove: () => void;
  onPublish: () => void;
}) {
  const status = STATUS_CONFIG[item.status];
  const priority = PRIORITY_CONFIG[item.priority];
  
  const showProgress = ['validating', 'publishing'].includes(item.status);
  const canRetry = ['validation_failed', 'failed'].includes(item.status);
  const canPublish = item.status === 'validated';
  const canRemove = ['pending', 'validation_failed', 'failed', 'completed'].includes(item.status);
  
  return (
    <div className="border-b border-border last:border-b-0">
      {/* Main Row */}
      <div 
        className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated/50 cursor-pointer"
        onClick={onToggle}
      >
        {/* Expand Icon */}
        <button className="text-text-muted hover:text-text-primary">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        {/* Status Icon */}
        <div className={status.color}>{status.icon}</div>
        
        {/* Priority Badge */}
        {item.priority !== 'normal' && (
          <span className={`text-xs px-1.5 py-0.5 rounded ${priority.bgColor} ${priority?.color ?? ''} flex items-center gap-1`}>
            {priority.icon}
            {priority.label}
          </span>
        )}
        
        {/* Submission Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary truncate">{item.productName}</span>
            <span className="text-xs text-text-muted font-mono">{item.applicationNumber}</span>
            <span className="text-xs text-text-muted">Seq {item.sequenceNumber}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span>{item.submissionType}</span>
            <span>•</span>
            <span>{item.region}</span>
            {item.gatewayTarget && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {item.gatewayTarget}
                </span>
              </>
            )}
          </div>
        </div>
        
        {/* Progress/Status */}
        <div className="flex items-center gap-3">
          {showProgress && (
            <div className="w-32">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>{item.currentStep}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="h-1.5 bg-surface-card rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    item.status === 'validating' ? 'bg-accent-amber' : 'bg-accent-blue'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}
          
          {item.status === 'completed' && item.acknowledgementNumber && (
            <span className="text-xs font-mono text-accent-green bg-accent-green/10 px-2 py-1 rounded">
              {item.acknowledgementNumber}
            </span>
          )}
          
          <span className={`text-xs px-2 py-1 rounded ${status.bgColor} ${status?.color ?? ''}`}>
            {status.label}
          </span>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          {canPublish && (
            <button
              onClick={onPublish}
              className="p-1.5 text-accent-blue hover:bg-accent-blue/10 rounded"
              title="Publish"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
          {canRetry && (
            <button
              onClick={onRetry}
              className="p-1.5 text-accent-amber hover:bg-accent-amber/10 rounded"
              title="Retry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-12 pb-4 bg-surface-elevated/30">
          <div className="grid grid-cols-4 gap-4 text-sm">
            {/* Validation Results */}
            {(item.ectdErrors !== undefined || item.pdfErrors !== undefined) && (
              <div className="space-y-2">
                <h4 className="text-xs text-text-muted font-medium uppercase">Validation Results</h4>
                <div className="space-y-1">
                  {item.ectdErrors !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">eCTD:</span>
                      {item.ectdErrors > 0 ? (
                        <span className="text-accent-red">{item.ectdErrors} errors</span>
                      ) : (
                        <span className="text-accent-green">Passed</span>
                      )}
                      {item.ectdWarnings && item.ectdWarnings > 0 && (
                        <span className="text-accent-amber">{item.ectdWarnings} warnings</span>
                      )}
                    </div>
                  )}
                  {item.pdfErrors !== undefined && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">PDF:</span>
                      {item.pdfErrors > 0 ? (
                        <span className="text-accent-red">{item.pdfErrors} errors</span>
                      ) : (
                        <span className="text-accent-green">Passed</span>
                      )}
                      {item.pdfWarnings && item.pdfWarnings > 0 && (
                        <span className="text-accent-amber">{item.pdfWarnings} warnings</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Gateway Info */}
            {item.gatewayStatus && (
              <div className="space-y-2">
                <h4 className="text-xs text-text-muted font-medium uppercase">Gateway Response</h4>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-secondary">Status:</span>
                    <span className={item.gatewayStatus === 'accepted' ? 'text-accent-green' : 'text-accent-red'}>
                      {item.gatewayStatus}
                    </span>
                  </div>
                  {item.acknowledgementNumber && (
                    <div className="flex items-center gap-2">
                      <span className="text-text-secondary">ACK:</span>
                      <span className="font-mono text-text-primary">{item.acknowledgementNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Timestamps */}
            <div className="space-y-2">
              <h4 className="text-xs text-text-muted font-medium uppercase">Timestamps</h4>
              <div className="space-y-1 text-xs">
                <div>Added: {new Date(item.addedAt).toLocaleString()}</div>
                {item.startedAt && <div>Started: {new Date(item.startedAt).toLocaleString()}</div>}
                {item.completedAt && <div>Completed: {new Date(item.completedAt).toLocaleString()}</div>}
              </div>
            </div>
            
            {/* Assignment */}
            <div className="space-y-2">
              <h4 className="text-xs text-text-muted font-medium uppercase">Assignment</h4>
              <div className="space-y-1 text-xs">
                {item.addedBy && <div>Added by: {item.addedBy}</div>}
                {item.assignedTo && <div>Assigned to: {item.assignedTo}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PublishingQueue({ onItemClick, onClose }: PublishingQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    total: 0,
    pending: 0,
    validating: 0,
    validated: 0,
    validationFailed: 0,
    publishing: 0,
    completed: 0,
    failed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPolling, setIsPolling] = useState(true);
  
  // Submission picker state
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableSubmissions, setAvailableSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  
  // Fetch queue items
  const fetchQueue = useCallback(async () => {
    try {
      const response = await submissionsApi.getQueue(
        filterStatus !== 'all' ? { status: filterStatus as QueueItemStatus } : undefined
      );
      setItems(response.data);
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filterStatus]);
  
  // Polling for real-time updates
  useEffect(() => {
    fetchQueue();
    
    if (isPolling) {
      const interval = setInterval(fetchQueue, 2000);
      return () => clearInterval(interval);
    }
  }, [fetchQueue, isPolling]);
  
  // Fetch available submissions for adding to queue
  const fetchAvailableSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    try {
      const response = await submissionsApi.list({ status: 'Ready' });
      // Filter out submissions already in queue
      const queuedIds = new Set(items.map(i => i.submissionId));
      setAvailableSubmissions(response.data.filter(s => !queuedIds.has(s.id)));
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [items]);
  
  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.productName.toLowerCase().includes(query) ||
        item.applicationNumber.toLowerCase().includes(query) ||
        item.sequenceNumber.toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [items, searchQuery]);
  
  // Handlers
  const handleAddToQueue = async (submissionId: string, priority: 'urgent' | 'high' | 'normal' | 'low' = 'normal') => {
    try {
      await submissionsApi.addToQueue({ submissionId, priority });
      setShowAddModal(false);
      fetchQueue();
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  };
  
  const handleRemove = async (itemId: string) => {
    try {
      await submissionsApi.removeFromQueue(itemId);
      fetchQueue();
    } catch (error) {
      console.error('Failed to remove from queue:', error);
    }
  };
  
  const handleRetry = async (itemId: string) => {
    try {
      await submissionsApi.retryQueueItem(itemId);
      fetchQueue();
    } catch (error) {
      console.error('Failed to retry:', error);
    }
  };
  
  const handlePublish = async (itemId: string) => {
    try {
      await submissionsApi.batchPublish({ itemIds: [itemId] });
      fetchQueue();
    } catch (error) {
      console.error('Failed to publish:', error);
    }
  };
  
  const handleValidateAll = async () => {
    try {
      await submissionsApi.batchValidate({ validateAll: true });
      fetchQueue();
    } catch (error) {
      console.error('Failed to start batch validation:', error);
    }
  };
  
  const handlePublishAllValidated = async () => {
    try {
      await submissionsApi.batchPublish({ publishAllValidated: true });
      fetchQueue();
    } catch (error) {
      console.error('Failed to start batch publish:', error);
    }
  };
  
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  return (
    <div className="flex flex-col h-full bg-surface-primary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-3">
          <ListOrdered className="w-5 h-5 text-accent-blue" />
          <h2 className="text-lg font-semibold text-text-primary">Publishing Queue</h2>
          <span className="text-sm text-text-muted">
            {stats.total} submissions
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`p-2 rounded-lg ${isPolling ? 'text-accent-green' : 'text-text-muted'} hover:bg-surface-elevated`}
            title={isPolling ? 'Pause auto-refresh' : 'Resume auto-refresh'}
          >
            {isPolling ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={fetchQueue}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-elevated rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setShowAddModal(true); fetchAvailableSubmissions(); }}
            className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90"
          >
            <Plus className="w-4 h-4" />
            Add to Queue
          </button>
        </div>
      </div>
      
      {/* Stats Bar */}
      <QueueStatsBar stats={stats} />
      
      {/* Filter Bar */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-2 py-1 text-sm bg-surface-card border border-border rounded"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="validating">Validating</option>
            <option value="validated">Validated</option>
            <option value="validation_failed">Validation Failed</option>
            <option value="publishing">Publishing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by product, application, or sequence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {stats.pending > 0 && (
            <button
              onClick={handleValidateAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-amber border border-accent-amber/50 rounded hover:bg-accent-amber/10"
            >
              <FileCheck className="w-4 h-4" />
              Validate All ({stats.pending})
            </button>
          )}
          {stats.validated > 0 && (
            <button
              onClick={handlePublishAllValidated}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent-green border border-accent-green/50 rounded hover:bg-accent-green/10"
            >
              <Send className="w-4 h-4" />
              Publish All ({stats.validated})
            </button>
          )}
        </div>
      </div>
      
      {/* Queue List */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 text-text-muted animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <ListOrdered className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg">No items in queue</p>
            <p className="text-sm">Add submissions to start the publishing workflow</p>
            <button
              onClick={() => { setShowAddModal(true); fetchAvailableSubmissions(); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90"
            >
              <Plus className="w-4 h-4" />
              Add Submission
            </button>
          </div>
        ) : (
          <div>
            {filteredItems.map(item => (
              <QueueItemRow
                key={item.id}
                item={item}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => toggleExpand(item.id)}
                onRetry={() => handleRetry(item.id)}
                onRemove={() => handleRemove(item.id)}
                onPublish={() => handlePublish(item.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Add to Queue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated rounded-xl shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold text-text-primary">Add to Publishing Queue</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-text-muted hover:text-text-primary"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-auto max-h-[60vh]">
              {isLoadingSubmissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
                </div>
              ) : availableSubmissions.length === 0 ? (
                <div className="text-center py-8 text-text-muted">
                  <p>No submissions ready for publishing</p>
                  <p className="text-sm">Complete the PublishingWizard to prepare submissions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableSubmissions.map(submission => (
                    <div 
                      key={submission.id}
                      className="flex items-center justify-between p-3 bg-surface-card rounded-lg border border-border hover:border-accent-blue/50"
                    >
                      <div>
                        <div className="font-medium text-text-primary">
                          {submission.productName || 'Unknown Product'}
                        </div>
                        <div className="text-sm text-text-secondary">
                          {submission.applicationNumber || 'N/A'} • Seq {submission.sequenceNumber} • {submission.region}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="px-2 py-1 text-sm bg-surface-primary border border-border rounded"
                          defaultValue="normal"
                          id={`priority-${submission.id}`}
                        >
                          <option value="urgent">Urgent</option>
                          <option value="high">High</option>
                          <option value="normal">Normal</option>
                          <option value="low">Low</option>
                        </select>
                        <button
                          onClick={() => {
                            const select = document.getElementById(`priority-${submission.id}`) as HTMLSelectElement;
                            handleAddToQueue(submission.id, select.value as 'urgent' | 'high' | 'normal' | 'low');
                          }}
                          className="px-3 py-1.5 text-sm bg-accent-blue text-white rounded hover:bg-accent-blue/90"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PublishingQueue;
