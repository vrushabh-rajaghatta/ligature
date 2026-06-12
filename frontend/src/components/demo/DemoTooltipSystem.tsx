
// ============================================================================
// Demo Tooltip System - v77: Contextual highlights during demo
// Shows helpful tooltips pointing to key features during guided demos
// ============================================================================


import { useState, useEffect, useRef } from 'react'
import { X, Lightbulb, ArrowRight, Sparkles } from 'lucide-react'
import { useGuidedDemo, type DemoStep } from '@/store/useDemoStore'

// ============================================================================
// TYPES
// ============================================================================

export interface DemoTooltip {
  id: string
  step: DemoStep
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
  targetSelector?: string // CSS selector for element to point to
  highlight?: boolean // Whether to pulse/highlight the target
  delay?: number // Delay before showing (ms)
  autoDismiss?: number // Auto-dismiss after (ms)
}

// ============================================================================
// TOOLTIP CONFIGURATION
// ============================================================================

export const DEMO_TOOLTIPS: DemoTooltip[] = [
  {
    id: 'portfolio-product-card',
    step: 'portfolio-overview',
    title: 'Product Intelligence',
    content: 'Click on Nexavant (LIG-2847) to see integrated data across all modules - from clinical trials to regulatory submissions.',
    position: 'right',
    targetSelector: '[data-product-id="LIG-2847"]',
    highlight: true,
    delay: 1000,
  },
  {
    id: 'clinical-trial-status',
    step: 'clinical-data',
    title: 'Real-Time Trial Data',
    content: 'The STELLAR trial dashboard shows enrollment, site performance, and endpoint data - all connected to your submission documents.',
    position: 'bottom',
    targetSelector: '[data-trial-id="LIG-301"]',
    highlight: true,
    delay: 800,
  },
  {
    id: 'authoring-ai-button',
    step: 'document-authoring',
    title: 'AI Writing Assistant',
    content: 'Click "Generate with AI" to see Claude draft a complete CSR section with proper citations and regulatory formatting.',
    position: 'left',
    targetSelector: '[data-action="ai-generate"]',
    highlight: true,
    delay: 1200,
  },
  {
    id: 'ai-streaming',
    step: 'ai-generation',
    title: 'Intelligent Generation',
    content: 'Watch as AI drafts content in real-time, automatically pulling data from clinical databases and referencing source documents.',
    position: 'bottom',
    delay: 500,
  },
  {
    id: 'haq-response-panel',
    step: 'haq-response',
    title: 'Automated HAQ Responses',
    content: 'Select a question to see AI draft a comprehensive response with citations, quality scoring, and compliance checking.',
    position: 'right',
    targetSelector: '[data-haq-question]',
    highlight: true,
    delay: 1000,
  },
  {
    id: 'safety-signal-detection',
    step: 'safety-signal',
    title: 'Signal Intelligence',
    content: 'AI-powered signal detection analyzes case data patterns and generates evaluation summaries for safety committee review.',
    position: 'bottom',
    targetSelector: '[data-signal-panel]',
    highlight: true,
    delay: 800,
  },
  {
    id: 'ectd-builder',
    step: 'submission-building',
    title: 'One-Click Submission Building',
    content: 'Documents flow automatically into the eCTD structure with validation checks running in real-time.',
    position: 'left',
    targetSelector: '[data-ectd-builder]',
    highlight: true,
    delay: 1000,
  },
  {
    id: 'gateway-submission',
    step: 'publishing',
    title: 'Gateway Ready',
    content: 'Submit to FDA, EMA, or PMDA gateways directly from the platform with full audit trail and acknowledgment tracking.',
    position: 'top',
    targetSelector: '[data-gateway-panel]',
    highlight: true,
    delay: 800,
  },
]

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface DemoTooltipOverlayProps {
  tooltip: DemoTooltip
  onDismiss: () => void
}

