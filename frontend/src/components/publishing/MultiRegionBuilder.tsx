// =============================================================================
// MULTI-REGION SUBMISSION BUILDER - v0.39.1
// =============================================================================
// Build parallel submissions to multiple regulatory regions from shared content.
// Key differentiator vs. RIMSmart: Integrated with Ligature's authoring module.
// =============================================================================


import React, { useState, useMemo, useCallback } from 'react';
import {
  Globe,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Download,
  Send,
  Eye,
  Settings,
  Link2,
  Copy,
  ArrowRight,
  Layers,
  GitBranch,
  Zap,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type RegulatoryRegion = 'US' | 'EU' | 'JP' | 'CA' | 'AU' | 'CH' | 'UK' | 'CN';
type ModuleId = 'm1' | 'm2' | 'm3' | 'm4' | 'm5';
type RegionalStatus = 'not-started' | 'in-progress' | 'ready' | 'validated' | 'submitted';
type ContentStatus = 'missing' | 'draft' | 'review' | 'approved' | 'locked';

interface RegionalSubmission {
  region: RegulatoryRegion;
  sequenceNumber: string;
  status: RegionalStatus;
  submissionType: string;
  targetDate?: string;
  module1Status: {
    total: number;
    complete: number;
    missing: string[];
  };
  validationStatus?: {
    errors: number;
    warnings: number;
    passed: boolean;
  };
  lastModified: string;
}

interface SharedContent {
  moduleId: ModuleId;
  moduleName: string;
  status: ContentStatus;
  documentCount: number;
  lastModified: string;
  sections: {
    sectionId: string;
    sectionName: string;
    status: ContentStatus;
    documentId?: string;
    documentName?: string;
    version?: string;
  }[];
}

interface MultiRegionProject {
  id: string;
  productName: string;
  substanceName: string;
  projectType: 'NDA/MAA' | 'IND/CTA' | 'Variation' | 'IR-Response';
  sharedContent: SharedContent[];
  regionalSubmissions: RegionalSubmission[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const REGION_CONFIG: Record<RegulatoryRegion, { 
  flag: string; 
  name: string; 
  agency: string;
  color: string;
  submissionTypes: string[];
}> = {
  US: { 
    flag: '🇺🇸', 
    name: 'United States', 
    agency: 'FDA',
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
    submissionTypes: ['NDA', 'BLA', 'ANDA', 'IND', 'sNDA', 'sBLA']
  },
  EU: { 
    flag: '🇪🇺', 
    name: 'European Union', 
    agency: 'EMA',
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
    submissionTypes: ['MAA', 'CTA', 'Type IA', 'Type IB', 'Type II']
  },
  JP: { 
    flag: '🇯🇵', 
    name: 'Japan', 
    agency: 'PMDA',
    color: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
    submissionTypes: ['JNDA', 'CTN', 'Partial Change']
  },
  CA: { 
    flag: '🇨🇦', 
    name: 'Canada', 
    agency: 'Health Canada',
    color: 'text-red-400 bg-red-500/20 border-red-500/30',
    submissionTypes: ['NDS', 'ANDS', 'CTA']
  },
  AU: { 
    flag: '🇦🇺', 
    name: 'Australia', 
    agency: 'TGA',
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30',
    submissionTypes: ['Registration', 'CTN', 'CTX']
  },
  CH: { 
    flag: '🇨🇭', 
    name: 'Switzerland', 
    agency: 'Swissmedic',
    color: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
    submissionTypes: ['Marketing Auth', 'Notification']
  },
  UK: {
    flag: '🇬🇧',
    name: 'United Kingdom',
    agency: 'MHRA',
    color: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/30',
    submissionTypes: ['MAA', 'CTA', 'Type IA', 'Type II']
  },
  CN: {
    flag: '🇨🇳',
    name: 'China',
    agency: 'NMPA',
    color: 'text-orange-400 bg-orange-500/20 border-orange-500/30',
    submissionTypes: ['NDA', 'IND', 'Supplemental']
  },
};

const STATUS_CONFIG: Record<RegionalStatus, { label: string; color: string; icon: React.ElementType }> = {
  'not-started': { label: 'Not Started', color: 'text-slate-400 bg-slate-500/20', icon: Clock },
  'in-progress': { label: 'In Progress', color: 'text-blue-400 bg-blue-500/20', icon: RefreshCw },
  'ready': { label: 'Ready', color: 'text-amber-400 bg-amber-500/20', icon: CheckCircle },
  'validated': { label: 'Validated', color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
  'submitted': { label: 'Submitted', color: 'text-purple-400 bg-purple-500/20', icon: Send },
};

const CONTENT_STATUS_CONFIG: Record<ContentStatus, { label: string; color: string }> = {
  missing: { label: 'Missing', color: 'text-red-400 bg-red-500/20' },
  draft: { label: 'Draft', color: 'text-amber-400 bg-amber-500/20' },
  review: { label: 'In Review', color: 'text-blue-400 bg-blue-500/20' },
  approved: { label: 'Approved', color: 'text-green-400 bg-green-500/20' },
  locked: { label: 'Locked', color: 'text-purple-400 bg-purple-500/20' },
};

const MOCK_PROJECT: MultiRegionProject = {
  id: 'proj-001',
  productName: 'Ligrastinib Tablets 50mg',
  substanceName: 'ligrastinib',
  projectType: 'NDA/MAA',
  sharedContent: [
    {
      moduleId: 'm2',
      moduleName: 'Module 2 - CTD Summaries',
      status: 'locked',
      documentCount: 7,
      lastModified: '2025-01-28',
      sections: [
        { sectionId: '2.2', sectionName: 'Introduction', status: 'locked', documentId: 'doc-22', documentName: 'Introduction v1.2', version: '1.2' },
        { sectionId: '2.3', sectionName: 'Quality Overall Summary', status: 'locked', documentId: 'doc-23', documentName: 'QOS v2.1', version: '2.1' },
        { sectionId: '2.4', sectionName: 'Nonclinical Overview', status: 'locked', documentId: 'doc-24', documentName: 'Nonclinical Overview v1.5', version: '1.5' },
        { sectionId: '2.5', sectionName: 'Clinical Overview', status: 'locked', documentId: 'doc-25', documentName: 'Clinical Overview v2.3', version: '2.3' },
        { sectionId: '2.6', sectionName: 'Nonclinical Summary', status: 'locked', documentId: 'doc-26', documentName: 'Nonclinical Summary v1.4', version: '1.4' },
        { sectionId: '2.7', sectionName: 'Clinical Summary', status: 'locked', documentId: 'doc-27', documentName: 'Clinical Summary v1.8', version: '1.8' },
      ],
    },
    {
      moduleId: 'm3',
      moduleName: 'Module 3 - Quality',
      status: 'locked',
      documentCount: 15,
      lastModified: '2025-01-27',
      sections: [
        { sectionId: '3.2.S', sectionName: 'Drug Substance', status: 'locked', documentId: 'doc-32s', documentName: 'Drug Substance v3.0', version: '3.0' },
        { sectionId: '3.2.P', sectionName: 'Drug Product', status: 'locked', documentId: 'doc-32p', documentName: 'Drug Product v2.8', version: '2.8' },
      ],
    },
    {
      moduleId: 'm4',
      moduleName: 'Module 4 - Nonclinical',
      status: 'locked',
      documentCount: 22,
      lastModified: '2025-01-25',
      sections: [
        { sectionId: '4.2', sectionName: 'Study Reports', status: 'locked' },
      ],
    },
    {
      moduleId: 'm5',
      moduleName: 'Module 5 - Clinical',
      status: 'approved',
      documentCount: 45,
      lastModified: '2025-01-29',
      sections: [
        { sectionId: '5.3.5.1', sectionName: 'CSR LIG-301', status: 'locked', documentId: 'doc-csr301', documentName: 'CSR LIG-301 v1.0', version: '1.0' },
        { sectionId: '5.3.5.2', sectionName: 'CSR LIG-302', status: 'locked', documentId: 'doc-csr302', documentName: 'CSR LIG-302 v1.0', version: '1.0' },
        { sectionId: '5.3.5.3', sectionName: 'ISS', status: 'approved', documentId: 'doc-iss', documentName: 'ISS v1.2', version: '1.2' },
        { sectionId: '5.3.5.4', sectionName: 'ISE', status: 'approved', documentId: 'doc-ise', documentName: 'ISE v1.1', version: '1.1' },
      ],
    },
  ],
  regionalSubmissions: [
    {
      region: 'US',
      sequenceNumber: '0000',
      status: 'validated',
      submissionType: 'NDA',
      targetDate: '2025-02-15',
      module1Status: { total: 12, complete: 12, missing: [] },
      validationStatus: { errors: 0, warnings: 2, passed: true },
      lastModified: '2025-01-29',
    },
    {
      region: 'EU',
      sequenceNumber: '0000',
      status: 'in-progress',
      submissionType: 'MAA',
      targetDate: '2025-02-28',
      module1Status: { total: 15, complete: 13, missing: ['RMP', 'SmPC'] },
      lastModified: '2025-01-28',
    },
    {
      region: 'JP',
      sequenceNumber: '0000',
      status: 'in-progress',
      submissionType: 'JNDA',
      targetDate: '2025-03-15',
      module1Status: { total: 10, complete: 5, missing: ['CTD-J Cover', 'Japanese Labeling', 'GVP Documents', 'Package Insert', 'Interview Form'] },
      lastModified: '2025-01-25',
    },
    {
      region: 'CA',
      sequenceNumber: '0000',
      status: 'not-started',
      submissionType: 'NDS',
      targetDate: '2025-04-01',
      module1Status: { total: 8, complete: 0, missing: ['HC Cover', 'Product Monograph', 'Brand Name Assessment'] },
      lastModified: '2025-01-20',
    },
  ],
  createdAt: '2025-01-15',
  updatedAt: '2025-01-29',
};

// =============================================================================
// COMPONENTS
// =============================================================================

function RegionBadge({ region, size = 'md' }: { region: RegulatoryRegion; size?: 'sm' | 'md' }) {
  const config = REGION_CONFIG[region];
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded font-medium ${sizeClasses} ${config?.color ?? ''}`}>
      <span>{config.flag}</span>
      <span>{config.agency}</span>
    </span>
  );
}

function StatusBadge({ status }: { status: RegionalStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const config = CONTENT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      {config.label}
    </span>
  );
}

function SharedContentPanel({ 
  content, 
  expanded,
  onToggle 
}: { 
  content: SharedContent[];
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const totalDocs = content.reduce((sum, m) => sum + m.documentCount, 0);
  const lockedCount = content.filter(m => m.status === 'locked').length;
  
  return (
    <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-gradient-to-r from-accent-blue/10 to-accent-purple/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/20 rounded-lg">
              <Layers className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Shared Content (Modules 2-5)</h3>
              <p className="text-xs text-text-muted">
                {totalDocs} documents across {content.length} modules • {lockedCount}/{content.length} locked
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Ready for all regions
            </span>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-border/50">
        {content.map((module) => (
          <div key={module.moduleId}>
            <button
              onClick={() => onToggle(module.moduleId)}
              className="w-full p-3 flex items-center justify-between hover:bg-surface-elevated transition-colors"
            >
              <div className="flex items-center gap-3">
                {expanded.has(module.moduleId) ? (
                  <FolderOpen className="w-4 h-4 text-accent-blue" />
                ) : (
                  <Folder className="w-4 h-4 text-text-muted" />
                )}
                <div className="text-left">
                  <div className="text-sm font-medium text-text-primary">{module.moduleName}</div>
                  <div className="text-xs text-text-muted">
                    {module.documentCount} documents • Updated {module.lastModified}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ContentStatusBadge status={module.status} />
                <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${expanded.has(module.moduleId) ? 'rotate-90' : ''}`} />
              </div>
            </button>
            
            {expanded.has(module.moduleId) && (
              <div className="px-3 pb-3 pl-10 space-y-1">
                {module.sections.map((section) => (
                  <div key={section.sectionId} className="flex items-center justify-between p-2 bg-surface-elevated rounded text-xs">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3 text-text-muted" />
                      <span className="text-text-muted font-mono">{section.sectionId}</span>
                      <span className="text-text-primary">{section.sectionName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {section.documentName && (
                        <span className="text-text-muted">{section.documentName}</span>
                      )}
                      <ContentStatusBadge status={section.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RegionalSubmissionCard({
  submission,
  onEdit,
  onValidate,
  onPublish,
}: {
  submission: RegionalSubmission;
  onEdit: () => void;
  onValidate: () => void;
  onPublish: () => void;
}) {
  const config = REGION_CONFIG[submission.region];
  const completionPct = Math.round((submission.module1Status.complete / submission.module1Status.total) * 100);
  
  return (
    <div className={`bg-surface-card rounded-lg border overflow-hidden ${config.color.replace('text-', 'border-').replace('bg-', '').replace('/20', '/30')}`}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.flag}</span>
            <div>
              <div className="font-semibold text-text-primary">{config.agency}</div>
              <div className="text-xs text-text-muted">{submission.submissionType} • Seq {submission.sequenceNumber}</div>
            </div>
          </div>
          <StatusBadge status={submission.status} />
        </div>
        
        {submission.targetDate && (
          <div className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="w-3 h-3" />
            Target: {submission.targetDate}
          </div>
        )}
      </div>
      
      {/* Module 1 Progress */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-text-muted">Module 1 Regional</span>
          <span className="text-xs font-medium text-text-primary">
            {submission.module1Status.complete}/{submission.module1Status.total}
          </span>
        </div>
        <div className="w-full h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              completionPct === 100 ? 'bg-green-500' : completionPct > 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        
        {submission.module1Status.missing.length > 0 && (
          <div className="mt-2">
            <div className="text-xs text-red-400 flex items-center gap-1 mb-1">
              <AlertCircle className="w-3 h-3" />
              Missing ({submission.module1Status.missing.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {submission.module1Status.missing.slice(0, 3).map((item) => (
                <span key={item} className="text-xs px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded">
                  {item}
                </span>
              ))}
              {submission.module1Status.missing.length > 3 && (
                <span className="text-xs px-1.5 py-0.5 bg-surface-elevated text-text-muted rounded">
                  +{submission.module1Status.missing.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Validation Status */}
      {submission.validationStatus && (
        <div className="px-4 py-2 bg-surface-elevated/50 border-b border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-text-muted">Validation</span>
            <div className="flex items-center gap-2">
              {submission.validationStatus.passed ? (
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Passed
                </span>
              ) : (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {submission.validationStatus.errors} errors
                </span>
              )}
              {submission.validationStatus.warnings > 0 && (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {submission.validationStatus.warnings}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="p-3 flex items-center gap-2">
        <button
          onClick={onEdit}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-elevated rounded hover:bg-surface-card transition-colors"
        >
          Edit M1
        </button>
        {submission.status === 'in-progress' || submission.status === 'ready' ? (
          <button
            onClick={onValidate}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-accent-blue bg-accent-blue/10 rounded hover:bg-accent-blue/20 transition-colors flex items-center justify-center gap-1"
          >
            <Play className="w-3 h-3" />
            Validate
          </button>
        ) : submission.status === 'validated' ? (
          <button
            onClick={onPublish}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-accent-green rounded hover:bg-accent-green/90 transition-colors flex items-center justify-center gap-1"
          >
            <Send className="w-3 h-3" />
            Publish
          </button>
        ) : (
          <button
            disabled
            className="flex-1 px-3 py-1.5 text-xs font-medium text-text-muted bg-surface-elevated rounded cursor-not-allowed"
          >
            Not Ready
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface MultiRegionBuilderProps {
  projectId?: string;
  onClose?: () => void;
}

export function MultiRegionBuilder({ projectId, onClose }: MultiRegionBuilderProps) {
  const [project] = useState<MultiRegionProject>(MOCK_PROJECT);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set(['m2']));
  const [selectedRegion, setSelectedRegion] = useState<RegulatoryRegion | null>(null);
  const [showAddRegion, setShowAddRegion] = useState(false);

  const handleToggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  }, []);

  // Calculate overall stats
  const stats = useMemo(() => {
    const ready = project.regionalSubmissions.filter(s => s.status === 'validated' || s.status === 'submitted').length;
    const inProgress = project.regionalSubmissions.filter(s => s.status === 'in-progress').length;
    const total = project.regionalSubmissions.length;
    return { ready, inProgress, total };
  }, [project]);

  const availableRegions = useMemo(() => {
    const used = new Set(project.regionalSubmissions.map(s => s.region));
    return (Object.keys(REGION_CONFIG) as RegulatoryRegion[]).filter(r => !used.has(r));
  }, [project]);

  return (
    <div className="h-full flex flex-col bg-surface-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 rounded-xl">
              <Globe className="w-6 h-6 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text-primary">Multi-Region Submission Builder</h1>
              <p className="text-sm text-text-muted">{project.productName} • {project.substanceName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-elevated rounded-lg flex items-center gap-1">
              <Download className="w-4 h-4" />
              Export Comparison
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-accent-blue rounded-lg hover:bg-accent-blue/90 flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Validate All
            </button>
          </div>
        </div>
        
        {/* Progress Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-surface-elevated rounded-lg text-center">
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-xs text-text-muted">Regions</div>
          </div>
          <div className="p-3 bg-green-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-400">{stats.ready}</div>
            <div className="text-xs text-green-400">Ready</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.inProgress}</div>
            <div className="text-xs text-amber-400">In Progress</div>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-400">
              {project.sharedContent.reduce((sum, m) => sum + m.documentCount, 0)}
            </div>
            <div className="text-xs text-purple-400">Shared Docs</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Shared Content Section */}
        <SharedContentPanel
          content={project.sharedContent}
          expanded={expandedModules}
          onToggle={handleToggleModule}
        />
        
        {/* Regional Submissions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-accent-purple" />
              <h2 className="font-semibold text-text-primary">Regional Submissions (Module 1)</h2>
            </div>
            {availableRegions.length > 0 && (
              <button
                onClick={() => setShowAddRegion(true)}
                className="px-3 py-1.5 text-sm text-accent-blue hover:bg-accent-blue/10 rounded-lg flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Region
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {project.regionalSubmissions.map((submission) => (
              <RegionalSubmissionCard
                key={submission.region}
                submission={submission}
                onEdit={() => setSelectedRegion(submission.region)}
                onValidate={() => { /* Validate */ }}
                onPublish={() => { /* Publish */ }}
              />
            ))}
          </div>
        </div>
        
        {/* Cross-Region Gap Analysis */}
        <div className="bg-surface-card rounded-lg border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-semibold text-text-primary">Cross-Region Gap Analysis</h3>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <div className="font-medium text-amber-400 mb-1">EU Missing</div>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>• RMP (Risk Management Plan)</li>
                  <li>• SmPC (Summary of Product Characteristics)</li>
                </ul>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <div className="font-medium text-amber-400 mb-1">JP Missing</div>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>• CTD-J Cover Letter</li>
                  <li>• Japanese Labeling</li>
                  <li>• Interview Form</li>
                </ul>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <div className="font-medium text-red-400 mb-1">CA Not Started</div>
                <ul className="text-xs text-text-muted space-y-1">
                  <li>• All Module 1 documents</li>
                  <li>• Target: 2025-04-01</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-surface-card">
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">
            Last updated: {project.updatedAt}
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated rounded-lg">
              Save Draft
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-accent-green rounded-lg hover:bg-accent-green/90 flex items-center gap-1">
              <Send className="w-4 h-4" />
              Publish Ready Regions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MultiRegionBuilder;
