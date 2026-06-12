

import React, { useState } from 'react';
import {
  FileText,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Pen,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  FileJson,
  FileCode,
  Printer,
  XCircle,
} from 'lucide-react';
import {
  complianceReportService,
  ComplianceReport,
  ComplianceReportConfig,
} from '@/services/compliance-report-service';
import { AuditCategory } from '@/services/audit-service';

// ============================================================================
// TYPES
// ============================================================================

interface ComplianceReportPanelProps {
  applicationId?: string;
  applicationName?: string;
  sequenceId?: string;
  correlationId?: string;
  compact?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_OPTIONS: { value: AuditCategory; label: string }[] = [
  { value: 'authoring', label: 'Authoring' },
  { value: 'submissions', label: 'Submissions' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'safety', label: 'Safety' },
  { value: 'cmc', label: 'CMC' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'system', label: 'System' },
];

const QUICK_RANGES = [
  { label: 'Last 24 Hours', days: 1 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'Last 90 Days', days: 90 },
  { label: 'All Time', days: null },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const config = {
    low: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    medium: { bg: 'bg-amber-100', text: 'text-amber-800', icon: AlertTriangle },
    high: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
  };
  const { bg, text, icon: Icon } = config[level];
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon className="w-3 h-3" />
      {level.toUpperCase()} RISK
    </span>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 90 ? 'text-green-600' : score >= 70 ? 'text-amber-600' : 'text-red-600';
  
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 transform -rotate-90">
          <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="8"
            strokeDasharray={`${(score / 100) * 176} 176`}
            className={color}
          />
        </svg>
        <div className={`absolute inset-0 flex items-center justify-center text-lg font-bold ${color}`}>
          {score}%
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-slate-900">Compliance Score</div>
        <div className="text-xs text-slate-500">Target: 90%+</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color = 'slate' }: { 
  label: string; 
  value: number | string; 
  icon: React.ElementType;
  color?: 'slate' | 'green' | 'amber' | 'red' | 'blue';
}) {
  const colorClasses = {
    slate: 'bg-slate-50 text-slate-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
  };

  return (
    <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 opacity-60" />
        <span className="text-xs opacity-75">{label}</span>
      </div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ComplianceReportPanel({
  applicationId,
  applicationName,
  sequenceId,
  correlationId,
  compact = false,
}: ComplianceReportPanelProps) {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfig, setShowConfig] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'recommendations']));
  
  const [selectedRange, setSelectedRange] = useState<number | null>(7);
  const [selectedCategories, setSelectedCategories] = useState<AuditCategory[]>([]);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [includeUnsignedCritical, setIncludeUnsignedCritical] = useState(true);
  const [includeChangeJustifications, setIncludeChangeJustifications] = useState(true);

  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      const config: ComplianceReportConfig = {
        title: applicationName 
          ? `Compliance Report: ${applicationName}${sequenceId ? ` (Seq ${sequenceId})` : ''}`
          : 'Platform Compliance Report',
        dateFrom: selectedRange ? (() => {
          const d = new Date();
          d.setDate(d.getDate() - selectedRange);
          return d;
        })() : undefined,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        includeSignatures,
        includeUnsignedCritical,
        includeChangeJustifications,
        targetType: applicationId ? 'submission' : undefined,
        targetId: sequenceId || applicationId,
        correlationId,
      };

      const generatedReport = complianceReportService.generateReport(config);
      setReport(generatedReport);
      setShowConfig(false);
      setIsGenerating(false);
    }, 500);
  };

  const handleExport = (format: 'json' | 'html' | 'pdf-ready') => {
    if (!report) return;
    
    const content = complianceReportService.export(report, format);
    const mimeType = format === 'json' ? 'application/json' : 'text/html';
    const extension = format === 'json' ? 'json' : 'html';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${report.id}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const toggleCategory = (category: AuditCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${compact ? '' : 'overflow-hidden'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-600" />
          <h2 className="text-sm font-semibold text-slate-900">Compliance Reports</h2>
        </div>
        <div className="flex items-center gap-2">
          {report && (
            <>
              <button onClick={() => handleExport('json')} className="p-1.5 rounded hover:bg-slate-100" title="Export JSON">
                <FileJson className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => handleExport('html')} className="p-1.5 rounded hover:bg-slate-100" title="Export HTML">
                <FileCode className="w-4 h-4 text-slate-500" />
              </button>
              <button onClick={() => handleExport('pdf-ready')} className="p-1.5 rounded hover:bg-slate-100" title="Print/PDF">
                <Printer className="w-4 h-4 text-slate-500" />
              </button>
            </>
          )}
          <button
            onClick={() => { setReport(null); setShowConfig(true); }}
            className="p-1.5 rounded hover:bg-slate-100"
            title="New Report"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {showConfig && !report ? (
          <div className="p-4 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-slate-900 mb-3">Report Configuration</h3>
              
              {/* Date Range */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">Time Period</label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_RANGES.map(range => (
                    <button
                      key={range.label}
                      onClick={() => setSelectedRange(range.days)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                        selectedRange === range.days
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">Categories (leave empty for all)</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => toggleCategory(cat.value)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                        selectedCategories.includes(cat.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeSignatures} onChange={(e) => setIncludeSignatures(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Include signature summary</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeUnsignedCritical} onChange={(e) => setIncludeUnsignedCritical(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Flag unsigned critical actions</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={includeChangeJustifications} onChange={(e) => setIncludeChangeJustifications(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  <span className="text-sm text-slate-700">Include change justifications</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Generating Report...</>
              ) : (
                <><FileText className="w-4 h-4" /> Generate Compliance Report</>
              )}
            </button>
          </div>
        ) : report ? (
          <div className="p-4 space-y-4">
            {/* Report Header */}
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{report.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generated {report.generatedAt.toLocaleString()} by {report.generatedBy.userName}
                  </p>
                  <p className="text-xs text-slate-400">Report ID: {report.id}</p>
                </div>
                <RiskBadge level={report.summary.riskLevel} />
              </div>
              
              <div className="flex items-center gap-6">
                <ScoreGauge score={report.summary.complianceScore} />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <StatCard label="Total Entries" value={report.summary.totalEntries} icon={FileText} />
                  <StatCard label="Critical" value={report.summary.criticalEntries} icon={AlertTriangle} 
                    color={report.summary.criticalEntries > 0 ? 'red' : 'slate'} />
                  <StatCard label="Signed" value={report.summary.signedEntries} icon={Pen} color="green" />
                  <StatCard label="Unsigned Critical" value={report.summary.unsignedCritical} icon={XCircle}
                    color={report.summary.unsignedCritical > 0 ? 'red' : 'green'} />
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('recommendations')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">Recommendations ({report.recommendations.length})</span>
                  {expandedSections.has('recommendations') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections.has('recommendations') && (
                  <div className="px-4 pb-4 space-y-2">
                    {report.recommendations.map((rec, i) => (
                      <div key={i} className="p-3 bg-green-50 border-l-4 border-green-500 rounded text-sm text-slate-700">
                        {rec}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Unsigned Critical Alerts */}
            {report.unsignedCriticalAlerts && report.unsignedCriticalAlerts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('alerts')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-red-700">
                    Unsigned Critical Actions ({report.unsignedCriticalAlerts.length})
                  </span>
                  {expandedSections.has('alerts') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections.has('alerts') && (
                  <div className="px-4 pb-4 space-y-2">
                    {report.unsignedCriticalAlerts.map(alert => (
                      <div key={alert.entryId} className={`p-3 rounded border-l-4 text-sm ${
                        alert.riskLevel === 'high' ? 'bg-red-50 border-red-500' :
                        alert.riskLevel === 'medium' ? 'bg-amber-50 border-amber-500' :
                        'bg-blue-50 border-blue-500'
                      }`}>
                        <div className="font-medium text-slate-900">{alert.action}</div>
                        <div className="text-slate-600">{alert.summary}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          By {alert.actor} • {alert.timestamp.toLocaleString()}
                        </div>
                        <div className="text-xs italic text-slate-600 mt-1">{alert.recommendation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Signature Summary */}
            {report.signatureSummary && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('signatures')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">
                    Electronic Signatures ({report.signatureSummary.totalSignatures})
                  </span>
                  {expandedSections.has('signatures') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections.has('signatures') && (
                  <div className="px-4 pb-4">
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <div className="text-lg font-bold text-slate-900">{report.signatureSummary.byMeaning.approval}</div>
                        <div className="text-xs text-slate-500">Approvals</div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <div className="text-lg font-bold text-slate-900">{report.signatureSummary.byMeaning.review}</div>
                        <div className="text-xs text-slate-500">Reviews</div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <div className="text-lg font-bold text-slate-900">{report.signatureSummary.byMeaning.authorship}</div>
                        <div className="text-xs text-slate-500">Authorship</div>
                      </div>
                      <div className="text-center p-2 bg-slate-50 rounded">
                        <div className="text-lg font-bold text-slate-900">{report.signatureSummary.byMeaning.witness}</div>
                        <div className="text-xs text-slate-500">Witness</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      <div className="font-medium mb-1">Top Signers:</div>
                      {report.signatureSummary.byUser.slice(0, 5).map(user => (
                        <div key={user.userId} className="flex justify-between py-1 border-b border-slate-100">
                          <span>{user.userName} ({user.role})</span>
                          <span className="font-medium">{user.signatureCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Activities */}
            {report.userActivities && report.userActivities.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('users')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">
                    User Activity ({report.userActivities.length} users)
                  </span>
                  {expandedSections.has('users') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections.has('users') && (
                  <div className="px-4 pb-4">
                    <div className="space-y-2">
                      {report.userActivities.slice(0, 10).map(user => (
                        <div key={user.userId} className="flex items-center justify-between py-2 border-b border-slate-100">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{user.userName}</div>
                            <div className="text-xs text-slate-500">{user.role}</div>
                          </div>
                          <div className="text-right text-xs">
                            <div>{user.totalActions} actions</div>
                            <div className="text-green-600">{user.signedActions} signed</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Timeline */}
            {report.timeline && report.timeline.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg">
                <button
                  onClick={() => toggleSection('timeline')}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
                >
                  <span className="text-sm font-medium text-slate-900">
                    Activity Timeline ({report.timeline.length} events)
                  </span>
                  {expandedSections.has('timeline') ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                {expandedSections.has('timeline') && (
                  <div className="px-4 pb-4 max-h-80 overflow-auto">
                    <div className="space-y-2">
                      {report.timeline.slice(0, 50).map(event => (
                        <div key={event.entryId} className="flex items-start gap-3 py-2 border-b border-slate-100">
                          <div className="text-xs text-slate-400 w-24 flex-shrink-0">
                            {event.timestamp.toLocaleTimeString()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-900 truncate">{event.summary}</div>
                            <div className="text-xs text-slate-500">{event.actor} • {event.category}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            {event.hasSigning && <Pen className="w-3 h-3 text-green-600" />}
                            {event.severity === 'critical' && <AlertTriangle className="w-3 h-3 text-red-600" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
