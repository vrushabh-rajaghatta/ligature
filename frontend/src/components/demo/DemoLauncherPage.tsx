

import { useState, useCallback, useEffect } from 'react';
import {
  Play, Users, Clock, Target, Zap, ChevronRight,
  Sparkles, Shield, BarChart3, Settings, CheckCircle,
  AlertTriangle, Monitor, Presentation, Rocket, Star,
  ArrowRight, Calendar, TrendingUp, Eye, FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  useGuidedScenarioStore,
  GUIDED_SCENARIOS,
  ScenarioId,
  GuidedScenario,
} from '@/store/useGuidedScenarioStore';
import {
  useDemoAnalyticsStore,
  useDemoSessions,
  DEMO_PATHS,
  DemoPathConfig,
} from '@/store/useDemoAnalyticsStore';
import { runPreflightChecks, PreflightResult } from './DemoPreflightCheck';
import { APP_VERSION } from '@/config/version';

// ============================================================================
// DEMO LAUNCHER PAGE - v0.16.0
// Dedicated page for launching investor demos
// One-click scenario launch with preflight validation
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

type LauncherTab = 'scenarios' | 'paths' | 'recent';

interface ScenarioCardProps {
  scenario: GuidedScenario;
  onLaunch: () => void;
  preflightStatus?: 'ready' | 'warnings' | 'checking';
}

