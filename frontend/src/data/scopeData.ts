/**
 * scopeData.ts — v0.125.30
 *
 * The full program hierarchy for Ligature's scope model:
 *
 *   TherapeuticArea
 *     └── Program (product/compound)
 *           ├── DEVELOPMENT
 *           │     ├── ClinicalStudy[]         (investigational)
 *           │     └── RegulatoryApplication[] (IND / CTA)
 *           │           └── studyIds[]        (one IND → many studies)
 *           └── MARKETED
 *                 ├── RegulatoryApplication[] (NDA / MAA / JNDA)
 *                 │     └── MarketAuthorisation[] (one per country)
 *                 └── PostApprovalStudy[]     (Phase 4 / PASS / PAES)
 *
 * Rules:
 * - Common scientific content (protocol, CTD 2-5) is referenced, not copied.
 * - Applications are unique per authority/region.
 * - MarketAuthorisations only exist where an application has been submitted.
 * - EU member states appear under EMA applications only.
 */

import type { ApplicationType } from '@/data/referenceData';
import { isDevApplicationType } from '@/data/referenceData';

// ─── Core types ────────────────────────────────────────────────────────────────

export type PortfolioType = 'development' | 'marketed';

export type StudyPhase =
  | 'Phase 1' | 'Phase 1/2' | 'Phase 2' | 'Phase 2b'
  | 'Phase 3' | 'Phase 3b' | 'Phase 4' | 'PASS' | 'PAES' | 'RWE';

export type StudyStatus =
  | 'Planning' | 'Enrolling' | 'Active' | 'Completed'
  | 'On Hold' | 'Terminated' | 'Results Available';

export type ApplicationStatus =
  | 'Active' | 'Submitted' | 'Under Review' | 'Approved'
  | 'CRL' | 'Withdrawn' | 'Planning';

export type MarketStatus =
  | 'Pending Approval' | 'Approved' | 'Launched'
  | 'Suspended' | 'Withdrawn';

export type ScopeLevel =
  | 'ta'            // therapeutic area
  | 'program'       // product / compound
  | 'development'   // development portfolio branch
  | 'study'         // individual clinical study
  | 'dev-app'       // investigational application (IND/CTA)
  | 'marketed'      // marketed portfolio branch
  | 'auth'          // marketing authorisation (NDA/MAA/JNDA)
  | 'region'        // regulatory region (FDA/EMA/PMDA)
  | 'country';      // individual country market

// ─── Program ───────────────────────────────────────────────────────────────────

export interface Program {
  id: string;                  // 'lig-2847'
  name: string;                // 'LIG-2847'
  brandName?: string;          // 'Nexavant'
  genericName: string;         // 'ligrastinib'
  therapeuticAreaId: string;   // 'oncology'
  modality: string;            // 'Small Molecule'
  indication: string;          // 'KRAS G12C+ NSCLC'
  mechanismOfAction?: string;
  hasMarketedStatus: boolean;  // true = has at least one approved MA
}

// ─── Clinical Study ────────────────────────────────────────────────────────────

// ─── CTMS Extended Types ──────────────────────────────────────────────────────

export type SiteActivationStage =
  | 'Feasibility' | 'Site Selection' | 'Contracting'
  | 'IRB/IEC Submission' | 'IRB/IEC Approval' | 'SIV' | 'Activated' | 'Closed';

export type IRBStatus = 'Pending' | 'Submitted' | 'Approved' | 'Suspended';
export type RAGStatus = 'Green' | 'Amber' | 'Red';
export type MonitoringVisitType = 'SIV' | 'RMV' | 'COV' | 'For-Cause';
export type DeviationCategory =
  | 'Inclusion/Exclusion Criteria' | 'Informed Consent'
  | 'Protocol Procedures' | 'Study Drug Administration' | 'Visit Windows';
export type DeviationSeverity = 'Major' | 'Minor' | 'Protocol';
export type BlindingStatus = 'Blinded' | 'Open-Label' | 'Unblinded';
export type TLFOutputStatus = 'Shell' | 'Programming' | 'QC' | 'Statistician Review' | 'Approved' | 'Locked';
export type TLFOutputType = 'Table' | 'Listing' | 'Figure';

export interface TLFShellItem {
  id: string;
  number: string;
  title: string;
  type: TLFOutputType;
  csrSection: string;
  sourceDataset: string;
  programmer?: string;
  status: TLFOutputStatus;
  dueDate?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface StudySite {
  id: string;
  name: string;
  country: string;
  countryCode: string;
  countryFlag: string;
  principalInvestigator: string;
  activationStage: SiteActivationStage;
  irbStatus: IRBStatus;
  activatedDate?: string;
  enrolled: number;
  target: number;
  sdvRate: number;           // 0–100 %
  lastMonitoringVisit?: string;
  lastVisitType?: MonitoringVisitType;
  ragStatus: RAGStatus;
  cvStatus: 'Complete' | 'Pending' | 'Missing';
  financialDisclosure: 'Complete' | 'Pending' | 'Missing';
}

export interface ProtocolDeviation {
  id: string;
  date: string;
  siteId: string;
  siteName: string;
  category: DeviationCategory;
  severity: DeviationSeverity;
  description: string;
  status: 'Open' | 'Resolved' | 'CAPA Pending';
}

export interface MonitoringVisit {
  id: string;
  siteId: string;
  siteName: string;
  date: string;
  monitor: string;
  visitType: MonitoringVisitType;
  criticalFindings: number;
  majorFindings: number;
  minorFindings: number;
  capaStatus: 'Open' | 'Closed' | 'In Progress';
}

export interface QueryDomainCounts {
  AE: number; CM: number; DM: number; DS: number; EX: number;
  LB: number; MH: number; PE: number; VS: number;
}

export interface ClinicalStudy {
  id: string;                  // 'study-lig2847-301'
  programId: string;
  portfolioType: PortfolioType;
  protocolNumber: string;      // 'LIG-2847-301'
  title: string;               // full protocol title
  shortTitle: string;
  phase: StudyPhase;
  status: StudyStatus;
  indication: string;
  primaryEndpoint?: string;
  enrolledSubjects: number;
  targetEnrollment: number;
  activeSites: number;
  activeRegions: string[];     // country codes where study is running
  startDate: string;
  primaryCompletionDate?: string;
  estimatedCompletion: string;
  masterProtocolId?: string;   // ref to shared protocol document
  masterICFId?: string;        // ref to master ICF template
  // CTMS extended fields
  sites?: StudySite[];
  deviations?: ProtocolDeviation[];
  monitoringVisits?: MonitoringVisit[];
  queryByDomain?: QueryDomainCounts;
  screenFailRate?: number;     // %
  randomisationRatio?: string; // '1:1', '2:1' etc.
  impBatchesReleased?: number;
  impBatchesAvailable?: number;
  // Blinding
  blindingStatus?: BlindingStatus;
  randomisationCodeHolder?: string;
  // TLF Shell
  tlfOutputs?: TLFShellItem[];
}

// ─── Regulatory Application ────────────────────────────────────────────────────

export interface RegulatoryApplication {
  id: string;                  // 'app-ind-us-lig2847'
  programId: string;
  portfolioType: PortfolioType;
  type: ApplicationType;
  authorityId: string;         // 'fda' | 'ema' | 'pmda' ...
  regionCode: string;          // 'US' | 'EU' | 'JP' ...
  regionFlag: string;          // '🇺🇸' | '🇪🇺' | '🇯🇵' ...
  applicationNumber: string;   // 'IND 123456' | 'NDA 215847'
  status: ApplicationStatus;

