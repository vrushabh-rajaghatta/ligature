
// ============================================================================
// AI Status Indicator - v0.23.6: Shows Live AI vs Demo Mode status
// Displays in header with quick toggle and configuration help
// ============================================================================


import { useState } from 'react'
import { Sparkles, Zap, AlertCircle, Check, Settings, ExternalLink, X } from 'lucide-react'
import { useAIServiceStatus } from '@/hooks/useAIService'
import { useDemoStore } from '@/store/useDemoStore'

export function AIStatusIndicator() {
  const status = useAIServiceStatus()
  const isDemoMode = useDemoStore(s => s.isDemoMode)
  const [showConfig, setShowConfig] = useState(false)

  const isLive = status.status === 'configured'
  const isChecking = status.status === 'checking'

  return (
    <>
      <button
        onClick={() => setShowConfig(true)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
          ${isLive
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
            : isDemoMode
              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
          }
        `}
      >
        {isChecking ? (
          <>
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
            <span>Checking AI...</span>
          </>
        ) : isLive ? (
          <>
            <Zap className="w-3.5 h-3.5" />
            <span>Live AI</span>
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          </>
        ) : isDemoMode ? (
          <>
            <Sparkles className="w-3.5 h-3.5" />
            <span>Demo Mode</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-3.5 h-3.5" />
            <span>AI Offline</span>
          </>
        )}
      </button>

      {/* Configuration Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-elevated rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                AI Configuration
              </h2>
              <button
                onClick={() => setShowConfig(false)}
                className="p-1 rounded hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Current Status */}
              <div className={`
                p-4 rounded-lg border
                ${isLive 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : 'bg-amber-500/10 border-amber-500/30'
                }
              `}>
                <div className="flex items-center gap-3 mb-2">
                  {isLive ? (
                    <Check className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  )}
                  <span className={`font-medium ${isLive ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isLive ? 'Live AI Enabled' : 'Demo Mode Active'}
                  </span>
                </div>
                <p className="text-sm text-secondary">
                  {isLive
                    ? 'Claude is generating real AI responses using your API key.'
                    : 'AI features are using pre-generated demo content. Add your API key for live generation.'
                  }
                </p>
              </div>

              {/* Configuration Help */}
              {!isLive && (
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Enable Live AI</h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-400">1</span>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Get an API key from Anthropic</p>
                        <a
                          href="https://console.anthropic.com/settings/keys"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                        >
                          console.anthropic.com
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-400">2</span>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Add to your environment</p>
                        <code className="text-xs bg-surface px-2 py-1 rounded mt-1 block font-mono text-secondary">
                          ANTHROPIC_API_KEY=sk-ant-...
                        </code>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-400">3</span>
                      </div>
                      <div>
                        <p className="text-sm text-primary">Restart the development server</p>
                        <code className="text-xs bg-surface px-2 py-1 rounded mt-1 block font-mono text-secondary">
                          npm run dev
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Model Info */}
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary">Model</span>
                  <span className="text-primary font-mono">{status.model}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-2">
                  <span className="text-secondary">Capabilities</span>
                  <span className="text-primary">HAQ, Safety, Documents, Signals, QC, Labeling, Protocols</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-surface border-t border-border">
              <button
                onClick={() => setShowConfig(false)}
                className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Compact version for sidebar
export function AIStatusBadge() {
  const status = useAIServiceStatus()
  const isLive = status.status === 'configured'

  return (
    <div className={`
      inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium
      ${isLive 
        ? 'bg-emerald-500/20 text-emerald-400' 
        : 'bg-purple-500/20 text-purple-400'
      }
    `}>
      {isLive ? (
        <>
          <Zap className="w-3 h-3" />
          <span>Live</span>
        </>
      ) : (
        <>
          <Sparkles className="w-3 h-3" />
          <span>Demo</span>
        </>
      )}
    </div>
  )
}
