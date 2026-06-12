// ============================================================================
// Medical Affairs Data - v0.5.0
// Medical Information Center: Inquiries, Response Library, Safety Signal Integration
// ============================================================================

// ============================================================================
// TYPES
// ============================================================================

export type InquiryType = 'hcp' | 'patient' | 'consumer' | 'internal';
export type InquiryStatus = 'open' | 'in-progress' | 'pending-review' | 'responded' | 'closed';
export type InquiryPriority = 'urgent' | 'high' | 'standard';
export type ResponseStatus = 'current' | 'under-review' | 'superseded' | 'draft';
export type SourceDocumentType = 'csr' | 'label' | 'publication' | 'sba' | 'protocol' | 'ib';

export interface MedicalInquiry {
  id: string;
  inquiryNumber: string;
  type: InquiryType;
  status: InquiryStatus;
  priority: InquiryPriority;
  productId: string;
  productName: string;
  topic: string;
  category: string;
  summary: string;
  fullText?: string;
  inquirerName?: string;
  inquirerCredentials?: string;
  inquirerInstitution?: string;
  inquirerEmail?: string;
  receivedDate: string;
  dueDate: string;
  respondedDate?: string;
  assignedTo: string;
  responseId?: string;
  suggestedResponseIds?: string[];
  isOverdue: boolean;
  tags?: string[];
}

export interface SourceDocument {
  id: string;
  type: SourceDocumentType;
  title: string;
  reference: string;
  section?: string;
  moduleLink?: string;
  version?: string;
  effectiveDate?: string;
}

export interface StandardResponse {
  id: string;
  responseCode: string;
  title: string;
  topic: string;
  category: string;
  productId: string;
  productName: string;
  content: string;
  summary: string;
  version: string;
  effectiveDate: string;
  expirationDate?: string;
  status: ResponseStatus;
  sourceDocuments: SourceDocument[];
  linkedSignalIds: string[];
  requiresReview: boolean;
  reviewReason?: string;
  lastReviewedDate?: string;
  lastReviewedBy?: string;
  approvedBy?: string;
  approvedDate?: string;
  usageCount: number;
  tags?: string[];
}

export interface SignalImpact {
  signalId: string;
  signalCode: string;
  signalTitle: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedResponseCount: number;
  affectedResponses: string[];
  affectedInquiryCount: number;
  affectedInquiries: string[];
  detectedDate: string;
  status: 'under-review' | 'confirmed' | 'refuted' | 'closed';
  productId: string;
  productName: string;
  recommendedAction?: string;
  reviewDeadline?: string;
}

export interface InquiryTimelineEntry {
  id: string;
  inquiryId: string;
  timestamp: string;
  action: string;
  actor: string;
  details?: string;
  newStatus?: InquiryStatus;
}

export interface ResponseUsageRecord {
  id: string;
  responseId: string;
  inquiryId: string;
  usedDate: string;
  usedBy: string;
  modifications?: string;
}

// ============================================================================
// LABELS
// ============================================================================

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  'hcp': 'Healthcare Professional',
  'patient': 'Patient/Caregiver',
  'consumer': 'Consumer',
  'internal': 'Internal',
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  'open': 'Open',
  'in-progress': 'In Progress',
  'pending-review': 'Pending Review',
  'responded': 'Responded',
  'closed': 'Closed',
};

export const INQUIRY_PRIORITY_LABELS: Record<InquiryPriority, string> = {
  'urgent': 'Urgent',
  'high': 'High',
  'standard': 'Standard',
};

export const RESPONSE_STATUS_LABELS: Record<ResponseStatus, string> = {
  'current': 'Current',
  'under-review': 'Under Review',
  'superseded': 'Superseded',
  'draft': 'Draft',
};

export const SOURCE_TYPE_LABELS: Record<SourceDocumentType, string> = {
  'csr': 'Clinical Study Report',
  'label': 'Product Label',
  'publication': 'Publication',
  'sba': 'Summary Basis of Approval',
  'protocol': 'Protocol',
  'ib': 'Investigator Brochure',
};

