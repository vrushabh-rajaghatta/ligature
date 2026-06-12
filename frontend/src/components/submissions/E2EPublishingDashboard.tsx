

import { useState, useEffect } from 'react';
import {
  FileText, Check, X, ChevronRight, AlertTriangle, Shield, Rocket,
  Clock, CheckCircle, XCircle, RefreshCw, FileCheck, Send, Lock,
  Download, Eye, Package, Zap, ArrowRight, Play, Pause, RotateCcw,
  Building2, Globe, Server, Activity
} from 'lucide-react';
import {
  useEndToEndPublishing,
  useE2EWorkflowProgress,
  EndToEndWorkflow,
  PublishingPhase,
  PublishingStatus,
  PublishingMilestone,
} from '@/store/useEndToEndPublishing';
import { useDocumentFinalization } from '@/store/useDocumentFinalization';
import { useToast } from '@/components/ui/Toast';

interface E2EPublishingDashboardProps {
  finalizationWorkflowId: string;
  onClose: () => void;
}

const PHASE_CONFIG: Record<PublishingPhase, { label: string; description: string; icon: React.ReactNode; color: string }> = {
  'finalization': { 
    label: 'Finalization', 
    description: 'Document QC, signatures, PDF generation', 
    icon: <FileCheck className="w-5 h-5" />,
    color: 'accent-purple',
  },
  'sequence-build': { 
    label: 'Sequence Build', 
    description: 'Assign documents to eCTD structure', 
    icon: <Package className="w-5 h-5" />,
    color: 'accent-blue',
  },
  'validation': { 
    label: 'Validation', 
    description: 'Run eCTD technical validation', 
    icon: <Shield className="w-5 h-5" />,
    color: 'accent-amber',
  },
  'gateway-submit': { 
    label: 'Gateway Submit', 
    description: 'Submit to regulatory gateway', 
    icon: <Send className="w-5 h-5" />,
    color: 'accent-green',
  },
  'acknowledgment': { 
    label: 'Acknowledgment', 
    description: 'Await gateway confirmation', 
    icon: <Clock className="w-5 h-5" />,
    color: 'accent-cyan',
  },
  'complete': { 
    label: 'Complete', 
    description: 'Submission accepted', 
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'accent-green',
  },
  'qa-review': { label: 'QA Review', description: 'Quality review', icon: <Shield className="w-5 h-5" />, color: 'accent-amber' },
  'submitted': { label: 'Submitted', description: 'Submitted to agency', icon: <Send className="w-5 h-5" />, color: 'accent-green' },
};

