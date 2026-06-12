

import { useState } from 'react';
import {
  Users, UserPlus, Check, X, Clock, AlertCircle, MessageSquare, Send,
  ChevronRight, ChevronDown, Edit3, Eye, CheckCircle, XCircle, Settings,
  Calendar, ArrowRight, MoreVertical, Mail, Plus, Trash2, GripVertical
} from 'lucide-react';
import { 
  AuthoringDocument, ReviewWorkflow, ReviewStage, ReviewStageDefinition,
  Reviewer, ReviewerRole, ReviewAction, DocumentSection 
} from '@/types/authoring';
import { reviewWorkflows } from '@/data/authoring-data';

interface ReviewWorkflowPanelProps {
  document: AuthoringDocument;
  onClose: () => void;
  onSendForReview: (stage: ReviewStageDefinition, reviewers: ReviewerAssignment[]) => void;
}

interface ReviewerAssignment {
  userId: string;
  userName: string;
  email: string;
  role: ReviewerRole;
  sections: string[];
  isRequired: boolean;
  dueDate: string;
}

// Available users for assignment (mock data)
const availableUsers = [
  { id: 'u-clin', name: 'Dr. Sarah Chen', email: 'sarah.chen@ligature.com', roles: ['clinical-lead', 'clinical-scientist'] },
  { id: 'u-biostat', name: 'Maria Santos', email: 'maria.santos@ligature.com', roles: ['biostatistician'] },
  { id: 'u-safety', name: 'Dr. Robert Kim', email: 'robert.kim@ligature.com', roles: ['safety-physician'] },
  { id: 'u-clin-pharm', name: 'Dr. Lisa Wong', email: 'lisa.wong@ligature.com', roles: ['clin-pharm-md'] },
  { id: 'u-cmc', name: 'James Miller', email: 'james.miller@ligature.com', roles: ['cmc-lead'] },
  { id: 'u-nonclin', name: 'Dr. Emily Davis', email: 'emily.davis@ligature.com', roles: ['nonclinical-lead'] },
  { id: 'u-reg', name: 'Amanda Foster', email: 'amanda.foster@ligature.com', roles: ['regulatory-lead'] },
  { id: 'u-med-dir', name: 'Dr. James Mitchell', email: 'james.mitchell@ligature.com', roles: ['medical-director'] },
  { id: 'u-qc', name: 'Patricia Lee', email: 'patricia.lee@ligature.com', roles: ['qc-specialist'] },
  { id: 'u-pm', name: 'Michael Torres', email: 'michael.torres@ligature.com', roles: ['project-manager'] },
];

const roleLabels: Record<ReviewerRole, string> = {
  'medical-writer': 'Medical Writer',
  'clinical-lead': 'Clinical Lead',
  'clinical-scientist': 'Clinical Scientist',
  'biostatistician': 'Biostatistician',
  'safety-physician': 'Safety Physician',
  'clin-pharm-md': 'Clinical Pharmacology MD',
  'cmc-lead': 'CMC Lead',
  'nonclinical-lead': 'Nonclinical Lead',
  'regulatory-lead': 'Regulatory Lead',
  'medical-director': 'Medical Director',
  'qc-specialist': 'QC Specialist',
  'project-manager': 'Project Manager',
};

type ViewMode = 'overview' | 'configure' | 'assign';

