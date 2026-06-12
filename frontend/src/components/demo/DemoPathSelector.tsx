
// ============================================================================
// Demo Path Selector - v77: Choose demo paths for different audiences
// ============================================================================


import { useState } from 'react'
import { 
  Users, 
  Code, 
  FileCheck, 
  TrendingUp, 
  Zap,
  Clock,
  ChevronRight,
  Check,
  X,
  Play
} from 'lucide-react'
import { 
  useDemoAnalyticsStore, 
  useDemoPaths, 
  useSelectedPathId,
  DEMO_PATHS,
  type DemoPathConfig,
  type DemoAudienceType 
} from '@/store/useDemoAnalyticsStore'
import { useDemoStore } from '@/store/useDemoStore'

const AUDIENCE_ICONS: Record<DemoAudienceType, typeof Users> = {
  executive: TrendingUp,
  technical: Code,
  regulatory: FileCheck,
  investor: Users,
  general: Zap,
}

const AUDIENCE_COLORS: Record<DemoAudienceType, string> = {
  executive: 'text-purple-400 bg-purple-500/20',
  technical: 'text-blue-400 bg-blue-500/20',
  regulatory: 'text-emerald-400 bg-emerald-500/20',
  investor: 'text-amber-400 bg-amber-500/20',
  general: 'text-gray-400 bg-gray-500/20',
}

interface DemoPathSelectorProps {
  onPathSelected?: (pathId: string) => void
  onClose?: () => void
  showStartButton?: boolean
}

export function DemoPathSelector({ 
  onPathSelected, 
  onClose,
  showStartButton = true 
}: DemoPathSelectorProps) {
  const paths = useDemoPaths()
  const selectedPathId = useSelectedPathId()
  // v204d-b7: Use individual selectors to prevent infinite loops
  const selectPath = useDemoAnalyticsStore(s => s.selectPath)
  const startSession = useDemoAnalyticsStore(s => s.startSession)
  const startGuidedDemo = useDemoStore(s => s.startGuidedDemo)
  const advanceToStep = useDemoStore(s => s.advanceToStep)
  const [audienceName, setAudienceName] = useState('')
  const [hoveredPath, setHoveredPath] = useState<string | null>(null)

  const handleSelectPath = (pathId: string) => {
    selectPath(pathId)
    onPathSelected?.(pathId)
  }

  const handleStartDemo = () => {
    if (!selectedPathId) return
    
    const path = paths.find(p => p.id === selectedPathId)
    if (!path) return
    
    // Start analytics session
    startSession('guided', path.audienceType, audienceName || undefined, selectedPathId)
    
    // Start the guided demo
    startGuidedDemo()
    
    // Navigate to first step of the path
    if (path.steps[0]) {
      advanceToStep(path.steps[0])
    }
    
    onClose?.()
  }

  const selectedPath = paths.find(p => p.id === selectedPathId)

  return (
    <div className="bg-surface-elevated rounded-xl border border-border shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-primary">Choose Demo Path</h2>
          <p className="text-sm text-secondary mt-1">
            Select the audience type to customize your presentation
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface text-secondary hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Path Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paths.map((path) => {
            const Icon = AUDIENCE_ICONS[path.audienceType]
            const colorClass = AUDIENCE_COLORS[path.audienceType]
            const isSelected = selectedPathId === path.id
            const isHovered = hoveredPath === path.id

            return (
              <button
                key={path.id}
                onClick={() => handleSelectPath(path.id)}
                onMouseEnter={() => setHoveredPath(path.id)}
                onMouseLeave={() => setHoveredPath(null)}
                className={`
                  relative p-4 rounded-xl border-2 text-left transition-all duration-200
                  ${isSelected 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-border hover:border-border-hover bg-surface hover:bg-surface-elevated'
                  }
                `}
              >
                {/* Selection indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-8">
                    <h3 className="font-semibold text-primary">{path.name}</h3>
                    <p className="text-sm text-secondary line-clamp-2">
                      {path.description}
                    </p>
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-xs text-secondary mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    ~{path.estimatedMinutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    {path.steps.length} steps
                  </span>
                </div>

                {/* Focus areas */}
                <div className="flex flex-wrap gap-1.5">
                  {path.focusAreas.slice(0, 3).map((area, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 bg-surface rounded text-xs text-secondary"
                    >
                      {area}
                    </span>
                  ))}
                  {path.focusAreas.length > 3 && (
                    <span className="px-2 py-0.5 text-xs text-secondary">
                      +{path.focusAreas.length - 3} more
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Path Details & Start */}
      {selectedPath && (
        <div className="px-6 py-4 border-t border-border bg-surface">
          <div className="flex items-start gap-6">
            {/* Talking Points */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-primary mb-2">
                Key Talking Points
              </h4>
              <ul className="space-y-1">
                {selectedPath.talkingPoints.slice(0, 3).map((point, idx) => (
                  <li key={idx} className="text-sm text-secondary flex items-start gap-2">
                    <span className="text-blue-400 mt-1">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Start Section */}
            {showStartButton && (
              <div className="flex flex-col items-end gap-3">
                <input
                  type="text"
                  placeholder="Audience name (optional)"
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-primary placeholder:text-secondary w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  onClick={handleStartDemo}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Demo
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Quick path selector (compact version for header dropdown)
export function QuickPathSelector({ onSelect }: { onSelect?: (pathId: string) => void }) {
  const paths = useDemoPaths()
  const selectedPathId = useSelectedPathId()
  // v204d-b7: Use individual selector to prevent infinite loops
  const selectPath = useDemoAnalyticsStore(s => s.selectPath)

  const handleSelect = (pathId: string) => {
    selectPath(pathId)
    onSelect?.(pathId)
  }

  return (
    <div className="py-2">
      <div className="px-3 py-1 text-xs font-medium text-secondary uppercase tracking-wider">
        Demo Paths
      </div>
      {paths.map((path) => {
        const Icon = AUDIENCE_ICONS[path.audienceType]
        const isSelected = selectedPathId === path.id

        return (
          <button
            key={path.id}
            onClick={() => handleSelect(path.id)}
            className={`
              w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors
              ${isSelected 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'text-secondary hover:bg-surface hover:text-primary'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="flex-1 text-left">{path.name}</span>
            <span className="text-xs opacity-60">~{path.estimatedMinutes}m</span>
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        )
      })}
    </div>
  )
}
