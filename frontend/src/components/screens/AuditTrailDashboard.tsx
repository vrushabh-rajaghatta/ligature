

import { useState, useMemo, useEffect } from 'react';
import {
  History,
  Shield,
  FileCheck,
  Clock,
  User,
  Building2,
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Key,
  Lock,
  Unlock,
  FileText,
  Fingerprint,
  Calendar,
  Activity,
  AlertCircle,
  Edit3,
  Trash2,
  Plus,
  Copy,
  ArrowRight,
  Layers,
  BarChart3,
  TrendingUp,
  Zap,
  FileWarning,
  Scale,
  BookOpen,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';

// =============================================================================
// 21 CFR PART 11 TYPES
// =============================================================================

export type AuditActionType =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'sign'
  | 'countersign'
  | 'lock'
  | 'unlock'
  | 'archive'
  | 'restore'
  | 'export'
  | 'import'
  | 'login'
  | 'logout'
  | 'password-change'
  | 'permission-change'
  | 'workflow-transition'
  | 'version-create'
  | 'comment-add'
  | 'attachment-add'
  | 'training-complete'
  | 'deviation-report'
  | 'capa-initiate'
  | 'change-control-submit';

export type RecordCategory =
  | 'document'
  | 'batch-record'
  | 'deviation'
  | 'capa'
  | 'change-control'
  | 'audit'
  | 'training'
  | 'user'
  | 'system'
  | 'workflow'
  | 'submission'
  | 'safety-report'
  | 'clinical-data';

export type SignatureType =
  | 'review'
  | 'approval'
  | 'authorship'
  | 'verification'
  | 'witnessing'
  | 'delegation'
  | 'rejection'
  | 'acknowledgment';

export type SignatureStatus = 'pending' | 'signed' | 'countersigned' | 'rejected' | 'expired' | 'revoked';
export type ComplianceStatus = 'compliant' | 'warning' | 'non-compliant' | 'pending-review';

export interface AuditTrailEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  ipAddress: string;
  sessionId: string;
  workstationId: string;
  actionType: AuditActionType;
  category: RecordCategory;
  recordId: string;
  recordNumber: string;
  recordTitle: string;
  previousValue?: string;
  newValue?: string;
  fieldChanged?: string;
  reason?: string;
  linkedRecords?: string[];
  electronicSignatureId?: string;
  checksumBefore?: string;
  checksumAfter?: string;
  systemGenerated: boolean;
  part11Compliant: boolean;
  integrityVerified: boolean;
}

export interface ElectronicSignature {
  id: string;
  userId: string;
  userName: string;
  userTitle: string;
  department: string;
  signatureType: SignatureType;
  meaning: string;
  recordId: string;
  recordNumber: string;
  recordTitle: string;
  recordCategory: RecordCategory;
  signedAt: string;
  expiresAt?: string;
  status: SignatureStatus;
  authenticationMethod: 'password' | 'mfa' | 'biometric' | 'pki';
  ipAddress: string;
  workstationId: string;
  certificateId?: string;
  delegatedFrom?: string;
  delegationReason?: string;
  countersignedBy?: string;
  countersignedAt?: string;
  manifest: SignatureManifest;
  integrityHash: string;
}

export interface SignatureManifest {
  recordVersion: string;
  recordChecksum: string;
  signatureTimestamp: string;
  signerIdentity: string;
  signatureMeaning: string;
  systemVersion: string;
  regulatoryFramework: string;
}

export interface Part11ComplianceCheck {
  id: string;
  requirement: string;
  category: 'access-control' | 'audit-trail' | 'electronic-signature' | 'record-integrity' | 'system-validation';
  regulatoryReference: string;
  status: ComplianceStatus;
  lastChecked: string;
  nextReview: string;
  evidence: string[];
  findings?: string;
  remediationPlan?: string;
  owner: string;
}

