
import React from 'react';
import { FilterState } from '@/components/layout/FilterBar';
import { useState, useMemo, useEffect } from 'react';
import {
  FlaskConical, Microscope, Rat, FileText, Clock, CheckCircle, AlertTriangle, Plus,
  Search, Calendar, Building2, ChevronRight, Activity, Beaker, Heart, Brain, Shield,
  TrendingUp, BookOpen, Globe, Zap, Target, Sparkles, ExternalLink, AlertCircle,
  Eye, ArrowRight, Lightbulb, Users, BarChart3, Filter, Tag, Link2, Edit3, Edit2, Trash2,
  // v0.8.2: New icons for Lead Opt and Translational
  FlaskRound, GitBranch, TestTube, ArrowRightLeft, Dna, Syringe,
  // v0.27.7: Additional icons for drillable stats
  XCircle, Package, RefreshCw, ChevronDown, ChevronUp, X, Lock, Unlock, Database
} from 'lucide-react';
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine
} from 'recharts';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { useProducts } from '@/stores/products-store';
import { useProductFilter } from '@/hooks/useProductFilter';
import { useResearchStore } from '@/store/useResearchStore';
import type { NominationAuditEntry } from '@/store/useResearchStore';
import { useResearchPersistence, useLeadOptPersistence, useTranslationalPersistence } from '@/hooks/useResearchPersistence';
import {
  literatureAlerts as initialLiteratureAlerts,
  targetPrograms as initialTargetPrograms,
  preclinicalStudies as initialPreclinicalStudies,
  competitorPrograms,
  LiteratureAlert,
  TargetProgram,
  PreclinicalStudy,
  CompetitorProgram,
  getStageColor,
  getStudyStatusColor,
  getRelevanceColor,
  getThreatColor
} from '@/data/research-data';
import {
  indReadinessPrograms,
  INDReadinessProgram,
  INDSection,
  getINDSectionStatusColor
} from '@/data/research-data';
// v0.8.2: Lead Optimization data
import {
  leadSeries,
  candidateSelectionSummary,
  getLeadSeriesByProduct,
  getLeadOptStats,
  getClinicalCandidate,
  getBackupCandidate,
  LeadSeries,
  LeadCompound,
} from '@/data/lead-optimization-data';
// v0.8.2: Translational Science data
import {
  translationalStudies,
  biomarkerPanels,
  pkTranslationSummary,
  safetyTranslations,
  getTranslationalStudiesByProduct,
  getTranslationalStats,
  getBiomarkerPanelByProduct,
  getSafetyTranslationsByProduct,
  TranslationalStudy,
  SafetyTranslation,
} from '@/data/translational-data';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
// v0.27.7: DrillableStatCard for actionable metrics
import { DrillableStatCard } from '@/components/ui/DrillableStatCard';
// v126: Card components for migration
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
// v126: Skeleton components for loading states  
import { StatCardGridSkeleton, CardSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
// v155: Research create modals for dead-end buttons
import { NewTargetModal, NewPreclinicalStudyModal } from './CreateModals';
// v157: Edit/Delete modals and toast notifications
import { EditTargetModal, EditStudyModal, ConfirmDeleteModal } from './CRUDModals';
import { useToast } from '@/components/ui/Toast';
// v158: Cross-module event system
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
// v0.13.89: Cross-module navigation for ELN link
import { useAppStore } from '@/store/useAppStore';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// v0.42.23: Input Types for Create/Update Handlers
// ============================================================================

interface CreateTargetInput {
  target: string;
  targetClass: string;
  indication: string;
  modality?: string;
  stage?: string;
  nextMilestone?: string;
  nextMilestoneDate?: string;
  team: string;
  rationale?: string;
}

interface CreateStudyInput {
  studyNumber?: string;
  title: string;
  type?: string;
  species?: string;
  product?: string;
  productId?: string;
  cro?: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  glpCompliant?: boolean;
  objectives?: string;
}

interface UpdateTargetInput extends Partial<CreateTargetInput> {
  id: string;
}

interface UpdateStudyInput extends Partial<CreateStudyInput> {
  id: string;
  status?: string;
  glpCompliant?: boolean;
  title?: string;
}

// Item type for list item click handlers
interface ListItemBase {
  id: string;
}

// ============================================================================
// v110 Color Maps - ResearchScreen
// ============================================================================

// Stage color map (discovery pipeline stages)
const researchStageColorMap: Record<string, BadgeColor> = {
  discovery: 'slate',
  'lead-opt': 'purple',
  preclinical: 'blue',
  'ind-enabling': 'amber',
  clinical: 'green',
};

// Study status color map
const studyStatusColorMap: Record<string, BadgeColor> = {
  planned: 'slate',
  ongoing: 'blue',
  completed: 'green',
  'report-draft': 'amber',
  final: 'green',
};

// Relevance color map (literature/intelligence)
const relevanceColorMap: Record<string, BadgeColor> = {
  high: 'red',
  medium: 'amber',
  low: 'slate',
};

// Threat level color map (competitive intelligence)
const threatColorMap: Record<string, BadgeColor> = {
  high: 'red',
  medium: 'amber',
  low: 'slate',
};

// Literature type color map
const literatureTypeColorMap: Record<string, BadgeColor> = {
  publication: 'blue',
  patent: 'amber',
  conference: 'purple',
  regulatory: 'red',
  news: 'teal',
};

// IND section status color map
const indSectionStatusColorMap: Record<string, BadgeColor> = {
  'not-started': 'slate',
  'in-progress': 'blue',
  complete: 'green',
  'at-risk': 'red',
};

// Readiness percentage color map (thresholds)
const getReadinessColor = (percent: number): BadgeColor => {
  if (percent >= 70) return 'green';
  if (percent >= 40) return 'amber';
  return 'red';
};

// v0.8.2: Lead Optimization color maps
const seriesStatusColorMap: Record<string, BadgeColor> = {
  active: 'blue',
  deprioritized: 'slate',
  selected: 'green',
};

const compoundStatusColorMap: Record<string, BadgeColor> = {
  synthesized: 'slate',
  screened: 'blue',
  profiled: 'purple',
  candidate: 'green',
  backup: 'amber',
  discontinued: 'red',
};

// v0.8.2: Translational Science color maps
const correlationStatusColorMap: Record<string, BadgeColor> = {
  confirmed: 'green',
  partial: 'amber',
  'not-confirmed': 'red',
  pending: 'slate',
};

const biomarkerValidationColorMap: Record<string, BadgeColor> = {
  discovery: 'slate',
  qualified: 'blue',
  validated: 'green',
  clinical: 'purple',
};

const humanRelevanceColorMap: Record<string, BadgeColor> = {
  likely: 'red',
  possible: 'amber',
  unlikely: 'green',
};

// ============================================================================
// v110 Badge Helpers - ResearchScreen
// ============================================================================

export const getResearchStageBadge = (stage: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={researchStageColorMap[stage] || 'gray'} size={size}>
    {stage.replace('-', ' ')}
  </Badge>
);

export const getStudyStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={studyStatusColorMap[status] || 'gray'} size={size}>
    {status.replace('-', ' ')}
  </Badge>
);

export const getRelevanceBadge = (relevance: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={relevanceColorMap[relevance] || 'gray'} size={size}>
    {relevance}
  </Badge>
);

export const getThreatBadge = (threat: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={threatColorMap[threat] || 'gray'} size={size}>
    {threat}
  </Badge>
);

export const getLiteratureTypeBadge = (type: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={literatureTypeColorMap[type] || 'gray'} size={size}>
    {type}
  </Badge>
);

export const getINDSectionStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={indSectionStatusColorMap[status] || 'gray'} size={size}>
    {status.replace('-', ' ')}
  </Badge>
);

export const getReadinessBadge = (percent: number, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={getReadinessColor(percent)} size={size}>
    {percent}%
  </Badge>
);

export const getCompetitorStageBadge = (stage: string, size: 'xs' | 'sm' = 'sm') => {
  const color: BadgeColor = stage === 'Approved' ? 'green' : 
                            stage.includes('3') ? 'amber' : 'blue';
  return <Badge color={color} size={size}>{stage}</Badge>;
};

// v0.8.2: Lead Optimization badge helpers
export const getSeriesStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={seriesStatusColorMap[status] || 'gray'} size={size}>
    {status}
  </Badge>
);

export const getCompoundStatusBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={compoundStatusColorMap[status] || 'gray'} size={size}>
    {status}
  </Badge>
);

// v0.8.2: Translational Science badge helpers
export const getCorrelationBadge = (correlation: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={correlationStatusColorMap[correlation] || 'gray'} size={size}>
    {correlation === 'not-confirmed' ? 'not confirmed' : correlation}
  </Badge>
);

export const getBiomarkerValidationBadge = (status: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={biomarkerValidationColorMap[status] || 'gray'} size={size}>
    {status}
  </Badge>
);

export const getHumanRelevanceBadge = (relevance: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={humanRelevanceColorMap[relevance] || 'gray'} size={size}>
    {relevance}
  </Badge>
);

// v0.8.2: Updated to include new tabs
type ResearchView = 'overview' | 'lead-optimization' | 'translational' | 'ind-readiness' | 'literature' | 'targets' | 'preclinical' | 'intelligence';

// v0.40.4: Map module IDs to initial views
const moduleToViewMap: Record<string, ResearchView> = {
  'research': 'overview',
  'research-lead-opt': 'lead-optimization',
  'research-translational': 'translational',
  'research-targets': 'targets',
  'research-preclinical': 'preclinical',
  'research-ind': 'ind-readiness',
  'research-literature': 'literature',
  'research-intelligence': 'intelligence',
};

interface ResearchScreenProps { filters?: FilterState; }

