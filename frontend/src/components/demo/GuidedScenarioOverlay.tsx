

import { useEffect, useCallback, useState } from 'react';
import {
  X, ChevronRight, ChevronLeft, Play, Pause, SkipForward,
  RotateCcw, Check, Circle, Timer, Target, Sparkles,
  ArrowRight, Zap, Eye, Volume2, VolumeX, Save, History,
  Trash2, BarChart3
} from 'lucide-react';
import {
  useGuidedScenarioStore,
  useActiveScenario,
  useCurrentScenarioStep,
  useScenarioProgress,
  useIsScenarioActive,
  useSavedSession,
  useHasSavedSession,
  useCompletionStats,
  GUIDED_SCENARIOS,
  ScenarioId,
  GuidedScenario,
} from '@/store/useGuidedScenarioStore';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { useAppStore } from '@/store/useAppStore';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { Badge } from '@/components/ui/Badge';

// ============================================================================
// GUIDED SCENARIO OVERLAY - v166
// Interactive overlay for cross-module demo scenarios
// v166: Added persistence, resume, and completion tracking
// ============================================================================

// Module to route mapping
// v0.15.33: Fixed invalid route names to match DynamicScreens in page.tsx
const MODULE_ROUTES: Record<string, string> = {
  research: 'research',
  clinical: 'ctms',           // Fixed: was 'clinical-ops'
  safety: 'safety',
  regulatory: 'strategy',     // Fixed: was 'regulatory-strategy'
  submissions: 'submissions', // Changed: 'ectd-workspace' → 'submissions' for main screen
  labeling: 'labeling',
  authoring: 'authoring',
  qms: 'qms',
  cmc: 'cmc',
  portfolio: 'portfolio',
  haq: 'haq',                 // Added: HAQ module for scenarios
  glp: 'glp',                 // Added: GLP module for preclinical scenarios
  psmf: 'psmf',               // Added: PSMF module
  tmf: 'tmf',                 // Added: TMF module
  stability: 'stability',     // v0.43.3: For submission readiness scenario
  biostats: 'biostats',       // v0.43.3: For submission readiness scenario
  ctms: 'ctms',               // v0.43.3: CTMS (hosts Submission Readiness Dashboard)
};

// ============================================================================
// SCENARIO SELECTOR PANEL
// v166: Now shows saved session resume option and completion stats
// ============================================================================

interface ScenarioSelectorProps {
  onSelect: (scenarioId: ScenarioId) => void;
  onClose: () => void;
}

