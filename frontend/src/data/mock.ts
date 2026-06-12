import { Product, Study, Submission, Registration, HAQ, Alert, Document } from '@/types/core';

// PRODUCTS - 24 products with brand names
export const products: Product[] = [
  { id: 'nexagen', name: 'LIG-HCC-301', brandName: 'NEXAGEN', genericName: 'nexafenib', therapeuticArea: 'Oncology', modality: 'Small Molecule', stage: 'NDA Filed', indication: 'Hepatocellular Carcinoma (HCC)' },
  { id: 'lig-2847', name: 'LIG-2847', brandName: 'Nexavant', genericName: 'ligrastinib', therapeuticArea: 'Oncology', modality: 'Small Molecule', stage: 'NDA Filed', indication: 'KRAS G12C+ NSCLC' },
  { id: 'lig-2848', name: 'LIG-2848', brandName: 'Nexavant CRC', genericName: 'ligrastinib', therapeuticArea: 'Oncology', modality: 'Small Molecule', stage: 'Phase 3', indication: 'KRAS G12C+ CRC (sNDA)' },
  { id: 'lig-3156', name: 'LIG-3156', brandName: 'Melnorix', genericName: 'ligorafenib', therapeuticArea: 'Oncology', modality: 'Small Molecule', stage: 'Phase 2', indication: 'BRAF V600E+ Melanoma' },
  { id: 'lig-4012', name: 'LIG-4012', brandName: 'Exontib', genericName: 'ligotinib', therapeuticArea: 'Oncology', modality: 'Small Molecule', stage: 'Phase 1', indication: 'EGFR Exon 20 NSCLC' },
  { id: 'lig-4055', name: 'LIG-4055', brandName: 'Pancrastinib', genericName: 'ligrastinib-d', therapeuticArea: 'Oncology', modality: 'Small Molecule', stage: 'Preclinical', indication: 'KRAS G12D+ Pancreatic Cancer' },
  { id: 'lig-1182', name: 'LIG-1182', brandName: 'Oncorix', genericName: 'ligamab', therapeuticArea: 'Oncology', modality: 'Monoclonal Antibody', stage: 'BLA Filed', indication: 'HER2+ Breast Cancer' },
  { id: 'lig-1205', name: 'LIG-1205', brandName: 'Lymphocel', genericName: 'ligrelimab', therapeuticArea: 'Oncology', modality: 'Bispecific Antibody', stage: 'Phase 2', indication: 'CD3xCD20 B-cell Lymphoma' },
  { id: 'lig-1340', name: 'LIG-1340', brandName: 'Troparix', genericName: 'ligatuzumab vedotin', therapeuticArea: 'Oncology', modality: 'ADC', stage: 'Phase 1', indication: 'Trop-2+ Solid Tumors' },
  { id: 'lig-3021', name: 'LIG-3021', brandName: 'Rheumaclar', genericName: 'ligatinib', therapeuticArea: 'Immunology', modality: 'Small Molecule', stage: 'Approved', indication: 'Rheumatoid Arthritis' },
  { id: 'lig-3022', name: 'LIG-3022', brandName: 'Rheumaclar PsA', genericName: 'ligatinib', therapeuticArea: 'Immunology', modality: 'Small Molecule', stage: 'sNDA Filed', indication: 'Psoriatic Arthritis (sNDA)' },
  { id: 'lig-3089', name: 'LIG-3089', brandName: 'Dermala', genericName: 'ligalizumab', therapeuticArea: 'Immunology', modality: 'Monoclonal Antibody', stage: 'Phase 3', indication: 'Atopic Dermatitis' },
  { id: 'lig-3145', name: 'LIG-3145', brandName: 'Colonix', genericName: 'ligamod', therapeuticArea: 'Immunology', modality: 'Small Molecule', stage: 'Phase 2', indication: 'Ulcerative Colitis' },
  { id: 'lig-4455', name: 'LIG-4455', brandName: 'Cognivex', genericName: 'ligneurin', therapeuticArea: 'Neurology', modality: 'Small Molecule', stage: 'Phase 2', indication: 'Alzheimers Disease' },
  { id: 'lig-4501', name: 'LIG-4501', brandName: 'Parkinel', genericName: 'ligaparin', therapeuticArea: 'Neurology', modality: 'Small Molecule', stage: 'Phase 3', indication: 'Parkinsons Disease' },
  { id: 'lig-4602', name: 'LIG-4602', brandName: 'Migrela', genericName: 'ligamigran', therapeuticArea: 'Neurology', modality: 'Small Molecule', stage: 'NDA Filed', indication: 'Chronic Migraine' },
  { id: 'lig-5500', name: 'LIG-5500', brandName: 'Spinagen', genericName: 'ligasiran', therapeuticArea: 'Rare Disease', modality: 'Gene Therapy', stage: 'BLA Filed', indication: 'Spinal Muscular Atrophy' },
  { id: 'lig-5567', name: 'LIG-5567', brandName: 'Fabrazyme-L', genericName: 'ligenzyme', therapeuticArea: 'Rare Disease', modality: 'Enzyme Replacement', stage: 'Approved', indication: 'Fabry Disease' },
  { id: 'lig-5601', name: 'LIG-5601', brandName: 'Ureaclear', genericName: 'ligasome', therapeuticArea: 'Rare Disease', modality: 'mRNA Therapy', stage: 'Phase 1/2', indication: 'OTC Deficiency' },
  { id: 'lig-6100', name: 'LIG-6100', brandName: 'Cardiostat', genericName: 'ligastatin', therapeuticArea: 'Cardiology', modality: 'Small Molecule', stage: 'Approved', indication: 'Hypercholesterolemia' },
  { id: 'lig-6101', name: 'LIG-6101', brandName: 'Cardiostat Peds', genericName: 'ligastatin', therapeuticArea: 'Cardiology', modality: 'Small Molecule', stage: 'sNDA Filed', indication: 'HeFH Pediatric (sNDA)' },
  { id: 'lig-6250', name: 'LIG-6250', brandName: 'Pressova', genericName: 'ligapressol', therapeuticArea: 'Cardiology', modality: 'Small Molecule', stage: 'Phase 3', indication: 'Resistant Hypertension' },
  { id: 'lig-7001', name: 'LIG-7001', brandName: 'Hepacure', genericName: 'ligavir', therapeuticArea: 'Infectious Disease', modality: 'Small Molecule', stage: 'Approved', indication: 'Hepatitis B' },
  { id: 'lig-7050', name: 'LIG-7050', brandName: 'Fungaclear', genericName: 'ligafung', therapeuticArea: 'Infectious Disease', modality: 'Small Molecule', stage: 'Phase 3', indication: 'Invasive Aspergillosis' },
];

