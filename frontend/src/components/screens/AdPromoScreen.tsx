
/**
 * AdPromo Screen - v0.35.1
 * Advertising & Promotional Materials Review Dashboard
 * 
 * Manages promotional compliance across:
 * - Materials submission queue
 * - MLR (Medical/Legal/Regulatory) review workflow
 * - Claims database
 * - Reference library
 * - Compliance tracking
 */

import { useState, useMemo } from 'react';
import {
  Shield, FileText, Users, MessageSquare, ClipboardCheck, Archive,
  Search, Plus, ChevronRight, CheckCircle, AlertTriangle, Clock, X,
  User, Calendar, Eye, AlertCircle, TrendingUp, Image, Video,
  BarChart3, Activity, Gauge, Target, Megaphone, FileCheck, GraduationCap,
  AlertOctagon, FileWarning, RefreshCw, Send, ThumbsUp, ThumbsDown,
  BookOpen, Link2, Globe, Sparkles, Edit, History, Award, ExternalLink,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { SearchInput } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/Progress';
import { useCollapsedSections } from '@/hooks/useCollapsedSections';
import { useDeadClick } from '@/hooks/useDeadClick';
import { useAppStore } from '@/store/useAppStore';
import { useProductFilter } from '@/hooks/useProductFilter';

// ============================================================================
// TYPES
// ============================================================================

type AdPromoTab = 'dashboard' | 'queue' | 'claims' | 'references' | 'history' | 'training';

type MaterialType = 'sales-aid' | 'patient-brochure' | 'hcp-email' | 'digital-banner' | 'video' | 'website' | 'social-media' | 'press-release';
type ReviewStatus = 'draft' | 'submitted' | 'medical-review' | 'legal-review' | 'regulatory-review' | 'final-approval' | 'approved' | 'rejected' | 'revision-required';

interface PromotionalMaterial {
  id: string;
  title: string;
  type: MaterialType;
  product: string;
  status: ReviewStatus;
  submittedBy: string;
  submittedDate: string;
  dueDate: string;
  currentReviewer?: string;
  reviewStage: 'medical' | 'legal' | 'regulatory' | 'final' | 'complete';
  claimsCount: number;
  referencesCount: number;
  version: number;
  comments: number;
}

interface Claim {
  id: string;
  text: string;
  type: 'efficacy' | 'safety' | 'comparative' | 'mechanism' | 'dosing';
  status: 'approved' | 'pending' | 'rejected' | 'expired';
  product: string;
  supportingRefs: number;
  approvedDate?: string;
  expiryDate?: string;
  usageCount: number;
}

interface Reference {
  id: string;
  citation: string;
  type: 'clinical-trial' | 'publication' | 'prescribing-info' | 'internal-data' | 'guideline';
  product: string;
  status: 'active' | 'expired' | 'superseded';
  linkedClaims: number;
  addedDate: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockMaterials: PromotionalMaterial[] = [
  { id: 'PM-001', title: 'LIG-2847 HCP Detail Aid Q1 2025', type: 'sales-aid', product: 'LIG-2847', status: 'medical-review', submittedBy: 'Marketing Team', submittedDate: '2025-01-15', dueDate: '2025-01-25', currentReviewer: 'Dr. Jennifer Walsh', reviewStage: 'medical', claimsCount: 12, referencesCount: 8, version: 2, comments: 3 },
  { id: 'PM-002', title: 'Patient Support Program Brochure', type: 'patient-brochure', product: 'LIG-2847', status: 'legal-review', submittedBy: 'Patient Services', submittedDate: '2025-01-12', dueDate: '2025-01-22', currentReviewer: 'Legal Team', reviewStage: 'legal', claimsCount: 5, referencesCount: 3, version: 1, comments: 1 },
  { id: 'PM-003', title: 'ASCO 2025 Booth Graphics', type: 'digital-banner', product: 'LIG-2847', status: 'final-approval', submittedBy: 'Events Team', submittedDate: '2025-01-10', dueDate: '2025-01-20', reviewStage: 'final', claimsCount: 4, referencesCount: 6, version: 3, comments: 8 },
  { id: 'PM-004', title: 'Mechanism of Action Video', type: 'video', product: 'LIG-2847', status: 'revision-required', submittedBy: 'Medical Affairs', submittedDate: '2025-01-08', dueDate: '2025-01-28', reviewStage: 'medical', claimsCount: 8, referencesCount: 12, version: 1, comments: 5 },
  { id: 'PM-005', title: 'LinkedIn Disease Awareness Campaign', type: 'social-media', product: 'LIG-2847', status: 'submitted', submittedBy: 'Digital Team', submittedDate: '2025-01-18', dueDate: '2025-01-30', reviewStage: 'medical', claimsCount: 2, referencesCount: 2, version: 1, comments: 0 },
  { id: 'PM-006', title: 'HCP Email - Phase 3 Results', type: 'hcp-email', product: 'LIG-2847', status: 'approved', submittedBy: 'Marketing Team', submittedDate: '2025-01-05', dueDate: '2025-01-15', reviewStage: 'complete', claimsCount: 6, referencesCount: 4, version: 2, comments: 4 },
];

const mockClaims: Claim[] = [
  { id: 'CLM-001', text: 'LIG-2847 demonstrated statistically significant improvement in ORR vs. standard of care (42% vs 18%, p<0.001)', type: 'efficacy', status: 'approved', product: 'LIG-2847', supportingRefs: 3, approvedDate: '2024-11-15', expiryDate: '2025-11-15', usageCount: 24 },
  { id: 'CLM-002', text: 'The most common adverse reactions (≥20%) were fatigue, nausea, and diarrhea', type: 'safety', status: 'approved', product: 'LIG-2847', supportingRefs: 2, approvedDate: '2024-10-20', expiryDate: '2025-10-20', usageCount: 18 },
  { id: 'CLM-003', text: 'Median PFS of 8.2 months in the intent-to-treat population', type: 'efficacy', status: 'approved', product: 'LIG-2847', supportingRefs: 2, approvedDate: '2024-11-15', expiryDate: '2025-11-15', usageCount: 31 },
  { id: 'CLM-004', text: 'Once-daily oral dosing provides convenient administration', type: 'dosing', status: 'approved', product: 'LIG-2847', supportingRefs: 1, approvedDate: '2024-09-10', usageCount: 42 },
  { id: 'CLM-005', text: 'Novel mechanism targeting KRAS G12C mutation', type: 'mechanism', status: 'pending', product: 'LIG-2847', supportingRefs: 4, usageCount: 0 },
];

const mockReferences: Reference[] = [
  { id: 'REF-001', citation: 'Smith et al. NEJM 2024; Phase 3 STELLAR Trial Results', type: 'clinical-trial', product: 'LIG-2847', status: 'active', linkedClaims: 8, addedDate: '2024-09-15' },
  { id: 'REF-002', citation: 'LIG-2847 (Ligatinib) Prescribing Information, Ligature Pharma 2024', type: 'prescribing-info', product: 'LIG-2847', status: 'active', linkedClaims: 12, addedDate: '2024-08-01' },
  { id: 'REF-003', citation: 'Jones et al. JCO 2024; Real-world outcomes with KRAS G12C inhibitors', type: 'publication', product: 'LIG-2847', status: 'active', linkedClaims: 3, addedDate: '2024-11-20' },
  { id: 'REF-004', citation: 'NCCN Clinical Practice Guidelines in Oncology: NSCLC v1.2025', type: 'guideline', product: 'LIG-2847', status: 'active', linkedClaims: 2, addedDate: '2025-01-05' },
];

const metrics = {
  pendingReview: 5,
  inMedicalReview: 2,
  inLegalReview: 1,
  inRegulatoryReview: 0,
  awaitingFinalApproval: 1,
  revisionRequired: 1,
  approvedThisMonth: 3,
  avgReviewTime: 6.2,
  activeClaims: 45,
  expiringClaims: 4,
  totalReferences: 128,
  complianceRate: 96,
};

// ============================================================================
// COMPONENTS
// ============================================================================

const typeIcons: Record<MaterialType, React.ReactNode> = {
  'sales-aid': <FileText className="w-4 h-4" />,
  'patient-brochure': <BookOpen className="w-4 h-4" />,
  'hcp-email': <Send className="w-4 h-4" />,
  'digital-banner': <Image className="w-4 h-4" />,
  'video': <Video className="w-4 h-4" />,
  'website': <Globe className="w-4 h-4" />,
  'social-media': <MessageSquare className="w-4 h-4" />,
  'press-release': <Megaphone className="w-4 h-4" />,
};

const statusColors: Record<ReviewStatus, 'gray' | 'blue' | 'amber' | 'purple' | 'green' | 'red'> = {
  'draft': 'gray',
  'submitted': 'blue',
  'medical-review': 'amber',
  'legal-review': 'amber',
  'regulatory-review': 'amber',
  'final-approval': 'purple',
  'approved': 'green',
  'rejected': 'red',
  'revision-required': 'red',
};

const MetricCard = ({ title, value, subtitle, icon, color = 'blue' }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: 'green' | 'amber' | 'red' | 'blue' | 'purple';
}) => {
  const colors = {
    green: 'text-green-400 bg-green-500/10',
    amber: 'text-amber-400 bg-amber-500/10',
    red: 'text-red-400 bg-red-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  };
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`p-2 rounded-lg ${colors[color]} w-fit`}>{icon}</div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-text-primary">{value}</div>
          <div className="text-sm text-text-secondary">{title}</div>
          {subtitle && <div className="text-xs text-text-muted mt-1">{subtitle}</div>}
        </div>
      </CardContent>
    </Card>
  );
};

