

import { useState, useMemo } from 'react';
import {
  Clipboard, Clock, Edit3, Eye, CheckSquare, CheckCircle, Lock, Send, RefreshCw, Archive,
  ChevronRight, ChevronDown, User, Users, Calendar, AlertCircle, Play, Pause,
  GitBranch, History, MessageSquare, FileText, Zap, ArrowRight, X, Check, 
  AlertTriangle, Info, Sparkles, BarChart3
} from 'lucide-react';
import { useDocumentLifecycleStore, useActiveLifecycle } from '@/store/useDocumentLifecycleStore';
import {
  LifecycleStage,
  LIFECYCLE_STAGES,
  DocumentVersion,
  ReviewCycle,
  QCRun,
  ApprovalWorkflow,
  StageTransition,
  DocumentAssignment,
} from '@/store/documentLifecycleTypes';

interface DocumentLifecyclePanelProps {
  documentId: string;
  documentTitle?: string;
  onClose?: () => void;
  compact?: boolean;
}

type TabId = 'overview' | 'versions' | 'reviews' | 'qc' | 'approvals' | 'history';

const stageIcons: Record<LifecycleStage, React.ReactNode> = {
  planning: <Clipboard className="w-4 h-4" />,
  prerequisites: <Clock className="w-4 h-4" />,
  authoring: <Edit3 className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
  qc: <CheckSquare className="w-4 h-4" />,
  approval: <CheckCircle className="w-4 h-4" />,
  finalization: <Lock className="w-4 h-4" />,
  submission: <Send className="w-4 h-4" />,
  amendment: <RefreshCw className="w-4 h-4" />,
  retired: <Archive className="w-4 h-4" />,
};

const stageOrder: LifecycleStage[] = [
  'planning', 'prerequisites', 'authoring', 'review', 'qc', 'approval', 'finalization', 'submission'
];

