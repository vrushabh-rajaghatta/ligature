

// ============================================================================
// Demo Mode Store - v76: Investor Demo & Polish
// Global state management for demo mode with guided flows
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

// ============================================================================
// TYPES
// ============================================================================

export type DemoStep = 
  | 'welcome'
  | 'portfolio-overview'
  | 'clinical-data'
  | 'document-authoring'
  | 'ai-generation'
  | 'haq-response'
  | 'safety-signal'
  | 'submission-building'
  | 'publishing'
  | 'complete'

export interface GuidedDemoState {
  isActive: boolean
  currentStep: DemoStep
  completedSteps: DemoStep[]
  startTime: number | null
  pausedAt: number | null
}

export interface DemoMetrics {
  documentsAuthored: number
  haqResponsesDrafted: number
  safetyCasesProcessed: number
  signalsEvaluated: number
  submissionsBuilt: number
  aiTokensSaved: number
  hoursAutomated: number
}

export interface AIGenerationDemo {
  id: string
  type: 'haq-response' | 'safety-narrative' | 'document-section' | 'signal-summary'
  status: 'idle' | 'generating' | 'complete'
  content: string
  streamPosition: number
  startedAt: number | null
  completedAt: number | null
}

interface DemoState {
  // Core demo mode
  isDemoMode: boolean
  showDemoIndicator: boolean
  
  // Guided demo flow
  guidedDemo: GuidedDemoState
  
  // Platform metrics (for investor showcase)
  metrics: DemoMetrics
  
  // Active AI generation demos (for simulated streaming)
  activeGenerations: Record<string, AIGenerationDemo>
  
  // Actions
  enableDemoMode: () => void
  disableDemoMode: () => void
  toggleDemoMode: () => void
  setShowDemoIndicator: (show: boolean) => void
  
  // Guided demo actions
  startGuidedDemo: () => void
  stopGuidedDemo: () => void
  pauseGuidedDemo: () => void
  resumeGuidedDemo: () => void
  advanceToStep: (step: DemoStep) => void
  completeStep: (step: DemoStep) => void
  resetGuidedDemo: () => void
  
  // AI generation demo actions
  startGeneration: (id: string, type: AIGenerationDemo['type'], content: string) => void
  updateGenerationProgress: (id: string, position: number) => void
  completeGeneration: (id: string) => void
  clearGeneration: (id: string) => void
  clearAllGenerations: () => void
  
  // Metrics actions
  incrementMetric: (key: keyof DemoMetrics, amount?: number) => void
  resetMetrics: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialGuidedDemo: GuidedDemoState = {
  isActive: false,
  currentStep: 'welcome',
  completedSteps: [],
  startTime: null,
  pausedAt: null,
}

const initialMetrics: DemoMetrics = {
  documentsAuthored: 147,
  haqResponsesDrafted: 89,
  safetyCasesProcessed: 1247,
  signalsEvaluated: 23,
  submissionsBuilt: 12,
  aiTokensSaved: 2_400_000,
  hoursAutomated: 892,
}

// ============================================================================
// DEMO STEP CONFIGURATION
// ============================================================================

export const DEMO_STEPS: Record<DemoStep, {
  title: string
  description: string
  module: string
  duration: number // seconds
}> = {
  'welcome': {
    title: 'Welcome to Ligature',
    description: 'R&D Connected Platform for Life Sciences',
    module: 'portfolio',
    duration: 30,
  },
  'portfolio-overview': {
    title: 'Portfolio Command Center',
    description: 'See your entire pipeline at a glance with LIG-2847 (Nexavant) highlighted',
    module: 'portfolio',
    duration: 45,
  },
  'clinical-data': {
    title: 'Clinical Development',
    description: 'Explore the Phase 3 STELLAR trial data and study intelligence',
    module: 'study-intel',
    duration: 60,
  },
  'document-authoring': {
    title: 'Structured Content Authoring',
    description: 'Watch AI-assisted document generation in action',
    module: 'authoring',
    duration: 90,
  },
  'ai-generation': {
    title: 'AI-Powered Generation',
    description: 'See real-time AI drafting with Claude integration',
    module: 'authoring',
    duration: 60,
  },
  'haq-response': {
    title: 'HAQ Intelligence',
    description: 'AI-drafted responses to FDA Day 74 questions',
    module: 'haq',
    duration: 90,
  },
  'safety-signal': {
    title: 'Safety & Pharmacovigilance',
    description: 'Signal detection and AI-generated case narratives',
    module: 'safety',
    duration: 60,
  },
  'submission-building': {
    title: 'eCTD Workspace',
    description: 'Build and validate regulatory submissions',
    module: 'ectd-workspace',
    duration: 60,
  },
  'publishing': {
    title: 'Publishing Center',
    description: 'Gateway submission and lifecycle management',
    module: 'publishing-center',
    duration: 45,
  },
  'complete': {
    title: 'Demo Complete',
    description: 'Ligature: Transforming Life Sciences R&D Operations',
    module: 'portfolio',
    duration: 30,
  },
}

export const DEMO_STEP_ORDER: DemoStep[] = [
  'welcome',
  'portfolio-overview',
  'clinical-data',
  'document-authoring',
  'ai-generation',
  'haq-response',
  'safety-signal',
  'submission-building',
  'publishing',
  'complete',
]

// ============================================================================
// STORE
// ============================================================================

export const useDemoStore = create<DemoState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        isDemoMode: true, // Default to demo mode for investor demos
        showDemoIndicator: true,
        guidedDemo: initialGuidedDemo,
        metrics: initialMetrics,
        activeGenerations: {},
        
