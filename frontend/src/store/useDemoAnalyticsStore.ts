

// ============================================================================
// Demo Analytics Store - v77: Investor Engagement Tracking & Demo Paths
// Tracks which features are viewed, time spent, engagement patterns,
// and provides configurable demo paths for different audiences
// ============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { DemoStep } from './useDemoStore'

// ============================================================================
// DEMO PATH CONFIGURATIONS
// ============================================================================

export type DemoAudienceType = 'investor' | 'technical' | 'regulatory' | 'executive' | 'general'

export interface DemoPathConfig {
  id: string
  name: string
  description: string
  audienceType: DemoAudienceType
  steps: DemoStep[]
  estimatedMinutes: number
  focusAreas: string[]
  talkingPoints: string[]
}

export const DEMO_PATHS: DemoPathConfig[] = [
  {
    id: 'executive-overview',
    name: 'Executive Overview',
    description: 'High-level platform capabilities focused on ROI and strategic value',
    audienceType: 'executive',
    steps: ['welcome', 'portfolio-overview', 'ai-generation', 'haq-response', 'complete'],
    estimatedMinutes: 8,
    focusAreas: ['Platform vision', 'AI capabilities', 'Time savings', 'ROI metrics'],
    talkingPoints: [
      '73% faster document drafting with AI assistance',
      '$25B+ total addressable market in life sciences R&D',
      'First true IDOP platform connecting all R&D operations',
      'Single source of truth across 17+ integrated modules',
    ],
  },
  {
    id: 'technical-deep-dive',
    name: 'Technical Deep Dive',
    description: 'Detailed walkthrough of technical architecture and integrations',
    audienceType: 'technical',
    steps: [
      'welcome', 
      'portfolio-overview', 
      'clinical-data', 
      'document-authoring', 
      'ai-generation', 
      'submission-building', 
      'publishing',
      'complete'
    ],
    estimatedMinutes: 15,
    focusAreas: ['Data architecture', 'API integrations', 'Validation engine', 'eCTD compliance'],
    talkingPoints: [
      'Next.js 14 + React + TypeScript architecture',
      'Real-time Claude API integration with streaming',
      'ICH eCTD 4.0 compliant validation engine',
      'Zustand state management with cross-module sync',
    ],
  },
  {
    id: 'regulatory-focus',
    name: 'Regulatory Affairs Focus',
    description: 'Deep dive into regulatory workflows, HAQ management, and submissions',
    audienceType: 'regulatory',
    steps: [
      'welcome',
      'portfolio-overview',
      'haq-response',
      'document-authoring',
      'ai-generation',
      'submission-building',
      'publishing',
      'complete'
    ],
    estimatedMinutes: 12,
    focusAreas: ['HAQ analytics', 'eCTD building', 'Compliance validation', 'Submission lifecycle'],
    talkingPoints: [
      'AI-drafted HAQ responses with 94%+ quality scores',
      'Automated eCTD validation against 200+ business rules',
      'Real-time FDA ESG submission tracking',
      'Complete submission lifecycle from authoring to gateway',
    ],
  },
  {
    id: 'investor-pitch',
    name: 'Investor Pitch',
    description: 'Comprehensive demo highlighting market opportunity and differentiation',
    audienceType: 'investor',
    steps: [
      'welcome',
      'portfolio-overview',
      'clinical-data',
      'document-authoring',
      'ai-generation',
      'haq-response',
      'safety-signal',
      'submission-building',
      'publishing',
      'complete'
    ],
    estimatedMinutes: 18,
    focusAreas: ['Market size', 'Platform breadth', 'AI differentiation', 'Scalability'],
    talkingPoints: [
      '$25B+ TAM in life sciences R&D technology',
      'Document-to-data transformation unlocks AI capabilities',
      '17+ integrated modules vs. point solution competitors',
      'Pharma-specific AI trained on regulatory context',
    ],
  },
  {
    id: 'highlights-reel',
    name: 'Highlights Reel',
    description: 'Quick auto-advancing tour of the most impressive features',
    audienceType: 'executive',
    steps: ['welcome', 'portfolio-overview', 'ai-generation', 'haq-response', 'safety-signal', 'complete'],
    estimatedMinutes: 5,
    focusAreas: ['Visual impact', 'AI generation', 'Key differentiators'],
    talkingPoints: [
      'Watch AI draft a complete HAQ response in seconds',
      'See real-time signal detection and case narratives',
      'Connected platform eliminates data silos',
    ],
  },
]

