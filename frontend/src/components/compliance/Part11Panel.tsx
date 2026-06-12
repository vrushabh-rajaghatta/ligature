

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Upload,
  FileText,
  Settings,
  RefreshCw,
  Eye,
  Edit2,
  Link2,
  Sparkles,
  ClipboardList,
  Scale,
  BookOpen,
  AlertCircle,
  Clock,
  User,
  Calendar,
  FileCheck2,
  ExternalLink,
  Printer,
} from 'lucide-react';
import {
  part11Service,
  LIGATURE_CONTROLS,
} from '@/services/part11-service';
import {
  Part11Clause,
  Part11Control,
  Part11Assessment,
  Part11MatrixEntry,
  Part11Summary,
  Part11Gap,
  Part11Section,
  ComplianceStatus,
  PART_11_CLAUSES,
  formatClauseNumber,
  getStatusColor,
} from '@/types/compliance-matrix';

// ============================================================================
// TYPES
// ============================================================================

interface Part11PanelProps {
  onClauseSelect?: (clause: Part11Clause) => void;
  compact?: boolean;
  showControls?: boolean;
}

type ViewMode = 'overview' | 'matrix' | 'controls' | 'gaps' | 'report';

// ============================================================================
// CONSTANTS
// ============================================================================

const SECTION_LABELS: Record<Part11Section, string> = {
  subpart_a: 'Subpart A - General Provisions',
  subpart_b: 'Subpart B - Electronic Records',
  subpart_c: 'Subpart C - Electronic Signatures',
};

