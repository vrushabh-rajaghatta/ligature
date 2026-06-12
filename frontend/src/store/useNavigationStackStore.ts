

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ModuleId } from '@/types/core';

// ============================================================================
// Navigation Stack Store - v0.12.5 (Sprint 3 E.1)
// ============================================================================
// Implements a navigation stack for cross-module navigation with:
// - Forward/back navigation with context preservation
// - Module state snapshots for return navigation
// - Scroll position restoration
// - Maximum stack size enforcement
// - Session persistence
// ============================================================================

// Navigation frame representing a single point in navigation history
export interface NavigationFrame {
  id: string;
  moduleId: ModuleId;
  label: string;                        // Human-readable breadcrumb label
  timestamp: number;
  scrollPosition: number;
  viewMode?: string;                    // Module-specific view mode
  selection?: {                         // Selected item within module
    id: string;
    type: string;                       // e.g., 'haq', 'document', 'signal'
    label?: string;
  };
  state?: Record<string, unknown>;      // Preserved module state
  filters?: Record<string, string>;     // Active filters
}

// Navigation stack state
interface NavigationStackState {
  stack: NavigationFrame[];
  currentIndex: number;
  maxStackSize: number;
  
  // Actions
  push: (frame: Omit<NavigationFrame, 'id' | 'timestamp'>) => void;
  pop: () => NavigationFrame | null;
  goBack: () => NavigationFrame | null;
  goForward: () => NavigationFrame | null;
  goToIndex: (index: number) => NavigationFrame | null;
  replaceTop: (frame: Partial<NavigationFrame>) => void;
  clear: () => void;
  
  // Queries
  canGoBack: () => boolean;
  canGoForward: () => boolean;
  getCurrentFrame: () => NavigationFrame | null;
  getPreviousFrame: () => NavigationFrame | null;
  getReturnLabel: () => string | null;
  getFrameByModule: (moduleId: ModuleId) => NavigationFrame | null;
  getStackDepth: () => number;
}

