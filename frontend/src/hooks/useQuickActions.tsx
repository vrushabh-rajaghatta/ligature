


import { useState, useCallback, useMemo } from 'react';
import { useHAQStore } from '@/store/useHAQStore';
import { usePharmacovigilanceStore } from '@/store/usePharmacovigilanceStore';
import { useQMSStore } from '@/store/useQMSStore';
import { useAppStore } from '@/store/useAppStore';
import type { AggregatedTask, TaskType } from '@/store/useTaskAggregationStore';
import type { StatCardAction } from '@/components/ui/Card';
import { Eye, Wand2, Edit, Send, CheckCircle, AlertTriangle, FileText } from 'lucide-react';

/**
 * v0.12.3: useQuickActions Hook
 * 
 * Provides action execution logic for StatCard actions and Quick Action Drawer.
 * Integrates with stores to get contextual data for generating relevant actions.
 */

// v0.42.28: Interface for safety signal operations
interface SafetySignalItem {
  status: string;
  priority?: string;
  [key: string]: unknown;
}

export interface QuickActionContext {
  /** The task being acted upon */
  task?: AggregatedTask;
  /** Source module ID */
  sourceModule?: string;
  /** Source entity ID within the module */
  sourceId?: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

export interface QuickActionsResult {
  /** Whether the quick action drawer is open */
  isDrawerOpen: boolean;
  /** Open the drawer with context */
  openDrawer: (context: QuickActionContext) => void;
  /** Close the drawer */
  closeDrawer: () => void;
  /** Current drawer context */
  drawerContext: QuickActionContext | null;
  /** Execute an action by ID */
  executeAction: (actionId: string, context?: Record<string, unknown>) => void;
  /** Get actions for a specific stat card type */
  getStatCardActions: (type: StatCardType, data?: StatCardData) => StatCardAction[];
  /** Navigate to source module for the current context */
  navigateToSource: () => void;
  /** Loading state for async actions */
  isLoading: boolean;
}

export type StatCardType = 
  | 'total-programs'
  | 'active-submissions'
  | 'open-haqs'
  | 'ready-to-submit'
  | 'safety-signals'
  | 'open-deviations'
  | 'pending-reviews';

export interface StatCardData {
  count?: number;
  overdueCount?: number;
  criticalCount?: number;
  mostUrgentId?: string;
  mostUrgentTitle?: string;
}

export function useQuickActions(): QuickActionsResult {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerContext, setDrawerContext] = useState<QuickActionContext | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Store access
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const haqs = useHAQStore(s => s.haqs);
  const signals = usePharmacovigilanceStore(s => s.signals);
  const deviations = useQMSStore(s => s.deviations);
  
  // Open drawer with context
  const openDrawer = useCallback((context: QuickActionContext) => {
    setDrawerContext(context);
    setIsDrawerOpen(true);
  }, []);
  
