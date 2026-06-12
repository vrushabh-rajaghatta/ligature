

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Link2,
  Code2,
  TestTube2,
  ClipboardCheck,
  Activity,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import {
  rtmService,
  CreateRequirementRequest,
  CreateDesignRequest,
  CreateTestCaseRequest,
} from '@/services/rtm-service';
import {
  UserRequirement,
  DesignSpecification,
  TestCase,
  TestExecution,
  RTMEntry,
  RTMSummary,
  RequirementCategory,
  RequirementPriority,
  RequirementStatus,
  QualificationPhase,
  GampCategory,
  getStatusColor,
  getPriorityColor,
} from '@/types/compliance-matrix';

// ============================================================================
// TYPES
// ============================================================================

interface RTMPanelProps {
  onRequirementSelect?: (requirement: UserRequirement) => void;
  compact?: boolean;
  showCreateButtons?: boolean;
}

type ViewMode = 'summary' | 'requirements' | 'traceability' | 'gaps';

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_LABELS: Record<RequirementCategory, string> = {
  functional: 'Functional',
  security: 'Security',
  audit_trail: 'Audit Trail',
  electronic_signature: 'E-Signature',
  access_control: 'Access Control',
  data_integrity: 'Data Integrity',
  validation: 'Validation',
  reporting: 'Reporting',
  integration: 'Integration',
  performance: 'Performance',
  usability: 'Usability',
  regulatory: 'Regulatory',
};

const PRIORITY_LABELS: Record<RequirementPriority, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const STATUS_LABELS: Record<RequirementStatus, string> = {
  draft: 'Draft',
  approved: 'Approved',
  implemented: 'Implemented',
  tested: 'Tested',
  validated: 'Validated',
  retired: 'Retired',
};

