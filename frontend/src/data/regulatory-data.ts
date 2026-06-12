// ============================================================================
// Regulatory Data - v0.33.0
// Mock data for Registrations, Commitments, and Portfolio Milestones
// ============================================================================

import { Registration, RegulatoryCommitment, PortfolioMilestone } from '@/types/core';

// ============================================================================
// REGISTRATIONS
// ============================================================================

export const registrations: Registration[] = [
  // NEXAGEN (nexafenib) - Approved in US, EU, pending elsewhere
  {
    id: 'reg-nex-us',
    productId: 'nexagen',
    country: 'United States',
    region: 'US',
    status: 'Active',
    approvalDate: '2024-03-15',
    launchDate: '2024-04-01',
    expiryDate: '2029-03-15',
    licenseNumber: 'NDA 215847',
  },
  {
    id: 'reg-nex-eu',
    productId: 'nexagen',
    country: 'European Union',
    region: 'EU',
    status: 'Active',
    approvalDate: '2024-06-22',
    launchDate: '2024-09-15',
    expiryDate: '2029-06-22',
    licenseNumber: 'EU/1/24/1847/001',
  },
  {
    id: 'reg-nex-jp',
    productId: 'nexagen',
    country: 'Japan',
    region: 'Japan',
    status: 'Pending',
    renewalDueDate: '2025-04-30',
  },
  {
    id: 'reg-nex-cn',
    productId: 'nexagen',
    country: 'China',
    region: 'China',
    status: 'Pending',
  },
  {
    id: 'reg-nex-ca',
    productId: 'nexagen',
    country: 'Canada',
    region: 'US',
    status: 'Active',
    approvalDate: '2024-08-10',
    launchDate: '2024-10-01',
    expiryDate: '2029-08-10',
    licenseNumber: 'DIN 02547891',
  },
  {
    id: 'reg-nex-uk',
    productId: 'nexagen',
    country: 'United Kingdom',
    region: 'EU',
    status: 'Active',
    approvalDate: '2024-07-01',
    launchDate: '2024-09-15',
    expiryDate: '2029-07-01',
    licenseNumber: 'PLGB 12345/0001',
  },
  {
    id: 'reg-nex-au',
    productId: 'nexagen',
    country: 'Australia',
    region: 'US',
    status: 'Pending',
  },
  {
    id: 'reg-nex-br',
    productId: 'nexagen',
    country: 'Brazil',
    region: 'US',
    status: 'Pending',
  },
  
  // LIG-2847 (ligrastinib) - Earlier stage, fewer registrations
  {
    id: 'reg-lig-us',
    productId: 'lig-2847',
    country: 'United States',
    region: 'US',
    status: 'Pending',
  },
  {
    id: 'reg-lig-eu',
    productId: 'lig-2847',
    country: 'European Union',
    region: 'EU',
    status: 'Pending',
  },
  
  // LIG-1182 (ligamab) - Immunology product
  {
    id: 'reg-mab-us',
    productId: 'lig-1182',
    country: 'United States',
    region: 'US',
    status: 'Active',
    approvalDate: '2023-11-20',
    launchDate: '2024-01-15',
    expiryDate: '2028-11-20',
    licenseNumber: 'BLA 761298',
  },
  {
    id: 'reg-mab-eu',
    productId: 'lig-1182',
    country: 'European Union',
    region: 'EU',
    status: 'Active',
    approvalDate: '2024-02-14',
    launchDate: '2024-05-01',
    expiryDate: '2029-02-14',
    licenseNumber: 'EU/1/24/1812/001',
  },
  {
    id: 'reg-mab-jp',
    productId: 'lig-1182',
    country: 'Japan',
    region: 'Japan',
    status: 'Pending',
  },
];

// ============================================================================
// REGULATORY COMMITMENTS
// ============================================================================

