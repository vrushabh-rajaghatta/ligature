/**
 * CascadeBanner — v0.44.43
 *
 * Surfaces pending cascade chains to the user.
 *
 * - preview chains  → expanded confirmation panel (high-risk steps need explicit ok)
 * - running chains  → compact notification strip (medium-risk, auto-spawned)
 *
 * Mounted globally in page.tsx between FilterBar and main content.
 */


import { useState } from 'react';
import {
  Zap, ChevronDown, ChevronUp, CheckCircle2,
  XCircle, SkipForward, AlertTriangle, Info,
  Shield, FileText, Target, ClipboardCheck,
  ArrowRight, ExternalLink, FlaskConical, Tag, Send, HelpCircle,
} from 'lucide-react';
import {
  useCascadeEngine,
  usePendingCascades,
  usePreviewCascades,
} from '@/store/useCascadeEngine';
import { useAppStore } from '@/store/useAppStore';
import type { CascadeChain, CascadeStep } from '@/store/cascadeEngineTypes';

// ─────────────────────────────────────────────
// Module icon map
// ─────────────────────────────────────────────
const MODULE_ICONS: Record<string, React.ReactNode> = {
  qms:         <ClipboardCheck className="w-4 h-4" />,
  authoring:   <FileText className="w-4 h-4" />,
  submissions: <Target className="w-4 h-4" />,
  safety:      <Shield className="w-4 h-4" />,
  regulatory:  <FileText className="w-4 h-4" />,
  ctms:        <ClipboardCheck className="w-4 h-4" />,
  haq:         <HelpCircle className="w-4 h-4" />,
  nonclinical: <FlaskConical className="w-4 h-4" />,
  labeling:    <Tag className="w-4 h-4" />,
  'submissions-hub': <Send className="w-4 h-4" />,
  tmf:         <FileText className="w-4 h-4" />,
};

const MODULE_COLORS: Record<string, string> = {
  qms:         'text-blue-400 bg-blue-500/15 border-blue-500/25',
  authoring:   'text-green-400 bg-green-500/15 border-green-500/25',
  submissions: 'text-amber-400 bg-amber-500/15 border-amber-500/25',
  safety:      'text-red-400 bg-red-500/15 border-red-500/25',
  regulatory:  'text-indigo-400 bg-indigo-500/15 border-indigo-500/25',
  ctms:        'text-emerald-400 bg-emerald-500/15 border-emerald-500/25',
  haq:         'text-violet-400 bg-violet-500/15 border-violet-500/25',
  nonclinical: 'text-orange-400 bg-orange-500/15 border-orange-500/25',
};

const RISK_BADGE: Record<string, string> = {
  low:    'text-green-400 bg-green-500/10',
  medium: 'text-amber-400 bg-amber-500/10',
  high:   'text-red-400 bg-red-500/10',
};

