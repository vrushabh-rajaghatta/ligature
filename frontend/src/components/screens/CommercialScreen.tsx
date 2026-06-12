

/**
 * Commercial Module Screen - v0.7.0
 * 
 * Launch Command Center, MLR Workflow, and Claims Traceability
 * 
 * "R&D Connected doesn't stop at approval. When the label is finalized,
 * Commercial already has the claims. When safety signals emerge, messaging
 * updates automatically. One platform, full lifecycle."
 */

import { useState, useMemo } from 'react';
import {
  Rocket,
  Target,
  FileCheck,
  Link2,
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
  Package,
  Globe,
  FileText,
  MessageSquare,
  Search,
  Filter,
  Eye,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Shield,
  Database,
  Tag,
  Megaphone,
  DollarSign,
  GraduationCap,
  Truck,
  Stethoscope,
  RefreshCw,
  MoreHorizontal,
  Play,
  Pause,
  GitBranch,
  Layers,
  BarChart3,
  CircleDot,
  Building,
  Zap
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  productLaunches,
  mlrMaterials,
  promotionalClaims,
  mlrReviewQueues,
  getCommercialDashboardSummary,
  getProductLaunchById,
  getMLRMaterialsByProduct,
  getClaimsByProduct,
  getMaterialsUsingClaim,
  getPendingMLRMaterials,
  getClaimsExpiringWithin,
  getLaunchReadinessBreakdown,
  LAUNCH_MILESTONE_LABELS,
  MARKET_LABELS,
  MLR_MATERIAL_LABELS,
  MLR_STAGE_LABELS,
  CLAIM_TYPE_LABELS,
  type ProductLaunch,
  type LaunchMarketReadiness,
  type LaunchMilestone,
  type MLRMaterial,
  type PromotionalClaim,
  type LaunchMilestoneStatus,
  type MLRReviewStage,
  type ClaimType,
} from '@/data/commercial-data';

// ============================================================================
// TYPES
// ============================================================================

type CommercialView = 
  | 'dashboard'
  | 'launch-command'
  | 'mlr-workflow'
  | 'claims';

// ============================================================================
// STATUS HELPERS
// ============================================================================

const getMilestoneStatusColor = (status: LaunchMilestoneStatus): string => {
  switch (status) {
    case 'completed': return 'bg-green-500';
    case 'on-track': return 'bg-blue-500';
    case 'at-risk': return 'bg-amber-500';
    case 'blocked': return 'bg-red-500';
    case 'pending': return 'bg-slate-400';
    default: return 'bg-slate-400';
  }
};

const getMilestoneStatusBadge = (status: LaunchMilestoneStatus): { color: 'green' | 'blue' | 'amber' | 'red' | 'slate'; label: string } => {
  switch (status) {
    case 'completed': return { color: 'green', label: 'Completed' };
    case 'on-track': return { color: 'blue', label: 'On Track' };
    case 'at-risk': return { color: 'amber', label: 'At Risk' };
    case 'blocked': return { color: 'red', label: 'Blocked' };
    case 'pending': return { color: 'slate', label: 'Pending' };
    default: return { color: 'slate', label: status };
  }
};

const getMLRStageBadge = (stage: MLRReviewStage): { color: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate'; label: string } => {
  switch (stage) {
    case 'approved': return { color: 'green', label: 'Approved' };
    case 'submitted': return { color: 'blue', label: 'Submitted' };
    case 'medical-review': return { color: 'purple', label: 'Medical Review' };
    case 'legal-review': return { color: 'amber', label: 'Legal Review' };
    case 'regulatory-review': return { color: 'blue', label: 'Regulatory Review' };
    case 'revision-requested': return { color: 'red', label: 'Revision Requested' };
    case 'expired': return { color: 'slate', label: 'Expired' };
    case 'withdrawn': return { color: 'slate', label: 'Withdrawn' };
    default: return { color: 'slate', label: stage };
  }
};

