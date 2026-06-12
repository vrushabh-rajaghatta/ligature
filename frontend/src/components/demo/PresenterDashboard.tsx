

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Play, Pause, SkipForward, RotateCcw, Download, Settings,
  Users, Clock, Zap, Target, BarChart3, AlertTriangle,
  CheckCircle, XCircle, Eye, Volume2, VolumeX, Maximize2,
  ChevronDown, ChevronUp, Sparkles, Activity, FileText,
  Shield, Timer, TrendingUp, Mic, MicOff, Monitor
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  useGuidedScenarioStore,
  useActiveScenario,
  useCurrentScenarioStep,
  useScenarioProgress,
  GUIDED_SCENARIOS,
  ScenarioId,
} from '@/store/useGuidedScenarioStore';
import {
  useDemoAnalyticsStore,
  useDemoSessions,
  useCurrentDemoSession,
  useDemoEngagementSummary,
  useAIGenerationStats,
  DEMO_PATHS,
} from '@/store/useDemoAnalyticsStore';
import { runPreflightChecks, PreflightResult } from './DemoPreflightCheck';
import { assessDemoHealth, DemoHealthStatus } from './DemoFallbackData';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';

// ============================================================================
// PRESENTER DASHBOARD - v0.15.35
// Unified dashboard for investor demo presenters
// Real-time metrics, scenario control, and session management
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

interface PresenterMode {
  narrationEnabled: boolean;
  autoAdvance: boolean;
  autoAdvanceDelay: number; // seconds
  showTooltips: boolean;
  fullscreenReady: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Play;
  action: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatMs(ms: number): string {
  return formatDuration(Math.floor(ms / 1000));
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: typeof Clock;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'blue' | 'purple' | 'green' | 'amber' | 'red';
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ icon: Icon, label, value, subValue, color, trend }: StatCardProps) {
  const colorStyles = {
    blue: 'bg-blue-500/20 text-blue-400',
    purple: 'bg-purple-500/20 text-purple-400',
    green: 'bg-green-500/20 text-green-400',
    amber: 'bg-amber-500/20 text-amber-400',
    red: 'bg-red-500/20 text-red-400',
  };

  return (
    <div className="bg-surface p-3 rounded-lg border border-border">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-md ${colorStyles[color]}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs text-text-muted">{label}</span>
        {trend && (
          <TrendingUp className={`w-3 h-3 ml-auto ${
            trend === 'up' ? 'text-green-400' : 
            trend === 'down' ? 'text-red-400 rotate-180' : 
            'text-gray-400'
          }`} />
        )}
      </div>
      <div className="text-lg font-semibold text-text-primary">{value}</div>
      {subValue && <div className="text-xs text-text-muted mt-0.5">{subValue}</div>}
    </div>
  );
}

// ============================================================================
// SCENARIO CONTROL PANEL
// ============================================================================

interface ScenarioControlProps {
  onLaunchScenario: (id: ScenarioId) => void;
}

