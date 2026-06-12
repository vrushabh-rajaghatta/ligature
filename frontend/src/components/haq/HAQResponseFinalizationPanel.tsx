

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Clock, FileText, Send, 
  ShieldCheck, Pen, Eye, ChevronRight, X, Lock, Unlock,
  FileCheck, User, Calendar, Info, AlertCircle, Download,
  Package, RefreshCw, ChevronDown, ChevronUp, Clipboard, Check,
  Key, History, Fingerprint, Users, Building2
} from 'lucide-react';
import { HAQuestion, HAQDiscipline } from '@/types/haq';
import {
  ResponseFinalizationState, FinalizationStatus, SignatureType,
  ElectronicSignature, QCValidationResult, QCCheck, QCCheckSeverity,
  initializeFinalization, runQCValidation, applySignature,
  getNextRequiredSignature, allSignaturesComplete, getStatusAfterSignature,
  createAuditEntry, formatSignatureChain, generateComplianceCertificate,
  SIGNATURE_TITLES, SIGNATURE_MEANINGS, HAQ_QC_CHECKS
} from '@/services/haq-response-finalization-service';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { Button, IconButton } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { useCrossModuleStore } from '@/store/useCrossModuleStore';

// ============================================================================
// TYPES
// ============================================================================

interface HAQResponseFinalizationPanelProps {
  questions: HAQuestion[];
  correspondenceType: string;
  applicationNumber: string;
  productName: string;
  onComplete: (packageId: string) => void;
  onCancel: () => void;
}

type WizardStep = 'review' | 'qc' | 'signatures' | 'package' | 'complete';

// ============================================================================
// COLOR MAPS
// ============================================================================

const statusColorMap: Record<FinalizationStatus, BadgeColor> = {
  'draft': 'slate',
  'author-signed': 'blue',
  'discipline-reviewed': 'purple',
  'qc-pending': 'amber',
  'qc-passed': 'teal',
  'regulatory-approved': 'emerald',
  'ready-for-packaging': 'green',
  'packaged': 'green',
  'submitted': 'green',
};

const qcStatusColorMap: Record<string, BadgeColor> = {
  'passed': 'green',
  'failed': 'red',
  'warning': 'amber',
  'skipped': 'slate',
  'pending': 'blue',
};

const qcSeverityColorMap: Record<QCCheckSeverity, BadgeColor> = {
  'critical': 'red',
  'major': 'amber',
  'minor': 'slate',
  'info': 'blue',
};

const signatureTypeColorMap: Record<SignatureType, BadgeColor> = {
  'author': 'blue',
  'reviewer': 'purple',
  'qc': 'teal',
  'regulatory': 'emerald',
  'executive': 'green',
};

// ============================================================================
// MOCK USERS (In production, this would come from auth context)
// ============================================================================