// ============================================================================
// TOPIC CATEGORIES
// ============================================================================

export const INQUIRY_CATEGORIES = [
  'Dosing & Administration',
  'Safety & Tolerability',
  'Drug Interactions',
  'Special Populations',
  'Efficacy & Clinical Data',
  'Mechanism of Action',
  'Storage & Handling',
  'Contraindications',
  'Adverse Events',
  'Comparative Data',
] as const;

// ============================================================================
// DEMO DATA - MEDICAL INQUIRIES
// ============================================================================

export const medicalInquiries: MedicalInquiry[] = [
  {
    id: 'mir-001',
    inquiryNumber: 'MIR-2026-0142',
    type: 'hcp',
    status: 'in-progress',
    priority: 'high',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    topic: 'Cardiac monitoring requirements',
    category: 'Safety & Tolerability',
    summary: 'Oncologist inquiring about ECG monitoring frequency and QTc prolongation management guidelines for patients on Nexavant.',
    fullText: 'I have a 68-year-old male patient with KRAS G12C+ NSCLC who I am planning to start on Nexavant. He has a history of atrial fibrillation (rate-controlled) and is currently on metoprolol. I understand there are cardiac monitoring requirements. Can you provide guidance on: 1) Baseline ECG requirements, 2) Monitoring frequency during treatment, 3) QTc thresholds for dose modification or discontinuation, and 4) Any specific concerns with concomitant beta-blocker use?',
    inquirerName: 'Dr. Robert Anderson',
    inquirerCredentials: 'MD, FACP',
    inquirerInstitution: 'Cleveland Clinic',
    inquirerEmail: 'r.anderson@ccf.org',
    receivedDate: '2026-01-02T09:15:00Z',
    dueDate: '2026-01-03T09:15:00Z',
    assignedTo: 'Dr. Jennifer Walsh',
    suggestedResponseIds: ['sr-002', 'sr-005'],
    isOverdue: false,
    tags: ['cardiac', 'monitoring', 'QTc', 'drug-interaction'],
  },
  {
    id: 'mir-002',
    inquiryNumber: 'MIR-2026-0143',
    type: 'patient',
    status: 'open',
    priority: 'standard',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    topic: 'Dosing with food',
    category: 'Dosing & Administration',
    summary: 'Patient asking whether Nexavant should be taken with or without food, and if there are any dietary restrictions.',
    inquirerName: 'Margaret Thompson',
    receivedDate: '2026-01-02T11:30:00Z',
    dueDate: '2026-01-04T11:30:00Z',
    assignedTo: 'Sarah Mitchell',
    suggestedResponseIds: ['sr-001'],
    isOverdue: false,
    tags: ['dosing', 'food', 'administration'],
  },
  {
    id: 'mir-003',
    inquiryNumber: 'MIR-2026-0144',
    type: 'hcp',
    status: 'responded',
    priority: 'high',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    topic: 'Drug interaction - warfarin',
    category: 'Drug Interactions',
    summary: 'Physician inquiring about potential interaction between Nexavant and warfarin, INR monitoring recommendations.',
    inquirerName: 'Dr. Lisa Chen',
    inquirerCredentials: 'PharmD, BCOP',
    inquirerInstitution: 'Johns Hopkins Hospital',
    receivedDate: '2026-01-01T14:00:00Z',
    dueDate: '2026-01-02T14:00:00Z',
    respondedDate: '2026-01-02T10:30:00Z',
    assignedTo: 'Dr. Jennifer Walsh',
    responseId: 'sr-003',
    isOverdue: false,
    tags: ['interaction', 'warfarin', 'anticoagulation'],
  },
  {
    id: 'mir-004',
    inquiryNumber: 'MIR-2026-0145',
    type: 'internal',
    status: 'in-progress',
    priority: 'standard',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    topic: 'Competitive positioning data',
    category: 'Comparative Data',
    summary: 'Medical Science Liaison requesting comparative efficacy data versus sotorasib for upcoming KOL discussion.',
    inquirerName: 'Michael Torres',
    inquirerCredentials: 'PhD',
    receivedDate: '2025-12-30T16:00:00Z',
    dueDate: '2026-01-03T16:00:00Z',
    assignedTo: 'Dr. Amanda Foster',
    isOverdue: false,
    tags: ['competitive', 'efficacy', 'sotorasib'],
  },
  {
    id: 'mir-005',
    inquiryNumber: 'MIR-2026-0146',
    type: 'hcp',
    status: 'pending-review',
    priority: 'urgent',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    topic: 'Hepatotoxicity management',
    category: 'Safety & Tolerability',
    summary: 'Urgent inquiry about Grade 2 transaminase elevation management and rechallenge guidance.',
    fullText: 'I have a patient on Nexavant who developed Grade 2 ALT elevation (4.2x ULN) at Week 4. Drug was held. LFTs have now normalized. Patient had excellent tumor response. Is rechallenge possible? If so, at what dose and with what monitoring?',
    inquirerName: 'Dr. James Rodriguez',
    inquirerCredentials: 'MD, PhD',
    inquirerInstitution: 'MD Anderson Cancer Center',
    inquirerEmail: 'jrodriguez@mdanderson.org',
    receivedDate: '2026-01-02T08:00:00Z',
    dueDate: '2026-01-02T16:00:00Z',
    assignedTo: 'Dr. Jennifer Walsh',
    suggestedResponseIds: ['sr-004'],
    isOverdue: false,
    tags: ['hepatotoxicity', 'ALT', 'rechallenge', 'dose-modification'],
  },
  {
    id: 'mir-006',
    inquiryNumber: 'MIR-2026-0147',
    type: 'consumer',
    status: 'open',
    priority: 'standard',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    topic: 'Patient assistance program',
    category: 'Dosing & Administration',
    summary: 'Consumer calling about patient assistance programs and copay support options.',
    inquirerName: 'John Williams',
    receivedDate: '2026-01-02T13:45:00Z',
    dueDate: '2026-01-05T13:45:00Z',
    assignedTo: 'Customer Support Team',
    isOverdue: false,
    tags: ['patient-assistance', 'copay', 'access'],
  },
];

