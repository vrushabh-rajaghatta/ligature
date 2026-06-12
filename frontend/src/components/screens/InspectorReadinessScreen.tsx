

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ClipboardCheck, Shield, CheckCircle2, XCircle, AlertTriangle, HelpCircle,
  ChevronDown, ChevronRight, Search, Filter, FileText, Link2, Download,
  RefreshCw, Eye, Edit3, Plus, ExternalLink, AlertCircle, Target,
  Package, Zap, FolderOpen, Calendar, Users, Archive, Rocket
} from 'lucide-react';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { 
  useInspectorReadinessStore,
  COMMON_GOTCHA_FINDINGS,
  EVIDENCE_REQUEST_LIST
} from '@/store/inspectorReadinessStore';
import { useQMSStore } from '@/store/useQMSStore';
import { useCrossModuleEventStore } from '@/store/useCrossModuleEventStore';
import { useToast } from '@/components/ui/Toast';
import { GxPDomain, InspectorCheckItem, InspectorCheckCategory } from '@/types/core';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { StatCardGridSkeleton, CardSkeleton, TableSkeleton } from '@/components/ui/Skeleton';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Spinner } from '@/components/ui/Spinner';

// ============================================================================
// v109 Color Maps - InspectorReadinessScreen
// ============================================================================

const assessmentStatusColorMap: Record<string, BadgeColor> = {
  'not-assessed': 'gray',
  'compliant': 'emerald',
  'gap': 'red',
  'partial': 'amber',
  'na': 'slate',
};

const gxpDomainColorMap: Record<GxPDomain, BadgeColor> = {
  'GxP': 'violet',
  'GMP': 'blue',
  'GLP': 'cyan',
  'GCP': 'emerald',
  'GVP': 'pink',
};

const severityColorMap: Record<string, BadgeColor> = {
  critical: 'red',
  major: 'amber',
  minor: 'blue',
};

// ============================================================================
// v109 Badge Helpers - InspectorReadinessScreen
// ============================================================================

export const getAssessmentStatusBadge = (status: InspectorCheckItem['status'], size: 'xs' | 'sm' = 'sm', showIcon: boolean = true) => {
  const labels: Record<string, string> = {
    'not-assessed': 'Not Assessed',
    'compliant': 'Compliant',
    'gap': 'Gap',
    'partial': 'Partial',
    'na': 'N/A',
  };
  
  const icons: Record<string, React.ReactNode> = {
    'not-assessed': <HelpCircle className="w-3 h-3" />,
    'compliant': <CheckCircle2 className="w-3 h-3" />,
    'gap': <XCircle className="w-3 h-3" />,
    'partial': <AlertTriangle className="w-3 h-3" />,
    'na': undefined,
  };
  
  return (
    <Badge 
      color={assessmentStatusColorMap[status] || 'gray'} 
      size={size}
      icon={showIcon ? icons[status] : undefined}
    >
      {labels[status] || status}
    </Badge>
  );
};

export const getGxPDomainBadge = (domain: GxPDomain, size: 'xs' | 'sm' = 'xs') => (
  <Badge color={gxpDomainColorMap[domain] || 'gray'} size={size}>
    {domain}
  </Badge>
);

export const getSeverityBadge = (severity: string, size: 'xs' | 'sm' = 'sm') => (
  <Badge color={severityColorMap[severity] || 'gray'} size={size}>
    {severity}
  </Badge>
);

