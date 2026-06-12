
// ============================================================================
// Path-Specific Tooltips - v85: Audience-aware contextual highlights
// ============================================================================
// Extends the tooltip system to show different content based on which
// demo path is selected (investor vs technical vs regulatory, etc.)
// ============================================================================


import { useState, useEffect, useRef } from 'react'
import { X, Lightbulb, ArrowRight, Target, Users, Code, FileCheck, TrendingUp } from 'lucide-react'
import { useGuidedDemo, type DemoStep } from '@/store/useDemoStore'
import { useSelectedPathId, type DemoAudienceType } from '@/store/useDemoAnalyticsStore'

// ============================================================================
// TYPES
// ============================================================================

export interface PathTooltip {
  id: string
  step: DemoStep
  audienceTypes: DemoAudienceType[] // Which audiences see this tooltip
  title: string
  content: string
  position: 'top' | 'bottom' | 'left' | 'right'
  targetSelector?: string
  highlight?: boolean
  delay?: number
  priority?: 'low' | 'medium' | 'high'
}

// ============================================================================
// PATH-SPECIFIC TOOLTIP CONFIGURATIONS
// ============================================================================

export const PATH_TOOLTIPS: PathTooltip[] = [
  // Portfolio Overview - Different messages for different audiences
  {
    id: 'portfolio-investor-tam',
    step: 'portfolio-overview',
    audienceTypes: ['investor'],
    title: '$25B+ Market Opportunity',
    content: 'Each product card represents a $2.6B+ development program. This single view replaces 5-7 separate point solutions.',
    position: 'right',
    targetSelector: '[data-product-id="LIG-2847"]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'portfolio-exec-visibility',
    step: 'portfolio-overview',
    audienceTypes: ['executive'],
    title: 'Real-Time Pipeline Visibility',
    content: 'No more chasing spreadsheets. Every status, timeline, and risk indicator updated automatically.',
    position: 'right',
    targetSelector: '[data-product-id="LIG-2847"]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'portfolio-regulatory-applications',
    step: 'portfolio-overview',
    audienceTypes: ['regulatory'],
    title: 'Application-Centric View',
    content: 'Click to see all applications (NDA, MAA, JNDA), sequences, and pending questions for this product.',
    position: 'right',
    targetSelector: '[data-product-id="LIG-2847"]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'portfolio-technical-architecture',
    step: 'portfolio-overview',
    audienceTypes: ['technical'],
    title: 'Zustand State Architecture',
    content: 'Each product is a normalized entity with relationships to trials, applications, documents, and signals.',
    position: 'right',
    targetSelector: '[data-product-id="LIG-2847"]',
    highlight: true,
    priority: 'medium',
    delay: 1000,
  },
  
  // Clinical Data - Path-specific
  {
    id: 'clinical-investor-dataflow',
    step: 'clinical-data',
    audienceTypes: ['investor', 'executive'],
    title: 'Continuous Data Flow',
    content: 'Traditional systems require "database lock" before regulatory can start. We eliminate that delay—data flows continuously to submission documents.',
    position: 'bottom',
    targetSelector: '[data-trial-id="LIG-301"]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'clinical-regulatory-cdisclink',
    step: 'clinical-data',
    audienceTypes: ['regulatory'],
    title: 'CDISC-Aware Data',
    content: 'SDTM datasets flow directly to Module 5, ADaM to efficacy summaries. Complete traceability from source to submission.',
    position: 'bottom',
    targetSelector: '[data-trial-id="LIG-301"]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'clinical-technical-integration',
    step: 'clinical-data',
    audienceTypes: ['technical'],
    title: 'EDC Integration',
    content: 'REST API adapters for Medidata Rave, Oracle InForm, and Veeva EDC. Real-time sync or scheduled batch—your choice.',
    position: 'bottom',
    targetSelector: '[data-trial-id="LIG-301"]',
    highlight: true,
    priority: 'medium',
    delay: 800,
  },
  
  // Document Authoring - Path-specific
  {
    id: 'authoring-investor-ai',
    step: 'document-authoring',
    audienceTypes: ['investor'],
    title: 'AI Amplification',
    content: 'Medical writers spend 60% of their time on first drafts. Our AI generates compliant first drafts in seconds—same expert review, 73% faster.',
    position: 'left',
    targetSelector: '[data-action="ai-generate"]',
    highlight: true,
    priority: 'high',
    delay: 1200,
  },
  {
    id: 'authoring-exec-productivity',
    step: 'document-authoring',
    audienceTypes: ['executive'],
    title: 'Expert Amplification',
    content: 'Your team reviews and refines, not writes from scratch. That\'s how you get 73% faster with the same quality.',
    position: 'left',
    targetSelector: '[data-action="ai-generate"]',
    highlight: true,
    priority: 'high',
    delay: 1200,
  },
  {
    id: 'authoring-regulatory-ich',
    step: 'document-authoring',
    audienceTypes: ['regulatory'],
    title: 'ICH-Aware Generation',
    content: 'AI understands CTD structure, formatting requirements, and cross-reference conventions. Not generic content—regulatory content.',
    position: 'left',
    targetSelector: '[data-action="ai-generate"]',
    highlight: true,
    priority: 'high',
    delay: 1200,
  },
  {
    id: 'authoring-technical-prompt',
    step: 'document-authoring',
    audienceTypes: ['technical'],
    title: 'Context-Injected Prompts',
    content: 'Prompt includes CTD section schema, source document references, and regulatory guidelines. Response validates against document model.',
    position: 'left',
    targetSelector: '[data-action="ai-generate"]',
    highlight: true,
    priority: 'high',
    delay: 1200,
  },
  
  // HAQ Response - Path-specific
  {
    id: 'haq-investor-roi',
    step: 'haq-response',
    audienceTypes: ['investor'],
    title: 'Approval Acceleration',
    content: 'Faster HAQ responses = faster approvals = earlier revenue. Each day saved is worth millions for a blockbuster drug.',
    position: 'right',
    targetSelector: '[data-haq-question]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'haq-exec-timeline',
    step: 'haq-response',
    audienceTypes: ['executive'],
    title: 'Timeline Impact',
    content: 'HAQ response typically takes 2-3 weeks of expert time. With AI assist, that\'s 2-3 days. Same quality, faster delivery.',
    position: 'right',
    targetSelector: '[data-haq-question]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'haq-regulatory-quality',
    step: 'haq-response',
    audienceTypes: ['regulatory'],
    title: 'Quality Scoring',
    content: 'AI drafts are scored against approved response patterns. 94% quality match means less revision, more confidence.',
    position: 'right',
    targetSelector: '[data-haq-question]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'haq-technical-citations',
    step: 'haq-response',
    audienceTypes: ['technical'],
    title: 'Citation Extraction',
    content: 'AI identifies relevant submission sections and generates proper Module/Section citations automatically.',
    position: 'right',
    targetSelector: '[data-haq-question]',
    highlight: true,
    priority: 'medium',
    delay: 1000,
  },
  
  // Safety Signal - Path-specific
  {
    id: 'safety-investor-detection',
    step: 'safety-signal',
    audienceTypes: ['investor'],
    title: 'Earlier Signal Detection',
    content: 'AI pattern recognition detects signals 3 weeks earlier than traditional methods. Earlier detection = earlier mitigation = protected investment.',
    position: 'bottom',
    targetSelector: '[data-signal-panel]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'safety-exec-risk',
    step: 'safety-signal',
    audienceTypes: ['executive'],
    title: 'Proactive Risk Management',
    content: 'See emerging patterns before they become problems. Your safety committee has AI-generated summaries ready for review.',
    position: 'bottom',
    targetSelector: '[data-signal-panel]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'safety-regulatory-bridge',
    step: 'safety-signal',
    audienceTypes: ['regulatory'],
    title: 'Safety-Regulatory Bridge',
    content: 'Signals automatically flag relevant Module 2.7.4 sections. Safety narratives connect to your submission documents.',
    position: 'bottom',
    targetSelector: '[data-signal-panel]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'safety-technical-e2b',
    step: 'safety-signal',
    audienceTypes: ['technical'],
    title: 'ICSR/E2B Compliance',
    content: 'Case data follows E2B(R3) structure. MedDRA coding integrated. Narrative generator produces submission-ready output.',
    position: 'bottom',
    targetSelector: '[data-signal-panel]',
    highlight: true,
    priority: 'medium',
    delay: 800,
  },
  
  // Submission Building - Path-specific
  {
    id: 'submission-investor-efficiency',
    step: 'submission-building',
    audienceTypes: ['investor'],
    title: 'Assembly Automation',
    content: 'Traditional submission assembly: 2-3 weeks. With pre-validated content and automatic structure generation: hours. That\'s 85% faster.',
    position: 'left',
    targetSelector: '[data-ectd-builder]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'submission-exec-validation',
    step: 'submission-building',
    audienceTypes: ['executive'],
    title: 'Pre-Submission Validation',
    content: '200+ regulatory rules checked before you submit. No rejection surprises, no costly resubmissions.',
    position: 'left',
    targetSelector: '[data-ectd-builder]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'submission-regulatory-ectd',
    step: 'submission-building',
    audienceTypes: ['regulatory'],
    title: 'Native eCTD 4.0',
    content: 'Full ICH backbone structure with sequence management, lifecycle tracking, and regional variations (FDA, EMA, PMDA, TGA).',
    position: 'left',
    targetSelector: '[data-ectd-builder]',
    highlight: true,
    priority: 'high',
    delay: 1000,
  },
  {
    id: 'submission-technical-rules',
    step: 'submission-building',
    audienceTypes: ['technical'],
    title: 'Declarative Validation',
    content: 'Rules loaded from configuration—FDA TCG, EMA Business Rules, regional requirements. Config updates, no code deployment.',
    position: 'left',
    targetSelector: '[data-ectd-builder]',
    highlight: true,
    priority: 'medium',
    delay: 1000,
  },
  
  // Publishing - Path-specific
  {
    id: 'publishing-investor-endtoend',
    step: 'publishing',
    audienceTypes: ['investor', 'executive'],
    title: 'End-to-End Platform',
    content: 'From document authoring to gateway submission—one platform, one audit trail, one source of truth.',
    position: 'top',
    targetSelector: '[data-gateway-panel]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'publishing-regulatory-gateway',
    step: 'publishing',
    audienceTypes: ['regulatory'],
    title: 'Multi-Gateway Support',
    content: 'FDA ESG, EMA CESP, PMDA Gateway, Health Canada, TGA—same workflow, different destinations. Full acknowledgment tracking.',
    position: 'top',
    targetSelector: '[data-gateway-panel]',
    highlight: true,
    priority: 'high',
    delay: 800,
  },
  {
    id: 'publishing-technical-audit',
    step: 'publishing',
    audienceTypes: ['technical'],
    title: 'Immutable Audit Trail',
    content: 'Every action logged with user, timestamp, and before/after state. 21 CFR Part 11 compliant, inspection-ready.',
    position: 'top',
    targetSelector: '[data-gateway-panel]',
    highlight: true,
    priority: 'medium',
    delay: 800,
  },
]

