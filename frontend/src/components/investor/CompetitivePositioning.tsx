
// ============================================================================
// Competitive Positioning Component - v144
// Investor-facing comparison of Ligature vs. legacy systems
// ============================================================================

import { useState } from 'react';
import { 
  CheckCircle, XCircle, MinusCircle, ArrowRight, TrendingUp, Clock, 
  DollarSign, Users, Zap, Shield, Database, GitBranch, RefreshCw,
  FileText, AlertTriangle, Globe, Layers, Brain, Workflow
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

// ============================================================================
// Types
// ============================================================================

type ComparisonRating = 'full' | 'partial' | 'none';

interface ComparisonFeature {
  id: string;
  name: string;
  description: string;
  category: 'data' | 'workflow' | 'intelligence' | 'integration' | 'compliance';
  ligature: ComparisonRating;
  veeva: ComparisonRating;
  legacy: ComparisonRating;
  ligatureNote?: string;
  veevaNote?: string;
  legacyNote?: string;
}

interface ROIMetric {
  id: string;
  label: string;
  legacy: string;
  ligature: string;
  improvement: string;
  icon: React.ReactNode;
}

interface TransformationStep {
  phase: string;
  legacy: string;
  ligature: string;
  timeSaved: string;
}

// ============================================================================
// Data
// ============================================================================

const comparisonFeatures: ComparisonFeature[] = [
  // Data Architecture
  {
    id: 'data-model',
    name: 'Unified Data Model',
    description: 'Single source of truth across R&D functions',
    category: 'data',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'Native cross-module data graph',
    veevaNote: 'Vault-specific silos',
    legacyNote: 'Disconnected databases',
  },
  {
    id: 'real-time-sync',
    name: 'Real-Time Data Synchronization',
    description: 'Instant updates across all modules and users',
    category: 'data',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'Sub-second propagation',
    veevaNote: 'Batch sync intervals',
    legacyNote: 'Manual reconciliation',
  },
  {
    id: 'audit-trail',
    name: '21 CFR Part 11 Audit Trail',
    description: 'Complete, tamper-evident activity logging',
    category: 'compliance',
    ligature: 'full',
    veeva: 'full',
    legacy: 'partial',
    ligatureNote: 'Blockchain-anchored',
    veevaNote: 'Standard compliance',
    legacyNote: 'Basic logging',
  },
  // Workflow
  {
    id: 'workflow-automation',
    name: 'Intelligent Workflow Automation',
    description: 'AI-driven task routing and escalation',
    category: 'workflow',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'ML-optimized routing',
    veevaNote: 'Rule-based only',
    legacyNote: 'Manual handoffs',
  },
  {
    id: 'cross-module-workflow',
    name: 'Cross-Module Workflows',
    description: 'Seamless processes spanning regulatory, clinical, safety',
    category: 'workflow',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'Native orchestration',
    veevaNote: 'Custom integration required',
    legacyNote: 'Not possible',
  },
  {
    id: 'parallel-processing',
    name: 'Parallel Review Streams',
    description: 'Concurrent multi-stakeholder review and approval',
    category: 'workflow',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'partial',
    ligatureNote: 'Optimized concurrency',
    veevaNote: 'Limited parallelism',
    legacyNote: 'Sequential only',
  },
  // Intelligence
  {
    id: 'ai-insights',
    name: 'AI-Powered Insights',
    description: 'Proactive recommendations and anomaly detection',
    category: 'intelligence',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'Embedded AI across platform',
    veevaNote: 'Add-on modules',
    legacyNote: 'No AI capabilities',
  },
  {
    id: 'predictive-analytics',
    name: 'Predictive Analytics',
    description: 'Forecast timelines, risks, and outcomes',
    category: 'intelligence',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'ML models trained on pharma data',
    veevaNote: 'Basic reporting',
    legacyNote: 'Historical reports only',
  },
  {
    id: 'auto-qc',
    name: 'Automated Quality Checks',
    description: 'Real-time validation during document authoring',
    category: 'intelligence',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: '150+ automated checks',
    veevaNote: 'Template validation',
    legacyNote: 'Manual QC only',
  },
  // Integration
  {
    id: 'ectd-native',
    name: 'Native eCTD Generation',
    description: 'Direct submission-ready output without conversion',
    category: 'integration',
    ligature: 'full',
    veeva: 'full',
    legacy: 'partial',
    ligatureNote: 'Real-time validation',
    veevaNote: 'Vault RIM integration',
    legacyNote: 'Third-party tools',
  },
  {
    id: 'gateway-integration',
    name: 'HA Gateway Integration',
    description: 'Direct submission to FDA, EMA, PMDA, etc.',
    category: 'integration',
    ligature: 'full',
    veeva: 'full',
    legacy: 'partial',
    ligatureNote: 'One-click submission',
    veevaNote: 'Standard gateways',
    legacyNote: 'Manual upload',
  },
  {
    id: 'safety-db-integration',
    name: 'Safety Database Integration',
    description: 'Bidirectional sync with Argus, ArisG, etc.',
    category: 'integration',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'Native connectors',
    veevaNote: 'Custom development',
    legacyNote: 'CSV exports',
  },
  // Compliance
  {
    id: 'global-compliance',
    name: 'Multi-Region Compliance',
    description: 'ICH, FDA, EMA, PMDA requirements built-in',
    category: 'compliance',
    ligature: 'full',
    veeva: 'full',
    legacy: 'partial',
    ligatureNote: 'Auto-adapting rules',
    veevaNote: 'Configured per region',
    legacyNote: 'Manual compliance',
  },
  {
    id: 'continuous-validation',
    name: 'Continuous Validation',
    description: 'Ongoing compliance verification vs. periodic audits',
    category: 'compliance',
    ligature: 'full',
    veeva: 'partial',
    legacy: 'none',
    ligatureNote: 'Real-time validation',
    veevaNote: 'Periodic validation',
    legacyNote: 'Annual audits',
  },
];

const roiMetrics: ROIMetric[] = [
  {
    id: 'submission-time',
    label: 'Submission Preparation Time',
    legacy: '6-9 months',
    ligature: '3-4 months',
    improvement: '50% faster',
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: 'review-cycles',
    label: 'Document Review Cycles',
    legacy: '4-6 cycles',
    ligature: '2-3 cycles',
    improvement: '50% fewer',
    icon: <RefreshCw className="w-5 h-5" />,
  },
  {
    id: 'ha-queries',
    label: 'HA Query Response Time',
    legacy: '15-20 days',
    ligature: '5-7 days',
    improvement: '65% faster',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'fte-efficiency',
    label: 'FTE Efficiency Gain',
    legacy: 'Baseline',
    ligature: '+40%',
    improvement: '40% more output',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'error-rate',
    label: 'Submission Error Rate',
    legacy: '15-25%',
    ligature: '<5%',
    improvement: '75% reduction',
    icon: <Shield className="w-5 h-5" />,
  },
  {
    id: 'cost-per-submission',
    label: 'Cost per Submission',
    legacy: '$2.5-4M',
    ligature: '$1.2-1.8M',
    improvement: '55% savings',
    icon: <DollarSign className="w-5 h-5" />,
  },
];

const transformationSteps: TransformationStep[] = [
  {
    phase: 'Document Authoring',
    legacy: 'Word docs emailed between authors, tracked changes chaos',
    ligature: 'Collaborative authoring with real-time co-editing, AI suggestions',
    timeSaved: '60%',
  },
  {
    phase: 'Review & Approval',
    legacy: 'Sequential routing, lost in email, status unknown',
    ligature: 'Parallel reviews, real-time tracking, automated escalation',
    timeSaved: '50%',
  },
  {
    phase: 'Quality Control',
    legacy: 'Manual checklist, catch issues at end of process',
    ligature: 'Continuous validation, issues caught during authoring',
    timeSaved: '70%',
  },
  {
    phase: 'Submission Assembly',
    legacy: 'Manual eCTD compilation, third-party tools, validation loops',
    ligature: 'Auto-assembly from authored content, real-time validation',
    timeSaved: '65%',
  },
  {
    phase: 'HA Response',
    legacy: 'Search across silos, recreate context, manual compilation',
    ligature: 'AI-assisted response drafting, instant context retrieval',
    timeSaved: '70%',
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

const RatingIcon = ({ rating }: { rating: ComparisonRating }) => {
  switch (rating) {
    case 'full':
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    case 'partial':
      return <MinusCircle className="w-5 h-5 text-amber-400" />;
    case 'none':
      return <XCircle className="w-5 h-5 text-red-400" />;
  }
};

const CategoryIcon = ({ category }: { category: ComparisonFeature['category'] }) => {
  switch (category) {
    case 'data':
      return <Database className="w-4 h-4" />;
    case 'workflow':
      return <Workflow className="w-4 h-4" />;
    case 'intelligence':
      return <Brain className="w-4 h-4" />;
    case 'integration':
      return <GitBranch className="w-4 h-4" />;
    case 'compliance':
      return <Shield className="w-4 h-4" />;
  }
};

const categoryColors: Record<ComparisonFeature['category'], string> = {
  data: 'blue',
  workflow: 'purple',
  intelligence: 'teal',
  integration: 'orange',
  compliance: 'green',
};

// ============================================================================
// Main Component
// ============================================================================

type ViewMode = 'comparison' | 'roi' | 'transformation';

export function CompetitivePositioning() {
  const [activeView, setActiveView] = useState<ViewMode>('comparison');
  const [selectedCategory, setSelectedCategory] = useState<ComparisonFeature['category'] | 'all'>('all');
  const [showDetails, setShowDetails] = useState(false);

  const filteredFeatures = selectedCategory === 'all' 
    ? comparisonFeatures 
    : comparisonFeatures.filter(f => f.category === selectedCategory);

  const categories: { id: ComparisonFeature['category'] | 'all'; label: string }[] = [
    { id: 'all', label: 'All Features' },
    { id: 'data', label: 'Data Architecture' },
    { id: 'workflow', label: 'Workflows' },
    { id: 'intelligence', label: 'AI & Intelligence' },
    { id: 'integration', label: 'Integration' },
    { id: 'compliance', label: 'Compliance' },
  ];

  // Calculate scores
  const calculateScore = (system: 'ligature' | 'veeva' | 'legacy') => {
    const scores = comparisonFeatures.map(f => {
      const rating = f[system];
      return rating === 'full' ? 2 : rating === 'partial' ? 1 : 0;
    });
    const total = scores.reduce((a: number, b: number) => a + b, 0);
    const max = comparisonFeatures.length * 2;
    return Math.round((total / max) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">Competitive Positioning</h2>
          <p className="text-sm text-text-muted mt-1">
            How Ligature transforms pharmaceutical R&D vs. legacy approaches
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(['comparison', 'roi', 'transformation'] as ViewMode[]).map((view) => (
            <Button
              key={view}
              variant={activeView === view ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveView(view)}
            >
              {view === 'comparison' && 'Feature Comparison'}
              {view === 'roi' && 'ROI Analysis'}
              {view === 'transformation' && 'Transformation'}
            </Button>
          ))}
        </div>
      </div>

      {/* Comparison View */}
      {activeView === 'comparison' && (
        <div className="space-y-4">
          {/* Score Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-accent-teal/50 bg-accent-teal/5">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-accent-teal">{calculateScore('ligature')}%</div>
                <div className="text-sm font-medium text-text-primary mt-1">Ligature IDOP</div>
                <div className="text-xs text-text-muted">Full Platform Score</div>
              </CardContent>
            </Card>
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-amber-400">{calculateScore('veeva')}%</div>
                <div className="text-sm font-medium text-text-primary mt-1">Veeva Vault</div>
                <div className="text-xs text-text-muted">Enterprise Suite</div>
              </CardContent>
            </Card>
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-red-400">{calculateScore('legacy')}%</div>
                <div className="text-sm font-medium text-text-primary mt-1">Legacy Systems</div>
                <div className="text-xs text-text-muted">Point Solutions</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.id !== 'all' && <CategoryIcon category={cat.id as ComparisonFeature['category']} />}
                <span className="ml-1">{cat.label}</span>
              </Button>
            ))}
            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </div>

          {/* Comparison Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">
                      Feature
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-accent-teal uppercase tracking-wider w-32">
                      Ligature
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-amber-400 uppercase tracking-wider w-32">
                      Veeva
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-red-400 uppercase tracking-wider w-32">
                      Legacy
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFeatures.map((feature) => (
                    <tr key={feature.id} className="hover:bg-surface-card/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          <Badge color={categoryColors[feature.category] as any} size="xs">
                            <CategoryIcon category={feature.category} />
                          </Badge>
                          <div>
                            <div className="text-sm font-medium text-text-primary">{feature.name}</div>
                            <div className="text-xs text-text-muted">{feature.description}</div>
                            {showDetails && (
                              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                                {feature.ligatureNote && (
                                  <div className="text-accent-teal">{feature.ligatureNote}</div>
                                )}
                                {feature.veevaNote && (
                                  <div className="text-amber-400">{feature.veevaNote}</div>
                                )}
                                {feature.legacyNote && (
                                  <div className="text-red-400">{feature.legacyNote}</div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RatingIcon rating={feature.ligature} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RatingIcon rating={feature.veeva} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RatingIcon rating={feature.legacy} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 text-sm text-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Full Support</span>
            </div>
            <div className="flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-amber-400" />
              <span>Partial / Limited</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              <span>Not Available</span>
            </div>
          </div>
        </div>
      )}

      {/* ROI View */}
      {activeView === 'roi' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-text-primary">Return on Investment Analysis</h3>
              <p className="text-sm text-text-muted">
                Quantified improvements from transitioning to Ligature IDOP
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {roiMetrics.map((metric) => (
                  <div 
                    key={metric.id}
                    className="flex items-center gap-4 p-4 bg-surface-card rounded-lg border border-border"
                  >
                    <div className="p-3 bg-accent-teal/10 rounded-lg text-accent-teal">
                      {metric.icon}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text-primary">{metric.label}</div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="text-xs">
                          <span className="text-text-muted">Legacy: </span>
                          <span className="text-red-400 font-medium">{metric.legacy}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-text-muted" />
                        <div className="text-xs">
                          <span className="text-text-muted">Ligature: </span>
                          <span className="text-green-400 font-medium">{metric.ligature}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge color="green" size="sm">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {metric.improvement}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ROI Calculator Preview */}
          <Card className="border-accent-teal/30 bg-gradient-to-br from-accent-teal/5 to-transparent">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-accent-teal/20 rounded-xl">
                  <DollarSign className="w-8 h-8 text-accent-teal" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary">
                    Estimated Annual Savings
                  </h3>
                  <p className="text-sm text-text-muted">
                    Based on 3-4 major submissions per year for a mid-size pharma
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-accent-teal">$4.2M - $6.8M</div>
                  <div className="text-sm text-text-muted">per year</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transformation View */}
      {activeView === 'transformation' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-text-primary">Process Transformation</h3>
              <p className="text-sm text-text-muted">
                How each phase of regulatory operations changes with Ligature
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {transformationSteps.map((step, index) => (
                  <div key={step.phase} className="relative">
                    {index < transformationSteps.length - 1 && (
                      <div className="absolute left-6 top-12 bottom-0 w-px bg-border" />
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-teal/10 border-2 border-accent-teal flex items-center justify-center">
                        <span className="text-lg font-bold text-accent-teal">{index + 1}</span>
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-base font-medium text-text-primary">{step.phase}</h4>
                          <Badge color="green" size="sm">
                            <Clock className="w-3 h-3 mr-1" />
                            {step.timeSaved} time saved
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <XCircle className="w-4 h-4 text-red-400" />
                              <span className="text-xs font-medium text-red-400 uppercase">Legacy</span>
                            </div>
                            <p className="text-sm text-text-secondary">{step.legacy}</p>
                          </div>
                          <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-xs font-medium text-green-400 uppercase">Ligature</span>
                            </div>
                            <p className="text-sm text-text-secondary">{step.ligature}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Differentiators */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-accent-teal/30">
              <CardContent className="p-4 text-center">
                <Layers className="w-8 h-8 text-accent-teal mx-auto mb-2" />
                <h4 className="text-sm font-medium text-text-primary">Data-Centric</h4>
                <p className="text-xs text-text-muted mt-1">
                  Documents emerge from data, not the other way around
                </p>
              </CardContent>
            </Card>
            <Card className="border-purple-500/30">
              <CardContent className="p-4 text-center">
                <Brain className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h4 className="text-sm font-medium text-text-primary">AI-Native</h4>
                <p className="text-xs text-text-muted mt-1">
                  Intelligence embedded throughout, not bolted on
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-500/30">
              <CardContent className="p-4 text-center">
                <Globe className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <h4 className="text-sm font-medium text-text-primary">Global-Ready</h4>
                <p className="text-xs text-text-muted mt-1">
                  Multi-region compliance from day one
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompetitivePositioning;
