

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { useShallow } from 'zustand/react/shallow'
import type { ModuleId } from '@/types/core'

// Task types from across all modules
export type TaskType = 
  | 'haq-response'           // HAQ needing response
  | 'haq-review'             // HAQ response needing review
  | 'document-review'        // Document needing review
  | 'document-signature'     // Document needing signature
  | 'safety-signal'          // Safety signal requiring assessment
  | 'safety-case'            // ICSR case requiring action
  | 'deviation-response'     // QMS deviation needing response
  | 'capa-action'            // CAPA action due
  | 'submission-milestone'   // Submission milestone approaching
  | 'workflow-approval'      // General workflow approval
  | 'tmf-artifact'           // TMF artifact missing/overdue
  | 'labeling-review';       // Labeling change needing review

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'in-progress' | 'blocked' | 'completed';

export interface AggregatedTask {
  id: string;
  type: TaskType;
  title: string;
  description: string;
  sourceModule: ModuleId;
  sourceId: string;           // ID in source system (HAQ ID, doc ID, etc.)
  sourceLabel: string;        // Human-readable source reference
  assignedTo: string;
  dueDate: string | null;
  daysUntilDue: number | null;
  priority: TaskPriority;
  status: TaskStatus;
  metadata: Record<string, unknown>;  // Module-specific data
  createdAt: string;
  updatedAt: string;
  // v0.44.44: Causality — set when task was spawned by a cascade chain
  cascadeChainId?: string;
  triggeredByLabel?: string;  // e.g. "Signal SIG-024 — Hepatotoxicity confirmed"
  triggeredAt?: string;       // ISO timestamp of the triggering event
}

// Task display configuration
export const TASK_TYPE_CONFIG: Record<TaskType, { 
  label: string; 
  icon: string; 
  color: string;
  actionLabel: string;
}> = {
  'haq-response': { 
    label: 'HAQ Response', 
    icon: 'MessageSquare', 
    color: '#F59E0B',
    actionLabel: 'Draft Response'
  },
  'haq-review': { 
    label: 'HAQ Review', 
    icon: 'CheckCircle', 
    color: '#F59E0B',
    actionLabel: 'Review Response'
  },
  'document-review': { 
    label: 'Document Review', 
    icon: 'FileText', 
    color: '#3B82F6',
    actionLabel: 'Review Document'
  },
  'document-signature': { 
    label: 'Signature Required', 
    icon: 'PenTool', 
    color: '#8B5CF6',
    actionLabel: 'Sign Document'
  },
  'safety-signal': { 
    label: 'Safety Signal', 
    icon: 'AlertTriangle', 
    color: '#EF4444',
    actionLabel: 'Assess Signal'
  },
  'safety-case': { 
    label: 'Safety Case', 
    icon: 'ShieldAlert', 
    color: '#EF4444',
    actionLabel: 'Process Case'
  },
  'deviation-response': { 
    label: 'Deviation', 
    icon: 'AlertCircle', 
    color: '#F97316',
    actionLabel: 'Respond to Deviation'
  },
  'capa-action': { 
    label: 'CAPA Action', 
    icon: 'CheckSquare', 
    color: '#F97316',
    actionLabel: 'Complete Action'
  },
  'submission-milestone': { 
    label: 'Submission Milestone', 
    icon: 'Target', 
    color: '#10B981',
    actionLabel: 'View Milestone'
  },
  'workflow-approval': { 
    label: 'Approval Needed', 
    icon: 'ThumbsUp', 
    color: '#6366F1',
    actionLabel: 'Approve'
  },
  'tmf-artifact': { 
    label: 'TMF Artifact', 
    icon: 'FolderOpen', 
    color: '#14B8A6',
    actionLabel: 'Upload Artifact'
  },
  'labeling-review': { 
    label: 'Labeling Review', 
    icon: 'Tag', 
    color: '#EC4899',
    actionLabel: 'Review Label'
  },
};

export interface TaskFilters {
  types: TaskType[];
  priorities: TaskPriority[];
  statuses: TaskStatus[];
  modules: ModuleId[];
  dateRange: 'today' | 'week' | 'month' | 'overdue' | 'all';
  assignee: 'me' | 'team' | 'all';
  search: string;
}

