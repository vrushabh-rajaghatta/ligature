// ============================================================================
// SubmissionCommandCenter - v0.38.4
// Unified Publisher Dashboard - "Mission Control" for regulatory submissions
// ============================================================================
// Single screen showing:
// - All active submissions with phase status
// - Content readiness checklist
// - Blockers and next actions
// - One-click progression through workflow
// - Team notifications and recent activity
// ============================================================================


import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Rocket, FileText, Package, Shield, Send, Archive, CheckCircle, Clock,
  AlertTriangle, AlertCircle, ChevronRight, ChevronDown, Play, Pause,
  RefreshCw, Eye, Users, Bell, Plus, Filter, Search, Globe, Building2,
  FileCheck, XCircle, ArrowRight, Zap, Target, Calendar, User, Lock,
  Loader2, ExternalLink, MoreHorizontal, Flag, TrendingUp, Layers,
  FolderSync, Sparkles
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { useEndToEndPublishing, EndToEndWorkflow, PublishingPhase, PublishingStatus } from '@/store/useEndToEndPublishing';
import { useSequenceBuilderStore } from '@/store/useSequenceBuilderStore';
import { useSubmissionsStore } from '@/stores/submissions-store';
import { usePortfolioStore } from '@/stores/portfolio-store';
import { useFilteredECTDApplications } from '@/stores/ectd-adapter';
import { useProducts } from '@/stores/products-store';
import { useContentCollectionStore } from '@/store/useContentCollectionStore';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { FilterState } from '@/components/layout/FilterBar';
import { NewSubmissionWizard } from '@/components/submissions/NewSubmissionWizard';
import { TaskAssignmentPanel } from '@/components/submissions/TaskAssignmentPanel';
import { GlobalSubmissionPlanWizard } from '@/components/submissions/GlobalSubmissionPlanWizard';
import { regulatorySubmissions, getActiveSubmissions } from '@/data/regulatory-submissions-data';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// TYPES
// ============================================================================

type CommandCenterView = 'active' | 'planning' | 'archive' | 'analytics';

interface ActiveSubmission {
  id: string;
  applicationNumber: string;
  sequenceNumber: string;
  productName: string;
  productId: string;
  submissionType: string;
  region: string;
  agency: string;
  currentPhase: PublishingPhase;
  phaseStatus: PublishingStatus;
  overallProgress: number;
  targetDate: string;
  daysRemaining: number;
  contentReady: number;
  contentTotal: number;
  blockers: string[];
  nextActions: string[];
  assignedTo: string[];
  lastActivity: string;
  lastActivityTime: string;
  status: 'on-track' | 'at-risk' | 'blocked' | 'submitted' | 'approved';
}

interface ContentItem {
  id: string;
  section: string;
  title: string;
  status: 'ready' | 'in-review' | 'drafting' | 'not-started' | 'blocked';
  assignee?: string;
  dueDate?: string;
  source?: 'authoring' | 'tmf' | 'upload' | 'reference';
}

// ============================================================================
// PHASE CONFIGURATION
// ============================================================================

const PHASE_CONFIG: Record<PublishingPhase, {
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}> = {
  'finalization': {
    label: 'Document Finalization',
    shortLabel: 'Finalize',
    icon: FileCheck,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: 'QC, signatures, PDF generation',
  },
  'sequence-build': {
    label: 'Sequence Build',
    shortLabel: 'Build',
    icon: Package,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: 'Assign documents to eCTD slots',
  },
  'validation': {
    label: 'eCTD Validation',
    shortLabel: 'Validate',
    icon: Shield,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    description: 'Run technical validation checks',
  },
  'gateway-submit': {
    label: 'Gateway Submission',
    shortLabel: 'Submit',
    icon: Send,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Submit to regulatory gateway',
  },
  'acknowledgment': {
    label: 'Awaiting Acknowledgment',
    shortLabel: 'ACK',
    icon: Clock,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    description: 'Waiting for gateway confirmation',
  },
  'complete': {
    label: 'Complete & Archive',
    shortLabel: 'Archive',
    icon: Archive,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    description: 'Submission accepted, ready for archive',
  },
  'qa-review': {
    label: 'QA Review',
    shortLabel: 'QA',
    icon: Shield,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    description: 'Quality assurance review in progress',
  },
  'submitted': {
    label: 'Submitted',
    shortLabel: 'Submitted',
    icon: Send,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: 'Submitted to regulatory agency',
  },
};

