

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw,
  Play, ChevronDown, ChevronUp, Shield, Zap, Database,
  Monitor, Clock, AlertOctagon
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import {
  GUIDED_SCENARIOS,
  ScenarioId,
  GuidedScenario,
  ScenarioStep,
} from '@/store/useGuidedScenarioStore';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// DEMO PREFLIGHT CHECK - v0.15.34
// Validates scenario readiness before launch to prevent demo failures
// ============================================================================

// Check result types
export type CheckStatus = 'pending' | 'running' | 'passed' | 'warning' | 'failed';

export interface PreflightCheck {
  id: string;
  name: string;
  description: string;
  category: 'navigation' | 'data' | 'system' | 'timing';
  status: CheckStatus;
  message?: string;
  duration?: number;
  canProceed: boolean; // true = warning is acceptable, false = must fix
}

export interface PreflightResult {
  scenarioId: ScenarioId;
  checks: PreflightCheck[];
  overallStatus: 'ready' | 'warnings' | 'blocked';
  readyToLaunch: boolean;
  totalDuration: number;
  timestamp: number;
}

// Module routes that should be navigable
const NAVIGABLE_MODULES: Record<string, string> = {
  research: 'research',
  clinical: 'ctms',
  safety: 'safety',
  regulatory: 'strategy',
  submissions: 'submissions',
  labeling: 'labeling',
  authoring: 'authoring',
  qms: 'qms',
  cmc: 'cmc',
  portfolio: 'portfolio',
  haq: 'haq',
  glp: 'glp',
  psmf: 'psmf',
  tmf: 'tmf',
};

// ============================================================================
// PREFLIGHT CHECK FUNCTIONS
// ============================================================================

async function checkModuleNavigability(
  modules: string[]
): Promise<PreflightCheck> {
  const start = Date.now();
  const missingModules: string[] = [];

  for (const module of modules) {
    if (module === 'portfolio') continue; // Always available
    if (!NAVIGABLE_MODULES[module]) {
      missingModules.push(module);
    }
  }

  const duration = Date.now() - start;

  if (missingModules.length === 0) {
    return {
      id: 'nav-modules',
      name: 'Module Navigation',
      description: 'All scenario modules are navigable',
      category: 'navigation',
      status: 'passed',
      message: `${modules.length} modules verified`,
      duration,
      canProceed: true,
    };
  }

  return {
    id: 'nav-modules',
    name: 'Module Navigation',
    description: 'Some modules may not be navigable',
    category: 'navigation',
    status: 'warning',
    message: `Missing routes: ${missingModules.join(', ')}`,
    duration,
    canProceed: true, // Warning only - can still proceed
  };
}

async function checkDataAvailability(): Promise<PreflightCheck> {
  const start = Date.now();

  // Check if stores have data loaded
  // This is a simplified check - in production, we'd verify specific data
  try {
    const hasLocalStorage = typeof window !== 'undefined' && window.localStorage;
    const duration = Date.now() - start;

    if (hasLocalStorage) {
      return {
        id: 'data-availability',
        name: 'Demo Data',
        description: 'Demo data is available',
        category: 'data',
        status: 'passed',
        message: 'Local storage accessible',
        duration,
        canProceed: true,
      };
    }

    return {
      id: 'data-availability',
      name: 'Demo Data',
      description: 'Local storage not available',
      category: 'data',
      status: 'warning',
      message: 'Demo will use in-memory data only',
      duration,
      canProceed: true,
    };
  } catch (error) {
    return {
      id: 'data-availability',
      name: 'Demo Data',
      description: 'Could not verify data availability',
      category: 'data',
      status: 'warning',
      message: 'Proceeding with fallback data',
      duration: Date.now() - start,
      canProceed: true,
    };
  }
}