// ============================================================================
// TYPES
// ============================================================================

export interface DemoSession {
  id: string
  startedAt: number
  endedAt: number | null
  completedSteps: DemoStep[]
  totalDurationMs: number
  mode: 'guided' | 'free-explore'
  audienceType: DemoAudienceType
  audienceName?: string
  pathId?: string
  notes: string
  highlightMoments: HighlightMoment[]
}

export interface HighlightMoment {
  id: string
  timestamp: number
  step: DemoStep
  type: 'positive' | 'question' | 'concern' | 'interest'
  description: string
}

export interface StepEngagement {
  step: DemoStep
  viewCount: number
  totalTimeMs: number
  averageTimeMs: number
  completionRate: number
  aiGenerationsTriggered: number
}

export interface FeatureEngagement {
  featureId: string
  featureName: string
  viewCount: number
  interactionCount: number
  firstViewedAt: number | null
  lastViewedAt: number | null
}

export interface ModuleEngagement {
  moduleId: string
  moduleName: string
  viewCount: number
  totalTimeMs: number
  averageTimeMs: number
}

export interface DemoAnalytics {
  // Session data
  currentSession: DemoSession | null
  sessions: DemoSession[]
  
  // Engagement tracking
  stepEngagement: Record<DemoStep, StepEngagement>
  featureEngagement: Record<string, FeatureEngagement>
  moduleEngagement: Record<string, ModuleEngagement>
  
  // AI feature tracking
  aiGenerations: {
    haqResponses: number
    safetyNarratives: number
    documentSections: number
    signalSummaries: number
  }
  
  // Aggregate stats
  totalSessions: number
  totalDemoTimeMs: number
  averageSessionDurationMs: number
  mostViewedModule: string | null
  mostEngagedFeature: string | null
  completionRate: number
}

interface DemoAnalyticsState extends DemoAnalytics {
  // Demo paths
  demoPaths: DemoPathConfig[]
  selectedPathId: string | null
  isAutoAdvance: boolean
  autoAdvanceIntervalMs: number
  
  // Session management
  startSession: (mode: 'guided' | 'free-explore', audienceType?: DemoAudienceType, audienceName?: string, pathId?: string) => void
  endSession: () => void
  
  // Step tracking
  recordStepView: (step: DemoStep, durationMs: number) => void
  recordStepCompletion: (step: DemoStep) => void
  
  // Feature tracking
  recordFeatureView: (featureId: string, featureName: string) => void
  recordFeatureInteraction: (featureId: string) => void
  
  // Module tracking
  recordModuleView: (moduleId: string, moduleName: string, durationMs: number) => void
  
  // AI generation tracking
  recordAIGeneration: (type: keyof DemoAnalytics['aiGenerations']) => void
  
  // Highlight moments
  addHighlightMoment: (type: HighlightMoment['type'], description: string, step: DemoStep) => void
  removeHighlightMoment: (id: string) => void
  
  // Session notes
  updateSessionNotes: (notes: string) => void
  
  // Demo path management
  selectPath: (pathId: string | null) => void
  getPathConfig: (pathId: string) => DemoPathConfig | undefined
  getPathSteps: () => DemoStep[]
  
  // Auto-advance mode
  enableAutoAdvance: (intervalMs?: number) => void
  disableAutoAdvance: () => void
  setAutoAdvanceInterval: (intervalMs: number) => void
  
  // Export/reporting
  getSessionReport: (sessionId: string) => DemoSession | undefined
  getEngagementSummary: () => {
    topModules: Array<{ id: string; name: string; views: number }>
    topFeatures: Array<{ id: string; name: string; interactions: number }>
    aiUsage: DemoAnalytics['aiGenerations']
    averageSessionTime: number
    totalDemoTime: number
  }
  exportAnalytics: () => string
  exportSessionMarkdown: (sessionId: string) => string
  