// Generate unique frame ID
const generateFrameId = () => `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default max stack size
const DEFAULT_MAX_STACK_SIZE = 20;

// Module display labels for breadcrumbs
const MODULE_LABELS: Record<ModuleId, string> = {
  'portfolio': 'Portfolio',
  'action-center': 'My Tasks',
  'activity': 'Activity',
  'research': 'Research',
  'sample-management': 'Sample Management',
  'eln': 'Lab Notebook',
  'development': 'Development',
  'study-design': 'Study Design',
  'safety': 'Safety & PV',
  'psmf': 'PSMF',
  'glp': 'GLP Compliance',
  'nonclinical': 'Nonclinical',
  'quality': 'Quality',
  'cmc': 'CMC',
  'cmc-manufacturing': 'CMC & Manufacturing',
  'authoring': 'Document Authoring',
  'labeling': 'Labeling',
  'submissions': 'Submissions',
  'submissions-hub': 'Submissions Hub',
  'publishing': 'Publishing',
  'ectd-workspace': 'eCTD Workspace',
  'publishing-center': 'Publishing Center',
  'ectd-publishing': 'eCTD Publishing',
  'strategy': 'Regulatory Strategy',
  'haq': 'HAQ Intelligence',
  'supply-chain': 'Supply Chain',
  'publications': 'Publications',
  'admin': 'Administration',
  'master-data': 'Master Data',
  'document-control': 'Document Control',
  'ctms': 'Clinical Trials',
  'tmf': 'Trial Master File',
  'study-intel': 'Study Intelligence',
  'qms': 'QMS',
  'inspector-readiness': 'Inspector Readiness',
  'archives': 'R&D Archives',
  'ai-generation': 'AI Generation',
  'analytics': 'Platform Analytics',
  'reg-calendar': 'Regulatory Calendar',
  'medical-affairs': 'Medical Affairs',
  'continuous-submission': 'Continuous Submission',
  'ai-consistency': 'AI Consistency',
  'idmp': 'IDMP',
  'commercial': 'Commercial',
  'manufacturing': 'Manufacturing',
  'registrations': 'Registrations',
  'commitments': 'Commitments',
  'portfolio-strategy': 'Portfolio Strategy',
  // v0.33.23: New modules
  'signal-detection': 'Signal Detection',
  'stability': 'Stability',
  'batch-records': 'Batch Records',
  'ai-authoring': 'AI Authoring',
  // Additional modules
  'home': 'Home',
  'research-lead-opt': 'Lead Optimization',
  'research-translational': 'Translational Science',
  'research-targets': 'Target Programs',
  'research-preclinical': 'Preclinical',
  'research-ind': 'IND Readiness',
  'research-literature': 'Literature Monitoring',
  'research-intelligence': 'Competitive Intelligence',
  'biostats': 'Biostatistics',
  'study-startup': 'Study Startup',
  'submission-command': 'Submission Command',
  'submission-planning': 'Submission Planning',
  'template-registry': 'Template Registry',
  'spl': 'Structured Product Labeling',
  'ectd-intelligence': 'eCTD Intelligence',
  'reg-intel': 'Regulatory Intelligence',
  'gcp': 'GCP Compliance',
  'gmp': 'GMP Compliance',
  'adpromo': 'Ad/Promo Review',
  'rd-connected': 'R&D Connected',
  'agent-hub': 'Agent Hub',
};

/**
 * Get human-readable label for a module
 */
export const getModuleLabel = (moduleId: ModuleId): string => {
  return MODULE_LABELS[moduleId] || moduleId;
};

/**
 * Navigation Stack Store
 * Manages navigation history with state preservation for smooth cross-module navigation
 */
export const useNavigationStackStore = create<NavigationStackState>()(
  devtools(
    persist(
      (set, get) => ({
        stack: [],
        currentIndex: -1,
        maxStackSize: DEFAULT_MAX_STACK_SIZE,

        push: (frame) => {
          const { stack, currentIndex, maxStackSize } = get();
          
          const newFrame: NavigationFrame = {
            ...frame,
            id: generateFrameId(),
            timestamp: Date.now(),
          };
          
          // If we're not at the end of the stack, truncate forward history
          let newStack = currentIndex < stack.length - 1
            ? stack.slice(0, currentIndex + 1)
            : [...stack];
          
          // Add new frame
          newStack.push(newFrame);
          
          // Enforce max size by removing oldest entries
          if (newStack.length > maxStackSize) {
            newStack = newStack.slice(newStack.length - maxStackSize);
          }
          
          set({
            stack: newStack,
            currentIndex: newStack.length - 1,
          });
        },

        pop: () => {
          const { stack, currentIndex } = get();
          
          if (currentIndex <= 0) return null;
          
          const poppedFrame = stack[currentIndex];
          const newStack = stack.slice(0, currentIndex);
          
          set({
            stack: newStack,
            currentIndex: newStack.length - 1,
          });
          
          return poppedFrame;
        },

        goBack: () => {
          const { stack, currentIndex } = get();
          
          if (currentIndex <= 0) return null;
          
          const newIndex = currentIndex - 1;
          set({ currentIndex: newIndex });
          
          return stack[newIndex];
        },

        goForward: () => {
          const { stack, currentIndex } = get();
          
          if (currentIndex >= stack.length - 1) return null;
          
          const newIndex = currentIndex + 1;
          set({ currentIndex: newIndex });
          
          return stack[newIndex];
        },

        goToIndex: (index) => {
          const { stack } = get();
          
          if (index < 0 || index >= stack.length) return null;
          
          set({ currentIndex: index });
          return stack[index];
        },

        replaceTop: (updates) => {
          const { stack, currentIndex } = get();
          
          if (currentIndex < 0 || stack.length === 0) return;
          
          const currentFrame = stack[currentIndex];
          const updatedFrame = { ...currentFrame, ...updates };
          
          const newStack = [...stack];
          newStack[currentIndex] = updatedFrame;
          
          set({ stack: newStack });
        },

        clear: () => {
          set({ stack: [], currentIndex: -1 });
        },

        canGoBack: () => {
          return get().currentIndex > 0;
        },

        canGoForward: () => {
          const { stack, currentIndex } = get();
          return currentIndex < stack.length - 1;
        },

        getCurrentFrame: () => {
          const { stack, currentIndex } = get();
          return currentIndex >= 0 && currentIndex < stack.length
            ? stack[currentIndex]
            : null;
        },

        getPreviousFrame: () => {
          const { stack, currentIndex } = get();
          return currentIndex > 0 ? stack[currentIndex - 1] : null;
        },

        getReturnLabel: () => {
          const previousFrame = get().getPreviousFrame();
          if (!previousFrame) return null;
          
          // Use frame label if set, otherwise use module label
          if (previousFrame.label) return previousFrame.label;
          return getModuleLabel(previousFrame.moduleId);
        },

        getFrameByModule: (moduleId) => {
          const { stack, currentIndex } = get();
          
          // Search backward from current position
          for (let i = currentIndex; i >= 0; i--) {
            if (stack[i].moduleId === moduleId) {
              return stack[i];
            }
          }
          return null;
        },

        getStackDepth: () => {
          return get().stack.length;
        },
      }),
      {
        name: 'ligature-navigation-stack',
        partialize: (state) => ({
          stack: state.stack,
          currentIndex: state.currentIndex,
        }),
      }
    ),
    { name: 'NavigationStackStore' }
  )
);

// ============================================================================
// Selector Hooks (stable selectors to prevent re-renders)
// ============================================================================

export const useCanGoBack = () => useNavigationStackStore((s) => s.canGoBack());
export const useCanGoForward = () => useNavigationStackStore((s) => s.canGoForward());
export const useCurrentFrame = () => useNavigationStackStore((s) => s.getCurrentFrame());
export const usePreviousFrame = () => useNavigationStackStore((s) => s.getPreviousFrame());
export const useReturnLabel = () => useNavigationStackStore((s) => s.getReturnLabel());
export const useStackDepth = () => useNavigationStackStore((s) => s.getStackDepth());

// ============================================================================
// Navigation Actions (for use outside React components)
// ============================================================================

export const navigationStackActions = {
  push: (frame: Omit<NavigationFrame, 'id' | 'timestamp'>) => 
    useNavigationStackStore.getState().push(frame),
  
  pop: () => useNavigationStackStore.getState().pop(),
  
  goBack: () => useNavigationStackStore.getState().goBack(),
  
  goForward: () => useNavigationStackStore.getState().goForward(),
  
  replaceTop: (updates: Partial<NavigationFrame>) =>
    useNavigationStackStore.getState().replaceTop(updates),
  
  clear: () => useNavigationStackStore.getState().clear(),
  
  getCurrentFrame: () => useNavigationStackStore.getState().getCurrentFrame(),
  
  getPreviousFrame: () => useNavigationStackStore.getState().getPreviousFrame(),
};

export default useNavigationStackStore;