// ============================================================================
// DEMO DATA - STANDARD RESPONSES
// ============================================================================

export const standardResponses: StandardResponse[] = [
  {
    id: 'sr-001',
    responseCode: 'SR-LIG2847-001',
    title: 'Dosing & Administration',
    topic: 'General dosing guidance',
    category: 'Dosing & Administration',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    summary: 'Standard response for dosing and administration questions including food effect information.',
    content: `**Recommended Dose:**
Nexavant (ligrastinib) is administered orally at 200 mg once daily until disease progression or unacceptable toxicity.

**Administration:**
- Nexavant may be taken with or without food
- Tablets should be swallowed whole; do not crush, chew, or split
- If a dose is missed, it should be taken as soon as remembered unless it is within 6 hours of the next scheduled dose
- If vomiting occurs after taking Nexavant, do not take an additional dose; take the next dose at the regularly scheduled time

**Food Effect:**
In a food effect study (Study LIG2847-103), administration of Nexavant with a high-fat meal resulted in no clinically significant changes in pharmacokinetic parameters compared to fasted conditions.

**Storage:**
Store at 20°C to 25°C (68°F to 77°F); excursions permitted to 15°C to 30°C (59°F to 86°F).`,
    version: '2.0',
    effectiveDate: '2025-11-15',
    status: 'current',
    sourceDocuments: [
      { id: 'sd-001', type: 'label', title: 'Nexavant USPI', reference: 'Section 2.1 Recommended Dosage', version: '2.0' },
      { id: 'sd-002', type: 'csr', title: 'Study LIG2847-103 Food Effect', reference: 'Section 11.2', moduleLink: '/clinical/studies/lig2847-103' },
    ],
    linkedSignalIds: [],
    requiresReview: false,
    lastReviewedDate: '2025-11-10',
    lastReviewedBy: 'Dr. Jennifer Walsh',
    approvedBy: 'Dr. Sarah Chen',
    approvedDate: '2025-11-15',
    usageCount: 147,
    tags: ['dosing', 'administration', 'food-effect'],
  },
  {
    id: 'sr-002',
    responseCode: 'SR-LIG2847-002',
    title: 'Cardiac Safety Profile - QTc Monitoring',
    topic: 'QTc prolongation and cardiac monitoring',
    category: 'Safety & Tolerability',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    summary: 'Response addressing cardiac safety, QTc monitoring requirements, and management guidelines. REQUIRES REVIEW due to active safety signal.',
    content: `**QTc Prolongation Risk:**
Nexavant can cause concentration-dependent QTc interval prolongation. In clinical trials, QTc prolongation >500 ms was observed in 1.2% of patients.

**Monitoring Recommendations:**
- Obtain ECG at baseline and periodically during treatment
- Monitor more frequently in patients with risk factors for QTc prolongation
- Correct electrolyte abnormalities (potassium, magnesium, calcium) prior to and during treatment

**Risk Factors:**
- Congenital long QT syndrome
- Concomitant medications known to prolong QT interval
- Electrolyte abnormalities
- Cardiac disease including heart failure, bradyarrhythmias

**Dose Modification for QTc Prolongation:**
- QTc 481-500 ms: Hold until ≤480 ms, then resume at same dose
- QTc >500 ms or >60 ms increase from baseline: Hold until ≤480 ms, then resume at reduced dose (150 mg)
- Recurrent QTc >500 ms: Permanently discontinue

[NOTE: This response is currently under review due to Safety Signal SIG-2026-003]`,
    version: '1.2',
    effectiveDate: '2025-09-01',
    status: 'under-review',
    sourceDocuments: [
      { id: 'sd-003', type: 'label', title: 'Nexavant USPI', reference: 'Section 5.2 QTc Prolongation', version: '2.0' },
      { id: 'sd-004', type: 'csr', title: 'Study LIG2847-301 Phase 3', reference: 'Section 12.4 Cardiac Safety', moduleLink: '/clinical/studies/lig2847-301' },
      { id: 'sd-005', type: 'publication', title: 'Rodriguez et al. JCO 2025', reference: 'Cardiac Safety Analysis', version: 'Published' },
    ],
    linkedSignalIds: ['sig-2'],
    requiresReview: true,
    reviewReason: 'Active safety signal SIG-2026-003 (QTc prolongation) under evaluation - verify current guidance aligns with latest safety data',
    lastReviewedDate: '2025-08-25',
    lastReviewedBy: 'Dr. Amanda Foster',
    approvedBy: 'Dr. Sarah Chen',
    approvedDate: '2025-09-01',
    usageCount: 89,
    tags: ['cardiac', 'QTc', 'monitoring', 'safety'],
  },
  {
    id: 'sr-003',
    responseCode: 'SR-LIG2847-003',
    title: 'Drug Interactions',
    topic: 'Drug-drug interactions and concomitant medications',
    category: 'Drug Interactions',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    summary: 'Comprehensive response on drug interactions including CYP3A4 and QT-prolonging medications.',
    content: `**CYP3A4 Interactions:**
Nexavant is primarily metabolized by CYP3A4.

*Strong CYP3A4 Inhibitors:*
- Avoid concomitant use with strong CYP3A4 inhibitors (e.g., ketoconazole, itraconazole, clarithromycin, ritonavir)
- If unavoidable, reduce Nexavant dose to 100 mg once daily

*Strong CYP3A4 Inducers:*
- Avoid concomitant use with strong CYP3A4 inducers (e.g., rifampin, phenytoin, carbamazepine, St. John's Wort)
- May significantly reduce Nexavant exposure and efficacy

**QT-Prolonging Medications:**
- Use caution when co-administering with other drugs known to prolong QTc interval
- Consider more frequent ECG monitoring

**Warfarin Interaction:**
- No formal drug interaction study conducted
- Based on in vitro data, clinically significant interaction is not expected
- Standard INR monitoring is recommended when initiating or discontinuing Nexavant in patients on warfarin

**Acid-Reducing Agents:**
- PPIs, H2 blockers: No clinically significant effect on Nexavant exposure
- No dose adjustment required`,
    version: '1.1',
    effectiveDate: '2025-10-01',
    status: 'current',
    sourceDocuments: [
      { id: 'sd-006', type: 'label', title: 'Nexavant USPI', reference: 'Section 7 Drug Interactions', version: '2.0' },
      { id: 'sd-007', type: 'csr', title: 'Study LIG2847-106 DDI Study', reference: 'Full Report', moduleLink: '/clinical/studies/lig2847-106' },
    ],
    linkedSignalIds: [],
    requiresReview: false,
    lastReviewedDate: '2025-09-25',
    lastReviewedBy: 'Dr. Jennifer Walsh',
    approvedBy: 'Dr. Sarah Chen',
    approvedDate: '2025-10-01',
    usageCount: 62,
    tags: ['interactions', 'CYP3A4', 'warfarin', 'QT'],
  },
  {
    id: 'sr-004',
    responseCode: 'SR-LIG2847-004',
    title: 'Hepatotoxicity Management',
    topic: 'Hepatotoxicity monitoring and dose modification',
    category: 'Safety & Tolerability',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    summary: 'Response addressing hepatotoxicity risk, monitoring, and dose modification guidance. REQUIRES REVIEW due to confirmed hepatotoxicity signal.',
    content: `**Hepatotoxicity Risk:**
Nexavant can cause hepatotoxicity, including Grade 3-4 transaminase elevations. In clinical trials:
- ALT elevation ≥3x ULN: 18% of patients
- AST elevation ≥3x ULN: 12% of patients
- Grade 3-4 hepatotoxicity: 5.2% of patients

**Monitoring Recommendations:**
- Obtain LFTs (ALT, AST, bilirubin) at baseline
- Monitor every 2 weeks for the first 3 months
- Monitor monthly thereafter, or as clinically indicated
- More frequent monitoring in patients with elevated baseline LFTs or risk factors

**Dose Modification for Hepatotoxicity:**

*Grade 2 (ALT/AST 3-5x ULN):*
- Continue at same dose with weekly LFT monitoring
- If not resolved within 2 weeks, hold until Grade ≤1

*Grade 3 (ALT/AST 5-20x ULN):*
- Hold until resolution to Grade ≤1
- Resume at reduced dose (150 mg)
- If Grade 3 recurs, permanently discontinue

*Grade 4 (ALT/AST >20x ULN):*
- Permanently discontinue

*ALT/AST >3x ULN with bilirubin >2x ULN:*
- Permanently discontinue (potential Hy's Law case)

**Rechallenge Considerations:**
Rechallenge may be considered in patients with Grade 2-3 hepatotoxicity after resolution to Grade ≤1, at a reduced dose with enhanced monitoring. Not recommended after Grade 4 or suspected Hy's Law.

[NOTE: This response is under review due to confirmed Safety Signal SIG-2026-001 (Hepatotoxicity)]`,
    version: '2.1',
    effectiveDate: '2025-12-01',
    status: 'under-review',
    sourceDocuments: [
      { id: 'sd-008', type: 'label', title: 'Nexavant USPI', reference: 'Section 5.1 Hepatotoxicity', version: '2.0' },
      { id: 'sd-009', type: 'csr', title: 'Study LIG2847-301 Phase 3', reference: 'Section 12.2 Hepatic Safety', moduleLink: '/clinical/studies/lig2847-301' },
      { id: 'sd-010', type: 'publication', title: 'Chen et al. Lancet Oncol 2025', reference: 'Hepatotoxicity Analysis', version: 'Published' },
    ],
    linkedSignalIds: ['sig-1'],
    requiresReview: true,
    reviewReason: 'Confirmed safety signal SIG-2026-001 (Hepatotoxicity) - CCDS update pending, verify alignment with latest recommendations',
    lastReviewedDate: '2025-11-25',
    lastReviewedBy: 'Dr. Amanda Foster',
    approvedBy: 'Dr. Sarah Chen',
    approvedDate: '2025-12-01',
    usageCount: 156,
    tags: ['hepatotoxicity', 'ALT', 'AST', 'monitoring', 'dose-modification'],
  },
  {
    id: 'sr-005',
    responseCode: 'SR-LIG2847-005',
    title: 'Special Populations - Renal Impairment',
    topic: 'Dosing in renal impairment',
    category: 'Special Populations',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    summary: 'Standard response for dosing guidance in patients with renal impairment.',
    content: `**Renal Impairment:**

*Mild Impairment (CLcr 60-89 mL/min):*
- No dose adjustment required

*Moderate Impairment (CLcr 30-59 mL/min):*
- No dose adjustment required
- Increased monitoring recommended

*Severe Impairment (CLcr 15-29 mL/min):*
- Limited data available
- Use with caution
- Consider starting at 150 mg once daily

*End-Stage Renal Disease (CLcr <15 mL/min or dialysis):*
- Not studied
- Use not recommended

**Rationale:**
Nexavant is primarily eliminated via hepatic metabolism (<5% unchanged drug excreted in urine). Population PK analysis showed no clinically significant effect of mild to moderate renal impairment on ligrastinib exposure.`,
    version: '1.0',
    effectiveDate: '2025-08-01',
    status: 'current',
    sourceDocuments: [
      { id: 'sd-011', type: 'label', title: 'Nexavant USPI', reference: 'Section 8.6 Renal Impairment', version: '2.0' },
      { id: 'sd-012', type: 'csr', title: 'Population PK Analysis', reference: 'Renal Impairment Subgroup', moduleLink: '/clinical/pk-analysis' },
    ],
    linkedSignalIds: [],
    requiresReview: false,
    lastReviewedDate: '2025-07-25',
    lastReviewedBy: 'Dr. Jennifer Walsh',
    approvedBy: 'Dr. Sarah Chen',
    approvedDate: '2025-08-01',
    usageCount: 34,
    tags: ['renal', 'special-populations', 'dosing'],
  },
  {
    id: 'sr-006',
    responseCode: 'SR-LIG2847-006',
    title: 'Interstitial Lung Disease',
    topic: 'ILD risk and monitoring',
    category: 'Safety & Tolerability',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    summary: 'Response addressing ILD/pneumonitis risk and management. Under review due to emerging signal.',
    content: `**Interstitial Lung Disease/Pneumonitis:**
ILD/pneumonitis, including fatal cases, has been reported with KRAS G12C inhibitors.

**Incidence in Clinical Trials:**
- Any grade ILD/pneumonitis: 2.8%
- Grade 3-4: 0.8%
- Fatal: 0.2%

**Monitoring:**
- Monitor for new or worsening pulmonary symptoms
- Symptoms may include dyspnea, cough, fever
- Promptly evaluate with imaging if ILD suspected

**Management:**
- Withhold Nexavant for suspected ILD pending evaluation
- Permanently discontinue for confirmed ILD of any grade
- Corticosteroids may be indicated

[NOTE: This response is under review - emerging ILD signal (SIG-2026-003) under evaluation]`,
    version: '1.1',
    effectiveDate: '2025-10-15',
    status: 'under-review',
    sourceDocuments: [
      { id: 'sd-013', type: 'label', title: 'Nexavant USPI', reference: 'Section 5.3 ILD/Pneumonitis', version: '2.0' },
      { id: 'sd-014', type: 'csr', title: 'Study LIG2847-301 Phase 3', reference: 'Section 12.5 Pulmonary Safety', moduleLink: '/clinical/studies/lig2847-301' },
    ],
    linkedSignalIds: ['sig-3'],
    requiresReview: true,
    reviewReason: 'Emerging safety signal SIG-2026-003 (ILD) under evaluation - monitor for label update requirements',
    lastReviewedDate: '2025-10-10',
    lastReviewedBy: 'Dr. Amanda Foster',
    approvedBy: 'Dr. Sarah Chen',
    approvedDate: '2025-10-15',
    usageCount: 28,
    tags: ['ILD', 'pneumonitis', 'pulmonary', 'safety'],
  },
];

