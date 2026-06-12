
// ============================================================================
// GLP Screen - v0.14.0: UI Polish (Consistent Card Backgrounds)
// ============================================================================
// 21 CFR Part 58 compliant GLP management interface
// All 7 tabs: Dashboard, Studies, Deviations, QA Audits, Archives, Personnel, Facilities
// ============================================================================

import { useState, useMemo, useEffect } from 'react';
import {
  Shield, FileText, Users, FlaskConical, ClipboardCheck, Archive, Building,
  Search, Plus, ChevronRight, CheckCircle, AlertTriangle, Clock, X,
  User, Calendar, ExternalLink, Eye, Edit, AlertCircle, TrendingUp,
  BarChart3, Activity, Gauge, Target, Beaker, Microscope, ThermometerSun,
  AlertOctagon, FileWarning, GraduationCap, Wrench, Package, RefreshCw,
} from 'lucide-react';
import { ReturnBreadcrumb } from '@/components/ui/ReturnBreadcrumb';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Button, IconButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useGLPStore } from '@/store/useGLPStore';
import { GLPEDCIntegrationTab } from '@/components/glp/GLPEDCIntegrationTab';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/store/useAppStore';
import { useDeadClick } from '@/hooks/useDeadClick';
import type {
  GLPTab, GLPStudy, GLPDeviation, GLPAudit, GLPPersonnel,
  GLPArchive, GLPTestFacility, GLPComplianceMetrics, GLPActionItem,
  GLPStudyStatus, DeviationSeverity, DeviationType, DeviationStatus,
  AuditType, AuditStatus, ArchiveStatus, PersonnelRole, TrainingStatus,
} from '@/store/glpTypes';

// ============================================================================
// COLOR MAPS
// ============================================================================

const studyStatusColors: Record<GLPStudyStatus, 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple'> = {
  'planned': 'gray',
  'protocol-draft': 'blue',
  'protocol-approved': 'blue',
  'in-progress': 'green',
  'in-life-complete': 'green',
  'analysis': 'amber',
  'report-draft': 'amber',
  'report-qc': 'amber',
  'report-signed': 'green',
  'archived': 'purple',
  'terminated': 'red',
};

const deviationSeverityColors: Record<DeviationSeverity, 'red' | 'amber' | 'blue'> = {
  'critical': 'red',
  'major': 'amber',
  'minor': 'blue',
};

const priorityColors: Record<string, 'red' | 'amber' | 'blue' | 'gray'> = {
  'critical': 'red',
  'high': 'amber',
  'medium': 'blue',
  'low': 'gray',
};

// ============================================================================
// TAB CONFIGURATION
// ============================================================================

interface TabConfig {
  id: GLPTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" />, description: 'Compliance overview' },
  { id: 'studies', label: 'Studies', icon: <FlaskConical className="w-4 h-4" />, description: 'GLP study registry' },
  { id: 'deviations', label: 'Deviations', icon: <AlertTriangle className="w-4 h-4" />, description: 'Protocol deviations' },
  { id: 'audits', label: 'QA Audits', icon: <ClipboardCheck className="w-4 h-4" />, description: 'Audit management' },
  { id: 'personnel', label: 'Personnel', icon: <Users className="w-4 h-4" />, description: 'Training & qualifications' },
  { id: 'archives', label: 'Archives', icon: <Archive className="w-4 h-4" />, description: 'Data & specimen archives' },
  { id: 'facilities', label: 'Facilities', icon: <Building className="w-4 h-4" />, description: 'Test facilities & equipment' },
  { id: 'edc-integration', label: 'EDC Integration', icon: <Activity className="w-4 h-4" />, description: 'EDC/LIMS data feeds & integrity' },
];

// ============================================================================
// MOCK DATA FOR DASHBOARD
// ============================================================================

const mockMetrics: GLPComplianceMetrics = {
  totalActiveStudies: 12,
  studiesInLife: 4,
  studiesInAnalysis: 3,
  studiesPendingArchive: 2,
  
  openDeviations: 8,
  criticalDeviations: 1,
  majorDeviations: 3,
  deviationsTrend: 'improving',
  avgDeviationClosureTime: 14,
  
  scheduledAudits: 3,
  openAuditFindings: 12,
  overdueResponses: 2,
  upcomingAudits: [],
  
  personnelWithExpiredTraining: 2,
  personnelWithExpiringTraining: 5,
  trainingComplianceRate: 94,
  
  equipmentOutOfCalibration: 1,
  equipmentDueSoon: 4,
  calibrationComplianceRate: 97,
  
  pendingArchives: 3,
  retrievedArchives: 1,
  upcomingDestructions: 0,
  
  facilitiesWithIssues: 0,
  overallComplianceScore: 92,
  
  lastUpdated: new Date().toISOString(),
};

