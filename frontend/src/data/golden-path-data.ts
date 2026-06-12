// ============================================================================
// GOLDEN PATH DATA - LIG-2847 (Nexavant) Complete Connected Demo Data
// ============================================================================
// Version: v68
// Purpose: Create a single product with realistic, connected data across ALL modules
// This enables end-to-end workflow demonstrations where the same entities
// appear consistently throughout the platform.
// ============================================================================

// ============================================================================
// CORE PRODUCT IDENTITY
// ============================================================================

export const GOLDEN_PATH_PRODUCT = {
  id: 'lig-2847',
  name: 'LIG-2847',
  brandName: 'Nexavant',
  genericName: 'ligrastinib',
  therapeuticArea: 'Oncology',
  modality: 'Small Molecule',
  stage: 'NDA Filed',
  indication: 'KRAS G12C+ NSCLC',
  // Cross-references
  indNumber: 'IND-123456',
  ndaNumber: 'NDA-215847',
  maaNumber: 'EMEA/H/C/006123',
  jndaNumber: 'JNDA-30100123',
  nctNumbers: ['NCT05123456', 'NCT05234567', 'NCT05345678'],
} as const;

// ============================================================================
// KEY DATES TIMELINE (Consistent across all modules)
// ============================================================================

export const GOLDEN_PATH_TIMELINE = {
  // Discovery & Preclinical
  targetValidationStart: '2019-01-15',
  leadIdentification: '2019-06-01',
  candidateSelection: '2019-12-15',
  preclinicalStart: '2020-01-15',
  glpToxComplete: '2020-09-30',
  
  // IND Phase
  indSubmission: '2021-03-15',
  indApproval: '2021-04-15',
  
  // Clinical Development
  phase1Start: '2021-05-01',
  phase1Complete: '2022-03-31',
  phase2Start: '2022-06-01',
  phase2Complete: '2023-06-30',
  phase3Start: '2023-01-15',
  phase3FirstPatient: '2023-03-18',
  phase3EnrollmentComplete: '2024-11-20',
  phase3PrimaryComplete: '2025-06-30',
  databaseLock: '2025-01-20',
  
  // Regulatory Submissions
  ndaSubmission: '2024-06-15',
  pdfuaDate: '2025-02-15',
  advisoryCommittee: '2025-01-15',
  paiDates: { start: '2025-01-08', end: '2025-01-10' },
  maaSubmission: '2024-07-01',
  jndaSubmission: '2024-11-15',
  
  // HAQ Milestones
  day74Questions: '2024-09-15',
  day74Response: '2024-12-15',
  
  // Safety Milestones
  firstHepatotoxicitySignal: '2024-08-15',
  signalEvaluationStart: '2024-09-01',
  
  // Projected
  projectedApproval: '2025-02-15',
  projectedLaunch: '2025-03-01',
} as const;

// ============================================================================
// KEY PERSONNEL (Consistent across all modules)
// ============================================================================

export const GOLDEN_PATH_TEAM = {
  // Medical/Clinical
  medicalDirector: { id: 'user-md-001', name: 'Dr. Sarah Chen', email: 'schen@ligature.com', role: 'Medical Director' },
  clinicalLead: { id: 'user-clin-001', name: 'Dr. James Wilson', email: 'jwilson@ligature.com', role: 'Clinical Development Lead' },
  medicalMonitor: { id: 'user-mm-001', name: 'Dr. Emily Park', email: 'epark@ligature.com', role: 'Medical Monitor' },
  safetyPhysician: { id: 'user-safety-001', name: 'Dr. Lisa Park', email: 'lpark@ligature.com', role: 'Safety Physician' },
  
  // Regulatory
  regulatoryLead: { id: 'user-reg-001', name: 'Jennifer Walsh', email: 'jwalsh@ligature.com', role: 'Regulatory Affairs Lead' },
  regulatoryCMC: { id: 'user-reg-cmc', name: 'Jennifer Park', email: 'jpark@ligature.com', role: 'Regulatory CMC Lead' },
  submissionsManager: { id: 'user-sub-001', name: 'Mark Thompson', email: 'mthompson@ligature.com', role: 'Submissions Manager' },
  
  // CMC/Quality
  cmcLead: { id: 'user-cmc-001', name: 'Michael Roberts', email: 'mroberts@ligature.com', role: 'CMC Lead' },
  formulationLead: { id: 'user-form-001', name: 'David Chen', email: 'dchen@ligature.com', role: 'Formulation Lead' },
  qualityHead: { id: 'user-qa-001', name: 'Amanda Martinez', email: 'amartinez@ligature.com', role: 'Quality Head' },
  
  // Operations
  projectManager: { id: 'user-pm-001', name: 'Jennifer Martinez', email: 'jmartinez@ligature.com', role: 'Program Manager' },
  studyManager: { id: 'user-study-001', name: 'Amanda Thompson', email: 'athompson@ligature.com', role: 'Study Manager' },
  
  // Medical Writing
  medicalWriter: { id: 'user-mw-001', name: 'Jennifer Walsh', email: 'jwalsh@ligature.com', role: 'Lead Medical Writer' },
  qcSpecialist: { id: 'user-qc-001', name: 'Robert Kim', email: 'rkim@ligature.com', role: 'QC Specialist' },
} as const;

// ============================================================================
// RESEARCH - Target Programs & Preclinical Studies
// ============================================================================

export const GOLDEN_PATH_RESEARCH = {
  // Target Program
  targetProgram: {
    id: 'gp-target-001',
    target: 'KRAS G12C',
    targetClass: 'Oncogene',
    indication: 'NSCLC',
    modality: 'Small Molecule',
    stage: 'clinical',
    confidence: 95,
    product: GOLDEN_PATH_PRODUCT.name,
    productId: GOLDEN_PATH_PRODUCT.id,
    startDate: GOLDEN_PATH_TIMELINE.targetValidationStart,
    nextMilestone: 'NDA Approval',
    nextMilestoneDate: '2025-Q1',
    team: 'Oncology Unit 1',
    rationale: 'KRAS G12C is a validated oncology target with approved competitors (sotorasib, adagrasib). LIG-2847 differentiates through improved safety profile with lower hepatotoxicity signal and once-daily oral dosing.',
  },
  
  // Target Validation Studies
  targetValidationStudies: [
    {
      id: 'gp-tv-001',
      studyNumber: 'TV-2847-001',
      title: 'In vitro binding and inhibition of KRAS G12C by LIG-2847',
      type: 'pharmacology',
      species: 'In vitro',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      cro: 'Crown Bioscience',
      status: 'completed',
      startDate: GOLDEN_PATH_TIMELINE.targetValidationStart,
      endDate: '2019-04-15',
      duration: '3 months',
      glpCompliant: false,
      findings: 'IC50 = 2.3 nM. High selectivity (>1000x) vs wild-type KRAS. Covalent binding confirmed.',
      regulatoryPurpose: 'Target validation and mechanism of action',
    },
    {
      id: 'gp-tv-002',
      studyNumber: 'TV-2847-002',
      title: 'Efficacy in KRAS G12C xenograft models',
      type: 'pharmacology',
      species: 'Mouse',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      cro: 'Champions Oncology',
      status: 'completed',
      startDate: '2019-07-01',
      endDate: '2019-10-15',
      duration: '3.5 months',
      glpCompliant: false,
      findings: 'Dose-dependent tumor regression in 3/4 PDX models. Complete response in H358 model at 30 mg/kg QD.',
      regulatoryPurpose: 'Proof-of-concept efficacy',
    },
  ],
  
  // GLP Preclinical Studies
  preclinicalStudies: [
    {
      id: 'gp-prec-001',
      studyNumber: 'TOX-2847-001',
      title: '4-Week Oral Toxicity Study in Rats with 4-Week Recovery',
      type: 'toxicology',
      species: 'Rat',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      cro: 'Charles River Laboratories',
      status: 'completed',
      startDate: '2020-03-01',
      endDate: '2020-06-15',
      duration: '8 weeks',
      glpCompliant: true,
      findings: 'NOAEL = 100 mg/kg/day. Hepatocyte hypertrophy at 300 mg/kg (reversible). No genotoxicity signals.',
      regulatoryPurpose: 'IND-enabling toxicology',
    },
    {
      id: 'gp-prec-002',
      studyNumber: 'TOX-2847-002',
      title: '4-Week Oral Toxicity Study in Dogs with 4-Week Recovery',
      type: 'toxicology',
      species: 'Dog',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      cro: 'Covance',
      status: 'completed',
      startDate: '2020-03-15',
      endDate: '2020-07-01',
      duration: '9 weeks',
      glpCompliant: true,
      findings: 'NOAEL = 50 mg/kg/day. Mild GI effects at all doses (expected class effect). Reversible ALT elevations at 150 mg/kg.',
      regulatoryPurpose: 'IND-enabling toxicology',
    },
    {
      id: 'gp-prec-003',
      studyNumber: 'PK-2847-001',
      title: 'Single and Repeat Dose PK Study in Rats and Dogs',
      type: 'pk',
      species: 'Rat, Dog',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      cro: 'Absorption Systems',
      status: 'completed',
      startDate: '2020-02-01',
      endDate: '2020-04-30',
      duration: '3 months',
      glpCompliant: true,
      findings: 'Good oral bioavailability (Rat: 68%, Dog: 72%). t1/2 supports QD dosing. Linear PK in therapeutic range.',
      regulatoryPurpose: 'IND-enabling PK characterization',
    },
    {
      id: 'gp-prec-004',
      studyNumber: 'SP-2847-001',
      title: 'Cardiovascular Safety Pharmacology Study in Dogs',
      type: 'safety-pharm',
      species: 'Dog',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      cro: 'QTest Labs',
      status: 'completed',
      startDate: '2020-06-01',
      endDate: '2020-08-15',
      duration: '10 weeks',
      glpCompliant: true,
      findings: 'No effect on QTc up to 300 mg/kg (30x clinical Cmax). No hemodynamic effects.',
      regulatoryPurpose: 'IND-enabling safety pharmacology',
    },
  ],
  
  // IND Readiness Summary
  indReadiness: {
    productId: GOLDEN_PATH_PRODUCT.id,
    overallScore: 98,
    submittedDate: GOLDEN_PATH_TIMELINE.indSubmission,
    approvedDate: GOLDEN_PATH_TIMELINE.indApproval,
    status: 'approved',
    categories: {
      cmcReadiness: 95,
      nonclinicalComplete: 100,
      clinicalPlanApproved: 98,
      regulatoryPackageReady: 100,
    },
  },
};

