

/**
 * Manufacturing Module Screen - v0.8.0
 * 
 * Batch Management, Process Validation, Equipment & Facilities
 * 
 * "R&D Connected extends to the plant floor. When CMC specs finalize,
 * Manufacturing already has the process parameters. When a deviation occurs,
 * Quality and Regulatory are notified instantly. One platform from
 * development through production."
 */

import { useState, useMemo } from 'react';
import {
  Factory,
  Package,
  ClipboardCheck,
  Settings,
  LayoutDashboard,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Calendar,
  Users,
  TrendingUp,
  Activity,
  Globe,
  FileText,
  Search,
  Filter,
  Eye,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Shield,
  Database,
  Beaker,
  FlaskConical,
  Thermometer,
  Gauge,
  Wrench,
  Play,
  Pause,
  GitBranch,
  Layers,
  BarChart3,
  CircleDot,
  Building,
  Zap,
  Box,
  Truck,
  RefreshCw,
  MoreHorizontal,
  Link2,
  CheckSquare,
  XSquare,
  Timer,
  Target,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { ScrollFadeContainer } from '@/components/ui/ScrollFadeContainer';
import {
  batches,
  deviations,
  processValidations,
  equipment,
  productionSchedules,
  getManufacturingDashboardSummary,
  getBatchById,
  getBatchesByStatus,
  getActiveBatches,
  getDeviationsByBatch,
  getOpenDeviations,
  getProcessValidationsByProduct,
  getEquipmentBySite,
  getEquipmentRequiringMaintenance,
  getBatchPhaseProgress,
  getBatchCPPCompliance,
  SITE_LABELS,
  BATCH_STATUS_LABELS,
  BATCH_PHASE_LABELS,
  DEVIATION_TYPE_LABELS,
  DEVIATION_IMPACT_LABELS,
  EQUIPMENT_TYPE_LABELS,
  type BatchRecord,
  type BatchStatus,
  type BatchPhase,
  type ManufacturingDeviation,
  type ProcessValidation,
  type Equipment as EquipmentType,
  type ManufacturingSite,
  type DeviationImpact,
} from '@/data/manufacturing-data';

// ============================================================================
// TYPES
// ============================================================================

type ManufacturingView = 
  | 'dashboard'
  | 'batch-management'
  | 'process-validation'
  | 'equipment';

// ============================================================================
// CONSTANTS
// ============================================================================

const VIEW_ICONS: Record<ManufacturingView, React.ReactNode> = {
  dashboard: <LayoutDashboard className="w-4 h-4" />,
  'batch-management': <Package className="w-4 h-4" />,
  'process-validation': <ClipboardCheck className="w-4 h-4" />,
  equipment: <Settings className="w-4 h-4" />,
};

const VIEW_LABELS: Record<ManufacturingView, string> = {
  dashboard: 'Dashboard',
  'batch-management': 'Batch Management',
  'process-validation': 'Process Validation',
  equipment: 'Equipment & Facilities',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status, type }: { status: string; type: 'batch' | 'deviation' | 'validation' | 'equipment' }) {
  const getConfig = () => {
    if (type === 'batch') {
      switch (status) {
        case 'released': return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> };
        case 'in-progress': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Play className="w-3 h-3" /> };
        case 'pending-review': return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> };
        case 'pending-release': return { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: <ClipboardCheck className="w-3 h-3" /> };
        case 'scheduled': return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400', icon: <Calendar className="w-3 h-3" /> };
        case 'quarantine': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertTriangle className="w-3 h-3" /> };
        case 'rejected': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> };
        default: return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: null };
      }
    }
    if (type === 'deviation') {
      switch (status) {
        case 'critical': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertCircle className="w-3 h-3" /> };
        case 'major': return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <AlertTriangle className="w-3 h-3" /> };
        case 'minor': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <AlertCircle className="w-3 h-3" /> };
        default: return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: null };
      }
    }
    if (type === 'equipment') {
      switch (status) {
        case 'qualified': return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> };
        case 'maintenance-due': return { color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Wrench className="w-3 h-3" /> };
        case 'under-maintenance': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Settings className="w-3 h-3" /> };
        case 'out-of-service': return { color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> };
        default: return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: null };
      }
    }
    // validation
    switch (status) {
      case 'completed': return { color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> };
      case 'in-progress': return { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Play className="w-3 h-3" /> };
      case 'not-started': return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400', icon: <Clock className="w-3 h-3" /> };
      default: return { color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: null };
    }
  };
  
  const config = getConfig();
  const label = type === 'batch' ? BATCH_STATUS_LABELS[status as BatchStatus] || status :
                type === 'deviation' ? DEVIATION_IMPACT_LABELS[status as DeviationImpact] || status :
                status.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      {config.icon}
      {label}
    </span>
  );
}

