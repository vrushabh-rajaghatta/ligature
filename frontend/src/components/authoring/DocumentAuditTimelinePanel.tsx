

import { useState, useMemo, useEffect } from 'react';
import {
  Clock, FileText, User, Edit3, CheckCircle, XCircle, MessageSquare,
  Eye, Download, Filter, ChevronDown, ChevronRight, Search, Calendar,
  AlertTriangle, Link2, Sparkles, Shield, GitBranch, ArrowRight,
  FileSignature, History, Layers, ExternalLink, Printer
} from 'lucide-react';
import { auditService, AuditEntry, AuditCategory, AuditSeverity } from '@/services/audit-service';

/**
 * Seeds audit entries for a document if none exist
 * This ensures the timeline has data for demo purposes
 */
function seedDocumentAuditEntries(documentId: string, documentTitle: string) {
  const existing = auditService.getForTarget('document', documentId);
  if (existing.length > 0) return;

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 14); // Start 2 weeks ago

  const events = [
    { action: 'document.created', summary: `Document created: ${documentTitle}`, user: 'Dr. Sarah Chen', daysOffset: 0 },
    { action: 'section.created', summary: 'Section 2.5.1 created', user: 'Dr. Sarah Chen', daysOffset: 0.1 },
    { action: 'section.created', summary: 'Section 2.5.2 created', user: 'Dr. Sarah Chen', daysOffset: 0.2 },
    { action: 'ai.generated', summary: 'AI draft generated for Section 2.5.1', user: 'AI Authoring Engine', daysOffset: 1 },
    { action: 'section.updated', summary: 'Section 2.5.1 reviewed and edited', user: 'Dr. Sarah Chen', daysOffset: 2 },
    { action: 'ai.draft.accepted', summary: 'AI draft accepted for Section 2.5.1', user: 'Dr. Sarah Chen', daysOffset: 2.1 },
    { action: 'ai.generated', summary: 'AI draft generated for Section 2.5.4 (Efficacy)', user: 'AI Authoring Engine', daysOffset: 3 },
    { action: 'section.updated', summary: 'Efficacy data updated from CSR-LIG-301', user: 'Maria Santos', daysOffset: 4 },
    { action: 'ai.generated', summary: 'AI draft generated for Section 2.5.5 (Safety)', user: 'AI Authoring Engine', daysOffset: 5 },
    { action: 'section.updated', summary: 'Safety narrative reviewed by Safety Physician', user: 'Dr. Robert Kim', daysOffset: 6 },
    { action: 'document.updated', summary: 'Cross-references added to clinical sections', user: 'Patricia Lee', daysOffset: 7 },
    { action: 'document.versioned', summary: 'Version 0.2 created', user: 'Dr. Sarah Chen', daysOffset: 8 },
    { action: 'section.updated', summary: 'QC review completed - formatting corrections', user: 'Patricia Lee', daysOffset: 9 },
    { action: 'document.approved', summary: 'Internal review approved', user: 'Dr. James Mitchell', daysOffset: 10 },
    { action: 'document.versioned', summary: 'Version 0.3 created for cross-functional review', user: 'Amanda Foster', daysOffset: 11 },
    { action: 'section.updated', summary: 'Regulatory feedback incorporated', user: 'Amanda Foster', daysOffset: 12 },
    { action: 'document.approved', summary: 'Cross-functional review approved with comments', user: 'Dr. Lisa Wong', daysOffset: 13 },
  ];

  events.forEach(event => {
    const timestamp = new Date(baseDate);
    timestamp.setDate(timestamp.getDate() + Math.floor(event.daysOffset));
    timestamp.setHours(9 + (event.daysOffset % 1) * 8);

    auditService.log({
      category: 'authoring',
      action: event.action as any,
      summary: event.summary,
      severity: event.action.includes('approved') ? 'info' : 'info',
      actor: {
        userId: event.user.toLowerCase().replace(/[^a-z]/g, '-'),
        userName: event.user,
        ipAddress: '10.0.0.1',
      },
      target: {
        type: 'document',
        id: documentId,
        name: documentTitle,
      },
      tags: event.action.includes('ai') ? ['ai-assisted'] : undefined,
    });
  });
}

