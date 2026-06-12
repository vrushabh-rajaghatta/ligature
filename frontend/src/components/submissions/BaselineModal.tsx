// ============================================================================
// BaselineModal — v0.67.0 — LIG-013
// Confirm dialog for capturing or replacing a plan baseline snapshot.
// ============================================================================


import React from 'react';
import { X, Camera, AlertTriangle, Trash2 } from 'lucide-react';
import { GlobalSubmissionPlan } from '@/data/global-submission-plan-data';

interface BaselineModalProps {
  plan: GlobalSubmissionPlan;
  onConfirm: () => void;
  onClear?: () => void;
  onClose: () => void;
}

function formatTs(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function BaselineModal({ plan, onConfirm, onClear, onClose }: BaselineModalProps) {
  const hasExisting = !!plan.baselineCapturedAt;
  const taskCount = plan.tasks.filter(t => !t.isHolidayRow && t.plannedFinishDate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-card border border-border rounded-xl shadow-2xl w-[480px] overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <Camera className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <p className="font-semibold text-text-primary text-sm">
              {hasExisting ? 'Replace Baseline Snapshot' : 'Set Baseline Snapshot'}
            </p>
            <p className="text-xs text-text-muted">{plan.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">

          {hasExisting && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-amber-300">Existing baseline will be overwritten</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  Set {formatTs(plan.baselineCapturedAt)} by {plan.baselineCapturedBy}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              This will freeze the current planned start and finish dates for{' '}
              <span className="font-semibold text-text-primary">{taskCount} tasks</span> as the
              baseline. Deviation from baseline (+/- days) will appear in the plan grid and on
              export.
            </p>
            <ul className="text-xs text-text-muted space-y-1 pl-4 list-disc">
              <li>Baseline bars will appear in the Gantt Chart view</li>
              <li>Deviation column added to plan grid and print export</li>
              <li>Baseline can be replaced at any time</li>
              <li>Holiday rows are excluded from baseline capture</li>
            </ul>
          </div>

          <div className="p-3 rounded-lg bg-surface border border-border">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-text-primary">{taskCount}</p>
                <p className="text-[10px] text-text-muted">Tasks Captured</p>
              </div>
              <div>
                <p className="text-base font-bold text-text-primary">
                  {plan.tasks.filter(t => !t.isHolidayRow && t.status === 'complete').length}
                </p>
                <p className="text-[10px] text-text-muted">Complete</p>
              </div>
              <div>
                <p className="text-base font-bold text-amber-400">
                  {plan.tasks.filter(t => !t.isHolidayRow && t.isCriticalPath && t.status !== 'complete').length}
                </p>
                <p className="text-[10px] text-text-muted">Critical Open</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-border bg-surface">
          {hasExisting && onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear Baseline
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm rounded-lg border border-border text-text-muted hover:text-text-primary hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            {hasExisting ? 'Replace Baseline' : 'Set Baseline'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BaselineModal;
