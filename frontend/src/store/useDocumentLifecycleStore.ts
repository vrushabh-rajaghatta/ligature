

// ============================================================================
// DOCUMENT LIFECYCLE STORE - v69
// Complete Document Authoring Lifecycle Management
// ============================================================================

import { create } from 'zustand';
import {
  LifecycleStage,
  DocumentLifecycleState,
  DocumentVersion,
  DocumentAssignment,
  ReviewCycle,
  QCRun,
  QCCheckResult,
  ApprovalWorkflow,
  StageTransition,
  LIFECYCLE_STAGES,
  QC_CHECKS,
  VersionType,
  CollaborationSession,
  ReviewerAssignment,
  ApprovalStep,
} from './documentLifecycleTypes';
import { DocumentStatus, Priority, ReviewerRole } from '@/types/authoring';

// ============================================================================
// STORE TYPES
// ============================================================================

interface DocumentLifecycleStore {
  // State
  lifecycles: Record<string, DocumentLifecycleState>;
  activeDocumentId: string | null;
  
  // Initialization
  initializeLifecycle: (documentId: string, initialStatus?: DocumentStatus) => void;
  
  // Stage Management
  transitionStage: (documentId: string, toStage: LifecycleStage, reason: string, userId: string, userName: string) => boolean;
  getCurrentStage: (documentId: string) => LifecycleStage | null;
  getAvailableTransitions: (documentId: string) => LifecycleStage[];
  
  // Version Management
  createVersion: (documentId: string, versionType: VersionType, changeDescription: string, userId: string, userName: string) => DocumentVersion | null;
  getVersionHistory: (documentId: string) => DocumentVersion[];
  compareVersions: (documentId: string, fromVersionId: string, toVersionId: string) => { sectionsChanged: number; wordsDiff: number } | null;
  
  // Assignment Management
  assignUser: (documentId: string, assignment: Omit<DocumentAssignment, 'id' | 'status' | 'sectionsCompleted' | 'commentsProvided' | 'assignedAt'>) => DocumentAssignment | null;
  updateAssignment: (documentId: string, assignmentId: string, updates: Partial<DocumentAssignment>) => void;
  getAssignments: (documentId: string) => DocumentAssignment[];
  
  // Review Cycle Management
  startReviewCycle: (documentId: string, stageName: string, reviewers: Omit<ReviewerAssignment, 'status' | 'commentsProvided'>[]) => ReviewCycle | null;
  submitReviewerDecision: (documentId: string, cycleId: string, reviewerId: string, decision: ReviewerAssignment['decision'], comments?: string) => void;
  completeReviewCycle: (documentId: string, cycleId: string, outcome: ReviewCycle['outcome'], consolidatedFeedback?: string) => void;
  getCurrentReviewCycle: (documentId: string) => ReviewCycle | null;
  
  // QC Management
  runQCChecks: (documentId: string, userId: string, userName: string, sectionsToCheck?: string[]) => QCRun | null;
  resolveQCFinding: (documentId: string, runId: string, findingId: string, resolution: string, userId: string) => void;
  getQCHistory: (documentId: string) => QCRun[];
  
  // Approval Management
  startApprovalWorkflow: (documentId: string, workflowName: string, steps: Omit<ApprovalStep, 'status' | 'approvals' | 'allApproved'>[]) => ApprovalWorkflow | null;
  submitApproval: (documentId: string, workflowId: string, stepId: string, approverId: string, approverName: string, decision: 'approve' | 'reject', comments?: string) => void;
  getCurrentApproval: (documentId: string) => ApprovalWorkflow | null;
  
  // Collaboration
  startCollaborationSession: (documentId: string, userId: string, userName: string, role: string) => CollaborationSession | null;
  joinCollaborationSession: (documentId: string, userId: string, userName: string, role: string) => void;
  leaveCollaborationSession: (documentId: string, userId: string) => void;
  
  // Metrics
  getLifecycleMetrics: (documentId: string) => { totalDays: number; daysInCurrentStage: number; cycleTime: Record<LifecycleStage, number> } | null;
  getStageHistory: (documentId: string) => StageTransition[];
  
