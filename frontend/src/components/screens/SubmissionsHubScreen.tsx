


// ============================================================================
// SubmissionsHubScreen - v0.36.4
// Unified hub with tabs: Submissions | Timeline | Registrations | Commitments
// Now reads from submissions store to auto-select submissions from My Tasks
// ============================================================================


import React, { useState, useMemo, useEffect } from 'react';
import {
  Send, CheckCircle2, Clock, AlertCircle, AlertTriangle,
  Calendar, FileText, Globe, ChevronRight, ClipboardList,
  Search, Plus, Eye, ArrowUpRight, Rocket, RotateCcw,
  TrendingUp, XCircle, Target, Flag, Award, MapPin,
  ZoomIn, ZoomOut, RefreshCw, User, Archive
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import {
  RegulatorySubmission, SubmissionStatus, SubmissionType,
  getPortfolioMetrics, getProduct
} from '@/data/regulatory-submissions-data';
import {
  registrations,
  portfolioMilestones,
  regulatoryCommitments,
  productNames,
  productColors,
  getOverdueCommitments,
  getUpcomingCommitments,
} from '@/data/regulatory-data';
import { Registration, PortfolioMilestone, RegulatoryCommitment } from '@/types/core';
import { useAppStore } from '@/store/useAppStore';
import { useSubmissionsStore } from '@/stores/submissions-store';
import { useToast } from '@/components/ui/Toast';
import { NewSubmissionWizard } from '@/components/submissions/NewSubmissionWizard';
import { LifecycleManagementPanel } from '@/components/submissions/LifecycleManagementPanel';
import { FilterState } from '@/components/layout/FilterBar';
import { useSubmissionsHubData } from '@/hooks/useSubmissionsHubData';
import { useScopeContext } from '@/hooks/useScopeContext';
import { ScopeContextBanner } from '@/components/ui/ScopeContextBanner';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'submissions' | 'timeline' | 'registrations' | 'commitments' | 'lifecycle';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<SubmissionStatus, { 
  icon: React.ElementType; 
  color: string; 
  bg: string;
  label: string;
}> = {
  'blocked': { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Blocked' },
  'delayed': { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Delayed' },
  'at-risk': { icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'At Risk' },
  'on-track': { icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20', label: 'On Track' },
  'submitted': { icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Submitted' },
  'approved': { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Approved' },
};

const TYPE_CONFIG: Record<SubmissionType, { label: string; color: string; bg: string }> = {
  'IND': { label: 'IND', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  'NDA': { label: 'NDA', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  'BLA': { label: 'BLA', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  'MAA': { label: 'MAA', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  'sNDA': { label: 'sNDA', color: 'text-violet-400', bg: 'bg-violet-500/20' },
  'sBLA': { label: 'sBLA', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  'CTA': { label: 'CTA', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'JNDA': { label: 'JNDA', color: 'text-pink-400', bg: 'bg-pink-500/20' },
  'NDS': { label: 'NDS', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

const REGION_FLAGS: Record<string, string> = {
  'US': '🇺🇸', 'EU': '🇪🇺', 'Japan': '🇯🇵', 'China': '🇨🇳', 
  'Canada': '🇨🇦', 'UK': '🇬🇧', 'Australia': '🇦🇺', 'Brazil': '🇧🇷',
};

const REG_STATUS_CONFIG = {
  Active: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
  Pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  Expired: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
  Withdrawn: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

const MILESTONE_CONFIG = {
  submission: { icon: FileText, color: 'bg-blue-500', textColor: 'text-blue-400' },
  approval: { icon: CheckCircle2, color: 'bg-green-500', textColor: 'text-green-400' },
  launch: { icon: Rocket, color: 'bg-purple-500', textColor: 'text-purple-400' },
  commitment: { icon: Flag, color: 'bg-amber-500', textColor: 'text-amber-400' },
  'review-meeting': { icon: Calendar, color: 'bg-cyan-500', textColor: 'text-cyan-400' },
  other: { icon: Target, color: 'bg-slate-500', textColor: 'text-slate-400' },
};

const COUNTRIES = ['United States', 'European Union', 'United Kingdom', 'Japan', 'China', 'Canada', 'Australia', 'Brazil'];
const PRODUCTS = Object.keys(productNames);

// ============================================================================
// HELPERS
// ============================================================================

function getDaysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

// ============================================================================
// SUBMISSIONS TAB COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: SubmissionStatus }) {
  const config = STATUS_CONFIG[status] ?? { icon: AlertCircle, color: 'text-text-muted', bg: 'bg-surface-card', label: status ?? 'Unknown' };
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function TypeBadge({ type }: { type: SubmissionType }) {
  const config = TYPE_CONFIG[type] ?? { label: type ?? 'Unknown', color: 'text-text-muted', bg: 'bg-surface-card' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  );
}

function SubmissionCard({ submission, onView }: { submission: RegulatorySubmission; onView: () => void }) {
  const product = getProduct(submission.productId);
  const days = getDaysUntil(submission.targetDate);
  const modulesComplete = submission.modulesComplete ?? submission.modules.filter(m => m.status === 'complete').length;
  const modulesTotal = submission.modulesTotal ?? submission.modules.length;
  const progress = modulesTotal > 0 ? Math.round((modulesComplete / modulesTotal) * 100) : 0;
  
  return (
    <div className="bg-surface-card border border-border rounded-lg p-4 hover:border-accent-blue/50 hover:shadow-lg transition-all cursor-pointer group relative" onClick={onView}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={submission.submissionType} />
            <span className="text-sm text-text-muted">{REGION_FLAGS[submission.region] || '🌐'} {submission.region}</span>
          </div>
          <h3 className="font-medium text-text-primary truncate">{product?.brandName || product?.name}</h3>
          <p className="text-xs text-text-muted">{submission.agency}</p>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-text-muted">Progress</span>
          <span className="text-text-primary font-medium">{progress}%</span>
        </div>
        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
          <div className={`h-full ${progress >= 70 ? 'bg-green-500' : progress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1 text-text-muted">
          <Calendar className="w-3 h-3" />
          <span className="text-xs">{formatDate(submission.targetDate)}</span>
        </div>
        {submission.status !== 'approved' && submission.status !== 'submitted' && (
          <span className={`text-xs font-medium ${days < 0 ? 'text-red-400' : days <= 30 ? 'text-amber-400' : 'text-text-muted'}`}>
            {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
          </span>
        )}
      </div>
    </div>
  );
}

function SubmissionsTab({ searchQuery, submissions, onViewSubmission }: { searchQuery: string; submissions: RegulatorySubmission[]; onViewSubmission: (s: RegulatorySubmission) => void }) {
  const metrics = useMemo(() => getPortfolioMetrics(), []);
  
  const filteredSubmissions = useMemo(() => {
    if (!searchQuery) return submissions;
    const q = searchQuery.toLowerCase();
    return submissions.filter(sub => {
      const product = getProduct(sub.productId);
      return product?.name?.toLowerCase().includes(q) || product?.brandName?.toLowerCase().includes(q) || sub.region.toLowerCase().includes(q);
    });
  }, [searchQuery, submissions]);
  
  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, RegulatorySubmission[]> = { 'at-risk': [], 'delayed': [], 'blocked': [], 'on-track': [], 'submitted': [], 'approved': [] };
    filteredSubmissions.forEach(sub => { if (groups[sub.status]) groups[sub.status].push(sub); });
    return Object.entries(groups).filter(([_, subs]) => subs.length > 0);
  }, [filteredSubmissions]);
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><Send className="w-4 h-4 text-text-muted" /><span className="text-xs text-text-muted">Active</span></div>
          <p className="text-2xl font-semibold text-text-primary">{metrics.totalActive}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-green-400" /><span className="text-xs text-text-muted">On Track</span></div>
          <p className="text-2xl font-semibold text-green-400">{metrics.onTrack}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">At Risk</span></div>
          <p className="text-2xl font-semibold text-amber-400">{metrics.atRisk}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-blue-400" /><span className="text-xs text-text-muted">Due 30d</span></div>
          <p className="text-2xl font-semibold text-blue-400">{metrics.dueNext30Days}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-emerald-400" /><span className="text-xs text-text-muted">Approved</span></div>
          <p className="text-2xl font-semibold text-emerald-400">{submissions.filter(s => s.status === 'approved').length}</p>
        </div>
      </div>
      
      {/* Grouped Cards */}
      {groupedSubmissions.map(([status, submissions]) => {
        const config = STATUS_CONFIG[status as SubmissionStatus] ?? { icon: AlertCircle, color: 'text-text-muted', bg: 'bg-surface-card', label: status };
        const Icon = config.icon;
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-5 h-5 ${config?.color ?? ''}`} />
              <h2 className="font-semibold text-text-primary">{config.label}</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>{submissions.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {submissions.map(sub => <SubmissionCard key={sub.id} submission={sub} onView={() => onViewSubmission(sub)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// TIMELINE TAB COMPONENTS
// ============================================================================

function TimelineTab() {
  const [productFilter, setProductFilter] = useState<string>('all');
  
  const filteredMilestones = useMemo(() => {
    if (productFilter === 'all') return portfolioMilestones;
    return portfolioMilestones.filter(m => m.productId === productFilter);
  }, [productFilter]);
  
  // Group by quarter
  const milestonesByQuarter = useMemo(() => {
    const groups: Record<string, PortfolioMilestone[]> = {};
    filteredMilestones.forEach(m => {
      const d = new Date(m.date);
      const q = `Q${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
      if (!groups[q]) groups[q] = [];
      groups[q].push(m);
    });
    // Sort quarters
    return Object.entries(groups).sort((a, b) => {
      const [qa, ya] = [a[0].slice(1, 2), a[0].slice(3)];
      const [qb, yb] = [b[0].slice(1, 2), b[0].slice(3)];
      return ya === yb ? Number(qa) - Number(qb) : Number(ya) - Number(yb);
    });
  }, [filteredMilestones]);
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg">
          <option value="all">All Products</option>
          {PRODUCTS.map(p => <option key={p} value={p}>{productNames[p]}</option>)}
        </select>
        <span className="text-xs text-text-muted">{filteredMilestones.length} milestones</span>
      </div>
      
      {/* Timeline */}
      <div className="space-y-4 md:space-y-6">
        {milestonesByQuarter.map(([quarter, milestones]) => (
          <div key={quarter}>
            <h3 className="text-sm font-semibold text-text-primary mb-3 sticky top-0 bg-surface py-1">{quarter}</h3>
            <div className="space-y-2 pl-4 border-l-2 border-border">
              {milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(m => {
                const config = MILESTONE_CONFIG[m.type] || MILESTONE_CONFIG.other;
                const Icon = config.icon;
                const statusColor = m.status === 'complete' ? 'border-green-500' : m.status === 'at-risk' ? 'border-amber-500' : m.status === 'delayed' ? 'border-red-500' : 'border-border';
                return (
                  <div key={m.id} className={`relative pl-6 py-3 bg-surface-card rounded-lg border-2 ${statusColor}`}>
                    <div className={`absolute -left-[25px] top-4 w-6 h-6 rounded-full ${config?.color ?? ''} flex items-center justify-center`}>
                      <Icon className="w-3 h-3 text-white" />
                    </div>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-text-primary">{m.title}</p>
                        <p className="text-xs text-text-muted">{productNames[m.productId]} {m.region ? `• ${m.region}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-text-primary">{formatDate(m.date)}</p>
                        <p className={`text-xs capitalize ${m.status === 'complete' ? 'text-green-400' : m.status === 'at-risk' ? 'text-amber-400' : 'text-text-muted'}`}>{m.status.replace('-', ' ')}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// REGISTRATIONS TAB COMPONENTS
// ============================================================================

function RegistrationsTab() {
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');
  
  const matrixData = useMemo(() => {
    return PRODUCTS.map(productId => {
      const productRegs = registrations.filter(r => r.productId === productId);
      const countryMap: Record<string, Registration | null> = {};
      COUNTRIES.forEach(country => {
        countryMap[country] = productRegs.find(r => r.country === country) || null;
      });
      return { productId, productName: productNames[productId], countries: countryMap };
    });
  }, []);
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><Globe className="w-4 h-4 text-text-muted" /><span className="text-xs text-text-muted">Total</span></div>
          <p className="text-2xl font-semibold text-text-primary">{registrations.length}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-xs text-text-muted">Active</span></div>
          <p className="text-2xl font-semibold text-green-400">{registrations.filter(r => r.status === 'Active').length}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">Pending</span></div>
          <p className="text-2xl font-semibold text-amber-400">{registrations.filter(r => r.status === 'Pending').length}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><Rocket className="w-4 h-4 text-purple-400" /><span className="text-xs text-text-muted">Launched</span></div>
          <p className="text-2xl font-semibold text-purple-400">{registrations.filter(r => r.launchDate).length}</p>
        </div>
      </div>
      
      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-surface-card rounded-lg p-1 border border-border">
          {(['matrix', 'list'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1 text-sm rounded capitalize ${viewMode === mode ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'}`}>
              {mode}
            </button>
          ))}
        </div>
      </div>
      
      {viewMode === 'matrix' ? (
        /* Matrix View */
        <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-3 text-left font-medium text-text-primary border-r border-border sticky left-0 bg-surface z-10 min-w-[180px]">Product</th>
                  {COUNTRIES.map(country => (
                    <th key={country} className="p-3 text-center font-medium text-text-primary border-r border-border min-w-[140px]">
                      <span className="text-xs">{country}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixData.map((row, idx) => (
                  <tr key={row.productId} className={idx % 2 === 0 ? 'bg-surface-card' : 'bg-surface'}>
                    <td className="p-3 font-medium text-text-primary border-r border-border sticky left-0 bg-inherit z-10">
                      <span className="text-sm">{row.productName}</span>
                    </td>
                    {COUNTRIES.map(country => {
                      const reg = row.countries[country];
                      if (!reg) return <td key={country} className="p-2 text-center border-r border-border text-text-muted text-xs">—</td>;
                      const config = REG_STATUS_CONFIG[reg.status];
                      const Icon = config.icon;
                      return (
                        <td key={country} className="p-2 border-r border-border">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`p-1 rounded-full ${config?.bg ?? ''}`}><Icon className={`w-4 h-4 ${config?.color ?? ''}`} /></div>
                            {reg.approvalDate && <span className="text-[10px] text-text-muted">Appr: {formatShortDate(reg.approvalDate)}</span>}
                            {reg.launchDate && <span className="text-[10px] text-purple-400">Launch: {formatShortDate(reg.launchDate)}</span>}
                            {reg.licenseNumber && <span className="text-[10px] text-text-muted truncate max-w-[100px]">{reg.licenseNumber}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Legend */}
          <div className="p-3 border-t border-border bg-surface flex items-center gap-6">
            <span className="text-xs text-text-muted">Legend:</span>
            {Object.entries(REG_STATUS_CONFIG).map(([status, config]) => {
              const Icon = config.icon;
              return (
                <div key={status} className="flex items-center gap-1.5">
                  <div className={`p-1 rounded-full ${config?.bg ?? ''}`}><Icon className={`w-3 h-3 ${config?.color ?? ''}`} /></div>
                  <span className="text-xs text-text-muted">{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {registrations.map(reg => {
            const config = REG_STATUS_CONFIG[reg.status];
            const Icon = config.icon;
            return (
              <div key={reg.id} className="bg-surface-card border border-border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-text-primary">{productNames[reg.productId]}</h3>
                    <p className="text-sm text-text-muted flex items-center gap-1"><MapPin className="w-3 h-3" />{reg.country}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
                    <Icon className="w-3 h-3" />{reg.status}
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  {reg.licenseNumber && <div className="flex items-center gap-2"><Award className="w-4 h-4 text-text-muted" /><span className="text-text-secondary">{reg.licenseNumber}</span></div>}
                  {reg.approvalDate && <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-text-secondary">Approved: {formatDate(reg.approvalDate)}</span></div>}
                  {reg.launchDate && <div className="flex items-center gap-2"><Rocket className="w-4 h-4 text-purple-400" /><span className="text-purple-400">Launched: {formatDate(reg.launchDate)}</span></div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMMITMENTS TAB
// ============================================================================

const CMT_STATUS_CONFIG = {
  Pending: { icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/20' },
  'In Progress': { icon: RotateCcw, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  Submitted: { icon: Send, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  Fulfilled: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20' },
  Released: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  Overdue: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
};

const CMT_TYPE_CONFIG = {
  PMC: { label: 'PMC', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  PMR: { label: 'PMR', color: 'text-red-400', bg: 'bg-red-500/20' },
  'RMP-Measure': { label: 'RMP', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  Condition: { label: 'Condition', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  Other: { label: 'Other', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

function CommitmentsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCommitment, setSelectedCommitment] = useState<RegulatoryCommitment | null>(null);
  
  const stats = useMemo(() => ({
    total: regulatoryCommitments.length,
    overdue: getOverdueCommitments().length,
    upcoming90: getUpcomingCommitments(90).length,
    inProgress: regulatoryCommitments.filter(c => c.status === 'In Progress').length,
    fulfilled: regulatoryCommitments.filter(c => c.status === 'Fulfilled' || c.status === 'Released').length,
  }), []);
  
  const filteredCommitments = useMemo(() => {
    if (statusFilter === 'all') return regulatoryCommitments;
    if (statusFilter === 'overdue') {
      return regulatoryCommitments.filter(c => {
        const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days < 0 && c.status !== 'Fulfilled' && c.status !== 'Released';
      });
    }
    return regulatoryCommitments.filter(c => c.status === statusFilter);
  }, [statusFilter]);
  
  // Group by status
  const groupedCommitments = useMemo(() => {
    const groups: Record<string, RegulatoryCommitment[]> = {
      'Overdue': [],
      'In Progress': [],
      'Pending': [],
      'Submitted': [],
      'Fulfilled': [],
    };
    
    filteredCommitments.forEach(c => {
      const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const isOverdue = days < 0 && c.status !== 'Fulfilled' && c.status !== 'Released';
      
      if (isOverdue) {
        groups['Overdue'].push(c);
      } else if (c.status === 'Released') {
        groups['Fulfilled'].push(c);
      } else if (groups[c.status]) {
        groups[c.status].push(c);
      }
    });
    
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredCommitments]);
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><ClipboardList className="w-4 h-4 text-text-muted" /><span className="text-xs text-text-muted">Total</span></div>
          <p className="text-2xl font-semibold text-text-primary">{stats.total}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><AlertCircle className="w-4 h-4 text-red-400" /><span className="text-xs text-text-muted">Overdue</span></div>
          <p className="text-2xl font-semibold text-red-400">{stats.overdue}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-xs text-text-muted">Due 90d</span></div>
          <p className="text-2xl font-semibold text-amber-400">{stats.upcoming90}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><RotateCcw className="w-4 h-4 text-blue-400" /><span className="text-xs text-text-muted">In Progress</span></div>
          <p className="text-2xl font-semibold text-blue-400">{stats.inProgress}</p>
        </div>
        <div className="bg-surface-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-xs text-text-muted">Fulfilled</span></div>
          <p className="text-2xl font-semibold text-green-400">{stats.fulfilled}</p>
        </div>
      </div>
      
      {/* Filter */}
      <div className="flex items-center gap-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg">
          <option value="all">All Status</option>
          <option value="overdue">Overdue</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Submitted">Submitted</option>
          <option value="Fulfilled">Fulfilled</option>
        </select>
        <span className="text-xs text-text-muted">{filteredCommitments.length} commitments</span>
      </div>
      
      {/* Grouped Cards */}
      {groupedCommitments.map(([status, commitments]) => {
        const config = CMT_STATUS_CONFIG[status as keyof typeof CMT_STATUS_CONFIG] || CMT_STATUS_CONFIG.Pending;
        const Icon = config.icon;
        
        return (
          <div key={status}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-5 h-5 ${config?.color ?? ''}`} />
              <h2 className="font-semibold text-text-primary">{status}</h2>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>{commitments.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {commitments.map(c => {
                const typeConfig = CMT_TYPE_CONFIG[c.type] || CMT_TYPE_CONFIG.Other;
                const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                
                return (
                  <div key={c.id} className="bg-surface-card border border-border rounded-lg p-4 hover:border-accent-blue/50 cursor-pointer" onClick={() => setSelectedCommitment(c)}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig?.bg ?? ''} ${typeConfig?.color ?? ''}`}>{typeConfig.label}</span>
                          <span className="text-xs text-text-muted">{c.agency}</span>
                        </div>
                        <h3 className="font-medium text-text-primary text-sm line-clamp-2">{c.title}</h3>
                      </div>
                    </div>
                    <p className="text-xs text-text-muted line-clamp-2 mb-3">{c.description}</p>
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-border">
                      <span className="text-text-muted">{productNames[c.productId]}</span>
                      <span className={days < 0 ? 'text-red-400 font-medium' : days <= 30 ? 'text-amber-400' : 'text-text-muted'}>
                        {c.status === 'Fulfilled' || c.status === 'Released' ? '✓ Complete' : days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}
                      </span>
                    </div>
                    {c.responsibleParty && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-text-muted">
                        <User className="w-3 h-3" />{c.responsibleParty}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      
      {/* Detail Modal */}
      {selectedCommitment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedCommitment(null)}>
          <div className="w-full max-w-lg bg-surface-elevated h-full overflow-auto border-l border-border" onClick={e => e.stopPropagation()}>
            <div className="p-4 md:p-6 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Commitment Details</h2>
                <button onClick={() => setSelectedCommitment(null)} className="p-1 hover:bg-surface-card rounded"><XCircle className="w-5 h-5 text-text-muted" /></button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${CMT_TYPE_CONFIG[selectedCommitment.type]?.bg} ${CMT_TYPE_CONFIG[selectedCommitment.type]?.color}`}>
                  {CMT_TYPE_CONFIG[selectedCommitment.type]?.label || selectedCommitment.type}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${CMT_STATUS_CONFIG[selectedCommitment.status]?.bg} ${CMT_STATUS_CONFIG[selectedCommitment.status]?.color}`}>
                  {selectedCommitment.status}
                </span>
              </div>
              <h3 className="font-medium text-text-primary">{selectedCommitment.title}</h3>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div><label className="text-xs text-text-muted uppercase">Description</label><p className="mt-1 text-sm text-text-secondary">{selectedCommitment.description}</p></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><label className="text-xs text-text-muted uppercase">Product</label><p className="mt-1 text-text-primary">{productNames[selectedCommitment.productId]}</p></div>
                <div><label className="text-xs text-text-muted uppercase">Agency</label><p className="mt-1 text-text-primary">{selectedCommitment.agency}</p></div>
                <div><label className="text-xs text-text-muted uppercase">Due Date</label><p className="mt-1 text-text-primary">{formatDate(selectedCommitment.dueDate)}</p></div>
                {selectedCommitment.responsibleParty && <div><label className="text-xs text-text-muted uppercase">Owner</label><p className="mt-1 text-text-primary">{selectedCommitment.responsibleParty}</p></div>}
              </div>
              {selectedCommitment.linkedStudyId && (
                <div><label className="text-xs text-text-muted uppercase">Linked Study</label><p className="mt-1 text-accent-blue">{selectedCommitment.linkedStudyId}</p></div>
              )}
              {selectedCommitment.notes && (
                <div><label className="text-xs text-text-muted uppercase">Notes</label><p className="mt-1 text-sm text-text-secondary">{selectedCommitment.notes}</p></div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DETAIL DRAWER
// ============================================================================

// v0.42.28: Milestone interface for detail drawer
interface SubmissionMilestone {
  id: string;
  name: string;
  targetDate: string;
  status: 'pending' | 'completed' | 'at-risk';
  type?: string;
  description?: string;
}

function SubmissionDetailDrawer({ submission, onClose, highlightMilestoneId }: { submission: RegulatorySubmission; onClose: () => void; highlightMilestoneId?: string }) {
  const product = getProduct(submission.productId);
  const config = STATUS_CONFIG[submission.status] ?? { icon: AlertCircle, color: 'text-text-muted', bg: 'bg-surface-card', label: submission.status ?? 'Unknown' };
  const Icon = config.icon;
  const modulesComplete = submission.modulesComplete ?? submission.modules.filter(m => m.status === 'complete').length;
  const modulesTotal = submission.modulesTotal ?? submission.modules.length;
  const progress = modulesTotal > 0 ? Math.round((modulesComplete / modulesTotal) * 100) : 0;
  const setActiveModule = useAppStore(s => s.setActiveModule);
  
  // Calculate milestone status helpers
  const getMilestoneStatus = (milestone: SubmissionMilestone) => {
    if (milestone.status === 'completed') return { color: 'text-green-400', bg: 'bg-green-500/10', icon: CheckCircle2 };
    if (milestone.status === 'at-risk') return { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle };
    const daysUntil = Math.ceil((new Date(milestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) return { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertCircle };
    if (daysUntil <= 7) return { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Clock };
    return { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Calendar };
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-surface-elevated h-full overflow-auto border-l border-border" onClick={e => e.stopPropagation()}>
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">Submission Details</h2>
            <button onClick={onClose} className="p-1 hover:bg-surface-card rounded"><XCircle className="w-5 h-5 text-text-muted" /></button>
          </div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config?.bg ?? ''}`}><Icon className={`w-5 h-5 ${config?.color ?? ''}`} /></div>
            <div>
              <div className="flex items-center gap-2">
                <TypeBadge type={submission.submissionType} />
                <span className="text-sm text-text-muted">{REGION_FLAGS[submission.region]} {submission.region}</span>
              </div>
              <h3 className="font-medium text-text-primary">{product?.brandName || product?.name}</h3>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div><label className="text-xs text-text-muted uppercase">Status</label><div className="mt-1"><StatusBadge status={submission.status} /></div></div>
            <div><label className="text-xs text-text-muted uppercase">Agency</label><p className="mt-1 text-text-primary">{submission.agency}</p></div>
            <div><label className="text-xs text-text-muted uppercase">Target Date</label><p className="mt-1 text-text-primary">{formatDate(submission.targetDate)}</p></div>
            <div><label className="text-xs text-text-muted uppercase">Progress</label><p className="mt-1 text-text-primary">{progress}%</p></div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">{modulesComplete} of {modulesTotal} modules</span>
            </div>
            <div className="h-2 bg-surface rounded-full overflow-hidden">
              <div className={`h-full ${progress >= 70 ? 'bg-green-500' : progress >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
          
          {/* Milestones Section */}
          {submission.milestones && submission.milestones.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h4 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-amber-400" />
                Milestones ({submission.milestones.length})
              </h4>
              <div className="space-y-2">
                {(submission.milestones as SubmissionMilestone[]).map((milestone: SubmissionMilestone) => {
                  const status = getMilestoneStatus(milestone);
                  const MilestoneIcon = status.icon;
                  const isHighlighted = highlightMilestoneId === milestone.id;
                  const daysUntil = Math.ceil((new Date(milestone.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <div 
                      key={milestone.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isHighlighted 
                          ? 'border-accent-blue bg-accent-blue/10 ring-2 ring-accent-blue/30' 
                          : 'border-border bg-surface-card hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-1.5 rounded ${status?.bg ?? ''}`}>
                          <MilestoneIcon className={`w-4 h-4 ${status?.color ?? ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium text-text-primary truncate">{milestone.name}</span>
                            <span className={`text-xs whitespace-nowrap ${
                              milestone.status === 'completed' ? 'text-green-400' :
                              daysUntil < 0 ? 'text-red-400' :
                              daysUntil <= 7 ? 'text-amber-400' : 'text-text-muted'
                            }`}>
                              {milestone.status === 'completed' ? '✓ Complete' :
                               daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` :
                               daysUntil === 0 ? 'Due today' :
                               `${daysUntil}d remaining`}
                            </span>
                          </div>
                          {milestone.description && (
                            <p className="text-xs text-text-muted mt-1 line-clamp-2">{milestone.description}</p>
                          )}
                          <p className="text-xs text-text-muted mt-1">
                            Target: {new Date(milestone.targetDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          <div className="pt-4 border-t border-border space-y-2">
            <button onClick={() => setActiveModule('publishing')} className="w-full px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />Open in Publishing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SubmissionsHubScreen({ filters }: { filters?: FilterState }) {
  // v0.125.33: Scope context
  const { applicationNumber, scopeSummary, scopeFlag } = useScopeContext('submissions-hub');
  const toast = useToast();

  // v0.125.3: Live DB data with transparent mock fallback
  const { submissions: liveSubmissions, isLive } = useSubmissionsHubData();

  const [activeTab, setActiveTab] = useState<TabId>('submissions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<RegulatorySubmission | null>(null);
  const [highlightMilestoneId, setHighlightMilestoneId] = useState<string | null>(null);
  const [showNewWizard, setShowNewWizard] = useState(false);
  
  // Read from store - allows My Tasks to deep-link to a specific submission/milestone
  const { selectedSubmissionId, selectedMilestoneId, selectSubmission } = useSubmissionsStore();
  
  // Auto-select submission when navigating from My Tasks
  useEffect(() => {
    if (selectedSubmissionId) {
      const submission = liveSubmissions.find(s => s.id === selectedSubmissionId);
      if (submission) {
        setSelectedSubmission(submission);
        setHighlightMilestoneId(selectedMilestoneId || null);
        // Clear the store selection after applying it (one-time deep link)
        selectSubmission(null);
      }
    }
  }, [selectedSubmissionId, selectedMilestoneId, selectSubmission]);

  // v0.125.33: Scope-driven submission selection
  useEffect(() => {
    if (!applicationNumber || liveSubmissions.length === 0) return;
    const match = liveSubmissions.find(s => s.applicationNumber === applicationNumber);
    if (match && match.id !== selectedSubmission?.id) setSelectedSubmission(match);
  }, [applicationNumber, liveSubmissions.length]);
  
  // Clear highlight when closing drawer
  const handleCloseDrawer = () => {
    setSelectedSubmission(null);
    setHighlightMilestoneId(null);
  };
  
  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'submissions', label: 'Submissions', icon: Send },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'registrations', label: 'Registrations', icon: Globe },
    { id: 'commitments', label: 'Commitments', icon: ClipboardList },
    { id: 'lifecycle', label: 'Lifecycle', icon: Archive },
  ];
  
  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        moduleId="submissions"
        title="Submissions Hub"
        subtitle="Plan, track, and manage regulatory submissions across all health authorities"
        icon={<Send className="w-5 h-5" />}
        actions={
          <CapabilityGate moduleId="submissions" capability="submit" inline>
              <button onClick={() => setShowNewWizard(true)} className="px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2">
                <Plus className="w-4 h-4" />New Submission
              </button>
            </CapabilityGate>
        }
      >
        {/* Tabs */}
        <div className="flex items-center gap-3 sm:gap-6 border-b border-border -mb-4 pb-0 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id 
                    ? 'border-accent-blue text-accent-blue' 
                    : 'border-transparent text-text-muted hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
          
          <div className="flex-1" />
          
          {/* Search - only for submissions tab */}
          {activeTab === 'submissions' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-48 pl-9 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg focus:outline-none focus:border-accent-blue"
              />
            </div>
          )}
        </div>
      </ScreenHeader>
      {/* v0.125.33: Scope context banner */}
      <ScopeContextBanner label="Application" scopeFlag={scopeFlag} scopeSummary={scopeSummary} />
      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'submissions' && <SubmissionsTab searchQuery={searchQuery} submissions={liveSubmissions} onViewSubmission={setSelectedSubmission} />}
        {activeTab === 'timeline' && <TimelineTab />}
        {activeTab === 'registrations' && <RegistrationsTab />}
        {activeTab === 'commitments' && <CommitmentsTab />}
        {activeTab === 'lifecycle' && (
          <div className="h-full -m-6">
            <LifecycleManagementPanel />
          </div>
        )}
      </div>
      
      {/* Drawer */}
      {selectedSubmission && (
        <SubmissionDetailDrawer 
          submission={selectedSubmission} 
          onClose={handleCloseDrawer}
          highlightMilestoneId={highlightMilestoneId || undefined}
        />
      )}
      
      {/* New Wizard */}
      <NewSubmissionWizard isOpen={showNewWizard} onClose={() => setShowNewWizard(false)} onComplete={data => { setShowNewWizard(false); toast.success(`Created ${data.submissionType} submission`); }} />
    </div>
  );
}

export default SubmissionsHubScreen;