// ============================================================================
// CLINICAL DEVELOPMENT - Studies, Sites, Enrollment
// ============================================================================

export const GOLDEN_PATH_CLINICAL = {
  // Phase 3 Pivotal Study (Main)
  phase3Pivotal: {
    id: 'gp-study-301',
    protocolNumber: 'LIG-2847-301',
    title: 'A Phase 3, Randomized, Double-Blind, Placebo-Controlled Study of LIG-2847 in Treatment-Naïve Patients with KRAS G12C-Mutant Advanced Non-Small Cell Lung Cancer (LIGATURE-1)',
    shortTitle: 'LIGATURE-1',
    productId: GOLDEN_PATH_PRODUCT.id,
    productName: GOLDEN_PATH_PRODUCT.name,
    indication: 'KRAS G12C+ NSCLC (1L)',
    phase: 'Phase 3',
    type: 'interventional',
    status: 'enrollment-complete',
    sponsor: 'Ligature Therapeutics',
    cro: 'IQVIA',
    indNumber: GOLDEN_PATH_PRODUCT.indNumber,
    nctNumber: GOLDEN_PATH_PRODUCT.nctNumbers[0],
    medicalMonitor: GOLDEN_PATH_TEAM.medicalMonitor.name,
    projectManager: GOLDEN_PATH_TEAM.projectManager.name,
    
    // Timeline
    plannedStartDate: '2023-01-15',
    actualStartDate: GOLDEN_PATH_TIMELINE.phase3Start,
    firstSubjectIn: GOLDEN_PATH_TIMELINE.phase3FirstPatient,
    lastSubjectIn: GOLDEN_PATH_TIMELINE.phase3EnrollmentComplete,
    primaryCompletionDate: GOLDEN_PATH_TIMELINE.phase3PrimaryComplete,
    studyCompletionDate: '2025-12-31',
    databaseLockDate: GOLDEN_PATH_TIMELINE.databaseLock,
    
    // Enrollment
    targetEnrollment: 650,
    enrolledSubjects: 612,
    targetSites: 85,
    totalSites: 78,
    activeSites: 72,
    
    // Geography
    countries: ['USA', 'Canada', 'Germany', 'France', 'UK', 'Japan', 'Australia', 'South Korea'],
    regions: ['North America', 'Europe', 'Asia-Pacific'],
    
    // Risk
    riskScore: 'low',
    
    // Study Arms
    arms: [
      {
        id: 'gp-arm-301-1',
        studyId: 'gp-study-301',
        name: 'LIG-2847 200mg QD',
        shortName: 'LIG-2847',
        type: 'experimental',
        description: 'LIG-2847 200mg once daily oral administration',
        intervention: 'LIG-2847',
        dose: '200mg',
        route: 'oral',
        frequency: 'QD',
        targetEnrollment: 433,
        enrolledSubjects: 408,
        activeSubjects: 350,
        completedSubjects: 58,
        discontinuedSubjects: 0,
        status: 'closed',
        allocationWeight: 2,
      },
      {
        id: 'gp-arm-301-2',
        studyId: 'gp-study-301',
        name: 'Placebo',
        shortName: 'Placebo',
        type: 'placebo',
        description: 'Matching placebo once daily oral administration',
        intervention: 'Placebo',
        route: 'oral',
        frequency: 'QD',
        targetEnrollment: 217,
        enrolledSubjects: 204,
        activeSubjects: 175,
        completedSubjects: 29,
        discontinuedSubjects: 0,
        status: 'closed',
        allocationWeight: 1,
      },
    ],
    
    // Endpoints
    endpoints: [
      {
        id: 'gp-ep-301-1',
        studyId: 'gp-study-301',
        type: 'primary',
        category: 'efficacy',
        name: 'Progression-Free Survival (PFS)',
        fullDefinition: 'Time from randomization to first documented disease progression per RECIST 1.1 by BICR or death from any cause, whichever occurs first',
        assessmentMethod: 'RECIST 1.1 by BICR',
        assessmentTimepoint: 'Every 8 weeks',
        hypothesisType: 'superiority',
        status: 'pending',
        targetHR: 0.65,
      },
      {
        id: 'gp-ep-301-2',
        studyId: 'gp-study-301',
        type: 'secondary',
        category: 'efficacy',
        name: 'Overall Survival (OS)',
        fullDefinition: 'Time from randomization to death from any cause',
        assessmentMethod: 'Survival follow-up',
        assessmentTimepoint: 'Every 12 weeks',
        status: 'pending',
      },
      {
        id: 'gp-ep-301-3',
        studyId: 'gp-study-301',
        type: 'secondary',
        category: 'efficacy',
        name: 'Objective Response Rate (ORR)',
        fullDefinition: 'Proportion of patients with confirmed complete response (CR) or partial response (PR) per RECIST 1.1',
        assessmentMethod: 'RECIST 1.1 by BICR',
        assessmentTimepoint: 'Every 8 weeks',
        status: 'pending',
      },
      {
        id: 'gp-ep-301-4',
        studyId: 'gp-study-301',
        type: 'secondary',
        category: 'safety',
        name: 'Safety and Tolerability',
        fullDefinition: 'Incidence and severity of treatment-emergent adverse events, serious adverse events, and adverse events leading to discontinuation',
        assessmentMethod: 'CTCAE v5.0',
        assessmentTimepoint: 'Continuous',
        status: 'pending',
      },
    ],
  },
  
  // Key Sites (Top enrollers with connected data)
  sites: [
    {
      id: 'gp-site-001',
      studyId: 'gp-study-301',
      siteNumber: '301-US-001',
      name: 'Memorial Sloan Kettering Cancer Center',
      institutionType: 'cancer-center',
      address: {
        line1: '1275 York Avenue',
        city: 'New York',
        state: 'NY',
        postalCode: '10065',
        country: 'USA',
        countryCode: 'US',
        region: 'North America',
      },
      status: 'enrolling',
      principalInvestigator: {
        id: 'gp-pi-001',
        name: 'Dr. Mark Johnson',
        credentials: 'MD, PhD',
        email: 'mjohnson@mskcc.org',
        cv1572Status: 'current',
        financialDisclosureStatus: 'submitted',
        gcpTrainingDate: '2023-01-15',
      },
      targetEnrollment: 40,
      enrolledSubjects: 42,
      activeSubjects: 35,
      completedSubjects: 7,
      screenFailures: 9,
      riskScore: 'low',
      lastMonitoringVisit: '2024-12-01',
      monitoringVisitFrequency: 'monthly',
      tmfArtifactsExpected: 45,
      tmfArtifactsReceived: 43,
      tmfCompleteness: 96,
    },
    {
      id: 'gp-site-002',
      studyId: 'gp-study-301',
      siteNumber: '301-US-002',
      name: 'MD Anderson Cancer Center',
      institutionType: 'cancer-center',
      address: {
        line1: '1515 Holcombe Blvd',
        city: 'Houston',
        state: 'TX',
        postalCode: '77030',
        country: 'USA',
        countryCode: 'US',
        region: 'North America',
      },
      status: 'enrolling',
      principalInvestigator: {
        id: 'gp-pi-002',
        name: 'Dr. Susan Miller',
        credentials: 'MD',
        email: 'smiller@mdanderson.org',
        cv1572Status: 'current',
        financialDisclosureStatus: 'submitted',
        gcpTrainingDate: '2023-02-01',
      },
      targetEnrollment: 45,
      enrolledSubjects: 48,
      activeSubjects: 40,
      completedSubjects: 8,
      screenFailures: 11,
      riskScore: 'low',
      lastMonitoringVisit: '2024-11-28',
      monitoringVisitFrequency: 'monthly',
      tmfArtifactsExpected: 45,
      tmfArtifactsReceived: 45,
      tmfCompleteness: 100,
    },
    {
      id: 'gp-site-003',
      studyId: 'gp-study-301',
      siteNumber: '301-EU-001',
      name: 'Gustave Roussy Institute',
      institutionType: 'cancer-center',
      address: {
        line1: '114 Rue Édouard-Vaillant',
        city: 'Villejuif',
        postalCode: '94805',
        country: 'France',
        countryCode: 'FR',
        region: 'Europe',
      },
      status: 'enrolling',
      principalInvestigator: {
        id: 'gp-pi-003',
        name: 'Dr. Jean-Charles Soria',
        credentials: 'MD, PhD',
        email: 'jcsoria@gustaveroussy.fr',
        cv1572Status: 'current',
        financialDisclosureStatus: 'submitted',
        gcpTrainingDate: '2023-03-15',
      },
      targetEnrollment: 35,
      enrolledSubjects: 38,
      activeSubjects: 32,
      completedSubjects: 6,
      screenFailures: 8,
      riskScore: 'low',
      lastMonitoringVisit: '2024-11-20',
      monitoringVisitFrequency: 'monthly',
      tmfArtifactsExpected: 42,
      tmfArtifactsReceived: 40,
      tmfCompleteness: 95,
    },
    {
      id: 'gp-site-004',
      studyId: 'gp-study-301',
      siteNumber: '301-JP-001',
      name: 'National Cancer Center Hospital',
      institutionType: 'cancer-center',
      address: {
        line1: '5-1-1 Tsukiji',
        city: 'Tokyo',
        postalCode: '104-0045',
        country: 'Japan',
        countryCode: 'JP',
        region: 'Asia-Pacific',
      },
      status: 'enrolling',
      principalInvestigator: {
        id: 'gp-pi-004',
        name: 'Dr. Yuichiro Ohe',
        credentials: 'MD',
        email: 'yohe@ncc.go.jp',
        cv1572Status: 'current',
        financialDisclosureStatus: 'submitted',
        gcpTrainingDate: '2023-04-01',
      },
      targetEnrollment: 30,
      enrolledSubjects: 32,
      activeSubjects: 28,
      completedSubjects: 4,
      screenFailures: 5,
      riskScore: 'low',
      lastMonitoringVisit: '2024-12-05',
      monitoringVisitFrequency: 'monthly',
      tmfArtifactsExpected: 40,
      tmfArtifactsReceived: 38,
      tmfCompleteness: 95,
    },
  ],
  
  // Enrollment Summary
  enrollmentSummary: {
    studyId: 'gp-study-301',
    asOfDate: '2024-12-15',
    targetEnrollment: 650,
    screened: 752,
    screenFailed: 140,
    enrolled: 612,
    randomized: 612,
    onTreatment: 525,
    completed: 87,
    discontinued: 0,
    screenFailureRate: 18.6,
    discontinuationRate: 0,
    enrollmentRate: 0, // Closed
    projectedCompletionDate: GOLDEN_PATH_TIMELINE.phase3PrimaryComplete,
    enrollmentVsTarget: 94.2,
    byRegion: [
      { region: 'North America', siteCount: 42, activeSites: 40, target: 350, enrolled: 328, percentComplete: 93.7 },
      { region: 'Europe', siteCount: 28, activeSites: 26, target: 200, enrolled: 192, percentComplete: 96.0 },
      { region: 'Asia-Pacific', siteCount: 8, activeSites: 6, target: 100, enrolled: 92, percentComplete: 92.0 },
    ],
  },
};

