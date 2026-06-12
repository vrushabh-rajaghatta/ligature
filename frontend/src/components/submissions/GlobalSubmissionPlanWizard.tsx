// ============================================================================
// GlobalSubmissionPlanWizard - v0.38.7
// Multi-Region Submission Planning with Dependencies and Critical Path
// ============================================================================
// Features:
// - Plan submissions across multiple regions simultaneously
// - Cross-region dependency mapping (e.g., US reference to EU CMC dossier)
// - Resource allocation across concurrent submissions
// - Critical path analysis for global launch timing
// - Milestone synchronization
// ============================================================================


import React, { useState, useMemo, useCallback } from 'react';
import {
  Globe, Calendar, Users, Link2, AlertTriangle, CheckCircle, ChevronRight,
  ChevronDown, Plus, Minus, ArrowRight, Target, Clock, Flag, Building2,
  FileText, Loader2, X, Zap, TrendingUp, GitBranch, Milestone, Crown
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { TemplatePickerStep } from '@/components/submissions/TemplatePickerStep';

// ============================================================================
// TYPES
// ============================================================================

type SubmissionType = 'IND' | 'NDA' | 'BLA' | 'MAA' | 'JNDA' | 'CTA' | 'NDS' | 'sNDA' | 'sBLA' | 'Type II Variation';

interface RegionConfig {
  id: string;
  name: string;
  agency: string;
  flag: string;
  submissionTypes: SubmissionType[];
  averageReviewTime: number; // days
  leadTime: number; // days before target launch
}

interface PlannedSubmission {
  id: string;
  regionId: string;
  submissionType: SubmissionType;
  targetSubmissionDate: string;
  expectedApprovalDate: string;
  status: 'planned' | 'in-preparation' | 'submitted' | 'under-review' | 'approved';
  priority: 'primary' | 'secondary' | 'tertiary';
  dependencies: string[]; // IDs of submissions this depends on
  notes?: string;
  isLeadMarket?: boolean;     // v0.59.0: LIG-002 lead market designation
  satelliteDeltaTasks?: string[]; // v0.59.0: tasks required beyond CPI
}

interface GlobalPlan {
  id: string;
  name: string;
  productId: string;
  productName: string;
  indication: string;
  targetGlobalLaunchDate: string;
  leadMarketId?: string;       // v0.59.0: LIG-001 lead market
  submissions: PlannedSubmission[];
  createdAt: string;
  updatedAt: string;
}

interface DependencyLink {
  fromSubmissionId: string;
  toSubmissionId: string;
  type: 'reference' | 'sequence' | 'data-sharing' | 'approval-required';
  description: string;
}

interface CriticalPathItem {
  submissionId: string;
  regionName: string;
  submissionType: string;
  targetDate: string;
  daysUntil: number;
  isOnCriticalPath: boolean;
  slackDays: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const REGIONS: RegionConfig[] = [
  { id: 'us', name: 'United States', agency: 'FDA', flag: '🇺🇸', submissionTypes: ['IND', 'NDA', 'BLA', 'sNDA', 'sBLA'], averageReviewTime: 300, leadTime: 365 },
  { id: 'eu', name: 'European Union', agency: 'EMA', flag: '🇪🇺', submissionTypes: ['CTA', 'MAA', 'Type II Variation'], averageReviewTime: 400, leadTime: 450 },
  { id: 'jp', name: 'Japan', agency: 'PMDA', flag: '🇯🇵', submissionTypes: ['CTA', 'JNDA'], averageReviewTime: 360, leadTime: 400 },
  { id: 'cn', name: 'China', agency: 'NMPA', flag: '🇨🇳', submissionTypes: ['CTA', 'NDA', 'BLA'], averageReviewTime: 450, leadTime: 500 },
  { id: 'ca', name: 'Canada', agency: 'Health Canada', flag: '🇨🇦', submissionTypes: ['CTA', 'NDS'], averageReviewTime: 300, leadTime: 350 },
  { id: 'au', name: 'Australia', agency: 'TGA', flag: '🇦🇺', submissionTypes: ['NDA'] as any, averageReviewTime: 250, leadTime: 300 },
  { id: 'uk', name: 'United Kingdom', agency: 'MHRA', flag: '🇬🇧', submissionTypes: ['CTA', 'MAA'], averageReviewTime: 300, leadTime: 350 },
  { id: 'ch', name: 'Switzerland', agency: 'Swissmedic', flag: '🇨🇭', submissionTypes: ['CTA', 'MAA'], averageReviewTime: 330, leadTime: 380 },
];

const DEPENDENCY_TYPES = [
  { value: 'reference', label: 'Reference Dossier', description: 'Uses data from another submission' },
  { value: 'sequence', label: 'Sequential', description: 'Must complete before starting' },
  { value: 'data-sharing', label: 'Data Sharing', description: 'Shares clinical/CMC data' },
  { value: 'approval-required', label: 'Approval Required', description: 'Requires approval in reference region' },
];

// Mock products
const PRODUCTS = [
  { id: 'lig-2847', name: 'Ligrastinib', indication: 'Non-Small Cell Lung Cancer' },
  { id: 'nex-4200', name: 'Nexovir', indication: 'Chronic Hepatitis B' },
  { id: 'crz-1100', name: 'Cardiozen', indication: 'Heart Failure with Preserved EF' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = (): string => `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const addDays = (date: string, days: number): string => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

const daysBetween = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

const calculateSubmissionDate = (launchDate: string, region: RegionConfig): string => {
  return addDays(launchDate, -(region.leadTime));
};

const calculateApprovalDate = (submissionDate: string, region: RegionConfig): string => {
  return addDays(submissionDate, region.averageReviewTime);
};

// ============================================================================
// STEP COMPONENTS
// ============================================================================

interface Step1Props {
  productId: string;
  productName: string;
  indication: string;
  targetLaunchDate: string;
  planName: string;
  onProductChange: (id: string, name: string, indication: string) => void;
  onLaunchDateChange: (date: string) => void;
  onPlanNameChange: (name: string) => void;
}

function Step1ProductAndTiming({
  productId, productName, indication, targetLaunchDate, planName,
  onProductChange, onLaunchDateChange, onPlanNameChange
}: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-2">Product & Global Launch Target</h3>
        <p className="text-sm text-text-muted mb-4">Select the product and set your target global launch date</p>
      </div>
      
      {/* Plan Name */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Plan Name</label>
        <input
          type="text"
          value={planName}
          onChange={(e) => onPlanNameChange(e.target.value)}
          placeholder="e.g., Ligrastinib Global Launch 2027"
          className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary"
        />
      </div>
      
      {/* Product Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Product</label>
        <div className="grid grid-cols-1 gap-3">
          {PRODUCTS.map(product => (
            <button
              key={product.id}
              onClick={() => onProductChange(product.id, product.name, product.indication)}
              className={`
                p-4 rounded-lg border text-left transition-all
                ${productId === product.id 
                  ? 'border-accent-blue bg-accent-blue/10 ring-1 ring-accent-blue/30' 
                  : 'border-border bg-surface-card hover:border-accent-blue/50'
                }
              `}
            >
              <div className="font-medium text-text-primary">{product.name}</div>
              <div className="text-sm text-text-muted">{product.indication}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Target Launch Date */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Target Global Launch Date</label>
        <input
          type="date"
          value={targetLaunchDate}
          onChange={(e) => onLaunchDateChange(e.target.value)}
          className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary"
        />
        {targetLaunchDate && (
          <p className="text-sm text-text-muted mt-2">
            Submissions will be back-calculated from this date based on regional review timelines
          </p>
        )}
      </div>
    </div>
  );
}

// v0.59.0: LIG-001/002 — CPI (Common Package Items) that all markets share
const CPI_ITEMS = [
  'Module 2.1 — Table of Contents',
  'Module 2.2 — Introduction',
  'Module 2.3 — Quality Overall Summary (QOS)',
  'Module 2.4 — Nonclinical Overview',
  'Module 2.5 — Clinical Overview',
  'Module 2.6 — Nonclinical Written & Tabulated Summaries',
  'Module 2.7 — Clinical Summary',
  'Module 3 — Quality (CTD)',
  'Module 4 — Nonclinical Study Reports',
  'Module 5 — Clinical Study Reports',
];

// Satellite-specific delta tasks by region
const SATELLITE_DELTA_TASKS: Record<string, string[]> = {
  eu:  ['CHMP Scientific Advice response', 'EU Risk Management Plan (RMP)', 'Paediatric Investigation Plan (PIP)', 'PRAC assessment'],
  jp:  ['Japanese labeling translation & bridging study', 'PMDA consultation package', 'Japanese QOS translation', 'Region-specific clinical data bridging'],
  cn:  ['NMPA-specific CTD adaptation', 'Chinese language labeling package', 'Local clinical trial data (if required)', 'GMP certificate for China'],
  ca:  ['Health Canada Summary Basis of Decision', 'Canadian product monograph', 'Comparative bioavailability data (if applicable)'],
  au:  ['TGA product information (PI) document', 'Australian Regulatory Guidelines compliance check'],
  uk:  ['MHRA product information adaptation (post-Brexit)', 'UK risk management plan'],
  ch:  ['Swissmedic-specific format adaptation', 'Swiss product information'],
};

interface Step2Props {
  selectedRegions: string[];
  submissions: PlannedSubmission[];
  targetLaunchDate: string;
  leadMarketId: string;
  onToggleRegion: (regionId: string) => void;
  onUpdateSubmission: (regionId: string, updates: Partial<PlannedSubmission>) => void;
  onSetLeadMarket: (regionId: string) => void;
}

function Step2RegionSelection({
  selectedRegions, submissions, targetLaunchDate, leadMarketId,
  onToggleRegion, onUpdateSubmission, onSetLeadMarket
}: Step2Props) {
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-1">Select Regions & Designate Lead Market</h3>
        <p className="text-sm text-text-muted mb-2">The lead market provides the core CTD dossier. Satellites receive a task overlay with only their delta requirements.</p>
      </div>

      {/* Lead market explainer */}
      {selectedRegions.length > 0 && (
        <div className="p-3 bg-accent-blue/5 border border-accent-blue/20 rounded-lg flex items-start gap-3">
          <Crown className="w-4 h-4 text-accent-blue flex-shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary">
            <span className="font-medium text-text-primary">Lead market</span> = the full CTD plan.{' '}
            {leadMarketId
              ? <>Satellites inherit <span className="font-medium text-accent-green">{CPI_ITEMS.length} Common Package Items (CPI)</span> plus their region-specific delta tasks only.</>
              : 'Click "Set as Lead" on any selected region to designate it.'}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {REGIONS.map(region => {
          const isSelected = selectedRegions.includes(region.id);
          const submission = submissions.find(s => s.regionId === region.id);
          const isLead = leadMarketId === region.id;
          const isSatellite = isSelected && !isLead && leadMarketId;
          const deltaCount = SATELLITE_DELTA_TASKS[region.id]?.length ?? 0;
          const isExpanded = expandedRegion === region.id;

          return (
            <div
              key={region.id}
              className={`rounded-lg border transition-all ${
                isLead
                  ? 'border-accent-blue bg-accent-blue/5'
                  : isSelected
                    ? 'border-border bg-surface-elevated'
                    : 'border-border bg-surface-card opacity-80'
              }`}
            >
              {/* Region Header */}
              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={() => onToggleRegion(region.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded border-border text-accent-blue flex-shrink-0"
                  />
                  <span className="text-xl">{region.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{region.name}</span>
                      {isLead && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          <Crown className="w-2.5 h-2.5" /> Lead Market
                        </span>
                      )}
                      {isSatellite && (
                        <span className="text-[10px] font-semibold text-text-muted bg-surface-card px-1.5 py-0.5 rounded-full uppercase tracking-wide border border-border">
                          Satellite +{deltaCount} delta
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted">{region.agency} · ~{region.averageReviewTime}d review</div>
                  </div>
                </button>

                {/* Lead market designation */}
                {isSelected && !isLead && (
                  <button
                    onClick={() => onSetLeadMarket(region.id)}
                    className="text-xs px-2.5 py-1 border border-border rounded-lg text-text-muted hover:border-accent-blue hover:text-accent-blue transition-colors flex-shrink-0"
                  >
                    Set as Lead
                  </button>
                )}

                {isSelected && (
                  <button
                    onClick={() => setExpandedRegion(isExpanded ? null : region.id)}
                    className="p-1 text-text-muted hover:text-text-primary transition-colors flex-shrink-0"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Expanded Configuration */}
              {isSelected && submission && isExpanded && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Submission Type</label>
                      <select
                        value={submission.submissionType}
                        onChange={(e) => onUpdateSubmission(region.id, { submissionType: e.target.value as SubmissionType })}
                        className="w-full px-3 py-1.5 text-sm bg-surface-card border border-border rounded text-text-primary"
                      >
                        {region.submissionTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Target Submission</label>
                      <input
                        type="date"
                        value={submission.targetSubmissionDate}
                        onChange={(e) => onUpdateSubmission(region.id, {
                          targetSubmissionDate: e.target.value,
                          expectedApprovalDate: calculateApprovalDate(e.target.value, region)
                        })}
                        className="w-full px-3 py-1.5 text-sm bg-surface-card border border-border rounded text-text-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Priority</label>
                      <select
                        value={submission.priority}
                        onChange={(e) => onUpdateSubmission(region.id, { priority: e.target.value as PlannedSubmission['priority'] })}
                        className="w-full px-3 py-1.5 text-sm bg-surface-card border border-border rounded text-text-primary"
                      >
                        <option value="primary">Primary</option>
                        <option value="secondary">Secondary</option>
                        <option value="tertiary">Tertiary</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-surface-card rounded text-xs text-text-muted">
                    Expected approval: <span className="font-medium text-text-secondary">{formatDate(submission.expectedApprovalDate)}</span>
                    {' '}({daysBetween(submission.targetSubmissionDate, submission.expectedApprovalDate)} days after submission)
                  </div>

                  {/* Satellite delta tasks */}
                  {isSatellite && SATELLITE_DELTA_TASKS[region.id] && (
                    <div className="mt-3 p-3 bg-surface-card rounded-lg border border-border">
                      <div className="text-xs font-medium text-text-primary mb-2">
                        Delta tasks (beyond CPI) — {SATELLITE_DELTA_TASKS[region.id].length} items
                      </div>
                      <div className="space-y-1">
                        {SATELLITE_DELTA_TASKS[region.id].map((task, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                            <div className="w-1.5 h-1.5 rounded-full bg-accent-amber flex-shrink-0" />
                            {task}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lead market CPI indicator */}
                  {isLead && (
                    <div className="mt-3 p-3 bg-accent-blue/5 rounded-lg border border-accent-blue/20">
                      <div className="text-xs font-medium text-accent-blue mb-2">
                        Common Package Items (CPI) — {CPI_ITEMS.length} items shared to all satellites
                      </div>
                      <div className="space-y-1">
                        {CPI_ITEMS.slice(0, 5).map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                            <CheckCircle className="w-3 h-3 text-accent-green flex-shrink-0" />
                            {item}
                          </div>
                        ))}
                        {CPI_ITEMS.length > 5 && (
                          <div className="text-xs text-text-muted pl-5">+{CPI_ITEMS.length - 5} more modules</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Step3Props {
  submissions: PlannedSubmission[];
  dependencies: DependencyLink[];
  onAddDependency: (from: string, to: string, type: string, description: string) => void;
  onRemoveDependency: (index: number) => void;
}

function Step3Dependencies({ submissions, dependencies, onAddDependency, onRemoveDependency }: Step3Props) {
  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [depType, setDepType] = useState('reference');
  const [description, setDescription] = useState('');
  
  const getRegionInfo = (submissionId: string) => {
    const sub = submissions.find(s => s.id === submissionId);
    if (!sub) return null;
    const region = REGIONS.find(r => r.id === sub.regionId);
    return { submission: sub, region };
  };
  
  const handleAdd = () => {
    if (fromId && toId && fromId !== toId) {
      onAddDependency(fromId, toId, depType, description);
      setFromId('');
      setToId('');
      setDescription('');
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-2">Cross-Region Dependencies</h3>
        <p className="text-sm text-text-muted mb-4">Define relationships between regional submissions</p>
      </div>
      
      {/* Add Dependency */}
      <div className="p-4 bg-surface-card rounded-lg border border-border">
        <div className="text-sm font-medium text-text-secondary mb-3">Add Dependency</div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">From (Reference)</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded text-text-primary"
            >
              <option value="">Select submission...</option>
              {submissions.map(sub => {
                const region = REGIONS.find(r => r.id === sub.regionId);
                return (
                  <option key={sub.id} value={sub.id}>
                    {region?.flag} {region?.name} - {sub.submissionType}
                  </option>
                );
              })}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">To (Dependent)</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded text-text-primary"
            >
              <option value="">Select submission...</option>
              {submissions.filter(s => s.id !== fromId).map(sub => {
                const region = REGIONS.find(r => r.id === sub.regionId);
                return (
                  <option key={sub.id} value={sub.id}>
                    {region?.flag} {region?.name} - {sub.submissionType}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="block text-xs text-text-muted mb-1">Dependency Type</label>
            <select
              value={depType}
              onChange={(e) => setDepType(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded text-text-primary"
            >
              {DEPENDENCY_TYPES.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., CMC Module 3 data"
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-border rounded text-text-primary"
            />
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleAdd}
          disabled={!fromId || !toId || fromId === toId}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Dependency
        </Button>
      </div>
      
      {/* Dependency List */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-3">
          Configured Dependencies ({dependencies.length})
        </div>
        {dependencies.length === 0 ? (
          <div className="p-4 bg-surface-card rounded-lg border border-dashed border-border text-center text-text-muted text-sm">
            No dependencies configured. Add cross-region references above.
          </div>
        ) : (
          <div className="space-y-2">
            {dependencies.map((dep, idx) => {
              const fromInfo = getRegionInfo(dep.fromSubmissionId);
              const toInfo = getRegionInfo(dep.toSubmissionId);
              const depTypeInfo = DEPENDENCY_TYPES.find(dt => dt.value === dep.type);
              
              return (
                <div key={idx} className="p-3 bg-surface-card rounded-lg border border-border flex items-center gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-lg">{fromInfo?.region?.flag}</span>
                    <span className="text-sm text-text-primary">{fromInfo?.submission?.submissionType}</span>
                    <ArrowRight className="w-4 h-4 text-text-muted" />
                    <span className="text-lg">{toInfo?.region?.flag}</span>
                    <span className="text-sm text-text-primary">{toInfo?.submission?.submissionType}</span>
                  </div>
                  <span className="text-xs px-2 py-1 bg-surface-elevated rounded text-text-muted">
                    {depTypeInfo?.label}
                  </span>
                  {dep.description && (
                    <span className="text-xs text-text-muted">{dep.description}</span>
                  )}
                  <button
                    onClick={() => onRemoveDependency(idx)}
                    className="p-1 hover:bg-red-500/10 rounded text-text-muted hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Common Patterns */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Zap className="w-4 h-4" />
          Common Dependency Patterns
        </div>
        <ul className="text-xs text-text-muted space-y-1">
          <li>• <strong>US → EU/JP:</strong> Reference US CMC dossier for international filings</li>
          <li>• <strong>EU → US:</strong> Reference EU clinical data in FDA submission</li>
          <li>• <strong>US Approval → China:</strong> NMPA often requires US/EU approval first</li>
        </ul>
      </div>
    </div>
  );
}

interface Step4Props {
  planName: string;
  productName: string;
  indication: string;
  targetLaunchDate: string;
  submissions: PlannedSubmission[];
  dependencies: DependencyLink[];
  leadMarketId?: string;
}

// CPI modules list for dedup view
const CPI_MODULES_REVIEW = [
  'Module 2.1 — Table of Contents',
  'Module 2.2 — Introduction',
  'Module 2.3 — Quality Overall Summary (QOS)',
  'Module 2.4 — Nonclinical Overview',
  'Module 2.5 — Clinical Overview',
  'Module 2.6 — Nonclinical Written & Tabulated Summaries',
  'Module 2.7 — Clinical Summary',
  'Module 3 — Quality (CTD)',
  'Module 4 — Nonclinical Study Reports',
  'Module 5 — Clinical Study Reports',
];

const SAT_DELTA_REVIEW: Record<string, string[]> = {
  eu:  ['CHMP Scientific Advice response', 'EU Risk Management Plan (RMP)', 'Paediatric Investigation Plan (PIP)', 'PRAC assessment'],
  jp:  ['Japanese labeling translation & bridging study', 'PMDA consultation package', 'Japanese QOS translation', 'Clinical data bridging'],
  cn:  ['NMPA-specific CTD adaptation', 'Chinese language labeling package', 'Local clinical trial data', 'GMP certificate for China'],
  ca:  ['Health Canada Summary Basis of Decision', 'Canadian product monograph', 'Comparative bioavailability data'],
  au:  ['TGA product information (PI) document', 'Australian Regulatory Guidelines compliance check'],
  uk:  ['MHRA product information adaptation (post-Brexit)', 'UK risk management plan'],
  ch:  ['Swissmedic-specific format adaptation', 'Swiss product information'],
  us:  [],
};

function Step4Review({ planName, productName, indication, targetLaunchDate, submissions, dependencies, leadMarketId }: Step4Props) {
  const [showCPIDedup, setShowCPIDedup] = React.useState(false);

  const criticalPath = useMemo((): CriticalPathItem[] => {
    const today = new Date().toISOString().split('T')[0];
    return submissions
      .map(sub => {
        const region = REGIONS.find(r => r.id === sub.regionId);
        const daysUntil = daysBetween(today, sub.targetSubmissionDate);
        const hasDependencies = dependencies.some(d => d.toSubmissionId === sub.id);
        return {
          submissionId: sub.id,
          regionName: region?.name || '',
          submissionType: sub.submissionType,
          targetDate: sub.targetSubmissionDate,
          daysUntil,
          isOnCriticalPath: sub.priority === 'primary' || hasDependencies,
          slackDays: sub.priority === 'primary' ? 0 : 30,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [submissions, dependencies]);

  const primaryMarkets = submissions.filter(s => s.priority === 'primary');
  const satelliteSubmissions = submissions.filter(s => s.regionId !== leadMarketId);
  const leadRegion = leadMarketId ? REGIONS.find(r => r.id === leadMarketId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-text-primary mb-2">Review Global Submission Plan</h3>
        <p className="text-sm text-text-muted mb-4">Confirm your submission strategy before creating the plan</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
          <div className="text-3xl font-bold text-accent-blue">{submissions.length}</div>
          <div className="text-sm text-text-muted">Regions</div>
        </div>
        <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
          <div className="text-3xl font-bold text-accent-green">{primaryMarkets.length}</div>
          <div className="text-sm text-text-muted">Primary</div>
        </div>
        <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
          <div className="text-3xl font-bold text-accent-amber">{dependencies.length}</div>
          <div className="text-sm text-text-muted">Dependencies</div>
        </div>
        <div className="p-4 bg-surface-card rounded-lg border border-border text-center">
          <div className="text-3xl font-bold text-accent-purple">{criticalPath[0]?.daysUntil || 0}</div>
          <div className="text-sm text-text-muted">Days to First</div>
        </div>
      </div>

      {/* CPI Dedup View */}
      {leadMarketId && satelliteSubmissions.length > 0 && (
        <div className="bg-surface-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowCPIDedup(o => !o)}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated transition-colors"
          >
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-accent-blue" />
              <span className="text-sm font-semibold text-text-primary">CPI Deduplication View</span>
              <span className="text-xs text-text-muted bg-surface-elevated border border-border px-2 py-0.5 rounded-full">
                {CPI_MODULES_REVIEW.length} shared · {satelliteSubmissions.length} satellite{satelliteSubmissions.length !== 1 ? 's' : ''}
              </span>
            </div>
            <ChevronRight className={`w-4 h-4 text-text-muted transition-transform ${showCPIDedup ? 'rotate-90' : ''}`} />
          </button>

          {showCPIDedup && (
            <div className="border-t border-border overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left px-3 py-2 bg-accent-blue/10 border-r border-border min-w-[220px]">
                      <div className="flex items-center gap-1.5 text-accent-blue font-semibold">
                        <Crown className="w-3 h-3" />
                        {leadRegion?.flag} Lead Market CTD
                      </div>
                    </th>
                    {satelliteSubmissions.slice(0, 4).map(sat => {
                      const region = REGIONS.find(r => r.id === sat.regionId);
                      const delta = SAT_DELTA_REVIEW[sat.regionId]?.length ?? 0;
                      return (
                        <th key={sat.id} className="text-center px-3 py-2 bg-surface-elevated border-r border-border min-w-[110px]">
                          <div className="font-semibold text-text-primary">{region?.flag} {region?.name}</div>
                          <div className="text-accent-amber font-normal">+{delta} delta</div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {CPI_MODULES_REVIEW.map((cpi, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-surface-card' : 'bg-surface-elevated'}>
                      <td className="px-3 py-1.5 text-text-secondary border-r border-border">{cpi}</td>
                      {satelliteSubmissions.slice(0, 4).map(sat => (
                        <td key={sat.id} className="px-3 py-1.5 text-center border-r border-border">
                          <CheckCircle className="w-3.5 h-3.5 text-accent-green mx-auto" />
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-accent-amber/5 border-t border-accent-amber/20">
                    <td className="px-3 py-1.5 font-semibold text-accent-amber border-r border-border">Region-Specific Delta</td>
                    {satelliteSubmissions.slice(0, 4).map(sat => {
                      const tasks = SAT_DELTA_REVIEW[sat.regionId] || [];
                      return (
                        <td key={sat.id} className="px-3 py-1.5 border-r border-border">
                          {tasks.length === 0 ? (
                            <span className="text-text-muted">—</span>
                          ) : (
                            <div className="space-y-0.5">
                              {tasks.slice(0, 2).map((t, ti) => (
                                <div key={ti} className="flex items-start gap-1">
                                  <div className="w-1 h-1 rounded-full bg-accent-amber flex-shrink-0 mt-1" />
                                  <span className="text-text-muted leading-tight line-clamp-1">{t}</span>
                                </div>
                              ))}
                              {tasks.length > 2 && <div className="text-accent-amber">+{tasks.length - 2} more</div>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
              <div className="p-3 bg-surface-elevated border-t border-border text-xs text-text-muted">
                Satellites inherit all {CPI_MODULES_REVIEW.length} CPI modules from the lead market dossier. Only delta tasks are authored uniquely per region.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan Details */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-text-muted">Plan Name:</span><span className="text-text-primary ml-2 font-medium">{planName}</span></div>
          <div><span className="text-text-muted">Product:</span><span className="text-text-primary ml-2 font-medium">{productName}</span></div>
          <div><span className="text-text-muted">Indication:</span><span className="text-text-primary ml-2 font-medium">{indication}</span></div>
          <div><span className="text-text-muted">Global Launch:</span><span className="text-text-primary ml-2 font-medium">{formatDate(targetLaunchDate)}</span></div>
        </div>
      </div>

      {/* Timeline */}
      <div>
        <div className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
          <Milestone className="w-4 h-4" /> Submission Timeline (Critical Path)
        </div>
        <div className="space-y-2">
          {criticalPath.map((item) => {
            const region = REGIONS.find(r => submissions.find(s => s.id === item.submissionId)?.regionId === r.id);
            return (
              <div key={item.submissionId} className={`p-3 rounded-lg border flex items-center gap-4 ${item.isOnCriticalPath ? 'bg-red-500/10 border-red-500/30' : 'bg-surface-card border-border'}`}>
                <span className="text-lg">{region?.flag}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-primary">{item.regionName} - {item.submissionType}</div>
                  <div className="text-xs text-text-muted">Target: {formatDate(item.targetDate)}</div>
                </div>
                <div className={`text-sm font-medium ${item.daysUntil <= 90 ? 'text-red-400' : item.daysUntil <= 180 ? 'text-amber-400' : 'text-green-400'}`}>
                  {item.daysUntil} days
                </div>
                {item.isOnCriticalPath && (
                  <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">Critical Path</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface GlobalSubmissionPlanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (plan: GlobalPlan) => void;
}

export function GlobalSubmissionPlanWizard({ isOpen, onClose, onComplete }: GlobalSubmissionPlanWizardProps) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Product & Timing
  const [planName, setPlanName] = useState('');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [indication, setIndication] = useState('');
  const [targetLaunchDate, setTargetLaunchDate] = useState('');

  // Step 2: Template (LIG-005)
  const [templateId, setTemplateId] = useState<import('@/data/global-submission-plan-data').TemplateType | null>(null);
  
  // Step 3: Regions
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<PlannedSubmission[]>([]);
  const [leadMarketId, setLeadMarketId] = useState<string>('');
  
  // Step 3: Dependencies
  const [dependencies, setDependencies] = useState<DependencyLink[]>([]);
  
  // Handlers
  const handleProductChange = useCallback((id: string, name: string, ind: string) => {
    setProductId(id);
    setProductName(name);
    setIndication(ind);
    setPlanName(`${name} Global Launch ${new Date().getFullYear() + 2}`);
  }, []);
  
  const handleToggleRegion = useCallback((regionId: string) => {
    setSelectedRegions(prev => {
      const isSelected = prev.includes(regionId);
      
      if (isSelected) {
        // Remove region — if it was lead, clear lead market
        setSubmissions(subs => subs.filter(s => s.regionId !== regionId));
        setDependencies(deps => deps.filter(d => {
          const fromSub = submissions.find(s => s.id === d.fromSubmissionId);
          const toSub = submissions.find(s => s.id === d.toSubmissionId);
          return fromSub?.regionId !== regionId && toSub?.regionId !== regionId;
        }));
        if (leadMarketId === regionId) setLeadMarketId('');
        return prev.filter(id => id !== regionId);
      } else {
        // Add region with default submission
        const region = REGIONS.find(r => r.id === regionId);
        if (region && targetLaunchDate) {
          const subDate = calculateSubmissionDate(targetLaunchDate, region);
          const newSubmission: PlannedSubmission = {
            id: `sub-${regionId}-${Date.now()}`,
            regionId,
            submissionType: region.submissionTypes[0],
            targetSubmissionDate: subDate,
            expectedApprovalDate: calculateApprovalDate(subDate, region),
            status: 'planned',
            priority: regionId === 'us' ? 'primary' : 'secondary',
            dependencies: [],
            isLeadMarket: prev.length === 0, // auto-designate first region as lead
            satelliteDeltaTasks: SATELLITE_DELTA_TASKS[regionId] ?? [],
          };
          setSubmissions(subs => [...subs, newSubmission]);
          // Auto-set lead market if first region selected
          if (prev.length === 0) setLeadMarketId(regionId);
        }
        return [...prev, regionId];
      }
    });
  }, [targetLaunchDate, submissions, leadMarketId]);

  const handleSetLeadMarket = useCallback((regionId: string) => {
    setLeadMarketId(regionId);
    setSubmissions(subs => subs.map(s => ({
      ...s,
      isLeadMarket: s.regionId === regionId,
    })));
  }, []);
  
  const handleUpdateSubmission = useCallback((regionId: string, updates: Partial<PlannedSubmission>) => {
    setSubmissions(subs => subs.map(s => 
      s.regionId === regionId ? { ...s, ...updates } : s
    ));
  }, []);
  
  const handleAddDependency = useCallback((from: string, to: string, type: string, description: string) => {
    setDependencies(deps => [...deps, {
      fromSubmissionId: from,
      toSubmissionId: to,
      type: type as DependencyLink['type'],
      description,
    }]);
  }, []);
  
  const handleRemoveDependency = useCallback((index: number) => {
    setDependencies(deps => deps.filter((_, i) => i !== index));
  }, []);
  
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    
    try {
      const plan: GlobalPlan = {
        id: generateId(),
        name: planName,
        productId,
        productName,
        indication,
        targetGlobalLaunchDate: targetLaunchDate,
        leadMarketId,
        submissions,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      // v0.88.0: real API call — POST /api/submissions/global-plan
      const response = await fetch('/api/submissions/global-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      const result = json.data;

      // Merge enriched plan back (preserves id confirmed by server)
      const confirmedPlan = result?.plan || plan;
      onComplete(confirmedPlan);

      const cpiCount = result?.gapAnalysis?.summary?.totalCpiSections ?? 0;
      const deltaCount = result?.gapAnalysis?.summary?.totalDeltaSections ?? 0;
      toast.success(
        `Plan "${planName}" created — ${submissions.length} regions, ${cpiCount} CPI sections, ${deltaCount} regional-delta sections`
      );
      onClose();
      
    } catch (error) {
      toast.error('Failed to create plan');
    } finally {
      setIsSubmitting(false);
    }
  }, [planName, productId, productName, indication, targetLaunchDate, submissions, onComplete, onClose, toast]);
  
  // Validation
  const canProceed = useMemo(() => {
    switch (step) {
      case 1: return productId && targetLaunchDate && planName;
      case 2: return !!templateId;           // LIG-005: template required
      case 3: return selectedRegions.length > 0;
      case 4: return true; // Dependencies are optional
      case 5: return true;
      default: return false;
    }
  }, [step, productId, targetLaunchDate, planName, selectedRegions, templateId]);
  
  if (!isOpen) return null;
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Global Submission Plan"
      size="xl"
    >
      <div className="flex flex-col h-[70vh]">
        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-border bg-surface-card">
          <div className="flex items-center gap-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <React.Fragment key={s}>
                <button
                  onClick={() => s < step && setStep(s)}
                  className={`flex items-center gap-2 text-sm ${
                    step === s 
                      ? 'text-accent-blue font-medium' 
                      : step > s 
                        ? 'text-accent-green' 
                        : 'text-text-muted'
                  }`}
                >
                  <span className={`
                    w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${step === s 
                      ? 'bg-accent-blue text-white' 
                      : step > s 
                        ? 'bg-accent-green text-white' 
                        : 'bg-surface-elevated text-text-muted'
                    }
                  `}>
                    {step > s ? <CheckCircle className="w-4 h-4" /> : s}
                  </span>
                  {s === 1 && 'Product'}
                  {s === 2 && 'Template'}
                  {s === 3 && 'Regions'}
                  {s === 4 && 'Dependencies'}
                  {s === 5 && 'Review'}
                </button>
                {s < 5 && <ChevronRight className="w-4 h-4 text-text-muted" />}
              </React.Fragment>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 1 && (
            <Step1ProductAndTiming
              productId={productId}
              productName={productName}
              indication={indication}
              targetLaunchDate={targetLaunchDate}
              planName={planName}
              onProductChange={handleProductChange}
              onLaunchDateChange={setTargetLaunchDate}
              onPlanNameChange={setPlanName}
            />
          )}
          {step === 2 && (
            <TemplatePickerStep
              selectedTemplateId={templateId}
              onSelect={setTemplateId}
            />
          )}
          {step === 3 && (
            <Step2RegionSelection
              selectedRegions={selectedRegions}
              submissions={submissions}
              targetLaunchDate={targetLaunchDate}
              leadMarketId={leadMarketId}
              onToggleRegion={handleToggleRegion}
              onUpdateSubmission={handleUpdateSubmission}
              onSetLeadMarket={handleSetLeadMarket}
            />
          )}
          {step === 4 && (
            <Step3Dependencies
              submissions={submissions}
              dependencies={dependencies}
              onAddDependency={handleAddDependency}
              onRemoveDependency={handleRemoveDependency}
            />
          )}
          {step === 5 && (
            <Step4Review
              planName={planName}
              productName={productName}
              indication={indication}
              targetLaunchDate={targetLaunchDate}
              submissions={submissions}
              dependencies={dependencies}
              leadMarketId={leadMarketId}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-surface-card flex items-center justify-between">
          <div className="text-sm text-text-muted">
            Step {step} of 5
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            
            {step < 5 ? (
              <Button
                variant="primary"
                disabled={!canProceed}
                onClick={() => setStep(step + 1)}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4 mr-1" />
                    Create Global Plan
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default GlobalSubmissionPlanWizard;