function ScenarioControlPanel({ onLaunchScenario }: ScenarioControlProps) {
  const activeScenario = useActiveScenario();
  const currentStep = useCurrentScenarioStep();
  const progress = useScenarioProgress();
  const isPlaying = useGuidedScenarioStore(s => s.isPlaying);
  const isPaused = useGuidedScenarioStore(s => s.isPaused);
  
  const pauseScenario = useGuidedScenarioStore(s => s.pauseScenario);
  const resumeScenario = useGuidedScenarioStore(s => s.resumeScenario);
  const advanceStep = useGuidedScenarioStore(s => s.advanceStep);
  const previousStep = useGuidedScenarioStore(s => s.previousStep);
  const stopScenario = useGuidedScenarioStore(s => s.stopScenario);

  if (!activeScenario) {
    const scenarios = Object.values(GUIDED_SCENARIOS);
    const flagship = scenarios.find(s => s.id === 'full-regulatory-cascade');
    const others = scenarios.filter(s => s.id !== 'full-regulatory-cascade');
    return (
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-accent-purple" />
          Launch Scenario
        </h3>
        <div className="space-y-2">
          {/* v0.57.0: Flagship scenario first with highlighted treatment */}
          {flagship && (
            <button
              key={flagship.id}
              onClick={() => onLaunchScenario(flagship.id)}
              className="w-full text-left p-3 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 hover:from-violet-500/20 hover:to-indigo-500/20 rounded-lg border border-violet-500/30 transition-colors"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-text-primary text-sm">{flagship.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-wide">Flagship</span>
              </div>
              <div className="text-xs text-text-muted">
                {formatDuration(flagship.duration)} · {flagship.steps.length} steps · 7 modules · Live cascade
              </div>
              <div className="text-xs text-violet-400 mt-1">{flagship.valueProposition}</div>
            </button>
          )}
          {others.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => onLaunchScenario(scenario.id)}
              className="w-full text-left p-3 bg-surface-elevated hover:bg-surface-hover rounded-lg border border-border transition-colors"
            >
              <div className="font-medium text-text-primary text-sm">{scenario.name}</div>
              <div className="text-xs text-text-muted mt-0.5">
                {formatDuration(scenario.duration)} · {scenario.steps.length} steps
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <Activity className="w-4 h-4 text-green-400" />
          {activeScenario.name}
        </h3>
        <Badge color="green">{progress.percentage}%</Badge>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-surface-elevated rounded-full mb-3 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-accent-purple to-accent-blue rounded-full transition-all duration-300"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Current step */}
      {currentStep && (
        <div className="bg-surface-elevated rounded-lg p-3 mb-3">
          <div className="text-xs text-text-muted mb-1">
            Step {progress.current} of {progress.total}
          </div>
          <div className="font-medium text-text-primary text-sm">{currentStep.title}</div>
          <div className="text-xs text-text-muted mt-1">{currentStep.description}</div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={previousStep}
          disabled={progress.current <= 1}
          className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous step"
        >
          <RotateCcw className="w-4 h-4 text-text-secondary" />
        </button>

        <button
          onClick={isPlaying && !isPaused ? pauseScenario : resumeScenario}
          className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-accent-blue hover:bg-accent-blue/80 text-white transition-colors"
        >
          {isPlaying && !isPaused ? (
            <>
              <Pause className="w-4 h-4" />
              <span className="text-sm font-medium">Pause</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span className="text-sm font-medium">Resume</span>
            </>
          )}
        </button>

        <button
          onClick={advanceStep}
          disabled={progress.current >= progress.total}
          className="p-2 rounded-lg bg-surface-elevated hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next step"
        >
          <SkipForward className="w-4 h-4 text-text-secondary" />
        </button>

        <button
          onClick={stopScenario}
          className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
          title="Stop scenario"
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// SESSION METRICS PANEL
// ============================================================================

function SessionMetricsPanel() {
  const currentSession = useCurrentDemoSession();
  const summary = useDemoEngagementSummary();
  const aiStats = useAIGenerationStats();
  const totalSessions = useDemoAnalyticsStore(s => s.totalSessions);
  const totalDemoTime = useDemoAnalyticsStore(s => s.totalDemoTimeMs);

  const totalAI = Object.values(aiStats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-accent-purple" />
        Session Metrics
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Users}
          label="Total Sessions"
          value={totalSessions}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Total Time"
          value={formatMs(totalDemoTime)}
          color="purple"
        />
        <StatCard
          icon={Sparkles}
          label="AI Generations"
          value={totalAI}
          subValue={`${aiStats.haqResponses} HAQ, ${aiStats.safetyNarratives} Safety`}
          color="green"
        />
        <StatCard
          icon={Eye}
          label="Top Module"
          value={summary.topModules[0]?.name || 'N/A'}
          subValue={summary.topModules[0] ? `${summary.topModules[0].views} views` : undefined}
          color="amber"
        />
      </div>

      {currentSession && (
        <div className="bg-surface-elevated rounded-lg p-3 border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-medium text-green-400">Live Session</span>
          </div>
          <div className="text-sm text-text-primary">
            {currentSession.audienceName || currentSession.audienceType}
          </div>
          <div className="text-xs text-text-muted mt-1">
            {currentSession.completedSteps.length} steps completed • 
            {currentSession.highlightMoments.length} highlights
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PREFLIGHT STATUS PANEL
// ============================================================================

interface PreflightStatusProps {
  scenarioId: ScenarioId | null;
}

function PreflightStatusPanel({ scenarioId }: PreflightStatusProps) {
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runChecks = useCallback(async () => {
    if (!scenarioId) return;
    setIsChecking(true);
    const checkResult = await runPreflightChecks(scenarioId);
    setResult(checkResult);
    setIsChecking(false);
  }, [scenarioId]);

  useEffect(() => {
    if (scenarioId) {
      runChecks();
    }
  }, [scenarioId, runChecks]);

  if (!scenarioId) {
    return (
      <div className="bg-surface rounded-lg border border-border p-4">
        <h3 className="text-sm font-medium text-text-muted flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Select a scenario to run preflight checks
        </h3>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
          <Shield className="w-4 h-4 text-accent-blue" />
          Preflight Status
        </h3>
        {result && (
          <Badge
            color={
              result.overallStatus === 'ready' ? 'green' :
              result.overallStatus === 'warnings' ? 'amber' : 'red'
            }
          >
            {result.overallStatus}
          </Badge>
        )}
      </div>

      {isChecking ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          Running checks...
        </div>
      ) : result ? (
        <div className="space-y-2">
          {result.checks.map((check) => (
            <div key={check.id} className="flex items-center gap-2 text-sm">
              {check.status === 'passed' ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : check.status === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              ) : (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              <span className="text-text-secondary">{check.name}</span>
            </div>
          ))}
          <button
            onClick={runChecks}
            className="w-full mt-2 text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Re-run checks
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ============================================================================
// PRESENTER MODE CONTROLS
// ============================================================================

interface PresenterModeControlsProps {
  mode: PresenterMode;
  onModeChange: (mode: Partial<PresenterMode>) => void;
}

function PresenterModeControls({ mode, onModeChange }: PresenterModeControlsProps) {
  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-3">
        <Settings className="w-4 h-4 text-text-muted" />
        Presenter Mode
      </h3>

      <div className="space-y-3">
        {/* Narration toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode.narrationEnabled ? (
              <Volume2 className="w-4 h-4 text-green-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-text-muted" />
            )}
            <span className="text-sm text-text-secondary">Narration</span>
          </div>
          <button
            onClick={() => onModeChange({ narrationEnabled: !mode.narrationEnabled })}
            className={`w-10 h-5 rounded-full transition-colors ${
              mode.narrationEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              mode.narrationEnabled ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Auto-advance toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-secondary">Auto-advance</span>
          </div>
          <button
            onClick={() => onModeChange({ autoAdvance: !mode.autoAdvance })}
            className={`w-10 h-5 rounded-full transition-colors ${
              mode.autoAdvance ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              mode.autoAdvance ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Tooltips toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-secondary">Show Tooltips</span>
          </div>
          <button
            onClick={() => onModeChange({ showTooltips: !mode.showTooltips })}
            className={`w-10 h-5 rounded-full transition-colors ${
              mode.showTooltips ? 'bg-green-500' : 'bg-gray-600'
            }`}
          >
            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
              mode.showTooltips ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {/* Fullscreen button */}
        <button
          onClick={() => {
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              document.documentElement.requestFullscreen();
            }
          }}
          className="w-full flex items-center justify-center gap-2 p-2 bg-surface-elevated hover:bg-surface-hover rounded-lg text-sm text-text-secondary transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
          Toggle Fullscreen
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// EXPORT SESSION PANEL
// ============================================================================

function ExportSessionPanel() {
  const sessions = useDemoSessions();
  const exportAnalytics = useDemoAnalyticsStore(s => s.exportAnalytics);
  const exportSessionMarkdown = useDemoAnalyticsStore(s => s.exportSessionMarkdown);

  const handleExportAll = () => {
    const json = exportAnalytics();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ligature-demo-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportSession = (sessionId: string) => {
    const markdown = exportSessionMarkdown(sessionId);
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `demo-session-${sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <h3 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-3">
        <Download className="w-4 h-4 text-text-muted" />
        Export Sessions
      </h3>

      <div className="space-y-2">
        <button
          onClick={handleExportAll}
          className="w-full flex items-center justify-center gap-2 p-2 bg-accent-purple hover:bg-accent-purple/80 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Export All Analytics (JSON)
        </button>

        {sessions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-xs text-text-muted mb-2">Recent Sessions</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {sessions.slice(0, 5).map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleExportSession(session.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-surface-elevated rounded text-sm transition-colors"
                >
                  <span className="text-text-secondary truncate">
                    {session.audienceName || session.audienceType}
                  </span>
                  <FileText className="w-3 h-3 text-text-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PRESENTER DASHBOARD
// ============================================================================

interface PresenterDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
}

export function PresenterDashboard({ isOpen, onClose, position = 'right' }: PresenterDashboardProps) {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId | null>(null);
  const [presenterMode, setPresenterMode] = useState<PresenterMode>({
    narrationEnabled: true,
    autoAdvance: false,
    autoAdvanceDelay: 8,
    showTooltips: true,
    fullscreenReady: false,
  });
  const [demoResetConfirm, setDemoResetConfirm] = useState(false);

  const clearAllChains = useCascadeEngine(s => s.clearAllChains);
  const clearEvents = useCrossModuleEventStore(s => s.clearEvents);

  const handleDemoReset = useCallback(() => {
    clearAllChains();
    if (typeof clearEvents === 'function') clearEvents();
    setSelectedScenario(null);
    setDemoResetConfirm(false);
  }, [clearAllChains, clearEvents]);

  const activeScenario = useActiveScenario();
  const startScenario = useGuidedScenarioStore(s => s.startScenario);

  const handleLaunchScenario = useCallback((id: ScenarioId) => {
    setSelectedScenario(id);
    startScenario(id);
  }, [startScenario]);

  const handleModeChange = useCallback((changes: Partial<PresenterMode>) => {
    setPresenterMode(prev => ({ ...prev, ...changes }));
  }, []);

  // Update selected scenario when active changes
  useEffect(() => {
    if (activeScenario) {
      setSelectedScenario(activeScenario.id);
    }
  }, [activeScenario]);

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed top-0 ${position === 'right' ? 'right-0' : 'left-0'} h-full w-80 bg-surface-elevated border-l border-border shadow-2xl z-50 overflow-hidden flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-accent-purple/10 to-accent-blue/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-purple/20 rounded-lg">
              <Monitor className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Presenter Dashboard</h2>
              <p className="text-xs text-text-muted">Demo control center</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* v0.58.0: Demo Reset */}
        {!demoResetConfirm ? (
          <button
            onClick={() => setDemoResetConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-card hover:text-text-primary transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Demo State
          </button>
        ) : (
          <div className="p-3 bg-accent-amber/5 border border-accent-amber/30 rounded-lg space-y-2">
            <p className="text-xs text-text-secondary">Clear all cascade chains and cross-module events? This resets the demo to baseline.</p>
            <div className="flex gap-2">
              <button onClick={handleDemoReset} className="flex-1 text-xs px-3 py-1.5 bg-accent-amber text-white rounded-lg hover:bg-accent-amber/90 font-medium">
                Confirm Reset
              </button>
              <button onClick={() => setDemoResetConfirm(false)} className="flex-1 text-xs px-3 py-1.5 border border-border rounded-lg text-text-secondary hover:bg-surface-card">
                Cancel
              </button>
            </div>
          </div>
        )}
        <ScenarioControlPanel onLaunchScenario={handleLaunchScenario} />
        <PreflightStatusPanel scenarioId={selectedScenario} />
        <SessionMetricsPanel />
        <PresenterModeControls mode={presenterMode} onModeChange={handleModeChange} />
        <ExportSessionPanel />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-surface">
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>Ligature Demo System</span>
          <span>v0.15.35</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PRESENTER DASHBOARD TOGGLE BUTTON
// ============================================================================

interface PresenterDashboardToggleProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function PresenterDashboardToggle({ isOpen, onToggle }: PresenterDashboardToggleProps) {
  const activeScenario = useActiveScenario();
  const progress = useScenarioProgress();

  return (
    <button
      onClick={onToggle}
      className={`fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
        isOpen 
          ? 'bg-surface-elevated text-text-secondary' 
          : 'bg-accent-purple text-white hover:bg-accent-purple/90'
      }`}
    >
      <Monitor className="w-4 h-4" />
      <span className="text-sm font-medium">Presenter</span>
      {activeScenario && !isOpen && (
        <Badge color="green" className="ml-1">{progress.percentage}%</Badge>
      )}
    </button>
  );
}

// ============================================================================
// COMPACT PRESENTER BAR (for minimal footprint during demos)
// ============================================================================

export function CompactPresenterBar() {
  const activeScenario = useActiveScenario();
  const currentStep = useCurrentScenarioStep();
  const progress = useScenarioProgress();
  const isPlaying = useGuidedScenarioStore(s => s.isPlaying);
  const isPaused = useGuidedScenarioStore(s => s.isPaused);

  const pauseScenario = useGuidedScenarioStore(s => s.pauseScenario);
  const resumeScenario = useGuidedScenarioStore(s => s.resumeScenario);
  const advanceStep = useGuidedScenarioStore(s => s.advanceStep);

  if (!activeScenario) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface-elevated/95 backdrop-blur-sm border-t border-border p-2">
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {/* Progress */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-purple rounded-full transition-all"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span className="text-xs text-text-muted whitespace-nowrap">
            {progress.current}/{progress.total}
          </span>
        </div>

        {/* Current step */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-text-primary truncate">
            {currentStep?.title}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={isPlaying && !isPaused ? pauseScenario : resumeScenario}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            {isPlaying && !isPaused ? (
              <Pause className="w-4 h-4 text-text-secondary" />
            ) : (
              <Play className="w-4 h-4 text-green-400" />
            )}
          </button>
          <button
            onClick={advanceStep}
            className="p-2 rounded-lg hover:bg-surface transition-colors"
          >
            <SkipForward className="w-4 h-4 text-text-secondary" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PresenterDashboard;
