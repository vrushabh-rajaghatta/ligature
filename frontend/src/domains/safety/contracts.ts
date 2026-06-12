
/**
 * Safety Domain Contracts
 * 
 * SINGLE SOURCE OF TRUTH for pharmacovigilance/safety types in Ligature.
 * 
 * @module domains/safety/contracts
 * @version 0.27.20
 */

// =============================================================================
// ICSR CORE ENUMS
// =============================================================================

export type E2BMessageType = 'ichicsr' | 'ichicsrack' | 'nullificationicsrack';

export type ICSRType = 'spontaneous' | 'clinical-trial' | 'literature' | 'solicited' | 'other';

export type CaseSeriousness = 
  | 'non-serious' | 'serious' | 'serious-death' | 'serious-life-threatening'
  | 'serious-hospitalization' | 'serious-disability' | 'serious-congenital'
  | 'serious-intervention' | 'serious-other';

export type CaseOutcome = 
  | 'recovered' | 'recovered-with-sequelae' | 'recovering'
  | 'not-recovered' | 'fatal' | 'unknown';

export type CausalityAssessment = 
  | 'related' | 'probably-related' | 'possibly-related'
  | 'unlikely-related' | 'not-related' | 'not-assessable';

export type CaseStatus = 
  | 'draft' | 'data-entry' | 'medical-review' | 'quality-review'
  | 'ready-to-submit' | 'submitted' | 'follow-up-pending' | 'closed' | 'nullified';

export type CasePriority = 'routine' | 'high' | 'expedited-15-day' | 'expedited-7-day' | 'emergency';

export type CasualityAssessment = 
  | 'related'
  | 'probably-related'
  | 'possibly-related'
  | 'unlikely-related'
  | 'not-related';

export type ReportSource = 
  | 'healthcare-professional' | 'consumer' | 'literature'
  | 'clinical-trial' | 'regulatory-authority' | 'other';

// =============================================================================
// SIGNAL ENUMS
// =============================================================================

export type SignalStatus = 
  | 'new' | 'under-evaluation' | 'validated' | 'refuted'
  | 'closed-no-action' | 'closed-action-taken';

export type SignalPriority = 'low' | 'medium' | 'high' | 'critical';

export type SignalSource = 
  | 'spontaneous-reporting' | 'clinical-trial' | 'literature'
  | 'epidemiological-study' | 'post-marketing-study' | 'social-media' | 'other';

export type DetectionMethod = 
  | 'prr' | 'ror' | 'bcpnn' | 'gps' | 'ebgm' | 'manual' | 'literature' | 'cluster';

export type SignalActionType = 
  | 'label-update' | 'dear-doctor-letter' | 'rems-update' | 'risk-communication'
  | 'additional-data-collection' | 'targeted-follow-up' | 'epidemiological-study'
  | 'product-withdrawal' | 'restriction-of-use' | 'regulatory-notification' | 'other';

// =============================================================================
// AGGREGATE & REGULATORY ENUMS
// =============================================================================

export type AggregateReportType = 'psur' | 'pader' | 'dsur' | 'ibd';

export type ReportingPeriodStatus = 'upcoming' | 'active' | 'data-lock' | 'drafting' | 'review' | 'submitted';

export type SafetySubmissionType = 
  | 'expedited-15-day' | 'expedited-7-day' | 'psur' | 'dsur' | 'pader'
  | 'rmp-update' | 'safety-update' | 'label-change' | 'signal-notification';

export type CaseWorkflowAction = 
  | 'created' | 'assigned' | 'reassigned' | 'data-completed'
  | 'submitted-for-medical-review' | 'medical-review-completed' | 'returned-for-revision'
  | 'submitted-for-qc' | 'qc-completed' | 'marked-ready' | 'submitted-to-authority'
  | 'follow-up-received' | 'nullified' | 'closed';

// =============================================================================
// CORE INTERFACES
// =============================================================================

export interface ICSRCaseSummary {
  id: string;
  caseNumber: string;
  reportType: ICSRType;
  seriousness: CaseSeriousness;
  priority: CasePriority;
  status: CaseStatus;
  productId: string;
  productName: string;
  receiptDate: string;
  dueDate?: string;
  reactionCount: number;
  drugCount: number;
}

export interface SafetySignalSummary {
  id: string;
  signalNumber: string;
  title: string;
  productName: string;
  primaryEvent: string;
  status: SignalStatus;
  priority: SignalPriority;
  caseCount: number;
  prr?: number;
}

export interface SignalStatistics {
  calculatedAt: string;
  prr: number | null;
  prrLower95: number | null;
  prrUpper95: number | null;
  ror: number | null;
  rorLower95: number | null;
  rorUpper95: number | null;
  observed: number;
  expected: number;
  meetsThreshold: boolean;
}

