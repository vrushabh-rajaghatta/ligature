

/**
 * Supply Chain Screen - v0.4.3
 * 
 * Suppliability Status Center with Action Center & Disposition Workflows
 * Core value prop: "See the problem, understand the impact, view the connections, TAKE ACTION"
 * 
 * Features:
 * - Real-time suppliability dashboard (RAG status by SKU/region)
 * - Risk indicators with cross-module event sources
 * - Decision tracking with full audit trail
 * - Inventory visibility by tier
 * - Batch Genealogy visualization (v0.4.1)
 * - L5 Impact Analysis (v0.4.1)
 * - Cross-Module Linkage Visualization (v0.4.2)
 * - Action Center & Disposition Workflows (v0.4.3)
 * - Demo simulation for investor presentations
 */

import { useState, useMemo } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp,
  Activity,
  ClipboardList,
  Boxes,
  Bell,
  Play,
  RotateCcw,
  Zap,
  ExternalLink,
  ChevronRight,
  Clock,
  Users,
  Building,
  FileWarning,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  GitBranch,
  Network,
  AlertOctagon,
  Factory,
  MapPin,
  Link2,
  ChevronDown,
  FileText,
  Shield,
  Heart,
  Tag,
  Send,
  // v0.4.3 imports
  PlayCircle,
  CheckSquare,
  Timer,
  UserCheck,
  FileCheck,
  Search,
  Gavel,
  History,
  CircleDot,
  ArrowRightCircle,
  Ban,
  Pause,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { 
  useSupplyChainStore, 
  useCriticalAlerts, 
  usePendingDecisions, 
  useFilteredStatuses,
  useAffectedBatches,
  useBatchGenealogyChain,
  useCurrentImpactAnalysis,
} from '@/store/useSupplyChainStore';
import { 
  SupplyStatus, 
  Region, 
  getStatusColor, 
  getStatusBgColor,
  getSeverityColor,
  formatRegion,
  getTierLabel,
  SupplyDecision,
  SuppliabilityStatus,
  SupplyAlert,
  Batch,
  getBatchTypeLabel,
  getBatchStatusColor,
  getBatchStatusBg,
  getManufacturingSite,
  // v0.4.2 imports
  CrossModuleSummary,
  EntityConnection,
  ModuleType,
  getEntityConnections,
  getModuleColor,
  getEntityTypeLabel,
  getPriorityColor,
  getPriorityBg,
  MODULE_COLORS,
  // v0.4.3 imports
  QuickAction,
  BatchAction,
  DispositionWorkflow,
  ActionTimelineEntry,
  DispositionDecision,
  QUICK_ACTIONS,
  getBatchActions,
  getBatchDispositionWorkflow,
  getBatchActionTimeline,
  getQuickActionsForConnection,
  getActionTypeLabel,
  getDispositionLabel,
  pendingActionsQueue,
} from '@/data/supply-chain-data';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { FilterState } from '@/components/layout/FilterBar';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusIndicator({ status }: { status: SupplyStatus }) {
  const colorClass = getStatusColor(status);
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${status === 'green' ? 'bg-green-500' : status === 'amber' ? 'bg-amber-500' : 'bg-red-500'}`} />
      <span className={`text-sm font-medium uppercase ${colorClass}`}>{status}</span>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') {
    return <TrendingUp className="w-4 h-4 text-green-500" />;
  } else if (trend === 'declining') {
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  }
  return <Activity className="w-4 h-4 text-gray-400" />;
}

function SuppliabilityCard({ status, onClick }: { status: SuppliabilityStatus; onClick: () => void }) {
  const skus = useSupplyChainStore((s) => s.skus);
  const sku = skus.find((s) => s.id === status.skuId);
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-lg ${getStatusBgColor(status.status)}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="font-semibold text-text-primary">{sku?.name || status.skuId}</div>
          <div className="text-sm text-text-muted">{formatRegion(status.region)}</div>
        </div>
        <StatusIndicator status={status.status} />
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold text-text-primary">{status.weeksOfSupply}</div>
          <div className="text-xs text-text-muted">weeks of supply</div>
        </div>
        <div className="flex items-center gap-2">
          <TrendIndicator trend={status.trend} />
          {status.projectedStockoutDate && (
            <div className="text-xs text-red-500 font-medium">
              Stockout: {new Date(status.projectedStockoutDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
      
      {status.riskFactors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <AlertTriangle className="w-3 h-3" />
            {status.riskFactors.length} active risk{status.riskFactors.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </button>
  );
}

function AlertCard({ alert }: { alert: SupplyAlert }) {
  const acknowledgeAlert = useSupplyChainStore((s) => s.acknowledgeAlert);
  
  return (
    <div className={`p-4 rounded-lg border ${
      alert.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
      alert.severity === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
      'bg-blue-500/10 border-blue-500/30'
    }`}>
      <div className="flex items-start gap-3">
        {alert.severity === 'critical' ? (
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        ) : alert.severity === 'warning' ? (
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        ) : (
          <Bell className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-text-primary">{alert.title}</div>
          <div className="text-sm text-text-secondary mt-1">{alert.message}</div>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span>{new Date(alert.createdAt).toLocaleString()}</span>
            {alert.sourceModule && (
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                From: {alert.sourceModule.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {!alert.acknowledgedAt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => acknowledgeAlert(alert.id, 'Current User')}
          >
            Acknowledge
          </Button>
        )}
      </div>
    </div>
  );
}

function DecisionCard({ decision }: { decision: SupplyDecision }) {
  const skus = useSupplyChainStore((s) => s.skus);
  const selectDecisionOption = useSupplyChainStore((s) => s.selectDecisionOption);
  const updateDecisionStatus = useSupplyChainStore((s) => s.updateDecisionStatus);
  const sku = skus.find((s) => s.id === decision.skuId);
  
    const { deadClick } = useDeadClick();
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface-card">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-elevated">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge color={decision.priority === 'critical' ? 'red' : decision.priority === 'urgent' ? 'amber' : 'gray'}>
                {decision.priority.toUpperCase()}
              </Badge>
              <Badge variant="outline" color="gray">{decision.decisionType}</Badge>
            </div>
            <div className="font-semibold text-text-primary mt-2">
              {sku?.name || decision.skuId} - {formatRegion(decision.region)}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-medium ${
              decision.status === 'pending' ? 'text-amber-500' :
              decision.status === 'approved' ? 'text-green-500' :
              decision.status === 'rejected' ? 'text-red-500' :
              'text-blue-500'
            }`}>
              {decision.status.toUpperCase()}
            </div>
            <div className="text-xs text-text-muted mt-1">
              {new Date(decision.requestedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
      
      {/* Body */}
      <div className="p-4">
        <div className="text-sm text-text-secondary mb-4">{decision.rationale}</div>
        
        {decision.impactAssessment && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-4">
            <div className="text-xs font-medium text-amber-600 uppercase mb-1">Impact Assessment</div>
            <div className="text-sm text-text-primary">{decision.impactAssessment}</div>
          </div>
        )}
        
        {/* Options */}
        {decision.options && decision.options.length > 0 && decision.status === 'pending' && (
          <div className="space-y-2 mb-4">
            <div className="text-xs font-medium text-text-muted uppercase">Decision Options</div>
            {decision.options.map((option) => (
              <button
                key={option.id}
                onClick={() => selectDecisionOption(decision.id, option.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  decision.selectedOptionId === option.id
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border hover:border-accent-blue/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-text-primary">{option.label}</span>
                  <Badge color={
                    option.riskLevel === 'low' ? 'green' :
                    option.riskLevel === 'medium' ? 'amber' :
                    'red'
                  }>
                    {option.riskLevel} risk
                  </Badge>
                </div>
                <div className="text-sm text-text-secondary">{option.description}</div>
                <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                  <span>⏱ {option.timeToImplement}</span>
                  <span>📊 {option.estimatedImpact}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        
        {/* Action buttons for pending decisions */}
        {decision.status === 'pending' && decision.selectedOptionId && (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => updateDecisionStatus(decision.id, 'approved', 'Current User')}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Decision
            </Button>
            <Button
              variant="outline"
              onClick={() => updateDecisionStatus(decision.id, 'rejected', 'Current User')}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
          </div>
        )}
        
        {/* Audit trail toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm text-accent-blue hover:underline mt-4"
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {expanded ? 'Hide' : 'Show'} Audit Trail ({decision.auditTrail.length} entries)
        </button>
        
        {expanded && (
          <div className="mt-3 space-y-2 pl-4 border-l-2 border-border">
            {decision.auditTrail.map((entry) => (
              <div key={entry.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary">{entry.action}</span>
                  {entry.linkedEntityType && (
                    <Badge variant="outline" className="text-xs">
                      {entry.linkedEntityType}: {entry.linkedEntityId}
                    </Badge>
                  )}
                </div>
                <div className="text-text-secondary">{entry.details}</div>
                <div className="text-xs text-text-muted">
                  {new Date(entry.timestamp).toLocaleString()} • {entry.user}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SupplyChainScreenProps {
  filters?: FilterState;
}

export function SupplyChainScreen({ filters }: SupplyChainScreenProps) {
  const activeView = useSupplyChainStore((s) => s.activeView);
  const setActiveView = useSupplyChainStore((s) => s.setActiveView);
  const selectedRegion = useSupplyChainStore((s) => s.selectedRegion);
  const setSelectedRegion = useSupplyChainStore((s) => s.setSelectedRegion);
  
  const statuses = useFilteredStatuses();
  const criticalAlerts = useCriticalAlerts();
  const pendingDecisions = usePendingDecisions();
  const inventoryPositions = useSupplyChainStore((s) => s.inventoryPositions);
  const alerts = useSupplyChainStore((s) => s.alerts);
  const decisions = useSupplyChainStore((s) => s.decisions);
  
  // Calculate summary stats
  const redCount = statuses.filter((s) => s.status === 'red').length;
  const amberCount = statuses.filter((s) => s.status === 'amber').length;
  const greenCount = statuses.filter((s) => s.status === 'green').length;
  
  const views = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Activity },
    { id: 'genealogy' as const, label: 'Batch Genealogy', icon: GitBranch },
    { id: 'impact' as const, label: 'Impact Analysis', icon: Network },
    { id: 'connections' as const, label: 'Connections', icon: Link2 },
    { id: 'actions' as const, label: 'Action Center', icon: PlayCircle },
    { id: 'inventory' as const, label: 'Inventory', icon: Boxes },
    { id: 'decisions' as const, label: 'Decisions', icon: ClipboardList, count: pendingDecisions.length },
    { id: 'alerts' as const, label: 'Alerts', icon: Bell, count: criticalAlerts.length },
  ];
  
  const regions: (Region | 'all')[] = ['all', 'US', 'EU', 'JP', 'CN'];
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-surface-elevated">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              <Package className="w-7 h-7 text-accent-purple" />
              Suppliability Status Center
            </h1>
            <p className="text-text-muted mt-1">
              Real-time supply visibility with cross-module risk integration
            </p>
          </div>
          
          {/* Region Filter */}
          <div className="flex items-center gap-2">
            {regions.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  selectedRegion === region
                    ? 'bg-accent-purple text-white'
                    : 'bg-surface-card text-text-secondary hover:text-text-primary'
                }`}
              >
                {region === 'all' ? 'All Regions' : region}
              </button>
            ))}
          </div>
        </div>
        
        {/* View Tabs */}
        <div className="flex items-center gap-1">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeView === view.id
                  ? 'bg-accent-purple text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
              }`}
            >
              <view.icon className="w-4 h-4" />
              {view.label}
              {view.count !== undefined && view.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                  activeView === view.id ? 'bg-white/20' : 'bg-red-500 text-white'
                }`}>
                  {view.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'dashboard' && (
          <div className="space-y-4 md:space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className={`rounded-lg ${redCount > 0 ? 'ring-1 ring-red-500/50 bg-red-500/5' : ''}`}>
                <StatCard
                  title="Critical (Red)"
                  value={redCount}
                  icon={<AlertCircle className="w-5 h-5" />}
                  variant="red"
                />
              </div>
              <div className={`rounded-lg ${amberCount > 0 ? 'ring-1 ring-amber-500/50 bg-amber-500/5' : ''}`}>
                <StatCard
                  title="At Risk (Amber)"
                  value={amberCount}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  variant="amber"
                />
              </div>
              <div className="rounded-lg ring-1 ring-green-500/50 bg-green-500/5">
                <StatCard
                  title="Healthy (Green)"
                  value={greenCount}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  variant="green"
                />
              </div>
              <div className="rounded-lg">
                <StatCard
                  title="Pending Decisions"
                  value={pendingDecisions.length}
                  icon={<ClipboardList className="w-5 h-5" />}
                  variant="purple"
                />
              </div>
            </div>
            
            {/* Critical Alerts */}
            {criticalAlerts.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Critical Alerts
                </h2>
                <div className="space-y-3">
                  {criticalAlerts.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Suppliability Grid */}
            <div>
              <h2 className="text-lg font-semibold text-text-primary mb-3">
                Suppliability by SKU & Region
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {statuses.map((status) => (
                  <SuppliabilityCard
                    key={status.id}
                    status={status}
                    onClick={() => {
                      // Could navigate to detail view
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeView === 'decisions' && (
          <div className="space-y-4 md:space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">
                Supply Decisions ({decisions.length})
              </h2>
            </div>
            
            {pendingDecisions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-amber-600 uppercase mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Decisions ({pendingDecisions.length})
                </h3>
                <div className="space-y-4">
                  {pendingDecisions.map((decision) => (
                    <DecisionCard key={decision.id} decision={decision} />
                  ))}
                </div>
              </div>
            )}
            
            {decisions.filter((d) => d.status !== 'pending').length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-text-muted uppercase mb-3">
                  Resolved Decisions
                </h3>
                <div className="space-y-4">
                  {decisions.filter((d) => d.status !== 'pending').map((decision) => (
                    <DecisionCard key={decision.id} decision={decision} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeView === 'alerts' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              All Alerts ({alerts.filter((a) => !a.resolved).length} active)
            </h2>
            {alerts.filter((a) => !a.resolved).map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
            
            {alerts.filter((a) => a.resolved).length > 0 && (
              <>
                <h3 className="text-sm font-medium text-text-muted uppercase mt-6">
                  Resolved
                </h3>
                {alerts.filter((a) => a.resolved).map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </>
            )}
          </div>
        )}
        
        {activeView === 'inventory' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">
              Inventory Positions
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-medium text-text-muted">SKU</th>
                    <th className="text-left py-3 px-4 font-medium text-text-muted">Region</th>
                    <th className="text-left py-3 px-4 font-medium text-text-muted">Tier</th>
                    <th className="text-right py-3 px-4 font-medium text-text-muted">Quantity</th>
                    <th className="text-left py-3 px-4 font-medium text-text-muted">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-text-muted">Expiry</th>
                    <th className="text-left py-3 px-4 font-medium text-text-muted">Batches</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryPositions.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/50 hover:bg-surface-card/50">
                      <td className="py-3 px-4 font-medium text-text-primary">{inv.skuId}</td>
                      <td className="py-3 px-4 text-text-secondary">{inv.region}</td>
                      <td className="py-3 px-4 text-text-secondary">{getTierLabel(inv.tier)}</td>
                      <td className="py-3 px-4 text-right font-mono text-text-primary">
                        {inv.quantity.toLocaleString()} {inv.unit}
                      </td>
                      <td className="py-3 px-4">
                        <Badge color={
                          inv.status === 'available' ? 'green' :
                          inv.status === 'quarantine' ? 'red' :
                          inv.status === 'hold' ? 'amber' :
                          'gray'
                        }>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">
                        {new Date(inv.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-text-muted text-xs">
                        {inv.batchIds.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* v0.4.1: Batch Genealogy View */}
        {activeView === 'genealogy' && <BatchGenealogyView />}
        
        {/* v0.4.1: Impact Analysis View */}
        {activeView === 'impact' && <ImpactAnalysisView />}
        
        {/* v0.4.2: Cross-Module Connections View */}
        {activeView === 'connections' && <ConnectionsExplorerView />}
        
        {/* v0.4.3: Action Center View */}
        {activeView === 'actions' && <ActionCenterView />}
      </div>
    </div>
  );
}

// ============================================================================
// BATCH GENEALOGY VIEW (v0.4.1)
// ============================================================================

function BatchGenealogyView() {
  const batches = useSupplyChainStore((s) => s.batches);
  const selectedBatch = useSupplyChainStore((s) => s.selectedBatch);
  const setSelectedBatch = useSupplyChainStore((s) => s.setSelectedBatch);
  const setActiveView = useSupplyChainStore((s) => s.setActiveView);
  const runImpactAnalysis = useSupplyChainStore((s) => s.runImpactAnalysis);
  const affectedBatches = useAffectedBatches();
  const { upstream, current, downstream } = useBatchGenealogyChain(selectedBatch);
  
  const batchTypes = ['api', 'bulk-ds', 'drug-product', 'packaged'] as const;
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-accent-purple" />
            Batch Genealogy
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Trace batch lineage from API to packaged product
          </p>
        </div>
        
        {affectedBatches.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-500">
              {affectedBatches.length} batch{affectedBatches.length > 1 ? 'es' : ''} affected
            </span>
          </div>
        )}
      </div>
      
      {/* Manufacturing Flow Visualization */}
      <Card className="p-4 md:p-6">
        <h3 className="text-sm font-medium text-text-muted uppercase mb-4">
          Manufacturing Pipeline
        </h3>
        <div className="flex items-start gap-4 overflow-x-auto pb-4">
          {batchTypes.map((type, idx) => {
            const typeBatches = batches.filter((b) => b.type === type);
            const hasAffected = typeBatches.some(
              (b) => b.status === 'quarantine' || b.status === 'rejected'
            );
            
            return (
              <div key={type} className="flex items-start gap-4">
                <div className={`min-w-[200px] p-4 rounded-lg border-2 ${
                  hasAffected ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-surface-card'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Factory className="w-4 h-4 text-text-muted" />
                    <span className="text-sm font-medium text-text-primary">
                      {getBatchTypeLabel(type)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {typeBatches.map((batch) => {
                      const site = getManufacturingSite(batch.manufacturingSiteId);
                      const isSelected = selectedBatch === batch.id;
                      
                      return (
                        <button
                          key={batch.id}
                          onClick={() => setSelectedBatch(batch.id)}
                          className={`w-full text-left p-2 rounded-lg transition-all ${
                            isSelected 
                              ? 'ring-2 ring-accent-purple bg-accent-purple/10' 
                              : 'hover:bg-surface-elevated'
                          } ${getBatchStatusBg(batch.status)}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-medium text-text-primary">
                              {batch.batchNumber}
                            </span>
                            <span className={`text-xs ${getBatchStatusColor(batch.status)}`}>
                              {batch.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-text-muted">
                            <MapPin className="w-3 h-3" />
                            {site?.siteCode || 'Unknown'}
                          </div>
                          {batch.deviationIds.length > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-xs text-amber-500">
                                {batch.deviationIds.length} deviation{batch.deviationIds.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                {idx < batchTypes.length - 1 && (
                  <div className="flex items-center h-full pt-16">
                    <ArrowRight className="w-6 h-6 text-text-muted" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      
      {/* Selected Batch Detail */}
      {current && (
        <Card className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                Batch {current.batchNumber}
              </h3>
              <p className="text-sm text-text-muted">
                {getBatchTypeLabel(current.type)} • {current.quantity} {current.unit}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setActiveView('connections');
                }}
              >
                <Link2 className="w-4 h-4 mr-2" />
                View Connections
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  runImpactAnalysis(current.id);
                  setActiveView('impact');
                }}
              >
                <Network className="w-4 h-4 mr-2" />
                Run Impact Analysis
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Upstream Batches */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-muted uppercase flex items-center gap-2">
                <ArrowRight className="w-4 h-4 rotate-180" />
                Upstream ({upstream.length})
              </h4>
              {upstream.length === 0 ? (
                <p className="text-sm text-text-muted italic">No upstream batches (source material)</p>
              ) : (
                upstream.map((b) => (
                  <div key={b.id} className={`p-3 rounded-lg ${getBatchStatusBg(b.status)}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium">{b.batchNumber}</span>
                      <span className={`text-xs ${getBatchStatusColor(b.status)}`}>{b.status}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {getBatchTypeLabel(b.type)} • {b.quantity} {b.unit}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* Current Batch Details */}
            <div className={`p-4 rounded-lg border-2 ${getBatchStatusBg(current.status)}`}>
              <h4 className="text-sm font-medium text-text-primary mb-3">Specifications</h4>
              <div className="space-y-2">
                {Object.entries(current.specifications).map(([test, result]) => (
                  <div key={test} className="flex items-center justify-between text-sm">
                    <span className="text-text-muted">{test}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{result.value}</span>
                      {result.result === 'pass' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : result.result === 'fail' ? (
                        <XCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {current.deviationIds.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-red-500 mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Linked Deviations
                  </h4>
                  {current.deviationIds.map((devId) => (
                    <div key={devId} className="text-sm text-text-primary font-mono bg-red-500/10 px-2 py-1 rounded">
                      {devId}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Downstream Batches */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-text-muted uppercase flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                Downstream ({downstream.length})
              </h4>
              {downstream.length === 0 ? (
                <p className="text-sm text-text-muted italic">No downstream batches yet</p>
              ) : (
                downstream.map((b) => (
                  <div key={b.id} className={`p-3 rounded-lg ${getBatchStatusBg(b.status)}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono font-medium">{b.batchNumber}</span>
                      <span className={`text-xs ${getBatchStatusColor(b.status)}`}>{b.status}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      {getBatchTypeLabel(b.type)} • {b.quantity} {b.unit}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* v0.4.2: Quick Connections Preview */}
          <BatchConnectionsPreview batchId={current.id} batchNumber={current.batchNumber} />
        </Card>
      )}
      
      {!current && (
        <Card className="p-4 md:p-6 border border-border-subtle bg-surface-elevated/50">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-surface-elevated">
              <Package className="w-6 h-6 text-text-muted" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Select a Batch</h3>
              <p className="text-sm text-text-muted mt-1">
                Click any batch in the pipeline above to view its lineage and trace material flow across the supply chain.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// IMPACT ANALYSIS VIEW (v0.4.1)
// ============================================================================

function ImpactAnalysisView() {
  const currentAnalysis = useCurrentImpactAnalysis();
  const batches = useSupplyChainStore((s) => s.batches);
  const setSelectedBatch = useSupplyChainStore((s) => s.setSelectedBatch);
  const setActiveView = useSupplyChainStore((s) => s.setActiveView);
  const runImpactAnalysis = useSupplyChainStore((s) => s.runImpactAnalysis);
  const clearImpactAnalysis = useSupplyChainStore((s) => s.clearImpactAnalysis);
  const affectedBatches = useAffectedBatches();
  
  // Pre-select the problem batch if no analysis running
  const handleRunAnalysis = () => {
    const problemBatch = batches.find((b) => b.batchNumber === 'DS-LIG2847-003');
    if (problemBatch) {
      runImpactAnalysis(problemBatch.id);
    }
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Network className="w-5 h-5 text-accent-purple" />
            L5 Impact Analysis
          </h2>
          <p className="text-sm text-text-muted mt-1">
            "If X breaks, what's affected?" — Full cascade analysis
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {currentAnalysis && (
            <Button variant="outline" size="sm" onClick={clearImpactAnalysis}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear Analysis
            </Button>
          )}
          <Button 
            variant="primary" 
            size="sm" 
            onClick={handleRunAnalysis}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Analyze Problem Batch
          </Button>
        </div>
      </div>
      
      {!currentAnalysis ? (
        /* No Analysis Running */
        <Card className="p-8">
          <div className="text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-accent-purple/10 flex items-center justify-center mx-auto mb-4">
              <Network className="w-8 h-8 text-accent-purple" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Impact Analysis Ready
            </h3>
            <p className="text-text-muted mb-6">
              Select a batch from the Genealogy view to analyze its impact, or click below to 
              analyze the current problem batch (DS-LIG2847-003) and see the contamination cascade.
            </p>
            <Button variant="primary" onClick={handleRunAnalysis}>
              <Zap className="w-4 h-4 mr-2" />
              Run Impact Analysis
            </Button>
          </div>
        </Card>
      ) : (
        /* Analysis Results */
        <>
          {/* Source Event */}
          <Card className="p-4 border-2 border-red-500/30 bg-red-500/5">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-red-500/20">
                <AlertOctagon className="w-6 h-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-text-primary">Source Issue</h3>
                <p className="text-sm text-text-muted mt-1">
                  {currentAnalysis.sourceDescription}
                </p>
                <div className="text-xs text-text-muted mt-2">
                  Analyzed: {new Date(currentAnalysis.analysisTimestamp).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Patient Impact Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <StatCard
              title="Regions Affected"
              value={currentAnalysis.patientImpact.regionsAffected.join(', ') || 'None'}
              icon={<MapPin className="w-5 h-5" />}
              variant="red"
            />
            <StatCard
              title="Patients at Risk"
              value={currentAnalysis.patientImpact.estimatedPatientsAffected.toLocaleString()}
              icon={<Users className="w-5 h-5" />}
              variant="red"
            />
            <StatCard
              title="Supply Gap"
              value={`${currentAnalysis.patientImpact.supplyGapWeeks} weeks`}
              icon={<Clock className="w-5 h-5" />}
              variant={currentAnalysis.patientImpact.supplyGapWeeks > 2 ? 'red' : 'amber'}
            />
          </div>
          
          {/* Cascade Visualization */}
          <Card className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-text-muted uppercase mb-4">
              Impact Cascade
            </h3>
            
            <div className="space-y-4">
              {/* Upstream Impacts */}
              {currentAnalysis.upstreamImpacts.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-text-muted uppercase mb-2 flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    Upstream (Source Trace)
                  </h4>
                  <div className="space-y-2 ml-6">
                    {currentAnalysis.upstreamImpacts.map((node) => (
                      <ImpactNodeCard key={node.entityId} node={node} />
                    ))}
                  </div>
                </div>
              )}
              
              {/* Downstream Impacts */}
              <div>
                <h4 className="text-xs font-medium text-text-muted uppercase mb-2 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4" />
                  Downstream (Affected Items)
                </h4>
                <div className="space-y-2 ml-6">
                  {currentAnalysis.downstreamImpacts.map((node) => (
                    <ImpactNodeCard key={node.entityId} node={node} />
                  ))}
                </div>
              </div>
            </div>
          </Card>
          
          {/* Mitigation Options */}
          <Card className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-text-muted uppercase mb-4">
              Mitigation Options
            </h3>
            <div className="space-y-3">
              {currentAnalysis.mitigationOptions.map((option, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-surface-card hover:bg-surface-elevated transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-accent-purple">{idx + 1}</span>
                  </div>
                  <span className="text-sm text-text-primary">{option}</span>
                </div>
              ))}
            </div>
          </Card>
          
          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setActiveView('genealogy');
              }}
            >
              <GitBranch className="w-4 h-4 mr-2" />
              View in Genealogy
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setActiveView('decisions');
              }}
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Go to Decisions
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ImpactNodeCard({ node }: { node: { entityId: string; entityType: string; name: string; status: string; impact: string; description: string; depth: number } }) {
  const getStatusStyles = () => {
    switch (node.status) {
      case 'affected':
        return 'border-red-500/50 bg-red-500/10';
      case 'at-risk':
        return 'border-amber-500/50 bg-amber-500/10';
      default:
        return 'border-green-500/50 bg-green-500/10';
    }
  };
  
  const getTypeIcon = () => {
    switch (node.entityType) {
      case 'batch':
        return <Package className="w-4 h-4" />;
      case 'inventory':
        return <Boxes className="w-4 h-4" />;
      case 'sku':
        return <Building className="w-4 h-4" />;
      case 'decision':
        return <ClipboardList className="w-4 h-4" />;
      case 'patient-supply':
        return <Users className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  
  return (
    <div className={`p-3 rounded-lg border ${getStatusStyles()}`} style={{ marginLeft: `${(node.depth - 1) * 20}px` }}>
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded ${
          node.status === 'affected' ? 'bg-red-500/20 text-red-500' :
          node.status === 'at-risk' ? 'bg-amber-500/20 text-amber-500' :
          'bg-green-500/20 text-green-500'
        }`}>
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary text-sm truncate">{node.name}</span>
            <Badge color={node.impact === 'direct' ? 'red' : 'amber'} size="sm">
              {node.impact}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">{node.description}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BATCH CONNECTIONS PREVIEW (v0.4.2)
// Compact view of cross-module connections shown in batch detail
// ============================================================================

function BatchConnectionsPreview({ batchId, batchNumber }: { batchId: string; batchNumber: string }) {
  const setActiveView = useSupplyChainStore((s) => s.setActiveView);
  const connections = useMemo(() => getEntityConnections(batchId), [batchId]);
  
  if (!connections) return null;
  
  const allConnections = Object.values(connections.connectionsByModule).flat();
  const criticalConnections = allConnections.filter(c => c.priority === 'critical');
  
  return (
    <div className="mt-6 pt-6 border-t border-border">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h4 className="text-sm font-medium text-text-muted uppercase flex items-center gap-2">
          <Link2 className="w-4 h-4" />
          Cross-Module Connections ({connections.totalConnections})
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveView('connections')}
        >
          View All
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      
      {/* Module pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(connections.connectionsByModule).map(([module, conns]) => (
          <div 
            key={module}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card border border-border"
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: getModuleColor(module) }}
            />
            <span className="text-sm text-text-secondary">{module}</span>
            <Badge size="sm" color="gray">{conns.length}</Badge>
          </div>
        ))}
      </div>
      
      {/* Critical connections highlight */}
      {criticalConnections.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-medium text-red-500 uppercase flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Critical Connections
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {criticalConnections.slice(0, 4).map((conn) => (
              <div 
                key={conn.entityId}
                className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-sm"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: getModuleColor(conn.module) }}
                  />
                  <span className="font-medium text-text-primary truncate">
                    {conn.displayName}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1 ml-4">
                  {conn.linkDescription}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CROSS-MODULE CONNECTIONS PANEL (v0.4.2)
// ============================================================================

interface ConnectionsPanelProps {
  entityId: string;
  entityType: ModuleType;
  entityName: string;
  onNavigate?: (module: string, entityId: string) => void;
}

function ConnectionsPanel({ entityId, entityType, entityName, onNavigate }: ConnectionsPanelProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const connections = useMemo(() => getEntityConnections(entityId), [entityId]);
  
  if (!connections) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-center">
        <Link2 className="w-8 h-8 text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">No cross-module connections found</p>
      </div>
    );
  }
  
  const moduleOrder = ['Quality', 'Supply Chain', 'Regulatory', 'Safety', 'Clinical'];
  const sortedModules = Object.keys(connections.connectionsByModule).sort(
    (a, b) => moduleOrder.indexOf(a) - moduleOrder.indexOf(b)
  );
  
  return (
    <div className="space-y-3">
      {/* Summary Header */}
      <div className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-purple/20">
            <Link2 className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">
              {connections.totalConnections} Cross-Module Connections
            </div>
            <div className="text-xs text-text-muted">
              {connections.criticalConnections} critical
            </div>
          </div>
        </div>
        <Badge color={connections.criticalConnections > 0 ? 'red' : 'green'}>
          {connections.criticalConnections > 0 ? 'Action Required' : 'Linked'}
        </Badge>
      </div>
      
      {/* Connections by Module */}
      {sortedModules.map((module) => {
        const moduleConnections = connections.connectionsByModule[module];
        const isExpanded = expandedModule === module;
        const criticalCount = moduleConnections.filter(c => c.priority === 'critical').length;
        
        return (
          <div 
            key={module} 
            className="border border-border rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpandedModule(isExpanded ? null : module)}
              className="w-full flex items-center justify-between p-3 bg-surface-card hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getModuleColor(module) }}
                />
                <span className="font-medium text-text-primary">{module}</span>
                <Badge variant="outline" size="sm">{moduleConnections.length}</Badge>
                {criticalCount > 0 && (
                  <Badge color="red" size="sm">{criticalCount} critical</Badge>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            {isExpanded && (
              <div className="p-3 pt-0 space-y-2">
                {moduleConnections.map((conn) => (
                  <ConnectionCard 
                    key={conn.entityId} 
                    connection={conn}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConnectionCard({ 
  connection, 
  onNavigate 
}: { 
  connection: EntityConnection;
  onNavigate?: (module: string, entityId: string) => void;
}) {
  const getEntityIcon = () => {
    switch (connection.entityType) {
      case 'deviation': return <AlertTriangle className="w-4 h-4" />;
      case 'capa': return <Shield className="w-4 h-4" />;
      case 'document': return <FileText className="w-4 h-4" />;
      case 'submission': return <Send className="w-4 h-4" />;
      case 'safety-case': return <Heart className="w-4 h-4" />;
      case 'label': return <Tag className="w-4 h-4" />;
      case 'decision': return <ClipboardList className="w-4 h-4" />;
      case 'batch': return <Package className="w-4 h-4" />;
      default: return <Link2 className="w-4 h-4" />;
    }
  };
  
  return (
    <div 
      className={`p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${getPriorityBg(connection.priority)}`}
      onClick={() => onNavigate?.(connection.module, connection.entityId)}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded ${
          connection.priority === 'critical' ? 'bg-red-500/20 text-red-500' :
          connection.priority === 'high' ? 'bg-amber-500/20 text-amber-500' :
          'bg-blue-500/20 text-blue-500'
        }`}>
          {getEntityIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary text-sm">
              {connection.displayName}
            </span>
            <Badge 
              color={
                connection.status === 'Open' || connection.status === 'Investigation' ? 'amber' :
                connection.status === 'Pending' || connection.status === 'Draft' ? 'blue' :
                connection.status === 'Under Review' ? 'purple' :
                'gray'
              } 
              size="sm"
            >
              {connection.status}
            </Badge>
          </div>
          <p className="text-xs text-text-muted mt-1">{connection.linkDescription}</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
            <span className={`font-medium ${getPriorityColor(connection.priority)}`}>
              {connection.priority.toUpperCase()}
            </span>
            <span>•</span>
            <span>{getEntityTypeLabel(connection.entityType)}</span>
            <span>•</span>
            <span>{new Date(connection.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-text-muted flex-shrink-0" />
      </div>
    </div>
  );
}

// ============================================================================
// CONNECTIONS GRAPH VISUALIZATION (v0.4.2)
// ============================================================================

interface ConnectionsGraphProps {
  entityId: string;
  entityName: string;
}

function ConnectionsGraph({ entityId, entityName, onNavigate }: ConnectionsGraphProps & { onNavigate?: (module: string, entityId: string) => void }) {
  const handleNavigate = onNavigate ?? ((_m: string, _id: string) => {});
  const connections = useMemo(() => getEntityConnections(entityId), [entityId]);
  
  if (!connections) return null;
  
  const allConnections = Object.values(connections.connectionsByModule).flat();
  const moduleGroups = Object.entries(connections.connectionsByModule);
  
  // Calculate positions for radial layout
  const centerX = 200;
  const centerY = 200;
  const radius = 140;
  
  return (
    <div className="relative w-full aspect-square max-w-[450px] mx-auto">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        {/* Connection lines */}
        {moduleGroups.map(([module, conns], groupIdx) => {
          const angle = (groupIdx / moduleGroups.length) * 2 * Math.PI - Math.PI / 2;
          const groupX = centerX + Math.cos(angle) * radius;
          const groupY = centerY + Math.sin(angle) * radius;
          
          return conns.map((conn, idx) => {
            // Spread connections within each module group
            const spread = 30;
            const offsetAngle = angle + ((idx - (conns.length - 1) / 2) * 0.15);
            const nodeX = centerX + Math.cos(offsetAngle) * (radius + spread);
            const nodeY = centerY + Math.sin(offsetAngle) * (radius + spread);
            
            return (
              <line
                key={conn.entityId}
                x1={centerX}
                y1={centerY}
                x2={nodeX}
                y2={nodeY}
                stroke={getModuleColor(module)}
                strokeWidth={conn.priority === 'critical' ? 2.5 : 1.5}
                strokeOpacity={0.6}
                strokeDasharray={conn.priority === 'critical' ? '' : '4 2'}
              />
            );
          });
        })}
        
        {/* Center node (selected entity) */}
        <circle
          cx={centerX}
          cy={centerY}
          r={30}
          fill="#8B5CF6"
          className="drop-shadow-lg"
        />
        <text
          x={centerX}
          y={centerY + 4}
          textAnchor="middle"
          className="fill-white text-xs font-medium"
        >
          {entityName.split('-').pop()}
        </text>
        
        {/* Connection nodes */}
        {moduleGroups.map(([module, conns], groupIdx) => {
          const angle = (groupIdx / moduleGroups.length) * 2 * Math.PI - Math.PI / 2;
          
          return conns.map((conn, idx) => {
            const spread = 30;
            const offsetAngle = angle + ((idx - (conns.length - 1) / 2) * 0.15);
            const nodeX = centerX + Math.cos(offsetAngle) * (radius + spread);
            const nodeY = centerY + Math.sin(offsetAngle) * (radius + spread);
            const nodeRadius = conn.priority === 'critical' ? 16 : 12;
            
            return (
              <g key={conn.entityId}>
                <circle
                  cx={nodeX}
                  cy={nodeY}
                  r={nodeRadius}
                  fill={getModuleColor(module)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => handleNavigate(module, conn.entityId)}
                />
                {conn.priority === 'critical' && (
                  <circle
                    cx={nodeX}
                    cy={nodeY}
                    r={nodeRadius + 4}
                    fill="none"
                    stroke="#EF4444"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    className="animate-pulse"
                  />
                )}
              </g>
            );
          });
        })}
        
        {/* Module labels */}
        {moduleGroups.map(([module], groupIdx) => {
          const angle = (groupIdx / moduleGroups.length) * 2 * Math.PI - Math.PI / 2;
          const labelX = centerX + Math.cos(angle) * (radius + 70);
          const labelY = centerY + Math.sin(angle) * (radius + 70);
          
          return (
            <text
              key={module}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              className="fill-text-muted text-xs font-medium"
            >
              {module}
            </text>
          );
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>Medium</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CONNECTIONS EXPLORER VIEW (v0.4.2)
// ============================================================================

function ConnectionsExplorerView() {
  const batches = useSupplyChainStore((s) => s.batches);
  const selectedBatch = useSupplyChainStore((s) => s.selectedBatch);
  const setSelectedBatch = useSupplyChainStore((s) => s.setSelectedBatch);
  const setActiveView = useSupplyChainStore((s) => s.setActiveView);
  
  // v0.21.9: Toast for navigation feedback
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  
  // Default to the problem batch for demo
  const currentBatchId = selectedBatch || 'batch-api-003';
  const currentBatch = batches.find(b => b.id === currentBatchId);
  const connections = useMemo(() => getEntityConnections(currentBatchId), [currentBatchId]);
  
  // Select problem batch on mount for demo purposes
  useState(() => {
    if (!selectedBatch) {
      setSelectedBatch('batch-api-003');
    }
  });
  
  const handleNavigate = (module: string, entityId: string) => {
    // v0.44.15: Actually navigate to the target module
    const moduleMap: Record<string, string> = {
      'quality': 'quality',
      'regulatory': 'submissions',
      'ctms': 'ctms',
      'authoring': 'authoring',
      'tmf': 'tmf',
      'safety': 'safety',
      'research': 'research',
    };
    const targetModule = moduleMap[module.toLowerCase()] || module.toLowerCase();
    setActiveModule(targetModule);
    toast.success(`Navigating to ${module} — ${entityId}`);
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent-purple" />
            Cross-Module Connections
          </h2>
          <p className="text-sm text-text-muted mt-1">
            R&D Connected - visualize relationships across the entire platform
          </p>
        </div>
        
        {connections && connections.criticalConnections > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertOctagon className="w-5 h-5 text-red-500" />
            <span className="text-sm font-medium text-red-500">
              {connections.criticalConnections} critical connection{connections.criticalConnections > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
      
      {/* Entity Selector */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-text-muted uppercase mb-3">Select Entity</h3>
        <div className="flex flex-wrap gap-2">
          {batches.filter(b => b.deviationIds.length > 0 || b.status === 'quarantine').map((batch) => (
            <button
              key={batch.id}
              onClick={() => setSelectedBatch(batch.id)}
              className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                currentBatchId === batch.id
                  ? 'bg-accent-purple text-white ring-2 ring-accent-purple/50'
                  : 'bg-surface-card text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              } ${batch.status === 'quarantine' ? 'border border-red-500/50' : ''}`}
            >
              {batch.batchNumber}
              {batch.status === 'quarantine' && (
                <AlertTriangle className="w-3 h-3 text-red-400 ml-1.5 inline" />
              )}
            </button>
          ))}
        </div>
      </Card>
      
      {currentBatch && connections && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Visual Graph */}
          <Card className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-text-muted uppercase mb-4">
              Connection Map
            </h3>
            <ConnectionsGraph 
              entityId={currentBatchId} 
              entityName={currentBatch.batchNumber}
            />
            
            {/* Graph legend/stats */}
            <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {connections.totalConnections}
                </div>
                <div className="text-xs text-text-muted">Total Links</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">
                  {connections.criticalConnections}
                </div>
                <div className="text-xs text-text-muted">Critical</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary">
                  {Object.keys(connections.connectionsByModule).length}
                </div>
                <div className="text-xs text-text-muted">Modules</div>
              </div>
            </div>
          </Card>
          
          {/* Connections Panel */}
          <Card className="p-4 md:p-6">
            <h3 className="text-sm font-medium text-text-muted uppercase mb-4">
              Connection Details
            </h3>
            <ConnectionsPanel
              entityId={currentBatchId}
              entityType="batch"
              entityName={currentBatch.batchNumber}
              onNavigate={handleNavigate}
            />
          </Card>
        </div>
      )}
      
      {!connections && (
        <Card className="p-4 md:p-6 border border-border-subtle bg-surface-elevated/50">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-surface-elevated">
              <Link2 className="w-6 h-6 text-text-muted" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Cross-Module Linkage</h3>
              <p className="text-sm text-text-muted mt-1">
                Select a batch above to view its cross-module connections and trace how quality events
                propagate across the supply chain.
              </p>
            </div>
          </div>
        </Card>
      )}
      
      {/* Key Value Proposition */}
      <Card className="p-4 md:p-6 bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border-accent-purple/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent-purple/20">
            <Network className="w-8 h-8 text-accent-purple" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary text-lg">
              "This is R&D Connected"
            </h3>
            <p className="text-sm text-text-muted mt-2">
              Legacy systems trap data in silos. Veeva Vault, MasterControl, Oracle - 
              they don't talk to each other. Click any entity in Ligature and see instantly: 
              which deviations, which CAPAs, which regulatory submissions, which safety cases 
              are connected. That's not a report you wait 3 days for. That's operational 
              intelligence at your fingertips.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('genealogy')}
              >
                <GitBranch className="w-4 h-4 mr-2" />
                View Genealogy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('impact')}
              >
                <Network className="w-4 h-4 mr-2" />
                Run Impact Analysis
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================================
// ACTION CENTER VIEW (v0.4.3)
// ============================================================================

function ActionCenterView() {
  const batches = useSupplyChainStore((s) => s.batches);
  const selectedBatch = useSupplyChainStore((s) => s.selectedBatch);
  const setSelectedBatch = useSupplyChainStore((s) => s.setSelectedBatch);
  const setActiveView = useSupplyChainStore((s) => s.setActiveView);
  
  const [activeTab, setActiveTab] = useState<'disposition' | 'actions' | 'timeline' | 'queue'>('disposition');
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  
  // Default to the problem batch for demo
  const currentBatchId = selectedBatch || 'batch-api-003';
  const currentBatch = batches.find(b => b.id === currentBatchId);
  
  // Get batch-specific data
  const batchActions = useMemo(() => getBatchActions(currentBatchId), [currentBatchId]);
  const dispositionWorkflow = useMemo(() => getBatchDispositionWorkflow(currentBatchId), [currentBatchId]);
  const actionTimeline = useMemo(() => getBatchActionTimeline(currentBatchId), [currentBatchId]);
  const connections = useMemo(() => getEntityConnections(currentBatchId), [currentBatchId]);
  
  // Select problem batch on mount
  useState(() => {
    if (!selectedBatch) {
      setSelectedBatch('batch-api-003');
    }
  });
  
  const handleQuickAction = (action: QuickAction) => {
    setSelectedAction(action);
    setShowActionModal(true);
  };
  
  const tabs = [
    { id: 'disposition' as const, label: 'Disposition Workflow', icon: Gavel },
    { id: 'actions' as const, label: 'Quick Actions', icon: PlayCircle },
    { id: 'timeline' as const, label: 'Action Timeline', icon: History },
    { id: 'queue' as const, label: 'Pending Queue', icon: Timer },
  ];
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-accent-purple" />
            Action Center
          </h2>
          <p className="text-sm text-text-muted mt-1">
            See the problem, understand the impact, view the connections - now ACT
          </p>
        </div>
        
        {pendingActionsQueue.filter(a => a.priority === 'critical').length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <Timer className="w-5 h-5 text-red-500 animate-pulse" />
            <span className="text-sm font-medium text-red-500">
              {pendingActionsQueue.filter(a => a.priority === 'critical').length} critical action{pendingActionsQueue.filter(a => a.priority === 'critical').length > 1 ? 's' : ''} pending
            </span>
          </div>
        )}
      </div>
      
      {/* Batch Selector */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-text-muted uppercase mb-3">Select Batch for Actions</h3>
        <div className="flex flex-wrap gap-2">
          {batches.filter(b => b.deviationIds.length > 0 || b.status === 'quarantine').map((batch) => (
            <button
              key={batch.id}
              onClick={() => setSelectedBatch(batch.id)}
              className={`px-3 py-2 rounded-lg text-sm font-mono transition-all ${
                currentBatchId === batch.id
                  ? 'bg-accent-purple text-white ring-2 ring-accent-purple/50'
                  : 'bg-surface-card text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              } ${batch.status === 'quarantine' ? 'border border-red-500/50' : ''}`}
            >
              {batch.batchNumber}
              {batch.status === 'quarantine' && (
                <AlertTriangle className="w-3 h-3 text-red-400 ml-1.5 inline" />
              )}
            </button>
          ))}
        </div>
      </Card>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-accent-purple/10 text-accent-purple border-b-2 border-accent-purple'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'disposition' && dispositionWorkflow && (
        <DispositionWorkflowPanel workflow={dispositionWorkflow} />
      )}
      
      {activeTab === 'disposition' && !dispositionWorkflow && (
        <Card className="p-4 md:p-6 text-center">
          <Gavel className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="font-semibold text-text-primary">No Active Disposition Workflow</h3>
          <p className="text-sm text-text-muted mt-2">
            Select a batch with an active disposition decision to view workflow details.
          </p>
          <Button
            variant="primary"
            size="sm"
            className="mt-4"
            onClick={() => setSelectedBatch('batch-api-003')}
          >
            Load Sample Batch
          </Button>
        </Card>
      )}
      
      {activeTab === 'actions' && (
        <QuickActionsPanel 
          batchId={currentBatchId}
          batchNumber={currentBatch?.batchNumber || ''}
          connections={connections}
          completedActions={batchActions}
          onTakeAction={handleQuickAction}
        />
      )}
      
      {activeTab === 'timeline' && (
        <ActionTimelinePanel timeline={actionTimeline} />
      )}
      
      {activeTab === 'queue' && (
        <PendingActionsQueuePanel />
      )}
      
      

      {/* Quick Action Modal */}
      {showActionModal && selectedAction && (
        <QuickActionModal
          action={selectedAction}
          batchNumber={currentBatch?.batchNumber || ''}
          onClose={() => setShowActionModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// DISPOSITION WORKFLOW PANEL (v0.4.3)
// ============================================================================

function DispositionWorkflowPanel({ workflow }: { workflow: DispositionWorkflow }) {
  const { deadClick } = useDeadClick();
  const [expandedSections, setExpandedSections] = useState<string[]>(['approvals', 'prerequisites']);
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };
  
  const completedPrereqs = workflow.prerequisites.filter(p => p.status === 'complete').length;
  const totalPrereqs = workflow.prerequisites.length;
  const completedApprovals = workflow.approvals.filter(a => a.status === 'approved').length;
  const totalApprovals = workflow.approvals.length;
  
  // Calculate SLA status
  const slaDeadline = new Date(workflow.slaDeadline);
  const now = new Date();
  const hoursRemaining = Math.round((slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60));
  const slaStatus = hoursRemaining < 0 ? 'overdue' : hoursRemaining < 24 ? 'warning' : 'ok';
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Workflow Header */}
      <Card className="p-4 md:p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <Gavel className="w-5 h-5 text-accent-purple" />
              Disposition Workflow
            </h3>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="font-mono">{workflow.batchNumber}</Badge>
              <Badge color={
                workflow.currentStatus === 'decided' ? 'green' :
                workflow.currentStatus === 'pending-decision' ? 'amber' :
                'blue'
              }>
                {workflow.currentStatus.replace(/-/g, ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
          
          {/* SLA Indicator */}
          <div className={`px-4 py-2 rounded-lg border ${
            slaStatus === 'overdue' ? 'bg-red-500/10 border-red-500/30' :
            slaStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-green-500/10 border-green-500/30'
          }`}>
            <div className="flex items-center gap-2">
              <Timer className={`w-4 h-4 ${
                slaStatus === 'overdue' ? 'text-red-500' :
                slaStatus === 'warning' ? 'text-amber-500' :
                'text-green-500'
              }`} />
              <span className={`text-sm font-medium ${
                slaStatus === 'overdue' ? 'text-red-500' :
                slaStatus === 'warning' ? 'text-amber-500' :
                'text-green-500'
              }`}>
                {slaStatus === 'overdue' 
                  ? 'SLA Overdue'
                  : `${hoursRemaining}h remaining`
                }
              </span>
            </div>
            <div className="text-xs text-text-muted mt-1">
              Due: {slaDeadline.toLocaleDateString()} {slaDeadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
        
        {/* Progress Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="text-center p-3 rounded-lg bg-surface-elevated">
            <div className="text-2xl font-bold text-text-primary">{completedPrereqs}/{totalPrereqs}</div>
            <div className="text-xs text-text-muted">Prerequisites</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-elevated">
            <div className="text-2xl font-bold text-text-primary">{completedApprovals}/{totalApprovals}</div>
            <div className="text-xs text-text-muted">Approvals</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-surface-elevated">
            <div className="text-2xl font-bold text-amber-500">Pending</div>
            <div className="text-xs text-text-muted">Decision</div>
          </div>
        </div>
        
        {/* Decision Options */}
        {workflow.currentStatus === 'pending-decision' && (
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-text-muted uppercase mb-3">Disposition Options</h4>
            <div className="grid grid-cols-5 gap-2">
              {(['release', 'hold', 'quarantine', 'rework', 'reject'] as DispositionDecision[]).map((decision) => {
                const config = getDispositionLabel(decision);
                return (
                  <button
                    onClick={deadClick}
                    key={decision}
                    className={`p-3 rounded-lg border-2 transition-all ${config?.bg ?? ''} hover:ring-2 hover:ring-offset-2`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {decision === 'release' && <CheckCircle2 className={`w-5 h-5 ${config?.color ?? ''}`} />}
                      {decision === 'hold' && <Pause className={`w-5 h-5 ${config?.color ?? ''}`} />}
                      {decision === 'quarantine' && <Lock className={`w-5 h-5 ${config?.color ?? ''}`} />}
                      {decision === 'rework' && <RefreshCw className={`w-5 h-5 ${config?.color ?? ''}`} />}
                      {decision === 'reject' && <Ban className={`w-5 h-5 ${config?.color ?? ''}`} />}
                      <span className={`text-xs font-medium ${config?.color ?? ''}`}>{config.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>
      
      {/* Prerequisites */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('prerequisites')}
          className="w-full p-4 flex items-center justify-between bg-surface-elevated hover:bg-surface-card transition-colors"
        >
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-accent-purple" />
            <span className="font-medium text-text-primary">Prerequisites</span>
            <Badge color={completedPrereqs === totalPrereqs ? 'green' : 'amber'}>
              {completedPrereqs}/{totalPrereqs}
            </Badge>
          </div>
          <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedSections.includes('prerequisites') ? 'rotate-180' : ''}`} />
        </button>
        
        {expandedSections.includes('prerequisites') && (
          <div className="p-4 space-y-3">
            {workflow.prerequisites.map((prereq) => (
              <div key={prereq.id} className={`p-3 rounded-lg border ${
                prereq.status === 'complete' ? 'bg-green-500/5 border-green-500/20' :
                prereq.status === 'waived' ? 'bg-gray-500/5 border-gray-500/20' :
                'bg-amber-500/5 border-amber-500/20'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {prereq.status === 'complete' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : prereq.status === 'waived' ? (
                      <XCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                    ) : (
                      <CircleDot className="w-5 h-5 text-amber-500 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium text-text-primary">{prereq.description}</div>
                      <div className="text-xs text-text-muted mt-1">
                        Type: {prereq.type.replace(/-/g, ' ')}
                        {prereq.linkedEntityId && (
                          <span className="ml-2 font-mono text-accent-blue">
                            → {prereq.linkedEntityId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {prereq.completedAt && (
                    <div className="text-xs text-text-muted text-right">
                      <div>{new Date(prereq.completedAt).toLocaleDateString()}</div>
                      <div>{prereq.completedBy}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Approvals */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('approvals')}
          className="w-full p-4 flex items-center justify-between bg-surface-elevated hover:bg-surface-card transition-colors"
        >
          <div className="flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-accent-purple" />
            <span className="font-medium text-text-primary">Approvals Required</span>
            <Badge color={completedApprovals === totalApprovals ? 'green' : 'amber'}>
              {completedApprovals}/{totalApprovals}
            </Badge>
          </div>
          <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedSections.includes('approvals') ? 'rotate-180' : ''}`} />
        </button>
        
        {expandedSections.includes('approvals') && (
          <div className="p-4 space-y-3">
            {workflow.approvals.map((approval) => (
              <div key={approval.id} className={`p-3 rounded-lg border ${
                approval.status === 'approved' ? 'bg-green-500/5 border-green-500/20' :
                approval.status === 'rejected' ? 'bg-red-500/5 border-red-500/20' :
                'bg-surface-elevated border-border'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {approval.status === 'approved' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    ) : approval.status === 'rejected' ? (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    ) : (
                      <Clock className="w-5 h-5 text-text-muted mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium text-text-primary">{approval.role}</div>
                      {approval.approverName && (
                        <div className="text-sm text-text-secondary">{approval.approverName}</div>
                      )}
                      {approval.comments && (
                        <div className="text-sm text-text-muted mt-1 italic">"{approval.comments}"</div>
                      )}
                    </div>
                  </div>
                  {approval.timestamp && (
                    <div className="text-xs text-text-muted">
                      {new Date(approval.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      
      {/* Stakeholder Notifications */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('notifications')}
          className="w-full p-4 flex items-center justify-between bg-surface-elevated hover:bg-surface-card transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-accent-purple" />
            <span className="font-medium text-text-primary">Stakeholder Notifications</span>
            <Badge variant="outline">
              {workflow.stakeholderNotifications.filter(n => n.status === 'acknowledged').length}/
              {workflow.stakeholderNotifications.length}
            </Badge>
          </div>
          <ChevronDown className={`w-5 h-5 text-text-muted transition-transform ${expandedSections.includes('notifications') ? 'rotate-180' : ''}`} />
        </button>
        
        {expandedSections.includes('notifications') && (
          <div className="p-4 space-y-2">
            {workflow.stakeholderNotifications.map((notif) => (
              <div key={notif.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    notif.status === 'acknowledged' ? 'bg-green-500' :
                    notif.status === 'sent' ? 'bg-amber-500' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <span className="text-sm font-medium text-text-primary">{notif.stakeholderRole}</span>
                    {notif.stakeholderName && (
                      <span className="text-sm text-text-muted ml-2">({notif.stakeholderName})</span>
                    )}
                  </div>
                </div>
                <Badge variant="outline" color={
                  notif.status === 'acknowledged' ? 'green' :
                  notif.status === 'sent' ? 'amber' :
                  'gray'
                }>
                  {notif.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================================
// QUICK ACTIONS PANEL (v0.4.3)
// ============================================================================

interface QuickActionsPanelProps {
  batchId: string;
  batchNumber: string;
  connections: CrossModuleSummary | null;
  completedActions: BatchAction[];
  onTakeAction: (action: QuickAction) => void;
}

function QuickActionsPanel({ batchId, batchNumber, connections, completedActions, onTakeAction }: QuickActionsPanelProps) {
  if (!connections) {
    return (
      <Card className="p-4 md:p-6 text-center">
        <PlayCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="font-semibold text-text-primary">No Connections Found</h3>
        <p className="text-sm text-text-muted mt-2">
          Quick actions are based on cross-module connections. 
          Load a batch with connections to see available actions.
        </p>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Actions by Connection */}
      {Object.entries(connections.connectionsByModule).map(([module, moduleConnections]) => (
        <Card key={module} className="overflow-hidden">
          <div className="p-4 bg-surface-elevated border-b border-border">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getModuleColor(module) }}
              />
              <span className="font-medium text-text-primary">{module}</span>
              <Badge variant="outline">{moduleConnections.length} connection{moduleConnections.length > 1 ? 's' : ''}</Badge>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {moduleConnections.map((conn) => {
              const availableActions = getQuickActionsForConnection(conn.entityType);
              const completedForConn = completedActions.filter(a => a.linkedFromConnectionId === `link-${conn.entityId}`);
              
              return (
                <div key={conn.entityId} className={`p-4 rounded-lg border ${getPriorityBg(conn.priority)}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium text-text-primary">{conn.displayName}</div>
                      <div className="text-sm text-text-muted mt-1">{conn.linkDescription}</div>
                    </div>
                    <Badge color={
                      conn.priority === 'critical' ? 'red' :
                      conn.priority === 'high' ? 'amber' :
                      'blue'
                    }>
                      {conn.priority}
                    </Badge>
                  </div>
                  
                  {/* Quick Action Buttons */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {availableActions.map((action) => {
                      const isCompleted = completedForConn.some(a => a.actionType === action.type);
                      return (
                        <Button
                          key={action.id}
                          variant={isCompleted ? 'ghost' : 'outline'}
                          size="sm"
                          onClick={() => !isCompleted && onTakeAction(action)}
                          disabled={isCompleted}
                          className={isCompleted ? 'opacity-60' : ''}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-3 h-3 mr-1.5 text-green-500" />
                          ) : (
                            <ArrowRightCircle className="w-3 h-3 mr-1.5" />
                          )}
                          {action.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      
      {/* Completed Actions Summary */}
      {completedActions.length > 0 && (
        <Card className="p-4 bg-green-500/5 border-green-500/20">
          <div className="flex items-center gap-2 mb-3">
            <CheckSquare className="w-5 h-5 text-green-500" />
            <span className="font-medium text-text-primary">Actions Taken ({completedActions.length})</span>
          </div>
          <div className="space-y-2">
            {completedActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-text-secondary">{action.title}</span>
                </div>
                <span className="text-text-muted font-mono text-xs">
                  {action.resultingEntityId}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// ACTION TIMELINE PANEL (v0.4.3)
// ============================================================================

function ActionTimelinePanel({ timeline }: { timeline: ActionTimelineEntry[] }) {
  if (timeline.length === 0) {
    return (
      <Card className="p-4 md:p-6 text-center">
        <History className="w-12 h-12 text-text-muted mx-auto mb-4" />
        <h3 className="font-semibold text-text-primary">No Actions Yet</h3>
        <p className="text-sm text-text-muted mt-2">
          Actions taken on this batch will appear here.
        </p>
      </Card>
    );
  }
  
  return (
    <Card className="p-4 md:p-6">
      <h3 className="text-sm font-medium text-text-muted uppercase mb-4">
        Batch Action History
      </h3>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* Timeline entries */}
        <div className="space-y-4">
          {timeline.map((entry, index) => (
            <div key={entry.id} className="relative pl-10">
              {/* Timeline dot */}
              <div className={`absolute left-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${
                entry.resultingEntityType 
                  ? 'bg-accent-purple' 
                  : 'bg-surface-elevated border-border'
              }`}>
                {entry.resultingEntityType && (
                  <CheckCircle2 className="w-3 h-3 text-white" />
                )}
              </div>
              
              {/* Entry content */}
              <div className={`p-3 rounded-lg ${
                index === 0 ? 'bg-accent-purple/10 border border-accent-purple/30' : 'bg-surface-elevated'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-text-primary">{entry.action}</div>
                    <div className="text-sm text-text-secondary mt-1">{entry.details}</div>
                    {entry.resultingEntityId && (
                      <div className="flex items-center gap-2 mt-2">
                        <ArrowRight className="w-3 h-3 text-accent-blue" />
                        <span className="text-xs font-mono text-accent-blue">
                          {entry.resultingEntityId}
                        </span>
                        {entry.module && (
                          <Badge variant="outline" className="text-xs">
                            {entry.module}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-text-muted text-right">
                    <div>{new Date(entry.timestamp).toLocaleDateString()}</div>
                    <div>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="mt-1">{entry.actor}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============================================================================
// PENDING ACTIONS QUEUE PANEL (v0.4.3)
// ============================================================================

function PendingActionsQueuePanel() {
  const toast = useToast();
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="text-sm font-medium text-text-muted uppercase mb-4 flex items-center gap-2">
          <Timer className="w-4 h-4" />
          Pending Actions Queue
        </h3>
        
        <div className="space-y-3">
          {pendingActionsQueue.map((item, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${
                item.priority === 'critical' ? 'bg-red-500/5 border-red-500/30' :
                item.priority === 'high' ? 'bg-amber-500/5 border-amber-500/30' :
                'bg-surface-elevated border-border'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge color={
                      item.priority === 'critical' ? 'red' :
                      item.priority === 'high' ? 'amber' :
                      'blue'
                    }>
                      {item.priority.toUpperCase()}
                    </Badge>
                    <span className="font-mono text-sm text-text-muted">{item.batchNumber}</span>
                  </div>
                  <div className="font-medium text-text-primary">{item.actionRequired}</div>
                  {item.assignee && (
                    <div className="text-sm text-text-secondary mt-1">
                      Assigned: {item.assignee}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    item.slaHours <= 24 ? 'text-red-500' :
                    item.slaHours <= 48 ? 'text-amber-500' :
                    'text-text-secondary'
                  }`}>
                    {item.slaHours}h SLA
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      toast.info(`Opening action workflow for ${item.actionRequired}...`);
                    }}
                  >
                    Take Action
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <Card className="p-4 text-center bg-red-500/5 border-red-500/20">
          <div className="text-2xl font-bold text-red-500">
            {pendingActionsQueue.filter(a => a.priority === 'critical').length}
          </div>
          <div className="text-xs text-text-muted">Critical</div>
        </Card>
        <Card className="p-4 text-center bg-amber-500/5 border-amber-500/20">
          <div className="text-2xl font-bold text-amber-500">
            {pendingActionsQueue.filter(a => a.priority === 'high').length}
          </div>
          <div className="text-xs text-text-muted">High Priority</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">
            {pendingActionsQueue.length}
          </div>
          <div className="text-xs text-text-muted">Total Pending</div>
        </Card>
      </div>
    </div>
  );
}

// ============================================================================
// QUICK ACTION MODAL (v0.4.3)
// ============================================================================

function QuickActionModal({ action, batchNumber, onClose }: { action: QuickAction; batchNumber: string; onClose: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate action creation
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
    }, 1500);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface-card rounded-xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-accent-purple" />
            {action.label}
          </h3>
          <p className="text-sm text-text-muted mt-1">{action.description}</p>
        </div>
        
        <div className="p-4 md:p-6 space-y-4">
          {/* Auto-populated Context */}
          <div className="p-3 rounded-lg bg-accent-purple/10 border border-accent-purple/20">
            <div className="text-xs font-medium text-accent-purple uppercase mb-2">Auto-Populated Context</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Batch:</span>
                <span className="font-mono text-text-primary">{batchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Target Module:</span>
                <span className="text-text-primary">{action.targetModule}</span>
              </div>
            </div>
          </div>
          
          {/* Required Fields (Demo placeholder) */}
          <div className="space-y-3">
            {action.requiredFields.slice(0, 2).map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-text-primary mb-1 capitalize">
                  {field.replace(/([A-Z])/g, ' $1').trim()}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-surface-elevated text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-purple"
                  placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').trim().toLowerCase()}`}
                />
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-4 md:p-6 border-t border-border flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <ArrowRightCircle className="w-4 h-4 mr-2" />
                Create {action.label}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SupplyChainScreen;
