

import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  ChevronRight,
  ChevronDown,
  Calendar,
  Users,
  Zap,
  TrendingUp,
  Download,
  Lightbulb,
  Target,
  AlertCircle,
  ClipboardCheck,
  Building2,
  Scale,
  FileCheck,
  Sparkles,
  ArrowRight,
  Timer,
  CheckSquare,
  Square,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import type { BadgeColor } from '@/components/ui/Badge';
import type { ProgressColor } from '@/components/ui/Progress';
import type {
  TMFStudy,
  TMFArtifact,
  TMFZone,
  StudyMilestone,
} from '@/domains/tmf/contracts';

// ============================================================================
// TMF AUDIT READINESS - v0.13.91
// Inspection preparation checklist, AI recommendations, timeline planning
// ============================================================================

interface TMFAuditReadinessProps {
  study: TMFStudy;
  artifactsByZone: Record<TMFZone, string[]>;
  artifactsRecord: Record<string, TMFArtifact>;
  onSelectZone: (zone: TMFZone) => void;
}

// Checklist categories based on FDA/EMA inspection focus areas
type ChecklistCategory = 
  | 'essential-documents'
  | 'regulatory-compliance'
  | 'site-oversight'
  | 'safety-reporting'
  | 'data-integrity'
  | 'quality-management';

interface ChecklistItem {
  id: string;
  category: ChecklistCategory;
  title: string;
  description: string;
  zone: TMFZone;
  isCritical: boolean;
  verificationMethod: string;
  commonFindings: string[];
  status: 'complete' | 'partial' | 'missing' | 'not-applicable';
  completionPercentage: number;
  recommendation?: string;
}

interface AuditRecommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  estimatedHours: number;
  zone?: TMFZone;
  relatedItems: string[];
}

// Zone names
const ZONE_NAMES: Record<TMFZone, string> = {
  'zone-01': 'Trial Management',
  'zone-02': 'Central Trial Documents',
  'zone-03': 'Regulatory',
  'zone-04': 'IRB/IEC Approvals',
  'zone-05': 'Site Management',
  'zone-06': 'IP and Trial Supplies',
  'zone-07': 'Safety Reporting',
  'zone-08': 'Central and Local Testing',
  'zone-09': 'Third Parties',
  'zone-10': 'Data Management',
};

// Category display info
const CATEGORY_INFO: Record<ChecklistCategory, { name: string; icon: React.ReactNode; description: string }> = {
  'essential-documents': { 
    name: 'Essential Documents', 
    icon: <FileText className="w-5 h-5" />,
    description: 'Core trial documents per ICH E6(R2) Section 8'
  },
  'regulatory-compliance': { 
    name: 'Regulatory Compliance', 
    icon: <Scale className="w-5 h-5" />,
    description: 'IND/CTA maintenance and health authority correspondence'
  },
  'site-oversight': { 
    name: 'Site Oversight', 
    icon: <Building2 className="w-5 h-5" />,
    description: 'Monitoring visits, training, and site qualification'
  },
  'safety-reporting': { 
    name: 'Safety Reporting', 
    icon: <Shield className="w-5 h-5" />,
    description: 'SAE/SUSAR reporting and safety management'
  },
  'data-integrity': { 
    name: 'Data Integrity', 
    icon: <FileCheck className="w-5 h-5" />,
    description: 'ALCOA+ principles and audit trail compliance'
  },
  'quality-management': { 
    name: 'Quality Management', 
    icon: <ClipboardCheck className="w-5 h-5" />,
    description: 'CAPA, deviations, and quality control'
  },
};