// APPLICATIONS - 30 regulatory applications
export interface Application {
  id: string;
  productId: string;
  applicationNumber: string;
  type: 'IND' | 'NDA' | 'BLA' | 'sNDA' | 'sBLA' | 'ANDA' | 'MAA' | 'CTA' | 'JNDA' | 'NDS';
  region: string;
  agency: string;
  status: 'Active' | 'Submitted' | 'Under Review' | 'Approved' | 'CRL' | 'Withdrawn';
  submissionDate?: string;
  approvalDate?: string;
  pdfuaDate?: string;
  currentSequence: number;
  totalSequences: number;
}

export const applications: Application[] = [
  { id: 'app-001', productId: 'lig-2847', applicationNumber: 'IND 123456', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2021-03-15', currentSequence: 24, totalSequences: 24 },
  { id: 'app-002', productId: 'lig-2847', applicationNumber: 'NDA 215847', type: 'NDA', region: 'US', agency: 'FDA', status: 'Under Review', submissionDate: '2024-06-15', pdfuaDate: '2025-02-15', currentSequence: 3, totalSequences: 3 },
  { id: 'app-003', productId: 'lig-2847', applicationNumber: 'EMEA/H/C/006123', type: 'MAA', region: 'EU', agency: 'EMA', status: 'Under Review', submissionDate: '2024-07-01', currentSequence: 2, totalSequences: 2 },
  { id: 'app-004', productId: 'lig-2847', applicationNumber: 'JNDA 30100123', type: 'JNDA', region: 'Japan', agency: 'PMDA', status: 'Approved', submissionDate: '2024-11-15', currentSequence: 1, totalSequences: 1 },
  { id: 'app-005', productId: 'lig-2847', applicationNumber: 'CTA 2021-001234', type: 'CTA', region: 'EU', agency: 'EMA', status: 'Active', submissionDate: '2021-06-01', currentSequence: 18, totalSequences: 18 },
  { id: 'app-006', productId: 'lig-2848', applicationNumber: 'sNDA 215847-S001', type: 'sNDA', region: 'US', agency: 'FDA', status: 'Approved', submissionDate: '2024-12-01', currentSequence: 1, totalSequences: 1 },
  { id: 'app-007', productId: 'lig-1182', applicationNumber: 'IND 134567', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2020-09-01', currentSequence: 31, totalSequences: 31 },
  { id: 'app-008', productId: 'lig-1182', applicationNumber: 'BLA 761234', type: 'BLA', region: 'US', agency: 'FDA', status: 'Under Review', submissionDate: '2024-08-15', pdfuaDate: '2025-04-15', currentSequence: 2, totalSequences: 2 },
  { id: 'app-009', productId: 'lig-1182', applicationNumber: 'EMEA/H/C/006250', type: 'MAA', region: 'EU', agency: 'EMA', status: 'Under Review', submissionDate: '2024-09-01', currentSequence: 1, totalSequences: 1 },
  { id: 'app-010', productId: 'lig-3021', applicationNumber: 'IND 112233', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2019-01-15', currentSequence: 42, totalSequences: 42 },
  { id: 'app-011', productId: 'lig-3021', applicationNumber: 'NDA 214500', type: 'NDA', region: 'US', agency: 'FDA', status: 'Approved', submissionDate: '2023-03-01', approvalDate: '2024-01-15', currentSequence: 8, totalSequences: 8 },
  { id: 'app-012', productId: 'lig-3021', applicationNumber: 'EMEA/H/C/005890', type: 'MAA', region: 'EU', agency: 'EMA', status: 'Approved', submissionDate: '2023-04-15', approvalDate: '2024-03-20', currentSequence: 6, totalSequences: 6 },
  { id: 'app-013', productId: 'lig-3021', applicationNumber: 'JNDA 30090045', type: 'JNDA', region: 'Japan', agency: 'PMDA', status: 'Approved', submissionDate: '2023-06-01', approvalDate: '2024-06-15', currentSequence: 5, totalSequences: 5 },
  { id: 'app-014', productId: 'lig-3022', applicationNumber: 'sNDA 214500-S001', type: 'sNDA', region: 'US', agency: 'FDA', status: 'Under Review', submissionDate: '2024-09-15', pdfuaDate: '2025-05-15', currentSequence: 2, totalSequences: 2 },
  { id: 'app-015', productId: 'lig-4602', applicationNumber: 'IND 145678', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2020-06-15', currentSequence: 28, totalSequences: 28 },
  { id: 'app-016', productId: 'lig-4602', applicationNumber: 'NDA 216100', type: 'NDA', region: 'US', agency: 'FDA', status: 'Under Review', submissionDate: '2024-10-01', pdfuaDate: '2025-06-01', currentSequence: 1, totalSequences: 1 },
  { id: 'app-017', productId: 'lig-5500', applicationNumber: 'IND 156789', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2021-01-15', currentSequence: 19, totalSequences: 19 },
  { id: 'app-018', productId: 'lig-5500', applicationNumber: 'BLA 761567', type: 'BLA', region: 'US', agency: 'FDA', status: 'Under Review', submissionDate: '2024-07-15', pdfuaDate: '2025-03-15', currentSequence: 2, totalSequences: 2 },
  { id: 'app-019', productId: 'lig-5567', applicationNumber: 'BLA 761100', type: 'BLA', region: 'US', agency: 'FDA', status: 'Approved', submissionDate: '2022-06-01', approvalDate: '2023-04-15', currentSequence: 12, totalSequences: 12 },
  { id: 'app-020', productId: 'lig-5567', applicationNumber: 'EMEA/H/C/005500', type: 'MAA', region: 'EU', agency: 'EMA', status: 'Approved', submissionDate: '2022-08-01', approvalDate: '2023-08-20', currentSequence: 9, totalSequences: 9 },
  { id: 'app-021', productId: 'lig-6100', applicationNumber: 'NDA 213200', type: 'NDA', region: 'US', agency: 'FDA', status: 'Approved', submissionDate: '2021-03-15', approvalDate: '2022-01-20', currentSequence: 18, totalSequences: 18 },
  { id: 'app-022', productId: 'lig-6100', applicationNumber: 'EMEA/H/C/005200', type: 'MAA', region: 'EU', agency: 'EMA', status: 'Approved', submissionDate: '2021-05-01', approvalDate: '2022-04-15', currentSequence: 15, totalSequences: 15 },
  { id: 'app-023', productId: 'lig-6101', applicationNumber: 'sNDA 213200-S002', type: 'sNDA', region: 'US', agency: 'FDA', status: 'Approved', submissionDate: '2024-11-01', currentSequence: 1, totalSequences: 1 },
  { id: 'app-024', productId: 'lig-7001', applicationNumber: 'NDA 212500', type: 'NDA', region: 'US', agency: 'FDA', status: 'Approved', submissionDate: '2020-09-15', approvalDate: '2021-07-20', currentSequence: 22, totalSequences: 22 },
  { id: 'app-025', productId: 'lig-1205', applicationNumber: 'IND 167890', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2023-03-01', currentSequence: 8, totalSequences: 8 },
  { id: 'app-026', productId: 'lig-1340', applicationNumber: 'IND 178901', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2024-01-15', currentSequence: 4, totalSequences: 4 },
  { id: 'app-027', productId: 'lig-3089', applicationNumber: 'IND 156000', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2022-06-01', currentSequence: 15, totalSequences: 15 },
  { id: 'app-028', productId: 'lig-3145', applicationNumber: 'IND 162345', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2023-09-15', currentSequence: 6, totalSequences: 6 },
  { id: 'app-029', productId: 'lig-4455', applicationNumber: 'IND 159876', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2023-01-15', currentSequence: 9, totalSequences: 9 },
  { id: 'app-030', productId: 'lig-4501', applicationNumber: 'IND 163456', type: 'IND', region: 'US', agency: 'FDA', status: 'Active', submissionDate: '2022-03-01', currentSequence: 14, totalSequences: 14 },
];

// SEQUENCES
export interface Sequence {
  id: string;
  applicationId: string;
  sequenceNumber: string;
  type: 'original' | 'amendment' | 'supplement' | 'ir-response' | 'annual-report' | 'safety-report' | 'labeling' | 'psur' | 'rmp';
  description: string;
  submissionDate: string;
  status: 'draft' | 'qc' | 'submitted' | 'acknowledged' | 'under-review';
}

export const sequences: Sequence[] = [
  { id: 'seq-001', applicationId: 'app-002', sequenceNumber: '0000', type: 'original', description: 'Original NDA Submission', submissionDate: '2024-06-15', status: 'under-review' },
  { id: 'seq-002', applicationId: 'app-002', sequenceNumber: '0001', type: 'ir-response', description: 'Day 74 IR Response - CMC', submissionDate: '2024-09-20', status: 'under-review' },
  { id: 'seq-003', applicationId: 'app-002', sequenceNumber: '0002', type: 'ir-response', description: 'Day 74 IR Response - Clinical', submissionDate: '2024-10-15', status: 'acknowledged' },
  { id: 'seq-004', applicationId: 'app-002', sequenceNumber: '0003', type: 'safety-report', description: 'IND Safety Report', submissionDate: '2024-11-28', status: 'submitted' },
  { id: 'seq-005', applicationId: 'app-008', sequenceNumber: '0000', type: 'original', description: 'Original BLA Submission', submissionDate: '2024-08-15', status: 'under-review' },
  { id: 'seq-006', applicationId: 'app-008', sequenceNumber: '0001', type: 'ir-response', description: 'Day 60 IR Response - CMC', submissionDate: '2024-11-01', status: 'acknowledged' },
  { id: 'seq-007', applicationId: 'app-011', sequenceNumber: '0006', type: 'annual-report', description: 'Annual Report Year 1', submissionDate: '2024-01-15', status: 'acknowledged' },
  { id: 'seq-008', applicationId: 'app-011', sequenceNumber: '0007', type: 'labeling', description: 'CBE-30 Label Update', submissionDate: '2024-06-20', status: 'acknowledged' },
  { id: 'seq-009', applicationId: 'app-011', sequenceNumber: '0008', type: 'psur', description: 'PSUR #1', submissionDate: '2024-07-15', status: 'acknowledged' },
  { id: 'seq-010', applicationId: 'app-022', sequenceNumber: '0013', type: 'psur', description: 'PSUR #4 (DLP: Jun 2024)', submissionDate: '2024-09-15', status: 'under-review' },
  { id: 'seq-011', applicationId: 'app-022', sequenceNumber: '0014', type: 'rmp', description: 'RMP Version 5.0 Update', submissionDate: '2024-10-01', status: 'under-review' },
  { id: 'seq-012', applicationId: 'app-022', sequenceNumber: '0015', type: 'labeling', description: 'Type II Variation - SmPC', submissionDate: '2024-11-15', status: 'submitted' },
  { id: 'seq-013', applicationId: 'app-014', sequenceNumber: '0000', type: 'supplement', description: 'sNDA - PsA Indication', submissionDate: '2024-09-15', status: 'under-review' },
  { id: 'seq-014', applicationId: 'app-014', sequenceNumber: '0001', type: 'ir-response', description: 'IR Response - Efficacy Data', submissionDate: '2024-12-01', status: 'submitted' },
];

// CORRESPONDENCE
export interface Correspondence {
  id: string;
  applicationId: string;
  type: 'ir' | 'crl' | 'approval' | 'rfi' | 'meeting-request' | 'meeting-minutes' | 'safety-query' | 'acknowledgment' | 'discipline-review' | 'ai';
  direction: 'incoming' | 'outgoing';
  subject: string;
  date: string;
  dueDate?: string;
  status: 'open' | 'in-progress' | 'responded' | 'closed';
  questionCount?: number;
  assignee?: string;
  category?: string;
}

export const correspondence: Correspondence[] = [
  { id: 'corr-001', applicationId: 'app-002', type: 'acknowledgment', direction: 'incoming', subject: 'NDA 215847 Filing Acknowledgment', date: '2024-06-20', status: 'closed' },
  { id: 'corr-002', applicationId: 'app-002', type: 'ir', direction: 'incoming', subject: 'Day 74 Information Request Letter', date: '2024-08-28', dueDate: '2024-09-27', status: 'responded', questionCount: 47, category: 'CMC/Clinical' },
  { id: 'corr-003', applicationId: 'app-002', type: 'discipline-review', direction: 'incoming', subject: 'Clinical Pharmacology Review Complete', date: '2024-10-15', status: 'closed' },
  { id: 'corr-004', applicationId: 'app-002', type: 'ir', direction: 'incoming', subject: 'Late-Cycle Meeting Request', date: '2024-11-20', dueDate: '2024-12-20', status: 'in-progress', questionCount: 8, assignee: 'Jennifer Walsh', category: 'Clinical' },
  { id: 'corr-005', applicationId: 'app-002', type: 'safety-query', direction: 'incoming', subject: 'Hepatotoxicity Signal Query', date: '2024-12-05', dueDate: '2024-12-19', status: 'in-progress', questionCount: 5, assignee: 'Lisa Park', category: 'Safety' },
  { id: 'corr-006', applicationId: 'app-002', type: 'ai', direction: 'incoming', subject: 'Advisory Committee Scheduled', date: '2024-12-12', status: 'closed' },
  { id: 'corr-007', applicationId: 'app-003', type: 'acknowledgment', direction: 'incoming', subject: 'MAA Validation Complete', date: '2024-07-20', status: 'closed' },
  { id: 'corr-008', applicationId: 'app-003', type: 'ir', direction: 'incoming', subject: 'Day 80 List of Questions', date: '2024-09-25', dueDate: '2024-12-25', status: 'in-progress', questionCount: 156, category: 'All Disciplines' },
  { id: 'corr-009', applicationId: 'app-008', type: 'acknowledgment', direction: 'incoming', subject: 'BLA 761234 Filing Acknowledgment', date: '2024-08-20', status: 'closed' },
  { id: 'corr-010', applicationId: 'app-008', type: 'ir', direction: 'incoming', subject: 'Day 60 Information Request', date: '2024-10-15', dueDate: '2024-11-15', status: 'responded', questionCount: 32, category: 'CMC' },
  { id: 'corr-011', applicationId: 'app-011', type: 'approval', direction: 'incoming', subject: 'NDA 214500 Approval Letter', date: '2024-01-15', status: 'closed' },
  { id: 'corr-012', applicationId: 'app-011', type: 'rfi', direction: 'incoming', subject: 'PMC Status Request', date: '2024-07-01', dueDate: '2024-07-31', status: 'responded' },
  { id: 'corr-013', applicationId: 'app-014', type: 'acknowledgment', direction: 'incoming', subject: 'sNDA Filing Acknowledgment', date: '2024-09-20', status: 'closed' },
  { id: 'corr-014', applicationId: 'app-014', type: 'ir', direction: 'incoming', subject: 'Day 74 Information Request', date: '2024-11-28', dueDate: '2024-12-28', status: 'in-progress', questionCount: 18, assignee: 'David Kim', category: 'Clinical' },
  { id: 'corr-015', applicationId: 'app-018', type: 'acknowledgment', direction: 'incoming', subject: 'BLA 761567 Filing Acknowledgment', date: '2024-07-20', status: 'closed' },
  { id: 'corr-016', applicationId: 'app-018', type: 'ir', direction: 'incoming', subject: 'Gene Therapy Questions', date: '2024-10-01', dueDate: '2024-11-01', status: 'responded', questionCount: 24, category: 'CMC/Nonclinical' },
  { id: 'corr-017', applicationId: 'app-022', type: 'ir', direction: 'incoming', subject: 'PSUR Assessment Questions', date: '2024-11-01', dueDate: '2024-12-15', status: 'in-progress', questionCount: 12, assignee: 'Lisa Park', category: 'Safety' },
  { id: 'corr-018', applicationId: 'app-016', type: 'acknowledgment', direction: 'incoming', subject: 'NDA 216100 Filing Acknowledgment', date: '2024-10-05', status: 'closed' },
  { id: 'corr-019', applicationId: 'app-016', type: 'ir', direction: 'incoming', subject: 'Preliminary Review Questions', date: '2024-12-01', dueDate: '2025-01-15', status: 'open', questionCount: 28, category: 'Clinical/Nonclinical' },
];

// HAQs
export const haqs: HAQ[] = [
  { id: 'haq-001', submissionId: 'app-002', productId: 'lig-2847', agency: 'FDA', receivedDate: '2024-08-28', dueDate: '2024-09-27', status: 'Submitted', category: 'CMC', priority: 'High', questionCount: 23, assignee: 'Michael Roberts' },
  { id: 'haq-002', submissionId: 'app-002', productId: 'lig-2847', agency: 'FDA', receivedDate: '2024-08-28', dueDate: '2024-09-27', status: 'Submitted', category: 'Clinical', priority: 'Critical', questionCount: 24, assignee: 'Jennifer Walsh' },
  { id: 'haq-003', submissionId: 'app-002', productId: 'lig-2847', agency: 'FDA', receivedDate: '2024-11-20', dueDate: '2024-12-20', status: 'In Progress', category: 'Clinical', priority: 'High', questionCount: 8, assignee: 'Jennifer Walsh' },
  { id: 'haq-004', submissionId: 'app-002', productId: 'lig-2847', agency: 'FDA', receivedDate: '2024-12-05', dueDate: '2024-12-19', status: 'In Progress', category: 'Safety', priority: 'Critical', questionCount: 5, assignee: 'Lisa Park' },
  { id: 'haq-005', submissionId: 'app-003', productId: 'lig-2847', agency: 'EMA', receivedDate: '2024-09-25', dueDate: '2024-12-25', status: 'In Progress', category: 'Clinical', priority: 'High', questionCount: 68, assignee: 'Jennifer Walsh' },
  { id: 'haq-006', submissionId: 'app-003', productId: 'lig-2847', agency: 'EMA', receivedDate: '2024-09-25', dueDate: '2024-12-25', status: 'In Progress', category: 'CMC', priority: 'High', questionCount: 42, assignee: 'Michael Roberts' },
  { id: 'haq-007', submissionId: 'app-003', productId: 'lig-2847', agency: 'EMA', receivedDate: '2024-09-25', dueDate: '2024-12-25', status: 'In Progress', category: 'Nonclinical', priority: 'Medium', questionCount: 28, assignee: 'Sarah Chen' },
  { id: 'haq-008', submissionId: 'app-003', productId: 'lig-2847', agency: 'EMA', receivedDate: '2024-09-25', dueDate: '2024-12-25', status: 'Open', category: 'Clinical Pharmacology', priority: 'Medium', questionCount: 18 },
  { id: 'haq-009', submissionId: 'app-008', productId: 'lig-1182', agency: 'FDA', receivedDate: '2024-10-15', dueDate: '2024-11-15', status: 'Submitted', category: 'CMC', priority: 'High', questionCount: 32, assignee: 'Michael Roberts' },
  { id: 'haq-010', submissionId: 'app-014', productId: 'lig-3022', agency: 'FDA', receivedDate: '2024-11-28', dueDate: '2024-12-28', status: 'In Progress', category: 'Clinical', priority: 'High', questionCount: 18, assignee: 'David Kim' },
  { id: 'haq-011', submissionId: 'app-018', productId: 'lig-5500', agency: 'FDA', receivedDate: '2024-10-01', dueDate: '2024-11-01', status: 'Submitted', category: 'CMC', priority: 'Critical', questionCount: 15, assignee: 'James Martinez' },
  { id: 'haq-012', submissionId: 'app-018', productId: 'lig-5500', agency: 'FDA', receivedDate: '2024-10-01', dueDate: '2024-11-01', status: 'Submitted', category: 'Nonclinical', priority: 'High', questionCount: 9, assignee: 'Sarah Chen' },
  { id: 'haq-013', submissionId: 'app-022', productId: 'lig-6100', agency: 'EMA', receivedDate: '2024-11-01', dueDate: '2024-12-15', status: 'In Progress', category: 'Safety', priority: 'Medium', questionCount: 12, assignee: 'Lisa Park' },
  { id: 'haq-014', submissionId: 'app-016', productId: 'lig-4602', agency: 'FDA', receivedDate: '2024-12-01', dueDate: '2025-01-15', status: 'Open', category: 'Clinical', priority: 'High', questionCount: 16 },
  { id: 'haq-015', submissionId: 'app-016', productId: 'lig-4602', agency: 'FDA', receivedDate: '2024-12-01', dueDate: '2025-01-15', status: 'Open', category: 'Nonclinical', priority: 'Medium', questionCount: 12 },
];

// STUDIES
export const studies: Study[] = [
  { id: 'study-001', productId: 'lig-2847', name: 'LIG-2847-101', phase: 'Phase 1', indication: 'Advanced Solid Tumors', status: 'Completed', enrolledSubjects: 156, targetEnrollment: 150, activeSites: 12, tmfCompleteness: 100, startDate: '2021-06-15', estimatedCompletion: '2023-03-30' },
  { id: 'study-002', productId: 'lig-2847', name: 'LIG-2847-201', phase: 'Phase 2', indication: 'KRAS G12C+ NSCLC', status: 'Completed', enrolledSubjects: 320, targetEnrollment: 300, activeSites: 45, tmfCompleteness: 98, startDate: '2022-03-01', estimatedCompletion: '2024-01-15' },
  { id: 'study-003', productId: 'lig-2847', name: 'LIG-2847-301', phase: 'Phase 3', indication: 'KRAS G12C+ NSCLC 2L+', status: 'Completed', enrolledSubjects: 847, targetEnrollment: 800, activeSites: 120, tmfCompleteness: 96, startDate: '2022-09-15', estimatedCompletion: '2024-06-30' },
  { id: 'study-004', productId: 'lig-2847', name: 'LIG-2847-302', phase: 'Phase 3', indication: 'KRAS G12C+ NSCLC 1L', status: 'Enrolling', enrolledSubjects: 234, targetEnrollment: 600, activeSites: 85, tmfCompleteness: 89, startDate: '2024-01-15', estimatedCompletion: '2026-06-30' },
  { id: 'study-005', productId: 'lig-2848', name: 'LIG-2847-303', phase: 'Phase 3', indication: 'KRAS G12C+ CRC', status: 'Enrolling', enrolledSubjects: 445, targetEnrollment: 550, activeSites: 78, tmfCompleteness: 91, startDate: '2023-06-01', estimatedCompletion: '2025-09-30' },
  { id: 'study-006', productId: 'lig-1182', name: 'LIG-1182-101', phase: 'Phase 1', indication: 'HER2+ Solid Tumors', status: 'Completed', enrolledSubjects: 89, targetEnrollment: 85, activeSites: 15, tmfCompleteness: 100, startDate: '2020-11-01', estimatedCompletion: '2022-08-30' },
  { id: 'study-007', productId: 'lig-1182', name: 'LIG-1182-201', phase: 'Phase 2', indication: 'HER2+ Breast Cancer', status: 'Completed', enrolledSubjects: 245, targetEnrollment: 240, activeSites: 52, tmfCompleteness: 97, startDate: '2022-01-15', estimatedCompletion: '2024-02-28' },
  { id: 'study-008', productId: 'lig-1182', name: 'LIG-1182-301', phase: 'Phase 3', indication: 'HER2+ mBC 2L+', status: 'Completed', enrolledSubjects: 612, targetEnrollment: 600, activeSites: 95, tmfCompleteness: 95, startDate: '2022-06-01', estimatedCompletion: '2024-08-15' },
  { id: 'study-009', productId: 'lig-3021', name: 'LIG-3021-201', phase: 'Phase 2', indication: 'Rheumatoid Arthritis', status: 'Completed', enrolledSubjects: 312, targetEnrollment: 300, activeSites: 40, tmfCompleteness: 100, startDate: '2021-03-01', estimatedCompletion: '2022-12-31' },
  { id: 'study-010', productId: 'lig-3021', name: 'LIG-3021-301', phase: 'Phase 3', indication: 'RA MTX-IR', status: 'Completed', enrolledSubjects: 756, targetEnrollment: 750, activeSites: 110, tmfCompleteness: 99, startDate: '2022-01-15', estimatedCompletion: '2023-09-30' },
  { id: 'study-011', productId: 'lig-3022', name: 'LIG-3021-302', phase: 'Phase 3', indication: 'Psoriatic Arthritis', status: 'Completed', enrolledSubjects: 489, targetEnrollment: 480, activeSites: 72, tmfCompleteness: 98, startDate: '2022-06-01', estimatedCompletion: '2024-03-31' },
  { id: 'study-012', productId: 'lig-5500', name: 'LIG-5500-101', phase: 'Phase 1/2', indication: 'SMA Type 1', status: 'Completed', enrolledSubjects: 24, targetEnrollment: 24, activeSites: 8, tmfCompleteness: 100, startDate: '2021-06-01', estimatedCompletion: '2023-12-31' },
  { id: 'study-013', productId: 'lig-5500', name: 'LIG-5500-201', phase: 'Phase 3', indication: 'SMA Type 1', status: 'Active', enrolledSubjects: 65, targetEnrollment: 75, activeSites: 18, tmfCompleteness: 94, startDate: '2023-03-01', estimatedCompletion: '2025-06-30' },
  { id: 'study-014', productId: 'lig-3089', name: 'LIG-3089-301', phase: 'Phase 3', indication: 'Atopic Dermatitis', status: 'Enrolling', enrolledSubjects: 567, targetEnrollment: 800, activeSites: 95, tmfCompleteness: 88, startDate: '2023-09-01', estimatedCompletion: '2025-12-31' },
  { id: 'study-015', productId: 'lig-4501', name: 'LIG-4501-301', phase: 'Phase 3', indication: 'Parkinsons Disease', status: 'Enrolling', enrolledSubjects: 423, targetEnrollment: 650, activeSites: 82, tmfCompleteness: 86, startDate: '2023-06-15', estimatedCompletion: '2026-03-31' },
  { id: 'study-016', productId: 'lig-6250', name: 'LIG-6250-301', phase: 'Phase 3', indication: 'Resistant Hypertension', status: 'Enrolling', enrolledSubjects: 289, targetEnrollment: 500, activeSites: 68, tmfCompleteness: 90, startDate: '2024-01-01', estimatedCompletion: '2026-06-30' },
];

// REGISTRATIONS
export const registrations: Registration[] = [
  { id: 'reg-001', productId: 'lig-3021', country: 'United States', region: 'US', status: 'Active', approvalDate: '2024-01-15', expiryDate: '2029-01-15' },
  { id: 'reg-002', productId: 'lig-3021', country: 'Germany', region: 'EU', status: 'Active', approvalDate: '2024-03-20', expiryDate: '2029-03-20' },
  { id: 'reg-003', productId: 'lig-3021', country: 'France', region: 'EU', status: 'Active', approvalDate: '2024-03-20', expiryDate: '2029-03-20' },
  { id: 'reg-004', productId: 'lig-3021', country: 'United Kingdom', region: 'UK', status: 'Active', approvalDate: '2024-05-01', expiryDate: '2029-05-01' },
  { id: 'reg-005', productId: 'lig-3021', country: 'Japan', region: 'Japan', status: 'Active', approvalDate: '2024-06-15', expiryDate: '2029-06-15' },
  { id: 'reg-006', productId: 'lig-3021', country: 'Canada', region: 'Canada', status: 'Active', approvalDate: '2024-04-01', expiryDate: '2029-04-01', renewalDueDate: '2025-04-01' },
  { id: 'reg-007', productId: 'lig-3021', country: 'Australia', region: 'APAC', status: 'Active', approvalDate: '2024-07-15', expiryDate: '2029-07-15' },
  { id: 'reg-008', productId: 'lig-5567', country: 'United States', region: 'US', status: 'Active', approvalDate: '2023-04-15', expiryDate: '2028-04-15' },
  { id: 'reg-009', productId: 'lig-5567', country: 'EU (Centralized)', region: 'EU', status: 'Active', approvalDate: '2023-08-20', expiryDate: '2028-08-20' },
  { id: 'reg-010', productId: 'lig-5567', country: 'Japan', region: 'Japan', status: 'Active', approvalDate: '2024-01-10', expiryDate: '2029-01-10' },
  { id: 'reg-011', productId: 'lig-6100', country: 'United States', region: 'US', status: 'Active', approvalDate: '2022-01-20', expiryDate: '2027-01-20', renewalDueDate: '2025-01-20' },
  { id: 'reg-012', productId: 'lig-6100', country: 'EU (Centralized)', region: 'EU', status: 'Active', approvalDate: '2022-04-15', expiryDate: '2027-04-15' },
  { id: 'reg-013', productId: 'lig-6100', country: 'Japan', region: 'Japan', status: 'Active', approvalDate: '2022-09-01', expiryDate: '2027-09-01' },
  { id: 'reg-014', productId: 'lig-6100', country: 'China', region: 'APAC', status: 'Active', approvalDate: '2023-03-15', expiryDate: '2028-03-15' },
  { id: 'reg-015', productId: 'lig-6100', country: 'Brazil', region: 'LATAM', status: 'Active', approvalDate: '2023-06-01', expiryDate: '2028-06-01' },
  { id: 'reg-016', productId: 'lig-7001', country: 'United States', region: 'US', status: 'Active', approvalDate: '2021-07-20', expiryDate: '2026-07-20' },
  { id: 'reg-017', productId: 'lig-7001', country: 'EU (Centralized)', region: 'EU', status: 'Active', approvalDate: '2022-01-15', expiryDate: '2027-01-15' },
  { id: 'reg-018', productId: 'lig-2847', country: 'United States', region: 'US', status: 'Pending' },
  { id: 'reg-019', productId: 'lig-2847', country: 'EU (Centralized)', region: 'EU', status: 'Pending' },
  { id: 'reg-020', productId: 'lig-2847', country: 'Japan', region: 'Japan', status: 'Pending' },
  { id: 'reg-021', productId: 'lig-1182', country: 'United States', region: 'US', status: 'Pending' },
  { id: 'reg-022', productId: 'lig-1182', country: 'EU (Centralized)', region: 'EU', status: 'Pending' },
];

// DOCUMENTS
export const documents: Document[] = [
  { id: 'doc-001', productId: 'lig-2847', title: 'Clinical Overview', moduleSection: '2.5', version: '2.3', status: 'In Review', lastModified: '2024-12-10', author: 'Jennifer Walsh', wordCount: 18420 },
  { id: 'doc-002', productId: 'lig-2847', title: 'Clinical Summary - Efficacy', moduleSection: '2.7.3', version: '2.1', status: 'Approved', lastModified: '2024-11-28', author: 'Jennifer Walsh', wordCount: 32150 },
  { id: 'doc-003', productId: 'lig-2847', title: 'Clinical Summary - Safety', moduleSection: '2.7.4', version: '2.2', status: 'In Review', lastModified: '2024-12-08', author: 'Lisa Park', wordCount: 28900 },
  { id: 'doc-004', productId: 'lig-2847', title: 'Nonclinical Overview', moduleSection: '2.4', version: '1.5', status: 'Approved', lastModified: '2024-06-01', author: 'Sarah Chen', wordCount: 14200 },
  { id: 'doc-005', productId: 'lig-2847', title: 'Quality Overall Summary', moduleSection: '2.3', version: '1.8', status: 'Approved', lastModified: '2024-06-10', author: 'Michael Roberts', wordCount: 22100 },
  { id: 'doc-006', productId: 'lig-2847', title: 'Drug Substance - 3.2.S', moduleSection: '3.2.S', version: '2.0', status: 'Approved', lastModified: '2024-05-20', author: 'Michael Roberts', wordCount: 45600 },
  { id: 'doc-007', productId: 'lig-2847', title: 'Drug Product - 3.2.P', moduleSection: '3.2.P', version: '2.1', status: 'In Review', lastModified: '2024-12-05', author: 'Michael Roberts', wordCount: 38200 },
  { id: 'doc-008', productId: 'lig-2847', title: 'USPI Draft', moduleSection: '1.14', version: '0.9', status: 'Draft', lastModified: '2024-12-12', author: 'Jennifer Walsh', wordCount: 8900 },
  { id: 'doc-009', productId: 'lig-1182', title: 'Clinical Overview', moduleSection: '2.5', version: '1.2', status: 'Approved', lastModified: '2024-08-01', author: 'David Kim', wordCount: 16800 },
  { id: 'doc-010', productId: 'lig-1182', title: 'Clinical Summary - Efficacy', moduleSection: '2.7.3', version: '1.1', status: 'Approved', lastModified: '2024-07-28', author: 'David Kim', wordCount: 29400 },
  { id: 'doc-011', productId: 'lig-3021', title: 'USPI', moduleSection: '1.14', version: '1.3', status: 'Approved', lastModified: '2024-06-20', author: 'Jennifer Walsh', wordCount: 9200 },
  { id: 'doc-012', productId: 'lig-3021', title: 'PSUR #1', moduleSection: '5.3.6', version: '1.0', status: 'Approved', lastModified: '2024-07-15', author: 'Lisa Park', wordCount: 42000 },
  { id: 'doc-013', productId: 'lig-5500', title: 'Clinical Overview', moduleSection: '2.5', version: '1.0', status: 'Approved', lastModified: '2024-07-01', author: 'Emily Thompson', wordCount: 15600 },
  { id: 'doc-014', productId: 'lig-5500', title: 'Gene Therapy Module', moduleSection: '3.2.R', version: '1.2', status: 'In Review', lastModified: '2024-11-15', author: 'James Martinez', wordCount: 28900 },
];

// ALERTS
export const alerts: Alert[] = [
  { id: 'alert-001', type: 'Critical', title: 'PDUFA Date in 64 Days', description: 'LIG-2847 NDA 215847 - Advisory Committee Jan 15', entityType: 'submission', entityId: 'app-002', createdAt: '2024-12-13T08:00:00Z' },
  { id: 'alert-002', type: 'Critical', title: 'HAQ Response Due', description: 'LIG-2847 safety query response due in 6 days', entityType: 'haq', entityId: 'haq-004', createdAt: '2024-12-13T06:00:00Z' },
  { id: 'alert-003', type: 'Warning', title: 'EMA Day 80 Response', description: 'LIG-2847 MAA - 156 questions due Dec 25', entityType: 'haq', entityId: 'haq-005', createdAt: '2024-12-13T07:00:00Z' },
  { id: 'alert-004', type: 'Warning', title: 'PSUR Questions Pending', description: 'LIG-6100 PSUR assessment questions due Dec 15', entityType: 'haq', entityId: 'haq-013', createdAt: '2024-12-12T14:00:00Z' },
  { id: 'alert-005', type: 'Info', title: 'PAI Scheduled', description: 'LIG-2847 Pre-approval inspection Jan 8-10, 2025', entityType: 'submission', entityId: 'app-002', createdAt: '2024-12-10T10:00:00Z' },
  { id: 'alert-006', type: 'Info', title: 'Annual Report Due', description: 'LIG-3021 NDA annual report due Jan 15, 2025', entityType: 'submission', entityId: 'app-011', createdAt: '2024-12-08T09:00:00Z' },
  { id: 'alert-007', type: 'Warning', title: 'License Renewal', description: 'LIG-6100 US license renewal due Jan 20, 2025', entityType: 'registration', entityId: 'reg-011', createdAt: '2024-12-05T11:00:00Z' },
  { id: 'alert-008', type: 'Critical', title: 'New Safety Signal', description: 'LIG-2847 hepatotoxicity signal under evaluation', entityType: 'submission', entityId: 'sig-001', createdAt: '2024-12-11T15:00:00Z' },
];

// SUMMARY STATS
export const portfolioStats = { discovery: 8, preclinical: 6, clinical: 12, filed: 6, approved: 5, totalProducts: 22 };
export const developmentStats = { activeStudies: 16, enrolledSubjects: 4847, activeSites: 856, tmfCompleteness: 94 };
export const submissionStats = { activeINDs: 12, underReview: 8, approved: 9, totalSequences: 156 };
export const lifecycleStats = { activeLicenses: 22, renewalsDue: 3, pendingActions: 12 };

export const regionalBreakdown = [
  { region: 'North America', count: 12, color: '#10B981' },
  { region: 'Europe', count: 9, color: '#1E90FF' },
  { region: 'Asia Pacific', count: 6, color: '#7C3AED' },
  { region: 'Latin America', count: 2, color: '#F59E0B' },
  { region: 'MEA', count: 1, color: '#EC4899' },
];

// Legacy submissions export
export const submissions = applications.map(app => ({
  id: app.id,
  productId: app.productId,
  type: app.type,
  region: app.region,
  agency: app.agency,
  status: app.status === 'Under Review' ? 'In Progress' : app.status,
  targetDate: app.pdfuaDate || app.submissionDate,
  daysUntilTarget: app.pdfuaDate ? Math.ceil((new Date(app.pdfuaDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
  modulesComplete: 5,
  modulesTotal: 5,
  qcStatus: 'Passed',
  ectdStatus: 'Valid',
  sequence: app.currentSequence,
}));