const PHASE_LABELS: Record<QualificationPhase, string> = {
  IQ: 'Installation Qualification',
  OQ: 'Operational Qualification',
  PQ: 'Performance Qualification',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: RequirementStatus }) {
  const colors: Record<RequirementStatus, string> = {
    draft: 'bg-slate-100 text-slate-700',
    approved: 'bg-blue-100 text-blue-700',
    implemented: 'bg-purple-100 text-purple-700',
    tested: 'bg-amber-100 text-amber-700',
    validated: 'bg-green-100 text-green-700',
    retired: 'bg-gray-100 text-gray-500',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: RequirementPriority }) {
  const colors: Record<RequirementPriority, string> = {
    critical: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-gray-100 text-gray-600',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function PhaseBadge({ phase }: { phase: QualificationPhase }) {
  const colors: Record<QualificationPhase, string> = {
    IQ: 'bg-cyan-100 text-cyan-700',
    OQ: 'bg-indigo-100 text-indigo-700',
    PQ: 'bg-violet-100 text-violet-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[phase]}`}>
      {phase}
    </span>
  );
}

function CoverageBar({ percentage }: { percentage: number }) {
  const getColor = () => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${getColor()}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 w-10 text-right">
        {percentage}%
      </span>
    </div>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  color = 'blue' 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | number; 
  subValue?: string;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          {subValue && (
            <p className="text-xs text-slate-400 mt-0.5">{subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUMMARY VIEW
// ============================================================================

function RTMSummaryView({ summary }: { summary: RTMSummary }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          label="Total Requirements"
          value={summary.total_requirements}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Overall Coverage"
          value={`${summary.overall_coverage_percentage}%`}
          subValue={`${summary.coverage.fully_traced} fully traced`}
          color={summary.overall_coverage_percentage >= 80 ? 'green' : 'amber'}
        />
        <StatCard
          icon={TestTube2}
          label="Test Cases"
          value={summary.test_summary.total_tests}
          subValue={`${summary.test_summary.automated} automated`}
          color="purple"
        />
        <StatCard
          icon={CheckCircle2}
          label="Pass Rate"
          value={`${summary.test_summary.pass_rate}%`}
          subValue={`${summary.test_summary.executions} executions`}
          color={summary.test_summary.pass_rate >= 90 ? 'green' : 'amber'}
        />
      </div>

      {/* Coverage Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Traceability Coverage</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">With Design</span>
            </div>
            <CoverageBar 
              percentage={summary.total_requirements > 0 
                ? Math.round((summary.coverage.with_design / summary.total_requirements) * 100) 
                : 0} 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TestTube2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">With Tests</span>
            </div>
            <CoverageBar 
              percentage={summary.total_requirements > 0 
                ? Math.round((summary.coverage.with_tests / summary.total_requirements) * 100) 
                : 0} 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">With Code</span>
            </div>
            <CoverageBar 
              percentage={summary.total_requirements > 0 
                ? Math.round((summary.coverage.with_code / summary.total_requirements) * 100) 
                : 0} 
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ClipboardCheck className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">With Execution</span>
            </div>
            <CoverageBar 
              percentage={summary.total_requirements > 0 
                ? Math.round((summary.coverage.with_execution / summary.total_requirements) * 100) 
                : 0} 
            />
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* By Priority */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">By Priority</h3>
          <div className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as RequirementPriority[]).map(priority => (
              <div key={priority} className="flex items-center justify-between">
                <PriorityBadge priority={priority} />
                <span className="text-sm font-medium text-slate-600">
                  {summary.by_priority[priority] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">By Status</h3>
          <div className="space-y-2">
            {(['draft', 'approved', 'implemented', 'tested', 'validated'] as RequirementStatus[]).map(status => (
              <div key={status} className="flex items-center justify-between">
                <StatusBadge status={status} />
                <span className="text-sm font-medium text-slate-600">
                  {summary.by_status[status] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* By Category (Top 5) */}
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Top Categories</h3>
          <div className="space-y-2">
            {Object.entries(summary.by_category)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    {CATEGORY_LABELS[category as RequirementCategory]}
                  </span>
                  <span className="text-sm font-medium text-slate-900">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// REQUIREMENTS LIST VIEW
// ============================================================================

interface RequirementsListProps {
  entries: RTMEntry[];
  onSelect?: (requirement: UserRequirement) => void;
  filters: {
    search: string;
    category: RequirementCategory | 'all';
    priority: RequirementPriority | 'all';
    status: RequirementStatus | 'all';
    phase: QualificationPhase | 'all';
  };
  onFiltersChange: (filters: RequirementsListProps['filters']) => void;
}

function RequirementsList({ entries, onSelect, filters, onFiltersChange }: RequirementsListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const req = entry.requirement;
      
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!req.title.toLowerCase().includes(searchLower) &&
            !req.code.toLowerCase().includes(searchLower) &&
            !req.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (filters.category !== 'all' && req.category !== filters.category) return false;
      if (filters.priority !== 'all' && req.priority !== filters.priority) return false;
      if (filters.status !== 'all' && req.status !== filters.status) return false;
      if (filters.phase !== 'all' && req.phase !== filters.phase) return false;
      
      return true;
    });
  }, [entries, filters]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search requirements..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={filters.category}
          onChange={(e) => onFiltersChange({ ...filters, category: e.target.value as RequirementCategory | 'all' })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        
        <select
          value={filters.priority}
          onChange={(e) => onFiltersChange({ ...filters, priority: e.target.value as RequirementPriority | 'all' })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Priorities</option>
          {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        
        <select
          value={filters.phase}
          onChange={(e) => onFiltersChange({ ...filters, phase: e.target.value as QualificationPhase | 'all' })}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Phases</option>
          <option value="IQ">IQ</option>
          <option value="OQ">OQ</option>
          <option value="PQ">PQ</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">
        Showing {filteredEntries.length} of {entries.length} requirements
      </p>

      {/* Requirements List */}
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No requirements match your filters</p>
          </div>
        ) : (
          filteredEntries.map(entry => (
            <RequirementRow
              key={entry.requirement.id}
              entry={entry}
              isExpanded={expandedId === entry.requirement.id}
              onToggle={() => setExpandedId(expandedId === entry.requirement.id ? null : entry.requirement.id)}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface RequirementRowProps {
  entry: RTMEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onSelect?: (requirement: UserRequirement) => void;
}

function RequirementRow({ entry, isExpanded, onToggle, onSelect }: RequirementRowProps) {
  const { requirement, designs, test_cases, code_references, executions, coverage } = entry;

  return (
    <div>
      <div 
        className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
        onClick={onToggle}
      >
        <button className="text-slate-400 hover:text-slate-600">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-medium text-blue-600">{requirement.code}</span>
            <StatusBadge status={requirement.status} />
            <PriorityBadge priority={requirement.priority} />
            <PhaseBadge phase={requirement.phase} />
          </div>
          <h4 className="text-sm font-medium text-slate-900 truncate">{requirement.title}</h4>
          <p className="text-xs text-slate-500 truncate">{requirement.description}</p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1" title="Designs">
            <Code2 className="w-3.5 h-3.5" />
            {designs.length}
          </span>
          <span className="flex items-center gap-1" title="Test Cases">
            <TestTube2 className="w-3.5 h-3.5" />
            {test_cases.length}
          </span>
          <span className="flex items-center gap-1" title="Code References">
            <Link2 className="w-3.5 h-3.5" />
            {code_references.length}
          </span>
          <span className={`flex items-center gap-1 ${executions.some(e => e.result === 'pass') ? 'text-green-600' : executions.some(e => e.result === 'fail') ? 'text-red-600' : 'text-slate-400'}`} title="Executions">
            <ClipboardCheck className="w-3.5 h-3.5" />
            {executions.length}
          </span>
        </div>

        <div className="w-24">
          <CoverageBar percentage={coverage.coverage_percentage} />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 bg-slate-50 border-t border-slate-100">
          <div className="ml-8 space-y-4">
            {/* Acceptance Criteria */}
            {requirement.acceptance_criteria.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Acceptance Criteria</h5>
                <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                  {requirement.acceptance_criteria.map((criteria, idx) => (
                    <li key={idx}>{criteria}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Linked Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Designs */}
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Code2 className="w-3 h-3" /> Design Specifications ({designs.length})
                </h5>
                {designs.length > 0 ? (
                  <ul className="text-sm text-slate-700 space-y-1">
                    {designs.map(d => (
                      <li key={d.id} className="flex items-center gap-2">
                        <span className="font-mono text-xs text-purple-600">{d.code}</span>
                        <span className="truncate">{d.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">No designs linked</p>
                )}
              </div>

              {/* Test Cases */}
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <TestTube2 className="w-3 h-3" /> Test Cases ({test_cases.length})
                </h5>
                {test_cases.length > 0 ? (
                  <ul className="text-sm text-slate-700 space-y-1">
                    {test_cases.map(tc => {
                      const latestExec = executions.find(e => e.test_case_id === tc.id);
                      return (
                        <li key={tc.id} className="flex items-center gap-2">
                          <span className="font-mono text-xs text-amber-600">{tc.code}</span>
                          <span className="truncate flex-1">{tc.title}</span>
                          {latestExec && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              latestExec.result === 'pass' ? 'bg-green-100 text-green-700' :
                              latestExec.result === 'fail' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {latestExec.result}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">No test cases linked</p>
                )}
              </div>
            </div>

            {/* Code References */}
            {code_references.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Code References ({code_references.length})
                </h5>
                <ul className="text-sm text-slate-700 space-y-1">
                  {code_references.map(cr => (
                    <li key={cr.id} className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                        {cr.file_path}
                        {cr.line_range && `:${cr.line_range.start}-${cr.line_range.end}`}
                      </span>
                      {cr.function_name && (
                        <span className="text-xs text-slate-500">{cr.function_name}()</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
              <button 
                onClick={(e) => { e.stopPropagation(); onSelect?.(requirement); }}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                View Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GAPS VIEW
// ============================================================================

function GapsView({ gaps }: { gaps: Array<{ requirement: UserRequirement; gaps: string[] }> }) {
  if (gaps.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">No Traceability Gaps</h3>
        <p className="text-sm text-slate-500">All requirements have complete traceability coverage.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-3 rounded-lg">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">{gaps.length} requirements have traceability gaps</span>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {gaps.map(({ requirement, gaps: gapList }) => (
          <div key={requirement.id} className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium text-blue-600">{requirement.code}</span>
                  <span className="text-sm font-medium text-slate-900">{requirement.title}</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1">
                  {gapList.map((gap, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      {gap}
                    </li>
                  ))}
                </ul>
              </div>
              <PriorityBadge priority={requirement.priority} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RTMPanel({ onRequirementSelect, compact = false, showCreateButtons = true }: RTMPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [filters, setFilters] = useState({
    search: '',
    category: 'all' as RequirementCategory | 'all',
    priority: 'all' as RequirementPriority | 'all',
    status: 'all' as RequirementStatus | 'all',
    phase: 'all' as QualificationPhase | 'all',
  });

  // Load data
  const entries = useMemo(() => rtmService.buildFullRTM(), []);
  const summary = useMemo(() => rtmService.getRTMSummary(), []);
  const gaps = useMemo(() => rtmService.findTraceabilityGaps(), []);

  // Export handler
  const handleExport = useCallback(() => {
    const data = rtmService.exportRTMState();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rtm-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Import handler
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (rtmService.importRTMState(content)) {
        // Force re-render
        setViewMode(viewMode);
      }
    };
    reader.readAsText(file);
  }, [viewMode]);

  return (
    <div className={`${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Requirements Traceability Matrix</h2>
          <p className="text-sm text-slate-500 mt-1">
            GAMP 5 compliant bidirectional traceability for IQ/OQ/PQ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            Export
          </button>

          <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>

          {showCreateButtons && (
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Plus className="w-4 h-4" />
              Add Requirement
            </button>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {[
          { id: 'summary', label: 'Summary', icon: BarChart3 },
          { id: 'requirements', label: 'Requirements', icon: FileText },
          { id: 'gaps', label: `Gaps (${gaps.length})`, icon: AlertTriangle },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setViewMode(id as ViewMode)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              viewMode === id
                ? 'text-blue-600 border-blue-600'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {viewMode === 'summary' && <RTMSummaryView summary={summary} />}
      {viewMode === 'requirements' && (
        <RequirementsList
          entries={entries}
          onSelect={onRequirementSelect}
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}
      {viewMode === 'gaps' && <GapsView gaps={gaps} />}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
        <span>
          Last updated: {summary.last_updated.toLocaleString()}
        </span>
        <span>
          Ligature RTM v0.24.7 • GAMP 5 Compliant
        </span>
      </div>
    </div>
  );
}

export default RTMPanel;
