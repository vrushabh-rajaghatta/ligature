
// ============================================================================
// Demo Timing Engine - v140: Auto-advance with configurable timing per step
// Provides intelligent demo progression with presenter cues and interaction detection
// ============================================================================


import { useEffect, useRef, useCallback, useState } from 'react'
import { 
  useDemoStore, 
  useGuidedDemo, 
  useCurrentDemoStep,
  DEMO_STEPS,
  DEMO_STEP_ORDER,
  type DemoStep 
} from '@/store/useDemoStore'
import { useDemoAnalyticsStore, useIsAutoAdvance, useAutoAdvanceInterval } from '@/store/useDemoAnalyticsStore'

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

export interface StepTimingConfig {
  /** Minimum time before auto-advance is allowed (seconds) */
  minDuration: number
  /** Recommended time for the step (seconds) */
  recommendedDuration: number
  /** Maximum time before warning appears (seconds) */
  maxDuration: number
  /** Whether this step can auto-advance */
  autoAdvanceEnabled: boolean
  /** Cue message shown when approaching max duration */
  transitionCue: string
  /** Warning shown when significantly over time */
  overtimeWarning: string
}

export const STEP_TIMING_CONFIG: Record<DemoStep, StepTimingConfig> = {
  'welcome': {
    minDuration: 5,
    recommendedDuration: 30,
    maxDuration: 45,
    autoAdvanceEnabled: false, // Welcome requires manual start
    transitionCue: 'Ready to begin the tour',
    overtimeWarning: 'Consider starting the demo',
  },
  'portfolio-overview': {
    minDuration: 15,
    recommendedDuration: 45,
    maxDuration: 75,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready for clinical data deep-dive',
    overtimeWarning: 'Consider moving to next section',
  },
  'clinical-data': {
    minDuration: 20,
    recommendedDuration: 60,
    maxDuration: 90,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready to show document authoring',
    overtimeWarning: 'Clinical section running long',
  },
  'document-authoring': {
    minDuration: 30,
    recommendedDuration: 90,
    maxDuration: 120,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready to trigger AI generation',
    overtimeWarning: 'Consider moving to AI demo',
  },
  'ai-generation': {
    minDuration: 20,
    recommendedDuration: 60,
    maxDuration: 90,
    autoAdvanceEnabled: true,
    transitionCue: 'AI generation complete - ready for HAQ',
    overtimeWarning: 'AI section complete',
  },
  'haq-response': {
    minDuration: 30,
    recommendedDuration: 90,
    maxDuration: 120,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready to show safety module',
    overtimeWarning: 'HAQ section running long',
  },
  'safety-signal': {
    minDuration: 20,
    recommendedDuration: 60,
    maxDuration: 90,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready for submission building',
    overtimeWarning: 'Consider moving to submissions',
  },
  'submission-building': {
    minDuration: 20,
    recommendedDuration: 60,
    maxDuration: 90,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready for publishing center',
    overtimeWarning: 'Submission section complete',
  },
  'publishing': {
    minDuration: 15,
    recommendedDuration: 45,
    maxDuration: 60,
    autoAdvanceEnabled: true,
    transitionCue: 'Ready to wrap up',
    overtimeWarning: 'Consider concluding',
  },
  'complete': {
    minDuration: 10,
    recommendedDuration: 30,
    maxDuration: 120,
    autoAdvanceEnabled: false, // Complete never auto-advances
    transitionCue: 'Demo complete - open for questions',
    overtimeWarning: '',
  },
}

// ============================================================================
// TIMING PRESETS (for different demo lengths)
// ============================================================================

export interface TimingPreset {
  id: string
  name: string
  description: string
  totalMinutes: number
  multiplier: number // Applied to recommendedDuration
}

