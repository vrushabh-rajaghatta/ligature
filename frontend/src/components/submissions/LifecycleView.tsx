

import { useState, useMemo } from 'react';
import {
  RefreshCw, Flag, GitBranch, Calendar, Clock, CheckCircle, AlertCircle,
  AlertTriangle, ChevronRight, ChevronDown, FileText, Globe, Filter,
  Bell, Eye, Edit3, Plus, ExternalLink, Search, ArrowUpRight
} from 'lucide-react';

type TabType = 'commitments' | 'renewals' | 'variations' | 'psur';

interface Commitment {
  id: string;
  title: string;
  type: 'PMC' | 'PMR' | 'annual-report' | 'psur' | 'stability' | 'other';
  product: string;
  region: string;
  agency: string;
  dueDate: string;
  status: 'pending' | 'in-progress' | 'submitted' | 'complete' | 'overdue';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  submissionId?: string;
  assignee?: string;
  lastUpdate?: string;
}

interface Renewal {
  id: string;
  product: string;
  region: string;
  country: string;
  licenseNumber: string;
  currentExpiry: string;
  renewalDue: string;
  status: 'active' | 'renewal-submitted' | 'pending-review' | 'expired';
  daysUntilExpiry: number;
  documents: string[];
}

interface Variation {
  id: string;
  product: string;
  region: string;
  type: 'Type IA' | 'Type IB' | 'Type II' | 'Extension' | 'sNDA' | 'sBLA';
  title: string;
  submittedDate: string;
  status: 'drafting' | 'submitted' | 'under-review' | 'approved' | 'rejected' | 'withdrawn';
  category: 'CMC' | 'Safety' | 'Efficacy' | 'Labeling' | 'Administrative';
  expectedApproval?: string;
  trackingNumber?: string;
}

// Mock data
const commitments: Commitment[] = [
  {
    id: 'cmt-1',
    title: 'PSUR #12 - Cardivex',
    type: 'psur',
    product: 'Cardivex',
    region: 'EU',
    agency: 'EMA',
    dueDate: '2025-01-15',
    status: 'in-progress',
    priority: 'critical',
    description: 'Periodic Safety Update Report covering period Jul 2024 - Dec 2024',
    assignee: 'Dr. Robert Kim',
    lastUpdate: '2024-12-10',
  },
  {
    id: 'cmt-2',
    title: 'FDA Annual Report - Ligrastinib',
    type: 'annual-report',
    product: 'Ligrastinib',
    region: 'US',
    agency: 'FDA',
    dueDate: '2025-01-31',
    status: 'in-progress',
    priority: 'high',
    description: 'Annual report for IND 123456 covering calendar year 2024',
    assignee: 'Amanda Foster',
    lastUpdate: '2024-12-12',
  },
  {
    id: 'cmt-3',
    title: 'PMC Study Final Report',
    type: 'PMC',
    product: 'Cardivex',
    region: 'US',
    agency: 'FDA',
    dueDate: '2025-02-15',
    status: 'pending',
    priority: 'high',
    description: 'Post-marketing commitment study CDX-PMC-001 final clinical study report',
    assignee: 'Dr. Sarah Chen',
  },
  {
    id: 'cmt-4',
    title: 'Stability Data - 36 Month',
    type: 'stability',
    product: 'Neurozen',
    region: 'Japan',
    agency: 'PMDA',
    dueDate: '2025-03-01',
    status: 'pending',
    priority: 'medium',
    description: '36-month stability data submission for drug product',
    assignee: 'Lisa Thompson',
  },
  {
    id: 'cmt-5',
    title: 'REMS Assessment',
    type: 'PMR',
    product: 'Cardivex',
    region: 'US',
    agency: 'FDA',
    dueDate: '2025-04-30',
    status: 'pending',
    priority: 'medium',
    description: 'Risk Evaluation and Mitigation Strategy assessment report',
    assignee: 'David Kim',
  },
  {
    id: 'cmt-6',
    title: 'DSUR - Ligrastinib',
    type: 'psur',
    product: 'Ligrastinib',
    region: 'Global',
    agency: 'Multiple',
    dueDate: '2025-02-28',
    status: 'in-progress',
    priority: 'high',
    description: 'Development Safety Update Report for ongoing clinical trials',
    assignee: 'Dr. Robert Kim',
    lastUpdate: '2024-12-08',
  },
];