  // Utilities
  setActiveDocument: (documentId: string | null) => void;
  getLifecycleState: (documentId: string) => DocumentLifecycleState | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => `dl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const statusToStage = (status: DocumentStatus): LifecycleStage => {
  const mapping: Record<DocumentStatus, LifecycleStage> = {
    'not-started': 'planning',
    'prerequisites-pending': 'prerequisites',
    'ready-to-start': 'authoring',
    'drafting': 'authoring',
    'internal-review': 'review',
    'cross-functional-review': 'review',
    'qc-review': 'qc',
    'final-review': 'approval',
    'approved': 'finalization',
    'submission-ready': 'submission',
    'superseded': 'retired',
  };
  return mapping[status] || 'planning';
};

const incrementVersion = (currentVersion: string, type: VersionType): string => {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'amendment':
      return `${major}.${minor}.${patch}-a${Date.now() % 1000}`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

const calculateDaysBetween = (start: string, end: string): number => {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
};

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useDocumentLifecycleStore = create<DocumentLifecycleStore>((set, get) => ({
  lifecycles: {},
  activeDocumentId: null,
  
  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  initializeLifecycle: (documentId: string, initialStatus: DocumentStatus = 'not-started') => {
    const existingLifecycle = get().lifecycles[documentId];
    if (existingLifecycle) return;
    
    const now = new Date().toISOString();
    const stage = statusToStage(initialStatus);
    
    const initialVersion: DocumentVersion = {
      id: generateId(),
      documentId,
      version: '0.1.0',
      versionType: 'minor',
      contentHash: '',
      wordCount: 0,
      pageCount: 0,
      sectionCount: 0,
      status: initialStatus,
      stage,
      changeDescription: 'Initial document creation',
      changeSummary: 'Document initialized',
      sectionsChanged: [],
      createdBy: 'system',
      createdByName: 'System',
      createdAt: now,
      isBaseline: true,
      isSubmitted: false,
    };
    
    const lifecycle: DocumentLifecycleState = {
      documentId,
      currentStage: stage,
      currentStatus: initialStatus,
      currentVersion: initialVersion.version,
      versions: [initialVersion],
      assignments: [],
      activeCollaboration: undefined,
      currentReviewCycle: undefined,
      reviewHistory: [],
      lastQCRun: undefined,
      qcHistory: [],
      currentApproval: undefined,
      approvalHistory: [],
      totalDaysInLifecycle: 0,
      daysInCurrentStage: 0,
      cycleTime: {
        planning: 0,
        prerequisites: 0,
        authoring: 0,
        review: 0,
        qc: 0,
        approval: 0,
        finalization: 0,
        submission: 0,
        amendment: 0,
        retired: 0,
      },
      stageHistory: [{
        id: generateId(),
        fromStage: 'planning',
        toStage: stage,
        reason: 'Document lifecycle initialized',
        triggeredBy: 'system',
        triggeredByName: 'System',
        triggeredAt: now,
        automaticTransition: true,
      }],
    };
    
    set((state) => ({
      lifecycles: { ...state.lifecycles, [documentId]: lifecycle },
    }));
  },
  
  // ============================================================================
  // STAGE MANAGEMENT
  // ============================================================================
  
  transitionStage: (documentId: string, toStage: LifecycleStage, reason: string, userId: string, userName: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return false;
    
    const currentStageDefinition = LIFECYCLE_STAGES[lifecycle.currentStage];
    if (!currentStageDefinition.allowedTransitions.includes(toStage)) {
      return false;
    }
    
    const now = new Date().toISOString();
    const daysInPreviousStage = lifecycle.stageHistory.length > 0
      ? calculateDaysBetween(lifecycle.stageHistory[lifecycle.stageHistory.length - 1].triggeredAt, now)
      : 0;
    
    const transition: StageTransition = {
      id: generateId(),
      fromStage: lifecycle.currentStage,
      toStage,
      reason,
      triggeredBy: userId,
      triggeredByName: userName,
      triggeredAt: now,
      automaticTransition: false,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentStage: toStage,
          daysInCurrentStage: 0,
          cycleTime: {
            ...lifecycle.cycleTime,
            [lifecycle.currentStage]: lifecycle.cycleTime[lifecycle.currentStage] + daysInPreviousStage,
          },
          stageHistory: [...lifecycle.stageHistory, transition],
        },
      },
    }));
    
    return true;
  },
  
  getCurrentStage: (documentId: string) => {
    return get().lifecycles[documentId]?.currentStage || null;
  },
  
  getAvailableTransitions: (documentId: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return [];
    return LIFECYCLE_STAGES[lifecycle.currentStage].allowedTransitions;
  },
  
  // ============================================================================
  // VERSION MANAGEMENT
  // ============================================================================
  
  createVersion: (documentId: string, versionType: VersionType, changeDescription: string, userId: string, userName: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return null;
    
    const newVersionNumber = incrementVersion(lifecycle.currentVersion, versionType);
    const now = new Date().toISOString();
    
    const newVersion: DocumentVersion = {
      id: generateId(),
      documentId,
      version: newVersionNumber,
      versionType,
      contentHash: `hash-${Date.now()}`,
      wordCount: Math.floor(Math.random() * 50000) + 10000,
      pageCount: Math.floor(Math.random() * 100) + 20,
      sectionCount: Math.floor(Math.random() * 20) + 10,
      status: lifecycle.currentStatus,
      stage: lifecycle.currentStage,
      changeDescription,
      changeSummary: `${versionType} version update`,
      sectionsChanged: [],
      createdBy: userId,
      createdByName: userName,
      createdAt: now,
      isBaseline: versionType === 'major',
      isSubmitted: false,
      previousVersionId: lifecycle.versions[lifecycle.versions.length - 1]?.id,
    };
    
    // Update previous version's next pointer
    const updatedVersions = [...lifecycle.versions];
    if (updatedVersions.length > 0) {
      updatedVersions[updatedVersions.length - 1] = {
        ...updatedVersions[updatedVersions.length - 1],
        nextVersionId: newVersion.id,
      };
    }
    updatedVersions.push(newVersion);
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentVersion: newVersionNumber,
          versions: updatedVersions,
        },
      },
    }));
    
    return newVersion;
  },
  
  getVersionHistory: (documentId: string) => {
    return get().lifecycles[documentId]?.versions || [];
  },
  
  compareVersions: (documentId: string, fromVersionId: string, toVersionId: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return null;
    
    const fromVersion = lifecycle.versions.find(v => v.id === fromVersionId);
    const toVersion = lifecycle.versions.find(v => v.id === toVersionId);
    
    if (!fromVersion || !toVersion) return null;
    
    return {
      sectionsChanged: Math.abs(toVersion.sectionCount - fromVersion.sectionCount) + Math.floor(Math.random() * 5),
      wordsDiff: toVersion.wordCount - fromVersion.wordCount,
    };
  },
  
  // ============================================================================
  // ASSIGNMENT MANAGEMENT
  // ============================================================================
  
  assignUser: (documentId: string, assignment) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return null;
    
    const now = new Date().toISOString();
    
    const newAssignment: DocumentAssignment = {
      ...assignment,
      id: generateId(),
      documentId,
      status: 'pending',
      sectionsCompleted: 0,
      commentsProvided: 0,
      assignedAt: now,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          assignments: [...lifecycle.assignments, newAssignment],
        },
      },
    }));
    
    return newAssignment;
  },
  
  updateAssignment: (documentId: string, assignmentId: string, updates: Partial<DocumentAssignment>) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return;
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          assignments: lifecycle.assignments.map(a => 
            a.id === assignmentId ? { ...a, ...updates } : a
          ),
        },
      },
    }));
  },
  
  getAssignments: (documentId: string) => {
    return get().lifecycles[documentId]?.assignments || [];
  },
  
  // ============================================================================
  // REVIEW CYCLE MANAGEMENT
  // ============================================================================
  
  startReviewCycle: (documentId: string, stageName: string, reviewers) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return null;
    
    const now = new Date().toISOString();
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const reviewerAssignments: ReviewerAssignment[] = reviewers.map(r => ({
      ...r,
      status: 'pending' as const,
      commentsProvided: 0,
    }));
    
    const cycle: ReviewCycle = {
      id: generateId(),
      documentId,
      versionId: lifecycle.versions[lifecycle.versions.length - 1]?.id || '',
      cycleNumber: lifecycle.reviewHistory.length + 1,
      stage: lifecycle.currentStage,
      stageName,
      startedAt: now,
      dueDate,
      reviewers: reviewerAssignments,
      status: 'in-progress',
      totalComments: 0,
      resolvedComments: 0,
      openComments: 0,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentReviewCycle: cycle,
        },
      },
    }));
    
    return cycle;
  },
  
  submitReviewerDecision: (documentId: string, cycleId: string, reviewerId: string, decision, comments) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || !lifecycle.currentReviewCycle || lifecycle.currentReviewCycle.id !== cycleId) return;
    
    const now = new Date().toISOString();
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentReviewCycle: {
            ...lifecycle.currentReviewCycle!,
            reviewers: lifecycle.currentReviewCycle!.reviewers.map(r => 
              r.reviewerId === reviewerId 
                ? { ...r, status: 'completed' as const, decision, decisionAt: now, generalComments: comments, commentsProvided: (r.commentsProvided || 0) + 1 }
                : r
            ),
            totalComments: lifecycle.currentReviewCycle!.totalComments + 1,
          },
        },
      },
    }));
  },
  
  completeReviewCycle: (documentId: string, cycleId: string, outcome, consolidatedFeedback) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || !lifecycle.currentReviewCycle || lifecycle.currentReviewCycle.id !== cycleId) return;
    
    const now = new Date().toISOString();
    
    const completedCycle: ReviewCycle = {
      ...lifecycle.currentReviewCycle,
      status: 'completed',
      completedAt: now,
      outcome,
      consolidatedFeedback,
      consolidatedAt: now,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentReviewCycle: undefined,
          reviewHistory: [...lifecycle.reviewHistory, completedCycle],
        },
      },
    }));
  },
  
  getCurrentReviewCycle: (documentId: string) => {
    return get().lifecycles[documentId]?.currentReviewCycle || null;
  },
  
  // ============================================================================
  // QC MANAGEMENT
  // ============================================================================
  
  runQCChecks: (documentId: string, userId: string, userName: string, sectionsToCheck) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return null;
    
    const now = new Date().toISOString();
    
    // Generate mock QC results
    const results: QCCheckResult[] = QC_CHECKS.slice(0, 10).map((check, idx) => {
      const status = Math.random() > 0.7 ? 'pass' : (Math.random() > 0.5 ? 'warning' : 'fail');
      return {
        id: generateId(),
        documentId,
        versionId: lifecycle.versions[lifecycle.versions.length - 1]?.id || '',
        checkId: check.id,
        checkName: check.name,
        category: check.category,
        description: check.description,
        status: status as 'pass' | 'fail' | 'warning',
        severity: check.severity,
        sectionId: `sec-${idx + 1}`,
        sectionNumber: `${idx + 1}`,
        finding: status === 'pass' ? 'No issues found' : `Sample finding for ${check.name}`,
        suggestion: status !== 'pass' ? `Review and correct ${check.name} issues` : undefined,
        autoFixable: check.autoFixable,
        resolved: false,
      };
    });
    
    const qcRun: QCRun = {
      id: generateId(),
      documentId,
      versionId: lifecycle.versions[lifecycle.versions.length - 1]?.id || '',
      runAt: now,
      runBy: userId,
      runByName: userName,
      checksRun: QC_CHECKS.slice(0, 10).map(c => c.id),
      sectionsChecked: sectionsToCheck || 'all',
      status: 'completed',
      completedAt: now,
      totalChecks: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length,
      results,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          lastQCRun: qcRun,
          qcHistory: [...lifecycle.qcHistory, qcRun],
        },
      },
    }));
    
    return qcRun;
  },
  
  resolveQCFinding: (documentId: string, runId: string, findingId: string, resolution: string, userId: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return;
    
    const now = new Date().toISOString();
    
    // Update in lastQCRun if it matches
    if (lifecycle.lastQCRun?.id === runId) {
      set((state) => ({
        lifecycles: {
          ...state.lifecycles,
          [documentId]: {
            ...lifecycle,
            lastQCRun: {
              ...lifecycle.lastQCRun!,
              results: lifecycle.lastQCRun!.results.map(r => 
                r.id === findingId 
                  ? { ...r, resolved: true, resolvedBy: userId, resolvedAt: now, resolution }
                  : r
              ),
            },
          },
        },
      }));
    }
  },
  
  getQCHistory: (documentId: string) => {
    return get().lifecycles[documentId]?.qcHistory || [];
  },
  
  // ============================================================================
  // APPROVAL MANAGEMENT
  // ============================================================================
  
  startApprovalWorkflow: (documentId: string, workflowName: string, steps) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle) return null;
    
    const now = new Date().toISOString();
    
    const approvalSteps: ApprovalStep[] = steps.map((step, idx) => ({
      ...step,
      status: idx === 0 ? 'in-progress' as const : 'pending' as const,
      startedAt: idx === 0 ? now : undefined,
      approvals: [],
      allApproved: false,
    }));
    
    const workflow: ApprovalWorkflow = {
      id: generateId(),
      documentId,
      versionId: lifecycle.versions[lifecycle.versions.length - 1]?.id || '',
      workflowName,
      startedAt: now,
      currentStepIndex: 0,
      status: 'in-progress',
      steps: approvalSteps,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentApproval: workflow,
        },
      },
    }));
    
    return workflow;
  },
  
  submitApproval: (documentId: string, workflowId: string, stepId: string, approverId: string, approverName: string, decision, comments) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || !lifecycle.currentApproval || lifecycle.currentApproval.id !== workflowId) return;
    
    const now = new Date().toISOString();
    const workflow = lifecycle.currentApproval;
    
    const updatedSteps = workflow.steps.map(step => {
      if (step.id !== stepId) return step;
      
      const newApproval = {
        approverId,
        approverName,
        decision,
        comments,
        decidedAt: now,
      };
      
      const updatedApprovals = [...step.approvals, newApproval];
      const requiredApprovers = step.requiredApprovers.filter(a => a.isRequired);
      const allRequiredApproved = requiredApprovers.every(ra => 
        updatedApprovals.some(a => a.approverId === ra.userId && a.decision === 'approve')
      );
      
      return {
        ...step,
        approvals: updatedApprovals,
        allApproved: allRequiredApproved,
        completedAt: allRequiredApproved ? now : undefined,
        status: allRequiredApproved ? 'completed' as const : step.status,
      };
    });
    
    // Check if we need to advance to next step
    const currentStep = updatedSteps[workflow.currentStepIndex];
    let newStepIndex = workflow.currentStepIndex;
    let workflowStatus = workflow.status;
    let workflowOutcome = workflow.outcome;
    
    if (currentStep.allApproved && workflow.currentStepIndex < workflow.steps.length - 1) {
      newStepIndex = workflow.currentStepIndex + 1;
      updatedSteps[newStepIndex] = {
        ...updatedSteps[newStepIndex],
        status: 'in-progress',
        startedAt: now,
      };
    } else if (currentStep.allApproved && workflow.currentStepIndex === workflow.steps.length - 1) {
      workflowStatus = 'completed';
      workflowOutcome = 'approved';
    }
    
    // Check for rejection
    if (decision === 'reject') {
      workflowStatus = 'rejected';
      workflowOutcome = 'rejected';
    }
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          currentApproval: {
            ...workflow,
            steps: updatedSteps,
            currentStepIndex: newStepIndex,
            status: workflowStatus,
            outcome: workflowOutcome,
            completedAt: workflowStatus === 'completed' || workflowStatus === 'rejected' ? now : undefined,
            finalApprover: workflowStatus === 'completed' || workflowStatus === 'rejected' ? approverId : undefined,
            finalApproverName: workflowStatus === 'completed' || workflowStatus === 'rejected' ? approverName : undefined,
            finalDecisionAt: workflowStatus === 'completed' || workflowStatus === 'rejected' ? now : undefined,
          },
        },
      },
    }));
  },
  
  getCurrentApproval: (documentId: string) => {
    return get().lifecycles[documentId]?.currentApproval || null;
  },
  
  // ============================================================================
  // COLLABORATION
  // ============================================================================
  
  startCollaborationSession: (documentId: string, userId: string, userName: string, role: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || lifecycle.activeCollaboration) return null;
    
    const now = new Date().toISOString();
    
    const session: CollaborationSession = {
      id: generateId(),
      documentId,
      startedAt: now,
      participants: [{
        userId,
        userName,
        role,
        joinedAt: now,
        isActive: true,
      }],
      editsCount: 0,
      commentsCount: 0,
      chatMessages: 0,
    };
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          activeCollaboration: session,
        },
      },
    }));
    
    return session;
  },
  
  joinCollaborationSession: (documentId: string, userId: string, userName: string, role: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || !lifecycle.activeCollaboration) return;
    
    const now = new Date().toISOString();
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          activeCollaboration: {
            ...lifecycle.activeCollaboration!,
            participants: [
              ...lifecycle.activeCollaboration!.participants,
              { userId, userName, role, joinedAt: now, isActive: true },
            ],
          },
        },
      },
    }));
  },
  
  leaveCollaborationSession: (documentId: string, userId: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || !lifecycle.activeCollaboration) return;
    
    const now = new Date().toISOString();
    const updatedParticipants = lifecycle.activeCollaboration.participants.map(p => 
      p.userId === userId ? { ...p, isActive: false, leftAt: now } : p
    );
    
    // End session if no active participants
    const hasActiveParticipants = updatedParticipants.some(p => p.isActive);
    
    set((state) => ({
      lifecycles: {
        ...state.lifecycles,
        [documentId]: {
          ...lifecycle,
          activeCollaboration: hasActiveParticipants 
            ? { ...lifecycle.activeCollaboration!, participants: updatedParticipants }
            : undefined,
        },
      },
    }));
  },
  
  // ============================================================================
  // METRICS
  // ============================================================================
  
  getLifecycleMetrics: (documentId: string) => {
    const lifecycle = get().lifecycles[documentId];
    if (!lifecycle || lifecycle.stageHistory.length === 0) return null;
    
    const firstTransition = lifecycle.stageHistory[0];
    const now = new Date();
    const totalDays = calculateDaysBetween(firstTransition.triggeredAt, now.toISOString());
    
    const lastTransition = lifecycle.stageHistory[lifecycle.stageHistory.length - 1];
    const daysInCurrentStage = calculateDaysBetween(lastTransition.triggeredAt, now.toISOString());
    
    return {
      totalDays,
      daysInCurrentStage,
      cycleTime: lifecycle.cycleTime,
    };
  },
  
  getStageHistory: (documentId: string) => {
    return get().lifecycles[documentId]?.stageHistory || [];
  },
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  setActiveDocument: (documentId: string | null) => {
    set({ activeDocumentId: documentId });
  },
  
  getLifecycleState: (documentId: string) => {
    return get().lifecycles[documentId] || null;
  },
}));

// ============================================================================
// SELECTOR HOOKS (with useMemo to avoid infinite loop issues)
// ============================================================================

import { useMemo } from 'react';

export const useActiveLifecycle = () => {
  const activeId = useDocumentLifecycleStore(s => s.activeDocumentId);
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => activeId ? lifecycles[activeId] : null,
    [activeId, lifecycles]
  );
};

export const useLifecycleStage = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return lifecycles[documentId]?.currentStage || null;
};

export const useVersionHistory = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => lifecycles[documentId]?.versions || [],
    [lifecycles, documentId]
  );
};

export const useDocumentAssignments = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => lifecycles[documentId]?.assignments || [],
    [lifecycles, documentId]
  );
};

export const useQCHistory = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => lifecycles[documentId]?.qcHistory || [],
    [lifecycles, documentId]
  );
};

export const useStageHistory = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => lifecycles[documentId]?.stageHistory || [],
    [lifecycles, documentId]
  );
};

export const useReviewHistory = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => lifecycles[documentId]?.reviewHistory || [],
    [lifecycles, documentId]
  );
};

export const useApprovalHistory = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(
    () => lifecycles[documentId]?.approvalHistory || [],
    [lifecycles, documentId]
  );
};

export const useAvailableTransitions = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(() => {
    const lifecycle = lifecycles[documentId];
    if (!lifecycle) return [];
    const currentStageDefinition = LIFECYCLE_STAGES[lifecycle.currentStage];
    return currentStageDefinition?.allowedTransitions || [];
  }, [lifecycles, documentId]);
};

export const useLifecycleMetrics = (documentId: string) => {
  const lifecycles = useDocumentLifecycleStore(s => s.lifecycles);
  return useMemo(() => {
    const lifecycle = lifecycles[documentId];
    if (!lifecycle || lifecycle.stageHistory.length === 0) return null;
    
    const firstTransition = lifecycle.stageHistory[0];
    const now = new Date();
    const calculateDays = (start: string, end: string) => 
      Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
    
    const totalDays = calculateDays(firstTransition.triggeredAt, now.toISOString());
    const lastTransition = lifecycle.stageHistory[lifecycle.stageHistory.length - 1];
    const daysInCurrentStage = calculateDays(lastTransition.triggeredAt, now.toISOString());
    
    return { totalDays, daysInCurrentStage, cycleTime: lifecycle.cycleTime };
  }, [lifecycles, documentId]);
};