// ============================================================================
// REGULATORY APPLICATIONS
// ============================================================================

export const GOLDEN_PATH_REGULATORY = {
  // IND (US)
  ind: {
    id: 'gp-app-ind',
    productId: GOLDEN_PATH_PRODUCT.id,
    applicationNumber: GOLDEN_PATH_PRODUCT.indNumber,
    type: 'IND',
    region: 'US',
    agency: 'FDA',
    status: 'Active',
    submissionDate: GOLDEN_PATH_TIMELINE.indSubmission,
    currentSequence: 28,
    totalSequences: 28,
  },
  
  // NDA (US) - Primary focus for demo
  nda: {
    id: 'gp-app-nda',
    productId: GOLDEN_PATH_PRODUCT.id,
    applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
    type: 'NDA',
    region: 'US',
    agency: 'FDA',
    status: 'Under Review',
    submissionDate: GOLDEN_PATH_TIMELINE.ndaSubmission,
    pdfuaDate: GOLDEN_PATH_TIMELINE.pdfuaDate,
    advisoryCommitteeDate: GOLDEN_PATH_TIMELINE.advisoryCommittee,
    currentSequence: 4, // Original + 3 information requests
    totalSequences: 4,
    sequences: [
      { number: 0, type: 'Original NDA Submission', date: GOLDEN_PATH_TIMELINE.ndaSubmission, documents: 847, status: 'Published' },
      { number: 1, type: 'Safety Update', date: '2024-07-15', documents: 12, status: 'Published' },
      { number: 2, type: 'Day-74 Response (Partial)', date: '2024-10-20', documents: 45, status: 'Published' },
      { number: 3, type: 'Day-74 Response (Complete)', date: '2024-12-15', documents: 0, status: 'In Progress' },
    ],
    milestones: [
      { name: 'Filing/RTF', date: '2024-07-15', status: 'completed', notes: 'Filed without RTF letter' },
      { name: 'Day 74 Questions', date: '2024-09-15', status: 'completed', notes: '23 questions received' },
      { name: 'Day 74 Response Due', date: '2024-12-15', status: 'in-progress', notes: '3 questions remaining' },
      { name: 'Pre-Approval Inspection', date: '2025-01-08', status: 'scheduled', notes: 'Manufacturing site inspection' },
      { name: 'Advisory Committee', date: '2025-01-15', status: 'scheduled', notes: 'ODAC review' },
      { name: 'PDUFA Date', date: '2025-02-15', status: 'pending', notes: 'Target action date' },
    ],
  },
  
  // MAA (EU)
  maa: {
    id: 'gp-app-maa',
    productId: GOLDEN_PATH_PRODUCT.id,
    applicationNumber: GOLDEN_PATH_PRODUCT.maaNumber,
    type: 'MAA',
    region: 'EU',
    agency: 'EMA',
    status: 'Under Review',
    submissionDate: GOLDEN_PATH_TIMELINE.maaSubmission,
    currentSequence: 3,
    totalSequences: 3,
    milestones: [
      { name: 'Validation', date: '2024-07-21', status: 'completed' },
      { name: 'Day 80 Questions', date: '2024-10-01', status: 'completed', notes: '156 questions' },
      { name: 'Day 80 Response Due', date: '2024-12-25', status: 'in-progress' },
      { name: 'Day 120 Assessment', date: '2025-02-15', status: 'pending' },
      { name: 'Day 180 Opinion', date: '2025-04-15', status: 'pending' },
    ],
  },
  
  // JNDA (Japan) - Already approved!
  jnda: {
    id: 'gp-app-jnda',
    productId: GOLDEN_PATH_PRODUCT.id,
    applicationNumber: GOLDEN_PATH_PRODUCT.jndaNumber,
    type: 'JNDA',
    region: 'Japan',
    agency: 'PMDA',
    status: 'Approved',
    submissionDate: GOLDEN_PATH_TIMELINE.jndaSubmission,
    approvalDate: '2024-12-10',
    currentSequence: 2,
    totalSequences: 2,
  },
};

// ============================================================================
// DOCUMENTS & AUTHORING
// ============================================================================

export const GOLDEN_PATH_DOCUMENTS = {
  // Key CTD documents for NDA
  module2: [
    {
      id: 'gp-doc-25',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Clinical Overview',
      moduleSection: '2.5',
      ctdSection: 'Module 2.5',
      version: '2.3',
      status: 'In Review',
      lastModified: '2024-12-10',
      author: GOLDEN_PATH_TEAM.medicalWriter.name,
      authorId: GOLDEN_PATH_TEAM.medicalWriter.id,
      wordCount: 18420,
      pageCount: 42,
      reviewStage: 'Cross-Functional Review',
      linkedHAQs: ['gp-haq-clin-1', 'gp-haq-clin-2'],
      linkedStudies: ['gp-study-301'],
    },
    {
      id: 'gp-doc-273',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Clinical Summary - Efficacy',
      moduleSection: '2.7.3',
      ctdSection: 'Module 2.7.3',
      version: '2.1',
      status: 'Approved',
      lastModified: '2024-11-28',
      author: GOLDEN_PATH_TEAM.medicalWriter.name,
      authorId: GOLDEN_PATH_TEAM.medicalWriter.id,
      wordCount: 32150,
      pageCount: 78,
      reviewStage: 'Final Approved',
      linkedStudies: ['gp-study-301'],
    },
    {
      id: 'gp-doc-274',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Clinical Summary - Safety',
      moduleSection: '2.7.4',
      ctdSection: 'Module 2.7.4',
      version: '2.2',
      status: 'In Review',
      lastModified: '2024-12-08',
      author: GOLDEN_PATH_TEAM.safetyPhysician.name,
      authorId: GOLDEN_PATH_TEAM.safetyPhysician.id,
      wordCount: 28900,
      pageCount: 68,
      reviewStage: 'QC Review',
      linkedHAQs: ['gp-haq-safety-1'],
      linkedSignals: ['gp-sig-hepato', 'gp-sig-ild'],
    },
    {
      id: 'gp-doc-24',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Nonclinical Overview',
      moduleSection: '2.4',
      ctdSection: 'Module 2.4',
      version: '1.5',
      status: 'Approved',
      lastModified: '2024-06-01',
      author: GOLDEN_PATH_TEAM.clinicalLead.name,
      wordCount: 14200,
      pageCount: 35,
      reviewStage: 'Final Approved',
    },
    {
      id: 'gp-doc-23',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Quality Overall Summary',
      moduleSection: '2.3',
      ctdSection: 'Module 2.3',
      version: '1.8',
      status: 'Approved',
      lastModified: '2024-06-10',
      author: GOLDEN_PATH_TEAM.cmcLead.name,
      authorId: GOLDEN_PATH_TEAM.cmcLead.id,
      wordCount: 22100,
      pageCount: 52,
      reviewStage: 'Final Approved',
      linkedHAQs: ['gp-haq-cmc-1', 'gp-haq-cmc-2'],
    },
  ],
  
  module3: [
    {
      id: 'gp-doc-32s',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Drug Substance - 3.2.S',
      moduleSection: '3.2.S',
      ctdSection: 'Module 3.2.S',
      version: '2.0',
      status: 'Approved',
      lastModified: '2024-05-20',
      author: GOLDEN_PATH_TEAM.cmcLead.name,
      wordCount: 45600,
      reviewStage: 'Final Approved',
      linkedHAQs: ['gp-haq-cmc-1'],
    },
    {
      id: 'gp-doc-32p',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Drug Product - 3.2.P',
      moduleSection: '3.2.P',
      ctdSection: 'Module 3.2.P',
      version: '2.1',
      status: 'In Review',
      lastModified: '2024-12-05',
      author: GOLDEN_PATH_TEAM.cmcLead.name,
      wordCount: 38200,
      reviewStage: 'Cross-Functional Review',
      linkedHAQs: ['gp-haq-cmc-2'],
    },
  ],
  
  module1: [
    {
      id: 'gp-doc-uspi',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'USPI Draft',
      moduleSection: '1.14.1',
      ctdSection: 'Module 1.14.1',
      version: '0.9',
      status: 'Draft',
      lastModified: '2024-12-12',
      author: GOLDEN_PATH_TEAM.medicalWriter.name,
      wordCount: 8900,
      reviewStage: 'Peer Review',
      linkedSignals: ['gp-sig-hepato'],
    },
  ],
  
  clinicalStudyReports: [
    {
      id: 'gp-csr-301',
      productId: GOLDEN_PATH_PRODUCT.id,
      applicationId: 'gp-app-nda',
      title: 'Clinical Study Report - LIG-2847-301',
      moduleSection: '5.3.5.1',
      ctdSection: 'Module 5.3.5.1',
      version: '1.0',
      status: 'In Progress',
      lastModified: '2024-12-13',
      author: GOLDEN_PATH_TEAM.medicalWriter.name,
      wordCount: 125000, // Estimated
      reviewStage: 'Authoring',
      linkedStudies: ['gp-study-301'],
      progress: {
        synopsis: 100,
        methods: 85,
        efficacy: 70,
        safety: 60,
        appendices: 40,
        overall: 68,
      },
    },
  ],
};

