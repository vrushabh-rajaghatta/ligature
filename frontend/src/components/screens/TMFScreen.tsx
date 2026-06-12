

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  FolderArchive,
  FileText,
  ChevronRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Link2,
  Shield,
  FileCheck,
  FolderOpen,
  Building2,
  Globe,
  Settings,
  Play,
  Pause,
  Zap,
  BarChart3,
  CheckSquare,
  XCircle,
  PenTool,
  Eye,
  TrendingUp,
  GitCompare,
  ClipboardCheck,
  Archive,
  ExternalLink,
} from 'lucide-react';
import { useTMFStore } from '@/store/useTMFStore';
import { useScopeContext } from '@/hooks/useScopeContext';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';
import { useAppStore } from '@/store/useAppStore';
import { generateTMFDocumentContent, ZONE_DISPLAY_NAMES } from '@/data/tmf-document-templates';
import { TMFComplianceDashboard } from '@/components/tmf/TMFComplianceDashboard';
import { TMFComplianceTrendAnalytics } from '@/components/tmf/TMFComplianceTrendAnalytics';
import { TMFVersionComparison } from '@/components/tmf/TMFVersionComparison';
// v0.13.90: Gap Analysis component
import { TMFGapAnalysis } from '@/components/tmf/TMFGapAnalysis';
// v0.13.91: Audit Readiness component
import { TMFAuditReadiness } from '@/components/tmf/TMFAuditReadiness';
// v0.15.29: DIA Gap Trend Analytics
import { DIAGapTrendAnalytics } from '@/components/tmf/DIAGapTrendAnalytics';
// v0.40.8: Zone Completeness Dashboard
import { TMFCompletenessDashboard } from '@/components/tmf/TMFCompletenessDashboard';
// v0.40.9: Auto-Link Management Dashboard
import { AutoLinkDashboard } from '@/components/tmf/AutoLinkDashboard';
// v0.14.4: Document Lineage Provenance
import { TMFProvenanceIndicator } from '@/components/tmf/TMFProvenanceIndicator';
// v173: Cross-module document linking
// v0.15.2: Document Number Links
import { DocumentLinkActions } from '@/components/documents/DocumentLinkActions';
import { LinkedDocumentsBadge } from '@/components/documents/LinkedDocumentsPanel';
import { DocumentNumberLink } from '@/components/documents/DocumentNumberLink';
import type {
  TMFStudy,
  TMFArtifact,
  TMFZone,
  ArtifactStatus,
  QualityStatus,
  AutoLinkRule,
  AutoLinkEvent,
  SourceModule,
  StudyMilestone,
} from '@/domains/tmf/contracts';
import { useViewerActions, type TMFArtifactDocument } from '@/hooks/useDocumentViewerService';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileUpload } from '@/components/ui/FileUpload';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ProgressBar } from '@/components/ui/Progress';
import type { UploadedFile } from '@/components/ui/FileUpload';
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
// v0.27.4: Drillable stats for demo polish
import { DrillableStatCard, type DrilldownConfig } from '@/components/ui/DrillableStatCard';
import { CompactStatBar } from '@/components/ui/CompactStatBar';
import type { BadgeColor } from '@/components/ui/Badge';
import type { ProgressColor } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { useCascadeEngine } from '@/store/useCascadeEngine';
// v0.43.8: ScrollableTabs for responsive tab bars
import { ScrollableTabs } from '@/components/ui/ScrollableTabs';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

type TMFTab = 'studies' | 'artifacts' | 'compliance' | 'gap-analysis' | 'audit-readiness' | 'trends' | 'comparison' | 'completeness' | 'auto-linking' | 'inspection';

interface FilterState {
  product?: string;
  therapeuticArea?: string;
  modality?: string;
  region?: string;
  stage?: string;
}

interface TMFScreenProps {
  filters: FilterState;
}

// Zone names
const ZONE_NAMES: Record<TMFZone, string> = {
  'zone-01': 'Trial Management',
  'zone-02': 'Central Trial Documents',
  'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC Approvals',
  'zone-05': 'Site Management',
  'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting',
  'zone-08': 'Central and Local Testing',
  'zone-09': 'Third Parties',
  'zone-10': 'Data Management',
};

const ZONE_ICONS: Record<TMFZone, React.ReactNode> = {
  'zone-01': <Settings className="w-4 h-4" />,
  'zone-02': <FileText className="w-4 h-4" />,
  'zone-03': <Shield className="w-4 h-4" />,
  'zone-04': <CheckSquare className="w-4 h-4" />,
  'zone-05': <Building2 className="w-4 h-4" />,
  'zone-06': <FolderArchive className="w-4 h-4" />,
  'zone-07': <AlertTriangle className="w-4 h-4" />,
  'zone-08': <FileCheck className="w-4 h-4" />,
  'zone-09': <Link2 className="w-4 h-4" />,
  'zone-10': <BarChart3 className="w-4 h-4" />,
};

// v97: Color maps for Badge component
const artifactStatusColorMap: Record<ArtifactStatus, BadgeColor> = {
  'draft': 'slate',
  'pending-review': 'amber',
  'approved': 'blue',
  'filed': 'emerald',
  'superseded': 'purple',
  'archived': 'gray',
};

const qcStatusColorMap: Record<QualityStatus, BadgeColor> = {
  'not-reviewed': 'slate',
  'qc-pending': 'amber',
  'qc-passed': 'emerald',
  'qc-failed': 'red',
};

const sourceModuleColorMap: Record<SourceModule, BadgeColor> = {
  'ctms': 'emerald',
  'edc': 'blue',
  'safety': 'red',
  'submissions': 'amber',
  'authoring': 'purple',
  'publishing': 'orange',
  'cmc': 'teal',
  'manual': 'slate',
};

const milestoneColorMap: Record<StudyMilestone, BadgeColor> = {
  'study-start-up': 'blue',
  'first-site-initiated': 'cyan',
  'first-subject-enrolled': 'teal',
  'enrollment-complete': 'emerald',
  'last-subject-last-visit': 'purple',
  'database-lock': 'amber',
  'study-close-out': 'gray',
  'any': 'slate',
};

const eventStatusColorMap: Record<string, BadgeColor> = {
  'processed': 'emerald',
  'pending': 'amber',
  'failed': 'red',
};

