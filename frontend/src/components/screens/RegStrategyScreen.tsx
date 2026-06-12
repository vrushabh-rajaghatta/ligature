

import { useState, useMemo } from 'react';
import {
  Globe, Bell, AlertTriangle, Target, Shield, Rss,
  CheckCircle, ExternalLink, FileText, Link2, Lightbulb, Pill, Plus, RefreshCw,
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { StrategyImpactPanel } from '@/components/strategy/StrategyImpactPanel';
import { useDeadClick } from '@/hooks/useDeadClick';

// ============================================================================
// TYPES
// ============================================================================

type IntelCategory = 'guidance' | 'safety-communication' | 'policy' | 'q-and-a' | 'draft-guidance';
type ImpactLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';
type AssumptionStatus = 'valid' | 'at-risk' | 'invalidated';
type RiskStatus = 'open' | 'mitigated' | 'closed';
type AlertStatus = 'new' | 'reviewing' | 'actioned' | 'noted';

interface IntelAlert {
  id: string;
  title: string;
  summary: string;
  category: IntelCategory;
  source: string;
  date: string;
  impactLevel: ImpactLevel;
  actionRequired: boolean;
  status: AlertStatus;
  regions: string[];
  aiAssessment?: string;
  impactedProducts: string[];
  impactedDocuments: string[];
}

interface StrategyAssumption {
  id: string;
  assumption: string;
  category: string;
  status: AssumptionStatus;
  lastValidated: string;
  linkedIntel: string[];
}

interface RegulatoryRisk {
  id: string;
  risk: string;
  probability: 'high' | 'medium' | 'low';
  impact: 'critical' | 'major' | 'moderate' | 'minor';
  mitigation: string;
  owner: string;
  status: RiskStatus;
}

// ============================================================================
// STATIC DATA
// ============================================================================

const categoryInfo: Record<IntelCategory, { icon: React.ReactNode; name: string; color: string }> = {
  'guidance':             { icon: <FileText className="w-3 h-3" />,    name: 'Guidance',       color: 'text-blue-400' },
  'safety-communication': { icon: <AlertTriangle className="w-3 h-3" />, name: 'Safety Comm',  color: 'text-red-400' },
  'policy':               { icon: <Shield className="w-3 h-3" />,      name: 'Policy',         color: 'text-violet-400' },
  'q-and-a':              { icon: <CheckCircle className="w-3 h-3" />, name: 'Q&A',             color: 'text-emerald-400' },
  'draft-guidance':       { icon: <FileText className="w-3 h-3" />,    name: 'Draft Guidance', color: 'text-amber-400' },
};

const sourceInfo: Record<string, { logo: string; name: string; color: string }> = {
  'FDA':          { logo: '🇺🇸', name: 'FDA',           color: '#1d4ed8' },
  'EMA':          { logo: '🇪🇺', name: 'EMA',           color: '#7c3aed' },
  'PMDA':         { logo: '🇯🇵', name: 'PMDA',          color: '#dc2626' },
  'ICH':          { logo: '🌐', name: 'ICH',             color: '#0891b2' },
  'MHRA':         { logo: '🇬🇧', name: 'MHRA',          color: '#059669' },
  'Health Canada':{ logo: '🇨🇦', name: 'Health Canada', color: '#d97706' },
};

const regionFlags: Record<string, string> = {
  US: '🇺🇸', EU: '🇪🇺', Japan: '🇯🇵', Canada: '🇨🇦', UK: '🇬🇧', Global: '🌐',
};

const INTEL_ALERTS: IntelAlert[] = [
  {
    id: 'alert-001',
    title: 'FDA Draft Guidance: Real-World Evidence in NDA Submissions',
    summary: 'FDA has released draft guidance outlining new expectations for integrating real-world evidence (RWE) into NDA submissions, including data quality standards and statistical methodologies.',
    category: 'draft-guidance',
    source: 'FDA',
    date: '2026-02-18',
    impactLevel: 'high',
    actionRequired: true,
    status: 'new',
    regions: ['US'],
    aiAssessment: 'This guidance directly impacts the NDA submission for Nexavant (LIG-2847). The RWE requirements may necessitate updates to Module 5 clinical summaries and the statistical analysis plan. Recommend reviewing with biostats team.',
    impactedProducts: ['LIG-2847 (ligrastinib)'],
    impactedDocuments: ['Module 5 Clinical Study Reports', 'Statistical Analysis Plan', 'Integrated Summary of Efficacy'],
  },
  {
    id: 'alert-002',
    title: 'EMA Revised CHMP Guidelines on Oncology Endpoints',
    summary: 'The Committee for Medicinal Products for Human Use has updated its oncology endpoint guidance, introducing new requirements for overall survival data maturity in MAA submissions.',
    category: 'guidance',
    source: 'EMA',
    date: '2026-02-12',
    impactLevel: 'critical',
    actionRequired: true,
    status: 'reviewing',
    regions: ['EU'],
    aiAssessment: 'Critical impact on MAA for LIG-2847. The updated OS data maturity requirements may require extending the data cut-off, potentially delaying the EU submission by 3-6 months. Escalation to regulatory leadership recommended.',
    impactedProducts: ['LIG-2847 (ligrastinib)'],
    impactedDocuments: ['Clinical Overview', 'Module 5 CSRs', 'MAA Cover Letter'],
  },
  {
    id: 'alert-003',
    title: 'ICH M4E(R2) — Updated eCTD Common Technical Document Structure',
    summary: 'ICH has published M4E(R2) with revised CTD structure requirements affecting Module 2 summaries and the organisation of clinical data packages.',
    category: 'guidance',
    source: 'ICH',
    date: '2026-02-05',
    impactLevel: 'medium',
    actionRequired: false,
    status: 'noted',
    regions: ['US', 'EU', 'Japan'],
    aiAssessment: 'Affects all three submissions. Primarily a formatting update — existing content should remain valid. Recommend reviewing Module 2 template with publishing team.',
    impactedProducts: ['LIG-2847 (ligrastinib)', 'LIG-3901 (CardioShield)'],
    impactedDocuments: ['Module 2 Summaries', 'eCTD Sequence Templates'],
  },
  {
    id: 'alert-004',
    title: 'PMDA Safety Communication: Hepatotoxicity Monitoring in Kinase Inhibitors',
    summary: 'PMDA issued a safety communication requiring enhanced hepatotoxicity monitoring data in J-NDA submissions for kinase inhibitor class compounds.',
    category: 'safety-communication',
    source: 'PMDA',
    date: '2026-01-28',
    impactLevel: 'high',
    actionRequired: true,
    status: 'reviewing',
    regions: ['Japan'],
    aiAssessment: 'Ligrastinib is a kinase inhibitor — this communication directly applies to the J-NDA. The safety pharmacovigilance team should review existing hepatotoxicity data and assess whether additional analyses are required.',
    impactedProducts: ['LIG-2847 (ligrastinib)'],
    impactedDocuments: ['Module 2.7.4 Summary of Clinical Safety', 'Risk Management Plan'],
  },
  {
    id: 'alert-005',
    title: 'FDA Policy Update: Electronic Submission Gateway v4.0',
    summary: 'FDA has announced ESG v4.0 deployment scheduled for Q2 2026, with updated technical requirements for eCTD submission packages.',
    category: 'policy',
    source: 'FDA',
    date: '2026-01-15',
    impactLevel: 'low',
    actionRequired: false,
    status: 'noted',
    regions: ['US'],
    aiAssessment: 'Technical infrastructure update. Coordinate with publishing team to ensure submission tooling is updated before the NDA submission window.',
    impactedProducts: ['LIG-2847 (ligrastinib)', 'LIG-3901 (CardioShield)'],
    impactedDocuments: ['eCTD Submission Package'],
  },
];

const STRATEGY_ASSUMPTIONS: StrategyAssumption[] = [
  {
    id: 'sa-001',
    assumption: 'FDA will accept the surrogate endpoint (PFS) as the primary basis for Accelerated Approval for LIG-2847',
    category: 'Regulatory',
    status: 'valid',
    lastValidated: '2026-02-10',
    linkedIntel: ['alert-001'],
  },
  {
    id: 'sa-002',
    assumption: 'EMA CHMP will not require additional OS data maturity beyond the 12-month minimum for MAA filing',
    category: 'Regulatory',
    status: 'at-risk',
    lastValidated: '2026-02-12',
    linkedIntel: ['alert-002'],
  },
  {
    id: 'sa-003',
    assumption: 'PMDA will accept the global clinical data package without additional Japan-specific bridging studies',
    category: 'Clinical',
    status: 'valid',
    lastValidated: '2026-01-20',
    linkedIntel: [],
  },
  {
    id: 'sa-004',
    assumption: 'CMC manufacturing process comparability data from the scale-up batch will satisfy all agency requirements',
    category: 'CMC',
    status: 'valid',
    lastValidated: '2026-02-01',
    linkedIntel: [],
  },
  {
    id: 'sa-005',
    assumption: 'No new major safety signals will emerge from the ongoing LIG-301 extension study prior to NDA filing',
    category: 'Safety',
    status: 'at-risk',
    lastValidated: '2026-02-20',
    linkedIntel: ['alert-004'],
  },
];

const REGULATORY_RISKS: RegulatoryRisk[] = [
  {
    id: 'risk-001',
    risk: 'EMA requires OS data maturity beyond current data cut, delaying MAA filing by 3-6 months',
    probability: 'high',
    impact: 'critical',
    mitigation: 'Engage EMA in Type C meeting to clarify OS data expectations. Prepare contingency timeline with 6-month buffer.',
    owner: 'Dr. Sarah Mitchell',
    status: 'open',
  },
  {
    id: 'risk-002',
    risk: 'FDA issues Complete Response Letter requesting additional hepatotoxicity data',
    probability: 'medium',
    impact: 'major',
    mitigation: 'Proactive FDA meeting to discuss hepatotoxicity risk management. Ensure REMS documentation is comprehensive.',
    owner: 'James Park',
    status: 'open',
  },
  {
    id: 'risk-003',
    risk: 'PMDA requests bridging study due to ethnic differences in PK profile',
    probability: 'medium',
    impact: 'major',
    mitigation: 'Population PK analysis inclusive of Japanese patients already planned. Engage PMDA early for feedback.',
    owner: 'Dr. Sarah Mitchell',
    status: 'open',
  },
  {
    id: 'risk-004',
    risk: 'Manufacturing scale-up comparability data insufficient for CMC sections',
    probability: 'low',
    impact: 'moderate',
    mitigation: 'Additional comparability testing protocol approved. Results expected Q1 2026.',
    owner: 'Elena Rodriguez',
    status: 'mitigated',
  },
];

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function getImpactLevelBadge(level: ImpactLevel) {
  const config = {
    critical: { color: 'red' as const, label: 'Critical' },
    high:     { color: 'amber' as const, label: 'High' },
    medium:   { color: 'blue' as const, label: 'Medium' },
    low:      { color: 'blue' as const, label: 'Low' },
    none:     { color: 'blue' as const, label: 'None' },
  };
  const c = config[level] ?? config.none;
  return <Badge color={c.color} size="sm">{c.label}</Badge>;
}

function getAssumptionStatusBadge(status: AssumptionStatus) {
  if (status === 'valid')       return <Badge color="green" size="sm"><CheckCircle className="w-3 h-3 mr-1 inline" />Valid</Badge>;
  if (status === 'at-risk')     return <Badge color="amber" size="sm"><AlertTriangle className="w-3 h-3 mr-1 inline" />At Risk</Badge>;
  return <Badge color="red" size="sm">Invalidated</Badge>;
}

function getProbabilityBadge(p: 'high' | 'medium' | 'low') {
  const colors = { high: 'red', medium: 'amber', low: 'slate' } as const;
  return <Badge color={colors[p]} size="sm">{p.charAt(0).toUpperCase() + p.slice(1)}</Badge>;
}

function getRiskImpactBadge(impact: 'critical' | 'major' | 'moderate' | 'minor') {
  const colors = { critical: 'red', major: 'amber', moderate: 'blue', minor: 'slate' } as const;
  return <Badge color={colors[impact]} size="sm">{impact.charAt(0).toUpperCase() + impact.slice(1)}</Badge>;
}

function getRiskStatusBadge(status: RiskStatus) {
  if (status === 'open')      return <Badge color="red" size="sm">Open</Badge>;
  if (status === 'mitigated') return <Badge color="amber" size="sm">Mitigated</Badge>;
  return <Badge color="slate" size="sm">Closed</Badge>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function RegStrategyScreen() {
  const toast = useToast();
    const { deadClick } = useDeadClick();
  const [viewMode, setViewMode] = useState<'intel' | 'impacts' | 'strategy' | 'risks'>('intel');
  const [selectedProduct, setSelectedProduct] = useState('LIG-2847');
  const [intelFilter, setIntelFilter] = useState<'all' | IntelCategory>('all');
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null);

  const intelAlerts = INTEL_ALERTS;
  const strategyAssumptions = STRATEGY_ASSUMPTIONS;
  const risks = REGULATORY_RISKS;

  const criticalAlerts = useMemo(
    () => intelAlerts.filter(a => a.impactLevel === 'critical' || a.actionRequired).length,
    [intelAlerts]
  );

  const filteredAlerts = useMemo(
    () => intelFilter === 'all' ? intelAlerts : intelAlerts.filter(a => a.category === intelFilter),
    [intelAlerts, intelFilter]
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full">
      <ScreenHeader
        moduleId="strategy"
        title="Regulatory Strategy & Intelligence"
        subtitle="Monitor the regulatory landscape, manage strategic assumptions, and track impact analysis"
        icon={<Globe className="w-5 h-5" />}
      />
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-border bg-surface">
        {/* v116: Breadcrumb navigation */}
        <Breadcrumb 
          moduleId="strategy" 
          viewLabel={viewMode === 'intel' ? 'Intelligence' : viewMode === 'strategy' ? 'Strategy' : viewMode === 'risks' ? 'Risks' : viewMode === 'impacts' ? 'Impact Analysis' : 'Dashboard'}
          className="mb-4"
        />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">Regulatory Strategy & Intelligence</h1>
            <p className="text-sm text-text-muted mt-1">Monitor regulatory landscape and manage strategic assumptions</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Product Selector */}
            <Select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              options={[
                { value: 'LIG-2847', label: 'LIG-2847 (ligrastinib)' },
                { value: 'LIG-3021', label: 'LIG-3021 (ligatinib)' },
                { value: 'LIG-5567', label: 'LIG-5567 (ligrare)' },
              ]}
            />
            <Button 
              variant="secondary" 
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => {
                toast.info('Syncing intelligence feeds...');
                setTimeout(() => toast.success('Intel feed updated'), 1500);
              }}
            >
              Sync Intel
            </Button>
          </div>
        </div>

        {/* Stats - v0.124.5: Compact single-row strip replaces tall cards */}
        <div className="flex items-stretch bg-surface-elevated border border-border rounded-xl overflow-hidden divide-x divide-border">
          {[
            { label: 'Intel Sources', value: '6', sub: 'All connected', subColor: 'text-accent-green', icon: <Rss className="w-4 h-4" />, accent: 'text-accent-blue', onClick: () => setViewMode('intel') },
            { label: 'New Alerts', value: String(intelAlerts.filter(a => a.status === 'new').length), sub: 'Last 30 days', subColor: 'text-text-muted', icon: <Bell className="w-4 h-4" />, accent: 'text-accent-amber', onClick: () => setViewMode('intel') },
            { label: 'Critical', value: String(criticalAlerts), sub: 'Action required', subColor: 'text-text-muted', icon: <AlertTriangle className="w-4 h-4" />, accent: 'text-accent-red', onClick: () => setViewMode('intel') },
            { label: 'Impacts', value: '3', sub: '2 pending review', subColor: 'text-accent-amber', icon: <Link2 className="w-4 h-4" />, accent: 'text-accent-purple', onClick: () => setViewMode('impacts') },
            { label: 'Assumptions', value: String(strategyAssumptions.length), sub: `${strategyAssumptions.filter(a => a.status === 'at-risk').length} at risk`, subColor: 'text-accent-amber', icon: <Target className="w-4 h-4" />, accent: 'text-accent-teal', onClick: () => setViewMode('strategy') },
            { label: 'Open Risks', value: String(risks.filter(r => r.status === 'open').length), sub: 'Being monitored', subColor: 'text-text-muted', icon: <Shield className="w-4 h-4" />, accent: 'text-accent-blue', onClick: () => setViewMode('risks') },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-surface-card transition-colors group text-left"
            >
              <span className={`${stat.accent} opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0`}>{stat.icon}</span>
              <div className="min-w-0">
                <div className="text-xs text-text-muted uppercase tracking-wide font-medium leading-none mb-1">{stat.label}</div>
                <div className={`text-xl font-bold leading-none ${stat.accent}`}>{stat.value}</div>
                <div className={`text-xs mt-1 leading-none ${stat.subColor}`}>{stat.sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 mt-4">
          <div className="flex bg-surface-card rounded-lg p-1">
            <Button
              variant={viewMode === 'intel' ? 'primary' : 'ghost'}
              size="sm"
              icon={<Rss className="w-4 h-4" />}
              onClick={() => setViewMode('intel')}
            >
              Intel Feed
            </Button>
            <Button
              variant={viewMode === 'impacts' ? 'primary' : 'ghost'}
              size="sm"
              icon={<Link2 className="w-4 h-4" />}
              onClick={() => setViewMode('impacts')}
            >
              Impact Analysis
            </Button>
            <Button
              variant={viewMode === 'strategy' ? 'primary' : 'ghost'}
              size="sm"
              icon={<Target className="w-4 h-4" />}
              onClick={() => setViewMode('strategy')}
            >
              Strategy
            </Button>
            <Button
              variant={viewMode === 'risks' ? 'primary' : 'ghost'}
              size="sm"
              icon={<Shield className="w-4 h-4" />}
              onClick={() => setViewMode('risks')}
            >
              Risks
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {viewMode === 'intel' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {/* Intel List */}
            <div className="col-span-1 md:col-span-2 space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Filter:</span>
                <Button
                  variant={intelFilter === 'all' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setIntelFilter('all')}
                >
                  All
                </Button>
                {Object.entries(categoryInfo).map(([key, info]) => (
                  <Button
                    key={key}
                    variant={intelFilter === key ? 'primary' : 'secondary'}
                    size="sm"
                    icon={info.icon}
                    onClick={() => setIntelFilter(key as IntelCategory)}
                  >
                    {info.name}
                  </Button>
                ))}
              </div>

              {/* Alerts */}
              <div className="space-y-3">
                {filteredAlerts.map(alert => {
                  const catInfo = categoryInfo[alert.category];
                  const srcInfo = sourceInfo[alert.source];
                  const isExpanded = expandedIntel === alert.id;

                  return (
                    <div 
                      key={alert.id} 
                      className={`bg-surface-elevated rounded-lg overflow-hidden border ${
                        alert.impactLevel === 'critical' ? 'border-accent-red/50' :
                        alert.impactLevel === 'high' ? 'border-accent-amber/50' :
                        'border-border'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedIntel(isExpanded ? null : alert.id)}
                        className="w-full p-4 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg`} style={{ backgroundColor: `${srcInfo?.color ?? ''}20` }}>
                            {srcInfo.logo}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`${catInfo?.color ?? ''}`}>{catInfo.icon}</span>
                              <span className="text-xs text-text-muted">{catInfo.name}</span>
                              <span className="text-xs text-text-muted">•</span>
                              <span className="text-xs text-text-muted">{srcInfo.name}</span>
                              {alert.actionRequired && alert.status !== 'actioned' && (
                                <Badge color="red" size="xs">Action Required</Badge>
                              )}
                            </div>
                            <h4 className="text-sm font-medium text-text-primary">{alert.title}</h4>
                            <p className="text-xs text-text-muted mt-1 line-clamp-2">{alert.summary}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="flex items-center gap-1 mb-1">
                              {alert.regions.map(r => (
                                <span key={r} className="text-sm">{regionFlags[r]}</span>
                              ))}
                            </div>
                            {getImpactLevelBadge(alert.impactLevel)}
                            <div className="text-xs text-text-muted mt-1">{alert.date}</div>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                          {/* AI Assessment */}
                          {alert.aiAssessment && (
                            <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-lg p-4">
                              <div className="flex items-center gap-2 text-accent-purple text-sm font-medium mb-2">
                                <Lightbulb className="w-4 h-4" />
                                AI Impact Assessment
                              </div>
                              <p className="text-sm text-text-secondary">{alert.aiAssessment}</p>
                            </div>
                          )}

                          {/* Impacted Items */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div>
                              <div className="text-xs font-medium text-text-muted mb-2">Impacted Products</div>
                              <div className="flex flex-wrap gap-2">
                                {alert.impactedProducts.map(p => (
                                  <Badge key={p} color="slate" size="sm" icon={<Pill className="w-3 h-3" />}>
                                    {p}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-text-muted mb-2">Impacted Documents</div>
                              <div className="flex flex-wrap gap-2">
                                {alert.impactedDocuments.map(d => (
                                  <Badge key={d} color="slate" size="sm" icon={<FileText className="w-3 h-3" />}>
                                    {d}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-3 pt-2">
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => {
                                toast.success('Action items created');
                              }}
                            >
                              Create Action Items
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => {
                                toast.info('Opening strategy linkage...');
                              }}
                            >
                              Link to Strategy
                            </Button>
                            {alert.source && (
                              <a 
                                href={alert.source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 text-sm text-accent-blue hover:underline flex items-center gap-1"
                              >
                                View Source <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="ml-auto"
                              onClick={() => {
                                toast.info('Alert dismissed');
                              }}
                            >
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connected Sources */}
            <div className="space-y-4">
              <div className="bg-surface-elevated rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Connected Intel Sources</h3>
                <div className="space-y-3">
                  {Object.entries(sourceInfo).map(([key, info]) => (
                    <div key={key} className="flex items-center gap-3 p-2 bg-surface-card rounded-lg">
                      <span className="text-xl">{info.logo}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-text-primary">{info.name}</div>
                        <Badge color="green" size="xs">Connected</Badge>
                      </div>
                      <CheckCircle className="w-4 h-4 text-accent-green" />
                    </div>
                  ))}
                </div>
                <Button
                  variant="secondary" 
                  size="sm" 
                  icon={<Plus className="w-4 h-4" />} 
                  className="w-full mt-4"
                  onClick={() => {
                    toast.info('Opening source configuration...');
                  }}
                >
                  Add Source
                </Button>
              </div>

              <div className="bg-surface-elevated rounded-lg p-4">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Alert Configuration</h3>
                <div className="space-y-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-text-secondary">Guidance updates</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-text-secondary">Competitor activity</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-text-secondary">Safety signals</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span className="text-text-secondary">Regulatory changes</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* v0.38.8: Impact Analysis View - Links Intel to Submissions */}
        {viewMode === 'impacts' && (
          <div className="h-full -m-6">
            <StrategyImpactPanel 
              productFilter={selectedProduct}
              onNavigateToSubmission={(submissionId) => {
                toast.info(`Navigating to submission ${submissionId}...`);
              }}
            />
          </div>
        )}

        {viewMode === 'strategy' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-surface-elevated rounded-lg p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Strategic Assumptions — {selectedProduct}</h3>
              <div className="space-y-3">
                {strategyAssumptions.map(assumption => (
                  <div 
                    key={assumption.id}
                    className={`p-4 rounded-lg border ${
                      assumption.status === 'valid' ? 'bg-accent-green/5 border-accent-green/30' :
                      assumption.status === 'at-risk' ? 'bg-accent-amber/5 border-accent-amber/30' :
                      'bg-accent-red/5 border-accent-red/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge color="slate" size="xs">{assumption.category}</Badge>
                          {assumption.linkedIntel && assumption.linkedIntel.length > 0 && (
                            <Badge color="purple" size="xs" icon={<Link2 className="w-3 h-3" />}>
                              {assumption.linkedIntel.length} intel linked
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-primary">{assumption.assumption}</p>
                        <div className="text-xs text-text-muted mt-2">Last validated: {assumption.lastValidated}</div>
                      </div>
                      {getAssumptionStatusBadge(assumption.status)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'risks' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-surface-elevated rounded-lg overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-lg font-semibold text-text-primary">Risk Register — {selectedProduct}</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surface-card">
                    <th className="text-left p-4 text-sm font-medium text-text-muted">Risk</th>
                    <th className="text-center p-4 text-sm font-medium text-text-muted">Probability</th>
                    <th className="text-center p-4 text-sm font-medium text-text-muted">Impact</th>
                    <th className="text-left p-4 text-sm font-medium text-text-muted">Mitigation</th>
                    <th className="text-left p-4 text-sm font-medium text-text-muted">Owner</th>
                    <th className="text-center p-4 text-sm font-medium text-text-muted">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map(risk => (
                    <tr key={risk.id} className="border-b border-border/50 hover:bg-surface-card/50">
                      <td className="p-4 text-sm text-text-primary">{risk.risk}</td>
                      <td className="p-4 text-center">
                        {getProbabilityBadge(risk.probability)}
                      </td>
                      <td className="p-4 text-center">
                        {getRiskImpactBadge(risk.impact)}
                      </td>
                      <td className="p-4 text-sm text-text-secondary">{risk.mitigation}</td>
                      <td className="p-4 text-sm text-text-muted">{risk.owner}</td>
                      <td className="p-4 text-center">
                        {getRiskStatusBadge(risk.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