export interface MedDRATerm {
  llt: string;
  pt: string;
  hlt: string;
  hlgt: string;
  soc: string;
  version: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  'draft': 'Draft',
  'data-entry': 'Data Entry',
  'medical-review': 'Medical Review',
  'quality-review': 'QC Review',
  'ready-to-submit': 'Ready to Submit',
  'submitted': 'Submitted',
  'follow-up-pending': 'Follow-up Pending',
  'closed': 'Closed',
  'nullified': 'Nullified',
};

export const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  'routine': 'Routine',
  'high': 'High',
  'expedited-15-day': '15-Day Expedited',
  'expedited-7-day': '7-Day Expedited',
  'emergency': 'Emergency',
};

export const SERIOUSNESS_LABELS: Record<CaseSeriousness, string> = {
  'non-serious': 'Non-Serious',
  'serious': 'Serious',
  'serious-death': 'Death',
  'serious-life-threatening': 'Life-Threatening',
  'serious-hospitalization': 'Hospitalization',
  'serious-disability': 'Disability',
  'serious-congenital': 'Congenital Anomaly',
  'serious-intervention': 'Required Intervention',
  'serious-other': 'Other Serious',
};

export const SIGNAL_STATUS_LABELS: Record<SignalStatus, string> = {
  'new': 'New',
  'under-evaluation': 'Under Evaluation',
  'validated': 'Validated',
  'refuted': 'Refuted',
  'closed-no-action': 'Closed - No Action',
  'closed-action-taken': 'Closed - Action Taken',
};

export const SIGNAL_PRIORITY_LABELS: Record<SignalPriority, string> = {
  'low': 'Low', 'medium': 'Medium', 'high': 'High', 'critical': 'Critical',
};

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  'draft': 'bg-gray-100 text-gray-800',
  'data-entry': 'bg-blue-100 text-blue-800',
  'medical-review': 'bg-purple-100 text-purple-800',
  'quality-review': 'bg-orange-100 text-orange-800',
  'ready-to-submit': 'bg-green-100 text-green-800',
  'submitted': 'bg-teal-100 text-teal-800',
  'follow-up-pending': 'bg-yellow-100 text-yellow-800',
  'closed': 'bg-gray-200 text-gray-600',
  'nullified': 'bg-red-100 text-red-800',
};

export const CASE_PRIORITY_COLORS: Record<CasePriority, string> = {
  'routine': 'bg-gray-100 text-gray-800',
  'high': 'bg-orange-100 text-orange-800',
  'expedited-15-day': 'bg-red-100 text-red-800',
  'expedited-7-day': 'bg-red-200 text-red-900',
  'emergency': 'bg-red-500 text-white',
};

export const SIGNAL_STATUS_COLORS: Record<SignalStatus, string> = {
  'new': 'bg-blue-100 text-blue-800',
  'under-evaluation': 'bg-yellow-100 text-yellow-800',
  'validated': 'bg-red-100 text-red-800',
  'refuted': 'bg-gray-100 text-gray-800',
  'closed-no-action': 'bg-gray-200 text-gray-600',
  'closed-action-taken': 'bg-green-100 text-green-800',
};

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isCaseStatus(value: string): value is CaseStatus {
  return ['draft', 'data-entry', 'medical-review', 'quality-review', 'ready-to-submit', 
          'submitted', 'follow-up-pending', 'closed', 'nullified'].includes(value);
}

export function isCasePriority(value: string): value is CasePriority {
  return ['routine', 'high', 'expedited-15-day', 'expedited-7-day', 'emergency'].includes(value);
}

export function isSignalStatus(value: string): value is SignalStatus {
  return ['new', 'under-evaluation', 'validated', 'refuted', 
          'closed-no-action', 'closed-action-taken'].includes(value);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function isExpedited(priority: CasePriority): boolean {
  return priority === 'expedited-15-day' || priority === 'expedited-7-day' || priority === 'emergency';
}

export function getReportingDeadline(priority: CasePriority): number | null {
  switch (priority) {
    case 'expedited-7-day': return 7;
    case 'expedited-15-day': return 15;
    case 'emergency': return 1;
    default: return null;
  }
}

export function isCaseOverdue(dueDate: string | undefined, status: CaseStatus): boolean {
  if (!dueDate) return false;
  if (status === 'submitted' || status === 'closed' || status === 'nullified') return false;
  return new Date(dueDate) < new Date();
}

export function getCaseUrgency(
  priority: CasePriority, 
  dueDate?: string
): 'overdue' | 'urgent' | 'expedited' | 'normal' {
  if (dueDate && new Date(dueDate) < new Date()) return 'overdue';
  if (priority === 'emergency' || priority === 'expedited-7-day') return 'urgent';
  if (priority === 'expedited-15-day') return 'expedited';
  return 'normal';
}
