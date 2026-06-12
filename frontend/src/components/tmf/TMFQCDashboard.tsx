/**
 * TMF QC Dashboard
 * Quality Control queue management UI
 * 
 * v0.41.5 - TMF QC Dashboard
 */


import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Filter,
  ChevronRight,
  FileText,
  Eye,
  UserCheck,
  AlertOctagon,
  Flag,
  Calendar,
  Search,
  MoreVertical,
  CheckSquare,
  XSquare,
  MinusSquare,
  MessageSquare,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type QCStatus = 'pending' | 'in-progress' | 'passed' | 'failed' | 'waived';
type QCPriority = 'critical' | 'high' | 'medium' | 'low';
type QCSource = 'auto-link' | 'manual-upload' | 'migration' | 'cross-module';

interface QCIssue {
  id: string;
  type: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  field: string | null;
  resolved: boolean;
}

interface QCQueueItem {
  id: string;
  artifactId: string;
  artifactTitle: string;
  artifactNumber: string | null;
  zoneId: string;
  zoneName: string;
  sectionId: string | null;
  sectionName: string | null;
  studyId: string;
  studyName: string | null;
  status: QCStatus;
  priority: QCPriority;
  source: QCSource;
  assignedTo: string | null;
  assignedToName: string | null;
  assignedAt: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  issueCount: number;
  issues: QCIssue[];
  queuedAt: string;
  dueDate: string | null;
  completedAt: string | null;
}

interface QCStats {
  total: number;
  pending: number;
  inProgress: number;
  passed: number;
  failed: number;
  waived: number;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  overdue: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<QCStatus, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  pending: { 
    label: 'Pending', 
    icon: <Clock className="w-4 h-4" />, 
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
  },
  'in-progress': { 
    label: 'In Progress', 
    icon: <Eye className="w-4 h-4" />, 
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
  },
  passed: { 
    label: 'Passed', 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
  },
  failed: { 
    label: 'Failed', 
    icon: <XCircle className="w-4 h-4" />, 
    color: 'text-red-400',
    bg: 'bg-red-500/20',
  },
  waived: { 
    label: 'Waived', 
    icon: <MinusSquare className="w-4 h-4" />, 
    color: 'text-gray-400',
    bg: 'bg-gray-500/20',
  },
};

const PRIORITY_CONFIG: Record<QCPriority, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  high: { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/30' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  low: { label: 'Low', color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' },
};

const SOURCE_LABELS: Record<QCSource, string> = {
  'auto-link': 'Auto-Linked',
  'manual-upload': 'Manual Upload',
  'cross-module': 'Cross-Module',
  'migration': 'Migration',
};

// =============================================================================
// COMPONENT
// =============================================================================

