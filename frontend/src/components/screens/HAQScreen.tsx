

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MessageSquare, Search, Plus, Clock, CheckCircle, AlertCircle, AlertTriangle, Send,
  Eye, Edit3, FileText, ChevronRight, ChevronDown, Sparkles, Wand2, RefreshCw, TrendingUp,
  BarChart3, ExternalLink, Copy, Download, Upload, Lightbulb,
  Target, Brain, X, Check, BookOpen, Package,
  UserPlus, Mail, FolderOpen, ArrowUpRight, Layers, GitBranch, History,
  Link2, Zap, Loader2, // v175: Evidence gathering, v0.25.9: Loading state
} from 'lucide-react';
import {
  haqQuestions, haqAnalytics, predictedQuestions, similarQuestions, haqCorrespondence,
  getOverdueQuestions,
} from '@/data/haq-data';
// v0.6.4: Response Impact Chain imports
import {
  getResponseImpact,
  HAQResponseImpact,
  ImpactedDocument,
  ImpactedSubmission,
  impactSeverityColors,
  impactStatusColors,
  submissionImpactColors,
} from '@/data/haq-response-impact-data';
import { HAQuestion, HAQStatus, HAQDiscipline, HAQPriority, HAQCorrespondence as HAQCorr } from '@/types/haq';
import { FilterState } from '@/components/layout/FilterBar';
import { useProducts } from '@/stores/products-store';
import { useHAQScreenState } from '@/hooks/useHAQScreenState';
import { HAQStatusSelector } from '@/components/ui/HAQStatusSelector';
import { HAQResponseEditor } from '@/components/ui/HAQResponseEditor';
import { HAQResponseEditorV2 } from '@/components/ui/HAQResponseEditorV2';
import { HAQReviewPanel } from '@/components/ui/HAQReviewPanel';
import { HAQTimeline } from '@/components/ui/HAQTimeline';
import { HAQWorkflowPanel, HAQWorkflowStatus } from '@/components/ui/HAQWorkflowPanel';
import { useCrossModuleStore } from '@/store/useCrossModuleStore';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/components/ui/Toast';
import { useViewerActions, type CorrespondenceDocument } from '@/hooks/useDocumentViewerService';
import { useIncomingNavigation, HAQViewMode } from '@/hooks/useModuleNavigation';
import { useHAQStore } from '@/store/useHAQStore';
import type { BadgeColor } from '@/components/ui/Badge';
import { StatCardGridSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { HAQScreenSkeleton } from '@/components/ui/ModuleContainer';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { CapabilityGate, ViewOnlyBanner } from '@/components/ui/CapabilityGate';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LixInlineAlert } from '@/components/lix/LixPanel';
import { useLixAgent } from '@/hooks/useLixAgent';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/Progress';
import { Select } from '@/components/ui/Select';
// v0.27.3: New layout components for demo polish
import { ScreenLayout, type ScreenStat, type ScreenTab } from '@/components/ui/ScreenLayout';
import { DrillableStatCard, columnRenderers, type DrilldownConfig } from '@/components/ui/DrillableStatCard';
import { CompactStatBar, toCompactStat } from '@/components/ui/CompactStatBar';
import { ResizableSplitView } from '@/components/ui/ResizableSplitView';
// v175: HAQ Deep Integration Components
import { HAQContextPanel } from '@/components/haq/HAQContextPanel';
import { HAQEvidenceGatherer } from '@/components/haq/HAQEvidenceGatherer';
import { HAQResponseFinalizationPanel } from '@/components/haq/HAQResponseFinalizationPanel';
import { HAQRAGPanel } from '@/components/haq/HAQRAGPanel';
import { HAQStreamingPanel } from '@/components/haq/HAQStreamingPanel';
import { HAQCascadeStrip } from '@/components/haq/HAQCascadeStrip';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { useModuleNavigation } from '@/hooks/useModuleNavigation';
import { useDocumentLinkStore, type LinkableModule } from '@/store/useDocumentLinkStore';
// v0.12.6: State preservation for navigation
import { usePreserveModuleState } from '@/hooks/usePreserveModuleState';
// v0.35.0: Collapsible sections with persisted state
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
// v0.25.9: HAQ Correspondence Parser Service
import { 
  parseHAQFile, 
  haqCorrespondenceParserService,
  type ParsedCorrespondence,
  type ParsedQuestion,
} from '@/services/haq-correspondence-parser-service';
// v0.36.0: AMA formatting for AI responses
import { formatAsAMAContent } from '@/utils/ama-formatter';
// v0.43.5: Supabase persistence
import { useHAQPersistence } from '@/hooks/useHAQPersistence';
import { HAQSyncStatus } from '@/components/haq/HAQSyncStatus';
import { useDeadClick } from '@/hooks/useDeadClick';

// v0.38.1: Helper to generate template response when AI not available
interface SimilarResponse {
  questionText: string;
  responseText: string;
  discipline: string;
  outcome: string;
  score: number;
}

function generateTemplateResponse(
  question: { questionText: string; discipline?: string; ctdSection?: string },
  similarResponses?: SimilarResponse[]
): string {
  const topResponse = similarResponses?.[0];
  
  let template = `## Draft Response

**Question:** ${question.questionText}

${question.discipline ? `**Discipline:** ${question.discipline}` : ''}
${question.ctdSection ? `**CTD Section:** ${question.ctdSection}` : ''}

---

### Proposed Response

[Draft response based on historical patterns]

`;

  if (topResponse && topResponse.score > 50) {
    template += `Based on similar historical questions (${Math.round(topResponse.score)}% match), consider the following structure:

${topResponse.responseText.substring(0, 500)}...

*Review and adapt the above template for your specific context.*
`;
  } else {
    template += `Please draft a response addressing:

1. Direct acknowledgment of the question
2. Relevant data and justification
3. Reference to applicable ICH guidelines
4. Supporting documentation citations

*No highly similar historical responses found. Draft from first principles.*
`;
  }

  return template;
}

interface HAQScreenProps {
  filters?: FilterState;
}

type ViewMode = 'dashboard' | 'correspondence' | 'questions' | 'predictions' | 'analytics';
type QuestionTab = 'response' | 'workflow' | 'review' | 'impact' | 'similar' | 'sources' | 'collaboration' | 'history';

// ============================================
// HAQ Color Maps (v108 - Full Migration)
// ============================================

const haqStatusColorMap: Record<HAQStatus, BadgeColor> = {
  'new': 'blue',
  'open': 'blue',
  'in-progress': 'amber',
  'draft-ready': 'purple',
  'under-review': 'teal',
  'partially-responded': 'amber',
  'submitted': 'green',
  'closed': 'slate',
};

const haqStatusLabels: Record<HAQStatus, string> = {
  'new': 'New',
  'open': 'Open',
  'in-progress': 'In Progress',
  'draft-ready': 'Draft Ready',
  'under-review': 'Under Review',
  'partially-responded': 'Partial',
  'submitted': 'Submitted',
  'closed': 'Closed',
};

const haqPriorityColorMap: Record<HAQPriority, BadgeColor> = {
  'critical': 'red',
  'major': 'amber',
  'minor': 'slate',
};

const haqDisciplineColorMap: Record<HAQDiscipline, BadgeColor> = {
  'CMC': 'green',
  'Clinical': 'blue',
  'Nonclinical': 'amber',
  'Biometrics': 'purple',
  'Pharmacology': 'teal',
  'Labeling': 'pink',
  'Administrative': 'slate',
  'Safety': 'red',
};

const correspondenceTypeColorMap: Record<string, BadgeColor> = {
  'IR': 'blue',
  'CRL': 'red',
  'AI': 'amber',
  'RTQ': 'purple',
  'D80': 'teal',
  'D120': 'orange',
};

const qcStatusColorMap: Record<string, BadgeColor> = {
  'passed': 'green',
  'warning': 'amber',
  'failed': 'red',
};

const outcomeColorMap: Record<string, BadgeColor> = {
  'accepted': 'green',
  'partial': 'amber',
  'rejected': 'red',
};

// ============================================
// HAQ Badge Helper Functions (v108)
// ============================================

export const getHAQStatusBadge = (status: HAQStatus, size: 'xs' | 'sm' = 'sm', showIcon = false) => (
  <Badge 
    color={haqStatusColorMap[status]} 
    size={size}
    icon={showIcon ? (
      status === 'new' || status === 'open' ? <AlertCircle className="w-3 h-3" /> :
      status === 'in-progress' || status === 'partially-responded' ? <Clock className="w-3 h-3" /> :
      status === 'draft-ready' ? <FileText className="w-3 h-3" /> :
      status === 'under-review' ? <Eye className="w-3 h-3" /> :
      status === 'submitted' ? <Send className="w-3 h-3" /> :
      <CheckCircle className="w-3 h-3" />
    ) : undefined}
  >
    {haqStatusLabels[status]}
  </Badge>
);

export const getHAQPriorityBadge = (priority: HAQPriority, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={haqPriorityColorMap[priority]} size={size}>
    {priority.charAt(0).toUpperCase() + priority.slice(1)}
  </Badge>
);

export const getHAQDisciplineBadge = (discipline: HAQDiscipline, size: 'xs' | 'sm' = 'xs') => (
  <Badge color={haqDisciplineColorMap[discipline]} size={size}>
    {discipline}
  </Badge>
);

export const getCorrespondenceTypeBadge = (type: string, size: 'xs' | 'sm' = 'xs') => (
  <Badge color={correspondenceTypeColorMap[type] || 'blue'} size={size}>
    {type}
  </Badge>
);

export const getQCStatusBadge = (status: string) => (
  <Badge color={qcStatusColorMap[status] || 'slate'} size="sm">
    {status === 'passed' ? '✓ Passed' : status === 'warning' ? '⚠ Warning' : '✗ Failed'}
  </Badge>
);

export const getOutcomeBadge = (outcome: string, size: 'xs' | 'sm' = 'xs') => (
  <Badge color={outcomeColorMap[outcome] || 'slate'} size={size}>
    {outcome}
  </Badge>
);

export const getProbabilityBadge = (probability: number) => {
  const color: BadgeColor = probability >= 80 ? 'red' : probability >= 60 ? 'amber' : 'green';
  return <Badge color={color} variant="soft" size="sm">{probability}%</Badge>;
};

export const getDaysLeftBadge = (daysLeft: number) => {
  const color: BadgeColor = daysLeft <= 0 ? 'red' : daysLeft <= 7 ? 'red' : daysLeft <= 14 ? 'amber' : 'slate';
  return <Badge color={color} size="sm">{daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}</Badge>;
};

