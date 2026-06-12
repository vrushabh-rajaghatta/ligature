
/**
 * Persona Definitions — v0.44.62 / rebuilt v0.45.2
 * 
 * Six buyer personas for investor demos. Switching persona reorients:
 * - HomeScreen greeting & KPI priorities
 * - Demo cascade chain emphasis
 * - Module highlight order
 * 
 * This is the single source of truth for persona config.
 */

export interface PersonaDefinition {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  department: string;
  org: string;
  avatarInitials: string;
  avatarColor: string;
  /** KPI tile IDs to show on HomeScreen (ordered by priority) */
  defaultKpiIds: string[];
  /** Modules this persona cares about most */
  primaryModules: string[];
  /** Demo cascade steps to emphasize */
  demoSteps: string[];
  /** Pain points for narrative (tooltip/overlay use) */
  painPoints: string[];
  /** One-line value prop shown in persona switcher */
  value: string;
}

export const PERSONAS: PersonaDefinition[] = [
  {
    id: 'vp-regulatory',
    firstName: 'Sarah',
    lastName: 'Chen',
    title: 'VP, Regulatory Affairs',
    department: 'Regulatory',
    org: 'Ligature Therapeutics',
    avatarInitials: 'SC',
    avatarColor: '#F59E0B',
    defaultKpiIds: ['open-haqs', 'submission-queue', 'overdue-docs', 'safety-signals'],
    primaryModules: ['haq', 'submissions-hub', 'publishing', 'authoring', 'document-control', 'strategy', 'master-data', 'labeling'],
    demoSteps: ['haq-received', 'ai-draft-response', 'review-cycle', 'submission-update'],
    painPoints: [
      'HAQ responses take 3–6 weeks with manual coordination',
      'No single view of all pending regulatory actions',
      'Document version confusion across eCTD sequences',
      'Submission timelines slip due to cross-team dependencies',
    ],
    value: 'Cut HAQ response time from weeks to hours',
  },
  {
    id: 'clinical-ops',
    firstName: 'Marcus',
    lastName: 'Rivera',
    title: 'Director, Clinical Operations',
    department: 'Clinical',
    org: 'Ligature Therapeutics',
    avatarInitials: 'MR',
    avatarColor: '#10B981',
    defaultKpiIds: ['active-studies', 'enrolling-sites', 'protocol-deviations', 'tmf-completeness'],
    primaryModules: ['ctms', 'study-design', 'tmf', 'biostats', 'study-startup', 'study-intel'],
    demoSteps: ['site-activated', 'enrollment-milestone', 'deviation-detected', 'tmf-gap-alert'],
    painPoints: [
      'Site activation takes 4–8 months across regions',
      'TMF completeness only checked at inspection time',
      'No real-time view of enrollment vs forecast',
      'Protocol deviations discovered weeks after occurrence',
    ],
    value: 'Real-time trial visibility across all sites',
  },
  {
    id: 'safety-pv',
    firstName: 'Priya',
    lastName: 'Patel',
    title: 'Head of Pharmacovigilance',
    department: 'Safety',
    org: 'Ligature Therapeutics',
    avatarInitials: 'PP',
    avatarColor: '#F43F5E',
    defaultKpiIds: ['open-cases', 'safety-signals', 'overdue-narratives', 'gateway-queue'],
    primaryModules: ['safety', 'signal-detection', 'psmf'],
    demoSteps: ['safety-signal-detected', 'case-triage', 'narrative-generation', 'e2b-submission'],
    painPoints: [
      'Case narratives take 4–6 hours each manually',
      'Signal detection relies on periodic manual reviews',
      'E2B XML generation requires specialist knowledge',
      'PSMF updates lag behind organizational changes',
    ],
    value: 'AI-assisted narratives in minutes, not hours',
  },
  {
    id: 'quality',
    firstName: 'James',
    lastName: 'Thompson',
    title: 'VP, Quality Assurance',
    department: 'Quality',
    org: 'Ligature Therapeutics',
    avatarInitials: 'JT',
    avatarColor: '#EF4444',
    defaultKpiIds: ['open-capas', 'deviations', 'audit-findings', 'overdue-sops'],
    primaryModules: ['qms', 'glp', 'gcp', 'gmp', 'inspector-readiness', 'archives', 'document-control'],
    demoSteps: ['deviation-logged', 'capa-initiated', 'root-cause-analysis', 'effectiveness-check'],
    painPoints: [
      'CAPAs average 90 days to close',
      'Inspection readiness is a fire drill every time',
      'No traceability from deviation → CAPA → effectiveness',
      'SOP review cycles are manual and often overdue',
    ],
    value: 'Inspection-ready at all times, not just audit season',
  },
  {
    id: 'cmo-csuite',
    firstName: 'David',
    lastName: 'Kim',
    title: 'Chief Medical Officer',
    department: 'Executive',
    org: 'Ligature Therapeutics',
    avatarInitials: 'DK',
    avatarColor: '#6366F1',
    defaultKpiIds: ['programs', 'milestones', 'risk-score', 'time-to-submission'],
    primaryModules: ['portfolio', 'analytics', 'strategy', 'submissions-hub'],
    demoSteps: ['portfolio-review', 'cascade-overview', 'risk-assessment', 'timeline-projection'],
    painPoints: [
      'No single pane of glass across the entire R&D pipeline',
      'Board reporting requires weeks of manual data gathering',
      'Cannot quantify how one delay cascades across programs',
      'Competitive intelligence is siloed in individual teams',
    ],
    value: 'One platform view from molecule to market',
  },
  {
    id: 'cmc',
    firstName: 'Elena',
    lastName: 'Vasquez',
    title: 'Director, CMC Regulatory',
    department: 'CMC',
    org: 'Ligature Therapeutics',
    avatarInitials: 'EV',
    avatarColor: '#F97316',
    defaultKpiIds: ['open-ctd-sections', 'stability-studies', 'batch-records', 'cmc-queries'],
    primaryModules: ['cmc', 'authoring', 'stability', 'batch-records', 'sample-management', 'supply-chain'],
    demoSteps: ['module3-authoring', 'stability-data-review', 'batch-release', 'supply-chain-update'],
    painPoints: [
      'Module 3 authoring requires data from 5+ disparate systems',
      'Stability data trapped in spreadsheets and LIMS exports',
      'No automated link between batch records and submissions',
      'CMC post-approval changes require manual impact assessment',
    ],
    value: 'Module 3 authoring with live data, not stale exports',
  },
];

/** Get persona by ID */
export function getPersonaById(id: string): PersonaDefinition | undefined {
  return PERSONAS.find(p => p.id === id);
}

/** Default persona for new sessions */
export const DEFAULT_PERSONA_ID = 'cmo-csuite';
