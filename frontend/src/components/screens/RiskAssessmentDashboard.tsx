

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertOctagon,
  AlertCircle,
  CircleDot,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  Eye,
  Edit3,
  History,
  Link2,
  Users,
  Building2,
  Layers,
  BarChart3,
  PieChart,
  Grid3X3,
  ListFilter,
  Zap,
  BookOpen,
  GitBranch,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';

// =============================================================================
// TYPES
// =============================================================================

export type RiskCategory = 
  | 'safety'
  | 'efficacy'
  | 'quality'
  | 'regulatory'
  | 'operational'
  | 'financial'
  | 'reputational'
  | 'supply-chain';

export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost-certain';
export type RiskImpact = 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type RiskStatus = 'identified' | 'analyzing' | 'mitigating' | 'monitoring' | 'closed' | 'accepted';
export type MitigationStatus = 'planned' | 'in-progress' | 'completed' | 'overdue' | 'cancelled';
export type RegulatoryImpactLevel = 'none' | 'minor' | 'moderate' | 'major' | 'critical';

export type RiskSource = 
  | 'clinical-trial'
  | 'manufacturing'
  | 'supply-chain'
  | 'regulatory-submission'
  | 'post-market'
  | 'audit-finding'
  | 'deviation'
  | 'capa'
  | 'change-control'
  | 'external';

export interface RiskOwner {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
}

