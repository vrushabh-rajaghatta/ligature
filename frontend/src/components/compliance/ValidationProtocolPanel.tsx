

import React, { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Search,
  Filter,
  Settings,
  Play,
  Pause,
  CheckSquare,
  Square,
  Shield,
  Server,
  Network,
  FileCheck,
  Lock,
  Activity,
  Users,
  Zap,
  ClipboardCheck,
  Eye,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  Calendar,
  User,
  Building,
  Tag,
  ArrowRight,
  Info,
} from 'lucide-react';
import {
  ValidationProtocol,
  ProtocolType,
  ProtocolStatus,
  TestCase,
  TestResult,
  TestCategory,
  SystemInfo,
  GAMPCategory,
  ProtocolSummary,
  calculateProtocolSummary,
  getGAMPCategoryDescription,
  getTestCategoryDisplayName,
  isReadyForExecution,
  RiskLevel,
} from '@/types/validation-protocol';
import {
  ValidationProtocolGenerator,
  getProtocolGenerator,
  ProtocolGenerationOptions,
} from '@/services/validation-protocol-generator';

// ============================================================================
// TYPES
// ============================================================================

interface ValidationProtocolPanelProps {
  /** Pre-existing protocols */
  protocols?: ValidationProtocol[];
  /** Default system info for new protocols */
  defaultSystem?: Partial<SystemInfo>;
  /** Called when a protocol is generated */
  onProtocolGenerated?: (protocol: ValidationProtocol) => void;
  /** Called when a protocol is exported */
  onExport?: (protocol: ValidationProtocol, format: 'docx' | 'pdf' | 'json') => void;
  /** Read-only mode */
  readOnly?: boolean;
}

type ViewTab = 'overview' | 'generator' | 'test-cases' | 'sections';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<ProtocolStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bg: 'bg-slate-100', icon: FileText },
  pending_review: { label: 'Pending Review', color: 'text-amber-600', bg: 'bg-amber-100', icon: Clock },
  approved: { label: 'Approved', color: 'text-blue-600', bg: 'bg-blue-100', icon: CheckCircle2 },
  in_execution: { label: 'In Execution', color: 'text-purple-600', bg: 'bg-purple-100', icon: Play },
  completed: { label: 'Completed', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
  archived: { label: 'Archived', color: 'text-slate-400', bg: 'bg-slate-50', icon: FileCheck },
};

const RESULT_CONFIG: Record<TestResult, { label: string; color: string; bg: string }> = {
  pass: { label: 'Pass', color: 'text-green-700', bg: 'bg-green-100' },
  fail: { label: 'Fail', color: 'text-red-700', bg: 'bg-red-100' },
  blocked: { label: 'Blocked', color: 'text-amber-700', bg: 'bg-amber-100' },
  not_run: { label: 'Not Run', color: 'text-slate-500', bg: 'bg-slate-100' },
  not_applicable: { label: 'N/A', color: 'text-slate-400', bg: 'bg-slate-50' },
};

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-green-600' },
  medium: { label: 'Medium', color: 'text-amber-600' },
  high: { label: 'High', color: 'text-orange-600' },
  critical: { label: 'Critical', color: 'text-red-600' },
};

const PROTOCOL_TYPE_CONFIG: Record<ProtocolType, { label: string; color: string; description: string; icon: React.ElementType }> = {
  IQ: { label: 'Installation Qualification', color: 'text-cyan-600', description: 'Verify system installed correctly', icon: Server },
  OQ: { label: 'Operational Qualification', color: 'text-purple-600', description: 'Verify system operates per specs', icon: Settings },
  PQ: { label: 'Performance Qualification', color: 'text-green-600', description: 'Verify system performs in production', icon: Activity },
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  hardware_verification: Server,
  software_installation: FileCheck,
  network_configuration: Network,
  documentation_review: FileText,
  environment_verification: Settings,
  functional_testing: Play,
  security_testing: Shield,
  boundary_testing: AlertTriangle,
  error_handling: AlertTriangle,
  interface_testing: Network,
  calculation_verification: Activity,
  audit_trail_testing: ClipboardCheck,
  electronic_signature: Lock,
  workflow_testing: ArrowRight,
  performance_testing: Zap,
  user_acceptance: Users,
  business_process: Building,
  integration_testing: Network,
  stress_testing: Activity,
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusBadge({ status }: { status: ProtocolStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}

function ResultBadge({ result }: { result: TestResult }) {
  const config = RESULT_CONFIG[result];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config?.bg ?? ''} ${config?.color ?? ''}`}>
      {config.label}
    </span>
  );
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const config = RISK_CONFIG[level];
  return (
    <span className={`text-xs font-medium ${config?.color ?? ''}`}>
      {config.label}
    </span>
  );
}

function ProtocolTypeBadge({ type }: { type: ProtocolType }) {
  const config = PROTOCOL_TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${config?.color ?? ''} bg-opacity-10`}
      style={{ backgroundColor: 'currentColor', opacity: 0.1 }}>
      {type}
    </span>
  );
}