function DemoTooltipOverlay({ tooltip, onDismiss }: DemoTooltipOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    // Delay before showing
    const showTimer = setTimeout(() => {
      setIsVisible(true)
      
      // Calculate position based on target element
      if (tooltip.targetSelector) {
        const target = document.querySelector(tooltip.targetSelector)
        if (target) {
          const rect = target.getBoundingClientRect()
          const tooltipWidth = 300
          const tooltipHeight = 150
          const offset = 12
          
          let top = 0
          let left = 0
          
          switch (tooltip.position) {
            case 'top':
              top = rect.top - tooltipHeight - offset
              left = rect.left + rect.width / 2 - tooltipWidth / 2
              break
            case 'bottom':
              top = rect.bottom + offset
              left = rect.left + rect.width / 2 - tooltipWidth / 2
              break
            case 'left':
              top = rect.top + rect.height / 2 - tooltipHeight / 2
              left = rect.left - tooltipWidth - offset
              break
            case 'right':
              top = rect.top + rect.height / 2 - tooltipHeight / 2
              left = rect.right + offset
              break
          }
          
          // Keep tooltip on screen
          top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20))
          left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20))
          
          setPosition({ top, left })
          
          // Add highlight to target
          if (tooltip.highlight) {
            target.classList.add('demo-highlight-pulse')
          }
        }
      } else {
        // Default center position
        setPosition({
          top: window.innerHeight / 2 - 75,
          left: window.innerWidth / 2 - 150,
        })
      }
    }, tooltip.delay || 0)
    
    // Auto-dismiss
    let dismissTimer: NodeJS.Timeout
    if (tooltip.autoDismiss) {
      dismissTimer = setTimeout(onDismiss, tooltip.autoDismiss + (tooltip.delay || 0))
    }
    
    return () => {
      clearTimeout(showTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
      
      // Remove highlight
      if (tooltip.targetSelector && tooltip.highlight) {
        const target = document.querySelector(tooltip.targetSelector)
        if (target) {
          target.classList.remove('demo-highlight-pulse')
        }
      }
    }
  }, [tooltip, onDismiss])
  
  if (!isVisible) return null
  
  return (
    <div
      ref={tooltipRef}
      className={`
        fixed z-[55] w-[300px] bg-surface-elevated rounded-xl shadow-2xl border border-border
        transition-all duration-300 transform
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-primary text-sm">{tooltip.title}</span>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Content */}
      <div className="px-4 py-3">
        <p className="text-sm text-secondary leading-relaxed">{tooltip.content}</p>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 bg-surface/50 rounded-b-xl">
        <button
          onClick={onDismiss}
          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          <span>Got it</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      
      {/* Arrow pointer */}
      <div 
        className={`
          absolute w-3 h-3 bg-surface-elevated border-border transform rotate-45
          ${tooltip.position === 'top' ? 'bottom-[-6px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
          ${tooltip.position === 'bottom' ? 'top-[-6px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
          ${tooltip.position === 'left' ? 'right-[-6px] top-1/2 -translate-y-1/2 border-t border-r' : ''}
          ${tooltip.position === 'right' ? 'left-[-6px] top-1/2 -translate-y-1/2 border-b border-l' : ''}
        `}
      />
    </div>
  )
}

// ============================================================================
// TOOLTIP MANAGER
// ============================================================================

export function DemoTooltipManager() {
  const guidedDemo = useGuidedDemo()
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set())
  const [activeTooltip, setActiveTooltip] = useState<DemoTooltip | null>(null)
  
  // Find applicable tooltip for current step
  useEffect(() => {
    if (!guidedDemo.isActive) {
      setActiveTooltip(null)
      return
    }
    
    const tooltip = DEMO_TOOLTIPS.find(
      t => t.step === guidedDemo.currentStep && !dismissedTooltips.has(t.id)
    )
    
    setActiveTooltip(tooltip || null)
  }, [guidedDemo.isActive, guidedDemo.currentStep, dismissedTooltips])
  
  const handleDismiss = () => {
    if (activeTooltip) {
      setDismissedTooltips(prev => new Set(Array.from(prev).concat(activeTooltip.id)))
    }
  }
  
  // Reset dismissed tooltips when demo restarts
  useEffect(() => {
    if (guidedDemo.currentStep === 'welcome' && guidedDemo.completedSteps.length === 0) {
      setDismissedTooltips(new Set())
    }
  }, [guidedDemo.currentStep, guidedDemo.completedSteps])
  
  if (!activeTooltip) return null
  
  return <DemoTooltipOverlay tooltip={activeTooltip} onDismiss={handleDismiss} />
}

// ============================================================================
// CSS STYLES (to be added to globals.css)
// ============================================================================

export const DEMO_TOOLTIP_STYLES = `
/* Demo highlight pulse animation */
.demo-highlight-pulse {
  animation: demo-pulse 2s ease-in-out infinite;
  position: relative;
}

.demo-highlight-pulse::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: inherit;
  border: 2px solid rgb(168 85 247 / 0.5);
  animation: demo-pulse-border 2s ease-in-out infinite;
}

@keyframes demo-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgb(168 85 247 / 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgb(168 85 247 / 0);
  }
}

@keyframes demo-pulse-border {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.02);
  }
}
`

// ============================================================================
// FEATURE SPOTLIGHT
// ============================================================================

interface FeatureSpotlightProps {
  feature: {
    title: string
    description: string
    icon: React.ComponentType<{ className?: string }>
  }
  isActive: boolean
  onClose: () => void
}

export function FeatureSpotlight({ feature, isActive, onClose }: FeatureSpotlightProps) {
  if (!isActive) return null
  
  const Icon = feature.icon
  
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80">
      <div className="relative max-w-md w-full mx-4">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-orange-500/20 rounded-2xl blur-xl animate-pulse" />
        
        {/* Card */}
        <div className="relative bg-surface-elevated rounded-2xl shadow-2xl overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Icon className="w-8 h-8 text-white" />
            </div>
            
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-purple-400 font-medium uppercase tracking-wider">Feature Spotlight</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            
            <h2 className="text-2xl font-bold text-primary mb-3">{feature.title}</h2>
            <p className="text-secondary leading-relaxed">{feature.description}</p>
            
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-colors"
            >
              Continue Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
