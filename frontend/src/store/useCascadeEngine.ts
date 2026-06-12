
/**
 * useCascadeEngine — v0.44.41
 *
 * Zustand store for cross-module event cascading.
 * Accepts trigger events, instantiates chain steps from definitions,
 * and manages confirmation/dismissal flow.
 *
 * Usage:
 *   const { fireTrigger, confirmChain, dismissChain, pendingChains } = useCascadeEngine();
 *
 *   // Fire from any module when something significant happens:
 *   fireTrigger({
 *     type: 'safety-signal-confirmed',
 *     sourceModule: 'safety',
 *     sourceId: signal.id,
 *     sourceLabel: `Signal ${signal.id} — ${signal.name}`,
 *     metadata: { signalId: signal.id, severity: signal.severity },
 *   });
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import {
  CASCADE_CHAIN_DEFINITIONS,
  type CascadeChain,
  type CascadeChainStatus,
  type CascadeStep,
  type CascadeStepStatus,
  type CascadeTriggerEvent,
  type CascadeTriggerType,
} from './cascadeEngineTypes';

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
interface CascadeEngineState {
  chains: CascadeChain[];

  // Fire a trigger — instantiates a new chain from the definition
  fireTrigger: (
    trigger: Omit<CascadeTriggerEvent, 'id' | 'triggeredAt' | 'triggeredBy'> & {
      triggeredBy?: string;
    }
  ) => CascadeChain | null;

  // Confirm a preview chain — moves all pending steps to 'spawned'
  confirmChain: (chainId: string) => void;

  // Skip a single step within a chain
  skipStep: (chainId: string, stepId: string) => void;

  // Dismiss an entire chain (user declines all)
  dismissChain: (chainId: string) => void;

  // Mark a step's spawned task as complete
  completeStep: (chainId: string, stepId: string, spawnedTaskId?: string) => void;

  // Clear completed/dismissed chains older than 24h
  pruneOldChains: () => void;
  clearAllChains: () => void;

  // Get a single chain by ID
  getChain: (chainId: string) => CascadeChain | undefined;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function recomputeChain(chain: CascadeChain): CascadeChain {
  const pendingSteps = chain.steps.filter(s => s.status === 'pending').length;
  const spawnedSteps = chain.steps.filter(s => s.status === 'spawned').length;
  const requiresConfirmation = chain.steps.some(s => s.risk === 'high' && s.status === 'pending');

  // Auto-complete chain when all steps are resolved
  const allResolved = chain.steps.every(
    s => s.status === 'spawned' || s.status === 'skipped' || s.status === 'completed'
  );

  return {
    ...chain,
    pendingSteps,
    spawnedSteps,
    requiresConfirmation,
    status: allResolved && chain.status !== 'dismissed' ? 'complete' : chain.status,
    completedAt: allResolved && !chain.completedAt ? new Date().toISOString() : chain.completedAt,
  };
}

function instantiateChain(
  trigger: CascadeTriggerEvent,
  triggerType: CascadeTriggerType
): CascadeChain | null {
  const definition = CASCADE_CHAIN_DEFINITIONS.find(d => d.triggerType === triggerType);
  if (!definition) return null;

  const steps: CascadeStep[] = definition.steps.map(stepDef => ({
    ...stepDef,
    id: generateId('step'),
    status: 'pending' as CascadeStepStatus,
  }));

  // Chains with any high-risk step start in 'preview' (awaiting confirmation)
  // Everything else starts in 'running' (auto-spawns via engine)
  const hasHighRisk = steps.some(s => s.risk === 'high');

  const chain: CascadeChain = {
    id: generateId('chain'),
    trigger,
    steps,
    status: hasHighRisk ? 'preview' : 'running',
    createdAt: new Date().toISOString(),
    pendingSteps: steps.length,
    spawnedSteps: 0,
    requiresConfirmation: hasHighRisk,
  };

  return recomputeChain(chain);
}

// ─────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────
export const useCascadeEngine = create<CascadeEngineState>()(
  devtools(
    (set, get) => ({
      chains: [],

      fireTrigger: (triggerInput) => {
        const trigger: CascadeTriggerEvent = {
          id: generateId('trigger'),
          triggeredAt: new Date().toISOString(),
          triggeredBy: triggerInput.triggeredBy ?? 'system',
          type: triggerInput.type,
          sourceModule: triggerInput.sourceModule,
          sourceId: triggerInput.sourceId,
          sourceLabel: triggerInput.sourceLabel,
          metadata: triggerInput.metadata ?? {},
        };

        const chain = instantiateChain(trigger, trigger.type);
        if (!chain) return null;

        set(state => ({ chains: [chain, ...state.chains] }), false, 'fireTrigger');
        return chain;
      },

      confirmChain: (chainId) => {
        set(state => ({
          chains: state.chains.map(chain => {
            if (chain.id !== chainId) return chain;

            const updatedSteps = chain.steps.map(step =>
              step.status === 'pending' ? { ...step, status: 'spawned' as CascadeStepStatus } : step
            );

            return recomputeChain({
              ...chain,
              steps: updatedSteps,
              status: 'running' as CascadeChainStatus,
            });
          }),
        }), false, 'confirmChain');
      },

      skipStep: (chainId, stepId) => {
        set(state => ({
          chains: state.chains.map(chain => {
            if (chain.id !== chainId) return chain;

            const updatedSteps = chain.steps.map(step =>
              step.id === stepId ? { ...step, status: 'skipped' as CascadeStepStatus } : step
            );

            return recomputeChain({ ...chain, steps: updatedSteps });
          }),
        }), false, 'skipStep');
      },

      dismissChain: (chainId) => {
        set(state => ({
          chains: state.chains.map(chain =>
            chain.id === chainId
              ? recomputeChain({ ...chain, status: 'dismissed' as CascadeChainStatus })
              : chain
          ),
        }), false, 'dismissChain');
      },

      completeStep: (chainId, stepId, spawnedTaskId) => {
        set(state => ({
          chains: state.chains.map(chain => {
            if (chain.id !== chainId) return chain;

            const updatedSteps = chain.steps.map(step =>
              step.id === stepId
                ? { ...step, status: 'completed' as CascadeStepStatus, spawnedTaskId }
                : step
            );

            return recomputeChain({ ...chain, steps: updatedSteps });
          }),
        }), false, 'completeStep');
      },

      pruneOldChains: () => {
        const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
        set(state => ({
          chains: state.chains.filter(chain => {
            if (chain.status === 'complete' || chain.status === 'dismissed') {
              return new Date(chain.createdAt).getTime() > cutoff;
            }
            return true;
          }),
        }), false, 'pruneOldChains');
      },

      clearAllChains: () => {
        set({ chains: [] }, false, 'clearAllChains');
      },

      getChain: (chainId) => get().chains.find(c => c.id === chainId),
    }),
    { name: 'cascade-engine' }
  )
);

// ─────────────────────────────────────────────
// Selector hooks
// ─────────────────────────────────────────────

/** All chains needing user attention (preview or running with medium-risk steps) */
export const usePendingCascades = () =>
  useCascadeEngine(
    useShallow(s =>
      s.chains.filter(c => c.status === 'preview' || c.status === 'running')
    )
  );

/** Chains in preview state — waiting for explicit user confirmation */
export const usePreviewCascades = () =>
  useCascadeEngine(
    useShallow(s => s.chains.filter(c => c.status === 'preview'))
  );

/** Count of chains requiring attention */
export const useCascadeCount = () =>
  useCascadeEngine(s =>
    s.chains.filter(c => c.status === 'preview' || c.status === 'running').length
  );

/** Recent completed/dismissed chains for audit trail display */
export const useRecentCascades = () =>
  useCascadeEngine(
    useShallow(s =>
      s.chains
        .filter(c => c.status === 'complete' || c.status === 'dismissed')
        .slice(0, 10)
    )
  );
