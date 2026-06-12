

// ============================================================================
// Cross-Module Lineage Status Widget - v204d-b4
// Status card with Sync All button for orchestrated cross-module sync
// ============================================================================

import { useMemo, useState, useCallback } from 'react';
import {
  Link2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Unlink,
  RefreshCw,
  ChevronRight,
  Database,
  FileText,
  TestTube,
  Loader2,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useUSDMStore } from '@/store/useUSDMStore';
import { useCTMSStore } from '@/store/useCTMSStore';
import { useAuthoringStore } from '@/store/useAuthoringStore';
import {
  generateCrossModuleStatus,
  executeSyncAll,
  getSyncResultSummary,
  planSyncAll,
  type CrossModuleStatus,
  type ModuleSyncStatus,
  type SyncHealth,
  type SyncProgress,
  type SyncAllResult,
  HEALTH_LABELS,
  MODULE_LABELS,
} from '@/services/cross-module-lineage-service';

// ============================================================================
// HEALTH STYLING
// ============================================================================

const healthStyles: Record<SyncHealth, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  healthy: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
  stale: { bg: 'bg-amber-100', text: 'text-amber-700', icon: AlertTriangle },
  conflict: { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle },
  unlinked: { bg: 'bg-slate-100', text: 'text-slate-500', icon: Unlink },
};

const moduleIcons: Record<string, typeof Database> = {
  usdm: Database,
  ctms: TestTube,
  authoring: FileText,
};

// ============================================================================
// MODULE STATUS ROW
// ============================================================================

interface ModuleStatusRowProps {
  status: ModuleSyncStatus;
}

function ModuleStatusRow({ status }: ModuleStatusRowProps) {
  const style = healthStyles[status.health as SyncHealth];
  const HealthIcon = style.icon;
  const ModuleIcon = moduleIcons[status.module as string] || Database;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${style?.bg ?? ''}`}>
          <ModuleIcon className={`h-3.5 w-3.5 ${style?.text ?? ''}`} />
        </div>
        <span className="text-sm font-medium text-slate-700">
          {MODULE_LABELS[status.module]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs text-slate-500">
            {status.linkedCount}/{status.entityCount} linked
          </span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style?.bg ?? ''} ${style?.text ?? ''}`}>
          <HealthIcon className="h-3 w-3" />
          {HEALTH_LABELS[status.health]}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY STATS
// ============================================================================

interface SummaryStatsProps {
  summary: CrossModuleStatus['summary'];
}

function SummaryStats({ summary }: SummaryStatsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 pt-3 border-t border-slate-100">
      <div className="text-center">
        <p className="text-lg font-bold text-slate-900">{summary.totalEntities}</p>
        <p className="text-xs text-slate-500">Total</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-green-600">{summary.linkedEntities}</p>
        <p className="text-xs text-slate-500">Linked</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-amber-600">{summary.staleEntities}</p>
        <p className="text-xs text-slate-500">Stale</p>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-red-600">{summary.conflictEntities}</p>
        <p className="text-xs text-slate-500">Conflicts</p>
      </div>
    </div>
  );
}

// ============================================================================
// LINK COVERAGE BAR
// ============================================================================

interface LinkCoverageBarProps {
  coverage: number;
}