interface DocumentAuditTimelinePanelProps {
  documentId: string;
  documentTitle: string;
  onClose?: () => void;
}

type TimelineView = 'timeline' | 'table' | 'summary';
type GroupBy = 'none' | 'day' | 'user' | 'action';

interface SourceProvenance {
  id: string;
  sectionId: string;
  sectionTitle: string;
  sourceType: 'csr' | 'tfl' | 'database' | 'manual' | 'ai-generated';
  sourceId: string;
  sourceName: string;
  sourceSection?: string;
  extractedAt: string;
  extractedBy: string;
  qcStatus: 'pending' | 'verified' | 'failed';
  qcBy?: string;
  qcAt?: string;
  qcNotes?: string;
}

interface QCCheckpoint {
  id: string;
  name: string;
  description: string;
  category: 'content' | 'format' | 'references' | 'compliance' | 'consistency';
  status: 'pending' | 'passed' | 'failed' | 'waived';
  checkedBy?: string;
  checkedAt?: string;
  notes?: string;
  evidence?: string;
}

// Mock data for demonstration
const mockSourceProvenance: SourceProvenance[] = [
  {
    id: 'prov-001',
    sectionId: 'sec-2.5.1',
    sectionTitle: '2.5.1 Product Development Rationale',
    sourceType: 'csr',
    sourceId: 'CSR-LIG-301',
    sourceName: 'Clinical Study Report LIG-301',
    sourceSection: 'Section 11.1 - Overview of Efficacy',
    extractedAt: '2024-12-18T10:30:00Z',
    extractedBy: 'Dr. Sarah Chen',
    qcStatus: 'verified',
    qcBy: 'Patricia Lee',
    qcAt: '2024-12-18T14:00:00Z',
    qcNotes: 'Verified against source. All claims traceable.',
  },
  {
    id: 'prov-002',
    sectionId: 'sec-2.5.2',
    sectionTitle: '2.5.2 Overview of Pharmacology',
    sourceType: 'database',
    sourceId: 'PK-DB-2024',
    sourceName: 'Population PK Database Extract',
    extractedAt: '2024-12-17T09:15:00Z',
    extractedBy: 'Dr. Lisa Wong',
    qcStatus: 'verified',
    qcBy: 'Maria Santos',
    qcAt: '2024-12-17T16:30:00Z',
    qcNotes: 'PK parameters validated against final analysis.',
  },
  {
    id: 'prov-003',
    sectionId: 'sec-2.5.4',
    sectionTitle: '2.5.4 Efficacy Summary',
    sourceType: 'tfl',
    sourceId: 'TFL-14.2.1',
    sourceName: 'Table 14.2.1 - Primary Efficacy Results',
    extractedAt: '2024-12-19T11:00:00Z',
    extractedBy: 'Maria Santos',
    qcStatus: 'verified',
    qcBy: 'Dr. Sarah Chen',
    qcAt: '2024-12-19T15:00:00Z',
  },
  {
    id: 'prov-004',
    sectionId: 'sec-2.5.5',
    sectionTitle: '2.5.5 Safety Summary',
    sourceType: 'ai-generated',
    sourceId: 'AI-DRAFT-001',
    sourceName: 'AI-Generated Draft (Ligature AI)',
    sourceSection: 'Based on CSR Sections 12.1-12.4',
    extractedAt: '2024-12-20T08:00:00Z',
    extractedBy: 'AI Authoring Engine',
    qcStatus: 'verified',
    qcBy: 'Dr. Robert Kim',
    qcAt: '2024-12-20T14:30:00Z',
    qcNotes: 'AI content reviewed and approved by Safety Physician. All source citations verified.',
  },
];