export function ScenarioSelector({ onSelect, onClose }: ScenarioSelectorProps) {
  const scenarios = Object.values(GUIDED_SCENARIOS);
  const savedSession = useSavedSession();
  const completionStats = useCompletionStats();
  // v204d-b7: Use individual selectors to prevent infinite loops
  const resumeSavedSession = useGuidedScenarioStore(s => s.resumeSavedSession);
  const clearSavedSession = useGuidedScenarioStore(s => s.clearSavedSession);
  
  const handleResume = () => {
    resumeSavedSession();
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-elevated border border-border rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border bg-gradient-to-r from-accent-purple/10 to-accent-blue/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent-purple/20 rounded-lg">
                <Target className="w-5 h-5 text-accent-purple" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">Guided Scenarios</h2>
            </div>
            <div className="flex items-center gap-2">
              {/* Completion stats badge */}
              {completionStats.totalCompleted > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-surface-card rounded-full">
                  <BarChart3 className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-xs text-text-secondary">
                    {completionStats.totalCompleted} completed
                  </span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-surface-card rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-muted" />
              </button>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Experience cross-module data flow with interactive guided demos
          </p>
        </div>
        
        {/* Saved Session Resume Banner */}
        {savedSession && (
          <div className="px-4 pt-4">
            <div className="p-4 bg-accent-amber/10 border border-accent-amber/30 rounded-xl">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-accent-amber/20 rounded-lg">
                  <History className="w-5 h-5 text-accent-amber" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text-primary">
                    Resume Previous Session
                  </h3>
                  <p className="text-sm text-text-secondary mt-0.5">
                    <strong>{savedSession.scenario.name}</strong> — Step {savedSession.stepIndex + 1} of {savedSession.totalSteps}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    "{savedSession.stepTitle}" • {savedSession.progressPercentage}% complete
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      onClick={handleResume}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-amber text-white text-sm font-medium rounded-lg hover:bg-accent-amber/90 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Resume
                    </button>
                    <button
                      onClick={clearSavedSession}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Discard
                    </button>
                  </div>
                </div>
                {/* Progress ring */}
                <div className="relative w-12 h-12">
                  <svg className="w-12 h-12 -rotate-90">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-surface-card"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${savedSession.progressPercentage * 1.26} 126`}
                      className="text-accent-amber"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-accent-amber">
                    {savedSession.progressPercentage}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Scenario List */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            {scenarios.map(scenario => {
              const completedCount = completionStats.scenarioBreakdown[scenario.id] || 0;
              
              return (
                <button
                  key={scenario.id}
                  onClick={() => onSelect(scenario.id)}
                  className="w-full text-left p-4 bg-surface-card hover:bg-surface-elevated border border-border hover:border-accent-purple/50 rounded-xl transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 bg-surface-elevated rounded-lg group-hover:bg-accent-purple/20 transition-colors">
                      <Sparkles className="w-5 h-5 text-accent-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-text-primary group-hover:text-accent-purple transition-colors">
                          {scenario.name}
                        </h3>
                        {completedCount > 0 && (
                          <Badge color="green" size="xs">
                            <Check className="w-3 h-3 mr-0.5" />
                            {completedCount}x
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {scenario.description}
                      </p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Timer className="w-3.5 h-3.5" />
                          {Math.ceil(scenario.duration / 60)} min
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-muted">
                          <Circle className="w-3.5 h-3.5" />
                          {scenario.steps.length} steps
                        </div>
                        <div className="flex gap-1.5">
                          {scenario.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-surface-elevated rounded text-text-muted">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-accent-purple transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SCENARIO STEP DISPLAY
// ============================================================================

interface StepDisplayProps {
  step: ReturnType<typeof useCurrentScenarioStep>;
  scenario: GuidedScenario;
  onNext: () => void;
  onPrevious: () => void;
  onStop: () => void;
  onSaveAndExit: () => void;
}

function StepDisplay({ step, scenario, onNext, onPrevious, onStop, onSaveAndExit }: StepDisplayProps) {
  // v165 fix: Call ALL hooks unconditionally before any conditional returns
  const progress = useScenarioProgress();
  const [timeRemaining, setTimeRemaining] = useState(step?.duration || 0);
  const [isNarrating, setIsNarrating] = useState(false);
  
  // Auto-advance timer - must be called unconditionally
  useEffect(() => {
    if (!step) return; // Guard inside effect
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-advance when timer reaches 0
          return step.duration;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [step?.id, step?.duration, step]);
  
  // Reset timer when step changes - must be called unconditionally
  useEffect(() => {
    if (!step) return; // Guard inside effect
    setTimeRemaining(step.duration);
  }, [step?.id, step?.duration, step]);
  
  // Early return after ALL hooks are called
  if (!step) return null;

  return (
    <div className="bg-gradient-to-r from-surface-elevated to-surface-card border border-border rounded-xl shadow-xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-surface">
        <div 
          className="h-full bg-gradient-to-r from-accent-purple to-accent-blue transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      
      {/* Header with step info */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge color="purple" size="xs">
              Step {progress.current}/{progress.total}
            </Badge>
            <span className="text-xs text-text-muted">
              {scenario.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-text-muted bg-surface px-2 py-1 rounded-full">
              <Timer className="w-3 h-3" />
              {timeRemaining}s
            </div>
            {/* v166: Save & Exit button */}
            <button
              onClick={onSaveAndExit}
              className="p-1.5 hover:bg-accent-amber/20 rounded-lg transition-colors group"
              title="Save progress and exit"
            >
              <Save className="w-4 h-4 text-text-muted group-hover:text-accent-amber" />
            </button>
            <button
              onClick={onStop}
              className="p-1.5 hover:bg-surface rounded-lg transition-colors"
              title="Exit without saving"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-text-primary">
          {step.title}
        </h3>
        <p className="text-sm text-text-secondary mt-1">
          {step.description}
        </p>
      </div>
      
      {/* Action indicator */}
      <div className="p-4 bg-surface/50">
        <div className="flex items-center gap-3">
          {step.action === 'navigate' && (
            <div className="flex items-center gap-2 text-sm text-accent-blue">
              <ArrowRight className="w-4 h-4" />
              <span>Navigating to <strong>{step.module}</strong> module</span>
            </div>
          )}
          {step.action === 'highlight' && (
            <div className="flex items-center gap-2 text-sm text-accent-amber">
              <Eye className="w-4 h-4" />
              <span>{step.highlightText}</span>
            </div>
          )}
          {step.action === 'trigger-event' && (
            <div className="flex items-center gap-2 text-sm text-accent-purple">
              <Zap className="w-4 h-4" />
              <span>Triggering cross-module cascade...</span>
            </div>
          )}
          {step.action === 'narrate' && (
            <div className="flex items-start gap-2 text-sm text-text-secondary">
              <Volume2 className={`w-4 h-4 mt-0.5 text-accent-green ${isNarrating ? 'animate-pulse' : ''}`} />
              <p className="italic">{step.narration}</p>
            </div>
          )}
        </div>
        
        {/* Tooltip content preview */}
        {step.tooltipContent && (
          <div className="mt-3 p-3 bg-surface-card border border-border rounded-lg">
            <p className="text-xs text-text-muted">{step.tooltipContent}</p>
          </div>
        )}
      </div>
      
      {/* Navigation controls */}
      <div className="p-3 border-t border-border/50 flex items-center justify-between">
        <button
          onClick={onPrevious}
          disabled={progress.current === 1}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        
        <div className="flex items-center gap-1">
          {scenario.steps.map((_, idx) => (
            <div
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx < progress.current - 1
                  ? 'bg-accent-purple'
                  : idx === progress.current - 1
                  ? 'bg-accent-purple animate-pulse'
                  : 'bg-surface-card'
              }`}
            />
          ))}
        </div>
        
        <button
          onClick={onNext}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-accent-purple text-white hover:bg-accent-purple/90 rounded-lg transition-colors"
        >
          {progress.current === progress.total ? 'Finish' : 'Next'}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN OVERLAY
// ============================================================================

export function GuidedScenarioOverlay() {
  const isActive = useIsScenarioActive();
  const scenario = useActiveScenario();
  const currentStep = useCurrentScenarioStep();
  // v204d-b7: Use individual selectors to prevent infinite loops
  const advanceStep = useGuidedScenarioStore(s => s.advanceStep);
  const previousStep = useGuidedScenarioStore(s => s.previousStep);
  const stopScenario = useGuidedScenarioStore(s => s.stopScenario);
  const saveSession = useGuidedScenarioStore(s => s.saveSession);
  const currentStepIndex = useGuidedScenarioStore(s => s.currentStepIndex);
  
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);
  const fireTrigger = useCascadeEngine(s => s.fireTrigger);
  
  // Handle step actions
  useEffect(() => {
    if (!currentStep || !isActive) return;
    
    // Navigate to module
    if (currentStep.action === 'navigate' && currentStep.module) {
      const route = MODULE_ROUTES[currentStep.module];
      if (route) {
        setActiveModule(route);
      }
    }
    
    // Trigger cross-module event
    if (currentStep.action === 'trigger-event' && currentStep.eventType && currentStep.eventPayload) {
      emitEvent(
        currentStep.eventType,
        currentStep.module as any,
        currentStep.eventPayload,
        { priority: 'high', automated: true, requiresReview: false }
      );

      // v0.57.0: For the GLP cascade demo step, also fire the cascade engine
      // so the R&D Connected chain appears on HomeScreen in real time
      if (currentStep.eventType === 'demo-glp-cascade') {
        const payload = currentStep.eventPayload as Record<string, any>;
        fireTrigger({
          type: 'glp-study-finalized',
          sourceModule: 'nonclinical',
          sourceId: payload?.studyId ?? 'GLP-2847-13WK',
          sourceLabel: payload?.studyName ?? '13-Week Rat Toxicology Study — LIG-2847',
          triggeredBy: 'demo-scenario',
          metadata: {
            compound: payload?.compound ?? 'LIG-2847 (Ligrastinib)',
            studyId: payload?.studyId ?? 'GLP-2847-13WK',
            keyFindings: payload?.keyFindings ?? [],
            severity: payload?.severity ?? 'moderate',
            demoScenario: 'full-regulatory-cascade',
          },
        });
      }
    }
  }, [currentStep, isActive, setActiveModule, emitEvent, fireTrigger]);
  
  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopScenario();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        advanceStep();
      } else if (e.key === 'ArrowLeft') {
        previousStep();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        // v166: Ctrl/Cmd+S to save and exit
        e.preventDefault();
        saveSession();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, advanceStep, previousStep, stopScenario, saveSession]);
  
  if (!isActive || !scenario || !currentStep) return null;
  
  return (
    <>
      {/* Semi-transparent overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 pointer-events-none" />
      
      {/* Bottom panel with step display */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
        <StepDisplay
          step={currentStep}
          scenario={scenario}
          onNext={advanceStep}
          onPrevious={previousStep}
          onStop={stopScenario}
          onSaveAndExit={saveSession}
        />
      </div>
      
      {/* Spotlight effect for highlighted elements */}
      {currentStep.spotlightElement && (
        <div 
          className="fixed inset-0 z-45 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at var(--spotlight-x, 50%) var(--spotlight-y, 50%), transparent 100px, rgba(0,0,0,0.5) 200px)',
          }}
        />
      )}
    </>
  );
}

// ============================================================================
// SAVED SESSION BANNER
// v166: Shows in header when there's a saved session to resume
// ============================================================================

export function SavedSessionBanner() {
  const savedSession = useSavedSession();
  // v204d-b7: Use individual selectors to prevent infinite loops
  const resumeSavedSession = useGuidedScenarioStore(s => s.resumeSavedSession);
  const clearSavedSession = useGuidedScenarioStore(s => s.clearSavedSession);
  const isActive = useIsScenarioActive();
  
  if (!savedSession || isActive) return null;
  
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
      <History className="w-4 h-4 text-accent-amber" />
      <span className="text-sm text-text-secondary">
        <strong className="text-text-primary">{savedSession.scenario.name}</strong>
        {' '}— {savedSession.progressPercentage}% complete
      </span>
      <button
        onClick={resumeSavedSession}
        className="flex items-center gap-1 px-2 py-0.5 bg-accent-amber text-white text-xs font-medium rounded hover:bg-accent-amber/90 transition-colors"
      >
        <Play className="w-3 h-3" />
        Resume
      </button>
      <button
        onClick={clearSavedSession}
        className="p-0.5 hover:bg-surface-card rounded transition-colors"
        title="Discard saved session"
      >
        <X className="w-3.5 h-3.5 text-text-muted" />
      </button>
    </div>
  );
}

// ============================================================================
// SCENARIO LAUNCHER BUTTON
// ============================================================================

interface ScenarioLauncherProps {
  className?: string;
}

export function ScenarioLauncher({ className = '' }: ScenarioLauncherProps) {
  const [showSelector, setShowSelector] = useState(false);
  // v204d-b7: Use individual selector to prevent infinite loops
  const startScenario = useGuidedScenarioStore(s => s.startScenario);
  const isActive = useIsScenarioActive();
  
  const handleSelectScenario = (scenarioId: ScenarioId) => {
    setShowSelector(false);
    startScenario(scenarioId);
  };
  
  if (isActive) return null;
  
  return (
    <>
      <button
        onClick={() => setShowSelector(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-accent-purple/10 hover:bg-accent-purple/20 border border-accent-purple/30 hover:border-accent-purple/50 rounded-lg transition-all group ${className}`}
      >
        <Target className="w-4 h-4 text-accent-purple" />
        <span className="text-sm font-medium text-accent-purple">Guided Scenarios</span>
      </button>
      
      {showSelector && (
        <ScenarioSelector
          onSelect={handleSelectScenario}
          onClose={() => setShowSelector(false)}
        />
      )}
    </>
  );
}

export default GuidedScenarioOverlay;
