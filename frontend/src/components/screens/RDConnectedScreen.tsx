
/**
 * RDConnectedScreen
 *
 * Investor demo centrepiece — "R&D Connected" pipeline orchestrator.
 * Demonstrates automated data flow across the full R&D lifecycle,
 * compressing 120-day manual cycles to ~28 seconds on screen.
 *
 * Architecture:
 *  - Self-contained execution engine (no store dependency for timing)
 *  - 7 selectable pipeline scenarios keyed on PREDEFINED_PIPELINES
 *  - Live animated step visualiser with module-to-module data flow
 *  - Business-impact panel (before/after, cycle compression, ROI stats)
 *  - ScreenHeader with CapabilityGate
 *
 * @version 0.95.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Workflow, Play, RotateCcw, CheckCircle2, Clock, ArrowRight,
  Zap, Sparkles, Loader2, Radio, Timer, TrendingDown,
  Database, FileText, FolderOpen, Shield, Send, FlaskConical,
  Microscope, BookOpen, Activity, Package, ClipboardList,
  BarChart3, Archive, Building2, Layers, CheckCircle,
  AlertCircle, ChevronRight, Rocket, Lock, Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useCrossModuleStore, PREDEFINED_PIPELINES } from '@/store/useCrossModuleStore';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/Toast';

// =============================================================================
// TYPES
// =============================================================================

type StepStatus = 'pending' | 'running' | 'completed' | 'failed';
type RunStatus  = 'idle' | 'running' | 'completed';

interface StepState {
  id: string;
  status: StepStatus;
  startedAt?: number;
  completedAt?: number;
}

// =============================================================================
// PIPELINE CATALOGUE
// =============================================================================

interface PipelineScenario {
  key: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;          // tailwind color name (no prefix)
  legacyDays: number;
  ligatureDays: number;
  cycleLabel: string;
  narratives: string[];   // one per step
  impact: {
    label: string;
    value: string;
    sub: string;
  }[];
}

const SCENARIOS: PipelineScenario[] = [
  {
    key: 'lslv-to-submission',
    name: 'LSLV → Submission',
    tagline: 'Last Subject Last Visit to regulatory submission package',
    icon: Send,
    color: 'green',
    legacyDays: 120,
    ligatureDays: 28,
    cycleLabel: 'submission cycle',
    narratives: [
      'Locking clinical database — all patient data validated and finalized',
      'AI drafting Clinical Study Report from locked datasets',
      'Trial Master File auto-closed and compliance-checked',
      'eCTD submission package compiled and gateway-queued',
    ],
    impact: [
      { label: 'Cycle reduction', value: '77%', sub: '120d → 28d' },
      { label: 'Manual handoffs eliminated', value: '12', sub: 'across 4 teams' },
      { label: 'Audit trail events', value: '847', sub: '21 CFR Part 11 compliant' },
    ],
  },
  {
    key: 'signal-to-label',
    name: 'Safety Signal → Label',
    tagline: 'Validated safety signal to label variation submission',
    icon: Shield,
    color: 'red',
    legacyDays: 45,
    ligatureDays: 7,
    cycleLabel: 'safety response cycle',
    narratives: [
      'Assessing signal severity and label section impact',
      'Updating PSMF with confirmed signal documentation',
      'Preparing label variation submission package',
    ],
    impact: [
      { label: 'Cycle reduction', value: '84%', sub: '45d → 7d' },
      { label: 'ICSR reports auto-coded', value: '23', sub: 'MedDRA E2B(R3)' },
      { label: 'Regulatory submissions', value: '6', sub: 'FDA + EMA + PMDA' },
    ],
  },
  {
    key: 'lab-to-m4',
    name: 'Lab → Module 4',
    tagline: 'GLP study completion to nonclinical submission package',
    icon: FlaskConical,
    color: 'emerald',
    legacyDays: 60,
    ligatureDays: 14,
    cycleLabel: 'nonclinical filing cycle',
    narratives: [
      'Linking ELN experiment records to GLP study',
      'Finalizing GLP study report with regulatory formatting',
      'Packaging nonclinical data for Module 4 submission',
    ],
    impact: [
      { label: 'Cycle reduction', value: '77%', sub: '60d → 14d' },
      { label: 'GLP studies automated', value: '8', sub: 'toxicology + PK' },
      { label: 'ALCOA+ compliance score', value: '96%', sub: '21 CFR 58' },
    ],
  },
  {
    key: 'haq-to-submission',
    name: 'HAQ → Submission',
    tagline: 'Health Authority Question response through regulatory gateway',
    icon: FileText,
    color: 'amber',
    legacyDays: 30,
    ligatureDays: 5,
    cycleLabel: 'agency response cycle',
    narratives: [
      'Finalizing Health Authority Question response package',
      'Quality control review against submission standards',
      'Archiving response to Trial Master File',
      'Transmitting response through regulatory gateway',
    ],
    impact: [
      { label: 'Cycle reduction', value: '83%', sub: '30d → 5d' },
      { label: 'HAQs auto-drafted', value: '34', sub: 'RAG-powered' },
      { label: 'Regulatory questions resolved', value: '100%', sub: 'this submission cycle' },
    ],
  },
  {
    key: 'deviation-to-capa',
    name: 'Deviation → CAPA',
    tagline: 'Quality deviation through corrective action and notification',
    icon: ClipboardList,
    color: 'orange',
    legacyDays: 21,
    ligatureDays: 3,
    cycleLabel: 'CAPA resolution cycle',
    narratives: [
      'Logging quality deviation with root cause analysis',
      'Assessing regulatory impact and notification requirements',
      'Updating Trial Master File with deviation documentation',
    ],
    impact: [
      { label: 'Cycle reduction', value: '86%', sub: '21d → 3d' },
      { label: 'Deviations auto-classified', value: '41', sub: 'by severity + type' },
      { label: 'CAPA closure rate', value: '98%', sub: 'on-time' },
    ],
  },
  {
    key: 'cmc-change-flow',
    name: 'CMC Change Control',
    tagline: 'Manufacturing change through variation submission',
    icon: Package,
    color: 'violet',
    legacyDays: 90,
    ligatureDays: 21,
    cycleLabel: 'variation submission cycle',
    narratives: [
      'Documenting CMC change with technical assessment',
      'Updating IDMP substance and product records',
      'Preparing variation submission for affected markets',
    ],
    impact: [
      { label: 'Cycle reduction', value: '77%', sub: '90d → 21d' },
      { label: 'Markets covered', value: '8', sub: 'simultaneous filings' },
      { label: 'IDMP records synced', value: '100%', sub: 'ISO 11615 compliant' },
    ],
  },
  {
    key: 'study-setup',
    name: 'Study Setup',
    tagline: 'Study intelligence through site activation',
    icon: Activity,
    color: 'blue',
    legacyDays: 35,
    ligatureDays: 7,
    cycleLabel: 'site activation cycle',
    narratives: [
      'Importing site intelligence data to Clinical Trials',
      'Creating Trial Master File folder structure',
      'Configuring safety database for study-specific AE coding',
      'Setting up EDC forms and edit checks',
    ],
    impact: [
      { label: 'Cycle reduction', value: '80%', sub: '35d → 7d' },
      { label: 'Sites activated', value: '47', sub: 'across 12 countries' },
      { label: 'Days to first patient', value: '-18d', sub: 'vs. previous study' },
    ],
  },
];

// =============================================================================
// MODULE METADATA
// =============================================================================

const MODULE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string; bg: string }> = {
  authoring:          { icon: BookOpen,    label: 'Authoring',     color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
  haq:                { icon: FileText,    label: 'HAQ',           color: 'text-amber-400',  bg: 'bg-amber-500/20'  },
  submissions:        { icon: Send,        label: 'Submissions',   color: 'text-green-400',  bg: 'bg-green-500/20'  },
  regulatory:         { icon: FileText,    label: 'Regulatory',    color: 'text-cyan-400',   bg: 'bg-cyan-500/20'   },
  labeling:           { icon: Package,     label: 'Labeling',      color: 'text-teal-400',   bg: 'bg-teal-500/20'   },
  ctms:               { icon: Activity,    label: 'CTMS',          color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
  tmf:                { icon: FolderOpen,  label: 'TMF',           color: 'text-violet-400', bg: 'bg-violet-500/20' },
  edc:                { icon: Database,    label: 'EDC',           color: 'text-sky-400',    bg: 'bg-sky-500/20'    },
  safety:             { icon: Shield,      label: 'Safety',        color: 'text-red-400',    bg: 'bg-red-500/20'    },
  quality:            { icon: CheckCircle2,label: 'QMS',           color: 'text-orange-400', bg: 'bg-orange-500/20' },
  psmf:               { icon: ClipboardList,label:'PSMF',          color: 'text-rose-400',   bg: 'bg-rose-500/20'   },
  eln:                { icon: Microscope,  label: 'ELN',           color: 'text-purple-400', bg: 'bg-purple-500/20' },
  glp:                { icon: FlaskConical,label: 'GLP',           color: 'text-emerald-400',bg: 'bg-emerald-500/20'},
  'sample-management':{ icon: Microscope,  label: 'Samples',       color: 'text-pink-400',   bg: 'bg-pink-500/20'   },
  idmp:               { icon: Layers,      label: 'IDMP',          color: 'text-lime-400',   bg: 'bg-lime-500/20'   },
  'master-data':      { icon: Building2,   label: 'MDM',           color: 'text-text-muted',  bg: 'bg-slate-500/20'  },
  'study-intel':      { icon: BarChart3,   label: 'Intel',         color: 'text-fuchsia-400',bg: 'bg-fuchsia-500/20'},
  archives:           { icon: Archive,     label: 'Archives',      color: 'text-stone-400',  bg: 'bg-stone-500/20'  },
};

function getModuleMeta(id: string) {
  return MODULE_META[id] ?? { icon: Workflow, label: id, color: 'text-text-muted', bg: 'bg-slate-500/20' };
}

// =============================================================================
// STEP TIMING (ms)
// =============================================================================

const STEP_DELAYS = [2000, 2400, 1800, 2200]; // per step index, cycles if more steps

function getDelay(index: number): number {
  return STEP_DELAYS[index % STEP_DELAYS.length];
}

// =============================================================================
// STEP CARD COMPONENT
// =============================================================================

interface StepCardProps {
  step: { id: string; name: string; sourceModule: string; targetModule: string };
  status: StepStatus;
  index: number;
  total: number;
  narrative: string;
  elapsedMs?: number;
}

function StepCard({ step, status, index, total, narrative, elapsedMs }: StepCardProps) {
  const src = getModuleMeta(step.sourceModule);
  const tgt = getModuleMeta(step.targetModule);
  const SrcIcon = src.icon;
  const TgtIcon = tgt.icon;

  const isRunning   = status === 'running';
  const isDone      = status === 'completed';
  const isPending   = status === 'pending';

  return (
    <div className={`
      relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-500
      ${isRunning ? 'bg-gradient-to-r from-blue-500/15 via-purple-500/10 to-transparent border-blue-500/40 shadow-lg shadow-blue-500/10' : ''}
      ${isDone    ? 'bg-green-500/8 border-green-500/30' : ''}
      ${isPending ? 'bg-surface-card border-border' : ''}
    `}>
      {/* Step number / check */}
      <div className={`
        w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5
        ${isRunning ? 'bg-blue-500 text-white' : ''}
        ${isDone    ? 'bg-green-500 text-white' : ''}
        ${isPending ? 'bg-surface-hover text-text-muted' : ''}
      `}>
        {isDone
          ? <CheckCircle2 className="w-4 h-4" />
          : isRunning
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <span>{index + 1}</span>
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Step name + badge */}
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-semibold ${isRunning ? 'text-blue-600 dark:text-blue-300' : isDone ? 'text-green-600' : 'text-text-muted'}`}>
            {step.name}
          </span>
          {isRunning && (
            <Badge className="bg-blue-500/20 text-blue-600 border-0 text-[10px] px-1.5 py-0">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 mr-1 animate-ping" />
              LIVE
            </Badge>
          )}
          {isDone && (
            <Badge className="bg-green-500/20 text-green-600 border-0 text-[10px] px-1.5 py-0">
              DONE
            </Badge>
          )}
        </div>

        {/* Narrative */}
        <p className={`text-xs mb-2 ${isRunning ? 'text-blue-600' : isDone ? 'text-text-muted' : 'text-text-muted'}`}>
          {narrative}
        </p>

        {/* Module flow */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${src?.bg ?? ''}`}>
            <SrcIcon className={`w-3 h-3 ${src?.color ?? ''}`} />
            <span className="text-xs text-text-secondary">{src.label}</span>
          </div>
          <div className="relative flex items-center gap-0">
            <div className={`w-5 h-0.5 ${isDone ? 'bg-green-500' : isRunning ? 'bg-blue-500' : 'bg-border'}`} />
            <ArrowRight className={`w-3 h-3 -ml-0.5 ${isDone ? 'text-green-400' : isRunning ? 'text-blue-400' : 'text-text-muted'}`} />
          </div>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${tgt?.bg ?? ''}`}>
            <TgtIcon className={`w-3 h-3 ${tgt?.color ?? ''}`} />
            <span className="text-xs text-text-secondary">{tgt.label}</span>
          </div>
        </div>
      </div>

      {/* Elapsed time */}
      {elapsedMs !== undefined && (
        <div className={`flex items-center gap-1 flex-shrink-0 text-xs font-mono ${isDone ? 'text-green-600' : 'text-blue-600'}`}>
          <Timer className="w-3 h-3" />
          {(elapsedMs / 1000).toFixed(1)}s
        </div>
      )}

      {/* Active glow */}
      {isRunning && (
        <div className="absolute inset-0 rounded-xl pointer-events-none bg-gradient-to-r from-blue-500/8 to-purple-500/5 animate-pulse" />
      )}
    </div>
  );
}

// =============================================================================
// PIPELINE SELECTOR CARD
// =============================================================================

interface SelectorCardProps {
  scenario: PipelineScenario;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function SelectorCard({ scenario, selected, disabled, onSelect }: SelectorCardProps) {
  const Icon = scenario.icon;
  const reduction = Math.round((1 - scenario.ligatureDays / scenario.legacyDays) * 100);

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full text-left p-3 rounded-xl border transition-all duration-200
        ${selected
          ? `border-${scenario?.color ?? ''}-500/60 bg-${scenario?.color ?? ''}-500/10`
          : disabled
          ? 'border-border bg-surface-card opacity-50 cursor-not-allowed'
          : 'border-border bg-surface-card hover:border-border hover:bg-surface-elevated'
        }
      `}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`p-1.5 rounded-lg bg-${scenario?.color ?? ''}-500/20 flex-shrink-0`}>
          <Icon className={`w-3.5 h-3.5 text-${scenario?.color ?? ''}-400`} />
        </div>
        <span className={`text-xs font-semibold ${selected ? `text-${scenario?.color ?? ''}-700 dark:text-${scenario?.color ?? ''}-300` : 'text-text-secondary'}`}>
          {scenario.name}
        </span>
        {selected && (
          <div className={`ml-auto w-2 h-2 rounded-full bg-${scenario?.color ?? ''}-400`} />
        )}
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed mb-2">{scenario.tagline}</p>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-text-muted line-through">{scenario.legacyDays}d</span>
        <ChevronRight className="w-2.5 h-2.5 text-text-muted" />
        <span className={`text-[10px] font-bold text-${scenario?.color ?? ''}-700 dark:text-${scenario?.color ?? ''}-400`}>{scenario.ligatureDays}d</span>
        <Badge className={`ml-auto bg-${scenario?.color ?? ''}-500/15 text-${scenario?.color ?? ''}-700 dark:text-${scenario?.color ?? ''}-400 border-0 text-[9px] px-1`}>
          -{reduction}%
        </Badge>
      </div>
    </button>
  );
}

