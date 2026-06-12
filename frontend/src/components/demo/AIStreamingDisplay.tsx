
// ============================================================================
// AI Streaming Display - v76: Visual component for AI text generation
// Shows typewriter-style streaming with quality indicators
// ============================================================================


import { useState, useEffect, useRef } from 'react'
import { 
  Sparkles, 
  Check, 
  AlertCircle,
  Copy,
  RefreshCw,
  Pause,
  Play,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  Zap
} from 'lucide-react'
import { useDemoStore, useActiveGeneration } from '@/store/useDemoStore'

interface AIStreamingDisplayProps {
  id: string
  title?: string
  type?: 'haq-response' | 'safety-narrative' | 'document-section' | 'signal-summary'
  onComplete?: (content: string) => void
  onCancel?: () => void
  showMetrics?: boolean
  className?: string
}

export function AIStreamingDisplay({
  id,
  title = 'AI Generation',
  type = 'haq-response',
  onComplete,
  onCancel,
  showMetrics = true,
  className = '',
}: AIStreamingDisplayProps) {
  const generation = useActiveGeneration(id)
  // v204d-b7: Use individual selector to prevent infinite loops
  const clearGeneration = useDemoStore(s => s.clearGeneration)
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom during generation
  useEffect(() => {
    if (generation?.status === 'generating' && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [generation?.streamPosition])

  // Handle completion callback
  useEffect(() => {
    if (generation?.status === 'complete' && onComplete) {
      onComplete(generation.content)
    }
  }, [generation?.status])

  const handleCopy = async () => {
    if (generation?.content) {
      await navigator.clipboard.writeText(generation.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    clearGeneration(id)
    onCancel?.()
  }

  if (!generation) return null

  const displayedContent = generation.content.slice(0, generation.streamPosition)
  const isGenerating = generation.status === 'generating'
  const isComplete = generation.status === 'complete'
  const elapsedTime = generation.startedAt 
    ? ((generation.completedAt || Date.now()) - generation.startedAt) / 1000
    : 0
  const wordCount = displayedContent.split(/\s+/).filter(Boolean).length

  const typeLabels = {
    'haq-response': 'HAQ Response Draft',
    'safety-narrative': 'Safety Case Narrative',
    'document-section': 'Document Section',
    'signal-summary': 'Signal Summary',
  }

  return (
    <div className={`bg-surface-elevated border border-border rounded-xl overflow-hidden ${expanded ? 'fixed inset-4 z-50' : ''} ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-surface">
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${isGenerating ? 'bg-blue-500/20' : isComplete ? 'bg-emerald-500/20' : 'bg-surface'}`}>
            {isGenerating ? (
              <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
            ) : isComplete ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <FileText className="w-4 h-4 text-secondary" />
            )}
          </div>
          <div>
            <h3 className="font-medium text-sm text-primary">{title}</h3>
            <p className="text-xs text-secondary">{typeLabels[type]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isGenerating && (
            <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Generating...
            </span>
          )}
          {isComplete && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
              <Check className="w-3 h-3" />
              Complete
            </span>
          )}
          
          <button
            onClick={handleCopy}
            className="p-1.5 rounded hover:bg-surface transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Copy className="w-4 h-4 text-secondary" />
            )}
          </button>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded hover:bg-surface transition-colors"
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? (
              <Minimize2 className="w-4 h-4 text-secondary" />
            ) : (
              <Maximize2 className="w-4 h-4 text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div 
        ref={contentRef}
        className={`p-4 overflow-y-auto ${expanded ? 'h-[calc(100%-8rem)]' : 'max-h-96'}`}
      >
        <div className="prose prose-sm prose-invert max-w-none">
          <div className="whitespace-pre-wrap text-sm text-primary/90 leading-relaxed">
            {displayedContent}
            {isGenerating && (
              <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      {/* Footer with Metrics */}
      {showMetrics && (
        <div className="px-4 py-3 border-t border-border bg-surface flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-secondary">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              {wordCount} words
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {elapsedTime.toFixed(1)}s
            </span>
            {isComplete && (
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Zap className="w-3.5 h-3.5" />
                Demo Mode
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isComplete && (
              <button
                onClick={handleClose}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
              >
                Use This Draft
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Inline streaming indicator for compact displays
export function AIStreamingIndicator({ 
  isActive, 
  label = 'Generating' 
}: { 
  isActive: boolean
  label?: string 
}) {
  if (!isActive) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-blue-400">
      <Sparkles className="w-3 h-3 animate-pulse" />
      <span>{label}</span>
      <span className="flex gap-0.5">
        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </span>
  )
}

// Quality score display after generation
export function AIQualityBadge({ 
  score, 
  showLabel = true 
}: { 
  score: number
  showLabel?: boolean 
}) {
  const getColor = () => {
    if (score >= 90) return 'text-emerald-400 bg-emerald-500/10'
    if (score >= 75) return 'text-blue-400 bg-blue-500/10'
    if (score >= 60) return 'text-amber-400 bg-amber-500/10'
    return 'text-red-400 bg-red-500/10'
  }

  const getLabel = () => {
    if (score >= 90) return 'Excellent'
    if (score >= 75) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Needs Review'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${getColor()}`}>
      <span className="font-bold">{score}</span>
      {showLabel && <span className="text-secondary/80">{getLabel()}</span>}
    </span>
  )
}
