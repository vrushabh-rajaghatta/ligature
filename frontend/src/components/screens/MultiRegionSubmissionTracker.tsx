

import { useState, useMemo } from 'react';
import {
  Globe, Globe2, MapPin, Flag, Calendar, Clock, AlertTriangle, CheckCircle2, XCircle,
  ChevronRight, ChevronDown, ChevronUp, Search, Filter, Plus, RefreshCw, ArrowRight,
  ArrowLeftRight, Link2, FileText, Target, Activity, TrendingUp, TrendingDown, Minus,
  Zap, BarChart3, Layers, History, Users, Play, Settings, Building2, Send, Eye, Edit3,
  GitBranch, Network, ExternalLink, AlertCircle, Info, Package, ClipboardList, Scale,
  Landmark, CircleDot, Timer, Milestone, ArrowUpRight, ArrowDownRight, Sparkles, Shield
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import type { BadgeColor } from '@/components/ui/Badge';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useProductFilter } from '@/hooks/useProductFilter';

// =============================================================================
// TYPES - Multi-Region Submission Tracker
// =============================================================================

export type HealthAuthority = 'FDA' | 'EMA' | 'PMDA' | 'NMPA' | 'Health Canada' | 'TGA' | 'ANVISA' | 'MHRA' | 'Swissmedic' | 'KFDA';
export type Region = 'US' | 'EU' | 'Japan' | 'China' | 'Canada' | 'Australia' | 'Brazil' | 'UK' | 'Switzerland' | 'South Korea';
export type SubmissionType = 'IND' | 'NDA' | 'BLA' | 'MAA' | 'JNDA' | 'CTA' | 'sNDA' | 'sBLA' | 'NDS' | 'ANDA';
export type SubmissionPhase = 'planning' | 'preparation' | 'pre-submission' | 'submission' | 'validation' | 'review' | 'approval' | 'post-approval';
export type SubmissionStatus = 'on-track' | 'at-risk' | 'delayed' | 'blocked' | 'submitted' | 'approved' | 'rejected' | 'withdrawn';
export type RequirementStatus = 'not-started' | 'in-progress' | 'complete' | 'not-applicable' | 'waived';
export type CrossReferenceType = 'shared-response' | 'harmonized-data' | 'equivalent-requirement' | 'dependency' | 'conflict';
export type DependencyType = 'sequential' | 'parallel' | 'conditional' | 'blocking';
export type MeetingType = 'pre-IND' | 'pre-NDA' | 'type-A' | 'type-B' | 'type-C' | 'scientific-advice' | 'clarification' | 'guidance';

// Region configuration
export interface RegionConfig {
  code: Region;
  name: string;
  authority: HealthAuthority;
  flag: string;
  timezone: string;
  currency: string;
  language: string;
  reviewTimeline: { standard: number; priority: number; accelerated: number }; // days
  submissionTypes: SubmissionType[];
  requiresLocalAgent: boolean;
  acceptsECTD: boolean;
  ectdVersion: string;
}

// Regional submission
export interface RegionalSubmission {
  id: string;
  globalSubmissionId: string;
  productId: string;
  productName: string;
  region: Region;
  authority: HealthAuthority;
  submissionType: SubmissionType;
  applicationNumber?: string;
  phase: SubmissionPhase;
  status: SubmissionStatus;
  priority: 'standard' | 'priority' | 'accelerated' | 'breakthrough';
  targetDate: string;
  projectedDate: string;
  submittedDate?: string;
  approvalDate?: string;
  readinessPercent: number;
  lead: string;
  localAgent?: string;
  dependencies: SubmissionDependency[];
  requirements: RegionalRequirement[];
  crossReferences: CrossReference[];
  meetings: AuthorityMeeting[];
  milestones: SubmissionMilestone[];
  lastUpdated: string;
  notes?: string;
}

// Global submission (umbrella)
export interface GlobalSubmission {
  id: string;
  productId: string;
  productName: string;
  indication: string;
  therapeuticArea: string;
  globalLead: string;
  referenceRegion: Region; // First submission region
  targetRegions: Region[];
  regionalSubmissions: RegionalSubmission[];
  overallStatus: SubmissionStatus;
  overallReadiness: number;
  strategy: 'sequential' | 'parallel' | 'rolling';
  createdAt: string;
  lastUpdated: string;
}

// Regional requirement
export interface RegionalRequirement {
  id: string;
  category: 'administrative' | 'quality' | 'nonclinical' | 'clinical' | 'labeling' | 'manufacturing' | 'post-market';
  module: string; // eCTD module
  section: string;
  description: string;
  regionSpecific: boolean;
  requirement: string;
  status: RequirementStatus;
  fdaEquivalent?: string;
  harmonizedWith?: Region[];
  owner: string;
  dueDate: string;
  completedDate?: string;
  notes?: string;
}

// Cross-reference between regions
export interface CrossReference {
  id: string;
  sourceRegion: Region;
  targetRegion: Region;
  sourceSubmissionId: string;
  targetSubmissionId: string;
  type: CrossReferenceType;
  category: string;
  description: string;
  sourceDocument?: string;
  targetDocument?: string;
  status: 'active' | 'resolved' | 'superseded';
  resolvedBy?: string;
  createdAt: string;
  resolvedAt?: string;
}

// Submission dependency
export interface SubmissionDependency {
  id: string;
  dependentRegion: Region;
  requiredRegion: Region;
  dependencyType: DependencyType;
  description: string;
  status: 'pending' | 'satisfied' | 'waived';
  requiredMilestone?: string;
  targetDate?: string;
}

// Authority meeting
export interface AuthorityMeeting {
  id: string;
  region: Region;
  authority: HealthAuthority;
  meetingType: MeetingType;
  title: string;
  date: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'requested';
  outcome?: 'favorable' | 'unfavorable' | 'mixed' | 'pending';
  attendees: string[];
  keyTopics: string[];
  actionItems?: string[];
  followUpDate?: string;
}

// Submission milestone
export interface SubmissionMilestone {
  id: string;
  name: string;
  type: 'internal' | 'regulatory' | 'clinical' | 'manufacturing';
  targetDate: string;
  actualDate?: string;
  status: 'pending' | 'completed' | 'at-risk' | 'missed';
  dependencies: string[];
  owner: string;
}

// Timeline event
export interface TimelineEvent {
  id: string;
  date: string;
  region: Region;
  submissionId: string;
  eventType: 'submission' | 'milestone' | 'meeting' | 'approval' | 'question' | 'response';
  title: string;
  description: string;
  status: 'upcoming' | 'completed' | 'overdue';
  impact: 'high' | 'medium' | 'low';
}

// =============================================================================
// COLOR MAPS
// =============================================================================

const regionColorMap: Record<Region, BadgeColor> = {
  'US': 'blue', 'EU': 'purple', 'Japan': 'red', 'China': 'amber',
  'Canada': 'emerald', 'Australia': 'teal', 'Brazil': 'green',
  'UK': 'slate', 'Switzerland': 'orange', 'South Korea': 'violet'
};

