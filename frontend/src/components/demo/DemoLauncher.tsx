
// ============================================================================
// Demo Launcher - v0.23.6: Prominent CTA for Investor Demos
// One-click guided demo experience with scenario selection
// ============================================================================


import { useState } from 'react'
import { 
  Play, 
  Rocket, 
  FileText, 
  Shield, 
  MessageSquare, 
  Send,
  ChevronRight,
  Clock,
  Sparkles,
  X,
  Zap,
  Users,
  Building
} from 'lucide-react'
import { useDemoStore } from '@/store/useDemoStore'
import { useDemoAnalyticsStore } from '@/store/useDemoAnalyticsStore'

interface DemoScenario {
  id: string
  title: string
  description: string
  duration: string
  icon: React.ReactNode
  steps: string[]
  audience: 'investor' | 'customer' | 'technical'
}

const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'investor-full',
    title: 'Full Platform Tour',
    description: 'Complete walkthrough showcasing the R&D Connected vision',
    duration: '8-10 min',
    icon: <Rocket className="w-5 h-5" />,
    steps: ['Portfolio Overview', 'Clinical Data', 'AI Authoring', 'HAQ Response', 'Safety Signal', 'Submission Building'],
    audience: 'investor',
  },
  {
    id: 'ai-focus',
    title: 'AI Capabilities',
    description: 'Deep dive into Claude-powered document authoring',
    duration: '5 min',
    icon: <Sparkles className="w-5 h-5" />,
    steps: ['Document Authoring', 'AI Generation', 'HAQ Response', 'Quality Checks'],
    audience: 'customer',
  },
  {
    id: 'regulatory-workflow',
    title: 'Regulatory Submission',
    description: 'End-to-end eCTD building and publishing workflow',
    duration: '6 min',
    icon: <Send className="w-5 h-5" />,
    steps: ['eCTD Workspace', 'Document Assembly', 'Validation', 'Gateway Publishing'],
    audience: 'customer',
  },
  {
    id: 'safety-signal',
    title: 'Safety & Pharmacovigilance',
    description: 'Signal detection to narrative generation',
    duration: '4 min',
    icon: <Shield className="w-5 h-5" />,
    steps: ['Signal Detection', 'Case Review', 'AI Narrative', 'Aggregate Reporting'],
    audience: 'technical',
  },
]

