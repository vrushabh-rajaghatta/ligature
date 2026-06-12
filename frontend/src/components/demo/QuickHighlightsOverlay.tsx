
// ============================================================================
// Quick Highlights Mode - v77: Condensed demo for time-constrained presentations
// Shows the most impressive features in 3-5 minutes
// ============================================================================


import { useState, useEffect, useCallback } from 'react'
import { 
  Zap, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Play, 
  Pause,
  FastForward,
  Clock,
  Sparkles,
  FileText,
  Shield,
  Send,
  Brain
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useDemoStore } from '@/store/useDemoStore'
import { useDemoAnalyticsStore } from '@/store/useDemoAnalyticsStore'

// ============================================================================
// HIGHLIGHT CONFIGURATION
// ============================================================================

export interface Highlight {
  id: string
  title: string
  subtitle: string
  module: string
  duration: number // seconds
  icon: React.ComponentType<{ className?: string }>
  keyPoints: string[]
  demoAction?: string
  aiFeature?: boolean
}

export const HIGHLIGHTS: Highlight[] = [
  {
    id: 'portfolio',
    title: 'Unified Command Center',
    subtitle: 'Your entire pipeline at a glance',
    module: 'portfolio',
    duration: 30,
    icon: Sparkles,
    keyPoints: [
      '17+ integrated modules in one platform',
      'Real-time status across all programs',
      'Connected data from research to commercialization',
    ],
  },
  {
    id: 'ai-authoring',
    title: 'AI-Powered Document Generation',
    subtitle: 'Claude-assisted regulatory writing',
    module: 'authoring',
    duration: 45,
    icon: Brain,
    keyPoints: [
      'Generate CSR sections in minutes, not days',
      'Automatic regulatory compliance checking',
      '73% faster document creation',
    ],
    aiFeature: true,
    demoAction: 'trigger-ai-generation',
  },
  {
    id: 'haq-intelligence',
    title: 'HAQ Response Automation',
    subtitle: 'Transform regulatory interactions',
    module: 'haq',
    duration: 45,
    icon: FileText,
    keyPoints: [
      'AI-drafted responses to Health Authority Questions',
      'Automatic source document retrieval',
      '89% first-pass approval rate',
    ],
    aiFeature: true,
    demoAction: 'trigger-haq-response',
  },
  {
    id: 'safety-surveillance',
    title: 'Pharmacovigilance Intelligence',
    subtitle: 'Signal detection meets AI',
    module: 'safety',
    duration: 40,
    icon: Shield,
    keyPoints: [
      'AI-generated case narratives (E2B compliant)',
      'Automated signal detection and evaluation',
      'Integrated safety-regulatory workflows',
    ],
    aiFeature: true,
  },
  {
    id: 'submission-ready',
    title: 'eCTD Publishing',
    subtitle: 'From draft to gateway in one click',
    module: 'publishing-center',
    duration: 30,
    icon: Send,
    keyPoints: [
      'Automated eCTD structure and validation',
      'Multi-region submission support (FDA, EMA, PMDA)',
      'Real-time compliance checking',
    ],
  },
]

const TOTAL_DURATION = HIGHLIGHTS.reduce((acc, h) => acc + h.duration, 0)

// ============================================================================
// QUICK HIGHLIGHTS OVERLAY
// ============================================================================