// ============================================================================
// HEALTH AUTHORITY QUESTIONS (HAQs)
// ============================================================================

export const GOLDEN_PATH_HAQS = {
  // CMC Questions
  cmc: [
    {
      id: 'gp-haq-cmc-1',
      applicationId: 'gp-app-nda',
      applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      questionNumber: 'CMC-1',
      questionText: 'Please provide additional information regarding the control strategy for the drug substance manufacturing process. Specifically, clarify the critical process parameters (CPPs) and their acceptable ranges for the final crystallization step, and how these parameters ensure consistent control of the specified impurity profile.',
      discipline: 'CMC',
      subdiscipline: 'Drug Substance',
      ctdSection: '3.2.S.2.4',
      type: 'Day-74',
      source: 'FDA',
      priority: 'major',
      receivedDate: GOLDEN_PATH_TIMELINE.day74Questions,
      dueDate: GOLDEN_PATH_TIMELINE.day74Response,
      status: 'approved',
      assignedTo: GOLDEN_PATH_TEAM.regulatoryCMC.id,
      assignedToName: GOLDEN_PATH_TEAM.regulatoryCMC.name,
      linkedDocuments: ['gp-doc-32s'],
      responseText: 'The control strategy for the drug substance manufacturing process is based on a comprehensive Quality by Design (QbD) approach...',
      approvedDate: '2024-12-10',
    },
    {
      id: 'gp-haq-cmc-2',
      applicationId: 'gp-app-nda',
      applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      questionNumber: 'CMC-2',
      questionText: 'The dissolution specification limit of NLT 80% (Q) in 30 minutes appears to be less stringent than the observed batch data. Please justify the proposed specification or consider tightening the acceptance criterion based on manufacturing experience.',
      discipline: 'CMC',
      subdiscipline: 'Drug Product',
      ctdSection: '3.2.P.5.1',
      type: 'Day-74',
      source: 'FDA',
      priority: 'major',
      receivedDate: GOLDEN_PATH_TIMELINE.day74Questions,
      dueDate: GOLDEN_PATH_TIMELINE.day74Response,
      status: 'approved',
      assignedTo: GOLDEN_PATH_TEAM.formulationLead.id,
      assignedToName: GOLDEN_PATH_TEAM.formulationLead.name,
      linkedDocuments: ['gp-doc-32p'],
      responseText: 'The proposed dissolution specification of NLT 80% (Q) in 30 minutes was established based on clinical relevance...',
      approvedDate: '2024-12-08',
    },
  ],
  
  // Clinical Questions
  clinical: [
    {
      id: 'gp-haq-clin-1',
      applicationId: 'gp-app-nda',
      applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      questionNumber: 'CLIN-1',
      questionText: 'In Study LIG-301, the protocol allowed for dose modifications in patients experiencing Grade 2 or higher adverse events. Please provide a summary of the dose modification patterns observed, including the proportion of patients requiring dose reductions, the median time to first dose reduction, and the impact on efficacy outcomes in patients who required dose modifications versus those who did not.',
      discipline: 'Clinical',
      subdiscipline: 'Efficacy',
      ctdSection: '2.5',
      type: 'Day-74',
      source: 'FDA',
      priority: 'major',
      receivedDate: GOLDEN_PATH_TIMELINE.day74Questions,
      dueDate: GOLDEN_PATH_TIMELINE.day74Response,
      status: 'in-progress',
      assignedTo: GOLDEN_PATH_TEAM.clinicalLead.id,
      assignedToName: GOLDEN_PATH_TEAM.clinicalLead.name,
      linkedDocuments: ['gp-doc-25', 'gp-csr-301'],
      linkedStudies: ['gp-study-301'],
    },
    {
      id: 'gp-haq-clin-2',
      applicationId: 'gp-app-nda',
      applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      questionNumber: 'CLIN-2',
      questionText: 'Please clarify the handling of patients who crossed over from placebo to LIG-2847 after disease progression in the survival analysis. Provide sensitivity analyses to address potential bias introduced by crossover.',
      discipline: 'Clinical',
      subdiscipline: 'Biostatistics',
      ctdSection: '2.5',
      type: 'Day-74',
      source: 'FDA',
      priority: 'critical',
      receivedDate: GOLDEN_PATH_TIMELINE.day74Questions,
      dueDate: GOLDEN_PATH_TIMELINE.day74Response,
      status: 'in-progress',
      assignedTo: GOLDEN_PATH_TEAM.clinicalLead.id,
      assignedToName: GOLDEN_PATH_TEAM.clinicalLead.name,
      linkedDocuments: ['gp-doc-25'],
      linkedStudies: ['gp-study-301'],
    },
  ],
  
  // Safety Questions
  safety: [
    {
      id: 'gp-haq-safety-1',
      applicationId: 'gp-app-nda',
      applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      questionNumber: 'SAFETY-1',
      questionText: 'The safety database includes 12 cases of hepatotoxicity (ALT/AST >5x ULN). Please provide: (a) detailed narratives for all Grade 3+ hepatotoxicity cases, (b) time to onset and resolution data, (c) analysis of potential risk factors, and (d) proposed risk management strategy and labeling language.',
      discipline: 'Clinical',
      subdiscipline: 'Safety',
      ctdSection: '2.7.4',
      type: 'Day-74',
      source: 'FDA',
      priority: 'critical',
      receivedDate: GOLDEN_PATH_TIMELINE.day74Questions,
      dueDate: GOLDEN_PATH_TIMELINE.day74Response,
      status: 'draft-ready',
      assignedTo: GOLDEN_PATH_TEAM.safetyPhysician.id,
      assignedToName: GOLDEN_PATH_TEAM.safetyPhysician.name,
      linkedDocuments: ['gp-doc-274', 'gp-doc-uspi'],
      linkedSignals: ['gp-sig-hepato'],
    },
  ],
  
  // Summary
  summary: {
    applicationId: 'gp-app-nda',
    totalQuestions: 23,
    byStatus: {
      approved: 18,
      'draft-ready': 2,
      'in-progress': 3,
      new: 0,
    },
    byDiscipline: {
      CMC: 8,
      Clinical: 10,
      Nonclinical: 3,
      Labeling: 2,
    },
    byPriority: {
      critical: 4,
      major: 15,
      minor: 4,
    },
    dueDate: GOLDEN_PATH_TIMELINE.day74Response,
    completionRate: 78.3,
  },
};

// ============================================================================
// SAFETY & PHARMACOVIGILANCE
// ============================================================================