const mockQCCheckpoints: QCCheckpoint[] = [
  { id: 'qc-001', name: 'Content Accuracy', description: 'All claims are accurate and supported by source data', category: 'content', status: 'passed', checkedBy: 'Patricia Lee', checkedAt: '2024-12-20T10:00:00Z' },
  { id: 'qc-002', name: 'Reference Integrity', description: 'All references are valid and correctly formatted', category: 'references', status: 'passed', checkedBy: 'Patricia Lee', checkedAt: '2024-12-20T10:30:00Z' },
  { id: 'qc-003', name: 'Formatting Standards', description: 'Document follows ICH M4 formatting requirements', category: 'format', status: 'passed', checkedBy: 'Amanda Foster', checkedAt: '2024-12-20T11:00:00Z' },
  { id: 'qc-004', name: 'Cross-Reference Consistency', description: 'Internal cross-references are consistent', category: 'consistency', status: 'passed', checkedBy: 'Patricia Lee', checkedAt: '2024-12-20T11:30:00Z' },
  { id: 'qc-005', name: 'Regulatory Compliance', description: 'Content meets FDA/EMA guidance requirements', category: 'compliance', status: 'passed', checkedBy: 'Amanda Foster', checkedAt: '2024-12-20T14:00:00Z', evidence: 'Compared against FDA M4E(R2) guidance checklist' },
  { id: 'qc-006', name: 'AI Content Verification', description: 'All AI-generated content has been reviewed and approved', category: 'content', status: 'passed', checkedBy: 'Dr. Robert Kim', checkedAt: '2024-12-20T14:30:00Z', notes: 'Safety narrative reviewed by medical professional' },
];

