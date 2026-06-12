

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  Calendar,
  User,
  Building,
  Tag,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Shield,
  Monitor,
  Users,
  FlaskConical,
  Factory,
  Truck,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  ExternalLink,
  History,
  GraduationCap,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  SOPDocument,
  SOPCategory,
  SOPStatus,
  SOPFilter,
  SOPSort,
  SOP_CATEGORIES,
  SOPCategoryInfo,
  TrainingAssignment,
  getStatusColor,
  getStatusLabel,
  isReviewOverdue,
  calculateTrainingCompliance,
} from '@/types/sop';
import {
  SOPLibraryService,
  getSOPLibraryService,
  SOPLibraryStats,
} from '@/services/sop-library-service';

// ============================================================================
// TYPES
// ============================================================================

interface SOPLibraryPanelProps {
  /** Initial category filter */
  initialCategory?: SOPCategory;
  /** Called when SOP is selected */
  onSOPSelect?: (sop: SOPDocument) => void;
  /** Called when SOP is downloaded */
  onDownload?: (sop: SOPDocument) => void;
  /** Read-only mode */
  readOnly?: boolean;
}

type ViewMode = 'grid' | 'list';
type TabView = 'library' | 'pending' | 'training' | 'stats';

// ============================================================================
// ICON MAPPING
// ============================================================================

const CATEGORY_ICONS: Record<SOPCategory, React.ElementType> = {
  QS: Shield,
  CS: Monitor,
  GCP: Users,
  GVP: AlertTriangle,
  GLP: FlaskConical,
  GMP: Factory,
  GDP: Truck,
  REG: FileText,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: SOPStatus }) {
  const color = getStatusColor(status);
  const label = getStatusLabel(status);
  
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
}

function CategoryBadge({ category }: { category: SOPCategory }) {
  const info = SOP_CATEGORIES[category];
  const Icon = CATEGORY_ICONS[category];
  
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: `${info?.color ?? ''}20`, color: info.color }}
    >
      <Icon className="w-3 h-3" />
      {category}
    </span>
  );
}

