
/**
 * RegulatoryIntelligenceScreen - v0.60.0
 * LIG-030/031 + v0.60.0 additions:
 *   - Alert Rules Config panel
 *   - Bulk Triage (multi-select + batch status update)
 *   - Alert to Submission Impact Linking
 */

import { useState, useMemo, useCallback } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Bell, Search, ExternalLink, ChevronRight, CheckCircle,
  AlertTriangle, Info, BookOpen, Clock, Tag, Zap, Eye,
  BarChart3, X, RefreshCw, Archive, Pill,
  ArrowRight, Link2, Settings, Plus, Trash2, CheckSquare,
  Square, ChevronDown, Send, Layers, Save, FileText, Shield, Edit2,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';

// --- Types ---

type AlertSource = 'FDA' | 'EMA' | 'PMDA' | 'ICH' | 'MHRA' | 'Health Canada' | 'TGA' | 'NMPA';
type AlertCategory = 'guidance' | 'safety-communication' | 'policy' | 'q-and-a' | 'draft-guidance' | 'regulation';
type TriageStatus = 'unreviewed' | 'action-needed' | 'monitoring' | 'noted' | 'not-relevant';
type ImpactLevel = 'high' | 'medium' | 'low' | 'none';
type RuleMatchType = 'keyword' | 'compound' | 'source' | 'category';

interface AlertRule {
  id: string;
  name: string;
  matchType: RuleMatchType;
  matchValue: string;
  autoTriage: TriageStatus | 'none';
  notifyEmail: boolean;
  enabled: boolean;
}

interface SubmissionImpactLink {
  submissionId: string;
  submissionName: string;
  region: string;
  agency: string;
  impactNote: string;
  linkedAt: string;
}

interface CompoundRelevance {
  compoundId: string;
  compoundName: string;
  relevanceScore: number;
  impactLevel: ImpactLevel;
  rationale: string;
}

interface RegulatoryAlert {
  id: string;
  title: string;
  source: AlertSource;
  category: AlertCategory;
  publishedDate: string;
  ingestionDate: string;
  summary: string;
  url: string;
  triageStatus: TriageStatus;
  compoundRelevance: CompoundRelevance[];
  tags: string[];
  isNew: boolean;
  assignedTo?: string;
  notes?: string;
  submissionLinks?: SubmissionImpactLink[];
}

// --- Constants ---

