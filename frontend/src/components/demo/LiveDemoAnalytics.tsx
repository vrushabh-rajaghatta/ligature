// ============================================================================
// Live Demo Analytics - v136: Real-time engagement tracking during demos
// Shows engagement metrics, feature views, and session progress
// ============================================================================


import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  Clock, 
  Eye,
  MousePointer,
  Sparkles,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Activity,
  Target,
  Zap
} from 'lucide-react'
import { 
  useDemoAnalyticsStore,
  useCurrentDemoSession,
  type DemoSession
} from '@/store/useDemoAnalyticsStore'
import { useGuidedDemo, useDemoProgress, DEMO_STEP_ORDER } from '@/store/useDemoStore'

// ============================================================================
// LIVE METRICS DISPLAY
// ============================================================================

interface LiveMetric {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: 'up' | 'down' | 'neutral'
  color?: string
}

function MetricCard({ metric }: { metric: LiveMetric }) {
  const Icon = metric.icon
  const colorClass = metric.color || 'text-blue-500'
  
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <Icon className={`w-4 h-4 ${colorClass}`} />
        {metric.trend && (
          <TrendingUp className={`w-3 h-3 ${
            metric.trend === 'up' ? 'text-emerald-500' : 
            metric.trend === 'down' ? 'text-red-500 rotate-180' : 
            'text-slate-400'
          }`} />
        )}
      </div>
      <div className="text-xl font-bold text-slate-900">{metric.value}</div>
      <div className="text-xs text-slate-500">{metric.label}</div>
    </div>
  )
}

// ============================================================================
// LIVE DEMO ANALYTICS PANEL
// ============================================================================

interface LiveDemoAnalyticsProps {
  collapsed?: boolean
}

export function LiveDemoAnalytics({ collapsed: initialCollapsed = true }: LiveDemoAnalyticsProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const currentSession = useCurrentDemoSession()
  const guidedDemo = useGuidedDemo()
  const progress = useDemoProgress()
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Calculate elapsed time
  useEffect(() => {
    if (!currentSession) {
      setElapsedTime(0)
      return
    }
    
    const updateTime = () => {
      setElapsedTime(Date.now() - currentSession.startedAt)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [currentSession])
  
  if (!currentSession && !guidedDemo.isActive) {
    return null
  }
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
  
  const metrics: LiveMetric[] = [
    {
      label: 'Session Time',
      value: formatTime(elapsedTime),
      icon: Clock,
      color: 'text-blue-500',
    },
    {
      label: 'Steps Completed',
      value: `${progress.completed}/${progress.total}`,
      icon: Target,
      trend: progress.completed > 0 ? 'up' : 'neutral',
      color: 'text-emerald-500',
    },
    {
      label: 'Steps Viewed',
      value: currentSession?.completedSteps.length || 0,
      icon: Eye,
      color: 'text-purple-500',
    },
    {
      label: 'Highlights',
      value: currentSession?.highlightMoments.length || 0,
      icon: MousePointer,
      trend: (currentSession?.highlightMoments.length || 0) > 3 ? 'up' : 'neutral',
      color: 'text-amber-500',
    },
  ]
  
  // Calculate engagement score (simple heuristic)
  const engagementScore = Math.min(100, Math.round(
    ((currentSession?.completedSteps.length || 0) * 10) +
    ((currentSession?.highlightMoments.length || 0) * 15) +
    (progress.percentage * 0.5)
  ))
  
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed top-20 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-lg hover:bg-slate-50 transition-colors"
      >
        <Activity className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-slate-700">
          {engagementScore}% engaged
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
    )
  }
  
  return (
    <div className="fixed top-20 right-4 z-40 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-semibold text-slate-900">Live Analytics</span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
      
      {/* Engagement Score */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-600">Engagement Score</span>
          <span className={`text-lg font-bold ${
            engagementScore >= 75 ? 'text-emerald-500' :
            engagementScore >= 50 ? 'text-amber-500' :
            'text-slate-500'
          }`}>
            {engagementScore}%
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              engagementScore >= 75 ? 'bg-emerald-500' :
              engagementScore >= 50 ? 'bg-amber-500' :
              'bg-slate-400'
            }`}
            style={{ width: `${engagementScore}%` }}
          />
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="p-3 grid grid-cols-2 gap-2">
        {metrics.map((metric, idx) => (
          <MetricCard key={idx} metric={metric} />
        ))}
      </div>
      
      {/* Progress Bar */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Demo Progress</span>
          <span className="text-xs font-medium text-slate-700">{progress.percentage}%</span>
        </div>
        <div className="flex gap-1">
          {DEMO_STEP_ORDER.map((step, idx) => (
            <div
              key={step}
              className={`flex-1 h-1.5 rounded-full ${
                guidedDemo.completedSteps.includes(step)
                  ? 'bg-emerald-500'
                  : guidedDemo.currentStep === step
                    ? 'bg-blue-500'
                    : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
      
      {/* AI Generations */}
      {currentSession && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span className="text-slate-600">AI Generations:</span>
            <span className="font-medium text-slate-900">
              {(currentSession as any).aiGenerations || 0}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// COMPACT ENGAGEMENT INDICATOR
// ============================================================================

export function EngagementIndicator() {
  const currentSession = useCurrentDemoSession()
  const progress = useDemoProgress()
  
  if (!currentSession) return null
  
  const engagementScore = Math.min(100, Math.round(
    ((currentSession.completedSteps.length || 0) * 10) +
    ((currentSession.highlightMoments.length || 0) * 15) +
    (progress.percentage * 0.5)
  ))
  
  return (
    <div className={`
      flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
      ${engagementScore >= 75 ? 'bg-emerald-100 text-emerald-700' :
        engagementScore >= 50 ? 'bg-amber-100 text-amber-700' :
        'bg-slate-100 text-slate-600'}
    `}>
      <Zap className="w-3 h-3" />
      <span>{engagementScore}%</span>
    </div>
  )
}