function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  color = 'blue',
  alert = false,
}: { 
  title: string; 
  value: number; 
  subtitle?: string;
  icon: React.ElementType; 
  color?: string;
  alert?: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className={`bg-white rounded-lg border p-4 ${alert ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className={`text-2xl font-bold ${alert ? 'text-red-600' : 'text-slate-900'}`}>
            {value}
          </div>
          {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ 
  info, 
  count, 
  onClick,
  isSelected,
}: { 
  info: SOPCategoryInfo; 
  count: number; 
  onClick: () => void;
  isSelected: boolean;
}) {
  const Icon = CATEGORY_ICONS[info.id];
  
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border-2 transition-all hover:shadow-md ${
        isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${info?.color ?? ''}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: info.color }} />
        </div>
        <div>
          <div className="font-semibold text-slate-900">{info.id}</div>
          <div className="text-xs text-slate-500">{count} SOPs</div>
        </div>
      </div>
      <div className="text-sm text-slate-600">{info.name}</div>
    </button>
  );
}

function SOPGridCard({ 
  sop, 
  onClick,
  onDownload,
}: { 
  sop: SOPDocument; 
  onClick: () => void;
  onDownload?: () => void;
}) {
  const isOverdue = isReviewOverdue(sop);
  const Icon = CATEGORY_ICONS[sop.category];
  const catInfo = SOP_CATEGORIES[sop.category];

  return (
    <div 
      className={`bg-white rounded-lg border p-4 hover:shadow-md transition-shadow cursor-pointer ${
        isOverdue ? 'border-red-200' : 'border-slate-200'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded"
            style={{ backgroundColor: `${catInfo?.color ?? ''}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: catInfo.color }} />
          </div>
          <span className="font-mono text-sm font-medium text-slate-700">{sop.sopNumber}</span>
        </div>
        <StatusBadge status={sop.status} />
      </div>
      
      <h3 className="font-medium text-slate-900 mb-2 line-clamp-2">{sop.title}</h3>
      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{sop.description}</p>
      
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>v{sop.version}</span>
        {sop.effectiveDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {sop.effectiveDate.toLocaleDateString()}
          </span>
        )}
      </div>

      {isOverdue && (
        <div className="mt-3 flex items-center gap-1 text-xs text-red-600">
          <AlertCircle className="w-3 h-3" />
          Review overdue
        </div>
      )}

      {sop.trainingRequired && (
        <div className="mt-2 flex items-center gap-1 text-xs text-purple-600">
          <GraduationCap className="w-3 h-3" />
          Training required
        </div>
      )}
    </div>
  );
}

function SOPListRow({ 
  sop, 
  onClick,
}: { 
  sop: SOPDocument; 
  onClick: () => void;
}) {
  const isOverdue = isReviewOverdue(sop);
  const catInfo = SOP_CATEGORIES[sop.category];

  return (
    <tr 
      className={`hover:bg-slate-50 cursor-pointer ${isOverdue ? 'bg-red-50' : ''}`}
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <CategoryBadge category={sop.category} />
          <span className="font-mono text-sm font-medium">{sop.sopNumber}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-slate-900">{sop.title}</div>
        <div className="text-sm text-slate-500 truncate max-w-md">{sop.description}</div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm">v{sop.version}</span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={sop.status} />
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {sop.effectiveDate?.toLocaleDateString() || '-'}
      </td>
      <td className="px-4 py-3 text-sm text-slate-500">
        {sop.reviewDueDate?.toLocaleDateString() || '-'}
        {isOverdue && <AlertCircle className="w-3 h-3 text-red-500 inline ml-1" />}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {sop.trainingRequired && <GraduationCap className="w-4 h-4 text-purple-500" />}
        </div>
      </td>
    </tr>
  );
}

function SOPDetailPanel({ 
  sop, 
  onClose,
  onDownload,
}: { 
  sop: SOPDocument; 
  onClose: () => void;
  onDownload?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'training'>('details');
  const catInfo = SOP_CATEGORIES[sop.category];
  const Icon = CATEGORY_ICONS[sop.category];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div 
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${catInfo?.color ?? ''}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: catInfo.color }} />
              </div>
              <span className="font-mono text-lg font-bold text-slate-700">{sop.sopNumber}</span>
              <StatusBadge status={sop.status} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">{sop.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200">
          <nav className="flex gap-6">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'history', label: 'Version History', icon: History },
              { id: 'training', label: 'Training', icon: GraduationCap },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Description</h3>
                <p className="text-slate-700">{sop.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Category</h3>
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={sop.category} />
                    <span className="text-slate-700">{catInfo.name}</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Version</h3>
                  <p className="text-slate-700">{sop.version}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Department</h3>
                  <p className="text-slate-700">{sop.department}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Owner</h3>
                  <p className="text-slate-700">{sop.owner}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Effective Date</h3>
                  <p className="text-slate-700">{sop.effectiveDate?.toLocaleDateString() || '-'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-2">Review Due</h3>
                  <p className={`${isReviewOverdue(sop) ? 'text-red-600 font-medium' : 'text-slate-700'}`}>
                    {sop.reviewDueDate?.toLocaleDateString() || '-'}
                    {isReviewOverdue(sop) && ' (Overdue)'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {sop.keywords.map(kw => (
                    <span key={kw} className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-sm">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-slate-500 mb-2">Applicable Regulations</h3>
                <div className="flex flex-wrap gap-2">
                  {catInfo.regulations.map(reg => (
                    <span key={reg} className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-sm">
                      {reg}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {sop.versionHistory.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No version history available</p>
              ) : (
                sop.versionHistory.map((ver, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Version {ver.version}</span>
                      <span className="text-sm text-slate-500">
                        {ver.effectiveDate.toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mb-2">{ver.reason}</p>
                    <p className="text-sm text-slate-500">{ver.changes}</p>
                    <div className="mt-2 text-xs text-slate-400">
                      Author: {ver.author} | Approved by: {ver.approvedBy}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'training' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-sm font-medium ${sop.trainingRequired ? 'text-purple-600' : 'text-slate-500'}`}>
                    {sop.trainingRequired ? 'Training Required' : 'Training Not Required'}
                  </span>
                </div>
                {sop.trainingAssignments && sop.trainingAssignments.length > 0 && (
                  <span className="text-sm text-slate-500">
                    Compliance: {calculateTrainingCompliance(sop.trainingAssignments)}%
                  </span>
                )}
              </div>

              {(!sop.trainingAssignments || sop.trainingAssignments.length === 0) ? (
                <p className="text-slate-500 text-center py-8">No training assignments</p>
              ) : (
                <div className="space-y-2">
                  {sop.trainingAssignments.map(assignment => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <span className="font-medium">{assignment.userName}</span>
                        <span className="text-sm text-slate-500 ml-2">
                          Due: {assignment.dueDate.toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`text-sm font-medium ${
                        assignment.status === 'completed' ? 'text-green-600' :
                        assignment.status === 'overdue' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Close
          </button>
          {onDownload && (
            <button
              onClick={() => onDownload()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              Download SOP
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function SOPLibraryPanel({
  initialCategory,
  onSOPSelect,
  onDownload,
  readOnly = false,
}: SOPLibraryPanelProps) {
  const service = useMemo(() => getSOPLibraryService(), []);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SOPCategory | null>(initialCategory || null);
  const [selectedStatus, setSelectedStatus] = useState<SOPStatus | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabView>('library');
  const [sortConfig, setSortConfig] = useState<SOPSort>({ field: 'sopNumber', direction: 'asc' });
  const [selectedSOP, setSelectedSOP] = useState<SOPDocument | null>(null);

  // Get data
  const stats = useMemo(() => service.getStats(), [service]);
  const categoryStats = useMemo(() => service.getCategoryStats(), [service]);

  // Filter and sort SOPs
  const filteredSOPs = useMemo(() => {
    let sops = service.getAll();

    // Search
    if (searchQuery) {
      sops = service.search(searchQuery);
    }

    // Category filter
    if (selectedCategory) {
      sops = sops.filter(s => s.category === selectedCategory);
    }

    // Status filter
    if (selectedStatus) {
      sops = sops.filter(s => s.status === selectedStatus);
    }

    // Sort
    return service.sort(sops, sortConfig);
  }, [service, searchQuery, selectedCategory, selectedStatus, sortConfig]);

  // Pending review SOPs
  const pendingSOPs = useMemo(() => {
    return [...service.getPendingReview(), ...service.getOverdueReview()];
  }, [service]);

  // Training data
  const overdueTraining = useMemo(() => service.getOverdueTraining(), [service]);

  const handleSOPClick = useCallback((sop: SOPDocument) => {
    setSelectedSOP(sop);
    onSOPSelect?.(sop);
  }, [onSOPSelect]);

  const toggleSort = (field: SOPSort['field']) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            SOP Library
          </h2>
          <p className="text-slate-500 mt-1">
            {stats.total} Standard Operating Procedures across {Object.keys(SOP_CATEGORIES).length} categories
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total SOPs"
          value={stats.total}
          subtitle="Active procedures"
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="Effective"
          value={stats.byStatus.effective}
          subtitle="Current versions"
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          title="Pending Review"
          value={stats.pendingReview + stats.overdueReview}
          subtitle={`${stats.overdueReview} overdue`}
          icon={Clock}
          color={stats.overdueReview > 0 ? 'red' : 'amber'}
          alert={stats.overdueReview > 0}
        />
        <StatsCard
          title="Training Overdue"
          value={stats.trainingOverdue}
          icon={GraduationCap}
          color={stats.trainingOverdue > 0 ? 'red' : 'purple'}
          alert={stats.trainingOverdue > 0}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { id: 'library', label: 'Library', icon: BookOpen, count: stats.total },
            { id: 'pending', label: 'Pending Review', icon: Clock, count: pendingSOPs.length },
            { id: 'training', label: 'Training', icon: GraduationCap, count: overdueTraining.length },
            { id: 'stats', label: 'Statistics', icon: LayoutGrid },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabView)}
              className={`flex items-center gap-2 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.id ? 'bg-blue-100' : 'bg-slate-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Library Tab */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Category Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {Object.values(SOP_CATEGORIES).map(cat => (
              <CategoryCard
                key={cat.id}
                info={cat}
                count={categoryStats[cat.id]}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                isSelected={selectedCategory === cat.id}
              />
            ))}
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search SOPs by number, title, or keyword..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedStatus || ''}
              onChange={e => setSelectedStatus(e.target.value as SOPStatus || null)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">All Statuses</option>
              <option value="effective">Effective</option>
              <option value="draft">Draft</option>
              <option value="in_review">In Review</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="superseded">Superseded</option>
              <option value="retired">Retired</option>
            </select>

            <div className="flex items-center gap-1 border border-slate-300 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100' : ''}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100' : ''}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Showing {filteredSOPs.length} of {stats.total} SOPs
              {selectedCategory && ` in ${SOP_CATEGORIES[selectedCategory].name}`}
            </span>
            {(selectedCategory || selectedStatus || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory(null);
                  setSelectedStatus(null);
                  setSearchQuery('');
                }}
                className="text-blue-600 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* SOP List */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredSOPs.map(sop => (
                <SOPGridCard
                  key={sop.id}
                  sop={sop}
                  onClick={() => handleSOPClick(sop)}
                  onDownload={onDownload ? () => onDownload(sop) : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      <button onClick={() => toggleSort('sopNumber')} className="flex items-center gap-1">
                        SOP #
                        {sortConfig.field === 'sopNumber' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                      <button onClick={() => toggleSort('title')} className="flex items-center gap-1">
                        Title
                        {sortConfig.field === 'title' && (
                          sortConfig.direction === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Version</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Effective</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Review Due</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Training</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSOPs.map(sop => (
                    <SOPListRow
                      key={sop.id}
                      sop={sop}
                      onClick={() => handleSOPClick(sop)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pending Review Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingSOPs.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No SOPs pending review</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingSOPs.map(sop => (
                <SOPGridCard
                  key={sop.id}
                  sop={sop}
                  onClick={() => handleSOPClick(sop)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Training Tab */}
      {activeTab === 'training' && (
        <div className="space-y-4">
          {overdueTraining.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
              <p>No overdue training assignments</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-200">
              {overdueTraining.map(({ sop, assignment }) => (
                <div key={assignment.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <CategoryBadge category={sop.category} />
                      <span className="font-mono text-sm">{sop.sopNumber}</span>
                      <span className="font-medium">{sop.title}</span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {assignment.userName} • Due: {assignment.dueDate.toLocaleDateString()}
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-medium">
                    Overdue
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">SOPs by Category</h3>
            <div className="space-y-3">
              {Object.values(SOP_CATEGORIES).map(cat => {
                const count = categoryStats[cat.id];
                const percent = (count / stats.total) * 100;
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <div className="w-20 flex items-center gap-2">
                      <CategoryBadge category={cat.id} />
                    </div>
                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${percent}%`, backgroundColor: cat.color }}
                      />
                    </div>
                    <span className="w-12 text-sm text-slate-600 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">SOPs by Status</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="text-center p-4 bg-slate-50 rounded-lg">
                  <div className="text-2xl font-bold text-slate-900">{count}</div>
                  <StatusBadge status={status as SOPStatus} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detail Panel */}
      {selectedSOP && (
        <SOPDetailPanel
          sop={selectedSOP}
          onClose={() => setSelectedSOP(null)}
          onDownload={onDownload ? () => onDownload(selectedSOP) : undefined}
        />
      )}

      {/* Footer */}
      <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-200">
        Ligature SOP Library v0.25.0 • {stats.total} SOPs from Ligature SOP Suite v1.0
      </div>
    </div>
  );
}

export default SOPLibraryPanel;