function SummaryCard({ summary }: { summary: ProtocolSummary }) {
  const passRate = summary.passRate;
  const passRateColor = passRate >= 100 ? 'text-green-600' : passRate >= 80 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-500">Total Tests</div>
        <div className="text-2xl font-bold text-slate-900">{summary.totalTestCases}</div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-500">Pass Rate</div>
        <div className={`text-2xl font-bold ${passRateColor}`}>{summary.passRate}%</div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-500">Completion</div>
        <div className="text-2xl font-bold text-slate-900">{summary.completionPercentage}%</div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-sm text-slate-500">Deviations</div>
        <div className={`text-2xl font-bold ${summary.criticalDeviations > 0 ? 'text-red-600' : 'text-slate-900'}`}>
          {summary.totalDeviations}
          {summary.criticalDeviations > 0 && (
            <span className="text-sm ml-1">({summary.criticalDeviations} critical)</span>
          )}
        </div>
      </div>
    </div>
  );
}

interface GeneratorFormProps {
  onGenerate: (options: ProtocolGenerationOptions) => void;
  defaultSystem?: Partial<SystemInfo>;
}

function GeneratorForm({ onGenerate, defaultSystem }: GeneratorFormProps) {
  const [protocolType, setProtocolType] = useState<ProtocolType>('IQ');
  const [systemName, setSystemName] = useState(defaultSystem?.name || '');
  const [systemVersion, setSystemVersion] = useState(defaultSystem?.version || '');
  const [vendor, setVendor] = useState(defaultSystem?.vendor || '');
  const [gampCategory, setGampCategory] = useState<GAMPCategory>(defaultSystem?.gampCategory || 4);
  const [description, setDescription] = useState(defaultSystem?.description || '');
  const [intendedUse, setIntendedUse] = useState(defaultSystem?.intendedUse || '');
  const [environment, setEnvironment] = useState<SystemInfo['environment']>(defaultSystem?.environment || 'validation');
  const [department, setDepartment] = useState('Quality Assurance');
  const [owner, setOwner] = useState('');
  const [numberPrefix, setNumberPrefix] = useState('VAL');
  
  // IQ Options
  const [iqHardware, setIqHardware] = useState(true);
  const [iqSoftware, setIqSoftware] = useState(true);
  const [iqNetwork, setIqNetwork] = useState(true);
  const [iqDocs, setIqDocs] = useState(true);
  
  // OQ Options
  const [oqFunctional, setOqFunctional] = useState(true);
  const [oqSecurity, setOqSecurity] = useState(true);
  const [oqPart11, setOqPart11] = useState(true);
  const [oqErrorHandling, setOqErrorHandling] = useState(true);
  
  // PQ Options
  const [pqWorkflow, setPqWorkflow] = useState(true);
  const [pqPerformance, setPqPerformance] = useState(true);
  const [pqUAT, setPqUAT] = useState(true);
  const [pqIntegration, setPqIntegration] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const system: SystemInfo = {
      name: systemName,
      version: systemVersion,
      vendor,
      gampCategory,
      description,
      intendedUse,
      gxpImpact: [],
      regulations: ['21 CFR Part 11', 'EU Annex 11'],
      environment,
    };

    const options: ProtocolGenerationOptions = {
      type: protocolType,
      system,
      numberPrefix,
      department,
      owner,
      approvalRoles: ['author', 'reviewer', 'qa_approver', 'system_owner'],
      iqConfig: protocolType === 'IQ' ? {
        includeHardware: iqHardware,
        includeSoftware: iqSoftware,
        includeNetwork: iqNetwork,
        includeDocumentation: iqDocs,
        customSections: [],
        testCaseTemplates: [],
      } : undefined,
      oqConfig: protocolType === 'OQ' ? {
        includeFunctional: oqFunctional,
        includeSecurity: oqSecurity,
        includePart11: oqPart11,
        includeBoundary: false,
        includeErrorHandling: oqErrorHandling,
        customSections: [],
        testCaseTemplates: [],
      } : undefined,
      pqConfig: protocolType === 'PQ' ? {
        includeWorkflow: pqWorkflow,
        includePerformance: pqPerformance,
        includeUAT: pqUAT,
        includeIntegration: pqIntegration,
        customSections: [],
        testCaseTemplates: [],
      } : undefined,
    };

    onGenerate(options);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Protocol Type Selection */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-3">Protocol Type</label>
        <div className="grid grid-cols-3 gap-4">
          {(['IQ', 'OQ', 'PQ'] as ProtocolType[]).map(type => {
            const config = PROTOCOL_TYPE_CONFIG[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setProtocolType(type)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  protocolType === type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${config?.color ?? ''}`} />
                  <span className="font-bold">{type}</span>
                </div>
                <div className="text-sm text-slate-600">{config.label}</div>
                <div className="text-xs text-slate-400 mt-1">{config.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* System Information */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-slate-700">System Information</h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">System Name *</label>
            <input
              type="text"
              value={systemName}
              onChange={e => setSystemName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Ligature IDOP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Version *</label>
            <input
              type="text"
              value={systemVersion}
              onChange={e => setSystemVersion(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1.0.0"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Vendor</label>
            <input
              type="text"
              value={vendor}
              onChange={e => setVendor(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Ligature Inc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">GAMP Category</label>
            <select
              value={gampCategory}
              onChange={e => setGampCategory(Number(e.target.value) as GAMPCategory)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={1}>Cat 1 - Infrastructure Software</option>
              <option value={2}>Cat 2 - Non-configurable (Firmware)</option>
              <option value={3}>Cat 3 - Non-configurable (COTS)</option>
              <option value={4}>Cat 4 - Configured Software</option>
              <option value={5}>Cat 5 - Custom Software</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Brief description of the system"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Intended Use</label>
          <textarea
            value={intendedUse}
            onChange={e => setIntendedUse(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="GxP-regulated intended use of the system"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Environment</label>
          <select
            value={environment}
            onChange={e => setEnvironment(e.target.value as SystemInfo['environment'])}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="development">Development</option>
            <option value="validation">Validation</option>
            <option value="production">Production</option>
            <option value="disaster_recovery">Disaster Recovery</option>
          </select>
        </div>
      </div>

      {/* Protocol Metadata */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-slate-700">Protocol Metadata</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Number Prefix</label>
            <input
              type="text"
              value={numberPrefix}
              onChange={e => setNumberPrefix(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="VAL"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Quality Assurance"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Owner</label>
            <input
              type="text"
              value={owner}
              onChange={e => setOwner(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Validation Lead"
            />
          </div>
        </div>
      </div>

      {/* Test Coverage Options */}
      <div className="bg-slate-50 rounded-lg p-4 space-y-4">
        <h3 className="font-semibold text-slate-700">Test Coverage</h3>
        
        {protocolType === 'IQ' && (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={iqHardware} onChange={e => setIqHardware(e.target.checked)} className="rounded" />
              <span className="text-sm">Hardware Verification</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={iqSoftware} onChange={e => setIqSoftware(e.target.checked)} className="rounded" />
              <span className="text-sm">Software Installation</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={iqNetwork} onChange={e => setIqNetwork(e.target.checked)} className="rounded" />
              <span className="text-sm">Network Configuration</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={iqDocs} onChange={e => setIqDocs(e.target.checked)} className="rounded" />
              <span className="text-sm">Documentation Review</span>
            </label>
          </div>
        )}

        {protocolType === 'OQ' && (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={oqFunctional} onChange={e => setOqFunctional(e.target.checked)} className="rounded" />
              <span className="text-sm">Functional Testing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={oqSecurity} onChange={e => setOqSecurity(e.target.checked)} className="rounded" />
              <span className="text-sm">Security Testing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={oqPart11} onChange={e => setOqPart11(e.target.checked)} className="rounded" />
              <span className="text-sm">21 CFR Part 11 (Audit Trail, E-Sig)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={oqErrorHandling} onChange={e => setOqErrorHandling(e.target.checked)} className="rounded" />
              <span className="text-sm">Error Handling</span>
            </label>
          </div>
        )}

        {protocolType === 'PQ' && (
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pqWorkflow} onChange={e => setPqWorkflow(e.target.checked)} className="rounded" />
              <span className="text-sm">Workflow Testing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pqPerformance} onChange={e => setPqPerformance(e.target.checked)} className="rounded" />
              <span className="text-sm">Performance Testing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pqUAT} onChange={e => setPqUAT(e.target.checked)} className="rounded" />
              <span className="text-sm">User Acceptance Testing</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={pqIntegration} onChange={e => setPqIntegration(e.target.checked)} className="rounded" />
              <span className="text-sm">Integration Testing</span>
            </label>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!systemName || !systemVersion}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-5 h-5" />
          Generate {protocolType} Protocol
        </button>
      </div>
    </form>
  );
}

interface TestCaseListProps {
  testCases: TestCase[];
  onTestCaseClick?: (testCase: TestCase) => void;
}

function TestCaseList({ testCases, onTestCaseClick }: TestCaseListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<TestCategory | 'all'>('all');
  const [filterResult, setFilterResult] = useState<TestResult | 'all'>('all');

  const filteredTestCases = useMemo(() => {
    return testCases.filter(tc => {
      if (filterCategory !== 'all' && tc.category !== filterCategory) return false;
      if (filterResult !== 'all' && tc.result !== filterResult) return false;
      return true;
    });
  }, [testCases, filterCategory, filterResult]);

  const categories = useMemo(() => {
    const cats = new Set(testCases.map(tc => tc.category));
    return Array.from(cats);
  }, [testCases]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as TestCategory | 'all')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{getTestCategoryDisplayName(cat)}</option>
          ))}
        </select>
        <select
          value={filterResult}
          onChange={e => setFilterResult(e.target.value as TestResult | 'all')}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
        >
          <option value="all">All Results</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="blocked">Blocked</option>
          <option value="not_run">Not Run</option>
          <option value="not_applicable">N/A</option>
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          {filteredTestCases.length} of {testCases.length} test cases
        </span>
      </div>

      {/* Test Case List */}
      <div className="space-y-2">
        {filteredTestCases.map(tc => {
          const isExpanded = expandedId === tc.id;
          const CategoryIcon = CATEGORY_ICONS[tc.category] || FileText;

          return (
            <div
              key={tc.id}
              className="border border-slate-200 rounded-lg bg-white overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : tc.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50"
              >
                <CategoryIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-slate-500">{tc.number}</span>
                    <span className="font-medium text-slate-900 truncate">{tc.title}</span>
                  </div>
                  <div className="text-sm text-slate-500 truncate">{tc.objective}</div>
                </div>
                <RiskBadge level={tc.riskLevel} />
                <ResultBadge result={tc.result} />
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100">
                  <div className="pt-4 space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Test Steps</h4>
                      <div className="space-y-2">
                        {tc.steps.map((step, idx) => (
                          <div key={idx} className="flex gap-3 text-sm">
                            <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                              {step.stepNumber}
                            </span>
                            <div className="flex-1">
                              <div className="text-slate-700">{step.action}</div>
                              <div className="text-slate-500 text-xs mt-1">
                                Expected: {step.expectedResult}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-medium text-slate-700 mb-1">Expected Results</h4>
                        <p className="text-slate-600">{tc.expectedResults}</p>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-700 mb-1">Acceptance Criteria</h4>
                        <p className="text-slate-600">{tc.acceptanceCriteria}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ValidationProtocolPanel({
  protocols = [],
  defaultSystem,
  onProtocolGenerated,
  onExport,
  readOnly = false,
}: ValidationProtocolPanelProps) {
  const [activeTab, setActiveTab] = useState<ViewTab>('generator');
  const [generatedProtocols, setGeneratedProtocols] = useState<ValidationProtocol[]>(protocols);
  const [selectedProtocol, setSelectedProtocol] = useState<ValidationProtocol | null>(null);

  const handleGenerate = useCallback((options: ProtocolGenerationOptions) => {
    const generator = getProtocolGenerator();
    const protocol = generator.generateProtocol(options);
    
    setGeneratedProtocols(prev => [protocol, ...prev]);
    setSelectedProtocol(protocol);
    setActiveTab('overview');
    
    onProtocolGenerated?.(protocol);
  }, [onProtocolGenerated]);

  const selectedSummary = useMemo(() => {
    if (!selectedProtocol) return null;
    return calculateProtocolSummary(selectedProtocol);
  }, [selectedProtocol]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-blue-600" />
            IQ/OQ/PQ Protocol Generator
          </h2>
          <p className="text-slate-500 mt-1">Generate GAMP 5 compliant validation protocols</p>
        </div>

        {selectedProtocol && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExport?.(selectedProtocol, 'docx')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Export DOCX
            </button>
            <button
              onClick={() => onExport?.(selectedProtocol, 'pdf')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6">
          {[
            { id: 'generator', label: 'Generate New', icon: Plus },
            { id: 'overview', label: 'Protocol Overview', icon: Eye, disabled: !selectedProtocol },
            { id: 'test-cases', label: 'Test Cases', icon: CheckSquare, disabled: !selectedProtocol },
            { id: 'sections', label: 'Sections', icon: FileText, disabled: !selectedProtocol },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id as ViewTab)}
              disabled={tab.disabled}
              className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : tab.disabled
                    ? 'border-transparent text-slate-300 cursor-not-allowed'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Protocol Selector */}
      {generatedProtocols.length > 0 && activeTab !== 'generator' && (
        <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3">
          <span className="text-sm text-slate-500">Protocol:</span>
          <select
            value={selectedProtocol?.id || ''}
            onChange={e => {
              const proto = generatedProtocols.find(p => p.id === e.target.value);
              setSelectedProtocol(proto || null);
            }}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {generatedProtocols.map(proto => (
              <option key={proto.id} value={proto.id}>
                {proto.protocolNumber} - {proto.title} ({proto.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Content */}
      <div>
        {activeTab === 'generator' && (
          <GeneratorForm onGenerate={handleGenerate} defaultSystem={defaultSystem} />
        )}

        {activeTab === 'overview' && selectedProtocol && selectedSummary && (
          <div className="space-y-6">
            {/* Protocol Info */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <ProtocolTypeBadge type={selectedProtocol.type} />
                    <StatusBadge status={selectedProtocol.status} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedProtocol.title}</h3>
                  <p className="text-slate-500">{selectedProtocol.protocolNumber} • Version {selectedProtocol.version}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div>Created: {selectedProtocol.metadata.createdAt.toLocaleDateString()}</div>
                  <div>Owner: {selectedProtocol.metadata.owner}</div>
                </div>
              </div>
            </div>

            {/* Summary */}
            <SummaryCard summary={selectedSummary} />

            {/* System Info */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">System Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-slate-500">System Name</div>
                  <div className="font-medium">{selectedProtocol.system.name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Version</div>
                  <div className="font-medium">{selectedProtocol.system.version}</div>
                </div>
                <div>
                  <div className="text-slate-500">GAMP Category</div>
                  <div className="font-medium">
                    Cat {selectedProtocol.system.gampCategory} - {getGAMPCategoryDescription(selectedProtocol.system.gampCategory)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Environment</div>
                  <div className="font-medium capitalize">{selectedProtocol.system.environment}</div>
                </div>
              </div>
            </div>

            {/* Results by Category */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Results by Category</h3>
              <div className="space-y-3">
                {Object.entries(
                  selectedProtocol.testCases.reduce((acc, tc) => {
                    if (!acc[tc.category]) {
                      acc[tc.category] = { total: 0, pass: 0, fail: 0, other: 0 };
                    }
                    acc[tc.category].total++;
                    if (tc.result === 'pass') acc[tc.category].pass++;
                    else if (tc.result === 'fail') acc[tc.category].fail++;
                    else acc[tc.category].other++;
                    return acc;
                  }, {} as Record<string, { total: number; pass: number; fail: number; other: number }>)
                ).map(([category, counts]) => {
                  const Icon = CATEGORY_ICONS[category] || FileText;
                  const passPercent = counts.total > 0 ? (counts.pass / counts.total) * 100 : 0;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-medium w-48">{getTestCategoryDisplayName(category as TestCategory)}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${passPercent}%` }}
                        />
                      </div>
                      <span className="text-sm text-slate-500 w-20 text-right">
                        {counts.pass}/{counts.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'test-cases' && selectedProtocol && (
          <TestCaseList testCases={selectedProtocol.testCases} />
        )}

        {activeTab === 'sections' && selectedProtocol && (
          <div className="space-y-4">
            {selectedProtocol.sections.map(section => (
              <div key={section.id} className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="font-semibold text-slate-900 mb-2">
                  {section.number} {section.title}
                </h3>
                <div className="prose prose-sm prose-slate max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-slate-600 font-sans">
                    {section.content}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-slate-400 text-center pt-4 border-t border-slate-200">
        Ligature IQ/OQ/PQ Protocol Generator v0.24.10 • GAMP 5 Compliant
      </div>
    </div>
  );
}

export default ValidationProtocolPanel;