const defaultFilters: TaskFilters = {
  types: [],
  priorities: [],
  statuses: ['pending', 'in-progress', 'blocked'],
  modules: [],
  dateRange: 'all',
  assignee: 'me',
  search: '',
};

interface TaskAggregationState {
  // Data
  tasks: AggregatedTask[];
  isLoading: boolean;
  lastRefresh: string | null;
  
  // Filters
  filters: TaskFilters;
  
  // Computed
  filteredTasks: AggregatedTask[];
  taskCounts: {
    total: number;
    overdue: number;
    dueToday: number;
    dueThisWeek: number;
    byType: Record<TaskType, number>;
    byPriority: Record<TaskPriority, number>;
  };
  
  // Actions
  setTasks: (tasks: AggregatedTask[]) => void;
  addTask: (task: AggregatedTask) => void;
  updateTask: (taskId: string, updates: Partial<AggregatedTask>) => void;
  removeTask: (taskId: string) => void;
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  clearFilters: () => void;
  refreshTasks: () => Promise<void>;
  markComplete: (taskId: string) => void;
}

// Helper to calculate days until due
function calculateDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper to filter tasks
function filterTasks(tasks: AggregatedTask[], filters: TaskFilters): AggregatedTask[] {
  return tasks.filter(task => {
    // Type filter
    if (filters.types.length > 0 && !filters.types.includes(task.type)) {
      return false;
    }
    
    // Priority filter
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }
    
    // Status filter
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
      return false;
    }
    
    // Module filter
    if (filters.modules.length > 0 && !filters.modules.includes(task.sourceModule)) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange !== 'all' && task.daysUntilDue !== null) {
      const days = task.daysUntilDue;
      switch (filters.dateRange) {
        case 'overdue':
          // v0.38.4: Only show recent overdue (within 30 days) - ancient items aren't actionable
          if (days >= 0 || days < -30) return false;
          break;
        case 'today':
          if (days !== 0) return false;
          break;
        case 'week':
          if (days < 0 || days > 7) return false;
          break;
        case 'month':
          if (days < 0 || days > 30) return false;
          break;
      }
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(searchLower);
      const matchesDesc = task.description.toLowerCase().includes(searchLower);
      const matchesSource = task.sourceLabel.toLowerCase().includes(searchLower);
      if (!matchesTitle && !matchesDesc && !matchesSource) {
        return false;
      }
    }
    
    return true;
  });
}

// Helper to calculate counts
function calculateCounts(tasks: AggregatedTask[]) {
  const counts = {
    total: tasks.length,
    overdue: 0,
    dueToday: 0,
    dueThisWeek: 0,
    byType: {} as Record<TaskType, number>,
    byPriority: {} as Record<TaskPriority, number>,
  };
  
  // Initialize type counts
  Object.keys(TASK_TYPE_CONFIG).forEach(type => {
    counts.byType[type as TaskType] = 0;
  });
  
  // Initialize priority counts
  (['critical', 'high', 'medium', 'low'] as TaskPriority[]).forEach(p => {
    counts.byPriority[p] = 0;
  });
  
  tasks.forEach(task => {
    // Due date counts - v0.38.4: only count recent overdue (within 30 days) as actionable
    if (task.daysUntilDue !== null) {
      if (task.daysUntilDue < 0 && task.daysUntilDue >= -30) counts.overdue++;
      else if (task.daysUntilDue === 0) counts.dueToday++;
      else if (task.daysUntilDue <= 7) counts.dueThisWeek++;
    }
    
    // Type counts
    counts.byType[task.type] = (counts.byType[task.type] || 0) + 1;
    
    // Priority counts
    counts.byPriority[task.priority] = (counts.byPriority[task.priority] || 0) + 1;
  });
  
  return counts;
}