        // Core demo mode actions
        enableDemoMode: () => set({ isDemoMode: true }, false, 'enableDemoMode'),
        
        disableDemoMode: () => set({ isDemoMode: false }, false, 'disableDemoMode'),
        
        toggleDemoMode: () => set(
          (state) => ({ isDemoMode: !state.isDemoMode }),
          false,
          'toggleDemoMode'
        ),
        
        setShowDemoIndicator: (show) => set(
          { showDemoIndicator: show },
          false,
          'setShowDemoIndicator'
        ),
        
        // Guided demo actions
        startGuidedDemo: () => set({
          guidedDemo: {
            isActive: true,
            currentStep: 'welcome',
            completedSteps: [],
            startTime: Date.now(),
            pausedAt: null,
          },
          isDemoMode: true,
        }, false, 'startGuidedDemo'),
        
        stopGuidedDemo: () => set({
          guidedDemo: {
            ...get().guidedDemo,
            isActive: false,
            pausedAt: null,
          },
        }, false, 'stopGuidedDemo'),
        
        pauseGuidedDemo: () => set({
          guidedDemo: {
            ...get().guidedDemo,
            pausedAt: Date.now(),
          },
        }, false, 'pauseGuidedDemo'),
        
        resumeGuidedDemo: () => set({
          guidedDemo: {
            ...get().guidedDemo,
            pausedAt: null,
          },
        }, false, 'resumeGuidedDemo'),
        
        advanceToStep: (step) => set({
          guidedDemo: {
            ...get().guidedDemo,
            currentStep: step,
          },
        }, false, 'advanceToStep'),
        
        completeStep: (step) => set((state) => ({
          guidedDemo: {
            ...state.guidedDemo,
            completedSteps: state.guidedDemo.completedSteps.includes(step)
              ? state.guidedDemo.completedSteps
              : [...state.guidedDemo.completedSteps, step],
          },
        }), false, 'completeStep'),
        
        resetGuidedDemo: () => set({
          guidedDemo: initialGuidedDemo,
        }, false, 'resetGuidedDemo'),
        
        // AI generation demo actions
        startGeneration: (id, type, content) => set((state) => ({
          activeGenerations: {
            ...state.activeGenerations,
            [id]: {
              id,
              type,
              status: 'generating',
              content,
              streamPosition: 0,
              startedAt: Date.now(),
              completedAt: null,
            },
          },
        }), false, 'startGeneration'),
        
        updateGenerationProgress: (id, position) => set((state) => ({
          activeGenerations: {
            ...state.activeGenerations,
            [id]: state.activeGenerations[id]
              ? { ...state.activeGenerations[id], streamPosition: position }
              : state.activeGenerations[id],
          },
        }), false, 'updateGenerationProgress'),
        
        completeGeneration: (id) => set((state) => ({
          activeGenerations: {
            ...state.activeGenerations,
            [id]: state.activeGenerations[id]
              ? {
                  ...state.activeGenerations[id],
                  status: 'complete',
                  streamPosition: state.activeGenerations[id].content.length,
                  completedAt: Date.now(),
                }
              : state.activeGenerations[id],
          },
        }), false, 'completeGeneration'),
        
        clearGeneration: (id) => set((state) => {
          const { [id]: _, ...rest } = state.activeGenerations
          return { activeGenerations: rest }
        }, false, 'clearGeneration'),
        
        clearAllGenerations: () => set(
          { activeGenerations: {} },
          false,
          'clearAllGenerations'
        ),
        
        // Metrics actions
        incrementMetric: (key, amount = 1) => set((state) => ({
          metrics: {
            ...state.metrics,
            [key]: state.metrics[key] + amount,
          },
        }), false, 'incrementMetric'),
        
        resetMetrics: () => set(
          { metrics: initialMetrics },
          false,
          'resetMetrics'
        ),
      }),
      {
        name: 'ligature-demo-storage',
        partialize: (state) => ({
          isDemoMode: state.isDemoMode,
          showDemoIndicator: state.showDemoIndicator,
          metrics: state.metrics,
        }),
      }
    ),
    { name: 'LigatureDemo' }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useIsDemoMode = () => useDemoStore((s) => s.isDemoMode)
// v204d-b14: Use useShallow to prevent infinite loops from object reference changes
export const useGuidedDemo = () => useDemoStore(useShallow((s) => s.guidedDemo))
export const useDemoMetrics = () => useDemoStore(useShallow((s) => s.metrics))

// v204d-b6: Use useMemo to prevent new object references
export const useCurrentDemoStep = () => {
  const step = useDemoStore((s) => s.guidedDemo.currentStep)
  return useMemo(() => ({ step, config: DEMO_STEPS[step] }), [step])
}

// v204d-b6: Use individual selectors and useMemo to prevent infinite loops
export const useDemoProgress = () => {
  const completedStepsLength = useDemoStore((s) => s.guidedDemo.completedSteps.length)
  const currentStep = useDemoStore((s) => s.guidedDemo.currentStep)
  
  return useMemo(() => {
    const currentIndex = DEMO_STEP_ORDER.indexOf(currentStep)
    const total = DEMO_STEP_ORDER.length
    return {
      completed: completedStepsLength,
      current: currentIndex + 1,
      total,
      percentage: Math.round((completedStepsLength / total) * 100),
    }
  }, [completedStepsLength, currentStep])
}

export const useActiveGeneration = (id: string) => 
  useDemoStore((s) => s.activeGenerations[id])
