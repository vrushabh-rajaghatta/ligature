
// ============================================================================
// Aha Moment Overlay - v85: Dramatic callout moments during demos
// ============================================================================
// Visual overlay that highlights key "aha moments" - impressive stats,
// capabilities, or differentiators that should land with impact.
// ============================================================================


import { useState, useEffect, useCallback } from 'react'
import { 
  Sparkles, 
  Rocket, 
  BarChart3, 
  Shield, 
  Clock, 
  Brain,
  X,
  ChevronRight
} from 'lucide-react'
import { useGuidedDemo, type DemoStep } from '@/store/useDemoStore'
import { useSelectedPathId } from '@/store/useDemoAnalyticsStore'
import { getAhaMomentForStep, type AhaMoment } from '@/data/demo-narration-data'

// ============================================================================
// ICON MAPPING
// ============================================================================

const ICON_MAP = {
  sparkles: Sparkles,
  rocket: Rocket,
  chart: BarChart3,
  shield: Shield,
  clock: Clock,
  brain: Brain,
}

// ============================================================================
// AHA MOMENT OVERLAY
// ============================================================================

interface AhaMomentOverlayProps {
  onDismiss?: () => void
  autoAdvanceMs?: number
}

export function AhaMomentOverlay({ onDismiss, autoAdvanceMs = 5000 }: AhaMomentOverlayProps) {
  const guidedDemo = useGuidedDemo()
  const selectedPathId = useSelectedPathId()
  const [visibleMoment, setVisibleMoment] = useState<AhaMoment | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [dismissedSteps, setDismissedSteps] = useState<Set<DemoStep>>(new Set())
  
  const pathId = selectedPathId || 'investor-pitch'
  
  // Check for auto-triggered aha moments when step changes
  useEffect(() => {
    if (!guidedDemo.isActive) return
    
    const moment = getAhaMomentForStep(pathId, guidedDemo.currentStep)
    
    if (moment && moment.trigger === 'auto' && !dismissedSteps.has(guidedDemo.currentStep)) {
      // Delay slightly for visual effect
      const timer = setTimeout(() => {
        setVisibleMoment(moment)
        setIsAnimating(true)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
  }, [guidedDemo.currentStep, guidedDemo.isActive, pathId, dismissedSteps])
  
  // Auto-dismiss after delay
  useEffect(() => {
    if (!visibleMoment || !autoAdvanceMs) return
    
    const timer = setTimeout(() => {
      handleDismiss()
    }, autoAdvanceMs)
    
    return () => clearTimeout(timer)
  }, [visibleMoment, autoAdvanceMs])
  
  const handleDismiss = useCallback(() => {
    setIsAnimating(false)
    setTimeout(() => {
      setVisibleMoment(null)
      setDismissedSteps(prev => new Set(prev).add(guidedDemo.currentStep))
      onDismiss?.()
    }, 300)
  }, [guidedDemo.currentStep, onDismiss])
  
  // Reset dismissed steps when demo restarts
  useEffect(() => {
    if (guidedDemo.currentStep === 'welcome' && guidedDemo.completedSteps.length === 0) {
      setDismissedSteps(new Set())
    }
  }, [guidedDemo.currentStep, guidedDemo.completedSteps])
  
  // Keyboard dismiss
  useEffect(() => {
    if (!visibleMoment) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleDismiss()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [visibleMoment, handleDismiss])
  
  if (!visibleMoment) return null
  
  const Icon = ICON_MAP[visibleMoment.icon] || Sparkles
  
  return (
    <div 
      className={`
        fixed inset-0 z-[65] flex items-center justify-center
        transition-all duration-300
        ${isAnimating ? 'bg-black/60' : 'bg-transparent pointer-events-none'}
      `}
      onClick={handleDismiss}
    >
      <div 
        className={`
          relative max-w-lg w-full mx-4 transform transition-all duration-500
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-orange-500/30 rounded-2xl blur-2xl animate-pulse" />
        
        {/* Main card */}
        <div className="relative bg-surface-elevated rounded-2xl shadow-2xl overflow-hidden border border-purple-500/30">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />
          
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl blur-lg opacity-50 animate-pulse" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <Icon className="w-10 h-10 text-white" />
              </div>
            </div>
            
            {/* Title */}
            <h2 className="text-2xl font-bold text-primary mb-3">
              {visibleMoment.title}
            </h2>
            
            {/* Message */}
            <p className="text-secondary text-lg leading-relaxed mb-6 max-w-md mx-auto">
              {visibleMoment.message}
            </p>
            
            {/* Metric badge */}
            {visibleMoment.metric && (
              <div className="inline-block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-50" />
                  <div className="relative px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
                    <span className="text-2xl font-bold text-white">
                      {visibleMoment.metric}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Continue prompt */}
            <div className="mt-8 flex items-center justify-center gap-2 text-secondary text-sm">
              <span>Press any key or click to continue</span>
              <ChevronRight className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          
          {/* Progress bar */}
          {autoAdvanceMs && (
            <div className="h-1 bg-surface">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                style={{
                  animation: `shrink ${autoAdvanceMs}ms linear forwards`,
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

// ============================================================================
// MANUAL AHA TRIGGER BUTTON
// ============================================================================

export function AhaTriggerButton() {
  const guidedDemo = useGuidedDemo()
  const selectedPathId = useSelectedPathId()
  const [showMoment, setShowMoment] = useState(false)
  
  const pathId = selectedPathId || 'investor-pitch'
  const moment = getAhaMomentForStep(pathId, guidedDemo.currentStep)
  
  if (!guidedDemo.isActive || !moment || moment.trigger !== 'manual') return null
  
  return (
    <>
      <button
        onClick={() => setShowMoment(true)}
        className="fixed bottom-24 right-20 z-50 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all flex items-center gap-2"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Show Highlight</span>
      </button>
      
      {showMoment && (
        <AhaMomentOverlay onDismiss={() => setShowMoment(false)} />
      )}
    </>
  )
}

// ============================================================================
// COMPACT AHA INDICATOR
// ============================================================================

export function AhaIndicator() {
  const guidedDemo = useGuidedDemo()
  const selectedPathId = useSelectedPathId()
  
  const pathId = selectedPathId || 'investor-pitch'
  const moment = getAhaMomentForStep(pathId, guidedDemo.currentStep)
  
  if (!guidedDemo.isActive || !moment) return null
  
  const Icon = ICON_MAP[moment.icon] || Sparkles
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
      <Icon className="w-4 h-4 text-purple-400" />
      <span className="text-xs text-purple-300 font-medium">{moment.title}</span>
      {moment.metric && (
        <span className="text-xs text-purple-400 font-bold">{moment.metric}</span>
      )}
    </div>
  )
}