export const useTaskAggregationStore = create<TaskAggregationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      tasks: [],
      isLoading: false,
      lastRefresh: null,
      filters: defaultFilters,
      filteredTasks: [],
      taskCounts: {
        total: 0,
        overdue: 0,
        dueToday: 0,
        dueThisWeek: 0,
        byType: {} as Record<TaskType, number>,
        byPriority: {} as Record<TaskPriority, number>,
      },
      
      // Set all tasks (e.g., from aggregation service)
      setTasks: (tasks) => {
        const filtered = filterTasks(tasks, get().filters);
        set(
          { 
            tasks, 
            filteredTasks: filtered,
            taskCounts: calculateCounts(tasks),
            lastRefresh: new Date().toISOString(),
          },
          false,
          'setTasks'
        );
      },
      
      addTask: (task) => {
        const { tasks, filters } = get();
        const newTasks = [...tasks, task];
        const filtered = filterTasks(newTasks, filters);
        set(
          { 
            tasks: newTasks, 
            filteredTasks: filtered,
            taskCounts: calculateCounts(newTasks),
          },
          false,
          'addTask'
        );
      },
      
      updateTask: (taskId, updates) => {
        const { tasks, filters } = get();
        const newTasks = tasks.map(t => 
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        const filtered = filterTasks(newTasks, filters);
        set(
          { 
            tasks: newTasks, 
            filteredTasks: filtered,
            taskCounts: calculateCounts(newTasks),
          },
          false,
          'updateTask'
        );
      },
      
      removeTask: (taskId) => {
        const { tasks, filters } = get();
        const newTasks = tasks.filter(t => t.id !== taskId);
        const filtered = filterTasks(newTasks, filters);
        set(
          { 
            tasks: newTasks, 
            filteredTasks: filtered,
            taskCounts: calculateCounts(newTasks),
          },
          false,
          'removeTask'
        );
      },
      
      setFilter: (key, value) => {
        const { tasks, filters } = get();
        const newFilters = { ...filters, [key]: value };
        const filtered = filterTasks(tasks, newFilters);
        set(
          { filters: newFilters, filteredTasks: filtered },
          false,
          'setFilter'
        );
      },
      
      clearFilters: () => {
        const { tasks } = get();
        const filtered = filterTasks(tasks, defaultFilters);
        set(
          { filters: defaultFilters, filteredTasks: filtered },
          false,
          'clearFilters'
        );
      },
      
      refreshTasks: async () => {
        set({ isLoading: true }, false, 'refreshTasks:start');
        
        // In production, this would call a service to aggregate tasks
        // For now, we'll use the mock data aggregation (injected via setTasks)
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        set({ 
          isLoading: false, 
          lastRefresh: new Date().toISOString() 
        }, false, 'refreshTasks:complete');
      },
      
      markComplete: (taskId) => {
        get().updateTask(taskId, { status: 'completed' });
      },
    }),
    { name: 'LigatureTaskAggregation' }
  )
);

// Selector hooks
export const useTasks = () => useTaskAggregationStore(useShallow((s) => s.filteredTasks));
export const useTaskCounts = () => useTaskAggregationStore(useShallow((s) => s.taskCounts));
export const useTaskFilters = () => useTaskAggregationStore(useShallow((s) => s.filters));
export const useIsTasksLoading = () => useTaskAggregationStore((s) => s.isLoading);
export const useOverdueTasks = () => useTaskAggregationStore(
  // v0.38.4: Only return recent overdue (within 30 days) - ancient items aren't actionable
  useShallow((s) => s.filteredTasks.filter(t => t.daysUntilDue !== null && t.daysUntilDue < 0 && t.daysUntilDue >= -30))
);
export const useCriticalTasks = () => useTaskAggregationStore(
  useShallow((s) => s.filteredTasks.filter(t => t.priority === 'critical'))
);

