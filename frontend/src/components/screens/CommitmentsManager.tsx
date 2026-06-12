
// ============================================================================
// CommitmentsManager - v0.33.0
// Regulatory commitments tracking (PMC/PMR/RMP)
// ============================================================================


import React, { useState, useMemo } from 'react';
import {
  ClipboardList, CheckCircle2, Clock, AlertCircle, AlertTriangle,
  Calendar, FileText, Building2, ChevronDown, ChevronRight,
  Search, Filter, Download, Plus, Edit2, Eye, Link2,
  User, Flag, ArrowUpRight, XCircle, Send, RotateCcw
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { CapabilityGate } from '@/components/ui/CapabilityGate';
import { RegulatoryCommitment } from '@/types/core';
import { useDeadClick } from '@/hooks/useDeadClick';
import {
  regulatoryCommitments,
  productNames,
  productColors,
  getCommitmentsByProduct,
  getOverdueCommitments,
  getUpcomingCommitments,
} from '@/data/regulatory-data';

// ============================================================================
// TYPES
// ============================================================================

type ViewMode = 'list' | 'kanban' | 'calendar';
type FilterStatus = 'all' | 'Pending' | 'In Progress' | 'Submitted' | 'Fulfilled' | 'Overdue';
type FilterType = 'all' | 'PMC' | 'PMR' | 'RMP-Measure' | 'Condition';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG = {
  Pending: { 
    icon: Clock, 
    color: 'text-slate-400', 
    bg: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
  },
  'In Progress': { 
    icon: RotateCcw, 
    color: 'text-blue-400', 
    bg: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
  },
  Submitted: { 
    icon: Send, 
    color: 'text-purple-400', 
    bg: 'bg-purple-500/20',
    borderColor: 'border-purple-500/30',
  },
  Fulfilled: { 
    icon: CheckCircle2, 
    color: 'text-green-400', 
    bg: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
  },
  Released: { 
    icon: CheckCircle2, 
    color: 'text-emerald-400', 
    bg: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
  },
  Overdue: { 
    icon: AlertCircle, 
    color: 'text-red-400', 
    bg: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
  },
};

const TYPE_CONFIG = {
  PMC: { label: 'PMC', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  PMR: { label: 'PMR', color: 'text-red-400', bg: 'bg-red-500/20' },
  'RMP-Measure': { label: 'RMP', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  Condition: { label: 'Condition', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  Other: { label: 'Other', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

const CATEGORY_COLORS = {
  Clinical: 'text-blue-400',
  CMC: 'text-emerald-400',
  Nonclinical: 'text-purple-400',
  Safety: 'text-red-400',
  Labeling: 'text-amber-400',
  REMS: 'text-orange-400',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: RegulatoryCommitment['status'] }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: RegulatoryCommitment['type'] }) {
  const config = TYPE_CONFIG[type];
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      {config.label}
    </span>
  );
}

function DaysUntilDue({ dueDate, status }: { dueDate: string; status: string }) {
  if (status === 'Fulfilled' || status === 'Released') return null;
  
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  
  if (days < 0) {
    return (
      <span className="text-xs text-red-400 font-medium">
        {Math.abs(days)} days overdue
      </span>
    );
  } else if (days <= 30) {
    return (
      <span className="text-xs text-amber-400 font-medium">
        {days} days remaining
      </span>
    );
  } else if (days <= 90) {
    return (
      <span className="text-xs text-blue-400">
        {days} days remaining
      </span>
    );
  }
  return (
    <span className="text-xs text-text-muted">
      {days} days remaining
    </span>
  );
}

function CommitmentCard({ 
  commitment,
  onView,
}: { 
  commitment: RegulatoryCommitment;
  onView?: () => void;
}) {
  const days = Math.ceil((new Date(commitment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isOverdue = days < 0 && commitment.status !== 'Fulfilled' && commitment.status !== 'Released';
  
  return (
    <div className={`bg-surface-card border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer ${
      isOverdue ? 'border-red-500/50' : 'border-border hover:border-accent-blue/50'
    }`} onClick={onView}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypeBadge type={commitment.type} />
            <span className="text-xs text-text-muted">{commitment.agency}</span>
          </div>
          <h3 className="font-medium text-text-primary text-sm line-clamp-2">{commitment.title}</h3>
        </div>
        <StatusBadge status={isOverdue ? 'Overdue' : commitment.status} />
      </div>
      
      <p className="text-xs text-text-muted line-clamp-2 mb-3">{commitment.description}</p>
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-text-muted">
          <Calendar className="w-3 h-3" />
          <span>{new Date(commitment.dueDate).toLocaleDateString()}</span>
        </div>
        <DaysUntilDue dueDate={commitment.dueDate} status={commitment.status} />
      </div>
      
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-text-muted">{productNames[commitment.productId]}</span>
        {commitment.responsibleParty && (
          <span className="text-xs text-text-muted flex items-center gap-1">
            <User className="w-3 h-3" />
            {commitment.responsibleParty}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ 
  title, 
  status, 
  commitments,
  onViewCommitment,
}: { 
  title: string;
  status: string;
  commitments: RegulatoryCommitment[];
  onViewCommitment: (c: RegulatoryCommitment) => void;
}) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.Pending;
  const Icon = config.icon;
  
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px] bg-surface rounded-lg border border-border">
      <div className={`p-3 border-b ${config.borderColor} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config?.color ?? ''}`} />
          <span className="font-medium text-text-primary text-sm">{title}</span>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
          {commitments.length}
        </span>
      </div>
      <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {commitments.map(c => (
          <CommitmentCard key={c.id} commitment={c} onView={() => onViewCommitment(c)} />
        ))}
        {commitments.length === 0 && (
          <p className="text-center text-text-muted text-xs py-8">No commitments</p>
        )}
      </div>
    </div>
  );
}

function SummaryStats() {
    const { deadClick } = useDeadClick();
  const stats = useMemo(() => {
    const total = regulatoryCommitments.length;
    const overdue = getOverdueCommitments().length;
    const upcoming90 = getUpcomingCommitments(90).length;
    const inProgress = regulatoryCommitments.filter(c => c.status === 'In Progress').length;
    const fulfilled = regulatoryCommitments.filter(c => c.status === 'Fulfilled' || c.status === 'Released').length;
    
    return { total, overdue, upcoming90, inProgress, fulfilled };
  }, []);
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 md:mb-6">
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-4 h-4 text-text-muted" />
          <span className="text-xs text-text-muted">Total</span>
        </div>
        <p className="text-2xl font-semibold text-text-primary">{stats.total}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-text-muted">Overdue</span>
        </div>
        <p className="text-2xl font-semibold text-red-400">{stats.overdue}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-text-muted">Due in 90 Days</span>
        </div>
        <p className="text-2xl font-semibold text-amber-400">{stats.upcoming90}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <RotateCcw className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-text-muted">In Progress</span>
        </div>
        <p className="text-2xl font-semibold text-blue-400">{stats.inProgress}</p>
      </div>
      
      <div className="bg-surface-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          <span className="text-xs text-text-muted">Fulfilled</span>
        </div>
        <p className="text-2xl font-semibold text-green-400">{stats.fulfilled}</p>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CommitmentsManager() {
  const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommitment, setSelectedCommitment] = useState<RegulatoryCommitment | null>(null);
  
  // Filter commitments
  const filteredCommitments = useMemo(() => {
    return regulatoryCommitments.filter(c => {
      // Status filter
      if (statusFilter === 'Overdue') {
        const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (days >= 0 || c.status === 'Fulfilled' || c.status === 'Released') return false;
      } else if (statusFilter !== 'all' && c.status !== statusFilter) {
        return false;
      }
      
      // Type filter
      if (typeFilter !== 'all' && c.type !== typeFilter) return false;
      
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const productName = productNames[c.productId]?.toLowerCase() || '';
        if (!productName.includes(query) && 
            !c.title.toLowerCase().includes(query) &&
            !c.description.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [statusFilter, typeFilter, searchQuery]);
  
  // Group by status for Kanban
  const kanbanGroups = useMemo(() => {
    const groups = {
      Pending: [] as RegulatoryCommitment[],
      'In Progress': [] as RegulatoryCommitment[],
      Submitted: [] as RegulatoryCommitment[],
      Fulfilled: [] as RegulatoryCommitment[],
    };
    
    filteredCommitments.forEach(c => {
      if (c.status === 'Released') {
        groups.Fulfilled.push(c);
      } else if (groups[c.status as keyof typeof groups]) {
        groups[c.status as keyof typeof groups].push(c);
      }
    });
    
    return groups;
  }, [filteredCommitments]);
  
  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        title="Commitments Manager"
        subtitle="Post-marketing commitments, PMCs, PMRs, and regulatory commitment tracking"
        icon={<ClipboardList className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center gap-2" onClick={() => toast.success('Commitment action recorded — stakeholders notified')}>
              <Download className="w-4 h-4" />Export
            </button>
            <CapabilityGate moduleId="regulatory" capability="author" inline>
              <button className="px-3 py-1.5 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center gap-2" onClick={() => toast.success('Commitment action recorded — stakeholders notified')}>
                <Plus className="w-4 h-4" />Add Commitment
              </button>
            </CapabilityGate>
          </div>
        }
      />

      {/* Filter / Search Toolbar */}
      <div className="bg-surface-elevated border-b border-border px-6 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search commitments…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Submitted">Submitted</option>
          <option value="Fulfilled">Fulfilled</option>
          <option value="Overdue">Overdue</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FilterType)}
          className="px-3 py-1.5 text-sm bg-surface-card border border-border rounded-lg text-text-primary focus:outline-none focus:border-teal-500"
        >
          <option value="all">All Types</option>
          <option value="PMC">PMC</option>
          <option value="PMR">PMR</option>
          <option value="RMP-Measure">RMP Measure</option>
          <option value="Condition">Condition</option>
        </select>

        {/* Result count */}
        <span className="text-xs text-text-muted ml-1">
          {filteredCommitments.length} result{filteredCommitments.length !== 1 ? 's' : ''}
        </span>

        {/* View mode toggle */}
        <div className="ml-auto flex items-center gap-1 bg-surface-card border border-border rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'kanban' ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'list' ? 'bg-accent-blue text-white' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            List
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <SummaryStats />
        
        {viewMode === 'kanban' ? (
          /* Kanban View */
          <div className="flex gap-4 overflow-x-auto pb-4">
            <KanbanColumn 
              title="Pending" 
              status="Pending"
              commitments={kanbanGroups.Pending}
              onViewCommitment={setSelectedCommitment}
            />
            <KanbanColumn 
              title="In Progress" 
              status="In Progress"
              commitments={kanbanGroups['In Progress']}
              onViewCommitment={setSelectedCommitment}
            />
            <KanbanColumn 
              title="Submitted" 
              status="Submitted"
              commitments={kanbanGroups.Submitted}
              onViewCommitment={setSelectedCommitment}
            />
            <KanbanColumn 
              title="Fulfilled" 
              status="Fulfilled"
              commitments={kanbanGroups.Fulfilled}
              onViewCommitment={setSelectedCommitment}
            />
          </div>
        ) : (
          /* List View */
          <div className="bg-surface-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface border-b border-border">
                  <th className="p-3 text-left font-medium text-text-primary">Commitment</th>
                  <th className="p-3 text-left font-medium text-text-primary">Product</th>
                  <th className="p-3 text-left font-medium text-text-primary">Type</th>
                  <th className="p-3 text-left font-medium text-text-primary">Agency</th>
                  <th className="p-3 text-left font-medium text-text-primary">Due Date</th>
                  <th className="p-3 text-left font-medium text-text-primary">Status</th>
                  <th className="p-3 text-left font-medium text-text-primary">Owner</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommitments.map((c, idx) => {
                  const days = Math.ceil((new Date(c.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const isOverdue = days < 0 && c.status !== 'Fulfilled' && c.status !== 'Released';
                  
                  return (
                    <tr 
                      key={c.id} 
                      className={`border-b border-border hover:bg-surface cursor-pointer ${idx % 2 === 0 ? '' : 'bg-surface/50'}`}
                      onClick={() => setSelectedCommitment(c)}
                    >
                      <td className="p-3">
                        <div className="max-w-xs">
                          <p className="font-medium text-text-primary truncate">{c.title}</p>
                          <p className="text-xs text-text-muted truncate">{c.description}</p>
                        </div>
                      </td>
                      <td className="p-3 text-text-secondary">{productNames[c.productId]}</td>
                      <td className="p-3"><TypeBadge type={c.type} /></td>
                      <td className="p-3 text-text-secondary">{c.agency}</td>
                      <td className="p-3">
                        <div>
                          <p className="text-text-secondary">{new Date(c.dueDate).toLocaleDateString()}</p>
                          <DaysUntilDue dueDate={c.dueDate} status={c.status} />
                        </div>
                      </td>
                      <td className="p-3"><StatusBadge status={isOverdue ? 'Overdue' : c.status} /></td>
                      <td className="p-3 text-text-secondary">{c.responsibleParty || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredCommitments.length === 0 && (
              <div className="text-center py-12 text-text-muted">
                No commitments match your filters
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Details Drawer */}
      {selectedCommitment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end" onClick={() => setSelectedCommitment(null)}>
          <div 
            className="w-full max-w-lg bg-surface-elevated h-full overflow-auto border-l border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 md:p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-text-primary">Commitment Details</h2>
                <button 
                  onClick={() => setSelectedCommitment(null)}
                  className="p-1 hover:bg-surface-card rounded"
                >
                  <XCircle className="w-5 h-5 text-text-muted" />
                </button>
              </div>
              
              <div className="flex items-center gap-3 mb-3">
                <TypeBadge type={selectedCommitment.type} />
                <StatusBadge status={selectedCommitment.status} />
              </div>
              
              <h3 className="font-medium text-text-primary text-lg">{selectedCommitment.title}</h3>
            </div>
            
            <div className="p-4 md:p-6 space-y-4 md:space-y-6">
              <div>
                <label className="text-xs text-text-muted uppercase tracking-wide">Description</label>
                <p className="mt-1 text-text-secondary text-sm">{selectedCommitment.description}</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Product</label>
                  <p className="mt-1 text-text-primary">{productNames[selectedCommitment.productId]}</p>
                </div>
                
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Agency</label>
                  <p className="mt-1 text-text-primary">{selectedCommitment.agency}</p>
                </div>
                
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Region</label>
                  <p className="mt-1 text-text-primary">{selectedCommitment.region}</p>
                </div>
                
                {selectedCommitment.category && (
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Category</label>
                    <p className={`mt-1 font-medium ${CATEGORY_COLORS[selectedCommitment.category] || 'text-text-primary'}`}>
                      {selectedCommitment.category}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Due Date</label>
                  <p className="mt-1 text-text-primary">
                    {new Date(selectedCommitment.dueDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                  <DaysUntilDue dueDate={selectedCommitment.dueDate} status={selectedCommitment.status} />
                </div>
                
                {selectedCommitment.originalDueDate && selectedCommitment.originalDueDate !== selectedCommitment.dueDate && (
                  <div>
                    <label className="text-xs text-text-muted uppercase tracking-wide">Original Due Date</label>
                    <p className="mt-1 text-text-secondary">
                      {new Date(selectedCommitment.originalDueDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              
              {selectedCommitment.responsibleParty && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Responsible Party</label>
                  <p className="mt-1 text-text-primary flex items-center gap-2">
                    <User className="w-4 h-4 text-text-muted" />
                    {selectedCommitment.responsibleParty}
                  </p>
                </div>
              )}
              
              {selectedCommitment.linkedStudyId && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Linked Study</label>
                  <button className="mt-1 text-accent-blue hover:underline flex items-center gap-1 text-sm" onClick={() => toast.success('Commitment action recorded — stakeholders notified')}>
                    <Link2 className="w-4 h-4" />
                    {selectedCommitment.linkedStudyId}
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              {selectedCommitment.fulfillmentDate && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Fulfillment Date</label>
                  <p className="mt-1 text-green-400">
                    {new Date(selectedCommitment.fulfillmentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
              
              {selectedCommitment.notes && (
                <div>
                  <label className="text-xs text-text-muted uppercase tracking-wide">Notes</label>
                  <p className="mt-1 text-text-secondary text-sm">{selectedCommitment.notes}</p>
                </div>
              )}
              
              <div className="pt-4 border-t border-border space-y-2">
                <button className="w-full px-4 py-2 text-sm bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 flex items-center justify-center gap-2" onClick={() => toast.success('Commitment action recorded — stakeholders notified')}>
                  <Edit2 className="w-4 h-4" />
                  Edit Commitment
                </button>
                <button className="w-full px-4 py-2 text-sm bg-surface-card border border-border rounded-lg hover:bg-surface flex items-center justify-center gap-2" onClick={() => toast.success('Commitment action recorded — stakeholders notified')}>
                  <FileText className="w-4 h-4" />
                  View Related Documents
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CommitmentsManager;
