
// ApprovalQueueDashboard Component - v0.13.60
// "My Approvals" view showing all approval requests assigned to current user
// Groups by: Pending My Action, Awaiting Others, Recently Completed
// v0.13.56: Added filter chips UI, urgency filter, and clear all functionality
// v0.13.57: Added document type and approval type filters
// v0.13.58: Added date range picker and requester filter
// v0.13.59: Added saved filter presets
// v0.13.60: Added batch approval actions (select, approve/reject multiple)


import { useState, useMemo, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, AlertTriangle, AlertCircle,
  User, ChevronDown, ChevronRight, Calendar, ArrowRight,
  FileText, Eye, Play, Filter, Search, RefreshCw,
  Timer, TrendingUp, Inbox, CheckSquare, Users, Send,
  MoreHorizontal, ArrowUpDown, Sparkles, Bell, Shield,
  ExternalLink, MessageSquare, PenTool, X, Save, Bookmark, Trash2,
  Square, CheckSquare2, XSquare
} from 'lucide-react';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import type {
  ApprovalRequest,
  ApprovalStep,
  ApprovalRequestStatus,
  ApprovalUrgency,
  ApprovalType,
  DocumentType,
} from '@/types/approval';
import { APPROVAL_TYPE_INFO, DOCUMENT_TYPE_INFO } from '@/types/approval';

// ============================================================================
// PROPS & TYPES
// ============================================================================

export interface ApprovalQueueDashboardProps {
  /** Current user ID for filtering approvals */
  currentUserId: string;
  /** Current user name for display */
  currentUserName: string;
  /** All approval requests in the system */
  approvalRequests: ApprovalRequest[];
  /** Callback when user wants to view a document */
  onViewDocument?: (documentId: string, approvalRequestId: string) => void;
  /** Callback when user wants to take action on approval */
  onTakeAction?: (approvalRequestId: string, action: 'approve' | 'reject' | 'request-revision') => void;
  /** Callback for batch actions on multiple approvals - v0.13.60 */
  onBatchAction?: (approvalRequestIds: string[], action: 'approve' | 'reject') => void;
  /** Callback when user wants to view full approval details */
  onViewApprovalDetails?: (approvalRequestId: string) => void;
  /** Callback to refresh data */
  onRefresh?: () => void;
  /** Show compact mode */
  compact?: boolean;
}

type QueueCategory = 'pending-action' | 'awaiting-others' | 'completed';
type SortOption = 'dueDate' | 'urgency' | 'document' | 'type' | 'requestedAt';
type DateFilterOption = 'all' | 'overdue' | 'due-today' | 'due-this-week' | 'custom-range';
type UrgencyFilterOption = ApprovalUrgency | 'all';
type DocumentTypeFilterOption = DocumentType | 'all';
type ApprovalTypeFilterOption = ApprovalType | 'all';

// Date range for custom filtering
interface DateRange {
  from: string | null;  // ISO date string
  to: string | null;    // ISO date string
}

// Active filters state
interface ActiveFilters {
  date: DateFilterOption;
  dateRange: DateRange;
  urgency: UrgencyFilterOption;
  documentType: DocumentTypeFilterOption;
  approvalType: ApprovalTypeFilterOption;
  requester: string | 'all';  // requesterId or 'all'
  search: string;
}

// Filter chip definition
interface FilterChip {
  id: string;
  label: string;
  type: 'date' | 'dateRange' | 'urgency' | 'documentType' | 'approvalType' | 'requester' | 'search';
  onRemove: () => void;
}

// Filter preset definition - v0.13.59
interface FilterPreset {
  id: string;
  name: string;
  createdAt: string;
  filters: {
    search: string;
    dateFilter: DateFilterOption;
    dateRange: DateRange;
    urgencyFilter: UrgencyFilterOption;
    documentTypeFilter: DocumentTypeFilterOption;
    approvalTypeFilter: ApprovalTypeFilterOption;
    requesterFilter: string;
  };
}

// Default presets for demo - v0.13.59
const DEFAULT_PRESETS: FilterPreset[] = [
  {
    id: 'preset-critical-overdue',
    name: 'Critical & Overdue',
    createdAt: new Date().toISOString(),
    filters: {
      search: '',
      dateFilter: 'overdue',
      dateRange: { from: null, to: null },
      urgencyFilter: 'critical',
      documentTypeFilter: 'all',
      approvalTypeFilter: 'all',
      requesterFilter: 'all',
    },
  },
  {
    id: 'preset-due-today',
    name: 'Due Today - All',
    createdAt: new Date().toISOString(),
    filters: {
      search: '',
      dateFilter: 'due-today',
      dateRange: { from: null, to: null },
      urgencyFilter: 'all',
      documentTypeFilter: 'all',
      approvalTypeFilter: 'all',
      requesterFilter: 'all',
    },
  },
  {
    id: 'preset-regulatory',
    name: 'Regulatory Reviews',
    createdAt: new Date().toISOString(),
    filters: {
      search: '',
      dateFilter: 'all',
      dateRange: { from: null, to: null },
      urgencyFilter: 'all',
      documentTypeFilter: 'all',
      approvalTypeFilter: 'regulatory-review',
      requesterFilter: 'all',
    },
  },
];