const STATUS_CONFIG: Record<ComplianceStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  compliant: { label: 'Compliant', color: 'text-green-700', bg: 'bg-green-100', icon: CheckCircle2 },
  partial: { label: 'Partial', color: 'text-amber-700', bg: 'bg-amber-100', icon: AlertTriangle },
  planned: { label: 'Planned', color: 'text-blue-700', bg: 'bg-blue-100', icon: Clock },
  not_applicable: { label: 'N/A', color: 'text-slate-500', bg: 'bg-slate-100', icon: AlertCircle },
  non_compliant: { label: 'Non-Compliant', color: 'text-red-700', bg: 'bg-red-100', icon: XCircle },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ComplianceScoreGauge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 90) return { ring: 'stroke-green-500', text: 'text-green-600' };
    if (score >= 70) return { ring: 'stroke-amber-500', text: 'text-amber-600' };
    return { ring: 'stroke-red-500', text: 'text-red-600' };
  };

  const colors = getColor();
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          className="text-slate-200"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="currentColor"
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          className={colors.ring}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${colors?.text ?? ''}`}>{score}%</span>
        <span className="text-xs text-slate-500">Compliance</span>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'blue',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'slate';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    slate: 'bg-slate-50 text-slate-600',
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
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// OVERVIEW VIEW
// ============================================================================

function OverviewView({ summary }: { summary: Part11Summary }) {
  return (
    <div className="space-y-6">
      {/* Score and Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 bg-white rounded-lg border border-slate-200 p-6 flex flex-col items-center justify-center">
          <ComplianceScoreGauge score={summary.overall_compliance_score} />
          <p className="text-sm text-slate-500 mt-2">21 CFR Part 11</p>
        </div>
        
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={CheckCircle2}
            label="Compliant"
            value={summary.by_status.compliant}
            color="green"
          />
          <StatCard
            icon={AlertTriangle}
            label="Partial"
            value={summary.by_status.partial}
            color="amber"
          />
          <StatCard
            icon={Clock}
            label="Planned"
            value={summary.by_status.planned}
            color="blue"
          />
          <StatCard
            icon={XCircle}
            label="Non-Compliant"
            value={summary.by_status.non_compliant}
            color="red"
          />
        </div>
      </div>

      {/* Section Breakdown */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Compliance by Section</h3>
        <div className="space-y-4">
          {(['subpart_b', 'subpart_c'] as Part11Section[]).map(section => {
            const sectionData = summary.by_section[section];
            const total = sectionData?.total || 0;
            const compliant = sectionData?.compliant || 0;
            const partial = sectionData?.partial || 0;
            const planned = sectionData?.planned || 0;
            const nonCompliant = sectionData?.non_compliant || 0;
            const sectionScore = total > 0 ? Math.round(((compliant + partial * 0.5 + planned * 0.25) / total) * 100) : 0;

            return (
              <div key={section}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">
                    {SECTION_LABELS[section]}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">{sectionScore}%</span>
                </div>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                  <div 
                    className="bg-green-500 transition-all" 
                    style={{ width: `${total > 0 ? (compliant / total) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-amber-500 transition-all" 
                    style={{ width: `${total > 0 ? (partial / total) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-blue-500 transition-all" 
                    style={{ width: `${total > 0 ? (planned / total) * 100 : 0}%` }}
                  />
                  <div 
                    className="bg-red-500 transition-all" 
                    style={{ width: `${total > 0 ? (nonCompliant / total) * 100 : 0}%` }}
                  />
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {compliant} Compliant
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {partial} Partial
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {planned} Planned
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    {nonCompliant} Non-Compliant
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gaps Summary */}
      {summary.gaps.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Identified Gaps ({summary.gaps.length})
          </h3>
          <div className="space-y-3">
            {summary.gaps.slice(0, 5).map((gap, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-lg border-l-4 ${
                  gap.severity === 'critical' ? 'bg-red-50 border-red-500' :
                  gap.severity === 'major' ? 'bg-amber-50 border-amber-500' :
                  'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-900">
                      21 CFR §{gap.clause_number}
                    </span>
                    <p className="text-sm text-slate-600 mt-0.5">{gap.description}</p>
                    {gap.remediation && (
                      <p className="text-xs text-slate-500 mt-1">
                        <strong>Remediation:</strong> {gap.remediation}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    gap.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    gap.severity === 'major' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {gap.severity}
                  </span>
                </div>
              </div>
            ))}
            {summary.gaps.length > 5 && (
              <p className="text-sm text-slate-500 text-center">
                +{summary.gaps.length - 5} more gaps
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MATRIX VIEW
// ============================================================================

interface MatrixViewProps {
  matrix: Part11MatrixEntry[];
  onClauseSelect?: (clause: Part11Clause) => void;
}

function MatrixView({ matrix, onClauseSelect }: MatrixViewProps) {
  const [expandedSection, setExpandedSection] = useState<Part11Section | null>('subpart_b');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | 'all'>('all');

  const filteredMatrix = useMemo(() => {
    return matrix.filter(entry => {
      if (statusFilter !== 'all' && entry.assessment.status !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.clause.clause_number.toLowerCase().includes(search) ||
          entry.clause.title.toLowerCase().includes(search) ||
          entry.assessment.controls.some(c => c.name.toLowerCase().includes(search))
        );
      }
      return true;
    });
  }, [matrix, searchTerm, statusFilter]);

  const groupedBySection = useMemo(() => {
    const groups: Record<Part11Section, Part11MatrixEntry[]> = {
      subpart_a: [],
      subpart_b: [],
      subpart_c: [],
    };
    filteredMatrix.forEach(entry => {
      groups[entry.clause.section].push(entry);
    });
    return groups;
  }, [filteredMatrix]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search clauses or controls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ComplianceStatus | 'all')}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <option key={key} value={key}>{config.label}</option>
          ))}
        </select>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {(['subpart_b', 'subpart_c'] as Part11Section[]).map(section => {
          const sectionEntries = groupedBySection[section];
          const isExpanded = expandedSection === section;
          
          return (
            <div key={section}>
              {/* Section Header */}
              <button
                onClick={() => setExpandedSection(isExpanded ? null : section)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 text-white hover:bg-slate-700 transition-colors"
              >
                <span className="font-medium">{SECTION_LABELS[section]}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-300">{sectionEntries.length} clauses</span>
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </div>
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="divide-y divide-slate-100">
                  {sectionEntries.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      No clauses match your filters
                    </div>
                  ) : (
                    sectionEntries.map(entry => (
                      <ClauseRow 
                        key={entry.clause.id} 
                        entry={entry} 
                        onSelect={onClauseSelect}
                      />
                    ))
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

interface ClauseRowProps {
  entry: Part11MatrixEntry;
  onSelect?: (clause: Part11Clause) => void;
}

function ClauseRow({ entry, onSelect }: ClauseRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { clause, assessment } = entry;

  return (
    <div>
      <div 
        className={`flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="text-slate-400 hover:text-slate-600">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        <div className="w-24">
          <span className="font-mono text-sm font-medium text-slate-900">§{clause.clause_number}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-slate-900">{clause.title}</h4>
          <p className="text-xs text-slate-500 truncate">{clause.interpretation || clause.full_text.slice(0, 100)}...</p>
        </div>

        <div className="flex items-center gap-2">
          {assessment.controls.length > 0 ? (
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {assessment.controls.length} control{assessment.controls.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs text-slate-400 italic">Procedural</span>
          )}
        </div>

        <ComplianceStatusBadge status={assessment.status} />
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 bg-slate-50 border-t border-slate-100">
          <div className="ml-10 space-y-4">
            {/* Full Clause Text */}
            <div>
              <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Regulatory Requirement</h5>
              <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200">
                {clause.full_text}
              </p>
            </div>

            {/* Interpretation */}
            {clause.interpretation && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">Interpretation</h5>
                <p className="text-sm text-slate-600">{clause.interpretation}</p>
              </div>
            )}

            {/* Controls */}
            {assessment.controls.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Implemented Controls ({assessment.controls.length})
                </h5>
                <div className="space-y-2">
                  {assessment.controls.map(control => (
                    <div key={control.id} className="bg-white p-3 rounded border border-slate-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm font-medium text-slate-900">{control.name}</span>
                          <p className="text-xs text-slate-500 mt-0.5">{control.description}</p>
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {control.module}
                        </span>
                      </div>
                      {control.implementation && (
                        <p className="text-xs text-slate-600 mt-2">
                          <strong>Implementation:</strong> {control.implementation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Gap/Remediation */}
            {assessment.gap_description && (
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <h5 className="text-xs font-semibold text-amber-700 uppercase mb-1">Gap Identified</h5>
                <p className="text-sm text-amber-800">{assessment.gap_description}</p>
                {assessment.remediation_plan && (
                  <p className="text-sm text-amber-700 mt-2">
                    <strong>Remediation:</strong> {assessment.remediation_plan}
                  </p>
                )}
              </div>
            )}

            {/* Evidence */}
            {assessment.evidence.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Supporting Evidence ({assessment.evidence.length})
                </h5>
                <div className="flex flex-wrap gap-2">
                  {assessment.evidence.map(ev => (
                    <span 
                      key={ev.id}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded"
                    >
                      <FileText className="w-3 h-3" />
                      {ev.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment Info */}
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                Assessed by {assessment.assessed_by}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {assessment.assessed_at.toLocaleDateString()}
              </span>
              {assessment.approved_by && (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" />
                  Approved by {assessment.approved_by}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONTROLS VIEW
// ============================================================================

function ControlsView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');

  const controls = useMemo(() => part11Service.getAllControls(), []);

  const modules = useMemo(() => {
    const uniqueModules = new Set(controls.map(c => c.module));
    return Array.from(uniqueModules).sort();
  }, [controls]);

  const filteredControls = useMemo(() => {
    return controls.filter(control => {
      if (moduleFilter !== 'all' && control.module !== moduleFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          control.name.toLowerCase().includes(search) ||
          control.description.toLowerCase().includes(search) ||
          control.implementation.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [controls, searchTerm, moduleFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search controls..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Modules</option>
          {modules.map(module => (
            <option key={module} value={module}>{module}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">
        {filteredControls.length} of {controls.length} controls
      </p>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredControls.map(control => (
          <div key={control.id} className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-sm font-medium text-slate-900">{control.name}</h4>
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                {control.module}
              </span>
            </div>
            <p className="text-sm text-slate-600 mb-3">{control.description}</p>
            <div className="text-xs text-slate-500 space-y-1">
              <p><strong>Implementation:</strong> {control.implementation}</p>
              {control.technical_details && (
                <p><strong>Technical:</strong> {control.technical_details}</p>
              )}
              {control.sop_reference && (
                <p className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  <strong>SOP:</strong> {control.sop_reference}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// GAPS VIEW
// ============================================================================

function GapsView({ gaps }: { gaps: Part11Gap[] }) {
  if (gaps.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-slate-900 mb-1">Full Compliance Achieved</h3>
        <p className="text-sm text-slate-500">No compliance gaps have been identified.</p>
      </div>
    );
  }

  const criticalGaps = gaps.filter(g => g.severity === 'critical');
  const majorGaps = gaps.filter(g => g.severity === 'major');
  const minorGaps = gaps.filter(g => g.severity === 'minor');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <span className="text-3xl font-bold text-red-600">{criticalGaps.length}</span>
          <p className="text-sm text-red-700 font-medium">Critical</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
          <span className="text-3xl font-bold text-amber-600">{majorGaps.length}</span>
          <p className="text-sm text-amber-700 font-medium">Major</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <span className="text-3xl font-bold text-blue-600">{minorGaps.length}</span>
          <p className="text-sm text-blue-700 font-medium">Minor</p>
        </div>
      </div>

      {/* Gaps List */}
      <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
        {gaps.map((gap, idx) => (
          <div key={idx} className="p-4">
            <div className="flex items-start gap-3">
              {gap.severity === 'critical' ? (
                <XCircle className="w-5 h-5 text-red-500 mt-0.5" />
              ) : gap.severity === 'major' ? (
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-medium text-slate-900">
                    21 CFR §{gap.clause_number}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    gap.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    gap.severity === 'major' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {gap.severity}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {gap.gap_type.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{gap.description}</p>
                {gap.remediation && (
                  <p className="text-sm text-slate-500 mt-2">
                    <strong>Remediation:</strong> {gap.remediation}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  {gap.target_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Target: {gap.target_date.toLocaleDateString()}
                    </span>
                  )}
                  {gap.owner && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Owner: {gap.owner}
                    </span>
                  )}
                </div>
              </div>
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

export function Part11Panel({ onClauseSelect, compact = false, showControls = true }: Part11PanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize service on mount
  useEffect(() => {
    part11Service.initializePart11Service();
    part11Service.autoAssessWithDefaults('system');
    setIsInitialized(true);
  }, []);

  // Load data
  const matrix = useMemo(() => isInitialized ? part11Service.buildFullMatrix() : [], [isInitialized]);
  const summary = useMemo(() => isInitialized ? part11Service.getPart11Summary() : null, [isInitialized]);

  // Export handlers
  const handleExportJSON = useCallback(() => {
    const data = part11Service.exportPart11State();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `part11-matrix-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleExportHTML = useCallback(() => {
    const html = part11Service.generateComplianceReportHTML();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `part11-report-${new Date().toISOString().split('T')[0]}.html`;
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
      if (part11Service.importPart11State(content)) {
        setIsInitialized(false);
        setTimeout(() => setIsInitialized(true), 0);
      }
    };
    reader.readAsText(file);
  }, []);

  if (!isInitialized || !summary) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
        <p className="text-slate-500 mt-2">Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className={`${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            21 CFR Part 11 Compliance Matrix
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Electronic Records; Electronic Signatures
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              onClick={handleExportJSON}
            >
              <Download className="w-4 h-4" />
              Export JSON
            </button>
          </div>

          <button
            onClick={handleExportHTML}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            Export Report
          </button>

          <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview', icon: Scale },
          { id: 'matrix', label: 'Compliance Matrix', icon: ClipboardList },
          { id: 'controls', label: 'Controls', icon: Settings },
          { id: 'gaps', label: `Gaps (${summary.gaps.length})`, icon: AlertTriangle },
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
      {viewMode === 'overview' && <OverviewView summary={summary} />}
      {viewMode === 'matrix' && <MatrixView matrix={matrix} onClauseSelect={onClauseSelect} />}
      {viewMode === 'controls' && showControls && <ControlsView />}
      {viewMode === 'gaps' && <GapsView gaps={summary.gaps} />}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
        <span>
          Last assessed: {summary.last_assessed.toLocaleString()}
        </span>
        <span>
          Ligature Part 11 v0.24.7 • FDA 21 CFR Part 11 Compliant
        </span>
      </div>
    </div>
  );
}

export default Part11Panel;