// =============================================================================
// IMPACT PANEL (post-run)
// =============================================================================

function ImpactPanel({ scenario, totalMs }: { scenario: PipelineScenario; totalMs: number }) {
  const reduction = Math.round((1 - scenario.ligatureDays / scenario.legacyDays) * 100);

  return (
    <div className={`p-5 rounded-xl border border-${scenario?.color ?? ''}-500/30 bg-gradient-to-br from-${scenario?.color ?? ''}-500/10 via-${scenario?.color ?? ''}-500/5 to-transparent`}>
      {/* Hero stat */}
      <div className="flex items-center gap-3 mb-5">
        <div className={`p-3 rounded-xl bg-${scenario?.color ?? ''}-500/20`}>
          <Sparkles className={`w-6 h-6 text-${scenario?.color ?? ''}-400`} />
        </div>
        <div>
          <div className={`text-2xl font-bold text-${scenario?.color ?? ''}-400`}>
            {(totalMs / 1000).toFixed(1)}s
          </div>
          <div className="text-xs text-text-muted">
            automated execution — vs <span className="line-through text-text-muted">{scenario.legacyDays} days legacy</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className={`text-3xl font-black text-${scenario?.color ?? ''}-400`}>{reduction}%</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">cycle reduction</div>
        </div>
      </div>

      {/* Impact grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {scenario.impact.map((item) => (
          <div key={item.label} className="bg-surface-elevated rounded-lg p-3 text-center">
            <div className={`text-xl font-bold text-${scenario?.color ?? ''}-400`}>{item.value}</div>
            <div className="text-[10px] text-text-muted mt-0.5">{item.label}</div>
            <div className="text-[9px] text-text-muted">{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Timeline bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>Legacy cycle: {scenario.legacyDays} days</span>
          <span>Ligature: {scenario.ligatureDays} days</span>
        </div>
        <div className="relative h-3 bg-surface-hover rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-surface-hover w-full rounded-full" />
          <div
            className={`absolute inset-y-0 left-0 bg-${scenario?.color ?? ''}-500 rounded-full transition-all duration-1000`}
            style={{ width: `${(scenario.ligatureDays / scenario.legacyDays) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-text-muted">
          <span className="text-text-muted">0</span>
          <span className={`text-${scenario?.color ?? ''}-400 font-semibold`}>↑ {scenario.ligatureDays}d</span>
          <span className="text-text-muted">{scenario.legacyDays}d</span>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================


// Maps RD Connected scenario keys to Agent Hub cascade types
const SCENARIO_CASCADE_MAP: Record<string, string | null> = {
  'lslv-to-submission':  'db-lock-to-submission',
  'signal-to-label':     'signal-to-label',
  'lab-to-m4':           null,                    // no direct cascade — fires nonclinical-package agent
  'haq-to-submission':   'haq-cross-functional',
  'deviation-to-capa':   null,                    // fires quality-intelligence agent
  'cmc-change-flow':     null,                    // fires cmc-lifecycle agent
  'study-setup':         'ind-nda-gate3-site-readiness',
};

// For scenarios without a cascade, we fire a single agent trigger instead
const SCENARIO_AGENT_MAP: Record<string, string | null> = {
  'lab-to-m4':       'nonclinical-package',
  'deviation-to-capa': 'quality-intelligence',
  'cmc-change-flow': 'cmc-lifecycle',
};

export function RDConnectedScreen() {
  const [selectedKey, setSelectedKey]     = useState<string>('lslv-to-submission');
  const [runStatus, setRunStatus]         = useState<RunStatus>('idle');
  const [stepStates, setStepStates]       = useState<StepState[]>([]);
  const [totalElapsedMs, setTotalElapsedMs] = useState(0);
  const timerRef    = useRef<NodeJS.Timeout | null>(null);
  const tickerRef   = useRef<NodeJS.Timeout | null>(null);
  const startTsRef  = useRef<number>(0);
  const pipelineIdRef = useRef<string | null>(null);
  const timerRefs   = useRef<NodeJS.Timeout[]>([]);

  const toast = useToast();

  // Real cascade results from Agent Hub
  const [cascadeResult, setCascadeResult] = useState<{
    steps: Array<{ agentId: string; status: string; summary: string }>;
    demoMode: boolean;
  } | null>(null);
  const [cascadeLoading, setCascadeLoading] = useState(false);
  const setActiveModule = useAppStore(s => s.setActiveModule);


  // Store actions
  const startPipeline    = useCrossModuleStore(s => s.startPipeline);
  const completePipeline = useCrossModuleStore(s => s.completePipeline);
  const createHandoff    = useCrossModuleStore(s => s.createHandoff);
  const emitEvent        = useCrossModuleStore(s => s.emitEvent);

  const scenario  = SCENARIOS.find(s => s.key === selectedKey) ?? SCENARIOS[0];
  const predefined = PREDEFINED_PIPELINES[selectedKey];
  const steps      = predefined?.steps ?? [];

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      timerRefs.current.forEach(t => clearTimeout(t));
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, []);

  // Reset when scenario changes
  const handleSelect = useCallback((key: string) => {
    if (runStatus === 'running') return;
    setSelectedKey(key);
    setRunStatus('idle');
    setStepStates([]);
    setTotalElapsedMs(0);
  }, [runStatus]);

  // Wall-clock ticker
  const startTicker = useCallback(() => {
    startTsRef.current = Date.now();
    tickerRef.current = setInterval(() => {
      setTotalElapsedMs(Date.now() - startTsRef.current);
    }, 100);
  }, []);

  const stopTicker = useCallback(() => {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
    setTotalElapsedMs(Date.now() - startTsRef.current);
  }, []);


  // Fire real cascade in Agent Hub in parallel with the local animation
  const fireCascade = useCallback(async (scenarioKey: string) => {
    setCascadeResult(null);
    setCascadeLoading(true);

    const cascadeType = SCENARIO_CASCADE_MAP[scenarioKey];
    const agentId     = SCENARIO_AGENT_MAP[scenarioKey];

    try {
      let result;
      if (cascadeType) {
        // Full multi-agent cascade
        const res = await fetch('/api/agents/cascade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cascadeType,
            signalId: 'SIG-2026-001',
            productId: 'prod-001',
            studyId: 'LIG-2847-301',
            submissionId: 'SUB-001',
            haqId: 'IR-2026-001',
          }),
        });
        result = await res.json();
        setCascadeResult({ steps: result.steps ?? [], demoMode: result.demoMode ?? false });
      } else if (agentId) {
        // Single agent trigger
        const res = await fetch('/api/agents/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId,
            entityType: 'study',
            entityId: 'LIG-2847-301',
          }),
        });
        const json = await res.json();
        // Wrap single run as a one-step result
        const run = json.data ?? {};
        setCascadeResult({
          steps: [{ agentId, status: run.status ?? 'completed', summary: run.decision ?? `${agentId} completed` }],
          demoMode: json.demoMode ?? false,
        });
      }
    } catch {
      // Silently fail — local animation is source of truth
    } finally {
      setCascadeLoading(false);
    }
  }, []);

  // Run the pipeline — fires real store events + handoffs
  const handleRun = useCallback(() => {
    if (runStatus === 'running' || steps.length === 0) return;

    // Clear any previous timers
    timerRefs.current.forEach(t => clearTimeout(t));
    timerRefs.current = [];

    // Initialise all steps pending
    setStepStates(steps.map(s => ({ id: s.id, status: 'pending' })));
    setRunStatus('running');
    setTotalElapsedMs(0);
    startTicker();

    // Register pipeline in the store
    startPipeline(selectedKey);

    // Grab the pipeline id that was just created (last in activePipelines after next tick)
    const pipelineStartTs = Date.now();

    // Fire real cascade in Agent Hub in parallel
    fireCascade(selectedKey);

    // Emit a pipeline-started event visible in the Activity feed
    emitEvent({
      eventType: 'workflow-started',
      sourceModule: (steps[0]?.sourceModule as any) ?? 'authoring',
      targetModules: [],
      entityType: 'pipeline',
      entityId: selectedKey,
      description: `Pipeline started: ${scenario.name}`,
      payload: { pipelineKey: selectedKey, stepCount: steps.length },
    });

    toast.info(`▶ Pipeline started: ${scenario.name}`);

    let cumulativeDelay = 0;

    steps.forEach((step, idx) => {
      const delay      = getDelay(idx);
      const startDelay = cumulativeDelay;
      cumulativeDelay += delay;

      // Mark step as running
      const t1 = setTimeout(() => {
        setStepStates(prev => prev.map((s, i) =>
          i === idx ? { ...s, status: 'running', startedAt: Date.now() } : s
        ));
      }, startDelay);
      timerRefs.current.push(t1);

      // Mark step as completed + fire real store handoff
      const t2 = setTimeout(() => {
        setStepStates(prev => prev.map((s, i) =>
          i === idx ? { ...s, status: 'completed', completedAt: Date.now() } : s
        ));

        // Create a real handoff in the store so target module shows a pending item
        createHandoff({
          type: (step.handoffType as any),
          sourceModule: (step.sourceModule as any),
          targetModule: (step.targetModule as any),
          sourceId: `pipeline-${selectedKey}-step-${step.id}`,
          sourceTitle: `${scenario.name} — ${step.name}`,
          metadata: {
            pipelineKey: selectedKey,
            pipelineName: scenario.name,
            stepName: step.name,
            stepOrder: step.order,
            automatedBy: 'R&D Connected Pipeline',
          },
          createdBy: 'pipeline-engine',
        });

        // Toast on each completed step
        toast.success(`✓ ${step.name} → ${step.targetModule}`);

        // If last step — wrap up pipeline in store
        if (idx === steps.length - 1) {
          const durationMs = Date.now() - pipelineStartTs;
          stopTicker();
          setRunStatus('completed');

          // Find the active pipeline and complete it
          const activePipe = useCrossModuleStore.getState().activePipelines
            .find(p => p.name === (predefined?.name ?? selectedKey));
          if (activePipe) {
            completePipeline(activePipe.id, durationMs);
          }

          // Emit a final broadcast event
          emitEvent({
            eventType: 'workflow-completed',
            sourceModule: (steps[steps.length - 1]?.targetModule as any) ?? 'submissions',
            targetModules: [],
            entityType: 'pipeline',
            entityId: selectedKey,
            description: `Pipeline completed: ${scenario.name} in ${(durationMs / 1000).toFixed(1)}s`,
            payload: { pipelineKey: selectedKey, durationMs, stepCount: steps.length },
          });

          toast.success(`🏁 ${scenario.name} complete — ${steps.length} handoffs created`);
        }
      }, cumulativeDelay);
      timerRefs.current.push(t2);
    });
  }, [runStatus, steps, selectedKey, scenario, predefined, startTicker, stopTicker,
      startPipeline, completePipeline, createHandoff, emitEvent, toast]);

  const handleReset = useCallback(() => {
    timerRefs.current.forEach(t => clearTimeout(t));
    timerRefs.current = [];
    if (tickerRef.current) clearInterval(tickerRef.current);
    setRunStatus('idle');
    setStepStates([]);
    setTotalElapsedMs(0);
  }, []);

  // Step elapsed ms helpers
  function getStepStatus(stepId: string): StepStatus {
    return stepStates.find(s => s.id === stepId)?.status ?? 'pending';
  }

  function getStepElapsed(stepId: string): number | undefined {
    const s = stepStates.find(st => st.id === stepId);
    if (!s?.startedAt) return undefined;
    const end = s.completedAt ?? Date.now();
    return end - s.startedAt;
  }

  const completedCount = stepStates.filter(s => s.status === 'completed').length;
  const progress       = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const isRunning      = runStatus === 'running';
  const isDone         = runStatus === 'completed';
  const Icon           = scenario.icon;

  return (
    <div className="flex flex-col h-full bg-surface overflow-hidden">
      <ScreenHeader
        title="R&D Connected"
        subtitle="Automated data pipelines across the full R&D lifecycle"
        icon={<Workflow className="w-5 h-5" />}
        badge={{ label: 'Phase 3' }}
        actions={
          <div className="flex items-center gap-2">
            {(isRunning || isDone) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleReset}
                className="text-text-muted hover:text-white gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleRun}
              disabled={isRunning}
              className={`gap-1.5 ${isDone
                ? 'bg-green-600 hover:bg-green-500'
                : `bg-${scenario?.color ?? ''}-600 hover:bg-${scenario?.color ?? ''}-500`
              }`}
            >
              {isRunning
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Running…</>
                : isDone
                ? <><RotateCcw className="w-3.5 h-3.5" /> Run Again</>
                : <><Play className="w-3.5 h-3.5" /> Run Pipeline</>
              }
            </Button>
          </div>
        }
      />

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

        {/* ── LEFT: Scenario Selector ───────────────────────────────── */}
        <div className="w-full md:w-56 lg:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-border flex flex-col overflow-hidden max-h-36 md:max-h-full">
          <div className="hidden md:block px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Pipeline Scenarios
            </p>
          </div>
          <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto p-3 gap-2 md:space-y-2 md:gap-0">
            {SCENARIOS.map(s => (
              <SelectorCard
                key={s.key}
                scenario={s}
                selected={selectedKey === s.key}
                disabled={isRunning}
                onSelect={() => handleSelect(s.key)}
              />
            ))}
          </div>

          {/* Bottom brand strip */}
          <div className="px-4 py-3 border-t border-border bg-surface-elevated">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-accent-teal" />
              <span className="text-[10px] text-text-muted">
                Zero manual handoffs. Full audit trail.
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER: Pipeline Visualiser ───────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Scenario header */}
          <div className={`
            px-6 py-4 border-b border-border
            bg-gradient-to-r from-${scenario?.color ?? ''}-500/8 via-transparent to-transparent
          `}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-${scenario?.color ?? ''}-500/20`}>
                  <Icon className={`w-5 h-5 text-${scenario?.color ?? ''}-400`} />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{scenario.name}</h2>
                  <p className="text-xs text-text-muted">{scenario.tagline}</p>
                </div>
              </div>

              {/* Live timer / progress */}
              {(isRunning || isDone) && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`text-xl font-mono font-bold ${isDone ? 'text-green-600' : 'text-blue-600'}`}>
                      {(totalElapsedMs / 1000).toFixed(1)}s
                    </div>
                    <div className="text-[10px] text-text-muted">elapsed</div>
                  </div>
                  <div className="w-28">
                    <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-text-muted mt-1">
                      <span>{completedCount}/{steps.length} steps</span>
                      <span>{progress}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Steps area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            {runStatus === 'idle' ? (
              /* Idle state — steps as hero, ready to run */
              <div className="max-w-2xl">
                {/* Context banner — explains what this is */}
                <div className="mb-5 p-4 rounded-xl border border-border bg-surface-card flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-teal/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Zap className="w-4 h-4 text-accent-teal" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary mb-0.5">What happens when you run a pipeline</p>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Each step automatically passes data between modules — no copy-paste, no emails, no handoff meetings.
                      When the pipeline completes, affected modules receive pending items ready for action.
                    </p>
                  </div>
                </div>

                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-${scenario?.color ?? ''}-500/15 border border-${scenario?.color ?? ''}-500/25 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${scenario?.color ?? ''}-400`} />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-text-primary">{scenario.name}</h3>
                      <p className="text-xs text-text-muted">{steps.length} automated steps · {scenario.legacyDays}d → <span className={`font-semibold text-${scenario?.color ?? ''}-400`}>{scenario.ligatureDays}d</span> with Ligature</p>
                    </div>
                  </div>
                </div>

                {/* Steps list */}
                <div className="space-y-3">
                  {steps.map((step, idx) => {
                    const src = getModuleMeta(step.sourceModule);
                    const tgt = getModuleMeta(step.targetModule);
                    const SrcIcon = src.icon;
                    const TgtIcon = tgt.icon;
                    return (
                      <div key={step.id} className="relative flex items-start gap-3 p-4 rounded-xl border border-border bg-surface-card">
                        {/* Step number */}
                        <div className="w-9 h-9 rounded-full bg-surface-hover flex items-center justify-center text-sm font-bold text-text-muted flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-text-secondary">{step.name}</span>
                          </div>
                          <p className="text-xs text-text-muted mb-2">{scenario.narratives[idx] ?? step.name}</p>
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${src?.bg ?? ''}`}>
                              <SrcIcon className={`w-3 h-3 ${src?.color ?? ''}`} />
                              <span className="text-xs text-text-secondary">{src.label}</span>
                            </div>
                            <ArrowRight className="w-3 h-3 text-text-muted" />
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${tgt?.bg ?? ''}`}>
                              <TgtIcon className={`w-3 h-3 ${tgt?.color ?? ''}`} />
                              <span className="text-xs text-text-secondary">{tgt.label}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* What gets created */}
                <div className="mt-5 p-4 rounded-xl border border-border bg-surface-card">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Modules that receive handoffs</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(new Set(steps.map(s => s.targetModule))).map(mod => {
                      const m = getModuleMeta(mod);
                      const MIcon = m.icon;
                      return (
                        <div key={mod} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${m?.bg ?? ''} border border-transparent`}>
                          <MIcon className={`w-3.5 h-3.5 ${m?.color ?? ''}`} />
                          <span className={`text-xs font-medium ${m?.color ?? ''}`}>{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-text-muted mt-3">Each module above will show a pending handoff item when this pipeline completes.</p>
                </div>
              </div>
            ) : (
              /* Live execution */
              <div className="space-y-3 max-w-2xl">
                {steps.map((step, idx) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    status={getStepStatus(step.id)}
                    index={idx}
                    total={steps.length}
                    narrative={scenario.narratives[idx] ?? step.name}
                    elapsedMs={getStepElapsed(step.id)}
                  />
                ))}

                {/* Completion — handoffs created */}
                {isDone && (
                  <>
                    <ImpactPanel scenario={scenario} totalMs={totalElapsedMs} />
                    <div className="p-4 rounded-xl border border-green-500/30 bg-green-500/8">
                      <p className="text-xs font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {steps.length} handoffs created — check these modules
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(steps.map(s => s.targetModule))).map(mod => {
                          const m = getModuleMeta(mod);
                          const MIcon = m.icon;
                          return (
                            <div key={mod} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-card border border-green-500/20`}>
                              <MIcon className={`w-3.5 h-3.5 ${m?.color ?? ''}`} />
                              <span className={`text-xs font-medium text-text-secondary`}>{m.label}</span>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 ml-0.5" />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Real Agent Hub results */}
                    <div className="p-4 rounded-xl border border-purple-500/25 bg-purple-500/5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-semibold text-purple-400 flex items-center gap-2">
                          <Bot className="w-3.5 h-3.5" />
                          {cascadeLoading ? 'Agents running…' : cascadeResult ? 'Agent Hub results' : 'No cascade configured'}
                        </p>
                        {cascadeResult && !cascadeLoading && (
                          <button
                            onClick={() => setActiveModule('agent-hub')}
                            className="text-[10px] text-purple-400 hover:text-purple-300 underline underline-offset-2 flex items-center gap-1"
                          >
                            View in Agent Hub
                          </button>
                        )}
                      </div>
                      {cascadeLoading && (
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Firing agents in the background…
                        </div>
                      )}
                      {cascadeResult && !cascadeLoading && (
                        <div className="space-y-1.5">
                          {cascadeResult.demoMode && (
                            <p className="text-[10px] text-text-muted mb-2 italic">Demo mode — add ANTHROPIC_API_KEY for live agent runs</p>
                          )}
                          {cascadeResult.steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px]">
                              <span className={`flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${
                                step.status === 'escalated' ? 'bg-accent-amber' :
                                step.status === 'completed' || step.status === 'approved' ? 'bg-accent-green' :
                                'bg-accent-blue animate-pulse'
                              }`} />
                              <div className="min-w-0">
                                <span className="font-mono text-[10px] text-text-muted">{step.agentId}</span>
                                <p className="text-text-secondary truncate">{step.summary}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT: Context panel ──────────────────────────────────── */}
        <div className="hidden md:flex w-full md:w-64 lg:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l border-border flex-col overflow-hidden">
          {/* Business case */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              Business Case
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Cycle compression hero */}
            <div className="p-4 rounded-xl bg-surface-elevated border border-border text-center">
              <TrendingDown className={`w-6 h-6 text-${scenario?.color ?? ''}-600 dark:text-${scenario?.color ?? ''}-400 mx-auto mb-2`} />
              <div className="text-3xl font-black text-text-primary mb-1">
                {scenario.legacyDays}<span className="text-text-muted">d</span>
                <span className="text-xl text-text-muted mx-1">→</span>
                <span className={`text-${scenario?.color ?? ''}-700 dark:text-${scenario?.color ?? ''}-400`}>{scenario.ligatureDays}<span className="text-lg">d</span></span>
              </div>
              <div className="text-xs text-text-muted">{scenario.cycleLabel}</div>
              <div className={`text-xs font-bold text-${scenario?.color ?? ''}-700 dark:text-${scenario?.color ?? ''}-400 mt-1`}>
                {Math.round((1 - scenario.ligatureDays / scenario.legacyDays) * 100)}% faster
              </div>
            </div>

            {/* Impact metrics */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                Impact Metrics
              </p>
              {scenario.impact.map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-surface-card border border-border">
                  <div>
                    <div className="text-xs text-text-secondary">{item.label}</div>
                    <div className="text-[10px] text-text-muted">{item.sub}</div>
                  </div>
                  <div className={`text-lg font-bold text-${scenario?.color ?? ''}-700 dark:text-${scenario?.color ?? ''}-400`}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Pipeline steps preview / live status */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {isDone ? 'Handoffs created' : 'Pipeline steps'}
              </p>
              {steps.map((step, idx) => {
                const s = getStepStatus(step.id);
                const tgt = getModuleMeta(step.targetModule);
                const TgtIcon = tgt.icon;
                return (
                  <div key={step.id} className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                    s === 'running'   ? 'bg-blue-500/10 border border-blue-500/30' :
                    s === 'completed' ? 'bg-green-500/8 border border-green-500/20' :
                    'bg-surface-card border border-border'
                  }`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      s === 'running'   ? 'bg-blue-500' :
                      s === 'completed' ? 'bg-green-500' :
                      'bg-border'
                    }`}>
                      {s === 'completed' ? <CheckCircle className="w-3 h-3 text-white" /> :
                       s === 'running'   ? <Loader2 className="w-3 h-3 text-white animate-spin" /> :
                       <span className="text-[9px] text-text-muted">{idx + 1}</span>}
                    </div>
                    <span className={`text-xs flex-1 truncate ${
                      s === 'running'   ? 'text-blue-600 dark:text-blue-300' :
                      s === 'completed' ? 'text-green-600' :
                      'text-text-muted'
                    }`}>{step.name}</span>
                    {s === 'completed' && (
                      <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${tgt?.bg ?? ''}`}>
                        <TgtIcon className={`w-2.5 h-2.5 ${tgt?.color ?? ''}`} />
                        <span className={`text-[9px] ${tgt?.color ?? ''}`}>{tgt.label}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {isDone && (
                <div className="mt-2 p-3 rounded-lg bg-green-500/10 border border-green-500/25 text-center">
                  <p className="text-xs font-semibold text-green-400">{steps.length} modules notified</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Pending items waiting in each module</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-surface-elevated">
            <div className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-accent-teal" />
              <span className="text-[10px] text-text-muted">
                {isRunning ? 'Pipeline executing live…' : isDone ? 'Execution complete' : 'Ready to execute'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RDConnectedScreen;