interface QueueItem {
  request: ApprovalRequest;
  currentStep: ApprovalStep | null;
  isMyTurn: boolean;
  isOverdue: boolean;
  hoursUntilDue: number;
  category: QueueCategory;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const URGENCY_CONFIG: Record<ApprovalUrgency, {
  label: string;
  color: BadgeColor;
  priority: number;
}> = {
  'critical': { label: 'Critical', color: 'purple', priority: 4 },
  'urgent': { label: 'Urgent', color: 'red', priority: 3 },
  'expedited': { label: 'Expedited', color: 'amber', priority: 2 },
  'standard': { label: 'Standard', color: 'green', priority: 1 },
};

const STATUS_CONFIG: Record<ApprovalRequestStatus, {
  label: string;
  color: BadgeColor;
}> = {
  'draft': { label: 'Draft', color: 'gray' },
  'pending': { label: 'Pending', color: 'blue' },
  'in-progress': { label: 'In Progress', color: 'purple' },
  'revision-needed': { label: 'Revision Needed', color: 'amber' },
  'approved': { label: 'Approved', color: 'green' },
  'rejected': { label: 'Rejected', color: 'red' },
  'cancelled': { label: 'Cancelled', color: 'gray' },
  'expired': { label: 'Expired', color: 'red' },
};

const CATEGORY_CONFIG: Record<QueueCategory, {
  label: string;
  description: string;
  icon: React.ReactNode;
  emptyMessage: string;
}> = {
  'pending-action': {
    label: 'Pending My Action',
    description: 'Approvals waiting for your review',
    icon: <Inbox className="w-5 h-5 text-accent-blue" />,
    emptyMessage: 'No approvals waiting for your action',
  },
  'awaiting-others': {
    label: 'Awaiting Others',
    description: 'Approvals you requested or are tracking',
    icon: <Users className="w-5 h-5 text-accent-purple" />,
    emptyMessage: 'No approvals awaiting others',
  },
  'completed': {
    label: 'Recently Completed',
    description: 'Approvals completed in the last 7 days',
    icon: <CheckSquare className="w-5 h-5 text-accent-green" />,
    emptyMessage: 'No recently completed approvals',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 0) {
    // Future date
    const futureMins = Math.abs(diffMins);
    const futureHours = Math.floor(futureMins / 60);
    const futureDays = Math.floor(futureMins / 1440);
    if (futureDays > 0) return `in ${futureDays}d`;
    if (futureHours > 0) return `in ${futureHours}h`;
    return `in ${futureMins}m`;
  }

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

function getHoursUntilDue(dueDate: string): number {
  const due = new Date(dueDate);
  const now = new Date();
  return Math.floor((due.getTime() - now.getTime()) / 3600000);
}

function isOverdue(dueDate: string): boolean {
  return getHoursUntilDue(dueDate) < 0;
}

function getDueStatus(hoursUntilDue: number): { text: string; color: string } {
  if (hoursUntilDue < 0) {
    const overdueDays = Math.abs(Math.floor(hoursUntilDue / 24));
    return { 
      text: overdueDays > 0 ? `${overdueDays}d overdue` : `${Math.abs(hoursUntilDue)}h overdue`, 
      color: 'text-accent-red' 
    };
  }
  if (hoursUntilDue < 4) {
    return { text: `${hoursUntilDue}h remaining`, color: 'text-accent-red' };
  }
  if (hoursUntilDue < 24) {
    return { text: `${hoursUntilDue}h remaining`, color: 'text-accent-amber' };
  }
  const days = Math.floor(hoursUntilDue / 24);
  return { text: `${days}d remaining`, color: 'text-text-muted' };
}

function getCurrentStep(request: ApprovalRequest): ApprovalStep | null {
  return request.approvalSteps[request.currentStepIndex] || null;
}

function isUserAssignedToStep(step: ApprovalStep | null, userId: string, userName: string): boolean {
  if (!step) return false;
  if (step.assignedUserId === userId) return true;
  // Also check by name for demo purposes
  if (step.assignedUserName?.toLowerCase().includes(userName.split(' ')[0].toLowerCase())) return true;
  return false;
}

function categorizeRequest(
  request: ApprovalRequest,
  currentUserId: string,
  currentUserName: string
): QueueCategory {
  // Completed requests
  if (request.status === 'approved' || request.status === 'rejected' || request.status === 'cancelled') {
    return 'completed';
  }

  // Check if current step is assigned to user
  const currentStep = getCurrentStep(request);
  if (isUserAssignedToStep(currentStep, currentUserId, currentUserName)) {
    return 'pending-action';
  }

  // User is requester or has completed a previous step
  if (request.requesterId === currentUserId || 
      request.approvalSteps.some(s => 
        s.status === 'completed' && 
        (s.decisionBy === currentUserId || s.assignedUserId === currentUserId)
      )) {
    return 'awaiting-others';
  }

  return 'awaiting-others';
}

// Format date range for display - v0.13.58
function formatDateRange(from: string | null, to: string | null): string {
  if (from && to) {
    return `${formatDate(from)} - ${formatDate(to)}`;
  }
  if (from) {
    return `From ${formatDate(from)}`;
  }
  if (to) {
    return `Until ${formatDate(to)}`;
  }
  return '';
}

// Check if date is within range - v0.13.58
function isDateInRange(dateString: string, from: string | null, to: string | null): boolean {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  
  if (from) {
    const fromDate = new Date(from);
    fromDate.setHours(0, 0, 0, 0);
    if (date < fromDate) return false;
  }
  
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    if (date > toDate) return false;
  }
  
  return true;
}

// Extract unique requesters from approval requests - v0.13.58
interface RequesterInfo {
  id: string;
  name: string;
  department: string;
}

function getUniqueRequesters(requests: ApprovalRequest[]): RequesterInfo[] {
  const requesterMap = new Map<string, RequesterInfo>();
  
  requests.forEach(request => {
    if (!requesterMap.has(request.requesterId)) {
      requesterMap.set(request.requesterId, {
        id: request.requesterId,
        name: request.requesterName,
        department: request.requesterDepartment,
      });
    }
  });
  
  return Array.from(requesterMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

// Filter Chip Display Component
interface FilterChipDisplayProps {
  chips: FilterChip[];
  onClearAll: () => void;
}

function FilterChipDisplay({ chips, onClearAll }: FilterChipDisplayProps) {
  if (chips.length === 0) return null;
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-text-muted">Active filters:</span>
      {chips.map(chip => (
        <button
          key={chip.id}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors"
          onClick={chip.onRemove}
        >
          {chip.label}
          <X className="w-3 h-3" />
        </button>
      ))}
      {chips.length > 1 && (
        <button
          className="text-xs text-text-muted hover:text-accent-red transition-colors"
          onClick={onClearAll}
        >
          Clear all
        </button>
      )}
    </div>
  );
}

interface QueueItemCardProps {
  item: QueueItem;
  onViewDocument?: () => void;
  onTakeAction?: (action: 'approve' | 'reject' | 'request-revision') => void;
  onViewDetails?: () => void;
  // Selection props - v0.13.60
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showCheckbox?: boolean;
}

function QueueItemCard({ 
  item, 
  onViewDocument, 
  onTakeAction, 
  onViewDetails,
  isSelected = false,
  onToggleSelect,
  showCheckbox = false,
}: QueueItemCardProps) {
  const [showActions, setShowActions] = useState(false);
  const { request, currentStep, isMyTurn, isOverdue: itemOverdue, hoursUntilDue } = item;
  const urgencyConfig = URGENCY_CONFIG[request.urgency];
  const statusConfig = STATUS_CONFIG[request.status];
  const dueStatus = getDueStatus(hoursUntilDue);
  const typeInfo = APPROVAL_TYPE_INFO[request.approvalType];

  return (
    <div 
      className={`
        p-4 border rounded-lg transition-all hover:shadow-md cursor-pointer
        ${itemOverdue ? 'border-accent-red/50 bg-accent-red/5' : 'border-border bg-surface-card'}
        ${isMyTurn ? 'ring-2 ring-accent-blue/30' : ''}
        ${isSelected ? 'bg-accent-blue/5 border-accent-blue' : ''}
      `}
      onClick={() => onViewDetails?.()}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        {/* Checkbox - v0.13.60 */}
        {showCheckbox && isMyTurn && (
          <button
            className="flex-shrink-0 mt-0.5"
            onClick={(e) => { 
              e.stopPropagation(); 
              onToggleSelect?.(); 
            }}
          >
            {isSelected ? (
              <CheckSquare2 className="w-5 h-5 text-accent-blue" />
            ) : (
              <Square className="w-5 h-5 text-text-muted hover:text-accent-blue transition-colors" />
            )}
          </button>
        )}
        {showCheckbox && !isMyTurn && (
          <div className="w-5 flex-shrink-0" /> /* Spacer for alignment */
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge color={urgencyConfig.color} size="xs">{urgencyConfig.label}</Badge>
            <Badge color={statusConfig.color} size="xs">{statusConfig.label}</Badge>
            {itemOverdue && (
              <Badge color="red" size="xs">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
          </div>
          <h4 className="text-sm font-medium text-text-primary truncate">{request.documentTitle}</h4>
          <p className="text-xs text-text-muted truncate">{request.title}</p>
        </div>
        
        {isMyTurn && (
          <div className="flex items-center gap-1">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onTakeAction?.('approve'); }}
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Approve
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              icon={<MoreHorizontal className="w-4 h-4" />}
              onClick={(e) => { e.stopPropagation(); setShowActions(!showActions); }}
            />
          </div>
        )}
      </div>

      {/* Action dropdown for my turn items */}
      {showActions && isMyTurn && (
        <div className="mb-3 p-2 bg-surface-sunken rounded-md flex gap-2">
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onTakeAction?.('request-revision'); }}
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1" />
            Request Revision
          </Button>
          <Button 
            variant="danger" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); onTakeAction?.('reject'); }}
          >
            <XCircle className="w-3.5 h-3.5 mr-1" />
            Reject
          </Button>
        </div>
      )}