export function DocumentAuditTimelinePanel({ documentId, documentTitle, onClose }: DocumentAuditTimelinePanelProps) {
  const [view, setView] = useState<TimelineView>('timeline');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<AuditCategory>>(new Set());
  const [selectedSeverities, setSelectedSeverities] = useState<Set<AuditSeverity>>(new Set());
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['timeline', 'provenance', 'qc']));
  const [activeTab, setActiveTab] = useState<'timeline' | 'provenance' | 'qc'>('timeline');
  const [, forceUpdate] = useState(0);

  // Seed audit data for this document on mount
  useEffect(() => {
    seedDocumentAuditEntries(documentId, documentTitle);
    forceUpdate(n => n + 1); // Force re-render after seeding
  }, [documentId, documentTitle]);

  // Get audit entries for this document
  const documentAuditEntries = useMemo(() => {
    return auditService.getForTarget('document', documentId);
  }, [documentId]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return documentAuditEntries.filter(entry => {
      if (searchTerm && !entry.summary.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (selectedCategories.size > 0 && !selectedCategories.has(entry.category)) return false;
      if (selectedSeverities.size > 0 && !selectedSeverities.has(entry.severity)) return false;
      if (dateRange.from && entry.timestamp < new Date(dateRange.from)) return false;
      if (dateRange.to && entry.timestamp > new Date(dateRange.to)) return false;
      return true;
    });
  }, [documentAuditEntries, searchTerm, selectedCategories, selectedSeverities, dateRange]);

  // Group entries
  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') return { 'All Events': filteredEntries };
    
    const groups: Record<string, AuditEntry[]> = {};
    filteredEntries.forEach(entry => {
      let key: string;
      switch (groupBy) {
        case 'day':
          key = entry.timestamp.toLocaleDateString();
          break;
        case 'user':
          key = entry.actor.userName;
          break;
        case 'action':
          key = entry.action;
          break;
        default:
          key = 'Other';
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(entry);
    });
    return groups;
  }, [filteredEntries, groupBy]);

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections);
    if (next.has(section)) next.delete(section);
    else next.add(section);
    setExpandedSections(next);
  };

  const getActionIcon = (action: string) => {
    if (action.includes('created')) return <FileText className="w-4 h-4 text-accent-green" />;
    if (action.includes('updated') || action.includes('edited')) return <Edit3 className="w-4 h-4 text-accent-blue" />;
    if (action.includes('approved')) return <CheckCircle className="w-4 h-4 text-accent-green" />;
    if (action.includes('rejected')) return <XCircle className="w-4 h-4 text-accent-red" />;
    if (action.includes('comment')) return <MessageSquare className="w-4 h-4 text-accent-purple" />;
    if (action.includes('ai')) return <Sparkles className="w-4 h-4 text-accent-amber" />;
    if (action.includes('review')) return <Eye className="w-4 h-4 text-accent-teal" />;
    return <Clock className="w-4 h-4 text-text-muted" />;
  };

  const getSourceTypeIcon = (type: SourceProvenance['sourceType']) => {
    switch (type) {
      case 'csr': return <FileText className="w-4 h-4 text-accent-blue" />;
      case 'tfl': return <Layers className="w-4 h-4 text-accent-purple" />;
      case 'database': return <GitBranch className="w-4 h-4 text-accent-teal" />;
      case 'ai-generated': return <Sparkles className="w-4 h-4 text-accent-amber" />;
      default: return <Edit3 className="w-4 h-4 text-text-muted" />;
    }
  };

  const getQCStatusBadge = (status: QCCheckpoint['status']) => {
    switch (status) {
      case 'passed': return <span className="px-2 py-0.5 text-xs bg-accent-green/20 text-accent-green rounded-full">Passed</span>;
      case 'failed': return <span className="px-2 py-0.5 text-xs bg-accent-red/20 text-accent-red rounded-full">Failed</span>;
      case 'waived': return <span className="px-2 py-0.5 text-xs bg-accent-amber/20 text-accent-amber rounded-full">Waived</span>;
      default: return <span className="px-2 py-0.5 text-xs bg-text-muted/20 text-text-muted rounded-full">Pending</span>;
    }
  };

  const handleExport = () => {
    const exportData = {
      document: { id: documentId, title: documentTitle },
      exportedAt: new Date().toISOString(),
      auditTrail: filteredEntries.map(e => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
      sourceProvenance: mockSourceProvenance,
      qcCheckpoints: mockQCCheckpoints,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${documentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full bg-surface-elevated">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-blue/20">
              <History className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Document Audit Trail</h2>
              <p className="text-sm text-text-muted">{documentTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-secondary hover:text-text-primary"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-secondary hover:text-text-primary"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4">
          {[
            { id: 'timeline', label: 'Audit Timeline', icon: <Clock className="w-4 h-4" /> },
            { id: 'provenance', label: 'Source Provenance', icon: <Link2 className="w-4 h-4" /> },
            { id: 'qc', label: 'QC Checkpoints', icon: <Shield className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-accent-blue/20 text-accent-blue'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'
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
        {/* Audit Timeline Tab */}
        {activeTab === 'timeline' && (
          <div>
            {/* Filters */}
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search audit entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm ${
                    showFilters ? 'border-accent-blue text-accent-blue' : 'border-border text-text-secondary'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                  className="px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-blue"
                >
                  <option value="none">No Grouping</option>
                  <option value="day">Group by Day</option>
                  <option value="user">Group by User</option>
                  <option value="action">Group by Action</option>
                </select>
              </div>

              {showFilters && (
                <div className="p-4 bg-surface-card rounded-lg border border-border mb-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-text-muted block mb-2">Date From</label>
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-2">Date To</label>
                      <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted block mb-2">Severity</label>
                      <div className="flex gap-2">
                        {(['info', 'warning', 'critical'] as AuditSeverity[]).map(s => (
                          <button
                            key={s}
                            onClick={() => {
                              const next = new Set(selectedSeverities);
                              if (next.has(s)) next.delete(s);
                              else next.add(s);
                              setSelectedSeverities(next);
                            }}
                            className={`px-2 py-1 text-xs rounded capitalize ${
                              selectedSeverities.has(s)
                                ? 'bg-accent-blue text-white'
                                : 'bg-surface text-text-secondary'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-semibold text-text-primary">{filteredEntries.length}</div>
                <div className="text-xs text-text-muted">Total Events</div>
              </div>
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-semibold text-accent-green">{filteredEntries.filter(e => e.electronicSignature).length}</div>
                <div className="text-xs text-text-muted">Signed Actions</div>
              </div>
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-semibold text-accent-purple">{new Set(filteredEntries.map(e => e.actor.userId)).size}</div>
                <div className="text-xs text-text-muted">Contributors</div>
              </div>
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="text-2xl font-semibold text-accent-amber">{filteredEntries.filter(e => e.action.includes('ai')).length}</div>
                <div className="text-xs text-text-muted">AI Actions</div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-6">
              {Object.entries(groupedEntries).map(([group, entries]) => (
                <div key={group}>
                  {groupBy !== 'none' && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-medium text-text-muted px-2">{group}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  <div className="relative">
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-4">
                      {entries.map((entry, index) => (
                        <div key={entry.id} className="relative flex gap-4">
                          <div className="w-12 h-12 rounded-full bg-surface-card border border-border flex items-center justify-center flex-shrink-0 z-10">
                            {getActionIcon(entry.action)}
                          </div>
                          <div className="flex-1 p-4 bg-surface-card rounded-lg border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium text-text-primary">{entry.summary}</div>
                                {entry.details && (
                                  <div className="text-sm text-text-muted mt-1">{entry.details}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {entry.electronicSignature && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded-full">
                                    <FileSignature className="w-3 h-3" />
                                    Signed
                                  </span>
                                )}
                                {entry.action.includes('ai') && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded-full">
                                    <Sparkles className="w-3 h-3" />
                                    AI
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-text-muted">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {entry.actor.userName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {entry.timestamp.toLocaleString()}
                              </span>
                              {entry.target.module && (
                                <span className="flex items-center gap-1">
                                  <Layers className="w-3 h-3" />
                                  {entry.target.module}
                                </span>
                              )}
                            </div>
                            {entry.changes && entry.changes.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="text-xs font-medium text-text-muted mb-2">Changes:</div>
                                <div className="space-y-1">
                                  {entry.changes.map((change, i) => (
                                    <div key={i} className="text-xs flex items-center gap-2">
                                      <span className="text-text-muted">{change.field}:</span>
                                      <span className="text-accent-red line-through">{String(change.previousValue)}</span>
                                      <ArrowRight className="w-3 h-3 text-text-muted" />
                                      <span className="text-accent-green">{String(change.newValue)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredEntries.length === 0 && (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-muted">No audit entries found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Source Provenance Tab */}
        {activeTab === 'provenance' && (
          <div>
            <div className="mb-4">
              <p className="text-sm text-text-muted">
                Complete traceability from document content back to source data. Every claim is linked to its origin
                with QC verification status.
              </p>
            </div>

            <div className="space-y-4">
              {mockSourceProvenance.map((prov) => (
                <div key={prov.id} className="p-4 bg-surface-card rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getSourceTypeIcon(prov.sourceType)}
                      <div>
                        <div className="font-medium text-text-primary">{prov.sectionTitle}</div>
                        <div className="text-xs text-text-muted">Document Section: {prov.sectionId}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {prov.qcStatus === 'verified' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-green/20 text-accent-green text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          QC Verified
                        </span>
                      )}
                      {prov.qcStatus === 'pending' && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-amber/20 text-accent-amber text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Pending QC
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Link2 className="w-4 h-4 text-accent-blue" />
                      <span className="text-sm font-medium text-text-primary">Source: {prov.sourceName}</span>
                    </div>
                    {prov.sourceSection && (
                      <div className="text-xs text-text-muted ml-6">{prov.sourceSection}</div>
                    )}
                    <div className="flex items-center gap-4 mt-2 ml-6 text-xs text-text-muted">
                      <span>Extracted: {new Date(prov.extractedAt).toLocaleString()}</span>
                      <span>By: {prov.extractedBy}</span>
                    </div>
                  </div>

                  {prov.qcBy && (
                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        QC by {prov.qcBy}
                      </span>
                      <span>{prov.qcAt && new Date(prov.qcAt).toLocaleString()}</span>
                      {prov.qcNotes && <span className="italic">{prov.qcNotes}</span>}
                    </div>
                  )}

                  {prov.sourceType === 'ai-generated' && (
                    <div className="mt-3 p-2 bg-accent-amber/10 rounded-lg border border-accent-amber/30">
                      <div className="flex items-center gap-2 text-xs text-accent-amber">
                        <Sparkles className="w-3 h-3" />
                        AI-Generated Content - Requires Medical/Scientific Review
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QC Checkpoints Tab */}
        {activeTab === 'qc' && (
          <div>
            <div className="mb-4 p-4 bg-accent-green/10 rounded-lg border border-accent-green/30">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-accent-green" />
                <span className="font-medium text-accent-green">All QC Checkpoints Passed</span>
              </div>
              <p className="text-sm text-text-muted">
                This document has passed all required quality control checkpoints and is ready for inspector review.
              </p>
            </div>

            <div className="space-y-3">
              {mockQCCheckpoints.map((checkpoint) => (
                <div key={checkpoint.id} className="p-4 bg-surface-card rounded-lg border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        checkpoint.status === 'passed' ? 'bg-accent-green/20' :
                        checkpoint.status === 'failed' ? 'bg-accent-red/20' :
                        checkpoint.status === 'waived' ? 'bg-accent-amber/20' :
                        'bg-surface'
                      }`}>
                        {checkpoint.status === 'passed' && <CheckCircle className="w-4 h-4 text-accent-green" />}
                        {checkpoint.status === 'failed' && <XCircle className="w-4 h-4 text-accent-red" />}
                        {checkpoint.status === 'waived' && <AlertTriangle className="w-4 h-4 text-accent-amber" />}
                        {checkpoint.status === 'pending' && <Clock className="w-4 h-4 text-text-muted" />}
                      </div>
                      <div>
                        <div className="font-medium text-text-primary">{checkpoint.name}</div>
                        <div className="text-xs text-text-muted">{checkpoint.description}</div>
                      </div>
                    </div>
                    {getQCStatusBadge(checkpoint.status)}
                  </div>

                  {checkpoint.checkedBy && (
                    <div className="flex items-center gap-4 text-xs text-text-muted mt-3 pt-3 border-t border-border">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {checkpoint.checkedBy}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {checkpoint.checkedAt && new Date(checkpoint.checkedAt).toLocaleString()}
                      </span>
                      {checkpoint.evidence && (
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          {checkpoint.evidence}
                        </span>
                      )}
                    </div>
                  )}

                  {checkpoint.notes && (
                    <div className="mt-2 text-xs text-text-muted italic">
                      Note: {checkpoint.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Inspector Summary */}
            <div className="mt-6 p-4 bg-surface-card rounded-lg border border-border">
              <h3 className="font-medium text-text-primary mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-accent-blue" />
                Inspector Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-text-muted mb-1">Total Checkpoints</div>
                  <div className="text-text-primary font-medium">{mockQCCheckpoints.length}</div>
                </div>
                <div>
                  <div className="text-text-muted mb-1">Passed</div>
                  <div className="text-accent-green font-medium">{mockQCCheckpoints.filter(c => c.status === 'passed').length}</div>
                </div>
                <div>
                  <div className="text-text-muted mb-1">AI Content Reviewed</div>
                  <div className="text-text-primary font-medium">Yes - Dr. Robert Kim</div>
                </div>
                <div>
                  <div className="text-text-muted mb-1">Last QC Date</div>
                  <div className="text-text-primary font-medium">Dec 20, 2024 14:30</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentAuditTimelinePanel;