export const TIMING_PRESETS: TimingPreset[] = [
  {
    id: 'quick',
    name: 'Quick Demo',
    description: '5-minute highlights',
    totalMinutes: 5,
    multiplier: 0.4,
  },
  {
    id: 'standard',
    name: 'Standard Demo',
    description: '10-minute overview',
    totalMinutes: 10,
    multiplier: 0.7,
  },
  {
    id: 'full',
    name: 'Full Demo',
    description: '18-minute comprehensive',
    totalMinutes: 18,
    multiplier: 1.0,
  },
  {
    id: 'deep',
    name: 'Deep Dive',
    description: '25-minute detailed',
    totalMinutes: 25,
    multiplier: 1.4,
  },
  {
    id: 'workshop',
    name: 'Workshop Mode',
    description: '45-minute hands-on',
    totalMinutes: 45,
    multiplier: 2.5,
  },
]

// ============================================================================
// HOOK: useAutoAdvance
// ============================================================================

export interface AutoAdvanceState {
  /** Whether auto-advance is currently active */
  isActive: boolean
  /** Current countdown in seconds (null if not active) */
  countdown: number | null
  /** Percentage progress through current step */
  progress: number
  /** Current timing phase: 'early', 'normal', 'warning', 'overtime' */
  phase: 'early' | 'normal' | 'warning' | 'overtime'
  /** Whether the step can advance now */
  canAdvance: boolean
  /** Current transition cue message */
  cueMessage: string | null
  /** Start auto-advance countdown */
  start: () => void
  /** Pause auto-advance (e.g., on user interaction) */
  pause: () => void
  /** Resume auto-advance */
  resume: () => void
  /** Reset countdown for current step */
  reset: () => void
  /** Skip to next step immediately */
  skip: () => void
}

export function useAutoAdvance(): AutoAdvanceState {
  // v204d-b7: Use individual selectors for primitive values to prevent infinite loops
  const guidedDemoIsActive = useDemoStore(s => s.guidedDemo.isActive)
  const guidedDemoPausedAt = useDemoStore(s => s.guidedDemo.pausedAt)
  const { step } = useCurrentDemoStep()
  // v204d-b7: Use individual selectors for actions too
  const advanceToStep = useDemoStore(s => s.advanceToStep)
  const completeStep = useDemoStore(s => s.completeStep)
  const pauseGuidedDemo = useDemoStore(s => s.pauseGuidedDemo)
  const resumeGuidedDemo = useDemoStore(s => s.resumeGuidedDemo)
  const isAutoAdvanceEnabled = useIsAutoAdvance()
  const autoAdvanceInterval = useAutoAdvanceInterval()
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastInteractionRef = useRef<number>(Date.now())
  
  const timing = STEP_TIMING_CONFIG[step]
  
  // Calculate derived values
  const progress = Math.min(100, (elapsedSeconds / timing.recommendedDuration) * 100)
  const canAdvance = elapsedSeconds >= timing.minDuration
  const isOvertime = elapsedSeconds > timing.maxDuration
  const isWarning = elapsedSeconds > timing.recommendedDuration && elapsedSeconds <= timing.maxDuration
  
  const phase: 'early' | 'normal' | 'warning' | 'overtime' = 
    elapsedSeconds < timing.minDuration ? 'early' :
    isOvertime ? 'overtime' :
    isWarning ? 'warning' : 'normal'
  
  // Calculate countdown (seconds until auto-advance)
  const countdown = isAutoAdvanceEnabled && timing.autoAdvanceEnabled && canAdvance
    ? Math.max(0, Math.ceil((autoAdvanceInterval / 1000) - (elapsedSeconds - timing.minDuration) % (autoAdvanceInterval / 1000)))
    : null
  
  // Determine cue message
  const cueMessage = 
    isOvertime ? timing.overtimeWarning :
    isWarning ? timing.transitionCue :
    canAdvance ? `${Math.ceil(timing.recommendedDuration - elapsedSeconds)}s remaining` :
    null
  
  // Reset timer when step changes
  useEffect(() => {
    setElapsedSeconds(0)
    setIsPaused(false)
    lastInteractionRef.current = Date.now()
  }, [step])
  
  // Main timer effect
  useEffect(() => {
    if (!guidedDemoIsActive || guidedDemoPausedAt || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1)
    }, 1000)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [guidedDemoIsActive, guidedDemoPausedAt, isPaused])
  
  // Auto-advance effect
  useEffect(() => {
    if (!isAutoAdvanceEnabled || !timing.autoAdvanceEnabled || !canAdvance || isPaused) {
      return
    }
    
    // Check if we've passed the recommended duration by autoAdvanceInterval
    const overdueBy = (elapsedSeconds - timing.recommendedDuration) * 1000
    if (overdueBy > 0 && overdueBy % autoAdvanceInterval < 1000) {
      // Time to advance (if we haven't recently interacted)
      const timeSinceInteraction = Date.now() - lastInteractionRef.current
      if (timeSinceInteraction > 5000) { // 5 seconds of no interaction
        handleAdvance()
      }
    }
  }, [elapsedSeconds, isAutoAdvanceEnabled, timing, canAdvance, isPaused, autoAdvanceInterval])
  
  const handleAdvance = useCallback(() => {
    completeStep(step)
    const currentIndex = DEMO_STEP_ORDER.indexOf(step)
    if (currentIndex < DEMO_STEP_ORDER.length - 1) {
      advanceToStep(DEMO_STEP_ORDER[currentIndex + 1])
    }
  }, [step, completeStep, advanceToStep])
  
  const start = useCallback(() => {
    setIsPaused(false)
    lastInteractionRef.current = Date.now()
  }, [])
  
  const pause = useCallback(() => {
    setIsPaused(true)
  }, [])
  
  const resume = useCallback(() => {
    setIsPaused(false)
    lastInteractionRef.current = Date.now()
  }, [])
  
  const reset = useCallback(() => {
    setElapsedSeconds(0)
    setIsPaused(false)
    lastInteractionRef.current = Date.now()
  }, [])
  
  const skip = useCallback(() => {
    handleAdvance()
  }, [handleAdvance])
  
  // Track user interactions to pause auto-advance
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionRef.current = Date.now()
    }
    
    window.addEventListener('click', handleInteraction)
    window.addEventListener('keydown', handleInteraction)
    window.addEventListener('scroll', handleInteraction, true)
    
    return () => {
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('keydown', handleInteraction)
      window.removeEventListener('scroll', handleInteraction, true)
    }
  }, [])
  
  return {
    isActive: guidedDemoIsActive && !guidedDemoPausedAt && !isPaused,
    countdown,
    progress,
    phase,
    canAdvance,
    cueMessage,
    start,
    pause,
    resume,
    reset,
    skip,
  }
}