export interface MitigationAction {
  id: string;
  riskId: string;
  title: string;
  description: string;
  actionType: 'preventive' | 'detective' | 'corrective' | 'contingency';
  status: MitigationStatus;
  owner: RiskOwner;
  dueDate: string;
  completedDate?: string;
  effectiveness?: 'effective' | 'partially-effective' | 'ineffective' | 'pending-review';
  residualRiskReduction?: number;
  resources: string[];
  dependencies: string[];
  verificationMethod: string;
  evidence?: string[];
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegulatoryImpactAssessment {
  id: string;
  riskId: string;
  impactLevel: RegulatoryImpactLevel;
  affectedRegions: string[];
  affectedSubmissions: string[];
  affectedProducts: string[];
  regulatoryFrameworks: string[];
  notificationRequired: boolean;
  notificationDeadline?: string;
  notificationStatus?: 'not-required' | 'pending' | 'submitted' | 'acknowledged';
  assessedBy: string;
  assessedDate: string;
  comments: string;
  attachedGuidances: string[];
}

export interface RiskAssessment {
  id: string;
  riskNumber: string;
  title: string;
  description: string;
  category: RiskCategory;
  source: RiskSource;
  sourceId?: string;
  status: RiskStatus;
  inherentLikelihood: RiskLikelihood;
  inherentImpact: RiskImpact;
  inherentRiskLevel: RiskLevel;
  inherentRiskScore: number;
  residualLikelihood?: RiskLikelihood;
  residualImpact?: RiskImpact;
  residualRiskLevel?: RiskLevel;
  residualRiskScore?: number;
  trend: 'improving' | 'stable' | 'worsening';
  previousRiskScore?: number;
  riskOwner: RiskOwner;
  createdBy: string;
  affectedProducts: string[];
  affectedProcesses: string[];
  affectedDepartments: string[];
  mitigationActions: MitigationAction[];
  regulatoryImpact: RegulatoryImpactAssessment;
  identifiedDate: string;
  reviewDueDate: string;
  lastReviewDate?: string;
  closedDate?: string;
  tags: string[];
  attachments: string[];
  linkedRisks: string[];
  linkedDocuments: string[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CONSTANTS & UTILITIES
// =============================================================================

export const LIKELIHOOD_VALUES: Record<RiskLikelihood, number> = {
  'rare': 1, 'unlikely': 2, 'possible': 3, 'likely': 4, 'almost-certain': 5,
};

export const IMPACT_VALUES: Record<RiskImpact, number> = {
  'negligible': 1, 'minor': 2, 'moderate': 3, 'major': 4, 'catastrophic': 5,
};

export const LIKELIHOOD_LABELS: Record<RiskLikelihood, string> = {
  'rare': 'Rare (<1%)', 'unlikely': 'Unlikely (1-10%)', 'possible': 'Possible (10-50%)',
  'likely': 'Likely (50-90%)', 'almost-certain': 'Almost Certain (>90%)',
};

export const IMPACT_LABELS: Record<RiskImpact, string> = {
  'negligible': 'Negligible', 'minor': 'Minor', 'moderate': 'Moderate',
  'major': 'Major', 'catastrophic': 'Catastrophic',
};

export const calculateRiskScore = (likelihood: RiskLikelihood, impact: RiskImpact): number => 
  LIKELIHOOD_VALUES[likelihood] * IMPACT_VALUES[impact];

export const getRiskLevel = (score: number): RiskLevel => {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
};

export const getRiskLevelFromMatrix = (likelihood: RiskLikelihood, impact: RiskImpact): RiskLevel =>
  getRiskLevel(calculateRiskScore(likelihood, impact));

const riskLevelColorMap: Record<RiskLevel, string> = {
  'low': 'emerald', 'medium': 'amber', 'high': 'orange', 'critical': 'red',
};

const riskStatusColorMap: Record<RiskStatus, string> = {
  'identified': 'blue', 'analyzing': 'purple', 'mitigating': 'amber',
  'monitoring': 'teal', 'closed': 'gray', 'accepted': 'slate',
};

const categoryColorMap: Record<RiskCategory, string> = {
  'safety': 'red', 'efficacy': 'purple', 'quality': 'blue', 'regulatory': 'amber',
  'operational': 'teal', 'financial': 'emerald', 'reputational': 'orange', 'supply-chain': 'cyan',
};

const mitigationStatusColorMap: Record<MitigationStatus, string> = {
  'planned': 'slate', 'in-progress': 'blue', 'completed': 'emerald', 'overdue': 'red', 'cancelled': 'gray',
};

const regulatoryImpactColorMap: Record<RegulatoryImpactLevel, string> = {
  'none': 'gray', 'minor': 'blue', 'moderate': 'amber', 'major': 'orange', 'critical': 'red',
};

const trendIconMap: Record<'improving' | 'stable' | 'worsening', typeof ArrowUp> = {
  'improving': ArrowDown, 'stable': Minus, 'worsening': ArrowUp,
};

const trendColorMap: Record<'improving' | 'stable' | 'worsening', string> = {
  'improving': 'text-emerald-400', 'stable': 'text-amber-400', 'worsening': 'text-red-400',
};

// =============================================================================
// MOCK DATA
// =============================================================================

const mockRiskOwners: RiskOwner[] = [
  { id: 'owner-1', name: 'Dr. Sarah Chen', role: 'VP Quality', department: 'Quality Assurance', email: 'sarah.chen@ligature.com' },
  { id: 'owner-2', name: 'Michael Rodriguez', role: 'Director Regulatory', department: 'Regulatory Affairs', email: 'michael.rodriguez@ligature.com' },
  { id: 'owner-3', name: 'Jennifer Walsh', role: 'Clinical Operations Lead', department: 'Clinical Operations', email: 'jennifer.walsh@ligature.com' },
  { id: 'owner-4', name: 'David Park', role: 'Supply Chain Manager', department: 'Supply Chain', email: 'david.park@ligature.com' },
  { id: 'owner-5', name: 'Amanda Foster', role: 'Safety Officer', department: 'Pharmacovigilance', email: 'amanda.foster@ligature.com' },
];

const mockRisks: RiskAssessment[] = [
  {
    id: 'risk-1', riskNumber: 'RSK-2025-001',
    title: 'Manufacturing Batch Failure Risk',
    description: 'Potential for batch failures during scale-up from clinical to commercial manufacturing for Nexavant (LIG-2847). Process parameters not fully optimized for larger batch sizes.',
    category: 'quality', source: 'manufacturing', status: 'mitigating',
    inherentLikelihood: 'likely', inherentImpact: 'major', inherentRiskLevel: 'critical', inherentRiskScore: 16,
    residualLikelihood: 'possible', residualImpact: 'moderate', residualRiskLevel: 'medium', residualRiskScore: 9,
    trend: 'improving', previousRiskScore: 16, riskOwner: mockRiskOwners[0], createdBy: 'Michael Rodriguez',
    affectedProducts: ['LIG-2847 (Nexavant)'], affectedProcesses: ['Manufacturing', 'Scale-up', 'Quality Control'],
    affectedDepartments: ['Manufacturing', 'Quality Assurance', 'Quality Control'],
    mitigationActions: [
      { id: 'action-1', riskId: 'risk-1', title: 'Process Parameter Optimization Study', description: 'Conduct DoE study to optimize critical process parameters for commercial scale', actionType: 'preventive', status: 'completed', owner: mockRiskOwners[0], dueDate: '2025-11-15', completedDate: '2025-11-10', effectiveness: 'effective', residualRiskReduction: 25, resources: ['Process Engineering Team', 'QbD Consultant'], dependencies: [], verificationMethod: 'Review DoE study report and validation protocol', evidence: ['DoE-Study-Report-2025.pdf'], createdAt: '2025-10-01', updatedAt: '2025-11-10' },
      { id: 'action-2', riskId: 'risk-1', title: 'Engineering Batch Runs', description: 'Execute 3 engineering batches at commercial scale with optimized parameters', actionType: 'preventive', status: 'in-progress', owner: mockRiskOwners[0], dueDate: '2026-01-30', residualRiskReduction: 25, resources: ['Manufacturing Team', 'QC Lab'], dependencies: ['action-1'], verificationMethod: 'Batch record review and yield analysis', createdAt: '2025-10-01', updatedAt: '2025-12-15' },
      { id: 'action-3', riskId: 'risk-1', title: 'Real-time Process Monitoring', description: 'Implement PAT sensors for critical parameters during manufacturing', actionType: 'detective', status: 'planned', owner: mockRiskOwners[0], dueDate: '2026-03-15', residualRiskReduction: 15, resources: ['Engineering', 'IT', 'Validation'], dependencies: ['action-2'], verificationMethod: 'IQ/OQ/PQ validation protocols', createdAt: '2025-10-01', updatedAt: '2025-12-20' },
    ],
    regulatoryImpact: { id: 'regimpact-1', riskId: 'risk-1', impactLevel: 'major', affectedRegions: ['US', 'EU', 'Japan'], affectedSubmissions: ['NDA-2025-001', 'MAA-2025-001'], affectedProducts: ['LIG-2847'], regulatoryFrameworks: ['ICH Q8', 'ICH Q9', 'ICH Q10', '21 CFR 211'], notificationRequired: false, assessedBy: 'Michael Rodriguez', assessedDate: '2025-10-05', comments: 'Manufacturing changes may require CBE-30 supplements if process parameters change beyond approved ranges.', attachedGuidances: ['FDA-CMC-Guidance-2023.pdf'] },
    identifiedDate: '2025-09-15', reviewDueDate: '2026-01-15', lastReviewDate: '2025-12-20',
    tags: ['manufacturing', 'scale-up', 'Nexavant', 'high-priority'], attachments: [], linkedRisks: ['risk-3'], linkedDocuments: ['SOP-MFG-001', 'Protocol-PV-2025-001'], createdAt: '2025-09-15', updatedAt: '2025-12-20',
  },
  {
    id: 'risk-2', riskNumber: 'RSK-2025-002',
    title: 'FDA Complete Response Letter Risk',
    description: 'Risk of receiving a Complete Response Letter (CRL) from FDA for Nexavant NDA due to pending clinical pharmacology questions.',
    category: 'regulatory', source: 'regulatory-submission', sourceId: 'SUB-2025-001', status: 'monitoring',
    inherentLikelihood: 'possible', inherentImpact: 'catastrophic', inherentRiskLevel: 'high', inherentRiskScore: 15,
    residualLikelihood: 'unlikely', residualImpact: 'catastrophic', residualRiskLevel: 'medium', residualRiskScore: 10,
    trend: 'stable', previousRiskScore: 10, riskOwner: mockRiskOwners[1], createdBy: 'Jennifer Walsh',
    affectedProducts: ['LIG-2847 (Nexavant)'], affectedProcesses: ['NDA Review', 'FDA Communication'],
    affectedDepartments: ['Regulatory Affairs', 'Clinical Development', 'Medical Affairs'],
    mitigationActions: [
      { id: 'action-4', riskId: 'risk-2', title: 'Pre-submission Meeting with FDA', description: 'Request Type B meeting with FDA to clarify clinical pharmacology requirements', actionType: 'preventive', status: 'completed', owner: mockRiskOwners[1], dueDate: '2025-10-30', completedDate: '2025-10-28', effectiveness: 'effective', residualRiskReduction: 30, resources: ['Regulatory Team', 'Clinical Pharmacology'], dependencies: [], verificationMethod: 'Meeting minutes and FDA response', evidence: ['FDA-Meeting-Minutes-2025-10-28.pdf'], createdAt: '2025-09-20', updatedAt: '2025-10-28' },
      { id: 'action-5', riskId: 'risk-2', title: 'Submit Response to FDA Questions', description: 'Provide comprehensive responses to pending HAQ items with additional data analysis', actionType: 'corrective', status: 'completed', owner: mockRiskOwners[1], dueDate: '2025-12-15', completedDate: '2025-12-10', effectiveness: 'effective', residualRiskReduction: 20, resources: ['Clinical Pharmacology', 'Biostatistics', 'Medical Writing'], dependencies: ['action-4'], verificationMethod: 'FDA acknowledgment of submission', evidence: ['HAQ-Response-Package-Final.pdf'], createdAt: '2025-09-20', updatedAt: '2025-12-10' },
    ],
    regulatoryImpact: { id: 'regimpact-2', riskId: 'risk-2', impactLevel: 'critical', affectedRegions: ['US'], affectedSubmissions: ['NDA-2025-001'], affectedProducts: ['LIG-2847'], regulatoryFrameworks: ['21 CFR 314', 'FDA Guidance on Complete Response'], notificationRequired: false, assessedBy: 'Michael Rodriguez', assessedDate: '2025-09-22', comments: 'CRL would delay US launch by minimum 6-12 months. Close monitoring of FDA communication required.', attachedGuidances: [] },
    identifiedDate: '2025-09-18', reviewDueDate: '2026-02-15', lastReviewDate: '2025-12-28',
    tags: ['regulatory', 'FDA', 'NDA', 'Nexavant'], attachments: [], linkedRisks: [], linkedDocuments: ['NDA-2025-001'], createdAt: '2025-09-18', updatedAt: '2025-12-28',
  },
  {
    id: 'risk-3', riskNumber: 'RSK-2025-003',
    title: 'API Supply Single Source Dependency',
    description: 'Single supplier dependency for critical API intermediate creates supply chain vulnerability for Nexavant production.',
    category: 'supply-chain', source: 'supply-chain', status: 'mitigating',
    inherentLikelihood: 'possible', inherentImpact: 'major', inherentRiskLevel: 'high', inherentRiskScore: 12,
    residualLikelihood: 'unlikely', residualImpact: 'moderate', residualRiskLevel: 'medium', residualRiskScore: 6,
    trend: 'improving', previousRiskScore: 12, riskOwner: mockRiskOwners[3], createdBy: 'David Park',
    affectedProducts: ['LIG-2847 (Nexavant)', 'LIG-3021'], affectedProcesses: ['Procurement', 'API Manufacturing', 'Inventory Management'],
    affectedDepartments: ['Supply Chain', 'Manufacturing', 'Quality Assurance'],
    mitigationActions: [
      { id: 'action-6', riskId: 'risk-3', title: 'Qualify Secondary API Supplier', description: 'Identify and qualify alternative supplier for critical API intermediate', actionType: 'preventive', status: 'in-progress', owner: mockRiskOwners[3], dueDate: '2026-04-30', residualRiskReduction: 40, resources: ['Procurement', 'Quality', 'Technical Operations'], dependencies: [], verificationMethod: 'Supplier qualification report and audit completion', createdAt: '2025-10-15', updatedAt: '2025-12-20' },
      { id: 'action-7', riskId: 'risk-3', title: 'Increase Safety Stock', description: 'Increase safety stock levels from 3 months to 6 months supply', actionType: 'contingency', status: 'completed', owner: mockRiskOwners[3], dueDate: '2025-12-31', completedDate: '2025-12-15', effectiveness: 'effective', residualRiskReduction: 20, resources: ['Warehouse', 'Finance'], dependencies: [], verificationMethod: 'Inventory report verification', evidence: ['Inventory-Report-Dec-2025.pdf'], createdAt: '2025-10-15', updatedAt: '2025-12-15' },
    ],
    regulatoryImpact: { id: 'regimpact-3', riskId: 'risk-3', impactLevel: 'moderate', affectedRegions: ['US', 'EU'], affectedSubmissions: ['NDA-2025-001', 'MAA-2025-001'], affectedProducts: ['LIG-2847'], regulatoryFrameworks: ['ICH Q7', '21 CFR 211.84'], notificationRequired: true, notificationDeadline: '2026-06-30', notificationStatus: 'pending', assessedBy: 'Michael Rodriguez', assessedDate: '2025-10-20', comments: 'Secondary supplier will require regulatory notification as CBE-0 supplement upon qualification.', attachedGuidances: ['FDA-Supplier-Change-Guidance.pdf'] },
    identifiedDate: '2025-10-10', reviewDueDate: '2026-01-31', lastReviewDate: '2025-12-20',
    tags: ['supply-chain', 'single-source', 'API'], attachments: [], linkedRisks: ['risk-1'], linkedDocuments: [], createdAt: '2025-10-10', updatedAt: '2025-12-20',
  },
  {
    id: 'risk-4', riskNumber: 'RSK-2025-004',
    title: 'Clinical Trial Site Compliance Deviations',
    description: 'Pattern of minor protocol deviations identified at 3 clinical trial sites during routine monitoring visits for NOVA-301 trial.',
    category: 'safety', source: 'clinical-trial', sourceId: 'TRIAL-NOVA-301', status: 'analyzing',
    inherentLikelihood: 'likely', inherentImpact: 'moderate', inherentRiskLevel: 'high', inherentRiskScore: 12,
    trend: 'worsening', previousRiskScore: 9, riskOwner: mockRiskOwners[2], createdBy: 'Jennifer Walsh',
    affectedProducts: ['LIG-3021'], affectedProcesses: ['Clinical Trial Conduct', 'Data Integrity', 'Subject Safety'],
    affectedDepartments: ['Clinical Operations', 'Data Management', 'Pharmacovigilance'],
    mitigationActions: [
      { id: 'action-8', riskId: 'risk-4', title: 'Targeted Site Re-Training', description: 'Conduct on-site retraining for affected sites on protocol procedures', actionType: 'corrective', status: 'in-progress', owner: mockRiskOwners[2], dueDate: '2026-01-15', resources: ['CRAs', 'Medical Monitor'], dependencies: [], verificationMethod: 'Training completion records and subsequent monitoring visit', createdAt: '2025-12-10', updatedAt: '2025-12-28' },
    ],
    regulatoryImpact: { id: 'regimpact-4', riskId: 'risk-4', impactLevel: 'moderate', affectedRegions: ['US', 'EU'], affectedSubmissions: [], affectedProducts: ['LIG-3021'], regulatoryFrameworks: ['ICH E6 R2', '21 CFR 312'], notificationRequired: false, assessedBy: 'Amanda Foster', assessedDate: '2025-12-12', comments: 'Deviations are minor and do not affect subject safety or data integrity. Enhanced monitoring implemented.', attachedGuidances: [] },
    identifiedDate: '2025-12-05', reviewDueDate: '2026-01-31', lastReviewDate: '2025-12-28',
    tags: ['clinical-trial', 'site-compliance', 'protocol-deviation'], attachments: [], linkedRisks: [], linkedDocuments: ['Protocol-NOVA-301-v3.0'], createdAt: '2025-12-05', updatedAt: '2025-12-28',
  },
  {
    id: 'risk-5', riskNumber: 'RSK-2025-005',
    title: 'Post-Market Safety Signal - Hepatotoxicity',
    description: 'Potential safety signal for hepatotoxicity identified from post-marketing data for Cardivex. 5 cases of elevated liver enzymes reported in 6 months.',
    category: 'safety', source: 'post-market', status: 'analyzing',
    inherentLikelihood: 'possible', inherentImpact: 'catastrophic', inherentRiskLevel: 'high', inherentRiskScore: 15,
    trend: 'stable', riskOwner: mockRiskOwners[4], createdBy: 'Amanda Foster',
    affectedProducts: ['LIG-1922 (Cardivex)'], affectedProcesses: ['Pharmacovigilance', 'Safety Reporting', 'Label Updates'],
    affectedDepartments: ['Pharmacovigilance', 'Medical Affairs', 'Regulatory Affairs'],
    mitigationActions: [
      { id: 'action-9', riskId: 'risk-5', title: 'Signal Evaluation and Assessment', description: 'Conduct comprehensive signal evaluation including literature review and database analysis', actionType: 'detective', status: 'in-progress', owner: mockRiskOwners[4], dueDate: '2026-01-31', resources: ['Pharmacovigilance', 'Epidemiology', 'Medical Affairs'], dependencies: [], verificationMethod: 'Signal evaluation report', createdAt: '2025-12-15', updatedAt: '2025-12-28' },
      { id: 'action-10', riskId: 'risk-5', title: 'Healthcare Provider Communication Plan', description: 'Develop DHCP letter if signal is confirmed', actionType: 'contingency', status: 'planned', owner: mockRiskOwners[4], dueDate: '2026-02-28', resources: ['Medical Affairs', 'Regulatory', 'Legal'], dependencies: ['action-9'], verificationMethod: 'DHCP letter approval', createdAt: '2025-12-15', updatedAt: '2025-12-28' },
    ],
    regulatoryImpact: { id: 'regimpact-5', riskId: 'risk-5', impactLevel: 'critical', affectedRegions: ['US', 'EU', 'Japan', 'Canada'], affectedSubmissions: [], affectedProducts: ['LIG-1922'], regulatoryFrameworks: ['ICH E2E', '21 CFR 314.80', 'EU GVP Module IX'], notificationRequired: true, notificationDeadline: '2026-01-15', notificationStatus: 'pending', assessedBy: 'Amanda Foster', assessedDate: '2025-12-16', comments: 'If signal confirmed, may require safety labeling update and potentially REMS modification.', attachedGuidances: ['FDA-Safety-Signal-Guidance.pdf'] },
    identifiedDate: '2025-12-10', reviewDueDate: '2026-01-15',
    tags: ['safety', 'post-market', 'signal', 'hepatotoxicity', 'urgent'], attachments: [], linkedRisks: [], linkedDocuments: [], createdAt: '2025-12-10', updatedAt: '2025-12-28',
  },
  {
    id: 'risk-6', riskNumber: 'RSK-2025-006',
    title: 'Data Integrity Audit Finding',
    description: 'Audit finding from internal audit identified gaps in electronic data integrity controls in QC laboratory.',
    category: 'quality', source: 'audit-finding', sourceId: 'AUDIT-2025-003', status: 'mitigating',
    inherentLikelihood: 'likely', inherentImpact: 'major', inherentRiskLevel: 'critical', inherentRiskScore: 16,
    residualLikelihood: 'unlikely', residualImpact: 'moderate', residualRiskLevel: 'low', residualRiskScore: 6,
    trend: 'improving', previousRiskScore: 12, riskOwner: mockRiskOwners[0], createdBy: 'Dr. Sarah Chen',
    affectedProducts: ['All Products'], affectedProcesses: ['QC Testing', 'Data Management', 'Batch Release'],
    affectedDepartments: ['Quality Control', 'IT', 'Quality Assurance'],
    mitigationActions: [
      { id: 'action-11', riskId: 'risk-6', title: 'Implement Audit Trail System Upgrade', description: 'Upgrade LIMS to include comprehensive audit trail functionality', actionType: 'corrective', status: 'completed', owner: mockRiskOwners[0], dueDate: '2025-12-15', completedDate: '2025-12-10', effectiveness: 'effective', residualRiskReduction: 40, resources: ['IT', 'Validation', 'QC'], dependencies: [], verificationMethod: 'Validation report and audit trail review', evidence: ['LIMS-Upgrade-Validation-Report.pdf'], createdAt: '2025-11-01', updatedAt: '2025-12-10' },
      { id: 'action-12', riskId: 'risk-6', title: 'Data Integrity Training Program', description: 'Roll out comprehensive data integrity training to all QC personnel', actionType: 'preventive', status: 'completed', owner: mockRiskOwners[0], dueDate: '2025-12-20', completedDate: '2025-12-18', effectiveness: 'effective', residualRiskReduction: 20, resources: ['Training', 'QC Management'], dependencies: [], verificationMethod: 'Training records and competency assessments', evidence: ['Training-Completion-Report.pdf'], createdAt: '2025-11-01', updatedAt: '2025-12-18' },
    ],
    regulatoryImpact: { id: 'regimpact-6', riskId: 'risk-6', impactLevel: 'major', affectedRegions: ['US', 'EU'], affectedSubmissions: [], affectedProducts: ['All'], regulatoryFrameworks: ['21 CFR Part 11', 'EU GMP Annex 11', 'FDA Data Integrity Guidance'], notificationRequired: false, assessedBy: 'Dr. Sarah Chen', assessedDate: '2025-11-05', comments: 'Corrective actions completed before next regulatory inspection scheduled for Q2 2026.', attachedGuidances: ['FDA-Data-Integrity-Guidance-2018.pdf'] },
    identifiedDate: '2025-10-28', reviewDueDate: '2026-01-31', lastReviewDate: '2025-12-20',
    tags: ['data-integrity', 'audit', '21-CFR-Part-11', 'LIMS'], attachments: [], linkedRisks: [], linkedDocuments: ['SOP-QC-001', 'CAPA-2025-015'], createdAt: '2025-10-28', updatedAt: '2025-12-20',
  },
];

// =============================================================================
// BADGE HELPERS
// =============================================================================

const getRiskLevelBadge = (level: RiskLevel) => <Badge color={riskLevelColorMap[level] as any} size="xs">{level.toUpperCase()}</Badge>;
const getRiskStatusBadge = (status: RiskStatus) => <Badge color={riskStatusColorMap[status] as any} size="xs">{status.replace(/-/g, ' ')}</Badge>;
const getCategoryBadge = (category: RiskCategory) => <Badge color={categoryColorMap[category] as any} size="xs">{category.replace(/-/g, ' ')}</Badge>;
const getMitigationStatusBadge = (status: MitigationStatus) => <Badge color={mitigationStatusColorMap[status] as any} size="xs">{status.replace(/-/g, ' ')}</Badge>;
const getRegulatoryImpactBadge = (level: RegulatoryImpactLevel) => <Badge color={regulatoryImpactColorMap[level] as any} size="xs">{level.toUpperCase()}</Badge>;

// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

type RiskView = 'register' | 'matrix' | 'mitigations' | 'regulatory' | 'analytics';

interface RiskAssessmentDashboardProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function RiskAssessmentDashboard({ filters: _filters }: RiskAssessmentDashboardProps) {
  const { selectedProduct } = useProductFilter();
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<RiskView>('register');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<RiskCategory | 'all'>('all');
  const [filterLevel, setFilterLevel] = useState<RiskLevel | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<RiskStatus | 'all'>('all');

  const stats = useMemo(() => {
    const activeRisks = mockRisks.filter(r => r.status !== 'closed');
    const criticalRisks = mockRisks.filter(r => r.inherentRiskLevel === 'critical' && r.status !== 'closed');
    const highRisks = mockRisks.filter(r => r.inherentRiskLevel === 'high' && r.status !== 'closed');
    const overdueMitigations = mockRisks.flatMap(r => r.mitigationActions).filter(
      a => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.dueDate) < new Date()
    );
    const pendingRegulatoryNotifications = mockRisks.filter(
      r => r.regulatoryImpact.notificationRequired && r.regulatoryImpact.notificationStatus === 'pending'
    );
    return {
      totalActive: activeRisks.length, critical: criticalRisks.length, high: highRisks.length,
      overdueMitigations: overdueMitigations.length, pendingNotifications: pendingRegulatoryNotifications.length,
      improving: mockRisks.filter(r => r.trend === 'improving').length,
      worsening: mockRisks.filter(r => r.trend === 'worsening').length,
    };
  }, []);

  const filteredRisks = useMemo(() => mockRisks.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.riskNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchesLevel = filterLevel === 'all' || r.inherentRiskLevel === filterLevel;
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesCategory && matchesLevel && matchesStatus;
  }), [searchQuery, filterCategory, filterLevel, filterStatus]);