// Helper function to create a task from HAQ data
export function createHAQTask(haq: {
  id: string;
  agency: string;
  dueDate: string;
  status: string;
  priority: string;
  questionCount: number;
  productId: string;
}): AggregatedTask {
  const daysUntilDue = calculateDaysUntilDue(haq.dueDate);
  return {
    id: `haq-${haq.id}`,
    type: 'haq-response',
    title: `${haq.agency} Questions (${haq.questionCount})`,
    description: `${haq.questionCount} question(s) requiring response`,
    sourceModule: 'haq',
    sourceId: haq.id,
    sourceLabel: `HAQ-${haq.id}`,
    assignedTo: 'current-user', // Would come from assignment data
    dueDate: haq.dueDate,
    daysUntilDue,
    priority: haq.priority.toLowerCase() as TaskPriority,
    status: haq.status === 'Open' ? 'pending' : 'in-progress',
    metadata: { productId: haq.productId, agency: haq.agency },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper function to create a task from Safety signal
export function createSafetySignalTask(signal: {
  id: string;
  name: string;
  status: string;
  priority: string;
  detectedDate: string;
}): AggregatedTask {
  return {
    id: `signal-${signal.id}`,
    type: 'safety-signal',
    title: signal.name,
    description: 'Safety signal requiring assessment',
    sourceModule: 'safety',
    sourceId: signal.id,
    sourceLabel: `Signal-${signal.id}`,
    assignedTo: 'current-user',
    dueDate: null, // Signals may not have explicit due dates
    daysUntilDue: null,
    priority: signal.priority.toLowerCase() as TaskPriority,
    status: signal.status === 'new' ? 'pending' : 'in-progress',
    metadata: { detectedDate: signal.detectedDate },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper function to create a task from QMS deviation
export function createDeviationTask(deviation: {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  type: string;
}): AggregatedTask {
  const daysUntilDue = calculateDaysUntilDue(deviation.dueDate);
  return {
    id: `dev-${deviation.id}`,
    type: 'deviation-response',
    title: deviation.title,
    description: `${deviation.type} deviation requiring response`,
    sourceModule: 'qms',
    sourceId: deviation.id,
    sourceLabel: `DEV-${deviation.id}`,
    assignedTo: 'current-user',
    dueDate: deviation.dueDate,
    daysUntilDue,
    priority: deviation.priority.toLowerCase() as TaskPriority,
    status: deviation.status === 'open' ? 'pending' : 'in-progress',
    metadata: { deviationType: deviation.type },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Helper function to create a task from pending document review
export function createDocumentReviewTask(review: {
  documentId: string;
  documentTitle: string;
  documentType: string;
  stageName: string;
  requestedBy: string;
  requestedAt: string;
  dueDate: string;
  sectionsToReview?: string[];
  commentCount?: number;
  priority: string;
}): AggregatedTask {
  const daysUntilDue = calculateDaysUntilDue(review.dueDate);
  const sectionCount = review.sectionsToReview?.length || 0;
  return {
    id: `docrev-${review.documentId}`,
    type: 'document-review',
    title: review.documentTitle,
    description: `${review.stageName}${sectionCount > 0 ? ` - ${sectionCount} section(s)` : ''}`,
    sourceModule: 'authoring',
    sourceId: review.documentId,
    sourceLabel: review.documentId.toUpperCase(),
    assignedTo: 'current-user',
    dueDate: review.dueDate,
    daysUntilDue,
    priority: review.priority.toLowerCase() as TaskPriority,
    status: 'pending',
    metadata: { 
      documentType: review.documentType,
      stageName: review.stageName,
      requestedBy: review.requestedBy,
      sectionsToReview: review.sectionsToReview,
      commentCount: review.commentCount,
    },
    createdAt: review.requestedAt,
    updatedAt: new Date().toISOString(),
  };
}

// Helper function to create a task from submission milestone
export function createSubmissionMilestoneTask(milestone: {
  id: string;
  name: string;
  targetDate: string;
  status: string;
  description?: string;
  submissionId: string;
  submissionName: string;
  submissionType: string;
  region: string;
}): AggregatedTask {
  const daysUntilDue = calculateDaysUntilDue(milestone.targetDate);
  
  // Determine priority based on status and days until due
  let priority: TaskPriority = 'medium';
  if (milestone.status === 'at-risk' || (daysUntilDue !== null && daysUntilDue < 0)) {
    priority = 'high';
  } else if (daysUntilDue !== null && daysUntilDue <= 7) {
    priority = 'high';
  } else if (milestone.status === 'blocked') {
    priority = 'critical';
  }
  
  return {
    id: `milestone-${milestone.id}`,
    type: 'submission-milestone',
    title: milestone.name,
    description: `${milestone.submissionName} (${milestone.submissionType}) - ${milestone.region}`,
    sourceModule: 'submissions-hub',
    sourceId: milestone.submissionId,
    sourceLabel: `${milestone.submissionType}-${milestone.submissionId.slice(-4)}`,
    assignedTo: 'current-user',
    dueDate: milestone.targetDate,
    daysUntilDue,
    priority,
    status: milestone.status === 'completed' ? 'completed' : 
            milestone.status === 'at-risk' ? 'in-progress' : 'pending',
    metadata: { 
      milestoneId: milestone.id,
      milestoneDescription: milestone.description,
      submissionType: milestone.submissionType,
      region: milestone.region,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