const authorityColorMap: Record<HealthAuthority, BadgeColor> = {
  'FDA': 'blue', 'EMA': 'purple', 'PMDA': 'red', 'NMPA': 'amber',
  'Health Canada': 'emerald', 'TGA': 'teal', 'ANVISA': 'green',
  'MHRA': 'slate', 'Swissmedic': 'orange', 'KFDA': 'violet'
};

const submissionPhaseColorMap: Record<SubmissionPhase, BadgeColor> = {
  'planning': 'slate', 'preparation': 'blue', 'pre-submission': 'purple',
  'submission': 'violet', 'validation': 'cyan', 'review': 'amber',
  'approval': 'emerald', 'post-approval': 'teal'
};

const submissionStatusColorMap: Record<SubmissionStatus, BadgeColor> = {
  'on-track': 'emerald', 'at-risk': 'amber', 'delayed': 'orange',
  'blocked': 'red', 'submitted': 'blue', 'approved': 'green',
  'rejected': 'red', 'withdrawn': 'gray'
};

const requirementStatusColorMap: Record<RequirementStatus, BadgeColor> = {
  'not-started': 'slate', 'in-progress': 'blue', 'complete': 'emerald',
  'not-applicable': 'gray', 'waived': 'purple'
};

const crossRefTypeColorMap: Record<CrossReferenceType, BadgeColor> = {
  'shared-response': 'blue', 'harmonized-data': 'emerald', 'equivalent-requirement': 'purple',
  'dependency': 'amber', 'conflict': 'red'
};

const dependencyTypeColorMap: Record<DependencyType, BadgeColor> = {
  'sequential': 'blue', 'parallel': 'emerald', 'conditional': 'amber', 'blocking': 'red'
};

const meetingTypeColorMap: Record<MeetingType, BadgeColor> = {
  'pre-IND': 'blue', 'pre-NDA': 'purple', 'type-A': 'red', 'type-B': 'amber',
  'type-C': 'slate', 'scientific-advice': 'emerald', 'clarification': 'cyan', 'guidance': 'teal'
};

const priorityColorMap: Record<'standard' | 'priority' | 'accelerated' | 'breakthrough', BadgeColor> = {
  'standard': 'slate', 'priority': 'blue', 'accelerated': 'amber', 'breakthrough': 'purple'
};

// =============================================================================
// MOCK DATA - Region Configurations
// =============================================================================

const regionConfigs: RegionConfig[] = [
  { code: 'US', name: 'United States', authority: 'FDA', flag: '🇺🇸', timezone: 'America/New_York', currency: 'USD', language: 'English', reviewTimeline: { standard: 365, priority: 180, accelerated: 120 }, submissionTypes: ['IND', 'NDA', 'BLA', 'sNDA', 'sBLA', 'ANDA'], requiresLocalAgent: false, acceptsECTD: true, ectdVersion: '4.0' },
  { code: 'EU', name: 'European Union', authority: 'EMA', flag: '🇪🇺', timezone: 'Europe/Amsterdam', currency: 'EUR', language: 'English', reviewTimeline: { standard: 400, priority: 150, accelerated: 150 }, submissionTypes: ['MAA', 'CTA'], requiresLocalAgent: true, acceptsECTD: true, ectdVersion: '4.0' },
  { code: 'Japan', name: 'Japan', authority: 'PMDA', flag: '🇯🇵', timezone: 'Asia/Tokyo', currency: 'JPY', language: 'Japanese', reviewTimeline: { standard: 365, priority: 270, accelerated: 180 }, submissionTypes: ['JNDA', 'CTA'], requiresLocalAgent: true, acceptsECTD: true, ectdVersion: '4.0' },
  { code: 'China', name: 'China', authority: 'NMPA', flag: '🇨🇳', timezone: 'Asia/Shanghai', currency: 'CNY', language: 'Chinese', reviewTimeline: { standard: 400, priority: 270, accelerated: 200 }, submissionTypes: ['NDA', 'CTA', 'IND'], requiresLocalAgent: true, acceptsECTD: true, ectdVersion: '3.2.2' },
  { code: 'Canada', name: 'Canada', authority: 'Health Canada', flag: '🇨🇦', timezone: 'America/Toronto', currency: 'CAD', language: 'English/French', reviewTimeline: { standard: 300, priority: 180, accelerated: 180 }, submissionTypes: ['NDS', 'CTA'], requiresLocalAgent: false, acceptsECTD: true, ectdVersion: '4.0' },
  { code: 'Australia', name: 'Australia', authority: 'TGA', flag: '🇦🇺', timezone: 'Australia/Sydney', currency: 'AUD', language: 'English', reviewTimeline: { standard: 255, priority: 150, accelerated: 150 }, submissionTypes: ['NDA', 'CTA'], requiresLocalAgent: true, acceptsECTD: true, ectdVersion: '4.0' },
  { code: 'UK', name: 'United Kingdom', authority: 'MHRA', flag: '🇬🇧', timezone: 'Europe/London', currency: 'GBP', language: 'English', reviewTimeline: { standard: 150, priority: 100, accelerated: 100 }, submissionTypes: ['MAA', 'CTA'], requiresLocalAgent: false, acceptsECTD: true, ectdVersion: '4.0' },
  { code: 'Switzerland', name: 'Switzerland', authority: 'Swissmedic', flag: '🇨🇭', timezone: 'Europe/Zurich', currency: 'CHF', language: 'German/French', reviewTimeline: { standard: 330, priority: 200, accelerated: 140 }, submissionTypes: ['NDA', 'CTA'], requiresLocalAgent: true, acceptsECTD: true, ectdVersion: '4.0' },
];

// =============================================================================
// MOCK DATA - LIG-2847 Nexavant Global Submission
// =============================================================================

const mockGlobalSubmissions: GlobalSubmission[] = [
  {
    id: 'global-001',
    productId: 'lig-2847',
    productName: 'Nexavant (LIG-2847)',
    indication: 'KRAS G12C-mutated NSCLC',
    therapeuticArea: 'Oncology',
    globalLead: 'Jennifer Walsh',
    referenceRegion: 'US',
    targetRegions: ['US', 'EU', 'Japan', 'China', 'Canada', 'UK', 'Switzerland'],
    overallStatus: 'on-track',
    overallReadiness: 82,
    strategy: 'parallel',
    createdAt: '2024-01-15T00:00:00Z',
    lastUpdated: '2025-12-28T00:00:00Z',
    regionalSubmissions: []
  },
  {
    id: 'global-002',
    productId: 'lig-4055',
    productName: 'Pancrastinib (LIG-4055)',
    indication: 'KRAS G12D-mutated Pancreatic Cancer',
    therapeuticArea: 'Oncology',
    globalLead: 'Dr. James Wilson',
    referenceRegion: 'US',
    targetRegions: ['US', 'EU', 'Japan'],
    overallStatus: 'at-risk',
    overallReadiness: 58,
    strategy: 'sequential',
    createdAt: '2024-06-01T00:00:00Z',
    lastUpdated: '2025-12-28T00:00:00Z',
    regionalSubmissions: []
  },
  {
    id: 'global-003',
    productId: 'lig-5501',
    productName: 'Cardivex (LIG-5501)',
    indication: 'Heart Failure with Preserved Ejection Fraction',
    therapeuticArea: 'Cardiovascular',
    globalLead: 'Dr. Amanda Foster',
    referenceRegion: 'US',
    targetRegions: ['US', 'EU', 'Japan', 'Canada'],
    overallStatus: 'submitted',
    overallReadiness: 100,
    strategy: 'rolling',
    createdAt: '2023-03-01T00:00:00Z',
    lastUpdated: '2025-12-20T00:00:00Z',
    regionalSubmissions: []
  }
];