export const GOLDEN_PATH_SAFETY = {
  // Active Signals
  signals: [
    {
      id: 'gp-sig-hepato',
      signal: 'Hepatotoxicity (ALT/AST elevation)',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      status: 'under-evaluation',
      priority: 'high',
      detectedDate: GOLDEN_PATH_TIMELINE.firstHepatotoxicitySignal,
      source: 'Clinical Trial Data (LIG-301)',
      caseCount: 12,
      prrValue: 2.8,
      rorValue: 3.1,
      ebgmValue: 2.4,
      description: 'Grade 3+ ALT/AST elevations observed in 12 patients (2.0% of treated population) in Phase 3 study. Median time to onset: 8 weeks.',
      recommendation: 'Recommend enhanced monitoring in first 3 months of treatment. Proposed label language includes hepatotoxicity warning.',
      relatedHAQs: ['gp-haq-safety-1'],
      linkedDocuments: ['gp-doc-274', 'gp-doc-uspi'],
      classEffect: true,
      labeledEvent: true,
      timeline: [
        { date: '2024-08-15', event: 'Signal detected by medical monitor' },
        { date: '2024-08-20', event: 'Signal validation initiated' },
        { date: '2024-09-01', event: 'Signal confirmed, evaluation started' },
        { date: '2024-09-15', event: 'Presented to Safety Review Board' },
        { date: '2024-10-01', event: 'Risk management strategy drafted' },
        { date: '2024-12-15', event: 'HAQ response submitted (pending)' },
      ],
    },
    {
      id: 'gp-sig-ild',
      signal: 'Interstitial Lung Disease',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      status: 'under-evaluation',
      priority: 'high',
      detectedDate: '2024-12-01',
      source: 'Literature Review + Spontaneous Reports',
      caseCount: 5,
      prrValue: 1.8,
      description: 'ILD reported in 5 patients across clinical program. Known class effect for KRAS inhibitors.',
      recommendation: 'Monitor for respiratory symptoms. Discontinue if ILD confirmed.',
      classEffect: true,
      labeledEvent: true,
    },
  ],
  
  // ICSR Cases (subset)
  icsrCases: [
    {
      id: 'gp-icsr-001',
      caseNumber: 'LIG-2847-2024-001234',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      event: 'Hepatotoxicity (ALT increased)',
      seriousness: 'serious',
      seriousnessCriteria: ['hospitalization'],
      outcome: 'Resolved',
      source: 'Clinical Trial',
      country: 'USA',
      receivedDate: '2024-09-20',
      dueDate: '2024-09-27',
      status: 'submitted',
      assignee: GOLDEN_PATH_TEAM.safetyPhysician.name,
      causality: 'probable',
      linkedSignal: 'gp-sig-hepato',
    },
    {
      id: 'gp-icsr-002',
      caseNumber: 'LIG-2847-2024-001456',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      event: 'Pneumonitis',
      seriousness: 'serious',
      seriousnessCriteria: ['hospitalization'],
      outcome: 'Recovering',
      source: 'Clinical Trial',
      country: 'Germany',
      receivedDate: '2024-11-05',
      dueDate: '2024-11-12',
      status: 'submitted',
      assignee: GOLDEN_PATH_TEAM.safetyPhysician.name,
      causality: 'possible',
      linkedSignal: 'gp-sig-ild',
    },
  ],
  
  // Periodic Reports
  periodicReports: [
    {
      id: 'gp-pr-pbrer',
      type: 'PBRER',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      period: 'Jun 2024 - Nov 2024',
      region: 'EU',
      dueDate: '2025-02-28',
      status: 'in-progress',
      owner: GOLDEN_PATH_TEAM.safetyPhysician.name,
      progress: 45,
    },
    {
      id: 'gp-pr-psur',
      type: 'PSUR',
      product: GOLDEN_PATH_PRODUCT.name,
      productId: GOLDEN_PATH_PRODUCT.id,
      period: 'Jun 2024 - Nov 2024',
      region: 'US',
      dueDate: '2025-02-28',
      status: 'not-started',
      owner: GOLDEN_PATH_TEAM.safetyPhysician.name,
      progress: 0,
    },
  ],
};

// ============================================================================
// TRIAL MASTER FILE (TMF)
// ============================================================================

export const GOLDEN_PATH_TMF = {
  // TMF for pivotal study
  tmfSummary: {
    studyId: 'gp-study-301',
    protocolNumber: 'LIG-2847-301',
    productId: GOLDEN_PATH_PRODUCT.id,
    totalArtifacts: 1247,
    completedArtifacts: 1185,
    pendingArtifacts: 45,
    missingArtifacts: 17,
    completeness: 95.0,
    inspectionReadiness: 92,
    lastAudit: '2024-11-15',
    lastAuditFinding: 'Minor - 3 missing site delegation logs',
  },
  
  // Key TMF Sections with status
  sections: [
    { id: 'tmf-01', zone: '01', name: 'Trial Management', expectedDocs: 45, receivedDocs: 45, completeness: 100 },
    { id: 'tmf-02', zone: '02', name: 'Central Trial Documents', expectedDocs: 89, receivedDocs: 87, completeness: 98 },
    { id: 'tmf-03', zone: '03', name: 'Regulatory', expectedDocs: 156, receivedDocs: 152, completeness: 97 },
    { id: 'tmf-04', zone: '04', name: 'IRB/IEC', expectedDocs: 234, receivedDocs: 228, completeness: 97 },
    { id: 'tmf-05', zone: '05', name: 'Site Management', expectedDocs: 312, receivedDocs: 298, completeness: 95 },
    { id: 'tmf-06', zone: '06', name: 'IP and Materials', expectedDocs: 67, receivedDocs: 67, completeness: 100 },
    { id: 'tmf-07', zone: '07', name: 'Safety Reporting', expectedDocs: 145, receivedDocs: 142, completeness: 98 },
    { id: 'tmf-08', zone: '08', name: 'Central Lab', expectedDocs: 78, receivedDocs: 76, completeness: 97 },
    { id: 'tmf-09', zone: '09', name: 'Statistics', expectedDocs: 56, receivedDocs: 48, completeness: 86 },
    { id: 'tmf-10', zone: '10', name: 'Data Management', expectedDocs: 65, receivedDocs: 62, completeness: 95 },
  ],
  
  // Recent TMF Artifacts (linked to sites/events)
  recentArtifacts: [
    {
      id: 'tmf-art-001',
      studyId: 'gp-study-301',
      zone: '05',
      artifactName: 'Site Initiation Visit Report',
      siteId: 'gp-site-001',
      siteName: 'Memorial Sloan Kettering Cancer Center',
      uploadDate: '2024-12-10',
      status: 'approved',
      version: '1.0',
    },
    {
      id: 'tmf-art-002',
      studyId: 'gp-study-301',
      zone: '07',
      artifactName: 'SAE Report - Case 2024-001234',
      linkedICSR: 'gp-icsr-001',
      uploadDate: '2024-09-22',
      status: 'approved',
      version: '1.0',
    },
    {
      id: 'tmf-art-003',
      studyId: 'gp-study-301',
      zone: '03',
      artifactName: 'IND Safety Report - Hepatotoxicity',
      linkedSignal: 'gp-sig-hepato',
      uploadDate: '2024-09-25',
      status: 'approved',
      version: '1.0',
    },
  ],
};

// ============================================================================
// QUALITY MANAGEMENT (QMS)
// ============================================================================

export const GOLDEN_PATH_QMS = {
  // Deviations
  deviations: [
    {
      id: 'gp-dev-001',
      deviationNumber: 'DEV-2024-0847',
      title: 'Out-of-specification dissolution result - Clinical batch C-2024-005',
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      type: 'manufacturing',
      severity: 'major',
      status: 'investigation',
      detectedDate: '2024-11-28',
      reportedBy: GOLDEN_PATH_TEAM.formulationLead.name,
      assignedTo: GOLDEN_PATH_TEAM.qualityHead.name,
      rootCause: 'Under investigation - suspected humidity excursion during tableting',
      linkedCAPAs: ['gp-capa-001'],
      linkedBatch: 'C-2024-005',
      affectedStudy: 'gp-study-301',
      description: 'Dissolution testing of clinical batch C-2024-005 showed 76% at 30 minutes vs specification of NLT 80%.',
      impactAssessment: 'Batch quarantined. No impact to enrolled patients - batch not yet distributed.',
    },
    {
      id: 'gp-dev-002',
      deviationNumber: 'DEV-2024-0892',
      title: 'Missed monitoring visit at Site 301-US-003',
      productId: GOLDEN_PATH_PRODUCT.id,
      type: 'clinical',
      severity: 'minor',
      status: 'closed',
      detectedDate: '2024-12-01',
      closedDate: '2024-12-10',
      reportedBy: GOLDEN_PATH_TEAM.studyManager.name,
      assignedTo: GOLDEN_PATH_TEAM.studyManager.name,
      rootCause: 'CRA scheduling conflict',
      affectedStudy: 'gp-study-301',
      description: 'November monitoring visit was not conducted within protocol-specified window.',
      resolution: 'Visit rescheduled and completed 2024-12-05. No data integrity impact.',
    },
  ],
  
  // CAPAs
  capas: [
    {
      id: 'gp-capa-001',
      capaNumber: 'CAPA-2024-0312',
      title: 'Environmental control improvements for tableting suite',
      productId: GOLDEN_PATH_PRODUCT.id,
      productName: GOLDEN_PATH_PRODUCT.name,
      type: 'corrective',
      status: 'implementation',
      priority: 'high',
      initiatedDate: '2024-11-30',
      targetDate: '2025-01-15',
      linkedDeviations: ['gp-dev-001'],
      assignedTo: GOLDEN_PATH_TEAM.qualityHead.name,
      description: 'Implement enhanced humidity monitoring and controls in tableting suite to prevent dissolution specification failures.',
      actions: [
        { id: 'act-1', description: 'Install continuous humidity monitoring system', status: 'in-progress', dueDate: '2024-12-20' },
        { id: 'act-2', description: 'Update batch record to include humidity verification', status: 'completed', completedDate: '2024-12-08' },
        { id: 'act-3', description: 'Retrain operators on environmental controls', status: 'not-started', dueDate: '2025-01-10' },
        { id: 'act-4', description: 'Verify effectiveness with 3 consecutive batches', status: 'not-started', dueDate: '2025-01-15' },
      ],
      effectivenessCheckDate: '2025-02-15',
    },
  ],
  
  // Audit History
  audits: [
    {
      id: 'gp-audit-001',
      auditNumber: 'AUD-2024-045',
      title: 'Pre-PAI Readiness Assessment - Manufacturing Site',
      productId: GOLDEN_PATH_PRODUCT.id,
      type: 'internal',
      scope: 'GMP - Drug Product Manufacturing',
      status: 'completed',
      scheduledDate: '2024-11-01',
      completedDate: '2024-11-08',
      leadAuditor: 'External Consultant - QA Associates',
      findings: {
        critical: 0,
        major: 2,
        minor: 5,
        observations: 8,
      },
      linkedCAPAs: ['gp-capa-001'],
      summary: 'Manufacturing site generally inspection-ready. Two major findings related to environmental monitoring require remediation before PAI.',
    },
    {
      id: 'gp-audit-002',
      auditNumber: 'AUD-2024-052',
      title: 'TMF Inspection Readiness Assessment',
      productId: GOLDEN_PATH_PRODUCT.id,
      type: 'internal',
      scope: 'GCP - Trial Master File',
      status: 'completed',
      scheduledDate: '2024-11-12',
      completedDate: '2024-11-15',
      leadAuditor: 'QA Team',
      findings: {
        critical: 0,
        major: 0,
        minor: 3,
        observations: 4,
      },
      linkedStudy: 'gp-study-301',
      summary: 'TMF is 95% complete and inspection-ready. Minor findings related to site document filing.',
    },
  ],
  
  // Inspector Readiness Summary
  inspectorReadiness: {
    productId: GOLDEN_PATH_PRODUCT.id,
    applicationId: 'gp-app-nda',
    overallScore: 87,
    paiDate: GOLDEN_PATH_TIMELINE.paiDates,
    categories: {
      manufacturing: { score: 82, status: 'needs-attention', openFindings: 2 },
      laboratory: { score: 95, status: 'ready', openFindings: 0 },
      qualitySystem: { score: 88, status: 'on-track', openFindings: 1 },
      documentControl: { score: 92, status: 'ready', openFindings: 0 },
      tmf: { score: 95, status: 'ready', openFindings: 0 },
    },
    criticalActions: [
      { id: 'ca-1', action: 'Complete CAPA-2024-0312 effectiveness verification', dueDate: '2025-01-05', status: 'in-progress' },
      { id: 'ca-2', action: 'Conduct mock PAI with manufacturing team', dueDate: '2024-12-20', status: 'scheduled' },
    ],
  },
};