// Category metadata
const CATEGORY_META: Record<InspectorCheckCategory, { label: string; section: string }> = {
  'system-identification': { label: 'System Identification & Intended Use', section: 'A' },
  'risk-assessment': { label: 'Risk Assessment', section: 'A' },
  'roles-responsibilities': { label: 'Roles & Responsibilities', section: 'A' },
  'procedures': { label: 'Procedures (SOPs)', section: 'B' },
  'training': { label: 'Training & Competence', section: 'B' },
  'deviations-capa': { label: 'Deviations / CAPA', section: 'B' },
  'validation': { label: 'Validation / Qualification', section: 'C' },
  'requirements': { label: 'Requirements Traceability', section: 'C' },
  'spreadsheets': { label: 'Spreadsheets / End-User Computing', section: 'C' },
  'data-lifecycle': { label: 'Data Lifecycle (ALCOA+)', section: 'D' },
  'audit-trails': { label: 'Audit Trails', section: 'D' },
  'time-attribution': { label: 'Time & Attribution', section: 'D' },
  'access-management': { label: 'Access Management', section: 'E' },
  'privileged-accounts': { label: 'Privileged Accounts', section: 'E' },
  'segregation-of-duties': { label: 'Segregation of Duties', section: 'E' },
  'electronic-records': { label: 'Electronic Records', section: 'F' },
  'e-signatures': { label: 'Electronic Signatures', section: 'F' },
  'change-control': { label: 'Change Control', section: 'G' },
  'configuration': { label: 'Configuration Management', section: 'G' },
  'periodic-review': { label: 'Periodic Review', section: 'G' },
  'supplier-qualification': { label: 'Supplier Qualification', section: 'H' },
  'sdlc': { label: 'SDLC Controls', section: 'H' },
  'incident-management': { label: 'Incident Management', section: 'I' },
  'backup-restore': { label: 'Backup / Restore / DR', section: 'I' },
  'data-retention': { label: 'Data Retention & Archiving', section: 'I' },
  'interfaces': { label: 'Interfaces & Data Transfers', section: 'I' }
};

const SECTIONS = [
  { id: 'A', label: 'Inspection Setup' },
  { id: 'B', label: 'Quality System Controls' },
  { id: 'C', label: 'Validation & Lifecycle' },
  { id: 'D', label: 'Data Integrity (ALCOA+)' },
  { id: 'E', label: 'Security & Access' },
  { id: 'F', label: 'Electronic Records & Signatures' },
  { id: 'G', label: 'Change Control' },
  { id: 'H', label: 'Suppliers & Cloud' },
  { id: 'I', label: 'Operations' },
  { id: 'J', label: 'Domain-Specific' }
];

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const getColor = () => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    if (score >= 40) return '#F97316';
    return '#EF4444';
  };
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 transform -rotate-90">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-card" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={getColor()} strokeWidth="8" strokeDasharray={`${score * 2.26} 226`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-text-primary">{score}%</span>
        </div>
      </div>
      <span className="mt-2 text-xs text-text-muted">{label}</span>
    </div>
  );
}

function ChecklistItemCard({ item, onSelect, isSelected }: { item: InspectorCheckItem; onSelect: () => void; isSelected: boolean }) {
  const categoryMeta = CATEGORY_META[item.category];
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border transition-all ${
        isSelected ? 'border-accent-blue bg-accent-blue/5' : 'border-border hover:border-border-hover bg-surface-card hover:bg-surface-elevated'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted">{item.id}</span>
          {getAssessmentStatusBadge(item.status, 'xs')}
        </div>
        <div className="flex gap-1">
          {item.domain.map(d => getGxPDomainBadge(d, 'xs'))}
        </div>
      </div>
      <p className="text-sm text-text-primary line-clamp-2 mb-2">{item.question}</p>
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <FileText className="w-3 h-3" />
        <span>{categoryMeta?.label || item.category}</span>
      </div>
    </button>
  );
}