const renewals: Renewal[] = [
  {
    id: 'ren-1',
    product: 'Cardivex',
    region: 'EU',
    country: 'EU (Centralized)',
    licenseNumber: 'EU/1/20/1234',
    currentExpiry: '2025-06-30',
    renewalDue: '2025-03-31',
    status: 'active',
    daysUntilExpiry: 197,
    documents: ['Quality dossier update', 'Safety update', 'Efficacy overview'],
  },
  {
    id: 'ren-2',
    product: 'Cardivex',
    region: 'Japan',
    country: 'Japan',
    licenseNumber: 'JP-2021-0456',
    currentExpiry: '2025-09-15',
    renewalDue: '2025-06-15',
    status: 'active',
    daysUntilExpiry: 274,
    documents: ['Re-examination report', 'Updated CTD'],
  },
  {
    id: 'ren-3',
    product: 'Neurozen',
    region: 'Canada',
    country: 'Canada',
    licenseNumber: 'CA-DIN-12345678',
    currentExpiry: '2025-04-01',
    renewalDue: '2025-01-01',
    status: 'renewal-submitted',
    daysUntilExpiry: 107,
    documents: ['Annual Drug Notification'],
  },
  {
    id: 'ren-4',
    product: 'Cardivex',
    region: 'Brazil',
    country: 'Brazil',
    licenseNumber: 'BR-ANVISA-2022-789',
    currentExpiry: '2025-12-31',
    renewalDue: '2025-06-30',
    status: 'active',
    daysUntilExpiry: 381,
    documents: ['Renovation request', 'GMP certificate', 'Updated leaflet'],
  },
];

const variations: Variation[] = [
  {
    id: 'var-1',
    product: 'Cardivex',
    region: 'EU',
    type: 'Type II',
    title: 'New indication: Heart failure with preserved EF',
    submittedDate: '2024-10-15',
    status: 'under-review',
    category: 'Efficacy',
    expectedApproval: '2025-04-15',
    trackingNumber: 'EU-VAR-2024-001',
  },
  {
    id: 'var-2',
    product: 'Cardivex',
    region: 'US',
    type: 'sNDA',
    title: 'New indication: Heart failure with preserved EF',
    submittedDate: '2024-11-01',
    status: 'under-review',
    category: 'Efficacy',
    expectedApproval: '2025-05-01',
    trackingNumber: 'sNDA-2024-0123',
  },
  {
    id: 'var-3',
    product: 'Cardivex',
    region: 'EU',
    type: 'Type IB',
    title: 'Manufacturing site addition - Site B',
    submittedDate: '2024-12-01',
    status: 'submitted',
    category: 'CMC',
    trackingNumber: 'EU-VAR-2024-002',
  },
  {
    id: 'var-4',
    product: 'Neurozen',
    region: 'US',
    type: 'Type IA',
    title: 'Specification update - Dissolution method',
    submittedDate: '2024-11-15',
    status: 'approved',
    category: 'CMC',
    trackingNumber: 'CBE-2024-0456',
  },
  {
    id: 'var-5',
    product: 'Cardivex',
    region: 'Japan',
    type: 'Type II',
    title: 'Pediatric indication extension',
    submittedDate: '2024-09-01',
    status: 'under-review',
    category: 'Efficacy',
    expectedApproval: '2025-03-01',
    trackingNumber: 'JP-PART-2024-001',
  },
  {
    id: 'var-6',
    product: 'Cardivex',
    region: 'EU',
    type: 'Type II',
    title: 'Safety labeling update - Renal impairment',
    submittedDate: '2024-08-15',
    status: 'approved',
    category: 'Safety',
    trackingNumber: 'EU-VAR-2024-003',
  },
];

const statusColors: Record<string, string> = {
  'pending': 'bg-slate-500/20 text-slate-400',
  'in-progress': 'bg-accent-blue/20 text-accent-blue',
  'submitted': 'bg-accent-purple/20 text-accent-purple',
  'complete': 'bg-accent-green/20 text-accent-green',
  'overdue': 'bg-accent-red/20 text-accent-red',
  'active': 'bg-accent-green/20 text-accent-green',
  'renewal-submitted': 'bg-accent-purple/20 text-accent-purple',
  'pending-review': 'bg-amber-500/20 text-amber-400',
  'expired': 'bg-accent-red/20 text-accent-red',
  'drafting': 'bg-slate-500/20 text-slate-400',
  'under-review': 'bg-amber-500/20 text-amber-400',
  'approved': 'bg-accent-green/20 text-accent-green',
  'rejected': 'bg-accent-red/20 text-accent-red',
  'withdrawn': 'bg-slate-500/20 text-slate-400',
};

