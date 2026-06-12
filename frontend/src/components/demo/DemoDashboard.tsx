



/**
 * Demo Dashboard - v0.27.64
 * 
 * Comprehensive investor demo visualization that integrates:
 * - Safety signal cascade execution
 * - Real-time toast notifications
 * - Presenter narration scripts
 * - Cross-module data flow visualization
 * 
 * The "wow" moment: "47 actions in seconds vs 6 weeks"
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, RotateCcw, ChevronRight, Clock, Zap, AlertTriangle,
  Shield, FileText, MessageSquare, FolderOpen, Send, Package,
  CheckCircle2, Timer, Users, TrendingUp, Sparkles, ArrowRight,
  Workflow, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { 
  PRIMARY_DEMO_SCENARIO, 
  ENHANCED_STEP_NARRATION,
  DEMO_HAQ_QUESTIONS,
} from '@/data/demo-scenario-data';
import { setDemoTiming, getDemoTiming } from '@/lib/pipeline-execution';

// =============================================================================
// TYPES
// =============================================================================

type DemoPhase = 
  | 'ready'           // Before demo starts
  | 'signal-detected' // Safety signal shown
  | 'cascade-running' // Actions cascading
  | 'cascade-complete' // All actions done
  | 'deep-dive';       // Exploring modules

interface CascadeAction {
  id: string;
  sequence: number;
  module: string;
  action: string;
  status: 'pending' | 'running' | 'completed';
  automated: boolean;
  startedAt?: number;
  completedAt?: number;
}

// =============================================================================
// MODULE ICONS
// =============================================================================

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Safety': Shield,
  'Labeling': Package,
  'HAQ Intelligence': MessageSquare,
  'Authoring': FileText,
  'TMF': FolderOpen,
  'Submissions Hub': Send,
};

const MODULE_COLORS: Record<string, string> = {
  'Safety': 'text-red-400 bg-red-500/20',
  'Labeling': 'text-teal-400 bg-teal-500/20',
  'HAQ Intelligence': 'text-amber-400 bg-amber-500/20',
  'Authoring': 'text-indigo-400 bg-indigo-500/20',
  'TMF': 'text-violet-400 bg-violet-500/20',
  'Submissions Hub': 'text-green-400 bg-green-500/20',
};

// =============================================================================
// DEMO DASHBOARD COMPONENT
// =============================================================================

interface DemoDashboardProps {
  compact?: boolean;
  showNarration?: boolean;
}

export function DemoDashboard({ compact = false, showNarration = true }: DemoDashboardProps) {
  const toast = useToast();
  const scenario = PRIMARY_DEMO_SCENARIO;
  const narration = ENHANCED_STEP_NARRATION;
  
  // Demo state
  const [phase, setPhase] = useState<DemoPhase>('ready');
  const [currentNarration, setCurrentNarration] = useState<keyof typeof narration>('portfolioOpening');
  const [cascadeActions, setCascadeActions] = useState<CascadeAction[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Initialize cascade actions from scenario
  const initializeCascadeActions = useCallback(() => {
    const actions: CascadeAction[] = scenario.cascadeHighlights.spotlightActions.map((a, idx) => ({
      id: `action-${idx}`,
      sequence: a.sequence,
      module: a.module,
      action: a.action,
      status: 'pending',
      automated: a.automated,
    }));
    setCascadeActions(actions);
  }, [scenario]);
  
  // Reset demo
  const resetDemo = useCallback(() => {
    setPhase('ready');
    setCurrentNarration('portfolioOpening');
    setElapsedTime(0);
    setIsPaused(false);
    initializeCascadeActions();
  }, [initializeCascadeActions]);
  
  // Initialize on mount
  useEffect(() => {
    initializeCascadeActions();
    setDemoTiming('demo'); // Ensure demo timing is active
  }, [initializeCascadeActions]);
  
  // Start cascade execution
  const startCascade = useCallback(() => {
    setPhase('cascade-running');
    setCurrentNarration('cascadeTrigger');
    
    // Run through cascade actions with timing
    let actionIndex = 0;
    const runNextAction = () => {
      if (actionIndex >= cascadeActions.length) {
        // All actions complete
        setTimeout(() => {
          setPhase('cascade-complete');
          setCurrentNarration('closing');
          toast.success('Cascade complete! 47 actions in seconds.', {
            duration: 6000,
          });
        }, 500);
        return;
      }
      
      const action = cascadeActions[actionIndex];
      
      // Mark as running
      setCascadeActions(prev => prev.map((a, idx) => 
        idx === actionIndex ? { ...a, status: 'running', startedAt: Date.now() } : a
      ));
      
      // Emit toast
      const moduleKey = action.module as keyof typeof MODULE_ICONS;
      const toastModule = action.module.toLowerCase().includes('safety') ? 'safety' :
                          action.module.toLowerCase().includes('haq') ? 'haq' :
                          action.module.toLowerCase().includes('tmf') ? 'tmf' :
                          action.module.toLowerCase().includes('authoring') ? 'authoring' :
                          action.module.toLowerCase().includes('submission') ? 'submissions' :
                          action.module.toLowerCase().includes('label') ? 'labeling' : 'system';
      
      toast.crossModule(
        action.action,
        toastModule,
        'pipeline'
      );
      
      // Complete after delay
      const delay = getDemoTiming().baseStepDelay;
      setTimeout(() => {
        setCascadeActions(prev => prev.map((a, idx) => 
          idx === actionIndex ? { ...a, status: 'completed', completedAt: Date.now() } : a
        ));
        
        actionIndex++;
        runNextAction();
      }, delay);
    };
    
    runNextAction();
  }, [cascadeActions, toast]);
  
  // Elapsed time counter
  useEffect(() => {
    if (phase === 'cascade-running' && !isPaused) {
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 100);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, isPaused]);
  
  // Current narration content
  const currentNarrationContent = narration[currentNarration];
  
  // Stats
  const completedActions = cascadeActions.filter(a => a.status === 'completed').length;
  const totalActions = scenario.cascadeHighlights.totalActions;
  const progress = (completedActions / cascadeActions.length) * 100;
  
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-surface rounded-xl border border-border`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-purple/20 rounded-lg">
            <Workflow className="w-6 h-6 text-accent-purple" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Investor Demo Dashboard</h2>
            <p className="text-sm text-text-muted">
              {scenario.tagline}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {phase === 'ready' && (
            <Button 
              onClick={() => {
                setPhase('signal-detected');
                setCurrentNarration('safetySignalDetection');
              }}
              className="bg-accent-green text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Demo
            </Button>
          )}
          
          {phase === 'signal-detected' && (
            <Button 
              onClick={startCascade}
              className="bg-accent-red text-white animate-pulse"
            >
              <Zap className="w-4 h-4 mr-2" />
              Initiate Cascade Analysis
            </Button>
          )}
          
          {phase !== 'ready' && (
            <Button variant="secondary" onClick={resetDemo}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}
        </div>
      </div>
      
      {/* Key Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Time Elapsed"
          value={`${(elapsedTime / 1000).toFixed(1)}s`}
          icon={Timer}
          highlight={phase === 'cascade-running'}
        />
        <StatCard
          label="Actions Triggered"
          value={`${completedActions}/${totalActions}`}
          icon={Zap}
          subtext={phase === 'cascade-complete' ? 'vs 6 weeks legacy' : undefined}
        />
        <StatCard
          label="Modules Impacted"
          value={scenario.cascadeHighlights.modulesImpacted.toString()}
          icon={Activity}
        />
        <StatCard
          label="Documents Updated"
          value={scenario.cascadeHighlights.documentsUpdated.toString()}
          icon={FileText}
        />
      </div>
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left: Cascade Visualization */}
        <Card variant="elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-text-primary flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Safety Signal Cascade
              </h3>
              {phase !== 'ready' && (
                <Badge className={`${
                  phase === 'cascade-running' ? 'bg-blue-500/20 text-blue-400 animate-pulse' :
                  phase === 'cascade-complete' ? 'bg-green-500/20 text-green-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {phase === 'cascade-running' ? 'EXECUTING' :
                   phase === 'cascade-complete' ? 'COMPLETE' : 'DETECTED'}
                </Badge>
              )}
            </div>
            
            {/* Progress bar */}
            {phase !== 'ready' && (
              <div className="mt-3">
                <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      phase === 'cascade-complete' ? 'bg-accent-green' : 'bg-accent-blue'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-muted mt-1">
                  <span>{completedActions} actions completed</span>
                  <span>{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </CardHeader>
          
          <CardContent className="pt-0">
            {/* Signal Info */}
            {phase !== 'ready' && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-red-400">
                      {scenario.emergingSignal.name}
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {scenario.emergingSignal.caseCount} cases • 
                      {scenario.emergingSignal.incidenceRate} incidence • 
                      PRR {scenario.emergingSignal.prrValue}
                    </div>
                    <div className="text-xs text-accent-green mt-1">
                      Detected {scenario.emergingSignal.timeSaved} earlier than legacy systems
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Cascade Actions */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {cascadeActions.map((action) => {
                const ModuleIcon = MODULE_ICONS[action.module] || Workflow;
                const colorClasses = MODULE_COLORS[action.module] || 'text-slate-400 bg-slate-500/20';
                
                return (
                  <div 
                    key={action.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-all duration-300 ${
                      action.status === 'completed' ? 'bg-green-500/10 border-green-500/30' :
                      action.status === 'running' ? 'bg-blue-500/10 border-blue-500/30 animate-pulse' :
                      'bg-surface-card border-border opacity-50'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${colorClasses.split(' ')[1]}`}>
                      <ModuleIcon className={`w-4 h-4 ${colorClasses.split(' ')[0]}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-text-primary truncate">
                        {action.module}
                      </div>
                      <div className="text-xs text-text-muted truncate">
                        {action.action}
                      </div>
                    </div>
                    
                    {action.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    )}
                    {action.status === 'running' && (
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Right: Narration + Context */}
        <div className="space-y-4">
          {/* Narration Card */}
          {showNarration && (
            <Card variant="elevated" className="bg-gradient-to-br from-accent-purple/5 to-accent-blue/5">
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  Presenter Script
                </h3>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-text-secondary leading-relaxed">
                  {currentNarrationContent.script}
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock className="w-3.5 h-3.5" />
                    ~{currentNarrationContent.duration}s
                  </div>
                  <Badge className="bg-accent-purple/20 text-accent-purple border-0">
                    {currentNarrationContent.keyMetric}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Anticipated HAQs Preview */}
          {(phase === 'cascade-complete' || phase === 'deep-dive') && (
            <Card>
              <CardHeader className="pb-2">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-400" />
                  Anticipated FDA Questions
                </h3>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {DEMO_HAQ_QUESTIONS.slice(0, 2).map((haq) => (
                    <div key={haq.id} className="p-2 bg-surface-card rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">
                          {haq.questionNumber}
                        </Badge>
                        <span className="text-xs text-accent-green flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {haq.aiPredictedSimilarity}% similar to historical
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">
                        {haq.questionText.slice(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Competitive Context */}
          <Card className="bg-surface-card">
            <CardHeader className="pb-2">
              <h3 className="text-sm font-semibold text-text-primary">Competitive Differentiation</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold text-red-400">9%</div>
                  <div className="text-xs text-text-muted">Sotorasib</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-400">7%</div>
                  <div className="text-xs text-text-muted">Adagrasib</div>
                </div>
                <div className="bg-green-500/10 rounded-lg p-1">
                  <div className="text-lg font-bold text-green-400">2.7%</div>
                  <div className="text-xs text-green-400">Nexavant ✓</div>
                </div>
              </div>
              <div className="text-xs text-text-muted text-center mt-2">
                Grade 3+ Hepatotoxicity Incidence
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Bottom: Key Message */}
      {phase === 'cascade-complete' && (
        <div className="mt-6 p-4 bg-gradient-to-r from-accent-green/10 to-accent-blue/10 border border-accent-green/30 rounded-lg">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-green">{(elapsedTime / 1000).toFixed(1)}s</div>
              <div className="text-sm text-text-muted">Ligature</div>
            </div>
            <div className="text-2xl text-text-muted">vs</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-text-muted">4-6 weeks</div>
              <div className="text-sm text-text-muted">Legacy Systems</div>
            </div>
          </div>
          <div className="text-center mt-3 text-sm text-text-secondary">
            {totalActions} actions • {scenario.cascadeHighlights.modulesImpacted} modules • Zero spreadsheets • Zero coordination meetings
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// STAT CARD COMPONENT
// =============================================================================

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  highlight?: boolean;
  subtext?: string;
}

function StatCard({ label, value, icon: Icon, highlight, subtext }: StatCardProps) {
  return (
    <div className={`p-3 rounded-lg border ${
      highlight ? 'bg-accent-blue/10 border-accent-blue/30' : 'bg-surface-card border-border'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${highlight ? 'text-accent-blue' : 'text-text-muted'}`} />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      <div className={`text-xl font-bold ${highlight ? 'text-accent-blue' : 'text-text-primary'}`}>
        {value}
      </div>
      {subtext && (
        <div className="text-xs text-accent-green mt-1">{subtext}</div>
      )}
    </div>
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DemoDashboard;