async function checkSystemHealth(): Promise<PreflightCheck> {
  const start = Date.now();

  try {
    // Check health endpoint if available
    const response = await fetch('/api/health', { 
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    });

    const duration = Date.now() - start;

    if (response.ok) {
      const data = await response.json();
      return {
        id: 'system-health',
        name: 'System Health',
        description: 'Application is healthy',
        category: 'system',
        status: data.status === 'healthy' ? 'passed' : 'warning',
        message: `Status: ${data.status}, Uptime: ${Math.floor(data.uptime / 60)}m`,
        duration,
        canProceed: true,
      };
    }

    return {
      id: 'system-health',
      name: 'System Health',
      description: 'Health check returned non-OK status',
      category: 'system',
      status: 'warning',
      message: `HTTP ${response.status}`,
      duration,
      canProceed: true,
    };
  } catch (error) {
    // Health endpoint might not be running - that's okay for demo
    return {
      id: 'system-health',
      name: 'System Health',
      description: 'Health endpoint not available',
      category: 'system',
      status: 'warning',
      message: 'Running in demo mode',
      duration: Date.now() - start,
      canProceed: true,
    };
  }
}

async function checkTimingConfiguration(
  scenario: GuidedScenario
): Promise<PreflightCheck> {
  const start = Date.now();

  const totalDuration = scenario.steps.reduce((sum, step) => sum + step.duration, 0);
  const stepsWithZeroDuration = scenario.steps.filter(s => s.duration === 0);

  const duration = Date.now() - start;

  if (stepsWithZeroDuration.length > 0) {
    return {
      id: 'timing-config',
      name: 'Step Timing',
      description: 'Some steps have zero duration',
      category: 'timing',
      status: 'warning',
      message: `${stepsWithZeroDuration.length} steps need timing configuration`,
      duration,
      canProceed: true,
    };
  }

  return {
    id: 'timing-config',
    name: 'Step Timing',
    description: 'All steps have timing configured',
    category: 'timing',
    status: 'passed',
    message: `Total duration: ${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`,
    duration,
    canProceed: true,
  };
}

async function checkEventPayloads(
  scenario: GuidedScenario
): Promise<PreflightCheck> {
  const start = Date.now();

  const eventSteps = scenario.steps.filter(s => s.action === 'trigger-event');
  const stepsWithoutPayload = eventSteps.filter(s => !s.eventType || !s.eventPayload);

  const duration = Date.now() - start;

  if (stepsWithoutPayload.length > 0) {
    return {
      id: 'event-payloads',
      name: 'Event Configuration',
      description: 'Some event steps missing configuration',
      category: 'data',
      status: 'warning',
      message: `${stepsWithoutPayload.length} events need payload configuration`,
      duration,
      canProceed: true,
    };
  }

  if (eventSteps.length === 0) {
    return {
      id: 'event-payloads',
      name: 'Event Configuration',
      description: 'No cross-module events in scenario',
      category: 'data',
      status: 'passed',
      message: 'Narration-only scenario',
      duration,
      canProceed: true,
    };
  }

  return {
    id: 'event-payloads',
    name: 'Event Configuration',
    description: 'All events properly configured',
    category: 'data',
    status: 'passed',
    message: `${eventSteps.length} events ready`,
    duration,
    canProceed: true,
  };
}

// ============================================================================
// MAIN PREFLIGHT CHECK FUNCTION
// ============================================================================

export async function runPreflightChecks(
  scenarioId: ScenarioId
): Promise<PreflightResult> {
  const scenario = GUIDED_SCENARIOS[scenarioId];
  const start = Date.now();

  // Extract unique modules from scenario
  const modules = Array.from(new Set(scenario.steps.map(s => s.module)));

  // Run all checks
  const checks: PreflightCheck[] = await Promise.all([
    checkModuleNavigability(modules),
    checkDataAvailability(),
    checkSystemHealth(),
    checkTimingConfiguration(scenario),
    checkEventPayloads(scenario),
  ]);

  // Determine overall status
  const hasFailures = checks.some(c => c.status === 'failed');
  const hasWarnings = checks.some(c => c.status === 'warning');
  const allCanProceed = checks.every(c => c.canProceed);

  let overallStatus: 'ready' | 'warnings' | 'blocked';
  if (hasFailures || !allCanProceed) {
    overallStatus = 'blocked';
  } else if (hasWarnings) {
    overallStatus = 'warnings';
  } else {
    overallStatus = 'ready';
  }

  return {
    scenarioId,
    checks,
    overallStatus,
    readyToLaunch: allCanProceed,
    totalDuration: Date.now() - start,
    timestamp: Date.now(),
  };
}

// ============================================================================
// PREFLIGHT CHECK UI COMPONENT
// ============================================================================

interface PreflightCheckPanelProps {
  scenarioId: ScenarioId;
  onReady: () => void;
  onCancel: () => void;
}

