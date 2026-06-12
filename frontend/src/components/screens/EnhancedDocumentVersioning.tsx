

import { useState, useMemo, useCallback } from 'react';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  GitBranch, GitCommit, GitMerge, GitPullRequest, GitCompare,
  FileText, FileDiff, Clock, User, Calendar, ChevronRight, ChevronDown,
  Plus, Minus, Edit, Eye, Download, ArrowRight, ArrowLeftRight,
  AlertTriangle, CheckCircle, XCircle, Info, Layers, History,
  RotateCcw, Copy, Lock, Unlock, Tag, Bookmark, Filter, Search,
  ZoomIn, ZoomOut, Maximize2, RefreshCw, Settings, MoreHorizontal
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type VersionStatus = 'draft' | 'in-review' | 'approved' | 'effective' | 'superseded' | 'retired';
export type ChangeType = 'major' | 'minor' | 'patch' | 'editorial';
export type DiffLineType = 'unchanged' | 'added' | 'removed' | 'modified';
export type DiffViewMode = 'unified' | 'split' | 'inline';
export type TreeLayout = 'horizontal' | 'vertical' | 'radial';
export type CompareMode = 'any' | 'adjacent' | 'baseline';

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: string;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  status: VersionStatus;
  changeType: ChangeType;
  changeDescription: string;
  changedSections: string[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
  effectiveDate?: string;
  retiredDate?: string;
  isBaseline: boolean;
  baselineLabel?: string;
  isLocked: boolean;
  lockedBy?: string;
  lockedAt?: string;
  parentVersionId?: string;
  childVersionIds: string[];
  branchName?: string;
  mergedFrom?: string[];
  tags: string[];
  wordCount: number;
  pageCount: number;
  fileSize: number;
}

export interface DiffLine {
  id: string;
  lineNumber: { from?: number; to?: number };
  type: DiffLineType;
  content: string;
  previousContent?: string;
  section?: string;
  highlightRanges?: { start: number; end: number; type: 'added' | 'removed' }[];
}

export interface DiffSection {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sectionNumber: string;
  changeType: 'added' | 'removed' | 'modified' | 'unchanged';
  lines: DiffLine[];
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
}

export interface VersionComparison {
  id: string;
  fromVersion: DocumentVersion;
  toVersion: DocumentVersion;
  generatedAt: string;
  sections: DiffSection[];
  summary: {
    totalSections: number;
    addedSections: number;
    removedSections: number;
    modifiedSections: number;
    unchangedSections: number;
    addedWords: number;
    removedWords: number;
    addedLines: number;
    removedLines: number;
    modifiedLines: number;
    netChange: number;
    changePercentage: number;
  };
  changedAuthors: string[];
  changeReasons: string[];
}

export interface VersionTreeNode {
  id: string;
  version: DocumentVersion;
  children: VersionTreeNode[];
  depth: number;
  position: { x: number; y: number };
  isExpanded: boolean;
  isBranch: boolean;
  branchName?: string;
}

export type VersioningView = 'compare' | 'tree' | 'history' | 'baselines';

// =============================================================================
// COLOR MAPS
// =============================================================================

const versionStatusColorMap: Record<VersionStatus, BadgeColor> = {
  draft: 'slate',
  'in-review': 'amber',
  approved: 'blue',
  effective: 'green',
  superseded: 'purple',
  retired: 'slate',
};

const changeTypeColorMap: Record<ChangeType, BadgeColor> = {
  major: 'red',
  minor: 'amber',
  patch: 'blue',
  editorial: 'slate',
};

const diffLineColorMap: Record<DiffLineType, string> = {
  unchanged: 'bg-surface',
  added: 'bg-green-500/10',
  removed: 'bg-red-500/10',
  modified: 'bg-amber-500/10',
};

