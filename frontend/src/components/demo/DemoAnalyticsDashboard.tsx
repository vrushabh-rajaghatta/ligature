
// ============================================================================
// Demo Analytics Dashboard - v77: Visualize investor engagement
// Shows session data, feature engagement, and demo effectiveness
// ============================================================================


import { useState } from 'react'
import { 
  BarChart3, 
  Clock, 
  Users, 
  TrendingUp, 
  Eye,
  MousePointer,
  Brain,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Activity,
  Target,
  Sparkles
} from 'lucide-react'
import { 
  useDemoAnalyticsStore, 
  useDemoEngagementSummary,
  useAIGenerationStats 
} from '@/store/useDemoAnalyticsStore'
import { useShallow } from 'zustand/react/shallow'
import { DEMO_STEP_ORDER, DEMO_STEPS } from '@/store/useDemoStore'

// ============================================================================
// ANALYTICS DASHBOARD
// ============================================================================

export function DemoAnalyticsDashboard() {
  const [isExpanded, setIsExpanded] = useState(false)
  // v204d-b7: Use useShallow for complex state to prevent infinite loops from object reference changes
  const analytics = useDemoAnalyticsStore(useShallow(s => ({
    totalSessions: s.totalSessions,
    totalDemoTimeMs: s.totalDemoTimeMs,
    averageSessionDurationMs: s.averageSessionDurationMs,
    completionRate: s.completionRate,
    stepEngagement: s.stepEngagement,
    exportAnalytics: s.exportAnalytics,
    resetAnalytics: s.resetAnalytics,
  })))
  const summary = useDemoEngagementSummary()
  const aiStats = useAIGenerationStats()
  
  const totalAIUsage = Object.values(aiStats).reduce((a, b) => a + b, 0)
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }
  
  return (
    <div className="bg-surface-elevated rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <BarChart3 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-primary text-sm">Demo Analytics</h3>
            <p className="text-xs text-secondary">
              {analytics.totalSessions} sessions • {formatTime(analytics.totalDemoTimeMs)} total time
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-secondary" />
        ) : (
          <ChevronRight className="w-4 h-4 text-secondary" />
        )}
      </button>
      
      {isExpanded && (
        <div className="border-t border-border">
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-px bg-border">
            <StatCard
              icon={Users}
              label="Sessions"
              value={analytics.totalSessions.toString()}
              color="blue"
            />
            <StatCard
              icon={Clock}
              label="Avg. Duration"
              value={formatTime(analytics.averageSessionDurationMs)}
              color="purple"
            />
            <StatCard
              icon={Target}
              label="Completion"
              value={`${analytics.completionRate.toFixed(0)}%`}
              color="emerald"
            />
            <StatCard
              icon={Brain}
              label="AI Uses"
              value={totalAIUsage.toString()}
              color="amber"
            />
          </div>
          
          {/* Step Engagement */}
          <div className="p-4 border-t border-border">
            <h4 className="text-xs font-medium text-secondary uppercase tracking-wider mb-3">
              Step Engagement
            </h4>
            <div className="space-y-2">
              {DEMO_STEP_ORDER.slice(0, -1).map((step) => {
                const engagement = analytics.stepEngagement[step]
                const config = DEMO_STEPS[step]
                const maxViews = Math.max(...Object.values(analytics.stepEngagement).map(e => e.viewCount)) || 1
                const percentage = (engagement.viewCount / maxViews) * 100
                
                return (
                  <div key={step} className="flex items-center gap-3">
                    <span className="w-28 text-xs text-secondary truncate">{config.title}</span>
                    <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-secondary text-right">{engagement.viewCount}</span>
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Top Features */}
          {summary.topFeatures.length > 0 && (
            <div className="p-4 border-t border-border">
              <h4 className="text-xs font-medium text-secondary uppercase tracking-wider mb-3">
                Top Features
              </h4>
              <div className="space-y-2">
                {summary.topFeatures.slice(0, 5).map((feature, idx) => (
                  <div key={feature.id} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded bg-surface flex items-center justify-center text-xs text-secondary">
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-xs text-primary truncate">{feature.name}</span>
                    <span className="text-xs text-secondary">{feature.interactions} clicks</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* AI Usage Breakdown */}
          <div className="p-4 border-t border-border">
            <h4 className="text-xs font-medium text-secondary uppercase tracking-wider mb-3">
              AI Feature Usage
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <AIUsageItem label="HAQ Responses" value={aiStats.haqResponses} />
              <AIUsageItem label="Safety Narratives" value={aiStats.safetyNarratives} />
              <AIUsageItem label="Document Sections" value={aiStats.documentSections} />
              <AIUsageItem label="Signal Summaries" value={aiStats.signalSummaries} />
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4 border-t border-border flex items-center gap-2">
            <button
              onClick={() => {
                const data = analytics.exportAnalytics()
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `ligature-demo-analytics-${new Date().toISOString().slice(0, 10)}.json`
                a.click()
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-surface transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
            <button
              onClick={() => analytics.resetAnalytics()}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium border border-border rounded-lg hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  color: 'blue' | 'purple' | 'emerald' | 'amber'
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
  }
  
  return (
    <div className="p-3 bg-surface-elevated">
      <div className={`p-1.5 rounded w-fit ${colors[color]} mb-2`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="text-lg font-bold text-primary">{value}</div>
      <div className="text-xs text-secondary">{label}</div>
    </div>
  )
}

function AIUsageItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between p-2 bg-surface rounded-lg">
      <span className="text-xs text-secondary">{label}</span>
      <span className="text-xs font-medium text-primary">{value}</span>
    </div>
  )
}

// ============================================================================
// COMPACT ANALYTICS BADGE
// ============================================================================

export function DemoAnalyticsBadge() {
  // v204d-b7: Use individual selectors to prevent infinite loops
  const totalSessions = useDemoAnalyticsStore(s => s.totalSessions)
  const completionRate = useDemoAnalyticsStore(s => s.completionRate)
  const summary = useDemoEngagementSummary()
  
  if (totalSessions === 0) return null
  
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-purple-500/10 rounded-lg">
      <Activity className="w-3.5 h-3.5 text-purple-400" />
      <span className="text-xs text-purple-400 font-medium">
        {totalSessions} demos
      </span>
      <span className="text-xs text-purple-400/60">
        ({completionRate.toFixed(0)}% complete)
      </span>
    </div>
  )
}

// ============================================================================
// REAL-TIME SESSION INDICATOR
// ============================================================================

export function LiveSessionIndicator() {
  // v204d-b7: Use individual selector to prevent infinite loops
  const currentSession = useDemoAnalyticsStore(s => s.currentSession)
  
  if (!currentSession) return null
  
  const elapsed = Math.floor((Date.now() - currentSession.startedAt) / 1000)
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <span className="text-xs text-emerald-400 font-medium">
        Live Demo
      </span>
      <span className="text-xs text-emerald-400/70 font-mono">
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  )
}
