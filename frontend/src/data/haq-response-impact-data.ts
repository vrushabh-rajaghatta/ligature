// HAQ Response Impact Chain Data
// v0.6.4 - Response Impact Chain: HAQ → Document → Submission

import { HAQuestion } from '@/types/haq';
import { haqQuestions } from './haq-data';

// ============================================================================
// TYPES
// ============================================================================

export type ImpactType = 'revision-required' | 'reference-update' | 'new-content' | 'labeling-update';
export type ImpactSeverity = 'critical' | 'major' | 'minor' | 'informational';
export type ImpactStatus = 'pending' | 'in-progress' | 'complete' | 'blocked';
export type SubmissionImpactType = 'timeline-shift' | 'content-update' | 'new-sequence-required' | 'amendment-required';

export interface ImpactedDocument {
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: string;
  ctdSection: string;
  ctdModule: string;
  impactType: ImpactType;
  impactSeverity: ImpactSeverity;
  status: ImpactStatus;
  impactDescription: string;
  sectionsAffected: string[];
  estimatedEffort: string;
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  completedDate?: string;
  linkedHAQId: string;
  automatable: boolean;
  dependencies: string[];
}

export interface ImpactedSubmission {
  id: string;
  submissionId: string;
  applicationNumber: string;
  submissionType: string;
  region: string;
  agency: string;
  sequenceNumber: string;
  impactType: SubmissionImpactType;
  impactDescription: string;
  originalTargetDate: string;
  projectedDate: string;
  daysImpacted: number;
  status: 'pending-assessment' | 'confirmed' | 'mitigated' | 'resolved';
  mitigationPlan?: string;
  linkedHAQId: string;
  criticalPathAffected: boolean;
}

export interface TimelineImpact {
  haqId: string;
  originalResponseDeadline: string;
  projectedCompletionDate: string;
  totalDaysImpact: number;
  criticalPathAffected: boolean;
  bottleneck: string;
  mitigationOptions: MitigationOption[];
}

export interface MitigationOption {
  id: string;
  description: string;
  daysRecovered: number;
  resourcesRequired: string;
  riskLevel: 'low' | 'medium' | 'high';
  recommended: boolean;
}

export interface HAQResponseImpact {
  haqId: string;
  haqNumber: string;
  haqTitle: string;
  impactAssessmentDate: string;
  totalImpactedDocuments: number;
  totalImpactedSubmissions: number;
  impactedDocuments: ImpactedDocument[];
  impactedSubmissions: ImpactedSubmission[];
  timelineImpact: TimelineImpact;
  estimatedTotalEffort: string;
  automatedActions: number;
  manualActionsRequired: number;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'in-review' | 'approved' | 'executing';
}

// ============================================================================
// RESPONSE IMPACT DATA - Nexavant (LIG-2847) Golden Path
// ============================================================================