// ============================================================================
// AUDIENCE ICON MAPPING
// ============================================================================

const AUDIENCE_ICONS: Record<DemoAudienceType, typeof Users> = {
  investor: TrendingUp,
  executive: Users,
  technical: Code,
  regulatory: FileCheck,
  general: Target,
}

const AUDIENCE_COLORS: Record<DemoAudienceType, string> = {
  investor: 'from-amber-400 to-orange-500',
  executive: 'from-purple-400 to-pink-500',
  technical: 'from-blue-400 to-cyan-500',
  regulatory: 'from-emerald-400 to-teal-500',
  general: 'from-gray-400 to-gray-500',
}

// ============================================================================
// PATH-SPECIFIC TOOLTIP OVERLAY
// ============================================================================

interface PathTooltipOverlayProps {
  tooltip: PathTooltip
  audienceType: DemoAudienceType
  onDismiss: () => void
}

function PathTooltipOverlay({ tooltip, audienceType, onDismiss }: PathTooltipOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  
  const Icon = AUDIENCE_ICONS[audienceType]
  const gradientClass = AUDIENCE_COLORS[audienceType]
  
  useEffect(() => {
    const showTimer = setTimeout(() => {
      setIsVisible(true)
      
      if (tooltip.targetSelector) {
        const target = document.querySelector(tooltip.targetSelector)
        if (target) {
          const rect = target.getBoundingClientRect()
          const tooltipWidth = 320
          const tooltipHeight = 160
          const offset = 16
          
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
          
          top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20))
          left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20))
          
          setPosition({ top, left })
          
          if (tooltip.highlight) {
            target.classList.add('demo-highlight-pulse')
          }
        }
      } else {
        setPosition({
          top: window.innerHeight / 2 - 80,
          left: window.innerWidth / 2 - 160,
        })
      }
    }, tooltip.delay || 0)
    
    return () => {
      clearTimeout(showTimer)
      if (tooltip.targetSelector && tooltip.highlight) {
        const target = document.querySelector(tooltip.targetSelector)
        if (target) {
          target.classList.remove('demo-highlight-pulse')
        }
      }
    }
  }, [tooltip])
  
  if (!isVisible) return null
  
  return (
    <div
      ref={tooltipRef}
      className={`
        fixed z-[55] w-80 bg-surface-elevated rounded-xl shadow-2xl border border-border
        transition-all duration-300 transform
        ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
      `}
      style={{ top: position.top, left: position.left }}
    >
      {/* Gradient accent bar */}
      <div className={`h-1 rounded-t-xl bg-gradient-to-r ${gradientClass}`} />
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradientClass} flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
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
      <div className="px-4 py-2 bg-surface/50 rounded-b-xl flex items-center justify-between">
        <span className="text-xs text-secondary capitalize">{audienceType} focus</span>
        <button
          onClick={onDismiss}
          className={`flex items-center gap-1 text-xs font-medium bg-gradient-to-r ${gradientClass} bg-clip-text text-transparent hover:opacity-80 transition-opacity`}
        >
          <span>Got it</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// PATH-SPECIFIC TOOLTIP MANAGER