  // Development applications — which studies are covered
  studyIds?: string[];         // one IND can cover multiple studies

  // Marketed applications — which countries have market authorisations
  marketAuthorisations?: MarketAuthorisation[];

  // Lifecycle
  submissionDate?: string;
  approvalDate?: string;
  pdufahDate?: string;         // FDA PDUFA / EMA opinion date
  currentSequence: number;
  totalSequences: number;

  // Shared scientific content references (not copied)
  sharedCTDModules?: string[]; // refs to common CTD module document IDs
}

// ─── Market Authorisation ─────────────────────────────────────────────────────
// One per country — exists only if an application covers that market

export interface MarketAuthorisation {
  id: string;
  applicationId: string;       // parent RegulatoryApplication
  countryCode: string;         // ISO 3166-1 alpha-2
  countryName: string;
  flag: string;
  iso3: string;                // ISO 3166-1 alpha-3
  isEUMemberState: boolean;
  status: MarketStatus;
  approvalDate?: string;
  launchDate?: string;
  localLabelVersion?: string;
  pilLanguage?: string;        // local PIL language
  localQPPV?: string;          // local QPPV contact
}

// ─── Programs ──────────────────────────────────────────────────────────────────

export const PROGRAMS: Program[] = [
  // ── Oncology ───────────────────────────────────────────────────────────────
  {
    id: 'lig-2847',
    name: 'LIG-2847',
    brandName: 'Nexavant',
    genericName: 'ligrastinib',
    therapeuticAreaId: 'oncology',
    modality: 'Small Molecule',
    indication: 'KRAS G12C+ NSCLC',
    mechanismOfAction: 'Selective KRAS G12C covalent inhibitor',
    hasMarketedStatus: false,
  },
  {
    id: 'lig-1182',
    name: 'LIG-1182',
    brandName: 'Oncorix',
    genericName: 'ligamab',
    therapeuticAreaId: 'oncology',
    modality: 'Monoclonal Antibody',
    indication: 'HER2+ Breast Cancer',
    mechanismOfAction: 'Anti-HER2 monoclonal antibody',
    hasMarketedStatus: false,
  },
  {
    id: 'lig-3156',
    name: 'LIG-3156',
    brandName: 'Melnorix',
    genericName: 'ligorafenib',
    therapeuticAreaId: 'oncology',
    modality: 'Small Molecule',
    indication: 'BRAF V600E+ Melanoma',
    hasMarketedStatus: false,
  },

  // ── Immunology ─────────────────────────────────────────────────────────────
  {
    id: 'lig-3021',
    name: 'LIG-3021',
    brandName: 'Rheumaclar',
    genericName: 'ligatinib',
    therapeuticAreaId: 'immunology',
    modality: 'Small Molecule',
    indication: 'Rheumatoid Arthritis',
    mechanismOfAction: 'JAK1/2 selective inhibitor',
    hasMarketedStatus: true,
  },
  {
    id: 'lig-3089',
    name: 'LIG-3089',
    brandName: 'Dermala',
    genericName: 'ligalizumab',
    therapeuticAreaId: 'immunology',
    modality: 'Monoclonal Antibody',
    indication: 'Atopic Dermatitis',
    hasMarketedStatus: false,
  },

  // ── Neurology ──────────────────────────────────────────────────────────────
  {
    id: 'lig-4602',
    name: 'LIG-4602',
    brandName: 'Migrela',
    genericName: 'ligamigran',
    therapeuticAreaId: 'neurology',
    modality: 'Small Molecule',
    indication: 'Chronic Migraine',
    hasMarketedStatus: false,
  },

  // ── Rare Disease ───────────────────────────────────────────────────────────
  {
    id: 'lig-5500',
    name: 'LIG-5500',
    brandName: 'Spinagen',
    genericName: 'ligasiran',
    therapeuticAreaId: 'rare-disease',
    modality: 'Gene Therapy',
    indication: 'Spinal Muscular Atrophy',
    hasMarketedStatus: false,
  },

  // ── Cardiology ─────────────────────────────────────────────────────────────
  {
    id: 'lig-6100',
    name: 'LIG-6100',
    brandName: 'Cardiostat',
    genericName: 'ligastatin',
    therapeuticAreaId: 'cardiology',
    modality: 'Small Molecule',
    indication: 'Hypercholesterolaemia',
    hasMarketedStatus: true,
  },
];

// ─── Clinical Studies ──────────────────────────────────────────────────────────

export const CLINICAL_STUDIES: ClinicalStudy[] = [
  // ── LIG-2847 Development ───────────────────────────────────────────────────
  {
    id: 'study-lig2847-101',
    programId: 'lig-2847',
    portfolioType: 'development',
    protocolNumber: 'LIG-2847-101',
    title: 'A Phase 1, First-in-Human, Dose-Escalation Study of Ligrastinib in Patients with Advanced Solid Tumours',
    shortTitle: 'LIG-2847-101 Phase 1 FIH',
    phase: 'Phase 1',
    status: 'Completed',
    indication: 'Advanced Solid Tumours',
    primaryEndpoint: 'MTD / RP2D determination',
    enrolledSubjects: 156,
    targetEnrollment: 150,
    activeSites: 0,
    activeRegions: ['US', 'AU'],
    startDate: '2021-06-15',
    estimatedCompletion: '2023-03-30',
  },
  {
    id: 'study-lig2847-201',
    programId: 'lig-2847',
    portfolioType: 'development',
    protocolNumber: 'LIG-2847-201',
    title: 'A Phase 2b, Open-Label, Dose-Finding Study of Ligrastinib in Patients with KRAS G12C+ NSCLC',
    shortTitle: 'LIG-2847-201 Phase 2b Dose-Finding',
    phase: 'Phase 2b',
    status: 'Completed',
    indication: 'KRAS G12C+ NSCLC',
    primaryEndpoint: 'ORR per RECIST 1.1',
    enrolledSubjects: 320,
    targetEnrollment: 300,
    activeSites: 0,
    activeRegions: ['US', 'EU', 'JP'],
    startDate: '2022-03-01',
    estimatedCompletion: '2024-01-15',
  },
  {
    id: 'study-lig2847-301',
    programId: 'lig-2847',
    portfolioType: 'development',
    protocolNumber: 'LIG-2847-301',
    title: 'A Randomised, Double-Blind, Placebo-Controlled Phase 3 Study of Ligrastinib in Previously Treated Advanced KRAS G12C+ NSCLC (2L+)',
    shortTitle: 'LIG-2847-301 Phase 3 (2L+ NSCLC)',
    phase: 'Phase 3',
    status: 'Completed',
    indication: 'KRAS G12C+ NSCLC (2L+)',
    primaryEndpoint: 'Overall Survival',
    enrolledSubjects: 847,
    targetEnrollment: 800,
    activeSites: 0,
    activeRegions: ['US', 'EU', 'JP', 'AU', 'CA'],
    startDate: '2022-09-15',
    primaryCompletionDate: '2024-06-30',
    estimatedCompletion: '2024-06-30',
    blindingStatus: 'Unblinded',
    randomisationCodeHolder: 'IQVIA IVRS',
    queryByDomain: { AE: 0, CM: 0, DM: 0, DS: 0, EX: 0, LB: 0, MH: 0, PE: 0, VS: 0 },
    tlfOutputs: [
      { id:'tlf-301-001', number:'T-14.1.1', title:'Summary of Subject Disposition', type:'Table', csrSection:'ICH E3 §10.1', sourceDataset:'ADSL', status:'Locked', programmer:'J. Smith', priority:'high' },
      { id:'tlf-301-002', number:'T-14.2.1', title:'Demographics and Baseline Characteristics', type:'Table', csrSection:'ICH E3 §11.2', sourceDataset:'ADSL', status:'Locked', programmer:'J. Smith', priority:'high' },
      { id:'tlf-301-003', number:'T-14.3.1', title:'Overall Summary of TEAEs', type:'Table', csrSection:'ICH E3 §12.1', sourceDataset:'ADAE', status:'Locked', programmer:'S. Johnson', priority:'high' },
      { id:'tlf-301-004', number:'F-14.2.1', title:'Kaplan-Meier Plot — Overall Survival', type:'Figure', csrSection:'ICH E3 §11.4', sourceDataset:'ADTTE', status:'Locked', programmer:'S. Johnson', priority:'high' },
      { id:'tlf-301-005', number:'L-16.2.1', title:'Listing of Subjects with SAEs', type:'Listing', csrSection:'ICH E3 §12.1', sourceDataset:'ADAE', status:'Locked', programmer:'D. Chen', priority:'medium' },
      { id:'tlf-301-006', number:'T-14.4.1', title:'Primary Efficacy Analysis — Overall Survival', type:'Table', csrSection:'ICH E3 §11.4', sourceDataset:'ADTTE', status:'Locked', programmer:'S. Johnson', priority:'high' },
      { id:'tlf-301-007', number:'T-14.5.1', title:'Summary of Laboratory Abnormalities', type:'Table', csrSection:'ICH E3 §12.2', sourceDataset:'ADLB', status:'Locked', programmer:'A. Lee', priority:'medium' },
      { id:'tlf-301-008', number:'F-14.3.1', title:'Forest Plot — OS Subgroup Analysis', type:'Figure', csrSection:'ICH E3 §11.5', sourceDataset:'ADTTE', status:'Locked', programmer:'D. Chen', priority:'high' },
    ],
  },
  {
    id: 'study-lig2847-302',
    programId: 'lig-2847',
    portfolioType: 'development',
    protocolNumber: 'LIG-2847-302',
    title: 'A Randomised, Double-Blind Phase 3 Study of Ligrastinib vs Docetaxel as First-Line Therapy in Advanced KRAS G12C+ NSCLC (1L)',
    shortTitle: 'LIG-2847-302 Phase 3 (1L NSCLC)',
    phase: 'Phase 3',
    status: 'Enrolling',
    indication: 'KRAS G12C+ NSCLC (1L)',
    primaryEndpoint: 'Progression-Free Survival',
    enrolledSubjects: 234,
    targetEnrollment: 600,
    activeSites: 85,
    activeRegions: ['US', 'EU', 'JP', 'CA', 'AU', 'KR'],
    startDate: '2024-01-15',
    estimatedCompletion: '2026-06-30',
    screenFailRate: 18,
    randomisationRatio: '1:1',
    impBatchesReleased: 12,
    impBatchesAvailable: 8,
    blindingStatus: 'Blinded',
    randomisationCodeHolder: 'IQVIA RTSM / IVRS',
    queryByDomain: { AE: 34, CM: 12, DM: 5, DS: 8, EX: 19, LB: 47, MH: 3, PE: 11, VS: 28 },
    tlfOutputs: [
      { id:'tlf-302-001', number:'T-14.1.1', title:'Summary of Subject Disposition', type:'Table', csrSection:'ICH E3 §10.1', sourceDataset:'ADSL', status:'Programming', programmer:'J. Smith', priority:'high', dueDate:'2026-08-01' },
      { id:'tlf-302-002', number:'T-14.2.1', title:'Demographics and Baseline Characteristics', type:'Table', csrSection:'ICH E3 §11.2', sourceDataset:'ADSL', status:'Shell', priority:'high', dueDate:'2026-08-15' },
      { id:'tlf-302-003', number:'T-14.3.1', title:'Overall Summary of TEAEs', type:'Table', csrSection:'ICH E3 §12.1', sourceDataset:'ADAE', status:'Shell', priority:'high', dueDate:'2026-08-20' },
      { id:'tlf-302-004', number:'F-14.2.1', title:'Kaplan-Meier Plot — Progression-Free Survival', type:'Figure', csrSection:'ICH E3 §11.4', sourceDataset:'ADTTE', status:'Shell', priority:'high', dueDate:'2026-09-01' },
      { id:'tlf-302-005', number:'L-16.2.1', title:'Listing of Subjects with SAEs', type:'Listing', csrSection:'ICH E3 §12.1', sourceDataset:'ADAE', status:'Shell', priority:'medium', dueDate:'2026-08-25' },
      { id:'tlf-302-006', number:'T-14.4.1', title:'Primary Efficacy Analysis — PFS (ITT)', type:'Table', csrSection:'ICH E3 §11.4', sourceDataset:'ADTTE', status:'Shell', priority:'high', dueDate:'2026-09-15' },
    ],
    sites: [
      { id:'site-302-001', name:'Memorial Sloan Kettering Cancer Center', country:'United States', countryCode:'US', countryFlag:'🇺🇸', principalInvestigator:'Dr. Jessica Torres', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-02-15', enrolled:28, target:40, sdvRate:94, lastMonitoringVisit:'2025-03-10', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-302-002', name:'MD Anderson Cancer Center', country:'United States', countryCode:'US', countryFlag:'🇺🇸', principalInvestigator:'Dr. Michael Chen', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-02-20', enrolled:31, target:40, sdvRate:91, lastMonitoringVisit:'2025-03-18', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-302-003', name:'Gustave Roussy Cancer Campus', country:'France', countryCode:'FR', countryFlag:'🇫🇷', principalInvestigator:'Dr. Sophie Laurent', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-03-01', enrolled:19, target:35, sdvRate:88, lastMonitoringVisit:'2025-02-28', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-302-004', name:'National Cancer Center Hospital East', country:'Japan', countryCode:'JP', countryFlag:'🇯🇵', principalInvestigator:'Dr. Kenji Nakamura', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-04-15', enrolled:14, target:30, sdvRate:96, lastMonitoringVisit:'2025-03-05', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-302-005', name:'Princess Margaret Cancer Centre', country:'Canada', countryCode:'CA', countryFlag:'🇨🇦', principalInvestigator:'Dr. Amanda Wilson', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-03-20', enrolled:12, target:25, sdvRate:79, lastMonitoringVisit:'2025-01-15', lastVisitType:'RMV', ragStatus:'Amber', cvStatus:'Complete', financialDisclosure:'Pending' },
      { id:'site-302-006', name:'Peter MacCallum Cancer Centre', country:'Australia', countryCode:'AU', countryFlag:'🇦🇺', principalInvestigator:'Dr. James Robertson', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-04-01', enrolled:9, target:20, sdvRate:83, lastMonitoringVisit:'2025-02-10', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-302-007', name:'Asan Medical Center', country:'South Korea', countryCode:'KR', countryFlag:'🇰🇷', principalInvestigator:'Dr. Soo-Hyun Park', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-05-01', enrolled:7, target:20, sdvRate:72, lastMonitoringVisit:'2024-12-20', lastVisitType:'SIV', ragStatus:'Amber', cvStatus:'Pending', financialDisclosure:'Complete' },
      { id:'site-302-008', name:'Charité Universitätsmedizin Berlin', country:'Germany', countryCode:'DE', countryFlag:'🇩🇪', principalInvestigator:'Dr. Klaus Weber', activationStage:'IRB/IEC Approval', irbStatus:'Approved', activatedDate:undefined, enrolled:0, target:25, sdvRate:0, lastMonitoringVisit:undefined, lastVisitType:undefined, ragStatus:'Amber', cvStatus:'Complete', financialDisclosure:'Pending' },
    ],
    deviations: [
      { id:'dev-302-001', date:'2025-01-08', siteId:'site-302-005', siteName:'Princess Margaret Cancer Centre', category:'Inclusion/Exclusion Criteria', severity:'Major', description:'Subject enrolled with ECOG PS 2 vs protocol-specified ECOG PS 0–1', status:'CAPA Pending' },
      { id:'dev-302-002', date:'2025-02-14', siteId:'site-302-001', siteName:'Memorial Sloan Kettering', category:'Visit Windows', severity:'Minor', description:'Cycle 3 Day 1 assessment performed 4 days outside ±3-day window', status:'Resolved' },
      { id:'dev-302-003', date:'2025-01-22', siteId:'site-302-007', siteName:'Asan Medical Center', category:'Informed Consent', severity:'Major', description:'Amended ICF v2.1 not re-consented prior to optional biopsy', status:'Open' },
      { id:'dev-302-004', date:'2025-03-01', siteId:'site-302-002', siteName:'MD Anderson Cancer Center', category:'Study Drug Administration', severity:'Minor', description:'Dose reduction applied without corresponding dose modification form completion', status:'Resolved' },
      { id:'dev-302-005', date:'2024-12-10', siteId:'site-302-003', siteName:'Gustave Roussy', category:'Protocol Procedures', severity:'Minor', description:'CT scan performed on non-protocol-specified scanner without prior waiver', status:'Resolved' },
    ],
    monitoringVisits: [
      { id:'mv-302-001', siteId:'site-302-001', siteName:'Memorial Sloan Kettering', date:'2025-03-10', monitor:'S. Patel', visitType:'RMV', criticalFindings:0, majorFindings:0, minorFindings:2, capaStatus:'Closed' },
      { id:'mv-302-002', siteId:'site-302-002', siteName:'MD Anderson Cancer Center', date:'2025-03-18', monitor:'L. Garcia', visitType:'RMV', criticalFindings:0, majorFindings:1, minorFindings:3, capaStatus:'In Progress' },
      { id:'mv-302-003', siteId:'site-302-003', siteName:'Gustave Roussy', date:'2025-02-28', monitor:'C. Dubois', visitType:'RMV', criticalFindings:0, majorFindings:0, minorFindings:1, capaStatus:'Closed' },
      { id:'mv-302-004', siteId:'site-302-004', siteName:'NCC Hospital East', date:'2025-03-05', monitor:'T. Yamamoto', visitType:'RMV', criticalFindings:0, majorFindings:0, minorFindings:2, capaStatus:'In Progress' },
      { id:'mv-302-005', siteId:'site-302-007', siteName:'Asan Medical Center', date:'2024-12-20', monitor:'S. Patel', visitType:'SIV', criticalFindings:0, majorFindings:0, minorFindings:0, capaStatus:'Closed' },
      { id:'mv-302-006', siteId:'site-302-005', siteName:'Princess Margaret', date:'2025-01-15', monitor:'L. Garcia', visitType:'RMV', criticalFindings:1, majorFindings:2, minorFindings:4, capaStatus:'Open' },
    ],
  },

  // ── LIG-1182 Development ───────────────────────────────────────────────────
  {
    id: 'study-lig1182-101',
    programId: 'lig-1182',
    portfolioType: 'development',
    protocolNumber: 'LIG-1182-101',
    title: 'A Phase 1 Dose-Escalation Study of Ligamab in Patients with HER2+ Solid Tumours',
    shortTitle: 'LIG-1182-101 Phase 1 FIH',
    phase: 'Phase 1',
    status: 'Completed',
    indication: 'HER2+ Solid Tumours',
    enrolledSubjects: 89,
    targetEnrollment: 85,
    activeSites: 0,
    activeRegions: ['US', 'AU'],
    startDate: '2020-11-01',
    estimatedCompletion: '2022-08-30',
  },
  {
    id: 'study-lig1182-301',
    programId: 'lig-1182',
    portfolioType: 'development',
    protocolNumber: 'LIG-1182-301',
    title: 'A Randomised Phase 3 Study of Ligamab in HER2+ Metastatic Breast Cancer (2L+)',
    shortTitle: 'LIG-1182-301 Phase 3 HER2+ mBC',
    phase: 'Phase 3',
    status: 'Completed',
    indication: 'HER2+ mBC (2L+)',
    primaryEndpoint: 'Overall Survival',
    enrolledSubjects: 612,
    targetEnrollment: 600,
    activeSites: 0,
    activeRegions: ['US', 'EU', 'JP', 'CA', 'AU'],
    startDate: '2022-06-01',
    estimatedCompletion: '2024-08-15',
  },

  // ── LIG-3021 Post-Approval Studies (Marketed) ──────────────────────────────
  {
    id: 'study-lig3021-401',
    programId: 'lig-3021',
    portfolioType: 'marketed',
    protocolNumber: 'LIG-3021-401',
    title: 'A Phase 4 Long-Term Safety and Efficacy Extension Study of Ligatinib in Rheumatoid Arthritis',
    shortTitle: 'LIG-3021-401 Phase 4 LTES',
    phase: 'Phase 4',
    status: 'Active',
    indication: 'Rheumatoid Arthritis',
    primaryEndpoint: 'Long-term safety — MACE, malignancy, infections',
    enrolledSubjects: 1240,
    targetEnrollment: 2000,
    activeSites: 180,
    activeRegions: ['US', 'EU', 'JP', 'CA', 'AU', 'KR'],
    startDate: '2024-03-01',
    estimatedCompletion: '2029-03-01',
    screenFailRate: 12,
    randomisationRatio: '1:1',
    impBatchesReleased: 28,
    impBatchesAvailable: 19,
    blindingStatus: 'Open-Label',
    randomisationCodeHolder: 'N/A — open-label study',
    blindingStatus: 'Open-Label',
    randomisationCodeHolder: 'N/A — Open-Label',
    queryByDomain: { AE: 89, CM: 34, DM: 12, DS: 21, EX: 45, LB: 112, MH: 8, PE: 28, VS: 67 },
    sites: [
      { id:'site-401-001', name:'Johns Hopkins Arthritis Center', country:'United States', countryCode:'US', countryFlag:'🇺🇸', principalInvestigator:'Dr. Patricia Moore', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-03-20', enrolled:92, target:120, sdvRate:88, lastMonitoringVisit:'2025-03-12', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-401-002', name:'Hospital for Special Surgery', country:'United States', countryCode:'US', countryFlag:'🇺🇸', principalInvestigator:'Dr. Robert Lang', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-03-25', enrolled:78, target:100, sdvRate:91, lastMonitoringVisit:'2025-03-20', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-401-003', name:'Leiden University Medical Center', country:'Netherlands', countryCode:'NL', countryFlag:'🇳🇱', principalInvestigator:'Dr. Annemiek van der Berg', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-04-10', enrolled:65, target:90, sdvRate:85, lastMonitoringVisit:'2025-02-25', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-401-004', name:'University of Tokyo Hospital', country:'Japan', countryCode:'JP', countryFlag:'🇯🇵', principalInvestigator:'Dr. Hiroshi Yamada', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-04-20', enrolled:58, target:80, sdvRate:93, lastMonitoringVisit:'2025-03-01', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
      { id:'site-401-005', name:'Toronto Western Hospital', country:'Canada', countryCode:'CA', countryFlag:'🇨🇦', principalInvestigator:'Dr. Claire Bombardier', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-05-01', enrolled:41, target:60, sdvRate:76, lastMonitoringVisit:'2025-01-30', lastVisitType:'RMV', ragStatus:'Amber', cvStatus:'Complete', financialDisclosure:'Pending' },
      { id:'site-401-006', name:'Royal Prince Alfred Hospital', country:'Australia', countryCode:'AU', countryFlag:'🇦🇺', principalInvestigator:'Dr. Murray Urowitz', activationStage:'Activated', irbStatus:'Approved', activatedDate:'2024-05-15', enrolled:33, target:50, sdvRate:82, lastMonitoringVisit:'2025-02-14', lastVisitType:'RMV', ragStatus:'Green', cvStatus:'Complete', financialDisclosure:'Complete' },
    ],
    deviations: [
      { id:'dev-401-001', date:'2025-02-10', siteId:'site-401-005', siteName:'Toronto Western Hospital', category:'Protocol Procedures', severity:'Minor', description:'HAQ-DI assessment missed at Week 24 visit due to scheduling conflict', status:'Resolved' },
      { id:'dev-401-002', date:'2025-01-18', siteId:'site-401-001', siteName:'Johns Hopkins', category:'Visit Windows', severity:'Minor', description:'Week 48 laboratory assessments obtained 6 days outside allowable window', status:'Resolved' },
      { id:'dev-401-003', date:'2025-03-05', siteId:'site-401-003', siteName:'Leiden University MC', category:'Inclusion/Exclusion Criteria', severity:'Major', description:'Subject with prior biologic DMARD within 3 months enrolled contrary to exclusion criteria', status:'Open' },
    ],
    monitoringVisits: [
      { id:'mv-401-001', siteId:'site-401-001', siteName:'Johns Hopkins', date:'2025-03-12', monitor:'D. Reynolds', visitType:'RMV', criticalFindings:0, majorFindings:0, minorFindings:3, capaStatus:'In Progress' },
      { id:'mv-401-002', siteId:'site-401-002', siteName:'Hospital for Special Surgery', date:'2025-03-20', monitor:'K. Singh', visitType:'RMV', criticalFindings:0, majorFindings:0, minorFindings:1, capaStatus:'Closed' },
      { id:'mv-401-003', siteId:'site-401-003', siteName:'Leiden University MC', date:'2025-02-25', monitor:'D. Reynolds', visitType:'RMV', criticalFindings:0, majorFindings:1, minorFindings:2, capaStatus:'Open' },
      { id:'mv-401-004', siteId:'site-401-004', siteName:'University of Tokyo', date:'2025-03-01', monitor:'R. Tanaka', visitType:'RMV', criticalFindings:0, majorFindings:0, minorFindings:2, capaStatus:'Closed' },
    ],
  },
  {
    id: 'study-lig3021-pass',
    programId: 'lig-3021',
    portfolioType: 'marketed',
    protocolNumber: 'LIG-3021-PASS-01',
    title: 'Post-Authorisation Safety Study of Ligatinib — Cardiovascular Risk Assessment in RA Patients',
    shortTitle: 'LIG-3021-PASS-01 CV Safety PASS',
    phase: 'PASS',
    status: 'Active',
    indication: 'Rheumatoid Arthritis — CV safety surveillance',
    primaryEndpoint: 'MACE incidence vs comparator',
    enrolledSubjects: 3400,
    targetEnrollment: 5000,
    activeSites: 320,
    activeRegions: ['EU', 'GB', 'NO'],
    startDate: '2024-06-01',
    estimatedCompletion: '2030-06-01',
    screenFailRate: 8,
    randomisationRatio: '1:1',
    queryByDomain: { AE: 210, CM: 88, DM: 22, DS: 55, EX: 76, LB: 198, MH: 15, PE: 44, VS: 134 },
  },
];

// ─── Regulatory Applications ───────────────────────────────────────────────────

export const REGULATORY_APPLICATIONS: RegulatoryApplication[] = [

  // ════ LIG-2847 — DEVELOPMENT ════════════════════════════════════════════════

  {
    id: 'app-ind-us-lig2847',
    programId: 'lig-2847',
    portfolioType: 'development',
    type: 'IND',
    authorityId: 'fda',
    regionCode: 'US',
    regionFlag: '🇺🇸',
    applicationNumber: 'IND 123456',
    status: 'Active',
    studyIds: ['study-lig2847-101', 'study-lig2847-201', 'study-lig2847-301', 'study-lig2847-302'],
    submissionDate: '2021-03-15',
    currentSequence: 28,
    totalSequences: 28,
  },
  {
    id: 'app-cta-eu-lig2847',
    programId: 'lig-2847',
    portfolioType: 'development',
    type: 'CTA',
    authorityId: 'ema',
    regionCode: 'EU',
    regionFlag: '🇪🇺',
    applicationNumber: 'CTA 2021-001234-38',
    status: 'Active',
    studyIds: ['study-lig2847-201', 'study-lig2847-301', 'study-lig2847-302'],
    submissionDate: '2021-06-01',
    currentSequence: 18,
    totalSequences: 18,
  },
  {
    id: 'app-cta-jp-lig2847',
    programId: 'lig-2847',
    portfolioType: 'development',
    type: 'CTA',
    authorityId: 'pmda',
    regionCode: 'JP',
    regionFlag: '🇯🇵',
    applicationNumber: 'CTA-JP-2022-0341',
    status: 'Active',
    studyIds: ['study-lig2847-301', 'study-lig2847-302'],
    submissionDate: '2022-04-01',
    currentSequence: 8,
    totalSequences: 8,
  },
  {
    id: 'app-cta-ca-lig2847',
    programId: 'lig-2847',
    portfolioType: 'development',
    type: 'CTA',
    authorityId: 'hc',
    regionCode: 'CA',
    regionFlag: '🇨🇦',
    applicationNumber: 'CTA-CA-2022-0087',
    status: 'Active',
    studyIds: ['study-lig2847-301', 'study-lig2847-302'],
    submissionDate: '2022-07-15',
    currentSequence: 6,
    totalSequences: 6,
  },

  // ════ LIG-2847 — MARKETED ════════════════════════════════════════════════════

  {
    id: 'app-nda-us-lig2847',
    programId: 'lig-2847',
    portfolioType: 'marketed',
    type: 'NDA',
    authorityId: 'fda',
    regionCode: 'US',
    regionFlag: '🇺🇸',
    applicationNumber: 'NDA 215847',
    status: 'Under Review',
    studyIds: ['study-lig2847-101', 'study-lig2847-201', 'study-lig2847-301'],
    submissionDate: '2024-06-15',
    pdufahDate: '2025-02-15',
    currentSequence: 3,
    totalSequences: 3,
    marketAuthorisations: [
      {
        id: 'ma-us-lig2847',
        applicationId: 'app-nda-us-lig2847',
        countryCode: 'US',
        countryName: 'United States',
        flag: '🇺🇸',
        iso3: 'USA',
        isEUMemberState: false,
        status: 'Pending Approval',
        localLabelVersion: 'USPI v1.0 Draft',
        pilLanguage: 'en',
      },
    ],
  },
  {
    id: 'app-maa-eu-lig2847',
    programId: 'lig-2847',
    portfolioType: 'marketed',
    type: 'MAA',
    authorityId: 'ema',
    regionCode: 'EU',
    regionFlag: '🇪🇺',
    applicationNumber: 'EMEA/H/C/006123',
    status: 'Under Review',
    studyIds: ['study-lig2847-101', 'study-lig2847-201', 'study-lig2847-301'],
    submissionDate: '2024-07-01',
    pdufahDate: '2025-05-01',
    currentSequence: 2,
    totalSequences: 2,
    marketAuthorisations: [
      // EU 27 + EEA — pending approval, listed in order of commercial priority
      { id: 'ma-de-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'DE', countryName: 'Germany',     flag: '🇩🇪', iso3: 'DEU', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'de' },
      { id: 'ma-fr-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'FR', countryName: 'France',      flag: '🇫🇷', iso3: 'FRA', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'fr' },
      { id: 'ma-it-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'IT', countryName: 'Italy',       flag: '🇮🇹', iso3: 'ITA', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'it' },
      { id: 'ma-es-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'ES', countryName: 'Spain',       flag: '🇪🇸', iso3: 'ESP', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'es' },
      { id: 'ma-nl-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱', iso3: 'NLD', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'nl' },
      { id: 'ma-be-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'BE', countryName: 'Belgium',     flag: '🇧🇪', iso3: 'BEL', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'nl' },
      { id: 'ma-se-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'SE', countryName: 'Sweden',      flag: '🇸🇪', iso3: 'SWE', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'sv' },
      { id: 'ma-pl-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'PL', countryName: 'Poland',      flag: '🇵🇱', iso3: 'POL', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'pl' },
      { id: 'ma-at-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'AT', countryName: 'Austria',     flag: '🇦🇹', iso3: 'AUT', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'de' },
      { id: 'ma-dk-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'DK', countryName: 'Denmark',     flag: '🇩🇰', iso3: 'DNK', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'da' },
      { id: 'ma-fi-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'FI', countryName: 'Finland',     flag: '🇫🇮', iso3: 'FIN', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'fi' },
      { id: 'ma-ie-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'IE', countryName: 'Ireland',     flag: '🇮🇪', iso3: 'IRL', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'en' },
      { id: 'ma-pt-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'PT', countryName: 'Portugal',    flag: '🇵🇹', iso3: 'PRT', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'pt' },
      { id: 'ma-cz-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'CZ', countryName: 'Czechia',     flag: '🇨🇿', iso3: 'CZE', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'cs' },
      { id: 'ma-ro-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'RO', countryName: 'Romania',     flag: '🇷🇴', iso3: 'ROU', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'ro' },
      { id: 'ma-hu-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'HU', countryName: 'Hungary',     flag: '🇭🇺', iso3: 'HUN', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'hu' },
      { id: 'ma-gr-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'GR', countryName: 'Greece',      flag: '🇬🇷', iso3: 'GRC', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'el' },
      { id: 'ma-bg-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'BG', countryName: 'Bulgaria',    flag: '🇧🇬', iso3: 'BGR', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'bg' },
      { id: 'ma-hr-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'HR', countryName: 'Croatia',     flag: '🇭🇷', iso3: 'HRV', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'hr' },
      { id: 'ma-sk-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'SK', countryName: 'Slovakia',    flag: '🇸🇰', iso3: 'SVK', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'sk' },
      { id: 'ma-si-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'SI', countryName: 'Slovenia',    flag: '🇸🇮', iso3: 'SVN', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'sl' },
      { id: 'ma-lt-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'LT', countryName: 'Lithuania',   flag: '🇱🇹', iso3: 'LTU', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'lt' },
      { id: 'ma-lv-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'LV', countryName: 'Latvia',      flag: '🇱🇻', iso3: 'LVA', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'lv' },
      { id: 'ma-ee-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'EE', countryName: 'Estonia',     flag: '🇪🇪', iso3: 'EST', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'et' },
      { id: 'ma-cy-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'CY', countryName: 'Cyprus',      flag: '🇨🇾', iso3: 'CYP', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'el' },
      { id: 'ma-lu-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'LU', countryName: 'Luxembourg',  flag: '🇱🇺', iso3: 'LUX', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'fr' },
      { id: 'ma-mt-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'MT', countryName: 'Malta',       flag: '🇲🇹', iso3: 'MLT', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'en' },
      // EEA
      { id: 'ma-no-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'NO', countryName: 'Norway',      flag: '🇳🇴', iso3: 'NOR', isEUMemberState: false, status: 'Pending Approval', pilLanguage: 'no' },
      { id: 'ma-is-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'IS', countryName: 'Iceland',     flag: '🇮🇸', iso3: 'ISL', isEUMemberState: false, status: 'Pending Approval', pilLanguage: 'is' },
      { id: 'ma-li-lig2847', applicationId: 'app-maa-eu-lig2847', countryCode: 'LI', countryName: 'Liechtenstein',flag: '🇱🇮', iso3: 'LIE', isEUMemberState: false, status: 'Pending Approval', pilLanguage: 'de' },
    ],
  },
  {
    id: 'app-jnda-jp-lig2847',
    programId: 'lig-2847',
    portfolioType: 'marketed',
    type: 'JNDA',
    authorityId: 'pmda',
    regionCode: 'JP',
    regionFlag: '🇯🇵',
    applicationNumber: 'JNDA 30100123',
    status: 'Approved',
    studyIds: ['study-lig2847-201', 'study-lig2847-301'],
    submissionDate: '2024-02-15',
    approvalDate: '2024-11-15',
    currentSequence: 1,
    totalSequences: 1,
    marketAuthorisations: [
      {
        id: 'ma-jp-lig2847',
        applicationId: 'app-jnda-jp-lig2847',
        countryCode: 'JP',
        countryName: 'Japan',
        flag: '🇯🇵',
        iso3: 'JPN',
        isEUMemberState: false,
        status: 'Approved',
        approvalDate: '2024-11-15',
        localLabelVersion: 'JP Label v1.0',
        pilLanguage: 'ja',
      },
    ],
  },
  {
    id: 'app-nds-ca-lig2847',
    programId: 'lig-2847',
    portfolioType: 'marketed',
    type: 'NDS',
    authorityId: 'hc',
    regionCode: 'CA',
    regionFlag: '🇨🇦',
    applicationNumber: 'NDS-CA-2024-0156',
    status: 'Under Review',
    studyIds: ['study-lig2847-301'],
    submissionDate: '2024-09-01',
    currentSequence: 1,
    totalSequences: 1,
    marketAuthorisations: [
      {
        id: 'ma-ca-lig2847',
        applicationId: 'app-nds-ca-lig2847',
        countryCode: 'CA',
        countryName: 'Canada',
        flag: '🇨🇦',
        iso3: 'CAN',
        isEUMemberState: false,
        status: 'Pending Approval',
        pilLanguage: 'en',
      },
    ],
  },
  {
    id: 'app-maa-gb-lig2847',
    programId: 'lig-2847',
    portfolioType: 'marketed',
    type: 'MAA',
    authorityId: 'mhra',
    regionCode: 'GB',
    regionFlag: '🇬🇧',
    applicationNumber: 'PLGB-2024-00891',
    status: 'Under Review',
    studyIds: ['study-lig2847-301'],
    submissionDate: '2024-08-01',
    currentSequence: 1,
    totalSequences: 1,
    marketAuthorisations: [
      {
        id: 'ma-gb-lig2847',
        applicationId: 'app-maa-gb-lig2847',
        countryCode: 'GB',
        countryName: 'United Kingdom',
        flag: '🇬🇧',
        iso3: 'GBR',
        isEUMemberState: false,
        status: 'Pending Approval',
        pilLanguage: 'en',
      },
    ],
  },

  // ════ LIG-1182 — DEVELOPMENT ════════════════════════════════════════════════

  {
    id: 'app-ind-us-lig1182',
    programId: 'lig-1182',
    portfolioType: 'development',
    type: 'IND',
    authorityId: 'fda',
    regionCode: 'US',
    regionFlag: '🇺🇸',
    applicationNumber: 'IND 134567',
    status: 'Active',
    studyIds: ['study-lig1182-101', 'study-lig1182-301'],
    submissionDate: '2020-09-01',
    currentSequence: 31,
    totalSequences: 31,
  },
  {
    id: 'app-cta-eu-lig1182',
    programId: 'lig-1182',
    portfolioType: 'development',
    type: 'CTA',
    authorityId: 'ema',
    regionCode: 'EU',
    regionFlag: '🇪🇺',
    applicationNumber: 'CTA 2022-003456-12',
    status: 'Active',
    studyIds: ['study-lig1182-301'],
    submissionDate: '2022-03-15',
    currentSequence: 12,
    totalSequences: 12,
  },

  // ════ LIG-1182 — MARKETED ════════════════════════════════════════════════════

  {
    id: 'app-bla-us-lig1182',
    programId: 'lig-1182',
    portfolioType: 'marketed',
    type: 'BLA',
    authorityId: 'fda',
    regionCode: 'US',
    regionFlag: '🇺🇸',
    applicationNumber: 'BLA 761234',
    status: 'Under Review',
    studyIds: ['study-lig1182-101', 'study-lig1182-301'],
    submissionDate: '2024-08-15',
    pdufahDate: '2025-04-15',
    currentSequence: 2,
    totalSequences: 2,
    marketAuthorisations: [
      { id: 'ma-us-lig1182', applicationId: 'app-bla-us-lig1182', countryCode: 'US', countryName: 'United States', flag: '🇺🇸', iso3: 'USA', isEUMemberState: false, status: 'Pending Approval', pilLanguage: 'en' },
    ],
  },
  {
    id: 'app-maa-eu-lig1182',
    programId: 'lig-1182',
    portfolioType: 'marketed',
    type: 'MAA',
    authorityId: 'ema',
    regionCode: 'EU',
    regionFlag: '🇪🇺',
    applicationNumber: 'EMEA/H/C/006250',
    status: 'Under Review',
    studyIds: ['study-lig1182-301'],
    submissionDate: '2024-09-01',
    currentSequence: 1,
    totalSequences: 1,
    marketAuthorisations: [
      { id: 'ma-de-lig1182', applicationId: 'app-maa-eu-lig1182', countryCode: 'DE', countryName: 'Germany', flag: '🇩🇪', iso3: 'DEU', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'de' },
      { id: 'ma-fr-lig1182', applicationId: 'app-maa-eu-lig1182', countryCode: 'FR', countryName: 'France',  flag: '🇫🇷', iso3: 'FRA', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'fr' },
      { id: 'ma-it-lig1182', applicationId: 'app-maa-eu-lig1182', countryCode: 'IT', countryName: 'Italy',   flag: '🇮🇹', iso3: 'ITA', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'it' },
      { id: 'ma-es-lig1182', applicationId: 'app-maa-eu-lig1182', countryCode: 'ES', countryName: 'Spain',   flag: '🇪🇸', iso3: 'ESP', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'es' },
      { id: 'ma-nl-lig1182', applicationId: 'app-maa-eu-lig1182', countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱', iso3: 'NLD', isEUMemberState: true, status: 'Pending Approval', pilLanguage: 'nl' },
    ],
  },

  // ════ LIG-3021 — MARKETED (Approved, Launched) ═══════════════════════════════

  {
    id: 'app-nda-us-lig3021',
    programId: 'lig-3021',
    portfolioType: 'marketed',
    type: 'NDA',
    authorityId: 'fda',
    regionCode: 'US',
    regionFlag: '🇺🇸',
    applicationNumber: 'NDA 214500',
    status: 'Approved',
    studyIds: [],
    submissionDate: '2023-03-01',
    approvalDate: '2024-01-15',
    currentSequence: 8,
    totalSequences: 8,
    marketAuthorisations: [
      { id: 'ma-us-lig3021', applicationId: 'app-nda-us-lig3021', countryCode: 'US', countryName: 'United States', flag: '🇺🇸', iso3: 'USA', isEUMemberState: false, status: 'Launched', approvalDate: '2024-01-15', launchDate: '2024-03-01', localLabelVersion: 'USPI v2.1', pilLanguage: 'en' },
    ],
  },
  {
    id: 'app-maa-eu-lig3021',
    programId: 'lig-3021',
    portfolioType: 'marketed',
    type: 'MAA',
    authorityId: 'ema',
    regionCode: 'EU',
    regionFlag: '🇪🇺',
    applicationNumber: 'EMEA/H/C/005890',
    status: 'Approved',
    studyIds: [],
    submissionDate: '2023-04-15',
    approvalDate: '2024-03-20',
    currentSequence: 6,
    totalSequences: 6,
    marketAuthorisations: [
      { id: 'ma-de-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'DE', countryName: 'Germany',     flag: '🇩🇪', iso3: 'DEU', isEUMemberState: true, status: 'Launched', approvalDate: '2024-03-20', launchDate: '2024-05-01', localLabelVersion: 'SmPC v1.2', pilLanguage: 'de' },
      { id: 'ma-fr-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'FR', countryName: 'France',      flag: '🇫🇷', iso3: 'FRA', isEUMemberState: true, status: 'Launched', approvalDate: '2024-03-20', launchDate: '2024-06-01', localLabelVersion: 'SmPC v1.2', pilLanguage: 'fr' },
      { id: 'ma-it-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'IT', countryName: 'Italy',       flag: '🇮🇹', iso3: 'ITA', isEUMemberState: true, status: 'Launched', approvalDate: '2024-03-20', launchDate: '2024-07-01', localLabelVersion: 'SmPC v1.2', pilLanguage: 'it' },
      { id: 'ma-es-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'ES', countryName: 'Spain',       flag: '🇪🇸', iso3: 'ESP', isEUMemberState: true, status: 'Launched', approvalDate: '2024-03-20', launchDate: '2024-07-15', pilLanguage: 'es' },
      { id: 'ma-nl-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'NL', countryName: 'Netherlands', flag: '🇳🇱', iso3: 'NLD', isEUMemberState: true, status: 'Launched', approvalDate: '2024-03-20', launchDate: '2024-08-01', pilLanguage: 'nl' },
      { id: 'ma-se-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'SE', countryName: 'Sweden',      flag: '🇸🇪', iso3: 'SWE', isEUMemberState: true, status: 'Launched', approvalDate: '2024-03-20', launchDate: '2024-08-15', pilLanguage: 'sv' },
      { id: 'ma-pl-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'PL', countryName: 'Poland',      flag: '🇵🇱', iso3: 'POL', isEUMemberState: true, status: 'Approved',  approvalDate: '2024-03-20', pilLanguage: 'pl' },
      { id: 'ma-be-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'BE', countryName: 'Belgium',     flag: '🇧🇪', iso3: 'BEL', isEUMemberState: true, status: 'Approved',  approvalDate: '2024-03-20', pilLanguage: 'nl' },
      { id: 'ma-at-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'AT', countryName: 'Austria',     flag: '🇦🇹', iso3: 'AUT', isEUMemberState: true, status: 'Approved',  approvalDate: '2024-03-20', pilLanguage: 'de' },
      { id: 'ma-no-lig3021', applicationId: 'app-maa-eu-lig3021', countryCode: 'NO', countryName: 'Norway',      flag: '🇳🇴', iso3: 'NOR', isEUMemberState: false, status: 'Approved', approvalDate: '2024-03-20', pilLanguage: 'no' },
    ],
  },
  {
    id: 'app-jnda-jp-lig3021',
    programId: 'lig-3021',
    portfolioType: 'marketed',
    type: 'JNDA',
    authorityId: 'pmda',
    regionCode: 'JP',
    regionFlag: '🇯🇵',
    applicationNumber: 'JNDA 30090045',
    status: 'Approved',
    studyIds: [],
    submissionDate: '2023-06-01',
    approvalDate: '2024-06-15',
    currentSequence: 5,
    totalSequences: 5,
    marketAuthorisations: [
      { id: 'ma-jp-lig3021', applicationId: 'app-jnda-jp-lig3021', countryCode: 'JP', countryName: 'Japan', flag: '🇯🇵', iso3: 'JPN', isEUMemberState: false, status: 'Launched', approvalDate: '2024-06-15', launchDate: '2024-09-01', localLabelVersion: 'JP Label v1.1', pilLanguage: 'ja' },
    ],
  },
  {
    id: 'app-nds-ca-lig3021',
    programId: 'lig-3021',
    portfolioType: 'marketed',
    type: 'NDS',
    authorityId: 'hc',
    regionCode: 'CA',
    regionFlag: '🇨🇦',
    applicationNumber: 'NDS-CA-2023-0088',
    status: 'Approved',
    studyIds: [],
    submissionDate: '2023-07-01',
    approvalDate: '2024-08-01',
    currentSequence: 3,
    totalSequences: 3,
    marketAuthorisations: [
      { id: 'ma-ca-lig3021', applicationId: 'app-nds-ca-lig3021', countryCode: 'CA', countryName: 'Canada', flag: '🇨🇦', iso3: 'CAN', isEUMemberState: false, status: 'Launched', approvalDate: '2024-08-01', launchDate: '2024-10-01', pilLanguage: 'en' },
    ],
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────────

export function getProgram(id: string): Program | undefined {
  return PROGRAMS.find(p => p.id === id);
}

export function getProgramsByTA(taId: string): Program[] {
  return PROGRAMS.filter(p => p.therapeuticAreaId === taId);
}

export function getStudiesForProgram(programId: string, portfolioType?: PortfolioType): ClinicalStudy[] {
  return CLINICAL_STUDIES.filter(s =>
    s.programId === programId &&
    (portfolioType === undefined || s.portfolioType === portfolioType)
  );
}

export function getApplicationsForProgram(programId: string, portfolioType?: PortfolioType): RegulatoryApplication[] {
  return REGULATORY_APPLICATIONS.filter(a =>
    a.programId === programId &&
    (portfolioType === undefined || a.portfolioType === portfolioType)
  );
}

export function getApplicationById(id: string): RegulatoryApplication | undefined {
  return REGULATORY_APPLICATIONS.find(a => a.id === id);
}

export function getStudyById(id: string): ClinicalStudy | undefined {
  return CLINICAL_STUDIES.find(s => s.id === id);
}

export function getAllMarketAuthorisations(programId: string): MarketAuthorisation[] {
  return REGULATORY_APPLICATIONS
    .filter(a => a.programId === programId && a.portfolioType === 'marketed')
    .flatMap(a => a.marketAuthorisations ?? []);
}

export function getStudiesForApplication(appId: string): ClinicalStudy[] {
  const app = getApplicationById(appId);
  if (!app?.studyIds) return [];
  return app.studyIds.map(id => getStudyById(id)).filter(Boolean) as ClinicalStudy[];
}