export const regulatoryCommitments: RegulatoryCommitment[] = [
  // NEXAGEN PMCs/PMRs
  {
    id: 'cmt-nex-001',
    productId: 'nexagen',
    submissionId: 'sub-nex-nda',
    region: 'US',
    agency: 'FDA',
    type: 'PMR',
    title: 'Pediatric Study in HCC',
    description: 'Conduct a randomized, controlled clinical study to evaluate the safety and efficacy of NEXAGEN in pediatric patients aged 12-17 years with hepatocellular carcinoma.',
    category: 'Clinical',
    dueDate: '2027-03-15',
    originalDueDate: '2027-03-15',
    status: 'In Progress',
    responsibleParty: 'Dr. Sarah Chen',
    linkedStudyId: 'study-nex-ped-001',
    notes: 'Protocol submitted Q2 2024. First patient enrolled Q4 2024.',
  },
  {
    id: 'cmt-nex-002',
    productId: 'nexagen',
    submissionId: 'sub-nex-nda',
    region: 'US',
    agency: 'FDA',
    type: 'PMC',
    title: 'QTc Thorough Study',
    description: 'Conduct a thorough QT/QTc study to evaluate the effect of NEXAGEN on cardiac repolarization.',
    category: 'Clinical',
    dueDate: '2025-09-15',
    originalDueDate: '2025-09-15',
    status: 'In Progress',
    responsibleParty: 'Dr. Michael Torres',
    linkedStudyId: 'study-nex-qtc-001',
  },
  {
    id: 'cmt-nex-003',
    productId: 'nexagen',
    submissionId: 'sub-nex-nda',
    region: 'US',
    agency: 'FDA',
    type: 'PMC',
    title: 'Hepatotoxicity Registry',
    description: 'Establish and maintain a patient registry to monitor for hepatotoxicity in patients treated with NEXAGEN.',
    category: 'Safety',
    dueDate: '2025-03-15',
    originalDueDate: '2025-03-15',
    status: 'Fulfilled',
    responsibleParty: 'PV Team',
    fulfillmentDate: '2024-12-01',
    notes: 'Registry established. Annual reports ongoing.',
  },
  {
    id: 'cmt-nex-004',
    productId: 'nexagen',
    submissionId: 'sub-nex-maa',
    region: 'EU',
    agency: 'EMA',
    type: 'RMP-Measure',
    title: 'Drug Utilization Study',
    description: 'Post-authorization drug utilization study to characterize prescribing patterns in clinical practice.',
    category: 'Safety',
    dueDate: '2026-06-22',
    originalDueDate: '2026-06-22',
    status: 'Pending',
    responsibleParty: 'Real World Evidence Team',
  },
  {
    id: 'cmt-nex-005',
    productId: 'nexagen',
    submissionId: 'sub-nex-maa',
    region: 'EU',
    agency: 'EMA',
    type: 'Condition',
    title: 'Final OS Analysis',
    description: 'Submit final overall survival analysis from Study NEX-301 when data mature.',
    category: 'Clinical',
    dueDate: '2025-12-31',
    originalDueDate: '2025-12-31',
    status: 'In Progress',
    responsibleParty: 'Biostatistics',
  },
  {
    id: 'cmt-nex-006',
    productId: 'nexagen',
    submissionId: 'sub-nex-nda',
    region: 'US',
    agency: 'FDA',
    type: 'PMC',
    title: 'REMS Assessment',
    description: 'Submit REMS assessment report evaluating the effectiveness of the REMS program.',
    category: 'REMS',
    dueDate: '2025-03-15',
    originalDueDate: '2025-03-15',
    status: 'Submitted',
    responsibleParty: 'REMS Program Manager',
    fulfillmentDate: '2025-01-10',
  },
  
  // LIG-1182 Commitments
  {
    id: 'cmt-mab-001',
    productId: 'lig-1182',
    submissionId: 'sub-mab-bla',
    region: 'US',
    agency: 'FDA',
    type: 'PMR',
    title: 'Long-term Safety Extension Study',
    description: 'Conduct a 5-year open-label extension study to evaluate long-term safety of LIG-1182 in patients with rheumatoid arthritis.',
    category: 'Clinical',
    dueDate: '2028-11-20',
    originalDueDate: '2028-11-20',
    status: 'In Progress',
    responsibleParty: 'Dr. Emily Watson',
    linkedStudyId: 'study-mab-olt-001',
  },
  {
    id: 'cmt-mab-002',
    productId: 'lig-1182',
    submissionId: 'sub-mab-bla',
    region: 'US',
    agency: 'FDA',
    type: 'PMC',
    title: 'Immunogenicity Monitoring',
    description: 'Submit annual reports on immunogenicity monitoring including anti-drug antibody development rates.',
    category: 'Clinical',
    dueDate: '2025-11-20',
    originalDueDate: '2024-11-20',
    status: 'Overdue',
    responsibleParty: 'Clinical Immunology',
    notes: 'Extension requested due to assay validation delays.',
  },
  {
    id: 'cmt-mab-003',
    productId: 'lig-1182',
    submissionId: 'sub-mab-maa',
    region: 'EU',
    agency: 'EMA',
    type: 'RMP-Measure',
    title: 'Pregnancy Exposure Registry',
    description: 'Establish and maintain a pregnancy exposure registry to monitor outcomes in women exposed to LIG-1182 during pregnancy.',
    category: 'Safety',
    dueDate: '2025-02-14',
    originalDueDate: '2025-02-14',
    status: 'Fulfilled',
    responsibleParty: 'PV Team',
    fulfillmentDate: '2024-08-15',
  },
];

// ============================================================================
// PORTFOLIO MILESTONES
// ============================================================================