export function DocumentLifecyclePanel({ documentId, documentTitle, onClose, compact = false }: DocumentLifecyclePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stage-progress', 'metrics']));
  
  const getLifecycleState = useDocumentLifecycleStore(s => s.getLifecycleState);
  const getCurrentStage = useDocumentLifecycleStore(s => s.getCurrentStage);
  const getAvailableTransitions = useDocumentLifecycleStore(s => s.getAvailableTransitions);
  const getVersionHistory = useDocumentLifecycleStore(s => s.getVersionHistory);
  const getAssignments = useDocumentLifecycleStore(s => s.getAssignments);
  const getCurrentReviewCycle = useDocumentLifecycleStore(s => s.getCurrentReviewCycle);
  const getQCHistory = useDocumentLifecycleStore(s => s.getQCHistory);
  const getCurrentApproval = useDocumentLifecycleStore(s => s.getCurrentApproval);
  const getStageHistory = useDocumentLifecycleStore(s => s.getStageHistory);
  const getLifecycleMetrics = useDocumentLifecycleStore(s => s.getLifecycleMetrics);
  const transitionStage = useDocumentLifecycleStore(s => s.transitionStage);
  const runQCChecks = useDocumentLifecycleStore(s => s.runQCChecks);
  
  const lifecycle = getLifecycleState(documentId);
  const currentStage = getCurrentStage(documentId);
  const availableTransitions = getAvailableTransitions(documentId);
  const versions = getVersionHistory(documentId);
  const assignments = getAssignments(documentId);
  const currentReview = getCurrentReviewCycle(documentId);
  const qcHistory = getQCHistory(documentId);
  const currentApproval = getCurrentApproval(documentId);
  const stageHistory = getStageHistory(documentId);
  const metrics = getLifecycleMetrics(documentId);
  
  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };
  
  if (!lifecycle) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
        <p className="text-sm text-text-muted">No lifecycle data for this document</p>
      </div>
    );
  }
  
  const stageConfig = currentStage ? LIFECYCLE_STAGES[currentStage] : null;
  const currentStageIndex = currentStage ? stageOrder.indexOf(currentStage) : -1;
  
  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'versions', label: 'Versions', icon: <GitBranch className="w-4 h-4" />, count: versions.length },
    { id: 'reviews', label: 'Reviews', icon: <Eye className="w-4 h-4" />, count: lifecycle.reviewHistory.length },
    { id: 'qc', label: 'QC', icon: <CheckSquare className="w-4 h-4" />, count: qcHistory.length },
    { id: 'approvals', label: 'Approvals', icon: <CheckCircle className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" />, count: stageHistory.length },
  ];
  
  return (
    <div className={`bg-surface-elevated border border-border rounded-lg ${compact ? '' : 'shadow-xl'}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded ${stageConfig?.bgColor || 'bg-slate-500/20'}`}>
              {currentStage && stageIcons[currentStage]}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">Document Lifecycle</h3>
              {documentTitle && (
                <p className="text-xs text-text-muted truncate max-w-[200px]">{documentTitle}</p>
              )}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        {/* Current Stage Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${stageConfig?.bgColor} ${stageConfig?.color ?? ''}`}>
            {stageConfig?.name || 'Unknown'}
          </span>
          <span className="text-xs text-text-muted">v{lifecycle.currentVersion}</span>
          {metrics && (
            <span className="text-xs text-text-muted ml-auto">
              Day {metrics.totalDays} • {metrics.daysInCurrentStage}d in stage
            </span>
          )}
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent-blue text-accent-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="px-1.5 py-0.5 bg-surface-card rounded text-[10px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="p-4 max-h-[500px] overflow-auto">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Stage Progress */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('stage-progress')}
                className="w-full px-3 py-2 flex items-center justify-between bg-surface-card hover:bg-surface-elevated transition-colors"
              >
                <span className="text-xs font-medium text-text-primary">Stage Progress</span>
                {expandedSections.has('stage-progress') ? (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </button>
              
              {expandedSections.has('stage-progress') && (
                <div className="p-3 bg-surface">
                  {/* Progress Bar */}
                  <div className="flex items-center gap-1 mb-4">
                    {stageOrder.map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const config = LIFECYCLE_STAGES[stage];
                      
                      return (
                        <div key={stage} className="flex-1 flex items-center gap-1">
                          <div
                            className={`flex-1 h-2 rounded-full ${
                              isCompleted ? 'bg-accent-green' :
                              isCurrent ? config.bgColor.replace('/20', '/40') :
                              'bg-surface-card'
                            }`}
                            title={config.name}
                          />
                          {idx < stageOrder.length - 1 && (
                            <div className={`w-1 h-1 rounded-full ${
                              isCompleted ? 'bg-accent-green' : 'bg-surface-card'
                            }`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Stage List */}
                  <div className="grid grid-cols-4 gap-2">
                    {stageOrder.slice(0, 8).map((stage, idx) => {
                      const isCompleted = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;
                      const config = LIFECYCLE_STAGES[stage];
                      
                      return (
                        <div
                          key={stage}
                          className={`p-2 rounded text-center ${
                            isCurrent ? config.bgColor : isCompleted ? 'bg-accent-green/10' : 'bg-surface-card'
                          }`}
                        >
                          <div className={`mx-auto w-5 h-5 flex items-center justify-center mb-1 ${
                            isCurrent ? config.color : isCompleted ? 'text-accent-green' : 'text-text-muted'
                          }`}>
                            {isCompleted ? <Check className="w-4 h-4" /> : stageIcons[stage]}
                          </div>
                          <span className={`text-[10px] ${
                            isCurrent ? config.color : isCompleted ? 'text-accent-green' : 'text-text-muted'
                          }`}>
                            {config.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Available Transitions */}
            {availableTransitions.length > 0 && (
              <div className="border border-border rounded-lg p-3">
                <h4 className="text-xs font-medium text-text-primary mb-2">Available Transitions</h4>
                <div className="flex flex-wrap gap-2">
                  {availableTransitions.map(stage => {
                    const config = LIFECYCLE_STAGES[stage];
                    return (
                      <button
                        key={stage}
                        onClick={() => transitionStage(documentId, stage, 'Manual transition', 'user-1', 'Current User')}
                        className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 ${config.bgColor} ${config?.color ?? ''} hover:opacity-80 transition-opacity`}
                      >
                        {stageIcons[stage]}
                        <ArrowRight className="w-3 h-3" />
                        {config.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Quick Metrics */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection('metrics')}
                className="w-full px-3 py-2 flex items-center justify-between bg-surface-card hover:bg-surface-elevated transition-colors"
              >
                <span className="text-xs font-medium text-text-primary">Metrics</span>
                {expandedSections.has('metrics') ? (
                  <ChevronDown className="w-4 h-4 text-text-muted" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                )}
              </button>
              
              {expandedSections.has('metrics') && metrics && (
                <div className="p-3 bg-surface">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-primary">{metrics.totalDays}</div>
                      <div className="text-[10px] text-text-muted">Total Days</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-primary">{versions.length}</div>
                      <div className="text-[10px] text-text-muted">Versions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-text-primary">{lifecycle.reviewHistory.length}</div>
                      <div className="text-[10px] text-text-muted">Review Cycles</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Current Review Cycle */}
            {currentReview && (
              <div className="border border-purple-500/30 rounded-lg p-3 bg-purple-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-medium text-purple-400">Active Review: {currentReview.stageName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>{currentReview.reviewers.length} reviewers</span>
                  <span>{currentReview.reviewers.filter(r => r.status === 'completed').length} completed</span>
                  <span>Due: {new Date(currentReview.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            )}
            
            {/* Current Approval */}
            {currentApproval && (
              <div className="border border-emerald-500/30 rounded-lg p-3 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Active Approval: {currentApproval.workflowName}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>Step {currentApproval.currentStepIndex + 1} of {currentApproval.steps.length}</span>
                  <span>{currentApproval.steps[currentApproval.currentStepIndex]?.name}</span>
                </div>
              </div>
            )}
            
            {/* Assignments */}
            {assignments.length > 0 && (
              <div className="border border-border rounded-lg p-3">
                <h4 className="text-xs font-medium text-text-primary mb-2 flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Active Assignments
                </h4>
                <div className="space-y-2">
                  {assignments.slice(0, 3).map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-card flex items-center justify-center text-text-muted">
                          <User className="w-3 h-3" />
                        </div>
                        <span className="text-text-primary">{a.assigneeName}</span>
                        <span className="text-text-muted">({a.role})</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        a.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
                        a.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* VERSIONS TAB */}
        {activeTab === 'versions' && (
          <div className="space-y-3">
            {versions.length === 0 ? (
              <div className="text-center py-6 text-text-muted text-sm">No versions yet</div>
            ) : (
              versions.slice().reverse().map((version, idx) => (
                <div key={version.id} className="border border-border rounded-lg p-3 hover:border-accent-blue/50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-text-muted" />
                      <span className="text-sm font-medium text-text-primary">v{version.version}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        version.versionType === 'major' ? 'bg-purple-500/20 text-purple-400' :
                        version.versionType === 'minor' ? 'bg-blue-500/20 text-blue-400' :
                        version.versionType === 'amendment' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {version.versionType}
                      </span>
                      {version.isBaseline && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent-green/20 text-accent-green">baseline</span>
                      )}
                    </div>
                    <span className="text-xs text-text-muted">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary mb-2">{version.changeDescription}</p>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{version.wordCount.toLocaleString()} words</span>
                    <span>{version.pageCount} pages</span>
                    <span>by {version.createdByName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* REVIEWS TAB */}
        {activeTab === 'reviews' && (
          <div className="space-y-3">
            {currentReview && (
              <div className="border-2 border-purple-500/30 rounded-lg p-3 bg-purple-500/5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Current Review: {currentReview.stageName}</span>
                </div>
                <div className="space-y-2">
                  {currentReview.reviewers.map(r => (
                    <div key={r.reviewerId} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-surface-card flex items-center justify-center">
                          <User className="w-3 h-3 text-text-muted" />
                        </div>
                        <span className="text-text-primary">{r.reviewerName}</span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        r.status === 'completed' ? 'bg-accent-green/20 text-accent-green' :
                        r.status === 'in-progress' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {r.decision || r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {lifecycle.reviewHistory.length === 0 && !currentReview ? (
              <div className="text-center py-6 text-text-muted text-sm">No review history</div>
            ) : (
              lifecycle.reviewHistory.slice().reverse().map(cycle => (
                <div key={cycle.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{cycle.stageName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      cycle.outcome === 'approved' ? 'bg-accent-green/20 text-accent-green' :
                      cycle.outcome === 'approved-with-comments' ? 'bg-amber-500/20 text-amber-400' :
                      cycle.outcome === 'revision-required' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {cycle.outcome || 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>Cycle #{cycle.cycleNumber}</span>
                    <span>{cycle.reviewers.length} reviewers</span>
                    <span>{cycle.totalComments} comments</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* QC TAB */}
        {activeTab === 'qc' && (
          <div className="space-y-3">
            {/* Run QC Button */}
            <button
              onClick={() => runQCChecks(documentId, 'user-1', 'Current User')}
              className="w-full py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Run QC Checks
            </button>
            
            {/* Last QC Run */}
            {lifecycle.lastQCRun && (
              <div className="border-2 border-cyan-500/30 rounded-lg p-3 bg-cyan-500/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-cyan-400">Latest QC Run</span>
                  <span className="text-xs text-text-muted">
                    {new Date(lifecycle.lastQCRun.runAt).toLocaleDateString()}
                  </span>
                </div>
                
                {/* Results Summary */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="text-center p-2 bg-surface-card rounded">
                    <div className="text-lg font-bold text-text-primary">{lifecycle.lastQCRun.totalChecks}</div>
                    <div className="text-[10px] text-text-muted">Total</div>
                  </div>
                  <div className="text-center p-2 bg-accent-green/10 rounded">
                    <div className="text-lg font-bold text-accent-green">{lifecycle.lastQCRun.passed}</div>
                    <div className="text-[10px] text-text-muted">Passed</div>
                  </div>
                  <div className="text-center p-2 bg-amber-500/10 rounded">
                    <div className="text-lg font-bold text-amber-400">{lifecycle.lastQCRun.warnings}</div>
                    <div className="text-[10px] text-text-muted">Warnings</div>
                  </div>
                  <div className="text-center p-2 bg-red-500/10 rounded">
                    <div className="text-lg font-bold text-red-400">{lifecycle.lastQCRun.failed}</div>
                    <div className="text-[10px] text-text-muted">Failed</div>
                  </div>
                </div>
                
                {/* Failed/Warning Items */}
                <div className="space-y-1.5 max-h-40 overflow-auto">
                  {lifecycle.lastQCRun.results
                    .filter(r => r.status !== 'pass')
                    .slice(0, 5)
                    .map(result => (
                      <div key={result.id} className="flex items-start gap-2 text-xs p-2 bg-surface-card rounded">
                        {result.status === 'fail' ? (
                          <AlertCircle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <div className="text-text-primary">{result.checkName}</div>
                          <div className="text-text-muted">{result.finding}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* QC History */}
            {qcHistory.slice(0, -1).reverse().map(run => (
              <div key={run.id} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-primary">QC Run</span>
                  <span className="text-xs text-text-muted">
                    {new Date(run.runAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-accent-green">{run.passed} passed</span>
                  <span className="text-amber-400">{run.warnings} warnings</span>
                  <span className="text-red-400">{run.failed} failed</span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div className="space-y-3">
            {currentApproval && (
              <div className="border-2 border-emerald-500/30 rounded-lg p-3 bg-emerald-500/5 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Active: {currentApproval.workflowName}</span>
                </div>
                
                {/* Steps */}
                <div className="space-y-2">
                  {currentApproval.steps.map((step, idx) => (
                    <div key={step.id} className={`p-2 rounded ${
                      idx === currentApproval.currentStepIndex ? 'bg-emerald-500/10 border border-emerald-500/30' :
                      step.status === 'completed' ? 'bg-accent-green/10' :
                      'bg-surface-card'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-text-primary">
                          {idx + 1}. {step.name}
                        </span>
                        {step.status === 'completed' && <Check className="w-3 h-3 text-accent-green" />}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {step.requiredApprovers.map(approver => {
                          const approval = step.approvals.find(a => a.approverId === approver.userId);
                          return (
                            <span
                              key={approver.userId}
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                approval?.decision === 'approve' ? 'bg-accent-green/20 text-accent-green' :
                                approval?.decision === 'reject' ? 'bg-red-500/20 text-red-400' :
                                'bg-surface-elevated text-text-muted'
                              }`}
                            >
                              {approver.userName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {lifecycle.approvalHistory.length === 0 && !currentApproval ? (
              <div className="text-center py-6 text-text-muted text-sm">No approval history</div>
            ) : (
              lifecycle.approvalHistory.slice().reverse().map(workflow => (
                <div key={workflow.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-text-primary">{workflow.workflowName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      workflow.outcome === 'approved' ? 'bg-accent-green/20 text-accent-green' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {workflow.outcome || 'pending'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{workflow.steps.length} steps</span>
                    {workflow.completedAt && (
                      <span>{new Date(workflow.completedAt).toLocaleDateString()}</span>
                    )}
                    {workflow.finalApproverName && (
                      <span>by {workflow.finalApproverName}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-2">
            {stageHistory.length === 0 ? (
              <div className="text-center py-6 text-text-muted text-sm">No history</div>
            ) : (
              stageHistory.slice().reverse().map((transition, idx) => {
                const fromConfig = LIFECYCLE_STAGES[transition.fromStage];
                const toConfig = LIFECYCLE_STAGES[transition.toStage];
                
                return (
                  <div key={transition.id} className="flex items-start gap-3 p-2 rounded hover:bg-surface-card">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${fromConfig.bgColor}`}>
                        {stageIcons[transition.fromStage]}
                      </div>
                      <ArrowRight className="w-3 h-3 text-text-muted" />
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${toConfig.bgColor}`}>
                        {stageIcons[transition.toStage]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-text-primary">{transition.reason}</div>
                      <div className="text-[10px] text-text-muted">
                        {transition.triggeredByName} • {new Date(transition.triggeredAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DocumentLifecyclePanel;