// Audit checklist items based on FDA/EMA inspection focus
const CHECKLIST_ITEMS: Omit<ChecklistItem, 'status' | 'completionPercentage' | 'recommendation'>[] = [
  // Essential Documents
  { id: 'ed-01', category: 'essential-documents', title: 'Protocol and Amendments', description: 'Current approved protocol with all amendments filed and tracked', zone: 'zone-02', isCritical: true, verificationMethod: 'Version control verification', commonFindings: ['Missing amendment approval dates', 'Unsigned protocol pages', 'Version tracking gaps'] },
  { id: 'ed-02', category: 'essential-documents', title: 'Investigator Brochure', description: 'Current IB with safety updates incorporated', zone: 'zone-02', isCritical: true, verificationMethod: 'Version and distribution log', commonFindings: ['Outdated safety information', 'Missing IB acknowledgments', 'Distribution gaps'] },
  { id: 'ed-03', category: 'essential-documents', title: 'Informed Consent Forms', description: 'IRB-approved ICFs for each site with version tracking', zone: 'zone-02', isCritical: true, verificationMethod: 'IRB approval cross-reference', commonFindings: ['Consent version mismatches', 'Missing IRB stamps', 'Translation issues'] },
  { id: 'ed-04', category: 'essential-documents', title: 'Investigator CVs and Licenses', description: 'Current CVs and medical licenses for all investigators', zone: 'zone-05', isCritical: true, verificationMethod: 'Expiration date tracking', commonFindings: ['Expired licenses', 'Outdated CVs', 'Missing GCP training'] },
  { id: 'ed-05', category: 'essential-documents', title: 'Form FDA 1572 / Delegation Logs', description: 'Signed 1572s with current delegation of authority logs', zone: 'zone-05', isCritical: true, verificationMethod: 'Signature verification', commonFindings: ['Missing signatures', 'Outdated delegation logs', 'Unqualified staff listed'] },
  
  // Regulatory Compliance
  { id: 'rc-01', category: 'regulatory-compliance', title: 'IND/CTA Status', description: 'Current regulatory approval status and maintenance', zone: 'zone-03', isCritical: true, verificationMethod: 'HA correspondence review', commonFindings: ['Overdue annual reports', 'Missing safety reports', 'Correspondence gaps'] },
  { id: 'rc-02', category: 'regulatory-compliance', title: 'IRB/IEC Approvals', description: 'Current ethics committee approvals for all sites', zone: 'zone-04', isCritical: true, verificationMethod: 'Approval expiration tracking', commonFindings: ['Lapsed approvals', 'Missing continuing reviews', 'Amendment approval gaps'] },
  { id: 'rc-03', category: 'regulatory-compliance', title: 'Annual Reports', description: 'Timely submission of IND annual reports', zone: 'zone-03', isCritical: true, verificationMethod: 'Submission tracking', commonFindings: ['Late submissions', 'Incomplete reports', 'Missing safety summaries'] },
  { id: 'rc-04', category: 'regulatory-compliance', title: 'Protocol Deviation Reporting', description: 'Tracking and reporting of protocol deviations per SOP', zone: 'zone-01', isCritical: false, verificationMethod: 'Deviation log review', commonFindings: ['Unreported deviations', 'Classification errors', 'Late reporting'] },
  
  // Site Oversight
  { id: 'so-01', category: 'site-oversight', title: 'Monitoring Visit Reports', description: 'Complete and timely monitoring visit documentation', zone: 'zone-05', isCritical: true, verificationMethod: 'Visit schedule adherence', commonFindings: ['Overdue visits', 'Incomplete reports', 'Unresolved findings'] },
  { id: 'so-02', category: 'site-oversight', title: 'Site Initiation Documentation', description: 'SIV completion with training records', zone: 'zone-05', isCritical: true, verificationMethod: 'Training log verification', commonFindings: ['Missing training records', 'Incomplete SIV checklists', 'Undocumented verbal training'] },
  { id: 'so-03', category: 'site-oversight', title: 'Source Document Verification', description: 'SDV completion per monitoring plan', zone: 'zone-05', isCritical: false, verificationMethod: 'SDV metrics review', commonFindings: ['Incomplete SDV', 'Query resolution delays', 'Data discrepancies'] },
  { id: 'so-04', category: 'site-oversight', title: 'Corrective Action Follow-up', description: 'Resolution of monitoring findings', zone: 'zone-05', isCritical: false, verificationMethod: 'CAPA tracking', commonFindings: ['Open findings', 'Inadequate corrective actions', 'Repeat findings'] },
  
  // Safety Reporting
  { id: 'sr-01', category: 'safety-reporting', title: 'SAE Reporting Compliance', description: 'Timely SAE reporting within regulatory timeframes', zone: 'zone-07', isCritical: true, verificationMethod: 'Timeline analysis', commonFindings: ['Late reports', 'Incomplete narratives', 'Missing follow-ups'] },
  { id: 'sr-02', category: 'safety-reporting', title: 'SUSAR Notifications', description: 'Expedited safety reporting to authorities and sites', zone: 'zone-07', isCritical: true, verificationMethod: 'Distribution tracking', commonFindings: ['Late notifications', 'Incomplete distribution', 'Missing acknowledgments'] },
  { id: 'sr-03', category: 'safety-reporting', title: 'Safety Management Plan', description: 'Documented safety management and signal detection', zone: 'zone-07', isCritical: true, verificationMethod: 'Plan review', commonFindings: ['Outdated plans', 'Missing signal detection process', 'Unclear responsibilities'] },
  { id: 'sr-04', category: 'safety-reporting', title: 'DSUR/PBRER Submissions', description: 'Timely development safety update reports', zone: 'zone-07', isCritical: true, verificationMethod: 'Submission tracking', commonFindings: ['Late submissions', 'Incomplete analysis', 'Missing benefit-risk assessment'] },
  
  // Data Integrity
  { id: 'di-01', category: 'data-integrity', title: 'Audit Trail Compliance', description: 'Complete audit trails for electronic records', zone: 'zone-10', isCritical: true, verificationMethod: 'System validation review', commonFindings: ['Incomplete audit trails', 'User access issues', 'Missing validation'] },
  { id: 'di-02', category: 'data-integrity', title: 'Database Validation', description: 'Validated clinical database with documented testing', zone: 'zone-10', isCritical: true, verificationMethod: 'Validation documentation', commonFindings: ['Incomplete validation', 'Missing edit checks', 'Undocumented changes'] },
  { id: 'di-03', category: 'data-integrity', title: 'Query Resolution', description: 'Timely resolution of data queries', zone: 'zone-10', isCritical: false, verificationMethod: 'Query aging analysis', commonFindings: ['Old open queries', 'Inadequate resolutions', 'Repeat queries'] },
  { id: 'di-04', category: 'data-integrity', title: 'Electronic Signatures', description: '21 CFR Part 11 compliant e-signatures', zone: 'zone-01', isCritical: true, verificationMethod: 'Signature log review', commonFindings: ['Missing signature meaning', 'Shared credentials', 'Unsigned documents'] },
  
  // Quality Management
  { id: 'qm-01', category: 'quality-management', title: 'TMF QC Records', description: 'Regular TMF quality control with documented findings', zone: 'zone-01', isCritical: false, verificationMethod: 'QC log review', commonFindings: ['Infrequent QC', 'Unresolved findings', 'Missing documentation'] },
  { id: 'qm-02', category: 'quality-management', title: 'Vendor Oversight', description: 'Qualification and oversight of third-party vendors', zone: 'zone-09', isCritical: true, verificationMethod: 'Vendor audit schedule', commonFindings: ['Missing qualifications', 'Overdue audits', 'Incomplete agreements'] },
  { id: 'qm-03', category: 'quality-management', title: 'Training Documentation', description: 'GCP and protocol training for all study personnel', zone: 'zone-05', isCritical: true, verificationMethod: 'Training matrix', commonFindings: ['Expired training', 'Missing records', 'Incomplete coverage'] },
  { id: 'qm-04', category: 'quality-management', title: 'IP Accountability', description: 'Complete IP receipt, dispensing, and destruction records', zone: 'zone-06', isCritical: true, verificationMethod: 'IP reconciliation', commonFindings: ['Reconciliation gaps', 'Missing destruction records', 'Temperature excursions'] },
];