      {/* Current step info */}
      {currentStep && request.status !== 'approved' && request.status !== 'rejected' && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <Shield className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-text-muted">Current Step:</span>
          <span className="text-text-secondary font-medium">{currentStep.name}</span>
          {currentStep.assignedUserName && (
            <>
              <ArrowRight className="w-3 h-3 text-text-muted" />
              <span className="text-text-secondary">{currentStep.assignedUserName}</span>
            </>
          )}
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between gap-4 text-xs text-text-muted pt-2 border-t border-border">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5" />
            {typeInfo?.label || request.approvalType}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3.5 h-3.5" />
            {request.requesterName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`flex items-center gap-1 ${dueStatus?.color ?? ''}`}>
            <Timer className="w-3.5 h-3.5" />
            {dueStatus.text}
          </span>
          {onViewDocument && (
            <button 
              className="flex items-center gap-1 text-accent-blue hover:underline"
              onClick={(e) => { e.stopPropagation(); onViewDocument(); }}
            >
              <Eye className="w-3.5 h-3.5" />
              View
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface QueueSectionProps {
  category: QueueCategory;
  items: QueueItem[];
  expanded: boolean;
  onToggle: () => void;
  onViewDocument?: (documentId: string, approvalRequestId: string) => void;
  onTakeAction?: (approvalRequestId: string, action: 'approve' | 'reject' | 'request-revision') => void;
  onViewDetails?: (approvalRequestId: string) => void;
  // Selection props - v0.13.60
  selectedItems?: Set<string>;
  onToggleSelect?: (itemId: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  selectionState?: 'none' | 'some' | 'all';
}

function QueueSection({ 
  category, 
  items, 
  expanded, 
  onToggle,
  onViewDocument,
  onTakeAction,
  onViewDetails,
  selectedItems,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  selectionState = 'none',
}: QueueSectionProps) {
  const config = CATEGORY_CONFIG[category];
  const overdueCount = items.filter(i => i.isOverdue).length;
  const actionableCount = items.filter(i => i.isMyTurn).length;
  const showSelectionControls = category === 'pending-action' && actionableCount > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-surface-card hover:bg-surface-elevated transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {config.icon}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-primary">{config.label}</span>
              <Badge color={items.length > 0 ? (category === 'pending-action' ? 'blue' : 'gray') : 'gray'} size="sm">
                {items.length}
              </Badge>
              {overdueCount > 0 && (
                <Badge color="red" size="xs">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {overdueCount} overdue
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted">{config.description}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-5 h-5 text-text-muted" />
        ) : (
          <ChevronRight className="w-5 h-5 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3">
          {/* Selection controls - v0.13.60 */}
          {showSelectionControls && items.length > 0 && (
            <div className="flex items-center gap-2 py-2 border-b border-border">
              <button
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-blue transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectionState === 'all') {
                    onDeselectAll?.();
                  } else {
                    onSelectAll?.();
                  }
                }}
              >
                {selectionState === 'all' ? (
                  <CheckSquare2 className="w-4 h-4 text-accent-blue" />
                ) : selectionState === 'some' ? (
                  <CheckSquare2 className="w-4 h-4 text-accent-blue opacity-50" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>
                  {selectionState === 'all' ? 'Deselect All' : `Select All (${actionableCount})`}
                </span>
              </button>
            </div>
          )}
          
          {items.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              {config.emptyMessage}
            </div>
          ) : (
            items.map(item => (
              <QueueItemCard
                key={item.request.id}
                item={item}
                onViewDocument={() => onViewDocument?.(item.request.documentId, item.request.id)}
                onTakeAction={(action) => onTakeAction?.(item.request.id, action)}
                onViewDetails={() => onViewDetails?.(item.request.id)}
                showCheckbox={category === 'pending-action'}
                isSelected={selectedItems?.has(item.request.id) || false}
                onToggleSelect={() => onToggleSelect?.(item.request.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ApprovalQueueDashboard({
  currentUserId,
  currentUserName,
  approvalRequests,
  onViewDocument,
  onTakeAction,
  onBatchAction,
  onViewApprovalDetails,
  onRefresh,
  compact = false,
}: ApprovalQueueDashboardProps) {
  // UI State
  const [expandedSections, setExpandedSections] = useState<Set<QueueCategory>>(
    new Set<QueueCategory>(['pending-action', 'awaiting-others'])
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilterOption>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<DocumentTypeFilterOption>('all');
  const [approvalTypeFilter, setApprovalTypeFilter] = useState<ApprovalTypeFilterOption>('all');
  const [requesterFilter, setRequesterFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Preset state - v0.13.59
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(DEFAULT_PRESETS);
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Batch selection state - v0.13.60
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBatchConfirm, setShowBatchConfirm] = useState<'approve' | 'reject' | null>(null);

  // Get unique requesters for filter dropdown
  const uniqueRequesters = useMemo(() => 
    getUniqueRequesters(approvalRequests), 
    [approvalRequests]
  );

  // Build filter chips for display
  const filterChips = useMemo((): FilterChip[] => {
    const chips: FilterChip[] = [];
    
    if (searchQuery) {
      chips.push({
        id: 'search',
        label: `"${searchQuery.length > 15 ? searchQuery.slice(0, 15) + '...' : searchQuery}"`,
        type: 'search',
        onRemove: () => setSearchQuery(''),
      });
    }
    
    if (dateFilter !== 'all' && dateFilter !== 'custom-range') {
      const labels: Record<DateFilterOption, string> = {
        'all': '',
        'overdue': 'Overdue',
        'due-today': 'Due Today',
        'due-this-week': 'Due This Week',
        'custom-range': '',
      };
      chips.push({
        id: 'date',
        label: labels[dateFilter],
        type: 'date',
        onRemove: () => setDateFilter('all'),
      });
    }

    // Custom date range chip
    if (dateFilter === 'custom-range' && (dateRange.from || dateRange.to)) {
      chips.push({
        id: 'dateRange',
        label: formatDateRange(dateRange.from, dateRange.to),
        type: 'dateRange',
        onRemove: () => {
          setDateFilter('all');
          setDateRange({ from: null, to: null });
        },
      });
    }
    
    if (urgencyFilter !== 'all') {
      chips.push({
        id: 'urgency',
        label: URGENCY_CONFIG[urgencyFilter].label,
        type: 'urgency',
        onRemove: () => setUrgencyFilter('all'),
      });
    }

    if (documentTypeFilter !== 'all') {
      chips.push({
        id: 'documentType',
        label: DOCUMENT_TYPE_INFO[documentTypeFilter].label,
        type: 'documentType',
        onRemove: () => setDocumentTypeFilter('all'),
      });
    }

    if (approvalTypeFilter !== 'all') {
      chips.push({
        id: 'approvalType',
        label: APPROVAL_TYPE_INFO[approvalTypeFilter].label,
        type: 'approvalType',
        onRemove: () => setApprovalTypeFilter('all'),
      });
    }

    // Requester filter chip
    if (requesterFilter !== 'all') {
      const requester = uniqueRequesters.find(r => r.id === requesterFilter);
      chips.push({
        id: 'requester',
        label: requester ? requester.name : 'Unknown',
        type: 'requester',
        onRemove: () => setRequesterFilter('all'),
      });
    }
    
    return chips;
  }, [searchQuery, dateFilter, dateRange, urgencyFilter, documentTypeFilter, approvalTypeFilter, requesterFilter, uniqueRequesters]);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDateFilter('all');
    setDateRange({ from: null, to: null });
    setUrgencyFilter('all');
    setDocumentTypeFilter('all');
    setApprovalTypeFilter('all');
    setRequesterFilter('all');
    setActivePresetId(null);
  }, []);

  // Save current filters as preset - v0.13.59
  const saveCurrentFiltersAsPreset = useCallback((name: string) => {
    const newPreset: FilterPreset = {
      id: `preset-${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      filters: {
        search: searchQuery,
        dateFilter,
        dateRange,
        urgencyFilter,
        documentTypeFilter,
        approvalTypeFilter,
        requesterFilter,
      },
    };
    setFilterPresets(prev => [...prev, newPreset]);
    setActivePresetId(newPreset.id);
    setShowSavePresetModal(false);
    setNewPresetName('');
  }, [searchQuery, dateFilter, dateRange, urgencyFilter, documentTypeFilter, approvalTypeFilter, requesterFilter]);

  // Load preset - v0.13.59
  const loadPreset = useCallback((preset: FilterPreset) => {
    setSearchQuery(preset.filters.search);
    setDateFilter(preset.filters.dateFilter);
    setDateRange(preset.filters.dateRange);
    setUrgencyFilter(preset.filters.urgencyFilter);
    setDocumentTypeFilter(preset.filters.documentTypeFilter);
    setApprovalTypeFilter(preset.filters.approvalTypeFilter);
    setRequesterFilter(preset.filters.requesterFilter);
    setActivePresetId(preset.id);
  }, []);

  // Delete preset - v0.13.59
  const deletePreset = useCallback((presetId: string) => {
    setFilterPresets(prev => prev.filter(p => p.id !== presetId));
    if (activePresetId === presetId) {
      setActivePresetId(null);
    }
  }, [activePresetId]);

  // Check if any filters are active (for save button state) - v0.13.59
  const hasActiveFilters = useMemo(() => {
    return searchQuery !== '' ||
           dateFilter !== 'all' ||
           urgencyFilter !== 'all' ||
           documentTypeFilter !== 'all' ||
           approvalTypeFilter !== 'all' ||
           requesterFilter !== 'all';
  }, [searchQuery, dateFilter, urgencyFilter, documentTypeFilter, approvalTypeFilter, requesterFilter]);

  // Batch selection handlers - v0.13.60
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const selectAllInCategory = useCallback((items: QueueItem[]) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      items.forEach(item => {
        if (item.isMyTurn) { // Only select items where user can take action
          next.add(item.request.id);
        }
      });
      return next;
    });
  }, []);

  const deselectAllInCategory = useCallback((items: QueueItem[]) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      items.forEach(item => next.delete(item.request.id));
      return next;
    });
  }, []);

  const clearAllSelections = useCallback(() => {
    setSelectedItems(new Set());
    setShowBatchConfirm(null);
  }, []);

  const handleBatchAction = useCallback((action: 'approve' | 'reject') => {
    if (selectedItems.size === 0) return;
    
    if (onBatchAction) {
      onBatchAction(Array.from(selectedItems), action);
    }
    
    // Clear selections after action
    clearAllSelections();
  }, [selectedItems, onBatchAction, clearAllSelections]);

  // Process and categorize all requests
  const queueItems = useMemo(() => {
    const items: QueueItem[] = approvalRequests.map(request => {
      const currentStep = getCurrentStep(request);
      const hoursUntilDue = getHoursUntilDue(request.dueDate);
      const itemOverdue = hoursUntilDue < 0 && request.status !== 'approved' && request.status !== 'rejected';
      const isMyTurn = isUserAssignedToStep(currentStep, currentUserId, currentUserName) &&
                       request.status !== 'approved' && request.status !== 'rejected';
      const category = categorizeRequest(request, currentUserId, currentUserName);

      return {
        request,
        currentStep,
        isMyTurn,
        isOverdue: itemOverdue,
        hoursUntilDue,
        category,
      };
    });

    // Apply search filter
    let filtered = items;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.request.documentTitle.toLowerCase().includes(query) ||
        item.request.title.toLowerCase().includes(query) ||
        item.request.requesterName.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      filtered = filtered.filter(item => {
        if (dateFilter === 'overdue') return item.isOverdue;
        if (dateFilter === 'due-today') return item.hoursUntilDue >= 0 && item.hoursUntilDue < 24;
        if (dateFilter === 'due-this-week') return item.hoursUntilDue >= 0 && item.hoursUntilDue < 168;
        if (dateFilter === 'custom-range') {
          return isDateInRange(item.request.dueDate, dateRange.from, dateRange.to);
        }
        return true;
      });
    }

    // Apply urgency filter
    if (urgencyFilter !== 'all') {
      filtered = filtered.filter(item => item.request.urgency === urgencyFilter);
    }

    // Apply document type filter
    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.request.documentType === documentTypeFilter);
    }

    // Apply approval type filter
    if (approvalTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.request.approvalType === approvalTypeFilter);
    }

    // Apply requester filter
    if (requesterFilter !== 'all') {
      filtered = filtered.filter(item => item.request.requesterId === requesterFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return a.hoursUntilDue - b.hoursUntilDue;
        case 'urgency':
          return URGENCY_CONFIG[b.request.urgency].priority - URGENCY_CONFIG[a.request.urgency].priority;
        case 'document':
          return a.request.documentTitle.localeCompare(b.request.documentTitle);
        case 'type':
          return a.request.approvalType.localeCompare(b.request.approvalType);
        case 'requestedAt':
          return new Date(b.request.requestedAt).getTime() - new Date(a.request.requestedAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [approvalRequests, currentUserId, currentUserName, searchQuery, dateFilter, dateRange, urgencyFilter, documentTypeFilter, approvalTypeFilter, requesterFilter, sortBy]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<QueueCategory, QueueItem[]> = {
      'pending-action': [],
      'awaiting-others': [],
      'completed': [],
    };
    queueItems.forEach(item => {
      groups[item.category].push(item);
    });
    return groups;
  }, [queueItems]);

  // Stats
  const stats = useMemo(() => {
    const pendingCount = groupedItems['pending-action'].length;
    const overdueCount = queueItems.filter(i => i.isOverdue).length;
    const dueToday = queueItems.filter(i => i.hoursUntilDue >= 0 && i.hoursUntilDue < 24).length;
    const completedThisWeek = groupedItems['completed'].length;
    return { pendingCount, overdueCount, dueToday, completedThisWeek };
  }, [queueItems, groupedItems]);

  // Selection stats - v0.13.60
  const selectionStats = useMemo(() => {
    const actionableItems = groupedItems['pending-action'].filter(item => item.isMyTurn);
    const selectedCount = selectedItems.size;
    const allActionableSelected = actionableItems.length > 0 && 
      actionableItems.every(item => selectedItems.has(item.request.id));
    const someSelected = selectedCount > 0;
    return { 
      actionableCount: actionableItems.length, 
      selectedCount, 
      allActionableSelected,
      someSelected,
    };
  }, [groupedItems, selectedItems]);

  // Check selection state for a category - v0.13.60
  const getCategorySelectionState = useCallback((items: QueueItem[]) => {
    const actionableItems = items.filter(item => item.isMyTurn);
    if (actionableItems.length === 0) return 'none';
    const selectedInCategory = actionableItems.filter(item => selectedItems.has(item.request.id));
    if (selectedInCategory.length === 0) return 'none';
    if (selectedInCategory.length === actionableItems.length) return 'all';
    return 'some';
  }, [selectedItems]);

  // Handlers
  const toggleSection = useCallback((category: QueueCategory) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Inbox className="w-5 h-5 text-accent-blue" />
            My Approvals
          </h2>
          <p className="text-sm text-text-muted">Manage approval requests assigned to you</p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={onRefresh}>
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            title="Pending My Action"
            value={stats.pendingCount}
            icon={<Inbox className="w-5 h-5 text-accent-blue" />}
            accentColor="blue"
          />
          <StatCard
            title="Overdue"
            value={stats.overdueCount}
            icon={<AlertTriangle className="w-5 h-5 text-accent-red" />}
            accentColor="red"
          />
          <StatCard
            title="Due Today"
            value={stats.dueToday}
            icon={<Clock className="w-5 h-5 text-accent-amber" />}
            accentColor="amber"
          />
          <StatCard
            title="Completed This Week"
            value={stats.completedThisWeek}
            icon={<CheckCircle className="w-5 h-5 text-accent-green" />}
            accentColor="green"
          />
        </div>
      )}

      {/* Batch Action Bar - v0.13.60 */}
      {selectionStats.someSelected && (
        <div className="flex items-center justify-between p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckSquare2 className="w-5 h-5 text-accent-blue" />
            <span className="text-sm font-medium text-text-primary">
              {selectionStats.selectedCount} item{selectionStats.selectedCount !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllSelections}
            >
              Clear Selection
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {showBatchConfirm === null ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle className="w-4 h-4" />}
                  onClick={() => setShowBatchConfirm('approve')}
                >
                  Approve All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<XCircle className="w-4 h-4" />}
                  onClick={() => setShowBatchConfirm('reject')}
                  className="text-accent-red hover:bg-accent-red/10"
                >
                  Reject All
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">
                  {showBatchConfirm === 'approve' ? 'Approve' : 'Reject'} {selectionStats.selectedCount} items?
                </span>
                <Button
                  variant={showBatchConfirm === 'approve' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handleBatchAction(showBatchConfirm)}
                  className={showBatchConfirm === 'reject' ? 'bg-accent-red text-white hover:bg-accent-red/90' : ''}
                >
                  Confirm
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBatchConfirm(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <Card variant="default" padding="md" radius="lg">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by document, title, or requester..."
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={showFilters ? 'secondary' : 'ghost'}
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filters
              {filterChips.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-accent-blue text-white rounded-full">
                  {filterChips.length}
                </span>
              )}
            </Button>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-md text-text-primary"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="urgency">Sort by Urgency</option>
              <option value="document">Sort by Document</option>
              <option value="type">Sort by Type</option>
              <option value="requestedAt">Sort by Request Date</option>
            </select>
          </div>
        </div>

        {/* Active Filter Chips */}
        {filterChips.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <FilterChipDisplay chips={filterChips} onClearAll={clearAllFilters} />
          </div>
        )}

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-border space-y-3">
            {/* Filter Presets - v0.13.59 */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                Saved Presets
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {filterPresets.map(preset => (
                  <div
                    key={preset.id}
                    className={`
                      group flex items-center gap-1 px-2 py-1 rounded-md border transition-colors cursor-pointer
                      ${activePresetId === preset.id 
                        ? 'bg-accent-blue/10 border-accent-blue text-accent-blue' 
                        : 'bg-surface-card border-border text-text-secondary hover:border-accent-blue/50'}
                    `}
                    onClick={() => loadPreset(preset)}
                  >
                    <Bookmark className="w-3 h-3" />
                    <span className="text-sm">{preset.name}</span>
                    {!DEFAULT_PRESETS.some(p => p.id === preset.id) && (
                      <button
                        className="ml-1 p-0.5 opacity-0 group-hover:opacity-100 hover:text-accent-red transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePreset(preset.id);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                
                {/* Save current filters button */}
                {hasActiveFilters && !showSavePresetModal && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSavePresetModal(true)}
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Save Current
                  </Button>
                )}
              </div>

              {/* Save preset modal */}
              {showSavePresetModal && (
                <div className="mt-2 p-3 bg-surface-sunken rounded-md border border-border">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Preset name..."
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm bg-surface-card border border-border rounded text-text-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newPresetName.trim()) {
                          saveCurrentFiltersAsPreset(newPresetName);
                        }
                        if (e.key === 'Escape') {
                          setShowSavePresetModal(false);
                          setNewPresetName('');
                        }
                      }}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!newPresetName.trim()}
                      onClick={() => saveCurrentFiltersAsPreset(newPresetName)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowSavePresetModal(false);
                        setNewPresetName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Date Filters */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                Due Date
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(['all', 'overdue', 'due-today', 'due-this-week', 'custom-range'] as DateFilterOption[]).map(filter => (
                  <Button
                    key={filter}
                    variant={dateFilter === filter ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setDateFilter(filter);
                      if (filter !== 'custom-range') {
                        setDateRange({ from: null, to: null });
                      }
                    }}
                  >
                    {filter === 'all' && 'All Dates'}
                    {filter === 'overdue' && '🔴 Overdue'}
                    {filter === 'due-today' && '🟡 Due Today'}
                    {filter === 'due-this-week' && '📅 Due This Week'}
                    {filter === 'custom-range' && '📆 Custom Range'}
                  </Button>
                ))}
              </div>
              
              {/* Custom date range inputs */}
              {dateFilter === 'custom-range' && (
                <div className="flex items-center gap-2 p-2 bg-surface-sunken rounded-md">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted">From:</label>
                    <input
                      type="date"
                      value={dateRange.from || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value || null }))}
                      className="px-2 py-1 text-sm bg-surface-card border border-border rounded text-text-primary"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-text-muted">To:</label>
                    <input
                      type="date"
                      value={dateRange.to || ''}
                      onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value || null }))}
                      className="px-2 py-1 text-sm bg-surface-card border border-border rounded text-text-primary"
                    />
                  </div>
                  {(dateRange.from || dateRange.to) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDateRange({ from: null, to: null })}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Requester Filter */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                Requested By
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={requesterFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setRequesterFilter('all')}
                >
                  All Requesters
                </Button>
                {uniqueRequesters.slice(0, 5).map(requester => (
                  <Button
                    key={requester.id}
                    variant={requesterFilter === requester.id ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setRequesterFilter(requester.id)}
                  >
                    <User className="w-3 h-3 mr-1" />
                    {requester.name}
                  </Button>
                ))}
                {uniqueRequesters.length > 5 && (
                  <select
                    value={requesterFilter}
                    onChange={(e) => setRequesterFilter(e.target.value)}
                    className="px-2 py-1 text-sm bg-surface-card border border-border rounded text-text-primary"
                  >
                    <option value="all">More...</option>
                    {uniqueRequesters.slice(5).map(requester => (
                      <option key={requester.id} value={requester.id}>
                        {requester.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Urgency Filters */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                Urgency
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={urgencyFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setUrgencyFilter('all')}
                >
                  All Urgencies
                </Button>
                {(['critical', 'urgent', 'expedited', 'standard'] as ApprovalUrgency[]).map(urgency => (
                  <Button
                    key={urgency}
                    variant={urgencyFilter === urgency ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setUrgencyFilter(urgency)}
                  >
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${
                      urgency === 'critical' ? 'bg-purple-500' :
                      urgency === 'urgent' ? 'bg-red-500' :
                      urgency === 'expedited' ? 'bg-amber-500' :
                      'bg-green-500'
                    }`} />
                    {URGENCY_CONFIG[urgency].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Document Type Filters */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                Document Type
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={documentTypeFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setDocumentTypeFilter('all')}
                >
                  All Types
                </Button>
                {(['protocol', 'csr', 'ib', 'cmc', 'safety', 'regulatory', 'sop', 'labeling'] as DocumentType[]).map(docType => (
                  <Button
                    key={docType}
                    variant={documentTypeFilter === docType ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setDocumentTypeFilter(docType)}
                  >
                    {DOCUMENT_TYPE_INFO[docType].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Approval Type Filters */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 block">
                Approval Type
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={approvalTypeFilter === 'all' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setApprovalTypeFilter('all')}
                >
                  All Approvals
                </Button>
                {(['regulatory-review', 'medical-review', 'qa-review', 'technical-review', 'editorial-review', 'legal-review', 'executive-sign-off', 'release-approval'] as ApprovalType[]).map(approvalType => (
                  <Button
                    key={approvalType}
                    variant={approvalTypeFilter === approvalType ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setApprovalTypeFilter(approvalType)}
                  >
                    {APPROVAL_TYPE_INFO[approvalType].label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Clear All */}
            {filterChips.length > 0 && (
              <div className="pt-2 border-t border-border">
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="w-3.5 h-3.5 mr-1" />
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Queue Sections */}
      {queueItems.length === 0 && filterChips.length > 0 ? (
        <EmptyState
          type="no-results"
          size="sm"
          title="No matching approvals"
          description="No approvals match your current filters"
          action={
            <Button variant="secondary" size="sm" onClick={clearAllFilters}>
              Clear All Filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {(['pending-action', 'awaiting-others', 'completed'] as QueueCategory[]).map(category => (
            <QueueSection
              key={category}
              category={category}
              items={groupedItems[category]}
              expanded={expandedSections.has(category)}
              onToggle={() => toggleSection(category)}
              onViewDocument={onViewDocument}
              onTakeAction={onTakeAction}
              onViewDetails={onViewApprovalDetails}
              selectedItems={selectedItems}
              onToggleSelect={toggleItemSelection}
              onSelectAll={() => selectAllInCategory(groupedItems[category])}
              onDeselectAll={() => deselectAllInCategory(groupedItems[category])}
              selectionState={getCategorySelectionState(groupedItems[category])}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default ApprovalQueueDashboard;
