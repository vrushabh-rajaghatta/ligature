

// v0.13.87: Electronic Lab Notebook Screen with Cross-Module Integration
import { useState } from 'react';
import {
  BookOpen,
  FlaskConical,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ChevronRight,
  ChevronLeft,
  Beaker,
  TestTube,
  Activity,
  PenTool,
  Eye,
  Users,
  Calendar,
  Package,
  Paperclip,
  Play,
  Check,
  X,
  Save,
  Edit3,
  Database,
  Cpu,
  Wifi,
  WifiOff,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Unlink,
  ClipboardList,
  FolderArchive,
  Shield,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { useELNStore } from '@/store/useELNStore';
import { useELNPersistence } from '@/hooks/useELNPersistence';
import { useToast } from '@/components/ui/Toast';
// v0.27.7: DrillableStatCard for actionable metrics
import { DrillableStatCard } from '@/components/ui/DrillableStatCard';
import { Badge } from '@/components/ui/Badge';
import { useDeadClick } from '@/hooks/useDeadClick';
import { 
  ExperimentStatus, 
  ExperimentType, 
  ELNExperiment, 
  ELNProcedureStep, 
  ELNDataEntry, 
  ELNInstrument,
  ELNToCTMSLink,
  ELNToTMFLink,
  ELNToSafetyLink,
  LinkableCTMSRecord,
  LinkableTMFArtifact,
  LinkableSafetyReport,
} from '@/store/elnTypes';

const statusColors: Record<ExperimentStatus, string> = {
  draft: 'bg-gray-500',
  'in-progress': 'bg-blue-500',
  completed: 'bg-green-500',
  reviewed: 'bg-purple-500',
  approved: 'bg-emerald-500',
  archived: 'bg-gray-400',
};

const statusLabels: Record<ExperimentStatus, string> = {
  draft: 'Draft',
  'in-progress': 'In Progress',
  completed: 'Completed',
  reviewed: 'Reviewed',
  approved: 'Approved',
  archived: 'Archived',
};

const typeIcons: Record<ExperimentType, React.ReactNode> = {
  synthesis: <FlaskConical className="w-4 h-4" />,
  assay: <TestTube className="w-4 h-4" />,
  formulation: <Beaker className="w-4 h-4" />,
  stability: <Clock className="w-4 h-4" />,
  analytical: <Activity className="w-4 h-4" />,
  bioanalytical: <Activity className="w-4 h-4" />,
  'cell-culture': <FlaskConical className="w-4 h-4" />,
  'animal-study': <FileText className="w-4 h-4" />,
  'process-development': <Beaker className="w-4 h-4" />,
  other: <FileText className="w-4 h-4" />,
};

// v0.42.26: Type for drilldown item clicks
interface DrilldownItem {
  id: string;
  [key: string]: unknown;
}

export function ELNScreen() {
  const {
    activeTab,
    setActiveTab,
    notebooks,
    experiments, // v0.27.7: For drillable stats
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    getFilteredExperiments,
    getDashboardMetrics,
    selectedExperimentId,
    setSelectedExperiment,
    viewingExperimentId,
    setViewingExperiment,
    getExperimentById,
    completeProtocolStep,
    uncompleteProtocolStep,
    updateExperimentObservations,
    updateExperimentResults,
    updateExperimentConclusions,
    // v0.13.86: Data capture
    instruments,
    getDataEntriesForExperiment,
    getAvailableInstruments,
    addDataEntry,
    deleteDataEntry,
    verifyDataEntry,
    captureFromInstrument,
    // v0.13.87: Cross-module linking
    getCTMSLinksForExperiment,
    getTMFLinksForExperiment,
    getSafetyLinksForExperiment,
    getUnlinkedCTMSRecords,
    getUnlinkedTMFArtifacts,
    getUnlinkedSafetyReports,
    linkToCTMS,
    linkToTMF,
    linkToSafety,
    unlinkCTMS,
    unlinkTMF,
    unlinkSafety,
  } = useELNStore();

  // v0.93.0: Persistence hook — hydrates from API, exposes sign/persist helpers
  const {
    persistExperiment,
    deleteExperiment: apiDeleteExperiment,
    signExperiment: apiSignExperiment,
    persistNotebook,
    persistDataEntry,
    deleteDataEntry: apiDeleteDataEntry,
  } = useELNPersistence();

  const { success: toastSuccess, error: toastError } = useToast();

  // v0.93.0: Sign modal state
    const { deadClick } = useDeadClick();
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signModalExp, setSignModalExp] = useState<ELNExperiment | null>(null);
  const [signTypedName, setSignTypedName] = useState('');
  const [signType, setSignType] = useState<'signed' | 'countersigned' | 'witnessed'>('signed');
  const [signLoading, setSignLoading] = useState(false);
  // v0.126.8: Notebook drill-in
  const [viewingNotebookId, setViewingNotebookId] = useState<string | null>(null);

  const handleOpenSignModal = (exp: ELNExperiment) => {
    setSignModalExp(exp);
    setSignTypedName('');
    setSignType(exp.signatureStatus === 'unsigned' ? 'signed' : 'countersigned');
    setSignModalOpen(true);
  };

  const handleConfirmSign = async () => {
    if (!signModalExp || signTypedName.trim().length < 2) return;
    setSignLoading(true);
    try {
      const result = await apiSignExperiment(
        signModalExp.id,
        'Current User',
        signType,
        signTypedName
      );
      if (result.success) {
        toastSuccess(`Experiment ${signType} successfully (21 CFR Part 11)`);
        setSignModalOpen(false);
        setSignModalExp(null);
      } else {
        toastError(result.error || 'Signature failed');
      }
    } finally {
      setSignLoading(false);
    }
  };

  const metrics = getDashboardMetrics();
  const filteredExperiments = getFilteredExperiments();
  const viewingExperiment = viewingExperimentId ? getExperimentById(viewingExperimentId) : null;
  const experimentDataEntries = viewingExperimentId ? getDataEntriesForExperiment(viewingExperimentId) : [];
  const availableInstruments = getAvailableInstruments();
  
  // v0.13.87: Cross-module links for viewing experiment
  const ctmsLinks = viewingExperimentId ? getCTMSLinksForExperiment(viewingExperimentId) : [];
  const tmfLinks = viewingExperimentId ? getTMFLinksForExperiment(viewingExperimentId) : [];
  const safetyLinks = viewingExperimentId ? getSafetyLinksForExperiment(viewingExperimentId) : [];
  const unlinkedCTMS = viewingExperimentId ? getUnlinkedCTMSRecords(viewingExperimentId) : [];
  const unlinkedTMF = viewingExperimentId ? getUnlinkedTMFArtifacts(viewingExperimentId) : [];
  const unlinkedSafety = viewingExperimentId ? getUnlinkedSafetyReports(viewingExperimentId) : [];

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <Activity className="w-4 h-4" /> },
    { id: 'experiments' as const, label: 'Experiments', icon: <FlaskConical className="w-4 h-4" /> },
    { id: 'notebooks' as const, label: 'Notebooks', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'templates' as const, label: 'Templates', icon: <FileText className="w-4 h-4" /> },
  ];

  // v0.13.85: If viewing an experiment, show detail view
  if (viewingExperiment) {
    return (
      <ExperimentDetailView
        experiment={viewingExperiment}
        dataEntries={experimentDataEntries}
        availableInstruments={availableInstruments}
        ctmsLinks={ctmsLinks}
        tmfLinks={tmfLinks}
        safetyLinks={safetyLinks}
        unlinkedCTMS={unlinkedCTMS}
        unlinkedTMF={unlinkedTMF}
        unlinkedSafety={unlinkedSafety}
        onBack={() => setViewingExperiment(null)}
        onCompleteStep={(stepId) => completeProtocolStep(viewingExperiment.id, stepId, 'Current User')}
        onUncompleteStep={(stepId) => uncompleteProtocolStep(viewingExperiment.id, stepId)}
        onUpdateObservations={(obs) => updateExperimentObservations(viewingExperiment.id, obs)}
        onUpdateResults={(res) => updateExperimentResults(viewingExperiment.id, res)}
        onUpdateConclusions={(conc) => updateExperimentConclusions(viewingExperiment.id, conc)}
        onAddDataEntry={(entry) => addDataEntry({ ...entry, experimentId: viewingExperiment.id })}
        onDeleteDataEntry={deleteDataEntry}
        onVerifyDataEntry={verifyDataEntry}
        onCaptureFromInstrument={(instrumentId, fieldName, fieldLabel) => 
          captureFromInstrument(viewingExperiment.id, instrumentId, fieldName, fieldLabel, 'Current User')
        }
        onLinkToCTMS={(record) => linkToCTMS(viewingExperiment.id, record, 'Current User')}
        onLinkToTMF={(artifact) => linkToTMF(viewingExperiment.id, artifact, 'Current User')}
        onLinkToSafety={(report) => linkToSafety(viewingExperiment.id, report, 'Current User')}
        onUnlinkCTMS={unlinkCTMS}
        onUnlinkTMF={unlinkTMF}
        onUnlinkSafety={unlinkSafety}
        onSign={handleOpenSignModal}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ScreenHeader
        moduleId="eln"
          showAssetContext
        title="Electronic Lab Notebook"
        subtitle="Capture, organize, and share experimental data across R&D"
        icon={<BookOpen className="w-5 h-5" />}
        actions={
          <CapabilityGate moduleId="eln" capability="author" inline>
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors" onClick={() => toast.success('ELN action recorded — 21 CFR Part 11 audit trail stamped')}>
              <Plus className="w-4 h-4" />
              New Experiment
            </button>
          </CapabilityGate>
        }
      >
        <div className="flex gap-1 -mb-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-elevated'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'dashboard' && <DashboardView metrics={metrics} experiments={experiments} onViewExperiment={setViewingExperiment} />}
        {activeTab === 'experiments' && (
          <ExperimentsView
            experiments={filteredExperiments}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterType={filterType}
            setFilterType={setFilterType}
            selectedExperimentId={selectedExperimentId}
            setSelectedExperiment={setSelectedExperiment}
            onOpenExperiment={setViewingExperiment}
          />
        )}
        {activeTab === 'notebooks' && !viewingNotebookId && (
          <NotebooksView notebooks={notebooks} onOpen={setViewingNotebookId} />
        )}
        {activeTab === 'notebooks' && viewingNotebookId && (() => {
          const nb = notebooks.find(n => n.id === viewingNotebookId);
          const nbExperiments = experiments.filter(e => e.notebookId === viewingNotebookId);
          if (!nb) return null;
          return (
            <NotebookDetailView
              notebook={nb}
              experiments={nbExperiments}
              onBack={() => setViewingNotebookId(null)}
              onOpenExperiment={(id) => { setViewingNotebookId(null); setViewingExperiment(id); }}
            />
          );
        })()}
        {activeTab === 'templates' && <TemplatesView />}
      </div>

      {/* v0.93.0: 21 CFR Part 11 Electronic Signature Modal */}
      {signModalOpen && signModalExp && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-md p-6 shadow-modal">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-text-primary">Electronic Signature</h2>
                <p className="text-xs text-text-muted">21 CFR Part 11 Compliant</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-surface-card rounded-lg p-3 border border-border">
                <div className="text-xs text-text-muted mb-0.5">Experiment</div>
                <div className="text-sm font-medium text-text-primary">{signModalExp.title}</div>
                <div className="text-xs text-text-muted mt-0.5">{signModalExp.type} · {signModalExp.status}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Signature Type
                </label>
                <div className="flex gap-2">
                  {(['signed', 'countersigned', 'witnessed'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSignType(type)}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors capitalize ${
                        signType === type
                          ? 'bg-accent-blue text-white border-accent-blue'
                          : 'bg-surface-card text-text-secondary border-border hover:border-accent-blue/50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Type Your Full Name to Confirm Intent
                  <span className="text-accent-red ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={signTypedName}
                  onChange={e => setSignTypedName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Chen"
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:border-accent-blue focus:outline-none"
                  autoFocus
                />
                <p className="text-xs text-text-muted mt-1.5">
                  By typing your name you confirm this constitutes your legally binding electronic signature per 21 CFR 11.100(c).
                </p>
              </div>

              {signType === 'countersigned' && (
                <div className="bg-accent-amber/10 border border-accent-amber/30 rounded-lg p-3 text-xs text-accent-amber">
                  Counter-signature confirms independent review. You must not be the original author of this experiment.
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setSignModalOpen(false); setSignModalExp(null); }}
                className="flex-1 px-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSign}
                disabled={signTypedName.trim().length < 2 || signLoading}
                className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {signLoading
                  ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Signing...</>
                  : <><CheckCircle2 className="w-4 h-4" />Apply Signature</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ 
  metrics, 
  experiments, 
  onViewExperiment 
}: { 
  metrics: ReturnType<typeof useELNStore.getState>['getDashboardMetrics'] extends () => infer R ? R : never;
  experiments: ELNExperiment[];
  onViewExperiment: (id: string) => void;
}) {
  // v0.27.7: Drillable stats configuration
  const drillableStats = [
    {
      id: 'active',
      value: metrics.activeExperiments,
      label: 'Active Experiments',
      accentColor: 'blue',
      icon: <FlaskConical className="w-5 h-5" />,
      drilldown: {
        title: 'Active Experiments',
        subtitle: 'Currently in progress',
        items: experiments.filter(e => e.status === 'in-progress').map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          author: e.author,
          notebook: e.notebookId,
        })),
        columns: [
          { key: 'title', label: 'Experiment', render: (v: string) => <span className="font-medium text-emerald-400">{v}</span> },
          { key: 'type', label: 'Type', width: 100, render: (v: string) => <Badge color="blue" size="xs">{v.replace('-', ' ')}</Badge> },
          { key: 'author', label: 'Author', width: 120 },
        ],
        searchable: true,
        onItemClick: (item: DrilldownItem) => onViewExperiment(item.id),
      },
    },
    {
      id: 'completed',
      value: metrics.completedThisMonth,
      label: 'Completed This Month',
      accentColor: 'green',
      icon: <CheckCircle className="w-5 h-5" />,
      drilldown: {
        title: 'Completed This Month',
        subtitle: 'Recently finished experiments',
        items: experiments.filter(e => e.status === 'completed' || e.status === 'reviewed' || e.status === 'approved').map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          status: e.status,
          completionDate: e.completionDate || '-',
        })),
        columns: [
          { key: 'title', label: 'Experiment', render: (v: string) => <span className="font-medium text-emerald-400">{v}</span> },
          { key: 'type', label: 'Type', width: 100, render: (v: string) => <Badge color="blue" size="xs">{v.replace('-', ' ')}</Badge> },
          { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={v === 'approved' ? 'green' : v === 'reviewed' ? 'purple' : 'teal'} size="xs">{v}</Badge> },
        ],
        searchable: true,
        onItemClick: (item: DrilldownItem) => onViewExperiment(item.id),
      },
    },
    {
      id: 'review',
      value: metrics.pendingReview,
      label: 'Pending Review',
      accentColor: 'purple',
      icon: <Eye className="w-5 h-5" />,
      drilldown: {
        title: 'Pending Review',
        subtitle: 'Awaiting review approval',
        items: experiments.filter(e => e.status === 'completed').map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          author: e.author,
          completionDate: e.completionDate || '-',
        })),
        columns: [
          { key: 'title', label: 'Experiment', render: (v: string) => <span className="font-medium text-emerald-400">{v}</span> },
          { key: 'type', label: 'Type', width: 100, render: (v: string) => <Badge color="blue" size="xs">{v.replace('-', ' ')}</Badge> },
          { key: 'author', label: 'Author', width: 120 },
        ],
        searchable: true,
        onItemClick: (item: DrilldownItem) => onViewExperiment(item.id),
      },
    },
    {
      id: 'signature',
      value: metrics.pendingSignature,
      label: 'Pending Signature',
      accentColor: 'amber',
      icon: <PenTool className="w-5 h-5" />,
      drilldown: {
        title: 'Pending Signature',
        subtitle: 'Awaiting electronic signature',
        items: experiments.filter(e => e.signatureStatus === 'unsigned' && e.status !== 'draft').map(e => ({
          id: e.id,
          title: e.title,
          type: e.type,
          status: e.status,
          author: e.author,
        })),
        columns: [
          { key: 'title', label: 'Experiment', render: (v: string) => <span className="font-medium text-emerald-400">{v}</span> },
          { key: 'type', label: 'Type', width: 100, render: (v: string) => <Badge color="blue" size="xs">{v.replace('-', ' ')}</Badge> },
          { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color="slate" size="xs">{v.replace('-', ' ')}</Badge> },
        ],
        searchable: true,
        onItemClick: (item: DrilldownItem) => onViewExperiment(item.id),
      },
    },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Metrics Cards - v0.27.7 Drillable Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {drillableStats.map(stat => (
          <DrillableStatCard
            key={stat.id}
            value={stat.value}
            label={stat.label}
            accentColor={stat.accentColor}
            icon={stat.icon}
            drilldown={stat.drilldown}
          />
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-surface-elevated rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {metrics.recentActivity.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-surface hover:bg-surface-card transition-colors cursor-pointer"
                onClick={() => onViewExperiment(activity.experimentId)}
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <ActivityIcon action={activity.action} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate">{activity.experimentTitle}</p>
                  <p className="text-xs text-text-secondary">
                    {activity.userName} {getActionVerb(activity.action)}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Experiments by Type */}
        <div className="bg-surface-elevated rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Experiments by Type</h3>
          <div className="space-y-3">
            {Object.entries(metrics.experimentsByType)
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center text-text-secondary">
                    {typeIcons[type as ExperimentType]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text-primary capitalize">
                        {type.replace('-', ' ')}
                      </span>
                      <span className="text-sm text-text-secondary">{count}</span>
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${(count / metrics.totalExperiments) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Experiments by Status */}
      <div className="bg-surface-elevated rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Experiments by Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(metrics.experimentsByStatus).map(([status, count]) => (
            <div key={status} className="text-center p-4 rounded-lg bg-surface">
              <div
                className={`w-3 h-3 rounded-full ${statusColors[status as ExperimentStatus]} mx-auto mb-2`}
              />
              <div className="text-2xl font-bold text-text-primary">{count}</div>
              <div className="text-xs text-text-secondary capitalize">
                {status.replace('-', ' ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExperimentsView({
  experiments,
  searchQuery,
  setSearchQuery,
  filterStatus,
  setFilterStatus,
  filterType,
  setFilterType,
  selectedExperimentId,
  setSelectedExperiment,
  onOpenExperiment,
}: {
  experiments: ReturnType<typeof useELNStore.getState>['getFilteredExperiments'] extends () => infer R ? R : never;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterStatus: ExperimentStatus | 'all';
  setFilterStatus: (s: ExperimentStatus | 'all') => void;
  filterType: ExperimentType | 'all';
  setFilterType: (t: ExperimentType | 'all') => void;
  selectedExperimentId: string | null;
  setSelectedExperiment: (id: string | null) => void;
  onOpenExperiment: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-muted" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ExperimentStatus | 'all')}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="reviewed">Reviewed</option>
            <option value="approved">Approved</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ExperimentType | 'all')}
            className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">All Types</option>
            <option value="synthesis">Synthesis</option>
            <option value="assay">Assay</option>
            <option value="formulation">Formulation</option>
            <option value="stability">Stability</option>
            <option value="analytical">Analytical</option>
            <option value="bioanalytical">Bioanalytical</option>
            <option value="cell-culture">Cell Culture</option>
            <option value="animal-study">Animal Study</option>
            <option value="process-development">Process Development</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-text-secondary">
        Showing {experiments.length} experiment{experiments.length !== 1 ? 's' : ''}
      </div>

      {/* Experiments List */}
      <div className="space-y-3">
        {experiments.map((exp) => (
          <div
            key={exp.id}
            onClick={() => setSelectedExperiment(exp.id === selectedExperimentId ? null : exp.id)}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              selectedExperimentId === exp.id
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-surface-elevated border-border hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-emerald-400">
                  {typeIcons[exp.type]}
                </div>
                <div>
                  <h4 className="font-medium text-text-primary">{exp.title}</h4>
                  <p className="text-sm text-text-secondary mt-0.5">
                    {exp.projectName} {exp.studyName && `• ${exp.studyName}`}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {exp.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(exp.modifiedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusColors[exp.status]}`}
                >
                  {statusLabels[exp.status]}
                </span>
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </div>
            </div>

            {selectedExperimentId === exp.id && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">Objective:</span>
                    <p className="text-text-primary mt-1">{exp.objective}</p>
                  </div>
                  <div>
                    <span className="text-text-muted">Signature Status:</span>
                    <p className="text-text-primary mt-1 capitalize">{exp.signatureStatus}</p>
                  </div>
                </div>
                {exp.tags.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    {exp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-surface rounded text-xs text-text-secondary"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenExperiment(exp.id);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    Open Experiment
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {experiments.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <FlaskConical className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No experiments found matching your criteria</p>
          </div>
        )}
      </div>
    </div>
  );
}

// v0.126.8: Notebook detail drill-in
interface NotebookDetailViewProps {
  notebook: ReturnType<typeof useELNStore.getState>['notebooks'][number];
  experiments: ELNExperiment[];
  onBack: () => void;
  onOpenExperiment: (id: string) => void;
}

function NotebookDetailView({ notebook, experiments, onBack, onOpenExperiment }: NotebookDetailViewProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const filtered = experiments.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) && !e.objective.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {/* Back breadcrumb */}
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />Notebooks
        </button>
        <ChevronRight className="w-4 h-4 text-text-muted" />
        <span className="text-sm font-medium text-text-primary">{notebook.name}</span>
        <span className={`ml-2 px-2 py-0.5 rounded text-xs ${notebook.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>{notebook.status}</span>
      </div>

      {/* Notebook meta card */}
      <div className="bg-surface-elevated border border-border rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary mb-1">{notebook.name}</h2>
            <p className="text-sm text-text-secondary mb-3">{notebook.description}</p>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{notebook.ownerName}</span>
              <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{notebook.experimentCount} experiments</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Created {new Date(notebook.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search experiments…"
            className="w-full pl-9 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
        </select>
        <span className="text-sm text-text-muted">{filtered.length} experiment{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Experiment list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">No experiments match your filters.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exp => (
            <div
              key={exp.id}
              onClick={() => onOpenExperiment(exp.id)}
              className="bg-surface-elevated border border-border rounded-lg p-4 hover:border-emerald-500/40 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-card flex items-center justify-center flex-shrink-0 mt-0.5 text-text-muted">
                    {typeIcons[exp.type]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-text-primary group-hover:text-emerald-400 transition-colors">{exp.title}</span>
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColors[exp.status]}`} />
                      <span className="text-xs text-text-muted">{statusLabels[exp.status]}</span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-1">{exp.objective}</p>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-xs text-text-muted">{exp.author}</div>
                  <div className="text-xs text-text-muted mt-0.5">{exp.modifiedAt ? new Date(exp.modifiedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotebooksView({ notebooks, onOpen }: { notebooks: ReturnType<typeof useELNStore.getState>['notebooks']; onOpen: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notebooks.map((notebook) => (
        <div
          key={notebook.id}
          className="p-5 rounded-xl bg-surface-elevated border border-border hover:border-emerald-500/50 hover:shadow-sm transition-all cursor-pointer group"
          onClick={() => onOpen(notebook.id)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-emerald-400" />
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                notebook.status === 'active'
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-gray-500/10 text-gray-400'
              }`}
            >
              {notebook.status}
            </span>
          </div>
          <h4 className="font-medium text-text-primary mb-1 group-hover:text-emerald-400 transition-colors">{notebook.name}</h4>
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">{notebook.description}</p>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{notebook.ownerName}</span>
            <span className="group-hover:text-emerald-400 transition-colors">{notebook.experimentCount} experiments →</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TemplatesView() {
  const { templates } = useELNStore();
  const toast = useToast();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <div
          key={template.id}
          className="p-5 rounded-xl bg-surface-elevated border border-border hover:border-emerald-500/30 transition-colors cursor-pointer"
          onClick={() => toast.info(`Template: ${template.name} — ${template.procedureSteps.length} steps, used ${template.usageCount} times`)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              {typeIcons[template.type]}
            </div>
            {template.isGlobal && (
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs">
                Global
              </span>
            )}
          </div>
          <h4 className="font-medium text-text-primary mb-1">{template.name}</h4>
          <p className="text-sm text-text-secondary mb-3 line-clamp-2">{template.description}</p>
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>{template.procedureSteps.length} steps</span>
            <span>Used {template.usageCount} times</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// v0.13.85: Experiment Detail View with Protocol Execution
function ExperimentDetailView({
  experiment,
  dataEntries,
  availableInstruments,
  ctmsLinks,
  tmfLinks,
  safetyLinks,
  unlinkedCTMS,
  unlinkedTMF,
  unlinkedSafety,
  onBack,
  onCompleteStep,
  onUncompleteStep,
  onUpdateObservations,
  onUpdateResults,
  onUpdateConclusions,
  onAddDataEntry,
  onDeleteDataEntry,
  onVerifyDataEntry,
  onCaptureFromInstrument,
  onLinkToCTMS,
  onLinkToTMF,
  onLinkToSafety,
  onUnlinkCTMS,
  onUnlinkTMF,
  onUnlinkSafety,
  onSign,
}: {
  experiment: ELNExperiment;
  dataEntries: ELNDataEntry[];
  availableInstruments: ELNInstrument[];
  ctmsLinks: ELNToCTMSLink[];
  tmfLinks: ELNToTMFLink[];
  safetyLinks: ELNToSafetyLink[];
  unlinkedCTMS: LinkableCTMSRecord[];
  unlinkedTMF: LinkableTMFArtifact[];
  unlinkedSafety: LinkableSafetyReport[];
  onBack: () => void;
  onCompleteStep: (stepId: string) => void;
  onUncompleteStep: (stepId: string) => void;
  onUpdateObservations: (obs: string) => void;
  onUpdateResults: (res: string) => void;
  onUpdateConclusions: (conc: string) => void;
  onAddDataEntry: (entry: Omit<ELNDataEntry, 'id' | 'timestamp' | 'experimentId'>) => void;
  onDeleteDataEntry: (entryId: string) => void;
  onVerifyDataEntry: (entryId: string, verifiedBy: string) => void;
  onCaptureFromInstrument: (instrumentId: string, fieldName: string, fieldLabel: string) => void;
  onLinkToCTMS: (record: LinkableCTMSRecord) => void;
  onLinkToTMF: (artifact: LinkableTMFArtifact) => void;
  onLinkToSafety: (report: LinkableSafetyReport) => void;
  onUnlinkCTMS: (linkId: string) => void;
  onUnlinkTMF: (linkId: string) => void;
  onUnlinkSafety: (linkId: string) => void;
  onSign?: (experiment: ELNExperiment) => void;
}) {
  const [editingField, setEditingField] = useState<'observations' | 'results' | 'conclusions' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDataCaptureForm, setShowDataCaptureForm] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState<'ctms' | 'tmf' | 'safety' | null>(null);
  const [newEntryForm, setNewEntryForm] = useState({
    fieldName: '',
    fieldLabel: '',
    value: '',
    unit: '',
    entryType: 'manual' as const,
    notes: '',
  });

  const completedSteps = experiment.procedures.filter((s) => s.completedAt).length;
  const totalSteps = experiment.procedures.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleSaveField = (field: 'observations' | 'results' | 'conclusions') => {
    if (field === 'observations') onUpdateObservations(editValue);
    else if (field === 'results') onUpdateResults(editValue);
    else if (field === 'conclusions') onUpdateConclusions(editValue);
    setEditingField(null);
  };

  const startEditing = (field: 'observations' | 'results' | 'conclusions') => {
    setEditingField(field);
    setEditValue(experiment[field] || '');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-3 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Experiments
        </button>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                {typeIcons[experiment.type]}
              </div>
              <div>
                <h1 className="text-xl font-bold text-text-primary">{experiment.title}</h1>
                <p className="text-sm text-text-secondary">
                  {experiment.projectName} {experiment.studyName && `• ${experiment.studyName}`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${statusColors[experiment.status]}`}>
              {statusLabels[experiment.status]}
            </span>
            <span className={`px-3 py-1 rounded-full text-sm ${
              experiment.signatureStatus === 'signed' ? 'bg-green-500/10 text-green-400' :
              experiment.signatureStatus === 'countersigned' ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-gray-500/10 text-gray-400'
            }`}>
              {experiment.signatureStatus}
            </span>
            {experiment.signatureStatus !== 'countersigned' && experiment.status !== 'draft' && (
              <button
                onClick={() => onSign?.(experiment)}
                className="px-3 py-1 rounded-full text-sm bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20 transition-colors flex items-center gap-1"
              >
                <Shield className="w-3 h-3" />
                {experiment.signatureStatus === 'unsigned' ? 'Sign' : 'Counter-sign'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4 md:space-y-6">
        {/* Overview Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Objective & Hypothesis */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-text-muted mb-2">Objective</h3>
              <p className="text-text-primary">{experiment.objective}</p>
            </div>
            {experiment.hypothesis && (
              <div className="bg-surface-elevated rounded-xl border border-border p-5">
                <h3 className="text-sm font-medium text-text-muted mb-2">Hypothesis</h3>
                <p className="text-text-primary">{experiment.hypothesis}</p>
              </div>
            )}
          </div>

          {/* Right: Metadata */}
          <div className="space-y-4">
            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <h3 className="text-sm font-medium text-text-muted mb-3">Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Author</span>
                  <span className="text-text-primary">{experiment.author}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Type</span>
                  <span className="text-text-primary capitalize">{experiment.type.replace('-', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Started</span>
                  <span className="text-text-primary">{experiment.startDate || 'Not started'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Modified</span>
                  <span className="text-text-primary">{new Date(experiment.modifiedAt).toLocaleDateString()}</span>
                </div>
                {experiment.collaborators.length > 0 && (
                  <div>
                    <span className="text-text-secondary">Collaborators</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {experiment.collaborators.map((c) => (
                        <span key={c} className="px-2 py-0.5 bg-surface rounded text-xs text-text-primary">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Materials Section */}
        {experiment.materials.length > 0 && (
          <div className="bg-surface-elevated rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-text-primary">Materials</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="text-left py-2 pr-4">Material</th>
                    <th className="text-left py-2 pr-4">Catalog #</th>
                    <th className="text-left py-2 pr-4">Lot #</th>
                    <th className="text-left py-2 pr-4">Vendor</th>
                    <th className="text-right py-2">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {experiment.materials.map((mat) => (
                    <tr key={mat.id} className="border-b border-border/50">
                      <td className="py-2 pr-4 text-text-primary">{mat.name}</td>
                      <td className="py-2 pr-4 text-text-secondary">{mat.catalogNumber || '-'}</td>
                      <td className="py-2 pr-4 text-text-secondary">{mat.lotNumber || '-'}</td>
                      <td className="py-2 pr-4 text-text-secondary">{mat.vendor || '-'}</td>
                      <td className="py-2 text-right text-text-primary">{mat.quantity} {mat.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Protocol Execution Section */}
        <div className="bg-surface-elevated rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold text-text-primary">Protocol Execution</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-secondary">
                {completedSteps} of {totalSteps} steps complete
              </span>
              <div className="w-32 h-2 bg-surface rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {experiment.procedures.map((step, index) => (
              <ProtocolStepRow
                key={step.id}
                step={step}
                stepNumber={index + 1}
                onComplete={() => onCompleteStep(step.id)}
                onUncomplete={() => onUncompleteStep(step.id)}
              />
            ))}
          </div>
        </div>

        {/* v0.13.86: Data Capture Section */}
        <div className="bg-surface-elevated rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-text-primary">Data Capture</h3>
              <span className="text-sm text-text-muted">({dataEntries.length} entries)</span>
            </div>
            <button
              onClick={() => setShowDataCaptureForm(!showDataCaptureForm)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Entry
            </button>
          </div>

          {/* Add Entry Form */}
          {showDataCaptureForm && (
            <div className="mb-4 p-4 bg-surface rounded-lg border border-border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Field Name</label>
                  <input
                    type="text"
                    value={newEntryForm.fieldName}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, fieldName: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary"
                    placeholder="e.g., temperature_1"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Label</label>
                  <input
                    type="text"
                    value={newEntryForm.fieldLabel}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, fieldLabel: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary"
                    placeholder="e.g., Temperature Reading"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Value</label>
                  <input
                    type="text"
                    value={newEntryForm.value}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, value: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary"
                    placeholder="e.g., 65.5"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-muted mb-1">Unit</label>
                  <input
                    type="text"
                    value={newEntryForm.unit}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary"
                    placeholder="e.g., °C"
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-xs text-text-muted mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newEntryForm.notes}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary"
                  placeholder="Any additional notes..."
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {availableInstruments.length > 0 && (
                    <select
                      className="px-3 py-2 bg-surface-elevated border border-border rounded-lg text-sm text-text-primary"
                      onChange={(e) => {
                        if (e.target.value && newEntryForm.fieldName && newEntryForm.fieldLabel) {
                          onCaptureFromInstrument(e.target.value, newEntryForm.fieldName, newEntryForm.fieldLabel);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="" disabled>Capture from instrument...</option>
                      {availableInstruments.map((inst) => (
                        <option key={inst.id} value={inst.id}>
                          {inst.name} ({inst.type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowDataCaptureForm(false)}
                    className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (newEntryForm.fieldName && newEntryForm.fieldLabel && newEntryForm.value) {
                        onAddDataEntry({
                          entryType: 'manual',
                          fieldName: newEntryForm.fieldName,
                          fieldLabel: newEntryForm.fieldLabel,
                          value: isNaN(Number(newEntryForm.value)) ? newEntryForm.value : Number(newEntryForm.value),
                          unit: newEntryForm.unit || undefined,
                          notes: newEntryForm.notes || undefined,
                          enteredBy: 'Current User',
                        });
                        setNewEntryForm({ fieldName: '', fieldLabel: '', value: '', unit: '', entryType: 'manual', notes: '' });
                        setShowDataCaptureForm(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data Entries Table */}
          {dataEntries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-text-muted border-b border-border">
                    <th className="text-left py-2 pr-4">Field</th>
                    <th className="text-left py-2 pr-4">Value</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2 pr-4">Entered By</th>
                    <th className="text-left py-2 pr-4">Time</th>
                    <th className="text-left py-2 pr-4">Status</th>
                    <th className="text-right py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataEntries.map((entry) => (
                    <DataEntryRow
                      key={entry.id}
                      entry={entry}
                      onVerify={() => onVerifyDataEntry(entry.id, 'Current User')}
                      onDelete={() => {
                        if (window.confirm(`Delete entry "${entry.parameter}"? This cannot be undone.`)) {
                          onDeleteDataEntry(entry.id);
                        }
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No data entries yet. Click "Add Entry" to capture experimental data.</p>
            </div>
          )}

          {/* Instrument Status Panel */}
          {availableInstruments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-text-muted mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Available Instruments
              </h4>
              <div className="flex flex-wrap gap-2">
                {availableInstruments.map((inst) => (
                  <div
                    key={inst.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-surface rounded-lg border border-border"
                  >
                    {inst.integrationEnabled ? (
                      <Wifi className="w-3 h-3 text-green-400" />
                    ) : (
                      <WifiOff className="w-3 h-3 text-text-muted" />
                    )}
                    <span className="text-xs text-text-primary">{inst.name}</span>
                    <span className="text-xs text-text-muted">({inst.type})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* v0.13.87: Cross-Module Links Section */}
        <div className="bg-surface-elevated rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-text-primary">Cross-Module Links</h3>
              <span className="text-sm text-text-muted">
                ({ctmsLinks.length + tmfLinks.length + safetyLinks.length} links)
              </span>
            </div>
          </div>

          {/* Link Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* CTMS Links */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-text-primary">CTMS</span>
                  <span className="text-xs text-text-muted">({ctmsLinks.length})</span>
                </div>
                <button
                  onClick={() => setShowLinkPanel(showLinkPanel === 'ctms' ? null : 'ctms')}
                  className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-blue-400 transition-colors"
                  title="Add CTMS link"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showLinkPanel === 'ctms' && unlinkedCTMS.length > 0 && (
                <div className="mb-3 p-2 bg-blue-500/5 rounded border border-blue-500/20">
                  <select
                    className="w-full px-2 py-1 bg-surface border border-border rounded text-xs text-text-primary"
                    onChange={(e) => {
                      const record = unlinkedCTMS.find((r) => r.id === e.target.value);
                      if (record) {
                        onLinkToCTMS(record);
                        setShowLinkPanel(null);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select record to link...</option>
                    {unlinkedCTMS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                {ctmsLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2 bg-surface-elevated rounded">
                    <div>
                      <p className="text-xs text-text-primary">{link.ctmsRecordName}</p>
                      <p className="text-xs text-text-muted">{link.ctmsRecordType} • {link.studyName}</p>
                    </div>
                    <button
                      onClick={() => onUnlinkCTMS(link.id)}
                      className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                      title="Unlink"
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {ctmsLinks.length === 0 && (
                  <p className="text-xs text-text-muted italic">No CTMS records linked</p>
                )}
              </div>
            </div>

            {/* TMF Links */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-text-primary">TMF</span>
                  <span className="text-xs text-text-muted">({tmfLinks.length})</span>
                </div>
                <button
                  onClick={() => setShowLinkPanel(showLinkPanel === 'tmf' ? null : 'tmf')}
                  className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-amber-400 transition-colors"
                  title="Add TMF link"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showLinkPanel === 'tmf' && unlinkedTMF.length > 0 && (
                <div className="mb-3 p-2 bg-amber-500/5 rounded border border-amber-500/20">
                  <select
                    className="w-full px-2 py-1 bg-surface border border-border rounded text-xs text-text-primary"
                    onChange={(e) => {
                      const artifact = unlinkedTMF.find((a) => a.id === e.target.value);
                      if (artifact) {
                        onLinkToTMF(artifact);
                        setShowLinkPanel(null);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select artifact to link...</option>
                    {unlinkedTMF.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.zone})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                {tmfLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2 bg-surface-elevated rounded">
                    <div>
                      <p className="text-xs text-text-primary">{link.tmfArtifactName}</p>
                      <p className="text-xs text-text-muted">{link.tmfZone} • {link.tmfSection}</p>
                    </div>
                    <button
                      onClick={() => onUnlinkTMF(link.id)}
                      className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                      title="Unlink"
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {tmfLinks.length === 0 && (
                  <p className="text-xs text-text-muted italic">No TMF artifacts linked</p>
                )}
              </div>
            </div>

            {/* Safety Links */}
            <div className="bg-surface rounded-lg border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-text-primary">Safety</span>
                  <span className="text-xs text-text-muted">({safetyLinks.length})</span>
                </div>
                <button
                  onClick={() => setShowLinkPanel(showLinkPanel === 'safety' ? null : 'safety')}
                  className="p-1 hover:bg-surface-elevated rounded text-text-muted hover:text-red-400 transition-colors"
                  title="Add Safety link"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {showLinkPanel === 'safety' && unlinkedSafety.length > 0 && (
                <div className="mb-3 p-2 bg-red-500/5 rounded border border-red-500/20">
                  <select
                    className="w-full px-2 py-1 bg-surface border border-border rounded text-xs text-text-primary"
                    onChange={(e) => {
                      const report = unlinkedSafety.find((r) => r.id === e.target.value);
                      if (report) {
                        onLinkToSafety(report);
                        setShowLinkPanel(null);
                      }
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Select report to link...</option>
                    {unlinkedSafety.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="space-y-2">
                {safetyLinks.map((link) => (
                  <div key={link.id} className="flex items-center justify-between p-2 bg-surface-elevated rounded">
                    <div>
                      <p className="text-xs text-text-primary">{link.safetyReportName}</p>
                      <p className="text-xs text-text-muted">{link.reportType}{link.caseNumber && ` • ${link.caseNumber}`}</p>
                    </div>
                    <button
                      onClick={() => onUnlinkSafety(link.id)}
                      className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                      title="Unlink"
                    >
                      <Unlink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {safetyLinks.length === 0 && (
                  <p className="text-xs text-text-muted italic">No safety reports linked</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Observations, Results, Conclusions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Observations */}
          <EditableTextSection
            title="Observations"
            value={experiment.observations}
            isEditing={editingField === 'observations'}
            editValue={editValue}
            onStartEdit={() => startEditing('observations')}
            onSave={() => handleSaveField('observations')}
            onCancel={() => setEditingField(null)}
            onEditValueChange={setEditValue}
            placeholder="Record observations during the experiment..."
          />

          {/* Results */}
          <EditableTextSection
            title="Results"
            value={experiment.results}
            isEditing={editingField === 'results'}
            editValue={editValue}
            onStartEdit={() => startEditing('results')}
            onSave={() => handleSaveField('results')}
            onCancel={() => setEditingField(null)}
            onEditValueChange={setEditValue}
            placeholder="Document experimental results..."
          />

          {/* Conclusions */}
          <EditableTextSection
            title="Conclusions"
            value={experiment.conclusions}
            isEditing={editingField === 'conclusions'}
            editValue={editValue}
            onStartEdit={() => startEditing('conclusions')}
            onSave={() => handleSaveField('conclusions')}
            onCancel={() => setEditingField(null)}
            onEditValueChange={setEditValue}
            placeholder="Summarize conclusions..."
          />
        </div>

        {/* Attachments & Data Files */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {experiment.attachments.length > 0 && (
            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Paperclip className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-text-primary">Attachments</h3>
              </div>
              <div className="space-y-2">
                {(experiment.attachments ?? []).map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary">{att.name}</p>
                        <p className="text-xs text-text-muted">{(att.size / 1024).toFixed(0)} KB</p>
                      </div>
                    </div>
                    <span className="text-xs text-text-muted">{att.uploadedBy}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {experiment.dataFiles.length > 0 && (
            <div className="bg-surface-elevated rounded-xl border border-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-text-primary">Data Files</h3>
              </div>
              <div className="space-y-2">
                {experiment.dataFiles.map((df) => (
                  <div key={df.id} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-text-muted" />
                      <div>
                        <p className="text-sm text-text-primary">{df.name}</p>
                        <p className="text-xs text-text-muted">
                          {df.instrument && `${df.instrument} • `}{df.format} • {df.dataPoints} data points
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        {experiment.tags.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Tags:</span>
            {experiment.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-surface-elevated border border-border rounded text-sm text-text-secondary">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Protocol Step Row Component
function ProtocolStepRow({
  step,
  stepNumber,
  onComplete,
  onUncomplete,
}: {
  step: ELNProcedureStep;
  stepNumber: number;
  onComplete: () => void;
  onUncomplete: () => void;
}) {
  const isCompleted = !!step.completedAt;

  return (
    <div className={`p-4 rounded-lg border transition-all ${
      isCompleted
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-surface border-border'
    }`}>
      <div className="flex items-start gap-4">
        <button
          onClick={isCompleted ? onUncomplete : onComplete}
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            isCompleted
              ? 'bg-emerald-500 text-white'
              : 'bg-surface-elevated border border-border hover:border-emerald-500/50 text-text-muted'
          }`}
        >
          {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm">{stepNumber}</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isCompleted ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
            {step.description}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-text-muted">
            {step.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {step.duration}
              </span>
            )}
            {step.equipment && step.equipment.length > 0 && (
              <span className="flex items-center gap-1">
                <Beaker className="w-3 h-3" />
                {step.equipment.join(', ')}
              </span>
            )}
            {isCompleted && step.completedBy && (
              <span className="text-emerald-400">
                ✓ {step.completedBy} at {new Date(step.completedAt!).toLocaleTimeString()}
              </span>
            )}
          </div>
          {step.notes && (
            <p className="mt-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
              Note: {step.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// v0.13.86: Data Entry Row Component
function DataEntryRow({
  entry,
  onVerify,
  onDelete,
}: {
  entry: ELNDataEntry;
  onVerify: () => void;
  onDelete: () => void;
}) {
  const entryTypeColors: Record<string, string> = {
    manual: 'bg-blue-500/10 text-blue-400',
    instrument: 'bg-purple-500/10 text-purple-400',
    calculated: 'bg-amber-500/10 text-amber-400',
    imported: 'bg-cyan-500/10 text-cyan-400',
  };

  const isVerified = !!entry.verifiedAt;
  const isOutOfSpec = entry.isOutOfSpec;

  return (
    <tr className="border-b border-border/50 hover:bg-surface/50">
      <td className="py-3 pr-4">
        <div>
          <span className="text-text-primary font-medium">{entry.fieldLabel}</span>
          <span className="text-text-muted text-xs ml-2">({entry.fieldName})</span>
        </div>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <span className={`font-mono ${isOutOfSpec ? 'text-red-400' : 'text-text-primary'}`}>
            {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
          </span>
          {entry.unit && <span className="text-text-muted">{entry.unit}</span>}
          {isOutOfSpec && <AlertTriangle className="w-4 h-4 text-red-400" />}
        </div>
        {entry.rawReading && (
          <span className="text-xs text-text-muted">Raw: {entry.rawReading}</span>
        )}
      </td>
      <td className="py-3 pr-4">
        <span className={`px-2 py-0.5 rounded text-xs ${entryTypeColors[entry.entryType]}`}>
          {entry.entryType}
        </span>
        {entry.instrumentName && (
          <div className="text-xs text-text-muted mt-0.5">{entry.instrumentName}</div>
        )}
      </td>
      <td className="py-3 pr-4 text-text-secondary text-xs">
        {entry.enteredBy}
      </td>
      <td className="py-3 pr-4 text-text-muted text-xs">
        {new Date(entry.timestamp).toLocaleString()}
      </td>
      <td className="py-3 pr-4">
        {isVerified ? (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            <span>Verified by {entry.verifiedBy}</span>
          </div>
        ) : (
          <span className="text-xs text-text-muted">Pending</span>
        )}
      </td>
      <td className="py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {!isVerified && (
            <button
              onClick={onVerify}
              className="p-1.5 hover:bg-green-500/10 rounded text-text-muted hover:text-green-400 transition-colors"
              title="Verify entry"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400 transition-colors"
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// Editable Text Section Component
function EditableTextSection({
  title,
  value,
  isEditing,
  editValue,
  onStartEdit,
  onSave,
  onCancel,
  onEditValueChange,
  placeholder,
}: {
  title: string;
  value: string;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditValueChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="bg-surface-elevated rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-muted">{title}</h3>
        {!isEditing && (
          <button
            onClick={onStartEdit}
            className="p-1 hover:bg-surface rounded text-text-muted hover:text-text-primary transition-colors"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            className="w-full h-32 px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            placeholder={placeholder}
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-primary min-h-[4rem]">
          {value || <span className="text-text-muted italic">{placeholder}</span>}
        </p>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  color,
  bgColor,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="p-5 rounded-xl bg-surface-elevated border border-border">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-text-primary">{value}</div>
      <div className="text-sm text-text-secondary">{title}</div>
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  switch (action) {
    case 'created':
      return <Plus className="w-4 h-4 text-emerald-400" />;
    case 'updated':
      return <PenTool className="w-4 h-4 text-blue-400" />;
    case 'signed':
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'witnessed':
      return <Eye className="w-4 h-4 text-purple-400" />;
    case 'reviewed':
      return <Eye className="w-4 h-4 text-amber-400" />;
    case 'approved':
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    default:
      return <Activity className="w-4 h-4 text-text-muted" />;
  }
}

function getActionVerb(action: string): string {
  switch (action) {
    case 'created':
      return 'created this experiment';
    case 'updated':
      return 'updated this experiment';
    case 'signed':
      return 'signed this experiment';
    case 'witnessed':
      return 'witnessed this experiment';
    case 'reviewed':
      return 'reviewed this experiment';
    case 'approved':
      return 'approved this experiment';
    default:
      return action;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