export default function TMFQCDashboard() {
  // State
  const [items, setItems] = useState<QCQueueItem[]>([]);
  const [stats, setStats] = useState<QCStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<QCStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<QCPriority | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<QCSource | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  
  // Selected item for detail view
  const [selectedItem, setSelectedItem] = useState<QCQueueItem | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  // Current user (would come from auth context in production)
  const currentUser = { id: 'user-001', name: 'Dr. Sarah Chen' };

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------

  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      if (showPendingOnly) params.append('pendingOnly', 'true');
      
      const response = await fetch(`/api/tmf/qc?${params.toString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch QC queue');
      }
      
      setItems(data.data || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, sourceFilter, showPendingOnly]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // ---------------------------------------------------------------------------
  // Filtered Items
  // ---------------------------------------------------------------------------

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.artifactTitle.toLowerCase().includes(query) ||
      (item.artifactNumber && item.artifactNumber.toLowerCase().includes(query)) ||
      item.zoneName.toLowerCase().includes(query) ||
      (item.studyName && item.studyName.toLowerCase().includes(query))
    );
  }, [items, searchQuery]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleAction = async (itemId: string, action: string, notes?: string) => {
    try {
      const response = await fetch(`/api/tmf/qc/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId: currentUser.id,
          userName: currentUser.name,
          notes,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }
      
      // Refresh queue
      await fetchQueue();
      setShowActionMenu(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  // ---------------------------------------------------------------------------
  // Stats Cards
  // ---------------------------------------------------------------------------

  const renderStatsCards = () => {
    if (!stats) return null;
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <div className="bg-[#1e2530] rounded-lg p-3 border border-white/5">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-gray-400">Total Items</div>
        </div>
        <div className="bg-[#1e2530] rounded-lg p-3 border border-yellow-500/20">
          <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
          <div className="text-xs text-gray-400">Pending</div>
        </div>
        <div className="bg-[#1e2530] rounded-lg p-3 border border-blue-500/20">
          <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
          <div className="text-xs text-gray-400">In Progress</div>
        </div>
        <div className="bg-[#1e2530] rounded-lg p-3 border border-emerald-500/20">
          <div className="text-2xl font-bold text-emerald-400">{stats.passed}</div>
          <div className="text-xs text-gray-400">Passed</div>
        </div>
        <div className="bg-[#1e2530] rounded-lg p-3 border border-red-500/20">
          <div className="text-2xl font-bold text-red-400">{stats.failed}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div className="bg-[#1e2530] rounded-lg p-3 border border-red-500/30">
          <div className="text-2xl font-bold text-red-300">{stats.overdue}</div>
          <div className="text-xs text-gray-400">Overdue</div>
        </div>
        <div className="bg-[#1e2530] rounded-lg p-3 border border-orange-500/20">
          <div className="text-2xl font-bold text-orange-400">
            {(stats.byPriority?.critical || 0) + (stats.byPriority?.high || 0)}
          </div>
          <div className="text-xs text-gray-400">High Priority</div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Filters Bar
  // ---------------------------------------------------------------------------

  const renderFilters = () => (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search artifacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#1e2530] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
        />
      </div>
      
      {/* Status Filter */}
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as QCStatus | 'all')}
        className="bg-[#1e2530] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
      >
        <option value="all">All Status</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="waived">Waived</option>
      </select>
      
      {/* Priority Filter */}
      <select
        value={priorityFilter}
        onChange={(e) => setPriorityFilter(e.target.value as QCPriority | 'all')}
        className="bg-[#1e2530] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
      >
        <option value="all">All Priority</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      
      {/* Source Filter */}
      <select
        value={sourceFilter}
        onChange={(e) => setSourceFilter(e.target.value as QCSource | 'all')}
        className="bg-[#1e2530] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
      >
        <option value="all">All Sources</option>
        <option value="auto-link">Auto-Linked</option>
        <option value="manual-upload">Manual Upload</option>
        <option value="cross-module">Cross-Module</option>
        <option value="migration">Migration</option>
      </select>
      
      {/* Pending Only Toggle */}
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
        <input
          type="checkbox"
          checked={showPendingOnly}
          onChange={(e) => setShowPendingOnly(e.target.checked)}
          className="rounded border-white/20 bg-[#1e2530] text-blue-500 focus:ring-blue-500/30"
        />
        Pending Only
      </label>
      
      {/* Refresh */}
      <button
        onClick={fetchQueue}
        disabled={isLoading}
        className="p-2 bg-[#1e2530] border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  // ---------------------------------------------------------------------------
  // Queue Item Row
  // ---------------------------------------------------------------------------

  const renderQueueItem = (item: QCQueueItem) => {
    const statusConfig = STATUS_CONFIG[item.status];
    const priorityConfig = PRIORITY_CONFIG[item.priority];
    const isOverdue = item.dueDate && !item.completedAt && new Date(item.dueDate) < new Date();
    
    return (
      <div
        key={item.id}
        className={`bg-[#1e2530] rounded-lg border ${
          isOverdue ? 'border-red-500/30' : 'border-white/5'
        } p-4 hover:border-white/10 transition-colors cursor-pointer`}
        onClick={() => setSelectedItem(item)}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Priority Badge */}
              <span className={`px-2 py-0.5 text-xs rounded border ${priorityConfig?.bg ?? ''} ${priorityConfig?.color ?? ''}`}>
                {priorityConfig.label}
              </span>
              
              {/* Status Badge */}
              <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${statusConfig?.bg ?? ''} ${statusConfig?.color ?? ''}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
              
              {/* Overdue Badge */}
              {isOverdue && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">
                  <AlertOctagon className="w-3 h-3" />
                  Overdue
                </span>
              )}
              
              {/* Issues Badge */}
              {item.issueCount > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-orange-500/20 text-orange-400">
                  <AlertTriangle className="w-3 h-3" />
                  {item.issueCount} Issues
                </span>
              )}
            </div>
            
            {/* Title */}
            <h3 className="text-white font-medium truncate">{item.artifactTitle}</h3>
            
            {/* Meta */}
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
              {item.artifactNumber && (
                <span className="font-mono">{item.artifactNumber}</span>
              )}
              <span>{item.zoneName}</span>
              {item.sectionName && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span>{item.sectionName}</span>
                </>
              )}
            </div>
            
            {/* Assignment */}
            {item.assignedToName && (
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-400">
                <UserCheck className="w-3 h-3" />
                Assigned to {item.assignedToName}
              </div>
            )}
          </div>
          
          {/* Right: Source & Date */}
          <div className="text-right shrink-0">
            <div className="text-xs text-gray-500 mb-1">
              {SOURCE_LABELS[item.source]}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Calendar className="w-3 h-3" />
              {item.dueDate ? (
                <span className={isOverdue ? 'text-red-400' : ''}>
                  Due {new Date(item.dueDate).toLocaleDateString()}
                </span>
              ) : (
                <span>Queued {new Date(item.queuedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
          
          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActionMenu(showActionMenu === item.id ? null : item.id);
              }}
              className="p-1 hover:bg-white/5 rounded"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            {showActionMenu === item.id && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-[#252d3a] border border-white/10 rounded-lg shadow-xl z-10">
                {item.status === 'pending' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'assign'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5"
                  >
                    <UserCheck className="w-4 h-4" /> Assign to Me
                  </button>
                )}
                {(item.status === 'pending' || item.status === 'in-progress') && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'pass'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-white/5"
                    >
                      <CheckSquare className="w-4 h-4" /> Pass QC
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'fail'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5"
                    >
                      <XSquare className="w-4 h-4" /> Fail QC
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(item.id, 'waive'); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:bg-white/5"
                    >
                      <MinusSquare className="w-4 h-4" /> Waive QC
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Detail Panel
  // ---------------------------------------------------------------------------

  const renderDetailPanel = () => {
    if (!selectedItem) return null;
    
    const statusConfig = STATUS_CONFIG[selectedItem.status];
    const priorityConfig = PRIORITY_CONFIG[selectedItem.priority];
    
    return (
      <div className="fixed inset-y-0 right-0 w-96 bg-[#1a1f28] border-l border-white/10 shadow-xl z-50 overflow-y-auto">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">QC Review</h2>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-1 hover:bg-white/5 rounded text-gray-400"
            >
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Artifact Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 text-xs rounded border ${priorityConfig?.bg ?? ''} ${priorityConfig?.color ?? ''}`}>
                {priorityConfig.label}
              </span>
              <span className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded ${statusConfig?.bg ?? ''} ${statusConfig?.color ?? ''}`}>
                {statusConfig.icon}
                {statusConfig.label}
              </span>
            </div>
            <h3 className="text-white font-medium">{selectedItem.artifactTitle}</h3>
            {selectedItem.artifactNumber && (
              <p className="text-sm text-gray-400 font-mono">{selectedItem.artifactNumber}</p>
            )}
          </div>
          
          {/* Location */}
          <div className="bg-[#252d3a] rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">TMF Location</div>
            <div className="text-sm text-white">{selectedItem.zoneName}</div>
            {selectedItem.sectionName && (
              <div className="text-xs text-gray-400">{selectedItem.sectionName}</div>
            )}
          </div>
          
          {/* Issues */}
          {selectedItem.issues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-white mb-2">
                Issues ({selectedItem.issues.length})
              </h4>
              <div className="space-y-2">
                {selectedItem.issues.map((issue) => (
                  <div 
                    key={issue.id}
                    className={`bg-[#252d3a] rounded-lg p-3 border-l-2 ${
                      issue.severity === 'critical' ? 'border-red-500' :
                      issue.severity === 'major' ? 'border-orange-500' : 'border-yellow-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${
                        issue.severity === 'critical' ? 'text-red-400' :
                        issue.severity === 'major' ? 'text-orange-400' : 'text-yellow-400'
                      }`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      {issue.resolved && (
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-300">{issue.description}</p>
                    {issue.field && (
                      <p className="text-xs text-gray-500 mt-1">Field: {issue.field}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Timeline */}
          <div>
            <h4 className="text-sm font-medium text-white mb-2">Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-400">
                <span>Queued</span>
                <span>{new Date(selectedItem.queuedAt).toLocaleString()}</span>
              </div>
              {selectedItem.assignedAt && (
                <div className="flex items-center justify-between text-gray-400">
                  <span>Assigned</span>
                  <span>{new Date(selectedItem.assignedAt).toLocaleString()}</span>
                </div>
              )}
              {selectedItem.reviewedAt && (
                <div className="flex items-center justify-between text-gray-400">
                  <span>Reviewed</span>
                  <span>{new Date(selectedItem.reviewedAt).toLocaleString()}</span>
                </div>
              )}
              {selectedItem.dueDate && (
                <div className="flex items-center justify-between text-gray-400">
                  <span>Due Date</span>
                  <span>{new Date(selectedItem.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Review Notes */}
          {selectedItem.reviewNotes && (
            <div className="bg-[#252d3a] rounded-lg p-3">
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                <MessageSquare className="w-3 h-3" />
                Review Notes
              </div>
              <p className="text-sm text-gray-300">{selectedItem.reviewNotes}</p>
            </div>
          )}
          
          {/* Actions */}
          {(selectedItem.status === 'pending' || selectedItem.status === 'in-progress') && (
            <div className="space-y-2 pt-4 border-t border-white/10">
              {selectedItem.status === 'pending' && (
                <button
                  onClick={() => handleAction(selectedItem.id, 'assign')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <UserCheck className="w-4 h-4" /> Assign to Me
                </button>
              )}
              <button
                onClick={() => handleAction(selectedItem.id, 'pass')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                <CheckSquare className="w-4 h-4" /> Pass QC
              </button>
              <button
                onClick={() => handleAction(selectedItem.id, 'fail')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <XSquare className="w-4 h-4" /> Fail QC
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">TMF QC Queue</h1>
        <p className="text-sm text-gray-400">
          Review and approve auto-linked TMF artifacts
        </p>
      </div>
      
      {/* Stats */}
      {renderStatsCards()}
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}
      
      {/* Queue List */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No items in QC queue matching your filters
        </div>
      )}
      
      {!isLoading && filteredItems.length > 0 && (
        <div className="space-y-3">
          {filteredItems.map(renderQueueItem)}
        </div>
      )}
      
      {/* Detail Panel */}
      {selectedItem && renderDetailPanel()}
      
      {/* Backdrop for action menu */}
      {showActionMenu && (
        <div 
          className="fixed inset-0 z-0" 
          onClick={() => setShowActionMenu(null)}
        />
      )}
    </div>
  );
}
