// =============================================================================
// CONTENT REUSE ENGINE - v0.39.2
// =============================================================================
// Tracks and promotes document reuse across submissions.
// Key differentiator: Shows lineage, suggests reusable content, calculates ROI.
// =============================================================================


import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  FileText,
  Link2,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  TrendingUp,
  Zap,
  Eye,
  Copy,
  GitBranch,
  History,
  ArrowRight,
  Sparkles,
  Package,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type ReuseAction = 'reuse-as-is' | 'update-required' | 'new-version-available' | 'superseded';

interface ReusableDocument {
  id: string;
  name: string;
  sectionId: string;
  sectionName: string;
  version: string;
  status: 'approved' | 'locked' | 'draft';
  sourceSequence: string;
  sourceApplication: string;
  lastUsedSequence?: string;
  lastUsedDate?: string;
  usageCount: number;
  
  // Reuse assessment
  reuseAction: ReuseAction;
  reuseConfidence: number;
  reuseReason: string;
  
  // Version info
  hasNewerVersion: boolean;
  newerVersion?: string;
  versionDiff?: string;
  
  // Metadata
  author: string;
  approvedDate: string;
  wordCount: number;
  pageCount: number;
}

interface ReuseStatistics {
  totalDocuments: number;
  reuseableCount: number;
  reuseRate: number;
  estimatedHoursSaved: number;
  estimatedCostSaved: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const MOCK_REUSABLE_DOCUMENTS: ReusableDocument[] = [
  {
    id: 'doc-qos-v21',
    name: 'Quality Overall Summary',
    sectionId: '2.3',
    sectionName: 'Quality Overall Summary',
    version: 'v2.1',
    status: 'locked',
    sourceSequence: '0002',
    sourceApplication: 'NDA-123456',
    lastUsedSequence: '0002',
    lastUsedDate: '2025-01-15',
    usageCount: 3,
    reuseAction: 'reuse-as-is',
    reuseConfidence: 95,
    reuseReason: 'No CMC changes since last submission. Document current.',
    hasNewerVersion: false,
    author: 'Sarah Chen',
    approvedDate: '2025-01-10',
    wordCount: 12500,
    pageCount: 28,
  },
  {
    id: 'doc-pd-v18',
    name: 'Pharmaceutical Development',
    sectionId: '3.2.P.2',
    sectionName: 'Pharmaceutical Development',
    version: 'v1.8',
    status: 'approved',
    sourceSequence: '0001',
    sourceApplication: 'NDA-123456',
    lastUsedSequence: '0002',
    lastUsedDate: '2025-01-15',
    usageCount: 2,
    reuseAction: 'update-required',
    reuseConfidence: 72,
    reuseReason: 'HAQ Q3 requests additional dissolution data. Update needed.',
    hasNewerVersion: true,
    newerVersion: 'v1.9',
    versionDiff: '+3 pages (dissolution method validation)',
    author: 'Michael Roberts',
    approvedDate: '2024-11-20',
    wordCount: 18200,
    pageCount: 42,
  },
  {
    id: 'doc-cs-v18',
    name: 'Clinical Summary',
    sectionId: '2.7',
    sectionName: 'Clinical Summary',
    version: 'v1.8',
    status: 'locked',
    sourceSequence: '0000',
    sourceApplication: 'NDA-123456',
    usageCount: 4,
    reuseAction: 'reuse-as-is',
    reuseConfidence: 98,
    reuseReason: 'No clinical data changes. Summary remains current.',
    hasNewerVersion: false,
    author: 'Dr. Emily Watson',
    approvedDate: '2024-10-15',
    wordCount: 35000,
    pageCount: 85,
  },
  {
    id: 'doc-csr301-v10',
    name: 'CSR LIG-301',
    sectionId: '5.3.5.1',
    sectionName: 'Clinical Study Report - LIG-301',
    version: 'v1.0',
    status: 'locked',
    sourceSequence: '0000',
    sourceApplication: 'NDA-123456',
    usageCount: 2,
    reuseAction: 'reuse-as-is',
    reuseConfidence: 100,
    reuseReason: 'Final locked CSR. No updates possible.',
    hasNewerVersion: false,
    author: 'Clinical Team',
    approvedDate: '2024-09-01',
    wordCount: 125000,
    pageCount: 320,
  },
  {
    id: 'doc-spec-v30',
    name: 'Drug Product Specification',
    sectionId: '3.2.P.5.1',
    sectionName: 'Specification',
    version: 'v3.0',
    status: 'approved',
    sourceSequence: '0002',
    sourceApplication: 'NDA-123456',
    usageCount: 3,
    reuseAction: 'new-version-available',
    reuseConfidence: 65,
    reuseReason: 'v3.1 available with updated dissolution method.',
    hasNewerVersion: true,
    newerVersion: 'v3.1',
    versionDiff: 'Updated dissolution acceptance criteria',
    author: 'QC Team',
    approvedDate: '2025-01-08',
    wordCount: 2500,
    pageCount: 8,
  },
  {
    id: 'doc-nco-v15',
    name: 'Nonclinical Overview',
    sectionId: '2.4',
    sectionName: 'Nonclinical Overview',
    version: 'v1.5',
    status: 'locked',
    sourceSequence: '0000',
    sourceApplication: 'NDA-123456',
    usageCount: 4,
    reuseAction: 'reuse-as-is',
    reuseConfidence: 99,
    reuseReason: 'Nonclinical package complete. No changes needed.',
    hasNewerVersion: false,
    author: 'Dr. James Park',
    approvedDate: '2024-08-20',
    wordCount: 8500,
    pageCount: 22,
  },
];

// =============================================================================
// COMPONENTS
// =============================================================================

const ACTION_CONFIG: Record<ReuseAction, { label: string; color: string; icon: React.ElementType }> = {
  'reuse-as-is': { label: 'Reuse As-Is', color: 'text-green-400 bg-green-500/20', icon: CheckCircle },
  'update-required': { label: 'Update Required', color: 'text-amber-400 bg-amber-500/20', icon: AlertTriangle },
  'new-version-available': { label: 'New Version', color: 'text-blue-400 bg-blue-500/20', icon: Sparkles },
  'superseded': { label: 'Superseded', color: 'text-slate-400 bg-slate-500/20', icon: History },
};

function ActionBadge({ action }: { action: ReuseAction }) {
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const color = confidence >= 90 ? 'bg-green-500' : confidence >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-surface-elevated rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${confidence}%` }} />
      </div>
      <span className="text-xs text-text-muted">{confidence}%</span>
    </div>
  );
}

function DocumentCard({
  document,
  expanded,
  onToggle,
  onSelect,
  selected,
}: {
  document: ReusableDocument;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <div className={`bg-surface-card border rounded-lg overflow-hidden transition-all ${
      selected ? 'border-accent-blue ring-2 ring-accent-blue/20' : 'border-border hover:border-border/80'
    }`}>
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Checkbox */}
          <button
            onClick={onSelect}
            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
              selected
                ? 'bg-accent-blue border-accent-blue text-white'
                : 'border-border hover:border-accent-blue'
            }`}
          >
            {selected && <CheckCircle className="w-3 h-3" />}
          </button>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-text-muted font-mono">{document.sectionId}</span>
              <ActionBadge action={document.reuseAction} />
              {document.hasNewerVersion && (
                <span className="text-xs text-blue-400">→ {document.newerVersion}</span>
              )}
            </div>
            <h4 className="text-sm font-medium text-text-primary truncate">{document.name}</h4>
            <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
              <span>{document.version}</span>
              <span>•</span>
              <span>Seq {document.sourceSequence}</span>
              <span>•</span>
              <span>{document.usageCount}× used</span>
            </div>
          </div>
          