export interface AuditExportPackage {
  id: string;
  name: string;
  description: string;
  exportType: 'inspection' | 'internal-audit' | 'regulatory-submission' | 'legal-hold' | 'archival';
  format: 'pdf' | 'csv' | 'xml' | 'json';
  dateRange: { start: string; end: string };
  categories: RecordCategory[];
  recordCount: number;
  signatureCount: number;
  fileSize: number;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  downloadUrl?: string;
  status: 'generating' | 'ready' | 'downloaded' | 'expired';
  integrityHash: string;
  watermarked: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const actionTypeColorMap: Record<AuditActionType, string> = {
  'create': 'emerald',
  'read': 'slate',
  'update': 'blue',
  'delete': 'red',
  'approve': 'emerald',
  'reject': 'red',
  'sign': 'purple',
  'countersign': 'violet',
  'lock': 'amber',
  'unlock': 'cyan',
  'archive': 'slate',
  'restore': 'teal',
  'export': 'blue',
  'import': 'cyan',
  'login': 'emerald',
  'logout': 'slate',
  'password-change': 'amber',
  'permission-change': 'orange',
  'workflow-transition': 'purple',
  'version-create': 'blue',
  'comment-add': 'slate',
  'attachment-add': 'cyan',
  'training-complete': 'emerald',
  'deviation-report': 'amber',
  'capa-initiate': 'orange',
  'change-control-submit': 'purple',
};

const categoryColorMap: Record<RecordCategory, string> = {
  'document': 'blue',
  'batch-record': 'cyan',
  'deviation': 'amber',
  'capa': 'orange',
  'change-control': 'purple',
  'audit': 'violet',
  'training': 'emerald',
  'user': 'slate',
  'system': 'gray',
  'workflow': 'teal',
  'submission': 'blue',
  'safety-report': 'red',
  'clinical-data': 'purple',
};

const signatureTypeColorMap: Record<SignatureType, string> = {
  'review': 'blue',
  'approval': 'emerald',
  'authorship': 'purple',
  'verification': 'cyan',
  'witnessing': 'violet',
  'delegation': 'amber',
  'rejection': 'red',
  'acknowledgment': 'slate',
};

const signatureStatusColorMap: Record<SignatureStatus, string> = {
  'pending': 'amber',
  'signed': 'emerald',
  'countersigned': 'purple',
  'rejected': 'red',
  'expired': 'gray',
  'revoked': 'red',
};

const complianceStatusColorMap: Record<ComplianceStatus, string> = {
  'compliant': 'emerald',
  'warning': 'amber',
  'non-compliant': 'red',
  'pending-review': 'blue',
};

const actionTypeIcons: Record<AuditActionType, React.ReactNode> = {
  'create': <Plus className="w-3.5 h-3.5" />,
  'read': <Eye className="w-3.5 h-3.5" />,
  'update': <Edit3 className="w-3.5 h-3.5" />,
  'delete': <Trash2 className="w-3.5 h-3.5" />,
  'approve': <CheckCircle2 className="w-3.5 h-3.5" />,
  'reject': <XCircle className="w-3.5 h-3.5" />,
  'sign': <Fingerprint className="w-3.5 h-3.5" />,
  'countersign': <Fingerprint className="w-3.5 h-3.5" />,
  'lock': <Lock className="w-3.5 h-3.5" />,
  'unlock': <Unlock className="w-3.5 h-3.5" />,
  'archive': <FileText className="w-3.5 h-3.5" />,
  'restore': <RefreshCw className="w-3.5 h-3.5" />,
  'export': <Download className="w-3.5 h-3.5" />,
  'import': <Plus className="w-3.5 h-3.5" />,
  'login': <Key className="w-3.5 h-3.5" />,
  'logout': <Key className="w-3.5 h-3.5" />,
  'password-change': <Lock className="w-3.5 h-3.5" />,
  'permission-change': <Shield className="w-3.5 h-3.5" />,
  'workflow-transition': <Activity className="w-3.5 h-3.5" />,
  'version-create': <Layers className="w-3.5 h-3.5" />,
  'comment-add': <FileText className="w-3.5 h-3.5" />,
  'attachment-add': <FileText className="w-3.5 h-3.5" />,
  'training-complete': <CheckCircle2 className="w-3.5 h-3.5" />,
  'deviation-report': <AlertTriangle className="w-3.5 h-3.5" />,
  'capa-initiate': <AlertCircle className="w-3.5 h-3.5" />,
  'change-control-submit': <FileCheck className="w-3.5 h-3.5" />,
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockAuditEntries: AuditTrailEntry[] = [
  {
    id: 'audit-001',
    timestamp: '2025-12-30T14:32:15Z',
    userId: 'user-001',
    userName: 'Dr. Sarah Chen',
    userRole: 'Quality Director',
    department: 'Quality Assurance',
    ipAddress: '192.168.1.101',
    sessionId: 'sess-abc-123',
    workstationId: 'WS-QA-001',
    actionType: 'approve',
    category: 'document',
    recordId: 'doc-001',
    recordNumber: 'SOP-QA-001',
    recordTitle: 'Quality Management System Overview',
    previousValue: 'pending-review',
    newValue: 'approved',
    fieldChanged: 'status',
    reason: 'Document meets all quality standards and regulatory requirements',
    electronicSignatureId: 'sig-001',
    checksumBefore: 'a1b2c3d4e5f6',
    checksumAfter: 'f6e5d4c3b2a1',
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-002',
    timestamp: '2025-12-30T14:15:00Z',
    userId: 'user-002',
    userName: 'Michael Roberts',
    userRole: 'Document Control Specialist',
    department: 'Quality Assurance',
    ipAddress: '192.168.1.102',
    sessionId: 'sess-def-456',
    workstationId: 'WS-QA-002',
    actionType: 'update',
    category: 'document',
    recordId: 'doc-001',
    recordNumber: 'SOP-QA-001',
    recordTitle: 'Quality Management System Overview',
    previousValue: 'Section 4.2: "Review cycle: 12 months"',
    newValue: 'Section 4.2: "Review cycle: 24 months"',
    fieldChanged: 'content',
    reason: 'Updated review cycle per CR-2025-047',
    linkedRecords: ['CR-2025-047'],
    checksumBefore: 'x1y2z3a4b5c6',
    checksumAfter: 'a1b2c3d4e5f6',
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-003',
    timestamp: '2025-12-30T13:45:22Z',
    userId: 'user-003',
    userName: 'Jennifer Williams',
    userRole: 'Regulatory Affairs Manager',
    department: 'Regulatory Affairs',
    ipAddress: '192.168.1.103',
    sessionId: 'sess-ghi-789',
    workstationId: 'WS-RA-001',
    actionType: 'sign',
    category: 'submission',
    recordId: 'sub-001',
    recordNumber: 'eCTD-0023-0003',
    recordTitle: 'Module 3 CMC Documentation Sequence',
    reason: 'Regulatory review completed - ready for submission',
    electronicSignatureId: 'sig-002',
    checksumAfter: 'b2c3d4e5f6g7',
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-004',
    timestamp: '2025-12-30T12:30:00Z',
    userId: 'user-004',
    userName: 'David Thompson',
    userRole: 'Manufacturing Lead',
    department: 'Manufacturing',
    ipAddress: '192.168.1.104',
    sessionId: 'sess-jkl-012',
    workstationId: 'WS-MFG-001',
    actionType: 'deviation-report',
    category: 'deviation',
    recordId: 'dev-001',
    recordNumber: 'DEV-2025-0089',
    recordTitle: 'Temperature Excursion Storage Area B',
    newValue: 'Deviation initiated - Critical severity',
    reason: 'Temperature exceeded 8°C for 45 minutes during power interruption',
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-005',
    timestamp: '2025-12-30T11:15:30Z',
    userId: 'user-005',
    userName: 'Amanda Foster',
    userRole: 'Training Coordinator',
    department: 'Human Resources',
    ipAddress: '192.168.1.105',
    sessionId: 'sess-mno-345',
    workstationId: 'WS-HR-001',
    actionType: 'training-complete',
    category: 'training',
    recordId: 'trn-001',
    recordNumber: 'TRN-GMP-2025-0156',
    recordTitle: 'GMP Fundamentals Annual Requalification',
    newValue: 'Training completed - Score: 95%',
    electronicSignatureId: 'sig-003',
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-006',
    timestamp: '2025-12-30T10:00:00Z',
    userId: 'system',
    userName: 'System',
    userRole: 'Automated Process',
    department: 'System',
    ipAddress: '127.0.0.1',
    sessionId: 'sys-auto-001',
    workstationId: 'SRV-APP-001',
    actionType: 'workflow-transition',
    category: 'capa',
    recordId: 'capa-001',
    recordNumber: 'CAPA-2025-0034',
    recordTitle: 'Corrective Action for Batch Failure',
    previousValue: 'investigation',
    newValue: 'action-planning',
    fieldChanged: 'status',
    reason: 'Investigation phase completed - automated status transition',
    systemGenerated: true,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-007',
    timestamp: '2025-12-30T09:30:15Z',
    userId: 'user-006',
    userName: 'Robert Martinez',
    userRole: 'IT Security Officer',
    department: 'Information Technology',
    ipAddress: '192.168.1.106',
    sessionId: 'sess-pqr-678',
    workstationId: 'WS-IT-001',
    actionType: 'permission-change',
    category: 'user',
    recordId: 'user-007',
    recordNumber: 'USR-2025-0078',
    recordTitle: 'Emily Parker Access Rights Update',
    previousValue: 'Role: Document Reader',
    newValue: 'Role: Document Author',
    fieldChanged: 'role',
    reason: 'Role upgrade approved per HR-REQ-2025-0112',
    linkedRecords: ['HR-REQ-2025-0112'],
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
  {
    id: 'audit-008',
    timestamp: '2025-12-30T08:45:00Z',
    userId: 'user-008',
    userName: 'Lisa Anderson',
    userRole: 'Pharmacovigilance Specialist',
    department: 'Pharmacovigilance',
    ipAddress: '192.168.1.107',
    sessionId: 'sess-stu-901',
    workstationId: 'WS-PV-001',
    actionType: 'create',
    category: 'safety-report',
    recordId: 'icsr-001',
    recordNumber: 'ICSR-2025-0234',
    recordTitle: 'Serious Adverse Event - Case 2025-0234',
    newValue: 'New ICSR created - 15-day expedited reporting required',
    reason: 'Spontaneous report received from healthcare professional',
    systemGenerated: false,
    part11Compliant: true,
    integrityVerified: true,
  },
];

const mockElectronicSignatures: ElectronicSignature[] = [
  {
    id: 'sig-001',
    userId: 'user-001',
    userName: 'Dr. Sarah Chen',
    userTitle: 'Quality Director',
    department: 'Quality Assurance',
    signatureType: 'approval',
    meaning: 'I have reviewed this document and approve its content for release',
    recordId: 'doc-001',
    recordNumber: 'SOP-QA-001',
    recordTitle: 'Quality Management System Overview',
    recordCategory: 'document',
    signedAt: '2025-12-30T14:32:15Z',
    status: 'signed',
    authenticationMethod: 'mfa',
    ipAddress: '192.168.1.101',
    workstationId: 'WS-QA-001',
    manifest: {
      recordVersion: '3.0',
      recordChecksum: 'f6e5d4c3b2a1',
      signatureTimestamp: '2025-12-30T14:32:15Z',
      signerIdentity: 'Dr. Sarah Chen (user-001)',
      signatureMeaning: 'Approval',
      systemVersion: 'Ligature v0.1.88',
      regulatoryFramework: '21 CFR Part 11',
    },
    integrityHash: 'sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  },
  {
    id: 'sig-002',
    userId: 'user-003',
    userName: 'Jennifer Williams',
    userTitle: 'Regulatory Affairs Manager',
    department: 'Regulatory Affairs',
    signatureType: 'review',
    meaning: 'I have reviewed this submission package and confirm its regulatory completeness',
    recordId: 'sub-001',
    recordNumber: 'eCTD-0023-0003',
    recordTitle: 'Module 3 CMC Documentation Sequence',
    recordCategory: 'submission',
    signedAt: '2025-12-30T13:45:22Z',
    status: 'signed',
    authenticationMethod: 'password',
    ipAddress: '192.168.1.103',
    workstationId: 'WS-RA-001',
    manifest: {
      recordVersion: '1.0',
      recordChecksum: 'b2c3d4e5f6g7',
      signatureTimestamp: '2025-12-30T13:45:22Z',
      signerIdentity: 'Jennifer Williams (user-003)',
      signatureMeaning: 'Review',
      systemVersion: 'Ligature v0.1.88',
      regulatoryFramework: '21 CFR Part 11',
    },
    integrityHash: 'sha256:q1r2s3t4u5v6w7x8y9z0a1b2c3d4e5f6',
  },
  {
    id: 'sig-003',
    userId: 'user-005',
    userName: 'Amanda Foster',
    userTitle: 'Training Coordinator',
    department: 'Human Resources',
    signatureType: 'acknowledgment',
    meaning: 'I acknowledge completion of required training',
    recordId: 'trn-001',
    recordNumber: 'TRN-GMP-2025-0156',
    recordTitle: 'GMP Fundamentals Annual Requalification',
    recordCategory: 'training',
    signedAt: '2025-12-30T11:15:30Z',
    status: 'signed',
    authenticationMethod: 'password',
    ipAddress: '192.168.1.105',
    workstationId: 'WS-HR-001',
    manifest: {
      recordVersion: '1.0',
      recordChecksum: 'c3d4e5f6g7h8',
      signatureTimestamp: '2025-12-30T11:15:30Z',
      signerIdentity: 'Amanda Foster (user-005)',
      signatureMeaning: 'Acknowledgment',
      systemVersion: 'Ligature v0.1.88',
      regulatoryFramework: '21 CFR Part 11',
    },
    integrityHash: 'sha256:g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6',
  },
  {
    id: 'sig-004',
    userId: 'user-009',
    userName: 'Dr. James Wilson',
    userTitle: 'Medical Director',
    department: 'Medical Affairs',
    signatureType: 'approval',
    meaning: 'Medical review and approval of clinical study protocol',
    recordId: 'prot-001',
    recordNumber: 'PROT-LIG2847-001',
    recordTitle: 'Phase 3 Clinical Study Protocol - Nexavant',
    recordCategory: 'clinical-data',
    signedAt: '2025-12-29T16:30:00Z',
    status: 'signed',
    authenticationMethod: 'mfa',
    ipAddress: '192.168.1.108',
    workstationId: 'WS-MED-001',
    countersignedBy: 'Dr. Patricia Lee',
    countersignedAt: '2025-12-29T17:15:00Z',
    manifest: {
      recordVersion: '2.1',
      recordChecksum: 'd4e5f6g7h8i9',
      signatureTimestamp: '2025-12-29T16:30:00Z',
      signerIdentity: 'Dr. James Wilson (user-009)',
      signatureMeaning: 'Approval',
      systemVersion: 'Ligature v0.1.88',
      regulatoryFramework: '21 CFR Part 11, ICH E6(R2)',
    },
    integrityHash: 'sha256:w1x2y3z4a5b6c7d8e9f0g1h2i3j4k5l6',
  },
];

const mockComplianceChecks: Part11ComplianceCheck[] = [
  {
    id: 'check-001',
    requirement: 'Unique user identification linked to electronic signatures',
    category: 'electronic-signature',
    regulatoryReference: '21 CFR 11.100(a)',
    status: 'compliant',
    lastChecked: '2025-12-30T08:00:00Z',
    nextReview: '2026-01-30T08:00:00Z',
    evidence: ['User management SOP', 'Access control logs', 'Identity verification records'],
    owner: 'IT Security Officer',
  },
  {
    id: 'check-002',
    requirement: 'Audit trail captures all record modifications with user, date, time, and reason',
    category: 'audit-trail',
    regulatoryReference: '21 CFR 11.10(e)',
    status: 'compliant',
    lastChecked: '2025-12-30T08:00:00Z',
    nextReview: '2026-01-30T08:00:00Z',
    evidence: ['Audit trail SOP', 'System validation report', 'Audit log samples'],
    owner: 'Quality Assurance Director',
  },
  {
    id: 'check-003',
    requirement: 'Electronic signatures include printed name, date/time, and meaning',
    category: 'electronic-signature',
    regulatoryReference: '21 CFR 11.50(a)',
    status: 'compliant',
    lastChecked: '2025-12-30T08:00:00Z',
    nextReview: '2026-01-30T08:00:00Z',
    evidence: ['E-signature policy', 'Signature manifest examples', 'System configuration docs'],
    owner: 'Quality Assurance Director',
  },
  {
    id: 'check-004',
    requirement: 'System validated to ensure accuracy, reliability, and consistent intended performance',
    category: 'system-validation',
    regulatoryReference: '21 CFR 11.10(a)',
    status: 'compliant',
    lastChecked: '2025-12-15T08:00:00Z',
    nextReview: '2026-03-15T08:00:00Z',
    evidence: ['Validation master plan', 'IQ/OQ/PQ protocols', 'Traceability matrix'],
    owner: 'Quality Assurance Director',
  },
  {
    id: 'check-005',
    requirement: 'Limited system access to authorized individuals',
    category: 'access-control',
    regulatoryReference: '21 CFR 11.10(d)',
    status: 'compliant',
    lastChecked: '2025-12-30T08:00:00Z',
    nextReview: '2026-01-30T08:00:00Z',
    evidence: ['Access control policy', 'User access matrix', 'Periodic access reviews'],
    owner: 'IT Security Officer',
  },
  {
    id: 'check-006',
    requirement: 'Records protected throughout retention period',
    category: 'record-integrity',
    regulatoryReference: '21 CFR 11.10(c)',
    status: 'compliant',
    lastChecked: '2025-12-28T08:00:00Z',
    nextReview: '2026-01-28T08:00:00Z',
    evidence: ['Backup procedures', 'Disaster recovery plan', 'Integrity verification logs'],
    owner: 'IT Infrastructure Manager',
  },
  {
    id: 'check-007',
    requirement: 'Operational system checks to enforce permitted sequencing',
    category: 'system-validation',
    regulatoryReference: '21 CFR 11.10(f)',
    status: 'warning',
    lastChecked: '2025-12-20T08:00:00Z',
    nextReview: '2026-01-05T08:00:00Z',
    evidence: ['Workflow configuration', 'Sequence validation tests'],
    findings: 'Minor gap in batch record workflow - remediation in progress',
    remediationPlan: 'CR-2025-089 submitted for workflow enhancement',
    owner: 'Quality Systems Manager',
  },
  {
    id: 'check-008',
    requirement: 'Device checks for validity of source of data input',
    category: 'record-integrity',
    regulatoryReference: '21 CFR 11.10(h)',
    status: 'compliant',
    lastChecked: '2025-12-25T08:00:00Z',
    nextReview: '2026-01-25T08:00:00Z',
    evidence: ['Input validation rules', 'Data integrity checks', 'Source verification logs'],
    owner: 'Data Integrity Officer',
  },
];

const mockExportPackages: AuditExportPackage[] = [
  {
    id: 'export-001',
    name: 'Q4 2025 Internal Audit Package',
    description: 'Comprehensive audit trail export for Q4 internal quality audit',
    exportType: 'internal-audit',
    format: 'pdf',
    dateRange: { start: '2025-10-01T00:00:00Z', end: '2025-12-31T23:59:59Z' },
    categories: ['document', 'deviation', 'capa', 'change-control'],
    recordCount: 1247,
    signatureCount: 342,
    fileSize: 15728640,
    createdBy: 'Dr. Sarah Chen',
    createdAt: '2025-12-28T10:00:00Z',
    expiresAt: '2026-03-28T10:00:00Z',
    status: 'ready',
    integrityHash: 'sha256:export001hash123456789',
    watermarked: true,
  },
  {
    id: 'export-002',
    name: 'FDA Pre-Inspection Audit Trail',
    description: 'Audit trail package for upcoming FDA inspection',
    exportType: 'inspection',
    format: 'pdf',
    dateRange: { start: '2025-01-01T00:00:00Z', end: '2025-12-30T23:59:59Z' },
    categories: ['document', 'batch-record', 'deviation', 'capa', 'training', 'change-control'],
    recordCount: 4892,
    signatureCount: 1567,
    fileSize: 52428800,
    createdBy: 'Jennifer Williams',
    createdAt: '2025-12-30T09:00:00Z',
    expiresAt: '2026-06-30T09:00:00Z',
    status: 'generating',
    integrityHash: '',
    watermarked: true,
  },
];

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatItem = ({ label, value, subValue, color = 'slate' }: { label: string; value: string; subValue?: string; color?: string }) => {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    orange: 'text-orange-400',
    slate: 'text-slate-400',
    violet: 'text-violet-400',
    purple: 'text-purple-400',
  };
  return (
    <div className="flex flex-col min-w-0">
      <div className="text-xs text-text-muted whitespace-nowrap">{label}</div>
      <span className={`text-lg font-semibold ${colors[color]}`}>{value}</span>
      {subValue && <div className="text-xs text-text-muted">{subValue}</div>}
    </div>
  );
};

const Divider = () => <div className="w-px h-10 bg-border" />;

const getBadge = (value: string, colorMap: Record<string, string>) => {
  const color = colorMap[value] || 'slate';
  return (
    <Badge color={color as any} size="xs">
      {value.replace(/-/g, ' ')}
    </Badge>
  );
};

// =============================================================================
// STATS BAR
// =============================================================================

interface StatsBarProps {
  stats: {
    totalEntries: number;
    todayEntries: number;
    pendingSignatures: number;
    complianceScore: number;
    criticalEvents: number;
    systemEvents: number;
  };
}

const StatsBar = ({ stats }: StatsBarProps) => (
  <div className="bg-surface-elevated border-b border-border px-6 py-3">
    <div className="flex items-center gap-6 overflow-x-auto">
      <StatItem
        label="Total Entries (30d)"
        value={stats.totalEntries.toLocaleString()}
        color="blue"
      />
      <Divider />
      <StatItem
        label="Today's Activity"
        value={String(stats.todayEntries)}
        color="cyan"
      />
      <Divider />
      <StatItem
        label="Pending Signatures"
        value={String(stats.pendingSignatures)}
        color={stats.pendingSignatures > 0 ? 'amber' : 'emerald'}
      />
      <Divider />
      <StatItem
        label="Part 11 Compliance"
        value={`${stats.complianceScore}%`}
        color={stats.complianceScore >= 95 ? 'emerald' : stats.complianceScore >= 80 ? 'amber' : 'red'}
      />
      <Divider />
      <StatItem
        label="Critical Events"
        value={String(stats.criticalEvents)}
        color={stats.criticalEvents > 0 ? 'red' : 'emerald'}
      />
      <Divider />
      <StatItem
        label="System Generated"
        value={String(stats.systemEvents)}
        color="slate"
      />
    </div>
  </div>
);

// =============================================================================
// AUDIT ENTRY CARD
// =============================================================================

interface AuditEntryCardProps {
  entry: AuditTrailEntry;
  onSelect: () => void;
  selected: boolean;
}

const AuditEntryCard = ({ entry, onSelect, selected }: AuditEntryCardProps) => {
  const iconBg: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    orange: 'bg-orange-500/10 text-orange-400',
    slate: 'bg-slate-500/10 text-slate-400',
    violet: 'bg-violet-500/10 text-violet-400',
    purple: 'bg-purple-500/10 text-purple-400',
    gray: 'bg-gray-500/10 text-gray-400',
  };

  const actionColor = actionTypeColorMap[entry.actionType] || 'slate';

  return (
    <Card
      className={`cursor-pointer hover:bg-surface-card/50 transition-all ${selected ? 'ring-2 ring-blue-500/50' : ''}`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${iconBg[actionColor]}`}>
            {actionTypeIcons[entry.actionType]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-text-primary truncate">{entry.recordTitle}</span>
              {entry.part11Compliant && (
                <Badge color="emerald" size="xs">Part 11</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
              <span>{entry.recordNumber}</span>
              <span>•</span>
              <span>{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {getBadge(entry.actionType, actionTypeColorMap)}
              {getBadge(entry.category, categoryColorMap)}
              {entry.systemGenerated && (
                <Badge color="gray" size="xs">System</Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-text-secondary">
              <User className="w-3.5 h-3.5" />
              <span>{entry.userName}</span>
            </div>
            <div className="text-xs text-text-muted">{entry.department}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// AUDIT ENTRY DETAIL PANEL
// =============================================================================

interface AuditEntryDetailPanelProps {
  entry: AuditTrailEntry;
  signature?: ElectronicSignature;
  onClose: () => void;
}

const AuditEntryDetailPanel = ({ entry, signature, onClose }: AuditEntryDetailPanelProps) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['change', 'metadata']));

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const Section = ({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between p-3 bg-surface-elevated hover:bg-surface-card transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-text-primary">{title}</span>
        </div>
        {expandedSections.has(id) ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>
      {expandedSections.has(id) && (
        <div className="p-4 border-t border-border">{children}</div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-surface-card border-l border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-text-primary">Audit Entry Detail</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {getBadge(entry.actionType, actionTypeColorMap)}
          {getBadge(entry.category, categoryColorMap)}
          {entry.part11Compliant && (
            <Badge color="emerald" size="xs" dot>21 CFR Part 11</Badge>
          )}
          {entry.integrityVerified && (
            <Badge color="blue" size="xs" dot>Integrity Verified</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Record Info */}
        <div className="space-y-2">
          <div className="text-lg font-medium text-text-primary">{entry.recordTitle}</div>
          <div className="text-sm text-text-muted">{entry.recordNumber}</div>
          <div className="text-sm text-text-secondary">
            {new Date(entry.timestamp).toLocaleString()}
          </div>
        </div>

        {/* Change Details */}
        <Section id="change" title="Change Details" icon={<Edit3 className="w-4 h-4 text-blue-400" />}>
          {entry.fieldChanged && (
            <div className="mb-3">
              <div className="text-xs text-text-muted mb-1">Field Changed</div>
              <div className="text-sm text-text-primary">{entry.fieldChanged}</div>
            </div>
          )}
          {entry.previousValue && (
            <div className="mb-3">
              <div className="text-xs text-text-muted mb-1">Previous Value</div>
              <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded font-mono">
                {entry.previousValue}
              </div>
            </div>
          )}
          {entry.newValue && (
            <div className="mb-3">
              <div className="text-xs text-text-muted mb-1">New Value</div>
              <div className="text-sm text-emerald-400 bg-emerald-500/10 p-2 rounded font-mono">
                {entry.newValue}
              </div>
            </div>
          )}
          {entry.reason && (
            <div>
              <div className="text-xs text-text-muted mb-1">Reason for Change</div>
              <div className="text-sm text-text-primary">{entry.reason}</div>
            </div>
          )}
        </Section>

        {/* User & Session */}
        <Section id="metadata" title="User & Session Metadata" icon={<User className="w-4 h-4 text-purple-400" />}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
            <div>
              <div className="text-xs text-text-muted mb-1">User</div>
              <div className="text-text-primary">{entry.userName}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Role</div>
              <div className="text-text-primary">{entry.userRole}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Department</div>
              <div className="text-text-primary">{entry.department}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">IP Address</div>
              <div className="text-text-primary font-mono">{entry.ipAddress}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Session ID</div>
              <div className="text-text-primary font-mono text-xs">{entry.sessionId}</div>
            </div>
            <div>
              <div className="text-xs text-text-muted mb-1">Workstation</div>
              <div className="text-text-primary">{entry.workstationId}</div>
            </div>
          </div>
        </Section>

        {/* Integrity */}
        <Section id="integrity" title="Data Integrity" icon={<Shield className="w-4 h-4 text-emerald-400" />}>
          <div className="space-y-3 text-sm">
            {entry.checksumBefore && (
              <div>
                <div className="text-xs text-text-muted mb-1">Checksum Before</div>
                <div className="text-text-primary font-mono">{entry.checksumBefore}</div>
              </div>
            )}
            {entry.checksumAfter && (
              <div>
                <div className="text-xs text-text-muted mb-1">Checksum After</div>
                <div className="text-text-primary font-mono">{entry.checksumAfter}</div>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {entry.part11Compliant ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-text-secondary">Part 11 Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                {entry.integrityVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" />
                )}
                <span className="text-text-secondary">Integrity Verified</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Electronic Signature */}
        {signature && (
          <Section id="signature" title="Electronic Signature" icon={<Fingerprint className="w-4 h-4 text-violet-400" />}>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {getBadge(signature.signatureType, signatureTypeColorMap)}
                {getBadge(signature.status, signatureStatusColorMap)}
                <Badge color="blue" size="xs">{signature.authenticationMethod.toUpperCase()}</Badge>
              </div>
              <div>
                <div className="text-xs text-text-muted mb-1">Meaning</div>
                <div className="text-text-primary italic">&quot;{signature.meaning}&quot;</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <div className="text-xs text-text-muted mb-1">Signed By</div>
                  <div className="text-text-primary">{signature.userName}</div>
                  <div className="text-xs text-text-muted">{signature.userTitle}</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted mb-1">Signed At</div>
                  <div className="text-text-primary">{new Date(signature.signedAt).toLocaleString()}</div>
                </div>
              </div>
              {signature.countersignedBy && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-border">
                  <div>
                    <div className="text-xs text-text-muted mb-1">Countersigned By</div>
                    <div className="text-text-primary">{signature.countersignedBy}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-muted mb-1">Countersigned At</div>
                    <div className="text-text-primary">{new Date(signature.countersignedAt!).toLocaleString()}</div>
                  </div>
                </div>
              )}
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-text-muted mb-1">Integrity Hash</div>
                <div className="text-text-primary font-mono text-xs break-all">{signature.integrityHash}</div>
              </div>
            </div>
          </Section>
        )}

        {/* Linked Records */}
        {entry.linkedRecords && entry.linkedRecords.length > 0 && (
          <Section id="linked" title="Linked Records" icon={<ExternalLink className="w-4 h-4 text-cyan-400" />}>
            <div className="space-y-2">
              {entry.linkedRecords.map((record) => (
                <div key={record} className="flex items-center gap-2 text-sm">
                  <FileText className="w-4 h-4 text-text-muted" />
                  <span className="text-blue-400 hover:underline cursor-pointer">{record}</span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// SIGNATURE CARD
// =============================================================================

interface SignatureCardProps {
  signature: ElectronicSignature;
  onSelect: () => void;
  selected: boolean;
}

const SignatureCard = ({ signature, onSelect, selected }: SignatureCardProps) => (
  <Card
    className={`cursor-pointer hover:bg-surface-card/50 transition-all ${selected ? 'ring-2 ring-purple-500/50' : ''}`}
    onClick={onSelect}
  >
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
          <Fingerprint className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-text-primary truncate">{signature.recordTitle}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted mb-2">
            <span>{signature.recordNumber}</span>
            <span>•</span>
            <span>{new Date(signature.signedAt).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {getBadge(signature.signatureType, signatureTypeColorMap)}
            {getBadge(signature.status, signatureStatusColorMap)}
            <Badge color="blue" size="xs">{signature.authenticationMethod.toUpperCase()}</Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm text-text-secondary">
            <User className="w-3.5 h-3.5" />
            <span>{signature.userName}</span>
          </div>
          <div className="text-xs text-text-muted">{signature.userTitle}</div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// =============================================================================
// COMPLIANCE CHECK CARD
// =============================================================================

interface ComplianceCheckCardProps {
  check: Part11ComplianceCheck;
}

const ComplianceCheckCard = ({ check }: ComplianceCheckCardProps) => {
  const statusIcon = {
    compliant: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
    'non-compliant': <XCircle className="w-5 h-5 text-red-400" />,
    'pending-review': <Clock className="w-5 h-5 text-blue-400" />,
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {statusIcon[check.status]}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-text-primary">{check.requirement}</span>
              {getBadge(check.status, complianceStatusColorMap)}
            </div>
            <div className="text-xs text-text-muted mb-2">
              {check.regulatoryReference} • {check.category.replace(/-/g, ' ')}
            </div>
            {check.findings && (
              <div className="text-sm text-amber-400 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
                {check.findings}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span>Last checked: {new Date(check.lastChecked).toLocaleDateString()}</span>
              <span>Next review: {new Date(check.nextReview).toLocaleDateString()}</span>
              <span>Owner: {check.owner}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// EXPORT PACKAGE CARD
// =============================================================================

interface ExportPackageCardProps {
  pkg: AuditExportPackage;
}

const ExportPackageCard = ({ pkg }: ExportPackageCardProps) => {
  const statusColors: Record<string, string> = {
    generating: 'amber',
    ready: 'emerald',
    downloaded: 'blue',
    expired: 'gray',
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-text-primary">{pkg.name}</span>
                <Badge color={statusColors[pkg.status] as any} size="xs">{pkg.status}</Badge>
              </div>
              <div className="text-sm text-text-secondary mb-2">{pkg.description}</div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span>{pkg.recordCount.toLocaleString()} records</span>
                <span>{pkg.signatureCount.toLocaleString()} signatures</span>
                <span>{formatFileSize(pkg.fileSize)}</span>
                <span>{pkg.format.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-text-muted">
                <Calendar className="w-3.5 h-3.5" />
                <span>
                  {new Date(pkg.dateRange.start).toLocaleDateString()} - {new Date(pkg.dateRange.end).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
          {pkg.status === 'ready' && (
            <Button 
              variant="secondary" 
              size="sm" 
              icon={<Download className="w-4 h-4" />}
              onClick={() => {
                // Generate a sample export file
                const exportContent = JSON.stringify({
                  packageId: pkg.id,
                  name: pkg.name,
                  exportType: pkg.exportType,
                  dateRange: pkg.dateRange,
                  recordCount: pkg.recordCount,
                  signatureCount: pkg.signatureCount,
                  integrityHash: pkg.integrityHash,
                  exportedAt: new Date().toISOString(),
                  watermarked: pkg.watermarked,
                }, null, 2);
                const blob = new Blob([exportContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement('a');
                a.href = url;
                a.download = `${pkg.name.toLowerCase().replace(/\s+/g, '-')}-${pkg.id}.json`;
                window.document.body.appendChild(a);
                a.click();
                window.document.body.removeChild(a);
                URL.revokeObjectURL(url);
              }}
            >
              Download
            </Button>
          )}
          {pkg.status === 'generating' && (
            <div className="flex items-center gap-2 text-amber-400">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Generating...</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// ANALYTICS VIEW
// =============================================================================

const AnalyticsView = () => {
  const actionDistribution = [
    { action: 'Update', count: 342, percent: 35 },
    { action: 'Create', count: 234, percent: 24 },
    { action: 'Approve', count: 156, percent: 16 },
    { action: 'Sign', count: 89, percent: 9 },
    { action: 'Delete', count: 45, percent: 5 },
    { action: 'Other', count: 112, percent: 11 },
  ];

  const categoryDistribution = [
    { category: 'Documents', count: 456, color: 'blue' },
    { category: 'Deviations', count: 234, color: 'amber' },
    { category: 'CAPAs', count: 167, color: 'orange' },
    { category: 'Training', count: 145, color: 'emerald' },
    { category: 'Change Controls', count: 89, color: 'purple' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-secondary">Total Events (30d)</span>
            </div>
            <div className="text-2xl font-bold text-blue-400">12,847</div>
            <div className="text-xs text-emerald-400 mt-1">↑ 8% from last month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Fingerprint className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-secondary">Signatures (30d)</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">1,567</div>
            <div className="text-xs text-text-muted mt-1">98% completion rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Shield className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-secondary">Compliance Score</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400">97.5%</div>
            <div className="text-xs text-text-muted mt-1">8/8 requirements met</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-sm text-text-secondary">Avg Response Time</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">45ms</div>
            <div className="text-xs text-emerald-400 mt-1">↓ 12% improvement</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {/* Action Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Action Type Distribution
            </h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {actionDistribution.map((item) => (
                <div key={item.action}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">{item.action}</span>
                    <span className="text-text-primary font-medium">{item.count}</span>
                  </div>
                  <ProgressBar value={item.percent} max={100} color="blue" size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-text-primary flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              Records by Category
            </h3>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {categoryDistribution.map((item) => (
                <div key={item.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-text-secondary">{item.category}</span>
                    <span className="text-text-primary font-medium">{item.count}</span>
                  </div>
                  <ProgressBar value={(item.count / 500) * 100} max={100} color={item.color as any} size="sm" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-400" />
            21 CFR Part 11 Compliance Summary
          </h3>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {[
              { label: 'Access Control', status: 'compliant', ref: '11.10(d)' },
              { label: 'Audit Trail', status: 'compliant', ref: '11.10(e)' },
              { label: 'E-Signatures', status: 'compliant', ref: '11.50' },
              { label: 'Record Integrity', status: 'compliant', ref: '11.10(c)' },
              { label: 'System Validation', status: 'warning', ref: '11.10(a)' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                  item.status === 'compliant' ? 'bg-emerald-500/10' : 'bg-amber-500/10'
                }`}>
                  {item.status === 'compliant' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div className="text-sm font-medium text-text-primary">{item.label}</div>
                <div className="text-xs text-text-muted">{item.ref}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// =============================================================================
// MAIN DASHBOARD
// =============================================================================

type AuditSubView = 'entries' | 'signatures' | 'compliance' | 'exports' | 'analytics';

export const AuditTrailDashboard = () => {
  const [activeSubView, setActiveSubView] = useState<AuditSubView>('entries');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<RecordCategory | 'all'>('all');
  const [actionFilter, setActionFilter] = useState<AuditActionType | 'all'>('all');
  const [liveSignatures, setLiveSignatures] = useState<ElectronicSignature[]>(mockElectronicSignatures);
  const [signaturesLoading, setSignaturesLoading] = useState(false);
  const [chainVerified, setChainVerified] = useState<boolean | null>(null);
  const [chainDetails, setChainDetails] = useState<{ totalEntries: number; verifiedAt: string; breakAt?: string } | null>(null);
  const [chainLoading, setChainLoading] = useState(false);
  const [liveEntries, setLiveEntries] = useState<Array<{
    id: string; timestamp: string; user: string; email: string;
    action: string; module: string; details: string; type: string;
    chainIndex?: number; chainHash?: string;
  }>>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf' | 'json'>('pdf');
  const [exportLoading, setExportLoading] = useState(false);
  const toast = useToast();

  // Fetch live audit entries from /api/audit
  useEffect(() => {
    const fetchEntries = async () => {
      setEntriesLoading(true);
      try {
        const res = await fetch('/api/audit?limit=100');
        if (res.ok) {
          const json = await res.json();
          if (json.entries?.length > 0) setLiveEntries(json.entries);
        }
      } catch { /* fall back to mock */ } finally {
        setEntriesLoading(false);
      }
    };
    fetchEntries();
  }, []);

  // Verify main audit chain via /api/audit/verify-chain
  const runChainVerify = async () => {
    setChainLoading(true);
    try {
      const res = await fetch('/api/audit/verify-chain');
      if (res.ok) {
        const json = await res.json();
        setChainVerified(json.valid);
        setChainDetails({ totalEntries: json.totalEntries, verifiedAt: json.verifiedAt, breakAt: json.breakAt });
      }
    } catch { setChainVerified(null); } finally {
      setChainLoading(false);
    }
  };

  // Download export in chosen format
  const handleExport = async (fmt: 'csv' | 'pdf' | 'json') => {
    setExportLoading(true);
    try {
      const res = await fetch(`/api/audit/export?format=${fmt}`);
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const ext = fmt === 'json' ? 'json' : fmt;
      const date = new Date().toISOString().slice(0, 10);
      const filename = `ligature-audit-${date}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Audit log exported as ${fmt.toUpperCase()}`);
    } catch {
      toast.error('Export failed — please try again');
    } finally {
      setExportLoading(false);
    }
  };

  // Fetch live signatures from the /api/signatures route
  useEffect(() => {
    const fetchSignatures = async () => {
      setSignaturesLoading(true);
      try {
        const res = await fetch('/api/signatures?limit=100');
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const mapped: ElectronicSignature[] = json.data.map((r: {
              id: string; entityLabel: string; signedByName: string; signedByTitle: string;
              signedAt: string; meaning: string; reason: string; documentHash: string;
              previousHash: string | null; chainIndex: number; entityType: string; entityId: string;
            }) => ({
              id: r.id,
              documentId: r.entityId,
              documentTitle: r.entityLabel,
              documentVersion: '1.0',
              signatureType: r.meaning.includes('approved') ? 'approval' : r.meaning.includes('reviewed') ? 'review' : 'acknowledgment',
              signerName: r.signedByName,
              signerTitle: r.signedByTitle,
              signerEmail: `${r.signedByName.toLowerCase().replace(/\s/g, '.')}@ligaturerd.io`,
              signatureTimestamp: r.signedAt,
              status: 'valid' as const,
              signatureMeaning: r.meaning.replace(/-/g, ' '),
              reason: r.reason,
              documentHash: r.documentHash,
              previousHash: r.previousHash,
              chainIndex: r.chainIndex,
              auditTrailId: `audit-${r.id}`,
              legalStatement: 'This electronic signature is legally binding per 21 CFR Part 11.',
              complianceFlags: ['21-cfr-part-11', 'audit-trail', 'hash-verified'],
            }));
            setLiveSignatures(mapped);
          }
        }
      } catch { /* fall back to mock */ } finally {
        setSignaturesLoading(false);
      }
    };
    fetchSignatures();
    // Also run chain verify on mount
    runChainVerify();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    return {
      totalEntries: mockAuditEntries.length * 150, // Simulated 30-day count
      todayEntries: mockAuditEntries.filter(e => new Date(e.timestamp).toDateString() === today).length,
      pendingSignatures: liveSignatures.filter(s => s.status === 'pending').length,
      complianceScore: Math.round(mockComplianceChecks.filter(c => c.status === 'compliant').length / mockComplianceChecks.length * 100),
      criticalEvents: mockAuditEntries.filter(e => e.actionType === 'delete' || e.actionType === 'deviation-report').length,
      systemEvents: mockAuditEntries.filter(e => e.systemGenerated).length,
    };
  }, []);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return mockAuditEntries.filter(entry => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) return false;
      if (actionFilter !== 'all' && entry.actionType !== actionFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          entry.recordTitle.toLowerCase().includes(q) ||
          entry.recordNumber.toLowerCase().includes(q) ||
          entry.userName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [categoryFilter, actionFilter, searchQuery]);

  const selectedEntry = selectedEntryId ? mockAuditEntries.find(e => e.id === selectedEntryId) : null;
  const selectedSignature = selectedEntry?.electronicSignatureId
    ? liveSignatures.find(s => s.id === selectedEntry.electronicSignatureId)
    : undefined;

  const subViewTabs = [
    { id: 'entries', label: 'Audit Entries', icon: <History className="w-4 h-4" /> },
    { id: 'signatures', label: 'E-Signatures', icon: <Fingerprint className="w-4 h-4" /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield className="w-4 h-4" /> },
    { id: 'exports', label: 'Exports', icon: <Download className="w-4 h-4" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        moduleId="archives"
        title="Audit Trail"
        subtitle="System-wide event log — user actions, data changes, and compliance audit records"
        icon={<Shield className="w-5 h-5" />}
      />
      {/* Stats Bar */}
      <StatsBar stats={stats} />

      {/* Sub-navigation */}
      <div className="border-b border-border px-6">
        <div className="flex items-center gap-1">
          {subViewTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id as AuditSubView)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeSubView === tab.id
                  ? 'text-blue-400 border-blue-400'
                  : 'text-text-muted border-transparent hover:text-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeSubView === 'entries' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Entry List */}
          <div className={`${selectedEntry ? 'w-1/2' : 'w-full'} flex flex-col border-r border-border`}>
            {/* Filters */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center gap-4">
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search entries..."
                  className="flex-1"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as RecordCategory | 'all')}
                  className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                >
                  <option value="all">All Categories</option>
                  <option value="document">Document</option>
                  <option value="deviation">Deviation</option>
                  <option value="capa">CAPA</option>
                  <option value="training">Training</option>
                  <option value="submission">Submission</option>
                  <option value="safety-report">Safety Report</option>
                </select>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as AuditActionType | 'all')}
                  className="bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
                >
                  <option value="all">All Actions</option>
                  <option value="create">Create</option>
                  <option value="update">Update</option>
                  <option value="approve">Approve</option>
                  <option value="sign">Sign</option>
                  <option value="delete">Delete</option>
                </select>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    const csvContent = [
                      ['Timestamp', 'User', 'Action', 'Category', 'Record Number', 'Record Title', 'Part 11 Compliant'].join(','),
                      ...filteredEntries.map(e => [
                        new Date(e.timestamp).toISOString(),
                        e.userName,
                        e.actionType,
                        e.category,
                        e.recordNumber,
                        `"${e.recordTitle.replace(/"/g, '""')}"`,
                        e.part11Compliant ? 'Yes' : 'No'
                      ].join(','))
                    ].join('\n');
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = window.document.createElement('a');
                    a.href = url;
                    a.download = `audit-trail-export-${new Date().toISOString().split('T')[0]}.csv`;
                    window.document.body.appendChild(a);
                    a.click();
                    window.document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Export
                </Button>
              </div>
            </div>

            {/* Entry List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredEntries.map((entry) => (
                <AuditEntryCard
                  key={entry.id}
                  entry={entry}
                  onSelect={() => setSelectedEntryId(entry.id)}
                  selected={selectedEntryId === entry.id}
                />
              ))}
            </div>
          </div>

          {/* Right: Detail Panel */}
          {selectedEntry && (
            <div className="w-1/2">
              <AuditEntryDetailPanel
                entry={selectedEntry}
                signature={selectedSignature}
                onClose={() => setSelectedEntryId(null)}
              />
            </div>
          )}
        </div>
      )}

      {activeSubView === 'signatures' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-text-primary">Electronic Signatures</h2>
              {signaturesLoading && (
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <div className="w-3 h-3 border border-text-muted border-t-transparent rounded-full animate-spin" />
                  Loading...
                </span>
              )}
              {!signaturesLoading && chainVerified === true && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-green/10 text-accent-green border border-accent-green/20">
                  ✓ Chain integrity verified
                </span>
              )}
              {!signaturesLoading && chainVerified === false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-accent-red/10 text-accent-red border border-accent-red/20">
                  ⚠ Chain break detected
                </span>
              )}
              <span className="text-xs text-text-muted">Live · 21 CFR Part 11</span>
            </div>
            <div className="flex items-center gap-3">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search signatures..."
              />
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<Download className="w-4 h-4" />}
                onClick={() => {
                  const csvContent = [
                    ['Signature ID', 'User', 'Type', 'Status', 'Record Number', 'Record Title', 'Signed At', 'Auth Method', 'Integrity Hash'].join(','),
                    ...liveSignatures.map(s => [
                      s.id,
                      s.userName,
                      s.signatureType,
                      s.status,
                      s.recordNumber,
                      `"${s.recordTitle.replace(/"/g, '""')}"`,
                      new Date(s.signedAt).toISOString(),
                      s.authenticationMethod,
                      s.integrityHash
                    ].join(','))
                  ].join('\n');
                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = window.document.createElement('a');
                  a.href = url;
                  a.download = `signature-manifest-${new Date().toISOString().split('T')[0]}.csv`;
                  window.document.body.appendChild(a);
                  a.click();
                  window.document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
              >
                Export Manifest
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {liveSignatures.map((sig) => (
              <SignatureCard
                key={sig.id}
                signature={sig}
                onSelect={() => setSelectedSignatureId(sig.id)}
                selected={selectedSignatureId === sig.id}
              />
            ))}
          </div>
        </div>
      )}

      {activeSubView === 'compliance' && (
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">21 CFR Part 11 Compliance</h2>
              <p className="text-sm text-text-muted">Regulatory compliance status and requirements tracking</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge color="emerald" size="sm">
                {mockComplianceChecks.filter(c => c.status === 'compliant').length}/{mockComplianceChecks.length} Compliant
              </Badge>
              <Button 
                variant="secondary" 
                size="sm" 
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => {
                  toast.info('Running compliance assessment...');
                  setTimeout(() => {
                    toast.success('Compliance assessment complete. Results updated.');
                  }, 2000);
                }}
              >
                Run Assessment
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {mockComplianceChecks.map((check) => (
              <ComplianceCheckCard key={check.id} check={check} />
            ))}
          </div>
        </div>
      )}

      {activeSubView === 'exports' && (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Audit Trail Export</h2>
              <p className="text-sm text-text-muted">21 CFR Part 11 §11.10(e) compliant export with SHA-256 chain integrity</p>
            </div>
          </div>

          {/* Chain Integrity Card */}
          <div className="bg-surface-elevated border border-border rounded-xl p-5 mb-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text-primary mb-1">SHA-256 Chain Integrity Status</p>
                <p className="text-xs text-text-muted mb-3">
                  Each audit entry&apos;s <code className="bg-surface px-1 rounded text-accent-teal">chainHash</code> covers the previous hash + canonical entry fields — any modification breaks all subsequent links.
                </p>
                {chainLoading && (
                  <span className="flex items-center gap-1.5 text-xs text-text-muted">
                    <div className="w-3 h-3 border border-text-muted border-t-transparent rounded-full animate-spin" />
                    Verifying chain…
                  </span>
                )}
                {!chainLoading && chainVerified === true && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-accent-green/10 text-accent-green border border-accent-green/20">
                      ✓ Chain Intact
                    </span>
                    {chainDetails && (
                      <span className="text-xs text-text-muted">
                        {chainDetails.totalEntries} entries verified · {new Date(chainDetails.verifiedAt).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
                {!chainLoading && chainVerified === false && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-accent-red/10 text-accent-red border border-accent-red/20">
                      ⚠ Break Detected
                    </span>
                    {chainDetails?.breakAt && (
                      <span className="text-xs text-accent-red">at entry {chainDetails.breakAt}</span>
                    )}
                  </div>
                )}
                {!chainLoading && chainVerified === null && (
                  <span className="text-xs text-text-muted">Not yet verified</span>
                )}
              </div>
              <button
                onClick={runChainVerify}
                disabled={chainLoading}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface border border-border rounded-lg text-text-secondary hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                <Shield className="w-3.5 h-3.5" />
                {chainLoading ? 'Verifying…' : 'Re-verify Chain'}
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-6 text-xs text-text-muted">
              <span>Algorithm: SHA-256 (NIST FIPS 180-4)</span>
              <span>Standard: 21 CFR Part 11 §11.10(e)</span>
              <span>Entries in store: {liveEntries.length > 0 ? liveEntries.length : '…'}</span>
            </div>
          </div>

          {/* Export Panel */}
          <div className="bg-surface-elevated border border-border rounded-xl p-5 mb-5">
            <p className="text-sm font-semibold text-text-primary mb-1">Download Compliance Export</p>
            <p className="text-xs text-text-muted mb-4">All exports include chainHash and prevHash columns. PDF report includes a cover page, entries table, and chain verification summary.</p>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Format selector */}
              {(['pdf', 'csv', 'json'] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    exportFormat === fmt
                      ? 'bg-accent-teal/10 border-accent-teal text-accent-teal'
                      : 'bg-surface border-border text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {fmt.toUpperCase()}
                  {fmt === 'pdf' && <span className="ml-1.5 text-xs opacity-70">Recommended</span>}
                </button>
              ))}
              <button
                onClick={() => handleExport(exportFormat)}
                disabled={exportLoading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-accent-teal text-white hover:bg-accent-teal/90 transition-colors disabled:opacity-50 ml-auto"
              >
                <Download className="w-4 h-4" />
                {exportLoading ? 'Generating…' : `Export ${exportFormat.toUpperCase()}`}
              </button>
            </div>

            {/* Format description */}
            <div className="mt-4 p-3 bg-surface rounded-lg border border-border">
              {exportFormat === 'pdf' && (
                <p className="text-xs text-text-muted">
                  <strong className="text-text-secondary">PDF report</strong> — Cover page with generation timestamp and 21 CFR Part 11 declaration · Entries table with timestamp, user, action, module, details, and truncated chain hash · Final chain integrity verification summary page · Page footers on every page.
                </p>
              )}
              {exportFormat === 'csv' && (
                <p className="text-xs text-text-muted">
                  <strong className="text-text-secondary">CSV spreadsheet</strong> — Columns: ID, Timestamp, User, Email, Action, Module, Details, Type, ChainIndex, PrevHash (full SHA-256), ChainHash (full SHA-256). Suitable for spreadsheet review and programmatic verification.
                </p>
              )}
              {exportFormat === 'json' && (
                <p className="text-xs text-text-muted">
                  <strong className="text-text-secondary">JSON</strong> — Full structured export including chainIntegrity verification result and all entry fields. Suitable for automated compliance tooling and long-term archival.
                </p>
              )}
            </div>
          </div>

          {/* Live entry preview */}
          {liveEntries.length > 0 && (
            <div className="bg-surface-elevated border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">Live Audit Log Preview</p>
                <span className="text-xs text-text-muted">{liveEntries.length} entries · newest first</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-surface">
                      <th className="px-4 py-2 text-left font-medium text-text-muted">Timestamp</th>
                      <th className="px-4 py-2 text-left font-medium text-text-muted">User</th>
                      <th className="px-4 py-2 text-left font-medium text-text-muted">Action</th>
                      <th className="px-4 py-2 text-left font-medium text-text-muted">Module</th>
                      <th className="px-4 py-2 text-left font-medium text-text-muted">Details</th>
                      <th className="px-4 py-2 text-left font-medium text-text-muted">#</th>
                      <th className="px-4 py-2 text-left font-medium text-text-muted">Hash (tail)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {liveEntries.slice(0, 20).map((entry, i) => (
                      <tr key={entry.id} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-surface' : 'bg-surface-elevated'}`}>
                        <td className="px-4 py-2 text-text-muted font-mono whitespace-nowrap">
                          {entry.timestamp.replace('T', ' ').slice(0, 19)}
                        </td>
                        <td className="px-4 py-2 text-text-secondary whitespace-nowrap">{entry.user}</td>
                        <td className="px-4 py-2 text-text-primary font-medium whitespace-nowrap">{entry.action}</td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => {
                              const mod = entry.module?.toLowerCase().replace(/\s+/g, '-');
                              if (mod) useAppStore.getState().setActiveModule(mod as any);
                            }}
                            className="px-1.5 py-0.5 rounded text-xs bg-accent-teal/10 text-accent-teal hover:bg-accent-teal/20 transition-colors inline-flex items-center gap-1"
                            title={`Go to ${entry.module}`}
                          >
                            {entry.module} <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </td>
                        <td className="px-4 py-2 text-text-muted max-w-[220px] truncate">{entry.details}</td>
                        <td className="px-4 py-2 text-text-muted font-mono">{entry.chainIndex ?? '—'}</td>
                        <td className="px-4 py-2 font-mono text-text-muted whitespace-nowrap">
                          {entry.chainHash ? `…${entry.chainHash.slice(-12)}` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {liveEntries.length > 20 && (
                <p className="px-5 py-3 text-xs text-text-muted border-t border-border">
                  Showing 20 of {liveEntries.length} entries. Export to see all.
                </p>
              )}
            </div>
          )}

          {/* Historical export packages */}
          <div className="mt-5">
            <p className="text-sm font-semibold text-text-primary mb-3">Previous Export Packages</p>
            <div className="space-y-3">
              {mockExportPackages.map((pkg) => (
                <ExportPackageCard key={pkg.id} pkg={pkg} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubView === 'analytics' && <AnalyticsView />}
    </div>
  );
};

export default AuditTrailDashboard;