function PhaseTimeline({ batch }: { batch: BatchRecord }) {
  const phases: BatchPhase[] = ['dispensing', 'compounding', 'filling', 'lyophilization', 'inspection', 'labeling', 'packaging', 'qa-release'];
  
  return (
    <div className="flex items-center gap-1">
      {phases.map((phase, index) => {
        const phaseRecord = batch.phases.find(p => p.phase === phase);
        const status = phaseRecord?.status || 'pending';
        const isCurrent = batch.currentPhase === phase;
        
        let bgColor = 'bg-slate-200 dark:bg-slate-700';
        if (status === 'completed') bgColor = 'bg-green-500';
        else if (status === 'in-progress') bgColor = 'bg-blue-500';
        else if (status === 'deviated') bgColor = 'bg-amber-500';
        
        return (
          <div key={phase} className="flex items-center">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${bgColor} ${status === 'completed' || status === 'in-progress' || status === 'deviated' ? 'text-white' : 'text-slate-500 dark:text-slate-400'} ${isCurrent ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-slate-800' : ''}`}
              title={BATCH_PHASE_LABELS[phase]}
            >
              {index + 1}
            </div>
            {index < phases.length - 1 && (
              <div className={`w-3 h-0.5 ${status === 'completed' ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function RDConnectedCallout({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center">
          <Link2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
            R&D Connected
            <Sparkles className="w-3 h-3 text-purple-500" />
          </h4>
          <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mt-0.5">{title}</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// VIEW COMPONENTS
// ============================================================================

function DashboardView() {
  const summary = getManufacturingDashboardSummary();
  const openDevs = getOpenDeviations();
  const activeBatchList = getActiveBatches();
  const maintenanceEquipment = getEquipmentRequiringMaintenance();
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Factory className="w-8 h-8 text-blue-400" />
          <div>
            <h2 className="text-xl font-bold">Manufacturing Operations</h2>
            <p className="text-slate-300 text-sm">Real-time production visibility across global sites</p>
          </div>
        </div>
        <p className="text-sm text-slate-400 mt-3 max-w-2xl">
          From CMC development through commercial production. When specs finalize, the plant floor is already aligned.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Active Batches"
          value={summary.activeBatches.toString()}
          subtitle="In production"
          icon={<Package className="w-5 h-5 text-blue-500" />}
        />
        <StatCard
          title="Pending Release"
          value={summary.batchesPendingRelease.toString()}
          subtitle="QA review"
          icon={<ClipboardCheck className="w-5 h-5 text-amber-500" />}
        />
        <StatCard
          title="Overall Yield"
          value={`${summary.overallYield}%`}
          subtitle="Released batches"
          trend={{ value: 1.2, direction: 'up' }}
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
        <StatCard
          title="Open Deviations"
          value={summary.openDeviations.toString()}
          subtitle={summary.criticalDeviations > 0 ? `${summary.criticalDeviations} critical` : 'None critical'}
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Batches */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold">Active Production</h3>
              </div>
              <Badge variant="soft">{activeBatchList.length} batches</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeBatchList.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No active batches</p>
              ) : (
                activeBatchList.map((batch) => {
                  const progress = getBatchPhaseProgress(batch);
                  return (
                    <div
                      key={batch.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{batch.batchNumber}</span>
                            <StatusBadge status={batch.status} type="batch" />
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {batch.productName} • {SITE_LABELS[batch.site]}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                          <div>{progress.percentage}% complete</div>
                          <div>Phase: {BATCH_PHASE_LABELS[batch.currentPhase]}</div>
                        </div>
                      </div>
                      <PhaseTimeline batch={batch} />
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deviations & Equipment */}
        <div className="space-y-4 md:space-y-6">
          {/* Open Deviations */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="font-semibold">Open Deviations</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {openDevs.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No open deviations</p>
                ) : (
                  openDevs.slice(0, 3).map((dev) => (
                    <div
                      key={dev.id}
                      className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-slate-500">{dev.deviationNumber}</span>
                            <StatusBadge status={dev.impact} type="deviation" />
                          </div>
                          <p className="text-sm font-medium truncate mt-0.5">{dev.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {dev.batchNumber} • {dev.status}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Equipment Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-slate-500" />
                <h3 className="font-semibold">Equipment Alerts</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {maintenanceEquipment.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    All equipment on schedule
                  </div>
                ) : (
                  maintenanceEquipment.map((eq) => (
                    <div
                      key={eq.id}
                      className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-sm font-medium">{eq.name}</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Maintenance due: {eq.nextMaintenanceDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* R&D Connected Callout */}
      <RDConnectedCallout
        title="CMC → Manufacturing Traceability"
        description="Process parameters in batch records link directly to CMC development data. When specs change, affected batches are automatically flagged."
      />
    </div>
  );
}

function BatchManagementView() {
  const [selectedBatch, setSelectedBatch] = useState<BatchRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | 'all'>('all');
  const [siteFilter, setSiteFilter] = useState<ManufacturingSite | 'all'>('all');
  
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      if (statusFilter !== 'all' && batch.status !== statusFilter) return false;
      if (siteFilter !== 'all' && batch.site !== siteFilter) return false;
      return true;
    });
  }, [statusFilter, siteFilter]);

  const batchDeviations = selectedBatch ? getDeviationsByBatch(selectedBatch.id) : [];

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Batch List */}
      <div className="w-1/3 flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Batch Records
          </h3>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BatchStatus | 'all')}
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="all">All Status</option>
              {Object.entries(BATCH_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value as ManufacturingSite | 'all')}
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <option value="all">All Sites</option>
              {Object.entries(SITE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <ScrollFadeContainer direction="vertical" className="flex-1 overflow-y-auto space-y-2">
          {filteredBatches.map((batch) => {
            const progress = getBatchPhaseProgress(batch);
            const isSelected = selectedBatch?.id === batch.id;
            return (
              <button
                key={batch.id}
                onClick={() => setSelectedBatch(batch)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm">{batch.batchNumber}</span>
                  <StatusBadge status={batch.status} type="batch" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {batch.productName}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {SITE_LABELS[batch.site]} • {progress.percentage}% complete
                </p>
                {batch.deviationIds.length > 0 && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-3 h-3" />
                    {batch.deviationIds.length} deviation(s)
                  </div>
                )}
              </button>
            );
          })}
        </ScrollFadeContainer>
      </div>

      {/* Batch Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedBatch ? (
          <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{selectedBatch.batchNumber}</h3>
                    <StatusBadge status={selectedBatch.status} type="batch" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {selectedBatch.productName} • {SITE_LABELS[selectedBatch.site]}
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-slate-500 dark:text-slate-400">Target: {selectedBatch.targetQuantity.toLocaleString()} {selectedBatch.uom}</p>
                  {selectedBatch.actualQuantity && (
                    <p className="font-medium">Actual: {selectedBatch.actualQuantity.toLocaleString()} {selectedBatch.uom}</p>
                  )}
                  {selectedBatch.yield !== undefined && (
                    <p className="text-green-600 dark:text-green-400 font-medium">Yield: {selectedBatch.yield}%</p>
                  )}
                </div>
              </div>
              
              {/* Phase Timeline */}
              <div className="mt-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Production Progress</p>
                <PhaseTimeline batch={selectedBatch} />
              </div>
            </div>

            {/* R&D Connected Links */}
            {selectedBatch.linkedCMCSpecId && (
              <RDConnectedCallout
                title="Linked to CMC Specification"
                description={`Process parameters sourced from ${selectedBatch.linkedCMCSpecId}. BPR Version: ${selectedBatch.linkedBPRVersion}`}
              />
            )}

            {/* Materials */}
            {selectedBatch.materials.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Beaker className="w-4 h-4 text-purple-500" />
                    <h4 className="font-semibold">Materials</h4>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedBatch.materials.map((mat) => (
                      <div
                        key={mat.materialId}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">{mat.materialName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Lot: {mat.lotNumber} • {mat.quantity} {mat.uom}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {mat.coaVerified ? (
                            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                              <CheckSquare className="w-3 h-3" /> COA Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <XSquare className="w-3 h-3" /> COA Pending
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* In-Process Tests */}
            {selectedBatch.inProcessTests.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    <h4 className="font-semibold">In-Process Tests</h4>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedBatch.inProcessTests.map((test) => (
                      <div
                        key={test.testId}
                        className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{test.testName}</p>
                            {test.isCQA && (
                              <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded">CQA</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Spec: {test.specification} • {BATCH_PHASE_LABELS[test.phase]}
                          </p>
                        </div>
                        <div className="text-right">
                          {test.result ? (
                            <>
                              <p className="text-sm font-medium">{test.result} {test.unit}</p>
                              {test.passFailStatus === 'pass' ? (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 justify-end">
                                  <CheckCircle className="w-3 h-3" /> Pass
                                </span>
                              ) : test.passFailStatus === 'fail' ? (
                                <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 justify-end">
                                  <XCircle className="w-3 h-3" /> Fail
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400">Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Deviations */}
            {batchDeviations.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <h4 className="font-semibold">Deviations</h4>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {batchDeviations.map((dev) => (
                      <div
                        key={dev.id}
                        className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-amber-600 dark:text-amber-400">{dev.deviationNumber}</span>
                              <StatusBadge status={dev.impact} type="deviation" />
                            </div>
                            <p className="text-sm font-medium mt-1">{dev.title}</p>
                          </div>
                          <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded capitalize">{dev.status}</span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">{dev.description}</p>
                        {dev.rootCause && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            <strong>Root Cause:</strong> {dev.rootCause}
                          </p>
                        )}
                        {dev.linkedQMSDeviationId && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                            <Link2 className="w-3 h-3" />
                            Linked to QMS: {dev.linkedQMSDeviationId}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a batch to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessValidationView() {
  const [selectedValidation, setSelectedValidation] = useState<ProcessValidation | null>(null);
  const validations = processValidations;

  return (
    <div className="flex gap-6 h-[calc(100vh-200px)]">
      {/* Validation List */}
      <div className="w-1/3 flex flex-col">
        <div className="mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Process Validations
          </h3>
        </div>

        <ScrollFadeContainer direction="vertical" className="flex-1 overflow-y-auto space-y-2">
          {validations.map((pv) => {
            const isSelected = selectedValidation?.id === pv.id;
            const progressPct = Math.round((pv.completedBatchCount / pv.requiredBatchCount) * 100);
            return (
              <button
                key={pv.id}
                onClick={() => setSelectedValidation(pv)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-medium text-sm">{pv.productName}</span>
                  <StatusBadge status={pv.status} type="validation" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {SITE_LABELS[pv.site]} • {pv.validationType}
                </p>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                    <span>PPQ Progress</span>
                    <span>{pv.completedBatchCount}/{pv.requiredBatchCount} batches</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </ScrollFadeContainer>
      </div>

      {/* Validation Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedValidation ? (
          <div className="space-y-4 md:space-y-6">
            {/* Header */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{selectedValidation.productName}</h3>
                    <StatusBadge status={selectedValidation.status} type="validation" />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {SITE_LABELS[selectedValidation.site]} • Protocol: {selectedValidation.protocolId} v{selectedValidation.protocolVersion}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium capitalize">{selectedValidation.validationType} Validation</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Stage: {selectedValidation.stage.replace(/-/g, ' ').replace('stage ', 'Stage ')}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4">
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedValidation.completedBatchCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completed Batches</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold">{selectedValidation.requiredBatchCount}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Required Batches</p>
                </div>
                <div className="text-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {Math.round((selectedValidation.completedBatchCount / selectedValidation.requiredBatchCount) * 100)}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Progress</p>
                </div>
              </div>
            </div>

            {/* R&D Connected */}
            <RDConnectedCallout
              title="Linked to CMC Development"
              description={`CPPs and CQAs traced to development studies. CMC ID: ${selectedValidation.linkedCMCId}`}
            />

            {/* CPPs */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-orange-500" />
                  <h4 className="font-semibold">Critical Process Parameters (CPPs)</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedValidation.cpps.map((cpp) => (
                    <div
                      key={cpp.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{cpp.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {BATCH_PHASE_LABELS[cpp.phase]} • Target: {cpp.targetValue} {cpp.unit}
                          </p>
                        </div>
                        <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded">
                          {cpp.acceptanceRange} {cpp.unit}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{cpp.justification}</p>
                      {cpp.linkedDOEStudy && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                          <Link2 className="w-3 h-3" />
                          DOE: {cpp.linkedDOEStudy}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CQAs */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  <h4 className="font-semibold">Critical Quality Attributes (CQAs)</h4>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {selectedValidation.cqas.map((cqa) => (
                    <div
                      key={cqa.id}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium">{cqa.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Method: {cqa.testMethod}
                          </p>
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-0.5 rounded">
                          {cqa.specification}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Acceptance: {cqa.acceptanceCriteria}
                      </p>
                      {cqa.linkedSpecId && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                          <Link2 className="w-3 h-3" />
                          Spec: {cqa.linkedSpecId}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500">
            <div className="text-center">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Select a validation to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EquipmentView() {
  const [selectedSite, setSelectedSite] = useState<ManufacturingSite>('ireland');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null);
  
  const siteEquipment = getEquipmentBySite(selectedSite);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Site Selector */}
      <div className="flex items-center gap-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Building className="w-4 h-4" />
          Manufacturing Sites
        </h3>
        <div className="flex gap-2">
          {Object.entries(SITE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedSite(key as ManufacturingSite)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedSite === key
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {siteEquipment.map((eq) => (
          <Card
            key={eq.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedEquipment?.id === eq.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedEquipment(eq)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-medium text-sm">{eq.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{eq.equipmentId}</p>
                  </div>
                </div>
                <StatusBadge status={eq.status} type="equipment" />
              </div>
              
              <div className="space-y-1 mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Type</span>
                  <span>{EQUIPMENT_TYPE_LABELS[eq.type]}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Area</span>
                  <span>{eq.area}</span>
                </div>
                {eq.nextMaintenanceDate && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Next Maintenance</span>
                    <span className={new Date(eq.nextMaintenanceDate) <= new Date() ? 'text-amber-600 dark:text-amber-400' : ''}>
                      {eq.nextMaintenanceDate}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Equipment Detail Panel */}
      {selectedEquipment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-500" />
                <h4 className="font-semibold">{selectedEquipment.name}</h4>
              </div>
              <StatusBadge status={selectedEquipment.status} type="equipment" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Equipment ID</p>
                <p className="text-sm font-medium">{selectedEquipment.equipmentId}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manufacturer</p>
                <p className="text-sm font-medium">{selectedEquipment.manufacturer}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Model</p>
                <p className="text-sm font-medium">{selectedEquipment.model}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Serial Number</p>
                <p className="text-sm font-medium">{selectedEquipment.serialNumber}</p>
              </div>
              {selectedEquipment.capacity && (
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Capacity</p>
                  <p className="text-sm font-medium">{selectedEquipment.capacity}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Qualification Date</p>
                <p className="text-sm font-medium">{selectedEquipment.qualificationDate || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Requalification Due</p>
                <p className="text-sm font-medium">{selectedEquipment.requalificationDue || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Cleaning Validation</p>
                <p className="text-sm font-medium capitalize">{selectedEquipment.cleaningValidationStatus.replace(/-/g, ' ')}</p>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <h5 className="text-sm font-medium mb-2">Maintenance Schedule</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Frequency</p>
                  <p className="font-medium">{selectedEquipment.maintenanceSchedule}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last Maintenance</p>
                  <p className="font-medium">{selectedEquipment.lastMaintenanceDate || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Next Maintenance</p>
                  <p className={`font-medium ${selectedEquipment.nextMaintenanceDate && new Date(selectedEquipment.nextMaintenanceDate) <= new Date() ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                    {selectedEquipment.nextMaintenanceDate || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* R&D Connected Callout */}
      <RDConnectedCallout
        title="Equipment Qualification → Batch Records"
        description="Equipment qualification status is validated before batch execution. Out-of-spec equipment automatically blocks production scheduling."
      />
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ManufacturingScreen() {
  const [currentView, setCurrentView] = useState<ManufacturingView>('dashboard');

  return (
    <div className="flex flex-col h-full">
      <ScreenHeader
        moduleId="manufacturing"
        title="Manufacturing Operations"
        subtitle="Batch execution, facility management, equipment, and GMP compliance"
        icon={<Factory className="w-5 h-5" />}
      />
      {/* View Tabs */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide scroll-fade-right">
          {(Object.keys(VIEW_LABELS) as ManufacturingView[]).map((view) => (
            <button
              key={view}
              onClick={() => setCurrentView(view)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                currentView === view
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {VIEW_ICONS[view]}
              {VIEW_LABELS[view]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-900/50">
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'batch-management' && <BatchManagementView />}
        {currentView === 'process-validation' && <ProcessValidationView />}
        {currentView === 'equipment' && <EquipmentView />}
      </div>
    </div>
  );
}
