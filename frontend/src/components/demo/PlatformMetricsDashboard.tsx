// ============================================================================
// Platform Metrics Dashboard - v76: Showcase platform capabilities
// ============================================================================


import { 
  FileText, 
  MessageSquare, 
  Shield, 
  AlertTriangle,
  Send,
  Sparkles,
  Clock,
  TrendingUp,
  BarChart3,
  Zap
} from 'lucide-react'
import { useDemoMetrics } from '@/store/useDemoStore'

interface MetricCardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  subtext?: string
  trend?: number
  color: string
}

function MetricCard({ icon, label, value, subtext, trend, color }: MetricCardProps) {
  return (
    <div className="bg-surface-elevated rounded-xl p-4 border border-border hover:border-blue-500/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-primary mb-1">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-sm text-secondary">{label}</div>
      {subtext && (
        <div className="text-xs text-secondary/70 mt-1">{subtext}</div>
      )}
    </div>
  )
}

export function PlatformMetricsDashboard() {
  const metrics = useDemoMetrics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Platform Metrics</h2>
          <p className="text-sm text-secondary">Real-time platform activity and AI utilization</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">
          <Zap className="w-4 h-4" />
          <span>Live</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<FileText className="w-5 h-5 text-blue-400" />}
          label="Documents Authored"
          value={metrics.documentsAuthored}
          trend={12}
          color="bg-blue-500/10"
        />
        <MetricCard
          icon={<MessageSquare className="w-5 h-5 text-purple-400" />}
          label="HAQ Responses Drafted"
          value={metrics.haqResponsesDrafted}
          trend={8}
          color="bg-purple-500/10"
        />
        <MetricCard
          icon={<Shield className="w-5 h-5 text-red-400" />}
          label="Safety Cases Processed"
          value={metrics.safetyCasesProcessed}
          trend={15}
          color="bg-red-500/10"
        />
        <MetricCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
          label="Signals Evaluated"
          value={metrics.signalsEvaluated}
          trend={-3}
          color="bg-amber-500/10"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={<Send className="w-5 h-5 text-teal-400" />}
          label="Submissions Built"
          value={metrics.submissionsBuilt}
          subtext="eCTD packages validated"
          color="bg-teal-500/10"
        />
        <MetricCard
          icon={<Sparkles className="w-5 h-5 text-indigo-400" />}
          label="AI Tokens Utilized"
          value={`${(metrics.aiTokensSaved / 1_000_000).toFixed(1)}M`}
          subtext="Claude API tokens"
          color="bg-indigo-500/10"
        />
        <MetricCard
          icon={<Clock className="w-5 h-5 text-emerald-400" />}
          label="Hours Automated"
          value={metrics.hoursAutomated}
          subtext="Manual work eliminated"
          color="bg-emerald-500/10"
        />
      </div>

      {/* AI Impact Summary */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-6 border border-blue-500/20">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <BarChart3 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-primary">AI Impact Summary</h3>
            <p className="text-sm text-secondary">Platform efficiency gains</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-blue-400">73%</div>
            <div className="text-sm text-secondary">Faster document drafting</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-purple-400">89%</div>
            <div className="text-sm text-secondary">HAQ response accuracy</div>
          </div>
          <div>
            <div className="text-3xl font-bold text-emerald-400">4.2x</div>
            <div className="text-sm text-secondary">Productivity multiplier</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Compact version for sidebar or header
export function PlatformMetricsCompact() {
  const metrics = useDemoMetrics()

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-secondary">{metrics.documentsAuthored}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-secondary">{metrics.haqResponsesDrafted}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5 text-red-400" />
        <span className="text-secondary">{metrics.safetyCasesProcessed}</span>
      </div>
    </div>
  )
}