const SOURCE_CONFIG: Record<AlertSource, { color: string; bgColor: string; flag: string }> = {
  FDA:             { color: 'text-blue-600',   bgColor: 'bg-blue-50 border-blue-200',     flag: '🇺🇸' },
  EMA:             { color: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200', flag: '🇪🇺' },
  PMDA:            { color: 'text-red-600',    bgColor: 'bg-red-50 border-red-200',       flag: '🇯🇵' },
  ICH:             { color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200', flag: '🌐' },
  MHRA:            { color: 'text-cyan-600',   bgColor: 'bg-cyan-50 border-cyan-200',     flag: '🇬🇧' },
  'Health Canada': { color: 'text-red-700',    bgColor: 'bg-red-50 border-red-200',       flag: '🇨🇦' },
  TGA:             { color: 'text-green-600',  bgColor: 'bg-green-50 border-green-200',   flag: '🇦🇺' },
  NMPA:            { color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200', flag: '🇨🇳' },
};

const CATEGORY_LABELS: Record<AlertCategory, string> = {
  'guidance':             'Guidance Document',
  'safety-communication': 'Safety Communication',
  'policy':               'Policy Update',
  'q-and-a':              'Q&A',
  'draft-guidance':       'Draft Guidance',
  'regulation':           'Regulation',
};

const TRIAGE_CONFIG: Record<TriageStatus, { label: string; color: string; bgColor: string; icon: any }> = {
  'unreviewed':    { label: 'Unreviewed',    color: 'text-text-muted',   bgColor: 'bg-surface-card border-border',             icon: Clock },
  'action-needed': { label: 'Action Needed', color: 'text-accent-red',   bgColor: 'bg-accent-red/10 border-accent-red/30',     icon: AlertTriangle },
  'monitoring':    { label: 'Monitoring',    color: 'text-accent-amber', bgColor: 'bg-accent-amber/10 border-accent-amber/30', icon: Eye },
  'noted':         { label: 'Noted',         color: 'text-accent-green', bgColor: 'bg-accent-green/10 border-accent-green/30', icon: CheckCircle },
  'not-relevant':  { label: 'Not Relevant',  color: 'text-text-muted',   bgColor: 'bg-surface-card border-border',             icon: Archive },
};

const IMPACT_COLORS: Record<ImpactLevel, string> = {
  high:   'text-accent-red',
  medium: 'text-accent-amber',
  low:    'text-accent-blue',
  none:   'text-text-muted',
};

// Mock active submission plans for impact linking
const ACTIVE_SUBMISSIONS = [
  { id: 'sub-nda-001', name: 'Ligrastinib NDA 2025-001',      region: 'United States', agency: 'FDA'  },
  { id: 'sub-maa-001', name: 'Ligrastinib MAA 2025-EU',       region: 'European Union', agency: 'EMA' },
  { id: 'sub-jnda-001', name: 'Ligrastinib J-NDA 2026',       region: 'Japan',         agency: 'PMDA' },
  { id: 'sub-ind-002', name: 'CardioShield IND Phase 2',      region: 'United States', agency: 'FDA'  },
  { id: 'sub-cta-001', name: 'OncoTarget Phase 1 CTA',        region: 'European Union', agency: 'EMA' },
];

const MOCK_ALERTS: RegulatoryAlert[] = [
  {
    id: 'ri-001',
    title: 'FDA Draft Guidance: Use of Real-World Data and Real-World Evidence to Support Regulatory Decision-Making',
    source: 'FDA', category: 'draft-guidance',
    publishedDate: '2026-02-18', ingestionDate: '2026-02-19',
    summary: 'FDA issued draft guidance clarifying expectations for using RWD/RWE in NDA/BLA submissions, including data quality standards, analysis frameworks, and documentation requirements for post-market studies.',
    url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents',
    triageStatus: 'action-needed', tags: ['RWE', 'NDA', 'BLA', 'post-market', 'data-quality'], isNew: true,
    submissionLinks: [
      { submissionId: 'sub-nda-001', submissionName: 'Ligrastinib NDA 2025-001', region: 'United States', agency: 'FDA',
        impactNote: 'Post-market RWE strategy section 5.4 may require update', linkedAt: '2026-02-20' },
    ],
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 87, impactLevel: 'high',
        rationale: 'Active NDA under rolling review — post-market data commitments may require updated RWE strategy' },
      { compoundId: 'moracetib', compoundName: 'CardioShield', relevanceScore: 62, impactLevel: 'medium',
        rationale: 'Phase 1b ongoing — RWE strategy for future NDA should incorporate these requirements' },
    ],
  },
  {
    id: 'ri-002',
    title: 'ICH E6(R3) Good Clinical Practice: Revised Final Guideline',
    source: 'ICH', category: 'guidance',
    publishedDate: '2026-02-10', ingestionDate: '2026-02-11',
    summary: 'ICH E6(R3) final guideline published. Key changes include enhanced risk-based monitoring requirements, expanded guidance on decentralized clinical trial (DCT) conduct, electronic systems validation standards, and updated informed consent requirements for adaptive designs.',
    url: 'https://www.ich.org/page/efficacy-guidelines',
    triageStatus: 'action-needed', tags: ['GCP', 'clinical-trials', 'monitoring', 'DCT', 'adaptive-design'], isNew: true,
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 74, impactLevel: 'medium',
        rationale: 'Phase 2/3 TMF documentation and monitoring procedures need alignment with E6(R3) standards' },
      { compoundId: 'moracetib', compoundName: 'CardioShield', relevanceScore: 91, impactLevel: 'high',
        rationale: 'Active Phase 1b trial — protocol and monitoring plan must be updated before next FDA inspection' },
      { compoundId: 'vezopanib', compoundName: 'OncoTarget', relevanceScore: 55, impactLevel: 'medium',
        rationale: 'Phase 1 in planning; study protocol should be designed to ICH E6(R3) from the outset' },
    ],
  },
  {
    id: 'ri-003',
    title: 'EMA Guideline on the Evaluation of Anticancer Medicinal Products in Man (Revision 6)',
    source: 'EMA', category: 'guidance',
    publishedDate: '2026-01-30', ingestionDate: '2026-01-31',
    summary: 'Revised oncology guideline introduces updated endpoints for NSCLC trials, clarifies OS surrogate endpoint acceptability, and provides new guidance on biomarker-driven trial designs, including KRAS mutation-specific subgroup requirements.',
    url: 'https://www.ema.europa.eu/en/guidelines',
    triageStatus: 'action-needed', tags: ['oncology', 'NSCLC', 'endpoints', 'biomarker', 'KRAS'], isNew: false,
    submissionLinks: [
      { submissionId: 'sub-maa-001', submissionName: 'Ligrastinib MAA 2025-EU', region: 'European Union', agency: 'EMA',
        impactNote: 'Module 5.3.5 primary endpoint definition may need revision to reflect new OS surrogate guidance', linkedAt: '2026-02-01' },
    ],
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 96, impactLevel: 'high',
        rationale: 'Ligrastinib targets KRAS G12C+ NSCLC — new biomarker subgroup guidance directly impacts MAA strategy' },
      { compoundId: 'vezopanib', compoundName: 'OncoTarget', relevanceScore: 71, impactLevel: 'medium',
        rationale: 'HER2+ breast cancer — endpoint guidance may affect Phase 1/2 design choices' },
    ],
  },
  {
    id: 'ri-004',
    title: 'FDA Safety Communication: Updated Recommendations for Drug-Drug Interaction Studies',
    source: 'FDA', category: 'safety-communication',
    publishedDate: '2026-01-22', ingestionDate: '2026-01-23',
    summary: 'FDA updates recommendations for in vitro and in vivo DDI studies, including new CYP enzyme induction assay requirements, updated clinical DDI study design guidance, and expanded labeling language requirements for interaction potential.',
    url: 'https://www.fda.gov/drugs/drug-interactions-labeling',
    triageStatus: 'monitoring', tags: ['DDI', 'CYP', 'in-vitro', 'labeling', 'safety'], isNew: false,
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 58, impactLevel: 'medium',
        rationale: 'Labeling section 7 (Drug Interactions) may require review; check if existing DDI studies meet new standards' },
      { compoundId: 'moracetib', compoundName: 'CardioShield', relevanceScore: 45, impactLevel: 'low',
        rationale: 'Early phase — DDI study protocol should incorporate new requirements' },
    ],
  },
  {
    id: 'ri-005',
    title: 'PMDA Notification on Electronic Submission Standards — J-NDA Structured Data Requirements',
    source: 'PMDA', category: 'policy',
    publishedDate: '2026-01-15', ingestionDate: '2026-01-16',
    summary: 'PMDA mandates structured electronic data submission (CDISC SEND/SDTM/ADaM) for all new J-NDA applications effective April 2027. Includes technical specifications for eCTD Japan-specific module formatting.',
    url: 'https://www.pmda.go.jp/english/',
    triageStatus: 'monitoring', tags: ['PMDA', 'J-NDA', 'eCTD', 'CDISC', 'structured-data'], isNew: false,
    submissionLinks: [
      { submissionId: 'sub-jnda-001', submissionName: 'Ligrastinib J-NDA 2026', region: 'Japan', agency: 'PMDA',
        impactNote: 'Full CDISC SEND/SDTM/ADaM compliance required; current dataset must be validated against PMDA technical specs', linkedAt: '2026-01-17' },
    ],
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 79, impactLevel: 'high',
        rationale: 'Japan is a target satellite market — submission package must comply with new PMDA eCTD requirements by April 2027 deadline' },
    ],
  },
  {
    id: 'ri-006',
    title: 'ICH M7(R2) Assessment and Control of DNA Reactive (Mutagenic) Impurities in Pharmaceuticals',
    source: 'ICH', category: 'guidance',
    publishedDate: '2025-12-20', ingestionDate: '2025-12-21',
    summary: 'Updated guideline adds new categories of mutagenic impurities requiring enhanced controls, revises the acceptable intake limits for several compound classes, and provides updated read-across guidance for structure-activity analysis.',
    url: 'https://www.ich.org/page/multidisciplinary-guidelines',
    triageStatus: 'noted', tags: ['impurities', 'genotoxicity', 'CMC', 'safety', 'M7'], isNew: false,
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 42, impactLevel: 'low',
        rationale: 'Module 3 impurity specifications should be reviewed against M7(R2) — likely minor update to existing controls' },
      { compoundId: 'moracetib', compoundName: 'CardioShield', relevanceScore: 38, impactLevel: 'low',
        rationale: 'CMC team to verify impurity control strategy compatibility' },
    ],
  },
  {
    id: 'ri-007',
    title: 'FDA Q&A: Accelerated Approval Pathway — Confirmatory Evidence Requirements Post-Reform',
    source: 'FDA', category: 'q-and-a',
    publishedDate: '2025-12-10', ingestionDate: '2025-12-11',
    summary: 'FAQ document addresses industry questions about the 2024 accelerated approval reform. Clarifies timelines for confirmatory trial completion, describes withdrawal procedures, and outlines what constitutes "reasonably likely" surrogate endpoints post-FDORA.',
    url: 'https://www.fda.gov/patients/fast-track-breakthrough-therapy-accelerated-approval-priority-review',
    triageStatus: 'not-relevant', tags: ['accelerated-approval', 'surrogate-endpoint', 'oncology', 'FDORA'], isNew: false,
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 21, impactLevel: 'none',
        rationale: 'Full approval pathway — accelerated approval guidance not directly applicable' },
    ],
  },
  {
    id: 'ri-008',
    title: 'MHRA Guidance on Post-Brexit Pharmacovigilance Reporting — XEVMPD & UK ADR Reporting',
    source: 'MHRA', category: 'policy',
    publishedDate: '2025-11-28', ingestionDate: '2025-11-29',
    summary: 'MHRA clarifies UK-specific PSUR submission requirements, XEVMPD substance management for UK-authorised products, and yellow card ADR reporting integration requirements for MAH systems.',
    url: 'https://www.gov.uk/guidance/pharmacovigilance',
    triageStatus: 'monitoring', tags: ['pharmacovigilance', 'PSUR', 'ADR', 'UK', 'XEVMPD'], isNew: false,
    compoundRelevance: [
      { compoundId: 'lig-2847', compoundName: 'Ligrastinib', relevanceScore: 67, impactLevel: 'medium',
        rationale: 'UK is a target satellite market — PV reporting infrastructure must comply with MHRA requirements post-MAA' },
    ],
  },
];