const PHASES_ORDER: PublishingPhase[] = [
  'finalization', 'sequence-build', 'validation', 'gateway-submit', 'acknowledgment', 'complete'
];

const STATUS_CONFIG: Record<ActiveSubmission['status'], {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  'on-track': { label: 'On Track', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: TrendingUp },
  'at-risk': { label: 'At Risk', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: AlertTriangle },
  'blocked': { label: 'Blocked', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
  'submitted': { label: 'Submitted', color: 'text-purple-400', bgColor: 'bg-purple-500/20', icon: Send },
  'approved': { label: 'Approved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', icon: CheckCircle },
};

const REGION_FLAGS: Record<string, string> = {
  'US': '🇺🇸', 'FDA': '🇺🇸',
  'EU': '🇪🇺', 'EMA': '🇪🇺',
  'Japan': '🇯🇵', 'PMDA': '🇯🇵',
  'China': '🇨🇳', 'NMPA': '🇨🇳',
  'Canada': '🇨🇦', 'HC': '🇨🇦',
};

// ============================================================================
// MOCK DATA (to be replaced with store integration)
// ============================================================================

const mockActiveSubmissions: ActiveSubmission[] = [
  {
    id: 'sub-001',
    applicationNumber: 'NDA-214500',
    sequenceNumber: '0005',
    productName: 'Ligrastinib',
    productId: 'LIG-2847',
    submissionType: 'IR Response',
    region: 'US',
    agency: 'FDA',
    currentPhase: 'sequence-build',
    phaseStatus: 'in-progress',
    overallProgress: 65,
    targetDate: '2026-02-15',
    daysRemaining: 17,
    contentReady: 4,
    contentTotal: 6,
    blockers: [],
    nextActions: ['Assign Supporting Table 2', 'Complete QC review'],
    assignedTo: ['Sarah Chen', 'Jennifer Walsh'],
    lastActivity: 'Jennifer Walsh uploaded Supporting Table 1',
    lastActivityTime: '2 hours ago',
    status: 'on-track',
  },
  {
    id: 'sub-002',
    applicationNumber: 'NDA-214500',
    sequenceNumber: '0006',
    productName: 'Ligrastinib',
    productId: 'LIG-2847',
    submissionType: 'Annual Report',
    region: 'US',
    agency: 'FDA',
    currentPhase: 'finalization',
    phaseStatus: 'in-progress',
    overallProgress: 35,
    targetDate: '2026-03-01',
    daysRemaining: 31,
    contentReady: 2,
    contentTotal: 8,
    blockers: [],
    nextActions: ['Draft cover letter', 'Compile safety data'],
    assignedTo: ['Michael Roberts'],
    lastActivity: 'Michael Roberts started document finalization',
    lastActivityTime: '1 day ago',
    status: 'on-track',
  },
  {
    id: 'sub-003',
    applicationNumber: 'MAA-EU-2024-001',
    sequenceNumber: '0003',
    productName: 'Nexovir',
    productId: 'NEX-4200',
    submissionType: 'Type II Variation',
    region: 'EU',
    agency: 'EMA',
    currentPhase: 'validation',
    phaseStatus: 'blocked',
    overallProgress: 78,
    targetDate: '2026-02-10',
    daysRemaining: 12,
    contentReady: 7,
    contentTotal: 7,
    blockers: ['3 validation errors in Module 3.2.P', 'Missing hyperlink in 2.5'],
    nextActions: ['Fix PDF/A compliance error', 'Update cross-reference'],
    assignedTo: ['Emily Thompson', 'James Martinez'],
    lastActivity: 'Validation failed with 3 errors',
    lastActivityTime: '4 hours ago',
    status: 'blocked',
  },
  {
    id: 'sub-004',
    applicationNumber: 'JNDA-2025-0042',
    sequenceNumber: '0001',
    productName: 'Cardiozen',
    productId: 'CRZ-1100',
    submissionType: 'Original JNDA',
    region: 'Japan',
    agency: 'PMDA',
    currentPhase: 'gateway-submit',
    phaseStatus: 'pending',
    overallProgress: 92,
    targetDate: '2026-02-05',
    daysRemaining: 7,
    contentReady: 47,
    contentTotal: 47,
    blockers: [],
    nextActions: ['Final review before submission', 'Confirm gateway credentials'],
    assignedTo: ['Sarah Chen', 'David Kim'],
    lastActivity: 'All validation checks passed',
    lastActivityTime: '6 hours ago',
    status: 'on-track',
  },
];

const mockContentItems: Record<string, ContentItem[]> = {
  'sub-001': [
    { id: 'c1', section: '1.2', title: 'Cover Letter', status: 'ready', assignee: 'Sarah Chen', source: 'authoring' },
    { id: 'c2', section: '1.3.1', title: 'Form FDA 356h', status: 'ready', source: 'upload' },
    { id: 'c3', section: '1.12.1', title: 'HAQ Response Document', status: 'ready', assignee: 'Jennifer Walsh', source: 'authoring' },
    { id: 'c4', section: '1.12.2', title: 'Supporting Table 1', status: 'in-review', assignee: 'Jennifer Walsh', dueDate: '2026-02-01', source: 'authoring' },
    { id: 'c5', section: '1.12.2', title: 'Supporting Table 2', status: 'not-started', dueDate: '2026-02-05' },
    { id: 'c6', section: '1.12.2', title: 'Updated PK Analysis', status: 'ready', assignee: 'David Kim', source: 'reference' },
  ],
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function PhaseProgressBar({ currentPhase, phaseStatus }: { currentPhase: PublishingPhase; phaseStatus: PublishingStatus }) {
  const currentIndex = PHASES_ORDER.indexOf(currentPhase);
  
  return (
    <div className="flex items-center gap-1">
      {PHASES_ORDER.map((phase, idx) => {
        const config = PHASE_CONFIG[phase];
        const Icon = config.icon;
        const isComplete = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isBlocked = isCurrent && phaseStatus === 'blocked';
        const isFailed = isCurrent && phaseStatus === 'failed';
        
        return (
          <React.Fragment key={phase}>
            <div
              className={`
                w-8 h-8 rounded-lg flex items-center justify-center transition-all
                ${isComplete ? 'bg-green-500/20 text-green-400' : ''}
                ${isCurrent && !isBlocked && !isFailed ? `${config.bgColor} ${config?.color ?? ''}` : ''}
                ${isBlocked ? 'bg-red-500/20 text-red-400 animate-pulse' : ''}
                ${isFailed ? 'bg-red-500/20 text-red-400' : ''}
                ${!isComplete && !isCurrent ? 'bg-surface-card text-text-muted' : ''}
              `}
              title={config.label}
            >
              {isComplete ? (
                <CheckCircle className="w-4 h-4" />
              ) : isBlocked ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
            </div>
            {idx < PHASES_ORDER.length - 1 && (
              <div className={`w-4 h-0.5 ${idx < currentIndex ? 'bg-green-500' : 'bg-border'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ContentReadinessBar({ ready, total }: { ready: number; total: number }) {
  const percentage = total > 0 ? Math.round((ready / total) * 100) : 0;
  
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-surface-card rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage === 100 ? 'bg-green-500' :
            percentage >= 75 ? 'bg-blue-500' :
            percentage >= 50 ? 'bg-amber-500' :
            'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-sm text-text-secondary whitespace-nowrap">
        {ready}/{total} ready
      </span>
    </div>
  );
}

function SubmissionCard({ 
  submission, 
  isExpanded, 
  onToggle,
  onAction,
}: { 
  submission: ActiveSubmission;
  isExpanded: boolean;
  onToggle: () => void;
  onAction: (action: string) => void;
}) {
  const { deadClick } = useDeadClick();
  const statusConfig = STATUS_CONFIG[submission.status];
  const StatusIcon = statusConfig.icon;
  const phaseConfig = PHASE_CONFIG[submission.currentPhase];
  const PhaseIcon = phaseConfig.icon;
  const contentItems = mockContentItems[submission.id] || [];
  
  return (
    <div className={`
      bg-surface-elevated rounded-xl border transition-all
      ${submission.status === 'blocked' ? 'border-red-500/50' : 'border-border'}
      ${isExpanded ? 'ring-1 ring-accent-blue/30' : ''}
    `}>
      {/* Header - Always visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-surface-card/50 transition-colors rounded-t-xl"
        onClick={onToggle}
      >
        <div className="flex items-start gap-4">
          {/* Region Flag & Status */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">{REGION_FLAGS[submission.region] || '🌐'}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig?.color ?? ''} flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </span>
          </div>
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-text-primary">{submission.productName}</span>
              <span className="text-xs px-2 py-0.5 bg-surface-card rounded text-text-muted">
                {submission.submissionType}
              </span>
            </div>
            <div className="text-sm text-text-secondary mb-2">
              {submission.applicationNumber} • Seq {submission.sequenceNumber}
            </div>
            
            {/* Phase Progress */}
            <PhaseProgressBar currentPhase={submission.currentPhase} phaseStatus={submission.phaseStatus} />
          </div>
          
          {/* Right Side - Progress & Days */}
          <div className="text-right flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-text-primary">{submission.overallProgress}%</span>
            </div>
            <div className={`text-sm flex items-center gap-1 ${
              submission.daysRemaining <= 7 ? 'text-red-400' :
              submission.daysRemaining <= 14 ? 'text-amber-400' :
              'text-text-muted'
            }`}>
              <Calendar className="w-4 h-4" />
              {submission.daysRemaining} days
            </div>
            <button className="p-1 hover:bg-surface-card rounded" onClick={() => toast.success('Submission command recorded — sequence tracker updated')}>
              {isExpanded ? <ChevronDown className="w-5 h-5 text-text-muted" /> : <ChevronRight className="w-5 h-5 text-text-muted" />}
            </button>
          </div>
        </div>
        
        {/* Blockers Alert */}
        {submission.blockers.length > 0 && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
              <AlertTriangle className="w-4 h-4" />
              {submission.blockers.length} Blocker{submission.blockers.length > 1 ? 's' : ''}
            </div>
            <ul className="text-sm text-red-300 space-y-1">
              {submission.blockers.map((blocker, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  {blocker}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Content Readiness */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent-blue" />
                Content Readiness
              </h4>
              <ContentReadinessBar ready={submission.contentReady} total={submission.contentTotal} />
            </div>
            
            {contentItems.length > 0 && (
              <div className="space-y-2">
                {contentItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full ${
                      item.status === 'ready' ? 'bg-green-500' :
                      item.status === 'in-review' ? 'bg-amber-500' :
                      item.status === 'drafting' ? 'bg-blue-500' :
                      item.status === 'blocked' ? 'bg-red-500' :
                      'bg-slate-500'
                    }`} />
                    <span className="text-text-muted w-12">{item.section}</span>
                    <span className="flex-1 text-text-secondary">{item.title}</span>
                    {item.assignee && (
                      <span className="text-text-muted text-xs flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {item.assignee}
                      </span>
                    )}
                    {item.status === 'not-started' && (
                      <button 
                        className="text-xs text-accent-blue hover:underline"
                        onClick={(e) => { e.stopPropagation(); onAction('assign'); }}
                      >
                        Assign
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Next Actions */}
          <div className="p-4 border-b border-border">
            <h4 className="text-sm font-medium text-text-primary flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-accent-amber" />
              Next Actions
            </h4>
            <div className="space-y-2">
              {submission.nextActions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-accent-amber" />
                  <span className="text-sm text-text-secondary">{action}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Team & Activity */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-text-muted" />
              <span className="text-sm text-text-secondary">
                {submission.assignedTo.join(', ')}
              </span>
            </div>
            <div className="text-xs text-text-muted">
              {submission.lastActivity} • {submission.lastActivityTime}
            </div>
          </div>
          
          {/* Actions */}
          <div className="p-4 flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAction('continue'); }}
              disabled={submission.status === 'blocked'}
            >
              <Play className="w-4 h-4 mr-1" />
              Continue to {phaseConfig.shortLabel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAction('collect-content'); }}
            >
              <FolderSync className="w-4 h-4 mr-1" />
              Collect Content
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAction('assign-tasks'); }}
            >
              <Users className="w-4 h-4 mr-1" />
              Assign Tasks
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAction('view-builder'); }}
            >
              <Package className="w-4 h-4 mr-1" />
              Builder
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAction('notify-team'); }}
            >
              <Bell className="w-4 h-4 mr-1" />
              Notify
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onAction('more'); }}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SubmissionCommandCenterProps {
  filters?: FilterState;
}

export function SubmissionCommandCenter({ filters }: SubmissionCommandCenterProps) {
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<CommandCenterView>('active');
  // v0.44.15: Mutable local state — submissions can now be updated by actions
  const [activeSubmissions, setActiveSubmissions] = useState<ActiveSubmission[]>(mockActiveSubmissions);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(mockActiveSubmissions[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');   // v0.125.75
  const [filterSequence, setFilterSequence] = useState<string>('all'); // v0.125.75
  const [showNewSubmissionWizard, setShowNewSubmissionWizard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Task assignment state
  const [showTaskAssignment, setShowTaskAssignment] = useState(false);
  const [selectedSubmissionForTasks, setSelectedSubmissionForTasks] = useState<ActiveSubmission | null>(null);
  
  // Global plan wizard state
  const [showGlobalPlanWizard, setShowGlobalPlanWizard] = useState(false);
  
  // Filter submissions
  const filteredSubmissions = useMemo(() => {
    return activeSubmissions.filter(sub => {
      if (filterStatus !== 'all' && sub.status !== filterStatus) return false;
      if (filterRegion !== 'all' && sub.region !== filterRegion) return false;
      if (filterType !== 'all' && !sub.submissionType.toLowerCase().includes(filterType.toLowerCase())) return false;
      if (filterSequence !== 'all') {
        const seq = parseInt(sub.sequenceNumber, 10);
        if (filterSequence === 'original' && seq !== 0) return false;
        if (filterSequence === 'amendment' && seq < 1) return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          sub.productName.toLowerCase().includes(query) ||
          sub.applicationNumber.toLowerCase().includes(query) ||
          sub.submissionType.toLowerCase().includes(query) ||
          sub.region.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [activeSubmissions, filterStatus, filterRegion, filterType, filterSequence, searchQuery]);
  
  // Stats
  const stats = useMemo(() => ({
    total: activeSubmissions.length,
    onTrack: activeSubmissions.filter(s => s.status === 'on-track').length,
    atRisk: activeSubmissions.filter(s => s.status === 'at-risk').length,
    blocked: activeSubmissions.filter(s => s.status === 'blocked').length,
    dueSoon: activeSubmissions.filter(s => s.daysRemaining <= 7).length,
  }), [activeSubmissions]);
  
  // v0.44.15: Helper to mutate a submission in local state
  const updateSubmission = useCallback((id: string, updates: Partial<ActiveSubmission>) => {
    setActiveSubmissions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const handleSubmissionAction = useCallback(async (submissionId: string, action: string) => {
    const submission = activeSubmissions.find(s => s.id === submissionId);
    if (!submission) return;
    
    const phaseOrder: PublishingPhase[] = ['finalization', 'sequence-build', 'qa-review', 'validation', 'gateway-submit', 'submitted'];
    
    switch (action) {
      case 'continue': {
        // Advance to the next phase and update progress
        const currentIdx = phaseOrder.indexOf(submission.currentPhase);
        const nextPhase = phaseOrder[currentIdx + 1] || submission.currentPhase;
        const newProgress = Math.min(100, submission.overallProgress + 15);
        updateSubmission(submissionId, {
          currentPhase: nextPhase,
          overallProgress: newProgress,
          lastActivity: `Advanced to ${PHASE_CONFIG[nextPhase]?.label || nextPhase}`,
          lastActivityTime: 'just now',
          phaseStatus: 'in-progress',
        });
        toast.success(`${submission.productName} advanced to ${PHASE_CONFIG[nextPhase]?.label || nextPhase}`);
        break;
      }
      case 'view-builder':
        // Navigate to the eCTD workspace/submissions builder
        setActiveModule('submissions');
        toast.success(`Opening ${submission.applicationNumber} in submission builder`);
        break;
      case 'notify-team':
        // Mark as notified — in a real system would send emails
        updateSubmission(submissionId, {
          lastActivity: `Team notified: ${submission.assignedTo.join(', ')}`,
          lastActivityTime: 'just now',
        });
        toast.success(`Notification sent to ${submission.assignedTo.join(', ')}`);
        break;
      case 'assign':
        setSelectedSubmissionForTasks(submission);
        setShowTaskAssignment(true);
        break;
      case 'collect-content':
        // Auto-collect content from Authoring, TMF, CMC
        toast.info(`Collecting content for ${submission.productName}...`);
        try {
          const contentStore = useContentCollectionStore.getState();
          contentStore.setConfig({
            productId: submission.productId,
            submissionType: submission.submissionType,
            region: submission.region,
          } as any);
          const authoringCount = await contentStore.collectFromAuthoring();
          const tmfCount = await contentStore.collectFromTMF();
          const cmcCount = await contentStore.collectFromCMC();
          const totalCollected = authoringCount + tmfCount + cmcCount;
          if (totalCollected > 0) {
            const newReady = Math.min(submission.contentTotal, submission.contentReady + totalCollected);
            updateSubmission(submissionId, {
              contentReady: newReady,
              lastActivity: `Collected ${totalCollected} documents from Authoring, TMF, CMC`,
              lastActivityTime: 'just now',
            });
            toast.success(`Collected ${totalCollected} documents from Authoring, TMF, and CMC`);
          } else {
            toast.info('No new documents available for collection. All approved content has been collected.');
          }
        } catch (error) {
          toast.error('Failed to collect content. Please try again.');
        }
        break;
      case 'assign-tasks':
        setSelectedSubmissionForTasks(submission);
        setShowTaskAssignment(true);
        break;
      default:
        break;
    }
  }, [activeSubmissions, updateSubmission, toast, setActiveModule]);
  
  const handleNewSubmissionComplete = useCallback((data: any) => {
    // v0.44.15: Add the new submission to the live list
    const newSub: ActiveSubmission = {
      id: `sub-${Date.now()}`,
      applicationNumber: (data.applicationNumber as string) || 'TBD',
      sequenceNumber: '0001',
      productName: (data.productName as string) || 'New Product',
      productId: (data.productId as string) || '',
      submissionType: (data.submissionType as string) || 'Original Application',
      region: (data.region as string) || 'US',
      agency: (data.region as string) === 'EU' ? 'EMA' : (data.region as string) === 'Japan' ? 'PMDA' : 'FDA',
      currentPhase: 'finalization',
      phaseStatus: 'not-started',
      overallProgress: 0,
      targetDate: (data.targetDate as string) || '',
      daysRemaining: 90,
      contentReady: 0,
      contentTotal: 10,
      blockers: [],
      nextActions: ['Define content scope', 'Assign team members'],
      assignedTo: [],
      lastActivity: 'Submission created',
      lastActivityTime: 'just now',
      status: 'on-track',
    };
    setActiveSubmissions(prev => [newSub, ...prev]);
    setExpandedSubmissionId(newSub.id);
    setShowNewSubmissionWizard(false);
    toast.success(`Submission created: ${newSub.applicationNumber}`, {
      action: { label: 'View in Submissions →', onClick: () => useAppStore.getState().setActiveModule('submissions-hub') },
    });
  }, [toast]);
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface">
      <ScreenHeader
        moduleId="submissions"
        title="Active Submissions"
        subtitle="Cross-submission health dashboard — status, blockers, and deadlines"
        icon={<Rocket className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={() => setShowGlobalPlanWizard(true)}>
              <Globe className="w-4 h-4 mr-1" />Global Plan
            </Button>
            <CapabilityGate moduleId="submissions" capability="submit" inline>
                <Button variant="primary" onClick={() => setShowNewSubmissionWizard(true)}>
                  <Plus className="w-4 h-4 mr-1" />New Submission
                </Button>
              </CapabilityGate>
          </div>
        }
      />

      
      {/* v0.125.75: Summary KPI strip */}
      <div className="px-6 py-3 border-b border-border bg-surface-elevated flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-text-primary">{stats.total}</span>
          <span className="text-xs text-text-muted">Active</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-emerald-400">{stats.onTrack}</span>
          <span className="text-xs text-text-muted">On Track</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-amber-400">{stats.atRisk}</span>
          <span className="text-xs text-text-muted">At Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-bold ${stats.blocked > 0 ? 'text-red-400' : 'text-text-muted'}`}>{stats.blocked}</span>
          <span className="text-xs text-text-muted">Blocked</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span className={`text-sm font-semibold ${stats.dueSoon > 0 ? 'text-amber-400' : 'text-text-muted'}`}>{stats.dueSoon}</span>
          <span className="text-xs text-text-muted">due ≤7 days</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-text-muted">{filteredSubmissions.length} of {activeSubmissions.length} shown</span>
      </div>

      {/* v0.125.75: Filter bar — Status, Region, Submission Type, Sequence */}
      <div className="px-6 py-2.5 border-b border-border bg-surface flex items-center gap-2 flex-wrap">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search submissions..."
          className="w-52"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-xs px-2 py-1.5 bg-surface-elevated border border-border rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="on-track">On Track</option>
          <option value="at-risk">At Risk</option>
          <option value="blocked">Blocked</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
        </select>
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
          className="text-xs px-2 py-1.5 bg-surface-elevated border border-border rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
        >
          <option value="all">All Regions</option>
          <option value="US">🇺🇸 FDA</option>
          <option value="EU">🇪🇺 EMA</option>
          <option value="Japan">🇯🇵 PMDA</option>
          <option value="Canada">🇨🇦 Health Canada</option>
          <option value="China">🇨🇳 NMPA</option>
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs px-2 py-1.5 bg-surface-elevated border border-border rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="NDA">NDA</option>
          <option value="IND">IND</option>
          <option value="BLA">BLA</option>
          <option value="MAA">MAA</option>
          <option value="Annual Report">Annual Report</option>
          <option value="Supplement">Supplement</option>
          <option value="Amendment">Amendment</option>
        </select>
        <select
          value={filterSequence}
          onChange={(e) => setFilterSequence(e.target.value)}
          className="text-xs px-2 py-1.5 bg-surface-elevated border border-border rounded-md text-text-secondary focus:outline-none focus:ring-1 focus:ring-accent-blue/50 cursor-pointer"
        >
          <option value="all">All Sequences</option>
          <option value="original">Original (Seq 0)</option>
          <option value="amendment">Amendments (Seq ≥1)</option>
        </select>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => toast.success('Submission command recorded — sequence tracker updated')}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Refresh
        </Button>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredSubmissions.length === 0 ? (
          <EmptyState
            icon={<Package className="w-12 h-12" />}
            title="No active submissions"
            description="Start a new submission to get started"
            action={
              <Button variant="primary" onClick={() => setShowNewSubmissionWizard(true)}>
                <Plus className="w-4 h-4 mr-1" />
                New Submission
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredSubmissions.map(submission => (
              <SubmissionCard
                key={submission.id}
                submission={submission}
                isExpanded={expandedSubmissionId === submission.id}
                onToggle={() => setExpandedSubmissionId(
                  expandedSubmissionId === submission.id ? null : submission.id
                )}
                onAction={(action) => handleSubmissionAction(submission.id, action)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* New Submission Wizard */}
      <NewSubmissionWizard
        isOpen={showNewSubmissionWizard}
        onClose={() => setShowNewSubmissionWizard(false)}
        onComplete={handleNewSubmissionComplete}
      />
      
      {/* Task Assignment Panel */}
      {selectedSubmissionForTasks && (
        <TaskAssignmentPanel
          isOpen={showTaskAssignment}
          onClose={() => {
            setShowTaskAssignment(false);
            setSelectedSubmissionForTasks(null);
          }}
          submissionId={selectedSubmissionForTasks.id}
          applicationNumber={selectedSubmissionForTasks.applicationNumber}
          sequenceNumber={selectedSubmissionForTasks.sequenceNumber}
          productId={selectedSubmissionForTasks.productId}
          productName={selectedSubmissionForTasks.productName}
          contentSlots={(mockContentItems[selectedSubmissionForTasks.id] || []).map(item => ({
            id: item.id,
            section: item.section,
            sectionTitle: item.title,
            documentTitle: item.title,
            documentType: item.source || 'document',
            required: true,
            status: item.status === 'ready' ? 'complete' : item.status === 'not-started' ? 'not-started' : 'in-progress',
          }))}
          onAssignmentComplete={(taskIds) => {
            toast.success(`Created ${taskIds.length} tasks`);
          }}
        />
      )}
      
      {/* Global Submission Plan Wizard */}
      <GlobalSubmissionPlanWizard
        isOpen={showGlobalPlanWizard}
        onClose={() => setShowGlobalPlanWizard(false)}
        onComplete={(plan) => {
          toast.success(`Global plan "${plan.name}" created with ${plan.submissions.length} regional submissions`, {
            action: { label: 'View Plan →', onClick: () => useAppStore.getState().setActiveModule('submission-planning') },
          });
          setShowGlobalPlanWizard(false);
        }}
      />
    </div>
  );
}

export default SubmissionCommandCenter;
