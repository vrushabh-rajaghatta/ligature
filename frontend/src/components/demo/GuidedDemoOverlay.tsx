
// ============================================================================
// Guided Demo Overlay - v141: Enhanced with mobile responsiveness
// Interactive investor walkthrough component with auto-advance support
// ============================================================================


import { useEffect, useCallback, useState } from 'react'
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Play, 
  Pause,
  SkipForward,
  RotateCcw,
  Check,
  Circle,
  Timer,
  Zap,
  Settings2
} from 'lucide-react'
import { 
  useDemoStore, 
  useGuidedDemo, 
  useDemoProgress,
  useCurrentDemoStep,
  DEMO_STEPS,
  DEMO_STEP_ORDER,
  type DemoStep 
} from '@/store/useDemoStore'
import { useAppStore } from '@/store/useAppStore'
import { useDemoAnalyticsStore, useIsAutoAdvance } from '@/store/useDemoAnalyticsStore'
import { useAutoAdvance, useDemoTiming, STEP_TIMING_CONFIG, TIMING_PRESETS } from './DemoTimingEngine'
// v141: Responsive utilities
import { useIsMobile, useIsTablet, useResponsive } from '@/hooks/useResponsive'

export function GuidedDemoOverlay() {
  const guidedDemo = useGuidedDemo()
  const progress = useDemoProgress()
  const { step, config } = useCurrentDemoStep()
  // v204d-b7: Use individual selectors to prevent infinite loops from new object references
  const stopGuidedDemo = useDemoStore(s => s.stopGuidedDemo)
  const pauseGuidedDemo = useDemoStore(s => s.pauseGuidedDemo)
  const resumeGuidedDemo = useDemoStore(s => s.resumeGuidedDemo)
  const advanceToStep = useDemoStore(s => s.advanceToStep)
  const completeStep = useDemoStore(s => s.completeStep)
  const resetGuidedDemo = useDemoStore(s => s.resetGuidedDemo)
  const setActiveModule = useAppStore(s => s.setActiveModule)
  const isAutoAdvance = useIsAutoAdvance()
  // v204d-b7: Use individual selectors for analytics store too
  const enableAutoAdvance = useDemoAnalyticsStore(s => s.enableAutoAdvance)
  const disableAutoAdvance = useDemoAnalyticsStore(s => s.disableAutoAdvance)
  const setAutoAdvanceInterval = useDemoAnalyticsStore(s => s.setAutoAdvanceInterval)
  
  // v140: Timing hooks
  const autoAdvance = useAutoAdvance()
  const demoTiming = useDemoTiming()
  const [showTimingSettings, setShowTimingSettings] = useState(false)
  
  // v141: Responsive state
  const isMobile = useIsMobile()
  const { compactMode } = useResponsive()
  
  // Timing configuration
  const stepTiming = STEP_TIMING_CONFIG[step]

  // Navigate to the appropriate module when step changes
  useEffect(() => {
    if (guidedDemo.isActive && config.module) {
      setActiveModule(config.module)
    }
  }, [guidedDemo.isActive, config.module, setActiveModule])

  // Handle keyboard navigation
  useEffect(() => {
    if (!guidedDemo.isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopGuidedDemo()
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        handleNext()
      } else if (e.key === 'ArrowLeft') {
        handlePrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [guidedDemo.isActive, step])

  const handleNext = useCallback(() => {
    completeStep(step)
    const currentIndex = DEMO_STEP_ORDER.indexOf(step)
    if (currentIndex < DEMO_STEP_ORDER.length - 1) {
      advanceToStep(DEMO_STEP_ORDER[currentIndex + 1])
    }
  }, [step, completeStep, advanceToStep])

  const handlePrevious = useCallback(() => {
    const currentIndex = DEMO_STEP_ORDER.indexOf(step)
    if (currentIndex > 0) {
      advanceToStep(DEMO_STEP_ORDER[currentIndex - 1])
    }
  }, [step, advanceToStep])

  const handleStepClick = (targetStep: DemoStep) => {
    advanceToStep(targetStep)
  }

  if (!guidedDemo.isActive) return null

  const currentIndex = DEMO_STEP_ORDER.indexOf(step)
  const isFirstStep = currentIndex === 0
  const isLastStep = currentIndex === DEMO_STEP_ORDER.length - 1
  
  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Phase colors for timing indicator
  const phaseColors = {
    early: 'text-blue-400',
    normal: 'text-emerald-400',
    warning: 'text-amber-400',
    overtime: 'text-red-400',
  }

  return (
    <>
      {/* Semi-transparent overlay for focus */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />

      {/* Top progress bar with timing */}
      <div className="fixed top-0 left-0 right-0 z-50">
        {/* Main progress */}
        <div className="h-1 bg-surface">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${(currentIndex / (DEMO_STEP_ORDER.length - 1)) * 100}%` }}
          />
        </div>
        
        {/* Step timing sub-bar */}
        <div className="h-0.5 bg-surface-elevated">
          <div 
            className={`h-full transition-all duration-300 ${
              autoAdvance.phase === 'overtime' ? 'bg-red-500' :
              autoAdvance.phase === 'warning' ? 'bg-amber-500' :
              'bg-emerald-500/50'
            }`}
            style={{ width: `${Math.min(100, autoAdvance.progress)}%` }}
          />
        </div>
        
        {/* v141: Compact timing display in top bar - responsive */}
        <div className="absolute top-2 right-2 sm:right-4 flex items-center gap-2 sm:gap-3 text-xs">
          {/* Auto-advance countdown */}
          {isAutoAdvance && autoAdvance.countdown !== null && autoAdvance.countdown <= 15 && (
            <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded-full animate-pulse">
              <Zap className="w-3 h-3 text-purple-400" />
              <span className="text-purple-300 font-mono">{autoAdvance.countdown}s</span>
            </div>
          )}
          
          {/* Total elapsed - hide full version on mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 bg-surface-elevated border border-border rounded-full">
            <Timer className="w-3 h-3 text-secondary" />
            <span className="text-primary font-mono">{formatTime(demoTiming.totalElapsed)}</span>
            {!isMobile && (
              <>
                <span className="text-secondary">/</span>
                <span className="text-secondary font-mono">{formatTime(demoTiming.totalEstimated)}</span>
              </>
            )}
          </div>
          
          {/* Pace indicator - icon only on mobile */}
          <div className={`px-1.5 sm:px-2 py-1 rounded-full ${
            demoTiming.pace === 'fast' ? 'bg-blue-500/20 text-blue-400' :
            demoTiming.pace === 'slow' ? 'bg-amber-500/20 text-amber-400' :
            'bg-emerald-500/20 text-emerald-400'
          }`}>
            {isMobile ? (
              demoTiming.pace === 'fast' ? '⚡' : demoTiming.pace === 'slow' ? '🐢' : '✓'
            ) : (
              demoTiming.pace === 'fast' ? '⚡ Fast' : demoTiming.pace === 'slow' ? '🐢 Behind' : '✓ On pace'
            )}
          </div>
        </div>
      </div>

      {/* Bottom control panel - v141: responsive padding */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-border shadow-2xl">
        {/* Step indicators */}
        <div className="px-3 sm:px-6 py-2 sm:py-3 border-b border-border/50 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-1 min-w-max">
            {DEMO_STEP_ORDER.map((s, idx) => {
              const stepConfig = DEMO_STEPS[s]
              const isCompleted = guidedDemo.completedSteps.includes(s)
              const isCurrent = s === step
              const stepTiming = STEP_TIMING_CONFIG[s]
              
              return (
                <button
                  key={s}
                  onClick={() => handleStepClick(s)}
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                    transition-all duration-200 relative group
                    ${isCurrent 
                      ? 'bg-blue-500 text-white' 
                      : isCompleted 
                        ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-surface text-secondary hover:bg-surface-elevated'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3" />
                  ) : isCurrent ? (
                    <Circle className="w-3 h-3 fill-current" />
                  ) : (
                    <Circle className="w-3 h-3" />
                  )}
                  <span className="hidden sm:inline">{stepConfig.title}</span>
                  <span className="sm:hidden">{idx + 1}</span>
                  
                  {/* v140: Timing tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    ~{stepTiming.recommendedDuration}s recommended
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main content */}
        <div className="px-6 py-4 flex items-center justify-between gap-6">
          {/* Step info with timing */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-secondary font-medium">
                Step {currentIndex + 1} of {DEMO_STEP_ORDER.length}
              </span>
              <span className="text-xs text-secondary">•</span>
              <span className="text-xs text-blue-400 font-medium capitalize">
                {config.module.replace('-', ' ')}
              </span>
              <span className="text-xs text-secondary">•</span>
              {/* v140: Step timing indicator */}
              <span className={`text-xs font-medium ${phaseColors[autoAdvance.phase]}`}>
                {autoAdvance.phase === 'early' ? 'Getting started' :
                 autoAdvance.phase === 'normal' ? `${Math.ceil(stepTiming.recommendedDuration - (autoAdvance.progress / 100 * stepTiming.recommendedDuration))}s left` :
                 autoAdvance.phase === 'warning' ? 'Ready to advance' :
                 'Over time'}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-primary truncate">
              {config.title}
            </h3>
            <p className="text-sm text-secondary truncate">
              {autoAdvance.cueMessage || config.description}
            </p>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`
                p-2 rounded-lg border transition-colors
                ${isFirstStep 
                  ? 'border-border/50 text-secondary/50 cursor-not-allowed'
                  : 'border-border text-secondary hover:bg-surface hover:text-primary'
                }
              `}
              title="Previous step (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {guidedDemo.pausedAt ? (
              <button
                onClick={resumeGuidedDemo}
                className="p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                title="Resume demo"
              >
                <Play className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={pauseGuidedDemo}
                className="p-2 rounded-lg border border-border text-secondary hover:bg-surface hover:text-primary transition-colors"
                title="Pause demo"
              >
                <Pause className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={isLastStep}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isLastStep 
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
                }
              `}
              title={isLastStep ? 'Complete demo' : 'Next step (→ or Space)'}
            >
              <span>{isLastStep ? 'Complete' : 'Next'}</span>
              {isLastStep ? (
                <Check className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <div className="w-px h-8 bg-border mx-2" />

            {/* v140: Auto-advance toggle */}
            <button
              onClick={() => isAutoAdvance ? disableAutoAdvance() : enableAutoAdvance()}
              className={`
                p-2 rounded-lg border transition-colors
                ${isAutoAdvance 
                  ? 'border-purple-500/50 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30'
                  : 'border-border text-secondary hover:bg-surface hover:text-primary'
                }
              `}
              title={isAutoAdvance ? 'Disable auto-advance' : 'Enable auto-advance'}
            >
              <Zap className="w-5 h-5" />
            </button>
            
            {/* v140: Timing settings */}
            <button
              onClick={() => setShowTimingSettings(!showTimingSettings)}
              className={`
                p-2 rounded-lg border transition-colors
                ${showTimingSettings 
                  ? 'border-blue-500/50 bg-blue-500/20 text-blue-400'
                  : 'border-border text-secondary hover:bg-surface hover:text-primary'
                }
              `}
              title="Timing settings"
            >
              <Settings2 className="w-5 h-5" />
            </button>

            <button
              onClick={resetGuidedDemo}
              className="p-2 rounded-lg border border-border text-secondary hover:bg-surface hover:text-primary transition-colors"
              title="Restart demo"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={stopGuidedDemo}
              className="p-2 rounded-lg border border-border text-secondary hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
              title="Exit demo (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* v140: Timing settings panel */}
        {showTimingSettings && (
          <div className="px-6 py-4 border-t border-border/50 bg-surface">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-primary mb-1">Demo Timing Preset</h4>
                <p className="text-xs text-secondary">Choose a pace for your demo</p>
              </div>
              <div className="flex items-center gap-2">
                {TIMING_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => demoTiming.setPreset(preset.id)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                      ${demoTiming.preset?.id === preset.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-surface-elevated text-secondary hover:text-primary'
                      }
                    `}
                  >
                    {preset.name} ({preset.totalMinutes}m)
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Welcome overlay for first step */}
      {step === 'welcome' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-surface-elevated rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 px-8 py-12 text-white text-center">
              <h1 className="text-4xl font-bold mb-3">Welcome to Ligature</h1>
              <p className="text-xl text-white/80">
                R&D Connected Platform
              </p>
            </div>
            <div className="px-8 py-6">
              <p className="text-secondary mb-6">
                This guided demo will walk you through the key capabilities of the Ligature platform,
                showcasing how we're transforming pharmaceutical R&D operations from document-centric 
                to data-centric workflows.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-surface rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">17+</div>
                  <div className="text-sm text-secondary">Integrated Modules</div>
                </div>
                <div className="p-4 bg-surface rounded-lg">
                  <div className="text-2xl font-bold text-purple-500">AI-Powered</div>
                  <div className="text-sm text-secondary">Claude Integration</div>
                </div>
              </div>
              <button
                onClick={handleNext}
                className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <span>Start the Tour</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion overlay for last step */}
      {step === 'complete' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-surface-elevated rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-600 px-8 py-12 text-white text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h1 className="text-3xl font-bold mb-3">Demo Complete</h1>
              <p className="text-lg text-white/80">
                Thank you for exploring Ligature
              </p>
            </div>
            <div className="px-8 py-6">
              <p className="text-secondary mb-6">
                You've seen how Ligature transforms life sciences R&D operations with an intelligent, 
                connected platform that brings together clinical data, regulatory submissions, 
                safety management, and AI-powered document authoring.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={resetGuidedDemo}
                  className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-surface transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Demo</span>
                </button>
                <button
                  onClick={stopGuidedDemo}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
                >
                  Explore Platform
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
