
// ============================================================================
// Presenter Teleprompter - v140: Enhanced with timing engine integration
// Provides talking points, timing cues, and audience engagement tips
// ============================================================================


import { useState, useEffect, useCallback } from 'react'
import { 
  MessageSquare, 
  Clock, 
  ChevronUp, 
  ChevronDown,
  Eye,
  EyeOff,
  Move,
  Maximize2,
  Minimize2,
  Lightbulb,
  AlertCircle,
  Target,
  Sparkles,
  Zap,
  Timer
} from 'lucide-react'
import { 
  useDemoStore, 
  useGuidedDemo, 
  useCurrentDemoStep,
  DEMO_STEPS,
  DEMO_STEP_ORDER,
  type DemoStep 
} from '@/store/useDemoStore'
import { useIsAutoAdvance } from '@/store/useDemoAnalyticsStore'
import { useAutoAdvance, useDemoTiming, STEP_TIMING_CONFIG } from './DemoTimingEngine'

// ============================================================================
// PRESENTER NOTES CONFIGURATION
// ============================================================================

export interface PresenterNote {
  talkingPoints: string[]
  audienceTip?: string
  timing?: string
  keyMetric?: { value: string; label: string }
  transitionHint?: string
  warningNote?: string
}

export const PRESENTER_NOTES: Record<DemoStep, PresenterNote> = {
  'welcome': {
    talkingPoints: [
      'Introduce yourself and the mission: transforming pharma R&D',
      'Mention the personal connection - "medicines that save lives"',
      'Frame the problem: 20+ disconnected vendor systems',
    ],
    audienceTip: 'Gauge technical depth - adjust based on investor type (VC vs strategic)',
    timing: '30-45 seconds',
    keyMetric: { value: '$5M', label: 'Seed Round' },
    transitionHint: 'Click "Start Tour" or press → to begin',
  },
  'portfolio-overview': {
    talkingPoints: [
      'Highlight the unified view - "everything in one place"',
      'Point out LIG-2847 (Nexavant) - our featured oncology asset',
      'Mention real-time status across 17+ integrated modules',
    ],
    audienceTip: 'This is the "wow" moment - let them absorb the scope',
    timing: '45-60 seconds',
    keyMetric: { value: '17+', label: 'Integrated Modules' },
    transitionHint: 'Move to Clinical Development to show data depth',
  },
  'clinical-data': {
    talkingPoints: [
      'Show the STELLAR trial (Phase 3) - 847 patients',
      'Highlight AI-powered study intelligence',
      'Emphasize data connectivity: "every data point linked"',
    ],
    audienceTip: 'For pharma-savvy investors, drill into the trial design',
    timing: '60 seconds',
    keyMetric: { value: '847', label: 'Enrolled Patients' },
    warningNote: 'Skip deep clinical details for generalist VCs',
  },
  'document-authoring': {
    talkingPoints: [
      'Show structured authoring with ICH E3 compliance',
      'Highlight component reuse across documents',
      'Preview AI generation capability',
    ],
    audienceTip: 'Emphasize time savings - "days to minutes"',
    timing: '60-90 seconds',
    keyMetric: { value: '73%', label: 'Faster Creation' },
    transitionHint: 'Trigger the AI generation for maximum impact',
  },
  'ai-generation': {
    talkingPoints: [
      'This is the flagship AI demo - let it run',
      'Point out Claude integration and streaming',
      'Highlight quality scoring and compliance checking',
    ],
    audienceTip: 'Pause and let them watch the generation - silence is powerful',
    timing: '60 seconds',
    keyMetric: { value: 'Claude', label: 'AI Backbone' },
    warningNote: 'In demo mode, this uses pre-generated content',
  },
  'haq-response': {
    talkingPoints: [
      'Explain HAQs: Health Authority Questions (FDA Day 74)',
      'Show AI-drafted responses with source citations',
      'Mention 89% first-pass approval rate',
    ],
    audienceTip: 'This resonates strongly with strategic pharma investors',
    timing: '90 seconds',
    keyMetric: { value: '89%', label: 'Approval Rate' },
    transitionHint: 'Show the quality score and citation links',
  },
  'safety-signal': {
    talkingPoints: [
      'Demonstrate pharmacovigilance integration',
      'Show AI-generated case narratives (E2B compliant)',
      'Highlight automated signal detection',
    ],
    audienceTip: 'Safety is a regulatory requirement - emphasize compliance',
    timing: '60 seconds',
    keyMetric: { value: '1,247', label: 'Cases Processed' },
    warningNote: 'Don\'t dwell on adverse events with non-pharma investors',
  },
  'submission-building': {
    talkingPoints: [
      'Show eCTD workspace with drag-and-drop building',
      'Highlight multi-region support (FDA, EMA, PMDA)',
      'Demonstrate real-time validation',
    ],
    audienceTip: 'The eCTD is the final regulatory package - "this is the goal"',
    timing: '60 seconds',
    keyMetric: { value: '3', label: 'Regions Supported' },
    transitionHint: 'Move to publishing to show the end-to-end flow',
  },
  'publishing': {
    talkingPoints: [
      'Show gateway submission readiness',
      'Highlight lifecycle tracking post-submission',
      'Mention commitment tracking for conditions',
    ],
    audienceTip: 'This is the finish line - "from research to approval"',
    timing: '45 seconds',
    keyMetric: { value: '12', label: 'Submissions Built' },
    transitionHint: 'Wrap up with the complete picture',
  },
  'complete': {
    talkingPoints: [
      'Summarize the value proposition',
      'Mention the $5M seed round / 18-month runway',
      'Open for questions',
    ],
    audienceTip: 'Read the room - answer questions or offer deeper dives',
    timing: '30+ seconds',
    keyMetric: { value: '18mo', label: 'Runway Target' },
  },
}