interface PathCardProps {
  path: DemoPathConfig;
  onSelect: () => void;
  isSelected: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ============================================================================
// SCENARIO CARD
// ============================================================================

function ScenarioCard({ scenario, onLaunch, preflightStatus }: ScenarioCardProps) {
  const audienceColors = {
    investor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    customer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    internal: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden hover:border-accent-purple/50 transition-all group">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-text-primary group-hover:text-accent-purple transition-colors">
            {scenario.name}
          </h3>
          <Badge color={scenario.targetAudience === 'investor' ? 'purple' : 'blue'}>
            {scenario.targetAudience}
          </Badge>
        </div>
        <p className="text-sm text-text-muted line-clamp-2">
          {scenario.description}
        </p>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-surface-elevated/50 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDuration(scenario.duration)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-muted">
          <Target className="w-3.5 h-3.5" />
          <span>{scenario.steps.length} steps</span>
        </div>
        {preflightStatus && (
          <div className="flex items-center gap-1.5 ml-auto">
            {preflightStatus === 'checking' ? (
              <div className="w-3.5 h-3.5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            ) : preflightStatus === 'ready' ? (
              <CheckCircle className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
        )}
      </div>

      {/* Value Proposition */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
          <Sparkles className="w-3 h-3 text-accent-purple" />
          <span>Value Proposition</span>
        </div>
        <p className="text-sm text-text-secondary">{scenario.valueProposition}</p>
      </div>

      {/* Tags */}
      <div className="px-4 py-3 border-t border-border flex flex-wrap gap-1.5">
        {scenario.tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-surface-elevated rounded text-xs text-text-muted"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Launch Button */}
      <div className="p-4 border-t border-border">
        <button
          onClick={onLaunch}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-purple hover:bg-accent-purple/90 text-white rounded-lg font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Launch Demo
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// PATH CARD
// ============================================================================

function PathCard({ path, onSelect, isSelected }: PathCardProps) {
  const audienceIcons = {
    investor: TrendingUp,
    technical: Settings,
    regulatory: FileText,
    executive: Star,
    general: Users,
  };

  const Icon = audienceIcons[path.audienceType] || Users;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'bg-accent-purple/10 border-accent-purple'
          : 'bg-surface border-border hover:border-accent-purple/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-accent-purple/20' : 'bg-surface-elevated'}`}>
          <Icon className={`w-5 h-5 ${isSelected ? 'text-accent-purple' : 'text-text-muted'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-text-primary">{path.name}</h4>
            {isSelected && <CheckCircle className="w-4 h-4 text-accent-purple" />}
          </div>
          <p className="text-sm text-text-muted line-clamp-2 mb-2">
            {path.description}
          </p>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {path.estimatedMinutes}m
            </span>
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              {path.steps.length} steps
            </span>
          </div>
        </div>
      </div>

      {isSelected && (
        <div className="mt-3 pt-3 border-t border-accent-purple/30">
          <div className="text-xs text-text-muted mb-2">Focus Areas:</div>
          <div className="flex flex-wrap gap-1">
            {path.focusAreas.map((area) => (
              <span
                key={area}
                className="px-2 py-0.5 bg-accent-purple/20 text-accent-purple rounded text-xs"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </button>
  );
}

// ============================================================================
// RECENT SESSION CARD
// ============================================================================

interface RecentSessionProps {
  session: {
    id: string;
    startedAt: number;
    audienceType: string;
    audienceName?: string;
    completedSteps: string[];
    totalDurationMs: number;
    pathId?: string;
  };
  onReplay: () => void;
}

function RecentSessionCard({ session, onReplay }: RecentSessionProps) {
  const path = session.pathId ? DEMO_PATHS.find(p => p.id === session.pathId) : null;
  const completionRate = Math.round((session.completedSteps.length / 10) * 100);

  return (
    <div className="bg-surface rounded-lg border border-border p-4 hover:border-accent-blue/50 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-text-primary">
            {session.audienceName || session.audienceType}
          </h4>
          <p className="text-xs text-text-muted">{formatDate(session.startedAt)}</p>
        </div>
        <Badge color={completionRate >= 80 ? 'green' : completionRate >= 50 ? 'amber' : 'red'}>
          {completionRate}%
        </Badge>
      </div>

      {path && (
        <p className="text-sm text-text-muted mb-3">Path: {path.name}</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">
          {Math.floor(session.totalDurationMs / 60000)}m duration
        </span>
        <button
          onClick={onReplay}
          className="flex items-center gap-1 text-xs text-accent-blue hover:text-accent-blue/80 transition-colors"
        >
          <Eye className="w-3 h-3" />
          View Details
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK STATS PANEL
// ============================================================================

function QuickStatsPanel() {
  const totalSessions = useDemoAnalyticsStore(s => s.totalSessions);
  const totalDemoTime = useDemoAnalyticsStore(s => s.totalDemoTimeMs);
  const completionRate = useDemoAnalyticsStore(s => s.completionRate);

  return (
    <div className="grid grid-cols-3 gap-4 p-4 bg-surface rounded-xl border border-border">
      <div className="text-center">
        <div className="text-2xl font-bold text-text-primary">{totalSessions}</div>
        <div className="text-xs text-text-muted">Total Demos</div>
      </div>
      <div className="text-center border-x border-border">
        <div className="text-2xl font-bold text-text-primary">
          {Math.floor(totalDemoTime / 60000)}m
        </div>
        <div className="text-xs text-text-muted">Demo Time</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-text-primary">{completionRate}%</div>
        <div className="text-xs text-text-muted">Completion</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN DEMO LAUNCHER PAGE
// ============================================================================

interface DemoLauncherPageProps {
  onLaunchDemo: (scenarioId: ScenarioId) => void;
  onSelectPath: (pathId: string) => void;
  onClose?: () => void;
}

export function DemoLauncherPage({ onLaunchDemo, onSelectPath, onClose }: DemoLauncherPageProps) {
  const [activeTab, setActiveTab] = useState<LauncherTab>('scenarios');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [preflightResults, setPreflightResults] = useState<Partial<Record<ScenarioId, PreflightResult>>>({});
  const [isCheckingAll, setIsCheckingAll] = useState(false);

  const sessions = useDemoSessions();
  const recentSessions = sessions.slice(0, 6);

  // Run preflight checks for all scenarios
  const runAllPreflightChecks = useCallback(async () => {
    setIsCheckingAll(true);
    const results: Partial<Record<ScenarioId, PreflightResult>> = {};

    for (const scenario of Object.values(GUIDED_SCENARIOS)) {
      const result = await runPreflightChecks(scenario.id);
      results[scenario.id] = result;
    }

    setPreflightResults(results);
    setIsCheckingAll(false);
  }, []);

  // Run checks on mount
  useEffect(() => {
    runAllPreflightChecks();
  }, [runAllPreflightChecks]);

  const handleLaunchScenario = (scenarioId: ScenarioId) => {
    onLaunchDemo(scenarioId);
  };

  const handleSelectPath = (pathId: string) => {
    setSelectedPath(pathId);
    onSelectPath(pathId);
  };

  const getPreflightStatus = (scenarioId: ScenarioId): 'ready' | 'warnings' | 'checking' => {
    if (isCheckingAll || !preflightResults[scenarioId]) return 'checking';
    return preflightResults[scenarioId].overallStatus === 'ready' ? 'ready' : 'warnings';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface-elevated border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-accent-purple to-accent-blue rounded-xl">
                <Presentation className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-text-primary">Demo Launcher</h1>
                <p className="text-text-muted">Ligature Investor Demo System v{APP_VERSION}</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Close
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <QuickStatsPanel />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-1">
            {[
              { id: 'scenarios' as const, label: 'Guided Scenarios', icon: Target },
              { id: 'paths' as const, label: 'Demo Paths', icon: ArrowRight },
              { id: 'recent' as const, label: 'Recent Sessions', icon: Calendar },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-accent-purple text-accent-purple'
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'scenarios' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Guided Scenarios</h2>
                <p className="text-sm text-text-muted">
                  Pre-built demo flows showcasing cross-module data cascades
                </p>
              </div>
              <button
                onClick={runAllPreflightChecks}
                disabled={isCheckingAll}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <Shield className={`w-4 h-4 ${isCheckingAll ? 'animate-pulse' : ''}`} />
                {isCheckingAll ? 'Checking...' : 'Verify All'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(GUIDED_SCENARIOS).map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onLaunch={() => handleLaunchScenario(scenario.id)}
                  preflightStatus={getPreflightStatus(scenario.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'paths' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-primary">Demo Paths</h2>
              <p className="text-sm text-text-muted">
                Audience-specific paths with tailored talking points
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_PATHS.map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  onSelect={() => handleSelectPath(path.id)}
                  isSelected={selectedPath === path.id}
                />
              ))}
            </div>

            {selectedPath && (
              <div className="mt-6 p-4 bg-surface rounded-xl border border-accent-purple">
                <h3 className="font-medium text-text-primary mb-3">
                  Talking Points for {DEMO_PATHS.find(p => p.id === selectedPath)?.name}
                </h3>
                <ul className="space-y-2">
                  {DEMO_PATHS.find(p => p.id === selectedPath)?.talkingPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <ChevronRight className="w-4 h-4 text-accent-purple flex-shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'recent' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-text-primary">Recent Sessions</h2>
              <p className="text-sm text-text-muted">
                Review past demo sessions and engagement
              </p>
            </div>

            {recentSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentSessions.map((session) => (
                  <RecentSessionCard
                    key={session.id}
                    session={session}
                    onReplay={() => { /* View session */ }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-surface rounded-xl border border-border">
                <Calendar className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="font-medium text-text-primary mb-2">No Recent Sessions</h3>
                <p className="text-sm text-text-muted">
                  Launch a demo to start tracking sessions
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface-elevated border-t border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Shield className="w-4 h-4" />
            <span>
              {Object.values(preflightResults).filter(r => r?.overallStatus === 'ready').length} / {Object.keys(GUIDED_SCENARIOS).length} scenarios ready
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleLaunchScenario('preclinical-to-safety')}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent-purple hover:bg-accent-purple/90 text-white rounded-lg font-medium transition-colors"
            >
              <Rocket className="w-4 h-4" />
              Quick Launch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEMO LAUNCHER MODAL
// For embedding in existing pages
// ============================================================================

interface DemoLauncherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchDemo: (scenarioId: ScenarioId) => void;
}

export function DemoLauncherModal({ isOpen, onClose, onLaunchDemo }: DemoLauncherModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-screen">
        <DemoLauncherPage
          onLaunchDemo={(id) => {
            onLaunchDemo(id);
            onClose();
          }}
          onSelectPath={() => {}}
          onClose={onClose}
        />
      </div>
    </div>
  );
}

export default DemoLauncherPage;