// HAQ-005: Hepatocellular adenomas question - the showcase scenario
export const haq005ResponseImpact: HAQResponseImpact = {
  haqId: 'haq-005',
  haqNumber: 'NONC-1',
  haqTitle: 'Hepatocellular adenomas in 6-month rat carcinogenicity study - human relevance assessment',
  impactAssessmentDate: '2024-12-10',
  totalImpactedDocuments: 4,
  totalImpactedSubmissions: 2,
  estimatedTotalEffort: '32-48 hours',
  automatedActions: 8,
  manualActionsRequired: 5,
  overallRisk: 'high',
  status: 'executing',
  
  impactedDocuments: [
    {
      id: 'impact-doc-001',
      documentId: 'doc-m266-nonclin-summary',
      documentTitle: 'Module 2.6.6 - Nonclinical Written Summary (Toxicology)',
      documentType: 'module-26',
      ctdSection: '2.6.6',
      ctdModule: 'Module 2',
      impactType: 'revision-required',
      impactSeverity: 'critical',
      status: 'in-progress',
      impactDescription: 'Human relevance assessment must be added/updated for hepatocellular findings. Requires mode of action analysis and weight of evidence discussion.',
      sectionsAffected: [
        '2.6.6.7 - Carcinogenicity',
        '2.6.6.8 - Other Toxicity Studies',
        '2.6.6.10 - Integrated Overview',
      ],
      estimatedEffort: '12-16 hours',
      assignedTo: 'user-tox-lead',
      assignedToName: 'Robert Kim',
      dueDate: '2024-12-20',
      linkedHAQId: 'haq-005',
      automatable: false,
      dependencies: [],
    },
    {
      id: 'impact-doc-002',
      documentId: 'doc-m274-clin-safety',
      documentTitle: 'Module 2.7.4 - Summary of Clinical Safety',
      documentType: 'module-27',
      ctdSection: '2.7.4',
      ctdModule: 'Module 2',
      impactType: 'reference-update',
      impactSeverity: 'major',
      status: 'pending',
      impactDescription: 'Cross-reference to nonclinical hepatic findings must be updated. Clinical hepatic monitoring recommendations may need strengthening.',
      sectionsAffected: [
        '2.7.4.2.1 - Common Adverse Events',
        '2.7.4.5.2 - Hepatic Effects',
        '2.7.4.7 - Safety in Special Populations',
      ],
      estimatedEffort: '6-8 hours',
      assignedTo: 'user-safety-physician',
      assignedToName: 'Dr. Emily Watson',
      dueDate: '2024-12-22',
      linkedHAQId: 'haq-005',
      automatable: false,
      dependencies: ['impact-doc-001'],
    },
    {
      id: 'impact-doc-003',
      documentId: 'doc-uspi-v4',
      documentTitle: 'USPI v4.0 - US Prescribing Information',
      documentType: 'uspi',
      ctdSection: '1.14.1',
      ctdModule: 'Module 1',
      impactType: 'labeling-update',
      impactSeverity: 'major',
      status: 'pending',
      impactDescription: 'Warnings and Precautions section may require updated language regarding hepatotoxicity monitoring based on nonclinical findings.',
      sectionsAffected: [
        'Section 5.1 - Warnings and Precautions: Hepatotoxicity',
        'Section 8.6 - Hepatic Impairment',
        'Section 13.2 - Animal Toxicology',
      ],
      estimatedEffort: '4-6 hours',
      assignedTo: 'user-labeling-lead',
      assignedToName: 'Amanda Torres',
      dueDate: '2024-12-25',
      linkedHAQId: 'haq-005',
      automatable: false,
      dependencies: ['impact-doc-001', 'impact-doc-002'],
    },
    {
      id: 'impact-doc-004',
      documentId: 'doc-m24-nonclin-overview',
      documentTitle: 'Module 2.4 - Nonclinical Overview',
      documentType: 'module-24',
      ctdSection: '2.4',
      ctdModule: 'Module 2',
      impactType: 'reference-update',
      impactSeverity: 'minor',
      status: 'pending',
      impactDescription: 'Brief reference update to align with detailed discussion in 2.6.6.',
      sectionsAffected: [
        '2.4.4 - Toxicology',
        '2.4.6 - Conclusions',
      ],
      estimatedEffort: '2-3 hours',
      assignedTo: 'user-tox-lead',
      assignedToName: 'Robert Kim',
      dueDate: '2024-12-18',
      linkedHAQId: 'haq-005',
      automatable: true,
      dependencies: ['impact-doc-001'],
    },
  ],
  
  impactedSubmissions: [
    {
      id: 'impact-sub-001',
      submissionId: 'sub-003',
      applicationNumber: 'NDA 215847',
      submissionType: 'NDA',
      region: 'US',
      agency: 'FDA',
      sequenceNumber: '0004',
      impactType: 'timeline-shift',
      impactDescription: 'Day 74 response sequence requires updated Module 2 documents. Timeline shift based on document revision cascade.',
      originalTargetDate: '2024-12-15',
      projectedDate: '2024-12-22',
      daysImpacted: 7,
      status: 'confirmed',
      mitigationPlan: 'Parallel processing of 2.6.6 and 2.7.4 revisions. Pre-clear labeling language with FDA via Type A meeting.',
      linkedHAQId: 'haq-005',
      criticalPathAffected: true,
    },
    {
      id: 'impact-sub-002',
      submissionId: 'sub-eu-variation',
      applicationNumber: 'EMEA/H/C/006234',
      submissionType: 'Type II Variation',
      region: 'EU',
      agency: 'EMA',
      sequenceNumber: '0012',
      impactType: 'content-update',
      impactDescription: 'EU SmPC and Package Leaflet will require aligned hepatotoxicity language. Must wait for US labeling finalization.',
      originalTargetDate: '2025-01-15',
      projectedDate: '2025-01-29',
      daysImpacted: 14,
      status: 'pending-assessment',
      mitigationPlan: 'Submit US sequence first, then submit EU variation with finalized language.',
      linkedHAQId: 'haq-005',
      criticalPathAffected: false,
    },
  ],
  
  timelineImpact: {
    haqId: 'haq-005',
    originalResponseDeadline: '2024-12-15',
    projectedCompletionDate: '2024-12-22',
    totalDaysImpact: 7,
    criticalPathAffected: true,
    bottleneck: 'Module 2.6.6 toxicology revision requires senior toxicologist review',
    mitigationOptions: [
      {
        id: 'mit-001',
        description: 'Parallel processing: Start 2.7.4 draft while 2.6.6 is in progress',
        daysRecovered: 3,
        resourcesRequired: 'Additional medical writer for parallel drafting',
        riskLevel: 'low',
        recommended: true,
      },
      {
        id: 'mit-002',
        description: 'Pre-submission meeting with FDA to align on labeling language',
        daysRecovered: 5,
        resourcesRequired: 'Type A meeting request, regulatory affairs support',
        riskLevel: 'medium',
        recommended: true,
      },
      {
        id: 'mit-003',
        description: 'Request deadline extension from FDA',
        daysRecovered: 14,
        resourcesRequired: 'Extension request letter, justification',
        riskLevel: 'low',
        recommended: false,
      },
    ],
  },
};

