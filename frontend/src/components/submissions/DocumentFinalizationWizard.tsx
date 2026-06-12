

import { useState, useMemo } from 'react';
import {
  FileText, Check, X, ChevronRight, ChevronDown, AlertTriangle, Shield,
  Clock, CheckCircle, XCircle, RefreshCw, FileCheck, Send, Lock,
  Download, Eye, User, Clipboard, ChevronLeft, Sparkles, Package
} from 'lucide-react';
import {
  useDocumentFinalization,
  useWorkflowByPackage,
  FinalizationStep,
  FinalizationWorkflow,
  QCChecklistItem,
  SignatureRequirement,
  GeneratedPDF,
} from '@/store/useDocumentFinalization';
import { CorrespondencePackage } from '@/store/useHAQCorrespondenceBridge';
import { useToast } from '@/components/ui/Toast';

interface DocumentFinalizationWizardProps {
  package: CorrespondencePackage;
  onClose: () => void;
  onComplete?: (workflowId: string) => void;
}

const STEP_CONFIG: Record<FinalizationStep, { label: string; description: string; icon: React.ReactNode }> = {
  'draft': { label: 'Draft', description: 'Initial content preparation', icon: <FileText className="w-4 h-4" /> },
  'content-review': { label: 'Content Review', description: 'Review response content', icon: <Eye className="w-4 h-4" /> },
  'qc-checklist': { label: 'QC Checklist', description: 'Quality control verification', icon: <Clipboard className="w-4 h-4" /> },
  'signature-collection': { label: 'Signatures', description: 'Collect required approvals', icon: <Shield className="w-4 h-4" /> },
  'pdf-generation': { label: 'Generate PDF', description: 'Create submission-ready PDF', icon: <FileCheck className="w-4 h-4" /> },
  'final-review': { label: 'Final Review', description: 'Final verification before lock', icon: <CheckCircle className="w-4 h-4" /> },
  'locked': { label: 'Locked', description: 'Ready for submission', icon: <Lock className="w-4 h-4" /> },
};

const STEPS_ORDER: FinalizationStep[] = ['draft', 'content-review', 'qc-checklist', 'signature-collection', 'pdf-generation', 'final-review', 'locked'];

const qcCategoryLabels: Record<string, string> = {
  'content': 'Content Quality',
  'formatting': 'Formatting',
  'compliance': 'Regulatory Compliance',
  'accuracy': 'Data Accuracy',
};

