// Mock Approver Data - Phase 2.3e.2
// Demo data for approver selection UI

import type { ApproverCandidate, ApproverGroup, ApproverRole } from '@/types/approval';

// ============================================================================
// MOCK APPROVER CANDIDATES
// ============================================================================

export const mockApproverCandidates: ApproverCandidate[] = [
  // Medical/Scientific
  {
    id: 'approver-001',
    userId: 'user-med-001',
    userName: 'Dr. Sarah Chen',
    email: 'sarah.chen@ligature.demo',
    role: 'medical-director',
    title: 'Chief Medical Officer',
    department: 'Medical Affairs',
    isAvailable: true,
    pendingApprovals: 3,
    avgApprovalTimeHours: 18,
    qualifications: ['MD', 'PhD', 'Board Certified'],
    certifications: ['GCP', 'ICH E6(R2)'],
    documentTypesApproved: ['Clinical Study Report', 'Investigator Brochure', 'Protocol'],
    totalApprovalsCompleted: 247,
    approvalAccuracy: 96.4,
  },
  {
    id: 'approver-002',
    userId: 'user-med-002',
    userName: 'Dr. Michael Torres',
    email: 'michael.torres@ligature.demo',
    role: 'medical-director',
    title: 'Medical Director, Oncology',
    department: 'Medical Affairs',
    isAvailable: true,
    pendingApprovals: 7,
    avgApprovalTimeHours: 24,
    qualifications: ['MD', 'Oncology Specialist'],
    certifications: ['GCP'],
    documentTypesApproved: ['Clinical Study Report', 'Protocol', 'SAE Reports'],
    totalApprovalsCompleted: 183,
    approvalAccuracy: 94.2,
  },
  {
    id: 'approver-003',
    userId: 'user-med-003',
    userName: 'Dr. Emily Watson',
    email: 'emily.watson@ligature.demo',
    role: 'subject-matter-expert',
    title: 'Principal Scientist',
    department: 'R&D',
    isAvailable: false,
    outOfOfficeUntil: '2026-01-15',
    delegateTo: 'user-med-002',
    pendingApprovals: 0,
    avgApprovalTimeHours: 16,
    qualifications: ['PhD Pharmacology'],
    certifications: ['GCP', 'GLP'],
    documentTypesApproved: ['Nonclinical Study Report', 'Investigator Brochure'],
    totalApprovalsCompleted: 156,
    approvalAccuracy: 98.1,
  },

  // Regulatory
  {
    id: 'approver-004',
    userId: 'user-reg-001',
    userName: 'Jennifer Martinez',
    email: 'jennifer.martinez@ligature.demo',
    role: 'regulatory-lead',
    title: 'VP Regulatory Affairs',
    department: 'Regulatory Affairs',
    isAvailable: true,
    pendingApprovals: 5,
    avgApprovalTimeHours: 12,
    qualifications: ['RAC', 'MS Regulatory Science'],
    certifications: ['RAC-US', 'RAC-EU'],
    documentTypesApproved: ['eCTD Module 1', 'Cover Letter', 'Submission Package'],
    totalApprovalsCompleted: 412,
    approvalAccuracy: 99.1,
  },
  {
    id: 'approver-005',
    userId: 'user-reg-002',
    userName: 'David Kim',
    email: 'david.kim@ligature.demo',
    role: 'regulatory-lead',
    title: 'Senior Regulatory Manager',
    department: 'Regulatory Affairs',
    isAvailable: true,
    pendingApprovals: 8,
    avgApprovalTimeHours: 20,
    qualifications: ['MS Regulatory Affairs'],
    certifications: ['RAC-US'],
    documentTypesApproved: ['eCTD Module 2', 'eCTD Module 3', 'Annual Report'],
    totalApprovalsCompleted: 298,
    approvalAccuracy: 97.3,
  },
  {
    id: 'approver-006',
    userId: 'user-reg-003',
    userName: 'Amanda Foster',
    email: 'amanda.foster@ligature.demo',
    role: 'compliance-officer',
    title: 'Regulatory Compliance Director',
    department: 'Regulatory Affairs',
    isAvailable: true,
    pendingApprovals: 2,
    avgApprovalTimeHours: 8,
    qualifications: ['JD', 'MS Regulatory Science'],
    certifications: ['RAC-US', 'CHC'],
    documentTypesApproved: ['SOP', 'Compliance Report', 'Audit Response'],
    totalApprovalsCompleted: 534,
    approvalAccuracy: 99.6,
  },

  // Quality Assurance
  {
    id: 'approver-007',
    userId: 'user-qa-001',
    userName: 'Robert Chang',
    email: 'robert.chang@ligature.demo',
    role: 'qa-manager',
    title: 'Director of Quality Assurance',
    department: 'Quality',
    isAvailable: true,
    pendingApprovals: 4,
    avgApprovalTimeHours: 14,
    qualifications: ['CQA', 'Six Sigma Black Belt'],
    certifications: ['ASQ CQA', 'ISO 9001 Lead Auditor'],
    documentTypesApproved: ['SOP', 'Validation Protocol', 'Deviation Report'],
    totalApprovalsCompleted: 623,
    approvalAccuracy: 98.8,
  },
  {
    id: 'approver-008',
    userId: 'user-qa-002',
    userName: 'Lisa Thompson',
    email: 'lisa.thompson@ligature.demo',
    role: 'quality-reviewer',
    title: 'Senior QA Specialist',
    department: 'Quality',
    isAvailable: true,
    pendingApprovals: 11,
    avgApprovalTimeHours: 10,
    qualifications: ['BS Chemistry', 'CQA'],
    certifications: ['ASQ CQA'],
    documentTypesApproved: ['Batch Record', 'CAPA', 'Change Control'],
    totalApprovalsCompleted: 891,
    approvalAccuracy: 97.5,
  },

  // Legal
  {
    id: 'approver-009',
    userId: 'user-legal-001',
    userName: 'Patricia Williams',
    email: 'patricia.williams@ligature.demo',
    role: 'legal-counsel',
    title: 'General Counsel',
    department: 'Legal',
    isAvailable: true,
    pendingApprovals: 2,
    avgApprovalTimeHours: 36,
    qualifications: ['JD', 'LLM Healthcare Law'],
    certifications: ['Bar Admission'],
    documentTypesApproved: ['Contract', 'Informed Consent', 'Legal Opinion'],
    totalApprovalsCompleted: 178,
    approvalAccuracy: 99.4,
  },

  // Executive
  {
    id: 'approver-010',
    userId: 'user-exec-001',
    userName: 'James Harrison',
    email: 'james.harrison@ligature.demo',
    role: 'executive-sponsor',
    title: 'Chief Operating Officer',
    department: 'Executive',
    isAvailable: false,
    outOfOfficeUntil: '2026-01-10',
    delegateTo: 'user-exec-002',
    pendingApprovals: 1,
    avgApprovalTimeHours: 48,
    qualifications: ['MBA', 'MS Engineering'],
    certifications: [],
    documentTypesApproved: ['Strategic Plan', 'Budget Approval', 'Major Contract'],
    totalApprovalsCompleted: 89,
    approvalAccuracy: 100,
  },
  {
    id: 'approver-011',
    userId: 'user-exec-002',
    userName: 'Maria Santos',
    email: 'maria.santos@ligature.demo',
    role: 'executive-sponsor',
    title: 'Chief Scientific Officer',
    department: 'Executive',
    isAvailable: true,
    pendingApprovals: 3,
    avgApprovalTimeHours: 24,
    qualifications: ['PhD', 'MBA'],
    certifications: [],
    documentTypesApproved: ['IND Application', 'Clinical Development Plan', 'Protocol'],
    totalApprovalsCompleted: 134,
    approvalAccuracy: 98.5,
  },

  // Department Heads
  {
    id: 'approver-012',
    userId: 'user-dept-001',
    userName: 'Kevin O\'Brien',
    email: 'kevin.obrien@ligature.demo',
    role: 'department-head',
    title: 'Head of Clinical Operations',
    department: 'Clinical Operations',
    isAvailable: true,
    pendingApprovals: 6,
    avgApprovalTimeHours: 16,
    qualifications: ['MS Clinical Research', 'PMP'],
    certifications: ['PMP', 'ACRP-CP'],
    documentTypesApproved: ['Monitoring Plan', 'Site Selection', 'Study Closeout'],
    totalApprovalsCompleted: 445,
    approvalAccuracy: 96.9,
  },
  {
    id: 'approver-013',
    userId: 'user-dept-002',
    userName: 'Susan Park',
    email: 'susan.park@ligature.demo',
    role: 'department-head',
    title: 'Head of Biostatistics',
    department: 'Biostatistics',
    isAvailable: true,
    pendingApprovals: 4,
    avgApprovalTimeHours: 22,
    qualifications: ['PhD Statistics'],
    certifications: ['SAS Certified'],
    documentTypesApproved: ['SAP', 'TLF Shells', 'CSR Tables'],
    totalApprovalsCompleted: 267,
    approvalAccuracy: 99.2,
  },

  // Document Owners / SMEs
  {
    id: 'approver-014',
    userId: 'user-sme-001',
    userName: 'Andrew Miller',
    email: 'andrew.miller@ligature.demo',
    role: 'document-owner',
    title: 'Lead Medical Writer',
    department: 'Medical Writing',
    isAvailable: true,
    pendingApprovals: 2,
    avgApprovalTimeHours: 6,
    qualifications: ['PhD', 'AMWA Certification'],
    certifications: ['AMWA'],
    documentTypesApproved: ['CSR', 'Protocol', 'IB'],
    totalApprovalsCompleted: 312,
    approvalAccuracy: 97.8,
  },
  {
    id: 'approver-015',
    userId: 'user-sme-002',
    userName: 'Rachel Green',
    email: 'rachel.green@ligature.demo',
    role: 'subject-matter-expert',
    title: 'Senior Pharmacovigilance Scientist',
    department: 'Safety',
    isAvailable: true,
    pendingApprovals: 9,
    avgApprovalTimeHours: 12,
    qualifications: ['PharmD', 'BCPS'],
    certifications: ['PV Certification'],
    documentTypesApproved: ['PSUR', 'DSUR', 'Safety Report'],
    totalApprovalsCompleted: 478,
    approvalAccuracy: 98.3,
  },
];