// ============================================================================
// CMC / CHEMISTRY, MANUFACTURING & CONTROLS
// ============================================================================

export const GOLDEN_PATH_CMC = {
  // Drug Substance
  drugSubstance: {
    productId: GOLDEN_PATH_PRODUCT.id,
    name: 'Ligrastinib',
    chemicalName: '(S)-N-(4-(4-chloro-3-fluorophenoxy)pyridin-2-yl)-2-(4-cyanophenyl)-2-methylpropanamide',
    molecularFormula: 'C22H19ClFN3O2',
    molecularWeight: 411.86,
    appearance: 'White to off-white crystalline powder',
    manufacturer: 'Ligature API Manufacturing, Inc.',
    manufacturingSite: 'Research Triangle Park, NC',
    synthesisRoute: '6-step convergent synthesis',
    polymorphForm: 'Form I (thermodynamically stable)',
    specifications: [
      { test: 'Appearance', specification: 'White to off-white powder', result: 'Complies' },
      { test: 'Identity (IR)', specification: 'Matches reference', result: 'Complies' },
      { test: 'Assay (HPLC)', specification: '98.0-102.0%', result: '99.4%' },
      { test: 'Related substances', specification: 'Any single ≤0.15%, Total ≤0.5%', result: '0.08%, 0.32%' },
      { test: 'Residual solvents', specification: 'Per ICH Q3C', result: 'Complies' },
      { test: 'Water content', specification: '≤0.5%', result: '0.18%' },
    ],
  },
  
  // Drug Product
  drugProduct: {
    productId: GOLDEN_PATH_PRODUCT.id,
    dosageForm: 'Film-coated tablet',
    strength: '200 mg',
    manufacturer: 'Ligature Drug Product Manufacturing, LLC',
    manufacturingSite: 'Cambridge, MA',
    packaging: 'HDPE bottle with child-resistant cap, 30 tablets',
    shelfLife: '24 months',
    storageConditions: '20-25°C (excursions permitted 15-30°C)',
    specifications: [
      { test: 'Appearance', specification: 'Yellow film-coated oval tablet', result: 'Complies' },
      { test: 'Identity (HPLC)', specification: 'RT matches reference', result: 'Complies' },
      { test: 'Assay', specification: '95.0-105.0%', result: '99.8%' },
      { test: 'Dissolution (30 min)', specification: 'NLT 80% (Q)', result: '92%' },
      { test: 'Content uniformity', specification: 'AV ≤15.0', result: 'AV = 3.2' },
      { test: 'Degradation products', specification: 'Any single ≤0.2%, Total ≤1.0%', result: '0.05%, 0.22%' },
    ],
  },
  
  // Clinical Batches
  clinicalBatches: [
    {
      id: 'gp-batch-001',
      batchNumber: 'C-2024-001',
      productId: GOLDEN_PATH_PRODUCT.id,
      type: 'Registration/Commercial',
      manufactureDate: '2024-03-15',
      expiryDate: '2026-03-14',
      batchSize: '500,000 tablets',
      status: 'Released',
      usedInStudy: 'gp-study-301',
      disposition: 'In distribution',
    },
    {
      id: 'gp-batch-002',
      batchNumber: 'C-2024-003',
      productId: GOLDEN_PATH_PRODUCT.id,
      type: 'Registration/Commercial',
      manufactureDate: '2024-06-20',
      expiryDate: '2026-06-19',
      batchSize: '500,000 tablets',
      status: 'Released',
      usedInStudy: 'gp-study-301',
      disposition: 'In distribution',
    },
    {
      id: 'gp-batch-003',
      batchNumber: 'C-2024-005',
      productId: GOLDEN_PATH_PRODUCT.id,
      type: 'Registration/Commercial',
      manufactureDate: '2024-11-15',
      expiryDate: '2026-11-14',
      batchSize: '500,000 tablets',
      status: 'Quarantined',
      linkedDeviation: 'gp-dev-001',
      disposition: 'Pending investigation',
    },
  ],
};

// ============================================================================
// CROSS-MODULE CONNECTIONS MAP
// ============================================================================

