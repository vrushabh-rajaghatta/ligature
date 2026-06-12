
import { AlertTriangle, Zap, ChevronRight, X, CheckCircle, Info } from 'lucide-react';
import { CascadeChain } from '@/store/cascadeEngineTypes';
import { useCascadeEngine } from '@/store/useCascadeEngine';

interface CascadeConfirmationModalProps {
  chain: CascadeChain;
  onConfirm: () => void;
  onDismiss: () => void;
}

const MODULE_LABELS: Record<string, string> = {
  safety: 'Safety & PV',
  regulatory: 'Regulatory',
  authoring: 'Authoring',
  haq: 'HAQ Intelligence',
  ctms: 'Clinical Trials',
  submissions: 'Submissions',
  quality: 'Quality',
  nonclinical: 'Nonclinical',
  labeling: 'Labeling',
};

const MODULE_COLORS: Record<string, string> = {
  safety: 'text-accent-red bg-accent-red/10',
  regulatory: 'text-accent-blue bg-accent-blue/10',
  authoring: 'text-accent-purple bg-accent-purple/10',
  haq: 'text-accent-amber bg-accent-amber/10',
  ctms: 'text-accent-green bg-accent-green/10',
  submissions: 'text-accent-blue bg-accent-blue/10',
  quality: 'text-accent-amber bg-accent-amber/10',
  nonclinical: 'text-accent-green bg-accent-green/10',
  labeling: 'text-accent-purple bg-accent-purple/10',
};

export function CascadeConfirmationModal({ chain, onConfirm, onDismiss }: CascadeConfirmationModalProps) {
  const pendingSteps = chain.steps.filter(s => s.status === 'pending');
  const automatedSteps = pendingSteps.filter(s => s.automated);
  const manualSteps = pendingSteps.filter(s => !s.automated);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-lg shadow-2xl">

          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-accent-amber/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Zap className="w-5 h-5 text-accent-amber" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-text-primary">Cascade Ready to Execute</h3>
                <p className="text-sm text-text-muted mt-0.5">{chain.triggerLabel}</p>
              </div>
            </div>
            <button onClick={onDismiss} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">

            {/* Summary */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-border rounded-lg">
                <span className="font-medium text-text-primary">{pendingSteps.length}</span>
                <span className="text-text-muted">actions</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-card border border-border rounded-lg">
                <span className="font-medium text-text-primary">{Array.from(new Set(pendingSteps.map(s => s.targetModule))).length}</span>
                <span className="text-text-muted">modules</span>
              </div>
              {automatedSteps.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-lg">
                  <CheckCircle className="w-3.5 h-3.5 text-accent-green" />
                  <span className="text-accent-green font-medium">{automatedSteps.length} automated</span>
                </div>
              )}
            </div>

            {/* Steps preview */}
            <div className="space-y-2">
              {pendingSteps.map((step, i) => {
                const colorClass = MODULE_COLORS[step.targetModule] || 'text-text-secondary bg-surface-card';
                const label = MODULE_LABELS[step.targetModule] || step.targetModule;
                return (
                  <div key={step.id} className="flex items-start gap-3 p-3 bg-surface-card rounded-lg border border-border">
                    <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                      <span className="text-xs font-mono text-text-muted w-4">{i + 1}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colorClass}`}>
                        {label}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-text-primary leading-snug">{step.description}</div>
                      {step.automated && (
                        <div className="flex items-center gap-1 mt-1">
                          <CheckCircle className="w-3 h-3 text-accent-green" />
                          <span className="text-xs text-accent-green">Automated — no manual action required</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info note */}
            <div className="flex items-start gap-2 p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
              <Info className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
              <p className="text-xs text-text-secondary">
                Automated actions will execute immediately. Task items will appear in each module's Action Centre.
                You can dismiss individual cascade steps from the R&amp;D Connected panel after execution.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2 p-5 border-t border-border">
            <button
              onClick={onConfirm}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              <Zap className="w-4 h-4" />
              Execute Cascade
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 text-sm text-text-secondary border border-border rounded-lg hover:bg-surface-card transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