// ============================================================================
// MOCK APPROVER GROUPS
// ============================================================================

export const mockApproverGroups: ApproverGroup[] = [
  {
    id: 'group-001',
    name: 'Regulatory Review Team',
    description: 'Cross-functional regulatory review for submissions',
    memberIds: ['user-reg-001', 'user-reg-002', 'user-reg-003'],
    memberCount: 3,
    defaultRoutingMode: 'parallel',
    activePendingApprovals: 15,
    departmentId: 'dept-reg',
    departmentName: 'Regulatory Affairs',
  },
  {
    id: 'group-002',
    name: 'QA Review Board',
    description: 'Quality assurance document review team',
    memberIds: ['user-qa-001', 'user-qa-002'],
    memberCount: 2,
    defaultRoutingMode: 'sequential',
    activePendingApprovals: 15,
    departmentId: 'dept-qa',
    departmentName: 'Quality',
  },
  {
    id: 'group-003',
    name: 'Medical Review Committee',
    description: 'Medical/scientific document approval committee',
    memberIds: ['user-med-001', 'user-med-002', 'user-med-003'],
    memberCount: 3,
    defaultRoutingMode: 'quorum',
    quorumSize: 2,
    activePendingApprovals: 10,
    departmentId: 'dept-med',
    departmentName: 'Medical Affairs',
  },
  {
    id: 'group-004',
    name: 'Executive Approval',
    description: 'Executive leadership sign-off',
    memberIds: ['user-exec-001', 'user-exec-002'],
    memberCount: 2,
    defaultRoutingMode: 'any-of',
    activePendingApprovals: 4,
    departmentId: 'dept-exec',
    departmentName: 'Executive',
  },
  {
    id: 'group-005',
    name: 'Clinical Operations Team',
    description: 'Clinical operations document reviewers',
    memberIds: ['user-dept-001', 'user-sme-001'],
    memberCount: 2,
    defaultRoutingMode: 'sequential',
    activePendingApprovals: 8,
    departmentId: 'dept-clin',
    departmentName: 'Clinical Operations',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get approvers by role
 */
export function getApproversByRole(role: ApproverRole): ApproverCandidate[] {
  return mockApproverCandidates.filter(a => a.role === role);
}

/**
 * Get available approvers only
 */
export function getAvailableApprovers(): ApproverCandidate[] {
  return mockApproverCandidates.filter(a => a.isAvailable);
}

/**
 * Search approvers by name or email
 */
export function searchApprovers(query: string): ApproverCandidate[] {
  const lowerQuery = query.toLowerCase();
  return mockApproverCandidates.filter(
    a => a.userName.toLowerCase().includes(lowerQuery) ||
         a.email.toLowerCase().includes(lowerQuery) ||
         a.title.toLowerCase().includes(lowerQuery) ||
         a.department.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get approver by ID
 */
export function getApproverById(id: string): ApproverCandidate | undefined {
  return mockApproverCandidates.find(a => a.id === id || a.userId === id);
}

/**
 * Get group by ID
 */
export function getGroupById(id: string): ApproverGroup | undefined {
  return mockApproverGroups.find(g => g.id === id);
}

/**
 * Get delegate for an out-of-office approver
 */
export function getDelegate(approver: ApproverCandidate): ApproverCandidate | undefined {
  if (!approver.delegateTo) return undefined;
  return mockApproverCandidates.find(a => a.userId === approver.delegateTo);
}

/**
 * Calculate workload status
 */
export function getWorkloadStatus(pendingApprovals: number): 'low' | 'medium' | 'high' {
  if (pendingApprovals <= 3) return 'low';
  if (pendingApprovals <= 7) return 'medium';
  return 'high';
}

/**
 * Format average approval time
 */
export function formatApprovalTime(hours: number): string {
  if (hours < 24) return `${hours}h avg`;
  const days = Math.round(hours / 24);
  return `${days}d avg`;
}
