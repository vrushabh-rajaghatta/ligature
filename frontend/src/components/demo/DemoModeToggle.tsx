
// ============================================================================
// Demo Mode Toggle - v119: Simplified (removed recording infrastructure)
// ============================================================================


import { useState } from 'react'
import { 
  Play, 
  Pause, 
  Radio, 
  Zap, 
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { useDemoStore, useIsDemoMode } from '@/store/useDemoStore'

interface DemoModeToggleProps {
  compact?: boolean
}

export function DemoModeToggle({ compact = false }: DemoModeToggleProps) {
  const [showMenu, setShowMenu] = useState(false)
  const isDemoMode = useIsDemoMode()
  // v204d-b7: Use individual selectors to prevent infinite loops from new object references
  const toggleDemoMode = useDemoStore(s => s.toggleDemoMode)
  const showDemoIndicator = useDemoStore(s => s.showDemoIndicator)
  const setShowDemoIndicator = useDemoStore(s => s.setShowDemoIndicator)
  const guidedDemoIsActive = useDemoStore(s => s.guidedDemo.isActive)
  const startGuidedDemo = useDemoStore(s => s.startGuidedDemo)
  const stopGuidedDemo = useDemoStore(s => s.stopGuidedDemo)

  if (compact) {
    return (
      <button
        onClick={toggleDemoMode}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
          transition-all duration-200
          ${isDemoMode 
            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
            : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
          }
        `}
        title={isDemoMode ? 'Demo Mode Active' : 'Live Mode Active'}
      >
        {isDemoMode ? (
          <>
            <Radio className="w-3 h-3 animate-pulse" />
            <span>DEMO</span>
          </>
        ) : (
          <>
            <Zap className="w-3 h-3" />
            <span>LIVE</span>
          </>
        )}
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-all duration-200 border
          ${isDemoMode 
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20' 
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
          }
        `}
      >
        {isDemoMode ? (
          <>
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Demo Mode</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>Live Mode</span>
          </>
        )}
      </button>

      {showMenu && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowMenu(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-surface-elevated border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-border bg-surface">
              <h3 className="font-semibold text-sm">Mode Settings</h3>
              <p className="text-xs text-secondary mt-0.5">
                Configure demo and presentation settings
              </p>
            </div>

            {/* Mode Toggle */}
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isDemoMode ? (
                    <Radio className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Zap className="w-4 h-4 text-emerald-400" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {isDemoMode ? 'Demo Mode' : 'Live Mode'}
                    </div>
                    <div className="text-xs text-secondary">
                      {isDemoMode 
                        ? 'Using pre-generated AI outputs' 
                        : 'Connected to Claude API'
                      }
                    </div>
                  </div>
                </div>
                <button
                  onClick={toggleDemoMode}
                  className={`
                    relative w-11 h-6 rounded-full transition-colors duration-200
                    ${isDemoMode ? 'bg-amber-500' : 'bg-emerald-500'}
                  `}
                >
                  <div 
                    className={`
                      absolute top-1 w-4 h-4 bg-white rounded-full
                      transition-transform duration-200
                      ${isDemoMode ? 'left-6' : 'left-1'}
                    `}
                  />
                </button>
              </div>
            </div>

            {/* Demo Mode Options */}
            {isDemoMode && (
              <div className="p-3 space-y-2 border-b border-border/50">
                {/* Show Indicator Toggle */}
                <button
                  onClick={() => setShowDemoIndicator(!showDemoIndicator)}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface text-sm"
                >
                  <div className="flex items-center gap-2">
                    {showDemoIndicator ? (
                      <Eye className="w-4 h-4 text-secondary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-secondary" />
                    )}
                    <span>Show demo indicator</span>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${showDemoIndicator ? 'bg-blue-500' : 'bg-border'}`} />
                </button>

                {/* Guided Demo */}
                <button
                  onClick={() => {
                    if (guidedDemoIsActive) {
                      stopGuidedDemo()
                    } else {
                      startGuidedDemo()
                    }
                    setShowMenu(false)
                  }}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface text-sm"
                >
                  <div className="flex items-center gap-2">
                    {guidedDemoIsActive ? (
                      <Pause className="w-4 h-4 text-secondary" />
                    ) : (
                      <Play className="w-4 h-4 text-secondary" />
                    )}
                    <span>{guidedDemoIsActive ? 'Stop Guided Demo' : 'Start Guided Demo'}</span>
                  </div>
                  {guidedDemoIsActive && (
                    <span className="text-xs text-amber-400">Active</span>
                  )}
                </button>
              </div>
            )}

            {/* Status Info */}
            <div className="px-4 py-3 bg-surface/50">
              <div className="flex items-start gap-2">
                {isDemoMode ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-secondary">
                      Demo mode uses pre-generated responses for instant, consistent demos. 
                      No API calls are made.
                    </p>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-secondary">
                      Live mode connects to Claude API for real AI generation. 
                      API key required.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Floating demo indicator badge
export function DemoIndicatorBadge() {
  const isDemoMode = useIsDemoMode()
  const showIndicator = useDemoStore(s => s.showDemoIndicator)

  if (!isDemoMode || !showIndicator) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 bg-amber-500/90 text-white rounded-full shadow-lg text-sm font-medium animate-pulse">
      <Radio className="w-4 h-4" />
      <span>Demo Mode</span>
    </div>
  )
}
