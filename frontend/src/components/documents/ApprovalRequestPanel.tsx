
// ApprovalRequestPanel Component - Phase 2.3e.1
// Panel for initiating approval workflow requests from DocumentViewer
// Integrates with existing workflow system


import { useState, useMemo, useCallback } from 'react';
import {
  X, Send, Clock, AlertCircle, CheckCircle, Users, User, 
  Calendar, ChevronDown, ChevronRight, Plus, Trash2, 
  ArrowRight, Shield, FileText, Info, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { EnterpriseDocument } from '@/domains/document-control/contracts';
import {
  ApprovalType,
  ApprovalUrgency,
  ApprovalRoutingMode,
  ApproverRole,
  SelectedApprover,
  APPROVAL_TYPE_INFO,
  APPROVER_ROLE_INFO,
  calculateDueDate,
} from '@/types/approval';
import type { ApproverCandidate, ApproverGroup } from '@/types/approval';
import { ApproverPicker } from './ApproverPicker';
import { ApproverCard } from './ApproverCard';
import { getApproverById, getGroupById } from '@/data/mockApprovers';

// ============================================================================
// PROPS & TYPES
// ============================================================================

interface ApprovalRequestPanelProps {
  document: EnterpriseDocument;
  onClose: () => void;
  onSubmit: (request: ApprovalRequestData) => void;
}

export interface ApprovalRequestData {
  documentId: string;
  documentVersionId: string;
  approvalType: ApprovalType;
  urgency: ApprovalUrgency;
  routingMode: ApprovalRoutingMode;
  title: string;
  description: string;
  justification?: string;
  dueDate: string;
  approvers: SelectedApprover[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ApprovalRequestPanel({ 
  document, 
  onClose, 
  onSubmit 
}: ApprovalRequestPanelProps) {
  // Form State
  const [approvalType, setApprovalType] = useState<ApprovalType | null>(null);
  const [urgency, setUrgency] = useState<ApprovalUrgency>('standard');
  const [routingMode, setRoutingMode] = useState<ApprovalRoutingMode>('sequential');
  const [title, setTitle] = useState(`Approval request for ${document.title}`);
  const [description, setDescription] = useState('');
  const [justification, setJustification] = useState('');
  const [customDueDate, setCustomDueDate] = useState<string>('');
  const [approvers, setApprovers] = useState<SelectedApprover[]>([]);
  
  // UI State
  const [currentStep, setCurrentStep] = useState<'type' | 'approvers' | 'details' | 'review'>(
    'type'
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpenFor, setPickerOpenFor] = useState<number | null>(null);

  // Calculated Values
  const calculatedDueDate = useMemo(() => {
    if (customDueDate) return new Date(customDueDate);
    if (!approvalType) return null;
    return calculateDueDate(approvalType, urgency);
  }, [approvalType, urgency, customDueDate]);

  const typeInfo = approvalType ? APPROVAL_TYPE_INFO[approvalType] : null;

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    
    if (!approvalType) errors.push('Select an approval type');
    if (!title.trim()) errors.push('Enter a request title');
    if (approvers.length === 0) errors.push('Add at least one approver');
    
    // Check approvers have assignments
    const incompleteApprovers = approvers.filter(
      a => !a.role && !a.userId && !a.groupId
    );
    if (incompleteApprovers.length > 0) {
      errors.push('Complete all approver assignments');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [approvalType, title, approvers]);

  // Handlers
  const handleTypeSelect = useCallback((type: ApprovalType) => {
    setApprovalType(type);
    const info = APPROVAL_TYPE_INFO[type];
    
    // Auto-populate suggested approvers
    const suggestedApprovers: SelectedApprover[] = info.suggestedApproverRoles
      .slice(0, 2)
      .map((role, idx) => ({
        stepNumber: idx + 1,
        assignmentType: 'role' as const,
        role,
      }));
    setApprovers(suggestedApprovers);
    
    // Auto-advance
    setCurrentStep('approvers');
  }, []);

  const handleAddApprover = useCallback(() => {
    setApprovers(prev => [
      ...prev,
      {
        stepNumber: prev.length + 1,
        assignmentType: 'role',
      },
    ]);
  }, []);

  const handleRemoveApprover = useCallback((stepNumber: number) => {
    setApprovers(prev => 
      prev
        .filter(a => a.stepNumber !== stepNumber)
        .map((a, idx) => ({ ...a, stepNumber: idx + 1 }))
    );
  }, []);

  const handleApproverChange = useCallback((
    stepNumber: number,
    updates: Partial<SelectedApprover>
  ) => {
    setApprovers(prev =>
      prev.map(a =>
        a.stepNumber === stepNumber
          ? { ...a, ...updates }
          : a
      )
    );
  }, []);

  // Picker selection handlers
  const handlePickerSelectUser = useCallback((approver: ApproverCandidate) => {
    if (pickerOpenFor === null) return;
    handleApproverChange(pickerOpenFor, {
      assignmentType: 'user',
      userId: approver.userId,
      userName: approver.userName,
      role: undefined,
      groupId: undefined,
      groupName: undefined,
    });
    setPickerOpenFor(null);
  }, [pickerOpenFor, handleApproverChange]);

  const handlePickerSelectRole = useCallback((role: ApproverRole) => {
    if (pickerOpenFor === null) return;
    handleApproverChange(pickerOpenFor, {
      assignmentType: 'role',
      role,
      userId: undefined,
      userName: undefined,
      groupId: undefined,
      groupName: undefined,
    });
    setPickerOpenFor(null);
  }, [pickerOpenFor, handleApproverChange]);

  const handlePickerSelectGroup = useCallback((group: ApproverGroup) => {
    if (pickerOpenFor === null) return;
    handleApproverChange(pickerOpenFor, {
      assignmentType: 'group',
      groupId: group.id,
      groupName: group.name,
      userId: undefined,
      userName: undefined,
      role: undefined,
    });
    setPickerOpenFor(null);
  }, [pickerOpenFor, handleApproverChange]);

  const handleSubmit = useCallback(async () => {
    if (!validation.isValid || !approvalType) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const requestData: ApprovalRequestData = {
        documentId: document.id,
        documentVersionId: document.versionHistory[0]?.versionId || document.id,
        approvalType,
        urgency,
        routingMode,
        title,
        description,
        justification: justification || undefined,
        dueDate: calculatedDueDate?.toISOString() || new Date().toISOString(),
        approvers,
      };

      await onSubmit(requestData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    validation.isValid, approvalType, document, urgency, routingMode,
    title, description, justification, calculatedDueDate, approvers,
    onSubmit, onClose
  ]);

  // Step navigation
  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 'type': return !!approvalType;
      case 'approvers': return approvers.length > 0;
      case 'details': return !!title.trim();
      case 'review': return validation.isValid;
      default: return false;
    }
  }, [currentStep, approvalType, approvers, title, validation.isValid]);

  const handleNext = useCallback(() => {
    const steps: typeof currentStep[] = ['type', 'approvers', 'details', 'review'];
    const currentIdx = steps.indexOf(currentStep);
    if (currentIdx < steps.length - 1) {
      setCurrentStep(steps[currentIdx + 1]);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    const steps: typeof currentStep[] = ['type', 'approvers', 'details', 'review'];
    const currentIdx = steps.indexOf(currentStep);
    if (currentIdx > 0) {
      setCurrentStep(steps[currentIdx - 1]);
    }
  }, [currentStep]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full bg-surface-elevated">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Send className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Request Approval
            </h2>
            <p className="text-sm text-text-muted">
              {document.title} • v{document.version}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-card rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-3 border-b border-border bg-surface-card/50">
        <div className="flex items-center gap-2">
          <ProgressStep
            label="Type"
            isActive={currentStep === 'type'}
            isComplete={!!approvalType}
            stepNumber={1}
          />
          <ArrowRight className="w-4 h-4 text-text-muted" />
          <ProgressStep
            label="Approvers"
            isActive={currentStep === 'approvers'}
            isComplete={approvers.length > 0}
            stepNumber={2}
          />
          <ArrowRight className="w-4 h-4 text-text-muted" />
          <ProgressStep
            label="Details"
            isActive={currentStep === 'details'}
            isComplete={!!title.trim()}
            stepNumber={3}
          />
          <ArrowRight className="w-4 h-4 text-text-muted" />
          <ProgressStep
            label="Review"
            isActive={currentStep === 'review'}
            isComplete={false}
            stepNumber={4}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Step 1: Approval Type */}
        {currentStep === 'type' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-1">
                Select Approval Type
              </h3>
              <p className="text-sm text-text-muted">
                Choose the type of approval workflow for this document
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(APPROVAL_TYPE_INFO) as ApprovalType[]).map(type => {
                const info = APPROVAL_TYPE_INFO[type];
                const isSelected = approvalType === type;
                
                return (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className={`
                      text-left p-4 rounded-lg border-2 transition-all
                      ${isSelected 
                        ? 'border-accent-primary bg-accent-primary/5' 
                        : 'border-border hover:border-accent-primary/50 bg-surface-card'}
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        p-2 rounded-lg
                        ${isSelected ? 'bg-accent-primary/10' : 'bg-surface-elevated'}
                      `}>
                        {getApprovalTypeIcon(type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">
                            {info.label}
                          </span>
                          {info.requiresSignature && (
                            <Badge color="purple" size="sm">Signature</Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-muted mt-0.5 line-clamp-2">
                          {info.description}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          Default SLA: {info.defaultSlaHours}h
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Approvers */}
        {currentStep === 'approvers' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-1">
                Configure Approvers
              </h3>
              <p className="text-sm text-text-muted">
                Define who needs to approve this document and in what order
              </p>
            </div>

            {/* Routing Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Routing Mode
              </label>
              <div className="flex gap-2">
                {(['sequential', 'parallel'] as ApprovalRoutingMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setRoutingMode(mode)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${routingMode === mode
                        ? 'bg-accent-primary text-white'
                        : 'bg-surface-card text-text-secondary hover:bg-surface-elevated'}
                    `}
                  >
                    {mode === 'sequential' ? 'Sequential (A → B → C)' : 'Parallel (A + B + C)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Approvers List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-text-primary">
                  Approvers
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddApprover}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Approver
                </Button>
              </div>

              {approvers.length === 0 ? (
                <div className="text-center py-8 bg-surface-card rounded-lg border border-border">
                  <Users className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-sm text-text-muted">
                    No approvers added yet
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleAddApprover}
                    className="mt-2"
                  >
                    Add First Approver
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {approvers.map((approver, idx) => (
                    <ApproverRow
                      key={approver.stepNumber}
                      approver={approver}
                      stepIndex={idx}
                      routingMode={routingMode}
                      onChange={(updates) => handleApproverChange(approver.stepNumber, updates)}
                      onRemove={() => handleRemoveApprover(approver.stepNumber)}
                      onOpenPicker={() => setPickerOpenFor(approver.stepNumber)}
                      canRemove={approvers.length > 1}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {currentStep === 'details' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-1">
                Request Details
              </h3>
              <p className="text-sm text-text-muted">
                Provide additional context for the approvers
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Request Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                placeholder="Brief title for this approval request"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
                placeholder="Describe what approvers should focus on..."
              />
            </div>

            {/* Urgency & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Urgency
                </label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value as ApprovalUrgency)}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                >
                  <option value="standard">Standard</option>
                  <option value="expedited">Expedited</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-primary">
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={customDueDate}
                  onChange={(e) => setCustomDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
                />
                {!customDueDate && calculatedDueDate && (
                  <p className="text-xs text-text-muted">
                    Auto-calculated: {calculatedDueDate.toLocaleDateString()} {calculatedDueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>

            {/* Advanced Options */}
            <div className="border-t border-border pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
              >
                {showAdvanced ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                Advanced Options
              </button>
              
              {showAdvanced && (
                <div className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-primary">
                      Justification (for expedited/urgent requests)
                    </label>
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-surface-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50 resize-none"
                      placeholder="Why is this request expedited?"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-medium text-text-primary mb-1">
                Review & Submit
              </h3>
              <p className="text-sm text-text-muted">
                Verify the approval request details before submitting
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-surface-card rounded-lg border border-border p-4 space-y-4">
              {/* Document */}
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-text-muted flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Document</p>
                  <p className="text-sm text-text-secondary">{document.title}</p>
                  <p className="text-xs text-text-muted">Version {document.version}</p>
                </div>
              </div>

              {/* Approval Type */}
              {typeInfo && (
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-text-muted flex-none mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">Approval Type</p>
                    <p className="text-sm text-text-secondary">{typeInfo.label}</p>
                    {typeInfo.requiresSignature && (
                      <Badge color="purple" size="sm" className="mt-1">
                        Electronic Signature Required
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Approvers */}
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-text-muted flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    Approvers ({routingMode})
                  </p>
                  <div className="mt-1 space-y-1">
                    {approvers.map((a, idx) => (
                      <p key={a.stepNumber} className="text-sm text-text-secondary">
                        {routingMode === 'sequential' ? `${idx + 1}. ` : '• '}
                        {a.role ? APPROVER_ROLE_INFO[a.role]?.label : a.userName || a.groupName || 'Unassigned'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-text-muted flex-none mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-text-primary">Due Date</p>
                  <p className="text-sm text-text-secondary">
                    {calculatedDueDate?.toLocaleDateString()} at{' '}
                    {calculatedDueDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <Badge 
                    color={urgency === 'critical' ? 'red' : urgency === 'urgent' ? 'orange' : 'gray'}
                    size="sm"
                    className="mt-1"
                  >
                    {urgency.charAt(0).toUpperCase() + urgency.slice(1)} Priority
                  </Badge>
                </div>
              </div>
            </div>

            {/* Validation Errors */}
            {!validation.isValid && (
              <div className="bg-status-error/10 border border-status-error/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-status-error flex-none" />
                  <div>
                    <p className="text-sm font-medium text-status-error">
                      Please fix the following issues:
                    </p>
                    <ul className="mt-2 space-y-1">
                      {validation.errors.map((err, idx) => (
                        <li key={idx} className="text-sm text-status-error">
                          • {err}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-status-error/10 border border-status-error/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-status-error flex-none" />
                  <p className="text-sm text-status-error">{error}</p>
                </div>
              </div>
            )}

            {/* 21 CFR Part 11 Notice */}
            {typeInfo?.requiresSignature && (
              <div className="bg-accent-primary/5 border border-accent-primary/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-accent-primary flex-none" />
                  <div>
                    <p className="text-sm font-medium text-accent-primary">
                      21 CFR Part 11 Compliance
                    </p>
                    <p className="text-sm text-text-secondary mt-1">
                      This approval type requires electronic signatures that comply 
                      with FDA 21 CFR Part 11 regulations. Approvers will need to 
                      authenticate with their credentials to complete the approval.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-surface-card">
        <div>
          {currentStep !== 'type' && (
            <Button variant="ghost" onClick={handleBack}>
              Back
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {currentStep === 'review' ? (
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!validation.isValid || isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Request
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed}
            >
              Continue
            </Button>
          )}
        </div>
      </div>

      {/* Approver Picker Modal */}
      <ApproverPicker
        isOpen={pickerOpenFor !== null}
        onClose={() => setPickerOpenFor(null)}
        onSelectUser={handlePickerSelectUser}
        onSelectRole={handlePickerSelectRole}
        onSelectGroup={handlePickerSelectGroup}
        suggestedRoles={typeInfo?.suggestedApproverRoles}
        title={`Select Approver ${pickerOpenFor || ''}`}
      />
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ProgressStepProps {
  label: string;
  isActive: boolean;
  isComplete: boolean;
  stepNumber: number;
}

function ProgressStep({ label, isActive, isComplete, stepNumber }: ProgressStepProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`
        w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
        ${isActive 
          ? 'bg-accent-primary text-white' 
          : isComplete 
            ? 'bg-status-success text-white'
            : 'bg-surface-elevated text-text-muted'}
      `}>
        {isComplete && !isActive ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          stepNumber
        )}
      </div>
      <span className={`text-sm ${isActive ? 'text-text-primary font-medium' : 'text-text-muted'}`}>
        {label}
      </span>
    </div>
  );
}

interface ApproverRowProps {
  approver: SelectedApprover;
  stepIndex: number;
  routingMode: ApprovalRoutingMode;
  onChange: (updates: Partial<SelectedApprover>) => void;
  onRemove: () => void;
  onOpenPicker: () => void;
  canRemove: boolean;
}

function ApproverRow({ 
  approver, 
  stepIndex, 
  routingMode,
  onChange, 
  onRemove,
  onOpenPicker,
  canRemove 
}: ApproverRowProps) {
  // Get display info based on assignment type
  const displayInfo = useMemo(() => {
    if (approver.assignmentType === 'user' && approver.userId) {
      const candidate = getApproverById(approver.userId);
      if (candidate) {
        return {
          type: 'user' as const,
          candidate,
          label: candidate.userName,
          sublabel: candidate.title,
        };
      }
      return {
        type: 'user' as const,
        label: approver.userName || 'Unknown User',
        sublabel: 'Specific user',
      };
    }
    if (approver.assignmentType === 'role' && approver.role) {
      const roleInfo = APPROVER_ROLE_INFO[approver.role];
      return {
        type: 'role' as const,
        label: roleInfo.label,
        sublabel: roleInfo.description,
      };
    }
    if (approver.assignmentType === 'group' && approver.groupId) {
      const group = getGroupById(approver.groupId);
      return {
        type: 'group' as const,
        label: group?.name || approver.groupName || 'Unknown Group',
        sublabel: group ? `${group.memberCount} members` : 'Group assignment',
      };
    }
    return null;
  }, [approver]);

  const hasSelection = displayInfo !== null;

  return (
    <div className="p-3 bg-surface-card rounded-lg border border-border">
      <div className="flex items-start gap-3">
        {/* Step Number */}
        <div className="w-8 h-8 rounded-full bg-surface-elevated flex items-center justify-center text-sm font-medium text-text-muted flex-none">
          {routingMode === 'sequential' ? stepIndex + 1 : '•'}
        </div>

        {/* Selection Display / Button */}
        <div className="flex-1 min-w-0">
          {hasSelection && displayInfo ? (
            <div className="flex items-center gap-3">
              {/* Selection Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {displayInfo.type === 'user' && (
                    <User className="w-4 h-4 text-accent-primary flex-none" />
                  )}
                  {displayInfo.type === 'role' && (
                    <Users className="w-4 h-4 text-text-muted flex-none" />
                  )}
                  {displayInfo.type === 'group' && (
                    <Users className="w-4 h-4 text-accent-primary flex-none" />
                  )}
                  <span className="text-sm font-medium text-text-primary truncate">
                    {displayInfo.label}
                  </span>
                  {displayInfo.type === 'user' && displayInfo.candidate && (
                    <span className={`w-2 h-2 rounded-full flex-none ${
                      displayInfo.candidate.isAvailable ? 'bg-status-success' : 'bg-status-warning'
                    }`} />
                  )}
                </div>
                <p className="text-xs text-text-muted truncate mt-0.5">
                  {displayInfo.sublabel}
                </p>
                
                {/* Workload indicator for users */}
                {displayInfo.type === 'user' && displayInfo.candidate && (
                  <div className="flex items-center gap-3 mt-2">
                    <span className={`
                      inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border
                      ${displayInfo.candidate.pendingApprovals <= 3 
                        ? 'bg-status-success/10 text-status-success border-status-success/30'
                        : displayInfo.candidate.pendingApprovals <= 7
                          ? 'bg-status-warning/10 text-status-warning border-status-warning/30'
                          : 'bg-status-error/10 text-status-error border-status-error/30'}
                    `}>
                      {displayInfo.candidate.pendingApprovals} pending
                    </span>
                    <span className="text-xs text-text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {displayInfo.candidate.avgApprovalTimeHours}h avg
                    </span>
                  </div>
                )}
              </div>

              {/* Change Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenPicker}
                className="flex-none"
              >
                Change
              </Button>
            </div>
          ) : (
            <button
              onClick={onOpenPicker}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-lg text-sm text-text-muted hover:border-accent-primary/50 hover:text-accent-primary transition-colors"
            >
              <Plus className="w-4 h-4" />
              Select Approver
            </button>
          )}
        </div>

        {/* Remove */}
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-text-muted hover:text-status-error hover:bg-status-error/10 rounded transition-colors flex-none"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getApprovalTypeIcon(type: ApprovalType) {
  const iconClass = "w-5 h-5 text-accent-primary";
  
  switch (type) {
    case 'editorial-review':
      return <FileText className={iconClass} />;
    case 'technical-review':
      return <Shield className={iconClass} />;
    case 'medical-review':
      return <Users className={iconClass} />; // Would be Stethoscope in real app
    case 'regulatory-review':
      return <Shield className={iconClass} />;
    case 'qa-review':
      return <CheckCircle className={iconClass} />;
    case 'legal-review':
      return <Shield className={iconClass} />; // Would be Scale in real app
    case 'executive-sign-off':
      return <Users className={iconClass} />; // Would be Award in real app
    case 'release-approval':
      return <Send className={iconClass} />;
    default:
      return <FileText className={iconClass} />;
  }
}

// Export types
export type { ApprovalRequestPanelProps };