// HAQ-003: Clinical dose modification question
export const haq003ResponseImpact: HAQResponseImpact = {
  haqId: 'haq-003',
  haqNumber: 'CLIN-1',
  haqTitle: 'Dose modification patterns in Study LIG-301 - efficacy impact analysis',
  impactAssessmentDate: '2024-12-08',
  totalImpactedDocuments: 3,
  totalImpactedSubmissions: 1,
  estimatedTotalEffort: '24-32 hours',
  automatedActions: 4,
  manualActionsRequired: 6,
  overallRisk: 'high',
  status: 'executing',
  
  impactedDocuments: [
    {
      id: 'impact-doc-101',
      documentId: 'doc-csr-301',
      documentTitle: 'CSR LIG-301 - Clinical Study Report',
      documentType: 'csr',
      ctdSection: '5.3.5.1',
      ctdModule: 'Module 5',
      impactType: 'new-content',
      impactSeverity: 'critical',
      status: 'in-progress',
      impactDescription: 'New subgroup analysis required for dose modification population. Kaplan-Meier curves and forest plots needed.',
      sectionsAffected: [
        'Section 11.4 - Efficacy Results by Subgroup',
        'Section 12.3 - Safety by Subpopulation',
        'Section 14 - Conclusions',
      ],
      estimatedEffort: '16-20 hours',
      assignedTo: 'user-biostat',
      assignedToName: 'Maria Santos',
      dueDate: '2024-12-18',
      linkedHAQId: 'haq-003',
      automatable: false,
      dependencies: [],
    },
    {
      id: 'impact-doc-102',
      documentId: 'doc-m274-clin-safety',
      documentTitle: 'Module 2.7.4 - Summary of Clinical Safety',
      documentType: 'module-27',
      ctdSection: '2.7.4',
      ctdModule: 'Module 2',
      impactType: 'revision-required',
      impactSeverity: 'major',
      status: 'pending',
      impactDescription: 'Safety summary must include dose modification context and impact on safety profile.',
      sectionsAffected: [
        '2.7.4.2.2 - Dose Modifications',
        '2.7.4.5.1 - Grade 2+ Events',
      ],
      estimatedEffort: '4-6 hours',
      assignedTo: 'user-safety-physician',
      assignedToName: 'Dr. Emily Watson',
      dueDate: '2024-12-20',
      linkedHAQId: 'haq-003',
      automatable: false,
      dependencies: ['impact-doc-101'],
    },
    {
      id: 'impact-doc-103',
      documentId: 'doc-m273-clin-efficacy',
      documentTitle: 'Module 2.7.3 - Summary of Clinical Efficacy',
      documentType: 'module-27',
      ctdSection: '2.7.3',
      ctdModule: 'Module 2',
      impactType: 'revision-required',
      impactSeverity: 'major',
      status: 'pending',
      impactDescription: 'Efficacy summary must address dose modification impact on primary and secondary endpoints.',
      sectionsAffected: [
        '2.7.3.3.2 - Subgroup Analyses',
        '2.7.3.4 - Discussion of Efficacy',
      ],
      estimatedEffort: '4-6 hours',
      assignedTo: 'user-med-writer',
      assignedToName: 'Jennifer Park',
      dueDate: '2024-12-20',
      linkedHAQId: 'haq-003',
      automatable: false,
      dependencies: ['impact-doc-101'],
    },
  ],
  
  impactedSubmissions: [
    {
      id: 'impact-sub-101',
      submissionId: 'sub-003',
      applicationNumber: 'NDA 215847',
      submissionType: 'NDA',
      region: 'US',
      agency: 'FDA',
      sequenceNumber: '0004',
      impactType: 'timeline-shift',
      impactDescription: 'New statistical analyses required before Module 2 updates can proceed.',
      originalTargetDate: '2024-12-15',
      projectedDate: '2024-12-20',
      daysImpacted: 5,
      status: 'confirmed',
      linkedHAQId: 'haq-003',
      criticalPathAffected: true,
    },
  ],
  
  timelineImpact: {
    haqId: 'haq-003',
    originalResponseDeadline: '2024-12-15',
    projectedCompletionDate: '2024-12-20',
    totalDaysImpact: 5,
    criticalPathAffected: true,
    bottleneck: 'Statistical analysis must be completed before medical writing can begin',
    mitigationOptions: [
      {
        id: 'mit-101',
        description: 'Expedite statistical programming with additional biostatistician support',
        daysRecovered: 2,
        resourcesRequired: 'Contract biostatistician',
        riskLevel: 'low',
        recommended: true,
      },
      {
        id: 'mit-102',
        description: 'Pre-format report shells while analysis is running',
        daysRecovered: 1,
        resourcesRequired: 'Medical writer parallel tasking',
        riskLevel: 'low',
        recommended: true,
      },
    ],
  },
};