export function QuickHighlightsOverlay() {
  const [isActive, setIsActive] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [showIntro, setShowIntro] = useState(true)
  
  const setActiveModule = useAppStore(s => s.setActiveModule)
  // v204d-b7: Use individual selectors to prevent infinite loops
  const enableDemoMode = useDemoStore(s => s.enableDemoMode)
  const startSession = useDemoAnalyticsStore(s => s.startSession)
  const endSession = useDemoAnalyticsStore(s => s.endSession)
  const recordFeatureView = useDemoAnalyticsStore(s => s.recordFeatureView)
  const recordFeatureInteraction = useDemoAnalyticsStore(s => s.recordFeatureInteraction)
  
  const currentHighlight = HIGHLIGHTS[currentIndex]
  
  // Timer for auto-advance
  useEffect(() => {
    if (!isActive || isPaused || showIntro) return
    
    setTimeRemaining(currentHighlight.duration)
    
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Auto-advance to next highlight
          if (currentIndex < HIGHLIGHTS.length - 1) {
            setCurrentIndex(currentIndex + 1)
            return HIGHLIGHTS[currentIndex + 1].duration
          } else {
            // Demo complete
            setIsActive(false)
            endSession()
            return 0
          }
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isActive, isPaused, currentIndex, showIntro, currentHighlight?.duration, endSession])
  
  // Navigate to module when highlight changes
  useEffect(() => {
    if (isActive && currentHighlight && !showIntro) {
      setActiveModule(currentHighlight.module)
      recordFeatureView(currentHighlight.id, currentHighlight.title)
    }
  }, [isActive, currentIndex, showIntro, currentHighlight, setActiveModule, recordFeatureView])
  
  const startQuickDemo = useCallback(() => {
    enableDemoMode()
    startSession('guided', 'investor')
    setIsActive(true)
    setCurrentIndex(0)
    setShowIntro(true)
    setIsPaused(false)
  }, [enableDemoMode, startSession])
  
  const handleNext = useCallback(() => {
    if (currentIndex < HIGHLIGHTS.length - 1) {
      recordFeatureInteraction(currentHighlight.id)
      setCurrentIndex(currentIndex + 1)
      setTimeRemaining(HIGHLIGHTS[currentIndex + 1].duration)
    } else {
      setIsActive(false)
      endSession()
    }
  }, [currentIndex, currentHighlight, recordFeatureInteraction, endSession])
  
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setTimeRemaining(HIGHLIGHTS[currentIndex - 1].duration)
    }
  }, [currentIndex])
  
  const handleClose = useCallback(() => {
    setIsActive(false)
    endSession()
  }, [endSession])
  
  const handleStartFromIntro = () => {
    setShowIntro(false)
    setTimeRemaining(HIGHLIGHTS[0].duration)
  }
  
  // Calculate progress
  const elapsedDuration = HIGHLIGHTS.slice(0, currentIndex).reduce((acc, h) => acc + h.duration, 0)
  const progressPercent = ((elapsedDuration + (currentHighlight?.duration || 0) - timeRemaining) / TOTAL_DURATION) * 100
  
  if (!isActive) {
    return (
      <button
        onClick={startQuickDemo}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25"
      >
        <Zap className="w-4 h-4" />
        <span>Quick Highlights</span>
        <span className="text-xs opacity-75">({Math.round(TOTAL_DURATION / 60)}min)</span>
      </button>
    )
  }
  
  return (
    <>
      {/* Progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-surface">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 transition-all duration-1000"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      
      {/* Intro modal */}
      {showIntro && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
          <div className="bg-surface-elevated rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 px-8 py-10 text-white text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)]" />
              <Zap className="w-12 h-12 mx-auto mb-4 relative z-10" />
              <h1 className="text-3xl font-bold mb-2 relative z-10">Quick Highlights</h1>
              <p className="text-white/80 relative z-10">
                See Ligature's key capabilities in {Math.round(TOTAL_DURATION / 60)} minutes
              </p>
            </div>
            <div className="px-8 py-6">
              <div className="space-y-3 mb-6">
                {HIGHLIGHTS.map((h, idx) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-primary flex-1">{h.title}</span>
                    {h.aiFeature && (
                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">AI</span>
                    )}
                    <span className="text-secondary text-xs">{h.duration}s</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-3 border border-border rounded-lg font-medium hover:bg-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartFromIntro}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Tour</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom control panel */}
      {!showIntro && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface-elevated border-t border-border shadow-2xl">
          {/* Highlight indicators */}
          <div className="px-6 py-3 border-b border-border/50">
            <div className="flex items-center justify-center gap-2">
              {HIGHLIGHTS.map((h, idx) => {
                const Icon = h.icon
                const isCurrent = idx === currentIndex
                const isPast = idx < currentIndex
                
                return (
                  <button
                    key={h.id}
                    onClick={() => {
                      setCurrentIndex(idx)
                      setTimeRemaining(h.duration)
                    }}
                    className={`
                      flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                      transition-all duration-200
                      ${isCurrent 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : isPast 
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-surface text-secondary hover:bg-surface-elevated'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{h.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* Main content */}
          <div className="px-6 py-4 flex items-center justify-between gap-6">
            {/* Highlight info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-secondary font-medium">
                  {currentIndex + 1} of {HIGHLIGHTS.length}
                </span>
                {currentHighlight.aiFeature && (
                  <>
                    <span className="text-xs text-secondary">•</span>
                    <span className="text-xs text-purple-400 font-medium flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI Feature
                    </span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-semibold text-primary truncate">
                {currentHighlight.title}
              </h3>
              <p className="text-sm text-secondary truncate">
                {currentHighlight.subtitle}
              </p>
            </div>
            
            {/* Key points */}
            <div className="hidden lg:block flex-1 max-w-md">
              <div className="space-y-1">
                {currentHighlight.keyPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-secondary">
                    <ChevronRight className="w-3 h-3 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Timer and controls */}
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-secondary" />
                <span className="font-mono text-primary">{timeRemaining}s</span>
              </div>
              
              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className={`
                    p-2 rounded-lg border transition-colors
                    ${currentIndex === 0
                      ? 'border-border/50 text-secondary/50 cursor-not-allowed'
                      : 'border-border text-secondary hover:bg-surface hover:text-primary'
                    }
                  `}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-2 rounded-lg border border-border text-secondary hover:bg-surface hover:text-primary transition-colors"
                >
                  {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
                >
                  <span>{currentIndex === HIGHLIGHTS.length - 1 ? 'Finish' : 'Next'}</span>
                  {currentIndex === HIGHLIGHTS.length - 1 ? (
                    <Sparkles className="w-4 h-4" />
                  ) : (
                    <FastForward className="w-4 h-4" />
                  )}
                </button>
                
                <button
                  onClick={handleClose}
                  className="p-2 rounded-lg border border-border text-secondary hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ============================================================================
// QUICK HIGHLIGHTS LAUNCHER BUTTON
// ============================================================================

export function QuickHighlightsButton() {
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25"
      >
        <Zap className="w-4 h-4" />
        <span>Quick Demo</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-surface-elevated rounded-xl shadow-2xl border border-border overflow-hidden z-50">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-primary">Demo Options</h3>
            <p className="text-xs text-secondary mt-1">Choose your demo experience</p>
          </div>
          <div className="p-2">
            <QuickHighlightsOverlay />
          </div>
        </div>
      )}
    </div>
  )
}