const getClaimTypeBadge = (type: ClaimType): { color: 'green' | 'blue' | 'purple' | 'amber' | 'teal' | 'slate'; label: string } => {
  switch (type) {
    case 'efficacy': return { color: 'green', label: 'Efficacy' };
    case 'safety': return { color: 'blue', label: 'Safety' };
    case 'mechanism': return { color: 'purple', label: 'Mechanism' };
    case 'dosing': return { color: 'amber', label: 'Dosing' };
    case 'comparative': return { color: 'teal', label: 'Comparative' };
    case 'patient-population': return { color: 'blue', label: 'Patient Pop.' };
    case 'quality-of-life': return { color: 'green', label: 'QoL' };
    default: return { color: 'slate', label: type };
  }
};

const getMilestoneIcon = (type: string) => {
  switch (type) {
    case 'regulatory-approval': return <FileCheck className="w-4 h-4" />;
    case 'label-finalization': return <Tag className="w-4 h-4" />;
    case 'supply-ready': return <Truck className="w-4 h-4" />;
    case 'sales-training': return <GraduationCap className="w-4 h-4" />;
    case 'market-access': return <DollarSign className="w-4 h-4" />;
    case 'medical-readiness': return <Stethoscope className="w-4 h-4" />;
    case 'commercial-readiness': return <Megaphone className="w-4 h-4" />;
    case 'launch-date': return <Rocket className="w-4 h-4" />;
    default: return <CircleDot className="w-4 h-4" />;
  }
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface CommercialScreenProps {
  filters?: {
    product?: string;
    therapeuticArea?: string;
  };
}

export function CommercialScreen({ filters }: CommercialScreenProps) {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<CommercialView>('dashboard');
  const [selectedLaunch, setSelectedLaunch] = useState<ProductLaunch | null>(productLaunches[0] || null);
  const [selectedMarket, setSelectedMarket] = useState<string>('US');
  const [selectedMaterial, setSelectedMaterial] = useState<MLRMaterial | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<PromotionalClaim | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const summary = useMemo(() => getCommercialDashboardSummary(), []);

  // View tabs
  const viewTabs: { id: CommercialView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'launch-command', label: 'Launch Command', icon: <Rocket className="w-4 h-4" /> },
    { id: 'mlr-workflow', label: 'MLR Workflow', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'claims', label: 'Claims & Traceability', icon: <Link2 className="w-4 h-4" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Commercial Operations"
        subtitle="Launch readiness, market access, pricing strategy, and commercial analytics"
        icon={<Rocket className="w-5 h-5" />}
      />
      {/* View Tabs */}
      <div className="border-b border-border bg-surface-elevated px-4 sm:px-6 py-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-fade-right">
          {viewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === tab.id
                  ? 'bg-accent-blue/10 text-accent-blue'
                  : 'text-text-secondary hover:bg-surface-card hover:text-text-primary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'dashboard' && (
          <DashboardView summary={summary} onNavigate={setActiveView} />
        )}
        {activeView === 'launch-command' && (
          <LaunchCommandView
            launches={productLaunches}
            selectedLaunch={selectedLaunch}
            onSelectLaunch={setSelectedLaunch}
            selectedMarket={selectedMarket}
            onSelectMarket={setSelectedMarket}
          />
        )}
        {activeView === 'mlr-workflow' && (
          <MLRWorkflowView
            materials={mlrMaterials}
            queues={mlrReviewQueues}
            selectedMaterial={selectedMaterial}
            onSelectMaterial={setSelectedMaterial}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
        {activeView === 'claims' && (
          <ClaimsView
            claims={promotionalClaims}
            selectedClaim={selectedClaim}
            onSelectClaim={setSelectedClaim}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD VIEW
// ============================================================================

interface DashboardViewProps {
  summary: ReturnType<typeof getCommercialDashboardSummary>;
  onNavigate: (view: CommercialView) => void;
}

function DashboardView({ summary, onNavigate }: DashboardViewProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Commercial Operations</h1>
            <p className="text-purple-100 max-w-2xl">
              R&D Connected doesn't stop at approval. Launch readiness, MLR workflows, 
              and promotional claims — all connected to your regulatory source of truth.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
            <Sparkles className="w-5 h-5 text-purple-200" />
            <span className="text-sm font-medium">Full Lifecycle Connected</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Active Launches"
          value={summary.activeLaunches}
          icon={<Rocket className="w-5 h-5 text-purple-500" />}
          subtitle={`${summary.launchesOnTrack} on track`}
          onClick={() => onNavigate('launch-command')}
        />
        <StatCard
          title="MLR Queue"
          value={summary.pendingMLRMaterials}
          subtitle={`${summary.overdueMLRMaterials} overdue`}
          icon={<FileCheck className="w-5 h-5 text-blue-500" />}
          onClick={() => onNavigate('mlr-workflow')}
        />
        <StatCard
          title="Avg MLR Turnaround"
          value={`${summary.avgMLRTurnaround}d`}
          icon={<Clock className="w-5 h-5 text-teal-500" />}
        />
        <StatCard
          title="Active Claims"
          value={summary.activeClaims}
          subtitle={`${summary.claimsExpiringIn30Days} expiring soon`}
          icon={<Link2 className="w-5 h-5 text-amber-500" />}
          onClick={() => onNavigate('claims')}
        />
      </div>

      {/* Launch Overview + MLR Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Launch Pipeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Launch Pipeline</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('launch-command')}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {productLaunches.slice(0, 3).map((launch) => {
                const primaryMarket = launch.markets.find(m => m.market === launch.primaryMarket);
                return (
                  <div
                    key={launch.id}
                    className="flex items-center justify-between p-3 bg-surface-card rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        launch.overallReadiness >= 80 ? 'bg-green-500/10 text-green-500' :
                        launch.overallReadiness >= 60 ? 'bg-amber-500/10 text-amber-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        <Target className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary">{launch.brandName}</p>
                        <p className="text-xs text-text-muted">{launch.indication}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary">
                          {launch.overallReadiness}%
                        </span>
                        <div className="w-20 h-2 bg-surface rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              launch.overallReadiness >= 80 ? 'bg-green-500' :
                              launch.overallReadiness >= 60 ? 'bg-amber-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${launch.overallReadiness}%` }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {primaryMarket?.targetLaunchDate ? new Date(primaryMarket.targetLaunchDate).toLocaleDateString() : 'TBD'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* MLR Review Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">MLR Review Pipeline</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('mlr-workflow')}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mlrReviewQueues.map((queue) => (
                <div key={queue.reviewerRole} className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      queue.reviewerRole === 'medical' ? 'bg-purple-500/10 text-purple-500' :
                      queue.reviewerRole === 'legal' ? 'bg-amber-500/10 text-amber-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {queue.reviewerRole === 'medical' ? <Stethoscope className="w-4 h-4" /> :
                       queue.reviewerRole === 'legal' ? <Shield className="w-4 h-4" /> :
                       <FileCheck className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-text-primary capitalize">{queue.reviewerRole}</p>
                      <p className="text-xs text-text-muted">Avg: {queue.avgTurnaround}h turnaround</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-text-primary">{queue.pendingCount}</p>
                      <p className="text-xs text-text-muted">Pending</p>
                    </div>
                    {queue.overdueCount > 0 && (
                      <div className="text-center">
                        <p className="text-lg font-semibold text-red-500">{queue.overdueCount}</p>
                        <p className="text-xs text-text-muted">Overdue</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* R&D Connected Callout */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <GitBranch className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">R&D Connected: Full Lifecycle</h3>
            <p className="text-slate-300 text-sm mb-4">
              When Nexavant's label was finalized, the claims library auto-populated with 7 approved claims 
              traced directly to the PI. When CSR Section 11 was approved, efficacy claims linked to 
              Table 14.2.1. No re-keying. No version mismatches. One source of truth from clinical data 
              through promotional messaging.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-4 h-4" />
                <span>Label → Claims: Auto-linked</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Database className="w-4 h-4" />
                <span>CSR → Promotional: Traceable</span>
              </div>
              <div className="flex items-center gap-2 text-purple-400">
                <RefreshCw className="w-4 h-4" />
                <span>Safety Signal → Messaging: Cascaded</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LAUNCH COMMAND VIEW
// ============================================================================

interface LaunchCommandViewProps {
  launches: ProductLaunch[];
  selectedLaunch: ProductLaunch | null;
  onSelectLaunch: (launch: ProductLaunch) => void;
  selectedMarket: string;
  onSelectMarket: (market: string) => void;
}

function LaunchCommandView({ 
  launches, 
  selectedLaunch, 
  onSelectLaunch,
  selectedMarket,
  onSelectMarket 
}: LaunchCommandViewProps) {
  const selectedMarketData = selectedLaunch?.markets.find(m => m.market === selectedMarket);
  const readinessBreakdown = selectedLaunch ? getLaunchReadinessBreakdown(selectedLaunch) : null;

  return (
    <div className="flex gap-6 h-full">
      {/* Launch List - Left Panel */}
      <div className="w-80 flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Active Launches</h3>
          <Badge color="purple">{launches.length}</Badge>
        </div>
        <div className="space-y-2">
          {launches.map((launch) => {
            const isSelected = selectedLaunch?.id === launch.id;
            const primaryMarket = launch.markets.find(m => m.market === launch.primaryMarket);
            return (
              <button
                key={launch.id}
                onClick={() => {
                  onSelectLaunch(launch);
                  onSelectMarket(launch.primaryMarket);
                }}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-purple-500/10 border-2 border-purple-500'
                    : 'bg-surface-card border border-border hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-text-primary">{launch.brandName}</p>
                    <p className="text-xs text-text-muted">{launch.productName}</p>
                  </div>
                  <Badge 
                    color={launch.overallReadiness >= 80 ? 'green' : launch.overallReadiness >= 60 ? 'amber' : 'red'}
                  >
                    {launch.overallReadiness}%
                  </Badge>
                </div>
                <p className="text-sm text-text-secondary mb-3 line-clamp-1">{launch.indication}</p>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Globe className="w-3 h-3" />
                  <span>{launch.markets.length} markets</span>
                  <span className="mx-1">•</span>
                  <Calendar className="w-3 h-3" />
                  <span>{primaryMarket?.targetLaunchDate ? new Date(primaryMarket.targetLaunchDate).toLocaleDateString() : 'TBD'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      {selectedLaunch && selectedMarketData && (
        <div className="flex-1 space-y-4 md:space-y-6 overflow-auto">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-text-primary">{selectedLaunch.brandName}</h2>
                <Badge color={selectedMarketData.goNoGoStatus === 'go' ? 'green' : 
                             selectedMarketData.goNoGoStatus === 'conditional-go' ? 'amber' : 
                             selectedMarketData.goNoGoStatus === 'no-go' ? 'red' : 'slate'}>
                  {selectedMarketData.goNoGoStatus === 'conditional-go' ? 'Conditional Go' : 
                   selectedMarketData.goNoGoStatus.toUpperCase()}
                </Badge>
              </div>
              <p className="text-text-secondary">{selectedLaunch.indication}</p>
            </div>
            <div className="flex items-center gap-2">
              {selectedLaunch.markets.map((market) => (
                <button
                  key={market.market}
                  onClick={() => onSelectMarket(market.market)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedMarket === market.market
                      ? 'bg-purple-500 text-white'
                      : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                  }`}
                >
                  {market.market}
                </button>
              ))}
            </div>
          </div>

          {/* Readiness Overview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {readinessBreakdown && Object.entries(readinessBreakdown).map(([key, value]) => (
              <div key={key} className="bg-surface-card rounded-lg p-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-surface flex items-center justify-center">
                  {key === 'regulatory' && <FileCheck className="w-5 h-5 text-blue-500" />}
                  {key === 'supply' && <Truck className="w-5 h-5 text-teal-500" />}
                  {key === 'commercial' && <Megaphone className="w-5 h-5 text-purple-500" />}
                  {key === 'medical' && <Stethoscope className="w-5 h-5 text-green-500" />}
                  {key === 'marketAccess' && <DollarSign className="w-5 h-5 text-amber-500" />}
                </div>
                <p className="text-2xl font-bold text-text-primary">{value}%</p>
                <p className="text-xs text-text-muted capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              </div>
            ))}
          </div>

          {/* Milestone Timeline */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Launch Milestones - {MARKET_LABELS[selectedMarketData.market as keyof typeof MARKET_LABELS]}</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedMarketData.milestones.map((milestone, index) => {
                  const statusBadge = getMilestoneStatusBadge(milestone.status);
                  return (
                    <div key={milestone.id} className="flex items-start gap-4">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getMilestoneStatusColor(milestone.status)} text-white`}>
                          {getMilestoneIcon(milestone.type)}
                        </div>
                        {index < selectedMarketData.milestones.length - 1 && (
                          <div className="w-0.5 h-12 bg-border mt-2" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-text-primary">{milestone.name}</p>
                            <p className="text-sm text-text-muted">{LAUNCH_MILESTONE_LABELS[milestone.type]}</p>
                          </div>
                          <Badge color={statusBadge.color}>{statusBadge.label}</Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-text-secondary">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>Target: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                          </div>
                          {milestone.actualDate && (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="w-4 h-4" />
                              <span>Actual: {new Date(milestone.actualDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{milestone.owner}</span>
                          </div>
                        </div>
                        {milestone.notes && (
                          <p className="mt-2 text-sm text-text-muted italic">{milestone.notes}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Risks & Blockers */}
          {(selectedMarketData.risks.length > 0 || selectedMarketData.blockers.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {selectedMarketData.blockers.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-red-500">
                      <XCircle className="w-5 h-5" />
                      <h3 className="font-semibold">Blockers</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedMarketData.blockers.map((blocker, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          {blocker}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {selectedMarketData.risks.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-amber-500">
                      <AlertTriangle className="w-5 h-5" />
                      <h3 className="font-semibold">Risks</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedMarketData.risks.map((risk, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MLR WORKFLOW VIEW
// ============================================================================

interface MLRWorkflowViewProps {
  materials: MLRMaterial[];
  queues: typeof mlrReviewQueues;
  selectedMaterial: MLRMaterial | null;
  onSelectMaterial: (material: MLRMaterial | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function MLRWorkflowView({ 
  materials, 
  queues,
  selectedMaterial, 
  onSelectMaterial,
  searchQuery,
  onSearchChange 
}: MLRWorkflowViewProps) {
  const { deadClick } = useDeadClick();
  const [stageFilter, setStageFilter] = useState<MLRReviewStage | 'all'>('all');
  
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const matchesSearch = !searchQuery || 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.materialCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = stageFilter === 'all' || m.stage === stageFilter;
      return matchesSearch && matchesStage;
    });
  }, [materials, searchQuery, stageFilter]);

  return (
    <div className="flex gap-6 h-full">
      {/* Materials List */}
      <div className="w-96 flex-shrink-0 space-y-4">
        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search materials..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'submitted', 'medical-review', 'legal-review', 'regulatory-review', 'approved'] as const).map((stage) => (
              <button
                key={stage}
                onClick={() => setStageFilter(stage)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  stageFilter === stage
                    ? 'bg-blue-500 text-white'
                    : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                {stage === 'all' ? 'All' : MLR_STAGE_LABELS[stage]}
              </button>
            ))}
          </div>
        </div>

        {/* Materials List */}
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-auto">
          {filteredMaterials.map((material) => {
            const stageBadge = getMLRStageBadge(material.stage);
            const isSelected = selectedMaterial?.id === material.id;
            return (
              <button
                key={material.id}
                onClick={() => onSelectMaterial(material)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-blue-500/10 border-2 border-blue-500'
                    : 'bg-surface-card border border-border hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge color={stageBadge.color} size="sm">{stageBadge.label}</Badge>
                  <span className="text-xs text-text-muted">{material.materialCode}</span>
                </div>
                <p className="font-medium text-text-primary text-sm mb-1">{material.title}</p>
                <p className="text-xs text-text-muted mb-2">{MLR_MATERIAL_LABELS[material.type]}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{material.productName}</span>
                  <span>{material.claimIds.length} claims</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Material Detail */}
      {selectedMaterial ? (
        <div className="flex-1 space-y-4 md:space-y-6 overflow-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-text-primary">{selectedMaterial.title}</h2>
                <Badge color={getMLRStageBadge(selectedMaterial.stage).color}>
                  {getMLRStageBadge(selectedMaterial.stage).label}
                </Badge>
              </div>
              <p className="text-text-secondary">{selectedMaterial.materialCode} • {MLR_MATERIAL_LABELS[selectedMaterial.type]}</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => toast.success('Commercial record updated')}>
              <Eye className="w-4 h-4 mr-2" />
              View Material
            </Button>
          </div>

          {/* Review Progress */}
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Review Progress</h3>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {['submitted', 'medical-review', 'legal-review', 'regulatory-review', 'approved'].map((stage, index) => {
                  const stages = ['submitted', 'medical-review', 'legal-review', 'regulatory-review', 'approved'];
                  const currentIndex = stages.indexOf(selectedMaterial.stage);
                  const isComplete = index <= currentIndex;
                  const isCurrent = stage === selectedMaterial.stage;
                  
                  return (
                    <div key={stage} className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isComplete ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-blue-500 text-white' :
                        'bg-surface-card text-text-muted'
                      }`}>
                        {isComplete && index < currentIndex ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      {index < stages.length - 1 && (
                        <div className={`w-12 h-1 ${index < currentIndex ? 'bg-green-500' : 'bg-surface-card'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-text-muted">
                <span>Submitted</span>
                <span>Medical</span>
                <span>Legal</span>
                <span>Regulatory</span>
                <span>Approved</span>
              </div>
            </CardContent>
          </Card>

          {/* Claims Used */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">Claims Used ({selectedMaterial.claimIds.length})</h3>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedMaterial.claimIds.map((claimId) => {
                  const claim = promotionalClaims.find(c => c.id === claimId);
                  if (!claim) return null;
                  return (
                    <div key={claimId} className="p-3 bg-surface-card rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <Badge color={getClaimTypeBadge(claim.claimType).color} size="sm">
                          {getClaimTypeBadge(claim.claimType).label}
                        </Badge>
                        <Badge color={claim.status === 'approved' ? 'green' : 'amber'} size="sm">
                          {claim.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-primary">{claim.claimText}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                        <Database className="w-3 h-3" />
                        <span>{claim.sources.length} sources</span>
                        <span className="mx-1">•</span>
                        <span>Exp: {claim.expirationDate ? new Date(claim.expirationDate).toLocaleDateString() : 'N/A'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Comments */}
          {selectedMaterial.comments.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold">Review Comments</h3>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedMaterial.comments.map((comment) => (
                    <div key={comment.id} className={`p-4 rounded-lg ${comment.resolved ? 'bg-green-500/5 border border-green-500/20' : 'bg-amber-500/5 border border-amber-500/20'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge color={
                            comment.reviewerRole === 'medical' ? 'purple' :
                            comment.reviewerRole === 'legal' ? 'amber' : 'blue'
                          } size="sm">
                            {comment.reviewerRole}
                          </Badge>
                          <span className="text-sm font-medium text-text-primary">{comment.reviewerName}</span>
                        </div>
                        {comment.resolved ? (
                          <Badge color="green" size="sm">Resolved</Badge>
                        ) : (
                          <Badge color="amber" size="sm">Open</Badge>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary">{comment.comment}</p>
                      <p className="text-xs text-text-muted mt-2">
                        {new Date(comment.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a material to view details</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLAIMS VIEW
// ============================================================================

interface ClaimsViewProps {
  claims: PromotionalClaim[];
  selectedClaim: PromotionalClaim | null;
  onSelectClaim: (claim: PromotionalClaim | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

function ClaimsView({ 
  claims, 
  selectedClaim, 
  onSelectClaim,
  searchQuery,
  onSearchChange 
}: ClaimsViewProps) {
  const { deadClick } = useDeadClick();
  const [typeFilter, setTypeFilter] = useState<ClaimType | 'all'>('all');
  
  const filteredClaims = useMemo(() => {
    return claims.filter(c => {
      const matchesSearch = !searchQuery || 
        c.claimText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.productName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || c.claimType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [claims, searchQuery, typeFilter]);

  const relatedMaterials = selectedClaim ? getMaterialsUsingClaim(selectedClaim.id) : [];

  return (
    <div className="flex gap-6 h-full">
      {/* Claims List */}
      <div className="w-[450px] flex-shrink-0 space-y-4">
        {/* Search & Filter */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search claims..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all', 'efficacy', 'safety', 'mechanism', 'dosing', 'patient-population'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  typeFilter === type
                    ? 'bg-purple-500 text-white'
                    : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'
                }`}
              >
                {type === 'all' ? 'All' : CLAIM_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Claims List */}
        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-auto">
          {filteredClaims.map((claim) => {
            const typeBadge = getClaimTypeBadge(claim.claimType);
            const isSelected = selectedClaim?.id === claim.id;
            return (
              <button
                key={claim.id}
                onClick={() => onSelectClaim(claim)}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'bg-purple-500/10 border-2 border-purple-500'
                    : 'bg-surface-card border border-border hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <Badge color={typeBadge.color} size="sm">{typeBadge.label}</Badge>
                  <Badge color={claim.status === 'approved' ? 'green' : 'amber'} size="sm">
                    {claim.status}
                  </Badge>
                </div>
                <p className="text-sm text-text-primary mb-2 line-clamp-2">{claim.claimText}</p>
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>{claim.productName}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Database className="w-3 h-3" />
                      {claim.sources.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {claim.usageCount}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Claim Detail */}
      {selectedClaim ? (
        <div className="flex-1 space-y-4 md:space-y-6 overflow-auto">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Badge color={getClaimTypeBadge(selectedClaim.claimType).color}>
                {getClaimTypeBadge(selectedClaim.claimType).label}
              </Badge>
              <Badge color={selectedClaim.status === 'approved' ? 'green' : 'amber'}>
                {selectedClaim.status}
              </Badge>
            </div>
            <p className="text-lg text-text-primary font-medium">{selectedClaim.claimText}</p>
            <p className="text-sm text-text-muted mt-2">
              {selectedClaim.productName} • Approved: {selectedClaim.approvedDate ? new Date(selectedClaim.approvedDate).toLocaleDateString() : 'N/A'} 
              • Expires: {selectedClaim.expirationDate ? new Date(selectedClaim.expirationDate).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          {/* Source Traceability - The Key Differentiator */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold">Source Traceability</h3>
                </div>
                <Badge color="purple">R&D Connected</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedClaim.sources.map((source) => (
                  <div key={source.id} className="flex items-start gap-4 p-4 bg-surface-card rounded-lg">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      source.sourceType === 'label' ? 'bg-blue-500/10 text-blue-500' :
                      source.sourceType === 'csr' ? 'bg-green-500/10 text-green-500' :
                      source.sourceType === 'safety-data' ? 'bg-red-500/10 text-red-500' :
                      'bg-purple-500/10 text-purple-500'
                    }`}>
                      {source.sourceType === 'label' && <Tag className="w-5 h-5" />}
                      {source.sourceType === 'csr' && <FileText className="w-5 h-5" />}
                      {source.sourceType === 'safety-data' && <Shield className="w-5 h-5" />}
                      {source.sourceType === 'clinical-data' && <BarChart3 className="w-5 h-5" />}
                      {source.sourceType === 'publication' && <Building className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-text-primary">{source.sourceName}</p>
                          {source.sourceSection && (
                            <p className="text-sm text-text-secondary">{source.sourceSection}</p>
                          )}
                        </div>
                        <Badge color={
                          source.linkedModule === 'regulatory' ? 'blue' :
                          source.linkedModule === 'clinical' ? 'green' : 'red'
                        } size="sm">
                          {source.linkedModule}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-muted mt-2">
                        <span className="font-medium">Data Point:</span> {source.dataPoint}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                        <span>Extracted: {new Date(source.extractedDate).toLocaleDateString()}</span>
                        <span>Validated: {new Date(source.lastValidated).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toast.success('Commercial record updated')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Materials Using This Claim */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">Materials Using This Claim ({relatedMaterials.length})</h3>
              </div>
            </CardHeader>
            <CardContent>
              {relatedMaterials.length > 0 ? (
                <div className="space-y-2">
                  {relatedMaterials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge color={getMLRStageBadge(material.stage).color} size="sm">
                          {getMLRStageBadge(material.stage).label}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{material.title}</p>
                          <p className="text-xs text-text-muted">{material.materialCode}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => toast.success('Commercial record updated')}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-4">No materials currently using this claim</p>
              )}
            </CardContent>
          </Card>

          {/* R&D Connected Callout */}
          <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-text-primary mb-1">Automated Traceability</p>
                <p className="text-sm text-text-secondary">
                  This claim is linked directly to its source data. If the label is updated or a safety 
                  signal is detected, this claim will be automatically flagged for review. No manual 
                  reconciliation required.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted">
          <div className="text-center">
            <Link2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a claim to view traceability</p>
          </div>
        </div>
      )}
    </div>
  );
}