  // Reset
  resetAnalytics: () => void
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialStepEngagement: Record<DemoStep, StepEngagement> = {
  'welcome': { step: 'welcome', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'portfolio-overview': { step: 'portfolio-overview', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'clinical-data': { step: 'clinical-data', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'document-authoring': { step: 'document-authoring', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'ai-generation': { step: 'ai-generation', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'haq-response': { step: 'haq-response', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'safety-signal': { step: 'safety-signal', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'submission-building': { step: 'submission-building', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'publishing': { step: 'publishing', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
  'complete': { step: 'complete', viewCount: 0, totalTimeMs: 0, averageTimeMs: 0, completionRate: 0, aiGenerationsTriggered: 0 },
}

const initialAnalytics: Omit<DemoAnalytics, 'currentSession'> = {
  sessions: [],
  stepEngagement: initialStepEngagement,
  featureEngagement: {},
  moduleEngagement: {},
  aiGenerations: {
    haqResponses: 0,
    safetyNarratives: 0,
    documentSections: 0,
    signalSummaries: 0,
  },
  totalSessions: 0,
  totalDemoTimeMs: 0,
  averageSessionDurationMs: 0,
  mostViewedModule: null,
  mostEngagedFeature: null,
  completionRate: 0,
}

// ============================================================================
// STORE
// ============================================================================

export const useDemoAnalyticsStore = create<DemoAnalyticsState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialAnalytics,
        currentSession: null,
        demoPaths: DEMO_PATHS,
        selectedPathId: null,
        isAutoAdvance: false,
        autoAdvanceIntervalMs: 8000,
        
        // Session management
        startSession: (mode, audienceType = 'general', audienceName, pathId) => {
          const sessionId = `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          const session: DemoSession = {
            id: sessionId,
            startedAt: Date.now(),
            endedAt: null,
            completedSteps: [],
            totalDurationMs: 0,
            mode,
            audienceType,
            audienceName,
            pathId,
            notes: '',
            highlightMoments: [],
          }
          set({ currentSession: session, selectedPathId: pathId || null }, false, 'startSession')
        },
        
        endSession: () => {
          const state = get()
          if (!state.currentSession) return
          
          const endedSession: DemoSession = {
            ...state.currentSession,
            endedAt: Date.now(),
            totalDurationMs: Date.now() - state.currentSession.startedAt,
          }
          
          const newSessions = [...state.sessions, endedSession]
          const totalDemoTimeMs = newSessions.reduce((acc, s) => acc + s.totalDurationMs, 0)
          const completedSessions = newSessions.filter(s => s.completedSteps.includes('complete'))
          
          set({
            currentSession: null,
            sessions: newSessions,
            totalSessions: newSessions.length,
            totalDemoTimeMs,
            averageSessionDurationMs: totalDemoTimeMs / newSessions.length,
            completionRate: (completedSessions.length / newSessions.length) * 100,
          }, false, 'endSession')
        },
        
        // Step tracking
        recordStepView: (step, durationMs) => {
          set((state) => {
            const current = state.stepEngagement[step]
            const newViewCount = current.viewCount + 1
            const newTotalTime = current.totalTimeMs + durationMs
            
            return {
              stepEngagement: {
                ...state.stepEngagement,
                [step]: {
                  ...current,
                  viewCount: newViewCount,
                  totalTimeMs: newTotalTime,
                  averageTimeMs: newTotalTime / newViewCount,
                },
              },
            }
          }, false, 'recordStepView')
        },
        
        recordStepCompletion: (step) => {
          set((state) => {
            // Update current session
            const currentSession = state.currentSession
              ? {
                  ...state.currentSession,
                  completedSteps: state.currentSession.completedSteps.includes(step)
                    ? state.currentSession.completedSteps
                    : [...state.currentSession.completedSteps, step],
                }
              : null
            
            // Calculate completion rate for this step
            const sessionsWithStep = state.sessions.filter(s => s.completedSteps.includes(step)).length
            const totalSessionsWithViews = state.stepEngagement[step].viewCount
            const completionRate = totalSessionsWithViews > 0 
              ? (sessionsWithStep / totalSessionsWithViews) * 100 
              : 0
            
            return {
              currentSession,
              stepEngagement: {
                ...state.stepEngagement,
                [step]: {
                  ...state.stepEngagement[step],
                  completionRate,
                },
              },
            }
          }, false, 'recordStepCompletion')
        },
        
        // Feature tracking
        recordFeatureView: (featureId, featureName) => {
          const now = Date.now()
          set((state) => {
            const existing = state.featureEngagement[featureId]
            const updated: FeatureEngagement = existing
              ? {
                  ...existing,
                  viewCount: existing.viewCount + 1,
                  lastViewedAt: now,
                }
              : {
                  featureId,
                  featureName,
                  viewCount: 1,
                  interactionCount: 0,
                  firstViewedAt: now,
                  lastViewedAt: now,
                }
            
            const newEngagement = {
              ...state.featureEngagement,
              [featureId]: updated,
            }
            
            // Find most engaged feature
            const mostEngaged = Object.values(newEngagement).sort(
              (a, b) => b.interactionCount - a.interactionCount
            )[0]
            
            return {
              featureEngagement: newEngagement,
              mostEngagedFeature: mostEngaged?.featureId || null,
            }
          }, false, 'recordFeatureView')
        },
        
        recordFeatureInteraction: (featureId) => {
          set((state) => {
            const existing = state.featureEngagement[featureId]
            if (!existing) return state
            
            return {
              featureEngagement: {
                ...state.featureEngagement,
                [featureId]: {
                  ...existing,
                  interactionCount: existing.interactionCount + 1,
                },
              },
            }
          }, false, 'recordFeatureInteraction')
        },
        
        // Module tracking
        recordModuleView: (moduleId, moduleName, durationMs) => {
          set((state) => {
            const existing = state.moduleEngagement[moduleId]
            const newViewCount = (existing?.viewCount || 0) + 1
            const newTotalTime = (existing?.totalTimeMs || 0) + durationMs
            
            const newEngagement = {
              ...state.moduleEngagement,
              [moduleId]: {
                moduleId,
                moduleName,
                viewCount: newViewCount,
                totalTimeMs: newTotalTime,
                averageTimeMs: newTotalTime / newViewCount,
              },
            }
            
            // Find most viewed module
            const mostViewed = Object.values(newEngagement).sort(
              (a, b) => b.viewCount - a.viewCount
            )[0]
            
            return {
              moduleEngagement: newEngagement,
              mostViewedModule: mostViewed?.moduleId || null,
            }
          }, false, 'recordModuleView')
        },
        
        // AI generation tracking
        recordAIGeneration: (type) => {
          set((state) => ({
            aiGenerations: {
              ...state.aiGenerations,
              [type]: state.aiGenerations[type] + 1,
            },
          }), false, 'recordAIGeneration')
          
          // Also update current step if in guided demo
          const currentSession = get().currentSession
          if (currentSession?.mode === 'guided') {
            // This would need coordination with demo store
          }
        },
        
        // Export/reporting
        getSessionReport: (sessionId) => {
          return get().sessions.find(s => s.id === sessionId)
        },
        
        getEngagementSummary: () => {
          const state = get()
          
          const topModules = Object.values(state.moduleEngagement)
            .sort((a, b) => b.viewCount - a.viewCount)
            .slice(0, 5)
            .map(m => ({ id: m.moduleId, name: m.moduleName, views: m.viewCount }))
          
          const topFeatures = Object.values(state.featureEngagement)
            .sort((a, b) => b.interactionCount - a.interactionCount)
            .slice(0, 5)
            .map(f => ({ id: f.featureId, name: f.featureName, interactions: f.interactionCount }))
          
          return {
            topModules,
            topFeatures,
            aiUsage: state.aiGenerations,
            averageSessionTime: state.averageSessionDurationMs,
            totalDemoTime: state.totalDemoTimeMs,
          }
        },
        
        exportAnalytics: () => {
          const state = get()
          return JSON.stringify({
            exportedAt: new Date().toISOString(),
            sessions: state.sessions,
            stepEngagement: state.stepEngagement,
            featureEngagement: state.featureEngagement,
            moduleEngagement: state.moduleEngagement,
            aiGenerations: state.aiGenerations,
            summary: {
              totalSessions: state.totalSessions,
              totalDemoTimeMs: state.totalDemoTimeMs,
              averageSessionDurationMs: state.averageSessionDurationMs,
              completionRate: state.completionRate,
              mostViewedModule: state.mostViewedModule,
              mostEngagedFeature: state.mostEngagedFeature,
            },
          }, null, 2)
        },
        
        // Reset
        resetAnalytics: () => {
          set({
            ...initialAnalytics,
            currentSession: null,
          }, false, 'resetAnalytics')
        },
        
        // Highlight moments
        addHighlightMoment: (type, description, step) => {
          const state = get()
          if (!state.currentSession) return
          
          const moment: HighlightMoment = {
            id: `highlight-${Date.now()}`,
            timestamp: Date.now(),
            step,
            type,
            description,
          }
          
          set({
            currentSession: {
              ...state.currentSession,
              highlightMoments: [...state.currentSession.highlightMoments, moment],
            },
          }, false, 'addHighlightMoment')
        },
        
        removeHighlightMoment: (id) => {
          const state = get()
          if (!state.currentSession) return
          
          set({
            currentSession: {
              ...state.currentSession,
              highlightMoments: state.currentSession.highlightMoments.filter(m => m.id !== id),
            },
          }, false, 'removeHighlightMoment')
        },
        
        // Session notes
        updateSessionNotes: (notes) => {
          const state = get()
          if (!state.currentSession) return
          
          set({
            currentSession: {
              ...state.currentSession,
              notes,
            },
          }, false, 'updateSessionNotes')
        },
        
        // Demo path management
        selectPath: (pathId) => {
          set({ selectedPathId: pathId }, false, 'selectPath')
        },
        
        getPathConfig: (pathId) => {
          return get().demoPaths.find(p => p.id === pathId)
        },
        
        getPathSteps: () => {
          const state = get()
          if (state.selectedPathId) {
            const path = state.demoPaths.find(p => p.id === state.selectedPathId)
            if (path) return path.steps
          }
          // Return all steps if no path selected
          return ['welcome', 'portfolio-overview', 'clinical-data', 'document-authoring', 
                  'ai-generation', 'haq-response', 'safety-signal', 'submission-building', 
                  'publishing', 'complete']
        },
        
        // Auto-advance mode
        enableAutoAdvance: (intervalMs = 8000) => {
          set({ isAutoAdvance: true, autoAdvanceIntervalMs: intervalMs }, false, 'enableAutoAdvance')
        },
        
        disableAutoAdvance: () => {
          set({ isAutoAdvance: false }, false, 'disableAutoAdvance')
        },
        
        setAutoAdvanceInterval: (intervalMs) => {
          set({ autoAdvanceIntervalMs: intervalMs }, false, 'setAutoAdvanceInterval')
        },
        
        // Export session as markdown report
        exportSessionMarkdown: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId)
          if (!session) return ''
          
          const formatDuration = (ms: number) => {
            const seconds = Math.floor(ms / 1000)
            const minutes = Math.floor(seconds / 60)
            const remainingSeconds = seconds % 60
            return `${minutes}m ${remainingSeconds}s`
          }
          
          const formatDate = (ts: number) => new Date(ts).toLocaleString()
          
          const pathConfig = session.pathId ? get().demoPaths.find(p => p.id === session.pathId) : null
          
          let report = `# Demo Session Report\n\n`
          report += `## Session Overview\n\n`
          report += `| Field | Value |\n`
          report += `|-------|-------|\n`
          report += `| Session ID | ${session.id} |\n`
          report += `| Date | ${formatDate(session.startedAt)} |\n`
          report += `| Duration | ${formatDuration(session.totalDurationMs)} |\n`
          report += `| Audience | ${session.audienceType}${session.audienceName ? ` (${session.audienceName})` : ''} |\n`
          report += `| Demo Path | ${pathConfig?.name || 'Full Demo'} |\n`
          report += `| Mode | ${session.mode} |\n`
          report += `| Completion | ${session.completedSteps.length} steps |\n\n`
          
          report += `## Steps Completed\n\n`
          session.completedSteps.forEach((step, idx) => {
            report += `${idx + 1}. ${step}\n`
          })
          
          if (session.highlightMoments.length > 0) {
            report += `\n## Highlight Moments\n\n`
            session.highlightMoments.forEach(m => {
              const emoji = m.type === 'positive' ? '✅' : 
                           m.type === 'interest' ? '⭐' : 
                           m.type === 'question' ? '❓' : '⚠️'
              report += `- ${emoji} **${m.step}**: ${m.description}\n`
            })
          }
          
          if (session.notes) {
            report += `\n## Notes\n\n${session.notes}\n`
          }
          
          if (pathConfig) {
            report += `\n## Talking Points Used\n\n`
            pathConfig.talkingPoints.forEach(point => {
              report += `- ${point}\n`
            })
          }
          
          return report
        },
      }),
      {
        name: 'ligature-demo-analytics',
        partialize: (state) => ({
          sessions: state.sessions,
          stepEngagement: state.stepEngagement,
          featureEngagement: state.featureEngagement,
          moduleEngagement: state.moduleEngagement,
          aiGenerations: state.aiGenerations,
          totalSessions: state.totalSessions,
          totalDemoTimeMs: state.totalDemoTimeMs,
          averageSessionDurationMs: state.averageSessionDurationMs,
          completionRate: state.completionRate,
          mostViewedModule: state.mostViewedModule,
          mostEngagedFeature: state.mostEngagedFeature,
          selectedPathId: state.selectedPathId,
          autoAdvanceIntervalMs: state.autoAdvanceIntervalMs,
        }),
      }
    ),
    { name: 'LigatureDemoAnalytics' }
  )
)

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

export const useDemoSessionActive = () => useDemoAnalyticsStore((s) => s.currentSession !== null)
// v204d-b14: Use useShallow for object selectors to prevent infinite loops
export const useCurrentDemoSession = () => useDemoAnalyticsStore(useShallow((s) => s.currentSession))
// Fixed v167, optimized v168: Extract primitives, compute with useMemo
export const useDemoEngagementSummary = () => {
  const moduleEngagement = useDemoAnalyticsStore((s) => s.moduleEngagement)
  const featureEngagement = useDemoAnalyticsStore((s) => s.featureEngagement)
  const aiGenerations = useDemoAnalyticsStore((s) => s.aiGenerations)
  const averageSessionDurationMs = useDemoAnalyticsStore((s) => s.averageSessionDurationMs)
  const totalDemoTimeMs = useDemoAnalyticsStore((s) => s.totalDemoTimeMs)
  
  return useMemo(() => {
    const topModules = Object.values(moduleEngagement)
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 5)
      .map(m => ({ id: m.moduleId, name: m.moduleName, views: m.viewCount }))
    
    const topFeatures = Object.values(featureEngagement)
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, 5)
      .map(f => ({ id: f.featureId, name: f.featureName, interactions: f.interactionCount }))
    
    return {
      topModules,
      topFeatures,
      aiUsage: aiGenerations,
      averageSessionTime: averageSessionDurationMs,
      totalDemoTime: totalDemoTimeMs,
    }
  }, [moduleEngagement, featureEngagement, aiGenerations, averageSessionDurationMs, totalDemoTimeMs])
}
export const useAIGenerationStats = () => useDemoAnalyticsStore((s) => s.aiGenerations)
// v204d-b14: Use useShallow for object/array selectors
export const useDemoPaths = () => useDemoAnalyticsStore(useShallow((s) => s.demoPaths))
export const useSelectedPathId = () => useDemoAnalyticsStore((s) => s.selectedPathId)
export const useIsAutoAdvance = () => useDemoAnalyticsStore((s) => s.isAutoAdvance)
export const useAutoAdvanceInterval = () => useDemoAnalyticsStore((s) => s.autoAdvanceIntervalMs)
export const useDemoSessions = () => useDemoAnalyticsStore(useShallow((s) => s.sessions))