  const selectedRisk = selectedRiskId ? mockRisks.find(r => r.id === selectedRiskId) || null : null;

  return (
    <div className="h-full flex flex-col">
      {/* Statistics Bar */}
      <div className="bg-surface-elevated border-b border-border px-6 py-4">
        <div className="grid grid-cols-7 gap-4">
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400"><Target className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-blue-400">{stats.totalActive}</div><div className="text-xs text-text-muted">Active Risks</div></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><AlertOctagon className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-red-400">{stats.critical}</div><div className="text-xs text-text-muted">Critical</div></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400"><AlertTriangle className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-orange-400">{stats.high}</div><div className="text-xs text-text-muted">High</div></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><Clock className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-amber-400">{stats.overdueMitigations}</div><div className="text-xs text-text-muted">Overdue Actions</div></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400"><FileText className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-purple-400">{stats.pendingNotifications}</div><div className="text-xs text-text-muted">Pending Notifications</div></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400"><TrendingDown className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-emerald-400">{stats.improving}</div><div className="text-xs text-text-muted">Improving</div></div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-surface rounded-lg">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400"><TrendingUp className="w-5 h-5" /></div>
            <div><div className="text-2xl font-bold text-red-400">{stats.worsening}</div><div className="text-xs text-text-muted">Worsening</div></div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-surface-elevated border-b border-border px-6 py-2">
        <div className="flex items-center gap-4">
          {[
            { id: 'register' as RiskView, label: 'Risk Register', icon: <ListFilter className="w-4 h-4" /> },
            { id: 'matrix' as RiskView, label: 'Risk Matrix', icon: <Grid3X3 className="w-4 h-4" /> },
            { id: 'mitigations' as RiskView, label: 'Mitigations', icon: <Shield className="w-4 h-4" /> },
            { id: 'regulatory' as RiskView, label: 'Regulatory Impact', icon: <FileText className="w-4 h-4" /> },
            { id: 'analytics' as RiskView, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${activeView === tab.id ? 'bg-orange-500/20 text-orange-400' : 'text-text-secondary hover:text-text-primary hover:bg-surface-card'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
          <div className="flex-1" />
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" onClick={() => toast.success('Risk action recorded — mitigation plan updated')} />}>New Risk</Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeView === 'register' && <RiskRegisterView risks={filteredRisks} selectedRisk={selectedRisk} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterLevel={filterLevel} setFilterLevel={setFilterLevel} filterStatus={filterStatus} setFilterStatus={setFilterStatus} onSelectRisk={setSelectedRiskId} />}
        {activeView === 'matrix' && <RiskMatrixView risks={mockRisks} onSelectRisk={setSelectedRiskId} />}
        {activeView === 'mitigations' && <MitigationsView risks={mockRisks} onSelectRisk={setSelectedRiskId} />}
        {activeView === 'regulatory' && <RegulatoryImpactView risks={mockRisks} onSelectRisk={setSelectedRiskId} />}
        {activeView === 'analytics' && <RiskAnalyticsView risks={mockRisks} />}
      </div>
    </div>
  );
}

// =============================================================================
// RISK REGISTER VIEW
// =============================================================================

interface RiskRegisterViewProps {
  risks: RiskAssessment[]; selectedRisk: RiskAssessment | null; searchQuery: string; setSearchQuery: (q: string) => void;
  filterCategory: RiskCategory | 'all'; setFilterCategory: (c: RiskCategory | 'all') => void;
  filterLevel: RiskLevel | 'all'; setFilterLevel: (l: RiskLevel | 'all') => void;
  filterStatus: RiskStatus | 'all'; setFilterStatus: (s: RiskStatus | 'all') => void;
  onSelectRisk: (id: string | null) => void;
}

function RiskRegisterView({ risks, selectedRisk, searchQuery, setSearchQuery, filterCategory, setFilterCategory, filterLevel, setFilterLevel, filterStatus, setFilterStatus, onSelectRisk }: RiskRegisterViewProps) {
  return (
    <div className="flex gap-6 h-full">
      <div className={`flex flex-col ${selectedRisk ? 'w-2/5' : 'w-full'}`}>
        <div className="flex items-center gap-4 mb-4">
          <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search risks..." className="flex-1" />
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value as RiskCategory | 'all')} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
            <option value="all">All Categories</option><option value="safety">Safety</option><option value="efficacy">Efficacy</option><option value="quality">Quality</option><option value="regulatory">Regulatory</option><option value="operational">Operational</option><option value="supply-chain">Supply Chain</option>
          </select>
          <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value as RiskLevel | 'all')} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
            <option value="all">All Levels</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as RiskStatus | 'all')} className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
            <option value="all">All Status</option><option value="identified">Identified</option><option value="analyzing">Analyzing</option><option value="mitigating">Mitigating</option><option value="monitoring">Monitoring</option><option value="closed">Closed</option>
          </select>
        </div>
        <div className="space-y-3 overflow-auto flex-1">
          {risks.map(risk => <RiskCard key={risk.id} risk={risk} isSelected={selectedRisk?.id === risk.id} onSelect={() => onSelectRisk(risk.id)} />)}
          {risks.length === 0 && <div className="text-center py-12 text-text-muted">No risks match your filters</div>}
        </div>
      </div>
      {selectedRisk && <div className="w-3/5 overflow-auto"><RiskDetailPanel risk={selectedRisk} onClose={() => onSelectRisk(null)} /></div>}
    </div>
  );
}