          {/* Expand */}
          <button onClick={onToggle} className="p-1 hover:bg-surface-elevated rounded">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50 space-y-3">
          {/* Confidence */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Reuse Confidence</span>
            <ConfidenceBar confidence={document.reuseConfidence} />
          </div>
          
          {/* Reason */}
          <div className="p-2 bg-surface-elevated rounded text-xs">
            <div className="text-text-muted mb-1">AI Assessment</div>
            <p className="text-text-secondary">{document.reuseReason}</p>
          </div>
          
          {/* Version diff */}
          {document.hasNewerVersion && document.versionDiff && (
            <div className="p-2 bg-blue-500/10 rounded text-xs border border-blue-500/20">
              <div className="text-blue-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Version {document.newerVersion} Changes
              </div>
              <p className="text-text-secondary">{document.versionDiff}</p>
            </div>
          )}
          
          {/* Metadata */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-surface-elevated rounded">
              <div className="text-text-muted">Author</div>
              <div className="text-text-primary">{document.author}</div>
            </div>
            <div className="p-2 bg-surface-elevated rounded">
              <div className="text-text-muted">Pages</div>
              <div className="text-text-primary">{document.pageCount}</div>
            </div>
            <div className="p-2 bg-surface-elevated rounded">
              <div className="text-text-muted">Approved</div>
              <div className="text-text-primary">{document.approvedDate}</div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-elevated rounded hover:bg-surface-card flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" />
              Preview
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-text-secondary bg-surface-elevated rounded hover:bg-surface-card flex items-center justify-center gap-1">
              <History className="w-3 h-3" />
              History
            </button>
            <button className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-accent-blue rounded hover:bg-accent-blue/90 flex items-center justify-center gap-1">
              <Copy className="w-3 h-3" />
              Use
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatisticsCard({ stats }: { stats: ReuseStatistics }) {
  return (
    <div className="p-4 bg-gradient-to-br from-green-500/10 to-accent-blue/10 rounded-lg border border-green-500/20">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-green-400" />
        <h3 className="font-semibold text-text-primary">Reuse Impact</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-2xl font-bold text-green-400">{stats.reuseRate}%</div>
          <div className="text-xs text-text-muted">Reuse Rate</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent-blue">{stats.reuseableCount}</div>
          <div className="text-xs text-text-muted">Reusable Docs</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent-purple">~{stats.estimatedHoursSaved}h</div>
          <div className="text-xs text-text-muted">Time Saved</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-accent-amber">${(stats.estimatedCostSaved / 1000).toFixed(0)}K</div>
          <div className="text-xs text-text-muted">Cost Saved</div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface ContentReuseEngineProps {
  submissionId?: string;
  onSelectDocuments?: (documents: ReusableDocument[]) => void;
}

export function ContentReuseEngine({ submissionId, onSelectDocuments }: ContentReuseEngineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<ReuseAction | 'all'>('all');
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [documents] = useState(MOCK_REUSABLE_DOCUMENTS);

  // Filter documents
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      if (filterAction !== 'all' && doc.reuseAction !== filterAction) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          doc.name.toLowerCase().includes(q) ||
          doc.sectionId.toLowerCase().includes(q) ||
          doc.sectionName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [documents, filterAction, searchQuery]);

  // Calculate statistics
  const stats: ReuseStatistics = useMemo(() => {
    const reuseable = documents.filter(d => d.reuseAction === 'reuse-as-is').length;
    const totalPages = documents.reduce((sum, d) => sum + d.pageCount, 0);
    return {
      totalDocuments: documents.length,
      reuseableCount: reuseable,
      reuseRate: Math.round((reuseable / documents.length) * 100),
      estimatedHoursSaved: Math.round(totalPages * 0.5), // ~30 min per page saved
      estimatedCostSaved: Math.round(totalPages * 0.5 * 150), // $150/hour
    };
  }, [documents]);

  const handleToggleExpand = (id: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedDocs.size === filteredDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocs.map(d => d.id)));
    }
  };

  const handleApplySelected = () => {
    const selected = documents.filter(d => selectedDocs.has(d.id));
    onSelectDocuments?.(selected);
  };

  return (
    <div className="h-full flex flex-col bg-surface-elevated">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <RefreshCw className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Content Reuse Engine</h2>
            <p className="text-xs text-text-muted">
              Promote reuse across submissions • {documents.length} documents analyzed
            </p>
          </div>
        </div>

        {/* Statistics */}
        <StatisticsCard stats={stats} />
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-border flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
          />
        </div>
        
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value as ReuseAction | 'all')}
          className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-blue"
        >
          <option value="all">All Actions</option>
          <option value="reuse-as-is">Reuse As-Is</option>
          <option value="update-required">Update Required</option>
          <option value="new-version-available">New Version</option>
        </select>
        
        <button
          onClick={handleSelectAll}
          className="px-3 py-2 text-sm text-text-secondary hover:bg-surface-card rounded-lg"
        >
          {selectedDocs.size === filteredDocs.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No documents found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          filteredDocs.map(doc => (
            <DocumentCard
              key={doc.id}
              document={doc}
              expanded={expandedDocs.has(doc.id)}
              onToggle={() => handleToggleExpand(doc.id)}
              onSelect={() => handleToggleSelect(doc.id)}
              selected={selectedDocs.has(doc.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      {selectedDocs.size > 0 && (
        <div className="p-4 border-t border-border bg-surface-card">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-muted">
              <span className="font-medium text-text-primary">{selectedDocs.size}</span> documents selected
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedDocs(new Set())}
                className="px-4 py-2 text-sm text-text-secondary hover:bg-surface-elevated rounded-lg"
              >
                Clear Selection
              </button>
              <button
                onClick={handleApplySelected}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-green rounded-lg hover:bg-accent-green/90 flex items-center gap-2"
              >
                <Package className="w-4 h-4" />
                Apply to Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentReuseEngine;
