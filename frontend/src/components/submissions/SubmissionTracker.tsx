

import { useState, useMemo } from 'react';
import {
  Clock, CheckCircle, AlertCircle, Send, FileText, ChevronDown,
  ChevronRight, ExternalLink, Download, MessageSquare, Calendar,
  RefreshCw, Eye, Search, Filter, Globe, ArrowRight
} from 'lucide-react';
import { useSequenceBuilderStore, SequenceDraft, SubmissionStatus } from '@/store/useSequenceBuilderStore';
import { regionalConfigs } from '@/config/regional-config';

interface SubmissionTrackerProps {
  applicationId?: string;
  onViewSequence?: (draft: SequenceDraft) => void;
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'validated' | 'submitted' | 'acknowledged' | 'response' | 'approved' | 'rejected' | 'query';
  title: string;
  description?: string;
  timestamp: Date;
  user?: string;
  details?: Record<string, string>;
}

// Mock submission history data
const mockSubmissionHistory: Record<string, TimelineEvent[]> = {
  'draft-001': [
    { id: 'e1', type: 'created', title: 'Sequence Created', timestamp: new Date('2024-12-01T10:00:00'), user: 'Sarah Chen' },
    { id: 'e2', type: 'validated', title: 'Validation Passed', description: '0 errors, 2 warnings', timestamp: new Date('2024-12-05T14:30:00'), user: 'System' },
    { id: 'e3', type: 'submitted', title: 'Submitted to FDA ESG', description: 'Tracking #: FDA-2024-12-00456', timestamp: new Date('2024-12-06T09:00:00'), user: 'Sarah Chen' },
    { id: 'e4', type: 'acknowledged', title: 'Acknowledgment Received', description: 'FDA confirmed receipt', timestamp: new Date('2024-12-06T09:15:00'), user: 'System' },
    { id: 'e5', type: 'query', title: 'Information Request', description: 'FDA requested clarification on CMC data', timestamp: new Date('2024-12-10T11:00:00'), user: 'FDA Reviewer' },
  ],
};