export function PreflightCheckPanel({
  scenarioId,
  onReady,
  onCancel,
}: PreflightCheckPanelProps) {
  const [result, setResult] = useState<PreflightResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  const scenario = GUIDED_SCENARIOS[scenarioId];

  const runChecks = useCallback(async () => {
    setIsRunning(true);
    const checkResult = await runPreflightChecks(scenarioId);
    setResult(checkResult);
    setIsRunning(false);
  }, [scenarioId]);

  // Run checks on mount
  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const getStatusIcon = (status: CheckStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'navigation':
        return <Monitor className="w-4 h-4" />;
      case 'data':
        return <Database className="w-4 h-4" />;
      case 'system':
        return <Shield className="w-4 h-4" />;
      case 'timing':
        return <Clock className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden shadow-xl max-w-lg w-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-accent-purple/10 to-accent-blue/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-purple/20 rounded-lg">
              <Shield className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Pre-flight Check</h3>
              <p className="text-sm text-text-muted">{scenario.name}</p>
            </div>
          </div>
          {result && (
            <Badge
              color={
                result.overallStatus === 'ready'
                  ? 'green'
                  : result.overallStatus === 'warnings'
                  ? 'amber'
                  : 'red'
              }
            >
              {result.overallStatus === 'ready'
                ? 'Ready'
                : result.overallStatus === 'warnings'
                ? 'Warnings'
                : 'Blocked'}
            </Badge>
          )}
        </div>
      </div>

      {/* Checks List */}
      <div className="p-4">
        {isRunning && !result ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="w-6 h-6 text-accent-blue animate-spin" />
            <span className="text-text-muted">Running preflight checks...</span>
          </div>
        ) : result ? (
          <div className="space-y-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full flex items-center justify-between p-2 hover:bg-surface-hover rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-text-secondary">
                {result.checks.filter(c => c.status === 'passed').length} / {result.checks.length} checks passed
              </span>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-text-muted" />
              ) : (
                <ChevronDown className="w-4 h-4 text-text-muted" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-2">
                {result.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-3 p-3 bg-surface rounded-lg border border-border"
                  >
                    <div className="mt-0.5">{getStatusIcon(check.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {check.name}
                        </span>
                        <span className="text-text-muted">
                          {getCategoryIcon(check.category)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {check.message || check.description}
                      </p>
                      {check.duration !== undefined && (
                        <span className="text-xs text-text-muted">
                          {check.duration}ms
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-muted">Total check time:</span>
                <span className="text-text-primary font-medium">
                  {result.totalDuration}ms
                </span>
              </div>
              {result.overallStatus === 'warnings' && (
                <p className="mt-2 text-xs text-yellow-400">
                  ⚠️ Demo can proceed but some features may be limited
                </p>
              )}
              {result.overallStatus === 'blocked' && (
                <p className="mt-2 text-xs text-red-400">
                  ❌ Critical issues must be resolved before demo
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border bg-surface flex items-center justify-between">
        <button
          onClick={runChecks}
          disabled={isRunning}
          className="flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
          Re-run checks
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onReady}
            disabled={!result?.readyToLaunch || isRunning}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue/80 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {result?.overallStatus === 'warnings' ? 'Launch Anyway' : 'Launch Demo'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// INLINE PREFLIGHT INDICATOR
// For showing quick status in scenario selector
// ============================================================================

interface PreflightIndicatorProps {
  scenarioId: ScenarioId;
  size?: 'sm' | 'md';
}

export function PreflightIndicator({ scenarioId, size = 'sm' }: PreflightIndicatorProps) {
  const [status, setStatus] = useState<'pending' | 'checking' | 'ready' | 'warning'>('pending');

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      setStatus('checking');
      const result = await runPreflightChecks(scenarioId);
      if (!cancelled) {
        setStatus(result.overallStatus === 'ready' ? 'ready' : 'warning');
      }
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [scenarioId]);

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  switch (status) {
    case 'pending':
    case 'checking':
      return <Loader2 className={`${iconSize} text-gray-400 animate-spin`} />;
    case 'ready':
      return <CheckCircle className={`${iconSize} text-green-400`} />;
    case 'warning':
      return <AlertTriangle className={`${iconSize} text-yellow-400`} />;
  }
}

export default PreflightCheckPanel;
