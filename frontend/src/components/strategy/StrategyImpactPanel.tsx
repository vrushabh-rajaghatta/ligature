// ============================================================================
// StrategyImpactPanel - v0.38.8
// Links Regulatory Intelligence to Submission Planning
// ============================================================================
// Shows how regulatory changes, guidance updates, and competitor activity
// impact submission timelines and document requirements
// ============================================================================


import React, { useState, useMemo, useCallback } from 'react';
import {
  AlertTriangle, TrendingUp, Shield, FileText, Calendar, ChevronRight,
  ChevronDown, Link2, Target, Clock, CheckCircle, XCircle, ArrowRight,
  Zap, Bell, Eye, Building2, BookOpen, Flag, Loader2, Plus, GitBranch,
  RefreshCw, ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';

// ============================================================================
// TYPES
// ============================================================================

export type ImpactCategory = 
  | 'guidance-change'      // FDA/EMA guidance update
  | 'competitor-approval'  // Competitor gets approval
  | 'competitor-rejection' // Competitor gets CRL
  | 'safety-signal'        // Class-wide safety signal
  | 'regulatory-pathway'   // New pathway available (e.g., RMAT, BTD)
  | 'requirement-change'   // CMC/clinical requirement change
  | 'deadline-change';     // Submission deadline affected

export type ImpactSeverity = 'critical' | 'high' | 'medium' | 'low';

export type ImpactStatus = 'new' | 'under-review' | 'action-planned' | 'resolved' | 'dismissed';

export interface IntelligenceInsight {
  id: string;
  title: string;
  summary: string;
  source: string;
  sourceUrl?: string;
  category: ImpactCategory;
  severity: ImpactSeverity;
  publishedDate: string;
  regions: string[];
}

export interface SubmissionImpact {
  id: string;
  insightId: string;
  submissionId: string;
  applicationNumber: string;
  productName: string;
  region: string;
  submissionType: string;
  
  // Impact details
  impactType: 'timeline' | 'content' | 'strategy' | 'resource';
  impactDescription: string;
  affectedModules: string[]; // CTD modules affected
  affectedDocuments: string[];
  
  // Timeline impact
  originalTargetDate?: string;
  revisedTargetDate?: string;
  daysImpact?: number;
  
  // Status
  status: ImpactStatus;
  assignedTo?: string;
  actionPlan?: string;
  resolvedAt?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface StrategyRecommendation {
  id: string;
  insightId: string;
  title: string;
  description: string;
  priority: 'immediate' | 'short-term' | 'long-term';
  effort: 'low' | 'medium' | 'high';
  affectedSubmissions: string[];
  suggestedActions: string[];
}

// ============================================================================
// MOCK DATA
// ============================================================================

const mockInsights: IntelligenceInsight[] = [
  {
    id: 'intel-001',
    title: 'FDA Draft Guidance: CMC Post-Approval Changes for Biologics',
    summary: 'FDA released draft guidance updating CMC change reporting requirements for biologics, with new categorization for manufacturing changes.',
    source: 'FDA.gov',
    sourceUrl: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents',
    category: 'guidance-change',
    severity: 'high',
    publishedDate: '2026-01-15',
    regions: ['US'],
  },
  {
    id: 'intel-002',
    title: 'Competitor BLA Approval: Nexavar Biosimilar (Sandoz)',
    summary: 'Sandoz received FDA approval for first Nexavar biosimilar, potentially impacting market positioning for similar oncology assets.',
    source: 'FDA Press Release',
    category: 'competitor-approval',
    severity: 'medium',
    publishedDate: '2026-01-20',
    regions: ['US'],
  },
  {
    id: 'intel-003',
    title: 'EMA CHMP: Updated Clinical Trial Requirements for Rare Diseases',
    summary: 'CHMP issued reflection paper on clinical evidence requirements for orphan medicinal products, allowing more flexibility in trial design.',
    source: 'EMA',
    category: 'regulatory-pathway',
    severity: 'high',
    publishedDate: '2026-01-18',
    regions: ['EU'],
  },
  {
    id: 'intel-004',
    title: 'Class-Wide Safety Signal: Hepatotoxicity in Kinase Inhibitors',
    summary: 'FDA identified increased hepatotoxicity reports across kinase inhibitor class, may require additional monitoring in labels.',
    source: 'FDA Safety Communication',
    category: 'safety-signal',
    severity: 'critical',
    publishedDate: '2026-01-22',
    regions: ['US', 'EU', 'JP'],
  },
];

const mockImpacts: SubmissionImpact[] = [
  {
    id: 'impact-001',
    insightId: 'intel-001',
    submissionId: 'sub-001',
    applicationNumber: 'BLA-761234',
    productName: 'Ligrastinib',
    region: 'US',
    submissionType: 'sBLA',
    impactType: 'content',
    impactDescription: 'Module 3.2.P manufacturing section may need revision per new CMC guidance',
    affectedModules: ['3.2.P'],
    affectedDocuments: ['Drug Product Specification', 'Manufacturing Process Description'],
    status: 'under-review',
    assignedTo: 'Sarah Chen',
    createdAt: '2026-01-16',
    updatedAt: '2026-01-25',
  },
  {
    id: 'impact-002',
    insightId: 'intel-004',
    submissionId: 'sub-001',
    applicationNumber: 'BLA-761234',
    productName: 'Ligrastinib',
    region: 'US',
    submissionType: 'sBLA',
    impactType: 'content',
    impactDescription: 'Label update may be required to address class-wide hepatotoxicity signal',
    affectedModules: ['1.14', '2.5'],
    affectedDocuments: ['USPI', 'Clinical Overview'],
    originalTargetDate: '2026-03-15',
    revisedTargetDate: '2026-04-01',
    daysImpact: 17,
    status: 'action-planned',
    assignedTo: 'Jennifer Walsh',
    actionPlan: 'Coordinate with Safety team on label language; prepare Module 1.14 update',
    createdAt: '2026-01-23',
    updatedAt: '2026-01-28',
  },
  {
    id: 'impact-003',
    insightId: 'intel-003',
    submissionId: 'sub-003',
    applicationNumber: 'MAA-EU-2024-001',
    productName: 'Nexovir',
    region: 'EU',
    submissionType: 'MAA',
    impactType: 'strategy',
    impactDescription: 'New orphan flexibility may allow reduced Phase 3 enrollment - evaluate strategy',
    affectedModules: ['2.5', '2.7', '5.3.5'],
    affectedDocuments: ['Clinical Overview', 'Clinical Summary', 'CSRs'],
    status: 'new',
    createdAt: '2026-01-19',
    updatedAt: '2026-01-19',
  },
];

const mockRecommendations: StrategyRecommendation[] = [
  {
    id: 'rec-001',
    insightId: 'intel-001',
    title: 'Review Module 3 against new CMC guidance',
    description: 'Compare current Module 3.2.P content against new draft guidance requirements. Identify gaps and prepare revision plan.',
    priority: 'short-term',
    effort: 'medium',
    affectedSubmissions: ['BLA-761234'],
    suggestedActions: [
      'Download and review FDA draft guidance',
      'Gap analysis against current Module 3.2.P',
      'Meet with CMC team to discuss changes',
      'Prepare timeline for revisions if needed',
    ],
  },
  {
    id: 'rec-002',
    insightId: 'intel-004',
    title: 'Proactive hepatotoxicity label update',
    description: 'Given class-wide signal, proactively update labeling with enhanced hepatotoxicity warnings to avoid enforcement action.',
    priority: 'immediate',
    effort: 'medium',
    affectedSubmissions: ['BLA-761234', 'NDA-214500'],
    suggestedActions: [
      'Review current WARNINGS section language',
      'Coordinate with PV on ICSR data',
      'Draft updated labeling language',
      'Prepare Type II variation (EU) / CBE-30 (US)',
    ],
  },
];

// ============================================================================
// CONSTANTS
// ============================================================================

const CATEGORY_CONFIG: Record<ImpactCategory, { label: string; icon: React.ElementType; color: string }> = {
  'guidance-change': { label: 'Guidance Change', icon: BookOpen, color: 'text-blue-400' },
  'competitor-approval': { label: 'Competitor Approval', icon: Building2, color: 'text-purple-400' },
  'competitor-rejection': { label: 'Competitor CRL', icon: XCircle, color: 'text-amber-400' },
  'safety-signal': { label: 'Safety Signal', icon: AlertTriangle, color: 'text-red-400' },
  'regulatory-pathway': { label: 'Pathway Update', icon: GitBranch, color: 'text-green-400' },
  'requirement-change': { label: 'Requirement Change', icon: FileText, color: 'text-amber-400' },
  'deadline-change': { label: 'Deadline Impact', icon: Calendar, color: 'text-red-400' },
};

const SEVERITY_CONFIG: Record<ImpactSeverity, { label: string; color: string; bgColor: string }> = {
  critical: { label: 'Critical', color: 'text-red-400', bgColor: 'bg-red-500/20' },
  high: { label: 'High', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  medium: { label: 'Medium', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  low: { label: 'Low', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

const STATUS_CONFIG: Record<ImpactStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
  'under-review': { label: 'Under Review', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  'action-planned': { label: 'Action Planned', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
  resolved: { label: 'Resolved', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  dismissed: { label: 'Dismissed', color: 'text-slate-400', bgColor: 'bg-slate-500/20' },
};

const REGION_FLAGS: Record<string, string> = {
  'US': '🇺🇸', 'EU': '🇪🇺', 'JP': '🇯🇵', 'CN': '🇨🇳', 'CA': '🇨🇦',
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function InsightCard({ 
  insight, 
  impacts, 
  isExpanded, 
  onToggle,
  onCreateImpact,
}: { 
  insight: IntelligenceInsight;
  impacts: SubmissionImpact[];
  isExpanded: boolean;
  onToggle: () => void;
  onCreateImpact: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[insight.category];
  const CategoryIcon = categoryConfig.icon;
  const severityConfig = SEVERITY_CONFIG[insight.severity];
  
  const activeImpacts = impacts.filter(i => i.status !== 'resolved' && i.status !== 'dismissed');
  
  return (
    <div className={`
      rounded-lg border transition-all
      ${insight.severity === 'critical' ? 'border-red-500/50 bg-red-500/5' : 'border-border bg-surface-elevated'}
    `}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${severityConfig.bgColor}`}>
            <CategoryIcon className={`w-5 h-5 ${categoryConfig?.color ?? ''}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded ${severityConfig.bgColor} ${severityConfig?.color ?? ''}`}>
                {severityConfig.label}
              </span>
              <span className="text-xs text-text-muted">{categoryConfig.label}</span>
              <div className="flex gap-1">
                {insight.regions.map(r => (
                  <span key={r} className="text-sm">{REGION_FLAGS[r] || r}</span>
                ))}
              </div>
            </div>
            <h4 className="font-medium text-text-primary text-sm line-clamp-2">{insight.title}</h4>
            <p className="text-xs text-text-muted mt-1 line-clamp-2">{insight.summary}</p>
          </div>
          
          <div className="flex flex-col items-end gap-2">
            <span className="text-xs text-text-muted">{insight.publishedDate}</span>
            {activeImpacts.length > 0 && (
              <span className="text-xs px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded">
                {activeImpacts.length} impact{activeImpacts.length > 1 ? 's' : ''}
              </span>
            )}
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-text-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-text-muted" />
            )}
          </div>
        </div>
      </button>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Impacts */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Target className="w-4 h-4" />
                Submission Impacts
              </h5>
              <Button variant="ghost" size="sm" onClick={onCreateImpact}>
                <Plus className="w-3 h-3 mr-1" />
                Add Impact
              </Button>
            </div>
            
            {impacts.length === 0 ? (
              <div className="p-3 bg-surface-card rounded border border-dashed border-border text-center text-sm text-text-muted">
                No impacts linked. Click "Add Impact" to assess how this affects your submissions.
              </div>
            ) : (
              <div className="space-y-2">
                {impacts.map(impact => {
                  const statusConfig = STATUS_CONFIG[impact.status];
                  
                  return (
                    <div key={impact.id} className="p-3 bg-surface-card rounded-lg border border-border">
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{REGION_FLAGS[impact.region] || '🌐'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-text-primary">{impact.productName}</span>
                            <span className="text-xs text-text-muted">{impact.applicationNumber}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded ${statusConfig.bgColor} ${statusConfig?.color ?? ''}`}>
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary">{impact.impactDescription}</p>
                          
                          {impact.daysImpact && (
                            <div className="flex items-center gap-2 mt-2 text-xs">
                              <Clock className="w-3 h-3 text-red-400" />
                              <span className="text-red-400">+{impact.daysImpact} days to timeline</span>
                              {impact.originalTargetDate && impact.revisedTargetDate && (
                                <span className="text-text-muted">
                                  ({impact.originalTargetDate} → {impact.revisedTargetDate})
                                </span>
                              )}
                            </div>
                          )}
                          
                          {impact.affectedModules.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-xs text-text-muted">Modules:</span>
                              {impact.affectedModules.map(m => (
                                <span key={m} className="text-xs px-1.5 py-0.5 bg-surface-elevated rounded text-text-secondary">
                                  {m}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {impact.actionPlan && (
                            <div className="mt-2 p-2 bg-green-500/10 rounded text-xs text-green-400">
                              <strong>Action:</strong> {impact.actionPlan}
                            </div>
                          )}
                        </div>
                        
                        {impact.assignedTo && (
                          <span className="text-xs text-text-muted">{impact.assignedTo}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Source Link */}
          {insight.sourceUrl && (
            <div className="px-4 pb-4">
              <a
                href={insight.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-blue hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View source: {insight.source}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ recommendation }: { recommendation: StrategyRecommendation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const priorityColors = {
    immediate: 'bg-red-500/20 text-red-400',
    'short-term': 'bg-amber-500/20 text-amber-400',
    'long-term': 'bg-blue-500/20 text-blue-400',
  };
  
  return (
    <div className="p-4 bg-surface-elevated rounded-lg border border-border">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-accent-blue/20 rounded-lg">
          <Zap className="w-4 h-4 text-accent-blue" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[recommendation.priority]}`}>
              {recommendation.priority}
            </span>
            <span className="text-xs text-text-muted">Effort: {recommendation.effort}</span>
          </div>
          <h4 className="font-medium text-text-primary text-sm">{recommendation.title}</h4>
          <p className="text-xs text-text-muted mt-1">{recommendation.description}</p>
          
          {isExpanded && (
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-text-secondary">Suggested Actions:</div>
              <ul className="space-y-1">
                {recommendation.suggestedActions.map((action, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-text-muted">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-accent-blue" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-accent-blue hover:underline mt-2"
          >
            {isExpanded ? 'Show less' : 'Show actions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface StrategyImpactPanelProps {
  productFilter?: string;
  regionFilter?: string;
  onNavigateToSubmission?: (submissionId: string) => void;
}

export function StrategyImpactPanel({
  productFilter,
  regionFilter,
  onNavigateToSubmission,
}: StrategyImpactPanelProps) {
  const toast = useToast();
  const [expandedInsightId, setExpandedInsightId] = useState<string | null>(mockInsights[0]?.id || null);
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Filter insights
  const filteredInsights = useMemo(() => {
    return mockInsights.filter(insight => {
      if (severityFilter !== 'all' && insight.severity !== severityFilter) return false;
      if (categoryFilter !== 'all' && insight.category !== categoryFilter) return false;
      if (regionFilter && !insight.regions.includes(regionFilter)) return false;
      return true;
    });
  }, [severityFilter, categoryFilter, regionFilter]);
  
  // Get impacts for an insight
  const getImpactsForInsight = useCallback((insightId: string) => {
    return mockImpacts.filter(i => i.insightId === insightId);
  }, []);
  
  // Get recommendations for an insight
  const getRecommendationsForInsight = useCallback((insightId: string) => {
    return mockRecommendations.filter(r => r.insightId === insightId);
  }, []);
  
  // Stats
  const stats = useMemo(() => ({
    totalInsights: mockInsights.length,
    critical: mockInsights.filter(i => i.severity === 'critical').length,
    activeImpacts: mockImpacts.filter(i => i.status !== 'resolved' && i.status !== 'dismissed').length,
    pendingActions: mockImpacts.filter(i => i.status === 'new' || i.status === 'under-review').length,
  }), []);
  
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Intelligence feed refreshed');
    setIsRefreshing(false);
  }, [toast]);
  
  const handleCreateImpact = useCallback((insightId: string) => {
    toast.info('Opening impact assessment wizard...');
    // Would open a modal to create a new impact assessment
  }, [toast]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-surface-elevated">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple to-accent-blue flex items-center justify-center">
              <Link2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Strategy Impact Analysis</h2>
              <p className="text-sm text-text-muted">Regulatory intelligence linked to your submissions</p>
            </div>
          </div>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-surface-card rounded-lg text-center">
            <div className="text-2xl font-bold text-text-primary">{stats.totalInsights}</div>
            <div className="text-xs text-text-muted">Intel Alerts</div>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-xs text-text-muted">Critical</div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-amber-400">{stats.activeImpacts}</div>
            <div className="text-xs text-text-muted">Active Impacts</div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.pendingActions}</div>
            <div className="text-xs text-text-muted">Pending Review</div>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="p-3 border-b border-border bg-surface-card flex items-center gap-3">
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded text-text-primary"
        >
          <option value="all">All Severity</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-surface-elevated border border-border rounded text-text-primary"
        >
          <option value="all">All Categories</option>
          <option value="guidance-change">Guidance Change</option>
          <option value="competitor-approval">Competitor Approval</option>
          <option value="safety-signal">Safety Signal</option>
          <option value="regulatory-pathway">Pathway Update</option>
          <option value="requirement-change">Requirement Change</option>
        </select>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Recommendations Section */}
        {mockRecommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-amber" />
              AI Recommendations
            </h3>
            <div className="space-y-3">
              {mockRecommendations.slice(0, 2).map(rec => (
                <RecommendationCard key={rec.id} recommendation={rec} />
              ))}
            </div>
          </div>
        )}
        
        {/* Intelligence Insights */}
        <div>
          <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent-blue" />
            Intelligence Alerts ({filteredInsights.length})
          </h3>
          <div className="space-y-3">
            {filteredInsights.map(insight => (
              <InsightCard
                key={insight.id}
                insight={insight}
                impacts={getImpactsForInsight(insight.id)}
                isExpanded={expandedInsightId === insight.id}
                onToggle={() => setExpandedInsightId(
                  expandedInsightId === insight.id ? null : insight.id
                )}
                onCreateImpact={() => handleCreateImpact(insight.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StrategyImpactPanel;