export const portfolioMilestones: PortfolioMilestone[] = [
  // NEXAGEN Milestones
  {
    id: 'ms-nex-jp-sub',
    productId: 'nexagen',
    submissionId: 'sub-nex-jnda',
    title: 'Japan J-NDA Submission',
    type: 'submission',
    date: '2025-02-28',
    status: 'on-track',
    region: 'Japan',
  },
  {
    id: 'ms-nex-jp-appr',
    productId: 'nexagen',
    title: 'Japan Approval (Target)',
    type: 'approval',
    date: '2025-12-31',
    status: 'planned',
    region: 'Japan',
    dependencies: ['ms-nex-jp-sub'],
  },
  {
    id: 'ms-nex-cn-sub',
    productId: 'nexagen',
    title: 'China NDA Submission',
    type: 'submission',
    date: '2025-06-30',
    status: 'on-track',
    region: 'China',
  },
  {
    id: 'ms-nex-ped-complete',
    productId: 'nexagen',
    title: 'Pediatric Study Complete',
    type: 'commitment',
    date: '2026-09-30',
    status: 'on-track',
    notes: 'PMR commitment - Study NEX-PED-001',
  },
  {
    id: 'ms-nex-snda-2l',
    productId: 'nexagen',
    title: 'sNDA 2L HCC Submission',
    type: 'submission',
    date: '2025-09-30',
    status: 'on-track',
    region: 'US',
    notes: 'Second-line indication expansion',
  },
  {
    id: 'ms-nex-launch-jp',
    productId: 'nexagen',
    title: 'Japan Commercial Launch',
    type: 'launch',
    date: '2026-03-31',
    status: 'planned',
    region: 'Japan',
    dependencies: ['ms-nex-jp-appr'],
  },
  
  // LIG-2847 Milestones
  {
    id: 'ms-lig-nda-sub',
    productId: 'lig-2847',
    title: 'US NDA Submission',
    type: 'submission',
    date: '2025-06-30',
    status: 'at-risk',
    region: 'US',
    notes: 'CMC section completion delayed',
  },
  {
    id: 'ms-lig-maa-sub',
    productId: 'lig-2847',
    title: 'EU MAA Submission',
    type: 'submission',
    date: '2025-09-30',
    status: 'on-track',
    region: 'EU',
    dependencies: ['ms-lig-nda-sub'],
  },
  {
    id: 'ms-lig-fda-meeting',
    productId: 'lig-2847',
    title: 'FDA Pre-NDA Meeting',
    type: 'review-meeting',
    date: '2025-03-15',
    status: 'complete',
    region: 'US',
  },
  
  // LIG-1182 Milestones
  {
    id: 'ms-mab-jp-sub',
    productId: 'lig-1182',
    title: 'Japan J-BLA Submission',
    type: 'submission',
    date: '2025-04-30',
    status: 'on-track',
    region: 'Japan',
  },
  {
    id: 'ms-mab-sira-sub',
    productId: 'lig-1182',
    title: 'sBLA sIRA Indication',
    type: 'submission',
    date: '2025-08-31',
    status: 'planned',
    region: 'US',
    notes: 'Systemic Idiopathic Juvenile Arthritis indication',
  },
  {
    id: 'ms-mab-var-eu',
    productId: 'lig-1182',
    title: 'EU Type II Variation (sIRA)',
    type: 'submission',
    date: '2025-11-30',
    status: 'planned',
    region: 'EU',
    dependencies: ['ms-mab-sira-sub'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getRegistrationsByProduct(productId: string): Registration[] {
  return registrations.filter(r => r.productId === productId);
}

export function getCommitmentsByProduct(productId: string): RegulatoryCommitment[] {
  return regulatoryCommitments.filter(c => c.productId === productId);
}

export function getMilestonesByProduct(productId: string): PortfolioMilestone[] {
  return portfolioMilestones.filter(m => m.productId === productId);
}

export function getOverdueCommitments(): RegulatoryCommitment[] {
  const today = new Date().toISOString().split('T')[0];
  return regulatoryCommitments.filter(c => 
    c.status !== 'Fulfilled' && c.status !== 'Released' && c.dueDate < today
  );
}

export function getUpcomingCommitments(days: number = 90): RegulatoryCommitment[] {
  const today = new Date();
  const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  const futureDateStr = futureDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  
  return regulatoryCommitments.filter(c => 
    c.status !== 'Fulfilled' && c.status !== 'Released' &&
    c.dueDate >= todayStr && c.dueDate <= futureDateStr
  );
}

export function getRegistrationMatrix(): { product: string; countries: Record<string, Registration | null> }[] {
  const products = Array.from(new Set(registrations.map(r => r.productId)));
  const countries = Array.from(new Set(registrations.map(r => r.country))).sort();
  
  return products.map(productId => {
    const productRegs = registrations.filter(r => r.productId === productId);
    const countryMap: Record<string, Registration | null> = {};
    
    countries.forEach(country => {
      countryMap[country] = productRegs.find(r => r.country === country) || null;
    });
    
    return { product: productId, countries: countryMap };
  });
}

// Product display names
export const productNames: Record<string, string> = {
  'nexagen': 'NEXAGEN (nexafenib)',
  'lig-2847': 'LIG-2847 (ligrastinib)',
  'lig-1182': 'LIG-1182 (ligamab)',
};

export const productColors: Record<string, string> = {
  'nexagen': 'blue',
  'lig-2847': 'purple',
  'lig-1182': 'emerald',
};