export function TMFAuditReadiness({
  study,
  artifactsByZone,
  artifactsRecord,
  onSelectZone,
}: TMFAuditReadinessProps) {
  const [activeTab, setActiveTab] = useState<'checklist' | 'recommendations' | 'timeline'>('checklist');
  const [expandedCategories, setExpandedCategories] = useState<Set<ChecklistCategory>>(new Set(['essential-documents'] as ChecklistCategory[]));
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [checklistStatusFilter, setChecklistStatusFilter] = useState<'all' | 'needs-attention' | 'critical-incomplete' | null>(null);

  // Calculate checklist item status based on artifacts
  const checklistWithStatus = useMemo((): ChecklistItem[] => {
    return CHECKLIST_ITEMS.map(item => {
      const zoneArtifacts = (artifactsByZone[item.zone] || [])
        .map(id => artifactsRecord[id])
        .filter(Boolean);
      
      // Simulate status based on artifact presence and quality
      const relevantArtifacts = zoneArtifacts.filter(a => 
        a.status === 'filed' || a.status === 'approved'
      );
      
      const totalExpected = Math.max(1, Math.ceil(zoneArtifacts.length * 0.8));
      const completionPercentage = Math.min(100, Math.round((relevantArtifacts.length / totalExpected) * 100));
      
      let status: ChecklistItem['status'];
      if (completionPercentage >= 90) {
        status = 'complete';
      } else if (completionPercentage >= 50) {
        status = 'partial';
      } else if (completionPercentage > 0) {
        status = 'partial';
      } else {
        status = 'missing';
      }
      
      // Generate recommendation based on status
      let recommendation: string | undefined;
      if (status === 'missing') {
        recommendation = `Immediate action required: ${item.commonFindings[0] || 'Complete missing documentation'}`;
      } else if (status === 'partial') {
        recommendation = `Review and complete: Focus on ${item.commonFindings[0] || 'outstanding items'}`;
      }
      
      return {
        ...item,
        status,
        completionPercentage,
        recommendation,
      };
    });
  }, [artifactsByZone, artifactsRecord]);

  // Generate AI recommendations
  const recommendations = useMemo((): AuditRecommendation[] => {
    const recs: AuditRecommendation[] = [];
    
    // Analyze checklist for gaps
    const criticalIncomplete = checklistWithStatus.filter(
      item => item.isCritical && item.status !== 'complete'
    );
    const partialItems = checklistWithStatus.filter(item => item.status === 'partial');
    const missingItems = checklistWithStatus.filter(item => item.status === 'missing');
    
    // Critical document gaps
    if (criticalIncomplete.length > 0) {
      recs.push({
        id: 'rec-critical-docs',
        priority: 'critical',
        category: 'Essential Documents',
        title: `Address ${criticalIncomplete.length} Critical Document Gap${criticalIncomplete.length > 1 ? 's' : ''}`,
        description: `Critical inspection-ready documents are incomplete: ${criticalIncomplete.slice(0, 3).map(i => i.title).join(', ')}${criticalIncomplete.length > 3 ? ` and ${criticalIncomplete.length - 3} more` : ''}`,
        impact: 'High risk of inspection findings - FDA 483 potential',
        effort: criticalIncomplete.length > 5 ? 'high' : 'medium',
        estimatedHours: criticalIncomplete.length * 8,
        relatedItems: criticalIncomplete.map(i => i.id),
      });
    }
    
    // Safety reporting gaps
    const safetyItems = checklistWithStatus.filter(
      item => item.category === 'safety-reporting' && item.status !== 'complete'
    );
    if (safetyItems.length > 0) {
      recs.push({
        id: 'rec-safety',
        priority: 'critical',
        category: 'Safety Reporting',
        title: 'Strengthen Safety Reporting Documentation',
        description: 'Safety reporting gaps identified - primary FDA inspection focus area',
        impact: 'SAE/SUSAR reporting deficiencies are top inspection findings',
        effort: 'medium',
        estimatedHours: safetyItems.length * 6,
        zone: 'zone-07',
        relatedItems: safetyItems.map(i => i.id),
      });
    }
    
    // Site oversight gaps
    const siteItems = checklistWithStatus.filter(
      item => item.category === 'site-oversight' && item.status !== 'complete'
    );
    if (siteItems.length > 0) {
      recs.push({
        id: 'rec-site',
        priority: 'high',
        category: 'Site Oversight',
        title: 'Enhance Site Monitoring Documentation',
        description: `${siteItems.length} site oversight items need attention`,
        impact: 'Monitoring gaps frequently cited in warning letters',
        effort: siteItems.length > 3 ? 'high' : 'medium',
        estimatedHours: siteItems.length * 4,
        zone: 'zone-05',
        relatedItems: siteItems.map(i => i.id),
      });
    }
    
    // Data integrity
    const dataItems = checklistWithStatus.filter(
      item => item.category === 'data-integrity' && item.status !== 'complete'
    );
    if (dataItems.length > 0) {
      recs.push({
        id: 'rec-data',
        priority: 'high',
        category: 'Data Integrity',
        title: 'Verify ALCOA+ Compliance',
        description: 'Data integrity documentation requires strengthening',
        impact: 'Data integrity is FDA focus - ALCOA+ principles must be demonstrable',
        effort: 'medium',
        estimatedHours: dataItems.length * 8,
        zone: 'zone-10',
        relatedItems: dataItems.map(i => i.id),
      });
    }
    
    // TMF QC recommendation
    const qcComplete = checklistWithStatus.find(i => i.id === 'qm-01')?.status === 'complete';
    if (!qcComplete) {
      recs.push({
        id: 'rec-qc',
        priority: 'medium',
        category: 'Quality Management',
        title: 'Implement Pre-Inspection TMF QC',
        description: 'Conduct comprehensive TMF quality review before inspection',
        impact: 'Proactive QC identifies and resolves issues before inspectors',
        effort: 'medium',
        estimatedHours: 24,
        zone: 'zone-01',
        relatedItems: ['qm-01'],
      });
    }
    
    // Mock inspection recommendation
    if (criticalIncomplete.length > 3 || missingItems.length > 5) {
      recs.push({
        id: 'rec-mock',
        priority: 'high',
        category: 'Preparation',
        title: 'Conduct Mock Inspection',
        description: 'Multiple gaps suggest value in mock inspection exercise',
        impact: 'Identifies systemic issues and trains staff on inspector interactions',
        effort: 'high',
        estimatedHours: 40,
        relatedItems: [],
      });
    }
    
    // Training gap
    const trainingComplete = checklistWithStatus.find(i => i.id === 'qm-03')?.status === 'complete';
    if (!trainingComplete) {
      recs.push({
        id: 'rec-training',
        priority: 'medium',
        category: 'Training',
        title: 'Complete GCP Refresher Training',
        description: 'Ensure all study personnel have current GCP training',
        impact: 'Training gaps reflect poorly on oversight and can indicate broader issues',
        effort: 'low',
        estimatedHours: 8,
        relatedItems: ['qm-03'],
      });
    }
    
    return recs.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [checklistWithStatus]);

  // Calculate overall readiness metrics
  const readinessMetrics = useMemo(() => {
    const total = checklistWithStatus.length;
    const complete = checklistWithStatus.filter(i => i.status === 'complete').length;
    const partial = checklistWithStatus.filter(i => i.status === 'partial').length;
    const missing = checklistWithStatus.filter(i => i.status === 'missing').length;
    const criticalComplete = checklistWithStatus.filter(i => i.isCritical && i.status === 'complete').length;
    const criticalTotal = checklistWithStatus.filter(i => i.isCritical).length;
    
    const overallScore = Math.round((complete / total) * 100);
    const criticalScore = Math.round((criticalComplete / criticalTotal) * 100);
    
    // Estimate days to readiness based on recommendations
    const totalHours = recommendations.reduce((sum, r) => sum + r.estimatedHours, 0);
    const daysToReadiness = Math.ceil(totalHours / 8);
    
    return {
      total,
      complete,
      partial,
      missing,
      criticalComplete,
      criticalTotal,
      overallScore,
      criticalScore,
      totalRemediationHours: totalHours,
      daysToReadiness,
    };
  }, [checklistWithStatus, recommendations]);

  // Group checklist by category
  const checklistByCategory = useMemo(() => {
    const grouped: Record<ChecklistCategory, ChecklistItem[]> = {
      'essential-documents': [],
      'regulatory-compliance': [],
      'site-oversight': [],
      'safety-reporting': [],
      'data-integrity': [],
      'quality-management': [],
    };
    
    checklistWithStatus.forEach(item => {
      if (showOnlyIncomplete && item.status === 'complete') return;
      grouped[item.category].push(item);
    });
    
    return grouped;
  }, [checklistWithStatus, showOnlyIncomplete]);

  const toggleCategory = (category: ChecklistCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Readiness Score Overview */}
      <div className="grid grid-cols-4 gap-4">
        <ScoreCard
          label="Overall Readiness"
          score={readinessMetrics.overallScore}
          subtitle={`${readinessMetrics.complete}/${readinessMetrics.total} items`}
          color={readinessMetrics.overallScore >= 80 ? 'green' : readinessMetrics.overallScore >= 60 ? 'amber' : 'red'}
        />
        <ScoreCard
          label="Critical Items"
          score={readinessMetrics.criticalScore}
          subtitle={`${readinessMetrics.criticalComplete}/${readinessMetrics.criticalTotal} complete — tap to filter`}
          color={readinessMetrics.criticalScore >= 90 ? 'green' : readinessMetrics.criticalScore >= 70 ? 'amber' : 'red'}
          onClick={() => { setChecklistStatusFilter(f => f === 'critical-incomplete' ? null : 'critical-incomplete'); setActiveTab('checklist'); }}
        />
        <ScoreCard
          label="Items Needing Attention"
          score={readinessMetrics.partial + readinessMetrics.missing}
          isCount
          subtitle={`${readinessMetrics.partial} partial, ${readinessMetrics.missing} missing — tap to filter`}
          color={checklistStatusFilter === 'needs-attention' ? 'amber' : 'slate'}
          onClick={() => { setChecklistStatusFilter(f => f === 'needs-attention' ? null : 'needs-attention'); setActiveTab('checklist'); }}
        />
        <ScoreCard
          label="Est. Time to Ready"
          score={readinessMetrics.daysToReadiness}
          isCount
          subtitle={`${readinessMetrics.totalRemediationHours} hours`}
          color="blue"
          suffix=" days"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Button
          variant={activeTab === 'checklist' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('checklist')}
        >
          <ClipboardCheck className="w-4 h-4 mr-2" />
          Audit Checklist
        </Button>
        <Button
          variant={activeTab === 'recommendations' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('recommendations')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          AI Recommendations
          {recommendations.filter(r => r.priority === 'critical').length > 0 && (
            <Badge color="red" size="xs" className="ml-2">
              {recommendations.filter(r => r.priority === 'critical').length}
            </Badge>
          )}
        </Button>
        <Button
          variant={activeTab === 'timeline' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('timeline')}
        >
          <Timer className="w-4 h-4 mr-2" />
          Readiness Timeline
        </Button>
      </div>

      {/* Checklist Tab */}
      {activeTab === 'checklist' && (
        <div className="space-y-4">
          {/* Active filter banner */}
          {checklistStatusFilter && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-sm font-medium text-amber-400">
                {checklistStatusFilter === 'needs-attention'
                  ? `Showing ${readinessMetrics.partial + readinessMetrics.missing} items needing attention (partial or missing)`
                  : `Showing ${readinessMetrics.criticalTotal - readinessMetrics.criticalComplete} critical incomplete items`}
              </span>
              <button onClick={() => setChecklistStatusFilter(null)} className="ml-auto text-xs text-text-muted hover:text-text-primary flex items-center gap-1">✕ Clear filter</button>
            </div>
          )}
          {/* Filter */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyIncomplete}
                onChange={e => setShowOnlyIncomplete(e.target.checked)}
                className="rounded border-border bg-surface-card text-accent-blue focus:ring-accent-blue"
              />
              Show only incomplete items
            </label>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Checklist
            </Button>
          </div>

          {/* Category Cards */}
          <div className="space-y-3">
            {(Object.keys(CATEGORY_INFO) as ChecklistCategory[]).map(category => {
              const allItems = checklistByCategory[category];
              // Apply status filter
              const items = checklistStatusFilter === 'needs-attention'
                ? allItems.filter(i => i.status === 'partial' || i.status === 'missing')
                : checklistStatusFilter === 'critical-incomplete'
                ? allItems.filter(i => i.isCritical && i.status !== 'complete')
                : allItems;
              const info = CATEGORY_INFO[category];
              const completeCount = allItems.filter(i => i.status === 'complete').length;
              const isExpanded = expandedCategories.has(category);
              
              if (items.length === 0 && (showOnlyIncomplete || checklistStatusFilter)) return null;
              
              return (
                <Card key={category}>
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-surface-card transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-muted" />
                    )}
                    <div className="text-cyan-400">{info.icon}</div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{info.name}</span>
                        <Badge 
                          color={completeCount === allItems.length ? 'green' : completeCount > 0 ? 'amber' : 'red'} 
                          size="xs"
                        >
                          {completeCount}/{allItems.length}
                        </Badge>
                        {checklistStatusFilter && items.length > 0 && <Badge color="amber" size="xs">{items.length} flagged</Badge>}
                      </div>
                      <p className="text-xs text-text-muted">{info.description}</p>
                    </div>
                    <div className="w-24">
                      <ProgressBar 
                        value={allItems.length > 0 ? Math.round((completeCount / allItems.length) * 100) : 0} 
                        color={completeCount === allItems.length ? 'emerald' : 'amber'} 
                        size="sm" 
                      />
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="space-y-2 ml-7">
                        {items.map(item => (
                          <ChecklistItemRow
                            key={item.id}
                            item={item}
                            onNavigate={() => onSelectZone(item.zone)}
                          />
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {/* Summary */}
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-6 h-6 text-purple-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-text-primary mb-1">AI-Powered Recommendations</h3>
                  <p className="text-sm text-text-secondary">
                    Based on gap analysis and FDA/EMA inspection trends, prioritized actions to achieve inspection readiness.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendation Cards */}
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                index={idx + 1}
                onNavigate={rec.zone ? () => onSelectZone(rec.zone!) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <TimelineView
            recommendations={recommendations}
            readinessMetrics={readinessMetrics}
          />
        </div>
      )}
    </div>
  );
}

// Helper Components

function ScoreCard({ 
  label, 
  score, 
  subtitle, 
  color,
  isCount = false,
  suffix = '%',
  onClick,
}: { 
  label: string; 
  score: number; 
  subtitle: string;
  color: 'green' | 'amber' | 'red' | 'blue' | 'slate';
  isCount?: boolean;
  suffix?: string;
  onClick?: () => void;
}) {
  const colorClasses: Record<string, string> = {
    green: 'border-emerald-500/30',
    amber: 'border-amber-500/30',
    red: 'border-red-500/30',
    blue: 'border-blue-500/30',
    slate: 'border-slate-500/30',
  };
  const textColors: Record<string, string> = {
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    slate: 'text-slate-400',
  };

  return (
    <Card className={`${colorClasses[color]} ${onClick ? 'cursor-pointer hover:border-accent-blue/40 transition-colors' : ''}`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="text-xs text-text-muted mb-1">{label}</div>
        <div className={`text-2xl font-bold ${textColors[color]}`}>
          {score}{isCount ? '' : suffix}
        </div>
        <div className={`text-xs mt-0.5 ${onClick ? 'text-accent-blue/60' : 'text-text-muted'}`}>{subtitle}</div>
        {!isCount && (
          <ProgressBar 
            value={score} 
            color={color === 'green' ? 'emerald' : color === 'amber' ? 'amber' : color === 'red' ? 'red' : 'blue'} 
            size="sm" 
            className="mt-2"
          />
        )}
      </CardContent>
    </Card>
  );
}

function ChecklistItemRow({ item, onNavigate }: { item: ChecklistItem; onNavigate: () => void }) {
  const statusIcon = {
    complete: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    partial: <AlertTriangle className="w-4 h-4 text-amber-400" />,
    missing: <XCircle className="w-4 h-4 text-red-400" />,
    'not-applicable': <Square className="w-4 h-4 text-text-muted" />,
  };

  return (
    <div className="p-3 rounded-lg border border-border hover:border-border-hover transition-colors">
      <div className="flex items-start gap-3">
        {statusIcon[item.status]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-text-primary text-sm">{item.title}</span>
            {item.isCritical && <Badge color="cyan" size="xs">Critical</Badge>}
            <Badge color="slate" size="xs">{ZONE_NAMES[item.zone]}</Badge>
          </div>
          <p className="text-xs text-text-muted mb-2">{item.description}</p>
          {item.recommendation && (
            <div className="flex items-start gap-2 text-xs p-2 rounded bg-amber-500/10 border border-amber-500/20">
              <Lightbulb className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <span className="text-amber-200">{item.recommendation}</span>
            </div>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-medium text-text-primary">{item.completionPercentage}%</div>
          <Button variant="ghost" size="sm" onClick={onNavigate} className="mt-1">
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ 
  recommendation, 
  index,
  onNavigate 
}: { 
  recommendation: AuditRecommendation; 
  index: number;
  onNavigate?: () => void;
}) {
  const priorityColors: Record<string, { border: string; bg: string; text: string; badge: BadgeColor }> = {
    critical: { border: 'border-red-500/30', bg: 'bg-red-500/5', text: 'text-red-400', badge: 'red' },
    high: { border: 'border-orange-500/30', bg: 'bg-orange-500/5', text: 'text-orange-400', badge: 'orange' },
    medium: { border: 'border-amber-500/30', bg: 'bg-amber-500/5', text: 'text-amber-400', badge: 'amber' },
    low: { border: 'border-blue-500/30', bg: 'bg-blue-500/5', text: 'text-blue-400', badge: 'blue' },
  };
  const colors = priorityColors[recommendation.priority];
  
  const effortBadge: Record<string, BadgeColor> = {
    low: 'green',
    medium: 'amber',
    high: 'red',
  };

  return (
    <Card className={`${colors?.border ?? ''} ${colors?.bg ?? ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${colors?.bg ?? ''} ${colors?.text ?? ''} border ${colors?.border ?? ''}`}>
            {index}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-medium text-text-primary">{recommendation.title}</span>
              <Badge color={colors.badge} size="xs">{recommendation.priority}</Badge>
              <Badge color="slate" size="xs">{recommendation.category}</Badge>
            </div>
            <p className="text-sm text-text-secondary mb-2">{recommendation.description}</p>
            <div className="p-2 rounded bg-surface-card border border-border mb-2">
              <div className="flex items-center gap-2 text-xs">
                <Target className="w-3 h-3 text-cyan-400" />
                <span className="text-text-muted">Impact:</span>
                <span className="text-text-primary">{recommendation.impact}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {recommendation.estimatedHours}h estimated
              </span>
              <span className="flex items-center gap-1">
                Effort: <Badge color={effortBadge[recommendation.effort]} size="xs">{recommendation.effort}</Badge>
              </span>
              {recommendation.zone && (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {ZONE_NAMES[recommendation.zone]}
                </span>
              )}
            </div>
          </div>
          {onNavigate && (
            <Button variant="ghost" size="sm" onClick={onNavigate}>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineView({ 
  recommendations, 
  readinessMetrics 
}: { 
  recommendations: AuditRecommendation[];
  readinessMetrics: { totalRemediationHours: number; daysToReadiness: number };
}) {
  // Group by week
  const weeks = useMemo(() => {
    const result: { week: number; items: AuditRecommendation[]; hours: number }[] = [];
    let currentWeek = 1;
    let currentHours = 0;
    let currentItems: AuditRecommendation[] = [];
    
    recommendations.forEach(rec => {
      if (currentHours + rec.estimatedHours > 40) {
        result.push({ week: currentWeek, items: currentItems, hours: currentHours });
        currentWeek++;
        currentHours = 0;
        currentItems = [];
      }
      currentItems.push(rec);
      currentHours += rec.estimatedHours;
    });
    
    if (currentItems.length > 0) {
      result.push({ week: currentWeek, items: currentItems, hours: currentHours });
    }
    
    return result;
  }, [recommendations]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-cyan-500/30 bg-cyan-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6 text-cyan-400" />
            <div>
              <h3 className="font-medium text-text-primary">Estimated Timeline to Inspection Ready</h3>
              <p className="text-sm text-text-secondary">
                {readinessMetrics.daysToReadiness} working days ({readinessMetrics.totalRemediationHours} hours) assuming 1 FTE dedicated
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-6">
          {weeks.map(({ week, items, hours }) => (
            <div key={week} className="relative pl-10">
              <div className="absolute left-0 w-8 h-8 rounded-full bg-cyan-500/20 border-2 border-cyan-500 flex items-center justify-center text-sm font-bold text-cyan-400">
                {week}
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-text-primary">Week {week}</h4>
                    <Badge color="slate" size="sm">{hours}h</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <CheckSquare className="w-4 h-4 text-text-muted" />
                        <span className="text-text-primary flex-1">{item.title}</span>
                        <Badge 
                          color={item.priority === 'critical' ? 'red' : item.priority === 'high' ? 'orange' : 'amber'} 
                          size="xs"
                        >
                          {item.estimatedHours}h
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
          
          {/* Completion */}
          <div className="relative pl-10">
            <div className="absolute left-0 w-8 h-8 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="p-4">
                <h4 className="font-medium text-emerald-400">Inspection Ready</h4>
                <p className="text-sm text-text-muted">All critical items addressed, documentation complete</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TMFAuditReadiness;