export function DemoLauncher() {
  const [showModal, setShowModal] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const startGuidedDemo = useDemoStore(s => s.startGuidedDemo)
  const enableDemoMode = useDemoStore(s => s.enableDemoMode)
  const startSession = useDemoAnalyticsStore(s => s.startSession)

  const handleStartDemo = (scenarioId: string) => {
    enableDemoMode()
    startSession('guided', 'investor', undefined, scenarioId)
    startGuidedDemo()
    setShowModal(false)
  }

  const handleQuickStart = () => {
    enableDemoMode()
    startSession('guided', 'investor', undefined, 'investor-full')
    startGuidedDemo()
    setShowModal(false)
  }

  return (
    <>
      {/* Main Launcher Button */}
      <button
        onClick={() => setShowModal(true)}
        className="
          flex items-center gap-2 px-4 py-2 
          bg-gradient-to-r from-blue-500 to-purple-500 
          text-white rounded-lg font-medium
          hover:from-blue-600 hover:to-purple-600
          shadow-lg shadow-blue-500/25
          transition-all hover:shadow-xl hover:shadow-blue-500/30
          hover:scale-[1.02]
        "
      >
        <Play className="w-4 h-4" />
        <span>Start Demo</span>
      </button>

      {/* Demo Selection Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-elevated rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-purple-500/10">
              <div>
                <h2 className="text-xl font-semibold text-primary flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Rocket className="w-5 h-5 text-blue-400" />
                  </div>
                  Launch Demo
                </h2>
                <p className="text-sm text-secondary mt-1">Choose a demo scenario for your audience</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-surface transition-colors"
              >
                <X className="w-5 h-5 text-secondary" />
              </button>
            </div>

            {/* Quick Start */}
            <div className="px-6 py-4 bg-surface border-b border-border">
              <button
                onClick={handleQuickStart}
                className="
                  w-full flex items-center justify-between p-4 
                  bg-gradient-to-r from-blue-500 to-purple-500 
                  rounded-xl text-white
                  hover:from-blue-600 hover:to-purple-600
                  transition-all hover:scale-[1.01]
                  shadow-lg
                "
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-lg">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-lg">Quick Start: Investor Demo</div>
                    <div className="text-sm text-white/80">Full platform tour with guided narration</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-white/70" />
                  <span className="text-sm text-white/70">8-10 min</span>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </div>
              </button>
            </div>

            {/* Scenario Selection */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium text-secondary">Or choose a specific scenario</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid gap-3">
                {DEMO_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedScenario(selectedScenario === scenario.id ? null : scenario.id)}
                    className={`
                      w-full p-4 rounded-xl border text-left transition-all
                      ${selectedScenario === scenario.id
                        ? 'border-blue-500/50 bg-blue-500/10'
                        : 'border-border bg-surface hover:bg-surface-elevated hover:border-border-hover'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`
                          p-2 rounded-lg
                          ${selectedScenario === scenario.id ? 'bg-blue-500/20 text-blue-400' : 'bg-surface-elevated text-secondary'}
                        `}>
                          {scenario.icon}
                        </div>
                        <div>
                          <div className="font-medium text-primary">{scenario.title}</div>
                          <div className="text-sm text-secondary mt-0.5">{scenario.description}</div>
                          
                          {selectedScenario === scenario.id && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {scenario.steps.map((step, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-surface text-xs text-secondary rounded"
                                >
                                  {step}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-secondary">
                          <Clock className="w-3.5 h-3.5" />
                          {scenario.duration}
                        </div>
                        {scenario.audience === 'investor' && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
                            <Building className="w-3 h-3 inline mr-1" />
                            Investor
                          </span>
                        )}
                        {scenario.audience === 'customer' && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">
                            <Users className="w-3 h-3 inline mr-1" />
                            Customer
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedScenario === scenario.id && (
                      <div className="mt-4 pt-4 border-t border-border/50 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartDemo(scenario.id)
                          }}
                          className="
                            flex items-center gap-2 px-4 py-2
                            bg-blue-500 text-white rounded-lg font-medium
                            hover:bg-blue-600 transition-colors
                          "
                        >
                          <Play className="w-4 h-4" />
                          Start This Demo
                        </button>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-surface border-t border-border flex items-center justify-between">
              <div className="text-xs text-secondary">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Demo mode uses pre-generated content or live AI if configured
                </span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Floating Action Button version
export function DemoFAB() {
  const startGuidedDemo = useDemoStore(s => s.startGuidedDemo)
  const enableDemoMode = useDemoStore(s => s.enableDemoMode)
  const guidedDemo = useDemoStore(s => s.guidedDemo)

  if (guidedDemo.isActive) return null

  const handleClick = () => {
    enableDemoMode()
    startGuidedDemo()
  }

  return (
    <button
      onClick={handleClick}
      className="
        fixed bottom-6 right-6 z-50
        flex items-center gap-2 px-5 py-3
        bg-gradient-to-r from-blue-500 to-purple-500
        text-white rounded-full font-medium
        shadow-2xl shadow-blue-500/30
        hover:from-blue-600 hover:to-purple-600
        hover:shadow-blue-500/40
        transition-all hover:scale-105
        animate-pulse hover:animate-none
      "
    >
      <Play className="w-5 h-5" />
      <span>Start Demo</span>
    </button>
  )
}

// Minimal version for header
export function DemoButton() {
  const startGuidedDemo = useDemoStore(s => s.startGuidedDemo)
  const enableDemoMode = useDemoStore(s => s.enableDemoMode)
  const guidedDemo = useDemoStore(s => s.guidedDemo)

  if (guidedDemo.isActive) return null

  const handleClick = () => {
    enableDemoMode()
    startGuidedDemo()
  }

  return (
    <button
      onClick={handleClick}
      className="
        flex items-center gap-2 px-3 py-1.5
        bg-gradient-to-r from-blue-500 to-purple-500
        text-white text-sm rounded-lg font-medium
        hover:from-blue-600 hover:to-purple-600
        transition-all
      "
    >
      <Play className="w-3.5 h-3.5" />
      <span>Demo</span>
    </button>
  )
}
