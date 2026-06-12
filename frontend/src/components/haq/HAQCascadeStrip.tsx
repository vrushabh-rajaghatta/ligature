/**
 * HAQCascadeStrip — v0.44.46
 *
 * Shows cascade-triggered tasks that target the HAQ module.
 * Sits at the top of the HAQ dashboard, above stats.
 *
 * Reads from useCascadeEngine — chains where any step
 * has targetModule === 'haq'.
 */


import { Zap, ChevronRight, X, CheckCircle2 } from 'lucide-react';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import type { CascadeChain, CascadeStep } from '@/store/cascadeEngineTypes';

interface HAQCascadeStripProps {
  /** Called when user clicks a step — navigate to the right HAQ view */
  onStepClick?: (step: CascadeStep, chain: CascadeChain) => void;
}

export function HAQCascadeStrip({ onStepClick }: HAQCascadeStripProps) {
  const { chains, skipStep } = useCascadeEngine();

  // Find steps that target HAQ and are still pending or spawned
  const haqEntries = chains
    .filter(c => c.status !== 'dismissed' && c.status !== 'complete')
    .flatMap(chain =>
      chain.steps
        .filter(
          step =>
            step.targetModule === 'haq' &&
            (step.status === 'pending' || step.status === 'spawned')
        )
        .map(step => ({ chain, step }))
    );

  if (haqEntries.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {haqEntries.map(({ chain, step }) => {
        const isSpawned = step.status === 'spawned';
        const timeAgo = getTimeAgo(chain.trigger.triggeredAt);

        return (
          <div
            key={`${chain.id}-${step.id}`}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl border
              transition-all duration-200
              ${isSpawned
                ? 'bg-amber-500/5 border-amber-500/25 hover:border-amber-500/40'
                : 'bg-amber-500/8 border-amber-500/30 hover:border-amber-500/50'
              }
            `}
          >
            {/* Cascade icon */}
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                  Cascade Task
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-muted truncate">
                  from {chain.trigger.sourceLabel}
                </span>
                {timeAgo && (
                  <span className="text-xs text-text-muted hidden sm:inline">
                    · {timeAgo}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-text-primary mt-0.5 truncate">
                {step.title}
              </p>
              <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">
                {step.description}
              </p>
            </div>

            {/* Actions */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {/* Primary action */}
              <button
                onClick={() => onStepClick?.(step, chain)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-black
                  transition-all duration-150"
              >
                Review
                <ChevronRight className="w-3 h-3" />
              </button>

              {/* Dismiss */}
              <button
                onClick={() => skipStep(chain.id, step.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg
                  text-text-muted hover:text-red-400 hover:bg-red-500/10
                  transition-colors"
                title="Dismiss this task"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────
function getTimeAgo(iso?: string): string {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
