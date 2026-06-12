// ============================================================================
// TriggerMilestoneBanner — v0.64.0
// LIG-015 COMPLETE: UQ Template-Driven Date Auto-Calculation from Trigger Milestone
// ============================================================================


import React, { useState } from 'react';
import {
  Zap, Calendar, RefreshCw, CheckCircle2, AlertTriangle,
  ChevronDown, ChevronRight, Info, X, Loader2,
} from 'lucide-react';
import { GlobalSubmissionPlan } from '@/data/global-submission-plan-data';
import { useGlobalPlanStore } from '@/stores/global-plan-store';
import { SUBMISSION_TEMPLATES } from '@/data/global-submission-plan-data';

const UQ_MILESTONES = [
  { id: 'lslv', label: 'LSLV — Last Subject Last Visit', description: 'Final patient visit in pivotal study. Most common trigger for NDA/MAA timelines.' },
  { id: 'dblock', label: 'Database Lock', description: 'Clinical database locked for final analysis. Triggers authoring and statistical analysis tasks.' },
  { id: 'csr-draft', label: 'First Draft CSR Available', description: 'Primary CSR draft complete. Used for expedited review submission timelines.' },
  { id: 'fpi', label: 'FPI — First Patient In', description: 'First patient enrolled. Typically used for early planning of long-duration trials.' },
  { id: 'custom', label: 'Custom milestone…', description: 'Define your own trigger milestone date.' },
];

interface TriggerMilestoneBannerProps {
  plan: GlobalSubmissionPlan;
}

export function TriggerMilestoneBanner({ plan }: TriggerMilestoneBannerProps) {
  const { setTriggerMilestone, recalculateDates } = useGlobalPlanStore();

  const template = SUBMISSION_TEMPLATES.find(t => t.id === plan.templateId);
  const isUQ = template?.isUQ ?? false;

  const [expanded, setExpanded] = useState(!plan.triggerMilestoneDate);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(
    plan.triggerMilestoneName ? 'custom' : ''
  );
  const [milestoneDate, setMilestoneDate] = useState(plan.triggerMilestoneDate ?? '');
  const [customLabel, setCustomLabel] = useState(
    plan.triggerMilestoneName ?? ''
  );
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastResult, setLastResult] = useState<{ count: number; adjusted: number } | null>(null);

  if (!isUQ) return null;

  const selectedMilestone = UQ_MILESTONES.find(m => m.id === selectedMilestoneId);
  const effectiveLabel = selectedMilestoneId === 'custom'
    ? customLabel
    : selectedMilestone?.label ?? '';
  const canCalculate = milestoneDate && effectiveLabel;

  function handleCalculate() {
    if (!canCalculate) return;
    setTriggerMilestone(plan.id, effectiveLabel, milestoneDate);
    setIsCalculating(true);
    setTimeout(() => {
      const result = recalculateDates(plan.id);
      setLastResult(result);
      setIsCalculating(false);
      setExpanded(false);
    }, 800);
  }

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 overflow-hidden mb-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-500/5 transition-colors"
      >
        <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-amber-300">UQ Template — Trigger Milestone</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              {template?.label}
            </span>
            {plan.triggerMilestoneName && (
              <span className="text-xs text-text-muted">
                {plan.triggerMilestoneName} · {plan.triggerMilestoneDate}
              </span>
            )}
          </div>
          {lastResult && (
            <p className="text-xs text-emerald-400 mt-0.5">
              ✓ {lastResult.count} task dates calculated
              {lastResult.adjusted > 0 && ` · ${lastResult.adjusted} adjusted for weekends/holidays`}
            </p>
          )}
          {!plan.triggerMilestoneDate && (
            <p className="text-xs text-amber-400/70 mt-0.5">
              Set a trigger milestone to auto-calculate all task dates
            </p>
          )}
        </div>
        {expanded
          ? <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
          : <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0" />
        }
      </button>

      {/* Expanded config */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-amber-500/20 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {/* Milestone picker */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">
                Trigger Milestone
              </label>
              <div className="space-y-1.5">
                {UQ_MILESTONES.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMilestoneId(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                      selectedMilestoneId === m.id
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : 'border-border bg-surface-card text-text-muted hover:text-text-primary hover:border-border/60'
                    }`}
                  >
                    <div className="font-medium">{m.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{m.description}</div>
                  </button>
                ))}
              </div>
              {selectedMilestoneId === 'custom' && (
                <input
                  type="text"
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  placeholder="Custom milestone name…"
                  className="mt-2 w-full px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-amber-500/50 text-text-primary"
                />
              )}
            </div>

            {/* Date input + info */}
            <div>
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide block mb-2">
                Trigger Date
              </label>
              <input
                type="date"
                value={milestoneDate}
                onChange={e => setMilestoneDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-amber-500/50 text-text-primary mb-3"
              />

              <div className="bg-surface-card border border-border rounded-lg p-3 text-xs text-text-muted space-y-1.5">
                <div className="flex items-start gap-1.5">
                  <Info className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p>Dates are calculated working forward from the trigger milestone using task durations and predecessor links.</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <Calendar className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5" />
                  <p>Dates falling on weekends or holidays (US, EU, JP calendars) are automatically advanced to the next working day.</p>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5" />
                  <p>Manually overridden dates are preserved during recalculation. Clear overrides individually from the task row.</p>
                </div>
              </div>

              <button
                onClick={handleCalculate}
                disabled={!canCalculate || isCalculating}
                className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 text-white font-medium text-sm hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Calculating dates…</>
                  : <><Zap className="w-3.5 h-3.5" />Calculate All Task Dates</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TriggerMilestoneBanner;