// ============================================================================
// DEMO DATA - SAFETY SIGNAL IMPACTS
// ============================================================================

export const signalImpacts: SignalImpact[] = [
  {
    signalId: 'sig-1',
    signalCode: 'SIG-2026-001',
    signalTitle: 'Hepatotoxicity - Grade 3+ transaminase elevations',
    severity: 'critical',
    affectedResponseCount: 1,
    affectedResponses: ['sr-004'],
    affectedInquiryCount: 1,
    affectedInquiries: ['mir-005'],
    detectedDate: '2024-11-15',
    status: 'confirmed',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    recommendedAction: 'Review and update hepatotoxicity response to align with CCDS update recommendations',
    reviewDeadline: '2026-01-15',
  },
  {
    signalId: 'sig-2',
    signalCode: 'SIG-2026-002',
    signalTitle: 'QTc prolongation >60ms from baseline',
    severity: 'high',
    affectedResponseCount: 1,
    affectedResponses: ['sr-002'],
    affectedInquiryCount: 1,
    affectedInquiries: ['mir-001'],
    detectedDate: '2024-10-01',
    status: 'confirmed',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    recommendedAction: 'Verify cardiac monitoring guidance reflects latest clinical data',
    reviewDeadline: '2026-01-31',
  },
  {
    signalId: 'sig-3',
    signalCode: 'SIG-2026-003',
    signalTitle: 'Interstitial Lung Disease',
    severity: 'high',
    affectedResponseCount: 1,
    affectedResponses: ['sr-006'],
    affectedInquiryCount: 0,
    affectedInquiries: [],
    detectedDate: '2024-12-01',
    status: 'under-review',
    productId: 'lig-2847',
    productName: 'LIG-2847 (Nexavant)',
    recommendedAction: 'Monitor signal evaluation progress; prepare response update if signal confirmed',
    reviewDeadline: '2026-02-15',
  },
];