const priorityColors: Record<string, string> = {
  'critical': 'bg-accent-red/20 text-accent-red border-accent-red/30',
  'high': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'medium': 'bg-accent-blue/20 text-accent-blue border-accent-blue/30',
  'low': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export function LifecycleView() {
  const [activeTab, setActiveTab] = useState<TabType>('commitments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [expandedCommitments, setExpandedCommitments] = useState<Set<string>>(new Set());
  
  const products = useMemo(() => {
    const all = new Set<string>();
    commitments.forEach(c => all.add(c.product));
    renewals.forEach(r => all.add(r.product));
    variations.forEach(v => all.add(v.product));
    return Array.from(all);
  }, []);
  
  const filteredCommitments = useMemo(() => {
    return commitments.filter(c => {
      if (selectedProduct !== 'all' && c.product !== selectedProduct) return false;
      if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [selectedProduct, searchQuery]);
  
  const filteredRenewals = useMemo(() => {
    return renewals.filter(r => {
      if (selectedProduct !== 'all' && r.product !== selectedProduct) return false;
      if (searchQuery && !r.product.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [selectedProduct, searchQuery]);
  
  const filteredVariations = useMemo(() => {
    return variations.filter(v => {
      if (selectedProduct !== 'all' && v.product !== selectedProduct) return false;
      if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [selectedProduct, searchQuery]);
  
  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    return {
      totalCommitments: commitments.length,
      dueIn30Days: commitments.filter(c => new Date(c.dueDate) <= in30Days).length,
      pendingRenewals: renewals.filter(r => r.status === 'active').length,
      activeVariations: variations.filter(v => ['submitted', 'under-review'].includes(v.status)).length,
      approvedVariations: variations.filter(v => v.status === 'approved').length,
    };
  }, []);
  
  const toggleCommitment = (id: string) => {
    const next = new Set(expandedCommitments);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedCommitments(next);
  };
  
  const getDaysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Lifecycle Management</h2>
            <p className="text-sm text-text-muted">Post-approval commitments, renewals, and variations</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-3 py-2 text-sm bg-surface-card border border-border rounded-lg w-48"
              />
            </div>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-2 text-sm bg-surface-card border border-border rounded-lg"
            >
              <option value="all">All Products</option>
              {products.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="bg-surface-elevated rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Flag className="w-4 h-4 text-amber-400" />
              <span className="text-2xl font-bold text-text-primary">{stats.totalCommitments}</span>
            </div>
            <div className="text-xs text-text-muted">Active Commitments</div>
            {stats.dueIn30Days > 0 && (
              <div className="text-xs text-amber-400 mt-1">{stats.dueIn30Days} due in 30 days</div>
            )}
          </div>
          <div className="bg-surface-elevated rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-4 h-4 text-accent-blue" />
              <span className="text-2xl font-bold text-text-primary">{stats.pendingRenewals}</span>
            </div>
            <div className="text-xs text-text-muted">Pending Renewals</div>
          </div>
          <div className="bg-surface-elevated rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <GitBranch className="w-4 h-4 text-accent-purple" />
              <span className="text-2xl font-bold text-text-primary">{stats.activeVariations}</span>
            </div>
            <div className="text-xs text-text-muted">Active Variations</div>
          </div>
          <div className="bg-surface-elevated rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-2xl font-bold text-text-primary">{stats.approvedVariations}</span>
            </div>
            <div className="text-xs text-text-muted">Approved This Year</div>
          </div>
          <div className="bg-surface-elevated rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-accent-red" />
              <span className="text-2xl font-bold text-text-primary">2</span>
            </div>
            <div className="text-xs text-text-muted">Action Required</div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('commitments')}
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'commitments'
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-surface-card text-text-secondary hover:text-text-primary'
            }`}
          >
            <Flag className="w-4 h-4" />
            Commitments ({filteredCommitments.length})
          </button>
          <button
            onClick={() => setActiveTab('renewals')}
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'renewals'
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-surface-card text-text-secondary hover:text-text-primary'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Renewals ({filteredRenewals.length})
          </button>
          <button
            onClick={() => setActiveTab('variations')}
            className={`px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors ${
              activeTab === 'variations'
                ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                : 'bg-surface-card text-text-secondary hover:text-text-primary'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Variations ({filteredVariations.length})
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'commitments' && (
          <div className="space-y-3">
            {filteredCommitments.map(commitment => {
              const daysUntil = getDaysUntil(commitment.dueDate);
              const isExpanded = expandedCommitments.has(commitment.id);
              const isUrgent = daysUntil <= 30;
              
              return (
                <div 
                  key={commitment.id}
                  className={`bg-surface-elevated rounded-xl border transition-colors ${
                    isUrgent ? 'border-amber-500/50' : 'border-border'
                  }`}
                >
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => toggleCommitment(commitment.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <button className="mt-1">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-text-muted" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-text-muted" />
                          )}
                        </button>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-text-primary">{commitment.title}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded border ${priorityColors[commitment.priority]}`}>
                              {commitment.priority}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-text-muted">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {commitment.product}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="w-3 h-3" />
                              {commitment.region} • {commitment.agency}
                            </span>
                            <span className={`flex items-center gap-1 ${isUrgent ? 'text-amber-400' : ''}`}>
                              <Calendar className="w-3 h-3" />
                              Due: {commitment.dueDate}
                              {isUrgent && ` (${daysUntil} days)`}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${statusColors[commitment.status]}`}>
                          {commitment.status.replace('-', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-border mt-2">
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <div className="text-xs text-text-muted mb-1">Description</div>
                          <div className="text-sm text-text-secondary">{commitment.description}</div>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs text-text-muted mb-1">Assignee</div>
                            <div className="text-sm text-text-primary">{commitment.assignee || 'Unassigned'}</div>
                          </div>
                          {commitment.lastUpdate && (
                            <div>
                              <div className="text-xs text-text-muted mb-1">Last Update</div>
                              <div className="text-sm text-text-secondary">{commitment.lastUpdate}</div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <button className="px-3 py-1.5 text-xs bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          View Details
                        </button>
                        <button className="px-3 py-1.5 text-xs bg-surface-card text-text-secondary rounded hover:bg-surface flex items-center gap-1">
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                        <button className="px-3 py-1.5 text-xs bg-surface-card text-text-secondary rounded hover:bg-surface flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Open in Authoring
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {activeTab === 'renewals' && (
          <div className="space-y-3">
            {filteredRenewals.map(renewal => {
              const isUrgent = renewal.daysUntilExpiry <= 90;
              
              return (
                <div 
                  key={renewal.id}
                  className={`bg-surface-elevated rounded-xl p-5 border transition-colors ${
                    isUrgent ? 'border-amber-500/50' : 'border-border'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-text-primary">{renewal.product}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[renewal.status]}`}>
                          {renewal.status.replace('-', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-text-muted">
                        {renewal.country} • License: {renewal.licenseNumber}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isUrgent ? 'text-amber-400' : 'text-text-primary'}`}>
                        {renewal.daysUntilExpiry} days
                      </div>
                      <div className="text-xs text-text-muted">until expiry</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-text-muted mb-1">Current Expiry</div>
                      <div className="text-sm text-text-primary">{renewal.currentExpiry}</div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Renewal Due</div>
                      <div className={`text-sm ${isUrgent ? 'text-amber-400 font-medium' : 'text-text-primary'}`}>
                        {renewal.renewalDue}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-text-muted mb-1">Required Documents</div>
                      <div className="text-sm text-text-secondary">{renewal.documents.length} items</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                      <span>Time Remaining</span>
                      <span>{Math.round((renewal.daysUntilExpiry / 365) * 100)}%</span>
                    </div>
                    <div className="h-2 bg-surface-card rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${isUrgent ? 'bg-amber-500' : 'bg-accent-green'}`}
                        style={{ width: `${Math.min(100, (renewal.daysUntilExpiry / 365) * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-xs bg-accent-blue/20 text-accent-blue rounded hover:bg-accent-blue/30 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      Start Renewal
                    </button>
                    <button className="px-3 py-1.5 text-xs bg-surface-card text-text-secondary rounded hover:bg-surface flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      View Documents
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activeTab === 'variations' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Variation</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Product</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Region</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Type</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Category</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Status</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Submitted</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted">Expected</th>
                  <th className="text-left p-3 text-xs font-medium text-text-muted"></th>
                </tr>
              </thead>
              <tbody>
                {filteredVariations.map(variation => (
                  <tr key={variation.id} className="border-b border-border hover:bg-surface transition-colors">
                    <td className="p-3">
                      <div className="text-sm text-text-primary max-w-xs truncate" title={variation.title}>
                        {variation.title}
                      </div>
                      <div className="text-xs text-text-muted">{variation.trackingNumber}</div>
                    </td>
                    <td className="p-3 text-sm text-text-secondary">{variation.product}</td>
                    <td className="p-3 text-sm text-text-secondary">{variation.region}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded bg-surface-card text-text-secondary">
                        {variation.type}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-text-secondary">{variation.category}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[variation.status]}`}>
                        {variation.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-text-muted">{variation.submittedDate}</td>
                    <td className="p-3 text-sm text-text-muted">{variation.expectedApproval || '-'}</td>
                    <td className="p-3">
                      <button className="p-1 hover:bg-surface-card rounded">
                        <ArrowUpRight className="w-4 h-4 text-text-muted" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