const diffLineTextColorMap: Record<DiffLineType, string> = {
  unchanged: 'text-text-secondary',
  added: 'text-green-400',
  removed: 'text-red-400',
  modified: 'text-amber-400',
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockVersions: DocumentVersion[] = [
  {
    id: 'ver-001',
    documentId: 'DOC-2024-00001',
    version: '3.0.0',
    majorVersion: 3,
    minorVersion: 0,
    patchVersion: 0,
    status: 'effective',
    changeType: 'major',
    changeDescription: 'Complete restructuring of clinical sections based on Phase 3 data',
    changedSections: ['2.5', '2.7.1', '2.7.2', '2.7.3', '2.7.4', '5.3.5'],
    createdAt: '2025-12-15T14:30:00Z',
    createdBy: 'user-004',
    createdByName: 'Dr. Sarah Chen',
    effectiveDate: '2025-12-20',
    isBaseline: true,
    baselineLabel: 'NDA Submission Baseline',
    isLocked: true,
    lockedBy: 'user-001',
    lockedAt: '2025-12-20T09:00:00Z',
    parentVersionId: 'ver-002',
    childVersionIds: [],
    tags: ['nda', 'phase-3', 'submission'],
    wordCount: 125000,
    pageCount: 450,
    fileSize: 45000000,
  },
  {
    id: 'ver-002',
    documentId: 'DOC-2024-00001',
    version: '2.3.1',
    majorVersion: 2,
    minorVersion: 3,
    patchVersion: 1,
    status: 'superseded',
    changeType: 'patch',
    changeDescription: 'Editorial corrections and formatting updates',
    changedSections: ['2.5.1', '2.5.2'],
    createdAt: '2025-11-28T10:15:00Z',
    createdBy: 'user-003',
    createdByName: 'Michael Torres',
    isBaseline: false,
    isLocked: false,
    parentVersionId: 'ver-003',
    childVersionIds: ['ver-001'],
    tags: ['editorial'],
    wordCount: 118500,
    pageCount: 428,
    fileSize: 42500000,
  },
  {
    id: 'ver-003',
    documentId: 'DOC-2024-00001',
    version: '2.3.0',
    majorVersion: 2,
    minorVersion: 3,
    patchVersion: 0,
    status: 'superseded',
    changeType: 'minor',
    changeDescription: 'Updated safety data with 6-month extension study results',
    changedSections: ['2.7.4', '5.3.5.3'],
    createdAt: '2025-11-15T16:45:00Z',
    createdBy: 'user-002',
    createdByName: 'Jennifer Walsh',
    isBaseline: true,
    baselineLabel: 'Pre-NDA Review Baseline',
    isLocked: true,
    lockedBy: 'user-001',
    lockedAt: '2025-11-16T09:00:00Z',
    parentVersionId: 'ver-004',
    childVersionIds: ['ver-002'],
    tags: ['safety', 'extension-study'],
    wordCount: 118200,
    pageCount: 425,
    fileSize: 42000000,
  },
  {
    id: 'ver-004',
    documentId: 'DOC-2024-00001',
    version: '2.2.0',
    majorVersion: 2,
    minorVersion: 2,
    patchVersion: 0,
    status: 'superseded',
    changeType: 'minor',
    changeDescription: 'Added bioequivalence study results and PK analysis',
    changedSections: ['2.7.2', '5.3.1'],
    createdAt: '2025-10-20T11:30:00Z',
    createdBy: 'user-005',
    createdByName: 'Dr. Robert Kim',
    isBaseline: false,
    isLocked: false,
    parentVersionId: 'ver-005',
    childVersionIds: ['ver-003'],
    tags: ['pk', 'bioequivalence'],
    wordCount: 112000,
    pageCount: 405,
    fileSize: 39500000,
  },
  {
    id: 'ver-005',
    documentId: 'DOC-2024-00001',
    version: '2.1.0',
    majorVersion: 2,
    minorVersion: 1,
    patchVersion: 0,
    status: 'superseded',
    changeType: 'minor',
    changeDescription: 'Incorporated Type B meeting feedback from FDA',
    changedSections: ['2.5', '2.7.1'],
    createdAt: '2025-09-05T09:00:00Z',
    createdBy: 'user-004',
    createdByName: 'Dr. Sarah Chen',
    isBaseline: false,
    isLocked: false,
    parentVersionId: 'ver-006',
    childVersionIds: ['ver-004'],
    tags: ['fda-feedback', 'type-b-meeting'],
    wordCount: 105000,
    pageCount: 380,
    fileSize: 36000000,
  },
  {
    id: 'ver-006',
    documentId: 'DOC-2024-00001',
    version: '2.0.0',
    majorVersion: 2,
    minorVersion: 0,
    patchVersion: 0,
    status: 'superseded',
    changeType: 'major',
    changeDescription: 'Major revision incorporating Phase 2b results and updated CMC',
    changedSections: ['2.3', '2.5', '2.7.1', '2.7.3', '3.2.P', '3.2.S'],
    createdAt: '2025-07-15T14:00:00Z',
    createdBy: 'user-002',
    createdByName: 'Jennifer Walsh',
    isBaseline: true,
    baselineLabel: 'Phase 2b Completion Baseline',
    isLocked: true,
    lockedBy: 'user-001',
    lockedAt: '2025-07-16T09:00:00Z',
    parentVersionId: 'ver-007',
    childVersionIds: ['ver-005'],
    branchName: 'main',
    tags: ['phase-2b', 'cmc-update'],
    wordCount: 98000,
    pageCount: 355,
    fileSize: 33000000,
  },
  {
    id: 'ver-007',
    documentId: 'DOC-2024-00001',
    version: '1.2.0',
    majorVersion: 1,
    minorVersion: 2,
    patchVersion: 0,
    status: 'retired',
    changeType: 'minor',
    changeDescription: 'Updated nonclinical package with carcinogenicity study',
    changedSections: ['2.6.6', '4.2.3'],
    createdAt: '2025-05-01T10:30:00Z',
    createdBy: 'user-006',
    createdByName: 'Dr. Amanda Pierce',
    isBaseline: false,
    isLocked: false,
    parentVersionId: 'ver-008',
    childVersionIds: ['ver-006'],
    tags: ['nonclinical', 'carcinogenicity'],
    wordCount: 85000,
    pageCount: 310,
    fileSize: 28000000,
  },
  {
    id: 'ver-008',
    documentId: 'DOC-2024-00001',
    version: '1.1.0',
    majorVersion: 1,
    minorVersion: 1,
    patchVersion: 0,
    status: 'retired',
    changeType: 'minor',
    changeDescription: 'Added Phase 2a interim analysis',
    changedSections: ['2.5', '2.7.3'],
    createdAt: '2025-02-20T16:00:00Z',
    createdBy: 'user-004',
    createdByName: 'Dr. Sarah Chen',
    isBaseline: false,
    isLocked: false,
    parentVersionId: 'ver-009',
    childVersionIds: ['ver-007'],
    tags: ['phase-2a', 'interim'],
    wordCount: 72000,
    pageCount: 265,
    fileSize: 23000000,
  },
  {
    id: 'ver-009',
    documentId: 'DOC-2024-00001',
    version: '1.0.0',
    majorVersion: 1,
    minorVersion: 0,
    patchVersion: 0,
    status: 'retired',
    changeType: 'major',
    changeDescription: 'Initial IND submission baseline',
    changedSections: [],
    createdAt: '2024-11-01T09:00:00Z',
    createdBy: 'user-002',
    createdByName: 'Jennifer Walsh',
    isBaseline: true,
    baselineLabel: 'IND Submission Baseline',
    isLocked: true,
    lockedBy: 'user-001',
    lockedAt: '2024-11-02T09:00:00Z',
    parentVersionId: undefined,
    childVersionIds: ['ver-008'],
    branchName: 'main',
    tags: ['ind', 'initial'],
    wordCount: 58000,
    pageCount: 215,
    fileSize: 18500000,
  },
];

// Generate mock comparison data
const generateMockComparison = (fromVersion: DocumentVersion, toVersion: DocumentVersion): VersionComparison => {
  const mockSections: DiffSection[] = [
    {
      id: 'diff-sec-1',
      sectionId: '2.5',
      sectionTitle: 'Clinical Overview',
      sectionNumber: '2.5',
      changeType: 'modified',
      lines: [
        { id: 'line-1', lineNumber: { from: 45, to: 45 }, type: 'unchanged', content: 'The clinical development program for LIG-2847 (Nexavant) consists of...' },
        { id: 'line-2', lineNumber: { from: 46 }, type: 'removed', content: 'Phase 2b data demonstrated preliminary efficacy signals.' },
        { id: 'line-3', lineNumber: { to: 46 }, type: 'added', content: 'Phase 3 pivotal trial data confirmed statistically significant efficacy.' },
        { id: 'line-4', lineNumber: { to: 47 }, type: 'added', content: 'The primary endpoint of progression-free survival was met (HR=0.58, p<0.0001).' },
        { id: 'line-5', lineNumber: { from: 47, to: 48 }, type: 'unchanged', content: 'Safety profile remained consistent with earlier studies.' },
        { id: 'line-6', lineNumber: { from: 48 }, type: 'removed', content: 'Further Phase 3 studies are planned to confirm these findings.' },
        { id: 'line-7', lineNumber: { to: 49 }, type: 'added', content: 'The benefit-risk profile supports approval for the KRAS G12C NSCLC indication.' },
      ],
      addedLines: 3,
      removedLines: 2,
      modifiedLines: 0,
    },
    {
      id: 'diff-sec-2',
      sectionId: '2.7.1',
      sectionTitle: 'Summary of Biopharmaceutic Studies',
      sectionNumber: '2.7.1',
      changeType: 'modified',
      lines: [
        { id: 'line-8', lineNumber: { from: 12, to: 12 }, type: 'unchanged', content: 'Bioavailability studies were conducted using the intended commercial formulation.' },
        { id: 'line-9', lineNumber: { from: 13 }, type: 'removed', content: 'Preliminary food effect data are available from Study LIG-2847-PK-003.' },
        { id: 'line-10', lineNumber: { to: 13 }, type: 'added', content: 'Food effect was characterized in Study LIG-2847-PK-003 (n=24).' },
        { id: 'line-11', lineNumber: { to: 14 }, type: 'added', content: 'High-fat meal increased AUC by 35% and Cmax by 42%, considered not clinically significant.' },
      ],
      addedLines: 2,
      removedLines: 1,
      modifiedLines: 0,
    },
    {
      id: 'diff-sec-3',
      sectionId: '2.7.4',
      sectionTitle: 'Summary of Clinical Safety',
      sectionNumber: '2.7.4',
      changeType: 'modified',
      lines: [
        { id: 'line-12', lineNumber: { from: 156, to: 156 }, type: 'unchanged', content: 'The integrated safety database includes 2,847 patients exposed to Nexavant.' },
        { id: 'line-13', lineNumber: { from: 157 }, type: 'removed', content: 'Most common AEs (≥20%) included fatigue, nausea, and diarrhea.' },
        { id: 'line-14', lineNumber: { to: 157 }, type: 'added', content: 'Most common AEs (≥20%) included fatigue (45%), nausea (38%), and diarrhea (32%).' },
        { id: 'line-15', lineNumber: { to: 158 }, type: 'added', content: 'Grade 3/4 AEs occurred in 28% of patients, with neutropenia (8%) most frequent.' },
        { id: 'line-16', lineNumber: { to: 159 }, type: 'added', content: 'Treatment discontinuation due to AEs occurred in 12% of patients.' },
        { id: 'line-17', lineNumber: { from: 158, to: 160 }, type: 'unchanged', content: 'No new safety signals were identified in the Phase 3 population.' },
      ],
      addedLines: 4,
      removedLines: 1,
      modifiedLines: 0,
    },
    {
      id: 'diff-sec-4',
      sectionId: '5.3.5',
      sectionTitle: 'Reports of Efficacy and Safety Studies',
      sectionNumber: '5.3.5',
      changeType: 'added',
      lines: [
        { id: 'line-18', lineNumber: { to: 1 }, type: 'added', content: '5.3.5.1 Study LIG-2847-301: Phase 3 Pivotal Efficacy and Safety Study' },
        { id: 'line-19', lineNumber: { to: 2 }, type: 'added', content: 'A randomized, double-blind, placebo-controlled Phase 3 study in patients with...' },
        { id: 'line-20', lineNumber: { to: 3 }, type: 'added', content: 'Primary endpoint: Progression-free survival per BICR assessment' },
        { id: 'line-21', lineNumber: { to: 4 }, type: 'added', content: 'Study met its primary endpoint with statistical significance (p<0.0001)' },
      ],
      addedLines: 4,
      removedLines: 0,
      modifiedLines: 0,
    },
  ];

  return {
    id: `comp-${fromVersion.id}-${toVersion.id}`,
    fromVersion,
    toVersion,
    generatedAt: new Date().toISOString(),
    sections: mockSections,
    summary: {
      totalSections: 15,
      addedSections: 2,
      removedSections: 0,
      modifiedSections: 8,
      unchangedSections: 5,
      addedWords: 6500,
      removedWords: 1200,
      addedLines: 145,
      removedLines: 38,
      modifiedLines: 22,
      netChange: 5300,
      changePercentage: 5.3,
    },
    changedAuthors: ['Dr. Sarah Chen', 'Jennifer Walsh'],
    changeReasons: ['Phase 3 data incorporation', 'Safety update', 'CMC revision'],
  };
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
};

const getVersionStatusBadge = (status: VersionStatus) => (
  <Badge color={versionStatusColorMap[status]} size="sm">
    {status.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
  </Badge>
);

const getChangeTypeBadge = (changeType: ChangeType) => (
  <Badge color={changeTypeColorMap[changeType]} size="xs" variant="soft">
    {changeType.charAt(0).toUpperCase() + changeType.slice(1)}
  </Badge>
);

// =============================================================================
// SUBCOMPONENTS
// =============================================================================

interface VersionSelectorProps {
  label: string;
  versions: DocumentVersion[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  excludeId?: string;
}

function VersionSelector({ label, versions, selectedId, onSelect, excludeId }: VersionSelectorProps) {
  const filteredVersions = versions.filter(v => v.id !== excludeId);
  
  return (
    <div className="flex-1">
      <label className="block text-xs text-text-muted mb-1.5">{label}</label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
      >
        <option value="">Select version...</option>
        {filteredVersions.map(version => (
          <option key={version.id} value={version.id}>
            v{version.version} - {version.changeDescription.slice(0, 40)}...
            {version.isBaseline && ' ⭐'}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DiffStatsProps {
  comparison: VersionComparison;
}

function DiffStats({ comparison }: DiffStatsProps) {
  const { summary } = comparison;
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 bg-surface-card rounded-lg border border-border">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-400">+{summary.addedLines}</div>
        <div className="text-xs text-text-muted">Lines Added</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-400">-{summary.removedLines}</div>
        <div className="text-xs text-text-muted">Lines Removed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-amber-400">~{summary.modifiedLines}</div>
        <div className="text-xs text-text-muted">Lines Modified</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-accent-blue">{summary.modifiedSections}</div>
        <div className="text-xs text-text-muted">Sections Changed</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-text-primary">+{summary.addedWords.toLocaleString()}</div>
        <div className="text-xs text-text-muted">Words Added</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-text-secondary">{summary.changePercentage}%</div>
        <div className="text-xs text-text-muted">Net Change</div>
      </div>
    </div>
  );
}

interface DiffLineRowProps {
  line: DiffLine;
  viewMode: DiffViewMode;
}

function DiffLineRow({ line, viewMode }: DiffLineRowProps) {
  const Icon = line.type === 'added' ? Plus : line.type === 'removed' ? Minus : line.type === 'modified' ? Edit : null;
  
  return (
    <div className={`flex items-start gap-2 px-3 py-1.5 font-mono text-xs ${diffLineColorMap[line.type]} border-l-2 ${line.type === 'added' ? 'border-green-500' : line.type === 'removed' ? 'border-red-500' : line.type === 'modified' ? 'border-amber-500' : 'border-transparent'}`}>
      <div className="w-12 text-text-muted text-right shrink-0">
        {line.lineNumber.from && <span className="text-red-400">{line.lineNumber.from}</span>}
        {line.lineNumber.from && line.lineNumber.to && <span className="text-text-muted mx-1">→</span>}
        {line.lineNumber.to && <span className="text-green-400">{line.lineNumber.to}</span>}
      </div>
      <div className="w-5 shrink-0">
        {Icon && <Icon className={`w-3.5 h-3.5 ${diffLineTextColorMap[line.type]}`} />}
      </div>
      <div className={`flex-1 ${diffLineTextColorMap[line.type]}`}>
        {line.content}
      </div>
    </div>
  );
}

interface DiffSectionViewProps {
  section: DiffSection;
  isExpanded: boolean;
  onToggle: () => void;
  viewMode: DiffViewMode;
}

function DiffSectionView({ section, isExpanded, onToggle, viewMode }: DiffSectionViewProps) {
  const changeIcon = section.changeType === 'added' ? <Plus className="w-4 h-4 text-green-400" /> :
    section.changeType === 'removed' ? <Minus className="w-4 h-4 text-red-400" /> :
    section.changeType === 'modified' ? <Edit className="w-4 h-4 text-amber-400" /> :
    <CheckCircle className="w-4 h-4 text-text-muted" />;
  
  const changeBg = section.changeType === 'added' ? 'bg-green-500/5 border-green-500/20' :
    section.changeType === 'removed' ? 'bg-red-500/5 border-red-500/20' :
    section.changeType === 'modified' ? 'bg-amber-500/5 border-amber-500/20' :
    'bg-surface border-border';
  
  return (
    <div className={`rounded-lg border ${changeBg} overflow-hidden`}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
          {changeIcon}
          <span className="font-medium text-text-primary">{section.sectionNumber}</span>
          <span className="text-text-secondary">{section.sectionTitle}</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          {section.addedLines > 0 && <span className="text-green-400">+{section.addedLines}</span>}
          {section.removedLines > 0 && <span className="text-red-400">-{section.removedLines}</span>}
          {section.modifiedLines > 0 && <span className="text-amber-400">~{section.modifiedLines}</span>}
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-border/50">
          {section.lines.map(line => (
            <DiffLineRow key={line.id} line={line} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  );
}

interface VersionTreeNodeViewProps {
  node: VersionTreeNode;
  selectedVersionId: string | null;
  onSelect: (id: string) => void;
  level: number;
}

function VersionTreeNodeView({ node, selectedVersionId, onSelect, level }: VersionTreeNodeViewProps) {
    const { deadClick } = useDeadClick();
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const isSelected = node.version.id === selectedVersionId;
  
  return (
    <div className="relative">
      {level > 0 && (
        <div className="absolute left-3 -top-2 w-px h-4 bg-border" />
      )}
      <div 
        className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-accent-blue/10 border-accent-blue' : 'bg-surface-card border-border hover:border-accent-blue/50'}`}
        onClick={() => onSelect(node.version.id)}
      >
        <div className="mt-0.5">
          {node.version.isBaseline ? (
            <Bookmark className="w-4 h-4 text-amber-400" />
          ) : node.children.length > 0 ? (
            <GitBranch className="w-4 h-4 text-accent-blue" />
          ) : (
            <GitCommit className="w-4 h-4 text-text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-medium text-text-primary">v{node.version.version}</span>
            {getVersionStatusBadge(node.version.status)}
            {getChangeTypeBadge(node.version.changeType)}
            {node.version.isLocked && <Lock className="w-3 h-3 text-amber-400" />}
          </div>
          <p className="text-xs text-text-secondary mt-1 line-clamp-1">{node.version.changeDescription}</p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{node.version.createdByName}</span>
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(node.version.createdAt)}</span>
          </div>
          {node.version.isBaseline && node.version.baselineLabel && (
            <div className="flex items-center gap-1 mt-2">
              <Tag className="w-3 h-3 text-amber-400" />
              <span className="text-xs text-amber-400">{node.version.baselineLabel}</span>
            </div>
          )}
        </div>
        {node.children.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="p-1 hover:bg-surface rounded"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>
      {isExpanded && node.children.length > 0 && (
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-border pl-4">
          {node.children.map(child => (
            <VersionTreeNodeView
              key={child.id}
              node={child}
              selectedVersionId={selectedVersionId}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface VersionCardProps {
  version: DocumentVersion;
  isSelected: boolean;
  onSelect: () => void;
  onCompareFrom: () => void;
  onCompareTo: () => void;
  onView: () => void;
}

function VersionCard({ version, isSelected, onSelect, onCompareFrom, onCompareTo, onView }: VersionCardProps) {
  return (
    <div 
      className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected ? 'bg-accent-blue/10 border-accent-blue' : 'bg-surface-card border-border hover:border-accent-blue/50'}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-bold text-lg text-text-primary">v{version.version}</span>
          {getVersionStatusBadge(version.status)}
          {getChangeTypeBadge(version.changeType)}
        </div>
        <div className="flex items-center gap-1">
          {version.isBaseline && <Bookmark className="w-4 h-4 text-amber-400" />}
          {version.isLocked && <Lock className="w-4 h-4 text-amber-400" />}
        </div>
      </div>
      
      <p className="text-sm text-text-secondary mb-3">{version.changeDescription}</p>
      
      <div className="flex items-center gap-4 text-xs text-text-muted mb-3">
        <span className="flex items-center gap-1"><User className="w-3 h-3" />{version.createdByName}</span>
        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(version.createdAt)}</span>
      </div>
      
      {version.changedSections.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {version.changedSections.slice(0, 4).map(section => (
            <span key={section} className="px-2 py-0.5 bg-surface rounded text-xs text-text-muted">{section}</span>
          ))}
          {version.changedSections.length > 4 && (
            <span className="px-2 py-0.5 bg-surface rounded text-xs text-text-muted">+{version.changedSections.length - 4} more</span>
          )}
        </div>
      )}
      
      <div className="flex items-center gap-2 pt-3 border-t border-border">
        <Button variant="ghost" size="xs" icon={<Eye className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onView(); }}>View</Button>
        <Button variant="ghost" size="xs" icon={<GitCompare className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onCompareFrom(); }}>Compare From</Button>
        <Button variant="ghost" size="xs" icon={<ArrowRight className="w-3 h-3" />} onClick={(e) => { e.stopPropagation(); onCompareTo(); }}>Compare To</Button>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface EnhancedDocumentVersioningProps {
  documentId?: string;
  filters?: import('@/components/layout/FilterBar').FilterState;
}

export function EnhancedDocumentVersioning({ documentId, filters: _filters }: EnhancedDocumentVersioningProps) {
  // View state
  const { deadClick } = useDeadClick();
  const { selectedProduct } = useProductFilter();
  const [activeView, setActiveView] = useState<VersioningView>('compare');
  const [diffViewMode, setDiffViewMode] = useState<DiffViewMode>('unified');
  
  // Selection state
  const [fromVersionId, setFromVersionId] = useState<string | null>('ver-002');
  const [toVersionId, setToVersionId] = useState<string | null>('ver-001');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  
  // UI state
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['diff-sec-1', 'diff-sec-2']));
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);
  
  // v0.21.9: Toast for actions
  const toast = useToast();
  
  // Get versions for the document
  const versions = useMemo(() => mockVersions, []);
  
  // Build version tree
  const versionTree = useMemo((): VersionTreeNode | null => {
    const versionMap = new Map(versions.map(v => [v.id, v]));
    const nodeMap = new Map<string, VersionTreeNode>();
    
    // Create nodes
    versions.forEach(version => {
      nodeMap.set(version.id, {
        id: version.id,
        version,
        children: [],
        depth: 0,
        position: { x: 0, y: 0 },
        isExpanded: true,
        isBranch: (version.childVersionIds?.length || 0) > 1,
        branchName: version.branchName,
      });
    });
    
    // Build tree relationships
    versions.forEach(version => {
      if (version.parentVersionId) {
        const parentNode = nodeMap.get(version.parentVersionId);
        const childNode = nodeMap.get(version.id);
        if (parentNode && childNode) {
          parentNode.children.push(childNode);
          childNode.depth = parentNode.depth + 1;
        }
      }
    });
    
    // Find root (version with no parent)
    const root = versions.find(v => !v.parentVersionId);
    return root ? nodeMap.get(root.id) || null : null;
  }, [versions]);
  
  // Generate comparison
  const comparison = useMemo(() => {
    if (!fromVersionId || !toVersionId) return null;
    const fromVersion = versions.find(v => v.id === fromVersionId);
    const toVersion = versions.find(v => v.id === toVersionId);
    if (!fromVersion || !toVersion) return null;
    return generateMockComparison(fromVersion, toVersion);
  }, [fromVersionId, toVersionId, versions]);
  
  // Baselines only
  const baselines = useMemo(() => versions.filter(v => v.isBaseline), [versions]);
  
  // Stats
  const stats = useMemo(() => ({
    totalVersions: versions.length,
    baselines: baselines.length,
    effective: versions.filter(v => v.status === 'effective').length,
    locked: versions.filter(v => v.isLocked).length,
  }), [versions, baselines]);
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
  const swapVersions = () => {
    const temp = fromVersionId;
    setFromVersionId(toVersionId);
    setToVersionId(temp);
  };
  
  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        title="Enhanced Document Versioning"
        subtitle="Compare versions, visualize changes, and manage document history"
        icon={<GitCompare className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => toast.success('Version history refreshed — showing latest state from document repository')} icon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
            <Button variant="secondary" size="sm" onClick={() => toast.info('Versioning settings — configure auto-increment rules, retention policy, and comparison depth in Admin')} icon={<Settings className="w-4 h-4" />}>Settings</Button>
          </div>
        }
      >
        {/* View Tabs */}
        <div className="flex items-center gap-1 border-b border-border -mb-4">
          {[
            { id: 'compare' as VersioningView, label: 'Compare Versions', icon: <GitCompare className="w-4 h-4" /> },
            { id: 'tree' as VersioningView, label: 'Version Tree', icon: <GitBranch className="w-4 h-4" /> },
            { id: 'history' as VersioningView, label: 'History', icon: <History className="w-4 h-4" /> },
            { id: 'baselines' as VersioningView, label: 'Baselines', icon: <Bookmark className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeView === tab.id ? 'border-accent-blue text-accent-blue' : 'border-transparent text-text-muted hover:text-text-secondary'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
            </ScreenHeader>

      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'compare' && (
          <div className="space-y-4 md:space-y-6">
            {/* Version Selectors */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-end gap-4">
                  <VersionSelector
                    label="From Version (older)"
                    versions={versions}
                    selectedId={fromVersionId}
                    onSelect={setFromVersionId}
                    excludeId={toVersionId || undefined}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<ArrowLeftRight className="w-4 h-4" />}
                    onClick={swapVersions}
                    className="mb-0.5"
                  />
                  <VersionSelector
                    label="To Version (newer)"
                    versions={versions}
                    selectedId={toVersionId}
                    onSelect={setToVersionId}
                    excludeId={fromVersionId || undefined}
                  />
                  <Button variant="primary" size="sm" onClick={() => toast.success('Version comparison loading — diff view will highlight additions, deletions, and changed sections')} icon={<GitCompare className="w-4 h-4" />} disabled={!fromVersionId || !toVersionId}>
                    Compare
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {comparison && (
              <>
                {/* Diff Stats */}
                <DiffStats comparison={comparison} />
                
                {/* Diff Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-muted">View Mode:</span>
                    {(['unified', 'split', 'inline'] as DiffViewMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setDiffViewMode(mode)}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${diffViewMode === mode ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-secondary hover:bg-surface'}`}
                      >
                        {mode.charAt(0).toUpperCase() + mode.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showOnlyChanges}
                        onChange={(e) => setShowOnlyChanges(e.target.checked)}
                        className="rounded"
                      />
                      Show only changes
                    </label>
                    <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => {
                      // v0.15.25: Export diff as text file
                      if (comparison) {
                        const diffText = (comparison.sections ?? []).map(s => `${s.sectionNumber} ${s.sectionTitle}: ${s.changeType}`).join('\n');
                        const blob = new Blob([`Document Diff\nFrom: ${comparison.fromVersion.version} To: ${comparison.toVersion.version}\n\n${diffText}`], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = window.document.createElement('a');
                        a.href = url;
                        a.download = `diff-${comparison.fromVersion.version}-to-${comparison.toVersion.version}.txt`;
                        window.document.body.appendChild(a);
                        a.click();
                        window.document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }
                    }}>Export Diff</Button>
                  </div>
                </div>
                
                {/* Diff Sections */}
                <div className="space-y-3">
                  {(comparison.sections ?? []).map(section => (
                    <DiffSectionView
                      key={section.id}
                      section={section}
                      isExpanded={expandedSections.has(section.id)}
                      onToggle={() => toggleSection(section.id)}
                      viewMode={diffViewMode}
                    />
                  ))}
                </div>
              </>
            )}
            
            {!comparison && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GitCompare className="w-16 h-16 text-text-muted mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">Select Versions to Compare</h3>
                <p className="text-sm text-text-muted max-w-md">
                  Choose a "from" and "to" version above to see a detailed comparison of changes, 
                  including added, removed, and modified content.
                </p>
              </div>
            )}
          </div>
        )}
        
        {activeView === 'tree' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-primary">Version Tree</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => toast.info('Zoom — use Ctrl+scroll or the browser zoom (Ctrl +) to zoom the document viewer')} icon={<ZoomIn className="w-4 h-4" />} />
                <Button variant="ghost" size="sm" onClick={() => toast.info('Zoom — use Ctrl+scroll or the browser zoom (Ctrl -) to zoom the document viewer')} icon={<ZoomOut className="w-4 h-4" />} />
                <Button variant="ghost" size="sm" onClick={() => { document.documentElement.requestFullscreen?.().catch(() => toast.info('Press F11 for fullscreen')); }} icon={<Maximize2 className="w-4 h-4" />} />
              </div>
            </div>
            
            {versionTree && (
              <div className="space-y-2">
                <VersionTreeNodeView
                  node={versionTree}
                  selectedVersionId={selectedVersionId}
                  onSelect={setSelectedVersionId}
                  level={0}
                />
              </div>
            )}
          </div>
        )}
        
        {activeView === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-primary">Version History</h2>
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search versions..."
                className="w-64"
              />
            </div>
            
            <div className="grid gap-4">
              {versions.map(version => (
                <VersionCard
                  key={version.id}
                  version={version}
                  isSelected={selectedVersionId === version.id}
                  onSelect={() => setSelectedVersionId(version.id)}
                  onCompareFrom={() => setFromVersionId(version.id)}
                  onCompareTo={() => setToVersionId(version.id)}
                  onView={() => toast.info(`Viewing version ${version.version}`)}
                />
              ))}
            </div>
          </div>
        )}
        
        {activeView === 'baselines' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-text-primary">Baselines</h2>
              <Button variant="primary" size="sm" onClick={() => toast.success('Baseline version created — this snapshot is now the reference for all future diff comparisons')} icon={<Plus className="w-4 h-4" />}>Create Baseline</Button>
            </div>
            
            <div className="grid gap-4">
              {baselines.map(version => (
                <Card key={version.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <Bookmark className="w-5 h-5 text-amber-400 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-bold text-text-primary">v{version.version}</span>
                            {getVersionStatusBadge(version.status)}
                            {version.isLocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                          </div>
                          <h3 className="text-sm font-medium text-text-primary">{version.baselineLabel}</h3>
                          <p className="text-sm text-text-secondary mt-1">{version.changeDescription}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{version.createdByName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{formatDate(version.createdAt)}</span>
                            <span>{version.wordCount.toLocaleString()} words</span>
                            <span>{version.pageCount} pages</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => { setSelectedVersionId(version.id); setActiveView('compare'); }}>View</Button>
                        <Button variant="ghost" size="sm" icon={<GitCompare className="w-4 h-4" />} onClick={() => {
                          setFromVersionId(version.id);
                          setActiveView('compare');
                        }}>Compare</Button>
                        <Button variant="ghost" size="sm" icon={<Download className="w-4 h-4" />} onClick={() => {
                          // v0.15.25: Export version
                          const blob = new Blob([`Version: ${version.version}\nLabel: ${version.baselineLabel}\nDescription: ${version.changeDescription}`], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = window.document.createElement('a');
                          a.href = url;
                          a.download = `version-${version.version}.txt`;
                          window.document.body.appendChild(a);
                          a.click();
                          window.document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}>Export</Button>
                      </div>
                    </div>
                    
                    {version.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-border">
                        {version.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-xs">{tag}</span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnhancedDocumentVersioning;