// ============================================================================
// DEMO DATA - INQUIRY TIMELINE (for detail view)
// ============================================================================

export const inquiryTimelines: Record<string, InquiryTimelineEntry[]> = {
  'mir-001': [
    { id: 'tl-001', inquiryId: 'mir-001', timestamp: '2026-01-02T09:15:00Z', action: 'Inquiry received', actor: 'System', details: 'Auto-routed to Medical Information queue', newStatus: 'open' },
    { id: 'tl-002', inquiryId: 'mir-001', timestamp: '2026-01-02T09:30:00Z', action: 'Assigned', actor: 'Dr. Sarah Chen', details: 'Assigned to Dr. Jennifer Walsh (cardiac safety expertise)', newStatus: 'in-progress' },
    { id: 'tl-003', inquiryId: 'mir-001', timestamp: '2026-01-02T10:00:00Z', action: 'Response drafted', actor: 'Dr. Jennifer Walsh', details: 'Draft response prepared using SR-LIG2847-002' },
    { id: 'tl-004', inquiryId: 'mir-001', timestamp: '2026-01-02T11:00:00Z', action: 'Safety signal alert', actor: 'System', details: 'Alert: Inquiry topic relates to active signal SIG-2026-002' },
  ],
  'mir-003': [
    { id: 'tl-005', inquiryId: 'mir-003', timestamp: '2026-01-01T14:00:00Z', action: 'Inquiry received', actor: 'System', newStatus: 'open' },
    { id: 'tl-006', inquiryId: 'mir-003', timestamp: '2026-01-01T14:15:00Z', action: 'Assigned', actor: 'Dr. Sarah Chen', details: 'Assigned to Dr. Jennifer Walsh', newStatus: 'in-progress' },
    { id: 'tl-007', inquiryId: 'mir-003', timestamp: '2026-01-02T09:00:00Z', action: 'Response drafted', actor: 'Dr. Jennifer Walsh', details: 'Used SR-LIG2847-003' },
    { id: 'tl-008', inquiryId: 'mir-003', timestamp: '2026-01-02T10:00:00Z', action: 'Response reviewed', actor: 'Dr. Amanda Foster', details: 'Approved for release' },
    { id: 'tl-009', inquiryId: 'mir-003', timestamp: '2026-01-02T10:30:00Z', action: 'Response sent', actor: 'Dr. Jennifer Walsh', details: 'Sent via secure email', newStatus: 'responded' },
  ],
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getInquiriesByStatus(status: InquiryStatus): MedicalInquiry[] {
  return medicalInquiries.filter(i => i.status === status);
}

export function getInquiriesByProduct(productId: string): MedicalInquiry[] {
  return medicalInquiries.filter(i => i.productId === productId);
}

export function getOverdueInquiries(): MedicalInquiry[] {
  return medicalInquiries.filter(i => i.isOverdue && i.status !== 'responded' && i.status !== 'closed');
}

export function getResponsesByProduct(productId: string): StandardResponse[] {
  return standardResponses.filter(r => r.productId === productId);
}

export function getResponsesRequiringReview(): StandardResponse[] {
  return standardResponses.filter(r => r.requiresReview);
}

export function getResponsesBySignal(signalId: string): StandardResponse[] {
  return standardResponses.filter(r => r.linkedSignalIds.includes(signalId));
}

export function getSignalImpactByProduct(productId: string): SignalImpact[] {
  return signalImpacts.filter(s => s.productId === productId);
}

export function getActiveSignalImpacts(): SignalImpact[] {
  return signalImpacts.filter(s => s.status === 'under-review' || s.status === 'confirmed');
}

export function getInquiryTimeline(inquiryId: string): InquiryTimelineEntry[] {
  return inquiryTimelines[inquiryId] || [];
}

export function getSuggestedResponses(inquiry: MedicalInquiry): StandardResponse[] {
  if (!inquiry.suggestedResponseIds) return [];
  return inquiry.suggestedResponseIds
    .map(id => standardResponses.find(r => r.id === id))
    .filter((r): r is StandardResponse => r !== undefined);
}

// ============================================================================
// STATISTICS HELPERS
// ============================================================================

export function getInquiryStatistics() {
  const total = medicalInquiries.length;
  const open = medicalInquiries.filter(i => i.status === 'open').length;
  const inProgress = medicalInquiries.filter(i => i.status === 'in-progress').length;
  const pendingReview = medicalInquiries.filter(i => i.status === 'pending-review').length;
  const responded = medicalInquiries.filter(i => i.status === 'responded').length;
  const overdue = medicalInquiries.filter(i => i.isOverdue).length;
  const urgent = medicalInquiries.filter(i => i.priority === 'urgent').length;
  
  // Calculate average response time (mock calculation)
  const avgResponseTimeHours = 18.4;
  
  return {
    total,
    open,
    inProgress,
    pendingReview,
    responded,
    overdue,
    urgent,
    avgResponseTimeHours,
    slaCompliance: 96.2,
  };
}

export function getResponseLibraryStatistics() {
  const total = standardResponses.length;
  const current = standardResponses.filter(r => r.status === 'current').length;
  const underReview = standardResponses.filter(r => r.status === 'under-review').length;
  const requiresReview = standardResponses.filter(r => r.requiresReview).length;
  const totalUsage = standardResponses.reduce((sum, r) => sum + r.usageCount, 0);
  
  return {
    total,
    current,
    underReview,
    requiresReview,
    totalUsage,
    signalAffected: signalImpacts.reduce((sum, s) => sum + s.affectedResponseCount, 0),
  };
}

export function getSignalAlertStatistics() {
  const activeSignals = signalImpacts.filter(s => s.status !== 'closed' && s.status !== 'refuted');
  const criticalCount = activeSignals.filter(s => s.severity === 'critical').length;
  const highCount = activeSignals.filter(s => s.severity === 'high').length;
  const totalAffectedResponses = activeSignals.reduce((sum, s) => sum + s.affectedResponseCount, 0);
  
  return {
    activeSignals: activeSignals.length,
    criticalCount,
    highCount,
    totalAffectedResponses,
  };
}