  // Close drawer
  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
    // Delay clearing context to allow exit animation
    setTimeout(() => setDrawerContext(null), 300);
  }, []);
  
  // Navigate to source module
  const navigateToSource = useCallback(() => {
    if (drawerContext?.sourceModule) {
      setActiveModule(drawerContext.sourceModule as any);
      closeDrawer();
    }
  }, [drawerContext, setActiveModule, closeDrawer]);
  
  // Execute action by ID
  const executeAction = useCallback((actionId: string, context?: Record<string, unknown>) => {
    setIsLoading(true);
    
    try {
      switch (actionId) {
        case 'view-all-haqs':
          setActiveModule('haq');
          break;
          
        case 'view-overdue-haqs':
          // Set filter state before navigating so HAQScreen picks it up
          useHAQStore.getState().setFilterStatus('all');
          useHAQStore.getState().setFilterPriority('all');
          setActiveModule('haq');
          break;
          
        case 'draft-haq-response':
          if (context?.haqId) {
            useHAQStore.getState().selectHAQ(context.haqId as string);
          }
          setActiveModule('haq');
          break;
          
        case 'view-all-submissions':
          setActiveModule('submissions-hub');
          break;
          
        case 'view-active-submissions':
          setActiveModule('submissions-hub');
          break;
          
        case 'view-ready-to-submit':
          useHAQStore.getState().setFilterStatus('draft-ready');
          setActiveModule('haq');
          break;
          
        case 'view-safety-signals':
          setActiveModule('safety');
          break;
          
        case 'assess-signal':
          setActiveModule('safety');
          if (context?.signalId) {
            usePharmacovigilanceStore.getState().selectSignal?.(context.signalId as string);
          }
          break;
          
        case 'view-deviations':
          setActiveModule('qms');
          break;
          
        case 'respond-deviation':
          setActiveModule('qms');
          break;
          
        case 'view-pending-reviews':
          setActiveModule('authoring');
          break;
          
        case 'quick-action-drawer':
          if (context?.task) {
            openDrawer({ task: context.task as AggregatedTask });
          }
          break;
          
        default:
          // Unknown action — no-op
          break;
      }
    } finally {
      setIsLoading(false);
    }
  }, [setActiveModule, openDrawer]);
  
  // Get most urgent HAQ
  const mostUrgentHAQ = useMemo(() => {
    if (!haqs || haqs.length === 0) return null;
    
    // Sort by priority and due date
    const sorted = [...haqs]
      .filter(h => h.status === 'open' || h.status === 'new' || h.status === 'in-progress')
      .sort((a, b) => {
        // Priority order: critical > high > medium > low
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        const aPriority = priorityOrder[a.priority || 'medium'] ?? 2;
        const bPriority = priorityOrder[b.priority || 'medium'] ?? 2;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // Then by due date
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    
    return sorted[0] || null;
  }, [haqs]);
  
  // Get most urgent safety signal
  const mostUrgentSignal = useMemo(() => {
    if (!signals) return null;
    
    const signalList = Object.values(signals) as unknown as SafetySignalItem[];
    const urgent = signalList
      .filter((s: SafetySignalItem) => s.status === 'new' || s.status === 'under_review')
      .sort((a: SafetySignalItem, b: SafetySignalItem) => {
        // Sort by priority
        const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (priorityOrder[a.priority ?? 'medium'] ?? 2) - (priorityOrder[b.priority ?? 'medium'] ?? 2);
      });
    
    return urgent[0] || null;
  }, [signals]);
  
  // Get stat card actions based on type
  const getStatCardActions = useCallback((type: StatCardType, data?: StatCardData): StatCardAction[] => {
    switch (type) {
      case 'open-haqs':
        const haqActions: StatCardAction[] = [
          {
            id: 'view-all-haqs',
            label: 'View All',
            icon: <Eye className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
        ];
        
        // Add overdue filter if there are overdue HAQs
        if (data?.overdueCount && data.overdueCount > 0) {
          haqActions.push({
            id: 'view-overdue-haqs',
            label: `${data.overdueCount} Overdue`,
            icon: <AlertTriangle className="w-3.5 h-3.5" />,
            variant: 'danger',
          });
        }
        
        // Add draft action for most urgent
        if (mostUrgentHAQ) {
          haqActions.push({
            id: 'draft-haq-response',
            label: 'Draft Response',
            icon: <Wand2 className="w-3.5 h-3.5" />,
            variant: 'primary',
            context: { haqId: mostUrgentHAQ.id },
          });
        }
        
        return haqActions;
        
      case 'active-submissions':
        return [
          {
            id: 'view-active-submissions',
            label: 'View Active',
            icon: <Eye className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
          {
            id: 'view-all-submissions',
            label: 'All Submissions',
            icon: <FileText className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
        ];
        
      case 'ready-to-submit':
        return [
          {
            id: 'view-ready-to-submit',
            label: 'View Ready',
            icon: <CheckCircle className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
          {
            id: 'submit-responses',
            label: 'Submit',
            icon: <Send className="w-3.5 h-3.5" />,
            variant: 'primary',
            disabled: (data?.count || 0) === 0,
          },
        ];
        
      case 'safety-signals':
        const signalActions: StatCardAction[] = [
          {
            id: 'view-safety-signals',
            label: 'View All',
            icon: <Eye className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
        ];
        
        if (mostUrgentSignal) {
          signalActions.push({
            id: 'assess-signal',
            label: 'Assess Signal',
            icon: <Edit className="w-3.5 h-3.5" />,
            variant: 'primary',
            context: { signalId: (mostUrgentSignal as any).id },
          });
        }
        
        return signalActions;
        
      case 'open-deviations':
        return [
          {
            id: 'view-deviations',
            label: 'View All',
            icon: <Eye className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
          {
            id: 'respond-deviation',
            label: 'Respond',
            icon: <Edit className="w-3.5 h-3.5" />,
            variant: 'primary',
          },
        ];
        
      case 'pending-reviews':
        return [
          {
            id: 'view-pending-reviews',
            label: 'View Reviews',
            icon: <Eye className="w-3.5 h-3.5" />,
            variant: 'secondary',
          },
        ];
        
      default:
        return [];
    }
  }, [mostUrgentHAQ, mostUrgentSignal]);
  
  return {
    isDrawerOpen,
    openDrawer,
    closeDrawer,
    drawerContext,
    executeAction,
    getStatCardActions,
    navigateToSource,
    isLoading,
  };
}

/**
 * Helper to get primary action for a task type (used in QuickActionDrawer)
 */
export function getPrimaryActionForTask(task: AggregatedTask): {
  label: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'danger';
} | null {
  switch (task.type) {
    case 'haq-response':
      return {
        label: 'Draft with AI',
        icon: <Wand2 className="w-4 h-4" />,
        variant: 'primary',
      };
    case 'document-review':
      return {
        label: 'Start Review',
        icon: <Edit className="w-4 h-4" />,
        variant: 'primary',
      };
    case 'safety-signal':
      return {
        label: 'Begin Assessment',
        icon: <Edit className="w-4 h-4" />,
        variant: 'primary',
      };
    case 'deviation-response':
      return {
        label: 'Respond',
        icon: <Edit className="w-4 h-4" />,
        variant: 'primary',
      };
    case 'submission-milestone':
      return {
        label: 'Mark Complete',
        icon: <CheckCircle className="w-4 h-4" />,
        variant: 'primary',
      };
    default:
      return null;
  }
}

/**
 * Helper to get secondary actions for a task type
 */
export function getSecondaryActionsForTask(task: AggregatedTask): Array<{
  id: string;
  label: string;
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'danger';
}> {
  const actions = [];
  
  // All tasks can be viewed in full
  actions.push({
    id: 'view-full',
    label: 'View Details',
    icon: <Eye className="w-4 h-4" />,
    variant: 'secondary' as const,
  });
  
  // Task-specific secondary actions
  switch (task.type) {
    case 'haq-response':
      actions.push({
        id: 'view-sources',
        label: 'View Sources',
        icon: <FileText className="w-4 h-4" />,
        variant: 'secondary' as const,
      });
      break;
    case 'safety-signal':
      actions.push({
        id: 'view-cases',
        label: 'View Cases',
        icon: <FileText className="w-4 h-4" />,
        variant: 'secondary' as const,
      });
      break;
  }
  
  return actions;
}

export default useQuickActions;