// ============================================================================
// TELEPROMPTER POSITIONS
// ============================================================================

type TeleprompterPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

const POSITION_CLASSES: Record<TeleprompterPosition, string> = {
  'bottom-right': 'bottom-24 right-4',
  'bottom-left': 'bottom-24 left-4',
  'top-right': 'top-20 right-4',
  'top-left': 'top-20 left-4',
}

// ============================================================================
// PRESENTER TELEPROMPTER COMPONENT
// ============================================================================

export function PresenterTeleprompter() {
  const guidedDemo = useGuidedDemo()
  const { step, config } = useCurrentDemoStep()
  const [isVisible, setIsVisible] = useState(true)
  const [isExpanded, setIsExpanded] = useState(true)
  const [position, setPosition] = useState<TeleprompterPosition>('bottom-right')
  
  // v140: Use timing engine instead of manual timer
  const autoAdvance = useAutoAdvance()
  const demoTiming = useDemoTiming()
  const isAutoAdvanceEnabled = useIsAutoAdvance()
  
  const notes = PRESENTER_NOTES[step]
  const stepTiming = STEP_TIMING_CONFIG[step]
  
  // Calculate elapsed time from autoAdvance progress
  const elapsedTime = Math.floor((autoAdvance.progress / 100) * stepTiming.recommendedDuration)
  
  // Cycle position
  const cyclePosition = useCallback(() => {
    const positions: TeleprompterPosition[] = ['bottom-right', 'bottom-left', 'top-right', 'top-left']
    const currentIndex = positions.indexOf(position)
    setPosition(positions[(currentIndex + 1) % positions.length])
  }, [position])
  
  // Keyboard shortcut to toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 't' && e.ctrlKey) {
        e.preventDefault()
        setIsVisible(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  if (!guidedDemo.isActive || !isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-24 right-4 z-50 p-2 bg-surface-elevated border border-border rounded-lg shadow-lg hover:bg-surface transition-colors"
        title="Show teleprompter (Ctrl+T)"
      >
        <MessageSquare className="w-5 h-5 text-secondary" />
      </button>
    )
  }
  
  // v140: Use timing engine phases
  const isWarning = autoAdvance.phase === 'warning'
  const isOvertime = autoAdvance.phase === 'overtime'
  
  return (
    <div 
      className={`
        fixed z-50 w-80 bg-slate-900/95 backdrop-blur-sm border border-slate-700 
        rounded-xl shadow-2xl overflow-hidden transition-all duration-300
        ${POSITION_CLASSES[position]}
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-medium text-slate-300">Presenter Notes</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={cyclePosition}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Move teleprompter"
          >
            <Move className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
            title="Hide (Ctrl+T to show)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* v140: Enhanced timer bar with progress */}
      <div className="px-3 py-2 bg-slate-800/30 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${
              isOvertime ? 'text-red-400' : 
              isWarning ? 'text-amber-400' : 'text-slate-400'
            }`} />
            <span className={`text-sm font-mono ${
              isOvertime ? 'text-red-400' : 
              isWarning ? 'text-amber-400' : 'text-slate-300'
            }`}>
              {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-slate-500">/ {notes.timing}</span>
          </div>
          {notes.keyMetric && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/20 rounded text-xs">
              <span className="text-blue-400 font-bold">{notes.keyMetric.value}</span>
              <span className="text-blue-300/70">{notes.keyMetric.label}</span>
            </div>
          )}
        </div>
        
        {/* v140: Progress bar */}
        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              isOvertime ? 'bg-red-500' :
              isWarning ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, autoAdvance.progress)}%` }}
          />
        </div>
        
        {/* v140: Auto-advance indicator */}
        {isAutoAdvanceEnabled && autoAdvance.countdown !== null && autoAdvance.countdown <= 15 && (
          <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-purple-500/10 border border-purple-500/30 rounded">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-purple-300">Auto-advance in {autoAdvance.countdown}s</span>
          </div>
        )}
      </div>
      
      {/* Content */}
      {isExpanded && (
        <div className="p-3 space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
          {/* Talking Points */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-medium text-slate-400">Talking Points</span>
            </div>
            <ul className="space-y-1.5">
              {notes.talkingPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                  <span className="text-emerald-400 mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Audience Tip */}
          {notes.audienceTip && (
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-purple-200">{notes.audienceTip}</p>
              </div>
            </div>
          )}
          
          {/* Warning Note */}
          {notes.warningNote && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200">{notes.warningNote}</p>
              </div>
            </div>
          )}
          
          {/* Transition Hint */}
          {notes.transitionHint && (
            <div className="pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>{notes.transitionHint}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// MINIMAL TELEPROMPTER (Collapsed View)
// ============================================================================

export function MinimalTeleprompter() {
  const guidedDemo = useGuidedDemo()
  const { step } = useCurrentDemoStep()
  const [isVisible, setIsVisible] = useState(true)
  
  const notes = PRESENTER_NOTES[step]
  
  if (!guidedDemo.isActive || !isVisible) return null
  
  return (
    <div className="fixed bottom-24 right-4 z-50 max-w-xs">
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-400">Key Point</span>
          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-500 hover:text-slate-300"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-sm text-slate-200">{notes.talkingPoints[0]}</p>
        {notes.keyMetric && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-blue-400 font-bold">{notes.keyMetric.value}</span>
            <span className="text-slate-500">{notes.keyMetric.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