// Default alert rules
const DEFAULT_RULES: AlertRule[] = [
  { id: 'rule-1', name: 'NSCLC / Oncology watch',  matchType: 'keyword',  matchValue: 'NSCLC',      autoTriage: 'action-needed', notifyEmail: true,  enabled: true  },
  { id: 'rule-2', name: 'Ligrastinib compound',    matchType: 'compound', matchValue: 'Ligrastinib', autoTriage: 'action-needed', notifyEmail: true,  enabled: true  },
  { id: 'rule-3', name: 'FDA all-source',          matchType: 'source',   matchValue: 'FDA',         autoTriage: 'none',          notifyEmail: false, enabled: true  },
  { id: 'rule-4', name: 'Safety communications',   matchType: 'category', matchValue: 'safety-communication', autoTriage: 'monitoring', notifyEmail: true, enabled: true },
  { id: 'rule-5', name: 'RWE / data monitoring',   matchType: 'keyword',  matchValue: 'RWE',         autoTriage: 'monitoring',    notifyEmail: false, enabled: false },
];

// --- Sub-components ---

function RelevanceBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-accent-red' : score >= 50 ? 'bg-accent-amber' : 'bg-accent-blue';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-card rounded-full overflow-hidden border border-border">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-text-secondary w-8 text-right">{score}</span>
    </div>
  );
}