// ============================================================================
// AGGREGATE DATA & HELPER FUNCTIONS
// ============================================================================

// All response impacts (keyed by HAQ ID)
export const responseImpactsByHAQ: Record<string, HAQResponseImpact> = {
  'haq-005': haq005ResponseImpact,
  'haq-003': haq003ResponseImpact,
};

// Get response impact for a specific HAQ
export function getResponseImpact(haqId: string): HAQResponseImpact | null {
  return responseImpactsByHAQ[haqId] || null;
}

// Get all impacted documents across all HAQs
export function getAllImpactedDocuments(): ImpactedDocument[] {
  return Object.values(responseImpactsByHAQ).flatMap(impact => impact.impactedDocuments);
}

// Get all impacted submissions across all HAQs
export function getAllImpactedSubmissions(): ImpactedSubmission[] {
  return Object.values(responseImpactsByHAQ).flatMap(impact => impact.impactedSubmissions);
}

// Get critical path items (documents/submissions on critical path)
export function getCriticalPathImpacts(): {
  documents: ImpactedDocument[];
  submissions: ImpactedSubmission[];
} {
  const criticalDocs = getAllImpactedDocuments().filter(
    doc => doc.impactSeverity === 'critical' || doc.status === 'blocked'
  );
  const criticalSubs = getAllImpactedSubmissions().filter(
    sub => sub.criticalPathAffected
  );
  return { documents: criticalDocs, submissions: criticalSubs };
}

// Get impact chain summary for dashboard display
export interface ImpactChainSummary {
  totalHAQsWithImpact: number;
  totalDocumentsImpacted: number;
  totalSubmissionsImpacted: number;
  criticalImpacts: number;
  totalDaysAtRisk: number;
  automatedActions: number;
  manualActions: number;
}

export function getImpactChainSummary(): ImpactChainSummary {
  const impacts = Object.values(responseImpactsByHAQ);
  return {
    totalHAQsWithImpact: impacts.length,
    totalDocumentsImpacted: impacts.reduce((sum, i) => sum + i.totalImpactedDocuments, 0),
    totalSubmissionsImpacted: impacts.reduce((sum, i) => sum + i.totalImpactedSubmissions, 0),
    criticalImpacts: getAllImpactedDocuments().filter(d => d.impactSeverity === 'critical').length,
    totalDaysAtRisk: impacts.reduce((sum, i) => sum + i.timelineImpact.totalDaysImpact, 0),
    automatedActions: impacts.reduce((sum, i) => sum + i.automatedActions, 0),
    manualActions: impacts.reduce((sum, i) => sum + i.manualActionsRequired, 0),
  };
}

// Get HAQs that have response impacts
export function getHAQsWithImpacts(): HAQuestion[] {
  const impactedIds = Object.keys(responseImpactsByHAQ);
  return haqQuestions.filter(q => impactedIds.includes(q.id));
}

// Severity color mapping for UI
export const impactSeverityColors: Record<ImpactSeverity, string> = {
  critical: 'red',
  major: 'amber',
  minor: 'blue',
  informational: 'slate',
};

export const impactStatusColors: Record<ImpactStatus, string> = {
  pending: 'slate',
  'in-progress': 'blue',
  complete: 'green',
  blocked: 'red',
};

export const submissionImpactColors: Record<SubmissionImpactType, string> = {
  'timeline-shift': 'amber',
  'content-update': 'blue',
  'new-sequence-required': 'purple',
  'amendment-required': 'red',
};