export function ReviewWorkflowPanel({ document, onClose, onSendForReview }: ReviewWorkflowPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedWorkflow, setSelectedWorkflow] = useState<ReviewWorkflow>(
    reviewWorkflows.find(w => w.id === document.workflowId) || reviewWorkflows[0]
  );
  const [selectedStageIndex, setSelectedStageIndex] = useState(0);
  const [assignedReviewers, setAssignedReviewers] = useState<ReviewerAssignment[]>([]);
  const [showAddReviewer, setShowAddReviewer] = useState(false);
  const [reviewDueDate, setReviewDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  const currentStage = selectedWorkflow.stages[selectedStageIndex];

  // Get next stage based on document status
  const getNextStage = (): ReviewStageDefinition | null => {
    const statusToStage: Record<string, number> = {
      'drafting': 0,
      'ready-to-start': 0,
      'internal-review': 1,
      'cross-functional-review': 2,
      'qc-review': 3,
    };
    const nextIndex = statusToStage[document.status] ?? 0;
    return selectedWorkflow.stages[nextIndex] || null;
  };

  const nextStage = getNextStage();

  const handleAddReviewer = (user: typeof availableUsers[0], role: ReviewerRole) => {
    const newReviewer: ReviewerAssignment = {
      userId: user.id,
      userName: user.name,
      email: user.email,
      role,
      sections: ['all'],
      isRequired: currentStage?.requiredRoles.includes(role) || false,
      dueDate: reviewDueDate,
    };
    setAssignedReviewers([...assignedReviewers, newReviewer]);
    setShowAddReviewer(false);
  };

  const handleRemoveReviewer = (userId: string) => {
    setAssignedReviewers(assignedReviewers.filter(r => r.userId !== userId));
  };

  const handleSendForReview = () => {
    if (currentStage && assignedReviewers.length > 0) {
      onSendForReview(currentStage, assignedReviewers);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Review Workflow</h2>
            <p className="text-sm text-text-muted">{document.shortTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border flex gap-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'configure', label: 'Configure Workflow' },
            { id: 'assign', label: 'Assign Reviewers' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                viewMode === tab.id
                  ? 'border-accent-blue text-accent-blue'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {viewMode === 'overview' && (
            <div>
              {/* Current Status */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Current Status</h3>
                <div className="flex items-center gap-4 p-4 bg-surface-card rounded-lg">
                  <div className={`p-3 rounded-lg ${
                    document.status === 'approved' ? 'bg-accent-green/20' : 'bg-accent-blue/20'
                  }`}>
                    {document.status === 'approved' ? (
                      <CheckCircle className="w-6 h-6 text-accent-green" />
                    ) : (
                      <Clock className="w-6 h-6 text-accent-blue" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-text-primary capitalize">
                      {document.status.replace(/-/g, ' ')}
                    </div>
                    <div className="text-xs text-text-muted">
                      {document.currentReviewStage 
                        ? `In ${document.currentReviewStage.stageName}`
                        : 'Ready for review'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Stages */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Workflow Stages</h3>
                <div className="relative">
                  {selectedWorkflow.stages.map((stage, index) => {
                    const isComplete = document.currentReviewStage 
                      ? index < document.currentReviewStage.stageOrder - 1
                      : false;
                    const isCurrent = document.currentReviewStage?.stageId === stage.id;
                    const isPending = !isComplete && !isCurrent;

                    return (
                      <div key={stage.id} className="flex items-start gap-4 mb-4">
                        {/* Status Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isComplete ? 'bg-accent-green' :
                          isCurrent ? 'bg-accent-blue' :
                          'bg-surface-card border-2 border-border'
                        }`}>
                          {isComplete ? (
                            <Check className="w-4 h-4 text-white" />
                          ) : isCurrent ? (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          ) : (
                            <span className="text-xs text-text-muted">{index + 1}</span>
                          )}
                        </div>

                        {/* Stage Info */}
                        <div className={`flex-1 pb-4 ${index < selectedWorkflow.stages.length - 1 ? 'border-l-2 border-border ml-4 pl-8 -mt-2 pt-2' : ''}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-medium ${isCurrent ? 'text-accent-blue' : 'text-text-primary'}`}>
                              {stage.name}
                            </span>
                            <span className="text-xs text-text-muted">{stage.durationDays} days</span>
                          </div>
                          <div className="text-xs text-text-muted mb-2">
                            Required: {stage.requiredRoles.map(r => roleLabels[r]).join(', ')}
                          </div>
                          {stage.optionalRoles.length > 0 && (
                            <div className="text-xs text-text-muted">
                              Optional: {stage.optionalRoles.map(r => roleLabels[r]).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current Review Progress */}
              {document.currentReviewStage && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-4">Current Review Progress</h3>
                  <div className="space-y-3">
                    {document.currentReviewStage.reviewers.map(reviewer => (
                      <div key={reviewer.userId} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg">
                        {reviewer.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-accent-green" />
                        ) : reviewer.status === 'in-progress' ? (
                          <Clock className="w-5 h-5 text-amber-400" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-border" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{reviewer.userName}</div>
                          <div className="text-xs text-text-muted capitalize">{roleLabels[reviewer.role]}</div>
                        </div>
                        {reviewer.decision && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            reviewer.decision === 'approve' ? 'bg-accent-green/20 text-accent-green' :
                            reviewer.decision === 'approve-with-comments' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {reviewer.decision.replace(/-/g, ' ')}
                          </span>
                        )}
                        <span className="text-xs text-text-muted">Due: {reviewer.dueDate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configure Workflow Tab */}
          {viewMode === 'configure' && (
            <div>
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Select Workflow</h3>
                <p className="text-xs text-text-muted mb-4">Choose a review workflow template or customize stages</p>
                
                <div className="space-y-3">
                  {reviewWorkflows.map(workflow => (
                    <div
                      key={workflow.id}
                      onClick={() => setSelectedWorkflow(workflow)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedWorkflow.id === workflow.id
                          ? 'border-accent-blue ring-2 ring-accent-blue/20 bg-accent-blue/5'
                          : 'border-border hover:border-accent-blue/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-text-primary">{workflow.name}</span>
                          {workflow.isDefault && (
                            <span className="text-xs px-1.5 py-0.5 bg-accent-blue/20 text-accent-blue rounded">Default</span>
                          )}
                        </div>
                        {selectedWorkflow.id === workflow.id && (
                          <CheckCircle className="w-5 h-5 text-accent-blue" />
                        )}
                      </div>
                      <p className="text-xs text-text-muted mb-3">{workflow.description}</p>
                      <div className="flex items-center gap-2">
                        {workflow.stages.map((stage, i) => (
                          <div key={stage.id} className="flex items-center">
                            <span className="text-xs px-2 py-1 bg-surface-card rounded">{stage.name}</span>
                            {i < workflow.stages.length - 1 && (
                              <ChevronRight className="w-4 h-4 text-text-muted mx-1" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stage Configuration */}
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-4">Stage Details</h3>
                <div className="space-y-3">
                  {selectedWorkflow.stages.map((stage, index) => (
                    <div 
                      key={stage.id}
                      className="p-4 bg-surface-card rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">Stage {index + 1}</span>
                          <span className="text-sm font-medium text-text-primary">{stage.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{stage.durationDays} days</span>
                          <button className="p-1 hover:bg-surface rounded">
                            <Settings className="w-4 h-4 text-text-muted" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-text-muted mb-1">Required Reviewers</div>
                          <div className="flex flex-wrap gap-1">
                            {stage.requiredRoles.map(role => (
                              <span key={role} className="px-2 py-0.5 bg-surface rounded text-text-secondary">
                                {roleLabels[role]}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="text-text-muted mb-1">Optional Reviewers</div>
                          <div className="flex flex-wrap gap-1">
                            {stage.optionalRoles.length > 0 ? stage.optionalRoles.map(role => (
                              <span key={role} className="px-2 py-0.5 bg-surface rounded text-text-secondary">
                                {roleLabels[role]}
                              </span>
                            )) : (
                              <span className="text-text-muted">None</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Assign Reviewers Tab */}
          {viewMode === 'assign' && (
            <div>
              {/* Next Stage Info */}
              {nextStage && (
                <div className="mb-6 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Send className="w-4 h-4 text-accent-blue" />
                    <span className="text-sm font-medium text-text-primary">
                      Send for {nextStage.name}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    Assign reviewers for this stage. Required roles: {nextStage.requiredRoles.map(r => roleLabels[r]).join(', ')}
                  </p>
                </div>
              )}

              {/* Due Date */}
              <div className="mb-6">
                <label className="text-sm font-medium text-text-primary mb-2 block">Review Due Date</label>
                <input
                  type="date"
                  value={reviewDueDate}
                  onChange={(e) => setReviewDueDate(e.target.value)}
                  className="px-4 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-accent-blue"
                />
              </div>

              {/* Assigned Reviewers */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text-primary">Assigned Reviewers</h3>
                  <button 
                    onClick={() => setShowAddReviewer(true)}
                    className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    Add Reviewer
                  </button>
                </div>

                {assignedReviewers.length > 0 ? (
                  <div className="space-y-2">
                    {assignedReviewers.map(reviewer => (
                      <div 
                        key={reviewer.userId}
                        className="flex items-center gap-3 p-3 bg-surface-card rounded-lg border border-border"
                      >
                        <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
                          <span className="text-xs font-medium text-accent-blue">
                            {reviewer.userName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-text-primary">{reviewer.userName}</div>
                          <div className="text-xs text-text-muted">{roleLabels[reviewer.role]}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {reviewer.isRequired && (
                            <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">Required</span>
                          )}
                          <span className="text-xs text-text-muted">Due: {reviewer.dueDate}</span>
                          <button 
                            onClick={() => handleRemoveReviewer(reviewer.userId)}
                            className="p-1 hover:bg-surface rounded text-text-muted hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-surface-card rounded-lg border border-dashed border-border">
                    <Users className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    <p className="text-sm text-text-muted">No reviewers assigned yet</p>
                    <button 
                      onClick={() => setShowAddReviewer(true)}
                      className="mt-2 text-sm text-accent-blue hover:underline"
                    >
                      Add your first reviewer
                    </button>
                  </div>
                )}
              </div>

              {/* Section Assignment */}
              {assignedReviewers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-text-primary mb-3">Section Assignments</h3>
                  <p className="text-xs text-text-muted mb-4">
                    By default, all reviewers review all sections. Click to customize.
                  </p>
                  <div className="p-4 bg-surface-card rounded-lg border border-border">
                    {(document.sections ?? []).map(section => (
                      <div key={section.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <span className="text-sm text-text-primary">
                          {section.number} {section.title}
                        </span>
                        <div className="flex items-center gap-1">
                          {assignedReviewers.map(r => (
                            <div 
                              key={r.userId}
                              className="w-6 h-6 rounded-full bg-accent-blue/20 flex items-center justify-center"
                              title={r.userName}
                            >
                              <span className="text-xs text-accent-blue">
                                {r.userName.split(' ').map(n => n[0]).join('')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
          {viewMode === 'assign' && (
            <button
              onClick={handleSendForReview}
              disabled={assignedReviewers.length === 0}
              className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              Send for Review
            </button>
          )}
        </div>

        {/* Add Reviewer Modal */}
        {showAddReviewer && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-surface-elevated border border-border rounded-lg w-[500px] max-h-[60vh] flex flex-col">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">Add Reviewer</h3>
                <button onClick={() => setShowAddReviewer(false)} className="p-1 hover:bg-surface-card rounded">
                  <X className="w-4 h-4 text-text-muted" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <div className="space-y-2">
                  {availableUsers
                    .filter(u => !assignedReviewers.some(r => r.userId === u.id))
                    .map(user => (
                      <div key={user.id} className="p-3 bg-surface-card rounded-lg border border-border">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center">
                            <span className="text-xs font-medium text-accent-blue">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{user.name}</div>
                            <div className="text-xs text-text-muted">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {user.roles.map(role => (
                            <button
                              key={role}
                              onClick={() => handleAddReviewer(user, role as ReviewerRole)}
                              className="text-xs px-2 py-1 bg-surface hover:bg-accent-blue/20 rounded text-text-secondary hover:text-accent-blue transition-colors"
                            >
                              + {roleLabels[role as ReviewerRole]}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