function SourceBadge({ source }: { source: AlertSource }) {
  const cfg = SOURCE_CONFIG[source];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.bgColor} ${cfg?.color ?? ''}`}>
      {cfg.flag} {source}
    </span>
  );
}

function TriagePill({ status, onChange }: { status: TriageStatus; onChange: (s: TriageStatus) => void }) {
  const [open, setOpen] = useState(false);
  const cfg = TRIAGE_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${cfg.bgColor} ${cfg?.color ?? ''}`}>
        <Icon className="w-3.5 h-3.5" />{cfg.label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-20 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
          {(Object.entries(TRIAGE_CONFIG) as [TriageStatus, typeof cfg][]).map(([s, c]) => {
            const I = c.icon;
            return (
              <button key={s} onClick={() => { onChange(s); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-card transition-colors ${s === status ? 'bg-surface-card' : ''}`}>
                <I className={`w-3.5 h-3.5 ${c?.color ?? ''}`} />
                <span className={c.color}>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- Alert Rules Panel ---

function AlertRulesPanel({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [rules, setRules] = useState<AlertRule[]>(DEFAULT_RULES);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRule, setNewRule] = useState<Partial<AlertRule> | null>(null);

  const toggleEnabled = (id: string) =>
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));

  const deleteRule = (id: string) =>
    setRules(prev => prev.filter(r => r.id !== id));

  const saveNewRule = () => {
    if (!newRule?.name || !newRule?.matchValue) return;
    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: newRule.name || '',
      matchType: (newRule.matchType as RuleMatchType) || 'keyword',
      matchValue: newRule.matchValue || '',
      autoTriage: (newRule.autoTriage as TriageStatus | 'none') || 'none',
      notifyEmail: newRule.notifyEmail ?? false,
      enabled: true,
    };
    setRules(prev => [...prev, rule]);
    setNewRule(null);
    toast.success('Alert rule created');
  };

  const MATCH_TYPE_LABELS: Record<RuleMatchType, string> = {
    keyword: 'Keyword', compound: 'Compound', source: 'Source', category: 'Category',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-elevated border-l border-border w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-card flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Settings className="w-4 h-4 text-accent-blue" /> Alert Rules
            </h2>
            <p className="text-xs text-text-muted mt-0.5">Automate triage and notifications for incoming alerts</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {rules.map(rule => (
            <div key={rule.id}
              className={`bg-surface-card border rounded-xl p-3 transition-all ${rule.enabled ? 'border-border' : 'border-border opacity-50'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{rule.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {MATCH_TYPE_LABELS[rule.matchType]}: <span className="font-mono text-text-secondary">"{rule.matchValue}"</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleEnabled(rule.id)}
                    className={`relative w-8 h-4 rounded-full transition-colors ${rule.enabled ? 'bg-accent-blue' : 'bg-border'}`}>
                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <button onClick={() => deleteRule(rule.id)}
                    className="p-1 text-text-muted hover:text-accent-red transition-colors rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                {rule.autoTriage !== 'none' && (
                  <span className={`px-1.5 py-0.5 rounded border ${TRIAGE_CONFIG[rule.autoTriage as TriageStatus]?.bgColor} ${TRIAGE_CONFIG[rule.autoTriage as TriageStatus]?.color}`}>
                    Auto: {TRIAGE_CONFIG[rule.autoTriage as TriageStatus]?.label}
                  </span>
                )}
                {rule.notifyEmail && (
                  <span className="flex items-center gap-1 text-accent-blue">
                    <Bell className="w-3 h-3" /> Email notify
                  </span>
                )}
              </div>
            </div>
          ))}

          {/* New rule form */}
          {newRule ? (
            <div className="bg-surface-card border border-accent-blue/30 rounded-xl p-3 space-y-3">
              <div className="text-sm font-medium text-text-primary">New Rule</div>
              <input
                type="text" placeholder="Rule name"
                value={newRule.name || ''}
                onChange={e => setNewRule(p => ({ ...p, name: e.target.value }))}
                className="w-full px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-lg text-text-primary"
              />
              <div className="grid grid-cols-2 gap-2">
                <select value={newRule.matchType || 'keyword'}
                  onChange={e => setNewRule(p => ({ ...p, matchType: e.target.value as RuleMatchType }))}
                  className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-lg text-text-primary">
                  <option value="keyword">Keyword</option>
                  <option value="compound">Compound</option>
                  <option value="source">Source</option>
                  <option value="category">Category</option>
                </select>
                <input type="text" placeholder="Match value"
                  value={newRule.matchValue || ''}
                  onChange={e => setNewRule(p => ({ ...p, matchValue: e.target.value }))}
                  className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-lg text-text-primary" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={newRule.autoTriage || 'none'}
                  onChange={e => setNewRule(p => ({ ...p, autoTriage: e.target.value as any }))}
                  className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded-lg text-text-primary">
                  <option value="none">No auto-triage</option>
                  {Object.entries(TRIAGE_CONFIG).map(([s, c]) => (
                    <option key={s} value={s}>{c.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-text-secondary px-2">
                  <input type="checkbox" checked={newRule.notifyEmail || false}
                    onChange={e => setNewRule(p => ({ ...p, notifyEmail: e.target.checked }))} />
                  Email notify
                </label>
              </div>
              <div className="flex gap-2">
                <button onClick={saveNewRule}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors">
                  <Save className="w-3.5 h-3.5" /> Save Rule
                </button>
                <button onClick={() => setNewRule(null)}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setNewRule({ matchType: 'keyword', autoTriage: 'none', notifyEmail: false })}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-text-muted hover:border-accent-blue hover:text-accent-blue transition-colors">
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          )}
        </div>

        <div className="p-4 border-t border-border bg-surface-card flex-shrink-0">
          <p className="text-xs text-text-muted text-center">
            {rules.filter(r => r.enabled).length} of {rules.length} rules active
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Submission Impact Link Panel ---

function SubmissionLinkPanel({
  alert, onClose, onLink
}: {
  alert: RegulatoryAlert;
  onClose: () => void;
  onLink: (alertId: string, link: SubmissionImpactLink) => void;
}) {
  const toast = useToast();
  const [selectedSub, setSelectedSub] = useState('');
  const [impactNote, setImpactNote] = useState('');
  const existing = alert.submissionLinks || [];

  const handleLink = () => {
    if (!selectedSub || !impactNote.trim()) return;
    const sub = ACTIVE_SUBMISSIONS.find(s => s.id === selectedSub);
    if (!sub) return;
    const link: SubmissionImpactLink = {
      submissionId: sub.id,
      submissionName: sub.name,
      region: sub.region,
      agency: sub.agency,
      impactNote: impactNote.trim(),
      linkedAt: new Date().toISOString().split('T')[0],
    };
    onLink(alert.id, link);
    toast.success(`Linked to "${sub.name}"`);
    setSelectedSub('');
    setImpactNote('');
  };

  const availableSubs = ACTIVE_SUBMISSIONS.filter(
    s => !existing.some(l => l.submissionId === s.id)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-elevated border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent-blue" /> Link to Submission
            </h2>
            <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{alert.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-card transition-colors flex-shrink-0 ml-3">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing links */}
        {existing.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Currently linked</div>
            <div className="space-y-2">
              {existing.map(link => (
                <button
                  key={link.submissionId}
                  onClick={() => {
                    useAppStore.getState().setActiveModule('submissions-hub');
                    toast.success(`Opening ${link.submissionName}`);
                  }}
                  className="w-full flex items-start gap-2 p-2.5 bg-surface-card border border-border rounded-lg hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all group text-left"
                >
                  <Send className="w-3.5 h-3.5 text-accent-blue mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-text-primary">{link.submissionName}</div>
                    <div className="text-xs text-text-muted mt-0.5">{link.impactNote}</div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add link */}
        {availableSubs.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wide">Add Impact Link</div>
            <select value={selectedSub} onChange={e => setSelectedSub(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary">
              <option value="">Select submission...</option>
              {availableSubs.map(s => (
                <option key={s.id} value={s.id}>{(s as { id: string; name: string; region: string; agency: string; flag?: string }).flag ?? ''}{s.name} — {s.agency}</option>
              ))}
            </select>
            <textarea
              placeholder="Describe the regulatory impact on this submission (e.g. Section 5.4 RWE strategy requires update)"
              value={impactNote}
              onChange={e => setImpactNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm bg-surface-card border border-border rounded-lg text-text-primary resize-none"
            />
            <div className="flex gap-2">
              <button onClick={handleLink} disabled={!selectedSub || !impactNote.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Link2 className="w-4 h-4" /> Link Impact
              </button>
              <button onClick={onClose}
                className="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:text-text-primary transition-colors">
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-text-muted">
            All active submissions are linked to this alert
          </div>
        )}
      </div>
    </div>
  );
}

// --- Alert Detail Panel ---

function AlertDetailPanel({
  alert, onClose, onTriageChange, onLinkSubmission
}: {
  alert: RegulatoryAlert;
  onClose: () => void;
  onTriageChange: (s: TriageStatus) => void;
  onLinkSubmission: (alert: RegulatoryAlert) => void;
}) {
  const toast = useToast();
  const linkedCount = (alert.submissionLinks || []).length;

  return (
    <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border bg-surface-elevated flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <SourceBadge source={alert.source} />
            {alert.isNew && <span className="text-[10px] font-bold text-white bg-accent-blue px-1.5 py-0.5 rounded uppercase">New</span>}
          </div>
          <h3 className="text-sm font-semibold text-text-primary leading-snug">{alert.title}</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded text-text-muted hover:text-text-primary flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-surface-elevated rounded-lg p-2.5">
            <div className="text-text-muted mb-0.5">Published</div>
            <div className="font-medium text-text-primary">
              {new Date(alert.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <div className="bg-surface-elevated rounded-lg p-2.5">
            <div className="text-text-muted mb-0.5">Category</div>
            <div className="font-medium text-text-primary">{CATEGORY_LABELS[alert.category]}</div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Summary</h4>
          <p className="text-sm text-text-secondary leading-relaxed">{alert.summary}</p>
        </div>

        {/* Submission impact links */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Submission Impact Links {linkedCount > 0 && <span className="text-accent-blue ml-1">({linkedCount})</span>}
            </h4>
            <button onClick={() => onLinkSubmission(alert)}
              className="flex items-center gap-1 text-xs text-accent-blue hover:underline">
              <Plus className="w-3 h-3" /> Link
            </button>
          </div>
          {linkedCount > 0 ? (
            <div className="space-y-2">
              {(alert.submissionLinks || []).map(link => (
                <button
                  key={link.submissionId}
                  onClick={() => {
                    useAppStore.getState().setActiveModule('submissions-hub');
                    toast.success(`Opening ${link.submissionName}`);
                  }}
                  className="w-full text-left p-2.5 bg-surface-elevated rounded-lg border border-border hover:border-accent-blue/50 hover:bg-accent-blue/5 transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-3 h-3 text-accent-blue" />
                    <span className="text-xs font-medium text-text-primary">{link.submissionName}</span>
                    <span className="text-[10px] text-text-muted">{link.region}</span>
                    <ExternalLink className="w-3 h-3 text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0" />
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed pl-5">{link.impactNote}</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-muted italic p-2">
              No submissions linked — click Link to associate this alert with an active submission plan
            </div>
          )}
        </div>

        {/* Compound relevance */}
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Compound Impact</h4>
          <div className="space-y-3">
            {[...alert.compoundRelevance].sort((a, b) => b.relevanceScore - a.relevanceScore).map(cr => (
              <div key={cr.compoundId} className="p-3 bg-surface-elevated rounded-lg border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{cr.compoundName}</span>
                  <span className={`text-xs font-semibold uppercase ${IMPACT_COLORS[cr.impactLevel]}`}>{cr.impactLevel}</span>
                </div>
                <RelevanceBar score={cr.relevanceScore} />
                <p className="text-xs text-text-muted mt-2 leading-relaxed">{cr.rationale}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {alert.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-surface-elevated border border-border rounded text-text-secondary">#{tag}</span>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <TriagePill status={alert.triageStatus} onChange={onTriageChange} />
            <button onClick={() => { if ((alert as any).source) { window.open((alert as any).source, '_blank', 'noopener'); } else if (alert.source) { window.open(`https://www.${alert.source.toLowerCase().replace(/\s/g,'-')}.int/`, '_blank', 'noopener'); } else { toast.info('No source URL available for this alert'); } }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors">
              <ExternalLink className="w-3.5 h-3.5" /> View Source
            </button>
          </div>
          <button onClick={() => { useAppStore.getState().setActiveModule('haq'); toast.success('Navigating to HAQ — create impact assessment from there'); }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors">
            <Zap className="w-4 h-4" /> Create Impact Assessment
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Alert Card ---

function AlertCard({
  alert, isSelected, isChecked, onSelect, onCheck, onTriageChange
}: {
  alert: RegulatoryAlert;
  isSelected: boolean;
  isChecked: boolean;
  onSelect: () => void;
  onCheck: () => void;
  onTriageChange: (s: TriageStatus) => void;
}) {
  const topRelevance = [...alert.compoundRelevance].sort((a, b) => b.relevanceScore - a.relevanceScore)[0];
  const linkedCount = (alert.submissionLinks || []).length;

  return (
    <div className={`bg-surface-card border rounded-xl transition-all ${
      isSelected ? 'border-accent-blue ring-1 ring-accent-blue/30' :
      isChecked  ? 'border-accent-amber ring-1 ring-accent-amber/20' :
                   'border-border hover:border-border/80'
    }`}>
      <button onClick={onSelect} className="w-full p-4 text-left">
        <div className="flex items-start gap-2 mb-2">
          {/* Bulk select checkbox */}
          <button onClick={e => { e.stopPropagation(); onCheck(); }}
            className="flex-shrink-0 mt-0.5 text-text-muted hover:text-accent-amber transition-colors">
            {isChecked
              ? <CheckSquare className="w-4 h-4 text-accent-amber" />
              : <Square className="w-4 h-4" />
            }
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <SourceBadge source={alert.source} />
              <span className="text-[10px] text-text-muted bg-surface-elevated border border-border px-1.5 py-0.5 rounded">
                {CATEGORY_LABELS[alert.category]}
              </span>
              {alert.isNew && <span className="text-[10px] font-bold text-white bg-accent-blue px-1.5 py-0.5 rounded uppercase">New</span>}
              {linkedCount > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-accent-blue bg-accent-blue/10 border border-accent-blue/20 px-1.5 py-0.5 rounded">
                  <Layers className="w-2.5 h-2.5" /> {linkedCount} submission{linkedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <h4 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">{alert.title}</h4>
          </div>
        </div>
        <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed pl-6">{alert.summary}</p>
        <div className="flex items-center gap-3 flex-wrap pl-6">
          {topRelevance && (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Pill className="w-3 h-3 text-text-muted flex-shrink-0" />
              <span className="text-xs text-text-muted truncate">{topRelevance.compoundName}</span>
              <RelevanceBar score={topRelevance.relevanceScore} />
            </div>
          )}
          <span className="text-xs text-text-muted flex-shrink-0">
            {new Date(alert.publishedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </button>
      <div className="px-4 pb-3 flex items-center justify-between gap-2 border-t border-border/50 pt-2.5">
        <div className="flex flex-wrap gap-1">
          {alert.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-surface-elevated border border-border rounded text-text-muted">#{tag}</span>
          ))}
        </div>
        <TriagePill status={alert.triageStatus} onChange={onTriageChange} />
      </div>
    </div>
  );
}

// --- Bulk Triage Bar ---

function BulkTriageBar({
  count, onApply, onClear
}: {
  count: number;
  onApply: (s: TriageStatus) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-accent-amber/10 border border-accent-amber/30 rounded-xl">
      <CheckSquare className="w-4 h-4 text-accent-amber flex-shrink-0" />
      <span className="text-sm font-medium text-accent-amber">{count} selected</span>
      <div className="flex-1" />
      <div className="relative">
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 bg-accent-amber text-black rounded-lg hover:bg-accent-amber/90 transition-colors">
          Set triage <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full right-0 mt-1 z-20 bg-surface-elevated border border-border rounded-xl shadow-xl overflow-hidden min-w-[160px]">
            {(Object.entries(TRIAGE_CONFIG) as [TriageStatus, any][]).map(([s, c]) => {
              const I = c.icon;
              return (
                <button key={s} onClick={() => { onApply(s); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-surface-card transition-colors">
                  <I className={`w-3.5 h-3.5 ${c?.color ?? ''}`} />
                  <span className={c.color}>{c.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <button onClick={onClear} className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// --- Main component ---

export function RegulatoryIntelligenceScreen() {
  const toast = useToast();
  const [alerts, setAlerts] = useState<RegulatoryAlert[]>(MOCK_ALERTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSource, setFilterSource] = useState<AlertSource | 'all'>('all');
  const [filterTriage, setFilterTriage] = useState<TriageStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<AlertCategory | 'all'>('all');
  const [selectedAlert, setSelectedAlert] = useState<RegulatoryAlert | null>(null);
  const [activeTab, setActiveTab] = useState<'feed' | 'queue'>('feed');
  const [showRules, setShowRules] = useState(false);
  const [linkingAlert, setLinkingAlert] = useState<RegulatoryAlert | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const updateTriage = useCallback((alertId: string, status: TriageStatus) => {
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, triageStatus: status, isNew: false } : a));
    setSelectedAlert(prev => prev?.id === alertId ? { ...prev, triageStatus: status } : prev);
    toast.success(`Triaged as "${TRIAGE_CONFIG[status].label}"`);
  }, [toast]);

  const bulkTriage = useCallback((status: TriageStatus) => {
    const ids = checkedIds;
    setAlerts(prev => prev.map(a => ids.has(a.id) ? { ...a, triageStatus: status, isNew: false } : a));
    toast.success(`${ids.size} alert${ids.size > 1 ? 's' : ''} set to "${TRIAGE_CONFIG[status].label}"`);
    setCheckedIds(new Set());
  }, [checkedIds, toast]);

  const toggleCheck = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const addSubmissionLink = useCallback((alertId: string, link: SubmissionImpactLink) => {
    setAlerts(prev => prev.map(a =>
      a.id === alertId
        ? { ...a, submissionLinks: [...(a.submissionLinks || []), link] }
        : a
    ));
    setSelectedAlert(prev =>
      prev?.id === alertId
        ? { ...prev, submissionLinks: [...(prev.submissionLinks || []), link] }
        : prev
    );
  }, []);

  const filtered = useMemo(() => {
    return alerts.filter(a => {
      if (filterSource !== 'all' && a.source !== filterSource) return false;
      if (filterTriage !== 'all' && a.triageStatus !== filterTriage) return false;
      if (filterCategory !== 'all' && a.category !== filterCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!a.title.toLowerCase().includes(q) &&
            !a.summary.toLowerCase().includes(q) &&
            !a.tags.some(t => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [alerts, filterSource, filterTriage, filterCategory, searchQuery]);

  const queueAlerts = useMemo(() =>
    alerts.filter(a => a.triageStatus === 'action-needed' || a.triageStatus === 'monitoring')
      .sort((a, b) => (a.triageStatus === 'action-needed' ? 0 : 1) - (b.triageStatus === 'action-needed' ? 0 : 1)),
    [alerts]
  );

  const stats = useMemo(() => ({
    total: alerts.length,
    newCount: alerts.filter(a => a.isNew).length,
    actionNeeded: alerts.filter(a => a.triageStatus === 'action-needed').length,
    monitoring: alerts.filter(a => a.triageStatus === 'monitoring').length,
    unreviewed: alerts.filter(a => a.triageStatus === 'unreviewed').length,
    linked: alerts.filter(a => (a.submissionLinks || []).length > 0).length,
  }), [alerts]);

  const topRelevance = useMemo(() => {
    const byCompound: Record<string, number[]> = {};
    alerts.forEach(a => a.compoundRelevance.forEach(cr => {
      if (!byCompound[cr.compoundName]) byCompound[cr.compoundName] = [];
      byCompound[cr.compoundName].push(cr.relevanceScore);
    }));
    return Object.entries(byCompound)
      .map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
      .sort((a, b) => b.avg - a.avg);
  }, [alerts]);

  const displayList = activeTab === 'feed' ? filtered : queueAlerts;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <ScreenHeader
        moduleId="reg-intel"
        title="Regulatory Intelligence"
        subtitle="Monitor regulatory guidance, safety communications, and policy changes across all agencies"
        icon={<Bell className="w-5 h-5" />}
        actions={
          <button onClick={() => setShowRules(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-elevated transition-colors">
            <Settings className="w-4 h-4" /> Alert Rules
          </button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Total', value: stats.total,       color: 'text-text-primary' },
              { label: 'New',   value: stats.newCount,    color: 'text-accent-blue' },
              { label: 'Action',value: stats.actionNeeded,color: 'text-accent-red' },
              { label: 'Watch', value: stats.monitoring,  color: 'text-accent-amber' },
              { label: 'Queue', value: stats.unreviewed,  color: 'text-text-muted' },
              { label: 'Linked',value: stats.linked,      color: 'text-accent-blue' },
            ].map(stat => (
              <div key={stat.label} className="bg-surface-card border border-border rounded-xl p-3">
                <div className={`text-2xl font-bold ${stat?.color ?? ''}`}>{stat.value}</div>
                <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: feed */}
            <div className="lg:col-span-2 space-y-3">
              {/* Tabs */}
              <div className="flex items-center gap-1 bg-surface-card border border-border rounded-xl p-1">
                {[
                  { id: 'feed',  label: 'Alert Feed',    count: filtered.length },
                  { id: 'queue', label: 'Action Queue',  count: queueAlerts.length },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary'
                    }`}>
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-white/20' : 'bg-surface-elevated border border-border'
                      }`}>{tab.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Filters */}
              {activeTab === 'feed' && (
                <div className="flex flex-wrap gap-2 items-center">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input type="text" placeholder="Search alerts..." value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
                  </div>
                  <select value={filterSource} onChange={e => setFilterSource(e.target.value as any)}
                    className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                    <option value="all">All Sources</option>
                    {(Object.keys(SOURCE_CONFIG) as AlertSource[]).map(s => (
                      <option key={s} value={s}>{SOURCE_CONFIG[s].flag} {s}</option>
                    ))}
                  </select>
                  <select value={filterTriage} onChange={e => setFilterTriage(e.target.value as any)}
                    className="px-3 py-2 bg-surface-card border border-border rounded-lg text-sm text-text-primary">
                    <option value="all">All Statuses</option>
                    {(Object.entries(TRIAGE_CONFIG) as [TriageStatus, any][]).map(([s, c]) => (
                      <option key={s} value={s}>{c.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bulk triage bar */}
              <BulkTriageBar count={checkedIds.size} onApply={bulkTriage} onClear={() => setCheckedIds(new Set())} />

              {/* Alert list */}
              <div className="space-y-3">
                {displayList.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    isSelected={selectedAlert?.id === alert.id}
                    isChecked={checkedIds.has(alert.id)}
                    onSelect={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                    onCheck={() => toggleCheck(alert.id)}
                    onTriageChange={s => updateTriage(alert.id, s)}
                  />
                ))}
                {displayList.length === 0 && (
                  <div className="text-center py-12 text-text-muted">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No alerts match your filters</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: detail + sidebar */}
            <div className="space-y-4">
              {selectedAlert ? (
                <AlertDetailPanel
                  alert={selectedAlert}
                  onClose={() => setSelectedAlert(null)}
                  onTriageChange={s => updateTriage(selectedAlert.id, s)}
                  onLinkSubmission={a => setLinkingAlert(a)}
                />
              ) : (
                <div className="bg-surface-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-accent-blue" /> Compound Exposure
                  </h3>
                  <div className="space-y-4">
                    {topRelevance.map(({ name, avg }) => (
                      <div key={name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-text-primary font-medium">{name}</span>
                          <span className="text-xs text-text-muted">{avg} avg</span>
                        </div>
                        <RelevanceBar score={avg} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-border">
                    <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Active Sources</h3>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(alerts.map(a => a.source))).map(source => (
                        <button key={source} onClick={() => setFilterSource(source)} className="text-xs">
                          <SourceBadge source={source} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-text-muted text-center mt-5">Click any alert to see details</p>
                </div>
              )}

              <div className="bg-surface-card border border-border rounded-xl p-4">
                <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Refresh feed',         icon: RefreshCw, action: () => toast.info('Feed refreshed') },
                    { label: 'Configure alert rules', icon: Settings,  action: () => setShowRules(true) },
                    { label: 'Export triage report',  icon: FileText,  action: () => toast.info('Exporting triage summary...') },
                  ].map(({ label, icon: Icon, action }) => (
                    <button key={label} onClick={action}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-elevated rounded-lg transition-colors text-left">
                      <Icon className="w-4 h-4 flex-shrink-0" /> {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Rules Panel */}
      {showRules && <AlertRulesPanel onClose={() => setShowRules(false)} />}

      {/* Submission Impact Link Modal */}
      {linkingAlert && (
        <SubmissionLinkPanel
          alert={linkingAlert}
          onClose={() => setLinkingAlert(null)}
          onLink={(alertId, link) => { addSubmissionLink(alertId, link); setLinkingAlert(null); }}
        />
      )}
    </div>
  );
}
