/**
 * QMSCascadeStrip — v0.44.47
 *
 * Shows cascade-triggered tasks that target the QMS module.
 * Typically: CAPA investigations spawned from confirmed safety signals.
 *
 * Sits at the top of the QMS dashboard above alerts + KPI cards.
 */


import { Zap, ChevronRight, X, Shield } from 'lucide-react';
import { useCascadeEngine } from '@/store/useCascadeEngine';
import type { CascadeChain, CascadeStep } from '@/store/cascadeEngineTypes';

interface QMSCascadeStripProps {
  onStepClick?: (step: CascadeStep, chain: CascadeChain) => void;
}

export function QMSCascadeStrip({ onStepClick }: QMSCascadeStripProps) {
  const { chains, skipStep } = useCascadeEngine();

  const qmsEntries = chains
    .filter(c => c.status !== 'dismissed' && c.status !== 'complete')
    .flatMap(chain =>
      chain.steps
        .filter(s => s.targetModule === 'qms' && (s.status === 'pending' || s.status === 'spawned'))
        .map(step => ({ chain, step }))
    );

  if (qmsEntries.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {qmsEntries.map(({ chain, step }) => {
        const diffMs = Date.now() - new Date(chain.trigger.triggeredAt).getTime();
        const mins = Math.floor(diffMs / 60000);
        const timeAgo = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;

        return (
          <div
            key={`${chain.id}-${step.id}`}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border
              bg-blue-500/5 border-blue-500/25 hover:border-blue-500/40
              transition-all duration-150"
          >
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
                  Cascade — CAPA Required
                </span>
                <span className="text-xs text-text-muted">· {timeAgo}</span>
              </div>
              <p className="text-sm font-medium text-text-primary mt-0.5 truncate">
                {step.title}
              </p>
              <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">
                Triggered by: {chain.trigger.sourceLabel}
              </p>
            </div>

            <div className="flex-shrink-0 flex items-center gap-2">
              <button
                onClick={() => onStepClick?.(step, chain)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-blue-500/15 text-blue-400 hover:bg-blue-500 hover:text-white
                  transition-all duration-150"
              >
                <Shield className="w-3 h-3" />
                Open Investigation
              </button>
              <button
                onClick={() => skipStep(chain.id, step.id)}
                className="w-6 h-6 flex items-center justify-center rounded-lg
                  text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Dismiss"
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
