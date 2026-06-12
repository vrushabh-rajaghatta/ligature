
// ============================================================================
// Quick Preset Switcher - v136: Fast demo preset switching from header
// Allows instant preset changes without navigating to Data Management
// ============================================================================


import { useState, useCallback } from 'react'
import { 
  Database, 
  Sparkles, 
  Building2, 
  FlaskConical,
  Briefcase,
  ChevronDown,
  Check,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { useSnapshotStore, DEMO_PRESETS } from '@/store/useSnapshotStore'

// ============================================================================
// PRESET ICONS MAPPING
// ============================================================================

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  building: Building2,
  flask: FlaskConical,
  briefcase: Briefcase,
  // Emoji fallback - return Sparkles for any emoji
  '💼': Briefcase,
  '🏢': Building2,
  '📚': Sparkles,
  '🧪': FlaskConical,
}

// Get icon component, defaulting to Sparkles for unknown icons
const getPresetIcon = (icon: string): React.ComponentType<{ className?: string }> => {
  return PRESET_ICONS[icon] || Sparkles
}

// ============================================================================
// QUICK PRESET SWITCHER
// ============================================================================

interface QuickPresetSwitcherProps {
  compact?: boolean
}

export function QuickPresetSwitcher({ compact = false }: QuickPresetSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null)
  
  const loadPreset = useSnapshotStore((s) => s.loadPreset)
  const activeSnapshotId = useSnapshotStore((s) => s.activeSnapshotId)
  
  const handleLoadPreset = useCallback(async (presetId: string) => {
    setIsLoading(true)
    setLoadingPreset(presetId)
    
    // Simulate brief loading delay for UX
    await new Promise(resolve => setTimeout(resolve, 400))
    
    loadPreset(presetId)
    
    setIsLoading(false)
    setLoadingPreset(null)
    setIsOpen(false)
  }, [loadPreset])
  
  // Find current preset based on active snapshot name
  const currentPreset = DEMO_PRESETS.find(p => 
    activeSnapshotId?.toLowerCase().includes(p.id.toLowerCase())
  )
  
  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium
            transition-all duration-200 border
            ${isLoading 
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }
          `}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Database className="w-3 h-3" />
          )}
          <span className="hidden sm:inline">Data</span>
          <ChevronDown className="w-3 h-3" />
        </button>
        
        {isOpen && !isLoading && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-medium text-slate-500">Quick Presets</span>
              </div>
              <div className="py-1">
                {DEMO_PRESETS.map((preset) => {
                  const Icon = getPresetIcon(preset.icon)
                  const isActive = currentPreset?.id === preset.id
                  const isLoadingThis = loadingPreset === preset.id
                  
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset.id)}
                      disabled={isLoadingThis}
                      className={`
                        w-full px-3 py-2 flex items-center gap-2.5 text-left
                        transition-colors text-sm
                        ${isActive 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-slate-50 text-slate-700'
                        }
                        ${isLoadingThis ? 'opacity-50' : ''}
                      `}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      ) : (
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-400'}`} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{preset.name}</div>
                        <div className="text-xs text-slate-500 truncate">{preset.description}</div>
                      </div>
                      {isActive && !isLoadingThis && (
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
  
  // Full-size version
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
          transition-all duration-200 border
          ${isLoading 
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-wait'
            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
          }
        `}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Database className="w-4 h-4 text-slate-500" />
        )}
        <span>{currentPreset?.name || 'Demo Data'}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>
      
      {isOpen && !isLoading && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white">
              <h3 className="font-semibold text-slate-900">Demo Presets</h3>
              <p className="text-xs text-slate-500 mt-0.5">Switch data scenarios instantly</p>
            </div>
            
            <div className="py-2">
              {DEMO_PRESETS.map((preset) => {
                const Icon = getPresetIcon(preset.icon)
                const isActive = currentPreset?.id === preset.id
                const isLoadingThis = loadingPreset === preset.id
                
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleLoadPreset(preset.id)}
                    disabled={isLoadingThis}
                    className={`
                      w-full px-4 py-3 flex items-start gap-3 text-left
                      transition-all duration-200
                      ${isActive 
                        ? 'bg-blue-50/80' 
                        : 'hover:bg-slate-50'
                      }
                      ${isLoadingThis ? 'opacity-60' : ''}
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isActive 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-slate-100 text-slate-500'
                      }
                    `}>
                      {isLoadingThis ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-slate-900'}`}>
                          {preset.name}
                        </span>
                        {isActive && !isLoadingThis && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
            
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3" />
                Presets replace current demo data
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// PRESET INDICATOR BADGE (shows current preset)
// ============================================================================

export function PresetIndicatorBadge() {
  const activeSnapshotId = useSnapshotStore((s) => s.activeSnapshotId)
  
  const currentPreset = DEMO_PRESETS.find(p => 
    activeSnapshotId?.toLowerCase().includes(p.id.toLowerCase())
  )
  
  if (!currentPreset) return null
  
  const Icon = getPresetIcon(currentPreset.icon)
  
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md text-xs">
      <Icon className="w-3 h-3 text-slate-500" />
      <span className="text-slate-600 font-medium">{currentPreset.name}</span>
    </div>
  )
}
