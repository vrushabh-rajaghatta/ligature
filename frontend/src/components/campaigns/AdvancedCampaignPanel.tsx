
import React, { useState, useEffect } from 'react'
import {
  useAdvancedCampaign,
  useCollaborationSession,
  useUserPresence,
  useQuestionClusters,
  useRegulatoryFeed,
  useRegulatoryUpdates,
  useRegulatoryAlerts,
  useActiveCoachingSession,
  useCoachingInsights,
  useCoachingSuggestions,
  useCrossCampaignAnalytics,
  usePortfolioMetricsHook,
  useAnalyticsTrendsHook,
  useAnalyticsInsightsHook,
  usePerformanceBenchmarks
} from '@/store/useAdvancedCampaign'
import type { SmartCluster, RegulatoryUpdate, CoachingInsight, CoachingSuggestion, AnalyticsInsight, TrendMetric } from '@/store/advancedCampaignTypes'

// ============================================================================
// 1. Real-Time Collaboration Panel
// ============================================================================

interface CollaborationPanelProps {
  campaignId: string
}

export function CollaborationPanel({ campaignId }: CollaborationPanelProps) {
  const session = useCollaborationSession(campaignId)
  const presence = useUserPresence(session?.id || '')
  const { createCollaborationSession, joinSession, leaveSession, endSession, acquireLock, releaseLock, getLocks } = useAdvancedCampaign()
  
  const locks = getLocks(campaignId)
  
  const handleStartSession = () => {
    const newSession = createCollaborationSession(campaignId)
    joinSession(newSession.id, 'current-user', 'You')
  }
  
  if (!session) {
    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Real-Time Collaboration</h3>
        <p className="text-sm text-gray-600 mb-4">Start a collaboration session to work with your team in real-time.</p>
        <button onClick={handleStartSession} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Start Session
        </button>
      </div>
    )
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Live Collaboration</h3>
        <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">Active</span>
      </div>
      
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Participants ({presence.length})</p>
        <div className="flex flex-wrap gap-2">
          {presence.map(p => (
            <div key={p.userId} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-full">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-sm">{p.userName}</span>
              {p.isTyping && <span className="text-xs text-gray-400">typing...</span>}
            </div>
          ))}
        </div>
      </div>
      
      {locks.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Active Locks</p>
          <div className="space-y-1">
            {locks.map(lock => (
              <div key={lock.id} className="flex items-center justify-between text-sm bg-yellow-50 px-2 py-1 rounded">
                <span>Question {lock.questionId} - {lock.lockedByName}</span>
                <button onClick={() => releaseLock(lock.id)} className="text-xs text-yellow-700 hover:underline">Release</button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <button onClick={() => endSession(session.id)} className="text-sm text-red-600 hover:underline">
        End Session
      </button>
    </div>
  )
}

// ============================================================================
// 2. Smart Clustering Panel
// ============================================================================

interface ClusteringPanelProps {
  campaignId: string
}

export function ClusteringPanel({ campaignId }: ClusteringPanelProps) {
  const clusters = useQuestionClusters(campaignId)
  const { analyzeQuestionClusters, startClusterBatch, getClusterBatchStatus, isProcessing, currentTask } = useAdvancedCampaign()
  const [expandedCluster, setExpandedCluster] = useState<string | null>(null)
  const [batchJobs, setBatchJobs] = useState<Record<string, string>>({})
  
  const handleAnalyze = async () => {
    await analyzeQuestionClusters(campaignId)
  }
  
  const handleStartBatch = (cluster: SmartCluster) => {
    const job = startClusterBatch(cluster.id)
    setBatchJobs(prev => ({ ...prev, [cluster.id]: job.id }))
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Smart Question Clustering</h3>
        <button onClick={handleAnalyze} disabled={isProcessing} className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50">
          {isProcessing ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>
      
      {currentTask && <p className="text-sm text-gray-500 mb-3">{currentTask}</p>}
      
      {clusters.length === 0 ? (
        <p className="text-sm text-gray-500">No clusters yet. Click Analyze to group questions.</p>
      ) : (
        <div className="space-y-3">
          {clusters.map(cluster => (
            <div key={cluster.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedCluster(expandedCluster === cluster.id ? null : cluster.id)}
                className="w-full px-3 py-2 bg-gray-50 flex items-center justify-between text-left hover:bg-gray-100"
              >
                <div>
                  <span className="font-medium">{cluster.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{cluster.questionIds.length} questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{cluster.discipline}</span>
                  <span className="text-gray-400">{expandedCluster === cluster.id ? '−' : '+'}</span>
                </div>
              </button>
              
              {expandedCluster === cluster.id && (
                <div className="p-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-gray-500">Cohesion</p>
                      <p className="font-semibold">{(cluster.cohesionScore * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-gray-500">Separation</p>
                      <p className="font-semibold">{(cluster.separationScore * 100).toFixed(0)}%</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-gray-500">Silhouette</p>
                      <p className="font-semibold">{(cluster.silhouetteScore * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                  
                  {cluster.sharedElements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Shared Elements</p>
                      <div className="flex flex-wrap gap-1">
                        {cluster.sharedElements.map((el, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{el.elementType}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button onClick={() => handleStartBatch(cluster)} className="w-full px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700">
                    Start Batch Processing
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 3. Regulatory Intelligence Panel
// ============================================================================

export function RegulatoryIntelligencePanel() {
  const feed = useRegulatoryFeed()
  const updates = useRegulatoryUpdates({ days: 30 })
  const alerts = useRegulatoryAlerts(true)
  const { initializeFeed, refreshFeed, acknowledgeUpdate, dismissAlert, createAlertFromUpdate, isProcessing } = useAdvancedCampaign()
  
  useEffect(() => {
    if (!feed) {
      initializeFeed()
    }
  }, [feed, initializeFeed])
  
  const getPriorityColor = (update: RegulatoryUpdate) => {
    if (update.impactAssessment?.severity === 'high') return 'border-l-red-500'
    if (update.impactAssessment?.severity === 'medium') return 'border-l-yellow-500'
    return 'border-l-blue-500'
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Regulatory Intelligence</h3>
        <button onClick={refreshFeed} disabled={isProcessing} className="px-3 py-1 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50">
          {isProcessing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      {alerts.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Alerts ({alerts.length})</p>
          <div className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <p className="text-sm font-medium text-red-800">{alert.title}</p>
                  <button onClick={() => dismissAlert(alert.id, 'current-user')} className="text-xs text-red-600 hover:underline">Dismiss</button>
                </div>
                <p className="text-xs text-red-600 mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div>
        <p className="text-xs font-medium text-gray-700 mb-2">Recent Updates ({updates.length})</p>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {updates.map(update => (
            <div key={update.id} className={`p-2 bg-gray-50 border-l-4 ${getPriorityColor(update)} rounded-r-lg`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-1.5 py-0.5 bg-gray-200 rounded">{update.agency}</span>
                    <span className="text-xs text-gray-500">{new Date(update.publishedAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-800">{update.title}</p>
                  <p className="text-xs text-gray-600 mt-1">{update.summary}</p>
                </div>
                <div className="flex flex-col gap-1 ml-2">
                  {!update.acknowledged && (
                    <button onClick={() => acknowledgeUpdate(update.id, 'current-user')} className="text-xs text-blue-600 hover:underline">Ack</button>
                  )}
                  <button onClick={() => createAlertFromUpdate(update.id, 'urgent')} className="text-xs text-orange-600 hover:underline">Alert</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {feed?.trends && feed.trends.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">Regulatory Trends</p>
          <div className="space-y-2">
            {feed.trends.slice(0, 2).map(trend => (
              <div key={trend.id} className="p-2 bg-teal-50 rounded-lg">
                <p className="text-sm font-medium text-teal-800">{trend.name}</p>
                <p className="text-xs text-teal-600">{trend.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${trend.direction === 'increasing' ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.direction === 'increasing' ? '↑' : '↓'} {(trend.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 4. Quality Coach Panel
// ============================================================================

interface QualityCoachPanelProps {
  questionId: string
  draftId: string
}

export function QualityCoachPanel({ questionId, draftId }: QualityCoachPanelProps) {
  const session = useActiveCoachingSession(questionId)
  const insights = useCoachingInsights(session?.id || '')
  const suggestions = useCoachingSuggestions(session?.id || '')
  const { startCoachingSession, endCoachingSession, generateInsights, generateSuggestions, applySuggestion, rejectSuggestion, advanceCoachingStep, dismissInsight, isProcessing } = useAdvancedCampaign()
  
  const handleStartCoaching = () => {
    startCoachingSession(questionId, draftId, 'current-user')
  }
  
  const handleGenerateAll = async () => {
    if (session) {
      await generateInsights(session.id)
      await generateSuggestions(session.id)
    }
  }
  
  const getSeverityColor = (severity: CoachingInsight['severity']) => {
    if (severity === 'critical') return 'bg-red-50 border-red-200 text-red-800'
    if (severity === 'important') return 'bg-yellow-50 border-yellow-200 text-yellow-800'
    return 'bg-blue-50 border-blue-200 text-blue-800'
  }
  
  if (!session) {
    return (
      <div className="p-4 bg-white rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Response Quality Coach</h3>
        <p className="text-sm text-gray-600 mb-4">Get AI-powered guidance to improve your response quality.</p>
        <button onClick={handleStartCoaching} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
          Start Coaching
        </button>
      </div>
    )
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Quality Coach</h3>
          <p className="text-xs text-gray-500">Step {session.currentStep} of {session.totalSteps}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            {session.progress.overallProgress}% complete
          </span>
          <button onClick={() => endCoachingSession(session.id)} className="text-xs text-gray-500 hover:underline">End</button>
        </div>
      </div>
      
      <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
        <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${session.progress.overallProgress}%` }} />
      </div>
      
      <div className="flex gap-2 mb-4">
        <button onClick={handleGenerateAll} disabled={isProcessing} className="flex-1 px-3 py-2 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">
          {isProcessing ? 'Analyzing...' : 'Analyze Response'}
        </button>
        <button onClick={() => advanceCoachingStep(session.id)} className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50">
          Next Step
        </button>
      </div>
      
      {insights.filter(i => !i.dismissed).length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">Insights ({insights.filter(i => !i.dismissed).length})</p>
          <div className="space-y-2">
            {insights.filter(i => !i.dismissed).map(insight => (
              <div key={insight.id} className={`p-2 border rounded-lg ${getSeverityColor(insight.severity)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs mt-1">{insight.description}</p>
                  </div>
                  <button onClick={() => dismissInsight(insight.id)} className="text-xs opacity-60 hover:opacity-100">×</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {suggestions.filter(s => s.status === 'pending').length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Suggestions ({suggestions.filter(s => s.status === 'pending').length})</p>
          <div className="space-y-2">
            {suggestions.filter(s => s.status === 'pending').map(suggestion => (
              <div key={suggestion.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">{suggestion.title}</p>
                <p className="text-xs text-green-600 mt-1">{suggestion.description}</p>
                {suggestion.suggestedText && (
                  <p className="text-xs mt-2 p-2 bg-white rounded border border-green-200 font-mono">{suggestion.suggestedText}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => applySuggestion(suggestion.id)} className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Apply</button>
                  <button onClick={() => rejectSuggestion(suggestion.id)} className="px-2 py-1 text-xs border border-green-300 text-green-700 rounded hover:bg-green-100">Skip</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-500">Applied</p>
            <p className="font-semibold">{session.metrics.suggestionsApplied}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-500">Skipped</p>
            <p className="font-semibold">{session.metrics.suggestionsRejected}</p>
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <p className="text-gray-500">Quality +</p>
            <p className="font-semibold text-green-600">+{session.metrics.qualityImprovement}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 5. Cross-Campaign Analytics Panel
// ============================================================================

export function AnalyticsPanel() {
  const analytics = useCrossCampaignAnalytics()
  const portfolioMetrics = usePortfolioMetricsHook()
  const trends = useAnalyticsTrendsHook()
  const insights = useAnalyticsInsightsHook()
  const benchmarks = usePerformanceBenchmarks()
  const { generateCrossCampaignAnalytics, generateForecast, executeInsightAction, isProcessing } = useAdvancedCampaign()
  const [selectedTrend, setSelectedTrend] = useState<TrendMetric>('quality-score')
  
  const handleGenerateAnalytics = async () => {
    await generateCrossCampaignAnalytics()
  }
  
  const handleGenerateForecast = () => {
    generateForecast(selectedTrend, 30)
  }
  
  const getTrendDirection = (direction: string) => {
    if (direction === 'improving') return { icon: '↑', color: 'text-green-600' }
    if (direction === 'declining') return { icon: '↓', color: 'text-red-600' }
    return { icon: '→', color: 'text-gray-600' }
  }
  
  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Cross-Campaign Analytics</h3>
        <button onClick={handleGenerateAnalytics} disabled={isProcessing} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
          {isProcessing ? 'Generating...' : 'Generate'}
        </button>
      </div>
      
      {portfolioMetrics && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-indigo-50 rounded-lg">
            <p className="text-xs text-indigo-600">Total Campaigns</p>
            <p className="text-2xl font-bold text-indigo-800">{portfolioMetrics.totalCampaigns}</p>
            <p className="text-xs text-indigo-500">{portfolioMetrics.activeCampaigns} active</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600">Avg Quality Score</p>
            <p className="text-2xl font-bold text-green-800">{portfolioMetrics.avgQualityScore.toFixed(1)}</p>
            <p className="text-xs text-green-500">{getTrendDirection(portfolioMetrics.qualityTrend).icon} {portfolioMetrics.qualityTrend}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600">Questions</p>
            <p className="text-2xl font-bold text-blue-800">{portfolioMetrics.totalQuestions}</p>
            <p className="text-xs text-blue-500">{portfolioMetrics.questionsCompleted} completed</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-600">On-Time Rate</p>
            <p className="text-2xl font-bold text-amber-800">{portfolioMetrics.onTimeRate}%</p>
            <p className="text-xs text-amber-500">{portfolioMetrics.consistencyRate}% consistent</p>
          </div>
        </div>
      )}
      
      {portfolioMetrics?.disciplineBreakdown && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 mb-2">By Discipline</p>
          <div className="space-y-2">
            {portfolioMetrics.disciplineBreakdown.map(disc => (
              <div key={disc.discipline} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm font-medium">{disc.discipline}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span>{disc.questionCount} questions</span>
                  <span className="font-medium">{disc.avgQualityScore.toFixed(1)} avg</span>
                  <span className={getTrendDirection(disc.trend).color}>{getTrendDirection(disc.trend).icon}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {trends.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-700">Trends</p>
            <select value={selectedTrend} onChange={e => setSelectedTrend(e.target.value as TrendMetric)} className="text-xs border rounded px-2 py-1">
              <option value="quality-score">Quality Score</option>
              <option value="completion-time">Completion Time</option>
              <option value="consistency-rate">Consistency Rate</option>
            </select>
          </div>
          {trends.filter(t => t.metric === selectedTrend).map(trend => (
            <div key={trend.id} className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{trend.period}</span>
                <span className={`text-xs ${getTrendDirection(trend.trendLine.direction).color}`}>
                  {getTrendDirection(trend.trendLine.direction).icon} {trend.trendLine.direction}
                </span>
              </div>
              <div className="h-16 flex items-end gap-1">
                {trend.dataPoints.slice(-12).map((point, i) => (
                  <div key={i} className="flex-1 bg-indigo-400 rounded-t" style={{ height: `${Math.min(100, (point.value / 100) * 100)}%` }} title={`${point.value.toFixed(1)}`} />
                ))}
              </div>
              <button onClick={handleGenerateForecast} className="mt-2 w-full text-xs text-indigo-600 hover:underline">
                Generate 30-day forecast
              </button>
            </div>
          ))}
        </div>
      )}
      
      {insights.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-700 mb-2">Insights</p>
          <div className="space-y-2">
            {insights.slice(0, 3).map(insight => (
              <div key={insight.id} className={`p-2 rounded-lg border ${insight.priority === 'high' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-sm font-medium">{insight.title}</p>
                <p className="text-xs text-gray-600 mt-1">{insight.description}</p>
                {insight.actionable && insight.actions && (
                  <div className="mt-2">
                    {insight.actions.filter(a => a.status === 'pending').map(action => (
                      <button key={action.id} onClick={() => executeInsightAction(action.id)} className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        {action.description}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Advanced Campaign Dashboard
// ============================================================================

interface AdvancedCampaignDashboardProps {
  campaignId: string
  questionId?: string
  draftId?: string
}

export function AdvancedCampaignDashboard({ campaignId, questionId, draftId }: AdvancedCampaignDashboardProps) {
  const [activeTab, setActiveTab] = useState<'collab' | 'cluster' | 'intel' | 'coach' | 'analytics'>('collab')
  
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button onClick={() => setActiveTab('collab')} className={`px-3 py-1.5 text-sm rounded-t ${activeTab === 'collab' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Collaboration
        </button>
        <button onClick={() => setActiveTab('cluster')} className={`px-3 py-1.5 text-sm rounded-t ${activeTab === 'cluster' ? 'bg-purple-100 text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Clustering
        </button>
        <button onClick={() => setActiveTab('intel')} className={`px-3 py-1.5 text-sm rounded-t ${activeTab === 'intel' ? 'bg-teal-100 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Intelligence
        </button>
        <button onClick={() => setActiveTab('coach')} className={`px-3 py-1.5 text-sm rounded-t ${activeTab === 'coach' ? 'bg-amber-100 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Coach
        </button>
        <button onClick={() => setActiveTab('analytics')} className={`px-3 py-1.5 text-sm rounded-t ${activeTab === 'analytics' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'}`}>
          Analytics
        </button>
      </div>
      
      {activeTab === 'collab' && <CollaborationPanel campaignId={campaignId} />}
      {activeTab === 'cluster' && <ClusteringPanel campaignId={campaignId} />}
      {activeTab === 'intel' && <RegulatoryIntelligencePanel />}
      {activeTab === 'coach' && questionId && draftId && <QualityCoachPanel questionId={questionId} draftId={draftId} />}
      {activeTab === 'coach' && (!questionId || !draftId) && (
        <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
          Select a question and draft to start coaching
        </div>
      )}
      {activeTab === 'analytics' && <AnalyticsPanel />}
    </div>
  )
}

export default AdvancedCampaignDashboard