// ============================================================================

export function PathTooltipManager() {
  const guidedDemo = useGuidedDemo()
  const selectedPathId = useSelectedPathId()
  const [dismissedTooltips, setDismissedTooltips] = useState<Set<string>>(new Set())
  const [activeTooltip, setActiveTooltip] = useState<PathTooltip | null>(null)
  
  // Map path to audience type
  const audienceType = getAudienceTypeFromPath(selectedPathId)
  
  // Find applicable tooltip for current step and audience
  useEffect(() => {
    if (!guidedDemo.isActive) {
      setActiveTooltip(null)
      return
    }
    
    const tooltip = PATH_TOOLTIPS.find(
      t => 
        t.step === guidedDemo.currentStep && 
        t.audienceTypes.includes(audienceType) &&
        !dismissedTooltips.has(t.id)
    )
    
    setActiveTooltip(tooltip || null)
  }, [guidedDemo.isActive, guidedDemo.currentStep, audienceType, dismissedTooltips])
  
  const handleDismiss = () => {
    if (activeTooltip) {
      setDismissedTooltips(prev => new Set([...Array.from(prev), activeTooltip.id]))
    }
  }
  
  // Reset on demo restart
  useEffect(() => {
    if (guidedDemo.currentStep === 'welcome' && guidedDemo.completedSteps.length === 0) {
      setDismissedTooltips(new Set())
    }
  }, [guidedDemo.currentStep, guidedDemo.completedSteps])
  
  if (!activeTooltip) return null
  
  return (
    <PathTooltipOverlay 
      tooltip={activeTooltip} 
      audienceType={audienceType}
      onDismiss={handleDismiss} 
    />
  )
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAudienceTypeFromPath(pathId: string | null): DemoAudienceType {
  switch (pathId) {
    case 'investor-pitch':
      return 'investor'
    case 'executive-overview':
    case 'highlights-reel':
      return 'executive'
    case 'technical-deep-dive':
      return 'technical'
    case 'regulatory-focus':
      return 'regulatory'
    default:
      return 'general'
  }
}

export function getTooltipsForStep(step: DemoStep, audienceType: DemoAudienceType): PathTooltip[] {
  return PATH_TOOLTIPS.filter(
    t => t.step === step && t.audienceTypes.includes(audienceType)
  )
}

export function getTooltipCountByPath(pathId: string): number {
  const audienceType = getAudienceTypeFromPath(pathId)
  return PATH_TOOLTIPS.filter(t => t.audienceTypes.includes(audienceType)).length
}