export function TMFScreen({ filters }: TMFScreenProps) {
  // v0.125.33: Scope context
  const { studyProtocolNumber, scopeSummary, scopeFlag } = useScopeContext('tmf');
  const [activeTab, setActiveTab] = useState<TMFTab>('studies');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<TMFZone | null>(null);
  const [selectedArtifactId, setSelectedArtifactId] = useState<string | null>(null);
  
  // v0.13.6: Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // v0.15.29: Trends sub-tab state
  const [trendsSubTab, setTrendsSubTab] = useState<'compliance' | 'dia-gaps'>('compliance');

  // v128: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // v0.21.9: Toast for notifications
  const toast = useToast();

  // v0.44.52: Cascade engine — TMF seeding from protocol approvals
  const cascadeChains = useCascadeEngine(s => s.chains);
  const skipCascadeStep = useCascadeEngine(s => s.skipStep);

  // Use stable selectors - access the record directly
  const studiesRecord = useTMFStore(s => s.studies);
  const artifactsRecord = useTMFStore(s => s.artifacts);
  const artifactsByStudy = useTMFStore(s => s.artifactsByStudy);
  const artifactsByZone = useTMFStore(s => s.artifactsByZone);
  const autoLinkRulesRecord = useTMFStore(s => s.autoLinkRules);
  const autoLinkEventsRecord = useTMFStore(s => s.autoLinkEvents);
  const zoneDefinitions = useTMFStore(s => s.zoneDefinitions);
  const loadMockData = useTMFStore(s => s.loadMockData);
  
  // v83: Viewer service
  const { openTMFDocument } = useViewerActions();

  // Convert to arrays in render
  const studies = useMemo(() => Object.values(studiesRecord), [studiesRecord]);
  const autoLinkRules = useMemo(() => Object.values(autoLinkRulesRecord), [autoLinkRulesRecord]);
  const autoLinkEvents = useMemo(() => Object.values(autoLinkEventsRecord), [autoLinkEventsRecord]);
  const selectedStudy = selectedStudyId ? studiesRecord[selectedStudyId] : null;

  // v0.44.52: Auto-select most at-risk study (lowest completeness) on load
  useEffect(() => {
    if (isLoading || selectedStudyId || studies.length === 0) return;
    const priority =
      studies.reduce((worst, s) =>
        s.overallCompletenessScore < worst.overallCompletenessScore ? s : worst
      , studies[0]);
    if (priority) setSelectedStudyId(priority.id);
  }, [isLoading, studies]);

  // Get artifacts for selected study
  const studyArtifacts = useMemo(() => {
    if (!selectedStudyId) return [];
    const ids = artifactsByStudy[selectedStudyId] || [];
    return ids.map(id => artifactsRecord[id]).filter(Boolean);
  }, [selectedStudyId, artifactsByStudy, artifactsRecord]);

  // Get artifacts by zone for selected study
  const zoneArtifacts = useMemo(() => {
    if (!selectedStudyId || !selectedZone) return [];
    const zoneMap = artifactsByZone[selectedStudyId];
    if (!zoneMap) return [];
    const ids = zoneMap[selectedZone] || [];
    return ids.map(id => artifactsRecord[id]).filter(Boolean);
  }, [selectedStudyId, selectedZone, artifactsByZone, artifactsRecord]);

  // v168: View artifact in platform viewer with rich document content
  const handleViewArtifact = useCallback((artifact: TMFArtifact) => {
    // Get study context for document generation
    const study = selectedStudy;
    const studyTitle = study?.studyTitle || 'Clinical Study';
    const protocolNumber = study?.protocolNumber || 'PROTOCOL-001';
    const sponsorName = study?.sponsorName || 'Ligature Therapeutics';
    
    // Generate rich document content using templates
    const documentContent = generateTMFDocumentContent(
      artifact.artifactDefinitionId,
      artifact.title,
      artifact.zoneId,
      studyTitle,
      protocolNumber,
      sponsorName
    );
    
    const doc: TMFArtifactDocument = {
      id: artifact.id,
      title: artifact.title,
      zone: artifact.zoneId,
      section: artifact.sectionId,
      artifactNumber: artifact.artifactDefinitionId,
      studyId: artifact.studyId,
      status: artifact.status,
      content: documentContent,
    };
    
    openTMFDocument(doc, { readOnly: false });
  }, [openTMFDocument, selectedStudy]);

  const handleLoadData = () => {
    if (studies.length === 0) {
      loadMockData();
    }
  };

  const tabs: { id: TMFTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'studies', label: 'Studies', icon: <FolderArchive className="w-4 h-4" />, count: studies.length },
    { id: 'artifacts', label: 'Artifacts', icon: <FileText className="w-4 h-4" />, count: studyArtifacts.length },
    { id: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" />, count: 0 },
    { id: 'gap-analysis', label: 'Gap Analysis', icon: <AlertTriangle className="w-4 h-4" />, count: 0 },
    { id: 'audit-readiness', label: 'Audit Ready', icon: <ClipboardCheck className="w-4 h-4" />, count: 0 },
    { id: 'trends', label: 'Trends', icon: <BarChart3 className="w-4 h-4" />, count: 0 },
    { id: 'comparison', label: 'Comparison', icon: <GitCompare className="w-4 h-4" />, count: 0 },
    { id: 'completeness', label: 'Completeness', icon: <CheckSquare className="w-4 h-4" />, count: 0 },
    { id: 'auto-linking', label: 'Auto-Linking', icon: <Link2 className="w-4 h-4" />, count: autoLinkRules.filter(r => r.isActive).length },
    { id: 'inspection', label: 'Inspection Ready', icon: <CheckCircle2 className="w-4 h-4" />, count: 0 },
  ];

  const getStatusBadge = (status: ArtifactStatus) => {
    const labels: Record<ArtifactStatus, string> = {
      'draft': 'Draft',
      'pending-review': 'Pending Review',
      'approved': 'Approved',
      'filed': 'Filed',
      'superseded': 'Superseded',
      'archived': 'Archived',
    };
    return <Badge color={artifactStatusColorMap[status]}>{labels[status]}</Badge>;
  };

  const getQCBadge = (status: QualityStatus) => {
    const labels: Record<QualityStatus, string> = {
      'not-reviewed': 'Not Reviewed',
      'qc-pending': 'QC Pending',
      'qc-passed': 'QC Passed',
      'qc-failed': 'QC Failed',
    };
    return <Badge color={qcStatusColorMap[status]}>{labels[status]}</Badge>;
  };

  const getMilestoneBadge = (milestone: StudyMilestone) => {
    const labels: Record<StudyMilestone, string> = {
      'study-start-up': 'Study Start-up',
      'first-site-initiated': 'First Site Initiated',
      'first-subject-enrolled': 'First Subject Enrolled',
      'enrollment-complete': 'Enrollment Complete',
      'last-subject-last-visit': 'LSLV',
      'database-lock': 'Database Lock',
      'study-close-out': 'Study Close-out',
      'any': 'Any',
    };
    return <Badge color={milestoneColorMap[milestone]}>{labels[milestone]}</Badge>;
  };

  const getSourceBadge = (source: SourceModule) => {
    return <Badge color={sourceModuleColorMap[source]}>{source.toUpperCase()}</Badge>;
  };

  // Stats
  const stats = useMemo(() => {
    const totalArtifacts = Object.values(artifactsRecord).length;
    const filedArtifacts = Object.values(artifactsRecord).filter(a => a.status === 'filed').length;
    const pendingArtifacts = Object.values(artifactsRecord).filter(a => a.status === 'pending-review' || a.status === 'draft').length;
    const autoLinkedArtifacts = Object.values(artifactsRecord).filter(a => a.autoLinked).length;
    const avgCompleteness = studies.length > 0 ? Math.round(studies.reduce((sum, s) => sum + s.overallCompletenessScore, 0) / studies.length) : 0;
    const avgInspectionReady = studies.length > 0 ? Math.round(studies.reduce((sum, s) => sum + s.inspectionReadinessScore, 0) / studies.length) : 0;
    const pendingEvents = autoLinkEvents.filter(e => e.status === 'pending').length;
    return { totalStudies: studies.length, totalArtifacts, filedArtifacts, pendingArtifacts, autoLinkedArtifacts, avgCompleteness, avgInspectionReady, activeRules: autoLinkRules.filter(r => r.isActive).length, pendingEvents };
  }, [studies, artifactsRecord, autoLinkRules, autoLinkEvents]);

  // v0.27.4: Drillable stats with real data
  const tmfDrillableStats = useMemo(() => {
    const allArtifacts = Object.values(artifactsRecord);
    const pendingArts = allArtifacts.filter(a => a.status === 'pending-review' || a.status === 'draft');
    const autoLinkedArts = allArtifacts.filter(a => a.autoLinked);
    const activeRulesArr = autoLinkRules.filter(r => r.isActive);

    const statusBadgeColor: Record<string, BadgeColor> = {
      'filed': 'green', 'pending-review': 'amber', 'draft': 'gray', 'superseded': 'purple',
    };

    return [
      {
        id: 'tmf-studies',
        value: stats.totalStudies,
        label: 'TMF Studies',
        accentColor: 'teal' as const,
        icon: <FolderArchive className="w-4 h-4" />,
        drilldown: {
          title: 'TMF Studies',
          subtitle: `${stats.totalStudies} studies in the Trial Master File`,
          items: studies.map(s => ({
            id: s.id,
            protocolNumber: s.protocolNumber,
            studyTitle: s.studyTitle,
            status: s.status,
            completeness: s.overallCompletenessScore,
            inspectionReady: s.inspectionReadinessScore,
          })),
          columns: [
            { key: 'protocolNumber', label: 'Protocol', width: 100, render: (v: string) => <button onClick={() => useAppStore.getState().setActiveModule('ctms')} className="font-mono text-xs text-accent-teal hover:underline flex items-center gap-1">{v} <ExternalLink className="w-2.5 h-2.5" /></button> },
            { key: 'studyTitle', label: 'Study', render: (v: string) => <span className="text-text-primary truncate">{v}</span> },
            { key: 'status', label: 'Status', width: 70, render: (v: string) => <Badge color={v === 'active' ? 'green' : 'gray'} size="xs">{v}</Badge> },
            { key: 'completeness', label: 'Complete', width: 70, render: (v: number) => <span className={v >= 80 ? 'text-accent-green' : v >= 50 ? 'text-accent-amber' : 'text-accent-red'}>{v}%</span> },
          ],
          onItemClick: (item) => { setSelectedStudyId(item.id); setActiveTab('studies'); },
          searchable: true,
        } as DrilldownConfig,
      },
      {
        id: 'total-artifacts',
        value: stats.totalArtifacts,
        label: 'Total Artifacts',
        accentColor: 'blue' as const,
        icon: <FileText className="w-4 h-4" />,
        drilldown: {
          title: 'All TMF Artifacts',
          subtitle: `${stats.filedArtifacts} filed, ${stats.pendingArtifacts} pending`,
          items: allArtifacts.slice(0, 50).map(a => ({
            id: a.id,
            title: a.title,
            fileName: a.fileName,
            status: a.status,
            zoneId: a.zoneId,
            autoLinked: a.autoLinked,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'zoneId', label: 'Zone', width: 60, render: (v: string) => <Badge color="gray" size="xs">{v}</Badge> },
            { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={statusBadgeColor[v] || 'gray'} size="xs">{v}</Badge> },
            { key: 'autoLinked', label: 'Linked', width: 50, render: (v: boolean) => v ? <Link2 className="w-3 h-3 text-accent-green" /> : null },
          ],
          onItemClick: (item) => { setSelectedArtifactId(item.id); setActiveTab('artifacts'); },
          searchable: true,
        } as DrilldownConfig,
      },
      {
        id: 'pending',
        value: stats.pendingArtifacts,
        label: 'Pending',
        accentColor: 'amber' as const,
        icon: <Clock className="w-4 h-4" />,
        drilldown: {
          title: 'Pending Artifacts',
          subtitle: 'Documents awaiting review or in draft',
          items: pendingArts.slice(0, 30).map(a => ({
            id: a.id,
            title: a.title,
            status: a.status,
            zoneId: a.zoneId,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'zoneId', label: 'Zone', width: 60, render: (v: string) => <Badge color="gray" size="xs">{v}</Badge> },
            { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={v === 'pending-review' ? 'amber' : 'gray'} size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => { setSelectedArtifactId(item.id); setActiveTab('artifacts'); },
        } as DrilldownConfig,
      },
      {
        id: 'auto-linked',
        value: stats.autoLinkedArtifacts,
        label: 'Auto-Linked',
        accentColor: 'green' as const,
        icon: <Link2 className="w-4 h-4" />,
        drilldown: {
          title: 'Auto-Linked Artifacts',
          subtitle: 'Documents automatically linked from source modules',
          items: autoLinkedArts.slice(0, 30).map(a => ({
            id: a.id,
            title: a.title,
            sourceModule: a.sourceModule,
            zoneId: a.zoneId,
          })),
          columns: [
            { key: 'title', label: 'Document', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'sourceModule', label: 'Source', width: 80, render: (v: string) => <Badge color="teal" size="xs">{v || 'Manual'}</Badge> },
            { key: 'zoneId', label: 'Zone', width: 60, render: (v: string) => <Badge color="gray" size="xs">{v}</Badge> },
          ],
          onItemClick: (item) => { setSelectedArtifactId(item.id); setActiveTab('artifacts'); },
        } as DrilldownConfig,
      },
      {
        id: 'completeness',
        value: `${stats.avgCompleteness}%`,
        label: 'Completeness',
        accentColor: 'purple' as const,
        icon: <BarChart3 className="w-4 h-4" />,
        drilldown: {
          title: 'Study Completeness',
          subtitle: 'TMF completeness scores by study',
          items: studies.map(s => ({
            id: s.id,
            protocolNumber: s.protocolNumber,
            completeness: s.overallCompletenessScore,
            inspectionReady: s.inspectionReadinessScore,
          })),
          columns: [
            { key: 'protocolNumber', label: 'Protocol', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'completeness', label: 'Complete', width: 80, render: (v: number) => <Badge color={v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'} size="xs">{v}%</Badge> },
            { key: 'inspectionReady', label: 'Ready', width: 80, render: (v: number) => <Badge color={v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'} size="xs">{v}%</Badge> },
          ],
          onItemClick: (item) => { setSelectedStudyId(item.id); setActiveTab('completeness'); },
        } as DrilldownConfig,
      },
      {
        id: 'inspection-ready',
        value: `${stats.avgInspectionReady}%`,
        label: 'Inspection Ready',
        accentColor: 'teal' as const,
        icon: <Shield className="w-4 h-4" />,
        drilldown: {
          title: 'Inspection Readiness',
          subtitle: 'Readiness scores for regulatory inspections',
          items: studies.map(s => ({
            id: s.id,
            protocolNumber: s.protocolNumber,
            inspectionReady: s.inspectionReadinessScore,
            completeness: s.overallCompletenessScore,
          })),
          columns: [
            { key: 'protocolNumber', label: 'Protocol', width: 100, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
            { key: 'inspectionReady', label: 'Ready', width: 80, render: (v: number) => <Badge color={v >= 80 ? 'green' : v >= 50 ? 'amber' : 'red'} size="xs">{v}%</Badge> },
            { key: 'completeness', label: 'Complete', width: 80, render: (v: number) => <span className="text-text-muted">{v}%</span> },
          ],
          onItemClick: (item) => { setSelectedStudyId(item.id); setActiveTab('inspection'); },
        } as DrilldownConfig,
      },
      {
        id: 'active-rules',
        value: stats.activeRules,
        label: 'Active Rules',
        accentColor: 'amber' as const,
        icon: <Zap className="w-4 h-4" />,
        drilldown: {
          title: 'Auto-Link Rules',
          subtitle: `${stats.pendingEvents} pending events`,
          items: activeRulesArr.map(r => ({
            id: r.id,
            name: r.name,
            sourceModule: r.sourceModule,
            targetZone: r.targetZone,
            priority: r.priority,
          })),
          columns: [
            { key: 'name', label: 'Rule', render: (v: string) => <span className="text-text-primary">{v}</span> },
            { key: 'sourceModule', label: 'Source', width: 80, render: (v: string) => <Badge color="blue" size="xs">{v}</Badge> },
            { key: 'targetZone', label: 'Zone', width: 60, render: (v: string) => <Badge color="gray" size="xs">{v}</Badge> },
            { key: 'priority', label: 'Priority', width: 60, render: (v: number) => <span className="font-semibold">{v}</span> },
          ],
          onItemClick: () => setActiveTab('auto-linking'),
        } as DrilldownConfig,
      },
    ];
  }, [stats, studies, artifactsRecord, autoLinkRules, setSelectedStudyId, setActiveTab, setSelectedArtifactId]);

  const filteredStudies = useMemo(() => {
    return studies.filter(study =>
      study.protocolNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      study.studyTitle.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [studies, searchQuery]);

  const filteredArtifacts = useMemo(() => {
    let arts = selectedZone ? zoneArtifacts : studyArtifacts;
    if (searchQuery) {
      arts = arts.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.fileName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return arts;
  }, [studyArtifacts, zoneArtifacts, selectedZone, searchQuery]);

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* v0.125.33: Scope context banner */}
      <ScopeContextBanner label="Study" scopeFlag={scopeFlag} scopeSummary={scopeSummary} />
      {/* v0.50.0: ScreenHeader adoption — standardized ViewOnlyBanner */}
      <ScreenHeader
        moduleId="tmf"
        title="Trial Master File"
        subtitle="Document completeness, archival, auto-linking, and inspection readiness"
        icon={<Archive className="w-5 h-5" />}
      />
      {/* Header — v0.44.52: compact */}
      <div className="bg-surface-elevated border-b border-border px-6 py-4">
        <Breadcrumb 
          moduleId="tmf" 
          viewLabel={activeTab === 'studies' ? 'Studies' : activeTab === 'artifacts' ? 'Artifacts' : activeTab === 'completeness' ? 'Completeness' : activeTab === 'auto-linking' ? 'Auto-Linking' : 'Inspection'}
          className="mb-2"
        />
        <ReturnBreadcrumb variant="inline" className="mb-3" />

        {/* v0.44.52: Cascade strip — TMF seeding tasks from protocol approvals */}
        {(() => {
          const tmfEntries = cascadeChains
            .filter(c => c.status !== 'dismissed' && c.status !== 'complete')
            .flatMap(chain =>
              chain.steps
                .filter(s => s.targetModule === 'tmf' && (s.status === 'pending' || s.status === 'spawned'))
                .map(step => ({ chain, step }))
            );
          if (tmfEntries.length === 0) return null;
          return (
            <div className="mb-3 space-y-2">
              {tmfEntries.map(({ chain, step }) => {
                const mins = Math.floor((Date.now() - new Date(chain.trigger.triggeredAt).getTime()) / 60000);
                const ago = mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.floor(mins/60)}h ago`;
                return (
                  <div key={`${chain.id}-${step.id}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border
                      bg-cyan-500/5 border-cyan-500/25 hover:border-cyan-500/40 transition-all"
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wide">TMF Structure Required</span>
                        <span className="text-xs text-text-muted">· {ago}</span>
                      </div>
                      <p className="text-sm font-medium text-text-primary mt-0.5 truncate">{step.title}</p>
                      <p className="text-xs text-text-muted mt-0.5 truncate hidden sm:block">Triggered by: {chain.trigger.sourceLabel}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setActiveTab('studies')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                          bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500 hover:text-white transition-all"
                      >
                        <FolderOpen className="w-3 h-3" />
                        Seed Structure
                      </button>
                      <button onClick={() => skipCascadeStep(chain.id, step.id)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Dismiss"><XCircle className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-text-muted">eTMF management, completeness tracking, and inspection readiness</p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleLoadData}>
              <RefreshCw className="w-4 h-4" />
              {studies.length === 0 ? 'Load Data' : 'Refresh'}
            </Button>

            <CapabilityGate moduleId="tmf" capability="author">
            <Button variant="primary" onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4" />
              Upload Document
            </Button>
            </CapabilityGate>
          </div>
        </div>

        {/* Stats Row */}
        {/* v128: Loading state */}
        {isLoading ? (
          <div className="grid grid-cols-7 gap-4 mb-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-surface-card border border-border rounded-lg p-3 animate-pulse">
                <div className="h-4 w-16 bg-surface-elevated rounded mb-2" />
                <div className="h-6 w-10 bg-surface-elevated rounded" />
              </div>
            ))}
          </div>
        ) : (
        /* v0.36.7: Compact stat bar saves vertical space */
        <CompactStatBar 
          stats={tmfDrillableStats.map(stat => ({
            id: stat.id,
            value: stat.value,
            label: stat.label,
            icon: stat.icon,
            color: stat.accentColor,
            drilldown: stat.drilldown,
          }))}
          className="mb-4"
        />
        )}

        {/* v0.43.8: ScrollableTabs for responsive tab bars */}
        <div className="-mb-4">
          <ScrollableTabs
            tabs={tabs.map(tab => ({
              id: tab.id,
              label: tab.label,
              icon: tab.icon,
              count: tab.count > 0 ? tab.count : undefined,
            }))}
            activeTab={activeTab}
            onTabChange={(id) => { setActiveTab(id as TMFTab); setSelectedArtifactId(null); setSearchQuery(''); }}
            activeColor="#06B6D4"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* List Panel */}

            {/* Mobile sidebar toggle */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden fixed left-3 top-16 z-30 p-2 bg-surface-elevated border border-border rounded-lg shadow-lg text-text-secondary hover:text-text-primary"
              aria-label="Open TMF Hierarchy"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg>
            </button>
            {mobileSidebarOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />}
        <div className={`${mobileSidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden lg:flex"} w-[420px] border-r border-border flex flex-col`}>
          <div className="p-4 border-b border-border">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'studies' ? 'Search studies...' : activeTab === 'artifacts' ? 'Search artifacts...' : 'Search...'}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'studies' && (
              <StudyList
                studies={filteredStudies}
                selectedId={selectedStudyId}
                onSelect={(id) => { setSelectedStudyId(id); setSelectedZone(null); setSelectedArtifactId(null); }}
                getMilestoneBadge={getMilestoneBadge}
              />
            )}
            {activeTab === 'artifacts' && selectedStudyId && (
              <ZoneBrowser
                studyId={selectedStudyId}
                artifactsByZone={(artifactsByZone[selectedStudyId] || {}) as Record<TMFZone, string[]>}
                artifactsRecord={artifactsRecord}
                selectedZone={selectedZone}
                onSelectZone={(zone) => { setSelectedZone(zone); setSelectedArtifactId(null); }}
                zoneDefinitions={zoneDefinitions}
              />
            )}
            {activeTab === 'artifacts' && !selectedStudyId && (
              <EmptyState
                icon={<FolderOpen className="w-full h-full" />}
                title="No Study Selected"
                description="Select a study from the Studies tab to browse artifacts"
              />
            )}
            {activeTab === 'auto-linking' && (
              <AutoLinkRulesList
                rules={autoLinkRules}
                events={autoLinkEvents}
                getSourceBadge={getSourceBadge}
              />
            )}
            {activeTab === 'completeness' && selectedStudy && (
              <CompletenessPanel study={selectedStudy} artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>} artifactsRecord={artifactsRecord} />
            )}
            {activeTab === 'completeness' && !selectedStudy && (
              <EmptyState
                icon={<BarChart3 className="w-full h-full" />}
                title="No Study Selected"
                description="Select a study to view completeness details"
              />
            )}
            {activeTab === 'inspection' && selectedStudy && (
              <InspectionReadinessPanel study={selectedStudy} />
            )}
            {activeTab === 'inspection' && !selectedStudy && (
              <EmptyState
                icon={<Shield className="w-full h-full" />}
                title="No Study Selected"
                description="Select a study to view inspection readiness"
              />
            )}
            {activeTab === 'compliance' && selectedStudy && (
              <div className="p-4">
                <Card className="bg-cyan-500/10 border-cyan-500/30">
                  <CardContent className="p-4 text-center">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-cyan-400" />
                    <p className="text-sm font-medium text-text-primary">Compliance Dashboard</p>
                    <p className="text-xs text-text-muted mt-1">View detailed compliance metrics in the main panel →</p>
                  </CardContent>
                </Card>
              </div>
            )}
            {activeTab === 'compliance' && !selectedStudy && (
              <EmptyState
                icon={<Shield className="w-full h-full" />}
                title="No Study Selected"
                description="Select a study to view compliance dashboard"
              />
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="flex-1 overflow-y-auto bg-surface">
          {activeTab === 'studies' && selectedStudy && (
            <StudyDetail
              study={selectedStudy}
              artifacts={studyArtifacts}
              artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>}
              onSelectZone={(zone) => { setActiveTab('artifacts'); setSelectedZone(zone); }}
              getMilestoneBadge={getMilestoneBadge}
            />
          )}
          {activeTab === 'artifacts' && selectedZone && (
            <ArtifactsList
              artifacts={filteredArtifacts}
              selectedId={selectedArtifactId}
              onSelect={setSelectedArtifactId}
              onView={handleViewArtifact}
              getStatusBadge={getStatusBadge}
              getQCBadge={getQCBadge}
              getSourceBadge={getSourceBadge}
              zoneName={ZONE_NAMES[selectedZone]}
            />
          )}
          {activeTab === 'artifacts' && !selectedZone && selectedStudyId && (
            <div className="h-full flex items-center justify-center text-text-muted">
              <div className="text-center">
                <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">Select a Zone</p>
                <p className="text-sm">Choose a TMF zone to view artifacts</p>
              </div>
            </div>
          )}
          {!selectedStudy && activeTab !== 'auto-linking' && (
            <div className="h-full flex items-center justify-center text-text-muted">
              <div className="text-center">
                {studies.length === 0 ? (
                  <>
                    <FolderArchive className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">No TMF Studies Loaded</p>
                    <p className="text-sm mb-4">Click &quot;Load Data&quot; to populate with sample TMF data</p>
                  </>
                ) : (
                  <>
                    <FolderArchive className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium mb-2">Select a Study</p>
                    <p className="text-sm">Choose from the list to view TMF details</p>
                  </>
                )}
              </div>
            </div>
          )}
          {/* v0.40.9: Auto-Link Management Dashboard */}
          {activeTab === 'auto-linking' && (
            <div className="p-4">
              <AutoLinkDashboard studyId={selectedStudyId || undefined} />
            </div>
          )}
          {activeTab === 'compliance' && selectedStudy && (
            <TMFComplianceDashboard
              study={selectedStudy}
              artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>}
              artifactsRecord={artifactsRecord}
              onViewArtifact={handleViewArtifact}
              onSelectZone={(zone) => { setActiveTab('artifacts'); setSelectedZone(zone); }}
            />
          )}
          {/* v0.13.90: Gap Analysis tab */}
          {activeTab === 'gap-analysis' && selectedStudy && (
            <TMFGapAnalysis
              study={selectedStudy}
              artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>}
              artifactsRecord={artifactsRecord}
              onViewArtifact={handleViewArtifact}
              onSelectZone={(zone) => { setActiveTab('artifacts'); setSelectedZone(zone); }}
            />
          )}
          {activeTab === 'gap-analysis' && !selectedStudy && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Select a Study</h3>
              <p className="text-text-muted text-sm">Choose a study from the Studies tab to view gap analysis</p>
            </div>
          )}
          {/* v0.13.91: Audit Readiness tab */}
          {activeTab === 'audit-readiness' && selectedStudy && (
            <TMFAuditReadiness
              study={selectedStudy}
              artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>}
              artifactsRecord={artifactsRecord}
              onSelectZone={(zone) => { setActiveTab('artifacts'); setSelectedZone(zone); }}
            />
          )}
          {activeTab === 'audit-readiness' && !selectedStudy && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Select a Study</h3>
              <p className="text-text-muted text-sm">Choose a study from the Studies tab to view audit readiness</p>
            </div>
          )}
          {/* v0.40.8: Zone Completeness Dashboard */}
          {activeTab === 'completeness' && selectedStudy && (
            <div className="p-4">
              <TMFCompletenessDashboard 
                studyId={selectedStudy.id}
                onZoneClick={(zone) => { setActiveTab('artifacts'); setSelectedZone(zone as TMFZone); }}
              />
            </div>
          )}
          {activeTab === 'completeness' && !selectedStudy && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Select a Study</h3>
              <p className="text-text-muted text-sm">Choose a study from the Studies tab to view zone completeness</p>
            </div>
          )}
          {/* v0.40.8: Inspection Readiness Detail */}
          {activeTab === 'inspection' && selectedStudy && (
            <div className="p-4">
              <TMFCompletenessDashboard 
                studyId={selectedStudy.id}
                onZoneClick={(zone) => { setActiveTab('artifacts'); setSelectedZone(zone as TMFZone); }}
              />
            </div>
          )}
          {activeTab === 'inspection' && !selectedStudy && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="w-12 h-12 text-text-muted mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Select a Study</h3>
              <p className="text-text-muted text-sm">Choose a study from the Studies tab to view inspection readiness</p>
            </div>
          )}
          {activeTab === 'trends' && selectedStudy && (
            <div className="space-y-4">
              {/* v0.15.29: Trends Sub-tabs */}
              <div className="flex gap-2 border-b border-border pb-2">
                <button
                  onClick={() => setTrendsSubTab('compliance')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    trendsSubTab === 'compliance'
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-card'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Compliance Trends
                </button>
                <button
                  onClick={() => setTrendsSubTab('dia-gaps')}
                  className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                    trendsSubTab === 'dia-gaps'
                      ? 'bg-cyan-500/10 text-cyan-400'
                      : 'text-text-muted hover:text-text-secondary hover:bg-surface-card'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  DIA Gap Trends
                </button>
              </div>
              
              {trendsSubTab === 'compliance' && (
                <TMFComplianceTrendAnalytics
                  study={selectedStudy}
                  artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>}
                  artifactsRecord={artifactsRecord}
                />
              )}
              {trendsSubTab === 'dia-gaps' && (
                <DIAGapTrendAnalytics
                  study={selectedStudy}
                  artifactsByZone={(artifactsByZone[selectedStudy.id] || {}) as Record<TMFZone, string[]>}
                  artifactsRecord={artifactsRecord}
                  onSelectZone={(zone) => {
                    setSelectedZone(zone);
                    setActiveTab('artifacts');
                  }}
                />
              )}
            </div>
          )}
          {activeTab === 'comparison' && selectedStudy && (
            <TMFVersionComparison studyId={selectedStudy.id} />
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload TMF Document"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-muted">
            Upload a document to the Trial Master File. Files will be stored securely and linked to the appropriate study and zone.
          </p>
          
          <FileUpload
            context="tmf"
            targetPath={selectedStudy ? `${selectedStudy.id}/${selectedZone || 'unassigned'}` : undefined}
            label="Select TMF Document"
            helperText="Supported: PDF, Word, Excel, XML (max 50MB)"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.xml"
            onUploadComplete={(file: UploadedFile) => {
              // v0.21.9: Toast instead of console.log
              toast.success(`Document uploaded: ${file.fileName}`);
              setShowUploadModal(false);
            }}
            onUploadError={(error) => {
              console.error('[TMF] Upload error:', error);
            }}
          />
          
          {selectedStudy && (
            <div className="text-xs text-text-muted bg-surface-elevated rounded-lg p-3">
              <div className="font-medium text-text-secondary mb-1">Upload destination:</div>
              <div>Study: {selectedStudy.studyId} - {selectedStudy.studyTitle}</div>
              {selectedZone && <div>Zone: {ZONE_NAMES[selectedZone]}</div>}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

// =============================================================================
// STAT CARD
// =============================================================================
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: 'cyan' | 'blue' | 'teal' | 'emerald' | 'amber' | 'purple' | 'orange' | 'red' | 'slate';
}

function StatCard({ label, value, subValue, icon, color }: StatCardProps) {
  const colorClasses = {
    cyan: 'bg-cyan-500/20 text-cyan-400',
    blue: 'bg-blue-500/20 text-blue-400',
    teal: 'bg-teal-500/20 text-teal-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
    red: 'bg-red-500/20 text-red-400',
    slate: 'bg-slate-500/20 text-slate-400',
  };
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-1.5 rounded ${colorClasses[color]}`}>{icon}</div>
        </div>
        <div className="flex items-baseline gap-1">
          <div className="text-xl font-semibold text-text-primary">{value}</div>
          {subValue && <div className="text-xs text-text-muted">{subValue}</div>}
        </div>
        <div className="text-xs text-text-muted mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// STUDY LIST
// =============================================================================
interface StudyListProps {
  studies: TMFStudy[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  getMilestoneBadge: (milestone: StudyMilestone) => React.ReactNode;
}

function StudyList({ studies, selectedId, onSelect, getMilestoneBadge }: StudyListProps) {
  if (studies.length === 0) {
    return (
      <EmptyState
        icon={<FolderArchive className="w-full h-full" />}
        title="No TMF Studies"
        description="No TMF studies found"
      />
    );
  }
  return (
    <div className="divide-y divide-border">
      {studies.map(study => (
        <button
          key={study.id}
          onClick={() => onSelect(study.id)}
          className={`w-full text-left p-4 hover:bg-surface-card transition-colors ${
            selectedId === study.id ? 'bg-surface-card border-l-2 border-cyan-500' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-text-muted">{study.protocolNumber}</span>
                {getMilestoneBadge(study.currentMilestone)}
              </div>
              <h3 className="font-medium text-text-primary text-sm truncate">{study.studyTitle}</h3>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
          </div>

          {/* Completeness Bars */}
          <div className="space-y-2 mt-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted">Overall</span>
                <span className="text-text-secondary">{study.overallCompletenessScore}%</span>
              </div>
              <ProgressBar value={study.overallCompletenessScore} color="cyan" size="xs" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-muted">Critical</span>
                <span className="text-text-secondary">{study.criticalCompletenessScore}%</span>
              </div>
              <ProgressBar 
                value={study.criticalCompletenessScore} 
                color={study.criticalCompletenessScore >= 90 ? 'emerald' : study.criticalCompletenessScore >= 70 ? 'amber' : 'red'} 
                size="xs" 
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{study.totalArtifactsFiled}/{study.totalArtifactsExpected}</span>
            </div>
            <div className="flex items-center gap-1">
              <Globe className="w-3 h-3" />
              <span>{study.countryList.length} countries</span>
            </div>
            <div className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              <span>{study.siteList.length} sites</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// STUDY DETAIL
// =============================================================================
interface StudyDetailProps {
  study: TMFStudy;
  artifacts: TMFArtifact[];
  artifactsByZone: Record<TMFZone, string[]>;
  onSelectZone: (zone: TMFZone) => void;
  getMilestoneBadge: (milestone: StudyMilestone) => React.ReactNode;
}

function StudyDetail({ study, artifacts, artifactsByZone, onSelectZone, getMilestoneBadge }: StudyDetailProps) {
  const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];

  return (
    <div className="p-4 md:p-6">
      {/* v0.50.0: ViewOnlyBanner moved to top-level ScreenHeader */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-mono text-text-muted">{study.protocolNumber}</span>
          {getMilestoneBadge(study.currentMilestone)}
          <Badge color={study.status === 'active' ? 'emerald' : 'slate'}>{study.status}</Badge>
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-1">{study.studyTitle}</h2>
        <p className="text-sm text-text-muted">{study.sponsorName} • DIA Reference Model {study.referenceModelVersion}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
        <MetricCard label="Overall Completeness" value={`${study.overallCompletenessScore}%`} color="cyan" />
        <MetricCard label="Critical Completeness" value={`${study.criticalCompletenessScore}%`} color={study.criticalCompletenessScore >= 90 ? 'emerald' : study.criticalCompletenessScore >= 70 ? 'amber' : 'red'} />
        <MetricCard label="Inspection Readiness" value={`${study.inspectionReadinessScore}%`} color="teal" />
        <MetricCard label="Missing Artifacts" value={study.totalArtifactsMissing} color={study.totalArtifactsMissing > 10 ? 'red' : 'slate'} />
      </div>

      {/* Zone Overview */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">TMF Zones</h3>
          <div className="grid grid-cols-2 gap-3">
            {zones.map(zone => {
              const zoneArtifactIds = artifactsByZone[zone] || [];
              const count = zoneArtifactIds.length;
              return (
                <button
                  key={zone}
                  onClick={() => onSelectZone(zone)}
                  className="flex items-center gap-3 p-3 bg-surface rounded-lg hover:bg-surface-elevated transition-colors text-left"
                >
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                    {ZONE_ICONS[zone]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{ZONE_NAMES[zone]}</div>
                    <div className="text-xs text-text-muted">{count} artifact{count !== 1 ? 's' : ''}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Study Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Study Information</h3>
            <div className="space-y-3">
              <DetailRow label="Countries" value={study.countryList.join(', ')} />
              <DetailRow label="Sites" value={`${study.siteList.length} sites`} />
              <DetailRow label="Last Milestone" value={new Date(study.lastMilestoneDate).toLocaleDateString()} />
              <DetailRow label="Created" value={new Date(study.createdAt).toLocaleDateString()} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-text-primary mb-4">Artifact Summary</h3>
            <div className="space-y-3">
              <DetailRow label="Total Expected" value={String(study.totalArtifactsExpected)} />
              <DetailRow label="Filed" value={String(study.totalArtifactsFiled)} />
              <DetailRow label="Missing" value={String(study.totalArtifactsMissing)} />
              <DetailRow label="Filing Rate" value={`${study.totalArtifactsExpected > 0 ? Math.round((study.totalArtifactsFiled / study.totalArtifactsExpected) * 100) : 0}%`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// ZONE BROWSER
// =============================================================================
interface ZoneBrowserProps {
  studyId: string;
  artifactsByZone: Record<TMFZone, string[]>;
  artifactsRecord: Record<string, TMFArtifact>;
  selectedZone: TMFZone | null;
  onSelectZone: (zone: TMFZone) => void;
  zoneDefinitions: Record<TMFZone, { zone: TMFZone; name: string; description: string; isCritical: boolean }>;
}

function ZoneBrowser({ artifactsByZone, artifactsRecord, selectedZone, onSelectZone, zoneDefinitions }: ZoneBrowserProps) {
  const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];

  return (
    <div className="divide-y divide-border">
      {zones.map(zone => {
        const ids = artifactsByZone[zone] || [];
        const count = ids.length;
        const filedCount = ids.filter(id => artifactsRecord[id]?.status === 'filed').length;
        const def = zoneDefinitions[zone];

        return (
          <button
            key={zone}
            onClick={() => onSelectZone(zone)}
            className={`w-full text-left p-4 hover:bg-surface-card transition-colors ${
              selectedZone === zone ? 'bg-surface-card border-l-2 border-cyan-500' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${selectedZone === zone ? 'bg-cyan-500/20 text-cyan-400' : 'bg-surface text-text-muted'}`}>
                {ZONE_ICONS[zone]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{ZONE_NAMES[zone]}</span>
                  {def.isCritical && <Badge color="red" size="xs">Critical</Badge>}
                </div>
                <div className="text-xs text-text-muted">{def.description}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-text-primary">{count}</div>
                <div className="text-xs text-text-muted">{filedCount} filed</div>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// ARTIFACTS LIST - v173: Enhanced with Cross-Module Linking
// =============================================================================
interface ArtifactsListProps {
  artifacts: TMFArtifact[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onView: (artifact: TMFArtifact) => void;
  getStatusBadge: (status: ArtifactStatus) => React.ReactNode;
  getQCBadge: (status: QualityStatus) => React.ReactNode;
  getSourceBadge: (source: SourceModule) => React.ReactNode;
  zoneName: string;
}

function ArtifactsList({ artifacts, selectedId, onSelect, onView, getStatusBadge, getQCBadge, getSourceBadge, zoneName }: ArtifactsListProps) {
  if (artifacts.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <h3 className="text-lg font-medium text-text-primary mb-4">{zoneName}</h3>
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={<FileText className="w-full h-full" />}
              title="No Artifacts"
              description="No artifacts in this zone"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-text-primary">{zoneName}</h3>
        <span className="text-sm text-text-muted">{artifacts.length} artifact{artifacts.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {artifacts.map(artifact => (
          <Card
            key={artifact.id}
            className={`transition-colors hover:border-cyan-500/50 ${
              selectedId === artifact.id ? 'border-cyan-500' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div 
                  className="flex items-center gap-2 cursor-pointer flex-1"
                  onClick={() => onSelect(artifact.id)}
                >
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h4 className="font-medium text-text-primary text-sm">{artifact.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  {artifact.autoLinked && (
                    <Badge color="emerald" size="xs" icon={<Link2 className="w-3 h-3" />}>Auto</Badge>
                  )}
                  {/* v173: Cross-module linked documents indicator */}
                  <LinkedDocumentsBadge module="tmf" documentId={artifact.id} />
                  {getStatusBadge(artifact.status)}
                </div>
              </div>

              <p className="text-xs text-text-muted mb-3">
                {artifact.fileName}
                {/* v0.15.2: Source document link for authored documents */}
                {artifact.sourceModule === 'authoring' && artifact.sourceRecordId && (
                  <span className="ml-2">
                    • Source: <DocumentNumberLink
                      documentNumber={artifact.sourceRecordId}
                      sourceDocumentId={artifact.sourceRecordId}
                      size="sm"
                    />
                  </span>
                )}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  {getQCBadge(artifact.qualityStatus)}
                  {artifact.sourceModule && getSourceBadge(artifact.sourceModule)}
                  {/* v0.14.4: Document Lineage Provenance */}
                  <TMFProvenanceIndicator
                    artifactId={artifact.id}
                    artifactVersion={artifact.version}
                    artifactTitle={artifact.title}
                  />
                  {artifact.level !== 'trial' && (
                    <span className="text-text-muted">
                      {artifact.level === 'country' ? artifact.countryCode : artifact.siteName}
                    </span>
                  )}
                </div>
                {/* v173: View & Link actions */}
                <div className="flex items-center gap-2">
                  <DocumentLinkActions
                    module="tmf"
                    documentId={artifact.id}
                    documentType="tmf-artifact"
                    documentTitle={artifact.title}
                    documentVersion={artifact.version}
                    variant="dropdown"
                    showCount={false}
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(artifact);
                    }}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>

              {artifact.requiresSignature && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-xs">
                    <PenTool className="w-3 h-3 text-text-muted" />
                    <span className={artifact.signatureComplete ? 'text-emerald-400' : 'text-amber-400'}>
                      {artifact.signatureComplete ? 'Signature Complete' : `${artifact.signatures.filter(s => s.status === 'signed').length}/${artifact.signatures.length} Signatures`}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// AUTO-LINK RULES LIST
// =============================================================================
interface AutoLinkRulesListProps {
  rules: AutoLinkRule[];
  events: AutoLinkEvent[];
  getSourceBadge: (source: SourceModule) => React.ReactNode;
}

function AutoLinkRulesList({ rules, events, getSourceBadge }: AutoLinkRulesListProps) {
  const pendingCount = events.filter(e => e.status === 'pending').length;

  return (
    <div className="divide-y divide-border">
      {/* Summary */}
      <Card className="m-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-text-primary">Auto-Link Rules</span>
            <span className="text-sm text-text-muted">{rules.length} rules</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400">{rules.filter(r => r.isActive).length} active</span>
            <span className="text-slate-400">{rules.filter(r => !r.isActive).length} inactive</span>
            {pendingCount > 0 && <span className="text-amber-400">{pendingCount} pending</span>}
          </div>
        </CardContent>
      </Card>

      {rules.map(rule => (
        <div key={rule.id} className="p-4 hover:bg-surface-card transition-colors">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-slate-500'}`} />
              <h4 className="font-medium text-text-primary text-sm">{rule.name}</h4>
            </div>
            <IconButton 
              icon={rule.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />} 
              variant="ghost" 
              size="sm"
              label={rule.isActive ? 'Pause rule' : 'Activate rule'}
            />
          </div>
          <p className="text-xs text-text-muted mb-3">{rule.description}</p>
          <div className="flex items-center gap-3 text-xs">
            {getSourceBadge(rule.sourceModule)}
            <span className="text-text-muted">→</span>
            <span className="text-cyan-400">{ZONE_NAMES[rule.targetZone]}</span>
            {rule.autoFile && <Badge color="emerald" size="xs">Auto-file</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// AUTO-LINK DETAIL
// =============================================================================
interface AutoLinkDetailProps {
  events: AutoLinkEvent[];
  getSourceBadge: (source: SourceModule) => React.ReactNode;
}

function AutoLinkDetail({ events, getSourceBadge }: AutoLinkDetailProps) {
  const sortedEvents = [...events].sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());

  return (
    <div className="p-4 md:p-6">
      <h3 className="text-lg font-medium text-text-primary mb-4">Recent Auto-Link Events</h3>
      
      {sortedEvents.length === 0 ? (
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={<Link2 className="w-full h-full" />}
              title="No Events"
              description="No auto-link events yet"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sortedEvents.map(event => (
            <Card key={event.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    {event.status === 'processed' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {event.status === 'pending' && <Clock className="w-4 h-4 text-amber-400" />}
                    {event.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                    <h4 className="font-medium text-text-primary text-sm">{event.ruleName}</h4>
                  </div>
                  <Badge color={eventStatusColorMap[event.status]}>{event.status}</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {getSourceBadge(event.sourceModule)}
                  <span className="text-text-muted">{event.sourceEventType}</span>
                  <span className="text-text-muted">•</span>
                  <span className="text-text-muted">{new Date(event.eventTime).toLocaleString()}</span>
                </div>
                {event.errorMessage && (
                  <p className="mt-2 text-xs text-red-400">{event.errorMessage}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// COMPLETENESS PANEL
// =============================================================================
interface CompletenessPanelProps {
  study: TMFStudy;
  artifactsByZone: Record<TMFZone, string[]>;
  artifactsRecord: Record<string, TMFArtifact>;
}

function CompletenessPanel({ study, artifactsByZone, artifactsRecord }: CompletenessPanelProps) {
  const zones: TMFZone[] = ['zone-01', 'zone-02', 'zone-03', 'zone-04', 'zone-05', 'zone-06', 'zone-07', 'zone-08', 'zone-09', 'zone-10'];

  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-text-primary mb-4">Zone Completeness</h3>
      <div className="space-y-3">
        {zones.map(zone => {
          const ids = artifactsByZone[zone] || [];
          const total = ids.length;
          const filed = ids.filter(id => artifactsRecord[id]?.status === 'filed').length;
          const pct = total > 0 ? Math.round((filed / total) * 100) : 0;

          return (
            <div key={zone}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-primary">{ZONE_NAMES[zone]}</span>
                <span className="text-text-muted">{filed}/{total} ({pct}%)</span>
              </div>
              <ProgressBar
                value={pct}
                color={pct >= 90 ? 'emerald' : pct >= 70 ? 'cyan' : pct >= 50 ? 'amber' : 'red'}
                size="sm"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// INSPECTION READINESS PANEL
// =============================================================================
interface InspectionReadinessPanelProps {
  study: TMFStudy;
}

function InspectionReadinessPanel({ study }: InspectionReadinessPanelProps) {
  const readinessLevel = study.inspectionReadinessScore >= 90 ? 'Inspection Ready' :
    study.inspectionReadinessScore >= 70 ? 'Minor Gaps' :
    study.inspectionReadinessScore >= 50 ? 'Significant Gaps' : 'Not Ready';

  const readinessColor: BadgeColor = study.inspectionReadinessScore >= 90 ? 'emerald' :
    study.inspectionReadinessScore >= 70 ? 'amber' :
    study.inspectionReadinessScore >= 50 ? 'orange' : 'red';

  const barColor: ProgressColor = study.inspectionReadinessScore >= 90 ? 'emerald' :
    study.inspectionReadinessScore >= 70 ? 'amber' :
    study.inspectionReadinessScore >= 50 ? 'orange' : 'red';

  return (
    <div className="p-4">
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-text-primary">Inspection Readiness</h3>
            <Badge color={readinessColor}>{readinessLevel}</Badge>
          </div>
          <div className="text-3xl font-bold text-text-primary mb-2">{study.inspectionReadinessScore}%</div>
          <ProgressBar value={study.inspectionReadinessScore} color={barColor} size="lg" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-text-primary mb-3">Key Metrics</h3>
          <div className="space-y-3">
            <DetailRow label="Critical Completeness" value={`${study.criticalCompletenessScore}%`} />
            <DetailRow label="Missing Artifacts" value={String(study.totalArtifactsMissing)} />
            <DetailRow label="Est. Prep Time" value={study.totalArtifactsMissing > 0 ? `${study.totalArtifactsMissing * 2}h` : '0h'} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

function MetricCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'border-cyan-500/30 bg-cyan-500/10',
    emerald: 'border-emerald-500/30 bg-emerald-500/10',
    amber: 'border-amber-500/30 bg-amber-500/10',
    red: 'border-red-500/30 bg-red-500/10',
    teal: 'border-teal-500/30 bg-teal-500/10',
    slate: 'border-slate-500/30 bg-slate-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
  };
  return (
    <Card className={colorClasses[color] || colorClasses.slate}>
      <CardContent className="p-3">
        <div className="text-2xl font-semibold text-text-primary">{value}</div>
        <div className="text-xs text-text-muted">{label}</div>
      </CardContent>
    </Card>
  );
}