// ============================================================================
// HOOK: useDemoTiming (for total demo timing)
// ============================================================================

export interface DemoTimingState {
  /** Total elapsed time in seconds */
  totalElapsed: number
  /** Estimated remaining time in seconds */
  estimatedRemaining: number
  /** Total estimated duration based on preset */
  totalEstimated: number
  /** Whether the demo is running ahead of schedule */
  isAhead: boolean
  /** Whether the demo is running behind schedule */
  isBehind: boolean
  /** Pace indicator: 'fast', 'normal', 'slow' */
  pace: 'fast' | 'normal' | 'slow'
  /** Current preset being used */
  preset: TimingPreset | null
  /** Set a timing preset */
  setPreset: (presetId: string) => void
  /** Get adjusted duration for a step based on preset */
  getStepDuration: (step: DemoStep) => number
}

export function useDemoTiming(): DemoTimingState {
  // v204d-b7: Use individual selectors for primitive values to prevent infinite loops
  const guidedDemoIsActive = useDemoStore(s => s.guidedDemo.isActive)
  const guidedDemoStartTime = useDemoStore(s => s.guidedDemo.startTime)
  const guidedDemoPausedAt = useDemoStore(s => s.guidedDemo.pausedAt)
  const guidedDemoCurrentStep = useDemoStore(s => s.guidedDemo.currentStep)
  const [preset, setPresetState] = useState<TimingPreset | null>(TIMING_PRESETS[2]) // Default to 'full'
  const [totalElapsed, setTotalElapsed] = useState(0)
  
  // Calculate elapsed since demo started
  useEffect(() => {
    if (!guidedDemoIsActive || !guidedDemoStartTime || guidedDemoPausedAt) {
      return
    }
    
    const interval = setInterval(() => {
      setTotalElapsed(Math.floor((Date.now() - guidedDemoStartTime!) / 1000))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [guidedDemoIsActive, guidedDemoStartTime, guidedDemoPausedAt])
  
  // Reset on demo start
  useEffect(() => {
    if (guidedDemoStartTime) {
      setTotalElapsed(0)
    }
  }, [guidedDemoStartTime])
  
  const totalEstimated = (preset?.totalMinutes || 18) * 60
  
  // Calculate remaining based on completed steps
  const currentIndex = DEMO_STEP_ORDER.indexOf(guidedDemoCurrentStep)
  const remainingSteps = DEMO_STEP_ORDER.slice(currentIndex)
  const multiplier = preset?.multiplier || 1
  const estimatedRemaining = remainingSteps.reduce((sum, step) => {
    return sum + Math.round(STEP_TIMING_CONFIG[step].recommendedDuration * multiplier)
  }, 0)
  
  // Determine pace
  const expectedElapsed = totalEstimated - estimatedRemaining
  const variance = totalElapsed - expectedElapsed
  const isAhead = variance < -30 // More than 30s ahead
  const isBehind = variance > 30 // More than 30s behind
  const pace: 'fast' | 'normal' | 'slow' = isAhead ? 'fast' : isBehind ? 'slow' : 'normal'
  
  const setPreset = useCallback((presetId: string) => {
    const found = TIMING_PRESETS.find(p => p.id === presetId)
    if (found) setPresetState(found)
  }, [])
  
  const getStepDuration = useCallback((step: DemoStep) => {
    const base = STEP_TIMING_CONFIG[step].recommendedDuration
    return Math.round(base * (preset?.multiplier || 1))
  }, [preset])
  
  return {
    totalElapsed,
    estimatedRemaining,
    totalEstimated,
    isAhead,
    isBehind,
    pace,
    preset,
    setPreset,
    getStepDuration,
  }
}

// ============================================================================
// COMPONENT: DemoTimingIndicator
// ============================================================================

interface DemoTimingIndicatorProps {
  variant?: 'minimal' | 'compact' | 'full'
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'inline'
  showPresetSelector?: boolean
}

export function DemoTimingIndicator({ 
  variant = 'compact',
  position = 'top-right',
  showPresetSelector = false,
}: DemoTimingIndicatorProps) {
  const autoAdvance = useAutoAdvance()
  const demoTiming = useDemoTiming()
  // v204d-b7: Use individual selector instead of useGuidedDemo() which returns an object
  const guidedDemoIsActive = useDemoStore(s => s.guidedDemo.isActive)
  const { step } = useCurrentDemoStep()
  
  if (!guidedDemoIsActive) return null
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const phaseColors = {
    early: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    normal: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    overtime: 'text-red-400 bg-red-500/10 border-red-500/30',
  }
  
  const paceColors = {
    fast: 'text-blue-400',
    normal: 'text-emerald-400',
    slow: 'text-amber-400',
  }
  
  const positionClasses = {
    'top-left': 'fixed top-20 left-4 z-50',
    'top-right': 'fixed top-20 right-4 z-50',
    'bottom-left': 'fixed bottom-24 left-4 z-50',
    'bottom-right': 'fixed bottom-24 right-4 z-50',
    'inline': '',
  }
  
  if (variant === 'minimal') {
    return (
      <div className={`${position !== 'inline' ? positionClasses[position] : ''} flex items-center gap-2`}>
        <div className={`px-2 py-1 rounded-full text-xs font-mono ${phaseColors[autoAdvance.phase]}`}>
          {formatTime(Math.floor(autoAdvance.progress * (STEP_TIMING_CONFIG[step].recommendedDuration / 100)))}
        </div>
        {autoAdvance.countdown !== null && autoAdvance.countdown <= 10 && (
          <div className="px-2 py-1 rounded-full text-xs font-mono bg-purple-500/20 text-purple-400 animate-pulse">
            ▶ {autoAdvance.countdown}s
          </div>
        )}
      </div>
    )
  }
  
  if (variant === 'compact') {
    return (
      <div className={`${positionClasses[position]} bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-3`}>
        {/* Step progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-400">Step Progress</span>
            <span className={`font-mono ${phaseColors[autoAdvance.phase]?.split(' ')[0]}`}>
              {Math.round(autoAdvance.progress)}%
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                autoAdvance.phase === 'overtime' ? 'bg-red-500' :
                autoAdvance.phase === 'warning' ? 'bg-amber-500' :
                autoAdvance.phase === 'normal' ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(100, autoAdvance.progress)}%` }}
            />
          </div>
        </div>
        
        {/* Timing info */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`${paceColors[demoTiming.pace]}`}>
              {demoTiming.pace === 'fast' ? '⚡' : demoTiming.pace === 'slow' ? '🐢' : '✓'}
            </span>
            <span className="text-slate-300 font-mono">
              {formatTime(demoTiming.totalElapsed)}
            </span>
          </div>
          <span className="text-slate-500">
            ~{formatTime(demoTiming.estimatedRemaining)} left
          </span>
        </div>
        
        {/* Cue message */}
        {autoAdvance.cueMessage && (
          <div className={`mt-2 text-xs px-2 py-1 rounded ${phaseColors[autoAdvance.phase]}`}>
            {autoAdvance.cueMessage}
          </div>
        )}
      </div>
    )
  }
  
  // Full variant with preset selector
  return (
    <div className={`${positionClasses[position]} bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-4 w-72`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-slate-200">Demo Timing</span>
        <span className={`text-xs font-mono ${paceColors[demoTiming.pace]}`}>
          {formatTime(demoTiming.totalElapsed)} / {formatTime(demoTiming.totalEstimated)}
        </span>
      </div>
      
      {/* Overall progress */}
      <div className="mb-4">
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${Math.min(100, (demoTiming.totalElapsed / demoTiming.totalEstimated) * 100)}%` }}
          />
        </div>
      </div>
      
      {/* Step progress */}
      <div className={`p-3 rounded-lg border ${phaseColors[autoAdvance.phase]} mb-3`}>
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-medium">Current Step</span>
          <span className="font-mono">{Math.round(autoAdvance.progress)}%</span>
        </div>
        <div className="h-1 bg-black/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-current transition-all duration-300"
            style={{ width: `${Math.min(100, autoAdvance.progress)}%` }}
          />
        </div>
        {autoAdvance.cueMessage && (
          <p className="mt-2 text-xs opacity-80">{autoAdvance.cueMessage}</p>
        )}
      </div>
      
      {/* Auto-advance indicator */}
      {autoAdvance.countdown !== null && (
        <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-3">
          <span className="text-xs text-purple-300">Auto-advance in</span>
          <span className="text-lg font-mono text-purple-400">{autoAdvance.countdown}s</span>
        </div>
      )}
      
      {/* Preset selector */}
      {showPresetSelector && (
        <div className="pt-3 border-t border-slate-700">
          <label className="block text-xs text-slate-400 mb-2">Timing Preset</label>
          <div className="flex flex-wrap gap-1">
            {TIMING_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => demoTiming.setPreset(p.id)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  demoTiming.preset?.id === p.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          {demoTiming.preset && (
            <p className="mt-2 text-xs text-slate-500">{demoTiming.preset.description}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPONENT: StepTimingCue (inline cue for presenter)
// ============================================================================

export function StepTimingCue() {
  const autoAdvance = useAutoAdvance()
  const { step } = useCurrentDemoStep()
  const timing = STEP_TIMING_CONFIG[step]
  
  if (!autoAdvance.isActive) return null
  
  // Only show when there's something to communicate
  if (autoAdvance.phase === 'early' || (autoAdvance.phase === 'normal' && !autoAdvance.cueMessage)) {
    return null
  }
  
  const phaseStyles = {
    normal: 'border-emerald-500/30 bg-emerald-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    overtime: 'border-red-500/30 bg-red-500/5 animate-pulse',
  }
  
  return (
    <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full border ${phaseStyles[autoAdvance.phase as 'normal' | 'warning' | 'overtime']}`}>
      <span className={`text-sm ${
        autoAdvance.phase === 'overtime' ? 'text-red-400' :
        autoAdvance.phase === 'warning' ? 'text-amber-400' : 'text-emerald-400'
      }`}>
        {autoAdvance.cueMessage}
      </span>
    </div>
  )
}

// ============================================================================
// All exports are inline (no additional exports needed)
// ============================================================================