function LinkCoverageBar({ coverage }: LinkCoverageBarProps) {
  const getColor = () => {
    if (coverage >= 80) return 'bg-green-500';
    if (coverage >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">Link Coverage</span>
        <span className="text-xs font-medium text-slate-700">{coverage.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, coverage)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SYNC PROGRESS BAR
// ============================================================================

interface SyncProgressBarProps {
  progress: SyncProgress;
}

function SyncProgressBar({ progress }: SyncProgressBarProps) {
  const percent = (progress.currentStep / progress.totalSteps) * 100;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{progress.message}</span>
        <span className="text-slate-400">{progress.currentStep}/{progress.totalSteps}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// SYNC RESULT TOAST
// ============================================================================

interface SyncResultToastProps {
  result: SyncAllResult;
  onDismiss: () => void;
}

function SyncResultToast({ result, onDismiss }: SyncResultToastProps) {
  const summary = getSyncResultSummary(result);
  const bgColor = result.success ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200';
  const textColor = result.success ? 'text-green-700' : 'text-amber-700';
  const Icon = result.success ? Check : AlertTriangle;
  
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${bgColor} mt-3`}>
      <Icon className={`h-4 w-4 ${textColor}`} />
      <span className={`text-sm ${textColor} flex-1`}>{summary}</span>
      <button 
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600"
      >
        ×
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface CrossModuleLineageStatusProps {
  /** Show compact version (fewer details) */
  compact?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Callback when sync completes */
  onSyncComplete?: (result: SyncAllResult) => void;
}

export function CrossModuleLineageStatus({ 
  compact = false,
  className = '',
  onSyncComplete,
}: CrossModuleLineageStatusProps) {
  // Get data from stores using individual selectors (prevents infinite loops)
  const objectives = useUSDMStore(s => s.objectives);
  const usdmEndpoints = useUSDMStore(s => s.endpoints);
  const lineageIndex = useUSDMStore(s => s.lineageIndex);
  
  const ctmsEndpoints = useCTMSStore(s => s.studyEndpoints);
  
  const csrTemplateResult = useAuthoringStore(s => s.csrTemplateResult);
  const generateCSRFromUSDM = useAuthoringStore(s => s.generateCSRFromUSDM);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncAllResult | null>(null);

  // Compute cross-module status
  const status = useMemo(() => {
    const objectivesList = Object.values(objectives);
    const usdmEndpointsList = Object.values(usdmEndpoints);
    // CTMS endpoints are stored per-study, so we need to flatten
    const ctmsEndpointsList = Object.values(ctmsEndpoints).flat();
    
    return generateCrossModuleStatus(
      objectivesList,
      usdmEndpointsList,
      lineageIndex,
      ctmsEndpointsList,
      csrTemplateResult
    );
  }, [objectives, usdmEndpoints, ctmsEndpoints, csrTemplateResult, lineageIndex]);

  // Check if sync is needed
  const syncNeeded = useMemo(() => {
    const objectivesList = Object.values(objectives);
    const usdmEndpointsList = Object.values(usdmEndpoints);
    const ctmsEndpointsList = Object.values(ctmsEndpoints).flat();
    
    const plan = planSyncAll(objectivesList, usdmEndpointsList, ctmsEndpointsList, csrTemplateResult);
    
    return (
      plan.usdmToCTMS.toCreate.length > 0 ||
      plan.usdmToCTMS.toUpdate.length > 0 ||
      plan.usdmToAuthoring.needsRegeneration
    );
  }, [objectives, usdmEndpoints, ctmsEndpoints, csrTemplateResult]);

  // Handle Sync All
  const handleSyncAll = useCallback(() => {
    setIsSyncing(true);
    setLastSyncResult(null);
    
    const objectivesList = Object.values(objectives);
    const usdmEndpointsList = Object.values(usdmEndpoints);
    const ctmsEndpointsList = Object.values(ctmsEndpoints).flat();
    
    // Execute sync with progress callback
    const result = executeSyncAll(
      objectivesList,
      usdmEndpointsList,
      ctmsEndpointsList,
      csrTemplateResult,
      {
        onProgress: (progress) => {
          setSyncProgress(progress);
        },
      }
    );
    
    // Regenerate CSR if needed
    const selectedStudyId = useUSDMStore.getState().selectedStudyId;
    const selectedStudyDesignId = useUSDMStore.getState().selectedStudyDesignId;
    
    if (result.success && selectedStudyId && selectedStudyDesignId) {
      const plan = planSyncAll(objectivesList, usdmEndpointsList, ctmsEndpointsList, csrTemplateResult);
      if (plan.usdmToAuthoring.needsRegeneration) {
        try {
          generateCSRFromUSDM(
            selectedStudyId,
            selectedStudyDesignId,
            objectivesList,
            usdmEndpointsList,
            {
              includeMethodology: true,
              includeStatisticalApproach: true,
              includePlaceholders: true,
            }
          );
        } catch (err) {
          // CSR generation error handled in result
        }
      }
    }
    
    setIsSyncing(false);
    setSyncProgress(null);
    setLastSyncResult(result);
    onSyncComplete?.(result);
  }, [objectives, usdmEndpoints, ctmsEndpoints, csrTemplateResult, generateCSRFromUSDM, onSyncComplete]);

  // Overall health indicator
  const overallStyle = healthStyles[status.overallHealth as SyncHealth];
  const OverallIcon = overallStyle.icon;

  // Format last sync time
  const lastSyncLabel = useMemo(() => {
    if (!status.generatedAt) return 'Never synced';
    const date = new Date(status.generatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  }, [status.generatedAt]);

  return (
    <Card className={`p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${overallStyle?.bg ?? ''}`}>
            <Link2 className={`h-4 w-4 ${overallStyle?.text ?? ''}`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Cross-Module Lineage</h3>
            {!compact && (
              <p className="text-xs text-slate-500">USDM → CTMS → Authoring sync status</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${overallStyle?.bg ?? ''} ${overallStyle?.text ?? ''}`}>
            <OverallIcon className="h-3 w-3" />
            {HEALTH_LABELS[status.overallHealth as SyncHealth]}
          </div>
        </div>
      </div>

      {/* Sync Progress (when syncing) */}
      {isSyncing && syncProgress && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <SyncProgressBar progress={syncProgress} />
        </div>
      )}

      {/* Module Status Rows */}
      <div className="divide-y divide-slate-50">
        {status.modules.map((moduleStatus: ModuleSyncStatus) => (
          <ModuleStatusRow key={moduleStatus.module} status={moduleStatus} />
        ))}
      </div>

      {/* Link Coverage */}
      <LinkCoverageBar coverage={status.summary.linkCoverage} />

      {/* Summary Stats (only in non-compact mode) */}
      {!compact && <SummaryStats summary={status.summary} />}

      {/* Sync All Button */}
      {!compact && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <Button
            variant={syncNeeded ? 'primary' : 'secondary'}
            size="sm"
            className="w-full"
            onClick={handleSyncAll}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : syncNeeded ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync All Modules
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                All Synced
              </>
            )}
          </Button>
        </div>
      )}

      {/* Sync Result Toast */}
      {lastSyncResult && (
        <SyncResultToast 
          result={lastSyncResult} 
          onDismiss={() => setLastSyncResult(null)} 
        />
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-400">
          Updated {lastSyncLabel}
        </span>
        <span className="text-xs text-slate-400 flex items-center gap-1">
          {status.links.length} active links
        </span>
      </div>
    </Card>
  );
}

export default CrossModuleLineageStatus;
