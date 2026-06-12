// ============================================================================
// ProvisioningErrorBanner — v0.62.0
// LIG-004 COMPLETE: Provisioning error notification UI
// Shows structured error detail, Retry button, dismiss option
// ============================================================================


import React, { useState } from 'react';
import {
  AlertTriangle, RefreshCw, ChevronDown, ChevronRight,
  X, Clock, FileWarning, Loader2,
} from 'lucide-react';
import { GlobalSubmissionPlan } from '@/data/global-submission-plan-data';
import { useGlobalPlanStore } from '@/stores/global-plan-store';

interface ProvisioningErrorBannerProps {
  plan: GlobalSubmissionPlan;
}

export function ProvisioningErrorBanner({ plan }: ProvisioningErrorBannerProps) {
  const { retryProvisioning, clearProvisioningError } = useGlobalPlanStore();
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (plan.provisioningStatus === 'provisioning') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-4">
        <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-400">Provisioning in progress</p>
          <p className="text-xs text-text-muted mt-0.5">Resolving CPI references and generating task rows…</p>
        </div>
      </div>
    );
  }

  if (plan.provisioningStatus !== 'provisioning-failed' || !plan.provisioningError) {
    return null;
  }

  const err = plan.provisioningError;
  const failedMarkets = plan.submissions
    .filter(s => err.failedSubmissionIds.includes(s.id))
    .map(s => `${s.flag} ${s.market} ${s.type}`);

  function handleRetry() {
    setRetrying(true);
    retryProvisioning(plan.id);
    // Simulate retry completing after 2s
    setTimeout(() => {
      setRetrying(false);
      clearProvisioningError(plan.id);
    }, 2000);
  }

  return (
    <div className="rounded-lg border border-red-500/40 bg-red-500/8 mb-4 overflow-hidden">
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <FileWarning className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-red-400">Provisioning Failed</p>
            <span className="text-xs text-text-muted">·</span>
            <p className="text-xs text-text-muted">
              Failed step: <span className="text-text-secondary">{err.failedStep}</span>
            </p>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Affected: {failedMarkets.join(', ')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1"
          >
            Details
            {expanded
              ? <ChevronDown className="w-3 h-3" />
              : <ChevronRight className="w-3 h-3" />
            }
          </button>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 font-medium"
          >
            {retrying
              ? <><Loader2 className="w-3 h-3 animate-spin" />Retrying…</>
              : <><RefreshCw className="w-3 h-3" />Retry</>
            }
          </button>
          <button
            onClick={() => clearProvisioningError(plan.id)}
            className="p-1 text-text-muted hover:text-text-primary rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-red-500/20 pt-3 bg-red-500/5">
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Error Detail</p>
              <p className="text-sm text-text-secondary font-mono bg-surface rounded p-2 border border-border text-xs leading-relaxed">
                {err.errorReason}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Occurred: {new Date(err.occurredAt).toLocaleString()}</span>
              </div>
            </div>
            <div className="text-xs text-text-secondary bg-amber-500/10 border border-amber-500/20 rounded p-2.5">
              <span className="font-medium text-amber-400">Suggested fix: </span>
              Verify the submission ID exists in Master Data → IDMP registry, then click Retry. Successful tasks already provisioned are preserved.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProvisioningErrorBanner;