const mockActionItems: GLPActionItem[] = [
  {
    id: 'action-1',
    type: 'deviation',
    priority: 'critical',
    title: 'CRITICAL Deviation: Dosing error in Study TOX-2024-015',
    description: 'Animals in Group 3 received incorrect dose on Day 14. Immediate investigation required.',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'user-1',
    assignedToName: 'Dr. Sarah Chen',
    relatedStudyId: 'study-1',
    relatedStudyNumber: 'TOX-2024-015',
    sourceId: 'dev-1',
    status: 'overdue',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-2',
    type: 'audit-finding',
    priority: 'high',
    title: 'Overdue Audit Response: Raw data documentation gaps',
    description: 'Finding from January QA audit requires corrective action plan by end of week.',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'user-2',
    assignedToName: 'James Wilson',
    relatedStudyId: null,
    relatedStudyNumber: null,
    sourceId: 'finding-1',
    status: 'pending',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-3',
    type: 'calibration',
    priority: 'high',
    title: 'Calibration Overdue: Analytical Balance AB-003',
    description: 'Mettler Toledo XPE205 in Room 204 - last calibrated 45 days ago.',
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'user-3',
    assignedToName: 'QA/Metrology',
    relatedStudyId: null,
    relatedStudyNumber: null,
    sourceId: 'equip-1',
    status: 'overdue',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'action-4',
    type: 'training',
    priority: 'medium',
    title: 'Training Expiring: Michael Torres - GLP Fundamentals',
    description: 'Annual refresher training due in 12 days.',
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'user-4',
    assignedToName: 'Michael Torres',
    relatedStudyId: null,
    relatedStudyNumber: null,
    sourceId: 'person-1',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'action-5',
    type: 'archive',
    priority: 'medium',
    title: 'Pending Archive: Study TOX-2023-089 Final Report',
    description: 'Study completed 30 days ago - raw data and specimens require archival.',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    assignedTo: 'user-5',
    assignedToName: 'Archive Team',
    relatedStudyId: 'study-2',
    relatedStudyNumber: 'TOX-2023-089',
    sourceId: 'study-2',
    status: 'pending',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================================
// MOCK STUDIES DATA
// ============================================================================

const mockStudies: GLPStudy[] = [
  {
    id: 'study-1',
    studyNumber: 'TOX-2024-015',
    title: '28-Day Oral Toxicity Study of LIG-001 in Sprague-Dawley Rats',
    status: 'in-progress',
    studyType: 'subacute-toxicity',
    regulatorySubmissionType: 'IND',
    sponsorProtocolNumber: 'LIG-001-TOX-001',
    testArticleName: 'LIG-001',
    testArticleId: 'ta-001',
    studyDirectorId: 'person-1',
    studyDirectorName: 'Dr. Sarah Chen',
    principalInvestigatorIds: ['person-2'],
    sponsorContactId: 'sponsor-1',
    species: 'rat',
    strain: 'Sprague-Dawley',
    animalCount: 80,
    testSystem: 'Sprague-Dawley rats, 8-10 weeks old',
    testFacilityId: 'facility-1',
    testFacilityName: 'Ligature Preclinical Sciences',
    protocolApprovalDate: '2024-01-10',
    inLifeStartDate: '2024-01-15',
    inLifeEndDate: null,
    necropsy: null,
    draftReportDate: null,
    finalReportDate: null,
    archiveDate: null,
    glpCompliant: true,
    glpDeviations: ['dev-1'],
    qaAudits: ['audit-1'],
    amendments: [],
    protocolDocumentId: 'doc-1',
    finalReportDocumentId: null,
    rawDataArchiveId: null,
    linkedNonclinicalStudyId: 'nc-study-1',
    linkedProductId: 'product-1',
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-20T14:30:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'study-2',
    studyNumber: 'TOX-2023-089',
    title: '13-Week Oral Toxicity Study of LIG-001 in Beagle Dogs',
    status: 'report-signed',
    studyType: 'subchronic-toxicity',
    regulatorySubmissionType: 'IND',
    sponsorProtocolNumber: 'LIG-001-TOX-002',
    testArticleName: 'LIG-001',
    testArticleId: 'ta-001',
    studyDirectorId: 'person-1',
    studyDirectorName: 'Dr. Sarah Chen',
    principalInvestigatorIds: ['person-3'],
    sponsorContactId: 'sponsor-1',
    species: 'dog',
    strain: 'Beagle',
    animalCount: 32,
    testSystem: 'Beagle dogs, 6-8 months old',
    testFacilityId: 'facility-1',
    testFacilityName: 'Ligature Preclinical Sciences',
    protocolApprovalDate: '2023-06-01',
    inLifeStartDate: '2023-06-15',
    inLifeEndDate: '2023-09-15',
    necropsy: '2023-09-16',
    draftReportDate: '2023-11-01',
    finalReportDate: '2023-12-15',
    archiveDate: null,
    glpCompliant: true,
    glpDeviations: [],
    qaAudits: ['audit-2'],
    amendments: [{
      id: 'amend-1',
      studyId: 'study-2',
      amendmentNumber: 1,
      title: 'Addition of recovery group',
      description: 'Added 4-week recovery period for high-dose group',
      reason: 'Sponsor request for reversibility assessment',
      effectiveDate: '2023-07-01',
      approvedBy: 'Dr. Sarah Chen',
      approvedDate: '2023-06-28',
      documentId: 'doc-amend-1',
      impactsStudyConduct: true,
      impactDescription: 'Extended study duration by 4 weeks',
      createdAt: '2023-06-28T09:00:00Z',
    }],
    protocolDocumentId: 'doc-2',
    finalReportDocumentId: 'doc-3',
    rawDataArchiveId: null,
    linkedNonclinicalStudyId: 'nc-study-2',
    linkedProductId: 'product-1',
    createdAt: '2023-05-15T10:00:00Z',
    updatedAt: '2023-12-15T16:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'study-3',
    studyNumber: 'TOX-2024-022',
    title: 'Embryo-Fetal Development Study of LIG-001 in Rats',
    status: 'protocol-approved',
    studyType: 'developmental-toxicity',
    regulatorySubmissionType: 'IND',
    sponsorProtocolNumber: 'LIG-001-TOX-003',
    testArticleName: 'LIG-001',
    testArticleId: 'ta-001',
    studyDirectorId: 'person-4',
    studyDirectorName: 'Dr. James Wilson',
    principalInvestigatorIds: ['person-2'],
    sponsorContactId: 'sponsor-1',
    species: 'rat',
    strain: 'Sprague-Dawley',
    animalCount: 100,
    testSystem: 'Time-mated Sprague-Dawley rats',
    testFacilityId: 'facility-1',
    testFacilityName: 'Ligature Preclinical Sciences',
    protocolApprovalDate: '2024-01-20',
    inLifeStartDate: null,
    inLifeEndDate: null,
    necropsy: null,
    draftReportDate: null,
    finalReportDate: null,
    archiveDate: null,
    glpCompliant: true,
    glpDeviations: [],
    qaAudits: [],
    amendments: [],
    protocolDocumentId: 'doc-4',
    finalReportDocumentId: null,
    rawDataArchiveId: null,
    linkedNonclinicalStudyId: null,
    linkedProductId: 'product-1',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-20T11:00:00Z',
    createdBy: 'user-2',
  },
  {
    id: 'study-4',
    studyNumber: 'GENO-2024-003',
    title: 'In Vitro Mammalian Chromosomal Aberration Test of LIG-001',
    status: 'analysis',
    studyType: 'genotoxicity',
    regulatorySubmissionType: 'IND',
    sponsorProtocolNumber: 'LIG-001-GEN-001',
    testArticleName: 'LIG-001',
    testArticleId: 'ta-001',
    studyDirectorId: 'person-5',
    studyDirectorName: 'Dr. Maria Garcia',
    principalInvestigatorIds: [],
    sponsorContactId: 'sponsor-1',
    species: 'other',
    strain: null,
    animalCount: null,
    testSystem: 'Chinese Hamster Ovary (CHO) cells',
    testFacilityId: 'facility-2',
    testFacilityName: 'BioTest Labs CRO',
    protocolApprovalDate: '2024-01-05',
    inLifeStartDate: '2024-01-10',
    inLifeEndDate: '2024-01-12',
    necropsy: null,
    draftReportDate: null,
    finalReportDate: null,
    archiveDate: null,
    glpCompliant: true,
    glpDeviations: [],
    qaAudits: [],
    amendments: [],
    protocolDocumentId: 'doc-5',
    finalReportDocumentId: null,
    rawDataArchiveId: null,
    linkedNonclinicalStudyId: null,
    linkedProductId: 'product-1',
    createdAt: '2024-01-03T10:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    createdBy: 'user-3',
  },
  {
    id: 'study-5',
    studyNumber: 'PK-2024-008',
    title: 'Single-Dose Pharmacokinetics Study of LIG-001 in Rats and Dogs',
    status: 'report-draft',
    studyType: 'pharmacokinetics',
    regulatorySubmissionType: 'IND',
    sponsorProtocolNumber: 'LIG-001-PK-001',
    testArticleName: 'LIG-001',
    testArticleId: 'ta-001',
    studyDirectorId: 'person-6',
    studyDirectorName: 'Dr. Robert Kim',
    principalInvestigatorIds: ['person-2', 'person-3'],
    sponsorContactId: 'sponsor-1',
    species: 'rat',
    strain: 'Sprague-Dawley',
    animalCount: 48,
    testSystem: 'Sprague-Dawley rats and Beagle dogs',
    testFacilityId: 'facility-1',
    testFacilityName: 'Ligature Preclinical Sciences',
    protocolApprovalDate: '2023-12-01',
    inLifeStartDate: '2023-12-10',
    inLifeEndDate: '2023-12-12',
    necropsy: null,
    draftReportDate: '2024-01-10',
    finalReportDate: null,
    archiveDate: null,
    glpCompliant: true,
    glpDeviations: ['dev-2'],
    qaAudits: ['audit-3'],
    amendments: [],
    protocolDocumentId: 'doc-6',
    finalReportDocumentId: null,
    rawDataArchiveId: null,
    linkedNonclinicalStudyId: 'nc-study-3',
    linkedProductId: 'product-1',
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'study-6',
    studyNumber: 'TOX-2023-045',
    title: 'Acute Oral Toxicity Study of LIG-002 in Mice',
    status: 'archived',
    studyType: 'acute-toxicity',
    regulatorySubmissionType: 'IND',
    sponsorProtocolNumber: 'LIG-002-TOX-001',
    testArticleName: 'LIG-002',
    testArticleId: 'ta-002',
    studyDirectorId: 'person-1',
    studyDirectorName: 'Dr. Sarah Chen',
    principalInvestigatorIds: [],
    sponsorContactId: 'sponsor-1',
    species: 'mouse',
    strain: 'CD-1',
    animalCount: 40,
    testSystem: 'CD-1 mice, 8-10 weeks old',
    testFacilityId: 'facility-1',
    testFacilityName: 'Ligature Preclinical Sciences',
    protocolApprovalDate: '2023-03-01',
    inLifeStartDate: '2023-03-10',
    inLifeEndDate: '2023-03-24',
    necropsy: '2023-03-25',
    draftReportDate: '2023-04-15',
    finalReportDate: '2023-05-01',
    archiveDate: '2023-06-01',
    glpCompliant: true,
    glpDeviations: [],
    qaAudits: ['audit-4'],
    amendments: [],
    protocolDocumentId: 'doc-7',
    finalReportDocumentId: 'doc-8',
    rawDataArchiveId: 'archive-1',
    linkedNonclinicalStudyId: 'nc-study-4',
    linkedProductId: 'product-2',
    createdAt: '2023-02-15T10:00:00Z',
    updatedAt: '2023-06-01T10:00:00Z',
    createdBy: 'user-1',
  },
];

// ============================================================================
// MOCK DEVIATIONS DATA
// ============================================================================

const mockDeviations: GLPDeviation[] = [
  {
    id: 'dev-1',
    deviationNumber: 'DEV-2024-001',
    studyId: 'study-1',
    studyNumber: 'TOX-2024-015',
    type: 'protocol',
    severity: 'critical',
    status: 'under-investigation',
    title: 'Dosing error - incorrect dose administered to Group 3',
    description: 'Animals in Group 3 (high dose) received mid-dose formulation on Day 14 due to vial mislabeling.',
    dateOccurred: '2024-12-20',
    dateDiscovered: '2024-12-20',
    discoveredBy: 'John Martinez, Study Technician',
    impactOnStudy: 'Group 3 animals received 50mg/kg instead of 100mg/kg on Day 14. One day of exposure data affected.',
    impactOnDataIntegrity: true,
    affectedAnimals: 'Group 3, Animals 301-310',
    affectedTimepoints: 'Day 14 only',
    rootCauseAnalysis: 'Investigation in progress - preliminary review indicates labeling error during formulation preparation.',
    rootCauseCategory: 'Human Error - Labeling',
    immediateAction: 'Correct dose administered on Day 15. All dose formulations re-verified.',
    correctiveAction: null,
    preventiveAction: null,
    capaId: null,
    studyDirectorReview: 'Reviewed - significant protocol deviation requiring sponsor notification',
    studyDirectorReviewDate: '2024-12-21',
    qaReview: null,
    qaReviewDate: null,
    sponsorNotified: true,
    sponsorNotificationDate: '2024-12-21',
    closureDate: null,
    closedBy: null,
    closureNotes: null,
    createdAt: '2024-12-20T14:30:00Z',
    updatedAt: '2024-12-21T09:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'dev-2',
    deviationNumber: 'DEV-2024-002',
    studyId: 'study-1',
    studyNumber: 'TOX-2024-015',
    type: 'environmental',
    severity: 'major',
    status: 'corrected',
    title: 'Temperature excursion in animal room',
    description: 'Animal room 204 temperature exceeded upper limit (25°C vs. 22±3°C) for 4 hours due to HVAC malfunction.',
    dateOccurred: '2024-12-18',
    dateDiscovered: '2024-12-18',
    discoveredBy: 'Environmental Monitoring System',
    impactOnStudy: 'All animals in room 204 (Groups 1-2) exposed to elevated temperature. Animals showed no clinical signs.',
    impactOnDataIntegrity: false,
    affectedAnimals: 'Groups 1-2, Animals 101-210',
    affectedTimepoints: 'Day 12, 0800-1200',
    rootCauseAnalysis: 'HVAC compressor failure identified. System lacked redundant cooling.',
    rootCauseCategory: 'Equipment Failure',
    immediateAction: 'Portable cooling units deployed. Animals monitored for heat stress.',
    correctiveAction: 'HVAC compressor replaced. Temperature verified within range.',
    preventiveAction: 'Backup cooling system installation approved. Weekly HVAC inspections added.',
    capaId: 'CAPA-2024-015',
    studyDirectorReview: 'Reviewed - environmental deviation with no impact on study integrity',
    studyDirectorReviewDate: '2024-12-19',
    qaReview: 'Verified corrective actions complete',
    qaReviewDate: '2024-12-22',
    sponsorNotified: false,
    sponsorNotificationDate: null,
    closureDate: null,
    closedBy: null,
    closureNotes: null,
    createdAt: '2024-12-18T12:15:00Z',
    updatedAt: '2024-12-22T16:00:00Z',
    createdBy: 'system',
  },
  {
    id: 'dev-3',
    deviationNumber: 'DEV-2024-003',
    studyId: 'study-2',
    studyNumber: 'TOX-2023-089',
    type: 'documentation',
    severity: 'minor',
    status: 'closed',
    title: 'Missing signature on raw data worksheet',
    description: 'Body weight data collection worksheet for Day 28 missing second reviewer signature.',
    dateOccurred: '2024-01-15',
    dateDiscovered: '2024-02-01',
    discoveredBy: 'QA Audit',
    impactOnStudy: 'Documentation deficiency only. Raw data verified correct by audit trail review.',
    impactOnDataIntegrity: false,
    affectedAnimals: null,
    affectedTimepoints: 'Day 28 body weights',
    rootCauseAnalysis: 'Second reviewer was on leave; worksheet was filed without required signature.',
    rootCauseCategory: 'Human Error - Documentation',
    immediateAction: 'Signature obtained with dated note explaining delay.',
    correctiveAction: 'Worksheet filing checklist updated to include signature verification.',
    preventiveAction: 'Training refresher on documentation requirements completed.',
    capaId: null,
    studyDirectorReview: 'Minor documentation deviation - no impact on data',
    studyDirectorReviewDate: '2024-02-02',
    qaReview: 'Verified - signature obtained per SOP',
    qaReviewDate: '2024-02-03',
    sponsorNotified: false,
    sponsorNotificationDate: null,
    closureDate: '2024-02-05',
    closedBy: 'Dr. Sarah Chen',
    closureNotes: 'Documentation corrected. No impact on study conclusions.',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-05T14:30:00Z',
    createdBy: 'user-qa',
  },
  {
    id: 'dev-4',
    deviationNumber: 'DEV-2024-004',
    studyId: 'study-3',
    studyNumber: 'TOX-2024-022',
    type: 'specimen-handling',
    severity: 'major',
    status: 'open',
    title: 'Plasma samples thawed during transport',
    description: 'Toxicokinetic plasma samples from Day 1 collection found partially thawed upon arrival at bioanalytical lab.',
    dateOccurred: '2025-01-03',
    dateDiscovered: '2025-01-03',
    discoveredBy: 'Bioanalytical Lab - Sample Receipt',
    impactOnStudy: 'Day 1 TK samples may have degraded. Repeat collection not possible for developmental tox study.',
    impactOnDataIntegrity: true,
    affectedAnimals: 'All groups, 3 animals/sex/group',
    affectedTimepoints: 'Day 1 TK timepoints (0.5, 1, 2, 4, 8h)',
    rootCauseAnalysis: 'Dry ice depleted during extended transport delay. Courier delay not communicated.',
    rootCauseCategory: 'External Vendor - Shipping',
    immediateAction: 'Samples analyzed to assess degradation. Stability data review initiated.',
    correctiveAction: null,
    preventiveAction: null,
    capaId: null,
    studyDirectorReview: null,
    studyDirectorReviewDate: null,
    qaReview: null,
    qaReviewDate: null,
    sponsorNotified: true,
    sponsorNotificationDate: '2025-01-03',
    closureDate: null,
    closedBy: null,
    closureNotes: null,
    createdAt: '2025-01-03T16:00:00Z',
    updatedAt: '2025-01-03T16:00:00Z',
    createdBy: 'user-2',
  },
  {
    id: 'dev-5',
    deviationNumber: 'DEV-2024-005',
    studyId: 'study-4',
    studyNumber: 'GENO-2024-003',
    type: 'sop',
    severity: 'minor',
    status: 'closed',
    title: 'Cell culture passage number exceeded',
    description: 'CHO cells used for chromosome aberration assay were at passage 32 (SOP limit: passage 30).',
    dateOccurred: '2024-11-20',
    dateDiscovered: '2024-11-22',
    discoveredBy: 'Dr. Lisa Park, Study Director',
    impactOnStudy: 'Cells at passage 32 within acceptable range per OECD guidance. Historical data supports validity.',
    impactOnDataIntegrity: false,
    affectedAnimals: null,
    affectedTimepoints: 'Main study - all treatment groups',
    rootCauseAnalysis: 'Cell inventory tracking error. Passage count not updated during transfer.',
    rootCauseCategory: 'Human Error - Record Keeping',
    immediateAction: 'Cell line data verified. Historical validation data reviewed.',
    correctiveAction: 'Electronic cell tracking system implemented.',
    preventiveAction: 'Monthly cell inventory audits added to QA schedule.',
    capaId: 'CAPA-2024-018',
    studyDirectorReview: 'Deviation noted in final report. No impact on study validity per OECD guidelines.',
    studyDirectorReviewDate: '2024-11-23',
    qaReview: 'CAPA verified effective',
    qaReviewDate: '2024-12-15',
    sponsorNotified: false,
    sponsorNotificationDate: null,
    closureDate: '2024-12-18',
    closedBy: 'QA Unit',
    closureNotes: 'Deviation documented in final report. CAPA implemented.',
    createdAt: '2024-11-22T09:00:00Z',
    updatedAt: '2024-12-18T11:00:00Z',
    createdBy: 'user-3',
  },
  {
    id: 'dev-6',
    deviationNumber: 'DEV-2024-006',
    studyId: 'study-1',
    studyNumber: 'TOX-2024-015',
    type: 'equipment',
    severity: 'minor',
    status: 'corrected',
    title: 'Balance calibration check missed',
    description: 'Daily calibration check for analytical balance AB-002 was not performed on December 15.',
    dateOccurred: '2024-12-15',
    dateDiscovered: '2024-12-16',
    discoveredBy: 'QA Daily Review',
    impactOnStudy: 'Balance used for dose formulation prep. Retrospective check showed balance within tolerance.',
    impactOnDataIntegrity: false,
    affectedAnimals: null,
    affectedTimepoints: 'Day 11 dose formulations',
    rootCauseAnalysis: 'Staff member assumed colleague had performed check during shift change.',
    rootCauseCategory: 'Human Error - Communication',
    immediateAction: 'Calibration check performed retroactively. Within tolerance confirmed.',
    correctiveAction: 'Shift handoff checklist implemented.',
    preventiveAction: 'Electronic calibration reminder system configured.',
    capaId: null,
    studyDirectorReview: 'Minor deviation - balance verified in tolerance',
    studyDirectorReviewDate: '2024-12-17',
    qaReview: 'Corrective action verified',
    qaReviewDate: '2024-12-18',
    sponsorNotified: false,
    sponsorNotificationDate: null,
    closureDate: null,
    closedBy: null,
    closureNotes: null,
    createdAt: '2024-12-16T08:30:00Z',
    updatedAt: '2024-12-18T14:00:00Z',
    createdBy: 'user-qa',
  },
  {
    id: 'dev-7',
    deviationNumber: 'DEV-2023-042',
    studyId: 'study-6',
    studyNumber: 'TOX-2023-045',
    type: 'personnel',
    severity: 'minor',
    status: 'closed',
    title: 'Study personnel training documentation gap',
    description: 'Technician assisted with necropsy before GLP training documentation was filed (training was completed).',
    dateOccurred: '2023-08-10',
    dateDiscovered: '2023-08-12',
    discoveredBy: 'Training Coordinator',
    impactOnStudy: 'Training was completed prior to participation. Documentation delay only.',
    impactOnDataIntegrity: false,
    affectedAnimals: null,
    affectedTimepoints: 'Terminal necropsy',
    rootCauseAnalysis: 'Training certificate processing delayed due to instructor absence.',
    rootCauseCategory: 'Process - Documentation Timing',
    immediateAction: 'Training documentation filed immediately upon discovery.',
    correctiveAction: 'Training must be documented before study assignment.',
    preventiveAction: 'Electronic training verification added to study assignment workflow.',
    capaId: null,
    studyDirectorReview: 'Documentation timing issue only. Training was complete.',
    studyDirectorReviewDate: '2023-08-13',
    qaReview: 'Verified training completion predates study activities',
    qaReviewDate: '2023-08-14',
    sponsorNotified: false,
    sponsorNotificationDate: null,
    closureDate: '2023-08-20',
    closedBy: 'Dr. Sarah Chen',
    closureNotes: 'Administrative deviation. No impact on study conduct.',
    createdAt: '2023-08-12T11:00:00Z',
    updatedAt: '2023-08-20T09:00:00Z',
    createdBy: 'user-1',
  },
  {
    id: 'dev-8',
    deviationNumber: 'DEV-2024-007',
    studyId: 'study-5',
    studyNumber: 'PK-2024-008',
    type: 'data-integrity',
    severity: 'major',
    status: 'under-investigation',
    title: 'LIMS data entry discrepancy identified',
    description: 'Bioanalytical concentration values in LIMS do not match chromatography system raw data for 3 samples.',
    dateOccurred: '2025-01-02',
    dateDiscovered: '2025-01-05',
    discoveredBy: 'QC Review - Bioanalytical',
    impactOnStudy: 'Three PK samples require data verification. May affect Day 7 concentration-time profile.',
    impactOnDataIntegrity: true,
    affectedAnimals: 'Rat cohort, Animals R-203, R-207, R-215',
    affectedTimepoints: 'Day 7, 4-hour timepoint',
    rootCauseAnalysis: 'Investigation pending - comparing audit trails between systems.',
    rootCauseCategory: null,
    immediateAction: 'Affected data flagged. Manual verification of all Day 7 entries initiated.',
    correctiveAction: null,
    preventiveAction: null,
    capaId: null,
    studyDirectorReview: null,
    studyDirectorReviewDate: null,
    qaReview: null,
    qaReviewDate: null,
    sponsorNotified: false,
    sponsorNotificationDate: null,
    closureDate: null,
    closedBy: null,
    closureNotes: null,
    createdAt: '2025-01-05T10:30:00Z',
    updatedAt: '2025-01-05T10:30:00Z',
    createdBy: 'user-bioanalytical',
  },
];

// ============================================================================
// MOCK AUDITS DATA
// ============================================================================

const mockAudits: GLPAudit[] = [
  {
    id: 'audit-1',
    auditNumber: 'QA-2024-015',
    auditType: 'study',
    status: 'pending-response',
    title: 'In-Life Phase Audit - TOX-2024-015',
    scope: 'Review of dosing records, clinical observations, and raw data documentation for ongoing 28-day rat toxicity study.',
    studyIds: ['study-1'],
    facilityId: 'facility-1',
    processArea: null,
    scheduledDate: '2024-12-10',
    actualStartDate: '2024-12-10',
    actualEndDate: '2024-12-11',
    leadAuditorId: 'person-qa-1',
    leadAuditorName: 'Jennifer Walsh',
    auditTeam: ['Jennifer Walsh'],
    findings: [],
    totalFindings: 4,
    criticalFindings: 0,
    majorFindings: 2,
    minorFindings: 1,
    observations: 1,
    reportDate: '2024-12-15',
    reportDocumentId: 'doc-audit-1',
    responseDeadline: '2025-01-15',
    responseDateReceived: null,
    closureDate: null,
    closedBy: null,
    regulatoryAgency: null,
    inspectionType: null,
    form483Issued: false,
    warningLetterIssued: false,
    createdAt: '2024-12-01T09:00:00Z',
    updatedAt: '2024-12-15T14:00:00Z',
  },
  {
    id: 'audit-2',
    auditNumber: 'QA-2024-012',
    auditType: 'facility',
    status: 'closed',
    title: 'Annual Facility Inspection - Building A',
    scope: 'Comprehensive review of animal housing, environmental controls, equipment calibration, and SOPs.',
    studyIds: [],
    facilityId: 'facility-1',
    processArea: 'Animal Housing & Vivarium',
    scheduledDate: '2024-10-15',
    actualStartDate: '2024-10-15',
    actualEndDate: '2024-10-17',
    leadAuditorId: 'person-qa-1',
    leadAuditorName: 'Jennifer Walsh',
    auditTeam: ['Jennifer Walsh', 'Robert Kim'],
    findings: [],
    totalFindings: 6,
    criticalFindings: 0,
    majorFindings: 1,
    minorFindings: 3,
    observations: 2,
    reportDate: '2024-10-22',
    reportDocumentId: 'doc-audit-2',
    responseDeadline: '2024-11-22',
    responseDateReceived: '2024-11-18',
    closureDate: '2024-12-05',
    closedBy: 'Jennifer Walsh',
    regulatoryAgency: null,
    inspectionType: null,
    form483Issued: false,
    warningLetterIssued: false,
    createdAt: '2024-10-01T09:00:00Z',
    updatedAt: '2024-12-05T16:00:00Z',
  },
  {
    id: 'audit-3',
    auditNumber: 'QA-2025-001',
    auditType: 'study',
    status: 'scheduled',
    title: 'Protocol Review Audit - TOX-2024-022',
    scope: 'Pre-initiation audit of developmental toxicity study protocol, SOPs, and personnel training records.',
    studyIds: ['study-3'],
    facilityId: 'facility-1',
    processArea: null,
    scheduledDate: '2025-01-20',
    actualStartDate: null,
    actualEndDate: null,
    leadAuditorId: 'person-qa-2',
    leadAuditorName: 'Robert Kim',
    auditTeam: ['Robert Kim'],
    findings: [],
    totalFindings: 0,
    criticalFindings: 0,
    majorFindings: 0,
    minorFindings: 0,
    observations: 0,
    reportDate: null,
    reportDocumentId: null,
    responseDeadline: null,
    responseDateReceived: null,
    closureDate: null,
    closedBy: null,
    regulatoryAgency: null,
    inspectionType: null,
    form483Issued: false,
    warningLetterIssued: false,
    createdAt: '2025-01-02T09:00:00Z',
    updatedAt: '2025-01-02T09:00:00Z',
  },
  {
    id: 'audit-4',
    auditNumber: 'FDA-2024-001',
    auditType: 'regulatory',
    status: 'closed',
    title: 'FDA GLP Inspection',
    scope: 'Routine FDA inspection of GLP compliance, including review of study files, QA operations, and facility records.',
    studyIds: ['study-2', 'study-6'],
    facilityId: 'facility-1',
    processArea: null,
    scheduledDate: '2024-09-10',
    actualStartDate: '2024-09-10',
    actualEndDate: '2024-09-13',
    leadAuditorId: 'fda-inspector-1',
    leadAuditorName: 'FDA Investigator',
    auditTeam: ['FDA Investigator', 'FDA Analyst'],
    findings: [],
    totalFindings: 3,
    criticalFindings: 0,
    majorFindings: 0,
    minorFindings: 2,
    observations: 1,
    reportDate: '2024-09-20',
    reportDocumentId: 'doc-fda-1',
    responseDeadline: '2024-10-05',
    responseDateReceived: '2024-10-02',
    closureDate: '2024-11-15',
    closedBy: 'FDA',
    regulatoryAgency: 'FDA',
    inspectionType: 'Routine GLP Inspection',
    form483Issued: true,
    warningLetterIssued: false,
    createdAt: '2024-09-01T09:00:00Z',
    updatedAt: '2024-11-15T10:00:00Z',
  },
  {
    id: 'audit-5',
    auditNumber: 'QA-2024-008',
    auditType: 'process',
    status: 'closed',
    title: 'Bioanalytical Method Validation Audit',
    scope: 'Review of validation protocols, raw data, and qualification records for LC-MS/MS methods.',
    studyIds: [],
    facilityId: 'facility-1',
    processArea: 'Bioanalytical Laboratory',
    scheduledDate: '2024-07-20',
    actualStartDate: '2024-07-20',
    actualEndDate: '2024-07-21',
    leadAuditorId: 'person-qa-1',
    leadAuditorName: 'Jennifer Walsh',
    auditTeam: ['Jennifer Walsh'],
    findings: [],
    totalFindings: 2,
    criticalFindings: 0,
    majorFindings: 0,
    minorFindings: 2,
    observations: 0,
    reportDate: '2024-07-25',
    reportDocumentId: 'doc-audit-5',
    responseDeadline: '2024-08-25',
    responseDateReceived: '2024-08-20',
    closureDate: '2024-09-10',
    closedBy: 'Jennifer Walsh',
    regulatoryAgency: null,
    inspectionType: null,
    form483Issued: false,
    warningLetterIssued: false,
    createdAt: '2024-07-10T09:00:00Z',
    updatedAt: '2024-09-10T14:00:00Z',
  },
  {
    id: 'audit-6',
    auditNumber: 'QA-2024-014',
    auditType: 'computer-system',
    status: 'in-progress',
    title: 'LIMS Validation Audit',
    scope: 'Review of LIMS validation documentation, user access controls, audit trails, and 21 CFR Part 11 compliance.',
    studyIds: [],
    facilityId: 'facility-1',
    processArea: 'Laboratory Information Management System',
    scheduledDate: '2025-01-06',
    actualStartDate: '2025-01-06',
    actualEndDate: null,
    leadAuditorId: 'person-qa-2',
    leadAuditorName: 'Robert Kim',
    auditTeam: ['Robert Kim', 'IT Specialist'],
    findings: [],
    totalFindings: 0,
    criticalFindings: 0,
    majorFindings: 0,
    minorFindings: 0,
    observations: 0,
    reportDate: null,
    reportDocumentId: null,
    responseDeadline: null,
    responseDateReceived: null,
    closureDate: null,
    closedBy: null,
    regulatoryAgency: null,
    inspectionType: null,
    form483Issued: false,
    warningLetterIssued: false,
    createdAt: '2024-12-20T09:00:00Z',
    updatedAt: '2025-01-06T10:00:00Z',
  },
  {
    id: 'audit-7',
    auditNumber: 'QA-2024-011',
    auditType: 'study',
    status: 'closed',
    title: 'Final Report Audit - TOX-2023-089',
    scope: 'Comprehensive review of final study report, raw data reconciliation, and QA statement preparation.',
    studyIds: ['study-2'],
    facilityId: 'facility-1',
    processArea: null,
    scheduledDate: '2024-11-01',
    actualStartDate: '2024-11-01',
    actualEndDate: '2024-11-03',
    leadAuditorId: 'person-qa-1',
    leadAuditorName: 'Jennifer Walsh',
    auditTeam: ['Jennifer Walsh'],
    findings: [],
    totalFindings: 1,
    criticalFindings: 0,
    majorFindings: 0,
    minorFindings: 1,
    observations: 0,
    reportDate: '2024-11-08',
    reportDocumentId: 'doc-audit-7',
    responseDeadline: '2024-11-22',
    responseDateReceived: '2024-11-15',
    closureDate: '2024-11-25',
    closedBy: 'Jennifer Walsh',
    regulatoryAgency: null,
    inspectionType: null,
    form483Issued: false,
    warningLetterIssued: false,
    createdAt: '2024-10-20T09:00:00Z',
    updatedAt: '2024-11-25T11:00:00Z',
  },
];

// ============================================================================
// MOCK ARCHIVES DATA
// ============================================================================

type ArchiveType = 'raw-data' | 'specimens' | 'protocol' | 'final-report' | 'correspondence' | 'other';

const mockArchives: GLPArchive[] = [
  {
    id: 'archive-1',
    archiveNumber: 'ARC-2024-089',
    archiveType: 'raw-data',
    status: 'archived',
    title: 'TOX-2023-089 Raw Data Package',
    description: 'Complete raw data documentation including body weights, clinical observations, food consumption, clinical pathology, and necropsy findings.',
    studyId: 'study-2',
    studyNumber: 'TOX-2023-089',
    facilityId: 'facility-1',
    roomNumber: 'Archive Room A',
    shelfLocation: 'Shelf A-14',
    boxNumber: 'BOX-2024-0142',
    temperatureControlled: true,
    requiredTemperature: '18-25°C',
    humidityControlled: true,
    requiredHumidity: '30-65% RH',
    lightSensitive: false,
    archiveDate: '2024-01-15',
    archivedBy: 'Archive Team',
    retentionPeriodYears: 15,
    destructionEligibleDate: '2039-01-15',
    custodyChain: [
      {
        id: 'custody-1',
        archiveId: 'archive-1',
        eventType: 'archived',
        eventDate: '2024-01-15',
        performedBy: 'user-archive-1',
        performedByName: 'Maria Santos',
        reason: 'Study completion - final report signed',
        destination: null,
        returnDate: null,
        notes: 'All raw data verified complete per checklist ARC-CHK-089',
      },
    ],
    currentCustodian: 'Archive Team',
    specimenType: null,
    specimenCount: null,
    specimenCondition: null,
    destructionDate: null,
    destructionApprovedBy: null,
    destructionWitnessedBy: null,
    destructionMethod: null,
    destructionCertificateId: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'archive-2',
    archiveNumber: 'ARC-2024-090',
    archiveType: 'specimens',
    status: 'archived',
    title: 'TOX-2023-089 Tissue Specimens',
    description: 'Formalin-fixed paraffin-embedded (FFPE) tissue blocks and wet tissue reserves from 90-day dog toxicity study.',
    studyId: 'study-2',
    studyNumber: 'TOX-2023-089',
    facilityId: 'facility-1',
    roomNumber: 'Archive Room B (Controlled)',
    shelfLocation: 'Freezer F-03, Rack 2',
    boxNumber: 'SPEC-2024-0089',
    temperatureControlled: true,
    requiredTemperature: '-20°C ± 5°C',
    humidityControlled: false,
    requiredHumidity: null,
    lightSensitive: true,
    archiveDate: '2024-01-20',
    archivedBy: 'Histology Lab',
    retentionPeriodYears: 15,
    destructionEligibleDate: '2039-01-20',
    custodyChain: [
      {
        id: 'custody-2',
        archiveId: 'archive-2',
        eventType: 'archived',
        eventDate: '2024-01-20',
        performedBy: 'user-histo-1',
        performedByName: 'Dr. Patricia Lee',
        reason: 'Study completion - histopathology complete',
        destination: null,
        returnDate: null,
        notes: '48 FFPE blocks, 12 wet tissue containers',
      },
    ],
    currentCustodian: 'Archive Team',
    specimenType: 'FFPE blocks & wet tissue',
    specimenCount: 60,
    specimenCondition: 'Good - verified upon archival',
    destructionDate: null,
    destructionApprovedBy: null,
    destructionWitnessedBy: null,
    destructionMethod: null,
    destructionCertificateId: null,
    createdAt: '2024-01-20T14:00:00Z',
    updatedAt: '2024-01-20T14:00:00Z',
  },
  {
    id: 'archive-3',
    archiveNumber: 'ARC-2024-091',
    archiveType: 'final-report',
    status: 'archived',
    title: 'TOX-2023-089 Final Study Report',
    description: 'Signed final study report with QA statement, including all amendments and study director certification.',
    studyId: 'study-2',
    studyNumber: 'TOX-2023-089',
    facilityId: 'facility-1',
    roomNumber: 'Archive Room A',
    shelfLocation: 'Shelf A-14',
    boxNumber: 'BOX-2024-0142',
    temperatureControlled: true,
    requiredTemperature: '18-25°C',
    humidityControlled: true,
    requiredHumidity: '30-65% RH',
    lightSensitive: false,
    archiveDate: '2024-01-18',
    archivedBy: 'Archive Team',
    retentionPeriodYears: 15,
    destructionEligibleDate: '2039-01-18',
    custodyChain: [
      {
        id: 'custody-3',
        archiveId: 'archive-3',
        eventType: 'archived',
        eventDate: '2024-01-18',
        performedBy: 'user-archive-1',
        performedByName: 'Maria Santos',
        reason: 'Final report signed and QA statement issued',
        destination: null,
        returnDate: null,
        notes: 'Original signed report + 2 certified copies',
      },
    ],
    currentCustodian: 'Archive Team',
    specimenType: null,
    specimenCount: null,
    specimenCondition: null,
    destructionDate: null,
    destructionApprovedBy: null,
    destructionWitnessedBy: null,
    destructionMethod: null,
    destructionCertificateId: null,
    createdAt: '2024-01-18T11:00:00Z',
    updatedAt: '2024-01-18T11:00:00Z',
  },
  {
    id: 'archive-4',
    archiveNumber: 'ARC-2023-045',
    archiveType: 'raw-data',
    status: 'archived',
    title: 'TOX-2023-045 Raw Data Package',
    description: 'Complete raw data package for acute toxicity study in mice.',
    studyId: 'study-6',
    studyNumber: 'TOX-2023-045',
    facilityId: 'facility-1',
    roomNumber: 'Archive Room A',
    shelfLocation: 'Shelf A-08',
    boxNumber: 'BOX-2023-0298',
    temperatureControlled: true,
    requiredTemperature: '18-25°C',
    humidityControlled: true,
    requiredHumidity: '30-65% RH',
    lightSensitive: false,
    archiveDate: '2023-06-01',
    archivedBy: 'Archive Team',
    retentionPeriodYears: 10,
    destructionEligibleDate: '2033-06-01',
    custodyChain: [
      {
        id: 'custody-4',
        archiveId: 'archive-4',
        eventType: 'archived',
        eventDate: '2023-06-01',
        performedBy: 'user-archive-1',
        performedByName: 'Maria Santos',
        reason: 'Study completion',
        destination: null,
        returnDate: null,
        notes: null,
      },
      {
        id: 'custody-5',
        archiveId: 'archive-4',
        eventType: 'retrieved',
        eventDate: '2024-09-10',
        performedBy: 'fda-inspector-1',
        performedByName: 'FDA Investigator',
        reason: 'FDA GLP inspection - document review',
        destination: 'Conference Room B',
        returnDate: '2024-09-13',
        notes: 'Retrieved for FDA inspection review',
      },
      {
        id: 'custody-6',
        archiveId: 'archive-4',
        eventType: 'returned',
        eventDate: '2024-09-13',
        performedBy: 'user-archive-1',
        performedByName: 'Maria Santos',
        reason: 'FDA inspection complete',
        destination: null,
        returnDate: null,
        notes: 'All materials verified complete upon return',
      },
    ],
    currentCustodian: 'Archive Team',
    specimenType: null,
    specimenCount: null,
    specimenCondition: null,
    destructionDate: null,
    destructionApprovedBy: null,
    destructionWitnessedBy: null,
    destructionMethod: null,
    destructionCertificateId: null,
    createdAt: '2023-06-01T10:00:00Z',
    updatedAt: '2024-09-13T16:00:00Z',
  },
  {
    id: 'archive-5',
    archiveNumber: 'ARC-2024-015',
    archiveType: 'raw-data',
    status: 'pending',
    title: 'TOX-2024-015 In-Life Raw Data (Partial)',
    description: 'Raw data from completed in-life phase pending final archival after study completion.',
    studyId: 'study-1',
    studyNumber: 'TOX-2024-015',
    facilityId: 'facility-1',
    roomNumber: 'Pre-Archive Staging',
    shelfLocation: 'Staging Area 2',
    boxNumber: null,
    temperatureControlled: true,
    requiredTemperature: '18-25°C',
    humidityControlled: false,
    requiredHumidity: null,
    lightSensitive: false,
    archiveDate: '2025-01-05',
    archivedBy: 'Study Team',
    retentionPeriodYears: 15,
    destructionEligibleDate: '2040-01-05',
    custodyChain: [],
    currentCustodian: 'Study Director - Dr. Sarah Chen',
    specimenType: null,
    specimenCount: null,
    specimenCondition: null,
    destructionDate: null,
    destructionApprovedBy: null,
    destructionWitnessedBy: null,
    destructionMethod: null,
    destructionCertificateId: null,
    createdAt: '2025-01-05T09:00:00Z',
    updatedAt: '2025-01-05T09:00:00Z',
  },
  {
    id: 'archive-6',
    archiveNumber: 'ARC-2024-092',
    archiveType: 'specimens',
    status: 'retrieved',
    title: 'GENO-2024-003 Cell Culture Samples',
    description: 'Cryopreserved CHO cell samples from genotoxicity study for potential re-analysis.',
    studyId: 'study-4',
    studyNumber: 'GENO-2024-003',
    facilityId: 'facility-1',
    roomNumber: 'Archive Room B (Controlled)',
    shelfLocation: 'Cryotank CT-02',
    boxNumber: 'CRYO-2024-0012',
    temperatureControlled: true,
    requiredTemperature: '-150°C (LN2)',
    humidityControlled: false,
    requiredHumidity: null,
    lightSensitive: false,
    archiveDate: '2024-12-20',
    archivedBy: 'Cell Culture Lab',
    retentionPeriodYears: 10,
    destructionEligibleDate: '2034-12-20',
    custodyChain: [
      {
        id: 'custody-7',
        archiveId: 'archive-6',
        eventType: 'archived',
        eventDate: '2024-12-20',
        performedBy: 'user-cell-1',
        performedByName: 'Dr. Lisa Park',
        reason: 'Study completion - samples retained for potential reanalysis',
        destination: null,
        returnDate: null,
        notes: '24 vials, 1x10^6 cells/vial',
      },
      {
        id: 'custody-8',
        archiveId: 'archive-6',
        eventType: 'retrieved',
        eventDate: '2025-01-06',
        performedBy: 'user-cell-1',
        performedByName: 'Dr. Lisa Park',
        reason: 'Sponsor requested additional analysis',
        destination: 'Cell Culture Lab',
        returnDate: '2025-01-20',
        notes: '6 vials retrieved for confirmatory testing',
      },
    ],
    currentCustodian: 'Dr. Lisa Park - Cell Culture Lab',
    specimenType: 'Cryopreserved CHO cells',
    specimenCount: 24,
    specimenCondition: 'Viable - verified at archival',
    destructionDate: null,
    destructionApprovedBy: null,
    destructionWitnessedBy: null,
    destructionMethod: null,
    destructionCertificateId: null,
    createdAt: '2024-12-20T15:00:00Z',
    updatedAt: '2025-01-06T10:00:00Z',
  },
];

// ============================================================================
// MOCK PERSONNEL DATA
// ============================================================================

const mockPersonnel: GLPPersonnel[] = [
  {
    id: 'person-1',
    employeeId: 'EMP-001',
    firstName: 'Sarah',
    lastName: 'Chen',
    title: 'Senior Study Director',
    department: 'Toxicology',
    primaryRole: 'study-director',
    additionalRoles: ['principal-investigator'],
    education: 'Ph.D. Toxicology, University of California, Davis',
    degrees: ['Ph.D. Toxicology', 'B.S. Biology'],
    certifications: ['DABT (Diplomate, American Board of Toxicology)', 'RAC'],
    yearsExperience: 15,
    cvDocumentId: 'doc-cv-001',
    cvLastUpdated: '2024-06-15',
    jobDescriptionId: 'jd-sd-001',
    jobDescriptionVersion: '3.0',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: ['study-1', 'study-2'],
    historicalStudyAssignments: ['study-6'],
    active: true,
    startDate: '2015-03-01',
    endDate: null,
    createdAt: '2015-03-01T09:00:00Z',
    updatedAt: '2024-06-15T10:00:00Z',
  },
  {
    id: 'person-2',
    employeeId: 'EMP-002',
    firstName: 'James',
    lastName: 'Wilson',
    title: 'Study Director',
    department: 'Toxicology',
    primaryRole: 'study-director',
    additionalRoles: [],
    education: 'Ph.D. Pharmacology, Johns Hopkins University',
    degrees: ['Ph.D. Pharmacology', 'M.S. Biology', 'B.S. Chemistry'],
    certifications: ['DABT'],
    yearsExperience: 10,
    cvDocumentId: 'doc-cv-002',
    cvLastUpdated: '2024-08-20',
    jobDescriptionId: 'jd-sd-001',
    jobDescriptionVersion: '3.0',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: ['study-3'],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2018-07-15',
    endDate: null,
    createdAt: '2018-07-15T09:00:00Z',
    updatedAt: '2024-08-20T14:00:00Z',
  },
  {
    id: 'person-qa-1',
    employeeId: 'EMP-010',
    firstName: 'Jennifer',
    lastName: 'Walsh',
    title: 'QA Director',
    department: 'Quality Assurance',
    primaryRole: 'qa-unit',
    additionalRoles: [],
    education: 'M.S. Quality Systems, Purdue University',
    degrees: ['M.S. Quality Systems', 'B.S. Biology'],
    certifications: ['CQA (Certified Quality Auditor)', 'RAC'],
    yearsExperience: 18,
    cvDocumentId: 'doc-cv-010',
    cvLastUpdated: '2024-05-10',
    jobDescriptionId: 'jd-qa-001',
    jobDescriptionVersion: '2.1',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: [],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2012-01-15',
    endDate: null,
    createdAt: '2012-01-15T09:00:00Z',
    updatedAt: '2024-05-10T11:00:00Z',
  },
  {
    id: 'person-qa-2',
    employeeId: 'EMP-011',
    firstName: 'Robert',
    lastName: 'Kim',
    title: 'Senior QA Specialist',
    department: 'Quality Assurance',
    primaryRole: 'qa-unit',
    additionalRoles: [],
    education: 'B.S. Biology, UCLA',
    degrees: ['B.S. Biology'],
    certifications: ['ASQ CSQP'],
    yearsExperience: 8,
    cvDocumentId: 'doc-cv-011',
    cvLastUpdated: '2024-09-01',
    jobDescriptionId: 'jd-qa-002',
    jobDescriptionVersion: '1.5',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: [],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2019-04-01',
    endDate: null,
    createdAt: '2019-04-01T09:00:00Z',
    updatedAt: '2024-09-01T10:00:00Z',
  },
  {
    id: 'person-archive-1',
    employeeId: 'EMP-020',
    firstName: 'Maria',
    lastName: 'Santos',
    title: 'Archive Manager',
    department: 'Archive & Records',
    primaryRole: 'archivist',
    additionalRoles: [],
    education: 'M.S. Library Science, University of Texas',
    degrees: ['M.S. Library Science', 'B.A. History'],
    certifications: ['Certified Records Manager'],
    yearsExperience: 12,
    cvDocumentId: 'doc-cv-020',
    cvLastUpdated: '2024-03-15',
    jobDescriptionId: 'jd-arc-001',
    jobDescriptionVersion: '2.0',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: [],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2016-08-01',
    endDate: null,
    createdAt: '2016-08-01T09:00:00Z',
    updatedAt: '2024-03-15T14:00:00Z',
  },
  {
    id: 'person-3',
    employeeId: 'EMP-003',
    firstName: 'Lisa',
    lastName: 'Park',
    title: 'Study Director - Genetic Toxicology',
    department: 'Genetic Toxicology',
    primaryRole: 'study-director',
    additionalRoles: ['principal-investigator'],
    education: 'Ph.D. Genetics, MIT',
    degrees: ['Ph.D. Genetics', 'B.S. Molecular Biology'],
    certifications: ['DABT'],
    yearsExperience: 12,
    cvDocumentId: 'doc-cv-003',
    cvLastUpdated: '2024-07-20',
    jobDescriptionId: 'jd-sd-002',
    jobDescriptionVersion: '2.0',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: ['study-4'],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2017-02-01',
    endDate: null,
    createdAt: '2017-02-01T09:00:00Z',
    updatedAt: '2024-07-20T11:00:00Z',
  },
  {
    id: 'person-4',
    employeeId: 'EMP-004',
    firstName: 'Michael',
    lastName: 'Torres',
    title: 'Senior Study Technician',
    department: 'Toxicology',
    primaryRole: 'study-personnel',
    additionalRoles: [],
    education: 'B.S. Animal Science, Texas A&M University',
    degrees: ['B.S. Animal Science'],
    certifications: ['AALAS LAT'],
    yearsExperience: 6,
    cvDocumentId: 'doc-cv-004',
    cvLastUpdated: '2024-04-10',
    jobDescriptionId: 'jd-tech-001',
    jobDescriptionVersion: '3.2',
    trainingStatus: 'expiring-soon',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: ['study-1'],
    historicalStudyAssignments: ['study-2', 'study-6'],
    active: true,
    startDate: '2020-06-15',
    endDate: null,
    createdAt: '2020-06-15T09:00:00Z',
    updatedAt: '2024-04-10T10:00:00Z',
  },
  {
    id: 'person-5',
    employeeId: 'EMP-005',
    firstName: 'Emily',
    lastName: 'Johnson',
    title: 'Histopathologist',
    department: 'Pathology',
    primaryRole: 'principal-investigator',
    additionalRoles: [],
    education: 'DVM, Ph.D. Pathology, Cornell University',
    degrees: ['DVM', 'Ph.D. Pathology', 'B.S. Biology'],
    certifications: ['DACVP', 'DABT'],
    yearsExperience: 14,
    cvDocumentId: 'doc-cv-005',
    cvLastUpdated: '2024-02-28',
    jobDescriptionId: 'jd-path-001',
    jobDescriptionVersion: '2.5',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: ['study-1', 'study-2', 'study-3'],
    historicalStudyAssignments: ['study-6'],
    active: true,
    startDate: '2014-09-01',
    endDate: null,
    createdAt: '2014-09-01T09:00:00Z',
    updatedAt: '2024-02-28T15:00:00Z',
  },
  {
    id: 'person-6',
    employeeId: 'EMP-030',
    firstName: 'David',
    lastName: 'Martinez',
    title: 'Test Facility Management Director',
    department: 'Operations',
    primaryRole: 'test-facility-management',
    additionalRoles: [],
    education: 'MBA, Stanford University; B.S. Engineering',
    degrees: ['MBA', 'B.S. Mechanical Engineering'],
    certifications: ['PMP'],
    yearsExperience: 20,
    cvDocumentId: 'doc-cv-030',
    cvLastUpdated: '2024-01-10',
    jobDescriptionId: 'jd-tfm-001',
    jobDescriptionVersion: '1.0',
    trainingStatus: 'current',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: [],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2010-05-01',
    endDate: null,
    createdAt: '2010-05-01T09:00:00Z',
    updatedAt: '2024-01-10T09:00:00Z',
  },
  {
    id: 'person-7',
    employeeId: 'EMP-006',
    firstName: 'Amanda',
    lastName: 'Wright',
    title: 'Study Technician II',
    department: 'Toxicology',
    primaryRole: 'study-personnel',
    additionalRoles: [],
    education: 'B.S. Biology, Penn State',
    degrees: ['B.S. Biology'],
    certifications: ['AALAS LAT'],
    yearsExperience: 3,
    cvDocumentId: 'doc-cv-006',
    cvLastUpdated: '2024-11-01',
    jobDescriptionId: 'jd-tech-002',
    jobDescriptionVersion: '2.0',
    trainingStatus: 'expired',
    requiredTrainings: [],
    completedTrainings: [],
    currentStudyAssignments: ['study-1'],
    historicalStudyAssignments: [],
    active: true,
    startDate: '2022-03-01',
    endDate: null,
    createdAt: '2022-03-01T09:00:00Z',
    updatedAt: '2024-11-01T10:00:00Z',
  },
];

// ============================================================================
// MOCK FACILITIES DATA
// ============================================================================

const mockFacilities: GLPTestFacility[] = [
  {
    id: 'facility-1',
    name: 'Ligature Preclinical Sciences',
    code: 'LPS-001',
    type: 'internal',
    address: '100 Research Drive',
    city: 'Cambridge',
    state: 'MA',
    country: 'USA',
    postalCode: '02142',
    phone: '+1 617-555-0100',
    testFacilityManagementId: 'person-6',
    testFacilityManagementName: 'David Martinez',
    qaUnitHeadId: 'person-qa-1',
    qaUnitHeadName: 'Jennifer Walsh',
    archivistId: 'person-archive-1',
    archivistName: 'Maria Santos',
    capabilities: [
      'acute-toxicity',
      'subacute-toxicity',
      'subchronic-toxicity',
      'chronic-toxicity',
      'reproductive-toxicity',
      'developmental-toxicity',
      'genotoxicity',
      'safety-pharmacology',
      'pharmacokinetics',
      'toxicokinetics',
    ],
    speciesCapabilities: ['rat', 'mouse', 'rabbit', 'dog', 'guinea-pig'],
    animalCapacity: 5000,
    glpCertified: true,
    certificationAgency: 'FDA',
    certificationDate: '2023-06-15',
    certificationExpiryDate: '2026-06-15',
    lastInspectionDate: '2024-09-10',
    lastInspectionResult: 'passed-with-observations',
    equipmentCount: 156,
    calibrationCompliance: 97,
    activeStudyCount: 4,
    active: true,
    createdAt: '2010-01-15T09:00:00Z',
    updatedAt: '2024-09-15T10:00:00Z',
  },
  {
    id: 'facility-2',
    name: 'BioTest CRO Services',
    code: 'BTS-EXT',
    type: 'cro',
    address: '500 Pharma Boulevard',
    city: 'San Diego',
    state: 'CA',
    country: 'USA',
    postalCode: '92121',
    phone: '+1 858-555-0200',
    testFacilityManagementId: 'ext-tfm-1',
    testFacilityManagementName: 'Dr. Richard Hayes',
    qaUnitHeadId: 'ext-qa-1',
    qaUnitHeadName: 'Susan Miller',
    archivistId: 'ext-archive-1',
    archivistName: 'Thomas Brown',
    capabilities: [
      'carcinogenicity',
      'chronic-toxicity',
      'reproductive-toxicity',
    ],
    speciesCapabilities: ['rat', 'mouse', 'dog', 'primate'],
    animalCapacity: 10000,
    glpCertified: true,
    certificationAgency: 'FDA',
    certificationDate: '2022-11-01',
    certificationExpiryDate: '2025-11-01',
    lastInspectionDate: '2024-03-20',
    lastInspectionResult: 'passed',
    equipmentCount: 280,
    calibrationCompliance: 99,
    activeStudyCount: 0,
    active: true,
    createdAt: '2018-06-01T09:00:00Z',
    updatedAt: '2024-03-25T14:00:00Z',
  },
  {
    id: 'facility-3',
    name: 'GenTox Analytics Lab',
    code: 'GAL-001',
    type: 'internal',
    address: '100 Research Drive, Building B',
    city: 'Cambridge',
    state: 'MA',
    country: 'USA',
    postalCode: '02142',
    phone: '+1 617-555-0150',
    testFacilityManagementId: 'person-6',
    testFacilityManagementName: 'David Martinez',
    qaUnitHeadId: 'person-qa-1',
    qaUnitHeadName: 'Jennifer Walsh',
    archivistId: 'person-archive-1',
    archivistName: 'Maria Santos',
    capabilities: [
      'genotoxicity',
    ],
    speciesCapabilities: [],
    animalCapacity: null,
    glpCertified: true,
    certificationAgency: 'FDA',
    certificationDate: '2023-06-15',
    certificationExpiryDate: '2026-06-15',
    lastInspectionDate: '2024-09-10',
    lastInspectionResult: 'passed',
    equipmentCount: 42,
    calibrationCompliance: 100,
    activeStudyCount: 1,
    active: true,
    createdAt: '2015-03-01T09:00:00Z',
    updatedAt: '2024-09-15T10:00:00Z',
  },
  {
    id: 'facility-4',
    name: 'PrimatePharm Research',
    code: 'PPR-EXT',
    type: 'cro',
    address: '2000 Primate Way',
    city: 'Houston',
    state: 'TX',
    country: 'USA',
    postalCode: '77001',
    phone: '+1 713-555-0300',
    testFacilityManagementId: 'ext-tfm-2',
    testFacilityManagementName: 'Dr. Angela White',
    qaUnitHeadId: 'ext-qa-2',
    qaUnitHeadName: 'Mark Johnson',
    archivistId: 'ext-archive-2',
    archivistName: 'Lisa Chen',
    capabilities: [
      'subacute-toxicity',
      'subchronic-toxicity',
      'safety-pharmacology',
      'pharmacokinetics',
    ],
    speciesCapabilities: ['primate', 'minipig'],
    animalCapacity: 500,
    glpCertified: true,
    certificationAgency: 'FDA',
    certificationDate: '2024-01-15',
    certificationExpiryDate: '2027-01-15',
    lastInspectionDate: '2024-01-10',
    lastInspectionResult: 'passed',
    equipmentCount: 95,
    calibrationCompliance: 98,
    activeStudyCount: 0,
    active: true,
    createdAt: '2019-09-01T09:00:00Z',
    updatedAt: '2024-01-20T11:00:00Z',
  },
  {
    id: 'facility-5',
    name: 'HistoPath Contractors',
    code: 'HPC-EXT',
    type: 'contractor',
    address: '750 Pathology Lane',
    city: 'Research Triangle Park',
    state: 'NC',
    country: 'USA',
    postalCode: '27709',
    phone: '+1 919-555-0400',
    testFacilityManagementId: 'ext-tfm-3',
    testFacilityManagementName: 'Dr. Patricia Moore',
    qaUnitHeadId: 'ext-qa-3',
    qaUnitHeadName: 'Kevin O\'Brien',
    archivistId: 'ext-archive-3',
    archivistName: 'Nancy Taylor',
    capabilities: [],
    speciesCapabilities: [],
    animalCapacity: null,
    glpCertified: true,
    certificationAgency: 'FDA',
    certificationDate: '2023-03-01',
    certificationExpiryDate: '2026-03-01',
    lastInspectionDate: '2023-02-15',
    lastInspectionResult: 'passed',
    equipmentCount: 35,
    calibrationCompliance: 94,
    activeStudyCount: 2,
    active: true,
    createdAt: '2017-05-15T09:00:00Z',
    updatedAt: '2023-03-05T16:00:00Z',
  },
];

// ============================================================================
// COMPLIANCE SCORE GAUGE
// ============================================================================

function ComplianceGauge({ score }: { score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 90) return 'text-green-500';
    if (s >= 75) return 'text-amber-500';
    return 'text-red-500';
  };
  
  const getScoreLabel = (s: number) => {
    if (s >= 90) return 'Excellent';
    if (s >= 75) return 'Good';
    if (s >= 60) return 'Needs Attention';
    return 'Critical';
  };
  
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-[var(--border)]"
          />
          {/* Score circle */}
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            strokeLinecap="round"
            className={getScoreColor(score)}
            style={{
              strokeDasharray,
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.5s ease-in-out',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
          <span className="text-xs text-text-muted">/ 100</span>
        </div>
      </div>
      <span className={`mt-2 text-sm font-medium ${getScoreColor(score)}`}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
}

// ============================================================================
// METRIC CARD
// ============================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: 'green' | 'amber' | 'red' | 'blue' | 'gray';
  onClick?: () => void;
}

function MetricCard({ title, value, subtitle, icon, trend, trendValue, color = 'blue', onClick }: MetricCardProps) {
  const colorClasses = {
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    gray: 'text-text-muted bg-gray-500/10',
  };
  
  const trendColors = {
    up: 'text-green-400',
    down: 'text-red-400',
    stable: 'text-text-muted',
  };
  
  return (
    <div 
      className={`bg-surface-card border border-border rounded-lg p-4 ${onClick ? 'cursor-pointer hover:bg-surface-card transition-colors' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs ${trendColors[trend]}`}>
            {trend === 'up' && <TrendingUp className="w-3 h-3" />}
            {trend === 'down' && <TrendingUp className="w-3 h-3 rotate-180" />}
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-text-primary">{value}</div>
        <div className="text-sm text-text-muted">{title}</div>
        {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// ACTION ITEM ROW
// ============================================================================

function ActionItemRow({ item, onView }: { item: GLPActionItem; onView: () => void }) {
  const typeIcons: Record<string, React.ReactNode> = {
    'deviation': <AlertTriangle className="w-4 h-4" />,
    'audit-finding': <ClipboardCheck className="w-4 h-4" />,
    'training': <GraduationCap className="w-4 h-4" />,
    'calibration': <Wrench className="w-4 h-4" />,
    'archive': <Archive className="w-4 h-4" />,
    'study-milestone': <FlaskConical className="w-4 h-4" />,
  };
  
  const isOverdue = item.status === 'overdue' || new Date(item.dueDate) < new Date();
  const daysUntilDue = Math.ceil((new Date(item.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <div 
      className="flex items-center gap-4 p-3 bg-surface-card border border-border rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
      onClick={onView}
    >
      {/* Priority indicator */}
      <div className={`w-1 h-12 rounded-full ${
        item.priority === 'critical' ? 'bg-red-500' :
        item.priority === 'high' ? 'bg-amber-500' :
        item.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
      }`} />
      
      {/* Icon */}
      <div className={`p-2 rounded-lg ${
        item.priority === 'critical' ? 'bg-red-500/10 text-red-400' :
        item.priority === 'high' ? 'bg-amber-500/10 text-amber-400' :
        'bg-gray-500/10 text-text-muted'
      }`}>
        {typeIcons[item.type]}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{item.title}</div>
        <div className="text-xs text-text-muted truncate">{item.description}</div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-xs text-text-muted">
            <User className="w-3 h-3 inline mr-1" />
            {item.assignedToName}
          </span>
          {item.relatedStudyNumber && (
            <span className="text-xs text-text-muted">
              <FlaskConical className="w-3 h-3 inline mr-1" />
              {item.relatedStudyNumber}
            </span>
          )}
        </div>
      </div>
      
      {/* Due date */}
      <div className="text-right">
        <div className={`text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-text-muted'}`}>
          {isOverdue ? (
            <span className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {Math.abs(daysUntilDue)} days overdue
            </span>
          ) : (
            <span>Due in {daysUntilDue} days</span>
          )}
        </div>
        <Badge 
          color={priorityColors[item.priority]} 
          size="sm"
          className="mt-1"
        >
          {item.priority}
        </Badge>
      </div>
      
      <ChevronRight className="w-4 h-4 text-text-muted" />
    </div>
  );
}

// ============================================================================
// DASHBOARD TAB
// ============================================================================

function DashboardTab({ metrics, actionItems }: { metrics: GLPComplianceMetrics; actionItems: GLPActionItem[] }) {
  const { deadClick } = useDeadClick();
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Compliance Score + Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Compliance Score Card */}
        <Card className="lg:row-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="font-medium">GLP Compliance Score</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            <ComplianceGauge score={metrics.overallComplianceScore} />
            <div className="mt-4 text-xs text-text-muted text-center">
              Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
            </div>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => toast.success('GLP record updated — audit trail entry created')}>
              <RefreshCw className="w-3 h-3 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>
        
        {/* Study Metrics */}
        <MetricCard
          title="Active Studies"
          value={metrics.totalActiveStudies}
          subtitle={`${metrics.studiesInLife} in-life, ${metrics.studiesInAnalysis} in analysis`}
          icon={<FlaskConical className="w-5 h-5" />}
          color="green"
        />
        
        {/* Deviation Metrics */}
        <MetricCard
          title="Open Deviations"
          value={metrics.openDeviations}
          subtitle={`${metrics.criticalDeviations} critical, ${metrics.majorDeviations} major`}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={metrics.criticalDeviations > 0 ? 'red' : metrics.majorDeviations > 2 ? 'amber' : 'green'}
          trend={metrics.deviationsTrend === 'improving' ? 'down' : metrics.deviationsTrend === 'worsening' ? 'up' : 'stable'}
          trendValue={metrics.deviationsTrend}
        />
        
        {/* Audit Metrics */}
        <MetricCard
          title="Open Audit Findings"
          value={metrics.openAuditFindings}
          subtitle={`${metrics.overdueResponses} overdue responses`}
          icon={<ClipboardCheck className="w-5 h-5" />}
          color={metrics.overdueResponses > 0 ? 'red' : 'blue'}
        />
        
        {/* Training Compliance */}
        <MetricCard
          title="Training Compliance"
          value={`${metrics.trainingComplianceRate}%`}
          subtitle={`${metrics.personnelWithExpiredTraining} expired, ${metrics.personnelWithExpiringTraining} expiring`}
          icon={<GraduationCap className="w-5 h-5" />}
          color={metrics.trainingComplianceRate >= 95 ? 'green' : metrics.trainingComplianceRate >= 85 ? 'amber' : 'red'}
        />
        
        {/* Calibration Status */}
        <MetricCard
          title="Calibration Compliance"
          value={`${metrics.calibrationComplianceRate}%`}
          subtitle={`${metrics.equipmentOutOfCalibration} overdue, ${metrics.equipmentDueSoon} due soon`}
          icon={<Wrench className="w-5 h-5" />}
          color={metrics.equipmentOutOfCalibration > 0 ? 'red' : metrics.equipmentDueSoon > 3 ? 'amber' : 'green'}
        />
        
        {/* Archive Status */}
        <MetricCard
          title="Pending Archives"
          value={metrics.pendingArchives}
          subtitle={`${metrics.studiesPendingArchive} studies awaiting archive`}
          icon={<Archive className="w-5 h-5" />}
          color={metrics.pendingArchives > 5 ? 'amber' : 'blue'}
        />
      </div>
      
      {/* Action Items */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              <span className="font-medium">Action Items</span>
              <Badge color="amber" size="sm">{actionItems.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setActiveModule('qms'); toast.info('Opening Quality Management — Action Items'); }}>
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {actionItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="w-12 h-12" />}
              title="No pending actions"
              description="All compliance items are up to date"
            />
          ) : (
            <div className="space-y-3">
              {actionItems.slice(0, 5).map(item => (
                <ActionItemRow 
                  key={item.id} 
                  item={item}
                  onView={() => { /* View action */ }}
                />
              ))}
              {actionItems.length > 5 && (
                <div className="text-center pt-2">
                  <Button variant="ghost" size="sm" onClick={() => toast.success('GLP record updated — audit trail entry created')}>
                    View {actionItems.length - 5} more items
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface-card border border-green-500/20 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-400">{metrics.studiesInLife}</div>
          <div className="text-sm text-text-muted">Studies In-Life</div>
        </div>
        <div className="bg-surface-card border border-amber-500/20 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-amber-400">{metrics.scheduledAudits}</div>
          <div className="text-sm text-text-muted">Upcoming Audits</div>
        </div>
        <div className="bg-surface-card border border-blue-500/20 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{metrics.avgDeviationClosureTime}</div>
          <div className="text-sm text-text-muted">Avg Days to Close</div>
        </div>
        <div className="bg-surface-card border border-purple-500/20 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{metrics.retrievedArchives}</div>
          <div className="text-sm text-text-muted">Archives Retrieved</div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STUDIES TAB
// ============================================================================

interface StudyRowProps {
  study: GLPStudy;
  onView: () => void;
}

function StudyRow({ study, onView }: StudyRowProps) {
  const statusLabels: Record<GLPStudyStatus, string> = {
    'planned': 'Planned',
    'protocol-draft': 'Protocol Draft',
    'protocol-approved': 'Protocol Approved',
    'in-progress': 'In Progress',
    'in-life-complete': 'In-Life Complete',
    'analysis': 'Analysis',
    'report-draft': 'Report Draft',
    'report-qc': 'Report QC',
    'report-signed': 'Report Signed',
    'archived': 'Archived',
    'terminated': 'Terminated',
  };
  
  const studyTypeLabels: Record<string, string> = {
    'acute-toxicity': 'Acute Toxicity',
    'subacute-toxicity': 'Subacute Toxicity',
    'subchronic-toxicity': 'Subchronic Toxicity',
    'chronic-toxicity': 'Chronic Toxicity',
    'carcinogenicity': 'Carcinogenicity',
    'reproductive-toxicity': 'Reproductive Toxicity',
    'developmental-toxicity': 'Developmental Toxicity',
    'genotoxicity': 'Genotoxicity',
    'safety-pharmacology': 'Safety Pharmacology',
    'pharmacokinetics': 'Pharmacokinetics',
    'toxicokinetics': 'Toxicokinetics',
    'local-tolerance': 'Local Tolerance',
    'immunotoxicity': 'Immunotoxicity',
    'phototoxicity': 'Phototoxicity',
    'other': 'Other',
  };
  
  const speciesLabels: Record<string, string> = {
    'rat': 'Rat',
    'mouse': 'Mouse',
    'rabbit': 'Rabbit',
    'dog': 'Dog',
    'primate': 'Primate',
    'guinea-pig': 'Guinea Pig',
    'minipig': 'Minipig',
    'other': 'Other',
  };
  
  const getProgressStage = (status: GLPStudyStatus): number => {
    const stages: GLPStudyStatus[] = [
      'planned', 'protocol-draft', 'protocol-approved', 'in-progress',
      'in-life-complete', 'analysis', 'report-draft', 'report-qc', 'report-signed', 'archived'
    ];
    const idx = stages.indexOf(status);
    return idx >= 0 ? ((idx + 1) / stages.length) * 100 : 0;
  };
  
  return (
    <div 
      className="flex items-center gap-4 p-4 bg-surface-card border border-border rounded-lg hover:bg-surface-elevated transition-colors cursor-pointer"
      onClick={onView}
    >
      {/* Status indicator */}
      <div className={`w-2 h-16 rounded-full ${
        study.status === 'in-progress' ? 'bg-green-500' :
        study.status === 'terminated' ? 'bg-red-500' :
        ['analysis', 'report-draft', 'report-qc'].includes(study.status) ? 'bg-amber-500' :
        ['report-signed', 'archived'].includes(study.status) ? 'bg-purple-500' :
        'bg-blue-500'
      }`} />
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-amber-400">{study.studyNumber}</span>
          <Badge color={studyStatusColors[study.status]} size="sm">
            {statusLabels[study.status]}
          </Badge>
          {study.glpCompliant && (
            <Badge color="green" size="sm">GLP</Badge>
          )}
          {study.glpDeviations.length > 0 && (
            <Badge color="red" size="sm">
              {study.glpDeviations.length} Deviation{study.glpDeviations.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <div className="text-text-primary font-medium mt-1 truncate">{study.title}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Beaker className="w-3 h-3" />
            {studyTypeLabels[study.studyType]}
          </span>
          <span className="flex items-center gap-1">
            <FlaskConical className="w-3 h-3" />
            {study.testArticleName}
          </span>
          <span className="flex items-center gap-1">
            {speciesLabels[study.species]}
            {study.animalCount && ` (n=${study.animalCount})`}
          </span>
        </div>
      </div>
      
      {/* Study Director */}
      <div className="text-right w-40">
        <div className="text-xs text-text-muted">Study Director</div>
        <div className="text-sm text-text-secondary">{study.studyDirectorName}</div>
        <div className="text-xs text-text-muted mt-1">{study.testFacilityName}</div>
      </div>
      
      {/* Progress */}
      <div className="w-32">
        <div className="text-xs text-text-muted mb-1">Progress</div>
        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all ${
              study.status === 'terminated' ? 'bg-red-500' :
              study.status === 'archived' ? 'bg-purple-500' : 'bg-green-500'
            }`}
            style={{ width: `${getProgressStage(study.status)}%` }}
          />
        </div>
        <div className="text-xs text-text-muted mt-1">
          {study.inLifeStartDate ? new Date(study.inLifeStartDate).toLocaleDateString() : 'Not started'}
        </div>
      </div>
      
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </div>
  );
}

function StudiesTab({ 
  studies, 
  searchQuery,
  onSelectStudy 
}: { 
  studies: GLPStudy[]; 
  searchQuery: string;
  onSelectStudy: (id: string) => void;
}) {
    const { deadClick } = useDeadClick();
  const [statusFilter, setStatusFilter] = useState<GLPStudyStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  const filteredStudies = useMemo(() => {
    return studies.filter(study => {
      // Status filter
      if (statusFilter !== 'all' && study.status !== statusFilter) return false;
      
      // Type filter
      if (typeFilter !== 'all' && study.studyType !== typeFilter) return false;
      
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          study.studyNumber.toLowerCase().includes(query) ||
          study.title.toLowerCase().includes(query) ||
          study.testArticleName.toLowerCase().includes(query) ||
          study.studyDirectorName.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [studies, statusFilter, typeFilter, searchQuery]);
  
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: studies.length };
    studies.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return counts;
  }, [studies]);
  
  const activeStatuses: GLPStudyStatus[] = ['in-progress', 'analysis', 'report-draft', 'report-qc'];
  const activeCount = studies.filter(s => activeStatuses.includes(s.status)).length;
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{studies.length}</div>
          <div className="text-sm text-text-muted">Total Studies</div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{activeCount}</div>
          <div className="text-sm text-text-muted">Active Studies</div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-400">
            {studies.filter(s => s.status === 'in-progress').length}
          </div>
          <div className="text-sm text-text-muted">In-Life Phase</div>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">
            {studies.filter(s => s.status === 'archived').length}
          </div>
          <div className="text-sm text-text-muted">Archived</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Status:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'analysis', label: 'Analysis' },
              { value: 'report-draft', label: 'Report' },
              { value: 'archived', label: 'Archived' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as GLPStudyStatus | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
                {statusCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({statusCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-surface-elevated border border-border rounded px-3 py-1 text-sm text-text-primary"
          >
            <option value="all">All Types</option>
            <option value="acute-toxicity">Acute Toxicity</option>
            <option value="subacute-toxicity">Subacute Toxicity</option>
            <option value="subchronic-toxicity">Subchronic Toxicity</option>
            <option value="developmental-toxicity">Developmental Toxicity</option>
            <option value="genotoxicity">Genotoxicity</option>
            <option value="pharmacokinetics">Pharmacokinetics</option>
            <option value="safety-pharmacology">Safety Pharmacology</option>
          </select>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-text-muted">
          Showing {filteredStudies.length} of {studies.length} studies
        </div>
      </div>
      
      {/* Studies List */}
      {filteredStudies.length === 0 ? (
        <EmptyState
          icon={<FlaskConical className="w-12 h-12" />}
          title="No studies found"
          description={searchQuery ? "Try adjusting your search or filters" : "No studies match the current filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredStudies.map(study => (
            <StudyRow 
              key={study.id} 
              study={study}
              onView={() => onSelectStudy(study.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DEVIATION ROW COMPONENT
// ============================================================================

const deviationTypeLabels: Record<DeviationType, string> = {
  'protocol': 'Protocol',
  'sop': 'SOP',
  'equipment': 'Equipment',
  'documentation': 'Documentation',
  'environmental': 'Environmental',
  'specimen-handling': 'Specimen Handling',
  'data-integrity': 'Data Integrity',
  'personnel': 'Personnel',
  'other': 'Other',
};

const deviationStatusLabels: Record<DeviationStatus, string> = {
  'open': 'Open',
  'under-investigation': 'Under Investigation',
  'corrected': 'Corrected',
  'closed': 'Closed',
};

const deviationStatusColors: Record<DeviationStatus, 'red' | 'amber' | 'blue' | 'green'> = {
  'open': 'red',
  'under-investigation': 'amber',
  'corrected': 'blue',
  'closed': 'green',
};

function DeviationRow({ 
  deviation, 
  onView 
}: { 
  deviation: GLPDeviation; 
  onView: () => void;
}) {
  const daysSinceOccurred = Math.floor(
    (Date.now() - new Date(deviation.dateOccurred).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div 
      className="bg-surface-card border border-border rounded-lg p-4 hover:border-border cursor-pointer transition-colors flex items-center gap-4"
      onClick={onView}
    >
      {/* Severity indicator */}
      <div className={`w-1 h-16 rounded-full ${
        deviation.severity === 'critical' ? 'bg-red-500' :
        deviation.severity === 'major' ? 'bg-amber-500' :
        'bg-blue-500'
      }`} />
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-amber-400">{deviation.deviationNumber}</span>
          <Badge color={deviationSeverityColors[deviation.severity]} size="sm">
            {deviation.severity.charAt(0).toUpperCase() + deviation.severity.slice(1)}
          </Badge>
          <Badge color={deviationStatusColors[deviation.status]} size="sm">
            {deviationStatusLabels[deviation.status]}
          </Badge>
          {deviation.impactOnDataIntegrity && (
            <Badge color="red" size="sm">
              <AlertOctagon className="w-3 h-3 mr-1" />
              Data Impact
            </Badge>
          )}
          {deviation.sponsorNotified && (
            <Badge color="purple" size="sm">Sponsor Notified</Badge>
          )}
          {deviation.capaId && (
            <Badge color="blue" size="sm">CAPA Linked</Badge>
          )}
        </div>
        <div className="text-text-primary font-medium mt-1 truncate">{deviation.title}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <FileWarning className="w-3 h-3" />
            {deviationTypeLabels[deviation.type]}
          </span>
          <span className="flex items-center gap-1">
            <FlaskConical className="w-3 h-3" />
            {deviation.studyNumber}
          </span>
          {deviation.affectedAnimals && (
            <span className="text-amber-400">{deviation.affectedAnimals}</span>
          )}
        </div>
      </div>
      
      {/* Discovered by / Date */}
      <div className="text-right w-48">
        <div className="text-xs text-text-muted">Discovered</div>
        <div className="text-sm text-text-secondary">{new Date(deviation.dateDiscovered).toLocaleDateString()}</div>
        <div className="text-xs text-text-muted mt-1 truncate" title={deviation.discoveredBy}>
          {deviation.discoveredBy.split(',')[0]}
        </div>
      </div>
      
      {/* Days open / status progress */}
      <div className="w-28 text-center">
        {deviation.status !== 'closed' ? (
          <>
            <div className={`text-lg font-bold ${daysSinceOccurred > 30 ? 'text-red-400' : daysSinceOccurred > 14 ? 'text-amber-400' : 'text-text-secondary'}`}>
              {daysSinceOccurred}
            </div>
            <div className="text-xs text-text-muted">Days Open</div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold text-green-400">
              <CheckCircle className="w-5 h-5 mx-auto" />
            </div>
            <div className="text-xs text-text-muted">
              {deviation.closureDate ? new Date(deviation.closureDate).toLocaleDateString() : 'Closed'}
            </div>
          </>
        )}
      </div>
      
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </div>
  );
}

// ============================================================================
// DEVIATIONS TAB COMPONENT
// ============================================================================

function DeviationsTab({ 
  deviations, 
  searchQuery,
  onSelectDeviation 
}: { 
  deviations: GLPDeviation[];
  searchQuery: string;
  onSelectDeviation: (id: string) => void;
}) {
  const [severityFilter, setSeverityFilter] = useState<DeviationSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DeviationStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<DeviationType | 'all'>('all');
  
  // Filter deviations
  const filteredDeviations = useMemo(() => {
    return deviations.filter(dev => {
      // Severity filter
      if (severityFilter !== 'all' && dev.severity !== severityFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && dev.status !== statusFilter) return false;
      // Type filter
      if (typeFilter !== 'all' && dev.type !== typeFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          dev.deviationNumber.toLowerCase().includes(q) ||
          dev.title.toLowerCase().includes(q) ||
          dev.studyNumber.toLowerCase().includes(q) ||
          dev.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deviations, severityFilter, statusFilter, typeFilter, searchQuery]);
  
  // Stats
  const criticalCount = deviations.filter(d => d.severity === 'critical').length;
  const majorCount = deviations.filter(d => d.severity === 'major').length;
  const openCount = deviations.filter(d => d.status === 'open' || d.status === 'under-investigation').length;
  const closedCount = deviations.filter(d => d.status === 'closed').length;
  
  // Status counts for filter badges
  const statusCounts: Record<string, number> = {
    'all': deviations.length,
    'open': deviations.filter(d => d.status === 'open').length,
    'under-investigation': deviations.filter(d => d.status === 'under-investigation').length,
    'corrected': deviations.filter(d => d.status === 'corrected').length,
    'closed': closedCount,
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{deviations.length}</div>
          <div className="text-sm text-text-muted">Total Deviations</div>
        </div>
        <div className="bg-surface-card border border-red-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{criticalCount}</div>
          <div className="text-sm text-text-muted">Critical</div>
        </div>
        <div className="bg-surface-card border border-amber-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-400">{openCount}</div>
          <div className="text-sm text-text-muted">Open/Investigating</div>
        </div>
        <div className="bg-surface-card border border-green-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{closedCount}</div>
          <div className="text-sm text-text-muted">Closed</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Severity filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Severity:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'critical', label: 'Critical' },
              { value: 'major', label: 'Major' },
              { value: 'minor', label: 'Minor' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setSeverityFilter(opt.value as DeviationSeverity | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  severityFilter === opt.value
                    ? opt.value === 'critical' ? 'bg-red-500 text-white' :
                      opt.value === 'major' ? 'bg-amber-500 text-white' :
                      opt.value === 'minor' ? 'bg-blue-500 text-white' :
                      'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Status:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'open', label: 'Open' },
              { value: 'under-investigation', label: 'Investigating' },
              { value: 'corrected', label: 'Corrected' },
              { value: 'closed', label: 'Closed' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as DeviationStatus | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
                {statusCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({statusCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        {/* Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DeviationType | 'all')}
            className="bg-surface-elevated border border-border rounded px-3 py-1 text-sm text-text-primary"
          >
            <option value="all">All Types</option>
            <option value="protocol">Protocol</option>
            <option value="sop">SOP</option>
            <option value="equipment">Equipment</option>
            <option value="documentation">Documentation</option>
            <option value="environmental">Environmental</option>
            <option value="specimen-handling">Specimen Handling</option>
            <option value="data-integrity">Data Integrity</option>
            <option value="personnel">Personnel</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-text-muted">
          Showing {filteredDeviations.length} of {deviations.length} deviations
        </div>
      </div>
      
      {/* Deviations List */}
      {filteredDeviations.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title="No deviations found"
          description={searchQuery ? "Try adjusting your search or filters" : "No deviations match the current filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredDeviations.map(deviation => (
            <DeviationRow 
              key={deviation.id} 
              deviation={deviation}
              onView={() => onSelectDeviation(deviation.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AUDIT ROW COMPONENT
// ============================================================================

const auditTypeLabels: Record<AuditType, string> = {
  'study': 'Study Audit',
  'facility': 'Facility Audit',
  'process': 'Process Audit',
  'computer-system': 'Computer System',
  'regulatory': 'Regulatory Inspection',
};

const auditTypeIcons: Record<AuditType, React.ReactNode> = {
  'study': <FlaskConical className="w-4 h-4" />,
  'facility': <Building className="w-4 h-4" />,
  'process': <RefreshCw className="w-4 h-4" />,
  'computer-system': <Wrench className="w-4 h-4" />,
  'regulatory': <Shield className="w-4 h-4" />,
};

const auditStatusLabels: Record<AuditStatus, string> = {
  'scheduled': 'Scheduled',
  'in-progress': 'In Progress',
  'pending-response': 'Pending Response',
  'closed': 'Closed',
};

const auditStatusColors: Record<AuditStatus, 'blue' | 'amber' | 'red' | 'green'> = {
  'scheduled': 'blue',
  'in-progress': 'amber',
  'pending-response': 'red',
  'closed': 'green',
};

function AuditRow({ 
  audit, 
  onView 
}: { 
  audit: GLPAudit; 
  onView: () => void;
}) {
  const isOverdue = audit.responseDeadline && 
    new Date(audit.responseDeadline) < new Date() && 
    audit.status === 'pending-response';
  
  const daysUntilDeadline = audit.responseDeadline 
    ? Math.ceil((new Date(audit.responseDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  
  return (
    <div 
      className="bg-surface-card border border-border rounded-lg p-4 hover:border-border cursor-pointer transition-colors flex items-center gap-4"
      onClick={onView}
    >
      {/* Type indicator */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        audit.auditType === 'regulatory' ? 'bg-purple-500/20 text-purple-400' :
        audit.auditType === 'study' ? 'bg-green-500/20 text-green-400' :
        audit.auditType === 'facility' ? 'bg-blue-500/20 text-blue-400' :
        audit.auditType === 'computer-system' ? 'bg-amber-500/20 text-amber-400' :
        'bg-gray-500/20 text-text-muted'
      }`}>
        {auditTypeIcons[audit.auditType]}
      </div>
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-amber-400">{audit.auditNumber}</span>
          <Badge color={auditStatusColors[audit.status]} size="sm">
            {auditStatusLabels[audit.status]}
          </Badge>
          {audit.auditType === 'regulatory' && (
            <Badge color="purple" size="sm">
              {audit.regulatoryAgency}
            </Badge>
          )}
          {audit.form483Issued && (
            <Badge color="red" size="sm">Form 483</Badge>
          )}
          {audit.warningLetterIssued && (
            <Badge color="red" size="sm">Warning Letter</Badge>
          )}
          {isOverdue && (
            <Badge color="red" size="sm">
              <AlertCircle className="w-3 h-3 mr-1" />
              Overdue
            </Badge>
          )}
        </div>
        <div className="text-text-primary font-medium mt-1 truncate">{audit.title}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            {auditTypeIcons[audit.auditType]}
            {auditTypeLabels[audit.auditType]}
          </span>
          {audit.processArea && (
            <span>{audit.processArea}</span>
          )}
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {audit.leadAuditorName}
          </span>
        </div>
      </div>
      
      {/* Findings summary */}
      <div className="text-center w-32">
        <div className="text-xs text-text-muted mb-1">Findings</div>
        {audit.totalFindings > 0 ? (
          <div className="flex items-center justify-center gap-1">
            {audit.criticalFindings > 0 && (
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                {audit.criticalFindings}C
              </span>
            )}
            {audit.majorFindings > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs font-medium">
                {audit.majorFindings}M
              </span>
            )}
            {audit.minorFindings > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                {audit.minorFindings}m
              </span>
            )}
            {audit.observations > 0 && (
              <span className="px-2 py-0.5 bg-gray-500/20 text-text-muted rounded text-xs font-medium">
                {audit.observations}O
              </span>
            )}
          </div>
        ) : (
          <div className="text-text-muted text-sm">—</div>
        )}
      </div>
      
      {/* Date / Deadline */}
      <div className="text-right w-36">
        {audit.status === 'scheduled' ? (
          <>
            <div className="text-xs text-text-muted">Scheduled</div>
            <div className="text-sm text-text-secondary">{new Date(audit.scheduledDate).toLocaleDateString()}</div>
          </>
        ) : audit.status === 'pending-response' && audit.responseDeadline ? (
          <>
            <div className="text-xs text-text-muted">Response Due</div>
            <div className={`text-sm ${isOverdue ? 'text-red-400' : daysUntilDeadline! <= 7 ? 'text-amber-400' : 'text-text-secondary'}`}>
              {new Date(audit.responseDeadline).toLocaleDateString()}
            </div>
            {daysUntilDeadline !== null && (
              <div className={`text-xs ${isOverdue ? 'text-red-400' : daysUntilDeadline <= 7 ? 'text-amber-400' : 'text-text-muted'}`}>
                {isOverdue ? `${Math.abs(daysUntilDeadline)} days overdue` : `${daysUntilDeadline} days left`}
              </div>
            )}
          </>
        ) : audit.status === 'closed' && audit.closureDate ? (
          <>
            <div className="text-xs text-text-muted">Closed</div>
            <div className="text-sm text-green-400">{new Date(audit.closureDate).toLocaleDateString()}</div>
          </>
        ) : audit.actualStartDate ? (
          <>
            <div className="text-xs text-text-muted">Started</div>
            <div className="text-sm text-text-secondary">{new Date(audit.actualStartDate).toLocaleDateString()}</div>
          </>
        ) : null}
      </div>
      
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </div>
  );
}

// ============================================================================
// AUDITS TAB COMPONENT
// ============================================================================

function AuditsTab({ 
  audits, 
  searchQuery,
  onSelectAudit 
}: { 
  audits: GLPAudit[];
  searchQuery: string;
  onSelectAudit: (id: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<AuditType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  
  // Filter audits
  const filteredAudits = useMemo(() => {
    return audits.filter(audit => {
      // Type filter
      if (typeFilter !== 'all' && audit.auditType !== typeFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && audit.status !== statusFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          audit.auditNumber.toLowerCase().includes(q) ||
          audit.title.toLowerCase().includes(q) ||
          audit.leadAuditorName.toLowerCase().includes(q) ||
          (audit.processArea?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [audits, typeFilter, statusFilter, searchQuery]);
  
  // Stats
  const scheduledCount = audits.filter(a => a.status === 'scheduled').length;
  const inProgressCount = audits.filter(a => a.status === 'in-progress').length;
  const pendingResponseCount = audits.filter(a => a.status === 'pending-response').length;
  const totalFindings = audits.reduce((sum, a) => sum + a.totalFindings, 0);
  const openFindings = audits
    .filter(a => a.status !== 'closed')
    .reduce((sum, a) => sum + a.totalFindings, 0);
  
  // Status counts
  const statusCounts: Record<string, number> = {
    'all': audits.length,
    'scheduled': scheduledCount,
    'in-progress': inProgressCount,
    'pending-response': pendingResponseCount,
    'closed': audits.filter(a => a.status === 'closed').length,
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{audits.length}</div>
          <div className="text-sm text-text-muted">Total Audits</div>
        </div>
        <div className="bg-surface-card border border-blue-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{scheduledCount}</div>
          <div className="text-sm text-text-muted">Scheduled</div>
        </div>
        <div className="bg-surface-card border border-red-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-400">{pendingResponseCount}</div>
          <div className="text-sm text-text-muted">Pending Response</div>
        </div>
        <div className="bg-surface-card border border-amber-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-400">{openFindings}</div>
          <div className="text-sm text-text-muted">Open Findings</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AuditType | 'all')}
            className="bg-surface-elevated border border-border rounded px-3 py-1 text-sm text-text-primary"
          >
            <option value="all">All Types</option>
            <option value="study">Study Audit</option>
            <option value="facility">Facility Audit</option>
            <option value="process">Process Audit</option>
            <option value="computer-system">Computer System</option>
            <option value="regulatory">Regulatory Inspection</option>
          </select>
        </div>
        
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Status:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'in-progress', label: 'In Progress' },
              { value: 'pending-response', label: 'Pending' },
              { value: 'closed', label: 'Closed' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as AuditStatus | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
                {statusCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({statusCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-text-muted">
          Showing {filteredAudits.length} of {audits.length} audits
        </div>
      </div>
      
      {/* Audits List */}
      {filteredAudits.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-12 h-12" />}
          title="No audits found"
          description={searchQuery ? "Try adjusting your search or filters" : "No audits match the current filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredAudits.map(audit => (
            <AuditRow 
              key={audit.id} 
              audit={audit}
              onView={() => onSelectAudit(audit.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ARCHIVE ROW COMPONENT
// ============================================================================

const archiveTypeLabels: Record<ArchiveType, string> = {
  'raw-data': 'Raw Data',
  'specimens': 'Specimens',
  'protocol': 'Protocol',
  'final-report': 'Final Report',
  'correspondence': 'Correspondence',
  'other': 'Other',
};

const archiveTypeIcons: Record<ArchiveType, React.ReactNode> = {
  'raw-data': <FileText className="w-4 h-4" />,
  'specimens': <Beaker className="w-4 h-4" />,
  'protocol': <ClipboardCheck className="w-4 h-4" />,
  'final-report': <FileText className="w-4 h-4" />,
  'correspondence': <FileText className="w-4 h-4" />,
  'other': <Archive className="w-4 h-4" />,
};

const archiveStatusLabels: Record<ArchiveStatus, string> = {
  'pending': 'Pending',
  'archived': 'Archived',
  'retrieved': 'Retrieved',
  'destroyed': 'Destroyed',
};

const archiveStatusColors: Record<ArchiveStatus, 'amber' | 'green' | 'blue' | 'gray'> = {
  'pending': 'amber',
  'archived': 'green',
  'retrieved': 'blue',
  'destroyed': 'gray',
};

function ArchiveRow({ 
  archive, 
  onView 
}: { 
  archive: GLPArchive; 
  onView: () => void;
}) {
  const yearsUntilDestruction = Math.ceil(
    (new Date(archive.destructionEligibleDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 365)
  );
  
  return (
    <div 
      className="bg-surface-card border border-border rounded-lg p-4 hover:border-border cursor-pointer transition-colors flex items-center gap-4"
      onClick={onView}
    >
      {/* Type indicator */}
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
        archive.archiveType === 'raw-data' ? 'bg-blue-500/20 text-blue-400' :
        archive.archiveType === 'specimens' ? 'bg-purple-500/20 text-purple-400' :
        archive.archiveType === 'final-report' ? 'bg-green-500/20 text-green-400' :
        archive.archiveType === 'protocol' ? 'bg-amber-500/20 text-amber-400' :
        'bg-gray-500/20 text-text-muted'
      }`}>
        {archiveTypeIcons[archive.archiveType]}
      </div>
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono text-amber-400">{archive.archiveNumber}</span>
          <Badge color={archiveStatusColors[archive.status]} size="sm">
            {archiveStatusLabels[archive.status]}
          </Badge>
          {archive.temperatureControlled && (
            <Badge color="blue" size="sm">
              <ThermometerSun className="w-3 h-3 mr-1" />
              {archive.requiredTemperature}
            </Badge>
          )}
          {archive.specimenType && (
            <Badge color="purple" size="sm">
              {archive.specimenCount} specimens
            </Badge>
          )}
        </div>
        <div className="text-text-primary font-medium mt-1 truncate">{archive.title}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            {archiveTypeIcons[archive.archiveType]}
            {archiveTypeLabels[archive.archiveType]}
          </span>
          {archive.studyNumber && (
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3 h-3" />
              {archive.studyNumber}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Building className="w-3 h-3" />
            {archive.roomNumber}
          </span>
          {archive.boxNumber && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              {archive.boxNumber}
            </span>
          )}
        </div>
      </div>
      
      {/* Custody info */}
      <div className="text-right w-40">
        <div className="text-xs text-text-muted">Custodian</div>
        <div className="text-sm text-text-secondary truncate" title={archive.currentCustodian}>
          {archive.currentCustodian.split(' - ')[0]}
        </div>
        <div className="text-xs text-text-muted mt-1">
          {archive.custodyChain.length} custody event{archive.custodyChain.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Retention info */}
      <div className="w-32 text-center">
        <div className="text-xs text-text-muted mb-1">Retention</div>
        {archive.status === 'destroyed' ? (
          <div className="text-sm text-text-muted">Destroyed</div>
        ) : (
          <>
            <div className={`text-lg font-bold ${
              yearsUntilDestruction <= 2 ? 'text-amber-400' : 'text-text-secondary'
            }`}>
              {yearsUntilDestruction}y
            </div>
            <div className="text-xs text-text-muted">until eligible</div>
          </>
        )}
      </div>
      
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </div>
  );
}

// ============================================================================
// ARCHIVES TAB COMPONENT
// ============================================================================

function ArchivesTab({ 
  archives, 
  searchQuery,
  onSelectArchive 
}: { 
  archives: GLPArchive[];
  searchQuery: string;
  onSelectArchive: (id: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<ArchiveType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ArchiveStatus | 'all'>('all');
  
  // Filter archives
  const filteredArchives = useMemo(() => {
    return archives.filter(archive => {
      // Type filter
      if (typeFilter !== 'all' && archive.archiveType !== typeFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && archive.status !== statusFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          archive.archiveNumber.toLowerCase().includes(q) ||
          archive.title.toLowerCase().includes(q) ||
          (archive.studyNumber?.toLowerCase().includes(q) ?? false) ||
          archive.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [archives, typeFilter, statusFilter, searchQuery]);
  
  // Stats
  const archivedCount = archives.filter(a => a.status === 'archived').length;
  const pendingCount = archives.filter(a => a.status === 'pending').length;
  const retrievedCount = archives.filter(a => a.status === 'retrieved').length;
  const specimenCount = archives.filter(a => a.archiveType === 'specimens').length;
  
  // Status counts
  const statusCounts: Record<string, number> = {
    'all': archives.length,
    'pending': pendingCount,
    'archived': archivedCount,
    'retrieved': retrievedCount,
    'destroyed': archives.filter(a => a.status === 'destroyed').length,
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{archives.length}</div>
          <div className="text-sm text-text-muted">Total Archives</div>
        </div>
        <div className="bg-surface-card border border-green-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{archivedCount}</div>
          <div className="text-sm text-text-muted">Archived</div>
        </div>
        <div className="bg-surface-card border border-amber-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
          <div className="text-sm text-text-muted">Pending Archival</div>
        </div>
        <div className="bg-surface-card border border-blue-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{retrievedCount}</div>
          <div className="text-sm text-text-muted">Currently Retrieved</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ArchiveType | 'all')}
            className="bg-surface-elevated border border-border rounded px-3 py-1 text-sm text-text-primary"
          >
            <option value="all">All Types</option>
            <option value="raw-data">Raw Data</option>
            <option value="specimens">Specimens</option>
            <option value="final-report">Final Report</option>
            <option value="protocol">Protocol</option>
            <option value="correspondence">Correspondence</option>
            <option value="other">Other</option>
          </select>
        </div>
        
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Status:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'archived', label: 'Archived' },
              { value: 'retrieved', label: 'Retrieved' },
              { value: 'destroyed', label: 'Destroyed' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value as ArchiveStatus | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
                {statusCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({statusCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-text-muted">
          Showing {filteredArchives.length} of {archives.length} archives
        </div>
      </div>
      
      {/* Archives List */}
      {filteredArchives.length === 0 ? (
        <EmptyState
          icon={<Archive className="w-12 h-12" />}
          title="No archives found"
          description={searchQuery ? "Try adjusting your search or filters" : "No archives match the current filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredArchives.map(archive => (
            <ArchiveRow 
              key={archive.id} 
              archive={archive}
              onView={() => onSelectArchive(archive.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// PERSONNEL ROW COMPONENT
// ============================================================================

const personnelRoleLabels: Record<PersonnelRole, string> = {
  'study-director': 'Study Director',
  'principal-investigator': 'Principal Investigator',
  'qa-unit': 'QA Unit',
  'archivist': 'Archivist',
  'test-facility-management': 'Test Facility Management',
  'study-personnel': 'Study Personnel',
  'sponsor-representative': 'Sponsor Representative',
};

const personnelRoleColors: Record<PersonnelRole, 'green' | 'blue' | 'purple' | 'amber' | 'red' | 'gray'> = {
  'study-director': 'green',
  'principal-investigator': 'blue',
  'qa-unit': 'purple',
  'archivist': 'amber',
  'test-facility-management': 'red',
  'study-personnel': 'gray',
  'sponsor-representative': 'blue',
};

const trainingStatusLabels: Record<TrainingStatus, string> = {
  'current': 'Current',
  'expiring-soon': 'Expiring Soon',
  'expired': 'Expired',
  'not-required': 'N/A',
};

const trainingStatusColors: Record<TrainingStatus, 'green' | 'amber' | 'red' | 'gray'> = {
  'current': 'green',
  'expiring-soon': 'amber',
  'expired': 'red',
  'not-required': 'gray',
};

function PersonnelRow({ 
  person, 
  onView 
}: { 
  person: GLPPersonnel; 
  onView: () => void;
}) {
  return (
    <div 
      className="bg-surface-card border border-border rounded-lg p-4 hover:border-border cursor-pointer transition-colors flex items-center gap-4"
      onClick={onView}
    >
      {/* Avatar/initials */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${
        person.primaryRole === 'study-director' ? 'bg-green-500/20 text-green-400' :
        person.primaryRole === 'qa-unit' ? 'bg-purple-500/20 text-purple-400' :
        person.primaryRole === 'principal-investigator' ? 'bg-blue-500/20 text-blue-400' :
        person.primaryRole === 'archivist' ? 'bg-amber-500/20 text-amber-400' :
        person.primaryRole === 'test-facility-management' ? 'bg-red-500/20 text-red-400' :
        'bg-gray-500/20 text-text-muted'
      }`}>
        {person.firstName[0]}{person.lastName[0]}
      </div>
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-text-primary font-medium">
            {person.firstName} {person.lastName}
          </span>
          <span className="text-sm font-mono text-text-muted">{person.employeeId}</span>
          <Badge color={personnelRoleColors[person.primaryRole]} size="sm">
            {personnelRoleLabels[person.primaryRole]}
          </Badge>
          {person.additionalRoles.map(role => (
            <Badge key={role} color={personnelRoleColors[role]} size="sm">
              {personnelRoleLabels[role]}
            </Badge>
          ))}
        </div>
        <div className="text-sm text-text-muted mt-1">{person.title}</div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Building className="w-3 h-3" />
            {person.department}
          </span>
          <span className="flex items-center gap-1">
            <GraduationCap className="w-3 h-3" />
            {person.degrees[0]}
          </span>
          <span>{person.yearsExperience} years exp.</span>
          {person.certifications.length > 0 && (
            <span className="text-amber-400">
              {person.certifications[0]}
              {person.certifications.length > 1 && ` +${person.certifications.length - 1}`}
            </span>
          )}
        </div>
      </div>
      
      {/* Training status */}
      <div className="text-center w-28">
        <div className="text-xs text-text-muted mb-1">Training</div>
        <Badge color={trainingStatusColors[person.trainingStatus]} size="sm">
          {trainingStatusLabels[person.trainingStatus]}
        </Badge>
      </div>
      
      {/* Study assignments */}
      <div className="text-right w-32">
        <div className="text-xs text-text-muted">Assigned Studies</div>
        <div className="text-lg font-bold text-text-primary">
          {person.currentStudyAssignments.length}
        </div>
        {person.currentStudyAssignments.length > 0 && (
          <div className="text-xs text-text-muted">
            active
          </div>
        )}
      </div>
      
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </div>
  );
}

// ============================================================================
// PERSONNEL TAB COMPONENT
// ============================================================================

function PersonnelTab({ 
  personnel, 
  searchQuery,
  onSelectPersonnel 
}: { 
  personnel: GLPPersonnel[];
  searchQuery: string;
  onSelectPersonnel: (id: string) => void;
}) {
  const [roleFilter, setRoleFilter] = useState<PersonnelRole | 'all'>('all');
  const [trainingFilter, setTrainingFilter] = useState<TrainingStatus | 'all'>('all');
  
  // Filter personnel
  const filteredPersonnel = useMemo(() => {
    return personnel.filter(person => {
      // Role filter
      if (roleFilter !== 'all' && person.primaryRole !== roleFilter && !person.additionalRoles.includes(roleFilter)) return false;
      // Training filter
      if (trainingFilter !== 'all' && person.trainingStatus !== trainingFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          person.firstName.toLowerCase().includes(q) ||
          person.lastName.toLowerCase().includes(q) ||
          person.employeeId.toLowerCase().includes(q) ||
          person.title.toLowerCase().includes(q) ||
          person.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [personnel, roleFilter, trainingFilter, searchQuery]);
  
  // Stats
  const studyDirectorCount = personnel.filter(p => p.primaryRole === 'study-director').length;
  const qaCount = personnel.filter(p => p.primaryRole === 'qa-unit').length;
  const expiredTrainingCount = personnel.filter(p => p.trainingStatus === 'expired').length;
  const expiringTrainingCount = personnel.filter(p => p.trainingStatus === 'expiring-soon').length;
  
  // Training status counts
  const trainingCounts: Record<string, number> = {
    'all': personnel.length,
    'current': personnel.filter(p => p.trainingStatus === 'current').length,
    'expiring-soon': expiringTrainingCount,
    'expired': expiredTrainingCount,
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{personnel.length}</div>
          <div className="text-sm text-text-muted">Total Personnel</div>
        </div>
        <div className="bg-surface-card border border-green-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{studyDirectorCount}</div>
          <div className="text-sm text-text-muted">Study Directors</div>
        </div>
        <div className="bg-surface-card border border-purple-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-400">{qaCount}</div>
          <div className="text-sm text-text-muted">QA Personnel</div>
        </div>
        <div className={`bg-surface-card border rounded-lg p-4 ${
          expiredTrainingCount > 0 ? 'border-red-600/50' : 'border-amber-600/50'
        }`}>
          <div className={`text-2xl font-bold ${expiredTrainingCount > 0 ? 'text-red-400' : 'text-amber-400'}`}>
            {expiredTrainingCount > 0 ? expiredTrainingCount : expiringTrainingCount}
          </div>
          <div className="text-sm text-text-muted">
            {expiredTrainingCount > 0 ? 'Expired Training' : 'Training Expiring'}
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Role filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as PersonnelRole | 'all')}
            className="bg-surface-elevated border border-border rounded px-3 py-1 text-sm text-text-primary"
          >
            <option value="all">All Roles</option>
            <option value="study-director">Study Director</option>
            <option value="principal-investigator">Principal Investigator</option>
            <option value="qa-unit">QA Unit</option>
            <option value="archivist">Archivist</option>
            <option value="test-facility-management">Test Facility Mgmt</option>
            <option value="study-personnel">Study Personnel</option>
          </select>
        </div>
        
        {/* Training status filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Training:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'current', label: 'Current' },
              { value: 'expiring-soon', label: 'Expiring' },
              { value: 'expired', label: 'Expired' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTrainingFilter(opt.value as TrainingStatus | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  trainingFilter === opt.value
                    ? opt.value === 'expired' ? 'bg-red-500 text-white' :
                      opt.value === 'expiring-soon' ? 'bg-amber-500 text-white' :
                      'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
                {trainingCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({trainingCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-text-muted">
          Showing {filteredPersonnel.length} of {personnel.length} personnel
        </div>
      </div>
      
      {/* Personnel List */}
      {filteredPersonnel.length === 0 ? (
        <EmptyState
          icon={<Users className="w-12 h-12" />}
          title="No personnel found"
          description={searchQuery ? "Try adjusting your search or filters" : "No personnel match the current filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredPersonnel.map(person => (
            <PersonnelRow 
              key={person.id} 
              person={person}
              onView={() => onSelectPersonnel(person.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FACILITY ROW COMPONENT
// ============================================================================

type FacilityType = 'internal' | 'cro' | 'contractor';

const facilityTypeLabels: Record<FacilityType, string> = {
  'internal': 'Internal',
  'cro': 'CRO',
  'contractor': 'Contractor',
};

const facilityTypeColors: Record<FacilityType, 'green' | 'blue' | 'amber'> = {
  'internal': 'green',
  'cro': 'blue',
  'contractor': 'amber',
};

const inspectionResultLabels: Record<string, string> = {
  'passed': 'Passed',
  'passed-with-observations': 'Passed w/ Observations',
  'failed': 'Failed',
};

const inspectionResultColors: Record<string, 'green' | 'amber' | 'red'> = {
  'passed': 'green',
  'passed-with-observations': 'amber',
  'failed': 'red',
};

function FacilityRow({ 
  facility, 
  onView 
}: { 
  facility: GLPTestFacility; 
  onView: () => void;
}) {
  const certExpiry = facility.certificationExpiryDate 
    ? new Date(facility.certificationExpiryDate)
    : null;
  const monthsUntilExpiry = certExpiry 
    ? Math.ceil((certExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30))
    : null;
  const isExpiringSoon = monthsUntilExpiry !== null && monthsUntilExpiry <= 6;
  
  return (
    <div 
      className="bg-surface-card border border-border rounded-lg p-4 hover:border-text-muted cursor-pointer transition-colors flex items-center gap-4"
      onClick={onView}
    >
      {/* Type indicator */}
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
        facility.type === 'internal' ? 'bg-green-500/20 text-green-400' :
        facility.type === 'cro' ? 'bg-blue-500/20 text-blue-400' :
        'bg-amber-500/20 text-amber-400'
      }`}>
        <Building className="w-6 h-6" />
      </div>
      
      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <span className="text-text-primary font-medium">{facility.name}</span>
          <span className="text-sm font-mono text-text-muted">{facility.code}</span>
          <Badge color={facilityTypeColors[facility.type]} size="sm">
            {facilityTypeLabels[facility.type]}
          </Badge>
          {facility.glpCertified && (
            <Badge color={isExpiringSoon ? 'amber' : 'green'} size="sm">
              GLP Certified
            </Badge>
          )}
          {facility.lastInspectionResult && (
            <Badge color={inspectionResultColors[facility.lastInspectionResult]} size="sm">
              {inspectionResultLabels[facility.lastInspectionResult]}
            </Badge>
          )}
        </div>
        <div className="text-sm text-text-muted mt-1">
          {facility.city}, {facility.state}, {facility.country}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            TFM: {facility.testFacilityManagementName}
          </span>
          {facility.speciesCapabilities.length > 0 && (
            <span>
              {facility.speciesCapabilities.length} species
            </span>
          )}
          {facility.animalCapacity && (
            <span>Capacity: {facility.animalCapacity.toLocaleString()}</span>
          )}
          <span>{facility.capabilities.length} study types</span>
        </div>
      </div>
      
      {/* Equipment / Calibration */}
      <div className="text-center w-32">
        <div className="text-xs text-text-muted mb-1">Calibration</div>
        <div className={`text-lg font-bold ${
          facility.calibrationCompliance >= 95 ? 'text-green-400' :
          facility.calibrationCompliance >= 90 ? 'text-amber-400' :
          'text-red-400'
        }`}>
          {facility.calibrationCompliance}%
        </div>
        <div className="text-xs text-text-muted">{facility.equipmentCount} equipment</div>
      </div>
      
      {/* Active Studies */}
      <div className="text-center w-24">
        <div className="text-xs text-text-muted mb-1">Active Studies</div>
        <div className="text-lg font-bold text-text-primary">{facility.activeStudyCount}</div>
      </div>
      
      {/* Certification Expiry */}
      <div className="text-right w-32">
        {facility.certificationExpiryDate ? (
          <>
            <div className="text-xs text-text-muted">Cert Expires</div>
            <div className={`text-sm ${isExpiringSoon ? 'text-amber-400' : 'text-text-secondary'}`}>
              {new Date(facility.certificationExpiryDate).toLocaleDateString()}
            </div>
            {monthsUntilExpiry !== null && (
              <div className={`text-xs ${isExpiringSoon ? 'text-amber-400' : 'text-text-muted'}`}>
                {monthsUntilExpiry} months
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-text-muted">Not certified</div>
        )}
      </div>
      
      <ChevronRight className="w-5 h-5 text-text-muted" />
    </div>
  );
}

// ============================================================================
// FACILITIES TAB COMPONENT
// ============================================================================

function FacilitiesTab({ 
  facilities, 
  searchQuery,
  onSelectFacility 
}: { 
  facilities: GLPTestFacility[];
  searchQuery: string;
  onSelectFacility: (id: string) => void;
}) {
  const [typeFilter, setTypeFilter] = useState<FacilityType | 'all'>('all');
  
  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter(facility => {
      // Type filter
      if (typeFilter !== 'all' && facility.type !== typeFilter) return false;
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          facility.name.toLowerCase().includes(q) ||
          facility.code.toLowerCase().includes(q) ||
          facility.city.toLowerCase().includes(q) ||
          facility.testFacilityManagementName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [facilities, typeFilter, searchQuery]);
  
  // Stats
  const internalCount = facilities.filter(f => f.type === 'internal').length;
  const croCount = facilities.filter(f => f.type === 'cro').length;
  const contractorCount = facilities.filter(f => f.type === 'contractor').length;
  const totalActiveStudies = facilities.reduce((sum, f) => sum + f.activeStudyCount, 0);
  const avgCalibration = Math.round(
    facilities.reduce((sum, f) => sum + f.calibrationCompliance, 0) / facilities.length
  );
  
  // Type counts
  const typeCounts: Record<string, number> = {
    'all': facilities.length,
    'internal': internalCount,
    'cro': croCount,
    'contractor': contractorCount,
  };
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="text-2xl font-bold text-text-primary">{facilities.length}</div>
          <div className="text-sm text-text-secondary">Total Facilities</div>
        </div>
        <div className="bg-surface-card border border-green-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{internalCount}</div>
          <div className="text-sm text-text-secondary">Internal</div>
        </div>
        <div className="bg-surface-card border border-blue-600/50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{totalActiveStudies}</div>
          <div className="text-sm text-text-secondary">Active Studies</div>
        </div>
        <div className={`bg-surface-card border rounded-lg p-4 ${
          avgCalibration >= 95 ? 'border-green-600/50' : 'border-amber-600/50'
        }`}>
          <div className={`text-2xl font-bold ${avgCalibration >= 95 ? 'text-green-400' : 'text-amber-400'}`}>
            {avgCalibration}%
          </div>
          <div className="text-sm text-text-secondary">Avg Calibration</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Type:</span>
          <div className="flex gap-1">
            {[
              { value: 'all', label: 'All' },
              { value: 'internal', label: 'Internal' },
              { value: 'cro', label: 'CRO' },
              { value: 'contractor', label: 'Contractor' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setTypeFilter(opt.value as FacilityType | 'all')}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  typeFilter === opt.value
                    ? opt.value === 'internal' ? 'bg-green-500 text-white' :
                      opt.value === 'cro' ? 'bg-blue-500 text-white' :
                      opt.value === 'contractor' ? 'bg-amber-500 text-white' :
                      'bg-amber-500 text-white'
                    : 'bg-surface-elevated text-text-secondary hover:bg-surface-hover'
                }`}
              >
                {opt.label}
                {typeCounts[opt.value] !== undefined && (
                  <span className="ml-1 opacity-70">({typeCounts[opt.value]})</span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex-1" />
        
        <div className="text-sm text-text-muted">
          Showing {filteredFacilities.length} of {facilities.length} facilities
        </div>
      </div>
      
      {/* Facilities List */}
      {filteredFacilities.length === 0 ? (
        <EmptyState
          icon={<Building className="w-12 h-12" />}
          title="No facilities found"
          description={searchQuery ? "Try adjusting your search or filters" : "No facilities match the current filters"}
        />
      ) : (
        <div className="space-y-3">
          {filteredFacilities.map(facility => (
            <FacilityRow 
              key={facility.id} 
              facility={facility}
              onView={() => onSelectFacility(facility.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GLPScreen() {
  const { deadClick } = useDeadClick();
  const [activeTab, setActiveTab] = useState<GLPTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [selectedDeviationId, setSelectedDeviationId] = useState<string | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const toast = useToast();
  const setActiveModule = useAppStore(s => s.setActiveModule);
  
  // For now, use mock data; store integration comes with data population
  const metrics = mockMetrics;
  const actionItems = mockActionItems;
  const studies = mockStudies;
  const deviations = mockDeviations;
  const audits = mockAudits;
  const archives = mockArchives;
  const personnel = mockPersonnel;
  const facilities = mockFacilities;
  
  return (
    <div className="h-full flex flex-col">
      <ScreenHeader
        moduleId="glp"
        title="GLP Compliance"
        subtitle="21 CFR Part 58 Good Laboratory Practice — nonclinical study management and compliance"
        icon={<Shield className="w-5 h-5" />}
        badge={{ label: "21 CFR Part 58", color: "amber" }}
        actions={
          <div className="flex items-center gap-3">
            <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search studies, deviations..." className="w-64" />
            <CapabilityGate moduleId="glp" capability="author" inline>
              <Button variant="primary" onClick={() => toast.success('GLP record updated — audit trail entry created')}>
                <Plus className="w-4 h-4 mr-2" />
                New Study
              </Button>
            </CapabilityGate>
          </div>
        }
      >
        <div className="flex items-center gap-1 overflow-x-auto -mb-3">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-surface-card text-text-primary border-b-2 border-amber-500'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-card'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'dashboard' && (
          <DashboardTab metrics={metrics} actionItems={actionItems} />
        )}
        {activeTab === 'studies' && (
          <StudiesTab 
            studies={studies} 
            searchQuery={searchQuery}
            onSelectStudy={(id) => {
              setSelectedStudyId(id);
              /* Selected study */
            }}
          />
        )}
        {activeTab === 'deviations' && (
          <DeviationsTab 
            deviations={deviations}
            searchQuery={searchQuery}
            onSelectDeviation={(id) => {
              setSelectedDeviationId(id);
              /* Selected deviation */
            }}
          />
        )}
        {activeTab === 'audits' && (
          <AuditsTab 
            audits={audits}
            searchQuery={searchQuery}
            onSelectAudit={(id) => {
              setSelectedAuditId(id);
              /* Selected audit */
            }}
          />
        )}
        {activeTab === 'personnel' && (
          <PersonnelTab 
            personnel={personnel}
            searchQuery={searchQuery}
            onSelectPersonnel={(id) => {
              setSelectedPersonnelId(id);
              /* Selected personnel */
            }}
          />
        )}
        {activeTab === 'archives' && (
          <ArchivesTab 
            archives={archives}
            searchQuery={searchQuery}
            onSelectArchive={(id) => {
              setSelectedArchiveId(id);
              /* Selected archive */
            }}
          />
        )}
        {activeTab === 'facilities' && (
          <FacilitiesTab 
            facilities={facilities}
            searchQuery={searchQuery}
            onSelectFacility={(id) => {
              setSelectedFacilityId(id);
              /* Selected facility */
            }}
          />
        )}
        {activeTab === 'edc-integration' && (
          <GLPEDCIntegrationTab studies={studies} />
        )}
      </div>
    </div>
  );
}

export default GLPScreen;