// ─────────────────────────────────────────────
// Single step row inside a preview chain
// ─────────────────────────────────────────────
function StepRow({ step, chainId }: { step: CascadeStep; chainId: string }) {
  const { skipStep } = useCascadeEngine();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const moduleColor = MODULE_COLORS[step.targetModule] ?? 'text-gray-400 bg-gray-500/15 border-gray-500/25';
  const icon = MODULE_ICONS[step.targetModule] ?? <Zap className="w-4 h-4" />;

  const isSkipped = step.status === 'skipped';
  const isSpawned = step.status === 'spawned' || step.status === 'completed';

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border transition-all
      ${isSkipped ? 'opacity-40 line-through' : ''}
      ${isSpawned ? 'opacity-60' : ''}
      ${moduleColor}
    `}>
      {/* Module icon — clickable deep link */}
      <button
        onClick={() => setActiveModule(step.targetModule)}
        className="flex-shrink-0 mt-0.5 hover:opacity-70 transition-opacity"
        title={`Go to ${step.targetModule}`}
      >
        {icon}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary">{step.title}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium uppercase tracking-wide ${RISK_BADGE[step.risk]}`}>
            {step.risk}
          </span>
          {step.estimatedDaysToComplete && (
            <span className="text-xs text-text-muted">~{step.estimatedDaysToComplete}d</span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5 truncate">{step.description}</p>
      </div>

      {/* Deep-link navigate button — spawned steps */}
      {isSpawned && (
        <button
          onClick={() => setActiveModule(step.targetModule)}
          className="flex-shrink-0 flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors px-2 py-1 rounded hover:bg-green-500/10"
          title={`Open ${step.targetModule}`}
        >
          <ArrowRight className="w-3 h-3" />
          Open
        </button>
      )}

      {/* Skip button — only for pending steps */}
      {step.status === 'pending' && (
        <button
          onClick={() => skipStep(chainId, step.id)}
          className="flex-shrink-0 flex items-center gap-1 text-xs text-text-muted hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
          title="Skip this step"
        >
          <SkipForward className="w-3 h-3" />
          Skip
        </button>
      )}

      {/* Spawned checkmark */}
      {isSpawned && (
        <span className="flex-shrink-0 text-green-400">
          <CheckCircle2 className="w-4 h-4" />
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Preview chain — full confirmation panel
// ─────────────────────────────────────────────
function PreviewChainPanel({ chain }: { chain: CascadeChain }) {
  const { confirmChain, dismissChain } = useCascadeEngine();
  const [expanded, setExpanded] = useState(true);
  const pendingCount = chain.steps.filter(s => s.status === 'pending').length;

  return (
    <div className="border border-amber-500/40 bg-amber-500/5 rounded-xl overflow-hidden shadow-lg shadow-amber-500/5">
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-amber-400">Cascade Triggered</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
              {pendingCount} step{pendingCount !== 1 ? 's' : ''} pending
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">
            ↑ {chain.trigger.sourceLabel}
          </p>
        </div>
        <div className="flex-shrink-0 text-text-muted">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Steps */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-xs text-text-muted pb-1">
            Review the downstream actions this event should trigger. Skip any you want to defer.
          </p>

          {chain.steps.map(step => (
            <StepRow key={step.id} step={step} chainId={chain.id} />
          ))}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <button
              onClick={() => dismissChain(chain.id)}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
            >
              <XCircle className="w-4 h-4" />
              Dismiss all
            </button>
            <button
              onClick={() => confirmChain(chain.id)}
              className="flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm &amp; spawn tasks
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Running chain — compact notification strip
// (medium/low risk — already auto-spawned)
// ─────────────────────────────────────────────
function RunningChainStrip({ chain }: { chain: CascadeChain }) {
  const { dismissChain } = useCascadeEngine();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const spawnedCount = chain.steps.filter(s => s.status === 'spawned').length;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/8 border border-blue-500/25 rounded-xl text-sm">
      <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-text-primary font-medium">Tasks auto-created</span>
        <span className="text-text-muted ml-2 truncate">
          {spawnedCount} task{spawnedCount !== 1 ? 's' : ''} spawned from {chain.trigger.sourceLabel}
        </span>
      </div>
      {/* v0.59.0: deep-link to Action Center */}
      <button
        onClick={() => setActiveModule('action-center')}
        className="flex-shrink-0 flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
        title="View in Action Centre"
      >
        View tasks
        <ArrowRight className="w-3 h-3" />
      </button>
      <button
        onClick={() => dismissChain(chain.id)}
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
        title="Dismiss"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main export — floating panel, bottom-right
// ─────────────────────────────────────────────
export function CascadeBanner() {
  const pendingChains = usePendingCascades();
  const previewChains = usePreviewCascades();
  const [panelOpen, setPanelOpen] = useState(false);

  const runningChains = pendingChains.filter(c => c.status === 'running');
  const totalCount = previewChains.length + runningChains.length;

  if (totalCount === 0) return null;

  // Close panel when all chains cleared
  const hasPreview = previewChains.length > 0;

  return (
    <div className="fixed bottom-6 right-24 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel — opens upward */}
      {panelOpen && (
        <div className="w-[420px] max-w-[calc(100vw-7rem)] max-h-[70vh] overflow-y-auto bg-surface-elevated border border-border rounded-xl shadow-2xl shadow-black/30 flex flex-col">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold text-text-primary">Cascade Events</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                {totalCount} active
              </span>
            </div>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-card"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Chain list */}
          <div className="p-3 space-y-2 overflow-y-auto">
            {previewChains.map(chain => (
              <PreviewChainPanel key={chain.id} chain={chain} />
            ))}
            {runningChains.map(chain => (
              <RunningChainStrip key={chain.id} chain={chain} />
            ))}
          </div>
        </div>
      )}

      {/* Collapsed pill trigger */}
      <button
        onClick={() => setPanelOpen(v => !v)}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-full shadow-lg transition-all font-medium text-sm
          ${hasPreview
            ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/30'
            : 'bg-surface-elevated border border-border text-text-secondary hover:text-text-primary shadow-black/20'
          }`}
      >
        <Zap className="w-4 h-4 flex-shrink-0" />
        <span>{totalCount} cascade{totalCount !== 1 ? 's' : ''} pending</span>
        <ChevronUp className={`w-3.5 h-3.5 transition-transform ${panelOpen ? 'rotate-180' : ''}`} />
      </button>
    </div>
  );
}