export function DocumentFinalizationWizard({ package: pkg, onClose, onComplete }: DocumentFinalizationWizardProps) {
  const toast = useToast();
  const existingWorkflow = useWorkflowByPackage(pkg.id);
  const {
    createWorkflow,
    advanceStep,
    revertStep,
    initializeQCChecklist,
    updateQCItem,
    completeQCChecklist,
    collectSignature,
    declineSignature,
    configurePDFGeneration,
    generatePDF,
    generateCoverLetter,
    linkToSequence,
    lockForSubmission,
    getWorkflow,
    canAdvanceToStep,
  } = useDocumentFinalization();

  const [workflowId, setWorkflowId] = useState<string | null>(existingWorkflow?.id || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qcComments, setQcComments] = useState('');
  
  // Initialize workflow if not exists
  const initializeWorkflow = () => {
    const id = createWorkflow(pkg.id, 'current-user');
    if (id) {
      setWorkflowId(id);
      toast.success('Finalization workflow created');
    }
  };

  const workflow = workflowId ? getWorkflow(workflowId) : null;
  const currentStepIndex = workflow ? STEPS_ORDER.indexOf(workflow.currentStep) : 0;

  const handleAdvanceStep = async () => {
    if (!workflowId || !workflow) return;
    
    setIsProcessing(true);
    
    // Handle special step transitions
    if (workflow.currentStep === 'draft') {
      // Initialize QC when moving to content review
    } else if (workflow.currentStep === 'content-review') {
      initializeQCChecklist(workflowId);
    } else if (workflow.currentStep === 'signature-collection') {
      // Generate PDF when signatures are complete
      const pdf = await generatePDF(workflowId, 'current-user');
      if (pdf) {
        toast.success(`PDF generated: ${pdf.fileName}`);
      }
    }
    
    const success = advanceStep(workflowId, 'current-user');
    if (success) {
      toast.success(`Advanced to ${STEP_CONFIG[STEPS_ORDER[currentStepIndex + 1]].label}`);
    } else {
      const { blockers } = canAdvanceToStep(workflowId, STEPS_ORDER[currentStepIndex + 1]);
      toast.error(blockers[0] || 'Cannot advance');
    }
    
    setIsProcessing(false);
  };

  const handleRevertStep = () => {
    if (!workflowId) return;
    const success = revertStep(workflowId, 'current-user', 'Manual revert');
    if (success) {
      toast.warning('Reverted to previous step');
    }
  };

  const handleQCItemUpdate = (itemId: string, status: QCChecklistItem['status']) => {
    if (!workflowId) return;
    updateQCItem(workflowId, itemId, status, 'current-user');
  };

  const handleCompleteQC = () => {
    if (!workflowId) return;
    const result = completeQCChecklist(workflowId, 'current-user', qcComments);
    if (result) {
      toast.success(`QC completed: ${result.overallStatus}`);
      advanceStep(workflowId, 'current-user');
    } else {
      toast.error('Complete all QC items before finishing');
    }
  };

  const handleCollectSignature = (sigId: string) => {
    if (!workflowId) return;
    // In real app, this would open signature dialog
    const success = collectSignature(workflowId, sigId, 'current-user', 'Amanda Foster');
    if (success) {
      toast.success('Signature collected');
    }
  };

  const handleLockForSubmission = async () => {
    if (!workflowId || !workflow) return;
    
    setIsProcessing(true);
    
    // Link to sequence if not already
    if (!workflow.targetSequenceId) {
      linkToSequence(workflowId, 'seq-draft-001');
    }
    
    const success = lockForSubmission(workflowId, 'current-user');
    if (success) {
      toast.success('Document locked and ready for submission');
      onComplete?.(workflowId);
    } else {
      const { blockers } = canAdvanceToStep(workflowId, 'locked');
      toast.error(blockers[0] || 'Cannot lock document');
    }
    
    setIsProcessing(false);
  };

  if (!workflow) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-surface-elevated border border-border rounded-xl w-[600px] shadow-2xl">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent-purple/20">
                <Package className="w-5 h-5 text-accent-purple" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Document Finalization</h2>
                <p className="text-sm text-text-muted">{pkg.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
          
          <div className="p-6 text-center">
            <Sparkles className="w-12 h-12 text-accent-purple mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Start Finalization Workflow</h3>
            <p className="text-sm text-text-muted mb-6">
              This will guide you through content review, QC checklist, signature collection, 
              and PDF generation before locking for submission.
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 bg-surface-card rounded-lg text-center">
                <Clipboard className="w-5 h-5 text-accent-blue mx-auto mb-1" />
                <div className="text-xs text-text-muted">QC Checklist</div>
              </div>
              <div className="p-3 bg-surface-card rounded-lg text-center">
                <Shield className="w-5 h-5 text-accent-green mx-auto mb-1" />
                <div className="text-xs text-text-muted">Digital Signatures</div>
              </div>
              <div className="p-3 bg-surface-card rounded-lg text-center">
                <FileCheck className="w-5 h-5 text-accent-amber mx-auto mb-1" />
                <div className="text-xs text-text-muted">PDF Generation</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-3">
              <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                Cancel
              </button>
              <button
                onClick={initializeWorkflow}
                className="px-6 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/90 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Start Workflow
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { canAdvance, blockers } = canAdvanceToStep(workflowId!, STEPS_ORDER[currentStepIndex + 1] || 'locked');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[85vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent-purple/20">
              {STEP_CONFIG[workflow.currentStep].icon}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{pkg.title}</h2>
              <p className="text-sm text-text-muted">{pkg.applicationNumber} • {STEP_CONFIG[workflow.currentStep].label}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-card rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-3 border-b border-border bg-surface-card/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            {STEPS_ORDER.slice(0, -1).map((step, idx) => {
              const isComplete = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const config = STEP_CONFIG[step];
              
              return (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                    isComplete ? 'bg-accent-green/20 text-accent-green' :
                    isCurrent ? 'bg-accent-blue/20 text-accent-blue' :
                    'bg-surface-card text-text-muted'
                  }`}>
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : config.icon}
                    <span className="text-xs font-medium">{config.label}</span>
                  </div>
                  {idx < STEPS_ORDER.length - 2 && (
                    <ChevronRight className="w-4 h-4 text-text-muted mx-1" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {/* Content Review Step */}
          {workflow.currentStep === 'content-review' && (
            <ContentReviewStep workflow={workflow} pkg={pkg} />
          )}

          {/* QC Checklist Step */}
          {workflow.currentStep === 'qc-checklist' && workflow.qcChecklist && (
            <QCChecklistStep
              workflow={workflow}
              onUpdateItem={handleQCItemUpdate}
              comments={qcComments}
              onCommentsChange={setQcComments}
              onComplete={handleCompleteQC}
            />
          )}

          {/* Signature Collection Step */}
          {workflow.currentStep === 'signature-collection' && (
            <SignatureCollectionStep
              workflow={workflow}
              onCollectSignature={handleCollectSignature}
            />
          )}

          {/* PDF Generation Step */}
          {workflow.currentStep === 'pdf-generation' && (
            <PDFGenerationStep workflow={workflow} />
          )}

          {/* Final Review Step */}
          {workflow.currentStep === 'final-review' && (
            <FinalReviewStep workflow={workflow} pkg={pkg} onLock={handleLockForSubmission} isProcessing={isProcessing} />
          )}

          {/* Locked Step */}
          {workflow.currentStep === 'locked' && (
            <LockedStep workflow={workflow} />
          )}

          {/* Draft Step */}
          {workflow.currentStep === 'draft' && (
            <DraftStep pkg={pkg} />
          )}
        </div>

        {/* Footer */}
        {workflow.currentStep !== 'locked' && (
          <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handleRevertStep}
                  className="px-3 py-2 text-sm text-text-secondary hover:text-text-primary flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {blockers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-accent-amber">
                  <AlertTriangle className="w-4 h-4" />
                  {blockers[0]}
                </div>
              )}
              
              {workflow.currentStep === 'qc-checklist' ? (
                <button
                  onClick={handleCompleteQC}
                  disabled={isProcessing}
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Complete QC
                </button>
              ) : workflow.currentStep === 'final-review' ? (
                <button
                  onClick={handleLockForSubmission}
                  disabled={isProcessing || !canAdvance}
                  className="px-6 py-2 bg-accent-green text-white rounded-lg text-sm hover:bg-accent-green/90 flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Lock for Submission
                </button>
              ) : (
                <button
                  onClick={handleAdvanceStep}
                  disabled={isProcessing || !canAdvance}
                  className="px-6 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Continue
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-components for each step

function DraftStep({ pkg }: { pkg: CorrespondencePackage }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Response Content</h3>
      <p className="text-sm text-text-muted">Review the responses below before proceeding to content review.</p>
      
      <div className="space-y-3 max-h-96 overflow-auto">
        {pkg.responses.map((resp, idx) => (
          <div key={resp.id} className="p-4 bg-surface-card rounded-lg border border-border">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-text-primary">{resp.questionNumber}</span>
              <span className="text-xs px-2 py-0.5 bg-accent-blue/20 text-accent-blue rounded">{resp.discipline}</span>
            </div>
            <p className="text-sm text-text-secondary">{resp.responseText || 'No response text yet'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentReviewStep({ workflow, pkg }: { workflow: FinalizationWorkflow; pkg: CorrespondencePackage }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Content Review</h3>
      <p className="text-sm text-text-muted">Verify all response content is complete and accurate before QC.</p>
      
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-surface-card rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-blue">{pkg.questionCount}</div>
          <div className="text-xs text-text-muted">Questions</div>
        </div>
        <div className="p-4 bg-surface-card rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-green">{pkg.disciplines.length}</div>
          <div className="text-xs text-text-muted">Disciplines</div>
        </div>
        <div className="p-4 bg-surface-card rounded-lg text-center">
          <div className="text-2xl font-bold text-accent-amber">{pkg.responses.filter(r => r.ctdReferences.length > 0).length}</div>
          <div className="text-xs text-text-muted">With CTD Refs</div>
        </div>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-auto">
        {pkg.responses.map((resp) => (
          <div key={resp.id} className="p-3 bg-surface-card rounded-lg border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-sm text-text-primary">{resp.questionNumber}</span>
              <span className="text-xs text-text-muted">{resp.discipline}</span>
            </div>
            <span className="text-xs text-text-muted">{resp.responseText ? `${resp.responseText.length} chars` : 'Empty'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QCChecklistStep({
  workflow,
  onUpdateItem,
  comments,
  onCommentsChange,
  onComplete,
}: {
  workflow: FinalizationWorkflow;
  onUpdateItem: (itemId: string, status: QCChecklistItem['status']) => void;
  comments: string;
  onCommentsChange: (c: string) => void;
  onComplete: () => void;
}) {
  const items = workflow.qcChecklist?.items || [];
  const categories = Array.from(new Set(items.map(i => i.category)));
  
  const stats = {
    passed: items.filter(i => i.status === 'passed').length,
    failed: items.filter(i => i.status === 'failed').length,
    pending: items.filter(i => i.status === 'pending').length,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">QC Checklist</h3>
          <p className="text-sm text-text-muted">Complete all quality checks before collecting signatures.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-accent-green">{stats.passed} ✓</span>
          <span className="text-red-400">{stats.failed} ✗</span>
          <span className="text-text-muted">{stats.pending} pending</span>
        </div>
      </div>
      
      <div className="space-y-4 max-h-72 overflow-auto">
        {categories.map(category => (
          <div key={category}>
            <h4 className="text-sm font-medium text-text-secondary mb-2">{qcCategoryLabels[category]}</h4>
            <div className="space-y-2">
              {items.filter(i => i.category === category).map(item => (
                <div key={item.id} className={`p-3 rounded-lg border ${
                  item.status === 'passed' ? 'bg-accent-green/5 border-accent-green/30' :
                  item.status === 'failed' ? 'bg-red-500/5 border-red-500/30' :
                  'bg-surface-card border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.status === 'passed' && <CheckCircle className="w-4 h-4 text-accent-green" />}
                      {item.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
                      {item.status === 'pending' && <Clock className="w-4 h-4 text-text-muted" />}
                      <span className="text-sm text-text-primary">{item.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        item.severity === 'major' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{item.severity}</span>
                    </div>
                    {item.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateItem(item.id, 'passed')}
                          className="p-1.5 hover:bg-accent-green/20 rounded text-text-muted hover:text-accent-green"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onUpdateItem(item.id, 'failed')}
                          className="p-1.5 hover:bg-red-500/20 rounded text-text-muted hover:text-red-400"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-1 ml-6">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div>
        <label className="text-sm font-medium text-text-primary mb-2 block">QC Comments</label>
        <textarea
          value={comments}
          onChange={(e) => onCommentsChange(e.target.value)}
          placeholder="Add any comments or notes..."
          className="w-full h-20 px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue resize-none"
        />
      </div>
    </div>
  );
}

function SignatureCollectionStep({
  workflow,
  onCollectSignature,
}: {
  workflow: FinalizationWorkflow;
  onCollectSignature: (sigId: string) => void;
}) {
  const signatures = workflow.signatureRequirements;
  const collected = signatures.filter(s => s.status === 'signed').length;
  const required = signatures.filter(s => s.required).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Signature Collection</h3>
          <p className="text-sm text-text-muted">Collect required approvals in order.</p>
        </div>
        <div className="text-sm text-text-muted">{collected}/{required} signatures collected</div>
      </div>
      
      <div className="space-y-3">
        {signatures.sort((a, b) => a.order - b.order).map((sig) => {
          const isNext = sig.status === 'pending' && 
            signatures.filter(s => s.order < sig.order && s.required).every(s => s.status === 'signed');
          
          return (
            <div key={sig.id} className={`p-4 rounded-lg border ${
              sig.status === 'signed' ? 'bg-accent-green/5 border-accent-green/30' :
              sig.status === 'declined' ? 'bg-red-500/5 border-red-500/30' :
              isNext ? 'bg-accent-blue/5 border-accent-blue/30' :
              'bg-surface-card border-border'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    sig.status === 'signed' ? 'bg-accent-green/20' :
                    sig.status === 'declined' ? 'bg-red-500/20' :
                    'bg-surface-card'
                  }`}>
                    {sig.status === 'signed' ? <Check className="w-4 h-4 text-accent-green" /> :
                     sig.status === 'declined' ? <X className="w-4 h-4 text-red-400" /> :
                     <User className="w-4 h-4 text-text-muted" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{sig.roleName}</span>
                      {sig.required && <span className="text-xs text-accent-amber">Required</span>}
                    </div>
                    <p className="text-xs text-text-muted">{sig.meaning}</p>
                    {sig.signerName && (
                      <p className="text-xs text-accent-green mt-1">Signed by {sig.signerName} • {sig.signedAt?.split('T')[0]}</p>
                    )}
                  </div>
                </div>
                
                {sig.status === 'pending' && isNext && (
                  <button
                    onClick={() => onCollectSignature(sig.id)}
                    className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm hover:bg-accent-blue/90 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Sign
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PDFGenerationStep({ workflow }: { workflow: FinalizationWorkflow }) {
  const pdf = workflow.generatedPDF;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">PDF Generation</h3>
      <p className="text-sm text-text-muted">Response document has been generated.</p>
      
      {pdf && (
        <div className="p-4 bg-surface-card rounded-lg border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-blue/20 rounded-lg flex items-center justify-center">
              <FileCheck className="w-6 h-6 text-accent-blue" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-text-primary">{pdf.fileName}</div>
              <div className="text-xs text-text-muted mt-1">
                {pdf.pageCount} pages • {Math.round(pdf.fileSize / 1024)} KB • {pdf.pdfVersion}
              </div>
              {pdf.validated && (
                <div className="text-xs text-accent-green mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Validated
                </div>
              )}
            </div>
            <button className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-text-primary">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FinalReviewStep({
  workflow,
  pkg,
  onLock,
  isProcessing,
}: {
  workflow: FinalizationWorkflow;
  pkg: CorrespondencePackage;
  onLock: () => void;
  isProcessing: boolean;
}) {
  const pdf = workflow.generatedPDF;
  const sigCount = workflow.signatureRequirements.filter(s => s.status === 'signed').length;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">Final Review</h3>
      <p className="text-sm text-text-muted">Verify all items before locking for submission.</p>
      
      <div className="space-y-3">
        <div className="p-4 bg-surface-card rounded-lg border border-border flex items-center gap-4">
          <CheckCircle className="w-5 h-5 text-accent-green" />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">QC Checklist</div>
            <div className="text-xs text-text-muted">Completed: {workflow.qcChecklist?.overallStatus}</div>
          </div>
        </div>
        
        <div className="p-4 bg-surface-card rounded-lg border border-border flex items-center gap-4">
          <CheckCircle className="w-5 h-5 text-accent-green" />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">Signatures</div>
            <div className="text-xs text-text-muted">{sigCount} signatures collected</div>
          </div>
        </div>
        
        <div className="p-4 bg-surface-card rounded-lg border border-border flex items-center gap-4">
          {pdf ? <CheckCircle className="w-5 h-5 text-accent-green" /> : <Clock className="w-5 h-5 text-text-muted" />}
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">Response PDF</div>
            <div className="text-xs text-text-muted">{pdf ? `${pdf.fileName} (${pdf.pageCount} pages)` : 'Not generated'}</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-accent-amber/10 border border-accent-amber/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-accent-amber flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-text-primary">Ready to Lock</div>
            <p className="text-xs text-text-muted mt-1">
              Once locked, this document cannot be modified. It will be marked as ready for submission to the regulatory gateway.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LockedStep({ workflow }: { workflow: FinalizationWorkflow }) {
  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-accent-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Lock className="w-8 h-8 text-accent-green" />
      </div>
      <h3 className="text-xl font-semibold text-text-primary mb-2">Document Locked</h3>
      <p className="text-sm text-text-muted mb-4">Ready for submission to regulatory gateway</p>
      
      <div className="text-xs text-text-muted">
        Locked at: {workflow.lockedAt?.split('T')[0]} {workflow.lockedAt?.split('T')[1]?.substring(0, 5)}
      </div>
    </div>
  );
}