export function SubmissionTracker({ applicationId, onViewSequence }: SubmissionTrackerProps) {
  const drafts = useSequenceBuilderStore(s => s.drafts);
  const getDraftsForApplication = useSequenceBuilderStore(s => s.getDraftsForApplication);
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<SubmissionStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get drafts for this application or all drafts
  const relevantDrafts = useMemo(() => {
    let filtered = applicationId 
      ? getDraftsForApplication(applicationId)
      : drafts;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(d => d.status === statusFilter);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.sequenceNumber.toLowerCase().includes(query) ||
        d.description.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [applicationId, drafts, getDraftsForApplication, statusFilter, searchQuery]);
  
  const toggleExpand = (draftId: string) => {
    const next = new Set(expandedDrafts);
    if (next.has(draftId)) {
      next.delete(draftId);
    } else {
      next.add(draftId);
    }
    setExpandedDrafts(next);
  };
  
  const getStatusIcon = (status: SubmissionStatus) => {
    switch (status) {
      case 'draft':
      case 'in-progress':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'validating':
      case 'validated':
        return <CheckCircle className="w-4 h-4 text-accent-blue" />;
      case 'ready-to-submit':
        return <Send className="w-4 h-4 text-accent-purple" />;
      case 'submitting':
      case 'submitted':
        return <Send className="w-4 h-4 text-amber-400" />;
      case 'acknowledged':
      case 'under-review':
        return <Eye className="w-4 h-4 text-accent-blue" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };
  
  const getStatusColor = (status: SubmissionStatus) => {
    switch (status) {
      case 'draft':
      case 'in-progress':
        return 'bg-slate-500/20 text-slate-400';
      case 'validating':
      case 'validated':
      case 'ready-to-submit':
        return 'bg-accent-blue/20 text-accent-blue';
      case 'submitting':
      case 'submitted':
        return 'bg-amber-500/20 text-amber-400';
      case 'acknowledged':
      case 'under-review':
        return 'bg-accent-purple/20 text-accent-purple';
      case 'approved':
        return 'bg-accent-green/20 text-accent-green';
      case 'rejected':
        return 'bg-red-500/20 text-red-400';
    }
  };
  
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created': return <FileText className="w-3 h-3" />;
      case 'validated': return <CheckCircle className="w-3 h-3" />;
      case 'submitted': return <Send className="w-3 h-3" />;
      case 'acknowledged': return <CheckCircle className="w-3 h-3" />;
      case 'response': return <MessageSquare className="w-3 h-3" />;
      case 'approved': return <CheckCircle className="w-3 h-3" />;
      case 'rejected': return <AlertCircle className="w-3 h-3" />;
      case 'query': return <MessageSquare className="w-3 h-3" />;
    }
  };
  
  const getEventColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'created': return 'bg-slate-500 text-white';
      case 'validated': return 'bg-accent-blue text-white';
      case 'submitted': return 'bg-amber-500 text-white';
      case 'acknowledged': return 'bg-accent-green text-white';
      case 'response': return 'bg-accent-purple text-white';
      case 'approved': return 'bg-accent-green text-white';
      case 'rejected': return 'bg-red-500 text-white';
      case 'query': return 'bg-amber-500 text-white';
    }
  };
  
  // Calculate stats
  const stats = useMemo(() => {
    const all = applicationId ? getDraftsForApplication(applicationId) : drafts;
    return {
      total: all.length,
      inProgress: all.filter(d => ['draft', 'in-progress', 'validating', 'validated', 'ready-to-submit'].includes(d.status)).length,
      submitted: all.filter(d => ['submitted', 'acknowledged', 'under-review'].includes(d.status)).length,
      completed: all.filter(d => ['approved', 'rejected'].includes(d.status)).length,
    };
  }, [applicationId, drafts, getDraftsForApplication]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Submission Tracking</h3>
          <button className="text-xs text-accent-blue hover:underline flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="p-3 bg-surface-card rounded-lg border border-border">
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-xs text-text-muted">Total</div>
          </div>
          <div className="p-3 bg-surface-card rounded-lg border border-border">
            <div className="text-2xl font-bold text-accent-blue">{stats.inProgress}</div>
            <div className="text-xs text-text-muted">In Progress</div>
          </div>
          <div className="p-3 bg-surface-card rounded-lg border border-border">
            <div className="text-2xl font-bold text-amber-400">{stats.submitted}</div>
            <div className="text-xs text-text-muted">Submitted</div>
          </div>
          <div className="p-3 bg-surface-card rounded-lg border border-border">
            <div className="text-2xl font-bold text-accent-green">{stats.completed}</div>
            <div className="text-xs text-text-muted">Completed</div>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sequences..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubmissionStatus | 'all')}
            className="px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="validated">Validated</option>
            <option value="submitted">Submitted</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="under-review">Under Review</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>
      
      {/* Submission List */}
      <div className="flex-1 overflow-auto">
        {relevantDrafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-text-muted">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No submissions found</p>
            <p className="text-xs mt-1">Create a new sequence to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {relevantDrafts.map(draft => {
              const isExpanded = expandedDrafts.has(draft.id);
              const history = mockSubmissionHistory[draft.id] || [];
              const config = regionalConfigs[draft.region];
              
              return (
                <div key={draft.id} className="bg-surface-elevated">
                  {/* Summary Row */}
                  <div 
                    className="p-4 hover:bg-surface transition-colors cursor-pointer"
                    onClick={() => toggleExpand(draft.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <button className="mt-1 text-text-muted">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-text-primary">
                              Sequence {draft.sequenceNumber}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(draft.status)}`}>
                              {draft.status.replace(/-/g, ' ')}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary">{draft.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {config.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(draft.updatedAt).toLocaleDateString()}
                            </span>
                            {draft.targetDate && (
                              <span className="flex items-center gap-1 text-accent-amber">
                                <Clock className="w-3 h-3" />
                                Due: {draft.targetDate}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {onViewSequence && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewSequence(draft);
                            }}
                            className="px-3 py-1.5 text-xs bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30"
                          >
                            Open
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Timeline */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-12 border-t border-border bg-surface">
                      <div className="pt-4">
                        <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                          Activity Timeline
                        </h4>
                        
                        {history.length === 0 ? (
                          <p className="text-xs text-text-muted">No activity recorded</p>
                        ) : (
                          <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                            
                            <div className="space-y-4">
                              {history.map((event, idx) => (
                                <div key={event.id} className="relative flex gap-3">
                                  <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${getEventColor(event.type)}`}>
                                    {getEventIcon(event.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium text-text-primary">{event.title}</span>
                                      <span className="text-xs text-text-muted">
                                        {event.timestamp.toLocaleDateString()} {event.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    {event.description && (
                                      <p className="text-xs text-text-secondary mt-0.5">{event.description}</p>
                                    )}
                                    {event.user && (
                                      <p className="text-xs text-text-muted mt-1">by {event.user}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Submission Attempts */}
                        {draft.submissionAttempts.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-border">
                            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                              Submission Attempts
                            </h4>
                            <div className="space-y-2">
                              {draft.submissionAttempts.map((attempt, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-surface-card rounded border border-border">
                                  <div>
                                    <div className="text-xs font-medium text-text-primary">{attempt.gateway}</div>
                                    <div className="text-xs text-text-muted">
                                      {new Date(attempt.attemptedAt).toLocaleString()}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {attempt.trackingNumber && (
                                      <span className="text-xs text-accent-blue">#{attempt.trackingNumber}</span>
                                    )}
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      attempt.status === 'success' ? 'bg-accent-green/20 text-accent-green' :
                                      attempt.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                                      'bg-red-500/20 text-red-400'
                                    }`}>
                                      {attempt.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