const MaterialRow = ({ material }: { material: PromotionalMaterial }) => {
  const daysUntilDue = Math.ceil((new Date(material.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-surface-card rounded-lg hover:bg-surface-card/80 cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-surface rounded-lg text-text-muted">
          {typeIcons[material.type]}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-primary">{material.title}</span>
            <Badge color={statusColors[material.status]} size="xs">{material.status.replace('-', ' ')}</Badge>
            {material.status === 'revision-required' && <Badge color="red" size="xs">Action Required</Badge>}
          </div>
          <div className="text-sm text-text-muted mt-1">
            {material.product} • v{material.version} • {material.claimsCount} claims • {material.referencesCount} refs
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        {material.currentReviewer && (
          <div className="text-center">
            <div className="text-xs text-text-muted">Reviewer</div>
            <div className="text-text-secondary">{material.currentReviewer}</div>
          </div>
        )}
        <div className="text-center">
          <div className="text-xs text-text-muted">Due</div>
          <div className={`font-medium ${daysUntilDue <= 3 ? 'text-red-400' : daysUntilDue <= 7 ? 'text-amber-400' : 'text-text-secondary'}`}>
            {daysUntilDue <= 0 ? 'Overdue' : `${daysUntilDue}d`}
          </div>
        </div>
        {material.comments > 0 && (
          <div className="flex items-center gap-1 text-text-muted">
            <MessageSquare className="w-4 h-4" />
            <span>{material.comments}</span>
          </div>
        )}
        <ChevronRight className="w-5 h-5 text-text-muted" />
      </div>
    </div>
  );
};

const ClaimRow = ({ claim }: { claim: Claim }) => {
  const typeColors: Record<string, 'blue' | 'green' | 'purple' | 'amber' | 'red'> = {
    efficacy: 'blue',
    safety: 'red',
    comparative: 'purple',
    mechanism: 'green',
    dosing: 'amber',
  };
  
  return (
    <div className="p-4 bg-surface-card rounded-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge color={typeColors[claim.type] || 'gray'} size="xs">{claim.type}</Badge>
            <Badge color={claim.status === 'approved' ? 'green' : claim.status === 'pending' ? 'amber' : 'red'} size="xs">{claim.status}</Badge>
          </div>
          <p className="text-sm text-text-primary">{claim.text}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span>{claim.supportingRefs} references</span>
            <span>Used {claim.usageCount}x</span>
            {claim.expiryDate && <span>Expires {claim.expiryDate}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ReviewPipeline = ({ materials }: { materials: PromotionalMaterial[] }) => {
  const stages = [
    { id: 'submitted', label: 'Submitted', count: materials.filter(m => m.status === 'submitted').length },
    { id: 'medical', label: 'Medical', count: materials.filter(m => m.status === 'medical-review').length },
    { id: 'legal', label: 'Legal', count: materials.filter(m => m.status === 'legal-review').length },
    { id: 'regulatory', label: 'Regulatory', count: materials.filter(m => m.status === 'regulatory-review').length },
    { id: 'final', label: 'Final', count: materials.filter(m => m.status === 'final-approval').length },
    { id: 'approved', label: 'Approved', count: materials.filter(m => m.status === 'approved').length },
  ];
  
  return (
    <div className="flex items-center gap-2">
      {stages.map((stage, i) => (
        <div key={stage.id} className="flex items-center">
          <div className={`px-4 py-2 rounded-lg text-center min-w-[80px] ${
            stage.count > 0 ? 'bg-accent-blue/10 border border-accent-blue/30' : 'bg-surface-card border border-border'
          }`}>
            <div className={`text-lg font-bold ${stage.count > 0 ? 'text-accent-blue' : 'text-text-muted'}`}>{stage.count}</div>
            <div className="text-xs text-text-muted">{stage.label}</div>
          </div>
          {i < stages.length - 1 && <ChevronRight className="w-4 h-4 text-text-muted mx-1" />}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// REFERENCES TAB
// ============================================================================

interface FullReference {
  id: string;
  citation: string;
  shortTitle: string;
  type: 'clinical-trial' | 'publication' | 'prescribing-info' | 'internal-data' | 'guideline' | 'advisory-committee';
  product: string;
  status: 'active' | 'expired' | 'superseded';
  linkedClaims: number;
  addedDate: string;
  expiryDate?: string;
  doi?: string;
  notes?: string;
}

const mockFullReferences: FullReference[] = [
  { id: 'REF-001', citation: 'Smith JA, et al. NEJM 2024;391:1234-1248. Phase 3 STELLAR Trial: LIG-2847 vs Standard of Care in KRAS G12C+ NSCLC.', shortTitle: 'STELLAR Phase 3 (Smith 2024)', type: 'clinical-trial', product: 'LIG-2847', status: 'active', linkedClaims: 8, addedDate: '2024-09-15', doi: '10.1056/NEJMoa2024XXXX' },
  { id: 'REF-002', citation: 'LIG-2847 (Ligatinib) Prescribing Information. Ligature Biosciences, Inc. Version 2.0, August 2024.', shortTitle: 'LIG-2847 US Prescribing Information', type: 'prescribing-info', product: 'LIG-2847', status: 'active', linkedClaims: 12, addedDate: '2024-08-01', expiryDate: '2026-08-01' },
  { id: 'REF-003', citation: 'Jones BC, et al. JCO 2024;42(15):1889-1901. Real-world outcomes with KRAS G12C inhibitors in unresectable NSCLC.', shortTitle: 'Jones et al. JCO 2024 Real-World', type: 'publication', product: 'LIG-2847', status: 'active', linkedClaims: 3, addedDate: '2024-11-20', doi: '10.1200/JCO.2024.XXX' },
  { id: 'REF-004', citation: 'NCCN Clinical Practice Guidelines in Oncology: Non-Small Cell Lung Cancer. Version 1.2025. National Comprehensive Cancer Network.', shortTitle: 'NCCN NSCLC Guidelines v1.2025', type: 'guideline', product: 'LIG-2847', status: 'active', linkedClaims: 2, addedDate: '2025-01-05', expiryDate: '2025-12-31' },
  { id: 'REF-005', citation: 'Ligature Biosciences Internal Data on File. LIG-2847 Post-Marketing Surveillance Analysis Q3 2024.', shortTitle: 'LIG-2847 PMS Q3 2024 (Internal)', type: 'internal-data', product: 'LIG-2847', status: 'active', linkedClaims: 4, addedDate: '2024-10-30' },
  { id: 'REF-006', citation: 'FDA Oncology Advisory Committee Meeting. LIG-2847 NDA 215XXX Review. March 2024.', shortTitle: 'FDA Adcom LIG-2847 March 2024', type: 'advisory-committee', product: 'LIG-2847', status: 'active', linkedClaims: 6, addedDate: '2024-03-28' },
  { id: 'REF-007', citation: 'Brown T, et al. Cancer Res 2023;83(11):2001-2015. Preclinical characterization of LIG-2847, a selective KRAS G12C inhibitor.', shortTitle: 'Brown et al. Cancer Res 2023', type: 'publication', product: 'LIG-2847', status: 'active', linkedClaims: 1, addedDate: '2023-06-15', doi: '10.1158/0008-5472.CAN-23-XXXX' },
  { id: 'REF-008', citation: 'Smith JA, et al. NEJM 2022;386:1701-1713. Phase 1/2 STELLAR-1 Trial: LIG-2847 dose escalation in advanced solid tumors.', shortTitle: 'STELLAR-1 Phase 1/2 (Smith 2022)', type: 'clinical-trial', product: 'LIG-2847', status: 'superseded', linkedClaims: 0, addedDate: '2022-04-28', doi: '10.1056/NEJMoa2022XXXX', notes: 'Superseded by Phase 3 STELLAR data' },
];

const refTypeColors: Record<FullReference['type'], 'blue' | 'green' | 'purple' | 'amber' | 'slate' | 'red'> = {
  'clinical-trial':     'blue',
  'publication':        'green',
  'prescribing-info':   'purple',
  'internal-data':      'amber',
  'guideline':          'slate',
  'advisory-committee': 'red',
};

const refTypeLabels: Record<FullReference['type'], string> = {
  'clinical-trial':     'Clinical Trial',
  'publication':        'Publication',
  'prescribing-info':   'Prescribing Info',
  'internal-data':      'Internal Data',
  'guideline':          'Guideline',
  'advisory-committee': 'Advisory Committee',
};

function AdPromoReferencesTab({ searchQuery }: { searchQuery: string }) {
    const { deadClick } = useDeadClick();
  const [filterType, setFilterType] = useState<FullReference['type'] | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'superseded'>('active');
  const { filterByProductName } = useProductFilter();
  const productRefs = useMemo(() => filterByProductName(mockFullReferences), [filterByProductName]);

  const filtered = useMemo(() => {
    let list = productRefs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.citation.toLowerCase().includes(q) || r.shortTitle.toLowerCase().includes(q));
    }
    if (filterType !== 'all') list = list.filter(r => r.type === filterType);
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    return list;
  }, [searchQuery, filterType, filterStatus]);

  const activeCount = productRefs.filter(r => r.status === 'active').length;
  const expiredCount = productRefs.filter(r => r.status === 'expired').length;
  const supersededCount = productRefs.filter(r => r.status === 'superseded').length;
  const totalLinkedClaims = productRefs.filter(r => r.status === 'active').reduce((acc, r) => acc + r.linkedClaims, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><BookOpen className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">{activeCount}</span></div><div className="text-sm text-text-secondary">Active References</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Link2 className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-blue-400">{totalLinkedClaims}</span></div><div className="text-sm text-text-secondary">Total Claim Links</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{expiredCount}</span></div><div className="text-sm text-text-secondary">Expired</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><RefreshCw className="w-5 h-5 text-slate-400" /><span className="text-2xl font-bold text-text-primary">{supersededCount}</span></div><div className="text-sm text-text-secondary">Superseded</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Status:</span>
          {(['all', 'active', 'expired', 'superseded'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-xs rounded-full transition-colors capitalize ${filterStatus === s ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:text-text-secondary'}`}>{s}</button>
          ))}
        </div>
      </div>

      {/* Reference Cards */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted">No references match your filter</div>
        ) : filtered.map(ref => (
          <div key={ref.id} className={`p-4 bg-surface-card rounded-lg border ${ref.status === 'superseded' ? 'opacity-60 border-border/50' : 'border-border'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Badge color={refTypeColors[ref.type]} size="xs">{refTypeLabels[ref.type]}</Badge>
                  <Badge color={ref.status === 'active' ? 'green' : ref.status === 'expired' ? 'amber' : 'slate'} size="xs">{ref.status}</Badge>
                  {ref.expiryDate && ref.status === 'active' && <span className="text-xs text-text-muted">Expires {ref.expiryDate}</span>}
                </div>
                <div className="text-sm font-medium text-text-primary mb-1">{ref.shortTitle}</div>
                <div className="text-xs text-text-secondary leading-relaxed">{ref.citation}</div>
                {ref.doi && (
                  <a
                    href={`https://doi.org/${ref.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent-blue mt-1 font-mono hover:underline inline-flex items-center gap-1"
                  >
                    {ref.doi} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {ref.type === 'prescribing-info' && (
                  <button
                    onClick={() => useAppStore.getState().setActiveModule('labeling')}
                    className="text-xs text-accent-blue mt-1 hover:underline inline-flex items-center gap-1"
                  >
                    View in Labeling <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                {ref.notes && <div className="text-xs text-amber-300 mt-1 italic">{ref.notes}</div>}
              </div>
              <div className="shrink-0 text-center">
                <div className="text-lg font-bold text-text-primary">{ref.linkedClaims}</div>
                <div className="text-xs text-text-muted">claims</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// HISTORY TAB
// ============================================================================

interface ReviewHistoryEntry {
  id: string;
  materialTitle: string;
  materialType: MaterialType;
  product: string;
  version: number;
  finalStatus: 'approved' | 'rejected';
  submittedDate: string;
  approvedDate: string;
  cycleTimeDays: number;
  reviewers: { name: string; role: 'medical' | 'legal' | 'regulatory'; decision: 'approved' | 'approved-with-comments' | 'rejected' }[];
  totalComments: number;
  revisionRounds: number;
}

const mockHistory: ReviewHistoryEntry[] = [
  { id: 'HIS-001', materialTitle: 'LIG-2847 HCP Detail Aid Q4 2024', materialType: 'sales-aid', product: 'LIG-2847', version: 3, finalStatus: 'approved', submittedDate: '2024-11-05', approvedDate: '2024-11-18', cycleTimeDays: 13, reviewers: [{ name: 'Dr. Jennifer Walsh', role: 'medical', decision: 'approved-with-comments' }, { name: 'Robert Chen', role: 'legal', decision: 'approved' }, { name: 'Sarah Kim', role: 'regulatory', decision: 'approved' }], totalComments: 9, revisionRounds: 2 },
  { id: 'HIS-002', materialTitle: 'HCP Email — STELLAR Phase 3 Data', materialType: 'hcp-email', product: 'LIG-2847', version: 2, finalStatus: 'approved', submittedDate: '2025-01-05', approvedDate: '2025-01-15', cycleTimeDays: 10, reviewers: [{ name: 'Dr. Jennifer Walsh', role: 'medical', decision: 'approved' }, { name: 'Robert Chen', role: 'legal', decision: 'approved' }, { name: 'Sarah Kim', role: 'regulatory', decision: 'approved' }], totalComments: 4, revisionRounds: 1 },
  { id: 'HIS-003', materialTitle: 'Investor Relations Slide Deck Draft', materialType: 'press-release', product: 'LIG-2847', version: 1, finalStatus: 'rejected', submittedDate: '2024-12-15', approvedDate: '2024-12-22', cycleTimeDays: 7, reviewers: [{ name: 'Dr. Jennifer Walsh', role: 'medical', decision: 'rejected' }, { name: 'Robert Chen', role: 'legal', decision: 'approved-with-comments' }], totalComments: 14, revisionRounds: 0 },
  { id: 'HIS-004', materialTitle: 'Patient Brochure — Living with KRAS+ NSCLC', materialType: 'patient-brochure', product: 'LIG-2847', version: 2, finalStatus: 'approved', submittedDate: '2024-10-20', approvedDate: '2024-11-04', cycleTimeDays: 15, reviewers: [{ name: 'Dr. Jennifer Walsh', role: 'medical', decision: 'approved-with-comments' }, { name: 'Robert Chen', role: 'legal', decision: 'approved' }, { name: 'Sarah Kim', role: 'regulatory', decision: 'approved-with-comments' }], totalComments: 11, revisionRounds: 2 },
  { id: 'HIS-005', materialTitle: 'ASCO 2024 Booth Graphics', materialType: 'digital-banner', product: 'LIG-2847', version: 4, finalStatus: 'approved', submittedDate: '2024-04-10', approvedDate: '2024-04-22', cycleTimeDays: 12, reviewers: [{ name: 'Dr. Jennifer Walsh', role: 'medical', decision: 'approved' }, { name: 'Robert Chen', role: 'legal', decision: 'approved' }, { name: 'Sarah Kim', role: 'regulatory', decision: 'approved' }], totalComments: 6, revisionRounds: 1 },
];

const roleDecisionColors = { approved: 'text-green-400', 'approved-with-comments': 'text-amber-400', rejected: 'text-red-400' };
const roleDecisionIcons = { approved: '✓', 'approved-with-comments': '✓*', rejected: '✗' };

function AdPromoHistoryTab({ searchQuery }: { searchQuery: string }) {
  const [selectedEntry, setSelectedEntry] = useState<string | null>('HIS-001');

  const filtered = useMemo(() => {
    if (!searchQuery) return mockHistory;
    const q = searchQuery.toLowerCase();
    return mockHistory.filter(h => h.materialTitle.toLowerCase().includes(q) || h.product.toLowerCase().includes(q));
  }, [searchQuery]);

  const selected = mockHistory.find(h => h.id === selectedEntry);
  const approvedCount = mockHistory.filter(h => h.finalStatus === 'approved').length;
  const avgCycleTime = Math.round(mockHistory.reduce((acc, h) => acc + h.cycleTimeDays, 0) / mockHistory.length);
  const avgComments = Math.round(mockHistory.reduce((acc, h) => acc + h.totalComments, 0) / mockHistory.length);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><CheckCircle className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">{approvedCount}/{mockHistory.length}</span></div><div className="text-sm text-text-secondary">Approval Rate</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Clock className="w-5 h-5 text-blue-400" /><span className="text-2xl font-bold text-blue-400">{avgCycleTime}d</span></div><div className="text-sm text-text-secondary">Avg Cycle Time</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><MessageSquare className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{avgComments}</span></div><div className="text-sm text-text-secondary">Avg Comments/Item</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><History className="w-5 h-5 text-text-muted" /><span className="text-2xl font-bold text-text-primary">{mockHistory.length}</span></div><div className="text-sm text-text-secondary">Reviews Completed</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-2">
          {filtered.map(entry => (
            <div
              key={entry.id}
              onClick={() => setSelectedEntry(entry.id === selectedEntry ? null : entry.id)}
              className={`p-4 rounded-lg cursor-pointer transition-colors border ${selectedEntry === entry.id ? 'bg-accent-blue/10 border-accent-blue/40' : 'bg-surface-card border-border hover:bg-surface-card/80'}`}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-surface rounded text-text-muted">{typeIcons[entry.materialType]}</div>
                  <Badge color={entry.finalStatus === 'approved' ? 'green' : 'red'} size="xs">{entry.finalStatus}</Badge>
                </div>
                <span className="text-xs text-text-muted">{entry.approvedDate}</span>
              </div>
              <div className="text-sm font-medium text-text-primary">{entry.materialTitle}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-text-muted">
                <span>v{entry.version}</span>
                <span>{entry.cycleTimeDays}d cycle</span>
                <span>{entry.totalComments} comments</span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-surface rounded text-text-muted">{typeIcons[selected.materialType]}</div>
                  <div>
                    <div className="font-medium text-text-primary">{selected.materialTitle}</div>
                    <div className="text-xs text-text-muted">{selected.product} • v{selected.version}</div>
                  </div>
                  <Badge color={selected.finalStatus === 'approved' ? 'green' : 'red'} size="sm">{selected.finalStatus}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><div className="text-xs text-text-muted">Submitted</div><div className="text-text-primary">{selected.submittedDate}</div></div>
                  <div><div className="text-xs text-text-muted">Approved</div><div className="text-text-primary">{selected.approvedDate}</div></div>
                  <div><div className="text-xs text-text-muted">Cycle Time</div><div className="text-text-primary">{selected.cycleTimeDays} days</div></div>
                  <div><div className="text-xs text-text-muted">Revision Rounds</div><div className="text-text-primary">{selected.revisionRounds}</div></div>
                </div>

                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-3">Reviewer Decisions</div>
                  <div className="space-y-2">
                    {selected.reviewers.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold ${roleDecisionColors[r.decision]}`}>{roleDecisionIcons[r.decision]}</span>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{r.name}</div>
                            <div className="text-xs text-text-muted capitalize">{r.role} review</div>
                          </div>
                        </div>
                        <Badge color={r.decision === 'approved' ? 'green' : r.decision === 'approved-with-comments' ? 'amber' : 'red'} size="xs">
                          {r.decision.replace(/-/g, ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wide mb-2">Review Metrics</div>
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-2xl font-bold text-text-primary">{selected.totalComments}</div>
                      <div className="text-xs text-text-muted">Total Comments</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-text-primary">{selected.revisionRounds}</div>
                      <div className="text-xs text-text-muted">Revision Rounds</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-text-primary">{selected.cycleTimeDays}d</div>
                      <div className="text-xs text-text-muted">Total Cycle Time</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 text-text-muted text-sm">Select a review to see details</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRAINING TAB
// ============================================================================

interface MLRTrainingRecord {
  id: string;
  personName: string;
  role: 'medical-reviewer' | 'legal-reviewer' | 'regulatory-reviewer' | 'brand-manager' | 'medical-writer';
  training: string;
  category: 'mlr-process' | 'fda-guidance' | 'product-knowledge' | 'tools' | 'compliance';
  completedDate: string | null;
  dueDate: string;
  status: 'completed' | 'overdue' | 'due-soon' | 'not-started';
  certExpiry?: string;
}

const mockMLRTraining: MLRTrainingRecord[] = [
  { id: 'MLR-001', personName: 'Dr. Jennifer Walsh', role: 'medical-reviewer', training: 'FDA Guidance: Promotional Labeling (2014)', category: 'fda-guidance', completedDate: '2024-12-10', dueDate: '2025-01-01', status: 'completed', certExpiry: '2026-12-10' },
  { id: 'MLR-002', personName: 'Robert Chen', role: 'legal-reviewer', training: 'MLR Review Process & SOPs', category: 'mlr-process', completedDate: '2025-01-08', dueDate: '2025-01-15', status: 'completed', certExpiry: '2026-01-08' },
  { id: 'MLR-003', personName: 'Sarah Kim', role: 'regulatory-reviewer', training: 'PhRMA Code on Interactions with HCPs', category: 'compliance', completedDate: '2024-11-20', dueDate: '2024-12-01', status: 'completed', certExpiry: '2025-11-20' },
  { id: 'MLR-004', personName: 'Marcus Lee', role: 'brand-manager', training: 'LIG-2847 Product Knowledge Certification', category: 'product-knowledge', completedDate: null, dueDate: '2025-01-25', status: 'overdue' },
  { id: 'MLR-005', personName: 'Angela Torres', role: 'medical-writer', training: 'Veeva Vault PromoMats System Training', category: 'tools', completedDate: null, dueDate: '2025-01-30', status: 'due-soon' },
  { id: 'MLR-006', personName: 'Dr. Jennifer Walsh', role: 'medical-reviewer', training: 'LIG-2847 Prescribing Information Briefing', category: 'product-knowledge', completedDate: '2024-08-15', dueDate: '2024-09-01', status: 'completed' },
  { id: 'MLR-007', personName: 'Robert Chen', role: 'legal-reviewer', training: 'FTC Endorsement Guides & Social Media', category: 'fda-guidance', completedDate: null, dueDate: '2025-02-10', status: 'not-started' },
  { id: 'MLR-008', personName: 'Sarah Kim', role: 'regulatory-reviewer', training: 'FDA Form 2253: Filing Requirements', category: 'fda-guidance', completedDate: '2025-01-05', dueDate: '2025-01-15', status: 'completed', certExpiry: '2026-01-05' },
  { id: 'MLR-009', personName: 'David Park', role: 'brand-manager', training: 'MLR Review Process & SOPs', category: 'mlr-process', completedDate: null, dueDate: '2025-02-01', status: 'not-started' },
  { id: 'MLR-010', personName: 'Angela Torres', role: 'medical-writer', training: 'AMA Style Guide & Medical Writing Standards', category: 'tools', completedDate: '2024-09-30', dueDate: '2024-10-15', status: 'completed' },
];

const mlrRoleColors: Record<string, string> = {
  'medical-reviewer':   'text-red-400',
  'legal-reviewer':     'text-blue-400',
  'regulatory-reviewer':'text-purple-400',
  'brand-manager':      'text-amber-400',
  'medical-writer':     'text-green-400',
};

const mlrCategoryColors: Record<string, 'blue' | 'green' | 'amber' | 'purple' | 'slate'> = {
  'mlr-process':      'blue',
  'fda-guidance':     'purple',
  'product-knowledge':'green',
  'tools':            'slate',
  'compliance':       'amber',
};

function AdPromoTrainingTab({ searchQuery }: { searchQuery: string }) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'due-soon' | 'not-started'>('all');

  const filtered = useMemo(() => {
    let list = mockMLRTraining;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.personName.toLowerCase().includes(q) || r.training.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') list = list.filter(r => r.status === filterStatus);
    return list;
  }, [searchQuery, filterStatus]);

  const overallPct = Math.round((mockMLRTraining.filter(t => t.status === 'completed').length / mockMLRTraining.length) * 100);
  const overdueCount = mockMLRTraining.filter(t => t.status === 'overdue').length;
  const dueSoonCount = mockMLRTraining.filter(t => t.status === 'due-soon').length;
  const expiringCerts = mockMLRTraining.filter(t => t.certExpiry && new Date(t.certExpiry) < new Date('2026-01-01')).length;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><GraduationCap className="w-5 h-5 text-green-400" /><span className="text-2xl font-bold text-green-400">{overallPct}%</span></div><div className="text-sm text-text-secondary">MLR Team Compliance</div><ProgressBar value={overallPct} color="green" size="sm" className="mt-2" /></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><AlertTriangle className="w-5 h-5 text-red-400" /><span className="text-2xl font-bold text-red-400">{overdueCount}</span></div><div className="text-sm text-text-secondary">Overdue</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Clock className="w-5 h-5 text-amber-400" /><span className="text-2xl font-bold text-amber-400">{dueSoonCount}</span></div><div className="text-sm text-text-secondary">Due Soon</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between mb-1"><Award className="w-5 h-5 text-purple-400" /><span className="text-2xl font-bold text-purple-400">{expiringCerts}</span></div><div className="text-sm text-text-secondary">Certs Expiring 2026</div></CardContent></Card>
      </div>

      {/* Records */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-text-muted" />
              <span className="font-medium text-text-primary">MLR Training Records</span>
              <Badge color="slate" size="xs">{filtered.length}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'overdue', 'due-soon', 'not-started'] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1 text-xs rounded-full transition-colors ${filterStatus === s ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-muted hover:text-text-secondary'}`}>
                  {s === 'all' ? 'All' : s === 'overdue' ? 'Overdue' : s === 'due-soon' ? 'Due Soon' : 'Pending'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-text-muted">No records match the selected filter</div>
            ) : filtered.map(record => (
              <div key={record.id} className="flex items-center justify-between px-6 py-4 hover:bg-surface-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${record.status === 'completed' ? 'bg-green-500' : record.status === 'overdue' ? 'bg-red-500' : record.status === 'due-soon' ? 'bg-amber-500' : 'bg-slate-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary text-sm">{record.personName}</span>
                      <span className={`text-xs font-medium ${mlrRoleColors[record.role]}`}>{record.role.replace(/-/g, ' ')}</span>
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">{record.training}</div>
                    {record.certExpiry && record.completedDate && (
                      <div className="text-xs text-text-muted">Cert expires {record.certExpiry}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge color={mlrCategoryColors[record.category]} size="xs">{record.category.replace(/-/g, ' ')}</Badge>
                  {record.completedDate ? (
                    <div className="text-right"><div className="text-xs text-text-muted">Completed</div><div className="text-text-secondary">{record.completedDate}</div></div>
                  ) : (
                    <div className="text-right"><div className="text-xs text-text-muted">Due</div><div className={record.status === 'overdue' ? 'text-red-400 font-medium' : 'text-text-secondary'}>{record.dueDate}</div></div>
                  )}
                  <Badge color={record.status === 'completed' ? 'green' : record.status === 'overdue' ? 'red' : record.status === 'due-soon' ? 'amber' : 'slate'} size="xs">
                    {record.status === 'completed' ? 'Done' : record.status === 'overdue' ? 'Overdue' : record.status === 'due-soon' ? 'Due Soon' : 'Pending'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface AdPromoScreenProps { filters?: import('@/components/layout/FilterBar').FilterState; }

export function AdPromoScreen({ filters: _filters }: AdPromoScreenProps) {
  const { deadClick } = useDeadClick();
  const [activeTab, setActiveTab] = useState<AdPromoTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const { isCollapsed, setCollapsed } = useCollapsedSections('adpromo');
  const { filterByProductName, filterByProductId, isFiltered, selectedProduct } = useProductFilter();

  const tabs: { id: AdPromoTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Gauge className="w-4 h-4" /> },
    { id: 'queue', label: 'Review Queue', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'claims', label: 'Claims Library', icon: <FileCheck className="w-4 h-4" /> },
    { id: 'references', label: 'References', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'history', label: 'History', icon: <History className="w-4 h-4" /> },
    { id: 'training', label: 'Training', icon: <GraduationCap className="w-4 h-4" /> },
  ];

  const filteredMaterials = useMemo(() => {
    let result = filterByProductName(mockMaterials);
    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(m => m.title.toLowerCase().includes(q) || m.product.toLowerCase().includes(q));
  }, [searchQuery, filterByProductName]);
  
  const filteredClaims = useMemo(() => {
    let result = filterByProductName(mockClaims);
    if (!searchQuery) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(c => c.text.toLowerCase().includes(q));
  }, [searchQuery, filterByProductName]);

  const filteredReferences = useMemo(
    () => filterByProductName(mockFullReferences),
    [filterByProductName]
  );

  return (
    <div className="flex flex-col h-full bg-surface">
      <ScreenHeader
        moduleId="adpromo"
        title="Ad/Promo Review"
        subtitle="Advertising & Promotional Materials Compliance — submission review and FDA response tracking"
        icon={<Megaphone className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-3">
            <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="hidden sm:block w-48 lg:w-64" />
            <CapabilityGate moduleId="adpromo" capability="submit" inline>
                <Button variant="primary" size="sm" onClick={deadClick}>
                  <Plus className="w-4 h-4 mr-1" />
                  Submit Material
                </Button>
              </CapabilityGate>
          </div>
        }
      >
        {/* Tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto scrollbar-hide -mx-6 px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
                activeTab === tab.id ? 'bg-surface-card text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary hover:bg-surface-card/50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </ScreenHeader>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {activeTab === 'dashboard' && (
          <div className="space-y-4 md:space-y-6">
            {/* Review Pipeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-accent-blue" />
                  <span className="font-medium">Review Pipeline</span>
                </div>
              </CardHeader>
              <CardContent>
                <ReviewPipeline materials={mockMaterials} />
              </CardContent>
            </Card>
            
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard title="Pending Review" value={metrics.pendingReview} subtitle="Awaiting action" icon={<Clock className="w-5 h-5" />} color="amber" />
              <MetricCard title="Approved (MTD)" value={metrics.approvedThisMonth} subtitle="This month" icon={<CheckCircle className="w-5 h-5" />} color="green" />
              <MetricCard title="Avg Review Time" value={`${metrics.avgReviewTime}d`} subtitle="Days to approval" icon={<TrendingUp className="w-5 h-5" />} color="blue" />
              <MetricCard title="Compliance Rate" value={`${metrics.complianceRate}%`} subtitle="First-pass approval" icon={<Shield className="w-5 h-5" />} color="green" />
            </div>
            
            {/* Materials Requiring Action */}
            <CollapsibleSection
              title="Requiring Action"
              icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
              count={mockMaterials.filter(m => m.status === 'revision-required' || m.status === 'submitted').length}
              defaultExpanded={!isCollapsed('requiring-action')}
              onToggle={(expanded) => setCollapsed('requiring-action', !expanded)}
              variant="card"
              size="sm"
              headerActions={<Button variant="ghost" size="sm" onClick={() => setActiveTab('queue')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>}
            >
              <div className="space-y-3">
                {mockMaterials.filter(m => m.status === 'revision-required' || m.status === 'submitted').length === 0 ? (
                  <EmptyState type="no-data" size="sm" title="No items requiring action" description="All materials are progressing through review" />
                ) : mockMaterials.filter(m => m.status === 'revision-required' || m.status === 'submitted').map(material => (
                  <MaterialRow key={material.id} material={material} />
                ))}
              </div>
            </CollapsibleSection>
            
            {/* In Review */}
            <CollapsibleSection
              title="In Review"
              icon={<Eye className="w-5 h-5 text-blue-400" />}
              count={mockMaterials.filter(m => ['medical-review', 'legal-review', 'regulatory-review', 'final-approval'].includes(m.status)).length}
              defaultExpanded={!isCollapsed('in-review')}
              onToggle={(expanded) => setCollapsed('in-review', !expanded)}
              variant="card"
              size="sm"
            >
              <div className="space-y-3">
                {mockMaterials.filter(m => ['medical-review', 'legal-review', 'regulatory-review', 'final-approval'].includes(m.status)).map(material => (
                  <MaterialRow key={material.id} material={material} />
                ))}
              </div>
            </CollapsibleSection>
            
            {/* Claims Expiring Soon */}
            <CollapsibleSection
              title="Claims Expiring Soon"
              icon={<AlertCircle className="w-5 h-5 text-amber-400" />}
              count={metrics.expiringClaims}
              badge={{ text: 'Review', color: 'amber' as const }}
              defaultExpanded={!isCollapsed('expiring-claims')}
              onToggle={(expanded) => setCollapsed('expiring-claims', !expanded)}
              variant="card"
              size="sm"
              headerActions={<Button variant="ghost" size="sm" onClick={() => setActiveTab('claims')}>View All <ChevronRight className="w-4 h-4 ml-1" /></Button>}
            >
              <div className="space-y-3">
                {mockClaims.filter(c => c.expiryDate).slice(0, 3).map(claim => (
                  <ClaimRow key={claim.id} claim={claim} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        )}
        
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {filteredMaterials.length === 0 ? (
              <EmptyState type="no-results" title="No materials found" description="No materials match your search" />
            ) : filteredMaterials.map(material => (
              <MaterialRow key={material.id} material={material} />
            ))}
          </div>
        )}
        
        {activeTab === 'claims' && (
          <div className="space-y-4">
            {filteredClaims.length === 0 ? (
              <EmptyState type="no-results" title="No claims found" description="No claims match your search" />
            ) : filteredClaims.map(claim => (
              <ClaimRow key={claim.id} claim={claim} />
            ))}
          </div>
        )}
        
        {activeTab === 'references' && <AdPromoReferencesTab searchQuery={searchQuery} />}
        {activeTab === 'history' && <AdPromoHistoryTab searchQuery={searchQuery} />}
        {activeTab === 'training' && <AdPromoTrainingTab searchQuery={searchQuery} />}
      </div>
    </div>
  );
}

export default AdPromoScreen;