// Legacy configs kept for backward compatibility during transition
const statusConfig: Record<HAQStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  'new': { label: 'New', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', icon: <AlertCircle className="w-3 h-3" /> },
  'open': { label: 'Open', color: 'text-accent-blue', bgColor: 'bg-accent-blue/20', icon: <AlertCircle className="w-3 h-3" /> },
  'in-progress': { label: 'In Progress', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <Clock className="w-3 h-3" /> },
  'draft-ready': { label: 'Draft Ready', color: 'text-accent-purple', bgColor: 'bg-accent-purple/20', icon: <FileText className="w-3 h-3" /> },
  'under-review': { label: 'Under Review', color: 'text-accent-teal', bgColor: 'bg-accent-teal/20', icon: <Eye className="w-3 h-3" /> },
  'partially-responded': { label: 'Partial', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20', icon: <Clock className="w-3 h-3" /> },
  'submitted': { label: 'Submitted', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: <Send className="w-3 h-3" /> },
  'closed': { label: 'Closed', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: <CheckCircle className="w-3 h-3" /> },
};

const priorityConfig: Record<HAQPriority, { label: string; color: string; bgColor: string }> = {
  'critical': { label: 'Critical', color: 'text-accent-red', bgColor: 'bg-accent-red/20' },
  'major': { label: 'Major', color: 'text-accent-amber', bgColor: 'bg-accent-amber/20' },
  'minor': { label: 'Minor', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

const disciplineColors: Record<HAQDiscipline, string> = {
  'CMC': 'bg-accent-green/20 text-accent-green',
  'Clinical': 'bg-accent-blue/20 text-accent-blue',
  'Nonclinical': 'bg-accent-amber/20 text-accent-amber',
  'Biometrics': 'bg-accent-purple/20 text-accent-purple',
  'Pharmacology': 'bg-accent-teal/20 text-accent-teal',
  'Labeling': 'bg-accent-pink/20 text-accent-pink',
  'Administrative': 'bg-slate-500/20 text-slate-400',
  'Safety': 'bg-accent-red/20 text-accent-red',
};

export function HAQScreen({ filters }: HAQScreenProps) {
  // Use products from store
  const products = useProducts();
  
  // Use centralized HAQ state from store
  const {
    haqs: storeFilteredHAQs,
    selectedHAQ,
    selectedHAQId,
    stats,
    selectHAQ,
    filterStatus: storeFilterStatus,
    filterPriority: storeFilterPriority,
    searchQuery: storeSearchQuery,
    setFilterStatus: setStoreFilterStatus,
    setFilterPriority: setStoreFilterPriority,
    setSearchQuery: setStoreSearchQuery,
    clearFilters: clearStoreFilters,
    updateHAQStatus,
  } = useHAQScreenState();

  // v0.44.10: Use reactive store haqs so status changes reflect in list immediately
  const liveHAQs = useHAQStore(s => s.haqs);
  
  // Cross-module handoff
  const createHandoff = useCrossModuleStore(s => s.createHandoff);
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  const { openCorrespondenceDocument } = useViewerActions();
  
  // v0.43.5: Supabase persistence — syncs store ↔ database
  const persistence = useHAQPersistence();
  
  // v111: Incoming navigation context
  const { getContext } = useIncomingNavigation();

    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  const lix = useLixAgent('HAQ');
  // Keep selectedQuestion for backward compatibility during migration
  const [selectedQuestion, setSelectedQuestion] = useState<HAQuestion | null>(null);
  const [selectedCorrespondence, setSelectedCorrespondence] = useState<HAQCorr | null>(null);
  const [questionTab, setQuestionTab] = useState<QuestionTab>('response');
  // These local filters will be phased out - using store versions where possible
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [filterApplication, setFilterApplication] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [responseMode, setResponseMode] = useState<'quick' | 'full-authoring'>('quick');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPackagingWizard, setShowPackagingWizard] = useState(false);
  const [showFinalizationPanel, setShowFinalizationPanel] = useState(false);
  const [finalizationQuestions, setFinalizationQuestions] = useState<HAQuestion[]>([]);
  const [packagingStep, setPackagingStep] = useState(1);
  const [selectedForPackaging, setSelectedForPackaging] = useState<Set<string>>(new Set());
  const [correspondenceSortBy, setCorrespondenceSortBy] = useState<'received' | 'due'>('received');
  const [correspondenceSortOrder, setCorrespondenceSortOrder] = useState<'asc' | 'desc'>('desc');
  const [analyticsFilter, setAnalyticsFilter] = useState<string | null>(null);
  
  // v175: Evidence gatherer modal state
  const [showEvidenceGatherer, setShowEvidenceGatherer] = useState(false);
  
  // v0.27.67: AI streaming panel state
  const [showStreamingPanel, setShowStreamingPanel] = useState(false);
  
  // v0.34.3: PDF report generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  // v127: Loading state for perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 700);
    return () => clearTimeout(timer);
  }, []);
  
  // v0.35.0: Collapsible dashboard sections
  const { isCollapsed, setCollapsed } = useCollapsedSections('haq');
  
  // v0.12.6: State preservation for navigation stack
  const preserveState = useMemo(() => ({
    viewMode,
    selectedQuestionId: selectedQuestion?.id || null,
    filterStatus,
    filterDiscipline,
    filterApplication,
    questionTab,
  }), [viewMode, selectedQuestion?.id, filterStatus, filterDiscipline, filterApplication, questionTab]);
  
  const { restoredState, updateLabel, updateViewMode } = usePreserveModuleState(
    'haq',
    preserveState,
    ['viewMode', 'selectedQuestionId', 'filterStatus', 'filterDiscipline', 'filterApplication', 'questionTab'],
    {
      label: 'HAQ Intelligence',
      labelFn: (state) => {
        if (state.selectedQuestionId) {
          const q = useHAQStore.getState().haqs.find(q => q.id === state.selectedQuestionId);
          return q ? `HAQ: ${q.questionNumber}` : 'HAQ Intelligence';
        }
        return 'HAQ Intelligence';
      },
    }
  );
  
  // Restore state from navigation stack on mount
  useEffect(() => {
    if (restoredState) {
      if (restoredState.viewMode) setViewMode(restoredState.viewMode as ViewMode);
      if (restoredState.filterStatus) setFilterStatus(restoredState.filterStatus as string);
      if (restoredState.filterDiscipline) setFilterDiscipline(restoredState.filterDiscipline as string);
      if (restoredState.filterApplication) setFilterApplication(restoredState.filterApplication as string);
      if (restoredState.questionTab) setQuestionTab(restoredState.questionTab as QuestionTab);
      if (restoredState.selectedQuestionId) {
        const q = useHAQStore.getState().haqs.find(q => q.id === restoredState.selectedQuestionId);
        if (q) setSelectedQuestion(q);
      }
    }
  }, [restoredState]);
  
  // Update breadcrumb when selection changes
  useEffect(() => {
    if (selectedQuestion) {
      updateLabel(`HAQ: ${selectedQuestion.questionNumber}`);
    } else {
      updateLabel('HAQ Intelligence');
    }
  }, [selectedQuestion, updateLabel]);
  
  // v111: Handle incoming navigation context on mount
  useEffect(() => {
    const navContext = getContext();
    if (navContext) {
      // Apply view mode if specified
      if (navContext.viewMode) {
        setViewMode(navContext.viewMode as ViewMode);
      }
      // Apply filters if specified
      if (navContext.filters?.status) {
        if (navContext.filters.status === 'overdue') {
          // "overdue" is computed (not a real status) — use a dedicated flag
          setFilterStatus('all');
          setShowOverdueOnly(true);
          setViewMode('questions');
        } else {
          setFilterStatus(navContext.filters.status);
        }
      }
      if (navContext.filters?.priority) {
        setStoreFilterPriority(navContext.filters.priority as HAQPriority | 'all');
      }
      if (navContext.filters?.discipline) {
        setFilterDiscipline(navContext.filters.discipline);
      }
    }
  }, [getContext, setStoreFilterPriority]);
  
  // v111: StatCard click handlers for dashboard interactivity
  const handleStatCardClick = useCallback((target: 'total' | 'overdue' | 'in-progress' | 'draft-ready' | 'on-time') => {
    switch (target) {
      case 'total':
        setFilterStatus('all');
        setViewMode('questions');
        break;
      case 'overdue':
        setFilterStatus('all');
        setShowOverdueOnly(true);
        setViewMode('questions');
        break;
      case 'in-progress':
        setFilterStatus('in-progress');
        setViewMode('questions');
        break;
      case 'draft-ready':
        setFilterStatus('draft-ready');
        setViewMode('questions');
        break;
      case 'on-time':
        setViewMode('analytics');
        break;
    }
  }, []);

  // v0.125.1: Auto-select most urgent question when landing on Questions tab
  useEffect(() => {
    if (viewMode === 'questions' && !selectedQuestion && !selectedCorrespondence) {
      const now = new Date();
      const active = filteredQuestions.filter(q => !['submitted', 'closed'].includes(q.status));
      const overdue = active.filter(q => new Date(q.dueDate) < now);
      const critical = active.filter(q => q.priority === 'critical');
      const autoSelect = overdue[0] ?? critical[0] ?? active[0] ?? filteredQuestions[0];
      if (autoSelect) setSelectedQuestion(autoSelect);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // v83: Open correspondence in viewer
  const handleViewCorrespondence = useCallback((corr: HAQCorr, type: 'letter' | 'response') => {
    const doc: CorrespondenceDocument = {
      id: corr.id,
      title: type === 'letter' 
        ? `${corr.type} Letter - ${corr.subject}`
        : `Response to ${corr.subject}`,
      type: type === 'letter' ? 'ha-letter' : 'response',
      dateReceived: corr.receivedDate,
      applicationNumber: corr.applicationId,
      content: type === 'letter'
        ? `<div class="correspondence-content">
            <h1>${corr.subject}</h1>
            <p class="meta">Type: ${corr.type} | Received: ${corr.receivedDate}</p>
            <hr />
            <p>This correspondence contains ${corr.questions.length} question(s) requiring response.</p>
            <h2>Questions</h2>
            <ol>
              ${corr.questions.map(q => `<li><strong>${q.questionNumber}:</strong> ${q.questionText}</li>`).join('')}
            </ol>
          </div>`
        : `<div class="response-content">
            <h1>Response to ${corr.subject}</h1>
            <p class="meta">Due: ${corr.dueDate}</p>
            <hr />
            <p>Response document for ${corr.questions.length} question(s).</p>
          </div>`,
    };
    
    openCorrespondenceDocument(doc, { readOnly: type === 'letter' });
  }, [openCorrespondenceDocument]);

  // Sync local selectedQuestion with store selection for backward compat
  const effectiveSelectedQuestion = selectedQuestion || selectedHAQ || null;

  const overdueQuestions = getOverdueQuestions();

  const applications = useMemo(() => {
    const apps = new Map<string, { id: string; number: string; name: string }>();
    liveHAQs.forEach(q => {
      if (!apps.has(q.applicationId)) {
        apps.set(q.applicationId, { id: q.applicationId, number: q.applicationNumber, name: q.productName });
      }
    });
    return Array.from(apps.values());
  }, []);

  // Get product IDs that match global filters
  const matchingProductIds = useMemo(() => {
    if (!filters) return null; // No global filters, show all
    
    // Check if any filter is active
    const hasActiveFilter = filters.product !== 'all' || 
                           filters.therapeuticArea !== 'all' || 
                           filters.modality !== 'all' || 
                           filters.stage !== 'all' ||
                           filters.region !== 'all';
    
    if (!hasActiveFilter) return null; // No active filters, show all
    
    let filtered = [...products];
    
    if (filters.product !== 'all') {
      filtered = filtered.filter(p => p.id === filters.product);
    }
    if (filters.therapeuticArea !== 'all') {
      // Match by label comparison (case-insensitive)
      filtered = filtered.filter(p => 
        p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea ||
        p.therapeuticArea.toLowerCase() === filters.therapeuticArea.toLowerCase()
      );
    }
    if (filters.modality !== 'all') {
      filtered = filtered.filter(p => 
        p.modality.toLowerCase().replace(/\s+/g, '-') === filters.modality ||
        p.modality.toLowerCase() === filters.modality.toLowerCase()
      );
    }
    if (filters.stage !== 'all') {
      filtered = filtered.filter(p => 
        p.stage.toLowerCase().replace(/\s+/g, '-') === filters.stage ||
        p.stage.toLowerCase().includes(filters.stage.replace(/-/g, ' '))
      );
    }
    // Region filtering - check application region (would need to join with applications data)
    // For now, we'll skip region filtering as HAQ questions don't have region directly
    
    return new Set(filtered.map(p => p.id));
  }, [filters]);

  // Filter questions based on all criteria
  const filteredQuestions = useMemo(() => {
    // v0.44.10: Use liveHAQs from store so status changes immediately appear in list
    return liveHAQs.filter(q => {
      // Apply global product filter first
      if (matchingProductIds !== null && matchingProductIds.size > 0 && !matchingProductIds.has(q.productId)) {
        return false;
      }
      
      // Apply local filters
      const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
      const matchesOverdue = !showOverdueOnly || (new Date(q.dueDate) < new Date() && !['submitted', 'closed'].includes(q.status));
      const matchesDiscipline = filterDiscipline === 'all' || q.discipline === filterDiscipline;
      const matchesApplication = filterApplication === 'all' || q.applicationId === filterApplication;
      const matchesSearch = searchQuery === '' || 
        q.questionText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.questionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.productName.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesStatus && matchesOverdue && matchesDiscipline && matchesApplication && matchesSearch;
    });
  }, [filterStatus, filterDiscipline, filterApplication, searchQuery, matchingProductIds]);

  // Filter correspondence based on global filters
  const filteredCorrespondence = useMemo(() => {
    const filtered = haqCorrespondence.map(corr => {
      // Filter questions within each correspondence
      const filteredCorrQuestions = corr.questions.filter(q => {
        if (matchingProductIds !== null && matchingProductIds.size > 0 && !matchingProductIds.has(q.productId)) {
          return false;
        }
        return true;
      });
      
      return {
        ...corr,
        questions: filteredCorrQuestions,
      };
    }).filter(corr => corr.questions.length > 0); // Only show correspondence with matching questions
    
    // Sort correspondence by date
    return filtered.sort((a, b) => {
      const dateA = new Date(correspondenceSortBy === 'received' ? a.receivedDate : a.dueDate);
      const dateB = new Date(correspondenceSortBy === 'received' ? b.receivedDate : b.dueDate);
      return correspondenceSortOrder === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    });
  }, [matchingProductIds, correspondenceSortBy, correspondenceSortOrder]);

  // Calculate filtered analytics
  const filteredAnalytics = useMemo(() => {
    const questions = filteredQuestions;
    const total = questions.length;
    
    const byStatus: Record<HAQStatus, number> = {
      'new': 0, 'open': 0, 'in-progress': 0, 'draft-ready': 0, 
      'under-review': 0, 'partially-responded': 0, 'submitted': 0, 'closed': 0
    };
    const byDiscipline: Record<HAQDiscipline, number> = {
      'CMC': 0, 'Clinical': 0, 'Nonclinical': 0, 'Biometrics': 0,
      'Pharmacology': 0, 'Labeling': 0, 'Administrative': 0, 'Safety': 0
    };
    const byPriority: Record<HAQPriority, number> = {
      'critical': 0, 'major': 0, 'minor': 0
    };
    const bySource: Record<string, number> = {
      'FDA': 0, 'EMA': 0, 'PMDA': 0, 'Health Canada': 0
    };
    
    questions.forEach(q => {
      byStatus[q.status]++;
      byDiscipline[q.discipline]++;
      byPriority[q.priority]++;
      if (q.source && bySource[q.source] !== undefined) {
        bySource[q.source]++;
      }
    });
    
    const overdue = questions.filter(q => {
      const dueDate = new Date(q.dueDate);
      return dueDate < new Date() && !['submitted', 'closed'].includes(q.status);
    }).length;
    
    return {
      totalQuestions: total,
      byStatus,
      byDiscipline,
      byPriority,
      bySource,
      overdueCount: overdue,
      onTimeRate: total > 0 ? Math.round(((total - overdue) / total) * 100 * 10) / 10 : 100,
      averageResponseTime: haqAnalytics.averageResponseTime, // Keep original for trend
      trendData: haqAnalytics.trendData,
    };
  }, [filteredQuestions]);

  // Filtered overdue questions
  const filteredOverdueQuestions = useMemo(() => {
    const today = new Date();
    return filteredQuestions.filter(q => {
      const dueDate = new Date(q.dueDate);
      return dueDate < today && !['submitted', 'closed'].includes(q.status);
    });
  }, [filteredQuestions]);

  // Helper: Calculate days until due
  const getDaysUntilDue = (dueDate: string): number => {
    return Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  // v0.27.3: Drillable stats configuration
  const drillableStats: ScreenStat[] = useMemo(() => [
    {
      id: 'total',
      value: filteredAnalytics.totalQuestions,
      label: 'Total Questions',
      color: 'text-accent-blue',
      icon: <MessageSquare className="w-5 h-5" />,
      drilldown: {
        title: 'All Health Authority Questions',
        subtitle: `${filteredAnalytics.totalQuestions} questions across all correspondence`,
        items: filteredQuestions.map(q => ({
          id: q.id,
          questionNumber: q.questionNumber,
          text: q.questionText.substring(0, 80) + (q.questionText.length > 80 ? '...' : ''),
          status: q.status,
          priority: q.priority,
          discipline: q.discipline,
          dueDate: q.dueDate,
          daysLeft: getDaysUntilDue(q.dueDate),
        })),
        columns: [
          { key: 'questionNumber', label: 'ID', width: 70, render: (v: string) => <span className="font-mono text-xs text-accent-blue">{v}</span> },
          { key: 'text', label: 'Question', render: (v: string) => <span className="text-text-primary">{v}</span> },
          { key: 'status', label: 'Status', width: 90, render: (v: string) => getHAQStatusBadge(v as HAQStatus, 'xs') },
          { key: 'priority', label: 'Priority', width: 70, render: (v: string) => getHAQPriorityBadge(v as HAQPriority, 'xs') },
          { key: 'daysLeft', label: 'Due', width: 60, render: (v: number) => getDaysLeftBadge(v) },
        ],
        onItemClick: (item) => {
          const q = filteredQuestions.find(haq => haq.id === item.id);
          if (q) { setSelectedQuestion(q); setViewMode('questions'); }
        },
        searchable: true,
        searchPlaceholder: 'Search questions...',
        sortable: true,
        defaultSortKey: 'daysLeft',
        defaultSortDirection: 'asc',
      },
    },
    {
      id: 'overdue',
      value: filteredOverdueQuestions.length,
      label: 'Overdue',
      color: 'text-accent-red',
      icon: <AlertCircle className="w-5 h-5" />,
      drilldown: {
        title: 'Overdue Questions',
        subtitle: 'Requires immediate attention',
        items: filteredOverdueQuestions.map(q => ({
          id: q.id,
          questionNumber: q.questionNumber,
          text: q.questionText.substring(0, 60) + '...',
          status: q.status,
          priority: q.priority,
          discipline: q.discipline,
          dueDate: q.dueDate,
          daysOverdue: Math.abs(getDaysUntilDue(q.dueDate)),
        })),
        columns: [
          { key: 'questionNumber', label: 'ID', width: 70, render: (v: string) => <span className="font-mono text-xs text-accent-red">{v}</span> },
          { key: 'text', label: 'Question', render: (v: string) => <span className="text-text-primary">{v}</span> },
          { key: 'priority', label: 'Priority', width: 70, render: (v: string) => getHAQPriorityBadge(v as HAQPriority, 'xs') },
          { key: 'daysOverdue', label: 'Overdue', width: 70, render: (v: number) => <Badge color="red" size="xs">{v}d</Badge> },
        ],
        onItemClick: (item) => {
          const q = filteredQuestions.find(haq => haq.id === item.id);
          if (q) { setSelectedQuestion(q); setViewMode('questions'); }
        },
        searchable: true,
      },
    },
    {
      id: 'in-progress',
      value: filteredAnalytics.byStatus['in-progress'],
      label: 'In Progress',
      color: 'text-accent-amber',
      icon: <Clock className="w-5 h-5" />,
      drilldown: {
        title: 'In Progress Responses',
        subtitle: 'Currently being worked on',
        items: filteredQuestions.filter(q => q.status === 'in-progress').map(q => ({
          id: q.id,
          questionNumber: q.questionNumber,
          text: q.questionText.substring(0, 60) + '...',
          discipline: q.discipline,
          daysLeft: getDaysUntilDue(q.dueDate),
          assignee: q.assignedTo || 'Unassigned',
        })),
        columns: [
          { key: 'questionNumber', label: 'ID', width: 70, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
          { key: 'text', label: 'Question', render: (v: string) => <span className="text-text-primary">{v}</span> },
          { key: 'discipline', label: 'Area', width: 80, render: (v: string) => getHAQDisciplineBadge(v as HAQDiscipline, 'xs') },
          { key: 'daysLeft', label: 'Due', width: 60, render: (v: number) => getDaysLeftBadge(v) },
        ],
        onItemClick: (item) => {
          const q = filteredQuestions.find(haq => haq.id === item.id);
          if (q) { setSelectedQuestion(q); setViewMode('questions'); }
        },
      },
    },
    {
      id: 'draft-ready',
      value: filteredAnalytics.byStatus['draft-ready'],
      label: 'Draft Ready',
      color: 'text-accent-purple',
      icon: <FileText className="w-5 h-5" />,
      drilldown: {
        title: 'Drafts Ready for Review',
        subtitle: 'Pending QC and approval',
        items: filteredQuestions.filter(q => q.status === 'draft-ready').map(q => ({
          id: q.id,
          questionNumber: q.questionNumber,
          text: q.questionText.substring(0, 60) + '...',
          discipline: q.discipline,
          daysLeft: getDaysUntilDue(q.dueDate),
        })),
        columns: [
          { key: 'questionNumber', label: 'ID', width: 70, render: (v: string) => <span className="font-mono text-xs">{v}</span> },
          { key: 'text', label: 'Question', render: (v: string) => <span className="text-text-primary">{v}</span> },
          { key: 'discipline', label: 'Area', width: 80, render: (v: string) => getHAQDisciplineBadge(v as HAQDiscipline, 'xs') },
          { key: 'daysLeft', label: 'Due', width: 60, render: (v: number) => getDaysLeftBadge(v) },
        ],
        onItemClick: (item) => {
          const q = filteredQuestions.find(haq => haq.id === item.id);
          if (q) { setSelectedQuestion(q); setViewMode('questions'); setQuestionTab('review'); }
        },
      },
    },
    {
      id: 'on-time',
      value: `${filteredAnalytics.onTimeRate}%`,
      label: 'On-Time Rate',
      color: 'text-accent-green',
      icon: <TrendingUp className="w-5 h-5" />,
      drilldown: {
        title: 'Response Performance',
        subtitle: `${filteredAnalytics.onTimeRate}% of responses submitted on time`,
        items: [
          { id: '1', metric: 'On-Time Submissions', value: filteredAnalytics.totalQuestions - filteredOverdueQuestions.length, total: filteredAnalytics.totalQuestions },
          { id: '2', metric: 'Average Response Time', value: filteredAnalytics.averageResponseTime, unit: 'days' },
          { id: '3', metric: 'Critical Priority', value: filteredAnalytics.byPriority['critical'], status: 'critical' },
          { id: '4', metric: 'Major Priority', value: filteredAnalytics.byPriority['major'], status: 'major' },
        ],
        columns: [
          { key: 'metric', label: 'Metric', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
          { key: 'value', label: 'Value', width: 80, render: (v: number) => <span className="font-semibold">{v}</span> },
        ],
        onItemClick: () => setViewMode('analytics'),
      },
    },
  ], [filteredAnalytics, filteredQuestions, filteredOverdueQuestions]);

  // v0.27.3: View mode tabs
  const viewModeTabs: ScreenTab[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'correspondence', label: 'Correspondence', icon: <Mail className="w-4 h-4" />, count: filteredCorrespondence.length },
    { id: 'questions', label: 'Questions', icon: <MessageSquare className="w-4 h-4" />, count: filteredQuestions.length },
    { id: 'predictions', label: 'Predictions', icon: <Brain className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="w-4 h-4" /> },
  ], [filteredCorrespondence.length, filteredQuestions.length]);

  const handleAIGenerate = async () => {
    if (!selectedQuestion) return;
    setIsGenerating(true);
    setAiResponse('');
    
    try {
      const response = await fetch('/api/ai/haq-rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: selectedQuestion.questionText,
          discipline: selectedQuestion.discipline,
          ctdSection: selectedQuestion.ctdSection,
          source: selectedQuestion.source,
          productName: selectedQuestion.productName,
          generateDraft: true,
          userPrompt: aiPrompt.trim() || undefined,
        }),
      });

      // Check if response is JSON (fallback mode) vs streaming
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Non-streaming response - either error or fallback mode
        const data = await response.json();
        
        if (data.aiDraftAvailable === false) {
          // AI not configured - use template with similar responses
          const templateResponse = generateTemplateResponse(selectedQuestion, data.similarResponses);
          setAiResponse(formatAsAMAContent(templateResponse));
          toast.success('Generated draft from historical patterns (AI enhancement available with API key)');
          // v0.44.10: Move to in-progress when draft is generated
          if (selectedQuestion && ['new', 'open'].includes(selectedQuestion.status)) {
            updateHAQStatus(selectedQuestion.id, 'in-progress');
            setSelectedQuestion(prev => prev ? { ...prev, status: 'in-progress' } : prev);
          }
          return;
        }
        
        if (data.error) {
          throw new Error(data.error);
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Streaming not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullContent += parsed.delta.text;
                // v0.36.0: Format as AMA HTML for proper display
                setAiResponse(formatAsAMAContent(fullContent));
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }

      if (!fullContent) {
        throw new Error('No content generated');
      }
      
      toast.success('AI draft generated from historical patterns', {
        action: { label: 'View HAQ →', onClick: () => useAppStore.getState().setActiveModule('haq') },
      });
      // v0.44.10: Move to in-progress when draft is generated
      if (selectedQuestion && ['new', 'open'].includes(selectedQuestion.status)) {
        updateHAQStatus(selectedQuestion.id, 'in-progress');
        setSelectedQuestion(prev => prev ? { ...prev, status: 'in-progress' } : prev);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to generate: ${message}`);
      // Fallback to static response - also format as AMA
      setAiResponse(formatAsAMAContent(`[Generation failed - using template]

Based on regulatory context and similar historical questions:

The critical process parameters (CPPs) for the final crystallization step have been identified through a systematic Quality by Design (QbD) approach as described in Section 3.2.S.2.6.

Key CPPs and acceptable ranges:

1. **Crystallization Temperature**: 5-10°C (target: 7°C)
   - Ensures consistent crystal form and particle size distribution
   
2. **Stirring Rate**: 200-300 rpm (target: 250 rpm)
   - Promotes uniform supersaturation
   
3. **Antisolvent Addition Rate**: 0.5-1.0 mL/min per gram
   - Prevents rapid nucleation and ensures consistent impurity profile

These parameters have been validated across [X] batches with demonstrated control of specified impurities within acceptance criteria.`));
    } finally {
      setIsGenerating(false);
    }
  };

  // v0.34.3: Generate HAQ Response Package PDF
  const handleGenerateHAQReport = useCallback(async () => {
    if (!selectedQuestion) return;
    setIsGeneratingPdf(true);
    
    try {
      const response = await fetch('/api/haq/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          haqId: selectedQuestion.id,
          questionNumber: selectedQuestion.questionNumber,
          healthAuthority: selectedQuestion.source,
          applicationNumber: selectedQuestion.applicationNumber,
          product: selectedQuestion.productName,
          discipline: selectedQuestion.discipline,
          ctdSection: selectedQuestion.ctdSection || '',
          questionType: selectedQuestion.type || '',
          questionText: selectedQuestion.questionText,
          responseText: selectedQuestion.responseText || aiResponse || '',
          status: selectedQuestion.status,
          priority: selectedQuestion.priority,
          receivedDate: selectedQuestion.receivedDate,
          dueDate: selectedQuestion.dueDate,
          assignedTo: selectedQuestion.assignedToName || 'Unassigned',
          reviewers: selectedQuestion.reviewers || [],
          supportingDocuments: (selectedQuestion.linkedDocuments || []).map(doc => ({
            id: doc,
            title: doc.replace(/^doc-/, '').replace(/-/g, ' '),
            type: 'Reference',
            section: selectedQuestion.ctdSection,
          })),
          aiAnalysis: selectedQuestion.aiAnalysis,
          timeline: [
            { event: 'Question received', date: selectedQuestion.receivedDate, user: 'System' },
            { event: 'Assigned to ' + (selectedQuestion.assignedToName || 'team'), date: selectedQuestion.receivedDate, user: 'System' },
            ...(selectedQuestion.status !== 'new' && selectedQuestion.status !== 'open' 
              ? [{ event: 'Response drafted', date: selectedQuestion.updatedAt?.split('T')[0] || selectedQuestion.receivedDate, user: selectedQuestion.assignedToName || 'System' }] 
              : []),
          ],
        }),
      });
      
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `haq-response-${selectedQuestion.questionNumber}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('HAQ Response Package generated successfully', {
        action: { label: 'View in Submissions →', onClick: () => useAppStore.getState().setActiveModule('submissions-hub') },
      });
    } catch (error) {
      console.error('Error generating HAQ report:', error);
      toast.error('Failed to generate HAQ Response Package');
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [selectedQuestion, aiResponse, toast]);

  // v139: Show skeleton during initial load
  if (isLoading) {
    return <HAQScreenSkeleton />;
  }

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* v0.50.0: ScreenHeader adoption — standardized ViewOnlyBanner */}
      <ScreenHeader
        moduleId="haq"
        title="HAQ Intelligence"
        subtitle="Health authority question management, response tracking, and AI-powered analytics"
        icon={<MessageSquare className="w-5 h-5" />}
      />
      {/* Top Bar */}
      {/* v0.43.14: Responsive module toolbar */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
        {/* Scrollable tab area */}
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
          {(['dashboard', 'correspondence', 'questions', 'predictions', 'analytics'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => { setViewMode(mode); setSelectedQuestion(null); setSelectedCorrespondence(null); }}
              className={`px-3 sm:px-3.5 py-1.5 text-sm rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 font-medium ${
                viewMode === mode
                  ? 'bg-accent-blue text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
              }`}
            >
              {mode === 'dashboard' && <BarChart3 className="w-4 h-4 flex-shrink-0" />}
              {mode === 'correspondence' && <Mail className="w-4 h-4 flex-shrink-0" />}
              {mode === 'questions' && <MessageSquare className="w-4 h-4 flex-shrink-0" />}
              {mode === 'predictions' && <Brain className="w-4 h-4 flex-shrink-0" />}
              {mode === 'analytics' && <TrendingUp className="w-4 h-4 flex-shrink-0" />}
              <span className="hidden sm:inline capitalize">{mode}</span>
            </button>
          ))}
          </div>
        </div>
        {/* Pinned actions — always visible */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pl-2 border-l border-border/50">
          {/* v0.43.5: Persistence sync status — hidden on small mobile */}
          <div className="hidden md:block">
            <HAQSyncStatus
              syncStatus={persistence.syncStatus}
              isOnline={persistence.isOnline}
              lastSyncedAt={persistence.lastSyncedAt}
              syncError={persistence.syncError}
              onRefresh={persistence.refresh}
            />
          </div>
          <CapabilityGate moduleId="haq" capability="submit">
          <Button variant="success" size="sm" icon={<Package className="w-4 h-4" />} onClick={() => setShowPackagingWizard(true)}>
            <span className="hidden md:inline">Package Responses</span>
          </Button>
          </CapabilityGate>
          <Button variant="primary" size="sm" icon={<Upload className="w-4 h-4" />} onClick={() => setShowImportModal(true)}>
            <span className="hidden sm:inline">Import</span>
          </Button>
        </div>
      </div>

      {/* HAQ Agent bar — always visible on dashboard, conditionally on other views */}
      {(lix.status !== 'monitoring' || viewMode === 'dashboard') && (
        <div className="px-4 md:px-6 pt-2 flex-shrink-0">
          <LixInlineAlert
            moduleScope="HAQ"
            message={lix.status === 'monitoring'
              ? 'Monitoring all questions · no action required'
              : lix.message}
            severity={lix.status === 'monitoring' ? 'info' : lix.severity}
            actionLabel={lix.actionLabel ?? undefined}
            onAction={lix.actionLabel ? () => useAppStore.getState().setActiveModule('agent-hub') : undefined}
          />
        </div>
      )}

      <div className="flex-1 overflow-hidden flex">
        {/* Dashboard View */}
        {viewMode === 'dashboard' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-6xl mx-auto">
              {/* v115: Breadcrumb */}
              <Breadcrumb 
                moduleId="haq" 
                viewLabel="Dashboard"
                className="mb-4"
              />
              
              {/* Mission control pipeline — question lifecycle at a glance */}
              <div className="mb-6 p-4 rounded-xl border border-border bg-surface-card">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-3">Question Pipeline</p>
                <div className="flex items-stretch gap-0 overflow-x-auto">
                  {([
                    { label: 'New',          count: (filteredAnalytics.byStatus['new'] ?? 0) + (filteredAnalytics.byStatus['open'] ?? 0), color: 'text-accent-blue',   bg: 'bg-accent-blue/10',   border: 'border-accent-blue/30',   status: 'new'          },
                    { label: 'In Progress',  count: (filteredAnalytics.byStatus['in-progress'] ?? 0) + (filteredAnalytics.byStatus['partially-responded'] ?? 0), color: 'text-accent-amber',  bg: 'bg-accent-amber/10',  border: 'border-accent-amber/30',  status: 'in-progress'  },
                    { label: 'Draft Ready',  count: filteredAnalytics.byStatus['draft-ready'] ?? 0,  color: 'text-accent-teal',   bg: 'bg-accent-teal/10',   border: 'border-accent-teal/30',   status: 'draft-ready'  },
                    { label: 'Under Review', count: filteredAnalytics.byStatus['under-review'] ?? 0, color: 'text-accent-purple', bg: 'bg-accent-purple/10', border: 'border-accent-purple/30', status: 'under-review' },
                    { label: 'Submitted',    count: filteredAnalytics.byStatus['submitted'] ?? 0,    color: 'text-accent-green',  bg: 'bg-accent-green/10',  border: 'border-accent-green/30',  status: 'submitted'    },
                    { label: 'Closed',       count: filteredAnalytics.byStatus['closed'] ?? 0,       color: 'text-text-muted',    bg: 'bg-surface-elevated', border: 'border-border',           status: 'closed'       },
                  ] as const).map((stage, i) => (
                    <div key={stage.label} className="flex items-center flex-shrink-0">
                      <button
                        onClick={() => { setFilterStatus(stage.status as HAQStatus); setViewMode('questions'); }}
                        className={`
                          flex flex-col items-center gap-1 px-3 py-2 rounded-lg border transition-all hover:scale-105 hover:shadow-sm min-w-[80px]
                          ${stage.bg} ${stage.border}
                        `}
                      >
                        <span className={`text-xl font-bold tabular-nums ${stage.color}`}>{stage.count}</span>
                        <span className={`text-[10px] font-medium whitespace-nowrap ${stage.color} opacity-80`}>{stage.label}</span>
                      </button>
                      {i < 5 && (
                        <ChevronRight className="w-3 h-3 text-text-muted flex-shrink-0 mx-1 opacity-40" />
                      )}
                    </div>
                  ))}
                  <div className="ml-auto flex items-center pl-4 border-l border-border flex-shrink-0">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`text-xl font-bold tabular-nums ${filteredOverdueQuestions.length > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
                        {filteredOverdueQuestions.length}
                      </span>
                      <span className={`text-[10px] font-medium ${filteredOverdueQuestions.length > 0 ? 'text-accent-red' : 'text-text-muted'}`}>
                        Overdue
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* v0.44.46: Cascade-triggered tasks targeting HAQ */}
              <HAQCascadeStrip
                onStepClick={(step, chain) => {
                  // Navigate to questions view filtered to the relevant discipline
                  setViewMode('questions');
                }}
              />

              {/* v0.36.7: Compact stat bar - saves vertical space */}
              <CompactStatBar 
                stats={drillableStats.map(stat => ({
                  id: stat.id,
                  value: stat.value,
                  label: stat.label,
                  icon: stat.icon,
                  color: stat.color?.replace('text-accent-', '') as 'blue' | 'red' | 'amber' | 'purple' | 'green',
                  drilldown: stat.drilldown as DrilldownConfig,
                  highlight: stat.id === 'overdue' || stat.id === 'critical',
                }))}
                className="mb-8"
              />

              {/* Mission critical hero card — most urgent open question */}
              {(() => {
                const heroQ = filteredOverdueQuestions[0] ?? 
                  filteredQuestions.filter(q => q.priority === 'critical' && q.status !== 'submitted' && q.status !== 'closed')[0] ??
                  filteredQuestions.filter(q => q.status !== 'submitted' && q.status !== 'closed').sort((a,b) => getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate))[0];
                if (!heroQ) return null;
                const daysLeft = getDaysUntilDue(heroQ.dueDate);
                const isOverdue = daysLeft < 0;
                return (
                  <div
                    onClick={() => { setSelectedQuestion(heroQ); setViewMode('questions'); }}
                    className={`
                      mb-6 rounded-xl border cursor-pointer
                      transition-all duration-150 hover:-translate-y-px hover:shadow-lg
                      ${isOverdue
                        ? 'border-red-500/30 hover:shadow-red-500/10'
                        : 'border-amber-500/25 hover:shadow-amber-500/10'
                      }
                    `}
                    style={{ background: isOverdue
                      ? 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, var(--surface-card) 60%)'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, var(--surface-card) 60%)'
                    }}
                  >
                    {/* Urgency header strip */}
                    <div className={`flex items-center gap-2 px-4 pt-3 pb-2 border-b ${isOverdue ? 'border-red-500/15' : 'border-amber-500/15'}`}>
                      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`} />
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                        {isOverdue ? 'Overdue — Immediate Action Required' : 'Most Urgent · Requires Response'}
                      </span>
                      <div className="ml-auto flex items-center gap-2">
                        {getHAQPriorityBadge(heroQ.priority, 'xs')}
                        {getHAQDisciplineBadge(heroQ.discipline, 'xs')}
                        {getHAQStatusBadge(heroQ.status, 'xs', true)}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex items-start justify-between gap-4 p-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono text-text-muted mb-1">{heroQ.questionNumber}</p>
                        <h3 className="text-base font-semibold text-text-primary leading-snug mb-3 line-clamp-2">
                          {heroQ.questionText}
                        </h3>
                        <div className="flex items-center gap-4">
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${isOverdue ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                            <Clock className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`} />
                            <span className={`text-sm font-bold tabular-nums ${isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                              {isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d remaining`}
                            </span>
                          </div>
                          <span className="text-xs text-text-muted">Due {heroQ.dueDate}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedQuestion(heroQ); setViewMode('questions'); }}
                        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 shadow-sm
                          ${isOverdue
                            ? 'bg-red-500 text-white hover:bg-red-400 shadow-red-500/25'
                            : 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/25'
                          }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        Draft Response
                      </button>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {/* v0.35.0: Active Correspondence - Collapsible */}
                <div className="col-span-1 md:col-span-2">
                  <CollapsibleSection
                    title="Active Correspondence"
                    icon={<Mail className="w-5 h-5 text-accent-blue" />}
                    count={filteredCorrespondence.filter(c => c.status !== 'closed').length}
                    defaultExpanded={!isCollapsed('active-correspondence')}
                    onToggle={(expanded) => setCollapsed('active-correspondence', !expanded)}
                    variant="card"
                    size="sm"
                    headerActions={
                      <Button variant="ghost" size="sm" onClick={() => setViewMode('correspondence')}>
                        View All <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    }
                  >
                    <div className="space-y-4">
                      {filteredCorrespondence.filter(c => c.status !== 'closed').length === 0 ? (
                        <EmptyState type="no-data" size="sm" title="No active correspondence" description="All correspondence has been closed" />
                      ) : filteredCorrespondence.filter(c => c.status !== 'closed').map(corr => {
                        const totalQ = corr.questions.length;
                        const readyQ = corr.questions.filter(q => ['draft-ready', 'under-review', 'submitted', 'closed'].includes(q.status)).length;
                        const daysLeft = getDaysUntilDue(corr.dueDate);
                        return (
                          <Card 
                            key={corr.id} 
                            variant="interactive" 
                            padding="md" 
                            radius="md"
                            onClick={() => { setSelectedCorrespondence(corr); setViewMode('questions'); }}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Mail className="w-5 h-5 text-accent-blue" />
                                <Badge color="blue" size="xs">{corr.type}</Badge>
                              </div>
                              <Badge 
                                color={daysLeft <= 7 ? 'red' : daysLeft <= 14 ? 'amber' : 'gray'} 
                                size="sm"
                              >
                                {daysLeft <= 0 ? 'Overdue' : `${daysLeft}d left`}
                              </Badge>
                            </div>
                            <h3 className="text-sm font-semibold text-text-primary mb-1">{corr.subject}</h3>
                            <p className="text-xs text-text-muted mb-3">Received {corr.receivedDate}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">{readyQ}/{totalQ} responses ready</span>
                              <div className="w-24">
                                <ProgressBar value={readyQ} max={totalQ} color="gradient" size="xs" />
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                </div>

                {/* v0.125.62: AI Predictions — violet gradient wrapper signals agent-generated content */}
                <div
                  className="rounded-xl border border-accent-purple/20 overflow-hidden"
                  style={{ background: 'linear-gradient(160deg, #EEEDFE 0%, var(--surface-card) 50%)' }}
                >
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-accent-purple/15">
                    <Brain className="w-3.5 h-3.5 text-accent-purple" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-accent-purple">HAQ Agent · AI Predictions</span>
                  </div>
                  <CollapsibleSection
                    title="Predicted Questions"
                    icon={<Brain className="w-5 h-5 text-accent-purple" />}
                    count={predictedQuestions.length}
                    defaultExpanded={!isCollapsed('predictions')}
                    onToggle={(expanded) => setCollapsed('predictions', !expanded)}
                    variant="card"
                    size="sm"
                    headerActions={
                      <Button variant="ghost" size="sm" onClick={() => setViewMode('predictions')}>View All</Button>
                    }
                  >
                    <div className="space-y-3">
                      {predictedQuestions.slice(0, 3).map(pred => (
                        <Card key={pred.id} variant="default" padding="md" radius="md">
                          <div className="flex items-center justify-between mb-2">
                            <Badge color={
                              pred.discipline === 'CMC' ? 'green' :
                              pred.discipline === 'Clinical' ? 'blue' :
                              pred.discipline === 'Nonclinical' ? 'amber' :
                              pred.discipline === 'Biometrics' ? 'purple' :
                              pred.discipline === 'Safety' ? 'red' : 'gray'
                            } size="xs">{pred.discipline}</Badge>
                            <Badge 
                              color={pred.probability >= 80 ? 'red' : pred.probability >= 60 ? 'amber' : 'green'}
                              variant="soft"
                              size="sm"
                            >
                              {pred.probability}%
                            </Badge>
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">{pred.questionText}</p>
                        </Card>
                      ))}
                    </div>
                  </CollapsibleSection>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Correspondence View */}
        {viewMode === 'correspondence' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <h1 className="text-2xl font-semibold text-text-primary">Correspondence</h1>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-text-muted">Sort by:</span>
                    <select
                      value={correspondenceSortBy}
                      onChange={(e) => setCorrespondenceSortBy(e.target.value as 'received' | 'due')}
                      className="bg-surface-card border border-border rounded-lg px-3 py-1.5 text-text-primary"
                    >
                      <option value="received">Date Received</option>
                      <option value="due">Due Date</option>
                    </select>
                    <button
                      onClick={() => setCorrespondenceSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                      className="p-1.5 bg-surface-card border border-border rounded-lg text-text-secondary hover:text-text-primary"
                      title={correspondenceSortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                    >
                      {correspondenceSortOrder === 'desc' ? '↓' : '↑'}
                    </button>
                  </div>
                  <button onClick={() => setShowImportModal(true)} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2">
                    <Upload className="w-4 h-4" />Import New
                  </button>
                </div>
              </div>
              {filteredCorrespondence.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No correspondence matches the current filters</p>
                </div>
              ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {filteredCorrespondence.map(corr => {
                  const totalQ = corr.questions.length;
                  const readyQ = corr.questions.filter(q => ['draft-ready', 'under-review', 'submitted', 'closed'].includes(q.status)).length;
                  const daysLeft = getDaysUntilDue(corr.dueDate);
                  return (
                    <Card key={corr.id} variant="interactive" padding="md" onClick={() => { setSelectedCorrespondence(corr); setViewMode('questions'); }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Mail className="w-5 h-5 text-accent-blue" />
                          {getCorrespondenceTypeBadge(corr.type)}
                        </div>
                        {getDaysLeftBadge(daysLeft)}
                      </div>
                      <h3 className="text-sm font-semibold text-text-primary mb-1">{corr.subject}</h3>
                      <p className="text-xs text-text-muted mb-3">Received {corr.receivedDate}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-muted">{readyQ}/{totalQ} responses ready</span>
                        <div className="w-24">
                          <ProgressBar value={readyQ} max={totalQ} color="gradient" size="xs" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Questions View */}
        {viewMode === 'questions' && (
          <>
            <div className={`${selectedQuestion ? 'w-96' : 'flex-1'} bg-surface-elevated border-r border-border flex flex-col`}>
              <div className="p-4 border-b border-border">
                {selectedCorrespondence && (
                  <div className="mb-3 p-2 bg-accent-blue/10 rounded-lg flex items-center justify-between">
                    <span className="text-sm text-accent-blue">{selectedCorrespondence.subject}</span>
                    <button onClick={() => setSelectedCorrespondence(null)} className="text-accent-blue hover:underline text-xs">Clear</button>
                  </div>
                )}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" placeholder="Search questions..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/10 transition-all" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setShowOverdueOnly(false); }} className="appearance-none bg-surface-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary cursor-pointer focus:outline-none focus:border-accent-blue transition-colors hover:border-accent-blue/40">
                      <option value="all">All Status</option>
                      {Object.keys(statusConfig).map(s => <option key={s} value={s}>{statusConfig[s as HAQStatus]?.label}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>
                  <div className="relative">
                    <select value={filterDiscipline} onChange={(e) => setFilterDiscipline(e.target.value)} className="appearance-none bg-surface-card border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm text-text-primary cursor-pointer focus:outline-none focus:border-accent-blue transition-colors hover:border-accent-blue/40">
                      <option value="all">All Disciplines</option>
                      {Object.keys(disciplineColors).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-auto py-1">
                {(() => {
                  const questionsToShow = selectedCorrespondence ? selectedCorrespondence.questions : filteredQuestions;
                  if (questionsToShow.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-14 h-14 rounded-2xl bg-surface-card border border-border flex items-center justify-center mb-4">
                          <MessageSquare className="w-6 h-6 text-text-muted opacity-60" />
                        </div>
                        <p className="text-sm font-medium text-text-primary mb-1">No questions found</p>
                        <p className="text-xs text-text-muted mb-4">Try clearing your filters or importing a correspondence file</p>
                        <button
                          onClick={() => { setFilterStatus('all'); setFilterDiscipline('all'); setSearchQuery(''); }}
                          className="text-xs text-accent-blue hover:underline"
                        >
                          Clear all filters
                        </button>
                      </div>
                    );
                  }
                  return questionsToShow.map(q => {
                    const isSelected = selectedQuestion?.id === q.id;
                    const daysLeft = getDaysUntilDue(q.dueDate);
                    const priorityAccent = q.priority === 'critical' ? 'bg-accent-red' : q.priority === 'major' ? 'bg-accent-amber' : 'bg-border';
                    return (
                      <div
                        key={q.id}
                        onClick={() => setSelectedQuestion(q)}
                        className={`mx-3 my-2 rounded-xl border cursor-pointer transition-all overflow-hidden ${
                          isSelected
                            ? 'border-accent-blue/40 bg-accent-blue/5 shadow-sm'
                            : 'border-border bg-surface hover:border-accent-blue/20 hover:shadow-md hover:bg-surface-elevated'
                        }`}
                      >
                        <div className="flex h-full">
                          {/* Left priority accent bar */}
                          <div className={`w-1 flex-shrink-0 ${priorityAccent}`} />
                          <div className="flex-1 p-3.5 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <span className="text-xs font-bold text-text-primary font-mono tracking-wide">{q.questionNumber}</span>
                                {getHAQDisciplineBadge(q.discipline)}
                                {getHAQPriorityBadge(q.priority, 'xs')}
                              </div>
                              <div className="flex-shrink-0">
                                {getHAQStatusBadge(q.status, 'xs', true)}
                              </div>
                            </div>
                            <p className="text-xs text-text-secondary line-clamp-2 mb-2.5 leading-relaxed">{q.questionText}</p>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-text-muted font-mono">{q.productName}</span>
                              {daysLeft <= 0
                                ? <span className="text-[10px] font-semibold text-accent-red bg-accent-red/10 px-1.5 py-0.5 rounded-full">Overdue</span>
                                : daysLeft <= 7
                                  ? <span className="text-[10px] font-semibold text-accent-red">{daysLeft}d left</span>
                                  : daysLeft <= 14
                                    ? <span className="text-[10px] font-medium text-accent-amber">{daysLeft}d left</span>
                                    : <span className="text-[10px] text-text-muted">{daysLeft}d</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {selectedQuestion && (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-border bg-surface">
                  {/* Cross-module back navigation */}
                  <ReturnBreadcrumb variant="inline" className="mb-3" />
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg font-semibold text-text-primary">{selectedQuestion.questionNumber}</span>
                        {getHAQDisciplineBadge(selectedQuestion.discipline, 'sm')}
                        {getHAQPriorityBadge(selectedQuestion.priority)}
                        <HAQStatusSelector
                          haqId={selectedQuestion.id}
                          currentStatus={selectedQuestion.status}
                          onStatusChange={(newStatus) => {
                            // Update local state to reflect change immediately
                            setSelectedQuestion({ ...selectedQuestion, status: newStatus });
                          }}
                        />
                      </div>
                      <div className="text-sm text-text-muted">{selectedQuestion.productName} • {selectedQuestion.applicationNumber}</div>
                    </div>
                    <button onClick={() => setSelectedQuestion(null)} className="p-1 hover:bg-surface-card rounded"><X className="w-5 h-5 text-text-muted" /></button>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-muted">Due: <span className={getDaysUntilDue(selectedQuestion.dueDate) <= 7 ? 'text-accent-red font-medium' : 'text-text-primary'}>{selectedQuestion.dueDate}</span></span>
                    {selectedQuestion.assignedToName && <span className="text-text-muted">Assigned: <span className="text-text-primary">{selectedQuestion.assignedToName}</span></span>}
                    {selectedQuestion.ctdSection && <span className="text-text-muted">CTD: <span className="text-accent-blue">{selectedQuestion.ctdSection}</span></span>}
                  </div>
                </div>

                <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-surface">
                  {(['response', 'workflow', 'review', 'impact', 'similar', 'sources', 'collaboration', 'history'] as QuestionTab[]).map(tab => (
                    <button 
                      key={tab} 
                      onClick={() => setQuestionTab(tab)} 
                      className={`px-3 py-1.5 text-sm rounded-lg capitalize flex items-center gap-1.5 ${questionTab === tab ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}
                    >
                      {tab === 'workflow' && <GitBranch className="w-3.5 h-3.5" />}
                      {tab === 'impact' && <Zap className="w-3.5 h-3.5" />}
                      {tab}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <button 
                    onClick={handleGenerateHAQReport}
                    disabled={isGeneratingPdf}
                    className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 text-accent-green hover:bg-accent-green/10 disabled:opacity-50"
                  >
                    {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Export PDF
                  </button>
                  <button onClick={() => setShowAIPanel(!showAIPanel)} className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1.5 ${showAIPanel ? 'bg-accent-purple text-white' : 'text-accent-purple hover:bg-accent-purple/10'}`}>
                    <Sparkles className="w-4 h-4" />AI Assist
                  </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-1 overflow-auto p-6">
                    <div className="bg-surface-card border border-border rounded-lg p-4 mb-6">
                      <h3 className="text-sm font-semibold text-text-primary mb-2">Question</h3>
                      <p className="text-sm text-text-secondary leading-relaxed">{selectedQuestion.questionText}</p>
                      {selectedQuestion.aiAnalysis && (
                        <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs">
                          <span className="text-text-muted">Complexity: <span className={`font-medium ${selectedQuestion.aiAnalysis.complexity === 'high' ? 'text-accent-red' : 'text-accent-amber'}`}>{selectedQuestion.aiAnalysis.complexity}</span></span>
                          <span className="text-text-muted">Est. Effort: <span className="text-text-primary">{selectedQuestion.aiAnalysis.estimatedEffort}</span></span>
                          <span className="text-text-muted">Guidance: <span className="text-accent-blue">{selectedQuestion.aiAnalysis.regulatoryContext}</span></span>
                        </div>
                      )}
                    </div>

                    {questionTab === 'response' && (
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-text-primary">Response</h3>
                          <div className="flex items-center gap-2">
                            <div className="flex bg-surface-card rounded-lg p-0.5">
                              <button onClick={() => setResponseMode('quick')} className={`px-3 py-1 text-xs rounded ${responseMode === 'quick' ? 'bg-accent-blue text-white' : 'text-text-muted'}`}>Quick</button>
                              <button onClick={() => setResponseMode('full-authoring')} className={`px-3 py-1 text-xs rounded ${responseMode === 'full-authoring' ? 'bg-accent-blue text-white' : 'text-text-muted'}`}>Full Authoring</button>
                            </div>
                          </div>
                        </div>

                        {responseMode === 'full-authoring' ? (
                          <div className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-accent-purple/20"><FileText className="w-5 h-5 text-accent-purple" /></div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-text-primary mb-1">Complex Response Workflow</h4>
                                <p className="text-xs text-text-muted mb-3">For responses requiring review workflows, QC validation, or digital signatures, open in the Authoring Module.</p>
                                <button 
                                  onClick={() => {
                                    // Create handoff to Authoring module with HAQ context
                                    createHandoff({
                                      type: 'haq-response-to-m1',
                                      sourceModule: 'haq',
                                      targetModule: 'authoring',
                                      sourceId: selectedQuestion.id,
                                      sourceTitle: `HAQ ${selectedQuestion.questionNumber}: ${selectedQuestion.questionText?.substring(0, 50) || 'Response'}`,
                                      metadata: {
                                        haqId: selectedQuestion.id,
                                        questionNumber: selectedQuestion.questionNumber,
                                        discipline: selectedQuestion.discipline,
                                        workflowType: 'response',
                                      },
                                      createdBy: 'current-user',
                                    });
                                    toast.success('Opening in Authoring Module...');
                                    setActiveModule('authoring');
                                  }}
                                  className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm flex items-center gap-2"
                                >
                                  <ArrowUpRight className="w-4 h-4" />Open in Authoring Module
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-accent-purple/20">
                              <div className="text-xs text-text-muted mb-2">This creates a document with:</div>
                              <div className="flex flex-wrap gap-2">
                                {['Section editing', 'Review workflow', 'QC checklist', 'Digital signatures'].map(f => (
                                  <span key={f} className="text-xs px-2 py-1 bg-surface-card rounded">{f}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <HAQResponseEditorV2
                            haq={selectedQuestion}
                            mode="quick"
                            onGenerateAI={() => setShowStreamingPanel(true)}
                            isGeneratingAI={isGenerating}
                            aiResponse={aiResponse}
                            onAcceptAI={() => setAiResponse('')}
                            onDiscardAI={() => setAiResponse('')}
                            onSubmitForReview={() => setQuestionTab('review')}
                          />
                        )}
                      </div>
                    )}

                    {/* v131: Workflow Tab */}
                    {questionTab === 'workflow' && (
                      <div>
                        <HAQWorkflowPanel
                          haqId={selectedQuestion.id}
                          currentStatus={selectedQuestion.status}
                          responseText={selectedQuestion.responseText || selectedQuestion.suggestedResponse || ''}
                          onStatusChange={(newStatus) => {
                            setSelectedQuestion({ ...selectedQuestion, status: newStatus });
                          }}
                          userRole="admin"
                          defaultExpanded={true}
                        />
                        
                        {/* Workflow Tips */}
                        <div className="mt-4 p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
                          <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                            <GitBranch className="w-4 h-4 text-accent-purple" />
                            Workflow Governance
                          </h4>
                          <ul className="text-xs text-text-muted space-y-1">
                            <li>• State transitions are validated and logged for compliance</li>
                            <li>• Role-based permissions control who can advance each stage</li>
                            <li>• Full audit trail maintained for regulatory inspection</li>
                            <li>• Guards ensure quality gates are met before progression</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* v113: Review Tab */}
                    {questionTab === 'review' && (
                      <div>
                        <HAQReviewPanel 
                          haq={selectedQuestion}
                          currentVersion={useHAQStore.getState().getVersions(selectedQuestion.id).slice(-1)[0]}
                        />
                      </div>
                    )}

                    {/* v0.6.4: Response Impact Chain Tab */}
                    {questionTab === 'impact' && (() => {
                      const impact = getResponseImpact(selectedQuestion.id);
                      
                      if (!impact) {
                        return (
                          <div className="text-center py-12">
                            <Zap className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold text-text-primary mb-2">No Impact Assessment</h3>
                            <p className="text-sm text-text-muted mb-4">This question does not yet have an impact assessment.</p>
                            <Button variant="primary" icon={<Zap className="w-4 h-4" />} onClick={() => toast.success("Impact analysis generated — reviewing 47 CTD cross-references, 3 precedent HAQs, and regulatory guidance alignment")}>
                              Generate Impact Analysis
                            </Button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4 md:space-y-6">
                          {/* Impact Summary Banner */}
                          <div className="bg-gradient-to-r from-accent-amber/10 to-accent-red/10 border border-accent-amber/30 rounded-lg p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Zap className="w-5 h-5 text-accent-amber" />
                                  <h3 className="text-lg font-semibold text-text-primary">Response Impact Analysis</h3>
                                  <Badge color={impact.overallRisk === 'critical' ? 'red' : impact.overallRisk === 'high' ? 'amber' : 'blue'} size="sm">
                                    {impact.overallRisk.toUpperCase()} RISK
                                  </Badge>
                                </div>
                                <p className="text-sm text-text-muted">
                                  This response triggers a cascade of {impact.totalImpactedDocuments} document updates and affects {impact.totalImpactedSubmissions} submission timelines.
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-accent-amber">{impact.timelineImpact.totalDaysImpact}d</div>
                                <div className="text-xs text-text-muted">timeline impact</div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mt-4 pt-4 border-t border-accent-amber/20">
                              <div className="text-center">
                                <div className="text-xl font-bold text-text-primary">{impact.totalImpactedDocuments}</div>
                                <div className="text-xs text-text-muted">Documents</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-text-primary">{impact.totalImpactedSubmissions}</div>
                                <div className="text-xs text-text-muted">Submissions</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-accent-green">{impact.automatedActions}</div>
                                <div className="text-xs text-text-muted">Automated</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xl font-bold text-accent-blue">{impact.manualActionsRequired}</div>
                                <div className="text-xs text-text-muted">Manual</div>
                              </div>
                            </div>
                          </div>

                          {/* Impacted Documents */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                <FileText className="w-4 h-4 text-accent-blue" />
                                Impacted Documents ({impact.impactedDocuments.length})
                              </h4>
                            </div>
                            <div className="space-y-3">
                              {impact.impactedDocuments.map((doc) => (
                                <Card key={doc.id} variant="interactive" padding="md" radius="md">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-text-primary">{doc.documentTitle}</span>
                                        <Badge 
                                          color={doc.impactSeverity === 'critical' ? 'red' : doc.impactSeverity === 'major' ? 'amber' : 'blue'} 
                                          size="xs"
                                        >
                                          {doc.impactSeverity}
                                        </Badge>
                                        <Badge 
                                          color={doc.status === 'complete' ? 'green' : doc.status === 'in-progress' ? 'blue' : doc.status === 'blocked' ? 'red' : 'slate'} 
                                          size="xs"
                                        >
                                          {doc.status}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-text-muted mb-2">
                                        CTD {doc.ctdSection} • {doc.ctdModule} • {doc.impactType.replace('-', ' ')}
                                      </div>
                                      <p className="text-xs text-text-secondary mb-2">{doc.impactDescription}</p>
                                      <div className="flex flex-wrap gap-1 mb-2">
                                        {doc.sectionsAffected.map((section, i) => (
                                          <span key={i} className="text-xs px-2 py-0.5 bg-surface rounded text-text-muted">{section}</span>
                                        ))}
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-text-muted">
                                        <span>Effort: <span className="text-text-primary">{doc.estimatedEffort}</span></span>
                                        {doc.assignedToName && <span>Assigned: <span className="text-text-primary">{doc.assignedToName}</span></span>}
                                        {doc.dueDate && <span>Due: <span className="text-text-primary">{doc.dueDate}</span></span>}
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => useAppStore.getState().setActiveModule('authoring')} icon={<ArrowUpRight className="w-4 h-4" />}>
                                      Open in Authoring
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>

                          {/* Impacted Submissions */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                <Send className="w-4 h-4 text-accent-purple" />
                                Impacted Submissions ({impact.impactedSubmissions.length})
                              </h4>
                            </div>
                            <div className="space-y-3">
                              {impact.impactedSubmissions.map((sub) => (
                                <Card key={sub.id} variant="elevated" padding="md" radius="md">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-text-primary">{sub.applicationNumber}</span>
                                        <Badge color="purple" size="xs">{sub.submissionType}</Badge>
                                        <Badge color="blue" size="xs">{sub.region}</Badge>
                                        <Badge 
                                          color={sub.criticalPathAffected ? 'red' : 'slate'} 
                                          size="xs"
                                        >
                                          {sub.criticalPathAffected ? 'CRITICAL PATH' : 'Non-Critical'}
                                        </Badge>
                                      </div>
                                      <div className="text-xs text-text-muted mb-2">
                                        Sequence {sub.sequenceNumber} • {sub.agency} • {sub.impactType.replace('-', ' ')}
                                      </div>
                                      <p className="text-xs text-text-secondary mb-3">{sub.impactDescription}</p>
                                      <div className="flex items-center gap-6">
                                        <div>
                                          <div className="text-xs text-text-muted">Original Target</div>
                                          <div className="text-sm text-text-primary">{sub.originalTargetDate}</div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-accent-amber" />
                                        <div>
                                          <div className="text-xs text-text-muted">Projected</div>
                                          <div className="text-sm text-accent-amber font-medium">{sub.projectedDate}</div>
                                        </div>
                                        <div className="ml-auto">
                                          <div className="text-xs text-text-muted">Impact</div>
                                          <div className="text-sm text-accent-red font-bold">+{sub.daysImpacted} days</div>
                                        </div>
                                      </div>
                                      {sub.mitigationPlan && (
                                        <div className="mt-3 p-2 bg-accent-green/10 border border-accent-green/30 rounded text-xs text-text-secondary">
                                          <span className="font-medium text-accent-green">Mitigation: </span>{sub.mitigationPlan}
                                        </div>
                                      )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => useAppStore.getState().setActiveModule('submissions-hub')} icon={<ArrowUpRight className="w-4 h-4" />}>
                                      View Submission
                                    </Button>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>

                          {/* Timeline Mitigation Options */}
                          <div>
                            <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                              <Target className="w-4 h-4 text-accent-green" />
                              Mitigation Options
                            </h4>
                            <div className="space-y-2">
                              {impact.timelineImpact.mitigationOptions.map((option) => (
                                <div 
                                  key={option.id} 
                                  className={`p-3 rounded-lg border ${option.recommended ? 'bg-accent-green/10 border-accent-green/30' : 'bg-surface-card border-border'}`}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      {option.recommended && <CheckCircle className="w-4 h-4 text-accent-green" />}
                                      <span className="text-sm font-medium text-text-primary">{option.description}</span>
                                    </div>
                                    <Badge color="green" size="xs">-{option.daysRecovered} days</Badge>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs text-text-muted">
                                    <span>Resources: {option.resourcesRequired}</span>
                                    <span>Risk: <span className={option.riskLevel === 'high' ? 'text-accent-red' : option.riskLevel === 'medium' ? 'text-accent-amber' : 'text-accent-green'}>{option.riskLevel}</span></span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* R&D Connected Callout */}
                          <div className="bg-gradient-to-r from-accent-purple/10 to-accent-blue/10 border border-accent-purple/30 rounded-lg p-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-accent-purple/20">
                                <Layers className="w-5 h-5 text-accent-purple" />
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-text-primary">R&D Connected</h4>
                                <p className="text-xs text-text-muted">
                                  In legacy systems, understanding the impact of an HAQ response requires manual tracking across documents and spreadsheets. 
                                  In Ligature, the entire impact chain is visible instantly — from the question to every document and submission affected.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {questionTab === 'similar' && (
                      <HAQRAGPanel
                        haq={selectedQuestion}
                        onUseDraft={(draft) => {
                          setAiResponse(formatAsAMAContent(draft));
                          setQuestionTab('response');
                          toast.success('AI draft applied to response editor');
                        }}
                        onUseTemplate={(responseText) => {
                          navigator.clipboard.writeText(responseText);
                          setAiResponse(formatAsAMAContent(responseText));
                          setQuestionTab('response');
                          toast.success('Template copied to response editor');
                        }}
                        onViewFull={(response) => {
                          openCorrespondenceDocument({
                            id: response.id,
                            title: `${response.applicationNumber} - ${response.questionText.slice(0, 50)}...`,
                            type: 'response',
                            applicationNumber: response.applicationNumber,
                          });
                        }}
                      />
                    )}

                    {questionTab === 'sources' && (
                      <div>
                        {/* v175: Evidence Gathering Button */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-text-primary">Linked Source Documents</h3>
                          <Button
                            variant="primary"
                            size="sm"
                            className="bg-accent-purple"
                            icon={<Zap className="w-4 h-4" />}
                            onClick={() => setShowEvidenceGatherer(true)}
                          >
                            Gather Evidence
                          </Button>
                        </div>

                        {/* v175: HAQ Context Panel - Cross-Module Links */}
                        <HAQContextPanel
                          haq={selectedQuestion}
                          onNavigateToDocument={(module, docId) => {
                            // Use navigation with return context
                            const { navigateWithReturn } = useModuleNavigation();
                            navigateWithReturn(
                              { module: module as any, selection: { documentId: docId } },
                              `HAQ ${selectedQuestion.questionNumber}`
                            );
                          }}
                          onCiteDocument={(title, section) => {
                            // Copy citation to clipboard
                            const citation = `[${title}${section ? ` - ${section}` : ''}]`;
                            navigator.clipboard.writeText(citation);
                          }}
                          isCollapsible={true}
                          defaultExpanded={true}
                        />

                        {/* Legacy linked documents display */}
                        {selectedQuestion.linkedDocuments?.length ? (
                          <div className="space-y-3 mt-4">
                            <h4 className="text-xs text-text-muted uppercase tracking-wider">Legacy Links</h4>
                            {selectedQuestion.linkedDocuments.map((docId, i) => (
                              <div key={docId} className="bg-surface-card border border-border rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-5 h-5 text-accent-blue" />
                                  <div>
                                    <div className="text-sm text-text-primary">CTD Section {selectedQuestion.ctdSection}</div>
                                    <div className="text-xs text-text-muted">Module 3 - Quality</div>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    createHandoff({
                                      type: 'haq-response-to-m1',
                                      sourceModule: 'haq',
                                      targetModule: 'authoring',
                                      sourceId: docId,
                                      sourceTitle: `CTD Section ${selectedQuestion.ctdSection}`,
                                      targetSection: selectedQuestion.ctdSection,
                                      metadata: {
                                        haqId: selectedQuestion.id,
                                        documentId: docId,
                                        ctdSection: selectedQuestion.ctdSection,
                                      },
                                      createdBy: 'current-user',
                                    });
                                    toast.success('Opening document in Authoring...');
                                    setActiveModule('authoring');
                                  }}
                                  className="px-3 py-1.5 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-lg flex items-center gap-1"
                                >
                                  <ArrowUpRight className="w-4 h-4" />Open in Authoring
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                        
                        <h3 className="text-sm font-semibold text-text-primary mt-6 mb-3">Suggested Guidance</h3>
                        <div className="space-y-2">
                          {selectedQuestion.aiAnalysis?.regulatoryContext?.split(', ').map((guide, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-accent-purple" />
                                <span className="text-sm text-text-primary">{guide}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  // Open guidance document viewer
                                  openCorrespondenceDocument({
                                    id: `guide-${i}`,
                                    title: guide,
                                    type: 'attachment',
                                    applicationNumber: selectedQuestion.applicationNumber,
                                  });
                                  toast.success(`Opening ${guide} guidance document — loading regulatory reference`);
                                }}
                                className="text-xs text-accent-blue hover:underline"
                              >
                                View
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* v175: Evidence Gatherer Modal */}
                    <HAQEvidenceGatherer
                      haq={selectedQuestion}
                      isOpen={showEvidenceGatherer}
                      onClose={() => setShowEvidenceGatherer(false)}
                      onEvidenceGathered={(evidence) => {
                        // v0.21.9: Toast notification for evidence gathered
                        toast.success(`Evidence gathered: ${evidence.sources.length} source(s)`);
                        setShowEvidenceGatherer(false);
                      }}
                    />

                    {questionTab === 'collaboration' && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary mb-3">Team Collaboration</h3>
                        <div className="bg-surface-card border border-border rounded-lg p-4 mb-6">
                          <div className="text-xs text-text-muted mb-2">Currently Assigned</div>
                          {selectedQuestion.assignedToName ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-accent-blue flex items-center justify-center text-white">
                                  {selectedQuestion.assignedToName.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-text-primary">{selectedQuestion.assignedToName}</div>
                                  <div className="text-xs text-text-muted">Assigned {selectedQuestion.updatedAt}</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  toast.success('Reassignment panel — select an SME from the directory below');
                                  // Could set state to show reassignment modal
                                }}
                                className="text-xs text-accent-blue hover:underline"
                              >
                                Reassign
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                toast.success('SME selected — HAQ assigned and notification sent');
                              }}
                              className="w-full py-3 border-2 border-dashed border-border rounded-lg text-text-muted hover:border-accent-blue hover:text-accent-blue"
                            >
                              Click to assign SME
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Recommended SMEs</div>
                        <div className="space-y-3">
                          {[{ name: 'Jennifer Park', role: 'CMC Lead', available: true }, { name: 'David Chen', role: 'Formulation', available: true }].map((sme, i) => (
                            <div key={i} className="flex items-center justify-between bg-surface-card rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs ${sme.available ? 'bg-accent-blue' : 'bg-slate-500'}`}>
                                  {sme.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="text-sm text-text-primary">{sme.name}</div>
                                  <div className="text-xs text-text-muted">{sme.role}</div>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  setSelectedQuestion({
                                    ...selectedQuestion,
                                    assignedToName: sme.name,
                                    updatedAt: new Date().toISOString().split('T')[0],
                                  });
                                  toast.success(`Assigned to ${sme.name}`);
                                }}
                                className="px-3 py-1 text-xs bg-accent-blue text-white rounded-lg"
                              >
                                Assign
                              </button>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => {
                            toast.success('SME directory — search by therapeutic area, module expertise, or availability');
                          }}
                          className="w-full mt-3 px-3 py-2 text-sm text-accent-blue border border-accent-blue/30 rounded-lg hover:bg-accent-blue/10 flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />Add Other SME
                        </button>
                      </div>
                    )}

                    {questionTab === 'history' && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                          <History className="w-4 h-4" />
                          Activity History
                        </h3>
                        <HAQTimeline haq={selectedQuestion} maxItems={15} />
                      </div>
                    )}
                  </div>

                  {showAIPanel && (
                    <div className="hidden xl:block w-72 border-l border-border bg-surface p-4 overflow-auto">
                      <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-accent-purple" />
                        <span className="text-sm font-semibold text-text-primary">AI Assistant</span>
                      </div>
                      {selectedQuestion.aiAnalysis && (
                        <div className="bg-surface-card rounded-lg p-3 mb-4">
                          <div className="text-xs text-text-muted mb-2">Analysis</div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between"><span className="text-text-muted">Complexity</span><span className={`font-medium ${selectedQuestion.aiAnalysis.complexity === 'high' ? 'text-accent-red' : 'text-accent-amber'}`}>{selectedQuestion.aiAnalysis.complexity}</span></div>
                            <div className="flex justify-between"><span className="text-text-muted">Risk Level</span><span className={`font-medium ${selectedQuestion.aiAnalysis.riskLevel === 'high' ? 'text-accent-red' : 'text-accent-amber'}`}>{selectedQuestion.aiAnalysis.riskLevel}</span></div>
                          </div>
                          {selectedQuestion.aiAnalysis.recommendedApproach && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <div className="text-xs text-text-muted mb-1">Recommended Approach</div>
                              <p className="text-xs text-text-secondary">{selectedQuestion.aiAnalysis.recommendedApproach}</p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-3 mb-4">
                        <p className="text-xs text-text-secondary mb-2">Ask AI to help:</p>
                        <textarea
                          value={aiPrompt}
                          onChange={e => setAiPrompt(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAIGenerate(); }}
                          placeholder="e.g., 'Focus on ICH Q8...'"
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm placeholder:text-text-muted focus:outline-none focus:border-accent-purple resize-none h-20"
                        />
                        <button
                          onClick={handleAIGenerate}
                          disabled={isGenerating}
                          className="w-full mt-2 px-3 py-1.5 bg-accent-purple text-white rounded-lg text-sm flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                          {isGenerating ? 'Generating…' : 'Ask AI'}
                        </button>
                      </div>
                      <div className="text-xs text-text-muted uppercase tracking-wider mb-2">Quick Actions</div>
                      <div className="space-y-2">
                        {[{ icon: FileText, label: 'Summarize question' }, { icon: Search, label: 'Find guidance' }, { icon: Layers, label: 'Find similar in CTD' }, { icon: Target, label: 'Identify key points' }].map((action, i) => (
                          <button key={i} className="w-full text-left px-3 py-2 bg-surface-card rounded-lg text-sm text-text-secondary hover:text-text-primary flex items-center gap-2" onClick={() => toast.success(`${action.label} — AI analysis in progress, results will appear below`)}>
                            <action.icon className="w-4 h-4" />{action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Predictions View */}
        {viewMode === 'predictions' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2"><Brain className="w-6 h-6 text-accent-purple" />Predicted Questions</h1>
                  <p className="text-sm text-text-muted mt-1">AI predictions based on submission content and historical patterns</p>
                </div>
                <Button variant="primary" className="bg-accent-purple" icon={<RefreshCw className="w-4 h-4" />} onClick={() => toast.success("HAQ analytics refreshed — 4 new responses received this week")}>Refresh</Button>
              </div>
              <div className="space-y-4">
                {predictedQuestions.map(pred => (
                  <Card key={pred.id} variant="elevated" padding="lg">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${pred.probability >= 80 ? 'bg-accent-red/20 text-accent-red' : pred.probability >= 60 ? 'bg-accent-amber/20 text-accent-amber' : 'bg-accent-green/20 text-accent-green'}`}>
                          <span className="text-lg font-bold">{pred.probability}%</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {getHAQDisciplineBadge(pred.discipline)}
                            <span className="text-xs text-text-muted">CTD {pred.ctdSection}</span>
                          </div>
                          <div className="text-xs text-text-muted mt-1">{pred.historicalFrequency}</div>
                        </div>
                      </div>
                      <Button variant="primary" size="sm" className="bg-accent-purple" icon={<Lightbulb className="w-4 h-4" />} onClick={() => {
                        // Find an existing open question matching this discipline, or pick the first open one
                        const match = useHAQStore.getState().haqs.find(q =>
                          q.discipline?.toLowerCase() === pred.discipline?.toLowerCase() &&
                          (q.status === 'open' || q.status === 'in-progress')
                        ) ?? useHAQStore.getState().haqs.find(q => q.status === 'open' || q.status === 'in-progress');
                        if (match) { setSelectedQuestion(match); }
                        setFilterDiscipline(pred.discipline ?? 'all');
                        setViewMode('questions');
                      }}>Prepare Response</Button>
                    </div>
                    <p className="text-sm text-text-primary mb-4">{pred.questionText}</p>
                    <div className="bg-surface-card rounded-lg p-4">
                      <div className="text-xs text-text-muted mb-2">Rationale</div>
                      <p className="text-sm text-text-secondary mb-3">{pred.rationale}</p>
                      {pred.suggestedPreparation && (
                        <>
                          <div className="text-xs text-text-muted mb-2">Suggested Preparation</div>
                          <p className="text-sm text-accent-blue">{pred.suggestedPreparation}</p>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {pred.basedOn.map(basis => <Badge key={basis} color="slate" size="xs">{basis}</Badge>)}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analytics View */}
        {viewMode === 'analytics' && (
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              <h1 className="text-2xl font-semibold text-text-primary mb-6">HAQ Analytics</h1>
              
              {/* Top Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-8">
                <Card variant="elevated" padding="md">
                  <div className="text-3xl font-bold text-text-primary">{filteredAnalytics.totalQuestions}</div>
                  <div className="text-sm text-text-muted">Total Questions</div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div className="text-3xl font-bold text-accent-green">{filteredAnalytics.onTimeRate}%</div>
                  <div className="text-sm text-text-muted">On-Time Rate</div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div className="text-3xl font-bold text-accent-blue">{filteredAnalytics.averageResponseTime}</div>
                  <div className="text-sm text-text-muted">Avg Days</div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div className="text-3xl font-bold text-accent-red">{filteredAnalytics.overdueCount}</div>
                  <div className="text-sm text-text-muted">Overdue</div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div className="text-3xl font-bold text-accent-purple">{predictedQuestions.length}</div>
                  <div className="text-sm text-text-muted">Predicted</div>
                </Card>
              </div>

              {/* Question Themes Bubble Chart */}
              <Card variant="elevated" padding="lg" className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-text-primary">Question Themes</h3>
                    {analyticsFilter && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
                        <span className="text-sm text-accent-blue">Filtered: {analyticsFilter}</span>
                        <button onClick={() => setAnalyticsFilter(null)} className="text-accent-blue hover:text-accent-blue/70">×</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent-red"></span>High frequency</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent-amber"></span>Medium</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-accent-green"></span>Low</span>
                  </div>
                </div>
                
                {/* Bubble Chart Visualization */}
                <div className="relative h-80 bg-surface-card rounded-lg overflow-hidden">
                  {/* Theme bubbles - positioned absolutely */}
                  {[
                    { theme: 'Process Parameters', count: 12, x: 15, y: 20, color: 'bg-accent-red', size: 100 },
                    { theme: 'Stability Data', count: 9, x: 45, y: 15, color: 'bg-accent-red', size: 85 },
                    { theme: 'Dissolution', count: 8, x: 70, y: 25, color: 'bg-accent-amber', size: 80 },
                    { theme: 'Impurity Profile', count: 7, x: 25, y: 55, color: 'bg-accent-amber', size: 75 },
                    { theme: 'Dose Modification', count: 6, x: 55, y: 50, color: 'bg-accent-amber', size: 70 },
                    { theme: 'Missing Data', count: 5, x: 80, y: 55, color: 'bg-accent-green', size: 65 },
                    { theme: 'Comparability', count: 4, x: 35, y: 75, color: 'bg-accent-green', size: 58 },
                    { theme: 'Carcinogenicity', count: 4, x: 60, y: 78, color: 'bg-accent-green', size: 58 },
                    { theme: 'Pediatric', count: 3, x: 85, y: 80, color: 'bg-accent-blue', size: 50 },
                    { theme: 'DDI', count: 3, x: 10, y: 80, color: 'bg-accent-blue', size: 50 },
                    { theme: 'Labeling', count: 2, x: 48, y: 88, color: 'bg-accent-purple', size: 42 },
                  ].map((bubble, i) => (
                    <div
                      key={i}
                      onClick={() => { setAnalyticsFilter(bubble.theme); toast.success(`Filtering HAQ analytics by: ${bubble.theme}`); }}
                      className={`absolute rounded-full ${bubble?.color ?? ''} ${analyticsFilter === bubble.theme ? 'ring-4 ring-white ring-offset-2 ring-offset-surface-card' : ''} opacity-80 hover:opacity-100 cursor-pointer transition-all hover:scale-110 flex items-center justify-center group`}
                      style={{
                        width: `${bubble.size}px`,
                        height: `${bubble.size}px`,
                        left: `${bubble.x}%`,
                        top: `${bubble.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div className="text-center text-white">
                        <div className="font-bold text-lg">{bubble.count}</div>
                        <div className="text-xs opacity-90 leading-tight px-2">{bubble.theme}</div>
                      </div>
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        <div className="text-sm font-medium text-text-primary">{bubble.theme}</div>
                        <div className="text-xs text-text-muted">{bubble.count} questions ({filteredAnalytics.totalQuestions > 0 ? Math.round(bubble.count / filteredAnalytics.totalQuestions * 100) : 0}%)</div>
                        <div className="text-xs text-accent-blue mt-1">Click to filter</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                {/* Response Trend */}
                <Card variant="elevated" padding="lg">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Response Trend</h3>
                  <div className="space-y-3">
                    {filteredAnalytics.trendData.map(point => (
                      <div key={point.period} className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-16">{point.period}</span>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="h-2.5 bg-accent-blue/40 rounded" style={{ width: `${point.received * 6}px` }} />
                          <span className="text-xs text-text-muted w-4">{point.received}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-1">
                          <div className="h-2.5 bg-accent-green/60 rounded" style={{ width: `${point.submitted * 6}px` }} />
                          <span className="text-xs text-text-muted w-4">{point.submitted}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-accent-blue/40 rounded"></span>Received</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-2.5 bg-accent-green/60 rounded"></span>Submitted</span>
                  </div>
                </Card>
                
                {/* By Discipline */}
                <Card variant="elevated" padding="lg">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">By Discipline</h3>
                  <div className="space-y-2">
                    {(Object.entries(filteredAnalytics.byDiscipline) as [HAQDiscipline, number][]).filter(([_, c]) => c > 0).sort((a, b) => b[1] - a[1]).map(([disc, count]) => (
                      <div key={disc} className="flex items-center gap-2">
                        <div className="w-24">{getHAQDisciplineBadge(disc, 'sm')}</div>
                        <div className="flex-1 h-2.5 bg-surface-card rounded-full overflow-hidden">
                          <div className="h-full bg-accent-blue/50" style={{ width: `${filteredAnalytics.totalQuestions > 0 ? (count / filteredAnalytics.totalQuestions) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-6 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* By Priority */}
                <Card variant="elevated" padding="lg">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">By Priority</h3>
                  <div className="space-y-4">
                    {(Object.entries(filteredAnalytics.byPriority) as [HAQPriority, number][]).map(([priority, count]) => (
                      <div key={priority} className="flex items-center gap-3">
                        <div className="w-24">{getHAQPriorityBadge(priority)}</div>
                        <div className="flex-1 h-3 bg-surface-card rounded-full overflow-hidden">
                          <div className={`h-full ${priority === 'critical' ? 'bg-accent-red/60' : priority === 'major' ? 'bg-accent-amber/60' : 'bg-slate-500/40'}`} style={{ width: `${(count / haqAnalytics.totalQuestions) * 100}%` }} />
                        </div>
                        <span className="text-sm font-medium text-text-primary w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Donut visualization */}
                  <div className="mt-6 flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        {(() => {
                          const total = filteredAnalytics.byPriority.critical + filteredAnalytics.byPriority.major + filteredAnalytics.byPriority.minor;
                          if (total === 0) return null;
                          let cumulative = 0;
                          const segments = [
                            { value: filteredAnalytics.byPriority.critical, color: '#ef4444' },
                            { value: filteredAnalytics.byPriority.major, color: '#f59e0b' },
                            { value: filteredAnalytics.byPriority.minor, color: '#64748b' },
                          ];
                          return segments.map((seg, i) => {
                            const percentage = (seg.value / total) * 100;
                            const dashArray = `${percentage} ${100 - percentage}`;
                            const dashOffset = -cumulative;
                            cumulative += percentage;
                            return (
                              <circle
                                key={i}
                                cx="50" cy="50" r="40"
                                fill="none"
                                stroke={seg.color}
                                strokeWidth="20"
                                strokeDasharray={dashArray}
                                strokeDashoffset={dashOffset}
                                className="transition-all"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-text-primary">{filteredAnalytics.totalQuestions}</div>
                          <div className="text-xs text-text-muted">Total</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Historical Comparison & Source Agency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <Card variant="elevated" padding="lg">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">By Source Agency</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    {(Object.entries(filteredAnalytics.bySource) as [string, number][]).filter(([_, c]) => c > 0).map(([source, count]) => (
                      <div key={source} className="bg-surface-card rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-text-primary">{count}</div>
                        <div className="text-sm text-text-muted">{source}</div>
                        <div className="text-xs text-accent-blue mt-1">{filteredAnalytics.totalQuestions > 0 ? Math.round(count / filteredAnalytics.totalQuestions * 100) : 0}%</div>
                      </div>
                    ))}
                  </div>
                </Card>
                
                <Card variant="elevated" padding="lg">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">Response Time Distribution</h3>
                  <div className="space-y-3">
                    {[
                      { range: '< 7 days', count: 8, color: 'bg-accent-green' },
                      { range: '7-14 days', count: 15, color: 'bg-accent-blue' },
                      { range: '15-21 days', count: 12, color: 'bg-accent-amber' },
                      { range: '22-30 days', count: 7, color: 'bg-accent-purple' },
                      { range: '> 30 days', count: 5, color: 'bg-accent-red' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-text-muted w-20">{item.range}</span>
                        <div className="flex-1 h-3 bg-surface-card rounded-full overflow-hidden">
                          <div className={`h-full ${item?.color ?? ''}/60`} style={{ width: `${(item.count / 47) * 100}%` }} />
                        </div>
                        <span className="text-xs text-text-muted w-6 text-right">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Import Modal - v0.25.9: AI-Powered Parsing */}
      {showImportModal && (
        <HAQImportModal
          onClose={() => setShowImportModal(false)}
          onImportComplete={(parsed) => {
            toast.success(`Imported ${parsed.totalQuestions} questions from ${haqCorrespondenceParserService.getCorrespondenceTypeLabel(parsed.correspondenceType)}`);
            setShowImportModal(false);
          }}
        />
      )}

      {/* Packaging Wizard */}
      {showPackagingWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[700px] shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3"><Package className="w-5 h-5 text-accent-green" /><h2 className="text-lg font-semibold text-text-primary">Package Responses</h2></div>
              <button onClick={() => { setShowPackagingWizard(false); setPackagingStep(1); }} className="p-2 hover:bg-surface-card rounded-lg"><X className="w-5 h-5 text-text-muted" /></button>
            </div>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-4">
                {['Select Responses', 'Review & QC', 'Generate Package'].map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${packagingStep > i + 1 ? 'bg-accent-green text-white' : packagingStep === i + 1 ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted'}`}>
                      {packagingStep > i + 1 ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${packagingStep === i + 1 ? 'text-text-primary' : 'text-text-muted'}`}>{label}</span>
                    {i < 2 && <ChevronRight className="w-4 h-4 text-text-muted" />}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 md:p-6">
      {/* v0.50.0: ViewOnlyBanner moved to top-level ScreenHeader */}
              {packagingStep === 1 && (
                <div>
                  <p className="text-sm text-text-muted mb-4">Select responses to include:</p>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {liveHAQs.filter(q => q.status === 'draft-ready' || q.status === 'under-review').map(q => {
                      const isSelected = selectedForPackaging.has(q.id);
                      return (
                        <label key={q.id} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg cursor-pointer hover:bg-surface">
                          <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelected = new Set(selectedForPackaging);
                              if (e.target.checked) {
                                newSelected.add(q.id);
                              } else {
                                newSelected.delete(q.id);
                              }
                              setSelectedForPackaging(newSelected);
                            }}
                            className="rounded" 
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-text-primary">{q.questionNumber}</span>
                              {getHAQDisciplineBadge(q.discipline)}
                            </div>
                            <p className="text-xs text-text-muted line-clamp-1">{q.questionText}</p>
                          </div>
                          {getHAQStatusBadge(q.status, 'xs')}
                        </label>
                      );
                    })}
                  </div>
                  {selectedForPackaging.size > 0 && (
                    <p className="text-xs text-accent-blue mt-3">{selectedForPackaging.size} response(s) selected</p>
                  )}
                </div>
              )}
              {packagingStep === 2 && (
                <div>
                  <p className="text-sm text-text-muted mb-4">QC checks:</p>
                  <div className="space-y-3">
                    {[{ check: 'All responses complete', status: 'passed' }, { check: 'CTD references valid', status: 'passed' }, { check: 'Formatting consistent', status: 'warning' }, { check: 'Attachments included', status: 'passed' }].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-surface-card rounded-lg">
                        <span className="text-sm text-text-primary">{item.check}</span>
                        {getQCStatusBadge(item.status)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {packagingStep === 3 && (() => {
                // Get selected questions for display
                const selectedQuestions = liveHAQs.filter(q => selectedForPackaging.has(q.id));
                const uniqueDisciplines = Array.from(new Set(selectedQuestions.map(q => q.discipline)));
                const firstApp = selectedQuestions[0];
                
                const handleSendToPublishing = () => {
                  // Open the finalization panel with the selected questions
                  setFinalizationQuestions(selectedQuestions);
                  setShowPackagingWizard(false);
                  setPackagingStep(1);
                  setShowFinalizationPanel(true);
                };
                
                return (
                  <div className="text-center py-8">
                    <Package className="w-16 h-16 text-accent-green mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Package Ready</h3>
                    <p className="text-sm text-text-muted mb-6">
                      {selectedQuestions.length} response{selectedQuestions.length !== 1 ? 's' : ''} packaged for {firstApp?.applicationNumber || 'NDA 215847'} Day 74 Response
                    </p>
                    <div className="flex justify-center gap-3">
                      <button 
                        onClick={() => {
                          toast.success('Opening response package preview — compiling all sections and attachments');
                          // Could open a preview modal or viewer
                          openCorrespondenceDocument({
                            id: 'haq-package-preview',
                            title: `${firstApp?.applicationNumber || 'NDA 215847'} Day 74 Response Package`,
                            type: 'response',
                            applicationNumber: firstApp?.applicationNumber,
                          });
                        }}
                        className="px-4 py-2 bg-surface-card text-text-primary rounded-lg text-sm flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />Preview
                      </button>
                      <button 
                        onClick={() => {
                          toast.success('Preparing download...');
                          // Simulate download
                          setTimeout(() => {
                            const packageData = selectedQuestions.map(q => ({
                              questionNumber: q.questionNumber,
                              question: q.questionText,
                              response: q.responseText || q.suggestedResponse,
                              discipline: q.discipline,
                            }));
                            const blob = new Blob([JSON.stringify(packageData, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${firstApp?.applicationNumber || 'NDA-215847'}-haq-response-package.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success('Download started');
                          }, 500);
                        }}
                        className="px-4 py-2 bg-accent-green text-white rounded-lg text-sm flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />Download
                      </button>
                      <button 
                        onClick={handleSendToPublishing}
                        className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2"
                      >
                        <ArrowUpRight className="w-4 h-4" />Proceed to Finalization
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-between">
              <button onClick={() => setPackagingStep(Math.max(1, packagingStep - 1))} disabled={packagingStep === 1} className="px-4 py-2 text-sm text-text-secondary disabled:opacity-50">Back</button>
              <button onClick={() => packagingStep < 3 ? setPackagingStep(packagingStep + 1) : (setShowPackagingWizard(false), setPackagingStep(1))} className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm">{packagingStep === 3 ? 'Done' : 'Continue'}</button>
            </div>
          </div>
        </div>
      )}

      {/* HAQ Response Finalization Panel - v0.9.2 */}
      {showFinalizationPanel && finalizationQuestions.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[90vh] overflow-hidden shadow-2xl">
            <HAQResponseFinalizationPanel
              questions={finalizationQuestions}
              correspondenceType="IR Response"
              applicationNumber={finalizationQuestions[0]?.applicationNumber || 'NDA 215847'}
              productName={finalizationQuestions[0]?.productName || 'Nexavant (LIG-2847)'}
              onComplete={(packageId) => {
                // v0.44.10: Mark all finalized questions as submitted in the store
                finalizationQuestions.forEach(q => {
                  updateHAQStatus(q.id, 'submitted');
                });
                // Create handoff to submissions
                createHandoff({
                  type: 'haq-response-to-m1',
                  sourceModule: 'haq',
                  targetModule: 'submissions',
                  sourceId: packageId,
                  sourceTitle: `${finalizationQuestions[0]?.applicationNumber || 'NDA 215847'} Day 74 Response Package`,
                  targetSection: '1.12.1',
                  createdBy: 'current-user',
                  metadata: {
                    correspondenceType: 'IR Response',
                    applicationNumber: finalizationQuestions[0]?.applicationNumber || 'NDA 215847',
                    productName: finalizationQuestions[0]?.productName || 'Nexavant (LIG-2847)',
                    questionCount: finalizationQuestions.length,
                    disciplines: Array.from(new Set(finalizationQuestions.map(q => q.discipline))),
                    packageId,
                    signatureChain: true,
                    qcPassed: true,
                    responses: finalizationQuestions.map(q => ({
                      questionNumber: q.questionNumber,
                      discipline: q.discipline,
                      responseText: q.responseText || q.suggestedResponse || 'Response content...',
                      attachments: q.attachments?.map(a => a.name) || [],
                    })),
                  },
                });
                toast.success('HAQ responses finalized — navigating to Submissions');
                setShowFinalizationPanel(false);
                setFinalizationQuestions([]);
                setSelectedForPackaging(new Set());
                setTimeout(() => setActiveModule('submissions'), 600);
              }}
              onCancel={() => {
                setShowFinalizationPanel(false);
                setFinalizationQuestions([]);
              }}
            />
          </div>
        </div>
      )}
      
      {/* v0.27.67: AI Streaming Panel Modal */}
      {showStreamingPanel && selectedQuestion && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStreamingPanel(false);
            }
          }}
        >
          <div className="w-full max-w-4xl h-[85vh]">
            <HAQStreamingPanel
              haq={selectedQuestion}
              onAccept={(draft, complianceScore) => {
                setAiResponse(formatAsAMAContent(draft));
                toast.success(`Response draft generated with ${complianceScore}% compliance score`);
                setShowStreamingPanel(false);
              }}
              onClose={() => setShowStreamingPanel(false)}
              expanded={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HAQ IMPORT MODAL - v0.25.9
// AI-Powered HAQ Correspondence Parser
// =============================================================================

interface HAQImportModalProps {
  onClose: () => void;
  onImportComplete: (parsed: ParsedCorrespondence) => void;
}

function HAQImportModal({ onClose, onImportComplete }: HAQImportModalProps) {
  const { deadClick } = useDeadClick();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedCorrespondence | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const toast = useToast();
  
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setParseError(null);
    setParsedResult(null);
    setIsParsing(true);
    
    try {
      // Parse the file with AI
      const result = await parseHAQFile(file);
      setParsedResult(result);
      toast.success(`AI detected ${result.totalQuestions} questions with ${result.overallConfidence}% confidence`);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse file');
      toast.error('Failed to parse correspondence');
    } finally {
      setIsParsing(false);
    }
  };
  
  const handleImport = () => {
    if (parsedResult) {
      onImportComplete(parsedResult);
    }
  };
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-amber-400';
    return 'text-red-400';
  };
  
  const getPriorityColor = (priority: string): BadgeColor => {
    switch (priority) {
      case 'critical': return 'red';
      case 'major': return 'amber';
      case 'minor': return 'slate';
      default: return 'blue';
    }
  };
  
  const getDisciplineColor = (discipline: HAQDiscipline): BadgeColor => {
    const colors: Record<HAQDiscipline, BadgeColor> = {
      'CMC': 'green',
      'Clinical': 'blue',
      'Nonclinical': 'amber',
      'Biometrics': 'purple',
      'Pharmacology': 'teal',
      'Labeling': 'pink',
      'Administrative': 'slate',
      'Safety': 'red',
    };
    return colors[discipline] || 'blue';
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[800px] max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-purple/10 rounded-lg">
              <Brain className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Import HAQ Correspondence</h2>
              <p className="text-xs text-text-muted">AI-powered parsing and categorization</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Drop Zone */}
          {!parsedResult && (
            <>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors cursor-pointer ${
                  isParsing ? 'border-accent-purple bg-accent-purple/5' : 'border-border hover:border-accent-blue hover:bg-accent-blue/5'
                }`}
                onClick={() => !isParsing && document.getElementById('haq-import-file-input')?.click()}
              >
                <input 
                  type="file" 
                  id="haq-import-file-input"
                  className="hidden"
                  accept=".pdf,.xlsx,.csv,.docx,.txt"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileSelect(e.target.files[0]);
                    }
                  }}
                />
                
                {isParsing ? (
                  <>
                    <Loader2 className="w-12 h-12 text-accent-purple mx-auto mb-4 animate-spin" />
                    <p className="text-text-primary mb-2">AI is analyzing your document...</p>
                    <p className="text-sm text-text-muted">Extracting questions, detecting disciplines, assigning priorities</p>
                  </>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-text-muted mx-auto mb-4" />
                    <p className="text-text-primary mb-2">Drop correspondence file here</p>
                    <p className="text-sm text-text-muted mb-4">PDF, Word, Excel, or text file</p>
                    <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm" onClick={() => toast.info('File upload — drag a PDF, Word, or Excel file into the drop zone above or connect a document repository in Settings')}>
                      Browse Files
                    </button>
                  </>
                )}
              </div>
              
              {/* File type hints */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="p-3 bg-surface-card rounded-lg text-center">
                  <Mail className="w-6 h-6 text-accent-blue mx-auto mb-2" />
                  <div className="text-sm text-text-primary">FDA IR</div>
                  <div className="text-xs text-text-muted">Information Request</div>
                </div>
                <div className="p-3 bg-surface-card rounded-lg text-center">
                  <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <div className="text-sm text-text-primary">CRL</div>
                  <div className="text-xs text-text-muted">Complete Response</div>
                </div>
                <div className="p-3 bg-surface-card rounded-lg text-center">
                  <Clock className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <div className="text-sm text-text-primary">D80/D120</div>
                  <div className="text-xs text-text-muted">EMA Questions</div>
                </div>
                <div className="p-3 bg-surface-card rounded-lg text-center">
                  <FileText className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <div className="text-sm text-text-primary">RTQ/LOQ</div>
                  <div className="text-xs text-text-muted">Question Lists</div>
                </div>
              </div>
              
              {/* AI capabilities */}
              <div className="p-4 bg-accent-purple/10 border border-accent-purple/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-accent-purple mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-accent-purple">AI-Powered Analysis</div>
                    <div className="text-xs text-text-muted mt-1 space-y-1">
                      <p>• <strong>Question extraction:</strong> Automatically identifies individual questions from correspondence</p>
                      <p>• <strong>Discipline detection:</strong> Classifies questions by CMC, Clinical, Nonclinical, Safety, etc.</p>
                      <p>• <strong>Priority assignment:</strong> Determines critical, major, or minor based on language</p>
                      <p>• <strong>CTD section mapping:</strong> Suggests relevant CTD sections for each question</p>
                      <p>• <strong>Related question linking:</strong> Identifies questions that should be answered together</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          
          {/* Parse Error */}
          {parseError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">{parseError}</span>
              </div>
            </div>
          )}
          
          {/* Parsed Results */}
          {parsedResult && (
            <div className="space-y-4 md:space-y-6">
              {/* Summary */}
              <div className="p-4 bg-surface-card border border-border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {haqCorrespondenceParserService.getCorrespondenceTypeLabel(parsedResult.correspondenceType)}
                      </div>
                      <div className="text-xs text-text-muted">
                        {parsedResult.healthAuthority} • Received: {parsedResult.receivedDate}
                        {parsedResult.dueDate && ` • Due: ${parsedResult.dueDate}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-semibold ${getConfidenceColor(parsedResult.overallConfidence)}`}>
                      {parsedResult.overallConfidence}%
                    </div>
                    <div className="text-xs text-text-muted">AI Confidence</div>
                  </div>
                </div>
                
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                  <div className="text-center p-3 bg-surface rounded-lg">
                    <div className="text-2xl font-bold text-text-primary">{parsedResult.totalQuestions}</div>
                    <div className="text-xs text-text-muted">Total Questions</div>
                  </div>
                  <div className="text-center p-3 bg-red-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-red-400">{parsedResult.questionsByPriority.critical}</div>
                    <div className="text-xs text-text-muted">Critical</div>
                  </div>
                  <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-amber-400">{parsedResult.questionsByPriority.major}</div>
                    <div className="text-xs text-text-muted">Major</div>
                  </div>
                  <div className="text-center p-3 bg-slate-500/10 rounded-lg">
                    <div className="text-2xl font-bold text-slate-400">{parsedResult.questionsByPriority.minor}</div>
                    <div className="text-xs text-text-muted">Minor</div>
                  </div>
                </div>
              </div>
              
              {/* Discipline Breakdown */}
              <div className="p-4 bg-surface-card border border-border rounded-lg">
                <div className="text-sm font-medium text-text-primary mb-3">Questions by Discipline</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(parsedResult.questionsByDiscipline)
                    .filter(([, count]) => count > 0)
                    .map(([discipline, count]) => (
                      <Badge key={discipline} color={getDisciplineColor(discipline as HAQDiscipline)} size="sm">
                        {discipline}: {count}
                      </Badge>
                    ))
                  }
                </div>
              </div>
              
              {/* Questions List */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-surface border-b border-border">
                  <div className="text-sm font-medium text-text-primary">Extracted Questions</div>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {parsedResult.questions.map((question, idx) => (
                    <div 
                      key={question.id}
                      className="px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-accent-blue">Q{question.questionNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text-primary line-clamp-2">{question.text}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge color={getDisciplineColor(question.discipline)} size="xs">
                              {question.discipline}
                            </Badge>
                            <Badge color={getPriorityColor(question.priority)} size="xs">
                              {question.priority}
                            </Badge>
                            {question.ctdSection && (
                              <span className="text-xs text-text-muted">CTD {question.ctdSection}</span>
                            )}
                            <span className={`text-xs ${getConfidenceColor(question.confidence)}`}>
                              {question.confidence}% confidence
                            </span>
                          </div>
                          {question.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {question.keywords.slice(0, 5).map((keyword, kidx) => (
                                <span key={kidx} className="px-1.5 py-0.5 bg-surface rounded text-xs text-text-muted">
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Parsing Notes */}
              {parsedResult.parsingNotes.length > 0 && (
                <div className="p-3 bg-surface-card border border-border rounded-lg">
                  <div className="text-xs font-medium text-text-muted mb-2">AI Parsing Notes</div>
                  <div className="text-xs text-text-muted space-y-0.5">
                    {parsedResult.parsingNotes.map((note, idx) => (
                      <p key={idx}>• {note}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-text-muted">
            {selectedFile && !parsedResult && 'Analyzing...'}
            {parsedResult && `${parsedResult.totalQuestions} questions ready to import`}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
              Cancel
            </button>
            {parsedResult ? (
              <Button
                variant="primary"
                icon={<Check className="w-4 h-4" />}
                onClick={handleImport}
              >
                Import {parsedResult.totalQuestions} Questions
              </Button>
            ) : (
              <Button
                onClick={deadClick}
                variant="primary"
                icon={isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                disabled={isParsing || !selectedFile}
              >
                {isParsing ? 'Analyzing...' : 'Select File to Parse'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