function ItemDetailPanel({ item, onUpdateStatus }: { item: InspectorCheckItem; onUpdateStatus: (status: InspectorCheckItem['status']) => void }) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-mono text-text-muted">{item.id}</span>
          {getAssessmentStatusBadge(item.status)}
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">{item.question}</h3>
        <div className="flex flex-wrap gap-1">
          {item.domain.map(d => getGxPDomainBadge(d, 'xs'))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4 md:space-y-6">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
            <Eye className="w-4 h-4 text-accent-blue" />
            What to Look For
          </h4>
          <ul className="space-y-1.5">
            {item.lookFor.map((lf, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <ChevronRight className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
                {lf}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-violet-400" />
            Regulatory References
          </h4>
          <div className="flex flex-wrap gap-2">
            {item.regulatoryRefs.map((ref, i) => (
              <span key={i} className="px-2 py-1 bg-violet-500/10 text-violet-300 text-xs rounded flex items-center gap-1">
                {ref}
                <ExternalLink className="w-3 h-3" />
              </span>
            ))}
          </div>
        </div>
        {item.evidence && item.evidence.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Evidence Collected
            </h4>
            <ul className="space-y-1">
              {item.evidence.map((e, i) => (
                <li key={i} className="text-sm text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />{e}
                </li>
              ))}
            </ul>
          </div>
        )}
        {item.gaps && item.gaps.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              Identified Gaps
            </h4>
            <ul className="space-y-1">
              {item.gaps.map((g, i) => (
                <li key={i} className="text-sm text-red-300 flex items-center gap-2">
                  <XCircle className="w-3 h-3" />{g}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-border">
        <div className="text-xs text-text-muted mb-2">Set Assessment Status:</div>
        <div className="flex flex-wrap gap-2">
          {(['compliant', 'partial', 'gap', 'na', 'not-assessed'] as const).map(status => (
            <button
              key={status}
              onClick={() => onUpdateStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                item.status === status ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-secondary hover:text-text-primary'
              }`}
            >
              {status === 'not-assessed' ? 'Reset' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type TabId = 'dashboard' | 'checklist' | 'gotchas' | 'evidence';

export function InspectorReadinessScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedDomain, setSelectedDomain] = useState<GxPDomain | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['A', 'B']));
  
  // v130: Loading state
  const [isLoading, setIsLoading] = useState(true);
  
  // v0.27.82: Enhanced state for evidence and gap remediation
  const [evidenceChecked, setEvidenceChecked] = useState<Set<number>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [isCreatingCAPA, setIsCreatingCAPA] = useState<string | null>(null);
  
  // External stores
  const { createCAPA } = useQMSStore();
  const { emitEvent } = useCrossModuleEventStore();
  const toast = useToast();
  
  const checklistItems = useInspectorReadinessStore(s => s.checklistItems);
  const selectedItemId = useInspectorReadinessStore(s => s.selectedItemId);
  const initializeChecklist = useInspectorReadinessStore(s => s.initializeChecklist);
  const updateItemStatus = useInspectorReadinessStore(s => s.updateItemStatus);
  const selectItem = useInspectorReadinessStore(s => s.selectItem);
  const getReadinessScores = useInspectorReadinessStore(s => s.getReadinessScores);
  const getOverallScore = useInspectorReadinessStore(s => s.getOverallScore);
  const getGapItems = useInspectorReadinessStore(s => s.getGapItems);
  const getNotAssessedItems = useInspectorReadinessStore(s => s.getNotAssessedItems);
  
  useEffect(() => {
    if (Object.keys(checklistItems).length === 0) {
      initializeChecklist();
    }
  }, [checklistItems, initializeChecklist]);
  
  // v130: Loading effect
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 650);
    return () => clearTimeout(timer);
  }, []);
  
  const items = useMemo(() => Object.values(checklistItems), [checklistItems]);
  const scores = useMemo(() => getReadinessScores(), [getReadinessScores, checklistItems]);
  const overallScore = useMemo(() => getOverallScore(), [getOverallScore, checklistItems]);
  const gapItems = useMemo(() => getGapItems(), [getGapItems, checklistItems]);
  const notAssessedItems = useMemo(() => getNotAssessedItems(), [getNotAssessedItems, checklistItems]);
  
  // ==========================================================================
  // v0.27.82: Evidence Package Export
  // ==========================================================================
  
  const generateEvidencePackage = useCallback(async () => {
    setIsExporting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const compliantItems = items.filter(i => i.status === 'compliant');
      const partialItems = items.filter(i => i.status === 'partial');
      const gapItemsList = items.filter(i => i.status === 'gap');
      
      // Generate package metadata
      const packageData = {
        generatedAt: new Date().toISOString(),
        overallScore,
        summary: {
          total: items.length,
          compliant: compliantItems.length,
          partial: partialItems.length,
          gaps: gapItemsList.length,
          notAssessed: notAssessedItems.length
        },
        evidenceCollected: evidenceChecked.size,
        evidenceTotal: EVIDENCE_REQUEST_LIST.length,
        sections: Object.entries(scores).map(([domain, scoreObj]) => ({
          domain,
          score: scoreObj.score,
          status: scoreObj.score >= 80 ? 'ready' : scoreObj.score >= 60 ? 'needs-attention' : 'critical'
        }))
      };
      
      // Emit cross-module event
      emitEvent(
        'evidence-package-generated',
        'qms',
        {
          packageId: `EVD-${Date.now()}`,
          overallScore,
          gapCount: gapItemsList.length,
          evidenceCompletion: Math.round((evidenceChecked.size / EVIDENCE_REQUEST_LIST.length) * 100)
        },
        { priority: 'medium', automated: false, requiresReview: false }
      );
      
      toast.success(`Package includes ${compliantItems.length} compliant items and ${evidenceChecked.size}/${EVIDENCE_REQUEST_LIST.length} evidence documents.`);
      
      // In a real implementation, this would trigger a download
      /* Evidence package prepared */
      
    } catch (error) {
      toast.error('Unable to generate evidence package. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [items, overallScore, scores, evidenceChecked, notAssessedItems, emitEvent, toast]);
  
  // ==========================================================================
  // v0.27.82: Create CAPA from Gap
  // ==========================================================================
  
  const createCAPAFromGap = useCallback(async (gapItem: InspectorCheckItem) => {
    setIsCreatingCAPA(gapItem.id);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const categoryMeta = CATEGORY_META[gapItem.category];
      
      const capaData = {
        title: `Inspector Readiness Gap: ${gapItem.question.substring(0, 80)}${gapItem.question.length > 80 ? '...' : ''}`,
        description: `Gap identified during inspector readiness assessment.\n\nCheck ID: ${gapItem.id}\nCategory: ${categoryMeta?.label || gapItem.category}\nDomains: ${gapItem.domain.join(', ')}\n\nQuestion: ${gapItem.question}\n\nWhat to Look For:\n${gapItem.lookFor.map(lf => `• ${lf}`).join('\n')}\n\nRegulatory References: ${gapItem.regulatoryRefs.join(', ')}`,
        capaType: 'corrective' as const,
        source: 'regulatory-observation' as const,
        sourceRecordId: gapItem.id,
        sourceRecordNumber: gapItem.id,
        priority: 'high' as const,
        severity: 'major' as const,
        department: 'quality-assurance' as const,
        regulatoryImpact: true,
        targetCompletionDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      };
      
      const newCAPA = createCAPA(capaData);
      
      // Update the gap item with linked CAPA (would normally update the store)
      // For now, emit event and show toast
      
      emitEvent(
        'capa-created',
        'qms',
        {
          capaId: newCAPA.id,
          capaNumber: newCAPA.capaNumber,
          sourceGap: gapItem.id,
          category: gapItem.category,
          domains: gapItem.domain,
          correlationId: `gap-capa-${gapItem.id}`
        },
        {
          priority: 'high',
          automated: false,
          requiresReview: true
        }
      );
      
      toast.success(`${newCAPA.capaNumber} created from gap ${gapItem.id}. Assigned to Quality Assurance.`);
      
      return newCAPA;
      
    } catch (error) {
      toast.error('Unable to create CAPA. Please try again.');
      throw error;
    } finally {
      setIsCreatingCAPA(null);
    }
  }, [createCAPA, emitEvent, toast]);
  
  // Toggle evidence item
  const toggleEvidence = useCallback((index: number) => {
    setEvidenceChecked(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesDomain = selectedDomain === 'all' || item.domain.includes(selectedDomain) || item.domain.includes('GxP');
      const matchesSearch = !searchQuery || item.question.toLowerCase().includes(searchQuery.toLowerCase()) || item.id.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDomain && matchesSearch;
    });
  }, [items, selectedDomain, searchQuery]);
  
  const itemsBySection = useMemo(() => {
    const grouped: Record<string, InspectorCheckItem[]> = {};
    filteredItems.forEach(item => {
      const section = item.id.startsWith('J') ? 'J' : CATEGORY_META[item.category]?.section || 'Other';
      if (!grouped[section]) grouped[section] = [];
      grouped[section].push(item);
    });
    return grouped;
  }, [filteredItems]);
  
  const selectedItem = selectedItemId ? checklistItems[selectedItemId] : null;
  const toggleSection = (sectionId: string) => {
    const next = new Set(expandedSections);
    if (next.has(sectionId)) next.delete(sectionId);
    else next.add(sectionId);
    setExpandedSections(next);
  };

  // v130: Loading state render
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3"><Spinner size="lg" /><span className="text-sm text-text-muted">Loading inspector readiness...</span></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface">
      <ScreenHeader
        moduleId="inspector-readiness"
        title="Inspector Readiness"
        subtitle="GxP compliance assessment, audit preparation, and evidence request management"
        icon={<ClipboardCheck className="w-5 h-5" />}
        actions={<ScoreGauge score={overallScore} label="Overall" />}
      />
      <div className="bg-surface-elevated border-b border-border p-4 pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
          {scores.map(score => (
            <div key={score.domain} className="bg-surface-card rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-2">
                {getGxPDomainBadge(score.domain)}
                <span className="text-lg font-bold text-text-primary">{score.score}%</span>
              </div>
              <div className="flex gap-1 text-xs">
                <span className="text-emerald-400">{score.compliant} ✓</span>
                <span className="text-amber-400">{score.partial} ~</span>
                <span className="text-red-400">{score.gaps} ✗</span>
                <span className="text-text-muted">{score.notAssessed} ?</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="border-b border-border bg-surface-elevated">
        <div className="flex items-center gap-1 px-4">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Target },
            { id: 'checklist', label: 'Checklist', icon: ClipboardCheck },
            { id: 'gotchas', label: 'Common Findings', icon: AlertTriangle },
            { id: 'evidence', label: 'Evidence Request', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        {activeTab === 'dashboard' && (
          <div className="h-full overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <div className="col-span-1 md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <StatCard
                  value={items.filter(i => i.status === 'compliant').length}
                  label="Compliant"
                  color="text-emerald-400"
                />
                <StatCard
                  value={items.filter(i => i.status === 'partial').length}
                  label="Partial"
                  color="text-amber-400"
                />
                <StatCard
                  value={gapItems.length}
                  label="Gaps"
                  color="text-red-400"
                />
                <StatCard
                  value={notAssessedItems.length}
                  label="Not Assessed"
                  color="text-text-muted"
                />
              </div>
              <div className="bg-surface-card rounded-lg p-4 border border-border">
                <h3 className="font-medium text-text-primary mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button onClick={() => setActiveTab('checklist')} className="w-full flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20">
                    <ClipboardCheck className="w-4 h-4" />Start Assessment
                  </button>
                  <button 
                    onClick={generateEvidencePackage}
                    disabled={isExporting}
                    className="w-full flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 disabled:opacity-50"
                  >
                    <Package className="w-4 h-4" />
                    {isExporting ? 'Generating...' : 'Export Evidence Package'}
                  </button>
                  <button onClick={() => setActiveTab('evidence')} className="w-full flex items-center gap-2 px-3 py-2 bg-surface-elevated text-text-secondary rounded-lg hover:text-text-primary">
                    <FileText className="w-4 h-4" />
                    Evidence Checklist ({evidenceChecked.size}/{EVIDENCE_REQUEST_LIST.length})
                  </button>
                </div>
              </div>
              {gapItems.length > 0 && (
                <div className="col-span-3 bg-surface-card rounded-lg border border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <h3 className="font-medium text-text-primary">Priority Gaps ({gapItems.length})</h3>
                    </div>
                    <span className="text-xs text-text-muted">Click gap to view • Use ⚡ to create CAPA</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {gapItems.slice(0, 5).map(item => (
                      <div key={item.id} className="flex items-center gap-2 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                        <button 
                          onClick={() => { selectItem(item.id); setActiveTab('checklist'); }} 
                          className="flex-1 text-left hover:bg-red-500/10 rounded p-1 -m-1"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-text-muted">{item.id}</span>
                            {item.domain.map(d => getGxPDomainBadge(d, 'xs'))}
                          </div>
                          <p className="text-sm text-text-primary line-clamp-1">{item.question}</p>
                        </button>
                        <button
                          onClick={() => createCAPAFromGap(item)}
                          disabled={isCreatingCAPA === item.id}
                          className="p-2 bg-amber-500/10 text-amber-400 rounded-lg hover:bg-amber-500/20 disabled:opacity-50 flex-shrink-0"
                          title="Create CAPA from Gap"
                        >
                          {isCreatingCAPA === item.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Zap className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'checklist' && (
          <div className="h-full flex">
            <div className="hidden lg:flex w-[480px] border-r border-border flex flex-col">
              <div className="p-4 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input type="text" placeholder="Search checklist..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-surface-card border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue" />
                </div>
                <div className="flex gap-2">
                  {(['all', 'GxP', 'GMP', 'GLP', 'GCP', 'GVP'] as const).map(domain => (
                    <button key={domain} onClick={() => setSelectedDomain(domain)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedDomain === domain ? 'bg-accent-blue text-white' : 'bg-surface-card text-text-secondary hover:text-text-primary'}`}>
                      {domain === 'all' ? 'All' : domain}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-4">
                {SECTIONS.map(section => {
                  const sectionItems = itemsBySection[section.id] || [];
                  if (sectionItems.length === 0) return null;
                  const isExpanded = expandedSections.has(section.id);
                  return (
                    <div key={section.id}>
                      <button onClick={() => toggleSection(section.id)} className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-medium text-text-primary hover:bg-surface-card rounded">
                        <span>{section.id}. {section.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-text-muted">{sectionItems.length}</span>
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="mt-2 space-y-2">
                          {sectionItems.map(item => (
                            <ChecklistItemCard key={item.id} item={item} isSelected={selectedItemId === item.id} onSelect={() => selectItem(item.id)} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-1 bg-surface-card">
              {selectedItem ? (
                <ItemDetailPanel item={selectedItem} onUpdateStatus={(status) => updateItemStatus(selectedItem.id, status)} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted">
                  <div className="text-center">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Select an item to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'gotchas' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-text-primary mb-2">Common &quot;Gotcha&quot; Findings</h2>
                <p className="text-sm text-text-muted">These are the most common findings inspectors identify. Address these proactively.</p>
              </div>
              <div className="space-y-4">
                {COMMON_GOTCHA_FINDINGS.map(finding => (
                  <div key={finding.id} className="bg-surface-card border border-border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="font-medium text-text-primary">{finding.title}</h3>
                      {getSeverityBadge(finding.severity, 'xs')}
                    </div>
                    <p className="text-sm text-text-secondary mb-3">{finding.description}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>Related checks:</span>
                      {finding.relatedChecks.map(check => (
                        <button key={check} onClick={() => { selectItem(check); setActiveTab('checklist'); }} className="px-1.5 py-0.5 bg-surface-elevated rounded hover:text-accent-blue">{check}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'evidence' && (
          <div className="h-full overflow-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-semibold text-text-primary">Evidence Request List</h2>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-surface-elevated rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${(evidenceChecked.size / EVIDENCE_REQUEST_LIST.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-text-primary">
                        {evidenceChecked.size}/{EVIDENCE_REQUEST_LIST.length}
                      </span>
                    </div>
                    <button
                      onClick={generateEvidencePackage}
                      disabled={isExporting || evidenceChecked.size === 0}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 disabled:opacity-50 text-sm"
                    >
                      <Package className="w-4 h-4" />
                      {isExporting ? 'Exporting...' : 'Export Package'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-text-muted">Documents and evidence to have ready for inspector review (Hour 1 requests). Check off items as you prepare them.</p>
              </div>
              <div className="bg-surface-card border border-border rounded-lg">
                {EVIDENCE_REQUEST_LIST.map((item, i) => {
                  const isChecked = evidenceChecked.has(i);
                  return (
                    <div 
                      key={i} 
                      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                        i < EVIDENCE_REQUEST_LIST.length - 1 ? 'border-b border-border' : ''
                      } ${isChecked ? 'bg-emerald-500/5' : 'hover:bg-surface-elevated'}`}
                      onClick={() => toggleEvidence(i)}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                        isChecked 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-surface-elevated text-text-muted'
                      }`}>
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span className="text-xs font-medium">{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm transition-colors ${
                          isChecked ? 'text-text-muted line-through' : 'text-text-primary'
                        }`}>{item}</p>
                      </div>
                      <div className={`p-1.5 rounded transition-colors ${
                        isChecked 
                          ? 'text-emerald-400' 
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-elevated'
                      }`}>
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary Card */}
              <div className="mt-6 p-4 bg-surface-card border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary mb-1">Evidence Readiness Summary</h3>
                    <p className="text-sm text-text-muted">
                      {evidenceChecked.size === EVIDENCE_REQUEST_LIST.length 
                        ? '✅ All evidence items prepared - ready for inspection!'
                        : evidenceChecked.size === 0
                          ? 'Start checking off items as you gather evidence'
                          : `${EVIDENCE_REQUEST_LIST.length - evidenceChecked.size} items remaining to prepare`
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      evidenceChecked.size === EVIDENCE_REQUEST_LIST.length 
                        ? 'text-emerald-400'
                        : evidenceChecked.size >= EVIDENCE_REQUEST_LIST.length / 2
                          ? 'text-amber-400'
                          : 'text-text-muted'
                    }`}>
                      {Math.round((evidenceChecked.size / EVIDENCE_REQUEST_LIST.length) * 100)}%
                    </div>
                    <div className="text-xs text-text-muted">Complete</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
