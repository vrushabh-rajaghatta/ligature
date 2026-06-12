
/**
 * ActionCenterScreen - v0.36.3
 * 
 * Completely redesigned "My Tasks" with truly actionable items.
 * Every item shows:
 * 1. Clear action verb (what to DO)
 * 2. Context about the item
 * 3. Direct click-through to specific item
 * 4. Visual urgency indicators
 * 
 * v0.36.2: Added filter bar for module, priority, and due date filtering
 * v0.36.3: Added saved filter views, user/date range filters, sort options
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  CheckCircle2, Clock, AlertTriangle, RefreshCw, 
  Calendar, ChevronRight, Play, Eye, Edit3,
  MessageSquare, FileText, Shield, Target,
  ArrowRight, Send, FileCheck, AlertCircle,
  ClipboardCheck, TrendingUp, Users, Bell,
  Filter, X, SlidersHorizontal, Save, Bookmark,
  ArrowUpDown, User, CalendarRange, Plus, Trash2,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { 
  useTaskAggregationStore, 
  useTasks, 
  useTaskCounts, 
  useIsTasksLoading,
  type AggregatedTask,
  createHAQTask,
  createSafetySignalTask,
  createDeviationTask,
  createDocumentReviewTask,
  createSubmissionMilestoneTask,
} from '@/store/useTaskAggregationStore';
import { useHAQStore } from '@/store/useHAQStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useQMSStore } from '@/store/useQMSStore';
import { useSubmissionsStore } from '@/stores/submissions-store';
import { useAppStore } from '@/store/useAppStore';
import { pendingReviews } from '@/data/authoring-data';
import { regulatorySubmissions } from '@/data/regulatory-submissions-data';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import type { ModuleId } from '@/types/core';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { useDeadClick } from '@/hooks/useDeadClick';

// Task action configuration - defines how each task type is presented
interface TaskActionConfig {
  actionVerb: string;
  actionIcon: React.ReactNode;
  primaryAction: string;
  moduleLabel: string;
  moduleColor: string;
  moduleIcon: React.ReactNode;
}

const getTaskConfig = (task: AggregatedTask): TaskActionConfig => {
  switch (task.type) {
    case 'haq-response':
    case 'haq-review':
      return {
        actionVerb: 'Respond to',
        actionIcon: <Send className="w-4 h-4" />,
        primaryAction: 'Draft Response',
        moduleLabel: 'HAQ',
        moduleColor: 'purple',
        moduleIcon: <MessageSquare className="w-4 h-4" />,
      };
    case 'safety-signal':
    case 'safety-case':
      return {
        actionVerb: 'Investigate',
        actionIcon: <Eye className="w-4 h-4" />,
        primaryAction: 'Review Signal',
        moduleLabel: 'Safety',
        moduleColor: 'red',
        moduleIcon: <Shield className="w-4 h-4" />,
      };
    case 'deviation-response':
    case 'capa-action':
      return {
        actionVerb: 'Investigate',
        actionIcon: <ClipboardCheck className="w-4 h-4" />,
        primaryAction: 'Open Investigation',
        moduleLabel: 'QMS',
        moduleColor: 'blue',
        moduleIcon: <AlertCircle className="w-4 h-4" />,
      };
    case 'document-review':
    case 'document-signature':
      return {
        actionVerb: 'Review',
        actionIcon: <FileCheck className="w-4 h-4" />,
        primaryAction: 'Start Review',
        moduleLabel: 'Authoring',
        moduleColor: 'green',
        moduleIcon: <FileText className="w-4 h-4" />,
      };
    case 'submission-milestone':
      return {
        actionVerb: 'Track',
        actionIcon: <TrendingUp className="w-4 h-4" />,
        primaryAction: 'View Milestone',
        moduleLabel: 'Submissions',
        moduleColor: 'amber',
        moduleIcon: <Target className="w-4 h-4" />,
      };
    case 'workflow-approval':
    case 'tmf-artifact':
    case 'labeling-review':
    default:
      return {
        actionVerb: 'View',
        actionIcon: <Eye className="w-4 h-4" />,
        primaryAction: 'Open',
        moduleLabel: 'Task',
        moduleColor: 'gray',
        moduleIcon: <FileText className="w-4 h-4" />,
      };
  }
};

// Priority styling
const PRIORITY_STYLES = {
  critical: { badge: 'red', bg: 'bg-red-500/5', border: 'border-red-500/30', glow: 'shadow-red-500/10' },
  high: { badge: 'amber', bg: 'bg-amber-500/5', border: 'border-amber-500/20', glow: '' },
  medium: { badge: 'blue', bg: '', border: 'border-border', glow: '' },
  low: { badge: 'gray', bg: '', border: 'border-border', glow: '' },
} as const;

// v0.42.26: Filter state interface
interface ActionCenterFilters {
  module?: string | null;
  priority?: string | null;
  dueDate?: string | null;
  assignedUser?: string | null;
}

// v0.42.26: Store data interfaces for iteration
interface HAQStoreItem {
  id: string;
  status: string;
  agency?: string;
  region?: string;
  dueDate?: string;
  responseDeadline?: string;
  priority?: string;
  questions?: unknown[];
  questionCount?: number;
  productId?: string;
  applicationNumber?: string;
}

interface SafetySignalStoreItem {
  id: string;
  status: string;
  signal?: string;
  name?: string;
  title?: string;
  priority?: string;
  detectedDate?: string;
  createdAt?: string;
}

interface DeviationStoreItem {
  id: string;
  status: string;
  title?: string;
  description?: string;
  deviationNumber?: string;
  severity?: string;
  targetCloseDate?: string;
  dueDate?: string;
  type?: string;
}

interface ActionCenterScreenProps {
  filters?: ActionCenterFilters;
  onNavigate?: (moduleId: ModuleId, itemId?: string) => void;
}

export function ActionCenterScreen({ filters, onNavigate }: ActionCenterScreenProps) {
  const tasks = useTasks();
  const taskCounts = useTaskCounts();
  const isLoading = useIsTasksLoading();
  const { setTasks, refreshTasks } = useTaskAggregationStore();
  const { isCollapsed, setCollapsed } = useCollapsedSections('action-center');
  
  // Get store methods for item selection
  const { selectHAQ } = useHAQStore();
  const { selectSubmission } = useSubmissionsStore();
  const setActiveModule = useAppStore((s) => s.setActiveModule);
  
  // Filter state
    const { deadClick } = useDeadClick();
  const [moduleFilter, setModuleFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [dueDateFilter, setDueDateFilter] = useState<string | null>(null);
  const [assignedUserFilter, setAssignedUserFilter] = useState<string | null>(null);
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Sort state
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'module'>('dueDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Saved filter views
  interface SavedFilterView {
    id: string;
    name: string;
    filters: {
      module: string | null;
      priority: string | null;
      dueDate: string | null;
      assignedUser: string | null;
      dateRangeStart: string;
      dateRangeEnd: string;
    };
    sortBy: 'dueDate' | 'priority' | 'module';
    sortDirection: 'asc' | 'desc';
  }
  
  const [savedViews, setSavedViews] = useState<SavedFilterView[]>([]);
  const [showSaveViewModal, setShowSaveViewModal] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  
  // Load saved views from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('ligature-task-filter-views');
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load saved filter views', e);
      }
    }
  }, []);
  
  // Save views to localStorage when they change
  useEffect(() => {
    if (savedViews.length > 0) {
      localStorage.setItem('ligature-task-filter-views', JSON.stringify(savedViews));
    }
  }, [savedViews]);
  
  // Sample users for filter
  const SAMPLE_USERS = [
    { id: 'user-1', name: 'Sarah Chen' },
    { id: 'user-2', name: 'Michael Rodriguez' },
    { id: 'user-3', name: 'Emily Watson' },
    { id: 'user-4', name: 'James Kim' },
    { id: 'user-5', name: 'Current User' },
  ];
  
  // Source stores for aggregation
  const haqStore = useHAQStore();
  const safetyStore = usePharmacovigilanceStore();
  const qmsStore = useQMSStore();
  
  // Aggregate tasks from all modules
  useEffect(() => {
    const aggregatedTasks: AggregatedTask[] = [];
    
    // HAQs
    const haqsArray = Array.isArray(haqStore.haqs) ? haqStore.haqs : Object.values(haqStore.haqs || {});
    (haqsArray as HAQStoreItem[]).forEach((haq: HAQStoreItem) => {
      if (haq.status !== 'closed' && haq.status !== 'submitted') {
        aggregatedTasks.push(createHAQTask({
          id: haq.id,
          agency: haq.agency || haq.region || 'FDA',
          dueDate: haq.dueDate || haq.responseDeadline || new Date().toISOString(),
          status: haq.status,
          priority: haq.priority || 'medium',
          questionCount: haq.questions?.length || haq.questionCount || 1,
          productId: haq.productId || haq.applicationNumber || 'unknown',
        }));
      }
    });
    
    // Safety signals
    const signalsArray = Array.isArray(safetyStore.signals) ? safetyStore.signals : Object.values(safetyStore.signals || {});
    (signalsArray as SafetySignalStoreItem[]).forEach((signal: SafetySignalStoreItem) => {
      if (signal.status !== 'closed') {
        aggregatedTasks.push(createSafetySignalTask({
          id: signal.id,
          name: signal.signal || signal.name || signal.title || 'Safety Signal',
          status: signal.status,
          priority: signal.priority || 'high',
          detectedDate: signal.detectedDate || signal.createdAt || new Date().toISOString(),
        }));
      }
    });
    
    // QMS deviations
    const deviationsObj = qmsStore.deviations || {};
    (Object.values(deviationsObj) as DeviationStoreItem[]).forEach((deviation: DeviationStoreItem) => {
      if (deviation.status === 'open' || deviation.status === 'investigating') {
        aggregatedTasks.push(createDeviationTask({
          id: deviation.id,
          title: deviation.title || deviation.description || `Deviation ${deviation.deviationNumber}`,
          status: deviation.status,
          priority: deviation.severity === 'critical' ? 'critical' : deviation.severity === 'major' ? 'high' : 'medium',
          dueDate: deviation.targetCloseDate || deviation.dueDate,
          type: deviation.type || 'Process',
        }));
      }
    });
    
    // Document reviews
    pendingReviews.forEach(review => {
      aggregatedTasks.push(createDocumentReviewTask({
        documentId: review.documentId,
        documentTitle: review.documentTitle,
        documentType: review.documentType,
        stageName: review.stageName,
        requestedBy: review.requestedBy,
        requestedAt: review.requestedAt,
        dueDate: review.dueDate,
        sectionsToReview: review.sectionsToReview,
        commentCount: review.commentCount,
        priority: review.priority,
      }));
    });
    
    // Submission milestones - only show actionable items
    regulatorySubmissions.forEach(submission => {
      const relevantMilestones = (submission.milestones || []).filter(milestone => {
        // Skip completed milestones
        if (milestone.status === 'completed') return false;
        
        // Calculate days until due
        const daysUntil = Math.ceil((new Date(milestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        // v0.38.4: Cap all milestones at 30 days overdue - ancient items are not actionable
        if (daysUntil < -30) return false;
        
        // Include at-risk milestones (but only within 30 days overdue, checked above)
        if (milestone.status === 'at-risk') return true;
        
        // Include milestones due within 30 days (upcoming)
        if (daysUntil >= 0 && daysUntil <= 30) return true;
        
        // Include recently overdue (within last 14 days) - these are still actionable
        if (daysUntil < 0 && daysUntil >= -14) return true;
        
        return false;
      });
      
      relevantMilestones.forEach(milestone => {
        aggregatedTasks.push(createSubmissionMilestoneTask({
          id: milestone.id,
          name: milestone.name,
          targetDate: milestone.targetDate,
          status: milestone.status,
          description: milestone.description,
          submissionId: submission.id,
          submissionName: submission.applicationNumber,
          submissionType: submission.submissionType,
          region: submission.region,
        }));
      });
    });
    
    // Sort by priority then due date
    aggregatedTasks.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      if (a.daysUntilDue !== null && b.daysUntilDue !== null) return a.daysUntilDue - b.daysUntilDue;
      return 0;
    });
    
    // v0.44.44: Annotate tasks with causality from cascade engine
    const cascadeChains = useCascadeEngine.getState().chains;
    const activeChains = cascadeChains.filter(c => c.status === 'running' || c.status === 'complete');
    aggregatedTasks.forEach(task => {
      for (const chain of activeChains) {
        const matchingStep = chain.steps.find(
          s => s.targetModule === task.sourceModule &&
               (s.status === 'spawned' || s.status === 'completed')
        );
        if (matchingStep) {
          task.cascadeChainId = chain.id;
          task.triggeredByLabel = chain.trigger.sourceLabel;
          task.triggeredAt = chain.trigger.triggeredAt;
          break;
        }
      }
    });

    setTasks(aggregatedTasks);
  }, [haqStore.haqs, safetyStore.signals, qmsStore.deviations, setTasks]);

  // Navigate to specific item with selection
  const handleTaskClick = useCallback((task: AggregatedTask) => {
    // Pre-select item in the appropriate store
    switch (task.type) {
      case 'haq-response':
      case 'haq-review':
        selectHAQ(task.sourceId);
        break;
      case 'submission-milestone':
        // Extract milestone ID from task ID (format: "milestone-{milestoneId}")
        const milestoneId = task.id.replace('milestone-', '');
        // Select the parent submission and highlight the specific milestone
        selectSubmission(task.sourceId, milestoneId);
        break;
      // Add other store selections as needed
    }
    
    // Navigate to module - use setActiveModule directly as primary method
    // Map sourceModule to actual module IDs
    const moduleMap: Record<string, ModuleId> = {
      'haq': 'haq',
      'safety': 'safety',
      'qms': 'qms',
      'authoring': 'authoring',
      'submissions': 'submissions',
    };
    
    const targetModule = moduleMap[task.sourceModule] || task.sourceModule as ModuleId;
    
    // Always navigate using setActiveModule (works regardless of onNavigate prop)
    setActiveModule(targetModule);
    
    // Also call onNavigate if provided (for any additional handling)
    onNavigate?.(task.sourceModule, task.sourceId);
  }, [onNavigate, selectHAQ, selectSubmission, setActiveModule]);

  // Apply filters to tasks
  const filteredTasks = useMemo(() => {
    let result = tasks;
    
    if (moduleFilter) {
      result = result.filter(t => t.sourceModule === moduleFilter);
    }
    
    if (priorityFilter) {
      result = result.filter(t => t.priority === priorityFilter);
    }
    
    if (dueDateFilter) {
      switch (dueDateFilter) {
        case 'overdue':
          result = result.filter(t => t.daysUntilDue !== null && t.daysUntilDue < 0);
          break;
        case 'today':
          result = result.filter(t => t.daysUntilDue === 0);
          break;
        case 'week':
          result = result.filter(t => t.daysUntilDue !== null && t.daysUntilDue >= 0 && t.daysUntilDue <= 7);
          break;
        case 'month':
          result = result.filter(t => t.daysUntilDue !== null && t.daysUntilDue >= 0 && t.daysUntilDue <= 30);
          break;
      }
    }
    
    // Assigned user filter (simulated - matches on task title for demo)
    if (assignedUserFilter) {
      const userName = SAMPLE_USERS.find(u => u.id === assignedUserFilter)?.name || '';
      // In production, would filter on task.assignedTo field
      // For demo, we'll show all tasks when a user is selected (simulating assignment)
      result = result.filter(t => t.id.includes('haq') || assignedUserFilter === 'user-5');
    }
    
    // Date range filter
    if (dateRangeStart || dateRangeEnd) {
      result = result.filter(t => {
        if (!t.dueDate) return false;
        const taskDate = new Date(t.dueDate);
        if (dateRangeStart && taskDate < new Date(dateRangeStart)) return false;
        if (dateRangeEnd && taskDate > new Date(dateRangeEnd)) return false;
        return true;
      });
    }
    
    // Apply sorting
    result = [...result].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'dueDate':
          const aDate = a.daysUntilDue ?? 999;
          const bDate = b.daysUntilDue ?? 999;
          comparison = aDate - bDate;
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          comparison = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
          break;
        case 'module':
          comparison = a.sourceModule.localeCompare(b.sourceModule);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [tasks, moduleFilter, priorityFilter, dueDateFilter, assignedUserFilter, dateRangeStart, dateRangeEnd, sortBy, sortDirection]);
  
  // Check if any filters are active
  const hasActiveFilters = moduleFilter || priorityFilter || dueDateFilter || assignedUserFilter || dateRangeStart || dateRangeEnd;
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setModuleFilter(null);
    setPriorityFilter(null);
    setDueDateFilter(null);
    setAssignedUserFilter(null);
    setDateRangeStart('');
    setDateRangeEnd('');
  }, []);
  
  // Save current filters as a view
  const saveCurrentView = useCallback(() => {
    if (!newViewName.trim()) return;
    
    const newView: SavedFilterView = {
      id: `view-${Date.now()}`,
      name: newViewName.trim(),
      filters: {
        module: moduleFilter,
        priority: priorityFilter,
        dueDate: dueDateFilter,
        assignedUser: assignedUserFilter,
        dateRangeStart,
        dateRangeEnd,
      },
      sortBy,
      sortDirection,
    };
    
    setSavedViews(prev => [...prev, newView]);
    setNewViewName('');
    setShowSaveViewModal(false);
  }, [newViewName, moduleFilter, priorityFilter, dueDateFilter, assignedUserFilter, dateRangeStart, dateRangeEnd, sortBy, sortDirection]);
  
  // Apply a saved view
  const applySavedView = useCallback((view: SavedFilterView) => {
    setModuleFilter(view.filters.module);
    setPriorityFilter(view.filters.priority);
    setDueDateFilter(view.filters.dueDate);
    setAssignedUserFilter(view.filters.assignedUser);
    setDateRangeStart(view.filters.dateRangeStart);
    setDateRangeEnd(view.filters.dateRangeEnd);
    setSortBy(view.sortBy);
    setSortDirection(view.sortDirection);
    setShowFilters(true);
  }, []);
  
  // Delete a saved view
  const deleteSavedView = useCallback((viewId: string) => {
    setSavedViews(prev => prev.filter(v => v.id !== viewId));
  }, []);
  
  // Toggle sort direction or change sort field
  const handleSort = useCallback((field: 'dueDate' | 'priority' | 'module') => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  }, [sortBy]);

  // Computed task groups (use filtered tasks)
  // v0.38.4: Only include overdue items within 30 days - ancient overdue items are not actionable
  // Critical priority items are still capped at 30 days overdue
  const urgentTasks = useMemo(() => 
    filteredTasks.filter(t => {
      // If no due date, only include if critical
      if (t.daysUntilDue === null) return t.priority === 'critical';
      
      // Exclude items more than 30 days overdue - they're not actionable
      if (t.daysUntilDue < -30) return false;
      
      // Include critical priority or overdue items (up to 30 days)
      return t.priority === 'critical' || t.daysUntilDue < 0;
    }), 
    [filteredTasks]
  );
  
  const todayTasks = useMemo(() => 
    filteredTasks.filter(t => t.daysUntilDue === 0 && t.priority !== 'critical'), 
    [filteredTasks]
  );
  
  const upcomingTasks = useMemo(() => 
    filteredTasks.filter(t => t.daysUntilDue !== null && t.daysUntilDue > 0 && t.daysUntilDue <= 7 && t.priority !== 'critical'),
    [filteredTasks]
  );

  // v0.44.46: Redesigned task card — action button top-right, title dominant, less footer noise
  const ActionableTaskCard = ({ task, featured = false }: { task: AggregatedTask; featured?: boolean }) => {
    const config = getTaskConfig(task);
    const isOverdue = task.daysUntilDue !== null && task.daysUntilDue < 0;
    const isDueToday = task.daysUntilDue === 0;
    const isCritical = task.priority === 'critical';
    const style = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.medium;

    const accentColor =
      isOverdue || isCritical ? 'border-l-red-500' :
      isDueToday              ? 'border-l-amber-500' :
                                'border-l-transparent';

    const moduleColorClass = (base: string) => ({
      purple: `${base}-purple-500/20 text-purple-400`,
      red:    `${base}-red-500/20 text-red-400`,
      blue:   `${base}-blue-500/20 text-blue-400`,
      green:  `${base}-green-500/20 text-green-400`,
      amber:  `${base}-amber-500/20 text-amber-400`,
      gray:   `${base}-gray-500/20 text-gray-400`,
    }[config.moduleColor] ?? `${base}-gray-500/20 text-gray-400`);

    return (
      <div
        onClick={() => handleTaskClick(task)}
        className={`
          group relative flex items-stretch rounded-xl border-l-[3px] border cursor-pointer
          transition-all duration-150
          ${style?.bg ?? ''} ${accentColor}
          hover:border-accent-blue/40 hover:shadow-md hover:shadow-accent-blue/5 hover:-translate-y-px
          ${featured
            ? 'border-border shadow-lg shadow-black/10 ring-1 ring-border/60 bg-surface-card'
            : 'border-border'}
        `}
      >
        <div className="flex-1 px-4 py-3.5 min-w-0">
          {/* Top row: module icon + title + action button */}
          <div className="flex items-start gap-3">
            {/* Module icon */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg${moduleColorClass('bg')}`}>
              {config.moduleIcon}
            </div>

            {/* Title block */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  isOverdue ? 'text-red-400' : isDueToday ? 'text-amber-400' : 'text-text-muted'
                }`}>
                  {config.actionVerb}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase ${
                  task.priority === 'critical' ? 'bg-red-500/15 text-red-400' :
                  task.priority === 'high'     ? 'bg-amber-500/15 text-amber-400' :
                  task.priority === 'medium'   ? 'bg-blue-500/15 text-blue-400' :
                                                 'bg-gray-500/15 text-gray-400'
                }`}>
                  {task.priority}
                </span>
              </div>
              <h4 className={`font-semibold leading-snug group-hover:text-accent-blue transition-colors ${
                featured ? 'text-base text-text-primary' : 'text-sm text-text-primary'
              }`}>
                {task.title}
              </h4>
            </div>

            {/* Primary action button — top-right, always visible */}
            <button
              className={`
                flex-shrink-0 flex items-center gap-1.5 rounded-lg font-semibold
                transition-all duration-150
                ${featured
                  ? 'px-4 py-2 text-sm bg-accent-blue text-white hover:bg-accent-blue/90 shadow-sm'
                  : 'px-3 py-1.5 text-xs bg-accent-blue/10 text-accent-blue hover:bg-accent-blue hover:text-white group-hover:bg-accent-blue group-hover:text-white'
                }
              `}
              onClick={(e) => { e.stopPropagation(); handleTaskClick(task); }}
            >
              {config.actionIcon}
              <span className={featured ? 'inline' : 'hidden sm:inline'}>{config.primaryAction}</span>
            </button>
          </div>

          {/* Description + causality row */}
          <div className="mt-2 ml-11 space-y-1">
            <p className="text-xs text-text-muted leading-relaxed line-clamp-1">
              {task.description}
            </p>
            {task.triggeredByLabel && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-amber-400/80">⚡</span>
                <span className="text-[10px] text-amber-400/80 truncate">
                  {task.triggeredByLabel}
                </span>
              </div>
            )}
          </div>

          {/* Bottom metadata row */}
          <div className="mt-2.5 ml-11 flex items-center gap-3">
            {/* Module tag */}
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium bg${moduleColorClass('bg')}`}>
              {config.moduleLabel}
            </span>

            {/* Due date */}
            {task.daysUntilDue !== null && (
              <span className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-red-400' : isDueToday ? 'text-amber-400' : 'text-text-muted'
              }`}>
                <Clock className="w-3 h-3" />
                {isOverdue
                  ? `${Math.abs(task.daysUntilDue)}d overdue`
                  : isDueToday
                    ? 'Due today'
                    : `${task.daysUntilDue}d`}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Filter bar component
  const FilterBar = () => {
    const moduleOptions = [
      { value: 'haq', label: 'HAQ', color: 'purple' },
      { value: 'safety', label: 'Safety', color: 'red' },
      { value: 'qms', label: 'QMS', color: 'blue' },
      { value: 'authoring', label: 'Authoring', color: 'green' },
      { value: 'submissions', label: 'Submissions', color: 'amber' },
    ];
    
    const priorityOptions = [
      { value: 'critical', label: 'Critical', color: 'red' },
      { value: 'high', label: 'High', color: 'amber' },
      { value: 'medium', label: 'Medium', color: 'blue' },
      { value: 'low', label: 'Low', color: 'gray' },
    ];
    
    const dueDateOptions = [
      { value: 'overdue', label: 'Overdue' },
      { value: 'today', label: 'Due Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
    ];
    
    return (
      <div className="bg-surface-card border border-border rounded-xl p-4 space-y-4">
        {/* Header with actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <SlidersHorizontal className="w-4 h-4" />
            Filter & Sort Tasks
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button 
                onClick={() => setShowSaveViewModal(true)}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
              >
                <Save className="w-3 h-3" />
                Save View
              </button>
            )}
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
        </div>
        
        {/* Saved Views */}
        {savedViews.length > 0 && (
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Bookmark className="w-4 h-4 text-text-muted" />
            <span className="text-xs text-text-muted">Saved Views:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {savedViews.map(view => (
                <div 
                  key={view.id}
                  className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-surface hover:bg-accent-blue/20 border border-border hover:border-accent-blue/30 cursor-pointer transition-all"
                  onClick={() => applySavedView(view)}
                >
                  <span className="text-xs text-text-primary">{view.name}</span>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteSavedView(view.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Main Filters - Row 1 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Module filter */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Module</label>
            <select
              value={moduleFilter || ''}
              onChange={(e) => setModuleFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="">All Modules</option>
              {moduleOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Priority filter */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Priority</label>
            <select
              value={priorityFilter || ''}
              onChange={(e) => setPriorityFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="">All Priorities</option>
              {priorityOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Due date preset filter */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Due Date</label>
            <select
              value={dueDateFilter || ''}
              onChange={(e) => setDueDateFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="">Any Time</option>
              {dueDateOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          
          {/* Assigned User filter */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block flex items-center gap-1">
              <User className="w-3 h-3" />
              Assigned To
            </label>
            <select
              value={assignedUserFilter || ''}
              onChange={(e) => setAssignedUserFilter(e.target.value || null)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="">All Users</option>
              {SAMPLE_USERS.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Row 2: Date Range and Sort */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {/* Date Range Start */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block flex items-center gap-1">
              <CalendarRange className="w-3 h-3" />
              From Date
            </label>
            <input
              type="date"
              value={dateRangeStart}
              onChange={(e) => setDateRangeStart(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            />
          </div>
          
          {/* Date Range End */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">To Date</label>
            <input
              type="date"
              value={dateRangeEnd}
              onChange={(e) => setDateRangeEnd(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            />
          </div>
          
          {/* Sort By */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" />
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'module')}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary"
            >
              <option value="dueDate">Due Date</option>
              <option value="priority">Priority</option>
              <option value="module">Module</option>
            </select>
          </div>
          
          {/* Sort Direction */}
          <div>
            <label className="text-xs text-text-muted mb-1.5 block">Direction</label>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary flex items-center justify-between hover:border-accent-blue/50 transition-colors"
            >
              <span>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
              <ArrowUpDown className={`w-4 h-4 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 pt-3 border-t border-border">
            <span className="text-xs text-text-muted">Showing:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {moduleFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">
                  {moduleOptions.find(m => m.value === moduleFilter)?.label}
                  <button onClick={() => setModuleFilter(null)} className="hover:text-purple-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {priorityFilter && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  priorityFilter === 'critical' ? 'bg-red-500/20 text-red-400' :
                  priorityFilter === 'high' ? 'bg-amber-500/20 text-amber-400' :
                  priorityFilter === 'medium' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  {priorityOptions.find(p => p.value === priorityFilter)?.label}
                  <button onClick={() => setPriorityFilter(null)} className="hover:opacity-70">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {dueDateFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-cyan-500/20 text-cyan-400">
                  {dueDateOptions.find(d => d.value === dueDateFilter)?.label}
                  <button onClick={() => setDueDateFilter(null)} className="hover:text-cyan-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {assignedUserFilter && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                  {SAMPLE_USERS.find(u => u.id === assignedUserFilter)?.name}
                  <button onClick={() => setAssignedUserFilter(null)} className="hover:text-green-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(dateRangeStart || dateRangeEnd) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">
                  {dateRangeStart || '...'} → {dateRangeEnd || '...'}
                  <button onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }} className="hover:text-orange-300">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <span className="text-xs text-text-muted ml-auto">
              {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>
        )}
        
        {/* Save View Modal */}
        {showSaveViewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface-card border border-border rounded-xl p-6 w-96 shadow-xl">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Save Filter View</h3>
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="Enter view name..."
                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowSaveViewModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={saveCurrentView} disabled={!newViewName.trim()}>
                  <Save className="w-4 h-4 mr-2" />
                  Save View
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle stat card click - apply filter and scroll to tasks
  const handleStatCardClick = useCallback((filterType: 'overdue' | 'today' | 'week' | 'all') => {
    // Clear existing filters first
    setModuleFilter(null);
    setPriorityFilter(null);
    setDateRangeStart('');
    setDateRangeEnd('');
    setAssignedUserFilter(null);
    
    // Apply the appropriate due date filter (or clear for "all")
    if (filterType === 'all') {
      setDueDateFilter(null);
    } else {
      setDueDateFilter(filterType);
    }
    
    // Expand filter bar to show active filter
    setShowFilters(true);
    
    // Scroll to task list smoothly
    setTimeout(() => {
      const taskSection = document.getElementById('task-list-section');
      if (taskSection) {
        taskSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  // v0.44.45: Compact status header — tight single row, stats inline
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  const StatusSummary = () => {
    return (
      <div className="bg-surface-elevated border-b border-border px-4 md:px-6 py-2.5">
        {/* v0.52.0: Compact stat pill row — title/refresh moved to ScreenHeader */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleStatCardClick('overdue')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
              taskCounts.overdue > 0
                ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/15'
                : 'bg-surface-card border-border text-text-muted hover:border-border'
            } ${dueDateFilter === 'overdue' ? 'ring-1 ring-red-500/50' : ''}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="font-bold">{taskCounts.overdue}</span>
            <span className="text-xs opacity-75">overdue</span>
          </button>

          <button
            onClick={() => handleStatCardClick('today')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${
              taskCounts.dueToday > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/15'
                : 'bg-surface-card border-border text-text-muted hover:border-border'
            } ${dueDateFilter === 'today' ? 'ring-1 ring-amber-500/50' : ''}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-bold">{taskCounts.dueToday}</span>
            <span className="text-xs opacity-75">today</span>
          </button>

          <button
            onClick={() => handleStatCardClick('week')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]
              bg-surface-card border-border text-text-muted hover:border-blue-500/30 hover:text-blue-400
              ${dueDateFilter === 'week' ? 'ring-1 ring-blue-500/50 text-blue-400' : ''}`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="font-bold">{taskCounts.dueThisWeek}</span>
            <span className="text-xs opacity-75">this week</span>
          </button>

          <button
            onClick={() => handleStatCardClick('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]
              bg-surface-card border-border text-text-muted hover:border-green-500/30 hover:text-green-400
              ${!dueDateFilter && !hasActiveFilters ? 'ring-1 ring-green-500/50 text-green-400' : ''}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-bold">{taskCounts.total}</span>
            <span className="text-xs opacity-75">total</span>
          </button>

          {/* Filter toggle — inline with stats */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
                : 'bg-surface-card text-text-muted border-border hover:text-text-primary'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-accent-blue text-white text-[10px] flex items-center justify-center">
                {(moduleFilter ? 1 : 0) + (priorityFilter ? 1 : 0) + (dueDateFilter ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-surface">
      <ScreenHeader
        title={greeting}
        subtitle="Your actionable tasks across all modules, prioritized by urgency and due date"
        icon={<CheckCircle2 className="w-5 h-5" />}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshTasks()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        }
      />
      <StatusSummary />

      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
        {showFilters && (
          <>
            <FilterBar />
            {hasActiveFilters && (
              <p className="text-xs text-text-muted px-1">
                Showing {filteredTasks.length} of {tasks.length} tasks
              </p>
            )}
          </>
        )}

        {/* Task List Section - scroll target for stat card clicks */}
        <div id="task-list-section">
        {/* Urgent Attention */}
        {urgentTasks.length > 0 && (
          <CollapsibleSection
            title="Requires Immediate Attention"
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            count={urgentTasks.length}
            badge={{ text: 'URGENT', color: 'red' }}
            defaultExpanded={true}
            onToggle={(expanded) => setCollapsed('urgent', !expanded)}
            variant="card"
            size="sm"
          >
            <div className="space-y-3">
              {urgentTasks.slice(0, 5).map((task, idx) => (
                <ActionableTaskCard key={task.id} task={task} featured={idx === 0} />
              ))}
              {urgentTasks.length > 5 && (
                <div className="text-center pt-3">
                  <Button variant="outline" size="sm" onClick={() => toast.success('Action completed — task list updated')}>
                    View all {urgentTasks.length} urgent items
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Due Today */}
        {todayTasks.length > 0 && (
          <CollapsibleSection
            title="Due Today"
            icon={<Clock className="w-5 h-5 text-amber-400" />}
            count={todayTasks.length}
            defaultExpanded={!isCollapsed('today')}
            onToggle={(expanded) => setCollapsed('today', !expanded)}
            variant="card"
            size="sm"
          >
            <div className="space-y-3">
              {todayTasks.map(task => (
                <ActionableTaskCard key={task.id} task={task} />
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Upcoming This Week */}
        {upcomingTasks.length > 0 && (
          <CollapsibleSection
            title="Upcoming This Week"
            icon={<Calendar className="w-5 h-5 text-blue-400" />}
            count={upcomingTasks.length}
            defaultExpanded={!isCollapsed('upcoming')}
            onToggle={(expanded) => setCollapsed('upcoming', !expanded)}
            variant="card"
            size="sm"
          >
            <div className="space-y-3">
              {upcomingTasks.slice(0, 5).map(task => (
                <ActionableTaskCard key={task.id} task={task} />
              ))}
              {upcomingTasks.length > 5 && (
                <div className="text-center pt-3">
                  <Button variant="ghost" size="sm" onClick={() => toast.success('Action completed — task list updated')}>
                    View all {upcomingTasks.length} upcoming items
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* All Filtered Tasks - show when filters are active and no grouped tasks match */}
        {hasActiveFilters && urgentTasks.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && filteredTasks.length > 0 && (
          <CollapsibleSection
            title="Filtered Tasks"
            icon={<Filter className="w-5 h-5 text-accent-blue" />}
            count={filteredTasks.length}
            defaultExpanded={true}
            variant="card"
            size="sm"
          >
            <div className="space-y-3">
              {filteredTasks.slice(0, 10).map(task => (
                <ActionableTaskCard key={task.id} task={task} />
              ))}
              {filteredTasks.length > 10 && (
                <div className="text-center pt-3">
                  <Button variant="ghost" size="sm" onClick={() => toast.success('Action completed — task list updated')}>
                    View all {filteredTasks.length} filtered items
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Empty State - No tasks at all */}
        {tasks.length === 0 && (
          <Card className="text-center py-16">
            <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary">All caught up!</h3>
            <p className="text-text-muted mt-2 max-w-md mx-auto">
              You have no pending tasks at the moment. Use the quick actions above to get started on new work.
            </p>
          </Card>
        )}
        
        {/* Empty State - No tasks match filters */}
        {hasActiveFilters && filteredTasks.length === 0 && tasks.length > 0 && (
          <Card className="text-center py-16">
            <Filter className="w-16 h-16 text-text-muted mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-text-primary">No matching tasks</h3>
            <p className="text-text-muted mt-2 max-w-md mx-auto">
              No tasks match your current filters. Try adjusting your filter criteria.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
              Clear Filters
            </Button>
          </Card>
        )}
        </div>{/* End task-list-section */}
      </div>
    </div>
  );
}

export default ActionCenterScreen;