// =============================================================================
// RISK CARD
// =============================================================================

function RiskCard({ risk, isSelected, onSelect }: { risk: RiskAssessment; isSelected: boolean; onSelect: () => void }) {
  const TrendIcon = trendIconMap[risk.trend];
  return (
    <Card className={`cursor-pointer transition-all hover:border-orange-500/50 ${isSelected ? 'border-orange-500 bg-orange-500/5' : ''}`} onClick={onSelect}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2"><span className="text-xs font-mono text-text-muted">{risk.riskNumber}</span>{getCategoryBadge(risk.category)}</div>
          <div className="flex items-center gap-2">{getRiskLevelBadge(risk.residualRiskLevel || risk.inherentRiskLevel)}<span className={`flex items-center gap-1 ${trendColorMap[risk.trend]}`}><TrendIcon className="w-3 h-3" /></span></div>
        </div>
        <h3 className="text-sm font-medium text-text-primary mb-2 line-clamp-2">{risk.title}</h3>
        <p className="text-xs text-text-muted mb-3 line-clamp-2">{risk.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-muted"><Users className="w-3 h-3" />{risk.riskOwner.name}</div>
          <div className="flex items-center gap-2">{getRiskStatusBadge(risk.status)}{risk.mitigationActions.length > 0 && <span className="text-xs text-text-muted">{risk.mitigationActions.filter(a => a.status === 'completed').length}/{risk.mitigationActions.length} actions</span>}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// RISK DETAIL PANEL
// =============================================================================

function RiskDetailPanel({ risk, onClose }: { risk: RiskAssessment; onClose: () => void }) {
  const { deadClick } = useDeadClick();
  const [expandedSection, setExpandedSection] = useState<string | null>('scoring');
  const TrendIcon = trendIconMap[risk.trend];
  const toggleSection = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2"><span className="text-sm font-mono text-text-muted">{risk.riskNumber}</span>{getCategoryBadge(risk.category)}{getRiskStatusBadge(risk.status)}</div>
          <h2 className="text-lg font-semibold text-text-primary">{risk.title}</h2>
        </div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" icon={<Edit3 className="w-4 h-4" />}>Edit</Button><Button variant="outline" size="sm" onClick={onClose}>×</Button></div>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6 overflow-auto">
        <p className="text-sm text-text-secondary">{risk.description}</p>

        {/* Risk Scoring */}
        <div className="border border-border rounded-lg">
          <button className="w-full flex items-center justify-between p-4" onClick={() => toggleSection('scoring')}>
            <div className="flex items-center gap-2"><Target className="w-4 h-4 text-orange-400" /><span className="text-sm font-medium text-text-primary">Risk Scoring</span></div>
            {expandedSection === 'scoring' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSection === 'scoring' && (
            <div className="px-4 pb-4 border-t border-border pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-text-muted uppercase">Inherent Risk</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-text-muted">Likelihood:</div><div className="text-text-primary">{LIKELIHOOD_LABELS[risk.inherentLikelihood]}</div>
                    <div className="text-text-muted">Impact:</div><div className="text-text-primary">{IMPACT_LABELS[risk.inherentImpact]}</div>
                    <div className="text-text-muted">Score:</div><div className="flex items-center gap-2"><span className="text-lg font-bold text-text-primary">{risk.inherentRiskScore}</span>{getRiskLevelBadge(risk.inherentRiskLevel)}</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-text-muted uppercase">Residual Risk</h4>
                  {risk.residualRiskLevel ? (
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-text-muted">Likelihood:</div><div className="text-text-primary">{risk.residualLikelihood ? LIKELIHOOD_LABELS[risk.residualLikelihood] : '–'}</div>
                      <div className="text-text-muted">Impact:</div><div className="text-text-primary">{risk.residualImpact ? IMPACT_LABELS[risk.residualImpact] : '–'}</div>
                      <div className="text-text-muted">Score:</div><div className="flex items-center gap-2"><span className="text-lg font-bold text-text-primary">{risk.residualRiskScore}</span>{getRiskLevelBadge(risk.residualRiskLevel)}</div>
                    </div>
                  ) : <div className="text-sm text-text-muted italic">Not yet assessed</div>}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
                <span className="text-sm text-text-muted">Trend:</span>
                <span className={`flex items-center gap-1 text-sm ${trendColorMap[risk.trend]}`}><TrendIcon className="w-4 h-4" />{risk.trend.charAt(0).toUpperCase() + risk.trend.slice(1)}</span>
                {risk.previousRiskScore && <span className="text-xs text-text-muted">Previous score: {risk.previousRiskScore}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Mitigation Actions */}
        <div className="border border-border rounded-lg">
          <button className="w-full flex items-center justify-between p-4" onClick={() => toggleSection('mitigations')}>
            <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-blue-400" /><span className="text-sm font-medium text-text-primary">Mitigation Actions ({risk.mitigationActions.length})</span></div>
            {expandedSection === 'mitigations' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSection === 'mitigations' && (
            <div className="px-4 pb-4 border-t border-border pt-4 space-y-3">
              {risk.mitigationActions.map(action => (
                <div key={action.id} className="p-3 bg-surface rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge color={action.actionType === 'preventive' ? 'blue' : action.actionType === 'corrective' ? 'amber' : action.actionType === 'detective' ? 'purple' : 'slate'} size="xs">{action.actionType}</Badge>
                      {getMitigationStatusBadge(action.status)}
                    </div>
                    <span className="text-xs text-text-muted">Due: {new Date(action.dueDate).toLocaleDateString()}</span>
                  </div>
                  <h4 className="text-sm font-medium text-text-primary mb-1">{action.title}</h4>
                  <p className="text-xs text-text-muted mb-2">{action.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Owner: {action.owner.name}</span>
                    {action.residualRiskReduction && <span className="text-emerald-400">↓{action.residualRiskReduction}% risk reduction</span>}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => toast.success('Risk action recorded — mitigation plan updated')}><Plus className="w-4 h-4" />Add Mitigation Action</Button>
            </div>
          )}
        </div>

        {/* Regulatory Impact */}
        <div className="border border-border rounded-lg">
          <button className="w-full flex items-center justify-between p-4" onClick={() => toggleSection('regulatory')}>
            <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-purple-400" /><span className="text-sm font-medium text-text-primary">Regulatory Impact</span>{getRegulatoryImpactBadge(risk.regulatoryImpact.impactLevel)}</div>
            {expandedSection === 'regulatory' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSection === 'regulatory' && (
            <div className="px-4 pb-4 border-t border-border pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div><div className="text-text-muted mb-1">Affected Regions</div><div className="flex flex-wrap gap-1">{risk.regulatoryImpact.affectedRegions.map(r => <Badge key={r} color="slate" size="xs">{r}</Badge>)}</div></div>
                <div><div className="text-text-muted mb-1">Regulatory Frameworks</div><div className="flex flex-wrap gap-1">{risk.regulatoryImpact.regulatoryFrameworks.slice(0, 3).map(f => <Badge key={f} color="purple" size="xs">{f}</Badge>)}{risk.regulatoryImpact.regulatoryFrameworks.length > 3 && <Badge color="gray" size="xs">+{risk.regulatoryImpact.regulatoryFrameworks.length - 3}</Badge>}</div></div>
                {risk.regulatoryImpact.notificationRequired && (
                  <div className="col-span-1 md:col-span-2 p-3 bg-amber-500/10 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium mb-1"><AlertTriangle className="w-4 h-4" />Regulatory Notification Required</div>
                    <div className="text-xs text-text-muted">Deadline: {risk.regulatoryImpact.notificationDeadline ? new Date(risk.regulatoryImpact.notificationDeadline).toLocaleDateString() : 'TBD'}<Badge color={risk.regulatoryImpact.notificationStatus === 'pending' ? 'amber' : risk.regulatoryImpact.notificationStatus === 'submitted' ? 'blue' : 'emerald'} size="xs" className="ml-2">{risk.regulatoryImpact.notificationStatus}</Badge></div>
                  </div>
                )}
              </div>
              <div className="mt-3 text-sm text-text-muted">{risk.regulatoryImpact.comments}</div>
            </div>
          )}
        </div>

        {/* Affected Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div><h4 className="text-xs font-medium text-text-muted uppercase mb-2">Products</h4><div className="flex flex-wrap gap-1">{risk.affectedProducts.map(p => <Badge key={p} color="blue" size="xs">{p}</Badge>)}</div></div>
          <div><h4 className="text-xs font-medium text-text-muted uppercase mb-2">Processes</h4><div className="flex flex-wrap gap-1">{risk.affectedProcesses.slice(0, 3).map(p => <Badge key={p} color="slate" size="xs">{p}</Badge>)}</div></div>
          <div><h4 className="text-xs font-medium text-text-muted uppercase mb-2">Departments</h4><div className="flex flex-wrap gap-1">{risk.affectedDepartments.slice(0, 3).map(d => <Badge key={d} color="slate" size="xs">{d}</Badge>)}</div></div>
        </div>

        {/* Metadata */}
        <div className="pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs text-text-muted">
          <div>Identified: {new Date(risk.identifiedDate).toLocaleDateString()}</div>
          <div>Review Due: {new Date(risk.reviewDueDate).toLocaleDateString()}</div>
          <div>Last Review: {risk.lastReviewDate ? new Date(risk.lastReviewDate).toLocaleDateString() : 'N/A'}</div>
          <div>Owner: {risk.riskOwner.name}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// RISK MATRIX VIEW
// =============================================================================

function RiskMatrixView({ risks, onSelectRisk }: { risks: RiskAssessment[]; onSelectRisk: (id: string) => void }) {
  const likelihoods: RiskLikelihood[] = ['almost-certain', 'likely', 'possible', 'unlikely', 'rare'];
  const impacts: RiskImpact[] = ['negligible', 'minor', 'moderate', 'major', 'catastrophic'];

  const matrixData = useMemo(() => {
    const matrix: Record<string, { count: number; risks: RiskAssessment[]; level: RiskLevel }> = {};
    likelihoods.forEach(l => {
      impacts.forEach(i => {
        const key = `${l}-${i}`;
        const matchingRisks = risks.filter(r => r.status !== 'closed' && r.inherentLikelihood === l && r.inherentImpact === i);
        matrix[key] = { count: matchingRisks.length, risks: matchingRisks, level: getRiskLevelFromMatrix(l, i) };
      });
    });
    return matrix;
  }, [risks]);

  const getCellColor = (level: RiskLevel) => {
    switch (level) {
      case 'critical': return 'bg-red-500/30 hover:bg-red-500/40 border-red-500/50';
      case 'high': return 'bg-orange-500/30 hover:bg-orange-500/40 border-orange-500/50';
      case 'medium': return 'bg-amber-500/30 hover:bg-amber-500/40 border-amber-500/50';
      case 'low': return 'bg-emerald-500/30 hover:bg-emerald-500/40 border-emerald-500/50';
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Risk Matrix (5×5)</h2>
      <p className="text-sm text-text-muted mb-6">Visual representation of inherent risks by likelihood and impact. Click a cell to view risks.</p>
      <div className="flex">
        <div className="flex items-center justify-center w-12 mr-2"><span className="text-xs text-text-muted -rotate-90 whitespace-nowrap">LIKELIHOOD →</span></div>
        <div className="flex-1">
          <div className="grid grid-cols-6 gap-1">
            <div className="h-12" />
            {impacts.map(impact => <div key={impact} className="h-12 flex items-end justify-center pb-2"><span className="text-xs text-text-muted capitalize">{impact}</span></div>)}
            {likelihoods.map(likelihood => (
              <>
                <div key={`label-${likelihood}`} className="h-20 flex items-center justify-end pr-3"><span className="text-xs text-text-muted capitalize">{likelihood.replace('-', ' ')}</span></div>
                {impacts.map(impact => {
                  const key = `${likelihood}-${impact}`;
                  const cell = matrixData[key];
                  return (
                    <div key={key} className={`h-20 rounded-lg border cursor-pointer transition-colors flex flex-col items-center justify-center ${getCellColor(cell.level)}`}
                      onClick={() => cell.risks[0] && onSelectRisk(cell.risks[0].id)} title={`${cell.count} risk(s)`}>
                      <span className="text-2xl font-bold text-text-primary">{cell.count}</span>
                      {cell.count > 0 && <span className="text-xs text-text-muted">{cell.level}</span>}
                    </div>
                  );
                })}
              </>
            ))}
          </div>
          <div className="text-center mt-4"><span className="text-xs text-text-muted">IMPACT →</span></div>
        </div>
      </div>
      <div className="mt-8 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500/30 border border-emerald-500/50" /><span className="text-xs text-text-muted">Low (1-4)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-amber-500/30 border border-amber-500/50" /><span className="text-xs text-text-muted">Medium (5-9)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-orange-500/30 border border-orange-500/50" /><span className="text-xs text-text-muted">High (10-16)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50" /><span className="text-xs text-text-muted">Critical (17-25)</span></div>
      </div>
    </div>
  );
}

// =============================================================================
// MITIGATIONS VIEW
// =============================================================================

function MitigationsView({ risks, onSelectRisk }: { risks: RiskAssessment[]; onSelectRisk: (id: string) => void }) {
  const allActions = useMemo(() => {
    return risks.flatMap(r => r.mitigationActions.map(a => ({ ...a, risk: r }))).sort((a, b) => {
      const statusOrder: Record<MitigationStatus, number> = { 'overdue': 0, 'in-progress': 1, 'planned': 2, 'completed': 3, 'cancelled': 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) return statusOrder[a.status] - statusOrder[b.status];
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  }, [risks]);

  const stats = useMemo(() => ({
    total: allActions.length,
    completed: allActions.filter(a => a.status === 'completed').length,
    inProgress: allActions.filter(a => a.status === 'in-progress').length,
    overdue: allActions.filter(a => a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.dueDate) < new Date()).length,
  }), [allActions]);

  return (
    <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Mitigation Actions</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-text-muted"><span className="text-emerald-400 font-medium">{stats.completed}</span> completed</span>
          <span className="text-text-muted"><span className="text-blue-400 font-medium">{stats.inProgress}</span> in progress</span>
          <span className="text-text-muted"><span className="text-red-400 font-medium">{stats.overdue}</span> overdue</span>
        </div>
      </div>
      <div className="mb-6">
        <ProgressBar value={stats.completed} max={stats.total} color="emerald" showLabel />
        <div className="text-xs text-text-muted mt-1">{stats.completed} of {stats.total} actions completed</div>
      </div>
      <div className="space-y-3">
        {allActions.map(action => {
          const isOverdue = action.status !== 'completed' && action.status !== 'cancelled' && new Date(action.dueDate) < new Date();
          return (
            <Card key={action.id} className={`cursor-pointer hover:border-blue-500/50 ${isOverdue ? 'border-red-500/50' : ''}`} onClick={() => onSelectRisk(action.risk.id)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge color={action.actionType === 'preventive' ? 'blue' : action.actionType === 'corrective' ? 'amber' : action.actionType === 'detective' ? 'purple' : 'slate'} size="xs">{action.actionType}</Badge>
                      {getMitigationStatusBadge(isOverdue ? 'overdue' : action.status)}
                      <span className="text-xs text-text-muted">{action.risk.riskNumber}</span>
                    </div>
                    <h3 className="text-sm font-medium text-text-primary mb-1">{action.title}</h3>
                    <p className="text-xs text-text-muted line-clamp-1">{action.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{action.owner.name}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Due: {new Date(action.dueDate).toLocaleDateString()}</span>
                      {action.residualRiskReduction && <span className="text-emerald-400">↓{action.residualRiskReduction}% reduction</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {action.effectiveness && action.effectiveness !== 'pending-review' && <Badge color={action.effectiveness === 'effective' ? 'emerald' : action.effectiveness === 'partially-effective' ? 'amber' : 'red'} size="xs">{action.effectiveness}</Badge>}
                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// REGULATORY IMPACT VIEW
// =============================================================================

function RegulatoryImpactView({ risks, onSelectRisk }: { risks: RiskAssessment[]; onSelectRisk: (id: string) => void }) {
  const grouped = useMemo(() => {
    const groups: Record<RegulatoryImpactLevel, RiskAssessment[]> = {
      'none': [], 'minor': [], 'moderate': [], 'major': [], 'critical': []
    };
    risks.forEach(r => groups[r.regulatoryImpact.impactLevel as RegulatoryImpactLevel].push(r));
    return groups;
  }, [risks]);

  const pendingNotifications = useMemo(() => 
    risks.filter(r => r.regulatoryImpact.notificationRequired && r.regulatoryImpact.notificationStatus === 'pending')
  , [risks]);

  const impactLevels: RegulatoryImpactLevel[] = ['critical', 'major', 'moderate', 'minor', 'none'];

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Regulatory Impact Analysis</h2>
      
      {pendingNotifications.length > 0 && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-sm font-medium text-amber-400">{pendingNotifications.length} Pending Regulatory Notification{pendingNotifications.length > 1 ? 's' : ''}</div>
                <div className="text-xs text-text-muted mt-1">
                  {pendingNotifications.map(r => r.riskNumber).join(', ')} require health authority notification
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="space-y-4 md:space-y-6">
        {impactLevels.map(level => {
          const levelRisks = grouped[level];
          if (levelRisks.length === 0) return null;
          return (
            <div key={level}>
              <div className="flex items-center gap-2 mb-3">
                <Badge color={regulatoryImpactColorMap[level] as any} size="sm">{level}</Badge>
                <span className="text-sm text-text-muted">{levelRisks.length} risk{levelRisks.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {levelRisks.map(risk => (
                  <Card key={risk.id} className="cursor-pointer hover:border-blue-500/50" onClick={() => onSelectRisk(risk.id)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-text-muted">{risk.riskNumber}</span>
                            {getRiskLevelBadge((risk as any).residualRisk?.level || (risk as any).riskLevel)}
                          </div>
                          <h3 className="text-sm font-medium text-text-primary">{risk.title}</h3>
                          {risk.regulatoryImpact.affectedSubmissions.length > 0 && (
                            <div className="text-xs text-text-muted mt-1">
                              Affects: {risk.regulatoryImpact.affectedSubmissions.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {risk.regulatoryImpact.notificationRequired && (
                            <Badge 
                              color={(risk.regulatoryImpact.notificationStatus as string) === 'completed' ? 'emerald' : (risk.regulatoryImpact.notificationStatus as string) === 'in-progress' ? 'blue' : 'amber'} 
                              size="xs"
                            >
                              {(risk.regulatoryImpact.notificationStatus as string) === 'completed' ? 'Notified' : (risk.regulatoryImpact.notificationStatus as string) === 'in-progress' ? 'In Progress' : 'Notification Pending'}
                            </Badge>
                          )}
                          <ChevronRight className="w-4 h-4 text-text-muted" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// RISK ANALYTICS VIEW
// =============================================================================

function RiskAnalyticsView({ risks }: { risks: RiskAssessment[] }) {
  const analytics = useMemo(() => {
    const byLevel = { low: 0, medium: 0, high: 0, critical: 0 };
    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalReduction = 0;
    let reductionCount = 0;
    let effectiveCount = 0;
    let totalMitigations = 0;

    risks.forEach(r => {
      const rAny = r as any;
      const level = rAny.residualRisk?.level as 'low' | 'medium' | 'high' | 'critical' | undefined;
      if (level && byLevel[level] !== undefined) byLevel[level]++;
      byCategory[r.category] = (byCategory[r.category] || 0) + 1;
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      
      const inherentScore = rAny.inherentRisk?.score || 0;
      const residualScore = rAny.residualRisk?.score || 0;
      const reduction = inherentScore > 0 ? ((inherentScore - residualScore) / inherentScore) * 100 : 0;
      if (reduction > 0) {
        totalReduction += reduction;
        reductionCount++;
      }
      
      (rAny.mitigationActions || []).forEach((a: Record<string, unknown>) => {
        totalMitigations++;
        if (a.effectiveness === 'effective') effectiveCount++;
      });
    });

    return {
      total: risks.length,
      byLevel,
      byCategory,
      byStatus,
      avgReduction: reductionCount > 0 ? Math.round(totalReduction / reductionCount) : 0,
      effectivenessRate: totalMitigations > 0 ? Math.round((effectiveCount / totalMitigations) * 100) : 0,
    };
  }, [risks]);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-xl font-semibold text-text-primary mb-6">Risk Analytics</h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4 md:mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-text-primary">{analytics.total}</div>
            <div className="text-xs text-text-muted">Total Risks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">{analytics.avgReduction}%</div>
            <div className="text-xs text-text-muted">Avg Risk Reduction</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{analytics.effectivenessRate}%</div>
            <div className="text-xs text-text-muted">Mitigation Effectiveness</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-400">{analytics.byLevel.critical + analytics.byLevel.high}</div>
            <div className="text-xs text-text-muted">High/Critical Risks</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
        <Card>
          <CardHeader><h3 className="text-sm font-medium text-text-primary">Distribution by Level</h3></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(['critical', 'high', 'medium', 'low'] as const).map(level => (
                <div key={level} className="flex items-center gap-4">
                  <div className="w-16 text-sm text-text-secondary capitalize">{level}</div>
                  <div className="flex-1"><ProgressBar value={analytics.byLevel[level]} max={Math.max(...Object.values(analytics.byLevel), 1)} color={riskLevelColorMap[level] as any} size="sm" /></div>
                  <div className="w-8 text-right text-sm text-text-muted">{analytics.byLevel[level]}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><h3 className="text-sm font-medium text-text-primary">Distribution by Category</h3></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.byCategory).filter(([_, count]) => count > 0).sort((a, b) => b[1] - a[1]).map(([category, count]) => (
                <div key={category} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-text-secondary capitalize">{category.replace(/-/g, ' ')}</div>
                  <div className="flex-1"><ProgressBar value={count} max={Math.max(...Object.values(analytics.byCategory), 1)} color={categoryColorMap[category as RiskCategory] as any} size="sm" /></div>
                  <div className="w-8 text-right text-sm text-text-muted">{count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader><h3 className="text-sm font-medium text-text-primary">Risks by Status</h3></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
            {Object.entries(analytics.byStatus).map(([status, count]) => (
              <div key={status} className="text-center p-3 bg-surface rounded-lg">
                <div className="text-2xl font-bold text-text-primary">{count}</div>
                <div className="text-xs text-text-muted capitalize">{status.replace(/-/g, ' ')}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
