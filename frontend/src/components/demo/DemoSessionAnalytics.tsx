
// ============================================================================
// Demo Session Analytics Dashboard - v77: Track and review demo sessions
// ============================================================================


import { useState } from 'react'
import { 
  BarChart3, 
  Clock, 
  Users, 
  Zap, 
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle,
  XCircle,
  Star,
  MessageCircle,
  AlertTriangle
} from 'lucide-react'
import { 
  useDemoAnalyticsStore, 
  useDemoSessions,
  useCurrentDemoSession,
  useDemoEngagementSummary,
  type DemoSession,
  type HighlightMoment
} from '@/store/useDemoAnalyticsStore'

const MOMENT_ICONS: Record<HighlightMoment['type'], typeof Star> = {
  positive: CheckCircle,
  interest: Star,
  question: MessageCircle,
  concern: AlertTriangle,
}

const MOMENT_COLORS: Record<HighlightMoment['type'], string> = {
  positive: 'text-emerald-400',
  interest: 'text-amber-400',
  question: 'text-blue-400',
  concern: 'text-red-400',
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

interface SessionCardProps {
  session: DemoSession
  isExpanded: boolean
  onToggle: () => void
  onExport: () => void
}

function SessionCard({ session, isExpanded, onToggle, onExport }: SessionCardProps) {
  const completionRate = Math.round((session.completedSteps.length / 10) * 100)
  const hasHighlights = session.highlightMoments.length > 0
  const hasNotes = session.notes.length > 0

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-surface-elevated transition-colors"
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span className="font-medium text-primary">
              {session.audienceName || session.audienceType}
            </span>
            <span className="text-xs px-2 py-0.5 bg-surface-elevated rounded text-secondary">
              {session.mode}
            </span>
          </div>
          <div className="text-sm text-secondary mt-0.5">
            {formatDate(session.startedAt)}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-center">
            <div className="text-secondary text-xs">Duration</div>
            <div className="text-primary font-medium">
              {formatDuration(session.totalDurationMs)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-secondary text-xs">Completion</div>
            <div className={`font-medium ${completionRate === 100 ? 'text-emerald-400' : 'text-primary'}`}>
              {completionRate}%
            </div>
          </div>
          {hasHighlights && (
            <Star className="w-4 h-4 text-amber-400" />
          )}
          {hasNotes && (
            <FileText className="w-4 h-4 text-blue-400" />
          )}
        </div>

        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-secondary" />
        ) : (
          <ChevronDown className="w-5 h-5 text-secondary" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border">
          {/* Steps */}
          <div className="mt-4">
            <h4 className="text-sm font-medium text-secondary mb-2">Steps Completed</h4>
            <div className="flex flex-wrap gap-1.5">
              {session.completedSteps.map((step) => (
                <span 
                  key={step}
                  className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs"
                >
                  {step}
                </span>
              ))}
              {session.completedSteps.length === 0 && (
                <span className="text-sm text-secondary italic">No steps completed</span>
              )}
            </div>
          </div>

          {/* Highlight moments */}
          {session.highlightMoments.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-secondary mb-2">Highlight Moments</h4>
              <div className="space-y-2">
                {session.highlightMoments.map((moment) => {
                  const Icon = MOMENT_ICONS[moment.type]
                  const colorClass = MOMENT_COLORS[moment.type]
                  return (
                    <div 
                      key={moment.id}
                      className="flex items-start gap-2 p-2 bg-surface-elevated rounded-lg"
                    >
                      <Icon className={`w-4 h-4 mt-0.5 ${colorClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-secondary">{moment.step}</span>
                          <span className="text-xs text-secondary opacity-50">
                            {formatDate(moment.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-primary mt-0.5">{moment.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-secondary mb-2">Notes</h4>
              <p className="text-sm text-primary bg-surface-elevated p-3 rounded-lg whitespace-pre-wrap">
                {session.notes}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function DemoSessionAnalytics() {
  const sessions = useDemoSessions()
  const currentSession = useCurrentDemoSession()
  const summary = useDemoEngagementSummary()
  // v204d-b7: Use individual selectors to prevent infinite loops
  const exportSessionMarkdown = useDemoAnalyticsStore(s => s.exportSessionMarkdown)
  const exportAnalytics = useDemoAnalyticsStore(s => s.exportAnalytics)
  const resetAnalytics = useDemoAnalyticsStore(s => s.resetAnalytics)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  const handleExportSession = (sessionId: string) => {
    const markdown = exportSessionMarkdown(sessionId)
    const blob = new Blob([markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demo-session-${sessionId}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = () => {
    const json = exportAnalytics()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ligature-demo-analytics-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all demo session history? This cannot be undone.')) {
      resetAnalytics()
    }
  }

  const totalAIUsage = Object.values(summary.aiUsage).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Sessions</span>
          </div>
          <div className="text-2xl font-bold text-primary">{sessions.length}</div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Avg Duration</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatDuration(summary.averageSessionTime)}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Total Demo Time</span>
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatDuration(summary.totalDemoTime)}
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <Zap className="w-4 h-4" />
            <span className="text-sm">AI Generations</span>
          </div>
          <div className="text-2xl font-bold text-primary">{totalAIUsage}</div>
        </div>
      </div>

      {/* AI Usage Breakdown */}
      {totalAIUsage > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-secondary mb-3">AI Generation Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-lg font-semibold text-primary">{summary.aiUsage.haqResponses}</div>
              <div className="text-xs text-secondary">HAQ Responses</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">{summary.aiUsage.safetyNarratives}</div>
              <div className="text-xs text-secondary">Safety Narratives</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">{summary.aiUsage.documentSections}</div>
              <div className="text-xs text-secondary">Document Sections</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">{summary.aiUsage.signalSummaries}</div>
              <div className="text-xs text-secondary">Signal Summaries</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Session Indicator */}
      {currentSession && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-blue-400">Demo in Progress</span>
            <span className="text-sm text-blue-400/70">
              {currentSession.audienceName || currentSession.audienceType}
            </span>
          </div>
        </div>
      )}

      {/* Session History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-primary">Session History</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg text-secondary hover:text-primary hover:bg-surface transition-colors"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
            {sessions.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg text-secondary hover:text-red-400 hover:border-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-border">
            <Users className="w-12 h-12 mx-auto text-secondary opacity-50 mb-3" />
            <p className="text-secondary">No demo sessions recorded yet</p>
            <p className="text-sm text-secondary opacity-70 mt-1">
              Start a guided demo to begin tracking engagement
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...sessions].reverse().map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                isExpanded={expandedSessionId === session.id}
                onToggle={() => setExpandedSessionId(
                  expandedSessionId === session.id ? null : session.id
                )}
                onExport={() => handleExportSession(session.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