const mockRegionalSubmissions: RegionalSubmission[] = [
  // Nexavant - US NDA (Reference)
  {
    id: 'reg-001', globalSubmissionId: 'global-001', productId: 'lig-2847', productName: 'Nexavant',
    region: 'US', authority: 'FDA', submissionType: 'NDA', applicationNumber: 'NDA 215847',
    phase: 'review', status: 'submitted', priority: 'priority',
    targetDate: '2024-06-15', projectedDate: '2024-06-15', submittedDate: '2024-06-15',
    readinessPercent: 100, lead: 'Jennifer Walsh',
    dependencies: [],
    requirements: [
      { id: 'req-001', category: 'clinical', module: 'Module 5', section: '5.3.5', description: 'Clinical Study Reports', regionSpecific: false, requirement: 'Complete CSRs for pivotal trials', status: 'complete', owner: 'Clinical Team', dueDate: '2024-05-01', completedDate: '2024-04-28' },
      { id: 'req-002', category: 'quality', module: 'Module 3', section: '3.2.P', description: 'Drug Product CMC', regionSpecific: false, requirement: 'Manufacturing and controls documentation', status: 'complete', owner: 'CMC Team', dueDate: '2024-05-15', completedDate: '2024-05-10' },
    ],
    crossReferences: [
      { id: 'xref-001', sourceRegion: 'US', targetRegion: 'EU', sourceSubmissionId: 'reg-001', targetSubmissionId: 'reg-002', type: 'shared-response', category: 'Clinical', description: 'Shared clinical efficacy data package', status: 'active', createdAt: '2024-05-01T00:00:00Z' }
    ],
    meetings: [
      { id: 'mtg-001', region: 'US', authority: 'FDA', meetingType: 'pre-NDA', title: 'Pre-NDA Meeting', date: '2024-02-15', status: 'completed', outcome: 'favorable', attendees: ['Dr. Wilson', 'Jennifer Walsh', 'FDA Review Team'], keyTopics: ['Efficacy endpoints', 'Safety database', 'CMC readiness'] }
    ],
    milestones: [
      { id: 'ms-001', name: 'NDA Submission', type: 'regulatory', targetDate: '2024-06-15', actualDate: '2024-06-15', status: 'completed', dependencies: [], owner: 'Jennifer Walsh' },
      { id: 'ms-002', name: 'FDA Filing Decision', type: 'regulatory', targetDate: '2024-08-15', actualDate: '2024-08-10', status: 'completed', dependencies: [], owner: 'FDA' },
      { id: 'ms-003', name: 'PDUFA Date', type: 'regulatory', targetDate: '2025-06-15', status: 'pending', dependencies: [], owner: 'FDA' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Nexavant - EU MAA
  {
    id: 'reg-002', globalSubmissionId: 'global-001', productId: 'lig-2847', productName: 'Nexavant',
    region: 'EU', authority: 'EMA', submissionType: 'MAA', applicationNumber: 'EMEA/H/C/006123',
    phase: 'review', status: 'submitted', priority: 'accelerated',
    targetDate: '2024-07-01', projectedDate: '2024-07-01', submittedDate: '2024-07-01',
    readinessPercent: 100, lead: 'Dr. Elena Petrova', localAgent: 'EU Regulatory Services GmbH',
    dependencies: [
      { id: 'dep-001', dependentRegion: 'EU', requiredRegion: 'US', dependencyType: 'parallel', description: 'Harmonized clinical data package', status: 'satisfied' }
    ],
    requirements: [
      { id: 'req-003', category: 'administrative', module: 'Module 1', section: '1.2', description: 'EU Regional Administrative Info', regionSpecific: true, requirement: 'EU-specific application forms and local agent info', status: 'complete', harmonizedWith: [], owner: 'Reg Affairs EU', dueDate: '2024-06-15', completedDate: '2024-06-12' },
      { id: 'req-004', category: 'labeling', module: 'Module 1', section: '1.3.1', description: 'SmPC and Package Leaflet', regionSpecific: true, requirement: 'EU-formatted labeling documents', status: 'complete', fdaEquivalent: 'USPI', owner: 'Labeling Team', dueDate: '2024-06-20', completedDate: '2024-06-18' },
    ],
    crossReferences: [
      { id: 'xref-002', sourceRegion: 'EU', targetRegion: 'US', sourceSubmissionId: 'reg-002', targetSubmissionId: 'reg-001', type: 'harmonized-data', category: 'Clinical', description: 'Reference US clinical data package', status: 'active', createdAt: '2024-06-01T00:00:00Z' }
    ],
    meetings: [
      { id: 'mtg-002', region: 'EU', authority: 'EMA', meetingType: 'scientific-advice', title: 'Scientific Advice Meeting', date: '2024-03-20', status: 'completed', outcome: 'favorable', attendees: ['Dr. Petrova', 'EMA CHMP'], keyTopics: ['Clinical development plan', 'Pediatric requirements'] }
    ],
    milestones: [
      { id: 'ms-004', name: 'MAA Submission', type: 'regulatory', targetDate: '2024-07-01', actualDate: '2024-07-01', status: 'completed', dependencies: [], owner: 'Dr. Elena Petrova' },
      { id: 'ms-005', name: 'Day 120 Assessment', type: 'regulatory', targetDate: '2024-11-01', actualDate: '2024-10-28', status: 'completed', dependencies: [], owner: 'EMA' },
      { id: 'ms-006', name: 'CHMP Opinion', type: 'regulatory', targetDate: '2025-05-01', status: 'pending', dependencies: [], owner: 'EMA' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Nexavant - Japan JNDA
  {
    id: 'reg-003', globalSubmissionId: 'global-001', productId: 'lig-2847', productName: 'Nexavant',
    region: 'Japan', authority: 'PMDA', submissionType: 'JNDA',
    phase: 'preparation', status: 'on-track', priority: 'priority',
    targetDate: '2025-03-15', projectedDate: '2025-03-20',
    readinessPercent: 72, lead: 'Dr. Kenji Tanaka', localAgent: 'Japan Pharma Partners KK',
    dependencies: [
      { id: 'dep-002', dependentRegion: 'Japan', requiredRegion: 'US', dependencyType: 'sequential', description: 'US NDA submission required before JNDA', status: 'satisfied' }
    ],
    requirements: [
      { id: 'req-005', category: 'clinical', module: 'Module 5', section: '5.3.5.3', description: 'Japanese Bridging Study', regionSpecific: true, requirement: 'PK bridging study in Japanese patients', status: 'complete', owner: 'Clinical Japan', dueDate: '2025-01-15', completedDate: '2025-01-10' },
      { id: 'req-006', category: 'administrative', module: 'Module 1', section: '1.12', description: 'CTD-J Regional Info', regionSpecific: true, requirement: 'Japan-specific Module 1 requirements', status: 'in-progress', owner: 'Reg Affairs Japan', dueDate: '2025-02-28' },
      { id: 'req-007', category: 'labeling', module: 'Module 1', section: '1.3.1', description: 'Japanese Package Insert', regionSpecific: true, requirement: 'J-PI in Japanese language', status: 'in-progress', fdaEquivalent: 'USPI', owner: 'Labeling Team', dueDate: '2025-03-01' },
    ],
    crossReferences: [
      { id: 'xref-003', sourceRegion: 'Japan', targetRegion: 'US', sourceSubmissionId: 'reg-003', targetSubmissionId: 'reg-001', type: 'harmonized-data', category: 'Nonclinical', description: 'Reference US nonclinical package', status: 'active', createdAt: '2024-08-01T00:00:00Z' }
    ],
    meetings: [
      { id: 'mtg-003', region: 'Japan', authority: 'PMDA', meetingType: 'pre-NDA', title: 'Pre-JNDA Consultation', date: '2024-11-15', status: 'completed', outcome: 'favorable', attendees: ['Dr. Tanaka', 'PMDA Review Team'], keyTopics: ['Bridging strategy', 'Ethnic sensitivity', 'Local manufacturing'] },
      { id: 'mtg-004', region: 'Japan', authority: 'PMDA', meetingType: 'clarification', title: 'CMC Clarification Meeting', date: '2025-02-01', status: 'scheduled', attendees: ['CMC Team Japan', 'PMDA'], keyTopics: ['Manufacturing site inspection', 'Stability requirements'] }
    ],
    milestones: [
      { id: 'ms-007', name: 'Bridging Study Complete', type: 'clinical', targetDate: '2025-01-15', actualDate: '2025-01-10', status: 'completed', dependencies: [], owner: 'Clinical Japan' },
      { id: 'ms-008', name: 'JNDA Submission', type: 'regulatory', targetDate: '2025-03-15', status: 'pending', dependencies: [], owner: 'Dr. Kenji Tanaka' },
      { id: 'ms-009', name: 'PMDA Review Start', type: 'regulatory', targetDate: '2025-04-15', status: 'pending', dependencies: ['ms-008'], owner: 'PMDA' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Nexavant - China NDA
  {
    id: 'reg-004', globalSubmissionId: 'global-001', productId: 'lig-2847', productName: 'Nexavant',
    region: 'China', authority: 'NMPA', submissionType: 'NDA',
    phase: 'preparation', status: 'at-risk', priority: 'standard',
    targetDate: '2025-06-01', projectedDate: '2025-07-15',
    readinessPercent: 48, lead: 'Dr. Wei Chen', localAgent: 'China MedReg Consulting',
    dependencies: [
      { id: 'dep-003', dependentRegion: 'China', requiredRegion: 'US', dependencyType: 'sequential', description: 'US approval before China submission', status: 'pending', requiredMilestone: 'US FDA Approval' }
    ],
    requirements: [
      { id: 'req-008', category: 'clinical', module: 'Module 5', section: '5.3.5.3', description: 'China Confirmatory Study', regionSpecific: true, requirement: 'Clinical trial in Chinese patients per NMPA requirements', status: 'in-progress', owner: 'Clinical China', dueDate: '2025-04-01' },
      { id: 'req-009', category: 'administrative', module: 'Module 1', section: '1.2', description: 'NMPA Registration Certificate', regionSpecific: true, requirement: 'Local manufacturing or import license', status: 'not-started', owner: 'Reg Affairs China', dueDate: '2025-05-01' },
    ],
    crossReferences: [],
    meetings: [
      { id: 'mtg-005', region: 'China', authority: 'NMPA', meetingType: 'pre-NDA', title: 'Pre-NDA Communication Meeting', date: '2025-03-15', status: 'requested', attendees: ['Dr. Wei Chen', 'NMPA CDE'], keyTopics: ['Clinical requirements', 'Ethnic bridging'] }
    ],
    milestones: [
      { id: 'ms-010', name: 'China Clinical Study Complete', type: 'clinical', targetDate: '2025-04-01', status: 'at-risk', dependencies: [], owner: 'Clinical China' },
      { id: 'ms-011', name: 'NDA Submission China', type: 'regulatory', targetDate: '2025-06-01', status: 'pending', dependencies: ['ms-010'], owner: 'Dr. Wei Chen' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Nexavant - Canada NDS
  {
    id: 'reg-005', globalSubmissionId: 'global-001', productId: 'lig-2847', productName: 'Nexavant',
    region: 'Canada', authority: 'Health Canada', submissionType: 'NDS',
    phase: 'pre-submission', status: 'on-track', priority: 'priority',
    targetDate: '2025-02-15', projectedDate: '2025-02-15',
    readinessPercent: 85, lead: 'Dr. Marie Tremblay',
    dependencies: [],
    requirements: [
      { id: 'req-010', category: 'administrative', module: 'Module 1', section: '1.2', description: 'HC Regional Info', regionSpecific: true, requirement: 'Health Canada regional administrative documents', status: 'complete', owner: 'Reg Affairs Canada', dueDate: '2025-01-30', completedDate: '2025-01-25' },
      { id: 'req-011', category: 'labeling', module: 'Module 1', section: '1.3.1', description: 'Canadian Product Monograph', regionSpecific: true, requirement: 'Bilingual PM (English/French)', status: 'in-progress', fdaEquivalent: 'USPI', owner: 'Labeling Team', dueDate: '2025-02-10' },
    ],
    crossReferences: [
      { id: 'xref-004', sourceRegion: 'Canada', targetRegion: 'US', sourceSubmissionId: 'reg-005', targetSubmissionId: 'reg-001', type: 'equivalent-requirement', category: 'Clinical', description: 'Accept US clinical data per MRA', status: 'active', createdAt: '2024-12-01T00:00:00Z' }
    ],
    meetings: [],
    milestones: [
      { id: 'ms-012', name: 'NDS Submission', type: 'regulatory', targetDate: '2025-02-15', status: 'pending', dependencies: [], owner: 'Dr. Marie Tremblay' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Nexavant - UK MAA
  {
    id: 'reg-006', globalSubmissionId: 'global-001', productId: 'lig-2847', productName: 'Nexavant',
    region: 'UK', authority: 'MHRA', submissionType: 'MAA',
    phase: 'submission', status: 'on-track', priority: 'accelerated',
    targetDate: '2025-01-15', projectedDate: '2025-01-15',
    readinessPercent: 95, lead: 'Dr. Sarah Mitchell',
    dependencies: [],
    requirements: [
      { id: 'req-012', category: 'administrative', module: 'Module 1', section: '1.2', description: 'MHRA Regional Info', regionSpecific: true, requirement: 'UK-specific administrative requirements post-Brexit', status: 'complete', owner: 'Reg Affairs UK', dueDate: '2025-01-10', completedDate: '2025-01-08' },
    ],
    crossReferences: [
      { id: 'xref-005', sourceRegion: 'UK', targetRegion: 'EU', sourceSubmissionId: 'reg-006', targetSubmissionId: 'reg-002', type: 'harmonized-data', category: 'All Modules', description: 'Leverage EU MAA dossier', status: 'active', createdAt: '2024-12-01T00:00:00Z' }
    ],
    meetings: [],
    milestones: [
      { id: 'ms-013', name: 'UK MAA Submission', type: 'regulatory', targetDate: '2025-01-15', status: 'pending', dependencies: [], owner: 'Dr. Sarah Mitchell' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Pancrastinib - US IND
  {
    id: 'reg-007', globalSubmissionId: 'global-002', productId: 'lig-4055', productName: 'Pancrastinib',
    region: 'US', authority: 'FDA', submissionType: 'IND', applicationNumber: 'IND-PENDING',
    phase: 'preparation', status: 'at-risk', priority: 'standard',
    targetDate: '2025-02-15', projectedDate: '2025-02-25',
    readinessPercent: 68, lead: 'Dr. James Wilson',
    dependencies: [],
    requirements: [
      { id: 'req-013', category: 'nonclinical', module: 'Module 4', section: '4.2', description: 'Tox Package', regionSpecific: false, requirement: 'GLP toxicology studies', status: 'complete', owner: 'Nonclinical', dueDate: '2025-01-15', completedDate: '2025-01-12' },
      { id: 'req-014', category: 'quality', module: 'Module 3', section: '3.2.S', description: 'Drug Substance CMC', regionSpecific: false, requirement: 'API manufacturing and characterization', status: 'in-progress', owner: 'CMC Team', dueDate: '2025-02-01' },
    ],
    crossReferences: [],
    meetings: [
      { id: 'mtg-006', region: 'US', authority: 'FDA', meetingType: 'pre-IND', title: 'Pre-IND Meeting', date: '2024-10-15', status: 'completed', outcome: 'favorable', attendees: ['Dr. Wilson', 'FDA'], keyTopics: ['First-in-human design', 'Starting dose'] }
    ],
    milestones: [
      { id: 'ms-014', name: 'IND Submission', type: 'regulatory', targetDate: '2025-02-15', status: 'at-risk', dependencies: [], owner: 'Dr. James Wilson' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Pancrastinib - EU CTA
  {
    id: 'reg-008', globalSubmissionId: 'global-002', productId: 'lig-4055', productName: 'Pancrastinib',
    region: 'EU', authority: 'EMA', submissionType: 'CTA',
    phase: 'planning', status: 'on-track', priority: 'standard',
    targetDate: '2025-04-01', projectedDate: '2025-04-01',
    readinessPercent: 42, lead: 'Dr. Hans Mueller', localAgent: 'EU Regulatory Services GmbH',
    dependencies: [
      { id: 'dep-004', dependentRegion: 'EU', requiredRegion: 'US', dependencyType: 'sequential', description: 'US IND clearance before EU CTA', status: 'pending' }
    ],
    requirements: [
      { id: 'req-015', category: 'clinical', module: 'Module 5', section: '5.2', description: 'IMPD', regionSpecific: true, requirement: 'Investigational Medicinal Product Dossier', status: 'in-progress', owner: 'Reg Affairs EU', dueDate: '2025-03-15' },
    ],
    crossReferences: [],
    meetings: [],
    milestones: [
      { id: 'ms-015', name: 'CTA Submission', type: 'regulatory', targetDate: '2025-04-01', status: 'pending', dependencies: [], owner: 'Dr. Hans Mueller' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
  // Cardivex - US NDA (Submitted)
  {
    id: 'reg-009', globalSubmissionId: 'global-003', productId: 'lig-5501', productName: 'Cardivex',
    region: 'US', authority: 'FDA', submissionType: 'NDA', applicationNumber: 'NDA 218956',
    phase: 'review', status: 'submitted', priority: 'priority',
    targetDate: '2024-09-01', projectedDate: '2024-09-01', submittedDate: '2024-09-01',
    readinessPercent: 100, lead: 'Dr. Amanda Foster',
    dependencies: [],
    requirements: [],
    crossReferences: [],
    meetings: [],
    milestones: [
      { id: 'ms-016', name: 'NDA Submission', type: 'regulatory', targetDate: '2024-09-01', actualDate: '2024-09-01', status: 'completed', dependencies: [], owner: 'Dr. Amanda Foster' },
      { id: 'ms-017', name: 'PDUFA Date', type: 'regulatory', targetDate: '2025-09-01', status: 'pending', dependencies: [], owner: 'FDA' }
    ],
    lastUpdated: '2025-12-28T00:00:00Z'
  },
];

// Generate timeline events
const generateTimelineEvents = (): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  let eventId = 1;

  mockRegionalSubmissions.forEach(sub => {
    sub.milestones.forEach(ms => {
      events.push({
        id: `evt-${eventId++}`,
        date: ms.targetDate,
        region: sub.region,
        submissionId: sub.id,
        eventType: ms.type === 'regulatory' ? 'submission' : 'milestone',
        title: ms.name,
        description: `${sub.productName} - ${sub.region}`,
        status: ms.status === 'completed' ? 'completed' : new Date(ms.targetDate) < new Date() ? 'overdue' : 'upcoming',
        impact: ms.type === 'regulatory' ? 'high' : 'medium'
      });
    });
    sub.meetings.forEach(mtg => {
      events.push({
        id: `evt-${eventId++}`,
        date: mtg.date,
        region: sub.region,
        submissionId: sub.id,
        eventType: 'meeting',
        title: mtg.title,
        description: `${mtg.authority} - ${mtg.meetingType}`,
        status: mtg.status === 'completed' ? 'completed' : new Date(mtg.date) < new Date() ? 'overdue' : 'upcoming',
        impact: mtg.meetingType === 'pre-NDA' || mtg.meetingType === 'pre-IND' ? 'high' : 'medium'
      });
    });
  });

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const mockTimelineEvents = generateTimelineEvents();

// =============================================================================
// BADGE HELPERS
// =============================================================================

const getRegionBadge = (region: Region, showFlag = true) => {
  const config = regionConfigs.find(r => r.code === region);
  return <Badge color={regionColorMap[region]} size="xs">{showFlag && config ? `${config.flag} ` : ''}{region}</Badge>;
};
const getAuthorityBadge = (authority: HealthAuthority) => <Badge color={authorityColorMap[authority]} size="xs">{authority}</Badge>;
const getPhaseBadge = (phase: SubmissionPhase) => <Badge color={submissionPhaseColorMap[phase]} size="xs">{phase.replace(/-/g, ' ')}</Badge>;
const getStatusBadge = (status: SubmissionStatus) => <Badge color={submissionStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
const getRequirementStatusBadge = (status: RequirementStatus) => <Badge color={requirementStatusColorMap[status]} size="xs">{status.replace(/-/g, ' ')}</Badge>;
const getCrossRefTypeBadge = (type: CrossReferenceType) => <Badge color={crossRefTypeColorMap[type]} size="xs">{type.replace(/-/g, ' ')}</Badge>;
const getDependencyTypeBadge = (type: DependencyType) => <Badge color={dependencyTypeColorMap[type]} size="xs">{type}</Badge>;
const getMeetingTypeBadge = (type: MeetingType) => <Badge color={meetingTypeColorMap[type]} size="xs">{type.replace(/-/g, ' ')}</Badge>;
const getPriorityBadge = (priority: 'standard' | 'priority' | 'accelerated' | 'breakthrough') => <Badge color={priorityColorMap[priority]} size="xs">{priority}</Badge>;

// =============================================================================
// VIEW TYPE
// =============================================================================

type TrackerView = 'global-timeline' | 'regions' | 'requirements' | 'cross-references' | 'dependencies' | 'meetings';

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface MultiRegionSubmissionTrackerProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function MultiRegionSubmissionTracker({ filters: _filters }: MultiRegionSubmissionTrackerProps) {
    const { deadClick } = useDeadClick();
  const [activeView, setActiveView] = useState<TrackerView>('global-timeline');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGlobalId, setSelectedGlobalId] = useState<string | null>('global-001');
  const [selectedRegion, setSelectedRegion] = useState<Region | 'all'>('all');
  const [selectedPhase, setSelectedPhase] = useState<SubmissionPhase | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<SubmissionStatus | 'all'>('all');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set(['US', 'EU', 'Japan']));
  const { filterByProductId, isFiltered } = useProductFilter();

  // Views configuration
  const views: { id: TrackerView; label: string; icon: React.ReactNode }[] = [
    { id: 'global-timeline', label: 'Global Timeline', icon: <Globe2 className="w-4 h-4" /> },
    { id: 'regions', label: 'By Region', icon: <MapPin className="w-4 h-4" /> },
    { id: 'requirements', label: 'Requirements', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'cross-references', label: 'Cross-References', icon: <Link2 className="w-4 h-4" /> },
    { id: 'dependencies', label: 'Dependencies', icon: <GitBranch className="w-4 h-4" /> },
    { id: 'meetings', label: 'HA Meetings', icon: <Users className="w-4 h-4" /> },
  ];

  // Apply product filter to global submissions list
  const visibleGlobalSubmissions = useMemo(
    () => filterByProductId(mockGlobalSubmissions),
    [filterByProductId]
  );

  // Auto-select first visible global when filter changes
  const resolvedGlobalId = useMemo(() => {
    if (!isFiltered) return selectedGlobalId;
    const first = visibleGlobalSubmissions[0];
    return first ? first.id : null;
  }, [isFiltered, selectedGlobalId, visibleGlobalSubmissions]);

  // Get selected global submission
  const selectedGlobal = visibleGlobalSubmissions.find(g => g.id === resolvedGlobalId);

  // Get regional submissions for selected global
  const regionalSubmissions = useMemo(() => {
    const base = filterByProductId(mockRegionalSubmissions);
    if (!resolvedGlobalId) return base;
    return base.filter(r => r.globalSubmissionId === resolvedGlobalId);
  }, [resolvedGlobalId, filterByProductId]);

  // Filter regional submissions
  const filteredRegionalSubmissions = useMemo(() => {
    return regionalSubmissions.filter(sub => {
      if (selectedRegion !== 'all' && sub.region !== selectedRegion) return false;
      if (selectedPhase !== 'all' && sub.phase !== selectedPhase) return false;
      if (selectedStatus !== 'all' && sub.status !== selectedStatus) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return sub.productName.toLowerCase().includes(query) ||
               sub.region.toLowerCase().includes(query) ||
               sub.authority.toLowerCase().includes(query);
      }
      return true;
    });
  }, [regionalSubmissions, selectedRegion, selectedPhase, selectedStatus, searchQuery]);

  // Get all cross-references
  const allCrossReferences = useMemo(() => {
    return regionalSubmissions.flatMap(sub => sub.crossReferences);
  }, [regionalSubmissions]);

  // Get all meetings
  const allMeetings = useMemo(() => {
    return regionalSubmissions.flatMap(sub => sub.meetings);
  }, [regionalSubmissions]);

  // Statistics
  const stats = useMemo(() => {
    const subs = regionalSubmissions;
    return {
      totalRegions: new Set(subs.map(s => s.region)).size,
      onTrack: subs.filter(s => s.status === 'on-track' || s.status === 'submitted').length,
      atRisk: subs.filter(s => s.status === 'at-risk').length,
      avgReadiness: Math.round(subs.reduce((sum, s) => sum + s.readinessPercent, 0) / subs.length),
      pendingMilestones: subs.flatMap(s => s.milestones).filter(m => m.status === 'pending').length,
      upcomingMeetings: allMeetings.filter(m => m.status === 'scheduled' || m.status === 'requested').length,
      crossRefs: allCrossReferences.filter(x => x.status === 'active').length
    };
  }, [regionalSubmissions, allCrossReferences, allMeetings]);

  // Toggle region expansion
  const toggleRegion = (region: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  };

  // =============================================================================
  // RENDER FUNCTIONS
  // =============================================================================

  // Global Timeline View
  const renderGlobalTimelineView = () => {
    // Group events by month
    const eventsByMonth = mockTimelineEvents.reduce((acc, event) => {
      const month = event.date.substring(0, 7); // YYYY-MM
      if (!acc[month]) acc[month] = [];
      acc[month].push(event);
      return acc;
    }, {} as Record<string, TimelineEvent[]>);

    const sortedMonths = Object.keys(eventsByMonth).sort();

    return (
      <div className="space-y-4 md:space-y-6">
        {/* Timeline header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Global Submission Timeline</h3>
            {selectedGlobal && (
              <Badge color="blue" size="sm">{selectedGlobal.productName}</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-400" /> Upcoming</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-400" /> Overdue</span>
          </div>
        </div>

        {/* Region headers */}
        <div className="grid grid-cols-8 gap-2 px-4 py-2 bg-gray-800/50 rounded-lg">
          <div className="col-span-1 md:col-span-2 text-sm font-medium text-gray-400">Timeline</div>
          {regionConfigs.slice(0, 6).map(region => (
            <div key={region.code} className="text-center">
              <span className="text-lg">{region.flag}</span>
              <div className="text-xs text-gray-400 mt-1">{region.code}</div>
            </div>
          ))}
        </div>

        {/* Timeline content */}
        <div className="space-y-4">
          {sortedMonths.map(month => {
            const monthEvents = eventsByMonth[month];
            const monthDate = new Date(month + '-01');
            const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const isPast = monthDate < new Date();

            return (
              <div key={month} className={`relative ${isPast ? 'opacity-60' : ''}`}>
                {/* Month header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium text-gray-300">{monthName}</span>
                </div>

                {/* Events row */}
                <div className="ml-4 grid grid-cols-8 gap-2">
                  <div className="col-span-1 md:col-span-2" />
                  {regionConfigs.slice(0, 6).map(region => {
                    const regionEvents = monthEvents.filter(e => e.region === region.code);
                    return (
                      <div key={region.code} className="min-h-[60px]">
                        {regionEvents.map(event => (
                          <div
                            key={event.id}
                            className={`p-2 rounded-lg text-xs mb-2 cursor-pointer transition-all hover:scale-105 ${
                              event.status === 'completed' ? 'bg-emerald-500/20 border border-emerald-500/30' :
                              event.status === 'overdue' ? 'bg-red-500/20 border border-red-500/30' :
                              'bg-blue-500/20 border border-blue-500/30'
                            }`}
                          >
                            <div className="font-medium text-white truncate">{event.title}</div>
                            <div className="text-gray-400 mt-0.5">{new Date(event.date).getDate()}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Regions View
  const renderRegionsView = () => {
    // Group submissions by region
    const submissionsByRegion = filteredRegionalSubmissions.reduce((acc, sub) => {
      if (!acc[sub.region]) acc[sub.region] = [];
      acc[sub.region].push(sub);
      return acc;
    }, {} as Record<Region, RegionalSubmission[]>);

    return (
      <div className="space-y-4">
        {Object.entries(submissionsByRegion).map(([region, subs]) => {
          const config = regionConfigs.find(r => r.code === region);
          const isExpanded = expandedRegions.has(region);

          return (
            <Card key={region} className="bg-gray-800/50 border-gray-700">
              <CardHeader className="py-3">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleRegion(region)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{config?.flag}</span>
                    <div>
                      <h4 className="font-semibold text-white">{config?.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        {getAuthorityBadge(config?.authority as HealthAuthority)}
                        <span>•</span>
                        <span>{subs.length} submission{subs.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Avg. Readiness</div>
                      <div className="text-lg font-semibold text-white">
                        {Math.round(subs.reduce((sum, s) => sum + s.readinessPercent, 0) / subs.length)}%
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
              </CardHeader>
              
              {isExpanded && (
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {subs.map(sub => (
                      <div 
                        key={sub.id}
                        className="p-4 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-white">{sub.productName}</h5>
                              {getStatusBadge(sub.status)}
                              {getPriorityBadge(sub.priority)}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                              <Badge color="slate" size="xs">{sub.submissionType}</Badge>
                              {sub.applicationNumber && <span>• {sub.applicationNumber}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-400">Target</div>
                            <div className="text-sm text-white">{new Date(sub.targetDate).toLocaleDateString()}</div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-gray-400">Readiness</span>
                            <span className="text-white">{sub.readinessPercent}%</span>
                          </div>
                          <ProgressBar 
                            progress={sub.readinessPercent} 
                            color={sub.readinessPercent >= 80 ? 'emerald' : sub.readinessPercent >= 50 ? 'amber' : 'red'}
                            size="sm"
                          />
                        </div>

                        <div className="mt-3 flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {sub.lead}
                          </span>
                          {sub.localAgent && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {sub.localAgent}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Milestone className="w-4 h-4" />
                            {sub.milestones.filter(m => m.status === 'pending').length} pending
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  // Requirements Matrix View
  const renderRequirementsView = () => {
    // Get all unique requirements across regions
    const allRequirements = filteredRegionalSubmissions.flatMap(sub => 
      sub.requirements.map(req => ({ ...req, region: sub.region, submissionId: sub.id }))
    );

    // Group by category
    const requirementsByCategory = allRequirements.reduce((acc, req) => {
      if (!acc[req.category]) acc[req.category] = [];
      acc[req.category].push(req);
      return acc;
    }, {} as Record<string, (RegionalRequirement & { region: Region; submissionId: string })[]>);

    const categoryIcons: Record<string, React.ReactNode> = {
      'administrative': <FileText className="w-4 h-4" />,
      'quality': <Shield className="w-4 h-4" />,
      'nonclinical': <Activity className="w-4 h-4" />,
      'clinical': <Users className="w-4 h-4" />,
      'labeling': <Package className="w-4 h-4" />,
      'manufacturing': <Building2 className="w-4 h-4" />,
      'post-market': <BarChart3 className="w-4 h-4" />,
    };

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-400" />
            Regional Requirements Matrix
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <Badge color="emerald" size="xs">Complete</Badge>
            <Badge color="blue" size="xs">In Progress</Badge>
            <Badge color="slate" size="xs">Not Started</Badge>
            <Badge color="purple" size="xs">Region-Specific</Badge>
          </div>
        </div>

        {Object.entries(requirementsByCategory).map(([category, reqs]) => (
          <Card key={category} className="bg-gray-800/50 border-gray-700">
            <CardHeader className="py-3">
              <div className="flex items-center gap-2">
                {categoryIcons[category]}
                <h4 className="font-semibold text-white capitalize">{category}</h4>
                <Badge color="slate" size="xs">{reqs.length} requirements</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reqs.map((req, idx) => (
                  <div 
                    key={`${req.id}-${idx}`}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getRegionBadge(req.region)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{req.description}</span>
                          {req.regionSpecific && <Badge color="purple" size="xs">Region-Specific</Badge>}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">
                          {req.module} - {req.section}
                          {req.fdaEquivalent && <span className="ml-2">• FDA equivalent: {req.fdaEquivalent}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right text-sm">
                        <div className="text-gray-400">Due: {new Date(req.dueDate).toLocaleDateString()}</div>
                        <div className="text-gray-500">{req.owner}</div>
                      </div>
                      {getRequirementStatusBadge(req.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Cross-References View
  const renderCrossReferencesView = () => {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-cyan-400" />
            Cross-Regional References
          </h3>
          <div className="text-sm text-gray-400">
            {allCrossReferences.filter(x => x.status === 'active').length} active references
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {allCrossReferences.map(xref => {
            const sourceConfig = regionConfigs.find(r => r.code === xref.sourceRegion);
            const targetConfig = regionConfigs.find(r => r.code === xref.targetRegion);

            return (
              <Card key={xref.id} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sourceConfig?.flag}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <span className="text-xl">{targetConfig?.flag}</span>
                    </div>
                    {getCrossRefTypeBadge(xref.type)}
                  </div>
                  
                  <div className="text-sm text-white mb-2">{xref.description}</div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <Badge color="slate" size="xs">{xref.category}</Badge>
                    <span>•</span>
                    <span>{new Date(xref.createdAt).toLocaleDateString()}</span>
                    {xref.status === 'active' && (
                      <>
                        <span>•</span>
                        <Badge color="emerald" size="xs">Active</Badge>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Visual cross-reference diagram */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <h4 className="font-semibold text-white flex items-center gap-2">
              <Network className="w-4 h-4" />
              Reference Network
            </h4>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-8 py-8">
              {regionConfigs.slice(0, 5).map((region, idx) => {
                const hasRefs = allCrossReferences.some(
                  x => x.sourceRegion === region.code || x.targetRegion === region.code
                );
                return (
                  <div 
                    key={region.code}
                    className={`flex flex-col items-center p-4 rounded-xl ${
                      hasRefs ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-700/30 border border-gray-700'
                    }`}
                  >
                    <span className="text-3xl mb-2">{region.flag}</span>
                    <span className="text-sm font-medium text-white">{region.code}</span>
                    <span className="text-xs text-gray-400">{region.authority}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Dependencies View
  const renderDependenciesView = () => {
    const allDependencies = filteredRegionalSubmissions.flatMap(sub => 
      sub.dependencies.map(dep => ({ ...dep, submissionId: sub.id, productName: sub.productName }))
    );

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-400" />
            Submission Dependencies
          </h3>
          <div className="flex items-center gap-2 text-sm">
            <Badge color="emerald" size="xs">Satisfied</Badge>
            <Badge color="amber" size="xs">Pending</Badge>
            <Badge color="purple" size="xs">Waived</Badge>
          </div>
        </div>

        <div className="space-y-3">
          {allDependencies.map((dep, idx) => {
            const dependentConfig = regionConfigs.find(r => r.code === dep.dependentRegion);
            const requiredConfig = regionConfigs.find(r => r.code === dep.requiredRegion);

            return (
              <div 
                key={`${dep.id}-${idx}`}
                className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                {/* Required Region */}
                <div className="flex flex-col items-center min-w-[80px]">
                  <span className="text-2xl">{requiredConfig?.flag}</span>
                  <span className="text-xs text-gray-400 mt-1">{dep.requiredRegion}</span>
                </div>

                {/* Arrow with dependency type */}
                <div className="flex-1 flex items-center gap-2">
                  <div className={`flex-1 h-0.5 ${
                    dep.status === 'satisfied' ? 'bg-emerald-500' :
                    dep.status === 'waived' ? 'bg-purple-500' : 'bg-amber-500'
                  }`} />
                  <div className="px-3 py-1 rounded-full bg-gray-700">
                    {getDependencyTypeBadge(dep.dependencyType)}
                  </div>
                  <div className={`flex-1 h-0.5 ${
                    dep.status === 'satisfied' ? 'bg-emerald-500' :
                    dep.status === 'waived' ? 'bg-purple-500' : 'bg-amber-500'
                  }`} />
                  <ArrowRight className={`w-5 h-5 ${
                    dep.status === 'satisfied' ? 'text-emerald-500' :
                    dep.status === 'waived' ? 'text-purple-500' : 'text-amber-500'
                  }`} />
                </div>

                {/* Dependent Region */}
                <div className="flex flex-col items-center min-w-[80px]">
                  <span className="text-2xl">{dependentConfig?.flag}</span>
                  <span className="text-xs text-gray-400 mt-1">{dep.dependentRegion}</span>
                </div>

                {/* Details */}
                <div className="flex-1 max-w-[300px]">
                  <div className="text-sm text-white">{dep.description}</div>
                  {dep.requiredMilestone && (
                    <div className="text-xs text-gray-400 mt-1">
                      Requires: {dep.requiredMilestone}
                    </div>
                  )}
                </div>

                {/* Status */}
                <Badge 
                  color={dep.status === 'satisfied' ? 'emerald' : dep.status === 'waived' ? 'purple' : 'amber'} 
                  size="sm"
                >
                  {dep.status}
                </Badge>
              </div>
            );
          })}
        </div>

        {allDependencies.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No dependencies for selected submissions</p>
          </div>
        )}
      </div>
    );
  };

  // Meetings View
  const renderMeetingsView = () => {
    const sortedMeetings = [...allMeetings].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const upcomingMeetings = sortedMeetings.filter(m => m.status === 'scheduled' || m.status === 'requested');
    const completedMeetings = sortedMeetings.filter(m => m.status === 'completed');

    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Health Authority Meetings
          </h3>
        </div>

        {/* Upcoming Meetings */}
        {upcomingMeetings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Upcoming & Requested
            </h4>
            <div className="space-y-3">
              {upcomingMeetings.map(mtg => {
                const config = regionConfigs.find(r => r.code === mtg.region);
                return (
                  <Card key={mtg.id} className="bg-gray-800/50 border-gray-700 border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{config?.flag}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-white">{mtg.title}</h5>
                              {getMeetingTypeBadge(mtg.meetingType)}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {mtg.authority} • {new Date(mtg.date).toLocaleDateString()}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {mtg.keyTopics.map((topic, idx) => (
                                <Badge key={idx} color="slate" size="xs">{topic}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Badge 
                          color={mtg.status === 'scheduled' ? 'blue' : 'amber'} 
                          size="sm"
                        >
                          {mtg.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Completed Meetings */}
        {completedMeetings.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Completed
            </h4>
            <div className="space-y-3">
              {completedMeetings.map(mtg => {
                const config = regionConfigs.find(r => r.code === mtg.region);
                return (
                  <Card key={mtg.id} className="bg-gray-800/50 border-gray-700 opacity-75">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">{config?.flag}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-white">{mtg.title}</h5>
                              {getMeetingTypeBadge(mtg.meetingType)}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">
                              {mtg.authority} • {new Date(mtg.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {mtg.outcome && (
                          <Badge 
                            color={mtg.outcome === 'favorable' ? 'emerald' : mtg.outcome === 'unfavorable' ? 'red' : 'amber'} 
                            size="sm"
                          >
                            {mtg.outcome}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-6 h-6 text-blue-400" />
            Multi-Region Submission Tracker
          </h2>
          <p className="text-sm text-gray-400 mt-1">Global regulatory submission timeline and coordination</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedGlobalId || ''}
            onChange={(e) => setSelectedGlobalId(e.target.value || null)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="">All Programs</option>
            {visibleGlobalSubmissions.map(g => (
              <option key={g.id} value={g.id}>{g.productName}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" onClick={() => toast.success('Multi-region submission action recorded')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Bar */}
      <div className="grid grid-cols-7 gap-4">
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Globe2 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.totalRegions}</div>
              <div className="text-xs text-gray-400">Regions</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.onTrack}</div>
              <div className="text-xs text-gray-400">On Track</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.atRisk}</div>
              <div className="text-xs text-gray-400">At Risk</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Target className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.avgReadiness}%</div>
              <div className="text-xs text-gray-400">Avg Readiness</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20">
              <Milestone className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.pendingMilestones}</div>
              <div className="text-xs text-gray-400">Pending Milestones</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20">
              <Users className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.upcomingMeetings}</div>
              <div className="text-xs text-gray-400">Upcoming Meetings</div>
            </div>
          </div>
        </Card>
        <Card className="bg-gray-800/50 border-gray-700 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <Link2 className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.crossRefs}</div>
              <div className="text-xs text-gray-400">Active Cross-Refs</div>
            </div>
          </div>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-700 pb-2">
        {views.map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeView === view.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {view.icon}
            {view.label}
          </button>
        ))}
      </div>

      {/* Filters (for Regions view) */}
      {activeView === 'regions' && (
        <div className="flex items-center gap-4">
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search submissions..."
            className="w-64"
          />
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value as Region | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="all">All Regions</option>
            {regionConfigs.map(r => (
              <option key={r.code} value={r.code}>{r.flag} {r.name}</option>
            ))}
          </select>
          <select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value as SubmissionPhase | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="all">All Phases</option>
            {(['planning', 'preparation', 'pre-submission', 'submission', 'validation', 'review', 'approval', 'post-approval'] as SubmissionPhase[]).map(p => (
              <option key={p} value={p}>{p.replace(/-/g, ' ')}</option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as SubmissionStatus | 'all')}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white"
          >
            <option value="all">All Statuses</option>
            {(['on-track', 'at-risk', 'delayed', 'blocked', 'submitted', 'approved'] as SubmissionStatus[]).map(s => (
              <option key={s} value={s}>{s.replace(/-/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {/* Main Content */}
      <div className="min-h-[600px]">
        {activeView === 'global-timeline' && renderGlobalTimelineView()}
        {activeView === 'regions' && renderRegionsView()}
        {activeView === 'requirements' && renderRequirementsView()}
        {activeView === 'cross-references' && renderCrossReferencesView()}
        {activeView === 'dependencies' && renderDependenciesView()}
        {activeView === 'meetings' && renderMeetingsView()}
      </div>
    </div>
    </div>
  );
}

export default MultiRegionSubmissionTracker;