export const GOLDEN_PATH_CONNECTIONS = {
  // Map showing how entities connect across modules
  byProduct: {
    productId: GOLDEN_PATH_PRODUCT.id,
    
    // Research connections
    targetPrograms: ['gp-target-001'],
    preclinicalStudies: GOLDEN_PATH_RESEARCH.preclinicalStudies.map(s => s.id),
    
    // Clinical connections
    clinicalStudies: ['gp-study-301'],
    sites: GOLDEN_PATH_CLINICAL.sites.map(s => s.id),
    
    // Regulatory connections
    applications: ['gp-app-ind', 'gp-app-nda', 'gp-app-maa', 'gp-app-jnda'],
    haqs: [...GOLDEN_PATH_HAQS.cmc, ...GOLDEN_PATH_HAQS.clinical, ...GOLDEN_PATH_HAQS.safety].map(h => h.id),
    documents: [
      ...GOLDEN_PATH_DOCUMENTS.module2,
      ...GOLDEN_PATH_DOCUMENTS.module3,
      ...GOLDEN_PATH_DOCUMENTS.module1,
      ...GOLDEN_PATH_DOCUMENTS.clinicalStudyReports,
    ].map(d => d.id),
    
    // Safety connections
    signals: GOLDEN_PATH_SAFETY.signals.map(s => s.id),
    icsrCases: GOLDEN_PATH_SAFETY.icsrCases.map(c => c.id),
    
    // Quality connections
    deviations: GOLDEN_PATH_QMS.deviations.map(d => d.id),
    capas: GOLDEN_PATH_QMS.capas.map(c => c.id),
    audits: GOLDEN_PATH_QMS.audits.map(a => a.id),
    
    // CMC connections
    batches: GOLDEN_PATH_CMC.clinicalBatches.map(b => b.id),
  },
  
  // Cross-reference chains for traceability
  traceability: {
    // Signal -> ICSR -> HAQ -> Document -> Label
    hepatotoxicityChain: {
      signal: 'gp-sig-hepato',
      icsrs: ['gp-icsr-001'],
      haqs: ['gp-haq-safety-1'],
      documents: ['gp-doc-274', 'gp-doc-uspi'],
      labelSection: 'Warnings and Precautions (5.1)',
    },
    
    // Deviation -> CAPA -> Audit -> PAI Readiness
    qualityChain: {
      deviation: 'gp-dev-001',
      capa: 'gp-capa-001',
      audit: 'gp-audit-001',
      paiReadiness: GOLDEN_PATH_QMS.inspectorReadiness,
    },
    
    // Study -> TMF -> CSR -> NDA
    clinicalChain: {
      study: 'gp-study-301',
      tmf: GOLDEN_PATH_TMF.tmfSummary,
      csr: 'gp-csr-301',
      ndaSequence: 'gp-app-nda',
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getGoldenPathEntitiesForProduct = (productId: string) => {
  if (productId !== GOLDEN_PATH_PRODUCT.id) return null;
  return GOLDEN_PATH_CONNECTIONS.byProduct;
};

export const isGoldenPathProduct = (productId: string) => {
  return productId === GOLDEN_PATH_PRODUCT.id;
};

export const getGoldenPathStudyById = (studyId: string) => {
  if (studyId === 'gp-study-301') return GOLDEN_PATH_CLINICAL.phase3Pivotal;
  return null;
};

export const getGoldenPathApplicationById = (appId: string) => {
  const apps = GOLDEN_PATH_REGULATORY;
  if (appId === 'gp-app-ind') return apps.ind;
  if (appId === 'gp-app-nda') return apps.nda;
  if (appId === 'gp-app-maa') return apps.maa;
  if (appId === 'gp-app-jnda') return apps.jnda;
  return null;
};

export const getGoldenPathHAQsForApplication = (appId: string) => {
  if (appId !== 'gp-app-nda') return [];
  return [...GOLDEN_PATH_HAQS.cmc, ...GOLDEN_PATH_HAQS.clinical, ...GOLDEN_PATH_HAQS.safety];
};

export const getGoldenPathDocumentsForApplication = (appId: string) => {
  if (appId !== 'gp-app-nda') return [];
  return [
    ...GOLDEN_PATH_DOCUMENTS.module2,
    ...GOLDEN_PATH_DOCUMENTS.module3,
    ...GOLDEN_PATH_DOCUMENTS.module1,
    ...GOLDEN_PATH_DOCUMENTS.clinicalStudyReports,
  ];
};

export const getGoldenPathSignalsForProduct = (productId: string) => {
  if (productId !== GOLDEN_PATH_PRODUCT.id) return [];
  return GOLDEN_PATH_SAFETY.signals;
};

export const getGoldenPathQMSForProduct = (productId: string) => {
  if (productId !== GOLDEN_PATH_PRODUCT.id) return null;
  return GOLDEN_PATH_QMS;
};

// ============================================================================
// GOLDEN PATH AUTHORING - Complete Document Lifecycle Data
// ============================================================================

export const GOLDEN_PATH_AUTHORING = {
  // CSR being authored - full lifecycle tracking
  csrLifecycle: {
    documentId: 'gp-csr-301',
    currentStage: 'authoring' as const,
    currentStatus: 'drafting' as const,
    currentVersion: '0.8.2',
    versions: [
      {
        id: 'gp-ver-001',
        version: '0.1.0',
        versionType: 'minor' as const,
        status: 'not-started' as const,
        stage: 'planning' as const,
        changeDescription: 'Initial CSR shell created from template',
        createdBy: GOLDEN_PATH_TEAM.medicalWriter.id,
        createdByName: GOLDEN_PATH_TEAM.medicalWriter.name,
        createdAt: '2024-09-01T10:00:00Z',
        wordCount: 500,
        pageCount: 5,
      },
      {
        id: 'gp-ver-002',
        version: '0.5.0',
        versionType: 'minor' as const,
        status: 'drafting' as const,
        stage: 'authoring' as const,
        changeDescription: 'Methods and efficacy sections drafted',
        createdBy: GOLDEN_PATH_TEAM.medicalWriter.id,
        createdByName: GOLDEN_PATH_TEAM.medicalWriter.name,
        createdAt: '2024-10-15T14:00:00Z',
        wordCount: 45000,
        pageCount: 95,
      },
      {
        id: 'gp-ver-003',
        version: '0.8.0',
        versionType: 'minor' as const,
        status: 'internal-review' as const,
        stage: 'review' as const,
        changeDescription: 'Safety section complete, sent for internal review',
        createdBy: GOLDEN_PATH_TEAM.medicalWriter.id,
        createdByName: GOLDEN_PATH_TEAM.medicalWriter.name,
        createdAt: '2024-11-20T09:00:00Z',
        wordCount: 95000,
        pageCount: 200,
      },
      {
        id: 'gp-ver-004',
        version: '0.8.2',
        versionType: 'patch' as const,
        status: 'drafting' as const,
        stage: 'authoring' as const,
        changeDescription: 'Addressing reviewer comments from internal review',
        createdBy: GOLDEN_PATH_TEAM.medicalWriter.id,
        createdByName: GOLDEN_PATH_TEAM.medicalWriter.name,
        createdAt: '2024-12-10T11:00:00Z',
        wordCount: 102000,
        pageCount: 215,
      },
    ],
    assignments: [
      {
        id: 'gp-assign-001',
        assigneeId: GOLDEN_PATH_TEAM.medicalWriter.id,
        assigneeName: GOLDEN_PATH_TEAM.medicalWriter.name,
        assigneeEmail: GOLDEN_PATH_TEAM.medicalWriter.email,
        role: 'author' as const,
        scope: 'full-document' as const,
        status: 'in-progress' as const,
        sectionsAssigned: 16,
        sectionsCompleted: 11,
      },
      {
        id: 'gp-assign-002',
        assigneeId: GOLDEN_PATH_TEAM.clinicalLead.id,
        assigneeName: GOLDEN_PATH_TEAM.clinicalLead.name,
        assigneeEmail: GOLDEN_PATH_TEAM.clinicalLead.email,
        role: 'clinical-lead' as const,
        scope: 'sections' as const,
        assignedSections: ['sec-efficacy', 'sec-conclusions'],
        status: 'in-progress' as const,
        sectionsAssigned: 2,
        sectionsCompleted: 1,
      },
      {
        id: 'gp-assign-003',
        assigneeId: GOLDEN_PATH_TEAM.safetyPhysician.id,
        assigneeName: GOLDEN_PATH_TEAM.safetyPhysician.name,
        assigneeEmail: GOLDEN_PATH_TEAM.safetyPhysician.email,
        role: 'safety-physician' as const,
        scope: 'sections' as const,
        assignedSections: ['sec-safety'],
        status: 'completed' as const,
        sectionsAssigned: 1,
        sectionsCompleted: 1,
      },
    ],
    reviewHistory: [
      {
        id: 'gp-review-001',
        cycleNumber: 1,
        stageName: 'Internal Review',
        startedAt: '2024-11-21T09:00:00Z',
        completedAt: '2024-12-05T16:00:00Z',
        dueDate: '2024-12-01T23:59:59Z',
        status: 'completed' as const,
        outcome: 'approved-with-comments' as const,
        totalComments: 47,
        resolvedComments: 42,
        openComments: 5,
        reviewers: [
          { reviewerId: GOLDEN_PATH_TEAM.clinicalLead.id, reviewerName: GOLDEN_PATH_TEAM.clinicalLead.name, status: 'completed' as const, decision: 'approve-with-comments' as const, commentsProvided: 18 },
          { reviewerId: GOLDEN_PATH_TEAM.safetyPhysician.id, reviewerName: GOLDEN_PATH_TEAM.safetyPhysician.name, status: 'completed' as const, decision: 'approve' as const, commentsProvided: 12 },
          { reviewerId: 'user-biostats-1', reviewerName: 'Dr. Robert Kim', status: 'completed' as const, decision: 'approve-with-comments' as const, commentsProvided: 17 },
        ],
        consolidatedFeedback: 'Overall strong document. Key areas requiring attention: hepatotoxicity signal language needs strengthening per FDA guidance, efficacy tables need consistency check.',
      },
    ],
    qcHistory: [
      {
        id: 'gp-qc-001',
        runAt: '2024-11-18T14:00:00Z',
        runBy: GOLDEN_PATH_TEAM.qcSpecialist.id,
        runByName: GOLDEN_PATH_TEAM.qcSpecialist.name,
        totalChecks: 18,
        passed: 12,
        failed: 3,
        warnings: 3,
      },
    ],
    stageHistory: [
      { fromStage: 'planning' as const, toStage: 'prerequisites' as const, triggeredAt: '2024-09-01T10:00:00Z', reason: 'Document shell created' },
      { fromStage: 'prerequisites' as const, toStage: 'authoring' as const, triggeredAt: '2024-09-15T09:00:00Z', reason: 'Database lock complete, ready for authoring' },
      { fromStage: 'authoring' as const, toStage: 'review' as const, triggeredAt: '2024-11-21T09:00:00Z', reason: 'Submitted for internal review' },
      { fromStage: 'review' as const, toStage: 'authoring' as const, triggeredAt: '2024-12-06T09:00:00Z', reason: 'Addressing reviewer comments' },
    ],
  },
  
  // Clinical Overview - in cross-functional review
  clinicalOverviewLifecycle: {
    documentId: 'gp-doc-25',
    currentStage: 'review' as const,
    currentStatus: 'cross-functional-review' as const,
    currentVersion: '2.3.0',
    reviewHistory: [
      {
        id: 'gp-review-co-001',
        cycleNumber: 1,
        stageName: 'Peer Review',
        status: 'completed' as const,
        outcome: 'approved' as const,
        totalComments: 12,
      },
      {
        id: 'gp-review-co-002',
        cycleNumber: 2,
        stageName: 'Cross-Functional Review',
        status: 'in-progress' as const,
        startedAt: '2024-12-10T09:00:00Z',
        dueDate: '2024-12-17T23:59:59Z',
        totalComments: 8,
        reviewers: [
          { reviewerId: GOLDEN_PATH_TEAM.clinicalLead.id, reviewerName: GOLDEN_PATH_TEAM.clinicalLead.name, status: 'completed' as const, decision: 'approve' as const, commentsProvided: 3 },
          { reviewerId: GOLDEN_PATH_TEAM.safetyPhysician.id, reviewerName: GOLDEN_PATH_TEAM.safetyPhysician.name, status: 'in-progress' as const, commentsProvided: 2 },
          { reviewerId: GOLDEN_PATH_TEAM.regulatoryLead.id, reviewerName: GOLDEN_PATH_TEAM.regulatoryLead.name, status: 'pending' as const, commentsProvided: 0 },
          { reviewerId: GOLDEN_PATH_TEAM.cmcLead.id, reviewerName: GOLDEN_PATH_TEAM.cmcLead.name, status: 'completed' as const, decision: 'approve' as const, commentsProvided: 3 },
        ],
      },
    ],
  },
  
  // Clinical Safety Summary - in QC
  clinicalSafetyLifecycle: {
    documentId: 'gp-doc-274',
    currentStage: 'qc' as const,
    currentStatus: 'qc-review' as const,
    currentVersion: '2.2.0',
    lastQCRun: {
      runAt: '2024-12-14T10:00:00Z',
      totalChecks: 20,
      passed: 16,
      failed: 2,
      warnings: 2,
      criticalFindings: [
        { checkName: 'Table Cross-References', finding: 'Table 12.3 referenced but not found', severity: 'critical' as const },
        { checkName: 'Hepatotoxicity Section', finding: 'Signal language needs alignment with USPI draft', severity: 'major' as const },
      ],
    },
  },
  
  // USPI Draft - early authoring
  uspiLifecycle: {
    documentId: 'gp-doc-uspi',
    currentStage: 'authoring' as const,
    currentStatus: 'drafting' as const,
    currentVersion: '0.9.0',
    progress: {
      highlights: 100,
      indicationsUsage: 95,
      dosageAdmin: 85,
      warningsPrecautions: 70, // Active focus due to hepatotoxicity signal
      adverseReactions: 60,
      drugInteractions: 50,
      useInSpecificPops: 40,
      overall: 68,
    },
    linkedSignals: ['gp-sig-hepato', 'gp-sig-ild'],
    haLabelComments: [
      { section: 'Warnings and Precautions', comment: 'Consider boxed warning for hepatotoxicity based on signal severity', source: 'FDA Day-74', priority: 'high' as const },
    ],
  },
};

// ============================================================================
// v70: eCTD BUILDING - Complete Submission Builds
// ============================================================================

export const GOLDEN_PATH_ECTD_BUILDS = {
  // Original NDA submission - sequence 0000
  originalNdaBuild: {
    id: 'gp-build-nda-0000',
    applicationId: GOLDEN_PATH_PRODUCT.ndaNumber,
    applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
    sequenceNumber: '0000',
    submissionType: 'original' as const,
    submissionDescription: 'Original NDA submission for LIG-2847 (Nexavant) for treatment of KRAS G12C+ NSCLC',
    targetAgency: 'us-fda' as const,
    ectdVersion: '4.0' as const,
    regionalVariant: 'us' as const,
    status: 'submitted' as const,
    createdAt: '2024-05-01T08:00:00Z',
    submittedAt: GOLDEN_PATH_TIMELINE.ndaSubmission,
    
    // Document assignments (partial for demo)
    assignedDocuments: {
      'm1-2': { title: 'Cover Letter - Original NDA Submission', fileName: 'cover-letter.pdf', status: 'validated' },
      'm1-3-1': { title: 'FDA Form 356h', fileName: 'fda-form-356h.pdf', status: 'validated' },
      'm1-14-1': { title: 'Draft USPI', fileName: 'draft-uspi.pdf', status: 'validated' },
      'm2-2': { title: 'CTD Introduction', fileName: 'ctd-introduction.pdf', status: 'validated' },
      'm2-3': { title: 'Quality Overall Summary', fileName: 'qos.pdf', status: 'validated' },
      'm2-4': { title: 'Nonclinical Overview', fileName: 'nonclinical-overview.pdf', status: 'validated' },
      'm2-5': { title: 'Clinical Overview', fileName: 'clinical-overview.pdf', status: 'validated' },
      'm2-7-3': { title: 'Summary of Clinical Efficacy', fileName: 'sce.pdf', status: 'validated' },
      'm2-7-4': { title: 'Summary of Clinical Safety', fileName: 'scs.pdf', status: 'validated' },
      'm3-2-s-1': { title: 'Drug Substance - General Information', fileName: 'ds-general.pdf', status: 'validated' },
      'm3-2-p-1': { title: 'Drug Product - Description and Composition', fileName: 'dp-description.pdf', status: 'validated' },
      'm5-3-5-1': { title: 'CSR LIG-2847-301 (APEX-LUNG)', fileName: 'csr-apex-lung.pdf', status: 'validated' },
    },
    
    validationSummary: {
      totalChecks: 156,
      passedChecks: 156,
      errors: 0,
      warnings: 3,
      canSubmit: true,
    },
    
    totalLeaves: 247,
    assignedLeaves: 247,
    validatedLeaves: 247,
  },
  
  // Day-74 Response sequence - sequence 0001
  day74ResponseBuild: {
    id: 'gp-build-nda-0001',
    applicationId: GOLDEN_PATH_PRODUCT.ndaNumber,
    applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
    sequenceNumber: '0001',
    submissionType: 'ir-response' as const,
    submissionDescription: 'Response to FDA Day-74 Information Requests',
    targetAgency: 'us-fda' as const,
    ectdVersion: '4.0' as const,
    regionalVariant: 'us' as const,
    status: 'building' as const,
    createdAt: '2024-11-01T08:00:00Z',
    targetSubmissionDate: GOLDEN_PATH_TIMELINE.day74Response,
    
    // Current state for demo
    assignedDocuments: {
      'm1-2': { title: 'Cover Letter - IR Response', fileName: 'cover-letter-ir.pdf', status: 'validated' },
      'm1-12-1': { title: 'IR Response Document', fileName: 'ir-response.pdf', status: 'pending' },
      'm2-7-4': { title: 'Summary of Clinical Safety (Amended)', fileName: 'scs-amended.pdf', status: 'pending' },
    },
    
    validationSummary: {
      totalChecks: 24,
      passedChecks: 20,
      errors: 2,
      warnings: 2,
      canSubmit: false,
      blockers: [
        'IR Response document not finalized - QC review pending',
        'Hepatotoxicity section requires cross-reference validation'
      ]
    },
    
    buildProgress: {
      phase: 'document-assignment' as const,
      percentComplete: 65,
      currentStep: 'Awaiting document finalization from Authoring',
      steps: [
        { id: 'create', name: 'Create Build', status: 'complete' as const, completedAt: '2024-11-01T08:00:00Z' },
        { id: 'template', name: 'Apply Template', status: 'complete' as const, completedAt: '2024-11-01T08:05:00Z' },
        { id: 'assign', name: 'Document Assignment', status: 'in-progress' as const, startedAt: '2024-11-01T08:10:00Z' },
        { id: 'validate', name: 'Validation', status: 'pending' as const },
        { id: 'backbone', name: 'Backbone Generation', status: 'pending' as const },
        { id: 'package', name: 'Packaging', status: 'pending' as const },
      ]
    },
    
    totalLeaves: 12,
    assignedLeaves: 8,
    validatedLeaves: 5,
    
    // Links to HAQ response
    linkedHAQs: ['gp-haq-001', 'gp-haq-002', 'gp-haq-003'],
  },
  
  // Annual Report template (future)
  annualReportTemplate: {
    id: 'gp-build-ar-2025',
    applicationId: GOLDEN_PATH_PRODUCT.ndaNumber,
    applicationNumber: GOLDEN_PATH_PRODUCT.ndaNumber,
    sequenceNumber: '0002',
    submissionType: 'annual-report' as const,
    submissionDescription: 'Annual Report - Year 1 (Projected)',
    targetAgency: 'us-fda' as const,
    ectdVersion: '4.0' as const,
    regionalVariant: 'us' as const,
    status: 'draft' as const,
    createdAt: '2024-12-01T08:00:00Z',
    targetSubmissionDate: '2026-02-15',
    
    totalLeaves: 8,
    assignedLeaves: 0,
    validatedLeaves: 0,
  },
  
  // EU MAA Original - sequence 0000
  maaOriginalBuild: {
    id: 'gp-build-maa-0000',
    applicationId: GOLDEN_PATH_PRODUCT.maaNumber,
    applicationNumber: GOLDEN_PATH_PRODUCT.maaNumber,
    sequenceNumber: '0000',
    submissionType: 'original' as const,
    submissionDescription: 'Original MAA submission for Nexavant (ligrastinib)',
    targetAgency: 'eu-ema' as const,
    ectdVersion: '4.0' as const,
    regionalVariant: 'eu' as const,
    status: 'submitted' as const,
    createdAt: '2024-05-15T08:00:00Z',
    submittedAt: GOLDEN_PATH_TIMELINE.maaSubmission,
    
    validationSummary: {
      totalChecks: 162,
      passedChecks: 162,
      errors: 0,
      warnings: 5,
      canSubmit: true,
    },
    
    totalLeaves: 263,
    assignedLeaves: 263,
    validatedLeaves: 263,
  },
};

// Templates for sequence building
export const GOLDEN_PATH_SEQUENCE_TEMPLATES = [
  {
    id: 'gp-tpl-original-nda',
    name: 'Original NDA - Full Submission',
    description: 'Complete template for original NDA submissions including all required CTD modules',
    submissionType: 'original' as const,
    agency: 'us-fda' as const,
    requiredSections: ['m1-2', 'm1-3-1', 'm1-14-1', 'm2-2', 'm2-3', 'm2-4', 'm2-5', 'm2-6', 'm2-7', 'm3-2-s', 'm3-2-p', 'm4-2', 'm5-3-5-1'],
    usageCount: 12,
  },
  {
    id: 'gp-tpl-ir-response',
    name: 'Information Request Response',
    description: 'Streamlined template for responding to FDA information requests',
    submissionType: 'ir-response' as const,
    agency: 'us-fda' as const,
    requiredSections: ['m1-2', 'm1-12-1'],
    usageCount: 8,
  },
  {
    id: 'gp-tpl-safety-update',
    name: 'Safety Update Submission',
    description: 'Template for submitting safety updates and DSUR-related sequences',
    submissionType: 'amendment' as const,
    agency: 'us-fda' as const,
    requiredSections: ['m1-2', 'm5-3-6'],
    usageCount: 5,
  },
  {
    id: 'gp-tpl-type-ii',
    name: 'Type II Variation (EU)',
    description: 'Major variation submission for EMA',
    submissionType: 'type-ii' as const,
    agency: 'eu-ema' as const,
    requiredSections: ['m1-2', 'm2-3', 'm2-5', 'm2-7'],
    usageCount: 3,
  },
];

// Export a unified "Golden Path" object for easy access
export const GOLDEN_PATH = {
  product: GOLDEN_PATH_PRODUCT,
  timeline: GOLDEN_PATH_TIMELINE,
  team: GOLDEN_PATH_TEAM,
  research: GOLDEN_PATH_RESEARCH,
  clinical: GOLDEN_PATH_CLINICAL,
  regulatory: GOLDEN_PATH_REGULATORY,
  documents: GOLDEN_PATH_DOCUMENTS,
  haqs: GOLDEN_PATH_HAQS,
  safety: GOLDEN_PATH_SAFETY,
  tmf: GOLDEN_PATH_TMF,
  qms: GOLDEN_PATH_QMS,
  cmc: GOLDEN_PATH_CMC,
  connections: GOLDEN_PATH_CONNECTIONS,
  authoring: GOLDEN_PATH_AUTHORING,
  ectdBuilds: GOLDEN_PATH_ECTD_BUILDS,
  sequenceTemplates: GOLDEN_PATH_SEQUENCE_TEMPLATES,
} as const;

export default GOLDEN_PATH;