export function ResearchScreen({ filters }: ResearchScreenProps) {
  const products = useProducts();
  // v0.40.4: Get active module to determine initial view
  const activeModule = useAppStore(s => s.selection.activeModule);
  const initialView = moduleToViewMap[activeModule] || 'overview';
    const { deadClick } = useDeadClick();
  const viewToModuleMap: Record<ResearchView, string> = {
    'overview': 'research',
    'lead-optimization': 'research-lead-opt',
    'translational': 'research-translational',
    'targets': 'research-targets',
    'preclinical': 'research-preclinical',
    'ind-readiness': 'research-ind',
    'literature': 'research-literature',
    'intelligence': 'research-intelligence',
  };

  const [activeView, setActiveView] = useState<ResearchView>(initialView);

  // Sync tab → sidebar when tab is clicked directly
  const setActiveViewAndSync = (view: ResearchView) => {
    setActiveView(view);
    const moduleId = viewToModuleMap[view];
    if (moduleId) setActiveModule(moduleId as any);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [literatureFilter, setLiteratureFilter] = useState<string>('all');
  const [selectedLiteratureId, setSelectedLiteratureId] = useState<string | null>(null);
  // v0.91.0: AI triage state
  const [triageLoading, setTriageLoading] = useState<Record<string, boolean>>({});
  const [triageResults, setTriageResults] = useState<Record<string, import('@/app/api/ai/research-intelligence/route').TriageResult>>({});
  const [batchTriaging, setBatchTriaging] = useState(false);
  const [batchTriaged, setBatchTriaged] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<INDReadinessProgram>(indReadinessPrograms[0]);
  // v0.92.0: IND gap analysis state
  const [gapAnalysis, setGapAnalysis] = useState<Record<string, any>>({});
  const [gapAnalysisLoading, setGapAnalysisLoading] = useState<Record<string, boolean>>({});
  const [selectedSectionAssessment, setSelectedSectionAssessment] = useState<{ sectionId: string; data: any } | null>(null);
  const [sectionAssessmentLoading, setSectionAssessmentLoading] = useState<string | null>(null);
  
  // v0.40.4: Update view when module changes (e.g., clicking different nav item)
  useEffect(() => {
    const newView = moduleToViewMap[activeModule];
    if (newView) {
      setActiveView(newView);
    }
  }, [activeModule]);

  // v155: Modal states for dead-end buttons
  const [showNewTargetModal, setShowNewTargetModal] = useState(false);
  const [showNewStudyModal, setShowNewStudyModal] = useState(false);

  // v157: Edit/Delete modal states
  const [editingTarget, setEditingTarget] = useState<TargetProgram | null>(null);
  const [editingStudy, setEditingStudy] = useState<PreclinicalStudy | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<TargetProgram | null>(null);
  const [deletingStudy, setDeletingStudy] = useState<PreclinicalStudy | null>(null);
  
  // v157: Toast notifications
  const toast = useToast();
  // v0.125.58: Preclinical slide-over state
  const [selectedStudyDetail, setSelectedStudyDetail] = useState<PreclinicalStudy | null>(null);
  // v0.125.68: Study detail tab state (lifted from IIFE to fix React error #310)
  const [studyTab, setStudyTab] = useState<'summary' | 'data' | 'document' | 'audit'>('summary');
  // v0.125.70: useEffect moved below useState deps to fix TDZ crash (Cannot access before initialization)
  useEffect(() => {
    if (selectedStudyDetail) setStudyTab('summary');
  }, [selectedStudyDetail]);
  // v0.125.78: Preclinical metadata edit mode
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [metaEdits, setMetaEdits] = useState<{ectdSection:string;ichM3Section:string;route:string;duration:string;regulatoryPurpose:string;}>({ectdSection:'',ichM3Section:'',route:'',duration:'',regulatoryPurpose:''});
  const [metaAuditLog, setMetaAuditLog] = useState<Array<{field:string;from:string;to:string;by:string;at:string}>>([]);
  const [metaSaving, setMetaSaving] = useState(false);

  // v0.125.69: Translational study slide-over
  const [selectedTranslationalStudy, setSelectedTranslationalStudy] = useState<TranslationalStudy | null>(null);
  // v0.125.58: Target slide-over state
  const [selectedTargetDetail, setSelectedTargetDetail] = useState<TargetProgram | null>(null);
  // v0.125.58: Nomination modal state
  const [nominatingSeriesId, setNominatingSeriesId] = useState<string | null>(null);
  const [nominationPin, setNominationPin] = useState('');
  const [nominationPinError, setNominationPinError] = useState('');
  const [nominationScientist, setNominationScientist] = useState('');
  const [nominationRationale, setNominationRationale] = useState('');
  const [nominationTpp, setNominationTpp] = useState({ efficacy: false, safety: false, selectivity: false, cmcFeasibility: false, ipPosition: false });
  const [nominationStep, setNominationStep] = useState<'form' | 'esig' | 'done'>('form');
  // v0.125.58: ADMET expanded cards
  const [expandedAdmet, setExpandedAdmet] = useState<Record<string, boolean>>({});
  // v0.125.58: Intelligence AI state
  const [compIntelLoading, setCompIntelLoading] = useState(false);
  const [compIntelResult, setCompIntelResult] = useState<string | null>(null);
  const [compIntelGenerated, setCompIntelGenerated] = useState(false);
  
  // v158: Cross-module event system
  const emitEvent = useCrossModuleEventStore(s => s.emitEvent);

  // v0.13.89: Cross-module navigation for ELN
  const setActiveModule = useAppStore(s => s.setActiveModule);

  // v0.44.15: Persistent store replaces local useState — data survives navigation
  const researchTargets = useResearchStore(s => s.targets);
  const researchStudies = useResearchStore(s => s.studies);
  const loadSeedData = useResearchStore(s => s.loadSeedData);
  const storeAddTarget = useResearchStore(s => s.addTarget);
  const storeUpdateTarget = useResearchStore(s => s.updateTarget);
  const storeRemoveTarget = useResearchStore(s => s.removeTarget);
  const storeAddStudy = useResearchStore(s => s.addStudy);
  const storeUpdateStudy = useResearchStore(s => s.updateStudy);
  const storeRemoveStudy = useResearchStore(s => s.removeStudy);

  // v0.89.0: Persistence hook — hydrates from API, exposes persist helpers
  const {
    isHydrated: researchHydrated,
    persistTarget,
    deleteTarget: apiDeleteTarget,
    persistStudy,
    deleteStudy: apiDeleteStudy,
    persistAlert,
    deleteAlert: apiDeleteAlert,
  } = useResearchPersistence();

  // Legacy seed fallback for when API is unavailable
  useEffect(() => {
    if (!researchHydrated) {
      loadSeedData(initialTargetPrograms, initialPreclinicalStudies);
    }
  }, [researchHydrated, loadSeedData]);

  // Aliases so rest of component needs no changes
  const targetPrograms = researchTargets;
  const preclinicalStudies = researchStudies;

  // v0.90.0: Lead Opt + Translational store selectors
  const storeLeadSeries = useResearchStore(s => s.leadSeries);
  const storeCandidateSummary = useResearchStore(s => s.candidateSelectionSummary);
  const storeTranslationalStudies = useResearchStore(s => s.translationalStudies);
  const storeBiomarkerPanels = useResearchStore(s => s.biomarkerPanels);
  const storeSafetyTranslations = useResearchStore(s => s.safetyTranslations);
  const loadLeadOptData = useResearchStore(s => s.loadLeadOptData);
  const loadTranslationalData = useResearchStore(s => s.loadTranslationalData);
  const storeSetSeriesStatus = useResearchStore(s => s.setSeriesStatus);
  const storeAddNominationEntry = useResearchStore(s => s.addNominationAuditEntry);
  const storeUpdateLeadSeries = useResearchStore(s => s.updateLeadSeries);
  const storeUpdateTranslationalStudy = useResearchStore(s => s.updateTranslationalStudy);

  // v0.90.0: Lead Opt persistence hook
  const {
    isHydrated: leadOptHydrated,
    persistLeadSeries,
    deleteLeadSeries: apiDeleteLeadSeries,
  } = useLeadOptPersistence();

  // v0.90.0: Translational persistence hook
  const {
    isHydrated: translationalHydrated,
    persistTranslationalStudy,
    deleteTranslationalStudy: apiDeleteTranslationalStudy,
  } = useTranslationalPersistence();

  // Seed fallbacks when API unavailable
  useEffect(() => {
    if (!leadOptHydrated) {
      loadLeadOptData(leadSeries as any, candidateSelectionSummary as any);
    }
  }, [leadOptHydrated, loadLeadOptData]);

  useEffect(() => {
    if (!translationalHydrated) {
      loadTranslationalData(translationalStudies as any, biomarkerPanels as any, safetyTranslations as any);
    }
  }, [translationalHydrated, loadTranslationalData]);

  // Computed helpers derived from store (replaces static helper functions)
  const { selectedProductId: researchProductId } = useProductFilter();
  const activeResearchProductId = researchProductId ?? 'lig-2847';
  const storeLeadSeriesByProduct = (productId: string) =>
    storeLeadSeries.filter(ls => ls.productId === productId);
  const storeTranslationalByProduct = (productId: string) =>
    storeTranslationalStudies.filter(ts => ts.productId === productId);
  const storeBiomarkerByProduct = (productId: string) =>
    storeBiomarkerPanels.find(bp => bp.productId === productId);
  const storeSafetyTransByProduct = (productId: string) =>
    storeSafetyTranslations.filter(st => st.productId === productId);
  const literatureAlerts = initialLiteratureAlerts;

  // v156: Handler for creating new targets
  // v157: Added toast notification
  const handleCreateTarget = (data: CreateTargetInput) => {
    const newTarget: TargetProgram = {
      id: `tgt-${Date.now()}`,
      target: data.target,
      targetClass: data.targetClass,
      indication: data.indication,
      modality: data.modality || 'Small molecule',
      stage: (data.stage || 'discovery') as TargetProgram['stage'],
      confidence: 75,
      product: 'LIG-2847',
      productId: 'lig-2847',
      startDate: new Date().toISOString().split('T')[0],
      nextMilestone: data.nextMilestone || 'Target validation',
      nextMilestoneDate: data.nextMilestoneDate || new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
      team: data.team,
      rationale: data.rationale || '',
    };
    storeAddTarget(newTarget);
    persistTarget(newTarget); // v0.89.0: persist to API
    toast.success(`Target "${data.target}" created successfully`);
  };

  // v156: Handler for creating new preclinical studies
  // v157: Added toast notification
  const handleCreateStudy = (data: CreateStudyInput) => {
    const newStudy: PreclinicalStudy = {
      id: `pcs-${Date.now()}`,
      studyNumber: data.studyNumber || `LIG-TOX-${String(preclinicalStudies.length + 1).padStart(3, '0')}`,
      title: data.title,
      type: (data.type || 'toxicology') as PreclinicalStudy['type'],
      species: data.species || 'Rat',
      product: data.product || 'LIG-2847',
      productId: data.productId || 'lig-2847',
      cro: data.cro || 'Charles River',
      status: 'planned',
      startDate: data.startDate || new Date().toISOString().split('T')[0],
      endDate: data.endDate,
      duration: data.duration || '3 months',
      glpCompliant: data.glpCompliant || false,
      findings: undefined,
      regulatoryPurpose: data.objectives || 'IND-enabling',
    };
    storeAddStudy(newStudy);
    persistStudy(newStudy); // v0.89.0: persist to API
    toast.success(`Study "${data.title}" created successfully`);
  };

  // v157: Handler for updating targets
  const handleUpdateTarget = (data: UpdateTargetInput) => {
    storeUpdateTarget(data.id, data as any);
    persistTarget({ ...data } as any); // v0.89.0: persist update
    toast.success(`Target "${data.target}" updated successfully`);
  };

  // v157: Handler for updating studies
  // v158: Trigger cross-module event when study status changes to 'final'
  const handleUpdateStudy = (data: UpdateStudyInput & { studyNumber?: string; type?: string; product?: string; productId?: string; findings?: string; species?: string; regulatoryPurpose?: string }) => {
    const previousStudy = preclinicalStudies.find(s => s.id === data.id);
    storeUpdateStudy(data.id, data as any);
    persistStudy({ ...data } as any); // v0.89.0: persist update
    toast.success(`Study "${data.title}" updated successfully`);
    
    // v158: Emit cross-module event when study is completed/finalized
    if (data.status === 'final' && previousStudy?.status !== 'final') {
      const eventType = data.glpCompliant ? 'glp-study-finalized' : 'preclinical-study-completed';
      emitEvent(
        eventType,
        'research',
        {
          studyId: data.id,
          studyNumber: data.studyNumber || previousStudy?.studyNumber,
          studyType: data.type || previousStudy?.type,
          title: data.title,
          product: data.product || previousStudy?.product,
          productId: data.productId || previousStudy?.productId,
          findings: data.findings || previousStudy?.findings,
          glpCompliant: data.glpCompliant,
          species: data.species || previousStudy?.species,
          regulatoryPurpose: data.regulatoryPurpose || previousStudy?.regulatoryPurpose,
        },
        { priority: 'high', automated: true, requiresReview: true }
      );
      toast.success(`Cross-module cascade triggered for ${data.studyNumber || 'study'}`);
    }
    
    // v158: Emit event when preclinical finding is reported
    if (data.findings && !previousStudy?.findings) {
      emitEvent(
        'preclinical-finding-reported',
        'research',
        {
          studyId: data.id,
          studyNumber: data.studyNumber || previousStudy?.studyNumber,
          product: data.product || previousStudy?.product,
          productId: data.productId || previousStudy?.productId,
          findings: data.findings,
          species: data.species || previousStudy?.species,
        },
        { priority: 'medium', automated: true, requiresReview: true }
      );
    }
  };

  // v157: Handler for deleting targets
  const handleDeleteTarget = (target: TargetProgram) => {
    storeRemoveTarget(target.id);
    apiDeleteTarget(target.id); // v0.89.0: delete from API
    toast.success(`Target "${target.target}" deleted`);
  };

  // v157: Handler for deleting studies
  const handleDeleteStudy = (study: PreclinicalStudy) => {
    storeRemoveStudy(study.id);
    apiDeleteStudy(study.id); // v0.89.0: delete from API
    toast.success(`Study "${study.studyNumber}" deleted`);
  };

  // v0.92.0: IND gap analysis handlers
  const handleRunGapAnalysis = async (program: INDReadinessProgram) => {
    setGapAnalysisLoading(prev => ({ ...prev, [program.id]: true }));
    try {
      const linkedStudies = researchStudies
        .filter(s => s.productId === program.productId)
        .map(s => ({ studyNumber: s.studyNumber, type: s.type, status: s.status, glpCompliant: s.glpCompliant, findings: s.findings }));
      const res = await fetch('/api/ai/ind-gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze-gaps', program, linkedStudies }),
      });
      const data = await res.json();
      if (data.data) {
        setGapAnalysis(prev => ({ ...prev, [program.id]: { ...data.data, _source: data.source } }));
        toast.success('Gap analysis complete');
      }
    } catch {
      toast.error('Gap analysis failed');
    } finally {
      setGapAnalysisLoading(prev => ({ ...prev, [program.id]: false }));
    }
  };

  const handleAssessSection = async (section: INDSection, program: INDReadinessProgram) => {
    setSectionAssessmentLoading(section.id);
    try {
      const res = await fetch('/api/ai/ind-gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assess-section',
          section,
          program: { productName: program.productName, indication: program.indication, targetINDDate: program.targetINDDate },
        }),
      });
      const data = await res.json();
      if (data.data) setSelectedSectionAssessment({ sectionId: section.id, data: data.data });
    } catch {
      toast.error('Section assessment failed');
    } finally {
      setSectionAssessmentLoading(null);
    }
  };

  // v0.91.0: AI literature triage handlers
  const handleTriageAlert = async (alert: LiteratureAlert) => {
    setTriageLoading(prev => ({ ...prev, [alert.id]: true }));
    try {
      const res = await fetch('/api/ai/research-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'triage-alert',
          alert,
          programContext: { product: 'Nexavant', target: 'KRAS G12C', indication: 'NSCLC', stage: 'ind-enabling' },
        }),
      });
      const data = await res.json();
      if (data.data) {
        setTriageResults(prev => ({ ...prev, [alert.id]: data.data }));
        // Persist updated relevance back to store + API
        if (data.data.updatedRelevance !== alert.relevance) {
          persistAlert({ ...alert, relevance: data.data.updatedRelevance });
        }
      }
    } catch (err) {
      toast.error('Triage failed — check network');
    } finally {
      setTriageLoading(prev => ({ ...prev, [alert.id]: false }));
    }
  };

  const handleBatchTriage = async () => {
    setBatchTriaging(true);
    try {
      const res = await fetch('/api/ai/research-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'batch-triage',
          alerts: filteredLiterature.slice(0, 10),
          programContext: { product: 'Nexavant', target: 'KRAS G12C', indication: 'NSCLC', stage: 'ind-enabling' },
        }),
      });
      const data = await res.json();
      if (Array.isArray(data.data)) {
        const map: Record<string, any> = {};
        data.data.forEach((r: any) => { map[r.alertId] = r; });
        setTriageResults(prev => ({ ...prev, ...map }));
        setBatchTriaged(true);
        toast.success(`${data.data.length} alerts triaged`);
      }
    } catch (err) {
      toast.error('Batch triage failed');
    } finally {
      setBatchTriaging(false);
    }
  };

  // v0.90.0: Lead Opt mutation handlers
  const handleSetSeriesStatus = (
    seriesId: string,
    status: 'active' | 'deprioritized' | 'selected',
    reason?: string,
    rationale?: string
  ) => {
    storeSetSeriesStatus(seriesId, status, reason, rationale);
    const updated = useResearchStore.getState().leadSeries.find(ls => ls.id === seriesId);
    if (updated) persistLeadSeries(updated); // v0.90.0: persist to API
    const label = status === 'selected' ? 'selected as candidate' : status === 'deprioritized' ? 'deprioritized' : 'reactivated';
    toast.success(`Series ${label}`);
  };

  const handleUpdateLeadSeries = (id: string, updates: Partial<import('@/data/lead-optimization-data').LeadSeries>) => {
    storeUpdateLeadSeries(id, updates);
    const updated = useResearchStore.getState().leadSeries.find(ls => ls.id === id);
    if (updated) persistLeadSeries(updated); // v0.90.0: persist to API
  };

  // v0.90.0: Translational mutation handlers
  const handleUpdateTranslationalStudy = (
    id: string,
    updates: Partial<import('@/data/translational-data').TranslationalStudy>
  ) => {
    storeUpdateTranslationalStudy(id, updates);
    const updated = useResearchStore.getState().translationalStudies.find(ts => ts.id === id);
    if (updated) persistTranslationalStudy(updated); // v0.90.0: persist to API
    toast.success('Translational study updated');
  };

  // v0.125.58: Nomination confirm handler
  const handleNominationConfirm = () => {
    if (nominationPin !== '1234') {
      setNominationPinError('Incorrect PIN. Please try again.');
      return;
    }
    if (!nominatingSeriesId) return;
    const series = storeLeadSeries.find(ls => ls.id === nominatingSeriesId);
    if (!series) return;

    const pinHash = `sha256:${btoa('lead-scientist:1234:' + Date.now()).replace(/=/g, '')}`;
    const entry: NominationAuditEntry = {
      id: `NOM-${Date.now()}`,
      seriesId: nominatingSeriesId,
      seriesNumber: series.seriesNumber,
      nominatingScientist: nominationScientist || 'Lead Scientist',
      nominationDate: new Date().toISOString().split('T')[0],
      tppAlignment: nominationTpp,
      rationale: nominationRationale,
      admetSummary: series.admetProfile
        ? `Solubility ${series.admetProfile.solubility}%, Permeability ${series.admetProfile.permeability}%, Met. Stability ${series.admetProfile.metabolicStability}%, hERG Margin ${series.admetProfile.hERGSafetyMargin}%`
        : 'ADMET data pending',
      pinHash,
      role: 'Lead Scientist',
      timestamp: new Date().toISOString(),
    };

    storeSetSeriesStatus(nominatingSeriesId, 'selected', undefined, nominationRationale);
    storeAddNominationEntry(entry);
    setNominationStep('done');

    setTimeout(() => {
      setNominatingSeriesId(null);
      setNominationStep('form');
      setNominationPin('');
      setNominationPinError('');
      setNominationScientist('');
      setNominationRationale('');
      setNominationTpp({ efficacy: false, safety: false, selectivity: false, cmcFeasibility: false, ipPosition: false });
      toast.success(`${series.seriesNumber} nominated as Development Candidate`, {
        action: { label: 'View in Authoring', onClick: () => setActiveModule('authoring') },
      });
    }, 1200);
  };

  // v0.125.58: Competitive intelligence live AI call
  const handleCompIntelGenerate = async () => {
    setCompIntelLoading(true);
    setCompIntelResult(null);
    try {
      const res = await fetch('/api/ai/research-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'competitive-analysis',
          target: 'KRAS G12C',
          indication: 'NSCLC',
          product: 'LIG-2847',
          competitors: competitorPrograms.map(c => c.company + ' / ' + c.drug),
          recentAlerts: literatureAlerts.slice(0, 5).map(a => ({
            id: a.id, title: a.title, source: a.source, date: a.date,
            type: a.type, summary: a.summary, tags: a.tags, competitor: a.competitor,
          })),
        }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      const text = data.analysis?.summary || data.analysis?.marketPosition || data.narrative || null;
      setCompIntelResult(text || null);
    } catch {
      setCompIntelResult(null);
    } finally {
      setCompIntelLoading(false);
      setCompIntelGenerated(true);
    }
  };

  // v129: Loading state for improved perceived performance
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);

  const matchingProductIds = useMemo(() => {
    if (!filters) return null;
    const hasActiveFilter = filters.product !== 'all' || filters.therapeuticArea !== 'all' || filters.modality !== 'all' || filters.stage !== 'all';
    if (!hasActiveFilter) return null;
    let filtered = [...products];
    if (filters.product !== 'all') filtered = filtered.filter(p => p.id === filters.product);
    if (filters.therapeuticArea !== 'all') filtered = filtered.filter(p => p.therapeuticArea.toLowerCase().replace(/\s+/g, '-') === filters.therapeuticArea);
    // Include both store ID and name-normalised ID (e.g. 'LIG-2847' → 'lig-2847') so
    // seed data with productId 'lig-2847' still matches when the store is API-hydrated
    // with UUID-style IDs. Same pattern as CMCScreen v0.125.46.
    return new Set([
      ...filtered.map(p => p.id),
      ...filtered.map(p => p.name.toLowerCase().replace(/\s+/g, '-')),
      ...filtered.map(p => p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')),
    ]);
  }, [filters]);

  const filteredStudies = useMemo(() => preclinicalStudies.filter(s => !matchingProductIds || matchingProductIds.has(s.productId)), [matchingProductIds, preclinicalStudies]);

  // Filter targets by product when a filter is active — targets optionally have productId
  const filteredTargets = useMemo(() => {
    if (!matchingProductIds) return targetPrograms;
    return targetPrograms.filter(t => !t.productId || matchingProductIds.has(t.productId));
  }, [matchingProductIds, targetPrograms]);

  // v0.27.7: Drillable stats configuration for overview
  const researchOverviewStats = useMemo(() => [
    {
      id: 'literature',
      value: literatureAlerts.length,
      label: 'Literature Alerts',
      accentColor: 'blue' as const,
      icon: <BookOpen className="w-5 h-5" />,
      drilldown: {
        title: 'Literature Alerts',
        subtitle: 'Recent publications and news',
        items: literatureAlerts.map(l => ({
          id: l.id,
          title: l.title,
          source: l.source,
          type: l.type,
          relevance: l.relevance,
          date: l.date,
        })),
        columns: [
          { key: 'title', label: 'Title', render: (v: string) => <span className="font-medium text-text-primary line-clamp-1">{v}</span> },
          { key: 'type', label: 'Type', width: 90, render: (v: string) => <Badge color={literatureTypeColorMap[v] || 'slate'} size="xs">{v}</Badge> },
          { key: 'relevance', label: 'Relevance', width: 80, render: (v: string) => <Badge color={relevanceColorMap[v] || 'slate'} size="xs">{v}</Badge> },
        ],
        searchable: true,
        onItemClick: () => setActiveView('literature'),
      },
    },
    {
      id: 'targets',
      value: targetPrograms.length,
      label: 'Active Targets',
      accentColor: 'purple' as const,
      icon: <Target className="w-5 h-5" />,
      drilldown: {
        title: 'Active Targets',
        subtitle: 'Discovery and validation programs',
        items: filteredTargets.map(t => ({
          id: t.id,
          target: t.target,
          targetClass: t.targetClass,
          indication: t.indication,
          stage: t.stage,
          confidence: t.confidence,
        })),
        columns: [
          { key: 'target', label: 'Target', render: (v: string) => <span className="font-medium text-accent-purple">{v}</span> },
          { key: 'targetClass', label: 'Class', width: 100 },
          { key: 'stage', label: 'Stage', width: 100, render: (v: string) => <Badge color={researchStageColorMap[v] || 'slate'} size="xs">{v.replace('-', ' ')}</Badge> },
          { key: 'confidence', label: 'Confidence', width: 80, render: (v: number) => <span className={`text-sm ${v >= 70 ? 'text-accent-green' : v >= 40 ? 'text-accent-amber' : 'text-accent-red'}`}>{v}%</span> },
        ],
        searchable: true,
        onItemClick: () => setActiveView('targets'),
      },
    },
    {
      id: 'preclinical',
      value: filteredStudies.length,
      label: 'Preclinical Studies',
      accentColor: 'amber' as const,
      icon: <Rat className="w-5 h-5" />,
      drilldown: {
        title: 'Preclinical Studies',
        subtitle: 'Toxicology and efficacy studies',
        items: filteredStudies.map(s => ({
          id: s.id,
          studyNumber: s.studyNumber,
          title: s.title,
          type: s.type,
          status: s.status,
          species: s.species,
        })),
        columns: [
          { key: 'studyNumber', label: 'Study #', render: (v: string) => <span className="font-medium text-accent-amber">{v}</span> },
          { key: 'type', label: 'Type', width: 90, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
          { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={studyStatusColorMap[v] || 'slate'} size="xs">{v.replace('-', ' ')}</Badge> },
          { key: 'species', label: 'Species', width: 70 },
        ],
        searchable: true,
        onItemClick: () => setActiveView('preclinical'),
      },
    },
    {
      id: 'competitors',
      value: competitorPrograms.length,
      label: 'Competitors',
      accentColor: 'red' as const,
      icon: <Zap className="w-5 h-5" />,
      drilldown: {
        title: 'Competitor Programs',
        subtitle: 'Competitive landscape monitoring',
        items: competitorPrograms.map(c => ({
          id: c.id,
          company: c.company,
          drug: c.drug,
          target: c.target,
          stage: c.stage,
          threat: c.threat,
        })),
        columns: [
          { key: 'company', label: 'Company', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
          { key: 'drug', label: 'Drug', width: 100 },
          { key: 'stage', label: 'Stage', width: 80, render: (v: string) => <span className="text-sm capitalize">{v}</span> },
          { key: 'threat', label: 'Threat', width: 70, render: (v: string) => <Badge color={threatColorMap[v] || 'slate'} size="xs">{v}</Badge> },
        ],
        searchable: true,
        onItemClick: () => setActiveView('intelligence'),
      },
    },
    {
      id: 'confidence',
      value: '78%',
      label: 'Pipeline Confidence',
      accentColor: 'green' as const,
      icon: <TrendingUp className="w-5 h-5" />,
      drilldown: {
        title: 'Pipeline Confidence Score',
        subtitle: 'Based on target validation & preclinical data',
        items: filteredTargets.map(t => ({
          id: t.id,
          target: t.target,
          confidence: t.confidence,
          stage: t.stage,
          nextMilestone: t.nextMilestone,
        })),
        columns: [
          { key: 'target', label: 'Target', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
          { key: 'confidence', label: 'Confidence', width: 90, render: (v: number) => (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${v >= 70 ? 'bg-accent-green' : v >= 40 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${v}%` }} />
              </div>
              <span className="text-xs">{v}%</span>
            </div>
          ) },
          { key: 'stage', label: 'Stage', width: 80, render: (v: string) => <Badge color={researchStageColorMap[v] || 'slate'} size="xs">{v.replace('-', ' ')}</Badge> },
        ],
        searchable: false,
      },
    },
  ], [literatureAlerts, targetPrograms, filteredStudies]);

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      publication: <BookOpen className="w-4 h-4" />, patent: <Shield className="w-4 h-4" />,
      conference: <Users className="w-4 h-4" />, regulatory: <FileText className="w-4 h-4" />,
      news: <Globe className="w-4 h-4" />,
    };
    return icons[type] || <FileText className="w-4 h-4" />;
  };

  // v110: Local color functions removed - using badge helpers instead

  const filteredLiterature = literatureAlerts.filter(lit => {
    if (literatureFilter !== 'all' && lit.type !== literatureFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return lit.title.toLowerCase().includes(q) || lit.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="research"
        showAssetContext={true}
        title="Research & Early Development"
        subtitle="Lead optimization, target identification, translational research, and IND readiness"
        icon={<FlaskRound className="w-5 h-5" />}
      />
      {/* v0.43.14: Responsive module toolbar */}
      <div className="min-h-[3.5rem] border-b border-border bg-surface-elevated flex items-center px-2 sm:px-3 md:px-4 gap-2 sm:gap-3">
        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide scroll-fade-right">
          <div className="flex items-center gap-1 min-w-max py-2">
          {(['overview', 'lead-optimization', 'translational', 'targets', 'preclinical', 'ind-readiness', 'literature', 'intelligence'] as ResearchView[]).map(view => (
            <button key={view} onClick={() => setActiveViewAndSync(view)}
              className={`px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${activeView === view ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'}`}>
              {view === 'overview' && <Activity className="w-4 h-4 flex-shrink-0" />}
              {view === 'lead-optimization' && <FlaskRound className="w-4 h-4 flex-shrink-0" />}
              {view === 'translational' && <ArrowRightLeft className="w-4 h-4 flex-shrink-0" />}
              {view === 'ind-readiness' && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
              {view === 'literature' && <BookOpen className="w-4 h-4 flex-shrink-0" />}
              {view === 'targets' && <Target className="w-4 h-4 flex-shrink-0" />}
              {view === 'preclinical' && <Rat className="w-4 h-4 flex-shrink-0" />}
              {view === 'intelligence' && <Zap className="w-4 h-4 flex-shrink-0" />}
              <span className="hidden md:inline">{view === 'ind-readiness' ? 'IND Readiness' : 
               view === 'lead-optimization' ? 'Lead Opt' :
               view === 'translational' ? 'Translational' :
               view.charAt(0).toUpperCase() + view.slice(1)}</span>
            </button>
          ))}
          {/* v0.13.95: ELN as visible tab in Research */}
          <button 
            onClick={() => setActiveModule('eln')}
            className="px-2 sm:px-3 py-1.5 text-sm rounded-lg transition-colors bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 whitespace-nowrap"
            title="Open Electronic Lab Notebook"
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">ELN</span>
          </button>
          </div>
        </div>
        {/* Pinned action — always visible */}
        <div className="flex items-center flex-shrink-0 pl-2 border-l border-border/50">
          <CapabilityGate moduleId="research" capability="author" inline>
            <button className="px-3 sm:px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2 whitespace-nowrap" onClick={deadClick}>
              <Plus className="w-4 h-4" /><span className="hidden sm:inline">Add Alert</span>
            </button>
          </CapabilityGate>
        </div>
      </div>


      <div className="flex-1 overflow-auto p-6">
        {/* OVERVIEW */}
        {activeView === 'overview' && (
          <div className="max-w-7xl mx-auto">
            {/* v117: Breadcrumb */}
            <Breadcrumb 
              moduleId="research"
              viewLabel={activeView === 'overview' ? 'Overview' :
                        activeView === 'ind-readiness' ? 'IND Readiness' :
                        activeView === 'literature' ? 'Literature' :
                        activeView === 'targets' ? 'Targets' :
                        activeView === 'preclinical' ? 'Preclinical' :
                        activeView === 'intelligence' ? 'Intelligence' : 'Overview'}
              className="mb-4"
            />

            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-text-primary">Research & Discovery</h1>
              <p className="text-sm text-text-muted mt-1">Literature monitoring, target validation, and preclinical programs</p>
            </div>

            {/* Stats - v0.27.7 Drillable Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
              {researchOverviewStats.map(stat => (
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Recent Literature */}
              <div className="col-span-1 md:col-span-2 bg-surface-elevated border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Recent Literature & News</h3>
                  <button onClick={() => setActiveView('literature')} className="text-xs text-accent-blue hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {literatureAlerts.filter(l => l.relevance === 'high').slice(0, 4).map(alert => (
                    <div key={alert.id} className="p-3 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.type === 'regulatory' ? 'bg-accent-red/20 text-accent-red' : 'bg-accent-blue/20 text-accent-blue'}`}>
                          {getTypeIcon(alert.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary line-clamp-1">{alert.title}</div>
                          <div className="text-xs text-text-muted mt-0.5">{alert.source} • {alert.date}</div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {alert.tags.slice(0, 3).map(tag => (
                              <Badge key={tag} color="gray" size="xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                        {getRelevanceBadge(alert.relevance, 'xs')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Pipeline */}
              <div className="bg-surface-elevated border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-text-primary">Target Pipeline</h3>
                  <button onClick={() => setActiveView('targets')} className="text-xs text-accent-blue hover:underline">View All</button>
                </div>
                <div className="space-y-3">
                  {filteredTargets.slice(0, 4).map(target => (
                    <div key={target.id} className="p-3 bg-surface-card rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary">{target.target}</span>
                        {getResearchStageBadge(target.stage, 'xs')}
                      </div>
                      <div className="text-xs text-text-muted">{target.indication} • {target.modality}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                          <div className="h-full bg-accent-green rounded-full" style={{ width: `${target.confidence}%` }} />
                        </div>
                        <span className="text-xs text-text-muted">{target.confidence}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Competitive Landscape */}
            <div className="mt-6 bg-surface-elevated border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary">Competitive Landscape - KRAS Inhibitors</h3>
                <button onClick={() => setActiveView('intelligence')} className="text-xs text-accent-blue hover:underline">View All</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {competitorPrograms.filter(c => c.threat === 'high').map(comp => (
                  <div key={comp.id} className="p-4 bg-surface-card rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-text-primary">{comp.company}</span>
                      {getCompetitorStageBadge(comp.stage, 'xs')}
                    </div>
                    <div className="text-xs text-accent-blue mb-1">{comp.drug}</div>
                    <div className="text-xs text-text-muted mb-2">{comp.target} • {comp.indication}</div>
                    <div className="text-xs text-text-secondary border-t border-border pt-2 mt-2">{comp.latestNews}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Insights */}
            <div className="mt-6 bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent-purple/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">AI Research Intelligence</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="p-3 bg-white/50 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Competitive Alert</div>
                      <div className="text-sm text-text-primary">Mirati's Phase 3 data suggests similar hepatotoxicity rates to class. Differentiation opportunity in safety profile.</div>
                    </div>
                    <div className="p-3 bg-white/50 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Literature Trend</div>
                      <div className="text-sm text-text-primary">12 publications on KRAS G12C combinations in last 30 days. MEK + KRAS showing strongest preclinical synergy.</div>
                    </div>
                    <div className="p-3 bg-white/50 rounded-lg">
                      <div className="text-xs text-text-muted mb-1">Regulatory Signal</div>
                      <div className="text-sm text-text-primary">FDA guidance on kinase inhibitor hepatotoxicity may inform upcoming label negotiations.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Documents */}
            <div className="mt-6 bg-surface-elevated border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent-purple" />
                  Related Documents
                </h3>
                <button className="text-xs text-accent-blue hover:underline" onClick={deadClick}>View All in Authoring →</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { id: 'ib', name: 'IB v5.0', type: 'Investigator Brochure', status: 'Final QC', progress: 95, statusColor: 'bg-accent-blue' },
                  { id: 'nonclin', name: 'Module 2.4', type: 'Nonclinical Overview', status: 'Drafting', progress: 65, statusColor: 'bg-accent-amber' },
                  { id: 'tox', name: 'TOX Summary', type: 'Nonclinical Summary', status: 'Drafting', progress: 45, statusColor: 'bg-accent-amber' },
                  { id: 'pd', name: 'Pharmacology Report', type: 'Study Report', status: 'Approved', progress: 100, statusColor: 'bg-accent-green' },
                ].map(doc => (
                  <button key={doc.id} className="p-3 bg-surface-card hover:bg-surface-card/80 rounded-lg text-left transition-colors group" onClick={deadClick}>
                    <div className="flex items-start justify-between mb-2">
                      <FileText className="w-4 h-4 text-text-muted group-hover:text-accent-blue" />
                      <span className={`w-2 h-2 rounded-full ${doc.statusColor}`} />
                    </div>
                    <div className="text-sm font-medium text-text-primary group-hover:text-accent-blue">{doc.name}</div>
                    <div className="text-xs text-text-muted mt-0.5">{doc.type}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1 bg-surface rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${doc.statusColor}`} style={{ width: `${doc.progress}%` }} />
                      </div>
                      <span className="text-xs text-text-muted">{doc.progress}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* v0.8.2: LEAD OPTIMIZATION */}
        {activeView === 'lead-optimization' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-text-primary">Lead Optimization</h1>
              <p className="text-sm text-text-muted mt-1">Compound series progression and candidate selection</p>
            </div>

            {/* Stats - v0.27.7 Drillable Stats */}
            {(() => {
              const _storeSeries924 = storeLeadSeriesByProduct(activeResearchProductId);
              const _allCompounds924 = _storeSeries924.flatMap(s => s.compounds || []);
              const _candidate924 = _storeSeries924.flatMap(s => s.compounds || []).find(c => c.isSelectedCandidate);
              const stats = {
                totalSeries: _storeSeries924.length,
                activeSeries: _storeSeries924.filter(s => s.status === 'active').length,
                selectedSeries: _storeSeries924.filter(s => s.status === 'selected').length,
                deprioritizedSeries: _storeSeries924.filter(s => s.status === 'deprioritized').length,
                totalCompounds: _allCompounds924.length,
                candidateSelected: !!_candidate924,
                candidateNumber: _candidate924?.compoundNumber || 'N/A',
              };
              const candidate = _candidate924;
              const allSeries = storeLeadSeriesByProduct(activeResearchProductId);
              const allCompounds = allSeries.flatMap(s => s.compounds.map(c => ({ ...c, seriesNumber: s.seriesNumber, seriesStatus: s.status })));
              
              const leadOptDrillableStats = [
                {
                  id: 'total-series',
                  value: stats.totalSeries,
                  label: 'Total Series',
                  accentColor: 'purple' as const,
                  icon: <GitBranch className="w-5 h-5" />,
                  drilldown: {
                    title: 'Lead Series',
                    subtitle: 'All compound series',
                    items: allSeries.map(s => ({
                      id: s.id,
                      seriesNumber: s.seriesNumber,
                      chemotype: s.chemotype,
                      status: s.status,
                      compoundCount: s.compounds.length,
                    })),
                    columns: [
                      { key: 'seriesNumber', label: 'Series', render: (v: string) => <span className="font-medium text-accent-purple">{v}</span> },
                      { key: 'chemotype', label: 'Chemotype', width: 140 },
                      { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={seriesStatusColorMap[v] || 'slate'} size="xs">{v}</Badge> },
                      { key: 'compoundCount', label: 'Compounds', width: 80, align: 'center' as const },
                    ],
                    searchable: true,
                  },
                },
                {
                  id: 'compounds-tested',
                  value: stats.totalCompounds,
                  label: 'Compounds Tested',
                  accentColor: 'blue' as const,
                  icon: <FlaskRound className="w-5 h-5" />,
                  drilldown: {
                    title: 'Tested Compounds',
                    subtitle: 'All compounds across series',
                    items: allCompounds.map(c => ({
                      id: c.compoundNumber,
                      compoundNumber: c.compoundNumber,
                      seriesNumber: c.seriesNumber,
                      status: c.status,
                      potency: c.properties.ic50,
                    })),
                    columns: [
                      { key: 'compoundNumber', label: 'Compound', render: (v: string) => <span className="font-medium text-accent-blue">{v}</span> },
                      { key: 'seriesNumber', label: 'Series', width: 80 },
                      { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={compoundStatusColorMap[v] || 'slate'} size="xs">{v}</Badge> },
                      { key: 'potency', label: 'Potency', width: 80 },
                    ],
                    searchable: true,
                  },
                },
                {
                  id: 'selected-series',
                  value: stats.selectedSeries,
                  label: 'Selected Series',
                  accentColor: 'green' as const,
                  icon: <CheckCircle className="w-5 h-5" />,
                  drilldown: {
                    title: 'Selected Series',
                    subtitle: 'Series advancing to development',
                    items: allSeries.filter(s => s.status === 'selected').map(s => ({
                      id: s.id,
                      seriesNumber: s.seriesNumber,
                      chemotype: s.chemotype,
                      compoundCount: s.compounds.length,
                    })),
                    columns: [
                      { key: 'seriesNumber', label: 'Series', render: (v: string) => <span className="font-medium text-accent-green">{v}</span> },
                      { key: 'chemotype', label: 'Chemotype', width: 140 },
                      { key: 'compoundCount', label: 'Compounds', width: 80, align: 'center' as const },
                    ],
                    searchable: false,
                  },
                },
                {
                  id: 'deprioritized',
                  value: stats.deprioritizedSeries,
                  label: 'Deprioritized',
                  accentColor: 'slate' as const,
                  icon: <XCircle className="w-5 h-5" />,
                  drilldown: {
                    title: 'Deprioritized Series',
                    subtitle: 'Series not advancing',
                    items: allSeries.filter(s => s.status === 'deprioritized').map(s => ({
                      id: s.id,
                      seriesNumber: s.seriesNumber,
                      chemotype: s.chemotype,
                      reason: s.deprioritizationReason || 'Not specified',
                    })),
                    columns: [
                      { key: 'seriesNumber', label: 'Series', render: (v: string) => <span className="font-medium text-text-muted">{v}</span> },
                      { key: 'chemotype', label: 'Chemotype', width: 120 },
                      { key: 'reason', label: 'Reason', render: (v: string) => <span className="text-xs text-text-muted">{v}</span> },
                    ],
                    searchable: false,
                  },
                },
                {
                  id: 'clinical-candidate',
                  value: candidate?.compoundNumber || 'N/A',
                  label: 'Clinical Candidate',
                  accentColor: 'green' as const,
                  icon: <Target className="w-5 h-5" />,
                  drilldown: {
                    title: 'Clinical Candidate',
                    subtitle: candidate ? 'Selected for development' : 'Not yet selected',
                    items: candidate ? [{
                      id: candidate.compoundNumber,
                      compoundNumber: candidate.compoundNumber,
                      status: candidate.status,
                      potency: candidate.properties.ic50,
                      selectivity: candidate.properties.selectivity,
                    }] : [],
                    columns: [
                      { key: 'compoundNumber', label: 'Compound', render: (v: string) => <span className="font-medium text-accent-green">{v}</span> },
                      { key: 'potency', label: 'Potency', width: 100 },
                      { key: 'selectivity', label: 'Selectivity', width: 100 },
                    ],
                    searchable: false,
                  },
                },
              ];
              
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
                  {leadOptDrillableStats.map(stat => (
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
              );
            })()}

            {/* Series Cards with ADMET Radar — v0.125.58 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {storeLeadSeriesByProduct(activeResearchProductId).map((series) => {
                const admetData = series.admetProfile ? [
                  { axis: 'Solubility', value: series.admetProfile.solubility },
                  { axis: 'Permeability', value: series.admetProfile.permeability },
                  { axis: 'Met. Stability', value: series.admetProfile.metabolicStability },
                  { axis: 'hERG Margin', value: series.admetProfile.hERGSafetyMargin },
                  { axis: 'Oral F%', value: series.admetProfile.oralBioavailability },
                  { axis: 'Selectivity', value: series.admetProfile.selectivityIndex },
                ] : [];
                const admetExpanded = expandedAdmet[series.id] || false;
                const allTppChecked = Object.values(nominationTpp).every(Boolean);
                return (
                  <div key={series.id} className={`bg-surface-elevated border-2 rounded-lg overflow-hidden transition-colors ${
                    series.status === 'selected' ? 'border-accent-green' :
                    series.status === 'deprioritized' ? 'border-border opacity-70' :
                    'border-accent-blue/30'
                  }`}>
                    {/* Card header */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-text-primary">{series.seriesNumber}</span>
                          {getSeriesStatusBadge(series.status, 'xs')}
                        </div>
                        <span className="text-xs text-text-muted">{series.compounds.length} cpds</span>
                      </div>
                      <div className="text-xs text-text-muted mb-1">{series.chemotype}</div>
                      <div className="text-xs text-text-secondary line-clamp-2">{series.description}</div>
                      {series.deprioritizationReason && (
                        <div className="mt-2 text-xs text-accent-red/80 bg-accent-red/5 rounded p-2 border border-accent-red/20">{series.deprioritizationReason}</div>
                      )}
                    </div>

                    {/* ADMET Radar — expandable */}
                    {admetData.length > 0 && (
                      <div className="border-t border-border">
                        <button
                          onClick={() => setExpandedAdmet(prev => ({ ...prev, [series.id]: !admetExpanded }))}
                          className="w-full px-4 py-2 flex items-center justify-between text-xs text-text-muted hover:text-text-primary hover:bg-surface-card/50 transition-colors"
                        >
                          <span className="font-medium">ADMET Profile</span>
                          {admetExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        {admetExpanded && (
                          <div className="px-3 pb-3">
                            <ResponsiveContainer width="100%" height={180}>
                              <RadarChart data={admetData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                                <PolarGrid stroke="var(--color-border)" />
                                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                  name="ADMET"
                                  dataKey="value"
                                  stroke={series.status === 'selected' ? '#22c55e' : series.status === 'deprioritized' ? '#64748b' : '#3b82f6'}
                                  fill={series.status === 'selected' ? '#22c55e' : series.status === 'deprioritized' ? '#64748b' : '#3b82f6'}
                                  fillOpacity={0.18}
                                  strokeWidth={1.5}
                                />
                                <Tooltip
                                  contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }}
                                  formatter={(v: number) => [`${v}/100`, '']}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                              {admetData.map(d => (
                                <div key={d.axis} className="flex items-center justify-between text-xs">
                                  <span className="text-text-muted">{d.axis}</span>
                                  <span className={`font-medium ${d.value >= 70 ? 'text-accent-green' : d.value >= 45 ? 'text-accent-amber' : 'text-accent-red'}`}>{d.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer actions */}
                    <div className="border-t border-border px-4 py-3 flex items-center justify-between">
                      <div className="text-xs text-text-muted">
                        {series.status === 'selected' && <span className="text-accent-green font-medium">✓ Development Candidate</span>}
                        {series.status === 'deprioritized' && <span className="text-text-muted">Deprioritized</span>}
                        {series.status === 'active' && <span className="text-accent-blue">Active</span>}
                      </div>
                      {series.status === 'active' && (
                        <button
                          onClick={() => {
                            setNominatingSeriesId(series.id);
                            setNominationStep('form');
                            setNominationPin('');
                            setNominationPinError('');
                            setNominationScientist('');
                            setNominationRationale('');
                            setNominationTpp({ efficacy: false, safety: false, selectivity: false, cmcFeasibility: false, ipPosition: false });
                          }}
                          className="px-3 py-1.5 bg-accent-green text-white text-xs rounded-lg hover:bg-accent-green/90 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />Select as Candidate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Series Progression Arrow (compact) */}
            <div className="bg-surface-card border border-border rounded-lg p-3 mb-6 flex items-center gap-3 overflow-x-auto">
              {storeLeadSeriesByProduct(activeResearchProductId).map((series, idx, arr) => (
                <div key={series.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${series.status === 'selected' ? 'bg-accent-green' : series.status === 'deprioritized' ? 'bg-border' : 'bg-accent-blue'}`} />
                    <span className="text-xs text-text-secondary whitespace-nowrap">{series.seriesNumber}</span>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />}
                </div>
              ))}
            </div>

            {/* Selected Series Detail */}
            {(() => {
              const selectedSeries = storeLeadSeriesByProduct(activeResearchProductId).find(s => s.status === 'selected');
              if (!selectedSeries) return null;
              
              return (
                <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{selectedSeries.seriesNumber} - {selectedSeries.seriesName}</h3>
                      <p className="text-xs text-text-muted mt-0.5">{selectedSeries.chemotype}</p>
                    </div>
                    {getSeriesStatusBadge(selectedSeries.status)}
                  </div>
                  
                  {/* Compound Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-card">
                          <th className="text-left p-3 text-xs font-medium text-text-muted">Compound</th>
                          <th className="text-left p-3 text-xs font-medium text-text-muted">Status</th>
                          <th className="text-center p-3 text-xs font-medium text-text-muted">IC50</th>
                          <th className="text-center p-3 text-xs font-medium text-text-muted">Cell Potency</th>
                          <th className="text-center p-3 text-xs font-medium text-text-muted">t½ (HLM)</th>
                          <th className="text-center p-3 text-xs font-medium text-text-muted">Solubility</th>
                          <th className="text-center p-3 text-xs font-medium text-text-muted">hERG IC50</th>
                          <th className="text-left p-3 text-xs font-medium text-text-muted">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSeries.compounds.map(compound => (
                          <tr key={compound.id} className={`border-b border-border/50 hover:bg-surface-card/50 ${
                            compound.isSelectedCandidate ? 'bg-accent-green/5' :
                            compound.isBackupCandidate ? 'bg-accent-amber/5' : ''
                          }`}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-text-primary">{compound.compoundNumber}</span>
                                {compound.isSelectedCandidate && (
                                  <Badge color="green" size="xs">Candidate</Badge>
                                )}
                                {compound.isBackupCandidate && (
                                  <Badge color="amber" size="xs">Backup</Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-3">{getCompoundStatusBadge(compound.status, 'xs')}</td>
                            <td className="p-3 text-center text-text-secondary">{compound.properties.ic50}</td>
                            <td className="p-3 text-center text-text-secondary">{compound.properties.cellPotency}</td>
                            <td className="p-3 text-center text-text-secondary">{compound.properties.metabolicStability}</td>
                            <td className="p-3 text-center text-text-secondary">{compound.properties.solubility}</td>
                            <td className="p-3 text-center text-text-secondary">{compound.properties.hergIC50}</td>
                            <td className="p-3 text-xs text-text-muted max-w-[200px] truncate">{compound.sarNotes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Candidate Selection Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-accent-green mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-2">Candidate Selection Rationale</h3>
                    <div className="space-y-2">
                      <div className="text-sm text-text-primary font-medium">{(storeCandidateSummary?.selectedCompound ?? '')}</div>
                      <ul className="text-xs text-text-secondary space-y-1">
                        {(storeCandidateSummary?.keyDifferentiators ?? []).map((diff, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-accent-green">✓</span> {diff}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* R&D Connected */}
              <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <Link2 className="w-5 h-5 text-accent-purple mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-2">R&D Connected</h3>
                    <div className="space-y-2">
                      <div className="text-xs text-text-secondary">
                        <span className="font-medium">Solubility Issue:</span> Lead compound solubility (125 μg/mL) addressed in CMC
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button className="px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs rounded-lg hover:bg-accent-purple/30" onClick={deadClick}>
                          → DOE-NXV-001 (Solubility DOE)
                        </button>
                        <button className="px-2 py-1 bg-accent-purple/20 text-accent-purple text-xs rounded-lg hover:bg-accent-purple/30" onClick={deadClick}>
                          → Formulation F1→F3
                        </button>
                      </div>
                      <div className="text-xs text-text-muted mt-2">
                        Click to view how lead optimization findings drove CMC development decisions.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* v0.8.2: TRANSLATIONAL SCIENCE */}
        {activeView === 'translational' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-semibold text-text-primary">Translational Science</h1>
              <p className="text-sm text-text-muted mt-1">Preclinical to clinical translation: PK predictions, biomarkers, safety</p>
            </div>

            {/* Stats - v0.27.7 Drillable Stats */}
            {(() => {
              const _transStudies1296 = storeTranslationalByProduct(activeResearchProductId);
              const _allFindings1296 = _transStudies1296.flatMap(s => s.keyFindings || []);
              const _safetyTrans1296 = storeSafetyTransByProduct(activeResearchProductId);
              const _biomarkers1296 = storeBiomarkerByProduct(activeResearchProductId);
              const stats = {
                totalStudies: _transStudies1296.length,
                completedStudies: _transStudies1296.filter(s => s.status === 'completed').length,
                totalFindings: _allFindings1296.length,
                confirmedPredictions: _allFindings1296.filter(f => f.correlation === 'confirmed').length,
                partialPredictions: _allFindings1296.filter(f => f.correlation === 'partial').length,
                pendingPredictions: _allFindings1296.filter(f => f.correlation === 'pending').length,
                safetyTranslations: _safetyTrans1296.length,
                confirmedSafetyPredictions: _safetyTrans1296.filter(s => s.predictionAccuracy === 'confirmed').length,
                totalBiomarkers: _biomarkers1296?.markers?.length || 0,
                validatedBiomarkers: _biomarkers1296?.markers?.filter(m => m.validationStatus === 'validated').length || 0,
                predictionAccuracy: _allFindings1296.length > 0
                  ? Math.round((_allFindings1296.filter(f => f.correlation === 'confirmed').length / Math.max(1, _allFindings1296.filter(f => f.correlation !== 'pending').length)) * 100)
                  : 0,
              };
              const studies = storeTranslationalByProduct(activeResearchProductId);
              const biomarkers = storeBiomarkerByProduct(activeResearchProductId);
              const safetyPredictions = storeSafetyTransByProduct(activeResearchProductId);
              
              const translationalDrillableStats = [
                {
                  id: 'translation-studies',
                  value: stats.totalStudies,
                  label: 'Translation Studies',
                  accentColor: 'purple' as const,
                  icon: <ArrowRightLeft className="w-5 h-5" />,
                  drilldown: {
                    title: 'Translational Studies',
                    subtitle: 'Preclinical to clinical correlation studies',
                    items: studies.map(s => ({
                      id: s.id,
                      title: s.title,
                      type: s.type,
                      species: s.species,
                      status: s.status,
                    })),
                    columns: [
                      { key: 'title', label: 'Study', render: (v: string) => <span className="font-medium text-accent-purple">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'species', label: 'Species', width: 80 },
                      { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={studyStatusColorMap[v] || 'slate'} size="xs">{v}</Badge> },
                    ],
                    searchable: true,
                    onItemClick: (item: { id: string }) => {
                      const found = storeTranslationalByProduct(activeResearchProductId).find(s => s.id === item.id);
                      if (found) setSelectedTranslationalStudy(found as TranslationalStudy);
                    },
                  },
                },
                {
                  id: 'confirmed-predictions',
                  value: stats.confirmedPredictions,
                  label: 'Confirmed Predictions',
                  accentColor: 'green' as const,
                  icon: <CheckCircle className="w-5 h-5" />,
                  drilldown: {
                    title: 'Confirmed Predictions',
                    subtitle: 'Successfully translated to clinical',
                    items: studies.filter(s => s.status === 'completed' && s.keyFindings.some(f => f.correlation === 'confirmed')).map(s => ({
                      id: s.id,
                      title: s.title,
                      type: s.type,
                      confirmedFindings: s.keyFindings.filter(f => f.correlation === 'confirmed').length,
                    })),
                    columns: [
                      { key: 'title', label: 'Study', render: (v: string) => <span className="font-medium text-accent-green">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'confirmedFindings', label: 'Confirmed', width: 90, align: 'center' as const },
                    ],
                    searchable: false,
                  },
                },
                {
                  id: 'prediction-accuracy',
                  value: `${stats.predictionAccuracy}%`,
                  label: 'Prediction Accuracy',
                  accentColor: 'green' as const,
                  icon: <Target className="w-5 h-5" />,
                  drilldown: {
                    title: 'Prediction Accuracy',
                    subtitle: 'Overall translation success rate',
                    items: [{
                      id: 'accuracy',
                      metric: 'Overall Accuracy',
                      value: `${stats.predictionAccuracy}%`,
                      confirmed: stats.confirmedPredictions,
                      total: stats.totalStudies,
                    }],
                    columns: [
                      { key: 'metric', label: 'Metric', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
                      { key: 'value', label: 'Value', width: 80, render: (v: string) => <span className="text-accent-green font-medium">{v}</span> },
                      { key: 'confirmed', label: 'Confirmed', width: 80, align: 'center' as const },
                      { key: 'total', label: 'Total', width: 80, align: 'center' as const },
                    ],
                    searchable: false,
                  },
                },
                {
                  id: 'biomarkers',
                  value: stats.totalBiomarkers,
                  label: 'Biomarkers',
                  accentColor: 'blue' as const,
                  icon: <Dna className="w-5 h-5" />,
                  drilldown: {
                    title: 'Biomarker Panel',
                    subtitle: 'Validated biomarkers for clinical development',
                    items: biomarkers?.markers?.map(b => ({
                      id: b.name,
                      name: b.name,
                      type: b.type,
                      validationStatus: b.validationStatus,
                      clinicalUtility: b.clinicalUtility,
                    })) || [],
                    columns: [
                      { key: 'name', label: 'Biomarker', render: (v: string) => <span className="font-medium text-accent-blue">{v}</span> },
                      { key: 'type', label: 'Type', width: 90, render: (v: string) => <span className="text-sm capitalize">{v}</span> },
                      { key: 'validationStatus', label: 'Validation', width: 90, render: (v: string) => <Badge color={biomarkerValidationColorMap[v] || 'slate'} size="xs">{v}</Badge> },
                    ],
                    searchable: true,
                  },
                },
                {
                  id: 'safety-predictions',
                  value: stats.safetyTranslations,
                  label: 'Safety Predictions',
                  accentColor: 'amber' as const,
                  icon: <Shield className="w-5 h-5" />,
                  drilldown: {
                    title: 'Safety Translations',
                    subtitle: 'Nonclinical to clinical safety predictions',
                    items: safetyPredictions.map(s => ({
                      id: s.id,
                      finding: s.preclinicalFinding,
                      species: s.preclinicalSpecies,
                      humanRelevance: s.humanRelevance,
                      monitoring: s.clinicalMonitoring.join(', '),
                    })),
                    columns: [
                      { key: 'finding', label: 'Finding', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
                      { key: 'species', label: 'Species', width: 80 },
                      { key: 'humanRelevance', label: 'Human Relevance', width: 110, render: (v: string) => <Badge color={humanRelevanceColorMap[v] || 'slate'} size="xs">{v}</Badge> },
                    ],
                    searchable: true,
                  },
                },
              ];
              
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4 mb-4 md:mb-6">
                  {translationalDrillableStats.map(stat => (
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
              );
            })()}

            {/* PK Translation */}
            <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">PK Translation: Preclinical → Clinical</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left p-3 text-xs font-medium text-text-muted">Parameter</th>
                      <th className="text-center p-3 text-xs font-medium text-text-muted">Rat</th>
                      <th className="text-center p-3 text-xs font-medium text-text-muted">Dog</th>
                      <th className="text-center p-3 text-xs font-medium text-text-muted">Human Predicted</th>
                      <th className="text-center p-3 text-xs font-medium text-text-muted">Human Observed</th>
                      <th className="text-center p-3 text-xs font-medium text-text-muted">Correlation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pkTranslationSummary.keyParameters.map((param, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-surface-card/50">
                        <td className="p-3 font-medium text-text-primary">{param.parameter}</td>
                        <td className="p-3 text-center text-text-secondary">{param.rat} {param.unit}</td>
                        <td className="p-3 text-center text-text-secondary">{param.dog} {param.unit}</td>
                        <td className="p-3 text-center text-text-secondary">{param.humanPredicted}</td>
                        <td className="p-3 text-center font-medium text-text-primary">{param.humanObserved || '—'}</td>
                        <td className="p-3 text-center">{getCorrelationBadge(param.correlation, 'xs')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-xs text-text-muted">
                Overall correlation: <span className="font-medium text-accent-green">Confirmed</span> — Human PK well-predicted by allometric scaling
              </div>
            </div>

            {/* Safety Translation - THE KEY STORY */}
            <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-5 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-accent-red mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Safety Translation: Predicted Signals</h3>
                  <div className="space-y-3">
                    {storeSafetyTransByProduct(activeResearchProductId).map(st => (
                      <div key={st.id} className="bg-white/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary">{st.organ}</span>
                            {getHumanRelevanceBadge(st.humanRelevance, 'xs')}
                            {st.predictionAccuracy && getCorrelationBadge(st.predictionAccuracy, 'xs')}
                          </div>
                          {st.linkedSafetySignal && (
                            <button className="px-2 py-1 bg-accent-red/20 text-accent-red text-xs rounded-lg hover:bg-accent-red/30" onClick={deadClick}>
                              → View Signal {st.linkedSafetySignal.toUpperCase()}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 text-xs mb-2">
                          <div>
                            <div className="text-text-muted">Preclinical Finding</div>
                            <div className="text-text-secondary">{st.preclinicalFinding}</div>
                          </div>
                          <div>
                            <div className="text-text-muted">Species / Dose</div>
                            <div className="text-text-secondary">{st.preclinicalSpecies} @ {st.preclinicalDose}</div>
                          </div>
                          <div>
                            <div className="text-text-muted">Clinical Observation</div>
                            <div className="text-text-secondary">{st.clinicalObservation || 'Monitoring ongoing'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-text-muted border-t border-border pt-2 mt-2">
                          <span className="font-medium">Monitoring:</span> {st.clinicalMonitoring.join(', ')} ({st.monitoringFrequency})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Biomarker Panel */}
            {(() => {
              const panel = storeBiomarkerByProduct(activeResearchProductId);
              if (!panel) return null;
              
              return (
                <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-text-primary">{panel.name}</h3>
                      <p className="text-xs text-text-muted">{panel.purpose}</p>
                    </div>
                    {getBiomarkerValidationBadge(panel.validationStatus)}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {panel.markers.map(marker => (
                      <div key={marker.id} className="bg-surface-card rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-text-primary text-sm">{marker.name}</span>
                          {getBiomarkerValidationBadge(marker.validationStatus, 'xs')}
                        </div>
                        <div className="text-xs text-text-muted mb-1">Type: {marker.type}</div>
                        <div className="text-xs text-text-secondary">{marker.clinicalUtility}</div>
                        {marker.threshold && (
                          <div className="text-xs text-text-muted mt-1">Threshold: {marker.threshold}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* R&D Connected - The Story */}
            <div className="bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <Sparkles className="w-5 h-5 text-accent-purple mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-2">The Translational Story</h3>
                  <div className="text-sm text-text-secondary space-y-2">
                    <p>
                      <strong>Hepatotoxicity was predicted.</strong> TOX-2847-002 showed ALT elevation in dogs at 3× clinical exposure. 
                      The translational analysis determined this was likely relevant to humans.
                    </p>
                    <p>
                      <strong>Monitoring was proactive.</strong> q2w LFT monitoring was built into the protocol before the first patient was dosed.
                    </p>
                    <p>
                      <strong>The prediction was confirmed.</strong> 12% of patients experienced Grade 1-2 ALT elevation — 
                      exactly as predicted. All cases were caught early and resolved with dose modification.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button className="px-3 py-1.5 bg-accent-purple/20 text-accent-purple text-xs rounded-lg hover:bg-accent-purple/30" onClick={deadClick}>
                      → View TOX-2847-002
                    </button>
                    <button className="px-3 py-1.5 bg-accent-purple/20 text-accent-purple text-xs rounded-lg hover:bg-accent-purple/30" onClick={deadClick}>
                      → View Safety Signal SIG-001
                    </button>
                    <button className="px-3 py-1.5 bg-accent-purple/20 text-accent-purple text-xs rounded-lg hover:bg-accent-purple/30" onClick={deadClick}>
                      → View Protocol Monitoring Section
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* IND READINESS */}
        {activeView === 'ind-readiness' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">IND Readiness Tracker</h1>
                <p className="text-sm text-text-muted mt-1">Track IND-enabling activities and submission readiness</p>
              </div>
              <button
                onClick={() => handleRunGapAnalysis(selectedProgram)}
                disabled={gapAnalysisLoading[selectedProgram.id]}
                className="flex items-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {gapAnalysisLoading[selectedProgram.id] ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Analysing...</>
                ) : gapAnalysis[selectedProgram.id] ? (
                  <><RefreshCw className="w-4 h-4" />Re-Run Gap Analysis</>
                ) : (
                  <><Sparkles className="w-4 h-4" />AI Gap Analysis</>
                )}
              </button>
            </div>

            {/* Stats - v0.27.7 Drillable Stats */}
            {(() => {
              const avgReadiness = Math.round(indReadinessPrograms.reduce((acc, p) => acc + p.overallReadiness, 0) / indReadinessPrograms.length);
              const nextIND = indReadinessPrograms.reduce((a, b) => new Date(a.targetINDDate) < new Date(b.targetINDDate) ? a : b);
              const daysToNextIND = Math.ceil((new Date(nextIND.targetINDDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const activeStudies = filteredStudies.filter(s => s.status === 'ongoing');
              
              const indReadinessDrillableStats = [
                {
                  id: 'preclinical-programs',
                  value: indReadinessPrograms.length,
                  label: 'Preclinical Programs',
                  accentColor: 'purple' as const,
                  icon: <FlaskConical className="w-5 h-5" />,
                  drilldown: {
                    title: 'Preclinical Programs',
                    subtitle: 'Programs in IND-enabling phase',
                    items: indReadinessPrograms.map(p => ({
                      id: p.id,
                      brandName: p.brandName,
                      productName: p.productName,
                      indication: p.indication,
                      readiness: p.overallReadiness,
                      targetDate: p.targetINDDate,
                    })),
                    columns: [
                      { key: 'brandName', label: 'Program', render: (v: string) => <span className="font-medium text-accent-purple">{v}</span> },
                      { key: 'indication', label: 'Indication', width: 140 },
                      { key: 'readiness', label: 'Readiness', width: 90, render: (v: number) => (
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-surface-card rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${v >= 70 ? 'bg-accent-green' : v >= 40 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${v}%` }} />
                          </div>
                          <span className="text-xs">{v}%</span>
                        </div>
                      ) },
                    ],
                    searchable: true,
                    onItemClick: (item: ListItemBase) => {
                      const program = indReadinessPrograms.find(p => p.id === item.id);
                      if (program) setSelectedProgram(program);
                    },
                  },
                },
                {
                  id: 'active-studies',
                  value: activeStudies.length,
                  label: 'Active Studies',
                  accentColor: 'blue' as const,
                  icon: <Activity className="w-5 h-5" />,
                  drilldown: {
                    title: 'Active Studies',
                    subtitle: 'Ongoing IND-enabling studies',
                    items: activeStudies.map(s => ({
                      id: s.id,
                      studyNumber: s.studyNumber,
                      title: s.title,
                      type: s.type,
                      species: s.species,
                      glpCompliant: s.glpCompliant,
                    })),
                    columns: [
                      { key: 'studyNumber', label: 'Study #', render: (v: string) => <span className="font-medium text-accent-blue">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'species', label: 'Species', width: 70 },
                      { key: 'glpCompliant', label: 'GLP', width: 50, align: 'center' as const, render: (v: boolean) => v ? <CheckCircle className="w-4 h-4 text-accent-green mx-auto" /> : <span className="text-text-muted">-</span> },
                    ],
                    searchable: true,
                  },
                },
                {
                  id: 'avg-readiness',
                  value: `${avgReadiness}%`,
                  label: 'Avg. Readiness',
                  accentColor: 'green' as const,
                  icon: <BarChart3 className="w-5 h-5" />,
                  drilldown: {
                    title: 'Program Readiness Summary',
                    subtitle: 'Average readiness across all programs',
                    items: indReadinessPrograms.map(p => ({
                      id: p.id,
                      brandName: p.brandName,
                      readiness: p.overallReadiness,
                      targetDate: p.targetINDDate,
                    })),
                    columns: [
                      { key: 'brandName', label: 'Program', render: (v: string) => <span className="font-medium text-text-primary">{v}</span> },
                      { key: 'readiness', label: 'Readiness', width: 120, render: (v: number) => (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-card rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${v >= 70 ? 'bg-accent-green' : v >= 40 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${v}%` }} />
                          </div>
                          <span className="text-xs">{v}%</span>
                        </div>
                      ) },
                      { key: 'targetDate', label: 'Target IND', width: 90 },
                    ],
                    searchable: false,
                  },
                },
                {
                  id: 'next-ind',
                  value: `${daysToNextIND}d`,
                  label: 'Next IND',
                  accentColor: 'amber' as const,
                  icon: <Calendar className="w-5 h-5" />,
                  drilldown: {
                    title: 'IND Timeline',
                    subtitle: `Next IND: ${nextIND.brandName} in ${daysToNextIND} days`,
                    items: indReadinessPrograms
                      .sort((a, b) => new Date(a.targetINDDate).getTime() - new Date(b.targetINDDate).getTime())
                      .map(p => ({
                        id: p.id,
                        brandName: p.brandName,
                        targetDate: p.targetINDDate,
                        daysRemaining: Math.ceil((new Date(p.targetINDDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
                        readiness: p.overallReadiness,
                      })),
                    columns: [
                      { key: 'brandName', label: 'Program', render: (v: string) => <span className="font-medium text-accent-amber">{v}</span> },
                      { key: 'targetDate', label: 'Target IND', width: 90 },
                      { key: 'daysRemaining', label: 'Days', width: 60, align: 'center' as const, render: (v: number) => (
                        <Badge color={v < 60 ? 'red' : v < 120 ? 'amber' : 'slate'} size="xs">{v}d</Badge>
                      ) },
                      { key: 'readiness', label: 'Ready', width: 60, align: 'center' as const, render: (v: number) => <span className="text-xs">{v}%</span> },
                    ],
                    searchable: false,
                  },
                },
              ];
              
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                  {indReadinessDrillableStats.map(stat => (
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
              );
            })()}

            {/* v0.92.0: AI Gap Analysis Results Panel */}
            {gapAnalysis[selectedProgram.id] && (() => {
              const ga = gapAnalysis[selectedProgram.id];
              const riskColor = ga.overallRisk === 'critical' ? 'border-accent-red bg-accent-red/5' : ga.overallRisk === 'high' ? 'border-accent-amber bg-accent-amber/5' : 'border-accent-blue bg-accent-blue/5';
              const riskText = ga.overallRisk === 'critical' ? 'text-accent-red' : ga.overallRisk === 'high' ? 'text-accent-amber' : 'text-accent-blue';
              return (
                <div className={`border rounded-xl p-5 mb-6 ${riskColor}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-accent-blue" />
                        <span className="text-sm font-semibold text-text-primary">AI Gap Analysis</span>
                        {ga._source === 'ai' && <Badge color="blue" size="xs">AI</Badge>}
                        {ga._source === 'rule-based' && <Badge color="gray" size="xs">Rule-based</Badge>}
                      </div>
                      <p className="text-sm text-text-secondary">{ga.executiveSummary}</p>
                    </div>
                    <div className="flex items-center gap-4 text-right flex-shrink-0 ml-4">
                      <div>
                        <div className={`text-lg font-bold uppercase ${riskText}`}>{ga.overallRisk}</div>
                        <div className="text-xs text-text-muted">Overall Risk</div>
                      </div>
                      <div>
                        <div className={`text-lg font-bold ${ga.readinessProjection?.onTrack ? 'text-accent-green' : 'text-accent-amber'}`}>
                          {ga.readinessProjection?.onTrack ? '✓ On Track' : '⚠ At Risk'}
                        </div>
                        <div className="text-xs text-text-muted">Timeline</div>
                      </div>
                    </div>
                  </div>
                  {ga.criticalGaps?.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Critical Gaps ({ga.criticalGaps.length})</div>
                      <div className="space-y-2">
                        {ga.criticalGaps.map((gap: any) => (
                          <div key={gap.sectionId} className="bg-surface-elevated rounded-lg p-3">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge color="gray" size="xs">{gap.section}</Badge>
                                <span className="text-sm font-medium text-text-primary">{gap.name}</span>
                                <Badge color={gap.priority === 'critical' ? 'red' : 'amber'} size="xs">{gap.priority}</Badge>
                              </div>
                              <span className="text-xs text-text-muted">{gap.estimatedDaysToResolve}d to resolve</span>
                            </div>
                            <p className="text-xs text-text-secondary mb-1">{gap.gap}</p>
                            <p className="text-xs text-accent-blue">{gap.recommendedAction}</p>
                            {gap.regulatoryBasis && <p className="text-xs text-text-muted mt-1 italic">{gap.regulatoryBasis}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {ga.actionPlan?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Action Plan</div>
                      <div className="flex flex-wrap gap-3">
                        {ga.actionPlan.map((ap: any) => (
                          <div key={ap.week} className="bg-surface-elevated rounded-lg p-3 flex-1 min-w-48">
                            <div className="text-xs font-medium text-accent-blue mb-1">Week {ap.week}</div>
                            {ap.actions.map((a: string, i: number) => (
                              <p key={i} className="text-xs text-text-secondary">{a}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Program Selector */}
              <div className="bg-surface-elevated border border-border rounded-lg p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-4">IND Programs</h3>
                <div className="space-y-2">
                  {indReadinessPrograms.map(program => (
                    <button
                      key={program.id}
                      onClick={() => setSelectedProgram(program)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedProgram.id === program.id 
                          ? 'bg-accent-blue/20 border border-accent-blue' 
                          : 'bg-surface-card hover:bg-surface-card/80 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-primary">{program.brandName}</span>
                        {getReadinessBadge(program.overallReadiness, 'xs')}
                      </div>
                      <div className="text-xs text-text-muted">{program.productName}</div>
                      <div className="text-xs text-text-muted mt-1">{program.indication}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              program.overallReadiness >= 70 ? 'bg-accent-green' :
                              program.overallReadiness >= 40 ? 'bg-accent-amber' :
                              'bg-accent-red'
                            }`} 
                            style={{ width: `${program.overallReadiness}%` }} 
                          />
                        </div>
                      </div>
                      <div className="text-xs text-text-muted mt-2">
                        Target: {program.targetINDDate}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Checklist */}
              <div className="col-span-1 md:col-span-2 bg-surface-elevated border border-border rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary">{selectedProgram.brandName} - IND Readiness</h3>
                    <p className="text-xs text-text-muted mt-0.5">{selectedProgram.productName} • {selectedProgram.indication}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-text-primary">{selectedProgram.overallReadiness}%</div>
                    <div className="text-xs text-text-muted">Overall Readiness</div>
                  </div>
                </div>

                {/* Overall Progress Bar */}
                <div className="mb-6">
                  <div className="h-3 bg-surface rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        selectedProgram.overallReadiness >= 70 ? 'bg-accent-green' :
                        selectedProgram.overallReadiness >= 40 ? 'bg-accent-amber' :
                        'bg-accent-red'
                      }`} 
                      style={{ width: `${selectedProgram.overallReadiness}%` }} 
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-text-muted">
                    <span>Target IND: {selectedProgram.targetINDDate}</span>
                    <span>{Math.ceil((new Date(selectedProgram.targetINDDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days remaining</span>
                  </div>
                </div>

                {/* Sections */}
                <div className="space-y-3">
                  {(selectedProgram.sections ?? []).map(section => (
                    <div key={section.id} className="bg-surface-card rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge color="gray" size="xs">{section.section}</Badge>
                          <span className="text-sm font-medium text-text-primary">{section.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          {getINDSectionStatusBadge(section.status, 'xs')}
                          <span className="text-sm font-semibold text-text-primary w-12 text-right">{section.progress}%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              section.progress >= 80 ? 'bg-accent-green' :
                              section.progress >= 50 ? 'bg-accent-blue' :
                              section.progress >= 25 ? 'bg-accent-amber' :
                              'bg-accent-red'
                            }`} 
                            style={{ width: `${section.progress}%` }} 
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
                        <span>Owner: {section.owner}</span>
                        <div className="flex items-center gap-3">
                          {section.dueDate && <span>Due: {section.dueDate}</span>}
                          {section.notes && <span className="text-accent-amber">{section.notes}</span>}
                          <button
                            onClick={() => handleAssessSection(section, selectedProgram)}
                            disabled={sectionAssessmentLoading === section.id}
                            className="flex items-center gap-1 text-accent-blue hover:text-accent-blue/80 disabled:opacity-50"
                          >
                            {sectionAssessmentLoading === section.id
                              ? <RefreshCw className="w-3 h-3 animate-spin" />
                              : <Sparkles className="w-3 h-3" />}
                            {selectedSectionAssessment?.sectionId === section.id ? 'Re-assess' : 'AI Assess'}
                          </button>
                        </div>
                      </div>
                      {selectedSectionAssessment?.sectionId === section.id && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <p className="text-xs text-text-secondary mb-2">{selectedSectionAssessment.data.sectionAssessment}</p>
                          {selectedSectionAssessment.data.currentDeficiencies?.length > 0 && (
                            <ul className="space-y-1">
                              {selectedSectionAssessment.data.currentDeficiencies.map((d: string, i: number) => (
                                <li key={i} className="text-xs text-accent-red flex items-start gap-1"><span>·</span>{d}</li>
                              ))}
                            </ul>
                          )}
                          {selectedSectionAssessment.data.regulatoryStandard && (
                            <p className="text-xs text-text-muted mt-2 italic">{selectedSectionAssessment.data.regulatoryStandard}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LITERATURE */}
        {activeView === 'literature' && (
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">Literature & Intelligence</h1>
                <p className="text-sm text-text-muted mt-1">Publications, patents, regulatory updates, and news</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary w-64" />
                </div>
                <select value={literatureFilter} onChange={(e) => setLiteratureFilter(e.target.value)} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                  <option value="all">All Types</option>
                  <option value="publication">Publications</option>
                  <option value="patent">Patents</option>
                  <option value="regulatory">Regulatory</option>
                  <option value="conference">Conferences</option>
                  <option value="news">News</option>
                </select>
                <button
                  onClick={handleBatchTriage}
                  disabled={batchTriaging}
                  className="flex items-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {batchTriaging ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" />Triaging...</>
                  ) : batchTriaged ? (
                    <><Sparkles className="w-4 h-4" />Re-Triage All</>
                  ) : (
                    <><Sparkles className="w-4 h-4" />AI Triage All</>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {filteredLiterature.map(alert => (
                <div key={alert.id} className="bg-surface-elevated border border-border rounded-lg p-5 hover:border-accent-blue/50 transition-colors cursor-pointer" onClick={() => setSelectedLiteratureId(alert.id === selectedLiteratureId ? null : alert.id)}>
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      alert.type === 'regulatory' ? 'bg-accent-red/20 text-accent-red' :
                      alert.type === 'patent' ? 'bg-accent-amber/20 text-accent-amber' :
                      alert.type === 'publication' ? 'bg-accent-blue/20 text-accent-blue' :
                      'bg-accent-purple/20 text-accent-purple'
                    }`}>
                      {getTypeIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-sm font-medium text-text-primary">{alert.title}</h3>
                          <div className="text-xs text-text-muted mt-0.5">{alert.source}{alert.journal && ` • ${alert.journal}`} • {alert.date}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {alert.competitor && <Badge color="gray" size="xs">{alert.competitor}</Badge>}
                          {getRelevanceBadge(alert.relevance, 'xs')}
                        </div>
                      </div>
                      <p className="text-sm text-text-secondary mb-3">{alert.summary}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {alert.tags.map(tag => (
                            <Badge key={tag} color="gray" size="xs">{tag}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          {triageResults[alert.id] ? (
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                triageResults[alert.id].recommendedAction === 'urgent-review' ? 'bg-accent-red/20 text-accent-red' :
                                triageResults[alert.id].recommendedAction === 'review' ? 'bg-accent-amber/20 text-accent-amber' :
                                triageResults[alert.id].recommendedAction === 'monitor' ? 'bg-accent-blue/20 text-accent-blue' :
                                'bg-surface-hover text-text-muted'
                              }`}>
                                {triageResults[alert.id].recommendedAction} · {triageResults[alert.id].relevanceScore}/100
                              </span>
                              <button
                                onClick={() => handleTriageAlert(alert as any)}
                                disabled={triageLoading[alert.id]}
                                className="text-xs text-text-muted hover:text-text-secondary"
                                title={triageResults[alert.id].researchBrief}
                              >
                                {triageLoading[alert.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleTriageAlert(alert as any)}
                              disabled={triageLoading[alert.id]}
                              className="text-xs text-accent-blue hover:text-accent-blue/80 flex items-center gap-1 disabled:opacity-50"
                            >
                              {triageLoading[alert.id] ? <><RefreshCw className="w-3 h-3 animate-spin" />Triaging</> : <><Sparkles className="w-3 h-3" />AI Triage</>}
                            </button>
                          )}
                          <button className="text-xs text-accent-blue hover:underline flex items-center gap-1" onClick={deadClick}>
                            <ExternalLink className="w-3 h-3" />View Source
                          </button>
                        </div>
                      </div>
                    </div>
                  {triageResults[alert.id] && (
                    <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs font-medium text-text-muted mb-1">AI Research Brief</div>
                        <p className="text-xs text-text-secondary leading-relaxed">{triageResults[alert.id].researchBrief}</p>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-text-muted mb-1">Key Insights</div>
                        <ul className="space-y-0.5">
                          {triageResults[alert.id].keyInsights.map((insight, i) => (
                            <li key={i} className="text-xs text-text-secondary flex items-start gap-1">
                              <span className="text-accent-blue mt-0.5">·</span>{insight}
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center gap-3 mt-2">
                          {triageResults[alert.id].competitiveThreat !== 'none' && (
                            <span className="text-xs text-text-muted">⚔️ Threat: <span className={triageResults[alert.id].competitiveThreat === 'high' ? 'text-accent-red' : 'text-accent-amber'}>{triageResults[alert.id].competitiveThreat}</span></span>
                          )}
                          {triageResults[alert.id].regulatoryImpact !== 'none' && (
                            <span className="text-xs text-text-muted">⚖️ Reg: <span className="text-accent-amber">{triageResults[alert.id].regulatoryImpact}</span></span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                </div>
              ))}
            </div>

            {/* v0.126.8: Literature detail slide-over */}
            {selectedLiteratureId && (() => {
              const lit = filteredLiterature.find(a => a.id === selectedLiteratureId);
              if (!lit) return null;
              return (
                <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-surface-elevated border-l border-border shadow-xl z-40 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        lit.type === 'regulatory' ? 'bg-accent-red/20 text-accent-red' :
                        lit.type === 'patent' ? 'bg-accent-amber/20 text-accent-amber' :
                        lit.type === 'publication' ? 'bg-accent-blue/20 text-accent-blue' :
                        'bg-accent-purple/20 text-accent-purple'
                      }`}>
                        {getTypeIcon(lit.type)}
                      </div>
                      <div>
                        <div className="text-xs text-text-muted capitalize">{lit.type}</div>
                        <div className="text-sm font-semibold text-text-primary">{lit.source}</div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedLiteratureId(null)} className="p-1.5 rounded-lg hover:bg-surface-card text-text-muted hover:text-text-primary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <div>
                      <h2 className="text-base font-semibold text-text-primary leading-snug mb-2">{lit.title}</h2>
                      <div className="text-xs text-text-muted mb-3">{lit.source}{lit.journal ? ` · ${lit.journal}` : ''} · {lit.date}</div>
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {getRelevanceBadge(lit.relevance, 'xs')}
                        {getLiteratureTypeBadge(lit.type, 'xs')}
                        {lit.competitor && <Badge color="gray" size="xs">{lit.competitor}</Badge>}
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{lit.summary}</p>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Tags</div>
                      <div className="flex flex-wrap gap-1.5">
                        {lit.tags.map(tag => <Badge key={tag} color="gray" size="xs">{tag}</Badge>)}
                      </div>
                    </div>

                    {triageResults[lit.id] && (
                      <div className="border-t border-border pt-4">
                        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">AI Triage Assessment</div>
                        <div className={`text-xs font-medium px-2 py-1 rounded-full inline-flex mb-3 ${
                          triageResults[lit.id].recommendedAction === 'urgent-review' ? 'bg-accent-red/20 text-accent-red' :
                          triageResults[lit.id].recommendedAction === 'review' ? 'bg-accent-amber/20 text-accent-amber' :
                          triageResults[lit.id].recommendedAction === 'monitor' ? 'bg-accent-blue/20 text-accent-blue' :
                          'bg-surface-hover text-text-muted'
                        }`}>
                          {triageResults[lit.id].recommendedAction} · Relevance {triageResults[lit.id].relevanceScore}/100
                        </div>
                        {triageResults[lit.id].researchBrief && (
                          <p className="text-sm text-text-secondary leading-relaxed">{triageResults[lit.id].researchBrief}</p>
                        )}
                      </div>
                    )}

                    <div className="border-t border-border pt-4 flex gap-3">
                      <button
                        onClick={() => handleTriageAlert(lit as any)}
                        disabled={triageLoading[lit.id]}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50 transition-colors"
                      >
                        {triageLoading[lit.id] ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Triaging…</> : <><Sparkles className="w-3.5 h-3.5" />{triageResults[lit.id] ? 'Re-Triage' : 'AI Triage'}</>}
                      </button>
                      <button
                        onClick={deadClick}
                        className="flex items-center gap-1.5 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />Source
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* TARGETS */}
        {activeView === 'targets' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">Target Pipeline</h1>
                <p className="text-sm text-text-muted mt-1">Target validation and program progression</p>
              </div>
              <button onClick={() => setShowNewTargetModal(true)} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" />New Target</button>
            </div>

            {/* Pipeline Visualization */}
            <div className="bg-surface-elevated border border-border rounded-lg p-5 mb-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4">Pipeline by Stage</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                {['discovery', 'lead-opt', 'preclinical', 'ind-enabling', 'clinical'].map(stage => (
                  <div key={stage} className="text-center">
                    <div className="text-xs text-text-muted mb-2 capitalize">{stage.replace('-', ' ')}</div>
                    <div className="space-y-2">
                      {filteredTargets.filter(t => t.stage === stage).map(target => (
                        <div key={target.id} className="p-2 rounded-lg text-xs">
                          {getResearchStageBadge(stage, 'xs')}
                          <span className="ml-1">{target.target}</span>
                        </div>
                      ))}
                      {filteredTargets.filter(t => t.stage === stage).length === 0 && (
                        <div className="p-2 rounded-lg text-xs bg-surface-card text-text-muted">-</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {filteredTargets.map(target => (
                <div key={target.id} className="bg-surface-elevated border border-border rounded-lg p-5 group cursor-pointer hover:border-accent-blue/40 transition-colors" onClick={() => setSelectedTargetDetail(target)}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-text-primary">{target.target}</h3>
                        {target.product && <Badge color="blue" size="xs">{target.product}</Badge>}
                      </div>
                      <div className="text-sm text-text-muted mt-0.5">{target.targetClass} • {target.indication}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* v157: Edit/Delete buttons */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingTarget(target); }}
                          className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted hover:text-accent-blue transition-colors"
                          title="Edit target"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDeletingTarget(target); }}
                          className="p-1.5 hover:bg-surface-card rounded-lg text-text-muted hover:text-accent-red transition-colors"
                          title="Delete target"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {getResearchStageBadge(target.stage)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-text-secondary mb-4">{target.rationale}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Modality</div>
                      <div className="text-sm text-text-primary">{target.modality}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Team</div>
                      <div className="text-sm text-text-primary">{target.team}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div>
                      <div className="text-xs text-text-muted">Next Milestone</div>
                      <div className="text-sm text-text-primary">{target.nextMilestone}</div>
                      <div className="text-xs text-accent-blue">{target.nextMilestoneDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-text-muted mb-1">Confidence</div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-surface rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${target.confidence >= 80 ? 'bg-accent-green' : target.confidence >= 60 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${target.confidence}%` }} />
                        </div>
                        <span className="text-sm font-medium text-text-primary">{target.confidence}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRECLINICAL */}
        {activeView === 'preclinical' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">Preclinical Studies</h1>
                <p className="text-sm text-text-muted mt-1">Toxicology, pharmacology, and IND-enabling studies</p>
              </div>
              <button onClick={() => setShowNewStudyModal(true)} className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" />New Study</button>
            </div>

            {/* Stats - v0.27.7 Drillable Stats */}
            {(() => {
              const completedStudies = filteredStudies.filter(s => s.status === 'final' || s.status === 'completed');
              const ongoingStudies = filteredStudies.filter(s => s.status === 'ongoing');
              const draftStudies = filteredStudies.filter(s => s.status === 'report-draft');
              const glpStudies = filteredStudies.filter(s => s.glpCompliant);
              
              const preclinicalDrillableStats = [
                {
                  id: 'completed',
                  value: completedStudies.length,
                  label: 'Completed',
                  accentColor: 'green' as const,
                  icon: <CheckCircle className="w-5 h-5" />,
                  drilldown: {
                    title: 'Completed Studies',
                    subtitle: 'Final or completed studies',
                    items: completedStudies.map(s => ({
                      id: s.id,
                      studyNumber: s.studyNumber,
                      title: s.title,
                      type: s.type,
                      species: s.species,
                      findings: s.findings || 'No findings recorded',
                    })),
                    columns: [
                      { key: 'studyNumber', label: 'Study #', render: (v: string) => <span className="font-medium text-accent-green">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'species', label: 'Species', width: 70 },
                    ],
                    searchable: true,
                    onItemClick: (item: ListItemBase) => setEditingStudy(filteredStudies.find(s => s.id === item.id) || null),
                  },
                },
                {
                  id: 'ongoing',
                  value: ongoingStudies.length,
                  label: 'Ongoing',
                  accentColor: 'blue' as const,
                  icon: <RefreshCw className="w-5 h-5" />,
                  drilldown: {
                    title: 'Ongoing Studies',
                    subtitle: 'Studies currently in progress',
                    items: ongoingStudies.map(s => ({
                      id: s.id,
                      studyNumber: s.studyNumber,
                      title: s.title,
                      type: s.type,
                      species: s.species,
                      cro: s.cro,
                    })),
                    columns: [
                      { key: 'studyNumber', label: 'Study #', render: (v: string) => <span className="font-medium text-accent-blue">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'species', label: 'Species', width: 70 },
                      { key: 'cro', label: 'CRO', width: 100 },
                    ],
                    searchable: true,
                    onItemClick: (item: ListItemBase) => setEditingStudy(filteredStudies.find(s => s.id === item.id) || null),
                  },
                },
                {
                  id: 'report-draft',
                  value: draftStudies.length,
                  label: 'Report Draft',
                  accentColor: 'amber' as const,
                  icon: <FileText className="w-5 h-5" />,
                  drilldown: {
                    title: 'Report Draft Studies',
                    subtitle: 'Studies with draft reports pending review',
                    items: draftStudies.map(s => ({
                      id: s.id,
                      studyNumber: s.studyNumber,
                      title: s.title,
                      type: s.type,
                      cro: s.cro,
                    })),
                    columns: [
                      { key: 'studyNumber', label: 'Study #', render: (v: string) => <span className="font-medium text-accent-amber">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'cro', label: 'CRO', width: 120 },
                    ],
                    searchable: true,
                    onItemClick: (item: ListItemBase) => setEditingStudy(filteredStudies.find(s => s.id === item.id) || null),
                  },
                },
                {
                  id: 'glp-compliant',
                  value: glpStudies.length,
                  label: 'GLP Compliant',
                  accentColor: 'purple' as const,
                  icon: <Shield className="w-5 h-5" />,
                  drilldown: {
                    title: 'GLP Compliant Studies',
                    subtitle: 'Studies meeting GLP requirements',
                    items: glpStudies.map(s => ({
                      id: s.id,
                      studyNumber: s.studyNumber,
                      title: s.title,
                      type: s.type,
                      status: s.status,
                      cro: s.cro,
                    })),
                    columns: [
                      { key: 'studyNumber', label: 'Study #', render: (v: string) => <span className="font-medium text-accent-purple">{v}</span> },
                      { key: 'type', label: 'Type', width: 100, render: (v: string) => <span className="text-sm capitalize">{v.replace('-', ' ')}</span> },
                      { key: 'status', label: 'Status', width: 90, render: (v: string) => <Badge color={studyStatusColorMap[v] || 'slate'} size="xs">{v.replace('-', ' ')}</Badge> },
                    ],
                    searchable: true,
                    onItemClick: (item: ListItemBase) => setEditingStudy(filteredStudies.find(s => s.id === item.id) || null),
                  },
                },
              ];
              
              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
                  {preclinicalDrillableStats.map(stat => (
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
              );
            })()}

            {/* Studies Table */}
            <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-card">
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Study</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Type</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Species</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Product</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">CRO</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">GLP</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Key Findings</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudies.map(study => (
                    <tr key={study.id} className="border-b border-border/50 hover:bg-surface-card/50 group cursor-pointer" onClick={() => setSelectedStudyDetail(study)}>
                      <td className="p-4">
                        <div className="text-sm font-medium text-accent-blue">{study.studyNumber}</div>
                        <div className="text-xs text-text-muted max-w-[200px] truncate">{study.title}</div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary capitalize">{study.type.replace('-', ' ')}</td>
                      <td className="p-4 text-sm text-text-secondary">{study.species}</td>
                      <td className="p-4 text-sm text-text-secondary">{study.product}</td>
                      <td className="p-4 text-sm text-text-muted">{study.cro}</td>
                      <td className="p-4 text-center">
                        {study.glpCompliant ? <CheckCircle className="w-4 h-4 text-accent-green mx-auto" /> : <span className="text-xs text-text-muted">No</span>}
                      </td>
                      <td className="p-4 text-center">
                        {getStudyStatusBadge(study.status, 'xs')}
                      </td>
                      <td className="p-4 text-xs text-text-muted max-w-[200px] truncate">{study.findings || '-'}</td>
                      {/* v157: Edit/Delete actions */}
                      <td className="p-4 text-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setEditingStudy(study); }}
                            className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-accent-blue transition-colors"
                            title="Edit study"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeletingStudy(study); }}
                            className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-accent-red transition-colors"
                            title="Delete study"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ICH M3(R2) Compliance Checklist */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">ICH M3(R2) Nonclinical Package Status</h2>
                  <p className="text-xs text-text-muted mt-0.5">Required studies for IND and NDA filing per ICH M3(R2) — Guidance on Nonclinical Safety Studies</p>
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface-card">
                      <th className="text-left px-4 py-2.5 text-text-muted">Study Type</th>
                      <th className="text-left px-4 py-2.5 text-text-muted">ICH M3 §</th>
                      <th className="text-center px-4 py-2.5 text-text-muted">IND Req</th>
                      <th className="text-center px-4 py-2.5 text-text-muted">NDA Req</th>
                      <th className="text-left px-4 py-2.5 text-text-muted">Covered By</th>
                      <th className="text-center px-4 py-2.5 text-text-muted">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { studyType: 'Single-dose toxicology',            section: '11.3.1',     ind: true,  nda: true,  coveredBy: 'TOX-2847-001', status: 'complete'     },
                      { studyType: 'Repeat-dose tox ≥4 wk (rodent)',   section: '11.3.4.1',   ind: true,  nda: true,  coveredBy: 'TOX-2847-001', status: 'complete'     },
                      { studyType: 'Repeat-dose tox ≥13 wk (non-rodent)', section: '11.3.4.2', ind: false, nda: true,  coveredBy: 'TOX-2847-002', status: 'complete'     },
                      { studyType: 'Genotoxicity battery (Ames + MN)', section: '11.3.3',     ind: true,  nda: true,  coveredBy: 'GENO-2847-001', status: 'complete'    },
                      { studyType: 'Safety pharmacology core battery', section: '11.1',        ind: true,  nda: true,  coveredBy: 'PHARM-2847-001', status: 'complete'   },
                      { studyType: 'PK / mass balance (rodent)',        section: '11.2',        ind: true,  nda: true,  coveredBy: 'PK-2847-001',   status: 'complete'   },
                      { studyType: 'Reproductive toxicology (DART)',    section: '11.3.5',     ind: false, nda: true,  coveredBy: null,             status: 'in-progress'},
                      { studyType: 'Carcinogenicity (2-year rat)',      section: '11.3.6',     ind: false, nda: true,  coveredBy: null,             status: 'in-progress'},
                    ].map((row, i) => (
                      <tr key={i} className={`border-b border-border/50 last:border-0 hover:bg-surface-card/50 ${row.status === 'complete' ? '' : 'bg-amber-500/[0.02]'}`}>
                        <td className="px-4 py-2.5 font-medium text-text-primary">{row.studyType}</td>
                        <td className="px-4 py-2.5 font-mono text-text-muted">{row.section}</td>
                        <td className="px-4 py-2.5 text-center">
                          {row.ind ? <span className="text-accent-green">✓</span> : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.nda ? <span className="text-accent-green">✓</span> : <span className="text-text-muted">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.coveredBy
                            ? <button
                                onClick={() => { const found = filteredStudies.find(s => s.studyNumber === row.coveredBy); if (found) setSelectedStudyDetail(found); }}
                                className="text-accent-blue font-mono hover:underline"
                              >{row.coveredBy}</button>
                            : <span className="text-text-muted italic">Not yet initiated</span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.status === 'complete'
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green/10 text-accent-green text-[10px] font-semibold"><CheckCircle className="w-3 h-3" />Complete</span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber text-[10px] font-semibold"><Clock className="w-3 h-3" />In Progress</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-4 py-2.5 bg-surface-card border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">IND package: 6 / 6 required studies complete · NDA package: 6 / 8 complete (DART and carcinogenicity ongoing)</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-green" />
                      <span className="text-[10px] text-text-muted">IND-ready</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-accent-amber" />
                      <span className="text-[10px] text-text-muted">NDA-pending</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* COMPETITIVE INTELLIGENCE */}
        {activeView === 'intelligence' && (
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-text-primary">Competitive Intelligence</h1>
                <p className="text-sm text-text-muted mt-1">Competitor programs and market landscape</p>
              </div>
            </div>

            {/* Threat Summary - v0.27.7 Drillable Stats */}
            {(() => {
              const highThreat = competitorPrograms.filter(c => c.threat === 'high');
              const mediumThreat = competitorPrograms.filter(c => c.threat === 'medium');
              const lowThreat = competitorPrograms.filter(c => c.threat === 'low');
              
              const competitorDrillableStats = [
                {
                  id: 'high-threat',
                  value: highThreat.length,
                  label: 'High Threat',
                  accentColor: 'red' as const,
                  icon: <AlertTriangle className="w-5 h-5" />,
                  drilldown: {
                    title: 'High Threat Competitors',
                    subtitle: 'Immediate competitive concern',
                    items: highThreat.map(c => ({
                      id: c.id,
                      company: c.company,
                      drug: c.drug,
                      target: c.target,
                      stage: c.stage,
                      latestNews: c.latestNews,
                    })),
                    columns: [
                      { key: 'company', label: 'Company', render: (v: string) => <span className="font-medium text-accent-red">{v}</span> },
                      { key: 'drug', label: 'Drug', width: 100 },
                      { key: 'target', label: 'Target', width: 100 },
                      { key: 'stage', label: 'Stage', width: 80, render: (v: string) => <span className="text-sm capitalize">{v}</span> },
                    ],
                    searchable: true,
                  },
                },
                {
                  id: 'medium-threat',
                  value: mediumThreat.length,
                  label: 'Medium Threat',
                  accentColor: 'amber' as const,
                  icon: <AlertCircle className="w-5 h-5" />,
                  drilldown: {
                    title: 'Medium Threat Competitors',
                    subtitle: 'Requiring ongoing monitoring',
                    items: mediumThreat.map(c => ({
                      id: c.id,
                      company: c.company,
                      drug: c.drug,
                      target: c.target,
                      stage: c.stage,
                    })),
                    columns: [
                      { key: 'company', label: 'Company', render: (v: string) => <span className="font-medium text-accent-amber">{v}</span> },
                      { key: 'drug', label: 'Drug', width: 100 },
                      { key: 'target', label: 'Target', width: 100 },
                      { key: 'stage', label: 'Stage', width: 80, render: (v: string) => <span className="text-sm capitalize">{v}</span> },
                    ],
                    searchable: true,
                  },
                },
                {
                  id: 'monitoring',
                  value: lowThreat.length,
                  label: 'Monitoring',
                  accentColor: 'slate' as const,
                  icon: <Eye className="w-5 h-5" />,
                  drilldown: {
                    title: 'Monitoring List',
                    subtitle: 'Early stage or low threat',
                    items: lowThreat.map(c => ({
                      id: c.id,
                      company: c.company,
                      drug: c.drug,
                      target: c.target,
                      stage: c.stage,
                    })),
                    columns: [
                      { key: 'company', label: 'Company', render: (v: string) => <span className="font-medium text-text-muted">{v}</span> },
                      { key: 'drug', label: 'Drug', width: 100 },
                      { key: 'target', label: 'Target', width: 100 },
                      { key: 'stage', label: 'Stage', width: 80, render: (v: string) => <span className="text-sm capitalize">{v}</span> },
                    ],
                    searchable: true,
                  },
                },
              ];
              
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
                  {competitorDrillableStats.map(stat => (
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
              );
            })()}

            {/* Competitor Table */}
            <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-card">
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Company</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Drug</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Target</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Indication</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Stage</th>
                    <th className="text-center p-4 text-xs font-medium text-text-muted">Threat</th>
                    <th className="text-left p-4 text-xs font-medium text-text-muted">Latest News</th>
                  </tr>
                </thead>
                <tbody>
                  {competitorPrograms.map(comp => (
                    <tr key={comp.id} className={`border-b border-border/50 hover:bg-surface-card/50 ${comp.threat === 'high' ? 'bg-accent-red/5' : ''}`}>
                      <td className="p-4 text-sm font-medium text-text-primary">{comp.company}</td>
                      <td className="p-4 text-sm text-accent-blue">{comp.drug}</td>
                      <td className="p-4 text-sm text-text-secondary">{comp.target}</td>
                      <td className="p-4 text-sm text-text-secondary">{comp.indication}</td>
                      <td className="p-4 text-center">
                        {getCompetitorStageBadge(comp.stage, 'xs')}
                      </td>
                      <td className="p-4 text-center">
                        {getThreatBadge(comp.threat, 'xs')}
                      </td>
                      <td className="p-4">
                        <div className="text-xs text-text-secondary max-w-[250px]">{comp.latestNews}</div>
                        <div className="text-xs text-text-muted mt-0.5">{comp.newsDate}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Competitor Stage Progression Chart — v0.125.58 */}
            <div className="mt-6 bg-surface-elevated border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-1">Competitor Stage Progression</h3>
              <p className="text-xs text-text-muted mb-4">Clinical advancement score by quarter (Q1 2022 – Q4 2024)</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={[
                  { quarter: 'Q1 22', Amgen: 3, Mirati: 2, Roche: 1, RevMed: 0 },
                  { quarter: 'Q2 22', Amgen: 3, Mirati: 2, Roche: 1, RevMed: 0 },
                  { quarter: 'Q3 22', Amgen: 4, Mirati: 3, Roche: 1, RevMed: 1 },
                  { quarter: 'Q4 22', Amgen: 4, Mirati: 3, Roche: 2, RevMed: 1 },
                  { quarter: 'Q1 23', Amgen: 5, Mirati: 4, Roche: 2, RevMed: 1 },
                  { quarter: 'Q2 23', Amgen: 5, Mirati: 5, Roche: 2, RevMed: 2 },
                  { quarter: 'Q3 23', Amgen: 6, Mirati: 5, Roche: 3, RevMed: 2 },
                  { quarter: 'Q4 23', Amgen: 6, Mirati: 6, Roche: 3, RevMed: 2 },
                  { quarter: 'Q1 24', Amgen: 7, Mirati: 6, Roche: 4, RevMed: 3 },
                  { quarter: 'Q2 24', Amgen: 7, Mirati: 7, Roche: 4, RevMed: 3 },
                  { quarter: 'Q3 24', Amgen: 8, Mirati: 7, Roche: 5, RevMed: 4 },
                  { quarter: 'Q4 24', Amgen: 8, Mirati: 8, Roche: 5, RevMed: 4 },
                ]} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} domain={[0, 10]} />
                  <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Amgen" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Mirati" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Roche" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="RevMed" stroke="#06b6d4" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* AI Competitive Analysis — live call — v0.125.58 */}
            <div className="mt-4 bg-accent-purple/5 border border-accent-purple/20 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  <h3 className="text-sm font-semibold text-text-primary">AI Competitive Analysis</h3>
                  {compIntelGenerated && <Badge color="green" size="xs">Generated</Badge>}
                </div>
                <button
                  onClick={handleCompIntelGenerate}
                  disabled={compIntelLoading}
                  className="px-3 py-1.5 bg-accent-purple text-white text-xs rounded-lg hover:bg-accent-purple/90 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                >
                  {compIntelLoading
                    ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" />Analysing...</>
                    : <><Sparkles className="w-3.5 h-3.5" />{compIntelGenerated ? 'Regenerate' : 'Generate Analysis'}</>}
                </button>
              </div>
              {compIntelLoading && (
                <div className="space-y-2">
                  <div className="h-3 bg-surface-card rounded animate-pulse w-full" />
                  <div className="h-3 bg-surface-card rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-surface-card rounded animate-pulse w-4/5" />
                </div>
              )}
              {!compIntelLoading && compIntelResult && (
                <div className="text-sm text-text-secondary space-y-2">
                  <p>{compIntelResult}</p>
                </div>
              )}
              {!compIntelLoading && !compIntelResult && compIntelGenerated && (
                <div className="text-sm text-text-secondary space-y-2">
                  <p><strong>Market Position:</strong> LIG-2847 enters a validated but competitive KRAS G12C market. Differentiated safety profile and proactive hepatotoxicity monitoring are key differentiators versus Lumakras and Krazati.</p>
                  <p><strong>Emerging Threats:</strong> Pan-KRAS inhibitors (Revolution Medicines RMC-6236) may expand beyond G12C and reduce addressable market share. Monitor Phase 2 readouts in 2025.</p>
                  <p><strong>Opportunity:</strong> FDA hepatotoxicity guidance creates a level playing field. First-mover advantage in proactive safety monitoring and combination strategies (PD-1/MEK) remains an open competitive window.</p>
                </div>
              )}
              {!compIntelLoading && !compIntelResult && !compIntelGenerated && (
                <p className="text-sm text-text-muted italic">Click Generate Analysis to run a live AI competitive landscape assessment based on current competitor data.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════
           v0.125.58 OVERLAYS: Preclinical Slide-over, Target Slide-over,
           Nomination Modal
      ══════════════════════════════════════════════════════════════ */}

      {/* ── Preclinical Study Slide-over ─────────────────────────────── */}
      {selectedStudyDetail && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedStudyDetail(null)} />
          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-surface-elevated border-l border-border z-50 flex flex-col shadow-2xl transform transition-transform">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-accent-blue">{selectedStudyDetail.studyNumber}</span>
                  {selectedStudyDetail.glpCompliant && <Badge color="green" size="xs">GLP</Badge>}
                </div>
                <h2 className="text-lg font-semibold text-text-primary">{selectedStudyDetail.title}</h2>
                <p className="text-sm text-text-muted mt-1">{selectedStudyDetail.regulatoryPurpose} · {selectedStudyDetail.duration}</p>
              </div>
              <div className="flex items-center gap-2">
                {/* v0.125.78: Edit Metadata button — role: edit:preclinical_metadata (Business Admin) */}
                <CapabilityGate moduleId="research" capability="author" inline>
                  {!isEditingMeta ? (
                    <button
                      onClick={() => {
                        setMetaEdits({
                          ectdSection: selectedStudyDetail.ectdSection || '',
                          ichM3Section: selectedStudyDetail.ichM3Section || '',
                          route: selectedStudyDetail.route || '',
                          duration: selectedStudyDetail.duration || '',
                          regulatoryPurpose: selectedStudyDetail.regulatoryPurpose || '',
                        });
                        setIsEditingMeta(true);
                        setStudyTab('summary');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-accent-blue/50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Metadata
                    </button>
                  ) : (
                    <button onClick={() => setIsEditingMeta(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border text-text-muted hover:text-red-400 transition-colors">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  )}
                </CapabilityGate>
                <button onClick={() => { setSelectedStudyDetail(null); setIsEditingMeta(false); }} className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            {(() => {
              const s = selectedStudyDetail;
              return (
                <>
                  <div className="flex items-center gap-0.5 px-6 py-2 border-b border-border bg-surface-card flex-shrink-0">
                    {(['summary', 'data', 'document', 'audit'] as const).map(t => (
                      <button key={t} onClick={() => { setStudyTab(t); if(t!=='summary') setIsEditingMeta(false); }}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${studyTab === t ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-secondary'}`}>
                        {t === 'summary' ? 'Summary' : t === 'data' ? 'Structured Data' : t === 'document' ? 'Documents' : `Audit Trail${metaAuditLog.length > 0 ? ` (${metaAuditLog.length})` : ''}`}
                      </button>
                    ))}
                  </div>

                  {/* Scrollable body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* ── SUMMARY TAB ── */}
                    {studyTab === 'summary' && (<>
                      {/* NOAEL / LOAEL / MTD — real data */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'NOAEL', value: s.noael || 'See report', color: 'text-accent-green', bg: 'bg-accent-green/5 border-accent-green/20' },
                          { label: 'LOAEL', value: s.loael || 'See report', color: 'text-accent-amber', bg: 'bg-accent-amber/5 border-accent-amber/20' },
                          { label: 'MTD',   value: s.mtd   || 'See report', color: 'text-accent-red',   bg: 'bg-accent-red/5   border-accent-red/20'   },
                        ].map(item => (
                          <div key={item.label} className={`border rounded-lg p-3 text-center ${item.bg}`}>
                            <div className="text-[10px] text-text-muted uppercase tracking-wider mb-1">{item.label}</div>
                            <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {s.noaelBasis && (
                        <p className="text-xs text-text-muted italic border-l-2 border-accent-green/40 pl-3">{s.noaelBasis}</p>
                      )}

                      {/* Protocol details — v0.125.78: edit-mode aware */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Protocol</h3>
                          {isEditingMeta && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">Edit Mode — Business Admin</span>}
                        </div>

                        {isEditingMeta ? (
                          /* ── EDIT MODE ── */
                          <div className="space-y-4">
                            {/* Read-only fields */}
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { label: 'Species', value: s.species },
                                { label: 'CRO', value: s.cro },
                                { label: 'Study Director', value: s.studyDirector || '—' },
                                { label: 'Report Number', value: s.reportNumber || s.studyNumber },
                              ].map(row => (
                                <div key={row.label} className="bg-surface-elevated rounded-lg p-2.5 opacity-60">
                                  <div className="text-[10px] text-text-muted uppercase tracking-wide">{row.label}</div>
                                  <div className="text-xs text-text-primary mt-0.5 font-medium">{row.value || '—'}</div>
                                </div>
                              ))}
                            </div>

                            {/* Editable fields */}
                            <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/5 p-4 space-y-3">
                              <div className="text-[10px] font-semibold text-accent-blue uppercase tracking-wider mb-2 flex items-center gap-1.5"><Edit2 className="w-3 h-3"/> Editable Metadata Fields</div>
                              {[
                                { key: 'ectdSection' as const, label: 'eCTD Module/Section', placeholder: 'e.g. Module 4.2.3.2 — Repeat-Dose Toxicity', validation: (v:string) => v.startsWith('Module') || v.includes('4.') ? '' : 'Must reference a valid eCTD module (e.g. Module 4.2.x)' },
                                { key: 'ichM3Section' as const, label: 'ICH M3(R2) Reference', placeholder: 'e.g. ICH M3(R2) §11.3.4.1', validation: (v:string) => v.includes('ICH') || v==='' ? '' : 'Must reference a valid ICH M3(R2) section' },
                                { key: 'route' as const, label: 'Route of Administration', placeholder: 'e.g. Oral gavage', validation: () => '' },
                                { key: 'duration' as const, label: 'Study Duration', placeholder: 'e.g. 4 weeks + 2-week recovery', validation: () => '' },
                                { key: 'regulatoryPurpose' as const, label: 'Regulatory Purpose', placeholder: 'e.g. IND-enabling', validation: () => '' },
                              ].map(field => {
                                const err = field.validation(metaEdits[field.key]);
                                return (
                                  <div key={field.key}>
                                    <label className="text-xs text-text-muted block mb-1">{field.label}</label>
                                    <input
                                      value={metaEdits[field.key]}
                                      onChange={e => setMetaEdits(prev => ({...prev, [field.key]: e.target.value}))}
                                      placeholder={field.placeholder}
                                      className={`w-full px-3 py-2 text-xs bg-surface border rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 ${err ? 'border-red-500/50' : 'border-border'}`}
                                    />
                                    {err && <p className="text-[10px] text-red-400 mt-0.5">{err}</p>}
                                  </div>
                                );
                              })}

                              {/* Save / Cancel */}
                              <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsEditingMeta(false)} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary border border-border rounded-lg transition-colors">Cancel</button>
                                <button
                                  disabled={metaSaving}
                                  onClick={async () => {
                                    setMetaSaving(true);
                                    // Validate all fields
                                    const ichOk = metaEdits.ichM3Section==='' || metaEdits.ichM3Section.includes('ICH');
                                    const ectdOk = metaEdits.ectdSection==='' || metaEdits.ectdSection.startsWith('Module') || metaEdits.ectdSection.includes('4.');
                                    if (!ichOk || !ectdOk) { setMetaSaving(false); toast.error('Validation failed — check ICH M3(R2) and eCTD section format'); return; }
                                    // Build audit entries
                                    const now = new Date().toISOString();
                                    const newEntries: Array<{field:string;from:string;to:string;by:string;at:string}> = [];
                                    (['ectdSection','ichM3Section','route','duration','regulatoryPurpose'] as const).forEach(k => {
                                      const prev = s[k] || '';
                                      if (metaEdits[k] !== prev) newEntries.push({ field: k, from: prev, to: metaEdits[k], by: 'Sean McNiff', at: now });
                                    });
                                    // Simulate async save
                                    await new Promise(r => setTimeout(r, 600));
                                    storeUpdateStudy(s.id, {
                                      ectdSection: metaEdits.ectdSection || s.ectdSection,
                                      ichM3Section: metaEdits.ichM3Section || s.ichM3Section,
                                      route: metaEdits.route || s.route,
                                      duration: metaEdits.duration || s.duration,
                                      regulatoryPurpose: metaEdits.regulatoryPurpose || s.regulatoryPurpose,
                                    });
                                    setSelectedStudyDetail(prev => prev ? { ...prev, ...metaEdits } : prev);
                                    if (newEntries.length > 0) {
                                      setMetaAuditLog(prev => [...newEntries, ...prev]);
                                      toast.success(`${newEntries.length} metadata field${newEntries.length>1?'s':''} updated · Audit trail recorded`);
                                    } else {
                                      toast.info('No changes detected');
                                    }
                                    setMetaSaving(false);
                                    setIsEditingMeta(false);
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent-blue text-white rounded-lg hover:bg-accent-blue/80 disabled:opacity-50 transition-colors"
                                >
                                  {metaSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                                  {metaSaving ? 'Saving…' : 'Save & Audit'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* ── READ MODE ── */
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: 'Species', value: s.species },
                              { label: 'Route', value: s.route || s.duration },
                              { label: 'Duration', value: s.duration },
                              { label: 'CRO', value: s.cro },
                              { label: 'Study Director', value: s.studyDirector || '—' },
                              { label: 'Report Number', value: s.reportNumber || s.studyNumber },
                              { label: 'eCTD Section', value: s.ectdSection || s.regulatoryPurpose },
                              { label: 'ICH M3 Reference', value: s.ichM3Section || '—' },
                            ].map(row => (
                              <div key={row.label}>
                                <div className="text-xs text-text-muted">{row.label}</div>
                                <div className="text-xs text-text-primary mt-0.5 font-medium">{row.value || '—'}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Dose levels */}
                      {s.doseLevels && s.doseLevels.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Dose Groups</h3>
                          <div className="flex flex-wrap gap-2">
                            {s.doseLevels.map((d, i) => (
                              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-surface-card border border-border font-mono text-text-secondary">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Findings */}
                      <div>
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Key Findings</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">{s.keyFindings || s.findings || 'No findings recorded.'}</p>
                      </div>

                      {/* GLP Statement */}
                      <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-accent-green" />
                          <span className="text-xs font-semibold text-accent-green">GLP Compliance Statement</span>
                        </div>
                        <p className="text-xs text-text-secondary">
                          {s.glpStatement || (s.glpCompliant
                            ? 'This study was conducted in compliance with OECD Principles of Good Laboratory Practice (ENV/MC/CHEM(98)17) and 21 CFR Part 58.'
                            : 'Non-GLP exploratory study. Data used for internal decision-making only.')}
                        </p>
                        {s.ichCitations && s.ichCitations.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {s.ichCitations.map(c => (
                              <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green font-mono">{c}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </>)}

                    {/* ── STRUCTURED DATA TAB ── */}
                    {studyTab === 'data' && (<>
                      {/* Dose-Response Chart */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">Dose–Response Relationship</h3>
                          <span className="text-[10px] text-text-muted font-mono">{s.ichM3Section || 'GLP Structured Data'}</span>
                        </div>
                        <div className="bg-surface-card border border-border rounded-lg p-3">
                          <ResponsiveContainer width="100%" height={200}>
                            <LineChart
                              data={s.doseResponseData || [
                                { dose: 0, effect: 0, toxicity: 0 },
                                { dose: 30, effect: 45, toxicity: 3 },
                                { dose: 100, effect: 78, toxicity: 28 },
                                { dose: 300, effect: 94, toxicity: 62 },
                              ]}
                              margin={{ top: 8, right: 24, bottom: 16, left: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                              <XAxis dataKey="dose" label={{ value: 'Dose (mg/kg)', position: 'insideBottom', offset: -8, fontSize: 10, fill: 'var(--color-text-muted)' }} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} label={{ value: '%', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--color-text-muted)' }} />
                              <Tooltip contentStyle={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '11px' }} />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                              {s.noael && <ReferenceLine x={parseFloat(s.noael)} stroke="#22c55e" strokeDasharray="4 4" label={{ value: 'NOAEL', fill: '#22c55e', fontSize: 9, position: 'top' }} />}
                              {s.loael && <ReferenceLine x={parseFloat(s.loael)} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'LOAEL', fill: '#f59e0b', fontSize: 9, position: 'top' }} />}
                              <Line type="monotone" dataKey="effect" name="Pharmacological Effect (%)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              <Line type="monotone" dataKey="toxicity" name="Toxicity Score (%)" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-text-muted mt-1.5 italic">Reference lines indicate NOAEL and LOAEL dose levels per ICH M3(R2) assessment.</p>
                      </div>

                      {/* In Vitro Data */}
                      {s.inVitroData && s.inVitroData.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">In Vitro Safety Data</h3>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="bg-surface-card border-b border-border">
                                  <th className="text-left px-3 py-2 text-text-muted">Assay</th>
                                  <th className="text-left px-3 py-2 text-text-muted">Endpoint</th>
                                  <th className="text-right px-3 py-2 text-text-muted">Result</th>
                                  <th className="text-right px-3 py-2 text-text-muted">Unit</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.inVitroData.map((row, i) => (
                                  <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface-card/50">
                                    <td className="px-3 py-2 font-medium text-text-primary">{row.assay}</td>
                                    <td className="px-3 py-2 text-text-secondary">{row.endpoint}</td>
                                    <td className="px-3 py-2 text-right font-mono text-text-primary">{row.result}</td>
                                    <td className="px-3 py-2 text-right text-text-muted">{row.unit}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* In Vivo Data */}
                      {s.inVivoData && s.inVivoData.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">In Vivo Findings</h3>
                          <div className="space-y-2">
                            {s.inVivoData.map((row, i) => (
                              <div key={i} className="bg-surface-card border border-border rounded-lg p-3">
                                <div className="text-xs font-semibold text-text-primary mb-1">{row.model}</div>
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <span className="text-[10px] text-text-muted">Endpoint: </span>
                                    <span className="text-xs text-text-secondary">{row.endpoint}</span>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <div className="text-xs font-mono text-text-primary">{row.result}</div>
                                    <div className="text-[10px] text-text-muted">{row.significance}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Data-centricity callout */}
                      <div className="rounded-lg border border-accent-blue/25 bg-accent-blue/5 p-4">
                        <div className="flex items-start gap-2">
                          <Database className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold text-accent-blue mb-1">Structured Data — Not Just Documents</div>
                            <p className="text-xs text-text-secondary leading-relaxed">
                              NOAEL, LOAEL, dose-response arrays, and in vitro assay results are stored as structured records in Ligature — not buried in PDF paragraphs.
                              This enables cross-study aggregation, ICH M3 compliance tracking, and direct feeding into clinical PK/PD models and safety signal analysis.
                              The study report document remains the regulatory master; structured data enables the intelligence layer.
                            </p>
                          </div>
                        </div>
                      </div>
                    </>)}

                    {/* ── DOCUMENTS TAB ── */}
                    {studyTab === 'document' && (<>
                      <div>
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Study Report Package</h3>
                        <div className="space-y-2">
                          {(s.documentLinks || [
                            { label: 'Final Study Report',  ectdPath: `m4/42-stud-rep/423-tox/4232-rep-dose-tox/${s.studyNumber}-FINAL.pdf`,    type: 'report',   sampleUrl: 'https://www.fda.gov/media/71771/download' },
                            { label: 'Study Protocol',      ectdPath: `m4/42-stud-rep/423-tox/4232-rep-dose-tox/${s.studyNumber}-PROTOCOL.pdf`, type: 'protocol', sampleUrl: 'https://database.ich.org/sites/default/files/M4S_R2_Guideline.pdf' },
                            { label: 'Raw Data Package',    ectdPath: `m4/42-stud-rep/423-tox/4232-rep-dose-tox/${s.studyNumber}-RAW.zip`,       type: 'raw-data', sampleUrl: 'https://www.fda.gov/media/102332/download' },
                          ] as Array<{ label: string; ectdPath: string; type: string; sampleUrl?: string }>).map((doc, i) => (
                            <a
                              key={i}
                              href={doc.sampleUrl || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-card hover:bg-surface hover:border-accent-blue/40 group cursor-pointer transition-colors no-underline"
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                doc.type === 'report' ? 'bg-accent-blue/10 text-accent-blue' :
                                doc.type === 'raw-data' ? 'bg-accent-amber/10 text-accent-amber' :
                                'bg-accent-purple/10 text-accent-purple'
                              }`}>
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-text-primary">{doc.label}</div>
                                <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">{doc.ectdPath}</div>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${
                                doc.type === 'report' ? 'border-accent-blue/30 text-accent-blue bg-accent-blue/5' :
                                doc.type === 'raw-data' ? 'border-accent-amber/30 text-accent-amber bg-accent-amber/5' :
                                'border-accent-purple/30 text-accent-purple bg-accent-purple/5'
                              }`}>{doc.type}</span>
                            </a>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-border bg-surface-card p-4">
                        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">eCTD Placement</div>
                        <div className="space-y-1">
                          {[
                            { label: 'Module', value: s.ectdSection?.split('—')[0]?.trim() || 'Module 4.2' },
                            { label: 'Section', value: s.ectdSection || s.regulatoryPurpose },
                            { label: 'ICH M3 Reference', value: s.ichM3Section || '—' },
                          ].map(row => (
                            <div key={row.label} className="flex items-center justify-between text-xs">
                              <span className="text-text-muted">{row.label}</span>
                              <span className="font-mono text-text-primary">{row.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="text-xs text-text-muted italic border-l-2 border-border pl-3">
                        Documents are stored in the eCTD hierarchy and are the regulatory master record.
                        Structured data extracted from these reports is available in the Structured Data tab.
                        Ligature maintains dual representation: the document for regulatory submission, the data for operational intelligence.
                      </div>
                    </>)}

                    {/* ── AUDIT TRAIL TAB ── */}
                    {studyTab === 'audit' && (<>

                      {/* v0.125.78: Metadata edit audit trail */}
                      {metaAuditLog.length > 0 && (
                        <div>
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Edit2 className="w-3.5 h-3.5 text-amber-400"/>
                            Metadata Field Changes
                            <span className="ml-auto text-[10px] font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">{metaAuditLog.length} change{metaAuditLog.length!==1?'s':''}</span>
                          </h3>
                          <div className="space-y-2">
                            {metaAuditLog.map((entry, i) => (
                              <div key={i} className="bg-surface-card border border-amber-500/20 rounded-lg p-3 text-xs">
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-mono font-semibold text-amber-400">{entry.field}</span>
                                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                    <span>{entry.by}</span>
                                    <span>·</span>
                                    <span>{new Date(entry.at).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] text-text-muted w-10 flex-shrink-0 pt-px">FROM</span>
                                    <span className="text-text-muted line-through font-mono text-[11px] leading-relaxed">{entry.from || '(empty)'}</span>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <span className="text-[10px] text-emerald-400 w-10 flex-shrink-0 pt-px">TO</span>
                                    <span className="text-text-primary font-mono text-[11px] leading-relaxed">{entry.to || '(empty)'}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 text-[10px] text-text-muted italic pl-1">
                            All metadata changes are SHA-256 linked to the study record and form part of the 21 CFR Part 11 audit trail.
                          </div>
                        </div>
                      )}

                      <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-4 h-4 text-accent-green" />
                          <span className="text-xs font-semibold text-accent-green">ALCOA+ Attestation</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {['Attributable', 'Legible', 'Contemporaneous', 'Original', 'Accurate'].map(a => (
                            <div key={a} className="text-center">
                              <CheckCircle className="w-4 h-4 text-accent-green mx-auto mb-1" />
                              <div className="text-[9px] text-accent-green font-semibold">{a}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: 'Study Director', value: s.studyDirector || s.cro || '—' },
                          { label: 'CRO', value: s.cro },
                          { label: 'Completion Date', value: s.endDate || '—' },
                          { label: 'SD Signature Date', value: s.signatureDate || '—' },
                          { label: 'QA Signed Date', value: s.qaDate || '—' },
                          { label: 'GLP Status', value: s.glpCompliant ? 'GLP Compliant — 21 CFR Part 58' : 'Non-GLP' },
                          { label: '21 CFR Part 11', value: 'Compliant — Electronic record with e-signature per §11.50(a)' },
                        ].map(row => (
                          <div key={row.label} className="flex items-start justify-between gap-4 text-xs border-b border-border/50 pb-2 last:border-0">
                            <span className="text-text-muted flex-shrink-0">{row.label}</span>
                            <span className="text-text-primary text-right">{row.value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-surface-card border border-border rounded-lg p-4">
                        <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">Electronic Record Hash (SHA-256)</div>
                        <div className="font-mono text-xs text-text-secondary break-all">
                          {s.signatureHash || 'sha256:a3f2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1'}
                        </div>
                        <div className="text-[10px] text-text-muted mt-2">
                          Signed in accordance with 21 CFR Part 11.50(a). Hash computed at time of study director electronic signature.
                          Any modification to the study record invalidates this hash — tamper-evident by design.
                        </div>
                      </div>

                      {s.glpStatement && (
                        <div>
                          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">GLP Statement</h3>
                          <p className="text-xs text-text-secondary leading-relaxed">{s.glpStatement}</p>
                        </div>
                      )}
                    </>)}
                  </div>
                </>
              );
            })()}
          </div>
        </>
      )}

      {/* ── Target Detail Slide-over ────────────────────────────────────── */}
      {selectedTargetDetail && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedTargetDetail(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-surface-elevated border-l border-border z-50 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-text-muted">{selectedTargetDetail.targetClass}</span>
                  {getResearchStageBadge(selectedTargetDetail.stage, 'xs')}
                </div>
                <h2 className="text-xl font-semibold text-text-primary">{selectedTargetDetail.target}</h2>
                <p className="text-sm text-text-muted">{selectedTargetDetail.indication} · {selectedTargetDetail.modality}</p>
              </div>
              <button onClick={() => setSelectedTargetDetail(null)} className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Confidence */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-text-muted">Target Confidence</span>
                  <span className={`text-sm font-semibold ${selectedTargetDetail.confidence >= 80 ? 'text-accent-green' : selectedTargetDetail.confidence >= 60 ? 'text-accent-amber' : 'text-accent-red'}`}>{selectedTargetDetail.confidence}%</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${selectedTargetDetail.confidence >= 80 ? 'bg-accent-green' : selectedTargetDetail.confidence >= 60 ? 'bg-accent-amber' : 'bg-accent-red'}`} style={{ width: `${selectedTargetDetail.confidence}%` }} />
                </div>
              </div>

              {/* Validation evidence */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Validation Evidence</h3>
                <div className="space-y-2">
                  {[
                    { type: 'In Vitro', detail: `${selectedTargetDetail.target} inhibition demonstrated in biochemical and cell-based assays. IC₅₀ established across panel of cell lines.` },
                    { type: 'In Vivo', detail: `${selectedTargetDetail.modality} shows tumour growth inhibition in xenograft models consistent with target engagement. Biomarker endpoints confirmed on-target activity.` },
                    { type: 'Genetic Validation', detail: `shRNA knockdown / CRISPR KO of ${selectedTargetDetail.target} recapitulates compound phenotype in vitro. Clinical mutation data corroborates target dependency.` },
                    { type: 'Biomarker Association', detail: `${selectedTargetDetail.target} expression / mutation status correlates with clinical outcome in patient datasets (TCGA / CCLE). Companion diagnostic feasibility assessed.` },
                  ].map(ev => (
                    <div key={ev.type} className="bg-surface-card border border-border rounded-lg p-3">
                      <div className="text-xs font-semibold text-text-primary mb-1">{ev.type}</div>
                      <div className="text-xs text-text-secondary">{ev.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Indication expansion table */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Indication Expansion Opportunities</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left pb-2 text-xs font-medium text-text-muted">Tumour Type</th>
                        <th className="text-center pb-2 text-xs font-medium text-text-muted">Prevalence</th>
                        <th className="text-center pb-2 text-xs font-medium text-text-muted">Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { tumour: selectedTargetDetail.indication, prevalence: '~35%', evidence: 'Primary' },
                        { tumour: selectedTargetDetail.indication.includes('NSCLC') ? 'CRC' : 'Gastric', prevalence: '~12%', evidence: 'Strong' },
                        { tumour: selectedTargetDetail.indication.includes('NSCLC') ? 'Pancreatic' : 'Ovarian', prevalence: '~4%', evidence: 'Emerging' },
                        { tumour: 'Endometrial', prevalence: '~2%', evidence: 'Exploratory' },
                      ].map(row => (
                        <tr key={row.tumour} className="border-b border-border/50">
                          <td className="py-2 text-sm text-text-primary">{row.tumour}</td>
                          <td className="py-2 text-center text-sm text-text-secondary">{row.prevalence}</td>
                          <td className="py-2 text-center">
                            <Badge color={row.evidence === 'Primary' ? 'green' : row.evidence === 'Strong' ? 'blue' : row.evidence === 'Emerging' ? 'amber' : 'slate'} size="xs">{row.evidence}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linked lead series */}
              {selectedTargetDetail.product && (
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Linked Lead Series</h3>
                  <div className="space-y-2">
                    {storeLeadSeries.filter(ls => ls.productId === selectedTargetDetail.productId || ls.target === selectedTargetDetail.target).slice(0, 3).map(ls => (
                      <div key={ls.id} className="flex items-center justify-between bg-surface-card border border-border rounded-lg p-3">
                        <div>
                          <span className="text-sm font-medium text-text-primary">{ls.seriesNumber}</span>
                          <span className="text-xs text-text-muted ml-2">{ls.chemotype}</span>
                        </div>
                        {getSeriesStatusBadge(ls.status, 'xs')}
                      </div>
                    ))}
                    {storeLeadSeries.filter(ls => ls.productId === selectedTargetDetail.productId || ls.target === selectedTargetDetail.target).length === 0 && (
                      <p className="text-xs text-text-muted italic">No lead series linked — navigate to Lead Optimization to view all series.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Team & Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-card border border-border rounded-lg p-3">
                  <div className="text-xs text-text-muted mb-1">Team</div>
                  <div className="text-sm text-text-primary">{selectedTargetDetail.team}</div>
                </div>
                <div className="bg-surface-card border border-border rounded-lg p-3">
                  <div className="text-xs text-text-muted mb-1">Next Milestone</div>
                  <div className="text-sm text-text-primary">{selectedTargetDetail.nextMilestone}</div>
                  <div className="text-xs text-accent-blue mt-0.5">{selectedTargetDetail.nextMilestoneDate}</div>
                </div>
              </div>

              {/* Rationale */}
              <div>
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Selection Rationale</h3>
                <p className="text-sm text-text-secondary">{selectedTargetDetail.rationale}</p>
              </div>

            </div>{/* end scroll */}

            {/* Footer actions */}
            <div className="p-4 border-t border-border flex items-center gap-3">
              <button
                onClick={() => { setSelectedTargetDetail(null); setActiveView('lead-optimization'); }}
                className="flex-1 px-3 py-2 bg-surface-card border border-border text-sm text-text-secondary rounded-lg hover:text-text-primary hover:border-accent-blue/40 transition-colors"
              >
                View in Lead Opt
              </button>
              <button
                onClick={() => { setSelectedTargetDetail(null); useAppStore.getState().setActiveModule('portfolio'); }}
                className="flex-1 px-3 py-2 bg-accent-blue text-white text-sm rounded-lg hover:bg-accent-blue/90 transition-colors"
              >
                View in Portfolio
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Translational Study Slide-over — v0.125.69 ───────────────────── */}
      {selectedTranslationalStudy && (() => {
        const ts = selectedTranslationalStudy;
        const REPORT_LINKS: Record<string, { label: string; path: string; type: string }[]> = {
          'tr-2847-001': [
            { label: 'PK Translation Report — TR-2847-001', path: 'm2/27-clin-over/274-clin-pharm/PK-translation-TR2847-001.pdf', type: 'report' },
            { label: 'PBPK Model Output — GastroPlus', path: 'm2/27-clin-over/274-clin-pharm/PBPK-gastroplus-LIG2847.pdf', type: 'data' },
            { label: 'Human Dose Prediction Summary', path: 'm2/27-clin-over/274-clin-pharm/dose-prediction-summary.pdf', type: 'report' },
            { label: 'Allometric Scaling Dataset', path: 'm2/27-clin-over/274-clin-pharm/allometric-scaling-data.xlsx', type: 'data' },
          ],
          'tr-2847-002': [
            { label: 'Efficacy Translation Report — TR-2847-002', path: 'm2/26-non-clin/262-pharm/efficacy-translation-TR2847-002.pdf', type: 'report' },
            { label: 'PDX Tumour Growth Data (8 models)', path: 'm2/26-non-clin/262-pharm/PDX-TGI-data-all-models.xlsx', type: 'data' },
            { label: 'Exposure-Response Model', path: 'm2/26-non-clin/262-pharm/ER-model-ORR-prediction.pdf', type: 'data' },
            { label: 'pERK PD Biomarker Analysis', path: 'm2/26-non-clin/262-pharm/pERK-PD-analysis-H358.pdf', type: 'data' },
          ],
          'tr-2847-003': [
            { label: 'Hepatotoxicity Risk Assessment — TR-2847-003', path: 'm2/26-non-clin/264-tox/hepatotox-risk-assessment-TR2847-003.pdf', type: 'report' },
            { label: 'ALT/AST Cross-Species Scaling', path: 'm2/26-non-clin/264-tox/ALT-AST-species-scaling-data.xlsx', type: 'data' },
            { label: 'Clinical Monitoring Protocol', path: 'm5/531-rep-stud/5311-clin-pharm/LFT-monitoring-protocol-v2.pdf', type: 'report' },
            { label: 'Safety Margin Calculation', path: 'm2/26-non-clin/264-tox/safety-margin-AUC-based.xlsx', type: 'data' },
          ],
        };
        const docs = REPORT_LINKS[ts.id] || [
          { label: `${ts.studyNumber} — Study Report`, path: `m2/27-clin-over/${ts.studyNumber}.pdf`, type: 'report' },
        ];
        const correlationColor = (c: string) =>
          c === 'confirmed' ? 'text-accent-green' : c === 'partial' ? 'text-accent-amber' : 'text-text-muted';
        const correlationBg = (c: string) =>
          c === 'confirmed' ? 'bg-accent-green/10 border-accent-green/30' : c === 'partial' ? 'bg-accent-amber/10 border-accent-amber/30' : 'bg-surface-card border-border';

        return (
          <>
            <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelectedTranslationalStudy(null)} />
            <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-surface-elevated border-l border-border z-50 flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-border">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-accent-purple">{ts.studyNumber}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/30 font-medium capitalize">{ts.status}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-text-primary">{ts.title}</h2>
                  <p className="text-sm text-text-muted mt-1">{ts.species} · {ts.type.replace(/-/g, ' ')}</p>
                </div>
                <button onClick={() => setSelectedTranslationalStudy(null)} className="p-2 hover:bg-surface-card rounded-lg text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab bar */}
              {(() => {
                const tabs = ['findings', 'documents'] as const;
                return null; // tabs handled inline below
              })()}

              <div className="flex-1 overflow-y-auto p-6 space-y-6">

                {/* Objective */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Objective</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{ts.objective}</p>
                </div>

                {/* Methodology */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Methodology</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{ts.methodology}</p>
                </div>

                {/* Key Findings — structured table */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Translation Findings</h3>
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-surface-card border-b border-border">
                          <th className="text-left px-3 py-2.5 text-text-muted">Parameter</th>
                          <th className="text-left px-3 py-2.5 text-text-muted">Preclinical</th>
                          <th className="text-left px-3 py-2.5 text-text-muted">Human Predicted</th>
                          <th className="text-left px-3 py-2.5 text-text-muted">Clinical Observed</th>
                          <th className="text-center px-3 py-2.5 text-text-muted">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ts.keyFindings.map((f) => (
                          <tr key={f.id} className="border-b border-border/50 last:border-0 hover:bg-surface-card/50">
                            <td className="px-3 py-2.5 font-semibold text-text-primary">{f.parameter}</td>
                            <td className="px-3 py-2.5 text-text-secondary">{f.preclinicalValue}<div className="text-[10px] text-text-muted mt-0.5">{f.preclinicalSpecies}</div></td>
                            <td className="px-3 py-2.5 text-text-secondary">{f.humanPrediction}</td>
                            <td className="px-3 py-2.5 font-medium text-text-primary">{f.actualClinical || '—'}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${correlationBg(f.correlation)} ${correlationColor(f.correlation)}`}>
                                {f.correlation}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Clinical Relevance callout */}
                <div className={`rounded-lg border p-4 ${ts.type === 'safety-translation' ? 'bg-accent-amber/5 border-accent-amber/25' : 'bg-accent-blue/5 border-accent-blue/25'}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${ts.type === 'safety-translation' ? 'text-accent-amber' : 'text-accent-blue'}`} />
                    <div>
                      <div className={`text-xs font-semibold mb-1 ${ts.type === 'safety-translation' ? 'text-accent-amber' : 'text-accent-blue'}`}>Clinical Relevance</div>
                      <p className="text-xs text-text-secondary leading-relaxed">{ts.clinicalRelevance}</p>
                    </div>
                  </div>
                </div>

                {/* Conclusions */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Conclusions</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{ts.conclusions}</p>
                </div>

                {/* Recommendations */}
                {ts.recommendations && ts.recommendations.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Recommendations</h3>
                    <div className="space-y-1.5">
                      {ts.recommendations.map((r, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                          <span className="text-accent-purple mt-0.5 flex-shrink-0">→</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Document links */}
                <div>
                  <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Report & Data Package</h3>
                  <div className="space-y-2">
                    {docs.map((doc, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface-card hover:bg-surface group cursor-pointer">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${doc.type === 'report' ? 'bg-accent-purple/10 text-accent-purple' : 'bg-accent-blue/10 text-accent-blue'}`}>
                          {doc.type === 'report' ? <FileText className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-primary">{doc.label}</div>
                          <div className="text-[10px] text-text-muted font-mono truncate mt-0.5">{doc.path}</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded border flex-shrink-0 ${doc.type === 'report' ? 'border-accent-purple/30 text-accent-purple bg-accent-purple/5' : 'border-accent-blue/30 text-accent-blue bg-accent-blue/5'}`}>{doc.type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-text-muted mt-2 italic">eCTD paths shown. Documents accessible via Regulatory → Authoring module.</p>
                </div>

                {/* Linked preclinical studies */}
                {ts.linkedPreclinicalStudies && ts.linkedPreclinicalStudies.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Linked Preclinical Studies</h3>
                    <div className="flex flex-wrap gap-2">
                      {ts.linkedPreclinicalStudies.map(id => (
                        <button key={id}
                          onClick={() => {
                            const found = filteredStudies.find(s => s.studyNumber === id || s.id === id);
                            if (found) { setSelectedTranslationalStudy(null); setSelectedStudyDetail(found); setActiveViewAndSync('preclinical'); }
                          }}
                          className="text-xs px-2.5 py-1 rounded-full border border-accent-blue/30 text-accent-blue bg-accent-blue/5 font-mono hover:bg-accent-blue/10 transition-colors"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-text-muted mt-1.5">Click to open in Preclinical Studies tab.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Candidate Nomination Modal — v0.125.58 ────────────────────── */}
      {nominatingSeriesId && (() => {
        const nomSeries = storeLeadSeries.find(ls => ls.id === nominatingSeriesId);
        if (!nomSeries) return null;
        const tppItems: { key: keyof typeof nominationTpp; label: string }[] = [
          { key: 'efficacy', label: 'Efficacy — meets or exceeds TPP target (≥50% ORR at recommended dose)' },
          { key: 'safety', label: 'Safety — acceptable safety margin (TI ≥10× at therapeutic exposure)' },
          { key: 'selectivity', label: 'Selectivity — ≥100-fold selectivity over off-targets of concern' },
          { key: 'cmcFeasibility', label: 'CMC Feasibility — crystalline form identified, synthetic route ≤8 steps' },
          { key: 'ipPosition', label: 'IP Position — composition-of-matter claims filed, FTO assessed' },
        ];
        const allTppChecked = tppItems.every(t => nominationTpp[t.key]);
        return (
          <>
            <div className="fixed inset-0 bg-black/60 z-50" />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-lg">
                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">Candidate Nomination</h2>
                    <p className="text-sm text-text-muted mt-0.5">{nomSeries.seriesNumber} — {nomSeries.seriesName}</p>
                  </div>
                  <button onClick={() => setNominatingSeriesId(null)} className="p-2 hover:bg-surface-card rounded-lg text-text-muted">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 px-6 pt-4">
                  {(['form', 'esig', 'done'] as const).map((step, i) => (
                    <div key={step} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${nominationStep === step ? 'bg-accent-blue text-white' : i < ['form','esig','done'].indexOf(nominationStep) ? 'bg-accent-green text-white' : 'bg-surface-card text-text-muted'}`}>
                        {i < ['form','esig','done'].indexOf(nominationStep) ? '✓' : i + 1}
                      </div>
                      {i < 2 && <div className="w-12 h-px bg-border" />}
                    </div>
                  ))}
                  <span className="text-xs text-text-muted ml-2">
                    {nominationStep === 'form' ? 'Nomination Form' : nominationStep === 'esig' ? 'Electronic Signature' : 'Complete'}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {nominationStep === 'form' && (
                    <>
                      {/* TPP checklist */}
                      <div>
                        <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">TPP Alignment Checklist</h3>
                        <div className="space-y-2">
                          {tppItems.map(item => (
                            <label key={item.key} className="flex items-start gap-3 cursor-pointer group">
                              <input
                                type="checkbox"
                                checked={nominationTpp[item.key]}
                                onChange={e => setNominationTpp(prev => ({ ...prev, [item.key]: e.target.checked }))}
                                className="mt-0.5 w-4 h-4 rounded border-border accent-accent-blue"
                              />
                              <span className={`text-xs ${nominationTpp[item.key] ? 'text-text-primary' : 'text-text-secondary'}`}>{item.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* ADMET summary */}
                      {nomSeries.admetProfile && (
                        <div className="bg-surface-card border border-border rounded-lg p-3">
                          <div className="text-xs font-semibold text-text-muted mb-2">ADMET Summary (pre-populated)</div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { l: 'Solubility', v: nomSeries.admetProfile.solubility },
                              { l: 'Permeability', v: nomSeries.admetProfile.permeability },
                              { l: 'Met. Stability', v: nomSeries.admetProfile.metabolicStability },
                              { l: 'hERG Margin', v: nomSeries.admetProfile.hERGSafetyMargin },
                              { l: 'Oral F%', v: nomSeries.admetProfile.oralBioavailability },
                              { l: 'Selectivity', v: nomSeries.admetProfile.selectivityIndex },
                            ].map(d => (
                              <div key={d.l} className="text-center">
                                <div className="text-xs text-text-muted">{d.l}</div>
                                <div className={`text-sm font-semibold ${d.v >= 70 ? 'text-accent-green' : d.v >= 45 ? 'text-accent-amber' : 'text-accent-red'}`}>{d.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rationale */}
                      <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">Nomination Rationale *</label>
                        <textarea
                          value={nominationRationale}
                          onChange={e => setNominationRationale(e.target.value)}
                          placeholder="Describe why this series meets the criteria for development candidacy..."
                          rows={3}
                          className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-accent-blue/60"
                        />
                      </div>

                      {/* Scientist name */}
                      <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">Nominating Scientist</label>
                        <input
                          type="text"
                          value={nominationScientist}
                          onChange={e => setNominationScientist(e.target.value)}
                          placeholder="Dr. ..."
                          className="w-full bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue/60"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setNominatingSeriesId(null)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
                        <button
                          onClick={() => setNominationStep('esig')}
                          disabled={!allTppChecked || !nominationRationale.trim()}
                          className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                        >
                          Continue to E-Signature
                        </button>
                      </div>
                    </>
                  )}

                  {nominationStep === 'esig' && (
                    <>
                      <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="w-4 h-4 text-accent-blue" />
                          <span className="text-sm font-semibold text-text-primary">Electronic Signature Required</span>
                        </div>
                        <p className="text-xs text-text-secondary">In accordance with 21 CFR Part 11, your electronic signature confirms that the information provided is accurate and that you are authorised to nominate this compound as a development candidate.</p>
                      </div>
                      <div>
                        <div className="text-xs text-text-muted mb-1">Role: <span className="text-text-primary font-medium">Lead Scientist</span></div>
                        <div className="text-xs text-text-muted mb-1">Date: <span className="text-text-primary">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                        <div className="text-xs text-text-muted mb-1">Meaning: <span className="text-text-primary">I confirm this nomination meets all TPP criteria and the ADMET data supports progression.</span></div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-text-muted block mb-1">PIN (Lead Scientist)</label>
                        <input
                          type="password"
                          value={nominationPin}
                          onChange={e => { setNominationPin(e.target.value); setNominationPinError(''); }}
                          placeholder="Enter 4-digit PIN"
                          maxLength={4}
                          className={`w-full bg-surface-card border rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none ${nominationPinError ? 'border-accent-red' : 'border-border focus:border-accent-blue/60'}`}
                        />
                        {nominationPinError && <p className="text-xs text-accent-red mt-1">{nominationPinError}</p>}
                      </div>
                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setNominationStep('form')} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">Back</button>
                        <button
                          onClick={handleNominationConfirm}
                          disabled={nominationPin.length !== 4}
                          className="flex-1 px-4 py-2 bg-accent-green text-white rounded-lg text-sm hover:bg-accent-green/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          <Lock className="w-4 h-4" />Confirm Nomination
                        </button>
                      </div>
                    </>
                  )}

                  {nominationStep === 'done' && (
                    <div className="text-center py-6">
                      <div className="w-16 h-16 bg-accent-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-accent-green" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">Nomination Confirmed</h3>
                      <p className="text-sm text-text-muted">{nomSeries.seriesNumber} has been nominated as the Development Candidate. Audit record written.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* v155: Research Create Modals */}
      {/* v156: Wired to actual handlers that add to state */}
      <NewTargetModal 
        isOpen={showNewTargetModal} 
        onClose={() => setShowNewTargetModal(false)} 
        onCreate={handleCreateTarget} 
      />
      <NewPreclinicalStudyModal 
        isOpen={showNewStudyModal} 
        onClose={() => setShowNewStudyModal(false)} 
        onCreate={handleCreateStudy} 
      />

      {/* v157: Edit/Delete Modals */}
      <EditTargetModal
        isOpen={!!editingTarget}
        onClose={() => setEditingTarget(null)}
        onSave={handleUpdateTarget}
        target={editingTarget}
      />
      <EditStudyModal
        isOpen={!!editingStudy}
        onClose={() => setEditingStudy(null)}
        onSave={handleUpdateStudy}
        study={editingStudy}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingTarget}
        onClose={() => setDeletingTarget(null)}
        onConfirm={() => deletingTarget && handleDeleteTarget(deletingTarget)}
        itemType="Target"
        itemName={deletingTarget?.target || ''}
      />
      <ConfirmDeleteModal
        isOpen={!!deletingStudy}
        onClose={() => setDeletingStudy(null)}
        onConfirm={() => deletingStudy && handleDeleteStudy(deletingStudy)}
        itemType="Study"
        itemName={deletingStudy?.studyNumber || ''}
      />
    </div>
  );
}