const STATUS_CONFIG: Record<PublishingStatus, { label: string; icon: React.ReactNode; bgColor: string; textColor: string }> = {
  'pending': { label: 'Pending', icon: <Clock className="w-4 h-4" />, bgColor: 'bg-slate-500/20', textColor: 'text-slate-400' },
  'in-progress': { label: 'In Progress', icon: <RefreshCw className="w-4 h-4 animate-spin" />, bgColor: 'bg-accent-blue/20', textColor: 'text-accent-blue' },
  'completed': { label: 'Completed', icon: <CheckCircle className="w-4 h-4" />, bgColor: 'bg-accent-green/20', textColor: 'text-accent-green' },
  'failed': { label: 'Failed', icon: <XCircle className="w-4 h-4" />, bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
  'blocked': { label: 'Blocked', icon: <AlertTriangle className="w-4 h-4" />, bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  'not-started': { label: 'Not Started', icon: <Clock className="w-4 h-4" />, bgColor: 'bg-surface-hover', textColor: 'text-text-muted' },
};

const GATEWAY_LABELS: Record<string, string> = {
  'fda-esg': 'FDA ESG',
  'ema-cesp': 'EMA CESP',
  'pmda-gateway': 'PMDA Gateway',
  'hc-cta': 'Health Canada CTA',
};

export function E2EPublishingDashboard({ finalizationWorkflowId, onClose }: E2EPublishingDashboardProps) {
  const toast = useToast();
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  
  const {
    createFromFinalization,
    orchestrateFullWorkflow,
    getWorkflowByFinalization,
    startPhase,
    createSequenceDraft,
    autoAssignDocuments,
    runSequenceValidation,
    submitToGateway,
  } = useEndToEndPublishing();
  
  const finStore = useDocumentFinalization();
  const finWorkflow = finStore.getWorkflow(finalizationWorkflowId);
  
  // Check for existing E2E workflow or create one
  const [workflowId, setWorkflowId] = useState<string | null>(() => {
    const existing = getWorkflowByFinalization(finalizationWorkflowId);
    return existing?.id || null;
  });
  
  const workflow = workflowId ? useEndToEndPublishing.getState().getWorkflow(workflowId) : null;
  const progressData = workflowId ? useE2EWorkflowProgress(workflowId) : null;

  const handleCreateWorkflow = () => {
    const id = createFromFinalization(finalizationWorkflowId, 'current-user');
    if (id) {
      setWorkflowId(id);
      toast.success('Publishing workflow created');
    } else {
      toast.error('Failed to create workflow - finalization must be locked');
    }
  };

  const handleOrchestrateFull = async () => {
    if (!workflowId) return;
    
    setIsOrchestrating(true);
    toast.info('Starting automated publishing workflow...');
    
    const result = await orchestrateFullWorkflow(workflowId);
    
    setIsOrchestrating(false);
    
    if (result.success) {
      toast.success('Publishing workflow completed successfully!');
    } else {
      toast.error(`Workflow stopped at ${PHASE_CONFIG[result.finalPhase].label}: ${result.error || 'Unknown error'}`);
    }
  };

  const handleStepThrough = async (phase: PublishingPhase) => {
    if (!workflowId) return;
    
    setIsOrchestrating(true);
    
    switch (phase) {
      case 'sequence-build':
        startPhase(workflowId, phase);
        const draftId = createSequenceDraft(workflowId);
        if (draftId) {
          const assigned = autoAssignDocuments(workflowId);
          toast.success(`Created sequence and assigned ${assigned} documents`);
        }
        useEndToEndPublishing.getState().completePhase(workflowId, phase);
        break;
        
      case 'validation':
        const valResult = await runSequenceValidation(workflowId);
        if (valResult.passed) {
          toast.success('Validation passed');
        } else {
          toast.error(`Validation failed: ${valResult.errors} errors`);
        }
        break;
        
      case 'gateway-submit':
        const wf = useEndToEndPublishing.getState().getWorkflow(workflowId);
        const gateway = wf?.region === 'fda' ? 'fda-esg' : 'ema-cesp';
        const sub = await submitToGateway(workflowId, gateway);
        if (sub.status === 'submitted') {
          toast.success(`Submitted to ${GATEWAY_LABELS[gateway]}`);
        }
        break;
    }
    
    setIsOrchestrating(false);
  };

  if (!finWorkflow) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-surface-elevated border border-border rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary">Finalization Not Found</h3>
          <p className="text-sm text-text-muted mt-2">The finalization workflow could not be found.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-accent-blue text-white rounded-lg text-sm">Close</button>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-surface-elevated border border-border rounded-xl w-[600px] shadow-2xl">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-green/20">
                <Rocket className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Ready to Publish</h2>
                <p className="text-sm text-text-muted">{finWorkflow.applicationNumber}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="flex items-center gap-4 p-4 bg-accent-green/10 border border-accent-green/30 rounded-lg mb-6">
              <Lock className="w-8 h-8 text-accent-green" />
              <div>
                <div className="text-sm font-medium text-text-primary">Document Finalized</div>
                <div className="text-xs text-text-muted">
                  QC complete • {finWorkflow.signatureRequirements.filter(s => s.status === 'signed').length} signatures • PDF generated
                </div>
              </div>
            </div>
            
            <h3 className="text-sm font-medium text-text-primary mb-3">Publishing Pipeline</h3>
            <div className="space-y-2 mb-6">
              {(['sequence-build', 'validation', 'gateway-submit', 'acknowledgment'] as PublishingPhase[]).map((phase, idx) => {
                const config = PHASE_CONFIG[phase];
                return (
                  <div key={phase} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center text-xs text-text-muted">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-text-primary">{config.label}</div>
                      <div className="text-xs text-text-muted">{config.description}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-text-muted" />
                  </div>
                );
              })}
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                className="px-6 py-2 bg-accent-green text-white rounded-lg text-sm hover:bg-accent-green/90 flex items-center gap-2"
              >
                <Rocket className="w-4 h-4" />
                Start Publishing
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[85vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-${PHASE_CONFIG[workflow.currentPhase].color}/20`}>
              {PHASE_CONFIG[workflow.currentPhase].icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Publishing Pipeline</h2>
              <p className="text-sm text-text-muted">{workflow.applicationNumber} • {PHASE_CONFIG[workflow.currentPhase].label}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-text-muted">
              {progressData?.progress || 0}% complete
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 border-b border-border bg-surface-card/50 flex-shrink-0">
          <div className="flex items-center gap-1">
            {workflow.milestones.map((milestone, idx) => {
              const config = PHASE_CONFIG[milestone.phase];
              const statusConfig = STATUS_CONFIG[milestone.status];
              const isActive = workflow.currentPhase === milestone.phase;
              
              return (
                <div key={milestone.phase} className="flex items-center flex-1">
                  <div className={`flex-1 h-2 rounded-full ${
                    milestone.status === 'completed' ? 'bg-accent-green' :
                    milestone.status === 'in-progress' ? 'bg-accent-blue' :
                    milestone.status === 'failed' ? 'bg-red-500' :
                    milestone.status === 'blocked' ? 'bg-amber-500' :
                    'bg-surface-card'
                  }`} />
                  {idx < workflow.milestones.length - 1 && (
                    <div className="w-1" />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-2">
            {workflow.milestones.slice(0, -1).map((milestone) => {
              const config = PHASE_CONFIG[milestone.phase];
              const statusConfig = STATUS_CONFIG[milestone.status];
              
              return (
                <div key={milestone.phase} className="text-center flex-1">
                  <div className={`text-xs ${statusConfig.textColor}`}>{config.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Milestones Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {workflow.milestones.filter(m => m.phase !== 'complete').map((milestone) => {
              const config = PHASE_CONFIG[milestone.phase];
              const statusConfig = STATUS_CONFIG[milestone.status];
              const isActive = workflow.currentPhase === milestone.phase;
              const canStep = isActive && milestone.status !== 'in-progress' && milestone.phase !== 'finalization';
              
              return (
                <div 
                  key={milestone.phase} 
                  className={`p-4 rounded-lg border ${
                    isActive ? 'border-accent-blue bg-accent-blue/5' :
                    milestone.status === 'completed' ? 'border-accent-green/30 bg-accent-green/5' :
                    milestone.status === 'failed' ? 'border-red-500/30 bg-red-500/5' :
                    'border-border bg-surface-card'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${statusConfig.bgColor}`}>
                        {config.icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-text-primary">{config.label}</div>
                        <div className="text-xs text-text-muted">{config.description}</div>
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                      {statusConfig.label}
                    </div>
                  </div>
                  
                  {milestone.completedAt && (
                    <div className="text-xs text-text-muted mt-2">
                      Completed: {new Date(milestone.completedAt).toLocaleString()}
                    </div>
                  )}
                  
                  {milestone.failureReason && (
                    <div className="text-xs text-red-400 mt-2">{milestone.failureReason}</div>
                  )}
                  
                  {milestone.blockedReason && (
                    <div className="text-xs text-amber-400 mt-2">{milestone.blockedReason}</div>
                  )}
                  
                  {canStep && (
                    <button
                      onClick={() => handleStepThrough(milestone.phase)}
                      disabled={isOrchestrating}
                      className="mt-3 w-full px-3 py-1.5 bg-accent-blue/20 text-accent-blue rounded text-xs hover:bg-accent-blue/30 flex items-center justify-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Execute Step
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Workflow Details */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Sequence Info */}
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Sequence</span>
              </div>
              {workflow.sequenceNumber ? (
                <>
                  <div className="text-lg font-bold text-text-primary">{workflow.sequenceNumber}</div>
                  <div className="text-xs text-text-muted">IR Response</div>
                </>
              ) : (
                <div className="text-sm text-text-muted">Not created</div>
              )}
            </div>
            
            {/* Documents */}
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Documents</span>
              </div>
              <div className="text-lg font-bold text-text-primary">
                {workflow.documentAssignments.filter(a => a.assigned).length}/{workflow.documentAssignments.length}
              </div>
              <div className="text-xs text-text-muted">Assigned</div>
            </div>
            
            {/* Gateway */}
            <div className="p-4 bg-surface-card rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-text-muted" />
                <span className="text-sm font-medium text-text-primary">Gateway</span>
              </div>
              {workflow.gatewaySubmission ? (
                <>
                  <div className="text-sm font-medium text-text-primary">
                    {GATEWAY_LABELS[workflow.gatewaySubmission.gateway]}
                  </div>
                  <div className="text-xs text-accent-green">
                    {workflow.gatewaySubmission.trackingNumber || workflow.gatewaySubmission.status}
                  </div>
                </>
              ) : (
                <div className="text-sm text-text-muted">Not submitted</div>
              )}
            </div>
          </div>

          {/* Document Assignments */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">Document Assignments</h3>
            <div className="space-y-2">
              {workflow.documentAssignments.map((assignment) => (
                <div key={assignment.slotId} className="flex items-center gap-3 p-3 bg-surface-card rounded-lg">
                  {assignment.assigned ? (
                    <CheckCircle className="w-4 h-4 text-accent-green" />
                  ) : (
                    <Clock className="w-4 h-4 text-text-muted" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm text-text-primary">{assignment.sectionNumber} - {assignment.sectionTitle}</div>
                    <div className="text-xs text-text-muted">{assignment.documentTitle}</div>
                  </div>
                  {assignment.validated && (
                    <span className="text-xs px-2 py-0.5 bg-accent-green/20 text-accent-green rounded">Validated</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Completion Status */}
          {workflow.currentPhase === 'complete' && (
            <div className="p-6 bg-accent-green/10 border border-accent-green/30 rounded-lg text-center">
              <CheckCircle className="w-12 h-12 text-accent-green mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-text-primary">Submission Complete</h3>
              <p className="text-sm text-text-muted mt-1">
                Successfully submitted to {workflow.gatewaySubmission ? GATEWAY_LABELS[workflow.gatewaySubmission.gateway] : 'gateway'}
              </p>
              {workflow.gatewaySubmission?.acknowledgmentId && (
                <div className="mt-3 text-xs text-accent-green">
                  Acknowledgment: {workflow.gatewaySubmission.acknowledgmentId}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Activity className="w-4 h-4" />
            {progressData?.status.blockers.length ? (
              <span className="text-amber-400">{progressData.status.blockers[0]}</span>
            ) : (
              <span>Ready</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
              Close
            </button>
            
            {workflow.currentPhase !== 'complete' && workflow.currentPhase !== 'acknowledgment' && (
              <button
                onClick={handleOrchestrateFull}
                disabled={isOrchestrating}
                className="px-6 py-2 bg-accent-green text-white rounded-lg text-sm hover:bg-accent-green/90 flex items-center gap-2 disabled:opacity-50"
              >
                {isOrchestrating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Auto-Complete Pipeline
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
