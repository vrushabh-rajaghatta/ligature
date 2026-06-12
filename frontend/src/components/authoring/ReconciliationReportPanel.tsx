

import { useState, useMemo } from 'react';
import {
  X, Download, FileText, MessageSquare, Users, BarChart3, Clock, CheckCircle,
  AlertCircle, AlertTriangle, ChevronDown, ChevronRight, Filter, Search,
  PieChart, TrendingUp, User, Calendar, Printer, Copy, Check
} from 'lucide-react';
import { AuthoringDocument } from '@/types/authoring';
import { 
  useReviewStore, 
  CommentType, 
  CommentPriority, 
  CommentStatus,
  ReviewComment,
  ReconciliationReport
} from '@/store/useReviewStore';

interface ReconciliationReportPanelProps {
  document: AuthoringDocument;
  onClose: () => void;
}

const commentTypeConfig: Record<CommentType, { label: string; color: string; bgColor: string }> = {
  'comment': { label: 'Comment', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'suggestion': { label: 'Suggestion', color: 'text-accent-green', bgColor: 'bg-accent-green/20' },
  'question': { label: 'Question', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'issue': { label: 'Issue', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'approval': { label: 'Approval', color: 'text-accent-purple', bgColor: 'bg-accent-purple/20' },
};

const priorityConfig: Record<CommentPriority, { label: string; color: string; bgColor: string }> = {
  'critical': { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  'major': { label: 'Major', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  'minor': { label: 'Minor', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'editorial': { label: 'Editorial', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

const statusConfig: Record<CommentStatus, { label: string; color: string; bgColor: string; icon: typeof CheckCircle }> = {
  'open': { label: 'Open', color: 'text-blue-400', bgColor: 'bg-blue-500/20', icon: AlertCircle },
  'in-progress': { label: 'In Progress', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Clock },
  'resolved': { label: 'Resolved', color: 'text-accent-green', bgColor: 'bg-accent-green/20', icon: CheckCircle },
  'rejected': { label: 'Rejected', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: X },
  'deferred': { label: 'Deferred', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: Clock },
};

type ViewMode = 'summary' | 'by-section' | 'by-reviewer' | 'all-comments';

export function ReconciliationReportPanel({ document, onClose }: ReconciliationReportPanelProps) {
  const reviews = useReviewStore(s => s.reviews);
  const generateReconciliationReport = useReviewStore(s => s.generateReconciliationReport);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<CommentStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<CommentPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

  // Find reviews for this document
  const documentReviews = useMemo(() => {
    return reviews.filter(r => r.documentId === document.id);
  }, [reviews, document.id]);

  // Get the most recent review or create mock data for demo
  const activeReview = documentReviews[0];

  // Generate the reconciliation report
  const report = useMemo(() => {
    if (activeReview) {
      return generateReconciliationReport(activeReview.id, 'current-user', 'Current User');
    }
    // Return mock data for demo purposes when no review exists
    return {
      reviewId: 'demo-review',
      generatedAt: new Date().toISOString(),
      generatedBy: 'Current User',
      summary: {
        totalComments: 24,
        byType: { comment: 8, suggestion: 10, question: 4, issue: 2, approval: 0 },
        byPriority: { critical: 2, major: 6, minor: 12, editorial: 4 },
        byStatus: { open: 8, 'in-progress': 4, resolved: 10, rejected: 1, deferred: 1 },
        byParticipant: [
          { participantId: 'p1', name: 'Dr. Sarah Chen', count: 8 },
          { participantId: 'p2', name: 'Maria Santos', count: 6 },
          { participantId: 'p3', name: 'Dr. Robert Kim', count: 5 },
          { participantId: 'p4', name: 'Amanda Foster', count: 5 },
        ],
        bySection: [
          { sectionId: 's1', title: '1. Introduction', count: 4 },
          { sectionId: 's2', title: '2. Objectives', count: 3 },
          { sectionId: 's3', title: '3. Study Design', count: 8 },
          { sectionId: 's4', title: '4. Study Population', count: 5 },
          { sectionId: 's5', title: '5. Efficacy Assessments', count: 4 },
        ],
      },
      comments: generateMockComments(),
      timeline: [
        { event: 'Review created', timestamp: '2025-12-10T09:00:00Z', userId: 'owner', userName: 'Jennifer Park' },
        { event: 'Review started', timestamp: '2025-12-10T09:15:00Z' },
        { event: 'All reviewers completed', timestamp: '2025-12-18T16:00:00Z' },
        { event: 'Consolidation started', timestamp: '2025-12-20T10:00:00Z' },
        { event: 'Report generated', timestamp: new Date().toISOString(), userId: 'current-user', userName: 'Current User' },
      ],
    };
  }, [activeReview, generateReconciliationReport]);

  // Filter comments
  const filteredComments = useMemo(() => {
    if (!report) return [];
    let comments = report.comments;
    
    if (filterStatus !== 'all') {
      comments = comments.filter(c => c.status === filterStatus);
    }
    if (filterPriority !== 'all') {
      comments = comments.filter(c => c.priority === filterPriority);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      comments = comments.filter(c => 
        c.content.toLowerCase().includes(q) ||
        c.authorName.toLowerCase().includes(q)
      );
    }
    return comments;
  }, [report, filterStatus, filterPriority, searchQuery]);

  // Group comments by section
  const commentsBySection = useMemo(() => {
    const grouped = new Map<string, ReviewComment[]>();
    filteredComments.forEach(comment => {
      const existing = grouped.get(comment.sectionId) || [];
      grouped.set(comment.sectionId, [...existing, comment]);
    });
    return grouped;
  }, [filteredComments]);

  // Group comments by reviewer
  const commentsByReviewer = useMemo(() => {
    const grouped = new Map<string, ReviewComment[]>();
    filteredComments.forEach(comment => {
      const existing = grouped.get(comment.authorId) || [];
      grouped.set(comment.authorId, [...existing, comment]);
    });
    return grouped;
  }, [filteredComments]);

  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) {
      next.delete(sectionId);
    } else {
      next.add(sectionId);
    }
    setExpandedSections(next);
  };

  const handleCopyReport = async () => {
    if (!report) return;
    const text = formatReportAsText(report);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportReport = () => {
    if (!report) return;
    const text = formatReportAsText(report);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `reconciliation-report-${document.shortTitle || document.id}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!report) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-surface-elevated border border-border rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">No Review Data</h3>
          <p className="text-text-secondary mb-4">No active review found for this document.</p>
          <button onClick={onClose} className="px-4 py-2 bg-accent-blue text-white rounded-lg">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-elevated border border-border rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-accent-blue" />
              Reconciliation Report
            </h2>
            <p className="text-sm text-text-muted">{document.shortTitle || document.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyReport}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors"
              title="Copy report"
            >
              {copied ? <Check className="w-5 h-5 text-accent-green" /> : <Copy className="w-5 h-5 text-text-muted" />}
            </button>
            <button
              onClick={handleExportReport}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors"
              title="Export report"
            >
              <Download className="w-5 h-5 text-text-muted" />
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors"
              title="Print report"
            >
              <Printer className="w-5 h-5 text-text-muted" />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-1">
          {[
            { id: 'summary', label: 'Summary', icon: PieChart },
            { id: 'by-section', label: 'By Section', icon: FileText },
            { id: 'by-reviewer', label: 'By Reviewer', icon: Users },
            { id: 'all-comments', label: 'All Comments', icon: MessageSquare },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                viewMode === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters (for comments views) */}
        {(viewMode === 'by-section' || viewMode === 'by-reviewer' || viewMode === 'all-comments') && (
          <div className="px-6 py-3 border-b border-border flex items-center gap-4 bg-surface-card/50">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-text-muted" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as CommentStatus | 'all')}
                className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary"
              >
                <option value="all">All Status</option>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value as CommentPriority | 'all')}
                className="px-2 py-1 bg-surface-card border border-border rounded text-sm text-text-primary"
              >
                <option value="all">All Priority</option>
                {Object.entries(priorityConfig).map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search comments..."
                className="w-full max-w-xs pl-9 pr-3 py-1.5 bg-surface-card border border-border rounded text-sm text-text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="text-sm text-text-muted">
              {filteredComments.length} comment{filteredComments.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Summary View */}
          {viewMode === 'summary' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <div className="text-3xl font-bold text-text-primary">{report.summary.totalComments}</div>
                  <div className="text-sm text-text-muted">Total Comments</div>
                </div>
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <div className="text-3xl font-bold text-accent-green">{report.summary.byStatus.resolved}</div>
                  <div className="text-sm text-text-muted">Resolved</div>
                </div>
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-400">{report.summary.byStatus.open}</div>
                  <div className="text-sm text-text-muted">Open</div>
                </div>
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-400">{report.summary.byPriority.critical}</div>
                  <div className="text-sm text-text-muted">Critical Issues</div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-2 gap-6">
                {/* By Type */}
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">By Type</h3>
                  <div className="space-y-3">
                    {Object.entries(report.summary.byType).map(([type, count]) => {
                      const config = commentTypeConfig[type as CommentType];
                      const percentage = report.summary.totalComments > 0 
                        ? Math.round((count / report.summary.totalComments) * 100) 
                        : 0;
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-text-secondary">{config.label}</div>
                          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${config.bgColor.replace('/20', '')}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-12 text-sm text-text-primary text-right">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* By Priority */}
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">By Priority</h3>
                  <div className="space-y-3">
                    {Object.entries(report.summary.byPriority).map(([priority, count]) => {
                      const config = priorityConfig[priority as CommentPriority];
                      const percentage = report.summary.totalComments > 0 
                        ? Math.round((count / report.summary.totalComments) * 100) 
                        : 0;
                      return (
                        <div key={priority} className="flex items-center gap-3">
                          <div className="w-24 text-sm text-text-secondary">{config.label}</div>
                          <div className="flex-1 h-2 bg-surface rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${config.bgColor.replace('/20', '')}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="w-12 text-sm text-text-primary text-right">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Participants & Sections */}
              <div className="grid grid-cols-2 gap-6">
                {/* Top Reviewers */}
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Comments by Reviewer</h3>
                  <div className="space-y-2">
                    {report.summary.byParticipant.map((participant, idx) => (
                      <div key={participant.participantId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors">
                        <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-accent-blue">
                            {participant.name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{participant.name}</div>
                        </div>
                        <div className="text-sm font-semibold text-text-primary">{participant.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Comments by Section */}
                <div className="bg-surface-card border border-border rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Comments by Section</h3>
                  <div className="space-y-2">
                    {report.summary.bySection.map((section) => (
                      <div key={section.sectionId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface transition-colors">
                        <FileText className="w-4 h-4 text-text-muted" />
                        <div className="flex-1 text-sm text-text-primary truncate">{section.title}</div>
                        <div className="text-sm font-semibold text-text-primary">{section.count}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-surface-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Review Timeline</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {report.timeline.map((event, idx) => (
                      <div key={idx} className="flex items-start gap-4 relative">
                        <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center z-10">
                          <Clock className="w-4 h-4 text-text-muted" />
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="text-sm font-medium text-text-primary">{event.event}</div>
                          <div className="text-xs text-text-muted">
                            {new Date(event.timestamp).toLocaleString()}
                            {event.userName && ` • ${event.userName}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* By Section View */}
          {viewMode === 'by-section' && (
            <div className="space-y-4">
              {report.summary.bySection.map((section) => {
                const sectionComments = commentsBySection.get(section.sectionId) || [];
                const isExpanded = expandedSections.has(section.sectionId);
                
                return (
                  <div key={section.sectionId} className="bg-surface-card border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(section.sectionId)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-surface transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      )}
                      <FileText className="w-4 h-4 text-accent-blue" />
                      <span className="flex-1 text-left text-sm font-medium text-text-primary">
                        {section.title}
                      </span>
                      <span className="text-sm text-text-muted">{sectionComments.length} comments</span>
                    </button>
                    
                    {isExpanded && sectionComments.length > 0 && (
                      <div className="border-t border-border p-4 space-y-3">
                        {sectionComments.map(comment => (
                          <CommentCard key={comment.id} comment={comment} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* By Reviewer View */}
          {viewMode === 'by-reviewer' && (
            <div className="space-y-4">
              {report.summary.byParticipant.map((participant) => {
                const reviewerComments = commentsByReviewer.get(participant.participantId) || [];
                const isExpanded = expandedSections.has(participant.participantId);
                
                return (
                  <div key={participant.participantId} className="bg-surface-card border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection(participant.participantId)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-surface transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted" />
                      )}
                      <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
                        <span className="text-xs font-medium text-accent-blue">
                          {participant.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <span className="flex-1 text-left text-sm font-medium text-text-primary">
                        {participant.name}
                      </span>
                      <span className="text-sm text-text-muted">{reviewerComments.length} comments</span>
                    </button>
                    
                    {isExpanded && reviewerComments.length > 0 && (
                      <div className="border-t border-border p-4 space-y-3">
                        {reviewerComments.map(comment => (
                          <CommentCard key={comment.id} comment={comment} showSection />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* All Comments View */}
          {viewMode === 'all-comments' && (
            <div className="space-y-3">
              {filteredComments.length > 0 ? (
                filteredComments.map(comment => (
                  <CommentCard key={comment.id} comment={comment} showSection showAuthor />
                ))
              ) : (
                <div className="text-center py-12 bg-surface-card rounded-lg border border-border">
                  <MessageSquare className="w-12 h-12 text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary">No comments match your filters</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Generated: {new Date(report.generatedAt).toLocaleString()} by {report.generatedBy}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-card hover:bg-surface border border-border rounded-lg text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Comment Card Component
function CommentCard({ 
  comment, 
  showSection = false, 
  showAuthor = true 
}: { 
  comment: ReviewComment; 
  showSection?: boolean;
  showAuthor?: boolean;
}) {
  const typeConfig = commentTypeConfig[comment.type];
  const priorityConf = priorityConfig[comment.priority];
  const statusConf = statusConfig[comment.status];
  const StatusIcon = statusConf.icon;

  return (
    <div className="bg-surface rounded-lg border border-border p-4">
      <div className="flex items-start gap-3">
        {showAuthor && (
          <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-medium text-accent-blue">
              {comment.authorName.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs px-2 py-0.5 rounded ${typeConfig.bgColor} ${typeConfig?.color ?? ''}`}>
              {typeConfig.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${priorityConf.bgColor} ${priorityConf?.color ?? ''}`}>
              {priorityConf.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${statusConf.bgColor} ${statusConf?.color ?? ''}`}>
              <StatusIcon className="w-3 h-3" />
              {statusConf.label}
            </span>
            {showAuthor && (
              <span className="text-xs text-text-muted">{comment.authorName}</span>
            )}
          </div>
          
          {showSection && (
            <div className="text-xs text-text-muted mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {comment.sectionId}
            </div>
          )}
          
          <p className="text-sm text-text-primary">{comment.content}</p>
          
          {comment.suggestedText && (
            <div className="mt-2 p-2 bg-accent-green/10 border border-accent-green/20 rounded text-sm">
              <span className="text-xs text-accent-green font-medium">Suggested:</span>
              <p className="text-text-secondary mt-1">{comment.suggestedText}</p>
            </div>
          )}
          
          {comment.resolution && (
            <div className="mt-2 p-2 bg-surface-elevated border border-border rounded text-sm">
              <span className="text-xs text-text-muted">Resolution:</span>
              <p className="text-text-secondary mt-1">{comment.resolution}</p>
            </div>
          )}
          
          <div className="mt-2 text-xs text-text-muted">
            {new Date(comment.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to generate mock comments for demo
function generateMockComments(): ReviewComment[] {
  const now = new Date();
  const comments: ReviewComment[] = [
    {
      id: 'cmt-1',
      reviewId: 'demo-review',
      sectionId: 's1',
      type: 'suggestion',
      priority: 'minor',
      content: 'Consider adding more context about the therapeutic area in the introduction.',
      authorId: 'p1',
      authorName: 'Dr. Sarah Chen',
      authorRole: 'clinical-lead',
      authorFunctionalArea: 'clinical',
      isExternal: false,
      status: 'resolved',
      resolution: 'Added additional context in paragraph 2.',
      resolvedBy: 'Jennifer Park',
      resolvedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      visibleTo: 'all',
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      replies: [],
      history: [],
    },
    {
      id: 'cmt-2',
      reviewId: 'demo-review',
      sectionId: 's3',
      type: 'issue',
      priority: 'critical',
      content: 'The study design section does not adequately describe the randomization strategy.',
      authorId: 'p2',
      authorName: 'Maria Santos',
      authorRole: 'biostatistician',
      authorFunctionalArea: 'biostatistics',
      isExternal: false,
      status: 'open',
      visibleTo: 'all',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      replies: [],
      history: [],
    },
    {
      id: 'cmt-3',
      reviewId: 'demo-review',
      sectionId: 's3',
      type: 'question',
      priority: 'major',
      content: 'What is the planned stratification for the randomization?',
      authorId: 'p2',
      authorName: 'Maria Santos',
      authorRole: 'biostatistician',
      authorFunctionalArea: 'biostatistics',
      isExternal: false,
      status: 'in-progress',
      visibleTo: 'all',
      createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      replies: [],
      history: [],
    },
    {
      id: 'cmt-4',
      reviewId: 'demo-review',
      sectionId: 's4',
      type: 'suggestion',
      priority: 'editorial',
      content: 'Please standardize the terminology for "participants" vs "subjects" throughout.',
      authorId: 'p4',
      authorName: 'Amanda Foster',
      authorRole: 'regulatory-lead',
      authorFunctionalArea: 'regulatory',
      isExternal: false,
      status: 'resolved',
      resolution: 'Changed all instances to "participants" per ICH E9(R1) guidance.',
      resolvedBy: 'Jennifer Park',
      resolvedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      visibleTo: 'all',
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      replies: [],
      history: [],
    },
    {
      id: 'cmt-5',
      reviewId: 'demo-review',
      sectionId: 's5',
      type: 'comment',
      priority: 'minor',
      content: 'The efficacy endpoints align well with regulatory expectations.',
      authorId: 'p3',
      authorName: 'Dr. Robert Kim',
      authorRole: 'safety-physician',
      authorFunctionalArea: 'safety',
      isExternal: false,
      status: 'resolved',
      visibleTo: 'all',
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      replies: [],
      history: [],
    },
  ];
  return comments;
}

// Helper function to format report as text for export
function formatReportAsText(report: ReconciliationReport | { reviewId: string; generatedAt: string; generatedBy: string; summary: ReconciliationReport['summary']; comments: ReviewComment[]; timeline: { event: string; timestamp: string; userId?: string; userName?: string }[] }): string {
  if (!report) return '';
  
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    RECONCILIATION REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Generated: ${new Date(report.generatedAt).toLocaleString()}`,
    `Generated By: ${report.generatedBy}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                         SUMMARY',
    '───────────────────────────────────────────────────────────────',
    '',
    `Total Comments: ${report.summary.totalComments}`,
    '',
    'By Type:',
    ...Object.entries(report.summary.byType).map(([type, count]) => `  ${type}: ${count}`),
    '',
    'By Priority:',
    ...Object.entries(report.summary.byPriority).map(([priority, count]) => `  ${priority}: ${count}`),
    '',
    'By Status:',
    ...Object.entries(report.summary.byStatus).map(([status, count]) => `  ${status}: ${count}`),
    '',
    '───────────────────────────────────────────────────────────────',
    '                        COMMENTS',
    '───────────────────────────────────────────────────────────────',
    '',
    ...report.comments.map(c => [
      `[${c.type.toUpperCase()}] [${c.priority.toUpperCase()}] [${c.status.toUpperCase()}]`,
      `Author: ${c.authorName}`,
      `Section: ${c.sectionId}`,
      `Comment: ${c.content}`,
      c.resolution ? `Resolution: ${c.resolution}` : '',
      '---',
    ].filter(Boolean).join('\n')),
    '',
    '═══════════════════════════════════════════════════════════════',
  ];
  
  return lines.join('\n');
}