const MOCK_USERS: Record<SignatureType, { id: string; name: string; title: string }> = {
  'author': { id: 'user-author', name: 'Jennifer Martinez', title: 'Sr. Regulatory Writer' },
  'reviewer': { id: 'user-reviewer', name: 'Dr. Michael Chen', title: 'CMC Subject Matter Expert' },
  'qc': { id: 'user-qc', name: 'Sarah Thompson', title: 'QC Specialist' },
  'regulatory': { id: 'user-reg', name: 'David Park', title: 'Director, Regulatory Affairs' },
  'executive': { id: 'user-exec', name: 'Dr. Elizabeth Warren', title: 'VP Regulatory Affairs' },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HAQResponseFinalizationPanel({
  questions,
  correspondenceType,
  applicationNumber,
  productName,
  onComplete,
  onCancel,
}: HAQResponseFinalizationPanelProps) {
  const toast = useToast();
  const createHandoff = useCrossModuleStore(s => s.createHandoff);
  
  // State
  const [step, setStep] = useState<WizardStep>('review');
  const [finalizationState, setFinalizationState] = useState<ResponseFinalizationState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Record<string, boolean>>({});
  const [signatureReason, setSignatureReason] = useState('');
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [acknowledgeLegal, setAcknowledgeLegal] = useState(false);
  
  // Initialize finalization state
  useEffect(() => {
    if (!finalizationState && questions.length > 0) {
      const state = initializeFinalization(
        questions,
        correspondenceType,
        'current-user',
        'Current User'
      );
      setFinalizationState(state);
    }
  }, [questions, correspondenceType, finalizationState]);
  
  // Derived state
  const disciplines = useMemo(() => 
    Array.from(new Set(questions.map(q => q.discipline))),
    [questions]
  );
  
  const totalResponseLength = useMemo(() =>
    questions.reduce((sum, q) => sum + (q.responseText?.length || q.suggestedResponse?.length || 0), 0),
    [questions]
  );
  
  const attachments = useMemo(() =>
    questions.flatMap(q => q.attachments || []),
    [questions]
  );
  
  const nextSignature = useMemo(() =>
    finalizationState ? getNextRequiredSignature(finalizationState) : null,
    [finalizationState]
  );
  
  const signatureProgress = useMemo(() => {
    if (!finalizationState) return 0;
    return (finalizationState.signatures.length / finalizationState.requiredSignatures.length) * 100;
  }, [finalizationState]);
  
  // Handlers
  const handleRunQC = useCallback(async () => {
    if (!finalizationState) return;
    
    setIsProcessing(true);
    
    // Simulate async QC run
    await new Promise(r => setTimeout(r, 1500));
    
    const result = runQCValidation(
      finalizationState,
      questions,
      attachments.map(a => ({ name: a.name, size: a.size, checksum: undefined })),
      'current-user'
    );
    
    setFinalizationState(prev => prev ? {
      ...prev,
      qcValidation: result,
      status: result.overallStatus !== 'failed' ? 'qc-passed' : prev.status,
      auditTrail: [
        ...prev.auditTrail,
        createAuditEntry(
          'qc-validation-run',
          'current-user',
          'Current User',
          `QC validation completed: ${result.overallStatus}`,
          prev.status,
          result.overallStatus !== 'failed' ? 'qc-passed' : prev.status
        ),
      ],
    } : null);
    
    setIsProcessing(false);
    
    if (result.overallStatus === 'failed') {
      toast.error(`QC Failed: ${result.criticalFailures} critical issue(s)`);
    } else if (result.overallStatus === 'passed-with-warnings') {
      toast.warning('QC passed with warnings - review before proceeding');
    } else {
      toast.success('QC validation passed');
    }
  }, [finalizationState, questions, attachments, toast]);
  
  const handleApplySignature = useCallback(async () => {
    if (!finalizationState || !nextSignature || !signatureReason || !acknowledgeLegal) return;
    
    setIsProcessing(true);
    
    // Get mock user for this signature type
    const user = MOCK_USERS[nextSignature];
    
    // Build document content for hash (in production, this would be the actual PDF)
    const documentContent = questions
      .map(q => `${q.questionNumber}: ${q.responseText || q.suggestedResponse}`)
      .join('\n');
    
    const result = await applySignature(
      finalizationState,
      nextSignature,
      user.id,
      user.name,
      user.title,
      signatureReason,
      documentContent
    );
    
    if (result.success && result.signature) {
      const newStatus = getStatusAfterSignature(finalizationState, nextSignature);
      
      setFinalizationState(prev => prev ? {
        ...prev,
        signatures: [...prev.signatures, result.signature!],
        status: newStatus,
        auditTrail: [
          ...prev.auditTrail,
          createAuditEntry(
            'signature-applied',
            user.id,
            user.name,
            `${SIGNATURE_TITLES[nextSignature]} signature applied: ${signatureReason}`,
            prev.status,
            newStatus
          ),
        ],
      } : null);
      
      toast.success(`${SIGNATURE_TITLES[nextSignature]} signature applied`);
      setSignatureReason('');
      setAcknowledgeLegal(false);
    } else {
      toast.error(result.error || 'Failed to apply signature');
    }
    
    setIsProcessing(false);
  }, [finalizationState, nextSignature, signatureReason, acknowledgeLegal, questions, toast]);
  
  const handleCreatePackage = useCallback(async () => {
    if (!finalizationState || !allSignaturesComplete(finalizationState)) return;
    
    setIsProcessing(true);
    
    // Simulate package generation
    await new Promise(r => setTimeout(r, 2000));
    
    // Create cross-module handoff
    const handoffId = createHandoff({
      type: 'haq-response-to-m1',
      sourceModule: 'haq',
      targetModule: 'submissions',
      sourceId: finalizationState.id,
      sourceTitle: `${applicationNumber} ${correspondenceType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Package`,
      targetSection: '1.12.1',
      createdBy: 'current-user',
      metadata: {
        correspondenceType,
        applicationNumber,
        productName,
        questionCount: questions.length,
        disciplines,
        responses: questions.map(q => ({
          questionNumber: q.questionNumber,
          discipline: q.discipline,
          responseText: q.responseText || q.suggestedResponse || '',
          attachments: q.attachments?.map(a => a.name) || [],
        })),
        signatureChain: finalizationState.signatures.map(s => ({
          type: s.signatureType,
          signedBy: s.signedByName,
          signedAt: s.signedAt,
        })),
        qcResult: finalizationState.qcValidation?.overallStatus,
        complianceCertificate: generateComplianceCertificate(finalizationState),
      },
    });
    
    setFinalizationState(prev => prev ? {
      ...prev,
      status: 'packaged',
      packageId: handoffId,
      auditTrail: [
        ...prev.auditTrail,
        createAuditEntry(
          'package-created',
          'current-user',
          'Current User',
          `Response package created and sent to Submissions module`,
          'ready-for-packaging',
          'packaged'
        ),
      ],
    } : null);
    
    setIsProcessing(false);
    setStep('complete');
    toast.success('Package created and sent to Submissions');
  }, [finalizationState, createHandoff, applicationNumber, correspondenceType, productName, questions, disciplines, toast]);
  
  // Step navigation
  const canProceed = useMemo(() => {
    switch (step) {
      case 'review':
        return questions.every(q => q.responseText || q.suggestedResponse);
      case 'qc':
        return finalizationState?.qcValidation?.overallStatus !== 'failed';
      case 'signatures':
        return finalizationState ? allSignaturesComplete(finalizationState) : false;
      case 'package':
        return true;
      default:
        return false;
    }
  }, [step, questions, finalizationState]);
  
  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'review', label: 'Review', icon: <Eye className="w-4 h-4" /> },
    { key: 'qc', label: 'QC Validation', icon: <ShieldCheck className="w-4 h-4" /> },
    { key: 'signatures', label: 'Signatures', icon: <Pen className="w-4 h-4" /> },
    { key: 'package', label: 'Package', icon: <Package className="w-4 h-4" /> },
    { key: 'complete', label: 'Complete', icon: <CheckCircle className="w-4 h-4" /> },
  ];
  
  const currentStepIndex = steps.findIndex(s => s.key === step);
  
  if (!finalizationState) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-accent-blue" />
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-elevated border border-border rounded-xl w-[900px] max-h-[90vh] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/10 rounded-lg">
              <FileCheck className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Finalize Response Package</h2>
              <p className="text-sm text-text-muted">{applicationNumber} • {questions.length} question(s)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={statusColorMap[finalizationState.status]} size="sm">
              {finalizationState.status.replace(/-/g, ' ')}
            </Badge>
            <button
              onClick={() => setShowAuditTrail(!showAuditTrail)}
              className="p-2 hover:bg-surface-card rounded-lg transition-colors"
              title="View Audit Trail"
            >
              <History className="w-4 h-4 text-text-muted" />
            </button>
            <button onClick={onCancel} className="p-2 hover:bg-surface-card rounded-lg">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </div>
        
        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center">
                {i > 0 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    i <= currentStepIndex ? 'bg-accent-blue' : 'bg-border'
                  }`} />
                )}
                <button
                  onClick={() => i < currentStepIndex && setStep(s.key)}
                  disabled={i > currentStepIndex}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    s.key === step
                      ? 'bg-accent-blue/10 text-accent-blue'
                      : i < currentStepIndex
                        ? 'text-text-secondary hover:bg-surface-card cursor-pointer'
                        : 'text-text-muted cursor-not-allowed'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    i < currentStepIndex
                      ? 'bg-accent-green text-white'
                      : s.key === step
                        ? 'bg-accent-blue text-white'
                        : 'bg-surface-card text-text-muted'
                  }`}>
                    {i < currentStepIndex ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  <span className="text-sm font-medium">{s.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-accent-blue/5 border border-accent-blue/20 rounded-lg">
                <Info className="w-5 h-5 text-accent-blue mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-text-primary">Review Response Package</div>
                  <p className="text-sm text-text-muted mt-1">
                    Verify all responses are complete and accurate before proceeding to QC validation.
                  </p>
                </div>
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-surface-card rounded-lg">
                  <div className="text-2xl font-bold text-text-primary">{questions.length}</div>
                  <div className="text-sm text-text-muted">Questions</div>
                </div>
                <div className="p-4 bg-surface-card rounded-lg">
                  <div className="text-2xl font-bold text-text-primary">{disciplines.length}</div>
                  <div className="text-sm text-text-muted">Disciplines</div>
                </div>
                <div className="p-4 bg-surface-card rounded-lg">
                  <div className="text-2xl font-bold text-text-primary">{attachments.length}</div>
                  <div className="text-sm text-text-muted">Attachments</div>
                </div>
                <div className="p-4 bg-surface-card rounded-lg">
                  <div className="text-2xl font-bold text-text-primary">{Math.ceil(totalResponseLength / 1000)}k</div>
                  <div className="text-sm text-text-muted">Characters</div>
                </div>
              </div>
              
              {/* Questions List */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-text-secondary">Questions & Responses</h3>
                {questions.map((q, i) => (
                  <div key={q.id} className="p-4 bg-surface-card rounded-lg border border-border">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-text-primary">{q.questionNumber}</span>
                          <Badge color={qcSeverityColorMap[q.priority === 'critical' ? 'critical' : q.priority === 'major' ? 'major' : 'minor']} size="xs">
                            {q.discipline}
                          </Badge>
                          {q.ctdSection && (
                            <span className="text-xs text-text-muted">CTD {q.ctdSection}</span>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary line-clamp-2">{q.questionText}</p>
                        {(q.responseText || q.suggestedResponse) ? (
                          <div className="mt-2 p-2 bg-surface rounded border-l-2 border-accent-green">
                            <p className="text-sm text-text-primary line-clamp-2">
                              {q.responseText || q.suggestedResponse}
                            </p>
                          </div>
                        ) : (
                          <div className="mt-2 p-2 bg-red-500/10 rounded border-l-2 border-red-500">
                            <p className="text-sm text-red-400">No response provided</p>
                          </div>
                        )}
                      </div>
                      {(q.responseText || q.suggestedResponse) ? (
                        <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* QC Validation Step */}
          {step === 'qc' && (
            <div className="space-y-6">
              {!finalizationState.qcValidation ? (
                <>
                  <div className="flex items-start gap-4 p-4 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-accent-amber mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-text-primary">Quality Control Validation</div>
                      <p className="text-sm text-text-muted mt-1">
                        Run {HAQ_QC_CHECKS.length} automated checks to ensure regulatory compliance before signature collection.
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-surface-card rounded-lg border border-border text-center">
                    <ShieldCheck className="w-12 h-12 text-accent-amber mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">Ready for QC Validation</h3>
                    <p className="text-sm text-text-muted mb-4">
                      Click below to run automated quality control checks
                    </p>
                    <Button
                      onClick={handleRunQC}
                      variant="primary"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Running Validation...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Run QC Validation
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* QC Result Summary */}
                  <div className={`flex items-start gap-4 p-4 rounded-lg ${
                    finalizationState.qcValidation.overallStatus === 'passed'
                      ? 'bg-accent-green/5 border border-accent-green/20'
                      : finalizationState.qcValidation.overallStatus === 'passed-with-warnings'
                        ? 'bg-accent-amber/5 border border-accent-amber/20'
                        : 'bg-red-500/5 border border-red-500/20'
                  }`}>
                    {finalizationState.qcValidation.overallStatus === 'passed' ? (
                      <CheckCircle className="w-5 h-5 text-accent-green mt-0.5" />
                    ) : finalizationState.qcValidation.overallStatus === 'passed-with-warnings' ? (
                      <AlertTriangle className="w-5 h-5 text-accent-amber mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">
                        QC Validation {finalizationState.qcValidation.overallStatus === 'passed' ? 'Passed' : 
                          finalizationState.qcValidation.overallStatus === 'passed-with-warnings' ? 'Passed with Warnings' : 'Failed'}
                      </div>
                      <p className="text-sm text-text-muted mt-1">
                        {finalizationState.qcValidation.criticalFailures > 0 && 
                          `${finalizationState.qcValidation.criticalFailures} critical, `}
                        {finalizationState.qcValidation.majorFailures > 0 && 
                          `${finalizationState.qcValidation.majorFailures} major, `}
                        {finalizationState.qcValidation.warnings > 0 && 
                          `${finalizationState.qcValidation.warnings} warnings`}
                        {finalizationState.qcValidation.criticalFailures === 0 && 
                         finalizationState.qcValidation.majorFailures === 0 && 
                         finalizationState.qcValidation.warnings === 0 && 
                          'All checks passed'}
                      </p>
                    </div>
                    <Button
                      onClick={handleRunQC}
                      variant="ghost"
                      size="sm"
                      disabled={isProcessing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                      Re-run
                    </Button>
                  </div>
                  
                  {/* QC Checks Detail */}
                  <div className="space-y-2">
                    {(['critical', 'major', 'minor', 'info'] as QCCheckSeverity[]).map(severity => {
                      const checks = finalizationState.qcValidation!.checks.filter(c => c.severity === severity);
                      if (checks.length === 0) return null;
                      
                      return (
                        <div key={severity} className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-text-muted">
                            <Badge color={qcSeverityColorMap[severity]} size="xs">{severity}</Badge>
                            <span>{checks.length} check(s)</span>
                          </div>
                          {checks.map(check => (
                            <div
                              key={check.id}
                              className="p-3 bg-surface-card rounded-lg border border-border"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {check.status === 'passed' ? (
                                    <CheckCircle className="w-4 h-4 text-accent-green" />
                                  ) : check.status === 'failed' ? (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  ) : check.status === 'warning' ? (
                                    <AlertTriangle className="w-4 h-4 text-accent-amber" />
                                  ) : (
                                    <Clock className="w-4 h-4 text-text-muted" />
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-text-primary">{check.name}</div>
                                    <div className="text-xs text-text-muted">{check.description}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {check.autoFix && check.status !== 'passed' && (
                                    <Button variant="ghost" size="sm">
                                      Auto-Fix
                                    </Button>
                                  )}
                                  <Badge color={qcStatusColorMap[check.status]} size="xs">
                                    {check.status}
                                  </Badge>
                                </div>
                              </div>
                              {check.details && (
                                <div className="mt-2 text-xs text-text-muted pl-7">{check.details}</div>
                              )}
                              {check.regulatoryBasis && (
                                <div className="mt-1 text-xs text-accent-blue pl-7">
                                  Ref: {check.regulatoryBasis}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
          
          {/* Signatures Step */}
          {step === 'signatures' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-accent-purple/5 border border-accent-purple/20 rounded-lg">
                <Fingerprint className="w-5 h-5 text-accent-purple mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-text-primary">21 CFR Part 11 Electronic Signatures</div>
                  <p className="text-sm text-text-muted mt-1">
                    Collect legally binding electronic signatures from required approvers.
                  </p>
                </div>
              </div>
              
              {/* Signature Progress */}
              <div className="p-4 bg-surface-card rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-secondary">Signature Progress</span>
                  <span className="text-sm font-medium text-text-primary">
                    {finalizationState.signatures.length} of {finalizationState.requiredSignatures.length}
                  </span>
                </div>
                <ProgressBar value={signatureProgress} color="purple" size="md" />
              </div>
              
              {/* Signature Chain */}
              <div className="space-y-3">
                {finalizationState.requiredSignatures.map((sigType, i) => {
                  const existingSig = finalizationState.signatures.find(s => s.signatureType === sigType);
                  const isNext = sigType === nextSignature;
                  const isPending = !existingSig && !isNext;
                  
                  return (
                    <div
                      key={sigType}
                      className={`p-4 rounded-lg border ${
                        existingSig
                          ? 'bg-accent-green/5 border-accent-green/20'
                          : isNext
                            ? 'bg-accent-blue/5 border-accent-blue/20'
                            : 'bg-surface-card border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            existingSig
                              ? 'bg-accent-green text-white'
                              : isNext
                                ? 'bg-accent-blue text-white'
                                : 'bg-surface text-text-muted'
                          }`}>
                            {existingSig ? (
                              <Check className="w-4 h-4" />
                            ) : isNext ? (
                              <Pen className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {SIGNATURE_TITLES[sigType]}
                            </div>
                            <div className="text-xs text-text-muted">
                              {SIGNATURE_MEANINGS[sigType].replace(/-/g, ' ')}
                            </div>
                          </div>
                        </div>
                        
                        {existingSig ? (
                          <div className="text-right">
                            <div className="text-sm font-medium text-text-primary">{existingSig.signedByName}</div>
                            <div className="text-xs text-text-muted">
                              {new Date(existingSig.signedAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <Badge color={isNext ? 'blue' : 'slate'} size="sm">
                            {isNext ? 'Next' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                      
                      {existingSig && (
                        <div className="mt-3 pl-11 text-xs text-text-muted">
                          <span className="text-text-secondary">Reason:</span> {existingSig.reason}
                        </div>
                      )}
                      
                      {/* Signature Form for Next Signature */}
                      {isNext && (
                        <div className="mt-4 pl-11 space-y-4">
                          <div className="p-3 bg-surface rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-text-muted" />
                              <span className="text-sm text-text-secondary">Signing as:</span>
                              <span className="text-sm font-medium text-text-primary">
                                {MOCK_USERS[sigType].name}
                              </span>
                            </div>
                            <div className="text-xs text-text-muted">
                              {MOCK_USERS[sigType].title}
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm text-text-secondary mb-1">
                              Reason for Signature *
                            </label>
                            <textarea
                              value={signatureReason}
                              onChange={e => setSignatureReason(e.target.value)}
                              placeholder="Enter reason for applying this signature..."
                              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue"
                              rows={2}
                            />
                          </div>
                          
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={acknowledgeLegal}
                              onChange={e => setAcknowledgeLegal(e.target.checked)}
                              className="mt-1 rounded border-border"
                            />
                            <span className="text-xs text-text-muted">
                              I acknowledge that this electronic signature is legally binding and 
                              equivalent to a handwritten signature per 21 CFR Part 11. I certify 
                              that I have reviewed the content being signed and it is accurate 
                              and complete to the best of my knowledge.
                            </span>
                          </label>
                          
                          <Button
                            onClick={handleApplySignature}
                            variant="primary"
                            disabled={!signatureReason || !acknowledgeLegal || isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Applying Signature...
                              </>
                            ) : (
                              <>
                                <Key className="w-4 h-4" />
                                Apply Electronic Signature
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Package Step */}
          {step === 'package' && (
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-accent-green/5 border border-accent-green/20 rounded-lg">
                <Package className="w-5 h-5 text-accent-green mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-text-primary">Generate Response Package</div>
                  <p className="text-sm text-text-muted mt-1">
                    All signatures collected. Ready to generate the final response package for Module 1.12.1.
                  </p>
                </div>
              </div>
              
              {/* Package Preview */}
              <div className="p-6 bg-surface-card rounded-lg border border-border">
                <h3 className="text-sm font-medium text-text-secondary mb-4">Package Contents</h3>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                    <FileText className="w-5 h-5 text-accent-blue" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">Cover Letter</div>
                      <div className="text-xs text-text-muted">m1-2-cover-letter.pdf</div>
                    </div>
                    <Badge color="green" size="xs">Auto-generated</Badge>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                    <FileText className="w-5 h-5 text-accent-purple" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">Response Document</div>
                      <div className="text-xs text-text-muted">m1-12-1-response-to-questions.pdf</div>
                    </div>
                    <Badge color="blue" size="xs">{questions.length} responses</Badge>
                  </div>
                  
                  {attachments.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                      <FileText className="w-5 h-5 text-accent-amber" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">Supporting Documents</div>
                        <div className="text-xs text-text-muted">m1-12-2-supporting-documents/</div>
                      </div>
                      <Badge color="amber" size="xs">{attachments.length} files</Badge>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-accent-green" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">Compliance Certificate</div>
                      <div className="text-xs text-text-muted">21 CFR Part 11 signature record</div>
                    </div>
                    <Badge color="green" size="xs">Included</Badge>
                  </div>
                </div>
                
                {/* Signature Summary */}
                <div className="mt-6 pt-4 border-t border-border">
                  <h4 className="text-xs font-medium text-text-secondary mb-2">Signature Chain</h4>
                  <div className="text-xs text-text-muted">
                    {formatSignatureChain(finalizationState.signatures)}
                  </div>
                </div>
              </div>
              
              {/* Create Package Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleCreatePackage}
                  variant="primary"
                  size="lg"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Creating Package...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Create Package & Send to Submissions
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {/* Complete Step */}
          {step === 'complete' && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-accent-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-accent-green" />
              </div>
              <h3 className="text-xl font-semibold text-text-primary mb-2">Package Complete</h3>
              <p className="text-text-muted mb-6">
                Response package has been created and sent to the Submissions module.
              </p>
              
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-card rounded-lg border border-border mb-6">
                <Building2 className="w-4 h-4 text-accent-blue" />
                <span className="text-sm text-text-secondary">Target:</span>
                <span className="text-sm font-medium text-text-primary">Module 1.12.1 - Response to Questions</span>
              </div>
              
              <div className="flex justify-center gap-3">
                <Button variant="secondary" onClick={onCancel}>
                  <FileText className="w-4 h-4" />
                  Return to HAQ
                </Button>
                <Button variant="primary" onClick={() => onComplete(finalizationState.packageId || '')}>
                  <Send className="w-4 h-4" />
                  Go to Submissions
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Navigation */}
        {step !== 'complete' && (
          <div className="px-6 py-4 border-t border-border flex justify-between flex-shrink-0">
            <Button
              variant="ghost"
              onClick={() => {
                const prevIndex = currentStepIndex - 1;
                if (prevIndex >= 0) setStep(steps[prevIndex].key);
              }}
              disabled={currentStepIndex === 0}
            >
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const nextIndex = currentStepIndex + 1;
                if (nextIndex < steps.length) setStep(steps[nextIndex].key);
              }}
              disabled={!canProceed}
            >
              {step === 'package' ? 'Review Package' : 'Continue'}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        {/* Audit Trail Drawer */}
        {showAuditTrail && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-surface-elevated border-l border-border shadow-xl overflow-auto">
            <div className="p-4 border-b border-border flex items-center justify-between sticky top-0 bg-surface-elevated">
              <h3 className="text-sm font-medium text-text-primary">Audit Trail</h3>
              <button onClick={() => setShowAuditTrail(false)} className="p-1 hover:bg-surface-card rounded">
                <X className="w-4 h-4 text-text-muted" />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {finalizationState.auditTrail.map((entry, i) => (
                <div key={entry.id} className="relative pl-6 pb-4 border-l border-border last:border-0">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 bg-accent-blue rounded-full" />
                  <div className="text-xs text-text-muted">
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                  <div className="text-sm font-medium text-text-primary mt-1">
                    {entry.action.replace(/-/g, ' ')}
                  </div>
                  <div className="text-xs text-text-secondary mt-0.5">{entry.details}</div>
                  <div className="text-xs text-text-muted mt-0.5">by {entry.performedByName}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default HAQResponseFinalizationPanel;
